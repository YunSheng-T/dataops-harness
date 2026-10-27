# DesignCard + DataMap（设计阶段）

> 状态：设计稿 v0
> 日期：2026-10-27
> 关联：[Stage 2 设计](stage-2-design.md) · [用户旅程 v0](user-journey.md) · [Stage 3 边界](stage-3-scheme.md) · [遗留事项](../../backlog.md)
> 视觉稿：[DesignCard mock](../../../prototype/design-card-datamap.html) · [截图](../../../prototype/shots/design-card-datamap.png)

## 1. 目标

设计卡不是“Agent 说完结论，用户点确认”。

用户要能看到：

- 设计结论是什么；
- 数据从哪来；
- 做了哪些**设计所需的数据核验**；
- 每个结论对应哪条证据；
- 哪里还缺数据；
- 为什么选这个粒度、来源、口径；
- 谁签收、怎么退回。

原则：

> **不展示模型思维链；展示可复核的证据链和决策轨迹。**

Agent 可以自动完成这些核验，但每一步必须留下可追溯的 DataMap 寻源路径、独立血缘和查询/画像证据，用户才能相信结论。

> 完整的数据挖掘/数据分析、基线比较、候选方案分析在 Stage 3 方案-分析，不在本卡展开。

## 2. DataMap 的职责

DataMap 首先是**业务语义到物理资产的寻源地图**，不是完整血缘/质量平台。

```text
场景
→ 主题
→ 业务对象
→ 逻辑实体
→ 物理资产（数仓表 / 湖表）
```

DataMap 提供：

| 能力 | 用途 |
|---|---|
| 语义寻源 | 从业务场景/主题/对象找到逻辑实体和候选物理资产 |
| 字段说明 | 逻辑实体/物理资产的字段、类型、注释 |
| owner | 资产负责人 |
| 行数 | 基础规模信息 |
| 部分基础信息 | 可能有部分质量/基础信息，但不保证完整 |

DataMap **不负责**：

- 完整血缘/下游：走独立血缘系统；
- 空值率、重复率、join 覆盖率等深度画像：走画像/查询；
- 完整质量规则、对账：走质量/分析系统。

物理资产统一建模：

```yaml
physicalAsset:
  id: dwd.orders
  name: dwd.orders
  assetType: warehouse_table | lake_table
  platform: hive | doris | starrocks | iceberg | hudi
  layer: ods | dwd | dws | ads
  owner: 交易组
  rowCount: 2100000
  fields:
    - name: order_id
      type: string
      description: 订单 ID
```

原则：

- DataMap 只读；DataOps 不写回。
- 每个“来源”结论先记录 DataMap 路径：场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产。
- 字段、owner、行数来自 DataMap；血缘和深度质量来自独立系统。
- 读不到就写 gap，不允许用模型记忆补。

## 3. 设计阶段的数据核验流程

Stage 2 只做支持设计决策的最小核验；完整数据挖掘/分析属于 Stage 3。DesignCard 要能把“寻源”和“核验”分开。

### 3.1 设计接续

- 读 requirement、US、gaps、影响资产；
- 确认这次设计不重新问需求；
- 如果发现需求范围变化，停止，回 requirement。

**可见信号**：设计卡顶部显示来源 US、requirement、设计 owner。

### 3.2 DataMap 语义寻源

- 从需求场景匹配主题；
- 从主题匹配业务对象；
- 从业务对象匹配逻辑实体；
- 从逻辑实体匹配候选物理资产（数仓表/湖表）；
- 记录候选、选中、淘汰原因。

**证据**：DataMap 路径、逻辑实体 ID、候选物理资产、owner。

**卡片位置**：“DataMap 寻源” section。

### 3.3 资产元数据核对

用 DataMap 核对：

- 物理资产名称 / 类型 / 平台 / 层；
- 字段、类型、注释；
- owner；
- 行数。

**证据**：DataMap 资产快照、as_of。

