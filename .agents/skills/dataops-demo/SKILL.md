---
name: dataops-demo
description: 用户要演示 DataOps 工作台的 6 阶段流程或排障场景时使用；按 P2 交付物路径走 mock 演示，不写业务系统。
---

# DataOps Demo（P2）

## 何时用

用户说「跑一遍完整演示」「走 6 个阶段」「演示排障」「用 mock 数据看看」时。

## 6 阶段

默认 `scenario=channel-report`，按 `dataops-workflow` 推进，不跳过：

1. 需求：用 `dataops-deliverable-templates` 产 `deliverables/requirement.yaml` → presenter
2. 设计：产 `deliverables/design.yaml` → presenter
3. 方案：
   - 分析：`deliverables/analysis.yaml`
   - 需求方案：`deliverables/solution.yaml`
   - 技术方案：`deliverables/tech-plan.yaml`
   - 都走 presenter
4. 开发：产 `deliverables/change.sql` + `deliverables/develop.yaml` → presenter；用 `sql-review` 自查
5. CICD：
   - 扫描：`dataops_cicd_scan`
   - 编译：`dataops_cicd_compile`
   - 测试：`dataops_cicd_test`
   - 发布：`dataops_cicd_release`（必须走 DSH 原生审批）
6. 复盘：产 `deliverables/postmortem.yaml` → presenter

不要把内容阶段交给已下线的旧内容工具；事实用 `dataops_shared_read_table` / `_lineage` / `_evidence` / `_profile`。

## 排障

另开会话：

1. `dataops_shared_read_logs` 取信号
2. `pipeline-debug` 判断时间线/根因/处置
3. 产 `deliverables/incident.yaml` → presenter

不调用 `dataops_incident_triage`。

## 边界

- 所有数据是 mock；明确说不是生产结论。
- 发布审批拒绝/取消/不可用时不说“已发布”。
- 不调用写平台接口，不创建真实任务。
- 6 阶段和排障都要给阶段/交付物/证据/gaps 的摘要，不逐条复述工具名。
