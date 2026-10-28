#!/usr/bin/env node
/**
 * Contract gate for the host and client stage mirrors.
 * The canonical file is contracts/stage-contract.json; runtime constants must
 * not drift before the full shared-contract refactor lands.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GATE_ROLES, STAGE_KINDS, STAGES } from '../packages/dataops-tools/src/workitem-store.js'
import { createStageBrief } from '../packages/dataops-client/src/brief.js'

const root = resolve(import.meta.dirname, '..')
const contract = JSON.parse(readFileSync(resolve(root, 'contracts/stage-contract.json'), 'utf8'))
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fakeReact = { createElement() {}, Fragment: {} }
const brief = createStageBrief(fakeReact, { subscribe() {}, get() {} }, null)

check(same(contract.storeStages, STAGES), 'host STAGES drifted from contracts/stage-contract.json')
check(same(contract.uiStages.map(item => item.key), brief.STAGES.map(item => item.key)), 'client stage keys drifted')
for (const item of contract.uiStages) {
  const actual = brief.STAGES.find(stage => stage.key === item.key)
  check(actual && actual.label === item.label && actual.short === item.short, 'client stage label drifted: ' + item.key)
  check(actual && (item.subs ? same(actual.subs, item.subs) : !actual.subs), 'client substeps drifted: ' + item.key)
}
check(same(contract.kinds, STAGE_KINDS), 'host kind mapping drifted')
check(same(contract.uiKinds, brief.KIND_STAGE), 'client kind mapping drifted')
check(same(contract.gates, GATE_ROLES), 'host gate roles drifted')
check(contract.stage6 && contract.stage6.implemented === false && contract.stage6.shown === false, 'Stage 6 must stay unimplemented/unshown')

if (failures.length) {
  console.error('stage contract: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('stage contract: PASS (' + contract.uiStages.length + ' UI stages, ' + contract.storeStages.length + ' store stages)')
