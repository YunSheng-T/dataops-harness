# Agent 共同编辑与文件策略

## 1. 不可回避的事实

原生 Agent 文件工具只能看到已落盘文件，看不到浏览器 dirty buffer。若 Agent 在用户 dirty 时直接修改磁盘，双方立即形成两份真相。因此首版必须区分 clean 与 dirty，而不是宣称支持任意实时并发编辑。

## 2. 行为矩阵

| 文档状态 | Agent 行为 | IDE 行为 | 禁止 |
|---|---|---|---|
| clean + active presence | 原生 read/edit/patch，dirty guard 后进入原生 policy | changes 后安全刷新，显示 Agent Diff | 绕过 observation，复用 UI baseVersion |
| dirty + active presence | 直接写返回 `dev/document-dirty`，改为建议或分析 | 提示保存/放弃草稿，或审阅 Proposal | 直接改磁盘、自动应用补丁 |
| saving/save-unknown/conflict | 只读分析或等待 | 显示同步状态 | 把未知当 clean、强制写入 |
| presence 过期/离线 | 无法保证浏览器状态，仍按原生策略和版本防护 | 用户回来后 external/conflict 对账 | 声称无损实时协同 |

## 3. fs/write-intent 组合

dataops-dev bridge 是新增专用 UI 写入策略，不是关闭原生策略：

### DevDocument UI actor

必须同时满足：

- 来自认证 Remote principal，并绑定当前 Session。
- 存在有效 DevDocument open 快照。
- 文件权限允许写，且为 regular file。
- 使用 `replaceIfVersion(baseVersion)`，baseVersion 来自该文档。
- 满足大小、编码、sandboxPolicy 和 idempotency 约束。

满足后才执行受限 UI 写入。该路径不能复用于 Agent，也不能伪造 Agent 的 `fs/observed`。

### Agent actor

bridge 只执行 dirty presence 等协作检查，然后必须 `next()`，继续原生 read-before-write。Agent 未观察文件仍应得到 FS_NOT_OBSERVED；恢复 Session 后仍须重新读取。

### 其他 actor

一律 `next()`，不得获得 IDE 特权。不得使用 actor=undefined、伪造 observation 或修改全局策略让保存通过。

### 装配验证

上游 write/edit intent slot 的组合顺序必须由 preset 显式保证。P0 集成测试至少证明：

1. UI 合法保存成功。
2. UI 无 open、无 baseVersion 或越权限保存失败。
3. Agent clean 直改仍进入原生 observation。
4. Agent dirty 直改被拒绝且磁盘 digest 不变。
5. 其他 actor 无 UI bridge 特权。
6. 组合顺序错误时启动合同测试失败或保存安全失败，而不是关闭防护。

## 4. Presence lease

Client 首次输入立即上报 dirty，之后只发送 heartbeat 与 digest 元数据。Host 不保存 draftText。lease 过期只表示无法确认在线状态，不表示浏览器草稿已经不存在。

lease 是减少竞争的守卫，FsVersion 才是最终防线。浏览器崩溃、离线或外部系统写入仍可能产生冲突，必须能恢复。

## 5. EditProposal

Proposal 至少包含 proposalId、fileAddress、origin、subjectKind、subjectDigest、hunks、createdAt 和 state。hunk 包含 range、expectedText、replacement。

处理规则：

1. 生成时绑定 savedDigest 或用户明确共享的 draftDigest。
2. 展示来源和变更范围，不自动写盘。
3. 当前对应 digest 不匹配时标 stale，禁止按旧 range 应用。
4. 应用前校验 expectedText，再以 TextEdit 修改本地 draft。
5. 应用后仍为 dirty，只有用户 Ctrl+S 才落盘。
6. 记录 offered/applied/dismissed/stale 和最终 savedDigest；Proposal 不是保存回执或 Evidence。

## 6. 草稿共享

默认 Agent 只能读取 saved 文件和明确提供的诊断上下文。若建议必须基于 dirty：

- 用户显式执行“共享当前草稿用于本次建议”。
- IDE 固定一份临时 snapshot，展示共享范围并计算 draftDigest。
- 只允许本次受控读取，不能订阅后续每次 keystroke。
- 共享行为可审计，且不得包含真实 Secret 或环境值；如不能安全脱敏，应拒绝共享。

## 7. 修复诊断

Agent 上下文只包含 fileAddress、diagnosticId、providerId、range、subjectKind、subjectDigest。Agent 仍须重新读取最新 saved 文件，或在明确授权后读取固定 draft。digest 已变时重新分析或返回 stale，不能按旧 range 盲目修改。
