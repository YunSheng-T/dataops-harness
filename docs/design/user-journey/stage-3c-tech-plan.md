# Stage 3c 技术方案：详细设计

> 状态：设计稿 v0，待评审
> 日期：2026-10-27
> 视觉稿：[TechPlanCard + 设计血缘](../../../prototype/tech-plan-lineage.html) · [截图](../../../prototype/shots/tech-plan-lineage.png)
> 阶段：Stage 3 方案 / 3c 技术方案
> Owner：SE
> 关联：[用户旅程 v0](user-journey.md) · [Stage 2 设计](stage-2-design.md) · [DesignCard + DataMap](design-card-datamap.md) · [Stage 3 边界](stage-3-scheme.md) · [3a 分析](stage-3a-analysis.md) · [3b 需求方案](stage-3b-solution.md) · [遗留事项](../../backlog.md) · [案例工作项](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml)
> 呈现：TechPlanCard，信息架构见 §7。独立视觉稿/全量蓝图按 AGENTS.md「重大变更」流程在实现前补，不在本文范围。

## 1. 定位

### 1.1 3c 回答什么

一句话：

> **把 3b 已经选定的方案，翻译成一条可执行、可验收、可回滚的落地路径。**

3c 必须回答六个问题：

1. 这件事分几步做？每步谁做、在哪个平台做？
2. 平台和组件是否具备能力，权限、配额、版本是否满足？
3. 依赖是什么？能不能按时就绪？关键路径是哪条？
4. 什么时间产出？SLA 余量够不够？失败怎么告警和重试？
5. 要多少人日？风险是什么？怎么缓解、怎么兜底？
6. 上线后怎么回滚？回滚点、窗口、验证、责任人是谁？

### 1.2 3c 不是什么

- 不是重新做 3a 分析：数据分布、基线、候选比较已经由 3a 给出；3c 只消费，不重跑。
- 不是重新选 3b 方案：业务方案、口径归属、取舍已经由 3b 签收；3c 只做技术落地。
- 不是写 SQL/DDL：最终 SQL 属于 develop。
- 不是产最终调度 YAML：3c 只给调度约束；schedule-spec / YAML 在 develop、CICD 生成并 compile 校验。
- 不是编码、测试、发布：这些是 develop / CICD。
- 不是发布审批：生产发布准入是外部系统，见 [OPEN-002](../../backlog.md)；3c 签收不能当发布审批。

### 1.3 与 3b、design、develop 的边界

| 事项 | 设计（Stage 2） | 3b 需求方案 | 3c 技术方案 | develop |
|---|---|---|---|---|
| 目标表 / 粒度 / 主键 / 分区 | 定 | 不改 | 只校验能否承载任务 | 按设计实现 |
| 业务口径 / 方案选择 / 取舍 | 不选 | **定并签收** | 不重开；发现冲突退回 3b | 不重开 |
| 任务拆解 | 不做 | 不做 | **做** | 按任务开发 |
| 平台 / 组件 / operator | 不选 | 不选 | **定类别与能力要求** | 定版本/参数/队列 |
| 依赖 / SLA / 调度约束 | 给草案 | 给业务约束 | **给技术约束与依赖** | 落 schedule-spec |
| 工时 / 风险 / 回滚 | 不估 | 业务风险 | **估时、风险表、回滚方案** | 执行、补运行证据 |
| SQL / DDL | 不写 | 不写 | 不写 | **写** |
| 最终调度 YAML | 不产 | 不产 | 不产 | 产 spec，CICD compile |
| 签收 | BA（SE 可行性） | BA（需求方 advisory） | **SE 签收 + Dev 可落地确认** | SE 代码评审 |

与 3a 的边界：3a 给可行性证据（量级、时效、权限、候选比较），3c 不重跑；发现分析不成立就回 3a，不在 3c 里换结论。

### 1.4 成功标准

3c 完成时，一个没参加讨论的 Dev 应该能只读 `tech-plan.yaml` 回答：

- 先做什么、后做什么、卡在哪；
- 每个任务在哪个平台、归谁、怎么算验收通过；
- 上游什么时候就绪、05:00 前能不能产出、破线谁处理；
- 最坏情况怎么退回旧口径，多久能回、怎么验证；
- 哪些缺口还没关闭、谁在什么时候关。

答不上来，就不是一份可交接的技术方案。

## 2. 主角色与门禁摘要

| 角色 | 3c 职责 | 签收 / 评审 |
|---|---|---|
| SE | 3c owner；产任务拆解、平台、依赖、SLA、工时、风险、回滚 | **签收技术方案**（hard） |
| Dev / 数据开发 | 确认任务、依赖、平台、回滚是否可落地 | **可落地确认**（approved / deferred / rejected） |
| BA | 提供 design / analysis / solution 上下文；口径或业务决策要变时回 3b | 不签 3c；必要时 advisory |
| 需求方 | 验收标准与产出时点的来源 | 不直接签 3c；验收阈值变化回 3b / requirement |
| 数据平台 / 报表组 / 数据服务组 | 平台能力、调度、下游契约的依赖 owner | 提供确认或回执，不签 3c |
| Agent | 查证据、产草案、标 gaps、生成卡片与交接包 | **不签收、不代替判断、不推进 stage** |

同一阶段同一时间只允许一个写者：SE Agent 写 `tech-plan.yaml`，Dev 只读确认，分析/方案产物不被并发改写。

门禁形态：

- 3c 是**工作项内容门禁**，不是 DSH 原生审批；发布审批仍走外部系统。
- SE 签收是硬门禁；未签收不能进 develop。
- Dev 可落地确认在 v1 允许 `deferred`，但只能用于跨人协同事项，不能用于技术条件（见 §8.2）。
- 跨人通知、回执、EDevOps 状态回写后置，见 [OPEN-001](../../backlog.md)；可以标记 `deferred`，但必须写进 handoff，不能静默跳过。

## 3. 入口与输入

### 3.1 入口条件

进入 3c 前必须同时满足：

- 3b 已 pass：`solution.yaml` 已签收，需求方 advisory 记录已落盘；
- `design.yaml`、`analysis.yaml`、`solution.yaml` 均存在，且有 `asOf` 与证据引用；
- 3c 要用的 target / grain / primaryKey / partition / sources / metrics 与 design 一致；
- 没有未处置的 `solution-blocking` gap；`execution-blocking` 必须有承接方案（§3.4）；
- workitem `stage=scheme`，建议 `substage=tech_plan`；workitem 协议暂未采用 substage 时，以“三份交付物齐全 + 3b 已签收”判断。

任一输入在 3c 期间发生变化，旧的 tech-plan 立即标记 `stale`，重新校验后再签，不沿用旧结论。

### 3.2 输入清单

| 输入 | 来源 | 3c 消费什么 | 缺了怎么办 |
|---|---|---|---|
| `design.yaml` | 设计阶段 | target / grain / primaryKey / partition / lifecycle / sources / join / filter / metrics / 时间语义 / 影响面 / schedule 草案 | 缺关键字段 → 回设计，不自行补 |
| `analysis.yaml` | 3a | findings、baseline、候选比较、conclusion、gaps、evidence | 缺结论 → 回 3a；3c 不重跑分析 |
| `solution.yaml` | 3b | scope、decisions、alternatives、risks、rollback 基线、gaps | 缺方案或未签收 → 不进 3c |
| requirement / acceptance | Stage 1 | 产出时点、验收标准 → 任务验收断言 | 验收不可验证 → 回 requirement / 3b 澄清 |
| 影响面 + 独立血缘 | 独立血缘系统 | 上下游资产、任务依赖、消费方 owner | 查不到 → gap，不能写“无影响” |
| 运行约束 | 调度平台 / 运行元数据系统 | 上游就绪时间、运行窗口、重试、超时、配额、权限、环境 | 拿不到 → gap + 风险，不能凭经验填 |
| 平台能力目录 | 平台目录 / 平台 owner | 平台、组件、operator、版本、权限、配额 | 不可用 → gap；不得编造平台能力 |
| 证据 `evidence/ev-*.yaml` | 工作项 | 查询、时间范围、env、结果摘要、as_of | 缺证据 → 该结论标“待确认”，进 gaps |
| 工时依据 | 历史估算 / 团队容量 | 估时、假设、置信度 | 无依据 → 标低置信 + gap，不写精确承诺 |

### 3.3 3c 只做定向核验，不重做分析

3c 允许做的核验只有四类：

1. 平台能力：任务需要的组件、operator、权限、配额是否存在；
2. 运行约束：上游就绪时间、运行窗口、重试、超时、告警是否可配置；
3. 依赖可满足性：数据、任务、跨团队、契约依赖能否在时点前就绪；
4. 下游契约：字段、读法、列顺序、通知对象是否清楚。

3c **不重跑**分布、枚举、基线、候选比较。3a 已有的画像/基线结论直接引用 evidence；如果 3c 发现 3a 结论不成立，或需要新的数据结论，退回 3a，不在 3c 里悄悄改。

### 3.4 gaps 承接规则

沿用 3b 的分级：`solution-blocking` / `execution-blocking` / `warning` / `info`。3c 入口要求 `solution-blocking=0`；`execution-blocking` 和带 `mustCloseBefore` 的 warning 由 3c 承接，转成任务或风险，`mustCloseBefore` 到期未关则不能 pass（或必须停在 develop 前）。

3c 不能把上游 gap 丢掉，也不能把 gap 改写成“已知风险”就算处理。处置只有四种：

| gap 状态 | 3c 处置 | 落地方式 |
|---|---|---|
| 有证据可以关闭 | 关闭 | 补 evidence；payload 中标 `closed` |
| 无法关闭，但能在 develop / 上线前由明确任务消除 | 转成**前置条件任务** | 任务有 owner、完成时点、验收断言；写进 handoff 强制项 |
| 依赖不可满足 / 平台缺失 / 回滚不可执行 | **不 pass** | 3c 标 `blocked`，回 3b / 设计 / 平台 owner |
| 与验收冲突（如阈值、口径） | **不 pass** | 回 3b 或需求方重定，不能在 3c 单方面放宽 |

补充规则：

- 3a / 3b 的假设（如“口径改在 dws”）必须在 3c 显式引用；假设变化，tech-plan 重评。
- blocking gap 即使转成前置条件任务，也必须在 handoff 和 TechPlanCard 上保持 blocking 可见，不能降级成普通风险。
- warning gap 可以带条件 pass，但要有 owner、时点和关闭动作。
- mock 证据必须带 `source=mock` / `asOf`，不能当成生产事实。

## 4. 详细活动

### 4.1 任务拆解

