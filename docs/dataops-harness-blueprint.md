# dataops-harness 前置研究

> 对象：工作区下的 `deepseek-harness/`（上游 harness 克隆，363 个包 / 543 篇文档）与 `dsh-desktop/`（社区桌面发行版，831MB / 5 个 workspace / 187 个补丁）。
> 目的：搞清 dsh-desktop 如何管理它和上游的关系，提取可复用的机制、技能与资产，给出 dataops-harness 的落地路线。
> 结论先行：**不要 fork。做一个 out-of-tree 的垂直发行版：锁版本、把领域能力做成插件/技能/预设、用门禁防止漂移。**

---

## 0. 一页结论

1. **dsh-desktop 不是 fork**，是"钉版本 + 消费 npm 产物 + 产品能力做成插件"的发行版。上游源码只作为只读参考仓库（git submodule），运行时不链接它。
2. 它用 5 件事管理关系：**submodule 钉源码 / npm 精确版本钉运行时 / Yarn 与 pnpm 双工作区隔离 / 187 个补丁做兼容层 / 布局门禁拒绝漂移**。
3. 这套做法的"税"很重：169 个补丁打在 `@deepseek-ai/dsh-*` 发布包上，**每个上游版本都要重放一遍**；还有 stable/beta 两份桌面代码、9 份 vendor 运行时。dataops-harness 不应该照单全收。
4. `deepseek-harness` 里最值钱的不是代码，是**组合机制**：profile / bundle / preset / skill 四层，加上 543 篇文档、21 个 skill、`.agents/notes` 决策工作流。这些可以直接拿来当"领域 harness 的骨架"。
5. 对 dataops-harness 的正确顺序是：**P0 只用 profile + skills（零代码）→ P1 只读工具插件 + MCP → P2 打成 bundle/预设发行 → P3 才谈界面和桌面**。第一天就 fork 或抄 187 个补丁是反模式。

---

## 1. 两个仓库是什么关系

```
┌──────────────────────────────────────────────────────────────┐
│ deepseek-harness（上游，MIT）                                 │
│  363 个包：core / skill / preset / bundle / workflow / sdk …   │
│  apps/cli(dsh) · apps/web · apps/desktop · python/            │
│  发布物：@deepseek-ai/dsh-* npm 包家族（当前 0.2.1-rc.3）       │
└───────────────▲──────────────────────────▲───────────────────┘
                │ 只读 pin（submodule）      │ 运行时依赖（npm 精确版本）
                │ + upstream.json 记录 commit│ + vendor/*.tgz 离线兜底
┌───────────────┴──────────────────────────┴───────────────────┐
│ dsh-desktop（社区发行版，MIT）                                 │
│  dsh-plugin-desktop / -beta：Electron 壳，本身是 DSH 插件       │
│  dsh-desktop-next：实验壳                                     │
│  dsh-community-market / fabric：插件市场 / 互操作 RFC          │
└──────────────────────────────────────────────────────────────┘
```

三者之间的**契约只有三个**，理解了就不会乱：

| 契约 | 形式 | 谁定义 |
|---|---|---|
| 包契约 | `@deepseek-ai/dsh-*` npm 包，精确 SemVer，peer 声明 `engines.dsh` | 上游 `release:pack --family dsh` |
| 插件契约 | Cordis 插件（`apply(ctx)` + `inject` + `ctx.effect`），Service Definition 而非具体实现 | 上游 `packages/*` |
| 组合契约 | profile（`$DSH_HOME/profiles/<name>/package.json` + `cordis.patch.yml`）、bundle（`package.json` 里的 `dsh.bundle.patch`）、preset（`dsh-agent-preset` 的 YAML） | 上游 `packages/boot/app-boot` + `packages/bundle` |

> 注意：上游自己也有 `apps/desktop`（`@deepseek-ai/dsh-desktop`）。dsh-desktop 是**另一个**、社区维护的桌面实现，二者不是同一份代码；dsh-desktop 的价值恰恰在于它演示了"如何在上游之外做一个完整产品"。

### 差异一览

| 维度 | deepseek-harness | dsh-desktop |
|---|---|---|
| 定位 | 内核 + 官方发行版 | 桌面产品壳（社区） |
| 包管理 | pnpm workspace | 外层 Yarn 4.18（node-modules）+ 内层 pnpm |
| 上游关系 | 自己就是上游 | submodule 只读 pin + npm 运行时 |
| 变更方式 | 直接改源码 | 不改源码；169 个发布包补丁 + 自己的插件 |
| 发布物 | `dsh` CLI、npm 包家族、Python SDK | Electron 应用 stable/beta（+next 实验）+ npm 插件包 |
| 体量 | 515MB / 363 包 / 543 文档 | 831MB / 5 workspace / 187 补丁 |

