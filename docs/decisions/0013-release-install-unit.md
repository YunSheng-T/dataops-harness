# 0013 · 发布与安装单元：独立 profile + 自包含 bundle

- 日期：2026-10-31
- 状态：已确认，待实施（registry 细节与签名后置）
- 关联：[发布与安装设计](../design/release-install.md) · [全量蓝图](../../prototype/release-install-blueprint.html) · [增量蓝图](../../prototype/release-install-blueprint-delta.html)

## 背景

当前 DataOps 的安装方式是开发机脚本：四个 local package 以绝对 symlink 写入 `$DSH_HOME/profiles/dataops`，技能 symlink 到 `~/.agents/skills`，profile patch 由脚本覆盖。它没有走 DSH 支持的 `dsh plugin` + bundle 路径，导致：

- 新 profile 默认缺 `@deepseek-ai/dsh-web-app`，DSH Desktop 无法启动；
- 只安装 preset bundle 时，tools/brand/client 的挂载行不在 bundle 内；
- profile 缺 pnpm lock/.modules，Desktop 首次启动会触发 legacy 迁移；
- 没有版本、升级、回滚、卸载和 receipt；
- 安装路径绑定仓库绝对路径，移动/删除即断链。

## 决策

1. **发布单元**是一个自包含 bundle：新增 `@dataops/dsh-dataops-bundle`，组合 tools/brand/client/preset 行、默认值、品牌禁用和默认 preset；依赖四个包精确版本；声明 `engines.dsh`。
2. **安装单元**是独立 `dataops` profile，从 shipped `web` 模板初始化，再用官方 `dsh plugin --profile dataops add <bundle>` 安装；pnpm 管理 profile，不手写、不用绝对 symlink。
3. **默认不装进用户现有 `desktop` profile**；品牌、默认 preset 和工具集变化会侵入用户环境。现有 profile 安装作为未来可选能力，需拆分品牌/preset。
4. **DSH Desktop 不改**：共用 `$DSH_HOME`，Desktop 自动为 web profile 注入 desktop shell；安装后重启并切换 profile。
5. **版本门禁**：首版 0.1.0；`engines.dsh = >=0.2.1-rc.2 <0.3.0`；rc.2/rc.3 + Desktop 三模式做发布矩阵；不靠 `compatibility.json` 豁免。
6. **配置归属**：bundle 提供 mock 默认；用户/部署配置写入 profile 的 `cordis.patch.yml`；安装器不覆盖用户 patch。
7. **技能作用域**：安装到 `$DSH_HOME/skills`（或显式 workspace），不再默认写 `~/.agents/skills`；重名 preflight；不默认安装 upstream 的 `dsh-*` 开发技能。
8. **生命周期**：`$DSH_HOME/dataops/install.json` receipt；升级/回滚用 `dsh plugin add` 精确版本；卸载保留 workspace workitems。
9. **发布渠道**：v1 内部 registry 为主，离线 tarball + sha256 为辅；公共 market/品牌桌面 App 非目标。registry 地址/scope/ACL 待补，但不阻塞 M0–M2：本机/离线验收只走 tarball，registry 安装与 ACL 在 M3 内网环境补测。
10. **安装器形态**：独立 bin `@dataops/dataops-install`（`dataops-install` / `doctor` / `uninstall`），离线包内置同一脚本。
11. **许可证**：公司内部专有许可；`LICENSE` / `THIRD_PARTY_NOTICES` 随包发布，法务文本待补。
12. **代码保密与签名**：代码保密不作为发布门槛；v1 保留 sha256 + registry ACL + 安装确认，签名/attestation 后置。
13. **旧路径退役**：新路径 M4 验收通过后立即退役 symlink 安装；提前发一次性迁移通知，不保留长期双路径。
14. **preset 角色**：`dataops-preset` 保留为 patch 源片段/版本对齐依赖，不单独作为用户安装目标。

## 后果

正面：

- 用户只面对一个 bundle、一条官方命令；profile 可复现、可升级、可回滚。
- Desktop 不再在首次启动时替用户修依赖；安装阶段就暴露问题。
- 版本、依赖、技能和品牌边界可测试、可审计。
- 不 fork 上游，不改 Desktop，不改变 Stage/工具/workitem 契约。

代价：

- 需要新增 bundle 包、patch 生成器、安装器、receipt 与发布流水线。
- 需要一次包清单/版本/许可/registry 治理。
- 旧 symlink 安装方式在 M4 验收后立即退役；退役前需要一次性迁移通知和迁移命令。
- 独立 profile 不继承用户 `desktop` profile 的 market/bridge，需要在用户文档中说明。

## 备选方案

| 方案 | 结论 | 原因 |
|---|---|---|
| 继续用 symlink + 手写 profile | 否 | 断链、Windows 权限、Desktop 迁移、无生命周期 |
| 只把 preset 做成 bundle，依赖手工装另外三个包 | 否 | 不是单一安装单元；用户容易漏装 |
| 把 DataOps 直接装进用户 `desktop` profile | v1 否 | 品牌/默认 preset/工具集侵入；冲突和回滚成本高 |
| 发布品牌桌面 App | 否（v1） | 签名、更新、法务和桌面仓维护是另一条产品线 |
| 公共插件市场首发 | 否（v1） | 公开索引/安全审核/品牌合规未就绪；先内部 registry |

## 不变量

- 不修改 `deepseek-harness/` 与 `dsh-desktop/`。
- 不改变 `@deepseek-ai/*` 包名、`dsh` 命令、`DSH_*` 环境变量、session 格式和 wire 字段。
- 不打包 runtime、凭据、workitems 或用户 workspace 数据。
- 品牌只换名字/Logo；不改主题 token。
- 没有 receipt/回执的“安装成功”不算完成；没有兼容矩阵的发布不算可发放。