原则：

- **一任务一平台一 owner**；跨平台就拆开，不把“建模 + ETL + 调度 + 通知”塞进一个任务。
- 粒度是**可独立验收、可独立排期、可映射到一个执行单元**，不是按 SQL 语句或代码行拆。
- 每个任务必须有：`id`、平台、owner、依赖、输入、输出、验收断言、完成时点。
- **前置探查任务优先**：blocking gap 不能静默带进 develop；能探查就先探查，探查结论回执后才允许主任务开工。
- 对账、下游契约、回滚准备、调度配置都必须成为显式任务；不能默认“开发会顺手做”。
- 任务描述写“做什么 / 验收什么”，不写 SQL、不写最终 YAML。

任务类型：

| 类型 | 用途 | 典型平台 | 产出 |
|---|---|---|---|
| `probe` 探查 | 关闭 blocking gap，确认枚举、重复、覆盖率 | 查询/画像 | 结论 + evidence |
| `model` 建模 | 新建表、加字段、改分区（若需要） | 建模平台 | 模型变更说明 |
| `etl` 加工 | 过滤、关联、聚合、写入目标分区 | ETL 平台 | 可运行任务 + 断言 |
| `reconcile` 对账 | 新旧口径、上游/下游一致性 | 对账 SQL / 质量平台 | 差异率与原因分类 |
| `schedule` 调度 | 依赖、cron、重试、告警、回刷 | 调度平台 | 调度约束 / spec 输入 |
| `contract` 下游契约 | 字段、读法、列顺序、通知 | 报表 / API 平台 | 契约 diff + 回执 |
| `rollback` 回滚 | 快照、旧 SQL、演练 | 变更 / 备份 | 回滚材料 + 演练记录 |
| `release-prep` 发布材料 | 变更单要素、发布参考报告 | 变更系统 | 发布参考（不替代审批） |

任务模板：

```yaml
- id: T2
  name: dws.trade_channel_daily 支付口径改写
  type: etl
  platform: etl
  owner: 交易组
  dependsOn: [T1]
  inputs: [dwd.orders@dt-1, dim.channel]
  outputs: [dws.trade_channel_daily@dt]
  partition: dt=${bizdate-1}
  acceptance: 静态分区覆盖幂等；渠道数 >= 15；sum(order_cnt) > 0
  closesGaps: [G-STATUS, G-DUPKEY]
  sla: 05:00 前产出
```

`id` 稳定、供依赖引用；卡片展示 `name`。当前 mock `tech-plan.yaml` 用任务名做依赖，兼容期允许，但目标契约按 `id`。

### 4.2 平台与组件

| 平台类别 | 3c 要确认什么 | 证据来源 | 不可用时 |
|---|---|---|---|
| 查询 / 探查 | 只读权限、可查分区范围、返回上限 | 平台目录 / 账号权限 | gap；探查任务不能开工 |
| ETL / 加工 | 组件、方言、静态分区覆盖、并发/队列 | 平台目录 / owner | gap；主任务不能排期 |
| 调度 | cron 窗口、依赖配置、重试、超时、告警 | 调度平台 / 运行元数据 | gap；SLA 不能承诺 |
| 建模 | 建表/改字段申请流程、审批耗时 | 建模平台 | 需要时回设计评估 |
| 对账 / 质量 | 对账 SQL 运行环境、阈值、告警 | 质量平台 | gap；风险升高 |
| 变更 / CICD | 发布参考、变更单、回滚审批 | 变更/发布系统 | 后置不阻断 3c，但写 handoff |
| 下游报表 / API | 字段读法、契约 diff、通知对象 | 报表组 / 数据服务组 | gap（如 G-COLUMNS） |

原则：

- **优先现有平台**；引入新平台需回 3b / 设计评估成本、权限、迁移，不在 3c 私自决定。
- 3c 定平台类别、组件、能力要求；**版本、operator 参数、队列、并发在 develop / CICD 定**，3c 不编造。
- 平台能力必须有目录、接口或 owner 确认；没有证据就进 gap，不写“应该可以”。
- 一个任务只能挂一个主平台；需要跨平台时拆任务并写依赖。

### 4.3 依赖

| 依赖类型 | 例子 | 事实来源 | 3c 判定 |
|---|---|---|---|
| `data` 数据依赖 | 上游 dws 层 03:12 完成；`dwd.orders` 分区就绪待确认 | 运行约束系统 + 独立血缘 | 就绪时间、分区、是否跨天 |
| `task` 任务依赖 | T1 探查结论回执后才能 T2 | 本方案任务图 | DAG 无环、前置可验收 |
| `platform` 平台依赖 | ETL 队列配额、调度窗口 | 平台目录 / owner | 能力、权限、配额是否满足 |
| `contract` 契约依赖 | 下游字段与读取方式 | 独立血缘 + 下游 owner | 字段登记、diff、通知 |
| `people` 跨团队依赖 | 报表组回执、数据平台排期 | 工作项 / 协同记录 | 有 owner、时点、回执 |
| `approval` 审批依赖 | 生产发布、生产回滚 | 外部审批系统 | 不属于 3c 内容门禁；写 handoff |

规则：

- 每个依赖必须写 `from` / `to` / `type` / 就绪时点或条件 / 来源 / owner；查不到来源就进 gap。
- 任务图必须无环；标出关键路径。关键路径上的任务延迟会直接破 SLA。
- 依赖不可满足或就绪时间未知 → 不 pass，或 gap + 条件 + 风险，由 SE 决策。
- 跨团队依赖可以 `deferred`，但必须写进 handoff 和卡片；`deferred` 不等于“可以不做”。
- 外部发布审批不算 3c 内部依赖，但回滚、发布材料任务要引用它，避免把内容签收当成发布审批。

### 4.4 SLA 与调度约束

| 项 | 3c 要给定什么 | 来源 |
|---|---|---|
| 产出时点 | 目标分区最晚何时可读 | requirement / design |
| 上游就绪 | 上游任务/分区最晚何时完成 | 运行约束系统 |
| 运行窗口 | 最早起跑、cron 窗口、时区 | design 草案 + 调度平台 |
| 重试 / 超时 | 重试次数、单次超时、失败告警 | 平台能力 + owner |
| 回刷 / 补数 | 窗口、幂等、历史分区是否重写 | design + 3b 回滚基线 |
| 并发 / 资源 | 队列、并发度、资源上限 | 平台目录 |

SLA 余量判断：

```text
可用窗口 = 产出 SLA − 上游就绪时间
要求：可用窗口 ≥ 单次运行时长 × (1 + 重试次数) + 告警响应时间
```

如果拿不到单次运行时长，必须记 gap + 风险，由 SE 决定是否接受；不能默认“跑得完”。

边界：

- 3c **只给调度约束**：cron 窗口、依赖、重试、超时、告警、回刷、幂等、分区宏。
- **不产最终调度 YAML**。develop 生成归一化 schedule-spec，CICD 调 `dataops compile` 编译校验；3c 不调 compile、不把 mock 编译产物说成可部署。
- SLA 不能由 3c 单方面放宽或收紧；要改产出时点，回 requirement / 3b。
- 回刷/重跑必须幂等；做不到幂等，就要有快照/备份与人工恢复方案。

### 4.5 工时

- 单位：**人日**。按工作包或任务估，不写日期承诺；排期由 develop / 项目管理按人力决定。
- 估时必须包含：前置探查、对账、下游通知、回滚演练、调度配置，不能只算写 SQL 的时间。
- 估时依据：同类任务历史、平台能力、已有模板；没有历史就标“低置信 + gap”。
- 置信度分高/中/低；低置信必须写假设和追加条件（例如“接支付流水追加 3 人日”）。
- 变更触发重估：新增前置任务、平台变化、依赖不可满足、范围变化、验收阈值变化。
- 超阈值（建议：超过原估算 50%，或关键路径变化）→ 回 3b / 设计重排，不静默加班或砍验收。

### 4.6 风险

每条风险至少包含：

```yaml
- id: R1
  category: 数据口径
  description: status 枚举与假设不符，产出 0 行或漏计
  trigger: 枚举分布与假设不一致；产出行数为 0
  likelihood: medium
  impact: high
  mitigation: T1 前置探查 + 产出断言（渠道数 >= 15、sum(order_cnt) > 0）
  contingency: 暂停上线，回 3b 重定过滤条件
  owner: 交易组
  related: [T1, T2]
```

风险类别：数据口径、数据可用性、时间语义、上游/SLA、下游契约、平台/权限、回滚、协同/审批。

规则：

- 每个 blocking gap 至少映射到一个任务或一条风险；不能只写“已记录”。
- 风险必须有缓解措施和 owner；不能缓解的要有兜底方案和接受人。
- “注意一下”“加强监控”不是缓解措施；要写具体动作、信号和责任人。
- 风险不能替代任务：能在 develop 前执行的动作，应该成为任务，而不是留在风险表里。

### 4.7 回滚

回滚不是一句“恢复旧口径”，必须可执行：

| 要素 | 要求 |
|---|---|
| 回滚点 | 切换前最后一天分区快照、旧表/旧分区、旧版本 |
| 回滚材料 | 旧口径 SQL、旧调度配置、快照位置、操作命令/步骤 |
| 回滚步骤 | 停调度 → 恢复旧逻辑 → 重跑切换窗口 → 验证 → 恢复调度 |
| 回滚窗口 | 多久内必须回完；超窗怎么办 |
| 幂等 | 重跑是否覆盖同一分区、是否可重复执行 |
| 验证 | 行数、金额、逐渠道差异率、下游可读性 |
| 触发条件 / 决策人 | 什么信号触发、谁拍板、谁执行 |
| 审批 | 生产回滚走外部发布审批（[OPEN-002](../../backlog.md)）；3c 只设计，不执行 |

规则：

- 默认不原地改历史分区；只对切换日起的 dt 生效，历史快照保留。
- 回滚窗口与回刷窗口要对齐；超窗要有快照恢复方案。
- 回滚演练至少做 dry-run 或 dev/mock 演练；没有演练就标 gap / 风险。
- 回滚本身也要有告警和时限；不能等发现数据错才临时找旧 SQL。

### 4.8 评审清单

