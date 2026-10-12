/* ============================================================================
   OpenInnoScore — ชั้นสำหรับนักลงทุน
     1. แผนภาพน้ำตก  แยกว่าคะแนน OI มาจากตัวแปรไหนบวกลบเท่าไหร่
     2. ศักยภาพเพิ่ม · ธงความเสี่ยง · ลำดับการเข้าพบ
     3. พอร์ตลงทุน · แผนภาพโอกาส · จอเฝ้าระวัง
     4. โหมดที่ประชุมลงทุน
     5. บันทึกหน้าเดียวสำหรับแนบวาระประชุม
   ต่อท้าย app.js — ใช้ตัวช่วยที่ประกาศไว้แล้วทั้งหมด
   ============================================================================ */

/* ---------------------------------------------------------------- ระดับสิทธิ์ (แก้ไขครั้งที่ 2.2)
   Level 1 Free · Level 2 Pro (Pay-Per-Use) · Level 3 Pro Max (Subscription, add-on จาก Pro)
   ประกาศไว้ที่นี่เพราะไฟล์นี้ render ตั้งแต่ตอนโหลด (ก่อน v2_tiers.js) — ตารางสิทธิ์เต็มอยู่ใน v2_tiers.js */
const PLAN_RANK = { free: 0, pro: 1, max: 2 };
const PLAN_LAB = { free: "Free", pro: "Pro", max: "Pro Max" };
const tierRank = () => PLAN_RANK[S.plan] ?? 0;
/** มุมมองธนาคาร (Pilot) — ล็อกตัวแปรบริบทใน What-if */
const wiCtxLocked = () => { try { return typeof ucLens === "function" && ["credit", "bankbod"].includes(ucLens().id); } catch (e) { return false; } };
/** นับคำของข้อความไทย + อังกฤษ — ใช้ Intl.Segmenter ถ้ามี ไม่งั้นนับคำละตินด้วยช่องว่าง และประมาณคำไทยด้วยจำนวนอักขระ / 4.5 */
function wordCount(txt) {
  const s = String(txt || "");
  if (!s.trim()) return 0;
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      let n = 0;
      for (const seg of new Intl.Segmenter("th", { granularity: "word" }).segment(s)) if (seg.isWordLike) n++;
      return n;
    }
  } catch (e) { }
  const thai = (s.match(/[฀-๿]/g) || []).length;
  const latin = s.replace(/[฀-๿]+/g, " ").split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
  return latin + Math.round(thai / 4.5);
}
const FREE_MIN_WORDS = 2000;

/* ---------------------------------------------------------------- เครื่องมือสถิติ */
/** ควอนไทล์ของอาร์เรย์ (ไม่ต้องเรียงมาก่อน) */
function qAt(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}
/** ค่ากลางตลาดของแต่ละตัวแปร — ใช้เป็นจุดตั้งต้นของแผนภาพน้ำตก */
const MKT = { promo: OM.P, fem: OM.W, fam: OM.F, pol: OM.G, ten: OM.T };

/** OpenInnoScore ของโปรไฟล์ใด ๆ — เก็บทศนิยมไว้ก่อน ยังไม่ปัดเศษ (E4 → E5 → E7) */
const ipiRaw = o => oisOf(signalB(o.promo, ampOf(o.fam, o.pol, o.fem, o.ten)));
const profOf = c => ({ promo: c.promo, fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten });
/** ค่าชดเชยการปัดเศษของแต่ละบริษัท — ทำให้โปรไฟล์เดิมได้ OI ตรงกับที่แสดงทุกหน้าเสมอ */
const calOf = c => c.ipi - ipiRaw(profOf(c));
/** OI ของโปรไฟล์สมมติ เทียบมาตรฐานกับบริษัทต้นทาง */
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
  { k: "promo", l: "CEO Promotion Focus", note: "cP = ค่าหลัง winsorise ลบค่าเฉลี่ยฐานอ้างอิง (E2–E3)" },
  { k: "fem", l: "สัดส่วนกรรมการหญิง", note: "ตัวแปรที่สัมพันธ์กับ amp มากที่สุดในสูตร E4 — ทิศทางบวก" },
  { k: "fam", l: "สัดส่วนกรรมการครอบครัว", note: "ข้อมูลบริบท ไม่ใช่คันโยก (R6) — ทิศทางลบในสูตร" },
  { k: "pol", l: "กรรมการที่เข้าเกณฑ์ political ties", note: "ข้อมูลบริบท — ไม่ใช้เป็นเหตุผลเชิงบวก (R6)" },
];
/* อายุงานเฉลี่ยของบอร์ด (δT) ถูกปิดด้วย evidence gate g_T = 0 ตามสมการ E4
   จึงไม่ปรากฏในแผนภาพน้ำตก — ค่าของมันเป็นศูนย์เสมอ */
const TEN_NOTE = "ไม่มีผลต่อคะแนน (δT = 0, evidence gate)";
/** ค่าควอนไทล์ของสัดส่วนกรรมการหญิงในอุตสาหกรรมเดียวกัน — ใช้เป็นเป้าหมาย/ฉากทัศน์ */
const femQ = (ind, p) => qAt(indComps(ind).map(x => x.fem), p);
/** แยกส่วนประกอบของ OI แบบสะสมทีละตัวแปร — ผลรวมเท่ากับ OI จริงเสมอ
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
/** โครงสร้างบอร์ดที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมเดียวกัน — คันโยกเดียวคือสัดส่วนกรรมการหญิง
 *  กรรมการครอบครัว / political ties / อายุงาน เป็นข้อมูลบริบท (R6, δT = 0) ไม่ใช่เป้าหมายในการสรรหา */
function optimalBoard(c) {
  return {
    promo: c.promo,                                   // ไม่นับการเปลี่ยน CEO เป็นศักยภาพของบอร์ด
    fem: Math.max(c.fem, femQ(c.ind, .9)),
    fam: c.fam, ten: c.ten, pol: c.pol,
  };
}
/** ศักยภาพที่ยังไม่ได้ใช้ — ต่างระหว่าง OI ปัจจุบันกับ OI เมื่อบอร์ดไปถึงค่าที่ดีที่สุดในกลุ่ม (ตามสูตร เชิงความสัมพันธ์) */
function upsideOf(c) {
  const best = optimalBoard(c), v = Math.max(c.ipi, ipiAt(c, best));
  return { now: c.ipi, best: v, delta: v - c.ipi, target: best };
}
/** ธงความเสี่ยงเชิงโครงสร้าง — เกณฑ์ทุกข้ออิงควอนไทล์ของอุตสาหกรรมเดียวกัน
 *  ข้อที่เกี่ยวกับกรรมการครอบครัวเป็นข้อมูลบริบท (R6) ไม่ใช่ข้อเสนอให้ปรับ · อายุงานไม่อยู่ในธง (δT = 0) */
function riskFlags(c) {
  const pool = indComps(c.ind), F = [];
  const famHi = qAt(pool.map(x => x.fam), .8), femLo = qAt(pool.map(x => x.fem), .2);
  if (c.fam >= famHi && c.dp >= 70) F.push({ lv: "crit", l: "ผู้นำรุกแต่บอร์ดกระจุกในครอบครัว (ข้อมูลบริบท R6)",
    d: `กรรมการครอบครัว ${pct1(c.fam)} อยู่ในกลุ่มสูงสุดของอุตสาหกรรม ขณะที่ CEO ใช้ภาษาเชิงรุกระดับ ${c.dp} — ในฐานอ้างอิง รูปแบบนี้สัมพันธ์เชิงลบกับการหนุนสัญญาณ (เชิงความสัมพันธ์ ไม่ใช่เหตุ-ผล)` });
  else if (c.fam >= famHi) F.push({ lv: "warn", l: "กรรมการครอบครัวสูงกว่ากลุ่ม (ข้อมูลบริบท R6)",
    d: `${pct1(c.fam)} เทียบกับค่ากลางอุตสาหกรรม ${pct1(qAt(pool.map(x => x.fam), .5))} — ระบบไม่เสนอให้เพิ่มหรือลดกรรมการครอบครัว` });
  if (c.fem <= femLo) F.push({ lv: "warn", l: "ความหลากหลายทางเพศต่ำ",
    d: `กรรมการหญิง ${pct1(c.fem)} อยู่ในกลุ่มต่ำสุดของอุตสาหกรรม — เป็นตัวแปรที่สัมพันธ์กับการหนุนสัญญาณมากที่สุดในสูตร E4` });
  if (c.dp <= 30 && ampPct(c.amp) >= 65) F.push({ lv: "warn", l: "บอร์ดพร้อมแต่ผู้นำยังไม่ขยับ",
    d: `โครงสร้างบอร์ดอยู่ที่เปอร์เซ็นไทล์ ${ampPct(c.amp)} แต่ภาษาผู้นำอยู่ที่ ${c.dp} — สัญญาณจากภาษา CEO ยังไม่สะท้อนการบุก` });
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
    d: "ผู้นำพร้อมแต่โครงสร้างบอร์ดจำกัด — เป็นกรณีที่องค์ประกอบบอร์ดสัมพันธ์กับคะแนนชัดที่สุดตามสูตร (เชิงความสัมพันธ์)" };
  if (e.upside.delta >= 10) return { k: "watch-up", l: "ติดตามและรอจังหวะ", c: "var(--s1)",
    d: "มีช่องว่างเชิงโครงสร้างบอร์ดตามสูตร แต่ภาษาผู้นำยังไม่สนับสนุน ควรรอสัญญาณจากฝ่ายบริหารก่อน" };
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

/** แผนภาพน้ำตก — เริ่มจากค่ากลางตลาด แล้วเปลี่ยนทีละตัวแปรจนได้ OI จริง */
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

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="แผนภาพน้ำตกของ OpenInnoScore">
    ${grid}${body}
    <line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1.2"/>
    <text x="${L}" y="${T - 10}" font-size="10" fill="var(--ink-3)">OpenInnoScore (เปอร์เซ็นไทล์ 0–100)</text>
  </svg>` + (cmp ? "" : `
  <div class="legend">
    <span><i style="background:var(--ink-3)"></i>จุดตั้งต้น = บริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด</span>
    <span><i style="background:var(--ok)"></i>ตัวแปรที่สัมพันธ์เชิงบวกกับคะแนน (ตามสูตร)</span>
    <span><i style="background:var(--crit)"></i>ตัวแปรที่สัมพันธ์เชิงลบกับคะแนน (ตามสูตร)</span>
    <span><i style="background:var(--brand)"></i>คะแนนจริงของบริษัท</span></div>`);
}

/** การ์ดสามใบสำหรับหน้ารายงาน — น้ำตก · ศักยภาพและความเสี่ยง · ลำดับการเข้าพบ */
function investBlock(c) {
  const w = waterfall(c), u = upsideOf(c), F = riskFlags(c), e = engagement(c), rec = recommendation(c);
  const up = w.steps.filter(s => s.d > 0).sort((a, b) => b.d - a.d);
  const dn = w.steps.filter(s => s.d < 0).sort((a, b) => a.d - b.d);
  const tgtRows = [
    ["กรรมการหญิง", pct1(c.fem), pct1(u.target.fem), c.fem !== u.target.fem],
    ["กรรมการครอบครัว (ข้อมูลบริบท R6)", pct1(c.fam), "ไม่ใช่คันโยก", false],
    ["อายุงานเฉลี่ยบอร์ด (ข้อมูลบริบท)", fmt(c.ten, 1) + " ปี", TEN_NOTE, false],
  ];
  return `
  <div class="card" style="margin-top:14px">
    <h3>คะแนนนี้มาจากไหน — แผนภาพน้ำตก</h3>
    <p class="desc">เริ่มจากบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางฐานอ้างอิง (OIS ${fmt(w.base)}) แล้วเปลี่ยนเป็นค่าจริงของ ${esc(c.t)} ทีละตัว
      ผลรวมของทุกขั้นเท่ากับ OpenInnoScore จริง ${fmt(w.total)} เสมอ — อ่านเป็นการแยกส่วนประกอบตามสูตร (เชิงความสัมพันธ์) ว่าตัวแปรใดสัมพันธ์เชิงบวก ตัวใดสัมพันธ์เชิงลบ</p>
    ${waterfallSvg(c)}
    <div class="grid g2" style="margin-top:13px">
      <div class="note ok"><b>ตัวได้</b> —
        ${up.length ? up.map(s => `${esc(WF_SHORT[s.k])} <b>+${fmt(s.d)}</b>`).join(" · ") + " (ตามสูตร, เชิงความสัมพันธ์)" : "ไม่มีตัวแปรใดสัมพันธ์เชิงบวกกับคะแนนเมื่อเทียบค่ากลางตลาด"}</div>
      <div class="note ${dn.length ? "warn" : ""}"><b>ตัวเสีย</b> —
        ${dn.length ? dn.map(s => `${esc(WF_SHORT[s.k])} <b>−${fmt(-s.d)}</b>`).join(" · ") + " (ตามสูตร, เชิงความสัมพันธ์)" : "ไม่มีตัวแปรใดสัมพันธ์เชิงลบกับคะแนนเมื่อเทียบค่ากลางตลาด"}</div>
    </div>
    <div class="note" style="margin-top:10px;font-size:10.8px">
      ลำดับของขั้นมีผลต่อการแบ่งคะแนนเล็กน้อย เพราะเปอร์เซ็นไทล์ไม่ใช่ฟังก์ชันเชิงเส้น —
      ระบบใช้ลำดับเดียวกันทุกบริษัทเพื่อให้เทียบกันได้ ตัวเลขนี้จึงเป็นการ<b>แยกส่วนประกอบ</b> ไม่ใช่การพยากรณ์ผลของการปรับจริง</div>
  </div>

  <div class="grid g-side-r" style="margin-top:14px">
    <div class="card">
      <h3>ศักยภาพที่ยังไม่ได้ใช้</h3>
      <p class="desc">ถ้าโครงสร้างบอร์ดขยับไปถึงค่าที่ดีที่สุดเท่าที่<b>พบจริง</b>ในกลุ่ม ${esc(IND[c.ind])}
        (เปอร์เซ็นไทล์ 90 ของสัดส่วนกรรมการหญิง) โดยไม่แตะภาษาผู้นำ · กรรมการครอบครัว / political ties / อายุงาน เป็นข้อมูลบริบท ไม่ใช่คันโยก — ตัวเลขเป็นความสัมพันธ์ตามสูตร ไม่ใช่การพยากรณ์</p>
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
        political ties เป็นข้อมูลบริบท ไม่ใช่คันโยก และไม่ใช้เป็นเหตุผลเชิงบวก (R6) · กรรมการครอบครัวเป็นข้อมูลบริบทเช่นกัน
        · ตัวเลขทั้งหมดเป็นความสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่การรับประกันผล</div>
    </div>

    <div class="stack">
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
  { k: "ipi", l: "OpenInnoScore วันนี้", f: r => -r.c.ipi },
  { k: "risk", l: "ความเสี่ยง", f: r => -({ crit: 3, warn: 2, ok: 1 }[r.r.k]) },
  { k: "name", l: "ชื่อย่อ", f: r => r.c.t },
];
/** แถวข้อมูลของพอร์ต — คำนวณครั้งเดียวแล้วใช้ร่วมกันทุกส่วนของหน้า */
function portRows() {
  return S.port.map(t => byT[t]).filter(Boolean).map(c =>
    ({ c, u: upsideOf(c), e: engagement(c), r: riskLevel(c), F: riskFlags(c), rec: recommendation(c) }));
}
/** แผนภาพโอกาส — แกนนอน OI วันนี้ แกนตั้ง ศักยภาพที่เพิ่มได้ สีคือระดับความเสี่ยง
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
    <text x="${((L + W - R) / 2).toFixed(0)}" y="${H - 12}" font-size="11" fill="var(--ink-2)" text-anchor="middle">OpenInnoScore วันนี้ →</text>
    <text transform="translate(14,${((T + H - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">ช่องว่างเชิงโครงสร้าง (จุด, ตามสูตร) →</text>
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
    [fmt(avgI), "OpenInnoScore เฉลี่ย", "ค่ากลางตลาด " + fmt(qstats(IPI_ALL).med)],
    ["+" + fmt(avgU), "ช่องว่างเชิงโครงสร้างเฉลี่ย", "จุด (ตามสูตร, เชิงความสัมพันธ์) ถ้าบอร์ดไปถึงเพดานกลุ่ม"],
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
      <th>บริษัท</th><th>อุตสาหกรรม</th><th class="n">OIS</th><th class="n">เพดาน</th><th class="n">ช่องว่าง (ตามสูตร)</th>
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
        <button class="btn p" id="pBuy">ปลดล็อก · ใช้ ${PRICE.port} token</button>
        <button class="btn s" data-goto="billing">ดูแพ็กเกจ token</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">คุณมี <b style="color:var(--ink)">${S.credits}</b> token · จ่ายครั้งเดียวต่อบัญชี</div>
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
    { h: "ตำแหน่งวันนี้", t: `OIS ${c.ipi} — อันดับ ${rk} จาก ${pool.length} ใน${IND[c.ind]}`,
      d: `อยู่ในกลุ่ม ${z.l} · ภาษาผู้นำอยู่ที่เปอร์เซ็นไทล์ ${c.dp} และโครงสร้างบอร์ดอยู่ที่ ${ampPct(c.amp)}` },
    { h: "ตัวแปรที่สัมพันธ์มากที่สุด", t: `${WF_SHORT[best.k]} ${best.d >= 0 ? "+" : "−"}${fmt(Math.abs(best.d))} · ${WF_SHORT[worst.k]} ${worst.d >= 0 ? "+" : "−"}${fmt(Math.abs(worst.d))}`,
      d: `เทียบกับบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด ตามสูตรคะแนนสัมพันธ์เชิงบวกกับ${WF_SHORT[best.k]}มากที่สุด และสัมพันธ์เชิงลบกับ${WF_SHORT[worst.k]}มากที่สุด (เชิงความสัมพันธ์)` },
    { h: "ช่องว่างเชิงโครงสร้างและจังหวะ", t: u.delta > 0 ? `+${fmt(u.delta)} จุด (ตามสูตร) → OIS ${fmt(u.best)}` : `ถึงเพดานของกลุ่มแล้ว`,
      d: `คะแนนลำดับการเข้าพบ ${e.score} จาก 100 · ${recommendation(c).d}` },
  ];
  return out;
}
/** ฉากทัศน์สามทางสำหรับที่ประชุม */
function icScenarios(c) {
  const u = upsideOf(c);
  const dn = ipiAt(c, Object.assign(profOf(c), { fem: clamp(c.fem - .1, 0, 1) }));
  const mid = ipiAt(c, Object.assign(profOf(c), { fem: clamp(c.fem + .1, 0, 1) }));
  return [
    { l: "ถอยหลัง", d: "สัดส่วนกรรมการหญิงลดลง 10 จุด (อายุงานไม่อยู่ในสูตร δT = 0)", v: dn, c: "var(--crit)" },
    { l: "คงเดิม", d: "โครงสร้างบอร์ดและภาษาผู้นำไม่เปลี่ยน", v: c.ipi, c: "var(--ink-2)" },
    { l: "ปรับได้จริง", d: "สัดส่วนกรรมการหญิงเพิ่ม 10 จุด — ตามสูตร เชิงความสัมพันธ์", v: mid, c: "var(--s1)" },
    { l: "เพดานของกลุ่ม", d: "สัดส่วนกรรมการหญิงไปถึงค่าที่ดีที่สุดที่พบจริงในอุตสาหกรรมเดียวกัน", v: u.best, c: "var(--ok)" },
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
        เปิดรายงานของ ${esc(c.t)} ครั้งเดียวแล้วเข้าโหมดนี้ได้ตลอดโดยไม่เสีย token เพิ่ม</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-unlock="report">ปลดล็อกที่นี่ · ใช้ ${PRICE.report} token</button>
        <button class="btn s" id="icSkip">ข้ามไปบริษัทถัดไป</button>
        <button class="btn g" data-goto="fit">ไปที่หน้ารายงาน</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">คุณมี <b style="color:var(--ink)">${S.credits}</b> token</div></div>`;

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
        <div class="ick">OpenInnoScore วันนี้</div>
        ${u.delta > 0 ? `<div class="icup">▲ ช่องว่างตามสูตร +${fmt(u.delta)} → ${fmt(u.best)}</div>`
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
        <p class="desc" style="font-size:12.5px">คำนวณตามสูตร E4–E7 (เชิงความสัมพันธ์) — เป็นฉากทัศน์เพื่อการตัดสินใจ ไม่ใช่การพยากรณ์</p>
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
      <div style="display:flex;gap:9px;align-items:flex-start">
      <img src="${LOGO_SMALL}" alt="" style="width:26px;height:26px;flex:none;margin-top:1px">
      <div><div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)">บันทึกสำหรับที่ประชุมลงทุน · OpenInnoScore™</div>
        <div class="mmt">${esc(c.t)} · ${esc(c.n)}</div>
        <div class="mmn">${esc(IND[c.ind])} · อันดับ ${rk} จาก ${pool.length} ในอุตสาหกรรม · ข้อมูลปี 2566 · ${esc(z.l)}</div></div></div>
      <div><div class="mmipi">${c.ipi}</div>
        <div style="font-size:9px;color:var(--ink-3);text-align:right;line-height:1.5">OpenInnoScore วันนี้<br>
          ${u.delta > 0 ? "เพดานเชิงโครงสร้าง " + fmt(u.best) + " (+" + fmt(u.delta) + " ตามสูตร)" : "ถึงเพดานของกลุ่มแล้ว"}<br>
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
        <p><b style="color:var(--ok)">สัมพันธ์เชิงบวก</b> ${up.length ? up.map(x => esc(WF_SHORT[x.k]) + " +" + fmt(x.d)).join(" · ") : "—"}</p>
        <p><b style="color:var(--crit)">สัมพันธ์เชิงลบ</b> ${dn.length ? dn.map(x => esc(WF_SHORT[x.k]) + " −" + fmt(-x.d)).join(" · ") : "—"}</p>
      </div>
    </div>

    <div class="mmg" style="margin-bottom:8px">
      <div class="mmb"><h4>ฉากทัศน์ · คำนวณตามสูตร (เชิงความสัมพันธ์)</h4>
        <table><tbody>${sc.map(x => `<tr><td>${esc(x.l)}<div style="font-size:9px;color:var(--ink-3);line-height:1.4">${esc(x.d)}</div></td>
          <td class="n" style="font-weight:500;color:${x.c};font-size:15px">${fmt(x.v)}</td></tr>`).join("")}</tbody></table>
        <div style="margin-top:6px;font-size:10.2px"><b>ข้อเสนอของระบบ · ${esc(rec.l)}</b>
          <span style="color:var(--ink-2)">— ${esc(rec.d)}</span></div></div>
      <div class="mmb"><h4>ตัวเลขสำคัญ</h4>
        <table><tbody>
          ${[["CEO Promotion Focus (เปอร์เซ็นไทล์)", c.dp], ["Board Amplification (เปอร์เซ็นไทล์)", ampPct(c.amp)],
        ["Promotion focus (ค่าดิบ)", fmt(c.promo, 2)],
        ["กรรมการหญิง", pct1(c.fem)], ["กรรมการครอบครัว (บริบท R6)", pct1(c.fam)],
        ["อายุงานเฉลี่ยบอร์ด (δT = 0)", fmt(c.ten, 1) + " ปี"], ["political ties (บริบท)", c.pol ? "มี" : "ไม่มี"],
        ["กิจกรรมนวัตกรรมเปิดที่นับได้", fmt(c.oi)]]
        .map(x => `<tr><td>${esc(x[0])}</td><td class="n"><b>${x[1]}</b></td></tr>`).join("")}
        </tbody></table></div>
    </div>

    <div class="mmg">
      <div class="mmb"><h4>ธงความเสี่ยงเชิงโครงสร้าง · ระดับ${esc(r.l)}</h4>
        ${F.map(f => `<div class="mml" style="margin-bottom:4px">${f.lv === "crit" ? "▲" : f.lv === "warn" ? "△" : "✓"} <b>${esc(f.l)}</b><br>
          <span style="color:var(--ink-3)">${esc(f.d)}</span></div>`).join("")}
        <div style="font-size:9px;color:var(--ink-3);margin-top:6px;line-height:1.5">
          เกณฑ์ทุกข้ออิงควอนไทล์ของอุตสาหกรรมเดียวกัน · political ties และกรรมการครอบครัวเป็นข้อมูลบริบท ไม่ใช่คันโยก (R6)</div></div>
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

    <div class="mmfoot">OpenInnoScore · เครื่องมือ<b>ประเมิน</b> (diagnostic) ไม่ใช่การพยากรณ์ ·
      คะแนนอ้างอิงฐาน REF-928 (928 บริษัท-ปี, 2562–2566) ตัวเลขทุกตัวเป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง
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
      OIS ${el.dataset.i} · ช่องว่างตามสูตร +${el.dataset.u} · ลำดับเข้าพบ ${el.dataset.e}<br>คลิกเพื่อเปิดรายงาน`);
    g.onclick = () => { S.t = g.dataset.t; S.peers = []; S.wi = null; $("#selCo").value = S.t; syncChrome(); go("fit"); };
  });
  const cv = h.querySelector("#pCsv");
  if (cv) cv.onclick = () => {
    const rows = portRows();
    if (!rows.length) return toast("พอร์ตว่าง");
    const head = ["ตัวย่อ", "ชื่อบริษัท", "อุตสาหกรรม", "โซน", "OpenInnoScore", "เพดานเชิงโครงสร้าง", "ช่องว่างตามสูตร", "ลำดับเข้าพบ", "ความเสี่ยง", "ข้อเสนอ"].join(",");
    const body = rows.map(r => [r.c.t, `"${r.c.n}"`, `"${IND[r.c.ind]}"`, `"${ZONES[zoneOf(r.c.promo, r.c.amp)].l}"`,
      r.c.ipi, fmt(r.u.best), fmt(r.u.delta), r.e.score, `"${r.r.l}"`, `"${r.rec.l}"`].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...body].join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "openinnoscore_portfolio.csv"; a.click();
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
      สัมพันธ์กับคะแนน ${el.dataset.d > 0 ? "+" : ""}${el.dataset.d} จุด (ตามสูตร) → OIS ${el.dataset.to}`);
  });
}

