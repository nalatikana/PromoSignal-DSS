/* ============================================================================
   Board Signal — ชั้นสำหรับนักลงทุน
     1. แผนภาพน้ำตก  แยกว่าคะแนน IPI มาจากตัวแปรไหนบวกลบเท่าไหร่
     2. ศักยภาพเพิ่ม · ธงความเสี่ยง · ลำดับการเข้าพบ
     3. พอร์ตลงทุน · แผนภาพโอกาส · จอเฝ้าระวัง
     4. โหมดที่ประชุมลงทุน
     5. บันทึกหน้าเดียวสำหรับแนบวาระประชุม
   ต่อท้าย app.js — ใช้ตัวช่วยที่ประกาศไว้แล้วทั้งหมด
   ============================================================================ */

/* ---------------------------------------------------------------- เครื่องมือสถิติ */
/** ควอนไทล์ของอาร์เรย์ (ไม่ต้องเรียงมาก่อน) */
function qAt(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}
/** ค่ากลางตลาดของแต่ละตัวแปร — ใช้เป็นจุดตั้งต้นของแผนภาพน้ำตก */
const MKT = { promo: NEU.promo, fem: MEAN.bod_female, fam: MEAN.bod_family, pol: MEAN.bod_politicalties, ten: MEAN.bod_tenure };

/** IPI ของโปรไฟล์ใด ๆ — เก็บทศนิยมไว้ก่อน ยังไม่ปัดเศษ */
const ipiRaw = o => .5 * promoPct(o.promo) + .5 * ampPct(ampOf(o.fam, o.pol, o.fem, o.ten));
const profOf = c => ({ promo: c.promo, fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten });
/** ค่าชดเชยการปัดเศษของแต่ละบริษัท — ทำให้โปรไฟล์เดิมได้ IPI ตรงกับที่แสดงทุกหน้าเสมอ */
const calOf = c => c.ipi - ipiRaw(profOf(c));
/** IPI ของโปรไฟล์สมมติ เทียบมาตรฐานกับบริษัทต้นทาง */
const ipiAt = (c, o) => Math.round(ipiRaw(o) + calOf(c));
const ipiOf = o => Math.round(ipiRaw(o));
/** ปัดเศษหลายค่าพร้อมกันให้ผลรวมเท่ากับยอดที่ต้องการพอดี (largest remainder) */
function niceRound(vals, total) {
  const fl = vals.map(v => Math.floor(v));
  const out = fl.slice();
  let rem = Math.round(total - fl.reduce((a, b) => a + b, 0));
  const ord = vals.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (let k = 0; k < Math.abs(rem) && ord.length; k++) out[ord[k % ord.length].i] += Math.sign(rem);
  return out;
}

/* ---------------------------------------------------------------- 1 · แผนภาพน้ำตก */
const WF_STEPS = [
  { k: "promo", l: "ภาษาเชิงรุกของ CEO", note: "เทียบกับค่าเฉลี่ยตลาด 0.58" },
  { k: "fem", l: "สัดส่วนกรรมการหญิง", note: "ตัวขยายสัญญาณที่แรงที่สุดในโมเดล" },
  { k: "fam", l: "สัดส่วนกรรมการครอบครัว", note: "ยิ่งมากยิ่งลดทอนสัญญาณ" },
  { k: "pol", l: "กรรมการสายนโยบาย", note: "สัมพันธ์กับการเข้าถึงทรัพยากรและพันธมิตร" },
  { k: "ten", l: "อายุงานเฉลี่ยของบอร์ด", note: "ยิ่งนานยิ่งลดการขยายเล็กน้อย" },
];
/** แยกส่วนประกอบของ IPI แบบสะสมทีละตัวแปร — ผลรวมเท่ากับ IPI จริงเสมอ
 *  ปัดเศษครั้งเดียวตอนท้ายด้วยวิธี largest remainder จึงไม่มีเศษหลงเหลือให้ตัวเลขไม่ตรงกัน */
function waterfall(c) {
  const cur = profOf(c), w = Object.assign({}, MKT), cal = calOf(c);
  const raw = [ipiRaw(w) + cal];
  for (const st of WF_STEPS) { w[st.k] = cur[st.k]; raw.push(ipiRaw(w) + cal); }
  raw[raw.length - 1] = c.ipi;                       // ปลายทางคือคะแนนจริงที่แสดงทุกหน้า
  const parts = [raw[0]].concat(raw.slice(1).map((v, i) => v - raw[i]));
  const r = niceRound(parts, c.ipi);
  const out = []; let acc = r[0];
  WF_STEPS.forEach((st, i) => { acc += r[i + 1]; out.push(Object.assign({}, st, { d: r[i + 1], to: acc })); });
  return { base: r[0], steps: out, total: acc, actual: c.ipi };
}

/* ---------------------------------------------------------------- 2 · ศักยภาพและความเสี่ยง */
/** โครงสร้างบอร์ดที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมเดียวกัน
 *  ไม่แตะกรรมการสายนโยบาย เพราะเป็นคุณสมบัติที่ไม่ควรตั้งเป็นเป้าในการสรรหา */
function optimalBoard(c) {
  const pool = indComps(c.ind);
  return {
    promo: c.promo,                                   // ไม่นับการเปลี่ยน CEO เป็นศักยภาพของบอร์ด
    fem: Math.max(c.fem, qAt(pool.map(x => x.fem), .9)),
    fam: Math.min(c.fam, qAt(pool.map(x => x.fam), .1)),
    ten: Math.min(c.ten, qAt(pool.map(x => x.ten), .1)),
    pol: c.pol,
  };
}
/** ศักยภาพที่ยังไม่ได้ใช้ — ต่างระหว่าง IPI ปัจจุบันกับ IPI เมื่อบอร์ดไปถึงค่าที่ดีที่สุดในกลุ่ม */
function upsideOf(c) {
  const best = optimalBoard(c), v = Math.max(c.ipi, ipiAt(c, best));
  return { now: c.ipi, best: v, delta: v - c.ipi, target: best };
}
/** ธงความเสี่ยงเชิงโครงสร้าง — เกณฑ์ทุกข้ออิงควอนไทล์ของอุตสาหกรรมเดียวกัน */
function riskFlags(c) {
  const pool = indComps(c.ind), F = [];
  const famHi = qAt(pool.map(x => x.fam), .8), femLo = qAt(pool.map(x => x.fem), .2),
    tenHi = qAt(pool.map(x => x.ten), .8);
  if (c.fam >= famHi && c.dp >= 70) F.push({ lv: "crit", l: "ผู้นำรุกแต่บอร์ดกระจุกในครอบครัว",
    d: `กรรมการครอบครัว ${pct1(c.fam)} อยู่ในกลุ่มสูงสุดของอุตสาหกรรม ขณะที่ CEO ใช้ภาษาเชิงรุกระดับ ${c.dp} — โครงสร้างแบบนี้สัมพันธ์กับการตัดสินใจที่มองเข้าข้างในและขาดการถ่วงดุล` });
  else if (c.fam >= famHi) F.push({ lv: "warn", l: "กรรมการครอบครัวสูงกว่ากลุ่ม",
    d: `${pct1(c.fam)} เทียบกับค่ากลางอุตสาหกรรม ${pct1(qAt(pool.map(x => x.fam), .5))}` });
  if (c.fem <= femLo) F.push({ lv: "warn", l: "ความหลากหลายทางเพศต่ำ",
    d: `กรรมการหญิง ${pct1(c.fem)} อยู่ในกลุ่มต่ำสุดของอุตสาหกรรม — เป็นตัวแปรที่โมเดลชี้ว่าขยายสัญญาณได้แรงที่สุด` });
  if (c.ten >= tenHi) F.push({ lv: "warn", l: "บอร์ดอยู่ในตำแหน่งนาน",
    d: `อายุงานเฉลี่ย ${fmt(c.ten, 1)} ปี อยู่ในกลุ่มสูงสุดของอุตสาหกรรม — ความเสี่ยงเรื่องความคล่องตัวในการรับเรื่องใหม่` });
  if (c.dp <= 30 && ampPct(c.amp) >= 65) F.push({ lv: "warn", l: "บอร์ดพร้อมแต่ผู้นำยังไม่ขยับ",
    d: `โครงสร้างบอร์ดอยู่ที่เปอร์เซ็นไทล์ ${ampPct(c.amp)} แต่ภาษาผู้นำอยู่ที่ ${c.dp} — ศักยภาพยังไม่ถูกกระตุ้น` });
  if (!F.length) F.push({ lv: "ok", l: "ไม่พบธงความเสี่ยงเชิงโครงสร้าง",
    d: "ทุกตัวแปรอยู่ในช่วงปกติของอุตสาหกรรม — ควรติดตามเมื่อกรรมการครบวาระ" });
  return F;
}
const riskLevel = c => {
  const f = riskFlags(c);
  return f.some(x => x.lv === "crit") ? { k: "crit", l: "สูง" }
    : f.filter(x => x.lv === "warn").length >= 2 ? { k: "warn", l: "ปานกลาง" }
      : f.some(x => x.lv === "warn") ? { k: "warn", l: "ต่ำ–ปานกลาง" } : { k: "ok", l: "ต่ำ" };
};
/** ระยะห่างจากผู้นำในอุตสาหกรรมเดียวกัน */
const gapOf = c => { const pool = indComps(c.ind); return Math.max(0, Math.max(...pool.map(x => x.ind === c.ind ? x.ipi : 0)) - c.ipi); };
/** ฐานอ้างอิงของทั้งตลาด — คำนวณครั้งเดียวตอนเรียกใช้ครั้งแรก */
let _refUp = null, _refGap = null;
function investRefs() {
  if (_refUp) return;
  _refUp = COMPS.map(c => upsideOf(c).delta).sort((a, b) => a - b);
  _refGap = COMPS.map(gapOf).sort((a, b) => a - b);
}
/** ลำดับการเข้าพบ — รวมสามสิ่ง: ศักยภาพที่เพิ่มได้ · ความพร้อมของผู้นำ · ระยะห่างจากผู้นำในกลุ่ม
 *  ทุกองค์ประกอบแปลงเป็นเปอร์เซ็นไทล์ของตลาดก่อน คะแนนจึงเทียบกันได้และไม่กระจุกที่เพดาน */
