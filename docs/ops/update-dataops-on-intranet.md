# 内网升级 DataOps 工作台

> 现象：GitHub 已更新，但内网页面/工具仍是旧版。  
> 原因通常是：内网装的是旧 release、旧 profile 副本，或 Host 进程没重启。

## 1. 先确认内网版本

```bash
dsh --version
echo "$DSH_HOME"
git -C <dataops-checkout> log -1 --oneline
```

查看 profile 指向哪里：

```bash
cat "$DSH_HOME/profiles/dataops/package.json"
readlink "$DSH_HOME/profiles/dataops/node_modules/@dataops/dsh-dataops-client"
```

如果 `readlink` 指向：

```text
<dataops-checkout>/packages/dataops-client
```

说明是 **source-link 模式**；否则很可能是 **release 安装副本**。

## 1.1 先检查运行时版本

```bash
node scripts/check-runtime-version.mjs
```

如果输出：

```text
pin: 0.2.1-rc.4
installedDsh: 0.2.1-rc.2
```

说明仓库 pin 和实际运行版本不一致。`rc.2` 在兼容范围内，但不能把 rc.2 的结果当成 rc.4 的验证结果。

推荐内网统一使用：

```bash
npm install -g @deepseek-ai/dsh@0.2.1-rc.4
dsh --version
```

或者显式指定 `DSH_BIN` 指向内网匹配的 runtime。

## 2. 模式 A：source-link（开发机常用）


内网 checkout 更新后：

```bash
cd <dataops-checkout>
git fetch
git checkout d7ddaf1
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
node scripts/install-dataops-profile.mjs --home "$DSH_HOME"
node scripts/install-dataops-skills.mjs
node scripts/check-install.mjs --home "$DSH_HOME"
```

然后重启 DSH：

```bash
lsof -ti tcp:3088 | xargs kill 2>/dev/null || true
sleep 3
DSH_HOME="$DSH_HOME" dsh --profile dataops --port 3088
```

硬刷新浏览器。

## 3. 模式 B：release 安装（推荐内网稳定机）

**只更新 checkout 不够**。安装器使用的是旧 release 副本，必须重新打包并重装。

在可构建机器：

```bash
cd <dataops-checkout>
git fetch
git checkout d7ddaf1
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
node scripts/verify-local.mjs
node scripts/release-dataops.mjs
```

把新生成的 `dist/dataops-0.1.0/` 整个目录传到内网，然后：

```bash
cd <offline-install-dir>
shasum -a 256 -c sha256sum

node packages/dataops-install/bin/dataops-install.mjs install \
  --dsh <path-to-dsh> \
  --offline dist/dataops-0.1.0 \
  --reset \
  --yes

node packages/dataops-install/bin/dataops-install.mjs doctor \
  --dsh <path-to-dsh>
```

`--reset` 会备份旧 profile 再重装，但也会丢掉用户额外安装的插件。当前安装器发现用户依赖/bundle 时会拒绝 `--reset`。

旧 `install-dataops-profile.mjs` 现在会保留：

- 用户额外 dependencies
- 用户额外 bundles
- 用户额外 cordis.patch.yml 顶层插件行

## 4. 启动与刷新

```bash
DSH_HOME="$DSH_HOME" dsh --profile dataops
```

如果是 DSH Desktop：

```text
退出 DSH Desktop -> 重新打开 -> 选择 dataops profile
```

浏览器还要硬刷新：

```text
Cmd + Shift + R
```

## 5. 为什么只刷新没用

客户端 bundle 由 Host 从 profile 读取，且 Host 有启动缓存：

```text
源码更新 ≠ 已构建
已构建 ≠ 已安装到 profile
已安装 ≠ Host 已重启
Host 已重启 ≠ 浏览器已硬刷新
```

四步都完成才看到新版本。

## 6. 自检清单

```text
dsh --version 在支持范围
$DSH_HOME/profiles/dataops/package.json 指向正确
profile 的 client bundle 存在
check-install PASS
3088 只有一个进程
浏览器硬刷新
```

客户端文件对比：

```bash
sha256sum \
  <dataops-checkout>/packages/dataops-client/lib/client.js \
  "$DSH_HOME/profiles/dataops/node_modules/@dataops/dsh-dataops-client/lib/client.js"
```

如果是 release 副本，两者不同是正常的；但重装后应以新 release 为准。

## 7. 当前基线

```text
branch: work/experimental-2026-11-01
commit: d7ddaf1
```

内网 checkout 至少要到这个 commit，或使用包含它的新 release。