/* ---------------------------------------------------------------- ต่อเข้าระบบเดิม */
PRICE.port = 3;
S.port = []; S.dec = {}; S.psort = "eng";
VIEWS.port = viewPort; VIEWS.ic = viewIC;

const _isUnlocked = isUnlocked;
isUnlocked = function (what, t) { return what === "port" ? !!S.unlocked["port:ALL"] : _isUnlocked(what, t); };

/* เก็บพอร์ตและมติไว้คนละกุญแจกับสถานะเดิม เพราะ save() ของระบบเดิมเขียนทับทั้งก้อน
   และถูกเรียกตั้งแต่ตอน enter() ก่อนที่ไฟล์นี้จะทำงาน */
const LS_INV = LS + "_invest";
S.report = S.report || [];                 // รายการข้อค้นพบที่ผู้ใช้กด "Add to Report" (หน้า Compass อ่านจากนี่)
const _save = save;
save = function () {
  _save();
  try {
    // เพิ่ม rp (รายการรายงาน) ลงในก้อนสถานะหลักของระบบเดิม โดยไม่แตะ save() ต้นฉบับ
    const o = JSON.parse(localStorage.getItem(LS) || "null");
    if (o) { o.rp = S.report || []; o.pa = !!S.peerAll; o.idm = S.insDim || "all"; localStorage.setItem(LS, JSON.stringify(o)); }
  } catch (e) { }
  try { localStorage.setItem(LS_INV, JSON.stringify({ pf: S.port, dc: S.dec, ps: S.psort, rp: S.report || [], pa: !!S.peerAll, idm: S.insDim || "all" })); } catch (e) { }
};

const _viewFit = viewFit;   /* ชั้นแก้ไขครั้งที่ 1 จะห่อทับอีกชั้นในส่วนท้ายไฟล์ */

const WIRES = { fit: wireFit, matrix: wireMatrix, peer: wirePeer, studio: wireStudio,
  sector: wireSector, billing: wireBilling, port: wirePort, ic: wireIC };
render = function () {
  const host = $("#v-" + S.view);
  if (!host || typeof VIEWS[S.view] !== "function") return;
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
    if (o) { S.port = o.pf || []; S.dec = o.dc || {}; S.psort = o.ps || "eng"; if (Array.isArray(o.rp)) S.report = o.rp;
      S.peerAll = !!o.pa; S.insDim = o.idm || "all"; }
    // กุญแจหลักของระบบเดิมถูก save() ต้นฉบับเขียนทับตอน boot ก่อนไฟล์นี้ทำงาน — อ่าน rp จากที่นั่นเฉพาะเมื่อยังอยู่
    const m = JSON.parse(localStorage.getItem(LS) || "null");
    if (m && Array.isArray(m.rp) && !S.report.length) S.report = m.rp;
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

/* ============================================================================
   ชั้นแก้ไขครั้งที่ 1 — OpenInnoScore™
   จัดหน้าใหม่เป็น Zone A / B / C ตามเอกสาร โดยไม่แตะโมเดลและไม่ลบหน้าจอเดิมออก
   ============================================================================ */
const T = (en, th) => S.lang === "EN" ? en : th;
const VARS = {
  fem: { en: "Female directors", th: "กรรมการหญิง", dim: "fem" },
  fam: { en: "Family directors (context, R6)", th: "กรรมการครอบครัว (ข้อมูลบริบท R6)", dim: "other" },
  pol: { en: "Political ties (context, R6)", th: "political ties (ข้อมูลบริบท R6)", dim: "other" },
  ten: { en: "Board tenure (no effect, δT = 0)", th: "อายุงานเฉลี่ยบอร์ด (δT = 0)", dim: "other" },
  promo: { en: "CEO Promotion Focus", th: "ภาษาเชิงรุกของ CEO (Promotion Focus)", dim: "ceo" },
};
const vL = k => S.lang === "EN" ? VARS[k].en : VARS[k].th;
const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));
const IND_EN = { 1: "Agro & Food", 2: "Technology", 3: "Resources", 4: "Services",
  5: "Industrials", 6: "Consumer Products", 7: "Property & Construction" };
const indL = i => S.lang === "EN" ? (IND_EN[i] || IND[i]) : IND[i];
const LEVEL_EN = { "สูง": "High", "ปานกลาง": "Moderate", "ต่ำ–ปานกลาง": "Low–moderate", "ต่ำ": "Low" };
const levelL = l => S.lang === "EN" ? (LEVEL_EN[l] || l) : l;
const TONES = [
  { k: "investor", en: "Investor", th: "นักลงทุน" }, { k: "board", en: "Board", th: "คณะกรรมการ" },
  { k: "search", en: "Search Firm", th: "บริษัทสรรหา" }, { k: "iod", en: "IOD", th: "IOD" },
];
const TONE_IMPL = {
  investor: {
    strength: ["For a portfolio screen this is what keeps the firm in the upper band, and it is observable from public filings so it can be monitored every year.",
      "ในมุมการคัดกรองพอร์ต นี่คือสิ่งที่ทำให้บริษัทอยู่ในกลุ่มบน และตรวจได้จากเอกสารเปิดเผย จึงติดตามได้ทุกปี"],
    constraint: ["This is the line item to raise in an engagement meeting — the variable with the clearest association with the score per the formula.",
      "นี่คือประเด็นที่ควรยกขึ้นในการเข้าพบ เป็นตัวแปรที่สัมพันธ์กับคะแนนชัดที่สุดตามสูตร (เชิงความสัมพันธ์)"],
    opportunity: ["Treat this as the upside case in the engagement thesis, not as a forecast of returns.",
      "ใช้เป็นกรณีขาขึ้นในเหตุผลการเข้าพบ ไม่ใช่การพยากรณ์ผลตอบแทน"],
    risk: ["Flag this in the investment memo before sizing the position.", "ระบุข้อนี้ในบันทึกการลงทุนก่อนกำหนดขนาดการถือครอง"] },
  board: {
    strength: ["Worth stating in the annual governance report as evidence of an innovation-supporting structure.",
      "ควรระบุในรายงานการกำกับดูแลกิจการประจำปี เป็นหลักฐานว่าโครงสร้างเอื้อต่อนวัตกรรม"],
    constraint: ["Put this on the nomination committee agenda before the next term expiry.",
      "ควรบรรจุเป็นวาระของคณะกรรมการสรรหาก่อนกรรมการชุดถัดไปครบวาระ"],
    opportunity: ["Per the formula, a single well-chosen appointment is associated with most of this gap — an association, not a guaranteed outcome.",
      "ตามสูตร การแต่งตั้งกรรมการเพียงคนเดียวที่เลือกดี ๆ สัมพันธ์กับช่องว่างนี้เกือบทั้งหมด — เป็นความสัมพันธ์ ไม่ใช่การรับประกันผล"],
    risk: ["The board should record the reason it accepts, or acts on, this observation.",
      "คณะกรรมการควรบันทึกเหตุผลว่ายอมรับหรือจะดำเนินการกับข้อสังเกตนี้อย่างไร"] },
  search: {
    strength: ["Use this in the pitch — the mandate is not to replace what already works.",
      "ใช้ในการนำเสนอ: โจทย์ไม่ใช่การเปลี่ยนสิ่งที่ทำงานได้ดีอยู่แล้ว"],
    constraint: ["This is the gap the search mandate should be written against.", "นี่คือช่องว่างที่ควรใช้เขียนโจทย์การสรรหา"],
    opportunity: ["Puts a formula-based number on the placement's association with the score — useful framing, not a promised result.",
      "เป็นตัวเลขตามสูตรที่บอกว่าการสรรหาครั้งนี้สัมพันธ์กับคะแนนเท่าไร — ใช้เป็นกรอบนำเสนอได้ แต่ไม่ใช่ผลที่รับประกัน"],
    risk: ["Raise it with the client before the longlist, not after.", "ควรคุยกับลูกค้าก่อนทำ longlist ไม่ใช่หลังจากนั้น"] },
  iod: {
    strength: ["A usable case study for director development programmes.", "ใช้เป็นกรณีศึกษาในหลักสูตรพัฒนากรรมการได้"],
    constraint: ["Maps directly onto a board evaluation criterion.", "แปลงเป็นเกณฑ์หนึ่งใน board evaluation ได้ทันที"],
    opportunity: ["Evidence for the policy argument that board composition and open innovation are linked.",
      "เป็นหลักฐานประกอบข้อเสนอเชิงนโยบายว่าองค์ประกอบบอร์ดสัมพันธ์กับ open innovation"],
    risk: ["Report it alongside the validity caveat when advising members.",
      "ควรรายงานพร้อมข้อจำกัดด้านความแม่นเมื่อให้คำแนะนำสมาชิก"] },
};
const toneImpl = kind => { const t = (TONE_IMPL[S.tone] || TONE_IMPL.search)[kind]; return S.lang === "EN" ? t[0] : t[1]; };
/** ธงความเสี่ยง — ใช้เกณฑ์จากชั้นคำนวณเดิมทุกข้อ แปลเฉพาะข้อความ */
function flagsL(c) {
  const F = riskFlags(c);
  if (S.lang !== "EN") return F;
  const pool = indComps(c.ind), med = k => qAt(pool.map(x => x[k]), .5);
  const EN = {
    "ผู้นำรุกแต่บอร์ดกระจุกในครอบครัว (ข้อมูลบริบท R6)": ["Assertive CEO, family-concentrated board (context, R6)",
      `Family directors at ${pct1(c.fam)} sit in the top band of the industry while CEO language is at percentile ${c.dp} — an association in the reference base, not a lever.`],
    "กรรมการครอบครัวสูงกว่ากลุ่ม (ข้อมูลบริบท R6)": ["Family directors above the industry group (context, R6)", `${pct1(c.fam)} against an industry median of ${pct1(med("fam"))} — the engine does not recommend adding or removing family directors.`],
    "ความหลากหลายทางเพศต่ำ": ["Low gender diversity on the board",
      `Female directors at ${pct1(c.fem)} sit in the bottom band of the industry — the variable most strongly associated with amplification in the formula.`],
    "บอร์ดพร้อมแต่ผู้นำยังไม่ขยับ": ["The board is ready, the CEO has not moved",
      `Board structure at percentile ${ampPct(c.amp)} while CEO language is at ${c.dp}.`],
    "ไม่พบธงความเสี่ยงเชิงโครงสร้าง": ["No structural red flag", "Every variable sits inside the normal range for this industry."],
  };
  return F.map(f => EN[f.l] ? { lv: f.lv, l: EN[f.l][0], d: EN[f.l][1] } : f);
}
const REC_EN = {
  engage: ["Engage with the board", "The CEO is already assertive while board structure is the binding constraint — the case where board composition is most clearly associated with the score per the formula."],
  "watch-up": ["Watch and wait for the moment", "There is a structural gap in board composition per the formula, but the CEO's language does not yet support it."],
  caution: ["Proceed with caution", "There are structural red flags that should be checked before acting."],
  hold: ["Hold and monitor", "Already in the top group; what board change adds is not large enough to be the main reason to act."],
  pass: ["Not the moment", "Neither the current score nor the remaining upside stands out against the group."],
};
const recL = c => { const r = recommendation(c);
  return S.lang === "EN" && REC_EN[r.k] ? { k: r.k, c: r.c, l: REC_EN[r.k][0], d: REC_EN[r.k][1] } : r; };

/* ---------------------------------------------------------------- Zone A · Document Intelligence */
const EXTRACT = [
  { k: "fem", en: "Female BOD %", th: "กรรมการหญิง %", kind: "pct" },
  { k: "fam", en: "Family BOD % (context, R6)", th: "กรรมการครอบครัว % (บริบท R6)", kind: "pct" },
  { k: "pol", en: "Political ties (context)", th: "political ties (บริบท)", kind: "bool" },
  { k: "ten", en: "Average tenure (δT = 0)", th: "อายุงานเฉลี่ยบอร์ด (δT = 0)", kind: "yr" },
];
const CONF = {
  db: { k: "warn", en: "Medium", th: "ปานกลาง", den: "from the 2019–2023 panel", dth: "จากแผงข้อมูล 2562–2566" },
  user: { k: "ok", en: "High", th: "สูง", den: "entered by the user", dth: "ผู้ใช้กรอกเอง" },
  doc: { k: "ok", en: "High", th: "สูง", den: "counted from the uploaded file", dth: "นับจากไฟล์ที่อัปโหลดจริง" },
  liwc: { k: "ok", en: "High (LIWC-22)", th: "สูง (LIWC-22)", den: "LIWC-22 value entered by the user", dth: "ค่า LIWC-22 ที่ผู้ใช้กรอก" },
};
const confOf = k => { const o = (S.ov || {})[S.t] || {};
  if (k === "dp" && o.pRaw !== undefined) return CONF.liwc;
  if (o[k] !== undefined) return k === "dp" && S.ceo ? CONF.doc : CONF.user;
  return CONF.db; };
const confLab = c => S.lang === "EN" ? c.en : c.th;
const confDesc = c => S.lang === "EN" ? c.den : c.dth;
S.docs = S.docs || [];
const setOv = (k, v) => { (S.ov[S.t] = S.ov[S.t] || {})[k] = v; save(); };
const clearOv = () => { delete S.ov[S.t]; S.ceo = null; S.docs = []; S.wi = null; _ceoBuf = ""; save(); };
/* ข้อความ CEO ที่วิเคราะห์แล้วถูกเก็บไว้ในหน่วยความจำของแท็บนี้เท่านั้น (ไม่อยู่ใน S และไม่ถูกบันทึกลง localStorage)
   เพื่อให้ส่งออกเป็น .txt สำหรับ LIWC-22 ได้ครั้งเดียว — ส่งออกแล้วจะล้างทิ้งทันที (C4) */
let _ceoBuf = "";

/** ชั้นห่อ coOf — เพิ่ม bsize (จำนวนกรรมการทั้งหมด) และ pRaw (ค่า LIWC-22) ที่ผู้ใช้กรอกใน Zone A
 *  ตัวโมเดลอยู่ใน v2_app.js ไม่แตะ · pRaw แทนค่า promotion focus ที่ประมาณจากพจนานุกรมเปิด (dp) */
if (!OV_FIELDS.includes("pRaw")) OV_FIELDS.push("pRaw");
if (!OV_FIELDS.includes("bsize")) OV_FIELDS.push("bsize");
const _coOf0 = coOf;
/* ใช้ชั้นห่อเฉพาะเมื่อ coOf ของ v2_app.js ยังไม่รองรับ pRaw/bsize เอง (กันคำนวณซ้ำสองทาง) */
if (!/pRaw/.test(String(_coOf0))) coOf = function (t) {
  t = t || S.t;
  const o = (S.ov || {})[t] || {};
  let m = _coOf0(t);
  if (o.bsize === undefined && o.pRaw === undefined) return m;
  if (!m.edited) m = Object.assign({}, m);
  if (o.bsize) m.bsize = o.bsize;
  if (o.pRaw !== undefined && isFinite(o.pRaw)) {
    m.promo = o.pRaw;
    m.amp = ampOf(m.fam, m.pol, m.fem, m.ten);
    m.cP = cpOf(m.promo); m.B = m.cP * m.amp;
    m.ois = oisOf(m.B); m.oisInd = oisIndOf(m.B, m.ind);
    m.dp = promoPct(m.promo); m.ap = ampPct(m.amp);
    m.ipi = Math.round(m.ois); m.iip = Math.round(m.oisInd);
    m.tier = tierOf(m.ois); m.quad = quadOf(m.cP, m.amp);
    m.band = band90(m.promo, m.fam, m.pol, m.fem);
    m.edited = true;
  }
  m.clipped = clippedOf(m);
  return m;
};

// แถบลำดับงาน Upload → Insights → Recommendation — ให้เห็นตำแหน่งเดียวกันทั้ง Zone A / B / C
function flowBar(st) {
  const steps = [
    { h: T("Upload documents", "อัปโหลดเอกสาร"), p: T("56-1 One Report · Annual Report · CEO letter · meeting transcript", "56-1 One Report · รายงานประจำปี · สารจาก CEO · transcript การประชุม") },
    { h: T("Generate insights", "สรุปเป็นข้อค้นพบ"), p: T("The model scores the firm and explains which variables the score is associated with, in the tone you choose.", "โมเดลคิดคะแนนแล้วอธิบายว่าคะแนนสัมพันธ์กับตัวแปรใด ด้วยโทนที่เลือกได้") },
    { h: T("Recommend action", "เสนอสิ่งที่ควรทำ"), p: T("Ranked board-composition observations with the formula-based association and feasibility of each.", "จัดลำดับข้อสังเกตเรื่ององค์ประกอบบอร์ด พร้อมความสัมพันธ์กับคะแนนตามสูตรและความยากง่ายของแต่ละข้อ") },
  ];
  return `<div class="flowbar">${steps.map((s, i) =>
    `<div class="fstep ${i < st ? "done" : i === st ? "on" : ""}"><div class="fn">${i < st ? "✓" : i + 1}</div>
      <h4>${esc(s.h)}</h4><p>${esc(s.p)}</p></div>`).join("")}</div>`;
}

