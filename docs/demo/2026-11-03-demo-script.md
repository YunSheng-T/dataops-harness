# DataOps 演示脚本（2026-11-03）

> 目标：10–15 分钟，按当前实现完整走一遍 DataOps 工作台。
> 真实数据边界：仓库解析和 task DAG 是真实的；table lineage / data flow / runtime / deploy / code scan 仍是 mock provider。

## 0. 演示前准备（提前 10 分钟）

### 构建 + 回归

```bash
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
node scripts/verify-local.mjs
```

最后一次应看到：

```text
local verification: PASS (16 checks)
```

### 重启 Host

必须重启，不能只刷新页面：

```bash
# 停旧进程
dsh --profile dataops --port 3088 --no-open
```

打开最新 URL（token 以启动日志为准），关闭 DevTools，浏览器缩放 100%。

### 准备 Workitem

终端执行：

```bash
node scripts/seed-dataops-demo.mjs --stage develop
```

这会准备：

```text
workitem: 2026-10-27-us-3821-demo
stage: develop
requirement/design/scheme/develop 都有交付物
```

演示到 CICD 时再执行：

```bash
node scripts/seed-dataops-demo.mjs --stage cicd
```

在会话里输入：

```text
读取工作项 2026-10-27-us-3821-demo，展示当前阶段、交付物和当前迭代。
```

---

## 1. 开场（1 分钟）

展示：

```text
DataOps 工作台
左侧工作区 internal-code-repo
右侧 DataOps 面板
```

讲：

> 今天看的是一条数据交付链，不是工具目录。  
> 会话负责迭代，Workitem 负责沉淀，DataOps 负责仓库、血缘、交付物和证据。  
> 平台侧数据是 mock，但流程、门禁、revision 和边界是真的。

---

## 2. 仓库体检（1 分钟）

点击：

```text
DataOps → 概览
```

预期：

```text
internal-code-repo · 已识别
5 packages
4 tasks
13 jobs
0 findings
Packages:
lts_channel_daily
sql_channel_models
etl_channel_sync
```

讲：

> 右栏先回答“这是不是一个 DataOps 代码仓”。  
> package、task、job 都从仓库解析出来，不是写死的页面。

---

## 3. 血缘浏览器（3 分钟）

点击：

```text
DataOps → 血缘
```

预期总览：

```text
表 4
数据链路 2
调度 DAG 4
```

### 3a 数据链路

点：

```text
channel_daily
```

展示摘要：

```text
lts_channel_daily · 3 tasks / 4 tables
```

点：

```text
半屏打开
```

预期：

- 表、ETL、调度节点正常排列
- 边从右到左
- 节点可以拖动
- 右侧节点详情可用

讲：

> 这张图回答“数据从哪些表、经过哪些 ETL 和调度形成结果”。  
> 当前 table/dataflow 还是 mock provider，等内网血缘接口替换。

### 3b 调度 DAG

关闭弹窗，点：

```text
channel_daily_mixed
```

再点：

```text
半屏打开
```

预期：

```text
channel_daily_mixed · 调度 DAG
START → load_check / G_1006
G_1006 → calc_sql / export_shell
load_check → wait_upstream / notify
G_1006 → notify
```

讲：

> 这张图来自当前 workspace 的真实 `task.yaml`，不是 mock。  
> 这里看的是 Task 内 Job 依赖，不是表血缘，也不是数据链路。

---

## 4. 交付物与 revision（3 分钟）

回到有 Workitem 的会话，输入或继续：

```text
读取工作项 2026-10-27-us-3821-demo，展示交付物和当前迭代。
```

点击：

```text
DataOps → 交付物
```

预期：

```text
需求
设计
数据挖掘
需求方案
技术方案
开发
```

点当前产物：

```text
当前迭代
```

预期浮层：

- 当前阶段展开
- 其他阶段折叠
- revision 切换 v1 / v2
- diff 内容字段
- 旧 revision 标记 superseded
- gate 绑定 revision

讲：

> 用户不直接改交付物；Agent 每次修改生成新 revision。  
> 旧审批会失效，因为 gate 绑定的是 revisionId + contentHash。  
> 悬浮窗只展示当前迭代，DataOps 交付物保留全量历史。

---

## 5. Evidence Links（2 分钟）

在交付物浮层里展开设计阶段，查看：

```text
证据 3
[scan-... pass] [deploy-... pass] [runtime ... warn]
```

点一个 evidence chip：

```text
kind / ref / asOf / source / summary
[在证据里打开]
```

讲：

> revision 只引用证据，不复制日志正文。  
> code scan 按 scanId、deploy 按 deploymentId、runtime 按平台坐标 + runId。

---

## 6. 运行日志 / 部署日志（2 分钟）

点击：

```text
DataOps → 证据 → 部署日志
```

查询：

```text
deploy-20261102-001
```

预期：

```text
success
channel_daily_pkg@1.4.0
build → upload → activate → health
```

再点：

```text
DataOps → 证据 → 运行日志
```

选：

```text
LTS: channel_daily_mixed
```

展示最近运行，点一次 run：

```text
UPSTREAM_WAIT
DB_TIMEOUT
下游未执行
```

讲：

> 调度失败方向是“上游 → 当前 → 下游未执行”，不是下游影响调度。  
> 当前日志仍是 mock，真实平台接入后替换 adapter。

---

## 7. 摘要卡（1 分钟）

在会话里输入：

```text
读取 dwd.orders 的表结构、支付订单证据和画像，用摘要回答，不要铺完整字段和 SQL。
```

预期：

- TableCard：表名 / owner / rows / fields / gaps
- EvidenceCard：claim / 范围 / cost / asOf
- ProfileCard：rows / columns / 候选键 / findings 数量
- 都在 CTA 打开 DataOps 对应 section

讲：

> 对话只留判断，完整字段、SQL、画像回到 DataOps。

---

## 8. CICD 收尾（2 分钟）

终端执行：

```bash
node scripts/seed-dataops-demo.mjs --stage cicd
```

会话输入：

```text
读取工作项 2026-10-27-us-3821-demo，展示 CICD 阶段和制品。
```

预期：

```text
数据 CICD 卡
pipeline run
package / manifest / checksum
外部环境只读
```

讲：

> DataOps 不执行真实发布，不接 DSH 原生 approval。  
> 外部部署审批由公司发布平台负责，DataOps 只记录只读状态。

---

## 9. 收尾（1 分钟）

总结：

```text
会话迭代
Workitem 沉淀
ArtifactRevision 不可变
EvidenceRefs 可追溯
DataOps 仓库/血缘/证据/日志
```

明确边界：

```text
table/dataflow 血缘       mock，等内网 HTTP
runtime/deploy logs       mock，等真实 CLI
code scan                 mock，等真实 CLI
发布/部署                 外部平台，DataOps 不执行
```

---

## 10. 现场兜底

| 现象 | 处理 |
|---|---|
| 交付物空 | 当前 Session 没有 Workitem；先读 `2026-10-27-us-3821-demo` |
| 血缘 404 / SESSION_NOT_FOUND | 重启 3088，硬刷新 |
| 图节点样式乱 / 边乱 | 确认已重启最新 Client，非旧 bundle |
| 页面没有 DataOps tab | 当前 Session 不是 dataops profile，重开会话 |
| 卡片不出现 | 先看轨迹里是否调用 stage prepare |
| CICD 没更新 | 重新跑 `--stage cicd` 后读工作项 |

## 11. 一句话备份

> 今天的核心不是 mock 数据本身，而是：同一份 Workitem 里，阶段、revision、审批、证据和仓库血缘是串起来的；真实平台只是替换 provider。
