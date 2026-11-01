/** P1 rc.4 Remote 描述符契约：strict 字符串入参与 AbortSignal 取消声明。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const sandbox = { console }
vm.runInNewContext(
  readFileSync(new URL('../src/client/remote.js', import.meta.url), 'utf8'),
  sandbox,
  { filename: 'remote.js' },
)

const descriptors = sandbox.DEV_DOCUMENTS_CONTRIBUTION.descriptors

test('P1 Remote: 五个方法均声明取消位置与 strict lossless 字符串 codec', () => {
  assert.deepEqual(
    Array.from(descriptors, descriptor => descriptor.method),
    ['open', 'save', 'current', 'reconcile', 'close'],
  )
  for (const descriptor of descriptors) {
    assert.deepEqual({ ...descriptor.cancellation }, { parameter: 'signal' })
    assert.equal(descriptor.result.mode, 'src-json')
    assert.ok(descriptor.parameters.length > 0)
    for (const parameter of descriptor.parameters) {
      assert.equal(parameter.codec.mode, 'strict')
      assert.equal(parameter.codec.typeSymbol, '@dataops/dsh-dataops-dev#devDocuments/string')
      const parser = parameter.codec.create()
      assert.equal(parser.parse('workspace-value'), 'workspace-value')
      for (const invalid of [undefined, null, 1, false, {}, []]) {
        assert.throws(() => parser.parse(invalid), /must be a string/)
      }
    }
  }
})
