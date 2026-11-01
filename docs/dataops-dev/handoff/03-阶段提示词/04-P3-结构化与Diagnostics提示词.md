# P3 结构化源码与 Diagnostics 提示词

```text
P0～P2 已通过。现在实现 dataops-dev P3。阅读交接包 01-开发规范/05、06，structured-editing.types.ts、dev-document.types.ts，以及验收矩阵 STR-01～04、DIA-01～05。

实现范围：
1. 为真实 task.yaml 建立保留注释、字段顺序和未知字段的 CST/源码投影，不能整份 YAML load/dump。
2. Projection、SourceMap、Diagnostics 与 subjectDigest/parserVersion 绑定，同一 analysisId 原子发布。
3. entityRef 使用稳定 taskKey/jobKey/canonical path，SourceRange 使用统一 1-based UTF-16 行列；节点和源码双向定位。
4. 节点拖动只改视觉布局，不改 YAML，不进 Artifact。
5. 白名单 setScalar 通过 expectedDraftDigest + TextEdit 生成新 draft，保留未知字段和注释，不自动保存。
6. Host Provider Registry：providerId/providerVersion/contentType/能力明确；draft analyze 有界、只读、可取消，不访问生产。
7. keystroke 标旧诊断 stale、取消旧 request；旧结果不得覆盖新 draft；保存后按 savedDigest 重跑。
8. Diagnostics 面板区分 draft/saved、active/stale/resolved、Provider failure/合法空结果；draft 不进 Evidence。
9. 无 Parser、语法错误、Provider 失败均回退文本或保留标 stale 的旧值，不用静态演示 DAG/诊断。

必须运行 STR-01～04、DIA-01～05，并用含注释、未知字段、多父依赖的脱敏 task.yaml 做源码保持回归。验证异步乱序返回不会混版。

不要实现任意 DAG 拖边依赖编辑，不要开放 SQL 可视化生成器，不要把“Parser 无错误”写成“验证通过”。

交付《P3验证报告.md》、真实解析样例、测试输出和界面验证。若图/诊断/源码无法证明同版，P3 不通过。
```
