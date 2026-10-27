/**
 * Canonical tool registry.
 *
 * Naming grammar: dataops_<scope>_<action>_<object>[_<sub>]
 * - scope is `shared` when used by 2+ stages, otherwise the stage name.
 * - action describes the operation; object is the resource.
 * - payload kinds and cards are independent from tool names.
 */
export const TOOL_REGISTRY = [
  {
    name: 'dataops_requirement_extract_spec',
    scope: 'requirement', action: 'extract', object: 'spec', shared: false,
    stages: ['requirement'], payloadKind: 'requirement', card: 'RequirementCard', skill: 'workitem-protocol', implemented: true
  },
  {
    name: 'dataops_design_compose_model',
    scope: 'design', action: 'compose', object: 'model', shared: false,
    stages: ['design'], payloadKind: 'design', card: 'DesignCard', skill: 'model-review', implemented: true
  },
  {
    name: 'dataops_shared_read_table',
    scope: 'shared', action: 'read', object: 'table', shared: true,
    stages: ['requirement', 'design', 'scheme', 'develop', 'review', 'incident'], payloadKind: 'table', card: 'TableCard', skill: 'lineage-impact', implemented: true
  },
  {
    name: 'dataops_shared_read_lineage',
    scope: 'shared', action: 'read', object: 'lineage', shared: true,
    stages: ['requirement', 'design', 'scheme', 'review', 'incident'], payloadKind: 'lineage', card: 'LineageCard', skill: 'lineage-impact', implemented: true
  },
  {
    name: 'dataops_scheme_compose_tech_plan',
    scope: 'scheme', action: 'compose', object: 'tech_plan', shared: false,
    stages: ['scheme'], payloadKind: 'tech_plan', card: 'TechPlanCard', skill: 'schedule-yaml', implemented: true
  },
  {
    name: 'dataops_shared_read_evidence',
    scope: 'shared', action: 'read', object: 'evidence', shared: true,
    stages: ['design', 'scheme', 'review', 'incident'], payloadKind: 'evidence', card: 'EvidenceCard', skill: 'sql-review', implemented: true
  },
  {
    name: 'dataops_shared_read_profile',
    scope: 'shared', action: 'read', object: 'profile', shared: true,
    stages: ['design', 'scheme', 'review'], payloadKind: 'profile', card: 'ProfileCard', skill: 'data-profiling', implemented: true
  },
  {
    name: 'dataops_scheme_analyze_data',
    scope: 'scheme', action: 'analyze', object: 'data', shared: false,
    stages: ['scheme'], payloadKind: 'analysis', card: 'AnalysisCard', skill: 'sql-review', implemented: true
  },
  {
    name: 'dataops_scheme_compose_solution',
    scope: 'scheme', action: 'compose', object: 'solution', shared: false,
    stages: ['scheme'], payloadKind: 'solution', card: 'SolutionCard', skill: 'solution-design', implemented: true
  },
  {
    name: 'dataops_develop_generate_code',
    scope: 'develop', action: 'generate', object: 'code', shared: false,
    stages: ['develop'], payloadKind: 'develop', card: 'DevelopCard', skill: 'code-review', implemented: true
  },
  {
    name: 'dataops_cicd_scan',
    scope: 'cicd', action: 'scan', shared: false,
    stages: ['cicd'], payloadKind: 'cicd', card: 'CicdCard', skill: 'cicd-gate', implemented: true
  },
  {
    name: 'dataops_cicd_compile',
    scope: 'cicd', action: 'compile', shared: false,
    stages: ['cicd'], payloadKind: 'schedule', card: 'ScheduleCard', skill: 'schedule-yaml', implemented: true,
    external: 'dataops compile <artifact>'
  },
  {
    name: 'dataops_cicd_test',
    scope: 'cicd', action: 'test', shared: false,
    stages: ['cicd'], payloadKind: 'test', card: 'TestCard', skill: 'cicd-gate', implemented: true
  },
  {
    name: 'dataops_cicd_release',
    scope: 'cicd', action: 'release', shared: false,
    stages: ['cicd'], payloadKind: 'release', card: 'ReleaseCard', skill: 'cicd-gate', implemented: true
  },
  {
    name: 'dataops_review_write_postmortem',
    scope: 'review', action: 'write', object: 'postmortem', shared: false,
    stages: ['review'], payloadKind: 'postmortem', card: 'PostmortemCard', skill: 'workitem-protocol', implemented: true
  },
  {
    name: 'dataops_incident_triage',
    scope: 'incident', action: 'triage', shared: false,
    stages: ['incident'], payloadKind: 'incident', card: 'IncidentCard', skill: 'pipeline-debug', implemented: true
  },
  {
    name: 'dataops_shared_present_deliverable',
    scope: 'shared', action: 'present', object: 'deliverable', shared: true,
    stages: ['requirement', 'design', 'scheme', 'develop', 'review', 'incident'], payloadKind: 'deliverable', card: 'DeliverableRenderer', skill: 'dataops-deliverable-templates', implemented: true
  },
  {
    name: 'dataops_shared_read_workitem',
    scope: 'shared', action: 'read', object: 'workitem', shared: true,
    stages: ['requirement', 'design', 'scheme', 'develop', 'review', 'incident'], payloadKind: 'workitem', card: null, skill: 'workitem-protocol', implemented: true
  },
  {
    name: 'dataops_shared_update_workitem',
    scope: 'shared', action: 'update', object: 'workitem', shared: true,
    stages: ['requirement', 'design', 'scheme', 'develop', 'review', 'incident'], payloadKind: 'workitem', card: null, skill: 'workitem-protocol', implemented: true
  },
  {
    name: 'dataops_shared_read_logs',
    scope: 'shared', action: 'read', object: 'logs', shared: true,
    stages: ['review', 'incident'], payloadKind: 'logs', card: null, skill: 'pipeline-debug', implemented: true
  },
  {
    name: 'dataops_shared_read_us',
    scope: 'shared', action: 'read', object: 'us', shared: true,
    stages: ['requirement', 'design', 'scheme'], payloadKind: 'us-picker', card: 'USPickerCard', skill: 'dataops-us-intake', implemented: true
  },
  {
    name: 'dataops_shared_read_datamap',
    scope: 'shared', action: 'read', object: 'datamap', shared: true,
    stages: ['design', 'scheme'], payloadKind: 'datamap', card: null, skill: 'dataops-design', implemented: true
  },
  {
    name: 'dataops_shared_ensure_workitem',
    scope: 'shared', action: 'ensure', object: 'workitem', shared: true,
    stages: ['requirement', 'design', 'scheme', 'develop', 'review', 'incident'], payloadKind: 'workitem', card: null, skill: 'workitem-protocol', implemented: true
  },
  {
    name: 'dataops_shared_stage',
    scope: 'shared', action: 'stage', object: 'deliverable', shared: true,
    stages: ['requirement', 'design', 'scheme'], payloadKind: 'deliverable', card: 'StageResultCard', skill: 'dataops-workflow', implemented: true
  }
]

export const LEGACY_CONTENT_TOOL_NAMES = [
  'dataops_requirement_extract_spec',
  'dataops_design_compose_model',
  'dataops_scheme_analyze_data',
  'dataops_scheme_compose_solution',
  'dataops_scheme_compose_tech_plan',
  'dataops_develop_generate_code',
  'dataops_review_write_postmortem',
  'dataops_incident_triage'
]
export const ACTIVE_TOOL_NAMES = TOOL_REGISTRY
  .map(item => item.name)
  .filter(name => !LEGACY_CONTENT_TOOL_NAMES.includes(name))

export const TOOL_NAMES = Object.fromEntries(TOOL_REGISTRY.map(item => [item.name, item.name]))
export const IMPLEMENTED_TOOLS = TOOL_REGISTRY.filter(item => item.implemented)
export const IMPLEMENTED_TOOL_NAMES = IMPLEMENTED_TOOLS.map(item => item.name)
export const TOOL_NAME_PATTERN = /^dataops_(shared|requirement|design|scheme|develop|cicd|review|incident)_[a-z][a-z0-9_]*$/
