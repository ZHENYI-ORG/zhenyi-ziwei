/* ══════════════════════════════════════════════════════════════
 * Reading · 格局识别 + 断语组织
 * 格局规则移植自原系统 patterns.ts（v2 严格版），修正若干判断错误，
 * 并补充古书常用格局。每个格局列「成立 / 加分 / 破格」三层。
 * ══════════════════════════════════════════════════════════════ */
const Reading = (() => {
  const { mod, BRANCHES, STEMS } = Cal;
  const SHA4 = ['擎羊', '陀罗', '火星', '铃星'];
  const KONG = ['地空', '地劫'];
  const SHA6 = [...SHA4, ...KONG];

  const P = (c, b) => c.palaces[mod(b, 12)];
  const has = (p, n) => p.stars.some((s) => s.name === n);
  const star = (p, n) => p.stars.find((s) => s.name === n);
  const where = (c, n) => c.palaces.find((p) => has(p, n));
  const majors = (p) => p.stars.filter((s) => s.type === 'major').map((s) => s.name);
  const sf = (c, b = c.ming) => [P(c, b), P(c, b + 4), P(c, b + 8), P(c, b + 6)];
  const sfSet = (c, b = c.ming) => new Set(sf(c, b).flatMap((p) => p.stars.map((s) => s.name)));
  const inSf = (c, b, base = c.ming) => [base, base + 4, base + 8, base + 6].map((x) => mod(x, 12)).includes(mod(b, 12));
  const huaIn = (ps, h) => ps.some((p) => p.stars.some((s) => s.hua === h));
  const hasLu = (p) => has(p, '禄存') || p.stars.some((s) => s.hua === '禄');
  const shaCount = (ps, list = SHA4) => ps.reduce((n, p) => n + p.stars.filter((s) => list.includes(s.name)).length, 0);
  const hasAny = (p, list) => p.stars.some((s) => list.includes(s.name));
  const isBright = (p, n) => ZW.brightLevel(star(p, n)?.bright) === 2;
  const isDim = (p, n) => ZW.brightLevel(star(p, n)?.bright) === 0;
  const huaOf = (p, n) => star(p, n)?.hua;
  const jia = (c, b) => [P(c, b - 1), P(c, b + 1)];
  const jiaPair = (c, b, a, z) => { const [x, y] = jia(c, b); return (has(x, a) && has(y, z)) || (has(x, z) && has(y, a)); };

  function detectPatterns(c) {
    const out = [];
    const ming = P(c, c.ming);
    const qian = P(c, c.ming + 6);
    const S = sfSet(c);
    const SF = sf(c);
    const push = (o) => out.push({ bonus: [], breaking: [], ...o });

    /* ── 上格 ── */
    if (has(ming, '紫微') && S.has('左辅') && S.has('右弼')) {
      const bonus = [], breaking = [];
      if (S.has('文昌') || S.has('文曲')) bonus.push('再会文昌或文曲');
      if (S.has('天魁') || S.has('天钺')) bonus.push('魁钺贵人加会');
      if (huaOf(ming, '紫微') === '权') bonus.push('紫微化权');
      if (shaCount(SF, KONG) >= 2) breaking.push('空劫会照（紫微忌空劫）');
      push({ name: '君臣庆会', level: breaking.length ? 'good' : 'excellent', palaces: ['命宫'], required: ['紫微坐命', '左辅右弼会入三方四正'], bonus, breaking, desc: '紫微坐命而辅弼同会，帝王得贤臣辅佐。一生贵人不绝，有统御之才，宜走政商高位或团队领袖之途。', src: '《紫微斗数全书》' });
    }
    {
      const z = where(c, '紫微');
      if (z && has(z, '天府') && inSf(c, z.branch)) {
        const inMing = z.branch === c.ming;
        const bonus = [], breaking = [];
        if (S.has('左辅') && S.has('右弼')) bonus.push('左辅右弼同会');
        if (S.has('文昌') || S.has('文曲')) bonus.push('再会昌曲');
        if (hasAny(z, KONG)) breaking.push('紫府宫坐空劫');
        if (shaCount([z]) >= 2) breaking.push('紫府宫双煞同坐');
        push({ name: '紫府同宫', level: inMing && !breaking.length ? 'excellent' : 'good', palaces: [z.name], required: [inMing ? '紫微天府同坐命宫' : `紫微天府同宫于${z.name}`], bonus, breaking, desc: inMing ? '紫微天府同入命宫，帝星财库并临，品行端正、衣食无忧、有领导才能；得辅弼相配方为完整大格。' : `紫府同宫于${z.name}而会照命宫，一生有贵气可依，大富贵与否要看会照的吉煞。`, src: '《紫微斗数全书》' });
      }
    }
    {
      const fu = where(c, '天府'), xiang = where(c, '天相');
      if (fu && xiang && ['财帛', '官禄'].includes(fu.name) && ['财帛', '官禄'].includes(xiang.name) && fu.branch !== xiang.branch) {
        const bonus = [], breaking = [];
        if (hasLu(ming)) bonus.push('命宫见禄');
        if (S.has('左辅') || S.has('右弼')) bonus.push('再会辅弼');
        if (hasAny(ming, SHA4)) breaking.push('命宫坐煞');
        if (shaCount(SF) >= 3) breaking.push('三方四正煞星过多');
        push({ name: '府相朝垣', level: breaking.length ? 'good' : 'excellent', palaces: [fu.name, xiang.name], required: [`天府守${fu.name}、天相守${xiang.name}，两星朝拱命宫`], bonus, breaking, desc: '天府天相分守财官二宫而朝命，文武并济、权印双辉。古云「府相朝垣，千钟食禄」，主衣食丰足、地位稳固。', src: '《紫微斗数全书》' });
      }
    }
    if (S.has('太阳') && S.has('天梁') && S.has('文昌') && (S.has('禄存') || huaIn(SF, '禄'))) {
      const sun = where(c, '太阳'), liang = where(c, '天梁');
      const bonus = [], breaking = [];
      if (isBright(sun, '太阳')) bonus.push('太阳庙旺');
      if (huaIn(SF, '科')) bonus.push('再会化科');
      if (isDim(sun, '太阳')) breaking.push('太阳落陷，阳梁失辉');
      if (shaCount(SF) >= 2) breaking.push('三方煞重');
      push({ name: '阳梁昌禄', level: breaking.length ? 'good' : 'excellent', palaces: [sun.name, liang.name], required: ['太阳、天梁、文昌、禄（禄存或化禄）齐会命宫三方四正'], bonus, breaking, desc: '号称科甲之格，主清贵显达、考运佳，宜学术、文教、研究与专业认证之路，功名易就。', src: '《紫微斗数全书》' });
    }
    {
      const tan = where(c, '贪狼');
      for (const sha of ['火星', '铃星']) {
        const sp = where(c, sha);
        if (!tan || !sp || !inSf(c, sp.branch, tan.branch) || !inSf(c, tan.branch)) continue;
        const same = tan.branch === sp.branch;
        const bonus = [], breaking = [];
        if (isBright(tan, '贪狼')) bonus.push('贪狼庙旺');
        if (['禄', '权'].includes(huaOf(tan, '贪狼'))) bonus.push('贪狼化禄或化权');
        if (hasAny(tan, ['擎羊', '陀罗'])) breaking.push('贪狼宫又见羊陀');
        if (hasAny(tan, KONG)) breaking.push('贪狼遇空劫，财来财去');
        push({ name: sha === '火星' ? '火贪格' : '铃贪格', level: breaking.length ? 'good' : 'excellent', palaces: [tan.name, sp.name], required: [`贪狼${same ? '同宫' : '会照'}${sha}`, '贪狼入命宫三方四正'], bonus, breaking, desc: `贪狼遇${sha}，主突发之财与意外机遇。来得快去得也快，宜见好就收、把横财转为恒产。`, src: '《骨髓赋》' });
      }
    }
    {
      const wu = where(c, '武曲'), tan = where(c, '贪狼');
      if (wu && tan && (wu.branch === tan.branch || mod(wu.branch + 6, 12) === tan.branch) && (inSf(c, wu.branch) || inSf(c, tan.branch))) {
        const bonus = [], breaking = [];
        if (S.has('火星') || S.has('铃星')) bonus.push('再遇火铃');
        if (huaOf(wu, '武曲') === '禄') bonus.push('武曲化禄');
        if (hasAny(wu, ['擎羊', '陀罗'])) breaking.push('武贪宫见羊陀');
        if (hasAny(wu, KONG)) breaking.push('武贪宫遇空劫');
        push({ name: '武贪格', level: breaking.length ? 'good' : 'excellent', palaces: [wu.name, tan.name], required: [wu.branch === tan.branch ? '武曲贪狼同宫' : '武曲贪狼对拱', '会入命宫三方'], bonus, breaking, desc: '古云「武贪不发少年人」，三十岁后厚积薄发，中年以后可致富，财源多由人脉与专业而来。', src: '《骨髓赋》' });
      }
    }
    {
      const got = ['七杀', '破军', '贪狼'].filter((n) => S.has(n));
      if (got.length === 3) {
        const bonus = [], breaking = [];
        if (huaIn(SF, '禄') || huaIn(SF, '权')) bonus.push('三方有化禄或化权，动得有力');
        if (S.has('左辅') && S.has('右弼')) bonus.push('辅弼同会，变动中得贵人');
        if (shaCount(SF) >= 3) breaking.push('煞星过重，动而无成');
        if (hasAny(ming, KONG)) breaking.push('命坐空劫，动得辛苦');
        push({ name: '杀破狼', level: breaking.length ? 'caution' : 'good', palaces: SF.filter((p) => majors(p).some((n) => got.includes(n))).map((p) => p.name), required: ['七杀、破军、贪狼齐入命宫三方四正'], bonus, breaking, desc: '开创闯荡之格。一生变动多、不甘平凡，宜创业、军警、业务；年轻时易因冲动失利，中年后方能稳定。', src: '《紫微斗数全书》' });
      }
    }
    {
      const four = ['天机', '太阴', '天同', '天梁'];
      const got = four.filter((n) => S.has(n));
      if (got.length === 4) {
        const bonus = [], breaking = [];
        if (S.has('文昌') || S.has('文曲')) bonus.push('再会昌曲');
        if (huaIn(SF, '科')) bonus.push('再会化科');
        if (shaCount(SF) >= 3) breaking.push('煞星过多');
        if (hasAny(ming, SHA4)) breaking.push('命宫坐煞');
        push({ name: '机月同梁', level: breaking.length ? 'good' : 'excellent', palaces: SF.filter((p) => majors(p).some((n) => four.includes(n))).map((p) => p.name), required: ['天机、太阴、天同、天梁齐入命宫三方四正'], bonus, breaking, desc: '文质彬彬、聪慧善谋，最宜公职、学术、医疗、服务等稳定累积的行业，不宜大冒险大投机。', src: '《紫微斗数全书》' });
      } else if (got.length === 3) {
        const miss = four.filter((n) => !S.has(n));
        push({ name: '机月同梁（三星会）', level: 'neutral', palaces: SF.filter((p) => majors(p).some((n) => four.includes(n))).map((p) => p.name), required: [`三方会${got.join('、')}，缺${miss.join('、')}`], desc: '机月同梁不全之格，仍偏文职稳定的路线，关键看缺位之星与四化配合。', src: '《紫微斗数全书》（降级）' });
      }
    }

    /* ── 中格 ── */
    {
      const l = where(c, '廉贞');
      if (l && has(l, '天相') && inSf(c, l.branch)) {
        const bonus = [], breaking = [];
        if (hasLu(l)) bonus.push('见禄');
        if (has(l, '擎羊')) breaking.push('擎羊同宫，成刑囚夹印');
        if (huaOf(l, '廉贞') === '忌') breaking.push('廉贞化忌');
        push({ name: '廉贞天相', level: breaking.length ? 'caution' : (l.branch === c.ming ? 'good' : 'neutral'), palaces: [l.name], required: ['廉贞天相同宫'], bonus, breaking, desc: '印绶之格，主秉公处事、有清廉之名，宜公职、行政、法务、企划。最怕擎羊化忌，反主官非。', src: '《紫微斗数全书》' });
        if (has(l, '擎羊')) push({ name: '刑囚夹印', level: 'caution', palaces: [l.name], required: ['廉贞（囚）、擎羊（刑）与天相（印）同宫'], desc: '古书凶格。主官非、刑伤或受制于人，宜守法守分，处理文书合约格外谨慎。', src: '《骨髓赋》' });
      }
    }
    {
      const w = where(c, '武曲');
      if (w && has(w, '七杀') && inSf(c, w.branch)) {
        const bonus = [], breaking = [];
        if (huaOf(w, '武曲') === '权' || huaOf(w, '武曲') === '禄') bonus.push(`武曲化${huaOf(w, '武曲')}`);
        if (huaOf(w, '武曲') === '忌') breaking.push('武曲化忌，财劫之兆');
        if (hasAny(w, SHA4)) breaking.push('武杀宫见煞');
        push({ name: '武曲七杀', level: breaking.length ? 'caution' : (w.branch === c.ming ? 'excellent' : 'good'), palaces: [w.name], required: ['武曲七杀同宫'], bonus, breaking, desc: '将星配财星，果决刚毅、理财能力强，宜金融、军警、创业。一生奋斗积财，但较操心。', src: '《紫微斗数全书》' });
      }
    }
    {
      const t = where(c, '天同');
      if (t && has(t, '天梁') && inSf(c, t.branch)) {
        const bonus = [], breaking = [];
        if (S.has('文昌')) bonus.push('文昌会照');
        if (huaOf(t, '天同') === '禄') bonus.push('天同化禄');
        if (hasAny(t, SHA4)) breaking.push('煞星同坐');
        push({ name: '天同天梁', level: breaking.length ? 'neutral' : 'good', palaces: [t.name], required: ['天同天梁同宫'], bonus, breaking, desc: '福星与荫星同度，宽厚和善、乐于助人，宜医疗、教育、宗教、公益，偏温和保守。', src: '《紫微斗数全书》' });
      }
    }
    {
      const sun = where(c, '太阳');
      if (sun && has(sun, '太阴') && [1, 7].includes(sun.branch) && inSf(c, sun.branch)) {
        const bonus = [], breaking = [];
        if (sun.branch === 7) bonus.push('未宫日月同度');
        if (S.has('文昌') && S.has('文曲')) bonus.push('昌曲会照');
        if (hasAny(sun, SHA4)) breaking.push('日月宫见煞');
        push({ name: '日月同宫', level: breaking.length ? 'good' : (sun.branch === c.ming ? 'excellent' : 'good'), palaces: [sun.name], required: [`太阳太阴同宫于${BRANCHES[sun.branch]}`], bonus, breaking, desc: '阴阳兼备、文武兼长，异性缘佳、名声能远播；未宫较丑宫为美。', src: '《紫微斗数全书》' });
      }
    }
    {
      const [a, b] = jia(c, c.ming);
      const ok = (has(a, '太阳') && has(b, '太阴')) || (has(a, '太阴') && has(b, '太阳'));
      if (ok) {
        const sp = has(a, '太阳') ? a : b, mp = has(a, '太阴') ? a : b;
        const bonus = [], breaking = [];
        if (isBright(sp, '太阳')) bonus.push('太阳庙旺');
        if (isBright(mp, '太阴')) bonus.push('太阴庙旺');
        if (isDim(sp, '太阳') || isDim(mp, '太阴')) breaking.push('日月落陷，夹而无光');
        push({ name: '日月夹命', level: breaking.length ? 'good' : 'excellent', palaces: ['命宫', sp.name, mp.name], required: ['太阳、太阴分居命宫前后两宫'], bonus, breaking, desc: '日月两曜夹照命宫，光明磊落、一生多贵人。日月须不落陷方为真夹。', src: '《紫微斗数全书》' });
      }
    }
    {
      const j = where(c, '巨门');
      if (j && has(j, '太阳') && [2, 8].includes(j.branch) && inSf(c, j.branch)) {
        const breaking = hasAny(j, SHA4) ? ['巨日宫见煞'] : [];
        push({ name: '巨日同宫', level: breaking.length ? 'neutral' : (j.branch === 2 ? 'good' : 'neutral'), palaces: [j.name], required: [`巨门太阳同宫于${BRANCHES[j.branch]}`], breaking, desc: `以口才与名声立身，宜教学、传媒、外交。${j.branch === 2 ? '寅宫旭日东升，先难后易。' : '申宫日已西斜，劳而少功，宜早立专业。'}`, src: '《紫微斗数全书》' });
      }
    }
    if (has(ming, '巨门') && [0, 6].includes(c.ming)) {
      const bonus = [], breaking = [];
      if (['禄', '权'].includes(huaOf(ming, '巨门'))) bonus.push(`巨门化${huaOf(ming, '巨门')}`);
      if (S.has('文昌')) bonus.push('文昌会照');
      if (huaOf(ming, '巨门') === '忌') breaking.push('巨门化忌，玉藏深泥');
      if (hasAny(ming, SHA4)) breaking.push('命坐煞星');
      push({ name: '石中隐玉', level: breaking.length ? 'caution' : 'excellent', palaces: ['命宫'], required: [`巨门坐命于${BRANCHES[c.ming]}`], bonus, breaking, desc: '外表平凡而内蕴才学，早年默默、中年方显，宜专业、研究、口才传媒；得禄权文昌方能凿石见玉。', src: '《骨髓赋》' });
    }
    if (c.ming === 7 && ming.isEmpty && has(qian, '太阳') && has(qian, '太阴')) {
      const bonus = [], breaking = [];
      if (S.has('文昌') || S.has('文曲')) bonus.push('再会昌曲');
      if (S.has('左辅') || S.has('右弼')) bonus.push('辅弼相助');
      if (shaCount(SF) >= 2) breaking.push('煞星会照，珠光黯淡');
      push({ name: '明珠出海', level: breaking.length ? 'good' : 'excellent', palaces: ['命宫', qian.name], required: ['命宫在未无主星', '对宫丑宫日月同度'], bonus, breaking, desc: '命未空宫而丑宫日月拱照，出身平凡而后天出头，宜远赴他乡或在大机构发展。', src: '《紫微斗数全集》' });
    }
    if (has(ming, '紫微') && !has(ming, '天府')) {
      const bonus = [], breaking = [];
      if (S.has('左辅') && S.has('右弼')) bonus.push('辅弼同会');
      if (S.has('文昌') && S.has('文曲')) bonus.push('昌曲同会');
      if (!S.has('左辅') && !S.has('右弼')) breaking.push('无辅弼，孤君无臣');
      if (hasAny(ming, KONG)) breaking.push('紫微遇空劫');
      push({ name: '紫微坐命', level: breaking.length ? 'caution' : (bonus.length ? 'excellent' : 'good'), palaces: ['命宫'], required: ['紫微坐命（不与天府同宫）'], bonus, breaking, desc: '帝座之星坐命，自尊心强、有领导魅力。最忌在野孤君：无辅弼相会，反成孤高自傲、易招毁谤。', src: '《紫微斗数全书》' });
    }
    // 补充：古书庙旺坐命格
    const single = (cond, o) => { if (cond) push(o); };
    single(has(ming, '紫微') && c.ming === 6, { name: '极向离明', level: hasAny(ming, SHA6) ? 'good' : 'excellent', palaces: ['命宫'], required: ['紫微坐命于午'], breaking: hasAny(ming, SHA6) ? ['命宫见煞'] : [], desc: '紫微居午，帝星正位离明，无煞则主富贵双全，为人光明有威仪。', src: '《紫微斗数全书》' });
    single(has(ming, '太阳') && c.ming === 6, { name: '金灿光辉', level: hasAny(ming, SHA6) ? 'good' : 'excellent', palaces: ['命宫'], required: ['太阳坐命于午'], breaking: hasAny(ming, SHA6) ? ['命宫见煞'] : [], desc: '太阳居午如日中天，热情有为、名声显达，宜公职与对外事业。', src: '《紫微斗数全书》' });
    single(has(ming, '太阳') && has(ming, '天梁') && c.ming === 3, { name: '日照雷门', level: 'excellent', palaces: ['命宫'], required: ['太阳天梁坐命于卯'], desc: '旭日照临雷门，光明正大、有贵人提携，利考试与公职，主富贵声扬。', src: '《紫微斗数全书》' });
    single(has(ming, '太阴') && c.ming === 11, { name: '月朗天门', level: hasAny(ming, SHA6) ? 'good' : 'excellent', palaces: ['命宫'], required: ['太阴坐命于亥'], breaking: hasAny(ming, SHA6) ? ['命宫见煞'] : [], desc: '太阴居亥，月朗天门，气质清雅、理财有道，主富而有名。', src: '《紫微斗数全书》' });
    single(has(ming, '太阴') && has(ming, '天同') && c.ming === 0, { name: '月生沧海', level: 'excellent', palaces: ['命宫'], required: ['天同太阴坐命于子'], desc: '月生沧海，清秀聪颖、文雅多才，宜文职清贵之路。', src: '《紫微斗数全书》' });
    single(has(ming, '破军') && [0, 6].includes(c.ming), { name: '英星入庙', level: hasAny(ming, SHA4) ? 'good' : 'excellent', palaces: ['命宫'], required: ['破军坐命于子午'], breaking: hasAny(ming, SHA4) ? ['命宫见煞'] : [], desc: '破军入庙于子午，开创力强而有章法，主权贵，能在变局中建功。', src: '《紫微斗数全书》' });
    single(has(ming, '七杀') && [2, 8].includes(c.ming), { name: '七杀朝斗', level: 'good', palaces: ['命宫', qian.name], required: ['七杀坐命于寅申，对宫紫府'], desc: '将星朝帝，主独当一面、能成大事；性刚，须防冲动。', src: '《紫微斗数全书》' });
    single(has(ming, '七杀') && [0, 6].includes(c.ming), { name: '七杀仰斗', level: 'good', palaces: ['命宫', qian.name], required: ['七杀坐命于子午，对宫武府'], desc: '七杀居子午、仰对财星，主白手起家、以实干致富。', src: '《紫微斗数全书》' });
    single(has(ming, '文昌') && has(ming, '文曲') && [1, 7].includes(c.ming), { name: '文桂文华', level: 'good', palaces: ['命宫'], required: ['文昌文曲同坐命于丑未'], desc: '昌曲同守命宫，文采斐然、才艺出众，利科名与文化事业。', src: '《紫微斗数全书》' });
    single((has(ming, '天魁') && has(qian, '天钺')) || (has(ming, '天钺') && has(qian, '天魁')), { name: '坐贵向贵', level: 'good', palaces: ['命宫', '迁移'], required: ['天魁天钺分守命宫与迁移'], desc: '坐贵向贵，内外皆有贵人，关键时刻常得提携。', src: '《紫微斗数全书》' });

    /* ── 助力格 ── */
    if (jiaPair(c, c.ming, '左辅', '右弼')) push({ name: '辅弼夹命', level: 'excellent', palaces: ['命宫'], required: ['左辅右弼分居命宫前后两宫'], desc: '辅弼夹命，一生多得平辈与助手之力，逢凶化吉，宜在组织中发挥。', src: '《紫微斗数全书》' });
    if (jiaPair(c, c.ming, '文昌', '文曲')) push({ name: '昌曲夹命', level: 'excellent', palaces: ['命宫'], required: ['文昌文曲分居命宫前后两宫'], desc: '昌曲夹命，聪明俊秀、文采好，利考试与文教。', src: '《紫微斗数全书》' });
    if (jiaPair(c, c.ming, '天魁', '天钺')) push({ name: '魁钺夹命', level: 'good', palaces: ['命宫'], required: ['天魁天钺分居命宫前后两宫'], desc: '魁钺夹命，考试、求职等关键时刻常有贵人相助。', src: '《紫微斗数全书》' });
    if (huaIn(SF, '禄') && SF.some((p) => has(p, '禄存'))) push({ name: '双禄朝垣', level: hasAny(ming, KONG) ? 'good' : 'excellent', palaces: SF.map((p) => p.name), required: ['化禄与禄存同会命宫三方四正'], breaking: hasAny(ming, KONG) ? ['命坐空劫，双禄逢空'] : [], desc: '两禄会命，财源丰厚、衣食无忧，正财偏财兼得。', src: '《紫微斗数全书》' });
    if (huaIn(SF, '禄') && huaIn(SF, '权') && huaIn(SF, '科')) push({ name: '三奇加会', level: 'excellent', palaces: SF.map((p) => p.name), required: ['化禄、化权、化科齐会命宫三方四正'], desc: '三吉化会命，功名、财富、贵人三全，为斗数上格之一。', src: '《紫微斗数全书》' });
    else if (huaIn(SF, '科') && huaIn(SF, '权')) push({ name: '科权双会', level: 'good', palaces: ['命宫'], required: ['化科、化权同会命宫三方四正'], desc: '名权双美，既有学识名声又有掌控力，宜走专业权威路线。', src: '《紫微斗数全书》' });
    if (ming.stars.some((s) => s.hua === '禄') && ming.stars.some((s) => s.hua === '权')) push({ name: '权禄巡逢', level: 'excellent', palaces: ['命宫'], required: ['化禄、化权同坐命宫'], desc: '权禄同坐命宫，既得机缘又能掌握，主富贵兼备。', src: '《紫微斗数全书》' });
    {
      const ma = where(c, '天马');
      const luHere = ma && hasLu(ma);
      const luOpp = ma && hasLu(P(c, ma.branch + 6));
      if (ma && (luHere || luOpp) && inSf(c, ma.branch)) push({ name: '禄马交驰', level: 'excellent', palaces: [ma.name], required: [luHere ? '禄与天马同宫' : '禄与天马对照', '位于命宫三方四正'], desc: '禄随马动，动中生财，宜外出、贸易、跨地域发展，越动越旺。', src: '《紫微斗数全书》' });
    }
    {
      const luP = where(c, '禄存');
      if (luP && luP.branch === c.ming) push({ name: '禄存守命', level: 'good', palaces: ['命宫'], required: ['禄存坐命'], desc: '禄存坐命，一生衣食稳定、善于积累，个性偏保守；禄存必受羊陀所夹，须防小人。', src: '《紫微斗数全书》' });
      else if (luP && luP.branch === c.shen) push({ name: '禄存守身', level: 'good', palaces: [luP.name], required: ['禄存入身宫'], desc: '禄存入身宫，中年后财源趋稳，后天努力的方向能带来实在的财禄。', src: '《紫微斗数全书》' });
    }
    {
      const ma = where(c, '天马');
      if (ma && (ma.branch === c.ming || ma.branch === qian.branch)) push({ name: ma.branch === c.ming ? '天马入命' : '天马在迁', level: 'neutral', palaces: [ma.name], required: [ma.branch === c.ming ? '天马坐命' : '天马入迁移'], desc: ma.branch === c.ming ? '一生奔波、动中求财，宜商旅外勤与跨界发展；有禄同会则成禄马交驰。' : '出外有利、远行得财，宜异乡发展；逢煞则旅途多波折。', src: '《紫微斗数全书》' });
    }
    if (ming.stars.some((s) => s.hua === '禄' && s.type === 'major')) {
      const s = ming.stars.find((x) => x.hua === '禄' && x.type === 'major');
      push({ name: `${s.name}化禄坐命`, level: 'good', palaces: ['命宫'], required: [`${s.name}化禄坐命宫`], desc: `${s.name}化禄坐命，生财顺利、人缘好、机缘多。${s.name === '武曲' ? '武曲化禄属正财，宜实业金融。' : s.name === '太阴' ? '太阴化禄属阴财与不动产。' : s.name === '贪狼' ? '贪狼化禄属人脉财与桃花财。' : ''}`, src: '《紫微斗数全书》' });
    }
    {
      const cai = c.palaces.find((p) => p.name === '财帛');
      const s = cai.stars.find((x) => x.type === 'major' && x.hua === '禄');
      if (s) push({ name: '化禄入财', level: 'good', palaces: ['财帛'], required: [`${s.name}化禄入财帛宫`], desc: `财源畅通、收入稳定。${s.name}的特质就是你赚钱的主轴。`, src: '《紫微斗数全书》' });
      const guan = c.palaces.find((p) => p.name === '官禄');
      const q = guan.stars.find((x) => x.type === 'major' && x.hua === '权');
      if (q) push({ name: '化权入官', level: 'good', palaces: ['官禄'], required: [`${q.name}化权入官禄宫`], desc: `事业有掌控力，能独当一面，宜走管理或技术权威路线。`, src: '《紫微斗数全书》' });
    }
    for (const p of [ming, P(c, c.shen)]) {
      const s = p.stars.find((x) => x.type === 'major' && x.hua === '科');
      if (s) { push({ name: p.isMing ? '化科入命' : '化科入身', level: 'good', palaces: [p.name], required: [`${s.name}化科入${p.isMing ? '命' : '身'}宫`], desc: '主名声、文书与学术运，宜以名取利：教育、研究、咨询、文创。', src: '《紫微斗数全书》' }); break; }
    }
    if (S.has('文昌') && S.has('文曲') && !jiaPair(c, c.ming, '文昌', '文曲') && !(has(ming, '文昌') && has(ming, '文曲') && [1, 7].includes(c.ming))) push({ name: has(ming, '文昌') && has(ming, '文曲') ? '昌曲坐命' : '昌曲同会', level: 'good', palaces: ['命宫'], required: ['文昌、文曲同会命宫三方四正'], desc: '才华横溢、口才文笔俱佳，宜从事需要表达与文采的行业；昌曲最忌化忌，文书契约须细心。', src: '《紫微斗数全书》' });
    if (S.has('左辅') && S.has('右弼') && !has(ming, '紫微') && !jiaPair(c, c.ming, '左辅', '右弼')) push({ name: '辅弼同会', level: 'good', palaces: ['命宫'], required: ['左辅、右弼同会命宫三方四正'], desc: '一生贵人不绝、人缘佳，宜领导岗位与团队合作，不宜单打独斗。', src: '《紫微斗数全书》' });
    if (S.has('天魁') && S.has('天钺') && !jiaPair(c, c.ming, '天魁', '天钺')) push({ name: '魁钺同会', level: 'good', palaces: ['命宫'], required: ['天魁、天钺同会命宫三方四正'], desc: '天乙贵人加持，困难时常有得力相助者，宜主动维护人脉。', src: '《紫微斗数全书》' });

    /* ── 警示格 ── */
    if (ming.isEmpty) push({ name: '命无正曜', level: 'neutral', palaces: ['命宫', qian.name], required: [`命宫无主星，借迁移宫${ming.borrow.stars.join('、') || '（亦空）'}安星`], desc: '个性可塑性强、随环境而变，受六亲与外在环境影响较深；一生宜选对环境与伴侣。', src: '《紫微斗数全书》' });
    for (const p of [ming, qian]) {
      const ji = p.stars.find((s) => s.hua === '忌');
      if (ji) push({ name: `${ji.name}化忌${p.isMing ? '坐命' : '入迁'}`, level: 'caution', palaces: [p.name], required: [`${ji.name}化忌在${p.name}`], desc: p.isMing ? `${ji.name}化忌坐命，${ji.name}所代表的特质就是你一生最执着的课题。忌冲迁移，出外较辛苦，宜先修己再求外。` : `${ji.name}化忌在迁移而冲命宫，外出、远行、人际多波折，宜守不宜躁。`, src: '《紫微斗数全书》' });
    }
    if (ming.stars.some((s) => s.hua === '忌') && jiaPair(c, c.ming, '擎羊', '陀罗')) push({ name: '羊陀夹忌', level: 'caution', palaces: ['命宫'], required: ['化忌坐命', '擎羊陀罗夹命'], desc: '古云羊陀夹忌为败局。主劳碌奔波、坎坷不顺；以德行修养与踏实做事化解，凡事谨慎。', src: '《骨髓赋》' });
    else if (jiaPair(c, c.ming, '擎羊', '陀罗')) push({ name: '羊陀夹命', level: 'caution', palaces: ['命宫'], required: ['擎羊陀罗分居命宫前后（禄存坐命）'], desc: '有禄而受羊陀所夹，财禄稳定但易受小人掣肘，宜低调守成。', src: '《紫微斗数全书》' });
    if (jiaPair(c, c.ming, '火星', '铃星')) push({ name: '火铃夹命', level: 'caution', palaces: ['命宫'], required: ['火星铃星分居命宫前后'], desc: '性急易冲动，易有突发意外或纠纷，宜培养耐性、避免冲动决策。', src: '《紫微斗数全书》' });
    if (jiaPair(c, c.ming, '地空', '地劫')) push({ name: '空劫夹命', level: 'caution', palaces: ['命宫'], required: ['地空地劫分居命宫前后'], desc: '财来财去、思想脱俗，宜技艺、宗教、研究等不重物质之业。', src: '《紫微斗数全书》' });
    {
      const luP = where(c, '禄存');
      const huaLuP = c.palaces.find((p) => p.stars.some((s) => s.hua === '禄'));
      const broken = [luP, huaLuP].filter(Boolean).filter((p) => hasAny(p, KONG) || p.stars.some((s) => s.hua === '忌'));
      if (broken.length && broken.some((p) => inSf(c, p.branch))) push({ name: '禄逢冲破', level: 'caution', palaces: [...new Set(broken.map((p) => p.name))], required: ['禄星与空劫或化忌同宫，且在命宫三方四正'], desc: '禄遇冲破，吉处藏凶，得而复失；理财宜保守，不宜作保、借贷与高风险投资。', src: '《紫微斗数全书》' });
    }
    if (S.has('廉贞') && S.has('七杀') && S.has('擎羊')) push({ name: '廉杀羊', level: 'caution', palaces: ['命宫'], required: ['廉贞、七杀、擎羊会照命宫三方'], desc: '古书警示之格，主血光、官非、意外。本命有此组合不必惊慌，运限再触发时宜慎驾驶、避冲突、留意手术风险。', src: '《紫微斗数全书》' });
    if (S.has('巨门') && S.has('火星') && S.has('擎羊')) push({ name: '巨火羊', level: 'caution', palaces: ['命宫'], required: ['巨门、火星、擎羊会照命宫三方'], desc: '易因口舌、激烈冲突而招祸。宜修身养性、慎言慎行，避免极端情绪。', src: '《骨髓赋》' });
    if (S.has('铃星') && S.has('文昌') && S.has('陀罗') && S.has('武曲')) push({ name: '铃昌陀武', level: 'caution', palaces: ['命宫'], required: ['铃星、文昌、陀罗、武曲会照命宫三方'], desc: '古书凶格。本命有此组合不必恐慌，运限触发时宜高度警觉重大决策与情绪起伏。', src: '《骨髓赋》' });
    if (c.ming === 6 && has(ming, '擎羊')) {
      const bonus = [];
      if (S.has('七杀') || S.has('破军')) bonus.push('再会七杀或破军');
      if (S.has('天魁') || S.has('天钺')) bonus.push('魁钺加会');
      push({ name: '马头带箭', level: bonus.length ? 'good' : 'caution', palaces: ['命宫'], required: ['擎羊坐命于午'], bonus, desc: '古云威镇边疆。刚毅果决、有冲杀之力，宜军警、运动、外科；须防危险与意外。', src: '《骨髓赋》' });
    }
    {
      const sun = where(c, '太阳'), moon = where(c, '太阴');
      if (sun && moon && isDim(sun, '太阳') && isDim(moon, '太阴') && inSf(c, sun.branch) && inSf(c, moon.branch)) {
        const rescue = huaIn([sun, moon], '禄') || huaIn([sun, moon], '权') || huaIn([sun, moon], '科');
        push({ name: '日月反背', level: rescue ? 'neutral' : 'caution', palaces: [sun.name, moon.name], required: ['太阳太阴俱落陷且会照命宫三方'], bonus: rescue ? ['日月有吉化，反主奋发'] : [], desc: '日月失辉，劳心劳力、与父母缘薄或聚少离多；能勤奋自立者反能白手成家。', src: '《紫微斗数全书》' });
      }
    }

    const rank = { excellent: 0, good: 1, neutral: 2, caution: 3 };
    return out.sort((a, b) => rank[a.level] - rank[b.level]);
  }

  /* ══════════ 断语组织 ══════════ */
  const comboKey = (names) => {
    if (names.length < 2) return null;
    for (let i = 0; i < names.length; i++) for (let j = 0; j < names.length; j++) if (i !== j && Lore.COMBO[names[i] + names[j]]) return names[i] + names[j];
    return null;
  };

  /** 宫位的主星描述（含借宫） */
  function palaceCore(c, p) {
    const own = majors(p);
    const names = own.length ? own : (p.borrow?.stars || []);
    const borrowed = !own.length;
    const key = comboKey(names);
    return { names, borrowed, comboKey: key, combo: key ? Lore.COMBO[key] : null };
  }

  function mingSummary(c) {
    const ming = P(c, c.ming);
    const core = palaceCore(c, ming);
    let text = '';
    if (core.borrowed) text = `命宫无主星，借对宫${core.names.join('、') || '（亦空）'}论命。` + (core.combo || (core.names[0] ? Lore.STAR[core.names[0]].ming : '')) + '借来的星力量打折，个性更易随环境与人事而变。';
    else text = core.combo || Lore.STAR[core.names[0]].ming;
    const shenP = P(c, c.shen);
    return {
      core, text,
      shen: Lore.SHEN[shenP.name] || `身宫在${shenP.name}。`,
      ju: Lore.JU[c.ju],
      keys: core.names.map((n) => Lore.STAR[n]?.key).filter(Boolean),
    };
  }

  function huaCards(c) {
    return c.sihua.map((h) => {
      const p = P(c, h.branch);
      const opp = P(c, h.branch + 6);
      const s = star(p, h.star);
      return {
        hua: h.hua, star: h.star, palace: p.name, branch: p.branch, bright: s?.bright || '',
        text: Lore.HUA_TEXT[h.hua][p.name],
        clash: h.hua === '忌' ? `忌冲${opp.name}：${Lore.THEME[opp.name]}方面容易感到压力，是化忌的另一面。` : null,
      };
    });
  }

  function palaceDetail(c, branch) {
    const p = P(c, branch);
    const core = palaceCore(c, p);
    const lines = [];
    const sfp = sf(c, branch);
    if (p.isMing) lines.push(mingSummary(c).text);
    else if (core.names.length) {
      const special = Lore.IN_PALACE[p.name];
      const parts = core.names.map((n) => special?.[n] || `${n}（${Lore.STAR[n].key}）入${p.name}，${Lore.THEME[p.name]}带有${Lore.STAR[n].key.split('·')[0]}的色彩。`);
      if (core.borrowed) lines.push(`本宫无主星，借对宫${p.borrow.name}的${core.names.join('、')}来看，力量较弱。`);
      if (core.combo && !p.isMing) lines.push(core.combo);
      lines.push(...parts.filter((x, i, a) => a.indexOf(x) === i));
    } else lines.push('本宫与对宫皆无主星，以吉煞与四化论之。');
    if (p.name === '疾厄') core.names.forEach((n) => lines.push(`${n}属${Lore.STAR[n].wx}，健康上留意${Lore.STAR[n].organ}。`));
    const lucky = p.stars.filter((s) => s.type === 'lucky' || s.type === 'lu').map((s) => `${s.name}${Lore.LUCKY_TEXT[s.name] ? '：' + Lore.LUCKY_TEXT[s.name] : ''}`);
    const sha = p.stars.filter((s) => s.type === 'sha').map((s) => `${s.name}：${Lore.SHA_TEXT[s.name]}`);
    const hua = p.stars.filter((s) => s.hua).map((s) => ({ hua: s.hua, star: s.name, text: Lore.HUA_TEXT[s.hua][p.name] }));
    const oppJi = P(c, branch + 6).stars.find((s) => s.hua === '忌');
    const sfSha = shaCount(sfp, SHA6), sfLucky = sfp.reduce((n, q) => n + q.stars.filter((s) => s.type === 'lucky').length, 0);
    const huaInSf = ['禄', '权', '科', '忌'].filter((h) => huaIn(sfp, h));
    return {
      palace: p, core, read: Lore.READ[p.name], theme: Lore.THEME[p.name], lines, lucky, sha, hua,
      oppJi: oppJi ? `对宫${P(c, branch + 6).name}有${oppJi.name}化忌冲入，${Lore.THEME[p.name]}方面须多一分谨慎。` : null,
      sanfang: sfp.map((q) => ({ name: q.name, branch: q.branch, majors: majors(q) })),
      tally: { sha: sfSha, lucky: sfLucky, hua: huaInSf },
    };
  }

  function tone(c, b) {
    const sfp = sf(c, b);
    let s = 0;
    const self = P(c, b);
    for (const st of self.stars) {
      if (st.hua === '禄') s += 2; if (st.hua === '权' || st.hua === '科') s += 1; if (st.hua === '忌') s -= 2;
      if (st.type === 'lucky' || st.name === '禄存') s += 1; if (st.type === 'sha') s -= 1;
    }
    for (const q of sfp.slice(1)) for (const st of q.stars) {
      if (st.hua === '禄' || st.hua === '权' || st.hua === '科') s += 0.5; if (st.hua === '忌') s -= q.branch === mod(b + 6, 12) ? 1.5 : 0.5;
      if (st.type === 'lucky') s += 0.3; if (st.type === 'sha') s -= 0.4;
    }
    const level = s >= 2 ? '顺' : s <= -1.5 ? '慎' : '平';
    return { score: Math.round(s * 10) / 10, level };
  }

  function decadeReading(c, h) {
    const d = h.decade; if (!d) return null;
    const p = P(c, d.branch);
    const core = palaceCore(c, p);
    const out = [];
    out.push(Lore.DECADE_FOCUS[p.name]);
    if (core.names.length) out.push(`大限命宫${core.borrowed ? '借' : '坐'}${core.names.join('、')}：${core.names.map((n) => Lore.STAR[n].key).join('；')}，这十年做事风格带有此星的色彩。`);
    const natalHua = p.stars.filter((s) => s.hua);
    natalHua.forEach((s) => out.push(`本命${s.name}化${s.hua}在此，${s.hua === '忌' ? '这十年最执着、最费心的也正是这件事，宜正面面对、不宜逃避。' : `这十年得到${Lore.HUA_ESSENCE[s.hua]}的助力。`}`));
    const oppJi = P(c, d.branch + 6).stars.find((s) => s.hua === '忌');
    if (oppJi) out.push(`本命${oppJi.name}化忌在大限迁移宫冲入，这十年外部压力较大，宜稳扎稳打。`);
    const sfp = sf(c, d.branch);
    const sfHua = ['禄', '权', '科'].filter((x) => huaIn(sfp.slice(1), x) && !natalHua.some((s) => s.hua === x));
    if (sfHua.length) out.push(`三方会入本命化${sfHua.join('、化')}，${sfHua.includes('禄') ? '财源与机会可期' : '名声与掌控力有所增长'}。`);
    const shaIn = p.stars.filter((s) => s.type === 'sha').map((s) => s.name);
    if (shaIn.length) out.push(`大限命宫见${shaIn.join('、')}：${shaIn.map((n) => Lore.SHA_TEXT[n]).join('；')}。`);
    const fs = d.stars.filter((s) => s.branch === d.branch && ['运禄', '运羊', '运陀', '运马'].includes(s.name)).map((s) => s.name);
    if (fs.length) out.push(`运曜${fs.join('、')}入大限命宫。`);
    return { title: `${d.start}–${d.end} 岁 · 大限${d.gz}`, palaceName: p.name, lines: out, tone: tone(c, d.branch) };
  }

  function yearReading(c, h) {
    const y = h.year; if (!y) return null;
    const p = P(c, y.branch);
    const core = palaceCore(c, p);
    const out = [];
    out.push(Lore.YEAR_FOCUS[p.name]);
    if (h.decade) out.push(`流年命宫叠大限${h.decade.names[y.branch]}${h.decade.names[y.branch] === '命宫' ? '，大限与流年同步，今年是这十年的关键年' : ''}。`);
    if (core.names.length) out.push(`流年命宫${core.borrowed ? '借' : '坐'}${core.names.join('、')}。`);
    p.stars.filter((s) => s.hua).forEach((s) => out.push(`本命${s.name}化${s.hua}在流年命宫，今年${s.hua === '忌' ? '容易为此事执着烦心，宜放下得失心。' : `${Lore.HUA_ESSENCE[s.hua]}之事较多。`}`));
    const oppJi = P(c, y.branch + 6).stars.find((s) => s.hua === '忌');
    if (oppJi) out.push(`本命化忌在流年迁移冲命，今年外出与人际宜谨慎。`);
    const lu = y.stars.find((s) => s.name === '流禄'), yang = y.stars.find((s) => s.name === '流羊'), tuo = y.stars.find((s) => s.name === '流陀');
    out.push(`流禄在${y.names[lu.branch]}（本命${P(c, lu.branch).name}），今年的进益多从这里来；流羊在${y.names[yang.branch]}、流陀在${y.names[tuo.branch]}，是今年的阻力所在。`);
    if (y.xiaoxian != null) out.push(`小限在本命${P(c, y.xiaoxian).name}。`);
    return { title: `${y.year} ${y.gz}年 · 虚岁 ${h.age}`, palaceName: p.name, lines: out, tone: tone(c, y.branch) };
  }

  function health(c) {
    const ji = P(c, c.palaces.find((p) => p.name === '疾厄').branch);
    const core = palaceCore(c, ji);
    const lines = [];
    const ju = Lore.JU[c.ju];
    lines.push({ k: '五行局', v: `${c.juName}（${c.nayin}）。${ju.text}` });
    if (core.names.length) lines.push({ k: '疾厄主星', v: core.names.map((n) => `${n}（${Lore.STAR[n].wx}）：留意${Lore.STAR[n].organ}`).join('；') + (core.borrowed ? '（借对宫星，力量较弱）' : '') + '。' });
    const shaIn = ji.stars.filter((s) => s.type === 'sha');
    if (shaIn.length) lines.push({ k: '疾厄见煞', v: shaIn.map((s) => `${s.name}主${Lore.SHA_HEALTH[s.name]}`).join('；') + '。' });
    const jiStar = c.sihua.find((x) => x.hua === '忌');
    const jiWx = (Lore.STAR[jiStar.star]?.wx || (jiStar.star === '文昌' ? '阳金' : jiStar.star === '文曲' ? '阴水' : '')).slice(-1);
    if (jiWx) lines.push({ k: '化忌之星', v: `生年${jiStar.star}化忌，${jiStar.star}五行属${jiWx}，对应${Lore.ORGAN[jiWx]}，是一生需要长期照顾的系统。` });
    const huaJi = ji.stars.filter((s) => s.hua);
    huaJi.forEach((s) => lines.push({ k: `化${s.hua}在疾厄`, v: Lore.HUA_TEXT[s.hua]['疾厄'] }));
    const mingCore = palaceCore(c, P(c, c.ming));
    if (mingCore.names[0]) lines.push({ k: '命宫本气', v: `命宫${mingCore.names.join('、')}，本气属${mingCore.names.map((n) => Lore.STAR[n].wx).join('、')}；个性与体质互为表里，情绪失衡时先伤${Lore.ORGAN[Lore.STAR[mingCore.names[0]].wx.slice(-1)].split('、')[0]}。` });
    return { palace: ji, lines };
  }

  /** 给 AI 的命盘文本 */
  function chartText(c, h, patterns) {
    const L = [];
    const t = c.time;
    const inp = c.input;
    L.push(`【基本】${inp.name || '命主'}，${c.isYang ? '阳' : '阴'}${inp.gender === 'male' ? '男' : '女'}，${Cal.gz(c.lunarYear - 4)}年${Cal.lunarText(c.lunar)} ${ZW.HOURS[c.hour]}时；${c.juName}（${c.nayin}）；命主${c.mingZhu}，身主${c.shenZhu}；命宫${BRANCHES[c.ming]}，身宫${BRANCHES[c.shen]}（在${P(c, c.shen).name}）。`);
    L.push(`【八字】${c.bazi.year} ${c.bazi.month} ${c.bazi.day} ${c.bazi.hour}`);
    L.push(`【生年四化】${c.sihua.map((x) => `${x.star}化${x.hua}在${P(c, x.branch).name}`).join('；')}`);
    L.push('【十二宫】');
    for (let i = 0; i < 12; i++) {
      const p = P(c, c.ming - i);
      const stars = p.stars.filter((s) => s.type !== 'minor' || ZW.CORE_MINOR.includes(s.name)).map((s) => `${s.name}${s.bright ? '(' + s.bright + ')' : ''}${s.hua ? '化' + s.hua : ''}`).join('、') || '无';
      L.push(`${p.name}（${STEMS[p.stem]}${BRANCHES[p.branch]}，大限${p.daxian[0]}-${p.daxian[1]}${p.isShen ? '，身宫' : ''}）：${stars}${p.isEmpty ? `；空宫借对宫${p.borrow.stars.join('、')}` : ''}`);
    }
    if (patterns.length) L.push(`【格局】${patterns.map((x) => `${x.name}${x.breaking?.length ? '（破：' + x.breaking.join('，') + '）' : ''}`).join('；')}`);
    if (h?.decade) L.push(`【当前大限】${h.decade.start}-${h.decade.end}岁，大限命宫在本命${P(c, h.decade.branch).name}（${h.decade.gz}）`);
    if (h?.year) L.push(`【流年】${h.year.year}年${h.year.gz}，虚岁${h.age}，流年命宫在本命${P(c, h.year.branch).name}，叠大限${h.decade?.names[h.year.branch] || ''}`);
    return L.join('\n');
  }

  return { detectPatterns, mingSummary, huaCards, palaceDetail, decadeReading, yearReading, health, chartText, palaceCore, tone, sf };
})();

if (typeof module !== 'undefined') module.exports = Reading;
