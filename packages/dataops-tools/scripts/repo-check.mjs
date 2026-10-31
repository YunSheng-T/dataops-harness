#!/usr/bin/env node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { indexRepository, parseBuildConfig, parseManifest, resolveManifestExpression } from '../src/repo/index.js'
import { parseLtsTask, parseProperties } from '../src/lts.js'
import { createBuildAdapter } from '../src/repo/build.js'
import { createDeployAdapter } from '../src/repo/deploy.js'
import { createRepoRoute } from '../src/repo/route.js'

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

check('BuildAdapter invokes build run with array args and verifies artifact', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-build-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    mkdirSync(join(temp, 'output'), { recursive: true })
    writeFileSync(join(temp, '.dataops', 'build.yaml'), 'version: "1.2"\npackages:\n  - packageName: lts_demo\n    toolChain: data_schedule\n    serviceType: data_schedule_service\n    pipelineType: his_data_schedule\n    operationType: develop\n    files:\n      - path: lts_code/demo/*\n')
    let captured = null
    const adapter = createBuildAdapter({ root: temp, enterpriseId: 'ENT', projectId: 'PROJ', execFileImpl: (command, args, options, done) => {
      captured = { command, args, options }
      writeFileSync(join(temp, 'output', 'lts_demo.zip'), 'zip')
      writeFileSync(join(temp, 'output', 'buildInfo.properties'), 'buildVersion=1\n')
      done(null, 'built', '')
    } })
    const result = await adapter.run({ packageName: 'lts_demo' })
    assert(result.ok && result.artifact.endsWith('output/lts_demo.zip'), 'build artifact result')
    assert(captured.command === 'dataops' && captured.args.includes('build') && captured.args.includes('run'), 'build command')
    assert(captured.args.includes('--enterprise-id') && captured.args.includes('ENT'), 'build enterprise arg')
    assert(captured.options.cwd === temp && !captured.args.some(arg => /\s/u.test(arg)), 'no shell args')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('DeployAdapter invokes execute for sit without approval-id', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-deploy-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    mkdirSync(join(temp, 'output'), { recursive: true })
    writeFileSync(join(temp, 'output', 'lts_demo.zip'), 'zip')
    let captured = null
    const adapter = createDeployAdapter({ root: temp, enterpriseId: 'ENT', projectId: 'PROJ', execFileImpl: (command, args, options, done) => {
      captured = { command, args, options }
      done(null, 'deployed', '')
    } })
    const result = await adapter.run({ packageName: 'lts_demo' })
    assert(result.ok && result.targetEnv === 'sit', 'deploy result')
    assert(captured.args.includes('execute') && captured.args.includes('sit'), 'deploy target')
    assert(captured.args.includes('--mode') && captured.args.includes('execute'), 'explicit execute')
    assert(!captured.args.includes('--approval-id') && !captured.args.includes('--dry-run'), 'no approval/dryrun')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('BuildAdapter fails closed on missing package and missing artifact', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-build-fail-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    writeFileSync(join(temp, '.dataops', 'build.yaml'), 'version: "1.2"\npackages:\n  - packageName: lts_demo\n    toolChain: data_schedule\n    serviceType: data_schedule_service\n    pipelineType: his_data_schedule\n    operationType: develop\n    files:\n      - path: lts_code/demo/*\n')
    const adapter = createBuildAdapter({ root: temp, enterpriseId: 'ENT', projectId: 'PROJ', execFileImpl: (_c, _a, _o, done) => done(null, '', '') })
    let missing = false
    try { await adapter.run({ packageName: 'not_declared' }) } catch { missing = true }
    assert(missing, 'missing package rejected')
    const result = await adapter.run({ packageName: 'lts_demo' })
    assert(result.ok === false && result.errors.some(e => e.includes('not found')), 'missing artifact fail closed')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('DeployAdapter rejects a missing artifact before spawning', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-deploy-fail-'))
  try {
    let spawned = false
    const adapter = createDeployAdapter({ root: temp, enterpriseId: 'ENT', projectId: 'PROJ', execFileImpl: (_c, _a, _o, done) => { spawned = true; done(null, '', '') } })
    let rejected = false
    try { await adapter.run({ packageName: 'missing' }) } catch { rejected = true }
    assert(rejected && !spawned, 'missing artifact rejected before spawn')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

check('repo route returns packages and LTS findings without browser path input', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'dataops-route-'))
  try {
    mkdirSync(join(temp, '.dataops'), { recursive: true })
    mkdirSync(join(temp, 'schedule', 'demo'), { recursive: true })
    writeFileSync(join(temp, 'schedule', 'demo', 'task.yaml'), read('lts/task.yaml'))
    writeFileSync(join(temp, 'schedule', 'demo', 'parameters.properties'), read('lts/parameters.properties'))
    writeFileSync(join(temp, '.dataops', 'manifest.yaml'), 'version: "1.2"\nstructure:\n  ref:\n    data-schedule:\n      lts: schedule\n')
    writeFileSync(join(temp, '.dataops', 'build.yaml'), 'version: "1.2"\npackages:\n  - packageName: lts_demo\n    toolChain: data_schedule\n    serviceType: data_schedule_service\n    pipelineType: his_data_schedule\n    operationType: develop\n    files:\n      - path: schedule/demo/*\n')
    const route = createRepoRoute({ repoRoot: temp })
    const response = await route(new Request('http://localhost/api/dataops/repo'))
    assert(response.status === 200, 'route status')
    const body = await response.json()
    assert(body.ok && body.packages.length === 1 && body.packages[0].files.includes('schedule/demo/task.yaml'), 'route package')
    assert(body.packages[0].lts.length === 1 && body.packages[0].lts[0].ok, 'route lts')
    assert(!JSON.stringify(body).includes('formatVersion'), 'route does not expose source content')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

let failed = 0
for (const [name, fn] of checks) {
  try { await fn(); console.log('ok   ' + name) } catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message) }
}
if (failed) process.exit(1)
console.log('repo components: PASS (' + checks.length + ' checks)')
