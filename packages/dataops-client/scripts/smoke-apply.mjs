// Wiring smoke for lib/client.js: execute the built module loader bundle with a
// fake Cordis context and assert every native seat gets its registration.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

let factory
const documentStub = {
  getElementById: () => null,
  createElement: () => ({ setAttribute() {}, textContent: '' }),
  head: { appendChild() {} }
}
const sandbox = {
  window: { __ModuleLoader__: { load: ({ factory: captured }) => { factory = captured } } },
  document: documentStub,
  Symbol,
  console
}
vm.createContext(sandbox)
vm.runInContext(code, sandbox)
if (typeof factory !== 'function') throw new Error('module loader factory was not registered')

const React = {
  Fragment: 'Fragment',
  createElement: (type, props, ...children) => ({ type, props, children }),
  useEffect() {},
  useState: value => [value, () => {}],
  useMemo: value => value(),
  useCallback: value => value,
  useRef: value => ({ current: value }),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
}
const module = factory(specifier => {
  if (specifier === 'react') return React
  if (specifier === 'react-dom') return { createPortal: node => node }
  throw new Error('unexpected host module: ' + specifier)
})

const registrations = []
const injections = []
const tabTypes = []
const definitions = []
const services = {
  sidebarRightTabs: { register: definition => { tabTypes.push(definition); return () => {} } },
  uiConversation: { events: { register: definition => { definitions.push(definition); return () => {} } } }
}
const ctx = {
  slots: {
    inject(name, callback) {
      injections.push(name)
      return callback()
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    }
  },
  get(name) { return services[name] },
  effect(callback) { return callback() }
}

module.apply(ctx)

const byName = name => registrations.filter(item => item.options.name === name)
const failures = []
const expect = (condition, message) => { if (!condition) failures.push(message) }

expect(byName('tool.call.toolview').length === 13, 'expected 13 toolview registrations')
expect(byName('conversation.session.header.actions').length === 1, 'expected 1 header chip')
expect(byName('sidebar.right.pane.tab').length === 3, 'expected 3 right-sidebar tab bodies')
expect(byName('conversation.chat.turnTail').length === 1, 'expected 1 turn brief')
expect(tabTypes.length === 3, 'expected 3 right-sidebar tab types')
expect(definitions.length === 1, 'expected 1 conversation definition')
expect(byName('sidebar.right.pane.tab').every(item => tabTypes.some(type => type.id === item.options.key)), 'tab body keys must match type ids')
expect(tabTypes.every(type => Array.isArray(type.guide) && type.guide.length === 1), 'tab types need guide entries')

const toolKeys = byName('tool.call.toolview').map(item => item.options.key).sort()
expect(JSON.stringify(toolKeys) === JSON.stringify(['dataops_cicd_compile', 'dataops_cicd_pipeline', 'dataops_cicd_release', 'dataops_cicd_scan', 'dataops_cicd_test', 'dataops_shared_present_deliverable', 'dataops_shared_read_develop', 'dataops_shared_read_evidence', 'dataops_shared_read_lineage', 'dataops_shared_read_profile', 'dataops_shared_read_table', 'dataops_shared_read_us', 'dataops_shared_stage']), 'unexpected toolview keys: ' + toolKeys.join(','))

if (failures.length) {
  console.error('smoke-apply FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('smoke-apply ok: 13 toolviews · 1 header chip · 3 tabs · 1 turn brief')
console.log('injections:', injections.join(', '))
