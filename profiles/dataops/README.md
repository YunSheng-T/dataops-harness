# dataops profile

> 状态：dev profile / 旧 symlink 安装，**deprecated**。用户发布安装请用 `packages/dataops-install` + `scripts/release-dataops.mjs`；旧路径在 M4 验收后退役。

一个独立的 DSH profile（不碰 `desktop` profile），基于 shipped `web` 模板的两个 bundle：

- `@deepseek-ai/dsh-base`
- `@deepseek-ai/dsh-web-app`

`cordis.patch.yml` 挂 DataOps 工具（mock）、品牌、客户端插件，并把 `dataops-dev` 设为默认 Agent preset；没有替换业务 row。

`@dataops/dsh-dataops-preset` 是 dev profile 的 preset 源片段，声明 `数据开发模式` preset；发布时由 `@dataops/dsh-dataops-bundle` 的 patch 组合，不单独安装。它包含 DataOps Lead persona、`dataops-workflow` / `workitem-protocol` 技能入口，以及 fs / skill / ask-user / todo / compaction 等最小工具面。Host 的 DataOps 工具仍由 `dataops-tools` 提供。

## 安装到本机（旧 dev 路径）

```sh
node scripts/install-dataops-profile.mjs
```

> 这条命令只用于本机开发；它用绝对 symlink，不能作为发布安装。发布/用户安装见 [docs/ops/release-install.md](../../docs/ops/release-install.md)。

默认写入 `$DSH_HOME/profiles/dataops`（`DSH_HOME` 未设置时是 `~/.dsh`），并把 brand/client/tools/preset 四个包软链到该 profile 的 `node_modules/@dataops/` 下。

## 启动

```sh
# 原生 dsh（npm i -g @deepseek-ai/dsh@0.2.1-rc.2）
dsh --profile dataops

# 没有全局 dsh 时，用仓库内包装脚本
./scripts/dsh --profile dataops
```

启动前先检查组合：

```sh
dsh --profile dataops --dump-config
```

应能在输出里看到 `dataops-brand`、`dataops-client` 和 `preset-dataops-dev` 三行。

## Agent preset

安装后，新会话默认使用 **数据开发模式**。也可以点左上角的模式选择器切换回标准/PTC/极简模式。

- preset 声明：`packages/dataops-preset/cordis.patch.yml`
- 默认值：`profiles/dataops/cordis.patch.yml` 的 `agent-preset-registry.default`
- 静态检查：`node scripts/check-dataops-preset.mjs`
