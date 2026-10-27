# DataOps Agent 架构 v1

> 状态：**设计提案，待评审**。P0 只落了入口规则，不代表架构完成。
> 目标：用户从需求开始，Agent 负责推进；工具、技能、preset、状态机各归其位。
> 相关：`blueprint-v2.md`、`workbench-harness.md`、`.agents/skills/dataops-workflow/SKILL.md`
>
> 可视化：[全量蓝图](../prototype/agent-architecture.html) · [增量对照](../prototype/agent-architecture-delta.html)

---

> **术语说明**：本页记录 P1 设计，阶段产物当时叫 `artifact`；P2.0 起统一改为 **Deliverable**（交付物），`Artifact` 只保留给 CICD 编译/构建制品。见 [ADR 0005](../decisions/0005-deliverable-renderer-tool-convergence.md)。

## 1. 结论先行

### 1.1 一句话

**用“DataOps Lead Agent + 持久工作项/阶段状态机 + 阶段技能 + 原子工具”替代“工具目录式演示”。**

### 1.2 四个判断

1. **用户入口不是工具，是需求/工单。**
   用户说业务目标，Agent 自己判断阶段和能力。
2. **技能不是骨架。**
   技能负责阶段知识、判定口径、模板；不能保证阶段顺序、审批和状态。
3. **preset + 工作项状态机才是骨架。**
   preset 定义角色/工具面/默认技能；状态机保证阶段与门禁。
4. **内容生成不是 tool。**
   需求、设计、方案、复盘正文由 Agent + 技能产出；tool 只做只读事实、确定性校验/编译/执行和展示桥接。

### 1.3 为什么现在“全是 tool”不对

| 现象 | 根因 |
|---|---|
| 用户要报工具名 | 没有产品入口，只有能力入口 |
| 16 个工具都暴露 | 没有 preset/角色工具面 |
| 阶段顺序靠 prompt 记得 | 没有持久工作项/状态机 |
| 需求、方案、复盘也有 tool | 把内容生成误当原子能力 |
| 卡片只能靠 toolview | 没有 artifact/展示契约 |

---

## 2. 非目标

- 不做“每个阶段一个插件/一个 Agent”。
- 不把线性需求交给 `workflow` 工具做 fan-out；`workflow` 只用于批量/并行任务。
- 不让 skill 直接访问外部系统或写平台。
- 不让 tool 内部回调 Agent/LLM。
- 不做自动发布；写平台必须审批。
- 不重写 DSH 原生 UI/会话。

---

## 3. 用户旅程

### 3.1 一次完整需求

用户输入：

```text
帮我把渠道日报从下单口径改成支付口径，走完需求到复盘；发布前停下来等我确认。
```

Agent 行为：

1. 建立/继续工作项，提取目标、范围、验收、owner、时间
2. 缺关键项只问**一个**最关键问题
3. 需求 → 设计 → 方案 → 开发 → CICD → 复盘
4. 每个阶段产出 artifact；需要评审的停下来
5. 发布前停：变更单、窗口、审批人、回滚
6. 用户确认后才调发布能力
7. 复盘：目标 vs 实际、行动项、知识回写

用户全程不输入 `dataops_*`，也不看 JSON。

### 3.2 查询/评审/排障

- **只问事实**：直接共享事实 + 证据，不建全流程。
- **只评审 SQL/设计**：评审 preset，只读，不推进交付。
- **故障**：排障旁路，先止血、再根因，不覆盖主链阶段。
- **批量巡检**：batch preset + workflow，只读、输出结构化清单。

---

## 4. 运行时拓扑

