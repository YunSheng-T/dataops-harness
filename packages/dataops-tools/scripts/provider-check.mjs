// Provider contract checks: a local HTTP stub and a fake CLI exercise the same
// tool surface without touching the intranet.
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createTools } from '../src/index.js'
import { normalizeConfig } from '../src/config.js'

const TOKEN = 'super-secret-token'
process.env.DATAOPS_TEST_TOKEN = TOKEN

const ticket = {
  ticketId: 'T-1',
  name: '渠道日报改造',
  detail: '渠道日报从下单口径改为支付口径，按渠道按天输出。',
  priority: 'P2',
  assignee: { name: '交易组' },
  state: '进行中',
  acceptanceCriteria: '差异 < 0.5%\n05:00 前产出',
  tables: [{ type: 'table', name: 'dws.trade_channel_daily' }],
  updatedAt: '2026-10-25 09:30'
}

const tables = {
  'dws.trade_channel_daily': {
    tableName: 'dws.trade_channel_daily', ownerName: '交易组', zone: 'dws',
    granularity: '渠道 × 日期', partitionColumn: 'dt', rowCount: 12000,
    fields: [{ name: 'dt', type: 'date' }, { name: 'channel_id', type: 'string' }, { name: 'order_cnt', type: 'bigint' }]
  },
  'dwd.orders': {
    tableName: 'dwd.orders', ownerName: '交易组', zone: 'dwd',
    granularity: '订单', partitionColumn: 'dt', rowCount: 2000000,
    fields: [{ name: 'order_id', type: 'string' }, { name: 'channel_id', type: 'string' }, { name: 'amount', type: 'decimal' }]
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (req.method !== 'GET') return send(res, 405, { error: 'method' })
  if (url.pathname.startsWith('/api/tickets/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/tickets/'.length))
    if (id === 'T-401') return send(res, 401, { error: 'unauthorized' })
    if (id === 'T-404') return send(res, 404, { error: 'missing' })
    if (id === 'T-SLOW') return setTimeout(() => send(res, 200, ticket), 300)
    return send(res, 200, { ...ticket, ticketId: id })
  }
  if (url.pathname.startsWith('/api/tables/')) {
    const table = decodeURIComponent(url.pathname.slice('/api/tables/'.length))
    return send(res, 200, tables[table] || { tableName: table, fields: [] })
  }
  if (url.pathname === '/api/lineage') {
    const table = url.searchParams.get('table')
    const direction = url.searchParams.get('direction') || 'both'
    const nodes = direction === 'up'
      ? ['dwd.orders', 'dim.channel', table]
      : [table, 'ads.channel_report', 'api.channel_metrics']
    const edges = direction === 'up'
      ? [{ from: 'dwd.orders', to: table }, { from: 'dim.channel', to: table }]
      : [{ from: table, to: 'ads.channel_report' }, { from: table, to: 'api.channel_metrics' }]
    return send(res, 200, { nodes, edges, truncated: false })
  }
  return send(res, 404, { error: 'not found' })
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const baseUrl = 'http://127.0.0.1:' + port

const failures = []
const expect = (condition, message) => { if (!condition) failures.push(message) }
const signal = new AbortController().signal

function isLossless(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0)
  if (typeof value !== 'object' || ancestors.has(value)) return false
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.every(item => isLossless(item, ancestors))
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return false
    return Reflect.ownKeys(value).every(key => typeof key === 'string' && isLossless(value[key], ancestors))
  } finally {
    ancestors.delete(value)
  }
}


function makeTools(overrides) {
  return createTools(normalizeConfig({
    timeoutMs: 1000,
    retry: 0,
    ...overrides
  }), {})
}

const httpTools = makeTools({
  provider: 'http',
  devops: { baseUrl, tokenRef: 'DATAOPS_TEST_TOKEN', paths: { ticket: '/api/tickets/{ticketId}' } },
  catalog: {
    baseUrl, tokenRef: 'DATAOPS_TEST_TOKEN',
    paths: { table: '/api/tables/{table}', lineage: '/api/lineage?table={table}&direction={direction}&depth={depth}' }
  }
})
const byName = (tools, name) => tools.find(tool => tool.name === name)
const run = (tools, name, args) => byName(tools, name).execute(args, { signal })

