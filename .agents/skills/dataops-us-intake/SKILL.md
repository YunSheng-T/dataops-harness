---
name: dataops-us-intake
description: 用户说处理 US、我的 US、选一个任务时使用；拉取 USPicker、读取详情、按 source 去重建/恢复工作项。
---

# US 接单

## 触发

- “处理 US-3821”
- “看看我的 US / 待我处理的 US”
- “选一个任务开始”

## 流程

1. 用户没给 ID：调用 `dataops_shared_read_us`（只读），工具结果直接渲染 `USPickerCard`。
2. 用户给了 ID：用 `id` 读详情。
3. 用户选中或给出 US 后，调用 `dataops_shared_read_us({ id })` 读完整字段。
4. 按 `source.system + source.id` 调 `dataops_shared_ensure_workitem`：已有恢复，不新建；没有按 US 状态映射初始 stage。
5. 调 `dataops_shared_present_deliverable`，`kind=intake`、`stage=requirement`、`deliverable=deliverables/intake.yaml`，展示接单摘要。
6. 进入 requirement 阶段，加载 `dataops-requirement`。

## 边界

- 不写 US 状态/评论；不直接调用 CLI。
- 不从标题去重，只认 `source.system + source.id`。
- 用户没有选择 US 之前不创建 workitem。
- USPicker 的“开始处理”只把“处理 US-xxx”写进输入框，由用户发送；不要假装已经选中。
