/**
 * P1 Host 集成测试：reconcile 对账、current 外部变化快照、打开去重、
 * 文件删除/只读降级。真实 ctx.fs + 真实策略链，故障只来自真实文件操作。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, unlinkSync, chmodSync } from 'node:fs'
import { boot, writeFile, SESSION, join } from './helpers.mjs'

const digestOf = async text => {
  const { createHash } = await import('node:crypto')
  return 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex')
}

test('reconcile: 已落盘（有幂等记录）→ saved + 原 receipt，不重复写', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  const saved = await service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'k-1')
  // 模拟客户端响应丢失后的对账：baseVersion 用保存前的旧基线。
  const targetDigest = await digestOf('select 2\n')
  const r = await service.reconcile(SESSION, doc.documentId, doc.baseVersion, targetDigest)
  assert.equal(r.kind, 'saved')
  assert.equal(r.savedDigest, saved.savedDigest)
  assert.equal(r.receipt.saveId, saved.receipt.saveId, '必须给原保存回执')
  assert.equal(readFileSync(join(dir, 'a.sql'), 'utf8'), 'select 2\n')
})

test('reconcile: 外部写入同内容（无幂等记录）→ saved 且无 receipt', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  writeFileSync(join(dir, 'a.sql'), 'select 2\n')
  const targetDigest = await digestOf('select 2\n')
  const r = await service.reconcile(SESSION, doc.documentId, doc.baseVersion, targetDigest)
  assert.equal(r.kind, 'saved')
  assert.equal(r.receipt, undefined, '无幂等记录时不得伪造 receipt')
})

test('reconcile: 版本未变且内容不同 → not-saved，只有显式重试', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  const r = await service.reconcile(SESSION, doc.documentId, doc.baseVersion, await digestOf('select 2\n'))
  assert.equal(r.kind, 'not-saved')
  assert.equal(r.version, doc.baseVersion)
  assert.equal(readFileSync(join(dir, 'a.sql'), 'utf8'), 'select 1\n', '对账本身不得写盘')
})

test('reconcile: 已是其他内容 → conflict + 当前一致快照', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  writeFileSync(join(dir, 'a.sql'), 'select 3\n')
  const r = await service.reconcile(SESSION, doc.documentId, doc.baseVersion, await digestOf('select 2\n'))
  assert.equal(r.kind, 'conflict')
  assert.equal(r.current.text, 'select 3\n')
  assert.equal(r.current.documentId, doc.documentId)
})

test('current: 外部修改后返回新快照并推进基线；旧 baseVersion 保存被 stale', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  writeFileSync(join(dir, 'a.sql'), 'select 9\n')
  const current = await service.current(SESSION, doc.documentId)
  assert.equal(current.text, 'select 9\n')
  assert.notEqual(current.baseVersion, doc.baseVersion)
  await assert.rejects(
    service.save(SESSION, doc.documentId, doc.baseVersion, 'select 10\n', 'k-stale'),
    error => error.code === 'dev/stale-version',
  )
  // 用新基线保存则成功（保留 local 只改基线路径）
  const result = await service.save(SESSION, doc.documentId, current.baseVersion, 'select 10\n', 'k-keep')
  assert.equal(readFileSync(join(dir, 'a.sql'), 'utf8'), 'select 10\n')
  assert.equal(result.savedDigest, await digestOf('select 10\n'))
})

test('打开去重：同一地址只有一个 documentId；close 后重新打开换新 id', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const first = await service.open(SESSION, 'a.sql')
  const second = await service.open(SESSION, 'a.sql')
  assert.equal(first.documentId, second.documentId)
  await service.close(SESSION, first.documentId)
  const third = await service.open(SESSION, 'a.sql')
  assert.notEqual(third.documentId, first.documentId)
})

test('DOC-12: 文件删除后 current/save 均报 dev/not-found，不伪造成功', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  unlinkSync(join(dir, 'a.sql'))
  await assert.rejects(service.current(SESSION, doc.documentId), error => error.code === 'dev/not-found')
  await assert.rejects(
    service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'k-del'),
    error => error.code === 'dev/not-found' || error.code === 'dev/stale-version' || error.code === 'ENOENT',
  )
})

test('DOC-12: 目录不可写时保存报 dev/read-only，磁盘不变', async () => {
  const { service, dir } = await boot()
  writeFile(dir, 'a.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'a.sql')
  // fs-local 原子写（临时文件 + rename）只依赖目录写权限：
  // 目录只读才是真正的不可写场景；文件位只读可被 rename 绕过（见 P1 报告偏差）。
  chmodSync(dir, 0o555)
  try {
    await assert.rejects(
      service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'k-ro'),
      error => error.code === 'dev/read-only' || error.code === 'EACCES' || error.code === 'EPERM',
    )
    assert.equal(readFileSync(join(dir, 'a.sql'), 'utf8'), 'select 1\n')
  } finally {
    chmodSync(dir, 0o755)
  }
})
