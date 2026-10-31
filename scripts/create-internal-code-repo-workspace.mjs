#!/usr/bin/env node
/**
 * Materialize the sanitized internal-code-repo sample as a standalone workspace.
 *
 * The canonical source stays under samples/internal-code-repo. DSH workspace
 * registration is intentionally left to the UI: the workspace store is an
 * internal runtime file and is not a product API.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = join(root, 'samples', 'internal-code-repo')
const args = process.argv.slice(2)
const targetIndex = args.indexOf('--target')
const target = resolve(targetIndex >= 0 ? args[targetIndex + 1] : join(homedir(), 'code', 'internal-code-repo'))
const force = args.includes('--force')
const noGit = args.includes('--no-git')

if (!existsSync(source)) throw new Error('missing canonical sample: ' + source)
if (existsSync(target)) {
  if (!force) {
    console.error('target already exists: ' + target)
    console.error('use --force to replace it, or choose --target')
    process.exit(1)
  }
  rmSync(target, { recursive: true, force: true })
}
mkdirSync(target, { recursive: true })
cpSync(source, target, {
  recursive: true,
  filter: path => !path.includes('/.git') && !path.includes('\\/.git')
})
if (!noGit) {
  const init = spawnSync('git', ['init', '-q'], { cwd: target, stdio: 'inherit' })
  if (init.status !== 0) throw new Error('git init failed')
  const add = spawnSync('git', ['add', '.'], { cwd: target, stdio: 'inherit' })
  if (add.status !== 0) throw new Error('git add failed')
  const commit = spawnSync('git', ['-c', 'user.name=DataOps Demo', '-c', 'user.email=demo@local', 'commit', '-qm', 'chore: materialize internal code repo sample'], { cwd: target, stdio: 'inherit' })
  if (commit.status !== 0) throw new Error('git commit failed')
}
console.log('materialized: ' + target)
console.log('open it in DSH via 添加工作区, then use the Files tab and click lts_code/*/task.yaml')
