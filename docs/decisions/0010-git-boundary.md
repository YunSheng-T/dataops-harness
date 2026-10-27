# 0010 · 仓库边界：上游 submodule 与外部桌面仓

- 日期：2026-10-27
- 状态：已实施
- 关联：[upstream.json](../../upstream.json) · [dsh-desktop 的 submodule 做法](../../dsh-desktop/.gitmodules)

## 背景

`dataops-harness` 最初只是本地目录，没有 `.git`。同目录下还有两个独立代码仓：

- `deepseek-harness/`：官方上游
- `dsh-desktop/`：社区桌面产品

## 决策

`dataops-harness` 初始化为独立 Git 仓库，并把官方上游按 **submodule** 固定：

```gitmodules
[submodule "deepseek-harness"]
  path = deepseek-harness
  url  = https://github.com/deepseek-ai/deepseek-harness.git
```

当前 pin：

```text
1f81c047fc48fa190a683e469daa699857e9afe8
```

与 `upstream.json` 的 `sourceCommit` 一致，也与 `dsh-desktop` 的 `.gitmodules` 做法一致。

- `deepseek-harness/`：submodule，固定版本，只读参考；子模块内容不进入外层历史。
- `dsh-desktop/`：外部参考仓，`.gitignore` 忽略；不是 DataOps 的依赖。
- 运行时 workitems、`.tmp-*`、`incidents/`、生成客户端 bundle：忽略；模板和 README 保留。

## 迁移记录

本地原 `deepseek-harness` checkout 为 `22ddee37...`，已切换到官方 pin `1f81c047...`。原独立 git 目录已通过 `git submodule absorbgitdirs` 迁移到 `.git/modules/deepseek-harness`。

## 不变量

- 不编辑 `deepseek-harness/` 子模块。
- 上下游版本只在 `upstream.json` 和 submodule gitlink 维护；升级需独立提交。
- 克隆主仓后必须执行：

```sh
git submodule update --init --recursive
```

- 不把 `dsh-desktop/` 纳入本仓库。
