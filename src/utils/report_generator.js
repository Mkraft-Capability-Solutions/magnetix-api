const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Report Generator Utility
 * Handles PDF, Excel, and CSV generation with MultipliersKraft branding
 */

// MultipliersKraft Brand Colors
const BRAND_COLORS = {
  primary: '#f97316',      // Orange
  secondary: '#1e293b',    // Dark slate
  accent: '#10b981',       // Green
  text: '#334155',         // Slate gray
  lightBg: '#f8fafc',      // Light background
  white: '#ffffff',
  headerBg: '#1e293b',     // Dark header
};

// Ensure reports directory exists
const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate a unique filename for the report
 */
const generateFileName = (reportType, format) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${reportType}_${timestamp}.${format}`;
};

/**
 * Convert hex color to RGB array for PDFKit
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

// Tone colors for KPI cards / accents.
const TONES = {
  blue: '#3b82f6', green: '#10b981', purple: '#a855f7',
  orange: '#f97316', teal: '#14b8a6', red: '#ef4444',
};

const numify = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const sumBy = (arr, k) => arr.reduce((a, r) => a + numify(r[k]), 0);
const avgBy = (arr, k) => (arr.length ? Math.round((sumBy(arr, k) / arr.length) * 10) / 10 : 0);

/**
 * Compute an executive summary (KPI cards + insights + a small bar chart +
 * table totals) for a report type. Returns null when there's nothing to
 * summarize (empty data or a generic/custom report).
 */
const computeReportSummary = (reportType, data, options = {}) => {
  // learning-engagement arrives as [{ metric, value }] — surface as KPI cards.
  if (reportType === 'learning-engagement' && Array.isArray(data) && data.length && data[0].metric !== undefined) {
    const tones = [TONES.blue, TONES.green, TONES.purple, TONES.orange, TONES.teal, TONES.red];
    // Shorter labels so they fit on one line inside a card.
    const SHORT = {
      'Total Active Users': 'Active Users',
      'Users with Enrollments': 'Users Enrolled',
      'Total Enrollments': 'Total Enrolments',
      'Total Time Spent (minutes)': 'Total Time (min)',
      'Average Time per User (minutes)': 'Avg Time / User (min)',
      'Active Last Week': 'Active Last Week',
    };
    const byMetric = {};
    data.forEach((d) => { byMetric[d.metric] = numify(d.value); });
    const activeUsers = byMetric['Total Active Users'] || 0;
    const usersEnrolled = byMetric['Users with Enrollments'] || 0;
    const avgTime = byMetric['Average Time per User (minutes)'] || 0;
    const activeLastWeek = byMetric['Active Last Week'] || 0;
    const insights = [
      activeUsers > 0 ? `${Math.round((usersEnrolled / activeUsers) * 100)}% of active users have at least one enrolment.` : null,
      `${activeLastWeek} user${activeLastWeek === 1 ? '' : 's'} were active in the last week.`,
      avgTime > 0 ? `Learners spend ${avgTime} minutes on average.` : 'No learning time has been recorded for this period yet.',
    ].filter(Boolean);
    return {
      kpis: data.slice(0, 6).map((d, i) => ({ label: SHORT[d.metric] || d.metric, value: d.value, toneHex: tones[i % tones.length] })),
      insights,
      chart: null,
      totals: null,
    };
  }

  if (!Array.isArray(data) || data.length === 0) return null;

  if (reportType === 'user') {
    const total = data.length;
    const withCert = data.filter((r) => numify(r.certificatesEarned) > 0).length;
    const active = data.filter((r) => String(r.status || '').toLowerCase() === 'active').length;
    // top department by headcount (ignoring unassigned/placeholder values)
    const validDept = (d) => d && !['n/a', 'unassigned', '-', ''].includes(String(d).trim().toLowerCase());
    const deptCounts = {};
    data.forEach((r) => { if (validDept(r.department)) deptCounts[r.department] = (deptCounts[r.department] || 0) + 1; });
    const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];
    const topLearners = [...data].sort((a, b) => numify(b.totalPoints) - numify(a.totalPoints)).slice(0, 8);
    return {
      kpis: [
        { label: 'Total Users', value: total, toneHex: TONES.blue },
        { label: 'Active Users', value: active, toneHex: TONES.green },
        { label: 'Certificates Earned', value: sumBy(data, 'certificatesEarned'), toneHex: TONES.orange },
        { label: 'Avg Courses Completed', value: avgBy(data, 'coursesCompleted'), toneHex: TONES.purple },
        { label: 'Avg Points', value: avgBy(data, 'totalPoints'), toneHex: TONES.teal },
      ],
      insights: [
        `${withCert} of ${total} user${total === 1 ? '' : 's'} have earned at least one certificate.`,
        topDept ? `Largest department: ${topDept[0]} (${topDept[1]} user${topDept[1] > 1 ? 's' : ''}).` : null,
        `${Math.round((active / total) * 100)}% of users are currently active.`,
      ].filter(Boolean),
      chart: { title: 'Top Performers by Points', unit: ' pts', bars: topLearners.map((r) => ({ label: r.fullName || r.name || '-', value: numify(r.totalPoints) })) },
      totals: { label: 'TOTAL', map: { coursesCompleted: sumBy(data, 'coursesCompleted'), totalPoints: sumBy(data, 'totalPoints'), certificatesEarned: sumBy(data, 'certificatesEarned') } },
    };
  }

  if (reportType === 'course-completion') {
    const best = [...data].sort((a, b) => numify(b.completionRate) - numify(a.completionRate))[0];
    const below40 = data.filter((r) => numify(r.completionRate) < 40).length;
    const top = [...data].sort((a, b) => numify(b.completionRate) - numify(a.completionRate)).slice(0, 8);
    const totalCompletions = sumBy(data, 'completedCount');
    const anyCompleted = totalCompletions > 0;
    return {
      kpis: [
        { label: 'Total Courses', value: data.length, toneHex: TONES.blue },
        { label: 'Total Enrollments', value: sumBy(data, 'totalEnrollments'), toneHex: TONES.green },
        { label: 'Avg Completion Rate', value: `${avgBy(data, 'completionRate')}%`, toneHex: TONES.orange },
        { label: 'Avg Time (min)', value: avgBy(data, 'avgTimeSpentMinutes'), toneHex: TONES.purple },
      ],
      insights: anyCompleted ? [
        best ? `Highest completion: ${best.courseTitle} (${best.completionRate}%).` : null,
        below40 > 0 ? `${below40} course${below40 > 1 ? 's' : ''} below 40% completion — may need attention.` : 'All courses are above 40% completion.',
        `Total of ${totalCompletions} course completion${totalCompletions === 1 ? '' : 's'} recorded.`,
      ].filter(Boolean) : [
        'No course completions recorded in this period yet.',
        `${sumBy(data, 'totalEnrollments')} enrolments across ${data.length} course${data.length === 1 ? '' : 's'}.`,
      ],
      chart: { title: 'Top Courses by Completion Rate', unit: '%', bars: top.map((r) => ({ label: r.courseTitle || '-', value: numify(r.completionRate) })) },
      totals: { label: 'TOTAL / AVG', map: { totalEnrollments: sumBy(data, 'totalEnrollments'), completedCount: sumBy(data, 'completedCount'), completionRate: `${avgBy(data, 'completionRate')}%`, avgTimeSpentMinutes: avgBy(data, 'avgTimeSpentMinutes') } },
    };
  }

  if (reportType === 'skills-assessment') {
    const sorted = [...data].sort((a, b) => numify(b.score) - numify(a.score));
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    return {
      kpis: [
        { label: 'Skills Assessed', value: data.length, toneHex: TONES.blue },
        { label: 'Avg Score', value: `${avgBy(data, 'score')}%`, toneHex: TONES.orange },
        { label: 'Users Assessed', value: sumBy(data, 'usersAssessed'), toneHex: TONES.green },
        strongest ? { label: 'Strongest Skill', value: strongest.skill, toneHex: TONES.purple } : null,
      ].filter(Boolean),
      insights: [
        strongest ? `Strongest area: ${strongest.skill} (${strongest.score}%).` : null,
        weakest ? `Needs development: ${weakest.skill} (${weakest.score}%).` : null,
      ].filter(Boolean),
      chart: { title: 'Skill Scores', unit: '%', bars: sorted.map((r) => ({ label: r.skill || '-', value: numify(r.score) })) },
      totals: { label: 'AVERAGE', map: { score: `${avgBy(data, 'score')}%`, usersAssessed: sumBy(data, 'usersAssessed') } },
    };
  }

  return null;
};

// ---- PDF drawing primitives for the executive summary ----------------------
const CONTENT_LEFT = 50;
const CONTENT_RIGHT = 545;

const pdfSectionTitle = (doc, text) => {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND_COLORS.secondary)
     .text(text, CONTENT_LEFT, doc.y);
  const ly = doc.y + 2;
  doc.strokeColor(BRAND_COLORS.primary).lineWidth(1).moveTo(CONTENT_LEFT, ly).lineTo(CONTENT_RIGHT, ly).stroke();
  doc.font('Helvetica');
  doc.y = ly + 8;
};

const pdfKpiCards = (doc, kpis) => {
  const cards = kpis.slice(0, 6);
  if (!cards.length) return;
  // Balance into rows of at most 3 so cards stay wide enough for their labels.
  const rowsCount = Math.ceil(cards.length / 3);
  const perRow = Math.ceil(cards.length / rowsCount);
  const gap = 12;
  const totalW = CONTENT_RIGHT - CONTENT_LEFT;
  const cardW = (totalW - gap * (perRow - 1)) / perRow;
  const cardH = 64;

  if (doc.y + rowsCount * (cardH + gap) > doc.page.height - 60) doc.addPage();
  let y = doc.y;
  for (let r = 0; r < rowsCount; r++) {
    const rowItems = cards.slice(r * perRow, r * perRow + perRow);
    rowItems.forEach((k, i) => {
      const x = CONTENT_LEFT + i * (cardW + gap);
      doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke(BRAND_COLORS.lightBg, '#e2e8f0');
      doc.rect(x, y, 4, cardH).fill(k.toneHex || BRAND_COLORS.primary);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(BRAND_COLORS.secondary)
         .text(String(k.value), x + 14, y + 13, { width: cardW - 22, height: 22, ellipsis: true, lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor('#64748b')
         .text(String(k.label), x + 14, y + 39, { width: cardW - 22, height: 18, ellipsis: true, lineBreak: false });
    });
    y += cardH + gap;
  }
  doc.font('Helvetica');
  doc.y = y + 2;
};

const pdfBarChart = (doc, chart) => {
  if (!chart || !chart.bars || !chart.bars.length) return;
  pdfSectionTitle(doc, chart.title);
  const bars = chart.bars.slice(0, 8);
  const maxVal = Math.max(...bars.map((b) => numify(b.value)), 1);
  const labelW = 150;
  const barMaxW = CONTENT_RIGHT - CONTENT_LEFT - labelW - 48;
  const rowH = 20;
  let y = doc.y;
  bars.forEach((b) => {
    if (y + rowH > doc.page.height - 60) { doc.addPage(); y = 50; }
    doc.font('Helvetica').fontSize(8).fillColor(BRAND_COLORS.text)
       .text(String(b.label).substring(0, 30), CONTENT_LEFT, y + 2, { width: labelW - 6, ellipsis: true });
    const w = Math.max(2, (numify(b.value) / maxVal) * barMaxW);
    doc.roundedRect(CONTENT_LEFT + labelW, y, w, 12, 2).fill(BRAND_COLORS.primary);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_COLORS.secondary)
       .text(`${b.value}${chart.unit || ''}`, CONTENT_LEFT + labelW + w + 5, y + 2, { width: 60 });
    y += rowH;
  });
  doc.font('Helvetica');
  doc.y = y + 6;
};

const pdfInsights = (doc, insights) => {
  if (!insights || !insights.length) return;
  pdfSectionTitle(doc, 'Key Insights');
  const pad = 10;
  const textW = CONTENT_RIGHT - CONTENT_LEFT - pad * 2;
  doc.font('Helvetica').fontSize(9);
  const heights = insights.map((t) => doc.heightOfString(`•  ${t}`, { width: textW }));
  const boxH = pad * 2 + heights.reduce((a, b) => a + b + 4, 0) - 4;
  if (doc.y + boxH > doc.page.height - 60) doc.addPage();
  const startY = doc.y;
  doc.roundedRect(CONTENT_LEFT, startY, CONTENT_RIGHT - CONTENT_LEFT, boxH, 6).fill('#FFF7ED');
  let yy = startY + pad;
  insights.forEach((t, i) => {
    doc.fillColor(BRAND_COLORS.text).fontSize(9).text(`•  ${t}`, CONTENT_LEFT + pad, yy, { width: textW });
    yy += heights[i] + 4;
  });
  doc.y = startY + boxH + 10;
};

/**
 * Generate PDF Report with MultipliersKraft branding
 */
const generatePDF = async (reportType, title, data, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = generateFileName(reportType, 'pdf');
      const filePath = path.join(REPORTS_DIR, fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header with branding
      addPDFHeader(doc, title, options);

      // Report metadata
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor(BRAND_COLORS.text);
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
      if (options.dateRange) {
        doc.text(`Date Range: ${options.dateRange.from} to ${options.dateRange.to}`, { align: 'right' });
      }
      if (options.department && options.department !== 'all') {
        doc.text(`Department: ${options.department}`, { align: 'right' });
      }
      doc.moveDown(1);

      // Executive summary (KPI cards + insights + a small bar chart).
      const summary = computeReportSummary(reportType, data, options);
      if (summary) {
        if (summary.kpis && summary.kpis.length) {
          pdfSectionTitle(doc, 'Executive Summary');
          pdfKpiCards(doc, summary.kpis);
        }
        if (summary.insights && summary.insights.length) pdfInsights(doc, summary.insights);
        if (summary.chart) pdfBarChart(doc, summary.chart);
      }

      // Detailed records table.
      const totals = summary && summary.totals ? summary.totals : null;
      if (reportType !== 'learning-engagement') pdfSectionTitle(doc, 'Detailed Records');
      switch (reportType) {
        case 'user':
          addUserReportContent(doc, data, totals);
          break;
        case 'course-completion':
          addCourseCompletionContent(doc, data, totals);
          break;
        case 'learning-engagement':
          // KPI cards + insights already cover engagement; only fall back to the
          // raw metric list when no summary was produced.
          if (!(summary && summary.kpis && summary.kpis.length)) addLearningEngagementContent(doc, data);
          break;
        case 'skills-assessment':
          addSkillsAssessmentContent(doc, data, totals);
          break;
        case 'custom-report':
          addCustomReportContent(doc, data, options.customFields);
          break;
        default:
          addGenericTableContent(doc, data);
      }

      // Footer on each page.
      // IMPORTANT: the footer is drawn inside the bottom margin. Writing text
      // below `page.height - margins.bottom` makes PDFKit think the page
      // overflowed and append a blank page — which previously inflated a
      // 17-page report to 51 pages and broke the "Page X of Y" totals. Zero the
      // bottom margin while drawing each footer to prevent that.
      const range = doc.bufferedPageRange(); // { start, count }
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const savedBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        addPDFFooter(doc, i + 1, range.count);
        doc.page.margins.bottom = savedBottom;
      }

      doc.end();

      stream.on('finish', () => {
        resolve({
          fileName,
          filePath,
          format: 'pdf',
          size: fs.statSync(filePath).size
        });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Add PDF Header with MultipliersKraft branding
 */
const addPDFHeader = (doc, title, options = {}) => {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header background
  doc.rect(0, 0, doc.page.width, 80)
     .fill(BRAND_COLORS.headerBg);

  // Brand name
  doc.fontSize(24)
     .fillColor(BRAND_COLORS.primary)
     .text('MultipliersKraft', 50, 25, { continued: false });

  // Tagline
  doc.fontSize(10)
     .fillColor(BRAND_COLORS.white)
     .text('Learning Management System', 50, 52);

  // Report title
  doc.moveDown(2);
  doc.fontSize(20)
     .fillColor(BRAND_COLORS.secondary)
     .text(title, 50, 100, { align: 'center' });

  // Divider line
  doc.moveDown(0.5);
  doc.strokeColor(BRAND_COLORS.primary)
     .lineWidth(2)
     .moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke();

  doc.moveDown(1);
};

/**
 * Add PDF Footer
 */
const addPDFFooter = (doc, currentPage, totalPages) => {
  const bottom = doc.page.height - 30;

  // Footer line
  doc.strokeColor(BRAND_COLORS.primary)
     .lineWidth(1)
     .moveTo(50, bottom - 15)
     .lineTo(doc.page.width - 50, bottom - 15)
     .stroke();

  // Footer text
  doc.fontSize(8)
     .fillColor(BRAND_COLORS.text)
     .text(
       'Generated by MultipliersKraft LMS | Confidential',
       50,
       bottom - 10,
       { align: 'left', width: doc.page.width - 200 }
     );

  doc.text(
    `Page ${currentPage} of ${totalPages}`,
    doc.page.width - 100,
    bottom - 10,
    { align: 'right', width: 50 }
  );
};

/**
 * Add User Report Content
 */
const addUserReportContent = (doc, data, totals = null) => {
  if (!data || !data.length) {
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text('No data available');
    return;
  }

  const headers = ['Name', 'Email', 'Department', 'Job Title', 'Status', 'Courses', 'Points'];
  const colWidths = [100, 120, 80, 80, 50, 50, 50];

  const footer = totals ? ['TOTAL', '', '', '', '', String(totals.map.coursesCompleted ?? ''), String(totals.map.totalPoints ?? '')] : null;
  addPDFTable(doc, headers, data.map(row => [
    row.fullName || row.name || '-',
    row.email || '-',
    row.department || '-',
    row.jobTitle || '-',
    row.status || '-',
    String(row.coursesCompleted || 0),
    String(row.totalPoints || 0)
  ]), colWidths, footer);
};

/**
 * Add Course Completion Content
 */
const addCourseCompletionContent = (doc, data, totals = null) => {
  if (!data || !data.length) {
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text('No data available');
    return;
  }

  const headers = ['Course', 'Category', 'Enrollments', 'Completed', 'Rate %', 'Avg Time'];
  const colWidths = [140, 80, 70, 70, 50, 70];

  const footer = totals ? ['TOTAL / AVG', '', String(totals.map.totalEnrollments ?? ''), String(totals.map.completedCount ?? ''), String(totals.map.completionRate ?? ''), `${totals.map.avgTimeSpentMinutes ?? 0} min`] : null;
  addPDFTable(doc, headers, data.map(row => [
    row.courseTitle || '-',
    row.category || '-',
    String(row.totalEnrollments || 0),
    String(row.completedCount || 0),
    `${row.completionRate || 0}%`,
    `${row.avgTimeSpentMinutes || 0} min`
  ]), colWidths, footer);
};

/**
 * Add Learning Engagement Content
 */
const addLearningEngagementContent = (doc, data) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text('No data available');
    return;
  }

  // Summary section
  doc.fontSize(14).fillColor(BRAND_COLORS.secondary).text('Summary Statistics');
  doc.moveDown(0.5);

  // Handle array format (converted data from service)
  if (Array.isArray(data)) {
    data.forEach(item => {
      doc.fontSize(11)
         .fillColor(BRAND_COLORS.text)
         .text(`${item.metric}: `, { continued: true })
         .fillColor(BRAND_COLORS.primary)
         .text(String(item.value || 0));
    });
  } else {
    // Handle object format (raw data)
    const stats = [
      ['Total Active Users', data.totalActiveUsers || 0],
      ['Users with Enrollments', data.usersWithEnrollments || 0],
      ['Total Enrollments', data.totalEnrollments || 0],
      ['Total Time Spent', `${data.totalTimeSpentMinutes || 0} minutes`],
      ['Average Time per User', `${data.avgTimePerUser || 0} minutes`],
      ['Active Last Week', data.activeLastWeek || 0]
    ];

    stats.forEach(([label, value]) => {
      doc.fontSize(11)
         .fillColor(BRAND_COLORS.text)
         .text(`${label}: `, { continued: true })
         .fillColor(BRAND_COLORS.primary)
         .text(String(value));
    });
  }
};

/**
 * Add Skills Assessment Content
 */
const addSkillsAssessmentContent = (doc, data, totals = null) => {
  if (!data || !data.length) {
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text('No data available');
    return;
  }

  const headers = ['Skill', 'Average Score', 'Users Assessed'];
  const colWidths = [200, 150, 150];

  const footer = totals ? ['AVERAGE', String(totals.map.score ?? ''), String(totals.map.usersAssessed ?? '')] : null;
  addPDFTable(doc, headers, data.map(row => [
    row.skill || '-',
    `${row.score || 0}%`,
    String(row.usersAssessed || 0)
  ]), colWidths, footer);
};

/**
 * Add Custom Report Content (dynamic fields)
 */
const addCustomReportContent = (doc, data, customFields) => {
  if (!data || !data.length) {
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text('No data available');
    return;
  }

  if (customFields && customFields.length > 0) {
    const headers = customFields.map(f => f.label);
    const maxColWidth = Math.floor(500 / Math.min(headers.length, 7));
    const colWidths = headers.map(() => Math.max(maxColWidth, 60));

    addPDFTable(doc, headers, data.map(row =>
      customFields.map(f => {
        const val = row[f.key];
        return val !== null && val !== undefined ? String(val).substring(0, 40) : '-';
      })
    ), colWidths);
  } else {
    addGenericTableContent(doc, data);
  }
};

/**
 * Add generic table content
 */
const addGenericTableContent = (doc, data) => {
  if (!data || !data.length) {
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text('No data available');
    return;
  }

  const headers = Object.keys(data[0]);
  const colWidth = Math.floor(500 / headers.length);
  const colWidths = headers.map(() => colWidth);

  addPDFTable(doc, headers, data.map(row =>
    headers.map(h => String(row[h] || '-'))
  ), colWidths);
};

/**
 * Add table to PDF. Optional `footer` renders a bold totals row.
 */
const addPDFTable = (doc, headers, rows, colWidths, footer = null) => {
  const startX = 50;
  let startY = doc.y;
  const rowHeight = 25;
  const pageHeight = doc.page.height - 60;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  // numeric columns get right-aligned cells for readability
  const numericCol = headers.map((_, i) => rows.some((r) => /^[₹$]?[\d,]+(\.\d+)?%?( min| pts)?$/.test(String(r[i]).trim())));

  // Draw header
  doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
     .fill(BRAND_COLORS.primary);

  let x = startX;
  headers.forEach((header, i) => {
    doc.fontSize(9)
       .fillColor(BRAND_COLORS.white)
       .text(header, x + 5, startY + 8, { width: colWidths[i] - 10, align: 'left' });
    x += colWidths[i];
  });

  startY += rowHeight;

  // Draw rows
  rows.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (startY + rowHeight > pageHeight) {
      doc.addPage();
      startY = 50;

      // Redraw header on new page
      doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
         .fill(BRAND_COLORS.primary);

      x = startX;
      headers.forEach((header, i) => {
        doc.fontSize(9)
           .fillColor(BRAND_COLORS.white)
           .text(header, x + 5, startY + 8, { width: colWidths[i] - 10, align: 'left' });
        x += colWidths[i];
      });
      startY += rowHeight;
    }

    // Alternating row colors
    const bgColor = rowIndex % 2 === 0 ? BRAND_COLORS.lightBg : BRAND_COLORS.white;
    doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
       .fill(bgColor);

    x = startX;
    row.forEach((cell, i) => {
      doc.fontSize(8)
         .fillColor(BRAND_COLORS.text)
         .text(String(cell).substring(0, 28), x + 5, startY + 8, {
           width: colWidths[i] - 10,
           align: numericCol[i] ? 'right' : 'left'
         });
      x += colWidths[i];
    });

    startY += rowHeight;
  });

  // Totals / footer row
  if (footer && footer.length) {
    if (startY + rowHeight > pageHeight) { doc.addPage(); startY = 50; }
    doc.rect(startX, startY, tableWidth, rowHeight).fill(BRAND_COLORS.secondary);
    x = startX;
    footer.forEach((cell, i) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_COLORS.white)
         .text(String(cell).substring(0, 28), x + 5, startY + 8, {
           width: colWidths[i] - 10,
           align: numericCol[i] ? 'right' : 'left'
         });
      x += colWidths[i];
    });
    doc.font('Helvetica');
    startY += rowHeight;
  }
  doc.y = startY + 4;
};

/**
 * Generate Excel Report with MultipliersKraft branding
 */
const generateExcel = async (reportType, title, data, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MultipliersKraft LMS';
  workbook.created = new Date();

  const summary = computeReportSummary(reportType, data, options);

  // -------- Summary sheet (first) --------
  const isEngagement = reportType === 'learning-engagement';
  if (summary && !isEngagement) {
    buildExcelSummarySheet(workbook, title, options, summary);
  }

  // -------- Data sheet --------
  const sheetName = (isEngagement ? 'Summary' : 'Detailed Data');
  const worksheet = workbook.addWorksheet(sheetName, {
    headerFooter: { firstFooter: '&CGenerated by MultipliersKraft LMS | &D' },
    views: [{ showGridLines: false }],
  });

  // Branded title block
  worksheet.mergeCells('A1:H1');
  const brandCell = worksheet.getCell('A1');
  brandCell.value = 'MultipliersKraft LMS';
  brandCell.font = { size: 20, bold: true, color: { argb: 'FFF97316' } };
  brandCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:H2');
  const reportTitleCell = worksheet.getCell('A2');
  reportTitleCell.value = title;
  reportTitleCell.font = { size: 16, bold: true, color: { argb: 'FF1E293B' } };
  reportTitleCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A3:H3');
  const metaCell = worksheet.getCell('A3');
  let metaText = `Generated: ${new Date().toLocaleString()}`;
  if (options.dateRange) metaText += ` | Date Range: ${options.dateRange.from} to ${options.dateRange.to}`;
  if (options.department && options.department !== 'all') metaText += ` | Department: ${options.department}`;
  metaCell.value = metaText;
  metaCell.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
  metaCell.alignment = { horizontal: 'center' };

  worksheet.addRow([]);

  if (data && data.length > 0) {
    const headers = options.customFields
      ? options.customFields.map((f) => ({ key: f.key, label: f.label, width: 20, type: 'text' }))
      : getHeadersForReportType(reportType, data);

    const headerRowIdx = worksheet.rowCount + 1;
    const headerRow = worksheet.addRow(headers.map((h) => h.label));
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    headers.forEach((h, i) => { worksheet.getColumn(i + 1).width = h.width || 16; });

    const firstDataRow = headerRowIdx + 1;
    data.forEach((row, rowIndex) => {
      const values = headers.map((h) => {
        const raw = row[h.key];
        if (h.type === 'number' || h.type === 'percent') return raw == null ? 0 : numify(raw);
        return raw == null || raw === '' ? '-' : raw;
      });
      const dataRow = worksheet.addRow(values);
      dataRow.eachCell((cell, col) => {
        const h = headers[col - 1];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (h && h.type === 'percent') { cell.numFmt = '0"%"'; cell.alignment = { horizontal: 'right' }; }
        else if (h && h.type === 'number') { cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
      });
    });
    const lastDataRow = worksheet.rowCount;

    // Totals row
    if (data.length > 0 && headers.some((h) => h.total)) {
      const totalsValues = headers.map((h, i) => {
        if (i === 0) return 'TOTAL / AVG';
        if (h.total === 'sum') return sumBy(data, h.key);
        if (h.total === 'avg') return avgBy(data, h.key);
        return '';
      });
      const totalsRow = worksheet.addRow(totalsValues);
      totalsRow.eachCell((cell, col) => {
        const h = headers[col - 1];
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        if (h && h.type === 'percent') { cell.numFmt = '0"%"'; cell.alignment = { horizontal: 'right' }; }
        else if (h && h.type === 'number') { cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
      });
    }

    // Freeze header + auto filter
    worksheet.views = [{ state: 'frozen', ySplit: headerRowIdx, showGridLines: false }];
    worksheet.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: headers.length } };

    // Conditional formatting (data bars / color scales) on flagged columns
    try {
      headers.forEach((h, i) => {
        if (!h.cf || lastDataRow < firstDataRow) return;
        const colLetter = worksheet.getColumn(i + 1).letter;
        const ref = `${colLetter}${firstDataRow}:${colLetter}${lastDataRow}`;
        if (h.cf === 'dataBar') {
          worksheet.addConditionalFormatting({ ref, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FFF97316' } }] });
        } else if (h.cf === 'colorScale') {
          worksheet.addConditionalFormatting({ ref, rules: [{ type: 'colorScale', cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }], color: [{ argb: 'FFF87171' }, { argb: 'FFFBBF24' }, { argb: 'FF34D399' }] }] });
        }
      });
    } catch (cfErr) {
      console.warn('Excel conditional formatting skipped:', cfErr.message);
    }
  }

  // Save file
  const fileName = generateFileName(reportType, 'xlsx');
  const filePath = path.join(REPORTS_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);

  return { fileName, filePath, format: 'xlsx', size: fs.statSync(filePath).size };
};

/**
 * Build the "Summary" worksheet: KPI cards, insights, and a data-bar
 * mini-chart of the top highlights.
 */
const buildExcelSummarySheet = (workbook, title, options, summary) => {
  const ws = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  ws.getColumn(1).width = 4;
  [2, 3, 4].forEach((c) => (ws.getColumn(c).width = 20));
  ws.getColumn(5).width = 4;

  ws.mergeCells('B2:E2');
  ws.getCell('B2').value = 'MultipliersKraft LMS';
  ws.getCell('B2').font = { size: 20, bold: true, color: { argb: 'FFF97316' } };

  ws.mergeCells('B3:E3');
  ws.getCell('B3').value = `${title} — Executive Summary`;
  ws.getCell('B3').font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };

  ws.mergeCells('B4:E4');
  let metaText = `Generated: ${new Date().toLocaleString()}`;
  if (options.dateRange) metaText += ` | ${options.dateRange.from} → ${options.dateRange.to}`;
  ws.getCell('B4').value = metaText;
  ws.getCell('B4').font = { size: 9, italic: true, color: { argb: 'FF64748B' } };

  let r = 6;
  // KPI cards (value big on top, label below) laid 3 per row
  const cardTones = { toneArgb: (hex) => 'FF' + hex.replace('#', '').toUpperCase() };
  ws.getCell(`B${r}`).value = 'KEY METRICS';
  ws.getCell(`B${r}`).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
  r += 1;
  summary.kpis.forEach((k, i) => {
    const col = 2 + (i % 3);
    const rowValue = r + Math.floor(i / 3) * 3;
    const valCell = ws.getCell(rowValue, col);
    valCell.value = k.value;
    valCell.font = { size: 16, bold: true, color: { argb: cardTones.toneArgb(k.toneHex || '#f97316') } };
    valCell.alignment = { horizontal: 'left' };
    const labCell = ws.getCell(rowValue + 1, col);
    labCell.value = k.label;
    labCell.font = { size: 9, color: { argb: 'FF64748B' } };
    labCell.alignment = { horizontal: 'left' };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    labCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  r += Math.ceil(summary.kpis.length / 3) * 3 + 1;

  // Insights
  if (summary.insights && summary.insights.length) {
    ws.getCell(`B${r}`).value = 'KEY INSIGHTS';
    ws.getCell(`B${r}`).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
    r += 1;
    summary.insights.forEach((t) => {
      ws.mergeCells(`B${r}:E${r}`);
      const c = ws.getCell(`B${r}`);
      c.value = `•  ${t}`;
      c.font = { size: 10, color: { argb: 'FF334155' } };
      c.alignment = { wrapText: true };
      r += 1;
    });
    r += 1;
  }

  // Top highlights mini-chart (data bars)
  if (summary.chart && summary.chart.bars && summary.chart.bars.length) {
    ws.getCell(`B${r}`).value = summary.chart.title.toUpperCase();
    ws.getCell(`B${r}`).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
    r += 1;
    const firstBarRow = r;
    summary.chart.bars.slice(0, 10).forEach((b) => {
      ws.mergeCells(`B${r}:C${r}`);
      ws.getCell(`B${r}`).value = String(b.label);
      ws.getCell(`B${r}`).font = { size: 10, color: { argb: 'FF334155' } };
      const vc = ws.getCell(`D${r}`);
      vc.value = numify(b.value);
      vc.numFmt = summary.chart.unit === '%' ? '0"%"' : '#,##0';
      vc.alignment = { horizontal: 'right' };
      r += 1;
    });
    try {
      ws.addConditionalFormatting({
        ref: `D${firstBarRow}:D${r - 1}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FFF97316' } }],
      });
    } catch (e) { /* non-fatal */ }
  }
};

