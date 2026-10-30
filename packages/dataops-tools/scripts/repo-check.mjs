#!/usr/bin/env node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { indexRepository, parseBuildConfig, parseManifest, resolveManifestExpression } from '../src/repo/index.js'
import { parseLtsTask, parseProperties } from '../src/lts.js'

const root = resolve(import.meta.dirname, '..')
const fixtures = join(root, 'test', 'fixtures')
const checks = []
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const check = (name, fn) => checks.push([name, fn])
const read = path => readFileSync(join(fixtures, path), 'utf8')

check('manifest locates platform roots without a group model', () => {
  const manifest = parseManifest(read('repo/manifest.yaml'))
  assert(manifest.platforms.some(p => p.id === 'data-schedule.lts' && p.path === 'lts_code'), 'lts platform')
  assert(manifest.platforms.some(p => p.id === 'etl.flashsync' && p.path === 'default/ETL/FlashSync'), 'etl platform')
  assert(resolveManifestExpression('${structure.ref.data-schedule.lts}/demo/*', manifest) === 'lts_code/demo/*', 'manifest expression')
})

check('build.yaml packages are parsed with files and operation type', () => {
  const build = parseBuildConfig(read('repo/build.yaml'))
  assert(build.packages.length >= 4, 'packages')
  assert(build.packages.some(p => p.packageName === 'lts_demo_01' && p.toolChain === 'data_schedule' && p.files.length >= 1), 'lts package')
  assert(!build.findings.some(f => f.code === 'PACKAGE_DUPLICATE'), 'no duplicate findings')
})

check('repository index expands manifest expressions and globs', () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-repo-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    mkdirSync(join(temp, 'schedule', 'demo'), { recursive: true })
    writeFileSync(join(temp, 'schedule', 'demo', 'task.yaml'), read('lts/task.yaml'))
    writeFileSync(join(temp, '.dataops', 'manifest.yaml'), 'version: "1.2"\nstructure:\n  ref:\n    data-schedule:\n      lts: schedule\n')
    writeFileSync(join(temp, '.dataops', 'build.yaml'), 'version: "1.2"\npackages:\n  - packageName: lts_demo\n    toolChain: data_schedule\n    serviceType: data_schedule_service\n    pipelineType: his_data_schedule\n    operationType: develop\n    files:\n      - path: "${structure.ref.data-schedule.lts}/demo/*"\n')
    const indexed = indexRepository({ root: temp })
    assert(indexed.packages[0].files.includes('schedule/demo/task.yaml'), 'resolved file')
    assert(indexed.packages[0].platform === 'data-schedule.lts', 'platform mapping')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('LTS source parses tasks, jobs, placeholders and parameters', () => {
  const properties = parseProperties(read('lts/parameters.properties'))
  const model = parseLtsTask(read('lts/task.yaml'), { parameters: properties })
  assert(model.ok, 'LTS should parse without errors')
  assert(model.tasks.length === 1 && model.tasks[0].jobs.length === 2, 'task/job count')
  assert(model.tasks[0].jobs[0].jobType === 'url' && model.tasks[0].jobs[0].jobCallMethod === 'GET', 'url job')
  assert(model.placeholders.includes('JOB_1_URL') && model.placeholders.includes('JOB_2_URL'), 'placeholders')
  assert(!model.findings.some(f => f.severity === 'error'), 'no LTS errors')
})

check('LTS source rejects missing parents and missing placeholder declarations', () => {
  const source = read('lts/task.yaml').replace('parentJobName: ["job_1"]', 'parentJobName: ["missing_job"]')
  const model = parseLtsTask(source, { parameters: parseProperties(read('lts/parameters.properties')) })
  assert(model.findings.some(f => f.code === 'LTS_JOB_PARENT_MISSING'), 'missing parent')
  const missing = parseLtsTask(read('lts/task.yaml'), { parameters: {} })
  assert(missing.findings.some(f => f.code === 'LTS_PLACEHOLDER'), 'missing placeholder declaration')
})

let failed = 0
for (const [name, fn] of checks) {
  try { fn(); console.log('ok   ' + name) } catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message) }
}
if (failed) process.exit(1)
console.log('repo components: PASS (' + checks.length + ' checks)')
