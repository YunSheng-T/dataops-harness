# ADR 0002：阶段是工作流投影，不是插件边界

- 状态：提议（随蓝图 v2 评审）
- 日期：2026-10-25
- 决策者：dataops-harness 项目组
- 相关：`docs/design/blueprint-v2.md`、`prototype/blueprint-v2.html`、`docs/design/framework.md`

## 背景

阶段模型从 7 段（需求 → 设计 → 方案 → 开发 → 测试 → 发布 → 复盘）调整为 6 段：

```
需求 → 设计 → 方案 → 开发 → CICD → 复盘
```

其中“方案”包含数据挖掘、数据分析、需求方案设计、技术方案输出；“CICD”包含扫描、编译构建、测试、发布/部署。

讨论中出现一个风险：如果每个阶段都新建插件、工具或卡片，公共能力会被复制，架构会按阶段层层堆积，后面没人看得懂。

## 决策

1. **阶段仅是工作流投影**：负责顺序、产物、门禁、角色与 UI 投影，不拥有能力。
2. **业务插件保持两个**：`dataops-client`（UI/渲染/阶段投影）与 `dataops-tools`（工具/契约/provider/校验）；品牌插件独立。
3. **能力按 capability 分层**：事实（table/lineage/evidence/profile）、方案（design/tech-plan/schedule）、执行（develop/test/release/cicd/postmortem/incident）共享，不按阶段 fork。
4. **设计产物一产物一 owner**：每个阶段拥有自己的产物；共享内核（workitem、evidence、命名、安全、契约、UI token）所有阶段只引用不复制。
5. **外部系统一系统一 provider**；阶段序号不进入 host tools。
6. **新增能力顺序**：契约 → provider → tool → 校验 → 卡片 → 阶段映射 → 技能；不为阶段新建插件。
7. **写操作留在外部审批/发布系统**；CICD 首版只聚合状态/门禁，不部署。

## 后果

- 正面：阶段可以演进而不引发插件爆炸；公共事实和 provider 只有一份；卡片是薄视图，便于复用；蓝图能直接回答“设计归哪个阶段、能力放哪层”。
- 负面：阶段投影需要与 host 契约解耦，client 承担更多映射逻辑；跨阶段能力（如 schedule engine）需要清楚定义契约，不能藏在某个阶段卡里。
- 兼容：现有工具与 payload 保留；当前已按 6 段投影，旧 7 段作为历史参考。

## 验收

- 蓝图 v2（`docs/design/blueprint-v2.md` + HTML）通过评审；
- 后续阶段/工具/卡片改动必须引用本 ADR，不得新增阶段专属插件；
- 新增 capability 必须按“契约 → provider → tool → 校验 → 卡片 → 阶段映射 → 技能”顺序落位。

## 一句话版本

> 阶段负责“现在做什么、交什么”，组件负责“谁提供能力、谁访问外部”；公共能力只做一份，阶段只做投影和薄卡片。
