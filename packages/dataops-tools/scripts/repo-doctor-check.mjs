#!/usr/bin/env node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { detectRepository, scanRepository, validateRepository } from '../src/repo-doctor/index.js'
import { createRepoDoctorRoute } from '../src/repo-doctor/route.js'

const root = resolve(import.meta.dirname, '..', '..', '..')
const sample = join(root, 'samples', 'internal-code-repo')
const checks = []
const check = (name, fn) => checks.push([name, fn])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

check('sample repository is detected and indexed', () => {
  const detection = detectRepository(sample)
  assert(detection.detected && !detection.partial, 'sample should be detected')
  const scan = scanRepository(sample)
  assert(scan.kind === 'repo_scan' && scan.ok, 'scan kind')
  assert(scan.metrics.packages === 5 && scan.metrics.tasks === 4, 'sample metrics')
  assert(scan.tasks.some(task => task.name === 'channel_alert_trigger' && task.jobs.length === 2), 'task jobs')
  const validation = validateRepository(scan)
  assert(validation.kind === 'repo_validation', 'validation kind')
  assert(validation.findings.every(item => item.severity !== 'blocking'), 'sample should not be blocking')
})

check('empty directory is not a data repository', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-doctor-empty-'))
  try {
    const detection = detectRepository(temp)
    assert(!detection.detected && !detection.partial, 'empty directory detection')
    assert(detection.findings.some(item => item.code === 'REPO_NOT_DETECTED'), 'not-detected finding')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('partial repository is reported without pretending to be healthy', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-doctor-partial-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    writeFileSync(join(temp, '.dataops', 'manifest.yaml'), 'version: "1.2"\nstructure:\n  ref:\n    data-schedule:\n      lts: lts_code\n')
    const detection = detectRepository(temp)
    assert(!detection.detected && detection.partial, 'missing build should be partial')
    assert(detection.reasons.some(reason => reason.includes('build')), 'build reason')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('missing task parent is blocking', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-doctor-broken-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    mkdirSync(join(temp, 'lts_code', 'demo'), { recursive: true })
    writeFileSync(join(temp, '.dataops', 'manifest.yaml'), 'version: "1.2"\nstructure:\n  ref:\n    data-schedule:\n      lts: lts_code\n')
    writeFileSync(join(temp, '.dataops', 'build.yaml'), 'version: "1.2"\npackages:\n  - packageName: lts_demo\n    toolChain: data_schedule\n    serviceType: data_schedule_service\n    pipelineType: his_data_schedule\n    operationType: develop\n    files:\n      - path: lts_code/demo/*\n')
    writeFileSync(join(temp, 'lts_code', 'demo', 'task.yaml'), 'formatVersion: 2\ntasks:\n  - name: demo\n    type: 周期任务\n    cronExp: "0 0 2 * * ?"\n    isFullJob: "是"\n    owner: "<OWNER>"\n    taskParams: []\n    jobs:\n      - name: job_a\n        jobType: shell\n        parentJobName: ["missing"]\n')
    const scan = scanRepository(temp)
    const validation = validateRepository(scan)
    assert(validation.status === 'block', 'missing parent should block')
    assert(validation.findings.some(item => item.code === 'LTS_JOB_PARENT_MISSING'), 'parent finding')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('repo doctor route resolves the session workspace, never a request path', async () => {
  let route
  const ctx = {
    get(name) {
      if (name === 'connection') return { fetch: { register(definition) { route = definition.fetch; return () => {} } } }
      if (name === 'agents') return { get(sessionId) { return sessionId === 's1' ? { id: 's1' } : undefined } }
      if (name === 'workingDirectory') return { async ensure() { return sample } }
      return undefined
    }
  }
  createRepoDoctorRoute(ctx)
  assert(typeof route === 'function', 'route registered')
  const missing = await route(new Request('http://localhost/api/dataops/repo-doctor'))
  assert(missing.status === 400, 'session required')
  const response = await route(new Request('http://localhost/api/dataops/repo-doctor?sessionId=s1&mode=check'))
  assert(response.status === 200, 'route status')
  const body = await response.json()
  assert(body.ok && body.metrics.packages === 5, 'route body')
  assert(!new URL('http://localhost/api/dataops/repo-doctor?sessionId=s1&mode=check').searchParams.has('root'), 'no root request parameter')
})

const failures = []
for (const [name, fn] of checks) {
  try { await fn(); console.log('ok   ' + name) } catch (error) { failures.push([name, error]) }
}
if (failures.length) {
  for (const [name, error] of failures) console.error('FAIL ' + name + ': ' + error.message)
  process.exit(1)
}
console.log('repo doctor: PASS (' + checks.length + ' checks)')
