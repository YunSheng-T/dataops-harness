/**
 * P1 客户端模型单测：完整状态机（DOC-04/05/06/07/08/09/12、UI-06）。
 * 加载真实客户端源码（vm），仅 remote 传输层为显式 fake；
 * 磁盘状态由 fake 持有，用于验证「不盲写、不伪造、草稿不丢」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'

export function loadClient(files) {
  const sandbox = { crypto, TextEncoder, TextDecoder, setTimeout, clearTimeout, console }
  sandbox.globalThis = sandbox
  for (const file of files) {
    vm.runInNewContext(readFileSync(new URL('../src/client/' + file, import.meta.url), 'utf8'), sandbox, { filename: file })
  }
  return sandbox
}

const digest = text => 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex')

function fakeRemote(initial) {
  let versionCounter = 1
  const fake = {
    disk: { text: initial, version: 'v1' },
    saves: [],
    snapshot() {
      return {
        documentId: 'doc-1', fileAddress: '/w/a.sql', contentType: 'text/sql',
        text: fake.disk.text, baseVersion: fake.disk.version, savedDigest: digest(fake.disk.text),
      }
    },
    open: async () => fake.snapshot(),
    current: async () => fake.snapshot(),
    save: async (sessionId, documentId, baseVersion, text, idemKey) => {
      fake.saves.push({ baseVersion, text, idemKey })
      if (baseVersion !== fake.disk.version) throw Object.assign(new Error('stale'), { code: 'dev/stale-version' })
      fake.disk.text = text
      fake.disk.version = 'v' + ++versionCounter
      return { version: fake.disk.version, savedDigest: digest(text), savedAt: new Date().toISOString(), receipt: { saveId: idemKey, savedDigest: digest(text) } }
    },
    reconcile: async (sessionId, documentId, baseVersion, targetDigest) => {
      if (digest(fake.disk.text) === targetDigest) {
        const prior = fake.saves.find(save => digest(save.text) === targetDigest)
        return { kind: 'saved', version: fake.disk.version, savedDigest: targetDigest, receipt: prior ? { saveId: prior.idemKey } : undefined }
      }
      if (fake.disk.version === baseVersion) return { kind: 'not-saved', version: fake.disk.version, currentDigest: digest(fake.disk.text) }
      return { kind: 'conflict', current: fake.snapshot() }
    },
    close: async () => {},
  }
  return fake
}

function makeModel(remote) {
  const { createDocumentModel } = loadClient(['model.js'])
  const model = createDocumentModel({ sessionId: 's1', remote, emit: () => {}, onSubscribe: () => () => {} })
  return model
}

test('DOC-06: 保存期间继续输入，只保存快照 S，新输入 T 仍 dirty', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  let releaseSave
  const realSave = remote.save
  remote.save = (...args) => new Promise(resolve => { releaseSave = () => resolve(realSave(...args)) })
  const saving = model.save()
  model.input('select 2\n-- T\n')
  releaseSave()
  await saving
  assert.equal(remote.saves[0].text, 'select 2\n', '只保存固定快照 S')
  assert.equal(model.state.sync, 'dirty')
  assert.equal(model.state.draft, 'select 2\n-- T\n')
  assert.equal(model.state.baseText, 'select 2\n', '基线只推进到 S')
})

test('DOC-04: 写成功但响应丢失 → save-unknown → reconcile saved，不重复写，原 receipt', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  const realSave = remote.save
  let calls = 0
  remote.save = async (...args) => {
    calls++
    const result = await realSave(...args)
    throw Object.assign(new Error('TRANSPORT lost'), { savedResult: result })
  }
  await model.save()
  assert.equal(model.state.sync, 'clean', '对账确认 saved 后转 clean')
  assert.equal(model.state.savedDigest, digest('select 2\n'))
  assert.equal(calls, 1, '不得盲目重试写入')
  assert.equal(remote.disk.text, 'select 2\n')
  assert.equal(model.state.receipt.saveId, remote.saves[0].idemKey, '使用原回执而非伪造')
})

test('DOC-05: 请求未执行且版本未变 → not-saved → dirty；显式重试复用同一幂等键', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  const realSave = remote.save
  remote.save = async () => { throw new Error('TRANSPORT down') }
  await model.save()
  assert.equal(model.state.sync, 'dirty', 'not-saved 后回到 dirty')
  assert.equal(remote.disk.text, 'select 1\n', '未执行时磁盘不变')
  const keyBefore = model._lastAttempt.idemKey
  remote.save = realSave
  await model.save()
  assert.equal(remote.saves[0].idemKey, keyBefore, '显式重试必须复用同一幂等键')
  assert.equal(model.state.sync, 'clean')
})

test('DOC-07: clean 外部更新 → 安全刷新并提示', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  remote.disk.text = 'select 9\n'
  remote.disk.version = 'v9'
  await model.poll()
  assert.equal(model.state.sync, 'clean')
  assert.equal(model.state.draft, 'select 9\n')
  assert.equal(model.state.notice.kind, 'external-clean')
  assert.equal(model.state.notice.baseText, 'select 1\n')
  assert.equal(model.state.notice.currentText, 'select 9\n')
})

test('DOC-08 + UI-06: dirty 外部更新 → 三方冲突；保留 local 只改基线，不自动落盘', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  remote.disk.text = 'select 3\n'
  remote.disk.version = 'v3'
  await model.poll()
  assert.equal(model.state.sync, 'conflict')
  const c = model.state.conflict
  assert.equal(c.baseText, 'select 1\n')
  assert.equal(c.localText, 'select 2\n')
  assert.equal(c.currentText, 'select 3\n')
  model.keepLocal()
  assert.equal(model.state.sync, 'dirty')
  assert.equal(model.state.draft, 'select 2\n')
  assert.equal(model.state.baseVersion, 'v3', '只改基线为 current')
  assert.equal(remote.disk.text, 'select 3\n', 'keepLocal 不得落盘')
  // 显式保存后以 current 为基线写入
  await model.save()
  assert.equal(remote.disk.text, 'select 2\n')
})

test('冲突：采用 current 回到 clean；手工合并只生成 draft', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  remote.disk.text = 'select 3\n'
  remote.disk.version = 'v3'
  await model.poll()
  model.mergeDraft('select 2\nselect 3\n')
  assert.equal(model.state.sync, 'dirty')
  assert.equal(model.state.draft, 'select 2\nselect 3\n')
  assert.equal(remote.disk.text, 'select 3\n', '合并不落盘')
  remote.disk.text = 'select 4\n'
  remote.disk.version = 'v4'
  await model.poll()
  model.adoptCurrent()
  assert.equal(model.state.sync, 'clean')
  assert.equal(model.state.draft, 'select 4\n')
})

test('DOC-09: hot-exit 磁盘未变恢复 dirty；已变恢复 conflict；均不自动保存', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  const snapshot = await remote.open()
  const restored = { baseDigest: snapshot.savedDigest, baseText: snapshot.text, draftText: 'select 2\n' }
  model.init(snapshot, restored)
  assert.equal(model.state.sync, 'dirty')
  assert.equal(model.state.draft, 'select 2\n')
  assert.equal(remote.saves.length, 0)

  const model2 = makeModel(remote)
  remote.disk.text = 'select 3\n'
  remote.disk.version = 'v3'
  model2.init(await remote.open(), restored)
  assert.equal(model2.state.sync, 'conflict')
  assert.equal(model2.state.conflict.localText, 'select 2\n')
  assert.equal(model2.state.conflict.currentText, 'select 3\n')
  assert.equal(remote.saves.length, 0)
})

test('DOC-12: 保存时权限变只读 → read-only 降级，draft 可导出，不伪造成功', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  remote.save = async () => { throw Object.assign(new Error('EACCES'), { code: 'dev/read-only' }) }
  await model.save()
  assert.equal(model.state.availability, 'read-only')
  assert.equal(model.state.sync, 'dirty')
  assert.equal(model.exportText(), 'select 2\n')
})

test('DOC-12: 文件删除 → missing 降级，draft 保留', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  model.input('select 2\n')
  remote.current = async () => { throw Object.assign(new Error('gone'), { code: 'dev/not-found' }) }
  await model.poll()
  assert.equal(model.state.availability, 'missing')
  assert.equal(model.exportText(), 'select 2\n')
})

test('hotExitRecord: dirty 产生记录，clean 返回 null', async () => {
  const remote = fakeRemote('select 1\n')
  const model = makeModel(remote)
  model.init(await remote.open())
  assert.equal(model.hotExitRecord('scope', 'client'), null)
  model.input('select 2\n')
  const record = model.hotExitRecord('scope', 'client')
  assert.equal(record.draftText, 'select 2\n')
  assert.equal(record.sessionScope, 'scope')
  await model.save()
  assert.equal(model.hotExitRecord('scope', 'client'), null)
})

test('hotExitExpired: TTL 判定', () => {
  const { hotExitExpired } = loadClient(['hotexit.js'])
  const now = Date.now()
  assert.equal(hotExitExpired({ updatedAt: now - 1000 }, now), false)
  assert.equal(hotExitExpired({ updatedAt: now - 8 * 24 * 3600 * 1000 }, now), true)
  assert.equal(hotExitExpired({}, now), true)
})
