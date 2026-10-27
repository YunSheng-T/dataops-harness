---
name: workitem-protocol
description: 接手任何跨多轮、会产生交付物的数据任务（改表、排障、评审、取数、发布）时使用；建立或继续一个工作项，按状态机推进，并确保证据与产出落盘。
---

# 工作项协议

> 工作台的核心不是对话，是工作项。只要任务不是"一问一答"，就先建工作项再动手。

## 何时用

- 任务会跨多轮、需要中间产物（SQL、报告、清单）
- 需要别人接手、评审或审批
- 需要三天后还能接着做
- 已经在 `workitems/` 里有同名工作项（此时是**继续**，不是新建）

不适用：单次查询、解释概念、看一段代码。这些直接答，不留痕。

## 工作项工具

优先用 `dataops_shared_read_workitem` 读、`dataops_shared_update_workitem` 写；工具不可用时才直接读写文件。更新前可传 `dryRun: true` 预览，确认后再落盘。更新工具写回规范化 YAML，注释不保证保留；长叙述放 `plan.md`/`decision.md`。

## 目录与文件

```
workitems/<YYYY-MM-DD>-<slug>/
  item.yaml      # 结构化状态（agent 读写，人可读）
  intent.md      # 谁、要什么、验收标准、不做什么
  plan.md        # 步骤、进度、阻塞
  evidence/      # ev-*.yaml，每个结论一条证据
  deliverables/  # 阶段交付物：SQL、DDL、评审报告、影响清单
  decision.md    # 审批记录（只有审批才写）
```

模板：`workitems/_template/`（`item.yaml` / `intent.md` / `plan.md` / `decision.md`）。

`<slug>` 用 kebab-case，能一眼看出对象，例如 `2026-10-24-dwd-orders-user-id-bigint`。

### item.yaml

```yaml
id: 2026-10-24-dwd-orders-user-id-bigint
type: change            # explore | model | change | debug | publish
status: planning        # 见状态机
owner: <提问的人>
created_at: 2026-10-24T17:30:00+08:00
assets:                 # 目标资产，尽量用平台 id
  - { type: table, id: dwd.orders }
acceptance:             # 可验证的验收标准，最多 3 条
  - "user_id 改为 bigint 后，下游 3 个任务全部通过"
  - "近 7 天无 NULL 转换失败"
env: dev                # 默认 dev；prod 需显式声明
```

### Delivery overlay（DataOps 6 阶段）

`type: delivery` 的工作项在上述总状态之外，增加一层 6 阶段投影。**不要把它当成第二套总状态机**：

- `status`：沿用本协议 `draft → planning → executing → review → approved → applied → verified`
- `stage`：`requirement | design | scheme | develop | cicd | review`
- `stages`：每个阶段的 `status`（`pending | in_progress | blocked | awaiting_approval | done`）、`deliverable`；方案额外有 `substage`
- `gaps`：缺口对象，不要只写在正文
- `approvals`：发布门禁记录（`gate: release`）
- `next`：下一件具体的事

阶段与总状态的建议映射：

| stage | 总 status |
|---|---|
| requirement / design / scheme | planning 或 executing |
| develop / cicd | executing；发布审批时 review |
| review | verified |

模板：`workitems/_template/item.yaml`。阶段推进时同时更新 `updated_at`、对应 `stages`、`plan.md` 一行和 `next`。

> P2 兼容：旧工作项可能仍是 `artifacts/`/`artifact`；`read_workitem` 会归一化为 `deliverables`，新写入一律 `deliverables/`。

**恢复规则**：新会话先读 `workitems/` 里已有的 `item.yaml`；优先按工单/资产/slug 匹配，不要重新问已确认的信息。找不到或冲突时只问一个最关键的问题。

### intent.md

必须写清四件事，缺一件就问人：**要解决什么 / 为什么现在做 / 验收标准 / 明确不做什么**。
"不做什么"是最容易被跳过、也最能防止跑偏的一项。

## 状态机

```
draft → planning → executing → review → approved → applied → verified
             └──────────┴───────────┴──► abandoned
```

| 状态 | 进入条件 | 退出条件 |
|---|---|---|
| `draft` | 刚建，只有意图 | 验收标准明确 |
| `planning` | 开始收集事实 | 有方案 + 至少一条证据 |
| `executing` | 在 dev 试跑 | 产出可评审的 deliverable |
| `review` | 提交评审 | 人或 agent 给出结论 |
| `approved` | 审批记录落盘 | 开始应用 |
| `applied` | 已作用到目标环境 | 验证通过 |
| `verified` | 数据/影响面符合预期 | — |

**规则**：状态只能前进或进 `abandoned`；回退必须写明原因。每次状态变更都更新 `item.yaml` 并在 `plan.md` 追加一行（时间 + 变更 + 原因）。

## 证据

任何进入 `deliverables/` 的结论，必须能追到 `evidence/ev-*.yaml`：

```yaml
id: ev-20261024-001
claim: "user_id 近 7 天有 0.3% NULL"
query: "select ..."
time_range: { from: 2026-10-17, to: 2026-10-24 }
env: prod-ro
as_of: 2026-10-24T17:30:00+08:00
schema_version: "dwd.orders@v12"
result_digest: "rows=1000000, nulls=3000"
```

硬规则：

- 没有 `time_range` 的查询不能作为证据（数据有分区和延迟）。
- 没有 `as_of` 的元数据不能作为证据（schema 会变）。
- 证据只记摘要，原文留在工具结果或 spill 句柄里。
- 结论变化时**新增**证据，不修改旧证据。

## 产出

- 文件名表达内容：`change.sql`、`review.md`、`impact.md`、`runbook.md`。
- deliverable 里引用证据用 `[ev-20261024-001]`，不要复制证据全文。
- 交付前自查：每条结论有证据；每条必改项可执行；有回滚方案。

## 什么时候必须问人

1. 验收标准不明确，或不同人理解不一致；
2. 要动 `prod` 或执行 T3/T4 操作；
3. 影响面里有"未知"消费方；
4. 证据互相矛盾；
5. 方案会改变口径（而不只是实现）。

**不确定就问，不要用假设把工作项推进到下一个状态。**

## 收尾

- `verified` 后：把可复用的部分沉淀到技能或 AGENTS.md，并写一句"下次遇到同类问题先看什么"。
- `abandoned` 后：在 `intent.md` 末尾写放弃原因，避免下一个人重开一遍。
