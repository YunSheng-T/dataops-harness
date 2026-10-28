// Offline checks for the stage tools and their contracts.
import { createTools } from '../src/index.js'
import { normalizeConfig } from '../src/config.js'
import { normalizeTicket } from '../src/providers/devops.js'
import { normalizeTable, normalizeLineage } from '../src/providers/catalog.js'
import { requirementPayload } from '../src/contracts.js'
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SCENARIO_KEYS, buildRequirement, buildDesign, buildTechPlan, buildEvidence } from '../src/mock.js'
import { TOOL_REGISTRY, IMPLEMENTED_TOOL_NAMES, TOOL_NAME_PATTERN } from '../src/tool-registry.js'
import { DOMAIN_NAMES, createDomainAdapters } from '../src/providers/domain-adapters.js'

const results = []
const checks = []
const check = (name, fn) => { checks.push([name, fn]) }
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const signal = new AbortController().signal
const tools = createTools(normalizeConfig({}), {})
const byName = name => tools.find(tool => tool.name === name)
const execute = (name, args) => byName(name).execute(args, { signal })
function isLossless(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0)
  if (typeof value !== 'object' || ancestors.has(value)) return false
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.every(item => isLossless(item, ancestors))
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return false
    return Reflect.ownKeys(value).every(key => typeof key === 'string' && isLossless(value[key], ancestors))
  } finally {
    ancestors.delete(value)
  }
}


check('twenty-seven registry fixtures are in the expected order', () => {
  const names = tools.map(tool => tool.name)
  assert(JSON.stringify(names) === JSON.stringify([
    'dataops_requirement_extract_spec', 'dataops_design_compose_model', 'dataops_shared_read_table', 'dataops_shared_read_lineage', 'dataops_scheme_compose_tech_plan', 'dataops_shared_read_evidence',
    'dataops_shared_read_profile', 'dataops_scheme_analyze_data', 'dataops_scheme_compose_solution', 'dataops_develop_generate_code',
    'dataops_cicd_scan', 'dataops_cicd_compile', 'dataops_cicd_test', 'dataops_cicd_release', 'dataops_review_write_postmortem', 'dataops_incident_triage', 'dataops_shared_read_develop', 'dataops_cicd_pipeline', 'dataops_shared_read_stage', 'dataops_shared_present_deliverable', 'dataops_shared_read_workitem', 'dataops_shared_update_workitem', 'dataops_shared_read_logs', 'dataops_shared_read_us', 'dataops_shared_read_datamap', 'dataops_shared_ensure_workitem', 'dataops_shared_stage'
  ]), 'unexpected tools: ' + names.join(','))
  for (const tool of tools) {
    assert(typeof tool.description === 'string' && tool.description.length > 20, tool.name + ': weak description')
    assert(tool.parameters && tool.parameters.type === 'object', tool.name + ': parameters must be a JSON schema object')
    assert(typeof tool.execute === 'function', tool.name + ': missing execute')
    assert(typeof tool.output.render === 'function', tool.name + ': missing render')
  }
})

check('stage-0-5 active surface exposes 19 tools', () => {
  const active = createTools(normalizeConfig({ disabledTools: ['dataops_requirement_extract_spec', 'dataops_design_compose_model', 'dataops_scheme_analyze_data', 'dataops_scheme_compose_solution', 'dataops_scheme_compose_tech_plan', 'dataops_develop_generate_code', 'dataops_review_write_postmortem', 'dataops_incident_triage'] }), {})
  assert(active.length === 19, 'P3 should expose 19 tools, got ' + active.length)
  assert(!active.some(tool => tool.name === 'dataops_requirement_extract_spec'), 'requirement content tool is hidden')
  assert(!active.some(tool => tool.name === 'dataops_design_compose_model'), 'design content tool is hidden')
  for (const name of ['dataops_scheme_analyze_data', 'dataops_scheme_compose_solution', 'dataops_scheme_compose_tech_plan', 'dataops_develop_generate_code', 'dataops_review_write_postmortem', 'dataops_incident_triage']) assert(!active.some(tool => tool.name === name), name + ' is hidden')
  assert(active.some(tool => tool.name === 'dataops_shared_present_deliverable'), 'presenter stays active')
})

