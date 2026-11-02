#!/usr/bin/env node
// Headless end-to-end mock flow: requirement -> design -> scheme -> develop -> cicd.
import { createTools } from '../src/index.js'
import { normalizeConfig } from '../src/config.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'dataops-e2e-'))
const signal = new AbortController().signal
const tools = createTools(normalizeConfig({ workitemsDir: dir }), {})
const run = (name, args) => tools.find(tool => tool.name === name).execute(args, { signal })
const assert = (condition, message) => { if (!condition) throw new Error(message) }

try {
  const created = await run('dataops_shared_ensure_workitem', { source: { system: 'edevops', id: 'E2E-1' }, title: '端到端 mock 验收', initialStage: 'requirement' })
  const id = created.workitem.id
  const stage = (args) => run('dataops_shared_stage', Object.assign({ action: 'prepare', id }, args))
  const sign = (gate, role, actionId) => run('dataops_shared_stage', { action: 'signoff', id, gate, role, via: 'ui', actionId, actor: role })

  await stage({ kind: 'requirement', stage: 'requirement', deliverable: 'deliverables/requirement.yaml', payload: { title: '支付口径日报', goal: '验证端到端', scope: 'mock', acceptance: ['链路可回放'] } })
  await sign('requirement', 'ba', 'ui-e2e-req-ba')
  await sign('requirement', 'requester', 'ui-e2e-req-user')

  await stage({ kind: 'design', stage: 'design', deliverable: 'deliverables/design.yaml', payload: { target: { table: 'dws.trade_channel_daily', grain: '渠道 × 日期' }, sources: [{ table: 'dwd.orders' }] } })
  await sign('design', 'ba', 'ui-e2e-design-ba')

  await stage({ kind: 'analysis', stage: 'scheme', substage: 'analysis', deliverable: 'deliverables/analysis.yaml', payload: { question: '候选方案', findings: [] } })
  await sign('scheme.analysis', 'ba', 'ui-e2e-analysis-ba')

  await stage({ kind: 'solution', stage: 'scheme', substage: 'solution', deliverable: 'deliverables/solution.yaml', payload: { summary: '方案', options: [] } })
  await sign('scheme.solution', 'ba', 'ui-e2e-solution-ba')

  await stage({ kind: 'tech_plan', stage: 'scheme', substage: 'tech_plan', deliverable: 'deliverables/tech-plan.yaml', payload: { target: 'dws.trade_channel_daily', tasks: [{ name: 'etl', platform: 'ETL' }] } })
  await sign('scheme.tech_plan', 'se', 'ui-e2e-tech-se')

  await stage({ kind: 'develop', stage: 'develop', deliverable: 'deliverables/develop.yaml', payload: { target: 'dws.trade_channel_daily', artifacts: [], validation: { build: { status: 'passed' }, scan: { status: 'passed', blocking: [] } } } })
  await sign('develop.code_review', 'se', 'ui-e2e-dev-se')
  await sign('develop.merge', 'committer', 'ui-e2e-dev-merge')

  await stage({ kind: 'cicd', stage: 'cicd', deliverable: 'deliverables/cicd.yaml', payload: { pipelineRunId: 'e2e-run', status: 'succeeded' } })
  const pipeline = await run('dataops_cicd_pipeline', { workitemId: id })
  const final = await run('dataops_shared_read_workitem', { id })
  assert(pipeline.workitem && pipeline.workitem.stage === 'cicd' && final.stages.cicd.status === 'done', 'stage 5 not complete')
  assert(final.artifacts.length >= 7, 'artifact ledger missing stages')
  assert(final.currentIteration && final.currentIteration.artifactId === 'cicd', 'current iteration not cicd')
  console.log('E2E mock: PASS')
  console.log('workitem: ' + id + ' | stage=' + final.stage + ' | artifacts=' + final.artifacts.length)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
