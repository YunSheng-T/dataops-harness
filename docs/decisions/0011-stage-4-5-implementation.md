# 0011 · Stage 4 / Stage 5 实现决策

- 日期：2026-10-27
- 状态：已实施中
- 关联：[Stage 4 设计](../design/user-journey/stage-4-develop.md) · [Stage 5 设计](../design/user-journey/stage-5-cicd.md) · [蓝图](../../prototype/stage-4-5-blueprint.html)

## 范围

实现从 US 接单到 Stage 5 的连续演示；Stage 6 不实现。所有平台数据 mock，不接 EDevOps/DataMap/血缘/调度/质量/发布平台。

## 决策

1. Stage 4 使用 `develop` payload + `DevelopCard`：
   - 多产物清单（sql/etl/schedule/api/ops/tests）；
   - build/scan/deploy/test attempt 及回流；
   - SE review gate=`develop.code_review`；Committer merge gate=`develop.merge`；
   - DataOps 不执行 merge。
2. `develop.merge` 通过后 stage 才进入 `cicd`；未合入不能触发 Stage 5。
3. Stage 5 使用一条 `dataops_cicd_pipeline`，不暴露逐环节按钮：
   - build/scan/test/package 一次运行；
   - 产物 `dataops-<target>-<version>.tar.gz` + manifest/checksum；
   - 外部环境 dev→sit→uat→beta→gamma 只读；
   - 外部环境状态不是 DataOps pass 条件。
4. Stage 5 **不使用 DSH 原生 approval**，不提供发布/回滚按钮；外部审批由公司发布平台负责。
5. Stage 5 pass 以 pipeline 成功 + 制品包生成为界；`stageComplete` 只把 workitem 标为 cicd done，不进入 Stage 6。
6. 新增活动工具 `dataops_shared_read_develop` 和 `dataops_cicd_pipeline`；新增 client toolview 2 个。legacy `dataops_cicd_release` 保留兼容但不得用于 Stage 5。
7. 阶段 runtime 增加 develop/cicd gate 与 role 归一（`se`→`SE`、`committer`→`Committer`）。

## 失败/回流

- Stage 4 build/scan/deploy/test 失败：记录 attempt，回 Dev 修复，重跑；不推进。
- SE reject：回 Dev；Committer reject：回 Dev；不进入 CICD。
- Stage 5 pipeline 失败：回 Stage 4 修 → 重新合入 → 新 pipeline；DataOps 不执行外部环境回滚。
- 外部环境失败/审批拒绝：只记录，不改变 DataOps pipeline pass。

## 迁移

- 旧 `release` gate 从 workitem 模板移除（check 会拒绝）；
- 旧 `dataops_cicd_release` 工具保留，但 skill/preset 明确禁用；
- 旧 P1/P2 卡片保留，新增 payload 字段向后兼容。
