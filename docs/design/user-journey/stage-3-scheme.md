# Stage 3 方案阶段：边界设计

> 状态：详细设计 v0 已完成，待评审
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 2 设计](stage-2-design.md) · [DesignCard + DataMap](design-card-datamap.md) · [遗留事项](../../backlog.md)

## 1. 为什么拆出来

Stage 2 只回答“设计什么数据对象、什么粒度、什么来源、什么口径、影响谁”。

完整的数据挖掘、数据探索、基线分析、候选方案比较，属于 Stage 3 的 **分析**，不能塞进 DesignCard。

```text
Stage 2 设计
  → 数据结构、来源、粒度、主键、分区、口径、影响面

Stage 3 方案
  → 3a 分析：数据挖掘 / 数据探索 / 基线 / 可行性 / 候选比较
  → 3b 需求方案：业务方案 / 取舍 / 备选
  → 3c 技术方案：任务 / 平台 / 依赖 / SLA / 回滚
```

## 2. 三个子阶段

### 3a 分析

- owner：BA
- 主问题：这个结论靠什么数据支撑？有哪些候选？哪个更合适？
- 活动：
  - 数据挖掘：候选来源、可行字段、可用粒度
  - 数据探索：分布、枚举、覆盖率、异常、边界
  - 基线/对账：新旧口径、候选来源比较
  - 可行性：数据量、时效、权限、依赖
  - 备选方案：优缺点、影响
- 产物：`deliverables/scheme/analysis.yaml`
- 展示：AnalysisCard + DataMap 详细证据链
- 门禁：BA 签收（数据结论和候选判断）

### 3b 需求方案

- owner：BA
- 主问题：业务上选哪个方案？为什么？
- 活动：
  - 方案定义
  - 关键决策
  - 未采用方案和 tradeoff
  - 范围/影响/依赖
- 产物：`deliverables/scheme/solution.yaml`
- 展示：SolutionCard
- 门禁：BA 签收；需求方 advisory

### 3c 技术方案

- owner：SE
- 主问题：怎么落地？任务、平台、依赖、SLA、回滚是什么？
- 活动：
  - 任务拆解
  - 平台/组件
  - 依赖/SLA
  - 工时/风险
  - 回滚
  - 调度约束
- 产物：`deliverables/scheme/tech-plan.yaml`
- 展示：TechPlanCard
- 门禁：SE 签收；Dev 可落地确认（跨人协同后续 EDevOps）

## 3. DataMap 的分工

DataMap 只做**业务语义到物理资产的寻源**，不是血缘/质量系统。

| 阶段 | DataMap 用法 | 其他证据 |
|---|---|---|
| Design | 场景/主题/业务对象/逻辑实体/物理资产；字段/owner/行数 | 独立血缘 + 查询/画像 |
| 3a Analysis | 找候选物理资产/逻辑实体 | 独立血缘 + 深度查询/画像 |
| 3b Solution | 资产影响/owner 作为参考 | 独立血缘 |
| 3c Tech Plan | 依赖/owner 作为参考 | 独立血缘 + 运行约束 |

原则：

- DesignCard 不展开完整数据挖掘；
- AnalysisCard 才展开完整分析；
- 所有卡片共享同一 DataMap 寻源契约；血缘/画像仍是独立证据。
- 用户能追到每个结论的来源、查询、时间范围、as_of。

## 4. Stage 3 的验收关注

- 3a：分析结论有 DataMap 寻源路径 + 独立血缘/画像证据；候选方案有比较；没有证据的结论进 gaps；
- 3b：业务决策有理由和备选；影响面清楚；
- 3c：任务可落地、依赖/SLA/回滚明确；技术依据来自 DataMap/独立血缘/集成/调度/观测；SE 签收。
- 3c 技术方案页以血缘图为主体：目标表 + 一层直接上游表 + 上游产出 ETL/调度 + 目标 ETL/调度 + SLA 余量；集成和内部加工统一为 ETL 节点，`jobKind` 区分。

## 5. 详细设计产物

| 子阶段 | 文档 | 核心 |
|---|---|---|
| 3a 分析 | [stage-3a-analysis.md](stage-3a-analysis.md) | 数据挖掘/探索/基线/候选比较、AnalysisCard、BA 签收 |
| 3b 需求方案 | [stage-3b-solution.md](stage-3b-solution.md) | 业务方案选择、备选/tradeoff、SolutionCard、BA 签收 |
| 3c 技术方案 | [stage-3c-tech-plan.md](stage-3c-tech-plan.md) | 任务/平台/依赖/SLA/工时/风险/回滚、TechPlanCard、SE + Dev 确认；视觉稿：[TechPlanCard + 设计血缘](../../../prototype/tech-plan-lineage.html) |

