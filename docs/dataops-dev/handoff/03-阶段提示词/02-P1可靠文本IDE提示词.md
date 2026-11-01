# P1 可靠文本 IDE 提示词

```text
P0 已通过。现在实现 dataops-dev P1 可靠文本 IDE。先阅读交接包 01-开发规范/03、06、07，02-接口合同/dev-document.*，以及验收矩阵 DOC-01～12、UI-01～06。检查 P0 报告和现有用户改动，不覆盖已有工作。

实现范围：
1. IDE Session 内同一规范化 fileAddress 只有一个文档模型；重复打开聚焦已有 tab。
2. 编辑器支持 clean/dirty/saving/external-clean/conflict/save-unknown，以及 read-only/missing/too-large/unsupported。
3. 手动 Ctrl+S、全量文本保存、idempotencyKey、Host digest、真实新 FsVersion。
4. 保存响应丢失进入 save-unknown，通过 reconcile 区分 saved/not-saved/conflict；不盲重试、不伪造 receipt。
5. 保存期间继续输入时，只保存固定快照，后续输入仍 dirty。
6. clean 外部变化安全刷新并尽量保留光标/选择/滚动；dirty 外部变化进入 base/local/current 三方冲突。
7. 采用 current 二次确认；保留 local 只改基线；手工合并只生成 draft；均不自动落盘。
8. hot-exit 使用 Session 隔离、可配置、带 TTL 的 IndexedDB；磁盘变化时只恢复 conflict，不自动保存或共享。
9. 大文件、非 UTF-8、missing、权限变只读时保留可导出 local 并安全降级。
10. 完成主界面基本状态和冲突界面，服从 DSH 原生主题，不 fixed 全屏。

测试要求：运行验收矩阵 DOC-01～12 和 UI-01～06 对应的真实自动化/集成测试；手工检查 clean、dirty、saving、save-unknown、conflict、read-only 和窄容器。任何场景不得通过删除断言或强制写来“修复”。

本阶段不要启用 Agent dirty 直写，不要开放 Artifact 推进，不要做结构化 YAML dump。

交付《P1验证报告.md》：变更文件、真实命令和结果、六类界面证据、并发测试、已知限制和偏差。若本地草稿在任何失败路径丢失，P1 不通过。
```
