# Stage 3b 设计：需求方案

> 状态：设计稿 v0
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 0+1 US 接单与需求](stage-0-1-us-intake-requirement.md) · [Stage 2 设计](stage-2-design.md) · [DesignCard + DataMap](design-card-datamap.md) · [Stage 3 方案边界](stage-3-scheme.md) · [US-3821 工作项](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml) · [遗留事项](../../backlog.md)
> 同组并行稿：[Stage 3a 分析](stage-3a-analysis.md)、[Stage 3c 技术方案](stage-3c-tech-plan.md)。本稿只定义 3b，不重复 3a 的数据分析，也不展开 3c 的落地设计。

## 1. 定位

### 1.1 3b 回答什么

> **在 3a 已给出的事实、基线、候选和影响数据之上，业务上选哪个方案、为什么、边界到哪、影响谁、依赖谁。**

3b 的产物是**业务/需求方案**：选择一条业务上可解释、可签收、可交接的路径，并把它的范围、代价、影响和前提写清楚。它不是技术实现方案，也不是重新做一次数据分析。

一句话区分：

```text
3a 分析：数据事实是什么？有哪些候选？差异/可行性如何？
3b 需求方案：选哪条业务路径？放弃什么？影响谁？什么前提？
3c 技术方案：怎么落地？拆哪些任务？什么平台、依赖、SLA、回滚？
```

### 1.2 3b 不回答什么

- 不重新跑数据挖掘、分布、基线、join 覆盖率、对账（这些是 3a）；
- 不重新定目标表 / 粒度 / 主键 / 分区 / 来源（这些是 Stage 2 设计）；
- 不做任务拆解、平台选型、调度 YAML、工时承诺、回滚脚本（这些是 3c）；
- 不写 SQL / DDL，不做代码评审，不申请发布；
- 不替 BA 或需求方签收，不写 US 状态；
- 不在需求目标/范围/验收变化时静默改方案，必须回 requirement；
- 本稿只写设计：不实现 SolutionCard / host tool / presenter，不改 workitem schema、approvals 结构或其他阶段文档。

### 1.3 与相邻阶段的边界

| 问题 | requirement（已确认） | design（已确认） | 3a 分析 | **3b 需求方案** | 3c 技术方案 |
|---|---|---|---|---|---|
| 业务目标 / 范围 / 验收 | 定 | 消费 | 消费 | **对齐并映射** | 消费 |
| 目标表 / 粒度 / 主键 / 分区 / 来源 | — | 定 | 验证 | **不改；要改回 design** | 消费 |
| 数据事实 / 分布 / 基线 / 候选比较 | — | 定向核验 | 定 | **只引用，不重跑** | 引用 |
| 业务方案选择 / 备选 / tradeoff | — | 不选 | 给候选与数据 | **定** | 不重选 |
| 影响面 / 消费方 / owner | 登记 | 给清单 | 给血缘与消费方事实 | **确认方案影响与通知边界** | 维护依赖与发布顺序 |
| 口径层级 / 时间归属 / 历史边界 / 下游契约策略 | 可能给约束 | 给口径框架 | 给可行性与影响数据 | **定** | 落地 |
| 任务 / 平台 / 依赖 / SLA / 回滚 / 工时 | — | 给调度约束 | 给可行性 | 只给约束 | **定** |

原则：

- **3b 消费 3a 的结论，不消费 3a 的原始探索过程。** 需要看全量查询、分布、对比图时回到 AnalysisCard；SolutionCard 只引用与决策相关的 finding / conclusion / baseline。
- **3b 可以推翻 3a 的候选建议，但不能推翻 3a 的事实。** 选另一条路必须写明理由和证据；发现事实矛盾，回 3a。
- **3b 发现设计不成立，回 design，不在方案里改装设计。** 同理，业务目标冲突回 requirement。
- 3b 的决策记录是**可复核的决策轨迹**（问题 → 候选 → 选择 → 依据 → 代价 → 回看条件），不是模型思维链。

### 1.4 角色与写者

| 角色 | 在 3b 的职责 | 权限 |
|---|---|---|
| BA | owner；定义方案、组织决策、签收 | 唯一写者；对 `solution.yaml` 内容负责 |
| 需求方 | 对目标、范围、验收、影响做 advisory | 可 `approved / pending / objected`；`objected` 必须回 requirement 对齐 |
| 交易组 / 报表组 / 数据服务组等资产 owner | 提供证据、确认依赖与影响边界 | 不作为 3b 签收人 |
| SE | 3c owner；3b 阶段可提前预看可行性 | 3b 不设 SE 门禁；不替 BA 签收 |
| EDevOps 协同 | 跨人通知、签收状态回写 | v1 后置（OPEN-001）；3b 只落 workitem 记录 |

```text
同一阶段只允许一个写者：BA。
Agent 可以起草、比对、标缺口；不能替 BA 做业务取舍，也不能替需求方给 advisory。
```

## 2. 输入

### 2.1 必需输入

| 输入 | 路径 / 来源 | 3b 用它做什么 | 缺失时 |
|---|---|---|---|
| requirement | `deliverables/requirement/requirement.yaml` | 目标、范围、非目标、验收、约束 | 不能启动 3b，回 requirement |
| design | `deliverables/design/design.yaml` | target / grain / 主键 / 分区 / 来源 / 指标框架 / 影响清单 / 设计 gaps | 不能启动 3b，回 design |
| analysis | `deliverables/scheme/analysis.yaml` | baseline、findings、conclusion、recommendation、候选/比较、风险、分析 gaps、handoff | 不能启动 3b，回 3a |
| evidence | `evidence/ev-*.yaml` | 决策引用的事实、查询、时间范围、env、as_of | 对应结论进 gap，不能写成事实 |
| 影响面 / 血缘 | 独立血缘系统 + DataMap（资产/owner） | 下游资产、owner、影响数量、未知消费方 | 记 gap；关键决策依赖影响面时不能 pass |
| workitem | `item.yaml` | stage、approvals、gaps、历史版本 | 先恢复/创建 workitem，不新建重复项 |

### 2.2 可选输入

- 3a 的候选方案明细、敏感性分析；
- SE 的可行性预看意见（只作参考，不替代 3c）；
- 历史方案版本、上一轮退回 comment；
- 需求方/消费方的书面回执、变更记录；
- 相关 DataMap 资产快照（字段、owner、行数、assetType）。

### 2.3 输入核对清单

进入 3b 前逐项确认，任何一项不通过都要先处理，不能带病开工：

1. `stages.requirement.status=done` 且 requirement gate approved；
2. `stages.design.status=done` 且 design gate approved；
3. 3a 分析已 BA 签收（`approvals[gate=scheme.analysis]`）、`handoff.status=ready`，不是 draft/blocked；
4. `analysis.asOf` / `design.asOf` / `requirement.asOf` 不存在明显先后矛盾；
5. `analysis.conclusion` 与 `design.target/grain/sources` 不冲突；
6. 3b 关键决策要用的 evidence 在 `evidence/` 中可定位；
7. 上游 gaps 的 severity / owner / action 仍然有效；
8. requirement、design、analysis 之间没有未记录的范围变更。

> 3b 的入口不是“scheme 阶段开始”，而是“3a 已完成并签收”。3a 未通过时，3b 只能做预读，不能出方案。

### 2.4 输入版本与新鲜度

- `solution.yaml` 的 `inputs` 必须记录三份上游交付物的路径和 `asOf`；
- 上游更新后，3b 必须重新核对受影响决策，不能复用旧结论；
- 上游元数据、血缘或 requirement 发生变化时，以变化后的版本为准，并把差异记进 solution 的 `gaps` 或 `revisions`；
- **不允许**在没有记录 `asOf` 的情况下引用“最近分析过”。