check('tool names follow the scope-action-object registry', () => {
  assert(JSON.stringify(tools.map(tool => tool.name)) === JSON.stringify(IMPLEMENTED_TOOL_NAMES), 'registered tools must match implemented registry')
  for (const item of TOOL_REGISTRY) {
    assert(TOOL_NAME_PATTERN.test(item.name), item.name + ': invalid tool name')
    assert(item.scope === 'shared' ? item.shared === true : item.shared === false, item.name + ': shared flag does not match scope')
    assert(item.scope === 'shared' ? item.stages.length > 1 : item.stages.length === 1, item.name + ': shared/stage usage mismatch')
    if (item.implemented) assert(tools.some(tool => tool.name === item.name), item.name + ': registry says implemented but not registered')
  }
  const compile = TOOL_REGISTRY.find(item => item.name === 'dataops_cicd_compile')
  assert(compile && compile.scope === 'cicd' && compile.external && compile.external.includes('dataops compile'), 'compile must be a CICD CLI adapter')
  assert(!TOOL_REGISTRY.some(item => item.name.includes('schedule_spec') || item.name.includes('schedule_yaml')), 'artifact names must not be tool names')
  const legacy = ['dataops_requirement', 'dataops_design', 'dataops_table', 'dataops_lineage', 'dataops_tech_plan', 'dataops_evidence', 'dataops_develop', 'dataops_test', 'dataops_release', 'dataops_postmortem', 'dataops_incident']
  for (const name of legacy) assert(!tools.some(tool => tool.name === name), 'legacy tool name still registered: ' + name)
})

check('every mock tool payload is lossless JSON', async () => {
  const cases = {
    dataops_requirement_extract_spec: { scenario: 'channel-report' },
    dataops_design_compose_model: { scenario: 'channel-report' },
    dataops_shared_read_table: { table: 'dwd.orders' },
    dataops_shared_read_lineage: { table: 'dws.trade_channel_daily', direction: 'down' },
    dataops_scheme_compose_tech_plan: { scenario: 'member-model' },
    dataops_shared_read_evidence: { scenario: 'member-model' },
    dataops_shared_read_profile: { scenario: 'channel-report' },
    dataops_scheme_analyze_data: { scenario: 'channel-report' },
    dataops_scheme_compose_solution: { scenario: 'channel-report' },
    dataops_develop_generate_code: { scenario: 'channel-report' },
    dataops_cicd_scan: { scenario: 'channel-report' },
    dataops_cicd_compile: { scenario: 'channel-report' },
    dataops_cicd_test: { scenario: 'channel-report' },
    dataops_cicd_release: { scenario: 'channel-report' },
    dataops_review_write_postmortem: { scenario: 'channel-report' },
    dataops_incident_triage: { scenario: 'channel-report' },
    dataops_shared_present_deliverable: {
      kind: 'tech_plan', stage: 'scheme', deliverable: 'deliverables/tech-plan.yaml', status: 'draft',
      payload: { tasks: [{ platform: 'ETL', name: '订单过滤' }], estimate: '1 人日', risks: [] }, source: 'agent', asOf: '2026-10-26 18:00'
    },
    dataops_shared_read_workitem: { id: '2026-10-26-channel-report-pay-caliber' },
    dataops_shared_update_workitem: { id: '2026-10-26-channel-report-pay-caliber', patch: { next: 'dryRun test' }, dryRun: true },
    dataops_shared_read_logs: { scenario: 'channel-report' },
    dataops_shared_read_us: {},
    dataops_shared_read_datamap: { usId: 'US-3821' },
    dataops_shared_read_develop: {},
    dataops_cicd_pipeline: {},
    dataops_shared_stage: { action: 'status', id: '2026-10-26-channel-report-pay-caliber' }
  }
  for (const [name, args] of Object.entries(cases)) {
    const payload = await execute(name, args)
    assert(isLossless(payload), name + ' contains undefined or non-JSON values')
    assert(JSON.parse(JSON.stringify(payload)).kind === payload.kind, name + ' must survive JSON round-trip')
  }
})