---

## 2. dsh-desktop 到底怎么管上游（7 个机制）

### 2.1 源码用 submodule 钉死，只读

- `.gitmodules` 声明 `deepseek-harness` 子模块；`AGENTS.md` 明确 "Never edit files inside it from a desktop feature branch"。
- `upstream.json` 是唯一事实源，分 `stable` / `beta` 两个通道，每通道记录 4 个字段：

```json
"stable": {
  "commit": "1f81c047…",            // 源码 pin
  "sourceVersion": "0.2.1-rc.3",    // 源码版本
  "runtimePackageVersion": "0.2.1-rc.3", // npm 运行时版本
  "runtimeSource": "vendor/dsh-runtime/0.2.1-rc.3/manifest.json",
  "package": "dsh-plugin-desktop"
}
```

- 关键认知：**源码版本 ≠ npm 运行时版本**。决策记录里写明"published package metadata 不包含源码 commit"，所以两者分开记录，避免伪造溯源（见 `dsh-desktop/.agents/notes/implemented/process/2026-08-15-pinned-upstream-and-isolated-yarn-workspace.md`）。
- 本工作区里 submodule 目录是空的（克隆时没 `--init`）；旁边那份 `deepseek-harness/` 克隆**已经包含 pin 的 commit**（`git cat-file -t 1f81c047` 通过），可以直接当参考源用。

### 2.2 运行时消费 npm 精确版本，不链接源码

- `dsh-plugin-desktop/package.json` 里所有 `@deepseek-ai/dsh-*` 依赖都写成精确版本 `0.2.1-rc.3`，不是 `workspace:*`，也不是 `^`。
- 根 `package.json` 的 `resolutions` 把 `@deepseek-ai/dsh-*` 指向 `file:vendor/dsh-runtime/<ver>/*.tgz`（例：`@deepseek-ai/dsh-brand@npm:0.2.1-rc.3 → file:vendor/dsh-runtime/0.2.1-rc.3/deepseek-ai-dsh-brand-…tgz`）。
- 好处：安装可复现、离线可打包、版本一族一致；坏处：想改上游行为只能打补丁。

### 2.3 双工作区隔离（Yarn 外层 / pnpm 内层）

- 外层 `packageManager: yarn@4.18.0` + `nodeModules` linker；上游子模块保留自己的 pnpm workspace。
- 上游命令一律走根脚本，用 Yarn portable shell 进子模块再调 Corepack pnpm：

```json
"upstream:install": "cd deepseek-harness && CI=true corepack pnpm install --frozen-lockfile",
"upstream:build":   "cd deepseek-harness && corepack pnpm run build",
"upstream:build:official": "… DSH_BUILD_CLIENT_PROFILE=official …",
"upstream:pack:dsh": "… run release:pack --family dsh"
```

- 理由（决策记录原文）：把上游 checkout 加进 Yarn workspace 会让产品构建依赖"未发布的源码布局"，而且 pnpm 规则和 Yarn 规则会互相污染。

### 2.4 vendored 运行时：把"这一次构建"冻成 tgz

- `vendor/dsh-runtime/<version>/` 下有 9 个版本的 tgz（`0.1.5-rc.2` → `0.2.1-rc.3`），配 `manifest.json`：

```json
{ "formatVersion": 1, "repository": "…", "commit": "1f81c047…",
  "version": "0.2.1-rc.3", "buildProfile": "official",
  "packages": [{ "name": "@deepseek-ai/dsh-brand", "version": "…",
                 "filename": "….tgz", "size": 6410, "sha256": "…" }] }
```

- `scripts/sync-vendored-runtime.mjs --write|--check` 负责生成/校验；`--check` 进根 `check:layout`，所以**版本一族、tgz 哈希、resolutions 三者不一致会直接红**。
- 这是"打包可复现"的关键：Electron 安装包里跑的是这批 tgz，不是 `node_modules` 里飘着的依赖。

### 2.5 补丁层：不改源码，但改发布产物（代价最大的一环）