| ID | 检查项 | 通过标准 | 证据 |
|---|---|---|---|
| C1 | 输入一致 | target / grain / primaryKey / partition / sources / metrics 与 design 一致；scope 与 solution 一致 | design / solution 引用 |
| C2 | 任务完整 | 每个任务有 id、platform、owner、dependsOn、inputs、outputs、acceptance、sla | tech-plan payload |
| C3 | DAG 合法 | 无环；关键路径标出；每个依赖有来源和就绪时间/条件 | 依赖表 + 运行约束 |
| C4 | 平台可落地 | 平台/组件/权限/配额有确认，或有 gap / handoff 首日确认动作；版本/operator 未编造 | 平台目录 / owner 回执 |
| C5 | SLA 有余量 | 产出时点、上游就绪、窗口、重试、告警齐全；余量计算有依据 | 运行约束 / 任务运行时长 |
| C6 | 调度约束齐全 | cron、时区、分区宏、并发、超时、回刷、幂等都有口径；不含最终 YAML | design + 平台能力 |
| C7 | 风险闭环 | 风险有触发、影响、缓解、owner、兜底；blocking gap 有映射 | 风险表 |
| C8 | 回滚可执行 | 回滚点/材料/步骤/窗口/幂等/验证/触发人齐全；生产回滚走外部审批 | 回滚方案 + 演练记录 |
| C9 | 下游契约 | 下游清单来自独立血缘；字段/读法/通知有任务或 gap；无证据不写“无影响” | 独立血缘 + 下游回执 |
| C10 | 工时与门禁记录 | 估时有依据、假设、置信；前置/对账/通知/演练计入；签收与 deferred 已记录 | 估算 + approvals |

清单状态：`pass` / `warn` / `fail`。`fail` 不能 pass；`warn` 必须转成 gap、风险、前置条件任务或 handoff 首日动作，并写进 handoff。

### 4.9 3c 不产什么

- 不产最终 SQL / DDL / 代码；
- 不产最终 schedule-spec / 调度 YAML；
- 不执行任务、不触发调度、不发布；
- 不替代发布审批、回滚审批、代码评审；
- 不重做 3a 分析、不重开 3b 方案；
- 不在没有证据时写平台能力、SLA、工时、风险结论。

## 5. 证据与依赖

### 5.1 信息源分工

| 信息 | 唯一来源 | 3c 用途 | 不能做什么 |
|---|---|---|---|
| 资产元数据：名称、`assetType`、platform、layer、owner、rowCount、fields | DataMap | 确认任务输入/输出资产、平台/层、owner | 不能拿 DataMap 当血缘或运行约束 |
| 上下游与任务依赖 | 独立血缘系统 | 影响面、依赖、消费方 owner | 不能凭 DataMap 路径推断下游 |
| 运行约束：上游就绪、运行窗口、重试、配额、权限 | 调度平台 / 运行元数据 | SLA 计算、依赖就绪、风险 | 不能凭经验填时间 |
| 质量 / 画像：枚举、重复、覆盖率、分布 | 独立查询/画像 | 复用 3a evidence，做定向核验 | 不重跑完整分析；不替代运行约束 |
| 平台能力：组件、operator、版本、配额 | 平台目录 / 平台 owner | 平台选型、任务可落地 | 不能编造平台/版本 |
| 工时依据 | 历史估算 / 团队容量 | 估时与置信 | 不能凭感觉精确 |
| 验收 / SLA 目标 | requirement / design | 任务验收断言、产出时点 | 3c 不能单方面改 |

### 5.2 证据链模型

每条可复核的 3c 结论都应能还原成：

```text
claim
→ 来源（DataMap / 独立血缘 / 运行约束 / 平台目录 / 查询）
→ 时间范围 + env + as_of
→ evidence id
→ 落到哪个任务 / 依赖 / SLA / 风险 / 回滚项
```

例：

```yaml
claim: 上游 dws 层任务约 03:12 完成，05:00 前有约 1h48m 窗口；dwd.orders 分区就绪时间待确认
source: 运行约束系统（任务完成时间，近 7 天）
timeRange: 2026-10-20 ~ 2026-10-26
env: prod-ro
asOf: 2026-10-27T09:30:00+08:00
evidence: ev-20261026-006
usedBy: [sla, D1, C5, R5]
```

用户不需要读 YAML，但 TechPlanCard 必须展示：来源、时间范围、env、结果摘要、as_of、evidence 入口。

### 5.3 缺证据怎么处理

- 缺依赖证据：写“依赖待确认”，不能写“无依赖”。
- 缺平台能力：平台 chip 显示“待确认” + gap，不能显示绿色可用。
- 缺运行时长：SLA 余量标“未验证” + 风险；SE 决定是否接受。
- 缺下游字段：只能写“待登记”，不能默认按列名或列位置。
- mock / partial：标 `source=mock`、`partial=true`、`asOf`；不能当生产事实。
- 任何“待确认”都必须进 gaps，并有 owner 和关闭时点；不能只留在卡片文案里。

### 5.4 DataMap 边界与路径示例

DataMap 的职责是**业务语义到物理资产的寻源**：

```text
场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产
```

本案例：

```text
渠道日报支付口径改造
→ 渠道运营 / 交易分析
→ 订单 / 支付 / 渠道
→ 订单事实 / 支付事实 / 渠道维度 / 渠道日报
→ dwd.orders / dim.channel / dws.trade_channel_daily / ads.channel_report
```

注意：其中“支付事实”当前**没有物理资产**，这是 G-PAYTIME 的寻源缺口；不能因为路径画得出来就当成有表。DataMap 只读，缺资产就进 gap。

物理资产统一建模，目标 `dws.trade_channel_daily` 是内部数仓表：

```yaml
physicalAsset:
  id: dws.trade_channel_daily
  name: dws.trade_channel_daily
  assetType: warehouse_table
  platform: hive          # 以 DataMap 实际值为准
  layer: dws
  owner: 交易组
  rowCount: null          # 未取到 → gap
  fields: []
```

原则：

- DataMap 只用于资产元数据；血缘、运行约束、质量分别走独立系统。
- 物理资产只认 `warehouse_table` / `lake_table` 两种 `assetType`；下游 API/报表是影响对象，不硬塞成表资产。
- DataMap 读不到就写 gap，不允许用模型记忆补表名/字段。

## 6. 交付物

### 6.1 路径与兼容

```text
deliverables/scheme/tech-plan.yaml
```

- `kind: tech_plan`，`stage: scheme`；与 `analysis.yaml`、`solution.yaml` 同属方案三件套。
- 新写入按阶段子目录；当前工作项里的 `deliverables/tech-plan.yaml` 是兼容期 flat 路径，读取兼容，不强制一次性迁移。
- 现有 mock `tech-plan.yaml` 字段（`tasks[].platform`、`depends_on`、`sla`、`owner` + `estimate` / `risks` / `rollback` / `gaps`）保持兼容；目标契约在此基础上补齐 `id` / `dependencies` / `platforms` / `review` / `signoffs`。

### 6.2 必填字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `kind` / `stage` / `status` | 是 | `tech_plan` / `scheme` / `draft · reviewed · approved · blocked` |
| `owner` | 是 | SE |
| `basedOn` | 是 | design / analysis / solution 路径 + asOf |
| `target` / `scope` | 是 | 与 design / solution 一致 |
| `platforms` | 是 | 平台/组件/能力要求；不可用为 null + gap |
| `tasks` | 是 | 任务列表；缺任务不能 pass |
| `dependencies` | 是 | 数据/任务/平台/契约/人员依赖；缺依赖不能 pass |
| `sla` | 是 | 产出时点、上游就绪、余量、调度约束；缺 SLA 不能 pass |
| `estimate` | 是 | 人日、分项、假设、置信；缺工时不能 pass |
| `risks` | 是 | 风险表；缺风险或缓解不能 pass |
| `rollback` | 是 | 回滚点/材料/步骤/窗口/验证/owner；缺回滚不能 pass |
| `review` | 是 | 评审清单状态 + SE 签收 + Dev 确认 |
| `gaps` | 是 | 承接的上游 gap + 3c 新 gap；blocking 必须可见 |
| `evidence` | 是 | 证据 id 列表；没有就标空 + gap |
| `asOf` / `next` | 是 | 生成时间与下一步 |

### 6.3 payload 示例

> 示例与 §12 的 US-3821 案例一致；字段为目标契约，mock 样例字段保持兼容。

