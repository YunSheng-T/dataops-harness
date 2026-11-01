/**
 * dataops-dev Client 入口（P1）：挂载 devDocuments Remote 贡献，注册
 * conversation.view（Tabs + 状态机 + 冲突模式）与原生文件预览「在开发中打开」。
 * Chat、Trajectory 与原生右侧栏保持不变；本视图只是并列的第三个视图。
 */
function apply(ctx) {
  // 动态命名空间由本插件挂载，不能在顶层 inject 中声明，否则启动会等待自身。
  // 挂载完成后再开子作用域，Cordis 才允许读取 remote.devDocuments。
  Promise.resolve(ctx.remote.$mount(DEV_DOCUMENTS_CONTRIBUTION)).then(function () {
    ctx.inject(['remote.devDocuments'], applyClient)
  }).catch(function (error) {
    console.error('[dataops-dev] failed to mount devDocuments remote contribution:', error)
  })
}

function applyClient(ctx) {
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