/**
 * Get headers configuration based on report type
 */
const getHeadersForReportType = (reportType, data) => {
  switch (reportType) {
    case 'user':
      return [
        { key: 'fullName', label: 'Full Name', width: 25, type: 'text' },
        { key: 'email', label: 'Email', width: 30, type: 'text' },
        { key: 'department', label: 'Department', width: 16, type: 'text' },
        { key: 'jobTitle', label: 'Job Title', width: 20, type: 'text' },
        { key: 'status', label: 'Status', width: 12, type: 'text' },
        { key: 'joinDate', label: 'Join Date', width: 15, type: 'text' },
        { key: 'coursesCompleted', label: 'Courses Completed', width: 18, type: 'number', total: 'sum', cf: 'dataBar' },
        { key: 'certificatesEarned', label: 'Certificates', width: 14, type: 'number', total: 'sum' },
        { key: 'totalPoints', label: 'Total Points', width: 15, type: 'number', total: 'sum', cf: 'dataBar' }
      ];
    case 'course-completion':
      return [
        { key: 'courseTitle', label: 'Course Title', width: 35, type: 'text' },
        { key: 'category', label: 'Category', width: 20, type: 'text' },
        { key: 'totalEnrollments', label: 'Total Enrollments', width: 18, type: 'number', total: 'sum', cf: 'dataBar' },
        { key: 'completedCount', label: 'Completed', width: 15, type: 'number', total: 'sum' },
        { key: 'completionRate', label: 'Completion Rate', width: 18, type: 'percent', total: 'avg', cf: 'colorScale' },
        { key: 'avgTimeSpentMinutes', label: 'Avg Time (min)', width: 15, type: 'number', total: 'avg' }
      ];
    case 'learning-engagement':
      return [
        { key: 'metric', label: 'Metric', width: 34, type: 'text' },
        { key: 'value', label: 'Value', width: 22, type: 'text' }
      ];
    case 'skills-assessment':
      return [
        { key: 'skill', label: 'Skill', width: 30, type: 'text' },
        { key: 'score', label: 'Average Score', width: 18, type: 'percent', total: 'avg', cf: 'colorScale' },
        { key: 'usersAssessed', label: 'Users Assessed', width: 16, type: 'number', total: 'sum', cf: 'dataBar' }
      ];
    default:
      // Auto-generate headers from data keys
      if (data && data.length > 0) {
        return Object.keys(data[0]).map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          width: 16,
          type: typeof data[0][key] === 'number' ? 'number' : 'text'
        }));
      }
      return [];
  }
};

