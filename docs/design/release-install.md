# 发布与安装设计

> 状态：设计稿 · 待架构确认  
> 日期：2026-10-31  
> 关联：[ADR 0013](../decisions/0013-release-install-unit.md) · [全量蓝图](../../prototype/release-install-blueprint.html) · [增量蓝图](../../prototype/release-install-blueprint-delta.html)

## 1. 问题

当前 DataOps 的安装方式面向开发机：安装脚本把四个 local package 以绝对路径 symlink 到 profile，技能以 symlink 写进用户级 `~/.agents/skills`，profile 的 `cordis.patch.yml` 由脚本直接覆盖。它足够支撑本机迭代，但不足以发放给其他 DSH / DSH Desktop 用户：

1. **安装单元不成立**：用户实际安装的是一个 profile + 四个包 + 一套全局技能，不是 DSH 支持的“一个 bundle + 一条安装命令”。
2. **安装路径不是官方路径**：没有经过 `dsh plugin` 的 pnpm 管理，profile 缺 lock/.modules；DSH Desktop 启动时会检测到 legacy 依赖布局并自动迁移，迁移失败则启动失败。
3. **发布单元不自包含**：`@dataops/dsh-dataops-preset` 声明了 `dsh.bundle`，但 patch 只声明 Agent preset；`dataops-tools` / `dataops-brand` / `dataops-client` 的挂载行在 `profiles/dataops/cordis.patch.yml`。只安装这个 bundle，DataOps 工作台不会出现。
4. **生命周期缺失**：没有正式版本号、changelog、receipt、升级/回滚/卸载；安装器会覆盖用户 provider 配置；技能与 DSH/Desktop 版本没有绑定。
5. **信任与合规未收口**：仓库没有根 LICENSE，四个包没有 license 字段；client bundle 内联第三方代码与产品图标；安装即执行 Host 代码，但没有 registry ACL、校验和/签名和安装确认。

本设计把“本地安装”升级为“可发放的发布与安装模型”，同时保持不 fork 上游、不改 DSH Desktop 本身。

## 2. 目标与非目标

### 2.1 目标

- 用户只安装 **一个发布 bundle**，使用 **一条官方命令**，得到完整 DataOps 工作台。
- 默认安装到 **独立 profile**（`dataops`），不覆盖用户现有 `desktop` profile。
- 在 DSH CLI/Web 与 DSH Desktop 上走同一套 profile 与 bundle；Desktop 只负责重启和切换 profile。
- profile 由 pnpm 管理，可升级、可回滚、可卸载；保留用户 patch 与 workspace 里的 workitems。
- 安装前检查 DSH 版本、pnpm、DSH_HOME 与 profile 状态；版本不匹配明确拒绝。
- 支持内部 registry 与离线 tarball 两条渠道；产物有版本、校验和、NOTICE 和安装回执。
- 发布前在 `0.2.1-rc.2`、`0.2.1-rc.3` 和 Desktop 的 compatibility / extended / advanced 三种模式上完成 smoke。

### 2.2 非目标

- 不制作 DataOps 品牌桌面 App，不修改 `dsh-desktop` 源码，不接管 DSH 自动更新。
- 不实现公共插件市场上架；v1 只走内部 registry / 离线包。
- 不把插件装进用户现有 `desktop` profile 作为默认路径；品牌替换、默认 preset 和工具集变化会侵入用户环境。
- 不接真实 provider；bundle 默认 `mock`，真实域由部署配置和后续适配提供。
- 不改变 Stage 0–5、工具契约、workitem 格式或品牌边界。

## 3. 现状与约束

### 3.1 现状事实

| 对象 | 现状 | 问题 |
|---|---|---|
| `packages/dataops-client` | 0.0.1，private，engines | 无 license，无发布配置 |
| `packages/dataops-brand` | 0.0.1，private，engines | 同上 |
| `packages/dataops-tools` | 0.0.1，private，engines | 同上 |
| `packages/dataops-preset` | 0.0.0，private，只有 `dsh.bundle.patch` | 无 engines、无依赖，patch 不自包含 |
| `profiles/dataops` | 手写 profile 模板 | 安装脚本覆盖写，不是官方安装路径 |
| `install-dataops-profile.mjs` | `file:` + 绝对 symlink，写全局 skills | 断链、Windows 权限、无回执/卸载 |
| `pack-dataops-offline.mjs` | tar.gz + sha256 | 产物没有版本语义，安装仍走旧脚本 |

