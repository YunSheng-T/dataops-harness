#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { BUNDLE_NAME, BUNDLE_VERSION, DEFAULT_PROFILE, SUPPORTED_DSH_RANGE, findVersion, isSubpath, listSkillNames, profileDir, readJson, resolveDshHome, satisfiesRange, sha256File, writeJsonAtomic } from '../src/lib.mjs'

const INSTALLER_NAME = '@dataops/dataops-install'
const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..')
const RECEIPT_DIR = 'dataops'
const RECEIPT_FILE = 'install.json'
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9-]*$/

const COMMAND_HELP = [
  'usage:',
  '  dataops-install [install] [options]',
  '  dataops-doctor [--home <DSH_HOME>] [--profile dataops] [--json]',
  '  dataops-uninstall [--home <DSH_HOME>] [--keep-profile] [--yes] [--dry-run]',
  '',
  'install options:',
  '  --home <dir>               DSH_HOME (default: $DSH_HOME or ~/.dsh)',
  '  --profile <name>           profile to install (default: dataops)',
  '  --dsh <cmd>                dsh executable (default: $DSH_BIN or dsh)',
  '  --bundle <spec>            bundle spec (default: @dataops/dsh-dataops-bundle@0.1.0)',
  '  --source <spec>            alternate bundle spec (registry or file)',
  '  --offline <dir>            install from local tarballs; no registry access',
  '  --skills-source <dir>      skill source root (default: package skills/ or repo .agents/skills)',
  '  --no-skills                do not install skills',
  '  --workspace <dir>          install skills into <dir>/.agents/skills',
  '  --migrate                  back up an old dataops profile, then install fresh',
  '  --reset                    back up and reinstall even if a bundle is present',
  '  --force                    overwrite colliding skills',
  '  --skip-skills-conflicts    skip colliding skills instead of failing',
  '  --yes                      skip confirmation',
  '  --dry-run                  print actions without writing',
  '  --json                     print the receipt as JSON at the end',
  '',
  'exit codes: 0 success, 1 failure, 2 usage'
].join('\n')

function usage() {
  console.log(COMMAND_HELP)
}

function die(message, code = 1) {
  const error = new Error(message)
  error.exitCode = code
  throw error
}

function log(message) {
  console.log(message)
}

function parseArgs(argv) {
  const options = {
    command: null,
    home: null,
    profile: DEFAULT_PROFILE,
    dsh: process.env.DSH_BIN || 'dsh',
    bundle: null,
    source: null,
    offline: null,
    skillsSource: null,
    noSkills: false,
    workspace: null,
    migrate: false,
    reset: false,
    force: false,
    skipSkillsConflicts: false,
    yes: false,
    dryRun: false,
    json: false,
    keepProfile: false,
    help: false,
    version: false
  }
  const commands = new Set(['install', 'doctor', 'uninstall', 'help'])
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const value = () => {
      const next = argv[++index]
      if (next === undefined) die('missing value for ' + token, 2)
      return next
    }
    if (token === '--help' || token === '-h') { options.help = true; continue }
    if (token === '--version' || token === '-V') { options.version = true; continue }
    if (token === '--yes' || token === '-y') { options.yes = true; continue }
    if (token === '--dry-run') { options.dryRun = true; continue }
    if (token === '--json') { options.json = true; continue }
    if (token === '--no-skills') { options.noSkills = true; continue }
    if (token === '--migrate') { options.migrate = true; continue }
    if (token === '--reset') { options.reset = true; continue }
    if (token === '--force') { options.force = true; continue }
    if (token === '--skip-skills-conflicts') { options.skipSkillsConflicts = true; continue }
    if (token === '--keep-profile') { options.keepProfile = true; continue }
    if (token === '--home') { options.home = value(); continue }
    if (token === '--profile') { options.profile = value(); continue }
    if (token === '--dsh') { options.dsh = value(); continue }
    if (token === '--bundle') { options.bundle = value(); continue }
    if (token === '--source') { options.source = value(); continue }
    if (token === '--offline') { options.offline = value(); continue }
    if (token === '--skills-source') { options.skillsSource = value(); continue }
    if (token === '--workspace') { options.workspace = value(); continue }
    if (token.startsWith('--')) die('unknown option: ' + token, 2)
    if (options.command) die('unexpected argument: ' + token, 2)
    if (!commands.has(token)) die('unknown command: ' + token, 2)
    options.command = token
  }
  if (!options.command) {
    options.command = basename(process.argv[1]).includes('doctor') ? 'doctor' : basename(process.argv[1]).includes('uninstall') ? 'uninstall' : 'install'
  }
  if (!PROFILE_PATTERN.test(options.profile)) die('profile must match [a-z0-9][a-z0-9-]*', 2)
  if (options.source && options.offline) die('--source and --offline are mutually exclusive', 2)
  return options
}