function engagement(c) {
  investRefs();
  const u = upsideOf(c), gap = gapOf(c);
  const sUp = pctile(_refUp, u.delta), sCeo = c.dp, sGap = pctile(_refGap, gap);
  const score = Math.round(.55 * sUp + .25 * sCeo + .20 * sGap);
  return { score, parts: { sUp, sCeo, sGap }, gap, upside: u,
    tier: score >= 70 ? { k: "crit", l: "สูง" } : score >= 45 ? { k: "warn", l: "ปานกลาง" } : { k: "ok", l: "ต่ำ" } };
}
/** ข้อเสนอเชิงลงทุน — แปลตัวเลขเป็นคำแนะนำหนึ่งคำ */
function recommendation(c) {
  const e = engagement(c), r = riskLevel(c);
  if (e.upside.delta >= 10 && c.dp >= 60) return { k: "engage", l: "เข้าไปมีส่วนร่วมกับบอร์ด", c: "var(--ok)",
    d: "ผู้นำพร้อมแต่โครงสร้างบอร์ดจำกัด — เป็นกรณีที่การปรับธรรมาภิบาลให้ผลชัดที่สุด" };
  if (e.upside.delta >= 10) return { k: "watch-up", l: "ติดตามและรอจังหวะ", c: "var(--s1)",
    d: "มีศักยภาพจากการปรับบอร์ด แต่ภาษาผู้นำยังไม่สนับสนุน ควรรอสัญญาณจากฝ่ายบริหารก่อน" };
  if (r.k === "crit") return { k: "caution", l: "ระวัง ตรวจสอบเพิ่ม", c: "var(--crit)",
    d: "มีธงความเสี่ยงเชิงโครงสร้างที่ควรตรวจก่อนเพิ่มน้ำหนักการลงทุน" };
  if (c.ipi >= 70) return { k: "hold", l: "ถือและติดตาม", c: "var(--s3)",
    d: "อยู่ในกลุ่มบนอยู่แล้ว ส่วนที่เพิ่มได้จากการปรับบอร์ดยังไม่มากพอจะเป็นเหตุผลหลักในการเข้าไปคุย โจทย์คือรักษาตำแหน่งเมื่อกรรมการครบวาระ" };
  return { k: "pass", l: "ยังไม่ใช่จังหวะ", c: "var(--ink-3)",
    d: "ทั้งคะแนนปัจจุบันและศักยภาพเพิ่มยังไม่โดดเด่นพอเทียบกับบริษัทอื่นในกลุ่ม" };
}

/* ============================================================================
   ส่วนแสดงผล
   ============================================================================ */
const WF_SHORT = { promo: "ภาษา CEO", fem: "กรรมการหญิง", fam: "กรรมการครอบครัว", pol: "สายนโยบาย", ten: "อายุงานบอร์ด" };

