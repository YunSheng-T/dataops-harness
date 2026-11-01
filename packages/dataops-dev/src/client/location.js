/**
 * DevLocationV1：版本化深链 focus。编码为 JSON 字符串经 openView(view, focus) 传递。
 * focus 不是权限凭证：Host open 仍重新校验 Session、路径与文件权限。
 */
var MAX_FOCUS_BYTES = 4096

function encodeLocation(location) {
  return JSON.stringify({
    v: 1,
    fileAddress: location.fileAddress,
    line: location.line,
    column: location.column,
    entityRef: location.entityRef,
    source: location.source,
  })
}

/**
 * 解析 focus。非法、超长、版本不符或非本视图定位时返回 null——调用方不得跳转。
 */
function decodeLocation(focus) {
  if (typeof focus !== 'string' || focus.length === 0 || focus.length > MAX_FOCUS_BYTES) return null
  var parsed
  try { parsed = JSON.parse(focus) } catch (e) { return null }
  if (!parsed || parsed.v !== 1 || typeof parsed.fileAddress !== 'string' || parsed.fileAddress.length === 0) return null
  return {
    fileAddress: parsed.fileAddress,
    line: typeof parsed.line === 'number' ? parsed.line : undefined,
    column: typeof parsed.column === 'number' ? parsed.column : undefined,
    entityRef: typeof parsed.entityRef === 'string' ? parsed.entityRef : undefined,
    source: typeof parsed.source === 'string' ? parsed.source : undefined,
  }
}