function run(command, args, options, mode = 'inherit') {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, DSH_HOME: options.home },
    encoding: 'utf8',
    stdio: mode,
    maxBuffer: 32 * 1024 * 1024
  })
  if (result.error) die('cannot run ' + command + ': ' + result.error.message)
  if (result.status !== 0) {
    const detail = mode === 'pipe' ? String(result.stderr || result.stdout || '').trim() : ''
    die(command + ' exited ' + result.status + (detail ? ': ' + detail : ''))
  }
  return result
}

function capture(command, args, options) {
  return run(command, args, options, 'pipe')
}

function readDshVersion(options) {
  const result = capture(options.dsh, ['--version'], options)
  const version = findVersion(String(result.stdout || '') + ' ' + String(result.stderr || ''))
  if (!version) die('cannot parse dsh version from --version output')
  return version
}

function readPnpmVersion(options) {
  const result = spawnSync('pnpm', ['--version'], { encoding: 'utf8' })
  if (result.error) die('pnpm is required by dsh plugin but was not found on PATH')
  if (result.status !== 0) die('pnpm --version failed with exit ' + result.status)
  return String(result.stdout || '').trim()
}

function baseOptions(options) {
  return {
    ...options,
    home: resolveDshHome(options.home)
  }
}

function stateOf(profileDirectory) {
  const manifestPath = join(profileDirectory, 'package.json')
  if (!existsSync(manifestPath)) return { exists: false, manifest: null, directory: profileDirectory }
  return { exists: true, manifest: readJson(manifestPath), directory: profileDirectory }
}

function bundlesOf(manifest) {
  return manifest && manifest.dsh && manifest.dsh.profile && Array.isArray(manifest.dsh.profile.bundles)
    ? manifest.dsh.profile.bundles
    : []
}

function foreignProfileEntries(manifest) {
  const deps = Object.keys(manifest && manifest.dependencies || {}).filter(name => !name.startsWith('@dataops/'))
  const known = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@dataops/dsh-dataops-preset'])
  const bundles = bundlesOf(manifest).filter(name => !known.has(name) && !name.startsWith('@dataops/'))
  return { deps, bundles }
}

