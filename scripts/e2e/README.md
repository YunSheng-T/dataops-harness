# P1.4 自然语言 E2E

本地验收脚本：启动 DataOps profile + headless Chrome，驱动真实 Web 输入、DSH 原生审批和工作项文件。

## 前置

- 已安装 `dataops` profile，并默认 **数据开发模式**
- Chrome 可用（默认 `/Applications/Google Chrome.app/...`，可用 `CHROME_PATH` 覆盖）
- 本地 profile 已有模型凭据
- 脚本会创建 `workitems/` 测试工作项；成功后默认删除，`--keep` 保留

## 运行

```sh
# 只读影响面，不应创建 workitem
node scripts/e2e/dataops-p1.4.mjs --scenario query

# 完整流程：原生审批点“允许一次”，应 returned released
node scripts/e2e/dataops-p1.4.mjs --scenario full-allow

# 完整流程：原生审批点“拒绝”，应 rejected/未发布
node scripts/e2e/dataops-p1.4.mjs --scenario full-reject

# 排障旁路：read_logs + pipeline-debug + incident 交付物
node scripts/e2e/dataops-p1.4.mjs --scenario incident

# P3 USPicker：列表 → 开始处理 → 普通用户轮次 → workitem source
node scripts/e2e/dataops-p1.4.mjs --scenario us-picker

# P3 current gate dock：turnTail 可见 → 按钮写入唯一草稿 → requirement 签收
node scripts/e2e/dataops-p1.4.mjs --scenario ui-dock
```

`full-*` 用 `DSH_PERMISSION_MODE=workspace-write`（approval ask）；`danger-full-access` 下 policy=never，release 会 fail closed，这是预期行为。

## 断言

- 用户提示词不含 `dataops_*`
- 新建 delivery workitem，六阶段字段齐全
- 所有 artifact/evidence 引用存在
- 审批结果写回 `approvals[release]`
- allow：`approved` / released；reject：`rejected` / 未发布
- 最终回答不暴露工具名
- query 不创建 workitem
- incident 创建/更新工作项，产出 `deliverables/incident.yaml`，不暴露工具名

报告和截图写到 `prototype/shots/p1.4-*`。

> 这是本地验收，不是 CI；会调用真实模型并依赖交互式审批。
