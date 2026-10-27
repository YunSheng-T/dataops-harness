---
name: dataops-deliverable-templates
description: 需求/设计/方案/开发/复盘阶段需要生成或更新阶段交付物时使用；由 Agent 产结构化 payload、写 deliverables 文件，再交给 present_deliverable 渲染。
---

# 交付物模板（需求 / 设计 / 方案 / 开发 / 复盘）

P2.3 起，需求、设计、方案、开发、复盘正文不再由内容工具生成。Agent 自己判断、组织内容，按本模板落盘，再交给展示桥。

## 何时用

- 需求阶段要产出需求卡
- 设计阶段要产出设计卡
- 方案阶段要产出分析/需求方案/技术方案卡
- 开发阶段要产出开发卡
- 复盘阶段要产出复盘卡
- 用户要求补/改需求、设计、方案、开发或复盘，且工作项已存在

不适用：排障正文；排障走 read_logs + pipeline-debug，P2.3 最后迁。

## 硬规则

1. 先读工作项和事实：`dataops_shared_read_workitem`、`dataops_shared_read_table`、`dataops_shared_read_lineage`、`dataops_shared_read_evidence`。
2. 内容由你写，不从旧内容工具取；不要调用 `dataops_requirement_extract_spec`、`dataops_design_compose_model`、`dataops_scheme_analyze_data`、`dataops_scheme_compose_solution`、`dataops_scheme_compose_tech_plan`、`dataops_develop_generate_code`、`dataops_review_write_postmortem`（P2.3 已从活动工具面移除）。
3. 先写 `deliverables/<stage>/<kind>.yaml`，再调 `dataops_shared_stage` 的 `prepare`；presenter 仅作兼容 fallback。
4. 缺证据写 `gaps`，不编造；`gaps` 同时进工作项和 payload。
5. 用户看的是卡和交付物，不是工具名。

## Requirement payload

```json
{
  "id": "REQ-3821",
  "title": "渠道日报改支付口径",
  "goal": "把渠道日报从下单口径改为支付口径",
  "scope": "dws.trade_channel_daily + ads.channel_report",
  "acceptance": ["支付口径与订单级对账可解释", "05:00 前产出"],
  "owner": "交易组",
  "priority": "P1",
  "impacts": ["table · dws.trade_channel_daily", "report · rpt.funnel"],
  "gaps": [
    { "id": "G-PAYTIME", "message": "缺支付时间字段", "severity": "blocking", "action": "确认支付流水或分区口径" }
  ]
}
```

必填：`title`、`goal`、`scope`、`acceptance`、`owner`。缺失就写 `gaps`，不要填“待确认”糊过去。

## Design payload

```json
{
  "status": "draft",
  "target": { "table": "dws.trade_channel_daily", "grain": "渠道 + 日期", "partition": "dt=${bizdate}" },
  "sources": [
    { "table": "dwd.orders", "fields": ["order_id", "channel_id", "amount"], "filter": "status in (...)" }
  ],
  "steps": [
    { "title": "过滤支付成功订单", "logic": "按 status 过滤，保留可对账字段" },
    { "title": "按渠道聚合", "logic": "order_cnt / gmv 按 dt + channel_id 汇总" }
  ],
  "schedule": { "cron": "0 5 * * *", "sla": "05:00" },
  "metrics": [
    { "name": "order_cnt", "definition": "支付成功订单数" }
  ],
  "impact": { "count": 3, "top": [{ "table": "ads.channel_report", "type": "table" }], "truncated": false },
  "gaps": []
}
```

必填：`target.table`、`target.grain`、`target.partition`、`sources`、`steps`、`schedule`、`metrics`。
`impact` 来自血缘；没读到就 `null` 并加 gap。


## Develop / CICD payload

- 开发：`deliverables/develop/develop.yaml` + `sql/`、`etl/`、`schedule/`、`api/`、`ops/`、`tests/`。`develop.yaml` 是清单 + validation 摘要，不是唯一产物；含 artifacts/validation/tasks/review/merge/mustNotChange/rollback/gaps。
- CICD：`deliverables/cicd/cicd.yaml` + `artifact/`（tar.gz、manifest、checksums）、`reports/`、`release/deployment-status.yaml`；含 pipelineRunId、pipeline、artifact、externalDeployment、gaps。阶段 5 不出现 DSH approval。

## 方案 payload

方案阶段产三份交付物，顺序是 **分析 → 需求方案 → 技术方案**；每份都先落盘再 presenter，不要用一个超大工具调用代替。

### Analysis

```json
{
  "question": "支付口径与下单口径差多少",
  "baseline": [
    { "metric": "order_cnt", "before": "下单口径", "after": "支付口径", "delta": "待对账" }
  ],
  "findings": [
    { "title": "支付时间缺失", "detail": "dwd.orders 无 pay_time，跨日支付会归到下单日", "severity": "warning" }
  ],
  "conclusion": "口径可切，但需补支付时间或明确 dt 归属",
  "gaps": []
}
```

