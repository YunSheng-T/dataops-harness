/**
 * Payload contracts shared by tools and cards.
 *
 * Every payload carries provenance (`source`, `asOf`), a `partial` flag and
 * `gaps` so the UI can say "this is incomplete" instead of inventing values.
 */
function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16)
}

export function gap(id, message, severity, action) {
  return { id, message, severity: severity || 'warning', action: action || '补充信息后重试。' }
}

export function requirementPayload(ticket, options) {
  const source = (options && options.source) || 'devops'
  const asOf = (options && options.asOf) || now()
  const gaps = []
  if (!ticket.goal) gaps.push(gap('G-GOAL', '需求描述缺失', 'warning', '在 devops 工单里补充需求描述。'))
  if (!ticket.acceptance || ticket.acceptance.length === 0) gaps.push(gap('G-ACCEPTANCE', '验收标准缺失', 'warning', '补充可验证的验收标准。'))
  if (!ticket.impacts || ticket.impacts.length === 0) gaps.push(gap('G-IMPACT', '影响资产未登记', 'warning', '在工单里关联表/报表/API。'))
  if (!ticket.owner) gaps.push(gap('G-OWNER', '负责人缺失', 'info', '在工单里指定负责人。'))

  return {
    kind: 'requirement',
    id: ticket.id,
    title: ticket.title,
    source,
    priority: ticket.priority || '未定级',
    goal: ticket.goal || '待确认',
    scope: ticket.scope || '待确认（devops 未提供范围字段）',
    acceptance: ticket.acceptance || [],
    impacts: (ticket.impacts || []).map(item => item.type + ' · ' + item.name),
    status: ticket.status || '未知',
    owner: ticket.owner || '未指定',
    links: ticket.links || [],
    asOf,
    partial: gaps.length > 0,
    gaps,
    artifact: 'requirement.yaml'
  }
}

export function formatImpact(lineage, targetTable) {
  if (!lineage) return null
  const seen = new Set()
  const top = []
  for (const node of lineage.nodes) {
    if (node.table === targetTable || seen.has(node.table)) continue
    if (lineage.direction === 'up') continue
    seen.add(node.table)
    top.push({ table: node.table, type: node.type || 'table', owner: node.owner || '未知' })
  }
  return { count: top.length, top: top.slice(0, 5), truncated: lineage.truncated === true }
}

export function designPayload(design, options) {
  const source = (options && options.source) || 'mock'
  const asOf = (options && options.asOf) || now()
  const gaps = (options && options.gaps) || []
  const target = design.target || {}
  const sources = (design.sources || []).map(item => {
    const sourceItem = {
      table: item.table,
      fields: item.fields || [],
      owner: item.owner || null,
      rowCount: item.rowCount === undefined ? null : item.rowCount,
      updatedAt: item.updatedAt || null
    }
    if (item.filter !== undefined) sourceItem.filter = item.filter
    if (item.join !== undefined) sourceItem.join = item.join
    return sourceItem
  })

  const payload = {
    kind: 'design',
    status: design.status || 'draft',
    target: {
      table: target.table,
      grain: target.grain || '待确认',
      partition: target.partition || '—'
    },
    sources,
    steps: design.steps || [],
    schedule: design.schedule || {},
    metrics: design.metrics || [],
    impact: design.impact || formatImpact(options && options.lineage, target.table) || null,
    asOf,
    partial: gaps.length > 0,
    gaps,
    artifact: 'design.yaml',
    updatedAt: asOf
  }
  if (design.scenario !== undefined) payload.scenario = design.scenario
  return payload
}

export function tablePayload(meta, options) {
  const source = (options && options.source) || 'catalog'
  return {
    kind: 'table',
    table: meta.table,
    owner: meta.owner || '未知',
    layer: meta.layer || '—',
    grain: meta.grain || '待确认',
    partition: meta.partition || '—',
    rowCount: meta.rowCount === undefined ? null : meta.rowCount,
    updatedAt: meta.updatedAt || null,
    columns: meta.columns || [],
    source,
    asOf: (options && options.asOf) || now(),
    partial: !meta.columns || meta.columns.length === 0,
    gaps: !meta.columns || meta.columns.length === 0
      ? [gap('G-COLUMNS', '字段信息缺失', 'warning', '确认表是否已登记元数据。')]
      : []
  }
}

export function lineagePayload(lineage, options) {
  const source = (options && options.source) || 'catalog'
  return {
    kind: 'lineage',
    table: lineage.table,
    direction: lineage.direction,
    depth: lineage.depth,
    nodes: lineage.nodes,
    edges: lineage.edges,
    truncated: lineage.truncated === true,
    source,
    asOf: (options && options.asOf) || now(),
    partial: lineage.nodes.length === 0,
    gaps: lineage.nodes.length === 0
      ? [gap('G-LINEAGE', '没有查到血缘关系', 'warning', '确认该表是否在血缘系统中登记。')]
      : []
  }
}

export function techPlanPayload(plan, options) {
  return {
    ...plan,
    kind: 'tech_plan',
    source: (options && options.source) || 'mock',
    asOf: (options && options.asOf) || now(),
    partial: false,
    gaps: [],
    updatedAt: (options && options.asOf) || now()
  }
}

export function evidencePayload(evidence, options) {
  return {
    ...evidence,
    kind: 'evidence',
    source: (options && options.source) || 'mock',
    asOf: (options && options.asOf) || now(),
    partial: false,
    gaps: []
  }
}

export { now }

export function stagePayload(data, options) {
  return {
    ...data,
    source: (options && options.source) || 'mock',
    asOf: (options && options.asOf) || now(),
    partial: false,
    gaps: []
  }
}
