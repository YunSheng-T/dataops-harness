# dataops-harness repository rules

本仓库是 **DeepSeek Harness 的上游之外的垂直发行版**，面向内部数据平台的使用者（数据开发、数据运维）。我们不 fork 上游：领域能力以插件、技能、预设的形式叠加在锁定版本的上游运行时之上。

## 定位与边界

- 上游 `deepseek-harness/` 是**只读参考**（submodule 或本地克隆）。不要修改其中任何文件。
- 领域能力只通过四种方式提供：`cordis.patch.yml` 配置层、Cordis 插件（Host/Client）、技能（`SKILL.md`）、Agent 预设（`dsh-agent-preset`）。
- 万不得已才给上游 npm 包打补丁（`patches/`）。打之前先问：配置能不能解决？自写 provider 能不能替换？preset 能不能重排？补丁必须写明上游版本和移除条件。
- 不复制上游源码，不重写上游 Web UI，不假设 `ui-dockkit` 等标注为 internal 的 API 稳定。

## 目录

```
upstream.json            上游版本与源码 pin（唯一事实源）
deepseek-harness/        上游只读参考（submodule）
.agents/skills/          领域技能（模型按需加载）
docs/                    设计与决策（ADR 放 docs/decisions/）
packages/                插件：dataops-client（用户面）、dataops-brand（∞ DataOps）、dataops-tools（provider 接入）、dataops-preset（Agent preset）
profiles/dataops/        独立 profile 模板（base + web-app，不碰 desktop）
scripts/install-dataops-profile.mjs  安装到 $DSH_HOME/profiles/dataops
scripts/check-dataops-preset.mjs    校验 dataops-dev preset 声明与 profile 接线
scripts/check-dataops-workitem.mjs  校验工作项模板、delivery overlay 与 artifact/evidence 引用
prototype/               原型与真机截图（不进产物）
scripts/verify-layout.mjs 门禁（待补）：pin/workspace/版本族一致性
```

## 版本与升级

- `upstream.json` 是唯一事实源；所有 `@deepseek-ai/dsh-*` 依赖写**精确版本**，禁止 `^`/`~`/`workspace:*`。
- 升级步骤（必须独立提交，不与功能改动混合）：
  1. 改 `upstream.json` 的 `runtimeVersion` / `sourceCommit`；
  2. 更新依赖与 lockfile；
  3. `node scripts/verify-layout.mjs`；
  4. 跑 `--dump-config` + headless smoke + 一条真实 SQL 的 e2e；
  5. 记录到 `docs/decisions/`（升级了什么、破了什么、怎么修的）。

## 运行与验证

```sh
# 构建两个客户端包
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs

# 安装独立 profile（默认 ~/.dsh/profiles/dataops，不碰 desktop）
node scripts/install-dataops-profile.mjs
node scripts/install-dataops-skills.mjs
node scripts/check-dataops-preset.mjs
node scripts/check-dataops-workitem.mjs

# 原生 dsh（推荐；离线时用 ./scripts/dsh 代替）
dsh --profile dataops --dump-config
dsh --profile dataops
```

- 桌面端自带的运行时是 `0.2.1-rc.2`；两个插件的 `engines.dsh` 是 `>=0.2.1-rc.2 <0.3.0`，所以 rc.2 / rc.3 都能装。
- 不要再对 `dataops` profile 跑 `--from-default-profile`，会覆盖我们的 patch。

- 开发期一律 headless 验证：不开图形界面、不依赖桌面壳。
- 任何涉及真实数据的测试用只读账号，并在测试后清理产物。

## 重大变更：先蓝图，后实现

以下任一变化视为**重大变更**：

- 阶段模型、阶段顺序、阶段门禁变化
- 插件/组件边界、Host/Client 职责变化
- Agent 拓扑、preset、技能架构、工作项状态机变化
- 工具集合、工具契约、payload/artifact 契约变化
- 用户入口、阶段卡、右栏、审批等用户面流程变化
- 真实 provider/权限/写平台边界变化
- 其他 breaking change 或需要跨阶段迁移的改动

小 bug、文案、局部样式、纯内部重构可豁免；判断不清时按重大变更处理。

### 执行顺序

1. **先设计，后实现**：先写设计文档和 ADR，明确取舍、边界、迁移、待拍板项。
2. **出全量蓝图**：`prototype/<topic>-blueprint.html`，自包含、可切换明暗、和 `blueprint-v2.html` 同一视觉基线。
3. **出增量蓝图**：`prototype/<topic>-blueprint-delta.html`，只显示相对上一版的改动，至少包含：
   - Before / After 对照
   - 新增 / 保留 / 迁出 / 替换 / 删除
   - 不变的边界，避免过度改造
   - 迁移顺序和兼容期