- `patches/` 共 **187** 个，其中 **169** 个目标是 `@deepseek-ai/dsh-*` 包，文件名带版本（如 `dsh-app-boot@0.2.1-rc.3.patch`），说明是**逐版本重放**的兼容层。
- 代表性例子 `patches/dsh-app-boot@0.2.1-rc.3.patch`：给 `readProfilePatches` 增加 `context.readPatches` 钩子、给 `manifestOf` 增加 `profileContext.resolvePackageManifest` —— 都是为了让 Electron 嵌入式启动器能接管 profile 组合。也就是说：**上游没给的能力，他们靠补丁加钩子**。
- 这是 dataops-harness 最该警惕的地方：169 个补丁意味着每次上游发版都要重做一遍。**能通过插件/服务/配置解决的，绝不要打补丁。**

### 2.6 双通道 + 变体同步

- stable 与 beta 是**两个实体 npm 包、两个 app id**（`dsh-plugin-desktop`/`ai.deepseek.dsh.desktop` 与 `dsh-plugin-desktop-beta`/`…desktop.beta`），不是 Git 分支。
- 两份代码靠 `scripts/verify-desktop-variants.mjs` 做**声明式差异同步**：`SYNCED_FILES`/`SYNCED_DIRECTORIES` 列出必须一致的集合，`FILE_SPECIFIC_PAIRS` 声明允许的差异（如 `.dsh` vs `.dsh-beta`），`--from=beta` 可批量同步。CI 里 `check:desktop-variants` 把关。
- `dsh-desktop-next` 是第三个实验壳，基于固定版本，只共用已发布 Web 前端，不 fork 前端。

### 2.7 产品即插件（最重要的架构选择）

- 桌面壳本身就是一个 DSH 插件：`dsh-plugin-desktop` 同时导出 Host face、Client face、pnpm、profile-service、updates、terminal 等子路径（见其 `package.json` 的 `exports`）。
- 它只对外暴露两个 Host service：`desktopProfiles`（读当前 profile / 列出 / 请求切换）和 `desktopPnpm`（在 profile 里跑 pnpm / 管理插件）。窗口、托盘、安装器**不开放**给第三方。
- 文档写得很直白（`docs/why-desktop.md`）："Desktop 是一个产品入口和运行时适配层，不是上游项目的替代品，也不是把上游源码复制一份再长期分叉。"
- 兼容模式下它甚至不覆盖上游 layout：官方 Web Client 原样跑，只叠加 36px 的 Desktop frame。

### 2.8 门禁用机器守住边界

- `scripts/verify-layout.mjs` 会拒绝：submodule URL/commit/工作树变化、根 workspace 成员名单变化、`packageManager` 漂移、出现 pnpm lockfile、CLAUDE.md 软链断了、运行时族不一致。
- `yarn check` = 市场 check + 变体 check + 布局 check + 两个桌面包 check + connector/aa 测试，全部 headless（不开图形界面）。
- 升级上游的标准动作（按脚本与 AGENTS.md 归纳）：改 gitlink + `upstream.json`（独立 commit）→ `upstream:prepare-runtime` → `sync-vendored-runtime --write` → 重放 patches → `check:layout`/`check:vendored-runtime`/`check:desktop-variants` → 双通道打包。

---

## 3. 这对 dataops-harness 意味着什么

### 值得抄的

| 机制 | 为什么值得 | 抄法 |
|---|---|---|
| `upstream.json` + submodule pin | 溯源清楚、可对比、可回滚 | 原样抄字段；甚至可以只记录 npm 版本，不挂 submodule |
| `resolutions` 精确锁 + `engines.dsh` | 避免"昨天还能跑" | 所有 `@deepseek-ai/dsh-*` 写精确版本 |
| 布局门禁 | 把"约定"变成 CI 红灯 | 写一个 80 行的 `verify-layout.mjs` |
| 产品能力做成插件 | 升级上游不冲突 | dataops 工具 = 独立 npm 包 |
| bundle + preset 组合 | 领域能力可分发、可开关 | `dsh.bundle.patch` + `agent-preset` |
| headless 优先的门禁 | CI 不需要桌面/GUI | `--dump-config` + Loader smoke |

### 不要抄的

| 机制 | 为什么不 |
|---|---|
| 169 个上游包补丁 | 维护成本随版本线性增长；领域产品不需要改内核 |
| stable/beta 双份代码 | 只有做双通道商业发行才需要 |
| 9 份 vendor 运行时 | 除非要做离线安装包，否则 `pnpm-lock` 足够 |
| Electron/托盘/自动更新/市场 | 与 DataOps 场景无关，属于"最后一百米" |
| 自带一套 Web 前端 | 直接用上游 Web UI + 自己的 client 插件 |

### 什么时候才需要补丁

