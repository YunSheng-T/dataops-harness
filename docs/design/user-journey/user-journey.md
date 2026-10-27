# DataOps 用户旅程 v0

> 状态：讨论稿，待评审。阶段 0+1：[stage-0-1-us-intake-requirement.md](stage-0-1-us-intake-requirement.md)。遗留事项：[backlog](../../backlog.md)。泳道图：[user-journey-swimlane.html](../../../prototype/user-journey-swimlane.html)
> 截图：[浅色](../../../prototype/shots/user-journey-swimlane.png) · [深色](../../../prototype/shots/user-journey-swimlane-dark.png)

## 1. 范围和角色

第一版只接 **EDevOps US**：

- 触发：US 流转到“轮到我处理”
- 来源系统：EDevOps，状态/指派人/评论是事实源
- 回写：通过内网 `edevops-cli`，不在 DSH 里另造一套 US 状态

后续再扩展 DTS、领导任务、自主探索；v1 不混进来。

角色：

| 角色 | 负责 | 主要阶段 |
|---|---|---|
| BA | 需求接收、分析、业务/数据设计 | requirement / design |
| SE | 技术方案、代码评审 | scheme.tech_plan / code review |
| 数据开发 | 编码、测试、部署 | develop / cicd |
| 审批人 / 需求方 | 发布审批、验收 | release / acceptance |

## 2. 主旅程

```text
US 分配给 BA
→ BA 需求澄清
→ BA 设计交付（BA/需求方签收 + SE 可行性评审）
→ SE 技术方案（SE 签收 + Dev 可落地确认）
→ Dev 编码/自查（SE 代码评审）
→ 测试/发布（发布审批，DSH allowed-once）
→ 验收/复盘（BA/需求方签收）
→ US 关闭（edevops-cli 回写）
```

## 3. 审批矩阵 v0

| 门禁 | 交付物/对象 | 签收/审批人 | 评审人 | 机制 | 阻断 |
|---|---|---|---|---|---|
| 需求确认 | requirement | BA / 需求方 | — | 工作项内容门禁 | 是 |
| 设计确认 | design | BA / 需求方 | SE 可行性 | 工作项内容门禁 | 是 |
| 技术方案 | tech_plan | SE | Dev 可落地 | 工作项内容门禁 | 是 |
| 代码评审 | change.sql / PR | SE | — | 外部代码平台 | 是 |
| 合入 | PR | 代码 owner / 平台审批 | SE | 外部系统 | 是 |
| 发布审批 | release | 指定发布审批人 | — | DSH 原生 approval，仅 allowed-once | 是 |
| 制品发布 | build artifact | 外部发布系统 | — | 外部系统；DSH 记录状态/证据 | 是 |
| 验收/复盘 | postmortem / 结果 | BA / 需求方 | Dev 提供运行证据 | 工作项内容门禁 | 是 |
| US 关闭 | US 状态 | BA / 需求方 | — | `edevops-cli` 回写 | 是 |

原则：

- Agent 生成内容必须有人签收；未 approved 的 deliverable 不能推进 stage。
- 代码合入、制品发布有外部审批的，DSH 不替代，只做状态/证据镜像。
- 发布和任何真实写操作用 DSH 原生 approval；内容签收不必每次弹 DSH 审批。

## 4. Done 定义

| 层级 | 条件 | 状态 |
|---|---|---|
| Stage done | deliverable approved + gaps 明示 | `stages.<stage>.status=done` |
| Delivery done | 代码合入 / 制品发布 | `applied` |
| Business done | BA/需求方验收 + 复盘完成 | `verified` |
| US done | verified 后回写 EDevOps | US 关闭 |

**发布成功不等于需求完成。**

## 5. Agent Team 分工建议

争议：按 BA/SE/Dev 分，还是按活动（数据挖掘、业务方案、技术方案等）分。

建议：**角色 owner + 活动 worker 的混合**。

```text
Lead / Orchestrator
  ├─ BA Agent（对 requirement/design 负责）
  │    └─ 数据挖掘 / 需求分析 / 业务方案 activity worker
  ├─ SE Agent（对 tech_plan/code review 负责）
  │    └─ 技术方案 / 评审 activity worker
  └─ Dev Agent（对 develop/cicd 负责）
       └─ 编码 / 测试 / 发布 activity worker
```

原因：

- 人类交接是按角色的，BA 交 SE、SE 交 Dev；角色 owner 负责 handoff 和签收。
- 活动 worker 负责专业内容，避免一个 Agent 什么都做。
- 同一阶段只允许一个写者；Lead 负责编排，不替角色做业务判断。
- DSH 已有 Agent Teams 原语（Lead/teammates/共享任务），但产品化协同 UX 和权限仍需验证。

备选：纯活动型 Agent（数据挖掘 Agent、业务方案 Agent 等）。活动边界更专业，但跨角色 handoff 多，容易出现“谁对结果负责”不清。建议先用混合模型。

## 6. 待评审

- 需求/设计签收是否都由 BA/需求方，SE 只做可行性评审？
- 技术方案是否由 SE 签收、Dev 确认可落地？
- 发布审批人具体是谁（数据负责人/团队 lead）？
- 代码合入和制品发布是否完全沿用外部审批，DSH 只读镜像？
- US 状态回写映射：哪些 gate 触发写状态，哪些只写评论？
