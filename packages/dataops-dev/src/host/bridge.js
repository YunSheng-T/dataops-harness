/**
 * dataops-dev UI 写入 bridge：fs/write-intent 瀑布的最外层监听器。
 *
 * 组合合同（rc.4 实测语义，见《上游证据记录.md》偏差③）：
 * - cordis waterfall 外层先执行；observation policy 的监听器从不调 next()，
 *   所以本 bridge 必须以 { prepend: true } 注册，否则永远不会被调用。
 * - DevDocument UI actor（Host 内部签发的一次性能力）→ 校验后返回受限 intent。
 * - Agent / 其他 actor → 一律 next()，落入原生 fs-observation-policy；
 *   不伪造 fs/observed，不以 actor=undefined 绕过，不占用 edit-intent。
 * - bridge 未挂载时，DevDocuments.save 在分发前失败（dev/action-forbidden），
 *   即装配错误安全失败，而不是静默降低防护。
 */

/** UI actor 的标记键（host 内部，不上 wire）。 */
export const DEV_UI_ACTOR = '@dataops/dsh-dataops-dev/ui-actor'

/**
 * 构造一次保存调用的 UI actor。仅由 DevDocuments 服务在 Host 侧创建。
 * @param {string} token 一次性保存能力令牌
 */
export function createUiActor(token) {
  return { [DEV_UI_ACTOR]: { token } }
}

/** 判断 actor 是否携带本插件的 UI 能力标记（不判定真伪，真伪由令牌消费判定）。 */
export function hasUiActorMarker(actor) {
  return typeof actor === 'object' && actor !== null && DEV_UI_ACTOR in actor
}

/**
 * 注册 write-intent bridge。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ claimSaveToken(token: string, targetKey: unknown): { documentId: string } | undefined, baseVersionOf(documentId: string): string | undefined }} store
 * @returns {{ mounted: () => boolean }}
 */
export function applyBridge(ctx, store) {
  let mounted = false
  ctx.effect(() => {
    const dispose = ctx.on('fs/write-intent', async (target, actor, next) => {
      if (!hasUiActorMarker(actor)) return next()
      const pending = store.claimSaveToken(actor[DEV_UI_ACTOR].token, target.targetKey)
      if (pending === undefined) {
        // 无效/已消费/跨文件令牌：拒绝，不落入 next()（那是给其他 actor 的路径）。
        throw Object.assign(new Error('dataops-dev: invalid or consumed save capability'), { code: 'dev/action-forbidden', isDSHRemoteError: true, details: {} })
      }
      const version = store.baseVersionOf(pending.documentId)
      if (version === undefined) {
        throw Object.assign(new Error('dataops-dev: document closed during save'), { code: 'dev/not-found', isDSHRemoteError: true, details: {} })
      }
      return { kind: 'replaceIfVersion', version }
    }, true) // prepend: 必须位于 observation policy 外层
    mounted = true
    return () => { mounted = false; dispose() }
  }, 'dataops-dev: write-intent bridge')
  return { mounted: () => mounted }
}
