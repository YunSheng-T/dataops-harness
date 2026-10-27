# DataOps 工作台总体设计

> 汇报/评审版 v0 · 2026-10-27
> 范围：从 US 接单到 Stage 5 CICD 制品流水线；Stage 6 暂不设计
> 说明：这是设计汇总，不代表生产接入或完整实现
> 分阶段原文：[0+1](stage-0-1-us-intake-requirement.md) · [2](stage-2-design.md) · [3](stage-3-scheme.md) · [4](stage-4-develop.md) · [5](stage-5-cicd.md)

## 0. 30 秒结论

DataOps 工作台不是工具目录，而是一条 **US 驱动、工作项承载、阶段交付、人工签收、证据可追** 的数据交付链。

```text
US 接单
→ 需求
→ 设计
→ 分析
→ 需求方案
→ 技术方案
→ 开发验证
→ CICD
→ 验收/复盘
```

设计已经覆盖到 **Stage 5 CICD 数据制品流水线**；Stage 6 暂不设计。

## 1. 角色与阶段总览

| 阶段 | 主角色 | 核心产出 | 硬门禁 |
|---|---|---|---|
| 0. US 接单 | BA | workitem、US 摘要、初始 gaps | 接单确认 |
| 1. 需求 | BA | requirement | BA + 需求方 |
| 2. 设计 | BA | design + DataMap 寻源 | BA 签收；SE advisory |
| 3a. 分析 | BA | analysis + 证据链 | BA 签收；blocking gap 不得 pass |
| 3b. 需求方案 | BA | solution | BA 签收；需求方 advisory |
| 3c. 技术方案 | SE | tech-plan + 设计血缘 | SE 签收；Dev deferred 仅协同项 |
| 4. 开发验证 | Dev | SQL/ETL/schedule/API/测试 | SE 评审 + Committer 合入 |
| 5. CICD | Dev/平台 | 构建、扫描、测试、部署、发布 | 线上标准 CICD + 发布审批（待详细设计） |
| 6. 验收/复盘 | BA/需求方 | 验收、复盘、US 关闭 | BA/需求方（待详细设计） |

原则：

- 一个阶段一个 owner；
- Agent 生成内容，人签收；
- 事实可追到 DataMap / 独立血缘 / 独立画像；
- 代码合入、生产发布不替代外部系统。

## 2. 端到端流程

```text
EDevOps US
  → USPicker
  → workitem
  → requirement
  → design + DataMap
  → 3a analysis
  → 3b solution
  → 3c tech-plan + planned lineage
  → develop validation
  → code review / merge
  → CICD
  → acceptance / review
  → US close（后续）
```

贯穿案例：**US-3821 渠道日报从下单口径改为支付口径**。

## 3. Stage 0：US 接单

### 定位

把 EDevOps US 转成可恢复的工作项，不做业务判断。

### 输入

- US ID / 链接；
- US 状态、指派人、标题、描述、验收、资产；
- 是否已有 workitem。

### 活动

1. 读取 US；
2. 判断是否值得建 workitem（跨多轮、有交付物、需要签收/交接才建）；
3. 按 `source.system + source.id` 去重；
4. 建/恢复 workitem；
5. 记录 source、owner、初始 stage、intent、plan；
6. 按 US 状态映射初始 stage。

### 呈现

- `USPicker` 卡片：待我处理的 US、状态/优先级/owner/资产；
- 超过 5 条或用户点“查看全部” → 悬浮选择器；
- 选中后显示接单摘要：US、owner、初始 stage、是否已有 workitem。

### 产出

```text
workitems/<id>/
  item.yaml
  intent.md
  plan.md
```

### 门禁 / 交接

- 用户选中 US = 接单确认；
- 没有业务交付物；
- 交接给 requirement：US + source + owner + gaps。

## 4. Stage 1：需求

### 定位

把 US 变成可验证的需求，明确目标、范围、验收和 owner。

### 输入

- US、已有 workitem；
- 资产、历史信息、证据；
- 用户补充。

### 活动

1. 问题/目标：解决什么、为什么现在；
2. 范围/非目标；
3. 验收标准和验收人；
4. owner/requester；
5. 影响资产；
6. 约束/风险；
7. 缺证据进 gaps。

### 产出

```text
deliverables/requirement/requirement.yaml
```

内容：

