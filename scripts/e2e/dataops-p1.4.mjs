#!/usr/bin/env node
/**
 * P1.4 natural-language acceptance harness.
 *
 * Local-only: launches a DataOps profile + headless Chrome, drives the real
 * Web composer and the native approval panel, then asserts on workitems/.
 *
 * usage:
 *   node scripts/e2e/dataops-p1.4.mjs --scenario full-allow
 *   node scripts/e2e/dataops-p1.4.mjs --scenario full-reject
 *   node scripts/e2e/dataops-p1.4.mjs --scenario query
 *   node scripts/e2e/dataops-p1.4.mjs --scenario never
 *
 * options: --keep (keep generated workitem on success), --timeout <ms>
 */
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(import.meta.dirname, '..', '..')
const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const scenario = arg('--scenario', 'full-allow')
const keep = args.includes('--keep')
const timeoutMs = Number(arg('--timeout', '300000'))
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const dshBin = process.env.DSH_BIN || 'dsh'
const runId = 'p14-' + Date.now().toString(36)
const failures = []
const notes = []
const check = (ok, message) => { if (!ok) { failures.push(message); console.error('FAIL ' + message) } else console.log('ok   ' + message) }
const sleep = ms => delay(ms)
const workitemsDir = join(root, 'workitems')

function safeRemove(path) {
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  } catch (error) {
    console.warn('cleanup warning:', path, error.message)
  }
}

function workitemNames() {
  if (!existsSync(workitemsDir)) return []
  return readdirSync(workitemsDir).filter(name => name !== '_template' && name !== 'README.md')
    .filter(name => statSync(join(workitemsDir, name)).isDirectory())
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolvePort(port))
    })
  })
}

async function waitJson(url, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const result = await fetch(url)
      if (result.ok) return await result.json()
    } catch { /* starting */ }
    await sleep(300)
  }
  throw new Error('timeout waiting for ' + url)
}

async function startServer(port, mode) {
  console.log('starting dsh on', port, 'mode', mode)
  const child = spawn(dshBin, ['--profile', 'dataops', '--no-open', '--port', String(port)], {
    cwd: root,
    env: { ...process.env, DSH_PERMISSION_MODE: mode },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=([A-Za-z0-9_-]+)/)
    if (match) return { child, url: match[0] }
    if (child.exitCode !== null) throw new Error('dsh exited: ' + output.slice(-800))
    await sleep(300)
  }
  throw new Error('timeout waiting for dsh: ' + output.slice(-800))
}