```yaml
kind: tech_plan
stage: scheme
status: draft                 # draft / reviewed / approved / blocked
owner: SE
basedOn:
  design: deliverables/design/design.yaml
  analysis: deliverables/scheme/analysis.yaml
  solution: deliverables/scheme/solution.yaml
  asOf: 2026-10-27T10:20:00+08:00
target: dws.trade_channel_daily
scope: 口径改在 dws，ads.channel_report 继承；api.channel_metrics / rpt.funnel 只登记影响、不改契约
platforms:
  - { id: probe, name: 查询/画像, component: ad-hoc-query, capability: 只读探查 status 分布与重复订单, evidence: null }
  - { id: etl, name: ETL 平台, component: spark_sql, capability: 静态分区覆盖 + left join + distinct 聚合, evidence: null }
  - { id: schedule, name: 调度平台, component: daily-task, capability: "cron 0 3 * * *；上游依赖；重试 2", evidence: null }
  - { id: reconcile, name: 对账, component: sql-compare, capability: 逐渠道新旧口径差异与原因分类, evidence: null }
  - { id: downstream, name: 下游契约, component: contract-diff, capability: 三张下游表字段与读取方式确认, evidence: null }
  - { id: rollback, name: 变更/回滚, component: snapshot-restore, capability: 切换前快照与旧 SQL 回滚, evidence: null }
tasks:
  - id: T1
    name: status 枚举与重复订单号前置探查
    type: probe
    platform: probe
    owner: 交易组
    dependsOn: []
    acceptance: 枚举/分布/重复成因写入 evidence，关闭 G-STATUS / G-DUPKEY
    closesGaps: [G-STATUS, G-DUPKEY]
    sla: T2 开工前
  - id: T2
    name: dws.trade_channel_daily 支付口径改写
    type: etl
    platform: etl
    owner: 交易组
    dependsOn: [T1]
    inputs: [dwd.orders@dt-1, dim.channel]
    outputs: [dws.trade_channel_daily@dt]
    partition: dt=${bizdate-1}
    acceptance: 静态分区覆盖幂等；渠道数 >= 15；sum(order_cnt) > 0
    sla: 05:00 前产出
  - id: T3
    name: 新旧口径逐渠道对账
    type: reconcile
    platform: reconcile
    owner: 交易组
    dependsOn: [T2]
    acceptance: 输出 order_cnt / gmv 差异率与原因分类；同时给去重/不去重两列
    sla: 与 T2 同批交付
  - id: T4
    name: 调度依赖与回刷窗口
    type: schedule
    platform: schedule
    owner: 数据平台
    dependsOn: [T2]
    acceptance: 03:00 起跑、05:00 前完成、上游延迟告警
    sla: 上线前完成
  - id: T5
    name: 下游字段契约 diff 与通知
    type: contract
    platform: downstream
    owner: 报表组 / 数据服务组
    dependsOn: []
    acceptance: 三张下游表字段与读取方式登记；契约 diff 通过
    closesGaps: [G-COLUMNS]
    sla: 上线前 2 个工作日
  - id: T6
    name: 快照、旧口径 SQL 备份与回滚演练
    type: rollback
    platform: rollback
    owner: 交易组
    dependsOn: [T2]
    acceptance: 快照可恢复；回滚步骤演练通过；窗口 1 天
    sla: 随上线单提交
dependencies:
  - { id: D1, type: data, from: dwd.orders@dt-1, to: T2, readyBy: "03:12（dws 层完成，分区就绪待确认）", source: 运行约束系统, evidence: ev-20261026-006 }
  - { id: D2, type: data, from: dim.channel, to: T2, readyBy: 全量维表, source: 独立血缘 + 运行约束, evidence: ev-20261026-009 }
  - { id: D3, type: contract, from: "ads.channel_report / api.channel_metrics / rpt.funnel", to: T5, state: 字段未登记, gap: G-COLUMNS }
  - { id: D4, type: task, from: T1, to: T2, readyBy: 探查结论回执 }
sla:
  outputBy: "05:00"
  upstreamReadyBy: "03:12"
  upstreamNote: 03:12 为 dws 层任务完成时间；dwd.orders 分区就绪待确认（C5 warn）
  buffer: "1h48m"
  scheduleConstraints:
    cron: "0 3 * * *"
    timezone: Asia/Shanghai
    partition: "dt=${bizdate-1}"
    retries: 2
    timeout: null
    alert: 上游延迟 / 任务超时
    backfill: 待确认（G-BACKFILL）
  note: 3c 只给调度约束；最终调度 YAML 在 develop/CICD 生成并 compile，不在本交付物内
estimate:
  total: 2 人日
  breakdown:
    - { item: "开发（T2）+ 调度（T4）", personDays: 1.0 }
    - { item: "对账（T3）", personDays: 0.5 }
    - { item: "下游通知（T5）+ 回滚演练（T6）", personDays: 0.5 }
  assumptions: [dwd.orders / dim.channel 可读, 现有 ETL 模板可复用, 不新增 pay_time]
  contingency: 接支付流水补 pay_time 追加 3 人日（3b 备选 2，未采用）
  confidence: medium
risks:
  - { id: R1, category: 数据口径, description: status 枚举不符导致 0 行或漏计, mitigation: T1 前置 + 产出断言, owner: 交易组, related: [T1, T2] }
  - { id: R2, category: 数据口径, description: order_id 1% 重复导致 order_cnt 争议, mitigation: T3 同时输出去重/不去重两列, owner: 交易组, related: [T3] }
  - { id: R3, category: 时间语义, description: 跨日支付按订单日归属，日间与支付流水不一致, mitigation: 口径说明 + 月累计对账, owner: 交易组, related: [T2, T3] }
  - { id: R4, category: 下游契约, description: 下游按列位置读，替换列顺序报错, mitigation: T5 补登记字段并做契约 diff, owner: 报表组 / 数据服务组, related: [T5] }
  - { id: R5, category: SLA, description: 上游延迟或运行时长超预期，05:00 破线, mitigation: 依赖告警 + 超时告警 + 重试 2, owner: 数据平台, related: [T4] }
rollback:
  points: [切换前最后一天分区快照]
  materials: [旧口径 SQL, 旧调度配置, 快照位置]
  steps: [停调度, 恢复旧 SQL, 按 dt 重跑切换窗口, 对账验证, 恢复调度]
  window: 1 天
  idempotent: true
  verify: 行数与逐渠道差异率断言
  owner: 交易组
  approval: 生产回滚走外部发布审批（OPEN-002），本方案不执行
review:
  checklist:
    - { id: C1, status: pass }
    - { id: C2, status: pass }
    - { id: C3, status: pass }
    - { id: C4, status: warn }
    - { id: C5, status: warn }
    - { id: C6, status: warn }
    - { id: C7, status: pass }
    - { id: C8, status: pass }
    - { id: C9, status: warn }
    - { id: C10, status: pass }
  se: pending
  dev: pending
gaps:
  - { id: G-STATUS, severity: blocking, blockingFor: execution, owner: 交易组, action: 给出枚举/分布, mustCloseBefore: T2 开工前 }
  - { id: G-DUPKEY, severity: blocking, blockingFor: execution, owner: 交易组, action: 确认重复成因与去重口径, mustCloseBefore: T2 开工前 }
  - { id: G-PAYTIME, severity: warning, owner: 交易组, action: 接受 dt 归属或补支付流水, mustCloseBefore: 随口径说明 }
  - { id: G-LAYER, severity: warning, owner: 交易组, action: 需求方回执认可 dws 归属（3b 假设 A1）, mustCloseBefore: develop 前 }
  - { id: G-COLUMNS, severity: blocking, blockingFor: execution, owner: 报表组 / 数据服务组, action: 补登记字段与读取方式, mustCloseBefore: develop 前 }
  - { id: G-BACKFILL, severity: warning, owner: 交易组 + 报表组, action: 确认回刷窗口, mustCloseBefore: 上线前 }
  - { id: G-ACCEPT, severity: warning, owner: 需求方, action: 确认差异接受准则, mustCloseBefore: 验收前 }
evidence: [ev-20261026-001, ev-20261026-006, ev-20261026-007, ev-20261026-008, ev-20261026-009, ev-20261026-010]
asOf: 2026-10-27T10:20:00+08:00
next: develop
```

> 示例是起草态（`status=draft`，SE / Dev 未签）；签收后更新 `status=approved` 与 `review`，签收记录写 `item.yaml` 的 `approvals[gate=scheme.tech_plan]`，payload 本身不代替签收。

### 6.4 落盘与展示规则

- 先写 `tech-plan.yaml`，再交 presenter；presenter 只做结构校验和分发渲染，不生成/改写内容、不读写 workitem、不访问外部平台。
- payload 必须是无损 JSON：可选字段用 `null` 或省略，不能是 `undefined`；建议上限 256 KB。
- 签收结果由人写回 `item.yaml` 的 `approvals[gate=scheme.tech_plan]`，Agent 只记录，不代替签收。
- TechPlanCard 只是 toolview，不是新页面；不显示工具名。
- 当前 flat 路径的 mock `tech-plan.yaml` 可以继续读；新写入用 `deliverables/scheme/tech-plan.yaml`。

### 6.5 自查

- 每条任务能追到 design / solution 的决策或 gap；
- 每个依赖能追到独立血缘 / 运行约束 / 平台目录；
- 每条 SLA 有时点、余量、重试、告警；
- 每条风险有缓解、owner、兜底；
- 回滚有材料、步骤、窗口、验证、触发人；
- 没有把 blocking gap 降级成“已知风险”；
- 没有 SQL/DDL、调度 YAML、代码；
- 签收、deferred、gaps 都进 payload 和 handoff。

## 7. 呈现：TechPlanCard

### 7.1 原则

- 只展示“怎么落地”，不重复 3a 的分析过程和 3b 的方案论证；需要时给跳转。
- 不展示模型思维链；展示任务、依赖、SLA、风险、回滚和证据入口。
- 任务/依赖/风险/回滚必须能点开看到来源与 as_of。
- 没有证据的字段显示“待确认”，不能显示成绿色通过。
- 3c 不展示最终 SQL / 调度 YAML；给“查看交接包 / 查看交付物”入口。

### 7.2 信息架构

