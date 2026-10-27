---
name: schedule-yaml
description: 技术方案已确认、需要生成/校验调度 spec 或调度 YAML 时使用；Agent 产归一化 spec，CICD 调内部 `dataops compile` 编译，产出 YAML、诊断与评审清单。
---

# 调度 spec / YAML

## 何时用

- 技术方案已确认，需要把任务、依赖、SLA 落成调度配置
- 需要检查一份已有调度 spec/YAML 的依赖、cron、分区窗口
- CICD 编译前，需要解释 `dataops compile` 的诊断

不适用：调度平台故障排查（用 `pipeline-debug`）、纯 SQL 评审（用 `sql-review`）。

## 先取事实（缺什么先问，不要猜）

1. 平台/版本/方言（内部调度、Airflow、DolphinScheduler 等）
2. design、tech-plan、任务 ID 与依赖方向
3. cron、时区、起止时间、SLA、回刷/补数语义
4. 分区宏、并发、重试、超时、资源队列
5. 环境、owner、密钥引用方式
6. 内部 CLI 的调用方式：`dataops compile <artifact>`

## 流程

1. **Agent 读上游产物**：只读 design/tech-plan，列出缺口，不编造任务。
2. **Agent 生成归一化 `schedule-spec`**：任务、依赖、参数、SLA 分开写；保留来源和 as_of。
3. **静态自检**：重复 ID、依赖环、缺失上游、cron/时区、分区宏、owner、secret。
4. **调用 `dataops_cicd_compile`**：
   - mock 模式返回预编译的 `schedule.yaml` + diagnostics
   - 真实模式由 tool 调用内部 CLI `dataops compile <artifact>`；tool 不回调 Agent
5. **解释诊断**：阻断项停下；警告项给修复建议；不把 mock 产物说成可部署。
6. **输出评审清单**：spec、YAML、诊断、待确认项；不部署。

## 判定口径

- **阻断**：依赖环、重复 ID、引用不存在的任务、cron 不合法、缺 owner、明文 secret。
- **需修改**：分区窗口/SLA 与上游不一致、retry/并发未定义、空渠道等质量缺口未登记。
- **建议**：补注释、补监控、统一命名。

## 输出格式

```
结论：通过 / 有条件通过 / 驳回
归一化 spec：<路径或摘要>
编译结果：<dataops compile exitCode / mock>
诊断：<error/warning 逐条>
待确认：<平台方言 / 任务 ID / SLA 窗口>
不部署声明：本结果只是草稿，执行在外部调度/CICD。
```

## 反例

- 让模型直接自由生成最终 YAML，不经过 compile/validate。
- 把 `dataops_cicd_compile` 说成“生成方案”的工具；方案是 Agent 产的。
- 缺平台/版本就编造方言和 operator。
- 把 mock 编译产物说成已部署。

## 工具

- `dataops_shared_read_table` / `dataops_shared_read_lineage`：确认表/依赖；不可用时让用户提供。
- `dataops_scheme_compose_tech_plan`：读技术方案。
- `dataops_cicd_compile`：mock 或内部 CLI 编译；真实命令 `dataops compile <artifact>`。
