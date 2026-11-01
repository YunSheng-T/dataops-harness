# 总控启动提示词

将以下完整内容发给本地 Agent：

```text
你现在要在本地真实 DeepSeek Harness（DSH）工作区中开发 dataops-dev 数据开发 IDE。当前工作区应包含本地 DSH 仓库，以及同级的 DataOps-Dev本地Agent开发交接包。先自行定位两者；如果目录名不同，按实际路径识别。

这不是独立 Web 应用，也不是让你照抄参考类型生成一个演示页面。你必须在 DSH 原生插件机制内实现，不 fork DSH。

第一步只做核查和 P0，不要直接开发完整 IDE。

必须阅读：
1. 交接包 START_HERE.md。
2. 01-开发规范/00、01、02、03、04 文档。
3. 02-接口合同/README.md 及相关合同。
4. 04-验收与交付/测试与验收矩阵.md。
5. 本地 DSH 官方 .agents/skills 中与插件、Host、Client、Remote、Slot、文件系统相关的真实说明。
6. 本地 DSH 的真实源码，而不是只依赖交接包描述的 API。

工作纪律：
- 先检查 DSH 实际 commit、package manager、安装/构建/测试命令和 git status。
- 保护现有用户改动；不 stash、不覆盖、不格式化全仓，不 commit/push/merge/deploy。
- 在交接包同级新建 DataOps-Dev本地开发验证记录目录保存报告，不修改原设计材料。
- 参考 .ts 合同不是可直接编译的成品，import 和注册方式必须按真实 DSH 适配。
- 不猜路径。找不到 API 时列目录、查代码和现有插件样例。
- 如果本地 DSH 版本与基线不同，记录实际差异。
- 生产装配禁止 mock fallback；测试 fake 只能存在于明确测试环境。

先输出并写入验证记录目录的《上游证据记录.md》：
- 实际 commit、工作区状态、现有改动保护方式。
- 一个现有功能插件的 Host/Client/Remote/Slot/测试结构。
- conversation.view、openView、completeViewRequest 的证据路径与行号。
- sidebar.files.tree 与 navigator 区别。
- ctx.fs writeText、FsVersion、replaceIfVersion、真实 outcome。
- fs-observation-policy、write/edit intent slot 组合和 actor/principal 语义。
- preset 插件依赖和组合顺序。
- 真实类型检查、测试和启动命令。
- 与交接包合同的偏差。

然后只制定并执行 P0：
A. 注册最小 dataops-dev conversation.view，证明从原生入口带 focus 打开并完成 completeViewRequest。
B. 复用原生 sidebar.files.tree Factory 打开真实文件，不新建文件系统。
C. 实现最小 DevDocument open：权限/lstat、stat-readBytes-stat、严格 UTF-8、digest、大小限制。
D. 实现最小 save：真实 ctx.fs + replaceIfVersion + Host digest + 稳定 stale 错误。
E. 实现并验证 UI actor 专用 bridge 与原生 observation policy 的组合。Agent/其他 actor 必须 next()，不得 actor=undefined 或伪造 observation。
F. 写真实集成测试证明：UI 合法保存成功；UI 无 open/越权失败；Agent 未观察写仍失败；竞争返回 stale；其他 actor 无 UI 特权。

P0 硬门禁：
- 不 fork DSH。
- 不关闭或削弱 Agent observation。
- 不用 workspaceFiles 分页文本直接拼可保存全文。
- 不用 mock ctx.fs 代替真实集成验证。
- 如果必须修改 DSH 核心才能继续，停止并报告最小缺口，不直接修改核心。

完成后在验证记录目录写《P0验证报告.md》，包含变更文件、真实命令与结果、测试证据、手工验证步骤、偏差和未解决问题。最后停止，等待我审查 P0；不要自动进入 P1。
```
