# P0：30 分钟跑通（零代码）

目标：不写任何插件，先用上游 CLI + 本仓的技能验证「agent 能不能干数据开发的活」。

## 前置

- Node.js ≥ 24.9（上游要求）
- 一个可用的模型 key（`DEEPSEEK_API_KEY`，或你们内部网关对应的变量）
- 能访问内部平台的只读账号（P0 阶段先不接，靠手工粘贴信息）

## 建议：隔离 DSH home

避免和个人 profile / 会话混在一起：

```sh
export DSH_HOME="$HOME/.dsh-dataops"
```

## 启动

```sh
cd /Users/zhangshu/code/dataops-harness

# 固定版本，避免"昨天还能跑"
npx @deepseek-ai/dsh@0.2.1-rc.3 --profile dataops --from-default-profile web
```

第一次会从 `web` 模板初始化 `$DSH_HOME/profiles/dataops/` 并启动 Web UI（默认 `http://127.0.0.1:3080`）。

如果你的环境已经装了 `dsh`，等价于：

```sh
dsh --profile dataops --from-default-profile web
```

## 验证技能被发现

在对话框里问：

> 你现在能看到哪些 skill？只列名字和一句话用途。

预期能看到本仓的 6 个：`sql-review`、`sql-optimize`、`model-review`、`pipeline-debug`、`lineage-impact`、`data-service-contract`。

如果没看到，按顺序排查：

1. 当前工作目录是不是 `/Users/zhangshu/code/dataops-harness`（技能按项目根发现，项目根 = 最近的 `.git` 祖先目录）；
2. `.agents/skills/<name>/SKILL.md` 是否存在、frontmatter 是否有 `name` 和 `description`；
3. 是否在 `$DSH_HOME` 里误放了旧 profile（换一个 `DSH_HOME` 试）。

## 三个验收任务

用真实（但脱敏）的输入跑，跑完记录：是否触发正确技能、输出是否符合格式、哪里需要人补。

| # | 任务 | 触发技能 | 通过标准 |
|---|---|---|---|
| 1 | 贴一条要上线的 DDL 或 ETL SQL，问「能不能上」 | `sql-review` | 给出阻断/风险/必改 + 验证 SQL，且没有编造下游 |
| 2 | 贴一个失败任务的日志与 run 信息，问「为什么失败、怎么处理」 | `pipeline-debug` | 给出分层定位与时间线，先止血后根因 |
| 3 | 问「把 `dwd.xxx` 的 `user_id` 改成 bigint 会影响谁」 | `lineage-impact` | 明确说明血缘缺失时降级为人工盘点，而不是瞎猜 |

## 检查组合（不启动）

```sh
npx @deepseek-ai/dsh@0.2.1-rc.3 --profile dataops --dump-config
```

看 `system-prompt`、`skill-filesystem`、`agent-instructions` 这几行是否按预期出现。以后加 bundle 时，这个命令是第一个验证手段。

## 下一步（P1）

P0 通过后再动代码：

1. 把 `sql.explain` / `sql.query`（只读）/ `lineage.impact` 做成工具插件；
2. 用 `tools/pre-execute` 做库表白名单与只读强制；
3. 大结果走 spill；
4. 用真实任务回归这 6 个技能，把「工具不可用时的降级路径」替换成真实调用。
