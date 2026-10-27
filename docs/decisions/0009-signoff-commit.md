# 0009 · 签收确认后自动提交用户消息

- 日期：2026-10-27
- 状态：已实施
- 关联：[当前阶段卡](0007-current-gate-dock.md) · [Stage runtime](0006-stage-runtime.md)

## 背景

阶段卡签收按钮之前只把 `【签收】...` 写入 composer，用户还需要再点发送；部分客户端在 Lexical 编辑器中显示不稳定，点击后看不到提示词，签收动作因此显得“没有发生”。

## 决策

1. 点击卡片的签收按钮先打开**签收确认层**，展示 gate/role/actor/actionId 和完整用户消息。
2. 点「签收并提交」后，通过 DSH 原生 `conversation.input.setDraft` + `submit` 自动发送这条**普通用户消息**；不调用 Host 工具，不跳过 Agent。
3. 如果原生 submit 不可用，回退为把回执写入 composer，保留可见草稿。
   - `setDraft` 后等 60ms 再 `submit`；Lexical projection 在下一次绘制才稳定，立即 submit 会提交旧/空草稿。
4. `dataops_shared_stage(signoff)` 继续负责 approvals 持久化和最终 gate 推进；最后一位必需角色签完即 approved。
5. `actionId` 在确认层生成；同一 actionId 在 stage runtime 幂等。
6. mock US 是只读；签收状态持久化在 workitem，UI 派生显示 US 状态，不伪装成外部回写。

## 验证

- 签收确认层必须显示完整回执；
- 点提交后 workitem `approvals[gate].signoffs` 增加一条；
- 最后必需角色提交后 gate approved，stage 推进；
- 重复点击同一 actionId 不重复记录；
- 原生 submit 不可用时 composer 中保留可发送草稿。

## 边界

真实身份认证、外部 US 状态回写仍需 adapter；当前 actionId 不是密码学身份。
