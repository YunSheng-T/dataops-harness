# Stage 0–3 实现状态

> 状态：实现中
> 日期：2026-10-27
> 关联：[Agent/Skill 设计](agent-skill-design.md) · [0+1](stage-0-1-us-intake-requirement.md) · [Stage 2](stage-2-design.md) · [Stage 3](stage-3-scheme.md) · [实施蓝图](../../../prototype/stage0-3-implementation-blueprint.html)

## 已实现

### 入口与工作项

- `dataops_shared_read_us`：8 条 mock US + US-3821 详情；list/detail。
- `USPickerCard`：首 5 条、查看全部 modal、搜索/状态过滤、预览、开始处理/继续已有工作项。
- `dataops_shared_ensure_workitem`：按 `source.system + source.id` 去重创建/恢复。
- `IntakeCard`：US → workitem 接单摘要。
- `dataops:compose` 桥：卡片动作只填入输入框，不直接调 Host tool、不发隐藏 RPC。
- workitem `source`、阶段子目录、requirement/design/3a/3b/3c approvals、gate 校验。

### 卡片与当前门禁

- `conversation.chat.turnTail` 完整阶段卡：当前卡回到会话正文，可读、可签收。
- `conversation.input.dock` 阶段简报/导航器：默认折叠为当前门禁摘要；展开后显示 6 个阶段节点、卡片数量、状态；点击阶段展开列表，点击卡片打开弹窗；不在底部重复完整卡。
- 正文卡与底部简报共用 DSH `--dsh-chat-content-width`，同宽对齐；不再各自写死 max-width。
- 完整阶段卡继续留在 tool turn，作为历史/审计；Dock 只做当前 gate 动作。
- `onCompose` 优先走 DSH 原生 `conversation.input.setDraft`，草稿不再拼接；当前 Dock 一次只允许写入一个角色。


- `RequirementCard`：来源 US、目标/范围/非目标/验收/owner/requester、影响、证据、gaps、BA+需求方签收。
- `DesignCard`：target/grain/PK/partition/source/metrics/impact、DataMap 路径/资产、设计证据链、BA/SE deferred 签收。
- `AnalysisCard`：问题、DataMap、findings、baseline、candidate、comparison、feasibility、recommendation、blocked→补证→pass、BA 签收。
- `SolutionCard`：options/tradeoff、decisions、impacts/deps/risks、BA 签收。
- `TechPlanCard`：任务/依赖/SLA/工时/风险/回滚、嵌入一层设计血缘、时间带、SE 签收 + Dev deferred。
- `LineageCard` v2：完整节点/边的内联 SVG（调度→上游→加工→目标→下游）、planned/observed/diff、时间带；技术方案卡内嵌，不再依赖全屏；保留旧 v1 渲染。
- `DeliverableRenderer` 增加 `intake` 分发；旧 8 类卡片兼容。

### Mock

- `fixtures/us.js`：8 条 US，US-3821 缺口/已有工作项状态。
- `fixtures/datamap.js`：场景→主题→业务对象→逻辑实体→物理资产；6 个资产，字段/owner/行数/assetType。
- `fixtures/lineage.js`：observed/planned/diff、ETL/schedule、时间带 03:12→05:00。
- `fixtures/evidence.js`：pending / closed 两态；3a 补证分支。
- 所有数据标 `mock: true` / `sourceMode: mock`。

### 工具/技能

- 活动工具 16：12 个 P2 能力 + read_us / read_datamap / ensure_workitem / stage runtime。
- `dataops_shared_stage`：prepare 写交付物 + workitem；signoff 校验 UI actionId、聚合 gate、自动推进 stage；status 读工作项。
- 客户端 toolview 11：9 个 P2-4 + USPicker + StageResultCard。
- 新技能：`dataops-us-intake`、`dataops-requirement`、`dataops-design`、`dataops-analysis`、`dataops-solution`、`dataops-tech-plan`。
- `dataops-workflow` 路由 US 和 0–3 阶段；`workitem-protocol` 继续作为共享协议。

## 已验证

- DataOps skills 已安装到用户级 `~/.agents/skills`（symlink），新 workspace 不再依赖仓库目录；`install-dataops-skills.mjs --check` 通过。

- `packages/dataops-tools/scripts/check.mjs`：24 注册项、16 活动工具、ensure 去重、stage prepare/signoff、gate 顺序、presenter/intake。
- `packages/dataops-client/scripts/check.mjs`：11 toolview；USPicker、Intake、Analysis blocked、Lineage v2 全图/时间带、TechPlan 内嵌 lineage、StageResultCard/当前完整卡渲染。
- `smoke-apply`：16 活动工具 / 11 toolview。
- `p1.4 us-picker` E2E：USPicker 出现、开始处理、普通用户消息、workitem source 记录。
- `p1.4 ui-dock` E2E：会话正文完整卡 + 底部阶段导航可见；点卡内 BA 只生成一条签收草稿；发送后需求方按钮可继续；requirement gate approved。
- 当前门禁截图：`prototype/shots/p3-ui-dock-before.png`。
- P3 蓝图 1024/1440/1600/1920、明暗、0 console error。
- `p1.4 stage-flow` E2E：US-3821 → requirement → design → 3a blocked→closed→pass → 3b → 3c → SE 签收，PASS。

## 未完成 / 待验证

- **完整 0–3 的逐阶段 Dock 点击仍只覆盖了 requirement**：requirement 已用 turnTail Dock 真实点击；design/3a/3b/3c 的完整 live 点击仍未串成一条 E2E。
- 3a 已走真实 blocked→closed→pass；3b/3c live 内容已跑通。
- DataMap/血缘/质量的真实字段仍为 mock。
- Agent Teams 后置；当前是逻辑混合，不是独立多 Agent。
- 软门禁/审批矩阵的逐阶段 UI 点击仍待补 live e2e；当前 Dock 已有 requirement 覆盖。

## 下一步

1. 把 0–3 完整 E2E 补成逐阶段 turnTail Dock 点击，不再使用等价消息。
2. 补多视口卡片截图和明暗验收。
3. 再回到 Agent Team / 真实 adapter；Stage 4/5/6 仍不在本版。

## 自主决策记录（2026-10-27）

1. **运行时采用逻辑混合**，不启用 `@deepseek-ai/dsh-experimental-agent-team`；角色 owner + activity worker 由 skills 表达，原因见 [agent-skill-design.md](agent-skill-design.md)。
2. **活动工具扩到 16**：新增 read_us / read_datamap / ensure_workitem / stage runtime；不新增内容生成 tool。
3. **两阶段兼容**：新写入 `deliverables/<stage>/...`；旧 flat `deliverables/*.yaml` 和 `artifacts/` 继续读。
4. **签收通过 UI 动作生成用户消息**，由 stage runtime 写入并推进 gate；mock 的 actionId 不是密码学身份认证，真实系统需接身份。
5. **3a 默认 blocked**，用户点击“补充 mock 证据”后才读 closed 证据；不静默 pass。
6. **Stage 4/5/6 不进入本版**；CICD/release 只保留现有工具，不做真实发布。
7. **数据全部 mock**，所有 fixture 带 mock 标记，不冒充生产事实。
