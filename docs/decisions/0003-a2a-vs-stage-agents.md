# ADR 0003：A2A 多 Agent 与 DSH 阶段投影的取舍

- 状态：提议（待团队评审）
- 日期：2026-10-26
- 决策者：dataops-harness 项目组
- 相关：`docs/design/blueprint-v2.md`、`docs/decisions/0002-stage-as-projection.md`

## 背景

同事提出另一套方案：

> 把需求分析、设计、技术方案设计、数据作业开发等流程分别封装成 Agent，通过 A2A 协议对接；在本地 Claude Code 或 Codex 等 harness 中接入。

这与当前方案的核心分歧不是“用不用 Agent”，而是：

- **A2A 方案**：把阶段边界做成 Agent/服务边界，通过消息/任务协议交接。
- **当前方案**：阶段是工作流投影；Agent 在同一个 harness 里，通过共享工具、技能、结构化产物和审批完成交接。

两者都能跑，但优化目标不同：A2A 优化跨团队/跨 harness 的互操作，当前方案优化单条数据研发链路的产物一致性、治理和体验。

## 事实

1. **A2A 是 Agent 间互操作协议，不是工作流引擎。** 它标准化 Agent Card/能力发现、Task 生命周期、Message、Artifact、流式/推送、认证与版本协商；不提供阶段编排、审批门禁、产物版本库、补偿事务。
2. **A2A 与 MCP 是互补的。** A2A 连接 Agent，MCP 连接 Agent 与工具/资源；数据研发大量工作是工具型能力（查表、血缘、证据、调度校验），并不需要远程 Agent。
3. **Claude Code 的原生扩展面是 subagents / skills / plugins / MCP。** 其官方文档把“并行 Agent”放在 subagents/agent teams，不把 A2A 作为原生插件契约；要接 A2A 需要额外 bridge。
4. **Codex 等 harness 也以 MCP/skills/子代理为主**；A2A 需要单独的适配/网关，不能假设“本地 harness 天然会 A2A”。
5. **当前 DSH 方案已经有共享工具、契约、provider、阶段投影、卡片、审批和证据。** A2A 方案如果不复用这些，会新建一套并行的数据访问/状态/UI。

## 对比

| 维度 | 当前 DSH 阶段投影 | A2A 每阶段 Agent |
|---|---|---|
| 核心抽象 | 阶段 = 工作流投影；能力 = 共享 tool/provider | 阶段 = Agent/服务边界；A2A 任务交接 |
| 产物一致性 | 强：统一 artifact schema、版本、evidence | 依赖双方自定义；A2A Artifact 本身不保证 schema/版本/owner |
| 治理与审批 | 强：DSH 集中审批、只读默认、凭据 | 分散到各 Agent；需另建授权、审计、审批 |
| 单链路时延/可靠性 | 好：本地工具调用，少网络跳数 | 差：每阶段远程任务、重试、超时、上下文同步 |
| 跨 harness 互操作 | 弱：绑定 DSH | 强：Claude Code/Codex/其他 A2A host 可接 |
| 团队独立 ownership | 中：共享内核，阶段可独立演进 | 强：Agent 可独立部署、版本、评估、扩缩 |
| 模型/工具异构 | 中：同一 harness 内 | 强：每个 Agent 可选不同模型/工具栈 |
| UI/证据/阶段卡 | 强：原生卡片、阶段条、血缘工作台、右栏 | 弱：终端/对话为主；每个 harness 要重做 UI |
| 运维复杂度 | 低：两个业务插件 + 一个 profile | 高：N 个 Agent 服务、发现、TLS、认证、配额、可观测性 |
| 测试/复现 | 强：mock、契约测试、golden artifact | 弱：N 个非确定性 Agent 的跨服务链路难复现 |
| 安全/数据边界 | 强：数据不离开宿主工具层 | 中/弱：远程 Agent、凭据、数据出境、prompt injection 面扩大 |
| 扩展成本 | 新增 capability 按固定顺序落位 | 每新增阶段/Agent 都要新建服务、契约、部署和集成 |

## 好的特性（值得吸收）

