# 血缘卡：三视图合并

> 状态：已实现第一版。右栏血缘入口使用嵌入式三视图卡。  
> 卡内三视图截图：[lineage-surface-card.png](../../prototype/shots/lineage-surface-card.png) · 真机 3080：[lineage-tab-fixed.png](../../prototype/shots/lineage-tab-fixed.png) · YAML 真实数据：[lineage-yaml-real.png](../../prototype/shots/lineage-yaml-real.png)

## 1. 目标

把原来的“血缘预览卡”和“全宽血缘工作台”合并成一张卡，同时保留原来的三视图：

```text
设计视图
生产视图
调度视图
```

右栏“血缘”入口直接渲染这张卡，不再打开独立全宽工作台。

## 2. 结构

```text
LineageSurface
├─ header
│  ├─ 当前视图标题 / summary
│  ├─ 设计 / 生产 / 调度 tabs
│  └─ 聚焦 / 退出聚焦
├─ body
│  ├─ ReactFlow 图
│  └─ 节点详情 inspector
└─ footer
```

### compact

- 右栏内默认密度
- 图 + 详情
- 宽容器左右排，窄容器上下排

### focus

- 同一张卡在当前容器内增高
- 不跳页，不 overlay，不出现第二套 header
- 切换视图时保留当前选中节点

## 3. 数据

第一版复用 `flow.js` 里已有的 `VIEWS.design / production / schedule` 内容，先把三视图和合并后的卡壳落地。

后续再把 `VIEWS` 的 mock 数据替换成：

- 设计视图：设计血缘 / DataMap
- 生产视图：生产链路
- 调度视图：调度任务和作业

不把 task.yaml 解析出来的简化 DAG 当作调度视图内容。

## 4. 文件预览

`task.yaml` 也使用同一个 `LineageSurface`：左侧三视图血缘卡，右侧 CodeMirror 源码。文件卡不再走旧的简化 `LineageV2Card`。

右侧源码分栏是文件预览的能力，不塞进右栏三视图卡。

## 4.1 样式边界

嵌入式 surface 复用原工作台的节点和图标样式，因此 surface body 需要带 `do-workbench-overlay` scope；否则 `.rf-icon img` 等规则不会命中，节点图标会失控。

## 4.2 真机确认

已在 `127.0.0.1:3080` 的 dataops 真机确认：右栏血缘 tab 是一张 720px 上限的卡，不再 fixed 全屏。

之前全屏的原因是 surface body 为恢复图标样式复用了 `do-workbench-overlay`，而构建时该类同时带 `position:fixed; inset:0; z-index:95`。现用 `.do-surface-body.do-workbench-overlay` 覆盖为 static。

## 5. 边界

- 不再从卡片打开全宽工作台
- 右栏 tab 是同一张卡的宿主，不是第二个组件
- `LineageWorkbench` 只保留为未来复杂图谱的底层渲染器，不再作为入口
- 没有数据时显示空状态，不用 mock 冒充上下文

## 6. 待确认

- 右栏首次打开默认调度视图，是否合适？
- focus 是否要允许用户拖动改变高度？