```text
┌─────────────────────────────────────────────────────────────┐
│ 用户面                                                       │
│ 自然语言 · 工作项 · 阶段卡 · 审批 · 产物                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ DataOps Lead Agent（preset: dataops-dev）                    │
│ 角色：交付负责人；阶段路由；上下文；门禁；汇总                 │
│                                                             │
│  ├─ 技能：workflow / requirement / design / scheme /         │
│  │        develop / cicd / review / incident                 │
│  ├─ 子代理（按需）：SQL reviewer / lineage / debugger         │
│  └─ 工具：事实 / 校验 / 编译 / 执行 / 展示                    │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
┌───────────────▼──────────────┐  ┌─────────▼─────────────────┐
│ 工作项 + 阶段状态机           │  │ Artifact / Evidence store │
│ item.yaml / stage / approval  │  │ requirement/design/...    │
└───────────────┬──────────────┘  └─────────┬─────────────────┘
                │                           │
┌───────────────▼───────────────────────────▼─────────────────┐
│ 原子能力（Host tools / providers）                            │
│ DataMap · 查询 · 调度 · CICD · 工作项 · deliverable renderer     │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 层职责

| 层 | 负责 | 不负责 |
|---|---|---|
| 用户面 | 表达目标、审批、看产物 | 选工具、写 JSON、记阶段 |
| Lead Agent | 规划、路由、阶段推进、汇总、提问 | 直接读凭据、直接写平台 |
| 技能 | 阶段流程、判定口径、模板、降级 | 状态持久化、权限、外部访问 |
| 工作项/状态机 | 阶段、状态、产物、gaps、approvals | 业务判断、UI 渲染 |
| 工具 | 只读事实、确定性计算、校验、执行、展示 | 内容生成、方案判断、回调 Agent |
| UI | 卡片、阶段、右栏、审批 | 阶段规则、外部系统调用 |

---

## 5. 领域模型

### 5.1 WorkItem

```yaml
id: 2026-10-26-channel-report-pay
title: 渠道日报改支付口径
mode: delivery            # delivery | query | review | incident
source:
  type: requirement
  ref: REQ-3821
owner: 交易组
stage: scheme             # requirement/design/scheme/develop/cicd/review
status: in_progress       # pending/in_progress/blocked/awaiting_approval/done
createdAt: 2026-10-26T10:00:00+08:00
updatedAt: 2026-10-26T10:20:00+08:00
stages:
  requirement: { status: done, artifact: artifacts/requirement.yaml }
  design:      { status: done, artifact: artifacts/design.yaml }
  scheme:      { status: in_progress, substage: analysis }
  develop:     { status: pending }
  cicd:        { status: pending }
  review:      { status: pending }
gaps:
  - id: G-ACCEPT
    message: 差异阈值未确认
    severity: warning
approvals:
  - gate: release
    status: pending
    approver: 下游报表 owner