只有当"不改就跑不起来"时，例如：上游服务缺少你需要的扩展点、上游把某个 seam 写死。判断顺序应该是：
**配置 patch（cordis.patch.yml）→ 自写 provider 插件替换实现 → preset 重排 → 最后才是 npm 包补丁**。
dsh-desktop 之所以打补丁，是因为它要在 Electron 里接管 profile 加载，这是上游没设计的场景；DataOps 场景大概率不需要。

---

## 4. deepseek-harness 的高价值资产

### 4.1 组合与分发（垂直 harness 的骨架）

| 资产 | 位置 | 提供什么 | 对 dataops 的用法 |
|---|---|---|---|
| **profile** | `$DSH_HOME/profiles/<name>/`，`apps/cli/README.md` | 命名组合：`package.json` 里 `dsh.profile.bundles` + `cordis.patch.yml` 用户补丁层 | 建 `dataops` profile，装自己的 bundle |
| **bundle** | `packages/bundle/*`，`docs/architecture.md#profiles-and-bundles` | 可安装的 Cordis 配置层；`dsh.bundle.patch` 指向一个或多个 YAML 补丁 | 打包"数据运维工具集 + 技能根 + 预设" |
| **preset** | `packages/preset/agent-preset` | 用普通 Cordis YAML 声明一个 Agent 的子插件（工具/提示词/技能），会话可选 | 三个角色：数据开发 / on-call / 数据治理 |
| **official-bundles** | `packages/util/official-bundles` | 安装级 bundle 名单（模板、可选、隐藏、保护） | 你要做"官方可选 bundle"时才需要 |
| **brand** | `packages/util/brand` | 品牌化 primitive（`brandString<SessionId>`），无状态 | 白标时换显示名，不要改包名 |

**关键机制**：bundle 和 preset 都是"配置即产品"。一个数据运维工具集可以只是一个 YAML + 几个 JS 包，不需要碰内核。

### 4.2 能力面（DataOps 直接相关）

| 资产 | 位置 | 提供什么 | 场景 |
|---|---|---|---|
| **skill** | `packages/skill/*` | 技能注册表 + 文件系统发现 + 打包 provider + 面向模型的 `skill` 工具 | 领域 SOP、SQL 评审、排障手册 |
| **workflow** | `packages/workflow/*` | 模型写脚本 fan-out 子代理（PTC 沙箱 Node），返回结构化结果 | 批量表巡检、批量 DQ 规则生成 |
| **subagent** | `packages/subagent/*` | 子代理委派 + provider 注册 | "SQL reviewer" 子代理、"血缘分析"子代理 |
| **jobs** | `packages/jobs/*` | 后台任务运行时 + 模型可控工具 | 长跑 backfill、大查询 |
| **schedule** | `packages/schedule/*` | Host 侧定时跟进 | 每日数据质量晨检 |
| **mcp** | `packages/mcp/*` | 外部 MCP server 暴露为原生工具 | **首选**：接 Airflow/dbt/catalog/元数据平台 |
| **shell/fs/sandbox** | `packages/shell`、`fs`、`sandbox` | 命令执行、文件工具、进程隔离（bwrap/Landlock/Seatbelt） | 跑 `dbt`/`spark-sql`，隔离不可信脚本 |
| **interaction** | `packages/interaction/*` | 审批/交互 seam、权限预设、ask-user | 写操作前的人工确认 |
| **credentials** | `packages/credentials/*` | 凭据引用与授权流 | 数据库口令不进 prompt |
| **spill** | `packages/spill/*` | 大输出落盘 + 截断策略 | 大结果集/长日志 |
| **session / session-query** | `packages/session`、`session-query` | 追加式会话日志、全文检索、血缘 | 审计"谁在什么时候跑了什么 SQL" |

### 4.3 交付与界面

| 资产 | 位置 | 用途 |
|---|---|---|
| `deliverables` | `packages/deliverables` | 一轮对话结束时的显式文件交付 |
| `office` / `document` | `packages/skill/skill-office`、`packages/document` | Word/Excel/PPT + Office→PDF（数据报告） |
| `host` / `client` | `packages/host`、`packages/client` | Web GUI 的 Host service 与浏览器半边（slot/服务/UI 插件） |
| `sdk` | `packages/sdk/*` | 跨进程 JSON-RPC（NDJSON stdio），有 TS client |
| `python` | `python/` | Python SDK + 打包的 `dsh` 运行时（数据团队友好） |
| `acp` | `packages/acp/*` | 自动化专用 ACP 协议 server |

### 4.4 工程资产（比代码更值钱）