async function startChrome(port, url, userDataDir) {
  console.log('starting chrome on', port)
  safeRemove(userDataDir)
  const chromeArgs = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDataDir,
    '--window-size=1440,900', url
  ]
  const child = spawn(chromePath, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  let chromeLog = ''
  child.stdout.on('data', chunk => { chromeLog += chunk })
  child.stderr.on('data', chunk => { chromeLog += chunk })
  let pages
  try {
    pages = await waitJson('http://127.0.0.1:' + port + '/json', 20000)
  } catch (error) {
    throw new Error(error.message + '; chrome log: ' + chromeLog.slice(-1200) + '; chrome exit: ' + child.exitCode)
  }
  const page = pages.find(item => item.type === 'page' && item.url && item.url.includes('127.0.0.1'))
  if (!page) throw new Error('no DSH Chrome page; chrome log: ' + chromeLog.slice(-800) + '; targets: ' + pages.map(item => item.url).join(', '))
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolveSocket, reject) => { ws.onopen = resolveSocket; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  const errors = []
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); return }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'exception')
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push((message.params.args || []).map(a => a.value || a.description || '').join(' '))
  }
  const send = (method, params = {}) => new Promise(resolve => {
    const callId = ++id
    pending.set(callId, resolve)
    ws.send(JSON.stringify({ id: callId, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return response.result?.result?.value
  }
  await send('Runtime.enable')
  await send('Page.enable')
  return { child, ws, send, evaluate, errors }
}

async function waitFor(predicate, ms, label) {
  console.log('wait:', label)
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await predicate()) return true
    await sleep(500)
  }
  throw new Error('timeout waiting for ' + label)
}

async function dismissPreview(evaluate) {
  for (let i = 0; i < 20; i++) {
    const modal = await evaluate(`document.body.innerText.includes('预览版说明')`)
    if (!modal) return
    const clicked = await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='继续');if(b){b.click();return true}return false})()`)
    if (!clicked) { await sleep(400); continue }
    await sleep(500)
  }
}

async function ensureComposer(evaluate) {
  await waitFor(async () => evaluate(`!!document.querySelector('[role="textbox"][contenteditable="true"]')`), 30000, 'composer')
}

async function sendPrompt(page, prompt) {
  await waitFor(async () => {
    const text = await bodyText(page)
    return !text.includes('深度求索中') && !text.includes('正在调用工具')
  }, 180000, 'agent idle before prompt')
  const geometry = await page.evaluate(`(()=>{const el=document.querySelector('[role="textbox"][contenteditable="true"]');if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,modal:document.body.innerText.includes('预览版说明')}})()`)
  if (!geometry) throw new Error('composer missing')
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: geometry.x, y: geometry.y, button: 'left', clickCount: 1 })
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: geometry.x, y: geometry.y, button: 'left', clickCount: 1 })
  await sleep(150)
  await page.send('Input.insertText', { text: prompt })
  await sleep(200)
  let entered = await page.evaluate(`(()=>{const el=document.querySelector('[role="textbox"][contenteditable="true"]');return !!el && el.innerText.includes(${JSON.stringify(prompt.slice(0, 12))})})()`)
  if (!entered) {
    entered = await page.evaluate(`(()=>{const el=document.querySelector('[role="textbox"][contenteditable="true"]');if(!el)return false;el.focus();document.execCommand('insertText',false,${JSON.stringify(prompt)});return el.innerText.includes(${JSON.stringify(prompt.slice(0, 12))})})()`)
  }
  if (!entered) {
    const state = await page.evaluate(`({modal:document.body.innerText.includes('预览版说明'),active:document.activeElement?.tagName,text:document.querySelector('[role="textbox"][contenteditable="true"]')?.innerText?.slice(0,80)})`)
    throw new Error('composer did not accept prompt text: ' + JSON.stringify(state))
  }
  await sleep(200)
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
  await waitFor(async () => (await bodyText(page)).includes(prompt.slice(0, 18)), 15000, 'prompt submitted')
}

async function bodyText(page) {
  return page.evaluate('document.body.innerText || ""')
}

async function currentCardText(page) {
  return page.evaluate(`document.querySelector('.do-turn-card')?.innerText || ''`)
}

async function waitForApproval(page, ms) {
  await waitFor(async () => {
    const text = await bodyText(page)
    return text.includes('等待审批') && (text.includes('允许一次') || text.includes('拒绝'))
  }, ms, 'native approval')
}

async function waitForApprovalOrPause(page, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const text = await bodyText(page)
    if (text.includes('允许一次') && text.includes('拒绝')) return 'approval'
    const busy = text.includes('深度求索中') || text.includes('正在调用工具')
    const ask = text.includes('批准一次 mock 发布') || text.includes('保持 pending，暂不发布')
    const explicit = text.includes('请回复是否批准发布') && !text.includes('released')
    if (!busy && text.includes('已完成，用时') && (ask || explicit)) return 'pause'
    await sleep(500)
  }
  throw new Error('timeout waiting for native approval or clarification pause')
}

async function waitForTurnComplete(page, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const text = await bodyText(page)
    const busy = text.includes('深度求索中') || text.includes('正在调用工具')
    if (!busy && text.includes('已完成')) return
    await sleep(700)
  }
  throw new Error('timeout waiting for turn completion')
}

async function clickApproval(page, action) {
  const label = action === 'allow' ? '允许一次' : '拒绝'
  const clicked = await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(label)});if(b){b.click();return true}return false})()`)
  if (!clicked) throw new Error('approval button missing: ' + label)
}

function readWorkitems() {
  return workitemNames().map(name => {
    const file = join(workitemsDir, name, 'item.yaml')
    return { name, file, text: existsSync(file) ? readFileSync(file, 'utf8') : '' }
  })
}

function referencedFiles(text, folder) {
  const refs = new Set()
  for (const match of text.matchAll(new RegExp('`?\\s*(?:artifact|deliverable|path):\\s*(' + folder + '\\/[^\\s#]+)', 'gu'))) refs.add(match[1])
  for (const match of text.matchAll(new RegExp('\\n\\s*-\\s*(' + folder + '\\/[^\\s#]+)', 'gu'))) refs.add(match[1])
  return refs
}

function assertWorkitem(item, action, runStart) {
  check(item.text.length > 0, 'workitem item.yaml exists')
  check(/\btype:\s*delivery\b/u.test(item.text), 'workitem type=delivery')
  check(/\bstage:\s*(requirement|design|scheme|develop|cicd|review)\b/u.test(item.text), 'workitem stage valid')
  check(/\bstages:\s*/u.test(item.text), 'workitem stages present')
  for (const stage of ['requirement', 'design', 'scheme', 'develop', 'cicd', 'review']) {
    check(item.text.includes(stage + ':'), 'workitem stage field ' + stage)
  }
  const approvalBlock = item.text.slice(item.text.indexOf('approvals:'))
  if (action === 'reject') check(/status:\s*rejected/u.test(approvalBlock), 'workitem approval recorded as rejected')
  if (action === 'allow') check(/status:\s*approved/u.test(approvalBlock), 'workitem approval recorded as approved')
  const badRefs = []
  for (const folder of ['deliverables', 'artifacts', 'evidence']) {
    for (const ref of referencedFiles(item.text, folder)) {
      if (!existsSync(join(workitemsDir, item.name, ref))) badRefs.push(ref)
    }
  }
  check(badRefs.length === 0, 'workitem refs exist' + (badRefs.length ? ': ' + badRefs.join(', ') : ''))
  check(statSync(join(workitemsDir, item.name)).mtimeMs >= runStart, 'workitem created during run')
}

