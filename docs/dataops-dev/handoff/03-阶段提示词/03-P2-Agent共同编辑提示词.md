# P2 Agent 共同编辑提示词

```text
P0/P1 已通过。现在实现 dataops-dev P2 Agent 共同编辑。阅读交接包 01-开发规范/04、07，接口合同中的 EditProposal，以及验收矩阵 AGT-01～09。不要改变 P1 的保存与冲突语义。

实现范围：
1. presence lease：首次 dirty 立即上报，heartbeat 只含状态/digest/clientInstance，不传 draftText；close 释放，过期可判。
2. Agent clean 直改：dirty guard 后必须 next()，原生 read-before-write 不削弱；IDE changes 后安全刷新并显示原生 Diff。
3. Agent dirty 直写：稳定返回 dev/document-dirty，磁盘不变；引导为建议补丁或请用户先保存。
4. EditProposal：proposalId、origin、subjectKind、subjectDigest、hunks、state；应用前校验 digest 和 expectedText，只生成新 draft，保存仍由用户执行。
5. Proposal 在文档变化后标 stale，禁止旧 range 应用；记录 offered/applied/dismissed/stale。
6. 默认 Agent 只能读取 saved。只有用户明确“共享当前草稿用于本次建议”时，才固定临时 draft snapshot 并做本次受控共享；不订阅 keystroke。
7. “修复此诊断”上下文只用于定位，Agent 仍重新读取最新事实。
8. presence 过期/离线不宣称实时无损协同，回线按 external/conflict 对账。

必须运行 AGT-01～09，特别证明 Agent 未观察写仍失败、dirty 写磁盘 digest 不变、默认 draft 不出现在 prompt/tool output、显式共享只读固定 snapshot。

不要用全局禁用 Agent 写来伪装共同编辑；clean 必须保留原生能力。不要把 Proposal 当保存回执、Approval 或 Evidence。

交付《P2验证报告.md》和真实测试/手工验证结果。任何 Agent 绕过原生 policy 或 dirty 直写成功都视为 P2 不通过。
```