function hasBundle(manifest) {
  const deps = manifest && manifest.dependencies ? manifest.dependencies : {}
  return Boolean(deps[BUNDLE_NAME]) && bundlesOf(manifest).includes(BUNDLE_NAME)
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function backupProfile(directory) {
  const backup = directory + '.bak-' + stamp()
  renameSync(directory, backup)
  return backup
}

function resolveSkillsSource(options) {
  if (options.skillsSource) return resolve(options.skillsSource)
  const bundled = join(PACKAGE_ROOT, 'skills')
  if (existsSync(join(bundled, '.keep')) || existsSync(bundled)) return bundled
  return join(REPO_ROOT, '.agents', 'skills')
}

function skillsTarget(options, home) {
  if (options.workspace) return join(resolve(options.workspace), '.agents', 'skills')
  return join(home, 'skills')
}

function collectSkillPlan(options, home) {
  if (options.noSkills) return { source: null, target: null, names: [], skipped: [], conflicts: [] }
  const source = resolveSkillsSource(options)
  if (!existsSync(source)) {
    log('warning: skills source not found: ' + source + ' (continuing without skills)')
    return { source, target: skillsTarget(options, home), names: [], skipped: [], conflicts: [] }
  }
  const target = skillsTarget(options, home)
  const oldReceipt = readReceipt(home)
  const owned = new Set(oldReceipt && oldReceipt.skillRoot === target && Array.isArray(oldReceipt.skills) ? oldReceipt.skills : [])
  const names = listSkillNames(source).filter(name => !name.startsWith('dsh-'))
  const conflicts = []
  for (const name of names) {
    const destination = join(target, name)
    if (!existsSync(destination) || owned.has(name) || options.force) continue
    if (options.skipSkillsConflicts) continue
    conflicts.push(destination)
  }
  return { source, target, names, owned, conflicts }
}

function installSkills(plan, options) {
  if (!plan.source || plan.names.length === 0) return []
  mkdirSync(plan.target, { recursive: true })
  const installed = []
  for (const name of plan.names) {
    const destination = join(plan.target, name)
    if (existsSync(destination) && !options.force && !(plan.owned && plan.owned.has(name))) {
      if (options.skipSkillsConflicts) {
        log('skip existing skill: ' + destination)
        continue
      }
      die('skill already exists: ' + destination + ' (use --force or --skip-skills-conflicts)')
    }
    rmSync(destination, { recursive: true, force: true })
    cpSync(join(plan.source, name), destination, { recursive: true })
    installed.push(name)
  }
  return installed
}

function receiptPath(home) {
  return join(home, RECEIPT_DIR, RECEIPT_FILE)
}

function readReceipt(home) {
  const path = receiptPath(home)
  if (!existsSync(path)) return null
  try {
    return readJson(path)
  } catch {
    return null
  }
}

function writeReceipt(home, receipt) {
  writeJsonAtomic(receiptPath(home), receipt)
}

function parseYamlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'"
}

function ensureOfflineOverrides(profileDirectory, tarballs) {
  const path = join(profileDirectory, 'pnpm-workspace.yaml')
  const lines = []
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf8')
    const parts = existing.split('\n')
    const index = parts.findIndex(line => /^overrides:\s*$/.test(line))
    if (index >= 0) {
      const tail = parts.slice(index + 1)
      if (tail.some(line => line.trim() !== '' && !/^\s/.test(line))) {
        die('pnpm-workspace.yaml has settings after overrides; merge the offline tarballs manually')
      }
      lines.push(parts.slice(0, index).join('\n').trimEnd())
    } else {
      lines.push(existing.trimEnd())
    }
  } else {
    lines.push('packages:')
    lines.push('  - .')
    lines.push('')
    lines.push('nodeLinker: hoisted')
    lines.push('autoInstallPeers: false')
  }
  lines.push('')
  lines.push('overrides:')
  for (const entry of tarballs) {
    lines.push('  ' + parseYamlQuote(entry.name) + ': ' + parseYamlQuote('file:' + entry.path))
  }
  writeFileSync(path, lines.join('\n') + '\n')
}

function findTarball(directory, packageName) {
  const prefix = packageName.replace('@dataops/', '').replaceAll('/', '-') + '-'
  const matches = readdirSync(directory)
    .filter(name => name.startsWith('dataops-' + prefix) && name.endsWith('.tgz'))
    .sort()
  if (matches.length !== 1) die('expected one tarball for ' + packageName + ' in ' + directory + ', found ' + matches.length)
  return join(directory, matches[0])
}

function offlineTarballs(directory) {
  const resolved = resolve(directory)
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) die('offline directory not found: ' + resolved)
  const selected = [
    { name: '@dataops/dsh-dataops-bundle', path: findTarball(resolved, 'dsh-dataops-bundle') },
    { name: '@dataops/dsh-dataops-tools', path: findTarball(resolved, 'dsh-dataops-tools') },
    { name: '@dataops/dsh-dataops-client', path: findTarball(resolved, 'dsh-dataops-client') },
    { name: '@dataops/dsh-dataops-brand', path: findTarball(resolved, 'dsh-dataops-brand') }
  ]
  const manifestPath = join(resolved, 'manifest.json')
  if (!existsSync(manifestPath)) {
    log('warning: manifest.json not found in ' + resolved + '; skipping tarball checksum verification')
    return selected
  }
  const manifest = readJson(manifestPath)
  if (manifest.version && manifest.version !== BUNDLE_VERSION) die('offline manifest version ' + manifest.version + ' does not match installer ' + BUNDLE_VERSION)
  const entries = new Map(Array.isArray(manifest.packages) ? manifest.packages.map(entry => [entry.name, entry]) : [])
  for (const item of selected) {
    const entry = entries.get(item.name)
    if (!entry) die('offline manifest is missing ' + item.name)
    if (entry.file && entry.file !== basename(item.path)) die('offline manifest file mismatch for ' + item.name + ': ' + entry.file + ' vs ' + basename(item.path))
    if (entry.sha256 && sha256File(item.path) !== entry.sha256) die('offline tarball checksum mismatch: ' + item.path)
  }
  return selected
}

