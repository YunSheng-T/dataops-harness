/**
 * dataops-dev Host 插件入口：装配 DevDocuments 服务与 write-intent bridge。
 */
import { DevDocuments } from './service.js'
import { applyBridge } from './bridge.js'

export const name = 'dataops-dev'
export const inject = ['fs']

export { DevDocuments }

export function apply(ctx, config) {
  const service = new DevDocuments(ctx, config)
  const bridge = applyBridge(ctx, service.store)
  service.bridge = bridge
}
