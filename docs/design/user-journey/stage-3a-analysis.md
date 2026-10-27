# Stage 3a 分析：方案·数据分析

> 状态：设计稿 v0
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 0+1](stage-0-1-us-intake-requirement.md) · [Stage 2 设计](stage-2-design.md) · [DesignCard + DataMap](design-card-datamap.md) · [Stage 3 边界](stage-3-scheme.md) · [遗留事项](../../backlog.md)
> 案例工作项：[2026-10-26-channel-report-pay-caliber](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml)

## 1. 阶段定位

### 1.1 3a 回答什么

Stage 3 方案拆成三段：**3a 分析 → 3b 需求方案 → 3c 技术方案**。3a 承上启下，回答的是：

> **这份设计靠哪些数据成立？有哪些候选来源？差异和影响能不能量化？哪个候选在数据上更合适？什么条件下才成立？**

拆成四个主问题：

| 问题 | 对应的 `design.yaml` 内容 | 主要证据 |
|---|---|---|
| 来源和字段够不够？ | `target` / `sources` | DataMap 寻源 + 独立画像 |
| 新旧口径差多少、能不能对账？ | `metrics` / 验收标准 | 基线/对账查询 |
| 候选来源哪个更合适？ | `sources` / `impact` | 候选比较矩阵 + 可行性 |
| 影响面和落地约束成立吗？ | `impact` / `schedule` | 独立血缘 + 只读查询 |

3a **不是**：

- 不是重新做需求澄清，也不是重新设计——`target/grain/primaryKey/partition/sources/metrics` 的定义权在 Stage 2；
- 不是业务方案选择——"业务上要不要做、选哪一层、什么时机切"是 3b；
- 不是技术方案——任务拆解、平台、依赖、SLA、回滚、工时是 3c；
- 不是跑几条 SQL 就下结论——每个结论要有 DataMap 寻源路径、独立证据、时间窗口、as_of。

原则（与 DesignCard 一致）：**不展示模型思维链；展示可复核的证据链和决策轨迹。** 每条结论按证据强度分三档：已核验（有路径 + 证据 + as_of）、推断（单一/间接证据，必须写明是推断）、待确认（无证据，只能进 gaps，不能进结论句）。

```text
requirement 已确认
  → design 已签收（target / grain / sources / metrics / impact）
  → 3a 分析：问题 → 挖掘 → 探索 → 基线/对账 → 候选比较 → 可行性 → 备选 → 结论
  → AnalysisCard → BA 签收
  → 3b 需求方案（业务选择）→ 3c 技术方案（落地）
```

### 1.2 与 Stage 2 设计的边界

