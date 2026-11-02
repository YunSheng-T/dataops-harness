# Stage Artifact Ledger

> 状态：P3.1 实现中；Artifact Ledger、DataOps 交付物、当前迭代 shell overlay 已落地。
> 关联：[DataOps 插件聚合设计](dataops-plugin-surface.md) · [用户面设计](user-surface.md)
> 蓝图：[全量](../../prototype/stage-artifact-ledger-blueprint.html) · [增量](../../prototype/stage-artifact-ledger-blueprint-delta.html)
> 目标：阶段产物成为 Workitem 的持久事实源；悬浮窗看当前迭代，DataOps 看全量历史。

## 1. 一句话

对话只负责迭代；Workitem 负责沉淀；悬浮窗只展示当前迭代，DataOps 交付物展示所有阶段和 revision。

## 2. 问题

现在阶段卡已经能展示当前状态，但：

- 阶段产物只存在于工具卡 payload / turn 历史
- 阶段卡没有稳定的 artifact/revision 引用
- 旧卡不会自动反映后续修改
- 审批不知道绑定的是哪一版内容
- 用户不能从一个固定位置查看所有阶段产物
- 悬浮窗没有数据源

## 3. 对象模型

```text
Workitem
  currentIteration:
    stage
    artifactId
    revisionId
    gate
    updatedAt
  artifacts[]
    id
    stage
    kind
    currentRevisionId
    revisions[]
```

```text
ArtifactRevision
  revisionId
  artifactId
  version
  content
  contentHash
  author
  createdBy: agent | migration
  createdAt
  sourceMessageId
  sourceTurnId
  parentRevisionId
  status: draft | review | approved | superseded
  summary
  diffFromPrevious
  evidenceRefs[]
```

不变量：

- revision 不可变
- 用户不直接编辑内容
- Agent 每次修改创建新 revision
- `currentRevisionId` 只指向一个 revision
- gate 绑定 `revisionId + contentHash`
- 当前 revision 被替换后，旧审批失效
- 旧 revision 永不删除，只标记 `superseded`

## 4. Workitem 存储

沿用 workitem 文件协议：

```text
workitems/<id>/
  item.yaml
  artifacts/<artifact>.yaml
  revisions/<artifact>/<revision>.yaml
  deliverables/...            兼容旧文件
```

`item.yaml` 增加：

```yaml
currentIteration:
  stage: design
  artifactId: design
  revisionId: rev-0003
  gate: design.review
```

`artifacts/design.yaml` 保存 artifact 元数据和当前指针；`revisions/design/rev-0003.yaml` 保存不可变内容。

旧 `deliverables/` 迁移时作为 `rev-0001` 读取，不重写原文件。

## 5. 写入路径

```text
Agent 调 stage runtime prepare
→ 校验 payload
→ 创建 revision（parent = currentRevision）
→ 更新 artifact.currentRevisionId
→ 清除旧 gate/approval
→ 更新 currentIteration
```

没有“编辑 artifact”接口，只有 `proposeRevision`。

## 6. 悬浮窗

入口：

- StageStatusCard 的“打开当前迭代”
- 阶段 chip / 阶段简报里的当前阶段

内容：

```text
当前迭代
设计 · v3 · review
[当前阶段展开]
  target / grain / sources / schedule
  diff vs v2
  gaps
  gate: 待 BA 签收
  evidenceRefs
[其他阶段折叠]
[在会话继续修改] [签收] [查看历史]
```

行为：

- 非模态浮层，不阻塞对话
- 只读 Workitem；不在这里编辑
- “继续修改”只把上下文写入 composer，不自动发送
- “查看历史”打开 DataOps `交付物`
- 新 revision 到达时，悬浮窗跟随 currentIteration 更新
- 关闭后保留当前迭代指针，不丢失

建议尺寸：420–480px，最大高度 70vh；窄窗口改为底部 sheet；Esc / 外部点击关闭。

## 7. DataOps 交付物

在 DataOps 面板新增 section：

```text
DataOps
├─ 概览
├─ 仓库
├─ 资产
├─ 血缘
├─ 交付物
├─ 证据
└─ 检查
```

内容：

- 所有阶段及当前 revision
- 历史 revisions
- gate / signoff 状态
- diff
- evidenceRefs
- 跳转 code scan / deploy / runtime logs

职责：

- 全量、持久、可追溯
- 不直接编辑
- 不替代 Workitem 存储

## 8. 和现有卡片的关系

| 现有 | 新职责 |
|---|---|
| StageResultCard | 只显示 currentIteration + gate + next；入口打开悬浮窗 |
| DeliverableRenderer | 渲染某个 revision 的完整内容，不再作为当前事实源 |
| turnTail 阶段简报 | 读取 currentIteration，显示 compact 版本 |
| StageNavigator / Dock | 读取同一 Workitem 状态，点击打开悬浮窗 |
| DataOps 证据 / 资产 / 血缘 | 只提供引用，不嵌入 artifact 正文 |

`OPEN-011` 第一刀（阶段状态卡）并入这里，不再单独设计。

## 9. 审批

- gate 通过时记录 revisionId / contentHash
- 新 revision 创建后，gate 回到 pending
- 旧 approval 保留在历史，但标记 `superseded`
- 不允许“审批一个 revision，发布另一个 revision”

## 10. 迁移

1. 读取旧 `deliverables/`
2. 生成 `rev-0001`
3. 设置 `currentIteration`
4. 旧卡片保留为历史快照
5. 后续修改走新 revision

## 11. 非目标

- 用户直接编辑 artifact
- 文档编辑器
- 全量 Git UI
- 跨 Workitem 汇总
- 自动签收
- 用 DataOps 面板替代 Workitem

## 12. 验收

1. Agent prepare 生成新 revision，旧 revision 不可变。
2. Gate 绑定 revision；新 revision 使旧审批失效。
3. 悬浮窗只显示当前 currentIteration。
4. DataOps 交付物显示所有阶段和 revisions。
5. turnTail / Dock / StageStatusCard 读取同一状态。
6. 用户不能直接编辑内容。
7. 旧 deliverables 可迁移为 rev-0001。
8. 悬浮窗可关闭、可重开，不丢状态。

## 13. 已确认

- 悬浮窗使用 DSH 原生 `shell.overlay` seat（当前运行时没有通用 Popover primitive）；关闭、层级和 shell 归属由原生 seat 处理，后续有 Popover primitive 时再替换。
- DataOps 交付物放在现有 DataOps 面板，不新增 Workitem 面板。
- Agent 生成 revision，用户不直接编辑；gate 绑定 revision。
- 当前实现：DataOps `交付物` 读取 session context 中的 workitem；shell overlay 展示选中 artifact 的 currentRevision。
- 旧 deliverables 迁移到 rev-0001 的触发时机在 P3.1 实现时再定，默认随 artifact 首次读取迁移。

## 14. 原生 Popover 的边界

- 宽度优先控制在 420–480
- 内容超过高度时内部滚动
- 不允许自己的浮层绕过 DSH 的关闭和焦点行为
- 如果原生 Popover 无法满足 stage 展开/历史切换，再提增量设计，不直接换实现