/** แผนภาพน้ำตก — เริ่มจากค่ากลางตลาด แล้วเปลี่ยนทีละตัวแปรจนได้ IPI จริง */
function waterfallSvg(c, cmp) {
  const w = waterfall(c);
  const cols = [{ l: "ค่ากลางตลาด", from: 0, to: w.base, k: "base" }]
    .concat(w.steps.map(s => ({ l: WF_SHORT[s.k] || s.l, from: s.to - s.d, to: s.to, k: s.d > 0 ? "up" : s.d < 0 ? "dn" : "flat", d: s.d, key: s.k })))
    .concat([{ l: esc(c.t) + " วันนี้", from: 0, to: w.total, k: "tot" }]);
  const W = 780, H = cmp ? 205 : 336, L = 40, R = 14, T = cmp ? 20 : 26, B = cmp ? 74 : 96;
  const top = Math.max(100, ...cols.map(o => Math.max(o.from, o.to)));
  const Y = v => H - B - clamp(v, 0, top) / top * (H - T - B);
  const n = cols.length, slot = (W - L - R) / n, cw = Math.min(74, slot * .58);
  const CX = i => L + slot * (i + .5);
  const FILL = { base: "var(--ink-3)", tot: "var(--brand)", up: "var(--ok)", dn: "var(--crit)", flat: "var(--ink-3)" };

  const grid = [0, 25, 50, 75, 100].map(v =>
    `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - R}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
     <text x="${L - 7}" y="${(Y(v) + 3.4).toFixed(1)}" font-size="9.5" fill="var(--ink-3)" text-anchor="end">${v}</text>`).join("");

  const body = cols.map((o, i) => {
    const y0 = Y(Math.max(o.from, o.to)), y1 = Y(Math.min(o.from, o.to));
    const h = Math.max(2.5, y1 - y0), x = CX(i) - cw / 2;
    const lab = o.d === undefined ? fmt(o.to) : (o.d > 0 ? "+" + fmt(o.d) : o.d < 0 ? "−" + fmt(-o.d) : "±0");
    const link = i < n - 1 ? `<line x1="${(x + cw).toFixed(1)}" y1="${Y(o.to).toFixed(1)}" x2="${(CX(i + 1) - cw / 2).toFixed(1)}" y2="${Y(o.to).toFixed(1)}"
        stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>` : "";
    return `${link}
      <g class="wfb" data-k="${o.key || o.k}" data-l="${esc(o.l)}" data-d="${o.d === undefined ? "" : fmt(o.d)}" data-to="${fmt(o.to)}" style="cursor:${o.d === undefined ? "default" : "help"}">
        <rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${FILL[o.k]}" fill-opacity="${o.k === "base" || o.k === "tot" ? .92 : o.k === "flat" ? .5 : .82}"/>
        <text x="${CX(i).toFixed(1)}" y="${(y0 - 7).toFixed(1)}" font-size="11.5" font-weight="500" text-anchor="middle" fill="var(--ink)">${lab}</text>
        <text x="${CX(i).toFixed(1)}" y="${H - B + 17}" font-size="9.8" text-anchor="middle" fill="var(--ink-2)">${esc(o.l)}</text>
        ${o.d !== undefined ? `<text x="${CX(i).toFixed(1)}" y="${H - B + 30}" font-size="9.2" text-anchor="middle" fill="var(--ink-3)">→ ${fmt(o.to)}</text>` : ""}
      </g>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="แผนภาพน้ำตกของ IPI">
    ${grid}${body}
    <line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1.2"/>
    <text x="${L}" y="${T - 10}" font-size="10" fill="var(--ink-3)">IPI (เปอร์เซ็นไทล์ 0–100)</text>
  </svg>` + (cmp ? "" : `
  <div class="legend">
    <span><i style="background:var(--ink-3)"></i>จุดตั้งต้น = บริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด</span>
    <span><i style="background:var(--ok)"></i>ตัวแปรที่ดันคะแนนขึ้น</span>
    <span><i style="background:var(--crit)"></i>ตัวแปรที่ฉุดคะแนนลง</span>
    <span><i style="background:var(--brand)"></i>คะแนนจริงของบริษัท</span></div>`);
}

/** การ์ดสามใบสำหรับหน้ารายงาน — น้ำตก · ศักยภาพและความเสี่ยง · ลำดับการเข้าพบ */
function investBlock(c) {
  const w = waterfall(c), u = upsideOf(c), F = riskFlags(c), e = engagement(c), rec = recommendation(c);
  const up = w.steps.filter(s => s.d > 0).sort((a, b) => b.d - a.d);
  const dn = w.steps.filter(s => s.d < 0).sort((a, b) => a.d - b.d);
  const tgtRows = [
    ["กรรมการหญิง", pct1(c.fem), pct1(u.target.fem), c.fem !== u.target.fem],
    ["กรรมการครอบครัว", pct1(c.fam), pct1(u.target.fam), c.fam !== u.target.fam],
    ["อายุงานเฉลี่ยบอร์ด", fmt(c.ten, 1) + " ปี", fmt(u.target.ten, 1) + " ปี", c.ten !== u.target.ten],
  ];
  return `
  <div class="card" style="margin-top:14px">
    <h3>คะแนนนี้มาจากไหน — แผนภาพน้ำตก</h3>
    <p class="desc">เริ่มจากบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด (IPI ${fmt(w.base)}) แล้วเปลี่ยนเป็นค่าจริงของ ${esc(c.t)} ทีละตัว
      ผลรวมของทุกขั้นเท่ากับ IPI จริง ${fmt(w.total)} เสมอ — จึงอ่านได้ว่าตัวแปรใดเป็นตัวได้ ตัวใดเป็นตัวเสีย</p>
    ${waterfallSvg(c)}
    <div class="grid g2" style="margin-top:13px">
      <div class="note ok"><b>ตัวได้</b> —
        ${up.length ? up.map(s => `${esc(WF_SHORT[s.k])} <b>+${fmt(s.d)}</b>`).join(" · ") : "ไม่มีตัวแปรใดดันคะแนนขึ้นจากค่ากลางตลาด"}</div>
      <div class="note ${dn.length ? "warn" : ""}"><b>ตัวเสีย</b> —
        ${dn.length ? dn.map(s => `${esc(WF_SHORT[s.k])} <b>−${fmt(-s.d)}</b>`).join(" · ") : "ไม่มีตัวแปรใดฉุดคะแนนลงจากค่ากลางตลาด"}</div>
    </div>
    <div class="note" style="margin-top:10px;font-size:10.8px">
      ลำดับของขั้นมีผลต่อการแบ่งคะแนนเล็กน้อย เพราะเปอร์เซ็นไทล์ไม่ใช่ฟังก์ชันเชิงเส้น —
      ระบบใช้ลำดับเดียวกันทุกบริษัทเพื่อให้เทียบกันได้ ตัวเลขนี้จึงเป็นการ<b>แยกส่วนประกอบ</b> ไม่ใช่การพยากรณ์ผลของการปรับจริง</div>
  </div>

  <div class="grid g-side-r" style="margin-top:14px">
    <div class="card">
      <h3>ศักยภาพที่ยังไม่ได้ใช้</h3>
      <p class="desc">ถ้าโครงสร้างบอร์ดขยับไปถึงค่าที่ดีที่สุดเท่าที่<b>พบจริง</b>ในกลุ่ม ${esc(IND[c.ind])}
        (เปอร์เซ็นไทล์ 90 ของกรรมการหญิง · เปอร์เซ็นไทล์ 10 ของกรรมการครอบครัวและอายุงาน) โดยไม่แตะภาษาผู้นำ</p>
      <div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:12px">
        <div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)">วันนี้</div>
          <div style="font-size:32px;font-weight:500;letter-spacing:-.03em;line-height:1.05">${u.now}</div></div>
        <div style="font-size:22px;color:var(--ink-3);padding-bottom:5px">→</div>
        <div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)">เพดานเชิงโครงสร้าง</div>
          <div style="font-size:32px;font-weight:500;letter-spacing:-.03em;line-height:1.05;color:var(--ok)">${fmt(u.best)}</div></div>
        <div class="pill ${u.delta >= 10 ? "ok" : u.delta > 0 ? "mute" : "mute"}" style="font-size:13px;padding:5px 12px;margin-bottom:6px">
          ${u.delta > 0 ? "▲ +" + fmt(u.delta) + " จุด" : "ถึงเพดานของกลุ่มแล้ว"}</div>
      </div>
      <div class="mbar" style="height:13px">
        <span style="width:${clamp(u.now, 0, 100)}%;background:var(--brand)"></span>
        <span style="left:${clamp(u.now, 0, 100)}%;width:${clamp(u.best - u.now, 0, 100)}%;background:color-mix(in srgb,var(--ok) 55%,transparent)"></span></div>
      <div class="tw" style="margin-top:13px"><table><thead><tr><th>ตัวแปร</th><th class="n">วันนี้</th><th class="n">ค่าที่ดีที่สุดในกลุ่ม</th></tr></thead><tbody>
        ${tgtRows.map(r => `<tr${r[3] ? ' class="hl"' : ""}><td>${r[0]}</td><td class="n">${r[1]}</td>
          <td class="n"><b>${r[2]}</b>${r[3] ? "" : ' <span style="color:var(--ink-3);font-size:10.5px">ถึงแล้ว</span>'}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="note" style="margin-top:11px;font-size:10.8px">
        ระบบ<b>ไม่นับกรรมการสายนโยบายเป็นเป้าหมาย</b> แม้สัมประสิทธิ์จะเป็นบวก
        เพราะเป็นคุณสมบัติที่ไม่ควรตั้งเป็นเกณฑ์ในการสรรหากรรมการ · ตัวเลขทั้งหมดเป็นความสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่การรับประกันผล</div>
    </div>

    <div style="display:grid;gap:14px;align-content:start">
      <div class="card">
        <h3>ลำดับการเข้าพบ</h3>
        <p class="desc">ควรคุยกับบริษัทไหนก่อน — รวมศักยภาพที่เพิ่มได้ ความพร้อมของผู้นำ และระยะห่างจากผู้นำในกลุ่ม</p>
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-size:40px;font-weight:500;letter-spacing:-.035em;line-height:1">${e.score}</div>
          <div><span class="pill ${e.tier.k}">ความสำคัญ ${e.tier.l}</span>
            <div style="font-size:10.5px;color:var(--ink-3);margin-top:4px">จาก 100 · เทียบกันได้ทุกบริษัท</div></div>
        </div>
        <div style="margin-top:12px">${bars([
    { l: "ศักยภาพเพิ่มได้ (55%)", v: e.parts.sUp, t: fmt(e.parts.sUp), c: "var(--s1)" },
    { l: "ความพร้อมของผู้นำ (25%)", v: e.parts.sCeo, t: fmt(e.parts.sCeo), c: "var(--s2)" },
    { l: "ระยะห่างจากผู้นำกลุ่ม (20%)", v: e.parts.sGap, t: fmt(e.parts.sGap), c: "var(--s3)" },
  ], { lw: 170, max: 100 })}</div>
        <div class="note brand" style="margin-top:11px">
          <b style="color:${rec.c}">${esc(rec.l)}</b> — ${esc(rec.d)}</div>
      </div>

      <div class="card">
        <h3>ธงความเสี่ยงเชิงโครงสร้าง</h3>
        <p class="desc">เกณฑ์ทุกข้ออิงควอนไทล์ของอุตสาหกรรมเดียวกัน ไม่ใช่ค่าที่ตั้งขึ้นเอง</p>
        ${F.map(f => `<div style="display:flex;gap:9px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)">
          <span class="pill ${f.lv}" style="flex:none;margin-top:1px">${f.lv === "crit" ? "▲" : f.lv === "warn" ? "△" : "✓"}</span>
          <div><div style="font-size:12.4px">${esc(f.l)}</div>
            <div style="font-size:10.8px;color:var(--ink-3);line-height:1.55">${esc(f.d)}</div></div></div>`).join("")}
        <div style="display:flex;gap:8px;margin-top:13px;flex-wrap:wrap">
          <button class="btn p" data-goto="ic">เปิดโหมดที่ประชุม</button>
          <button class="btn s" data-memo="1">พิมพ์บันทึกหน้าเดียว</button>
          <button class="btn g" data-addport="${esc(c.t)}">เพิ่มเข้าพอร์ต</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ============================================================================
   หน้า · พอร์ตลงทุน — แผนภาพโอกาส · จอเฝ้าระวัง · ตารางจัดอันดับ
   ============================================================================ */
const RISK_C = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)" };
const PSORT = [
  { k: "eng", l: "ลำดับการเข้าพบ", f: r => -r.e.score },
  { k: "upside", l: "ศักยภาพเพิ่มได้", f: r => -r.u.delta },
  { k: "ipi", l: "IPI วันนี้", f: r => -r.c.ipi },
  { k: "risk", l: "ความเสี่ยง", f: r => -({ crit: 3, warn: 2, ok: 1 }[r.r.k]) },
  { k: "name", l: "ชื่อย่อ", f: r => r.c.t },
];
/** แถวข้อมูลของพอร์ต — คำนวณครั้งเดียวแล้วใช้ร่วมกันทุกส่วนของหน้า */
function portRows() {
  return S.port.map(t => byT[t]).filter(Boolean).map(c =>
    ({ c, u: upsideOf(c), e: engagement(c), r: riskLevel(c), F: riskFlags(c), rec: recommendation(c) }));
}
/** แผนภาพโอกาส — แกนนอน IPI วันนี้ แกนตั้ง ศักยภาพที่เพิ่มได้ สีคือระดับความเสี่ยง
 *  แกนปรับตามช่วงข้อมูลจริง และวางป้ายชื่อแบบหลบกัน จึงอ่านได้แม้บริษัทเกาะกลุ่ม */
function radarSvg(rows) {
  const W = 720, H = 430, L = 54, R = 20, T = 30, B = 54;
  const xs = rows.map(r => r.c.ipi), ys = rows.map(r => r.u.delta);
  const x0 = Math.max(0, Math.min(...xs) - Math.max(4, (Math.max(...xs) - Math.min(...xs)) * .12));
  const x1 = Math.min(100, Math.max(...xs) + Math.max(4, (Math.max(...xs) - Math.min(...xs)) * .12));
  const ypad = Math.max(2, (Math.max(...ys) - Math.min(...ys)) * .16);
  const y0 = Math.max(0, Math.min(...ys) - ypad), y1 = Math.max(y0 + 4, Math.max(...ys) + ypad);
  const X = v => L + (clamp(v, x0, x1) - x0) / ((x1 - x0) || 1) * (W - L - R);
  const Y = v => H - B - (clamp(v, y0, y1) - y0) / ((y1 - y0) || 1) * (H - T - B);
  const mx = X(qAt(xs, .5)), my = Y(qAt(ys, .5));

  // วางป้ายชื่อแบบหลบกัน — ลองบน ล่าง ขวา ซ้าย ถ้าชนหมดก็ไม่แสดงป้าย (ยังดูได้จากคำแนะนำเครื่องมือ)
  const put = [], SLOT = [[0, -13, "middle"], [0, 19, "middle"], [11, 4, "start"], [-11, 4, "end"]];
  const hit = (a, b) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
  const placed = rows.map(r => {
    const cx = X(r.c.ipi), cy = Y(r.u.delta), w = r.c.t.length * 6.2 + 4;
    for (const [dx, dy, an] of SLOT) {
      const lx = cx + dx, ly = cy + dy;
      const box = { x0: an === "middle" ? lx - w / 2 : an === "start" ? lx : lx - w, y0: ly - 9, y1: ly + 2 };
      box.x1 = box.x0 + w;
      if (box.x0 < L - 6 || box.x1 > W - R + 6 || box.y0 < T - 8 || box.y1 > H - B + 6) continue;
      if (put.some(q => hit(q, box))) continue;
      put.push(box); return { r, cx, cy, dx, dy, an };
    }
    return { r, cx, cy, an: null };
  });

  const dots = placed.map(o => {
    const foc = o.r.c.t === S.t;
    const sh = foc ? `<path d="M0-9.5 9.5 0 0 9.5-9.5 0Z" fill="${RISK_C[o.r.r.k]}" stroke="var(--ink)" stroke-width="2.2"/>`
      : `<circle r="6" fill="${RISK_C[o.r.r.k]}" fill-opacity=".62" stroke="var(--panel)" stroke-width="1.4"/>`;
    const lab = o.an ? `<text x="${o.dx}" y="${o.dy}" font-size="10.2" text-anchor="${o.an}" fill="var(--ink-2)"
        ${foc ? 'font-weight="500"' : ""}>${esc(o.r.c.t)}</text>` : "";
    return `<g class="opt" transform="translate(${o.cx.toFixed(1)},${o.cy.toFixed(1)})" style="cursor:pointer"
       data-t="${esc(o.r.c.t)}" data-n="${esc(o.r.c.n)}" data-i="${o.r.c.ipi}" data-u="${fmt(o.r.u.delta)}" data-e="${o.r.e.score}" data-r="${esc(o.r.r.l)}">
      ${sh}${lab}</g>`;
  }).join("");

  const ticks = tickVals(x0, x1).map(v => `<text x="${X(v).toFixed(1)}" y="${H - B + 16}" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">${fmt(v)}</text>
     <line x1="${X(v).toFixed(1)}" y1="${H - B}" x2="${X(v).toFixed(1)}" y2="${H - B + 4}" stroke="var(--line)"/>`).join("");
  const yticks = tickVals(y0, y1).map(v => `<text x="${L - 8}" y="${(Y(v) + 3.4).toFixed(1)}" font-size="9.5" fill="var(--ink-3)" text-anchor="end">+${fmt(v)}</text>`).join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="แผนภาพโอกาสของพอร์ต">
    <rect x="${L}" y="${T}" width="${(W - L - R).toFixed(0)}" height="${(H - T - B).toFixed(0)}" fill="var(--panel-2)" opacity=".4"/>
    <line x1="${mx.toFixed(1)}" y1="${T}" x2="${mx.toFixed(1)}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
    <line x1="${L}" y1="${my.toFixed(1)}" x2="${W - R}" y2="${my.toFixed(1)}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
    <text x="${L + 7}" y="${T - 9}" font-size="10.5" fill="var(--ink-3)">คะแนนยังไม่สูง แต่ศักยภาพมาก — คุยก่อน</text>
    <text x="${W - R - 7}" y="${T - 9}" font-size="10.5" fill="var(--ink-3)" text-anchor="end">ดีอยู่แล้วและยังไปต่อได้</text>
    <text x="${L + 7}" y="${H - B - 7}" font-size="10.5" fill="var(--ink-3)">ทั้งคะแนนและศักยภาพต่ำ</text>
    <text x="${W - R - 7}" y="${H - B - 7}" font-size="10.5" fill="var(--ink-3)" text-anchor="end">ดีอยู่แล้ว โจทย์คือรักษาไว้</text>
    ${dots}
    <line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="var(--line)"/>
    <line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="var(--line)"/>
    ${ticks}${yticks}
    <text x="${((L + W - R) / 2).toFixed(0)}" y="${H - 12}" font-size="11" fill="var(--ink-2)" text-anchor="middle">IPI วันนี้ →</text>
    <text transform="translate(14,${((T + H - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">ศักยภาพที่เพิ่มได้ (จุด IPI) →</text>
  </svg>
  <div class="legend">
    <span><i style="background:var(--ok)"></i>ความเสี่ยงต่ำ</span>
    <span><i style="background:var(--warn)"></i>ปานกลาง</span>
    <span><i style="background:var(--crit)"></i>สูง</span>
    <span><i class="dia" style="background:var(--ink)"></i>บริษัทที่เลือกอยู่ (รูปข้าวหลามตัด)</span>
    <span>เส้นประ = ค่ากลางของพอร์ตเอง</span></div>`;
}
/** ค่าติ๊กบนแกนที่อ่านง่าย — 4–6 ค่า ลงตัวที่ 1/2/5/10/20/25 */
function tickVals(a, b) {
  const span = (b - a) || 1;
  const step = [1, 2, 5, 10, 20, 25, 50].find(s => span / s <= 6) || 100;
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(v);
  return out;
}

function viewPort() {
  const head = pageHead("พอร์ตลงทุน", "ดูหลายบริษัทพร้อมกัน",
    `จัดอันดับบริษัทในพอร์ตตาม<b>ศักยภาพที่เพิ่มได้</b>และ<b>ธงความเสี่ยงเชิงโครงสร้าง</b> เพื่อตัดสินใจว่าควรเข้าไปคุยกับใครก่อน ·
     พอร์ตเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น ไม่ส่งออกไปที่ใด`);
  const picker = `
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
      <div style="flex:1;min-width:230px">
        <div style="font-size:11px;color:var(--ink-3);margin-bottom:4px">เพิ่มบริษัทเข้าพอร์ต</div>
        <select class="sel" id="pAdd" style="width:100%"></select></div>
      <button class="btn p" id="pAddBtn">เพิ่ม</button>
      <button class="btn s" id="pFill">เติมอัตโนมัติ · 10 อันดับแรกตามลำดับการเข้าพบ (${esc(S.ind === "all" ? "ทั้งตลาด" : IND[S.ind])})</button>
      <button class="btn g" id="pClear">ล้างพอร์ต</button>
      <button class="btn g" id="pCsv">ดาวน์โหลด CSV</button>
    </div>
    <div id="pChips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"></div>
  </div>`;

  const rows = portRows();
  if (!rows.length) return head + picker + `<div class="card" style="text-align:center;padding:40px 20px">
    <div style="font-size:30px;opacity:.35">▤</div>
    <h3 style="justify-content:center;margin-top:8px">ยังไม่มีบริษัทในพอร์ต</h3>
    <p class="desc" style="max-width:44ch;margin:6px auto 0">เพิ่มบริษัทจากช่องด้านบน หรือกด “เติมอัตโนมัติ”
      เพื่อดึง 10 อันดับแรกของมุมมองปัจจุบันเข้ามาดูพร้อมกัน</p></div>`;

  const sk = PSORT.find(s => s.k === (S.psort || "eng")) || PSORT[0];
  const sorted = rows.slice().sort((a, b) => { const x = sk.f(a), y = sk.f(b); return x < y ? -1 : x > y ? 1 : 0; });
  const crit = rows.filter(r => r.r.k === "crit"), warn = rows.filter(r => r.r.k === "warn");
  const avgI = rows.reduce((s, r) => s + r.c.ipi, 0) / rows.length;
  const avgU = rows.reduce((s, r) => s + r.u.delta, 0) / rows.length;
  const topE = sorted.slice().sort((a, b) => b.e.score - a.e.score)[0];

  const stats = `<div class="grid g4" style="margin-bottom:14px">
    ${[[fmt(rows.length), "บริษัทในพอร์ต", (S.ind === "all" ? "ทุกอุตสาหกรรม" : IND[S.ind])],
    [fmt(avgI), "IPI เฉลี่ย", "ค่ากลางตลาด " + fmt(qstats(IPI_ALL).med)],
    ["+" + fmt(avgU), "ศักยภาพเพิ่มเฉลี่ย", "จุด IPI ถ้าบอร์ดไปถึงเพดานกลุ่ม"],
    [fmt(crit.length + warn.length), "บริษัทที่มีธงเตือน", crit.length + " รายอยู่ในระดับสูง"]]
      .map(([v, k, u], i) => `<div class="stat${i === 0 ? " hero" : ""}"><div class="k">${esc(k)}</div>
        <div class="v num">${v}</div><div class="u">${esc(u)}</div></div>`).join("")}
  </div>`;

  const table = `<div class="card" style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div><h3>ตารางจัดอันดับ</h3><p class="desc" style="margin-bottom:0">คลิกชื่อบริษัทเพื่อเปิดรายงานของบริษัทนั้น</p></div>
      <label style="font-size:11.5px;color:var(--ink-2);display:flex;align-items:center;gap:7px">เรียงตาม
        <select class="sel" id="pSort" style="font-size:12px;padding:5px 9px">
          ${PSORT.map(s => `<option value="${s.k}"${s.k === sk.k ? " selected" : ""}>${esc(s.l)}</option>`).join("")}</select></label>
    </div>
    <div class="tw" style="margin-top:10px"><table><thead><tr>
      <th>บริษัท</th><th>อุตสาหกรรม</th><th class="n">IPI</th><th class="n">เพดาน</th><th class="n">เพิ่มได้</th>
      <th class="n">ลำดับเข้าพบ</th><th>ความเสี่ยง</th><th>ข้อเสนอ</th><th></th></tr></thead><tbody>
      ${sorted.map(r => `<tr${r.c.t === S.t ? ' class="hl"' : ""}>
        <td><button class="lnk" data-co="${esc(r.c.t)}"><b>${esc(r.c.t)}</b></button>
          <div style="font-size:10.5px;color:var(--ink-3);max-width:26ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.c.n)}</div></td>
        <td style="font-size:11.5px;color:var(--ink-2)">${esc(IND[r.c.ind])}</td>
        <td class="n"><b>${r.c.ipi}</b></td><td class="n">${fmt(r.u.best)}</td>
        <td class="n" style="color:${r.u.delta >= 10 ? "var(--ok)" : "var(--ink-2)"}">${r.u.delta > 0 ? "+" + fmt(r.u.delta) : "—"}</td>
        <td class="n"><b>${r.e.score}</b></td>
        <td><span class="pill ${r.r.k}">${esc(r.r.l)}</span></td>
        <td style="font-size:11.5px;color:${r.rec.c}">${esc(r.rec.l)}</td>
        <td><button class="btn g" data-rmport="${esc(r.c.t)}" style="padding:3px 8px;font-size:11px" title="เอาออกจากพอร์ต">✕</button></td></tr>`).join("")}
    </tbody></table></div></div>`;

  const monitor = `<div class="card">
    <h3>จอเฝ้าระวัง</h3>
    <p class="desc">รวมทุกธงเตือนของบริษัทในพอร์ต เรียงจากรุนแรงที่สุด</p>
    ${(crit.concat(warn)).length ? (crit.concat(warn)).map(r => `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)">
        <span class="pill ${r.r.k}" style="flex:none;margin-top:1px">${r.r.k === "crit" ? "▲" : "△"}</span>
        <div style="flex:1"><button class="lnk" data-co="${esc(r.c.t)}"><b>${esc(r.c.t)}</b></button>
          <span style="font-size:11px;color:var(--ink-3)"> · ${esc(IND[r.c.ind])}</span>
          ${r.F.filter(f => f.lv !== "ok").map(f => `<div style="font-size:11.4px;color:var(--ink-2);line-height:1.5">— ${esc(f.l)}</div>`).join("")}
        </div></div>`).join("")
      : `<div class="note ok">ไม่พบธงเตือนในพอร์ตนี้ — ทุกบริษัทอยู่ในช่วงปกติของอุตสาหกรรมตัวเอง</div>`}
  </div>`;

  const inner = stats + `<div class="card">
      <h3>แผนภาพโอกาส</h3>
      <p class="desc">มุมซ้ายบนคือกลุ่มที่คุ้มค่าคุยที่สุด — คะแนนวันนี้ยังไม่สูงแต่โครงสร้างบอร์ดยังปรับได้อีกมาก ·
        เส้นประคือค่ากลางของพอร์ตเอง ไม่ใช่ค่าคงที่</p>
      ${radarSvg(rows)}
    </div>
    <div class="grid g-side-r" style="margin-top:14px">
      <div class="card">
        <h3>ควรเข้าไปคุยกับใครก่อน</h3>
        <p class="desc">คะแนนลำดับการเข้าพบสูงสุดในพอร์ต</p>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="font-size:34px;font-weight:500;letter-spacing:-.03em">${esc(topE.c.t)}</div>
          <div><span class="pill ${topE.e.tier.k}">คะแนน ${topE.e.score} · ความสำคัญ${topE.e.tier.l}</span>
            <div style="font-size:11px;color:var(--ink-3);margin-top:4px">${esc(topE.c.n)}</div></div>
        </div>
        <div class="note brand" style="margin-top:12px"><b style="color:${topE.rec.c}">${esc(topE.rec.l)}</b> — ${esc(topE.rec.d)}</div>
        <div style="margin-top:12px">${bars(sorted.slice().sort((a, b) => b.e.score - a.e.score).slice(0, 8)
          .map(r => ({ l: r.c.t, v: r.e.score, t: fmt(r.e.score), c: RISK_C[r.r.k], hl: r.c.t === S.t })), { lw: 78, max: 100 })}</div>
        <div style="font-size:10.5px;color:var(--ink-3);margin-top:6px">สีของแท่ง = ระดับความเสี่ยง · คะแนนสูงและสีเขียว = จังหวะที่ดีที่สุด</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn p" data-co="${esc(topE.c.t)}">เปิดรายงานของ ${esc(topE.c.t)}</button>
          <button class="btn s" data-goto="ic">เข้าโหมดที่ประชุม</button></div>
      </div>
      ${monitor}
    </div>` + table;

  if (isUnlocked("port")) return head + picker + inner;
  return head + picker + `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${inner}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:64px"><div class="paycard">
      <div class="lk">🔒</div>
      <h3 style="font-size:16px;margin-bottom:5px">พอร์ตลงทุน</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">
        ปลดล็อกครั้งเดียวต่อบัญชี — ดูได้ทุกบริษัทที่ใส่เข้าพอร์ต ไม่จำกัดจำนวนและไม่หมดอายุ
        ได้แผนภาพโอกาส จอเฝ้าระวัง และตารางจัดอันดับตามศักยภาพ</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" id="pBuy">ปลดล็อก · ใช้ ${PRICE.port} เครดิต</button>
        <button class="btn s" data-goto="billing">ดูแพ็กเกจเครดิต</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">คุณมี <b style="color:var(--ink)">${S.credits}</b> เครดิต · จ่ายครั้งเดียวต่อบัญชี</div>
    </div></div></div>`;
}

/* ============================================================================
   หน้า · โหมดที่ประชุมลงทุน — ตัวอักษรใหญ่ ข้อมูลน้อย บันทึกมติได้
   ============================================================================ */
const DEC = [
  { k: "buy", l: "เห็นชอบให้ลงทุน", c: "var(--ok)" },
  { k: "watch", l: "ติดตามต่อ", c: "var(--s1)" },
  { k: "engage", l: "เข้าไปคุยกับบอร์ด", c: "var(--accent)" },
  { k: "pass", l: "ยังไม่ลงทุน", c: "var(--ink-3)" },
];
/** ลำดับการนำเสนอ — ใช้พอร์ตถ้ามี ไม่งั้นใช้อันดับในอุตสาหกรรม */
function icQueue() {
  const q = S.port.filter(t => byT[t]);
  const base = q.length ? q.slice() : indComps(cur().ind).sort((a, b) => b.ipi - a.ipi).map(x => x.t);
  if (!base.includes(S.t)) base.unshift(S.t);        // บริษัทที่กำลังดูอยู่ต้องอยู่ในลำดับเสมอ
  return base;
}
/** สามข้อสรุปสำหรับฉายในที่ประชุม — สร้างจากตัวเลข ไม่ใช่ข้อความสำเร็จรูป */
function thesis(c) {
  const w = waterfall(c), u = upsideOf(c), e = engagement(c), z = ZONES[zoneOf(c.promo, c.amp)];
  const pool = indComps(c.ind).sort((a, b) => b.ipi - a.ipi), rk = pool.findIndex(x => x.t === c.t) + 1;
  const best = w.steps.slice().sort((a, b) => b.d - a.d)[0], worst = w.steps.slice().sort((a, b) => a.d - b.d)[0];
  const out = [
    { h: "ตำแหน่งวันนี้", t: `IPI ${c.ipi} — อันดับ ${rk} จาก ${pool.length} ใน${IND[c.ind]}`,
      d: `อยู่ในกลุ่ม ${z.l} · ภาษาผู้นำอยู่ที่เปอร์เซ็นไทล์ ${c.dp} และโครงสร้างบอร์ดอยู่ที่ ${ampPct(c.amp)}` },
    { h: "ตัวขับและตัวฉุด", t: `${WF_SHORT[best.k]} ${best.d >= 0 ? "+" : "−"}${fmt(Math.abs(best.d))} · ${WF_SHORT[worst.k]} ${worst.d >= 0 ? "+" : "−"}${fmt(Math.abs(worst.d))}`,
      d: `เทียบกับบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด คะแนนได้มาจาก${WF_SHORT[best.k]}มากที่สุด และเสียไปกับ${WF_SHORT[worst.k]}มากที่สุด` },
    { h: "ศักยภาพและจังหวะ", t: u.delta > 0 ? `เพิ่มได้อีก ${fmt(u.delta)} จุด → IPI ${fmt(u.best)}` : `ถึงเพดานของกลุ่มแล้ว`,
      d: `คะแนนลำดับการเข้าพบ ${e.score} จาก 100 · ${recommendation(c).d}` },
  ];
  return out;
}
/** ฉากทัศน์สามทางสำหรับที่ประชุม */
function icScenarios(c) {
  const u = upsideOf(c);
  const dn = ipiAt(c, Object.assign(profOf(c), { fem: clamp(c.fem - .1, 0, 1), ten: c.ten + 3 }));
  const mid = ipiAt(c, Object.assign(profOf(c), { fem: clamp(c.fem + .1, 0, 1) }));
  return [
    { l: "ถอยหลัง", d: "กรรมการหญิงลดลง 10 จุด และบอร์ดชุดเดิมอยู่ต่ออีก 3 ปี", v: dn, c: "var(--crit)" },
    { l: "คงเดิม", d: "โครงสร้างบอร์ดและภาษาผู้นำไม่เปลี่ยน", v: c.ipi, c: "var(--ink-2)" },
    { l: "ปรับได้จริง", d: "เพิ่มกรรมการหญิง 10 จุด", v: mid, c: "var(--s1)" },
    { l: "เพดานของกลุ่ม", d: "โครงสร้างบอร์ดไปถึงค่าที่ดีที่สุดที่พบจริงในอุตสาหกรรมเดียวกัน", v: u.best, c: "var(--ok)" },
  ];
}
function viewIC() {
  const c = cur(), z = ZONES[zoneOf(c.promo, c.amp)], u = upsideOf(c), e = engagement(c), r = riskLevel(c), rec = recommendation(c);
  const q = icQueue(), pos = q.indexOf(c.t);
  const th = thesis(c), sc = icScenarios(c), d = S.dec[c.t] || {};
  if (!isUnlocked("report")) return pageHead("โหมดที่ประชุมลงทุน", c.t + " · " + c.n, "หน้าจอสำหรับฉายในที่ประชุม")
    + `<div class="card" style="text-align:center;padding:38px 22px">
      <div style="font-size:30px;opacity:.4">🔒</div>
      <h3 style="justify-content:center;margin-top:8px">ต้องเปิดรายงานของบริษัทนี้ก่อน</h3>
      <p class="desc" style="max-width:48ch;margin:6px auto 14px">โหมดที่ประชุมใช้ตัวเลขชุดเดียวกับรายงานวินิจฉัย
        เปิดรายงานของ ${esc(c.t)} ครั้งเดียวแล้วเข้าโหมดนี้ได้ตลอดโดยไม่เสียเครดิตเพิ่ม</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-unlock="report">ปลดล็อกที่นี่ · ใช้ ${PRICE.report} เครดิต</button>
        <button class="btn s" id="icSkip">ข้ามไปบริษัทถัดไป</button>
        <button class="btn g" data-goto="fit">ไปที่หน้ารายงาน</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">คุณมี <b style="color:var(--ink)">${S.credits}</b> เครดิต</div></div>`;

  const scMax = Math.max(...sc.map(s => s.v), 100);
  return `<div class="ic">
    <div class="icbar">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)">
        วาระที่ ${pos + 1} จาก ${q.length} · ${esc(IND[c.ind])}</div>
      <div class="spacer"></div>
      <button class="btn g" id="icPrev">‹ ก่อนหน้า</button>
      <button class="btn s" id="icMemo">พิมพ์บันทึกหน้าเดียว</button>
      <button class="btn g" id="icFull">โหมดฉาย</button>
      <button class="btn p" id="icNext">บริษัทถัดไป ›</button>
    </div>

    <div class="ichero">
      <div>
        <div class="icname">${esc(c.t)}</div>
        <div class="icsub">${esc(c.n)}</div>
        <div style="margin-top:14px;display:flex;gap:9px;flex-wrap:wrap">
          <span class="pill" style="font-size:13px;padding:5px 13px;background:color-mix(in srgb,${z.c} 15%,transparent);color:${z.c};border-color:color-mix(in srgb,${z.c} 40%,transparent)">${esc(z.l)}</span>
          <span class="pill ${r.k}" style="font-size:13px;padding:5px 13px">ความเสี่ยง${esc(r.l)}</span>
          <span class="pill ${e.tier.k}" style="font-size:13px;padding:5px 13px">ลำดับเข้าพบ ${e.score}</span>
        </div>
      </div>
      <div class="icscore">
        <div class="icipi">${c.ipi}</div>
        <div class="ick">IPI วันนี้</div>
        ${u.delta > 0 ? `<div class="icup">▲ เพิ่มได้อีก ${fmt(u.delta)} → ${fmt(u.best)}</div>`
      : `<div class="icup" style="color:var(--ink-3)">ถึงเพดานของกลุ่มแล้ว</div>`}
      </div>
    </div>

    <div class="grid g3 icth">
      ${th.map((t, i) => `<div class="card">
        <div style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand)">${i + 1} · ${esc(t.h)}</div>
        <div style="font-size:19px;font-weight:500;letter-spacing:-.02em;line-height:1.35;margin:7px 0 8px">${esc(t.t)}</div>
        <div style="font-size:13px;color:var(--ink-2);line-height:1.65">${esc(t.d)}</div></div>`).join("")}
    </div>

    <div class="grid g-side-r" style="margin-top:14px">
      <div class="card">
        <h3 style="font-size:15px">ฉากทัศน์</h3>
        <p class="desc" style="font-size:12.5px">คำนวณจากสัมประสิทธิ์ของโมเดล — เป็นฉากทัศน์เพื่อการตัดสินใจ ไม่ใช่การพยากรณ์</p>
        ${sc.map(s => `<div class="icsc">
          <div><div style="font-size:15px">${esc(s.l)}</div>
            <div style="font-size:12px;color:var(--ink-3);line-height:1.5">${esc(s.d)}</div></div>
          <div class="mbar" style="height:12px"><span style="width:${(s.v / scMax * 100).toFixed(1)}%;background:${s.c}"></span></div>
          <div style="font-size:22px;font-weight:500;text-align:right;min-width:56px;color:${s.c}">${fmt(s.v)}</div></div>`).join("")}
        <div class="note brand" style="margin-top:12px;font-size:12.5px">
          <b style="color:${rec.c}">ข้อเสนอของระบบ · ${esc(rec.l)}</b> — ${esc(rec.d)}</div>
      </div>

      <div class="card">
        <h3 style="font-size:15px">บันทึกมติที่ประชุม</h3>
        <p class="desc" style="font-size:12.5px">บันทึกไว้ในเบราว์เซอร์ของคุณเท่านั้น</p>
        <div style="display:grid;gap:7px">
          ${DEC.map(o => `<label class="icdec${d.k === o.k ? " on" : ""}">
            <input type="radio" name="icdec" value="${o.k}"${d.k === o.k ? " checked" : ""}>
            <span style="width:9px;height:9px;border-radius:99px;background:${o.c};flex:none"></span>
            <span>${esc(o.l)}</span></label>`).join("")}
        </div>
        <textarea class="inp" id="icNote" rows="4" placeholder="บันทึกเพิ่มเติม เช่น เงื่อนไขที่ต้องติดตาม หรือผู้รับผิดชอบ"
          style="width:100%;margin-top:10px;resize:vertical;font-size:13px">${esc(d.note || "")}</textarea>
        <div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">
          <button class="btn p" id="icSave">บันทึกมติ</button>
          <button class="btn g" id="icClear">ล้าง</button></div>
        ${d.at ? `<div class="note ok" style="margin-top:11px;font-size:12px">
          บันทึกล่าสุด <b>${esc(DEC.find(x => x.k === d.k) ? DEC.find(x => x.k === d.k).l : "—")}</b> เมื่อ ${esc(d.at)}</div>` : ""}
      </div>
    </div>

  </div>`;
}

/* ============================================================================
   บันทึกหน้าเดียวสำหรับแนบวาระประชุม — พิมพ์ผ่าน iframe จึงไม่ถูกตัวปิดกั้นป๊อปอัปบล็อก
   ============================================================================ */
const MEMO_CSS = `
@page{size:A4 portrait;margin:11mm}
html,body{background:#fff}
body{padding:0;margin:0;font-size:10.5px;color:var(--ink)}
.mm{max-width:190mm;margin:0 auto;padding:0}
.mmhead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-bottom:2px solid var(--brand);padding-bottom:9px;margin-bottom:11px}
.mmt{font-size:22px;font-weight:500;letter-spacing:-.02em;line-height:1.15}
.mmn{font-size:11px;color:var(--ink-2)}
.mmipi{font-size:38px;font-weight:500;line-height:1;letter-spacing:-.03em;text-align:right}
.mmg{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.mmg3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.mmb{border:1px solid var(--line);border-radius:8px;padding:7px 10px;break-inside:avoid}
.mmb h4{font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--brand);margin:0 0 5px;font-weight:500}
.mmb p{margin:0;font-size:10.6px;line-height:1.55;color:var(--ink-2)}
.mml{font-size:10.6px;line-height:1.6}
table{font-size:10.2px}
th,td{padding:4px 6px}
.mmwf svg{display:block;width:100%}
.mmfoot{margin-top:10px;padding-top:7px;border-top:1px solid var(--line);font-size:8.6px;color:var(--ink-3);line-height:1.5}
.card{box-shadow:none;padding:0;border:0}
`;
function memoHtml(c) {
  const z = ZONES[zoneOf(c.promo, c.amp)], u = upsideOf(c), e = engagement(c), r = riskLevel(c), rec = recommendation(c);
  const th = thesis(c), sc = icScenarios(c), F = riskFlags(c), d = S.dec[c.t] || {};
  const pool = indComps(c.ind).sort((x, y) => y.ipi - x.ipi), rk = pool.findIndex(x => x.t === c.t) + 1;
  const dl = d.k && DEC.find(x => x.k === d.k) ? DEC.find(x => x.k === d.k).l : null;
  const w = waterfall(c);
  const up = w.steps.filter(x => x.d > 0).sort((x, y) => y.d - x.d), dn = w.steps.filter(x => x.d < 0).sort((x, y) => x.d - y.d);
  return `<div class="mm">
    <div class="mmhead">
      <div><div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)">บันทึกสำหรับที่ประชุมลงทุน · Board Signal</div>
        <div class="mmt">${esc(c.t)} · ${esc(c.n)}</div>
        <div class="mmn">${esc(IND[c.ind])} · อันดับ ${rk} จาก ${pool.length} ในอุตสาหกรรม · ข้อมูลปี 2566 · ${esc(z.l)}</div></div>
      <div><div class="mmipi">${c.ipi}</div>
        <div style="font-size:9px;color:var(--ink-3);text-align:right;line-height:1.5">IPI วันนี้<br>
          ${u.delta > 0 ? "เพดานเชิงโครงสร้าง " + fmt(u.best) + " (+" + fmt(u.delta) + ")" : "ถึงเพดานของกลุ่มแล้ว"}<br>
          ลำดับการเข้าพบ ${e.score} / 100 · ความเสี่ยง${esc(r.l)}</div></div>
    </div>

    <div class="mmg3" style="margin-bottom:8px">
      ${th.map((t, i) => `<div class="mmb"><h4>${i + 1} · ${esc(t.h)}</h4>
        <div style="font-size:12px;font-weight:500;line-height:1.35;margin-bottom:4px">${esc(t.t)}</div>
        <p>${esc(t.d)}</p></div>`).join("")}
    </div>

    <div class="mmb mmwf" style="margin-bottom:8px">
      <h4>คะแนนนี้มาจากไหน — แผนภาพน้ำตก</h4>
      ${waterfallSvg(c, true)}
      <div class="mmg" style="margin-top:4px;gap:8px">
        <p><b style="color:var(--ok)">ตัวได้</b> ${up.length ? up.map(x => esc(WF_SHORT[x.k]) + " +" + fmt(x.d)).join(" · ") : "—"}</p>
        <p><b style="color:var(--crit)">ตัวเสีย</b> ${dn.length ? dn.map(x => esc(WF_SHORT[x.k]) + " −" + fmt(-x.d)).join(" · ") : "—"}</p>
      </div>
    </div>

    <div class="mmg" style="margin-bottom:8px">
      <div class="mmb"><h4>ฉากทัศน์ · คำนวณจากสัมประสิทธิ์ของโมเดล</h4>
        <table><tbody>${sc.map(x => `<tr><td>${esc(x.l)}<div style="font-size:9px;color:var(--ink-3);line-height:1.4">${esc(x.d)}</div></td>
          <td class="n" style="font-weight:500;color:${x.c};font-size:15px">${fmt(x.v)}</td></tr>`).join("")}</tbody></table>
        <div style="margin-top:6px;font-size:10.2px"><b>ข้อเสนอของระบบ · ${esc(rec.l)}</b>
          <span style="color:var(--ink-2)">— ${esc(rec.d)}</span></div></div>
      <div class="mmb"><h4>ตัวเลขสำคัญ</h4>
        <table><tbody>
          ${[["CEO Drive (เปอร์เซ็นไทล์)", c.dp], ["Board Amplification (เปอร์เซ็นไทล์)", ampPct(c.amp)],
        ["Promotion focus (ค่าดิบ)", fmt(c.promo, 2)],
        ["กรรมการหญิง", pct1(c.fem)], ["กรรมการครอบครัว", pct1(c.fam)],
        ["อายุงานเฉลี่ยบอร์ด", fmt(c.ten, 1) + " ปี"], ["กรรมการสายนโยบาย", c.pol ? "มี" : "ไม่มี"],
        ["กิจกรรมนวัตกรรมเปิดที่นับได้", fmt(c.oi)]]
        .map(x => `<tr><td>${esc(x[0])}</td><td class="n"><b>${x[1]}</b></td></tr>`).join("")}
        </tbody></table></div>
    </div>

    <div class="mmg">
      <div class="mmb"><h4>ธงความเสี่ยงเชิงโครงสร้าง · ระดับ${esc(r.l)}</h4>
        ${F.map(f => `<div class="mml" style="margin-bottom:4px">${f.lv === "crit" ? "▲" : f.lv === "warn" ? "△" : "✓"} <b>${esc(f.l)}</b><br>
          <span style="color:var(--ink-3)">${esc(f.d)}</span></div>`).join("")}
        <div style="font-size:9px;color:var(--ink-3);margin-top:6px;line-height:1.5">
          เกณฑ์ทุกข้ออิงควอนไทล์ของอุตสาหกรรมเดียวกัน · ระบบไม่ตั้งกรรมการสายนโยบายเป็นเป้าหมายในการสรรหา</div></div>
      <div class="mmb"><h4>มติที่ประชุม</h4>
        ${dl ? `<div style="font-size:13px;font-weight:500;color:var(--ok)">${esc(dl)}</div>
            <div style="font-size:9px;color:var(--ink-3)">บันทึกเมื่อ ${esc(d.at || "")}</div>
            ${d.note ? `<p style="margin-top:5px">${esc(d.note)}</p>` : ""}`
      : `<div style="display:flex;gap:9px;flex-wrap:wrap;font-size:10.4px;margin-bottom:6px">
            ${DEC.map(o => `<span>☐ ${esc(o.l)}</span>`).join("")}</div>`}
        <div style="font-size:9px;color:var(--ink-3);margin:7px 0 3px">บันทึกเพิ่มเติม</div>
        ${[0, 1].map(() => `<div style="border-bottom:1px solid var(--line);height:14px"></div>`).join("")}
        <div class="mmg" style="margin-top:9px;gap:14px">
          <div><div style="border-bottom:1px solid var(--ink-3);height:20px"></div>
            <div style="font-size:9px;color:var(--ink-3)">ผู้เสนอวาระ</div></div>
          <div><div style="border-bottom:1px solid var(--ink-3);height:20px"></div>
            <div style="font-size:9px;color:var(--ink-3)">ประธานที่ประชุม</div></div></div></div>
    </div>

    <div class="mmfoot">Board Signal · เครื่องมือ<b>ประเมิน</b> (diagnostic) ไม่ใช่การพยากรณ์ ·
      IPI สร้างจากแผงข้อมูล 209 บริษัท 928 บริษัท-ปี (2562–2566) ตัวเลขทุกตัวเป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง
      ไม่ใช่ความสัมพันธ์เชิงสาเหตุ ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน และห้ามนำไปใช้ให้คะแนนรายบุคคล ·
      พิมพ์เมื่อ ${esc(new Date().toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" }))}</div>
  </div>`;
}
function printMemo(c) {
  const styles = [...document.querySelectorAll("style")].map(s => s.textContent).join("\n");
  const doc = "<" + "!doctype html><html lang=\"th\"><head><meta charset=\"utf-8\"><title>บันทึกที่ประชุม · " + esc(c.t) +
    "</title><style>" + styles + "</style><style>" + MEMO_CSS + "</style></head><body data-brand=\"" +
    (document.body.dataset.brand || "A") + "\" data-mode=\"light\">" + memoHtml(c) + "</body></html>";
  let f = $("#memoFrame");
  if (!f) { f = document.createElement("iframe"); f.id = "memoFrame"; f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none"; document.body.appendChild(f); }
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (err) { toast("เบราว์เซอร์ปิดกั้นการพิมพ์ — ลองใช้ Ctrl+P"); } };
  f.srcdoc = doc;
  toast("กำลังเตรียมบันทึกหน้าเดียว …");
}

/* ============================================================================
   การผูกเหตุการณ์และการต่อเข้าระบบเดิม
   ============================================================================ */
function wirePort(h) {
  const sel = h.querySelector("#pAdd");
  if (sel) {
    const list = (S.ind === "all" ? COMPS : indComps(+S.ind)).slice().sort((a, b) => b.ipi - a.ipi);
    const free = list.filter(x => !S.port.includes(x.t));
    sel.innerHTML = free.length ? free.map(x => `<option value="${esc(x.t)}">${esc(x.t)} · ${esc(x.n)}</option>`).join("")
      : `<option value="">— อยู่ในพอร์ตครบทุกบริษัทในมุมมองนี้แล้ว —</option>`;
  }
  const chips = h.querySelector("#pChips");
  if (chips) chips.innerHTML = S.port.length
    ? S.port.map(t => `<span class="chip">${esc(t)}<button class="btn g" data-rmport="${esc(t)}" style="padding:0 4px;font-size:11px;border:0;background:none">✕</button></span>`).join("")
    : `<span style="font-size:11px;color:var(--ink-3)">พอร์ตว่าง</span>`;

  const add = t => { if (t && !S.port.includes(t)) { S.port.push(t); save(); render(); } };
  const ab = h.querySelector("#pAddBtn"); if (ab) ab.onclick = () => add(sel.value);
  const fl = h.querySelector("#pFill");
  if (fl) fl.onclick = () => {
    const list = (S.ind === "all" ? COMPS : indComps(+S.ind)).slice()
      .sort((a, b) => engagement(b).score - engagement(a).score).slice(0, 10);
    list.forEach(x => { if (!S.port.includes(x.t)) S.port.push(x.t); });
    save(); toast("เพิ่มแล้ว · พอร์ตมี " + S.port.length + " บริษัท"); render();
  };
  const cl = h.querySelector("#pClear");
  if (cl) cl.onclick = () => { if (!S.port.length || !confirm("ล้างพอร์ตทั้งหมด?")) return; S.port = []; save(); render(); };
  const so = h.querySelector("#pSort"); if (so) so.onchange = () => { S.psort = so.value; save(); render(); };
  const by = h.querySelector("#pBuy");
  if (by) by.onclick = () => { if (spend("port", "ALL", "พอร์ตลงทุน")) render(); };
  h.querySelectorAll("[data-rmport]").forEach(b => b.onclick = e => {
    e.stopPropagation(); S.port = S.port.filter(t => t !== b.dataset.rmport); save(); render();
  });
  h.querySelectorAll(".opt").forEach(g => {
    tipOn(g, el => `<div class="tk">ความเสี่ยง${el.dataset.r}</div><b>${el.dataset.t}</b> · ${el.dataset.n}<br>
      IPI ${el.dataset.i} · เพิ่มได้ +${el.dataset.u} · ลำดับเข้าพบ ${el.dataset.e}<br>คลิกเพื่อเปิดรายงาน`);
    g.onclick = () => { S.t = g.dataset.t; S.peers = []; S.wi = null; $("#selCo").value = S.t; syncChrome(); go("fit"); };
  });
  const cv = h.querySelector("#pCsv");
  if (cv) cv.onclick = () => {
    const rows = portRows();
    if (!rows.length) return toast("พอร์ตว่าง");
    const head = ["ตัวย่อ", "ชื่อบริษัท", "อุตสาหกรรม", "โซน", "IPI", "เพดานเชิงโครงสร้าง", "เพิ่มได้", "ลำดับเข้าพบ", "ความเสี่ยง", "ข้อเสนอ"].join(",");
    const body = rows.map(r => [r.c.t, `"${r.c.n}"`, `"${IND[r.c.ind]}"`, `"${ZONES[zoneOf(r.c.promo, r.c.amp)].l}"`,
      r.c.ipi, fmt(r.u.best), fmt(r.u.delta), r.e.score, `"${r.r.l}"`, `"${r.rec.l}"`].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...body].join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "boardsignal_portfolio.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
}
function wireIC(h) {
  const c = cur(), q = icQueue(), i = q.indexOf(c.t);
  const jump = k => {
    const t = q[(i + k + q.length) % q.length];
    if (!t || t === c.t) return toast("มีบริษัทเดียวในลำดับ");
    S.t = t; S.peers = []; S.wi = null; $("#selCo").value = t; syncChrome(); render();
  };
  const nx = h.querySelector("#icNext"); if (nx) nx.onclick = () => jump(1);
  const sk = h.querySelector("#icSkip"); if (sk) sk.onclick = () => jump(1);
  const pv = h.querySelector("#icPrev"); if (pv) pv.onclick = () => jump(-1);
  const mm = h.querySelector("#icMemo"); if (mm) mm.onclick = () => printMemo(c);
  const fu = h.querySelector("#icFull");
  if (fu) fu.onclick = () => {
    const on = !document.body.classList.contains("present");
    document.body.classList.toggle("present", on);
    fu.textContent = on ? "ออกจากโหมดฉาย" : "โหมดฉาย";
    try { on ? document.documentElement.requestFullscreen() : document.exitFullscreen(); } catch (e) { }
    if (on) toast("โหมดฉาย · กด Esc เพื่อออก");
  };
  const sv = h.querySelector("#icSave");
  if (sv) sv.onclick = () => {
    const r = h.querySelector('input[name="icdec"]:checked');
    if (!r) return toast("เลือกมติก่อนบันทึก");
    S.dec[c.t] = { k: r.value, note: h.querySelector("#icNote").value.trim(),
      at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) };
    save(); toast("บันทึกมติของ " + c.t + " แล้ว"); render();
  };
  const cl = h.querySelector("#icClear");
  if (cl) cl.onclick = () => { delete S.dec[c.t]; save(); render(); };
  h.querySelectorAll(".icdec").forEach(l => l.onclick = () => {
    h.querySelectorAll(".icdec").forEach(x => x.classList.remove("on")); l.classList.add("on");
  });
}
/** ปุ่มที่ใช้ได้ทุกหน้า — พิมพ์บันทึก และเพิ่มเข้าพอร์ต */
function wireInvestCommon(h) {
  h.querySelectorAll("[data-memo]").forEach(b => b.onclick = () => printMemo(cur()));
  h.querySelectorAll("[data-addport]").forEach(b => b.onclick = () => {
    const t = b.dataset.addport;
    if (S.port.includes(t)) { toast(t + " อยู่ในพอร์ตแล้ว"); return go("port"); }
    S.port.push(t); save(); toast("เพิ่ม " + t + " เข้าพอร์ตแล้ว · " + S.port.length + " บริษัท"); go("port");
  });
  h.querySelectorAll(".wfb[data-d]").forEach(g => {
    if (!g.dataset.d) return;
    tipOn(g, el => `<div class="tk">ขั้นของแผนภาพน้ำตก</div><b>${el.dataset.l}</b><br>
      เปลี่ยนคะแนน ${el.dataset.d > 0 ? "+" : ""}${el.dataset.d} จุด → IPI ${el.dataset.to}`);
  });
}

/* ---------------------------------------------------------------- ต่อเข้าระบบเดิม */
PRICE.port = 3;
S.port = []; S.dec = {}; S.psort = "eng";
NAV.push(
  { id: "port", g: 2, ico: "▤", lab: "พอร์ตลงทุน", lock: "port" },
  { id: "ic", g: 1, ico: "▶", lab: "โหมดที่ประชุม", lock: "report" },
);
NAV.sort((a, b) => a.g - b.g);
VIEWS.port = viewPort; VIEWS.ic = viewIC;

const _isUnlocked = isUnlocked;
isUnlocked = function (what, t) { return what === "port" ? !!S.unlocked["port:ALL"] : _isUnlocked(what, t); };

/* เก็บพอร์ตและมติไว้คนละกุญแจกับสถานะเดิม เพราะ save() ของระบบเดิมเขียนทับทั้งก้อน
   และถูกเรียกตั้งแต่ตอน enter() ก่อนที่ไฟล์นี้จะทำงาน */
const LS_INV = LS + "_invest";
const _save = save;
save = function () {
  _save();
  try { localStorage.setItem(LS_INV, JSON.stringify({ pf: S.port, dc: S.dec, ps: S.psort })); } catch (e) { }
};

const _viewFit = viewFit;
viewFit = function () { return _viewFit() + (isUnlocked("report") ? investBlock(cur()) : ""); };
VIEWS.fit = viewFit;                                  // VIEWS เก็บอ้างอิงเดิมไว้ ต้องชี้ใหม่ด้วย

const WIRES = { fit: wireFit, matrix: wireMatrix, peer: wirePeer, studio: wireStudio,
  sector: wireSector, billing: wireBilling, port: wirePort, ic: wireIC };
render = function () {
  const host = $("#v-" + S.view);
  if (!host) return;
  host.innerHTML = VIEWS[S.view]();
  wireActions(host);
  (WIRES[S.view] || (() => { }))(host);
  wireInvestCommon(host);
  syncChrome();
};

(function initInvest() {
  const wrap = $("#v-fit") && $("#v-fit").parentNode;
  if (wrap) ["port", "ic"].forEach(id => {
    if ($("#v-" + id)) return;
    const s = document.createElement("section"); s.className = "view"; s.id = "v-" + id;
    wrap.insertBefore(s, $("#v-valid").nextSibling);
  });
  try {
    const o = JSON.parse(localStorage.getItem(LS_INV) || "null");
    if (o) { S.port = o.pf || []; S.dec = o.dc || {}; S.psort = o.ps || "eng"; }
  } catch (e) { }
  buildNav();
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove("present");
      const b = $("#icFull"); if (b) b.textContent = "โหมดฉาย";
    }
  });
  if (S.user) { syncChrome(); render(); }
})();