async function runFull(action) {
  const before = new Set(workitemNames())
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-' + runId))
  const startedAt = Date.now()
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    console.log('sending stage-1 prompt')
    await sendPrompt(page, '帮我把渠道日报从下单口径改成支付口径，先走需求、设计、方案，建工作项并落盘；用 mock 数据。有关键缺口按 mock 默认假设记入 gaps，不要停下来等确认。这是验收测试：请新建工作项，不要复用已有工作项。')
    await waitForTurnComplete(page, 180000)
    console.log('sending stage-2 prompt')
    await sendPrompt(page, '继续开发、扫描、编译、测试；到发布前停下来，直接调用 release 让 DSH 原生审批，不要再用聊天问我是否发布。用 mock 数据，不要真实发布。')
    let gateState = await waitForApprovalOrPause(page, timeoutMs)
    if (gateState === 'pause') {
      console.log('agent paused before release; sending explicit release follow-up')
      await sendPrompt(page, '按当前 mock 假设继续，直接调用 release 发起 DSH 发布审批；缺口记录到 gaps，不要再用聊天问我。')
      gateState = await waitForApprovalOrPause(page, timeoutMs)
    }
    if (gateState !== 'approval') throw new Error('no native approval after continuation')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p1.4-' + action + '-approval.png'), Buffer.from(r.result.data, 'base64')) })
    await clickApproval(page, action)
    await waitFor(async () => {
      const text = await bodyText(page)
      return !text.includes('深度求索中') && !text.includes('正在调用工具')
    }, 180000, 'turn completion after approval')
    await sleep(2000)
    const text = await bodyText(page)
    const tail = text.slice(text.lastIndexOf('已完成，用时'))
    check(!tail.includes('dataops_'), 'final answer does not expose tool names')
    check(action === 'allow' ? /released|allowed-once|已执行|已提交发布|mock 发布/u.test(text) : /rejected|已拒绝|未执行|审批不可用/u.test(text), 'approval outcome appears in UI')
    const after = readWorkitems().filter(item => !before.has(item.name))
    check(after.length >= 1, 'new workitem created')
    const item = after[after.length - 1]
    assertWorkitem(item, action, startedAt)
    notes.push({ scenario: action, workitem: item.name, text: tail.slice(-1200) })
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p1.4-' + action + '-final.png'), Buffer.from(r.result.data, 'base64')) })
    if (!keep && after.length) {
      for (const created of after) rmSync(join(workitemsDir, created.name), { recursive: true, force: true })
    }
    return { workitems: after.map(item => item.name), page }
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-' + runId))
  }
}

async function runQuery() {
  const before = new Set(workitemNames())
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '先别改任何东西：看一下 dws.trade_channel_daily 的下游影响，给我影响面即可。用 mock 数据。')
    await sleep(1500)
    await waitFor(async () => {
      const text = await bodyText(page)
      return text.includes('已完成') || (!text.includes('深度求索中') && text.includes('影响'))
    }, 180000, 'query completion')
    await sleep(1000)
    const text = await bodyText(page)
    check(!text.includes('dataops_'), 'query answer does not expose tool names')
    const after = readWorkitems().filter(item => !before.has(item.name))
    check(after.length === 0, 'quick query does not create a workitem')
    notes.push({ scenario: 'query', tail: text.slice(-1000) })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-' + runId))
  }
}

async function clickCardAction(page, label) {
  await page.evaluate(`(()=>{const el=document.querySelector('[data-conversation-scroll]');if(el)el.scrollTop=0;window.scrollTo(0,0)})()`)
  await sleep(700)
  const found = await page.evaluate(`[...document.querySelectorAll('.do-card button')].some(b => (b.textContent || '').trim() === ${JSON.stringify(label)})`)
  if (!found) throw new Error('card action missing: ' + label)
  await page.evaluate(`(() => { const b = [...document.querySelectorAll('.do-card button')].find(b => (b.textContent || '').trim() === ${JSON.stringify(label)}); if (b) b.click() })()`)
  await sleep(700)
  const draft = await page.evaluate(`document.querySelector('[role="textbox"][contenteditable="true"]')?.innerText || ''`)
  if (!draft.includes('【签收】') && !draft.includes('补充 mock 证据') && !draft.includes('处理 US')) throw new Error('action did not reach composer: ' + label + ' / ' + draft.slice(0, 80))
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
  await sleep(18000)
}

