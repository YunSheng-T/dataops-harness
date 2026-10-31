#!/usr/bin/env node
/**
 * One-command local acceptance gate. No network, no browser, no real platform.
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const node = process.execPath
const checks = [
  ['client check', 'packages/dataops-client/scripts/check.mjs'],
  ['client smoke', 'packages/dataops-client/scripts/smoke-apply.mjs'],
  ['tools check', 'packages/dataops-tools/scripts/check.mjs'],
  ['tools smoke', 'packages/dataops-tools/scripts/smoke-apply.mjs'],
  ['stage contract', 'scripts/check-stage-contract.mjs'],
  ['harness skills', 'scripts/install-harness-skills.mjs', '--check'],
  ['preset check', 'scripts/check-dataops-preset.mjs'],
  ['workitem check', 'scripts/check-dataops-workitem.mjs'],
  ['repo components', 'packages/dataops-tools/scripts/repo-check.mjs'],
  ['internal code repo', 'scripts/check-internal-code-repo.mjs'],
  ['provider config', 'scripts/check-provider-config.mjs', '--config', 'docs/ops/provider-config.example.json'],
  ['provider health', 'scripts/check-dataops-health.mjs'],
  ['offline surface', 'scripts/check-offline-surface.mjs'],
  ['stage0-5 contract', 'scripts/e2e/dataops-stage0-5-contract.mjs']
]
const failures = []
for (const [label, script, ...args] of checks) {
  process.stdout.write('▶ ' + label + ' ... ')
  try {
    execFileSync(node, [resolve(root, script), ...args], { cwd: root, stdio: 'pipe' })
    console.log('PASS')
  } catch (error) {
    console.log('FAIL')
    failures.push({ label, output: (error.stdout || '') + (error.stderr || '') })
  }
}
if (failures.length) {
  console.error('\nlocal verification: FAIL (' + failures.length + ')')
  for (const failure of failures) {
    console.error('\n--- ' + failure.label + ' ---\n' + String(failure.output).slice(-3000))
  }
  process.exit(1)
}
console.log('\nlocal verification: PASS (' + checks.length + ' checks)')
