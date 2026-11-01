/**
 * dataops-dev Client 入口：挂载 devDocuments Remote 贡献，注册 conversation.view。
 * Chat、Trajectory 与原生右侧栏保持不变；本视图只是并列的第三个视图。
 */
function apply(ctx) {
  // 挂载 Remote 贡献；视图注册不等它——调用发生在用户动作时，届时挂载已结算。
  // 挂载失败只影响本插件的 Remote 调用，登记失败日志但不拖垮宿主装配。
  Promise.resolve(ctx.remote.$mount(DEV_DOCUMENTS_CONTRIBUTION)).catch(function (error) {
    console.error('[dataops-dev] failed to mount devDocuments remote contribution:', error)
  })
  ctx.slots.inject('conversation.view', function () {
    var view = createDataDevelopmentView(React)
    return ctx.slots.register({
      name: 'conversation.view',
      id: 'dataops-dev',
      order: 20,
      label: function () { return '开发' },
      inject: function (sessionId) {
        return {
          sessionId: sessionId,
          devDocuments: devDocumentsRemote(ctx.remote),
        }
      },
    }, view.DataDevelopmentView)
  })
}

exports.apply = apply
exports.inject = ['slots', 'remote']