## 3. 详细活动

### 3.1 活动总览

```text
接续与核对
→ 从 analysis 识别决策点
→ 定义候选方案（含最小改动基线）
→ 关键决策 + tradeoff
→ 范围 / 影响 / 依赖 / 约束
→ 假设与 gaps
→ 自检
→ BA 签收 + 需求方 advisory
→ Pass，交接 3c
```

### 3.2 接续与核对

- 从 workitem 恢复，不重新开始；
- 先读 `analysis.conclusion` 与 `analysis.findings`，再读 design 和 requirement；
- 把 3a 的 blocking gap 分成两类：影响方案选择的、不影响方案选择但影响执行的（见 3.7）；
- 确认本次方案不改变 requirement 的目标/范围/验收，也不改变 design 的 target/grain/source；
- 如果发现范围变化：停止 3b，回 requirement 记录变更。

### 3.3 从 analysis 识别决策点

3b 不发明决策点，也不逐条复述分析。做法是：**从 3a 的 findings / baseline / candidates 中挑出“必须由业务拍板”的分歧点**，每个决策点对应一个可签收的问题。

常见决策点：

| # | 决策点 | 典型问题 | 谁拍板 | 3a 应提供 |
|---|---|---|---|---|
| 1 | 口径归属层级 | 改 dws、只改 ads，还是新建表？ | BA + 需求方 | 影响面、消费方、血缘、契约风险 |
| 2 | 时间归属 | 订单日、支付日还是分区日？ | BA + 需求方 | 时间字段可用性、跨日差异、基线 |
| 3 | 指标语义 | 是否去重、退款是否扣减、金额符号 | BA + 需求方 + 资产 owner | 枚举、分布、重复率、对账基线 |
| 4 | 历史边界 | 只切换日起生效，还是回刷历史？ | BA + 需求方 + 下游 owner | 历史影响、回刷成本、下游对比需求 |
| 5 | 下游契约策略 | 原地替换、新增列，还是新表并行？ | BA + 下游 owner | 字段登记、读取方式、契约 diff |
| 6 | 验收口径 | 阈值、差异解释、对账方式 | 需求方（BA 起草） | 基线差异、可验证方法 |
| 7 | 范围切分 | 本期做什么、明确不做什么 | BA + 需求方 | 依赖、影响、可分期性 |

规则：

- 每个决策点必须是**业务问题**，不是“用 count(distinct) 还是 count(*)”这种纯实现选择；指标口径的**语义**归 3b，**写法/性能**归 3c。
- 一个决策点只回答一个问题；不要把范围、口径、历史、契约混成一条“大决策”。
- 如果决策点需要新的数据事实才能回答，3b 不自行补分析：回 3a，或记 blocking gap 并暂停该决策。

### 3.4 定义需求方案与候选

候选方案来自 3a 的候选比较，3b 把它整理成**业务上可理解、可签收的完整路径**，不是技术变体清单。

每个候选方案至少写清：

```yaml
- id: OPT-A
  name: 改在 dws，下游继承
  summary: 一句话说明业务效果
  scopeDelta: 相对当前状态改变了什么
  impactCount: 3
  impactAssets: [ads.channel_report, rpt.funnel, api.channel_metrics]
  evidence: [ev-...]
  knownRisks: [...]
  reversible: true | false
```

规则：

- 至少 2 个候选，其中**必须包含“最小改动/维持现状”基线**（例如只改最末端消费方、或本期不切）；
- 候选数量建议 2~4 个，过多说明问题没收敛，回 3a 收敛候选；
- 每个候选都要能回答“如果选它，哪些验收能满足、哪些不能满足”；
- 候选的 tradeoff 用**后果**描述，不用“更好/更差”这类偏好词；
- 已排除的候选保留在 `options` 里并写 `rejectedReason`，不删除；
- 3a 若只给了一个候选且没有比较，3b 不能直接“确认唯一解”，记 gap 或回 3a。

### 3.5 关键决策与 tradeoff

每个关键决策落一条 decision record，字段固定：

```yaml
- id: D-1
  question: 口径改在哪一层？
  decision: 改在 dws，ads 继承
  chosenOption: OPT-A
  alternatives: [OPT-B]
  reason: 血缘上 api 与漏斗直接读 dws，只改 ads 会让报表与接口出现两套数
  evidence: [ev-...]          # 事实依据
  judgment: true              # BA 的业务判断，需签收
  assumptions: [A1]           # 依赖的假设
  tradeoff: 影响面从 0 升到 3，需要通知三个消费方
  consequences: ...
  reversible: true
  revisitWhen: 需求方只要求改 ads 时
  gapRefs: [G-LAYER]
```

规则：

- **决策依据 = 事实 + 判断 + 假设**，三者分别标注：
  - 事实：必须带 evidence ID / as_of；
  - 判断：BA 的业务取舍，必须在签收时可见；
  - 假设：带 `ifFalse` 后果和 owner，不能写成事实。
- 每个关键决策至少 1 个现实备选；确实没有备选时，必须由 3a 证据证明“唯一可行”，并写清放弃条件，不能省掉 tradeoff；
- `reason` 不能是“行业惯例/经验/大家都这样”，除非有 evidence 或明确标为假设；
- 每个决策要写 `reversible` 和 `revisitWhen`，让 3c 知道哪些能技术调整、哪些必须回 3b；
- 决策编号稳定（D-1、D-2…），SolutionCard、handoff、后续评审都引用同一编号。

### 3.6 范围、影响、依赖、约束

**范围**：

- `scope.in`：本期方案明确覆盖的对象、口径、消费方；
- `scope.out`：明确不做的部分，必须与 requirement 的 `non_goals` 对得上；
- 范围变化先回 requirement，不在 3b 里扩/缩。

**影响**：

- 影响资产来自独立血缘系统，不来自 DataMap，也不靠模型记忆；
- 每个影响资产写：资产、类型（table/report/api/task）、owner、变化内容、evidence；
- 影响数量必须可复核；血缘 `truncated=true` 时不能写“已知全部”；
- 未知消费方写 `unknownConsumers: 待确认` + gap，**不允许在无血缘证据时写 0**。

**依赖**：

- 区分“数据/契约依赖”和“决策依赖”（谁必须回执/确认）；
- 每条依赖写 owner、需要什么、为什么、最晚在哪个 gate 前关闭（`dueGate: 3c | develop | release`）；
- 依赖未关闭不一定是 3b 的 blocking，但必须进 handoff，不能在 3c 里凭空消失。

**约束**：

- 类型：SLA、下游字段/粒度契约、安全合规、验收口径、环境（mock/prod）、范围；
- 约束来自 requirement、design、analysis 或下游 owner，不自行发明；
- 3b 只给约束，不给工时/平台/任务承诺（这些是 3c）。

**风险与回滚基线**：

- 3b 记录**业务侧风险**：风险、影响、接受/缓解、owner、关联决策或 gap；
- 3b 记录**业务回滚边界**：是否允许改写历史、保留什么、回滚窗口由谁定；具体回滚步骤、脚本、演练归 3c；
- 风险与回滚基线不是 3c 的专属输入，3c 要在此基础上做技术回滚方案。

### 3.7 假设与 gaps

**假设**：

```yaml
- id: A1
  text: 本轮把口径改在 dws，ads 继承
  ifFalse: 影响面从 3 降为 0，方案需改为 OPT-B 并重做 3b
  owner: 需求方
  status: pending | confirmed | rejected
```

- 每条假设必须可被证伪，且有 owner；
- 假设不能替代 blocking 证据；`status=pending` 的假设要进 handoff 和 SolutionCard；
- 假设被证伪时，按 `ifFalse` 回退，不静默改方案。

