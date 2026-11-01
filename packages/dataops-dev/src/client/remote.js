/**
 * devDocuments Remote 命名空间的客户端贡献描述符（P0 手写）。
 *
 * 上游正式路径是 typert 构建期生成 `./remote` 产物；P0 以 src-json codec 手写，
 * 字段与生成物同构（InvocationDescriptor）。替换为生成产物是 P1 硬化项，
 * 已记录在《P0验证报告.md》偏差清单。
 */
var JSON_CODEC = { mode: 'src-json' }

function param(name) {
  return { name: name, wire: name, source: 'json', codec: JSON_CODEC }
}

function descriptor(method, parameters) {
  return {
    id: '@dataops/dsh-dataops-dev#devDocuments/' + method,
    service: 'devDocuments',
    namespace: 'devDocuments',
    method: method,
    invocation: { kind: 'direct' },
    parameters: parameters,
    result: { mode: 'src-json' },
  }
}

var DEV_DOCUMENTS_CONTRIBUTION = {
  package: '@dataops/dsh-dataops-dev',
  descriptors: [
    descriptor('open', [param('sessionId'), param('path')]),
    descriptor('save', [param('sessionId'), param('documentId'), param('baseVersion'), param('text'), param('idempotencyKey')]),
    descriptor('close', [param('sessionId'), param('documentId')]),
  ],
}

/** 一元调用结果解包：RemoteResult 形态或裸值都接受，失败分支抛回 RemoteError。 */
function unwrap(result) {
  if (result && typeof result === 'object' && result.ok === false) throw result.error
  if (result && typeof result === 'object' && 'value' in result) return result.value
  return result
}

function devDocumentsRemote(remote) {
  return {
    open: function (sessionId, path, signal) {
      return Promise.resolve(remote.devDocuments.open(sessionId, path, signal)).then(unwrap)
    },
    save: function (sessionId, documentId, baseVersion, text, idempotencyKey, signal) {
      return Promise.resolve(remote.devDocuments.save(sessionId, documentId, baseVersion, text, idempotencyKey, signal)).then(unwrap)
    },
    close: function (sessionId, documentId, signal) {
      return Promise.resolve(remote.devDocuments.close(sessionId, documentId, signal)).then(unwrap)
    },
  }
}