本机实测补充：

- DSH Desktop 2.0.18 自带 `dsh 0.2.1-rc.2`；仓库参考源码 pin 是 `0.2.1-rc.3`；兼容范围是 `>=0.2.1-rc.2 <0.3.0`。
- DSH Desktop 的 `DSH_HOME` 默认为 `~/.dsh`，会列出自定义 profile。
- 自定义 profile 默认只有 `@deepseek-ai/dsh-base`；Desktop 启动要求 profile 含 `@deepseek-ai/dsh-web-app`，否则报错。因此新 profile 必须先按 `web` 模板初始化，再安装 bundle。
- 只 `dsh plugin add` 一个只含 preset 的 bundle，profile 里不会出现 tools/brand/client 行；工作台不会出现。
- 旧 symlink profile 缺 pnpm lock/.modules；Desktop 会检测到 legacy 依赖布局并尝试用内置 pnpm 迁移。迁移失败会阻止启动。

### 3.2 约束

- 不修改 `deepseek-harness/` 与 `dsh-desktop/`；不复制上游源码。
- 不改变 `@deepseek-ai/*` 包名、`dsh` 命令、`DSH_*` 环境变量、session 格式和 wire 字段。
- 品牌只换名字/Logo；主题 token 与官方包名不动。
- 任何 runtime 变更必须等本设计与蓝图确认后再做；本阶段只产出设计、ADR、蓝图和验证脚本。

## 4. 决策

### D1 · 发布单元：一个自包含 bundle

新增 `packages/dataops-bundle`（`@dataops/dsh-dataops-bundle`），作为用户唯一安装目标。它：

- 声明 `dsh.bundle.patch`，patch 组合：
  - `dataops-tools` 行（默认 `provider: mock`、`disabledTools`）
  - `dataops-brand` 行
  - `dataops-client` 行
  - 禁用官方 `ui-brand-official`
  - `agent-preset-registry.default = dataops-dev`
  - `preset-dataops-dev` 行（来自 `dataops-preset` 的 patch 片段）
- 依赖 `@dataops/dsh-dataops-client`、`-brand`、`-tools`、`-preset` 的**精确版本**；其中 `-preset` 用于 patch 源片段与版本对齐，运行时由 bundle patch 组合，不单独激活。
- 声明 `engines.dsh`，值来自 [upstream.json](../../upstream.json) 的 `compatibleRuntimeRange`。
- 首版版本 `0.1.0`；四个依赖同版本发布。

patch 不手写两份：构建时由 `profiles/dataops/cordis.patch.yml` 与 `packages/dataops-preset/cordis.patch.yml` 生成 `packages/dataops-bundle/cordis.patch.yml`，生成结果随包发布。生成器与校验放在 `scripts/`，release gate 检查生成结果与源片段一致。

### D2 · 安装单元：独立 `dataops` profile

默认安装到 `$DSH_HOME/profiles/dataops`，从 shipped `web` 模板初始化（确保 `dsh-base` + `dsh-web-app`），再安装 bundle。理由：

- 不覆盖用户现有 `desktop` profile 的品牌、默认 Agent 和插件选择。
- 失败可回滚：删掉 `profiles/dataops` 即可恢复；workspace 的 workitems 不受影响。
- Desktop 会自动为任何含 `dsh-web-app` 的 profile 注入 desktop shell，仍然保留桌面窗口、托盘和 profile 切换。

v1 **不支持**把 bundle 装进用户现有 profile 作为默认路径。未来如果要做，必须把品牌、默认 preset、工具集拆成可选 bundle，并单独设计合并/冲突策略。

### D3 · 安装路径：官方 `dsh plugin add`

用户路径统一为：

```sh
dsh --profile dataops --from-default-profile web --dump-config   # 仅首次，初始化 web 模板
dsh plugin --profile dataops add @dataops/dsh-dataops-bundle@0.1.0
dsh --profile dataops --dump-config
dsh --profile dataops
```

