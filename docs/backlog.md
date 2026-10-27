# DataOps 遗留事项清单

> 状态：维护中
> 更新时间：2026-10-27
> 用途：登记当前非重点、但后续会重新处理的设计/协同/集成问题，避免讨论结论丢失。
> 关联：[用户旅程 v0](design/user-journey/user-journey.md) · [泳道图](../prototype/user-journey-swimlane.html) · [审批矩阵](design/user-journey/user-journey.md#3-审批矩阵-v0)

## 使用规则

- 每个遗留点一个稳定 ID，**不删除、不重用**；完成时把状态改为 `resolved`，补结论和日期。
- 新问题先登记，不在主设计文档里散落“待定”。
- 状态：`deferred`（暂缓）、`proposed`（有建议未确认）、`blocked`（依赖外部）、`resolved`（已关闭）。
- 优先级用 `P3` / `P4` 表示“非当前主链”，不替代正式排期。
- 触发条件明确后再排期；没有触发条件的事项不进入当前迭代。

## 索引

| ID | 主题 | 当前状态 | 当前结论 | 触发条件 |
|---|---|---|---|---|
| OPEN-001 | 设计/技术方案的跨角色签收与 EDevOps 协同 | deferred | 逻辑上需要，但跨人协同交给 EDevOps；先放松 | 主旅程和审批矩阵稳定后 |
| OPEN-002 | 生产发布准入与 DataOps 边界 | deferred | 生产发布走准入系统；DataOps/Agent 不介入审批 | 真实生产发布接入前 |
| OPEN-003 | 代码合入 / 制品发布与 Committer 协同 | deferred | 外部系统合入/发布；DataOps 提供报告参考 | 代码平台/发布平台集成时 |
| OPEN-004 | Agent Team 分工：角色型 vs 活动型 | proposed | 倾向“角色 owner + 活动 worker”混合 | Agent Teams 产品化协同验证时 |
| OPEN-005 | US 之外的触发源 | deferred | v1 只接 EDevOps US | US 旅程验收后 |
| OPEN-006 | US 状态/评论回写映射 | deferred | 最终要回写，但 v1 先读；细节未定 | EDevOps CLI adapter 接入时 |
| OPEN-007 | 阶段卡被折叠进「思考」块，用户看不到签收按钮 | resolved | 卡片只挂 `tool.call.toolview`，被 turn process 折叠吞掉；需在会话尾部补可操作入口 | 下一轮用户面修复 |
| OPEN-008 | 卡片按钮写入 compose 时不清草稿，多条回执串成一条 | resolved | 疑似 `insertText` 在光标处追加且不校验已有内容；同轮出现 requester+ba 两条回执粘连 | 下一轮用户面修复 |
| OPEN-009 | 非 UI 签收没有回退路径，UI 一坏流程即断 | proposed | UI 已修到当前轮可达；仍不放开任意文本签收，降级策略待产品决定 | 产品决策 |
| OPEN-010 | 阶段卡绑定历史 tool turn，不在当前轮 | resolved | toolview 卡只在调用发生的 turn 渲染；签收后 workitem 更新，但旧卡不会回到当前轮，用户被迫翻历史 | 下一轮用户面修复 |

---

## OPEN-001 · 设计/技术方案的跨角色签收与 EDevOps 协同

- **状态**：deferred
- **优先级**：P3
- **涉及角色**：BA、SE、数据开发、需求方
- **当前结论**：
  - 设计签收逻辑上是 **BA/需求方签收 + SE 可行性评审**。
  - 技术方案签收逻辑上是 **SE 签收 + Dev 可落地确认**。
  - 但跨人的协同、通知、签收记录和状态流转，应优先借助 EDevOps，不在 DataOps 里另造一套协同系统。
- **当前边界（先不做）**：
  - 不实现 DataOps 内的跨角色审批流/通知中心。
  - 不因设计/技术方案签收细节阻塞当前主旅程。
  - 审批矩阵先保留为逻辑口径，具体交互后置。
- **后续要决策/交付**：
  1. 哪些 gate 在 EDevOps 里体现，哪些只在 DataOps workitem 记录。
  2. 设计/技术方案签收人、评审人、退回路径。
  3. 签收结果如何同步到 EDevOps（状态、评论、附件、@人）。
  4. 跨角色交接的 SLA/超时提醒。
- **触发条件**：主旅程、发布边界和 workitem 状态机稳定后，进入 EDevOps 协同适配。
- **关联**：[用户旅程 v0](design/user-journey/user-journey.md)、[泳道图](../prototype/user-journey-swimlane.html)

## OPEN-002 · 生产发布准入与 DataOps 边界

- **状态**：deferred
- **优先级**：P3
- **涉及系统**：生产发布准入系统、EDevOps、DataOps
- **当前结论**：
  - 生产系统发布有独立的准入系统，发布审批不由 DataOps/Agent 承担。
  - DataOps 可以生成发布参考报告，供准入/发布流程使用，但不替代审批。
- **当前边界（先不做）**：
  - DataOps 不接生产发布审批、不执行生产发布、不写准入系统。
  - 不把 DSH native approval 当成生产准入审批。
- **后续要决策/交付**：
  1. 准入系统需要的报告字段（变更、影响面、SQL、测试、回滚、证据）。
  2. 报告由谁消费、在哪个环节提交。
  3. DataOps 与准入系统的接口和权限边界。
  4. 发布结果如何回写 workitem（只读镜像还是人工记录）。
- **触发条件**：真实生产发布/准入系统接入前。
- **关联**：[用户旅程 v0](design/user-journey/user-journey.md)、[P2 设计](design/p2-tool-convergence.md)

## OPEN-003 · 代码合入 / 制品发布与 Committer 协同

- **状态**：deferred
- **优先级**：P3
- **涉及角色/系统**：SE、Committer、代码平台、制品仓库/发布系统
- **当前结论**：
  - 代码合入和制品发布仍由外部系统/Committer 负责。
  - DataOps 后续提供报告作为参考，例如：变更说明、影响面、SQL 评审、测试/扫描结果、回滚方案。
  - DSH 不替代代码评审、合入审批或制品发布审批。
- **当前边界（先不做）**：
  - DataOps 不执行 merge、不发布制品、不接管 Committer 权限。
  - 当前只保留工作项里的证据/交付物，不承诺外部系统回写。
- **后续要决策/交付**：
  1. 给 Committer 的合入报告格式和最小字段。
  2. 制品发布报告的格式、消费者和留存位置。
  3. 报告是自动推送、手工复制还是外部系统拉取。
  4. 合入/发布结果的回写方式。
- **触发条件**：代码平台/制品发布平台集成时。
- **关联**：[用户旅程 v0](design/user-journey/user-journey.md)、[P2 设计](design/p2-tool-convergence.md)

## OPEN-004 · Agent Team 分工：角色型 vs 活动型

- **状态**：proposed
- **优先级**：P3
- **背景**：团队讨论过按 BA/SE/Dev 划分子 Agent，也讨论过按数据挖掘、业务方案、技术方案等活动划分。
- **当前建议**：
  - **角色 owner + 活动 worker** 的混合模型。
  - BA/SE/Dev Agent 作为阶段 owner，对交接和签收负责。
  - 数据挖掘/需求分析/业务方案/技术方案/编码等作为活动 worker，在 owner 下执行。
  - 同一阶段只有一个写者；Lead 负责编排和 handoff。
- **当前边界（先不做）**：
  - 不落多 Agent 运行时拓扑；先保持单 Lead 的核心旅程。
  - 不假设 DSH Agent Teams 的用户面协同、权限和并发控制已经成熟。
- **后续要决策/交付**：
  1. 角色 owner 与活动 worker 的边界和数量。
  2. 哪些阶段允许并行，哪些必须串行。
  3. 交接包（handoff）包含哪些字段。
  4. DSH Agent Teams 的并发/权限/审计是否满足。
- **触发条件**：Agent Teams 产品化能力验证、或单 Lead 上下文/吞吐成为瓶颈时。
- **关联**：[用户旅程 v0 §5](design/user-journey/user-journey.md)、[Agent 编排架构](design/agent-orchestration.md)

## OPEN-005 · US 之外的触发源

- **状态**：deferred
- **优先级**：P4
- **当前结论**：第一版只接 EDevOps US；DTS 缺陷单、领导任务、用户自主探索都不进入 v1。
- **当前边界（先不做）**：
  - 不建多源任务适配器。
  - 不在 v1 混入 DTS/自由任务的字段和状态。
- **后续要决策/交付**：
  1. DTS 缺陷单的入口、字段和状态映射。
  2. 领导任务的来源、优先级和追踪方式。
  3. 用户自主探索是否仍建工作项、如何区分“探索”与“交付”。
  4. 多源任务的统一 ID / 去重 / 关联。
- **触发条件**：US 主旅程验收后，再评估第二个来源。
- **关联**：[用户旅程 v0 §1](design/user-journey/user-journey.md)

## OPEN-006 · US 状态/评论回写映射

- **状态**：deferred
- **优先级**：P3
- **当前结论**：
  - US 最终需要写状态/评论，内网 `edevops-cli` 可操作。
  - v1 先读 US；具体回写时机、映射和 Idempotency 未定。
- **当前边界（先不做）**：
  - 不自动回写 US 状态。
  - 不让 Agent 直接调用 CLI 写业务系统；后续通过受控 adapter/审批。
- **后续要决策/交付**：
  1. stage/gate 到 EDevOps US 状态的映射。
  2. 哪些事件写状态、哪些只写评论。
  3. 回写失败、重试、幂等和冲突处理。
  4. 权限与审计：谁触发、谁负责。
- **触发条件**：EDevOps CLI adapter 接入、或 US 主旅程需要状态同步时。
- **关联**：[用户旅程 v0](design/user-journey/user-journey.md)、[P2.2 工作项工具](design/p2-tool-convergence.md)

---

## OPEN-007 · 阶段卡被折叠进「思考」块，用户看不到签收按钮

- **状态**：resolved（2026-10-27，会话正文完整卡 + composer dock 阶段简报/导航）
- **优先级**：P2（阻塞签收动作，但不阻塞事实查询）
- **现象**：Agent 产出需求/设计/方案卡后，用户在会话里看不到卡；卡片实际渲染在回复的「思考」折叠块内部，需要展开折叠才能点到签收按钮。2026-10-27 US-3821 需求签收时首次暴露。
- **根因**：
  1. 我们的卡只注册到一个挂载点：`packages/dataops-client/src/index.js` 把所有阶段卡注册进 `tool.call.toolview`（第 74–81 行），即卡片随工具调用行进入 transcript。
  2. 上游会话把「答案步之前的全过程」（reasoning + tool-call 行）折叠成 turn process disclosure：`deepseek-harness/packages/client/ui-chat/src/client/chat/ChatNodeSeat.tsx` 第 85–91 行的 `processMember` 判定，凡 anchorSeq 早于 `answerAnchorSeq` 的行都进折叠；`AssistantMarkdown.tsx` 第 81、153 行按 `groupPart === 'reasoning'` 过滤成员。
  3. 我们的流程天然是「先调工具出卡、再写正文」，于是卡必定落在答案步之前 → 必定被折叠。
- **当前边界（先不做）**：
  - 不改上游 `deepseek-harness/`（只读参考）。
  - 不改上游折叠策略（`foldCompletedTurns` 等 presentation policy 是 shell 的显示契约，不是我们的）。
  - 不靠「让模型先出正文再调工具」这类提示词约定兜底：顺序由模型逐轮决定，不可作保证。
- **候选方案**：
  1. 在会话尾部（`conversation.chat.turnTail`，brief 已占用该挂载点）追加一份可操作的紧凑卡：显示当前 stage/gate + 签收按钮，点击走已有的 compose 桥。折叠块里的完整卡保留。
  2. 若上游提供「工具卡可脱离折叠」的声明式能力，改为在 `tool.call.toolview` 注册时声明外置；需先确认上游 API，未确认前按方案 1 做。
  3. 折叠块内命中的卡补一条「已生成交付物，点此展开」的外置提示，降低用户漏看概率。
- **待决策**：
  1. 尾部卡是复刻整张卡，还是只放门禁动作 + 链接到右栏交付物页签。
  2. 同一回合多次出卡（prepare + 重新 present）时，尾部只保留最后一张还是折叠成列表。
  3. 与「stage brief」合并成一个组件，还是并列两个（brief 已在尾部位）。
- **验证口径**：
  - 1440 视口下，签收按钮在不展开任何折叠块时可见并可点。
  - 交付物卡与尾部卡内容一致（同一 payload），不出现两个不同的 gate 状态。
  - 关闭本插件后界面回到原生状态（现有不变量）。
- **触发条件**：下一轮用户面修复；签收动作在实际使用中再次被漏看则提前。
- **关联**：[P2.3 交付物渲染](decisions/0005-deliverable-renderer-tool-convergence.md)、[阶段运行时](decisions/0006-stage-runtime.md)、[用户旅程 v0](design/user-journey/user-journey.md)

---

## OPEN-008 · 卡片按钮写入 compose 时不清草稿，多条回执串成一条

- **状态**：resolved（2026-10-27，onCompose 先清空/选区替换）
- **优先级**：P2（会造成重复签收/误签，approvals 记录失真）
- **现象**：2026-10-27 US-3821 需求签收时，同一条用户消息里出现两条签收回执粘在一起（`role=requester` 与 `role=ba`），且中间无分隔。Agent 侧只能按 actionId 逐条解析，重复角色的那条必须丢弃。
- **疑似根因**：卡片按钮走 `dataops:compose` → `packages/dataops-client/src/index.js` 的 `onCompose`，用 `document.execCommand('insertText')` 在光标处插入文本，未先清空输入框；若上一条回执仍在草稿里，两条就串联成一条消息。发送后草稿是否被 shell 清空、以及 `insertText` 失败回退到 `textContent = text` 的路径，都需实测确认。
- **当前边界（先不做）**：
  - 不改成「按钮直接调用工具」：按钮只起草一轮普通用户输入是现有设计（动作必须经用户发送）。
  - 不在 Agent 侧加去重兜底当修复：重复回执应在前端就不再产生。
- **候选方案**：
  1. `onCompose` 写入前先全选清空，或检测草稿非空时提示而不是追加。
  2. 回执改为「一条消息一条回执」的强约束：插入前校验草稿是否已含 `【签收】`，含则拒绝并提示先发送。
  3. 与 OPEN-007 的尾部卡一起改，避免两处入口各自处理草稿。
- **待决策**：
  1. 覆盖草稿还是提示用户确认（覆盖有误删用户手打内容的风险）。
  2. 多条待签角色是否允许在一条消息里批量提交（若允许，需要明确分隔符与解析规则）。
- **验证口径**：
  - 连续点击两个不同角色的签收按钮，输入框中始终只有一条待发送回执。
  - 粘贴或手打内容不会被按钮静默覆盖。
  - 同一条消息含两条同角色回执时，Agent 记录去重且不推进 gate。
- **触发条件**：与 OPEN-007 同批修复。
- **关联**：[OPEN-007](#open-007--阶段卡被折叠进思考块用户看不到签收按钮)、[P2.3 交付物渲染](decisions/0005-deliverable-renderer-tool-convergence.md)

---

## OPEN-009 · 非 UI 签收没有回退路径，UI 一坏流程即断

- **状态**：proposed
- **优先级**：P2（门禁完整性 vs 流程可用性的取舍未定）
- **现象**：2026-10-27 US-3821 3b 签收时，卡片在折叠块里找不到（OPEN-007），用户改为在对话里发文本回执。结果两条写入路径都被拒绝：
  - `dataops_shared_stage(signoff)` → `stage: signoff must come from a UI action`
  - `dataops_shared_update_workitem(approvals)` → `workitem: signoff must come from a UI action`
- **当前结论**：这个不变量本身是对的——签收必须能追到一次真实的人机交互，否则 approvals 可被 Agent 自己伪造。问题不在拒绝，而在于**拒绝之后没有任何合规替代通道**：UI 一坏，阶段就永久卡住。
- **已观察到的边界**：对**已 approved** 的门禁追加第二次签收（design v2 补记）可以通过 `update_workitem` 写入；对**pending** 门禁写入签收一律拒绝。
- **候选方案**：
  1. 由 shell 提供受控的"降级签收"入口（如命令行/管理页），复用同一套 actionId 签发机制，仍由人触发。
  2. 工作项层支持"签收悬置"：记录 `pending_external` 与原因，允许 Agent 继续产出下一阶段**草稿**，但门禁不置 approved，发布仍被拦。
  3. 明确不做替代通道，改为把 OPEN-007/008 视为发布阻断级缺陷——UI 不可达即视为系统不可用。
- **待决策**：
  1. 选 1 还是 3（2 会放松"无签收不推进"的硬规则，需要产品确认）。
  2. 降级签收的审计字段（谁触发、如何绑定 actionId、如何防重放）。
- **验证口径**：
  - 卡片不可达时，人仍能完成一次可审计的签收，且 Agent 无法自签。
  - 关闭本插件后该通道随插件一起消失，不污染原生 shell。
- **触发条件**：与 OPEN-007/008 同批；若再次因 UI 不可达导致门禁卡死则升级为阻断项。
- **关联**：[OPEN-007](#open-007--阶段卡被折叠进思考块用户看不到签收按钮)、[OPEN-008](#open-008--卡片按钮写入-compose-时不清草稿多条回执串成一条)、[阶段运行时](decisions/0006-stage-runtime.md)

---

---

## OPEN-010 · 阶段卡绑定历史 tool turn，不在当前轮

- **状态**：resolved（2026-10-27，会话正文完整卡 + composer dock 阶段简报/导航）
- **优先级**：P1（签收入口不可见，且用户无法形成“当前门禁”心智）
- **现象**：每次阶段交互后，用户期望在当前轮看到可签收的当前卡；实际卡片绑定在 `tool.call.toolview` 的调用事件上，停留在历史 turn；签收后 stage runtime 更新工作项，但旧卡不会变成当前状态，新的可操作入口也不一定出现在当前轮。2026-10-27 US-3821 验证中，用户明确反馈“卡片好像就发送一次”“应该在当前的一轮对话，而不是跳到上一轮”。
- **根因**：
  1. 卡片是 tool result 的历史投影，`anchorSeq` 固定在工具调用位置；它不是当前 workitem 状态的投影。
  2. 签收后只更新 `item.yaml`，没有客户端“当前 gate/待签角色”的 session-scoped store 或 turnTail 入口。
  3. 同一交付物重复 prepare/present 会在不同 turn 产生多个卡，用户需要找“最新那张”；旧卡不会失效/收起。
- **候选方案**：
  1. 复用 `conversation.chat.turnTail`（stage brief 已占用）增加“当前门禁”动作条：显示 current stage/gate、待签角色、签收/补证按钮；每轮从最新 workitem/stage payload 重算。
  2. 完整阶段卡保留在 tool turn 作为历史与详情，不作为当前入口；turnTail 只放动作和关键状态。
  3. 卡动作后给明确草稿预览；发送后 turnTail 切到下一 gate，不要求用户回滚历史。
- **验证口径**：
  - 连续 3 轮签收，当前门禁动作条每轮都在会话尾部可见；
  - 签收后无需滚动历史即可看到下一 gate；
  - 历史卡仍可审计，但不会成为唯一入口；
  - 不重复创建同一 gate 的多个当前动作条。
- **触发条件**：与 OPEN-007/008 同批修复；当前轮入口缺失视为签收阻断。
- **关联**：[OPEN-007](#open-007--阶段卡被折叠进思考块用户看不到签收按钮)、[OPEN-009](#open-009--非-ui-签收没有回退路径ui-一坏流程即断)、[阶段运行时](decisions/0006-stage-runtime.md)

## 新增遗留项模板

```md
## OPEN-XXX · 标题

- **状态**：deferred | proposed | blocked | resolved
- **优先级**：P3 | P4
- **背景**：
- **当前结论/边界**：
- **先不做什么**：
- **后续要决策/交付**：
- **触发条件**：
- **关联**：
- **关闭日期/结论**（resolved 时填）：
```