/** ป้ายเตือน "ค่าป้อนถูก clip" (C5) — ใช้ clippedOf ของโมเดล */
function clipChips(c) {
  const cl = clippedOf(c);
  if (!cl.length) return "";
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">${cl.map(k =>
    `<span class="chip" style="border-color:var(--warn);color:var(--ink)" title="${esc(T("Outside the p5–p95 range of the reference base — replaced by the cut-point before entering the formula (E2)",
      "อยู่นอกช่วง p5–p95 ของฐานอ้างอิง จึงถูกแทนด้วยจุดตัดก่อนเข้าสูตร (E2)"))}">⚠ ${T("input clipped", "ค่าป้อนถูก clip")} · ${esc(k)}</span>`).join("")}</div>`;
}

function viewDocs() {
  const c = cur(), ist = DATA.indstats[c.ind], o = (S.ov || {})[S.t] || {};
  const st = (S.docs.length || S.ceo) ? (isEdited() ? 2 : 1) : 0;
  const flow = flowBar(st);
  const fn = femaleN(c.fem, c.bsize);

  const cards = EXTRACT.map(f => {
    const cf = confOf(f.k), v = c[f.k], ed = o[f.k] !== undefined;
    const disp = f.kind === "pct" ? pct1(v) : f.kind === "yr" ? fmt(v, 1) + T(" yr", " ปี") : (v ? T("Yes", "มี") : T("No", "ไม่มี"));
    const ref = f.kind === "pct" ? pct1(ist[f.k]) : f.kind === "yr" ? fmt(ist.ten, 1) + T(" yr", " ปี")
      : T(`${fmt(ist.pol * 100, 0)}% of firms`, `${fmt(ist.pol * 100, 0)}% ของบริษัทในกลุ่ม`);
    const inp = f.kind === "bool"
      ? `<select class="sel ${ed ? "edited" : ""}" data-ex="${f.k}" style="width:100%;max-width:none">
          <option value="1"${v ? " selected" : ""}>${T("Yes", "มี")}</option>
          <option value="0"${v ? "" : " selected"}>${T("No", "ไม่มี")}</option></select>`
      : `<input class="inp ${ed ? "edited" : ""}" data-ex="${f.k}" type="number" step="0.1" min="0"
          max="${f.kind === "pct" ? 100 : 40}" value="${f.kind === "pct" ? fmt(v * 100, 1) : fmt(v, 1)}" style="width:100%">`;
    const extra = f.k === "fem" && fn !== null ? `<div class="sub" style="margin-top:3px;color:${fn < CRIT_N ? "var(--warn)" : "var(--ok)"}">
        ${T(`≈ ${fn} women of ${c.bsize}`, `≈ ผู้หญิง ${fn} คน จาก ${c.bsize} คน`)} · ${fn < CRIT_N ? T(`below critical mass (${CRIT_N})`, `ต่ำกว่า critical mass (${CRIT_N} คน)`) : T("critical mass reached", "ถึง critical mass")}</div>`
      : f.k === "ten" ? `<div class="sub" style="margin-top:3px">${esc(TEN_NOTE)}</div>`
      : f.k === "pol" ? `<div class="sub" style="margin-top:3px">${T("context only — never a lever or a positive reason (R6)", "ข้อมูลบริบท — ไม่ใช่คันโยก ไม่ใช้เป็นเหตุผลเชิงบวก (R6)")}</div>`
      : f.k === "fam" ? `<div class="sub" style="margin-top:3px">${T("context only — not a lever (R6)", "ข้อมูลบริบท — ไม่ใช่คันโยก (R6)")}</div>` : "";
    return `<div class="excard">
      <div class="k">${esc(S.lang === "EN" ? f.en : f.th)}</div>
      <div class="v num">${disp}</div>
      <div class="sub">${T("industry", "ค่ากลุ่ม")} ${ref}</div>${extra}
      <div style="margin:7px 0 6px"><span class="pill ${cf.k}" title="${esc(confDesc(cf))}">${T("Confidence", "ความเชื่อมั่น")} ${esc(confLab(cf))}</span></div>
      ${inp}</div>`;
  }).join("");

  const cf = confOf("dp");
  const files = S.docs.length ? `<div class="files">${S.docs.map((d, i) => `<div class="file">
      <span class="pill ${d.st === "ok" ? "ok" : d.st === "scan" ? "crit" : "warn"}">${d.st === "ok" ? T("Completed", "เสร็จแล้ว") : d.st === "scan" ? T("Scan?", "สแกน?") : T("Needs review", "ควรตรวจซ้ำ")}</span>
      <span class="nm" title="${esc(d.name)}">${esc(d.name)}</span>
      <span style="color:var(--ink-3);font-size:11px;white-space:nowrap">${d.words ? fmt(d.words) + " " + T("words", "คำ") : d.chars !== undefined ? fmt(d.chars) + " " + T("chars", "อักขระ") : ""}</span>
      <button class="btn g" data-rmdoc="${i}" style="padding:2px 8px;font-size:11px">✕</button></div>`).join("")}</div>` : "";
  const scanNote = S.docs.some(d => d.st === "scan") ? `<div class="note crit" style="margin-top:10px;border-color:var(--crit)">
      <b>${T("This file is probably a scan", "ไฟล์นี้น่าจะเป็นสแกน")}</b> — ${T("fewer than 200 characters of text could be read, so it was not scored. OCR needs a server-side service (see the 'Integration' page).",
      "อ่านข้อความได้ไม่ถึง 200 อักขระ จึงไม่นำไปให้คะแนน · OCR ต้องต่อบริการฝั่งเซิร์ฟเวอร์ (ดูหน้า 'การเชื่อมต่อ')")}</div>` : "";

  const preview = S.ceo ? `<details class="blk" open><summary><b>${T("CEO text analysis", "ผลวิเคราะห์ข้อความ CEO")}</b>
      <span style="color:var(--ink-3);font-size:11.4px">${fmt(S.ceo.r.wc)} ${T("words", "คำ")} ·
        ${T("forward-looking", "คำเชิงรุก")} ${fmt(S.ceo.r.pro.n)} · ${T("guarding", "คำเชิงป้องกัน")} ${fmt(S.ceo.r.pre.n)}</span></summary>
      <div class="bd">${_ceoBuf ? `<div class="ev">${highlight(_ceoBuf.slice(0, 3000), S.ceo.r)}</div>
        <div style="font-size:10.8px;color:var(--ink-3);margin-top:7px">
          <span class="hi">${T("forward-looking", "เชิงรุก")}</span> · <span class="hi prev">${T("guarding", "เชิงป้องกัน")}</span> ·
          ${T("every counted word is highlighted so the score can be traced back to the source",
    "ทุกคำที่นับได้ถูกระบายสีไว้ จึงตรวจย้อนกลับได้ว่าคะแนนมาจากข้อความตรงไหน")}</div>`
      : `<div style="font-size:11.5px;color:var(--ink-3)">${T("The original text has been released from memory — only the scores are kept.", "ข้อความต้นฉบับถูกล้างออกจากหน่วยความจำแล้ว — เก็บไว้เฉพาะคะแนน")}</div>`}
        <div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap;align-items:center">
          <button class="btn s" id="btnLiwcTxt"${_ceoBuf ? "" : " disabled"}>${T("Export text as .txt for LIWC-22", "ส่งออกข้อความเป็น .txt สำหรับ LIWC-22")}</button>
          <span style="font-size:10.8px;color:var(--ink-3)">${T("The original text is not stored after analysis — it is cleared after export.", "ข้อความต้นฉบับไม่ถูกเก็บหลังวิเคราะห์ — ส่งออกแล้วระบบล้างทิ้งทันที")}</span></div>
      </div></details>` : "";

  const pRawClip = o.pRaw !== undefined && clipped(o.pRaw, "P");
  const oneReport = `<details class="blk" style="margin-top:12px"><summary><b>${T("Fill from One Report (56-1)", "กรอกข้อมูลจาก One Report (56-1)")}</b>
      <span style="color:var(--ink-3);font-size:11.4px">${T("enter counts, the ratios are computed for you", "กรอกเป็นจำนวนคน ระบบคำนวณสัดส่วนให้")}</span></summary>
    <div class="bd"><div class="grid g4 tight" style="gap:8px">
      ${[["orTot", T("Total directors", "กรรมการทั้งหมด (คน)"), c.bsize || ""], ["orFem", T("Female directors", "กรรมการหญิง (คน)"), ""],
        ["orFam", T("Family-affiliated directors", "กรรมการครอบครัว (คน)"), ""], ["orTen", T("Average tenure (years)", "อายุงานเฉลี่ย (ปี)"), fmt(c.ten, 1)]]
        .map(([id, l, v]) => `<label style="font-size:11px;color:var(--ink-3)">${esc(l)}<input class="inp" id="${id}" type="number" min="0" step="${id === "orTen" ? "0.1" : "1"}" value="${v}" style="width:100%;margin-top:3px"></label>`).join("")}
      <label style="font-size:11px;color:var(--ink-3)">${T("Political ties", "political ties")}<select class="sel" id="orPol" style="width:100%;max-width:none;margin-top:3px">
        <option value="0"${c.pol ? "" : " selected"}>${T("No", "ไม่มี")}</option><option value="1"${c.pol ? " selected" : ""}>${T("Yes", "มี")}</option></select></label>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap">
      <button class="btn p" id="btnOneReport">${T("Compute ratios and fill", "คำนวณสัดส่วนแล้วเติมค่า")}</button>
      <span style="font-size:10.8px;color:var(--ink-3)">${T("Board size is also saved so critical mass (≥ 3 women) can be checked.", "บันทึกจำนวนกรรมการทั้งหมดด้วย เพื่อตรวจ critical mass (กรรมการหญิง ≥ 3 คน)")}</span></div>
    </div></details>`;

  return pageHead("Zone A", "Document Intelligence",
    T("Fast data extraction from uploaded files — every field can be corrected by hand and every number says where it came from.",
      "ดึงข้อมูลจากเอกสารที่อัปโหลดอย่างรวดเร็ว — แก้ค่าเองได้ทุกช่อง และทุกตัวเลขบอกที่มา"))
    + flow + `<div class="grid g-side">
      ${tierRank() < 1 ? docsFreeCard() : `<div class="card">
        <h3>${T("Upload", "อัปโหลดเอกสาร")} <span class="pill ok" style="font-size:10px">${PLAN_LAB[S.plan]}</span></h3>
        <p class="desc">${T("PDF or text · read in your browser only, never sent to a server.", "PDF หรือไฟล์ข้อความ · อ่านในเบราว์เซอร์เท่านั้น ไม่ถูกส่งออกไปที่เซิร์ฟเวอร์ใด")}</p>
        <div class="dz" id="dzA" tabindex="0" role="button">
          <div style="font-size:24px;opacity:.4">⬆</div>
          <div style="font-size:13px;margin-top:6px">${T("Drop files here, or click to choose", "วางไฟล์ตรงนี้ หรือคลิกเพื่อเลือกไฟล์")}</div>
          <div style="font-size:11px;color:var(--ink-3)">.pdf .txt · ${T("multiple files supported", "รองรับหลายไฟล์")}</div></div>
        <input type="file" id="fileA" accept=".pdf,.txt,.md,.html" multiple style="display:none">
        ${files}${scanNote}
        <div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">
          <button class="btn s" id="btnSampleA">${T("Use sample text", "ใช้ข้อความตัวอย่าง")}</button>
          ${(S.ceo || isEdited() || S.docs.length) ? `<button class="btn g" id="btnResetA">${T("Reset to database", "คืนค่าจากฐานข้อมูล")}</button>` : ""}
          <button class="btn g" disabled title="${T("needs the year-by-year panel — Phase II", "ต้องใช้แผงข้อมูลรายปี — Phase II")}">${T("Compare with previous year", "เทียบกับปีก่อน")}</button>
        </div>
        <div class="note" style="margin-top:11px;font-size:10.8px">
          ${T("The year-on-year comparison needs the firm-level panel for every year, which is Phase II. The prototype uses the 2023 snapshot.",
      "การเทียบกับปีก่อนต้องใช้แผงข้อมูลรายบริษัทรายปี ซึ่งอยู่ใน Phase II · ต้นแบบใช้ภาพปี 2566")}</div>
        <div class="tr-auto">
          <button class="btn g" disabled title="เฟสถัดไป · ต้องเชื่อม One Report / SET">⇣ ดึงรายงานประจำปีอัตโนมัติ (เฟสถัดไป · ต้องเชื่อม One Report/SET)</button>
          <span class="pill ${tierRank() >= 2 ? "blue" : "mute"}" style="font-size:10px">${tierRank() >= 2 ? "Pro Max · เตรียมไว้" : "สิทธิ์ Pro Max"}</span></div>
      </div>`}
      <div class="stack">
        <div class="card">
          <h3>${T("Extracted data summary", "สรุปข้อมูลที่ดึงได้")}
            ${isEdited() ? `<span class="pill blue">${S.ceo ? T("updated from document", "อัปเดตจากเอกสาร") : T("edited by hand", "แก้ด้วยมือ")}</span>` : ""}</h3>
          <p class="desc">${T("Four board-composition variables plus the CEO language score. Editing any field recalculates every screen. Family, political ties and tenure are context fields — only female representation and CEO language enter the recommendations.",
      "ตัวแปรโครงสร้างบอร์ดสี่ตัวและคะแนนภาษาผู้บริหาร · แก้ช่องใดก็ตาม ทุกหน้าจะคำนวณใหม่ทันที · กรรมการครอบครัว political ties และอายุงานเป็นข้อมูลบริบท — ข้อเสนอใช้เฉพาะสัดส่วนกรรมการหญิงและภาษา CEO")}</p>
          <div class="grid g4" style="gap:10px">${cards}</div>
          ${clipChips(c)}
          <div class="grid g2" style="margin-top:12px;align-items:start">
            <div class="excard">
              <div class="k">${T("Total directors (board size)", "จำนวนกรรมการทั้งหมด (board size)")}</div>
              <div class="v num">${c.bsize ? fmt(c.bsize) : "—"}</div>
              <div class="sub">${fn === null ? T("enter board size so critical mass can be checked", "กรอกจำนวนกรรมการเพื่อให้ตรวจ critical mass ได้")
      : T(`≈ ${fn} women · research finds the association significant from ${CRIT_N} women (Table 4)`, `≈ ผู้หญิง ${fn} คน · งานวิจัยพบว่าความสัมพันธ์มีนัยเมื่อมี ≥ ${CRIT_N} คน (Table 4)`)}</div>
              <input class="inp ${o.bsize ? "edited" : ""}" data-ex="bsize" type="number" min="3" max="30" step="1" value="${c.bsize || ""}" placeholder="${T("e.g. 11", "เช่น 11")}" style="width:100%;margin-top:7px"></div>
            <div class="excard" style="border-color:${pRawClip ? "var(--warn)" : "var(--line)"}">
              <div class="k">${T("CEO Promotion Focus from LIWC-22 (% words)", "ค่า CEO Promotion Focus จาก LIWC-22 (% คำ)")}</div>
              <div class="v num">${o.pRaw !== undefined ? fmt(o.pRaw, 2) : "—"}</div>
              <div class="sub">${T("Replaces the open-dictionary estimate (dp) when provided · reference p5–p95 ", "ถ้ากรอก ค่านี้จะแทนค่าประมาณจากพจนานุกรมเปิด (dp) · ช่วงอ้างอิง p5–p95 ")}${fmt(OCUT.P[0], 2)}–${fmt(OCUT.P[1], 2)}</div>
              <input class="inp ${o.pRaw !== undefined ? "edited" : ""}" data-ex="pRaw" type="number" min="0" max="3" step="0.01" value="${o.pRaw !== undefined ? o.pRaw : ""}" placeholder="0.00–3.00" style="width:100%;margin-top:7px">
              ${pRawClip ? `<div class="sub" style="color:var(--warn);margin-top:4px">⚠ ${T("outside the reference p5–p95 — clipped before entering the formula (E2)", "อยู่นอกช่วง p5–p95 ของฐานอ้างอิง — ถูก clip ก่อนเข้าสูตร (E2)")}</div>` : ""}
              ${o.pRaw !== undefined ? `<button class="btn g" id="btnPRawClr" style="margin-top:6px;padding:3px 9px;font-size:11px">${T("Clear LIWC value", "ล้างค่า LIWC")}</button>` : ""}</div>
          </div>
          <div class="grid g2" style="margin-top:12px;align-items:center">
            <div class="excard" style="border-color:var(--brand)">
              <div class="k">${T("CEO Promotion Focus (percentile)", "ภาษาผู้บริหาร · CEO Promotion Focus (เปอร์เซ็นไทล์)")}</div>
              <div class="v num">${c.dp}</div>
              <div class="sub">${T("promotion focus", "ค่าดิบ promotion focus")} ${fmt(c.promo, 2)} · ${esc(confDesc(cf))}</div>
              <div style="margin:7px 0 6px"><span class="pill ${cf.k}">${T("Confidence", "ความเชื่อมั่น")} ${esc(confLab(cf))}</span></div>
              <input class="inp ${o.dp !== undefined ? "edited" : ""}" data-ex="dp" type="number"
                min="0" max="100" step="1" value="${c.dp}" style="width:100%"${o.pRaw !== undefined ? " disabled title=\"LIWC-22\"" : ""}></div>
            <div><button class="btn p" id="btnLing" style="width:100%">${T("Send to Linguistic Analysis", "ส่งเข้าการวิเคราะห์ภาษา")}</button>
              <div style="font-size:11px;color:var(--ink-3);margin-top:7px;line-height:1.6">
                ${T("Counts forward-looking against guarding vocabulary in the uploaded text and converts the ratio into a market percentile. For the research-grade value, export the text and run LIWC-22, then enter the result above.",
      "นับคำเชิงรุกเทียบคำเชิงป้องกันในข้อความที่อัปโหลด แล้วแปลงสัดส่วนเป็นเปอร์เซ็นไทล์ของตลาด · ถ้าต้องการค่าตามงานวิจัย ให้ส่งออกข้อความไปประมวลผลด้วย LIWC-22 แล้วกรอกค่าในช่องด้านบน")}</div></div>
          </div>
          ${preview}
          ${oneReport}
          <div class="note warn" style="margin-top:12px">
            <b>${T("What is honest about this prototype", "สิ่งที่ต้องบอกตามตรง")}</b> —
            ${T("CEO language is genuinely counted from the file you upload. Board composition is not yet read from the PDF; it is pre-filled from the 2019–2023 panel and is meant to be corrected by hand. Automatic board extraction and PDF source-jumping are Phase II.",
      "ภาษา CEO นับจากไฟล์ที่อัปโหลดจริง ส่วนองค์ประกอบบอร์ดยังไม่ได้อ่านจาก PDF — ระบบเติมค่าจากแผงข้อมูล 2562–2566 มาให้ก่อนแล้วให้ผู้ใช้แก้เอง · การอ่านบอร์ดอัตโนมัติและการกดตัวเลขเพื่อกระโดดไปหน้า PDF ต้นทางเป็นงาน Phase II")}</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="btn p" data-goto="fit">${T("Continue to Zone B — Insights", "ไปต่อที่ Zone B — ข้อค้นพบ")}</button>
            <button class="btn s" data-goto="zonec">${T("Zone C — Board Refresh", "Zone C — ข้อเสนอปรับบอร์ด")}</button></div>
        </div>
      </div>
    </div>`;
}
/** Level 1 · Free — ตรวจภาษา CEO ได้จากข้อความที่พิมพ์/วางเอง (≥ 2,000 คำ) หรือแบบสอบถาม RFQ · อัปโหลด PDF/TXT เป็นสิทธิ์ Pro */
let _freeBuf = "";
function docsFreeCard() {
  const n = wordCount(_freeBuf), ok = n >= FREE_MIN_WORDS;
  return `<div class="stack"><div class="card">
      <h3>ตรวจภาษา CEO · พิมพ์หรือวางข้อความเอง <span class="pill mute" style="font-size:10px">Free</span></h3>
      <p class="desc">ระดับ Free ตรวจได้จากข้อความที่พิมพ์หรือวางเอง <b>อย่างน้อย ${fmt(FREE_MIN_WORDS)} คำ</b>
        (สารจากประธาน/CEO ทั้งฉบับ) เพื่อให้สัดส่วนคำมีความเสถียรพอ · ข้อความถูกนับในเบราว์เซอร์ ไม่ถูกส่งออก</p>
      <textarea class="inp" id="trFreeTxt" rows="8" style="width:100%;resize:vertical;font-size:12.5px"
        placeholder="วางสารจากประธานกรรมการ / CEO ทั้งฉบับที่นี่ (ภาษาไทยหรืออังกฤษ)">${esc(_freeBuf)}</textarea>
      <div class="tr-wc ${ok ? "ok" : ""}" id="trFreeWc" aria-live="polite">${fmt(n)} / ${fmt(FREE_MIN_WORDS)} คำ${ok ? " · พร้อมวิเคราะห์" : ` · ขาดอีก ${fmt(FREE_MIN_WORDS - n)} คำ`}</div>
      <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">
        <button class="btn p" id="trFreeRun"${ok ? "" : " disabled"}>วิเคราะห์ข้อความ</button>
        ${(S.ceo || isEdited() || S.docs.length) ? `<button class="btn g" id="btnResetA">คืนค่าจากฐานข้อมูล</button>` : ""}</div>
      <p class="tr-sm" id="trFreeMsg">${ok ? "" : `ข้อความยังไม่ถึง ${fmt(FREE_MIN_WORDS)} คำ — ระบบจะยังไม่วิเคราะห์ เพราะข้อความสั้นทำให้สัดส่วนคำแกว่งมาก`}</p>
    </div>
    <div class="card tr-rfq">
      <h3>แบบสอบถาม RFQ <span class="pill warn" style="font-size:10px">รอแบบฟอร์ม</span></h3>
      <p class="desc" style="margin:0">แบบสอบถาม RFQ — รอแบบฟอร์มจากผู้ว่าจ้าง · เมื่อได้รับแบบฟอร์มแล้วจะเปิดให้ตอบแทนการวางข้อความได้</p>
      <button class="btn g" disabled style="margin-top:9px">เริ่มทำแบบสอบถาม (รอแบบฟอร์ม)</button></div>
    <div class="card tr-up-lock">
      <h3>อัปโหลด PDF / TXT <span class="pill blue" style="font-size:10px">Pro</span></h3>
      <p class="desc" style="margin:0">ระดับ Pro อัปโหลดรายงานประจำปี (PDF/TXT) ให้ระบบสแกนคำอัตโนมัติ · Pro Max เพิ่มการดึงรายงานประจำปีให้อัตโนมัติ (เฟสถัดไป)</p>
      <button class="btn s" data-setplan="pro" style="margin-top:9px">เปลี่ยนเป็น Pro (Pay-Per-Use)</button></div></div>`;
}
function wireDocsFree(h) {
  const ta = h.querySelector("#trFreeTxt"); if (!ta) return;
  const wc = h.querySelector("#trFreeWc"), run = h.querySelector("#trFreeRun"), msg = h.querySelector("#trFreeMsg");
  let tm;
  const upd = () => {
    _freeBuf = ta.value;
    const n = wordCount(_freeBuf), ok = n >= FREE_MIN_WORDS;
    wc.textContent = `${fmt(n)} / ${fmt(FREE_MIN_WORDS)} คำ` + (ok ? " · พร้อมวิเคราะห์" : ` · ขาดอีก ${fmt(FREE_MIN_WORDS - n)} คำ`);
    wc.classList.toggle("ok", ok); run.disabled = !ok;
    msg.textContent = ok ? "" : `ข้อความยังไม่ถึง ${fmt(FREE_MIN_WORDS)} คำ — ระบบจะยังไม่วิเคราะห์ เพราะข้อความสั้นทำให้สัดส่วนคำแกว่งมาก`;
  };
  ta.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(upd, 120); });
  run.onclick = () => {
    upd();
    if (wordCount(_freeBuf) < FREE_MIN_WORDS) return toast(`ต้องมีอย่างน้อย ${fmt(FREE_MIN_WORDS)} คำ`);
    analyseDoc(_freeBuf.slice(0, 120000), "ข้อความที่พิมพ์/วางเอง");
  };
}
function analyseDoc(txt, name) {
  if (!txt || !txt.trim()) return toast(T("Nothing to analyse", "ไม่มีข้อความให้วิเคราะห์"));
  const r = analyseText(txt);
  S.ceo = { r, name: name || "" };                 // เก็บเฉพาะคะแนน — ข้อความอยู่ใน _ceoBuf (หน่วยความจำชั่วคราว) เท่านั้น
  _ceoBuf = txt;
  setOv("dp", r.dp);
  S.docs.unshift({ name: name || T("pasted text", "ข้อความที่วาง"), st: r.tot < 6 ? "warn" : "ok", words: r.wc });
  S.docs = S.docs.slice(0, 6);
  S.wi = null;
  toast(T(`Analysed · CEO focus ${r.dp}`, `วิเคราะห์แล้ว · CEO focus ${r.dp}`));
  render();
}
/** ดาวน์โหลดข้อความ CEO เป็น .txt สำหรับ LIWC-22 แล้วล้างข้อความออกจากหน่วยความจำ (C4) */
function exportCeoTxt() {
  if (!_ceoBuf) return toast(T("No text in memory", "ไม่มีข้อความในหน่วยความจำ"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + _ceoBuf], { type: "text/plain;charset=utf-8" }));
  a.download = `${S.t}_ceo_text_for_LIWC22.txt`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  _ceoBuf = "";
  toast(T("Exported — text released from memory", "ส่งออกแล้ว — ล้างข้อความออกจากหน่วยความจำ"));
  render();
}
function wireDocs(h) {
  wireDocsFree(h);
  const dz = h.querySelector("#dzA"), fi = h.querySelector("#fileA");
  if (dz && fi) {
    dz.onclick = () => fi.click();
    dz.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } };
    ["dragenter", "dragover"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("over"); }));
    const take = async list => {
      const fs = [...(list || [])].slice(0, 4); if (!fs.length) return;
      toast(T("Reading …", "กำลังอ่านไฟล์ …"));
      let all = "", scans = 0;
      for (const f of fs) {
        try {
          const t = await readFileText(f);
          if (/\.pdf$/i.test(f.name) && t.trim().length < 200) {       // E3 · PDF ที่อ่านข้อความแทบไม่ได้ = สแกน
            S.docs.unshift({ name: f.name, st: "scan", chars: t.trim().length }); scans++; continue;
          }
          all += t + "\n";
        } catch (e) { }
      }
      S.docs = S.docs.slice(0, 6);
      if (!all.trim()) { if (scans) toast(T("Scanned PDF — not scored", "ไฟล์สแกน — ไม่นำไปให้คะแนน")); return render(); }
      analyseDoc(all.slice(0, 120000), fs.filter(f => !S.docs.some(d => d.st === "scan" && d.name === f.name)).map(f => f.name).join(", "));
    };
    dz.addEventListener("drop", e => take(e.dataTransfer.files));
    fi.onchange = e => take(e.target.files);
  }
  const sm = h.querySelector("#btnSampleA"); if (sm) sm.onclick = () => analyseDoc(SAMPLE, T("sample CEO letter", "สารจาก CEO ตัวอย่าง"));
  const lg = h.querySelector("#btnLing");
  if (lg) lg.onclick = () => _ceoBuf ? analyseDoc(_ceoBuf, S.docs[0] && S.docs[0].name)
    : toast(T("Upload a document or load the sample text first", "อัปโหลดเอกสารหรือโหลดข้อความตัวอย่างก่อน"));
  const rs = h.querySelector("#btnResetA"); if (rs) rs.onclick = () => { clearOv(); render(); };
  const lx = h.querySelector("#btnLiwcTxt"); if (lx) lx.onclick = exportCeoTxt;
  const pc = h.querySelector("#btnPRawClr"); if (pc) pc.onclick = () => { const o = S.ov[S.t]; if (o) delete o.pRaw; S.wi = null; save(); render(); };
  const orb = h.querySelector("#btnOneReport");
  if (orb) orb.onclick = () => {
    const g = id => { const el = h.querySelector("#" + id); return el && el.value !== "" ? +el.value : NaN; };
    const tot = g("orTot"), femN = g("orFem"), famN = g("orFam"), ten = g("orTen"), pol = g("orPol");
    if (!isFinite(tot) || tot < 1) return toast(T("Enter the total number of directors first", "กรอกจำนวนกรรมการทั้งหมดก่อน"));
    setOv("bsize", Math.round(tot));
    if (isFinite(femN)) setOv("fem", clamp(femN / tot, 0, 1));
    if (isFinite(famN)) setOv("fam", clamp(famN / tot, 0, 1));
    if (isFinite(ten)) setOv("ten", clamp(ten, 0, 40));
    if (isFinite(pol)) setOv("pol", pol ? 1 : 0);
    S.wi = null; toast(T("Ratios computed and filled", "คำนวณสัดส่วนและเติมค่าแล้ว")); render();
  };
  h.querySelectorAll("[data-rmdoc]").forEach(b => b.onclick = () => {
    S.docs.splice(+b.dataset.rmdoc, 1);
    if (!S.docs.some(d => d.st !== "scan")) { S.ceo = null; _ceoBuf = ""; const o = S.ov[S.t]; if (o) delete o.dp; save(); } render(); });
  h.querySelectorAll("[data-ex]").forEach(el => el.onchange = () => {
    const k = el.dataset.ex, f = EXTRACT.find(x => x.k === k);
    if (k === "bsize" || k === "pRaw") {
      if (el.value === "") { const o = S.ov[S.t]; if (o) delete o[k]; save(); S.wi = null; return render(); }
      let v = +el.value; if (!isFinite(v)) return render();
      v = k === "bsize" ? Math.round(clamp(v, 1, 40)) : clamp(v, 0, 3);
      setOv(k, v); S.wi = null; return render();
    }
    let v = +el.value; if (!isFinite(v)) return render();
    if (!f) v = Math.round(clamp(v, 0, 100));
    else if (f.kind === "pct") v = clamp(v, 0, 100) / 100;
    else if (f.kind === "yr") v = clamp(v, 0, 40);
    else v = v ? 1 : 0;
    setOv(k, v); S.wi = null; render();
  });
}

/* ---------------------------------------------------------------- Zone B · Insight cards */
const INS_DIMS = [
  { k: "all", en: "All", th: "ทั้งหมด" }, { k: "ceo", en: "CEO language", th: "ภาษา CEO" },
  { k: "fem", en: "Female directors", th: "กรรมการหญิง" }, { k: "other", en: "Other structure", th: "โครงสร้างอื่น" },
];
const dimOfKey = k => (VARS[k] || {}).dim || "other";
/** ข้อความเรื่อง critical mass สำหรับการ์ดที่พูดถึงกรรมการหญิง (Table 4) */
function critMassLine(c) {
  const fn = femaleN(c.fem, c.bsize);
  if (fn === null) return T("Board size is not set — enter it in Zone A so the critical-mass check (≥ 3 women) can run.",
    "ยังไม่ได้กรอกจำนวนกรรมการทั้งหมด — กรอกใน Zone A เพื่อให้ตรวจ critical mass (กรรมการหญิง ≥ 3 คน) ได้");
  if (fn < CRIT_N) return T(`Currently ≈ ${fn} women of ${c.bsize}: the research finds the association significant from ${CRIT_N} women (Table 4); boards with 1–2 women do not differ significantly from 0.`,
    `ปัจจุบัน ≈ ผู้หญิง ${fn} คนจาก ${c.bsize} คน: งานวิจัยพบว่าความสัมพันธ์มีนัยเมื่อมี ≥ ${CRIT_N} คน (Table 4) บอร์ดที่มี 1–2 คนไม่ต่างจาก 0 คนอย่างมีนัย`);
  return T(`≈ ${fn} women of ${c.bsize} — at or above the critical mass of ${CRIT_N} (Table 4).`,
    `≈ ผู้หญิง ${fn} คนจาก ${c.bsize} คน — ถึง critical mass ${CRIT_N} คนแล้ว (Table 4)`);
}
function insightList(c) {
  const w = waterfall(c), u = upsideOf(c), F = flagsL(c), ist = DATA.indstats[c.ind];
  const best = w.steps.slice().sort((a, b) => b.d - a.d)[0];
  const worst = w.steps.slice().sort((a, b) => a.d - b.d)[0];
  const down = ipiAt(c, Object.assign(profOf(c), { fem: clamp(c.fem - .1, 0, 1) })) - c.ipi;
  const val = k => k === "ten" ? fmt(c.ten, 1) + T(" yr", " ปี") : k === "pol" ? (c.pol ? T("yes", "มี") : T("no", "ไม่มี"))
    : k === "promo" ? fmt(c.promo, 2) : pct1(c[k]);
  const iref = k => k === "ten" ? fmt(ist.ten, 1) + T(" yr", " ปี") : k === "pol" ? fmt(ist.pol * 100, 0) + "%"
    : k === "promo" ? fmt(ist.promo, 2) : pct1(ist[k]);
  const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
  const assoc = T("(per the formula, association)", "(ตามสูตร, เชิงความสัมพันธ์)");
  const ctx = k => k === "fam" || k === "pol" ? T(" This is a context variable (R6) — not a lever and never a recommendation.", " ตัวแปรนี้เป็นข้อมูลบริบท (R6) — ไม่ใช่คันโยก และไม่ใช้เป็นข้อเสนอ") : "";
  const out = [];
  out.push({ kind: "strength", tag: T("Strength", "จุดแข็ง"), impact: best.d, dim: dimOfKey(best.k),
    h: T(`${VARS[best.k].en} is associated with +${fmt(best.d)} points ${assoc}`, `${VARS[best.k].th} สัมพันธ์กับ +${fmt(best.d)} จุด ${assoc}`),
    p: T(`Starting from a firm at the reference-base mean on every variable (OIS ${fmt(w.base)}), ${c.t} reaches ${c.ipi}. CEO language sits at percentile ${c.dp}, board structure at ${ampPct(c.amp)}.`,
      `เริ่มจากบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางฐานอ้างอิง (OIS ${fmt(w.base)}) ${c.t} ขึ้นมาที่ ${c.ipi} · ภาษาผู้บริหารอยู่ที่เปอร์เซ็นไทล์ ${c.dp} โครงสร้างบอร์ดอยู่ที่ ${ampPct(c.amp)}`) + ctx(best.k),
    ev: [[T("Variable", "ตัวแปร"), vL(best.k)], [T("Direction in formula", "ทิศทางในสูตร"), best.d >= 0 ? T("positive association", "สัมพันธ์เชิงบวก") : T("negative association", "สัมพันธ์เชิงลบ")],
      [T("This firm", "บริษัทนี้"), val(best.k)], [T("Industry average", "ค่าเฉลี่ยอุตสาหกรรม"), iref(best.k)]] });
  out.push({ kind: "constraint", tag: T("Constraint", "ข้อจำกัด"), impact: Math.min(0, worst.d), dim: dimOfKey(worst.k),
    h: worst.d < 0 ? T(`${VARS[worst.k].en} is associated with −${fmt(-worst.d)} points ${assoc}`, `${VARS[worst.k].th} สัมพันธ์กับ −${fmt(-worst.d)} จุด ${assoc}`)
      : T("No single variable is negatively associated with the score", "ไม่มีตัวแปรใดสัมพันธ์เชิงลบกับคะแนน"),
    p: (worst.d < 0 ? T(`On this variable the firm is at ${val(worst.k)} against an industry average of ${iref(worst.k)}.`,
      `ตัวแปรนี้บริษัทอยู่ที่ ${val(worst.k)} เทียบกับค่าเฉลี่ยอุตสาหกรรม ${iref(worst.k)}`)
      : T("Every variable is at or above the reference-base mean; the remaining distance is to the leaders of the group.",
        "ทุกตัวแปรอยู่ที่หรือสูงกว่าค่ากลางฐานอ้างอิง ที่เหลือคือระยะห่างจากผู้นำของกลุ่ม")) + (worst.d < 0 ? ctx(worst.k) : ""),
    ev: [[T("Variable", "ตัวแปร"), vL(worst.k)], [T("Direction in formula", "ทิศทางในสูตร"), worst.d < 0 ? T("negative association", "สัมพันธ์เชิงลบ") : T("none", "ไม่มี")],
      [T("This firm", "บริษัทนี้"), val(worst.k)], [T("Industry average", "ค่าเฉลี่ยอุตสาหกรรม"), iref(worst.k)]] });
  out.push({ kind: "opportunity", tag: T("Opportunity", "โอกาส"), impact: u.delta, dim: "fem",
    h: u.delta > 0 ? T(`Female representation at the industry p90 is associated with OIS ${fmt(u.best)} ${assoc}`, `สัดส่วนกรรมการหญิงที่ p90 ของอุตสาหกรรมสัมพันธ์กับ OIS ${fmt(u.best)} ${assoc}`)
      : T("Female representation is already at the industry ceiling", "สัดส่วนกรรมการหญิงอยู่ที่เพดานของอุตสาหกรรมแล้ว"),
    p: (u.delta > 0 ? T(`The ceiling is not an ideal figure — it is the best value actually observed among the ${pool.length} firms in ${indL(c.ind)}. `,
      `เพดานนี้ไม่ใช่ค่าอุดมคติ แต่เป็นค่าที่ดีที่สุดที่พบจริงใน ${pool.length} บริษัทของกลุ่ม${IND[c.ind]} · `)
      : T("Further movement would have to come from CEO communication rather than board composition. ",
        "ส่วนที่เหลือต้องมาจากการสื่อสารของผู้นำ ไม่ใช่องค์ประกอบบอร์ด · ")) + critMassLine(c),
    ev: [[T("Current OpenInnoScore", "OpenInnoScore วันนี้"), c.ipi], [T("Structural ceiling (formula)", "เพดานเชิงโครงสร้าง (ตามสูตร)"), fmt(u.best)],
      [T("Female ratio target (industry p90)", "เป้าหมายสัดส่วนกรรมการหญิง (p90 อุตสาหกรรม)"), pct1(u.target.fem)],
      [T("Women on board", "กรรมการหญิง (คน)"), femaleN(c.fem, c.bsize) === null ? T("board size not set", "ยังไม่กรอก board size") : `${femaleN(c.fem, c.bsize)} / ${c.bsize}`]] });
  out.push({ kind: "opportunity", tag: T("CEO language", "ภาษา CEO"), impact: 0, dim: "ceo",
    h: T(`CEO Promotion Focus at percentile ${c.dp} — test alternative wording in What-if`, `CEO Promotion Focus อยู่ที่เปอร์เซ็นไทล์ ${c.dp} — ทดสอบถ้อยคำทางเลือกใน What-if`),
    p: T(`The score is the product cP × amp, so the CEO's promotion-focus language is the other half of the signal. Paste a draft shareholder letter in the What-if Studio to see how its wording is associated with the score; no causal claim is made.`,
      `คะแนนคือผลคูณ cP × amp ภาษา promotion focus ของ CEO จึงเป็นอีกครึ่งหนึ่งของสัญญาณ · วางร่างสารถึงผู้ถือหุ้นใน What-if Studio เพื่อดูว่าถ้อยคำนั้นสัมพันธ์กับคะแนนอย่างไร — ไม่ใช่การอ้างเหตุ-ผล`),
    ev: [[T("Promotion focus (raw)", "Promotion focus (ค่าดิบ)"), fmt(c.promo, 2)], [T("Industry average", "ค่าเฉลี่ยอุตสาหกรรม"), fmt(ist.promo, 2)],
      [T("Percentile", "เปอร์เซ็นไทล์"), c.dp], [T("Source", "ที่มา"), confLab(confOf("dp"))]] });
  const rf = F.find(x => x.lv === "crit") || F.find(x => x.lv === "warn") || F[0];
  const vr = validRemark();
  out.push({ kind: "risk", tag: T("Risk", "ข้อควรระวัง"), impact: down, dim: rf.lv === "ok" ? "other" : (/หญิง|gender/i.test(rf.l) ? "fem" : /ผู้นำ|CEO/i.test(rf.l) ? "ceo" : "other"),
    h: rf.lv === "ok" ? T("No structural red flag, but read the score with its limits", "ไม่พบธงความเสี่ยงเชิงโครงสร้าง แต่ต้องอ่านคะแนนพร้อมข้อจำกัด") : rf.l,
    p: rf.d + " · " + (S.lang === "EN" ? vr.l : vr.th),
    ev: [[T("Downside scenario", "ฉากทัศน์ถอยหลัง"), T("female −10 pts of board (tenure has no effect, δT = 0)", "กรรมการหญิง −10 จุดของสัดส่วนบอร์ด (อายุงานไม่มีผล δT = 0)")],
      [T("Association with score", "ความสัมพันธ์กับคะแนน"), sgn(down) + T(" pts (formula)", " จุด (ตามสูตร)")],
      ["Spearman", fmt(DATA.validYear.all.sp, 3)], ["AUC", fmt(DATA.validYear.all.auc, 3)]] });
  return out;
}
/** ลำดับการ์ดที่แสดงจริง — เรียงตามขนาดความสัมพันธ์ แล้วเอามิติที่เลือก (Regenerate) ขึ้นก่อน */
function insightOrdered(c) {
  const dim = S.insDim || "all";
  const list = insightList(c).slice().sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  if (dim === "all") return list.map(i => Object.assign(i, { dimmed: false }));
  return list.filter(i => i.dim === dim).map(i => Object.assign(i, { dimmed: false }))
    .concat(list.filter(i => i.dim !== dim).map(i => Object.assign(i, { dimmed: true })));
}
/** ตัวเลือกโทนของข้อความ — อยู่ในโซนที่มันเปลี่ยนผลจริง ไม่ใช่ในแถบบน */
function toneBar() {
  return `<span class="segwrap"><span class="seglab">${T("Tone", "โทน")}</span>
    <span class="seg" role="group" aria-label="${T("Tone of voice", "โทนของข้อความ")}">${TONES.map(t =>
    `<button type="button" data-tone="${t.k}" aria-selected="${S.tone === t.k}">${esc(T(t.en, t.th))}</button>`).join("")}</span></span>`;
}
/** รายการที่ผู้ใช้เพิ่มลงรายงาน (F4) — หน้า Compass อ่าน S.report ต่อ */
function reportPanel() {
  const R = S.report || [];
  return `<div class="card" style="margin-top:14px" id="repPanel">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <h3 style="margin:0">${T("Items added to report", "รายการที่เพิ่มลงรายงาน")} (${R.length})</h3>
      ${R.length ? `<button class="btn g" id="btnRepClear" style="padding:3px 10px;font-size:11.5px">${T("Clear all", "ล้างทั้งหมด")}</button>` : ""}</div>
    ${R.length ? `<div style="display:grid;gap:7px;margin-top:10px">${R.map((r, i) => `<div style="display:flex;gap:9px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)">
        <span class="pill mute" style="flex:none">${esc(r.t)}</span>
        <div style="flex:1;min-width:0"><div style="font-size:12.4px">${esc(r.h)}</div>
          <div style="font-size:10.8px;color:var(--ink-3);line-height:1.5">${esc((r.p || "").slice(0, 160))}${(r.p || "").length > 160 ? "…" : ""} · ${esc(r.ts || "")}</div></div>
        <button class="btn g" data-rmrep="${i}" style="padding:2px 8px;font-size:11px" title="${T("Remove", "เอาออก")}">✕</button></div>`).join("")}</div>`
      : `<p class="desc" style="margin:6px 0 0">${T("Use “Add to Report” on any card above. The Strategy Compass report reads this list.", "กด “เพิ่มลงรายงาน” ที่การ์ดด้านบน · รายงาน Strategy Compass จะอ่านรายการนี้")}</p>`}
  </div>`;
}