next: 完成数据分析，输出需求方案
```

**关键点**：

- `stage`/`status` 由状态机维护，不由模型自由填写。
- 每个阶段只认自己的 artifact；下游只引用，不复制。
- `gaps`/`approvals` 是显式对象，不藏在正文里。
- 阶段推进需要有证据/产物；不满足就 `blocked`。

### 5.2 Stage

| 顺序 | 阶段 | 子步骤 | 进入条件 | 退出条件 |
|---|---|---|---|---|
| 1 | 需求 | — | 用户/工单 | 目标、范围、验收、owner 已确认或 gaps 显式 |
| 2 | 设计 | — | 需求完成 | 粒度/主键/来源/分区/影响面可评审 |
| 3 | 方案 | 数据挖掘 → 数据分析 → 需求方案 → 技术方案 | 设计完成 | 四步产物齐全；技术方案含任务/依赖/SLA/回滚 |
| 4 | 开发 | — | 方案确认 | 代码草稿 + 评审 + 本地试跑 |
| 5 | CICD | 扫描 → 编译 → 测试 → 发布/部署 | 开发完成 | 四门禁通过；发布前必须有 approval |
| 6 | 复盘 | — | 发布/上线完成 | 目标 vs 实际、行动项、知识回写 |

排障是 `mode=incident` 的旁路，不占主链阶段。

### 5.3 Artifact

```yaml
kind: tech_plan
stage: scheme
path: artifacts/tech-plan.yaml
status: draft              # draft/reviewed/approved
source: mock               # mock/devops/catalog/query
asOf: 2026-10-26T10:20:00+08:00
gaps: []
payload: { ... }           # 卡片渲染用的结构化数据
```

内容型 artifact（需求/设计/方案/开发/复盘）由 Agent + 技能生成。工具只读取/校验它们，或把 artifact 交给 presenter。

### 5.4 P1 的 UI 边界

P1 的 `item.yaml` 先解决 **Agent 连续性与阶段恢复**，不强行替换现有阶段 chip/brief：

- 对话内阶段显示仍可由现有工具事件驱动；
- P2 的 presenter/workitem service 再把 UI 阶段与持久状态对齐；
- 不要为了 P1 再新增一个“阶段更新”工具。

### 5.5 Approval

```yaml
gate: release
status: pending            # pending/approved/rejected/cancelled/unavailable
approver: 下游报表 owner
requested_at: 2026-10-26T16:00:00+08:00
decided_at: null
decision_id: dsh-approval-...
```

**DSH approval 服务是权威决定，item.yaml 是记录/投影。** 发布工具调用 `ctx.approval.request`，只有 `allowed-once` 才执行；没有服务、拒绝、取消、不可用都 fail closed。不能只靠 prompt，也不能接受 Agent 自报 approved。

---

## 6. Agent 拓扑

### 6.1 P1：单 Lead + 按需子代理

| 角色 | 职责 | 工具面 | 输出 |
|---|---|---|---|
| `dataops-dev`（Lead） | 接需求、规划、推进、汇总 | 全部只读 + 本地 artifact + CICD 提案 | 工作项 + artifact + 阶段结论 |
| `sql-reviewer` | SQL/DDL 评审 | 只读 + EXPLAIN | 结构化评审 |
| `lineage-analyst` | 影响面 | 只读 + 血缘 | 影响清单 |
| `pipeline-debugger` | 排障 | 只读 + 日志 | 时间线 + 根因 |

规则：

- 子代理只返回结构化结论，不改工作项、不写平台。
- 写/发布由 Lead 汇总后走审批。
- 线性需求不需要 Agent Team；只有需要上下文隔离/并行评审时才用子代理。

### 6.2 Preset

| preset | 场景 | 工具面 | 审批 |
|---|---|---|---|
| `dataops-dev` | 日常交付 | 只读 + 本地 artifact + CICD 提案 | 发布审批 |
| `dataops-review` | 设计/SQL 评审 | 只读 + 评审技能 | 禁止执行 |
| `dataops-batch` | 批量巡检 | 只读 + workflow | 禁止交互、禁止写 |
| `dataops-observe` | 排障/值班 | 只读 + 日志/血缘 | 止血动作需审批 |

preset 必须定义：

- persona（DataOps Lead，不是通用 coding agent）
- 默认加载 `dataops-workflow` / `workitem-protocol`
- 工具面（不是全部工具）
- 审批策略
- 是否允许子代理

### 6.3 为什么不用 workflow 做单需求编排

`workflow` 是脚本 fan-out，适合批量巡检/多表扫描。单个需求是**线性、有人审、有状态**的流程，应该用工作项状态机 + Lead Agent，而不是 workflow。

---

## 7. 工具边界

### 7.1 目标工具集

| 类别 | 工具 | 去留 |
|---|---|---|
| 共享事实 | `dataops_shared_read_table`、`_lineage`、`_evidence`、`_profile` | 保留 |
| CICD 动作 | `dataops_cicd_scan`、`_compile`、`_test`、`_release` | 保留；release 调 DSH approval |
| 工作项 | `dataops_shared_read_workitem`、`_update_workitem`（P2） | 新增，状态机接口 |
| 排障信号 | `dataops_shared_read_logs`（P2） | 新增，只读日志/告警信号 |
| 展示桥 | `dataops_shared_present_deliverable` | 新增；把 deliverable 渲染成卡片 |
| 内容生成 | requirement/design/scheme/develop/review 相关 tool | 移除；改 Agent + 技能 |

### 7.2 现有 16 个工具的迁移

| 现有工具 | 长期归属 |
|---|---|
| `dataops_shared_read_table` | 保留 |
| `dataops_shared_read_lineage` | 保留 |
| `dataops_shared_read_evidence` | 保留 |
| `dataops_shared_read_profile` | 保留 |
| `dataops_cicd_scan` | 保留 |
| `dataops_cicd_compile` | 保留 |
| `dataops_cicd_test` | 保留 |
| `dataops_cicd_release` | 保留 + DSH approval 硬门禁 |
| `dataops_requirement_extract_spec` | 改技能；只保留“读工单”能力 |
| `dataops_design_compose_model` | 改技能 + presenter |
| `dataops_scheme_analyze_data` | 改技能 + 查询/证据工具 |
| `dataops_scheme_compose_solution` | 改技能 + presenter |
| `dataops_scheme_compose_tech_plan` | 改技能 + presenter |
| `dataops_develop_generate_code` | 改技能 + 代码工具 |
| `dataops_review_write_postmortem` | 改技能 + presenter |
| `dataops_incident_triage` | 改“读信号”工具 + 排障技能 |

> 迁移期保留旧 mock tools 作为 fixture/回归，不删卡片；新架构用 presenter 产出同类 payload。

### 7.3 工具不变量

- 只读优先；写平台必须审批。
- 输出必须有 `source`、`as_of`、`partial`/`gaps`。
- 权限/白名单/上限在工具层，不靠模型。
- 不返回无界数据；大结果走 handle/spill。
- 不回调 Agent；不在 tool 内生成方案正文。
- 失败信息包含对象、阶段、下一步。

---

## 8. 展示契约

### 8.1 为什么需要 presenter

现在卡片通过 `tool.call.toolview` 按工具名注册。内容生成从工具移走后，Agent 产的是 artifact，不再有“需求工具”可挂卡片。

P2 迁移方案：

```text
Agent 生成 artifact
  → dataops_shared_present_deliverable({ kind, stage, payload, path, status, gaps })
  → client 按 kind 渲染现有卡片
  → stage store 更新 chip/brief
