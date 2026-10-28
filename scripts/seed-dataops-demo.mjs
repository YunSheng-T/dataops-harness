#!/usr/bin/env node
/**
 * Create a local, isolated Stage 0–5 demo workitem with mock artifacts.
 * It never touches the P1 sample workitem or any real system.
 *
 * usage:
 *   node scripts/seed-dataops-demo.mjs --stage develop
 *   node scripts/seed-dataops-demo.mjs --stage cicd
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { normalizeConfig } from '../packages/dataops-tools/src/config.js'
import { ensureWorkitem, readWorkitem, stageComplete, stagePrepare, stageSignoff } from '../packages/dataops-tools/src/workitem-store.js'
import { buildDevelopArtifacts } from '../packages/dataops-tools/src/develop-package.js'
import { buildPipelinePackage } from '../packages/dataops-tools/src/pipeline-package.js'
import { DEVELOP, DEVELOP_BUILD_FAILED } from '../packages/dataops-tools/src/fixtures/develop.js'
import { CICD_PIPELINE } from '../packages/dataops-tools/src/fixtures/cicd.js'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const targetStage = flag('--stage') || 'develop'
const mode = flag('--mode') || 'ok'
const id = flag('--id') || '2026-10-27-us-3821-demo'
const config = normalizeConfig({ workitemsDir: join(root, 'workitems') })
const dir = join(root, 'workitems', id)
if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

const source = { system: 'edevops', id: 'US-3821-DEMO', demo: true }
const created = ensureWorkitem(config, { id, source, title: '渠道日报支付口径（Stage 0–5 demo）', initialStage: 'requirement', owner: '陈璐', requester: '渠道运营', assets: ['dws.trade_channel_daily', 'dwd.orders', 'dim.channel'] })
const wid = created.workitem.id

async function prep(kind, stage, payload, deliverable, substage) {
  return stagePrepare(config, { id: wid, kind, stage, deliverable, payload, status: payload.status || 'draft', ...(substage ? { substage } : {}) })
}
async function sign(gate, role, actionId, actor) {
  return stageSignoff(config, { id: wid, gate, role, via: 'ui', actionId, actor })
}

await prep('requirement', 'requirement', {
  id: 'REQ-3821', title: '渠道日报支付口径', goal: '把 dws.trade_channel_daily 从下单口径改为支付成功口径，下游继承同一口径。',
  scope: 'dws.trade_channel_daily + ads.channel_report / rpt.funnel / api.channel_metrics',
  acceptance: ['自对账容差 0', '下游一致', '05:00 前产出'], owner: '交易组', requester: '渠道运营', priority: 'P1',
  impacts: ['table · dws.trade_channel_daily', 'report · rpt.funnel', 'api · api.channel_metrics'], gaps: [], evidence: [{ id: 'ev-req-001', query: 'select count(*) from dwd.orders', timeRange: '2026-10-26', env: 'mock-prod-ro', asOf: '2026-10-27T04:12:00+08:00' }]
}, 'deliverables/requirement/requirement.yaml')
await sign('requirement', 'BA', 'ui-demo-ba', '陈璐')
await sign('requirement', 'requester', 'ui-demo-req', '渠道运营')

await prep('design', 'design', {
  target: { table: 'dws.trade_channel_daily', grain: '渠道 × 日期', primaryKey: ['dt', 'channel_id'], partition: 'dt=${bizdate}' },
  sources: [{ table: 'dwd.orders', fields: ['order_id', 'channel_id', 'amount', 'status'] }, { table: 'dim.channel', fields: ['channel_id', 'channel_name'] }],
  steps: ['过滤支付成功订单', '按 dt + channel_id 聚合'], metrics: [{ name: 'order_cnt', definition: '支付成功订单数' }, { name: 'gmv', definition: '支付成功订单金额' }],
  schedule: { cron: '0 5 * * *', sla: '05:00' }, impact: { count: 3, top: [{ table: 'ads.channel_report' }, { table: 'rpt.funnel' }, { table: 'api.channel_metrics' }] }, gaps: []
}, 'deliverables/design/design.yaml')
await sign('design', 'BA', 'ui-demo-design', '陈璐')

await prep('analysis', 'scheme', {
  substage: 'analysis', status: 'passed', question: '支付口径与下单口径差多少', baseline: [], findings: [{ title: '支付时间缺失', severity: 'warning', detail: '按订单 dt 归属，跨日支付单列' }], conclusion: '可切口径，blockers 已在 mock 证据中关闭', gaps: []
}, 'deliverables/scheme/analysis.yaml', 'analysis')
await sign('scheme.analysis', 'BA', 'ui-demo-analysis', '陈璐')

await prep('solution', 'scheme', {
  substage: 'solution', target: '渠道日报支付口径', scope: 'dws + 下游报表/API', decisions: [{ decision: '口径改在 dws', reason: '一次生效，避免下游两套口径' }], alternatives: [{ option: '只在 ads 改', tradeoff: '影响面小但 API 仍是旧口径' }], gaps: []
}, 'deliverables/scheme/solution.yaml', 'solution')
await sign('scheme.solution', 'BA', 'ui-demo-solution', '陈璐')

await prep('tech_plan', 'scheme', {
  substage: 'tech_plan', target: 'dws.trade_channel_daily', tasks: [{ id: 'T1', name: 'ETL 支付过滤与聚合' }, { id: 'T2', name: '调度依赖' }], estimate: '2 人日', risks: ['支付时间缺失'], sla: '05:00', rollback: '保留旧 SQL；调度回滚到 v1', gaps: []
}, 'deliverables/scheme/tech-plan.yaml', 'tech_plan')
await sign('scheme.tech_plan', 'SE', 'ui-demo-tech', '王工')

const artifacts = buildDevelopArtifacts(join(root, 'workitems'), wid)
await prep('develop', 'develop', { ...(mode === 'build-failed' ? DEVELOP_BUILD_FAILED : DEVELOP), artifacts }, 'deliverables/develop/develop.yaml')
if (mode === 'build-failed' && targetStage === 'cicd') throw new Error('build-failed demo cannot be advanced to cicd; fix the build first')
if (targetStage === 'cicd') {
  await sign('develop.code_review', 'SE', 'ui-demo-dev-se', '王工')
  await sign('develop.merge', 'Committer', 'ui-demo-merge', '代码平台')
  await prep('cicd', 'cicd', { ...CICD_PIPELINE, status: 'queued' }, 'deliverables/cicd/cicd.yaml')
  const artifact = buildPipelinePackage(join(root, 'workitems'), wid, { target: 'dws.trade_channel_daily', commit: 'abc1234' })
  stageComplete(config, { id: wid })
  // Stage 5 card after package: write the final payload for the demo.
  const file = join(dir, 'deliverables', 'cicd', 'cicd.yaml')
  writeFileSync(file, JSON.stringify({ ...CICD_PIPELINE, artifact, status: 'succeeded' }, null, 2) + '\n')
} else if (mode !== 'build-failed') {
  await sign('develop.code_review', 'SE', 'ui-demo-dev-se', '王工')
}
const final = readWorkitem(config, { id: wid })
console.log(JSON.stringify({ id: wid, stage: final.stage, stages: final.stages, next: final.next, dir }, null, 2))
