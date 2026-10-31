# .dataops 构建配置

- `manifest.yaml`：平台代码根目录映射，只做定位。
- `build.yaml`：package、toolChain、files；files 相对仓库根。
- package 至少是平台粒度，不混平台。
- 未来支持：

```yaml
files:
  - path: ${structure.ref.data-schedule.lts}/channel_daily/*
```

当前 CLI 尚未支持该变量；组件可索引，但不能假装 CLI 已解析。

- build 不替换 `$$KEY$$`；deploy 才替换。