- `--from-default-profile web --dump-config` 只用于**新 profile**；已有 profile 不能执行，会覆盖。
- `dsh plugin add` 由 pnpm 管理 profile，生成 lock/.modules；不再用 symlink。
- 发布安装器封装上面的步骤，并做 preflight、receipt、skills、验证和错误提示；但底层仍是官方命令，不手写 profile。
- 开发期保留 `profiles/dataops` 与旧脚本作为 dev-only 路径，release 安装器不使用。

### D4 · DSH Desktop

- 与 CLI 共用 `$DSH_HOME`（默认 `~/.dsh`）；安装后重启 Desktop，在 profile 列表选择 `dataops`。
- Desktop 会为自定义 web profile 注入 desktop shell；不修改 `desktop` profile，不改 Desktop 应用。
- 安装后必须重启；profile 切换是重启操作。Desktop 已安装的插件不会热更新。
- 必须验证 compatibility / extended / advanced 三种呈现模式；默认推荐 compatibility，因为品牌与官方 sidebar 的行为最接近上游。
- 不继承用户 `desktop` profile 里的 market / bridge 等 bundle；这是独立 profile 的预期边界，需要在用户文档中写清。

### D5 · 版本与兼容

- 所有发布包使用同一 SemVer（首版 0.1.0）；bundle 与依赖精确锁定。
- `engines.dsh` 使用 `>=0.2.1-rc.2 <0.3.0`；不匹配时安装/启动拒绝，不用 `compatibility.json` 豁免硬扛。
- 发布矩阵至少覆盖：
  - DSH CLI `0.2.1-rc.2`
  - DSH CLI `0.2.1-rc.3`
  - DSH Desktop 2.0.18（runtime rc.2）compatibility / extended / advanced
- 上游是 pre-stable；每次 DSH 升级都要重跑 Host boot、client module graph、Desktop 三模式 smoke。0.3.0 到来时先升级插件再放开范围。

### D6 · 配置

- bundle patch 提供可离线运行的默认值：`provider: mock`、`timeoutMs`、`disabledTools`、默认 preset。
- 用户/部署配置写入 profile 自己的 `cordis.patch.yml`（用户 overlay），包括真实 `domains`、`tokenRef`、`baseUrlEnv`。
- 安装器**不覆盖**已有 `cordis.patch.yml`；首次安装写一个带注释的空 overlay，升级时只备份不合并正文。需要写入时先备份 `cordis.patch.yml.bak-<timestamp>`。
- 真实 token 只通过环境/credentials 解析；不进入 bundle、日志、fixture 或安装回执。

### D7 · 技能

- 技能不再默认写 `~/.agents/skills`。DSH 的 `skill-filesystem` 默认会扫描 `$DSH_HOME/skills`，安装器把 DataOps 技能复制/链接到该 root（`$DSH_HOME/skills/<skill>/SKILL.md`），作用域是当前 DSH home，而不是用户所有 agent。
- 安装前做重名 preflight：发现同名非 DataOps 技能时停止并让用户选择 `--force` / `--skip`；不静默覆盖。
- 可选的 `--workspace` 模式把技能安装到项目的 `.agents/skills`，适合只在一个仓库启用。
- bundle 本身不依赖全局技能；技能缺失时 workflow 仍能启动，只是没有对应的方法论提示。
- **不默认安装 upstream 的开发技能**（`deepseek-harness/.agents/skills` 下的 `dsh-*` 等）：它们是维护者/开发技能，不是 DataOps 用户面能力。用户包只带 `.agents/skills` 中经过筛选的工作流技能；如需上游技能，按白名单单独安装。

### D8 · 生命周期与回执

安装器在 `$DSH_HOME/dataops/install.json` 写回执：

```json
{
  "schema": 1,
  "bundle": "@dataops/dsh-dataops-bundle",
  "version": "0.1.0",
  "dshVersion": "0.2.1-rc.2",
  "profile": "dataops",
  "installedAt": "2026-10-31T00:00:00Z",
  "artifacts": ["profile", "bundle", "skills"],
  "skillRoot": "$DSH_HOME/skills",
  "sha256": "<bundle tarball digest, optional>"
}
```

- 升级：`dsh plugin --profile dataops add @dataops/dsh-dataops-bundle@<new>`；保留用户 patch，重启生效。
- 回滚：重新 add 旧版本；回执记录上一版本。
- 卸载：删除 profile（可选保留）、删除本安装器写入的技能、删除回执；workspace 的 workitems 不动。
- 失败恢复：安装失败不留下半安装 profile；备份文件保留；输出可执行的下一步。