```text
┌──────────────────────────────────────────────────────────────┐
│ 技术方案 · dws.trade_channel_daily 支付口径       待确认 · SE  │
│ 来源 US-3821 · 3a/3b 已签收 · 更新 10:42 · 6 任务 · 2 人日     │
├──────────────────────────────────────────────────────────────┤
│ 方案基线（来自 3b，不重开）                                    │
│ 口径改在 dws，ads 继承；api / rpt 只登记影响、不改契约           │
├──────────────────────────────────────────────────────────────┤
│ 任务与依赖（关键路径 T1→T2→T3 / T4）                 依赖 DAG → │
│ ① 前置探查 status / 重复订单   查询   交易组   前置 · 无依赖    │
│ ② 支付口径改写                 ETL    交易组   依赖① · 05:00 产出│
│ ③ 新旧口径对账                 对账   交易组   依赖②            │
│ ④ 调度依赖 / 回刷              调度   数据平台 依赖②            │
│ ⑤ 下游契约 diff                下游   报表/服务 依赖字段登记     │
│ ⑥ 快照 + 旧 SQL + 回滚演练      回滚   交易组   依赖②            │
├──────────────────────────────────────────────────────────────┤
│ 平台与组件                │ 依赖与 SLA                          │
│ ETL spark_sql · 调度日任务 │ 上游 dws 层 03:12 完成，分区待确认   │
│ 查询 · 对账 · 变更/回滚    │ 03:00 起跑，05:00 前产出，余量 1h48m │
├──────────────────────────────────────────────────────────────┤
│ 风险 5 条                 │ 回滚                                │
│ status 枚举不符 → 0 行    │ 切换前最后一天分区快照               │
│ order_id 1% 重复 → 口径    │ 旧 SQL + 切换窗口内 dt 重跑（1 天）   │
│ 跨日支付 → 日间抖动        │ 验证：差异率 / 行数断言；生产回滚走审批│
├──────────────────────────────────────────────────────────────┤
│ 评审清单 6/10 ✓ · 4 warn · SE 签收 pending · Dev 可落地 pending │
│ 缺口 7（execution-blocking 3） · 证据 6 · DataMap 仅用于资产元数据 │
│ [确认技术方案] [退回调整] [查看交接包] [查看交付物] [查看依赖]   │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 卡片分区

| 分区 | 内容 | 默认 |
|---|---|---|
| 顶部状态 | target、状态（草稿/待确认/已签收/退回/阻塞）、SE owner、来源 US、更新时间、任务数/人日/缺口数 | 是 |
| 方案基线 | 来自 3b 的一句话：口径归属、范围、下游策略；不重复论证 | 是 |
| 任务与依赖 | 任务列表：编号、名称、平台、owner、依赖、SLA、状态；关键路径标注 | 是 |
| 平台与组件 | 平台 chip、组件/能力、可用/待确认；点击看平台能力证据 | 是 |
| 依赖与 SLA | 上游就绪、运行窗口、余量、重试、告警；缺证据显示“未验证” | 是 |
| 工时与风险 | 总人日、分解、置信；Top 风险 + 缓解 + owner | 是（Top 3） |
| 回滚 | 回滚点、材料、窗口、验证、触发人；生产回滚审批提示 | 摘要 |
| 评审与签收 | 清单 pass/warn/fail、SE 签收、Dev 确认、deferred 项 | 是 |
| 缺口与证据 | blocking gap 置顶；gap owner/action/mustCloseBefore；证据 chip | 是 |
| footer | 确认技术方案 / 退回调整 / 查看交接包 / 查看交付物 / 查看依赖 / 查看证据 | 是 |

### 7.4 默认与展开

默认展示：

- 方案基线一句；
- 6 个任务（超过 8 个折叠为“查看全部”）；
- 关键路径和 Top 3 风险；
- SLA 余量、依赖就绪时间；
- 回滚摘要；
- 门禁状态和缺口计数；
- footer 动作。

展开：

- 完整任务列表与每个任务的输入/输出/验收断言；
- 完整依赖 DAG 与每条依赖的来源、as_of；
- 完整风险表（触发、影响、缓解、兜底）；
- 回滚步骤、演练记录、验证 SQL 的说明（不是默认展示 SQL 正文）；
- 评审清单逐项；
- DataMap 资产元数据、独立血缘、运行约束证据详情；
- 完整 payload / 交接包。

不默认展示：

- 完整 YAML；
- 原始 SQL / 查询全文（3c 本来不产 SQL；证据里的查询只在证据详情展开）；
- 平台凭据、内网地址；
- 模型内部推理过程。

### 7.5 状态与空态

| 状态 | 展示 |
|---|---|
| loading | 骨架屏 |
| 3a/3b 未签收 | 阻塞卡：“上游未签收，不能出技术方案”，给跳转 |
| 3a/3b 已变更 | `stale` 徽标：“上游已更新，需重新校验”，禁用签收 |
| 平台能力未确认 | 平台 chip“待确认” + gap，不显示可用 |
| 依赖运行时间未取到 | “依赖待确认”，不显示“无依赖” |
| 部分证据 | `partial` 标识 + gaps；不把 mock 写成生产事实 |
| SE rejected | 退回原因 + 修改入口 |
| Dev rejected | “不可落地”，列出原因与退回目标 |
| Dev deferred | “可落地待协同”徽标；不显示为完全通过 |
| 已签收 | 状态 approved，footer 切到“查看交接包” |
| 已退回 | 退回原因、退回人、时间、重新提交入口 |

### 7.6 交互

- 点击任务 → 任务详情：平台、依赖、输入/输出、验收断言、关联风险与 gap。
- 点击依赖 → 独立血缘 / 运行约束证据侧栏。
- 点击平台 → 平台能力目录与 owner。
- 点击风险 → 缓解、兜底、关联任务。
- 点击回滚 → 回滚材料、步骤、窗口、验证。
- 点击 evidence chip → 查询/时间范围/env/结果摘要/as_of。
- 点击“确认技术方案” → 签收面板（SE 签收 + Dev 可落地确认）；Dev 可标记 deferred，但必须填原因和关闭时点。
- 点击“退回调整” → 必填 comment + 退回目标（3c / 3b / 3a / 设计）。
- 点击“查看交接包” → handoff 摘要，可复制给 develop。
- 卡片不提供“运行任务 / 发布 / 回滚执行”按钮；执行在外部平台。

### 7.7 视觉与技术约束

- 复用现有 DesignCard 的 token、卡片壳、签收面板和证据浮层，不新造一套 UI。
- 卡片是 toolview，不是新页面；宽度变化下任务表可横向滚动，关键字段不丢。
- 实现前按 AGENTS.md「重大变更」流程补 `prototype/<topic>-blueprint.html` 与增量蓝图、截图、明暗检查；本文只定信息架构，不代替蓝图评审。
- 空态/错误态不允许显示假数据；DataMap/血缘/运行约束不可用时显示“待寻源/待确认”。

## 8. 门禁与 Pass

### 8.1 硬门禁

同时满足才能 pass：

1. `tech-plan.yaml` 存在且必填字段完整，presenter 结构校验通过；
2. 任务完整：每个任务有平台、owner、依赖、输入/输出、验收断言、SLA；
3. 依赖合法：DAG 无环，每个依赖有来源和就绪时间/条件；
4. SLA 成立：产出时点、上游就绪、余量计算、重试、告警齐全；无证据的余量必须标风险并由 SE 决策；
5. 平台可落地：平台/组件/权限有确认或 gap；没有编造；
6. 风险闭环：每条风险有缓解、owner、兜底；blocking gap 有任务或阻断结论；
7. 回滚可执行：回滚点、材料、步骤、窗口、验证、触发人齐全；
8. 工时成立：有总人日、分解、假设、置信；
9. 与上游一致：target / grain / partition / sources / metrics / scope 未被悄悄改动；
10. 没有未处置 blocking gap：已关闭、已转前置条件任务并在 handoff 可见，或已明确阻断并退回；三种之外不算处置；
11. SE 签收；Dev 可落地确认为 approved 或 deferred（deferred 必须有标记和关闭时点）。

### 8.2 Dev 可落地确认与 deferred

| 状态 | 含义 | 是否阻断 | handoff 标记 |
|---|---|---|---|
| `approved` | Dev 确认任务、依赖、平台、回滚可落地 | 否 | 无 |
| `deferred` | 跨人协同未完成（Dev 本人未回、下游回执、EDevOps 通知/状态回写、外部排期确认） | 否，但必须标记 | `devConfirmation=deferred` + 原因 + owner + mustCloseBefore |
| `rejected` | 任务不可落地（平台不支持、依赖不可满足、回滚做不到） | **是** | 退回 3c / 3b / 设计 |

边界：

- `deferred` **只适用于协同动作**，不能用于技术条件。
- 以下不能 deferred：任务拆解、平台能力、依赖可满足性、SLA 余量、回滚可执行、风险缓解、blocking gap 处置、字段契约检查。
- deferred 项必须在 TechPlanCard、handoff、workitem 三处可见，并在 release 前关闭；不能静默跳过。
- EDevOps 的状态/评论回写属于后置协同（[OPEN-006](../../backlog.md)）；3c 只记录，不执行。

### 8.3 不能 pass 的情况

- 缺任务，或任务没有平台/owner/验收断言；
- 依赖环、依赖无来源、依赖不可满足；
- SLA 没有产出时点、上游就绪或余量计算；
- 平台能力/版本靠猜；
- 缺回滚方案，或回滚只有一句“恢复旧逻辑”；
- 缺风险表，或风险没有缓解/owner；
- 有 blocking gap 但没有任务、阻断结论或退回；
- target / grain / partition / sources / metrics 与 design 不一致；
- scope 与 solution 不一致，或 3c 私自改方案；
- 上游 3a/3b 未签收，或输入 stale；
- SE 未签收，或 Dev rejected；
- 把 3c 签收当成发布审批。

### 8.4 何时回设计 / 3a / 3b

| 触发 | 退回目标 | 要带什么 |
|---|---|---|
| target / grain / primaryKey / partition / sources 需要变 | 设计 | 具体冲突、影响的任务、需要的设计决策 |
| 口径、候选、数据结论被推翻，或缺少关键分析证据 | 3a | 不成立的结论、缺失证据、需要补的分析问题 |
| 方案选择、范围、取舍、口径归属变化 | 3b | 原决策、变化原因、备选与影响 |
| 验收标准、产出时点变化 | requirement / 需求方 | 原验收、冲突点、建议新阈值 |
| 平台/依赖/回滚不可满足，但方案不变 | 3c 内 blocked | 缺口、owner、需要谁确认 |
| Dev rejected，属实现问题 | 3c 修订 | Dev 原因、需要调整的任务/依赖/平台 |
| Dev rejected，属平台/范围问题 | 3b / 设计 | 不可落地的边界、可选替代 |
| 新需求混入 | requirement | 新范围、为什么不能在本期做 |

原则：

- 退回必须写原因和期望输出，不能只把状态改回。
- 退回后原 tech-plan 保留为历史，不覆盖；重新生成新版本时带 `basedOn` / `asOf`。
- 不静默改设计或方案；发现变化先停，再退回。

### 8.5 签收记录

```yaml
approvals:
  - gate: scheme.tech_plan
    status: approved
    signoffs:
      - role: SE
        approver: <SE>
        at: 2026-10-27T11:20:00+08:00
        mode: hard
      - role: Dev
        approver: <Dev>
        at: 2026-10-27T11:35:00+08:00
        mode: hard            # hard | deferred
    deferred:
      - item: 下游报表组通知 / 回执
        owner: 报表组
        mustCloseBefore: 上线前 2 个工作日
        reason: 跨人协同走 EDevOps（OPEN-001）
    comment: 条件：T1 前置探查完成后才允许 T2 开工
