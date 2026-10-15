# ZHENYI Ziwei

[简体中文](README.md) · [Live charting demo](https://zhenyi-org.github.io/zhenyi-ziwei/) · [API reference](docs/API.md) · [Contributing](CONTRIBUTING.md)

**An open-source Zi Wei Dou Shu charting engine you can inspect, test, and self-host.** The repository contains its astronomical calendar, true-solar-time correction, star placement, transformations, patterns, fortune cycles, static web interface, and Node.js API. It has no third-party npm runtime dependencies.

![Screenshot of the ZHENYI Ziwei charting interface](docs/assets/ziwei-demo.png)

| Component | What it does |
| --- | --- |
| Calendar | Solar terms, new moons, Chinese lunar dates, and sexagenary pillars |
| Charting | Twelve palaces, major and auxiliary stars, brightness, four transformations, and body/life palaces |
| Time correction | Longitude, equation of time, historical Chinese daylight saving time, and late-Zi options |
| Interpretation | Rule-based pattern detection with required, bonus, and breaking conditions |
| Delivery | A single HTML file and a compatible `GET|POST /generate` HTTP API |

Star placement follows common methods documented in *Zi Wei Dou Shu Quan Shu*. The interpretive approach refers to the *Tian Ji* teaching tradition. Schools differ on several rules; options and known boundaries are documented in [BOUNDARIES.md](docs/BOUNDARIES.md). This project is not affiliated with Ni Haixia or related organizations.

## Run locally

Requires Node.js 18 or later.

```bash
git clone https://github.com/ZHENYI-ORG/zhenyi-ziwei.git
cd zhenyi-ziwei
npm test
npm run build
npm start
```

Open `dist/index.html` for the standalone interface. The API listens on `127.0.0.1:3001` by default; set `HOST` and `PORT` to change it. See the [API reference](docs/API.md) for request and response fields.

The engine has automated checks for calendar dates, astronomical examples, a documented sample chart, time correction, and 2,000 generated charts. CI runs tests and verifies the generated HTML on every push and pull request.

The repository includes the engine, interface, API, interpretation rules, and tests. The ordinary browser interface can export chart data as JSON; exporting PNG loads `html2canvas` from a CDN on demand. **AI reading currently requires a host page that provides `window.claude` and is hidden on ordinary static hosting.** No model weights or standalone AI service are included.

Code is available under the [MIT License](LICENSE). Contributions with reproducible charts and boundary cases are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
