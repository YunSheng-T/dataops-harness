#!/usr/bin/env node
/**
 * Build a self-contained intranet staging bundle.
 *
 * Prerequisite: the target machine already has a compatible dsh runtime.
 * This bundle contains DataOps packages, profile template, skills and installers;
 * it never contains node_modules, credentials, workitems, or upstream repos.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const root = resolve(import.meta.dirname, '..')
const stamp = new Date().toISOString().slice(0, 10)
const name = 'dataops-harness-offline-' + stamp
const dist = join(root, 'dist')
const stage = join(dist, name)

// Fail closed on accidental public dependencies before building.
execFileSync(process.execPath, [join(root, 'scripts/check-offline-surface.mjs')], { stdio: 'inherit' })

// Build generated artifacts before packing.
for (const script of ['packages/dataops-client/scripts/build.mjs', 'packages/dataops-brand/scripts/build.mjs']) {
  execFileSync(process.execPath, [join(root, script)], { stdio: 'inherit' })
}
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })

const copy = (from) => {
  const source = join(root, from)
  if (!existsSync(source)) throw new Error('missing offline payload: ' + from)
  cpSync(source, join(stage, from), { recursive: true, filter: path => !path.includes('node_modules') })
}
for (const path of ['packages/dataops-client', 'packages/dataops-brand', 'packages/dataops-tools', 'packages/dataops-preset', 'profiles/dataops', '.agents/skills', 'contracts', 'docs/ops/provider-config.example.yml', 'docs/ops/provider-config.example.json', 'workitems/_template', 'workitems/README.md', 'scripts/check-offline-surface.mjs', 'scripts/check-dataops-health.mjs', 'scripts/check-provider-config.mjs', 'scripts/install-dataops-profile.mjs', 'scripts/install-dataops-skills.mjs', 'scripts/check-dataops-preset.mjs', 'scripts/check-dataops-workitem.mjs', 'scripts/check-stage-contract.mjs', 'upstream.json', 'README.md']) copy(path)

writeFileSync(join(stage, 'OFFLINE-INSTALL.md'), `# DataOps offline install

Prerequisite: a compatible \`dsh\` runtime (0.2.1-rc.2/rc.3) is already installed.

\`\`\`sh
node scripts/install-dataops-profile.mjs --home /path/to/DSH_HOME
node scripts/install-dataops-skills.mjs
node scripts/check-dataops-preset.mjs
\`\`\`

No npm install is required. Do not copy credentials into this bundle.
`)
const tarball = join(dist, name + '.tar.gz')
execFileSync('tar', ['-czf', tarball, '-C', dist, name], { stdio: 'inherit' })
const bytes = readFileSync(tarball)
const digest = createHash('sha256').update(bytes).digest('hex')
writeFileSync(tarball + '.sha256', digest + '  ' + name + '.tar.gz\n', 'utf8')
rmSync(stage, { recursive: true, force: true })
console.log(JSON.stringify({ tarball, sha256: digest, bytes: bytes.length }, null, 2))
