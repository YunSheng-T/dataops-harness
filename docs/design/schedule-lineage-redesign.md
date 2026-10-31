# 血缘卡：三视图合并

> 状态：已实现第一版。右栏血缘入口使用嵌入式三视图卡。  
> 卡内三视图截图：[lineage-surface-card.png](../../prototype/shots/lineage-surface-card.png)

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

`task.yaml` 仍保留左右分栏：左侧血缘卡，右侧 CodeMirror 源码。

右侧源码分栏是文件预览的能力，不塞进右栏三视图卡。

## 4.1 样式边界

嵌入式 surface 复用原工作台的节点和图标样式，因此 surface body 需要带 `do-workbench-overlay` scope；否则 `.rf-icon img` 等规则不会命中，节点图标会失控。

## 5. 边界

- 不再从卡片打开全宽工作台
- 右栏 tab 是同一张卡的宿主，不是第二个组件
- `LineageWorkbench` 只保留为未来复杂图谱的底层渲染器，不再作为入口
- 没有数据时显示空状态，不用 mock 冒充上下文

## 6. 待确认

- 右栏首次打开默认调度视图，是否合适？
- focus 是否要允许用户拖动改变高度？