async function clickDockAction(page, label) {
  const found = await page.evaluate(`(() => { const b = [...document.querySelectorAll('.do-current-card button, .do-turn-card button, .do-gatedock button')].find(b => (b.textContent || '').trim() === ${JSON.stringify(label)}); if (!b) return false; b.click(); return true })()`)
  if (!found) throw new Error('dock action missing: ' + label)
  await sleep(500)
  const hasConfirm = await page.evaluate(`!!document.querySelector('.do-signoff-host')`)
  if (!hasConfirm) throw new Error('signoff confirmation did not open')
  const preview = await page.evaluate(`document.querySelector('.do-signoff-host-preview')?.innerText || ''`)
  if (!preview.includes('【签收】')) throw new Error('signoff confirmation has no preview: ' + JSON.stringify(preview))
  const submitted = await page.evaluate(`(() => { const b = [...document.querySelectorAll('.do-signoff-host-btn')].find(b => (b.textContent || '').trim() === '签收并提交'); if (!b) return false; b.click(); return true })()`)
  if (!submitted) throw new Error('signoff confirmation has no submit action')
  await sleep(700)
  return preview
}

async function runUiDock() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-dock-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '处理 US-3821，创建/恢复工作项，先只完成需求阶段并出需求卡；用 mock 数据，缺口保留在卡片里，不要推进设计。')
    await waitFor(async () => (await bodyText(page)).includes('当前阶段卡 · 需求'), 240000, 'current requirement card')
    const body = await bodyText(page)
    check(body.includes('当前阶段卡 · 需求') && body.includes('阶段简报'), 'current card and merged stage brief are visible')
    await page.evaluate(`document.querySelector('.do-turn-card')?.scrollIntoView({ block: 'start' })`)
    await sleep(500)
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p3-ui-dock-before.png'), Buffer.from(r.result.data, 'base64')) })
    const ba = await clickDockAction(page, 'BA 签收')
    check(ba.includes('role=ba') && !ba.includes('role=requester'), 'BA click drafts exactly one signoff')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p3-ui-dock-draft.png'), Buffer.from(r.result.data, 'base64')) })
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
    await sleep(30000)
    await clickDockAction(page, '需求方确认')
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
    await sleep(30000)
    const item = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text))
    check(Boolean(item), 'ui dock workitem exists')
    check(item && /gate:\s*requirement/.test(item.text) && /status:\s*approved/.test(item.text), 'ui dock signoffs recorded')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p3-ui-dock.png'), Buffer.from(r.result.data, 'base64')) })
    notes.push({ scenario: 'ui-dock', workitem: item && item.name, draft: ba.slice(-80) })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-dock-' + runId))
  }
}

async function runStage4FailedUi() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-stage4fail-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '读取工作项 2026-10-27-us-3821-demo 的开发验证交付物，展示 build 失败的开发验证卡；只读展示，不要合入。')
    await waitFor(async () => (await currentCardText(page)).includes('Build'), 240000, 'stage 4 failed card')
    await sleep(800)
    const card = await currentCardText(page)
    check(/失败|未通过/.test(card), 'stage 4 shows build failure')
    check(card.includes('重新编译'), 'stage 4 exposes retry')
    check(!card.includes('记录合入'), 'failed build hides merge action')
    await page.evaluate(`document.querySelector('.do-turn-card')?.scrollIntoView({ block: 'start' })`)
    await sleep(300)
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-4-build-failed.png'), Buffer.from(r.result.data, 'base64')) })
    check(page.errors.length === 0, 'no console exceptions: ' + page.errors.slice(-2).join(' | '))
    notes.push({ scenario: 'stage4-failed-ui' })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-stage4fail-' + runId))
  }
}

async function runCommitterUi() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-committer-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '只读展示工作项 2026-10-27-us-3821-demo 的开发验证卡，不要签收、不要合并。')
    await waitFor(async () => (await currentCardText(page)).includes('开发验证'), 240000, 'committer stage 4 card')
    await sleep(800)
    const buttons = await page.evaluate(`[...document.querySelectorAll('.do-turn-card button')].map(b => (b.textContent || '').trim())`)
    console.log('buttons:', JSON.stringify(buttons))
    const clicked = await page.evaluate(`(() => { const b = [...document.querySelectorAll('.do-turn-card button')].find(b => (b.textContent || '').trim() === '记录合入'); if (!b) return false; b.click(); return true })()`)
    if (!clicked) throw new Error('记录合入 button missing; buttons=' + JSON.stringify(buttons))
    await waitFor(async () => (await bodyText(page)).includes('确认签收'), 10000, 'committer confirmation')
    const preview = await page.evaluate(`document.querySelector('.do-signoff-host-preview')?.innerText || ''`)
    if (!/gate=develop\.merge/.test(preview) || !/role=committer/.test(preview)) throw new Error('wrong committer preview: ' + preview)
    await page.evaluate(`(() => { const b = [...document.querySelectorAll('.do-signoff-host-btn')].find(b => (b.textContent || '').trim() === '签收并提交'); b?.click() })()`)
    await sleep(1000)
    const afterSubmit = await bodyText(page)
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/committer-after-click.png'), Buffer.from(r.result.data, 'base64')) })
    let item = null
    for (let i = 0; i < 12; i++) {
      await sleep(10000)
      item = readWorkitems().find(x => x.name === '2026-10-27-us-3821-demo') || null
      if (item && /stage:\s*cicd/.test(item.text)) break
    }
    const afterText = await bodyText(page)
    console.log('after committer submit:', afterText.slice(-700))
    check(Boolean(item && /gate:\s*develop\.merge/.test(item.text) && /role:\s*Committer/i.test(item.text)), 'committer signoff recorded')
    check(Boolean(item && /stage:\s*cicd/.test(item.text)), 'committer advances to cicd')
    check(!afterSubmit.includes('只在输入框'), 'not only filled composer')
    check(!afterSubmit.includes('【签收】gate=develop.merge'), 'host signoff route does not compose an Agent message')
    check(page.errors.length === 0, 'no console exceptions: ' + page.errors.slice(-2).join(' | '))
    notes.push({ scenario: 'committer-ui', buttons, stage: item && (item.text.match(/^stage:\s*(\S+)/m) || [])[1] })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-committer-' + runId))
  }
}

