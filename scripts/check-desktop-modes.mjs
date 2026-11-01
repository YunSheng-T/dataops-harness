#!/usr/bin/env node
/**
 * Headless Desktop composition check for one installed DataOps profile.
 *
 * This imports the installed DSH Desktop profile resolver, composes the
 * profile in compatibility / extended / advanced mode, and asserts that the
 * desktop-shell row is present with the requested mode.
 *
 * usage:
 *   node scripts/check-desktop-modes.mjs --home <temp-DSH_HOME> [--profile dataops]
 *
 * The home directory is mutated (settings.yaml is written for each mode) and
 * restored afterwards. Use a temporary DSH_HOME, never the live one.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const value = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const homeFlag = value('--home')
const profile = value('--profile') || 'dataops'
const app = value('--app') || process.env.DSH_DESKTOP_APP || '/Applications/DSH Desktop.app/Contents/Resources/app'
const platform = value('--platform') || process.platform
if (!homeFlag) {
  console.error('usage: node scripts/check-desktop-modes.mjs --home <temp-DSH_HOME> [--profile dataops]')
  process.exit(2)
}
const home = resolve(homeFlag)
const profileDirectory = join(home, 'profiles', profile)
if (!existsSync(join(profileDirectory, 'package.json'))) {
  console.error('profile not installed: ' + profileDirectory)
  process.exit(1)
}
const lib = join(app, 'lib')
const chunk = existsSync(lib) ? readdirSync(lib).find(name => /^profile-.*\.js$/.test(name)) : undefined
if (!chunk) {
  console.error('DSH Desktop profile chunk not found under ' + lib)
  process.exit(1)
}
const settingsPath = join(home, 'settings.yaml')
const previous = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : null
const modes = ['compatibility', 'extended', 'advanced']

async function main() {
  const module = await import(pathToFileURL(join(lib, chunk)).href)
  const prepare = module.h
  if (typeof prepare !== 'function') throw new Error('prepareDesktopProfile export not found')
  const results = []
  try {
    for (const mode of modes) {
      writeFileSync(settingsPath, 'dsh-desktop:\n  mode: ' + mode + '\n')
      const prepared = prepare('1', home, platform, profile, undefined, undefined, {})
      const shell = prepared.patches.find(row => row && row.id === 'desktop-shell')
      const result = {
        mode,
        resolvedMode: prepared.mode,
        desktopShell: Boolean(shell),
        shellMode: shell && shell.config ? shell.config.mode : undefined,
        skippedBundles: prepared.profile.skippedBundles,
        layers: prepared.profile.layers.map(layer => layer.packageName)
      }
      results.push(result)
      if (result.resolvedMode !== mode || !result.desktopShell || result.shellMode !== mode || result.skippedBundles.length !== 0) {
        throw new Error('desktop composition mismatch for ' + mode + ': ' + JSON.stringify(result))
      }
    }
  } finally {
    if (previous === null) rmSync(settingsPath, { force: true })
    else writeFileSync(settingsPath, previous)
  }
  console.log(JSON.stringify(results, null, 2))
  console.log('desktop modes: PASS (' + modes.join(', ') + ')')
}

main().catch(error => {
  console.error('check-desktop-modes: ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
})
