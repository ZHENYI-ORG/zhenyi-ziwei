/* ══════════════════════════════════════════════════════════════
 * 真一紫微 · 排盘 API（零依赖，Node 18+）
 * 与旧版 engine/dist/server.js 接口兼容：GET /health，POST|GET /generate
 * 旧 PHP（ZiweiService.php）无需改动即可切换到新引擎。
 * 响应保留旧字段（chart / horoscope / patterns / patternSummary / timeInfo），
 * 另附 native 字段为新引擎完整结果。
 * ══════════════════════════════════════════════════════════════ */
const http = require('node:http');
globalThis.Astro = require('./src/astro.js');
globalThis.Cal = require('./src/calendar.js');
globalThis.ZW = require('./src/ziwei.js');
globalThis.Lore = require('./src/content.js');
globalThis.Reading = require('./src/analysis.js');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const { STEMS, BRANCHES, mod } = Cal;
// 旧系统（iztro）宫名与宫位顺序：自寅宫起
const LEGACY_NAME = (n) => (n === '交友' ? '仆役' : n);
const IZTRO_ORDER = Array.from({ length: 12 }, (_, i) => mod(i + 2, 12)); // index → branch
const idxOfBranch = (b) => mod(b - 2, 12);

const num = (v) => { if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string' && v.trim() !== '') { const n = Number(v); if (Number.isFinite(n)) return n; } return undefined; };
const bool = (v, d) => (v === undefined ? d : v === true || v === 'true' || v === '1' || v === 1);

function parse(q) {
  const year = num(q.year), month = num(q.month), day = num(q.day);
  if (!year || !month || !day) throw new Error('year, month, day are required numbers.');
  const input = {
    name: typeof q.name === 'string' ? q.name : '', gender: q.gender === 'female' ? 'female' : 'male',
    calendar: q.calendar === 'lunar' ? 'lunar' : 'solar', year, month, day, isLeapMonth: bool(q.isLeapMonth, false),
    longitude: num(q.longitude) ?? 120, tz: num(q.tz) ?? 8,
    dst: q.dst === undefined ? 'auto' : bool(q.dst, false),
    trueSolar: bool(q.trueSolar, true), eot: bool(q.eot, true),
    lateZiNextDay: bool(q.lateZiNextDay, true), leapMode: q.leapMode || 'split', yearDivide: q.yearDivide === 'lichun' ? 'lichun' : 'lunar',
  };
  const hour = num(q.hour), ch = num(q.clockHour);
  const warnings = [];
  if (hour !== undefined) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 12) throw new Error('hour must be an integer branch index from 0 to 12 (12 = 晚子时).');
    Object.assign(input, { timeMode: 'branch', branch: hour });
  } else if (ch !== undefined) {
    const cm = num(q.clockMinute) ?? 0;
    if (!Number.isInteger(ch) || ch < 0 || ch > 23) throw new Error('clockHour must be an integer from 0 to 23.');
    if (!Number.isInteger(cm) || cm < 0 || cm > 59) throw new Error('clockMinute must be an integer from 0 to 59.');
    Object.assign(input, { timeMode: 'clock', hour: ch, minute: cm });
  } else {
    Object.assign(input, { timeMode: 'branch', branch: 0 });
    warnings.push('hour/clockHour was not provided; chart generated with 子时 (hour=0).');
  }
  return { input, warnings };
}