function printPlan(lines) {
  log('plan:')
  for (const line of lines) log('  - ' + line)
}

async function confirm(message, options) {
  if (options.yes) return true
  if (!process.stdin.isTTY) die('non-interactive install: pass --yes to confirm')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(message + ' [y/N] ')
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}

function installPlan(options, home, target, state, tarballs, skillPlan) {
  const lines = []
  lines.push('profile: ' + target)
  if (!state.exists) lines.push('seed shipped web template into ' + target)
  if (state.exists && (options.reset || options.migrate)) lines.push('back up existing profile to ' + target + '.bak-<timestamp>')
  if (tarballs) {
    lines.push('write offline pnpm-workspace overrides')
    lines.push('dsh plugin --profile ' + options.profile + ' add ' + tarballs[0].path)
  } else {
    lines.push('dsh plugin --profile ' + options.profile + ' add ' + (options.source || options.bundle || (BUNDLE_NAME + '@' + BUNDLE_VERSION)))
  }
  lines.push('verify with dsh --profile ' + options.profile + ' --dump-config')
  if (skillPlan.names.length > 0) lines.push('install ' + skillPlan.names.length + ' skills into ' + skillPlan.target)
  else if (options.noSkills) lines.push('skills: skipped (--no-skills)')
  else lines.push('skills: none found')
  lines.push('write receipt ' + receiptPath(home))
  return lines
}