### Solution

```json
{
  "target": "渠道日报支付口径",
  "scope": "dws.trade_channel_daily + ads.channel_report",
  "decisions": [
    { "decision": "口径改在 dws", "reason": "下游继承，避免 ads 维护第二套逻辑" }
  ],
  "alternatives": [
    { "option": "只在 ads 改", "tradeoff": "影响面小，但下游 API 继续用旧口径" }
  ],
  "gaps": []
}
```

### Tech Plan

```json
{
  "tasks": [
    { "platform": "ETL", "name": "订单过滤 + 渠道聚合" },
    { "platform": "调度", "name": "日任务 + 回刷" }
  ],
  "estimate": "2 人日",
  "risks": ["支付时间缺失", "渠道映射未补齐"],
  "gaps": []
}
```

落盘：

```text
workitems/<id>/deliverables/scheme/analysis.yaml
workitems/<id>/deliverables/scheme/solution.yaml
workitems/<id>/deliverables/scheme/tech-plan.yaml
```

方案三件套都叫 `stage: scheme`，`kind` 分别是 `analysis`、`solution`、`tech_plan`。
事实/证据/血缘仍用只读工具读取；方案判断、取舍和正文由你写。


## 开发 / 复盘 payload

### Develop

```json
{
  "target": "dws.trade_channel_daily",
  "status": "in_progress",
  "branch": "feat/channel-pay-caliber",
  "tasks": [
    { "name": "支付成功过滤 + 渠道聚合", "status": "done", "progress": 100, "owner": "数据开发" },
    { "name": "补渠道映射", "status": "blocked", "progress": 70, "owner": "交易组" }
  ],
  "blockers": [
    { "message": "dim.channel 缺 3 个渠道映射" }
  ],
  "gaps": []
}
```

同时落 `deliverables/develop/change.sql`，由你写 SQL，再交 `sql-review` 自查；不要直接写生产。

### Postmortem

```json
{
  "target": "渠道日报支付口径切换",
  "summary": "mock 发布完成，差异 0.12%，高于需求验收 0.1%",
  "metrics": [
    { "name": "对账差异", "actual": "0.12%", "target": "0.1%" }
  ],
  "issues": [
    { "title": "验收阈值未达标", "severity": "warning" }
  ],
  "actions": [
    { "action": "回写 0.1% / 0.5% 阈值口径", "owner": "需求方", "due": "下个迭代" }
  ],
  "gaps": []
}
```

复盘只写事实：目标 vs 实际、问题、行动项 owner/期限、知识回写；没有运行数据就写待确认。

## 落盘

```text
workitems/<id>/deliverables/requirement/requirement.yaml
workitems/<id>/deliverables/design/design.yaml
workitems/<id>/deliverables/scheme/analysis.yaml
workitems/<id>/deliverables/scheme/solution.yaml
workitems/<id>/deliverables/scheme/tech-plan.yaml
workitems/<id>/deliverables/develop/develop.yaml
workitems/<id>/deliverables/develop/change.sql
workitems/<id>/deliverables/review/postmortem.yaml
```

文件内容 = payload + 可选的 `kind`/`stage`；不要把整个思考过程塞进去。旧工作项的 flat 路径仍可读，新写入用阶段子目录。

## 展示

```text
dataops_shared_present_deliverable({
  kind: "requirement",
  stage: "requirement",
  deliverable: "deliverables/requirement/requirement.yaml",
  status: "draft",
  payload: <上面 payload>,
  gaps: <payload.gaps>
})
```

设计把 `kind` 换成 `design`、`stage` 换成 `design`、`deliverable` 换成 `deliverables/design/design.yaml`。
方案三件套把 `kind` 换成 `analysis` / `solution` / `tech_plan`，`stage` 都换成 `scheme`，路径换成对应文件。
开发把 `kind` 换成 `develop`、`stage` 换成 `develop`、`deliverable` 换成 `deliverables/develop/develop.yaml`；复盘把 `kind` 换成 `postmortem`、`stage` 换成 `review`。

## 自查

- 每条结论能追到 `evidence/ev-*.yaml` 或明确 gap
- 验收可验证，不写“符合预期”
- 设计有粒度/分区/来源/调度/口径
- 方案有分析、取舍、任务、工时、风险、回滚
- 开发有代码、任务进度、阻塞 owner
- 复盘有目标 vs 实际、问题、行动项
- 影响面有数量或 gap
- 调 presenter 后，工作项用 `dataops_shared_update_workitem` 记录 stage/status/deliverables/next
- 不暴露工具名给用户