三份文档各自包含 DataMap 路径、独立血缘/画像边界、payload、卡片、Pass、交接、失败路径和 US-3821 案例。

## 5.1 跨阶段统一决议（建议）

### Gate 命名

统一使用：

```text
scheme.analysis
scheme.solution
scheme.tech_plan
```

`stage` 始终是 `scheme`，通过 `substage` 推进；`approvals` 记录对应 gate。

### Gap 分级

```text
solution-blocking：阻塞方案选择；3a/3b 有则不能 pass
execution-blocking：不阻塞方案选择，但实现前必须关闭；可带 mustCloseBefore pass
```

规则：

- 3a 判定的 blocking，3b/3c **不能重新贴标签绕过**；必须先关闭或按书面回执降级；
- 3b 的 `execution-blocking` 必须带 `mustCloseBefore`，并进入 3c handoff；
- 3c 可用前置任务承接 `execution-blocking`，但必须保持可见、写清关闭时点和 owner；
- Agent 不得自行降级 blocking。

### 签收

- 3a：BA hard；需求方 advisory；pending 可 pass 但必须进 handoff；
- 3b：BA hard；需求方 advisory；objected 若涉及目标/范围/验收/口径，暂停回 requirement；
- 3c：SE hard；Dev `approved/deferred/rejected`；`deferred` 只允许跨人协同项，技术条件不可 deferred；`rejected` 阻断。

### 子阶段交付物指针

`stages.scheme.deliverable` 是单值，不能同时表示三份交付物。建议：

```text
stages.scheme.substage = analysis | solution | tech_plan
stages.scheme.deliverable = 当前 gate 的交付物
top-level deliverables = 三份完整路径都保留
scheme done 时 deliverable = tech-plan.yaml
```

实施前需要补迁移/兼容说明。

### 历史案例

工作项 mock 在 blocking gap 未关闭时历史推进到了 3c。新版流程不追溯改写它，但把它标记为**历史反例**：

```text
3a 发现 G-PAYTIME / G-STATUS / G-DUPKEY blocking
→ 3a blocked
→ 3b/3c 只能作为“如果 blockers 关闭后的规划”展示
→ 不能视为新流程的合法 pass
```

## 5.2 待评审

- Gate 命名/子阶段状态是否按上面统一；
- gap 分级是否允许 execution-blocking 带 mustCloseBefore pass；
- 需求方 advisory 的阻断力；
- `stages.scheme.deliverable` 指针迁移；
- 3c 的 Dev deferred 是否只限协同项。

## 6. 案例：渠道日报支付口径（US-3821）

同一个案例在方案阶段会变成三份分析/方案/技术方案。

### 3a 分析

- 问题：支付口径和下单口径差多少？候选来源是否足够？
- DataMap：`dwd.orders`、`dim.channel`、`dws.trade_channel_daily`、下游；
- 数据画像：行数、status 枚举、支付/下单基线、join 覆盖、缺失支付时间；
- 候选：`dwd.orders` 按 status 过滤 vs 支付流水（若存在）；若支付流水不存在，记 blocking gap；
- 产物：`deliverables/scheme/analysis.yaml`；
- 结论：C1 orders + status + 订单日归属是“有条件推荐”；C2 支付流水缺物理资产、C3 补 pay_time 为备选；G-PAYTIME/G-STATUS/G-DUPKEY 三个 blocking → 3a **blocked**，不进入 3b/3c。
- 注：工作项历史记录在 blocking 未关闭时推进过，属于旧流程反例；新版以本门禁为准。

### 3b 需求方案（假设 blockers 已关闭）

- 选择：口径改在 `dws`，下游继承；
- 备选：只在 `ads` 改，影响小但 API 继续旧口径；
- 产物：`deliverables/scheme/solution.yaml`；
- BA 签收（需求方 advisory）。

### 3c 技术方案（假设 blockers 已关闭）

- 任务：过滤支付成功订单、关联渠道、按渠道×日期聚合、回刷 30 天；
- 平台/SLA：ETL + 05:00；
- 风险：pay_time 缺失、渠道映射未补齐；
- 回滚：保留旧口径 SQL 与快照，按分区回刷；
- 产物：`deliverables/scheme/tech-plan.yaml`；
- SE 签收 + Dev 可落地确认。