async function install(options) {
  const opts = baseOptions(options)
  const home = opts.home
  const profile = opts.profile
  const target = profileDir(home, profile)
  const state = stateOf(target)
  const dshVersion = readDshVersion(opts)
  if (!satisfiesRange(dshVersion)) die('incompatible dsh ' + dshVersion + '; supported ' + SUPPORTED_DSH_RANGE)
  const pnpmVersion = readPnpmVersion(opts)
  if (opts.source && opts.offline) die('--source and --offline are mutually exclusive', 2)
  if (opts.bundle && opts.offline) die('--bundle is not used with --offline; the bundle tarball is selected from the directory', 2)
  const tarballs = opts.offline ? offlineTarballs(opts.offline) : null
  if (state.exists && !hasBundle(state.manifest) && !opts.migrate && !opts.reset) {
    die('profile ' + target + ' exists but is not a DataOps bundle profile; use --migrate or --reset')
  }
  if (state.exists && opts.reset && !opts.migrate) {
    const foreign = foreignProfileEntries(state.manifest)
    if (foreign.deps.length || foreign.bundles.length) {
      die('refusing --reset: profile has user dependencies/bundles that would be lost: ' + foreign.deps.concat(foreign.bundles).join(', ') + '. Use a normal install (without --reset), or back up and re-add them explicitly.')
    }
  }
  const skillPlan = collectSkillPlan(opts, home)
  if (skillPlan.conflicts.length > 0) {
    die('skill conflicts:\n' + skillPlan.conflicts.map(path => '  - ' + path).join('\n') + '\nuse --force or --skip-skills-conflicts')
  }
  const plan = installPlan(opts, home, target, state, tarballs, skillPlan)
  printPlan(plan)
  if (opts.dryRun) return null
  if (!(await confirm('proceed with install into ' + target + '?', opts))) die('cancelled')
  let createdProfile = false
  let backup = null
  let installedSkills = []
  try {
    if (state.exists && (opts.reset || opts.migrate)) {
      backup = backupProfile(target)
      log('backed up profile: ' + backup)
      if (opts.migrate) {
        const legacyPatch = join(target, 'cordis.patch.yml')
        if (existsSync(legacyPatch)) log('legacy patch kept at: ' + join(backup, 'cordis.patch.yml'))
      }
    }
    if (!existsSync(join(target, 'package.json'))) {
      mkdirSync(home, { recursive: true })
      run(opts.dsh, ['--profile', profile, '--from-default-profile', 'web', '--dump-config'], opts, 'ignore')
      createdProfile = true
      if (!existsSync(join(target, 'package.json'))) die('profile seed did not create ' + target)
      const seeded = stateOf(target)
      if (!bundlesOf(seeded.manifest).includes('@deepseek-ai/dsh-web-app')) die('seeded profile is missing @deepseek-ai/dsh-web-app')
    }
    if (tarballs) {
      ensureOfflineOverrides(target, tarballs.filter(entry => entry.name !== '@dataops/dsh-dataops-bundle'))
      run(opts.dsh, ['plugin', '--profile', profile, 'add', tarballs[0].path], opts, 'inherit')
    } else {
      const spec = opts.source || opts.bundle || (BUNDLE_NAME + '@' + BUNDLE_VERSION)
      run(opts.dsh, ['plugin', '--profile', profile, 'add', spec], opts, 'inherit')
    }
    const installed = stateOf(target)
    if (!hasBundle(installed.manifest)) die('bundle was not added to ' + target)
    if (!bundlesOf(installed.manifest).includes('@deepseek-ai/dsh-web-app')) die('profile is missing @deepseek-ai/dsh-web-app; DSH Desktop cannot launch it')
    const dump = capture(opts.dsh, ['--profile', profile, '--dump-config'], opts)
    const text = String(dump.stdout || '') + ' ' + String(dump.stderr || '')
    for (const token of ['dataops-tools', 'dataops-brand', 'dataops-client', 'preset-dataops-dev']) {
      if (!text.includes(token)) die('dump-config is missing ' + token)
    }
    const skills = installSkills(skillPlan, opts)
    installedSkills = skills
    const oldReceipt = readReceipt(home)
    const receipt = {
      schema: 1,
      bundle: BUNDLE_NAME,
      version: BUNDLE_VERSION,
      dshVersion,
      pnpmVersion,
      profile,
      installedAt: new Date().toISOString(),
      source: tarballs ? 'offline' : opts.source ? 'source' : 'registry',
      artifacts: ['profile', 'bundle'].concat(skills.length ? ['skills'] : []),
      skillRoot: skillPlan.target,
      skills,
      sha256: tarballs ? sha256File(tarballs[0].path) : null,
      previous: oldReceipt && oldReceipt.version ? [oldReceipt.version] : []
    }
    writeReceipt(home, receipt)
    log('installed ' + BUNDLE_NAME + '@' + BUNDLE_VERSION + ' into ' + target)
    log('skills: ' + (skills.length ? skills.join(', ') : 'none'))
    if (opts.json) console.log(JSON.stringify(receipt, null, 2))
    log('restart dsh / DSH Desktop, then select profile: ' + profile)
    return receipt
  } catch (error) {
    if (createdProfile && !opts.dryRun) {
      for (const name of installedSkills) rmSync(join(skillPlan.target, name), { recursive: true, force: true })
      rmSync(target, { recursive: true, force: true })
      log('removed partially created profile: ' + target)
    }
    if (backup) log('backup kept at: ' + backup)
    throw error
  }
}

