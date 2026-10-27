# 0010 · 仓库边界：外部代码与本地运行产物

- 日期：2026-10-27
- 状态：已实施
- 关联：[upstream.json](../../upstream.json) · [dsh-desktop 的 submodule 做法](../../dsh-desktop/.gitmodules)

## 背景

`dataops-harness` 原先只是本地目录，没有 `.git`。同目录下同时放着两个独立代码仓：

- `deepseek-harness/`：官方上游，自己的 `.git`
- `dsh-desktop/`：社区桌面产品，自己的 `.git`

另外还有构建产物、截图、运行时 workitems 和浏览器临时目录。

## 决策

`dataops-harness` 初始化为独立 Git 仓库。外部仓不进入本仓库历史：

- `deepseek-harness/`：`.gitignore` 忽略；以 `upstream.json` 的 `repository/sourceCommit` 作为版本事实源。
- `dsh-desktop/`：`.gitignore` 忽略；它不是 DataOps 的依赖。
- 运行产物忽略：`.tmp-*`、`incidents/`、`workitems/` 下的本地实例。
- `workitems/_template` 与 `workitems/README.md` 保留在仓库中，作为可复制模板。
- 生成客户端 `lib/client.js`、`lib/index.js` 忽略；构建脚本生成。

## 为什么不用 submodule（当前阶段）

dsh-desktop 采用 submodule 固定 `deepseek-harness`，这是可复现上游的做法。但本工作区已有：

1. 本地 `deepseek-harness` 当前 checkout 为 `22ddee37...`，而 `upstream.json` pin 是 `1f81c047...`；
2. 外部仓有本地历史，直接改成 submodule 需要迁移并可能影响现有开发。

因此当前先采用 **ignore + upstream.json pin**，避免把错误 checkout 提交进主仓。后续如果要发布垂直发行版，再按 dsh-desktop 模式把 `deepseek-harness` 迁移为固定 submodule，并单独做升级提交。

## 不变量

- 不编辑 `deepseek-harness/`、`dsh-desktop/`。
- 上游版本只在 `upstream.json` 维护，不靠外层 git 记录。
- 运行时 workitems 可随时清理/重建，不进入发布仓库。
- 客户端必须从 `packages/dataops-client/scripts/build.mjs` 构建，不能提交旧 bundle。

## 遗留

- `upstream.json` 的 `1f81c047...` 与本地 `deepseek-harness` 的 `22ddee37...` 不一致；在真正切 submodule 前先核对并固定。
