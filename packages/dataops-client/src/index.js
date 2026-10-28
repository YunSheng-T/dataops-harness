/**
 * Client entry for the dataops workbench plugin.
 *
 * Every registration lands in a native DSH seat; disabling this plugin must
 * leave the stock interface unchanged:
 *   - tool.call.toolview                stage cards (requirement/design/…)
 *   - conversation.session.header.actions  "设计 · 2/6" beside the title
 *   - sidebarRightTabs + sidebar.right.pane.tab  asset/lineage/evidence tabs
 *   - conversation.chat.turnTail        end-of-turn stage brief
 */
var TOOL_VIEWS = [
  ['dataops_shared_read_us', 'USPickerCard'],
  ['dataops_shared_read_stage', 'StageResultCard'],
  ['dataops_shared_read_develop', 'DevelopCard'],
  ['dataops_shared_read_table', 'TableCard'],
  ['dataops_shared_read_lineage', 'LineageCard'],
  ['dataops_shared_read_evidence', 'EvidenceCard'],
  ['dataops_shared_read_profile', 'ProfileCard'],
  ['dataops_cicd_scan', 'CicdCard'],
  ['dataops_cicd_compile', 'ScheduleCard'],
  ['dataops_cicd_test', 'TestCard'],
  ['dataops_cicd_release', 'ReleaseCard'],
  ['dataops_cicd_pipeline', 'PipelineCard'],
  ['dataops_shared_present_deliverable', 'DeliverableRenderer'],
  ['dataops_shared_stage', 'StageResultCard']
]