4. **验证并截图**：
   - 1024 / 1440 / 1600 / 1920 宽度下 `document.documentElement.scrollWidth <= innerWidth`
   - 1440 视口图 + 全页图，放 `prototype/shots/`
   - 明暗切换正常，0 console error
5. **等架构确认后再动运行时**：设计/蓝图确认前，不把架构改动混进实现。
6. **实现时同步更新**：如果实现中发现边界变化，全量蓝图、增量蓝图、ADR 必须同步更新，不能只改代码。

### 全量蓝图至少回答

- 目标/非目标
- 用户入口与端到端旅程
- 组件/Agent/Provider 拓扑
- 领域模型与契约（workitem、artifact、approval 等）
- 工具、技能、preset、状态机的职责边界
- 关键时序与失败/审批路径
- 不变量、迁移路线、待拍板项

### 文件与链接

- 全量：`prototype/<topic>-blueprint.html`
- 增量：`prototype/<topic>-blueprint-delta.html`
- 截图：`prototype/shots/<topic>-blueprint.png`、`<topic>-blueprint-full.png`
- 设计：`docs/design/<topic>.md`
- 决策：`docs/decisions/<NNNN>-<topic>.md`
- 在 README、设计文档、蓝图 footer 中互相链接；旧版蓝图保留，不覆盖。

参考样例：

- [Agent 架构全量蓝图](prototype/agent-architecture.html)
- [v2 → Agent v1 增量](prototype/agent-architecture-delta.html)
- [Agent 编排设计](docs/design/agent-orchestration.md)
- [ADR 0004](docs/decisions/0004-agent-workbench-orchestration.md)

## 技能规范

- 一个技能一个目录：`.agents/skills/<kebab-case>/SKILL.md`，目录名与 frontmatter `name` 一致。
- `description` 写「何时用 + 产出什么」，一句话；它是唯一常驻上下文，禁止写成正文摘要。
- 正文控制在 8000 字符以内；大材料放 `references/`，可复制件放 `templates/`，可执行件放 `scripts/`。
- 技能只写**流程与判定口径**，不写具体表名、账号、内网地址；这些属于部署配置。
- 工具还没实现时，技能必须写清降级路径（「工具不可用时让用户提供 X」）。
- 新增/修改技能后，用三个真实任务验证它确实被触发，而不是被忽略。

## 工作项

- 跨多轮、会产生交付物的任务，先建 `workitems/<YYYY-MM-DD>-<slug>/`；协议见 `workitem-protocol` 技能。
- 结论必须带证据（`evidence/ev-*.yaml`：查询 + 时间范围 + as_of）；没有证据的结论不进入 `artifacts/`。
- 状态变更写回 `item.yaml`，并在 `plan.md` 追加一行（时间 + 变更 + 原因）。
- 动 `prod` 或 T3/T4 操作前，必须有审批记录（`decision.md`）；没有审批不要执行。

## 工具规范（P1 起）

- **只读优先**：默认只读连接；写操作（DDL、触发任务、改配置）必须走审批，且审批前展示将执行的具体语句。
- **权限在工具层**：不依赖模型判断。库/表白名单、行数上限、字节上限、超时都在工具里强制。
- **输出有界**：大结果走 spill，返回摘要 + 句柄；禁止把整份结果塞进上下文。
- **失败可诊断**：错误信息包含对象、阶段、可执行的下一步；不吞异常，不返回「未知错误」。

## 安全与合规

- 凭据只经 `credentials` 服务解析，**永远不要**出现在提示词、日志、测试数据里。
- 生产数据不得进入测试夹具；需要样例时用脱敏或合成数据。
- 模型输出不是事实：涉及数据结论时必须附带查询与时间范围，便于复核。
- 不要在任何文档或包名中暗示与 DeepSeek 官方的隶属或背书关系；换品牌按 `docs/design/rebranding.md` 执行（产品名/Logo 用品牌包，主题与 `@deepseek-ai/*` 不动）。
- 真实平台接入按 `docs/design/integration.md`：只读、token 走 credentials/env、字段缺失进 gaps，不编造。

## 提交

- 一个提交一件事：pin 升级、技能新增、工具新增、文档修改分开。
- 破坏性变更（技能改名、工具签名变化、preset 默认值变化）必须写 ADR 或升级说明。
- 不提交本地 profile、`node_modules`、运行产物与真实凭据。
