#!/usr/bin/env node
/**
 * Deterministic Stage 0–5 contract e2e (no browser, no model).
 * Proves workitem gates, multi-artifact Stage 4 and Stage 5 package.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTools } from '../../packages/dataops-tools/src/index.js'
import { normalizeConfig } from '../../packages/dataops-tools/src/config.js'

const dir = mkdtempSync(join(tmpdir(), 'dataops-stage05-'))
const config = normalizeConfig({ workitemsDir: dir })
const tools = createTools(config, {})
const by = name => tools.find(tool => tool.name === name)
const call = (name, args) => by(name).execute(args, { signal: new AbortController().signal })
const ok = []
const check = (condition, label) => { if (!condition) throw new Error('stage0-5: ' + label); ok.push(label) }

try {
  const created = await call('dataops_shared_ensure_workitem', { id: '2026-10-27-us-3821-contract', source: { system: 'edevops', id: 'US-3821-CONTRACT' }, title: '渠道日报支付口径 contract', initialStage: 'requirement', owner: '陈璐', requester: '渠道运营' })
  const id = created.workitem.id
  const stage = (action, args) => call('dataops_shared_stage', { action, id, ...args })
  const sign = async (gate, role, actionId, actor) => {
    const result = await stage('signoff', { gate, role, via: 'ui', actionId, actor })
    return result
  }
  await stage('prepare', { kind: 'requirement', stage: 'requirement', deliverable: 'deliverables/requirement/requirement.yaml', payload: { title: '需求', goal: '支付口径', acceptance: ['对账 0'], owner: '交易组', gaps: [] }, status: 'draft' })
  await sign('requirement', 'BA', 'ui-c-ba', '陈璐')
  const req = await sign('requirement', 'requester', 'ui-c-req', '渠道运营')
  check(req.stage === 'design', 'requirement advances to design')

  await stage('prepare', { kind: 'design', stage: 'design', deliverable: 'deliverables/design/design.yaml', payload: { target: { table: 'dws.trade_channel_daily', grain: '渠道 × 日' }, sources: [{ table: 'dwd.orders' }], metrics: [{ name: 'gmv' }], schedule: { sla: '05:00' }, gaps: [] } })
  await sign('design', 'BA', 'ui-c-design', '陈璐')

  await stage('prepare', { kind: 'analysis', stage: 'scheme', substage: 'analysis', deliverable: 'deliverables/scheme/analysis.yaml', payload: { status: 'passed', question: '支付口径', findings: [], gaps: [] } })
  await sign('scheme.analysis', 'BA', 'ui-c-analysis', '陈璐')
  await stage('prepare', { kind: 'solution', stage: 'scheme', substage: 'solution', deliverable: 'deliverables/scheme/solution.yaml', payload: { target: '支付口径', decisions: [], gaps: [] } })
  await sign('scheme.solution', 'BA', 'ui-c-solution', '陈璐')
  await stage('prepare', { kind: 'tech_plan', stage: 'scheme', substage: 'tech_plan', deliverable: 'deliverables/scheme/tech-plan.yaml', payload: { target: 'dws.trade_channel_daily', tasks: [], risks: [], rollback: '旧 SQL', gaps: [] } })
  const se = await sign('scheme.tech_plan', 'SE', 'ui-c-tech', '王工')
  check(se.stage === 'develop', '3c advances to develop')

  const dev = await call('dataops_shared_read_develop', { workitemId: id })
  check(dev.materialized.length >= 10 && existsSync(join(dir, id, 'deliverables/develop/sql/etl.sql')), 'stage 4 materializes multi artifacts')
  await stage('prepare', { kind: 'develop', stage: 'develop', deliverable: 'deliverables/develop/develop.yaml', payload: { ...dev } })
  const seReview = await sign('develop.code_review', 'SE', 'ui-c-dev-se', '王工')
  check(seReview.stage === 'develop', 'SE review keeps stage in develop')
  const merge = await sign('develop.merge', 'Committer', 'ui-c-merge', '代码平台')
  check(merge.stage === 'cicd', 'committer merge advances to cicd')

  await stage('prepare', { kind: 'cicd', stage: 'cicd', deliverable: 'deliverables/cicd/cicd.yaml', payload: { status: 'queued' } })
  const pipeline = await call('dataops_cicd_pipeline', { workitemId: id })
  check(pipeline.workitem.stages.cicd.status === 'done', 'stage 5 completes after pipeline')
  check(existsSync(join(dir, id, 'deliverables/cicd', pipeline.artifact.package)), 'artifact package exists')
  check(readFileSync(join(dir, id, 'deliverables/cicd', pipeline.artifact.manifest), 'utf8').includes('"mock": true'), 'manifest marked mock')
  const final = await call('dataops_shared_read_workitem', { id })
  check(final.stage === 'cicd' && final.next.includes('Stage 5 完成'), 'stops at stage 5, no stage 6')
  check(!JSON.stringify(final).includes('gate: release'), 'no DSH release gate')
  console.log(JSON.stringify({ ok, workitem: id, stage: final.stage, checks: ok.length }, null, 2))
  console.log('stage0-5 contract: PASS')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