**gaps 分级**（本稿新增，用于解决“3b 能不能带 blocking gap pass”）：

| 类型 | 定义 | 对 3b pass 的影响 | 处理 |
|---|---|---|---|
| `solution-blocking` | 不解决就无法判断选哪条方案，或选出的方案不成立 | **不能 pass** | 回 3a/design/requirement，或关闭 gap |
| `execution-blocking` | 不影响方案选择，但不解决会导致开发/发布出错 | 可以 pass，但必须写 `mustCloseBefore` | 带进 handoff，3c/develop 前关闭 |
| `warning` | 有风险但可接受，或已有明确的接受人 | 可以 pass | 记录 owner/action/回看条件 |
| `info` | 提示性信息 | 可以 pass | 记录 |

每条 gap 至少写：

```yaml
- id: G-STATUS
  severity: blocking              # blocking | warning | info
  blockingFor: execution          # solution | execution；仅 blocking 时有意义
  message: status 枚举未验证，过滤条件可能产出 0 行
  owner: 交易组
  action: 给枚举与近 7 天分布
  mustCloseBefore: develop        # execution-blocking 必填
  ifFalse: ...                    # warning 被证伪时的后果（可选）
```

判定原则：

- gap 是 `solution-blocking` 还是 `execution-blocking`，由**它是否改变方案选择**决定，不由“数据问题看起来严不严重”决定；
- 把 `solution-blocking` 降级为 `execution-blocking` 必须写理由并由 BA 签收；
- 任何 gap 都不能在 3c/develop 里无声消失；handoff 要带 `mustCloseBefore`。

### 3.8 自检与提交签收

提交 BA 签收前，逐项自检：

1. 输入三件套齐全且已签收（requirement/design/analysis）；
2. 关键决策都有问题、选择、备选、理由、tradeoff、证据或 gap；
3. 候选方案含最小改动基线，未采用方案有 `rejectedReason`；
4. 范围与非目标与 requirement 一致；
5. 影响面有血缘证据，未知消费方没有被写成 0；
6. 依赖有 owner 和 `dueGate`；
7. 假设有 `ifFalse` 和 owner；
8. gaps 已分级，`solution-blocking` 为 0；
9. 验收标准逐条映射到方案决策或明确 gap；
10. 业务风险与回滚边界已写，技术回滚留给 3c；
11. 没有重做分析、没有写 SQL/任务/工时。

自检通过后：

```text
solution.yaml status: draft → awaiting_signoff
→ BA 签收
→ 需求方 advisory
→ pass 后 status=approved，交接 3c
```

## 4. 证据要求

### 4.1 决策到证据的映射

| 决策类型 | 必须引用 | 可接受证据 | 无证据时 |
|---|---|---|---|
| 口径归属 / 影响面 | 独立血缘 + DataMap 资产/owner | 血缘查询结果（as_of）、DataMap 资产快照 | 记 `warning` 或 `solution-blocking`，不能写“无影响” |
| 时间归属 | 3a finding + evidence | 字段缺失/跨日差异的查询结果 | 记 `solution-blocking`，偏好不能代替事实 |
| 指标语义 / 去重 / 退款 | 3a finding + 分布/枚举 evidence | 分布、重复率、对账基线 | 记 gap，决策降级为条件决策 |
| 历史边界 | 血缘/下游对比需求 + 3a 基线 | 血缘、消费方回执、历史对比证据 | 记 gap，写清默认边界 |
| 下游契约 | 字段登记 / 契约 diff | 字段快照、读取方式、变更影响 | `execution-blocking`，3c/develop 前关闭 |
| 验收口径 | requirement + 需求方 advisory | 原验收、3a 差异、需求方回执 | 回 requirement，或在 3b 记 gap 并标 advisory |
| 范围 / 非目标 | requirement | requirement 原文 | 回 requirement |

### 4.2 DataMap 在 3b 的用法

3b **不重新寻源**，只复用 design/3a 已建立的 DataMap 路径：

```text
场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产
```

- 影响面中的**物理资产**（数仓表 / 湖表）要能对上 DataMap 路径、`assetType`（`warehouse_table` / `lake_table`）和 owner；report / api / task 是独立血缘节点，不强行套 `assetType`；
- DataMap 提供字段、owner、行数、部分基础信息；**完整血缘走独立系统，深度质量/画像走 3a 的 evidence**；
- 3b 只做“引用核对”：资产是否还在、owner 是否变化、类型是否一致；这不产生新的分析结论；
- 如果引用核对发现资产/owner/字段与 design/3a 不一致：记 gap；影响方案选择的回 3a/design。

### 4.3 什么不能当证据

- 模型记忆、“经验上”“一般来说”；
- 没有 as_of 的口头结论；
- 只有 DataMap 字段、没有血缘却声称“下游只有这几个”；
- 只有血缘、没有字段登记却声称“契约兼容”；
- 3a 的探索性中间结果，没有 evidence ID 的截图/日志；
- 需求方在聊天里的单句确认（要落成 advisory 记录）。

### 4.4 证据强度与矛盾处理

| 强度 | 形态 | 用法 |
|---|---|---|
| 强 | 查询 + 时间范围 + env + 结果摘要 + as_of + evidence ID | 可直接支撑决策 |
| 中 | DataMap 元数据快照 / 血缘快照（带 as_of） | 支撑资产/影响/owner，不支撑业务语义 |
| 弱 | 会议纪要、IM、口头回执 | 转成 assumption 或 advisory 记录，不写成事实 |
| 禁止 | 模型记忆、无来源结论 | 不能进 decision / impact |

- 证据之间矛盾（例如画像 0.02% 与测试 0.18%）：记 gap，标 `contradiction`，在决策里写清“以哪个为准、为什么”；
- 决策依赖矛盾证据时不能 pass；
- 证据 `as_of` 早于上游变更时，必须复核或重新取证，不能默认沿用。

## 5. 交付物

### 5.1 文件与状态

```text
workitems/<id>/
  deliverables/
    scheme/
      analysis.yaml        # 3a 产出，3b 只读
      solution.yaml        # 3b 产出
      tech-plan.yaml       # 3c 产出
```

`solution.yaml` 状态：

| 状态 | 含义 |
|---|---|
| `draft` | BA 起草中 |
| `awaiting_signoff` | 已自检，等待 BA 签收 / 需求方 advisory |
| `approved` | BA 签收通过；可交接 3c |
| `returned` | 被退回，comment 必填，回退目标明确 |
| `blocked` | `solution-blocking` gap 未关、上游未签收或关键依赖未就绪；停 3b，不假装在推进 |
| `superseded` | 被后续方案版本替代 |

### 5.2 payload 字段示例

