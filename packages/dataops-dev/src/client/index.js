/**
 * dataops-dev Client 入口（P1）：挂载 devDocuments Remote 贡献，注册
 * conversation.view（Tabs + 状态机 + 冲突模式）与原生文件预览「在开发中打开」。
 * Chat、Trajectory 与原生右侧栏保持不变；本视图只是并列的第三个视图。
 */
function apply(ctx) {
  // 挂载 Remote 贡献；视图注册不等它——调用发生在用户动作时，届时挂载已结算。
  Promise.resolve(ctx.remote.$mount(DEV_DOCUMENTS_CONTRIBUTION)).catch(function (error) {
    console.error('[dataops-dev] failed to mount devDocuments remote contribution:', error)
  })

  var pending = createPendingLocations()
  var hotExit = createHotExit()
  var clientInstance = crypto.randomUUID()
  var controllers = new Map()

  function tabsControllerFor(sessionId) {
    var controller = controllers.get(sessionId)
    if (controller === undefined) {
      var sessionScope = 'session:' + sessionId
      controller = createTabsController({
        sessionId: sessionId,
        sessionScope: sessionScope,
        remote: devDocumentsRemote(ctx.remote),
        hotExit: hotExit,
        clientInstance: clientInstance,
      })
      controllers.set(sessionId, controller)
      hotExit.prune(sessionScope)
    }
    return controller
  }

  ctx.slots.inject('conversation.view', function () {
    var view = createDataDevelopmentView(React)
    return ctx.slots.register({
      name: 'conversation.view',
      id: 'dataops-dev',
      order: 20,
      label: function () { return '开发' },
      inject: function (sessionId) {
        var controller = tabsControllerFor(sessionId)
        return {
          sessionId: sessionId,
          hooks: {
            devTabs: controller.source,
            devPending: pending.source,
          },
          openLocation: controller.openLocation,
          activateTab: controller.activate,
          closeTab: controller.closeTab,
          pollActive: controller.pollActive,
          persistAll: controller.persistAll,
          consumePending: function () { pending.consume(sessionId) },
        }
      },
    }, view.DataDevelopmentView)
  })

  // 原生文件预览工具栏入口：deliverables 卡片先进入原生预览，同样可达。
  ctx.slots.inject('sidebar.right.tab.document.actions', function () {
    var action = createDevOpenAction(React)
    return ctx.slots.register({
      name: 'sidebar.right.tab.document.actions',
      id: 'dataops-dev-open',
      order: 20,
      inject: function (sessionId) {
        return {
          openInDev: function (path) {
            pending.set(sessionId, { fileAddress: path, source: 'preview' })
            ctx.uiConversation.binding(sessionId).activate('dataops-dev')
          },
        }
      },
    }, action.DevOpenAction)
  })
}

exports.apply = apply
exports.inject = ['slots', 'remote', 'uiConversation']