**卡片位置**：物理资产卡 + 字段列表。

### 3.4 独立血缘核对

血缘不在 DataMap 里，走独立血缘系统：

- 上游依赖；
- 下游表 / 报表 / API / 任务；
- 影响路径；
- 任务依赖。

**证据**：血缘系统查询结果、as_of。

**卡片位置**：影响面 section + 独立血缘入口。

### 3.5 数据质量/画像

对关键来源做独立查询/画像：

- 行数（可与 DataMap 交叉校验）；
- 主键/唯一键重复；
- 空值率；
- 基数/枚举；
- 分区覆盖；
- 新鲜度；
- join 覆盖率。

**证据**：查询 + 时间范围 + 环境 + 结果摘要 + as_of；DataMap 不提供时进 gap。

**卡片位置**：“设计证据链” step，带 evidence chip。

### 3.6 设计综合

- 目标粒度、主键、分区；
- 来源和 join；
- 指标定义/公式/时间语义；
- 调度约束；
- 关键决策/备选；
- gaps。

**证据**：每条关键决策对应 DataMap 路径 + 血缘/查询证据，或明确 gap。

**卡片位置**：“设计摘要” + “决策与取舍”。

### 3.7 证据审阅与签收

- 检查来源是否有 DataMap 路径；
- 检查血缘是否来自独立系统；
- 检查关键质量结论是否有查询/画像证据；
- 检查 blocking gap；
- BA 签收；
- SE 可行性 advisory/deferred；
- 更新 workitem。

**卡片位置**：底部证据摘要 + 签收 panel。

## 4. 证据链模型

每条设计结论应可还原成：

```text
claim
→ DataMap asset/field
→ lineage path
→ query / profile snapshot
→ time range + env + as_of
→ evidence id
→ decision
```

示例：

```yaml
id: ev-20261027-001
claim: "dwd.orders 可作为支付口径来源，但缺少 pay_time"
datamap:
  asset: dwd.orders
  schemaVersion: "dwd.orders@v12"
  fields: [order_id, channel_id, amount, status]
  lineagePath: [dwd.orders, dws.trade_channel_daily]
  owner: 交易组
  asOf: 2026-10-27T04:12:00+08:00
query:
  sql: "select count(*) ..."
  timeRange: "2026-10-20 ~ 2026-10-26"
  env: prod-ro
  resultDigest: "rows=2.1M, nullPayTime=100%"
evidenceId: ev-20261027-001
```

用户不需要读 YAML，但 DesignCard 必须展示：

- 资产名
- owner
- 字段
- 时间范围
- 环境
- 结果摘要
- as_of
- evidence 入口

## 5. DesignCard 信息架构

