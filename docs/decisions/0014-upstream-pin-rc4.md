# 0014 上游 pin 升级到 0.2.1-rc.4

日期：2026-11-01
状态：已接受

## 背景

dataops-dev IDE 交接包（`docs/dataops-dev/handoff/`）的设计基线是上游 `ce7073d5`（2026-10-30 master HEAD）。本仓原 pin 为 rc.3（`1f81c047`，2026-10-23）。用户桌面端已升级：DSH NEXT 2.0.21-next 自带内核 0.2.1-rc.4（`504a01a9`，2026-10-26），旧版 DSH Desktop 2.0.18 仍为 rc.2。用户拍板：按 rc.4 对齐，与真实运行版本一致。

版本关系：rc.3(`1f81c047`) < rc.4(`504a01a9`) < master(`ce7073d5`)，rc.4 是 `ce7073d5` 的祖先。与交接包基线的 4 天差异（rc.4 → ce7073d5）将在 dataops-dev 的《上游证据记录.md》中逐项核对记录。

## 变更

- `deepseek-harness/` submodule：`1f81c047fc` → `504a01a957`（tag `dsh-v0.2.1-rc.4`）。
- `upstream.json`：`runtimeVersion` → `0.2.1-rc.4`，`sourceCommit` → `504a01a9578abc2c6f1fb896b1dc322c9fe24f66`，`verifiedAt` → 2026-11-01，notes 更新桌面端版本事实。
- `README.md`、`docs/p0-setup.md`：安装/验证命令中的版本号 rc.2/rc.3 → rc.4。
- `AGENTS.md`：桌面端运行时事实更新（NEXT=rc.4，旧 Desktop=rc.2，engines 范围不变）。

无 `@deepseek-ai/dsh-*` 运行时依赖声明（各包仅依赖 `@deepseek-ai/cordis ^4.0.5`，rc.4 桌面端内置同为 4.0.5），无 lockfile，依赖与锁文件步骤无动作。`engines.dsh` 维持 `>=0.2.1-rc.2 <0.3.0`，rc.2/rc.3/rc.4 均可安装。

## 验证

- `npx @deepseek-ai/dsh@0.2.1-rc.4 --version` → `0.2.1-rc.4`。
- `--profile dataops --dump-config`（rc.4）：组合输出正常，`dataops-tools / dataops-brand / dataops-client` patch 均加载。
- `node scripts/check-dataops-preset.mjs` → ok；`node scripts/check-dataops-workitem.mjs` → ok；`node scripts/check-dataops-bundle.mjs` → ok。
- `node scripts/e2e/dataops-stage0-5-contract.mjs` → PASS（10 checks）。

## 已知缺口

- `scripts/verify-layout.mjs` 尚未实现（AGENTS.md 标注「待补」），本次未执行；已列入 backlog。
- 「一条真实 SQL 的 e2e」未执行：dataops profile 当前为 mock provider，无真实数据平台凭据；待真实 provider 接入后补跑。
- `./scripts/dsh` 包装器只能定位旧版 DSH Desktop（rc.2）的 `node_modules` 布局；DSH NEXT 将 dsh 打包进 `app.asar`，无法直接作为 `DSH_APP_PATH` 使用。本次验证用 `npx @deepseek-ai/dsh@0.2.1-rc.4` 代替。后续若需以 NEXT 为验证壳，需扩展 `scripts/dsh` 支持 asar 内入口。

## 破坏面

未发现。插件 `engines` 范围覆盖 rc.4；既有 check 脚本与合同 e2e 全部通过。