- goal / scope / non_goals
- acceptance / owner / requester
- impacts / constraints
- gaps / evidence
- source / asOf

呈现：RequirementCard + 签收面板。

### 门禁 / Pass

- BA 签收；
- 需求方确认目标/验收；
- 至少一条可验证验收；
- owner/requester、影响面有清单或 gap；
- 无 blocking gap。

Pass 后：

```text
stages.requirement.status = done
stage = design
```

交接：US + requirement + acceptance + impacts + gaps + 问题清单。

## 5. Stage 2：设计

### 定位

把需求落成可执行的数据设计，不做完整数据挖掘。

### 输入

- requirement；
- DataMap 语义路径；
- 资产字段/owner/行数；
- 独立血缘/基础画像；
- 已有设计/历史。

### 活动

1. 目标对象：表/报表/API；
2. 粒度、主键、分区、生命周期；
3. 来源表、join、过滤、字段映射；
4. 指标定义、口径、时间语义；
5. 血缘与影响面；
6. 调度约束/SLA/回刷；
7. 质量/非功能约束；
8. 设计 gaps/决策。

### DataMap 在这里的职责

```text
场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产
```

- 物理资产统一节点，`assetType=warehouse_table|lake_table`；
- DataMap 提供字段说明、owner、行数、部分基础信息；
- 血缘走独立系统；
- 质量/画像走独立查询；
- 完整数据挖掘不在设计阶段展开。

### 产出

```text
deliverables/design/design.yaml
```

内容：target/grain/primaryKey/partition/sources/steps/metrics/schedule/quality/impact/gaps/evidence。

呈现：DesignCard

- 设计结论；
- DataMap 寻源路径；
- 资产元数据；
- 设计证据链；
- 口径/质量；
- 影响面；
- gaps；
- BA 签收。

### 门禁 / Pass

- BA 签收；
- DataMap 路径 + 独立证据；
- 状态/字段/口径/影响有依据；
- 无 blocking gap；
- SE 可行性 `approved/deferred` 可推进，`rejected` 阻断；
- 需求方 advisory。

Pass 后：

```text
stage = scheme
substage = analysis
```

交接：design + requirement + DataMap + 影响面 + gaps。

## 6. Stage 3a：分析

### 定位

用数据挖掘、探索、基线和候选比较，回答“设计靠什么数据成立、哪个候选更合适”。

### 输入

- design / requirement / US；
- DataMap 路径；
- 独立血缘/画像；
- 已有 evidence；
- 分析问题。

### 活动

A1 定义分析问题；
A2 数据挖掘：从场景找候选物理资产；
A3 数据探索：分布、枚举、覆盖、边界；
A4 基线/对账；
A5 候选来源比较；
A6 可行性；
A7 数据侧备选/tradeoff；
A8 结论与建议。

### 产出

```text
deliverables/scheme/analysis.yaml
```

关键内容：问题、发现、基线、候选比较、可行性、结论、gaps、evidence。

呈现：AnalysisCard

- 结论/候选矩阵/基线；
- 证据 chip；
- 查询、时间范围、env、as_of；
- DataMap 路径 + 独立血缘/画像；
- gaps；
- BA 签收。

### 门禁 / Pass

- BA 硬签收；
- 候选已比较；
- 结论有 evidence；
- 基线有数据或明确 blocked；
- DataMap 路径完整；
- 无 blocking gap；
- 需求方 advisory。

三态：

```text
passed / blocked / returned
```

`blocked` 是合法结果：gap + owner + action，不产生 3b 可签收输入。

Pass 后：`substage=solution`，交接 3b。

## 7. Stage 3b：需求方案

### 定位

消费 3a，做业务/需求方案选择和 tradeoff，不重做分析。

### 输入

- design / analysis / requirement；
- 影响面、依赖、约束；
- gaps/evidence。

### 活动

1. 核对输入；
2. 从 analysis 识别决策点；
3. 定义候选方案；
4. 关键决策、备选、tradeoff；
5. 范围/影响/依赖/约束；
6. 风险/回滚边界；
7. 假设与 gaps；
8. 自检。

### 产出

```text
deliverables/scheme/solution.yaml
```

内容：inputs、chosenOption、options、decisions、impacts、dependencies、risks、rollback、assumptions、gaps、review、handoff。

呈现：SolutionCard

- 方案结论；
- 决策轨迹；
- 备选对比；
- 影响/依赖；
- 风险/回滚边界；
- gaps；
- BA 签收。

