#!/usr/bin/env node
/**
 * Verify a DataOps profile installation without contacting platforms.
 * usage: node scripts/check-install.mjs [--home <DSH_HOME>]
 */
import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const index = args.indexOf('--home')
const home = index >= 0 ? resolve(args[index + 1]) : (process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(homedir(), '.dsh'))
const profile = join(home, 'profiles', 'dataops')
const root = resolve(import.meta.dirname, '..')
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
const exists = path => existsSync(path)

for (const file of ['package.json', 'cordis.yml', 'cordis.patch.yml']) check(exists(join(profile, file)), 'profile missing ' + file)
for (const pkg of ['client', 'brand', 'tools', 'preset']) {
  const link = join(profile, 'node_modules', '@dataops', 'dsh-dataops-' + pkg)
  check(exists(link) || lstatSafe(link), 'missing local link ' + pkg)
}
check(exists(join(root, 'packages/dataops-client/lib/client.js')), 'client bundle missing; run build')
check(exists(join(root, 'packages/dataops-brand/lib/client.js')), 'brand bundle missing; run build')
check(exists(join(root, 'contracts/stage-contract.json')), 'stage contract missing')
check(exists(join(root, 'packages/dataops-client/src/stage-contract.generated.js')), 'generated client contract missing')
check(exists(join(root, 'packages/dataops-tools/src/stage-contract.generated.js')), 'generated host contract missing')
const agentsHome = process.env.DSH_AGENTS_HOME ? resolve(process.env.DSH_AGENTS_HOME) : join(homedir(), '.agents')
check(exists(join(agentsHome, 'skills', 'dataops-workflow', 'SKILL.md')), 'user-level DataOps skills missing; run install-dataops-skills')
const harnessSkills = spawnSync(process.execPath, [join(root, 'scripts', 'install-harness-skills.mjs'), '--check', '--agents-home', agentsHome], { stdio: 'pipe' })
if (harnessSkills.status !== 0) failures.push('user-level Harness skills missing; run install-harness-skills')
const patch = exists(join(profile, 'cordis.patch.yml')) ? readFileSync(join(profile, 'cordis.patch.yml'), 'utf8') : ''
check(!/dataops_cicd_release/.test(patch) || /disabledTools/.test(patch), 'legacy release is not explicitly disabled')

function lstatSafe(path) { try { return lstatSync(path) } catch { return null } }

if (failures.length) {
  console.error('dataops install: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('dataops install: PASS (' + profile + ')')
