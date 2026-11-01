# P4 Artifact 与 Slots 提示词

```text
P0～P3 已通过。现在实现 dataops-dev P4。阅读交接包 01-开发规范/05、07，slots.types.ts、dev-document.remote.ts，以及验收矩阵 ART-01～04、SLOT-01～04。

实现范围：
1. savedArtifactRef 只由 savedDigest 形成；dirty/saving/save-unknown/conflict/missing 等状态按矩阵禁用推进动作。
2. Host Action Registry 和统一 invokeAction：actionId 必须注册，参数按 schema，Host 每次重算 Session、环境、digest、权限。
3. Agent 与 UI 使用同一 Host 命令路径；Client 篡改 allowedActions 不能获得权限；模型/UI 不能传任意 URL。
4. 五类 Slots：document.renderer、document.inspector、document.actions、artifact.actions、editor.status。
5. Owner props 只读 snapshot + 受限 callback，不暴露 Cordis ctx、可写 Document Store、保存旁路或诊断注入通道。
6. 贡献声明包含 pluginId、contributionVersion、contentTypes、priority、canRender；选择冲突可诊断。
7. 每个 Slot 有 Error Boundary，扩展崩溃不影响文本和 dirty。
8. Diagnostics 只能来自 Host Provider Registry；UI Slot 只能展示/过滤/导航。
9. 用一个明确的测试贡献插件证明：不改 IDE 核心即可增加 renderer/provider/action。测试贡献不能变成生产 mock fallback。

必须运行 ART-01～04、SLOT-01～04，并验证 dirty 下即使绕过 UI 直接调用 Remote 也被 Host 拒绝。

本阶段不实现真实企业 Deliverable、Package、部署或审批，只冻结入口和权限合同。

交付《P4验证报告.md》、测试贡献示例、动作状态矩阵验证、权限与 Slot 故障测试。任何 UI/Agent 旁路都视为 P4 不通过。
```