```text
┌────────────────────────────────────────────────────────────┐
│ 数据设计 · dws.trade_channel_daily      待确认 · BA 陈璐  │
│ 来源：US-3821 · requirement 已确认 · 更新 10:42           │
├────────────────────────────────────────────────────────────┤
│ 设计结论                                                   │
│ 粒度：渠道 × 日期   主键：dt + channel_id                  │
│ 分区：dt=${bizdate}  产出：05:00 / SLA 05:10              │
│ 来源：dwd.orders ⋈ dim.channel                            │
├────────────────────────────────────────────────────────────┤
│ DataMap 寻源                                    独立血缘 → │
│ 场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产             │
│ 渠道日报支付口径 → 渠道运营 → 订单/支付/渠道              │
│   → 订单事实/支付事实/渠道维度 → dwd.orders/dim.channel  │
│                                                            │
│  dwd.orders ─────┐  warehouse_table · 交易组 · 2.1M       │
│  dim.channel ────┼→ dws.trade_channel_daily               │
│                  │  目标：渠道 × 日期                     │
│  ads...          └→ 下游（独立血缘）                       │
├────────────────────────────────────────────────────────────┤
│ 设计证据链（Agent 做了 5 步）                  查看全部 →  │
│ ✓ 资产发现     6 个候选，选 dwd.orders + dim.channel      │
│ ✓ Schema 核对  目标/来源字段、主键、分区已核验             │
│ ✓ 画像摘要     2.1M 行，order_id 0 重复，status 有 4 枚举  │
│ ✓ 口径映射     order_cnt 定义与 acceptance 已对应          │
│ ! 支付时间     dwd.orders 无 pay_time，跨日支付归到下单日  │
│                                                            │
│ 每步可展开：查询 / 时间范围 / 结果摘要 / evidence          │
├────────────────────────────────────────────────────────────┤
│ 口径与质量                                                 │
│ order_cnt = count(distinct order_id) ...                  │
│ 主键唯一 ✓   空值 ✓   分区覆盖 ✓   join 覆盖 99.2%       │
├────────────────────────────────────────────────────────────┤
│ 影响面                                                     │
│ 3 个下游：ads.channel_report / rpt.funnel / api...         │
│ owner：报表组、数据服务组；未知消费方 0                    │
├────────────────────────────────────────────────────────────┤
│ 缺口与决策                                                 │
│ G-PAYTIME blocking：缺支付时间                             │
│ 决策：口径改在 dws；备选：只在 ads 改（未采用）            │
├────────────────────────────────────────────────────────────┤
│ 证据 6 条 · 缺口 2 个 · SE 可行性 deferred                 │
│ [查看完整交付物] [查看分析日志] [确认设计] [退回修改]      │
└────────────────────────────────────────────────────────────┘
```

## 6. 卡片分区说明

### 6.1 顶部状态

- target 名称；
- 状态：草稿 / 待确认 / 已确认 / 已退回；
- owner（BA）；
- 来源 US / requirement；
- 更新时间；
- 证据/缺口计数。

### 6.2 设计结论

用一屏说清：

- 粒度；
- 主键；
- 分区；
- 调度/SLA；
- 来源；
- 核心指标。

不是把 payload 全部平铺。

### 6.3 DataMap 寻源 / 资产元数据

这是本次设计最重要的新增。

DataMap 区域先展示**业务寻源路径**：

```text
场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产
```

每个物理资产卡显示：

- asset 名称；
- `assetType`（warehouse_table / lake_table）；
- platform / layer；
- owner；
- 行数；
- 使用的字段 / 字段说明；
- DataMap 入口。

**血缘不在这里**，单独走独立血缘系统。迷你血缘图标注“独立血缘”：

```text
dwd.orders ─┐
dim.channel ─┼→ dws.trade_channel_daily → ads.channel_report
            └→ rpt.funnel
```

用户能回答：

- 业务上找的是什么（场景/主题/业务对象/逻辑实体）；
- 落到哪张物理表；
- 表类型/平台/层；
- 谁负责、行数多少；
- 用了哪些字段；
- 下游是谁（独立血缘）。

### 6.4 设计证据链

用“步骤 + 证据”展示，不展示模型思维链。这里只展示设计所需核验；完整数据挖掘/分析在 Stage 3。

| 步骤 | 用户看到 |
|---|---|
| DataMap 寻源 | 场景/主题/业务对象/逻辑实体/候选物理表 |
| 元数据 | assetType、platform、fields、owner、rowCount |
| 独立血缘 | 上游/下游/任务依赖（独立系统） |
| 质量/画像 | 行数、重复、空值、枚举、新鲜度（独立查询） |
| 关联 | join key、覆盖率、未匹配 |
| 口径映射 | 指标定义、时间语义、与 acceptance 对应 |
| 决策 | 选择/备选/原因 |
| 缺口 | blocking/warn、owner、下一步 |

每步：

- 状态：✓ / ! / ×
- 一句话摘要
- evidence chip
- 展开后：DataMap 路径、独立血缘、查询、时间范围、env、结果摘要、as_of

