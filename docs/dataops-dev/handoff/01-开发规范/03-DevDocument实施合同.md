# DevDocument 实施合同

## 1. 服务定位

DevDocument 是薄型 Host 服务，负责一致性打开、全量编辑读取、受防护保存、冲突对账和草稿分析。底层文件真相仍是同一 Session 的 `ctx.fs`，原生文件 Resource/changes 继续负责失效通知。

Host 不需要持久化每次 keystroke。Client 持有 draftText；Host 只在显式 open/analyze/save/reconcile 时接收快照。presence 只传 clean/dirty、digest 和 lease 元数据。

## 2. 一致性 open

实现顺序：

1. 从认证 Remote 上下文绑定 Session，不能信任客户端任意 sessionId。
2. 按原生权限解析 fileAddress；执行 lstat 和符号链接策略。首版只有 regular file 可编辑。
3. 第一次 stat，取得 opaque FsVersion 和大小。超限返回 `dev/too-large`。
4. 在限制内读取实际字节，严格 UTF-8 解码。非法编码返回 `dev/unsupported-encoding`。
5. 第二次 stat。前后 FsVersion 一致才继续；否则有限次重读，仍失败返回 `dev/concurrent-read`。
6. 对实际字节计算 savedDigest，创建 documentId。
7. 返回 text、baseVersion、savedDigest、contentType、readOnly 和 Host 计算的 capabilities。

不得把第一次 stat 的版本与另一次读取的内容拼成快照。不得在大文件截断后允许保存。不得静默转换 EOL、BOM 或占位符。

## 3. save

首版使用完整文本和：

```ts
ctx.fs.writeText(
  target,
  content,
  { kind: 'replaceIfVersion', version: baseVersion },
  signal,
  sandboxPolicy,
)
```

实际参数和 outcome 以本地上游为准。要求：

- 请求带 documentId、baseVersion、text、idempotencyKey。
- Host 重新校验 Session、documentId、文件权限、regular file、大小和可写状态。
- Host 对 text 重新计算 digest，不能信任 Client digest。
- 同一 documentId + key + 同内容返回原保存结果；同 key 不同内容返回 `dev/idempotency-conflict`。
- 新 FsVersion 必须来自真实 ctx.fs outcome 或保存后的真实 stat，不得制造。
- FS_STALE_VERSION 映射 `dev/stale-version`，保留 Client local，进入 conflict。
- 保存成功响应包含 version、savedDigest、savedAt、receipt。
- 不做自动保存、force-write、format-on-save 或 deploy 占位符替换。

### 保存期间继续输入

Client 在 Ctrl+S 时固定 saving snapshot S。用户在请求期间输入的新内容 T 属于新的 local draft：

- S 保存成功且没有 T：进入 clean。
- S 保存成功但存在 T：只更新 saved 基线，T 仍为 dirty。
- S 保存冲突：保留 base、S/T 组成的 local 和 current，不覆盖。

## 4. save-unknown 与 reconcile

超时、断连或响应丢失不能简单视为失败，也不能视为成功。Client 进入 save-unknown，Host 提供 reconcile：

| 当前真实状态 | 返回 | Client 行为 |
|---|---|---|
| currentDigest == targetDigest | saved | 转 clean；有幂等记录则给原 receipt，否则标“按内容确认”，不伪造 receipt |
| currentVersion == 保存前 baseVersion 且 digest 不同 | not-saved | 保持 dirty，由用户显式重试同一 idempotencyKey |
| current 已是其他版本/内容 | conflict | 读取一致 current snapshot，进入三方冲突 |
| 无法获得一致 current | 稳定读取错误 | 保持 save-unknown，只允许再次对账 |

禁止自动循环重试保存。禁止在 unknown 状态启用 Artifact 推进。

## 5. analyze

analyze 接收 documentId、text、contentType、requestId、subjectKind，返回 analysisId、subjectDigest、projection、diagnostics、sourceMap 和 providerSet。

- draft：只运行有界、只读、可取消的 parser/scanner，不访问生产系统，不启动长验证。
- saved：保存成功后按 savedDigest 重跑；长 VerificationRun 是独立对象。
- request 可取消；旧 request 返回不得覆盖新 draft。
- 结果按 analysisId 原子发布，不能分别更新图、诊断和 SourceMap。
- 缓存键至少包含 subjectDigest、providerId、providerVersion、contentType。

## 6. presence 与 close

`updatePresence` 只接受 documentId、clean/dirty、baseDigest、draftDigest 和 Client heartbeat，不传 draftText。首次 dirty 必须立即上报，之后 heartbeat。保存成功或放弃草稿后回 clean。

lease 用于减少 Agent 与在线 dirty 的竞争，不是分布式锁。离线后无法保证浏览器状态，仍由 FsVersion 和冲突恢复兜底。close 只释放 presence，不自动保存。

## 7. Client 状态机

```text
clean --input--> dirty --Ctrl+S--> saving
saving --success/no newer input--> clean
saving --success/newer input-----> dirty
saving --stale-------------------> conflict
saving --response unknown-------> save-unknown
save-unknown --saved------------> clean
save-unknown --not-saved--------> dirty
save-unknown --other content----> conflict
clean --external change---------> external-clean -> clean
dirty --external change---------> conflict
```

read-only、missing、too-large、unsupported 是正交可用性/权限模式。任何失败都应保留可导出的本地草稿。

## 8. 三方冲突

- clean 外部变化：安全刷新，尽量保留光标、选择、滚动和 entityRef，提示 Agent/外部已更新。
- dirty 外部变化：base/local/current 各自保留 text、digest 和来源，暂停保存与自动刷新。
- 采用 current：二次确认；可先导出 local。
- 保留 local 为草稿：只把 current version 设为新基线，仍需显式保存。
- 手工合并：生成 merge draft，不自动落盘；首版不承诺自动三方合并正确性。

## 9. hot-exit

IndexedDB 记录包含 sessionScope、fileAddress、baseVersion、baseDigest、draftText、draftDigest、updatedAt、clientInstance。

恢复时先 open 当前文件：currentDigest 等于 baseDigest 才恢复普通 dirty；否则恢复 conflict。不得自动保存、自动发给 Agent或跨用户共享。高安全环境可禁用；记录应有 TTL 和清理机制。
