/* ══════════════════════════════════════════════════════════════
 * App · 界面
 * ══════════════════════════════════════════════════════════════ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { BRANCHES, STEMS, MONTH_CN, DAY_CN, mod } = Cal;
  const pad = (n) => String(n).padStart(2, '0');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('zhenyi.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('zhenyi.' + k, JSON.stringify(v)); } catch { /* 存储不可用时忽略 */ } },
  };

  // 宫位在 SVG 中的连线端点（中宫内沿）
  const POS = { 5: [25, 25], 6: [37.5, 25], 7: [62.5, 25], 8: [75, 25], 9: [75, 37.5], 10: [75, 62.5], 11: [75, 75], 0: [62.5, 75], 1: [37.5, 75], 2: [25, 75], 3: [25, 62.5], 4: [25, 37.5] };
  const TZ_LIST = [-8, -7, -6, -5, -4, -3, 0, 1, 2, 3, 4, 5, 5.5, 6, 7, 8, 9, 9.5, 10, 12];

  const defaults = { dst: 'auto', trueSolar: 'full', zi: 'next', leap: 'split', yearDivide: 'lunar', minor: 'core', gods: 'on', flowHua: 'off' };
  const S = {
    gender: 'male', calendar: 'solar', timeMode: 'clock', lon: null, tz: 8, city: null,
    settings: { ...defaults, ...store.get('settings', {}) },
    chart: null, patterns: [], horo: null, sel: {}, selPalace: null, tab: 'summary', editing: false,
    sample: null, downloads: null, ai: { running: false, ctl: null, text: '', turns: [], qa: [] },
  };
  const today = new Date();
  const todayLunar = Cal.solarToLunar(today.getFullYear(), today.getMonth() + 1, today.getDate());

  /* ─────────── theme ─────────── */
  const applyTheme = (t) => { if (t) document.documentElement.setAttribute('data-theme', t); };
  applyTheme(store.get('theme', null));
  $('#btnTheme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next); store.set('theme', next);
  });

  /* ─────────── board skeleton ─────────── */
  const board = $('#board'), heart = $('#heart'), linesSvg = $('#lines');
  const palEls = [];
  for (let b = 0; b < 12; b++) {
    const el = document.createElement('div');
    el.className = 'palace';
    el.style.gridArea = 'p' + b;
    el.dataset.b = b;
    el.innerHTML = `<span class="ghost" aria-hidden="true">${BRANCHES[b]}</span><div class="body"></div>`;
    el.addEventListener('click', () => selectPalace(b));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPalace(b); } });
    board.insertBefore(el, heart);
    palEls[b] = el;
  }

  /* ─────────── form ─────────── */
  const form = $('#formTpl').content.firstElementChild.cloneNode(true);
  const F = (id) => form.querySelector('#' + id);
  const fYear = F('fYear'), fMonth = F('fMonth'), fDay = F('fDay'), fTime = F('fTime'), fBranch = F('fBranch'), fPlace = F('fPlace'), fName = F('fName'), fLeap = F('fLeap');
  for (let y = 1900; y <= 2100; y++) fYear.add(new Option(`${y} 年`, y));
  fYear.value = 1990;
  const branchOpts = [['0', '早子时 00–01'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => [String(i), `${ZW.HOURS[i]}时 ${ZW.HOUR_RANGE[i]}`]), ['12', '晚子时 23–24']];
  branchOpts.forEach(([v, t]) => fBranch.add(new Option(t, v)));
  fBranch.value = '6';
  const dl = form.querySelector('#cityList');
  dl.innerHTML = CITIES.map((c) => `<option value="${c.name}">${c.prov} ${c.lon > 0 ? '东经' : '西经'} ${Math.abs(c.lon).toFixed(2)}°</option>`).join('');

  function fillMonths() {
    const keep = fMonth.value;
    fMonth.innerHTML = '';
    for (let m = 1; m <= 12; m++) fMonth.add(new Option(S.calendar === 'solar' ? `${m} 月` : `${MONTH_CN[m - 1]}月`, m));
    fMonth.value = keep || 1;
  }
  function fillDays() {
    const y = +fYear.value, m = +fMonth.value, keep = +fDay.value || 1;
    let n;
    if (S.calendar === 'solar') n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    else n = fLeap.checked && Cal.leapMonth(y) === m ? Cal.leapDays(y) : Cal.monthDays(y, m);
    fDay.innerHTML = '';
    for (let d = 1; d <= n; d++) fDay.add(new Option(S.calendar === 'solar' ? `${d} 日` : DAY_CN(d), d));
    fDay.value = Math.min(keep, n);
  }
  function syncLeap() {
    const wrap = form.querySelector('#leapWrap');
    const lm = Cal.leapMonth(+fYear.value);
    const show = S.calendar === 'lunar' && lm === +fMonth.value;
    wrap.hidden = !show;
    if (!show) fLeap.checked = false;
  }
  fillMonths(); fMonth.value = 1; fillDays();
  fYear.addEventListener('change', () => { syncLeap(); fillDays(); });
  fMonth.addEventListener('change', () => { syncLeap(); fillDays(); });
  fLeap.addEventListener('change', fillDays);

  form.querySelectorAll('[data-gender]').forEach((b) => b.addEventListener('click', () => {
    S.gender = b.dataset.gender;
    form.querySelectorAll('[data-gender]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  form.querySelectorAll('[data-cal]').forEach((b) => b.addEventListener('click', () => {
    if (S.calendar === b.dataset.cal) return;
    // 切换历法时换算当前日期
    try {
      if (b.dataset.cal === 'lunar') { const l = Cal.solarToLunar(+fYear.value, +fMonth.value, +fDay.value); S.calendar = 'lunar'; fillMonths(); fYear.value = l.year; fMonth.value = l.month; syncLeap(); fLeap.checked = l.isLeap; fillDays(); fDay.value = l.day; }
      else { const s = Cal.lunarToSolar(+fYear.value, +fMonth.value, +fDay.value, fLeap.checked); S.calendar = 'solar'; fillMonths(); fYear.value = s.y; fMonth.value = s.m; syncLeap(); fillDays(); fDay.value = s.d; }
    } catch { S.calendar = b.dataset.cal; fillMonths(); syncLeap(); fillDays(); }
    form.querySelectorAll('[data-cal]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  const setTimeMode = (m) => { S.timeMode = m; form.querySelector('#rowClock').hidden = m !== 'clock'; form.querySelector('#rowBranch').hidden = m !== 'branch'; };
  F('toBranch').addEventListener('click', () => setTimeMode('branch'));
  F('toClock').addEventListener('click', () => setTimeMode('clock'));

  function matchCity(v) {
    const t = v.trim().replace(/(市|县|区)$/, '');
    if (!t) return null;
    return CITIES.find((c) => c.name === t) || CITIES.find((c) => c.name.startsWith(t)) || null;
  }
  function updateLonNote() {
    const note = F('lonNote');
    const lon = S.lon ?? 120;
    const tzTxt = `UTC${S.tz >= 0 ? '+' : ''}${S.tz}`;
    if (S.city) note.textContent = `${S.city.prov === '海外' ? '' : S.city.prov + ' '}${S.city.name}：${lon >= 0 ? '东经' : '西经'} ${Math.abs(lon).toFixed(2)}°，${tzTxt}`;
    else if (S.lon != null) note.textContent = `手动经度 ${lon.toFixed(2)}°，${tzTxt}`;
    else note.textContent = fPlace.value.trim() ? '没有找到这个城市，暂按东经 120° 计算；可在「校时与显示」里填写经度' : '未选城市时按东经 120° 计算';
  }
  fPlace.addEventListener('input', () => {
    const c = matchCity(fPlace.value);
    S.city = c && (c.name === fPlace.value.trim().replace(/(市|县|区)$/, '')) ? c : (fPlace.value.trim().length >= 2 ? c : null);
    if (S.city) { S.lon = S.city.lon; S.tz = S.city.tz; $('#sLon').value = S.lon; $('#sTz').value = String(S.tz); }
    else if (!fPlace.value.trim()) { S.lon = null; $('#sLon').value = ''; }
    updateLonNote();
  });

  form.addEventListener('submit', (e) => { e.preventDefault(); compute(true); });

  /* 表单位置：桌面在中宫，手机在命盘之上 */
  const mq = matchMedia('(max-width: 760px)');
  const isMobile = () => mq.matches;
  function placeForm() {
    const slot = $('#mobileFormSlot');
    if (isMobile()) { slot.appendChild(form); slot.hidden = !!S.chart && !S.editing; }
    renderHeart();
  }
  mq.addEventListener('change', placeForm);

  /* ─────────── settings dialog ─────────── */
  const dlgSet = $('#dlgSettings'), dlgSaved = $('#dlgSaved');
  TZ_LIST.forEach((t) => $('#sTz').add(new Option(`UTC${t >= 0 ? '+' : ''}${t}${t === 8 ? '（北京时间）' : ''}`, String(t))));
  $('#sTz').value = '8';
  const setMap = { sDst: 'dst', sTrue: 'trueSolar', sZi: 'zi', sLeap: 'leap', sYear: 'yearDivide', vMinor: 'minor', vGods: 'gods', vFlowHua: 'flowHua' };
  for (const [id, key] of Object.entries(setMap)) {
    const el = $('#' + id);
    el.value = S.settings[key];
    el.addEventListener('change', () => {
      S.settings[key] = el.value; store.set('settings', S.settings);
      if (['minor', 'gods', 'flowHua'].includes(key)) { renderBoard(false); renderPanel(); } else if (S.chart) compute(false);
    });
  }
  $('#sLon').addEventListener('change', () => {
    const v = parseFloat($('#sLon').value);
    S.lon = Number.isFinite(v) ? Math.max(-180, Math.min(180, v)) : null;
    S.city = S.city && S.city.lon === S.lon ? S.city : null;
    updateLonNote(); if (S.chart) compute(false);
  });
  $('#sTz').addEventListener('change', () => { S.tz = parseFloat($('#sTz').value); updateLonNote(); if (S.chart) compute(false); });
  $('#btnSettings').addEventListener('click', () => dlgSet.showModal());
  $('#btnSaved').addEventListener('click', () => { renderSaved(); dlgSaved.showModal(); });
  $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ─────────── compute ─────────── */
  function readInput() {
    const [hh, mi] = (fTime.value || '12:00').split(':').map(Number);
    const st = S.settings;
    return {
      name: fName.value.trim(), gender: S.gender, calendar: S.calendar,
      year: +fYear.value, month: +fMonth.value, day: +fDay.value, isLeapMonth: S.calendar === 'lunar' && fLeap.checked,
      timeMode: S.timeMode, hour: hh, minute: mi, branch: +fBranch.value,
      longitude: S.lon ?? 120, tz: S.tz, place: S.city ? S.city.name : fPlace.value.trim(),
      dst: st.dst === 'auto' ? 'auto' : st.dst === 'on',
      trueSolar: st.trueSolar !== 'off', eot: st.trueSolar === 'full',
      lateZiNextDay: st.zi === 'next', leapMode: st.leap, yearDivide: st.yearDivide,
    };
  }

  function compute(fresh) {
    const err = F('formErr');
    err.textContent = '';
    let chart;
    try { chart = ZW.generate(readInput()); }
    catch (e) { err.textContent = e.message || '无法起盘，请检查日期与时间'; return; }
    const first = !S.chart;
    S.chart = chart;
    S.patterns = Reading.detectPatterns(chart);
    if (fresh) { S.sel = {}; S.selPalace = chart.ming; S.ai = { running: false, ctl: null, text: '', turns: [], qa: [] }; }
    S.editing = false;
    updateHoro();
    renderBoard(fresh || first);
    placeForm();
    renderNotices();
    renderTimeline();
    renderTabs();
    renderPanel();
    if (fresh) { saveRecent(); if (isMobile()) board.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function updateHoro() {
    const c = S.chart;
    if (!c) return;
    const sel = S.sel;
    S.horo = (sel.decade != null || sel.year != null) ? ZW.horoscope(c, sel) : null;
    const age = todayLunar.year - c.lunarYear + 1;
    S.nowHoro = ZW.horoscope(c, { year: todayLunar.year });
    S.nowAge = age;
  }

  /* ─────────── board render ─────────── */
  function starHtml(s, fl) {
    const chars = [...s.name].map((ch) => `<b>${ch}</b>`).join('');
    const bl = s.bright ? `<i class="${ZW.brightLevel(s.bright) === 2 ? 'hi' : ''}">${s.bright}</i>` : '';
    const hua = s.hua ? `<em class="hua ${s.hua}" title="生年化${s.hua}">${s.hua}</em>` : '';
    const fh = (fl[s.name] || []).map((x) => `<em class="fhua ${x.hua}">${x.tag}${x.hua}</em>`).join('');
    return `<span class="st ${s.type}" title="${s.name}${s.bright ? ' ' + s.bright : ''}${s.hua ? ' 化' + s.hua : ''}">${chars}${bl}${hua}${fh}</span>`;
  }

  function renderBoard(reveal) {
    const c = S.chart;
    board.classList.toggle('filled', !!c);
    if (!c) return;
    const st = S.settings, h = S.horo;
    const curDx = ZW.daxianAtAge(c, S.nowAge);
    for (let b = 0; b < 12; b++) {
      const p = c.palaces[b];
      const el = palEls[b];
      el.classList.toggle('ming', p.isMing);
      el.style.setProperty('--i', String(mod(c.ming - b, 12)));
      // 运限四化（可选）
      const fl = {};
      if (h && st.flowHua === 'on') for (const L of h.layers) for (const x of L.hua) (fl[x.star] ||= []).push({ tag: L.tag, hua: x.hua });
      const cols = p.stars.filter((s) => s.type !== 'minor').map((s) => starHtml(s, fl)).join('');
      let minors = [];
      if (st.minor === 'core') minors = p.stars.filter((s) => ZW.CORE_MINOR.includes(s.name));
      else if (st.minor === 'all') minors = p.stars.filter((s) => s.type === 'minor');
      const minorHtml = minors.length ? `<div class="minors">${minors.map((s) => `<span>${s.name}${fl[s.name] ? fl[s.name].map((x) => x.tag + x.hua).join('') : ''}</span>`).join('')}</div>` : '<div class="minors"></div>';
      let tags = '', flows = '';
      if (h) {
        tags = h.layers.map((L) => `<span class="${L.scope}">${L.tag}${ZW.SHORT[ZW.PALACES.indexOf(L.names[b])]}</span>`).join('');
        const fs = [];
        if (h.decade) h.decade.stars.filter((x) => x.branch === b).forEach((x) => fs.push(`<span class="decade${/羊|陀/.test(x.base) ? ' bad' : ''}">${x.name}</span>`));
        if (h.year) h.year.stars.filter((x) => x.branch === b).forEach((x) => fs.push(`<span class="year${/羊|陀/.test(x.base) ? ' bad' : ''}">${x.name}</span>`));
        flows = fs.length ? `<div class="flows">${fs.join('')}</div>` : '';
      }
      const extra = st.gods === 'on' ? `<div class="extra"><span>${p.changsheng}</span><span>${p.boshi}</span></div>` : '';
      const isNowDx = curDx && curDx.branch === b;
      el.querySelector('.body').innerHTML = `
        <div class="stars">${cols || (p.isEmpty && p.borrow.stars.length ? `<span class="st minor" title="空宫借对宫"><b>借</b>${p.borrow.stars.map((n) => `<b>${n[0]}</b>`).join('')}</span>` : '')}</div>
        ${minorHtml}${flows}${tags ? `<div class="tags">${tags}</div>` : ''}${extra}
        <div class="foot"><span class="dx${isNowDx ? ' now' : ''}">${p.daxian[0]}–${p.daxian[1]}</span><span class="pname">${p.name}${p.isShen ? '<span class="shen" title="身宫">身</span>' : ''}</span><span class="gz">${STEMS[p.stem]}${BRANCHES[p.branch]}</span></div>`;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${p.name}，${STEMS[p.stem]}${BRANCHES[p.branch]}宫，${p.stars.filter((s) => s.type !== 'minor').map((s) => s.name + (s.hua ? '化' + s.hua : '')).join('、') || '无主星'}`);
    }
    if (reveal && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      board.classList.remove('reveal'); void board.offsetWidth; board.classList.add('reveal');
      setTimeout(() => board.classList.remove('reveal'), 1400);
    }
    renderLines();
  }

  function renderLines() {
    const c = S.chart;
    if (!c || S.selPalace == null) { linesSvg.innerHTML = ''; palEls.forEach((e) => e.classList.remove('sf', 'sel')); return; }
    const b = S.selPalace;
    const sf = [b, mod(b + 4, 12), mod(b + 8, 12)], opp = mod(b + 6, 12);
    palEls.forEach((e, i) => { e.classList.toggle('sel', i === b); e.classList.toggle('sf', i !== b && (sf.includes(i) || i === opp)); });
    const L = (a, z, cls = '') => `<line class="${cls}" x1="${POS[a][0]}" y1="${POS[a][1]}" x2="${POS[z][0]}" y2="${POS[z][1]}"/>`;
    const hasJi = c.palaces[b].stars.some((s) => s.hua === '忌') || c.palaces[opp].stars.some((s) => s.hua === '忌');
    linesSvg.innerHTML = L(sf[0], sf[1]) + L(sf[1], sf[2]) + L(sf[2], sf[0]) + L(b, opp, hasJi ? 'jichong' : 'opp')
      + [b, ...sf.slice(1), opp].map((x) => `<circle cx="${POS[x][0]}" cy="${POS[x][1]}" r="0.6"/>`).join('');
  }

  function selectPalace(b) {
    if (!S.chart) return;
    S.selPalace = b;
    renderLines();
    S.tab = 'palace';
    renderTabs(); renderPanel();
    if (window.innerWidth <= 1080) $('#reading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ─────────── heart ─────────── */
  function fmtMin(m) { const s = m < 0 ? '−' : '+'; const a = Math.abs(m); return `${s}${Math.floor(a)}′${pad(Math.round((a % 1) * 60))}″`; }
  function renderHeart() {
    const c = S.chart;
    if (!isMobile() && (!c || S.editing)) {
      heart.innerHTML = '';
      heart.appendChild(form);
      if (c) { const back = document.createElement('button'); back.type = 'button'; back.className = 'link'; back.textContent = '返回命盘'; back.style.marginTop = '8px'; back.onclick = () => { S.editing = false; renderHeart(); }; heart.appendChild(back); }
      return;
    }
    if (!c) { heart.innerHTML = `<div class="heart-empty"><div class="mk">紫微</div><p>在上方填写出生资料后起盘</p></div>`; return; }
    const t = c.time, inp = c.input;
    const name = inp.name || (inp.gender === 'male' ? '乾造' : '坤造');
    const clock = t.mode === 'clock' ? `${t.clock.y}-${pad(t.clock.m)}-${pad(t.clock.d)} ${pad(t.clock.hh)}:${pad(t.clock.mi)}${t.dstApplied ? ' <small>夏令时</small>' : ''}` : `${t.civil.y}-${pad(t.civil.m)}-${pad(t.civil.d)} <small>按时辰</small>`;
    const solar = t.mode === 'clock' && inp.trueSolar !== false ? `${t.solar.y}-${pad(t.solar.m)}-${pad(t.solar.d)} ${pad(Math.floor(t.solar.minutes / 60))}:${pad(t.solar.minutes % 60)} <small>经度${fmtMin(t.lonMin)} 均时差${fmtMin(t.eotMin)}</small>` : '';
    const dx = ZW.daxianAtAge(c, S.nowAge);
    const yh = S.nowHoro?.year;
    heart.innerHTML = `
      <h2 class="who"><strong>${esc(name)}</strong><span>${c.isYang ? '阳' : '阴'}${inp.gender === 'male' ? '男' : '女'}　${c.juName}　${c.nayin}</span></h2>
      <dl class="facts">
        <dt>${t.mode === 'clock' ? '钟表' : '公历'}</dt><dd>${clock}${inp.place ? ` <small>${esc(inp.place)}</small>` : ''}</dd>
        ${solar ? `<dt>真太阳</dt><dd>${solar}</dd>` : ''}
        <dt>农历</dt><dd>${Cal.gz(c.lunarYear - 4)}年 ${Cal.lunarText(c.lunar)} ${ZW.HOURS[c.hour]}时</dd>
        <dt>八字</dt><dd class="pillars">${c.bazi.year} ${c.bazi.month} ${c.bazi.day} ${c.bazi.hour}</dd>
        <dt>命主</dt><dd>${c.mingZhu}　<span style="color:var(--ink-3)">身主</span> ${c.shenZhu}</dd>
        ${dx ? `<dt>当前</dt><dd>大限 ${dx.start}–${dx.end} 岁（${dx.natalName}）<br>流年 ${todayLunar.year} ${yh.gz}，虚岁 ${S.nowAge}</dd>` : ''}
      </dl>
      <div class="heart-actions">
        <button type="button" class="ghost-btn" data-act="edit">修改资料</button>
        <button type="button" class="ghost-btn" data-act="save">存为命例</button>
        <button type="button" class="ghost-btn" data-act="png">导出图片</button><button type="button" class="ghost-btn" data-act="json">导出数据</button>
      </div>`;
    heart.querySelector('[data-act="edit"]').onclick = () => { S.editing = true; if (isMobile()) { $('#mobileFormSlot').hidden = false; $('#mobileFormSlot').scrollIntoView({ behavior: 'smooth' }); } renderHeart(); };
    heart.querySelector('[data-act="save"]').onclick = (e) => { saveRecent(true); e.target.textContent = '已存为命例'; };
    heart.querySelector('[data-act="png"]')?.addEventListener('click', exportPng);
    heart.querySelector('[data-act="json"]')?.addEventListener('click', exportJson);
  }

  /* ─────────── notices ─────────── */
  function renderNotices() {
    const c = S.chart, box = $('#notices');
    if (!c) { box.innerHTML = ''; return; }
    const items = c.warnings.map((w) => ({ text: w }));
    if (c.time.mode === 'clock' && c.time.boundaryMinutes != null && c.time.boundaryMinutes <= 10) {
      const near = (c.time.solar.minutes % 120) >= 60 ? 1 : -1; // 交界在后/前
      const alt = mod(c.hour + (mod(c.time.solar.minutes - 60, 120) > 60 ? 1 : -1), 12);
      void near;
      items[0] && (items[0].alt = alt);
      if (!items[0]) items.push({ text: '', alt });
    }
    if (c.time.isLateZi) items.push({ text: S.settings.zi === 'next' ? '出生在 23 点之后（晚子时），已按次日子时排盘；如你的门派晚子时不换日，可在「校时与显示」中修改。' : '出生在 23 点之后（晚子时），按当日排盘。' });
    box.innerHTML = items.filter((x) => x.text).map((x) => `<div class="notice">${esc(x.text)}${x.alt != null ? ` <button class="link alt" data-alt="${x.alt}">看${ZW.HOURS[x.alt]}时的命盘</button>` : ''}</div>`).join('');
    box.querySelectorAll('[data-alt]').forEach((b) => b.addEventListener('click', () => {
      setTimeMode('branch'); fBranch.value = b.dataset.alt === '0' && c.time.isLateZi ? '12' : b.dataset.alt; compute(true);
    }));
  }

  /* ─────────── timeline ─────────── */
  function renderTimeline() {
    const c = S.chart, nav = $('#timeline');
    if (!c) { nav.hidden = true; return; }
    nav.hidden = false;
    const sel = S.sel, h = S.horo;
    const selDx = h?.decade?.index;
    const dxChips = c.daxian.filter((d) => d.start <= 120).map((d) => `<button type="button" class="chip${S.nowAge >= d.start && S.nowAge <= d.end ? ' now' : ''}" aria-pressed="${selDx === d.index}" data-dx="${d.index}">${d.start}–${d.end}<small>${d.natalName} ${STEMS[d.stem]}${BRANCHES[d.branch]}</small></button>`).join('');
    let html = `<div class="tl-row"><span>大限</span><div class="chips"><button type="button" class="chip" aria-pressed="${!h}" data-natal>本命<small>原局</small></button>${dxChips}</div></div>`;
    if (h?.decade) {
      const d = h.decade;
      const yrs = [];
      for (let a = d.start; a <= d.end; a++) { const y = c.lunarYear + a - 1; if (y > 2100) break; yrs.push(`<button type="button" class="chip${y === todayLunar.year ? ' now' : ''}" aria-pressed="${sel.year === y}" data-year="${y}">${y}<small>${Cal.gz(y - 4)} ${a}岁</small></button>`); }
      html += `<div class="tl-row"><span>流年</span><div class="chips">${yrs.join('')}</div></div>`;
    }
    if (sel.year != null) {
      const ms = [];
      for (let m = 1; m <= 12; m++) ms.push(`<button type="button" class="chip${sel.year === todayLunar.year && m === todayLunar.month ? ' now' : ''}" aria-pressed="${sel.month === m}" data-month="${m}">${MONTH_CN[m - 1]}月<small>${STEMS[mod(Cal.yinStem(mod(sel.year - 4, 10)) + m - 1, 10)]}${BRANCHES[mod(m + 1, 12)]}</small></button>`);
      html += `<div class="tl-row"><span>流月</span><div class="chips">${ms.join('')}</div></div>`;
    }
    if (sel.month != null) {
      const n = Cal.monthDays(sel.year, sel.month);
      const ds = [];
      for (let d = 1; d <= n; d++) ds.push(`<button type="button" class="chip" aria-pressed="${sel.day === d}" data-day="${d}">${DAY_CN(d)}</button>`);
      html += `<div class="tl-row"><span>流日</span><div class="chips">${ds.join('')}</div></div>`;
    }
    nav.innerHTML = html;
    nav.querySelector('[data-natal]').onclick = () => setSel({});
    nav.querySelectorAll('[data-dx]').forEach((b) => b.onclick = () => setSel({ decade: +b.dataset.dx }));
    nav.querySelectorAll('[data-year]').forEach((b) => b.onclick = () => setSel({ decade: selDx, year: +b.dataset.year }));
    nav.querySelectorAll('[data-month]').forEach((b) => b.onclick = () => setSel({ ...S.sel, month: +b.dataset.month, day: undefined }));
    nav.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => setSel({ ...S.sel, day: +b.dataset.day }));
    // 只横向滚动芯片条，不牵动页面
    nav.querySelectorAll('.chips').forEach((row) => {
      const on = row.querySelector('[aria-pressed="true"]') || row.querySelector('.now');
      if (on) row.scrollLeft = on.offsetLeft - row.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
    });
  }
  function setSel(sel) {
    if (sel.year != null) delete sel.decade;
    for (const k of Object.keys(sel)) if (sel[k] == null) delete sel[k];
    S.sel = sel;
    updateHoro();
    const layer = S.horo?.layers?.at(-1);
    if (layer) S.selPalace = layer.branch;
    renderBoard(false); renderTimeline();
    if (S.horo) S.tab = 'luck';
    renderTabs(); renderPanel();
  }

  /* ─────────── reading panel ─────────── */
  const TABS = [['summary', '总论'], ['palace', '宫位'], ['pattern', '格局'], ['hua', '四化'], ['luck', '运限'], ['health', '体质'], ['ai', 'AI 解盘']];
  function renderTabs() {
    const box = $('#tabs');
    if (!S.chart) { box.innerHTML = ''; return; }
    box.innerHTML = TABS.filter(([k]) => k !== 'ai' || S.sample).map(([k, t]) => `<button class="tab" role="tab" aria-selected="${S.tab === k}" data-tab="${k}">${t}</button>`).join('');
    box.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { S.tab = b.dataset.tab; renderTabs(); renderPanel(); $('#panel').scrollTop = 0; });
  }
  const huaBadge = (h) => `<em class="hua ${h}">${h}</em>`;
  const lvlName = { excellent: '上格', good: '吉格', neutral: '中性', caution: '警示' };

  function renderPanel() {
    const panel = $('#panel');
    const c = S.chart;
    if (!c) {
      panel.innerHTML = `<h2>读盘心法</h2><p class="muted">本系统按倪海厦《天纪》的读盘立场组织断语。起盘之后，这里会依次给出总论、宫位、格局、四化、运限与体质分析。</p>
        ${Lore.PRINCIPLES.map(([h, p]) => `<div class="principle"><h4>${h}</h4><p>${p}</p></div>`).join('')}
        <p class="disclaimer">排盘引擎为自研实现：历法由天文算法推得并与通行历表逐年核对，时辰按出生地真太阳时（经度时差加均时差）判定。命理解读仅供参考。</p>`;
      return;
    }
    const fn = { summary: pSummary, palace: pPalace, pattern: pPattern, hua: pHua, luck: pLuck, health: pHealth, ai: pAi }[S.tab] || pSummary;
    panel.innerHTML = fn(c);
    if (S.tab === 'ai') wireAi();
    panel.querySelectorAll('[data-goto]').forEach((a) => a.onclick = () => { S.tab = a.dataset.goto; renderTabs(); renderPanel(); });
    panel.querySelectorAll('[data-pal]').forEach((a) => a.onclick = () => selectPalace(+a.dataset.pal));
  }

  function pSummary(c) {
    const m = Reading.mingSummary(c);
    const ming = c.palaces[c.ming];
    const title = m.core.borrowed ? `命无正曜，借${m.core.names.join('、') || '对宫'}` : `${m.core.names.join('、')}坐命`;
    const top = S.patterns.filter((p) => p.level !== 'neutral').slice(0, 5);
    return `<h2>${title}<span class="muted" style="font-weight:400;font-size:14px"> 于${STEMS[ming.stem]}${BRANCHES[ming.branch]}宫</span></h2>
      <div class="keys">${m.keys.map((k) => `<span>${k}</span>`).join('')}</div>
      <p class="lead">${m.text}</p>
      <dl class="kv">
        <dt>身宫</dt><dd>${m.shen}</dd>
        <dt>五行局</dt><dd>${c.juName}（${c.nayin}）。${m.ju.text}</dd>
        <dt>命主身主</dt><dd>命主${c.mingZhu}，身主${c.shenZhu}。</dd>
      </dl>
      <h3>生年四化</h3>
      ${c.sihua.map((h) => `<p>${huaBadge(h.hua)} ${h.star}化${h.hua}入<a href="javascript:void 0" data-pal="${h.branch}">${c.palaces[h.branch].name}</a>：${Lore.HUA_TEXT[h.hua][c.palaces[h.branch].name]}</p>`).join('')}
      <h3>主要格局</h3>
      ${top.length ? top.map((p) => `<p><span class="lvl ${p.level}">${lvlName[p.level]}</span> <b>${p.name}</b>　<span class="muted">${p.required[0]}</span></p>`).join('') + `<p><a href="javascript:void 0" data-goto="pattern">查看全部 ${S.patterns.length} 个格局与破格条件</a></p>` : '<p class="muted">没有识别到明显的古书格局，以宫位星曜与四化细论即可。</p>'}
      <h3>读盘心法</h3>
      ${Lore.PRINCIPLES.map(([h, p]) => `<div class="principle"><h4>${h}</h4><p>${p}</p></div>`).join('')}`;
  }

  function pPalace(c) {
    const b = S.selPalace ?? c.ming;
    const d = Reading.palaceDetail(c, b);
    const p = d.palace;
    const tn = Reading.tone(c, b);
    const curLayers = S.horo ? S.horo.layers.map((L) => `${L.label}${L.names[b]}`).join('，') : '';
    return `<h2>${p.name}<span class="muted" style="font-weight:400;font-size:14px"> ${STEMS[p.stem]}${BRANCHES[p.branch]}宫${p.isShen ? '，身宫' : ''}</span><span class="tone ${tn.level}">${tn.level}</span></h2>
      <p class="muted">${d.theme}。${d.read}</p>
      ${curLayers ? `<p class="muted">运限：此宫为${curLayers}。</p>` : ''}
      <ul class="lines-list">${d.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      ${d.hua.length ? `<h3>四化</h3>${d.hua.map((h) => `<p>${huaBadge(h.hua)} ${h.star}化${h.hua}：${h.text}</p>`).join('')}` : ''}
      ${d.oppJi ? `<p style="color:var(--ji)">${d.oppJi}</p>` : ''}
      ${d.lucky.length ? `<h3>吉星</h3><p>${d.lucky.join('；')}。</p>` : ''}
      ${d.sha.length ? `<h3>煞星</h3><p>${d.sha.join('；')}。</p>` : ''}
      <h3>三方四正</h3>
      <div class="sf-mini">${d.sanfang.map((q, i) => `<div><b>${['本宫', '三合', '三合', '对宫'][i]}</b><a href="javascript:void 0" data-pal="${q.branch}">${q.name}</a><br>${q.majors.join('') || '空宫'}</div>`).join('')}</div>
      <p class="muted">三方四正共见煞星 ${d.tally.sha} 颗、六吉 ${d.tally.lucky} 颗${d.tally.hua.length ? '，会化' + d.tally.hua.join('、化') : ''}。</p>
      <dl class="kv"><dt>大限</dt><dd>${p.daxian[0]}–${p.daxian[1]} 岁</dd><dt>小限</dt><dd>${p.xiaoxian.slice(0, 8).join('、')} 岁…</dd><dt>神煞</dt><dd>${p.changsheng}、${p.boshi}、${p.suiqian}、${p.jiangqian}</dd></dl>`;
  }

  function pPattern(c) {
    const ps = S.patterns;
    const cnt = (l) => ps.filter((p) => p.level === l).length;
    if (!ps.length) return '<h2>格局</h2><p class="muted">没有识别到古书格局。格局只是命盘的一个侧面，宫位星曜与四化才是主体。</p>';
    return `<h2>格局</h2><div class="pat-sum"><span>上格 ${cnt('excellent')}</span><span>吉格 ${cnt('good')}</span><span>中性 ${cnt('neutral')}</span><span>警示 ${cnt('caution')}</span></div>
      ${ps.map((p) => `<div class="pat"><div class="pat-head"><h4>${p.name}</h4><span class="lvl ${p.level}">${lvlName[p.level]}</span></div>
        <p>${p.desc}</p>
        <div class="cond"><b>成立：</b>${p.required.join('；')}${p.bonus?.length ? `<br><b>加分：</b>${p.bonus.join('；')}` : ''}${p.breaking?.length ? `<br><b class="brk">破格：</b><span class="brk">${p.breaking.join('；')}</span>` : ''}</div>
        <div class="src">${p.src}${p.palaces?.length ? '　涉及 ' + [...new Set(p.palaces)].join('、') : ''}</div></div>`).join('')}
      <p class="disclaimer">格局规则逐条列出成立、加分与破格条件。凶格只说明需要留意的组合，不等于结果；运限未触发时多半只是性格倾向。</p>`;
  }

  function pHua(c) {
    const cards = Reading.huaCards(c);
    return `<h2>生年四化</h2><p class="muted">${STEMS[c.yStem]}年生，${c.sihua.map((x) => x.star + x.hua).join('、')}。依倪师立场，四化以生年干为本、终身不动；运限中看的是大限与流年走到哪一宫、遇到哪颗化星。</p>
      ${cards.map((x) => `<div class="hua-card">${huaBadge(x.hua)}<div><h4>${x.star}化${x.hua}　<a href="javascript:void 0" data-pal="${x.branch}">${x.palace}</a>${x.bright ? `<span class="muted">（${x.bright}）</span>` : ''}</h4>
        <p>化${x.hua}主${Lore.HUA_ESSENCE[x.hua]}。${x.text}</p>${x.clash ? `<p class="clash">${x.clash}</p>` : ''}</div></div>`).join('')}`;
  }

  function pLuck(c) {
    const h = S.horo || S.nowHoro;
    const isNow = !S.horo;
    const dr = h ? Reading.decadeReading(c, h) : null;
    const yr = h ? Reading.yearReading(c, h) : null;
    let html = `<h2>运限</h2><p class="muted">${isNow ? `以今天（${todayLunar.year} 年农历${Cal.lunarText(todayLunar)}）为准。在命盘下方选择大限、流年、流月可切换。` : '当前查看所选运限。'}大限看十年环境，流年看一年事项，均以本命星曜与生年四化为体。</p>`;
    if (!dr && !yr) return html + '<p class="muted">所选时间不在命主的大限范围内。</p>';
    if (dr) html += `<h3>${dr.title}<span class="tone ${dr.tone.level}">${dr.tone.level}</span></h3><ul class="lines-list">${dr.lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
    if (yr) html += `<h3>${yr.title}<span class="tone ${yr.tone.level}">${yr.tone.level}</span></h3><ul class="lines-list">${yr.lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
    if (h?.month) html += `<h3>流月 ${MONTH_CN[h.month.month - 1]}月（${h.month.gz}）</h3><p>流年斗君在${BRANCHES[h.month.douJun]}宫。流月命宫落本命${c.palaces[h.month.branch].name}：${Lore.YEAR_FOCUS[c.palaces[h.month.branch].name].replace('今年', '本月')}</p>`;
    if (h?.day) html += `<h3>流日 ${DAY_CN(h.day.day)}${h.day.gz ? `（${h.day.gz}日${h.daySolar ? `，公历 ${h.daySolar.m}月${h.daySolar.d}日` : ''}）` : ''}</h3><p>流日命宫落本命${c.palaces[h.day.branch].name}。</p>`;
    if (S.settings.flowHua === 'on' && h) {
      html += '<h3>运限四化（参考）</h3><p class="muted">倪师体系不以运限天干四化论断，此处仅供对照。</p>';
      for (const L of h.layers) html += `<p><b>${L.label}${L.gz}</b>：${L.hua.map((x) => { const p = c.palaces.find((q) => q.stars.some((s) => s.name === x.star)); return `${x.star}化${x.hua}入${p ? p.name : '—'}`; }).join('，')}</p>`;
    }
    return html;
  }

  function pHealth(c) {
    const r = Reading.health(c);
    return `<h2>体质与调养</h2><p class="muted">倪师以中医入命理：疾厄宫的星曜、五行局与化忌之星，对应先天较弱、需要长期照顾的脏腑系统。</p>
      <dl class="kv">${r.lines.map((x) => `<dt>${x.k}</dt><dd>${x.v}</dd>`).join('')}</dl>
      <p>疾厄宫在<a href="javascript:void 0" data-pal="${r.palace.branch}">${STEMS[r.palace.stem]}${BRANCHES[r.palace.branch]}宫</a>，对宫为父母宫：父母宫见化忌或煞星时，遗传体质的影响也要一并考虑。</p>
      <p class="disclaimer">以上为命理上的调养方向参考，不构成诊断或治疗建议；身体不适请及时就医。</p>`;
  }

  /* ─────────── AI ─────────── */
  const AI_RULES = `你是精研紫微斗数、熟悉倪海厦《天纪》读盘体系的命理老师。请依据下面这张已经排好的命盘做解读。

读盘规则（务必遵守）：
1. 四化只用生年四化，终身固定；不使用宫干自化、飞星四化、来因宫等飞星派方法。
2. 论一宫必看三方四正（本宫、对宫、两个三合宫）；空宫借对宫主星论，力量打折。
3. 命宫看先天个性与格局，身宫看后天方向；化忌所在是此生功课，化忌所冲之宫是压力来源。
4. 大限、流年只看宫位移动后遇到的本命星曜与生年四化，并参考流年禄、羊、陀的位置。
5. 健康部分可结合星曜五行与中医脏腑，只给调养方向，不做诊断，并提醒身体不适要就医。
6. 不要编造倪海厦的原话或出处；不要宿命论式的恐吓，说到凶处必须给出可行的趋避建议。
7. 用简体中文，语气笃定而温和，像老师当面讲盘；以盘面为据，点出具体的宫位与星曜。`;
  const AI_FORMAT = `输出结构：用「## 」作小标题，依次为：命格总论、性格与天赋、事业与财运、感情与婚姻、健康与体质、当前大限与流年、修身建议。每节 2 到 4 段，总长约 1500 字。不要输出其他前言或结语。`;

  function md(text) {
    const lines = esc(text).split('\n');
    let out = '', inList = false, para = [];
    const flush = () => { if (para.length) { out += `<p>${para.join('')}</p>`; para = []; } };
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    for (const raw of lines) {
      const l = raw.trimEnd();
      if (/^#{1,2}\s/.test(l)) { flush(); if (inList) { out += '</ul>'; inList = false; } out += `<h2>${inline(l.replace(/^#+\s/, ''))}</h2>`; }
      else if (/^#{3,}\s/.test(l)) { flush(); if (inList) { out += '</ul>'; inList = false; } out += `<h3>${inline(l.replace(/^#+\s/, ''))}</h3>`; }
      else if (/^\s*[-*•]\s+/.test(l)) { flush(); if (!inList) { out += '<ul>'; inList = true; } out += `<li>${inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>`; }
      else if (!l.trim()) { flush(); if (inList) { out += '</ul>'; inList = false; } }
      else { if (inList) { out += '</ul>'; inList = false; } para.push(inline(l)); }
    }
    flush(); if (inList) out += '</ul>';
    return out;
  }
  const AI_ERR = { not_granted: '你没有允许此页面使用 Claude，AI 解盘已关闭。', sampling_disabled: '当前账号无法在此页面使用 Claude。', rate_limited: '请求太频繁或已达到用量上限，请稍后再试。', session_expired: '登录已过期，请重新登录 Claude 后再试。', refused: '这次请求没有得到回答，可以换个问法再试。', empty_completion: '没有生成内容，请再试一次。', upstream_error: '连接中断了，已保留生成的部分，可以重新生成。', prompt_too_large: '命盘内容过长，请缩短追问。' };

  function pAi() {
    const a = S.ai;
    return `<h2>AI 深度解盘</h2>
      <p class="muted">把整张命盘（十二宫星曜、生年四化、格局、当前运限）交给 Claude，按倪师《天纪》的读盘规则写成一份完整解读。会使用你自己的 Claude 用量。</p>
      <div class="ai-bar">
        <button class="btn" id="aiGo" ${a.running ? 'disabled' : ''}>${a.text ? '重新生成' : '生成解盘'}</button>
        <button class="btn secondary" id="aiStop" ${a.running ? '' : 'hidden'}>停止</button>
      </div>
      <div id="aiNote" class="muted"></div>
      <div class="ai-out" id="aiOut">${a.text ? md(a.text) : (a.running ? '<p class="ai-thinking">正在读盘</p>' : '')}</div>
      <div id="aiQa">${a.qa.map((x) => `<div class="qa"><p class="q">问：${esc(x.q)}</p><div class="ai-out">${x.a ? md(x.a) : '<p class="ai-thinking">思考中</p>'}</div></div>`).join('')}</div>
      <form class="ask" id="aiAsk" ${a.text && !a.running ? '' : 'hidden'}><input class="field" id="aiQ" placeholder="继续追问，例如：明年适合换工作吗？" maxlength="200"><button class="btn" type="submit">追问</button></form>`;
  }
  function wireAi() {
    const go = $('#aiGo'), stop = $('#aiStop');
    go.onclick = () => runAi();
    stop.onclick = () => S.ai.ctl?.abort();
    const ask = $('#aiAsk');
    ask.onsubmit = (e) => { e.preventDefault(); const q = $('#aiQ').value.trim(); if (q) runAsk(q); };
  }
  function aiPrompt() {
    const h = S.horo || S.nowHoro;
    return `${AI_RULES}\n\n${AI_FORMAT}\n\n命盘资料：\n${Reading.chartText(S.chart, h, S.patterns)}`;
  }
  async function runAi() {
    const a = S.ai;
    if (a.running || !S.sample) return;
    a.running = true; a.text = ''; a.qa = []; a.ctl = new AbortController();
    const prompt = aiPrompt();
    renderPanel();
    try {
      const r = await S.sample(prompt, { signal: a.ctl.signal, onText: ({ text }) => { a.text = text; const o = $('#aiOut'); if (o && S.tab === 'ai') o.innerHTML = md(text); } });
      a.text = r.text;
      a.turns = [{ role: 'user', content: prompt }, { role: 'assistant', content: r.text }];
      if (r.truncated) a.note = '内容过长被截断，可针对某一部分追问。';
    } catch (e) {
      a.text = e.text ?? a.text;
      if (e.code === 'not_granted' || e.code === 'sampling_disabled') { S.sample = null; S.tab = 'summary'; }
      a.note = e.code === 'cancelled' ? '已停止。' : (AI_ERR[e.code] || AI_ERR.upstream_error);
      if (e.code === 'refused') a.text = '';
      if (a.text) a.turns = [{ role: 'user', content: prompt }, { role: 'assistant', content: a.text }];
    } finally {
      a.running = false;
      renderTabs(); renderPanel();
      const n = $('#aiNote'); if (n && a.note) { n.textContent = a.note; a.note = ''; }
    }
  }
  async function runAsk(q) {
    const a = S.ai;
    if (a.running || !S.sample || !a.turns.length) return;
    a.running = true; a.ctl = new AbortController();
    const item = { q, a: '' }; a.qa.push(item);
    renderPanel();
    const turns = [...a.turns, { role: 'user', content: `${q}\n\n（请仍按上面的读盘规则，结合这张命盘具体回答，300 到 600 字。）` }];
    try {
      const r = await S.sample(turns, { cache: false, signal: a.ctl.signal, onText: ({ text }) => { item.a = text; const outs = $$('#aiQa .ai-out'); const o = outs[outs.length - 1]; if (o) o.innerHTML = md(text); } });
      item.a = r.text;
      a.turns = [...turns, { role: 'assistant', content: r.text }];
      if (a.turns.length > 12) a.turns = [a.turns[0], a.turns[1], ...a.turns.slice(-8)];
    } catch (e) {
      item.a = e.text || '';
      a.note = e.code === 'cancelled' ? '已停止。' : (AI_ERR[e.code] || AI_ERR.upstream_error);
      if (!item.a) a.qa.pop();
      if (e.code === 'not_granted' || e.code === 'sampling_disabled') { S.sample = null; S.tab = 'summary'; }
    } finally {
      a.running = false; renderTabs(); renderPanel();
      const n = $('#aiNote'); if (n && a.note) { n.textContent = a.note; a.note = ''; }
    }
  }

  /* ─────────── saved charts ─────────── */
  function snapshot() {
    return { name: fName.value.trim(), gender: S.gender, calendar: S.calendar, year: +fYear.value, month: +fMonth.value, day: +fDay.value, leap: fLeap.checked, timeMode: S.timeMode, time: fTime.value, branch: fBranch.value, place: fPlace.value, lon: S.lon, tz: S.tz };
  }
  function restore(s) {
    fName.value = s.name || '';
    S.gender = s.gender; form.querySelectorAll('[data-gender]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.gender === s.gender)));
    S.calendar = s.calendar; form.querySelectorAll('[data-cal]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cal === s.calendar)));
    fillMonths(); fYear.value = s.year; fMonth.value = s.month; syncLeap(); fLeap.checked = !!s.leap; fillDays(); fDay.value = s.day;
    setTimeMode(s.timeMode); fTime.value = s.time; fBranch.value = s.branch;
    fPlace.value = s.place || ''; S.lon = s.lon; S.tz = s.tz ?? 8; S.city = matchCity(s.place || '');
    if (S.city && S.city.lon !== S.lon) S.city = null;
    $('#sLon').value = S.lon ?? ''; $('#sTz').value = String(S.tz);
    updateLonNote();
  }
  const keyOf = (s) => [s.name, s.gender, s.calendar, s.year, s.month, s.day, s.leap, s.timeMode, s.time, s.branch, s.lon].join('|');
  function saveRecent(pin = false) {
    const s = snapshot();
    let list = store.get('saved', []);
    const k = keyOf(s);
    const old = list.find((x) => keyOf(x.s) === k);
    list = list.filter((x) => keyOf(x.s) !== k);
    list.unshift({ s, at: Date.now(), pin: pin || old?.pin || false });
    const pinned = list.filter((x) => x.pin), rest = list.filter((x) => !x.pin).slice(0, 12);
    store.set('saved', [...pinned, ...rest].sort((a, b) => b.at - a.at));
  }
  function renderSaved() {
    const list = store.get('saved', []);
    const ul = $('#savedList');
    if (!list.length) { ul.innerHTML = '<li class="muted">还没有命例。每次起盘会自动记在这里，点「存为命例」可长期保留。</li>'; return; }
    ul.innerHTML = list.map((x, i) => { const s = x.s; const date = s.calendar === 'solar' ? `${s.year}-${pad(s.month)}-${pad(s.day)}` : `农历${s.year}年${s.leap ? '闰' : ''}${MONTH_CN[s.month - 1]}月${DAY_CN(s.day)}`; return `<li><button class="open" data-i="${i}"><b>${esc(s.name || (s.gender === 'male' ? '乾造' : '坤造'))}${x.pin ? '　<span class="muted">★</span>' : ''}</b><small>${date} ${s.timeMode === 'clock' ? s.time : ZW.HOURS[+s.branch % 12] + '时'}　${esc(s.place || '')}</small></button><button class="ghost-btn" data-del="${i}">删除</button></li>`; }).join('');
    ul.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { restore(list[+b.dataset.i].s); dlgSaved.close(); compute(true); });
    ul.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { list.splice(+b.dataset.del, 1); store.set('saved', list); renderSaved(); });
  }

  /* ─────────── export ─────────── */
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function saveFile(filename, data, mime) {
    if (S.downloads) return S.downloads.save({ filename, data });
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportPng(e) {
    const btn = e.target; const txt = btn.textContent;
    try {
      btn.textContent = '生成中…'; btn.disabled = true;
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const bg = getComputedStyle(document.body).backgroundColor;
      const canvas = await window.html2canvas(board, { backgroundColor: bg, scale: 2, logging: false });
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      await saveFile(`命盘-${S.chart.input.name || '未命名'}.png`, blob, 'image/png');
      btn.textContent = '已导出';
    } catch (err) { btn.textContent = err?.code === 'declined' ? txt : '导出失败'; }
    finally { btn.disabled = false; setTimeout(() => { btn.textContent = txt; }, 2200); }
  }
  async function exportJson(e) {
    const c = S.chart, btn = e.target, txt = btn.textContent;
    const data = { generator: '真一紫微', input: c.input, lunar: c.lunar, bazi: c.bazi, ming: BRANCHES[c.ming], shen: BRANCHES[c.shen], ju: c.juName, sihua: c.sihua.map((x) => ({ ...x, palace: c.palaces[x.branch].name })), palaces: c.palaces.map((p) => ({ name: p.name, ganzhi: STEMS[p.stem] + BRANCHES[p.branch], daxian: p.daxian, stars: p.stars.map((s) => ({ name: s.name, type: s.type, bright: s.bright || undefined, hua: s.hua })) })), patterns: S.patterns.map((p) => ({ name: p.name, level: p.level, required: p.required, bonus: p.bonus, breaking: p.breaking })) };
    try { await saveFile(`命盘-${c.input.name || '未命名'}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8'); btn.textContent = '已导出'; }
    catch (err) { btn.textContent = err?.code === 'declined' ? txt : '导出失败'; }
    setTimeout(() => { btn.textContent = txt; }, 2200);
  }

  /* ─────────── capabilities ─────────── */
  async function initCaps() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try { const s = await window.claude.use('sample'); if (s) { S.sample = s; renderTabs(); } } catch { /* 不可用 */ }
    try { const d = await window.claude.use('downloads'); if (d) { S.downloads = d; if (S.chart) renderHeart(); } } catch { /* 不可用 */ }
  }

  /* ─────────── boot ─────────── */
  const last = store.get('saved', [])[0];
  if (last) restore(last.s);
  updateLonNote();
  placeForm();
  renderPanel();
  if (last) compute(true);
  initCaps();
})();
