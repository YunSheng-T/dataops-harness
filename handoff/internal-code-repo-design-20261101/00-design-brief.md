# 设计 Brief

## 1. 背景

DataOps 是叠加在 DSH Web 上的垂直发行版，面向内部数据开发者和数据运维。

代码管理已经复用 DSH 原生的 **工作区 Files tab**，不自建代码仓页面。DataOps 只负责：

- 识别数据代码仓里的四类制品
- 为文件提供结构化预览
- 把预览、源码、血缘和调度信息组织成一套可读的界面

## 2. 当前已经实现的形态

### 代码仓

一个 workspace 内按平台组织：

```text
lts_code/          调度 task.yaml + parameters.properties
code/sql/          建模 SQL：DDL / DML / Rollback
code/etl/          FlashSync / BDS / SP
code/data_service/ DataApi + 下线脚本
.dataops/          manifest.yaml + build.yaml
docs/design/       设计说明
```

### 文件预览

```text
task.yaml
├─ 左：LineageSurface（设计 / 生产 / 调度三视图卡）
└─ 右：CodeMirror 只读源码
```

顶部可切换：

```text
分栏 / 预览 / 源码
```

### 右栏“血缘”

同一张 `LineageSurface` 卡：

- 设计视图
- 生产视图
- 调度视图
- compact / focus
- 不打开全宽工作台

## 3. 用户当前反馈

### 已经确认的方向

- 不要重复维护“预览卡 + 全宽工作台”两套表面
- 一张卡保留三视图，不要退回成单图
- 源码用右侧分栏，不要塞进卡片内部
- `task.yaml` 左侧血缘必须来自右侧 YAML 的真实解析结果，不能显示静态 mock
- 卡片要有明确边界，不允许 fixed 全屏覆盖
- 预览要能表达：task、cron、job、依赖、参数、占位符

### 当前仍不理想

- `task.yaml` 预览卡和右侧源码的比例在窄空间里不稳定
- 图形、inspector、任务参数三者密度不容易平衡
- 节点较多时，是否应该放大成 focus，还是继续滚动
- 设计 / 生产 / 调度三视图在右栏里如何保持同一张卡的身份
- 任务参数、占位符、作业列表和节点 inspector 的信息层级

## 4. 设计任务

请基于本包，重新设计以下表面：

### A. 文件预览卡

- 左侧结构化血缘
- 右侧源码编辑器
- 顶部模式切换
- 真实 YAML → 真实调度图

### B. 三视图血缘卡

- 设计 / 生产 / 调度 tab
- compact / focus
- 图 + inspector
- 在右栏、宽面板、窄面板下的布局
- 节点类型、依赖边、选中态、空状态

### C. 代码仓浏览辅助

可以提出更好的信息架构，但不要重新实现 Files tab。

## 5. 约束

- 必须适配 DSH 的 token 和暗色/亮色
- 右侧栏可能只有 620 到 720px 宽
- 源码建议 CodeMirror 6 的视觉方向；当前实现是 CodeMirror 5.65
- 卡片不能 fixed 全屏；focus 只能在当前容器内放大
- 不做写操作、不做部署
- 不展示真实凭据和数据
- 不要把 task.yaml 的解析结果和静态演示数据混用

## 6. 期望产出

1. 信息架构和组件边界
2. 文件预览卡与三视图卡的布局方案
3. 窄栏 / 宽栏 / focus 三态
4. 交互说明：tab、选中节点、源码、focus、滚动
5. 视觉 token 建议
6. 至少一套高保真原型或截图
7. 需要确认的设计问题清单
