# 真一紫微 · ZHENYI Ziwei

[English](README.en.md) · [在线排盘](https://zhenyi-org.github.io/zhenyi-ziwei/) · [API 文档](docs/API.md) · [参与开发](CONTRIBUTING.md)

**一套可以读源码、跑测试、自己部署的紫微斗数排盘系统。** 从天文历法、真太阳时到安星、四化、格局和运限，计算逻辑都在这个仓库里。网页构建成一个 HTML 文件；同一套引擎也通过 Node.js 提供排盘 API。运行不需要安装第三方 npm 包。

![真一紫微命盘界面，示例日期为 2000 年 8 月 16 日](docs/assets/ziwei-demo.png)

> 截图是本仓库网页的实际运行画面。示例资料只用于展示界面。命理文本供研究和交流，不应用作医疗、投资等专业决定的依据。

## 你能用它做什么

| 能力 | 实现位置 | 说明 |
| --- | --- | --- |
| 天文历法 | `src/astro.js`、`src/calendar.js` | 儒略日、ΔT、太阳黄经、朔望、节气、农历与干支 |
| 校时 | `src/ziwei.js` | 出生地经度、均时差、中国历史夏令时、晚子时与时辰边界提示 |
| 紫微排盘 | `src/ziwei.js` | 十二宫、十四主星、辅煞杂曜、庙旺、四化、五行局、命身宫 |
| 运限与格局 | `src/analysis.js`、`src/content.js` | 大限、小限、流年/月/日，以及带成立、加分、破格条件的格局分析 |
| 网页 | `src/app.js`、`src/styles.css` | 明暗主题、宫位查看、运限切换、本地保存命例及导出数据 |
| HTTP API | `server.js` | `GET /health`、`GET|POST /generate`；保留旧接口字段并增加完整 `native` 结果 |

四化以生年干为本，参考《天纪》的读盘取向；安星采用《紫微斗数全书》的通行方法。不同流派对四化、闰月、晚子时和杂曜有不同取法，网页和 API 提供相应设置。项目与倪海厦本人及其相关机构没有隶属关系。

## 三步运行

需要 **Node.js 18 或更新版本**。

```bash
git clone https://github.com/ZHENYI-ORG/zhenyi-ziwei.git
cd zhenyi-ziwei
npm test
npm run build
```

打开 `dist/index.html` 就能使用网页。也可以直接打开[在线排盘](https://zhenyi-org.github.io/zhenyi-ziwei/)；它运行的是同一份静态页面。

需要给自己的站点接排盘服务时，再启动 API：

```bash
npm start
```

默认监听 `127.0.0.1:3001`。`PORT` 和 `HOST` 环境变量可以修改地址；公网部署时请自行配置反向代理、访问控制和 HTTPS。

## API 示例

```bash
curl http://127.0.0.1:3001/generate \
  -H "Content-Type: application/json" \
  -d '{"year":2000,"month":8,"day":16,"clockHour":12,"clockMinute":0,"longitude":120,"gender":"female"}'
```

响应包含 `chart`、`horoscope`、`patterns`、`patternSummary`、`timeInfo` 和 `native`。`native` 是完整的新引擎结果；前五项用于兼容旧版站点。参数、边界设置和响应说明见 [API 文档](docs/API.md)。

## 可以复核的地方

`npm test` 当前运行 11 组引擎检查，并补充 API 入口检查，覆盖朔望与均时差示例、节气、春节与闰月、公农历往返、示例命盘、紫微星位置、真太阳时、夏令时和随机命盘。GitHub Actions 会在每次推送和 PR 中运行测试与构建，并检查提交的单文件网页是否与源码一致。

历法有效范围从 **1900-01-31** 开始，到 2100 年末。接近朔的日界、海外夏令时以及部分杂曜流派差异仍需人工核对；具体见 [已知边界](docs/BOUNDARIES.md)。

## 仓库结构

```text
src/                 天文、历法、排盘、断语与界面源码
server.js            零依赖 HTTP API
test/                引擎与 API 检查
tools/               农历表生成工具
dist/index.html      构建产物，单文件网页
docs/index.html      GitHub Pages 使用的同一构建产物
docs/API.md          接口与旧版迁移说明
docs/BOUNDARIES.md   历法、流派和部署边界
```

## 开源范围

仓库包含排盘引擎、网页、API、格局规则与测试。普通浏览器和自行部署的静态网页可以排盘、查看规则生成的解读并导出 JSON；导出图片时会按需加载 `html2canvas` 的 CDN 文件。**AI 解盘目前仅在支持 `window.claude` 能力的页面环境中出现**，本仓库没有提供一个可直接调用的在线 AI 服务，也不包含模型权重。

代码按 [MIT License](LICENSE) 发布。欢迎提交可复现的命盘差异、历法边界案例和改进 PR；请先看 [贡献指南](CONTRIBUTING.md)。
