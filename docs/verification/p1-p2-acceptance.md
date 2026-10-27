# P1 + P2 验收清单

> 目标：一次把 P1 的交付链和 P2 的工具收敛验证完。
> 适用版本：当前工作区；mock provider；本地模型凭据。
> 结论只看行为、状态和文件，不拿模型措辞当契约。

## 0. 先跑静态门禁

```sh
cd /Users/zhangshu/code/dataops-harness

node scripts/install-dataops-profile.mjs
node scripts/check-dataops-preset.mjs
node scripts/check-dataops-workitem.mjs

node packages/dataops-tools/scripts/check.mjs
node packages/dataops-tools/scripts/smoke-apply.mjs
node packages/dataops-tools/scripts/provider-check.mjs

node packages/dataops-client/scripts/build.mjs
node packages/dataops-client/scripts/check.mjs
node packages/dataops-client/scripts/smoke-apply.mjs
```

通过标准：

- preset：`dataops preset ok`
- workitem：`dataops workitem ok`
- tools：包含 `P2.3c active surface is the target 12 tools`
- tools smoke：16 个活动工具，**不含** 8 个旧内容工具
- client smoke：**11 个 toolview**
- client check：所有卡片/store/brief 断言通过
- 所有命令 exit code 0

## 1. P1 验收点

### P1.1 数据开发模式

- [ ] profile 安装成功
- [ ] 菜单出现 **数据开发模式**
- [ ] 默认 preset 是 `dataops-dev`
- [ ] 新会话不是裸 coding agent，而是 DataOps Lead

命令：

```sh
node scripts/check-dataops-preset.mjs
```

### P1.2 工作项 v0

- [ ] `workitems/_template/` 存在 item/intent/plan/decision
- [ ] `item.yaml` 有 status + stage/stages + gaps/approvals/next
- [ ] 新交付物写 `deliverables/`
- [ ] 旧 `artifacts/` 样例仍可读
- [ ] 新会话能恢复已有工作项，不重复问已确认信息

命令：

```sh
node scripts/check-dataops-workitem.mjs
```

### P1.3 原生发布审批

- [ ] release 前出现 DSH 原生审批
- [ ] 点“允许一次”：`released` / `allowed-once`
- [ ] 点“拒绝”：`rejected`，不得出现“已发布”
- [ ] 审批不可用/取消：fail closed
- [ ] 结果写回 `approvals[release]`

自动覆盖：

```sh
node packages/dataops-tools/scripts/check.mjs
```

关注：`release gate only executes after allowed-once approval`。

### P1.4 自然语言全流程

- [ ] 用户提示不含任何 `dataops_*`
- [ ] 自动建 delivery 工作项
- [ ] 六阶段字段齐全
- [ ] 引用文件存在
- [ ] 最终回答不暴露工具名
- [ ] allow/reject 路径正确

E2E：

```sh
node scripts/e2e/dataops-p1.4.mjs --scenario query
node scripts/e2e/dataops-p1.4.mjs --scenario full-allow
node scripts/e2e/dataops-p1.4.mjs --scenario full-reject
```

注意：`full-*` 需要本地模型凭据，会启动 headless Chrome + DSH；不是 CI。  
报告在 `prototype/shots/p1.4-*-report.json`，`failures` 必须为空。

## 2. P2 验收点

### P2.1 Presenter + DeliverableRenderer

- [ ] `dataops_shared_present_deliverable` 只校验/透传，不生成内容
- [ ] 非法 kind/stage/路径/payload/status 被拒绝
- [ ] 8 类 deliverable 能按 kind 分发到现有卡
- [ ] 卡片“查看产物”能读到 `deliverable` 路径
- [ ] 事实/CICD 卡仍按原 toolview 工作

自动覆盖：

```sh
node packages/dataops-tools/scripts/check.mjs
node packages/dataops-client/scripts/check.mjs
```

关注：`deliverable presenter validates and flattens payload`、`deliverable renderer dispatches by kind`。

### P2.2 工作项 / 日志工具

