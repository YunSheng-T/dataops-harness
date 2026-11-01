# 结构化源码、Diagnostics、Artifact 与 Slots

## 1. 结构化源码

### 权威关系

Source Text 是唯一可编辑规格。Projection、SourceMap、Diagnostics 是可再生成派生事实；Visual Layout 是用户偏好；ArtifactRef 只指向 savedDigest。

不得把 DAG 保存成另一份可独立修改 JSON。不得把节点拖动当成 YAML 修改。不得用静态演示 DAG 填充真实文件。

### task.yaml CST

使用能保留注释、字段顺序和未知字段的 CST/源码编辑能力。禁止简单 YAML load 后整份 dump。解析失败时保留文本编辑与语法诊断，结构化视图显示不可用，而不是空 DAG。

SourceRange 统一为 1-based line/column，column 使用 UTF-16 code units，end 为 exclusive。Parser 适配层负责坐标转换。

entityRef 使用稳定 taskKey、jobKey 或 canonical path，不使用 jobs 数组下标。节点与源码双向定位；源码变化后优先按 entityRef 恢复选择。

### 白名单编辑

首版只支持 schema 登记的 `setScalar`，例如 cron、timeout、retry 等明确标量。请求必须带 expectedDraftDigest；Owner 校验后返回 TextEdit[] 和 resultingDraftDigest，只修改 Client draft，不自动保存。

Inspector、诊断 quick fix 和结构化视图必须共用同一 requestEdits callback。任意 YAML path、整份对象替换、拖边改 parentJobName 和 SQL 可视化生成器均后置。

## 2. Diagnostics

### Provider Registry

Parser/Scanner/Verification Provider 在 Host 注册，声明 providerId、providerVersion、contentType matcher 和能力。UI Slot 不能直接注入诊断事实。

draft analyze 只运行有界、只读、可取消 Provider；saved analyze 在保存后按 savedDigest 重跑。长 VerificationRun 只接受 savedDigest，并作为独立领域对象。

### 原子性与生命周期

- keystroke 后旧诊断立即标“可能过期”，取消旧 request。
- 同 analysisId 的 projection、diagnostics、sourceMap、providerSet 原子替换。
- 旧 request 返回直接丢弃。
- 新结果缺少旧 fingerprint 可记 resolved，但 resolved 不等于业务验证通过。
- 缓存失败与合法空结果分开，Resource 失败可保留最后成功值并标 stale。

Draft diagnostics 必须显示“未保存草稿”。“Parser 无错误”不等于“数据作业已验证”。Evidence 只能来自绑定 savedDigest 的受控 VerificationRun。

### 面板交互

支持 severity、provider、active/stale 过滤；点击定位 range/entityRef；过期时禁止跳到错误行；“修复此诊断”只进入 Agent Proposal 或白名单 quick fix，不直接保存。

## 3. Artifact 动作

文件不等于 Artifact。只有 saved、可寻址的源码才能形成 savedArtifactRef。IDE 核心只构造上下文、显示状态和调用统一动作入口，具体验证、Deliverable、Package 由其他插件以后实现。

| 状态 | 面板 | 推进动作 |
|---|---|---|
| clean + saved 最新 | 当前 savedArtifactRef 和 allowedActions | Host 再次校验后可执行 |
| dirty | 最后 savedArtifactRef + 未保存提示 | 禁用，`dev/unsaved-changes` |
| saving | 保存中，不提前创建新 Artifact | 禁用 |
| save-unknown | 结果未知 | 禁用，先 reconcile |
| conflict/external-clean | base/local/current digest | 禁用，恢复 clean 后重试 |
| read-only | saved ref + 只读原因 | 只读验证可单独允许；写按权限 |
| missing/unsupported | 缓存 ref 标 stale | 禁用 |

actionId 只能来自 Host Action Registry。UI allowedActions 只是展示，Host invokeAction 每次重新校验 Session、环境、digest、权限和参数 schema。Agent 与 UI 使用同一 Host 命令路径，模型和 UI 不能传任意 URL。

## 4. 五类 Slots

| Slot | 贡献 | Owner 注入 | 禁止 |
|---|---|---|---|
| `dataops.dev.document.renderer` | DAG、Outline 等结构化视图 | readonly document、projection、sourceMap、selection、revealRange、requestEdits | 直接写/保存、改 diagnostics、Cordis ctx |
| `dataops.dev.document.inspector` | entity Inspector | 当前 entity、range、subjectDigest、requestEdits | 自行解析另一份源码、绕过白名单 |
| `dataops.dev.document.actions` | 文档级动作 | DocumentActionContext、allowedActions、invokeAction | render 副作用、私连外部系统 |
| `dataops.dev.artifact.actions` | Deliverable/Package 入口 | savedArtifactRef、syncState、workItemId、allowedActions、invokeAction | draft 发布、伪造权限 |
| `dataops.dev.editor.status` | 构建/运行状态 | fileAddress、savedDigest、Resource 地址、只读 status model | 改 sync、推进 Artifact、覆盖保存错误 |

贡献声明至少包含 id、pluginId、contributionVersion、contentTypes、priority、canRender。Owner 负责选择和冲突诊断。

每个 Slot 使用 Error Boundary，扩展崩溃只降级该面板，不影响文本和 dirty。props 是只读 snapshot + 受限 callback，callback 仍需 digest、schema、取消和权限校验。跨插件不运行时互导 React 组件。