```yaml
kind: solution
stage: scheme
substage: solution
id: SOL-3821
title: 渠道日报支付口径改造方案
status: draft                    # draft | awaiting_signoff | approved | returned | blocked | superseded
owner:
  role: BA
  name: 陈璐
requester: 渠道运营（需求方）
asOf: 2026-10-27T11:20:00+08:00

inputs:
  requirement: { path: deliverables/requirement/requirement.yaml, asOf: ..., approved: true }
  design:      { path: deliverables/design/design.yaml,           asOf: ..., approved: true }
  analysis:    { path: deliverables/scheme/analysis.yaml,          asOf: ..., approved: true }
  evidence: [ev-20261026-001, ev-20261026-005, ev-20261026-007, ev-20261026-008, ev-20261026-009]

summary: 口径改在 dws.trade_channel_daily，ads 继承；本期不改 api/rpt 契约，历史只从切换日起生效

chosenOption: OPT-A

scope:
  in:
    - dws.trade_channel_daily 改为支付口径
    - ads.channel_report 继承新口径
  out:
    - api.channel_metrics / rpt.funnel 契约改造
    - 历史分区回刷
    - pay_time 接入

options:
  - id: OPT-A
    name: 改在 dws，下游继承
    summary: 一处口径，报表/API/漏斗共享
    scopeDelta: 改 dws 计算逻辑，下游不改 SQL
    impactCount: 3
    impactAssets: [ads.channel_report, rpt.funnel, api.channel_metrics]
    pros: [口径统一, 下游无需各自实现]
    cons: [影响 3 个消费方, 需通知与契约核对]
    tradeoff: 影响面从 0 升到 3，换取三处口径一致
    evidence: [ev-20261026-007]
    rejectedReason: null
  - id: OPT-B
    name: 只改 ads.channel_report
    summary: 影响最小，但 API/漏斗仍旧口径
    impactCount: 0
    tradeoff: 报表与接口长期两套数，验收“三处同一套口径”不满足
    evidence: [ev-20261026-007]
    rejectedReason: 无法满足 requirement 的统一口径目标
  - id: OPT-C
    name: 在 dwd.orders 补 pay_time，按支付日归属
    summary: 口径最准，单日可与支付流水对平
    impactCount: 4
    tradeoff: 依赖支付流水与支付组排期，需改上游并回刷
    evidence: [ev-20261026-001]
    rejectedReason: 当前窗口先切 dws；支付流水接入后重开
  - id: OPT-D
    name: 新建 dws.trade_channel_pay_daily 双跑
    summary: 新旧并行，可灰度
    impactCount: 3
    tradeoff: 维护两份逻辑与调度，下游仍需改指向
    rejectedReason: 当前窗口内双份维护成本高于收益

alternatives:                    # options 中未采用项的摘要，供 3c 直接消费
  - { option: OPT-B, tradeoff: 报表与接口长期两套数, rejectedReason: 不满足统一口径目标 }
  - { option: OPT-C, tradeoff: 依赖支付流水与支付组排期, rejectedReason: 当前窗口先切 dws }
  - { option: OPT-D, tradeoff: 双份逻辑与调度, rejectedReason: 双份维护成本高于收益 }

decisions:
  - id: D-1
    question: 口径改在哪一层？
    decision: 改在 dws.trade_channel_daily，ads 继承
    chosenOption: OPT-A
    alternatives: [OPT-B]
    reason: 血缘上 api 与漏斗直接读 dws；只改 ads 会让报表与接口出现两套数
    evidence: [ev-20261026-007]
    judgment: true
    assumptions: [A1]
    tradeoff: 影响面 3，需要通知报表组与数据服务组
    consequences: 下游 3 个资产需做契约核对与通知
    reversible: false
    revisitWhen: 需求方明确只要求改 ads 时
    gapRefs: [G-LAYER]

  - id: D-2
    question: 支付口径按什么时间归属？
    decision: 按订单分区 dt 归属，接受跨日支付记订单日
    alternatives: [OPT-C]
    reason: dwd.orders 无 pay_time，当前没有支付日锚点；接入支付流水需改上游并加回刷
    evidence: [ev-20261026-001]
    judgment: true
    assumptions: [A2]
    tradeoff: 单日与支付流水对不平，月底累计可对齐
    reversible: true
    revisitWhen: 支付流水/pay_time 可用时
    gapRefs: [G-PAYTIME]

impacts:
  count: 3
  unknownConsumers: 0
  evidence: [ev-20261026-007]
  assets:
    - id: ads.channel_report
      type: table
      assetType: warehouse_table
      owner: 报表组
      change: 继承 dws 新口径，输出结构待字段登记确认
      evidence: ev-20261026-005
    - id: rpt.funnel
      type: report
      owner: 报表组
      change: 只登记影响，本期不改契约
      evidence: ev-20261026-007
    - id: api.channel_metrics
      type: api
      owner: 数据服务组
      change: 只登记影响，本期不改契约
      evidence: ev-20261026-007

dependencies:
  - id: DEP-1
    owner: 交易组
    need: status 枚举、含义、近 7 天分布
    reason: 过滤条件 status in ('paid','shipped') 无取值依据
    dueGate: develop
    status: pending
  - id: DEP-2
    owner: 需求方
    need: 确认口径归属 dws（A1）与验收阈值
    reason: 否则方案范围与验收不成立
    dueGate: 3c
    status: pending

constraints:
  - type: SLA
    text: dt 分区 05:00 前产出
  - type: contract
    text: 下游字段与粒度不变；api/rpt 本期不改契约
  - type: acceptance
    text: 差异需可解释并与订单级对账一致（原 0.5% 阈值待需求方重定）
  - type: environment
    text: 当前 mock 环境，不代表生产已切换

risks:
  - id: R-1
    risk: status 枚举与假设不符，过滤后产出 0 行或漏计
    impact: 支付口径产出错误
    mitigation: develop 前探查 + 产出后行数与金额断言
    owner: 交易组
    relatedGaps: [G-STATUS]
  - id: R-2
    risk: order_id 1% 重复，order_cnt 去重/不去重差约 1%
    impact: 报表被质疑口径
    mitigation: 对账同时输出去重/不去重两列并解释
    owner: 交易组
    relatedGaps: [G-DUPKEY]
  - id: R-3
    risk: 跨日支付按订单日归属，单日与支付流水对不平
    impact: 日间差异，月底累计可对齐
    mitigation: 口径说明 + 月累计对账
    owner: 交易组
    relatedDecisions: [D-2]
  - id: R-4
    risk: 下游按列位置读，契约变化直接报错
    impact: 下游消费中断
    mitigation: 字段登记 + 契约 diff，未通过不上线
    owner: 报表组 / 数据服务组
    relatedGaps: [G-COLUMNS]

rollback:                        # 业务回滚基线；3c 展开步骤/演练/审批
  businessBoundary: 只从切换日起生效，历史分区不回刷；回滚只覆盖切换窗口
  retained: 切换前最后一天分区快照 + 旧口径 SQL
  owner: 交易组
  note: 具体回滚步骤、演练、生产回滚审批在 3c / 发布门禁

assumptions:
  - id: A1
    text: 口径改在 dws，ads 继承
    ifFalse: 影响面从 3 降为 0，方案改为 OPT-B 并重做 3b
    owner: 需求方
    status: pending
  - id: A2
    text: 需求方接受跨日支付记订单日
    ifFalse: 需选 OPT-C 并回 design/3a
    owner: 需求方
    status: pending

acceptanceMapping:
  - acceptance: 支付口径可对账
    coveredBy: [D-1, D-3]
    verification: 订单级对账 SQL + 逐渠道差异清单（3c/develop）
    status: gap
  - acceptance: 下游字段与粒度不变
    coveredBy: [D-5]
    verification: 下游字段登记与契约 diff（3c）
    status: gap
  - acceptance: 05:00 前产出
    coveredBy: [design.schedule]
    verification: 沿用 design 的调度约束；3c 验证依赖与 SLA
    status: verifiable

gaps:
  - id: G-STATUS
    severity: blocking
    blockingFor: execution
    message: status 枚举未验证，过滤条件可能产出 0 行
    owner: 交易组
    action: 给枚举与近 7 天分布
    mustCloseBefore: develop
  - id: G-DUPKEY
    severity: blocking
    blockingFor: execution
    message: order_id 1% 重复，order_cnt 去重口径待确认
    owner: 交易组
    action: 确认重复成因并留证
    mustCloseBefore: develop
  - id: G-LAYER
    severity: warning
    message: 口径归属 dws 是本轮假设 A1，未经需求方回执
    owner: 需求方
    action: 回执认可或改选 OPT-B
    ifFalse: 方案需重做
  - id: G-ACCEPT
    severity: warning
    message: 原验收差异 < 0.5% 与改口径矛盾，阈值待重定
    owner: 需求方
    action: 确认差异接受准则
  - id: G-COLUMNS
    severity: blocking
    blockingFor: execution
    message: 下游三表字段未登记，无法判断原地替换还是新增列
    owner: 报表组 / 数据服务组
    action: 补登记字段与读取方式
    mustCloseBefore: develop

review:
  ba:
    status: pending
    approver: 陈璐
    at: null
  requester:
    mode: advisory
    status: pending
    approver: null
    at: null
    comment: null
  se: not-required

handoff:
  status: ready                 # ready | blocked
  to: tech_plan
  carriedGaps: [G-STATUS, G-DUPKEY, G-COLUMNS]
  mustNotChange:
    - target / grain / sources
    - 口径归属 dws
    - 订单日 dt 归属
    - order_cnt 去重语义
    - 历史只从切换日起
    - api/rpt 本期不改契约
  openQuestions:
    - 需求方是否接受 A1 / A2
    - 下游字段是原地替换还是新增列
```