function apply(ctx) {
  if (typeof document !== 'undefined') Cards.installStyles(document)
  var slots = ctx.slots
  if (slots === undefined) return

  // Cards can ask the right sidebar to reveal a tab without owning that service.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    var onOpenTab = function (event) {
      var sidebar = typeof ctx.get === 'function' ? ctx.get('sidebarRight') : ctx.sidebarRight
      if (sidebar && typeof sidebar.openTab === 'function' && event && event.detail) sidebar.openTab(event.detail.kind)
    }
    if (typeof ctx.effect === 'function') {
      ctx.effect(function () {
        window.addEventListener('dataops:open-tab', onOpenTab)
        return function () { window.removeEventListener('dataops:open-tab', onOpenTab) }
      }, 'dataops open tab')
    } else {
      window.addEventListener('dataops:open-tab', onOpenTab)
    }
  }

  // Card actions only draft a normal user turn; they never call a Host tool directly.
  function onCompose(event) {
    var text = event && event.detail && event.detail.text
    if (!text) return
    if (typeof window.__dataopsCompose === 'function') {
      try { window.__dataopsCompose(text); return } catch (error) { /* fall through */ }
    }
    var input = document.querySelector('[role="textbox"][contenteditable="true"]')
    if (!input) {
      if (navigator.clipboard) navigator.clipboard.writeText(text)
      return
    }
    input.focus()
    // Card actions replace the current draft instead of appending to it. The
    // previous behavior concatenated two signoff receipts when both roles were
    // clicked before sending (OPEN-008). Select-all/delete works with the
    // contenteditable editor; the explicit fallback covers editors that ignore
    // execCommand while keeping the final draft single-message.
    try {
      document.execCommand('selectAll', false, null)
      document.execCommand('delete', false, null)
      document.execCommand('insertText', false, text)
    } catch (error) {
      /* fall through to the explicit replacement */
    }
    var current = String(input.innerText || input.textContent || '')
    if (current.indexOf(text) < 0) input.textContent = text
    var inputEvent = typeof InputEvent === 'function'
      ? new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })
      : new Event('input', { bubbles: true })
    input.dispatchEvent(inputEvent)
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    if (typeof ctx.effect === 'function') {
      ctx.effect(function () {
        window.addEventListener('dataops:compose', onCompose)
        return function () { window.removeEventListener('dataops:compose', onCompose) }
      }, 'dataops compose bridge')
    } else {
      window.addEventListener('dataops:compose', onCompose)
    }
  }

  // 1) Stage cards inside the transcript.
  for (var i = 0; i < TOOL_VIEWS.length; i++) {
    (function (pair) {
      slots.inject('tool.call.toolview', function () {
        return slots.register({ name: 'tool.call.toolview', key: pair[0] }, Cards[pair[1]])
      })
    })(TOOL_VIEWS[i])
  }

  // 2) Early draft bridge. Tool cards can be clicked before the turnTail
  // mounts; this session-scoped, zero-DOM slot entry registers the native
  // setDraft once the composer exists, so card actions never append.
  function DraftBridge(props) {
    var session = props && props.session
    var sessionId = session && session.id
    if (typeof React !== 'undefined' && typeof React.useEffect === 'function' && sessionId) {
      React.useEffect(function () {
        var previous = window.__dataopsCompose
        var set = function (text) {
          try {
            var sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : null
            var conversation = typeof ctx.get === 'function' ? ctx.get('conversation') : null
            var scope = sessions && typeof sessions.scope === 'function' ? sessions.scope(sessionId) : null
            var input = conversation && conversation.input && scope && typeof conversation.input.for === 'function' ? conversation.input.for(scope) : null
            if (input && typeof input.setDraft === 'function') {
              input.setDraft(String(text))
              if (typeof input.focus === 'function') input.focus()
              return true
            }
          } catch (error) { /* fall through to onCompose DOM fallback */ }
          return false
        }
        var submit = function (text) {
          var ok = false
          try {
            var sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : null
            var conversation = typeof ctx.get === 'function' ? ctx.get('conversation') : null
            var scope = sessions && typeof sessions.scope === 'function' ? sessions.scope(sessionId) : null
            var input = conversation && conversation.input && scope && typeof conversation.input.for === 'function' ? conversation.input.for(scope) : null
            if (input && typeof input.setDraft === 'function') {
              input.setDraft(String(text))
              if (typeof input.focus === 'function') input.focus()
              // The Lexical draft projection settles on the next paint.
              // Click the native send button after the draft is visible: this is
              // the same path a human uses and works across Lexical versions.
              window.setTimeout(function () {
                try {
                  var button = Array.prototype.slice.call(document.querySelectorAll('button')).reverse().find(function (candidate) {
                    var label = ((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.textContent || '')).trim()
                    return /发送|send/i.test(label) && !candidate.disabled
                  })
                  if (button) button.click()
                  else if (typeof input.submit === 'function') input.submit('queue', 'click')
                } catch (error) { /* keep the visible draft */ }
              }, 80)
              ok = true
            }
          } catch (error) { ok = false }
          return ok
        }
        window.__dataopsCompose = set
        window.__dataopsSubmit = submit
        return function () {
          if (window.__dataopsCompose === set) window.__dataopsCompose = previous
          if (window.__dataopsSubmit === submit) window.__dataopsSubmit = null
        }
      }, [sessionId])
    }
    return null
  }
  slots.inject('conversation.input.dock', function () {
    return slots.register({ name: 'conversation.input.dock', id: '@dataops/dsh-dataops-client-draft-bridge' }, DraftBridge)
  })

  // Signoff confirmation lives outside the card so every card (including a
  // folded historical card) uses one visible, auditable confirmation surface.
  function SignoffRequestHost() {
    var requestState = React.useState(null)
    var request = requestState[0]
    React.useEffect(function () {
      var onRequest = function (event) {
        var detail = (event && event.detail) || {}
        if (!detail.gate || !detail.role) return
        var id = 'ui-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
        requestState[1]({ gate: String(detail.gate), role: String(detail.role), actor: String(detail.actor || detail.role), comment: detail.comment ? String(detail.comment) : null, actionId: id })
      }
      window.addEventListener('dataops:signoff-request', onRequest)
      return function () { window.removeEventListener('dataops:signoff-request', onRequest) }
    }, [])
    if (!request) return null
    var text = '【签收】gate=' + request.gate + ' role=' + request.role + ' actionId=' + request.actionId + ' actor=' + request.actor + (request.comment ? ' comment=' + request.comment : '')
    function sendViaAgent() {
      if (typeof window.__dataopsCompose === 'function') window.__dataopsCompose(text)
      else if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('dataops:compose', { detail: { text: text } }))
      requestState[1](null)
      window.setTimeout(function () {
        try {
          var button = Array.prototype.slice.call(document.querySelectorAll('button')).reverse().find(function (candidate) {
            var label = ((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.textContent || '')).trim()
            return /发送|send/i.test(label) && !candidate.disabled
          })
          if (button) button.click()
          else if (typeof window.__dataopsSubmit === 'function') window.__dataopsSubmit(text)
        } catch (error) { /* leave the visible draft for manual Enter */ }
      }, 140)
    }
    function fill() {
      var workitemId = typeof window !== 'undefined' ? window.__dataopsActiveWorkitemId : null
      if (!workitemId || typeof fetch !== 'function') { sendViaAgent(); return }
      requestState[1](null)
      fetch('/api/dataops/signoff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workitemId: workitemId, gate: request.gate, role: request.role, comment: request.comment, actionId: request.actionId })
      }).then(function (response) {
        if (!response.ok) throw new Error('signoff route ' + response.status)
        return response.json()
      }).then(function (body) {
        if (!body || body.ok !== true) throw new Error('signoff route rejected')
        window.dispatchEvent(new CustomEvent('dataops:signoff-recorded', { detail: { workitem: body.workitem } }))
      }).catch(function () { sendViaAgent() })
    }
    function copy() {
      if (navigator.clipboard) navigator.clipboard.writeText(text)
    }
    return React.createElement('div', { className: 'do-signoff-host-mask', onClick: function (e) { if (e.target === e.currentTarget) requestState[1](null) } },
      React.createElement('div', { className: 'do-signoff-host' },
        React.createElement('div', { className: 'do-signoff-host-head' },
          React.createElement('span', { className: 'do-signoff-host-title' }, '确认签收'),
          React.createElement('button', { type: 'button', className: 'do-signoff-host-x', onClick: function () { requestState[1](null) } }, '关闭')
        ),
        React.createElement('div', { className: 'do-signoff-host-meta' }, request.gate + ' · ' + request.role + ' · ' + request.actor),
        React.createElement('div', { className: 'do-signoff-host-label' }, '将写入输入框的正常用户消息'),
        React.createElement('pre', { className: 'do-signoff-host-preview' }, text),
        React.createElement('div', { className: 'do-signoff-host-actions' },
          React.createElement('button', { type: 'button', className: 'do-signoff-host-btn', onClick: copy }, '复制回执'),
          React.createElement('button', { type: 'button', className: 'do-signoff-host-btn', onClick: function () { requestState[1](null) } }, '取消'),
          React.createElement('button', { type: 'button', className: 'do-signoff-host-btn do-signoff-host-primary', onClick: fill }, '签收并提交')
        )
      )
    )
  }
  slots.inject('conversation.input.dock', function () {
    return slots.register({ name: 'conversation.input.dock', id: '@dataops/dsh-dataops-client-signoff-host', order: 20 }, SignoffRequestHost)
  })
  slots.inject('conversation.input.dock', function () {
    function Navigator(props) {
      return Brief.StageNavigator(Object.assign({}, props, { sessionId: props.sessionId || (props.session && props.session.id), renderCard: Cards.DeliverableRenderer }))
    }
    return slots.register({
      name: 'conversation.input.dock',
      id: '@dataops/dsh-dataops-client-stage-navigator',
      order: 10,
      inject: function (sessionId) { return { sessionId: sessionId } }
    }, Navigator)
  })

  // 3) Stage chip beside the Session title.
  slots.inject('conversation.session.header.actions', function () {
    return slots.register({
      name: 'conversation.session.header.actions',
      id: 'dataops-stage',
      order: 20,
      inject: function (sessionId) { return { sessionId: sessionId } }
    }, HeaderStage)
  })

  // 3) Right-sidebar tabs. The service arrives with ui-sidebar-right, which may
  //    activate after this plugin; wait for it instead of probing once.
  function registerTabs(tabsContext) {
    var tabs = tabsContext.sidebarRightTabs
    if (!tabs || typeof tabs.register !== 'function') return
    Tabs.tabs.forEach(function (item) {
      var registerType = function () { return tabs.register(item.definition) }
      if (typeof tabsContext.effect === 'function') tabsContext.effect(registerType, 'dataops tab type ' + item.definition.kind)
      else registerType()
      slots.inject('sidebar.right.pane.tab', function () {
        return slots.register({
          name: 'sidebar.right.pane.tab',
          key: item.body.key,
          inject: function (sessionId) { return { sessionId: sessionId } }
        }, item.body.Component)
      })
    })
  }
  if (typeof ctx.inject === 'function') ctx.inject(['sidebarRightTabs'], registerTabs)
  else registerTabs({ sidebarRightTabs: typeof ctx.get === 'function' ? ctx.get('sidebarRightTabs') : ctx.sidebarRightTabs, effect: ctx.effect })

  function applyDraft(sessionId, text) {
    try {
      var sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : null
      var conversation = typeof ctx.get === 'function' ? ctx.get('conversation') : null
      var scope = sessions && sessionId && typeof sessions.scope === 'function' ? sessions.scope(sessionId) : null
      var input = conversation && conversation.input && scope && typeof conversation.input.for === 'function'
        ? conversation.input.for(scope)
        : null
      if (!input || typeof input.setDraft !== 'function') return false
      input.setDraft(String(text))
      if (typeof input.focus === 'function') input.focus()
      return true
    } catch (error) {
      return false
    }
  }

  // 4) End-of-turn brief. Same late-service problem as the tab registry.
  function registerBrief(conversationContext) {
    var conversation = conversationContext.uiConversation
    if (!conversation || !conversation.events || typeof conversation.events.register !== 'function') return
    var registerDefinition = function () { return conversation.events.register(Brief.definition()) }
    if (typeof conversationContext.effect === 'function') conversationContext.effect(registerDefinition, 'dataops turn definition')
    else registerDefinition()
    slots.inject('conversation.chat.turnTail', function () {
      function TurnTail(props) {
        var sessionId = props.sessionId
        var compose = function (text) {
          if (applyDraft(sessionId, text)) return
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('dataops:compose', { detail: { text: String(text) } }))
          }
        }
        return Brief.TurnTail(Object.assign({}, props, { compose: compose, renderCard: Cards.DeliverableRenderer }))
      }
      return slots.register({
        name: 'conversation.chat.turnTail',
        id: '@dataops/dsh-dataops-client',
        inject: function (sessionId) { return { sessionId: sessionId } }
      }, TurnTail)
    })
  }
  if (typeof ctx.inject === 'function') ctx.inject(['uiConversation'], registerBrief)
  else registerBrief({ uiConversation: typeof ctx.get === 'function' ? ctx.get('uiConversation') : ctx.uiConversation, effect: ctx.effect })
}

exports.apply = apply
exports.inject = ['slots']
