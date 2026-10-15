/* ══════════════════════════════════════════════════════════════
 * ZW · 紫微斗数排盘引擎（自研，零依赖）
 * 安星依《紫微斗数全书》通行法；四化以生年干为本（倪师体系：四化固定）
 * ══════════════════════════════════════════════════════════════ */
const ZW = (() => {
  const { STEMS, BRANCHES, mod } = Cal;
  const PALACES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
  const SHORT = ['命', '兄', '夫', '子', '财', '疾', '迁', '友', '官', '田', '福', '父'];
  const HOURS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const HOUR_RANGE = ['23–01', '01–03', '03–05', '05–07', '07–09', '09–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23'];

  const MAJOR = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
  const LUCKY6 = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺'];
  const SHA6 = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
  /** 倪师精简盘默认显示的杂曜 */
  const CORE_MINOR = ['红鸾', '天喜', '天刑', '天姚'];

  // 四化表（年干 → 禄权科忌），与原系统一致
  const SIHUA = [
    ['廉贞', '破军', '武曲', '太阳'], ['天机', '天梁', '紫微', '太阴'], ['天同', '天机', '文昌', '廉贞'],
    ['太阴', '天同', '天机', '巨门'], ['贪狼', '太阴', '右弼', '天机'], ['武曲', '贪狼', '天梁', '文曲'],
    ['太阳', '武曲', '太阴', '天同'], ['巨门', '太阳', '文曲', '文昌'], ['天梁', '紫微', '左辅', '武曲'],
    ['破军', '巨门', '太阴', '贪狼'],
  ];
  const HUA = ['禄', '权', '科', '忌'];

  const LUCUN = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const KUI = [1, 0, 11, 11, 1, 0, 1, 6, 3, 3];
  const YUE = [7, 8, 9, 9, 7, 8, 7, 2, 5, 5];
  const TIANGUAN = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6];
  const TIANFU_S = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5];
  const FLOW_CHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
  const FLOW_QU = [9, 8, 6, 5, 6, 5, 3, 2, 0, 11];
  const TIANMA = (b) => [2, 11, 8, 5][b % 4];
  const SANHE = (b) => b % 4; // 0 申子辰 1 巳酉丑 2 寅午戌 3 亥卯未
  const NAYIN = '海中金炉中火大林木路旁土剑锋金山头火涧下水城头土白蜡金杨柳木泉中水屋上土霹雳火松柏木长流水沙中金山下火平地木壁上土金箔金覆灯火天河水大驿土钗钏金桑柘木大溪水沙中土天上火石榴木大海水';
  const JU_BY_EL = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };
  const JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  const MING_ZHU = ['贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军', '武曲', '廉贞', '文曲', '禄存', '巨门'];
  const SHEN_ZHU = ['火星', '天相', '天梁', '天同', '文昌', '天机', '火星', '天相', '天梁', '天同', '文昌', '天机'];
  const CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  const BOSHI = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府'];
  const SUIQIAN = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符'];
  const JIANGQIAN = ['将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞', '灾煞', '天煞', '指背', '咸池', '月煞', '亡神'];

  /* ── 庙旺利陷：原系统（文墨）表优先，缺格以全书通行表补 ── */
  const B_WENMO = {
    八座: { 0: '陷', 1: '庙', 2: '庙', 3: '平', 4: '旺', 5: '庙', 6: '旺', 7: '平', 8: '庙', 9: '庙', 10: '平', 11: '庙' },
    地劫: { 0: '陷', 1: '陷', 2: '平', 3: '平', 4: '陷', 5: '闲', 6: '庙', 7: '平', 8: '庙', 9: '平', 10: '平', 11: '旺' },
    地空: { 0: '平', 1: '陷', 2: '陷', 3: '平', 4: '陷', 5: '庙', 6: '庙', 7: '平', 8: '庙', 9: '庙', 10: '陷', 11: '陷' },
    恩光: { 2: '平', 3: '庙', 4: '庙', 5: '平', 6: '庙', 7: '旺', 8: '平', 9: '陷', 10: '庙' },
    凤阁: { 6: '平', 7: '陷', 8: '闲', 9: '庙' }, 孤辰: { 2: '平', 5: '陷' }, 寡宿: { 1: '平', 10: '陷' },
    红鸾: { 0: '庙', 1: '陷', 2: '旺', 11: '庙' }, 华盖: { 1: '陷', 4: '庙', 7: '陷', 10: '平' },
    火星: { 0: '陷', 1: '平', 2: '庙', 3: '旺', 4: '陷', 5: '平', 6: '庙', 7: '旺', 8: '陷', 9: '平', 10: '庙', 11: '旺' },
    巨门: { 0: '旺', 1: '陷', 2: '庙', 3: '旺', 4: '陷', 5: '庙', 6: '旺', 9: '旺', 10: '陷', 11: '庙' },
    廉贞: { 0: '平', 1: '旺', 2: '庙', 5: '陷', 6: '平', 7: '庙', 8: '庙', 9: '平', 10: '旺', 11: '陷' },
    铃星: { 0: '陷', 1: '平', 2: '庙', 3: '旺', 4: '陷', 5: '平', 6: '庙', 7: '旺', 8: '陷', 9: '平', 10: '庙', 11: '旺' },
    龙池: { 5: '陷', 6: '闲', 7: '庙', 8: '平' }, 禄存: { 6: '旺', 8: '庙', 9: '旺', 11: '庙' },
    年解: { 6: '庙', 7: '平', 8: '闲', 9: '旺' },
    破军: { 0: '庙', 1: '庙', 4: '旺', 5: '平', 6: '庙', 7: '庙', 8: '陷', 9: '陷', 10: '旺', 11: '平' },
    破碎: { 1: '陷', 5: '陷', 9: '平' },
    七杀: { 0: '旺', 1: '旺', 2: '庙', 3: '陷', 4: '庙', 5: '平', 6: '旺', 7: '旺', 8: '庙', 9: '平' },
    擎羊: { 0: '陷', 7: '庙', 9: '陷', 10: '庙' },
    三台: { 0: '平', 1: '庙', 2: '平', 3: '陷', 4: '庙', 5: '平', 6: '旺', 7: '庙', 8: '旺', 9: '庙', 10: '旺', 11: '平' },
    太阳: { 0: '陷', 1: '陷', 2: '旺', 3: '庙', 4: '旺', 5: '旺', 6: '庙', 7: '旺', 10: '陷', 11: '陷' },
    太阴: { 0: '庙', 1: '庙', 2: '陷', 3: '陷', 4: '陷', 7: '陷', 8: '旺', 9: '旺', 10: '庙', 11: '庙' },
    贪狼: { 0: '旺', 1: '庙', 2: '平', 3: '旺', 4: '庙', 5: '陷', 8: '平', 9: '旺', 10: '庙', 11: '陷' },
    天才: { 0: '旺', 6: '旺', 7: '平', 8: '庙' }, 天德: { 0: '庙', 1: '庙', 10: '庙', 11: '平' },
    天福: { 2: '旺', 5: '旺', 6: '平' },
    天府: { 0: '旺', 1: '庙', 2: '庙', 3: '平', 6: '旺', 7: '庙', 8: '旺', 9: '平', 10: '庙', 11: '旺' },
    天官: { 9: '平', 10: '平', 11: '旺' },
    天贵: { 0: '庙', 1: '旺', 2: '平', 3: '旺', 4: '旺', 5: '平', 6: '庙', 8: '陷', 9: '庙', 10: '旺', 11: '平' },
    天机: { 0: '庙', 1: '陷', 2: '旺', 3: '旺', 4: '旺', 5: '平', 6: '庙', 7: '陷', 8: '旺', 9: '旺' },
    天空: { 2: '陷', 3: '平', 4: '庙', 5: '庙' }, 天哭: { 2: '平', 3: '庙', 4: '平', 5: '闲' },
    天魁: { 0: '庙', 1: '旺', 2: '庙', 3: '庙' },
    天梁: { 0: '庙', 1: '旺', 2: '庙', 3: '庙', 4: '旺', 5: '陷', 6: '庙', 7: '旺', 8: '陷', 11: '陷' },
    天马: { 2: '旺', 5: '平', 8: '旺', 11: '平' }, 天伤: { 3: '陷', 9: '平', 10: '平', 11: '旺' },
    天使: { 0: '陷', 1: '陷', 5: '平', 11: '旺' },
    天寿: { 0: '平', 1: '庙', 2: '旺', 3: '陷', 4: '庙', 5: '平', 6: '平', 8: '旺', 10: '庙', 11: '旺' },
    天同: { 0: '旺', 1: '陷', 2: '平', 3: '庙', 4: '旺', 5: '庙', 8: '旺', 9: '平', 10: '平', 11: '庙' },
    天相: { 0: '庙', 1: '庙', 2: '庙', 3: '陷', 4: '旺', 5: '平', 6: '旺', 7: '平', 10: '陷', 11: '平' },
    天虚: { 7: '陷', 8: '庙', 9: '旺', 10: '陷' }, 天钺: { 5: '庙', 6: '庙', 7: '旺', 8: '庙' },
    陀罗: { 5: '陷', 7: '庙', 8: '陷', 10: '庙' },
    文昌: { 0: '旺', 1: '庙', 2: '陷', 3: '平', 4: '旺', 5: '庙', 6: '闲', 7: '平', 8: '旺', 9: '庙', 10: '陷', 11: '平' },
    文曲: { 0: '庙', 1: '旺', 2: '陷', 3: '平', 4: '旺', 5: '庙', 6: '平', 7: '旺', 8: '旺', 9: '庙', 10: '陷', 11: '平' },
    武曲: { 0: '旺', 1: '庙', 2: '平', 3: '陷', 4: '庙', 5: '平', 6: '旺', 9: '旺', 10: '庙', 11: '平' },
    咸池: { 0: '陷', 3: '平', 6: '陷', 9: '平' },
    右弼: { 0: '旺', 1: '庙', 2: '旺', 3: '庙', 4: '庙', 5: '旺', 6: '旺', 7: '庙', 8: '旺', 9: '旺', 10: '庙', 11: '旺' },
    月德: { 6: '旺', 7: '平', 8: '陷', 9: '闲' },
    紫微: { 1: '庙', 2: '庙', 3: '旺', 4: '闲', 5: '旺', 6: '庙', 7: '庙', 8: '旺', 9: '平', 10: '陷' },
    左辅: { 0: '旺', 1: '庙', 2: '旺', 3: '庙', 4: '庙', 5: '旺', 6: '旺', 7: '庙', 8: '旺', 9: '旺', 10: '庙', 11: '旺' },
  };
  // 全书通行表（自寅宫起排）
  const B_STD = {
    紫微: '旺旺得旺庙庙旺旺得旺平庙', 天机: '得旺利平庙陷得旺利平庙陷', 太阳: '旺庙旺旺旺得得陷不陷陷不',
    武曲: '得利庙平旺庙得利庙平旺庙', 天同: '利平平庙陷不旺平平庙旺不', 廉贞: '庙平利陷平利庙平利陷平利',
    天府: '庙得庙得旺庙得旺庙得庙庙', 太阴: '旺陷陷陷不不利不旺庙庙庙', 贪狼: '平利庙陷旺庙平利庙陷旺庙',
    巨门: '庙庙陷旺旺不庙庙陷旺旺不', 天相: '庙陷得得庙得庙陷得得庙庙', 天梁: '庙庙庙陷庙旺陷得庙陷庙旺',
    七杀: '庙旺庙平旺庙庙庙庙平旺庙', 破军: '得陷旺平庙旺得陷旺平庙旺',
    文昌: '陷利得庙陷利得庙陷利得庙', 文曲: '平旺得庙陷旺得庙陷旺得庙',
    火星: '庙利陷得庙利陷得庙利陷得', 铃星: '庙利陷得庙利陷得庙利陷得',
    擎羊: '　陷庙　陷庙　陷庙　陷庙', 陀罗: '陷　庙陷　庙陷　庙陷　庙',
  };
  function brightness(name, branch) {
    const w = B_WENMO[name]?.[branch];
    if (w) return w;
    const s = B_STD[name];
    if (!s) return '';
    const c = s[mod(branch - 2, 12)];
    return c === '　' ? '' : c;
  }
  const brightLevel = (b) => (b === '庙' || b === '旺') ? 2 : (b === '陷' || b === '不' || b === '闲') ? 0 : b ? 1 : -1;

  function starType(name) {
    if (MAJOR.includes(name)) return 'major';
    if (LUCKY6.includes(name)) return 'lucky';
    if (SHA6.includes(name)) return 'sha';
    if (name === '禄存' || name === '天马') return 'lu';
    return 'minor';
  }

  /* ══════════ 时间层：钟表时 → 真太阳时 → 时辰 / 换日 / 农历 ══════════ */
  function chinaDST(y, m, d) {
    if (y < 1986 || y > 1991) return false;
    const day = (mm, dd) => mm * 100 + dd;
    const firstSundayFrom = (mm, from) => { for (let dd = from; dd < from + 7; dd++) if (new Date(Date.UTC(y, mm - 1, dd)).getUTCDay() === 0) return dd; return from; };
    let s, e;
    if (y === 1986) { s = day(5, 4); e = day(9, 14); }
    else { s = day(4, firstSundayFrom(4, 11)); e = day(9, firstSundayFrom(9, 11)); }
    const t = day(m, d);
    return t >= s && t < e;
  }

  /**
   * 解析出生时间
   * input: { calendar:'solar'|'lunar', year, month, day, isLeapMonth, timeMode:'clock'|'branch',
   *          hour, minute, branch(0-12, 12=晚子), longitude, tz, dst, trueSolar, eot, lateZiNextDay }
   */
  function resolveTime(input) {
    const warn = [];
    let { year: y, month: m, day: d } = input;
    if (input.calendar === 'lunar') {
      const s = Cal.lunarToSolar(y, m, d, !!input.isLeapMonth);
      ({ y, m, d } = s);
    }
    if (!Cal.isValidSolar(y, m, d)) throw new RangeError('日期无效或超出 1900-01-31 至 2100-12-31 的范围');
    const lon = Number.isFinite(input.longitude) ? input.longitude : 120;
    const tz = Number.isFinite(input.tz) ? input.tz : 8;
    const lateZiNextDay = input.lateZiNextDay !== false;
    const out = { clock: null, solar: null, eotMin: 0, lonMin: 0, dstApplied: false, warnings: warn };

    if (input.timeMode === 'branch') {
      const b = input.branch;
      const isLateZi = b === 12;
      const hb = isLateZi ? 0 : b;
      const midHour = isLateZi ? 23.5 : hb === 0 ? 0.5 : hb * 2;
      const jUT = Astro.jd(y, m, d + midHour / 24) - tz / 24;
      let dayJdn = Cal.jdn(y, m, d);
      if (isLateZi && lateZiNextDay) dayJdn += 1;
      out.mode = 'branch';
      out.hourBranch = hb;
      out.isLateZi = isLateZi;
      out.civil = { y, m, d };
      out.jUT = jUT;
      out.dayJdn = dayJdn;
      out.boundaryMinutes = null;
      return out;
    }

    const hh = input.hour, mi = input.minute || 0;
    let dst = input.dst;
    if (dst === 'auto' || dst === undefined) dst = tz === 8 && chinaDST(y, m, d);
    out.dstApplied = !!dst;
    const clockJ = Astro.jd(y, m, d + (hh + mi / 60) / 24);
    const jUT = clockJ - (tz + (dst ? 1 : 0)) / 24;
    let localJ;
    if (input.trueSolar === false) {
      localJ = clockJ - (dst ? 1 / 24 : 0);
    } else {
      out.lonMin = lon * 4 - tz * 60;                         // 经度时差（分钟）
      out.eotMin = input.eot === false ? 0 : Astro.equationOfTime(jUT);
      localJ = jUT + lon / 15 / 24 + out.eotMin / 1440;
    }
    const L = Astro.fromJd(localJ);
    const ld = Math.floor(L.d);
    let minutes = Math.round((L.d - ld) * 1440);
    let lc = { y: L.y, m: L.m, d: ld };
    if (minutes >= 1440) { minutes -= 1440; lc = Cal.fromJdn(Cal.jdn(lc.y, lc.m, lc.d) + 1); }
    const hb = Math.floor(mod(minutes + 60, 1440) / 120);
    const isLateZi = minutes >= 1380;
    let dayJdn = Cal.jdn(lc.y, lc.m, lc.d);
    if (isLateZi && lateZiNextDay) dayJdn += 1;
    // 距时辰交界的分钟数（交界在奇数整点）
    const toOdd = mod(minutes - 60, 120);
    const boundaryMinutes = Math.min(toOdd, 120 - toOdd);
    if (boundaryMinutes <= 10) warn.push(`校正后时间距时辰交界仅 ${boundaryMinutes} 分钟，出生时间若有误差，时辰可能落在相邻时辰。建议对照相邻时辰的命盘。`);
    if (dst) warn.push('该日期处于中国夏令时期间（1986–1991），已自动减去 1 小时。若出生证明时间已是标准时间，请在高级设置中关闭夏令时。');
    out.mode = 'clock';
    out.clock = { y, m, d, hh, mi };
    out.solar = { y: lc.y, m: lc.m, d: lc.d, minutes };
    out.hourBranch = hb;
    out.isLateZi = isLateZi;
    out.civil = lc;
    out.jUT = jUT;
    out.dayJdn = dayJdn;
    out.boundaryMinutes = boundaryMinutes;
    return out;
  }

  /* ══════════ 起盘 ══════════ */
  function generate(input) {
    const t = resolveTime(input);
    const gender = input.gender === 'female' ? 'female' : 'male';
    const dayDate = Cal.fromJdn(t.dayJdn);
    const lunar = Cal.solarToLunar(dayDate.y, dayDate.m, dayDate.d);
    const warnings = [...t.warnings];

    // 年界：默认正月初一；可选立春
    let ly = lunar.year;
    if (input.yearDivide === 'lichun') {
      const lichun = Astro.termOfYear(dayDate.y, 2);
      ly = t.jUT >= lichun ? dayDate.y : dayDate.y - 1;
    }
    const yStem = mod(ly - 4, 10), yBranch = mod(ly - 4, 12);
    const isYang = yStem % 2 === 0;

    // 闰月处理
    let mNum = lunar.month;
    if (lunar.isLeap) {
      const mode = input.leapMode || 'split';
      if (mode === 'next' || (mode === 'split' && lunar.day > 15)) mNum = mNum % 12 + 1;
      warnings.push(`生于闰${Cal.MONTH_CN[lunar.month - 1]}月${Cal.DAY_CN(lunar.day)}，按「${mode === 'split' ? '前十五日作本月、后十五日作下月' : mode === 'next' ? '闰月作下月' : '闰月作本月'}」以${Cal.MONTH_CN[mNum - 1]}月排盘。`);
    }
    const dNum = lunar.day;
    const h = t.hourBranch;

    // 命身宫
    const ming = mod(2 + (mNum - 1) - h, 12);
    const shen = mod(2 + (mNum - 1) + h, 12);
    const yin = Cal.yinStem(yStem);
    const stemOf = (b) => mod(yin + mod(b - 2, 12), 10);

    // 五行局
    const jz = (() => { for (let i = 0; i < 60; i++) if (i % 10 === stemOf(ming) && i % 12 === ming) return i; return 0; })();
    const nayin = NAYIN.substr(Math.floor(jz / 2) * 3, 3);
    const ju = JU_BY_EL[nayin[2]];

    // 宫位骨架
    const palaces = Array.from({ length: 12 }, (_, b) => ({
      branch: b, stem: stemOf(b), name: PALACES[mod(ming - b, 12)], idx: mod(ming - b, 12),
      stars: [], isMing: b === ming, isShen: b === shen,
    }));
    const put = (name, b, extra = {}) => {
      const br = mod(b, 12);
      palaces[br].stars.push({ name, type: starType(name), bright: brightness(name, br), ...extra });
    };

    // 紫微 / 天府星系
    let x = 0; while ((dNum + x) % ju !== 0) x++;
    const q = (dNum + x) / ju;
    let zw = 2 + q - 1; zw += (x % 2 === 1) ? -x : x;
    zw = mod(zw, 12);
    const tf = mod(4 - zw, 12);
    [['紫微', 0], ['天机', -1], ['太阳', -3], ['武曲', -4], ['天同', -5], ['廉贞', -8]].forEach(([n, o]) => put(n, zw + o));
    [['天府', 0], ['太阴', 1], ['贪狼', 2], ['巨门', 3], ['天相', 4], ['天梁', 5], ['七杀', 6], ['破军', 10]].forEach(([n, o]) => put(n, tf + o));

    // 六吉
    put('左辅', 4 + mNum - 1); put('右弼', 10 - (mNum - 1));
    const wc = mod(10 - h, 12), wq = mod(4 + h, 12);
    put('文昌', wc); put('文曲', wq);
    put('天魁', KUI[yStem]); put('天钺', YUE[yStem]);
    // 禄存羊陀
    const lc = LUCUN[yStem];
    put('禄存', lc); put('擎羊', lc + 1); put('陀罗', lc - 1);
    put('天马', TIANMA(yBranch));
    // 火铃
    const g = SANHE(yBranch);
    const huoStart = [2, 3, 1, 9][g], lingStart = [10, 10, 3, 10][g];
    put('火星', huoStart + h); put('铃星', lingStart + h);
    // 空劫
    put('地空', 11 - h); put('地劫', 11 + h);

    // 杂曜
    const hl = mod(3 - yBranch, 12);
    put('红鸾', hl); put('天喜', hl + 6);
    put('天刑', 9 + mNum - 1); put('天姚', 1 + mNum - 1);
    put('天哭', 6 - yBranch); put('天虚', 6 + yBranch);
    put('龙池', 4 + yBranch); put('凤阁', 10 - yBranch);
    put('孤辰', [2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11, 2][yBranch]);
    put('寡宿', [10, 10, 1, 1, 1, 4, 4, 4, 7, 7, 7, 10][yBranch]);
    put('华盖', [4, 1, 10, 7][g]); put('咸池', [9, 6, 3, 0][g]);
    put('破碎', [5, 1, 9][yBranch % 3]);
    put('天德', 9 + yBranch); put('月德', 5 + yBranch); put('年解', 10 - yBranch);
    put('天空', yBranch + 1);
    put('天才', ming + yBranch); put('天寿', shen + yBranch);
    put('天官', TIANGUAN[yStem]); put('天福', TIANFU_S[yStem]);
    put('天巫', [5, 8, 2, 11][(mNum - 1) % 4]);
    put('天月', [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2][mNum - 1]);
    put('阴煞', [2, 0, 10, 8, 6, 4][(mNum - 1) % 6]);
    put('解神', [8, 8, 10, 10, 0, 0, 2, 2, 4, 4, 6, 6][mNum - 1]);
    const zf = mod(4 + mNum - 1, 12), yb = mod(10 - (mNum - 1), 12);
    put('三台', zf + dNum - 1); put('八座', yb - (dNum - 1));
    put('恩光', wc + dNum - 2); put('天贵', wq + dNum - 2);
    put('台辅', 6 + h); put('封诰', 2 + h);
    put('天伤', ming - 7); put('天使', ming - 5);
    const xunStartBranch = mod((mod(ly - 4, 60)) - (mod(ly - 4, 60) % 10), 12);
    put('旬空', xunStartBranch + 10); put('旬空', xunStartBranch + 11);

    // 生年四化（倪师：四化固定，只取生年干）
    SIHUA[yStem].forEach((n, i) => {
      for (const p of palaces) for (const s of p.stars) if (s.name === n) s.hua = HUA[i];
    });

    // 十二长生 / 博士 / 岁前 / 将前
    const forward = (isYang && gender === 'male') || (!isYang && gender === 'female');
    const csStart = { 2: 8, 3: 11, 4: 5, 5: 8, 6: 2 }[ju];
    for (let i = 0; i < 12; i++) {
      palaces[mod(csStart + (forward ? i : -i), 12)].changsheng = CHANGSHENG[i];
      palaces[mod(lc + (forward ? i : -i), 12)].boshi = BOSHI[i];
      palaces[mod(yBranch + i, 12)].suiqian = SUIQIAN[i];
      palaces[mod([0, 9, 6, 3][g] + i, 12)].jiangqian = JIANGQIAN[i];
    }

    // 大限
    const daxian = [];
    for (let i = 0; i < 12; i++) {
      const b = mod(ming + (forward ? i : -i), 12);
      const start = ju + i * 10;
      palaces[b].daxian = [start, start + 9];
      daxian.push({ index: i, branch: b, stem: palaces[b].stem, start, end: start + 9, natalName: palaces[b].name });
    }
    // 小限
    const xxStart = [10, 7, 4, 1][g];
    for (let a = 1; a <= 12; a++) {
      const b = mod(xxStart + (gender === 'male' ? a - 1 : -(a - 1)), 12);
      palaces[b].xiaoxian = Array.from({ length: 10 }, (_, k) => a + 12 * k);
    }

    // 空宫借对宫
    for (const p of palaces) {
      const major = p.stars.filter((s) => s.type === 'major');
      p.isEmpty = major.length === 0;
      if (p.isEmpty) {
        const opp = palaces[mod(p.branch + 6, 12)];
        p.borrow = { branch: opp.branch, name: opp.name, stars: opp.stars.filter((s) => s.type === 'major').map((s) => s.name) };
      }
    }

    // 排序：主星 → 禄马 → 六吉 → 六煞 → 杂曜
    const order = { major: 0, lu: 1, lucky: 2, sha: 3, minor: 4 };
    const majorOrder = (n) => MAJOR.indexOf(n);
    const minorOrder = (n) => { const i = CORE_MINOR.indexOf(n); return i < 0 ? 99 : i; };
    for (const p of palaces) p.stars.sort((a, b) => (order[a.type] - order[b.type]) || (a.type === 'major' ? majorOrder(a.name) - majorOrder(b.name) : 0) || (a.type === 'minor' ? minorOrder(a.name) - minorOrder(b.name) : 0));

    const bazi = Cal.baziPillars(t.jUT, t.dayJdn, h);
    const lunarPillars = {
      year: STEMS[yStem] + BRANCHES[yBranch],
      month: STEMS[mod(yin + mNum - 1, 10)] + BRANCHES[mod(mNum + 1, 12)],
      day: bazi.day, hour: bazi.hour,
    };
    const douJun = mod(-(mNum - 1) + h, 12); // 子年斗君（流年斗君 = 流年支 + 此偏移）

    return {
      input: { ...input, gender },
      time: t, warnings,
      lunar, lunarYear: ly, yStem, yBranch, isYang, forward,
      monthNum: mNum, dayNum: dNum, hour: h,
      ming, shen, ju, juName: JU_NAME[ju], nayin, ziweiPos: zw, tianfuPos: tf,
      mingZhu: MING_ZHU[ming], shenZhu: SHEN_ZHU[yBranch],
      sihua: SIHUA[yStem].map((n, i) => ({ hua: HUA[i], star: n, branch: palaces.find((p) => p.stars.some((s) => s.name === n)).branch })),
      palaces, daxian, bazi, lunarPillars, douJunOffset: douJun,
    };
  }

  /* ══════════ 运限：大限 / 流年 / 流月 / 流日 ══════════ */
  function flowStars(prefix, stem, branch) {
    const out = [];
    const lu = LUCUN[stem];
    const add = (n, b) => out.push({ name: prefix + n, base: n, branch: mod(b, 12) });
    add('禄', lu); add('羊', lu + 1); add('陀', lu - 1);
    add('魁', KUI[stem]); add('钺', YUE[stem]);
    add('昌', FLOW_CHANG[stem]); add('曲', FLOW_QU[stem]);
    add('马', TIANMA(branch));
    const hl = mod(3 - branch, 12); add('鸾', hl); add('喜', hl + 6);
    return out;
  }
  const namesFrom = (mingBranch) => Array.from({ length: 12 }, (_, b) => PALACES[mod(mingBranch - b, 12)]);
  const huaOfStem = (stem) => SIHUA[stem].map((n, i) => ({ hua: HUA[i], star: n }));

  /** 虚岁对应的大限 */
  const daxianAtAge = (chart, age) => chart.daxian.find((d) => age >= d.start && age <= d.end) || null;

  /**
   * 运限层
   * sel: { decade?: index, year?: lunarYear, month?: 1-12, day?: 1-30 }
   */
  function horoscope(chart, sel) {
    const res = { layers: [] };
    let decade = null;
    if (sel.year != null) {
      const age = sel.year - chart.lunarYear + 1;
      decade = daxianAtAge(chart, age);
      res.age = age;
    }
    if (sel.decade != null && sel.year == null) decade = chart.daxian[sel.decade];
    if (decade) {
      res.decade = {
        ...decade, scope: 'decade', label: '大限', tag: '大',
        names: namesFrom(decade.branch), stars: flowStars('运', decade.stem, decade.branch),
        hua: huaOfStem(decade.stem), gz: STEMS[decade.stem] + BRANCHES[decade.branch],
      };
      res.layers.push(res.decade);
    }
    if (sel.year != null) {
      const ys = mod(sel.year - 4, 10), yb = mod(sel.year - 4, 12);
      const xiaoxian = chart.palaces.find((p) => p.xiaoxian && p.xiaoxian.includes(res.age));
      res.year = {
        scope: 'year', label: '流年', tag: '年', year: sel.year, stem: ys, branch: yb,
        gz: STEMS[ys] + BRANCHES[yb], names: namesFrom(yb), stars: flowStars('流', ys, yb), hua: huaOfStem(ys),
        xiaoxian: xiaoxian ? xiaoxian.branch : null,
        suiqian: Array.from({ length: 12 }, (_, b) => SUIQIAN[mod(b - yb, 12)]),
      };
      res.layers.push(res.year);
      if (sel.month != null) {
        const mb = mod(yb + chart.douJunOffset + sel.month - 1, 12);
        const ms = mod(Cal.yinStem(ys) + sel.month - 1, 10);
        res.month = {
          scope: 'month', label: '流月', tag: '月', month: sel.month, branch: mb, stem: ms,
          gz: STEMS[ms] + BRANCHES[mod(sel.month + 1, 12)], names: namesFrom(mb), hua: huaOfStem(ms),
          douJun: mod(yb + chart.douJunOffset, 12),
        };
        res.layers.push(res.month);
        if (sel.day != null) {
          const db = mod(mb + sel.day - 1, 12);
          let dgz = '', dStem = 0;
          try {
            const isLeap = false;
            const s = Cal.lunarToSolar(sel.year, sel.month, Math.min(sel.day, Cal.monthDays(sel.year, sel.month)), isLeap);
            const idx = Cal.dayGzIndex(Cal.jdn(s.y, s.m, s.d));
            dgz = Cal.gz(idx); dStem = idx % 10;
            res.daySolar = s;
          } catch (e) { /* ignore */ }
          res.day = { scope: 'day', label: '流日', tag: '日', day: sel.day, branch: db, stem: dStem, gz: dgz, names: namesFrom(db), hua: huaOfStem(dStem) };
          res.layers.push(res.day);
        }
      }
    }
    return res;
  }

  /** 当前（目标日期）对应的农历年月日 */
  function targetLunar(date = new Date()) {
    return Cal.solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  return {
    PALACES, SHORT, HOURS, HOUR_RANGE, MAJOR, LUCKY6, SHA6, CORE_MINOR, SIHUA, HUA,
    brightness, brightLevel, chinaDST, resolveTime, generate, horoscope, daxianAtAge, targetLunar, flowStars,
  };
})();

if (typeof module !== 'undefined') module.exports = ZW;
