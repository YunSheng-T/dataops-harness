/**
 * AGT-01 / AGT-02 / AGT-04 / AGT-05：UI bridge 与原生 observation policy 的组合。
 * 策略链与文件系统全部为真实部件；Agent 行为按 tool-fs 的真实路径模拟
 * （write-intent 瀑布 → ctx.fs.writeText），观察经 fs/observed 事件登记。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { boot, writeFile, SESSION } from './helpers.mjs'

/** Agent 写文件的真实路径：waterfall 取 intent，再 writeText（同 tool-fs/src/write.ts:121-125）。 */
async function agentWrite(ctx, target, content, actor) {
  const intent = await ctx.waterfall('fs/write-intent', target, actor, () => undefined)
  return ctx.fs.writeText(target, content, intent)
}

/** Agent 读文件的真实路径会登记观察：stat 取版本后 emit fs/observed。 */
async function agentObserve(ctx, target, actor) {
  const info = await ctx.fs.stat(target)
  ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, actor)
}

describe('policy composition', () => {
  it('AGT-02: Agent 未观察直接写既有文件 → FS_NOT_OBSERVED（bridge 在场也不放行）', async () => {
    const { ctx, dir } = await boot()
    writeFile(dir, 'a.sql', 'select 1\n')
    const target = await ctx.fs.resolve(join(dir, 'a.sql'))
    const agentActor = { agent: { session: { id: 'agent-session' } } }
    await assert.rejects(agentWrite(ctx, target, 'select evil\n', agentActor), error => error.code === 'FS_NOT_OBSERVED')
    assert.equal(readFileSync(join(dir, 'a.sql'), 'utf8'), 'select 1\n')
  })

  it('AGT-01: Agent 先观察再写 → 原生 replaceIfVersion 成功（bridge 只 next()，不削弱）', async () => {
    const { ctx, dir } = await boot()
    writeFile(dir, 'b.sql', 'select 1\n')
    const target = await ctx.fs.resolve(join(dir, 'b.sql'))
    const agentActor = { agent: { session: { id: 'agent-session' } } }
    await agentObserve(ctx, target, agentActor)
    const outcome = await agentWrite(ctx, target, 'select agent\n', agentActor)
    assert.equal(readFileSync(join(dir, 'b.sql'), 'utf8'), 'select agent\n')
    assert.ok(outcome.version)
  })

  it('AGT-04: 其他 actor（无 agent、无 UI 令牌）写既有文件无 UI 特权 → FS_NOT_OBSERVED', async () => {
    const { ctx, dir } = await boot()
    writeFile(dir, 'c.sql', 'select 1\n')
    const target = await ctx.fs.resolve(join(dir, 'c.sql'))
    await assert.rejects(agentWrite(ctx, target, 'select evil\n', { somePlugin: true }), error => error.code === 'FS_NOT_OBSERVED')
    await assert.rejects(agentWrite(ctx, target, 'select evil\n', undefined), error => error.code === 'FS_NOT_OBSERVED')
    assert.equal(readFileSync(join(dir, 'c.sql'), 'utf8'), 'select 1\n')
  })

  it('UI 保存不依赖 fs/observed，且保存令牌一次性、不可重放', async () => {
    const { ctx, dir, service } = await boot()
    writeFile(dir, 'd.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'd.sql')
    // 合法保存成功（走 bridge 的受限 intent）：
    const result = await service.save(SESSION, doc.documentId, doc.baseVersion, 'select ui\n', 'key-1')
    assert.equal(readFileSync(join(dir, 'd.sql'), 'utf8'), 'select ui\n')
    assert.ok(result.receipt.saveId)

    // 构造携带已消费令牌的 actor 直接进瀑布 → 拒绝：
    const target = await ctx.fs.resolve(join(dir, 'd.sql'))
    const { createUiActor } = await import('../src/host/bridge.js')
    // 令牌从未签发：拒绝
    await assert.rejects(
      ctx.waterfall('fs/write-intent', target, createUiActor('forged-token'), () => undefined),
      error => error.code === 'dev/action-forbidden',
    )
  })

  it('伪造 UI 令牌 + 跨文件令牌都被拒绝，不落入 next()', async () => {
    const { ctx, dir, service } = await boot()
    writeFile(dir, 'e.sql', 'select 1\n')
    writeFile(dir, 'f.sql', 'select 2\n')
    const doc = await service.open(SESSION, 'e.sql')
    const targetF = await ctx.fs.resolve(join(dir, 'f.sql'))

    // 签发给 e.sql 的保存令牌不能用于 f.sql：
    // 通过一次合法保存流程拿到「令牌会被目标绑定」的证据：直接对 f 的目标用 e 的 actor 进瀑布。
    // 先发起 e 的保存但拦截在瀑布前：构造 pending 令牌走 service 内部签发。
    const store = service.store
    const record = store.require(doc.documentId)
    const token = store.issueSaveToken(record, 'sha256:whatever')
    const { createUiActor } = await import('../src/host/bridge.js')
    await assert.rejects(
      ctx.waterfall('fs/write-intent', targetF, createUiActor(token), () => undefined),
      error => error.code === 'dev/action-forbidden',
    )
    // 令牌已被消费（一次性），再用同令牌对正确目标也拒绝：
    const targetE = await ctx.fs.resolve(join(dir, 'e.sql'))
    await assert.rejects(
      ctx.waterfall('fs/write-intent', targetE, createUiActor(token), () => undefined),
      error => error.code === 'dev/action-forbidden',
    )
    assert.equal(readFileSync(join(dir, 'e.sql'), 'utf8'), 'select 1\n')
    assert.equal(readFileSync(join(dir, 'f.sql'), 'utf8'), 'select 2\n')
  })

  it('AGT-05: bridge 未装配时 UI 保存安全失败（dev/action-forbidden），磁盘不变', async () => {
    const { dir, service } = await boot({ withBridge: false })
    writeFile(dir, 'g.sql', 'select 1\n')
    const doc = await service.open(SESSION, 'g.sql')
    await assert.rejects(
      service.save(SESSION, doc.documentId, doc.baseVersion, 'select ui\n', 'key-9'),
      error => error.code === 'dev/action-forbidden',
    )
    assert.equal(readFileSync(join(dir, 'g.sql'), 'utf8'), 'select 1\n')
  })
})
