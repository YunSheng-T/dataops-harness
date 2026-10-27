/**
 * Catalog domain adapter: table metadata and table-level lineage.
 */
import { configError, formatError } from '../errors.js'
import { createHttpClient } from './http.js'
import { createCliClient } from './cli.js'

const MAX_COLUMNS = 40

function text(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeTable(raw, fallbackTable) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const rawColumns = Array.isArray(source.columns) ? source.columns : Array.isArray(source.fields) ? source.fields : []
  return {
    table: text(source.table) || text(source.tableName) || text(source.name) || fallbackTable,
    owner: text(source.owner) || text(source.ownerName),
    layer: text(source.layer) || text(source.zone),
    grain: text(source.grain) || text(source.granularity),
    partition: text(source.partition) || text(source.partitionColumn),
    rowCount: numberOrNull(source.rowCount || source.rows),
    updatedAt: text(source.updatedAt) || text(source.updated_at),
    columns: rawColumns.slice(0, MAX_COLUMNS).map(column => ({
      name: text(column && column.name) || '未命名',
      type: text(column && column.type) || 'unknown',
      comment: text(column && column.comment) || ''
    }))
  }
}

export function normalizeLineage(raw, fallback) {
  const source = raw && typeof raw === 'object' ? raw : {}
  if (!Array.isArray(source.nodes) || !Array.isArray(source.edges)) {
    throw formatError('血缘返回缺少 nodes/edges')
  }
  const seen = new Set()
  const nodes = []
  for (const node of source.nodes) {
    const table = typeof node === 'string' ? node : text(node && node.table) || text(node && node.name)
    if (!table || seen.has(table)) continue
    seen.add(table)
    nodes.push({
      table,
      type: typeof node === 'object' ? text(node.type) || text(node.layer) || null : null,
      owner: typeof node === 'object' ? text(node.owner) || null : null
    })
  }
  const edges = source.edges.map(edge => ({
    from: text(edge && edge.from) || text(edge && edge.source),
    to: text(edge && edge.to) || text(edge && edge.target),
    kind: text(edge && edge.kind) || text(edge && edge.type) || 'unknown'
  })).filter(edge => edge.from && edge.to)
  return {
    table: fallback.table,
    direction: fallback.direction,
    depth: fallback.depth,
    nodes,
    edges,
    truncated: source.truncated === true
  }
}

export function createCatalog(config, options) {
  const domain = config.catalog
  if (domain.kind === 'mock') return options.mock
  const transport = domain.kind === 'cli'
    ? createCliClient(domain, options)
    : createHttpClient(domain, options)

  function limitLineage(lineage, maxNodes) {
    if (lineage.nodes.length <= maxNodes) return lineage
    const nodes = lineage.nodes.slice(0, maxNodes)
    const allowed = new Set(nodes.map(node => node.table))
    return {
      ...lineage,
      nodes,
      edges: lineage.edges.filter(edge => allowed.has(edge.from) && allowed.has(edge.to)),
      truncated: true
    }
  }

  return {
    kind: domain.kind,
    async getTable(args) {
      const table = args && args.table
      if (!table) throw configError('catalog 模式需要 table', '请提供表名，例如 dwd.orders。')
      const raw = await transport.call('table', { table }, { signal: args && args.signal })
      return normalizeTable(raw, table)
    },
    async getLineage(args) {
      const table = args && args.table
      if (!table) throw configError('catalog 模式需要 table', '请提供表名，例如 dwd.orders。')
      const direction = ['up', 'down', 'both'].includes(args.direction) ? args.direction : 'both'
      const depth = Math.max(1, Math.min(config.maxDepth, Number(args.depth) || 1))
      const raw = await transport.call('lineage', { table, direction, depth }, { signal: args && args.signal })
      return limitLineage(normalizeLineage(raw, { table, direction, depth }), config.maxNodes)
    }
  }
}
