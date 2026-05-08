const { promisePool } = require('../config/db');
const {
  getManagedTeamIdsForUser,
  canUserViewTeamViaHierarchy,
  userHasOrganizationMembership,
  userHasReportees
} = require('../utils/manager_hierarchy');

const ADMIN_ROLES = new Set([3, 4]);

exports.requireAnyManagerRole = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uuid) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (ADMIN_ROLES.has(req.user.role_id)) {
      return next();
    }
    const teamIds = await getManagedTeamIdsForUser(req.user.uuid);
    if (teamIds.length > 0) {
      return next();
    }
    // Reportee-based fallback: a user with no team-manager seat is still a
    // manager for the purposes of viewing reportee submissions IF they have at
    // least one direct/transitive reportee via reports_to_uuid AND they are
    // mapped to an organization. This widens visibility — it does not remove
    // any prior check.
    const [hasReportees, hasOrg] = await Promise.all([
      userHasReportees(req.user.uuid),
      userHasOrganizationMembership(req.user.uuid)
    ]);
    if (hasReportees && hasOrg) {
      return next();
    }
    return res.status(403).json({ message: 'Manager privileges required' });
  } catch (error) {
    console.error('requireAnyManagerRole error:', error);
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

exports.requireManagerOfTeam = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uuid) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const teamId = parseInt(req.params.teamId, 10);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid teamId' });
    }
    if (ADMIN_ROLES.has(req.user.role_id)) {
      return next();
    }
    const ok = await canUserViewTeamViaHierarchy(req.user.uuid, teamId);
    if (!ok) {
      return res.status(403).json({ message: 'Not the manager of this team' });
    }
    next();
  } catch (error) {
    console.error('requireManagerOfTeam error:', error);
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

exports.requireAssignmentVisibility = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uuid) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const assignmentId = req.params.id || req.params.assignmentId;
    const isUuid = typeof assignmentId === 'string' && assignmentId.length === 36;
    const where = isUuid ? 'uuid = ?' : 'id = ?';
    const idValue = isUuid ? assignmentId : parseInt(assignmentId, 10);

    if (!isUuid && Number.isNaN(idValue)) {
      return res.status(400).json({ message: 'Invalid assignment id' });
    }

    const [rows] = await promisePool.query(
      `SELECT id, uuid, scope, organization_id, team_id, created_by, is_deleted
         FROM assignments
        WHERE ${where} AND is_deleted = 0
        LIMIT 1`,
      [idValue]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    const assignment = rows[0];

    // Super admin: full access
    if (req.user.role_id === 4) {
      req.assignment = assignment;
      return next();
    }

    // Creator: full access
    if (assignment.created_by === req.user.uuid) {
      req.assignment = assignment;
      return next();
    }

    // Admin in the same org as the assignment's org/team
    if (req.user.role_id === 3) {
      let orgId = assignment.organization_id;
      if (!orgId && assignment.team_id) {
        const [teamRows] = await promisePool.query(
          'SELECT organization_id FROM teams WHERE id = ?',
          [assignment.team_id]
        );
        orgId = teamRows[0] && teamRows[0].organization_id;
      }
      if (orgId) {
        const [orgRows] = await promisePool.query(
          'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
          [req.user.uuid, orgId]
        );
        if (orgRows.length > 0) {
          req.assignment = assignment;
          return next();
        }
      } else {
        // Legacy assignment with no org binding — admin gets through.
        req.assignment = assignment;
        return next();
      }
    }

    // Manager of the team this assignment targets — directly or via the
    // reports_to hierarchy.
    if (assignment.team_id) {
      const ok = await canUserViewTeamViaHierarchy(req.user.uuid, assignment.team_id);
      if (ok) {
        req.assignment = assignment;
        return next();
      }
    }

    // Non-team manager fallback: caller is a reports_to manager (no team seat
    // on this assignment's team) but at least one of their direct/transitive
    // reportees has submitted to this assignment. The caller must also be in
    // an organization. This lets a user who manages people purely via the
    // reports_to chain see what their reportees have submitted.
    {
      const { getDescendantUserUuids } = require('../utils/manager_hierarchy');
      const descendants = await getDescendantUserUuids(req.user.uuid);
      if (descendants.length > 0) {
        const hasOrg = await userHasOrganizationMembership(req.user.uuid);
        if (hasOrg) {
          const placeholders = descendants.map(() => '?').join(',');
          const [subRows] = await promisePool.query(
            `SELECT 1 FROM assignment_submissions
              WHERE assignment_id = ?
                AND user_id IN (${placeholders})
              LIMIT 1`,
            [assignment.id, ...descendants]
          );
          if (subRows.length > 0) {
            req.assignment = assignment;
            return next();
          }
        }
      }
    }

    // Learner targeted by the assignment (org-wide or team member)
    if (assignment.scope === 'organization' && assignment.organization_id) {
      const [orgRows] = await promisePool.query(
        'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
        [req.user.uuid, assignment.organization_id]
      );
      if (orgRows.length > 0) {
        req.assignment = assignment;
        return next();
      }
    }
    if (assignment.scope === 'team' && assignment.team_id) {
      const [memberRows] = await promisePool.query(
        'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1',
        [assignment.team_id, req.user.uuid]
      );
      if (memberRows.length > 0) {
        req.assignment = assignment;
        return next();
      }
    }

    return res.status(404).json({ message: 'Assignment not found' });
  } catch (error) {
    console.error('requireAssignmentVisibility error:', error);
    res.status(500).json({ message: 'Authorization check failed' });
  }
};
