/**
 * P1 Tabs 控制器单测（UI-02 重复打开聚焦、tab 关闭与 hot-exit 持久化）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'

const digest = text => 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex')

function loadTabs() {
  const sandbox = { crypto, TextEncoder, TextDecoder, setTimeout, clearTimeout, console }
  sandbox.globalThis = sandbox
  for (const file of ['model.js', 'tabs.js']) {
    vm.runInNewContext(readFileSync(new URL('../src/client/' + file, import.meta.url), 'utf8'), sandbox, { filename: file })
  }
  return sandbox
}

function fakeRemote() {
  return {
    open: async (sessionId, path) => ({
      documentId: 'doc:' + path, fileAddress: path, contentType: 'text/sql',
      text: 'select 1\n', baseVersion: 'v1', savedDigest: digest('select 1\n'),
    }),
    current: async () => { throw new Error('no poll in test') },
    close: async () => {},
  }
}

function fakeHotExit() {
  const records = new Map()
  return {
    records,
    get: async (scope, address) => records.get(scope + '\n' + address),
    put: async record => { records.set(record.sessionScope + '\n' + record.fileAddress, record) },
    remove: async (scope, address) => { records.delete(scope + '\n' + address) },
    prune: async () => {},
  }
}

function makeController() {
  const { createTabsController } = loadTabs()
  const hotExit = fakeHotExit()
  const controller = createTabsController({
    sessionId: 's1', sessionScope: 'scope:s1', remote: fakeRemote(),
    hotExit, clientInstance: 'client-1',
  })
  return { controller, hotExit }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 10))

test('UI-02: 同一地址重复打开聚焦已有 tab，不创建第二个 buffer', async () => {
  const { controller } = makeController()
  controller.openLocation({ fileAddress: '/w/a.sql' })
  await flush()
  controller.openLocation({ fileAddress: '/w/a.sql' })
  await flush()
  controller.openLocation({ fileAddress: '/w/b.sql' })
  await flush()
  const state = controller.source.getSnapshot()
  assert.equal(state.tabs.length, 2)
  assert.equal(state.activeAddress, '/w/b.sql')
  controller.openLocation({ fileAddress: '/w/a.sql' })
  await flush()
  assert.equal(controller.source.getSnapshot().tabs.length, 2, '重复打开不新增 tab')
  assert.equal(controller.source.getSnapshot().activeAddress, '/w/a.sql')
})

test('tab 内输入保持 dirty；关闭 tab 后 active 正确切换', async () => {
  const { controller } = makeController()
  controller.openLocation({ fileAddress: '/w/a.sql' })
  await flush()
  controller.openLocation({ fileAddress: '/w/b.sql' })
  await flush()
  controller.activeModel().input('select 2\n')
  assert.equal(controller.activeModel().state.sync, 'dirty')
  controller.closeTab('/w/b.sql')
  const state = controller.source.getSnapshot()
  assert.equal(state.tabs.length, 1)
  assert.equal(state.activeAddress, '/w/a.sql')
})

test('hot-exit：dirty 持久化记录，clean 后清除', async () => {
  const { controller, hotExit } = makeController()
  controller.openLocation({ fileAddress: '/w/a.sql' })
  await flush()
  controller.activeModel().input('select 2\n')
  controller.persistAll()
  assert.equal(hotExit.records.size, 1)
  const record = hotExit.records.get('scope:s1\n/w/a.sql')
  assert.equal(record.draftText, 'select 2\n')
  assert.equal(record.clientInstance, 'client-1')
  // 保存成功后 clean → persist 清除记录
  controller.activeModel().state = Object.assign({}, controller.activeModel().state, { sync: 'clean' })
  controller.persistAll()
  assert.equal(hotExit.records.size, 0)
})