1. **Agent Card / 能力发现**：明确每个 Agent 的 skills、版本、认证方式，值得借鉴到我们的 capability manifest。
2. **Task 生命周期**：任务 ID、状态、流式更新、取消、推送，适合跨团队长任务；可作为我们 artifact run 的外部映射。
3. **Artifact 交换**：A2A 把产物作为一等对象，提醒我们“交接的是产物，不是聊天”。
4. **跨 harness**：Claude Code/Codex/合作伙伴 Agent 可以参与，适合外部专家 Agent、跨部门评审。
5. **独立 ownership**：团队可以独立发布/评估自己的 Agent，适合组织边界清晰时。
6. **协议分层**：A2A（Agent 间）+ MCP（工具）组合，比“所有能力都做成 Agent”更合理。

## 严重问题

### 1. 把 A2A 当成编排层（最严重）

A2A 的 Task 是“一个远程 Agent 的任务”，不是 6 阶段流水线。它没有阶段顺序、门禁、审批、回滚、补偿、跨阶段产物版本。用它串阶段，最后一定还要再写一个 orchestrator，且这个 orchestrator 才是系统真正的核心。

### 2. 把阶段做成 Agent 边界，是错误的分割

需求、设计、技术方案、开发高度耦合且反复迭代。把它们拆成相互 opaque 的 Agent，会迫使跨阶段通过消息/任务协商；设计变更、方案返工、上下文修正都会变成跨服务对话。阶段是工作流视图，不是 bounded context。

### 3. 产物契约缺失，A2A 不替你做

`design.yaml`、`tech-plan.yaml`、`schedule-spec.yaml` 的 schema、版本、owner、evidence、gaps 必须由我们定义。A2A Artifact 只是传输容器；如果每个 Agent 自定义产物，下游就无法稳定解析，最终会出现“消息通了，但产物对不上”。

### 4. 本地 harness 的 A2A 支持不是默认的

Claude Code/Codex 的官方扩展路径是 MCP/skills/subagents/plugins；“在本地 harness 通过 A2A 对接”需要写 A2A client/bridge，处理每个 harness 的会话、认证、流式、取消、重试、工具权限。这不是配置项，是一个长期适配层。

### 5. 分布式单体 / Agent 爆炸

N 个阶段 Agent × N 个 harness × N 套凭据/网络/部署/监控；版本 skew、超时、重试、幂等、trace 关联都要做。团队会从“维护一个工作台”变成“维护一个多 Agent 平台”，但业务价值还没验证。

### 6. 治理与安全被切碎

A2A 规范提供认证/授权原语，但不会自动给你数据权限、只读默认、审批路由、密钥隔离、审计和租户隔离。每个 Agent 都能访问数据平台，写操作和 prompt injection 的面会扩大；想达到当前 DSH 的治理水平，需要额外做一套。

### 7. UI / 证据 / 工作台体验丢失

A2A 不定义卡片、阶段条、证据面板、血缘工作台、审批 UI。Claude Code/Codex 里看到的是对话/终端；要恢复当前体验，要么为每个 harness 重写 UI，要么回到一个 Web 工作台——A2A 并没有省掉 UI。

### 8. 评测和复现更难

单 Agent 的 mock/contract/golden 测试已经不简单；多 Agent 链路加上网络、异步、重试、模型差异，回归和故障定位成本成倍增加。没有统一 trace/artifact 重放，很难证明“这次变更没破坏流程”。

### 9. 时延/成本/离线

每阶段一次远程任务/模型调用，网络和排队叠加；本地 harness 与远程 Agent 的认证/网络在内网环境更复杂；mock 离线演示也要起多服务。

### 10. 容易绕过审批和版本

远程 Agent 可能直接持有平台凭据；A2A Task 的取消/重试/幂等语义需要实现；没有中央审批时，部署/建表/触发任务会散落在各 Agent 里，审计困难。

## 放到数据开发用户旅程里看

| 旅程 | 真实触点 | 每阶段 A2A 方案的问题 | 我们要做对的事 |
|---|---|---|---|
| 需求 | devops、指标、catalog/lineage | 需求 Agent 通常在远端，看不到本地仓库和未提交上下文；需求变更后靠消息通知下游 | 需求产物 + 变更事件进入 WorkItem；下游按 artifact 版本失效/重跑 |
| 设计 | DataMap、血缘、指标口径、`design.yaml` | 设计 Agent 产出文档/Artifact，谁把它提交到仓库？以哪个 commit 为准？ | 一个 WorkItem 一个分支/PR；设计产物与代码同一套版本 |
| 方案 | profile/分析 SQL、技术方案、调度 YAML | 多个远端 Agent 各自产出，artifact 版本、依赖、校验结果容易分叉 | 归一化 spec + validator；产物入仓，CI 校验；不直接写调度 |
| 开发 | Claude Code/Codex 本地 worktree、Git、单测 | 本地 coding Agent 已能改仓库；再加一个 A2A 开发 Agent，出现两个写者、两套分支/凭据 | 一个 writer 原则；A2A Agent 只给 patch/proposal，由本地/集成 Agent 落 PR |
| CICD | 仓库 CI、构建产物、测试、审批、部署 | 远端 CICD Agent 看不到本地分支，A2A task 完成不等于 CI 通过/已部署 | A2A task 只引用 commit/PR/CI run；门禁以 CI/审批系统为准 |
| 复盘 | 监控、事故、`postmortem.md`、runbook | 复盘/排障 Agent 的结论与代码/变更记录脱节 | 复盘产物绑定 WorkItem、commit、CI run、事故 ID |

