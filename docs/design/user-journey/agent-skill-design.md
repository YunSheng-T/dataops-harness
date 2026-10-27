# Stage 0–3 Agent / Skill 设计（逻辑混合模型）

> 状态：设计稿 v0
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 0+1](stage-0-1-us-intake-requirement.md) · [Stage 2](stage-2-design.md) · [Stage 3 总览](stage-3-scheme.md) · [Agent 架构](../agent-orchestration.md)

## 1. 结论

本版采用 **逻辑混合模型**：

```text
Lead / Orchestrator
  → BA owner
      → requirement worker
      → analysis worker
      → solution worker
  → SE owner
      → design feasibility worker
      → tech-plan worker
  → Dev owner
      → 可落地确认 worker
```

- **角色 owner** 是阶段责任和编排角色，不是审批人。
- **活动 worker** 是阶段内的 skill 作用域，负责产出草稿、证据和交接包。
- **人类签收**仍由 BA / requester / SE / Dev 通过卡片 UI 动作产生，Agent 不能自签。
- 同一阶段只有一个写者；Lead 不替角色下业务结论。
- 本版不启用 `@deepseek-ai/dsh-experimental-agent-team`；Agent Teams 作为后续 P4 运行时演进。

## 2. 角色与边界

| 角色 | 责任 | 不能做 |
|---|---|---|
| Lead | 接单、workitem、阶段路由、handoff、调用工具、presenter、gate 记录 | 代替 BA/SE/Dev 签收；编造业务结论 |
| BA owner | requirement/design/3a/3b 的内容责任和交接 | 自签 requirement/design/3a/3b |
| SE owner | design 可行性评审、3c 技术方案责任 | 自签 SE gate；跳过 3a/3b |
| Dev owner | 3c 可落地确认、develop handoff | 接管 3c 内容所有权；自签 Dev gate |
| requester | 需求目标/验收确认、3b advisory | 代替 BA 签收设计 |
| worker | 按 stage skill 产草稿/证据 | 推进 stage、写 approval、绕过 gate |

角色 owner 在本版是 **运行时内的责任指令**，不是独立 subagent。所有角色共享同一个 Lead 会话和 workitem；这样先保证可审计和可演示，后续再拆真实 Agent。

## 3. Skill 地图

| Skill | 何时加载 | 产出 | 退出 |
|---|---|---|---|
| `dataops-us-intake` | 用户说处理 US / 我的 US / 选任务 | USPicker 列表/详情、welcome intake | 选中 US，ensure workitem |
| `dataops-requirement` | requirement 阶段 | requirement 交付物、需求卡、gaps、证据 | BA + requester 签收 |
| `dataops-design` | design 阶段 | design 交付物、DesignCard、DataMap/证据/影响 | BA 签收；SE deferred 可推进 |
| `dataops-analysis` | 3a | analysis 交付物、AnalysisCard、候选/基线 | BA 签收；blocking=0 |
| `dataops-solution` | 3b | solution 交付物、SolutionCard、决策/备选 | BA 签收；solution-blocking=0 |
| `dataops-tech-plan` | 3c | tech-plan 交付物、TechPlanCard、一层设计血缘 | SE 签收；Dev deferred |
| `dataops-deliverable-templates` | 各内容阶段按需 | payload/schema/质量模板 | 与该阶段 skill 一起退出 |
| `workitem-protocol` | 全阶段 | workitem 状态、approvals、plan、恢复 | 工作项关闭 |
| `lineage-impact` / `model-review` / `sql-review` / `pipeline-debug` | 对应领域判断 | 影响面/建模/SQL/排障证据 | 当前判断完成 |

加载原则：

- 只加载当前 stage skill + 必要领域 skill + `workitem-protocol`。
- `dataops-deliverable-templates` 是 reference，不要求每次全量加载。
- 不把 P1/P2 已完成文档、全部用户旅程文档塞进上下文。
- 需要 DataMap/血缘/质量时，调用 Host 工具；不在 skill 里伪造数据。

## 4. 每阶段 Agent 循环

