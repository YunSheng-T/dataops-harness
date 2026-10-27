# Stage 2 设计：设计阶段

> 状态：设计稿 v0
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 0+1](stage-0-1-us-intake-requirement.md) · [DesignCard + DataMap](design-card-datamap.md) · [DesignCard 视觉稿](../../../prototype/design-card-datamap.html) · [Stage 3 边界](stage-3-scheme.md) · [遗留事项](../../backlog.md)

## 1. 阶段定位

设计阶段回答的是：

> **这份需求要落到什么数据对象、什么粒度、什么来源、什么口径、影响谁。**

它不是：

- 最终技术方案；
- SQL/DDL；
- 调度 YAML；
- 发布计划。

这些属于后续的 `scheme` / `develop` / `cicd`。

```text
requirement 已确认
→ 设计：数据对象 + 粒度 + 来源 + 口径 + 影响面
→ 设计签收
→ scheme：分析 / 需求方案 / 技术方案
```

> **边界**：设计阶段的 DataMap 寻源/核验只服务于“设计决策”。完整的数据挖掘、数据探索、基线/候选方案对比属于 Stage 3 方案-分析，不放到 DesignCard 默认视图。

## 2. 主角色

| 角色 | 职责 |
|---|---|
| BA | 设计 owner，产出设计交付物，负责内容正确性 |
| 需求方 | v1 参考角色：可提前看设计；设计 hard gate 暂只要求 BA 签收 |
| SE | 可行性评审者；v1 可以是 advisory/deferred，EDevOps 协同后置 |
| Dev | 本期不参与设计签收；在 scheme 阶段确认可落地 |

## 3. 入口与输入

入口：

- requirement 已通过；
- workitem `stage=design`；
- 已有 design 草稿时恢复，不重新开始。

输入：

- US 原文 / 需求来源；
- requirement 交付物；
- acceptance；
- 影响资产清单；
- evidence / gaps；
- 已有设计、历史版本、相关表元数据。

## 4. 设计阶段做什么

### 4.1 目标对象

- 目标表 / 主题 / 报表 / API；
- 是新建、改造、替换还是只改口径；
- 目标 owner。

### 4.2 粒度与主键

- 一行代表什么；
- 主键 / 唯一键；
- 时间维度；
- 是否允许重复。

### 4.3 来源

- 来源表 / API / 文件；
- 关联键；
- 过滤条件；
- 字段映射；
- 来源粒度和目标粒度的转换。

### 4.4 口径与指标

- 指标名称；
- 定义；
- 公式；
- 维度；
- 时间语义（业务日期/支付日期/分区日期）；
- 与验收标准的对应关系。

### 4.5 分区与生命周期

- 分区字段；
- 分区粒度；
- 保留周期；
- 回刷/重跑影响范围。

### 4.6 血缘与影响面

- 上游依赖；
- 下游表 / 报表 / API / 任务；
- 影响数量、关键消费方；
- 不确定的消费方进 gaps。

### 4.7 调度与依赖

- 目标产出时间 / SLA；
- 上游依赖；
- cron/调度的大致要求；
- 回刷策略。

> 设计阶段给调度约束，不产最终调度 YAML；YAML 在 scheme/CICD。

### 4.8 数据质量与非功能约束

- 空值、重复、行数波动；
- 性能/数据量；
- 权限/敏感字段；
- 兼容性要求。

### 4.9 缺口和决策

- blocking gap；
- warning/info gap；
- 假设；
- 需要谁确认；
- 是否需要回到 requirement。

## 5. 交付物

```text
deliverables/design/design.yaml
```

payload 建议：

```json
{
  "kind": "design",
  "stage": "design",
  "status": "draft",
  "owner": "BA",
  "requester": "...",
  "target": {
    "table": "dws.xxx",
    "grain": "渠道 × 日期",
    "primaryKey": ["dt", "channel_id"],
    "partition": "dt=${bizdate}",
    "lifecycle": "保留 365 天"
  },
  "sources": [
    { "table": "dwd.orders", "fields": ["..."], "filter": "...", "join": "..." }
  ],
  "steps": [
    { "title": "过滤", "logic": "..." },
    { "title": "聚合", "logic": "..." }
  ],
  "metrics": [
    { "name": "order_cnt", "definition": "...", "formula": "...", "dimensions": ["channel"], "timeSemantics": "支付日期" }
  ],
  "schedule": {
    "sla": "05:00",
    "upstreamDependencies": ["dwd.orders", "dim.channel"],
    "backfill": "近 30 天"
  },
  "quality": [
    { "item": "主键唯一", "expectation": "0 重复" }
  ],
  "impact": { "count": 3, "top": [], "truncated": false },
  "gaps": [],
  "evidence": ["evidence/ev-*.yaml"],
  "review": {
    "ba": "pending",
    "requester": "pending",
    "se": "deferred"
  }
}
```

