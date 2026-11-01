# 内部数据代码仓 · 设计交接包

这是给设计 Agent 的输入包，不是生产仓库。

## 先读什么

0. `SUMMARY.md`：一页总结
1. `00-design-brief.md`：设计目标、边界、当前问题和期望产出
2. `01-repo-structure.md`：内部代码仓目录与 package 结构
3. `02-formats.md`：LTS、SQL、ETL、数据服务文件格式
4. `03-ui-context.md`：当前界面、截图和交互约束
5. `04-open-questions.md`：还需要设计判断的问题

## 可以直接看

- `repo/`：脱敏样例代码仓，可直接在编辑器或 DSH Files 中打开
- `screenshots/`：当前卡、三视图、真实 YAML 和原型截图
- `prototype/schedule-lineage-redesign.html`：可交互 HTML 原型
- `repo-tree.txt`：完整文件树

## 安全边界

- 所有 URL、工号、schema、数据源、任务 ID、owner 都是占位符或 mock
- 不包含凭据、生产数据、真实平台地址
- 样例用于讨论信息架构和视觉，不代表最终平台字段全集

## 版本

- 生成日期：2026-11-01
- 样例文件数：36
- LTS 任务：4
- packages：5
