#!/usr/bin/env node
/**
 * Fail closed on accidental runtime dependencies that would break an air-gapped
 * install: non-peer package deps and source-level public fetch URLs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
const externalAllowed = new Set(['@deepseek-ai/cordis', '@deepseek-ai/dsh'])

for (const name of ['dataops-client', 'dataops-brand', 'dataops-tools', 'dataops-preset']) {
  const pkg = JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8'))
  for (const key of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const dep of Object.keys(pkg[key] || {})) {
      check(externalAllowed.has(dep) || dep.startsWith('@dataops/'), name + ': unexpected dependency ' + dep)
    }
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.(?:js|mjs|ts)$/.test(entry.name)) {
      const text = readFileSync(path, 'utf8')
      const urls = text.match(/https?:\/\/[^\s'"`)]+/g) || []
      for (const url of urls) {
        if (/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/.test(url)) continue
        if (/^https?:\/\/www\.w3\.org\//.test(url)) continue
        if (/^https?:\/\/[^/]+\.example(?:\/|$)/.test(url)) continue
        failures.push(path.replace(root + '/', '') + ': public URL ' + url)
      }
    }
  }
}
for (const dir of ['packages/dataops-client/src', 'packages/dataops-tools/src', 'packages/dataops-brand/src']) walk(join(root, dir))

if (failures.length) {
  console.error('offline surface: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('offline surface: PASS (no external deps or public runtime URLs)')
