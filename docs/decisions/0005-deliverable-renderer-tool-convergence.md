# ADR 0005：Deliverable Renderer 与内容工具收敛

- 状态：已接受（P2.0 已确认；P2.1 实现中）
- 日期：2026-10-26
- 决策者：dataops-harness 项目组
- 相关：[P2 设计](../design/p2-tool-convergence.md)、[P1 总结](../design/p1-summary.md)、[ADR 0004](0004-agent-workbench-orchestration.md)

## 背景

P1 已证明“需求入口 + 工作项状态 + 原生审批”成立，但工具面仍是 16 个阶段/内容工具：

- 需求/设计/方案/开发/复盘正文由 tool 生成；
- 卡片按 toolview 绑定工具名；
- 工作项和日志仍靠 Agent/fs；
- 模型面对过多能力，工具边界不清晰。

另外，**Artifact** 在内部已有稳定含义：CICD 编译/构建产物（构建制品包）。阶段产物（需求/设计/技术方案等）也继续叫 artifact 会混淆。

## 决策

1. **术语**：
   - `Artifact` 只指 CICD 编译/构建制品；
   - 阶段产物统一叫 `Deliverable`（交付物）；
   - deliverable 内部的结构化内容叫 `Payload`；
   - 工作项新增 `deliverables/` 目录；旧 `artifacts/` 在 P2 读兼容，不再新写。
2. **内容生成从 tool 迁到 Agent + 技能**。
3. **新增通用 `dataops_shared_present_deliverable`**，只做结构校验、透传和卡片展示，不生成内容。
4. **client 新增 `DeliverableRenderer`**，按 `kind` 复用现有卡片；`TOOL_VIEWS` 只注册它 + 事实/动作工具。
5. **新增工作项 read/update 工具**（P2 文件适配）和**排障日志读取工具**；`incident_triage` 退出。
6. **活动工具面 16 → 12**；旧 8 个内容工具在 P2.4 退出注册，代码保留兼容期。
7. **presenter/workitem 不产生权限**；release 仍由 DSH 原生 approval 决定。
8. **P2 静态 12 工具面**；按角色的动态工具裁剪推迟 P3。

## 备选方案

- **继续给每个阶段做 tool**：实现简单，但用户面和模型面继续膨胀。否决。
- **保留 tool 但加别名**：会继续让模型看到内容工具，和 P2 目标冲突。否决。
- **一个万能 workbench tool**：职责过宽，难校验、难授权、难测试。否决。
- **presenter 直接生成内容**：违反 Agent/tool 边界。否决。
- **继续用 Artifact 指阶段产物**：与 CICD 构建制品重名，领域语义冲突。否决。

## 后果

- 正面：工具面收敛；内容和 CICD 制品术语分开；卡片不绑定生成工具；工作项/日志有稳定接口；真实 provider 更容易接入。
- 负面：P2.3 有模型质量迁移风险；DeliverableRenderer 是新的回归面；旧工作项 `artifacts/` 需要兼容读。
- 兼容：旧卡片组件和 payload 保留；旧内容工具代码保留到兼容期结束，但不注册到活动 profile；旧 `artifacts/` 可读，新工作项写 `deliverables/`。

## 验收

- 12 个活动工具；无内容生成 tool。
- 8 类 deliverable 经 `DeliverableRenderer` 渲染。
- 新工作项使用 `deliverables/`；旧 `artifacts/` 可读。
- 工作项 read/update 非法变更 fail closed。
- release 仍只 `allowed-once`。
- P1.4 三场景 PASS。
