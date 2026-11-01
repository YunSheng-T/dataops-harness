# @dataops/dataops-install

DataOps 的安装 / 诊断 / 卸载 CLI。底层调用官方 DSH 命令，不手写 profile。

## 安装

    npx --yes @dataops/dataops-install@0.1.0 install --dsh dsh --offline ./dist --yes

或在仓库内直接运行：

    node packages/dataops-install/bin/dataops-install.mjs install --dsh ./scripts/dsh --offline ./dist

## 命令

    dataops-install install [--home <DSH_HOME>] [--profile dataops] [--offline <dir>] [--yes]
    dataops-doctor [--home <DSH_HOME>] [--json]
    dataops-uninstall [--home <DSH_HOME>] [--keep-profile] [--yes]

离线安装会检查本地 tarball 集合，并在 profile 的 pnpm-workspace.yaml 写 overrides，避免访问 registry。
技能默认安装到 $DSH_HOME/skills；--no-skills 关闭，--workspace <dir> 改为项目 .agents/skills。
receipt 位于 $DSH_HOME/dataops/install.json；卸载不会删除 workspace 的 workitems。
