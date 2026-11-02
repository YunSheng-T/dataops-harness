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

  function LineageBody(props) {
    if (Flow && typeof Flow.LineageSurface === 'function') {
      return h('div', { className: 'do-lineage-inline' }, h(Flow.LineageSurface, { initialView: 'schedule' }))
    }
    var context = useContext(props.sessionId) || {}
    var lineage = context.lineage
    var design = context.design
    var schedulePayload = scheduleCardPayload(lineage)
    var graph = (lineage || (design && design.target)) ? buildGraph(lineage, design) : null
    var payload = schedulePayload || designCardPayload(graph)
    if (Cards && typeof Cards.LineageV2Card === 'function' && payload) {
      return h('div', { className: 'do-lineage-inline' },
        h('div', { className: 'do-label' }, payload.view === 'schedule' ? '当前会话 · 调度视图' : '当前会话血缘'),
        h(Cards.LineageV2Card, { block: { content: [{ type: 'text', text: JSON.stringify(payload) }] } }))
    }
    return h('div', { className: 'do-lineage-inline' },
      h(CtxCard, { title: '血缘', sub: '当前会话还没有血缘上下文' },
        h('div', { className: 'do-muted' }, '打开带血缘的设计/技术方案卡后，会在这里展示同一张血缘卡。')))
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


  var PANEL_SECTIONS = [
    ['overview', '概览'],
    ['repo', '仓库'],
    ['assets', '资产'],
    ['lineage', '血缘'],
    ['evidence', '证据'],
    ['checks', '检查']
  ]

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
    var dataState = React.useState(null)
    var loadingState = React.useState(false)
    var errorState = React.useState(null)
    var refreshState = React.useState(0)
    var section = sectionState[0]
    var data = dataState[0]
    var loading = loadingState[0]
    var error = errorState[0]

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
        h('div', { className: 'rd-actions' }, h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: function () { go('checks') } }, '运行检查'), h('button', { type: 'button', className: 'rd-btn', onClick: retry }, '刷新索引')),
        recent.length ? h('div', { className: 'rd-section-label' }, '最近发现') : null,
        recent.map(function (item, index) { return h(RepoFinding, { key: index, finding: item }) }))
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

    function Checks() {
      if (loading && !data) return h('div', { className: 'rd-skeletons' }, h('div', { className: 'rd-skeleton' }), h('div', { className: 'rd-skeleton rd-skeleton-short' }))
      if (error) return h(ErrorCard)
      if (!detection || !detection.detected) return h('div', { className: 'rd-empty' }, h('b', null, '当前 workspace 不是 DataOps 代码仓'), h('p', null, '检查只对可识别的仓库运行。'))
      var status = data && data.status === 'pass' ? '通过' : data && data.status === 'block' ? '阻断' : '警告'
      var tone = data && data.status === 'pass' ? 'pass' : data && data.status === 'block' ? 'fail' : 'warn'
      return h(React.Fragment, null,
        h('div', { className: 'rd-check-head' },
          h('div', null, h('b', null, '仓库检查'), h('span', { className: 'rd-meta-line' }, '只读 · ' + String(metrics.blocking || 0) + ' blocking · ' + String(metrics.warning || 0) + ' warning')),
          h('span', { className: 'rd-badge', 'data-tone': tone }, status)),
        h('div', { className: 'rd-actions' }, h('button', { type: 'button', className: 'rd-btn', onClick: retry }, '重新检查')),
        findings.length ? findings.map(function (item, index) { return h(RepoFinding, { key: index, finding: item }) }) : h('div', { className: 'rd-empty' }, h('b', null, '当前没有发现问题'), h('p', null, '规则全部通过。')))
    }

    var isRepoSection = section === 'overview' || section === 'repo' || section === 'checks'
    var sectionTitle = section === 'assets' ? '资产' : section === 'lineage' ? '血缘' : section === 'evidence' ? '证据' : '仓库体检'
    var sectionSub = section === 'assets' ? '当前 Session 的目标表与字段。' : section === 'lineage' ? '当前 Session 的上下游影响面。' : section === 'evidence' ? '当前 Session 的查询、时间范围与证据。' : '识别数据代码仓，检查 package 覆盖、LTS 结构和占位符。'
    var content = section === 'checks' ? h(Checks) : section === 'repo' ? h(Repo) : section === 'assets' ? h('div', { className: 'rd-legacy' }, h(AssetBody, { sessionId: props.sessionId })) : section === 'lineage' ? h('div', { className: 'rd-legacy' }, h(LineageBody, { sessionId: props.sessionId })) : section === 'evidence' ? h('div', { className: 'rd-legacy' }, h(EvidenceBody, { sessionId: props.sessionId })) : h(Overview)
    return h('div', { className: 'rd-panel' },
      h('div', { className: 'rd-head' },
        h('div', { className: 'rd-head-main' },
          h('span', { className: 'rd-eyebrow' }, isRepoSection ? 'DATAOPS / REPO DOCTOR' : 'DATAOPS / SESSION CONTEXT'),
          h('h2', { className: 'rd-title' }, sectionTitle),
          h('div', { className: 'rd-sub' }, sectionSub)),
        isRepoSection ? h('div', { className: 'rd-head-actions' },
          h('button', { type: 'button', className: 'rd-btn', onClick: retry }, '刷新'),
          h('button', { type: 'button', className: 'rd-btn rd-btn-primary', onClick: function () { go('checks') } }, '运行检查')) : null),
      h('div', { className: 'rd-nav', role: 'tablist' }, PANEL_SECTIONS.map(function (item) {
        return h('button', { key: item[0], type: 'button', className: 'rd-tab', 'data-active': String(section === item[0]), onClick: function () { sectionState[1](item[0]) } }, item[1])
      })),
      h('div', { className: 'rd-content' }, content))
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
    _internals: { AssetBody: AssetBody, LineageBody: LineageBody, EvidenceBody: EvidenceBody, DataOpsPanelBody: DataOpsPanelBody }
  }
}
