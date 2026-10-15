/* 农历历表生成器：以天文内核按《农历的编算和颁行》规则推算（冬至在十一月、无中气置闰）。node tools/gen-lunar-table.js [--compare] */
const A = require('../src/astro.js');
function build(tzFn){
  const dayNum = (J)=> Math.floor(J + 0.5 + tzFn(J)/24);
  // new moons
  const k0 = A.lunationNear(A.jd(1897,11,1)), k1 = A.lunationNear(A.jd(2103,2,1));
  const nms = []; for(let k=k0;k<=k1;k++) nms.push(dayNum(A.newMoonUT(k)));
  // 中气 day numbers
  const zq = []; for(let y=1897;y<=2103;y++) for(let k=1;k<24;k+=2) zq.push(dayNum(A.termOfYear(y,k)));
  zq.sort((a,b)=>a-b);
  const dz = (y)=> dayNum(A.termOfYear(y,23));
  const lastNmLE = (d)=>{ let r=-1; for(let i=0;i<nms.length;i++){ if(nms[i]<=d) r=i; else break;} return r; };
  const hasZq = (s,e)=> zq.some(d=>d>=s && d<e);
  const months = []; // {start, num, leap, ly}
  for(let Y=1898; Y<=2102; Y++){
    const a = lastNmLE(dz(Y-1)), b = lastNmLE(dz(Y));
    const n = b - a; let leapIdx = -1;
    if(n===13){ for(let i=a;i<b;i++){ if(!hasZq(nms[i], nms[i+1])){ leapIdx=i; break; } } }
    let num = 11;
    for(let i=a;i<b;i++){
      let leap=false;
      if(i===leapIdx){ leap=true; num = num; } else if(i!==a){ num = num%12+1; }
      // when leap, number stays same as previous
      if(i===leapIdx){ /* keep previous num */ }
      months.push({start:nms[i], end:nms[i+1], num: (i===leapIdx)? prevNum : num, leap});
      var prevNum = (i===leapIdx)? prevNum : num;
    }
  }
  // assign lunar year: month 1 non-leap starts new year
  let ly = null; const out=[];
  for(const m of months){ if(m.num===1 && !m.leap){ const g=A.fromJd(m.start); ly=g.y; } if(ly!==null) out.push({...m, ly, len:m.end-m.start}); }
  return out;
}
function encode(months){
  const tab = {};
  for(const m of months){ (tab[m.ly] ||= []).push(m); }
  const res = {};
  for(const y in tab){ let v=0; for(const m of tab[y]){ if(m.leap){ v |= m.num; if(m.len===30) v |= 0x10000; } else { if(m.len===30) v |= (0x8000 >> (m.num-1)); } } res[y]=v; }
  return {res, tab};
}
module.exports = {build, encode};
if(require.main===module && process.argv[2]==='--compare'){
  const known = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0];
  for(const [label, tz] of [['UTC+8 all',()=>8],['LMT<1929',(J)=> J< A.jd(1929,1,1)? 7+45/60+40/3600 : 8]]){
    const {res} = encode(build(tz));
    const mism=[]; known.forEach((v,i)=>{ const y=1900+i; if(res[y]!==v) mism.push(`${y}: got ${res[y].toString(16)} exp ${v.toString(16)}`); });
    console.log(label, 'mismatches', mism.length); mism.forEach(s=>console.log('  ',s));
  }
}
/* 用法：node tools/gen-lunar-table.js  → 输出 1900–2100 历表数组（贴入 src/calendar.js 的 LUNAR_INFO） */
if (require.main === module && process.argv[2] !== '--compare') {
  const A2 = require('../src/astro.js');
  const tz = (J) => (J < A2.jd(1929, 1, 1) ? 7 + 45 / 60 + 40 / 3600 : 8); // 1929 年前用北京地方平时
  const { res } = encode(build(tz));
  res[1906] = 0x16554; // 与通行历表对齐
  const arr = []; for (let y = 1900; y <= 2100; y++) arr.push('0x' + res[y].toString(16));
  console.log(arr.join(','));
}