```text
Lead 读 workitem
  → 加载当前 stage skill
  → 读当前阶段输入 + facts
  → worker 产出 deliverable 草稿
  → Lead 校验 schema/证据/gaps
  → presenter 出卡
  → 停下等人类 gate（不自动推进）

人类 UI 动作
  → 结构化【签收】/【退回】用户消息
  → Lead 调 update_workitem 记录 approval
  → gate 校验
  → 通过：stage 推进 + handoff
  → 不通过：保持当前阶段，写 returned/gaps
```

Lead 不得在没有人签收时把 stage 标 done；阶段内容由 worker 产，但批准权属于人类角色。

## 5. 签收流

卡片按钮不直接调 Host tool，也不做隐藏 RPC。它只向输入框写入一条明确消息：

```text
【签收】gate=design role=BA actionId=ui-... actor=陈璐
【退回】gate=analysis role=BA actionId=ui-... reason=...
```

Lead 收到后：

1. 校验消息确实是用户轮次，含 gate/role/actionId；
2. 调 `dataops_shared_update_workitem` 写入 signoff；
3. 校验该 gate 所需角色是否齐；
4. 齐了才更新 stage/substage 和 `next`；
5. 调 presenter 重新出“已签收”卡。

`update_workitem` 拒绝无 signoff 的阶段推进；`actionId` 在 mock 中只做 UI 来源标记，不声称是密码学身份认证。Agent 自签属于技能硬禁止和测试失败。

## 6. 交接包

每个 stage skill 退出时产出：

- 当前阶段交付物路径；
- 关键决策和未采用备选；
- evidence 引用 + as_of；
- gaps + owner + mustCloseBefore；
- 下一阶段必须继承的约束；
- 人类 signoff 状态。

Lead 只传递 handoff，不重新解释成新事实。

## 7. 失败 / 退回 / blocked

| 情况 | 处理 |
|---|---|
| US 无权限/空列表 | 显示空态，允许手工输入 US ID |
| US 已有 workitem | 恢复，不新建 |
| US 已推进到后续 stage | 按 US 状态恢复 stage，不从头重走 |
| requirement 缺目标/验收 | 不进入 design，回需求方 |
| design SE rejected | 不回 scheme，回设计修改 |
| 3a blocking > 0 | 3a blocked，不进入 3b；可通过 UI 补 mock 证据后重评 |
| 3b solution-blocking > 0 | 3b blocked，不进入 3c |
| 3c blocking 未关闭 | 3c blocked；可以给后续任务承接，但不能假 pass |
| 人类退回 | 写 returned + comment，保持当前 stage |
| 证据矛盾 | 记 gap，不猜；等证据 |

## 8. 工具 allowlist

| 阶段 | 允许 | 禁止 |
|---|---|---|
| 0+1 | read_us、ensure_workitem、read_workitem、update_workitem、presenter、facts | 直接写 US、自签 |
| design | datamap、lineage、profile、evidence、presenter、update_workitem | 直接产 SQL/调度 |
| 3a | datamap、lineage、profile、evidence、presenter | 改 design 结论、跳过 blocking |
| 3b | analysis 交付物只读、lineage、evidence、presenter | 重做 3a、改 design |
| 3c | lineage、datamap、evidence、presenter | 产 SQL/调度 YAML、跳过 SE gate |

所有工具调用都通过 Host seam；skill 不拼接 CLI，不读凭据。

## 9. Agent Teams 演进

真实 Agent Teams 后置：

- 角色 owner 变成独立 Agent；
- activity worker 变成子 Agent；
- 需要补共享任务板、并发写锁、权限、handoff、审计；
- 在未验证前保持逻辑混合，避免演示时出现并发覆盖或角色自签。

## 10. 验收

- skill 触发：三个真实任务分别触发 us-intake、design、3c；
- 每个 stage 只加载正确 skill，不全局灌文档；
- 签收必须来自 UI 消息，Agent 自签测试失败；
- blocked→补证→pass 分支可复现；
- P1/P2 工作项和 e2e 不回归。
