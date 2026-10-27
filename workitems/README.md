# Workitems

跨多轮、会产生交付物的任务放在这里。模板在 `_template/`，不要直接修改模板。

```text
workitems/<YYYY-MM-DD>-<slug>/
  item.yaml      # 总状态 + 6 阶段投影 + gaps + approvals
  intent.md      # 目标 / 为什么 / 验收 / 不做什么
  plan.md        # 阶段清单 + 变更日志
  deliverables/  # 阶段交付物（需求、设计、方案、代码、报告）
  artifacts/     # 仅 CICD 构建制品（兼容旧工作项）
  evidence/      # 每条结论的证据
  decision.md    # 审批记录（有审批才写内容）
```

`item.yaml` 的 `status` 沿用 `workitem-protocol` 的总状态；`stage`/`stages` 是 DataOps 6 阶段投影。阶段推进时同时更新 `updated_at`、对应 stage、`plan.md` 和 `next`。

单次查询/解释不建工作项。

> **术语迁移**：P1 阶段产物目录叫 `artifacts/`；P2.2 起新工作项使用 `deliverables/`；`artifact` 只保留给 CICD 构建制品。P2 读工具兼容旧 `artifacts/`。