| 资产 | 位置 | 价值 |
|---|---|---|
| **AGENTS.md** | 仓库根 | 19KB 的"给 agent 的仓库宪法"：布局、命令、验收标准 |
| **`.agents/skills/`** | 21 个技能 | 见第 5 节 |
| **`.agents/notes/`** | `proposed/implemented/rejected/archived` | 决策记录工作流：为什么这么做、否决了什么 |
| **docs/** | 543 篇 md（中英双语） | 架构、子系统、cookbook、升级指南 |
| **cookbook** | `docs/cookbook/*` | 加工具、加包、加插件预览、加 LLM adapter 的分步指南 |
| **快照测试** | `pnpm run test:snapshot` | 无 key 回放真实会话，验证模型可见行为 |
| **门禁脚本** | `scripts/verify-*.ts` | 布局、文档、产品隔离、包 README 契约 |
| **CLI 组合图** | `apps/cli/composition.md` | 每个 shipped profile 的精确组合 |

### 4.5 一个容易被忽略的资产：真实 profile 长什么样

本机 `~/.dsh/profiles/desktop/` 就是一个活样本：

```json
{ "dependencies": { "@dpt/dsh-process-guide": "file:…" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-community-market"],
                        "patchReload": "live" } } }
```

配合 `cordis.patch.yml` 里的 `insert` 行，就把一个领域插件挂进了运行时。**这就是 dataops-harness 的最小形态**：一个 profile + 一个领域插件包 + 一份补丁。

---

## 5. `.agents/skills` 盘点（21 + 4）

`.claude/skills` 是指向 `.agents/skills` 的软链；另外 `packages/preset/agent-preset/skills/` 里还有 4 个随包分发的技能。技能发现优先级（`docs/subsystems/skills.md`）：

| rank | 来源 | 路径 |
|---|---|---|
| 100 | project-dsh | `<repo>/.dsh/skills` |
| 200 | project-agents | `<repo>/.agents/skills` |
| 300 | custom | 配置的 `customSkillDirs` |
| 400 | user-dsh | `~/.dsh/skills` |
| 500 | user-agents | `~/.agents/skills` |
| 600 | bundled | 打包 provider 配置的根目录 |

### 21 个仓库技能

| 技能 | 行数 | 做什么 | 对 DataOps 的价值 |
|---|---|---|---|
| `agent-experience` | 19 | 写工具描述/技能/上下文的元规则 | ★★★ 直接可用，**必读** |
| `dsh-error-handling` | 30 | 失败、重试、后台任务、用户可见报错的原则 | ★★★ 排障产品核心 |
| `dsh-doc` | 132 | 文档结构、双语对齐、事实核验、网站发布 | ★★★ 直接可用 |
| `dsh-code-review` | 62 | 本仓评审标准（防御式模式、ADR、门禁） | ★★★ 改领域名即可 |
| `dsh-pre-push-checks` | 137 | 按 diff 选最小测试集 | ★★★ 直接可用 |
| `dsh-create-upgrade-guide` | 54 | 破坏性变更写升级指南 | ★★☆ 有对外 API 就需要 |
| `dsh-prose-standard` | 81 | 散文/注释/提示词的分层标准 | ★★☆ 可裁剪 |
| `dsh-find-simplifications` | 65 | 找可删的重复/投机代码 | ★★☆ 可裁剪 |
| `dsh-session-projection` | 30 | 会话投影（会话派生状态的恢复） | ★★☆ 做 UI/恢复时需要 |
| `dsh-ci-test-reliability` | 131 | 并发/时钟/端口导致的 flaky 测试 | ★★☆ CI 复杂后需要 |
| `dsh-client-ui-ux` | 73 | Web 客户端视觉/反馈/菜单规范 | ★☆☆ 有 GUI 才需要 |
| `dsh-responsive-ui` | 59 | 响应式/移动端/焦点 | ★☆☆ 有 GUI 才需要 |
| `dsh-speed-up-perf` | 92 | 性能基准与门禁 | ★☆☆ 后期 |
| `dsh-translate-docs` | 74 | 双语文档翻译流程 | ★☆☆ 团队双语时需要 |
| `record-browser-gif` | 172 | 录 GIF 做 PR 演示 | ★☆☆ GUI PR 才需要 |
| `dsh-official-plugin-artwork` | 41 | 插件图标/预览图 | ★☆☆ 有插件市场才需要 |
| `cordis-styling-nitpicking` | 65 | 插件生命周期/单例/清理审查 | ☆ 仅上游维护 |
| `dsh-archive-agent-notes` | 68 | 归档/清理决策记录 | ☆ 仅上游维护 |
| `dsh-merging-stacked-prs` | 127 | 堆叠 PR 合并 | ☆ 仅上游维护 |
| `dsh-pr-description` | 204 | 上游 PR 描述模板（AI 声明分级） | ☆ 仅上游维护 |
| `dsh-trim-cot-leakage` | 45 | 清理"推理泄漏"式散文 | ☆ 仅上游维护 |

### 4 个随 preset 分发的技能（建设期最有用）

| 技能 | 价值 |
|---|---|
| `agent-experience` | 同上，工具/技能设计的元规则 |
| `cordis-plugin-development` | **写插件的标准流程**：先查 inspection → 读 package README → 读 `lib/` 或源码，附 `templates/` |
| `editing-cordis-compositions` | 改 composition/preset 的规则与校验 |
| `cordis-composition-reference` | Loader YAML 方言速查（insert/override/group/disabled/isolate/`!!js`）+ 可安装包清单 |

> 这套"元技能"其实是上游团队把"如何扩展这个系统"编码成了 agent 可读的文档，**dataops-harness 应该照这个思路写自己的元技能**：如何加一个数据源、如何加一条 DQ 规则、如何接一个新调度器。

### 技能写法范式（从这 25 个文件里归纳）

1. frontmatter 只要两个必填字段：`name`（kebab-case，与目录同名）、`description`（"何时用 + 产出什么"，一句话）。
2. 可选 `user-invocable` / `disable-model-invocation`：控制是模型自动加载还是人工 `/name` 触发（见 `dsh-pr-description`、`dsh-translate-docs`）。
3. **description 是路由，正文是流程**：目录里只出现 name+description，正文按需加载——所以 description 要写得能被"匹配"。
4. 正文短：上游自己要求渲染后的 `SKILL.md` 控制在 8192 字符以内（`packages/preset/agent-preset/README.md`），超了会被结果裁剪。
5. 大材料放 `references/`（按需读）、可复制件放 `templates/`、可执行件放 `scripts/`。
6. 用"检查清单 + 反例 + 可验证命令"结尾，而不是长篇解释；`agent-experience` 的核心就是"省 token 不等于省工作量"。

---

## 6. dataops-harness 蓝图

### 6.1 定位：三层，不是 fork

```
┌─ 分发层 ─────────────────────────────────────────────┐
│ dsh CLI profile / dsh web 内网部署 / 可选 Electron 壳  │
├─ 领域层（你写的） ────────────────────────────────────┤
│ bundle · tools(SQL/血缘/DQ/调度) · skills · presets    │
│ MCP 连接器（Airflow/dbt/catalog）                      │
├─ 运行时层（上游，钉版本） ────────────────────────────┤
│ @deepseek-ai/dsh-* 0.2.x 精确版本 + Cordis 插件协议     │
└──────────────────────────────────────────────────────┘
```

### 6.2 仓库布局（对照 dsh-desktop，砍掉 80%）

```
dataops-harness/
├── upstream.json                 # 抄 dsh-desktop：channel/version/commit/source
├── deepseek-harness/             # submodule（只读参考；不初始化也能开发）
├── package.json                  # yarn workspace + resolutions 精确锁
├── packages/
│   ├── dataops-bundle/           # dsh.bundle.patch → cordis.patch.yml
│   │   ├── cordis.patch.yml      # 插入工具、技能根、预设
│   │   └── presets/engineer.patch.yml
│   ├── dataops-tool-sql/         # defineTool: query / explain / validate
│   ├── dataops-tool-lineage/     # 影响面分析
│   ├── dataops-skill-pack/       # skills/ + bundled provider
│   └── dataops-client-ui/        # 可选：结果表格/血缘图渲染
├── profiles/dataops/             # 演示 profile（package.json + patch）
├── .agents/skills/               # 开发期项目技能（写工具/写文档）
├── docs/                         # 本文件 + 领域文档
└── scripts/verify-layout.mjs     # 锁 pin / workspace 成员 / 运行时族
```

### 6.3 版本策略

- `upstream.json` 只记 3 件事：`runtimeVersion`（精确）、`sourceCommit`（可选）、`channel`。
- 所有 `@deepseek-ai/dsh-*` 依赖写精确版本；bundle 包声明 `engines.dsh`（或对 `@deepseek-ai/dsh` 的 peer range），上游会在加载前强校验，不匹配直接拒绝加载（`packages/boot/app-boot/README.md`）。
- 升级节奏：**跟随 rc，不跟随 alpha**；每次升级跑 `--dump-config` + headless smoke + 一条真实 SQL 的 e2e。

### 6.4 首批 6 个领域技能（P0，零代码）

| 技能 | 触发 | 产出 | 依赖 |
|---|---|---|---|
| `dataops-sql-review` | 改 SQL / DDL / 大查询 | 方言/扫描量/锁/幂等/回滚 五段式评审意见 | 表元数据、执行计划 |
| `dataops-pipeline-debug` | 任务失败/延迟 | run→task→log→上游依赖 的定位路径与结论 | 调度器 API、日志 |
| `dataops-dq-rule` | 加质量规则 | 唯一性/非空/波动/分布 规则 + 阈值依据 | 采样查询 |
| `dataops-lineage-impact` | 改表/下线字段 | 下游影响清单 + 通知建议 | 血缘系统 |
| `dataops-oncall-runbook` | 告警/值班 | 分级 → 止血 → 升级 → 复盘 的处置卡 | 值班表、告警源 |
| `dataops-change-release` | 数据发布/回滚 | 双写/切流/回滚检查清单 | 发布系统 |

写法照第 5 节范式：description 一句话路由，正文给"先查什么、再查什么、什么算异常"，大材料进 `references/`（如各引擎方言差异）。

### 6.5 首批工具（P1，读优先）

| 工具 | 语义 | 安全 |
|---|---|---|
| `sql.explain` | 执行计划 + 扫描量估算 | 只读 |
| `sql.query` | 受限查询（行数/字节/超时上限，结果走 spill） | 只读连接、白名单库 |
| `lineage.impact` | 表/字段的下游影响面 | 只读 |
| `dq.run` | 跑一组质量规则，返回结构化结果 | 只读 + 计算隔离 |
| `pipeline.status/trigger` | 查/触发调度 | **写操作，必须审批** |
| `catalog.search` | 表/字段/口径检索 | 只读 |

权限模型（三层，缺一不可）：
1. **数据库层**：专用只读账号，库/表级白名单；
2. **工具层**：`tools/pre-execute` 钩子做策略门禁（`guard`/`interaction` 包已提供 seam）；
3. **会话层**：写操作走 `interaction` 的审批流，产物进 `session` 日志供审计。

> 不要把权限判断交给模型。模型只负责"决定调哪个工具"，工具自己必须拒绝越权。

### 6.6 三个 preset

| preset | 工具面 | 人设 | 适用 |
|---|---|---|---|
| `dataops-engineer` | SQL、catalog、lineage、dq | 建模/开发 | 日常取数、建表、改管道 |
| `dataops-oncall` | 日志、调度状态、告警、runbook（只读优先） | 排障/止血 | 值班 |
| `data-steward` | 元数据、口径、权限、成本 | 治理 | 评审与治理 |

preset 用 `dsh-agent-preset` 的 YAML 声明，会话里可选；每个 Agent 只看到自己那份工具与技能（`packages/preset/agent-preset/README.md`）。

### 6.7 分阶段路线

| 阶段 | 内容 | 验收 | 工期（估） |
|---|---|---|---|
| **P0 验证** | `dataops` profile + 6 个技能 + AGENTS.md；不写代码 | 用真实表跑 3 个典型任务（评审一条 SQL、定位一次失败、出一份影响面），人工打分 | 1 周 |
| **P1 工具** | `sql.explain`/`sql.query`/`lineage.impact` + 只读账号 + spill + 审批 | 模型能自己完成"查数→解释→给建议"闭环，且越权被拒 | 2–3 周 |
| **P2 发行** | 打成 `dataops-bundle`（`dsh.bundle.patch`），发内网 npm；加 preset | `dsh plugin --profile dataops add <pkg>` 一条命令装完；`--dump-config` 可审 | 2 周 |
| **P3 形态** | `dsh web` 内网部署（SSO 前置）/ 或 SDK 嵌入现有平台 / 可选桌面 | 10 人灰度，审计日志可查 | 4 周+ |

### 6.8 风险清单

| 风险 | 说明 | 对策 |
|---|---|---|
| pre-stable API | 上游明说 public API 不稳定，rc 之间会破 | 锁精确版本；升级单独排期；不写死内部类型 |
| 补丁债 | 一旦开始 patch 上游包，每次升级都要重放 | 先走配置/插件；补丁只做临时方案并记 issue |
| 技能膨胀 | 每个 skill 的 name+description 常驻上下文 | 控制数量（≤ 15）、description ≤ 1 行、大材料进 references |
| 数据安全 | 模型可能生成危险 SQL（DROP/全表扫描） | 只读账号 + 工具层门禁 + 写操作审批 + 行数/字节上限 |
| 品牌合规 | 上游 MIT，但 `@deepseek-ai` 是官方 scope | 自己的包用自己的 scope；不要暗示官方背书 |
| Node/原生依赖 | 上游要求 Node ≥ 24.9、pnpm、部分 native addon | CI 固定 Node 版本；桌面形态才需要处理 native 打包 |

### 6.9 P0 已落地文件（2026-10-24）

| 文件 | 作用 |
|---|---|
| `upstream.json` | 钉住 `0.2.1-rc.3` + 源码 commit |
| `AGENTS.md` | 仓库宪法：边界、版本、技能/工具规范、安全 |
| `.agents/skills/sql-review` | SQL/DDL 上线评审 |
| `.agents/skills/sql-optimize` | 慢查询优化（语义不变） |
| `.agents/skills/model-review` | 数仓建模评审 |
| `.agents/skills/pipeline-debug` | ETL/调度排障 |
| `.agents/skills/lineage-impact` | 改表影响面 |
| `.agents/skills/data-service-contract` | SQL→API/报表契约评审 |
| `.agents/skills/workitem-protocol` | 工作项协议：目录、状态机、证据、审批 |
| `docs/design/workbench-harness.md` | 工作台整体设计（对象模型 / 四层架构 / 工具契约 / 评测） |
| `docs/p0-setup.md` | 30 分钟跑通 + 三个验收任务 |
| `docs/skill-template.md` | 技能模板与自检清单 |
| `docs/decisions/0001-web-first-desktop-shell.md` | Web vs 客户端决策 |

---

## 7. 已知与待确认

**已确认（2026-10-24）**

- 数据栈：**全部内部自研**——数据建模、SQL 管理、ETL、调度、数据消费服务（SQL→API、SQL→报表），形态与外部主流平台接近。
- 主要用户：**数据开发**（不是纯 on-call 或纯治理）。
- 分发：开发同学倾向客户端（IDE 形态），管理层倾向 Web。结论见 `docs/decisions/0001-web-first-desktop-shell.md`：**Web 首发，桌面壳复用同一 UI**。

**仍待确认**

1. **平台接口形态**：内部平台是否有统一 OpenAPI / SDK / 消息总线？——决定 P1 走 MCP 适配器还是原生工具插件。
2. **血缘粒度**：字段级血缘是否可用？——决定 `lineage-impact` 是自动查还是人工盘点。
3. **认证与权限**：SSO/身份如何透传，是否有行级/列级权限？——决定工具层的权限模型。
4. **查询引擎与方言**：建在什么引擎上（自研 SQL 引擎 / Spark / OLAP）？——决定 `sql.explain` 的返回格式与方言规则。
5. **是否已有内部插件可复用**：本机 profile 里已装 `@dpt/dsh-process-guide`，可能可以直接演化成 `dataops-bundle`。

---

## 8. 证据索引

| 主题 | 文件 |
|---|---|
| 上游 pin 与工作区隔离决策 | `dsh-desktop/.agents/notes/implemented/process/2026-08-15-pinned-upstream-and-isolated-yarn-workspace.md` |
| 桌面架构与启动顺序 | `dsh-desktop/docs/architecture.md` |
| 为什么做桌面 / 边界 | `dsh-desktop/docs/why-desktop.md` |
| 版本与通道 | `dsh-desktop/upstream.json` |
| 运行时清单 | `dsh-desktop/vendor/dsh-runtime/0.2.1-rc.3/manifest.json` |
| 布局门禁 | `dsh-desktop/scripts/verify-layout.mjs` |
| 变体同步 | `dsh-desktop/scripts/verify-desktop-variants.mjs` |
| 运行时同步 | `dsh-desktop/scripts/sync-vendored-runtime.mjs` |
| 插件开发（Desktop） | `dsh-desktop/docs/plugin-development.md` |
| harness 架构 | `deepseek-harness/docs/architecture.md` |
| 包地图 | `deepseek-harness/packages/README.md` |
| bundle/profile | `deepseek-harness/packages/bundle/README.md`、`packages/boot/app-boot/README.md` |
| preset | `deepseek-harness/packages/preset/agent-preset/README.md` |
| 技能发现 | `deepseek-harness/docs/subsystems/skills.md` |
| 扩展写法 | `deepseek-harness/docs/cookbook/extension-cookbook.md`、`docs/user/develop/basic/tool.md` |
| SDK | `deepseek-harness/packages/sdk/README.md`、`python/README.md` |
| CLI/profile | `deepseek-harness/apps/cli/README.md` |