async function runStage4Ui() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-stage4-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '只读展示：读取工作项 2026-10-27-us-3821-demo 的 develop 交付物，用 dataops_shared_stage prepare 展示开发验证卡；不要签收、不要合并、不要执行 pipeline。')
    await waitFor(async () => (await currentCardText(page)).includes('开发验证'), 240000, 'stage 4 card')
    await sleep(1000)
    await page.evaluate(`document.querySelector('.do-turn-card')?.scrollIntoView({ block: 'start' })`)
    await sleep(400)
    const card = await currentCardText(page)
    check(card.includes('开发验证') && card.includes('实现包'), 'stage 4 card visible')
    check(card.includes('Build') && card.includes('Scan') && card.includes('Deploy'), 'stage 4 validation rows visible')
    check(card.includes('manual') && card.includes('SE'), 'stage 4 manual test and SE review visible')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-4-live.png'), Buffer.from(r.result.data, 'base64')) })
    for (const width of [1600, 1920]) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
      await sleep(600)
      const overflow = await page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
      check(overflow <= 1, 'stage 4 no horizontal overflow at ' + width + 'px (delta ' + overflow + ')')
      await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-4-live-' + width + '.png'), Buffer.from(r.result.data, 'base64')) })
    }
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
    await sleep(800)
    const darkBg = await page.evaluate('getComputedStyle(document.body).backgroundColor')
    check(darkBg !== 'rgb(255, 255, 255)' && darkBg !== 'rgba(0, 0, 0, 0)', 'stage 4 dark theme applies: ' + darkBg)
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-4-live-dark.png'), Buffer.from(r.result.data, 'base64')) })
    await page.send('Emulation.setEmulatedMedia', { features: [] })
    check(page.errors.length === 0, 'no console exceptions: ' + page.errors.slice(-2).join(' | '))
    notes.push({ scenario: 'stage4-ui', darkBg })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-stage4-' + runId))
  }
}

async function runJourneyUi() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-journey-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '查看待处理 US，只列出，不要接单、不要创建或推进工作项。')
    await waitFor(async () => {
      const text = await bodyText(page)
      return text.includes('US-3821') && (text.includes('待我处理') || text.includes('待处理'))
    }, 240000, 'US picker')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-0-us-picker.png'), Buffer.from(r.result.data, 'base64')) })
    check((await bodyText(page)).includes('US-3821'), 'US picker includes US-3821')
    await sendPrompt(page, '现在只读展示这个 US-3821 的 demo 旅程：不要修改任何文件或状态。读取工作项 2026-10-27-us-3821-demo，依次调用 dataops_shared_read_stage 展示 requirement、design、scheme、develop、cicd 五个阶段卡，串成一条从需求到 Stage 5 的只读旅程；不要签收、不要部署。')
    await waitFor(async () => {
      const text = await bodyText(page)
      return text.includes('数据 CICD') && text.includes('开发验证') && (text.includes('需求') || text.includes('REQ-3821'))
    }, 300000, 'journey cards')
    await sleep(1200)
    const text = await bodyText(page)
    check(/需求|REQ-3821/.test(text), 'journey includes requirement')
    check(text.includes('开发验证'), 'journey includes stage 4')
    check(text.includes('数据 CICD'), 'journey includes stage 5')
    await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-0-5-journey-full.png'), Buffer.from(r.result.data, 'base64')) })
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-0-5-journey.png'), Buffer.from(r.result.data, 'base64')) })
    check(page.errors.length === 0, 'no console exceptions: ' + page.errors.slice(-2).join(' | '))
    notes.push({ scenario: 'journey-ui', bytes: text.length })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-journey-' + runId))
  }
}

