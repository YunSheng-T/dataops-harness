# @dataops/dsh-dataops-brand

DataOps 品牌包：**填充式粗细 ∞ 丝带标记** + **lowercase `dataops` 自定义 SVG 字标**。

它只占三个 DSH 原生品牌 seat，不改任何其他界面：

| seat | 内容 |
|---|---|
| `sidebar.brand.mark` | 侧栏 ∞ 标记 |
| `sidebar.brand.name` | 侧栏 `dataops` 矢量字标 |
| `conversation.hero.brand.mark` | 空会话 Hero 的 ∞ 标记 |

## 为什么需要它

DSH 的官方品牌包 `@deepseek-ai/dsh-client-ui-brand-official` 只在 `DSH_CLIENT_BUILD_PROFILE=official` 构建里注册。要换品牌，**不要挂官方品牌包**，改由本包占用这三个 single-occupant seat。

profile 里同时要禁用官方品牌行：

```yaml
- id: ui-brand-official
  disabled: true
- insert:
    - id: dataops-brand
      name: '@dataops/dsh-dataops-brand'
```

## 构建与检查

```sh
node scripts/build.mjs
node scripts/check.mjs && node scripts/smoke-apply.mjs
```

产物：`lib/client.js`（`window.__ModuleLoader__` 格式）+ `lib/index.js`（空 Host 插件）。

## 边界

- 只做品牌呈现，不碰主题 token、页面布局。
- ∞ 标记是填充式丝带：loop 粗、crossing 细，按原生 DSH 鱼标的横向比例 24 × 17.6 绘制；内联 SVG，跟随 `currentColor`。
- 字标是独立 SVG lettering：由 Montserrat Medium 轮廓转曲，收紧字距并加 0.35 光学描边；不依赖运行时字体，字形和 `deepseek` 的几何 lowercase 风格同族。
- 字标不依赖运行时字体；Montserrat 源文件和 SIL OFL 仅作为字形来源留档（`assets/`）。
- 不修改 `@deepseek-ai/*` 包、`dsh` 命令或 `DSH_*` 环境变量。