同时产出：

- DesignCard
- 影响面 / 血缘入口
- gaps
- 证据引用
- `approvals[gate=design]`

## 6. 怎么呈现

```text
RequirementCard 已确认
→ DesignCard（草稿/待确认）
→ DataMap / 分析过程 / 证据链
→ 签收面板
→ 设计已确认
→ 进入方案
```

### DesignCard 结构

- 标题：`数据设计 · <target>`
- 状态：草稿 / 待确认 / 已签收
- 粒度
- 来源
- 分区
- 调度/SLA
- 加工步骤
- 指标口径
- 影响面
- gaps
- 证据 / 血缘入口

### footer

- `确认设计`
- `退回修改`
- `查看交付物`
- `查看血缘`
- `打开画布`（可保留，作为设计视图）

现有 DesignCard 的 `提交技术方案` 不应该留在设计阶段；它属于 scheme。设计阶段应该推进到“设计签收”，不是直接提交技术方案。

### 签收面板

- BA 签收；
- SE 可行性评审：v1 `approved / pending / deferred`；
- 需求方确认在 v1 作为 advisory；跨人协同后续走 EDevOps。
- comment；
- 退回必须写原因。

## 7. 门禁

### 硬门禁（v1）

- BA 签收；
- DataMap 路径 + 独立证据链完整；
- 设计交付物完整；
- 无 blocking gap。

### 软门禁（v1）

- SE 可行性评审。
- 由于跨人协同暂时交给 EDevOps，v1 允许 `deferred`：
  - `approved`：正常通过；
  - `deferred`：设计可推进，但在 handoff 里标记“SE 可行性待评审”；
  - `rejected`：设计不能通过，退回 BA。

> 后续 EDevOps 协同完成后，SE 评审从 advisory 升级为 hard gate，见 [OPEN-001](../../backlog.md)。

### 不能 pass 的情况

- 目标表/粒度/主键不清；
- 来源或过滤条件没有依据；
- 指标定义与验收不对应；
- 影响面未知且没有 gap；
- BA 未签收；
- SE 明确 rejected；
- 需求范围发生变化但没有回到 requirement。

## 8. Pass 后

```text
stages.design.status = done
stage = scheme
next = 方案阶段：分析 / 需求方案 / 技术方案
```

签收记录：

```yaml
approvals:
  - gate: design
    status: approved
    signoffs:
      - role: BA
        approver: ...
        at: ...
      - role: SE
        approver: ...
        at: ...
        mode: advisory
    se_review: deferred
    comment: ...
```

同时：

- `plan.md` 追加一行；
- 交接包给 scheme；
- 设计状态改为 approved。

## 9. 交接给方案阶段

```text
design.yaml
+ requirement
+ target/grain/primaryKey/partition
+ sources
+ metrics/time semantics
+ impact/lineage
+ schedule constraints
+ gaps
+ SE review status
```

方案阶段不是重新设计；它消费这份设计，产出分析、需求方案、技术方案。

## 10. 失败与退回

| 情况 | 处理 |
|---|---|
| 粒度/主键不成立 | 退回设计，补证据 |
| 来源字段缺失 | 记 blocking gap；不进入 scheme |
| 指标口径与验收冲突 | 退回 requirement 或需求方确认 |
| 影响面未知 | 补血缘/消费方，或记 gap；blocking 不进 scheme |
| SE rejected | 退回设计，记录原因 |
| SE deferred | 允许推进，但 handoff 标待评审 |
| 设计中发现需求变更 | 停止，回 requirement 记录变更，不静默改范围 |

## 11. Agent 边界

Agent 可以做：

- 读表/血缘/画像/证据；
- 生成设计 payload；
- 调 presenter 出设计卡；
- 标 gaps；
- 生成影响面；
- 更新工作项。

Agent 不可以：

- 替 BA/SE 签收；
- 把未确认的设计标 done；
- 直接产最终 SQL/调度 YAML；
- 把“影响面未知”写成“无影响”；
- 在需求变化时静默修改设计。

## 12. 已确认

