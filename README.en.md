# ZHENYI Ziwei

### From birth details to a complete Zi Wei Dou Shu chart

[简体中文](README.md) · [ZHENYI website](https://www.zhenyi.org/) · [API reference](docs/API.md) · [Contributing](CONTRIBUTING.md)

**ZHENYI Ziwei is an open-source Zi Wei Dou Shu charting engine.** Give it a birth date, time, and location. It calculates the calendar and true solar time, places the twelve palaces, stars, and four transformations, then derives patterns and fortune cycles. Its reading approach draws on Ni Haixia's *Tian Ji*. The charting rules, interface, and API are all available in this repository.

Use [www.zhenyi.org](https://www.zhenyi.org/) to try ZHENYI online, or use this repository to run and extend the engine yourself.

![ZHENYI Ziwei chart interface](docs/assets/ziwei-demo.png)

| Jan 1900–2100 | Zero runtime dependencies | Single-file web app + HTTP API |
| :---: | :---: | :---: |
| Supported from January 31, 1900 | Runs on Node.js 18+ | Use it in a browser or another product |

## What happens between input and chart

**Calculate the time.** Astronomical and calendar modules derive lunar dates, solar terms, and sexagenary pillars. Longitude, the equation of time, and historical Chinese daylight saving time feed into true solar time correction. Late-Zi and leap-month rules are configurable.

**Build the chart.** The engine places the life and body palaces, twelve palaces, fourteen major stars, auxiliary stars, brightness, and birth-year transformations. It then adds major and minor fortune cycles and annual, monthly, and daily views.

**Read the patterns.** Each pattern checks its required, bonus, and breaking conditions. The interface includes overview, palace, transformation, pattern, and fortune-cycle views, plus local chart storage and data export.

| Core module | Source |
| --- | --- |
| Astronomy and calendar | `src/astro.js`, `src/calendar.js` |
| Time correction and charting | `src/ziwei.js` |
| Patterns and rule-based readings | `src/analysis.js`, `src/content.js` |
| Web interface | `src/app.js`, `src/styles.css` |
| HTTP API | `server.js` |

The engine uses birth-year-stem transformations and common star-placement methods documented in *Zi Wei Dou Shu Quan Shu*. The reading approach refers to *Tian Ji*. This project is not affiliated with Ni Haixia or related organizations.

## Run it

```bash
git clone https://github.com/ZHENYI-ORG/zhenyi-ziwei.git
cd zhenyi-ziwei
npm run build
```

Open `dist/index.html` in a browser. No npm dependencies are required.

For an API, run `npm start`. It listens on `127.0.0.1:3001` by default:

```bash
curl http://127.0.0.1:3001/generate \
  -H "Content-Type: application/json" \
  -d '{"year":2000,"month":8,"day":16,"clockHour":12,"clockMinute":0,"longitude":120,"gender":"female"}'
```

The response includes the chart, fortune cycles, patterns, and the complete `native` result. See the [API reference](docs/API.md) for fields and integration details.

## Build on top of it

The repository includes the engine, interface, pattern rules, HTTP API, and tests. Use the standalone HTML file or call `/generate` from your own service. The [MIT License](LICENSE) allows modification and redistribution.

The interface includes rule-based readings. **AI readings require a host page that provides `window.claude`.** A regular static deployment does not automatically connect to an AI service, and model weights are not included.

Eleven engine checks and API checks run in CI. Chart tests also generate 2,000 random charts. If you find a chart discrepancy, bring the input, expected result, and school-specific rule to an [Issue](https://github.com/ZHENYI-ORG/zhenyi-ziwei/issues) or [PR](CONTRIBUTING.md).

## Star History

If this engine helps your work, give it a Star so more Zi Wei Dou Shu developers can find it.

[![GitHub Star History](https://api.star-history.com/svg?repos=ZHENYI-ORG/zhenyi-ziwei&type=Date)](https://star-history.com/#ZHENYI-ORG/zhenyi-ziwei&Date)
