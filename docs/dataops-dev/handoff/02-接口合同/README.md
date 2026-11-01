# 接口合同使用说明

本目录是设计输入，不是可直接编译的插件源码。

本地 Agent 应：

1. 先完成上游 API 核查。
2. 将这些类型适配到 DSH 的真实 Remote、Resource、Slot、React model 和错误系统。
3. 保留语义不变量：opaque FsVersion、draft/saved digest 分层、稳定错误码、保存对账、digest 绑定 Proposal、Host 权限复核。
4. 如必须改名或改字段，在偏差记录中说明原因和兼容处理。
5. 不要为了直接编译这些参考文件而猜测上游 import 路径。