try {
  const requirement = await run(httpTools, 'dataops_requirement_extract_spec', { ticketId: 'T-1' })
  expect(requirement.kind === 'requirement', 'http requirement kind')
  expect(requirement.id === 'T-1', 'http ticket id alias')
  expect(requirement.source === 'http', 'http source')
  expect(requirement.acceptance.length === 2, 'acceptanceCriteria split')
  expect(requirement.impacts.length === 1, 'tables alias')
  expect(JSON.stringify(requirement).includes(TOKEN) === false, 'token leaked into payload')
  expect(isLossless(requirement), 'http requirement is not lossless JSON')

  const design = await run(httpTools, 'dataops_design_compose_model', { ticketId: 'T-1' })
  expect(design.target.table === 'dws.trade_channel_daily', 'design target from ticket impact')
  expect(design.sources.length >= 1, 'design sources from upstream lineage')
  expect(design.impact && design.impact.count >= 2, 'design impact from downstream lineage')
  expect(design.partial === true, 'design should mark missing steps/schedule')
  expect(design.gaps.some(item => item.id === 'G-STEPS'), 'steps gap')
  expect(isLossless(design), 'http design is not lossless JSON')

  const table = await run(httpTools, 'dataops_shared_read_table', { table: 'dwd.orders' })
  expect(table.kind === 'table' && table.columns.length === 3, 'http table columns')
  const lineage = await run(httpTools, 'dataops_shared_read_lineage', { table: 'dws.trade_channel_daily', direction: 'down' })
  expect(lineage.kind === 'lineage' && lineage.nodes.length === 3, 'http lineage nodes')

  let auth
  try { await run(httpTools, 'dataops_requirement_extract_spec', { ticketId: 'T-401' }) } catch (error) { auth = error }
  expect(auth && auth.code === 'AUTH', '401 should map to AUTH')
  expect(auth && !String(auth.message).includes(TOKEN), 'token leaked into error')

  let missing
  try { await run(httpTools, 'dataops_requirement_extract_spec', { ticketId: 'T-404' }) } catch (error) { missing = error }
  expect(missing && missing.code === 'NOT_FOUND', '404 should map to NOT_FOUND')

  const slowTools = makeTools({
    provider: 'http',
    timeoutMs: 50,
    devops: { baseUrl, tokenRef: 'DATAOPS_TEST_TOKEN', paths: { ticket: '/api/tickets/{ticketId}' } },
    catalog: { baseUrl, tokenRef: 'DATAOPS_TEST_TOKEN', paths: { table: '/api/tables/{table}', lineage: '/api/lineage?table={table}' } }
  })
  let slow
  try { await run(slowTools, 'dataops_requirement_extract_spec', { ticketId: 'T-SLOW' }) } catch (error) { slow = error }
  expect(slow && (slow.code === 'TIMEOUT' || slow.name === 'TimeoutError' || slow.name === 'AbortError'), 'timeout should reject')

  const cliPath = fileURLToPath(new URL('../tests/fixtures/cli.mjs', import.meta.url))
  const cliTools = makeTools({
    provider: 'cli',
    devops: { commands: { ticket: [process.execPath, cliPath, 'ticket', '{ticketId}'] } },
    catalog: {
      commands: {
        table: [process.execPath, cliPath, 'table', '{table}'],
        lineage: [process.execPath, cliPath, 'lineage', '{table}', '{direction}', '{depth}']
      }
    }
  })
  const cliRequirement = await run(cliTools, 'dataops_requirement_extract_spec', { ticketId: 'T-1' })
  expect(cliRequirement.kind === 'requirement' && cliRequirement.source === 'cli', 'cli requirement')
  expect(isLossless(cliRequirement), 'cli requirement is not lossless JSON')
  const cliTable = await run(cliTools, 'dataops_shared_read_table', { table: 'dwd.orders' })
  expect(cliTable.kind === 'table' && cliTable.columns.length === 3, 'cli table')
  const cliLineage = await run(cliTools, 'dataops_shared_read_lineage', { table: 'dws.trade_channel_daily', direction: 'down' })
  expect(cliLineage.kind === 'lineage' && cliLineage.nodes.length === 3, 'cli lineage')
} finally {
  await new Promise(resolve => server.close(resolve))
}

if (failures.length) {
  console.error('provider-check FAIL')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('provider-check ok: http requirement/design/table/lineage + auth/404/timeout + cli requirement/table/lineage')
