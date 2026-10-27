---
name: pipeline-debug
description: 任务失败、延迟、数据不对或收到调度告警时使用；按层次定位根因，先止血再修复，产出时间线、根因、处置与防复发项。
---

# 管道排障

## 何时用

- 调度任务失败、超时、被 kill
- 数据延迟、分区没产出、下游报表为空
- 任务显示成功但数据明显不对
- 收到质量告警，需要判断是数据问题还是管道问题

不适用：SQL 本身慢但能跑完（用 `sql-optimize`）；模型设计问题（用 `model-review`）。

## 先取事实（排障的第一分钟决定后面一小时）

1. **run id / 任务名 / 计划时间 / 实际开始结束时间**
2. **上下游**：依赖哪些任务，被哪些任务依赖
3. **日志**：完整错误栈，不要只看最后一行
4. **最近变更**：代码、配置、表结构、资源队列、上游数据
5. **影响面**：哪些报表/API/业务方受影响

## 流程

先定位到**哪一层**，再往下钻，不要一上来就重启：

1. **调度层**：任务有没有被触发？依赖是否满足？是否被手动暂停/跳过？
2. **资源层**：队列是否排队、并发是否打满、是否被限流或 OOM kill。
3. **执行层**：SQL/代码是否报错？报错是语法、权限、数据（空值/类型）、还是超时。
4. **数据层**：任务成功但数据不对 → 对比上游输入行数、分区、主键唯一性。
5. **时间层**：数据对但延迟 → 看上游产出时间、调度等待、串行依赖。

定位后按顺序处理：

- **止血**：能重跑就先重跑；不能重跑就切备用链路/手工补数/通知下游。
- **根因**：拿到证据再下结论（日志行、慢查询计划、上游行数对比）。
- **修复**：改代码/改配置/加资源，明确验证方式。
- **防复发**：加监控、加质量规则、加超时与重试策略、补文档。

## 判定口径

- 没有证据不要重启：重启会掩盖根因，且可能重复写入。
- 先止血后根因：业务影响优先，但止血动作要记录。
- 区分「数据问题」与「代码问题」：同样的代码昨天成功、今天失败，优先查数据和上游。
- 重跑前确认幂等：非幂等任务重跑可能写出重复数据。

## 输出格式

```
现象：<谁在什么时候发现什么>
时间线：<计划 → 实际开始 → 失败/延迟 → 发现 → 止血>
根因：<证据 + 结论；不确定就写「待确认」>
处置：<已做 / 待做，含负责人>
影响面：<下游清单 + 数据范围>
防复发：<监控 / 规则 / 改造，含验收方式>
```

## 反例

- 看到失败就重跑，连跑三次都不看日志。
- 把「上游没产出」当成根因，却不查上游为什么没产出。
- 结论写「偶发」，没有时间线和证据。
- 修完不补监控，下次同样的坑再踩一遍。

## 工具（P2.3 起）

- `dataops_shared_read_logs`：取时间线、错误码、上下游、最近运行和证据摘要；只给信号，不下根因。
- `dataops_shared_read_lineage`：确认上下游影响面。
- `dataops_shared_read_table` / `dataops_shared_read_evidence`：补元数据和证据。
- `dataops_shared_update_workitem`：需要建工作项/记录排障时更新状态。
- `dataops_shared_present_deliverable`：展示 incident 卡。

不要调用 `dataops_incident_triage`（P2.3c 已下线）。重跑/补数仍是写操作，必须审批。

## 交付物

把排障结论落成 `deliverables/incident.yaml`，再交给 presenter：

```json
{
  "title": "dws.trade_channel_daily 05:00 批次失败",
  "severity": "P1",
  "status": "处理中",
  "target": "dws.trade_channel_daily",
  "startedAt": "2026-10-26T05:00:00+08:00",
  "symptom": "上游分区未就绪，等待超时后任务失败",
  "timeline": [
    { "time": "05:02", "event": "等待 dwd.orders 分区超时" },
    { "time": "05:07", "event": "任务失败退出" }
  ],
  "cause": "上游分区延迟；根因待上游确认，不能只写偶发",
  "impact": { "count": 2, "top": [{ "table": "ads.channel_report", "type": "table" }], "truncated": false },
  "actions": [
    { "action": "通知上游补分区", "owner": "交易组", "status": "待做" }
  ],
  "evidence": { "query": "select ...", "timeRange": "2026-10-26 00:00~08:00", "env": "prod-ro", "cost": "1 次" },
  "gaps": []
}
```

展示：

```text
dataops_shared_present_deliverable({
  kind: "incident",
  stage: "incident",
  deliverable: "deliverables/incident.yaml",
  status: "draft",
  payload: <上面 payload>,
  gaps: <payload.gaps>
})
```

根因没有证据就写「待确认」，不要把「上游没产出」直接当根因。