### D9 · 发布渠道

- **主渠道：内部 npm registry**。发布 bundle + 四个依赖的精确版本；配置 registry ACL 和 scope 权限。
- **离线渠道：tarball 集**。`pnpm pack` 出 bundle + 四个依赖，生成 `manifest.json` 和 `sha256sum`；安装器一次性 add 全部 tarball。发布前验证 pnpm 能用本地 tarball 满足精确依赖；若不能，离线渠道改用内部 registry 镜像。
- **后续渠道**：DSH Desktop 插件市场 / 公共 npm / 品牌桌面 App。v1 不做；market 上架涉及公开索引、安全审核和品牌合规。

### D10 · 信任与合规

- 发布包必须有 `LICENSE`、`THIRD_PARTY_NOTICES`；覆盖 React、ReactFlow、Montserrat（OFL）、产品图标商标。
- 安装即执行 Host 代码；内部 registry 要有 ACL，产物提供 sha256，条件允许时增加签名/attestation。
- 不暗示与 DeepSeek 官方存在隶属、合作、授权或背书关系；README/关于页保留独立声明。
- 已知限制：宿主窗口/页面标题仍可能是 `DeepSeek Harness`，插件运行时改不了；不要把它包装成 DataOps 品牌桌面端。

## 5. 目标架构

### 5.1 拓扑

```text
source repo
  packages/dataops-{client,brand,tools,preset}
  packages/dataops-bundle            ← distribution bundle
  profiles/dataops                    ← dev profile / source fragment
        │
        ▼
build + verify (patch generation, engines, license, package check)
        │
        ├── private registry (primary)
        └── tarball set + sha256 (offline)
        │
        ▼
installer (preflight → seed web template → dsh plugin add → verify → skills → receipt)
        │
        ▼
$DSH_HOME/profiles/dataops
  package.json        base + web-app + dataops-bundle
  node_modules/       pnpm-managed
  cordis.patch.yml    user overlay (defaults/comments)
  pnpm-lock.yaml
        │
        ├── dsh --profile dataops          (CLI/Web)
        └── DSH Desktop restart → select   (desktop shell auto-injected)
```

### 5.2 包契约

| 包 | 角色 | 发布 | `dsh.bundle` | `engines.dsh` | 依赖 |
|---|---|---|---|---|---|
| `@dataops/dsh-dataops-bundle` | 唯一用户安装目标 | 是 | 是（组合 patch） | 是 | 四个包精确版本 |
| `@dataops/dsh-dataops-preset` | preset 定义 / patch 源片段 | 是（作为依赖，不单独激活） | 是 | 是 | 无 |
| `@dataops/dsh-dataops-tools` | Host 工具 | 是 | 否 | 是 | cordis peer |
| `@dataops/dsh-dataops-client` | Client 卡片 | 是 | 否 | 是 | cordis peer |
| `@dataops/dsh-dataops-brand` | 品牌占用 | 是 | 否 | 是 | cordis peer |

所有包：`private` 移除，补 `license`/`repository`/`publishConfig`；client/brand 的 `prepack` 构建 `lib/`；bundle 的 `prepack` 生成 patch 并校验依赖版本。

### 5.3 profile 层序

```text
1. @deepseek-ai/dsh-base          官方 base
2. @deepseek-ai/dsh-web-app       官方 Web 载体（Desktop 必需）
3. @dataops/dsh-dataops-bundle    DataOps 组合 patch
4. profile/cordis.patch.yml       用户/部署覆盖
5. $DSH_HOME/cordis.patch.yml     机器级偏好
6. --patch <path>                 CLI 临时覆盖
```

后层覆盖前层；bundle 的 patch 必须一次写全每个 row 的 config，不能依赖深合并。

## 6. 安装流程

### 6.1 Preflight

安装器在写任何文件前检查：

1. `dsh` 可执行，`dsh --version` 在 `engines.dsh` 范围内。
2. `pnpm` 可用；Desktop 终端应使用 Desktop 自带 shim。
3. 解析 `DSH_HOME`（默认 `~/.dsh`）；检查目标 profile 是否存在。
4. 检查目标 profile 是否已有 DataOps bundle；已有则走 upgrade 分支。
5. 检查 registry 可达（在线）或 tarball 完整、sha256 匹配（离线）。
6. 检查技能重名与 `$DSH_HOME/skills` 写入权限。
7. 输出将执行的命令和写入路径，等待用户确认（非交互模式需 `--yes`）。

