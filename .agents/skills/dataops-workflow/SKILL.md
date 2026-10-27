---
name: dataops-workflow
description: 用户用业务语言提出数据需求、改表、建模、发布或验收时使用；从需求建立工作项，自动按 0+1 → Stage 5 推进并调用所需能力，遇到审批门禁停下，不要求用户说工具名。
---

# DataOps 工作流

## 入口

用户说“帮我改一张表”“把这个口径改掉”“新建一个模型”“按需求走到发布”“看看这个任务为什么失败”时使用。

**不要问用户：你想调用哪个工具？**
用户只负责业务目标、范围、验收和时间；工具选择是你的职责。

## 先判断任务类型

| 用户意图 | 走到哪 |
|---|---|
| 只问一个事实/影响面 | 共享事实 + 证据，不建全流程 |
| 一个完整需求 | 需求 → 设计 → 方案 → 开发 → CICD（Stage 6 不在本版） |
| 已有设计，要求实现 | 从方案/开发开始，先核对上游产物 |
| 发布/变更 | CICD + 审批门禁；不直接写生产 |
| 故障/延迟/数据不对 | 排障旁路；read_logs → pipeline-debug → incident 交付物；先止血、再根因 |
| 处理 US / 我的 US | 加载 `dataops-us-intake`，读 USPicker → ensure workitem → 需求 |

## 工作项

跨多轮、会产生交付物的任务，先建/恢复 `workitems/<YYYY-MM-DD>-<slug>/`。模板见 `workitems/_template/`：

```text
item.yaml      # status + stage/stages + gaps/approvals/next
intent.md      # 目标/为什么/验收/不做什么
plan.md        # 阶段清单 + 变更日志
deliverables/  # 阶段交付物
evidence/      # 证据
decision.md    # 审批记录
```

启动时先调 `dataops_shared_read_workitem`；不传 id 时列出可用工作项。按工单、资产或 slug 匹配；匹配到就恢复，不要重新问已确认的信息。工具不可用或找不到时再读 `workitems/*/item.yaml`。

每次阶段推进：

1. 调 `dataops_shared_update_workitem` 更新 `stage` / `stages[stage]` / `substage`
2. 同一 patch 更新 `deliverables`、`gaps`、`next`；不确定时先 `dryRun: true`
3. 工具会在 `plan.md` 追加一行：时间 + 变更 + via update
4. 发布前把 `approvals[gate=release].status` 置为 `pending`，停下来等人确认

不确定交付物或只问一句时，不强行建目录。

## 推进规则

1. **需求**：加载 `dataops-requirement` 和 `dataops-deliverable-templates`；读用户描述/事实，提取目标、范围、验收、owner、时间；产 `deliverables/requirement.yaml` 并调 `dataops_shared_present_deliverable`。不要调用已下线的需求内容工具。缺关键项就问 1 个最关键的问题。
2. **设计**：加载 `dataops-design`，用 `dataops-deliverable-templates` 产 `deliverables/design.yaml`，给粒度、主键、来源、分区、指标口径、影响面，再调 `dataops_shared_present_deliverable`。证据不足标 `gaps`，不编造。
3. **方案**：加载 `dataops-analysis`、`dataops-solution`、`dataops-tech-plan`，按分析 → 需求方案 → 技术方案推进；分别产 `deliverables/analysis.yaml`、`solution.yaml`、`tech-plan.yaml` 并调 presenter。技术方案要包含任务、依赖、SLA、平台、回滚。不要调用已下线的方案内容工具。
4. **开发验证**：加载 `dataops-develop`。先生成多产物（sql/etl/schedule/api/ops/tests），`develop.yaml` 只做清单+验证摘要。用 `dataops_shared_read_develop` 读 mock 事实；build/scan/deploy/test 失败要记录 attempt、回流和修复动作，不能只做 happy path。SE 评审用 gate=`develop.code_review`；Committer 合入用 gate=`develop.merge`，DataOps 不执行 merge。
5. **数据 CICD**：加载 `dataops-cicd`。确认已合入后，调一次 `dataops_cicd_pipeline`；展示 pipeline run、制品包/manifest/checksum、日志和外部环境只读状态。**不使用 DSH 原生 approval，不执行部署/发布/回滚**；外部环境状态不是 DataOps 门禁。
6. **Stage 6**：本版不实现，不展示复盘页面。

## 工具怎么用

工具是内部能力，不是用户界面。根据当前阶段选择只读事实、分析/方案、开发、CICD、复盘能力；一次只做当前阶段需要的事。

- 事实/证据：表、血缘、证据、画像
- 需求/设计：Agent + `dataops-deliverable-templates` 生成，presenter 展示
- 方案：Agent + `dataops-deliverable-templates` 生成分析/需求方案/技术方案，presenter 展示
- 开发：Agent + `dataops-deliverable-templates` + `sql-review` 生成代码/开发交付物，presenter 展示
- 开发验证：`dataops_shared_read_develop` + 多产物 + attempt
- CICD：`dataops_cicd_pipeline` 一条 pipeline + 制品包；外部环境只读
- 复盘：Agent + `dataops-deliverable-templates` 生成复盘交付物，presenter 展示
- 排障：`dataops_shared_read_logs` + `pipeline-debug`，产 `deliverables/incident.yaml`，presenter 展示；不要调用已下线的 `dataops_incident_triage`

`dataops_cicd_compile` 是 CICD 编译：mock 返回预编译 YAML，真实模式调内部 `dataops compile`；**tool 不回调 Agent**。

`dataops_cicd_release` 是 P2 legacy，不得用于 Stage 5。Stage 5 不接 DSH approval；外部部署审批由公司发布平台负责。

## 什么时候停

- 真实发布/部署、T3/T4 写操作：交外部系统，DataOps 不执行
- 证据不足却要下结论：停下来要数据/口径
- 上游产物缺失或冲突：先对齐，不硬做下游
- 用户只问事实：给结论 + 证据，不擅自开全流程
- 真实平台未接：说明 mock/只读边界，不把演示数据说成生产结论

## 输出

每阶段只给：当前阶段、关键结论、证据/产物、阻塞/待确认、下一步。
不要逐条复述内部工具名；用户看到的是阶段和产物，不是 tool 目录。

## 反例

- 用户说“帮我改渠道日报”，先回“请调用 dataops_xxx”。
- 一上来把 18 个工具全部调用一遍。
- 没有审批就发布。
- 把 mock 数据当生产结论。
