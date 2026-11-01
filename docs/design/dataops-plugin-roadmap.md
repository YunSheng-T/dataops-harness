# DataOps 插件路线图

> 状态：维护中。P0 已选定，尚未实现。
> 工作项：`workitems/2026-11-01-dataops-plugin-roadmap/`
> 聚合入口：[DataOps 插件聚合设计](dataops-plugin-surface.md)
> 维护规则：新方向先进入本表，P0/P1 才能写详细设计；状态变化同时更新 `plan.md` 和本表底部的变更记录。

## 1. 判断标准

DataOps 插件优先解决 Agent 的**真实工作缺口**，而不是重做 IDE：

- 只读优先，权限在工具层
- 能复用现有 repo index / LTS parser / workitem / evidence
- 结果能变成 Agent 可继续处理的 findings
- 有清晰用户入口，不做孤立后台功能
- 不复制 DSH Files、编辑器、血缘卡等已有能力

## 2. 清单

状态：`idea` → `design` → `approved` → `approved-design` → `building` → `shipped` → `paused`

| ID | 名称 | 优先级 | 状态 | 用户入口 | Host / Client | 依赖 | 下一步 |
|---|---|---|---|---|---|---|---|
| DO-PLUGIN-001 | **Repo Doctor** | P0 | building | DataOps 面板「概览 / 检查」、`/dataops` 命令 | Host + Client | repo index、LTS parser | 补全 blueprint 后实施 |
| DO-PLUGIN-002 | **Env / Placeholder Guard** | P1 | idea | DataOps 检查 section | Host + Client | Repo Doctor findings | 合并进 Repo Doctor P0 |
| DO-PLUGIN-003 | **LTS Guard** | P1 | idea | DataOps 检查 section | Host | LTS parser | 定义 parent/path 规则 |
| DO-PLUGIN-004 | **Impact Watch** | P2 | idea | DataOps 检查 / 血缘 section | Host + Client | workspaceChanges / fs | 评估事件来源 |
| DO-PLUGIN-005 | **Migration Review** | P2 | idea | DataOps 检查 section | Host + Client | SQL/model parser | 定义 DDL/DML/Rollback 规则 |
| DO-PLUGIN-006 | **Run Timeline** | P2 | idea | DataOps 证据 / 检查 section | Host + Client | dataops_shared_read_logs | 先做 mock 日志 |
| DO-PLUGIN-007 | **Data Contract Diff** | P3 | idea | API 预览差异卡 | Host + Client | API YAML / ofl | 定义兼容性规则 |
| DO-PLUGIN-008 | **Repo Change Digest** | P3 | idea | DataOps 概览 section | Host + Client | workspaceChanges | 聚合粒度 |
| DO-PLUGIN-009 | **Repo Context Pack** | P3 | idea | system prompt / DataOps 面板 | Host | repo index | 控制上下文预算 |
| DO-PLUGIN-010 | **Task Health Advisor** | P3 | idea | 任务卡 / schedule preview | Host + Client | LTS + lineage | 定义 SLA/cron 规则 |
| DO-PLUGIN-011 | **Evidence Completeness** | P3 | idea | evidence card / review card | Host + Client | evidence schema | 定义缺失判定 |
| DO-PLUGIN-012 | **Repo Doctor Settings** | P3 | idea | DataOps 设置 / settings.section | Host + Client | repo config | 等 P0 用户入口确认 |

## 2.1 表面聚合原则

- 插件不拥有自己的右栏 tab
- 插件不拥有自己的对话大卡
- 插件向 DataOps 面板注册 section
- 一个 `/dataops` 命令命名空间
- 一个 composer 聚合状态入口
- 详情见 [DataOps 插件聚合设计](dataops-plugin-surface.md)

## 3. 为什么 P0 是 Repo Doctor

1. Agent 现在改代码仓前只能逐个读文件，缺少整体自检。
2. 现有 `dataops-tools/src/repo/` 已有 manifest/build 索引和 LTS parser，复用成本低。
3. 结果天然是结构化 findings，Agent 可以直接继续修。
4. 不需要真实平台写权限。
5. 不和正在开发的 IDE 竞争，反而可以被 IDE 和 Agent 共同调用。

## 4. 明确不做

- 不做通用文件树、编辑器、代码仓页面
- 不做真实 build/deploy
- 不自动修复
- 不接生产凭据
- 不做与 DSH Files / lineage card 重复的视觉表面

## 4.1 已有命令盘点

当前**没有已实现的 DSH slash 子命令**。

已有命令行工具：

```text
dataops-install
dataops-doctor
dataops-uninstall
```

它们是安装/诊断 CLI，不是聊天命令。

已有 Agent 工具是 `dataops_*` tool calls，也不是 slash command。

因此 `/dataops` 是新的统一命名空间，不迁移旧子命令。

## 5. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-01 | 建立清单，确定 Repo Doctor 为 P0，追加 12 个方向 |
