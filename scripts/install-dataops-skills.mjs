#!/usr/bin/env node
/**
 * Link the repository's DataOps skills into the user-level skill root.
 *
 * `@deepseek-ai/dsh-skill-filesystem` scans `<agentsHome>/skills` by default,
 * so a new workspace no longer needs its own `.agents/skills` copy. The
 * repository remains the source of truth; links are refreshed on every run.
 *
 * usage:
 *   node scripts/install-dataops-skills.mjs [--agents-home <dir>] [--check]
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const check = args.includes('--check')
const homeFlag = args.indexOf('--agents-home')
const agentsHome = homeFlag >= 0
  ? resolve(args[homeFlag + 1])
  : (process.env.DSH_AGENTS_HOME ? resolve(process.env.DSH_AGENTS_HOME) : join(homedir(), '.agents'))
const sourceRoot = join(root, '.agents', 'skills')
const targetRoot = join(agentsHome, 'skills')

function lstatSafe(path) {
  try { return lstatSync(path) } catch { return null }
}

const skills = readdirSync(sourceRoot, { withFileTypes: true })
  .filter(item => item.isDirectory() && existsSync(join(sourceRoot, item.name, 'SKILL.md')))
  .map(item => item.name)
  .sort()

if (!skills.length) {
  console.error('dataops skills: no SKILL.md under ' + sourceRoot)
  process.exit(1)
}

if (check) {
  const failures = []
  for (const name of skills) {
    const target = join(targetRoot, name)
    const stat = lstatSafe(target)
    if (!stat) failures.push('missing link ' + name)
    else if (!stat.isSymbolicLink()) failures.push('not a symlink ' + name)
    else if (resolve(targetRoot, readlinkSync(target)) !== join(sourceRoot, name)) failures.push('stale link ' + name)
  }
  if (failures.length) {
    console.error('dataops skills: FAIL')
    for (const failure of failures) console.error(' - ' + failure)
    process.exit(1)
  }
  console.log('dataops skills ok: ' + targetRoot)
  process.exit(0)
}

mkdirSync(targetRoot, { recursive: true })
let installed = 0
for (const name of skills) {
  const source = join(sourceRoot, name)
  const target = join(targetRoot, name)
  const stat = lstatSafe(target)
  if (stat && !stat.isSymbolicLink()) {
    console.warn('skip existing non-symlink: ' + target)
    continue
  }
  if (stat) unlinkSync(target)
  symlinkSync(source, target, 'dir')
  installed++
}
console.log('installed DataOps skills: ' + installed + ' at ' + targetRoot)
console.log('source: ' + sourceRoot)
