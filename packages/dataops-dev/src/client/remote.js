/**
 * devDocuments Remote 命名空间的客户端贡献描述符。
 *
 * rc.4 的 Remote client 挂载入口要求所有入参声明 strict codec；本包的业务
 * 参数均为 lossless JSON，结果仍由 Host 的 src-json 契约返回。描述符保持
 * 与生成物同构，并显式声明可选 AbortSignal 的位置。
 */
var JSON_CODEC = {
  mode: 'strict',
  typeSymbol: '@dataops/dsh-dataops-dev#devDocuments/string',
  create: function () {
    return {
      parse: function (value) {
        if (typeof value !== 'string') throw new TypeError('devDocuments parameter must be a string')
        return value
      },
    }
  },
}

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
    cancellation: { parameter: 'signal' },
    result: { mode: 'src-json' },
  }
}

var DEV_DOCUMENTS_CONTRIBUTION = {
  package: '@dataops/dsh-dataops-dev',
  descriptors: [
    descriptor('open', [param('sessionId'), param('path')]),
    descriptor('save', [param('sessionId'), param('documentId'), param('baseVersion'), param('text'), param('idempotencyKey')]),
    descriptor('current', [param('sessionId'), param('documentId')]),
    descriptor('reconcile', [param('sessionId'), param('documentId'), param('baseVersion'), param('targetDigest')]),
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
    current: function (sessionId, documentId, signal) {
      return Promise.resolve(remote.devDocuments.current(sessionId, documentId, signal)).then(unwrap)
    },
    reconcile: function (sessionId, documentId, baseVersion, targetDigest, signal) {
      return Promise.resolve(remote.devDocuments.reconcile(sessionId, documentId, baseVersion, targetDigest, signal)).then(unwrap)
    },
  }
}