check('domain adapter skeleton registers all intranet domains', async () => {
  const adapters = createDomainAdapters({ timeoutMs: 8000, retry: 0 })
  assert(Object.keys(adapters).length === 9, 'expected 9 domain adapters')
  assert(JSON.stringify(Object.keys(adapters)) === JSON.stringify(DOMAIN_NAMES), 'domain adapter order/names mismatch')
  for (const name of DOMAIN_NAMES) {
    const health = await adapters[name].health()
    assert(health.ok === true && health.kind === 'mock' && health.mock === true, name + ': mock health')
  }
  let missing = false
  try { await adapters.us.read('list', {}) } catch (error) { missing = /mock not implemented/.test(error.message) }
  assert(missing, 'unwired mock domain must fail explicitly')
})

check('config normalization defaults to mock and validates providers', () => {
  const mock = normalizeConfig({})
  assert(mock.devops.kind === 'mock' && mock.catalog.kind === 'mock', 'default must be mock')
  const cli = normalizeConfig({
    provider: 'cli',
    devops: { commands: { ticket: ['cli', 'ticket', '{ticketId}'] } },
    catalog: { commands: { table: ['cli', 'table', '{table}'] } }
  })
  assert(cli.devops.kind === 'cli' && cli.catalog.kind === 'cli', 'cli kinds')
  let threw = false
  try { normalizeConfig({ provider: 'nope' }) } catch { threw = true }
  assert(threw, 'invalid provider should throw')
  threw = false
  try { normalizeConfig({ provider: 'http', devops: { kind: 'http' } }) } catch { threw = true }
  assert(threw, 'http without base URL should throw')
})

check('mock requirement normalizes to a devops ticket DTO', async () => {
  const payload = await execute('dataops_requirement_extract_spec', { ticketId: 'REQ-9999' })
  assert(payload.kind === 'requirement', 'kind')
  assert(payload.id === '需求 REQ-9999', 'ticketId override')
  assert(payload.source === 'mock', 'source')
  assert(Array.isArray(payload.acceptance) && payload.acceptance.length === 3, 'acceptance')
  assert(Array.isArray(payload.impacts) && payload.impacts.length === 3, 'impacts')
})

check('mock design includes sources and downstream impact', async () => {
  const payload = await execute('dataops_design_compose_model', { scenario: 'channel-report' })
  assert(payload.kind === 'design', 'kind')
  assert(payload.target.table === 'dws.trade_channel_daily', 'target')
  assert(payload.sources.length === 2, 'sources')
  assert(payload.sources.every(item => item.owner), 'source metadata should be enriched')
  assert(payload.impact && payload.impact.count >= 3, 'impact count')
  assert(payload.steps.length === 3, 'steps')
})

check('mock table and lineage tools return normalized cards', async () => {
  const table = await execute('dataops_shared_read_table', { table: 'dwd.orders' })
  assert(table.kind === 'table' && table.columns.length >= 4, 'table card')
  const lineage = await execute('dataops_shared_read_lineage', { table: 'dws.trade_channel_daily', direction: 'down', depth: 1 })
  assert(lineage.kind === 'lineage' && lineage.nodes.length >= 3, 'lineage card')
  assert(lineage.edges.length >= 3, 'lineage edges')
})

check('tech plan and evidence keep the mock payload contract', async () => {
  const plan = await execute('dataops_scheme_compose_tech_plan', {})
  assert(plan.kind === 'tech_plan' && plan.tasks.length === 3, 'tech plan')
  const evidence = await execute('dataops_shared_read_evidence', {})
  assert(evidence.kind === 'evidence' && evidence.query, 'evidence')
})