async function runStage5Ui() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-stage5-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '只读展示：读取工作项 2026-10-27-us-3821-demo 的 cicd 交付物，用 dataops_shared_stage prepare 展示数据 CICD 阶段卡；不要签收、不要部署、不要回滚。')
    await waitFor(async () => (await currentCardText(page)).includes('数据 CICD'), 240000, 'stage 5 card')
    await sleep(1000)
    await page.evaluate(`document.querySelector('.do-turn-card')?.scrollIntoView({ block: 'start' })`)
    await sleep(400)
    const card = await currentCardText(page)
    check(card.includes('数据 CICD') && card.includes('制品包'), 'stage 5 card visible')
    check(/dev/i.test(card) && /sit/i.test(card) && /gamma/i.test(card), 'external environment strip visible')
    check(!card.includes('允许一次') && !card.includes('回滚'), 'no DSH approval / rollback action in stage 5 card')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-5-live.png'), Buffer.from(r.result.data, 'base64')) })
    await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-5-live-full.png'), Buffer.from(r.result.data, 'base64')) })
    for (const width of [1600, 1920]) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
      await sleep(600)
      const overflow = await page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
      check(overflow <= 1, 'stage 5 no horizontal overflow at ' + width + 'px (delta ' + overflow + ')')
      await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-5-live-' + width + '.png'), Buffer.from(r.result.data, 'base64')) })
    }
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
    await sleep(800)
    const darkBg = await page.evaluate('getComputedStyle(document.body).backgroundColor')
    check(darkBg !== 'rgb(255, 255, 255)' && darkBg !== 'rgba(0, 0, 0, 0)', 'dark theme applies: ' + darkBg)
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-5-live-dark.png'), Buffer.from(r.result.data, 'base64')) })
    await page.send('Emulation.setEmulatedMedia', { features: [] })
    check(page.errors.length === 0, 'no console exceptions: ' + page.errors.slice(-2).join(' | '))
    notes.push({ scenario: 'stage5-ui', darkBg })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-stage5-' + runId))
  }
}

async function runStage45Ui() {
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-stage45-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '不要修改任何工作项或文件。读取工作项 2026-10-27-us-3821-demo，用 dataops_shared_stage prepare 展示 develop 阶段卡；只展示这一张卡，不要签收，不要执行 pipeline。')
    await waitFor(async () => (await currentCardText(page)).includes('开发验证'), 240000, 'stage 4 card')
    await sleep(1000)
    await page.evaluate(`document.querySelector('.do-turn-card')?.scrollIntoView({ block: 'start' })`)
    await sleep(400)
    let card = await currentCardText(page)
    check(card.includes('开发验证') && card.includes('实现包'), 'stage 4 card visible')
    check(card.includes('Build') && card.includes('Scan'), 'stage 4 validation rows visible')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-4-live.png'), Buffer.from(r.result.data, 'base64')) })
    // Seed the isolated demo workitem to the completed Stage 5 state for the second card.
    execFileSync(process.execPath, [join(root, 'scripts/seed-dataops-demo.mjs'), '--stage', 'cicd'], { stdio: 'ignore' })
    await sendPrompt(page, '继续读取同一工作项的 cicd 交付物，用 dataops_shared_stage prepare 展示数据 CICD 阶段卡；只展示，不触发外部部署，不签收。')
    await waitFor(async () => (await currentCardText(page)).includes('数据 CICD'), 240000, 'stage 5 card')
    await sleep(1000)
    await page.evaluate(`document.querySelector('.do-turn-card')?.scrollIntoView({ block: 'start' })`)
    await sleep(400)
    card = await currentCardText(page)
    check(card.includes('数据 CICD') && card.includes('制品包'), 'stage 5 card visible')
    check(/dev/i.test(card) && /sit/i.test(card) && /gamma/i.test(card), 'external environment strip visible')
    check(!card.includes('允许一次') && !card.includes('回滚'), 'no DSH approval / rollback action in stage 5 card')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/stage-5-live.png'), Buffer.from(r.result.data, 'base64')) })
    check(page.errors.length === 0, 'no console exceptions: ' + page.errors.slice(-2).join(' | '))
    notes.push({ scenario: 'stage45-ui', bytes: text.length })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-stage45-' + runId))
  }
}

