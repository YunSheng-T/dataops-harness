/**
 * Right-sidebar DataOps panel: 概览 / 仓库 / 资产 / 血缘 / 证据 / 检查.
 *
 * Each tab is a page kind registered through `ctx.sidebarRightTabs.register`,
 * with its body on the keyed `sidebar.right.pane.tab` slot. Bodies read the
 * per-session context store that the turn definition fills from tool results;
 * they never fetch and never invent data.
 */
export function createDataopsTabs(React, contextStore, LineageFlow, Cards) {
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
    var focus = props.focus || null
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
      focus && focus.table ? h('div', { className: 'do-focus-banner' }, '定位 · ', h('code', null, focus.table)) : null,
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

  function designCardPayload(graph) {
    if (!graph || !graph.target) return null
    var nodes = (graph.nodes || []).map(function (node) {
      var table = node.table || node.id || ''
      return { id: 'table:' + table, type: 'physical_table', label: table, layer: node.type || 'table', owner: node.owner }
    })
    var edges = (graph.edges || []).map(function (edge) {
      return { from: 'table:' + edge.from, to: 'table:' + edge.to, type: edge.kind || 'reads' }
    })
    return {
      kind: 'lineage', schemaVersion: 2, table: graph.target, view: 'design', mode: 'planned',
      graph: { nodes: nodes, edges: edges }, downstream: [], gaps: []
    }
  }

  function scheduleCardPayload(lineage) {
    if (!lineage) return null
    var all = lineage.nodes || []
    var jobs = all.filter(function (node) { return node.type === 'etl_job' || node.type === 'job' || node.type === 'schedule_job' })
    var tasks = all.filter(function (node) { return node.type === 'schedule_task' || node.type === 'task' })
    var schedule = lineage.schedule || {}
    if (!jobs.length && !tasks.length && !schedule.taskId && !schedule.cron) return null
    var task = tasks.filter(function (node) { return schedule.taskId && node.id === schedule.taskId })[0] || tasks[0]
    var byId = {}
    all.forEach(function (node) { byId[node.id] = node })
    var parentOf = {}
    ;(lineage.edges || []).forEach(function (edge) {
      if (byId[edge.to] && (byId[edge.to].type === 'etl_job' || byId[edge.to].type === 'job')) parentOf[edge.to] = edge.from
    })
    var selectedTaskId = schedule.taskId || (task && task.id)
    var selectedJobs = selectedTaskId
      ? jobs.filter(function (job) { return job.parent === selectedTaskId || parentOf[job.id] === selectedTaskId })
      : jobs
    if (!selectedJobs.length) selectedJobs = jobs
    var typeCounts = {}
    var mappedJobs = selectedJobs.map(function (job) {
      var kind = job.jobKind || job.kind || 'job'
      var parentId = job.parent || parentOf[job.id]
      var parent = parentId && byId[parentId] ? (byId[parentId].label || parentId) : null
      typeCounts[kind] = (typeCounts[kind] || 0) + 1
      return { name: job.label || job.id, type: kind, parents: parent ? [parent] : [] }
    })
    var taskName = (task && (task.label || task.name)) || schedule.taskId || lineage.table || '调度任务'
    return {
      kind: 'lineage', schemaVersion: 2, table: taskName, view: 'schedule', mode: 'planned',
      schedule: {
        taskName: taskName,
        taskType: '周期任务',
        cron: schedule.cron || (task && task.cron) || null,
        cycle: schedule.cycle || (task && task.cycle) || null,
        sla: schedule.sla || (task && task.sla) || null,
        retries: schedule.retries,
        dependsOn: schedule.dependsOn || [],
        timezone: schedule.timezone || null,
        taskCount: task ? 1 : (tasks.length || 1),
        jobCount: mappedJobs.length,
        typeCounts: typeCounts,
        jobs: mappedJobs,
        taskParams: [],
        placeholders: []
      },
      downstream: [], gaps: []
    }
  }

  var LINEAGE_OBJECTS = [
    { id: 'flow:channel_daily', kind: 'data_flow', label: 'channel_daily', sub: '3 tasks · 4 tables', group: '数据链路' },
    { id: 'flow:etl_channel_sync', kind: 'data_flow', label: 'etl_channel_sync', sub: '2 tasks · 2 tables', group: '数据链路' },
    { id: 'table:dwd.orders', kind: 'table_lineage', label: 'dwd.orders', sub: 'dwd · 上游 2 / 下游 3', group: '表' },
    { id: 'table:dws.trade_channel_daily', kind: 'table_lineage', label: 'dws.trade_channel_daily', sub: 'dws · 上游 2 / 下游 1', group: '表' },
    { id: 'task:channel_daily_mixed', kind: 'task_dag', label: 'channel_daily_mixed', sub: '6 jobs · 1 warning', group: '调度 DAG' }
  ]

  function LineageBody(props) {
    var selectedState = React.useState(null)
    var queryState = React.useState('')
    var dialogState = React.useState(false)
    var focus = props.focus || null
    React.useEffect(function () {
      if (!focus) return
      var match = null
      if (focus.table) match = LINEAGE_OBJECTS.filter(function (item) { return item.label === focus.table })[0] || null
      if (!match && focus.lineageKind) match = LINEAGE_OBJECTS.filter(function (item) { return item.kind === focus.lineageKind })[0] || null
      if (match) selectedState[1](match)
    }, [focus])
    if (Flow && typeof Flow.LineageSurface === 'function') {
      var selected = selectedState[0]
      var query = queryState[0].trim().toLowerCase()
      var filtered = LINEAGE_OBJECTS.filter(function (item) { return !query || item.label.toLowerCase().indexOf(query) >= 0 || item.group.indexOf(query) >= 0 })
      var counts = { data_flow: 0, table_lineage: 0, task_dag: 0 }
      LINEAGE_OBJECTS.forEach(function (item) { counts[item.kind]++ })
      var groups = ['数据链路', '表', '调度 DAG']
      return h('div', { className: 'do-lineage-browser' },
        h('div', { className: 'do-lineage-toolbar' },
          h('div', { className: 'do-lineage-counts' }, h('span', null, '表 12'), h('span', null, '链路 ' + counts.data_flow), h('span', null, '任务 ' + counts.task_dag)),
          h('input', { className: 'do-lineage-search', value: queryState[0], placeholder: '搜索表 / 任务 / 作业', onChange: function (event) { queryState[1](event.target.value) } })),
        h('div', { className: 'do-lineage-browser-body' },
          h('div', { className: 'do-lineage-objects' }, filtered.length ? groups.map(function (group) {
            var items = filtered.filter(function (item) { return item.group === group })
            return items.length ? h('div', { key: group }, h('div', { className: 'do-lineage-group' }, group), items.map(function (item) {
              return h('button', { key: item.id, type: 'button', className: 'do-lineage-object' + (selected && selected.id === item.id ? ' on' : ''), onClick: function () { selectedState[1](item); dialogState[1](false) } },
                h('span', { className: 'do-lineage-obj-dot', 'data-kind': item.kind }),
                h('span', { className: 'do-lineage-obj-main' }, h('b', null, item.label), h('small', null, item.sub)))
            })) : null
          }) : h('div', { className: 'do-lineage-empty' }, '没有匹配的血缘对象')),
          h('div', { className: 'do-lineage-stage' }, selected ? h(React.Fragment, null,
            h('div', { className: 'do-lineage-stage-head' }, h('b', null, selected.label), h('span', { className: 'rd-badge', 'data-tone': 'brand' }, selected.kind), h('button', { type: 'button', className: 'do-lineage-expand', onClick: function () { dialogState[1](true) } }, '半屏打开')),
            selected.kind === 'table_lineage' ? h(Flow.LineageSurface, { kind: selected.kind }) : h('div', { className: 'do-lineage-flow-preview' },
              h('div', { className: 'do-lineage-flow-mark' }, selected.kind === 'task_dag' ? 'DAG' : 'FLOW'),
              h('b', null, selected.label),
              h('p', null, selected.kind === 'task_dag' ? 'Task.yaml 内的 Job 依赖图在独立半屏中打开，避免在右栏压缩节点。' : '表、ETL 与调度的完整链路在独立半屏中打开，避免在右栏压缩节点。'),
              h('div', { className: 'do-lineage-flow-meta' }, h('span', null, selected.sub), h('span', null, selected.kind)),
              h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: function () { dialogState[1](true) } }, '打开完整图'),
              h('button', { type: 'button', className: 'rd-btn', onClick: function () { selectedState[1](null) } }, '返回概览')),
            dialogState[0] && Flow.LineageDialog ? h(Flow.LineageDialog, { open: true, kind: selected.kind, initialView: selected.kind === 'task_dag' ? 'schedule' : undefined, onClose: function () { dialogState[1](false) } }) : null
          ) : h('div', { className: 'do-lineage-overview' }, h('div', { className: 'do-lineage-overview-mark' }, '⌘'), h('b', null, '选择代码仓里的血缘对象'), h('p', null, '左侧选择表、数据链路或调度 DAG；右侧只显示该对象的一张图。'),
            h('div', { className: 'do-lineage-overview-metrics' }, h('div', null, h('b', null, '12'), h('span', null, '表')), h('div', null, h('b', null, counts.data_flow), h('span', null, '数据链路')), h('div', null, h('b', null, counts.task_dag), h('span', null, '调度 DAG'))))))
      )
    }
    var context = useContext(props.sessionId) || {}
    var lineage = context.lineage
    var design = context.design
    var schedulePayload = scheduleCardPayload(lineage)
    var graph = (lineage || (design && design.target)) ? buildGraph(lineage, design) : null
    var payload = schedulePayload || designCardPayload(graph)
    if (Cards && typeof Cards.LineageV2Card === 'function' && payload) {
      return h('div', { className: 'do-lineage-inline' },
        h('div', { className: 'do-label' }, payload.view === 'schedule' ? '当前会话 · 调度 DAG' : '当前会话血缘'),
        h(Cards.LineageV2Card, { block: { content: [{ type: 'text', text: JSON.stringify(payload) }] } }))
    }
    return h('div', { className: 'do-lineage-inline' },
      h(CtxCard, { title: '血缘', sub: '当前会话还没有血缘上下文' },
        h('div', { className: 'do-muted' }, '打开带血缘的设计/技术方案卡后，会在这里展示该图。')))
  }

  function EvidenceBody(props) {
    var focus = props.focus || null
    var context = useContext(props.sessionId) || {}
    var evidence = context.evidence
    if (!evidence) {
      return h(Empty, { title: '还没有证据', hint: '让 Agent 调用 dataops_shared_read_evidence，或在卡片上点开证据胶囊。' })
    }
    return h('div', null,
      focus && (focus.evidenceId || focus.claim) ? h('div', { className: 'do-focus-banner' }, '定位 · ', h('code', null, focus.evidenceId || focus.claim)) : null,
      h(CtxCard, {
      title: '证据 · ' + (evidence.claim || '未命名'),
      sub: [evidence.env, evidence.timeRange, evidence.cost].filter(Boolean).join(' · ')
    },
      evidence.query ? h('pre', { className: 'do-logic', style: { margin: '8px 0 0', whiteSpace: 'pre-wrap' } }, evidence.query) : null,
      h('div', { className: 'do-ctx-sub', style: { marginTop: '6px' } },
        '来源 ' + (evidence.source || '—') + ' · 截至 ' + (evidence.asOf || '—'))
    ))
  }


  var PANEL_SECTIONS = [
    ['overview', '概览'],
    ['repo', '仓库'],
    ['assets', '资产'],
    ['lineage', '血缘'],
    ['deliverables', '交付物'],
    ['evidence', '证据'],
    ['checks', '检查']
  ]

  function panelInitialFocus() {
    if (typeof window === 'undefined') return null
    return window.__dataopsPanelFocus || null
  }

  function panelInitialSection() {
    if (typeof window === 'undefined') return 'overview'
    var requested = window.__dataopsPanelSection
    return PANEL_SECTIONS.some(function (item) { return item[0] === requested }) ? requested : 'overview'
  }

  function RepoMetric(props) {
    return h('div', { className: 'rd-metric' + (props.attention ? ' rd-metric-attention' : '') }, h('b', null, String(props.value == null ? 0 : props.value)), h('span', null, props.label))
  }

  function RepoFinding(props) {
    var item = props.finding || {}
    var severity = item.severity === 'blocking' ? '阻断' : item.severity === 'warning' ? '警告' : '提示'
    return h('div', { className: 'rd-finding', 'data-severity': item.severity || 'info' },
      h('span', { className: 'rd-severity' }, severity),
      h('div', { className: 'rd-finding-main' },
        h('div', null, h('code', null, item.code || 'FINDING'), h('span', null, item.message || '')),
        item.path ? h('div', { className: 'rd-path' }, item.path + (item.task ? ' · ' + item.task : '') + (item.job ? ' · ' + item.job : '')) : null,
        item.hint ? h('div', { className: 'rd-hint' }, item.hint) : null))
  }

  function readPanelError(reason) {
    var body = reason && reason.body
    return {
      code: (body && (body.error || body.code)) || 'TRANSPORT_FAILED',
      message: (body && body.message) || (reason && reason.message) || '请求失败，请重试',
      stage: body && body.stage,
      workspace: body && body.workspace
    }
  }

  function DataOpsPanelBody(props) {
    var sectionState = React.useState(panelInitialSection())
    var focusState = React.useState(panelInitialFocus())
    var dataState = React.useState(null)
    var loadingState = React.useState(false)
    var errorState = React.useState(null)
    var refreshState = React.useState(0)
    var checksTabState = React.useState('rules')
    var scanIdState = React.useState(null)
    var scanState = React.useState(null)
    var scanLoadingState = React.useState(false)
    var scanErrorState = React.useState(null)
    var evidenceTabState = React.useState('evidence')
    var runtimeTargetsState = React.useState(null)
    var runtimeLocatorState = React.useState(null)
    var runtimeRunsState = React.useState(null)
    var runtimeRunState = React.useState(null)
    var runtimeLoadingState = React.useState(false)
    var runtimeErrorState = React.useState(null)
    var deployIdState = React.useState('deploy-20261102-001')
    var deployResultState = React.useState(null)
    var deployLoadingState = React.useState(false)
    var deployErrorState = React.useState(null)
    var context = useContext(props.sessionId)
    var workitem = context && context.workitem ? context.workitem : null
    var section = sectionState[0]
    var focus = focusState[0]
    var data = dataState[0]
    var loading = loadingState[0]
    var error = errorState[0]
    var checksTab = checksTabState[0]
    var scanId = scanIdState[0]
    var scanResult = scanState[0]
    var scanLoading = scanLoadingState[0]
    var scanError = scanErrorState[0]
    var evidenceTab = evidenceTabState[0]
    var runtimeTargets = runtimeTargetsState[0]
    var runtimeLocator = runtimeLocatorState[0]
    var runtimeRuns = runtimeRunsState[0]
    var runtimeRun = runtimeRunState[0]
    var runtimeLoading = runtimeLoadingState[0]
    var runtimeError = runtimeErrorState[0]
    var deployId = deployIdState[0]
    var deployResult = deployResultState[0]
    var deployLoading = deployLoadingState[0]
    var deployError = deployErrorState[0]

    React.useEffect(function () {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
      var onSection = function (event) {
        var next = event && event.detail && event.detail.section
        if (PANEL_SECTIONS.some(function (item) { return item[0] === next })) sectionState[1](next)
      }
      window.addEventListener('dataops:panel-section', onSection)
      return function () { window.removeEventListener('dataops:panel-section', onSection) }
    }, [])

    React.useEffect(function () {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
      var onFocus = function (event) {
        var detail = event && event.detail
        if (!detail) return
        focusState[1](detail)
        if (detail.section && PANEL_SECTIONS.some(function (item) { return item[0] === detail.section })) sectionState[1](detail.section)
      }
      window.addEventListener('dataops:panel-focus', onFocus)
      return function () { window.removeEventListener('dataops:panel-focus', onFocus) }
    }, [])

    React.useEffect(function () {
      if (section !== 'checks' || checksTab !== 'scan' || !scanId) return
      if (scanResult && (scanResult.phase === 'complete' || scanResult.phase === 'error')) return
      var cancelled = false
      var timer = null
      function poll() {
        if (cancelled) return
        fetch('/api/dataops/code-scan?sessionId=' + encodeURIComponent(props.sessionId) + '&scanId=' + encodeURIComponent(scanId), { headers: { accept: 'application/json' } })
          .then(function (response) {
            return response.json().then(function (body) {
              if (!response.ok) throw Object.assign(new Error(body.message || body.error || 'scan failed'), { body: body })
              return body
            })
          })
          .then(function (body) {
            if (cancelled) return
            scanState[1](body)
            if (body.phase !== 'complete' && body.phase !== 'error') timer = setTimeout(poll, 700)
          })
          .catch(function (reason) {
            if (!cancelled) scanErrorState[1](readPanelError(reason))
          })
      }
      poll()
      return function () { cancelled = true; if (timer) clearTimeout(timer) }
    }, [section, checksTab, scanId])

    React.useEffect(function () {
      if (section !== 'evidence' || evidenceTab !== 'runtime' || runtimeTargets) return
      var cancelled = false
      fetch('/api/dataops/runtime-log?sessionId=' + encodeURIComponent(props.sessionId) + '&mode=targets', { headers: { accept: 'application/json' } })
        .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw Object.assign(new Error(body.error || 'targets failed'), { body: body }); return body }) })
        .then(function (body) { if (!cancelled) runtimeTargetsState[1](body.targets || []) })
        .catch(function (reason) { if (!cancelled) runtimeErrorState[1](readPanelError(reason)) })
      return function () { cancelled = true }
    }, [section, evidenceTab, runtimeTargets])

    React.useEffect(function () {
      if (section !== 'evidence' || evidenceTab !== 'runtime' || !runtimeLocator) return
      var cancelled = false
      runtimeLoadingState[1](true)
      runtimeErrorState[1](null)
      var params = Object.keys(runtimeLocator).filter(function (key) { return runtimeLocator[key] }).map(function (key) { return key + '=' + encodeURIComponent(runtimeLocator[key]) }).join('&')
      fetch('/api/dataops/runtime-log?sessionId=' + encodeURIComponent(props.sessionId) + '&mode=list&' + params, { headers: { accept: 'application/json' } })
        .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw Object.assign(new Error(body.error || 'list failed'), { body: body }); return body }) })
        .then(function (body) { if (!cancelled) runtimeRunsState[1](body.runs || []) })
        .catch(function (reason) { if (!cancelled) runtimeErrorState[1](readPanelError(reason)) })
        .finally(function () { if (!cancelled) runtimeLoadingState[1](false) })
      return function () { cancelled = true }
    }, [section, evidenceTab, runtimeLocator, props.sessionId])

    React.useEffect(function () {
      if (section !== 'overview' && section !== 'repo' && section !== 'checks') {

        dataState[1](null)
        errorState[1](null)
        loadingState[1](false)
        return
      }
      if (!props.sessionId || typeof fetch !== 'function') {
        errorState[1]({ code: 'SESSION_REQUIRED', message: '当前 Session 还没有可用的工作区' })
        return
      }
      var cancelled = false
      loadingState[1](true)
      errorState[1](null)
      var mode = section === 'checks' ? 'check' : 'scan'
      fetch('/api/dataops/repo-doctor?sessionId=' + encodeURIComponent(props.sessionId) + '&mode=' + mode, { headers: { accept: 'application/json' } })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) throw Object.assign(new Error(body.message || body.error || 'repo doctor failed'), { body: body })
            return body
          })
        })
        .then(function (body) { if (!cancelled) dataState[1](body) })
        .catch(function (reason) { if (!cancelled) errorState[1](readPanelError(reason)) })
        .finally(function () { if (!cancelled) loadingState[1](false) })
      return function () { cancelled = true }
    }, [section, props.sessionId, refreshState[0]])

    var scan = data && data.scan ? data.scan : data
    var metrics = (data && data.metrics) || (scan && scan.metrics) || {}
    var detection = (data && data.detection) || (scan && scan.detection) || null
    var findings = (data && data.findings) || []
    var packages = (scan && scan.packages) || (data && data.packages) || []
    var findingCount = (metrics.blocking || 0) + (metrics.warning || 0) + (metrics.info || 0)

    function go(next) { sectionState[1](next) }
    function retry() { refreshState[1](refreshState[0] + 1) }
    function startScan() {
      if (scanLoading || typeof fetch !== 'function' || !props.sessionId) return
      scanLoadingState[1](true)
      scanErrorState[1](null)
      scanState[1](null)
      scanIdState[1](null)
      fetch('/api/dataops/code-scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sessionId: props.sessionId, scope: { kind: 'workspace' }, source: 'panel' })
      })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) throw Object.assign(new Error(body.message || body.error || 'scan trigger failed'), { body: body })
            return body
          })
        })
        .then(function (body) { scanIdState[1](body.scanId); scanState[1](body) })
        .catch(function (reason) { scanErrorState[1](readPanelError(reason)) })
        .finally(function () { scanLoadingState[1](false) })
    }

    function CodeScan() {
      if (scanError) return h('div', { className: 'rd-content-inner' }, h('div', { className: 'rd-error' },
        h('div', { className: 'rd-error-head' }, h('b', null, '扫描失败'), h('code', null, scanError.code || 'SCAN_FAILED')),
        h('p', null, scanError.message || '扫描服务不可用'),
        h('button', { type: 'button', className: 'rd-btn', onClick: startScan }, '重试')))
      if (!scanId && !scanLoading) return h('div', { className: 'rd-content-inner' }, h('div', { className: 'rd-empty' },
        h('div', { className: 'rd-empty-mark' }, '∅'),
        h('b', null, '尚未运行代码扫描'),
        h('p', null, '扫描由 code scan 服务执行；DataOps 只保存 scanId 和展示结果。'),
        h('div', { className: 'rd-actions' }, h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: startScan }, '运行扫描'))))
      if (scanLoading && !scanResult) return h('div', { className: 'rd-content-inner' }, h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton rd-skeleton-wide' }), h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' })))
      var result = scanResult || {}
      var phase = result.phase || 'queued'
      if (phase === 'queued' || phase === 'running') {
        return h('div', { className: 'rd-content-inner' },
          h('div', { className: 'rd-scan-meta' }, h('i', { className: 'rd-scan-dot' }), h('code', null, scanId), h('span', null, phase === 'queued' ? '排队中' : '扫描中'), h('span', { className: 'rd-badge', 'data-tone': 'warn' }, '运行中')),
          h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton rd-skeleton-wide' }), h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' })))
      }
      var sm = result.metrics || {}
      var resultFindings = result.findings || []
      var impacts = result.impacts || {}
      return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-scan-meta' }, h('i', { className: 'rd-scan-dot' }), h('code', null, result.scanId || scanId), h('span', null, 'dataops CLI · mock'), h('span', null, (result.scope && result.scope.files ? result.scope.files.length : sm.files || 0) + ' files'), h('span', { className: 'rd-badge', 'data-tone': result.status === 'warn' ? 'warn' : 'pass' }, result.status === 'warn' ? '警告' : '完成')),
        h('div', { className: 'rd-scan-note' }, 'Mock 结果；真实 CLI 返回 scanId 和 ScanResult 后替换。'),
        h('div', { className: 'rd-scan-summary' },
          h('div', null, h('b', null, String(sm.files || 0)), h('span', null, 'files')),
          h('div', null, h('b', null, String(sm.packages || 0)), h('span', null, 'packages')),
          h('div', null, h('b', null, String(resultFindings.length)), h('span', null, 'findings')),
          h('div', { className: sm.warnings ? 'rd-scan-attention' : '' }, h('b', null, String(sm.warnings || 0)), h('span', null, 'warnings'))),
        h('div', { className: 'rd-section-label' }, 'Findings', h('span', { className: 'rd-scan-source' }, '来自 scanning service')),
        resultFindings.length ? resultFindings.map(function (item, index) { return h(RepoFinding, { key: index, finding: { severity: item.severity, code: item.ruleId, message: item.message, path: item.location && item.location.path } }) }) : h('div', { className: 'rd-inline-empty' }, h('b', null, '扫描没有返回 findings'), h('p', null, '没有结果不等于通过；请以 scanning service 的状态为准。')),
        h('div', { className: 'rd-section-label' }, 'Impacts', h('span', { className: 'rd-scan-source' }, '来自 scanning service')),
        (impacts.assets || []).map(function (asset) { return h('div', { className: 'rd-package', key: asset.id }, h('div', { className: 'rd-package-main' }, h('b', null, asset.id), h('span', null, asset.kind + ' · ' + (asset.package || 'unknown package'))), h('div', { className: 'rd-package-meta' }, h('span', null, String(asset.downstream || 0) + ' downstream'))) }),
        (impacts.downstream || []).map(function (down) { return h('div', { className: 'rd-package', key: down.id }, h('div', { className: 'rd-package-main' }, h('b', null, down.id), h('span', null, down.kind + ' · ' + down.criticality)), h('div', { className: 'rd-package-meta' }, h('span', null, String(down.distance || 1) + ' hops'))) }))
    }

    function ErrorCard() {
      return h('div', { className: 'rd-error' },
        h('div', { className: 'rd-error-head' }, h('b', null, section === 'checks' ? '检查失败' : '扫描失败'), h('code', null, error.code)),
        h('p', null, error.message),
        error.stage || error.workspace ? h('dl', { className: 'rd-error-kv' },
          error.stage ? h('dt', null, 'stage') : null, error.stage ? h('dd', null, error.stage) : null,
          error.workspace ? h('dt', null, 'workspace') : null, error.workspace ? h('dd', null, error.workspace) : null) : null,
        h('button', { type: 'button', className: 'rd-btn', onClick: retry }, '重试'))
    }

    function EmptyState() {
      return h('div', { className: 'rd-empty' },
        h('div', { className: 'rd-empty-mark' }, '∅'),
        h('b', null, '当前 workspace 不是 DataOps 代码仓'),
        h('p', null, '没有找到 .dataops/manifest.yaml 或 .dataops/build.yaml。打开 internal-code-repo，或新建一个位于该目录的 Session。'),
        detection && detection.root ? h('code', { className: 'rd-path' }, detection.root) : null,
        h('div', { className: 'rd-actions' }, h('button', { type: 'button', className: 'rd-btn', onClick: retry }, '重新识别')))
    }

    function Overview() {
      if (loading && !data) return h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton rd-skeleton-wide' }), h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' }))
      if (error) return h(ErrorCard)
      if (!detection) return h('div', { className: 'rd-empty' }, h('b', null, '暂无扫描结果'), h('p', null, '点击刷新索引重新检测当前 workspace。'))
      if (!detection.detected) return h(EmptyState)
      var recent = (detection.findings || []).concat(scan && scan.diagnostics ? scan.diagnostics : []).slice(0, 3)
      return h(React.Fragment, null,
        h('div', { className: 'rd-detect' },
          h('span', { className: 'rd-detect-icon', 'data-tone': detection.partial ? 'warn' : 'pass' }, detection.partial ? '!' : '✓'),
          h('div', { className: 'rd-detect-main' }, h('b', null, 'internal-code-repo'), h('span', null, '.dataops/manifest.yaml · .dataops/build.yaml')),
          h('span', { className: 'rd-badge', 'data-tone': detection.partial ? 'warn' : 'pass' }, detection.partial ? '需检查' : '已识别')),
        h('div', { className: 'rd-meta' }, h('span', { className: 'rd-status' }, h('i', null), detection.partial ? '部分识别' : '已识别'), h('span', null, '只读'), h('span', null, scan && scan.generatedAt ? 'as of ' + scan.generatedAt : '实时读取')),
        h('div', { className: 'rd-metrics' },
          h(RepoMetric, { value: metrics.packages || 0, label: 'packages' }),
          h(RepoMetric, { value: metrics.tasks || 0, label: 'tasks' }),
          h(RepoMetric, { value: metrics.jobs || 0, label: 'jobs' }),
          h(RepoMetric, { value: findingCount, label: 'findings', attention: Boolean(metrics.warning || metrics.blocking) })),
        detection.partial ? h('div', { className: 'rd-notice' }, detection.reasons && detection.reasons.length ? detection.reasons.join(' · ') : '仓库识别不完整，validate 结果可能不完整') : null,
        h('div', { className: 'rd-section-label' }, '识别范围'),
        h('div', { className: 'rd-scope' }, (detection.signals || []).slice(0, 5).map(function (signal, index) { return h('code', { key: index, className: 'rd-chip' }, signal) })),
        packages.length ? h('div', { className: 'rd-section-label' }, 'Packages', h('button', { type: 'button', className: 'rd-link', onClick: function () { go('repo') } }, '查看全部 ' + packages.length)) : null,
        packages.slice(0, 3).map(function (pkg) {
          return h('div', { className: 'rd-package', key: pkg.packageName },
            h('div', { className: 'rd-package-main' }, h('b', null, pkg.packageName), h('span', null, pkg.platform || pkg.toolChain || pkg.serviceType || 'unknown')),
            h('div', { className: 'rd-package-meta' }, h('span', null, (pkg.files || []).length + ' files')))
        }),
        h('div', { className: 'rd-section-label' }, '最近发现'),
        recent.length ? recent.map(function (item, index) { return h(RepoFinding, { key: index, finding: item }) }) : h('div', { className: 'rd-inline-empty' }, h('b', null, '还没有规则结果'), h('p', null, '扫描只建立索引；运行检查后在这里显示 warning / blocking。'), h('button', { type: 'button', className: 'rd-btn', onClick: function () { go('checks') } }, '运行检查')))
    }

    function Repo() {
      if (loading && !data) return h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' }))
      if (error) return h(ErrorCard)
      if (!detection || !detection.detected) return h('div', { className: 'rd-empty' }, h('b', null, '没有可用的仓库索引'), h('p', null, '先回到概览重新识别 workspace。'))
      if (!packages.length) return h('div', { className: 'rd-empty' }, h('b', null, '没有 package'), h('p', null, '.dataops/build.yaml 没有声明 package。'))
      return h(React.Fragment, null,
        h('div', { className: 'rd-meta' }, h('span', { className: 'rd-status' }, h('i', null), '索引可用'), h('span', null, String(packages.length) + ' packages')),
        packages.map(function (pkg) {
          var files = pkg.files || []
          var missing = pkg.missing || []
          return h('div', { className: 'rd-package', key: pkg.packageName },
            h('div', { className: 'rd-package-main' }, h('b', null, pkg.packageName), h('span', null, pkg.platform || pkg.toolChain || pkg.serviceType || 'unknown')),
            h('div', { className: 'rd-package-meta' }, h('span', null, files.length + ' files'), missing.length ? h('span', { className: 'rd-missing' }, missing.length + ' missing') : h('span', { className: 'rd-ok' }, '完整')))
        }))
    }

    function queryDeploy() {
      if (deployLoading || typeof fetch !== 'function' || !props.sessionId) return
      deployLoadingState[1](true)
      deployErrorState[1](null)
      deployResultState[1](null)
      fetch('/api/dataops/deploy-log?sessionId=' + encodeURIComponent(props.sessionId) + '&deploymentId=' + encodeURIComponent(deployId), { headers: { accept: 'application/json' } })
        .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw Object.assign(new Error(body.error || 'deploy log failed'), { body: body }); return body }) })
        .then(function (body) { deployResultState[1](body) })
        .catch(function (reason) { deployErrorState[1](readPanelError(reason)) })
        .finally(function () { deployLoadingState[1](false) })
    }

    function DeployLog() {
      if (deployError) return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-deploy-query' },
          h('input', { className: 'rd-deploy-input', value: deployId, onChange: function (event) { deployIdState[1](event.target.value) }, placeholder: 'deploymentId' }),
          h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: queryDeploy }, '查询')),
        h('div', { className: 'rd-error' }, h('div', { className: 'rd-error-head' }, h('b', null, '部署日志读取失败'), h('code', null, deployError.code || 'DEPLOY_LOG_FAILED')), h('p', null, deployError.message || '部署服务不可用')))
      if (!deployResult) return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-deploy-query' },
          h('input', { className: 'rd-deploy-input', value: deployId, onChange: function (event) { deployIdState[1](event.target.value) }, placeholder: 'deploymentId' }),
          h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: queryDeploy }, deployLoading ? '查询中…' : '查询')),
        h('div', { className: 'rd-empty' }, h('div', { className: 'rd-empty-mark' }, '#' ), h('b', null, '按 deploymentId 查询部署日志'), h('p', null, '部署日志和运行日志分开查询；不按 package 反查。')))
      var events = deployResult.events || []
      return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-deploy-query' },
          h('input', { className: 'rd-deploy-input', value: deployId, onChange: function (event) { deployIdState[1](event.target.value) }, placeholder: 'deploymentId' }),
          h('button', { type: 'button', className: 'rd-btn', onClick: queryDeploy }, '重新查询')),
        h('div', { className: 'rd-deploy-meta' }, h('code', null, deployResult.deploymentId), h('span', null, deployResult.packageName + '@' + deployResult.version), h('span', null, deployResult.environment), h('span', { className: 'rd-badge', 'data-tone': deployResult.status === 'success' ? 'pass' : 'fail' }, deployResult.status)),
        h('div', { className: 'rd-deploy-summary' }, h('div', null, h('b', null, String(events.length)), h('span', null, 'events')), h('div', null, h('b', null, deployResult.status === 'success' ? '✓' : '!'), h('span', null, 'status')), h('div', null, h('b', null, deployResult.environment || '—'), h('span', null, 'env'))),
        h('div', { className: 'rd-section-label' }, '部署时间线', h('span', { className: 'rd-scan-source' }, '来自 deploy log service')),
        h('div', { className: 'rd-timeline' }, events.map(function (event) { return h('div', { key: event.seq, className: 'rd-event', 'data-level': event.level }, h('span', { className: 'rd-event-time' }, String(event.at || '').slice(11, 16)), h('span', { className: 'rd-event-job' }, event.phase || ''), h('span', { className: 'rd-event-msg' }, event.message || ''), event.code ? h('code', null, event.code) : null) })))
    }

    function selectRuntimeTarget(target) {

      runtimeLocatorState[1](target)
      runtimeRunsState[1](null)
      runtimeRunState[1](null)
      runtimeErrorState[1](null)
    }

    function openRuntimeRun(run) {
      if (!runtimeLocator) return
      runtimeLoadingState[1](true)
      runtimeErrorState[1](null)
      var params = Object.keys(runtimeLocator).filter(function (key) { return runtimeLocator[key] }).map(function (key) { return key + '=' + encodeURIComponent(runtimeLocator[key]) }).join('&')
      fetch('/api/dataops/runtime-log?sessionId=' + encodeURIComponent(props.sessionId) + '&mode=detail&runId=' + encodeURIComponent(run.runId) + '&' + params, { headers: { accept: 'application/json' } })
        .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw Object.assign(new Error(body.error || 'detail failed'), { body: body }); return body }) })
        .then(function (body) { runtimeRunState[1](body) })
        .catch(function (reason) { runtimeErrorState[1](readPanelError(reason)) })
        .finally(function () { runtimeLoadingState[1](false) })
    }

    function RuntimeLog() {
      if (runtimeError) return h('div', { className: 'rd-content-inner' }, h('div', { className: 'rd-error' },
        h('div', { className: 'rd-error-head' }, h('b', null, '运行日志读取失败'), h('code', null, runtimeError.code || 'RUNTIME_LOG_FAILED')),
        h('p', null, runtimeError.message || '日志服务不可用')))
      if (!runtimeTargets) return h('div', { className: 'rd-content-inner' }, h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' })))
      if (!runtimeLocator) return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-section-label' }, '选择运行坐标'),
        h('div', { className: 'rd-runtime-targets' }, runtimeTargets.map(function (target) {
          return h('button', { key: target.platform + ':' + target.group + ':' + (target.task || target.job), type: 'button', className: 'rd-target', onClick: function () { selectRuntimeTarget(target) } },
            h('b', null, target.task || target.job), h('span', null, target.platform + ' · ' + target.project + ' · ' + target.group))
        })))
      var runs = runtimeRuns || []
      var detail = runtimeRun
      return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-runtime-locator' }, h('span', null, '运行坐标'), h('b', null, runtimeLocator.platform + ' · ' + runtimeLocator.project + ' · ' + runtimeLocator.group + ' · ' + (runtimeLocator.task || runtimeLocator.job)), h('button', { type: 'button', className: 'rd-link', onClick: function () { runtimeLocatorState[1](null); runtimeRunState[1](null) } }, '切换')),
        runtimeLoading && !runs.length ? h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' })) : null,
        h('div', { className: 'rd-section-label' }, '最近运行', h('span', { className: 'rd-scan-source' }, runs.length + ' runs')),
        runs.map(function (run) { return h('button', { key: run.runId, type: 'button', className: 'rd-runtime-run' + (detail && detail.run && detail.run.runId === run.runId ? ' on' : ''), onClick: function () { openRuntimeRun(run) } },
          h('span', { className: 'rd-runtime-status', 'data-tone': run.status === 'failed' ? 'fail' : 'pass' }, run.status),
          h('b', null, run.runId), h('span', null, String(Math.round((run.durationMs || 0) / 60000)) + 'm · ' + String(run.startedAt || '').slice(0, 16))) }),
        detail ? h('div', { className: 'rd-runtime-detail' },
          h('div', { className: 'rd-section-label' }, 'Timeline', h('span', { className: 'rd-scan-source' }, 'platform run · ' + detail.run.runId)),
          h('div', { className: 'rd-timeline' }, (detail.events || []).map(function (event) {
            return h('div', { key: event.seq, className: 'rd-event', 'data-level': event.level }, h('span', { className: 'rd-event-time' }, String(event.at || '').slice(11, 16)), h('span', { className: 'rd-event-job' }, event.job || ''), h('span', { className: 'rd-event-msg' }, event.message || ''), event.code ? h('code', null, event.code) : null)
          })),
          h('div', { className: 'rd-section-label' }, '错误码'),
          (detail.errorCodes || []).length ? detail.errorCodes.map(function (code) { return h('code', { key: code, className: 'rd-runtime-code' }, code) }) : h('div', { className: 'rd-note' }, '本次运行没有返回错误码')
        ) : null)
    }

    function Deliverables() {
      var baseArtifacts = workitem && Array.isArray(workitem.artifacts) ? workitem.artifacts : []
      var current = workitem && workitem.currentIteration ? workitem.currentIteration : null
      var previewKinds = ['requirement', 'design', 'analysis', 'solution', 'tech_plan', 'develop', 'cicd']
      var previews = previewKinds.map(function (kind) { return context && context[kind] }).filter(Boolean).filter(function (payload) {
        return !baseArtifacts.some(function (artifact) { return artifact.kind === payload.kind || artifact.artifactId === payload.kind })
      }).map(function (payload) {
        return { artifactId: payload.kind, kind: payload.kind, stage: payload.stage || payload.kind, preview: true, revisions: [], currentRevision: { version: 1, status: 'preview', content: payload, createdAt: payload.asOf || payload.updatedAt || '' } }
      })
      var artifacts = baseArtifacts.concat(previews)
      if (!workitem && !previews.length) return h('div', { className: 'rd-content-inner' }, h('div', { className: 'rd-empty' }, h('div', { className: 'rd-empty-mark' }, '∅'), h('b', null, '还没有 Workitem 交付物'), h('p', null, '让 Agent 完成一次阶段 prepare 后，产物会出现在这里。')))
      return h('div', { className: 'rd-content-inner' },
        h('div', { className: 'rd-meta' }, h('span', { className: 'rd-status' }, h('i', null), 'Workitem'), h('span', null, workitem && workitem.id ? workitem.id : '当前会话'),
          current ? h('span', null, 'current · ' + current.artifactId + ' ' + current.revisionId) : null),
        artifacts.length ? artifacts.map(function (artifact) {
          var currentRevision = artifact.currentRevision || {}
          var evidence = Array.isArray(currentRevision.evidenceRefs) ? currentRevision.evidenceRefs : []
          var isCurrent = current && current.artifactId === artifact.artifactId
          return h('button', { type: 'button', className: 'rd-artifact' + (isCurrent ? ' on' : '') + (artifact.preview ? ' preview' : ''), key: artifact.artifactId, onClick: function () {
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
              window.dispatchEvent(new CustomEvent('dataops:artifact-inspector', { detail: { workitem: workitem, artifacts: artifacts, artifact: artifact } }))
            }
          } },
            h('div', { className: 'rd-artifact-main' }, h('b', null, artifact.kind || artifact.artifactId), h('span', null, artifact.preview ? 'draft preview · 未归档' : (artifact.revisions || []).length + ' revisions · ' + (artifact.stage || '') + ' · ' + (evidence.length ? evidence.length + ' evidence' : '未关联证据')), evidence.length ? h('div', { className: 'rd-mini-ev' }, evidence.slice(0, 3).map(function (item, index) { return h('span', { key: index, 'data-tone': evidenceTone(item.status) }, evidenceLabel(item)) })) : null),
            h('div', { className: 'rd-artifact-side' }, h('span', { className: 'rd-badge', 'data-tone': currentRevision.status === 'approved' || currentRevision.status === 'review' ? 'pass' : 'warn' }, currentRevision.status || 'draft'), h('code', null, artifact.preview ? 'preview' : (currentRevision.version ? 'v' + currentRevision.version : artifact.currentRevisionId || ''))))
        }) : h('div', { className: 'rd-inline-empty' }, h('b', null, '还没有阶段产物'), h('p', null, 'Agent 阶段 prepare 后会生成 revision，并在这里显示当前版本。')),
        current ? h('div', { className: 'rd-current-iteration' }, h('span', null, 'currentIteration'), h('code', null, current.stage + ' / ' + current.artifactId + ' / ' + current.revisionId), current.gate ? h('span', { className: 'rd-badge', 'data-tone': 'warn' }, current.gate) : null) : null)
    }

    function EvidencePanel() {
      var tabs = h('div', { className: 'rd-subtabs', role: 'tablist' },
        h('button', { type: 'button', className: evidenceTab === 'evidence' ? 'on' : '', onClick: function () { evidenceTabState[1]('evidence') } }, '证据'),
        h('button', { type: 'button', className: evidenceTab === 'deploy' ? 'on' : '', onClick: function () { evidenceTabState[1]('deploy') } }, '部署日志'),
        h('button', { type: 'button', className: evidenceTab === 'runtime' ? 'on' : '', onClick: function () { evidenceTabState[1]('runtime') } }, '运行日志'))
      if (evidenceTab === 'deploy') return h(React.Fragment, null, tabs, h(DeployLog))
      if (evidenceTab === 'runtime') return h(React.Fragment, null, tabs, h(RuntimeLog))
      return h(React.Fragment, null, tabs, h('div', { className: 'rd-legacy' }, h(EvidenceBody, { sessionId: props.sessionId, focus: focus })))
    }

    function Checks() {

      var tabs = h('div', { className: 'rd-subtabs', role: 'tablist' },
        h('button', { type: 'button', className: checksTab === 'rules' ? 'on' : '', onClick: function () { checksTabState[1]('rules') } }, '仓库规则'),
        h('button', { type: 'button', className: checksTab === 'scan' ? 'on' : '', onClick: function () { checksTabState[1]('scan') } }, '代码扫描'))
      if (checksTab === 'scan') return h(React.Fragment, null, tabs, h(CodeScan))
      if (loading && !data) return h(React.Fragment, null, tabs, h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' })))
      if (error) return h(React.Fragment, null, tabs, h(ErrorCard))
      if (!detection || !detection.detected) return h(React.Fragment, null, tabs, h('div', { className: 'rd-empty' }, h('b', null, '当前 workspace 不是 DataOps 代码仓'), h('p', null, '检查只对可识别的仓库运行。')))
      var status = data && data.status === 'pass' ? '通过' : data && data.status === 'block' ? '阻断' : '警告'
      var tone = data && data.status === 'pass' ? 'pass' : data && data.status === 'block' ? 'fail' : 'warn'
      return h(React.Fragment, null, tabs,
        h('div', { className: 'rd-check-head' },
          h('div', null, h('b', null, '仓库规则'), h('span', { className: 'rd-meta-line' }, '只读 · ' + String(metrics.blocking || 0) + ' blocking · ' + String(metrics.warning || 0) + ' warning')),
          h('span', { className: 'rd-badge', 'data-tone': tone }, status)),
        h('div', { className: 'rd-actions' }, h('button', { type: 'button', className: 'rd-btn', onClick: retry }, '重新检查')),
        findings.length ? findings.map(function (item, index) { return h(RepoFinding, { key: index, finding: item }) }) : h('div', { className: 'rd-empty' }, h('b', null, '当前没有发现问题'), h('p', null, '规则全部通过。')))
    }

    var isRepoSection = section === 'overview' || section === 'repo' || section === 'checks'
    var scanView = section === 'checks' && checksTab === 'scan'
    var runtimeView = section === 'evidence' && evidenceTab === 'runtime'
    var deployView = section === 'evidence' && evidenceTab === 'deploy'
    var sectionTitle = scanView ? '代码扫描' : runtimeView ? '运行日志' : deployView ? '部署日志' : section === 'deliverables' ? '交付物' : section === 'assets' ? '资产' : section === 'lineage' ? '血缘' : section === 'evidence' ? '证据' : '仓库体检'
    var sectionSub = scanView ? '代码扫描结果由 scanning service 提供，只按 scanId 读取。' : runtimeView ? '按平台坐标查询最近运行，再按 runId 查看单次日志。' : deployView ? '按 deploymentId 查询一次制品包部署。' : section === 'deliverables' ? 'Workitem 的阶段产物与不可变 revision。' : section === 'assets' ? '当前 Session 的目标表与字段。' : section === 'lineage' ? '当前 Session 的上下游影响面。' : section === 'evidence' ? '当前 Session 的查询、时间范围与证据。' : '识别数据代码仓，检查 package 覆盖、LTS 结构和占位符。'
    var content = section === 'checks' ? h(Checks) : section === 'repo' ? h(Repo) : section === 'deliverables' ? h(Deliverables) : section === 'assets' ? h('div', { className: 'rd-legacy' }, h(AssetBody, { sessionId: props.sessionId, focus: focus })) : section === 'lineage' ? h('div', { className: 'rd-legacy' }, h(LineageBody, { sessionId: props.sessionId, focus: focus })) : section === 'evidence' ? h(EvidencePanel) : h(Overview)
    return h('div', { className: 'rd-panel' },
      h('div', { className: 'rd-inner' },
      h('div', { className: 'rd-head', style: { display: 'flex', alignItems: 'flex-start' } },
        h('div', { className: 'rd-head-main', style: { flex: '1 1 auto', minWidth: 0 } },
          h('span', { className: 'rd-eyebrow' }, scanView ? 'DATAOPS / CODE SCAN' : runtimeView ? 'DATAOPS / RUNTIME LOG' : deployView ? 'DATAOPS / DEPLOY LOG' : section === 'deliverables' ? 'DATAOPS / ARTIFACTS' : isRepoSection ? 'DATAOPS / REPO DOCTOR' : 'DATAOPS / SESSION CONTEXT'),
          h('h2', { className: 'rd-title' }, sectionTitle),
          h('div', { className: 'rd-sub' }, sectionSub)),
        isRepoSection ? h('div', { className: 'rd-head-actions', style: { display: 'flex', flex: '0 0 auto', gap: 4 } },
          h('button', { type: 'button', className: 'rd-btn', onClick: scanView ? startScan : retry }, scanView ? '刷新' : '刷新'),
          scanView
            ? h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: startScan }, '运行扫描')
            : h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: function () { go('checks') } }, '运行检查')) : null),
      h('div', { className: 'rd-nav', role: 'tablist' }, PANEL_SECTIONS.map(function (item) {
        return h('button', { key: item[0], type: 'button', className: 'rd-tab', 'data-active': String(section === item[0]), onClick: function () { sectionState[1](item[0]) } }, item[1])
      })),
      h('div', { className: 'rd-content' }, content)))
  }

  function ArtifactInspector() {
    var state = React.useState(null)
    var openState = React.useState(null)
    var revisionState = React.useState(null)
    var evidenceState = React.useState(null)
    React.useEffect(function () {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
      var onOpen = function (event) {
        if (!event || !event.detail || !event.detail.artifact) return
        state[1](event.detail)
        openState[1](event.detail.artifact.artifactId || event.detail.artifact.kind)
      }
      var onKey = function (event) { if (event && event.key === 'Escape') state[1](null) }
      window.addEventListener('dataops:artifact-inspector', onOpen)
      window.addEventListener('keydown', onKey)
      return function () { window.removeEventListener('dataops:artifact-inspector', onOpen); window.removeEventListener('keydown', onKey) }
    }, [])
    if (!state[0]) return null
    var stages = [
      { key: 'requirement', label: '需求' },
      { key: 'design', label: '设计' },
      { key: 'analysis', label: '数据挖掘' },
      { key: 'solution', label: '需求方案' },
      { key: 'tech_plan', label: '技术方案' },
      { key: 'develop', label: '开发' },
      { key: 'cicd', label: 'CICD' }
    ]
    var artifacts = Array.isArray(state[0].artifacts) ? state[0].artifacts.slice() : []
    if (!artifacts.some(function (item) { return item.artifactId === state[0].artifact.artifactId })) artifacts.push(state[0].artifact)
    var byKind = {}
    artifacts.forEach(function (item) { byKind[item.kind || item.artifactId] = item })
    var selected = state[0].artifact
    var revision = selected.currentRevision || {}
    var content = revision.content || {}
    var workitem = state[0].workitem || {}
    var stageStates = workitem.stages || {}
    function close() { state[1](null) }
    function statusOf(item, key) {
      if (item && item.currentRevision) return item.currentRevision.status || 'draft'
      return (stageStates[key] && stageStates[key].status) || 'pending'
    }
    function labelOf(item, key) {
      if (!item) return '未开始'
      return item.preview ? '未归档' : (item.currentRevision && item.currentRevision.version ? 'v' + item.currentRevision.version : 'draft')
    }
    function valueOf(key, value) {
      if (value === null || value === undefined || value === '') return '待补充'
      if (key === 'target' && typeof value === 'object') {
        return [value.table, value.grain].filter(Boolean).join(' · ') || JSON.stringify(value)
      }
      if (Array.isArray(value)) return value.map(function (item) { return typeof item === 'string' ? item : (item.table || item.name || JSON.stringify(item)) }).join(' · ')
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }
    function fieldsOf(c) {
      var keys = ['goal', 'scope', 'target', 'grain', 'sources', 'acceptance', 'metrics']
      return keys.filter(function (key) { return c && c[key] !== undefined && c[key] !== null && c[key] !== '' }).slice(0, 5)
    }
    function selectedRevision(item) {
      var chosen = revisionState[0]
      var revisions = Array.isArray(item.revisions) ? item.revisions : []
      if (chosen && chosen.artifactId === item.artifactId) {
        var found = revisions.filter(function (revision) { return revision.revisionId === chosen.revisionId })[0]
        if (found) return found
      }
      return item.currentRevision || revisions[revisions.length - 1] || null
    }
    function revisionDiff(item, revision) {
      var revisions = Array.isArray(item.revisions) ? item.revisions : []
      var index = revisions.map(function (r) { return r.revisionId }).indexOf(revision && revision.revisionId)
      if (index <= 0) return null
      var before = (revisions[index - 1] && revisions[index - 1].content) || {}
      var after = (revision && revision.content) || {}
      var keys = Object.keys(after).concat(Object.keys(before).filter(function (key) { return !(key in after) }))
      var changed = keys.filter(function (key) {
        try { return JSON.stringify(before[key]) !== JSON.stringify(after[key]) } catch (error) { return false }
      }).slice(0, 4)
      function evidenceKey(evidence) {
        try { return (evidence.kind || '') + ':' + JSON.stringify(evidence.ref || {}) } catch (error) { return evidence.kind || '' }
      }
      var beforeEvidence = Array.isArray(revisions[index - 1] && revisions[index - 1].evidenceRefs) ? revisions[index - 1].evidenceRefs : []
      var afterEvidence = Array.isArray(revision && revision.evidenceRefs) ? revision.evidenceRefs : []
      var beforeKeys = beforeEvidence.map(evidenceKey)
      var afterKeys = afterEvidence.map(evidenceKey)
      var evidenceAdded = afterEvidence.filter(function (evidence) { return beforeKeys.indexOf(evidenceKey(evidence)) < 0 })
      var evidenceRemoved = beforeEvidence.filter(function (evidence) { return afterKeys.indexOf(evidenceKey(evidence)) < 0 })
      if (!changed.length && !evidenceAdded.length && !evidenceRemoved.length) return null
      return h('div', { className: 'rd-rev-diff' },
        h('b', null, 'diff v' + revisions[index - 1].version + ' → v' + revision.version),
        changed.map(function (key) {
          var tone = !(key in before) ? 'add' : !(key in after) ? 'rem' : 'chg'
          return h('span', { key: key, 'data-tone': tone }, tone === 'add' ? '+' : tone === 'rem' ? '−' : '~', ' ', key)
        }),
        evidenceAdded.length || evidenceRemoved.length ? h('div', { className: 'rd-rev-ev' },
          h('b', null, 'evidence'),
          evidenceAdded.map(function (evidence) { return h('span', { key: evidenceKey(evidence), 'data-tone': 'add' }, '+ ', evidenceLabel(evidence)) }),
          evidenceRemoved.map(function (evidence) { return h('span', { key: evidenceKey(evidence), 'data-tone': 'rem' }, '− ', evidenceLabel(evidence)) })) : null)
    }
    function evidenceRefsOf(revision) {
      return revision && Array.isArray(revision.evidenceRefs) ? revision.evidenceRefs : []
    }
    function evidenceLabel(evidence) {
      var ref = evidence && evidence.ref || {}
      if (evidence && evidence.kind === 'code_scan') return ref.scanId || 'scan'
      if (evidence && evidence.kind === 'deploy_log') return ref.deploymentId || 'deploy'
      if (evidence && evidence.kind === 'runtime_log') return [ref.platform, ref.task || ref.job, ref.runId].filter(Boolean).join(' / ')
      if (evidence && evidence.kind === 'query') return ref.queryId || ref.table || 'query'
      if (evidence && evidence.kind === 'catalog') return ref.table || 'catalog'
      return evidence && evidence.kind || 'evidence'
    }
    function evidenceTone(status) {
      return status === 'pass' ? 'pass' : status === 'warn' ? 'warn' : status === 'fail' ? 'fail' : 'unknown'
    }
    function evidenceDetail(item, revision, index) {
      var chosen = evidenceState[0]
      if (!chosen || chosen.artifactId !== item.artifactId || chosen.revisionId !== (revision && revision.revisionId) || chosen.index !== index) return null
      var refs = evidenceRefsOf(revision)
      var evidence = refs[index]
      if (!evidence) return null
      return h('div', { className: 'rd-ev-detail' },
        h('div', { className: 'rd-ev-detail-head' }, h('b', null, evidenceLabel(evidence)), h('span', { className: 'rd-badge', 'data-tone': evidenceTone(evidence.status) }, evidence.status || 'unknown')),
        h('dl', { className: 'rd-ev-kv' },
          h('dt', null, 'kind'), h('dd', null, evidence.kind),
          h('dt', null, 'ref'), h('dd', null, h('code', null, JSON.stringify(evidence.ref || {}))),
          h('dt', null, 'asOf'), h('dd', null, evidence.asOf || '—'),
          h('dt', null, 'source'), h('dd', null, evidence.source || 'unknown')),
        evidence.summary ? h('div', { className: 'rd-ev-summary' }, evidence.summary) : null,
        h('button', { type: 'button', className: 'rd-btn', onClick: function () { openEvidenceSection() } }, '在证据里打开')
      )
    }
    function openEvidenceSection() {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('dataops:panel-section', { detail: { section: 'evidence' } }))
        window.dispatchEvent(new CustomEvent('dataops:open-tab', { detail: { kind: 'dataops' } }))
      }
      close()
    }
    function stageBody(key, item) {
      if (!item) return h('div', { className: 'rd-stage-empty' }, '还没有产物。让 Agent 继续完成这个阶段。')
      var rev = selectedRevision(item)
      var c = rev && rev.content || {}
      var keys = fieldsOf(c)
      var revisions = Array.isArray(item.revisions) ? item.revisions : []
      return h('div', { className: 'rd-stage-body' },
        h('div', { className: 'rd-stage-body-head' }, h('b', null, item.kind || item.artifactId), h('span', null, ((rev && rev.status) || 'draft') + (item.preview ? ' · 未归档' : ' · ' + ((rev && rev.revisionId) || '')))),
        revisions.length > 1 ? h('div', { className: 'rd-rev-switch' }, revisions.map(function (revision) {
          var active = rev && revision.revisionId === rev.revisionId
          return h('button', { key: revision.revisionId, type: 'button', className: active ? 'on' : '', onClick: function () { revisionState[1]({ artifactId: item.artifactId, revisionId: revision.revisionId }); evidenceState[1](null) } }, 'v' + revision.version)
        })) : null,
        revisionDiff(item, rev),
        keys.length ? h('dl', { className: 'rd-float-grid' }, keys.map(function (field) { return h(React.Fragment, { key: field }, h('dt', null, field), h('dd', null, valueOf(field, c[field]))) })) : h('div', { className: 'rd-stage-empty' }, '已有一版产物，但还没有可展示的结构字段。'),
        h('div', { className: 'rd-ev-section' },
          h('div', { className: 'rd-ev-head' }, h('span', null, '证据'), h('span', { className: 'rd-badge' }, evidenceRefsOf(rev).length || '未关联')),
          evidenceRefsOf(rev).length ? h('div', { className: 'rd-ev-chips' }, evidenceRefsOf(rev).map(function (evidence, index) {
            return h('button', { key: index, type: 'button', className: 'rd-ev-chip', 'data-tone': evidenceTone(evidence.status), onClick: function () { evidenceState[1]({ artifactId: item.artifactId, revisionId: rev.revisionId, index: index }) } }, evidenceLabel(evidence), h('span', null, evidence.status || 'unknown'))
          })) : h('div', { className: 'rd-stage-empty' }, '未关联证据。'),
          evidenceRefsOf(rev).length ? h(React.Fragment, null, evidenceRefsOf(rev).map(function (_, index) { return evidenceDetail(item, rev, index) })) : null
        ),
        item.preview || !rev ? null : h('div', { className: 'rd-float-hash' }, 'revision · ' + (rev.revisionId || '') + ' · ' + String(rev.contentHash || '').slice(0, 12))
      )
    }
    function compose() {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('dataops:compose', { detail: { text: '基于当前 ' + (selected.kind || selected.artifactId) + ' ' + (revision.version ? 'v' + revision.version : '') + ' 继续修改：' } }))
      }
      close()
    }
    return h('div', { className: 'rd-float', role: 'dialog', 'aria-label': '当前迭代' },
      h('div', { className: 'rd-float-head' }, h('b', null, '当前迭代'), h('span', { className: 'rd-badge', 'data-tone': 'warn' }, workitem.id || 'Workitem'), h('button', { type: 'button', className: 'rd-float-x', 'aria-label': '关闭', onClick: close }, '×')),
      h('div', { className: 'rd-float-body' },
        h('div', { className: 'rd-float-stage-list' }, stages.map(function (stage) {
          var item = byKind[stage.key]
          var open = openState[0] === stage.key
          var status = statusOf(item, stage.key)
          return h('div', { key: stage.key, className: 'rd-stage-row' + (open ? ' open' : '') },
            h('button', { type: 'button', className: 'rd-stage-head', 'aria-expanded': open ? 'true' : 'false', onClick: function () { openState[1](stage.key) } },
              h('span', { className: 'rd-stage-name' }, stage.label),
              h('span', { className: 'rd-stage-summary' }, item ? (item.preview ? 'draft preview' : (item.currentRevision && item.currentRevision.content && (item.currentRevision.content.goal || item.currentRevision.content.scope) || '已归档')) : '未开始'),
              h('span', { className: 'rd-badge', 'data-tone': status === 'approved' ? 'pass' : status === 'review' || status === 'preview' ? 'warn' : undefined }, labelOf(item, stage.key)),
              h('span', { className: 'rd-stage-chevron', 'aria-hidden': 'true' }, '⌄')),
            h('div', { className: 'rd-stage-expand' + (open ? ' open' : ''), 'aria-hidden': open ? 'false' : 'true' }, h('div', { className: 'rd-stage-expand-inner' }, stageBody(stage.key, item))))
        })),
        h('div', { className: 'rd-float-actions' }, h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: compose }, '在会话继续修改'), h('button', { type: 'button', className: 'rd-btn', onClick: close }, '关闭'))))
  }

  function evidenceLabel(evidence) {
    var ref = evidence && evidence.ref || {}
    if (evidence && evidence.kind === 'code_scan') return ref.scanId || 'scan'
    if (evidence && evidence.kind === 'deploy_log') return ref.deploymentId || 'deploy'
    if (evidence && evidence.kind === 'runtime_log') return [ref.platform, ref.task || ref.job, ref.runId].filter(Boolean).join(' / ')
    if (evidence && evidence.kind === 'query') return ref.queryId || ref.table || 'query'
    if (evidence && evidence.kind === 'catalog') return ref.table || 'catalog'
    return evidence && evidence.kind || 'evidence'
  }

  function evidenceTone(status) {
    return status === 'pass' ? 'pass' : status === 'warn' ? 'warn' : status === 'fail' ? 'fail' : 'unknown'
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
    tab('dataops', 'dataops', 'DataOps', '仓库、资产、血缘、证据与检查', 10, DataOpsPanelBody)
  ]

  return {
    tabs: tabs,
    definitions: tabs.map(function (item) { return item.definition }),
    _internals: { AssetBody: AssetBody, LineageBody: LineageBody, EvidenceBody: EvidenceBody, DataOpsPanelBody: DataOpsPanelBody, ArtifactInspector: ArtifactInspector }
  }
}
