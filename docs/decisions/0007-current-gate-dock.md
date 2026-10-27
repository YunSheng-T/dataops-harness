# 0007 · 当前阶段卡：会话正文完整卡 + 底部阶段简报

- 日期：2026-10-27
- 状态：已实施（P3 mock）
- 关联：[OPEN-007/008/010](../backlog.md#open-007--阶段卡被折叠进思考块用户看不到签收按钮) · [阶段运行时](0006-stage-runtime.md)

## 背景

2026-10-27 US-3821 真实验证暴露：

- 阶段卡只挂 `tool.call.toolview`，随工具调用行进入 transcript，被 DSH 折叠进「思考」。
- 用户必须展开历史轮次才能找到卡；签收后 workitem 更新，但旧卡仍停在原 turn。
- 卡片按钮用 `execCommand('insertText')` 追加，不先清空，两个角色连续点击会串成一条消息。
- 用户自然预期是“当前这轮有一个当前门禁入口”，而不是“去上一轮找卡片”。

## 决策

1. 在 `conversation.input.dock` 增加 **阶段简报/导航器**（常驻在 composer 上方，跨 turn 不消失）：
   - 默认折叠为一行当前门禁摘要；展开后显示 6 个阶段节点、卡片数量、状态；
   - 点击阶段展开卡片列表，点击卡片打开弹窗（不在底部重复完整卡）；
   - 完整 Requirement/Design/Analysis/Solution/TechPlan 卡在会话正文的 turnTail；
   - 列表行显示卡片状态（草稿/已复核/阻塞/已签收）；
   - 卡片点击打开弹窗，弹窗内可签收；
- 正文卡和底部简报都使用 DSH 的 `--dsh-chat-content-width`，不再各自写死 max-width；两者同宽、居中对齐。
   - 只读当前 payload + 最新 workitem；当前轮和已持久化的 contextStore 合并；
   - 按钮仍然只通过 `dataops:compose` 生成普通用户消息，不直连 Host tool。
2. 完整阶段卡继续保留在 tool turn，作为历史/审计详情，不再是唯一入口。
3. `onCompose` 写入前清空输入框内容，避免多角色回执拼接。
4. 开放问题 OPEN-009 不采用“任意文本签收”回退；先保证 UI 可达，签收仍要求 UI actionId。

## 不变量

- 完整卡位于会话正文，不随对话消失；底部阶段导航跨 turn 可见。
- 历史 tool 卡仍留在思考折叠，作为审计，不再作为主入口。
- 当前 Dock 不生成签收记录；用户必须发送草稿。
- 当前 Dock 只显示当前 gate，不复制整张交付物卡。
- 历史卡不删除，支持回看。
- `workitem` payload 只用于投影，不是第二套状态机。

## 验证

- `p1.4 ui-dock` E2E：当前阶段卡 + 门禁动作 在 turnTail 可见；点 BA 只生成一条 `role=ba` 草稿；发送后需求方按钮仍可用；两个 signoff 写入 workitem 且 gate approved。
- `dataops-client` check：TurnTail 渲染当前门禁和 BA/需求方动作。
- 关闭插件后 turnTail 不注入任何 DOM（仍遵循原生 seat 边界）。

## 后续

- OPEN-009：如果 UI 再次不可达，需要产品决定“阻断”或受控降级；当前不放开任意文本签收。
- 阶段卡历史仍可折叠；后续可增加“历史卡定位/时间线”作为非阻断改进。
