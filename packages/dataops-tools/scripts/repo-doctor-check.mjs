#!/usr/bin/env node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

check('P1 guards find placeholder gaps without turning them into blocking', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-p1-placeholder-'))
  try {
    cpSync(sample, temp, { recursive: true })
    rmSync(join(temp, 'lts_code', 'channel_daily', 'parameters.properties'))
    writeFileSync(join(temp, 'code', 'sql', 'unknown.sql'), 'select * from t where dt = $$MISSING$$;\n')
    const validation = validateRepository(scanRepository(temp))
    assert(validation.status === 'warn', 'placeholder gaps must be warnings')
    assert(validation.findings.some(item => item.code === 'PLACEHOLDER_FILE_MISSING'), 'missing properties file')
    assert(validation.findings.some(item => item.code === 'PLACEHOLDER_ARTIFACT_UNDECLARED'), 'undeclared artifact placeholder')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('P1 guards find duplicate task names and group path mismatch', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-p1-lts-'))
  try {
    cpSync(sample, temp, { recursive: true })
    const daily = join(temp, 'lts_code', 'channel_daily', 'task.yaml')
    const changed = readFileSync(daily, 'utf8')
      .replace('name: "channel_daily_mixed"', 'name: "channel_backfill"')
      .replace('path: "G_1006|calc_sql"', 'path: "BAD_GROUP|calc_sql"')
    writeFileSync(daily, changed)
    const validation = validateRepository(scanRepository(temp))
    assert(validation.status === 'block', 'LTS guard should block structural errors')
    assert(validation.findings.some(item => item.code === 'LTS_TASK_DUPLICATE'), 'duplicate task')
    assert(validation.findings.some(item => item.code === 'LTS_PATH_GROUP_MISMATCH'), 'group path')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('P1 guards report empty declared properties', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-p1-empty-'))
  try {
    cpSync(sample, temp, { recursive: true })
    const props = join(temp, 'lts_code', 'channel_daily', 'parameters.properties')
    const changed = readFileSync(props, 'utf8').replace('DB_EXEC = <DB_EXEC>', 'DB_EXEC =')
    writeFileSync(props, changed)
    const validation = validateRepository(scanRepository(temp))
    assert(validation.findings.some(item => item.code === 'PLACEHOLDER_VALUE_EMPTY'), 'empty property')
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
