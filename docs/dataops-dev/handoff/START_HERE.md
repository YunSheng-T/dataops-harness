# dataops-dev 本地 Agent 开发交接包

## 1. 这个包是什么

这不是一套伪装成成品的插件代码，而是一份让本地 Agent 在真实 DeepSeek Harness（DSH）工作区内实施 `dataops-dev` 的开发合同。

本地 Agent 应依据本包完成：

- 核对当前 DSH 的真实扩展 API，而不是照抄文档猜测。
- 在 DSH 插件机制内实现数据开发 IDE，不 fork DSH。
- 先完成原生扩展与文件写入策略 Spike，再实现文本 IDE、Agent 共同编辑、结构化源码、Diagnostics、Artifact 和 Slots。
- 每个阶段运行真实类型检查、测试和本地 DSH 验证，保留证据。
- 对不符合上游合同的参考设计进行适配，并记录偏差，不静默降级安全要求。

本包不包含可生产运行的 mock 数据、真实凭据、企业环境地址或部署脚本。

## 2. 推荐的 KIMI WORK 工作区布局

将本交接包解压到 DSH 仓库的同级目录，再把它们的共同父目录作为本地工作区连接：

```text
my-workspace/
├── deepseek-harness/                 # 你本地已有、可运行的 DSH
└── DataOps-Dev本地Agent开发交接包/   # 本材料包，不必放入 Git 仓库
```

这样可以让本地 Agent 读取设计材料，同时只在 DSH 仓库内修改实现代码，避免把交接材料误当成插件源码提交。

如果只能连接 DSH 仓库本身，可把本包放在仓库外的可读位置，并在启动提示词中给出绝对路径；不建议把 `.ts` 合同文件复制进源码目录后直接编译。

## 3. 在 KIMI WORK 中如何启动

1. 确认本地 DSH 已能按你现有方式安装依赖、类型检查、测试和启动。
2. 连接上述共同工作区。
3. 打开 `03-阶段提示词/00-总控启动提示词.md`，把完整内容发给本地 Agent。
4. 本地 Agent 首先只能做仓库核查、上游证据记录和 P0 方案对齐；不得直接大规模生成 UI。
5. P0 验收通过后，再依次使用 P1～P4 的阶段提示词。最后使用 `06-最终验证与交付提示词.md`。

如果本地 Agent 支持长期任务，可把 `04-验收与交付/实施计划.yaml` 作为任务清单来源，但阶段门禁不能省略。

## 4. 阶段顺序与硬门禁

| 阶段 | 本地 Agent 的任务 | 未通过时不得做什么 |
|---|---|---|
| 核查 | 确认分支、依赖、DSH 版本、真实 API、插件样例、测试命令 | 不得假定文档中的 import 路径一定存在 |
| P0 | `conversation.view`、文件树复用、DevDocument open/save、UI/Agent 策略组合 | 不得继续开发完整 IDE；不得 fork 或关闭策略绕过 |
| P1 | 文本 IDE、单文档模型、保存幂等、冲突、hot-exit、只读降级 | 不得接入 Agent 直写或 Artifact 推进 |
| P2 | clean/dirty 共同编辑、presence、EditProposal、原生 Diff | 不得默认共享 dirty 草稿 |
| P3 | task.yaml CST、SourceMap、白名单编辑、Diagnostics | 不得用整份 YAML dump 或静态 DAG 代替 |
| P4 | Artifact 动作门禁、五类 Slots、Provider Registry | 不得让 UI 或 Agent 绕过 Host 权限 |
| 最终 | 全量验证、界面检查、安全审计、偏差清单、运行说明 | 不得把未验证功能写成“已完成” |

## 5. 本地 Agent 必须遵守的边界

- 不 fork DeepSeek Harness，不替换 Chat、Trajectory、Files、Diff、Approval 和右侧栏。
- 不另建平行文件系统；DevDocument 底层必须使用同一 Session 的 `ctx.fs`。
- 不用 `actor=undefined`、伪造 `fs/observed` 或关闭策略来让保存通过。
- Agent 和其他调用方必须继续进入原生 `fs-observation-policy`；UI bridge 只能服务经过认证的 DevDocument UI actor。
- Agent 看不到浏览器 dirty buffer。dirty 时不能直接写磁盘，只能生成绑定 digest 的建议补丁。
- 不在保存冲突或结果未知时自动覆盖、强制写入或盲目重试。
- 未保存草稿的 Diagnostics 不能成为发布 Evidence；Artifact 推进只接受 savedDigest。
- 不自动把本地草稿、真实环境参数或 Secret 发送给 Agent，也不写入 prompt、日志、卡片、fixture。
- 模型和 UI 不能传任意 URL；actionId 必须来自 Host Registry，外部地址只能来自配置或环境。
- 单元测试可以使用显式 fake；生产装配禁止静默 mock fallback。
- 不替换企业调度、CICD、发布、回滚和审批系统；生产默认只读。
- 不提交、不推送、不合并、不部署，除非你在本地另行明确批准。

## 6. 材料导航

- `01-开发规范/`：范围、上游核查、包结构、文档服务、共同编辑、结构化与 UI、安全要求。
- `02-接口合同/`：参考 TypeScript 类型与 Remote/Slot 合同。它们是设计输入，不是可直接编译的成品。
- `03-阶段提示词/`：交给本地 Agent 的总控与分阶段任务书。
- `04-验收与交付/`：实施计划、验收矩阵、测试证据模板、偏差记录模板。
- `05-原设计材料/`：36 页 IDE 专项设计和八张架构／高保真界面图。

## 7. 本地 Agent 最终应交付什么

最终交付不是“页面能打开”这一张截图，而应至少包括：

1. DSH 仓库内的 `dataops-dev` 插件源码与 preset 装配变更。
2. 上游 API 证据和实际实现偏差说明。
3. 单元、集成、并发、安全和 UI 测试及真实执行结果。
4. 本地启动、安装依赖、测试和验证命令。
5. 已知限制、未完成项和后续建议，明确区分已验证与仅实现未验证。
6. 变更文件清单；不隐藏对上游公共合同或 preset 的修改。

建议本地 Agent 使用 `04-验收与交付/最终验证报告模板.md` 汇总结果。