```

规则：

- SE 与 Dev 都齐，且 Dev 不是 `rejected`，才能 `approved`；
- 只有 Dev `deferred` 时，`status=approved` 但必须带 `deferred` 列表；
- 退回时 `status=rejected`，写 comment 和退回目标；
- 跨人通知/邀请走 EDevOps，当前先记录、后置（[OPEN-001](../../backlog.md)）。

### 8.6 Pass 后

```text
stages.scheme.substage = tech_plan
stages.scheme.status = done
stage = develop
next = 开发阶段：建分支、产 change.sql、单测与 SQL 评审
```

同时：

- `item.yaml` 的 `deliverables` 保留方案三件套；`stages.scheme.deliverable` 的单值口径待 3b §11-4 拍板，本稿暂按“最终门禁交付物 = tech-plan”记录，不代表三件套只留一个；
- 写入 `approvals[gate=scheme.tech_plan]`；
- `plan.md` 追加一行：时间 + 3c 通过 + 签收人 + 条件/deferred；
- 生成 handoff；
- TechPlanCard 状态改为 approved；
- 不自动发布、不自动建分支、不自动执行任务。

### 8.7 与发布门禁的区别

- 3c pass = 技术方案内容通过，可以进入 develop；
- 发布审批 = 外部变更/准入系统的事（[OPEN-002](../../backlog.md)）；
- 代码评审、合入、制品发布 = 外部系统/Committer（[OPEN-003](../../backlog.md)）；
- 3c 的回滚方案和发布参考材料只是输入，不替代外部审批。

## 9. 交接给 develop

### 9.1 交接包

```yaml
handoff:
  from: scheme.tech_plan
  to: develop
  deliverable: deliverables/scheme/tech-plan.yaml
  target: dws.trade_channel_daily
  mustNotChange:
    - target / grain / sources
    - 口径归属 dws（3b 决策 D-1）
    - 订单日归属 dt=${bizdate-1}（3b 决策 D-3）
    - order_cnt 去重语义（3b 决策 D-2）
    - 历史边界：不原地改历史（3b 决策 D-5）
    - api / rpt 契约策略：只登记、不改契约
  tasks: [T1, T2, T3, T4, T5, T6]
  scheduleConstraints:
    cron: "0 3 * * *"
    partition: "dt=${bizdate-1}"
    retries: 2
    backfill: 待确认（G-BACKFILL）
  acceptanceAssertions:
    - 渠道数 >= 15
    - sum(order_cnt) > 0
    - 空渠道占比 < 0.1%  # 阈值来源待需求方确认（G-ACCEPT）
  rollbackMaterials:
    - 切换前最后一天分区快照
    - 旧口径 SQL
    - 旧调度配置
  openGaps:
    - { id: G-STATUS, severity: blocking, blockingFor: execution, owner: 交易组, mustCloseBefore: T2 开工前 }
    - { id: G-DUPKEY, severity: blocking, blockingFor: execution, owner: 交易组, mustCloseBefore: T2 开工前 }
    - { id: G-COLUMNS, severity: blocking, blockingFor: execution, owner: 报表组 / 数据服务组, mustCloseBefore: develop 前 }
  warnGaps: [G-PAYTIME, G-LAYER, G-BACKFILL, G-ACCEPT]
  deferred:
    - { item: 下游报表组通知 / 回执, owner: 报表组, mustCloseBefore: 上线前 2 个工作日, reason: 跨人协同（OPEN-001） }
  signoffs:
    se: approved
    dev: approved
  firstSteps:
    - T1 前置探查：status 枚举与重复订单号
    - 确认平台权限 / 队列 / 运行时长
    - 建分支，产 change.sql（支付口径）
    - sql-review 自查 + 断言
    - 对账 SQL + 差异原因分类
    - 产 schedule-spec，交 CICD compile
  asOf: 2026-10-27T11:40:00+08:00
```

### 9.2 交接规则

| 交接项 | develop 怎么用 | 什么情况回 3c |
|---|---|---|
| 任务列表 | 建开发任务、拆分支、排期 | 任务增删、平台变化、依赖变化 |
| 调度约束 | 生成 schedule-spec，交 CICD compile | cron / SLA / 回刷窗口变化 |
| 验收断言 | 写测试、产出断言、对账 | 降低断言、放宽阈值 |
| 回滚材料 | 保留快照/旧 SQL，按步骤演练 | 回滚不可执行或窗口不够 |
| gaps / deferred | 按 owner 和 mustCloseBefore 关闭；不得静默跳过 | 新 blocking gap、deferred 无法关闭 |
| 方案决策 | 实现细节可调整；口径/范围/层级不变 | 口径、范围、层级变化 → 回 3b / 设计 |

### 9.3 回传 3b

3c 完成后至少回传四件事，写进 `plan.md` / handoff：

- 技术方案是否在 3b 约束内（`mustNotChange` 无偏离）；
- `mustCloseBefore` gap 的关闭情况（已关的留 evidence，未关的写 blocking）；
- 新发现的风险 / 依赖，是否需要回 3b；
- 对 `mustNotChange` 的任何偏离（应为空；非空即退回，不允许“技术上顺手改了”）。

### 9.4 develop 的第一天

1. 读 tech-plan 与 design / solution，确认 target / grain / partition 一致；
2. 执行 T1 前置探查，结论落 evidence；
3. 确认平台权限、队列、运行时长；补齐 C4 / C5 的待确认项；
4. 建分支，产 change.sql 草稿；
5. 跑 sql-review 自查（SQL 不在 3c 产）；
6. 对账 SQL 与断言；
7. 产 schedule-spec，CICD compile，按诊断修；
8. 进度写回 `develop.yaml`，blocking 项写 blockers + gap。

## 10. 失败与退回

| 场景 | 判定 | 处理 | 退回 |
|---|---|---|---|
| 3a 结论不成立 / 关键证据缺失 | 技术方案不可信 | 停 3c，补分析 | 3a |
| 3b 范围 / 决策被推翻 | 方案基线变了 | 停 3c，重开方案 | 3b |
| 设计粒度 / 分区无法承载任务 | 设计不成立 | 带冲突点退回 | 设计 |
| 平台能力 / 版本不明确 | 不可落地或不可验证 | 补证据；换平台则评估后回 3b | 3c / 3b |
| 依赖不可满足 / 无就绪时间 | 不能承诺 SLA | 标 blocked；补依赖或换方案 | 3c / 3b |
| SLA 无余量 / 运行时长未知 | 可能破线 | SE 决定接受 + 风险，或回 3b 降范围 | 3c / 3b |
| 回滚不可执行 | 不能上线 | 补快照/旧 SQL/演练；做不到则不 pass | 3c |
| 下游字段 / 契约冲突 | 可能改坏下游 | 转 T5 任务 + gap；上线前必须关闭 | 3c / 3b |
| Dev rejected | 不可落地 | 按原因修订；平台/范围问题回 3b | 3c / 3b |
| 估时超阈值 / 关键路径变化 | 资源或时点不成立 | 回 3b 重排、降范围或加资源 | 3b |
| 输入 stale（design/analysis/solution 变更） | 旧方案失效 | 重新校验并重签 | 3c |
| 新需求混入 | 范围变化 | 停，回需求记录变更 | requirement |
| 外部发布审批拒绝 | 不改变 3c 内容结论 | 记录，按外部流程处理；3c 不代替审批 | —（外部流程） |

原则：

- 失败必须可见：`status=blocked` 或 `rejected`，写原因、owner、下一步；不能静默降级。
- 退回必须保留原版本和证据，不覆盖历史。
- 任何“先上再补”的决定必须由 SE / 需求方明确接受，并写进 handoff；不能由 Agent 决定。

## 11. Agent 边界

Agent 可以做：

- 读 design / analysis / solution / evidence / DataMap / 独立血缘 / 运行约束；
- 做定向可行性核验，标 gaps；
- 产 tech-plan 草案、任务拆解、风险表、回滚方案、交接包；
- 调 presenter 出 TechPlanCard；
- 更新 workitem 的 deliverables / gaps / next（不代替签收）；
- 生成 handoff 摘要。

Agent 不可以：

- 替 SE 签收、替 Dev 做可落地确认；
- 把未签收的 tech-plan 标 `approved` 或推进 stage；
- 写最终 SQL / DDL / 调度 YAML / 代码；
- 编造平台能力、版本、SLA、工时、运行时长；
- 把 blocking gap 降级成“已知风险”或静默跳过；
- 重开 3b 方案或改 design 的 target / grain / partition；
- 执行任务、触发调度、发布、回滚；
- 把 3c 签收当发布审批。

## 12. 案例：US-3821 渠道日报支付口径

> 案例数据是 mock，不代表生产事实；路径和证据以工作项为准。

### 12.1 链路

- US：`US-3821`，渠道日报从下单口径改为支付口径；
- 工作项：[2026-10-26-channel-report-pay-caliber](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml)；
- 链路：需求 → 设计 → 3a → 3b → 3c → develop。

| 阶段 | 产出 | 本案例结论 | 证据 |
|---|---|---|---|
| 2 设计 | `design.yaml` | target `dws.trade_channel_daily`；粒度渠道 × 日期；主键 `dt + channel_id`；分区 `dt=${bizdate-1}`；来源 `dwd.orders ⋈ dim.channel`；cron `0 3 * * *`；SLA 05:00 | ev-001 / ev-009 |
| 3a 分析 | `analysis.yaml` | status 无分布；order_id 约 1% 重复；无 pay_time；下游三表 0 字段；join 覆盖 99.98% | ev-008 / ev-001 / ev-005 / ev-009 |
| 3b 需求方案 | `solution.yaml` | 口径改在 dws；`count(distinct order_id)`；按订单分区 dt 归属；维表 left join；不原地改历史分区 | ev-007 / ev-008 / ev-001 / ev-009 |
| 3c 技术方案 | `tech-plan.yaml` + TechPlanCard | 6 个任务、6 类平台、4 条主依赖、05:00 SLA、2 人日、5 条风险、1 天回滚窗口 | ev-001 / 006 / 007 / 008 / 009 / 010 |

3c 不重跑 3a 的分布/基线，也不重开 3b 的口径决策；只做平台、依赖、SLA、回滚的落地设计。

### 12.2 输入摘要

- design：`target=dws.trade_channel_daily`，`grain=渠道 × 日期`，`primaryKey=dt + channel_id`，`partition=dt=${bizdate-1}`，`sources=dwd.orders + dim.channel`，`cron=0 3 * * *`，`SLA=05:00`；
- analysis：status 分布缺失、order_id 重复、无 pay_time、下游字段未知；支付流水在 DataMap 无物理资产、当前不可得（不是断言不存在），所以本次只能 orders + status 过滤；
- solution：口径改在 dws；去重计数；dt 归属；left join；不原地改历史；备选“只在 ads 改”“补 pay_time”“并行新表”均未采用；
- 影响面：`ads.channel_report` / `rpt.funnel` / `api.channel_metrics` 三个下游；其中 API 与漏斗直接读 dws，所以改 dws 才能保持一致（ev-007）；
- gaps：G-STATUS、G-DUPKEY blocking；G-PAYTIME、G-COLUMNS、G-BACKFILL、G-ACCEPT warning；另有 G-LAYER 假设。

### 12.3 任务拆解

| ID | 任务 | 类型 | 平台 | owner | 依赖 | 完成时点 / 验收 |
|---|---|---|---|---|---|---|
| T1 | status 枚举与重复订单号前置探查 | probe | 查询/画像 | 交易组 | 无 | T2 开工前；枚举/分布/重复成因落 evidence，关闭 G-STATUS / G-DUPKEY |
| T2 | dws.trade_channel_daily 支付口径改写 | etl | ETL | 交易组 | T1 | 05:00 前产出；静态分区幂等；渠道数 >= 15；sum(order_cnt) > 0 |
| T3 | 新旧口径逐渠道对账 | reconcile | 对账 | 交易组 | T2 | 与 T2 同批；差异率 + 原因分类；同时给去重/不去重两列 |
| T4 | 调度依赖与回刷窗口 | schedule | 调度 | 数据平台 | T2 | 03:00 起跑、05:00 前完成、上游延迟告警 |
| T5 | 下游字段契约 diff 与通知 | contract | 下游 | 报表组 / 数据服务组 | 字段登记 | 上线前 2 个工作日；三表字段/读法登记，契约 diff 通过 |
| T6 | 快照、旧口径 SQL 备份与回滚演练 | rollback | 变更/回滚 | 交易组 | T2 | 随上线单；快照可恢复，回滚步骤演练通过，窗口 1 天 |

关键路径：

```text
T1 ──► T2 ──► T3
        ├──► T4
        └──► T6
