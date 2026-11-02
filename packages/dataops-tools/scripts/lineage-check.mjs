#!/usr/bin/env node
import { createMockLineageProvider } from '../src/lineage/mock.js'
import { createLineageRoute } from '../src/lineage/route.js'

const checks = []
const check = (name, fn) => checks.push([name, fn])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

check('mock lineage index and graphs are coherent', () => {
  const provider = createMockLineageProvider()
  const index = provider.index()
  assert(index.objects.length === 7, 'object count')
  assert(index.counts.table_lineage === 4 && index.counts.data_flow === 2 && index.counts.task_dag === 1, 'kind counts')
  const table = provider.graph('table_lineage', 'table:dwd.orders')
  assert(table.ok && table.graph.kind === 'table_lineage' && table.graph.nodes.length === 4, 'table graph')
  assert(table.graph.edges.every(edge => edge.from && edge.to), 'table edges')
  const flow = provider.graph('data_flow', 'flow:channel_daily')
  assert(flow.ok && flow.graph.nodes.some(node => node.type === 'etl_job'), 'data flow graph')
  const task = provider.graph('task_dag', 'task:channel_daily_mixed')
  assert(task.ok && task.graph.nodes.some(node => node.type === 'job'), 'task dag graph')
  assert(task.graph.source === 'mock' && task.graph.asOf, 'source/asOf')
})

check('lineage route exposes index and graph', async () => {
  let route
  const provider = createMockLineageProvider()
  const connection = { fetch: { register(definition) { route = definition.fetch; return () => {} } } }
  const ctx = {
    get(name) {
      if (name === 'connection') return connection
      if (name === 'agents') return { get(id) { return id === 's1' ? { id } : undefined } }
      return undefined
    },
    effect(fn) { return fn() }
  }
  createLineageRoute(ctx, provider)
  assert(typeof route === 'function', 'route registered')
  const index = await route(new Request('http://x/api/dataops/lineage?sessionId=s1&mode=index'))
  assert(index.status === 200 && (await index.json()).objects.length === 7, 'index response')
  const graph = await route(new Request('http://x/api/dataops/lineage?sessionId=s1&mode=graph&kind=data_flow&focus=flow:channel_daily'))
  assert(graph.status === 200 && (await graph.json()).graph.kind === 'data_flow', 'graph response')
  const missing = await route(new Request('http://x/api/dataops/lineage?sessionId=s1&mode=graph&kind=nope'))
  assert(missing.status === 400, 'invalid kind')
})

const failures = []
for (const [name, fn] of checks) {
  try { await fn(); console.log('ok   ' + name) } catch (error) { failures.push([name, error]) }
}
if (failures.length) {
  for (const [name, error] of failures) console.error('FAIL ' + name + ': ' + error.message)
  process.exit(1)
}
console.log('lineage: PASS (' + checks.length + ' checks)')