### 5.3 最小必填字段

不能省：`kind / stage / substage / id / status / owner / requester / asOf / inputs / summary / chosenOption / scope / options / alternatives / decisions / impacts / dependencies / constraints / risks / rollback / assumptions / acceptanceMapping / gaps / review / handoff`。

其中：

- `options` ≥ 2，且含最小改动基线；
- `decisions` ≥ 1，且每条有 `reason` + `alternatives`（或“唯一可行”证据）+ `evidence|gapRefs`；
- `impacts` 有 `evidence` 或 `unknownConsumers` 的 gap；
- `acceptanceMapping.coveredBy` 可以引用决策 ID，也可以引用 design 约束（如 `design.schedule`）；
- `review.ba` 是唯一 hard signoff；
- `handoff.mustNotChange` 必须与决策一致，不能漏掉 3c 不得改的东西。

### 5.4 同时产出

- `solution.yaml`；
- SolutionCard；
- `approvals[gate=scheme.solution]`；
- 给 3c 的交接包；
- `plan.md` 一行记录（时间、动作、原因、结果）；
- `item.yaml`：`stages.scheme.substage=solution` 时的状态与交付物指针。

## 6. 怎么呈现：SolutionCard

### 6.1 原则

- 不展示模型思维链，展示**可复核的决策轨迹**：问题 → 候选 → 选择 → 依据 → 代价 → 回看条件；
- 方案卡不复述 analysis 全文，只引用与决策相关的 conclusion / findings，并给 AnalysisCard 入口；
- 证据、影响、缺口都能一键下钻到 evidence / 血缘 / 交付物；
- 默认一屏说清“选了什么、为什么、影响谁、还缺什么”，细节展开看。

### 6.2 信息架构

```text
┌──────────────────────────────────────────────────────────────┐
│ 需求方案 · 渠道日报支付口径改造        待签收 · BA 陈璐     │
│ 来源 US-3821 · analysis 已签收 · 影响 3 · 更新 11:20        │
├──────────────────────────────────────────────────────────────┤
│ 方案结论                                                     │
│ 选 A：口径改在 dws.trade_channel_daily，ads 继承；           │
│ 本期不动 api/rpt 契约；历史只从切换日起生效。                │
├──────────────────────────────────────────────────────────────┤
│ 关键决策（可复核轨迹）                          全部 5 条 → │
│ D-1 口径层级  选 dws（备选：只改 ads）        ev-007 ✓      │
│ D-2 时间归属  订单日 dt，接受跨日差异          ev-001 !      │
│ D-3 订单数    去重计数 + 双计数对账            ev-008 !      │
│ D-4 历史边界  只切换日起生效                   血缘 ✓        │
├──────────────────────────────────────────────────────────────┤
│ 备选方案对比                                                 │
│ A dws 继承   影响 3    三处口径统一          【采用】       │
│ B 只改 ads   影响 0    API/漏斗仍旧口径      【不采用】     │
│ C 新建双跑   影响 3+   可灰度但双份维护      【不采用】     │
├──────────────────────────────────────────────────────────────┤
│ 影响面 / 依赖                                    查看血缘 → │
│ ads.channel_report（报表组）· rpt.funnel（报表组）·          │
│ api.channel_metrics（数据服务组）；未知消费方 0（血缘可证）  │
│ 依赖：status 枚举、重复成因、下游字段登记、需求方回执        │
├──────────────────────────────────────────────────────────────┤
│ 缺口与假设                                                   │
│ G-STATUS / G-DUPKEY / G-COLUMNS：执行前置，develop 前关闭    │
│ G-PAYTIME：按 A2 接受；若需求方不接受 → 改选并回设计/3a      │
│ 风险 4 条；回滚只覆盖切换窗口，历史不回刷                    │
│ 证据 5 条 · 缺口 7 个 · 需求方 advisory pending              │
│ [确认方案] [退回修改] [查看交付物] [分析依据] [查看血缘]     │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 分区说明

| 分区 | 内容 | 数据来源 |
|---|---|---|
| 顶部状态 | 方案标题、状态、BA、来源 US/requirement、impact 数、更新时间 | solution + workitem |
| 方案结论 | `summary` + `chosenOption` + 范围一句话 | solution |
| 关键决策 | D-1..n：问题、选择、备选、依据 chip、缺口标记 | decisions + evidence |
| 备选方案 | 候选对比：影响数、关键代价、采用/不采用理由 | options |
| 影响面 / 依赖 | 资产、owner、变化、未知消费方、依赖 owner 与关闭 gate | impacts + 独立血缘 + DataMap |
| DataMap / 分析入口 | 影响资产的 DataMap 路径、`assetType`、owner；AnalysisCard 只读入口；独立血缘入口 | DataMap + analysis + 血缘 |
| 缺口与假设 | blocking / warning、owner、action、`mustCloseBefore`、假设 ifFalse | gaps + assumptions |
| 风险 / 回滚基线 | 业务风险、owner、缓解；回滚边界与保留物 | risks + decisions + gaps |
| footer | 证据数、缺口数、advisory 状态、确认/退回/交付物/分析/血缘 | review + evidence |

### 6.4 默认与展开

默认（一屏）：

- 方案结论；
- 3~4 条关键决策；
- 2~3 个候选对比；
- 影响面摘要 + 依赖摘要；
- 风险与回滚基线摘要；
- blocking gap 与需求方 advisory 状态；
- footer 动作。

展开：

- 全部决策与每条的 evidence / assumption / revisitWhen；
- 完整候选矩阵与 `rejectedReason`；
- acceptance 逐条映射；
- 依赖明细与 `dueGate`；
- 风险明细与回滚边界；
- 完整 solution payload；
- 上游 analysis findings / dataMap 路径 / 血缘全量。

不默认展示：完整 YAML、原始 SQL、全量血缘图、3a 的完整查询日志。

### 6.5 交互

- 点决策 → 展开：备选、理由、证据、代价、回看条件；
- 点证据 chip → 证据详情：查询、时间范围、env、结果摘要、as_of；
- 点影响资产 → 独立血缘 / DataMap 资产详情；
- 点“分析依据” → AnalysisCard（只读）；
- 点“对比方案” → 候选矩阵；
- 点“确认方案” → BA 签收 panel（需求方 advisory 一并展示）；
- 点“退回修改” → 必须填 comment 和退回目标（3a/设计/需求/3b 内部）；
- 点“查看交付物” → `solution.yaml`；
- 点“查看血缘” → 独立血缘系统。

### 6.6 状态与空态

| 状态 | 呈现 |
|---|---|
| analysis 未签收 | 3b 不启动；卡片显示“等待 3a 分析签收”，不显示方案结论 |
| 无候选 / 候选不足 | 显示“候选未收敛”，回 3a，不伪造比较 |
| 证据缺失 | 对应决策标“待确认”，不写成事实 |
| DataMap 不可用 | 显示“资产信息待核对”，影响面仍以血缘为准 |
| 需求方 objected | 显示 objection 内容与回 requirement 入口，不能确认 |
| 已退回 | 显示退回原因、目标、重新提交条件 |
| 已 superseded | 显示新版本入口，禁止继续签收旧版 |

## 7. 门禁与 Pass

### 7.1 硬门禁（v1）

1. **BA 签收**：`approvals[gate=scheme.solution].signoffs` 有 BA；
2. **决策完整**：每个关键决策有问题、选择、备选（或唯一可行证据）、理由、tradeoff；
3. **证据可追溯**：决策引用的证据可定位；无证据结论已进 gaps；
4. **影响面清楚**：影响资产有血缘 evidence；未知消费方有 gap，不能写“无影响”；
5. **范围一致**：`scope.in/out` 与 requirement 的 `scope/non_goals` 对得上；
6. **gaps 分级**：`solution-blocking` 为 0；`execution-blocking` 有 `mustCloseBefore`；
7. **交付物完整**：`solution.yaml` 最小必填字段齐全；
8. **验收映射**：每条 acceptance 有 `coveredBy` 或明确 gap。

### 7.2 需求方 advisory

- 模式：advisory，不作为 3b 的 hard signoff；
- 结果：`approved / pending / objected`；
- `pending`：允许 pass，但 handoff 和 SolutionCard 必须显示“需求方 advisory pending”，并把待确认项列进 `openQuestions`；
- `objected`：如果针对目标/范围/验收/口径归属，**不能静默 pass**，必须回 requirement 对齐，或由 BA 记录 objection 并暂停；
- advisory 记录落 `review.requester`，不写成“需求方已签收”。

### 7.3 不能 pass 的情况

- 没有 analysis 或 3a 未签收；
- 关键决策没有理由、没有备选、没有 tradeoff；
- 影响面没证据，或用“无影响”掩盖未知；
- 方案与 design 的 target/grain/source 冲突却没有回 design；
- 方案改变 requirement 的目标/范围/验收却没有回 requirement；
- 存在 `solution-blocking` gap；
- BA 未签收；
- 需求方对目标/范围/验收明确 objected；
- 用 3c 的技术结论（任务、工时、平台）反向替代业务决策。

不能 pass 时按原因落 `blocked`（上游/证据未就绪，等回执）或 `returned`（退回上阶段），不能停在 `draft` 假装在推进。

### 7.4 Pass 后

```text
stages.scheme.status = in_progress
stages.scheme.substage = tech_plan
stages.scheme.deliverable = deliverables/scheme/solution.yaml
stage = scheme
next = 技术方案（3c）
```

签收记录：

```yaml
approvals:
  - gate: scheme.solution
    status: approved
    signoffs:
      - role: BA
        approver: 陈璐
        at: 2026-10-27T11:20:00+08:00
      - role: requester
        approver: 渠道运营
        at: 2026-10-27T11:25:00+08:00
        mode: advisory
        opinion: 有保留（A1 / A2 / G-ACCEPT 待回执）
    comment: 方案通过，执行前置缺口随 handoff 带入 3c