任一失败：不写文件，退出非零，给出可执行的修复命令。

### 6.2 新 profile（推荐）

以下命令是目标形态；`dataops-install` 等安装器在 M2 之前不存在，当前仓库仍使用 dev 脚本。

```sh
# 1) 初始化 web 模板（不启动；仅新 profile）
dsh --profile dataops --from-default-profile web --dump-config

# 2) 官方安装
dsh plugin --profile dataops add @dataops/dsh-dataops-bundle@0.1.0

# 3) 组合验证
dsh --profile dataops --dump-config

# 4) 安装技能（可选，默认开启）
dataops-install --skills-only

# 5) 启动
dsh --profile dataops
# Desktop：重启 App → 切换 profile → dataops
```

安装器会生成 receipt 和一条“如何回滚/卸载”的提示。

### 6.3 已有 DSH / 已有 profile

- 如果用户已有 `dataops` profile：安装器识别旧 symlink 布局，拒绝静默覆盖；提供 `--migrate`（备份旧 profile，重新初始化并导入用户 patch）或 `--reset`（显式覆盖）。
- 如果用户想装进现有 `desktop` profile：v1 只提供文档说明和手动命令，不承诺支持；品牌/默认 preset 会改变用户环境，需单独评审。
- 如果用户在其他 DSH 发行版/ fork：不做兼容承诺；只保证官方 DSH 与 DSH Desktop 的测试矩阵。

### 6.4 离线

```sh
shasum -a 256 -c dataops-0.1.0.sha256
dataops-install --offline ./dist/dataops-0.1.0
# 内部：dsh plugin add ./bundle.tgz ./client.tgz ./brand.tgz ./tools.tgz ./preset.tgz
```

离线模式不访问 registry；安装器先校验全部 tarball 和依赖版本，再执行 add。

## 7. 版本与兼容

| 维度 | 规则 |
|---|---|
| 插件版本 | SemVer；首版 0.1.0；bundle 与四个依赖同版本 |
| DSH 版本 | `engines.dsh = >=0.2.1-rc.2 <0.3.0` |
| Desktop | 2.0.x；以 desktop 实际内置 runtime 为准 |
| 安装拒绝 | 版本不匹配、缺 pnpm、profile 缺 web-app、bundle 缺依赖 |
| 启动拒绝 | bundle 兼容检查失败；row 级兼容检查拒绝时打印 package/version/risk |
| 豁免 | v1 不使用 `compatibility.json`；升级插件而不是放宽范围 |
| 升级节奏 | 每次 DSH/Desktop 升级独立提交 + 独立 smoke；不与功能改动混合 |

### 7.1 发布矩阵

```text
DSH 0.2.1-rc.2  ×  CLI/Web        ×  install + dump-config + boot + client graph
DSH 0.2.1-rc.3  ×  CLI/Web        ×  install + dump-config + boot + client graph
DSH Desktop 2.0.18 (rc.2)          ×  compatibility / extended / advanced
macOS arm64                         ×  clean DSH_HOME install/uninstall
Windows x64                         ×  pnpm profile + skills + path/no-symlink
```

Linux 作为 CI/容器补充；没有真机时标注“未验证”，不当作已支持。

## 8. 配置与技能

### 8.1 配置分层

- bundle 默认：`provider: mock`、`timeoutMs`、`disabledTools`、默认 preset、品牌行。
- 用户 overlay：真实 `domains`、`tokenRef`、`baseUrlEnv`、CLI 命令、workspace 路径。
- 安装器只写空 overlay 注释；升级保留用户正文；需要改默认值时只提示 diff，不自动合并。

### 8.2 技能

- 默认 root：`$DSH_HOME/skills`（`skill-filesystem` 的 user-dsh root）。
- 可选 root：项目 `.agents/skills`（`--workspace`）。
- 不再写 `~/.agents/skills`；如果用户显式要求，才使用 `--agents-home` 兼容路径。
- 重名 preflight：同名非 DataOps 技能默认停止；`--force` 才覆盖，并记录到 receipt。
- 技能名称/内容不进入 bundle 的运行时依赖；bundle 缺技能仍可启动。

