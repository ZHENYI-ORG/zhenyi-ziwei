# 真一紫微 · ZHENYI Ziwei

[English](README.en.md) · [真一官网体验](https://www.zhenyi.org/) · [开源版排盘演示](https://zhenyi-org.github.io/zhenyi-ziwei/) · [API 文档](docs/API.md) · [参与开发](CONTRIBUTING.md)

**参考倪海厦《天纪》读盘体系的开源紫微斗数排盘引擎。** 输入出生日期、时间和地点，程序先校正真太阳时，再安十二宫、星曜与生年四化，接着展示格局和运限。天文历法、排盘规则、网页和 API 都在仓库里，可以逐段读，也可以自己跑一遍。

**不想部署？[去真一官网线上体验](https://www.zhenyi.org/)。** 想先看看开源版的界面，也可以直接打开[排盘演示](https://zhenyi-org.github.io/zhenyi-ziwei/)。

![真一紫微命盘界面，示例日期为 2000 年 8 月 16 日](docs/assets/ziwei-demo.png)

这张盘是用仓库里的网页实际排出来的。日期用了测试中的示例资料，没有放真人姓名。

## 为什么重写排盘引擎

我们希望一张盘从出生时间到星曜落宫，每一步都能找到计算依据。旧版接入过第三方排盘库，时间校正、宫位顺序和格局条件分散在不同地方，碰到边界盘不容易查。这一版把天文历法和安星规则放回自己的源码里，也把真太阳时的经度差、均时差与中国历史夏令时一起算清楚。

有些错误只有对着具体盘才会发现。比如旧版大限区间写的是虚岁，当前大限却按实岁标记，可能差一年；还有些格局把「化禄」当作星名查找，条件永远不会触发。v3 把这些地方改了，并保留了兼容旧站点的 API 字段。

## 你能用它做什么

| 能力 | 实现位置 | 说明 |
| --- | --- | --- |
| 天文历法 | `src/astro.js`、`src/calendar.js` | 儒略日、ΔT、太阳黄经、朔望、节气、农历与干支 |
| 校时 | `src/ziwei.js` | 出生地经度、均时差、中国历史夏令时、晚子时与时辰边界提示 |
| 紫微排盘 | `src/ziwei.js` | 十二宫、十四主星、辅煞杂曜、庙旺、四化、五行局、命身宫 |
| 运限与格局 | `src/analysis.js`、`src/content.js` | 大限、小限、流年/月/日，以及带成立、加分、破格条件的格局分析 |
| 网页 | `src/app.js`、`src/styles.css` | 明暗主题、宫位查看、运限切换、本地保存命例及导出数据 |
| HTTP API | `server.js` | `GET /health`、`GET|POST /generate`；保留旧接口字段并增加完整 `native` 结果 |

读盘口径参考倪海厦《天纪》，四化以生年干为本；安星采用《紫微斗数全书》的通行方法。不同流派对闰月、晚子时和杂曜有不同取法，网页和 API 提供相应设置。项目与倪海厦本人及其相关机构没有隶属关系。

## 三步运行

需要 **Node.js 18 或更新版本**。

```bash
git clone https://github.com/ZHENYI-ORG/zhenyi-ziwei.git
cd zhenyi-ziwei
npm test
npm run build
```

打开 `dist/index.html` 就能使用网页。[开源版演示](https://zhenyi-org.github.io/zhenyi-ziwei/)运行的也是这份静态页面。想直接使用真一线上产品，可以去[真一官网](https://www.zhenyi.org/)。

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

## Star History

这个项目刚开源，曲线从零开始。如果发现哪张盘排错了，带上输入资料和参考结果提个 issue，我们会照着复现。用得顺手，也欢迎点个 Star。

[![GitHub Star History](https://api.star-history.com/svg?repos=ZHENYI-ORG/zhenyi-ziwei&type=Date)](https://star-history.com/#ZHENYI-ORG/zhenyi-ziwei&Date)
