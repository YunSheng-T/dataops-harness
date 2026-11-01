/** DOC-02 / DOC-03 / DOC-11：受防护保存、竞争与幂等。 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { boot, writeFile, SESSION } from './helpers.mjs'
import { digestText } from '../src/host/digest.js'

describe('save', () => {
  it('DOC-02: 正常保存返回真实新 version / savedDigest / receipt，磁盘内容一致', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'a.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'a.sql')
    const result = await service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'key-1')
    assert.notEqual(result.version, doc.baseVersion)
    assert.equal(result.savedDigest, digestText('select 2\n'))
    assert.equal(result.receipt.documentId, doc.documentId)
    assert.match(result.receipt.saveId, /.+/)
    assert.equal(readFileSync(join(dir, 'a.sql'), 'utf8'), 'select 2\n')
  })

  it('DOC-03: 保存前外部写入 → dev/stale-version，磁盘保持外部内容', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'b.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'b.sql')
    writeFileSync(join(dir, 'b.sql'), 'select external\n')
    await assert.rejects(
      service.save(SESSION, doc.documentId, doc.baseVersion, 'select mine\n', 'key-2'),
      error => error.code === 'dev/stale-version',
    )
    assert.equal(readFileSync(join(dir, 'b.sql'), 'utf8'), 'select external\n')
  })

  it('客户端基线过期（未落盘但 Host 基线已前进）→ dev/stale-version，不发起写入', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'c.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'c.sql')
    const first = await service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'key-3')
    // 客户端仍拿旧 baseVersion 再保存：
    await assert.rejects(
      service.save(SESSION, doc.documentId, doc.baseVersion, 'select 3\n', 'key-4'),
      error => error.code === 'dev/stale-version',
    )
    assert.equal(readFileSync(join(dir, 'c.sql'), 'utf8'), 'select 2\n')
    // 用新基线可以续存：
    const second = await service.save(SESSION, doc.documentId, first.version, 'select 3\n', 'key-5')
    assert.equal(second.savedDigest, digestText('select 3\n'))
  })

  it('DOC-11: 同幂等键同内容返回原结果；同键不同内容报 dev/idempotency-conflict', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'd.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'd.sql')
    const first = await service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'key-6')
    const replay = await service.save(SESSION, doc.documentId, doc.baseVersion, 'select 2\n', 'key-6')
    assert.equal(replay.receipt.saveId, first.receipt.saveId)
    assert.equal(replay.version, first.version)
    await assert.rejects(
      service.save(SESSION, doc.documentId, first.version, 'select different\n', 'key-6'),
      error => error.code === 'dev/idempotency-conflict',
    )
    assert.equal(readFileSync(join(dir, 'd.sql'), 'utf8'), 'select 2\n')
  })

  it('并发保存两个文档互不阻塞，同一文档串行', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'e1.sql', 'select 1\n')
    writeFile(dir, 'e2.sql', 'select 1\n')
    const d1 = await service.open(SESSION, 'e1.sql')
    const d2 = await service.open(SESSION, 'e2.sql')
    const [r1, r2] = await Promise.all([
      service.save(SESSION, d1.documentId, d1.baseVersion, 'select 11\n', 'k-e1'),
      service.save(SESSION, d2.documentId, d2.baseVersion, 'select 22\n', 'k-e2'),
    ])
    assert.equal(readFileSync(join(dir, 'e1.sql'), 'utf8'), 'select 11\n')
    assert.equal(readFileSync(join(dir, 'e2.sql'), 'utf8'), 'select 22\n')
    assert.notEqual(r1.version, r2.version)
  })

  it('跨 sessionId 使用他人 documentId 保存被拒绝', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'f.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'f.sql')
    await assert.rejects(
      service.save('other-session', doc.documentId, doc.baseVersion, 'select 9\n', 'key-7'),
      error => error.code === 'dev/not-found',
    )
  })
})
