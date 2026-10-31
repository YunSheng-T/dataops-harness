#!/usr/bin/env node
/** Validate the canonical internal code repo sample against A/B. */
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { indexRepository } from '../packages/dataops-tools/src/repo/index.js'
import { parseLtsTask, parseProperties } from '../packages/dataops-tools/src/lts.js'

const root = resolve(import.meta.dirname, '..', 'samples', 'internal-code-repo')
const expectedJobs = {
  channel_daily: 6,
  channel_alert: 2,
  order_daily: 3,
  channel_backfill: 2
}
const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }

const index = indexRepository({ root })
assert(index.findings.length === 0, 'index findings: ' + JSON.stringify(index.findings))
assert(index.packages.length === 5, 'expected 5 packages, got ' + index.packages.length)
for (const pkg of index.packages) {
  assert((pkg.missing || []).length === 0, pkg.packageName + ' missing files: ' + (pkg.missing || []).join(','))
  assert((pkg.unresolved || []).length === 0, pkg.packageName + ' unresolved files: ' + (pkg.unresolved || []).join(','))
}
for (const dir of readdirSync(join(root, 'lts_code'))) {
  const file = join(root, 'lts_code', dir, 'task.yaml')
  const params = join(root, 'lts_code', dir, 'parameters.properties')
  const model = parseLtsTask(readFileSync(file, 'utf8'), { parameters: parseProperties(readFileSync(params, 'utf8')) })
  assert(model.ok, dir + ' LTS errors: ' + JSON.stringify(model.findings.filter(item => item.severity === 'error')))
  assert(model.tasks.length === 1, dir + ' task count')
  assert(model.tasks[0].jobs.length === expectedJobs[dir], dir + ' job count: ' + model.tasks[0].jobs.length)
  assert(model.placeholders.length > 0, dir + ' placeholders')
}

if (failures.length) {
  console.error('internal code repo: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('internal code repo: PASS (5 packages, 4 LTS tasks)')
