# ADR 0003：工具按动作命名，compile 归 CICD，Tool 不回调 Agent

- 状态：提议
- 日期：2026-10-26
- 决策者：dataops-harness 项目组
- 相关：`docs/design/blueprint-v2.md`、`packages/dataops-tools/src/tool-registry.js`、`.agents/skills/schedule-yaml/SKILL.md`（待建）

## 背景

早期工具名是名词式、阶段不明确：

- `dataops_table` / `dataops_lineage`：看不出是共享事实还是某个阶段
- `dataops_tech_plan`：看不出属于方案
- `dataops_test` / `dataops_release`：看不出属于 CICD
- 计划中的 `dataops_shared_schedule_spec` / `_yaml` 把**产物名**当工具名

同时，调度 YAML 的职责需要明确：Agent 负责方案与 spec，内部 CLI `dataops compile xxx` 负责编译，工具不应在 `execute` 里回调 Agent。

## 决策

### 1. 工具命名

```text
dataops_<scope>_<action>_<object>
```

- `scope`：`shared`（2 个以上阶段使用）或阶段名 `requirement/design/scheme/develop/cicd/review/incident`
- `action`：`read / extract / compose / generate / scan / compile / test / release / write / triage`
- `object`：能力/资源；动作已隐含对象时可省略（如 `scan/compile/test/release/triage`）
- 不使用 `_spec` / `_yaml` 这类产物名作为工具名
- 有独立契约/权限/返回才拆子能力；只是参数模式就放参数

已落地 16 个工具，详见 `packages/dataops-tools/src/tool-registry.js`。

### 2. compile 归 CICD

- Agent + `schedule-yaml` SKILL 产出归一化 `schedule-spec`
- **CICD compile** 通过工具 `dataops_cicd_compile` 调用内部 CLI：

  ```text
  dataops compile <artifact>
  ```

- 工具只负责：参数/路径、超时、退出码、stdout/stderr、返回编译产物与 diagnostics
- 不在 tool 内调用 Agent/LLM；不替 Agent 选择任务或方案
- 部署仍由外部 CICD 审批/发布系统执行

### 3. DSH 边界

- Agent 决定调用哪个 tool；Host 执行 tool；tool 返回结果给 Agent
- SKILL 是 Agent 上下文，不是可执行代码
- 如果确实需要专门 Agent，用 subagent/workflow/preset，而不是在普通 tool 内递归调用模型

## 后果

- 正面：工具名能看出 scope/动作/对象；产物名只出现在 payload/artifact；compile 的真实执行者明确为内部 CLI；测试可强制命名与归属。
- 负面：改名是 breaking change；旧会话中的旧工具名卡片会走 fallback。当前仍是 mock，建议一次性硬改名，不留别名。
- 后续新增工具必须先进 `tool-registry.js`，再注册实现；测试校验命名、shared/阶段归属、payload/card。

## 验收

- `packages/dataops-tools/scripts/check.mjs` 校验所有注册名符合 registry 与正则；
- shared 工具 `stages.length > 1`，阶段工具恰好 1；
- `dataops_cicd_compile` 标记为 CICD、external CLI，不得出现 `schedule_spec`/`schedule_yaml` 工具名；
- 客户端 toolview key、技能、文档同步。
