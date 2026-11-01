/** P1 深链 focus：非法输入返回 null，视图调用方据此保持当前文档。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const sandbox = { console }
vm.runInNewContext(
  readFileSync(new URL('../src/client/location.js', import.meta.url), 'utf8'),
  sandbox,
  { filename: 'location.js' },
)

test('UI-03: 非法、超长、错误版本和缺失地址的 focus 均不跳转', () => {
  const invalid = [
    undefined,
    null,
    '',
    '{bad json',
    'null',
    '{}',
    JSON.stringify({ v: 2, fileAddress: '/w/other.sql' }),
    JSON.stringify({ v: 1 }),
    JSON.stringify({ v: 1, fileAddress: '' }),
    'x'.repeat(4097),
  ]
  for (const focus of invalid) assert.equal(sandbox.decodeLocation(focus), null)
})

test('UI-01: 合法 focus 保留文件、范围与来源，由 Host 重新做权限校验', () => {
  const focus = sandbox.encodeLocation({
    fileAddress: '/w/a.sql', line: 8, column: 3, entityRef: 'entity:a', source: 'chat',
  })
  const decoded = sandbox.decodeLocation(focus)
  assert.equal(decoded.fileAddress, '/w/a.sql')
  assert.equal(decoded.line, 8)
  assert.equal(decoded.column, 3)
  assert.equal(decoded.entityRef, 'entity:a')
  assert.equal(decoded.source, 'chat')
})
