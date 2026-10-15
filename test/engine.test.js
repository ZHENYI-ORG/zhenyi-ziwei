/* 引擎回归测试：node test/engine.test.js */
const assert = require('node:assert/strict');
globalThis.Astro = require('../src/astro.js');
globalThis.Cal = require('../src/calendar.js');
globalThis.ZW = require('../src/ziwei.js');
globalThis.Lore = require('../src/content.js');
globalThis.Reading = require('../src/analysis.js');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✓', name); };

const ut = (J) => { const r = Astro.fromJd(J); const d = Math.floor(r.d), f = (r.d - d) * 24, h = Math.floor(f); return `${r.y}-${r.m}-${d} ${h}:${String(Math.round((f - h) * 60)).padStart(2, '0')}`; };

ok('Meeus 例 49.a：1977-02 朔 JDE 2443192.65118', () => {
  const jde = Astro.newMoonUT(-283) + Astro.deltaT(1977.1) / 86400;
  assert.ok(Math.abs(jde - 2443192.65118) < 2e-5);
});
ok('Meeus 例 28.a：均时差 +13.71 分', () => {
  assert.ok(Math.abs(Astro.equationOfTime(2448908.5 - Astro.deltaT(1992.8) / 86400) - 13.711) < 0.02);
});
ok('节气时刻（UT，误差 ≤1 分钟）', () => {
  assert.equal(ut(Astro.termOfYear(2000, 5)), '2000-3-20 7:35');
  assert.equal(ut(Astro.termOfYear(2024, 5)), '2024-3-20 3:06');
  assert.equal(ut(Astro.termOfYear(2025, 2)), '2025-2-3 14:10');
});
ok('春节日期', () => {
  const cny = { 1900: '1-31', 1950: '2-17', 1984: '2-2', 1990: '1-27', 2000: '2-5', 2020: '1-25', 2023: '1-22', 2024: '2-10', 2025: '1-29', 2026: '2-17', 2033: '1-31' };
  for (const [y, md] of Object.entries(cny)) { const s = Cal.lunarToSolar(+y, 1, 1); assert.equal(`${s.m}-${s.d}`, md, y); }
});
ok('闰月', () => {
  const leap = { 1984: 10, 1987: 6, 1990: 5, 1995: 8, 2001: 4, 2004: 2, 2006: 7, 2009: 5, 2012: 4, 2014: 9, 2017: 6, 2020: 4, 2023: 2, 2025: 6, 2028: 5, 2031: 3, 2033: 11 };
  for (const [y, m] of Object.entries(leap)) assert.equal(Cal.leapMonth(+y), m, y);
});
ok('公历 ↔ 农历往返 1900–2100', () => {
  for (let j = Cal.jdn(1900, 1, 31); j < Cal.jdn(2100, 12, 31); j += 17) {
    const s = Cal.fromJdn(j), l = Cal.solarToLunar(s.y, s.m, s.d), b = Cal.lunarToSolar(l.year, l.month, l.day, l.isLeap);
    assert.deepEqual([b.y, b.m, b.d], [s.y, s.m, s.d]);
  }
});
ok('对照 iztro 文档示例：2000-8-16 寅时 女', () => {
  const c = ZW.generate({ calendar: 'solar', year: 2000, month: 8, day: 16, timeMode: 'branch', branch: 2, gender: 'female' });
  assert.equal(Cal.BRANCHES[c.ming], '午'); assert.equal(Cal.BRANCHES[c.shen], '戌');
  assert.equal(c.juName, '木三局'); assert.equal(c.mingZhu, '破军'); assert.equal(c.shenZhu, '文昌');
  assert.equal(`${c.bazi.year} ${c.bazi.month} ${c.bazi.day} ${c.bazi.hour}`, '庚辰 甲申 丙午 庚寅');
  assert.equal(`${c.lunar.month}-${c.lunar.day}`, '7-17');
});
ok('紫微星位置表（五局 × 三十日）', () => {
  const T = { 2: '丑寅寅卯卯辰辰巳巳午午未未申申酉酉戌戌亥亥子子丑丑寅寅卯卯辰', 3: '辰丑寅巳寅卯午卯辰未辰巳申巳午酉午未戌未申亥申酉子酉戌丑戌亥', 4: '亥辰丑寅子巳寅卯丑午卯辰寅未辰巳卯申巳午辰酉午未巳戌未申午亥' };
  for (const [ju, s] of Object.entries(T)) for (let d = 1; d <= 30; d++) {
    let x = 0; while ((d + x) % ju !== 0) x++;
    let z = 2 + (d + x) / ju - 1; z += x % 2 ? -x : x;
    assert.equal(Cal.BRANCHES[Cal.mod(z, 12)], s[d - 1], `${ju}局 ${d}日`);
  }
});
ok('真太阳时：乌鲁木齐 00:20 → 前一日亥时', () => {
  const c = ZW.generate({ calendar: 'solar', year: 2001, month: 3, day: 10, timeMode: 'clock', hour: 0, minute: 20, longitude: 87.62, tz: 8, gender: 'male' });
  assert.equal(c.time.solar.d, 9); assert.equal(ZW.HOURS[c.hour], '亥');
});
ok('夏令时自动识别', () => {
  assert.equal(ZW.chinaDST(1990, 5, 15), true); assert.equal(ZW.chinaDST(1990, 10, 1), false); assert.equal(ZW.chinaDST(1992, 6, 1), false);
});
ok('随机 2000 盘：十四主星各一、无异常', () => {
  for (let i = 0; i < 2000; i++) {
    const y = 1901 + Math.floor(Math.random() * 199);
    const c = ZW.generate({ calendar: 'solar', year: y, month: 1 + (i % 12), day: 1 + (i % 28), timeMode: 'clock', hour: i % 24, minute: (i * 7) % 60, longitude: 75 + (i % 60), tz: 8, gender: i % 2 ? 'male' : 'female' });
    const all = c.palaces.flatMap((p) => p.stars.map((s) => s.name));
    for (const m of ZW.MAJOR) assert.equal(all.filter((x) => x === m).length, 1);
    const ps = Reading.detectPatterns(c);
    for (let b = 0; b < 12; b++) Reading.palaceDetail(c, b);
    const h = ZW.horoscope(c, { year: c.lunarYear + 40, month: 6, day: 9 });
    Reading.decadeReading(c, h); Reading.yearReading(c, h); Reading.health(c); Reading.chartText(c, h, ps);
  }
});
console.log(`\n${n} 组测试全部通过`);
