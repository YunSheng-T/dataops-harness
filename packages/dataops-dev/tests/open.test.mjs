/** DOC-01 / DOC-10：一致性打开与降级错误。 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { boot, writeFile, withSabotage, SESSION } from './helpers.mjs'
import { DevDocumentStore } from '../src/host/documents.js'

describe('open', () => {
  it('DOC-01a: 读取期间文件被改 → 重读后返回一致快照（版本与内容同源）', async () => {
    const { ctx, dir } = await boot()
    writeFile(dir, 'a.sql', 'select 1\n')
    let sabotaged = false
    const sabotagedFs = withSabotage(ctx.fs, async () => {
      if (!sabotaged) {
        sabotaged = true
        writeFileSync(join(dir, 'a.sql'), 'select 2\n')
      }
    })
    const store = new DevDocumentStore({ maxBytes: 1024 * 1024 })
    const snapshot = await store.open(sabotagedFs, SESSION, dir, 'a.sql')
    // 返回的必须是重读后的一致快照：内容是新内容，版本是读取时刻的版本。
    assert.equal(snapshot.text, 'select 2\n')
    const target = await ctx.fs.resolve(join(dir, 'a.sql'))
    const now = await ctx.fs.stat(target)
    assert.equal(snapshot.baseVersion, String(now.version))
    assert.match(snapshot.savedDigest, /^sha256:/)
  })

  it('DOC-01b: 每次读取都被并发修改 → dev/concurrent-read，绝不返回混版', async () => {
    const { ctx, dir } = await boot()
    writeFile(dir, 'b.sql', 'select 1\n')
    let n = 0
    const sabotagedFs = withSabotage(ctx.fs, async () => {
      n += 1
      writeFileSync(join(dir, 'b.sql'), `select ${n}\n`)
    })
    const store = new DevDocumentStore({ maxBytes: 1024 * 1024 })
    await assert.rejects(store.open(sabotagedFs, SESSION, dir, 'b.sql'), error => error.code === 'dev/concurrent-read')
  })

  it('DOC-10a: 目录与不存在路径分别报 dev/not-regular-file 与 dev/not-found', async () => {
    const { ctx, dir, service } = await boot()
    await assert.rejects(service.open(SESSION, '.'), error => error.code === 'dev/not-regular-file')
    await assert.rejects(service.open(SESSION, 'missing.sql'), error => error.code === 'dev/not-found')
  })

  it('DOC-10b: 末端符号链接被拒绝（不跟随链接保存真实文件）', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'real.sql', 'select 1\n')
    symlinkSync(join(dir, 'real.sql'), join(dir, 'link.sql'))
    await assert.rejects(service.open(SESSION, 'link.sql'), error => error.code === 'dev/not-regular-file')
  })

  it('DOC-10c: 超过大小上限报 dev/too-large，不截断', async () => {
    const { dir, service } = await boot({ maxBytes: 16 })
    writeFile(dir, 'big.sql', 'select 1 -- this line is definitely longer than sixteen bytes\n')
    await assert.rejects(service.open(SESSION, 'big.sql'), error => error.code === 'dev/too-large')
  })

  it('DOC-10d: 非法 UTF-8 报 dev/unsupported-encoding，无替换字符', async () => {
    const { dir, service } = await boot()
    writeFileSync(join(dir, 'bad.sql'), Buffer.from([0x73, 0x65, 0x6c, 0x20, 0xff, 0xfe, 0x0a]))
    await assert.rejects(service.open(SESSION, 'bad.sql'), error => error.code === 'dev/unsupported-encoding')
  })

  it('打开返回 contentType/readOnly/capabilities 合同字段', async () => {
    const { dir, service } = await boot()
    writeFile(dir, 'c.yaml', 'key: value\n')
    const snapshot = await service.open(SESSION, 'c.yaml')
    assert.equal(snapshot.contentType, 'text/yaml')
    assert.equal(snapshot.readOnly, false)
    assert.deepEqual(snapshot.capabilities, { canAnalyze: false, canStructuredEdit: false, allowedActions: [] })
  })
})