function parseTarget(q) {
  const direct = (typeof q.targetSolarDate === 'string' && q.targetSolarDate.trim()) || (typeof q.targetDate === 'string' && q.targetDate.trim()) || '';
  if (direct) {
    const m = direct.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) throw new Error('targetSolarDate must be YYYY-MM-DD.');
    const l = Cal.solarToLunar(+m[1], +m[2], +m[3]);
    return { lunar: { year: l.year, month: l.month, day: l.day }, solar: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` };
  }
  const now = new Date();
  const tl = Cal.solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const y = num(q.targetYear) ?? tl.year, mo = num(q.targetMonth) ?? 1, d = num(q.targetDay) ?? 1;
  const s = Cal.lunarToSolar(y, mo, Math.min(d, Cal.monthDays(y, mo)));
  return { lunar: { year: y, month: mo, day: d }, solar: `${s.y}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}` };
}

const legacyStar = (s) => ({ name: s.name, type: s.type === 'lu' ? 'lucky' : s.type, ...(s.hua ? { siHua: s.hua } : {}), ...(s.bright ? { brightness: ['dim', 'normal', 'bright'][ZW.brightLevel(s.bright)] || 'normal', brightnessRaw: s.bright } : {}) });

function legacyChart(c, nowAge) {
  const palaces = IZTRO_ORDER.map((b) => {
    const p = c.palaces[b];
    return {
      branch: b, stem: p.stem, name: LEGACY_NAME(p.name), stars: p.stars.map(legacyStar), daXianAge: p.daxian,
      isCurrentDaXian: nowAge >= p.daxian[0] && nowAge <= p.daxian[1], isMingGong: p.isMing, isShenGong: p.isShen,
      oppositeBranch: mod(b + 6, 12), isEmpty: p.isEmpty,
      ...(p.isEmpty ? { borrowedFromBranch: p.borrow.branch, borrowedFromName: LEGACY_NAME(p.borrow.name), borrowedStars: p.borrow.stars } : {}),
    };
  });
  const daXians = c.daxian.map((d) => ({ startAge: d.start, endAge: d.end, palaceBranch: d.branch, palaceName: LEGACY_NAME(d.natalName) }));
  return {
    birthInfo: { year: c.input.year, month: c.input.month, day: c.input.day, hour: c.hour, gender: c.input.gender, name: c.input.name || undefined, longitude: c.input.longitude },
    lunarInfo: { lunarYear: c.lunarYear, lunarMonth: c.lunar.month, lunarDay: c.lunar.day, yearStem: c.yStem, yearBranch: c.yBranch, isLeapMonth: c.lunar.isLeap },
    mingGongBranch: c.ming, shenGongBranch: c.shen, wuxingJu: c.ju, wuxingJuName: c.juName, ziweiPos: c.ziweiPos,
    palaces, daXians, currentAge: nowAge, currentDaXianIndex: daXians.findIndex((d) => nowAge >= d.startAge && nowAge <= d.endAge),
    solarPillars: `${c.bazi.year} ${c.bazi.month} ${c.bazi.day} ${c.bazi.hour}`,
    lunarPillars: `${c.lunarPillars.year} ${c.lunarPillars.month} ${c.lunarPillars.day} ${c.lunarPillars.hour}`,
  };
}

function legacyHoroscope(c, h, target) {
  const item = (L, scope) => {
    if (!L) return null;
    const stars = IZTRO_ORDER.map((b) => (L.stars || []).filter((s) => s.branch === b).map((s) => ({ name: s.name, type: /羊|陀/.test(s.base) ? 'sha' : 'lucky', scope })));
    return { scope, index: idxOfBranch(L.branch), name: L.label, heavenlyStem: STEMS[L.stem], earthlyBranch: BRANCHES[L.branch], palaceNames: IZTRO_ORDER.map((b) => LEGACY_NAME(L.names[b])), mutagen: L.hua.map((x) => x.star), stars };
  };
  return { solarDate: target.solar, lunarDate: `${target.lunar.year}年${Cal.MONTH_CN[target.lunar.month - 1]}月${Cal.DAY_CN(target.lunar.day)}`, decadal: item(h.decade, 'decadal'), yearly: item(h.year, 'yearly'), monthly: item(h.month, 'monthly'), daily: item(h.day, 'daily') };
}

function generate(q) {
  const { input, warnings } = parse(q);
  const target = parseTarget(q);
  const c = ZW.generate(input);
  const nowAge = target.lunar.year - c.lunarYear + 1;
  const h = ZW.horoscope(c, { year: target.lunar.year, month: target.lunar.month, day: target.lunar.day });
  const patterns = Reading.detectPatterns(c).map((p) => ({ name: p.name, level: p.level, description: p.desc, palaces: [...new Set(p.palaces)].map(LEGACY_NAME), conditions: { required: p.required, bonus: p.bonus, breaking: p.breaking }, source: p.src }));
  const t = c.time;
  const fmt = (o, min) => `${o.y}.${String(o.m).padStart(2, '0')}.${String(o.d).padStart(2, '0')} ${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  return {
    success: true,
    warnings: [...warnings, ...c.warnings],
    timeInfo: {
      source: t.mode === 'clock' ? 'trueSolar' : 'directHour', hourBranch: c.hour, hourBranchName: ZW.HOURS[c.hour] + '时', longitude: input.longitude,
      ...(t.mode === 'clock' ? { clockTime: fmt(t.clock, t.clock.hh * 60 + t.clock.mi), trueSolarTime: fmt(t.solar, t.solar.minutes), trueSolarOffsetMinutes: +(t.lonMin + t.eotMin).toFixed(2), longitudeOffsetMinutes: +t.lonMin.toFixed(2), equationOfTimeMinutes: +t.eotMin.toFixed(2), dstApplied: t.dstApplied, boundaryMinutes: t.boundaryMinutes } : {}),
    },
    targetSolarDate: target.solar,
    chart: legacyChart(c, nowAge),
    horoscope: legacyHoroscope(c, h, target),
    patterns,
    patternSummary: {
      total: patterns.length,
      ...Object.fromEntries(['excellent', 'good', 'neutral', 'caution'].map((l) => [l, patterns.filter((p) => p.level === l).length])),
      top: patterns.filter((p) => p.level === 'excellent' || p.level === 'good').slice(0, 5).map((p) => p.name),
      warnings: patterns.filter((p) => p.level === 'caution').slice(0, 5).map((p) => p.name),
    },
    patternRuleVersion: 'patterns-v3',
    native: { ...c, horoscope: h },
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' });
  res.end(status === 204 ? '' : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { success: true, service: 'zhenyi-ziwei', engine: 'native-v3' });
  if (url.pathname === '/generate' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let q = Object.fromEntries(url.searchParams.entries());
      if (req.method === 'POST') {
        const chunks = []; let size = 0;
        for await (const ch of req) { size += ch.length; if (size > 64 * 1024) throw new Error('Request body too large.'); chunks.push(ch); }
        if (chunks.length) q = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      }
      return send(res, 200, generate(q));
    } catch (e) { return send(res, 400, { success: false, error: e instanceof Error ? e.message : 'Bad request.' }); }
  }
  send(res, 404, { success: false, error: 'Not found. Use GET /health or POST /generate.' });
});

if (require.main === module) server.listen(PORT, HOST, () => console.log(`zhenyi-ziwei listening on http://${HOST}:${PORT}`));
module.exports = { generate, server };
