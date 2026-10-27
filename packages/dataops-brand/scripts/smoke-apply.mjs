// Wiring smoke for lib/client.js: execute the bundled module with a fake ctx.
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
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } })
}
const module = factory(specifier => {
  if (specifier === 'react') return React
  throw new Error('unexpected host module: ' + specifier)
})

const registrations = []
const ctx = {
  slots: {
    inject(_name, callback) { return callback() },
    register(options, component) { registrations.push({ options, component }); return () => {} }
  }
}
module.apply(ctx)

const names = registrations.map(item => item.options.name).sort()
const expected = ['conversation.hero.brand.mark', 'sidebar.brand.mark', 'sidebar.brand.name']
const failures = []
if (JSON.stringify(names) !== JSON.stringify(expected)) failures.push('unexpected seats: ' + names.join(', '))
if (registrations.some(item => typeof item.component !== 'function')) failures.push('a seat has no component')

if (failures.length) {
  console.error('smoke-apply FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('smoke-apply ok: ' + names.join(' · '))
