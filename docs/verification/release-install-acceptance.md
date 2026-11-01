# 发布/安装 headless 验收

> 状态：M1–M4 headless 通过（rc.2 + rc.3）；Windows 与真机视觉待补
> 日期：2026-10-31
> 关联：[发布与安装设计](../design/release-install.md) · [ADR 0013](../decisions/0013-release-install-unit.md) · [全量蓝图](../../prototype/release-install-blueprint.html)

## 验证环境

- macOS arm64，DSH Desktop 2.0.18（内置 dsh 0.2.1-rc.2）
- rc.3：从公共 npm 临时安装 dsh 0.2.1-rc.3 到临时前缀，install / doctor / boot 通过；不是内网 registry
- 临时 DSH_HOME；不写真实桌面 profile
- 本地 tarball / registry-free release；不访问内部 URL

## 已通过

### 1. 静态与本地门禁

    node scripts/verify-local.mjs
    # PASS (16 checks)

    node scripts/check-dataops-bundle.mjs
    node packages/dataops-install/scripts/check.mjs
    # PASS

### 2. 本地发布

    node scripts/release-dataops.mjs

产物：

    dist/dataops-0.1.0/
      dataops-dsh-dataops-bundle-0.1.0.tgz
      dataops-dsh-dataops-client-0.1.0.tgz
      dataops-dsh-dataops-brand-0.1.0.tgz
      dataops-dsh-dataops-tools-0.1.0.tgz
      dataops-dsh-dataops-preset-0.1.0.tgz   # optional source
      dataops-dataops-install-0.1.0.tgz
      manifest.json
      sha256sum
      LICENSE
      THIRD_PARTY_NOTICES.md
      LOCAL-RELEASE.md

验证：

    cd dist/dataops-0.1.0
    shasum -a 256 -c sha256sum
    # all OK

每个 tarball 已确认包含 package/LICENSE 与 package/THIRD_PARTY_NOTICES.md。

### 3. 离线安装 / 诊断 / 卸载

    node packages/dataops-install/bin/dataops-install.mjs install \
      --home <temp-home> --dsh ./scripts/dsh \
      --offline dist/dataops-0.1.0 --no-skills --yes
    node packages/dataops-install/bin/dataops-install.mjs doctor --home <temp-home> --dsh ./scripts/dsh
    node packages/dataops-install/bin/dataops-install.mjs uninstall --home <temp-home> --dsh ./scripts/dsh --yes

结果：安装成功；doctor PASS；卸载保留 workspace workitems。

### 4. 失败路径

- 篡改 client tarball：安装器报 checksum mismatch，未创建 profile。
- dsh 0.3.0：preflight 拒绝。
- 旧 profile 无 bundle：无 --migrate/--reset 时拒绝；--migrate 备份后成功。
- 技能重名：发现冲突后停止，未创建 profile。
- --dry-run：不写文件。

### 5. Desktop 三模式 headless composition

    DSH_TELEMETRY_DISABLED=1 node scripts/check-desktop-modes.mjs \
      --home <temp-home> --profile dataops

结果：

- compatibility：desktop-shell 存在，shellMode=compatibility
- extended：desktop-shell 存在，shellMode=extended
- advanced：desktop-shell 存在，shellMode=advanced
- 三种模式 skippedBundles 都为空
- layers：base + web-app + dataops-bundle

## 待补

### Windows x64

本机没有 Windows，以下未验证：

- dsh / pnpm 的 .cmd 解析与 spawn 行为
- 路径分隔符、权限、ASCII/中文路径
- Desktop 终端 shim 是否可直接被安装器调用
- 安装/升级/卸载的完整回归

结论：Windows 暂不承诺；M4 前需要一台 Windows 机器或 CI runner。

### Desktop 真机视觉

headless composition 只证明 shell row 与 layer 组合正确，不证明：

- 侧栏品牌、Hero、空会话、设置页布局
- compatibility / extended / advanced 三种真实窗口的溢出与点击
- 升级/卸载后重启的 profile 切换

需要人工在 Desktop 上按三种模式各截一张图并记录。

## 旧路径状态

旧 symlink 安装（scripts/install-dataops-profile.mjs）仍保留但标记 deprecated；等 Windows + 真机视觉验收通过后按计划立即退役。当前不要把它写进用户安装文档。

## 未运行的 gate

- 内部 registry publish / scope / ACL
- 签名 / attestation（后置）
- 真实 provider 内网 URL