function collectDoctor(options) {
  const opts = baseOptions(options)
  const home = opts.home
  const target = profileDir(home, opts.profile)
  const checks = []
  const add = (ok, label, detail) => checks.push({ ok, label, detail: detail || '' })
  let dshVersion = null
  try { dshVersion = readDshVersion(opts); add(satisfiesRange(dshVersion), 'dsh version', dshVersion + ' (' + SUPPORTED_DSH_RANGE + ')') } catch (error) { add(false, 'dsh version', error.message) }
  const state = stateOf(target)
  add(state.exists, 'profile', target)
  if (state.exists) {
    add(hasBundle(state.manifest), 'bundle dependency', BUNDLE_NAME)
    add(bundlesOf(state.manifest).includes('@deepseek-ai/dsh-web-app'), 'web-app bundle', '@deepseek-ai/dsh-web-app')
    try {
      const dump = capture(opts.dsh, ['--profile', opts.profile, '--dump-config'], opts)
      const text = String(dump.stdout || '') + ' ' + String(dump.stderr || '')
      add(['dataops-tools', 'dataops-brand', 'dataops-client', 'preset-dataops-dev'].every(token => text.includes(token)), 'dump-config rows')
    } catch (error) {
      add(false, 'dump-config', error.message)
    }
  }
  const receipt = readReceipt(home)
  add(Boolean(receipt), 'receipt', receiptPath(home))
  if (receipt && Array.isArray(receipt.skills) && receipt.skills.length > 0) {
    const missing = receipt.skills.filter(name => !existsSync(join(receipt.skillRoot, name, 'SKILL.md')))
    add(missing.length === 0, 'skills', missing.length ? 'missing: ' + missing.join(', ') : String(receipt.skills.length) + ' installed')
  }
  return { checks, receipt, home, profile: opts.profile, dshVersion }
}

function doctor(options) {
  const report = collectDoctor(options)
  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    for (const check of report.checks) console.log((check.ok ? 'ok   ' : 'FAIL ') + check.label + (check.detail ? ' · ' + check.detail : ''))
  }
  if (report.checks.some(check => !check.ok)) die('doctor found failures')
  if (!options.json) log('dataops doctor: PASS')
}

async function uninstall(options) {
  const opts = baseOptions(options)
  const home = opts.home
  const target = profileDir(home, opts.profile)
  const receipt = readReceipt(home)
  if (!receipt && !options.force) die('no install receipt at ' + receiptPath(home) + '; pass --force to remove the profile only')
  const actions = []
  if (receipt && Array.isArray(receipt.skills) && receipt.skillRoot) {
    for (const name of receipt.skills) {
      const destination = join(receipt.skillRoot, name)
      if (!isSubpath(receipt.skillRoot, destination)) die('unsafe skill path in receipt: ' + destination)
      if (existsSync(destination)) actions.push('remove skill ' + destination)
    }
  }
  if (existsSync(target)) {
    if (options.keepProfile) actions.push('remove bundle from ' + target + ' but keep profile')
    else actions.push('remove profile ' + target)
  }
  if (existsSync(receiptPath(home))) actions.push('remove receipt ' + receiptPath(home))
  printPlan(actions)
  if (options.dryRun) return
  if (!(await confirm('proceed with uninstall?', opts))) die('cancelled')
  if (receipt && Array.isArray(receipt.skills) && receipt.skillRoot) {
    for (const name of receipt.skills) {
      const destination = join(receipt.skillRoot, name)
      if (isSubpath(receipt.skillRoot, destination)) rmSync(destination, { recursive: true, force: true })
    }
  }
  if (existsSync(target)) {
    if (options.keepProfile) {
      try { run(opts.dsh, ['plugin', '--profile', opts.profile, 'remove', BUNDLE_NAME], opts, 'inherit') } catch (error) { log('warning: bundle remove failed: ' + error.message) }
    } else {
      rmSync(target, { recursive: true, force: true })
    }
  }
  const receiptDir = join(home, RECEIPT_DIR)
  rmSync(receiptPath(home), { force: true })
  try { if (existsSync(receiptDir) && readdirSync(receiptDir).length === 0) rmSync(receiptDir, { recursive: true, force: true }) } catch {}
  log('uninstalled DataOps profile ' + opts.profile + '; workitems in the workspace were not touched')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help || options.command === 'help') { usage(); return }
  if (options.version) { console.log(INSTALLER_NAME + ' 0.1.0'); return }
  if (options.command === 'install') await install(options)
  else if (options.command === 'doctor') doctor(options)
  else if (options.command === 'uninstall') await uninstall(options)
  else die('unknown command', 2)
}

main().catch(error => {
  console.error('dataops-install: ' + error.message)
  process.exitCode = error.exitCode || 1
})