async function runStageFlow() {
  const before = new Set(workitemNames())
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '处理 US-3821，创建/恢复工作项，先只完成需求阶段并出需求卡；用 mock 数据，缺口保留在卡片里，不要推进设计。')
    await sleep(180000)
    let text = await bodyText(page)
    check(/需求|Requirement|目标/.test(text), 'requirement stage appears')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p3-requirement.png'), Buffer.from(r.result.data, 'base64')) })
    await sendPrompt(page, '【签收】gate=requirement role=BA actionId=ui-e2e-ba actor=陈璐')
    await sleep(25000)
    await sendPrompt(page, '【签收】gate=requirement role=requester actionId=ui-e2e-req actor=渠道运营 comment=接受 mock 假设与阈值')
    await sleep(25000)
    await sleep(5000)
    const finalItem = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text)) || item
    check(/gate:\s*requirement/.test(finalItem.text) && /status:\s*approved/.test(finalItem.text), 'requirement approvals recorded')
    const after = readWorkitems()
    const item = after.find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text)) || after.find(x => !before.has(x.name))
    check(Boolean(item), 'stage workitem exists')
    if (item) {
      check(/deliverables\/requirement\/requirement\.yaml|deliverables\/requirement\.yaml/.test(item.text), 'requirement deliverable recorded')
      notes.push({ scenario: 'stage-flow', workitem: item.name, approvals: /approvals:/.test(item.text) })
    }
    await sendPrompt(page, '继续设计阶段：读取 requirement 和 DataMap/独立血缘/画像证据，产 design 交付物并出设计卡；用 mock 数据，缺口保留，不要直接进入方案。')
    await sleep(90000)
    let designItem = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text))
    check(/deliverables\/design\/design\.yaml|deliverables\/design\.yaml/.test(designItem.text), 'design deliverable recorded')
    await sendPrompt(page, '【签收】gate=design role=BA actionId=ui-e2e-design actor=陈璐 comment=设计按 mock 假设接受，SE deferred')
    await sleep(30000)
    designItem = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text))
    check(/stage:\s*scheme/i.test(designItem.text), 'design signoff advances to scheme')

    await sendPrompt(page, '继续 3a 分析：用 pending mock 证据做数据挖掘、基线/候选比较，产 analysis 卡；如果有 blocking 就停住，不要 pass。')
    await sleep(90000)
    await sendPrompt(page, '补 mock 证据：读取 closed 证据，重新计算 G-PAYTIME 和 G-DATAMAP-PAY，确保 analysis status=passed、blocking gaps=[]，用 stage prepare 更新，保留 mock 标记。')
    await sleep(120000)
    await sendPrompt(page, '【签收】gate=scheme.analysis role=BA actionId=ui-e2e-analysis actor=陈璐 comment=blockers 已在 mock 补证中关闭')
    await sleep(30000)
    let schemeItem = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text))
    check(/substage:\s*solution/i.test(schemeItem.text), 'analysis signoff advances to 3b')

    await sendPrompt(page, '继续 3b 需求方案：消费 analysis，产 solution 卡，给出选型/备选/tradeoff；用 mock，不重做分析。')
    await sleep(120000)
    await sendPrompt(page, '【签收】gate=scheme.solution role=BA actionId=ui-e2e-solution actor=陈璐 comment=方案选择按 mock 假设接受')
    await sleep(30000)
    schemeItem = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text))
    check(/substage:\s*tech_plan/i.test(schemeItem.text), 'solution signoff advances to 3c')

    await sendPrompt(page, '继续 3c 技术方案：产 tech-plan，任务/依赖/SLA/风险/回滚，并嵌入一层设计血缘和时间带；用 mock。')
    await sleep(150000)
    await sendPrompt(page, '【签收】gate=scheme.tech_plan role=SE actionId=ui-e2e-tech actor=王工 comment=技术方案按 mock 假设通过，Dev deferred')
    await sleep(30000)
    schemeItem = readWorkitems().find(x => /system:\s*edevops/i.test(x.text) && /id:\s*US-3821/i.test(x.text))
    check(/gate:\s*scheme\.tech_plan/.test(schemeItem.text) && /status:\s*approved/.test(schemeItem.text), 'tech plan approved')
    check(/deliverables\/scheme\/tech-plan\.yaml|deliverables\/tech-plan\.yaml/.test(schemeItem.text), 'tech plan deliverable recorded')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p3-stage0-3-final.png'), Buffer.from(r.result.data, 'base64')) })
    notes.push({ scenario: 'stage0-3', workitem: schemeItem.name, stage: 'scheme', full: true })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-' + runId))
  }
}