check('six-stage mock and incident payloads are complete', async () => {
  const develop = await execute('dataops_develop_generate_code', { scenario: 'channel-report' })
  assert(develop.kind === 'develop' && develop.tasks.length === 3, 'develop tasks')
  assert(develop.blockers.length === 1, 'develop blockers')
  const test = await execute('dataops_cicd_test', { scenario: 'channel-report' })
  assert(test.kind === 'test' && test.cases.length === 4, 'test cases')
  assert(test.summary.diff === '0.12%', 'test diff')
  const release = await execute('dataops_cicd_release', { scenario: 'member-model' })
  assert(release.kind === 'release' && release.changeId.startsWith('CHG-'), 'release change')
  assert(release.executed === false && release.status === 'blocked', 'release must fail closed without approval')
  const postmortem = await execute('dataops_review_write_postmortem', { scenario: 'member-model' })
  assert(postmortem.kind === 'postmortem' && postmortem.metrics.length === 3, 'postmortem metrics')
  const incident = await execute('dataops_incident_triage', { scenario: 'channel-report' })
  assert(incident.kind === 'incident' && incident.timeline.length === 4, 'incident timeline')
  assert(incident.impact.count === 3, 'incident impact')
  assert(incident.evidence.query.includes('dwd.orders'), 'incident evidence')
})

check('release gate only executes after allowed-once approval', async () => {
  const run = async (outcome, opts = {}) => {
    const ctx = opts.noService ? { get: () => undefined } : {
      get: name => name === 'approval' ? {
        request: async request => {
          assert(request.agent && request.toolName === 'dataops_cicd_release', 'approval request missing agent/tool')
          if (opts.throws) throw new Error('approval channel unavailable')
          return outcome
        }
      } : undefined
    }
    const tools = createTools(normalizeConfig({}), { ctx })
    const release = tools.find(tool => tool.name === 'dataops_cicd_release')
    return release.execute({ scenario: 'channel-report' }, { agent: {}, callId: 'call-release', ...(opts.exec || {}) })
  }
  const allowed = await run('allowed-once')
  assert(allowed.executed === true && allowed.status === 'released', 'allowed-once must release')
  assert(allowed.approval.outcome === 'allowed-once', 'missing approval outcome')
  const rejected = await run('rejected')
  assert(rejected.executed === false && rejected.status === 'rejected', 'rejected must not release')
  const cancelled = await run('cancelled')
  assert(cancelled.executed === false && cancelled.status === 'cancelled', 'cancelled must not release')
  const unavailable = await run('unavailable')
  assert(unavailable.executed === false && unavailable.status === 'blocked', 'unavailable must fail closed')
  const noService = await run('allowed-once', { noService: true })
  assert(noService.executed === false && noService.status === 'blocked', 'missing approval service must fail closed')
  const throws = await run('allowed-once', { throws: true })
  assert(throws.executed === false && throws.status === 'blocked', 'approval exception must fail closed')
})

check('deliverable presenter validates and flattens payload', async () => {
  const base = {
    kind: 'tech_plan', stage: 'scheme', deliverable: 'deliverables/tech-plan.yaml', status: 'draft',
    payload: { tasks: [{ platform: 'ETL', name: '订单过滤' }], estimate: '1 人日', risks: [] },
    source: 'agent', asOf: '2026-10-26 18:00'
  }
  const ok = await execute('dataops_shared_present_deliverable', base)
  const intake = await execute('dataops_shared_present_deliverable', { kind: 'intake', stage: 'requirement', deliverable: 'deliverables/intake.yaml', payload: { us: { id: 'US-3821' }, workitem: { id: 'wi' } } })
  assert(intake.kind === 'intake' && intake.presented === true, 'intake present')
  assert(ok.kind === 'tech_plan' && ok.presented === true && ok.deliverable === base.deliverable, 'presenter output')
  assert(ok.tasks.length === 1 && ok.estimate === '1 人日', 'payload must be flattened')
  for (const [name, patch] of [
    ['kind', { kind: 'unknown' }],
    ['stage', { stage: 'develop' }],
    ['path', { deliverable: 'deliverables/../item.yaml' }],
    ['payload', { payload: 'not-object' }],
    ['status', { status: 'done' }]
  ]) {
    let failed = false
    try { await execute('dataops_shared_present_deliverable', { ...base, ...patch }) } catch { failed = true }
    assert(failed, 'presenter must reject invalid ' + name)
  }
})