## 9. 生命周期

| 动作 | 用户命令 | 系统行为 | 失败处理 |
|---|---|---|---|
| 安装 | `dataops-install` | seed web → add bundle → verify → skills → receipt | 回滚新 profile；保留备份 |
| 升级 | `dsh plugin ... add ...@new` | pnpm 更新 → dump-config → 重启提示 | 重新 add 旧版本 |
| 回滚 | `dsh plugin ... add ...@old` | 旧版本覆盖；receipt 更新 | 保留当前版本；输出错误 |
| 卸载 | `dataops-uninstall` | 删除 profile（可选）、技能、receipt | 失败不删用户数据 |
| 诊断 | `dataops-doctor` | 版本、profile、dump-config、skills、日志 | 输出支持包路径 |

不变量：卸载/升级不删除 workspace 的 `workitems/`、`artifacts/`、`evidence/`；不修改 `desktop` profile；不删除用户自己的技能。

## 10. 发布流水线与门禁

```text
1. clean checkout + pinned upstream
2. node scripts/verify-local.mjs
3. node scripts/check-dataops-preset.mjs
4. node scripts/check-dataops-workitem.mjs
5. node scripts/check-stage-contract.mjs
6. node scripts/check-offline-surface.mjs
7. node scripts/build-dataops-bundle.mjs        （生成 patch）
8. node packages/dataops-client/scripts/build.mjs
9. node packages/dataops-brand/scripts/build.mjs
10. pnpm pack (bundle + 4 deps) → dist/
11. sha256sum / manifest.json
12. clean-home install smoke（rc.2 / rc.3）
13. Desktop 三模式 smoke（人工/脚本）
14. docs / release notes / compatibility matrix
```

发布产物：

```text
dist/dataops-0.1.0/
  dataops-dsh-dataops-bundle-0.1.0.tgz
  dataops-dsh-dataops-client-0.1.0.tgz
  dataops-dsh-dataops-brand-0.1.0.tgz
  dataops-dsh-dataops-tools-0.1.0.tgz
  dataops-dsh-dataops-preset-0.1.0.tgz
  manifest.json
  sha256sum
  THIRD_PARTY_NOTICES.md
```

## 11. 安全与合规

- 安装即执行 Host 代码；安装器必须显示目标、版本、来源，并要求确认。
- registry 使用内部 ACL；scope `@dataops` 的写权限只给 release CI。
- tarball 提供 sha256；条件允许时增加签名/attestation；安装器校验后再 add。
- 凭据只通过 credentials/env；不进入 bundle、receipt、日志、fixture。
- LICENSE + THIRD_PARTY_NOTICES：React/ReactFlow、Montserrat OFL、产品图标商标。
- 品牌：独立项目声明；不暗示官方背书；宿主标题限制写入用户文档。
- 供应链：依赖精确版本；发布前检查 `check-offline-surface`，禁止公网运行时 URL。

## 12. 失败模式与回滚

| 失败 | 检测 | 处理 |
|---|---|---|
| DSH 版本不匹配 | preflight `dsh --version` | 拒绝安装；给出兼容范围 |
| 缺 pnpm | preflight | 提示 Desktop 终端/安装 pnpm |
| profile 缺 web-app | `--dump-config` 失败/Desktop 报错 | 重新按 web 模板初始化（仅新 profile） |
| registry 不可达 | add 失败 | 切离线 tarball 或稍后重试 |
| tarball 校验失败 | sha256 | 拒绝安装，重新下载 |
| 旧 symlink profile | preflight 检测 | `--migrate` 备份后重建，或 `--reset` |
| 升级后启动失败 | dump-config/boot | 回滚旧版本；保留 receipt |
| 技能重名 | preflight | 停止；`--skip` / `--force` |
| 权限不足 | 写入前 | 拒绝并给出 `DSH_HOME` 路径/权限建议 |

## 13. 迁移路线

### M0 · 设计冻结（本阶段）

- 确认本设计、ADR 0013、全量/增量蓝图。
- 不改 runtime；只产出文档、蓝图、验证脚本。

### M1 · bundle 包与 patch 生成