### 门禁 / Pass

- BA 硬签收；
- 需求方 advisory；
- `solution-blocking=0`；
- `execution-blocking` 带 mustCloseBefore；
- 决策有 evidence；
- 影响面不能写“0”而无血缘证据。

Pass 后：`substage=tech_plan`，交接 3c。

## 8. Stage 3c：技术方案

### 定位

把 3b 选中方案翻译成可执行、可验收、可回滚的落地路径。

### 输入

- design / analysis / solution；
- DS 血缘/调度/运行观测；
- 平台能力目录；
- mustNotChange、验收断言、rollback。

### 活动

1. 任务拆解：ETL、对账、调度、契约、回滚；
2. 平台/组件；
3. 依赖 DAG；
4. SLA/周期/余量；
5. 工时；
6. 风险；
7. 回滚；
8. 评审清单。

### 技术依据

- DataMap：资产/字段/owner/rowCount/assetType；
- 独立血缘：表、ETL、调度、上下游、依赖；
- 调度/运行观测：就绪、时长、SLA；
- 平台能力目录：operator、并发、作业数限制；
- 集成/ETL 平台：工具、任务、SQL/字段映射；
- 质量/画像：独立查询。

### 设计态血缘

- 只展开一层直接上游表；
- 每个上游表显示产出 ETL + 调度 job；
- 目标表显示目标 ETL + 目标 schedule job；
- 不递归上游表的上游表；
- 集成/内部加工统一为 `etl_job`，`jobKind=integration|batch_etl|service`；
- observed/planned/diff；
- 时间带：上游就绪 → ETL 开始/结束 → SLA → 余量。

呈现：

```text
TechPlanCard = 技术方案摘要/任务/风险/回滚/签收
  + LineageCard planned 视图 = 设计血缘主图
```

### 产出

```text
deliverables/scheme/tech-plan.yaml
```

### 门禁 / Pass

- SE 硬签收；
- Dev 可落地确认；
- `deferred` 只限跨人协同项，技术条件不可 deferred；
- 任务/依赖/SLA/工时/风险/回滚完整；
- 缺证据进 gaps。

Pass 后：

```text
stages.scheme.status = done
stage = develop
```

交接：tech-plan + 任务/依赖/SLA/验收断言/回滚/open gaps。

## 9. Stage 4：开发验证

### 定位

不是生成完代码就结束，而是 build/scan/deploy 的迭代验证。

### 输入

- tech-plan；
- design/analysis/solution；
- DataMap/血缘/运行约束；
- 平台扫描规则/能力目录；
- 仓库/开发环境。

### 活动

1. 生成实现包：
   - SQL
   - etl.yaml
   - schedule.yaml
   - data_consume_api.yaml
   - ops/deploy
2. Build：
   - 失败 → 修代码 → 重建；
3. Scan：
   - 平台扫描系统按作业类型配置规则；
   - 作业数、并发、依赖、周期一致性；
   - 失败 → 修代码/调度 → 重扫；
4. Deploy：
   - 到开发/联调环境；
   - 数据源缺失 → ETL 平台补数据源 → 改 ops → 重部署；
5. Test：
   - 平台自动化测试缺失；
   - manual/mock 记录，不假装自动通过；
6. SE review；
7. Committer 外部评审/合入；
8. 交 CICD。

### 产出

```text
deliverables/develop/
  develop.yaml          # 清单 + 验证摘要
  sql/
  etl/
  schedule/
  api/
  ops/
  tests/
```

`develop.yaml` 不是唯一交付物；多 SQL/ETL/schedule/API 都保留。

呈现：DevelopCard

- 产物清单；
- Build/Scan/Deploy/Test 状态；
- attempt/错误/修复；
- SE review / Committer merge；
- gaps/rollback；
- actions。

### 门禁 / Pass

- Build 通过；
- Scan 无 blocking；
- Deploy 开发环境通过；
- Test manual/mock 记录；
- SE review approved；
- Committer 评审通过并合入；
- 无 blocking gap；
- mustNotChange 未违反。

Pass 后：

```text
stage = cicd
approvals[gate=develop.code_review] = approved
approvals[gate=develop.merge] = merged
```

**Stage 4 ≠ Stage 5**：

- Stage 4 开发验证，结果用于反馈；
- Stage 5 线上标准 CICD，可信；
- 代码合入在两者之间。

