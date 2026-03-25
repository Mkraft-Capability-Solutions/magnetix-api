/**
 * Analytics PDF Generator (Server-side)
 *
 * This is a direct port of the frontend analyticsPdfExport.ts
 * to produce the exact same PDF on the backend for scheduled email reports.
 *
 * DO NOT modify the frontend export — this file mirrors it independently.
 */

const { jsPDF } = require('jspdf');

// Brand colors — same as frontend
const COLORS = {
  primary: [44, 62, 80],
  accent: [255, 140, 66],
  success: [22, 163, 74],
  danger: [220, 38, 38],
  warning: [245, 158, 11],
  text: [31, 41, 55],
  textLight: [107, 114, 128],
  border: [229, 231, 235],
  bgLight: [249, 250, 251],
  white: [255, 255, 255],
  blue: [59, 130, 246],
  purple: [139, 92, 246],
  emerald: [16, 185, 129],
  indigo: [99, 102, 241],
};

const s = (val, fallback = '—') => {
  if (val == null || val === '') return fallback;
  return String(val);
};

const n = (val) => {
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

const trunc = (val, max) => {
  const str = s(val, '');
  return str.length > max ? str.substring(0, max) + '...' : str;
};

const hexToRgb = (hex) => {
  const clean = s(hex, '#2c3e50');
  const r = parseInt(clean.slice(1, 3), 16) || 44;
  const g = parseInt(clean.slice(3, 5), 16) || 62;
  const b = parseInt(clean.slice(5, 7), 16) || 80;
  return [r, g, b];
};

/**
 * Generate analytics PDF and return as Buffer.
 * @param {Object} data — same shape as AnalyticsData on the frontend
 * @returns {Buffer} PDF buffer
 */
const generateAnalyticsPDFBuffer = (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ===== HELPERS =====
  const checkPageBreak = (needed) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const drawRoundedRect = (x, yPos, w, h, r, fillColor, strokeColor) => {
    if (fillColor) doc.setFillColor(...fillColor);
    if (strokeColor) {
      doc.setDrawColor(...strokeColor);
      doc.setLineWidth(0.3);
    }
    doc.roundedRect(x, yPos, w, h, r, r, fillColor && strokeColor ? 'FD' : fillColor ? 'F' : 'S');
  };

  const drawProgressBar = (x, yPos, w, h, percentage, fillColor) => {
    drawRoundedRect(x, yPos, w, h, h / 2, [234, 237, 241]);
    const fillWidth = Math.max(h, (percentage / 100) * w);
    if (percentage > 0) drawRoundedRect(x, yPos, fillWidth, h, h / 2, fillColor);
  };

  const sectionTitle = (title, subtitle) => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text(title, margin, y);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.text(subtitle, margin, y + 6);
      y += 12;
    } else {
      y += 8;
    }
  };

  // ===== HEADER =====
  drawRoundedRect(margin, y, contentWidth, 28, 4, COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text('Analytics Report', margin + 10, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 210, 220);
  doc.text('Magnetix Learning Platform', margin + 10, y + 19);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text(dateStr, pageWidth - margin - 10, y + 12, { align: 'right' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated at ${timeStr}`, pageWidth - margin - 10, y + 19, { align: 'right' });
  y += 35;

  // ===== KPI STATS =====
  if (data.dashboardStats && data.dashboardStats.length > 0) {
    sectionTitle('Overview Statistics');
    const cardWidth = (contentWidth - 9) / 4;
    const cardHeight = 30;

    data.dashboardStats.forEach((stat, i) => {
      const cardX = margin + i * (cardWidth + 3);
      drawRoundedRect(cardX, y, cardWidth, cardHeight, 3, COLORS.white, COLORS.border);
      doc.setFillColor(...COLORS.accent);
      doc.rect(cardX + 3, y, cardWidth - 6, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.text(s(stat.title), cardX + 5, y + 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.text);
      doc.text(n(stat.value).toLocaleString(), cardX + 5, y + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.success);
      doc.text(`+${s(stat.increase, '0')} from last week`, cardX + 5, y + 26);
    });
    y += cardHeight + 10;
  }

  // ===== QUICK INSIGHTS =====
  {
    const courseCompletion = data.courseCompletionData || [];
    const deptPerformance = data.combinedAnalytics?.departmentPerformance || [];
    const userReport = data.userReportData || [];
    const engagement = data.learningEngagement;

    const avgCompletionRate = courseCompletion.length > 0
      ? Math.round(courseCompletion.reduce((sum, c) => sum + n(c.completionRate), 0) / courseCompletion.length)
      : 0;
    const topDept = deptPerformance.length > 0
      ? [...deptPerformance].sort((a, b) => n(b.completionPercentage) - n(a.completionPercentage))[0]
      : null;
    const totalCerts = userReport.reduce((sum, u) => sum + n(u.certificatesEarned), 0);
    const enrollmentRate = engagement
      ? Math.round((n(engagement.usersWithEnrollments) / Math.max(n(engagement.totalActiveUsers), 1)) * 100)
      : 0;

    if (avgCompletionRate > 0 || topDept || totalCerts > 0 || enrollmentRate > 0) {
      checkPageBreak(25);
      sectionTitle('Quick Insights');

      const insightItems = [
        { label: 'Avg Completion Rate', value: `${avgCompletionRate}%` },
        { label: 'Top Department', value: topDept ? s(topDept.department) : '—' },
        { label: 'Total Certifications', value: String(totalCerts) },
        { label: 'Enrollment Rate', value: `${enrollmentRate}%` },
      ];

      const chipW = (contentWidth - 9) / 4;
      drawRoundedRect(margin, y, contentWidth, 20, 3, COLORS.white, COLORS.border);

      insightItems.forEach((item, i) => {
        const ix = margin + 4 + i * (chipW + 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.text(item.value, ix + chipW / 2, y + 8, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.textLight);
        doc.text(item.label, ix + chipW / 2, y + 14, { align: 'center' });
      });
      y += 28;
    }
  }

  // ===== PLATFORM HEALTH SCORE =====
  {
    const courseCompletion = data.courseCompletionData || [];
    const deptPerformance = data.combinedAnalytics?.departmentPerformance || [];
    const engagement = data.learningEngagement;

    const avgCompletionRate = courseCompletion.length > 0
      ? Math.round(courseCompletion.reduce((sum, c) => sum + n(c.completionRate), 0) / courseCompletion.length)
      : 0;
    const enrollmentRate = engagement
      ? Math.round((n(engagement.usersWithEnrollments) / Math.max(n(engagement.totalActiveUsers), 1)) * 100)
      : 0;

    let score = 0;
    let factors = 0;
    if (avgCompletionRate > 0) { score += Math.min(avgCompletionRate, 100); factors++; }
    if (enrollmentRate > 0) { score += Math.min(enrollmentRate, 100); factors++; }
    if (engagement && n(engagement.totalActiveUsers) > 0) {
      const activeRatio = Math.min((n(engagement.activeUsersLast7Days) / n(engagement.totalActiveUsers)) * 100, 100);
      score += activeRatio; factors++;
    }
    if (deptPerformance.length > 0) {
      const avgDeptCompletion = deptPerformance.reduce((s, d) => s + n(d.completionPercentage), 0) / deptPerformance.length;
      score += Math.min(avgDeptCompletion, 100); factors++;
    }
    const healthScore = factors > 0 ? Math.round(score / factors) : 0;

    if (healthScore > 0) {
      checkPageBreak(45);
      sectionTitle('Platform Health Score', 'Composite score based on key performance metrics');

      drawRoundedRect(margin, y, contentWidth, 35, 3, COLORS.white, COLORS.border);

      const gaugeX = margin + 35;
      const gaugeY = y + 25;
      const gaugeR = 18;

      doc.setDrawColor(234, 237, 241);
      doc.setLineWidth(3);
      for (let angle = 180; angle <= 360; angle += 2) {
        const rad = (angle * Math.PI) / 180;
        const x1 = gaugeX + gaugeR * Math.cos(rad);
        const y1 = gaugeY + gaugeR * Math.sin(rad);
        const rad2 = ((angle + 2) * Math.PI) / 180;
        const x2 = gaugeX + gaugeR * Math.cos(rad2);
        const y2 = gaugeY + gaugeR * Math.sin(rad2);
        doc.line(x1, y1, x2, y2);
      }

      const scoreAngle = 180 + (healthScore / 100) * 180;
      const scoreColor = healthScore >= 80 ? COLORS.success : healthScore >= 60 ? COLORS.blue : healthScore >= 40 ? COLORS.warning : COLORS.danger;
      doc.setDrawColor(...scoreColor);
      doc.setLineWidth(3);
      for (let angle = 180; angle < scoreAngle; angle += 2) {
        const rad = (angle * Math.PI) / 180;
        const x1 = gaugeX + gaugeR * Math.cos(rad);
        const y1 = gaugeY + gaugeR * Math.sin(rad);
        const rad2 = ((angle + 2) * Math.PI) / 180;
        const x2 = gaugeX + gaugeR * Math.cos(rad2);
        const y2 = gaugeY + gaugeR * Math.sin(rad2);
        doc.line(x1, y1, x2, y2);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...scoreColor);
      doc.text(`${healthScore}`, gaugeX, gaugeY - 2, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textLight);
      doc.text('/100', gaugeX + 10, gaugeY - 2);

      const statusLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...scoreColor);
      doc.text(statusLabel, margin + 80, y + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textLight);
      const breakdownItems = [
        `Completion Rate: ${avgCompletionRate}%`,
        `Enrollment Rate: ${enrollmentRate}%`,
        engagement ? `7-Day Active: ${Math.round((n(engagement.activeUsersLast7Days) / Math.max(n(engagement.totalActiveUsers), 1)) * 100)}%` : '',
        deptPerformance.length > 0 ? `Avg Dept Performance: ${Math.round(deptPerformance.reduce((s, d) => s + n(d.completionPercentage), 0) / deptPerformance.length)}%` : '',
      ].filter(Boolean);
      breakdownItems.forEach((item, i) => {
        doc.text(item, margin + 80, y + 21 + i * 4);
      });

      y += 42;
    }
  }

  // ===== ENROLLMENT FUNNEL =====
  if (data.learningEngagement && data.progressDistribution) {
    checkPageBreak(55);
    sectionTitle('Enrollment Funnel', 'Conversion through learning stages');

    const eng = data.learningEngagement;
    const pd = data.progressDistribution;
    const totalEnrolled = n(eng.totalEnrollments);
    const started = totalEnrolled - n(pd.notStarted);
    const inProgress = n(pd.intermediate) + n(pd.advanced) + n(pd.completed);
    const completed = n(pd.completed);

    const funnelStages = [
      { label: 'Enrolled', value: totalEnrolled, color: COLORS.blue },
      { label: 'Started', value: started, color: COLORS.purple },
      { label: 'In Progress', value: inProgress, color: COLORS.warning },
      { label: 'Completed', value: completed, color: COLORS.emerald },
    ];

    const funnelH = 40;
    const maxW = contentWidth - 20;
    const maxVal = Math.max(totalEnrolled, 1);

    drawRoundedRect(margin, y, contentWidth, funnelH + 8, 3, COLORS.white, COLORS.border);

    funnelStages.forEach((stage, i) => {
      const barW = Math.max(20, (stage.value / maxVal) * maxW);
      const barX = margin + 10 + (maxW - barW) / 2;
      const barY = y + 4 + i * 10;

      doc.setFillColor(...stage.color);
      doc.roundedRect(barX, barY, barW, 7, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.white);
      doc.text(`${stage.label}: ${stage.value}`, barX + barW / 2, barY + 5, { align: 'center' });

      if (i > 0) {
        const prevVal = funnelStages[i - 1].value;
        const rate = prevVal > 0 ? Math.round((stage.value / prevVal) * 100) : 0;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.textLight);
        doc.text(`${rate}%`, margin + 4, barY + 5);
      }
    });

    y += funnelH + 16;
  }

  // ===== LEARNING ENGAGEMENT =====
  if (data.learningEngagement) {
    checkPageBreak(40);
    sectionTitle('Learning Engagement', 'Platform engagement metrics');
    const eng = data.learningEngagement;
    const items = [
      { label: 'Total Active Users', value: n(eng.totalActiveUsers) },
      { label: 'Users with Enrollments', value: n(eng.usersWithEnrollments) },
      { label: 'Total Enrollments', value: n(eng.totalEnrollments) },
      { label: 'Total Time Spent (hrs)', value: n(eng.totalTimeSpent) },
      { label: 'Avg Time/User (hrs)', value: n(eng.avgTimePerUser) },
      { label: 'Active Last 7 Days', value: n(eng.activeUsersLast7Days) },
    ];

    const colW = (contentWidth - 6) / 3;
    const rowH = 20;
    drawRoundedRect(margin, y, contentWidth, rowH * 2 + 4, 3, COLORS.white, COLORS.border);

    items.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const ix = margin + 4 + col * (colW + 2);
      const iy = y + 4 + row * rowH;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.primary);
      doc.text(String(item.value), ix + colW / 2, iy + 8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(item.label, ix + colW / 2, iy + 14, { align: 'center' });
    });
    y += rowH * 2 + 12;
  }

  // ===== LEADERBOARD =====
  if (data.combinedAnalytics?.leaderboard && data.combinedAnalytics.leaderboard.length > 0) {
    checkPageBreak(60);
    sectionTitle('Top Learners', 'Leaderboard rankings');

    const tableX = margin;
    drawRoundedRect(tableX, y, contentWidth, 9, 2, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text('#', tableX + 4, y + 6);
    doc.text('Name', tableX + 14, y + 6);
    doc.text('Level', tableX + 70, y + 6);
    doc.text('Points', tableX + 100, y + 6);
    doc.text('Courses', tableX + 125, y + 6);
    doc.text('Certs', tableX + 150, y + 6);
    y += 10;

    data.combinedAnalytics.leaderboard.slice(0, 10).forEach((entry, i) => {
      checkPageBreak(12);
      const rowY = y;
      const bgColor = i % 2 === 0 ? COLORS.bgLight : COLORS.white;
      drawRoundedRect(tableX, rowY, contentWidth, 10, 1, bgColor);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.text);
      doc.text(s(entry.rank, ''), tableX + 5, rowY + 7);

      doc.setFont('helvetica', 'normal');
      doc.text(trunc(entry.name, 25), tableX + 14, rowY + 7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(s(entry.level, '—'), tableX + 70, rowY + 7);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(s(entry.points, '0'), tableX + 100, rowY + 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(s(entry.coursesCompleted, '0'), tableX + 130, rowY + 7);
      doc.text(s(entry.certificatesEarned, '0'), tableX + 155, rowY + 7);
      y += 11;
    });
    y += 8;
  }

  // ===== DEPARTMENT PERFORMANCE =====
  if (data.combinedAnalytics?.departmentPerformance && data.combinedAnalytics.departmentPerformance.length > 0) {
    checkPageBreak(50);
    sectionTitle('Department Performance', 'Completion rates by department');

    data.combinedAnalytics.departmentPerformance.forEach((dept) => {
      checkPageBreak(16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.text(s(dept.department), margin + 4, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(`${n(dept.usersWithEnrollments)}/${n(dept.totalUsers)} users`, margin + 80, y + 4);

      const pct = n(dept.completionPercentage);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(pct >= 70 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.danger));
      doc.text(`${pct}%`, pageWidth - margin - 4, y + 4, { align: 'right' });

      drawProgressBar(margin + 4, y + 7, contentWidth - 8, 4, pct,
        pct >= 70 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.danger);
      y += 16;
    });
    y += 8;
  }

  // ===== TOP COURSES =====
  if (data.topCourses && data.topCourses.length > 0) {
    checkPageBreak(60);
    sectionTitle('Top Courses', 'Most enrolled courses');

    const tableX = margin;
    drawRoundedRect(tableX, y, contentWidth, 9, 2, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text('#', tableX + 4, y + 6);
    doc.text('Course Name', tableX + 14, y + 6);
    doc.text('Enrolled', tableX + contentWidth - 55, y + 6);
    doc.text('Progress', tableX + contentWidth - 30, y + 6);
    y += 10;

    data.topCourses.forEach((course, i) => {
      checkPageBreak(14);
      const rowY = y;
      const bgColor = i % 2 === 0 ? COLORS.bgLight : COLORS.white;
      drawRoundedRect(tableX, rowY, contentWidth, 12, 1, bgColor);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.text(String(i + 1), tableX + 5, rowY + 8);

      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.text(trunc(course.name, 40), tableX + 14, rowY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textLight);
      doc.text(`${n(course.enrolled)} / ${n(course.total)}`, tableX + contentWidth - 55, rowY + 8);

      const pct = n(course.total) > 0 ? (n(course.enrolled) / n(course.total)) * 100 : 0;
      drawProgressBar(tableX + contentWidth - 32, rowY + 4, 28, 3.5, pct, COLORS.accent);
      y += 13;
    });
    y += 8;
  }

  // ===== COURSES BY CATEGORY =====
  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    checkPageBreak(40);
    sectionTitle('Courses by Category', 'Category-wise course and enrollment breakdown');

    const tableX = margin;
    drawRoundedRect(tableX, y, contentWidth, 9, 2, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.white);
    doc.text('Category', tableX + 10, y + 6);
    doc.text('Courses', tableX + 75, y + 6);
    doc.text('Enrollments', tableX + 105, y + 6);
    doc.text('Completion Rate', tableX + 140, y + 6);
    y += 10;

    data.categoryBreakdown.forEach((cat, i) => {
      checkPageBreak(11);
      const rowY = y;
      const bgColor = i % 2 === 0 ? COLORS.bgLight : COLORS.white;
      drawRoundedRect(tableX, rowY, contentWidth, 10, 1, bgColor);

      const rgb = hexToRgb(cat.color);
      doc.setFillColor(...rgb);
      doc.circle(tableX + 5, rowY + 5, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.text);
      doc.text(trunc(cat.category, 28), tableX + 10, rowY + 7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(String(n(cat.courseCount)), tableX + 80, rowY + 7);
      doc.text(String(n(cat.enrollments)), tableX + 112, rowY + 7);

      const rate = n(cat.completionRate);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(rate >= 70 ? COLORS.success : rate >= 40 ? COLORS.warning : COLORS.danger));
      doc.text(`${rate}%`, tableX + 148, rowY + 7);
      y += 11;
    });
    y += 8;
  }

  // ===== COURSE COMPLETION DATA =====
  if (data.courseCompletionData && data.courseCompletionData.length > 0) {
    checkPageBreak(50);
    sectionTitle('Course Completion Details', 'Completion rates and time spent per course');

    const tableX = margin;
    drawRoundedRect(tableX, y, contentWidth, 9, 2, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.white);
    doc.text('Course', tableX + 4, y + 6);
    doc.text('Category', tableX + 65, y + 6);
    doc.text('Enrolled', tableX + 100, y + 6);
    doc.text('Done', tableX + 120, y + 6);
    doc.text('Rate', tableX + 137, y + 6);
    doc.text('Avg Time', tableX + 155, y + 6);
    y += 10;

    data.courseCompletionData.slice(0, 15).forEach((course, i) => {
      checkPageBreak(11);
      const rowY = y;
      const bgColor = i % 2 === 0 ? COLORS.bgLight : COLORS.white;
      drawRoundedRect(tableX, rowY, contentWidth, 10, 1, bgColor);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.text);
      doc.text(trunc(course.title, 30), tableX + 4, rowY + 7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(trunc(course.category, 15), tableX + 65, rowY + 7);
      doc.setTextColor(...COLORS.text);
      doc.text(s(course.totalEnrollments, '0'), tableX + 104, rowY + 7);
      doc.text(s(course.completed, '0'), tableX + 123, rowY + 7);

      const rate = n(course.completionRate);
      doc.setTextColor(...(rate >= 70 ? COLORS.success : rate >= 40 ? COLORS.warning : COLORS.danger));
      doc.setFont('helvetica', 'bold');
      doc.text(`${rate}%`, tableX + 137, rowY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textLight);
      doc.text(`${n(course.avgTimeSpent)}h`, tableX + 158, rowY + 7);
      y += 11;
    });
    y += 8;
  }

  // ===== USER REPORT =====
  if (data.userReportData && data.userReportData.length > 0) {
    checkPageBreak(50);
    sectionTitle('User Report', `${data.userReportData.length} users in the system`);

    const tableX = margin;
    drawRoundedRect(tableX, y, contentWidth, 9, 2, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.white);
    doc.text('Name', tableX + 4, y + 6);
    doc.text('Email', tableX + 45, y + 6);
    doc.text('Role', tableX + 100, y + 6);
    doc.text('Status', tableX + 120, y + 6);
    doc.text('Courses', tableX + 140, y + 6);
    doc.text('Points', tableX + 160, y + 6);
    y += 10;

    data.userReportData.slice(0, 20).forEach((user, i) => {
      checkPageBreak(11);
      const rowY = y;
      const bgColor = i % 2 === 0 ? COLORS.bgLight : COLORS.white;
      drawRoundedRect(tableX, rowY, contentWidth, 10, 1, bgColor);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.text);
      doc.text(trunc(user.fullName, 20), tableX + 4, rowY + 7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(trunc(user.email, 25), tableX + 45, rowY + 7);
      doc.setTextColor(...COLORS.text);
      doc.text(s(user.role, '—'), tableX + 100, rowY + 7);

      const isActive = s(user.status, '').toLowerCase() === 'active';
      doc.setTextColor(...(isActive ? COLORS.success : COLORS.danger));
      doc.text(s(user.status, '—'), tableX + 120, rowY + 7);

      doc.setTextColor(...COLORS.text);
      doc.text(`${n(user.coursesCompleted)}/${n(user.coursesEnrolled)}`, tableX + 143, rowY + 7);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(s(user.totalPoints, '0'), tableX + 162, rowY + 7);
      y += 11;
    });
    y += 8;
  }

  // ===== CERTIFICATION DISTRIBUTION =====
  if (data.combinedAnalytics?.certificationDistribution && data.combinedAnalytics.certificationDistribution.length > 0) {
    checkPageBreak(40);
    sectionTitle('Certification Distribution');

    data.combinedAnalytics.certificationDistribution.forEach((cert) => {
      checkPageBreak(12);
      const rgb = hexToRgb(cert.color);
      doc.setFillColor(...rgb);
      doc.circle(margin + 6, y + 3, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.text(s(cert.type), margin + 14, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(`${n(cert.percentage)}%`, pageWidth - margin - 4, y + 5, { align: 'right' });
      y += 10;
    });
    y += 8;
  }

  // ===== COMPLETION TRENDS =====
  if (data.combinedAnalytics?.completionTrends && data.combinedAnalytics.completionTrends.length > 0) {
    checkPageBreak(60);
    sectionTitle('Completion Trends', 'Monthly enrollment vs completion');

    const trends = data.combinedAnalytics.completionTrends;
    const maxVal = Math.max(...trends.map(t => Math.max(n(t.enrolled), n(t.completed), n(t.target))), 1);
    const barAreaH = 45;
    const barGroupW = (contentWidth - 10) / trends.length;

    drawRoundedRect(margin, y - 2, contentWidth, barAreaH + 20, 3, COLORS.white, COLORS.border);

    trends.forEach((trend, i) => {
      const groupX = margin + 5 + i * barGroupW;
      const barW = (barGroupW - 8) / 2;

      const enrollH = (n(trend.enrolled) / maxVal) * barAreaH;
      const completeH = (n(trend.completed) / maxVal) * barAreaH;

      doc.setFillColor(...COLORS.primary);
      doc.rect(groupX, y + barAreaH - enrollH, barW, Math.max(enrollH, 0.5), 'F');

      doc.setFillColor(...COLORS.success);
      doc.rect(groupX + barW + 2, y + barAreaH - completeH, barW, Math.max(completeH, 0.5), 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.textLight);
      doc.text(s(trend.month, ''), groupX + barGroupW / 2 - 4, y + barAreaH + 8, { align: 'center' });
    });

    y += barAreaH + 22;

    doc.setFillColor(...COLORS.primary);
    doc.circle(margin + 4, y, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text('Enrolled', margin + 9, y + 1);

    doc.setFillColor(...COLORS.success);
    doc.circle(margin + 34, y, 2, 'F');
    doc.text('Completed', margin + 39, y + 1);
    y += 10;
  }

  // ===== SKILLS ASSESSMENT =====
  if (data.combinedAnalytics?.skillsAssessment && data.combinedAnalytics.skillsAssessment.length > 0) {
    checkPageBreak(50);
    sectionTitle('Skills Assessment', 'Average scores across skill areas');

    data.combinedAnalytics.skillsAssessment.forEach((skill) => {
      checkPageBreak(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.text(s(skill.skill), margin + 4, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textLight);
      doc.text(`${n(skill.users)} users`, margin + 80, y + 4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(`${n(skill.score)}%`, pageWidth - margin - 4, y + 4, { align: 'right' });

      drawProgressBar(margin + 4, y + 7, contentWidth - 8, 4, n(skill.score), COLORS.accent);
      y += 14;
    });
    y += 8;
  }

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fY = pageHeight - 10;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, fY - 4, pageWidth - margin, fY - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text('Magnetix Learning Platform — Confidential', margin, fY);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, fY, { align: 'right' });
  }

  // Return as Buffer
  return Buffer.from(doc.output('arraybuffer'));
};

module.exports = { generateAnalyticsPDFBuffer };
