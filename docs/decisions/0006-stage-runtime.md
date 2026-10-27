# 0006 · Stage runtime：把出卡、工作项和签收收成一个确定性动作

- 日期：2026-10-27
- 状态：已实施（P3 mock）
- 关联：[0–3 实施蓝图](../../prototype/stage0-3-implementation-blueprint.html) · [Agent/Skill 设计](../design/user-journey/agent-skill-design.md) · [实现状态](../design/user-journey/implementation-status.md)

## 背景

P2 的 presenter 只负责“校验 payload + 发 toolview”，`update_workitem` 负责状态写回，签收由 Agent 在收到用户消息后自行调用 update。P3 live 验证暴露出问题：

- Agent 可能先写文件，但漏调 presenter，用户看不到阶段卡；
- Agent 可能出卡，但漏写 stage/deliverables/approvals；
- 签收动作没有固定状态机，容易停在“BA 已签、需求方未签”；
- 让模型自由组合三步，跨 5 个阶段时明显不稳定。

## 决策

新增 Host 工具 `dataops_shared_stage`，作为 **stage runtime**：

- `prepare`：一次完成“写交付物文件 + 更新 workitem 的 stage/deliverables/gaps/next + 返回阶段 payload”。
- `signoff`：接收 UI 消息中的 `gate/role/actionId/actor`，校验当前 gate 顺序和角色，写 approval；全部必需角色签收后推进 stage。
- `status`：读取工作项，给 Agent 继续推进用。
- Client 新增 `StageResultCard`：prepare 返回内容 payload 时委托 `DeliverableRenderer`；signoff 返回 workitem 时显示一张阶段状态小卡。
- 旧 `dataops_shared_present_deliverable` / `dataops_shared_update_workitem` 保留兼容，不删除。

活动面从 15 → 16，客户端 toolview 10 → 11。

## 不变量

- 内容仍由 Agent/skills 产，stage runtime 不生成方案正文。
- signoff 必须带 `via='ui'` 和 `actionId=ui-...`；Agent 不能自签。
- 签收顺序由工具强制：requirement → design → scheme.analysis → scheme.solution → scheme.tech_plan。
- 3a 的 `status=blocked` 或 blocking gaps 未关闭时，signoff 被拒绝。
- 所有 mock 数据继续带 mock 标记，不冒充生产。

## 备选与拒绝

1. **继续让 Agent 自由调 presenter + update**：live 不稳定，拒绝。
2. **客户端按钮直接调 Host tool**：违反 P2 的“卡片动作只发用户消息”边界，拒绝。
3. **把内容生成塞进工具**：会破坏 presenter 只读/内容归 Agent 的边界，拒绝。

## 迁移

- 新阶段写入继续用 `deliverables/<stage>/<name>.yaml`。
- 旧 flat `deliverables/*.yaml` 和 `artifacts/` 仍可读。
- 新 Agent 优先用 stage runtime；presenter/update 作为兼容 fallback。
- 真实平台 adapter 接入后，stage runtime 的 source 写入需要接权限/身份服务；当前 mock actionId 不是密码学认证。

## 验证

- `dataops-tools/scripts/check.mjs`：stage prepare 写文件/workitem；requirement BA+requester 签收后进入 design；gate 顺序拒绝。
- `dataops-client/scripts/check.mjs`：StageResultCard 委托 RequirementCard。
- `dataops-p1.4.mjs --scenario stage-flow`：US-3821 → requirement → design → 3a blocked→closed→pass → 3b → 3c → SE 签收，PASS。
- 蓝图 16 工具 / 11 toolview，1024–1920 无横向溢出。

## 移除条件

上游提供等价的原生 stage runtime/审批状态机，且能保持 UI 动作来源与 mock 边界；届时删除本工具并把 StageResultCard 合回 DeliverableRenderer。
