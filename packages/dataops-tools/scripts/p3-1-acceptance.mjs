#!/usr/bin/env node
// Headless P3.1 acceptance: requirement -> design revisions -> gate invalidation.
import { createTools } from '../src/index.js'
import { normalizeConfig } from '../src/config.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const workitemsDir = mkdtempSync(join(tmpdir(), 'dataops-p31-acceptance-'))
const signal = new AbortController().signal
const tools = createTools(normalizeConfig({ workitemsDir }), {})
const run = (name, args) => tools.find(tool => tool.name === name).execute(args, { signal })
const assert = (condition, message) => { if (!condition) throw new Error(message) }

try {
  const created = await run('dataops_shared_ensure_workitem', { source: { system: 'edevops', id: 'US-P31' }, title: 'P3.1 acceptance', initialStage: 'requirement' })
  const id = created.workitem.id

  await run('dataops_shared_stage', { action: 'prepare', id, kind: 'requirement', stage: 'requirement', deliverable: 'deliverables/requirement/requirement.yaml', payload: { title: '渠道日报口径调整', goal: '支付成功口径替换全部订单口径', scope: '渠道日报 + 3 个下游', acceptance: ['GMV 差异 < 0.5%'] } })
  await run('dataops_shared_stage', { action: 'signoff', id, gate: 'requirement', role: 'ba', via: 'ui', actionId: 'ui-p31-ba', actor: '陈璐' })
  await run('dataops_shared_stage', { action: 'signoff', id, gate: 'requirement', role: 'requester', via: 'ui', actionId: 'ui-p31-req', actor: '渠道运营' })

  const designPayload = { target: { table: 'dws.trade_channel_daily', grain: '渠道 × 支付日期', primaryKey: ['channel_id', 'dt'], partition: 'dt' }, sources: [{ table: 'dwd.orders' }, { table: 'dim.channel' }], metrics: [{ name: 'gmv', definition: '支付成功 GMV' }], goal: '支付成功口径' }
  await run('dataops_shared_stage', { action: 'prepare', id, kind: 'design', stage: 'design', deliverable: 'deliverables/design/design.yaml', payload: designPayload })
  const design = await run('dataops_shared_read_workitem', { id })
  assert(design.artifacts.some(item => item.artifactId === 'design'), 'design artifact missing')
  assert(design.currentIteration.artifactId === 'design' && design.currentIteration.revisionId === 'rev-0001', 'design current iteration')
  assert(design.artifacts.find(item => item.artifactId === 'design').currentRevision.status === 'draft', 'design starts draft')

  await run('dataops_shared_stage', { action: 'signoff', id, gate: 'design', role: 'ba', via: 'ui', actionId: 'ui-p31-design-ba', actor: '陈璐' })
  const approved = await run('dataops_shared_read_workitem', { id })
  assert(approved.artifacts.find(item => item.artifactId === 'design').currentRevision.status === 'approved', 'design revision approved')
  assert(approved.approvals.find(item => item.gate === 'design').revisionId === 'rev-0001', 'design gate bound')

  await run('dataops_shared_stage', { action: 'prepare', id, kind: 'design', stage: 'design', deliverable: 'deliverables/design/design.yaml', payload: { ...designPayload, goal: '支付成功口径 v2' } })
  const revised = await run('dataops_shared_read_workitem', { id })
  const artifact = revised.artifacts.find(item => item.artifactId === 'design')
  assert(revised.currentIteration.revisionId === 'rev-0002', 'design revision advanced')
  assert(revised.approvals.find(item => item.gate === 'design').status === 'pending', 'design approval invalidated')
  assert(artifact.revisions.length === 2 && artifact.revisions[0].content.goal === '支付成功口径', 'revision content available for diff')

  console.log('P3.1 acceptance: PASS')
  console.log('workitem: ' + id)
  console.log('design: rev-0001 approved -> rev-0002 draft / gate pending')
  console.log('artifacts: ' + revised.artifacts.map(item => item.artifactId + ' v' + item.currentRevision.version + ' ' + item.currentRevision.status).join(', '))
} finally {
  rmSync(workitemsDir, { recursive: true, force: true })
}
