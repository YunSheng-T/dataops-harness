#!/usr/bin/env node
/**
 * Link the pinned upstream Harness skills into the user-level skill root.
 *
 * Source: deepseek-harness/.agents/skills (read-only pinned checkout)
 * Target: <agentsHome>/skills, where @deepseek-ai/dsh-skill-filesystem scans.
 *
 * The upstream checkout remains read-only; only symlinks are created.
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
const sourceRoot = join(root, 'deepseek-harness', '.agents', 'skills')
const targetRoot = join(agentsHome, 'skills')

if (!existsSync(sourceRoot)) {
  if (check) {
    console.log('harness skills: SKIP (upstream checkout not present)')
    process.exit(0)
  }
  console.log('harness skills: SKIP (upstream checkout not present)')
  process.exit(0)
}

const skills = readdirSync(sourceRoot, { withFileTypes: true })
  .filter(item => item.isDirectory() && existsSync(join(sourceRoot, item.name, 'SKILL.md')))
  .map(item => item.name)
  .sort()

function lstatSafe(path) {
  try { return lstatSync(path) } catch { return null }
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
    console.error('harness skills: FAIL')
    for (const failure of failures) console.error(' - ' + failure)
    process.exit(1)
  }
  console.log('harness skills ok: ' + targetRoot + ' (' + skills.length + ' skills)')
  process.exit(0)
}

mkdirSync(targetRoot, { recursive: true })
let installed = 0
let skipped = 0
for (const name of skills) {
  const source = join(sourceRoot, name)
  const target = join(targetRoot, name)
  const stat = lstatSafe(target)
  if (stat && !stat.isSymbolicLink()) { console.warn('skip existing non-symlink: ' + target); skipped++; continue }
  if (stat) unlinkSync(target)
  symlinkSync(source, target, 'dir')
  installed++
}
console.log('installed Harness skills: ' + installed + ' (' + skills.length + ' upstream, ' + skipped + ' skipped) at ' + targetRoot)
