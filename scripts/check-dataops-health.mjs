#!/usr/bin/env node
/**
 * Offline/read-only provider health check.
 *
 * usage:
 *   node scripts/check-dataops-health.mjs
 *   node scripts/check-dataops-health.mjs --config /path/to/config.json
 *
 * The JSON shape is the dataops-tools plugin config. It never prints tokens.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeConfig } from '../packages/dataops-tools/src/config.js'
import { DOMAIN_NAMES, createDomainAdapters } from '../packages/dataops-tools/src/providers/domain-adapters.js'

const args = process.argv.slice(2)
const index = args.indexOf('--config')
const configPath = index >= 0 ? args[index + 1] : null
const raw = configPath ? JSON.parse(readFileSync(resolve(configPath), 'utf8')) : { provider: 'mock' }
const config = normalizeConfig(raw)
const adapters = createDomainAdapters(config, { timeoutMs: config.timeoutMs, retry: 0 })
let failed = false
for (const name of DOMAIN_NAMES) {
  const result = await adapters[name].health()
  if (!result.ok) failed = true
  console.log((result.ok ? 'ok   ' : 'FAIL ') + name.padEnd(10) + ' ' + result.kind + (result.checked === false ? ' (configured; no health endpoint)' : ''))
}
if (failed) process.exit(1)
console.log('dataops health: PASS')