判据只有一个：**当前要支持哪个决策**（沿用 [Stage 2 §14](stage-2-design.md#14-设计与-3a-分析的边界)）。

| 问题 | Stage 2 设计 | 3a 分析 |
|---|---|---|
| 设计在现有数据上成立吗 | 主要问题（定向核验） | 复核，不成立就回设计 |
| 目标表 / 粒度 / 主键 / 分区 | 决策并落进 `design.yaml` | 只验证，不改 |
| 用哪些来源、字段映射 | 决策（可带候选） | 列全候选、字段可用性、比较、推荐 |
| 指标口径与验收对应 | 定义与对应 | 量化差异、边界、可否对账 |
| 分布 / 枚举 / 重复 / 覆盖 | 只做支撑决策的最小核验 | 完整探索 + 画像 |
| 影响面 / 血缘 | 必须给出数量与关键下游 | 复核并展开下游契约与消费方风险 |
| 基线 / 对账 | 不做（明确留给 3a） | 核心活动 |
| 可行性（量级 / 时效 / 权限 / 依赖） | 给约束 | 给证据和 verdict |
| 方案选择 | 不做 | 给数据侧推荐候选，不替 3b 做业务选择 |
| 产物 | `deliverables/design/design.yaml` | `deliverables/scheme/analysis.yaml` |
| 门禁 | BA 签收（+ SE 可行性 advisory、需求方 advisory） | BA 签收（+ 需求方/SE advisory） |

三条硬边界：

1. **3a 不改 `design.yaml`**。分析发现 target / grain / source / metric 不成立，写 finding + gap，回 Stage 2 改，不在分析卡里"顺手改结论"。
2. **设计阶段已做过的核验不重复跑**。直接引用 evidence；只有"覆盖不足 / 过期 / 矛盾 / 新候选"四种情况才重跑（见 3.3）。
3. **展示深度不同**。同一个 DataMap 查询和 evidence 可以被两阶段复用，但 DesignCard 只展示支持设计决策的摘要；AnalysisCard 才展开完整查询、分布、对比和结论。

### 1.3 与 3b 需求方案的边界

| 3a 给什么 | 3b 做什么 |
|---|---|
| 数据能否支撑、差异能否量化 | 业务上选哪个方案、为什么 |
| 候选来源的数据侧比较与推荐 | 业务取舍、范围、层级、切换时机 |
| 影响面数据（改 dws 是 3 个下游、改 ads 是 0 个） | 基于影响做层级/范围决策 |
| 验收可否量化、对账方法 | 验收阈值是否调整、接受什么差异 |
| 推荐但不决定 | 决定并签收 |
| 交付物 `analysis.yaml` | 交付物 `solution.yaml` |

**接缝规则**：3b 可以推翻 3a 的推荐，但必须在 `solution.yaml` 写理由，并可以请 3a 补 evidence（同一工作项内补证据，不重开阶段）。反过来，3a 不能把"推荐候选"写成"已选方案"，也不能替需求方接受口径风险。

### 1.4 与 3c 技术方案的边界

3a 只给**可行性证据**：数据量、扫描成本、时效与 SLA 余量、权限、上游就绪时间、下游契约缺口。任务拆解、平台/组件选型、依赖编排、调度 YAML、回滚方案、工时归 3c。3a 不产最终 SQL/DDL，也不把只读对账 SQL 当成交付代码。

### 1.5 阶段事实

- 工作项：`stage=scheme`，`substage=analysis`；Pass 后 `substage=solution`，再之后 `tech_plan`。
- owner：BA（3a、3b）；SE（3c）。同一阶段同一时间只允许一个写者：BA Agent 写 `analysis.yaml`，分析 worker 只产 evidence。
- 重启规则：已有 analysis 草稿时恢复，不从头跑；`substage` 已推进但 analysis 缺失/blocked 时，先补 analysis 或显式记录"继承风险"，不允许静默跳过。

## 2. 角色与职责

| 角色 | 3a 职责 | 签收 |
|---|---|---|
| BA | owner：定义分析问题、组织挖掘/探索/对账、写 `analysis.yaml`、标 gaps、签收 | 硬门禁 |
| 需求方 | 提供验收口径与业务约束；对"接受风险"类 gap 降级给书面回执 | advisory（记录意见，不阻断） |
| SE | 数据可行性预看（量级/时效/依赖），可 `approved / pending / deferred / rejected` | advisory/deferred（v1 不阻断；`rejected` 记录并交接 3b/3c） |
| 资产 owner（如交易组/报表组） | 提供数据事实：枚举、重复成因、映射、契约 | 不是签收人，是 gap owner |
| Dev | 不参与 3a | — |

说明：3a 的硬门禁只有 BA 签收。需求方 advisory 不是"可以不看"——意见必须落进 `review.requester` 和交接包，3b 继承；跨人协同/通知仍后置走 EDevOps（[OPEN-001](../../backlog.md)）。

## 3. 入口与输入

### 3.1 入口条件

- `requirement` 已通过（BA + 需求方签收）；
- `design` 已签收，或 design 明确带着 gaps 进入方案（此时 3a 的第一件事是判断这些 gaps 是否阻断设计成立）；
- `stage=scheme`、`substage=analysis`；
- 恢复场景：读 `analysis.yaml`、`evidence/`、`plan.md`，从断点继续。

### 3.2 输入清单

| 输入 | 来源 | 用途 | 缺失时 |
|---|---|---|---|
| US 原文 / 链接 | EDevOps（只读） | 语义、验收、上下文 | 记 gap，不编造 |
| `requirement.yaml` | `deliverables/requirement/` | goal / scope / acceptance / impacts | blocking，回需求 |
| `design.yaml` | `deliverables/design/` | target / grain / sources / metrics / impact / schedule 约束 | blocking，回设计 |
| design 的 gaps | `design.yaml` + `item.yaml` | 逐条变成分析问题或继承项 | 逐条确认，不遗漏 |
| DataMap 寻源路径 | DataMap（只读）或人工记录 | 候选物理资产、字段说明、owner、行数、assetType | 无路径的结论进 gap |
| 独立血缘 | 独立血缘系统（只读） | 影响面、上游依赖、任务依赖 | 失败/截断 → gap + `truncated` |
| 独立画像/查询 | 画像/查询（只读） | 分布、枚举、重复、空值、覆盖率、对账 | 缺 → gap，不猜 |
| 已有 evidence | `evidence/ev-*.yaml` | 复用，不重复跑 | 引用时保留 as_of / schemaVersion |
| 历史分析与复盘 | 同工作项或历史工单 | 避免重复踩坑 | 无则跳过 |

### 3.3 复用与重跑规则

复用条件（同时满足）：claim 覆盖当前问题、as_of 在有效期内、schemaVersion 未变、环境一致。

重跑条件（满足任一）：

- **覆盖不足**：例如设计阶段画像只覆盖 4 列，而 3a 需要 `status` 分布；
- **过期**：as_of 超期或 schemaVersion 变化；
- **矛盾**：两处证据打架（[workitem-protocol](../../../.agents/skills/workitem-protocol/SKILL.md) 规定"证据互相矛盾必须问人"）；
- **新候选**：候选比较需要额外资产/字段的证据。

重跑一律**新增** evidence，不覆盖旧 evidence；在 `analysis.yaml` 里引用新 ev，并标注旧 ev 的 superseded 关系。

### 3.4 输入缺口的处理

- 缺 `requirement`/`design`：blocking，退回上游，不在 3a 里补设计；
- 缺 DataMap/血缘/画像：可以作为 gap 继续对已知部分分析，但**不许把"读不到"写成"不存在"**；
- 数据平台不可达/无权限：停在该步，记 `blocked` + owner + action，不降级成"经验判断"。

## 4. 详细活动

```text
A1 分析问题与复用核对
 → A2 数据挖掘（DataMap 寻源 / 候选）
 → A3 数据探索（画像 / 查询）
 → A4 基线 / 对账
 → A5 候选来源比较
 → A6 可行性
 → A7 备选与 tradeoff（数据侧）
 → A8 结论 / 建议 / gaps
        │
        ├─ 不成立 → 回 design / requirement
        └─ blocking → 停在 3a（blocked 出口）
```

### A1 · 定义分析问题

**目的**：把 `design.yaml` 的假设改写成可验证的问题，防止分析跑偏。

**做法**：

- 逐项读 `target / sources / metrics / impact / schedule`，为每项写一条 `questions[]`，注明引用的 design 字段；
- 把 design 的 gaps 分类：必须在本阶段关闭的（影响候选判断）、可继承给 3b/3c 的；
- 按 3.3 决定 evidence 复用与重跑；
- 明确不做什么：不重新澄清需求，不重定 target/grain。

**产出**：`question`、`questions[]`；复用/重跑决定记 `plan.md`。

**失败/降级**：design 关键字段缺失或 gaps 未明 → `returned`，回设计。

### A2 · 数据挖掘：从场景找到候选物理资产

**目的**：用 DataMap 的语义链路找候选，而不是凭记忆猜表名。

**做法**：

- 走完整寻源：**场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产**，每跳记录 id/name；
- 物理资产是统一节点，用 `assetType=warehouse_table|lake_table` 区分；字段、owner、行数一并取；
- 每个候选标注角色：目标 / 来源 / 维表 / 下游；
- 主动找替代：同层替代表、湖表、汇总表、中间层；非 DataMap 资产要写"来源=非 DataMap，需单独证据"；
- 识别**"逻辑实体存在但没有物理资产"**：这是缺口信号（可能支付流水就落在这），写 finding + gap，不要直接下"不存在"的结论。

**产出**：`datamap[]`、`candidates[]`。

**证据**：DataMap 快照 + as_of；候选的 owner/行数/字段。

**失败/降级**：DataMap 不可用 → 用只读元数据工具能读到的信息，显式标"寻源路径待补"，不伪造路径；无候选 → blocking gap。

### A3 · 数据探索：分布、枚举、覆盖、边界

**目的**：把"字段有没有"推进到"数据长什么样、能不能用"。

**做法**：

- 对关键键和字段做只读画像：行数/分区覆盖、主键唯一、空值率、枚举/基数、分布与异常、join 覆盖率、新鲜度；
- 针对本需求补边界：跨日支付、退款/取消、负金额、重复订单、空渠道；
- 每条探查记录：query、timeRange、env、resultDigest、cost、asOf、schemaVersion；
- 只为 A1 的问题服务，不做无边界探索。

**产出**：`findings[]`（title / claim / severity / confidence / evidence）。

**证据**：独立画像/查询，不冒充 DataMap。

**失败/降级**：画像不可用 → 只读查询或 gap；查不到写"未获取"，不写"不存在"。

> 重要：**画像没覆盖的列本身就是一条 finding**。本案 `status` 不在画像覆盖范围内，不能假设它有 `paid/shipped` 两个值。

### A4 · 基线 / 对账

**目的**：把"差异多大"从形容词变成数字，或明确 blocked。

**做法**：

- 同一时间窗口、同一粒度、同一份源数据，并跑旧口径与新口径；
- 输出三层：逐渠道 / 逐日 / 汇总；差异率要有分母和单位；
- **差异拆解**（`baseline[].breakdown`）：状态/退款口径、重复计数、日归属（跨日支付）、维表未命中、过滤条件、边界数据；
- 只读：对账 SQL 是只读探针，写在 evidence 的 `query` 里留档，**不写目标表、不产 `change.sql`**；
- 对账 SQL 若后续要固化，3c/develop 再处理。

**产出**：`baseline[]`：

```yaml
- metric: order_cnt
  old: "下单口径 count(*)"
  new: "支付口径 count(distinct order_id) + status 过滤"
  delta: null            # 没有数字就 null，不写 0
  deltaUnit: "订单数"
  window: "2026-10-24"
  status: blocked        # measured | blocked
  blockedBy: [G-STATUS, G-DUPKEY]
  breakdown:
    - reason: "跨日支付"
      impact: "未量化"
      blockedBy: G-PAYTIME
  evidence: []
```

**失败/降级**：不能量化 → `status=blocked` + `blockedBy` + owner；禁止用"应该差不多""经验上小于 1%"填补。

### A5 · 候选来源比较

**目的**：在数据侧回答"哪个候选更合适"，并把不能判断的交给 3b。

**比较维度**（按需裁剪，至少 4 项）：

| 维度 | 看什么 |
|---|---|
| 数据可得性 | DataMap 资产存在、字段齐、只读权限 |
| 口径准确度 | 时间锚点、状态过滤、退款处理 |
| 粒度匹配 | 来源粒度与目标 grain 的转换成本 |
| 覆盖/完整性 | join 覆盖、空值、重复、分区覆盖 |
| 成本 | 扫描量、计算量、回刷范围 |
| 时效 | 上游就绪时间、SLA 余量 |
| 下游兼容 | 字段契约、消费方 |
| 可逆性 | 能否并行/灰度/回滚 |

**做法**：

- 用 **"满足 / 部分 / 阻断 + 证据"** 填矩阵，**不用没有依据的 1–5 分**；要用权重就写清权重和打分依据；
- 每个候选给 `fit`（full / partial / rejected）、`pros/cons`、`blockedBy`；
- 推荐必须带 `preconditions`；被淘汰候选写 `rejected[].reason`；
- **至少 2 个候选**；只有一个时，必须有 `comparison.uniqueReason` 和 BA 书面说明；两个都成立时标 `tied`，把决策交给 3b/需求方，不默认选第一个。

**产出**：`candidates[]`、`comparison`、`recommendation`。

**禁止**：用模型偏好排序；把"候选没比较"写成"已选最优"。

### A6 · 可行性

**目的**：回答"就算选它，能不能按时、按权限、按依赖落地"。

**五项必查**：

| 项 | 记录什么 | verdict |
|---|---|---|
| 数据量 / 成本 | 行数、扫描字节、耗时、回刷窗口 | ok / risk / blocked |
| 时效 | 上游就绪时间、目标 SLA、余量 | ok / risk / blocked |
| 权限 / 环境 | 只读账号、可用环境、数据分级 | ok / risk / blocked |
| 依赖 | 上游任务、维表更新、跨组排期 | ok / risk / blocked |
| 下游兼容 | 字段契约、读法（列名/列位置）、消费方通知 | ok / risk / blocked |

**产出**：`feasibility[]`，每项带 evidence。

**失败/降级**：依赖方未知 → warning gap + owner；不把"没测过"写成"可满足"。

### A7 · 备选与 tradeoff（数据侧）

**目的**：给 3b 一组带数据侧成本/影响的备选，不替它选。

**做法**：

- 备选来自候选来源、时间锚点、状态/退款处理、并行/双跑、回刷策略；
- 每条写：数据侧影响（准确度/成本/工期/风险/影响面）+ `decisionOwner`（3b 或需求方）；
- 明确"3a 推荐"与"3b 决策"的区别。

**产出**：`alternatives[]`。

**禁止**：把业务取舍（改哪层、切不切、何时切）在 3a 里定稿。

### A8 · 结论与建议

**目的**：给 3b 一个可消费、可复核的结论，同时暴露所有不能消化的缺口。

**结论四形态**：

| 形态 | 含义 | 能否 pass |
|---|---|---|
| 可行 | 证据充分，候选明确 | 可 |
| 有条件可行 | 条件写成 `preconditions` + gap | 条件是 warning 可 pass（交接带条件）；是 blocking 不可 |
| 不可行 | 有存在性/约束证据 + owner 确认，换路或不做 | 可（交 3b 决策） |
| 证据不足 | 关键证据缺失 | 不可，`blocked` 出口 |

**结论写法**：一句话结论 + 支撑 evidence ids + 前提与 gaps（blocking/warning、owner、action）。每条 blocking 必须有 owner 和下一步，不能只写"待确认"。

**产出**：`conclusion`、`recommendation`、`gaps`、`handoff`。

**失败/降级**：无法收敛 → `blocked`，不硬写"基本可行"。

## 5. DataMap 与独立证据

### 5.1 DataMap 寻源路径

```text
场景
 → 主题
 → 业务对象
 → 逻辑实体
 → 物理资产（统一节点，assetType = warehouse_table | lake_table）
```

- 每一跳都要有 id/name，可回查；一次分析可以有多条路径（多候选），每条路径写"为什么走/为什么淘汰"；
- 物理资产节点统一，靠 `assetType` 区分数仓表/湖表，`platform`、`layer` 有就记，没有就留空并说明；
- **反例**：从表名猜表、跳过逻辑实体直接写 `dwd.xxx`、把血缘/画像塞进 DataMap 路径——都不是可复核寻源。

### 5.2 物理资产节点

```yaml
physicalAsset:
  id: dwd.orders
  name: dwd.orders
  assetType: warehouse_table     # warehouse_table | lake_table
  platform: null                 # DataMap 未登记就留空，不猜
  layer: dwd
  owner: 交易组
  rowCount: 2000000
  fields:
    - { name: order_id, type: string, description: 订单 ID }
    - { name: status, type: string, description: 订单状态（枚举未登记） }
```

原则：DataMap **只读**，DataOps 不写回、不复制副本。字段说明、owner、行数来自 DataMap；血缘、深度质量来自独立系统。

### 5.3 DataMap 能提供什么、不提供什么

| DataMap 提供 | DataMap 不提供（走独立系统） |
|---|---|
| 场景/主题/业务对象/逻辑实体/物理资产寻源 | 完整上游/下游血缘、任务依赖 |
| 资产类型（assetType）、层、平台（若有） | 空值率、重复率、枚举分布、join 覆盖率 |
| 字段、类型、注释 | 基线/对账、差异量化 |
| owner | 质量规则、SLA 实绩、成本 |
| 行数、部分基础信息 | 下游字段契约（可能部分有，但不保证） |

规则：**读不到就写 gap，不允许用模型记忆补。**

### 5.4 独立血缘

记录：`system`（血缘系统）、`direction`、`depth`、`nodes`、`edges`、`truncated`、`asOf`。用途：

- 影响面：下游数量、类型（table/api/report）、owner；
- 依赖：上游任务就绪时间、维表更新；
- 给 3b 的层级选择提供数据（例如"改 dws 影响 3 个，改 ads 影响 0 个"）。

不截断就写 `truncated: false`；截断要写 `truncated: true` + 实际深度，不能把"看到 3 个"写成"只有 3 个"。

### 5.5 独立画像 / 查询

质量项至少覆盖：行数、主键/唯一、空值、枚举/基数、分布/异常、分区覆盖、新鲜度、join 覆盖率；按需求补边界项。每条证据记录：`query`、`time_range`、`env`、`resultDigest`、`cost`、`asOf`、`schemaVersion`、`source`（mock/real）。

硬规则（沿用 [workitem-protocol](../../../.agents/skills/workitem-protocol/SKILL.md)）：

- 没有 `time_range` 的查询不能当证据；
- 没有 `as_of` 的元数据不能当证据；
- 证据只记摘要，原文留在工具结果/spill 句柄；
- 结论变化**新增**证据，不改旧证据。

### 5.6 证据链模型

每条结论应能还原成：

```text
claim
 → DataMap 路径（场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产）
 → 独立血缘（若涉及影响/依赖）
 → 独立查询/画像（query + time_range + env + resultDigest）
 → as_of + schemaVersion + source
 → evidence id
 → decision
```

示例（本案，mock）：

```yaml
id: ev-20261026-001
claim: "dwd.orders 5 个字段不含 pay_time；DataMap 支付事实下无物理资产"
datamap:
  path:
    scenario: 渠道日报支付口径改造
    domain: 渠道运营/交易分析
    businessObject: 订单
    logicalEntity: 订单事实
    physicalAsset: dwd.orders
  assetType: warehouse_table
  owner: 交易组
  asOf: 2026-10-26T08:26:00+08:00
query: "describe dwd.orders"
time_range: { from: 2026-10-25, to: 2026-10-26 }   # 元数据窗口
env: prod-ro
result_digest: "columns=5, has_pay_time=false, rowCount=2000000"
source: mock
```

### 5.7 证据强度与矛盾

| 等级 | 判定 | 允许出现在哪 |
|---|---|---|
| 已核验 verified | DataMap 路径 + 独立证据 + as_of | 结论句 |
| 推断 inferred | 单一/间接证据 | 结论句必须写"推断" |
| 待确认 unconfirmed | 无证据 | 只能进 gaps，不能进结论 |

**矛盾处理**：两条证据都保留，标 `contradiction`，写 gap；不择一、不"取平均"、不静默调和。必要时按 workitem-protocol "证据互相矛盾必须问人" 停下来问。

### 5.8 缺证据进 gaps

| 缺什么 | gap 建议级别 | owner 示例 |
|---|---|---|
| DataMap 路径/资产类型 | blocking（候选判断依赖时） | 资产 owner |
| 字段（含枚举/类型） | blocking（过滤/口径依赖时） | 资产 owner |
| owner/负责人 | info | 平台/DataMap 维护方 |
| 血缘（影响面） | blocking（影响面未知时）；否则 warning | 血缘系统/平台 |
| 画像（分布/重复/覆盖） | blocking（量化依赖时）；否则 warning | 资产 owner |
| 下游字段契约 | warning（可进 3c 前关闭） | 下游 owner |

原则：**严重级别看"是否让结论无法复核"，不看"重不重要"。**

### 5.9 时效与来源标注

- 引用 evidence 必须带 `as_of`；schemaVersion 变化或超期要重跑（建议默认 7 天，或随发布窗口收紧，见待确认点）；
- `source: mock | real` 必须标；mock 数字不能当生产事实，也不能进验收结论；
- 真实查询用只读账号；凭据不进提示词、日志、证据。

## 6. 交付物：`deliverables/scheme/analysis.yaml`

### 6.1 路径与兼容

- 新写入：`workitems/<id>/deliverables/scheme/analysis.yaml`；
- 兼容读：旧工作项的 `deliverables/analysis.yaml`（P1 样例）继续可读，不批量迁移；
- `kind=analysis`、`stage=scheme`，与 presenter 的 kind/stage 映射一致；卡片仍由 `DeliverableRenderer` 分发到 `AnalysisCard`。

### 6.2 payload 示例（案例值，mock）

```json
{
  "kind": "analysis",
  "stage": "scheme",
  "substage": "analysis",
  "status": "blocked",
  "asOf": "2026-10-26T23:46:00+08:00",
  "sourceMode": "mock",
  "question": "支付口径能否在现有资产上算出来？新旧差异多大、能否对账？候选来源哪个更合适？",
  "designRef": "deliverables/design/design.yaml",
  "requirementRef": "deliverables/requirement/requirement.yaml",
  "questions": [
    {
      "id": "Q1",
      "text": "dwd.orders 是否有支付时间与可用状态？",
      "designField": "sources[0]",
      "status": "answered",
      "evidence": ["ev-20261026-001"]
    },
    {
      "id": "Q2",
      "text": "新旧口径差异能否量化并按原因拆解？",
      "designField": "metrics",
      "status": "blocked",
      "evidence": []
    }
  ],
  "datamap": [
    {
      "role": "source",
      "path": {
        "scenario": "渠道日报支付口径改造",
        "domain": "渠道运营 / 交易分析",
        "businessObject": "订单",
        "logicalEntity": "订单事实",
        "physicalAsset": "dwd.orders",
        "assetType": "warehouse_table",
        "platform": null,
        "layer": "dwd",
        "owner": "交易组",
        "rowCount": 2000000
      },
      "asOf": "2026-10-26T08:26:00+08:00"
    }
  ],
  "lineage": [
    {
      "system": "independent-lineage",
      "direction": "both",
      "depth": 2,
      "upstream": ["dwd.orders", "dim.channel"],
      "downstream": [
        { "asset": "ads.channel_report", "type": "table" },
        { "asset": "api.channel_metrics", "type": "api" },
        { "asset": "rpt.funnel", "type": "report" }
      ],
      "truncated": false,
      "asOf": "2026-10-26T08:26:00+08:00"
    }
  ],
  "findings": [
    {
      "id": "F-001",
      "title": "无支付时间，支付事实无物理资产",
      "claim": "dwd.orders 5 个字段不含 pay_time；DataMap 支付事实下未登记物理资产，支付日归属不可得",
      "severity": "blocking",
      "confidence": "verified",
      "evidence": ["ev-20261026-001"]
    }
  ],
  "baseline": [
    {
      "metric": "order_cnt",
      "old": "下单口径 count(*)",
      "new": "支付口径 count(distinct order_id) + status 过滤",
      "delta": null,
      "deltaUnit": "订单数",
      "window": "2026-10-24",
      "status": "blocked",
      "blockedBy": ["G-STATUS", "G-DUPKEY"],
      "breakdown": [],
      "evidence": []
    }
  ],
  "candidates": [
    {
      "id": "C1",
      "source": "dwd.orders + status 过滤 + 订单日归属",
      "datamapAsset": "dwd.orders",
      "assetType": "warehouse_table",
      "fit": "partial",
      "pros": ["现成资产与只读权限", "量级与时效满足"],
      "cons": ["跨日支付归到下单日", "status 枚举无依据"],
      "blockedBy": ["G-STATUS"],
      "evidence": ["ev-20261026-001"]
    }
  ],
  "comparison": {
    "dimensions": [
      { "name": "数据可得性", "note": "资产存在、字段完整、只读权限" },
      { "name": "口径准确度", "note": "时间锚点、状态过滤、退款处理" },
      { "name": "成本与时效", "note": "扫描量、回刷范围、SLA 余量" }
    ],
    "matrix": [
      {
        "dimension": "数据可得性",
        "C1": "部分：status 枚举缺失",
        "C2": "阻断：DataMap 无物理资产",
        "C3": "待验证：需上游改造"
      }
    ],
    "uniqueReason": null
  },
  "feasibility": [
    {
      "item": "数据量",
      "finding": "单分区 2,000,000 行、扫描 1.2 GB、3.4s",
      "verdict": "ok",
      "evidence": ["ev-20261026-003"]
    }
  ],
  "alternatives": [
    {
      "option": "C1 + 订单日归属 + 口径说明",
      "dataSideImpact": "日间差异不可对账、累计可对齐",
      "tradeoff": "成本低，但支付日语义不成立",
      "decisionOwner": "3b"
    }
  ],
  "recommendation": {
    "candidate": "C1",
    "tied": false,
    "rationale": ["现成资产、量级与时效满足", "当前唯一可立即交付的数据路径"],
    "preconditions": ["G-STATUS 关闭", "G-DUPKEY 关闭"],
    "rejected": [
      { "candidate": "C2", "reason": "DataMap 无物理资产，当前不可得" }
    ],
    "handoffTo": "3b"
  },
  "conclusion": "现有资产只能支撑「订单日归属的支付口径」；差异量化被 status 枚举与订单号重复卡住，尚不能给出可对账数字。",
  "gaps": [
    {
      "id": "G-STATUS",
      "severity": "blocking",
      "message": "status 枚举与占比未登记，过滤条件无依据",
      "owner": "交易组",
      "action": "给出枚举、含义、近 7 天分布",
      "evidence": ["ev-20261026-001"]
    }
  ],
  "evidence": ["ev-20261026-001", "ev-20261026-003"],
  "review": {
    "ba": "reviewed",
    "requester": "advisory_pending",
    "se": "deferred"
  },
  "handoff": {
    "status": "blocked",
    "to": "3b",
    "blockedBy": ["G-STATUS", "G-DUPKEY", "G-PAYTIME"]
  }
}
```

> 示例为节选：`findings`、`candidates`、`feasibility` 各只列首条；案例只展示关键片段（13.10），真实工作中完整 payload 由 Agent 生成并落盘。字段语义见 6.3。

### 6.3 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `kind` / `stage` / `substage` | 是 | 固定 `analysis` / `scheme` / `analysis` |
| `status` | 是 | `draft` / `reviewed` / `approved` / `blocked` / `returned` |
| `asOf` / `sourceMode` | 是 | 内容生成时间；`mock` / `real` |
| `question` / `questions[]` | 是 | 分析主问题；逐条对应 design 字段，`status: answered/blocked` |
| `designRef` / `requirementRef` | 是 | 上游交付物路径，供回查 |
| `datamap[]` | 是 | 寻源路径 + 资产类型；无资产时为空数组 + gap |
| `lineage[]` | 是 | 独立血缘结果；可空数组，但必须说明缺失原因 |
| `findings[]` | 是 | ≥1；每条带 severity/confidence/evidence |
| `baseline[]` | 是 | `measured` 或 `blocked`；blocked 必须带 `blockedBy` |
| `candidates[]` / `comparison` | 是 | ≥2 候选，或 `uniqueReason` |
| `feasibility[]` | 是 | 五项必查，允许 `blocked` |
| `alternatives[]` | 是 | 数据侧备选；可为空但要写"无数据侧备选" |
| `recommendation` | 是 | 推荐候选、前提、被淘汰理由 |
| `conclusion` | 是 | 四形态之一 |
| `gaps[]` | 是 | 可为空；id 稳定，severity 变化保留历史 |
| `evidence[]` | 是 | 汇总本交付物引用的 ev id |
| `review` | 是 | `ba: pending/reviewed/signed`；`requester: advisory_pending/advisory_ok/advisory_object`；`se: deferred/approved/pending` |
| `handoff` | 是 | `ready` / `blocked` + `blockedBy` |

`status` 与 `review.ba` 的关系：`status=approved` 时 `review.ba=signed`；`status=blocked/returned` 时 BA 可以 `reviewed`（已复核结论与阻塞原因）但不 `signed`。

### 6.4 落盘与校验

- 文件 = payload + 可选 `kind`/`stage`；不要把思考过程塞进去；
- 文件校验：`kind=analysis`、`stage=scheme`、`substage=analysis`、`status` 在枚举内、必填字段齐、引用的 evidence 文件存在；
- presenter 入参校验：`deliverable` 是安全相对路径、payload ≤ 256 KB、`kind/stage` 映射一致；失败返回结构化错误，不生成内容；
- `gaps` 同步写 `item.yaml`（id 不重编号、不重用；severity 变化保留历史）；
- 每条结论必须能追到 `evidence/ev-*.yaml`；引用不存在的证据视为校验失败；
- `plan.md` 追加一行：阶段、结论、gaps 数、next；
- evidence 只记摘要，原文/大结果留工具结果或 spill 句柄，不进上下文、不进卡片。

### 6.5 与现有模板的兼容

现有 analysis 模板字段 `question / baseline / findings / conclusion / gaps` 全部保留；本设计新增 `questions / datamap / lineage / candidates / comparison / feasibility / alternatives / recommendation / review / handoff` 为**增量字段**。旧卡片渲旧字段不破，新卡片按字段存在性渐进展示。

## 7. 呈现：AnalysisCard

### 7.1 目标

用户看完卡要能回答三件事：**结论是什么、凭什么、还缺什么。** 卡片展示证据链与决策轨迹，不展示模型思维链；完整查询与 trace 折叠，不默认灌屏。

### 7.2 信息架构

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ 方案 · 数据分析 · 渠道日报支付口径                            已阻塞 · BA 陈璐 │
│ 问题：支付口径能否用现有资产算出来、差异能否对账             来源：design.yaml │
│ 结论：有条件可行——只能订单日归属，差异暂不可量化（3 个 blocking）              │
├────────────────────────────────────────────────────────────────────────────────┤
│ 候选来源比较                                                          3 个候选 │
│         C1 orders+status      C2 支付流水       C3 补 pay_time                 │
│ 可得性  ✓ 表可用，枚举缺      × DataMap 无资产   ! 需上游改造                  │
│ 口径    ! 订单日归属          ✓ 支付日           ✓ 支付日                      │
│ 成本    低                   待接入             高 + 回刷                      │
│ 结论    推荐（有条件）       阻断               备选                           │
├────────────────────────────────────────────────────────────────────────────────┤
│ 分析发现（7）                                                                  │
│ × 无 pay_time，支付事实无物理资产                                              │
│ × status 无枚举/分布，差异无法量化                                             │
│ × order_id 1% 重复，与画像「唯一」矛盾                                         │
│ ✓ 维表覆盖 99.98%，18 渠道；channel_id 空 0.02%                                │
│ ! 下游 3 个，ads 字段 0，读法未知                                              │
│ ! 口径注释与实际不一致（order_cnt 注释「支付订单数」）                         │
│ ! 验收「差异可解释」缺量化方法；空渠道分母未定义                               │
├────────────────────────────────────────────────────────────────────────────────┤
│ 基线 / 对账：order_cnt、gmv 新旧定义已列；数字 blocked（G-STATUS / G-DUPKEY）  │
│ 可行性：2.0M 行/天 · 1.2GB · SLA 余量 1h48m · 只读 ✓ · 下游契约 !              │
├────────────────────────────────────────────────────────────────────────────────┤
│ DataMap 寻源                                                                   │
│ 场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产                                   │
│ 渠道日报支付口径 → 渠道运营 → 订单/支付/渠道 → 订单事实/渠道维度 →             │
│   dwd.orders (warehouse_table · 交易组 · 2.0M)                                 │
│   dim.channel (warehouse_table · 交易组 · 12,000)                              │
│   ! 支付事实：逻辑实体存在，无物理资产                                         │
│ 独立血缘：dws.trade_channel_daily → ads / api.channel_metrics / rpt.funnel     │
├────────────────────────────────────────────────────────────────────────────────┤
│ 缺口 8 · 证据 9 · 需求方 advisory pending · SE 可行性 deferred                 │
│ [签收分析（gap 关闭后）] [退回] [查看交付物] [查看完整 trace] [打开血缘]       │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 分区说明

| 分区 | 内容 | 用户要能回答 |
|---|---|---|
| 顶部 | target、状态、BA、来源 US/requirement/design、更新时间 | 这是什么、给谁签、到哪一步 |
| 问题与结论 | 1–2 句问题 + 结论形态 + 前提 + blocking 计数 | 做完了吗、结论是什么、能不能推进 |
| 候选比较 | 矩阵（维度 × 候选）+ 推荐/阻断/淘汰理由 | 有哪些候选、为什么推荐它 |
| 分析发现 | 每条 finding 状态（✓/!/×）+ 一句话 + chip | 发现了什么、严重吗、证据在哪 |
| 基线/对账 | 指标 before/after/delta/blockedBy | 差多少、为什么给不出数字 |
| 可行性 | 五项 verdict | 能不能按时/按权限/按依赖落地 |
| DataMap 寻源 | 语义路径 + 资产卡（assetType/owner/行数） | 业务上找的是什么、落到哪张表 |
| 独立证据 | 血缘摘要 + 画像入口（不是 DataMap） | 影响谁、质量如何 |
| 缺口 | blocking 优先，含 owner/action | 还缺什么、谁补、补完怎样 |
| footer | 证据/缺口计数、advisory 状态、动作 | 怎么签、怎么退、去哪看全量 |

### 7.4 默认展示与展开

| 区块 | 默认 | 展开后 |
|---|---|---|
| 问题与结论 | 问题 2 行 + 结论 + 前提 | 完整结论、四形态判定、范围 |
| 候选比较 | 矩阵 + 推荐 | 每个候选的完整证据、被淘汰理由、数据侧 tradeoff |
| 分析发现 | 前 5–6 条 | 全部 findings + 每条查询摘要 |
| 基线/对账 | 指标 + delta/blocked | 指标定义、公式、窗口、差异拆解 |
| 可行性 | 一行汇总 | 五项明细 + 证据 |
| DataMap | 路径 + 主要资产卡 | 完整字段、逐跳 id、as_of、候选路径 |
| 独立血缘 | 下游数量 + 前 3 个 | 节点/边、任务依赖、truncated |
| gaps | blocking 置顶 | 全部 gap + owner/action/evidence |
| trace | 步骤状态 | 每步输入/输出/证据（不含思维链） |

**不默认展示**：完整 SQL、整份 YAML、全部证据原文、未脱敏数据、模型推理。

### 7.5 证据 chip 交互

chip 状态：`✓ 已核验`（有路径+证据+as_of）、`! 警告`、`× 阻断`、`待确认`（无证据，灰）。

点击 chip 打开右侧抽屉：

```text
claim（一句话）
DataMap 路径 / 资产类型 / owner
独立血缘（如涉及）
query + time_range + env + resultDigest + cost
as_of + schemaVersion + source(mock/real)
对应 decision / gap
[复制查询] [打开证据文件] [打开血缘]
```

规则：

- `待确认` chip 不可展示成事实，点击只显示 gap、owner、action；
- 矛盾证据时并列显示两条 chip + `contradiction` 标记，不合并；
- 卡片内不渲染全量 SQL，抽屉里展示摘要，完整内容走证据文件/spill 句柄。

### 7.6 状态与空态

- loading：骨架屏；
- 无候选：不渲染空比较表，显示"候选待寻源" + blocking gap；
- 单候选：显示"候选未比较"角标，BA 填 `uniqueReason` 后才能签收；
- DataMap 不可用：显示"寻源待补"，不显示假路径；
- 证据缺失：结论标"待确认"，卡片状态不能是 `approved`；
- 证据矛盾：顶部提示"证据冲突"，列出两条 chip；
- `blocked`：顶部 blocked + gap 列表 + owner + next，不显示签收按钮（或置灰并说明）；
- `returned`：显示退回原因/去向 + 重新提交；
- 超长：卡片摘要 + "查看完整交付物"。

### 7.7 与 DesignCard 的差异

| 维度 | DesignCard | AnalysisCard |
|---|---|---|
| 回答 | 设计什么、影响谁 | 数据是否支撑、候选哪个好 |
| 证据深度 | 摘要（支持设计决策即可） | 完整（查询、分布、对比、结论） |
| 默认展开 | 结论 + 寻源 + 3–5 步证据 | 结论 + 候选比较 + findings + 基线 |
| 交互重点 | 确认设计 | 复核分析、看缺口、签分析 |
| footer | 确认设计 / 退回 | 签收分析 / 退回 / 看 trace |

### 7.8 footer 动作

- `签收分析`：打开签收面板（BA 必填；需求方 advisory 可选；SE deferred 显示"待评审"）；
- `退回`：必填原因 + 选择去向（设计 / 需求）；
- `查看交付物`：`analysis.yaml`；
- `查看完整 trace`：全量分析步骤与证据；
- `打开血缘`：独立血缘系统（不是 DataMap）。

## 8. 门禁、三态出口与 Pass

### 8.1 硬门禁（v1）

| # | 门禁 | 检查方法 |
|---|---|---|
| 1 | 分析问题与 `design.yaml` 待验证点对应 | `questions[]` 每条有 `designField` |
| 2 | 候选已比较（≥2，或书面说明唯一） | `comparison.matrix` / `uniqueReason` |
| 3 | 每个结论有 evidence 或明确 gap | `findings[].evidence`、`conclusion` 引用 |
| 4 | 基线有数或明确 blocked | `baseline[].status` + `blockedBy` |
| 5 | DataMap 路径完整（每跳 + assetType） | `datamap[].path` 校验 |
| 6 | 血缘/质量来自独立系统 | `lineage[].system`、evidence 类型 |
| 7 | 无 blocking gap | `gaps[].severity` |
| 8 | 结论对 acceptance 每条有对应结论或 gap | `questions[]` / `conclusion` 映射 |
| 9 | BA 签收 | `review.ba=signed` / approvals |

### 8.2 软门禁（v1）

- **需求方 advisory**：意见记录进 `review.requester` 和交接包；不阻断 pass，但"接受风险"类降级必须有书面回执；
- **SE 数据可行性 advisory/deferred**：`deferred` 可在 handoff 标"可行性待评审"；`approved` 正常；`rejected` 不改变 3a 的数据结论门禁，但 BA 必须在签收时知悉并写进交接包（3b/3c 复评）。若否决针对数据可获得性，按 blocking gap 处理。

### 8.3 不能 pass 的情况

- 没有候选，或候选未比较（单候选且无书面说明）；
- 关键结论没有证据，或证据矛盾未解决；
- 基线给不出数字，却写成"无差异/差不多"；
- 影响面未知且没有 gap；
- DataMap 路径/血缘/画像来源混淆（把画像当 DataMap、把 DataMap 当血缘）；
- 存在 blocking gap；
- BA 未签收；
- 需求范围变化未回 requirement；
- 把分析结论直接写成业务方案（越界 3b）；
- 证据 as_of 过期/schemaVersion 变化未重跑。

### 8.4 三态出口

3a 结束时不只有"pass"一种结果，必须显式落三态之一：

| 出口 | 条件 | 状态 | 记录 | 去向 |
|---|---|---|---|---|
| passed | 硬门禁全满足 | `approved` | approvals `gate=scheme.analysis` + `plan.md` | `substage=solution`，交接 3b |
| blocked | 证据/依赖缺失，非本阶段可控，gap 有 owner/action | `blocked`，`handoff.status=blocked` | blocked 原因 + 等待项 + 升级路径 | 停在 3a，不进 3b；回执到齐后恢复 |
| returned | 分析推翻设计/需求，或范围/验收变化 | `returned` | 退回原因 + 去向 + 需重签的对象 | 回 design 或 requirement；重签后回 3a |

`blocked` 不是失败：它把"缺什么、谁补、补完怎样"落成可执行记录，避免用假设把工作项推进到下一阶段（workitem-protocol 同款要求）。`blocked` 状态不产生 3b 可签收的输入。

### 8.5 Pass 记录

```yaml
approvals:
  - gate: scheme.analysis
    status: approved
    signoffs:
      - role: BA
        approver: <name>
        at: <timestamp>
      - role: requester
        approver: <name>
        at: <timestamp>
        mode: advisory
        opinion: <同意 / 有保留 / 反对 + 理由>
      - role: SE
        approver: <name>
        at: <timestamp>
        mode: advisory
        se_review: deferred
    analysis_status: approved
    comment: <optional>
```

规则：BA signoff 是硬条件；需求方/SE 的 signoff 只是记录，不改 pass 结果；退回时 `status=rejected` 并写 comment + 去向。

### 8.6 Pass 后

```text
stages.scheme.substage = solution
stage = scheme
next = 3b 需求方案：业务方案 / 取舍 / 备选
```

同时：`plan.md` 追加一行；生成交接包；`analysis.yaml` 状态改 `approved`；`item.yaml` gaps 同步（关闭的 gap 保留 id、标 resolved，不删除）。

### 8.7 Agent 不得

- 替 BA 签收，或把未签收的分析标 `approved`；
- 自行把 blocking gap 降为 warning（降级是决策，见 10.4）；
- 编造行数/枚举/覆盖率/差异率；
- 改 `design.yaml` / `requirement.yaml`；
- 把"分析推荐"写成"业务已选"；
- 在 3a 里产最终 SQL/DDL/调度 YAML；
- 用 mock 数字冒充生产事实。

## 9. 交接给 3b

### 9.1 交接包

```text
analysis.yaml（approved）
+ 结论与推荐候选（含前提）
+ 候选比较矩阵 + 被淘汰理由 + 数据侧 tradeoff
+ 基线/对账结果（measured 或明确 blocked）
+ DataMap 路径 + assetType/owner/行数
+ 独立血缘影响（下游数量/类型/owner）
+ 可行性结论（量级/时效/权限/依赖/下游契约）
+ gaps（blocking 清零；warning 带 owner/action）
+ 需求方 advisory 意见 + SE 可行性状态
```

交接包**引用** `analysis.yaml`，不复制全文。

### 9.2 交接语义

- 3a 的 `recommendation` 是数据侧推荐，不是业务决策；3b 可以推翻，但要在 `solution.yaml` 写理由；
- 3b 若需要新证据（例如选了被淘汰候选、或要补某个边界），回 3a 补 evidence，不重开工作项；
- 3b 不能把 3a 的"推断/待确认"当"已核验"用。

### 9.3 交接状态

- `handoff.status=ready`：3b 可启动；
- `handoff.status=blocked`：3b 不启动定稿，最多做预备讨论；`blockedBy` 逐条对应 gap id；
- 交接记录写入 `item.yaml` 与 `plan.md`，不只存在卡片或对话里。

## 10. 失败与退回

| 情况 | 触发信号 | 处理 | 记录 | 去向 |
|---|---|---|---|---|
| 分析推翻设计 | target/grain/source/metric 不成立 | 停 3a，不改 `design.yaml` | finding + gap + 退回原因 | design（改设计后重签再回 3a） |
| 数据缺失 | 表/字段/枚举/血缘/画像读不到 | 记 blocking/warning gap，不编造 | owner/action/evidence | 停在 3a（blocked） |
| 候选冲突 | 两个候选都成立、tradeoff 相当 | 不拍板，标 `tied` | 比较矩阵 + 判据 | 3b / 需求方决策 |
| 证据矛盾 | 两处数字/结论打架 | 不择一，两条都留 | `contradiction` + gap | 问人（workitem-protocol） |
| 范围变化 | 新下游/新指标/口径变更 | 停，回上游确认 | 变更记录 + 影响 | requirement 或 design |
| 验收与口径冲突 | "差异 < X%" 与"改口径"矛盾 | 拆成可解释/可对账方法 | gap + 需求方回执 | requirement 重定验收 |
| 依赖方不配合 | 枚举/映射/契约拿不到 | blocked + owner + 截止期望 | 升级路径 | 停在 3a / 上报 BA |
| 成本超预算 | 扫描量/回刷/工期超预期 | 缩范围到 design 决策点 | gap 或缩小问题 | 3a 内调整；必要时回设计 |

### 10.1 退回路径

```text
3a 发现设计不成立 ──→ design：改 design.yaml，重新核验，重签后回 3a
3a 发现验收/范围问题 ─→ requirement：改 acceptance/scope，重签后回 3a
3a 数据缺失/依赖未回 ─→ blocked：停在 3a，gap 关闭后继续（不新建工作项）
3a 候选冲突 ──────────→ 3b/需求方：3a 记录比较后交决策（不强行推荐）
```

### 10.2 退回记录要求

- 必须写：原因类别（设计不成立/数据缺失/范围变化/验收冲突）、具体依据（evidence id 或输入文档）、去向、谁需要重签；
- 退回后 `analysis.yaml status=returned`，`item.yaml` 记 approvals rejected；
- 重新进入 3a 时先读退回原因，不重跑已完成的证据。

### 10.3 分析推翻设计的处理

典型：设计假设 `dwd.orders` 有支付时间，实际没有；或设计的粒度与来源粒度不兼容。处理顺序：

1. 在 `analysis.yaml` 写 finding（含 evidence）；
2. 写 gap（blocking）；
3. 标 `returned`，附"建议设计调整点"（只建议，不改写）；
4. 回 design，由 BA 改 `design.yaml` 并重签；
5. 重签后回 3a，复用已有证据，只补新路径需要的部分。

### 10.4 gap 降级规则

`blocking → warning` 是**决策**，不是措辞修改。必须同时满足：

1. 新增证据或书面回执说明原因已消除/风险已可接受；
2. 接受人明确（BA / 需求方 / 资产 owner 中与风险匹配的角色）；
3. 记录在 `decision.md` 或 `approvals`，并在 `analysis.yaml` 保留原 gap id + 降级记录。

否则保持 blocking，`blocked` 出口。历史记录里"按假设 A1 推进、gap 顺手降 warning"的做法，不作为新流程先例。

## 11. Agent 与工具边界

### 11.1 Agent 可以

- 读 workitem / US / requirement / design / DataMap / 血缘 / 画像 / 历史证据；
- 执行**只读**查询与对账，写 evidence；
- 写 `analysis.yaml`、标 gaps、生成 AnalysisCard、更新 workitem 与 `plan.md`；
- 给候选比较、推荐与数据侧 tradeoff。

### 11.2 Agent 不可以

- 替 BA/需求方/SE 签收；
- 改 design/requirement/US 状态；写业务系统；执行写操作/发布；
- 编造证据、把推断写成已核验、把 mock 当生产；
- 用"经验/常识"跳过 DataMap 寻源或独立证据；
- 自行降级 blocking gap；
- 替 3b 做业务选择。

### 11.3 工具面

- 工具只有：只读 workitem / table / lineage / profile / evidence + `update_workitem`（记录状态/缺口）+ `present_deliverable`（渲染卡片）；
- **本设计不新增工具**。DataMap adapter 尚未实现前，用只读元数据 + 人工记录路径，缺路径就 gap；
- `dataops_scheme_analyze_data` 已从活动工具面移除（P2.3），分析正文由 Agent 按模板写、presenter 只做结构校验与分发；
- 若后续要新增 DataMap/画像工具，先走 ADR/蓝图，确认工具数与边界（见待确认点）。

### 11.4 输出有界与安全

- 查询走工具，大结果 spill，返回摘要 + 句柄；卡片只展示 digest；
- 证据含 query/time_range/env/resultDigest/as_of；凭证不进提示词、日志、证据；
- 真实数据用只读账号；测试数据脱敏/合成，生产数据不进夹具。

## 12. 不在本阶段做

- 不产最终 SQL/DDL，不写 `change.sql`；只读对账 SQL 只作证据；
- 不做任务拆解、平台/组件选型、调度 YAML、回滚方案、工时（3c）；
- 不选业务方案、范围、切换时机（3b）；
- 不改 design/requirement（回上游）；
- 不写 US 状态/评论（EDevOps 后置）；
- 不做发布/生产写入/审批；
- 不重跑设计已完成的核验（除非触发重跑条件）；
- 不做无边界探索（范围由 design 决策点约束）；
- 不在卡片或文档里展示模型思维链、完整 SQL、未脱敏数据。

## 13. 案例：渠道日报支付口径（US-3821）

> 案例数据来自工作项 evidence 的 mock 快照（`env=prod-ro`，`source=mock`），不代表生产事实。数字以工作项证据为准。

### 13.1 从 Stage 2 接过来

- 来源 US：`US-3821`，目标：渠道日报从下单口径改为支付口径；
- `design.yaml` 已签收，关键决策：target `dws.trade_channel_daily`、grain 渠道 × 日期、分区 `dt=${bizdate-1}`、sources `dwd.orders ⋈ dim.channel`、metrics `order_cnt / gmv`、SLA 05:00（历史记录里 `G-PAYTIME` 已标 blocking 仍进入方案；按现行 Stage 2 门禁，这类 gap 应在设计阶段关闭或降级。本案例把它作为 3a 的输入与首要验证项，不追溯改写）；
- design 带出的 gaps：`G-PAYTIME` / `G-STATUS` / `G-DUPKEY`（blocking）、`G-COLUMNS` / `G-LAYER`（warning）；从 requirement/工作项继承：`G-ACCEPT` / `G-EMPTY-CHANNEL` / `G-BACKFILL`（warning）；
- 设计阶段明确把"完整支付/下单基线对比"留给 3a（[Stage 2 §14](stage-2-design.md#14-设计与-3a-分析的边界)）。

### 13.2 A1 · 分析问题

| # | 问题 | 对应 design 字段 | 状态 |
|---|---|---|---|
| Q1 | 支付口径能否用现有资产算出来？ | sources | 已答：只能订单日归属 |
| Q2 | 新旧口径差异多大、能否对账？ | metrics / acceptance | blocked：枚举+去重未定 |
| Q3 | `order_id` 唯一性与 status 过滤可靠吗？ | sources / grain | blocked：1% 重复、无枚举 |
| Q4 | 改 dws 的数据侧影响与可行性？ | impact / schedule | 部分：影响 3，契约缺 |

### 13.3 A2 · DataMap 寻源路径

| 跳 | 值 |
|---|---|
| 场景 | 渠道日报支付口径改造 |
| 主题/领域 | 渠道运营 / 交易分析 |
| 业务对象 | 订单 / 支付 / 渠道 / 渠道日报 |
| 逻辑实体 | 订单事实 / 支付事实 / 渠道维度 / 渠道日报 |
| 物理资产 | `dwd.orders`（订单事实，`warehouse_table`）、`dim.channel`（渠道维度，`warehouse_table`）、`dws.trade_channel_daily`（渠道日报，`warehouse_table`）、`ads.channel_report`（下游，`warehouse_table`） |
| 支付事实 | **逻辑实体存在，DataMap 未登记物理资产** → `G-PAYTIME` 的直接依据 |
| owner / 行数 | `dwd.orders` 交易组 / 2,000,000（单分区）；`dim.channel` 交易组 / 12,000；`dws` 交易组 / 12,000；`ads` 报表组 / 12,000（字段元数据 0） |

补充：`rpt.funnel`（report）、`api.channel_metrics`（api）不是数仓/湖表，**不出现在 DataMap 物理资产层**，它们与 dws 的关系来自独立血缘（ev-20261026-002 / 007）。

### 13.4 A3 · 分析发现

| # | finding | severity | 证据 |
|---|---|---|---|
| F-001 | `dwd.orders` 5 字段，无 `pay_time`；支付事实无物理资产，支付日归属不可得 | blocking | ev-20261026-001 |
| F-002 | `status` 无取值枚举与分布（画像只覆盖 4 列），`status in ('paid','shipped')` 无依据 | blocking | ev-20261026-001 / 008 |
| F-003 | 单分区 2,000,000 行但 `distinct(order_id)=1,980,000`（1% 重复），与"order_id 唯一"的画像结论矛盾 | blocking | ev-20261026-003 / 008 |
| F-004 | `dim.channel` 12,000 行、18 渠道、join 覆盖 99.98%，`channel_id` 空值 0.02% | info | ev-20261026-009 / 003 |
| F-005 | 下游 3 个：`ads.channel_report`（table）、`api.channel_metrics`（api）、`rpt.funnel`（report）；`ads` 字段元数据 0，读法未知 | warning | ev-20261026-002 / 005 / 007 |
| F-006 | 口径表述已不一致：`dws.order_cnt` 注释"支付订单数"，报表仍按下单口径 | warning | ev-20261026-006 |
| F-007 | 验收"差异可解释"缺量化方法；"空渠道"分母未定义（`channel_id` 为空 vs `dim` 未命中） | warning（无数据证据） | 需求文档 + gap |

### 13.5 A4 · 基线 / 对账

| metric | 旧 | 新 | delta | 状态 / 卡点 |
|---|---|---|---|---|
| order_cnt | 下单口径 `count(*)` | 支付口径 `count(distinct order_id)` + status 过滤 | **null（不编）** | blocked：G-STATUS / G-DUPKEY |
| gmv | 下单口径 `sum(amount)` | 支付口径 `sum(amount)` + status 过滤 | null | blocked：退款是否扣减未定 |
| 差异拆解 | — | 状态/退款、重复计数、跨日支付、维表未命中、过滤条件 | 未量化 | 每项对应 gap |

结论：可以把对账方法（三层 + 原因拆解）交付给 3b，但**不能交付差异数字**；这本身是有效结论，不是"分析失败"。

### 13.6 A5 · 候选来源比较

| 维度 | C1 `dwd.orders` + status + 订单日归属 | C2 支付流水（支付日） | C3 补 `pay_time` 后按支付日 |
|---|---|---|---|
| 数据可得性 | 部分：表可用、权限有，枚举缺 | 阻断：DataMap 无物理资产 | 待验证：需上游/支付组改造 |
| 口径准确度 | 部分：跨日支付记下单日 | 高：支付日 | 高：支付日 |
| 粒度匹配 | 好：订单事实 → 渠道×日 | 好 | 好 |
| 成本 | 低：单分区 1.2GB / 3.4s | 待接入 | 高：改造 + 回刷 |
| 下游兼容 | 3 个下游，契约未登记 | 同左 | 同左 |
| 结论 | **推荐（有条件）** | 阻断，不可选 | 备选，交 3b |

推荐 C1 的前提：G-STATUS、G-DUPKEY 关闭；若需求方接受"订单日归属"的风险，G-PAYTIME 可降 warning（需书面回执）。C2 的缺口是 `G-PAYTIME` 的证据：不是"支付流水不存在"，而是"DataMap 未登记、当前不可得"——要 owner 确认。

### 13.7 A6 · 可行性

| 项 | 结论 | 证据 |
|---|---|---|
| 数据量/成本 | ok：2,000,000 行/天、1.2 GB、3.4s | ev-20261026-003 / 004 |
| 时效 | ok：dws 03:12 更新、05:00 SLA、余量约 1h48m | ev-20261026-006 + design |
| 权限/环境 | ok：只读 `prod-ro` 可查全链路 | 各 evidence 的 env |
| 依赖 | risk：上游延迟无告警数据；维表更新为全量 | ev-20261026-009 |
| 下游兼容 | blocked：`ads` 0 字段，`api/rpt` 无字段登记，读法未知 | ev-20261026-005 / G-COLUMNS |

### 13.8 A7 · 数据侧备选

| 备选 | 数据侧影响 | tradeoff | 决策人 |
|---|---|---|---|
| C1 + 订单日归属 + 口径说明 | 日间差异不可对账、累计可对齐 | 成本低，支付日语义不成立 | 3b |
| 接支付流水（C2）后按支付日 | 口径最准，需要接入与回刷 | 工期/依赖高 | 需求方 + 3b |
| 新表并行双跑（C1 数据） | 可灰度对比，切换安全 | 维护两份逻辑，下游要改指向 | 3b |

3a 只给数据侧成本/影响；"改 dws / 只改 ads / 新表"这类业务层级选择留给 3b（`G-LAYER` 作为 warning 交接，附影响数据：改 dws 影响 3 个、改 ads 影响 0 个）。

### 13.9 A8 · 结论与 gaps

**结论（有条件可行）**：现有资产只能支撑"订单日归属的支付口径"；差异量化被 status 枚举与订单号重复卡住，尚不能给出可对账数字。推荐 C1 作为当前唯一可立即推进的数据路径；C2 是目标口径方向（待接入支付流水），C3 是备选，均交 3b 决策。

| gap | severity | owner | 下一步 |
|---|---|---|---|
| G-PAYTIME | blocking | 交易组 | 接支付流水补 `pay_time`，或需求方书面接受 dt 归属 |
| G-STATUS | blocking | 交易组 | 给枚举、含义、近 7 天分布；确认退款是否扣 gmv |
| G-DUPKEY | blocking | 交易组 | 确认重复成因，定 `order_cnt` 去重口径 |
| G-COLUMNS | warning | 报表组/数据服务组 | 补三张下游字段与读法，再定替换/新增列 |
| G-LAYER | warning | 需求方 | 回执认可 dws 归属（附影响 3 vs 0） |
| G-EMPTY-CHANNEL | warning | 需求方 + 交易组 | 明确"空渠道"分母，再定阈值 |
| G-ACCEPT | warning | 需求方 | 把"差异可解释"落成对账方法与接受准则 |
| G-BACKFILL | warning | 交易组 + 报表组 | 确认回刷窗口 |

### 13.10 产出

`deliverables/scheme/analysis.yaml`（key 片段）：

```yaml
kind: analysis
stage: scheme
substage: analysis
status: blocked
question: 支付口径能否用现有资产算出来、差异能否对账、候选哪个更合适
conclusion: 有条件可行——只能订单日归属；差异暂不可量化（G-STATUS / G-DUPKEY）
recommendation:
  candidate: C1
  preconditions: ["G-STATUS 关闭", "G-DUPKEY 关闭"]
  rejected:
    - candidate: C2
      reason: DataMap 支付事实无物理资产，当前不可得
review:
  ba: reviewed
  requester: advisory_pending
  se: deferred
handoff:
  status: blocked
  to: 3b
  blockedBy: [G-PAYTIME, G-STATUS, G-DUPKEY]
```

### 13.11 门禁判定

- 候选已比较：✓（C1/C2/C3）；
- 结论有证据：部分（F-001/002/003/004/005/006 有 evidence；F-007 无数据证据 → gap）；
- 基线：blocked，不是"无差异"；
- DataMap 路径：✓（含"支付事实无物理资产"这一跳）；
- 独立血缘/画像：✓；
- blocking gap：3 个（G-PAYTIME / G-STATUS / G-DUPKEY）→ **不能 pass**；
- BA 已复核分析结论与阻塞原因，但按门禁**不签收**（`review.ba=reviewed`，非 `signed`）。

→ 出口 `blocked`，`handoff.status=blocked`，不进 3b。

### 13.12 交接给 3b

- 已可交接的内容：DataMap 路径、候选比较矩阵、影响面（3 个下游 + 类型 + owner）、可行性、数据侧备选、完整 gaps；
- 不可定的内容：差异数字、层级选择（G-LAYER）、验收阈值（G-ACCEPT）；
- 启动条件：G-PAYTIME 有结论（接流水或书面接受 dt 归属）+ G-STATUS/G-DUPKEY 关闭，BA 补签后 `handoff.status=ready`；
- 3b 此时最多做预备讨论，不能定稿 `solution.yaml`。

### 13.13 如果 gap 关闭（正向路径）

1. 交易组给 `status` 枚举/分布与重复成因 → 新增 evidence，G-STATUS/G-DUPKEY 关闭；
2. 需求方书面接受"订单日归属"或决定接支付流水 → G-PAYTIME 按 10.4 降级/关闭，记 decision；
3. 补一条对账 evidence（三层 + 原因拆解）→ baseline 从 blocked 变 measured；
4. BA 签收 → `status=approved`、`substage=solution`、`handoff.status=ready`；
5. 3b 基于候选比较与影响数据做业务选择（改 dws / 只改 ads / 新表并行），并签收 `solution.yaml`。

### 13.14 与历史 mock 记录的差异

- 历史 `deliverables/analysis.yaml` 把 `G-PAYTIME` 记为 warning、并在 G-STATUS/G-DUPKEY 仍 blocking 时推进到 3b/3c（`scheme.status=done, substage=tech_plan`）。按本设计，这属于"用假设推进"，应判 `blocked`；
- 本设计不追溯改写历史文件；新流程以本门禁为准，历史记录作为反例保留；
- 早期设计稿 mock 的 `dwd.orders 2.1M / dim.channel 1.2K` 是示意值，案例以 evidence 的 `2,000,000 / 12,000` 为准。

## 14. 待确认点

| # | 待确认 | 建议 | 影响 |
|---|---|---|---|
| TBC-1 | `scheme.analysis` 的 substage/签收 gate 要不要落进 workitem 状态机？当前 approvals 按 gate 记录（requirement/design/release 等），还没有子阶段 gate 约定 | 新增 `gate=scheme.analysis`，`substage` 用 `analysis → solution → tech_plan` | 门禁记录与 3b 启动条件 |
| TBC-2 | 3b 能否直接推翻 3a 推荐？谁批准？ | 允许覆盖，但必须在 `solution.yaml` 写理由；涉及风险接受时需求方回执 | 3a/3b 边界 |
| TBC-3 | DataMap adapter 与 trace 契约：当前数据事实工具只有 `read_table` / `read_profile` / `read_lineage`，寻源路径与 assetType 由谁提供？是否新增工具？ | 先复用只读工具 + 人工路径，新增工具走 ADR/蓝图并确认工具数 | AnalysisCard 的 DataMap 分区能否真实渲染 |
| TBC-4 | blocking gap 降级权限与证据时效：谁有权降级？as_of 多久重跑？口径类需求的需求方是否从 advisory 升 hard？ | 降级需匹配角色的书面回执；证据默认 7 天或 schemaVersion 变化重跑；口径类升级需求方硬签收 | 门禁强度与流程成本 |