check('workitem read/update validates and writes deliverables', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dataops-workitem-'))
  try {
    const target = join(dir, 'legacy-item')
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'item.yaml'), `id: legacy-item\ntitle: 旧工作项\ntype: delivery\nstatus: planning\nstage: design\nsubstage: null\nstages:\n  requirement:\n    status: done\n    artifact: artifacts/requirement.md\n  design:\n    status: in_progress\n    artifact: artifacts/design.md\nartifacts:\n  - artifacts/requirement.md\n  - artifacts/design.md\nevidence: []\ngaps: []\napprovals: []\nnext: old\n`, 'utf8')
    const scoped = createTools(normalizeConfig({ workitemsDir: dir }), {})
    const read = scoped.find(tool => tool.name === 'dataops_shared_read_workitem')
    const update = scoped.find(tool => tool.name === 'dataops_shared_update_workitem')
    const sample = await read.execute({ id: 'legacy-item' }, { signal })
    assert(sample.kind === 'workitem' && sample.legacy === true, 'legacy workitem must be readable')
    assert(sample.deliverables.includes('artifacts/requirement.md'), 'legacy artifacts must map to deliverables')
    assert(sample.stages.design.deliverable === 'artifacts/design.md', 'stage artifact must map to deliverable')

    const preview = await update.execute({ id: 'legacy-item', dryRun: true, patch: { stage: 'scheme', next: 'preview only' } }, { signal })
    assert(preview.dryRun === true && preview.stage === 'scheme', 'dryRun preview')
    assert(readFileSync(join(target, 'item.yaml'), 'utf8').includes('stage: design'), 'dryRun must not write')

    const result = await update.execute({
      id: 'legacy-item',
      patch: {
        stage: 'scheme', substage: 'analysis', status: 'executing', next: '先补支付时间证据',
        deliverables: ['deliverables/design.md'],
        stages: { design: { status: 'done', deliverable: 'deliverables/design.md' } },
        gaps: []
      }
    }, { signal })
    assert(result.kind === 'workitem' && result.stage === 'scheme', 'updated workitem')
    assert(result.stages.design.status === 'done' && result.stages.design.deliverable === 'deliverables/design.md', 'stage patch')
    assert(result.deliverables[0] === 'deliverables/design.md', 'deliverable patch')
    const reread = await read.execute({ id: 'legacy-item' }, { signal })
    assert(reread.next === '先补支付时间证据' && reread.legacy === false, 'reread updated item')
    const yaml = readFileSync(join(target, 'item.yaml'), 'utf8')
    assert(yaml.includes('deliverables:') && !/^artifacts:/m.test(yaml), 'new write must use deliverables')
    assert(readFileSync(join(target, 'plan.md'), 'utf8').includes('via dataops_shared_update_workitem'), 'plan log')
    for (const patch of [
      { stage: 'unknown' },
      { status: 'done' },
      { deliverables: ['deliverables/../item.yaml'] },
      { stages: { design: { status: 'unknown' } } },
      { unknown: true }
    ]) {
      let failed = false
      try { await update.execute({ id: 'legacy-item', patch }, { signal }) } catch { failed = true }
      assert(failed, 'invalid patch must be rejected: ' + JSON.stringify(patch))
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('P3 ensure workitem dedupes and gates stage advance', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dataops-p3-'))
  try {
    const scoped = createTools(normalizeConfig({ workitemsDir: dir }), {})
    const by = name => scoped.find(tool => tool.name === name)
    const ensure = by('dataops_shared_ensure_workitem')
    const update = by('dataops_shared_update_workitem')
    const created = await ensure.execute({ source: { system: 'edevops', id: 'US-3821' }, title: '渠道日报支付口径', initialStage: 'requirement', owner: '陈璐', requester: '渠道运营' }, { signal })
    assert(created.created === true && created.workitem.source.system === 'edevops', 'ensure creates')
    const again = await ensure.execute({ source: { system: 'edevops', id: 'US-3821' }, title: '重复' }, { signal })
    assert(again.created === false && again.workitem.id === created.workitem.id, 'ensure dedupes by source')
    let blocked = false
    try { await update.execute({ id: created.workitem.id, patch: { stage: 'design' } }, { signal }) } catch { blocked = true }
    assert(blocked, 'stage cannot advance without requirement gate')
    const ui = role => ({ role, approver: role === 'BA' ? '陈璐' : '渠道运营', at: '2026-10-27T11:00:00+08:00', via: 'ui', actionId: 'ui-' + role.toLowerCase() })
    const approved = await update.execute({
      id: created.workitem.id,
      patch: {
        stage: 'design', status: 'executing', next: '进入设计',
        approvals: [{ gate: 'requirement', status: 'approved', signoffs: [ui('BA'), ui('requester')] }]
      }
    }, { signal })
    assert(approved.stage === 'design' && approved.approvals.some(a => a.gate === 'requirement' && a.status === 'approved'), 'requirement gate approval advances')
    let noUi = false
    try { await update.execute({ id: created.workitem.id, patch: { approvals: [{ gate: 'design', status: 'approved', signoffs: [{ role: 'BA', via: 'agent', actionId: 'agent-1' }] }] } }, { signal }) } catch { noUi = true }
    assert(noUi, 'agent signoff rejected')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('stage runtime prepares deliverables and advances on UI signoff', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dataops-stage-'))
  try {
    const scoped = createTools(normalizeConfig({ workitemsDir: dir }), {})
    const by = name => scoped.find(tool => tool.name === name)
    const ensure = by('dataops_shared_ensure_workitem')
    const stage = by('dataops_shared_stage')
    const created = await ensure.execute({ source: { system: 'edevops', id: 'US-3821' }, title: 'channel', initialStage: 'requirement', owner: '陈璐', requester: '渠道运营' }, { signal })
    const prepared = await stage.execute({ action: 'prepare', id: created.workitem.id, kind: 'requirement', stage: 'requirement', deliverable: 'deliverables/requirement/requirement.yaml', payload: { title: '需求', goal: '支付口径', status: 'draft' }, gaps: [] }, { signal })
    assert(prepared.kind === 'requirement' && prepared.prepared === true, 'stage prepare returns card payload')
    const item = await by('dataops_shared_read_workitem').execute({ id: created.workitem.id }, { signal })
    assert(item.deliverables.includes('deliverables/requirement/requirement.yaml'), 'stage prepare updates workitem')
    let blocked = false
    try { await stage.execute({ action: 'signoff', id: created.workitem.id, gate: 'design', role: 'BA', via: 'ui', actionId: 'ui-design', actor: '陈璐' }, { signal }) } catch { blocked = true }
    assert(blocked, 'cannot sign design before design gate exists')
    const ba = await stage.execute({ action: 'signoff', id: created.workitem.id, gate: 'requirement', role: 'BA', via: 'ui', actionId: 'ui-ba', actor: '陈璐' }, { signal })
    assert(ba.gateStatus === 'awaiting_signoff', 'requirement needs requester')
    const requester = await stage.execute({ action: 'signoff', id: created.workitem.id, gate: 'requirement', role: 'requester', via: 'ui', actionId: 'ui-req', actor: '渠道运营', comment: 'accept mock' }, { signal })
    assert(requester.gateStatus === 'approved' && requester.stage === 'design', 'requirement signoff advances to design')
    const after = await by('dataops_shared_read_workitem').execute({ id: created.workitem.id }, { signal })
    assert(after.stage === 'design' && after.stages.requirement.status === 'done', 'workitem stage advanced')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('stage 4 and stage 5 gates advance without DSH release approval', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dataops-stage45-'))
  try {
    const scoped = createTools(normalizeConfig({ workitemsDir: dir }), {})
    const by = name => scoped.find(tool => tool.name === name)
    const created = await by('dataops_shared_ensure_workitem').execute({ source: { system: 'edevops', id: 'US-3821' }, title: 'channel', initialStage: 'requirement', owner: '陈璐', requester: '渠道运营' }, { signal })
    const id = created.workitem.id
    await by('dataops_shared_update_workitem').execute({ id, patch: { stage: 'develop', approvals: [{ gate: 'scheme.tech_plan', status: 'approved', signoffs: [] }] } }, { signal })
    const materialized = await by('dataops_shared_read_develop').execute({ workitemId: id }, { signal })
    assert(materialized.materialized.length >= 10, 'develop artifact files missing')
    assert(existsSync(join(dir, id, 'deliverables', 'develop', 'sql', 'etl.sql')), 'develop sql not materialized')
    const dev = await by('dataops_shared_stage').execute({ action: 'prepare', id, kind: 'develop', stage: 'develop', deliverable: 'deliverables/develop/develop.yaml', payload: { target: 'dws.trade_channel_daily', artifacts: materialized.materialized, validation: materialized.validation } }, { signal })
    assert(dev.kind === 'develop' && dev.prepared === true, 'develop stage prepare')
    const devCard = await by('dataops_shared_read_stage').execute({ id, stage: 'develop' }, { signal })
    assert(devCard.kind === 'develop' && devCard.workitemId === id && devCard.artifacts.length >= 10, 'read stage returns develop card payload')
    const failed = await by('dataops_shared_read_develop').execute({ mode: 'build-failed' }, { signal })
    await by('dataops_shared_stage').execute({ action: 'prepare', id, kind: 'develop', stage: 'develop', deliverable: 'deliverables/develop/develop.yaml', payload: failed }, { signal })
    const se = await by('dataops_shared_stage').execute({ action: 'signoff', id, gate: 'develop.code_review', role: 'se', via: 'ui', actionId: 'ui-dev-se', actor: '王工' }, { signal })
    assert(se.gateStatus === 'approved' && se.stage === 'develop', 'SE review keeps stage in develop')
    let buildBlocked = false
    try {
      await by('dataops_shared_stage').execute({ action: 'signoff', id, gate: 'develop.merge', role: 'committer', via: 'ui', actionId: 'ui-dev-merge-failed', actor: '代码平台' }, { signal })
    } catch (error) { console.log('BUILD BLOCK ERROR:', error.message); buildBlocked = /build must pass/.test(error.message) }
    assert(buildBlocked, 'failed build blocks Committer merge')
    await by('dataops_shared_stage').execute({ action: 'prepare', id, kind: 'develop', stage: 'develop', deliverable: 'deliverables/develop/develop.yaml', payload: { ...materialized, validation: { ...materialized.validation } } }, { signal })
    const merge = await by('dataops_shared_stage').execute({ action: 'signoff', id, gate: 'develop.merge', role: 'committer', via: 'ui', actionId: 'ui-dev-merge', actor: '代码平台' }, { signal })
    assert(merge.gateStatus === 'approved' && merge.stage === 'cicd', 'committer merge advances to cicd')
    const cicd = await by('dataops_shared_stage').execute({ action: 'prepare', id, kind: 'cicd', stage: 'cicd', deliverable: 'deliverables/cicd/cicd.yaml', payload: { pipelineRunId: 'run-1', status: 'succeeded' } }, { signal })
    assert(cicd.kind === 'cicd', 'cicd stage prepare')
    const pipeline = await by('dataops_cicd_pipeline').execute({ workitemId: id }, { signal })
    assert(pipeline.workitem && pipeline.workitem.stages.cicd.status === 'done', 'pipeline completes stage 5')
    const pkgPath = join(dir, id, 'deliverables', 'cicd', pipeline.artifact.package)
    const manifestPath = join(dir, id, 'deliverables', 'cicd', pipeline.artifact.manifest)
    const checksumPath = join(dir, id, 'deliverables', 'cicd', pipeline.artifact.checksum)
    assert(existsSync(pkgPath) && existsSync(manifestPath) && existsSync(checksumPath), 'artifact package/manifest/checksum files missing')
    const packageBytes = readFileSync(pkgPath)
    const unpacked = gunzipSync(packageBytes)
    assert(unpacked.length > 1024, 'artifact package is not gzip/tar content')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert(manifest.files.length >= 6 && manifest.mock === true, 'artifact manifest files missing')
    assert(readFileSync(checksumPath, 'utf8').includes(manifest.files[0].sha256), 'checksums do not cover manifest files')
    assert(pipeline.workitem.stage === 'cicd' && pipeline.workitem.next.includes('Stage 5 完成'), 'stage 5 ends without stage 6')
    const final = await by('dataops_shared_read_workitem').execute({ id }, { signal })
    assert(final.stage === 'cicd' && final.stages.develop.status === 'done', 'workitem persisted through stage 5')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('develop and cicd fixtures expose artifacts and external environments', async () => {
  const scoped = createTools(normalizeConfig({}), {})
  const run = async (name, args) => scoped.find(tool => tool.name === name).execute(args, { signal })
  const develop = await run('dataops_shared_read_develop', {})
  assert(develop.kind === 'develop' && develop.artifacts.length >= 8, 'develop artifacts missing')
  assert(develop.validation.build.attempt === 2 && develop.validation.scan.blocking.length === 0, 'develop validation summary missing')
  assert(develop.review.se.status === 'approved' && develop.merge.status === 'pending', 'develop review/merge state missing')
  const cicd = await run('dataops_cicd_pipeline', {})
  assert(cicd.kind === 'cicd' && /dataops-.*\.tar\.gz$/.test(cicd.artifact.package), 'artifact package missing')
  assert(cicd.pipeline.build === 'passed' && cicd.pipeline.package === 'passed', 'pipeline stages missing')
  assert(cicd.externalDeployment.environments.map(e => e.name).join(',') === 'dev,sit,uat,beta,gamma', 'external environments missing')
  assert(!('release' in cicd) && !('approval' in cicd), 'cicd mock must not fake release approval')
})

check('read logs returns signals without root cause', async () => {
  const logs = await execute('dataops_shared_read_logs', { scenario: 'channel-report' })
  assert(logs.kind === 'logs' && logs.errorCodes.includes('TASK_TIMEOUT'), 'logs signal')
  assert(!('rootCause' in logs), 'logs must not pre-decide root cause')
  assert(Array.isArray(logs.events) && logs.events.length > 0, 'logs timeline')
})

check('missing ticket fields become gaps instead of invented values', () => {
  const ticket = normalizeTicket({ ticketId: 'T-1', name: '只有标题' }, 'T-1')
  const payload = requirementPayload(ticket, { source: 'devops' })
  assert(payload.partial === true, 'partial flag')
  assert(payload.gaps.some(item => item.id === 'G-ACCEPTANCE'), 'acceptance gap')
  assert(payload.gaps.some(item => item.id === 'G-IMPACT'), 'impact gap')
  assert(payload.acceptance.length === 0 && payload.impacts.length === 0, 'must not invent fields')
})

check('catalog normalization accepts platform aliases', () => {
  const table = normalizeTable({ tableName: 'dwd.x', ownerName: 'team', zone: 'dwd', fields: [{ name: 'a', type: 'string' }] }, 'dwd.x')
  assert(table.table === 'dwd.x' && table.owner === 'team' && table.layer === 'dwd', 'table aliases')
  assert(table.columns[0].name === 'a', 'column alias')
  const lineage = normalizeLineage({
    nodes: ['a', 'a', { table: 'b', type: 'table' }],
    edges: [{ from: 'a', to: 'b' }]
  }, { table: 'a', direction: 'down', depth: 1 })
  assert(lineage.nodes.length === 2, 'nodes must be deduped')
  assert(lineage.edges.length === 1, 'edges')
})

check('mock builders remain JSON-serializable', () => {
  const design = buildDesign({ scenario: 'member-model' })
  JSON.parse(JSON.stringify(design))
  assert(buildRequirement({}).kind === 'requirement', 'requirement builder')
  assert(buildTechPlan({}).kind === 'tech_plan', 'tech plan builder')
  assert(buildEvidence({}).kind === 'evidence', 'evidence builder')
  assert(SCENARIO_KEYS.length === 2, 'scenarios')
})

check('render emits a summary followed by the JSON payload', async () => {
  const payload = await execute('dataops_requirement_extract_spec', {})
  const blocks = byName('dataops_requirement_extract_spec').output.render({}, payload)
  assert(blocks.length === 2 && blocks[1].type === 'text', 'expected two text blocks')
  assert(JSON.parse(blocks[1].text).kind === 'requirement', 'last block must be the payload')
})

for (const [name, fn] of checks) {
  try {
    await fn()
    results.push(`ok   ${name}`)
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}
console.log(results.join('\n'))
