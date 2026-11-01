# DataOps 发布/安装指南

> 状态：M1–M4 headless 通过；Windows/真机视觉待补
> 日期：2026-10-31
> 关联：[发布与安装设计](../design/release-install.md) · [headless 验收](../verification/release-install-acceptance.md)

## 前提

- DSH runtime 0.2.1-rc.2 或 rc.3（engines 范围 >=0.2.1-rc.2 <0.3.0）
- pnpm 在 PATH；DSH Desktop 请用它自带的终端
- 安装目标是一个独立 dataops profile，不修改 desktop profile

## 1. 构建本地发布目录

    node scripts/release-dataops.mjs

产物：

    dist/dataops-0.1.0/
      dataops-dsh-dataops-bundle-0.1.0.tgz
      dataops-dsh-dataops-client-0.1.0.tgz
      dataops-dsh-dataops-brand-0.1.0.tgz
      dataops-dsh-dataops-tools-0.1.0.tgz
      dataops-dsh-dataops-preset-0.1.0.tgz
      dataops-dataops-install-0.1.0.tgz
      manifest.json
      sha256sum
      LICENSE
      THIRD_PARTY_NOTICES.md
      LOCAL-RELEASE.md

内部 registry 发布/ACL 是内网 M3 gate，不在本机运行。

## 2. 安装

    node packages/dataops-install/bin/dataops-install.mjs install       --dsh <path-to-dsh>       --offline dist/dataops-0.1.0       --yes

安装器会：

- 检查 dsh 版本、pnpm、profile 状态、技能冲突
- 新 profile 先 seed shipped web 模板
- 写离线 pnpm-workspace overrides，校验 manifest/sha256
- 调官方 dsh plugin add
- 用 --dump-config 校验 tools/brand/client/preset 行
- 安装技能到 DSH_HOME/skills
- 写 DSH_HOME/dataops/install.json

技能选项：

    --no-skills
    --workspace <project-dir>
    --skills-source <dir>
    --force / --skip-skills-conflicts

## 3. 诊断

    node packages/dataops-install/bin/dataops-install.mjs doctor --dsh <path-to-dsh>

检查：版本、profile、bundle、dump-config 行、receipt、技能。

## 4. 升级 / 回滚

用新 release 目录再执行一次 install；receipt 会记录 previous。

    node packages/dataops-install/bin/dataops-install.mjs install       --dsh <path-to-dsh>       --offline dist/dataops-0.1.1       --yes

回滚：用旧 release 目录执行同一条安装命令。

## 5. 卸载

    node packages/dataops-install/bin/dataops-install.mjs uninstall       --dsh <path-to-dsh>       --yes

默认删除 profile、安装器写入的技能和 receipt；workspace 的 workitems 保留。先加 --dry-run 可预览。

## 6. DSH Desktop

1. 安装/升级完成后重启 DSH Desktop。
2. 在 profile 列表选择 dataops。
3. Desktop 自动注入 desktop shell；不需要改 Desktop 代码。
4. 三种呈现模式需要人工视觉验收：compatibility / extended / advanced。

headless composition 检查（用临时 DSH_HOME）：

    node scripts/check-desktop-modes.mjs --home <temp-home> --profile dataops

该检查验证 desktop-shell row 与 mode；不替代真实窗口截图。

## 7. 已知限制

- Windows x64 尚未验证。
- 内部 registry / ACL / 签名/attestation 后置。
- 宿主页面/窗口标题可能仍是 DeepSeek Harness 或 DSH Desktop。
- 旧 symlink 安装脚本 deprecated；M4 Windows/视觉验收后退役。
