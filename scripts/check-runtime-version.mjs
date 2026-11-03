#!/usr/bin/env node
/**
 * Audit the DSH runtime version against the repository pin.
 *
 * The source of truth is upstream.json. The source checkout and plugin engines
 * must agree with it. The locally installed dsh may be an older compatible
 * runtime (rc.2/rc.3), but that mismatch must be visible, not silent.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname, '..')
const strict = process.argv.includes('--strict')
const upstream = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'))
const sourcePkg = JSON.parse(readFileSync(join(root, 'deepseek-harness', 'package.json'), 'utf8'))
const sourceSha = execFileSync('git', ['-C', join(root, 'deepseek-harness'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const req = createRequire(import.meta.url)
const failures = []
const warnings = []
const check = (ok, message) => { if (!ok) failures.push(message) }

check(sourcePkg.version === upstream.runtimeVersion, `source version ${sourcePkg.version} != pin ${upstream.runtimeVersion}`)
check(sourceSha === upstream.sourceCommit, `source commit ${sourceSha.slice(0, 12)} != pin ${upstream.sourceCommit.slice(0, 12)}`)

const packages = ['dataops-brand', 'dataops-bundle', 'dataops-client', 'dataops-dev', 'dataops-preset', 'dataops-tools']
for (const name of packages) {
  const path = join(root, 'packages', name, 'package.json')
  try {
    const pkg = req(path)
    const range = pkg.engines && pkg.engines.dsh
    check(typeof range === 'string' && range.includes('rc.2') && range.includes('0.3.0'), `${name}: unexpected engines.dsh ${range}`)
  } catch { /* package is optional */ }
}

let actual = null
try {
  actual = execFileSync(process.env.DSH_BIN || 'dsh', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(/\s+/).pop()
} catch { warnings.push('dsh not found on PATH') }
if (actual && actual !== upstream.runtimeVersion) {
  warnings.push(`installed dsh ${actual} != pinned ${upstream.runtimeVersion} (compatible range ${upstream.compatibleRuntimeRange})`)
}
if (actual && !actual.startsWith('0.2.1-rc.')) warnings.push(`installed dsh ${actual} is outside the tested 0.2.1-rc family`)

console.log(JSON.stringify({ pin: upstream.runtimeVersion, source: sourcePkg.version, sourceCommit: sourceSha, installedDsh: actual, failures, warnings }, null, 2))
if (failures.length) {
  console.error('runtime-version: FAIL')
  for (const item of failures) console.error(' - ' + item)
  process.exit(1)
}
if (strict && warnings.length) {
  console.error('runtime-version: STRICT FAIL')
  for (const item of warnings) console.error(' - ' + item)
  process.exit(1)
}
console.log('runtime-version: source pin OK' + (warnings.length ? ' (runtime warning)' : ''))
