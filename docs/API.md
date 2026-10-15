# 排盘 API

启动 `npm start` 后，服务默认监听 `http://127.0.0.1:3001`。可通过 `HOST` 和 `PORT` 环境变量修改。API 返回 JSON；普通部署请在反向代理层配置 HTTPS、访问控制和限流。

## 健康检查

`GET /health` 返回 `success`、`service` 和 `engine`。

## 起盘

`POST /generate` 接受 JSON；`GET /generate` 接受同名查询参数。推荐使用 POST。

```json
{
  "year": 2000,
  "month": 8,
  "day": 16,
  "clockHour": 12,
  "clockMinute": 0,
  "longitude": 120,
  "gender": "female",
  "targetSolarDate": "2026-10-15"
}
```

`year`、`month`、`day` 为必填。默认 `calendar: "solar"`，`gender: "male"`，东经 120°，东八区。如果未传 `hour` 或 `clockHour`，服务会按子时起盘并在 `warnings` 中提示；生产接入建议要求用户提供时辰。

| 参数 | 说明 |
| --- | --- |
| `hour` | 地支序号 0–11（子到亥），12 为晚子时；传入后优先于钟点 |
| `clockHour`、`clockMinute` | 24 小时制钟点；分钟默认 0 |
| `calendar` | `solar` 或 `lunar`；农历闰月另设 `isLeapMonth: true` |
| `longitude`、`tz` | 出生地经度与时区，默认 120、8 |
| `dst` | `true`、`false`，默认按中国 1986—1991 年规则自动判断 |
| `trueSolar`、`eot` | 真太阳时与均时差开关，默认开启 |
| `lateZiNextDay` | 晚子时是否按次日，默认开启 |
| `leapMode` | 闰月取法：`split`、`current`、`next` |
| `yearDivide` | 年界：`lunar` 或 `lichun` |
| `targetSolarDate` | 运限目标日期，格式 `YYYY-MM-DD`；也可用 `targetYear`、`targetMonth`、`targetDay` |

成功响应含 `success: true`、`warnings`、`chart`、`horoscope`、`patterns`、`patternSummary`、`timeInfo`、`native`。旧站点可继续读取前五个数据字段；`native` 包含新引擎的完整命盘与运限。参数错误返回 HTTP 400 和 `{ "success": false, "error": "..." }`。

## 旧版接口迁移

服务保留 `GET /health` 和 `POST|GET /generate`，兼容旧版 `engine/dist/server.js` 的 `chart`、`horoscope`、`patterns`、`patternSummary`、`timeInfo` 字段。旧版宫位从寅宫起，交友宫仍以「仆役宫」输出。新字段 `chart.solarPillars`、`chart.lunarPillars`、`timeInfo.equationOfTimeMinutes`、`timeInfo.dstApplied`、`timeInfo.boundaryMinutes` 和 `native` 可按需使用。

默认启用均时差和历史夏令时判断后，临近时辰交界的盘可能与旧引擎不同。如需复现旧时间口径，请在请求中传入 `"eot": false, "dst": false`，并核对其他规则设置。