## 10. Stage 5：CICD 数据制品流水线

详细设计：[stage-5-cicd.md](stage-5-cicd.md)

### 定位

Stage 5 跑的是**一条数据 CICD pipeline**，不是逐个环节手动操作；最终产出**制品包**。

```text
Stage 4 开发验证 + Committer 合入
→ Stage 5 一条 pipeline：build / scan / test / package
→ 制品包 + manifest + checksum
→ 外部发布平台：dev → sit → uat → beta → gamma
→ 后续验收/复盘暂不设计
```

### DataOps 负责

- 触发/记录 pipeline；
- 官方 build/scan/test/package；
- 生成制品包、manifest、checksum；
- 只读展示外部部署状态。

### 不负责

- 公司部署系统的审批；
- 外部发布平台的环境晋级；
- 生产发布执行；
- 回滚执行；
- DSH 原生发布审批。

### 呈现

`CICDCard`：

- pipeline run / commit / 整体状态；
- 制品包 / digest；
- build/scan/test/package 结果；
- 外部环境状态 dev→sit→uat→beta→gamma；
- 外部审批 ID/状态；
- 日志/manifest/报告；
- 无逐环节执行按钮，无 DataOps 发布/回滚按钮。

### Pass

- pipeline 成功；
- 制品包生成；
- manifest/checksum 完整；
- scan 无 blocking；
- 测试有记录；
- 无 blocking gap。

Pass 后 `stage=review`，后续 Stage 6 暂不设计。

## 11. Stage 6：验收/复盘（暂不设计）

当前只定边界：

- BA/需求方验收；
- 目标 vs 实际、问题、行动项、知识回写；
- US 关闭；
- 后续需要补：验收标准、复盘模板、US 回写、未达标处理；本批不设计。

## 12. 跨阶段机制

### Workitem

- 唯一状态载体；
- stage/substage/deliverables/gaps/approvals/next；
- 支持恢复，不靠聊天记忆。

### 交付物

- `deliverables/<stage>/...`；
- evidence 独立；
- 先生成文件，再 presenter 渲染卡片。

### 审批

- 内容签收：工作项 gate；
- 代码：SE review + Committer merge；
- 发布：外部准入/线上 CICD；
- 只有高风险动作走 DSH 原生 approval。

### Agent Team

```text
Lead / Orchestrator
  ├─ BA Agent
  ├─ SE Agent
  └─ Dev Agent
```

建议角色 owner + 活动 worker：

- 角色 owner 对阶段和交接负责；
- 活动 worker 做数据挖掘/方案/编码；
- 同阶段一个写者；
- 人类签收。

### DataMap / 血缘 / 质量

```text
DataMap：场景→主题→业务对象→逻辑实体→物理资产
        字段/owner/行数/assetType
独立血缘：表/ETL/调度/依赖
独立质量：空值/重复/覆盖/对账
```

不混用。

## 13. 贯穿案例

**US-3821 渠道日报支付口径**

```text
US 分配 BA
→ requirement：支付口径、3 个下游、pay_time 缺失
→ design：dws.trade_channel_daily / 渠道×日期 / dt+channel_id
→ 3a：支付/下单基线、候选来源、join 覆盖；发现 blocking → 3a blocked
→ 若 blockers 关闭：
   3b：改 dws，下游继承；备选只改 ads
   3c：ETL + 调度 + 一层上游血缘 + SLA 余量
   4：SQL/ETL/schedule/API + build/scan/deploy 回流
```

## 14. 当前完成度

已完成详细设计：

- Stage 0+1；
- Stage 2；
- Stage 3a/b/c；
- Stage 4；
- Stage 5；
- DesignCard/DataMap、TechPlan/Lineage 视觉稿；
- 用户旅程泳道图。

未完成：

- Stage 6 暂不设计；
- 真实 DataMap/血缘/调度/EDevOps 接入；
- 跨人签收、US 回写、Agent Team 产品化协同；
- 端到端实现（设计会话不做）。

## 15. 下一步

1. 用 US-3821 做端到端演示；
2. 再排真实平台接入。

## 16. 需要确认

1. US 驱动 + 工作项 + 阶段签收的方向；
2. 角色/审批边界；
3. Stage 4/5 的可信度分层；
4. DataMap/血缘/质量的分工；
5. 是否先做端到端演示，Stage 6 暂不设计。