function insightCards(c) {
  const list = insightOrdered(c);
  const ist = DATA.indstats[c.ind], pool = indComps(c.ind), med = k => qAt(pool.map(x => x[k]), .5);
  const cells = [
    { k: "OpenInnoScore", v: c.ipi, ref: fmt(med("ipi")), d: c.ipi - med("ipi") },
    { k: "CEO Promotion Focus", v: c.dp, ref: fmt(med("dp")), d: c.dp - med("dp") },
    { k: T("Board Amplification", "โครงสร้างบอร์ด"), v: ampPct(c.amp), ref: fmt(med("ap")), d: ampPct(c.amp) - med("ap") },
    { k: T("Female directors", "กรรมการหญิง"), v: pct1(c.fem), ref: pct1(ist.fem), d: (c.fem - ist.fem) * 100 },
  ];
  return `<div class="card" style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div><h3>Zone B · Automated Insight Generator</h3>
        <p class="desc" style="margin-bottom:0">${T("Model output turned into decision-ready statements, in the tone of the audience in the room. Sorted by the size of the association; every figure is per the formula, not a causal effect.",
    "แปลผลของโมเดลเป็นข้อความที่ตัดสินใจต่อได้ ด้วยโทนของผู้ฟังในห้องนั้น เรียงตามขนาดความสัมพันธ์ · ตัวเลขทุกตัวเป็นค่าตามสูตร ไม่ใช่ผลเชิงเหตุ-ผล")}</p></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${toneBar()}
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink-2)">${T("Regenerate · focus", "สร้างใหม่ · เน้นมิติ")}
          <select class="sel" id="selInsDim" style="font-size:12px;padding:5px 9px">${INS_DIMS.map(d =>
    `<option value="${d.k}"${(S.insDim || "all") === d.k ? " selected" : ""}>${esc(T(d.en, d.th))}</option>`).join("")}</select></label>
        <button class="btn s" id="btnRegen">${T("Regenerate", "สร้างใหม่")}</button></div>
    </div>
    <div class="peerstrip">${cells.map(x => `<div class="pcell"><div class="k">${esc(x.k)}</div>
      <div class="v num">${x.v}</div><div class="d" style="color:${x.d > 0 ? "var(--ok)" : x.d < 0 ? "var(--crit)" : "var(--ink-3)"}">
        ${sgn(x.d)} ${T("vs industry median", "เทียบค่ากลางอุตสาหกรรม")} ${x.ref}</div></div>`).join("")}</div>
    <div class="grid g2" style="align-items:start;margin-top:13px">
      ${list.map((i, n) => `<div class="ins ${i.kind}" style="${i.dimmed ? "opacity:.5" : ""}"><div class="bd">
        <div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between">
          <div style="min-width:0"><div class="tag">${esc(i.tag)}${i.dimmed ? ` · <span style="color:var(--ink-3)">${T("outside focus", "นอกมิติที่เลือก")}</span>` : ""}</div><h4>${esc(i.h)}</h4></div>
          ${i.dim === "ceo" && i.impact === 0 ? "" : `<div class="imp" style="color:${i.impact > 0 ? "var(--ok)" : i.impact < 0 ? "var(--crit)" : "var(--ink-3)"}">${sgn(i.impact)}
            <span style="font-size:10.5px;font-weight:400;color:var(--ink-3)"> ${T("pts (formula)", "จุด (ตามสูตร)")}</span></div>`}</div>
        <p>${esc(i.p)}</p>
        <p style="margin-top:7px;color:var(--ink);font-size:12.4px">→ ${esc(toneImpl(i.kind))}</p>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          <button class="btn p" data-rep="${n}" style="padding:3px 10px;font-size:11.5px">＋ ${T("Add to Report", "เพิ่มลงรายงาน")}</button>
          <button class="btn g" data-copy="${n}" style="padding:3px 10px;font-size:11.5px">${T("Copy", "คัดลอก")}</button>
          <button class="btn g" data-goto="${i.dim === "ceo" ? "studio" : "zonec"}" style="padding:3px 10px;font-size:11.5px">${i.dim === "ceo" ? T("Test in What-if", "ทดสอบใน What-if") : T("Go to Zone C", "ไป Zone C")}</button></div>
      </div>
      <details class="blk" style="margin:0;border:0;border-top:1px solid var(--line);border-radius:0">
        <summary style="font-size:11.8px;color:var(--ink-2)">${T("Evidence", "หลักฐาน")}</summary>
        <div class="bd" style="padding-top:0"><table><tbody>${i.ev.map(r =>
      `<tr><td style="width:54%">${esc(r[0])}</td><td class="n"><b>${esc(String(r[1]))}</b></td></tr>`).join("")}</tbody></table></div>
      </details></div>`).join("")}
    </div>
    <div class="note" style="margin-top:12px;font-size:10.8px">${T("Political ties and family directors are context data, not levers, and are never used as a positive reason (R6). Tenure has no effect on the score (δT = 0, evidence gate).",
    "political ties และกรรมการครอบครัวเป็นข้อมูลบริบท ไม่ใช่คันโยก และไม่ใช้เป็นเหตุผลเชิงบวก (R6) · อายุงานไม่มีผลต่อคะแนน (δT = 0, evidence gate)")}</div>
    </div>` + reportPanel();
}