```

> `status: approved` 指 BA 的 hard gate 通过；requester 的 `opinion` 是 advisory 记录，不是未签收的 hard signoff。

同时：

- `plan.md` 追加一行；
- 更新 `item.yaml` 的 `stages.scheme`、`approvals`、`gaps`；
- 生成交接包给 3c；
- `solution.yaml` 状态改为 `approved`。

> Pass 的含义是“业务方案可交接”，不是“已实现”或“已发布”。下游改动、发布、验收仍在 develop/cicd/review。
> 3b 的 done 是 `solution approved + handoff 生成`；`scheme` 的 done 要等 3c 完成之后。

## 8. 交接给 3c

### 8.1 交接包

```text
solution.yaml（approved）
+ requirement / design / analysis 的路径与 asOf
+ chosenOption + 被否方案及理由
+ 决策清单（含 evidence / assumption / revisitWhen）
+ 范围（in/out）与非目标
+ 影响资产 + owner + 独立血缘证据
+ 依赖清单 + dueGate
+ 约束（SLA / 契约 / 验收 / 环境）
+ 业务风险 + 回滚基线
+ 假设 + gaps（含 mustCloseBefore）
+ acceptance 映射
+ 需求方 advisory 状态
+ mustNotChange 清单
```

### 8.2 3c 不得静默改的东西

- target / grain / 主键 / 分区 / 来源；
- 口径归属层级；
- 时间归属语义；
- 指标去重/退款语义；
- 历史边界；
- 下游契约策略；
- 范围与非目标。

3c 如果发现这些不成立，必须回 3b 重开决策，不能“技术上顺手改了”。若问题根因在数据事实，回 3a；在目标/粒度/来源，回 design。

### 8.3 3c 回传

3c 完成后，至少回传：

- 技术方案是否在 3b 约束内；
- `mustCloseBefore` gap 的关闭情况；
- 新发现的风险/依赖（需要回 3b 的，明确标记）；
- 对 `mustNotChange` 的偏离（应为空；非空即退回）。

## 9. 失败与退回

### 9.1 判定原则

- 先判断**问题属于哪个阶段的事实/决策**，再决定退回目标，不把问题都堆给 3c；
- 退回必须写 `returnedTo`、原因、需要的证据、重新进入条件；
- 退回不删除已有决策和证据；保留历史，标 `returned`；
- 任何退回都要在 `plan.md` 留一行。

### 9.2 退回路径

| 触发 | 判据 | 退回目标 | 带回什么 |
|---|---|---|---|
| 分析结论不足/矛盾/过期 | 缺关键事实，或 evidence 互相冲突 | 3a | 具体问题、需要补的查询、影响的决策 |
| 候选不足/无法收敛 | 只有 1 个候选且没有唯一可行证据 | 3a | 候选要求、比较维度 |
| 方案需要改 target/grain/source | 现有设计在数据上不成立 | design（再回 3a） | 不成立的点、证据、影响 |
| 业务目标/范围/验收冲突 | 方案无法满足 requirement，或验收自相矛盾 | requirement | 冲突点、可选口径、需求方需拍板项 |
| 影响面无法确定 | 无血缘证据或血缘截断 | 先补血缘；仍未知记 gap | 未知消费方、影响的决策 |
| 方案不可行 | 3c 反馈约束/依赖导致方案不成立 | 3b（复议）或 design/3a | 不可行证据、需重开的决策 |
| 需求方 objected 目标/范围/验收 | advisory 明确反对 | requirement | objection、需重新确认的字段 |
| 需求变更 | 范围/目标在 3b 中被改变 | requirement | 变更前后差异、影响 |
| BA 退回 | 决策理由/备选/影响不足 | 3b 内部（补证据/补决策） | comment、缺失项 |
| 签收被拒 | BA 拒绝，或需求方 objection 未处理 | 按 comment 指向 | 退回原因、重提条件 |

### 9.3 重新进入

- 回到 3b：更新 `solution.yaml`，`status=draft → awaiting_signoff`；
- 回到 3a/design/requirement：3b 暂停，`status=blocked`、`handoff.status=blocked`，不保留“已通过”的假状态；
- 回 3a 补证据 = 同一工作项内回到 `substage=analysis`，补完再回 3b；不新建工作项、不重跑已完成的分析；
- 重新进入时必须核对上游 `asOf` 和 gaps 是否变化；
- 旧版本标 `superseded`，不覆盖历史。

## 10. Agent 边界

Agent 可以：

- 读 requirement/design/analysis/evidence/DataMap/血缘；
- 整理决策点、候选方案、tradeoff 草稿；
- 生成 `solution.yaml` 草案和 SolutionCard；
- 标 gaps、假设、依赖、影响；
- 校验证据引用与字段完整性；
- 更新 workitem 草稿状态（不替人签收）。

Agent 不可以：

- 替 BA 签收，或替需求方给 advisory；
- 重跑 3a 的分析并悄悄改结论；
- 用模型记忆补 DataMap/血缘/证据；
- 把未知影响写成“无影响”；
- 把 `solution-blocking` gap 降级成 warning 来通过门禁；
- 写 SQL/DDL、调度 YAML、任务拆解、工时承诺；
- 写 US 状态、发通知、执行发布；
- 在范围/目标变化时静默改方案。

## 11. 待确认点

1. **gap 分级与 3a 门禁的一致性**：3a 稿要求 blocking gap 清零才 pass，本稿允许 3b 带 `execution-blocking` pass。需要确认 3a 的 blocking gap 在 3b 是否可重新分级，还是必须先在 3a 关闭；两者不一致时以 3a 门禁为准，不把 `blocked` 的 3a 接进 3b。
2. **需求方 advisory 的阻断力**：本稿建议 `objected` 阻断、`pending` 可 pass 但进 handoff；需要确认 pending 是否允许签收，以及 objection 是否一律回 requirement。
3. **历史回刷归属**：本稿把“是否允许改写历史”放在 3b 定业务边界，把回刷窗口/实现放 3c；需要确认是否反过来由 3c 一并决定。
4. **scheme 子阶段状态模型与 gate 命名**：本稿用 `stages.scheme.substage=analysis|solution|tech_plan`，3b gate 用 `scheme.solution`；3a 稿用 `scheme.analysis`，3c 稿用 `tech_plan`，需要统一成同一套命名（建议 `scheme.*`）。现有 `item.yaml` 的 `stages.scheme.deliverable` 是单值（`solution.yaml`），还需确认迁移与展示口径，避免三个交付物只留一个指针。

## 12. 案例：渠道日报支付口径（US-3821）

> 用同一个贯穿案例把 2 → 3a → 3b 串起来。案例为 mock，不代表生产事实；编号以工作项 [2026-10-26-channel-report-pay-caliber](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml) 为准。

**案例口径**：本案例沿用工作项历史 mock——3a 在 `G-STATUS` / `G-DUPKEY` 仍 blocking 时推进到了 3b/3c。按 3a 稿的新门禁（blocking gap 清零才 pass），这是反例：3b 不应启动，最多预读。为了展示 3b 在分析事实齐备后怎样选方案，下文按“这些事实已由 3a 给出、3a 已补签”的正向路径展开；入口条件仍以 §2.3 为准。3b 的 `execution-blocking` 只用于处理不影响方案选择的执行前置；若 3a 已判 blocking，必须先按 3a 门禁关闭，不能在 3b 换标签绕过。

### 12.1 从 Stage 2 拿到什么

设计阶段已签收的结论（`design.yaml`）：

```text
target      dws.trade_channel_daily
grain       渠道 × 日期（channel_id + dt）
primaryKey  dt + channel_id
partition   dt=${bizdate-1}
sources     dwd.orders ⋈ dim.channel
metrics     order_cnt / gmv
schedule    cron 0 3 * * *，SLA 05:00
impact      3 个下游：ads.channel_report / rpt.funnel / api.channel_metrics
```

设计阶段留下的关键缺口：

- `G-PAYTIME`：`dwd.orders` 无支付时间，跨日支付只能按订单分区归属；
- `G-STATUS`：`status` 枚举与分布未登记，支付过滤条件无依据；
- `G-DUPKEY`：`order_id` 约 1% 重复，`order_cnt` 去重口径未定；
- `G-COLUMNS`：下游三张表字段未登记；
- `G-LAYER`：口径改在 dws 是设计假设，待需求方回执。

### 12.2 3a 分析给 3b 的输入

3a 的结论不是“选哪个方案”，而是事实和候选：

| 3a 结论 | 内容 | 证据 |
|---|---|---|
| 基线差异 | 支付口径 vs 下单口径的 `order_cnt` / `gmv` 差异待对账；status 分布缺失导致无法量化 | ev-20261026-008 |
| 时间事实 | `dwd.orders` 无 `pay_time`；跨日支付只能记订单日；与支付流水日汇总有日间差异 | ev-20261026-001 |
| 指标事实 | 单分区 2,000,000 行、`distinct(order_id)=1,980,000`（约 1% 重复），与“唯一”画像矛盾 | ev-20261026-008 |
| 影响事实 | 改 dws 影响 3 个下游；只改 ads 影响 0 个；下游均未改变 | ev-20261026-007 |
| 契约事实 | `ads.channel_report` 等下游字段未登记，无法判断按列名还是列位置读 | ev-20261026-005 |
| 维表事实 | `dim.channel` 与订单 join 覆盖 99.98%，补渠道名不需要额外处理 | ev-20261026-009 |
| 候选 | 改 dws、只改 ads、接支付流水补 `pay_time`、新建双跑表 | — |
| 结论 | 口径可切到 dws，实现路径清晰；但差异量化被 G-STATUS / G-DUPKEY 卡住 | analysis.yaml |

3b 在这份输入上只做两件事：**选业务路径**、**把选择的前提和影响写清楚**。它不重新跑基线，也不重新证明 1% 重复是否存在。

### 12.3 3b 的决策点

| # | 决策点 | 3a 给的事实 | 3b 要拍板 |
|---|---|---|---|
| 1 | 口径改在哪一层 | 改 dws 影响 3；只改 ads 影响 0；API/漏斗直读 dws | dws / ads / 新建并行 |
| 2 | 支付按什么时间归属 | 无 `pay_time`，跨日差异存在 | 订单日 / 补支付流水 / 接受差异 |
| 3 | `order_cnt` 的语义 | `order_id` 1% 重复 | 去重计数 / 行数计数 / 双口径 |
| 4 | 历史怎么处理 | 下游 3 个，历史对比需求未确认 | 只切换日起 / 回刷窗口 / 双跑 |
| 5 | 下游契约策略 | 字段未登记，读取方式未知 | 原地替换 / 新增列 / 新表 |
| 6 | 验收怎么重定 | 原“差异 < 0.5%”与改口径矛盾 | 差异可解释 + 对账一致 / 其他 |

### 12.4 候选方案与 tradeoff

| 方案 | 做法 | 影响面 | 优点 | 代价 | 结论 |
|---|---|---|---|---|---|
| **OPT-A** | 改 `dws.trade_channel_daily`，ads 继承 | 3 | 报表/API/漏斗同一套口径，满足 requirement | 需通知 3 个消费方，做契约核对 | **采用** |
| OPT-B | 只在 `ads.channel_report` 改 | 0 | 影响最小，改动最快 | `api.channel_metrics`、`rpt.funnel` 继续旧口径，长期两套数 | 不采用：不满足统一口径目标 |
| OPT-C | 在 `dwd.orders` 补 `pay_time`，按支付日归属 | 上游 + 3 | 口径最准，单日可对平 | 依赖支付流水与支付组排期，需改上游并回刷 | 不采用（当前）：先把 dws 切过去；后续可重开 |
| OPT-D | 新建 `dws.trade_channel_pay_daily` 双跑 | 3+ | 可灰度、可对比、切换最安全 | 两份逻辑/两份调度，下游仍要改指向 | 不采用：当前窗口双份维护成本高于收益 |

### 12.5 关键决策

```text
D-1 口径改在 dws，ads 继承（OPT-A）
    依据：血缘上 api / 漏斗直读 dws（ev-007）；只改 ads 会出现两套数
    代价：影响面 3，需要通知报表组、数据服务组
    假设：A1 需求方认可 dws 归属；若否，回 requirement 并改选 OPT-B