```

P2 之后可以改成 artifact store + event，presenter 只是过渡，不让每阶段再造工具。

### 8.2 卡片输入

```json
{
  "kind": "tech_plan",
  "stage": "scheme",
  "status": "draft",
  "artifact": "artifacts/tech-plan.yaml",
  "payload": { "tasks": [], "estimate": "...", "risks": [] },
  "source": "agent",
  "asOf": "...",
  "gaps": []
}
```

client 只认 `kind` + payload，不认生成它的是哪个工具。

### 8.3 用户面

- 对话头：`方案 · 3/6 · 技术方案输出`
- 轮末：阶段简报 + 子步骤 + 下一步 + 留档
- 卡片：需求/设计/画像/分析/方案/技术方案/开发/CICD/复盘/排障
- 审批：发布卡显示变更单、窗口、审批人、回滚，用户确认后才执行

---

## 9. 关键时序

### 9.1 完整需求

```text
用户 → Lead: 业务目标
Lead → WorkItem: 创建/恢复
Lead → Facts: 按需读取
Lead → Skill: requirement
Lead → Presenter: requirement 卡
Lead → Skill: design
Lead → Presenter: design 卡
Lead → Skill: scheme（挖掘/分析/方案/技术方案）
Lead → Facts: profile/evidence
Lead → Presenter: 各阶段卡
Lead → Skill: develop
Lead → Presenter: develop 卡
Lead → Skill: cicd
Lead → Tools: scan → compile → test
Lead → Tool: release
Tool → DSH approval: ctx.approval.request
用户 → DSH approval: 允许/拒绝
Tool → Lead: released / rejected / cancelled / blocked
Lead → WorkItem: 记录 approval 结果
Lead → Skill: review
Lead → Presenter: review 卡
```

### 9.2 发布门禁

```text
release 请求
  → ctx.approval.request({ agent, toolName, callId, reason })
  → allowed-once：执行 mock release，返回 released
  → rejected / cancelled：返回 rejected/cancelled，不执行
  → unavailable / 无服务：返回 blocked，不执行
  → 无 approval 输入、无自报 approved 通道