/**
 * Generate CSV Report
 */
const generateCSV = async (reportType, title, data, options = {}) => {
  if (!data || !data.length) {
    throw new Error('No data provided for CSV generation');
  }

  const headers = Object.keys(data[0]);

  // Build CSV content
  let csvContent = '';

  // Add metadata as comments
  csvContent += `# MultipliersKraft LMS - ${title}\n`;
  csvContent += `# Generated: ${new Date().toISOString()}\n`;
  if (options.dateRange) {
    csvContent += `# Date Range: ${options.dateRange.from} to ${options.dateRange.to}\n`;
  }
  if (options.department && options.department !== 'all') {
    csvContent += `# Department: ${options.department}\n`;
  }

  // Executive summary block (KPIs + insights) as comment lines.
  const summary = computeReportSummary(reportType, data, options);
  if (summary) {
    csvContent += '#\n# ===== EXECUTIVE SUMMARY =====\n';
    (summary.kpis || []).forEach((k) => { csvContent += `# ${k.label}: ${k.value}\n`; });
    if (summary.insights && summary.insights.length) {
      csvContent += '# --- Key Insights ---\n';
      summary.insights.forEach((t) => { csvContent += `# - ${t}\n`; });
    }
  }
  csvContent += '#\n';

  // Add header row
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

  // Add data rows
  data.forEach(row => {
    csvContent += headers.map(h => {
      const value = row[h];
      if (value === null || value === undefined) return '""';
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',') + '\n';
  });

  // Save file
  const fileName = generateFileName(reportType, 'csv');
  const filePath = path.join(REPORTS_DIR, fileName);
  fs.writeFileSync(filePath, csvContent, 'utf8');

  return {
    fileName,
    filePath,
    format: 'csv',
    size: fs.statSync(filePath).size
  };
};

/**
 * Main function to generate report in specified format
 */
const generateReport = async (reportType, format, title, data, options = {}) => {
  switch (format.toLowerCase()) {
    case 'pdf':
      return generatePDF(reportType, title, data, options);
    case 'excel':
    case 'xlsx':
      return generateExcel(reportType, title, data, options);
    case 'csv':
      return generateCSV(reportType, title, data, options);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

/**
 * Delete old report files (cleanup)
 */
const cleanupOldReports = async (maxAgeHours = 24) => {
  const files = fs.readdirSync(REPORTS_DIR);
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(REPORTS_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
    }
  });
};

module.exports = {
  generateReport,
  generatePDF,
  generateExcel,
  generateCSV,
  cleanupOldReports,
  REPORTS_DIR
};