### 6.5 口径与质量

- 指标定义、公式、维度、时间语义；
- 与 requirement acceptance 的对应；
- 主键唯一、空值、分区覆盖、join 覆盖、对账；
- 通过/警告/阻断。

### 6.6 影响面

- 下游数量；
- top 资产和 owner；
- 未知消费方；
- 独立血缘系统入口（不是 DataMap）。

### 6.7 缺口与决策

- blocking gap 放在最显眼位置；
- 每条 gap：id、message、owner、action；
- 关键决策：选择、备选、理由；
- 未采用方案的 tradeoff。

### 6.8 footer

- 证据计数；
- 缺口计数；
- SE 可行性状态；
- 查看完整交付物；
- 查看分析日志；
- 确认设计；
- 退回修改。

### 6.9 渐进披露

默认卡片：

- 结论；
- DataMap 寻源路径 + 资产元数据；
- 3~5 条设计证据；
- 质量/影响/ gaps；
- footer。

展开：

- 完整设计证据链；
- 每条查询；
- 完整血缘；
- 完整 payload；
- 证据详情。

不把 SQL 和整份 YAML 默认塞进卡片。

## 7. 交互

- 点击来源卡 → 打开 DataMap 资产详情 / 右栏血缘。
- 点击 evidence chip → 证据详情：查询、时间范围、env、结果摘要、as_of。
- 点击分析步骤 → 展开该步骤的输入/输出/证据。
- 点击下游资产 → 打开影响面。
- 点击“确认设计” → 签收 panel。
- 点击“退回修改” → comment + 退回。
- 点击“查看完整交付物” → design.yaml / 结构化产物。
- 点击“查看证据日志” → 设计证据链全量。

## 8. 状态与空态

- loading：骨架屏；
- DataMap 不可用：卡片显示“来源待寻源”，不显示假数据；
- 无来源：blocking gap；
- 无证据：该结论标“待确认”；
- 部分数据：partial 标识 + gaps；
- SE deferred：显示“可行性待评审”，不是通过；
- 退回：显示退回原因和“重新提交”；
- 超出上下文：展示摘要 + 查看完整交付物。

## 9. Pass 标准（设计阶段）

除 Stage 2 的字段完整性外，新增证据要求：

- 目标/来源/口径/影响四类设计结论都有可追溯依据：
  - 来源有 DataMap 路径；
  - 血缘来自独立系统；
  - 关键质量结论有查询/画像 evidence；
- 没有证据的结论不能写成事实；
- BA 签收；
- SE rejected 不能 pass；SE deferred 可 pass 但 handoff 标待评审；
- 无 blocking gap。

也就是说：

```text
Agent 说“渠道覆盖率 99.2%”
→ 没有独立画像查询 / 血缘 / DataMap 字段依据
→ 不能 pass，也不能展示成确定事实
```

## 10. 技术分层

- **DataMap adapter**：Host tool/provider，只读，负责语义寻源、字段/owner/行数/assetType；
- **Lineage adapter**：独立血缘系统，只读；
- **Quality/Profile adapter**：独立查询/画像，只读；
- **DesignCard**：Client plugin 的卡片组件，消费 `design` payload + `dataMap`/`analysis` trace；
- **Skill**：`dataops-deliverable-templates` 增加设计步骤与证据要求；Agent 负责执行，不负责编造；
- **workitem**：`design` stage 状态、gaps、approvals；
- **presenter**：渲染 DesignCard，不生成内容。

DataMap 的工具/接口是后续实现项；当前设计先定契约和展示。

## 11. 不做

- 不展示模型隐藏思维链；
- 不展示未脱敏的原始数据/凭据；
- 不把 DataMap 副本写入 DataOps；
- 不在卡片默认展示完整 SQL/YAML；
- 不让 Agent 用“经验”代替 DataMap 寻源或独立证据；
- 不在设计阶段产最终 SQL/调度 YAML。
