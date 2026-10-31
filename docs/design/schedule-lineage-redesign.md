# 调度血缘与代码预览重设计

> 状态：已实现第一版（compact / focus 单卡，源码右侧分栏）。  
> 原型：[schedule-lineage-redesign.html](../../prototype/schedule-lineage-redesign.html)  
> 截图：[紧凑卡](../../prototype/shots/schedule-lineage-redesign.png) · [聚焦卡](../../prototype/shots/schedule-lineage-redesign-focus.png)

## 1. 结论

不再保留“紧凑血缘卡 + 全宽血缘工作台”两套表面。

改为 **一张卡，两个密度**：

| 密度 | 场景 |
|---|---|
| compact | 对话、文件预览、右栏 |
| focus | 同一文件面板内放大，不跳页，不打开全屏工作台 |

focus 只改变当前卡片布局，不创建新的页面、tab 或 overlay。

## 2. 设计原则

- 文件上下文不丢失
- 选中作业、图谱、view 状态在 compact / focus 之间共享
- 卡片自己就是血缘表面，不再有“打开工作台”这个跳转
- 源码继续放在文件预览的右侧分栏
- 默认不展示源码
- 没有数据就显示空状态，不拿 mock 填满

## 3. 卡片结构

```text
调度血缘 / 调度视图
channel_daily_mixed
周期任务 · 02:10 每日

[调度视图] [1 任务] [6 作业] [7 依赖] [未发现阻断]

关键路径
DAG

作业 inspector

任务参数 / 占位符 [聚焦] [源码]
```

### compact

- 卡片在当前文件预览列内
- DAG 在上，inspector 在下
- 右侧仍可展开源码分栏
- 高度随内容

### focus

- 同一张卡在当前面板内增高
- DAG 与 inspector 左右排列
- 源码分栏暂时收起
- 顶部按钮变为“退出聚焦”
- 不覆盖整个应用，不出现第二套 header

## 4. 交互

- 点击作业：更新 inspector，同时同步源码选中行
- 点击“聚焦”：卡片切换密度，保留选中作业
- 点击“退出聚焦”：回到 compact，仍在同一文件
- 点击“源码”：退出聚焦，切到源码分栏
- Esc：退出聚焦或从源码回到分栏
- 拖动分隔条调整预览/源码宽度
- 1024 / 1440 / 1600 / 1920 无横向溢出

## 5. 编辑器

采用 **CodeMirror**，不是 Monaco。

- 当前实现使用 CodeMirror 5.65 standalone，避免引入打包器
- YAML / SQL 只读高亮
- 行号、复制、主题
- 后续可升级 CodeMirror 6

## 6. 原型范围

包含：

- 一张卡
- compact / focus 两种密度
- 右侧源码分栏
- 路径与任务参数
- 明暗主题

不包含：

- 全宽工作台
- 新的页面或路由
- 真实调度平台数据
- 写操作

## 7. 旧全宽工作台

保留 `flow.js` 作为未来复杂图谱的渲染器，但当前产品入口不再默认使用它；复杂图谱需要时再单独设计 focus/full 模式。

## 8. 待确认

- compact 下 inspector 是否一直显示，还是仅在选中作业后出现？
- focus 是否允许用户手动调整卡片高度？
