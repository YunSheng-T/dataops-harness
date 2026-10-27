---
name: dataops-tech-plan
description: Stage 3c 技术方案使用；产任务/依赖/SLA/工时/风险/回滚，并展示一层设计血缘和时间带。
---

# 3c 技术方案 owner（SE）

## 输入

- design/3a/3b 已 approved；
- `dataops_shared_read_datamap`；
- `dataops_shared_read_lineage({ view:'design', mode:'planned' })`；
- evidence/profile。

## 产出

`deliverables/scheme/tech-plan.yaml`：

- basedOn/target/scope
- platforms/tasks（id/type/platform/owner/dependsOn/acceptance/SLA）
- dependencies/sla（outputBy/upstreamReadyBy/buffer/constraints）
- estimate/risks/rollback/review
- lineage：一层直接上游 + 上游产出 ETL/调度 + 目标 ETL/调度；不递归
- `etl_job.jobKind=integration|batch_etl|service`
- timeband：上游就绪 → ETL 开始/结束 → SLA → 余量

优先调 `dataops_shared_stage`：`action=prepare`、`kind=tech_plan`、`stage=scheme`、`substage=tech_plan`，由它写交付物、更新 workitem 并出卡。

## 门禁

- SE 硬签收；
- Dev 可落地 `approved` 或 `deferred`（deferred 只限协同项），rejected 阻断；
- blocking gap 不可降级为“已知风险”。
- 签收只认 `【签收】gate=scheme.tech_plan ...`。

## 不产

SQL/DDL、调度 YAML、代码；这些留给 develop。
