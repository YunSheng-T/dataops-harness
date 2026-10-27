#!/usr/bin/env node
/**
 * Install the DataOps profile into a DSH home.
 *
 * This never touches the `desktop` profile. It creates (or refreshes)
 * `$DSH_HOME/profiles/dataops`, writes the additive patch rows, and links the
 * two local packages into the profile's node_modules so the launcher resolves
 * them without a registry.
 *
 * usage:
 *   node scripts/install-dataops-profile.mjs [--home <DSH_HOME>] [--check]
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const check = args.includes('--check')
const homeFlag = args.indexOf('--home')
const home = homeFlag >= 0
  ? resolve(args[homeFlag + 1])
  : (process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(homedir(), '.dsh'))
const profileDir = join(home, 'profiles', 'dataops')

const packages = [
  { name: '@dataops/dsh-dataops-brand', dir: join(root, 'packages', 'dataops-brand'), entry: 'lib/client.js' },
  { name: '@dataops/dsh-dataops-client', dir: join(root, 'packages', 'dataops-client'), entry: 'lib/client.js' },
  { name: '@dataops/dsh-dataops-tools', dir: join(root, 'packages', 'dataops-tools'), entry: 'src/index.js' },
  { name: '@dataops/dsh-dataops-preset', dir: join(root, 'packages', 'dataops-preset'), entry: 'package.json' }
]

const manifest = {
  name: 'dsh-profile-dataops',
  private: true,
  dependencies: Object.fromEntries(packages.map(item => [item.name, 'file:' + item.dir])),
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@dataops/dsh-dataops-preset'] } }
}

const patch = readFileSync(join(root, 'profiles', 'dataops', 'cordis.patch.yml'), 'utf8')

const cordisRoot = `# dsh profile root — an empty entry list. The tree is composed as patches:
# each bundle in package.json's dsh.profile.bundles, then cordis.patch.yml.
# Edit cordis.patch.yml, not this file.
[]
`

const workspace = `packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
`

function linkPackage(item) {
  const scopeDir = join(profileDir, 'node_modules', '@dataops')
  const linkPath = join(scopeDir, item.name.split('/')[1])
  mkdirSync(scopeDir, { recursive: true })
  if (existsSync(linkPath) || lstatSafe(linkPath)) {
    try { unlinkSync(linkPath) } catch { /* directory: leave it for the user */ }
  }
  symlinkSync(item.dir, linkPath, 'dir')
}

function lstatSafe(path) {
  try { return lstatSync(path) } catch { return null }
}

if (check) {
  const failures = []
  for (const file of ['package.json', 'cordis.yml', 'cordis.patch.yml']) {
    if (!existsSync(join(profileDir, file))) failures.push('missing ' + file)
  }
  for (const item of packages) {
    const linkPath = join(profileDir, 'node_modules', '@dataops', item.name.split('/')[1])
    const stat = lstatSafe(linkPath)
    if (!stat) failures.push('missing link ' + item.name)
    else if (stat.isSymbolicLink() && readlinkSync(linkPath) !== item.dir) failures.push('stale link ' + item.name)
  }
  const skillsCheck = spawnSync(process.execPath, [join(root, 'scripts', 'install-dataops-skills.mjs'), '--check'], { stdio: 'inherit' })
  if (skillsCheck.status !== 0) failures.push('user-level skills')
  if (failures.length) {
    console.error('dataops profile: FAIL')
    for (const failure of failures) console.error(' - ' + failure)
    process.exit(1)
  }
  console.log('dataops profile ok: ' + profileDir)
  process.exit(0)
}

mkdirSync(profileDir, { recursive: true })
writeFileSync(join(profileDir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(join(profileDir, 'cordis.yml'), cordisRoot)
writeFileSync(join(profileDir, 'cordis.patch.yml'), patch)
writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), workspace)
for (const item of packages) {
  if (!existsSync(join(item.dir, item.entry))) {
    console.error('missing entry: ' + join(item.dir, item.entry))
    console.error('run: node ' + join(item.dir, 'scripts/build.mjs'))
    process.exit(1)
  }
  linkPackage(item)
}

const skillsInstall = spawnSync(process.execPath, [join(root, 'scripts', 'install-dataops-skills.mjs')], { stdio: 'inherit' })
if (skillsInstall.status !== 0) process.exit(skillsInstall.status ?? 1)
console.log('installed DataOps profile')
console.log('  profile: ' + profileDir)
console.log('  packages: ' + packages.map(item => item.name).join(', '))
console.log('')
console.log('verify:')
console.log('  DSH_HOME="' + home + '" dsh --profile dataops --dump-config')
console.log('start:')
console.log('  DSH_HOME="' + home + '" dsh --profile dataops')
console.log('  # without a global dsh: ./scripts/dsh --profile dataops')
console.log('')
console.log('The desktop profile is untouched; remove the directory to undo.')
