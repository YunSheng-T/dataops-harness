# 内网离线安装

> 目标：不依赖公网 npm，把 DataOps profile 装到已有 DSH runtime 的内网机器。  
> 前提：目标机已经安装兼容的 `dsh` runtime（0.2.1-rc.2 / rc.3）。

## 1. 构建离线包

在可构建的机器上：

```sh
node scripts/pack-dataops-offline.mjs
```

产出：

```text
dist/dataops-harness-offline-<date>.tar.gz
dist/dataops-harness-offline-<date>.tar.gz.sha256
```

包含：

- dataops-client / brand / tools / preset
- profiles/dataops
- `.agents/skills`
- install scripts
- preset/workitem/stage contract 检查
- workitem 模板

不包含：

- `node_modules`
- `deepseek-harness` 运行时代码 / `dsh-desktop`
- 但会携带 `deepseek-harness/.agents/skills`（只读 upstream skills）
- workitems 运行实例
- token/凭据
- 测试截图/临时目录

## 2. 传到内网并校验

```sh
shasum -a 256 -c dataops-harness-offline-<date>.tar.gz.sha256
tar -xzf dataops-harness-offline-<date>.tar.gz
cd dataops-harness-offline-<date>
```

## 3. 安装

```sh
node scripts/install-dataops-profile.mjs --home /path/to/DSH_HOME
node scripts/install-dataops-skills.mjs
node scripts/install-harness-skills.mjs   # 有 pinned upstream 时安装；离线包无 upstream 时自动 SKIP
node scripts/check-dataops-preset.mjs
node scripts/check-dataops-workitem.mjs
node scripts/check-stage-contract.mjs
node scripts/check-dataops-health.mjs
node scripts/check-provider-config.mjs --config docs/ops/provider-config.example.json
node scripts/check-install.mjs --home /path/to/DSH_HOME
```

安装脚本只做本地链接/复制，不访问 npm。

## 3.1 离线面检查

```sh
node scripts/check-offline-surface.mjs
```

检查：

- 没有公网 npm 依赖
- 没有源码里的外部 runtime URL
- 只有 DSH peer / DataOps 本地包

## 3.2 健康检查

```sh
node scripts/check-dataops-health.mjs
# 真实配置：
node scripts/check-dataops-health.mjs --config /path/to/config.json
```

未配置 health endpoint 的域会显示 `configured; no health endpoint`，不会误报为已联通。

## 3.3 安装完整性

```sh
node scripts/check-install.mjs --home /path/to/DSH_HOME
```

检查 profile 链接、客户端 bundle、生成契约、用户级 skills 和 legacy release 禁用。

> 离线演练时如不想改真实 `~/.agents/skills`，先设置独立的 `DSH_AGENTS_HOME`。

## 4. 启动

```sh
DSH_HOME=/path/to/DSH_HOME dsh --profile dataops
```

## 5. 边界

- 离线包不包含 DSH runtime。
- 不包含真实凭据；内网再配置 `~/.dsh/.env` 或 credentials。
- 无公网 CDN 依赖。
- CICD CLI 需要单独在内网安装并在 profile 配置 `cicd.commands`。
