# 0008 · DataOps skills 安装到用户级 skill root

- 日期：2026-10-27
- 状态：已实施
- 关联：[技能规范](../../AGENTS.md#技能规范) · [profile 安装](../../scripts/install-dataops-profile.mjs)

## 背景

2026-10-27 在 `/Users/zhangshu/code/data-workspace` 新 workspace 验证时，session 的 skill catalog 只剩 `archify`、`frontend-design` 等通用技能，没有 `dataops-workflow`、`dataops-requirement`、`workitem-protocol`。原因是 DataOps skills 只存在于仓库的 `.agents/skills`，而新 workspace 没有这份目录。

Host 工具仍在（profile 提供），所以表面看“能做”，但 Agent 缺少阶段模板、presenter 约定和工作项协议，最终出现卡片/流程行为不一致。

## 决策

- 保留仓库 `.agents/skills` 作为唯一源。
- 新增 `scripts/install-dataops-skills.mjs`，把全部含 `SKILL.md` 的 DataOps skills symlink 到：
  - `$DSH_AGENTS_HOME/skills`（若设置）
  - 否则 `~/.agents/skills`
- `scripts/install-dataops-profile.mjs` 安装/`--check` 时自动调用它。
- 不把技能复制到每个 workspace；新 workspace 不再要求 `.agents/skills`。

## 原因

`@deepseek-ai/dsh-skill-filesystem` 默认 root 包含 `<agentsHome>/skills`，rank 500。用户级 root 对所有 workspace 生效，且仓库仍是单一源；symlink 避免双份内容漂移。

## 验证

```sh
node scripts/install-dataops-skills.mjs --check
ls -l ~/.agents/skills | head
```

新 workspace 新建 session 的 skill catalog 应包含 `dataops-workflow`、`dataops-requirement`、`dataops-design`、`dataops-analysis`、`dataops-solution`、`dataops-tech-plan`、`workitem-protocol` 等。

## 边界

- 这是用户级安装，不是 workspace 级；换机器需要重跑安装。
- 自定义 `DSH_AGENTS_HOME` 时脚本会安装到该目录，`skill-filesystem` 默认读取同一变量。
- 项目内 `.agents/skills` 仍可覆盖同名的用户级 skill（rank 200 < 500）。
