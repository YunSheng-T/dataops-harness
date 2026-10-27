#!/usr/bin/env node
/**
 * Static checks for the DataOps workitem v0 file protocol.
 * YAML is checked structurally (no external parser dependency).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const failures = []
const read = path => readFileSync(resolve(root, path), 'utf8')
const check = (ok, message) => { if (!ok) failures.push(message) }
const stages = ['requirement', 'design', 'scheme', 'develop', 'cicd', 'review']
const templateDir = 'workitems/_template'
const files = ['item.yaml', 'intent.md', 'plan.md', 'decision.md']

for (const file of files) check(existsSync(join(root, templateDir, file)), `template missing ${file}`)
check(existsSync(join(root, templateDir, 'deliverables')), 'template missing deliverables/')
check(existsSync(join(root, templateDir, 'evidence')), 'template missing evidence/')

const item = read(join(templateDir, 'item.yaml'))
for (const token of ['id:', 'title:', 'type: delivery', 'status:', 'stage:', 'stages:', 'deliverables:', 'gaps:', 'approvals:', 'next:']) {
  check(item.includes(token), `template item.yaml missing ${token}`)
}
for (const stage of stages) check(item.includes(stage + ':'), `template item.yaml missing stage ${stage}`)
for (const status of ['pending', 'in_progress', 'blocked', 'awaiting_approval', 'done']) {
  check(item.includes(status), `template item.yaml missing stage status ${status}`)
}
check(item.includes('gate: release'), 'template item.yaml missing release gate')
check(item.includes('deliverable: null'), 'template item.yaml missing stage deliverable')

const protocol = read('.agents/skills/workitem-protocol/SKILL.md')
check(protocol.includes('Delivery overlay'), 'workitem-protocol missing delivery overlay')
check(protocol.includes('stage') && protocol.includes('stages'), 'workitem-protocol missing stage fields')
check(protocol.includes('workitems/_template'), 'workitem-protocol missing template reference')

const deliverableSkill = read('.agents/skills/dataops-deliverable-templates/SKILL.md')
check(deliverableSkill.includes('dataops_shared_present_deliverable'), 'deliverable templates missing presenter call')
check(deliverableSkill.includes('dataops_requirement_extract_spec') && deliverableSkill.includes('不要调用'), 'deliverable templates missing legacy-tool guard')

const workflow = read('.agents/skills/dataops-workflow/SKILL.md')
check(workflow.includes('workitems/_template'), 'dataops-workflow missing template reference')
check(workflow.includes('item.yaml') && workflow.includes('stages'), 'dataops-workflow missing workitem state fields')
check(workflow.includes('恢复'), 'dataops-workflow missing resume rule')

const preset = read('packages/dataops-preset/cordis.patch.yml')
check(preset.includes('workitems/'), 'preset persona missing workitems path')
check(preset.includes('item.yaml'), 'preset persona missing item.yaml')

// Validate any real workitem beside the template with the same minimal contract.
const workitemsDir = resolve(root, 'workitems')
const actual = readdirSync(workitemsDir).filter(name => name !== '_template' && name !== 'README.md')
  .filter(name => statSync(join(workitemsDir, name)).isDirectory())
for (const name of actual) {
  const file = join(workitemsDir, name, 'item.yaml')
  check(existsSync(file), `${name}: missing item.yaml`)
  if (!existsSync(file)) continue
  const text = readFileSync(file, 'utf8')
  check(/^id:\s*\S+/mu.test(text), `${name}: missing id`)
  check(/^type:\s*delivery/mu.test(text), `${name}: type must be delivery`)
  check(/^stage:\s*(requirement|design|scheme|develop|cicd|review)/mu.test(text), `${name}: invalid stage`)
  for (const stage of stages) check(text.includes(stage + ':'), `${name}: missing stage ${stage}`)
  const refs = new Set()
  for (const match of text.matchAll(/^\s*-\s+((?:deliverables|artifacts)\/[^\s#]+)/gmu)) refs.add(match[1])
  for (const match of text.matchAll(/^\s*(?:artifact|deliverable):\s+((?:deliverables|artifacts)\/[^\s#]+)/gmu)) refs.add(match[1])
  for (const match of text.matchAll(/^\s*-\s+(evidence\/[^\s#]+)/gmu)) refs.add(match[1])
  for (const ref of refs) check(existsSync(join(workitemsDir, name, ref)), `${name}: referenced file missing ${ref}`)
}

if (failures.length) {
  console.error('dataops workitem: FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('dataops workitem ok: template + delivery overlay + resume wiring')