1. v1 设计阶段允许 SE `deferred` 后推进，handoff 标待评审。
2. 设计阶段 v1 只要求 BA 签收；需求方确认暂为 advisory。
3. 设计卡移除“提交技术方案”，改成“确认设计”。
4. DesignCard 详细布局、DataMap 来源与分析过程见 [design-card-datamap.md](design-card-datamap.md)。

## 13. 设计阶段不做

- SQL/DDL 最终实现；
- 具体平台任务配置；
- 最终调度 YAML；
- 代码评审；
- 发布审批；
- US 状态回写。

## 14. 设计与 3a 分析的边界

这两段会有重叠，但不是同一件事。区分标准是：**当前要支持哪个决策**。

| 问题 | 设计阶段 | 3a 分析 |
|---|---|---|
| 这个设计在现有数据上成立吗？ | 主要问题 | 补充验证 |
| 用哪张表/哪个粒度/什么口径？ | 决策并落成 `design.yaml` | 比较候选、给建议 |
| 数据实际分布/基线/差异如何？ | 只做定向核验 | 深度分析 |
| 哪个方案更好？为什么？ | 不选方案 | 主要问题 |
| 影响面/owner/约束 | 必须给出 | 深挖风险和契约 |
| 产物 | `design.yaml` / DesignCard | `analysis.yaml` / AnalysisCard |

原则：

- **设计**：把已确认需求落成一个可执行数据设计，并验证它成立。
- **3a 分析**：用数据探索、基线、候选比较来支撑方案选择。
- 同一个 DataMap 查询/evidence 可以被两个阶段复用，但**展示深度不同**：
  - DesignCard 只展示支持设计决策的摘要；
  - AnalysisCard 才展开完整查询、分布、对比和结论。
- 如果分析结果要求改 target/grain/source/metric，**回到设计阶段改 design.yaml**，不要在设计卡里悄悄改结论。
- 如果设计阶段已经做了完整探索，3a 不再重复跑；直接引用 evidence。

## 15. 案例：渠道日报支付口径（US-3821）

> 用一个贯穿案例把 0→1→2 串起来。案例数据是 mock，不代表生产事实。

- 来源 US：`US-3821`
- 工作项：[2026-10-26-channel-report-pay-caliber](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml)
- 目标：渠道日报从下单口径改为支付口径

### 输入

- requirement 已确认；
- 目标：`dws.trade_channel_daily`
- 下游：`ads.channel_report`、`rpt.funnel`、`api.channel_metrics`
- 已知 gap：缺 `pay_time`、`status` 枚举未登记、渠道映射未补齐

### 设计决策

```text
target     dws.trade_channel_daily
grain      渠道 × 日期
primaryKey dt + channel_id
partition  dt=${bizdate}
sources    dwd.orders ⋈ dim.channel
metrics    order_cnt / gmv
schedule   05:00 / SLA 05:10
```

### DataMap 寻源

- 场景：渠道日报支付口径改造；
- 主题：渠道运营 / 交易分析；
- 业务对象：订单 / 支付 / 渠道；
- 逻辑实体：订单事实 / 支付事实 / 渠道维度 / 渠道日报；
- 物理资产：`dwd.orders`、`dim.channel`、`dws.trade_channel_daily`、`ads.channel_report`；
- 目标 `dws.trade_channel_daily` 和来源均为**内部数仓表**，assetType=`warehouse_table`；
- 下游 `ads.channel_report` / `rpt.funnel` / `api.channel_metrics` 是内部数据资产，影响关系来自独立血缘系统。

### 资产核验

- DataMap：字段说明、owner、行数；
  - `dwd.orders`：2.1M 行，字段含 order_id/channel_id/amount/status，无 pay_time；
  - `dim.channel`：1.2K 行，3/18 渠道未登记；
- 独立血缘：`dws.trade_channel_daily → ads.channel_report / rpt.funnel / api.channel_metrics`；
- 独立画像/查询：order_id 0 重复、status 4 个枚举、join 覆盖率 99.2%；
- evidence：`ev-001` ~ `ev-006`（示例编号，实际以工作项为准）。

### 结果

- `deliverables/design/design.yaml`
- DesignCard：待确认
- gaps：`G-PAYTIME` blocking、`G-STATUS` warning、`G-CHMAP` warning
- BA 签收后：`stage=scheme`
- SE 可行性：`deferred`，handoff 标待评审

### 这一阶段没有做什么

- 没有产最终 SQL / DDL；
- 没有做完整支付/下单基线对比（留给 3a）；
- 没有选业务方案（留给 3b）；
- 没有任务拆解/调度 YAML（留给 3c）。
