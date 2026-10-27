/**
 * Turn brief: renders the six-stage strip at the end of a turn and is the
 * only writer of the per-session context/stage stores.
 *
 * It captures every dataops tool payload from the turn, so cards that never
 * mounted (PTC, collapsed transcript) still populate the right-sidebar tabs.
 *
 * Seat: `conversation.chat.turnTail` (single, session scope) + a
 * ConversationNodeDefinition registered on `ctx.uiConversation.events`.
 */
export function createStageBrief(React, store, contextStore) {
  var h = React.createElement
  var TURN_KEY = 'dataops-stage'
  var DATA_KINDS = { intake: 1, requirement: 1, design: 1, table: 1, lineage: 1, tech_plan: 1, evidence: 1, profile: 1, analysis: 1, solution: 1, develop: 1, cicd: 1, schedule: 1, test: 1, release: 1, postmortem: 1, incident: 1, workitem: 1 }

  var STAGES = [
    { key: 'requirement', label: '需求', short: '需求', next: '进入数据设计' },
    { key: 'design', label: '设计', short: '设计', next: '进入方案' },
    { key: 'scheme', label: '方案', short: '方案', next: '开始开发', subs: ['数据挖掘', '数据分析', '需求方案设计', '技术方案输出'] },
    { key: 'develop', label: '开发', short: '开发', next: '进入 CICD' },
    { key: 'cicd', label: 'CICD', short: 'CICD', next: 'Stage 5 结束；Stage 6 不在本版', subs: ['扫描', '编译构建', '测试', '发布/部署'] }
  ]
  var KIND_STAGE = {
    intake: 'requirement',
    requirement: 'requirement',
    design: 'design',
    profile: 'scheme',
    analysis: 'scheme',
    solution: 'scheme',
    tech_plan: 'scheme',
    develop: 'develop',
    cicd: 'cicd',
    schedule: 'cicd',
    test: 'cicd',
    release: 'cicd',
    postmortem: 'review'
  }
  var SUBSTAGES = {
    profile: { label: '数据挖掘', index: 1, total: 4 },
    analysis: { label: '数据分析', index: 2, total: 4 },
    solution: { label: '需求方案设计', index: 3, total: 4 },
    tech_plan: { label: '技术方案输出', index: 4, total: 4 },
    cicd: { label: '扫描', index: 1, total: 4 },
    schedule: { label: '编译构建', index: 2, total: 4 },
    test: { label: '测试', index: 3, total: 4 },
    release: { label: '发布/部署', index: 4, total: 4 }
  }
  var TOTAL = STAGES.length

  function stageOf(kind) {
    var stageKey = KIND_STAGE[kind]
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === stageKey) return i
    return -1
  }

  function toneOf(status) {
    if (status === 'blocked' || status === 'error' || status === 'failed') return 'warn'
    if (status === 'done' || status === 'applied' || status === 'verified') return 'pass'
    return 'brand'
  }

  function briefFrom(payload) {
    if (!payload || typeof payload !== 'object') return null
    var kind = payload.kind === 'stage' ? payload.stage : payload.kind
    if (kind === 'incident') {
      return {
        key: 'incident', label: '排障', short: '排障', index: 0, total: 0,
        next: '修复并验证', tone: 'warn', status: payload.status || '处理中',
        artifact: payload.artifact || 'incident.yaml',
        target: payload.target || (payload.impact && payload.impact.top && payload.impact.top[0] ? payload.impact.top[0].table : null)
      }
    }
    var index = stageOf(kind)
    if (index < 0) return null
    var stage = STAGES[index]
    var sub = SUBSTAGES[kind] || null
    return {
      key: stage.key,
      label: stage.label,
      short: stage.short,
      index: index + 1,
      total: TOTAL,
      next: stage.next,
      tone: toneOf(payload.status),
      status: payload.status || 'draft',
      artifact: payload.artifact || (kind === 'design' ? 'design.yaml' : null),
      target: (payload.target && payload.target.table) || null,
      substage: sub ? sub.label : null,
      subIndex: sub ? sub.index : 0,
      subTotal: sub ? sub.total : 0,
      subs: stage.subs || []
    }
  }

  function textParts(blocks) {
    if (!blocks) return []
    if (typeof blocks === 'string') return [blocks]
    if (!Array.isArray(blocks)) return []
    var out = []
    for (var i = 0; i < blocks.length; i++) if (blocks[i] && typeof blocks[i].text === 'string') out.push(blocks[i].text)
    return out
  }

  function parsePayload(blocks) {
    var parts = textParts(blocks)
    for (var i = parts.length - 1; i >= 0; i--) {
      var text = String(parts[i]).trim()
      if (text.charAt(0) !== '{') continue
      try {
        var parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && DATA_KINDS[parsed.kind]) return parsed
      } catch (error) { /* not our payload */ }
    }
    return null
  }

  function parseBrief(blocks) {
    return briefFrom(parsePayload(blocks))
  }

  function definition() {
    var currentTurn = 0
    return {
      kind: TURN_KEY,
      match: function (event) {
        if (!event) return null
        if (event.type === 'turn/start') {
          var turn = event.data && event.data.turn
          if (Number.isSafeInteger(turn) && turn >= 0) currentTurn = turn
          else if (turn !== undefined && Number.isSafeInteger(Number(turn))) currentTurn = Number(turn)
          return { id: String(currentTurn), role: 'start' }
        }
        if (event.type === 'tool/call' || event.type === 'tool/result') return { id: String(currentTurn), role: 'update' }
        return null
      },
      start: function () {
        return { turn: currentTurn, brief: null, payloads: {} }
      },
      update: function (context, match) {
        var state = (context && context.state) || { turn: currentTurn, brief: null, payloads: {} }
        var event = (match && match.event) || {}
        if (event.type !== 'tool/result') return state
        var data = event.data || {}
        var message = data.message || {}
        var payload = parsePayload(message.content || data.content)
        if (!payload) return state
        var payloads = Object.assign({}, state.payloads || {})
        payloads[payload.kind] = payload
        return { turn: state.turn, brief: briefFrom(payload) || state.brief, payloads: payloads }
      },
      buildLocationData: function (context, scope) {
        if (scope !== 'turn' || !context || !context.state) return null
        var turn = Number(context.state.turn)
        if (!Number.isSafeInteger(turn) || turn < 0) return null
        return {
          kind: 'turn',
          turn: turn,
          key: TURN_KEY,
          value: { brief: context.state.brief, payloads: context.state.payloads || {} }
        }
      }
    }
  }

  function readValue(props) {
    var turn = props.turn
    var data = turn && turn.data
    if (data && typeof data.get === 'function') return data.get(TURN_KEY) || null
    if (data && data[TURN_KEY]) return data[TURN_KEY]
    return null
  }

  function readBrief(props) {
    if (props.brief) return props.brief
    var value = readValue(props)
    return value && value.brief ? value.brief : null
  }

  function readPayloads(props) {
    if (props.payloads) return props.payloads
    var value = readValue(props)
    return (value && value.payloads) || {}
  }

  function actionId() {
    return 'ui-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  function emitCompose(text) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dataops:compose', { detail: { text: String(text) } }))
    }
  }

  function gateSpec(stage, substage) {
    if (stage === 'requirement') return { gate: 'requirement', kind: 'requirement', label: '需求', roles: [
      { key: 'ba', label: 'BA', action: 'BA 签收', actor: '陈璐' },
      { key: 'requester', label: '需求方', action: '需求方确认', actor: '渠道运营', comment: '接受 mock 假设与阈值，后续阶段复核' }
    ] }
    if (stage === 'design') return { gate: 'design', kind: 'design', label: '设计', roles: [{ key: 'ba', label: 'BA', action: 'BA 签收', actor: '陈璐' }] }
    if (stage === 'scheme') {
      if (substage === 'solution') return { gate: 'scheme.solution', kind: 'solution', label: '3b 需求方案', roles: [{ key: 'ba', label: 'BA', action: 'BA 签收', actor: '陈璐' }] }
      if (substage === 'tech_plan') return { gate: 'scheme.tech_plan', kind: 'tech_plan', label: '3c 技术方案', roles: [{ key: 'se', label: 'SE', action: 'SE 确认', actor: '王工' }] }
      return { gate: 'scheme.analysis', kind: 'analysis', label: '3a 分析', roles: [{ key: 'ba', label: 'BA', action: 'BA 签收', actor: '陈璐' }] }
    }
    if (stage === 'develop') return { gate: 'develop.code_review', kind: 'develop', label: '开发验证', roles: [
      { key: 'se', label: 'SE', action: 'SE 通过', actor: '王工' },
      { key: 'committer', label: 'Committer', action: '记录合入', actor: '代码平台' }
    ] }
    if (stage === 'cicd') return { gate: 'cicd.pipeline', kind: 'cicd', label: '数据 CICD', roles: [] }
    return null
  }

  function buildAction(payloads, sessionId) {
    var stored = contextStore && typeof contextStore.get === 'function' ? contextStore.get(sessionId) : null
    var all = Object.assign({}, stored || {}, payloads || {})
    var workitem = all.workitem || null
    var stage = workitem && workitem.stage
    var substage = workitem && (workitem.substage || (workitem.stages && workitem.stages.scheme && workitem.stages.scheme.substage))
    if (!stage) {
      var latest = all.tech_plan || all.solution || all.analysis || all.design || all.requirement
      if (!latest || latest.kind === 'intake') return null
      stage = latest.kind === 'requirement' ? 'requirement' : latest.kind === 'design' ? 'design' : 'scheme'
      substage = latest.kind === 'analysis' ? 'analysis' : latest.kind === 'solution' ? 'solution' : latest.kind === 'tech_plan' ? 'tech_plan' : null
    }
    var spec = gateSpec(stage, substage)
    if (!spec) return null
    var payload = all[spec.kind] || null
    if (!payload) return null
    var approval = workitem && Array.isArray(workitem.approvals) ? workitem.approvals.filter(function (a) { return a && a.gate === spec.gate })[0] : null
    var signed = {}
    if (approval && Array.isArray(approval.signoffs)) approval.signoffs.forEach(function (s) { if (s && s.role) signed[s.role] = true })
    var pending = spec.roles.filter(function (role) { return !signed[role.key] })
    if (!pending.length && spec.gate !== 'cicd.pipeline') return null
    var blocking = (spec.gate === 'scheme.analysis' || spec.gate === 'scheme.solution') && (payload.status === 'blocked' || (Array.isArray(payload.gaps) && payload.gaps.some(function (g) { return g && g.severity === 'blocking' })))
    return { spec: spec, payload: payload, pending: pending, blocking: blocking, workitem: workitem }
  }

  function enrichedCardPayload(action) {
    var payload = Object.assign({}, action.payload || {})
    var review = Object.assign({}, payload.review || {})
    var signed = {}
    var approvals = action.workitem && Array.isArray(action.workitem.approvals) ? action.workitem.approvals : []
    approvals.forEach(function (approval) {
      if (!approval || approval.gate !== action.spec.gate || !Array.isArray(approval.signoffs)) return
      approval.signoffs.forEach(function (signoff) {
        if (signoff && signoff.role) signed[String(signoff.role).toLowerCase()] = signoff
      })
    })
    Object.keys(signed).forEach(function (role) {
      var current = review[role]
      review[role] = Object.assign({}, typeof current === 'object' && current ? current : { status: current }, { status: 'approved', approver: signed[role].actor || (current && current.approver) })
    })
    payload.review = review
    return payload
  }

  function ActionDock(props) {
    var action = props.action
    var draftedState = React.useState(null)
    if (!action) return null
    var drafted = draftedState[0]
    function choose(role) {
      draftedState[1](role.key)
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('dataops:signoff-request', { detail: { gate: action.spec.gate, role: role.key, actor: role.actor, comment: role.comment || null } }))
        return
      }
      var text = '【签收】gate=' + action.spec.gate + ' role=' + role.key + ' actionId=' + actionId() + ' actor=' + role.actor + (role.comment ? ' comment=' + role.comment : '')
      if (typeof props.compose === 'function') props.compose(text)
      else emitCompose(text)
    }
    return h('div', { className: 'do-gatedock', 'data-gate': action.spec.gate },
      h('div', { className: 'do-gatedock-head' },
        h('span', { className: 'do-dot', 'data-tone': action.blocking ? 'warn' : 'brand' }),
        h('span', { className: 'do-gatedock-title' }, '当前门禁 · ' + action.spec.label),
        h('span', { className: 'do-gatedock-meta' }, drafted ? '已写入草稿' : (action.blocking ? '有待关闭缺口' : (action.pending.length + ' 个待签角色')))
      ),
      drafted
        ? h('div', { className: 'do-gatedock-drafted' }, '已写入输入框。确认后发送，再继续下一步签收。')
        : h('div', { className: 'do-gatedock-roles' },
          action.blocking
            ? h('button', { type: 'button', className: 'do-gatedock-btn', 'data-variant': 'primary', onClick: function () { draftedState[1]('supplement'); if (typeof props.compose === 'function') props.compose('补充 mock 证据：用 closed 证据重新评估当前阶段缺口，保留 mock 标记'); else emitCompose('补充 mock 证据：用 closed 证据重新评估当前阶段缺口，保留 mock 标记') } }, '补充 mock 证据')
            : null,
          action.pending.map(function (role) {
            return h('button', {
              key: role.key,
              type: 'button',
              className: 'do-gatedock-btn',
              'data-variant': role.key === 'requester' ? 'primary' : 'outline',
              onClick: function () { choose(role) }
            }, role.action)
          })
        )
    )
  }

  function statusLabel(status) {
    return ({ draft: '草稿', reviewed: '已复核', blocked: '阻塞', approved: '已签收', returned: '已退回', passed: '已通过' })[status] || status || '草稿'
  }

  function stageCards(payloads, stageKey) {
    if (stageKey === 'requirement') return [payloads.requirement].filter(Boolean)
    if (stageKey === 'design') return [payloads.design].filter(Boolean)
    if (stageKey === 'scheme') return [payloads.analysis, payloads.solution, payloads.tech_plan].filter(Boolean)
    if (stageKey === 'develop') return [payloads.develop].filter(Boolean)
    if (stageKey === 'cicd') return [payloads.cicd].filter(Boolean)
    return []
  }

  function StageNavigator(props) {
    var sessionId = props.sessionId || (props.session && props.session.id)
    var get = function () { return contextStore && sessionId ? contextStore.get(sessionId) : null }
    var stored = null
    if (typeof React.useSyncExternalStore === 'function' && contextStore && typeof contextStore.subscribe === 'function') {
      stored = React.useSyncExternalStore(contextStore.subscribe, get)
    } else stored = get()
    var payloads = Object.assign({}, stored || {}, props.payloads || {})
    var workitem = payloads.workitem || null
    var currentStage = workitem && workitem.stage
    if (!currentStage) {
      if (payloads.requirement) currentStage = 'requirement'
      else if (payloads.design) currentStage = 'design'
      else if (payloads.analysis || payloads.solution || payloads.tech_plan) currentStage = 'scheme'
    }
    var selectedState = React.useState(currentStage || 'requirement')
    var openState = React.useState(false)
    var viewState = React.useState(null)
    var expandedState = React.useState(props.expanded === true)
    var selected = selectedState[0]
    var open = openState[0]
    var action = buildAction(payloads, sessionId)
    var view = viewState[0]
    var expanded = expandedState[0]
    if (!Object.keys(payloads).length) return null
    function focusCard(kind) {
      if (typeof document === 'undefined') return
      var nodes = document.querySelectorAll('.do-turn-card[data-kind="' + kind + '"]')
      var node = nodes.length ? nodes[nodes.length - 1] : null
      if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    var stageDefs = [['requirement', '需求'], ['design', '设计'], ['scheme', '方案'], ['develop', '开发'], ['cicd', 'CICD']]
    var cardLabels = { requirement: '需求', design: '设计', analysis: '3a 分析', solution: '3b 方案', tech_plan: '3c 技术方案', develop: '开发验证', cicd: '数据 CICD' }
    var subDefs = { scheme: ['数据挖掘', '数据分析', '需求方案设计', '技术方案输出'], cicd: ['扫描', '编译构建', '测试', '发布/部署'] }
    var activeCards = stageCards(payloads, selected)
    return h('div', { className: 'do-stagebar' },
      h('div', { className: 'do-stagebar-head' },
        h('span', { className: 'do-stagebar-title' }, '阶段简报'),
        h('span', { className: 'do-stagebar-hint' }, action ? '当前门禁 · ' + action.spec.label + (action.blocking ? ' · 待补证' : ' · ' + action.pending.length + ' 个待签') : '点击展开阶段导航'),
        h('button', { className: 'do-stagebar-toggle', onClick: function () { expandedState[1](!expanded) } }, expanded ? '收起' : '展开')
      ),
      expanded ? h('div', { className: 'do-stagebar-stages' },
        stageDefs.map(function (def) {
          var cards = stageCards(payloads, def[0])
          var done = workitem && workitem.stages && workitem.stages[def[0]] && workitem.stages[def[0]].status
          var isCurrent = def[0] === currentStage
          var blocked = cards.some(function (c) { return c.status === 'blocked' || ((def[0] === 'scheme') && (c.gaps || []).some(function (g) { return g.severity === 'blocking' })) })
          var approved = done === 'done' || (workitem && Array.isArray(workitem.approvals) && workitem.approvals.some(function (a) { return a && a.gate === def[0] && a.status === 'approved' }))
          return h('button', {
            key: def[0],
            type: 'button',
            className: 'do-stagebar-node',
            'data-stage': def[0],
            'data-current': isCurrent ? 'true' : undefined,
            'data-state': blocked ? 'blocked' : approved ? 'done' : cards.length ? 'draft' : 'empty',
            onClick: function () { selectedState[1](def[0]); openState[1](selected === def[0] ? !open : true) }
          },
            h('span', { className: 'do-stagebar-node-label' }, def[1]),
            h('span', { className: 'do-stagebar-node-meta' }, cards.length ? cards.length + ' 张' : '—'),
            h('span', { className: 'do-stagebar-node-dot' })
          )
        })
      ) : null,
      expanded ? h('div', { className: 'do-stagebar-subs' }, Object.keys(subDefs).map(function (key) {
        return h('div', { key: key, className: 'do-stagebar-subgroup' },
          h('span', { className: 'do-stagebar-sublabel' }, key === 'scheme' ? '方案' : 'CICD'),
          subDefs[key].map(function (label, i) { return h('span', { key: label, className: 'do-stagebar-sub', 'data-active': (key === 'scheme' && currentStage === 'scheme' && i === 0) || (key === 'cicd' && currentStage === 'cicd' && i === 0) ? 'true' : undefined }, label) })
        )
      })) : null,
      expanded && open ? h('div', { className: 'do-stagebar-cards' },
        h('div', { className: 'do-stagebar-cards-head' }, (stageDefs.filter(function (d) { return d[0] === selected })[0] || ['', selected])[1] + ' · ' + activeCards.length + ' 张'),
        activeCards.length ? activeCards.map(function (card) {
          var gate = card.kind === 'analysis' ? 'scheme.analysis' : card.kind === 'solution' ? 'scheme.solution' : card.kind === 'tech_plan' ? 'scheme.tech_plan' : card.kind === 'design' ? 'design' : 'requirement'
          var approval = workitem && Array.isArray(workitem.approvals) ? workitem.approvals.filter(function (a) { return a && a.gate === gate })[0] : null
          var status = approval && approval.status === 'approved' ? 'approved' : card.status === 'blocked' ? 'blocked' : card.status === 'reviewed' ? 'reviewed' : 'draft'
          return h('button', { key: card.kind, type: 'button', className: 'do-stagebar-card', onClick: function () { viewState[1](card) } },
            h('span', { className: 'do-stagebar-card-dot', 'data-state': status }),
            h('span', { className: 'do-stagebar-card-name' }, cardLabels[card.kind] || card.kind),
            h('span', { className: 'do-stagebar-card-status', 'data-state': status }, statusLabel(status)),
            h('span', { className: 'do-stagebar-card-open' }, '展开')
          )
        }) : h('div', { className: 'do-stagebar-empty' }, '该阶段暂无卡片')
      ) : null,
      action && expanded ? h('div', { className: 'do-stagebar-gate' },
        h('span', { className: 'do-stagebar-gate-dot', 'data-state': action.blocking ? 'blocked' : 'pending' }),
        h('span', null, '当前门禁 · ' + action.spec.label),
        h('span', { className: 'do-stagebar-gate-meta' }, action.blocking ? '待补证' : action.pending.length + ' 个待签角色'),
        h('button', { type: 'button', className: 'do-stagebar-view', onClick: function () { viewState[1](action.payload) } }, '查看卡')
      ) : null,
      view ? h('div', { className: 'do-card-modal-mask', onClick: function (e) { if (e.target === e.currentTarget) viewState[1](null) } },
        h('div', { className: 'do-card-modal' },
          h('div', { className: 'do-card-modal-head' },
            h('span', { className: 'do-card-modal-title' }, cardLabels[view.kind] || view.kind || '卡片'),
            h('button', { type: 'button', className: 'do-card-modal-close', onClick: function () { viewState[1](null) } }, '关闭')
          ),
          props.renderCard ? h('div', { className: 'do-card-modal-body' }, h(props.renderCard, { block: { content: [{ type: 'text', text: JSON.stringify(view) }] } })) : h('div', { className: 'do-muted' }, '卡片渲染不可用')
        )
      ) : null
    )
  }

  function CurrentCardDock(props) {
    var sessionId = props.sessionId || (props.session && props.session.id)
    var get = function () { return contextStore && sessionId ? contextStore.get(sessionId) : null }
    var stored = null
    if (typeof React.useSyncExternalStore === 'function' && contextStore && typeof contextStore.subscribe === 'function') {
      stored = React.useSyncExternalStore(contextStore.subscribe, get)
    } else stored = get()
    var action = buildAction(stored || {}, sessionId)
    if (!action || typeof props.renderCard !== 'function') return null
    return h('div', { className: 'do-current-card', 'data-gate': action.spec.gate },
      h('div', { className: 'do-current-card-head' },
        h('span', { className: 'do-dot', 'data-tone': action.blocking ? 'warn' : 'brand' }),
        h('span', { className: 'do-current-card-title' }, '当前阶段卡 · ' + action.spec.label),
        h('span', { className: 'do-current-card-meta' }, action.blocking ? '待补证' : action.pending.length + ' 个待签角色')
      ),
      h('div', { className: 'do-current-card-body' }, h(props.renderCard, { block: { content: [{ type: 'text', text: JSON.stringify(enrichedCardPayload(action)) }] } })),
      h('div', { className: 'do-current-card-foot' }, '这是当前轮可操作的卡；历史 tool 卡保留在思考折叠里作为审计。')
    )
  }

  function TurnTail(props) {
    var brief = readBrief(props)
    var payloads = readPayloads(props)
    var sessionId = props.sessionId
    var action = buildAction(payloads, sessionId)
    var dockKey = action ? action.spec.gate + ':' + (action.blocking ? 'blocked' : action.pending.map(function (r) { return r.key }).join(',')) : 'none'
    var card = action && typeof props.renderCard === 'function'
      ? h('div', { className: 'do-turn-card', 'data-kind': action.spec.kind, 'data-gate': action.spec.gate }, h('div', { className: 'do-turn-card-cap' }, '当前阶段卡 · ' + action.spec.label), h(props.renderCard, { block: { content: [{ type: 'text', text: JSON.stringify(enrichedCardPayload(action)) }] } }))
      : null
    var dock = action && !card && !props.suppressDock ? h(ActionDock, { key: dockKey, action: action, compose: props.compose }) : null

    if (typeof React.useEffect === 'function' && typeof window !== 'undefined' && typeof props.compose === 'function') {
      React.useEffect(function () {
        var previous = window.__dataopsCompose
        window.__dataopsCompose = props.compose
        return function () { if (window.__dataopsCompose === props.compose) window.__dataopsCompose = previous }
      }, [sessionId, props.compose])
    }

    if (typeof React.useEffect === 'function') {
      React.useEffect(function () {
        if (!sessionId) return
        if (brief) store.set(sessionId, brief)
        Object.keys(payloads).forEach(function (kind) {
          if (contextStore) contextStore.ingest(sessionId, payloads[kind])
        })
      }, [
        sessionId,
        brief && brief.key,
        brief && brief.status,
        payloads.requirement,
        payloads.design,
        payloads.table,
        payloads.lineage,
        payloads.tech_plan,
        payloads.evidence,
        payloads.profile,
        payloads.analysis,
        payloads.solution,
        payloads.develop,
        payloads.cicd,
        payloads.schedule,
        payloads.test,
        payloads.release,
        payloads.postmortem,
        payloads.workitem
      ])
    }

    if (!brief && !action) return null

    if (!brief) return h('div', { className: 'do-turn-tail' }, card, dock)

    if (brief.total === 0) {
      return h('div', { className: 'do-brief' },
        h('div', { className: 'do-brief-head' },
          h('span', { className: 'do-dot', 'data-tone': brief.tone }),
          h('span', { className: 'do-brief-title' }, '排障简报'),
          h('span', { className: 'do-brief-sub' }, brief.status || '处理中')
        ),
        h('div', { className: 'do-substage-groups' },
        STAGES.filter(function (stage) { return stage.subs; }).map(function (stage) {
          var stageIndex = 0
          for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === stage.key) stageIndex = i + 1
          return h('div', { key: 'subgroup-' + stage.key, className: 'do-substage-group' },
            h('span', { className: 'do-substage-label' }, stage.label),
            stage.subs.map(function (label, i) {
              var state = stageIndex < brief.index ? 'done' : (stageIndex === brief.index ? (i + 1 < brief.subIndex ? 'done' : (i + 1 === brief.subIndex ? 'active' : 'pending')) : 'pending')
              return h('span', { key: 'sub' + i, className: 'do-substage', 'data-s': state }, label)
            })
          )
        })
      ),
      h('div', { className: 'do-brief-next' }, '下一步 ', h('b', null, brief.next),
          brief.target ? ' · ' + brief.target : ''),
        brief.artifact ? h('div', { className: 'do-brief-foot' }, '留档 ' + brief.artifact) : null
      )
    }

    return h('div', { className: 'do-turn-tail' }, card)
  }

  return {
    TURN_KEY: TURN_KEY,
    STAGES: STAGES,
    definition: definition,
    TurnTail: TurnTail,
    CurrentCardDock: CurrentCardDock,
    StageNavigator: StageNavigator,
    _internals: { stageOf: stageOf, briefFrom: briefFrom, parsePayload: parsePayload, parseBrief: parseBrief, DATA_KINDS: DATA_KINDS }
  }
}
