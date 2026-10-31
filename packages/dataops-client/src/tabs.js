/**
 * Right-sidebar tabs: 资产 / 血缘 / 证据.
 *
 * Each tab is a page kind registered through `ctx.sidebarRightTabs.register`,
 * with its body on the keyed `sidebar.right.pane.tab` slot. Bodies read the
 * per-session context store that the turn definition fills from tool results;
 * they never fetch and never invent data.
 */
export function createDataopsTabs(React, contextStore, LineageFlow) {
  var Flow = LineageFlow || { LineageWorkbench: function () { return null } }
  var h = React.createElement
  var PREFIX = '@dataops/dsh-dataops-client/'

  function useContext(sessionId) {
    if (typeof React.useSyncExternalStore === 'function') {
      return React.useSyncExternalStore(
        contextStore.subscribe,
        function () { return contextStore.get(sessionId) }
      )
    }
    var state = React.useState(contextStore.get(sessionId))
    React.useEffect(function () {
      return contextStore.subscribe(function () { state[1](contextStore.get(sessionId)) })
    }, [sessionId])
    return state[0]
  }

  function Empty(props) {
    return h('div', { className: 'do-ctx' },
      h('div', { className: 'do-ctx-head' },
        h('span', { className: 'do-dot', 'data-tone': 'muted' }),
        h('span', { className: 'do-ctx-title' }, props.title || '还没有上下文')),
      h('div', { className: 'do-ctx-sub', style: { marginTop: '6px' } },
        props.hint || '让 Agent 调用 dataops_design_compose_model / dataops_shared_read_table / dataops_shared_read_lineage 后，这里会自动填充。')
    )
  }

  function CtxCard(props) {
    return h('div', { className: 'do-ctx' },
      h('div', { className: 'do-ctx-head' },
        h('span', { className: 'do-dot', 'data-tone': props.tone || 'brand' }),
        h('span', { className: 'do-ctx-title' }, props.title)),
      props.sub ? h('div', { className: 'do-ctx-sub' }, props.sub) : null,
      props.children
    )
  }

  function Field(props) {
    return h('div', { className: 'do-field' },
      h('span', { className: 'do-fn' }, props.name),
      h('span', { className: 'do-ft' }, props.type))
  }

  function SourceRow(props) {
    return h('div', { className: 'do-field' },
      h('span', { className: 'do-fn' }, props.table),
      h('span', { className: 'do-ft' }, [props.owner, props.rowCount === null || props.rowCount === undefined ? null : props.rowCount + ' 行'].filter(Boolean).join(' · ') || '—'))
  }

  function AssetBody(props) {
    var context = useContext(props.sessionId) || {}
    var table = context.table
    var design = context.design
    if (!table && !design) {
      return h(Empty, { title: '还没有资产上下文' })
    }
    var target = table || {
      table: design.target.table,
      owner: design.target.owner || '—',
      layer: '—',
      grain: design.target.grain,
      partition: design.target.partition,
      rowCount: null,
      columns: []
    }
    return h('div', null,
      h(CtxCard, {
        title: target.table,
        sub: [target.layer, target.grain, target.partition ? '分区 ' + target.partition : null].filter(Boolean).join(' · ')
      },
        target.columns && target.columns.length
          ? h('div', { className: 'do-fields' }, target.columns.map(function (column) {
            return h(Field, { key: column.name, name: column.name, type: column.type + (column.comment ? ' · ' + column.comment : '') })
          }))
          : h('div', { className: 'do-ctx-sub', style: { marginTop: '8px' } }, '字段信息待补充')
      ),
      design && design.sources && design.sources.length
        ? h(CtxCard, { title: '来源表', sub: design.sources.length + ' 个' },
          h('div', { className: 'do-fields' }, design.sources.map(function (source) {
            return h(SourceRow, { key: source.table, table: source.table, owner: source.owner, rowCount: source.rowCount })
          }))
        )
        : null,
      design && design.partial ? h('div', { className: 'do-ctx-sub', style: { marginTop: '8px' } }, '部分字段待补充（见设计卡缺口）') : null
    )
  }

  function shortLabel(value, max) {
    var text = String(value || '')
    return text.length > max ? text.slice(0, max - 1) + '…' : text
  }

  function layerOf(table) {
    var prefix = String(table || '').split('.')[0].toLowerCase()
    if (prefix === 'ods') return 'ODS'
    if (prefix === 'dwd') return 'DWD'
    if (prefix === 'dws') return 'DWS'
    if (prefix === 'ads') return 'ADS'
    if (prefix === 'dim') return 'DIM'
    if (prefix === 'src') return 'SRC'
    if (prefix === 'api') return 'API'
    if (prefix === 'rpt' || prefix === 'report') return 'RPT'
    if (prefix === 'archive') return 'ADS'
    if (prefix === 'fct' || prefix === 'fact') return 'FACT'
    return 'TABLE'
  }

  function layoutGraph(target, nodes, edges, truncated, synthetic) {
    if (!target) return { target: '', nodes: [], edges: [], layers: [], truncated: false, synthetic: false }
    var seen = {}
    var unique = []
    nodes.forEach(function (node) {
      if (!node.table || seen[node.table]) return
      seen[node.table] = true
      unique.push(node)
    })
    if (!seen[target]) {
      seen[target] = true
      unique.unshift({ table: target, type: 'table', owner: '本次' })
    }
    var layer = {}
    layer[target] = 0
    for (var pass = 0; pass < 8; pass++) {
      edges.forEach(function (edge) {
        if (layer[edge.from] !== undefined && layer[edge.to] === undefined) layer[edge.to] = layer[edge.from] + 1
        if (layer[edge.to] !== undefined && layer[edge.from] === undefined) layer[edge.from] = layer[edge.to] - 1
      })
    }
    unique.forEach(function (node) { if (layer[node.table] === undefined) layer[node.table] = 0 })
    var buckets = {}
    unique.forEach(function (node) {
      var key = String(layer[node.table])
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(node)
    })
    var layerKeys = Object.keys(buckets).map(Number).sort(function (a, b) { return a - b })
    var maxCount = Math.max.apply(null, layerKeys.map(function (key) { return buckets[String(key)].length }))
    var nodeW = 132
    var nodeH = 34
    var gapX = 14
    var gapY = 30
    var width = Math.max(330, maxCount * nodeW + (maxCount - 1) * gapX + 28)
    var height = Math.max(100, layerKeys.length * (nodeH + gapY) + 26)
    var positions = {}
    var displayNodes = []
    layerKeys.forEach(function (key, row) {
      var bucket = buckets[String(key)]
      var total = bucket.length * nodeW + (bucket.length - 1) * gapX
      var startX = (width - total) / 2
      bucket.forEach(function (node, index) {
        var x = startX + index * (nodeW + gapX)
        var y = 13 + row * (nodeH + gapY)
        positions[node.table] = { x: x, y: y, w: nodeW, h: nodeH, layer: key }
        displayNodes.push(node)
      })
    })
    var displayEdges = edges.filter(function (edge) { return positions[edge.from] && positions[edge.to] })
    return {
      target: target,
      nodes: displayNodes,
      edges: displayEdges,
      layers: layerKeys,
      width: width,
      height: height,
      positions: positions,
      truncated: !!truncated,
      synthetic: !!synthetic
    }
  }

  function buildGraph(lineage, design) {
    var target = lineage ? lineage.table : (design && design.target && design.target.table)
    var nodes = []
    var edges = []
    if (lineage) {
      nodes = (lineage.nodes || []).map(function (node) { return { table: node.table, type: node.type, owner: node.owner } })
      edges = (lineage.edges || []).map(function (edge) { return { from: edge.from, to: edge.to, kind: edge.kind } })
    } else if (design && design.impact) {
      nodes = [{ table: target, type: 'table', owner: '本次' }].concat((design.impact.top || []).map(function (item) {
        return { table: item.table, type: item.type, owner: item.owner }
      }))
      edges = (design.impact.top || []).map(function (item) {
        return { from: target, to: item.table, kind: 'impact' }
      })
    }
    return layoutGraph(target, nodes, edges, !!(lineage && lineage.truncated), !lineage)
  }

  function buildDesignGraph(design) {
    if (!design || !design.target || !design.target.table) return null
    var target = design.target.table
    var nodes = [{ table: target, type: 'table', owner: '本次' }]
    var edges = []
    var sources = design.sources || []
    sources.forEach(function (source) {
      nodes.push({ table: source.table, type: 'table', owner: source.owner || '—' })
      edges.push({ from: source.table, to: target, kind: 'task' })
    })
    if (!sources.length && design.impact) {
      (design.impact.top || []).forEach(function (item) {
        nodes.push({ table: item.table, type: item.type, owner: item.owner })
        edges.push({ from: target, to: item.table, kind: 'impact' })
      })
    }
    return layoutGraph(target, nodes, edges, false, true)
  }

  function buildScheduleGraph(design, lineage) {
    if (design && design.target && design.target.table) {
      var target = design.target.table
      var task = 'task · ' + target
      var nodes = [{ table: target, type: 'table', owner: '本次' }, { table: task, type: 'task', owner: '调度平台' }]
      var edges = [{ from: task, to: target, kind: 'task' }]
      var deps = (design.schedule && design.schedule.dependsOn) || []
      deps.forEach(function (dep) {
        var table = String(dep).split('@')[0]
        nodes.push({ table: table, type: 'table', owner: '上游' })
        edges.push({ from: table, to: target, kind: 'task' })
      })
      return layoutGraph(target, nodes, edges, false, true)
    }
    if (lineage) {
      var jobNodes = (lineage.nodes || []).filter(function (node) { return node.type === 'task' || node.type === 'job' })
      if (jobNodes.length) return layoutGraph(lineage.table, jobNodes, (lineage.edges || []).filter(function (edge) { return jobNodes.some(function (node) { return node.table === edge.from || node.table === edge.to }) }), false, false)
    }
    return null
  }

  function LineageBody(props) {
    var context = useContext(props.sessionId) || {}
    var lineage = context.lineage
    var design = context.design
    var open = React.useState(false)
    var requestState = React.useState((typeof window !== 'undefined' && window.__dataopsLineageRequest) || null)
    React.useEffect(function () {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
      var onSchedule = function (event) { requestState[1]((event && event.detail) || null) }
      window.addEventListener('dataops:open-schedule', onSchedule)
      return function () { window.removeEventListener('dataops:open-schedule', onSchedule) }
    }, [])
    var request = requestState[0]
    var schedule = request && request.view === 'schedule' ? request.schedule : null
    var graph = (lineage || (design && design.target)) ? buildGraph(lineage, design) : null
    var target = graph ? graph.target : ''
    var view = lineage
      ? ((lineage.nodes || []).some(function (node) { return node.type === 'task' || node.type === 'job' }) ? '调度视图' : '生产视图')
      : '设计视图'
    var direction = lineage ? (lineage.direction === 'up' ? '上游' : lineage.direction === 'down' ? '下游' : '上下游') : '下游'
    var sub = graph
      ? view + ' · ' + direction + ' · ' + graph.nodes.length + ' 个节点 / ' + graph.edges.length + ' 条边' +
        (graph.synthetic ? ' · 来自设计卡影响面' : '')
      : '当前 session 还没有血缘上下文，打开的是 Mock 示例'
    return h('div', null,
      h(CtxCard, {
        title: '血缘工作台',
        sub: sub
      },
        h('div', { className: 'do-workbench-entry' },
          h('div', { className: 'do-workbench-line' }, h('span', null, '当前上下文'), h('b', null, target || '未加载')),
          h('div', { className: 'do-workbench-line' }, h('span', null, '图谱'), h('b', null, '设计 / 生产 / 调度 · 全宽富节点')),
          h('div', { className: 'do-workbench-line' }, h('span', null, '节点'), h('b', null, '类型徽标 · 图标 · 点击详情')),
          h('button', { type: 'button', className: 'do-btn do-workbench-open', onClick: function () { open[1](true) } }, '打开全宽血缘工作台'))
      ),
      h(Flow.LineageWorkbench, { open: open[0], onClose: function () { open[1](false) }, initialView: schedule ? 'schedule' : null, schedule: schedule })
    )
  }

  function EvidenceBody(props) {
    var context = useContext(props.sessionId) || {}
    var evidence = context.evidence
    if (!evidence) {
      return h(Empty, { title: '还没有证据', hint: '让 Agent 调用 dataops_shared_read_evidence，或在卡片上点开证据胶囊。' })
    }
    return h(CtxCard, {
      title: '证据 · ' + (evidence.claim || '未命名'),
      sub: [evidence.env, evidence.timeRange, evidence.cost].filter(Boolean).join(' · ')
    },
      evidence.query ? h('pre', { className: 'do-logic', style: { margin: '8px 0 0', whiteSpace: 'pre-wrap' } }, evidence.query) : null,
      h('div', { className: 'do-ctx-sub', style: { marginTop: '6px' } },
        '来源 ' + (evidence.source || '—') + ' · 截至 ' + (evidence.asOf || '—'))
    )
  }


  function tab(id, kind, label, description, order, Body) {
    return {
      definition: {
        id: PREFIX + id,
        kind: kind,
        title: function () { return label },
        guide: [{ id: id, order: order, title: function () { return label }, description: function () { return description } }]
      },
      body: { key: PREFIX + id, Component: Body }
    }
  }

  var tabs = [
    tab('asset', 'dataops-asset', '资产', '目标表与字段', 10, AssetBody),
    tab('lineage', 'dataops-lineage', '血缘', '上下游影响面', 20, LineageBody),
    tab('evidence', 'dataops-evidence', '证据', '结论背后的查询', 30, EvidenceBody)
  ]

  return {
    tabs: tabs,
    definitions: tabs.map(function (item) { return item.definition })
  }
}