/* ---------------------------------------------------------------- Zone C · Board Refresh Engine */
const HORIZON = [{ k: "agm", en: "Next AGM", th: "AGM ถัดไป", maxHard: 1 },
  { k: "12m", en: "12 months", th: "12 เดือน", maxHard: 2 }, { k: "24m", en: "24 months", th: "24 เดือน", maxHard: 3 }];
const PRIORITY = [{ k: "max", en: "Max OpenInnoScore", th: "คะแนนสูงสุด" }, { k: "bal", en: "Balanced", th: "สมดุล" },
  { k: "low", en: "Lowest disruption", th: "กระทบน้อยที่สุด" }];
const HARD = { 1: { en: "Easy", th: "ทำได้เร็ว", k: "ok" }, 2: { en: "Moderate", th: "ปานกลาง", k: "warn" }, 3: { en: "Difficult", th: "ต้องใช้เวลา", k: "crit" } };
const ACT = { add: { en: "Add", th: "เพิ่ม", k: "ok" }, replace: { en: "Replace", th: "เปลี่ยน", k: "blue" }, test: { en: "Test", th: "ทดสอบ", k: "blue" } };
const KEYWORDS = {
  fem: [["Female", "กรรมการหญิง"], ["Independent", "กรรมการอิสระ"], ["Digital / innovation experience", "ประสบการณ์ดิจิทัลหรือนวัตกรรม"], ["No family linkage", "ไม่มีความเชื่อมโยงกับครอบครัวผู้ถือหุ้น"]],
  promo: [["Shareholder letter wording", "ถ้อยคำในสารถึงผู้ถือหุ้น"], ["Opportunity-seeking vocabulary", "คำศัพท์เชิงแสวงหาโอกาส"], ["Tested in What-if", "ทดสอบใน What-if"]],
};
/* เป้าหมายของบอร์ด — ค่าที่ดีที่สุดที่พบจริงในอุตสาหกรรม ปรับตามข้อจำกัดที่ผู้ใช้เปิด
   คันโยกเดียวคือสัดส่วนกรรมการหญิง · ครอบครัว / political ties / อายุงาน เป็นข้อมูลบริบท (R6, δT = 0)
   เขียนทับ optimalBoard เดิม เพื่อให้ upsideOf และ engagement เดินตามข้อจำกัดเดียวกัน */
optimalBoard = function (c) {
  let fem = Math.max(c.fem, femQ(c.ind, .9));
  if (S.cons && S.cons.fem30) fem = Math.max(fem, .30);
  return { promo: c.promo, pol: c.pol, fem, fam: c.fam, ten: c.ten };
};
/** ความสัมพันธ์ตามสูตรของการปรับตัวแปรเดียว โดยตรึงตัวแปรอื่นไว้ */
const lever = (c, k, v) => ipiAt(c, Object.assign(profOf(c), { [k]: v })) - c.ipi;
function leversV2(c) {
  const tg = optimalBoard(c), out = [];
  const push = (k, act, en, th, hard, d) => out.push({ k, act, en, th, hard: clamp(hard, 1, 3), d, kw: KEYWORDS[k] || [] });
  if (tg.fem > c.fem + 1e-9) {
    const pt = (tg.fem - c.fem) * 100, fn = femaleN(c.fem, c.bsize), fnT = femaleN(tg.fem, c.bsize);
    const cm = fn === null ? T(" · enter board size in Zone A to check critical mass", " · กรอก board size ใน Zone A เพื่อตรวจ critical mass")
      : fn < CRIT_N ? T(` · now ≈ ${fn} women — association significant from ${CRIT_N} (Table 4)`, ` · ตอนนี้ ≈ ${fn} คน — มีนัยเมื่อ ≥ ${CRIT_N} คน (Table 4)`)
        : T(` · ≈ ${fn} women, critical mass reached`, ` · ≈ ${fn} คน ถึง critical mass แล้ว`);
    push("fem", (S.cons && S.cons.sizeFixed) ? "replace" : "add",
      `${(S.cons && S.cons.sizeFixed) ? "Replace seats with" : "Add"} independent female directors — ${pct1(c.fem)} → ${pct1(tg.fem)} (${sgn(pt)} pts of the board${fnT !== null ? `, ≈ ${fnT} women` : ""})${cm}`,
      `${(S.cons && S.cons.sizeFixed) ? "เปลี่ยนที่นั่งเป็น" : "เพิ่ม"}กรรมการอิสระหญิง — ${pct1(c.fem)} → ${pct1(tg.fem)} (${sgn(pt)} จุดของสัดส่วนบอร์ด${fnT !== null ? ` ≈ ${fnT} คน` : ""})${cm}`,
      pt <= 8 ? 1 : pt <= 18 ? 2 : 3, lever(c, "fem", tg.fem));
  }
  // ภาษา CEO — ไม่ใช่การสรรหากรรมการ แต่เป็นอีกครึ่งของสัญญาณ ทดสอบได้ใน What-if / CEO text testing
  if (c.dp < 85) {
    const dp2 = clamp(c.dp + 15, 0, 100), d = ipiAt(c, Object.assign(profOf(c), { promo: promoAtPct(dp2) })) - c.ipi;
    push("promo", "test", `Test CEO promotion-focus wording — percentile ${c.dp} → ${dp2} in What-if / CEO text testing`,
      `ทดสอบถ้อยคำ promotion focus ของ CEO — เปอร์เซ็นไทล์ ${c.dp} → ${dp2} ใน What-if / CEO text testing`, 1, d);
  }
  return out.sort((a, b) => b.d - a.d);
}
function scenarioOf(c) {
  const all = leversV2(c), hz = HORIZON.find(h => h.k === S.horizon) || HORIZON[1];
  let sel = all.filter(x => x.hard <= hz.maxHard);
  if (S.priority === "low") sel = sel.filter(x => x.hard <= 1);
  else if (S.priority === "bal" && sel.length > 1) { const mx = Math.max(...sel.map(x => x.d));
    sel = sel.filter(x => x.hard <= 2 || x.d >= mx * .5); }
  sel = sel.filter(x => x.k !== "promo");                   // ฉากทัศน์ของ Zone C ไม่แตะภาษาผู้นำ
  const tg = optimalBoard(c), p = profOf(c);
  sel.forEach(x => { p[x.k] = tg[x.k]; });
  return { now: c.ipi, after: ipiAt(c, p), target: p, sel, all, hz };
}

function viewZoneC() {
  const flow = flowBar(2);
  const c = cur(), sc = scenarioOf(c), rec = recL(c), tg = optimalBoard(c), pool = indComps(c.ind);
  const F = flagsL(c), e = engagement(c), w = waterfall(c);
  const fn = femaleN(c.fem, c.bsize);
  const b = { l: vL("fem"), now: c.fem * 100, tgt: tg.fem * 100, u: "%", scale: Math.max(c.fem, tg.fem, .4) * 100 };
  const same = Math.abs(b.now - b.tgt) < .05;
  const cmp = `<div class="cmprow"><span>${esc(b.l)}</span>
      <div class="tk"><div class="fl now" style="width:${clamp(b.now / b.scale * 100, 2, 100).toFixed(1)}%"></div></div>
      <b class="n num">${fmt(b.now, 1)}${b.u}</b></div>
    <div class="cmprow"><span style="color:var(--ink-3);font-size:11.4px">${T("recommended", "ที่แนะนำ")}</span>
      ${same ? `<div style="font-size:11.4px;color:var(--ok)">✓ ${T("already at the best value observed", "อยู่ที่ค่าที่ดีที่สุดที่พบจริงแล้ว")}</div><b class="n num" style="color:var(--ink-3)">—</b>`
      : `<div class="tk"><div class="fl" style="width:${clamp(b.tgt / b.scale * 100, 2, 100).toFixed(1)}%"></div></div>
         <b class="n num" style="color:var(--ok)">${fmt(b.tgt, 1)}${b.u}<div style="font-size:10.2px;font-weight:400;color:var(--ink-3)">${sgn(b.tgt - b.now)}</div></b>`}</div>
    <div style="font-size:10.8px;color:${fn !== null && fn < CRIT_N ? "var(--warn)" : "var(--ink-3)"};margin:2px 0 10px">${esc(critMassLine(c))}</div>
    <div style="font-size:10.6px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 4px">${T("Context (not levers)", "ข้อมูลบริบท (ไม่ใช่คันโยก)")}</div>
    ${[[vL("fam"), pct1(c.fam), T("context R6 — no add/remove recommendation", "บริบท R6 — ไม่เสนอให้เพิ่มหรือลด")],
       [vL("pol"), c.pol ? T("yes", "มี") : T("no", "ไม่มี"), T("context — never a positive reason (R6)", "บริบท — ไม่ใช้เป็นเหตุผลเชิงบวก (R6)")],
       [vL("ten"), fmt(c.ten, 1) + T(" yr", " ปี"), TEN_NOTE]].map(r => `<div class="cmprow"><span>${esc(r[0])}</span>
      <div style="font-size:10.8px;color:var(--ink-3)">${esc(r[2])}</div><b class="n num" style="color:var(--ink-2)">${r[1]}</b></div>`).join("")}`;
  const recs = sc.all.length ? sc.all.map(x => {
    const inSel = sc.sel.some(s => s.k === x.k) || x.k === "promo";
    return `<div class="rec" style="${inSel ? "" : "opacity:.55"}">
      <div class="hd"><div style="min-width:0">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:3px">
          <span class="pill ${ACT[x.act].k}">${esc(S.lang === "EN" ? ACT[x.act].en : ACT[x.act].th)}</span>
          <span class="pill ${HARD[x.hard].k}">${esc(S.lang === "EN" ? HARD[x.hard].en : HARD[x.hard].th)}</span>
          ${x.k === "promo" ? `<span class="pill mute">${T("CEO language — not a board seat", "ภาษา CEO — ไม่ใช่ที่นั่งในบอร์ด")}</span>` : ""}
          ${inSel ? "" : `<span class="pill mute">${T("outside the selected horizon", "อยู่นอกกรอบเวลาที่เลือก")}</span>`}</div>
        <b>${esc(S.lang === "EN" ? x.en : x.th)}</b>
        <div class="kw">${x.kw.map(k => `<span>${esc(S.lang === "EN" ? k[0] : k[1])}</span>`).join("")}</div></div>
      <div class="imp">${sgn(x.d)}<div style="font-size:10.2px;font-weight:400;color:var(--ink-3)">${T("pts (formula, association)", "จุด (ตามสูตร, เชิงความสัมพันธ์)")}</div></div></div></div>`;
  }).join("") : `<div class="note ok">${T("Female representation already sits at the best value observed in this industry and CEO language is in the top band — there is no lever left to examine.",
    "สัดส่วนกรรมการหญิงอยู่ที่ค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมนี้แล้ว และภาษา CEO อยู่กลุ่มบน — ไม่มีคันโยกเหลือให้พิจารณา")}</div>`;

  return pageHead("Zone C", "Board Refresh Recommendation Engine",
    T("Observations ranked by the formula-based association of each change with the score, filtered by the constraints and time horizon you set. Associations, not predictions.",
      "ข้อเสนอจัดลำดับตามความสัมพันธ์กับคะแนนตามสูตร และกรองด้วยข้อจำกัดกับกรอบเวลาที่ตั้งไว้ · เป็นความสัมพันธ์ ไม่ใช่การพยากรณ์"))
    + `<div style="display:flex;justify-content:flex-end;margin:-8px 0 12px">${toneBar()}</div>`
    + flow + `<div class="grid gzc">
    <div class="stack">
      <div class="card"><h3>${T("Current vs recommended", "ปัจจุบันเทียบกับที่แนะนำ")}</h3>
        <p class="desc">${T(`Reference group: ${pool.length} firms in ${indL(c.ind)}. The target is a value observed in the group, not an ideal.`,
      `กลุ่มอ้างอิง ${pool.length} บริษัทในกลุ่ม${IND[c.ind]} · เป้าหมายเป็นค่าที่พบจริง ไม่ใช่ค่าอุดมคติ`)}</p>${cmp}</div>
      <div class="card"><h3>${T("Constraints", "ข้อจำกัดที่ใช้")}</h3>
        <p class="desc">${T("These change the recommended target, not just the wording.", "ข้อจำกัดเหล่านี้เปลี่ยนเป้าหมายที่แนะนำจริง ไม่ใช่แค่ถ้อยคำ")}</p>
        <div class="ctrl">
          <label><input type="checkbox" data-cons="sizeFixed"${S.cons.sizeFixed ? " checked" : ""}>
            ${T("Keep board size unchanged (replace instead of add)", "คงขนาดคณะกรรมการเดิม (เปลี่ยนแทนการเพิ่ม)")}</label>
          <label><input type="checkbox" data-cons="fem30"${S.cons.fem30 ? " checked" : ""}>
            ${T("Female directors at least 30% (SET guidance)", "กรรมการหญิงอย่างน้อย 30% (แนวทาง ตลท.)")}</label></div>
        <div style="margin-top:13px"><div style="font-size:11.2px;color:var(--ink-3);margin-bottom:4px">${T("Time horizon", "กรอบเวลา")}</div>
          <div class="seg" id="segHz" style="width:100%">${HORIZON.map(x => `<button type="button" data-hz="${x.k}"
            aria-selected="${S.horizon === x.k}" style="flex:1">${esc(S.lang === "EN" ? x.en : x.th)}</button>`).join("")}</div></div>
        <div style="margin-top:9px"><div style="font-size:11.2px;color:var(--ink-3);margin-bottom:4px">${T("Priority mode", "โหมดการจัดลำดับ")}</div>
          <div class="seg" id="segPr" style="width:100%">${PRIORITY.map(x => `<button type="button" data-pr="${x.k}"
            aria-selected="${S.priority === x.k}" style="flex:1">${esc(S.lang === "EN" ? x.en : x.th)}</button>`).join("")}</div></div>
      </div>
      <div class="card"><h3>${T("Structural risk flags", "ธงความเสี่ยงเชิงโครงสร้าง")}</h3>
        ${F.map(f => `<div style="display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)">
          <span class="pill ${f.lv}" style="flex:none;margin-top:1px">${f.lv === "crit" ? "▲" : f.lv === "warn" ? "△" : "✓"}</span>
          <div><div style="font-size:12.2px">${esc(f.l)}</div>
            <div style="font-size:10.8px;color:var(--ink-3);line-height:1.55">${esc(f.d)}</div></div></div>`).join("")}
        <div style="font-size:11px;color:var(--ink-3);margin-top:9px">${T("Engagement priority", "ลำดับการเข้าพบ")}
          <b style="color:var(--ink)">${e.score}</b> / 100 · ${esc(levelL(e.tier.l))}</div></div>
    </div>

    <div class="card"><h3>${T("Ranked recommendations", "ข้อเสนอเรียงตามความสัมพันธ์")}</h3>
      <p class="desc">${T("Each figure is the formula-based association of that single change, holding everything else fixed (not a causal effect). Only female-director composition and CEO language are examined — family, political ties and tenure are context. Greyed rows fall outside the selected horizon or priority mode.",
      "ตัวเลขคือความสัมพันธ์ตามสูตรของการเปลี่ยนข้อนั้นข้อเดียว โดยตรึงตัวแปรอื่นไว้ (ไม่ใช่ผลเชิงเหตุ-ผล) · พิจารณาเฉพาะสัดส่วนกรรมการหญิงและภาษา CEO — ครอบครัว political ties และอายุงานเป็นข้อมูลบริบท · แถวที่จางคืออยู่นอกกรอบเวลาหรือโหมดที่เลือก")}</p>
      <div style="display:grid;gap:9px">${recs}</div>
      <div class="note warn" style="margin-top:12px"><b>${T("Political ties are context, not a lever", "political ties เป็นข้อมูลบริบท ไม่ใช่คันโยก")}</b> —
        ${T("political ties are context data, not a lever, and are never used as a positive reason. The engine excludes them on purpose: it is not a legitimate criterion for selecting directors, and using it that way would turn a diagnostic into a screening rule for individuals.",
      "political ties เป็นข้อมูลบริบท ไม่ใช่คันโยก และไม่ใช้เป็นเหตุผลเชิงบวก · ระบบตัดออกจากชุดข้อเสนอโดยตั้งใจ เพราะไม่ใช่เกณฑ์ที่ควรใช้คัดเลือกกรรมการ และการใช้แบบนั้นจะเปลี่ยนเครื่องมือวินิจฉัยให้กลายเป็นเกณฑ์กลั่นกรองรายบุคคล")}</div>
      <div class="card" style="margin-top:14px;box-shadow:none">
        <h3>${T("Where the score comes from", "คะแนนนี้มาจากไหน")}</h3>
        <p class="desc">${T("Each variable is switched from the reference-base mean to this firm's actual value, one at a time — a decomposition per the formula.",
      "เปลี่ยนทีละตัวแปรจากค่ากลางฐานอ้างอิงเป็นค่าจริงของบริษัท ผลรวมของทุกขั้นเท่ากับคะแนนจริงเสมอ — เป็นการแยกส่วนประกอบตามสูตร")}</p>
        ${waterfallSvg(c)}</div>
    </div>

    <div class="stack">
      <div class="scn"><small>${T("Scenario (formula, association)", "ฉากทัศน์ (ตามสูตร, เชิงความสัมพันธ์)")}</small>
        <div class="big">${sc.now} <span style="opacity:.5">→</span> <em>${fmt(sc.after)}</em></div>
        <p>${sc.after > sc.now
      ? T(`With the ${sc.sel.length} selected action${sc.sel.length > 1 ? "s" : ""} within ${(HORIZON.find(h => h.k === S.horizon) || {}).en}, the formula associates the board with a score ${fmt(sc.after - sc.now)} points higher. CEO language is left untouched.`,
        `ทำ ${sc.sel.length} ข้อที่เลือกภายใน${(HORIZON.find(h => h.k === S.horizon) || {}).th} ตามสูตรสัมพันธ์กับคะแนนที่สูงขึ้น ${fmt(sc.after - sc.now)} จุด (เชิงความสัมพันธ์) โดยไม่แตะภาษาผู้บริหาร`)
      : T("No board action falls inside the selected horizon and priority mode.", "ไม่มีข้อเสนอเรื่องบอร์ดอยู่ในกรอบเวลาและโหมดที่เลือก")}</p>
        <div style="display:flex;gap:5px;align-items:flex-end;height:66px;margin-top:13px">
          ${(() => { let acc = w.base;
        return [{ v: w.base, c: "rgba(255,255,255,.28)" }]
          .concat(w.steps.map(s => { acc += s.d; return { v: acc, c: s.d < 0 ? "var(--s2)" : "rgba(119,242,161,.75)" }; }))
          .concat([{ v: sc.after, c: "var(--mint)" }])
          .map(b => `<i style="flex:1;display:block;border-radius:5px 5px 2px 2px;background:${b.c};height:${clamp(b.v, 4, 100)}%"></i>`).join(""); })()}</div>
        <div style="font-size:10.4px;color:#9FB6CC;margin-top:6px">${T("reference mean → each variable → scenario", "ค่ากลางฐานอ้างอิง → ทีละตัวแปร → ฉากทัศน์")}</div>
        <div style="display:grid;gap:7px;margin-top:13px">
          <button class="btn m" id="btnApplyC">${T("Apply Scenario in What-if Studio", "ส่งฉากทัศน์เข้า What-if Studio")}</button>
          <button class="btn s" id="btnBriefC">${T("Generate Candidate Brief", "สร้างโจทย์การสรรหากรรมการ")}</button></div>
      </div>
      <div class="card"><h3>${T("What the engine suggests", "ข้อเสนอโดยรวมของระบบ")}</h3>
        <div class="note brand" style="margin-top:4px"><b style="color:${rec.c}">${esc(rec.l)}</b> — ${esc(rec.d)}</div>
        <div style="display:grid;gap:7px;margin-top:12px">
          <button class="btn s" data-memo="1">${T("Export Board Memo", "ออกบันทึกวาระประชุม")}</button>
          <button class="btn g" data-addport="${esc(c.t)}">${T("Add to portfolio", "เพิ่มเข้าพอร์ต")}</button>
          <button class="btn g" data-goto="ic">${T("Open meeting mode", "เปิดโหมดที่ประชุม")}</button></div></div>
    </div>
  </div>`;
}
function wireZoneC(h) {
  h.querySelectorAll("[data-cons]").forEach(el => el.onchange = () => { S.cons[el.dataset.cons] = el.checked; save(); render(); });
  h.querySelectorAll("#segHz button").forEach(b => b.onclick = () => { S.horizon = b.dataset.hz; save(); render(); });
  h.querySelectorAll("#segPr button").forEach(b => b.onclick = () => { S.priority = b.dataset.pr; save(); render(); });
  const ap = h.querySelector("#btnApplyC");
  if (ap) ap.onclick = () => {
    if (!isUnlocked("studio")) { toast(T("What-if Studio is a Pro feature", "What-if Studio เป็นสิทธิ์ของผู้ใช้ Pro")); return go("studio"); }
    const c = cur(), sc = scenarioOf(c);
    S.wi = { t: c.t, fem: sc.target.fem, fam: c.fam, pol: c.pol, ten: c.ten, dp: c.dp, src: T("from Zone C", "ส่งมาจาก Zone C"), preset: "zonec" };
    save(); toast(T("Scenario loaded into the studio", "โหลดฉากทัศน์เข้าสตูดิโอแล้ว")); go("studio");
  };
  const br = h.querySelector("#btnBriefC");
  if (br) br.onclick = () => printDoc(T("Candidate Brief", "โจทย์การสรรหากรรมการ") + " · " + cur().t, briefHtml(cur()));
}

