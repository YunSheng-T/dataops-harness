# 为什么做 DataOps Agent

> 一句话：传统数据开发的问题不是“缺一个 SQL 工具”，而是**一条跨需求、设计、分析、开发、调度、发布的长链路没有被持续承载**。Agent 负责编排和恢复，Workitem 负责记忆，Artifact/Evidence 负责可追溯，Gate 负责制度。

## 1. 传统数据开发断在哪

一个真实需求通常要跨：

```text
US / 需求方
→ 表结构、DataMap、血缘、画像
→ 口径分析、方案比较、技术方案
→ SQL / ETL / 调度 / API / 回滚
→ build / scan / SIT
→ 评审、合入
→ CICD / 环境
```

传统系统每一段都有工具，但链路是断的：

| 断点 | 后果 |
|---|---|
| 需求在工单、设计在文档、分析在聊天 | 上下文丢失，下一阶段重新问一遍 |
| 表/血缘/画像要人工搬运 | 结论过期，口径和影响面靠人记 |
| 审批在群/邮件 | 审批绑不到 revision，重做后旧结论仍被误用 |
| 开发、调度、发布各自为政 | 失败无法回流，回滚材料散落 |
| 每个项目重复做同样的检查 | 经验不可复用，质量靠个人 |
| 真实写操作缺少边界 | 误部署、误发布、无法审计 |

所以问题不是“SQL 生成得不够快”，而是**长链路的状态、证据、门禁和恢复没有被产品化**。

## 2. DataOps Agent 解决什么

### 2.1 跨阶段编排

Agent 知道当前在哪个阶段、下一阶段需要什么、什么条件不能继续：

```text
需求未双签 → 不进设计
设计未签 → 不进 3a
3a blocking 未关闭 → 不 pass
3c 未 SE 签 → 不进开发
开发未合入 → 不进 CICD
```

这不是提示词能保证的，必须由阶段运行时和 gate 执行。

### 2.2 持续上下文

Workitem 承载：

```text
stage / substage
deliverables
ArtifactRevision
approvals
gaps
evidenceRefs
currentIteration
audit
```

对话可以断，人可以换，工作项继续。

### 2.3 产物与证据

每个阶段的产物不是一段聊天：

```text
requirement / design / analysis / solution / tech_plan / develop / cicd
```

每个 revision 不可变，审批绑定 `revisionId + contentHash`；证据按引用挂载，不复制 SQL、日志正文。

### 2.4 失败回流

Build/Scan/Deploy/Test 的 attempt、错误、修复动作回到同一张卡，下一次 Agent 不需要重新猜上次为什么失败。

### 2.5 Provider 可替换

同一套流程背后可以是：

```text
mock
内部 CLI
HTTP 服务
```

UI、阶段模型、Workitem 不随数据源重写。内网只替换 provider。

## 3. 为什么不是只发 SKILL

Skill 是**判断口径和操作手册**，不是运行时。

它不能：

- 持久化 Workitem；
- 生成不可变 revision；
- 拒绝未签收的阶段推进；
- 校验 evidence 坐标；
- 把失败 attempt 写回；
- 保证不同 Agent/不同会话行为一致。

Skill 很重要，但它是“怎么写”，不是“谁记住、谁执行、谁拒绝”。

## 4. 为什么不是只做 MCP

MCP 解决的是**连接和工具暴露**，不解决：

- 当前处于哪个阶段；
- 哪个产物是当前 revision；
- 谁签过、签的是哪一版；
- 失败后如何恢复；
- 什么情况下禁止下一步；
- 跨工具的上下文如何合并。

MCP 是“手”，不是“流程账本”。  
如果只发 MCP，每个客户端还要自己重做阶段编排、审批、审计和 UI，最后得到 N 套不一致的流程。

## 5. 正确关系

```text
MCP / Tool  = 手：能读、能算、能构建、能部署
Skill       = 手册：怎么判断、怎么选、怎么回退
Workitem    = 记忆：阶段、产物、审批、证据
Gate        = 制度：不满足就不能推进
Agent       = 调度者：根据状态选择下一步，处理异常
UI          = 审阅面：人看产物、签收、纠偏
```

DataOps Agent = 这条链的**垂直组合**，不是“又一个聊天入口”。

## 6. 当前实现如何对应

- 阶段模型和 gate：`contracts/stage-contract.json`
- Workitem / revision：`packages/dataops-tools/src/workitem-store.js`
- 工具/provider 边界：`packages/dataops-tools/src/providers/`
- 会话卡与阶段简报：`packages/dataops-client/`
- 技能：`.agents/skills/`
- 内网接入契约：`docs/design/internal-integration-contract.md`

## 7. 边界

DataOps Agent 不替代：

- 调度平台执行任务；
- 代码平台 merge；
- 发布平台审批和部署；
- 数仓 SQL 引擎；
- 企业 SSO / 权限系统。

它把这些能力编排成一条**可恢复、可审计、可签收**的数据交付链。

## 8. 结论

做 DataOps Agent，不是因为它能“自动写 SQL”，而是因为：

> 传统数据开发缺的是一条能跨阶段持续运行、能带证据、能过门禁、能失败回流、能切换内部平台的交付链。  
> Skill 提供判断，MCP/工具提供能力，Agent 提供编排，Workitem 提供记忆，Gate 提供制度。
