# 0012 · 真实系统接入边界

- 日期：2026-10-28
- 状态：已确认，待内网实施
- 关联：[内网接入架构](../design/intranet-architecture.md)

## 决策

1. 真实系统只通过 **Domain Adapter** 接入，UI/Agent 不直连。
2. 一个域一个 adapter：US / DataMap / Lineage / Profile / Scheduler / Code / CICD / Release / Identity。
3. Provider 默认 mock；真实 profile 显式配置 http/cli，**不允许静默回退 mock**。
4. 工具层负责权限、白名单、限额、超时、错误映射；不依赖模型判断。
5. Stage Runtime 负责 gate/签收/推进；外部合入、部署、发布、回滚不归 DataOps。
6. Stage 5 不使用 DSH 原生 approval；外部审批 ID/环境状态只读。
7. Workitem 先文件，后 service；切换时保持 payload/UI 不变。
8. 进入内网前先接只读 US/DataMap/Lineage/Profile，再接执行面。

## 不变量

- 不 fork 上游 DSH。
- 不把 mock 数据当真实结论。
- 不写生产、不执行真实部署/回滚。
- 不展示 Stage 6 假页面。
