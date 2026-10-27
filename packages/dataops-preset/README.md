# @dataops/dsh-dataops-preset

声明 `dataops-dev` Agent preset：DataOps Lead persona、workflow/workitem 技能、文件/提问/待办工具，以及发布审批约束。

这是 profile bundle，不是 Host 插件；通过 profile 的 `dsh.profile.bundles` 加载。

```sh
node scripts/install-dataops-profile.mjs
dsh --profile dataops --dump-config
```

在新建会话的模式选择器中选择 **数据开发模式**。