- [ ] `read_workitem` 能读新/旧工作项
- [ ] `update_workitem` 只接受允许字段
- [ ] 非法 stage/status/路径被拒绝
- [ ] 原子写 + `plan.md` 追加
- [ ] `dryRun: true` 不改文件
- [ ] `read_logs` 只给信号，不返回根因结论

自动覆盖：

```sh
node packages/dataops-tools/scripts/check.mjs
```

关注：`workitem read/update validates and writes deliverables`、`read logs returns signals without root cause`。

### P2.3 内容迁移

- [ ] 需求/设计/方案/开发/复盘不再调旧内容工具
- [ ] 内容由 Agent + `dataops-deliverable-templates` / `pipeline-debug` 生成
- [ ] 交付物落在 `deliverables/`
- [ ] 8 类交付物统一经 presenter
- [ ] 排障走 `read_logs` + `pipeline-debug`，不用 `incident_triage`
- [ ] 最终回答不暴露工具名

E2E：

```sh
node scripts/e2e/dataops-p1.4.mjs --scenario full-allow
node scripts/e2e/dataops-p1.4.mjs --scenario full-reject
node scripts/e2e/dataops-p1.4.mjs --scenario incident
```

关注：

- 新工作项 `deliverables/`
- 需求/设计/方案/开发交付物实际存在
- incident 交付物存在
- allow/reject 正确
- `failures` 为空

### P2.4 工具面收口

- [ ] 活动工具面 **16**（P3 新增 4 个）
- [ ] 客户端 toolview **11**
- [ ] 旧内容工具不注册到 profile
- [ ] 旧内容 toolview 不再注册
- [ ] 旧代码只作为 legacy fixture；活动面看不到
- [ ] release 仍是原生审批

自动覆盖：

```sh
node packages/dataops-tools/scripts/smoke-apply.mjs
node packages/dataops-client/scripts/smoke-apply.mjs
```

期望：

- tools smoke：16 个活动工具
- client smoke：11 个 toolview

## 3. 手动 UI 验收

重启：

```sh
dsh --profile dataops
```

逐项看：

1. 模式菜单显示 **数据开发模式**，且是默认。
2. 用业务语言发一句：
   `帮我把渠道日报从下单口径改成支付口径，走完整流程，发布前停下来审批。`
3. 检查：
   - 没有 `dataops_*` 出现在回答里
   - 阶段 chip / 轮末 brief 正常
   - 需求/设计/方案/开发卡正常
   - 右栏资产/血缘/证据标签可打开
   - 方案卡弹窗能显示交付物路径
4. 到 release：
   - 原生审批出现
   - 允许一次 → released
   - 拒绝 → rejected，且没有“已发布”
5. 新开一个会话，让它继续同一工作项：
   - 能恢复阶段
   - 不重复问已确认信息
6. 排障：
   - 输入 `dws.trade_channel_daily 05:00 批次失败，帮我排障`
   - 能看到 incident 卡
   - 时间线/根因/处置来自证据，不出现旧 incident 工具名
7. 浏览器 DevTools：
   - Console 无 error
   - 页面无异常横向滚动

## 4. 当前已知边界

- 复盘卡有 renderer 单测，但完整 review 阶段还没有单独的 full e2e。
- `query` 在 P2.4 后没有重跑；只读路径未改，之前已 PASS。
- 真实 provider 未接；当前全部是 mock。
- 8 个旧内容工具仍在代码/测试 fixture 中，活动 profile 不注册；P2.4 只做活动面收口。
- P1 样例工作项仍使用旧 `artifacts/`，用于验证兼容读取；新工作项使用 `deliverables/`。

## 5. 证据索引

- P1 总结：`docs/design/p1-summary.md`
- P2 设计：`docs/design/p2-tool-convergence.md`
- P2 计划：`docs/design/p2-plan.md`
- ADR 0005：`docs/decisions/0005-deliverable-renderer-tool-convergence.md`
- P2 蓝图：`prototype/p2-tool-convergence-blueprint.html`
- P2 增量：`prototype/p2-tool-convergence-blueprint-delta.html`
- E2E 报告：`prototype/shots/p1.4-full-allow-report.json`、`p1.4-full-reject-report.json`、`p1.4-incident-report.json`
