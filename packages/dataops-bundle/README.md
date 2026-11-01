# @dataops/dsh-dataops-bundle

DataOps 的唯一用户安装入口。它本身是配置层：dsh.bundle.patch 组合 DataOps tools、brand、client 与 agent preset，禁用官方品牌占位，并把 dataops-dev 设为默认 preset。

## 安装

    dsh plugin --profile dataops add @dataops/dsh-dataops-bundle@0.1.0

首次安装需要先按 web 模板初始化 profile；推荐使用 dataops-install 安装器，而不是手写 profile。

## 资产

- cordis.patch.yml：由 profiles/dataops/cordis.patch.yml 与 packages/dataops-preset/cordis.patch.yml 生成，不要手改。
- 运行时依赖：@dataops/dsh-dataops-tools、-brand、-client，均为精确版本。preset 只作为 patch 源片段，不进入运行时依赖，避免 dsh plugin add 把 preset 也当作独立 bundle 激活。

## 开发

    node scripts/build-dataops-bundle.mjs
    node scripts/check-dataops-bundle.mjs
