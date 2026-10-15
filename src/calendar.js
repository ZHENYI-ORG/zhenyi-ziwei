/* ══════════════════════════════════════════════════════════════
 * Cal · 历法层
 * 农历表 1900–2100：由本系统天文内核（VSOP87 + Meeus 朔望）按现行
 * 《农历的编算和颁行》规则推算生成（1929 年前用北京地方平时），
 * 与通行历表逐年核对，1906 年按通行历表对齐。
 * ══════════════════════════════════════════════════════════════ */
const Cal = (() => {
  const LUNAR_INFO = [0x4bd8,0x4ae0,0xa570,0x54d5,0xd260,0xd950,0x16554,0x56a0,0x9ad0,0x55d2,0x4ae0,0xa5b6,0xa4d0,0xd250,0x1d255,0xb540,0xd6a0,0xada2,0x95b0,0x14977,0x4970,0xa4b0,0xb4b5,0x6a50,0x6d40,0x1ab54,0x2b60,0x9570,0x52f2,0x4970,0x6566,0xd4a0,0xea50,0x16a95,0x5ad0,0x2b60,0x186e3,0x92e0,0x1c8d7,0xc950,0xd4a0,0x1d8a6,0xb550,0x56a0,0x1a5b4,0x25d0,0x92d0,0xd2b2,0xa950,0xb557,0x6ca0,0xb550,0x15355,0x4da0,0xa5b0,0x14573,0x52b0,0xa9a8,0xe950,0x6aa0,0xaea6,0xab50,0x4b60,0xaae4,0xa570,0x5260,0xf263,0xd950,0x5b57,0x56a0,0x96d0,0x4dd5,0x4ad0,0xa4d0,0xd4d4,0xd250,0xd558,0xb540,0xb6a0,0x195a6,0x95b0,0x49b0,0xa974,0xa4b0,0xb27a,0x6a50,0x6d40,0xaf46,0xab60,0x9570,0x4af5,0x4970,0x64b0,0x74a3,0xea50,0x6b58,0x5ac0,0xab60,0x96d5,0x92e0,0xc960,0xd954,0xd4a0,0xda50,0x7552,0x56a0,0xabb7,0x25d0,0x92d0,0xcab5,0xa950,0xb4a0,0xbaa4,0xad50,0x55d9,0x4ba0,0xa5b0,0x15176,0x52b0,0xa930,0x7954,0x6aa0,0xad50,0x5b52,0x4b60,0xa6e6,0xa4e0,0xd260,0xea65,0xd530,0x5aa0,0x76a3,0x96d0,0x4afb,0x4ad0,0xa4d0,0x1d0b6,0xd250,0xd520,0xdd45,0xb5a0,0x56d0,0x55b2,0x49b0,0xa577,0xa4b0,0xaa50,0x1b255,0x6d20,0xada0,0x14b63,0x9370,0x49f8,0x4970,0x64b0,0x168a6,0xea50,0x6aa0,0x1a6c4,0xaae0,0x92e0,0xd2e3,0xc960,0xd557,0xd4a0,0xda50,0x5d55,0x56a0,0xa6d0,0x55d4,0x52d0,0xa9b8,0xa950,0xb4a0,0xb6a6,0xad50,0x55a0,0xaba4,0xa5b0,0x52b0,0xb273,0x6930,0x7337,0x6aa0,0xad50,0x14b55,0x4b60,0xa570,0x54e4,0xd160,0xe968,0xd520,0xdaa0,0x16aa6,0x56d0,0x4ae0,0xa9d4,0xa2d0,0xd150,0xf252,0xd520];
  const BASE_JDN = 2415051; // 1900-01-31 = 庚子年正月初一
  const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  const ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');
  const MONTH_CN = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  const DAY_CN = (d) => d === 10 ? '初十' : d === 20 ? '二十' : d === 30 ? '三十'
    : ['初','十','廿','三'][Math.floor(d / 10)] + '一二三四五六七八九十'[(d - 1) % 10];
  const mod = (a, n) => ((a % n) + n) % n;

  const info = (y) => LUNAR_INFO[y - 1900];
  const leapMonth = (y) => info(y) & 0xf;
  const leapDays = (y) => leapMonth(y) ? ((info(y) & 0x10000) ? 30 : 29) : 0;
  const monthDays = (y, m) => (info(y) & (0x8000 >> (m - 1))) ? 30 : 29;
  function yearDays(y) { let s = 0; for (let m = 1; m <= 12; m++) s += monthDays(y, m); return s + leapDays(y); }

  /** 公历日期 → 整数儒略日（JDN） */
  const jdn = (y, m, d) => Math.round(Astro.jd(y, m, d) + 0.5);
  function fromJdn(n) { const r = Astro.fromJd(n - 0.5); return { y: r.y, m: r.m, d: Math.round(r.d) }; }

  function isValidSolar(y, m, d) {
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
    const r = fromJdn(jdn(y, m, d));
    return r.y === y && r.m === m && r.d === d && jdn(y, m, d) >= BASE_JDN;
  }

  /** 公历 → 农历 */
  function solarToLunar(y, m, d) {
    let off = jdn(y, m, d) - BASE_JDN;
    if (off < 0) throw new RangeError('日期早于 1900-01-31，超出历表范围');
    let ly = 1900;
    for (; ly <= 2100; ly++) { const n = yearDays(ly); if (off < n) break; off -= n; }
    if (ly > 2100) throw new RangeError('日期超出历表范围（至 2100 年）');
    const leap = leapMonth(ly);
    let lm = 1, isLeap = false;
    for (;;) {
      const n = isLeap ? leapDays(ly) : monthDays(ly, lm);
      if (off < n) break;
      off -= n;
      if (!isLeap && leap === lm) isLeap = true; else { isLeap = false; lm++; }
    }
    return { year: ly, month: lm, day: off + 1, isLeap };
  }

  /** 农历 → 公历 */
  function lunarToSolar(ly, lm, ld, isLeap = false) {
    if (ly < 1900 || ly > 2100) throw new RangeError('农历年超出范围（1900–2100）');
    if (isLeap && leapMonth(ly) !== lm) throw new RangeError(`${ly} 年没有闰${MONTH_CN[lm - 1]}月`);
    const maxD = isLeap ? leapDays(ly) : monthDays(ly, lm);
    if (ld < 1 || ld > maxD) throw new RangeError(`该月只有 ${maxD} 天`);
    let off = 0;
    for (let y = 1900; y < ly; y++) off += yearDays(y);
    const leap = leapMonth(ly);
    for (let m = 1; m < lm; m++) { off += monthDays(ly, m); if (leap === m) off += leapDays(ly); }
    if (isLeap) off += monthDays(ly, lm);
    return fromJdn(BASE_JDN + off + ld - 1);
  }

  /* ── 干支 ── */
  const gz = (i) => STEMS[mod(i, 10)] + BRANCHES[mod(i, 12)];
  const yearGzIndex = (y) => mod(y - 4, 60);
  const dayGzIndex = (n) => mod(n + 49, 60);          // n = JDN
  const yinStem = (yearStem) => mod((yearStem % 5) * 2 + 2, 10); // 五虎遁：寅月/寅宫天干
  const ziStem = (dayStem) => mod((dayStem % 5) * 2, 10);         // 五鼠遁：子时天干

  /**
   * 节气四柱（八字）
   * @param jUT 出生瞬间 UT 儒略日
   * @param dayJdn 日柱所用日期（已按子时换日规则处理）
   * @param hourBranch 时支
   */
  function baziPillars(jUT, dayJdn, hourBranch) {
    const g = Astro.fromJd(jUT + 8 / 24);
    let y = g.y;
    if (jUT < Astro.termOfYear(y, 2)) y -= 1;                    // 立春换年
    const yStem = mod(y - 4, 10), yBranch = mod(y - 4, 12);
    // 找最近的「节」（小寒0 立春2 … 大雪22，偶数序）
    let best = null;
    for (const yy of [g.y - 1, g.y]) for (let k = 0; k < 24; k += 2) {
      const t = Astro.termOfYear(yy, k);
      if (t <= jUT && (!best || t > best.t)) best = { t, k };
    }
    const mBranch = mod(best.k / 2 + 1, 12);
    const mStem = mod(yinStem(yStem) + mod(mBranch - 2, 12), 10);
    const dIdx = dayGzIndex(dayJdn);
    const hStem = mod(ziStem(dIdx % 10) + hourBranch, 10);
    return {
      year: STEMS[yStem] + BRANCHES[yBranch],
      month: STEMS[mStem] + BRANCHES[mBranch],
      day: gz(dIdx),
      hour: STEMS[hStem] + BRANCHES[hourBranch],
      jieqi: { name: Astro.TERM_NAMES[best.k], jd: best.t },
    };
  }

  /** 当前所在节气区间（用于展示） */
  function termBefore(jUT) {
    const g = Astro.fromJd(jUT + 8 / 24);
    let best = null;
    for (const yy of [g.y - 1, g.y]) for (let k = 0; k < 24; k++) {
      const t = Astro.termOfYear(yy, k);
      if (t <= jUT && (!best || t > best.t)) best = { t, k, name: Astro.TERM_NAMES[k] };
    }
    return best;
  }

  const lunarText = (l) => `${l.isLeap ? '闰' : ''}${MONTH_CN[l.month - 1]}月${DAY_CN(l.day)}`;

  return { STEMS, BRANCHES, ZODIAC, MONTH_CN, DAY_CN, mod, leapMonth, leapDays, monthDays, yearDays, jdn, fromJdn, isValidSolar, solarToLunar, lunarToSolar, gz, yearGzIndex, dayGzIndex, yinStem, ziStem, baziPillars, termBefore, lunarText };
})();

if (typeof module !== 'undefined') module.exports = Cal;
