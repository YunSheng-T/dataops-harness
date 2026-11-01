#!/usr/bin/env node
/**
 * Build a local, registry-free DataOps release directory.
 *
 * Output:
 *   dist/dataops-<version>/
 *     dataops-dsh-dataops-bundle-<version>.tgz
 *     dataops-dsh-dataops-client-<version>.tgz
 *     dataops-dsh-dataops-brand-<version>.tgz
 *     dataops-dsh-dataops-tools-<version>.tgz
 *     dataops-dsh-dataops-preset-<version>.tgz   (optional source)
 *     dataops-dataops-install-<version>.tgz
 *     manifest.json
 *     sha256sum
 *     LICENSE
 *     THIRD_PARTY_NOTICES.md
 *
 * usage:
 *   node scripts/release-dataops.mjs [--out <dir>] [--skip-checks]
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const outFlag = args.indexOf('--out')
const skipChecks = args.includes('--skip-checks')
if (skipChecks) console.warn('warning: --skip-checks bypasses verify-local; do not use for publishing')
if (outFlag >= 0 && !args[outFlag + 1]) throw new Error('missing value for --out')
const outDir = outFlag >= 0 ? resolve(args[outFlag + 1]) : null
const version = JSON.parse(readFileSync(join(root, 'packages', 'dataops-bundle', 'package.json'), 'utf8')).version
const distRoot = outDir || join(root, 'dist', 'dataops-' + version)
const npmEnv = {
  ...process.env,
  npm_config_logs_dir: join(tmpdir(), 'dataops-release-npm-logs'),
  npm_config_cache: join(tmpdir(), 'dataops-release-npm-cache')
}
const packages = [
  { name: '@dataops/dsh-dataops-bundle', dir: 'packages/dataops-bundle', role: 'bundle' },
  { name: '@dataops/dsh-dataops-client', dir: 'packages/dataops-client', role: 'runtime' },
  { name: '@dataops/dsh-dataops-brand', dir: 'packages/dataops-brand', role: 'runtime' },
  { name: '@dataops/dsh-dataops-tools', dir: 'packages/dataops-tools', role: 'runtime' },
  { name: '@dataops/dsh-dataops-preset', dir: 'packages/dataops-preset', role: 'source' },
  { name: '@dataops/dataops-install', dir: 'packages/dataops-install', role: 'installer' }
]
const staged = []

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', env: { ...process.env, ...npmEnv }, ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(command + ' exited ' + result.status)
}

function runNode(script, extra = []) {
  run(process.execPath, [join(root, script), ...extra])
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function stageNotices(pkg) {
  const packageDir = join(root, pkg.dir)
  for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    const source = join(root, name)
    const target = join(packageDir, name)
    if (!existsSync(target)) {
      copyFileSync(source, target)
      staged.push(target)
    }
  }
}

function cleanup() {
  for (const file of staged) rmSync(file, { force: true })
}

function checkTarball(file, pkg) {
  const listing = execFileSync('tar', ['-tzf', file], { encoding: 'utf8' }).split('\n')
  for (const required of ['package/LICENSE', 'package/THIRD_PARTY_NOTICES.md']) {
    if (!listing.includes(required)) throw new Error(pkg.name + ' tarball is missing ' + required)
  }
  if (pkg.role === 'bundle' && !listing.includes('package/cordis.patch.yml')) {
    throw new Error('bundle tarball is missing package/cordis.patch.yml')
  }
}

function pack(pkg) {
  const packageDir = join(root, pkg.dir)
  run('npm', ['pack', '--pack-destination', distRoot, '--silent'], { cwd: packageDir })
  const expected = 'dataops-' + pkg.name.split('/').pop() + '-' + version + '.tgz'
  const file = join(distRoot, expected)
  if (!existsSync(file)) {
    const matches = readdirSync(distRoot).filter(name => name.endsWith('.tgz') && name.includes(pkg.name.split('/').pop()))
    if (matches.length !== 1) throw new Error('cannot identify tarball for ' + pkg.name + ': ' + matches.join(', '))
    return join(distRoot, matches[0])
  }
  return file
}

try {
  if (!skipChecks) {
    runNode('scripts/check-dataops-bundle.mjs')
    runNode('scripts/verify-local.mjs')
  }
  runNode('scripts/build-dataops-bundle.mjs')
  runNode('packages/dataops-client/scripts/build.mjs')
  runNode('packages/dataops-brand/scripts/build.mjs')
  rmSync(distRoot, { recursive: true, force: true })
  mkdirSync(distRoot, { recursive: true })
  const entries = []
  for (const pkg of packages) {
    stageNotices(pkg)
    const file = pack(pkg)
    checkTarball(file, pkg)
    entries.push({
      name: pkg.name,
      version,
      role: pkg.role,
      file: file.slice(distRoot.length + 1),
      bytes: statSync(file).size,
      sha256: sha256(file)
    })
    console.log('packed ' + entries[entries.length - 1].file)
  }
  copyFileSync(join(root, 'LICENSE'), join(distRoot, 'LICENSE'))
  copyFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), join(distRoot, 'THIRD_PARTY_NOTICES.md'))
  const manifest = {
    schema: 1,
    name: 'dataops-local-release',
    version,
    generatedAt: new Date().toISOString(),
    dshRange: '>=0.2.1-rc.2 <0.3.0',
    packages: entries
  }
  const manifestPath = join(distRoot, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  const checksumFiles = entries.map(entry => join(distRoot, entry.file))
  checksumFiles.push(manifestPath, join(distRoot, 'LICENSE'), join(distRoot, 'THIRD_PARTY_NOTICES.md'))
  const checksumText = checksumFiles.map(file => sha256(file) + '  ' + file.slice(distRoot.length + 1)).join('\n') + '\n'
  writeFileSync(join(distRoot, 'sha256sum'), checksumText)
  const instructions = [
    '# DataOps local release ' + version,
    '',
    'Registry-free release built by scripts/release-dataops.mjs.',
    '',
    '## Install',
    '',
    '    node packages/dataops-install/bin/dataops-install.mjs install \\',
    '      --home <DSH_HOME> \\',
    '      --dsh <path-to-dsh> \\',
    '      --offline ' + distRoot + ' \\',
    '      --yes',
    '',
    '## Verify',
    '',
    '    node packages/dataops-install/bin/dataops-install.mjs doctor --home <DSH_HOME> --dsh <path-to-dsh>',
    '',
    'The internal registry publish/ACL gate is not run on this machine.'
  ].join('\n') + '\n'
  writeFileSync(join(distRoot, 'LOCAL-RELEASE.md'), instructions)
  console.log(JSON.stringify({ dist: distRoot, version, packages: entries.length, manifest: manifestPath }, null, 2))
} catch (error) {
  console.error('release-dataops: ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
} finally {
  cleanup()
}