async function runUsPicker() {
  const before = new Set(workitemNames())
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, '看看我的 US，待我处理的 US 有哪些？')
    await waitForTurnComplete(page, timeoutMs)
    await sleep(1000)
    const text = await bodyText(page)
    check(text.includes('US-3821') && (text.includes('待我处理的 US') || text.includes('开始处理')), 'US picker appears')
    check(!text.includes('dataops_shared_read_us'), 'US picker does not expose tool names')
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p1.4-us-picker.png'), Buffer.from(r.result.data, 'base64')) })
    await page.evaluate(`window.scrollTo(0,0)`)
    await sleep(800)
    for (let i = 0; i < 20; i++) {
      if (await page.evaluate(`!!([...document.querySelectorAll('button')].find(b=>{const t=(b.textContent||'').trim();return t==='开始处理'||t==='继续已有工作项'}))`)) break
      await sleep(500)
    }
    const clicked = await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>{const t=(b.textContent||'').trim();return t==='开始处理'||t==='继续已有工作项'});if(b){b.click();return true}return false})()`)
    check(clicked, 'US picker start action')
    await sleep(400)
    const composer = await page.evaluate(`document.querySelector('[role="textbox"][contenteditable="true"]')?.innerText || ''`)
    check(composer.includes('处理 US-3821'), 'US picker drafts a normal user turn')
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
    await sleep(15000)
    await sleep(1500)
    const after = readWorkitems().filter(item => !before.has(item.name))
    const allNow = readWorkitems()
    check(after.length > 0 || allNow.some(item => /system:\s*edevops/i.test(item.text)), 'US selection creates/restores a workitem')
    check(allNow.some(item => /system:\s*edevops/i.test(item.text) && /id:\s*US-3821/i.test(item.text)), 'workitem records US source')
    notes.push({ scenario: 'us-picker', workitems: after.map(item => item.name), tail: (await bodyText(page)).slice(-1200) })
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p1.4-us-intake.png'), Buffer.from(r.result.data, 'base64')) })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-' + runId))
  }
}

async function runIncident() {
  const before = new Set(workitemNames())
  const serverPort = await freePort()
  const chromePort = await freePort()
  const server = await startServer(serverPort, 'workspace-write')
  const page = await startChrome(chromePort, server.url, join(root, '.tmp-p14-chrome-' + runId))
  try {
    await ensureComposer(page.evaluate)
    await dismissPreview(page.evaluate)
    await ensureComposer(page.evaluate)
    await sendPrompt(page, 'dws.trade_channel_daily 今天 05:00 批次失败，帮我排障。用 mock 数据，先调 read logs 拿信号，再产出时间线、根因、处置；把排障交付物落盘并展示。不要调用 incident_triage。')
    await waitForTurnComplete(page, timeoutMs)
    await sleep(1500)
    const text = await bodyText(page)
    check(!text.includes('dataops_'), 'incident answer does not expose tool names')
    check(/排障|时间线|根因|处置/u.test(text), 'incident answer has diagnostics')
    const after = readWorkitems().filter(item => !before.has(item.name))
    const incidentFiles = after.flatMap(item => {
      const dir = join(workitemsDir, item.name, 'deliverables')
      return existsSync(dir) ? readdirSync(dir).filter(name => name.includes('incident')) : []
    })
    check(after.length > 0, 'incident created or updated a workitem')
    check(incidentFiles.length > 0, 'incident deliverable exists')
    notes.push({ scenario: 'incident', workitems: after.map(item => item.name), tail: text.slice(-1200) })
    await page.send('Page.captureScreenshot', { format: 'png' }).then(r => { if (r.result?.data) writeFileSync(join(root, 'prototype/shots/p1.4-incident-final.png'), Buffer.from(r.result.data, 'base64')) })
    if (!keep && after.length) for (const created of after) rmSync(join(workitemsDir, created.name), { recursive: true, force: true })
  } finally {
    page.ws.close()
    page.child.kill('SIGTERM')
    server.child.kill('SIGTERM')
    await sleep(800)
    safeRemove(join(root, '.tmp-p14-chrome-' + runId))
  }
}

async function main() {
  if (!existsSync(chromePath)) throw new Error('Chrome not found: ' + chromePath)
  if (scenario === 'full-allow') await runFull('allow')
  else if (scenario === 'full-reject') await runFull('reject')
  else if (scenario === 'query') await runQuery()
  else if (scenario === 'incident') await runIncident()
  else if (scenario === 'us-picker') await runUsPicker()
  else if (scenario === 'stage-flow') await runStageFlow()
  else if (scenario === 'stage4-failed-ui') await runStage4FailedUi()
  else if (scenario === 'committer-ui') await runCommitterUi()
  else if (scenario === 'journey-ui') await runJourneyUi()
  else if (scenario === 'stage4-ui') await runStage4Ui()
  else if (scenario === 'stage45-ui') await runStage45Ui()
  else if (scenario === 'stage5-ui') await runStage5Ui()
  else if (scenario === 'ui-dock') await runUiDock()
  else throw new Error('unknown scenario: ' + scenario)
  const report = { scenario, runId, at: new Date().toISOString(), failures, notes }
  mkdirSync(join(root, 'prototype/shots'), { recursive: true })
  writeFileSync(join(root, 'prototype/shots/p1.4-' + scenario + '-report.json'), JSON.stringify(report, null, 2) + '\n')
  if (failures.length) {
    console.error('\nP1.4 ' + scenario + ': FAIL (' + failures.length + ')')
    process.exitCode = 1
  } else {
    console.log('\nP1.4 ' + scenario + ': PASS')
  }
}

main().catch(error => {
  console.error('P1.4 harness error:', error.stack || error)
  process.exitCode = 1
})
