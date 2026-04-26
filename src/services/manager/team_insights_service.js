const { promisePool: pool } = require('../../config/db');

/**
 * Aggregate views for the manager team-detail tabs. Every function expects
 * the route to have already authorised the caller as a manager of `teamId`
 * (via `requireManagerOfTeam`). These functions never re-check identity —
 * they trust the caller has been gated upstream.
 */

const _teamHeaderQuery = (teamId) =>
  pool.query(
    `SELECT
        t.id, t.name, t.description, t.organization_id,
        o.name AS organization_name,
        t.manager_id,
        NULLIF(TRIM(CONCAT_WS(' ',
          COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name),
          COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)
        )), '') AS manager_name,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM teams t
       LEFT JOIN organizations o ON t.organization_id = o.id
       LEFT JOIN students s      ON t.manager_id = s.user_id
       LEFT JOIN admins a        ON t.manager_id = a.user_id
       LEFT JOIN instructors i   ON t.manager_id = i.user_id
       LEFT JOIN super_admins sa ON t.manager_id = sa.user_id
      WHERE t.id = ? AND t.is_deleted = 0
      LIMIT 1`,
    [teamId]
  );

async function getTeamOverview(teamId) {
  const [[teamRows]] = await Promise.all([_teamHeaderQuery(teamId)]);
  const team = teamRows[0] || null;
  if (!team) return null;

  const [[kpiRows]] = await Promise.all([
    pool.query(
      `SELECT
          SUM(CASE WHEN a.start_date <= NOW() AND a.end_date >= NOW() THEN 1 ELSE 0 END) AS active_assignments,
          SUM(CASE WHEN a.start_date >  NOW()                        THEN 1 ELSE 0 END) AS upcoming_assignments,
          SUM(CASE WHEN a.end_date   <  NOW()                        THEN 1 ELSE 0 END) AS overdue_assignments,
          COUNT(*) AS total_assignments
         FROM assignments a
        WHERE a.team_id = ? AND a.is_deleted = 0`,
      [teamId]
    )
  ]);
  const kpiRow = kpiRows[0] || {};

  const [[submissionAggRows]] = await Promise.all([
    pool.query(
      `SELECT
          COUNT(*) AS submissions_total,
          SUM(CASE WHEN s.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS submissions_last_30d
         FROM assignment_submissions s
         INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
        WHERE a.team_id = ?`,
      [teamId]
    )
  ]);
  const subAgg = submissionAggRows[0] || {};

  // Submission rate = (#unique submitter+assignment pairs) / (#members × #assignments)
  const [[expectedRows]] = await Promise.all([
    pool.query(
      `SELECT
          (SELECT COUNT(*) FROM assignments a WHERE a.team_id = ? AND a.is_deleted = 0) AS asn_count,
          (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = ?) AS mem_count`,
      [teamId, teamId]
    )
  ]);
  const exp = expectedRows[0] || {};
  const expected = (exp.asn_count || 0) * (exp.mem_count || 0);
  const submissionRate =
    expected > 0 ? Math.round(((subAgg.submissions_total || 0) / expected) * 100) : 0;

  const [[avgScoreRows]] = await Promise.all([
    pool.query(
      `SELECT AVG(fr.percentage) AS avg_pct
         FROM assignment_submissions s
         INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
         INNER JOIN feedback_responses fr ON fr.id = s.assessment_response_id
        WHERE a.team_id = ? AND s.submission_type = 'assessment'`,
      [teamId]
    )
  ]);

  const [[recentAssignments]] = await Promise.all([
    pool.query(
      `SELECT a.id, a.uuid, a.title, a.type, a.start_date, a.end_date, a.created_at,
              (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submitted_count
         FROM assignments a
        WHERE a.team_id = ? AND a.is_deleted = 0
        ORDER BY a.created_at DESC
        LIMIT 5`,
      [teamId]
    )
  ]);

  const [[recentSubmissions]] = await Promise.all([
    pool.query(
      `SELECT s.id, s.uuid, s.submission_type, s.status, s.submitted_at,
              a.uuid AS assignment_uuid, a.title AS assignment_title,
              u.uuid AS user_id, u.email,
              TRIM(CONCAT(COALESCE(st.first_name, ad.first_name, ins.first_name, ''), ' ',
                          COALESCE(st.last_name,  ad.last_name,  ins.last_name,  ''))) AS user_name,
              fr.percentage AS score_pct
         FROM assignment_submissions s
         INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
         INNER JOIN users u       ON u.uuid = s.user_id AND u.is_deleted = 0
         LEFT JOIN students st    ON st.user_id = u.uuid
         LEFT JOIN admins ad      ON ad.user_id = u.uuid
         LEFT JOIN instructors ins ON ins.user_id = u.uuid
         LEFT JOIN feedback_responses fr ON fr.id = s.assessment_response_id
        WHERE a.team_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT 5`,
      [teamId]
    )
  ]);

  return {
    team,
    kpi: {
      active_assignments: Number(kpiRow.active_assignments || 0),
      upcoming_assignments: Number(kpiRow.upcoming_assignments || 0),
      overdue_assignments: Number(kpiRow.overdue_assignments || 0),
      total_assignments: Number(kpiRow.total_assignments || 0),
      submissions_total: Number(subAgg.submissions_total || 0),
      submissions_last_30d: Number(subAgg.submissions_last_30d || 0),
      submission_rate_pct: submissionRate,
      avg_assessment_score_pct:
        avgScoreRows[0] && avgScoreRows[0].avg_pct != null
          ? Math.round(Number(avgScoreRows[0].avg_pct))
          : null
    },
    recent_assignments: recentAssignments,
    recent_submissions: recentSubmissions
  };
}