T5（独立，依赖下游字段登记）

dwd.orders@dt-1（分区就绪待确认） ─┐
dim.channel（全量）               ─┴──► T2
```

### 12.4 平台与依赖

平台：

- 探查：只读查询/画像，确认 status 枚举与 order_id 重复；
- ETL：`spark_sql`，静态分区覆盖 + left join + distinct 聚合；
- 调度：日任务，cron `0 3 * * *`，重试 2，上游延迟告警；
- 对账：逐渠道 order_cnt / gmv 差异；
- 下游：三张表的字段与读取方式确认；
- 回滚：分区快照 + 旧 SQL 备份。

依赖：

| ID | 类型 | 从 | 到 | 就绪 / 状态 | 来源 |
|---|---|---|---|---|---|
| D1 | data | `dwd.orders@dt-1` | T2 | 约 03:12（dws 层）；分区就绪待确认 | 运行约束系统（ev-006） |
| D2 | data | `dim.channel` | T2 | 全量维表 | 独立血缘 + 运行约束 |
| D3 | contract | `ads.channel_report` / `api.channel_metrics` / `rpt.funnel` | T5 | 字段未登记（G-COLUMNS） | 独立血缘 + 下游 owner |
| D4 | task | T1 | T2 | 探查结论回执 | 本方案任务图 |

跨团队/后置项：下游报表组与数据服务组的通知/回执是跨人协同，标 `deferred`，但不能省掉 T5；EDevOps 通知/回写后置（OPEN-001 / OPEN-006）。

### 12.5 SLA 与调度约束

```text
产出 SLA：05:00
上游就绪：dws 层任务约 03:12 完成（ev-006）；dwd.orders@dt-1 分区就绪待确认
运行窗口：03:00 起跑 → 05:00 截止，约 1h48m
重试：2；告警：上游延迟 / 任务超时
分区：dt=${bizdate-1}；静态覆盖；幂等
回刷：待确认（G-BACKFILL），默认只对切换日起生效
```

判断：

- 余量 1h48m 按“dws 层 03:12 完成”计算，mock 下成立；但 dwd.orders 分区就绪与单次运行时长都没有证据，C5 标 `warn`，R5 兜底，develop 首日必须核实；
- 3c 只给约束，不产 schedule YAML；develop 产 schedule-spec，CICD compile 校验（当前 `schedule.yaml` 是 mock 编译产物，不能当已部署）。

### 12.6 工时与风险

工时：

```text
总：2 人日
- 开发（T2）+ 调度（T4）：1.0
- 对账（T3）：0.5
- 下游通知（T5）+ 回滚演练（T6）：0.5
追加：接支付流水补 pay_time +3 人日（3b 备选 2，未采用）
置信：medium（运行时长无历史证据）
```

风险：

| ID | 风险 | 缓解 | 兜底 / owner |
|---|---|---|---|
| R1 | status 枚举不符 → 产出 0 行或漏计 | T1 前置 + 产出断言 | 暂停上线，回 3b 重定过滤；交易组 |
| R2 | order_id 1% 重复 → order_cnt 争议 | T3 同时输出去重/不去重两列 | 口径说明 + 需求方确认；交易组 |
| R3 | 跨日支付 → 日间与支付流水不一致 | 口径说明 + 月累计对账 | 接受日间差异；交易组 |
| R4 | 下游按列位置读 → 替换列顺序报错 | T5 补登记字段 + 契约 diff | 字段未知不上线；报表组 / 数据服务组 |
| R5 | 上游延迟 / 运行时长超预期 → 05:00 破线 | 依赖告警 + 超时告警 + 重试 2 | 通知下游延迟；数据平台 |

### 12.7 回滚

- 回滚点：切换前最后一天分区快照；
- 材料：旧口径 SQL、旧调度配置、快照位置；
- 步骤：停调度 → 恢复旧 SQL → 按 dt 重跑切换窗口 → 对账验证 → 恢复调度；
- 窗口：1 天；静态分区覆盖，幂等；
- 验证：行数与逐渠道差异率断言；
- 触发/决策：SE + 交易组；生产回滚走外部发布审批（OPEN-002），3c 不执行；
- 历史分区：默认不原地改，只对切换日起生效（G-BACKFILL 未关闭前）。

### 12.8 gaps 处置

| gap | 级别 | 3c 处置 |
|---|---|---|
| G-STATUS | execution-blocking | 转 T1 前置任务；T2 开工前必须关闭；否则 T2 不启动 |
| G-DUPKEY | execution-blocking | 转 T1；T3 同时输出去重/不去重两列；口径按 3b 决策（count distinct） |
| G-PAYTIME | warning | 3b 已接受“按订单 dt 归属”；写入口径说明，保留“接支付流水再切”的追加估算 |
| G-COLUMNS | execution-blocking | 字段登记 develop 前关闭；转 T5，契约 diff 上线前 2 个工作日完成；字段未知不得上线 |
| G-BACKFILL | warning | 转 T4 / T6；默认只对切换日起生效；窗口未定前不改历史 |
| G-LAYER | warning | 3b 已按“改在 dws”推进；假设变化则回 3b / 设计，不在 3c 改层级 |
| G-ACCEPT | warning | 3c 不能放宽验收；差异阈值回 3b / 需求方重定；任务断言引用新阈值 |

说明：3b 交接口径把 G-STATUS / G-DUPKEY / G-COLUMNS 标为 `execution-blocking`；工作项 `solution.yaml` 当前仍把 G-COLUMNS 标 warning。3c 取较严口径承接，避免字段未知时改坏下游。

补充：如果后续测试暴露“空渠道 0.18% > 验收 0.1%”（G-EMPTY-CHANNEL），按本设计不能在 develop 侧改阈值，应回 3b / 需求方重定，并更新 T2 断言。3c 的价值就是把这种冲突提前到任务和断言里，而不是等发布前才发现。

### 12.9 门禁结果与产出

- SE 签收：approved（条件：T1 完成前 T2 不开工；T5/T6 上线前完成）；
- Dev 可落地确认：approved；下游通知/回执 `deferred`（跨人协同，EDevOps 后置），写 handoff；
- 评审清单：C1–C3、C7、C8、C10 pass；C4（平台权限/队列/版本待首日确认）、C5（运行时长与分区就绪未验证）、C6（回刷窗口未定）、C9（下游字段未登记）warn，均有 gap / 任务 / handoff 首日动作承接；
- 产出：`deliverables/scheme/tech-plan.yaml`（现有工作项是兼容期 flat 路径 `deliverables/tech-plan.yaml`）；
- 卡片：TechPlanCard 显示 6 任务、4 条主依赖、05:00 SLA、2 人日、5 风险、1 天回滚窗口、3 个 execution-blocking gap、6 条证据；
- 状态：`stages.scheme.status=done`，`stage=develop`，`next=开发阶段`。

### 12.10 handoff

```text
handoff: scheme.tech_plan → develop
1. 先做 T1：status 枚举、order_id 重复成因，结论落 evidence；
2. 确认 ETL/调度平台权限、队列、运行时长；补 C5；
3. 建分支，产 change.sql（支付口径 SQL 不在 3c 产）；
4. sql-review 自查 + 产出断言（渠道数 >= 15、sum(order_cnt) > 0、空渠道阈值待 G-ACCEPT）；
5. 对账 SQL 同时给去重/不去重两列；
6. 产 schedule-spec，交 CICD compile（不在 3c 编译）；
7. T5 下游契约、T6 回滚演练不得跳过；
8. 任何 task / 依赖 / SLA / 回滚变化回 3c，不静默改。
```

### 12.11 本案例没有做什么

- 没有写最终 SQL / DDL（在 develop 的 change.sql / reconcile.sql）；
- 没有产最终调度 YAML（CICD compile 的 schedule.yaml 是 mock）；
- 没有重跑 3a 的分布、基线、候选比较；
- 没有重开 3b 的口径与方案决策；
- 没有执行任务、没有发布、没有回滚；
- 没有把 3c 签收当发布审批。

## 13. 待确认

1. **Dev 可落地确认的强度**：v1 是否允许 `deferred` 后 pass？提案：允许，但只限跨人协同项（通知、回执、EDevOps 回写），技术条件不可 deferred；`rejected` 阻断。需要架构/负责人拍板，关联 [OPEN-001](../../backlog.md)。
2. **blocking gap 的承接口径**：是否允许“前置条件任务”带过 3c 门禁（G-STATUS / G-DUPKEY / G-COLUMNS 依赖此规则）？提案：允许，但必须保留 blocking 可见、写进 handoff、按 `mustCloseBefore` 关闭（最晚发布前）；否则 3c 只能 blocked。
3. **工时口径与超支阈值**：按人日、含探查/对账/通知/演练；提案：超原估算 50% 或关键路径变化时回 3b 重排。阈值需要项目/负责人确认，避免 3c 用“估算”承诺排期。
4. **TechPlanCard 默认视图与视觉稿**：已定为“摘要/任务/风险/签收 + 一层设计血缘预览”，点开进入 LineageCard planned 视图；仍需补视觉稿和重大变更蓝图。

## 14. 技术依据来源与设计态血缘

> 这一节回答：3c 的技术方案从哪些系统取证；表、集成、ETL、调度依赖如何推导；设计态是否用血缘卡片呈现。

### 14.1 技术依据来源矩阵

| 技术方案要素 | 事实来源 | 关键字段 | 不能从哪里拿 |
|---|---|---|---|
| 目标表、口径、范围 | design / requirement / 3b solution | target、grain、metrics、selected option | 不能从模型经验补 |
| 物理表、字段、owner、行数、assetType | DataMap | 场景→主题→业务对象→逻辑实体→物理资产；字段说明、owner、rowCount、warehouse_table/lake_table | 不从 DataMap 取血缘/深度质量 |
| 上游表、下游表、加工顺序 | 独立血缘系统 | 表节点、边、方向、深度、as_of | 不从 DataMap 猜关系 |
| 集成作业、集成工具、全量/增量、源/目标 | 集成平台 + 工具目录 | integration_job、source、target、tool、mode、partition | 不能只看表名推断工具 |
| 内部 ETL 加工逻辑 | ETL 平台 / 血缘系统 | job id、输入/输出、SQL、字段映射、operator | 不能把 ETL 当表节点一笔带过 |
| 调度任务、作业、周期、依赖 | 调度平台 / 血缘系统 | schedule_task、schedule_job、cron、depends_on、timezone、SLA | 不能只按需求拍 cron |
| 上游就绪时间、运行时长、最近运行 | 调度平台 + 运行观测 | ready_at、duration、last_run、status、retry | 没有历史就写 gap |
| 数据质量/分区覆盖/新鲜度 | 独立画像/质量系统 | 查询、时间范围、结果摘要、as_of | DataMap 不保证完整质量 |
| 平台能力/权限/配额 | 平台能力目录 + 权限系统 | operator、queue、quota、version | 不能假定默认可用 |
| 发布/回滚参考 | 现有血缘、调度、历史发布 | 旧 job、旧 SQL、快照、下游影响 | 不能把回滚写成一句口号 |

### 14.2 先分清“集成”和“内部加工”

技术方案里必须区分三类链路：

```text
A. 集成链路
源系统表 → integration_job（DataX / SeaTunnel / Flink CDC 等）→ ODS 表

