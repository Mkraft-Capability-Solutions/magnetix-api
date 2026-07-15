/**
 * Org Feature Catalog — the master A-Z list of platform functionalities that a
 * Super Admin can switch ON/OFF per organization.
 *
 * Why this lives in code (not a DB table):
 *   The catalog is the contract shared by the backend (enforcement +
 *   management API), the frontend menu (which item maps to which feature) and
 *   the Super Admin UI. Keeping it as one constant means the three can never
 *   drift, and enforcement does NOT depend on a seed migration having run.
 *   Per-org choices ARE stored in DB (`organization_features`); this is just
 *   the list of what's gateable.
 *
 * Model: OPT-OUT. Every feature is enabled for every org by default. A row in
 * `organization_features` with is_enabled = 0 is the only thing that turns a
 * feature OFF for a given org. So:
 *   - new/unconfigured org            -> sees everything
 *   - super admin toggles a feature off -> hidden + API-blocked for that org
 *
 * `key` is the stable identifier. NEVER rename a key once shipped (it's
 * persisted in `organization_features` and referenced by menu items); change
 * `label`/`description`/`module` freely.
 */

export interface OrgFeature {
  key: string;
  module: string;
  label: string;
  description: string;
}

export const ORG_FEATURES: ReadonlyArray<OrgFeature> = [
  // ---- User Management ----
  { key: 'users',       module: 'User Management', label: 'User Management',      description: 'Manage users / learners within the organization.' },
  { key: 'teams',       module: 'User Management', label: 'Teams',                description: 'Create and manage teams.' },
  { key: 'assignments', module: 'User Management', label: 'Assignments',          description: 'Create and track learning assignments.' },
  { key: 'approvals',   module: 'User Management', label: 'Approvals',            description: 'Review and approve course / content submissions.' },
  { key: 'performance', module: 'User Management', label: 'Performance Tracking', description: 'Performance dashboards and tracking.' },

  // ---- Content ----
  { key: 'content_management', module: 'Content', label: 'Content Management',      description: 'Manage lessons and learning content.' },
  { key: 'courses',            module: 'Content', label: 'Course Management',        description: 'Create and manage courses.' },
  { key: 'catalog',            module: 'Content', label: 'Catalog / Category',       description: 'Manage the course catalog and categories.' },
  { key: 'group_projects',     module: 'Content', label: 'Group Projects',           description: 'Group project creation and tracking.' },
  { key: 'certifications',     module: 'Content', label: 'Certification Management', description: 'Issue and manage certifications.' },

  // ---- Engagement & Tools ----
  { key: 'bulk_uploader',  module: 'Engagement & Tools', label: 'Bulk Uploader',             description: 'Bulk-upload users and data via CSV.' },
  { key: 'marketing',      module: 'Engagement & Tools', label: 'Marketing / Notifications', description: 'Marketing campaigns and notifications.' },
  { key: 'ilt',            module: 'Engagement & Tools', label: 'ILT Resource Management',   description: 'Instructor-led training resources.' },
  { key: 'knowledge_base', module: 'Engagement & Tools', label: 'Knowledge Base',            description: 'Knowledge base articles.' },

  // ---- Analytics ----
  { key: 'reports', module: 'Analytics', label: 'Reports & Analytics', description: 'Reporting and analytics dashboards.' },

  // ---- AI & Assessments ----
  { key: 'assessments',       module: 'AI & Assessments', label: 'Surveys & Assessments', description: 'Surveys, feedback and assessments.' },
  { key: 'ai_learning_paths', module: 'AI & Assessments', label: 'AI Learning Paths',     description: 'AI-generated personalised learning paths.' },
  { key: 'lingo_lab',         module: 'AI & Assessments', label: 'Lingo Lab AI',          description: 'Lingo Lab AI language tooling.' },
  { key: 'ai_proctor',        module: 'AI & Assessments', label: 'AI Proctor',            description: 'AI-assisted proctoring.' },
  { key: 'carve_assessment',  module: 'AI & Assessments', label: 'Carve Assessment',      description: 'Carve assessment engine.' },
];

/** Set of valid keys for fast membership / validation. */
export const VALID_FEATURE_KEYS: ReadonlySet<string> = new Set(ORG_FEATURES.map((f) => f.key));

/** All catalog feature keys, in catalog order. */
export const ALL_FEATURE_KEYS: string[] = ORG_FEATURES.map((f) => f.key);

export const isValidFeatureKey = (key: string): boolean => VALID_FEATURE_KEYS.has(key);