D-2 时间归属按订单分区 dt，接受跨日支付记订单日
    依据：无 pay_time（ev-001）；接入支付流水需改上游并回刷
    代价：单日与支付流水对不平，月底累计可对齐
    回看：支付流水/pay_time 可用时重开
    假设：A2 需求方接受跨日差异

D-3 order_cnt 用 count(distinct order_id)，对账同时输出去重/不去重两列
    依据：1% 重复是事实（ev-008）；“订单数”语义更接近去重计数
    代价：与行数口径差约 1%，需在对账中解释
    缺口：G-DUPKEY 执行前置，develop 前关闭

D-4 历史只从切换日起生效，不回刷
    依据：回刷窗口未定（G-BACKFILL）；下游历史对比不能被静默改写
    代价：历史区间与新口径可能长期不一致
    回看：下游需要历史对比时重开

D-5 本期不改 api/rpt 契约；ads 输出结构待字段登记后再定“替换 vs 新增列”
    依据：下游字段未登记（ev-005），无法判断读取方式
    代价：契约 diff 推后，但避免先改后错
    缺口：G-COLUMNS 执行前置，develop 前关闭
```

### 12.6 影响、依赖、约束

**影响面**（来自独立血缘，ev-007）：

| 资产 | 类型 | owner | 变化 |
|---|---|---|---|
| `ads.channel_report` | table | 报表组 | 继承 dws 新口径；字段登记待补 |
| `rpt.funnel` | report | 报表组 | 只登记影响，本期不改契约 |
| `api.channel_metrics` | api | 数据服务组 | 只登记影响，本期不改契约 |

未知消费方：0（血缘 `truncated=false`，可复核）。

**依赖**：

- 交易组：`status` 枚举与近 7 天分布（G-STATUS，develop 前）；
- 交易组：`order_id` 重复成因与留证（G-DUPKEY，develop 前）；
- 报表组 / 数据服务组：下游字段与读取方式（G-COLUMNS，develop 前）；
- 需求方：认可 dws 归属（A1）、接受订单日归属（A2）、重定验收阈值（G-ACCEPT）。

**约束**：

- dt 分区 05:00 前产出；
- 下游字段与粒度不变，`api` / `rpt` 本期不改契约；
- 历史分区不作为本轮改写对象；
- 当前是 mock，不代表生产已切换。

**风险与回滚基线**：

- R-1 status 枚举不符 → 0 行/漏计；develop 前探查 + 产出断言；
- R-2 order_id 1% 重复 → 口径争议；对账同时输出去重/不去重两列；
- R-3 跨日支付 → 日间与支付流水不一致；口径说明 + 月累计对账；
- R-4 下游字段未登记 → 契约 diff 无法进行；补登记后再定替换/新增列；
- 回滚边界：只回滚切换窗口，历史不回刷；保留切换前最后一天分区快照与旧口径 SQL；具体回滚步骤/演练/审批在 3c/发布门禁。

### 12.7 gaps 与处理

| Gap | 分级 | 处理 | 对 3b 的影响 |
|---|---|---|---|
| G-STATUS | execution-blocking | 交易组给枚举/分布，develop 前关闭 | 不影响选 dws，但影响实现正确性 |
| G-DUPKEY | execution-blocking | 交易组查重复成因，develop 前关闭；D-3 先按去重 + 双计数对账 | 不阻塞方案，阻塞实现与对账 |
| G-PAYTIME | warning（假设 A2） | 接受订单日归属；若需求方拒绝 → 改选 OPT-C，回 design/3a | 不解决则不能签收 A2 |
| G-COLUMNS | execution-blocking | 报表组/数据服务组补字段登记，develop 前关闭 | 不阻塞方案，阻塞契约 diff |
| G-LAYER | warning（假设 A1） | 需求方回执；若只要求改 ads → 重做 3b | 不解决则不能确认 A1 |
| G-BACKFILL | warning | D-4 定“只切换日起”；后续回刷另开决策 | 不阻塞 |
| G-ACCEPT | warning | 验收改为“差异可解释 + 订单级对账一致”，需求方确认阈值 | 不解决则 advisory 不能 approved |

说明：`G-PAYTIME` 在 design 阶段是 blocking；3b 通过 D-2 + 假设 A2 显式接受“跨日支付记订单日”，把它转为 warning（风险已被业务接受）。若需求方拒绝 A2，它回到 blocking，3b 必须重开并改选 OPT-C。

结论：没有 `solution-blocking` gap，3b 可以带前提 pass；3 个 `execution-blocking` 随 handoff 进入 3c/develop，不能消失。

### 12.8 产出

```text
deliverables/scheme/solution.yaml
+ SolutionCard（待签收）
+ approvals[gate=scheme.solution]：BA approved；需求方 advisory pending
+ handoff → 3c
+ plan.md 一行
```

`solution.yaml` 摘要：

```yaml
chosenOption: OPT-A
scope:
  in: [dws 口径改造, ads 继承]
  out: [api/rpt 契约改造, 历史回刷, pay_time 接入]
