// Wiring smoke for the host tool plugin: a fake ctx records registrations and
// executes every tool the way the registry would hand it args.
import { apply, TOOLS } from '../src/index.js'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LEGACY_CONTENT_TOOL_NAMES } from '../src/tool-registry.js'

const registered = []
const temp = mkdtempSync(join(tmpdir(), 'dataops-smoke-'))
mkdirSync(join(temp, 'smoke-item'), { recursive: true })
writeFileSync(join(temp, 'smoke-item', 'item.yaml'), 'id: smoke-item\ntitle: smoke\ntype: delivery\nstatus: planning\nstage: requirement\nstages: {}\ndeliverables: []\nevidence: []\ngaps: []\napprovals: []\nnext: smoke\n', 'utf8')
const ctx = { tools: { register: tool => { registered.push(tool) } } }
apply(ctx, { disabledTools: LEGACY_CONTENT_TOOL_NAMES, workitemsDir: temp })

const failures = []
const expect = (condition, message) => { if (!condition) failures.push(message) }

expect(registered.length === 16, 'expected 16 active tool registrations, got ' + registered.length)
expect(registered.every(tool => TOOLS.some(base => base.name === tool.name)), 'registered tool missing from base fixtures')

const ARGS = {
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
  dataops_shared_read_workitem: { id: 'smoke-item' },
  dataops_shared_update_workitem: { id: 'smoke-item', patch: { next: 'dryRun smoke' }, dryRun: true },
  dataops_shared_read_logs: { scenario: 'channel-report' },
  dataops_shared_read_us: {},
  dataops_shared_read_datamap: { usId: 'US-3821' },
  dataops_shared_ensure_workitem: { source: { system: 'edevops', id: 'US-SMOKE' }, title: 'smoke', initialStage: 'requirement' },
  dataops_shared_stage: { action: 'status', id: 'smoke-item' }
}

for (const tool of registered) {
  const payload = await tool.execute(ARGS[tool.name] || {}, { signal: new AbortController().signal })
  expect(payload && typeof payload.kind === 'string', tool.name + ': payload has no kind')
  const blocks = tool.output.render({}, payload)
  expect(Array.isArray(blocks) && blocks.length === 2, tool.name + ': render should return summary + JSON')
  expect(JSON.parse(blocks[1].text).kind === payload.kind, tool.name + ': JSON block is not the payload')
}

const aborted = new AbortController()
aborted.abort()
let rejected = false
try {
  await registered[0].execute({}, { signal: aborted.signal })
} catch {
  rejected = true
}
expect(rejected, 'aborted execution should reject')

rmSync(temp, { recursive: true, force: true })
if (failures.length) {
  console.error('smoke-apply FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('smoke-apply ok: ' + registered.map(tool => tool.name).join(' · '))
