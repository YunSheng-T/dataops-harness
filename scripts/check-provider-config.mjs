#!/usr/bin/env node
/** Validate a provider JSON config without contacting any platform. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeConfig } from '../packages/dataops-tools/src/config.js'
import { DOMAIN_NAMES, createDomainAdapters } from '../packages/dataops-tools/src/providers/domain-adapters.js'

const args = process.argv.slice(2)
const index = args.indexOf('--config')
const path = index >= 0 ? args[index + 1] : null
if (!path) {
  console.error('usage: node scripts/check-provider-config.mjs --config <provider-config.json>')
  process.exit(2)
}
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
let raw
try { raw = JSON.parse(readFileSync(resolve(path), 'utf8')) } catch (error) { console.error('provider-config: invalid JSON: ' + error.message); process.exit(2) }
const config = normalizeConfig(raw)
const adapters = createDomainAdapters(config, { timeoutMs: config.timeoutMs, retry: 0 })
for (const name of DOMAIN_NAMES) {
  const domain = config.domains ? config.domains[name] : null
  if (!domain) continue
  check(domain.kind === 'mock' || domain.kind === 'http' || domain.kind === 'cli', name + ': invalid kind')
  if (domain.kind === 'http') {
    check(Boolean(domain.baseUrl || domain.baseUrlEnv), name + ': http needs baseUrl/baseUrlEnv')
    check(domain.paths && typeof domain.paths === 'object', name + ': http needs paths')
  }
  if (domain.kind === 'cli') {
    check(domain.commands && typeof domain.commands === 'object', name + ': cli needs commands')
    for (const [op, argv] of Object.entries(domain.commands || {})) {
      check(Array.isArray(argv) && argv.length > 0, name + ': command ' + op + ' must be a non-empty array')
      check(!argv.some(part => /\s--/.test(String(part))), name + ': command ' + op + ' must not be a shell string')
    }
  }
  if (domain.tokenRef) check(/^[A-Z][A-Z0-9_]+$/.test(domain.tokenRef), name + ': tokenRef must be an env/credential name, not a token')
}
for (const name of DOMAIN_NAMES) {
  const health = await adapters[name].health()
  check(health.ok === true, name + ': health failed')
}
if (failures.length) {
  console.error('provider-config: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('provider-config: PASS (' + DOMAIN_NAMES.length + ' domains)')