/* ---------------------------------------------------------------- Candidate Brief */
function printDoc(title, inner) {
  const styles = [...document.querySelectorAll("style")].map(s => s.textContent).join("\n");
  const doc = "<" + `!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>${styles}</style><style>${MEMO_CSS}</style></head><body data-brand="A" data-mode="light">${inner}</body></html>`;
  let f = $("#memoFrame");
  if (!f) { f = document.createElement("iframe"); f.id = "memoFrame"; f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none"; document.body.appendChild(f); }
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("เบราว์เซอร์ปิดกั้นการพิมพ์ — ลองใช้ Ctrl+P"); } };
  f.srcdoc = doc;
  toast(T("Preparing document …", "กำลังเตรียมเอกสาร …"));
}
function briefHtml(c) {
  const sc = scenarioOf(c), pool = indComps(c.ind), rm = validRemark();
  return `<div class="mm">
    <div class="mmhead"><div style="display:flex;gap:9px;align-items:flex-start">
      <img src="${LOGO_SMALL}" alt="" style="width:26px;height:26px;flex:none;margin-top:1px">
      <div>
      <div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)">Candidate Brief · โจทย์การสรรหากรรมการ · OpenInnoScore™</div>
      <div class="mmt">${esc(c.t)} · ${esc(c.n)}</div>
      <div class="mmn">${esc(IND[c.ind])} · กลุ่มอ้างอิง ${pool.length} บริษัท · ข้อมูลปี 2566 · กรอบเวลา ${esc(sc.hz.th)}</div></div></div>
      <div><div class="mmipi">${c.ipi}</div>
        <div style="font-size:9px;color:var(--ink-3);text-align:right">OpenInnoScore วันนี้<br>ฉากทัศน์ที่แนะนำ ${fmt(sc.after)}</div></div></div>
    <div class="mmb"><h4>โจทย์ของการสรรหารอบนี้</h4>
      <p>${sc.after > sc.now
      ? `ช่องว่างเชิงโครงสร้างตามสูตร (เชิงความสัมพันธ์) คือ ${fmt(sc.after - sc.now)} จุดคะแนน ภายใน${sc.hz.th} การสรรหารอบนี้จึงควรตั้งเป้าที่สัดส่วนกรรมการหญิงตามข้อสังเกตนี้ ไม่ใช่การหากรรมการตามสเปกทั่วไป`
      : "โครงสร้างบอร์ดอยู่ที่ค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมแล้ว การสรรหารอบนี้จึงเป็นการรักษาระดับเมื่อกรรมการครบวาระ"}</p></div>
    <div class="mmg">
      <div class="mmb"><h4>คุณสมบัติเชิงโครงสร้างที่ต้องการ</h4>
        ${sc.all.filter(x => x.k !== "promo").length ? sc.all.filter(x => x.k !== "promo").map(x => `<div style="margin-bottom:6px;font-size:10.4px;line-height:1.55">
          <b>${esc(x.th)}</b><div style="color:var(--ink-3)">โปรไฟล์ที่มองหา — ${x.kw.map(k => esc(k[1])).join(" · ")}</div></div>`).join("")
      : `<p>ไม่มีคันโยกเชิงโครงสร้างเหลือ — โจทย์คือรักษาโครงสร้างเดิมเมื่อกรรมการครบวาระ</p>`}</div>
      <div class="mmb"><h4>ความสัมพันธ์กับคะแนน (ตามสูตร) และความยากง่าย</h4>
        <table><tbody>${sc.all.length ? sc.all.map(x => `<tr>
          <td>${esc(x.th)}<div style="font-size:9.2px;color:var(--ink-3)">${esc(HARD[x.hard].th)}${sc.sel.some(s => s.k === x.k) ? "" : " · นอกกรอบเวลา"}</div></td>
          <td class="n" style="font-weight:600;color:var(--ok);font-size:13px">${sgn(x.d)}</td></tr>`).join("")
      : `<tr><td>—</td><td class="n">—</td></tr>`}</tbody></table>
        <div style="font-size:9.2px;color:var(--ink-3);margin-top:5px">ตัวเลขคือความสัมพันธ์ตามสูตรของข้อนั้นข้อเดียว โดยตรึงตัวแปรอื่นไว้ — เชิงความสัมพันธ์ ไม่ใช่การพยากรณ์</div></div>
    </div>
    <div class="mmb"><h4>ข้อห้ามในการใช้เอกสารนี้</h4>
      <p>เอกสารนี้อธิบาย<b>คุณสมบัติเชิงโครงสร้างของคณะกรรมการ</b>ที่โมเดลชี้ว่าสัมพันธ์กับผลลัพธ์ระดับบริษัท
        <b>ไม่ใช่การชี้ตัวบุคคล</b> และห้ามนำไปใช้ให้คะแนนหรือคัดกรองผู้สมัครรายคน ·
        political ties เป็นข้อมูลบริบท ไม่ใช่คันโยก และไม่ใช้เป็นเหตุผลเชิงบวก · กรรมการครอบครัวและอายุงานเป็นข้อมูลบริบทเช่นกัน (R6, δT = 0)</p></div>
    <div class="mmg" style="margin-top:9px">
      <div><div style="border-bottom:1px solid var(--ink-3);height:20px"></div>
        <div style="font-size:9px;color:var(--ink-3)">ผู้จัดทำ · Executive Search / Advisory</div></div>
      <div><div style="border-bottom:1px solid var(--ink-3);height:20px"></div>
        <div style="font-size:9px;color:var(--ink-3)">ประธานคณะกรรมการสรรหา</div></div></div>
    <div class="mmfoot"><b>OpenInnoScore™</b> · <b>Validity remark — ${esc(rm.l)}</b> ${rm.d} ·
      เครื่องมือ<b>ประเมิน</b> (diagnostic) ไม่ใช่การพยากรณ์ · ฐานอ้างอิง REF-928 (928 บริษัท-ปี, 2562–2566) ·
      ความสัมพันธ์เป็นเชิงสหสัมพันธ์ ไม่ใช่เชิงสาเหตุ · ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน ·
      <b>ห้ามนำไปใช้ให้คะแนนหรือคัดกรองกรรมการรายบุคคล</b> — PDPA มาตรา 26</div>
  </div>`;
}

/* ---------------------------------------------------------------- ประกอบเมนูและมุมมองใหม่ */
NAV.length = 0;
NAV.push(
  { id: "profile", g: 1, ico: "⌂", lab: "Company Profile" },           // หน้าอยู่ใน v2_app.js
  { id: "docs", g: 1, ico: "⬆", lab: "Zone A · Document Intelligence" },
  { id: "fit", g: 1, ico: "◎", lab: "Zone B · Insight Generator", lock: "report" },
  { id: "zonec", g: 1, ico: "⇧", lab: "Zone C · Board Refresh", lock: "report" },
  { id: "matrix", g: 2, ico: "⊞", lab: "เมทริกซ์กลยุทธ์ 2×2" },
  { id: "peer", g: 2, ico: "⇄", lab: "เทียบคู่แข่ง", lock: "peer" },
  { id: "studio", g: 2, ico: "⚗", lab: "What-if Studio", lock: "studio" },
  { id: "sector", g: 2, ico: "▦", lab: "ภาพรวมอุตสาหกรรม", lock: "sector" },
  { id: "port", g: 2, ico: "▤", lab: "พอร์ตลงทุน", lock: "port" },
  { id: "ic", g: 2, ico: "▶", lab: "โหมดที่ประชุม", lock: "report" },
  { id: "billing", g: 3, ico: "◈", lab: "Token และการชำระเงิน" },
  { id: "arch", g: 3, ico: "⌗", lab: "สถาปัตยกรรมข้อมูล" },
  { id: "valid", g: 3, ico: "✓", lab: "Validity" },
);
VIEWS.docs = viewDocs; VIEWS.zonec = viewZoneC;
viewFit = function () {
  const h = _viewFit(), i = h.indexOf("</div>", h.indexOf('class="pagehead"'));
  const body = i > 0 ? h.slice(0, i + 6) + flowBar(1) + h.slice(i + 6) : flowBar(1) + h;
  return body + (isUnlocked("report") ? insightCards(cur()) : "");
};
VIEWS.fit = viewFit;


/* ============================================================================
   What-if Studio — ฉบับแก้ไขครั้งที่ 2.2
   คันโยกที่ระบบเสนอมีสองตัว: สัดส่วนกรรมการหญิง (fem) และภาษา CEO (dp)
   ระดับ Pro ปรับตัวแปรบอร์ดได้ 3 ตัว (หญิง · ครอบครัว · political ties) ตามที่ผู้ว่าจ้างเลือก
   แต่ครอบครัวและ political ties ติดป้ายเตือนถาวร และผลจากสองตัวนี้เป็น "ตัวแปรบริบท" ไม่ใช่ทางเลือกเชิงนโยบาย
   ฉากทัศน์สำเร็จรูปและ Zone C ยังขยับเฉพาะ fem และ dp · อายุงานเป็นบริบท (δT = 0)
   ============================================================================ */
const TZ_LABEL = { fem: { th: "สัดส่วนกรรมการหญิง", en: "Female directors" } };
const TZ_WHY = {
  fem: { th: "สัดส่วนกรรมการหญิงเป็นตัวแปรที่สัมพันธ์กับการหนุนสัญญาณมากที่สุดในสูตร E4 (ทิศทางบวก) และเป็นคันโยกเดียวด้านองค์ประกอบบอร์ดที่ระบบพิจารณา",
    en: "Female representation is the variable most strongly associated with amplification in formula E4 (positive direction), and the only board-composition lever the engine examines." } };
const WI_CTRL2 = [{ k: "fem", l: "สัดส่วนกรรมการหญิง", min: 0, max: .7, step: .01, fmt: v => pct1(v) }];
const FAM_MAX = 0.6127;                                 // ช่วงที่พบจริงใน REF-928
const WARN_FAM = "ข้อมูลบริบท — ความสัมพันธ์ไม่ทนต่อการวิเคราะห์ fixed-effects (H2) · ไม่ใช่คำแนะนำให้ปรับ";
const WARN_POL = "ไม่ใช้เป็นเหตุผลเชิงบวก (R6) · ความสัมพันธ์ไม่ทนต่อ fixed-effects (H3) · ไม่ใช่เป้าการสรรหา";
const CHIP_CTX = "ผลจากตัวแปรบริบท — ใช้เพื่อเข้าใจโมเดล ไม่ใช่ทางเลือกเชิงนโยบาย";
const LOCK_BANK = "ล็อกในมุมมองธนาคาร ตามแนวทาง Pilot";
/** สถานะจำลองขยับตัวแปรบริบท (ครอบครัว / political ties) ออกจากค่าจริงหรือไม่ */
const wiCtxMoved = (c, w) => Math.abs((w.fam ?? c.fam) - c.fam) > 1e-9 || (w.pol ?? c.pol) !== c.pol;

/** OpenInnoScore ของสถานะจำลอง — ใช้ค่าดิบจริงเมื่อ dp ไม่เปลี่ยน เพื่อให้ "Current" ตรงกับทุกหน้า */
function wiScore(c, w) {
  const promo = w.dp === c.dp ? c.promo : promoAtPct(w.dp);
  const amp = ampOf(w.fam ?? c.fam, w.pol ?? c.pol, w.fem, c.ten);   // ten ไม่เข้าสูตร (δT = 0)
  return { promo, amp, ipi: Math.round(oisOf(signalB(promo, amp))), zone: zoneOf(promo, amp) };
}
/** ฉากทัศน์สำเร็จรูป (F3) — ขยับเฉพาะ fem และ dp */
const WI_PRESETS = [
  { k: "cur", en: "Current", th: "ปัจจุบัน", f: c => ({ fem: c.fem, dp: c.dp }) },
  { k: "opt", en: "Optimistic Board", th: "บอร์ดฝั่งบวก", d: "fem → p90 อุตสาหกรรม", f: c => ({ fem: Math.max(c.fem, femQ(c.ind, .9)), dp: c.dp }) },
  { k: "con", en: "Conservative", th: "ฝั่งระมัดระวัง", d: "fem → p10 อุตสาหกรรม", f: c => ({ fem: Math.min(c.fem, femQ(c.ind, .1)), dp: c.dp }) },
  { k: "sq", en: "Status-quo", th: "คงเดิม", d: "= ปัจจุบัน", f: c => ({ fem: c.fem, dp: c.dp }) },
  { k: "reg", en: "Regulatory-compliant minimum", th: "ขั้นต่ำตามแนวทางกำกับ", d: "fem → 30% ถ้าต่ำกว่า (ตลท.)", f: c => ({ fem: Math.max(c.fem, .30), dp: c.dp }) },
  { k: "new", en: "New CEO + Board Refresh", th: "CEO ใหม่ + ปรับบอร์ด", d: "dp → 75 · fem → p90", f: c => ({ fem: Math.max(c.fem, femQ(c.ind, .9)), dp: 75 }) },
];
function wiInit2(force) {
  const c = cur();
  if (!S.wi || S.wi.t !== c.t || force)
    S.wi = { t: c.t, fem: c.fem, fam: c.fam, ten: c.ten, pol: c.pol, dp: c.dp, src: "ค่าจริงของบริษัท", preset: "cur" };
  // อายุงานตรึงไว้เสมอ (δT = 0) · ครอบครัว / political ties ตรึงไว้ในมุมมองธนาคาร หรือเมื่อยังไม่เคยตั้ง
  S.wi.ten = c.ten;
  if (S.wi.fam === undefined || wiCtxLocked()) S.wi.fam = c.fam;
  if (S.wi.pol === undefined || wiCtxLocked()) S.wi.pol = c.pol;
  S.wi.fam = clamp(S.wi.fam, 0, Math.max(FAM_MAX, c.fam));
  S.wi.pol = S.wi.pol ? 1 : 0;
  return S.wi;
}
wiInit = wiInit2;
/** ฉากทัศน์เปรียบเทียบ — เฉพาะคันโยกที่พิจารณา */
function wiScenarios2(c, w) {
  const base = wiScore(c, w).ipi, out = [];
  const mk = (l, why, fem, dp) => { const v = wiScore(c, { fem, dp, fam: w.fam, pol: w.pol }).ipi; if (v !== base) out.push({ l, why, v, d: v - base }); };
  mk("สัดส่วนกรรมการหญิง +10 จุด", "คันโยกด้านบอร์ดที่สัมพันธ์กับคะแนนมากที่สุดตามสูตร", clamp(w.fem + .1, 0, 1), w.dp);
  mk("สัดส่วนกรรมการหญิงถึง p90 ของอุตสาหกรรม", "ค่าที่ดีที่สุดที่พบจริงในกลุ่ม", Math.max(w.fem, femQ(c.ind, .9)), w.dp);
  if (w.fem < .3) mk("สัดส่วนกรรมการหญิง 30% (แนวทาง ตลท.)", "ขั้นต่ำตามแนวทางกำกับ", .3, w.dp);
  if (w.dp < 85) mk("CEO promotion focus +15 เปอร์เซ็นไทล์", "ทดสอบถ้อยคำ ไม่ต้องแก้โครงสร้างบอร์ด", w.fem, clamp(w.dp + 15, 0, 100));
  mk("ถ้าสัดส่วนกรรมการหญิงลดลง 10 จุด", "กรณีกรรมการหญิงครบวาระแล้วไม่ได้แทนที่ด้วยผู้หญิง", clamp(w.fem - .1, 0, 1), w.dp);
  out.sort((a, b) => b.d - a.d);
  if (!out.length) return `<div class="note">ทุกการปรับที่ทดสอบให้ผลเท่าเดิม</div>`;
  return out.slice(0, 5).map(o => `<div style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
    <span class="pill ${o.d > 0 ? "ok" : "crit"}" style="width:64px;justify-content:center;font-size:11px">${o.d > 0 ? "+" : ""}${o.d}</span>
    <div style="flex:1"><div style="font-size:12.6px">${esc(o.l)}</div>
      <div style="font-size:10.8px;color:var(--ink-3)">${esc(o.why)} · ตามสูตร เชิงความสัมพันธ์</div></div>
    <div class="num" style="font-size:13px;color:var(--ink-2)">OIS ${o.v}</div></div>`).join("");
}
/** Board Persona — คุณสมบัติเชิงโครงสร้างที่สัมพันธ์กับคะแนน ไม่อ้างเหตุ-ผล ไม่ชี้ตัวบุคคล */
function persona2(c, w, ipi) {
  const want = [], fn = femaleN(w.fem, c.bsize);
  if (w.fem < .3) want.push("กรรมการอิสระ<b>หญิง</b>ที่มีประสบการณ์สายเทคโนโลยีหรือการพัฒนาผลิตภัณฑ์ — สัดส่วนกรรมการหญิงสัมพันธ์เชิงบวกกับการหนุนสัญญาณในฐานอ้างอิง");
  if (fn !== null && fn < CRIT_N) want.push(`บอร์ดนี้มีกรรมการหญิง ≈ ${fn} คน — งานวิจัยพบว่าความสัมพันธ์มีนัยเมื่อมี ≥ ${CRIT_N} คน (Table 4)`);
  if (w.dp < 50) want.push("<b>ผู้นำที่สื่อสารวิสัยทัศน์เชิงโอกาสได้ชัด</b> — คะแนนภาษายังต่ำกว่าครึ่งของฐานอ้างอิง (ทดสอบถ้อยคำได้ใน CEO text testing)");
  if (!want.length) want.push("โครงสร้างปัจจุบันอยู่ในกลุ่มที่สัมพันธ์กับสัญญาณ open innovation แล้ว — โจทย์คือ<b>รักษาสมดุล</b>เมื่อกรรมการครบวาระ");
  return `<div style="font-size:12.8px;line-height:1.85">
    ณ สถานะจำลองนี้ (OIS ${ipi} · CEO Promotion Focus ${w.dp} · กรรมการหญิง ${pct1(w.fem)}${c.bsize ? ` ≈ ${femaleN(w.fem, c.bsize)} คนจาก ${c.bsize}` : ""})
    โปรไฟล์กรรมการที่สอดคล้องกับข้อสังเกตคือ</div>
    <ul style="margin:9px 0 0;padding-left:19px;font-size:12.5px;line-height:1.85;color:var(--ink-2)">
      ${want.map(x => `<li>${x}</li>`).join("")}</ul>
    <div class="note" style="margin-top:12px;font-size:10.8px">
      ข้อความนี้อธิบาย<b>คุณสมบัติเชิงโครงสร้าง</b>ที่สัมพันธ์กับคะแนนตามสูตร (เชิงความสัมพันธ์ ไม่ใช่เหตุ-ผล) ไม่ใช่การชี้ตัวบุคคล
      และไม่ควรใช้เป็นเกณฑ์คัดเลือกผู้สมัครรายคน · กรรมการครอบครัว political ties และอายุงานเป็นข้อมูลบริบท ไม่อยู่ในข้อเสนอ</div>`;
}
/** แถวข้อมูลบริบท (อ่านอย่างเดียว) ที่ใช้ซ้ำทั้ง Pro และ Free */
function ctxRows(c) {
  return `<div style="font-size:10.6px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:4px 0 6px">ข้อมูลบริบท — ไม่ใช่คันโยก</div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span>สัดส่วนกรรมการครอบครัว <span class="pill mute" style="font-size:9.5px">ข้อมูลบริบท (R6) — ไม่ใช่คันโยก</span></span>
        <span class="num"><b>${pct1(c.fam)}</b></span></div>
      <input type="range" min="0" max="0.8" step="0.01" value="${c.fam}" disabled aria-disabled="true" title="ข้อมูลบริบท (R6) — ไม่ใช่คันโยก" style="width:100%;accent-color:var(--ink-3);opacity:.45;cursor:not-allowed">
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:10px">
      <span>political ties <span class="pill mute" style="font-size:9.5px">ข้อมูลบริบท — ไม่ใช่คันโยก</span></span>
      <span class="chip" title="อ่านอย่างเดียว — ไม่ใช้เป็นเหตุผลเชิงบวก (R6)">${c.pol ? "1 · มี" : "0 · ไม่มี"}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:12px">
      <span>อายุงานเฉลี่ยของบอร์ด</span>
      <span class="num"><b>${fmt(c.ten, 1)} ปี</b> <span style="color:var(--ink-3);font-size:10.5px">${esc(TEN_NOTE)}</span></span></div>`;
}

