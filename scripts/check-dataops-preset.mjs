#!/usr/bin/env node
/**
 * Static check for the DataOps agent-preset bundle and profile wiring.
 * Runtime roster/activation is covered by install + /api/agentPresets/list.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = path => readFileSync(resolve(root, path), 'utf8')
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }

const bundle = read('packages/dataops-preset/cordis.patch.yml')
const profile = read('profiles/dataops/cordis.patch.yml')
const pkg = read('packages/dataops-preset/package.json')
const installer = read('scripts/install-dataops-profile.mjs')

check(bundle.includes("id: 'dataops-dev'") || bundle.includes('id: dataops-dev'), 'bundle missing dataops-dev id')
check(bundle.includes("name: '@deepseek-ai/dsh-agent-preset'"), 'bundle missing agent-preset declaration')
check(bundle.includes('name: 数据开发模式'), 'bundle missing display name')
check(bundle.includes('dataops-workflow'), 'persona missing dataops-workflow reference')
check(bundle.includes('workitem-protocol'), 'persona missing workitem-protocol reference')
check(bundle.includes("name: '@deepseek-ai/dsh-tool-fs'"), 'bundle missing fs tool')
check(bundle.includes("name: '@deepseek-ai/dsh-tool-skill'"), 'bundle missing skill tool')
check(bundle.includes('sampleOverCapGlobResults: false'), 'tool-fs-search requires sampleOverCapGlobResults')
check(bundle.includes('allowParallelInProgress: true'), 'tool-todo requires allowParallelInProgress')
check(bundle.includes('发布') && bundle.includes('审批'), 'persona missing release approval rule')

check(!profile.includes('preset-dataops-dev'), 'preset must be declared by the bundle, not the profile patch')
check(profile.includes('default: dataops-dev'), 'profile must default to dataops-dev')
check(installer.includes("@dataops/dsh-dataops-preset"), 'installer must link the preset bundle')
check(installer.includes("dsh-web-app', '@dataops/dsh-dataops-preset'"), 'installer bundles must include the preset bundle')
check(pkg.includes('dsh-dataops-preset'), 'preset package name mismatch')
check(pkg.includes('./cordis.patch.yml'), 'preset package missing bundle patch')

if (failures.length) {
  console.error('dataops preset: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('dataops preset ok: dataops-dev declaration + profile wiring')
