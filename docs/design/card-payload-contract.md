# 卡片 Payload 契约与渲染安全

> 背景：Agent 生成的 deliverable payload 会在字段形态上和模板有差异。  
> 原则：Host/Agent 给的是“业务数据”，UI 不能把字段形态差异变成 React 崩溃。

## 1. 问题

已实际遇到的崩溃：

| 字段 | Agent 实际形态 | 卡片假设 | 结果 |
|---|---|---|---|
| `requirement.scope` | `{ in: [], out: [] }` | 文本 | React #31 |
| `design.target.primaryKey` | `"dt + channel_id"` | 数组 | `.join is not a function` |
| `design.dataMap.path` | `"a → b → c"` | 数组 | 路径不渲染 |
| `design.dataMap.assets[].fields` | `5` | 数组 | 不显示字段 |
| `analysis.candidates[].pros` | 字符串 | 数组 | `.join is not a function` |
| `solution.options[].pros` | 字符串 | 数组 | `.join is not a function` |

这些不是业务错误，是 **schema 变体**。

## 2. 统一处理

在 `packages/dataops-client/src/cards.js` 的 `parseModel` 出口增加 `normalizePayload`：

- 所有已知 list 字段 → `asArray`
- 字符串 → 单元素数组
- 对象保留，但在渲染时用 `displayValue`
- 特殊字段：
  - `scope {in,out}` → `范围：...；非目标：...`
  - `primaryKey` → 数组
  - `dataMap.path` → 按 `→` 拆分
  - `candidates[].pros` / `options[].pros` → 数组
  - `tech_plan.rollback.steps/materials` → 数组
  - `develop.validation.*.attempts/blocking` → 数组
  - `us-picker.items[].acceptance/assets/impacts` → 数组

## 3. 渲染规则

1. **React child 只允许 string/number/元素**，不允许裸 object。
2. 可能为 object 的文本字段统一 `displayValue(value, fallback)`。
3. 列表字段统一 `asArray(value)`。
4. 列表转文本统一 `joinText(value, separator)`。
5. `statusText` 对 object status 也返回文本。
6. 未识别的对象字段序列化兜底，不直接渲染。
7. 出错时 `CardBoundary` 只损坏当前卡，不拖垮整个 slot。

## 4. 覆盖范围

`normalizePayload` 和渲染矩阵覆盖：

```text
requirement
design
analysis
solution
tech_plan
table
lineage
profile
evidence
release
postmortem
incident
develop
cicd
stage
us-picker / us
```

测试：

```sh
node packages/dataops-client/scripts/check.mjs
```

包含：

```text
card renderers tolerate common string/object schema variants
requirement card renders scope object ...
analysis card tolerates string candidate pros ...
solution card tolerates string option pros ...
design card tolerates string primaryKey ...
```

## 5. 边界

- UI 防御不等于 Host 契约可以随便。
- 推荐后续在 Host `present_deliverable` 做 schema warning/normalization：
  - 未知字段进 `warnings`
  - 必填字段缺失进 `gaps`
  - 不把结构错误伪装成成功
- 当前先保证：**展示不崩、错误可诊断、业务门禁不被绕过**。

## 6. 后续

1. 把 payload 变体固化为 fixture，接进 client check。
2. Host presenter 输出 `schemaWarnings`。
3. 每新增卡片/字段，先在矩阵里加一条 malformed 用例。
4. 真实 provider 接入后，用真实 SDK 返回值跑同一矩阵。