## 代码仓这部分尤其容易出问题

代码仓是**共享可变状态**，而 A2A 消息/任务是**协调协议**，不是并发控制、事务或代码评审。

### 具体问题

1. **工作区不可见**：本地 Claude Code/Codex 的未提交改动、分支、工作区状态，远端阶段 Agent 默认看不到；它只能看到被 push 的 commit 或收到的 patch。
2. **谁是 writer**：设计/技术方案/开发都产出文件；如果每个阶段 Agent 都能写仓库，就有多个写者、多个分支、多个凭据。代码冲突、覆盖、重复提交不可避免。
3. **原子性**：需求/设计/技术方案/代码/YAML 往往属于同一个变更。按阶段拆 A2A task，容易出现“设计已合并、代码没合、调度配置已生效”的半成品状态。
4. **分支/PR 归属**：PR 应该由谁开、谁 review、CODEOWNERS 是谁、A2A task id 怎么关联 commit？没有约定就无法审计和回滚。
5. **生成物漂移**：调度 YAML 由 Agent 生成，仓库里一份、调度平台一份；远端 Agent 直接改平台会绕过 repo/CI，下一次生成又覆盖手工修复。
6. **CI 状态割裂**：A2A task 的状态是 Agent 任务状态，不是 build/test/deploy 状态；没有 CI run/审批/部署记录，就不能说“完成”。
7. **敏感信息**：本地 harness 可能有仓库写权限和开发凭据；远端 Agent 可能持有平台凭据。多套凭据、多套权限边界会放大泄露和误操作面。
8. **大改动/多仓**：数据开发经常涉及 SQL 仓、调度配置仓、指标/文档仓；远端 Agent 的 workspace 范围、clone 权限、跨仓 commit 协调都需要额外设计。
9. **评审与责任**：AI 生成代码可以提 PR，但不能自动合并；需要有代码 owner、评审记录、生成标识和回滚点。
10. **可复现性**：没有 commit、artifact hash、prompt/agent version、A2A task id 的绑定，出了问题无法复现“当时是谁生成了什么”。

### 推荐的仓库契约

把仓库/PR 当作数据开发的**交接总线**，A2A 只是外围：

- **一个 WorkItem 一个分支/一个主 PR**；设计、方案、代码、调度 YAML、测试都进同一 PR（或明确关联的子 PR）。
- **一个 writer**：本地 coding Agent 或集成 Agent 负责落盘/提交；远端阶段 Agent 只返回 patch、artifact 或 review comment，不直接写共享分支。
- **提交可追溯**：commit trailer 记录 `DataOps-WorkItem`、`A2A-Task`、`Artifact-Hash`、`Agent-Version`。
- **生成物入仓**：`generated/` 目录带生成头（来源 spec/hash），禁止手改；改动必须回源重新生成。
- **仓库策略**：CODEOWNERS、分支保护、必需 CI 检查、审批人；AI 不能自动合并。
- **CI 为准**：scan/build/test/deploy 的结论以 CI/审批系统为准，A2A task 完成只代表“提案已交”。
- **权限最小化**：本地写仓库、远端只读/提案；远端 Agent 不持有生产部署凭据。
- **多仓**：WorkItem 记录相关仓库与 base commit；跨仓变更用 manifest 关联，不能靠聊天记忆。

> 当前蓝图 v2 已有 WorkItem/artifact 概念，但**仓库适配层（worktree/branch/PR/CI/CODEOWNERS）还没有实现**；这是下一步必须补的，不是 A2A 能替代的。

## 跨流程/跨团队协作的问题

