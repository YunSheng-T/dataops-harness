#!/usr/bin/env node
/**
 * Archive one demo workitem so a repeated walkthrough starts clean.
 *
 * It never deletes data: the directory is moved under
 * workitems/.demo-archive/<timestamp>-<id>/. The US intake lookup ignores
 * dot-directories, so the same US can create a fresh workitem again.
 *
 * usage:
 *   node scripts/reset-dataops-demo.mjs --id 2026-10-27-workitem
 *   node scripts/reset-dataops-demo.mjs --id 2026-10-27-workitem --dry-run
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const id = flag('--id') || '2026-10-27-workitem'
const dryRun = args.includes('--dry-run')
if (!/^[A-Za-z0-9._-]+$/u.test(id) || id === '.' || id === '..') {
  console.error('invalid workitem id:', id)
  process.exit(2)
}
const source = resolve(root, 'workitems', id)
if (!existsSync(source)) {
  console.error('workitem not found:', id)
  process.exit(1)
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = resolve(root, 'workitems', '.demo-archive', stamp + '-' + id)
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, id, source, target }, null, 2))
  process.exit(0)
}
mkdirSync(resolve(root, 'workitems', '.demo-archive'), { recursive: true })
renameSync(source, target)
console.log(JSON.stringify({ archived: true, id, target }, null, 2))
console.log('Refresh the DataOps page and choose US-3821 again; existingWorkitem should be empty.')