/** ตัวแปรบริบทที่ปรับได้ในระดับ Pro — ครอบครัว (ตัวเลื่อนในช่วง REF-928) และ political ties (สลับ 0/1 เท่านั้น) พร้อมป้ายเตือนถาวร */
function ctxCtrls(c, w) {
  const lk = wiCtxLocked(), dis = lk ? " disabled aria-disabled=\"true\"" : "";
  return `<div class="tr-ctxh">ตัวแปรบริบท — ปรับได้เพื่อเข้าใจโมเดล ไม่ใช่คันโยกที่ระบบเสนอ</div>
    ${lk ? `<div class="note warn tr-banklock">🔒 ${esc(LOCK_BANK)} — ครอบครัวและ political ties ตรึงไว้ที่ค่าจริง</div>` : ""}
    <div class="tr-ctx${lk ? " locked" : ""}">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span>สัดส่วนกรรมการครอบครัว</span>
        <span class="num"><b>${pct1(w.fam)}</b> <span style="color:var(--ink-3);font-size:10.5px">เดิม ${pct1(c.fam)}</span></span></div>
      <input type="range" id="wiFam" min="0" max="${Math.max(FAM_MAX, c.fam)}" step="any" value="${w.fam}"${dis}
        style="width:100%;accent-color:var(--ink-3)" aria-describedby="wiFamWarn">
      <div class="tr-warn" id="wiFamWarn">⚠ ${esc(WARN_FAM)}</div>
      <div style="font-size:10.5px;color:var(--ink-3)">ช่วงตัวเลื่อน 0–${pct1(FAM_MAX)} = ช่วงที่พบจริงในฐานอ้างอิง REF-928</div>
    </div>
    <div class="tr-ctx${lk ? " locked" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:5px;gap:8px">
        <span>political ties <span style="color:var(--ink-3);font-size:10.5px">เดิม ${c.pol ? "1 · มี" : "0 · ไม่มี"}</span></span>
        <div class="seg" role="radiogroup" aria-label="political ties">
          <button data-wipol="0" role="radio" aria-selected="${!w.pol}"${dis}>0 · ไม่มี</button>
          <button data-wipol="1" role="radio" aria-selected="${!!w.pol}"${dis}>1 · มี</button></div></div>
      <div class="tr-warn">⚠ ${esc(WARN_POL)}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin:8px 0 12px">
      <span>อายุงานเฉลี่ยของบอร์ด</span>
      <span class="num"><b>${fmt(c.ten, 1)} ปี</b> <span style="color:var(--ink-3);font-size:10.5px">${esc(TEN_NOTE)}</span></span></div>`;
}
/** ฉากทัศน์ขาลง (Downside) — สิทธิ์ Pro Max · คิดจากค่าจริงของบริษัท ด้วยสูตรและช่วง 90% ชุดเดียวกับทุกหน้า */
function downsideRows(c) {
  const bs = c.bsize || 11, fn = Math.round(c.fem * bs), fy = c.fy || FY_SHOWN;
  const dp25 = clamp(c.dp - 25, 0, 100);
  /* ฐานคือสัดส่วนจริง (ไม่ปัดเป็นจำนวนคน) · ลาออก k คน = ลด k/ขนาดบอร์ด — แถว "ปัจจุบัน" จึงตรงกับคะแนนบนหัวหน้า */
  const mk = (l, as, femN, dp) => {
    const fem = clamp(c.fem - (fn - femN) / bs, 0, 1), promo = dp === c.dp ? c.promo : promoAtPct(dp);
    const amp = ampOf(c.fam, c.pol, fem, c.ten), ois = oisOf(signalB(promo, amp));
    let band = null; try { const b = band90(promo, c.fam, c.pol, fem); if (Array.isArray(b)) band = b; } catch (e) { }
    const quad = quadOf(cpOf(promo), amp);
    const flag = inDomainOf(c.ind) && quad === "A" && !!band && band[0] >= 50 && REGIME[fy] !== "FAIL";
    return { l, as, ois, tier: tierOf(ois), quad, band, flag };
  };
  const base = mk("ปัจจุบัน (ค่าจริง)", "—", fn, c.dp);
  const rows = [];
  if (fn >= 1) rows.push(mk("กรรมการหญิงลาออก 1 คน", `แทนที่ด้วยกรรมการชาย · ขนาดบอร์ด ${bs} คนเท่าเดิม`, fn - 1, c.dp));
  if (fn >= 2) rows.push(mk("กรรมการหญิงลาออก 2 คน", `แทนที่ด้วยกรรมการชาย · ขนาดบอร์ด ${bs} คนเท่าเดิม`, fn - 2, c.dp));
  rows.push(mk("สารถึงผู้ถือหุ้นปีถัดไประมัดระวังขึ้น", `CEO Promotion Focus −25 เปอร์เซ็นไทล์ (${c.dp} → ${dp25})`, fn, dp25));
  if (fn >= 1) rows.push(mk("ทั้งสองอย่าง", `กรรมการหญิงลาออก ${fn >= 2 ? "2" : "1"} คน + CEO Promotion Focus −25 เปอร์เซ็นไทล์`, Math.max(0, fn - 2), dp25));
  return { base, rows, bs, fn, assumedSize: !c.bsize };
}
function downsideBlock(c) {
  if (tierRank() < 2) return `<div class="card tr-lockcard" style="margin-bottom:14px">
      <h3>ฉากทัศน์ขาลง (Downside) <span class="pill blue">Pro Max</span></h3>
      <p class="desc" style="margin:0">จำลองกรณีกรรมการหญิงลาออก 1–2 คน หรือสารถึงผู้ถือหุ้นปีถัดไประมัดระวังขึ้น แล้วดูว่า tier / quadrant เปลี่ยนหรือไม่ และธงสัญญาณ OI หายไปหรือไม่ — เป็นสิทธิ์ของ Pro Max (Subscription)</p>
      <button class="btn s" data-setplan="max" style="margin-top:10px">ดูสิทธิ์ Pro Max</button></div>`;
  const d = downsideRows(c), b = d.base;
  const flagTxt = r => b.flag ? (r.flag ? `<span class="pill ok">ยังคงอยู่</span>` : `<span class="pill crit">หายไป</span>`)
    : (r.flag ? `<span class="pill ok">ปรากฏ</span>` : `<span class="pill mute">ไม่มีตั้งแต่ต้น</span>`);
  const dT = r => { const x = Math.round(r.ois) - Math.round(b.ois); return x > 0 ? `+${x}` : x < 0 ? `${x}` : "±0"; };
  return `<div class="card tr-down" style="margin-bottom:14px">
    <h3>ฉากทัศน์ขาลง (Downside) <span class="pill blue">Pro Max</span></h3>
    <p class="desc">ตั้งต้นจากค่าจริงของ ${esc(c.t)} (ไม่ใช่สถานะจำลองด้านบน) · ตัวแปรบริบทตรึงไว้ที่ค่าจริง · ผลตามสูตรเชิงความสัมพันธ์ ไม่ใช่การพยากรณ์</p>
    ${d.assumedSize ? `<div class="note warn" style="margin-bottom:10px;font-size:11px">ยังไม่มีจำนวนกรรมการของบริษัทนี้ — สมมติขนาดบอร์ด ${d.bs} คน (กรอกได้ใน Zone A)</div>` : ""}
    <div class="tw"><table class="tr-tbl"><thead><tr><th>ฉากทัศน์</th><th>สมมติฐาน</th><th class="n">OIS</th><th class="n">เทียบปัจจุบัน</th><th class="n">Tier</th><th>quadrant</th><th>ธงสัญญาณ OI</th></tr></thead>
      <tbody><tr class="hl"><td><b>${esc(b.l)}</b></td><td>กรรมการหญิง ≈ ${d.fn} คน จาก ${d.bs} · CEO PF ${c.dp}</td><td class="n"><b>${fmt(b.ois, 1)}</b></td><td class="n">—</td>
        <td class="n">${b.tier}</td><td>${esc(ZONES[b.quad].l)}</td><td>${b.flag ? `<span class="pill ok">มี</span>` : `<span class="pill mute">ไม่มี</span>`}</td></tr>
      ${d.rows.map(r => `<tr><td><b>${esc(r.l)}</b></td><td>${esc(r.as)}</td><td class="n">${fmt(r.ois, 1)}</td><td class="n">${dT(r)}</td>
        <td class="n">${r.tier}${r.tier !== b.tier ? ` <span class="pill warn">เปลี่ยน</span>` : ""}</td>
        <td>${esc(ZONES[r.quad].l)}${r.quad !== b.quad ? ` <span class="pill warn">ย้ายช่อง</span>` : ""}</td><td>${flagTxt(r)}</td></tr>`).join("")}</tbody></table></div>
    <div class="note tr-qnote" style="margin-top:10px">การคำนวณรายไตรมาสต้องใช้ข้อมูลรายไตรมาสซึ่งงานวิจัยยังไม่มี (ข้อมูลเป็นรายปี) — เตรียมไว้สำหรับเฟสถัดไป</div>
  </div>`;
}

function viewStudioPro() {
  const c = cur(), w = wiInit2();
  const s1 = wiScore(c, w), ipi1 = s1.ipi, d = ipi1 - c.ipi;
  const z0 = zoneOf(c.promo, c.amp), zone1 = s1.zone;
  const inner = `
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div><h3 style="margin:0">ฉากทัศน์สำเร็จรูป</h3>
        <p class="desc" style="margin:2px 0 0">ฉากทัศน์สำเร็จรูปขยับเฉพาะสัดส่วนกรรมการหญิงและภาษา CEO (และคืนตัวแปรบริบทเป็นค่าจริง) · กรรมการครอบครัว political ties และอายุงานไม่ใช่คันโยกที่ระบบเสนอ</p></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${WI_PRESETS.map(p => `<button class="btn ${w.preset === p.k ? "p" : "g"}" data-preset="${p.k}"
        title="${esc(p.d || "")}" style="font-size:11.5px;padding:5px 11px">${esc(T(p.en, p.th))}</button>`).join("")}</div></div>
  </div>
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card">
      <h3>① ภาษาผู้นำ — CEO Text Testing</h3>
      <p class="desc">วางสารจากประธาน/CEO หรืออัปโหลดรายงานประจำปี ระบบจะนับคำเชิงรุกและเชิงป้องกันในเบราว์เซอร์ของคุณเอง
        แล้วแปลงเป็นเปอร์เซ็นไทล์ CEO Promotion Focus · <b>ไฟล์ไม่ถูกส่งขึ้นเซิร์ฟเวอร์ใด</b> และข้อความไม่ถูกเก็บหลังวิเคราะห์</p>
      <textarea class="inp" id="ceoTxt" rows="6" style="width:100%;resize:vertical;font-size:12.5px"
        placeholder="วางข้อความสารจากประธานกรรมการหรือวิสัยทัศน์ของ CEO ที่นี่ เช่น “เรามุ่งมั่นพัฒนานวัตกรรมเพื่อการเติบโตอย่างยั่งยืน ขยายสู่ตลาดใหม่ และสร้างพันธมิตรเชิงกลยุทธ์...”"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn p" id="btnAnalyse">วิเคราะห์ข้อความ</button>
        <button class="btn s" id="btnUp">⬆ อัปโหลด PDF / TXT</button>
        <button class="btn g" id="btnSample">ใส่ตัวอย่าง</button>
        <button class="btn g" id="btnCeoReset">↺ ค่าจริงของบริษัท</button>
        <input type="file" id="ceoFile" accept=".pdf,.txt,.md" style="display:none">
      </div>
      <div id="ceoOut" style="margin-top:12px"></div>
      <div style="margin-top:13px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
          <span>CEO Promotion Focus (ปรับเองได้)</span><span class="num"><b>${w.dp}</b> / 100</span></div>
        <input type="range" id="slDp" min="0" max="100" step="1" value="${w.dp}" style="width:100%;accent-color:var(--brand)">
        <div style="font-size:10.5px;color:var(--ink-3)">ที่มาปัจจุบัน: ${esc(w.src)}</div>
      </div>
    </div>

    <div class="card">
      <h3>② องค์ประกอบคณะกรรมการ · 3 ตัวแปร</h3>
      <p class="desc">กรรมการหญิง · กรรมการครอบครัว · political ties — ตัวเลขที่ขยับเป็นความสัมพันธ์ตามสูตร E4–E7 ไม่ใช่การพยากรณ์ · คันโยกที่ระบบเสนอมีเฉพาะกรรมการหญิง</p>
      ${WI_CTRL2.map(v => `<div style="margin-bottom:13px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span>${v.l} <span class="hlp" title="ตัวแปรที่สัมพันธ์กับการหนุนสัญญาณมากที่สุดในสูตร">ⓘ</span></span>
          <span class="num"><b>${v.fmt(w[v.k])}</b> <span style="color:var(--ink-3);font-size:10.5px">เดิม ${v.fmt(c[v.k])}${c.bsize ? ` · ≈ ${femaleN(w[v.k], c.bsize)} คนจาก ${c.bsize}` : ""}</span></span></div>
        <input type="range" data-wi="${v.k}" min="${v.min}" max="${v.max}" step="${v.step}" value="${w[v.k]}" style="width:100%;accent-color:var(--brand)">
      </div>`).join("")}
      ${c.bsize ? `<div style="font-size:10.8px;color:${femaleN(w.fem, c.bsize) < CRIT_N ? "var(--warn)" : "var(--ink-3)"};margin:-6px 0 12px">${esc(critMassLine(Object.assign({}, c, { fem: w.fem })))}</div>` : `<div style="font-size:10.8px;color:var(--ink-3);margin:-6px 0 12px">${esc(critMassLine(c))}</div>`}
      ${ctxCtrls(c, w)}
      <button class="btn s" id="btnWiReset" style="width:100%;justify-content:center">↺ กลับไปใช้โครงสร้างบอร์ดจริง</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3>ผลลัพธ์จำลอง <span style="font-weight:300;color:var(--ink-3);font-size:12px">· ตามสูตร เชิงความสัมพันธ์</span></h3>
    ${wiCtxMoved(c, w) ? `<div class="tr-ctxchip" role="note">⚠ ${esc(CHIP_CTX)} · ครอบครัว ${pct1(c.fam)} → ${pct1(w.fam)} · political ties ${c.pol} → ${w.pol}</div>` : ""}
    <div class="grid g4 tight" style="gap:10px;margin:10px 0 14px">
      <div class="stat"><div class="k">OpenInnoScore ปัจจุบัน</div><div class="v num">${c.ipi}</div><div class="u">${ZONES[z0].l}</div></div>
      <div class="stat hero"><div class="k">OpenInnoScore จำลอง</div><div class="v num">${ipi1}</div><div class="u">${ZONES[zone1].l}</div></div>
      <div class="stat"><div class="k">ต่างกัน (ตามสูตร)</div>
        <div class="v num" style="color:${d > 0 ? "var(--ok)" : d < 0 ? "var(--crit)" : "var(--ink)"}">${d > 0 ? "+" : ""}${d}</div>
        <div class="u">${d > 0 ? "▲ สูงขึ้น" : d < 0 ? "▼ ต่ำลง" : "เท่าเดิม"}</div></div>
      <div class="stat"><div class="k">ย้ายโซนหรือไม่</div>
        <div class="v" style="font-size:17px;color:${zone1 !== z0 ? "var(--ok)" : "var(--ink)"}">${zone1 !== z0 ? "ย้าย" : "อยู่โซนเดิม"}</div>
        <div class="u">${zone1 !== z0 ? ZONES[z0].l + " → " + ZONES[zone1].l : ZONES[z0].l}</div></div>
    </div>
    <div style="margin-bottom:6px;font-size:11.5px;color:var(--ink-3)">ตำแหน่งบนการกระจายตัว · บริษัทใน snapshot ปี 2566 (คะแนนอ้างอิงฐาน REF-928, 928 บริษัท-ปี)</div>
    ${boxplot(IPI_ALL, ipi1, "OpenInnoScore · ฐานอ้างอิง REF-928 (928 บริษัท-ปี)")}
    <div class="legend"><span><i class="dia" style="background:var(--ink)"></i>ค่าจำลอง ${ipi1}</span>
      <span style="color:var(--ink-3)">เดิม ${c.ipi}</span></div>
    ${bars([
      { l: "CEO Promotion Focus", v: w.dp, t: `${c.dp} → ${w.dp}`, c: rampAt(w.dp), hl: 1 },
      { l: "Board Amplification", v: ampPct(s1.amp), t: `${ampPct(c.amp)} → ${ampPct(s1.amp)}`, c: rampAt(ampPct(s1.amp)), hl: 1 },
    ], { lw: 175, h: 10, max: 100 })}
  </div>

  ${downsideBlock(c)}
  <div class="grid g-side-r">
    <div class="card">
      <h3>ฉากทัศน์เปรียบเทียบ</h3>
      <p class="desc">คำนวณจากสถานะจำลองปัจจุบัน · เรียงตามความสัมพันธ์กับ OpenInnoScore ตามสูตร</p>
      ${wiScenarios2(c, w)}
    </div>
    <div class="card">
      <h3>Board Persona ที่สอดคล้องกับข้อสังเกต</h3>
      <p class="desc">แปลผลจากสถานะจำลอง เป็นโจทย์การสรรหากรรมการ (เชิงความสัมพันธ์)</p>
      ${persona2(c, w, ipi1)}
    </div>
  </div>
  <div class="note warn" style="margin-top:14px">
    <b>อ่านอย่างซื่อตรง</b> — ตัวเลขที่ขยับเป็นความสัมพันธ์ตามสูตรของแบบจำลองเชิงสหสัมพันธ์ เป็น “ฉากทัศน์เพื่อการออกแบบบอร์ด”
    ไม่ใช่การรับประกันว่าปรับแล้วนวัตกรรมจะเพิ่มจริง · <b>political ties เป็นข้อมูลบริบท ไม่ใช่คันโยก และไม่ใช้เป็นเหตุผลเชิงบวก</b> ·
    <b>ห้ามใช้ผลนี้ประเมินหรือคัดเลือกรายบุคคล</b> เพราะเพศและความเชื่อมโยงทางการเมืองเป็นข้อมูลอ่อนไหวตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 26</div>`;
  return pageHead("จำลองสถานการณ์", "What-if Studio",
    `ปรับได้ทั้งสองด้านพร้อมกัน — ภาษาของ CEO จากเอกสารจริง และสัดส่วนกรรมการหญิง — แล้วดูว่า OpenInnoScore ตามสูตรขยับไปเท่าไหร่และย้ายโซนหรือไม่`) + inner;
}
function wireStudioPro(h) {
  const c = cur(), w = wiInit2();
  h.querySelectorAll("[data-wi]").forEach(r => r.oninput = () => { w[r.dataset.wi] = +r.value; w.preset = null; render(); });
  h.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
    const p = WI_PRESETS.find(x => x.k === b.dataset.preset); if (!p) return;
    const v = p.f(c); w.fem = v.fem; w.dp = v.dp; w.preset = p.k; w.fam = c.fam; w.pol = c.pol;   // ฉากทัศน์ไม่ขยับตัวแปรบริบท
    w.src = p.k === "cur" || p.k === "sq" ? "ค่าจริงของบริษัท" : `ฉากทัศน์ “${T(p.en, p.th)}”`;
    if (p.k === "cur") { S.ceo = null; _ceoBuf = ""; }
    toast(`ฉากทัศน์ · ${T(p.en, p.th)}`); render();
  });
  const dp = h.querySelector("#slDp");
  if (dp) dp.oninput = () => { w.dp = +dp.value; w.src = "ปรับด้วยตัวเลื่อนเอง"; w.preset = null; render(); };
  const fam = h.querySelector("#wiFam");
  if (fam) fam.oninput = () => { if (wiCtxLocked()) return; w.fam = +fam.value; w.preset = null; render(); };
  h.querySelectorAll("[data-wipol]").forEach(b => b.onclick = () => { if (wiCtxLocked()) return toast(LOCK_BANK); w.pol = +b.dataset.wipol; w.preset = null; render(); });
  const rs = h.querySelector("#btnWiReset");
  if (rs) rs.onclick = () => { const k = wiInit2(true); k.dp = w.dp; k.src = w.src; render(); };
  const cr = h.querySelector("#btnCeoReset");
  if (cr) cr.onclick = () => { w.dp = c.dp; w.src = "ค่าจริงของบริษัท"; w.preset = null; S.ceo = null; _ceoBuf = ""; render(); };
  const ta = h.querySelector("#ceoTxt");
  if (ta && S.ceo && _ceoBuf) { ta.value = _ceoBuf; renderCeoOut(_ceoBuf, S.ceo.r); }
  const runIt = txt => {
    if (!txt.trim()) return toast("ยังไม่มีข้อความให้วิเคราะห์");
    const r = analyseText(txt);
    S.ceo = { r }; _ceoBuf = txt; w.dp = r.dp; w.src = `วิเคราะห์จากข้อความ ${fmt(r.wc)} คำ`; w.preset = null;
    render();
  };
  const an = h.querySelector("#btnAnalyse");
  if (an) an.onclick = () => runIt(ta.value);
  const sm = h.querySelector("#btnSample");
  if (sm) sm.onclick = () => { ta.value = SAMPLE; runIt(SAMPLE); };
  const up = h.querySelector("#btnUp"), fi = h.querySelector("#ceoFile");
  if (up && fi) {
    up.onclick = () => fi.click();
    fi.onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      toast("กำลังอ่าน " + f.name + " …");
      try {
        const t = await readFileText(f);
        if (/\.pdf$/i.test(f.name) && t.trim().length < 200)
          return toast("ไฟล์นี้น่าจะเป็นสแกน — OCR ต้องต่อบริการฝั่งเซิร์ฟเวอร์ (ดูหน้า 'การเชื่อมต่อ')");
        ta.value = t.slice(0, 60000); runIt(ta.value); toast("อ่าน " + f.name + " เสร็จแล้ว");
      }
      catch (err) { toast("อ่านไฟล์ไม่สำเร็จ — " + err.message); }
    };
  }
}

/* ---------------------------------------------------------------- โหมดทดลองสำหรับผู้ใช้ Free
   เปิดให้เล่นจริง 1 ตัวแปร (สัดส่วนกรรมการหญิง) ด้วยเอนจินตัวเดียวกับ Pro — ไม่ใช่ภาพเบลอ */
const teaserKey = () => "fem";
/** ช่วงที่ให้ทดลอง = จากค่าจริงของบริษัท ไปถึงค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรม */
function tzRange(c, k) {
  const tg = optimalBoard(c);
  return { lo: Math.min(c[k], tg[k]), hi: Math.max(c[k], tg[k]) };
}
function tzState(c) {
  const k = teaserKey(c), r = tzRange(c, k);
  if (!S.tz || S.tz.t !== c.t || S.tz.k !== k) S.tz = { t: c.t, k, v: c[k] };
  S.tz.v = clamp(S.tz.v, r.lo, r.hi);
  return S.tz;
}
const tzProfile = (c, k, v) => Object.assign(profOf(c), { [k]: v });