```

状态机与工具双重校验；prompt 不是权限边界。

### 9.3 排障旁路

```text
用户 → Lead: 故障描述
Lead → Facts: 日志/血缘/证据
Lead → Skill: pipeline-debug
Lead → Presenter: incident 卡
Lead → WorkItem: 行动项；不覆盖主链阶段
```

---

## 10. 不变量

1. 用户不需要知道工具名/参数/JSON。
2. 内容生成不由 tool 承担；tool 只做原子能力。
3. 阶段推进由状态机控制，不靠模型记忆。
4. 发布/写平台必须有 approval；工具层校验。
5. 没有证据的结论只能是“待确认”，不进入 artifact。
6. 排障是旁路，不占主链 6 段。
7. 阶段是工作流投影，不是插件边界；不新增阶段插件。
8. 工具不回调 Agent；技能不碰外部系统。
9. 卡片从 artifact 来，不绑定具体生成工具。

---

## 11. 迁移路线

### P0（已完成）
- `dataops-workflow` 技能和自然语言入口文档
- 只作为规则验证，**不是最终骨架**

### P1：产品骨架

**P1.1 preset（已完成）**
- 新建 `packages/dataops-preset` bundle，声明 `preset-dataops-dev`；profile patch 只设置 `agent-preset-registry.default: dataops-dev`。
- persona：DataOps Lead；用户说需求，不报工具名；默认加载 `dataops-workflow` + `workitem-protocol`。
- 插件面：skill 文件系统、skill 工具、fs、ask-user、todo、compaction；P1 不接子代理。
- 验证：`--dump-config` 能看到 preset；roster 无 `broken`；新会话默认 `dataops-dev`，也能切回其他模式。

**P1.2 工作项 v0（已完成）**
- 新增 `workitems/_template/item.yaml` 和 `plan.md` 模板。
- 更新 `dataops-workflow`：进入任务先建/恢复工作项；每阶段写 stage/status/artifact/gaps/next。
- P1 用文件协议，不做服务；对话内阶段 chip 仍由现有工具事件驱动。

**P1.3 release 门禁（DSH approval，已完成）**
- `dataops_cicd_release` 调 `ctx.approval.request`；只有 `allowed-once` 才执行 mock release。
- rejected / cancelled / unavailable / 无服务一律不发布，卡片展示状态。
- 不新增工具，不接受 Agent 自报 `approved` 或 mock token。
- 这是 P1 唯一的硬门禁；其他阶段先靠状态文件 + preset 纪律。

**P1.4 自然语言 e2e（已完成）**
- 用户只说业务目标，不说工具名。
- 断言：工作项创建；阶段推进；CICD 前停在 approval；未确认不调用 release；确认后复盘完成。
- 保留 12 步工具脚本作为确定性回归，不删。

**P1 已知边界**
- 宿主工具目前全局可见，preset 还不能真正裁剪工具面；P2 再做 tool policy。
- 文件状态机是 v0，不是强一致；P2 服务化。
- 内容仍是旧 mock tools，P2 再迁技能 + presenter。

**P1 验收**
- 用户提示词不含 `dataops_*`。
- 工作项可恢复；阶段/卡片/审批正确。
- 发布前必停；未确认不 release。
- 现有工具级测试、6 段 mock 回归仍通过。

### P2：工具收敛
1. 新增 workitem 读写 + deliverable renderer
2. 内容生成从 16 个工具迁到技能
3. 工具收敛到：4 事实 + 4 CICD + 2 工作项 + 1 排障信号 + 1 presenter
4. 删除/降级旧内容工具；保留兼容期
5. ADR + 迁移说明

### P3：真实接入
1. workitem 持久化/并发/权限
2. 真实 DataMap/查询/调度/CICD/审批
3. 审计、凭据、行数/字节上限
4. 桌面/多人协作

---

## 12. 验收

### 12.1 自然语言 e2e

```text
A. 帮我把渠道日报改成支付口径，走完需求到复盘；发布前停。
B. 这张表改字段会影响哪些下游？先别改。
C. 昨晚任务失败了，先止血，再告诉我根因。
```

断言：

- 用户提示词不含 `dataops_*`
- A 推进到 release approval 停；未确认不调 release
- B 只读，不建全流程
- C 走 incident 旁路，不污染主链阶段
- 卡片/artifact/gaps/approval 正确
- 没有真实写平台

### 12.2 回归

- 工具级测试保留（卡片契约、lossless JSON、provider seam）
- mock 6 阶段故事保留为确定性验收，不删

---

## 13. 待拍板

| 问题 | 建议 |
|---|---|
| WorkItem 先文件还是先服务 | P1 文件协议，P2 服务化；接口先定 |
| 卡片用 presenter 还是 artifact store | P1 保留 toolview；P2 presenter 兼容；后续 artifact event |
| preset 工具面静态还是按阶段动态 | P1 静态子集；P2 阶段策略 |
| 子代理什么时候引入 | P1 只 Lead；评审/血缘稳定后加 |
| 发布审批怎么接 | P1 DSH 原生 approval + mock release；P3 接现有变更/审批 |
| 旧内容工具何时删 | P2 迁移后删；先留兼容期 |

---

## 14. 下一步

P2 计划见 [`p2-plan.md`](p2-plan.md)；P1 总结见 [`p1-summary.md`](p1-summary.md)。

## 15. 一句话给实现者

**先把“需求 → 工作项 → Lead Agent → 状态机 → 技能 → 工具 → artifact/card/审批”这条链做实；不要继续给每个阶段加 tool。**