decisions: [D-1, D-2, D-3, D-4, D-5]
alternatives: { count: 3, rejected: [OPT-B, OPT-C, OPT-D] }
impacts: { count: 3, unknownConsumers: 0 }
risks: [R-1, R-2, R-3, R-4]
rollback: { boundary: 只切换窗口, retained: 分区快照 + 旧 SQL }
assumptions: [A1, A2]
gaps:
  - { id: G-STATUS,  blockingFor: execution, mustCloseBefore: develop }
  - { id: G-DUPKEY,  blockingFor: execution, mustCloseBefore: develop }
  - { id: G-COLUMNS, blockingFor: execution, mustCloseBefore: develop }
  - { id: G-PAYTIME, severity: warning }
  - { id: G-LAYER,   severity: warning }
  - { id: G-BACKFILL, severity: warning }
  - { id: G-ACCEPT,  severity: warning }
```

### 12.9 门禁结果与交接 3c

- BA 签收：approved；
- 需求方 advisory：pending（A1 / A2 / G-ACCEPT 待回执）；
- `solution-blocking`：0；
- `execution-blocking`：3，全部带 `mustCloseBefore=develop`；
- 3b pass → `stages.scheme.substage=tech_plan`；
- handoff 的 `mustNotChange`：target/grain/sources、dws 归属、订单日归属、`order_cnt` 去重语义、历史边界、api/rpt 契约策略；
- 3c 要接的事：探查 status/重复订单号、ETL 改写、对账、调度与 SLA、下游契约 diff、回滚与快照——但不得改上述业务决策。

> 注：以上是历史 mock 的终态。按新门禁，先由 3a 关闭 `G-STATUS` / `G-DUPKEY` 并补签，3b 才能按本方案签收；否则 3b 停在预读，不能出 approved 的 `solution.yaml`。

### 12.10 这一阶段没有做什么

- 没有重跑支付/下单基线对比（3a 的活）；
- 没有重新定 target/grain/source（design 的活）；
- 没有写 SQL/DDL、任务拆解、调度 YAML、工时（3c/develop 的活）；
- 没有申请发布、没有写 US 状态；
- 没有替需求方确认 A1/A2/G-ACCEPT；
- 没有把 3 个 execution gap 留在 3b 里假装关闭。