function studioTeaser(c) {
  const z = tzState(c), k = z.k, ctrl = WI_CTRL2[0], rg = tzRange(c, k);
  const sim = ipiAt(c, tzProfile(c, k, z.v)), d = sim - c.ipi;
  const amp1 = ampOf(c.fam, c.pol, z.v, c.ten);
  const z0 = zoneOf(c.promo, c.amp), z1 = zoneOf(c.promo, amp1);
  const u = upsideOf(c), lab = T(TZ_LABEL[k].en, TZ_LABEL[k].th);
  const best = Math.max(u.best, sim);
  const dc = v => v > 0 ? "var(--ok)" : v < 0 ? "var(--crit)" : "var(--ink)";

  const proItems = [
    { h: T("Three board variables + CEO language", "ปรับบอร์ด 3 ตัวแปร + ภาษา CEO"),
      p: T("Female, family and political-ties variables plus CEO language; family and political ties carry permanent warnings and are never recommended.", "กรรมการหญิง กรรมการครอบครัว political ties และภาษา CEO · ครอบครัวและ political ties ติดป้ายเตือนถาวร และไม่อยู่ในข้อเสนอ") },
    { h: T("CEO language from your own files", "วัดภาษา CEO จากไฟล์ของคุณเอง"),
      p: T("Drop in a 56-1 or an annual report; the wording is scored in your browser, never uploaded.", "วางไฟล์ 56-1 หรือรายงานประจำปี ระบบนับคำในเบราว์เซอร์ของคุณเอง ไม่ส่งขึ้นเซิร์ฟเวอร์") },
    { h: T("Scenarios pushed in from Zone C", "รับฉากทัศน์จาก Zone C มาต่อยอด"),
      p: T("Send a ranked observation straight into the simulator and keep tuning it.", "ส่งข้อเสนอที่จัดลำดับแล้วเข้าเครื่องจำลองแล้วปรับต่อได้ทันที") },
    { h: T("Validity broken out by year", "ตาราง Validity แยกรายปี"),
      p: T("See which year the model holds up in and which year it does not.", "เห็นว่าปีไหนโมเดลอยู่ ปีไหนไม่อยู่ แทนที่จะเห็นแค่ผลสรุป") },
  ];

  return `<div class="grid g-side-r">
    <div class="stack">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div>
            <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ok);font-weight:500">
              ${T("Live trial · real engine", "โหมดทดลอง · ใช้เอนจินตัวจริง")}</div>
            <h3 style="margin:3px 0 0">${T(`Try one lever — ${lab}`, `ลองปรับ ${lab}`)}
              <span style="color:var(--ink-3);font-weight:300">· ${esc(c.t)}</span></h3>
          </div>
          <span class="pill ok">${T("free", "ฟรี")}</span>
        </div>
        <p class="desc">${T(
    "This is not a mock-up. The slider runs the same moderation equation Pro users run — only CEO language is pinned to this firm's real value. Figures are formula-based associations, not predictions.",
    "นี่ไม่ใช่ภาพจำลอง ตัวเลื่อนนี้คิดด้วยสมการ moderation ตัวเดียวกับที่ผู้ใช้ Pro ใช้ — ต่างกันแค่ภาษา CEO ถูกตรึงไว้ที่ค่าจริงของบริษัท · ตัวเลขเป็นความสัมพันธ์ตามสูตร ไม่ใช่การพยากรณ์")}</p>

        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin:14px 0 4px">
          <span>${esc(lab)}</span>
          <span class="num"><b>${ctrl.fmt(z.v)}</b>
            <span style="color:var(--ink-3);font-size:10.5px">${T("actual", "ค่าจริง")} ${ctrl.fmt(c[k])}</span></span></div>
        <input type="range" id="tzSl" min="${rg.lo}" max="${rg.hi}" step="${ctrl.step}" value="${z.v}"
          style="width:100%;accent-color:var(--brand)">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3);margin-top:3px">
          <span>${ctrl.fmt(rg.lo)}${rg.lo === c[k] ? " · " + T("this firm today", "ค่าจริงวันนี้") : ""}</span>
          <span>${ctrl.fmt(rg.hi)}${rg.hi !== c[k] ? " · " + T("best seen in this industry", "ดีที่สุดที่พบในอุตสาหกรรมนี้") : ""}</span></div>
        <div style="font-size:10.8px;color:var(--ink-3);margin-top:6px">${esc(critMassLine(c))}</div>

        <div class="grid g4 tight" style="gap:10px;margin:15px 0 12px">
          <div class="stat"><div class="k">${T("OIS today", "OIS ปัจจุบัน")}</div><div class="v num">${c.ipi}</div>
            <div class="u">${esc(ZONES[z0].l)}</div></div>
          <div class="stat hero"><div class="k">${T("OIS simulated", "OIS จำลอง")}</div><div class="v num">${sim}</div>
            <div class="u">${esc(ZONES[z1].l)}</div></div>
          <div class="stat"><div class="k">${T("Difference (formula)", "ต่างกัน (ตามสูตร)")}</div>
            <div class="v num" style="color:${dc(d)}">${d > 0 ? "+" : ""}${d}</div>
            <div class="u">${d > 0 ? T("▲ higher", "▲ สูงขึ้น") : d < 0 ? T("▼ lower", "▼ ต่ำลง") : T("unchanged", "เท่าเดิม")}</div></div>
          <div class="stat"><div class="k">${T("Zone", "โซนกลยุทธ์")}</div>
            <div class="v" style="font-size:16px;color:${z1 !== z0 ? "var(--ok)" : "var(--ink)"}">
              ${z1 !== z0 ? T("moves", "ย้าย") : T("same", "อยู่โซนเดิม")}</div>
            <div class="u">${z1 !== z0 ? esc(ZONES[z0].l) + " → " + esc(ZONES[z1].l) : esc(ZONES[z0].l)}</div></div>
        </div>
        ${boxplot(IPI_ALL, sim, T("OpenInnoScore · reference base REF-928 (928 firm-years)", "OpenInnoScore · ฐานอ้างอิง REF-928 (928 บริษัท-ปี)"))}
        <div class="legend"><span><i class="dia" style="background:var(--ink)"></i>${T("simulated", "ค่าจำลอง")} ${sim}</span>
          <span style="color:var(--ink-3)">${T("actual", "ค่าจริง")} ${c.ipi}</span></div>
        ${ctxRows(c)}
      </div>

      <div class="card">
        <h3>${T("Why this lever", "ทำไมระบบหยิบตัวแปรนี้มาให้ลอง")}</h3>
        <p class="desc" style="margin-bottom:0">${T(TZ_WHY[k].en, TZ_WHY[k].th)}</p>
        <div class="note warn" style="margin-top:12px"><b>${T("Political ties are context, not a lever.",
          "political ties เป็นข้อมูลบริบท ไม่ใช่คันโยก")}</b>
          ${T("They are never used as a positive reason, and no result here may be used to score an individual director.",
        "ไม่ใช้เป็นเหตุผลเชิงบวก — และห้ามใช้ผลนี้ประเมินกรรมการรายบุคคล")}</div>
      </div>
    </div>

    <div class="stack">
      <div class="scn">
        <small>${T("Pro plan", "สิทธิ์ของแผน Pro")}</small>
        <div class="big">${c.ipi} <span style="opacity:.5">→</span> <em>${fmt(best)}</em></div>
        <p>${u.delta <= 0
      ? T("Female representation here already sits at the best value observed in its industry — Pro is where you test CEO language and read the year-by-year validity instead.",
        "สัดส่วนกรรมการหญิงของบริษัทนี้อยู่ที่ค่าที่ดีที่สุดเท่าที่พบในอุตสาหกรรมแล้ว — Pro จึงมีไว้ทดสอบภาษาผู้บริหารและอ่าน Validity รายปีแทน")
      : d === 0
        ? T(`Slide the control on the left to see this move. Female representation at the best value observed in ${indL(c.ind)} is associated with ${fmt(u.best)} — ${sgn(u.delta)} points from today, per the formula.`,
          `ลองเลื่อนตัวควบคุมด้านซ้ายเพื่อดูผล · สัดส่วนกรรมการหญิงที่ค่าที่ดีที่สุดเท่าที่พบจริงใน${indL(c.ind)} สัมพันธ์กับ ${fmt(u.best)} — ${sgn(u.delta)} จุดจากวันนี้ (ตามสูตร)`)
        : T(`This position is associated with ${sgn(d)} points. The best value observed in ${indL(c.ind)} is associated with ${fmt(u.best)} — ${sgn(u.delta)} points from today, per the formula.`,
          `ตำแหน่งนี้สัมพันธ์กับ ${sgn(d)} จุด · ค่าที่ดีที่สุดเท่าที่พบจริงใน${indL(c.ind)} สัมพันธ์กับ ${fmt(u.best)} — ${sgn(u.delta)} จุดจากวันนี้ (ตามสูตร)`)}</p>
        <div style="display:grid;gap:8px;margin-top:14px">
          ${[{ l: T("today", "วันนี้"), v: c.ipi, c: "rgba(255,255,255,.34)" },
      { l: T("your trial", "ที่คุณลองเลื่อน"), v: sim, c: "rgba(119,242,161,.72)" },
      { l: T("industry best", "ดีที่สุดในกลุ่ม"), v: best, c: "var(--mint)" }]
      .map(b => `<div style="display:grid;grid-template-columns:104px 1fr 30px;align-items:center;gap:9px;font-size:11px;color:#C3D4E4">
            <span>${esc(b.l)}</span>
            <span style="height:8px;border-radius:99px;background:rgba(255,255,255,.13);display:block;overflow:hidden">
              <i style="display:block;height:100%;border-radius:99px;background:${b.c};width:${clamp(b.v, 2, 100)}%"></i></span>
            <b class="num" style="color:#fff;text-align:right">${b.v}</b></div>`).join("")}</div>
        <div style="display:grid;gap:7px;margin-top:14px">
          ${tierRank() >= 1
            ? `<button class="btn m" data-unlock="studio">ปลดล็อก What-if Studio ของ ${esc(c.t)} · ใช้ ${PRICE.studio} เครดิต</button>
               <div style="font-size:10.4px;color:#9FB6CC;line-height:1.5">รวมการตรวจภาษา CEO · ปลดล็อกครั้งเดียวใช้กับบริษัทนี้ได้ตลอด · Pro Max ใช้ได้ทุกบริษัท</div>`
            : `<button class="btn m" data-pro="1">${T("Switch to Pro", "เปลี่ยนเป็นแผน Pro")}</button>`}
          <button class="btn s" data-goto="billing">${T("See what the plan covers", "ดูรายละเอียดแผน")}</button></div>
        <div style="font-size:10.4px;color:#9FB6CC;margin-top:9px;line-height:1.6">
          ${T("Your slider position carries over — the studio opens exactly where you left it.",
        "ค่าที่คุณเลื่อนไว้จะถูกยกไปด้วย เปิด Studio แล้วอยู่ตรงจุดเดิม")}</div>
      </div>

      <div class="card">
        <h3>${T("What Pro adds here", "แผน Pro เปิดอะไรเพิ่มในหน้านี้")}</h3>
        <div style="display:grid;gap:11px;margin-top:9px">
          ${proItems.map(it => `<div style="display:flex;gap:9px;align-items:flex-start">
            <span style="flex:none;width:17px;height:17px;border-radius:50%;background:var(--ok-bg);color:var(--ok);
              display:grid;place-items:center;font-size:11px;margin-top:1px">✓</span>
            <div><div style="font-size:12.7px;font-weight:500;line-height:1.4">${esc(it.h)}</div>
              <div style="font-size:11.6px;color:var(--ink-2);line-height:1.55">${esc(it.p)}</div></div></div>`).join("")}
        </div>
        <div class="note brand" style="margin-top:13px">${T(
        "Reports are still paid per token on Pro — the plan only opens the deep tools. Nothing you have already unlocked is lost.",
        "อยู่แผน Pro แล้วค่ารายงานยังคิดเป็น token เท่าเดิม แผนเปิดเฉพาะเครื่องมือเชิงลึก · สิทธิ์ที่ปลดไว้แล้วไม่หายไปไหน")}</div>
      </div>
    </div>
  </div>`;
}
function wireTeaser(h) {
  const c = cur(), z = tzState(c), sl = h.querySelector("#tzSl");
  if (sl) sl.oninput = () => { z.v = +sl.value; render(); };
}

viewStudio = function () {
  if (isUnlocked("studio")) return viewStudioPro();
  const c = cur();
  return pageHead(T("Simulation", "จำลองสถานการณ์"), "What-if Studio",
    T("Move female representation and the CEO's language together, then see where OpenInnoScore lands per the formula and whether the firm changes zone.",
      "ปรับได้ทั้งสองด้านพร้อมกัน — ภาษาของ CEO จากเอกสารจริง และสัดส่วนกรรมการหญิง — แล้วดูว่า OpenInnoScore ตามสูตรขยับไปเท่าไหร่และย้ายโซนหรือไม่"))
    + studioTeaser(c);
};
VIEWS.studio = viewStudio;
wireStudio = function (h) { return isUnlocked("studio") ? wireStudioPro(h) : wireTeaser(h); };

/* ---------------------------------------------------------------- เทียบคู่แข่งข้ามอุตสาหกรรม (F5) */
const _viewPeer = viewPeer, _wirePeer = wirePeer;
viewPeer = function () {
  const c = cur();
  if (tierRank() < 2 && S.peerAll) { S.peerAll = false; S.peers = []; }      // ข้ามอุตสาหกรรม = สิทธิ์ Pro Max
  if (!S.peers.length) S.peers = autoPeers(c).map(x => x.t);
  let h = _viewPeer();
  const tog = tierRank() >= 2
    ? `<button class="btn ${S.peerAll ? "p" : "g"}" id="btnPeerAll" style="font-size:12px;padding:6px 12px" title="เลือกบริษัทจากทุกอุตสาหกรรม / ข้ามประเภทธุรกิจ">${S.peerAll ? "✓ " : ""}ข้ามอุตสาหกรรม</button>`
    : `<button class="btn g tr-locked" id="btnPeerAllLk" style="font-size:12px;padding:6px 12px" aria-disabled="true"
        title="เทียบข้ามอุตสาหกรรม / ข้ามประเภทธุรกิจ เป็นสิทธิ์ Pro Max">🔒 ข้ามอุตสาหกรรม · Pro Max</button>
      <button class="btn g" id="btnPeerAuto"`;
  h = h.replace('<button class="btn g" id="btnPeerAuto"', tog);
  if (S.peerAll) {
    const note = `<div class="note" style="margin-top:10px;font-size:11px"><b>เทียบข้ามอุตสาหกรรม</b> — percentile ใช้ฐานรวม (OIS) ไม่ใช้ OIS ในอุตสาหกรรม · ค่าอ้างอิงรายอุตสาหกรรมของแต่ละบริษัทต่างกัน จึงอ่านผลเทียบเป็นภาพรวมเท่านั้น</div>
  </div>`;
    const i = h.indexOf('<button class="btn g" id="btnPeerAuto"'), j = h.indexOf("</div>\n  </div>", i);
    if (j > 0) h = h.slice(0, j) + "</div>" + note + h.slice(j + "</div>\n  </div>".length);
  }
  return h;
};
VIEWS.peer = viewPeer;
wirePeer = function (h) {
  _wirePeer(h);
  const c = cur(), box = h.querySelector("#peerPick");
  if (box && S.peerAll) {
    const pool = COMPS.filter(x => x.t !== c.t).slice().sort((a, b) => b.ipi - a.ipi);
    box.innerHTML = [0, 1, 2].map(i => `<select class="sel" data-slot="${i}" style="font-size:12px;padding:5px 9px">
      <option value="">— ไม่เลือก —</option>
      ${pool.map(x => `<option value="${x.t}"${S.peers[i] === x.t ? " selected" : ""}>${esc(x.t)} · ${esc(IND[x.ind])} · OIS ${x.ipi}</option>`).join("")}</select>`).join("");
    box.querySelectorAll("select").forEach(s => s.onchange = () => {
      S.peers = [...new Set([...box.querySelectorAll("select")].map(x => x.value).filter(Boolean))].slice(0, 3); render();
    });
  }
  const tg = h.querySelector("#btnPeerAll");
  if (tg) tg.onclick = () => { if (tierRank() < 2) return; S.peerAll = !S.peerAll; if (!S.peerAll) S.peers = []; save(); render(); };
  const lk = h.querySelector("#btnPeerAllLk");
  if (lk) lk.onclick = () => toast("เทียบข้ามอุตสาหกรรม / ข้ามประเภทธุรกิจ เป็นสิทธิ์ Pro Max — ดูได้ที่หน้า เครดิตและแผน");
};


/** คัดลอกข้อความ — เผื่อกรณีเบราว์เซอร์ปิด Clipboard API (เช่นเปิดไฟล์แบบ file://) */
function copyText(txt) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
    let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    toast(ok ? T("Copied", "คัดลอกแล้ว") : T("Copy blocked by the browser — select the text and copy manually",
      "เบราว์เซอร์ไม่อนุญาตให้คัดลอก — กรุณาลากเลือกข้อความแล้วคัดลอกเอง"));
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => toast(T("Copied", "คัดลอกแล้ว"))).catch(fallback);
  } else fallback();
}

const WIRES2 = { fit: wireFit, matrix: wireMatrix, peer: wirePeer, studio: wireStudio, sector: wireSector,
  billing: wireBilling, port: wirePort, ic: wireIC, docs: wireDocs, zonec: wireZoneC };
render = function () {
  const host = $("#v-" + S.view);
  if (!host || typeof VIEWS[S.view] !== "function") return;
  host.innerHTML = VIEWS[S.view]();
  wireActions(host);
  (WIRES2[S.view] || (() => { }))(host);
  wireInvestCommon(host);
  host.querySelectorAll("[data-pro]").forEach(b => b.onclick = () => {
    const c = cur(), z = S.tz;                       // ยกค่าที่ผู้ใช้ลองเลื่อนไว้ไปตั้งต้นใน Studio ตัวเต็ม
    goPro();
    if (z && z.t === c.t) { const w = wiInit(true); w[z.k] = z.v; w.preset = null; }
    render();
  });
  host.querySelectorAll("[data-tone]").forEach(b => b.onclick = () => { S.tone = b.dataset.tone; save(); render(); });
  const sd = host.querySelector("#selInsDim");
  if (sd) sd.onchange = () => { S.insDim = sd.value; save(); render(); };
  host.querySelectorAll("#btnRegen").forEach(b => b.onclick = () => {
    if (sd) S.insDim = sd.value; save(); render();
    const dm = INS_DIMS.find(x => x.k === (S.insDim || "all")) || INS_DIMS[0];
    toast(T(`Insights regenerated · focus: ${dm.en}`, `สร้างข้อค้นพบใหม่ · เน้น${dm.th}`)); });
  host.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => {
    const i = insightOrdered(cur())[+b.dataset.copy]; if (!i) return;
    const txt = `[${i.tag}] ${i.h}\n${i.p}\n→ ${toneImpl(i.kind)}\n(${sgn(i.impact)} pts per the formula, association · OpenInnoScore™)`;
    copyText(txt);
  });
  // F4 · เพิ่มการ์ดข้อค้นพบลงรายงาน — S.report ถูกบันทึกใน save() และหน้า Compass อ่านต่อ
  host.querySelectorAll("[data-rep]").forEach(b => b.onclick = () => {
    const i = insightOrdered(cur())[+b.dataset.rep]; if (!i) return;
    S.report = S.report || [];
    if (S.report.some(r => r.t === S.t && r.h === i.h)) return toast(T("Already in the report", "อยู่ในรายงานแล้ว"));
    S.report.push({ t: S.t, kind: i.kind, h: i.h, p: i.p, ts: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) });
    save(); toast("เพิ่มลงรายงานแล้ว"); render();
  });
  host.querySelectorAll("[data-rmrep]").forEach(b => b.onclick = () => { S.report.splice(+b.dataset.rmrep, 1); save(); render(); });
  const rc = host.querySelector("#btnRepClear");
  if (rc) rc.onclick = () => { if (!confirm(T("Clear every item from the report?", "ล้างรายการในรายงานทั้งหมด?"))) return; S.report = []; save(); render(); };
  syncChrome();
  const fr = $("#fRemark"); if (fr) { const rm = validRemark(); fr.textContent = rm.l; fr.style.color = rm.k === "ok" ? "var(--ok)" : "var(--warn)"; }
};

/* ---------------------------------------------------------------- เริ่มระบบชั้นแก้ไขครั้งที่ 1 */
(function initV2() {
  if ($("#sLogo")) $("#sLogo").innerHTML = logoChip(34);
  if ($("#gLogo")) $("#gLogo").innerHTML = logoChip(42);
  const opts = COMPS.slice().sort((a, b) => b.ipi - a.ipi)
    .map(x => `<option value="${esc(x.t)}">${esc(x.t)} · ${esc(x.n)}</option>`).join("");
  const gco = $("#gCo"); if (gco) { gco.innerHTML = opts; gco.value = S.freeCo || S.t; }
  $$("#planPick .planopt").forEach(l => l.onclick = () => {
    $$("#planPick .planopt").forEach(x => x.classList.remove("on")); l.classList.add("on"); });
  /* ปุ่มเข้าใช้งาน — ผูกใหม่ให้รับประเภทผู้ใช้ บริษัทของผู้ใช้ และ consent */
  const goIn = () => {
    if ($("#gConsent") && !$("#gConsent").checked) return toast("กรุณายอมรับความยินยอมการประมวลผลข้อมูลก่อน");
    const plan = ($("#planPick input:checked") || {}).value || "free";
    S.plan = plan;
    S.credits = Math.max(S.credits || 0, PLAN_TOKENS[plan]);
    if (gco && gco.value) { S.t = gco.value; S.freeCo = gco.value; }
    S.view = "docs";
    enter($("#gMail").value.trim());
  };
  if ($("#btnEnter")) $("#btnEnter").onclick = goIn;
  if ($("#btnGoogle")) $("#btnGoogle").onclick = goIn;
  /* โทนและภาษา */

  // ซ่อน / แสดงแถบเมนูซ้าย — จำสถานะไว้ในเครื่อง
  function setSide(hide) {
    document.body.classList.toggle("sidehid", hide);
    const bs = $("#btnSide");
    if (bs) { bs.setAttribute("aria-expanded", String(!hide)); bs.title = hide ? T("Show menu", "แสดงแถบเมนู") : T("Hide menu", "ซ่อนแถบเมนู"); }
    save();
  }
  const bside = $("#btnSide");
  if (bside) bside.onclick = () => setSide(!document.body.classList.contains("sidehid"));
  const bsideC = $("#btnSideC");
  if (bsideC) bsideC.onclick = () => setSide(true);
  setSide(document.body.classList.contains("sidehid"));

  const sl = $("#segLang");
  if (sl) sl.onclick = e => { const b = e.target.closest("[data-lang]"); if (b) { S.lang = b.dataset.lang; save(); render(); } };
  const _sync = syncChrome;
  syncChrome = function () {
    _sync();
    const c = cur();
    $("#chipCredit").innerHTML = `<span aria-hidden="true">◈</span> ${PLAN_LAB[S.plan] || "Free"} · <b>${S.credits}</b> เครดิต`;
    $("#sPlan").textContent = `${({ free: "Level 1 · Free", pro: "Level 2 · Pro", max: "Level 3 · Pro Max" })[S.plan] || "Free"} · ${S.credits} เครดิต · บริษัทของคุณ ${S.freeCo || "—"}`;
    if ($("#segLang")) $$("#segLang button").forEach(b => b.setAttribute("aria-selected", b.dataset.lang === S.lang));
    const z = ZONES[zoneOf(c.promo, c.amp)];
    $("#chipZone").innerHTML = `<span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span> ${esc(z.l)} · OIS <b>${c.ipi}</b>`
      + (isEdited() ? ` · <b style="color:var(--brand)">แก้ค่าเอง</b>` : "");
  };
  buildNav();
  if (!VIEWS[S.view]) S.view = "docs";
  if (S.user) { $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + S.view)); syncChrome(); render(); }
})();