1. **状态双轨**：A2A 有 Task 状态，我们有阶段/产物/审批状态；两套状态不同步，用户不知道“到底卡在哪”。
2. **变更失效**：需求变更后，设计/方案/调度/代码/测试哪些要重跑？A2A 只传消息，不维护 artifact 依赖图；需要中央 WorkItem 做失效传播。
3. **并发写**：设计、开发、数据挖掘可以并行，但共享仓库/调度配置是串行资源；需要分支/锁/merge queue，A2A 不提供。
4. **审批路由**：数据 owner、代码 owner、发布审批人不同；A2A 的认证不等于企业审批；需要统一 approval/gate。
5. **端到端 owner**：每个阶段 Agent 有 owner，但谁对整条链路负责？没有 coordinator/WorkItem owner，出问题会互相甩锅。
6. **证据与审计**：跨 Agent 的 evidence、query、as_of、artifact hash 需要统一；否则复盘无法还原。
7. **事件/事故回流**：排障/复盘发现的问题要回到需求/设计/代码；A2A 消息不等于知识回写，需要 WorkItem 关联和行动项。
8. **外部团队/伙伴**：A2A 的强项在这里；但数据出境、租户隔离、artifact 共享范围、合规审计要单独设计。
9. **可观测性**：一次用户旅程跨 N 个 Agent、harness、CI；没有统一 trace/replay，定位成本极高。
10. **评测**：跨团队 Agent 的版本/模型/提示词不同；没有统一契约和 golden artifacts，无法比较质量。

### 跨流程的正确边界

- **中央 WorkItem/artifact graph** 做真相和失效传播；
- **A2A** 只用于真正独立的外部/跨团队 Agent，交换符合契约的 artifact/patch；
- **仓库/PR/CI** 是代码和调度配置的交接总线；
- **统一 approval/evidence/trace** 绑定 A2A task、DSH run、commit、CI run、release id。

## 建议

### 不作为主方案

不把“每个阶段一个 A2A Agent”作为 DataOps 的主架构。阶段是工作流投影；共享工具、provider、artifact 和审批仍应在 DSH 内核里。A2A 只作为**外围互操作层**。

### 推荐 Hybrid

```
本地 Claude Code / Codex / 其他 harness
        │  MCP（工具）+ A2A（真正的外部 Agent）
        ▼
A2A/MCP Gateway（薄适配，不是每阶段一个 Agent）
        │
        ▼
DSH DataOps 内核：artifact/workitem · tools/providers · stage projection · UI · approval
        │
        ▼
外部系统：DataMap / 调度 / CICD / 查询 / 质量
```

- **工具型能力**（查表、血缘、证据、调度校验）走 MCP 或 DSH tools，不走 A2A。
- **真正独立的外部 Agent**（合作伙伴、其他团队评审 Agent）走 A2A，但只交换符合我们契约的 Artifact。
- **阶段编排/审批/证据/UI** 留在 DSH；A2A Gateway 负责 Agent Card、任务映射、认证、trace、取消/重试。
- 本地 harness 先通过 **MCP bridge** 复用我们的 tools/skills；只有确实要调用自主 Agent 时才上 A2A。

### 先做最小验证

1. 选一个边界清楚、非核心写路径的能力（如“数据设计评审 Agent”）做 A2A PoC。
2. 定义 Artifact 契约：`design.yaml` / `review.md` 的 schema、版本、owner、as_of、gaps。
3. 只读、无部署、无生产凭据；A2A Agent 返回 artifact + evidence，不直接写平台。
4. 统一 trace（A2A task id ↔ DSH run id），比较质量、延迟、失败率、人工介入次数。
5. 只有在跨团队/跨 harness 的真实需求出现时，再扩大 Agent 边界。

## 何时重新评估

满足任意两条再考虑把更多阶段做成 A2A Agent：

- 3 个以上独立团队需要各自发布/评估自己的阶段 Agent；
- 必须让 Claude Code/Codex/外部伙伴直接参与同一条链路；
- 阶段间产物契约已稳定且可独立版本化；
- 有统一的 Agent 注册、认证、审批、审计、可观测平台；
- 能证明 A2A 的跨 harness 收益大于多服务运维成本。

## 一句话

> A2A 解决“Agent 怎么找到彼此并协作”，不解决“数据研发这条流水线怎么保证产物、门禁、审批和体验”。当前阶段应把 A2A 放在外围互操作层，而不是把每个阶段拆成 Agent。

## 参考

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2A and MCP: Detailed Comparison](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)
- [Claude Code — Create custom subagents](https://code.claude.com/docs/en/sub-agents)