async function getTeamSubmissionsRollup(teamId, filters = {}) {
  const limit = Math.min(parseInt(filters.limit, 10) || 50, 200);
  const offset = parseInt(filters.offset, 10) || 0;

  const where = ['a.team_id = ?', 'a.is_deleted = 0'];
  const params = [teamId];

  if (filters.status) {
    where.push('s.status = ?');
    params.push(filters.status);
  }
  if (filters.type) {
    where.push('s.submission_type = ?');
    params.push(filters.type);
  }
  if (filters.user_id) {
    where.push('s.user_id = ?');
    params.push(filters.user_id);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT
        s.id, s.uuid, s.submission_type, s.status, s.feedback,
        s.submitted_at, s.reviewed_at,
        s.assessment_response_id, s.file_url, s.file_name,
        a.id AS assignment_id, a.uuid AS assignment_uuid, a.title AS assignment_title,
        a.type AS assignment_type, a.end_date AS assignment_end_date,
        u.uuid AS user_id, u.email,
        TRIM(CONCAT(COALESCE(st.first_name, ad.first_name, ins.first_name, ''), ' ',
                    COALESCE(st.last_name,  ad.last_name,  ins.last_name,  ''))) AS user_name,
        fr.score, fr.max_score, fr.percentage AS score_pct
       FROM assignment_submissions s
       INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
       INNER JOIN users u       ON u.uuid = s.user_id AND u.is_deleted = 0
       LEFT JOIN students st    ON st.user_id = u.uuid
       LEFT JOIN admins ad      ON ad.user_id = u.uuid
       LEFT JOIN instructors ins ON ins.user_id = u.uuid
       LEFT JOIN feedback_responses fr ON fr.id = s.assessment_response_id
       ${whereSql}
       ORDER BY s.submitted_at DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM assignment_submissions s
       INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
       ${whereSql}`,
    params
  );

  return { rows, total };
}

async function getTeamAnalytics(teamId) {
  const [[teamRows]] = await Promise.all([_teamHeaderQuery(teamId)]);
  const team = teamRows[0] || null;
  if (!team) return null;

  const [[statusRows]] = await Promise.all([
    pool.query(
      `SELECT
          SUM(CASE WHEN a.start_date <= NOW() AND a.end_date >= NOW() THEN 1 ELSE 0 END) AS active_count,
          SUM(CASE WHEN a.start_date >  NOW()                        THEN 1 ELSE 0 END) AS upcoming_count,
          SUM(CASE WHEN a.end_date   <  NOW()                        THEN 1 ELSE 0 END) AS overdue_count,
          COUNT(*) AS total_count
         FROM assignments a
        WHERE a.team_id = ? AND a.is_deleted = 0`,
      [teamId]
    )
  ]);
  const sc = statusRows[0] || {};

  // Per-member completion: # submitted / # assignments visible to this team.
  const [[asnCountRows]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS asn_count FROM assignments a WHERE a.team_id = ? AND a.is_deleted = 0`,
      [teamId]
    )
  ]);
  const asnCount = Number(asnCountRows[0].asn_count || 0);

  const [perMember] = await pool.query(
    `SELECT
        u.uuid AS user_id,
        TRIM(CONCAT(COALESCE(st.first_name, ad.first_name, ins.first_name, ''), ' ',
                    COALESCE(st.last_name,  ad.last_name,  ins.last_name,  ''))) AS name,
        u.email,
        (SELECT COUNT(DISTINCT s.assignment_id)
           FROM assignment_submissions s
           INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
          WHERE a.team_id = ? AND s.user_id = u.uuid) AS submitted,
        (SELECT AVG(fr.percentage)
           FROM assignment_submissions s
           INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
           INNER JOIN feedback_responses fr ON fr.id = s.assessment_response_id
          WHERE a.team_id = ? AND s.user_id = u.uuid) AS avg_score_pct
       FROM team_members tm
       INNER JOIN users u ON u.uuid = tm.user_id AND u.is_deleted = 0
       LEFT JOIN students st    ON st.user_id = u.uuid
       LEFT JOIN admins ad      ON ad.user_id = u.uuid
       LEFT JOIN instructors ins ON ins.user_id = u.uuid
      WHERE tm.team_id = ?
      ORDER BY name`,
    [teamId, teamId, teamId]
  );

  const perMemberDecorated = perMember.map((r) => ({
    user_id: r.user_id,
    name: r.name || r.email,
    email: r.email,
    assigned: asnCount,
    submitted: Number(r.submitted || 0),
    completion_pct: asnCount > 0 ? Math.round((Number(r.submitted || 0) / asnCount) * 100) : 0,
    avg_score_pct: r.avg_score_pct != null ? Math.round(Number(r.avg_score_pct)) : null
  }));

  // Score summary across the team
  const scored = perMemberDecorated.filter((r) => r.avg_score_pct != null);
  const avgAcrossTeam =
    scored.length > 0
      ? Math.round(scored.reduce((s, r) => s + (r.avg_score_pct || 0), 0) / scored.length)
      : null;
  const lowest =
    scored.length > 0
      ? scored.reduce((m, r) => ((r.avg_score_pct || 0) < (m.avg_score_pct || 0) ? r : m))
      : null;
  const highest =
    scored.length > 0
      ? scored.reduce((m, r) => ((r.avg_score_pct || 0) > (m.avg_score_pct || 0) ? r : m))
      : null;

  return {
    team,
    members: perMemberDecorated.length,
    assignment_status_counts: {
      active: Number(sc.active_count || 0),
      upcoming: Number(sc.upcoming_count || 0),
      overdue: Number(sc.overdue_count || 0),
      total: Number(sc.total_count || 0)
    },
    per_member_completion: perMemberDecorated,
    score_summary: {
      avg_assessment_pct: avgAcrossTeam,
      lowest: lowest ? { user_id: lowest.user_id, name: lowest.name, score_pct: lowest.avg_score_pct } : null,
      highest: highest ? { user_id: highest.user_id, name: highest.name, score_pct: highest.avg_score_pct } : null
    }
  };
}

module.exports = {
  getTeamOverview,
  getTeamSubmissionsRollup,
  getTeamAnalytics
};