- 新增 `packages/dataops-bundle`；生成组合 patch。
- 给所有包补 engines/license/repository/publishConfig；版本统一 0.1.0。
- 保留 `profiles/dataops` 作为 dev profile / 源片段。

### M2 · 安装器与生命周期

- `dataops-install` / `dataops-doctor` / `dataops-uninstall`；preflight、receipt、备份。
- 技能安装到 `$DSH_HOME/skills`，重名 preflight。
- 旧 symlink 安装器降级为 `--dev`。

### M3 · 发布流水线与渠道

- 内部 registry 发布 + 离线 tarball + sha256 + NOTICE。
- release gate 接入 rc.2/rc.3 干净 home smoke。

### M4 · Desktop 与离线验收

- Desktop 2.0.18 三模式；macOS/Windows；离线演练。
- 失败路径（版本不匹配、缺 pnpm、tarball 损坏、技能冲突）回归。

### M5 · 文档与支持

- 用户安装/升级/卸载/回滚文档；兼容矩阵；诊断入口。
- 旧 `install-dataops-profile.mjs` 标记 dev-only；release 文档不再提 symlink。

兼容期：M1–M2 期间两套并存，但 release 安装器只走新路径；M3 之后旧路径仅内部开发使用。

## 14. 验收标准

- [ ] 干净 `DSH_HOME` 下，按“web 模板 → dsh plugin add”安装成功，`--dump-config` 出现 dataops-tools/brand/client/preset 行。
- [ ] 安装后 Desktop 重启可列出并启动 `dataops` profile；三种模式无 console error / 空白页。
- [ ] rc.2、rc.3 双运行时 smoke 通过；版本不匹配明确拒绝。
- [ ] profile 有 pnpm lock/.modules，无绝对 symlink；移动/删除安装目录不影响运行（除 dev link 模式）。
- [ ] 升级、回滚、卸载可执行；用户 patch 不丢；workitems 不删。
- [ ] 离线 tarball 校验和安装通过；不访问公网。
- [ ] LICENSE/THIRD_PARTY_NOTICES/checksum 齐全；安装确认可见。
- [ ] 用户文档、兼容矩阵、支持诊断入口齐全。

## 15. 待拍板

1. 内部 registry 地址与 `@dataops` scope 归属；是否允许公共 npm。
2. LICENSE 选择（内部专有 / MIT / 其他）与 NOTICE 范围。
3. 技能默认行为：默认安装到 `$DSH_HOME/skills`，还是要求显式 `--skills`。
4. 是否保留 `dataops-preset` 作为独立可安装 bundle，还是只作为 bundle 的 patch 源片段。
5. 是否在 v1 支持装进现有 `desktop` profile；如果支持，品牌/preset 是否拆成可选 bundle。
6. 安装器形态：独立 npm bin、仓库脚本，还是未来 Desktop 侧插件调用 `desktopPnpm.installPlugin`。
7. 签名/attestation 是否纳入首个 release gate。

## 16. 风险

- **上游 pre-stable**：client 模块图、slot、preset 结构可能变；靠矩阵 smoke 和 0.3.0 拒绝门禁，不承诺长期兼容。
- **Desktop 自动迁移**：旧 profile 迁移可能受网络/权限影响；安装器必须生成 pnpm 元数据，避免用户首次启动才失败。
- **Windows 路径/权限**：symlink 方案不可用；官方 pnpm 路径是主要收益之一。
- **技能重名**：通用名与用户技能冲突；preflight 和可选 root 是必要保护。
- **发布渠道未定**：registry 不可用会迫使离线包成为主渠道，安装器与文档要同时支持。
- **品牌/法律**：第三方图标、宿主标题、官方背书边界需要法务/品牌确认。

## 17. 参考

- [DSH 插件打包与安装](../../deepseek-harness/docs/user/develop/basic/publish.md)（只读上游参考）
- [DSH profile 与兼容检查](../../deepseek-harness/packages/boot/app-boot/README.md)（只读上游参考）
- [DSH Desktop 插件开发](../../dsh-desktop/docs/plugin-development.md)（只读参考）
- [内网离线安装](../ops/offline-install.md)
- [换品牌设计](rebranding.md)
- [ADR 0013](../decisions/0013-release-install-unit.md)
- [全量蓝图](../../prototype/release-install-blueprint.html) · [增量蓝图](../../prototype/release-install-blueprint-delta.html)
