/** P1 回归：UI 保存必须携带当前 Session 的 sandbox policy，而非进程默认根。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { boot, writeFile, SESSION } from './helpers.mjs'

function installSandbox(ctx, dir, { live = true, mode = 'workspace-write' } = {}) {
  const session = { id: SESSION, header: { cwd: dir } }
  const policy = {
    workspaceRoot: '/process-default-root',
    resolve(request = {}) {
      if (request.session) return { mode, workspaceRoot: request.session.header.cwd, sessionId: request.session.id }
      return { mode, workspaceRoot: this.workspaceRoot }
    },
  }
  ctx.provide('sandboxPolicy', policy)
  ctx.provide('sessions', { get: id => live && id === SESSION ? session : undefined })
  if (!live) ctx.provide('sessionPersistence', { stat: async id => id === SESSION ? { header: session.header } : undefined })

  const writeText = ctx.fs.writeText.bind(ctx.fs)
  const calls = []
  ctx.fs.writeText = async (target, content, expected, signal, executionPolicy) => {
    calls.push(executionPolicy)
    if (executionPolicy?.mode === 'read-only' || executionPolicy?.workspaceRoot !== dir) {
      throw Object.assign(new Error('sandbox denied'), { code: 'FS_SANDBOX_DENIED' })
    }
    return writeText(target, content, expected, signal, executionPolicy)
  }
  return calls
}

test('P1 跨工作区：workspace-write 保存传递 live Session 的 cwd，不使用进程默认根', async () => {
  const { ctx, dir, service } = await boot()
  const calls = installSandbox(ctx, dir)
  writeFile(dir, 'live.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'live.sql')
  await service.save(SESSION, doc.documentId, doc.baseVersion, 'select live\n', 'live-key')
  assert.equal(readFileSync(join(dir, 'live.sql'), 'utf8'), 'select live\n')
  assert.deepEqual(calls, [{ mode: 'workspace-write', workspaceRoot: dir, sessionId: SESSION }])
})

test('P1 跨工作区：冷 Session 从持久化 header 恢复 policy cwd', async () => {
  const { ctx, dir, service } = await boot()
  const calls = installSandbox(ctx, dir, { live: false })
  writeFile(dir, 'cold.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'cold.sql')
  await service.save(SESSION, doc.documentId, doc.baseVersion, 'select cold\n', 'cold-key')
  assert.equal(readFileSync(join(dir, 'cold.sql'), 'utf8'), 'select cold\n')
  assert.deepEqual(calls, [{ mode: 'workspace-write', workspaceRoot: dir }])
})

test('P1 权限拒绝：FS_SANDBOX_DENIED 是确定性 dev/read-only，不落盘也不误报未知', async () => {
  const { ctx, dir, service } = await boot()
  const calls = installSandbox(ctx, dir, { mode: 'read-only' })
  writeFile(dir, 'denied.sql', 'select 1\n')
  const doc = await service.open(SESSION, 'denied.sql')
  await assert.rejects(
    service.save(SESSION, doc.documentId, doc.baseVersion, 'select denied\n', 'denied-key'),
    error => error.code === 'dev/read-only',
  )
  assert.equal(readFileSync(join(dir, 'denied.sql'), 'utf8'), 'select 1\n')
  assert.equal(calls.length, 1)
})
