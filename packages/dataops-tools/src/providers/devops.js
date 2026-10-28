/**
 * Devops domain adapter: returns a normalized ticket DTO.
 * Field aliases keep the adapter tolerant of the internal API's naming.
 */
import { configError } from '../errors.js'
import { createHttpClient } from './http.js'
import { createCliClient } from './cli.js'

function text(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function list(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean)
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(/\r?\n|；|;/u).map(item => item.trim()).filter(Boolean)
  }
  return []
}

function impacts(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') {
      const [type, name] = item.split(' · ')
      return { type: type || '资产', name: name || item }
    }
    if (item && typeof item === 'object') {
      return {
        type: text(item.type) || '资产',
        name: text(item.name) || text(item.table) || text(item.id) || '未命名'
      }
    }
    return { type: '资产', name: String(item) }
  })
}

function links(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return { label: item, url: item }
    if (item && typeof item === 'object') {
      return { label: text(item.label) || text(item.title) || text(item.url) || '链接', url: text(item.url) || '' }
    }
    return { label: String(item), url: '' }
  }).filter(item => item.url !== '')
}

export function normalizeTicket(raw, fallbackId) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const assignee = source.assignee && typeof source.assignee === 'object' ? source.assignee.name : source.assignee
  return {
    id: text(source.id) || text(source.ticketId) || text(source.code) || fallbackId,
    title: text(source.title) || text(source.name) || '未命名需求',
    goal: text(source.description) || text(source.detail) || text(source.summary),
    priority: text(source.priority) || text(source.level),
    owner: text(source.owner) || text(assignee),
    status: text(source.status) || text(source.state),
    acceptance: list(source.acceptance || source.acceptanceCriteria),
    impacts: impacts(source.assets || source.tables || source.impactedAssets),
    links: links(source.links || source.url),
    updatedAt: text(source.updatedAt) || text(source.updated_at) || text(source.modifiedAt)
  }
}

export function createDevops(config, options) {
  const domain = config.devops
  if (domain.kind === 'mock') return options.mock
  const transport = domain.kind === 'cli'
    ? createCliClient(domain, options)
    : createHttpClient(domain, options)

  return {
    kind: domain.kind,
    async getTicket(args) {
      const ticketId = args && args.ticketId
      if (!ticketId) throw configError('devops 模式需要 ticketId', '请提供需求单号，例如 REQ-3821。')
      const raw = await transport.call('ticket', { ticketId }, { signal: args && args.signal })
      return normalizeTicket(raw, ticketId)
    },
    async listTickets(args = {}) {
      const raw = await transport.call('list', { assignee: args.assignee, status: args.status }, { signal: args.signal })
      const items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : [])
      return items.map(item => normalizeTicket(item)).filter(item => item.id)
    }
  }
}
