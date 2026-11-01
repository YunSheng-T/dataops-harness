# Third-party notices

This project is an independent DataOps distribution built on DeepSeek Harness
(DSH). It is not affiliated with, endorsed by, or sponsored by DeepSeek.

The following third-party components are included in, or required by, the
DataOps packages. Full license texts must be kept with release artifacts.

## React

- Component: React (production build)
- License: MIT
- Copyright: Meta Platforms, Inc. and affiliates
- Usage: peer/runtime dependency of the client plugins; a vendored production
  build is kept under packages/dataops-client/assets/lineage/vendor for local
  previews.

## React Flow

- Component: React Flow (UMD build, vendored)
- License: MIT
- Copyright: webkid GmbH and contributors
- Usage: lineage/workbench graph rendering inside the client bundle.
- File: packages/dataops-client/assets/lineage/vendor/reactflow.umd.js

## Montserrat

- Component: Montserrat Medium webfont
- License: SIL Open Font License 1.1
- Usage: DataOps wordmark outlines; the OFL text is kept at
  packages/dataops-brand/assets/Montserrat-OFL.txt.

## Product icons

The client bundles product icons for Apache Hive, ClickHouse, MySQL, Apache
Kafka, Redis, Apache Spark and Apache Airflow. These marks are trademarks of
their respective owners and are used only to identify the corresponding
technology. Their use does not imply endorsement.

## DeepSeek Harness

DSH runtime packages are not redistributed by this repository. They are
installed separately and remain under their own licenses. The DataOps
packages declare DSH compatibility through engines.dsh and peer dependencies.

## MIT license text

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