B. 内部加工链路
ODS/DWD 表 → etl_job（SQL / Spark / Flink）→ DWD/DWS/ADS 表

C. 交付/服务链路
DWS/ADS 表 → 报表任务 / API / 缓存 / 下游应用
```

不是每个需求都需要新增集成。

本案例：

- `dwd.orders`、`dim.channel` 已经是内部数仓资产；
- 新方案主要是 **B 内部加工链路**：`dwd.orders ⋈ dim.channel → dws.trade_channel_daily`；
- 不需要新增“订单系统 → ODS”的集成任务；
- 如果 pay_time 必须接支付流水，才新增一条 A 集成链路（工具/任务/上游 owner/调度都要补）。

### 14.3 表、ETL、调度的推导顺序

```text
1. 从血缘拿表加工图：
   上游表 → ETL job → 目标表

2. 从集成平台拿集成任务：
   源系统表 → integration job → ODS 表
   （已有链路则复用，不重复建）

3. 从调度平台拿 task/job/依赖/周期：
   schedule-task → schedule-job → 作业
   depends_on 对应表加工 DAG

4. 从 DataMap 拿物理资产元数据：
   表名/assetType/platform/layer/owner/rowCount/fields

5. 从运行观测拿 readiness/duration：
   上游分区就绪时间、历史运行时长、最近状态

6. 汇总为 tech-plan 的任务、依赖、SLA、风险和回滚
```

### 14.4 调度周期和依赖怎么定

不能只用需求拍 cron。建议按以下顺序推导：

```text
targetSLA          = requirement / design 的产出时间
upstreamReadyAt    = 各上游表生产任务的就绪时间
earliestStart      = max(upstreamReadyAt + 等待缓冲)
durationEstimate   = 同类 ETL 历史运行时长 / 平台能力
latestStart        = targetSLA - durationEstimate - 安全余量
slack              = latestStart - earliestStart
```

判定：

- `slack >= 0`：周期可行，记录余量；
- `slack < 0`：不可行；应调整上游、缩短运行、并行化、改 SLA 或改周期；
- `upstreamReadyAt` 缺失：gap，不能假装有 SLA；
- `durationEstimate` 缺失：gap 或给区间，不能给单点承诺。

周期选择依据：

- 上游数据更新频率；
- 目标 SLA / 下游消费频率；
- 分区语义（T-1 / 当日 / 小时分区）；
- 运行时长与资源；
- 回刷窗口。

依赖配置依据：

- 表加工顺序（血缘边）；
- ETL job 输入/输出；
- schedule-task/schedule-job 的 `depends_on`；
- 跨 task 依赖；
- 分区窗口（如 T-1）；
- 上游分区就绪/通知。

### 14.5 设计态血缘卡片

可以，而且**血缘卡片应该成为 3c 的主体图**。但先说清楚：它不是替代 TechPlanCard，而是 3c 技术方案里的“图”，TechPlanCard 是“摘要 + 任务 + 风险 + 签收”的外壳。

当前 [血缘卡片 v2](../lineage-card.md) 已经预留设计/生产/调度三个视图，3c 需要把它从“观测血缘”扩展成“**计划血缘**”。

#### 先解释“主视图”是什么意思

3c 技术方案页面建议是：

```text
┌ 技术方案 · dws.trade_channel_daily        SE / 待确认 ┐
│ 目标 / 周期 / 责任人 / SLA / 状态                      │
│                                                        │
│ 设计血缘（主体图）                                      │
│   上游调度 → ETL → 上游表                             │
│   目标调度 → 目标 ETL → 目标表                        │
│   时间带：上游就绪 → ETL → SLA                         │
│                                                        │
│ 任务 / 依赖 / 余量 / 风险 / 回滚 / 证据                │
│ [查看完整血缘] [确认技术方案] [退回]                   │
└────────────────────────────────────────────────────────┘
```

- **TechPlanCard 不是一张纯文字卡**：它是技术方案的摘要和签收外壳；
- **LineageCard 是里面的主图**：回答“数据怎么来、ETL 怎么加工、谁调度、周期是否可行”；
- 点“查看完整血缘”再进入全屏 LineageCard。

#### 设计视图只展开一层上游

按你的要求：

```text
目标表
← 目标 ETL
← 直接上游表
← 上游表的产出 ETL
← 上游表的调度作业
```

**不再往上追溯上游表的上游表。**

布局方向：

```text
[schedule job: 上游表产出] → [ETL: 上游表产出] → [直接上游表]
                                                      ↓
[schedule job: 目标表产出] → [ETL: 目标表产出] → [目标表]
```

也就是：

- 上游表是谁产出的；
- 产出它的 ETL 是什么；
- 这个 ETL 由哪个调度作业调度；
- 目标表的 ETL 和调度；
- 但不再展开上游 ETL 的输入表。

需要看全链路时，切“生产视图”。

#### 节点统一叫 ETL

按你的意见，集成和内部加工统一成一个 **ETL 节点类型**，不画两种节点：

```text
etl_job:
  id
  jobKind: integration | batch_etl | service
  tool / operator
  inputs
  outputs
  sql / fieldMapping
  owner
```

节点展开时显示差异：

- `jobKind=integration`：源系统、工具、全量/增量；
- `jobKind=batch_etl`：SQL / Spark / 字段映射；
- `jobKind=service`：API / 报表 / 缓存更新。

#### 节点与边

节点：

- `physical_table`：assetType、platform、layer、owner、rowCount
- `etl_job`：jobKind、tool/operator、inputs、outputs、SQL/字段映射、owner
- `schedule_task` / `schedule_job`：cron、depends_on、SLA、last_run
- `report` / `api` / `cache`：下游消费

边：

- `reads` / `writes` / `derives`：数据流
- `triggers` / `depends_on` / `contains`：调度控制流
- `planned`：虚线表示计划新增/变更
- `diff`：新增、修改、删除

#### 设计态 / 生产态

- **observed**：现有血缘，只读；
- **planned**：本次技术方案的规划图；
- **diff**：本次新增/修改/删除的节点和边。

设计态默认显示：

- 目标表；
- 直接上游表；
- 每个直接上游表的产出 ETL / 调度；
- 目标表 ETL / 调度；
- 关键下游只显示数量或摘要。

#### 时间带

设计图底部/右侧放时间带：

```text
上游就绪 03:12
  → 目标 ETL 开始 03:30
  → 目标 ETL 结束 04:38
  → 目标 SLA 05:00
  → 余量 22m
```

每个时间点带 evidence / as_of；缺失写 warn/gap。

#### TechPlanCard 与 LineageCard 的职责

```text
TechPlanCard：摘要、任务、依赖、SLA、余量、风险、回滚、证据、签收
LineageCard：设计血缘图 + 节点详情 + 时间带 + 计划/生产/调度切换
```

用户默认看到 TechPlanCard 内的**一层设计血缘预览**；点“查看完整血缘”进入 LineageCard 全屏。

#### 与当前血缘卡片的关系

当前 [血缘卡片 v2](../lineage-card.md) 设计视图已经有“目标表 + 直接上游 + 调度 + 加工摘要”的骨架；3c 需要补：

- 上游表的产出 ETL / 调度；
- 统一 `etl_job` 节点和 `jobKind`；
- `planned` / `observed` / `diff`；
- 时间带和 SLA 余量；
- 计划节点点击展开 ETL 详情。

### 14.6 案例：US-3821 的设计态血缘

```text
DataMap：
  场景 渠道日报支付口径
  → 主题 渠道运营 / 交易
  → 业务对象 订单/渠道
  → 逻辑实体 订单事实/渠道维度
  → 物理资产 dwd.orders / dim.channel / dws.trade_channel_daily

设计视图（只展开一层直接上游）：
  上游调度 job(orders_daily) → 上游 ETL(订单清洗) → dwd.orders
  上游调度 job(channel_daily) → 上游 ETL(渠道补全) → dim.channel
  目标调度 job(channel_pay_daily) → 目标 ETL(支付口径聚合) → dws.trade_channel_daily

时间带：
  dwd.orders 分区就绪待确认；dim.channel 03:00 完成
  目标 ETL 03:12 开始 / 计划 04:30 结束 / SLA 05:00
  余量待运行时长验证；C5 warn

下游（独立血缘）：
  ads.channel_report / rpt.funnel / api.channel_metrics
```

> 上游表的产出 ETL/调度来自血缘系统；不再展开这些 ETL 的输入表。上游 ETL 的输入表只在生产视图或“查看完整血缘”里出现。

说明：

- 本案例没有新增源系统集成任务；如果后续接支付流水，新增 `integration_job`；
- `dwd.orders` 分区就绪时间未确认，调度可行性不能给最终保证，进 gap；
- 设计态血缘里，ETL 和 schedule 是节点，不是背景文字；上游 ETL 的输入表不再递归展开。

### 14.7 结论

- 3c 的技术依据不是“模型想出来的任务”，而是 **DataMap + 独立血缘 + 集成平台 + 调度平台 + 运行观测 + 平台能力目录** 的组合。
- 调度周期/依赖从 **上游就绪 + 加工顺序 + 时长 + SLA** 推导，不从需求直接拍。
- 设计态架构**适合用血缘卡片呈现**，但必须扩展为 `planned` 模式，加入 integration_job / etl_job / schedule_task / schedule_job 节点和依赖边。
- TechPlanCard 做摘要和签收；LineageCard 做设计态图谱和证据展开。
