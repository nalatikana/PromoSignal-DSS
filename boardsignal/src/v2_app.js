/* ============================================================================
   OpenInnoScore — ต้นแบบ Web Application
   โครงสร้าง
     1. คณิตศาสตร์ของโมเดล (เหมือนต้นฉบับทุกตำแหน่ง)
     2. สถานะผู้ใช้ · token · ผนังจ่ายเงิน
     3. หน้าจอ 8 หน้า
   ทุกอย่างทำงานในเบราว์เซอร์ ไม่มีการส่งข้อมูลออก
   ============================================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = (v, d = 0) => (v === null || v === undefined || isNaN(v)) ? "—"
  : Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct1 = v => fmt(v * 100, 1) + "%";

/* ---------------------------------------------------------------- 1 · โมเดล
   Signal B / OpenInnoScore — parameter card REF928-edit6-20260930 (แก้ไขครั้งที่ 2)
   สมการ E1–E13 ของเอกสาร SignalB_OpenInnoScore_Equations_Workflow_20261005_v2
   ฐานอ้างอิง = REF-928 ที่ freeze แล้ว (928 firm-years) — ไม่ใช่ snapshot 196 บริษัทอีกต่อไป
   ความลับทางการค้า: parameter card, V̂f และฐานอ้างอิงอยู่ใน OIS (ois_model.json) — ห้ามแสดงค่าตัวเลขเหล่านี้บนหน้าจอ
   ฉบับใช้งานจริงต้องย้ายชั้นนี้ไปหลัง API ฝั่งเซิร์ฟเวอร์ */
const OPAR = OIS.par, OM = OIS.mean, OCUT = OIS.cut;
const IND = DATA.ind, COMPS = DATA.comps;
const byT = Object.fromEntries(COMPS.map(c => [c.t, c]));

/** E7 · mid-rank percentile ของค่าหนึ่งเทียบอาร์เรย์ที่เรียงแล้ว (0–100) — นิยามเดียวกับ STATA */
function midRank(sorted, v) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; sorted[m] < v ? lo = m + 1 : hi = m; }
  let a = lo; hi = sorted.length;
  while (a < hi) { const m = (a + hi) >> 1; sorted[m] <= v ? a = m + 1 : hi = m; }
  return 100 * (lo + .5 * (a - lo)) / sorted.length;
}
/** ปัดให้ตรงความละเอียดของฐานอ้างอิง (8 ตำแหน่ง) เพื่อให้แถวในฐานนับเป็น "เท่ากัน" ตามนิยาม mid-rank */
const q8 = b => Math.round(b * 1e8) / 1e8;
/** pctile แบบเก่า (strict rank + ปัดเศษ) — คงไว้ให้โค้ดเดิมเรียกได้ แต่ตอนนี้ชี้ไปที่ mid-rank แล้ว */
const pctile = (sorted, v) => Math.round(midRank(sorted, q8(v)));

/** E2 · winsorise 5/95 (political ties ไม่ winsorise) */
const wins = (x, k) => OCUT[k] ? Math.min(Math.max(x, OCUT[k][0]), OCUT[k][1]) : x;
/** C5 · ค่าป้อนอยู่นอกช่วง p5–p95 ของฐานอ้างอิงหรือไม่ (ถูก clip ก่อนเข้าสูตร) */
const clipped = (x, k) => !!OCUT[k] && (x < OCUT[k][0] || x > OCUT[k][1]);
/** E3 · mean-centring เทียบค่าเฉลี่ยของฐานอ้างอิง (G ต้องเป็น 0/1 เท่านั้น) */
const cen = (P, F, G, W) => ({ P: wins(P, "P") - OM.P, F: wins(F, "F") - OM.F,
                               G: (G ? 1 : 0) - OM.G, W: wins(W, "W") - OM.W });
/** E4 · Board Amplification Signal = ความชันของ promotion focus ภายใต้บอร์ดนี้
 *  amp = β1 + δF·cF + δG·cG + δW·cW   (δT ถูกปิดด้วย evidence gate g_T = 0 — อายุงานไม่มีผลต่อคะแนน) */
function ampOf(fam, pol, fem, ten) {
  const z = cen(0, fam, pol, fem);
  return OPAR.b1 + OPAR.dF * z.F + OPAR.dG * z.G + OPAR.dW * z.W;
}
/** สูตรทางเลือก B_T1 (H1 + H4 เท่านั้น) — แนวทาง Pilot Use case 2 ให้แสดงคู่กับป้าย Caution */
function ampT1(fem) { const z = cen(0, 0, 0, fem); return OPAR.b1 + OPAR.dW * z.W; }
/** E5 · Signal B = cP × amp */
const cpOf = promo => wins(promo, "P") - OM.P;
const signalB = (promo, amp) => cpOf(promo) * amp;

const REF_B = OIS.refB;                       // ฐานอ้างอิง REF-928 (เรียงแล้ว, q8)
const REF_IND = OIS.refInd;                   // ฐานอ้างอิงรายอุตสาหกรรม (115–143 แถว)
const REF_T1 = OIS.refT1;
const REF_AMP = OIS.refAmp;                   // amp ของ 928 แถว (เรียงแล้ว)
const REF_PROMO = OIS.refP;                   // P หลัง winsorise ของ 928 แถว (เรียงแล้ว)
const REF_PTS = OIS.pts;                      // [P_w, amp, quad, tier, ind, year, cF, cG, cW] × 928 (ไม่มีชื่อบริษัท)
const ampPct = a => Math.round(midRank(REF_AMP, q8(a)) * 10) / 10;            // board_amp_pct (แกน y)
const promoPct = p => Math.round(midRank(REF_PROMO, q8(wins(p, "P"))) * 10) / 10;  // ceo_drive_pct (แกน x)
const oisOf = b => midRank(REF_B, q8(b));
const oisIndOf = (b, ind) => midRank(REF_IND[ind] || REF_B, q8(b));
const oisT1Of = b => midRank(REF_T1, q8(b));
/** คะแนนรวมจากคู่ (ceo_drive_pct, amp) — ใช้โดยหน้าจำลองที่ทำงานบนเปอร์เซ็นไทล์ */
const ipiFrom = (dp, amp) => Math.round(oisOf(signalB(promoAtPct(dp), amp)));
/** E9 · quartile tier (1 = บนสุด) */
const TIER_CUTS = OIS.tierCuts || [75, 50, 25];
const tierOf = o => o >= TIER_CUTS[0] ? 1 : o >= TIER_CUTS[1] ? 2 : o >= TIER_CUTS[2] ? 3 : 4;
/** R4 · ใช้ได้เฉพาะ SET นอกกลุ่มการเงิน อุตสาหกรรม 1–7 */
const inDomainOf = ind => !!IND[ind];
/** R5 · อุตสาหกรรมที่ ρ ไม่ต่างจากศูนย์ (รายการจาก ois_model: ตอนนี้ 1, 2 — รอยืนยันเรื่องกลุ่ม 4) */
const WEAK_IND = new Set(OIS.weakInd || [1, 2]);
/** Critical mass (Table 4): ผลของกรรมการหญิงมีนัยเมื่อ ≥ 3 คน — นับคน ไม่ใช่สัดส่วน */
const CRIT_N = OIS.critMass || 3;
const femaleN = (fem, bsize) => bsize ? Math.round(fem * bsize) : null;

/* E10 · quadrant — ชื่อโซนบนหน้าจอใช้ชุด Board Strategy Compass
   A Deliver · B Discipline · C Develop · D Discover  (mapping ตาม ois_model.zone — รอคุณปูลมยืนยัน) */
const ZONES = {
  A: { l: "Deliver", th: "Deliver — เปลี่ยนโอกาสเป็นผลลัพธ์", q: "A Amplified drive", c: "var(--ok)",
       d: "ภาษาของ CEO เน้นโอกาสสูงกว่าค่าเฉลี่ยฐานอ้างอิง และองค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุนสัญญาณนั้น" },
  B: { l: "Discipline", th: "Discipline — เติบโตอย่างมีหลักเกณฑ์", q: "B Constrained drive", c: "var(--ink-3)",
       d: "ภาษาของ CEO เน้นโอกาสสูง แต่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน — ประเด็นสำหรับหารือคือเกณฑ์อนุมัติ ทบทวน และหยุดโครงการ" },
  C: { l: "Develop", th: "Develop — ทบทวนฐานความพร้อม", q: "C Consistent restraint", c: "var(--serious)", g: 1,
       d: "ทั้งภาษาของ CEO และองค์ประกอบบอร์ดอยู่ด้านระมัดระวัง — คะแนนที่สูงมาจากความเข้ากัน (ผลคูณของค่าลบสองค่า) ไม่ใช่สัญญาณ open innovation" },
  D: { l: "Discover", th: "Discover — เปิดมุมมองโอกาส", q: "D Untapped board", c: "var(--ink-3)",
       d: "องค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุน แต่ภาษาของ CEO ยังไม่สะท้อนการบุก" },
};
const quadOf = (cP, amp) => cP >= 0 ? (amp >= 0 ? "A" : "B") : (amp >= 0 ? "D" : "C");
const zoneOf = (promo, amp) => quadOf(cpOf(promo), amp);

/* ตารางที่ 10 (เอกสารสมการ v2) · ข้อความบนแถบสถานะตาม tier × quadrant
   ค่า OI เฉลี่ยและ n คำนวณซ้ำจาก REF-928 ตอน build (OIS.t10) และตรวจแล้วว่าตรงกับเอกสาร */
const T10_TEXT = {
  "1A": ["สัญญาณ open innovation: เด่น", "ok"],
  "2A": ["สัญญาณ open innovation: มี", "ok"],
  "1C": ["ไม่ใช่สัญญาณ open innovation · tier สูงเพราะ CEO ระมัดระวังเข้ากับบอร์ด", "warn"],
  "2C": ["ไม่ใช่สัญญาณ open innovation · tier สูงเพราะ CEO ระมัดระวังเข้ากับบอร์ด", "warn"],
  "3B": ["CEO บุก แต่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน (ดูสัดส่วนกรรมการหญิงเทียบฐานอ้างอิง)", "mute"],
  "4B": ["CEO บุก แต่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน (ดูสัดส่วนกรรมการหญิงเทียบฐานอ้างอิง)", "mute"],
  "3D": ["บอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุน แต่ภาษาของ CEO ยังไม่สะท้อนการบุก", "mute"],
  "4D": ["บอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุน แต่ภาษาของ CEO ยังไม่สะท้อนการบุก", "mute"],
};
const T10 = Object.fromEntries(Object.entries(T10_TEXT).map(([k, [s, c]]) =>
  [k, { s, c, oi: (OIS.t10[k] || [0, 0])[0], n: (OIS.t10[k] || [0, 0])[1] }]));
const t10Of = (tier, quad) => T10[tier + quad] || { s: "สัญญาณใกล้ศูนย์ — ไม่สรุป (B ≈ 0)", c: "mute",
  oi: (OIS.t10["3C"] || [1, 1])[0], n: (OIS.t10["3C"] || [1, 1])[1] };
/** ตัวเลขมุมช่อง 2×2 — OI เฉลี่ยและ n ของแต่ละ quadrant ใน REF-928 */
const QN = OIS.qn;

/* E11 · ช่วง 90% ของ OpenInnoScore — Krinsky & Robb (1986) 500 ชุด
   θ^(r) ~ N(θ̂, V̂f) สร้างจาก Cholesky ของ V̂f ด้วย seed คงที่ เพื่อให้ผลซ้ำได้
   บริษัทในฐาน REF-928 ใช้ช่วงจากไฟล์ STATA โดยตรง (OIS.co[t].band); ค่าป้อนที่ผู้ใช้แก้คำนวณสดด้วยชุดเดียวกัน */
const KR = (() => {
  const L = OIS.chol, mu = [OPAR.b1, OPAR.dF, OPAR.dG, OPAR.dW];
  let s = OIS.seed % 2147483647 || 1;
  const u = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const nrm = () => { const a = Math.max(u(), 1e-12), b = u();
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
  const th = [];
  for (let r = 0; r < OIS.reps; r++) {
    const z = [nrm(), nrm(), nrm(), nrm()];
    th.push(mu.map((m, i) => m + L[i].slice(0, i + 1).reduce((t, v, k) => t + v * z[k], 0)));
  }
  return th;
})();
/** ฐานอ้างอิง 928 แถวที่ให้คะแนนใหม่ด้วย θ^(r) ของแต่ละรอบ — คิดครั้งเดียวตอนเปิดหน้า (lazy) */
let _krRef = null;
function krRef() {
  if (_krRef) return _krRef;
  const z = REF_PTS.map(p => ({ P: p[0] - OM.P, F: p[6], G: p[7], W: p[8] }));
  _krRef = KR.map(t => z.map(v => v.P * (t[0] + t[1] * v.F + t[2] * v.G + t[3] * v.W)).sort((a, b) => a - b));
  return _krRef;
}
/** [ขอบล่าง, ขอบบน] ของช่วง 90% สำหรับค่าป้อนชุดหนึ่ง */
function band90(promo, fam, pol, fem) {
  const v = cen(promo, fam, pol, fem), out = [], R = krRef();
  for (let r = 0; r < KR.length; r++) {
    const t = KR[r];
    out.push(midRank(R[r], v.P * (t[0] + t[1] * v.F + t[2] * v.G + t[3] * v.W)));
  }
  out.sort((a, b) => a - b);
  const q = p => out[Math.min(Math.floor(p * out.length), out.length - 1)];
  return [Math.round(q(.05) * 10) / 10, Math.round(q(.95) * 10) / 10];
}

/* E13 · ลำดับตรรกะสำหรับการแสดงผล — คืน tier, quadrant, แถบสถานะ, ป้ายเตือน, ธงสัญญาณ OI */
const REGIME = OIS.regime;                    // verdict รายปีจากตารางที่ 6 (PASS / CAUTION / FAIL)
const FY_SHOWN = 2023;
function verdictOf(c) {
  const inDomain = c.inDomain !== false && inDomainOf(c.ind);
  const quad = c.quad || zoneOf(c.promo, c.amp), tier = c.tier || tierOf(c.ipi);
  const bd = c.band || band90(c.promo, c.fam, c.pol, c.fem);
  const fy = c.fy || FY_SHOWN, reg = REGIME[fy];
  const chips = [];
  if (!inDomain) chips.push({ k: "นอกกลุ่มอ้างอิง — ไม่แสดง tier", t: "บริษัทนอกอุตสาหกรรม 1–7 หรือไม่มีสารถึงผู้ถือหุ้นภาษาอังกฤษ (R4)" });
  if (tierOf(bd[0]) !== tierOf(bd[1])) chips.push({ k: "tier ไม่แน่นอน", t: "ช่วง 90% คร่อมมากกว่าหนึ่ง tier (R8)" });
  if (reg === "FAIL") chips.push({ k: "Caution: ปีนี้ไม่ผ่านเกณฑ์ validity", t: `ปีบัญชี ${fy} verdict = FAIL ในตารางที่ 6 (R3)` });
  if (!reg) chips.push({ k: "ยังไม่ได้ validate", t: `ปีบัญชี ${fy} ยังไม่มีผลลัพธ์ปีถัดไปให้ตรวจ (R3)` });
  if (WEAK_IND.has(c.ind)) chips.push({ k: "หลักฐานอ่อนในอุตสาหกรรมนี้", t: "Spearman ไม่ต่างจากศูนย์ในอุตสาหกรรมนี้ (R5, ตารางที่ 8)" });
  const fn = femaleN(c.fem, c.bsize);
  if (fn !== null && fn < CRIT_N) chips.push({ k: `กรรมการหญิง ${fn} คน — ต่ำกว่า critical mass`, t: `งานวิจัยพบว่าความสัมพันธ์ของกรรมการหญิงกับการหนุนสัญญาณมีนัยเมื่อมี ≥ ${CRIT_N} คน (Table 4) บอร์ดที่มี 1–2 คนไม่ต่างจาก 0 คนอย่างมีนัย` });
  if (c.amp !== undefined && c.amp <= 0) chips.push({ k: "amp ≤ 0", t: "องค์ประกอบบอร์ดนี้อยู่ในรูปแบบที่ความชันของ promotion focus ไม่เป็นบวก — ภาษาเชิงรุกของ CEO ไม่สัมพันธ์กับ open innovation ที่สูงขึ้นในบอร์ดลักษณะนี้" });
  if (c.clipped && c.clipped.length) chips.push({ k: "ค่าป้อนถูก clip", t: "ค่า " + c.clipped.join(", ") + " อยู่นอกช่วง p5–p95 ของฐานอ้างอิง จึงถูกแทนด้วยจุดตัดก่อนเข้าสูตร (E2)" });
  return { tier, quad, band: bd, chips, regime: reg, inDomain, fy,
           st: t10Of(tier, quad),
           flag: inDomain && quad === "A" && bd[0] >= 50 && reg !== "FAIL" };
}
/** รายชื่อตัวแปรที่ค่าป้อนถูก clip (C5) */
const clippedOf = c => [["promo", "P", "CEO Promotion Focus"], ["fam", "F", "กรรมการครอบครัว"], ["fem", "W", "กรรมการหญิง"]]
  .filter(([k, kk]) => clipped(c[k], kk)).map(x => x[2]);

/* ค่าที่คิดไว้ตอน build จาก ois_model.json — ไม่ให้ต้นแบบคิดใหม่ทุกครั้งที่เปิดหน้า */
COMPS.forEach(c => {
  const o = OIS.co[c.t]; if (!o) return;
  c.cP = o.cP; c.cF = o.cF; c.cG = o.cG; c.cW = o.cW;
  c.amp = o.amp; c.B = o.B; c.ois = o.ois; c.oisInd = o.oisInd;
  c.tier = o.tier; c.quad = o.quad; c.band = o.band; c.fy = o.fy; c.t1 = o.t1;
  c.ipi = Math.round(o.ois);              // คะแนนที่หน้าจอทุกหน้าใช้ = OpenInnoScore
  c.dp = promoPct(c.promo);               // ceo_drive_pct
  c.ap = ampPct(o.amp);                   // board_amp_pct
  c.iip = Math.round(o.oisInd);
  c.clipped = clippedOf(c);
});

const IPI_ALL = COMPS.map(c => c.ipi).sort((a, b) => a - b);
const qstats = arr => {
  const a = [...arr].sort((x, y) => x - y), q = p => {
    const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return a[lo] + (a[hi] - a[lo]) * (i - lo);
  };
  return { min: a[0], q1: q(.25), med: q(.5), q3: q(.75), max: a[a.length - 1] };
};
const indComps = i => COMPS.filter(c => c.ind === i);

/* ---------------------------------------------------------------- ตัวช่วยข้อความ (ไม่แตะคณิตศาสตร์ด้านบน) */
/** C4 · ป้ายสั้นต่อท้ายสัดส่วนกรรมการหญิง — นับคนเมื่อรู้จำนวนกรรมการทั้งหมด */
function critNote(c) {
  const fn = femaleN(c.fem, c.bsize);
  if (fn === null) return "";
  return ` (${fn} คน${fn < CRIT_N ? " · ต่ำกว่า critical mass" : " · ถึง critical mass"})`;
}
/** C4 · ประโยคเต็มเรื่อง critical mass สำหรับใส่ในหมายเหตุ */
function critText(c) {
  const fn = femaleN(c.fem, c.bsize);
  if (fn === null) return `ความสัมพันธ์ของกรรมการหญิงกับการหนุนสัญญาณมีหลักฐานรองรับเมื่อมี ≥ ${CRIT_N} คน (นับคน ไม่ใช่สัดส่วน · Table 4) — ระบุจำนวนกรรมการทั้งหมดใน Zone A เพื่อตรวจ critical mass`;
  return fn < CRIT_N
    ? `บอร์ดนี้มีกรรมการหญิง ${fn} คน — ต่ำกว่า critical mass (≥ ${CRIT_N} คน, Table 4) ความสัมพันธ์ที่สูตรใช้จึงยังไม่มีหลักฐานรองรับในช่วงนี้ บอร์ดที่มี 1–2 คนไม่ต่างจาก 0 คนอย่างมีนัย`
    : `บอร์ดนี้มีกรรมการหญิง ${fn} คน — ถึง critical mass (≥ ${CRIT_N} คน, Table 4) ซึ่งเป็นช่วงที่ความสัมพันธ์มีหลักฐานรองรับ`;
}
/** ป้ายกำกับตัวเลข "+X จุด" ทุกครั้งที่แสดง — ตามกติกา R7 */
const ASSOC = "ตามสูตร (เชิงความสัมพันธ์)";
/** สูตรที่แถบสถานะกำลังแสดง — "EG" หลัก หรือ "T1" shadow (ป้าย Caution) */
const useT1 = () => S.pilotFormula === "T1";

/* ---------------------------------------------------------------- 2 · สถานะ */
/* กติกาตามเอกสารแก้ไขครั้งที่ 1
   รายงานบริษัทของตัวเองฟรี · บริษัทอื่น 1 token · เทียบคู่แข่ง 1 · รายงานอุตสาหกรรม 3
   What-if Studio และ Validity ฉบับเต็มเป็นสิทธิ์ของผู้ใช้ Pro · ซื้อขั้นต่ำ 3 token */
const PRICE = { peer: 1, report: 1, sector: 3, studio: 1, ceotext: 1 };
const PACK_MIN = 3;
const PLAN_TOKENS = { free: 3, pro: 20 };
const PACKS = [
  { n: 3, baht: 390, tag: "ขั้นต่ำ" },
  { n: 10, baht: 1190, tag: "คุ้มที่สุด", save: 9 },
  { n: 25, baht: 2490, tag: "สำหรับทีม", save: 24 },
];
const S = {
  user: null, credits: 3, freeCo: null,      // บริษัทที่ดูฟรีได้ตลอด (บริษัทของผู้ใช้เอง)
  plan: "free",                              // free | pro — Pro เปิด What-if Studio และ Validity ฉบับเต็ม
  ov: {},                                    // ค่าที่ผู้ใช้แก้เองใน Zone A { PTG: { fem: .3 } }
  lang: "EN", tone: "search",                // ภาษาและโทนของข้อความใน Zone B และ C
  cons: { sizeFixed: true, fem30: false, fam25: false },
  horizon: "12m", priority: "max",
  unlocked: {},                              // { "peer:PTG": true, ... }
  sectors: {},                               // อุตสาหกรรมที่ซื้อแล้ว
  log: [],                                   // ประวัติการใช้ token
  ind: "all", t: "PTG",
  peers: [], wi: null, ceo: null,
  pilotFormula: "EG",                        // สูตรที่แถบสถานะแสดง: "EG" (หลัก) | "T1" (shadow · ป้าย Caution) — สลับได้ในหน้าสถาปัตยกรรม
  view: "profile",
};
const LS = "boardsignal_demo_v1";
function save() { try { localStorage.setItem(LS, JSON.stringify({ u: S.user, c: S.credits, f: S.freeCo, k: S.unlocked, s: S.sectors,
    l: S.log.slice(0, 40), m: document.body.dataset.mode,
    pl: S.plan, ov: S.ov, lg: S.lang, tn: S.tone, cs: S.cons, hz: S.horizon, pr: S.priority, vw: S.view,
    pf: S.pilotFormula, sh: document.body.classList.contains("sidehid"), sc: S.sc || {} })); } catch (e) { } }
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null"); if (!o) return null;
    Object.assign(S, { user: o.u, credits: o.c ?? 3, freeCo: o.f ?? null, unlocked: o.k || {}, sectors: o.s || {}, log: o.l || [],
      plan: o.pl || "free", ov: o.ov || {}, lang: o.lg || "EN", tone: o.tn || "search",
      cons: o.cs || { sizeFixed: true, fem30: false, fam25: false }, horizon: o.hz || "12m", priority: o.pr || "max",
      view: o.vw || "profile", pilotFormula: o.pf === "T1" ? "T1" : "EG", sc: o.sc || {} });
    if (o.m) document.body.dataset.mode = o.m;
    document.body.classList.toggle("sidehid", !!o.sh);
    return o.u;
  } catch (e) { return null; }
}
/** ค่า promotion focus ที่ตรงกับเปอร์เซ็นไทล์ — ใช้ย้อนกลับจากคะแนนภาษาเป็นค่าดิบ
 *  เพื่อให้แผนภาพน้ำตกกับคะแนนรวมมาจากชุดตัวเลขเดียวกันเสมอ */
function promoAtPct(dp) { const a = REF_PROMO, n = a.length; return a[clamp(Math.round(dp / 100 * n) - 1, 0, n - 1)]; }
/* ค่าที่ผู้ใช้แก้เองได้ใน Zone A
   fem / fam / pol / dp — เข้าสูตรโดยตรง · bsize = จำนวนกรรมการทั้งหมด (ใช้ตรวจ critical mass เท่านั้น)
   pRaw = ค่า promotion % จาก LIWC-22 ที่กรอกตรง (มีน้ำหนักเหนือ dp) · ten เก็บไว้เป็นบริบท ไม่มีผลต่อคะแนน (δT = 0) */
const OV_FIELDS = ["fem", "fam", "pol", "ten", "dp", "bsize", "pRaw"];
/** สูตรทางเลือก B_T1 ของบริษัทหนึ่ง (shadow log · ป้าย Caution) — คิดสดจากค่าป้อนชุดเดียวกับสูตรหลัก */
function t1Of(c) {
  const cP = c.cP !== undefined ? c.cP : cpOf(c.promo), a1 = ampT1(c.fem), B = cP * a1, ois = oisT1Of(B);
  return { B, ois, tier: tierOf(ois), quad: quadOf(cP, a1) };
}
/** บริษัทที่กำลังดู — ผสมค่าที่ผู้ใช้แก้เองใน Zone A แล้วคิด amp / dp / OIS ใหม่ทั้งชุด */
function coOf(t) {
  t = t || S.t;
  const b = byT[t], o = (S.ov || {})[t] || {};
  if (!OV_FIELDS.some(k => o[k] !== undefined)) return b;
  const m = Object.assign({}, b);
  ["fem", "fam", "pol", "ten", "bsize"].forEach(k => { if (o[k] !== undefined) m[k] = o[k]; });
  let dp = o.dp !== undefined ? o.dp : b.dp;
  if (o.pRaw !== undefined && !isNaN(o.pRaw)) {       // ค่า LIWC-22 ที่กรอกตรง มีน้ำหนักเหนือตัวเลื่อน dp
    m.promo = +o.pRaw; m.pRaw = +o.pRaw; dp = promoPct(m.promo);
  } else if (dp !== b.dp) m.promo = promoAtPct(dp);
  else m.promo = b.promo;
  m.amp = ampOf(m.fam, m.pol, m.fem, m.ten);          // ten ไม่เข้าสูตร — evidence gate g_T = 0
  m.cP = cpOf(m.promo);
  m.B = m.cP * m.amp;
  m.ois = oisOf(m.B);
  m.oisInd = oisIndOf(m.B, m.ind);
  m.ap = ampPct(m.amp);
  m.dp = dp;
  m.ipi = Math.round(m.ois);
  m.iip = Math.round(m.oisInd);
  m.tier = tierOf(m.ois);
  m.quad = quadOf(m.cP, m.amp);
  m.band = band90(m.promo, m.fam, m.pol, m.fem);
  m.clipped = clippedOf(m);
  m.t1 = t1Of(m);
  m.edited = true;
  return m;
}
const isEdited = t => { const o = (S.ov || {})[t || S.t] || {}; return OV_FIELDS.some(k => o[k] !== undefined); };
const cur = () => coOf(S.t);
const keyOf = (what, t) => what + ":" + (t || S.t);
function isUnlocked(what, t) {
  t = t || S.t;
  if (what === "studio" || what === "ceotext") return S.plan === "pro";   // What-if Studio เป็นสิทธิ์ของ Pro
  if (what === "report") return S.freeCo === t || !!S.unlocked[keyOf("report", t)];
  if (what === "sector") return !!S.sectors[t];
  return !!S.unlocked[keyOf(what, t)];
}
/** ใช้ token — คืน true ถ้าปลดล็อกสำเร็จ */
function spend(what, t, label) {
  t = t || S.t;
  if (what === "studio" || what === "ceotext") {          // เป็นสิทธิ์ของแผน ไม่ใช่ของ token
    toast("What-if Studio เป็นสิทธิ์ของแผน Pro — เปลี่ยนแผนก่อน");
    return false;
  }
  const cost = PRICE[what] || 1;
  if (S.credits < cost) { go("billing"); toast("token ไม่พอ — เหลือ " + S.credits + " token ต้องใช้ " + cost); return false; }
  S.credits -= cost;
  if (what === "sector") S.sectors[t] = true; else S.unlocked[keyOf(what, t)] = true;
  S.log.unshift({ what, t, cost, label: label || "", at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) });
  save(); syncChrome(); toast("ปลดล็อกแล้ว · ใช้ " + cost + " token · เหลือ " + S.credits);
  return true;
}
let toastT;
function toast(msg) {
  let e = $("#toast");
  if (!e) { e = document.createElement("div"); e.id = "toast"; document.body.appendChild(e); }
  e.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:300;background:var(--nav);color:#fff;padding:10px 18px;border-radius:99px;font-size:12.5px;box-shadow:var(--shadow);transition:.2s;opacity:1";
  e.textContent = msg;
  clearTimeout(toastT); toastT = setTimeout(() => { e.style.opacity = "0"; }, 2600);
}

/* ---------------------------------------------------------------- เมนู */
const NAV = [
  { id: "profile", g: 1, ico: "⌂", lab: "Company Profile" },
  { id: "fit", g: 1, ico: "◎", lab: "รายงานวินิจฉัย", lock: "report" },
  { id: "matrix", g: 1, ico: "⊞", lab: "เมทริกซ์ 2×2" },
  { id: "peer", g: 1, ico: "⇄", lab: "เทียบคู่แข่ง", lock: "peer" },
  { id: "studio", g: 1, ico: "⚗", lab: "What-if Studio", lock: "studio" },
  { id: "sector", g: 2, ico: "▦", lab: "ภาพรวมอุตสาหกรรม", lock: "sector" },
  { id: "billing", g: 2, ico: "◈", lab: "Token และการชำระเงิน" },
  { id: "arch", g: 3, ico: "⌗", lab: "สถาปัตยกรรมข้อมูล" },
  { id: "valid", g: 3, ico: "✓", lab: "หลักฐานความแม่น" },
];
function buildNav() {
  [1, 2, 3, 4].forEach(g => {
    if (!$("#nav" + g)) return;
    $("#nav" + g).innerHTML = NAV.filter(n => n.g === g).map(n =>
      `<button data-v="${n.id}"><span class="ico">${n.ico}</span><span>${n.lab}</span>` +
      `<span class="lockb" data-lockfor="${n.lock || ""}"></span></button>`).join("");
  });
  $$(".nav button").forEach(b => b.onclick = () => go(b.dataset.v));
}
function syncNavLocks() {
  $$(".nav button").forEach(b => {
    const n = NAV.find(x => x.id === b.dataset.v), tag = b.querySelector(".lockb");
    b.setAttribute("aria-current", b.dataset.v === S.view ? "page" : "false");
    if (!n.lock) { tag.textContent = ""; tag.style.display = "none"; return; }
    const t = n.lock === "sector" ? S.ind : S.t;
    const ok = n.lock === "sector" ? (S.ind !== "all" && isUnlocked("sector", S.ind)) : isUnlocked(n.lock, t);
    tag.style.display = "";
    tag.textContent = ok ? "เปิดแล้ว"
      : (n.lock === "studio" || n.lock === "ceotext") ? "Pro"
        : (n.lock === "report" && !S.freeCo ? "ฟรี" : "🔒");
  });
}
function go(v) {
  if (!$("#v-" + v)) return;
  S.view = v;
  $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  $("#v-" + v).classList.add("fadein");
  setTimeout(() => $("#v-" + v).classList.remove("fadein"), 320);
  syncNavLocks(); render(); window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------------------------------------------------------- แถบบน */
function syncChrome() {
  const bn = "OpenInnoScore";
  ["#sBrand", "#gBrand", "#fBrand"].forEach(s => { const e = $(s); if (e) e.textContent = bn; });
  $("#chipCredit").innerHTML = `<span aria-hidden="true">◈</span> token <b>${S.credits}</b>`;
  const c = cur(), z = ZONES[zoneOf(c.promo, c.amp)];
  $("#chipZone").innerHTML = `<span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span> ${z.l} · OIS <b>${c.ipi}</b>`;
  $("#sUser").textContent = S.user || "";
  $("#sPlan").textContent = `token คงเหลือ ${S.credits} · ${Object.keys(S.sectors).length} อุตสาหกรรมที่ซื้อแล้ว`;
  syncNavLocks();
}
function fillSelectors() {
  $("#selInd").innerHTML = `<option value="all">ทุกอุตสาหกรรม (${Object.keys(IND).length} กลุ่ม)</option>` +
    Object.entries(IND).map(([k, v]) => `<option value="${k}">${esc(v)} · ${indComps(+k).length} บริษัท</option>`).join("");
  $("#selInd").value = S.ind;
  fillCompanies();
}
function fillCompanies() {
  const list = (S.ind === "all" ? COMPS : indComps(+S.ind)).slice().sort((a, b) => b.ipi - a.ipi);
  $("#selCo").innerHTML = list.map(c => `<option value="${c.t}">${esc(c.t)} · ${esc(c.n)}</option>`).join("");
  if (!list.some(c => c.t === S.t)) S.t = list[0].t;
  $("#selCo").value = S.t;
}

/* ---------------------------------------------------------------- คำแนะนำเครื่องมือ */
const TT = $("#tt");
function tipOn(el, html) {
  el.addEventListener("mousemove", e => {
    TT.innerHTML = html(el); TT.classList.add("on");
    const r = TT.getBoundingClientRect();
    TT.style.left = Math.min(e.clientX + 14, innerWidth - r.width - 10) + "px";
    TT.style.top = Math.max(8, e.clientY - r.height - 12) + "px";
  });
  el.addEventListener("mouseleave", () => TT.classList.remove("on"));
}

/* ============================================================================
   องค์ประกอบกราฟ — เขียนเป็น SVG ล้วน ไม่พึ่งไลบรารีภายนอก
   กติกาที่ใช้ทั้งไฟล์
     · เส้นบาง ปลายแท่งมน 4px · ช่องว่าง 2px ระหว่างแท่งที่ติดกัน
     · scatter ใช้สีจำแนกได้ไม่เกิน 3 สี (ผ่านการตรวจ all-pairs) บริษัทหลักใช้รูปทรงต่างแทนสี
     · ตัวเลขและป้ายใช้สีตัวอักษรเสมอ ไม่ใช้สีของชุดข้อมูล
   ============================================================================ */
const SER = ["var(--s1)", "var(--s2)", "var(--s3)"];
const RAMP = ["var(--q1)", "var(--q2)", "var(--q3)", "var(--q4)", "var(--q5)", "var(--q6)"];
const rampAt = p => RAMP[clamp(Math.floor(p / 100 * RAMP.length), 0, RAMP.length - 1)];

/** เกจครึ่งวงกลม — ตัวเลขอยู่ใต้ส่วนโค้ง ไม่ทับกันเหมือนต้นแบบเดิม */
function gauge(v, sub, marker) {
  const W = 230, H = 132, cx = W / 2, cy = 116, r = 92;
  const pt = (val) => { const a = Math.PI * (1 - clamp(val, 0, 100) / 100); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const arc = (from, to) => {
    const [x0, y0] = pt(from), [x1, y1] = pt(to);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const segs = RAMP.map((c, i) => {
    const a = i / RAMP.length * 100, b = (i + 1) / RAMP.length * 100;
    return `<path d="${arc(a + (i ? .6 : 0), b)}" fill="none" stroke="${c}" stroke-width="9" opacity="${v >= a ? 1 : .22}"/>`;
  }).join("");
  const [mx, my] = pt(v);
  const [kx, ky] = marker !== undefined ? pt(marker) : [0, 0];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:230px;display:block;margin:0 auto" role="img" aria-label="คะแนน ${v} จาก 100">
    ${segs}
    ${marker !== undefined ? `<line x1="${kx}" y1="${ky}" x2="${cx + (kx - cx) * .87}" y2="${cy + (ky - cy) * .87}" stroke="var(--ink-3)" stroke-width="2"/>` : ""}
    <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="7" fill="var(--panel)" stroke="var(--ink)" stroke-width="3"/>
    <text x="6" y="${cy + 12}" font-size="9.5" fill="var(--ink-3)">0</text>
    <text x="${W - 6}" y="${cy + 12}" font-size="9.5" fill="var(--ink-3)" text-anchor="end">100</text>
    <text x="${cx}" y="${cy - 16}" text-anchor="middle" font-size="40" font-weight="500" fill="var(--ink)" letter-spacing="-1.5">${v}</text>
    <text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)">${esc(sub || "/ 100")}</text>
    <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="9" fill="var(--ink-3)">เปอร์เซ็นไทล์ · ไม่ใช่ความน่าจะเป็น</text>
  </svg>`;
}

/** แถบแสดงตำแหน่งในการกระจายตัว — จุดคือบริษัทนี้ เส้นคือค่ากลางตลาด
 *  ใช้ viewBox กว้างและคง aspect ratio ไว้ ไม่งั้นจุดวงกลมจะถูกยืดเป็นวงรี */
function strip(v, arr, opt = {}) {
  const W = 600, H = 26, st = qstats(arr);
  const X = x => clamp(x, 0, 100) / 100 * W;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" style="display:block" role="img" aria-label="ตำแหน่ง ${v} ในการกระจายตัว">
    <rect x="0" y="10" width="${W}" height="6" rx="3" fill="var(--panel-2)"/>
    <rect x="${X(st.q1).toFixed(1)}" y="8" width="${(X(st.q3) - X(st.q1)).toFixed(1)}" height="10" rx="4" fill="${opt.box || "var(--q2)"}"/>
    <line x1="${X(st.med).toFixed(1)}" y1="5" x2="${X(st.med).toFixed(1)}" y2="21" stroke="var(--ink-3)" stroke-width="1.5"/>
    <g transform="translate(${X(v).toFixed(1)},13)">
      <circle r="7" fill="var(--panel)"/><circle r="4.6" fill="${opt.dot || "var(--ink)"}"/>
    </g></svg>`;
}

/** แถวแท่งแนวนอน — ปลายมน มีช่องว่างระหว่างแท่ง ป้ายตัวเลขนอกแท่ง */
function bars(rows, opt = {}) {
  const mx = Math.max(...rows.map(r => Math.abs(r.v)), opt.max || 0, 1) * 1.02;
  return rows.map(r => `<div class="rowbar" style="--lw:${opt.lw || 150}px">
    <div style="${r.hl ? "font-weight:500" : ""};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.l)}">${r.pre || ""}${esc(r.l)}</div>
    <div class="mbar" style="height:${opt.h || 9}px"><span style="width:${Math.abs(r.v) / mx * 100}%;background:${r.c || "var(--q4)"}"></span></div>
    <div class="n" style="${r.hl ? "font-weight:500" : "color:var(--ink-2)"}">${r.t !== undefined ? r.t : fmt(r.v, opt.dec ?? 0)}</div>
  </div>`).join("");
}

/** กล่องควอไทล์แนวนอน */
function boxplot(arr, v, label, w = 560) {
  const st = qstats(arr), H = 52, pad = 26, W = w;
  const X = x => pad + clamp(x, 0, 100) / 100 * (W - pad * 2);
  const y = 26;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block" role="img" aria-label="${esc(label)}">
    <line x1="${X(st.min)}" y1="${y}" x2="${X(st.max)}" y2="${y}" stroke="var(--line)" stroke-width="2"/>
    <line x1="${X(st.min)}" y1="${y - 6}" x2="${X(st.min)}" y2="${y + 6}" stroke="var(--ink-3)"/>
    <line x1="${X(st.max)}" y1="${y - 6}" x2="${X(st.max)}" y2="${y + 6}" stroke="var(--ink-3)"/>
    <rect x="${X(st.q1)}" y="${y - 11}" width="${X(st.q3) - X(st.q1)}" height="22" rx="4" fill="var(--q2)" opacity=".8" stroke="var(--q4)" stroke-width="1"/>
    <line x1="${X(st.med)}" y1="${y - 11}" x2="${X(st.med)}" y2="${y + 11}" stroke="var(--ink)" stroke-width="2"/>
    <g transform="translate(${X(v)},${y})"><circle r="8.5" fill="var(--panel)"/><path d="M0-6 6 0 0 6-6 0Z" fill="var(--ink)"/></g>
    <text x="${pad}" y="${H - 2}" font-size="9.5" fill="var(--ink-3)">0</text>
    <text x="${X(50)}" y="${H - 2}" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">50</text>
    <text x="${W - pad}" y="${H - 2}" font-size="9.5" fill="var(--ink-3)" text-anchor="end">100</text>
    <text x="${pad}" y="10" font-size="10" fill="var(--ink-2)">${esc(label)}</text></svg>`;
}

/** เรดาร์องค์ประกอบบอร์ด — ปรับสเกลรายแกนด้วยเปอร์เซ็นไทล์ 5–95 ของทั้งตลาด
 *  จึงไม่กลายเป็นเส้นแหลมเหมือนการหารด้วยค่าสูงสุดตรง ๆ */
const RADAR_AX = [
  { k: "fem", l: "กรรมการหญิง", f: c => c.fem },
  { k: "pol", l: "สายการเมือง", f: c => c.pol },
  { k: "famInv", l: "ไม่ผูกครอบครัว", f: c => 1 - c.fam },
  { k: "promo", l: "CEO Promotion Focus", f: c => c.promo },
];   // อายุงานบอร์ดไม่อยู่ในเรดาร์ — ไม่มีผลต่อคะแนน (δT = 0, evidence gate)
const RADAR_SCALE = RADAR_AX.map(a => {
  const v = COMPS.map(a.f).sort((x, y) => x - y);
  const q = p => v[clamp(Math.round((v.length - 1) * p), 0, v.length - 1)];
  return { lo: q(.05), hi: q(.95) };
});
function radar(c, cmp, cmpLabel) {
  const R = 70, cx = 152, cy = 100, n = RADAR_AX.length;
  const norm = (co, i) => clamp((RADAR_AX[i].f(co) - RADAR_SCALE[i].lo) / ((RADAR_SCALE[i].hi - RADAR_SCALE[i].lo) || 1), .04, 1);
  const P = (i, t) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + R * t * Math.cos(a), cy + R * t * Math.sin(a)]; };
  const poly = co => RADAR_AX.map((_, i) => P(i, norm(co, i)).map(x => x.toFixed(1)).join(",")).join(" ");
  const rings = [.25, .5, .75, 1].map(t =>
    `<polygon points="${RADAR_AX.map((_, i) => P(i, t).map(x => x.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join("");
  const labs = RADAR_AX.map((a, i) => {
    const [x, y] = P(i, 1.3);
    const anc = Math.abs(x - cx) < 12 ? "middle" : x > cx ? "start" : "end";
    return `<text x="${x.toFixed(0)}" y="${(y + 3).toFixed(0)}" font-size="9.5" fill="var(--ink-3)" text-anchor="${anc}">${a.l}</text>`;
  }).join("");
  return `<svg viewBox="0 0 304 212" width="100%" style="max-width:304px;display:block;margin:0 auto" role="img" aria-label="องค์ประกอบบอร์ด">
    ${rings}${labs}
    ${cmp ? `<polygon points="${poly(cmp)}" fill="none" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="4 3"/>` : ""}
    <polygon points="${poly(c)}" fill="var(--s1)" fill-opacity=".18" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>
    ${RADAR_AX.map((_, i) => { const [x, y] = P(i, norm(c, i)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="var(--s1)" stroke="var(--panel)" stroke-width="2"/>`; }).join("")}
  </svg>
  <div class="legend" style="justify-content:center">
    <span><i style="background:var(--s1)"></i>${esc(c.t)}</span>
    ${cmp ? `<span><i style="background:var(--ink-3)"></i>${esc(cmpLabel || "ค่าเฉลี่ยอุตสาหกรรม")}</span>` : ""}</div>`;
}

/* ============================================================================
   ผนังจ่ายเงิน — คลุมทับเนื้อหาที่ยังไม่ปลดล็อก
   ============================================================================ */
function paywall(inner, what, title, body, cost, tag) {
  return `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${inner}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:64px"><div class="paycard">
      <div class="lk">🔒</div>
      <h3 style="font-size:16px;margin-bottom:5px">${esc(title)}</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-unlock="${what}">ปลดล็อก · ใช้ ${cost} token</button>
        <button class="btn s" data-goto="billing">ดูแพ็กเกจ token</button>
      </div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">
        คุณมี <b style="color:var(--ink)">${S.credits}</b> token${tag ? " · " + tag : ""}</div>
    </div></div></div>`;
}
/** ผนังสำหรับฟีเจอร์ที่เป็นสิทธิ์ของแผน Pro — ปลดด้วย token ไม่ได้ ต้องเปลี่ยนแผน */
function prowall(inner, title, body) {
  return `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${inner}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:64px"><div class="paycard">
      <div class="lk">◈</div>
      <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:500;margin-bottom:4px">สิทธิ์ของแผน Pro</div>
      <h3 style="font-size:16px;margin-bottom:5px">${esc(title)}</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-pro="1">เปลี่ยนเป็นแผน Pro</button>
        <button class="btn s" data-goto="billing">ดูรายละเอียดแผน</button>
      </div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px;line-height:1.6">
        หน้านี้<b style="color:var(--ink)">ใช้ token ปลดไม่ได้</b> — เป็นสิทธิ์ที่ผูกกับแผน<br>
        ต้นแบบยังไม่เชื่อมระบบชำระเงิน จึงสลับแผนได้ทันทีเพื่อสาธิต</div>
    </div></div></div>`;
}
/** สลับเป็นแผน Pro (ต้นแบบ) — เติม token ให้ครบโควตา Pro ถ้ายังไม่ถึง */
function goPro() {
  if (S.plan === "pro") return;
  S.plan = "pro";
  if (S.credits < PLAN_TOKENS.pro) S.credits = PLAN_TOKENS.pro;
  save(); syncChrome(); syncNavLocks();
  toast("เปลี่ยนเป็นแผน Pro แล้ว · token " + S.credits);
}
function wireActions(root) {
  root.querySelectorAll("[data-unlock]").forEach(b => b.onclick = () => {
    const w = b.dataset.unlock;
    if (spend(w, w === "sector" ? S.ind : S.t, w === "sector" ? IND[S.ind] : cur().t)) render();
  });
  root.querySelectorAll("[data-pro]").forEach(b => b.onclick = () => { goPro(); render(); });
  root.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => go(b.dataset.goto));
  root.querySelectorAll("[data-co]").forEach(b => b.onclick = () => {
    S.t = b.dataset.co; S.peers = []; $("#selCo").value = S.t; syncChrome(); go("fit");
  });
}

/* ============================================================================
   หน้า 1 · รายงานวินิจฉัย
   ============================================================================ */
function viewFit() {
  const c = cur(), z = ZONES[zoneOf(c.promo, c.amp)], vd = verdictOf(c);
  const ist = DATA.indstats[c.ind], peers = indComps(c.ind).sort((a, b) => b.ipi - a.ipi);
  const rank = peers.findIndex(x => x.t === c.t) + 1;
  const indAvg = { fem: ist.fem, pol: ist.pol, fam: ist.fam, ten: ist.ten, promo: ist.promo };
  const medIPI = qstats(IPI_ALL).med;

  const body = `
  <div class="grid g-side">
    <div class="stack">
      <div class="card" style="text-align:center">
        <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">OpenInnoScore</div>
        ${gauge(c.ipi, "เปอร์เซ็นไทล์ในฐานอ้างอิง", medIPI)}
        <div style="display:inline-flex;align-items:center;gap:7px;margin-top:6px;padding:5px 13px;border-radius:99px;border:1px solid ${z.c};color:${z.c};font-size:12.5px">
          <span style="width:8px;height:8px;border-radius:99px;background:${z.c}"></span>${z.l}</div>
        <div style="font-size:11px;color:var(--ink-2);margin-top:7px">Tier ${vd.tier} · ช่วง 90% ${fmt(vd.band[0], 1)}–${fmt(vd.band[1], 1)}</div>
        <div style="font-size:10.5px;color:var(--ink-3);margin-top:3px">เส้นสีเทาบนเกจ = ค่ากลางฐานอ้างอิง (${fmt(medIPI)})</div>
        <div class="grid g3 tight" style="margin-top:15px;gap:8px;text-align:center">
          ${[[c.dp, "CEO Promotion Focus", "เปอร์เซ็นไทล์"], [ampPct(c.amp), "Board Amplification Signal", "เปอร์เซ็นไทล์"], [fmt(c.oisInd ?? c.iip, 0), "OIS ในอุตสาหกรรม", "อันดับ #" + rank + " จาก " + peers.length]]
      .map(([v, k, u]) => `<div><div style="font-size:21px;font-weight:500;letter-spacing:-.02em">${v}</div>
              <div style="font-size:10.5px;color:var(--ink-2);line-height:1.35">${k}</div>
              <div style="font-size:9.5px;color:var(--ink-3)">${u}</div></div>`).join("")}
        </div>
      </div>

      <div class="card">
        <h3>องค์ประกอบบอร์ด</h3>
        <p class="desc">แต่ละแกนปรับสเกลด้วยเปอร์เซ็นไทล์ 5–95 ของทั้งตลาด · เป็นภาพเทียบตำแหน่งกับค่าเฉลี่ยอุตสาหกรรม ไม่ใช่ลำดับความสำคัญ</p>
        ${radar(c, indAvg)}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
          ${[["กรรมการหญิง", pct1(c.fem) + critNote(c), pct1(ist.fem), c.fem >= ist.fem ? "ok" : "warn", c.fem >= ist.fem ? "▲" : "▼"],
      ["กรรมการครอบครัว (บริบท)", pct1(c.fam), pct1(ist.fam), "mute", "·"],
      ["สายการเมือง (บริบท)", c.pol ? "มี" : "ไม่มี", ist.pol >= .5 ? "ส่วนใหญ่มี" : "ส่วนใหญ่ไม่มี", "mute", "·"],
      ["อายุงานเฉลี่ยบอร์ด (บริบท · ไม่มีผลต่อคะแนน)", fmt(c.ten, 1) + " ปี", fmt(ist.ten, 1) + " ปี", "mute", "·"]]
      .map(([l, v, m, cls, ar]) => `<span class="pill ${cls}" style="font-size:10.5px">
              <span aria-hidden="true">${ar}</span>${l} ${v} <span style="opacity:.7">(อุตฯ ${m})</span></span>`).join("")}
        </div>
      </div>
    </div>

    <div class="stack">
      <div class="card">
        <h3><span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span>การวินิจฉัย · ${z.th}</h3>
        <p style="font-size:13.5px;color:var(--ink);margin:8px 0 15px;line-height:1.7">${z.d}</p>
        ${bars([
        { l: "CEO Promotion Focus · เปอร์เซ็นไทล์", v: c.dp, t: c.dp + " / 100", c: rampAt(c.dp), hl: 1 },
        { l: "Board Amplification Signal · เปอร์เซ็นไทล์", v: ampPct(c.amp), t: ampPct(c.amp) + " / 100", c: rampAt(ampPct(c.amp)), hl: 1 },
      ], { lw: 175, h: 11 })}
        <div class="note brand" style="margin-top:13px">
          <b>B = cP × amp</b> — cP ${fmt(c.cP ?? cpOf(c.promo), 3)} × amp ${fmt(c.amp, 3)} = ${fmt(c.B ?? (cpOf(c.promo) * c.amp), 4)}
          · exp(B) = ${fmt(Math.exp(c.B ?? (cpOf(c.promo) * c.amp)), 3)} เท่าของบริษัทที่ CEO อยู่ที่ค่าเฉลี่ยฐานอ้างอิง
          (${fmt(100 * (Math.exp(c.B ?? (cpOf(c.promo) * c.amp)) - 1), 1)}%) ${ASSOC} แล้วแปลงเป็นเปอร์เซ็นไทล์ได้ OpenInnoScore ${c.ipi}
          <br><span style="color:var(--ink-2)">คะแนนเป็นผลคูณ ไม่ใช่ค่าเฉลี่ย — จึงเป็นบวกได้ทั้งเมื่อทั้งสองค่าเป็นบวกและเมื่อทั้งสองค่าเป็นลบ จึงต้องอ่านคู่กับ quadrant เสมอ</span></div>
        <div style="margin-top:13px">${statusBar(c)}</div>
      </div>

      <div class="card">
        <h3>ภาษาผู้นำ — Promotion Focus</h3>
        <p class="desc">สัดส่วนคำเชิงรุกในสารผู้บริหาร วัดด้วยพจนานุกรมแบบ LIWC · ยิ่งสูงยิ่งสื่อถึงการมองไปข้างหน้าและการแสวงหาโอกาส</p>
        <div class="grid g3 tight" style="gap:9px">
          ${[[fmt(c.promo, 2), "บริษัทนี้", "var(--ink)"], [fmt(ist.promo, 2), "ค่าเฉลี่ยอุตสาหกรรม", "var(--ink-2)"], [fmt(OM.P, 2), "ค่าเฉลี่ยฐานอ้างอิง", "var(--ink-2)"]]
      .map(([v, k, col]) => `<div class="stat" style="background:var(--panel-2);padding:11px 13px">
              <div class="v num" style="font-size:22px;color:${col}">${v}</div><div class="k" style="margin:2px 0 0">${k}</div></div>`).join("")}
        </div>
        <div style="margin-top:13px">${strip(c.dp, COMPS.map(x => x.dp))}</div>
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3)">
          <span>ต่ำสุดของตลาด</span><span>กล่องฟ้า = ครึ่งกลางของตลาด · จุด = บริษัทนี้</span><span>สูงสุด</span></div>
        <div class="note ${c.promo >= ist.promo ? "ok" : "warn"}" style="margin-top:12px">
          <b>${c.promo >= ist.promo ? "▲ สูงกว่า" : "▼ ต่ำกว่า"}ค่าเฉลี่ยอุตสาหกรรม ${fmt(Math.abs(c.promo - ist.promo), 2)}</b> ·
          อยู่ที่เปอร์เซ็นไทล์ ${c.dp} ของตลาด ${c.dp >= 75 ? "— ภาษาของผู้นำอยู่ในตำแหน่งสูงของฐานอ้างอิง" : c.dp <= 40 ? "— ภาษาของผู้นำอยู่ในครึ่งล่างของฐานอ้างอิง (องค์ประกอบครึ่งหนึ่งของ B = cP × amp)" : ""}</div>
      </div>

      <div class="card">
        <h3>ประเด็นที่อาจตรวจสอบต่อ</h3>
        <p class="desc">ตัวเลขทุกตัวเป็นการอ่านความชันของสูตรเชิงความสัมพันธ์ — ไม่ใช่การทำนายผลและไม่ใช่คำแนะนำให้ปรับโครงสร้าง</p>
        ${nextSteps(c)}
        <div style="display:flex;gap:8px;margin-top:13px;flex-wrap:wrap">
          <button class="btn p" data-goto="studio">เปิด What-if Studio</button>
          <button class="btn s" data-goto="peer">เทียบกับคู่แข่ง 3 ราย</button>
          <button class="btn g" data-goto="matrix">ดูตำแหน่งบนเมทริกซ์</button>
        </div>
      </div>
    </div>
  </div>`;

  const head = pageHead("รายงานวินิจฉัย", `${c.t} · ${c.n}`,
    `${IND[c.ind]} · วินิจฉัยสถานะปัจจุบันจากภาพปี 2566 — ระบบอ่านสองสัญญาณคู่กัน คือภาษาเชิงรุกของผู้นำ และความสามารถของโครงสร้างบอร์ดในการขยายสัญญาณนั้น`);

  if (isUnlocked("report")) {
    const badge = S.freeCo === c.t ? `<span class="chip free">◇ รายงานฟรีของคุณ</span>` : `<span class="chip">เปิดด้วย token แล้ว</span>`;
    return head.replace("</div>", badge + "</div>") + body;
  }
  const firstFree = !S.freeCo;
  return head + (firstFree
    ? `<div class="note ok" style="margin-bottom:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:240px"><b>สิทธิ์รายงานฟรี 1 บริษัท</b><br>
          คุณยังไม่ได้ใช้สิทธิ์นี้ — เลือกเปิด ${esc(c.t)} เป็นบริษัทฟรีของคุณ หรือเปลี่ยนบริษัทด้านบนก่อนก็ได้ สิทธิ์นี้ใช้ได้ครั้งเดียว</div>
        <button class="btn p" id="btnFree">ใช้สิทธิ์ฟรีกับ ${esc(c.t)}</button></div>` + body
    : paywall(body, "report", "รายงานวินิจฉัยฉบับเต็ม",
      `คุณใช้สิทธิ์รายงานฟรีไปกับ <b>${esc(S.freeCo)}</b> แล้ว — เปิดรายงานของ <b>${esc(c.t)}</b> ด้วยtoken 1 หน่วย
       จะได้ OpenInnoScore ค่าองค์ประกอบบอร์ดเทียบอุตสาหกรรม และประเด็นที่อาจตรวจสอบต่อรายบริษัท`, PRICE.report,
      "สิทธิ์ฟรีใช้ไปแล้ว"));
}

/** ประเด็นที่อาจตรวจสอบต่อ — เหลือเฉพาะสององค์ประกอบที่ระบบอนุญาตให้อ่านเป็นความสัมพันธ์
 *  (องค์ประกอบกรรมการหญิง และภาษาของ CEO) · ครอบครัว / political ties / อายุงาน เป็นบริบท ไม่ใช่คันโยก (R6, C1–C3) */
function nextSteps(c) {
  const base = c.ipi, out = [];
  const mk = (lab, why, fem, dp) => {
    const v = ipiFrom(dp ?? c.dp, ampOf(c.fam, c.pol, fem, c.ten));
    out.push({ lab, why, v, d: v - base });
  };
  mk("องค์ประกอบกรรมการหญิงสูงกว่านี้ 10 จุด", "ค่าที่มีน้ำหนักมากที่สุดในสูตร — " + critText(c),
    clamp(c.fem + .1, 0, 1));
  mk("องค์ประกอบกรรมการหญิงต่ำกว่านี้ 10 จุด", "กรณีกรรมการหญิงครบวาระแล้วตำแหน่งนั้นไม่ได้เป็นผู้หญิง — อ่านเป็นตำแหน่งบนฐานอ้างอิง ไม่ใช่การทำนาย",
    clamp(c.fem - .1, 0, 1));
  if (c.dp < 85) mk("ภาษาของ CEO อยู่สูงกว่านี้ 15 เปอร์เซ็นไทล์", "องค์ประกอบอีกครึ่งหนึ่งของ B = cP × amp ซึ่งวัดจากสารถึงผู้ถือหุ้น ไม่เกี่ยวกับโครงสร้างบอร์ด",
    c.fem, clamp(c.dp + 15, 0, 100));
  if (c.dp > 15) mk("ภาษาของ CEO อยู่ต่ำกว่านี้ 15 เปอร์เซ็นไทล์", "กรณีสารปีถัดไปใช้ภาษาเชิงระมัดระวังมากขึ้น",
    c.fem, clamp(c.dp - 15, 0, 100));
  out.sort((a, b) => b.d - a.d);
  const ctx = `<div style="font-size:11px;color:var(--ink-3);line-height:1.55;padding:9px 0 0">
    <b>ข้อมูลบริบท — ไม่ใช่คันโยก (R6)</b> · กรรมการครอบครัว ${pct1(c.fam)} · political ties ${c.pol ? "มี" : "ไม่มี"} (ค่า 0/1 · ระบบไม่ใช้เป็นเหตุผลเชิงบวก) ·
    อายุงานเฉลี่ยบอร์ด ${fmt(c.ten, 1)} ปี (ไม่มีผลต่อคะแนน · δT = 0, evidence gate)</div>`;
  return out.map(o => `<div style="display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)">
    <div style="flex:1"><div style="font-size:12.8px;font-weight:400">${esc(o.lab)}</div>
      <div style="font-size:11px;color:var(--ink-3);line-height:1.5">${esc(o.why)}</div></div>
    <div style="text-align:right;white-space:nowrap"><div class="pill ${o.d > 0 ? "ok" : "mute"}" style="font-size:11px">
      ${o.d > 0 ? "▲ +" + o.d : o.d < 0 ? "▼ " + o.d : "±0"} จุด → OIS ${o.v}</div>
      <div style="font-size:9.5px;color:var(--ink-3);margin-top:2px">${ASSOC}</div></div></div>`).join("") + ctx;
}

function pageHead(eyebrow, title, sub) {
  return `<div class="pagehead"><div class="eyebrow">${esc(eyebrow)}</div>
    <h2>${esc(title)}</h2><p>${sub}</p></div>`;
}

/* ============================================================================
   หน้า 2 · เมทริกซ์กลยุทธ์ 2×2 พร้อมเส้นทางไปโซนเป้าหมาย
   ============================================================================ */
/** แถบสถานะตามตารางที่ 10 + ป้ายเตือนตาม E13 — ใช้ซ้ำได้ทุกหน้า */
function statusBar(c) {
  const v = verdictOf(c);
  const chipsHtml = ch => ch.length ? `<div class="sbchips">${ch.map(x =>
    `<span class="chip" title="${esc(x.t)}">${esc(x.k)}</span>`).join("")}</div>` : "";
  if (!v.inDomain) return `<div class="sbar mute">
    <div class="sbtop"><b>นอกกลุ่มอ้างอิง — ไม่แสดง tier</b></div>
    <div class="sbmsg">ฐานอ้างอิง REF-928 ครอบคลุมอุตสาหกรรม 1–7 เท่านั้น ไม่รวมธนาคารและกลุ่มการเงิน — ระบบไม่แสดง tier เปอร์เซ็นไทล์ หรือธงสัญญาณ (R4)</div>
    ${chipsHtml(v.chips)}</div>`;
  const t1 = c.t1 || t1Of(c);
  const T1 = useT1();
  // ตัวเลขที่แสดงบนแถบ: สูตรหลัก B_EG หรือ shadow B_T1 (เมื่อผู้ใช้สลับในหน้าสถาปัตยกรรม)
  const tier = T1 ? t1.tier : v.tier, quad = T1 ? t1.quad : v.quad, ois = T1 ? t1.ois : (c.ois ?? c.ipi);
  const st = T1 ? t10Of(t1.tier, t1.quad) : v.st, z = ZONES[quad];
  const chips = T1 ? [{ k: "Caution: สูตร B_T1 (shadow)", t: "ทุกตัวชี้วัด validity ของ B_T1 ต่ำกว่าเกณฑ์ผ่าน (ρ .148 · AUC .595 · lift 1.97) — แสดงเพื่อเปรียบเทียบตามแนวทาง Pilot เท่านั้น" }, ...v.chips] : v.chips;
  const devC = quad === "C" ? `<div class="sbmsg" style="margin-top:4px;color:var(--ink-2)">B &gt; 0 ในช่องนี้เป็นผลคูณของค่าลบสองค่า (CEO ระมัดระวัง × บอร์ดที่ไม่อยู่ในรูปแบบหนุน) — ไม่ใช่สัญญาณ open innovation</div>` : "";
  const shadow = S.plan === "pro" ? (T1
    ? `<div class="sbfoot" style="opacity:.75;margin-top:6px">สูตรหลัก B_EG: OIS ${fmt(c.ois ?? c.ipi, 1)} · Tier ${v.tier} · quadrant ${v.quad} — แถบนี้กำลังแสดง B_T1 (shadow) · สลับกลับได้ที่หน้า “สถาปัตยกรรมข้อมูล”</div>`
    : `<div class="sbfoot" style="opacity:.7;margin-top:6px">สูตรทางเลือก B_T1 (shadow log · ป้าย Caution): OIS ${fmt(t1.ois, 1)} · Tier ${t1.tier} · quadrant ${t1.quad} — บันทึกไว้เปรียบเทียบตามแนวทาง Pilot; สูตรหลักคือ B_EG</div>`) : "";
  return `<div class="sbar ${st.c}">
    <div class="sbtop"><b>Tier ${tier} · ${esc(z.q)}</b>
      <span class="oisv">OpenInnoScore ${fmt(ois, 1)}
        ${T1 ? `<i>B_T1 · ไม่มีช่วง 90%</i>` : `<i>ช่วง 90% ${fmt(v.band[0], 1)}–${fmt(v.band[1], 1)}</i>`}</span>
      ${v.flag && !T1 ? `<span class="oiflag">ธงสัญญาณ OI</span>` : ""}</div>
    <div class="sbmsg">${esc(st.s)}</div>${devC}
    <div class="sbfoot">บริษัทในช่อง Tier ${tier} × ${quad} ของ REF-928 มีจำนวนกิจกรรม open innovation เฉลี่ย
      <b>${fmt(st.oi, 2)}</b> รายการต่อปี (n = ${st.n}) — ค่าเฉลี่ยของกลุ่มในฐานอ้างอิง ไม่ใช่ค่าคาดหมายของบริษัทนี้</div>
    ${T1 ? `<div class="sbfoot" style="color:var(--warn)">ทุกตัวชี้วัด validity ของ B_T1 ต่ำกว่าเกณฑ์ผ่าน — ใช้เปรียบเทียบเท่านั้น</div>` : ""}
    ${chipsHtml(chips)}${shadow}
  </div>`;
}

/** บริษัทที่อยู่ในโซน Deliver อยู่แล้ว — บอกว่าเหลือระยะห่างจากเส้นแบ่งเท่าไหร่ */
function holdAnalysis(c) {
  const marginP = cpOf(c.promo), marginA = c.amp;
  const femDrop = marginA / OPAR.dW * 100;                 // จุดเปอร์เซ็นต์ (คำนวณภายใน ไม่แสดงค่าสัมประสิทธิ์)
  const cap = c.fem * 100;
  const femCell = femDrop > cap ? "เกินช่วงที่เป็นไปได้" : fmt(femDrop, 1) + " จุด";
  const femWhy = femDrop > cap ? "องค์ประกอบนี้เพียงตัวเดียวไปไม่ถึงเส้นแบ่ง (เพดานคือ " + fmt(cap, 1) + " จุด)"
    : "กรณีกรรมการหญิงครบวาระแล้วตำแหน่งนั้นไม่ได้เป็นผู้หญิง";
  return `<div class="note ok" style="margin-bottom:12px">
      <b>อยู่ในโซน Deliver</b> — ตำแหน่งปัจจุบันห่างจากเส้นแบ่งอยู่ ${fmt(marginA, 2)} หน่วยในแกน Board Amplification Signal
      และ ${fmt(marginP, 2)} ในแกน CEO Promotion Focus</div>
    <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:6px">ป้ายโซนเปลี่ยนเมื่อค่าป้อนเปลี่ยนถึงระดับต่อไปนี้ —
      เป็นการอ่านความชันของสูตร ${ASSOC} ไม่ใช่การทำนายผล</div>
    <div class="tw"><table><thead><tr><th>ค่าป้อนที่เปลี่ยน</th><th class="n">เปลี่ยนได้ถึง</th><th>อ่านอย่างไร</th></tr></thead><tbody>
      <tr><td>องค์ประกอบกรรมการหญิงต่ำลง</td><td class="n"><b>${femCell}</b></td><td style="color:var(--ink-2)">${femWhy}</td></tr>
      <tr><td>CEO Promotion Focus ต่ำลง</td><td class="n"><b>${fmt(marginP, 2)} (ค่าหลัง winsorise)</b></td><td style="color:var(--ink-2)">ภาษาในสารปีถัดไปอยู่ต่ำกว่าค่าเฉลี่ยฐานอ้างอิง</td></tr>
    </tbody></table></div>
    <div style="font-size:11px;color:var(--ink-3);margin-top:8px">${critText(c)} · กรรมการครอบครัวและ political ties เป็นข้อมูลบริบท ไม่แสดงเป็นคันโยก (R6)</div>
    <button class="btn p" data-goto="studio" style="margin-top:13px">ทดสอบค่าป้อนเหล่านี้ใน What-if</button>`;
}

function viewMatrix() {
  const c = cur();
  const zk = zoneOf(c.promo, c.amp), z = ZONES[zk];
  const mP = OM.P;                                  // เส้นประแนวตั้ง = ค่าเฉลี่ยฐานอ้างอิง (cP = 0)
  const pw = x => wins(x.promo, "P");
  const peers = (S.peers || []).map(t => byT[t]).filter(x => x && x.t !== c.t).slice(0, 3);
  const marked = [c, ...peers];                     // วงกลมหมายเลข 1 = บริษัทที่เลือก · 2–4 = คู่แข่งที่เลือกไว้

  // พื้นหลัง = ฐานอ้างอิง REF-928 ทั้งชุด (ไม่มีชื่อบริษัท) · x = P หลัง winsorise · y = amp
  const px = REF_PTS.map(p => p[0]), ax = REF_PTS.map(p => p[1]);
  const xr = [Math.min(...px, ...marked.map(pw), mP), Math.max(...px, ...marked.map(pw), mP)];
  const yr = [Math.min(...ax, ...marked.map(x => x.amp), 0), Math.max(...ax, ...marked.map(x => x.amp), 0)];
  const padx = (xr[1] - xr[0]) * .06 || .1, pady = (yr[1] - yr[0]) * .06 || .1;
  const W = 760, H = 470, L = 52, R = 20, T = 22, B = 46;
  const X = v => L + (v - (xr[0] - padx)) / ((xr[1] + padx) - (xr[0] - padx)) * (W - L - R);
  const Y = v => H - B - (v - (yr[0] - pady)) / ((yr[1] + pady) - (yr[0] - pady)) * (H - T - B);
  const cx = X(mP), cy = Y(0);

  // จุดอ้างอิงเชิงเปรียบเทียบ: ค่ามัธยฐานของบริษัทโซน Deliver (quadrant A) ในอุตสาหกรรมเดียวกัน (FY2566)
  const eng = indComps(c.ind).filter(x => zoneOf(x.promo, x.amp) === "A");
  const tgt = eng.length ? { promo: qstats(eng.map(pw)).med, amp: qstats(eng.map(x => x.amp)).med }
    : { promo: mP + .25, amp: .35 };
  const tgtIPI = Math.round(oisOf((wins(tgt.promo, "P") - mP) * tgt.amp));
  const needP = Math.max(0, tgt.promo - pw(c)), needA = Math.max(0, tgt.amp - c.amp);
  const showPath = zk !== "A" && eng.length > 0;

  const zoneRect = (x0, y0, x1, y1, key) => {
    const zz = ZONES[key];
    return `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}"
      fill="${zz.c}" fill-opacity="${key === zk ? .1 : .045}"/>`;
  };
  // สีจุดพื้นหลัง: A เขียว · C ส้ม · B, D เทา — จุดเล็กและจาง เพื่อให้วงกลมหมายเลขเด่น
  const dotCol = q => q === "A" ? "var(--ok)" : q === "C" ? "var(--serious)" : "var(--ink-3)";
  const dots = REF_PTS.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.3"
      fill="${dotCol(p[2])}" fill-opacity="${p[2] === "A" || p[2] === "C" ? .38 : .28}"/>`).join("");
  // ตัวเลขมุมช่อง = OI เฉลี่ยและจำนวน firm-years ของ quadrant นั้นใน REF-928 (OIS.qn)
  const corner = (key, x, y, anc) => {
    const zz = ZONES[key], q = QN[key] || [0, 0];
    const sk = `paint-order="stroke" stroke="var(--panel)" stroke-width="3.5" stroke-linejoin="round"`;
    return `<text x="${x}" y="${y}" font-size="11.5" font-weight="600" fill="${zz.c}" text-anchor="${anc}" ${sk}>${zz.l}</text>
      <text x="${x}" y="${y + 13}" font-size="9.5" fill="var(--ink-3)" text-anchor="${anc}" ${sk}>${zz.q} · OI เฉลี่ย ${fmt(q[0], 2)} (n = ${q[1]})</text>`;
  };
  // วงกลมหมายเลข — 1 = บริษัทที่เลือก (ใหญ่กว่า) · 2–4 = คู่แข่ง
  const numCircle = (x, i) => {
    const r = i === 0 ? 11 : 8.5, col = i === 0 ? "var(--ink)" : SER[i - 1];
    return `<g class="mk" transform="translate(${X(pw(x)).toFixed(1)},${Y(x.amp).toFixed(1)})" data-t="${esc(x.t)}" data-n="${esc(x.n)}"
        data-i="${x.ipi}" data-z="${ZONES[zoneOf(x.promo, x.amp)].l}" style="cursor:${i === 0 ? "default" : "pointer"}">
      <circle r="${r + 2.5}" fill="var(--panel)"/>
      <circle r="${r}" fill="${col}" stroke="var(--panel)" stroke-width="1.5"/>
      <text y="${i === 0 ? 4 : 3.5}" text-anchor="middle" font-size="${i === 0 ? 12 : 10}" font-weight="600" fill="var(--panel)">${i + 1}</text></g>`;
  };
  const labelC = (() => { const mx = X(pw(c)), flip = mx > W - 150;
    return `<text x="${(flip ? mx - 16 : mx + 16).toFixed(1)}" y="${(Y(c.amp) + 4).toFixed(1)}" font-size="12" font-weight="500"
      text-anchor="${flip ? "end" : "start"}" fill="var(--ink)" paint-order="stroke" stroke="var(--panel)" stroke-width="3.5"
      stroke-linejoin="round">${esc(c.t)} · OIS ${c.ipi}</text>`; })();

  const inner = `
  <div class="card">
    ${statusBar(c)}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin:14px 0 6px">
      <div><h3>Board Strategy Compass — ตำแหน่งบริษัทและประเด็นสำหรับการหารือของบอร์ด</h3>
        <p class="desc" style="margin-bottom:0">แกนนอน = CEO Promotion Focus (หลัง winsorise) · แกนตั้ง = Board Amplification Signal (amp) ·
          เส้นประแนวตั้ง = ค่าเฉลี่ยฐานอ้างอิง (cP = 0) · เส้นประแนวนอนที่ 0 แยกบอร์ดที่อยู่ในรูปแบบสัมพันธ์กับการหนุนออกจากที่ไม่ ·
          พื้นหลัง = ฐานอ้างอิง REF-928 ทั้งชุด (${REF_PTS.length} บริษัท-ปี · ไม่ระบุชื่อ)</p></div>
      <label style="font-size:11.5px;color:var(--ink-2);display:flex;align-items:center;gap:7px;white-space:nowrap">
        <input type="checkbox" id="mxPath" ${showPath ? "checked" : ""} ${showPath ? "" : "disabled"}> แสดงเส้นไปยังค่ากลางโซน Deliver</label>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" id="mxSvg" role="img" aria-label="เมทริกซ์ 2 คูณ 2">
      ${zoneRect(cx, T, W - R, cy, "A")}
      ${zoneRect(cx, cy, W - R, H - B, "B")}
      ${zoneRect(L, T, cx, cy, "D")}
      ${zoneRect(L, cy, cx, H - B, "C")}
      ${dots}
      <line x1="${cx}" y1="${T}" x2="${cx}" y2="${H - B}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="5 4"/>
      <line x1="${L}" y1="${cy}" x2="${W - R}" y2="${cy}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="5 4"/>
      <text x="${(cx + 5).toFixed(1)}" y="${(cy - 5).toFixed(1)}" font-size="9.5" fill="var(--ink-3)" paint-order="stroke" stroke="var(--panel)" stroke-width="3">ค่าเฉลี่ยฐานอ้างอิง (cP = 0)</text>
      ${corner("A", cx + 9, T + 14, "start")}
      ${corner("D", cx - 9, T + 14, "end")}
      ${corner("B", cx + 9, H - B - 18, "start")}
      ${corner("C", cx - 9, H - B - 18, "end")}
      <g id="mxPathG" style="display:${showPath ? "" : "none"}">
        <line x1="${X(pw(c)).toFixed(1)}" y1="${Y(c.amp).toFixed(1)}" x2="${X(tgt.promo).toFixed(1)}" y2="${Y(tgt.amp).toFixed(1)}"
          stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#ah)" opacity=".65"/>
        <g transform="translate(${X(tgt.promo).toFixed(1)},${Y(tgt.amp).toFixed(1)})">
          <circle r="9" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 3" opacity=".7"/>
          <circle r="3" fill="var(--ink)" opacity=".7"/></g>
        <text x="${X(tgt.promo).toFixed(1)}" y="${(Y(tgt.amp) - 16).toFixed(1)}" font-size="10.5" fill="var(--ink-2)" text-anchor="middle">
          ค่ากลางของโซน Deliver · OIS ${tgtIPI}</text>
      </g>
      <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 10 5 0 10z" fill="var(--ink)" opacity=".65"/></marker></defs>
      ${peers.map((p, i) => numCircle(p, i + 1)).join("")}
      ${numCircle(c, 0)}
      ${labelC}
      <text x="${(L + (W - L - R) / 2).toFixed(0)}" y="${H - 10}" font-size="11" fill="var(--ink-2)" text-anchor="middle">CEO Promotion Focus (หลัง winsorise)</text>
      <text transform="translate(15,${(T + (H - T - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">Board Amplification Signal (amp)</text>
    </svg>
    <div class="legend">
      <span><i style="background:var(--ok);opacity:.55"></i>A Deliver</span>
      <span><i style="background:var(--serious);opacity:.55"></i>C Develop</span>
      <span><i style="background:var(--ink-3);opacity:.45"></i>B Discipline · D Discover</span>
      <span><i style="background:var(--ink);border-radius:99px"></i><b>1</b> ${esc(c.t)} — บริษัทที่เลือก</span>
      ${peers.map((p, i) => `<span><i style="background:${SER[i]};border-radius:99px"></i><b>${i + 2}</b> ${esc(p.t)}</span>`).join("")}
      ${showPath ? `<span><i style="background:none;border:1.5px dashed var(--ink);border-radius:99px;width:10px;height:10px"></i>ค่ากลางโซน Deliver</span>` : ""}
    </div>
    <div style="font-size:10.8px;color:var(--ink-3);margin-top:7px">จุดพื้นหลังคือบริษัท-ปีในฐานอ้างอิง REF-928 (ไม่ระบุชื่อ) ·
      วงกลมหมายเลข 2–4 คือคู่แข่งที่เลือกไว้ในหน้า “เทียบคู่แข่ง” (คลิกเพื่อเปลี่ยนไปดูบริษัทนั้น) ·
      ยิ่งอยู่ใกล้เส้นประ ป้ายโซนยิ่งเปลี่ยนง่ายเมื่อค่าป้อนเปลี่ยนเล็กน้อย · สี่ช่องนี้คือ quadrant ไม่ใช่ควอไทล์อันดับอุตสาหกรรม</div>
  </div>`;

  const nQ = Object.fromEntries(Object.keys(ZONES).map(k => [k, REF_PTS.filter(p => p[2] === k).length]));
  const gapCard = `
  <div class="grid g-side-r" style="margin-top:14px">
    <div class="card">
      <h3>ระยะห่างจากค่ากลางของโซน Deliver</h3>
      <p class="desc">ค่ากลางตั้งจากบริษัทที่อยู่โซน Deliver ในอุตสาหกรรมเดียวกัน ปีบัญชี 2566
        (${eng.length} บริษัทจาก ${indComps(c.ind).length}) — เป็นจุดอ้างอิงเชิงเปรียบเทียบ ไม่ใช่เป้าหมายที่ระบบแนะนำให้ไปถึง</p>
      ${zk === "A"
      ? holdAnalysis(c)
      : `<div class="tw"><table><thead><tr><th>แกน</th><th class="n">ตอนนี้</th><th class="n">ค่ากลางโซน Deliver</th><th class="n">ส่วนต่าง</th><th>อ่านอย่างไร</th></tr></thead><tbody>
          <tr><td>CEO Promotion Focus</td><td class="n">${fmt(pw(c), 2)}</td><td class="n">${fmt(tgt.promo, 2)}</td>
            <td class="n"><b>${needP > 0 ? "+" + fmt(needP, 2) : "ถึงแล้ว"}</b></td>
            <td style="color:var(--ink-2)">${needP > 0 ? `เปอร์เซ็นไทล์ ${c.dp} เทียบกับ ${promoPct(tgt.promo)}` : "ไม่ต่างจากค่ากลาง"}</td></tr>
          <tr><td>Board Amplification Signal</td><td class="n">${fmt(c.amp, 2)}</td><td class="n">${fmt(tgt.amp, 2)}</td>
            <td class="n"><b>${needA > 0 ? "+" + fmt(needA, 2) : "ถึงแล้ว"}</b></td>
            <td style="color:var(--ink-2)">${needA > 0 ? `ส่วนต่างนี้เทียบเท่าองค์ประกอบกรรมการหญิงที่ต่างกัน ${fmt(needA / OPAR.dW * 100, 0)} จุด ${ASSOC}` : "ไม่ต่างจากค่ากลาง"}</td></tr>
          <tr class="hl"><td><b>OpenInnoScore</b></td><td class="n"><b>${c.ipi}</b></td><td class="n"><b>${tgtIPI}</b></td>
            <td class="n"><b>${tgtIPI - c.ipi >= 0 ? "+" : ""}${tgtIPI - c.ipi}</b></td>
            <td style="color:var(--ink-2)">ส่วนต่างของเปอร์เซ็นไทล์ ไม่ใช่จำนวนกิจกรรม open innovation (R1)</td></tr>
        </tbody></table></div>
        <div style="font-size:11px;color:var(--ink-3);margin-top:8px">${critText(c)} · กรรมการครอบครัวและ political ties เป็นข้อมูลบริบท ไม่แสดงเป็นคันโยก (R6)</div>
        <button class="btn p" data-goto="studio" style="margin-top:13px">ลองปรับค่าป้อนใน What-if Studio</button>`}
    </div>
    <div class="card">
      <h3>สัดส่วนบริษัทในแต่ละโซน</h3>
      <p class="desc">ทั้งฐานอ้างอิง 928 บริษัท-ปี (REF-928)</p>
      ${bars(Object.entries(ZONES).map(([k, v]) => {
        const n = nQ[k];
        return { l: v.l, v: n, t: n + " (" + fmt(n / REF_PTS.length * 100, 0) + "%)", c: v.c, hl: k === zk };
      }), { lw: 130 })}
      <div class="note" style="margin-top:12px">${esc(c.t)} อยู่ในโซน <b>${z.l}</b> (${esc(z.q)})
        ซึ่งมี ${nQ[zk]} บริษัท-ปีจาก ${REF_PTS.length} ในฐานอ้างอิง<br>
        <span style="color:var(--ink-2)">${esc(z.d)}</span></div>
    </div>
  </div>`;

  return pageHead("เมทริกซ์กลยุทธ์", "Board Strategy Compass (2×2)",
    `วาง B = cP × amp ลงบนสองแกนที่ประกอบกันเป็นคะแนน แล้วอ่านผลด้วย <b>tier คู่กับ quadrant</b> เสมอ
     เพราะคะแนนที่สูงเกิดได้สองทาง — CEO บุกบนบอร์ดที่อยู่ในรูปแบบหนุน (Deliver) หรือ CEO ระมัดระวังที่เข้ากับบอร์ด (Develop)`)
    + inner + gapCard;
}

/* ============================================================================
   หน้า 3 · เทียบคู่แข่ง 3 ราย — รูปแบบตารางเทียบแบบเลือกแผนประกัน
   ============================================================================ */
/** เลือกคู่แข่งตั้งต้น: อันดับเหนือขึ้นไป 1 ราย · ใกล้เคียงที่สุด 1 ราย · ผู้นำอุตสาหกรรม 1 ราย */
function autoPeers(c) {
  const pool = indComps(c.ind).filter(x => x.t !== c.t).sort((a, b) => b.ipi - a.ipi);
  if (!pool.length) return [];
  const out = [];
  const leader = pool[0]; out.push(leader);
  const above = pool.filter(x => x.ipi > c.ipi && x.t !== leader.t).pop();
  if (above) out.push(above);
  const near = pool.filter(x => !out.some(o => o.t === x.t))
    .sort((a, b) => Math.abs(a.ipi - c.ipi) - Math.abs(b.ipi - c.ipi))[0];
  if (near) out.push(near);
  while (out.length < 3 && pool.length > out.length) {
    const nx = pool.find(x => !out.some(o => o.t === x.t)); if (!nx) break; out.push(nx);
  }
  return out.slice(0, 3);
}
const ROWS_CMP = [
  { k: "ipi", l: "OpenInnoScore (เปอร์เซ็นไทล์)", f: c => c.ipi, d: 0, hi: 1, big: 1 },
  { k: "dp", l: "CEO Promotion Focus (เปอร์เซ็นไทล์)", f: c => c.dp, d: 0, hi: 1 },
  { k: "ap", l: "Board Amplification (เปอร์เซ็นไทล์)", f: c => ampPct(c.amp), d: 0, hi: 1 },
  { k: "promo", l: "Promotion focus (ค่าดิบ)", f: c => c.promo, d: 2, hi: 1 },
  { k: "fem", l: "สัดส่วนกรรมการหญิง", f: c => c.fem * 100, d: 1, hi: 1, unit: "%" },
  { k: "fam", l: "สัดส่วนกรรมการครอบครัว (บริบท)", f: c => c.fam * 100, d: 1, hi: 0, unit: "%", ctx: 1 },
  { k: "ten", l: "อายุงานเฉลี่ยบอร์ด (บริบท · ไม่มีผลต่อคะแนน)", f: c => c.ten, d: 1, hi: 0, unit: " ปี", ctx: 1 },
  { k: "pol", l: "political ties (บริบท · 0/1)", f: c => c.pol, d: 0, hi: 1, bool: 1, ctx: 1 },
  { k: "oi", l: "จำนวนกิจกรรมนวัตกรรมเปิดที่นับได้", f: c => c.oi, d: 0, hi: 1 },
];
function viewPeer() {
  const c = cur();
  if (!S.peers.length) S.peers = autoPeers(c).map(x => x.t);
  const peers = S.peers.map(t => byT[t]).filter(Boolean);
  const all = [c, ...peers];
  const pool = indComps(c.ind);
  const inner = `
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11.5px;color:var(--ink-3)">เลือกคู่แข่งได้สูงสุด 3 ราย</span>
      <div id="peerPick" style="display:flex;gap:8px;flex-wrap:wrap;flex:1"></div>
      <button class="btn g" id="btnPeerAuto" style="font-size:12px;padding:6px 12px">เลือกอัตโนมัติ</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3>ตารางเทียบ</h3>
    <p class="desc">แถบใต้ตัวเลขคือตำแหน่งเทียบกับทั้งตลาด · ค่าสูงสุดในแถวที่เป็นองค์ประกอบของคะแนนมีเครื่องหมาย ✦ กำกับ ·
      แถวที่ติดป้าย “ไม่ใช่คันโยก” เป็นข้อมูลบริบท (R6) ไม่จัดอันดับ</p>
    <div class="tw"><table>
      <thead><tr><th style="min-width:190px">ตัวชี้วัด</th>
        ${all.map((x, i) => `<th class="n" style="min-width:118px">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
            <span style="width:9px;height:9px;${i === 0 ? "background:var(--ink);transform:rotate(45deg);border-radius:2px" : "border-radius:99px;background:" + SER[i - 1]};display:inline-block"></span>
            <span style="color:var(--ink);font-size:12px;font-weight:500">${esc(x.t)}</span></div>
          <div style="font-weight:300;text-transform:none;letter-spacing:0;font-size:10px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis">${esc(x.n)}</div></th>`).join("")}
      </tr></thead>
      <tbody>${ROWS_CMP.map(r => {
        const vals = all.map(r.f);
        const best = r.hi ? Math.max(...vals) : Math.min(...vals);
        const dist = COMPS.map(r.f);
        return `<tr${r.big ? ' class="hl"' : ""}><td>${r.l}${r.ctx ? ` <span class="pill mute" style="font-size:9.5px">ไม่ใช่คันโยก</span>` : ""}</td>
          ${vals.map((v, i) => {
          const isBest = !r.ctx && Math.abs(v - best) < 1e-9;
          const p = pctile([...dist].sort((a, b) => a - b), v);
          return `<td class="n"><div style="font-size:${r.big ? "17px" : "13px"};font-weight:${r.big || isBest ? 500 : 300};color:var(--ink)">
              ${r.bool ? (v ? "มี" : "ไม่มี") : fmt(v, r.d) + (r.unit || "")}${isBest && !r.bool ? ' <span title="ดีที่สุดในกลุ่มเทียบ" style="color:var(--ok)">✦</span>' : ""}</div>
            ${r.bool ? "" : `<div class="mbar" style="height:5px;margin-top:3px"><span style="width:${r.hi ? p : 100 - p}%;background:${i === 0 ? "var(--ink)" : SER[i - 1]}"></span></div>`}</td>`;
        }).join("")}</tr>`;
      }).join("")}</tbody></table></div>
  </div>

  <div class="grid g2">
    <div class="card">
      <h3>ภาพซ้อนองค์ประกอบบอร์ด</h3>
      <p class="desc">เส้นทึบ = ${esc(c.t)} · เส้นประ = ${peers.length ? esc(peers[0].t) : "—"} (คู่แข่งอันดับแรกที่เลือก)</p>
      ${radar(c, peers[0], peers[0] ? peers[0].t : "")}
    </div>
    <div class="card">
      <h3>ตำแหน่ง OpenInnoScore ในการกระจายตัว</h3>
      <p class="desc">กล่อง = ครึ่งกลาง (Q1–Q3) · เส้นกลาง = มัธยฐาน · รูปข้าวหลามตัด = แต่ละบริษัทในกลุ่มเทียบ</p>
      ${boxplot(pool.map(x => x.ipi), c.ipi, `ในอุตสาหกรรม ${IND[c.ind]} · n = ${pool.length}`)}
      ${boxplot(IPI_ALL, c.ipi, `ทุกอุตสาหกรรม · n = ${COMPS.length}`)}
      <div style="margin-top:8px">${bars(all.map((x, i) => ({
        l: x.t + " · " + x.n, v: x.ipi, t: String(x.ipi),
        c: i === 0 ? "var(--ink)" : SER[i - 1], hl: i === 0,
      })), { lw: 175, max: 100 })}</div>
      <div class="legend"><span><i class="dia" style="background:var(--ink)"></i>${esc(c.t)}</span>
        ${peers.map((p, i) => `<span><i style="background:${SER[i]}"></i>${esc(p.t)}</span>`).join("")}</div>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <h3>อ่านผลเทียบ</h3>
    ${peerVerdict(c, peers)}
  </div>`;

  const head = pageHead("เทียบคู่แข่ง", `${c.t} เทียบคู่แข่ง ${peers.length} ราย`,
    `เลือกคู่แข่งในอุตสาหกรรมเดียวกันได้ถึง 3 ราย แล้วดูทีละตัวชี้วัดว่าใครนำใครตาม — รูปแบบเดียวกับการเทียบแผนประกัน แต่ทุกตัวเลขมาจากแผงข้อมูลวิจัย`);
  return head + (isUnlocked("peer") ? inner
    : paywall(inner, "peer", "รายงานเทียบคู่แข่ง",
      `ปลดล็อกการเทียบ <b>${esc(c.t)}</b> กับคู่แข่งในอุตสาหกรรมได้ครั้งละ 3 ราย
       เปลี่ยนคู่แข่งกี่ครั้งก็ได้หลังปลดล็อก · ปลดล็อกครั้งเดียวใช้ได้กับบริษัทนี้ตลอด`, PRICE.peer));
}
function peerVerdict(c, peers) {
  if (!peers.length) return `<div class="note">ไม่มีบริษัทอื่นในอุตสาหกรรมนี้ให้เทียบ</div>`;
  const better = peers.filter(p => p.ipi > c.ipi);
  const lead = peers.reduce((a, b) => a.ipi > b.ipi ? a : b);
  const gap = lead.ipi - c.ipi;
  const dGap = lead.dp - c.dp, aGap = ampPct(lead.amp) - ampPct(c.amp);
  const which = Math.abs(dGap) >= Math.abs(aGap) ? "ภาษาผู้นำ" : "โครงสร้างบอร์ด";
  return `<div class="grid g3 tight" style="gap:10px;margin-bottom:12px">
    <div class="stat"><div class="k">คู่แข่งที่นำอยู่</div><div class="v">${better.length}<span style="font-size:15px;color:var(--ink-3)"> / ${peers.length}</span></div>
      <div class="u">${better.length ? better.map(p => p.t).join(" · ") + " มี OIS สูงกว่า" : "ไม่มีคู่แข่งในกลุ่มนี้ที่คะแนนสูงกว่า"}</div></div>
    <div class="stat"><div class="k">ห่างจากผู้นำกลุ่มเทียบ</div><div class="v" style="color:${gap > 0 ? "var(--crit)" : "var(--ok)"}">${gap > 0 ? "−" + gap : "+" + Math.abs(gap)}</div>
      <div class="u">${esc(lead.t)} อยู่ที่ OIS ${lead.ipi}</div></div>
    <div class="stat"><div class="k">ช่องว่างหลักอยู่ที่</div><div class="v" style="font-size:19px">${which}</div>
      <div class="u">ต่างกัน ${Math.abs(Math.abs(dGap) >= Math.abs(aGap) ? dGap : aGap)} เปอร์เซ็นไทล์</div></div>
  </div>
  <div class="note ${gap > 0 ? "warn" : "ok"}">
    ${gap > 0
      ? `<b>${esc(lead.t)} อยู่สูงกว่า ${esc(c.t)} ${gap} จุดเปอร์เซ็นไทล์</b> — ส่วนต่างส่วนใหญ่อยู่ที่${which}
         ${Math.abs(dGap) >= Math.abs(aGap)
        ? `(${esc(lead.t)} อยู่ที่เปอร์เซ็นไทล์ ${lead.dp} ส่วน ${esc(c.t)} อยู่ที่ ${c.dp}) — เป็นองค์ประกอบที่วัดจากสารถึงผู้ถือหุ้น ไม่เกี่ยวกับโครงสร้างคณะกรรมการ`
        : `(${esc(lead.t)} อยู่ที่ ${ampPct(lead.amp)} ส่วน ${esc(c.t)} อยู่ที่ ${ampPct(c.amp)}) — เป็นองค์ประกอบที่สัมพันธ์กับโครงสร้างบอร์ด (องค์ประกอบกรรมการหญิงเป็นค่าที่มีน้ำหนักมากที่สุดในสูตร)`}
         <br><span style="font-size:10.5px;color:var(--ink-3)">ส่วนต่างเป็นตำแหน่งบนฐานอ้างอิง ${ASSOC} ไม่ใช่การทำนาย</span>`
      : `<b>${esc(c.t)} อยู่สูงกว่าคู่แข่งทุกรายในกลุ่มเทียบนี้</b> — ประเด็นที่อาจตรวจสอบต่อคือตำแหน่งเปลี่ยนอย่างไร
         หากองค์ประกอบกรรมการหญิงหรือภาษาของ CEO ในปีถัดไปต่างจากนี้ (ดูหน้า What-if)`}
  </div>`;
}

/* ============================================================================
   หน้า 4 · What-if Studio — จำลองบอร์ด + ตรวจคะแนนภาษา CEO จากเอกสารจริง
   ============================================================================ */
function wiInit(force) {
  const c = cur();
  if (!S.wi || S.wi.t !== c.t || force)
    S.wi = { t: c.t, fem: c.fem, fam: c.fam, ten: c.ten, pol: c.pol, dp: c.dp, src: "ค่าจริงของบริษัท" };
  return S.wi;
}
/* ตัวควบคุมใน What-if — เหลือองค์ประกอบกรรมการหญิงเป็นตัวเลื่อนเดียว (C1–C3)
   fam คงไว้ในรายการเพื่อให้โค้ดชั้นถัดไปอ้างอิงได้ แต่ ctx = 1 → แสดงเป็นค่าอ่านอย่างเดียว ไม่ใช่คันโยก (R6)
   ten ไม่อยู่ในรายการ — ไม่มีผลต่อคะแนน (δT = 0, evidence gate) · pol เป็นสวิตช์ 0/1 แยกต่างหาก */
const WI_CTRL = [
  { k: "fem", l: "องค์ประกอบกรรมการหญิง", min: 0, max: .7, step: .01, fmt: v => pct1(v), hint: "ค่าที่มีน้ำหนักมากที่สุดในสูตร — อ่านเป็นความสัมพันธ์ ไม่ใช่ผลที่คาด" },
  { k: "fam", l: "สัดส่วนกรรมการครอบครัว (บริบท)", min: 0, max: .8, step: .01, fmt: v => pct1(v), hint: "ข้อมูลบริบท — ไม่ใช่คันโยก (R6)", ctx: 1 },
];
function viewStudio() {
  const c = cur(), w = wiInit();
  const amp1 = ampOf(w.fam, w.pol, w.fem, w.ten), ipi1 = ipiFrom(w.dp, amp1);
  const d = ipi1 - c.ipi;
  const z0 = zoneOf(c.promo, c.amp), z1 = zoneOf(w.dp >= c.dp ? Math.max(c.promo, OM.P + .001) : c.promo, amp1);
  const zone1 = zoneOf(promoInv(w.dp), amp1);

  const inner = `
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card">
      <h3>① ภาษาผู้นำ — CEO Text Testing</h3>
      <p class="desc">วางสารจากประธาน/CEO หรืออัปโหลดรายงานประจำปี ระบบจะนับคำเชิงรุกและเชิงป้องกันในเบราว์เซอร์ของคุณเอง
        แล้วแปลงเป็นคะแนน CEO Promotion Focus · <b>ไฟล์ไม่ถูกส่งขึ้นเซิร์ฟเวอร์ใด</b></p>
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
      <h3>② องค์ประกอบคณะกรรมการ</h3>
      <p class="desc">เลื่อนเพื่อดูว่าตำแหน่งบนฐานอ้างอิงเปลี่ยนอย่างไรเมื่อองค์ประกอบกรรมการหญิงต่างจากนี้ ·
        ตัวเลขที่ขยับเป็นการอ่านความชันของสูตร ${ASSOC} · ค่าสัมประสิทธิ์ไม่แสดงบนหน้าจอ</p>
      ${WI_CTRL.filter(v => !v.ctx).map(v => `<div style="margin-bottom:13px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span>${v.l} <span class="hlp" title="${esc(v.hint)}">ⓘ</span></span>
          <span class="num"><b>${v.fmt(w[v.k])}</b> <span style="color:var(--ink-3);font-size:10.5px">เดิม ${v.fmt(c[v.k])}</span></span></div>
        <input type="range" data-wi="${v.k}" min="${v.min}" max="${v.max}" step="${v.step}" value="${w[v.k]}" style="width:100%;accent-color:var(--brand)">
        <div style="font-size:10.5px;color:var(--ink-3);margin-top:3px">${esc(critText(Object.assign({}, c, { fem: w.fem })))}</div>
      </div>`).join("")}
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:10px">
        <span>political ties <span class="pill mute" style="font-size:9.5px">บริบท · 0/1</span></span>
        <span style="display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <button class="btn ${w.pol ? "g" : "p"}" data-pol="0" style="border-radius:0;padding:5px 14px;font-size:12px">ไม่มี</button>
          <button class="btn ${w.pol ? "p" : "g"}" data-pol="1" style="border-radius:0;padding:5px 14px;font-size:12px">มี</button></span>
      </div>
      <div style="font-size:11px;color:var(--ink-3);line-height:1.6;margin-bottom:12px;padding:9px 11px;background:var(--panel-2);border-radius:9px">
        <b>ข้อมูลบริบท — ไม่ใช่คันโยก (R6)</b><br>
        political ties เป็นค่า 0/1 ตามนิยามของงานวิจัย ระบบไม่ใช้เป็นเหตุผลเชิงบวกและไม่แนะนำให้ปรับ<br>
        กรรมการครอบครัว ${pct1(c.fam)} — อ่านอย่างเดียว<br>
        อายุงานเฉลี่ยบอร์ด ${fmt(c.ten, 1)} ปี — ไม่มีผลต่อคะแนน (δT = 0, evidence gate)</div>
      <button class="btn s" id="btnWiReset" style="width:100%;justify-content:center">↺ กลับไปใช้โครงสร้างบอร์ดจริง</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3>ผลลัพธ์จำลอง</h3>
    <div class="grid g4 tight" style="gap:10px;margin:10px 0 14px">
      <div class="stat"><div class="k">OIS ปัจจุบัน</div><div class="v num">${c.ipi}</div><div class="u">${ZONES[z0].l}</div></div>
      <div class="stat hero"><div class="k">OIS จำลอง</div><div class="v num">${ipi1}</div><div class="u">${ZONES[zone1].l}</div></div>
      <div class="stat"><div class="k">ส่วนต่าง ${ASSOC}</div>
        <div class="v num" style="color:${d > 0 ? "var(--ok)" : d < 0 ? "var(--crit)" : "var(--ink)"}">${d > 0 ? "+" : ""}${d}</div>
        <div class="u">${d > 0 ? "▲ สูงกว่าเดิม" : d < 0 ? "▼ ต่ำกว่าเดิม" : "เท่าเดิม"} (จุดเปอร์เซ็นไทล์)</div></div>
      <div class="stat"><div class="k">ย้ายโซนหรือไม่</div>
        <div class="v" style="font-size:17px;color:${zone1 !== z0 ? "var(--ok)" : "var(--ink)"}">${zone1 !== z0 ? "ย้าย" : "อยู่โซนเดิม"}</div>
        <div class="u">${zone1 !== z0 ? ZONES[z0].l + " → " + ZONES[zone1].l : ZONES[z0].l}</div></div>
    </div>
    <div style="margin-bottom:6px;font-size:11.5px;color:var(--ink-3)">ตำแหน่งบนการกระจายตัวของทั้งตลาด</div>
    ${boxplot(IPI_ALL, ipi1, "OpenInnoScore · 196 บริษัท (ปีบัญชี 2566)")}
    <div class="legend"><span><i class="dia" style="background:var(--ink)"></i>ค่าจำลอง ${ipi1}</span>
      <span style="color:var(--ink-3)">เดิม ${c.ipi}</span></div>
    ${bars([
      { l: "CEO Promotion Focus", v: w.dp, t: `${c.dp} → ${w.dp}`, c: rampAt(w.dp), hl: 1 },
      { l: "Board Amplification", v: ampPct(amp1), t: `${ampPct(c.amp)} → ${ampPct(amp1)}`, c: rampAt(ampPct(amp1)), hl: 1 },
    ], { lw: 175, h: 10, max: 100 })}
  </div>

  <div class="grid g-side-r">
    <div class="card">
      <h3>ฉากทัศน์ที่อาจตรวจสอบต่อ</h3>
      <p class="desc">คำนวณจากสถานะจำลองปัจจุบัน · เรียงตามส่วนต่างของ OIS ${ASSOC}</p>
      ${wiScenarios(c, w)}
    </div>
    <div class="card">
      <h3>โปรไฟล์เชิงโครงสร้างที่สัมพันธ์กับคะแนน</h3>
      <p class="desc">แปลสถานะจำลองเป็นคุณลักษณะเชิงโครงสร้าง — ไม่ใช่คำแนะนำการสรรหาและไม่ใช่การชี้ตัวบุคคล</p>
      ${persona(w, ipi1)}
    </div>
  </div>
  <div class="note warn" style="margin-top:14px">
    <b>อ่านอย่างซื่อตรง</b> — ตัวเลขที่ขยับมาจากแบบจำลองเชิงสหสัมพันธ์ เป็นตำแหน่งบนฐานอ้างอิง ${ASSOC}
    ไม่ใช่การทำนายว่าปรับแล้วนวัตกรรมเปิดต่างไปจริง · <b>ห้ามใช้ผลนี้ประเมินหรือคัดเลือกรายบุคคล</b>
    เพราะเพศและความเชื่อมโยงทางการเมืองเป็นข้อมูลอ่อนไหวตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 26</div>`;

  const head = pageHead("จำลองสถานการณ์", "What-if Studio",
    `ปรับได้ทั้งสองด้านพร้อมกัน — ภาษาของ CEO จากเอกสารจริง และองค์ประกอบกรรมการหญิง — แล้วดูว่าตำแหน่ง OIS บนฐานอ้างอิงเปลี่ยนไปเท่าไหร่และย้ายโซนหรือไม่ ${ASSOC}`);
  return head + (isUnlocked("studio") ? inner
    : prowall(inner, "What-if Studio",
      `การจำลองสำหรับ <b>${esc(c.t)}</b> — ปรับองค์ประกอบบอร์ดได้ไม่จำกัดครั้ง
       และอัปโหลดเอกสาร CEO เพื่อวัดคะแนนภาษาจริง — เปิดให้ผู้ใช้แผน Pro ตามที่ระบุในเอกสารแก้ไขครั้งที่ 1`));
}
/** แปลงเปอร์เซ็นไทล์ CEO กลับเป็นค่า promotion โดยประมาณ (ใช้จัดโซนเท่านั้น) */
function promoInv(p) {
  const i = clamp(Math.round(p / 100 * (REF_PROMO.length - 1)), 0, REF_PROMO.length - 1);
  return REF_PROMO[i];
}
function wiScenarios(c, w) {
  const base = ipiFrom(w.dp, ampOf(w.fam, w.pol, w.fem, w.ten)), out = [];
  const mk = (l, why, fam, pol, fem, ten, dp) => {
    const v = ipiFrom(dp ?? w.dp, ampOf(fam, pol, fem, ten));
    if (v !== base) out.push({ l, why, v, d: v - base });
  };
  // เหลือเฉพาะสององค์ประกอบที่อ่านเป็นความสัมพันธ์ได้ — ครอบครัว / political ties / อายุงาน เป็นบริบท (R6, C1–C3)
  mk("องค์ประกอบกรรมการหญิงสูงกว่านี้ 10 จุด", "ค่าที่มีน้ำหนักมากที่สุดในสูตร", w.fam, w.pol, clamp(w.fem + .1, 0, 1), w.ten);
  mk("องค์ประกอบกรรมการหญิงต่ำกว่านี้ 10 จุด", "กรณีตำแหน่งที่ครบวาระไม่ได้เป็นผู้หญิง", w.fam, w.pol, clamp(w.fem - .1, 0, 1), w.ten);
  if (w.dp < 85) mk("ภาษาของ CEO สูงกว่านี้ 15 เปอร์เซ็นไทล์", "องค์ประกอบที่วัดจากสารถึงผู้ถือหุ้น ไม่เกี่ยวกับโครงสร้างบอร์ด",
    w.fam, w.pol, w.fem, w.ten, clamp(w.dp + 15, 0, 100));
  if (w.dp > 15) mk("ภาษาของ CEO ต่ำกว่านี้ 15 เปอร์เซ็นไทล์", "กรณีสารปีถัดไปใช้ภาษาเชิงระมัดระวังมากขึ้น",
    w.fam, w.pol, w.fem, w.ten, clamp(w.dp - 15, 0, 100));
  out.sort((a, b) => b.d - a.d);
  if (!out.length) return `<div class="note">ทุกการปรับที่ทดสอบให้ผลเท่าเดิม</div>`;
  return out.slice(0, 5).map(o => `<div style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
    <span class="pill ${o.d > 0 ? "ok" : "crit"}" style="width:64px;justify-content:center;font-size:11px">${o.d > 0 ? "+" : ""}${o.d}</span>
    <div style="flex:1"><div style="font-size:12.6px">${esc(o.l)}</div>
      <div style="font-size:10.8px;color:var(--ink-3)">${esc(o.why)}</div></div>
    <div class="num" style="font-size:13px;color:var(--ink-2)">OIS ${o.v}</div></div>`).join("")
    + `<div style="font-size:10px;color:var(--ink-3);margin-top:6px">ตัวเลข ± เป็นจุดเปอร์เซ็นไทล์ ${ASSOC}</div>`;
}
function persona(w, ipi) {
  const want = [];
  if (w.fem < .3) want.push("องค์ประกอบ<b>กรรมการหญิง</b>อยู่ต่ำกว่าช่วงที่สัมพันธ์กับการหนุนสัญญาณในฐานอ้างอิง (ความสัมพันธ์มีหลักฐานรองรับเมื่อ ≥ " + CRIT_N + " คน)");
  if (w.dp < 50) want.push("<b>ภาษาของ CEO</b> อยู่ในครึ่งล่างของฐานอ้างอิง — องค์ประกอบที่วัดจากสารถึงผู้ถือหุ้น");
  if (!want.length) want.push("ทั้งสององค์ประกอบอยู่ในช่วงที่สัมพันธ์กับคะแนนสูงในฐานอ้างอิง — ประเด็นที่อาจตรวจสอบต่อคือตำแหน่งเปลี่ยนอย่างไรเมื่อกรรมการครบวาระ");
  want.push("<span style=\"color:var(--ink-3)\">บริบท (ไม่ใช่คันโยก): กรรมการครอบครัว " + pct1(w.fam) + " · political ties " + (w.pol ? "มี" : "ไม่มี") + " · อายุงานไม่มีผลต่อคะแนน</span>");
  return `<div style="font-size:12.8px;line-height:1.85">
    ณ สถานะจำลองนี้ (OIS ${ipi} · CEO Promotion Focus เปอร์เซ็นไทล์ ${w.dp} · กรรมการหญิง ${pct1(w.fem)})
    คุณลักษณะเชิงโครงสร้างที่สัมพันธ์กับคะแนนคือ</div>
    <ul style="margin:9px 0 0;padding-left:19px;font-size:12.5px;line-height:1.85;color:var(--ink-2)">
      ${want.map(x => `<li>${x}</li>`).join("")}</ul>
    <div class="note" style="margin-top:12px;font-size:10.8px">
      ข้อความนี้อธิบาย<b>คุณสมบัติเชิงโครงสร้าง</b>ที่โมเดลชี้ว่าสัมพันธ์กับผลลัพธ์ ไม่ใช่การชี้ตัวบุคคล
      ไม่ใช่คำแนะนำการสรรหา และห้ามใช้เป็นเกณฑ์คัดเลือกผู้สมัครรายคน (PDPA มาตรา 26)</div>`;
}

/* ============================================================================
   เครื่องนับคำ — แปลงข้อความ CEO เป็นคะแนน Promotion focus
   ใช้พจนานุกรมเปิด (ไทย + อังกฤษ) ไม่ใช่ซอฟต์แวร์ LIWC ที่มีลิขสิทธิ์
   ============================================================================ */
function countWords(t) {
  const th = (t.match(/[฀-๿]/g) || []).length;
  const en = (t.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  return Math.max(1, Math.round(th / 4.5) + en);   // ไทยไม่มีช่องว่าง ประมาณ 4.5 อักขระ/คำ
}
function hits(text, list) {
  const low = text.toLowerCase(), out = {};
  let n = 0;
  for (const w of list) {
    const k = w.toLowerCase();
    let i = 0, c = 0;
    while ((i = low.indexOf(k, i)) !== -1) { c++; i += k.length; }
    if (c) { out[w] = c; n += c; }
  }
  return { n, map: out };
}
/** จุดยึดสำหรับแปลง “ความเอียงไปทางคำเชิงรุก” เป็นเปอร์เซ็นไทล์ CEO Promotion Focus
 *  ใช้สัดส่วน pro/(pro+pre) ซึ่งไม่ขึ้นกับความกว้างของพจนานุกรมและความยาวข้อความ
 *  จึงเทียบข้ามเอกสารได้ ต่างจากการนับ “คำต่อร้อยคำ” ที่ขึ้นกับพจนานุกรมโดยตรง */
const TILT_ANCHOR = [[.15, 5], [.25, 15], [.33, 30], [.40, 50], [.50, 72], [.60, 88], [.72, 96]];
function tiltToPct(x) {
  const A = TILT_ANCHOR;
  if (x <= A[0][0]) return A[0][1];
  if (x >= A[A.length - 1][0]) return A[A.length - 1][1];
  for (let i = 1; i < A.length; i++)
    if (x <= A[i][0]) {
      const [x0, y0] = A[i - 1], [x1, y1] = A[i];
      return Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0));
    }
  return 50;
}
function analyseText(t) {
  const wc = countWords(t);
  const pro = hits(t, LEX.promotion.th.concat(LEX.promotion.en));
  const pre = hits(t, LEX.prevention.th.concat(LEX.prevention.en));
  const tot = pro.n + pre.n;
  const tilt = tot ? pro.n / tot : .5;                 // 0 = ป้องกันล้วน · 1 = รุกล้วน
  const rate = pro.n / wc * 100;                       // อัตราคำเชิงรุกต่อ 100 คำ (ตัวประกอบ)
  return { wc, pro, pre, tot, tilt, rate, dp: tiltToPct(tilt) };
}

/** ไฮไลต์คำที่นับได้ในข้อความ เพื่อให้ตรวจย้อนกลับได้ */
function highlight(t, r) {
  const marks = [];
  const add = (list, cls) => Object.keys(list).forEach(w => {
    const low = t.toLowerCase(), k = w.toLowerCase();
    let i = 0;
    while ((i = low.indexOf(k, i)) !== -1) { marks.push([i, i + k.length, cls]); i += k.length; }
  });
  add(r.pro.map, "hi"); add(r.pre.map, "hi prev");
  marks.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let out = "", pos = 0;
  for (const [a, b, cls] of marks) {
    if (a < pos) continue;
    out += esc(t.slice(pos, a)) + `<span class="${cls}">${esc(t.slice(a, b))}</span>`;
    pos = b;
  }
  return out + esc(t.slice(pos));
}
function renderCeoOut(t, r) {
  const c = cur();
  const top = m => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12);
  $("#ceoOut").innerHTML = `
    <div class="grid g4 tight" style="gap:8px;margin-bottom:11px">
      ${[[fmt(r.wc), "จำนวนคำโดยประมาณ"], [fmt(r.pro.n), "คำเชิงรุก"], [fmt(r.pre.n), "คำเชิงป้องกัน"],
      [fmt(r.tilt * 100, 0) + "%", "ความเอียงไปทางเชิงรุก"]].map(([v, k]) =>
        `<div class="stat" style="padding:9px 11px"><div class="v num" style="font-size:19px">${v}</div><div class="k">${k}</div></div>`).join("")}
    </div>
    <div style="margin:0 0 4px;font-size:11.5px;color:var(--ink-3)">สัดส่วนคำเชิงรุกต่อคำที่บ่งทิศทางทั้งหมด</div>
    <div style="display:flex;height:14px;border-radius:99px;overflow:hidden;gap:2px;background:var(--panel-2)">
      <div style="width:${r.tilt * 100}%;background:var(--s3)"></div>
      <div style="width:${(1 - r.tilt) * 100}%;background:var(--s2)"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3);margin-top:3px">
      <span>เชิงรุก ${r.pro.n} คำ</span><span>เชิงป้องกัน ${r.pre.n} คำ</span></div>
    <div class="note ${r.dp >= c.dp ? "ok" : "warn"}" style="margin-top:11px">
      <b>CEO Promotion Focus จากข้อความนี้ = ${r.dp} / 100</b> · ค่าจริงของ ${esc(c.t)} ที่วัดจากรายงานประจำปีคือ ${c.dp}
      ${r.dp >= c.dp ? "— ข้อความที่วางมาใช้ภาษาเชิงรุก<b>มากกว่า</b>ที่ระบบวัดได้จากเอกสารจริง"
      : "— ข้อความที่วางมาใช้ภาษาเชิงรุก<b>น้อยกว่า</b>ที่ระบบวัดได้จากเอกสารจริง"}
      ${r.wc < 200 ? `<br><b>⚠ ข้อความสั้น (${fmt(r.wc)} คำ)</b> ผลยังไม่เสถียร ควรใช้อย่างน้อย 300 คำขึ้นไป` : ""}
      ${r.tot < 10 ? `<br><b>⚠ พบคำที่บ่งทิศทางเพียง ${r.tot} คำ</b> ค่าที่ได้อาจไม่สะท้อนสไตล์จริง` : ""}</div>
    <details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;color:var(--ink-2)">ดูคำที่ระบบนับได้ · ตำแหน่งในข้อความ · วิธีแปลงเป็นคะแนน</summary>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin:10px 0">
        ${top(r.pro.map).map(([w, n]) => `<span class="pill ok" style="font-size:10.5px">${esc(w)} ×${n}</span>`).join("") || '<span style="font-size:11.5px;color:var(--ink-3)">ไม่พบคำเชิงรุก</span>'}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin:0 0 10px">
        ${top(r.pre.map).map(([w, n]) => `<span class="pill warn" style="font-size:10.5px">${esc(w)} ×${n}</span>`).join("") || '<span style="font-size:11.5px;color:var(--ink-3)">ไม่พบคำเชิงป้องกัน</span>'}</div>
      <div style="max-height:190px;overflow:auto;font-size:12px;line-height:1.85;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:11px;white-space:pre-wrap">${highlight(t, r)}</div>
      <div class="legend"><span><i style="background:var(--s3)"></i>คำเชิงรุก</span><span><i style="background:var(--s2)"></i>คำเชิงป้องกัน</span></div>
      <div class="note" style="margin-top:11px">
        <b>วิธีแปลงเป็นคะแนน</b> — ระบบใช้ <b>สัดส่วน</b> คำเชิงรุกต่อคำที่บ่งทิศทางทั้งหมด ไม่ใช่จำนวนคำต่อร้อยคำ
        เพราะสัดส่วนไม่ขึ้นกับความกว้างของพจนานุกรมและความยาวเอกสาร จึงเทียบข้ามเอกสารได้
        แล้วแปลงด้วยตารางจุดยึดนี้<br>
        <span class="mono" style="font-size:10.5px">${TILT_ANCHOR.map(([x, y]) => fmt(x * 100, 0) + "% → " + y).join(" · ")}</span><br>
        อัตราดิบของข้อความนี้คือ ${fmt(r.rate, 2)} คำเชิงรุกต่อ 100 คำ (แสดงไว้เป็นข้อมูลประกอบ ไม่ได้ใช้คิดคะแนน)<br>
        จุดยึดตั้งไว้ให้ค่ากลางอยู่ที่สัดส่วน 40% ไม่ใช่ 50% เพราะรายงานประจำปีไทยมีภาษาเชิงกำกับดูแล
        และการปฏิบัติตามกฎระเบียบอยู่มากโดยธรรมชาติ ทำให้ฝั่งเชิงป้องกันสูงกว่าปกติ —
        <b>ตัวเลขชุดนี้ยังเป็นค่าชั่วคราว</b> ต้องปรับเทียบใหม่กับคลังเอกสารที่ให้คะแนนด้วย LIWC จริงก่อนใช้งานจริง<br>
        <b>ข้อจำกัด</b> — นี่คือพจนานุกรมเปิดที่เขียนขึ้นเอง <b>ไม่ใช่ซอฟต์แวร์ LIWC</b> ที่มีลิขสิทธิ์
        ผลใช้แทนกันได้ในเชิงทิศทาง แต่ถ้าต้องการค่าที่ตรงกับงานวิจัยต้องประมวลผลด้วย LIWC จริงแล้วกรอกค่าเข้ามา</div>
    </details>`;
}
async function readFileText(f) {
  if (/\.pdf$/i.test(f.name)) {
    const buf = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let t = "";
    const N = Math.min(pdf.numPages, 60);
    for (let p = 1; p <= N; p++) {
      const pg = await pdf.getPage(p);
      const tc = await pg.getTextContent();
      t += tc.items.map(i => i.str).join(" ") + "\n";
    }
    return t;
  }
  return f.text();
}
const SAMPLE = `สารจากประธานกรรมการ
ปี 2566 เป็นปีที่บริษัทเติบโตอย่างมีนัยสำคัญ เรามุ่งมั่นขยายธุรกิจเข้าสู่ตลาดใหม่ และเร่งพัฒนานวัตกรรมอย่างต่อเนื่อง
บริษัทได้ลงนามบันทึกความเข้าใจกับพันธมิตรเชิงกลยุทธ์ 3 ราย และจัดตั้งกิจการร่วมทุนเพื่อพัฒนาแพลตฟอร์มดิจิทัลร่วมกัน
เรามองเห็นโอกาสในการก้าวสู่การเป็นผู้นำตลาดภูมิภาค ด้วยวิสัยทัศน์ที่ชัดเจนและการลงทุนเพิ่มในเทคโนโลยีใหม่
ขณะเดียวกัน บริษัทให้ความสำคัญกับการบริหารความเสี่ยง การกำกับดูแลกิจการที่ดี และการปฏิบัติตามกฎระเบียบอย่างเคร่งครัด
เพื่อรักษาความมั่นคงและป้องกันผลกระทบที่อาจเกิดขึ้นในระยะยาว`;

/* ============================================================================
   หน้า 5 · ภาพรวมอุตสาหกรรม (ซื้อรายอุตสาหกรรม)
   ============================================================================ */
function viewSector() {
  if (S.ind === "all")
    return pageHead("ขยายขอบเขต", "ภาพรวมรายอุตสาหกรรม",
      "ซื้อสิทธิ์ดูทั้งอุตสาหกรรมได้ทีละกลุ่ม — เห็นทุกบริษัทในกลุ่ม การกระจายตัวของคะแนน และรายชื่อผู้นำกับผู้ตาม")
      + `<div class="card"><div style="text-align:center;padding:26px 10px">
        <div style="font-size:30px;margin-bottom:8px">▦</div>
        <h3 style="font-size:16px">เลือกอุตสาหกรรมก่อน</h3>
        <p style="font-size:12.5px;color:var(--ink-2);max-width:52ch;margin:7px auto 16px">
          ตัวเลือกด้านบนกำลังตั้งเป็น “ทุกอุตสาหกรรม” — เลือกกลุ่มที่สนใจก่อน แล้วระบบจะแสดงราคาและตัวอย่างเนื้อหาให้ดู</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          ${Object.entries(IND).map(([k, v]) => `<button class="btn s" data-setind="${k}">${esc(v)} · ${indComps(+k).length}</button>`).join("")}
        </div></div></div>`;

  const i = +S.ind, pool = indComps(i).slice().sort((a, b) => b.ipi - a.ipi);
  const st = qstats(pool.map(x => x.ipi)), ist = DATA.indstats[i];
  const zc = k => pool.filter(x => zoneOf(x.promo, x.amp) === k).length;
  const inner = `
  <div class="grid g4 tight" style="gap:10px;margin-bottom:14px">
    <div class="stat hero"><div class="k">บริษัทในกลุ่ม</div><div class="v num">${pool.length}</div><div class="u">${esc(IND[i])}</div></div>
    <div class="stat"><div class="k">OIS มัธยฐานของกลุ่ม</div><div class="v num">${fmt(st.med)}</div>
      <div class="u">ทั้งตลาด ${fmt(qstats(IPI_ALL).med)}</div></div>
    <div class="stat"><div class="k">อยู่โซน Deliver</div><div class="v num" style="color:var(--ok)">${zc("A")}</div>
      <div class="u">${fmt(zc("A") / pool.length * 100, 0)}% ของกลุ่ม</div></div>
    <div class="stat"><div class="k">อยู่โซน Develop</div><div class="v num" style="color:var(--serious)">${zc("C")}</div>
      <div class="u">${fmt(zc("C") / pool.length * 100, 0)}% ของกลุ่ม</div></div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3>ตารางจัดอันดับทั้งกลุ่ม</h3>
    <p class="desc">คลิกแถวใดก็ได้เพื่อเปิดรายงานของบริษัทนั้น · แถบใต้ OIS คือตำแหน่งเทียบทั้งตลาด</p>
    <div class="tw" style="max-height:520px;overflow:auto"><table>
      <thead style="position:sticky;top:0;background:var(--panel);z-index:2"><tr>
        <th class="n">#</th><th>บริษัท</th><th>โซน</th><th class="n">OIS</th>
        <th class="n">CEO Promotion Focus</th><th class="n">Board Amp</th><th class="n">กก.หญิง</th>
        <th class="n">ครอบครัว (บริบท)</th><th class="n">อายุงาน (บริบท)</th><th class="n">นวัตกรรมเปิด</th></tr></thead>
      <tbody>${pool.map((x, k) => {
        const zz = ZONES[zoneOf(x.promo, x.amp)];
        return `<tr data-co="${x.t}" style="cursor:pointer"${x.t === S.t ? ' class="hl"' : ""}>
          <td class="n" style="color:var(--ink-3)">${k + 1}</td>
          <td><b>${esc(x.t)}</b> <span style="color:var(--ink-3)">${esc(x.n)}</span></td>
          <td><span class="pill" style="border-color:${zz.c};color:${zz.c};font-size:9.5px">${zz.l}</span></td>
          <td class="n"><b>${x.ipi}</b><div class="mbar" style="height:4px;margin-top:2px"><span style="width:${x.ipi}%;background:${rampAt(x.ipi)}"></span></div></td>
          <td class="n">${x.dp}</td><td class="n">${ampPct(x.amp)}</td>
          <td class="n">${pct1(x.fem)}</td><td class="n">${pct1(x.fam)}</td>
          <td class="n">${fmt(x.ten, 1)}</td><td class="n">${x.oi}</td></tr>`;
      }).join("")}</tbody></table></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn s" id="btnSecCsv">ส่งออกตาราง (CSV)</button>
      <button class="btn g" data-goto="matrix">ดูทั้งกลุ่มบนเมทริกซ์</button></div>
  </div>

  <div class="grid g2">
    <div class="card"><h3>การกระจายตัวของ OIS ในกลุ่ม</h3>
      <p class="desc">เทียบกับทั้งตลาด — บอกว่าอุตสาหกรรมนี้โดยรวมนำหรือตาม</p>
      ${boxplot(pool.map(x => x.ipi), st.med, `${IND[i]} · n = ${pool.length}`)}
      ${boxplot(IPI_ALL, qstats(IPI_ALL).med, `ทั้งตลาด · n = ${COMPS.length}`)}
      <div class="note ${st.med >= qstats(IPI_ALL).med ? "ok" : "warn"}" style="margin-top:8px">
        มัธยฐานของกลุ่มนี้ ${fmt(st.med)} ${st.med >= qstats(IPI_ALL).med ? "สูงกว่า" : "ต่ำกว่า"}ทั้งตลาด (${fmt(qstats(IPI_ALL).med)})</div>
    </div>
    <div class="card"><h3>ค่ากลางองค์ประกอบบอร์ดของกลุ่ม</h3>
      <p class="desc">ค่าเฉลี่ยของบริษัทในกลุ่ม ปีบัญชี 2566 — ใช้เทียบตำแหน่งเท่านั้น ไม่ใช่เป้าหมายที่แนะนำ</p>
      ${bars([
        { l: "สัดส่วนกรรมการหญิง", v: ist.fem * 100, t: pct1(ist.fem), c: "var(--s1)" },
        { l: "สัดส่วนกรรมการครอบครัว", v: ist.fam * 100, t: pct1(ist.fam), c: "var(--s2)" },
        { l: "มี political ties (บริบท)", v: ist.pol * 100, t: pct1(ist.pol), c: "var(--s3)" },
        { l: "อายุงานเฉลี่ยบอร์ด (บริบท · ปี)", v: ist.ten * 4, t: fmt(ist.ten, 1) + " ปี", c: "var(--q4)" },
        { l: "Promotion focus (×50)", v: ist.promo * 50, t: fmt(ist.promo, 2), c: "var(--q5)" },
      ], { lw: 165, max: 100 })}
      <div style="font-size:10.5px;color:var(--ink-3);margin-top:8px">
        สองแถวล่างปรับสเกลเพื่อให้เทียบยาวกันได้ ตัวเลขทางขวาคือค่าจริง</div>
    </div>
  </div>`;

  const head = pageHead("ขยายขอบเขต", IND[i],
    `ภาพรวมทั้งกลุ่ม ${indComps(i).length} บริษัท — ตารางจัดอันดับ การกระจายตัวของคะแนน และค่ากลางองค์ประกอบบอร์ดที่ใช้เป็นเกณฑ์อ้างอิง`);
  return head + (isUnlocked("sector", S.ind) ? inner
    : paywall(inner, "sector", "ภาพรวมอุตสาหกรรม " + IND[i],
      `ปลดล็อกทั้งกลุ่ม ${indComps(i).length} บริษัท — ตารางจัดอันดับเต็ม ค่าองค์ประกอบบอร์ดรายบริษัท และไฟล์ CSV ส่งออก
       <br>ซื้อครั้งเดียว ใช้ได้ตลอดกับอุตสาหกรรมนี้`, PRICE.sector, "หรือชำระรายครั้ง 990 บาท"));
}

/* ============================================================================
   หน้า 6 · Token และการชำระเงิน
   ============================================================================ */
function viewBilling() {
  const used = S.log.reduce((a, b) => a + b.cost, 0);
  return pageHead("บัญชีของคุณ", "Token และการชำระเงิน",
    "ระบบคิดค่าบริการแบบตัด token รายครั้ง ไม่มีค่าสมาชิกรายเดือน — ผู้ใช้จ่ายเฉพาะรายงานที่เปิดจริง")
    + `<div class="grid g4 tight" style="gap:10px;margin-bottom:16px">
      <div class="stat hero"><div class="k">token คงเหลือ</div><div class="v num">${S.credits}</div>
        <div class="u">${S.credits ? "พร้อมใช้งาน" : "หมดแล้ว — เติมเพื่อใช้งานต่อ"}</div></div>
      <div class="stat"><div class="k">ใช้ไปแล้ว</div><div class="v num">${used}</div><div class="u">${S.log.length} รายการ</div></div>
      <div class="stat"><div class="k">รายงานฟรีของคุณ</div><div class="v" style="font-size:19px">${S.freeCo || "ยังไม่ได้ใช้"}</div>
        <div class="u">${S.freeCo ? "ใช้สิทธิ์ไปแล้ว" : "ดูฟรีได้ 1 บริษัท"}</div></div>
      <div class="stat"><div class="k">อุตสาหกรรมที่ซื้อแล้ว</div><div class="v num">${Object.keys(S.sectors).length}</div>
        <div class="u">${Object.keys(S.sectors).map(k => IND[k]).join(" · ") || "ยังไม่ได้ซื้อ"}</div></div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>แผนการใช้งาน</h3>
      <p class="desc">token ใช้จ่ายค่ารายงานรายครั้ง ส่วน <b>แผน</b> เป็นตัวกำหนดว่าเปิดฟีเจอร์เชิงลึกได้หรือไม่ — สองอย่างนี้แยกกัน</p>
      <div class="grid g2">
        <div style="border:1px solid ${S.plan === "free" ? "var(--brand)" : "var(--line)"};border-radius:var(--radius);padding:16px;background:${S.plan === "free" ? "color-mix(in srgb,var(--brand) 5%,var(--panel))" : "var(--panel)"}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <b style="font-size:15px">Free User</b>
            ${S.plan === "free" ? `<span class="pill ok">แผนปัจจุบัน</span>` : ""}</div>
          <div style="font-size:12.3px;color:var(--ink-2);line-height:1.65;margin-top:6px">
            เริ่มต้น 3 token · รายงานบริษัทของตัวเองฟรี · เทียบคู่แข่งและภาพรวมอุตสาหกรรมจ่ายด้วย token<br>
            Validity แสดงเป็นผลสรุปและ remark</div>
        </div>
        <div style="border:1px solid ${S.plan === "pro" ? "var(--brand)" : "var(--line)"};border-radius:var(--radius);padding:16px;background:${S.plan === "pro" ? "color-mix(in srgb,var(--brand) 5%,var(--panel))" : "var(--panel)"}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <b style="font-size:15px">Pro Plan (Token based)</b>
            ${S.plan === "pro" ? `<span class="pill ok">แผนปัจจุบัน</span>` : ""}</div>
          <div style="font-size:12.3px;color:var(--ink-2);line-height:1.65;margin-top:6px">
            เริ่มต้น ${PLAN_TOKENS.pro} token · เปิด <b>What-if Studio</b> และ <b>ตาราง Validity รายปี</b>
            ซึ่งใช้ token ปลดไม่ได้ · ค่ารายงานคิด token เท่ากับ Free</div>
          ${S.plan === "pro" ? "" : `<button class="btn p" data-pro="1" style="width:100%;justify-content:center;margin-top:12px">เปลี่ยนเป็นแผน Pro</button>`}
        </div>
      </div>
      <div class="note" style="margin-top:13px">ต้นแบบยังไม่เชื่อมระบบชำระเงิน จึงสลับแผนได้ทันทีเพื่อสาธิต ·
        ระบบจริงจะผูกแผนกับการชำระเงินและออกใบเสร็จทุกครั้ง</div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>แพ็กเกจ token</h3>
      <p class="desc">1 token = เปิดรายงาน 1 ครั้ง · tokenไม่หมดอายุ · ต้นแบบนี้จำลองการชำระเงิน ไม่มีการตัดบัตรจริง</p>
      <div class="grid g3">${PACKS.map((p, i) => `
        <div style="border:1px solid ${i === 1 ? "var(--brand)" : "var(--line)"};border-radius:var(--radius);padding:17px;position:relative;background:${i === 1 ? "color-mix(in srgb,var(--brand) 5%,var(--panel))" : "var(--panel)"}">
          ${p.tag ? `<span class="pill ok" style="position:absolute;top:-9px;left:15px;background:var(--brand);color:var(--brand-ink);border-color:transparent">${p.tag}</span>` : ""}
          <div style="font-size:29px;font-weight:500;letter-spacing:-.03em">${p.n}<span style="font-size:14px;color:var(--ink-3);font-weight:300"> token</span></div>
          <div style="font-size:15px;margin:3px 0 2px">฿${fmt(p.baht)}</div>
          <div style="font-size:11px;color:var(--ink-3)">เฉลี่ย ฿${fmt(p.baht / p.n, 0)} ต่อรายงาน${p.save ? ` · ประหยัด ${p.save}%` : ""}</div>
          <button class="btn ${i === 1 ? "p" : "s"}" data-buy="${p.n}" style="width:100%;justify-content:center;margin-top:13px">เลือกแพ็กเกจนี้</button>
        </div>`).join("")}</div>
      <div class="note brand" style="margin-top:14px">
        <b>ทำไมคิดเป็นtoken ไม่ใช่รายเดือน</b> — ผู้ใช้กลุ่มเป้าหมาย (ที่ปรึกษา HRD · นักวิเคราะห์ · ฝ่ายเลขานุการบริษัท)
        ใช้งานเป็นครั้ง ๆ ตามดีลหรือตามรอบประชุม การคิดรายเดือนจึงเป็นกำแพงเข้าใช้งาน
        ส่วน token ทำให้ทดลองก่อนแล้วค่อยจ่ายตามที่ใช้จริงได้</div>
    </div>

    <div class="grid g2">
      <div class="card"><h3>อัตราค่าบริการ</h3>
        <div class="tw"><table><thead><tr><th>รายการ</th><th class="n">token</th><th>หมายเหตุ</th></tr></thead><tbody>
          <tr><td>รายงานวินิจฉัยรายบริษัท</td><td class="n"><b>${PRICE.report}</b></td><td style="color:var(--ink-2)">บริษัทแรกฟรี · ปลดล็อกแล้วดูซ้ำไม่เสียเพิ่ม</td></tr>
          <tr><td>เทียบคู่แข่ง 3 ราย</td><td class="n"><b>${PRICE.peer}</b></td><td style="color:var(--ink-2)">เปลี่ยนคู่แข่งได้ไม่จำกัดหลังปลดล็อก</td></tr>
          <tr><td>What-if Studio · ตรวจข้อความ CEO</td><td class="n"><b>Pro</b></td><td style="color:var(--ink-2)">สิทธิ์ของแผน ใช้ token ปลดไม่ได้ · ใช้ได้ไม่จำกัดครั้งเมื่ออยู่แผน Pro</td></tr>
          <tr><td>Validity แยกรายปี</td><td class="n"><b>Pro</b></td><td style="color:var(--ink-2)">Free เห็นผลสรุปและ remark · Pro เห็นตารางเต็มรายปี</td></tr>
          <tr class="hl"><td>ภาพรวมทั้งอุตสาหกรรม</td><td class="n"><b>${PRICE.sector}</b></td><td style="color:var(--ink-2)">หรือชำระรายครั้ง 990 บาท</td></tr>
          <tr><td>เมทริกซ์ 2×2 · หลักฐานความแม่น</td><td class="n">ฟรี</td><td style="color:var(--ink-2)">เปิดให้ดูเสมอ เพื่อให้ประเมินได้ก่อนซื้อ</td></tr>
        </tbody></table></div></div>
      <div class="card"><h3>ประวัติการใช้ token</h3>
        <p class="desc">ระบบจริงจะออกใบเสร็จอิเล็กทรอนิกส์ทุกรายการ</p>
        ${S.log.length ? `<div class="tw" style="max-height:260px;overflow:auto"><table><thead><tr><th>รายการ</th><th>อ้างอิง</th><th class="n">token</th><th>เวลา</th></tr></thead><tbody>
          ${S.log.map(l => `<tr><td>${({ report: "รายงานวินิจฉัย", peer: "เทียบคู่แข่ง", studio: "What-if Studio", sector: "ภาพรวมอุตสาหกรรม", ceotext: "ตรวจข้อความ CEO" })[l.what] || l.what}</td>
            <td style="color:var(--ink-2)">${esc(l.label || l.t)}</td><td class="n">−${l.cost}</td>
            <td style="color:var(--ink-3);font-size:11px">${esc(l.at)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div style="text-align:center;padding:34px 10px;color:var(--ink-3);font-size:12.5px">ยังไม่มีการใช้ token</div>`}
        <button class="btn g" id="btnResetDemo" style="margin-top:12px;width:100%;justify-content:center">รีเซ็ตข้อมูลสาธิต (คืนtoken 3 และล้างสิทธิ์)</button>
      </div>
    </div>`;
}

/* ============================================================================
   หน้า 7 · สถาปัตยกรรมข้อมูล — สิ่งที่อาจารย์ต้องเห็นว่า “ระบบจริงซับซ้อนกว่า 4 หน้า”
   ============================================================================ */
function viewArch() {
  const box = (x, y, w, h, title, lines, fill, stroke) => `
    <g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <text x="${x + 14}" y="${y + 22}" font-size="12.5" font-weight="500" fill="var(--ink)">${title}</text>
    ${lines.map((l, i) => `<text x="${x + 14}" y="${y + 42 + i * 16}" font-size="10.8" fill="var(--ink-2)">${l}</text>`).join("")}</g>`;
  const arrow = (x1, y1, x2, y2, lab) => `
    <g><path d="M${x1} ${y1} L${x2} ${y2}" stroke="var(--ink-3)" stroke-width="1.6" marker-end="url(#a2)" fill="none"/>
    ${lab ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" font-size="10" fill="var(--ink-3)" text-anchor="middle">${lab}</text>` : ""}</g>`;

  return pageHead("ระบบและหลักฐาน", "สถาปัตยกรรมข้อมูลและแผนพัฒนา",
    "ที่มาของตัวเลขทุกตัวในระบบ และลำดับการต่อยอด — จากฐานอ้างอิง REF-928 ที่ freeze แล้ว ไปสู่การอัปโหลดเอกสารเอง และการเชื่อมต่อภายนอก")
    + pilotFormulaCard()
    + `<div class="card" style="margin-bottom:14px">
      <h3>ภาพรวมการไหลของข้อมูล</h3>
      <p class="desc">สีเข้ม = ทำแล้วในต้นแบบนี้ · เส้นประ = เฟสถัดไป</p>
      <svg viewBox="0 0 900 340" width="100%" role="img" aria-label="แผนภาพสถาปัตยกรรม">
        <defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 10 5 0 10z" fill="var(--ink-3)"/></marker></defs>
        <text x="10" y="16" font-size="10" fill="var(--ink-3)" letter-spacing="1">ต้นทาง</text>
        ${box(10, 26, 200, 96, "R / Stata · REF-928", ["ฟิตโมเดลจากแผงข้อมูล 5 ปี (928 บริษัท-ปี)", "ส่งออก parameter card · V̂f · ฐานอ้างอิง", "ไม่ส่งชื่อบริษัท/กรรมการออก"], "color-mix(in srgb,var(--s1) 10%,var(--panel))", "var(--s1)")}
        ${box(10, 138, 200, 84, "อัปโหลดเอกสารเอง", ["ผู้ใช้วาง PDF รายงานประจำปี", "ระบบนับคำในเบราว์เซอร์"], "color-mix(in srgb,var(--s3) 10%,var(--panel))", "var(--s3)")}
        ${box(10, 238, 200, 84, "การเชื่อมต่อ · เฟสถัดไป", ["OCR · LLM API · One Report · Email", "ดูหน้า “การเชื่อมต่อ”"], "var(--panel-2)", "var(--ink-3)")}
        ${arrow(212, 74, 296, 120)}${arrow(212, 180, 296, 160)}${arrow(212, 280, 296, 200, "")}
        ${box(298, 96, 210, 108, "ชั้นประมวลผล (API ฝั่งเซิร์ฟเวอร์)", ["cP × amp → Signal B", "mid-rank percentile เทียบ REF-928", "OpenInnoScore 0–100 · tier · quadrant"], "color-mix(in srgb,var(--brand) 9%,var(--panel))", "var(--brand)")}
        ${arrow(510, 150, 588, 90)}${arrow(510, 150, 588, 150)}${arrow(510, 150, 588, 214)}
        ${box(590, 44, 300, 84, "รายงานรายบริษัท", ["วินิจฉัย · เมทริกซ์ 2×2 · เทียบคู่แข่ง"], "var(--panel)", "var(--line)")}
        ${box(590, 140, 300, 66, "What-if และ Persona", ["จำลองบอร์ด · ตรวจข้อความ CEO"], "var(--panel)", "var(--line)")}
        ${box(590, 218, 300, 84, "ภาพรวมอุตสาหกรรม", ["ตารางจัดอันดับ · ส่งออก CSV", "คิดค่าบริการรายครั้งหรือตัด token"], "color-mix(in srgb,var(--accent) 12%,var(--panel))", "var(--accent)")}
      </svg>
    </div>

    <div class="grid g3" style="margin-bottom:14px">
      ${[["เฟส 1 · ทำแล้ว (ต้นแบบ)", "ok", [
      "ฐานอ้างอิง REF-928 (928 บริษัท-ปี, 2562–2566) ที่ freeze แล้ว — คะแนนตรงกับ STATA ทุกตำแหน่ง",
      "parameter card + V̂f (Krinsky–Robb 500 ชุด) + ฐานอ้างอิง อยู่ในไฟล์สัญญาโมเดล",
      "อัปโหลดรายงานประจำปีเองแล้วนับคำผ่านพจนานุกรมเปิดในเบราว์เซอร์",
      "Company Profile · รายงานวินิจฉัย · 2×2 · เทียบคู่แข่ง · What-if · token"]],
    ["เฟสถัดไป · ฉบับใช้งานจริง", "warn", [
      "ย้าย parameter card, V̂f และฐานอ้างอิงไปหลัง API ฝั่งเซิร์ฟเวอร์ (ความลับทางการค้า) — เบราว์เซอร์เห็นเฉพาะผลลัพธ์",
      "แผนการเชื่อมต่อ: OCR · LLM API (LIWC-22 แทนพจนานุกรมเปิด) · One Report input · Email — ดูหน้า “การเชื่อมต่อ”",
      "Google OAuth 2.0 · ช่องทางชำระเงินไทย (พร้อมเพย์ / บัตร) · บัญชีผู้ใช้ข้ามอุปกรณ์",
      "Pilot shadow log: บันทึก B_T1 คู่กับ B_EG ทุกครั้งที่ให้คะแนน (ดูการ์ดสูตรด้านบน)"]],
    ["นอกขอบเขต", "mute", [
      "การให้คะแนนรายบุคคล — ผิดหลัก PDPA มาตรา 26",
      "คำแนะนำการลงทุนหรือการซื้อขายหลักทรัพย์",
      "การอ้างเหตุ-ผลหรือการทำนาย — ระบบรายงานความสัมพันธ์และตำแหน่งเท่านั้น (R7)",
      "ข้อมูลเรียลไทม์ระดับวินาที"]]]
      .map(([t, cls, items]) => `<div class="card">
        <h3><span class="pill ${cls}">${t}</span></h3>
        <ul style="margin:11px 0 0;padding-left:18px;font-size:12.2px;line-height:1.9;color:var(--ink-2)">
          ${items.map(x => `<li>${x}</li>`).join("")}</ul></div>`).join("")}
    </div>

    <div class="card">
      <h3>ทำไมต้องส่งเป็น “ไฟล์สัญญาโมเดล” ไม่ใช่ข้อมูลดิบ</h3>
      <p class="desc">ประเด็นนี้สำคัญกับอาจารย์และกับกฎหมาย — ควรพูดในที่ประชุม</p>
      <div class="grid g2" style="gap:14px">
        <div class="note crit"><b>ถ้าส่งข้อมูลดิบให้ทีมเว็บ</b><br>
          แฟ้ม panel มีชื่อบริษัท ชื่อกรรมการ และชื่อ CEO อยู่ครบ การส่งออกจากเครื่องผู้วิจัย
          ทำให้เกิดภาระตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคลทันที และผลที่เว็บคำนวณอาจไม่ตรงกับที่รายงานในงานวิจัย
          เพราะฟิตใหม่คนละครั้ง</div>
        <div class="note ok"><b>ถ้าส่งเป็นไฟล์สัญญาโมเดล</b><br>
          ไฟล์บรรจุเฉพาะ<b>สัมประสิทธิ์</b> <b>เมทริกซ์ความแปรปรวนร่วม</b> และ<b>ค่าอ้างอิงสำหรับจัดเปอร์เซ็นไทล์</b>
          ซึ่งเป็นตัวเลขสรุป ย้อนกลับไปหาข้อมูลรายบริษัทไม่ได้ ทีมสถิติจึงส่งโมเดลข้ามทีมได้อย่างปลอดภัย
          และเว็บคำนวณได้ตรงกับที่รายงานทุกตำแหน่ง</div>
      </div>
      <div class="note" style="margin-top:12px"><b>สถานะปัจจุบัน</b> — ต้นแบบนี้ใช้ไฟล์สัญญาโมเดลที่ส่งออกจากแผงข้อมูล
        209 บริษัท 928 บริษัท-ปี (2562–2566) ประกอบด้วย parameter card (สัมประสิทธิ์ปฏิสัมพันธ์ 4 ตัว — ไม่แสดงค่าบนหน้าจอ)
        ค่าเฉลี่ยสำหรับ mean-centring จุดตัด winsorise เมทริกซ์ Cholesky ของ V̂f
        และ<b>ฐานอ้างอิง REF-928 (928 บริษัท-ปี)</b> สำหรับจัดเปอร์เซ็นไทล์แบบ mid-rank —
        รายชื่อ 196 บริษัทเป็นเพียงชุดแสดงผลปีบัญชี 2566 ไม่ใช่ฐานอ้างอิง ·
        <b>ฉบับใช้งานจริง</b>ต้องย้ายทั้งสามส่วนนี้ไปหลัง API ฝั่งเซิร์ฟเวอร์</div>
    </div>`;
}
/** การ์ดสลับสูตรที่แถบสถานะแสดง — B_EG (หลัก) / B_T1 (shadow · Caution) ตามแนวทาง Pilot Use case 2 */
function pilotFormulaCard() {
  const T1 = useT1(), alt = ((DATA.validYear || {}).alt || []);
  const row = n => alt.find(a => a[0].indexOf(n) === 0) || [];
  const cell = (r) => r.length ? `ρ ${fmt(r[2], 3)} · AUC ${fmt(r[3], 3)} · lift ${fmt(r[4], 2)}×` : "—";
  return `<div class="card" style="margin-bottom:14px">
    <h3>สูตรที่แถบสถานะแสดง — Pilot shadow log</h3>
    <p class="desc">สูตรหลักคือ <b>B_EG</b> (E5, g_T = 0) · สูตรทางเลือก <b>B_T1</b> (H1 + H4 เท่านั้น) บันทึกคู่กันเป็น shadow log
      เพื่อเปรียบเทียบตามแนวทาง Pilot — ทุกตัวชี้วัด validity ของ B_T1 ต่ำกว่าเกณฑ์ผ่าน จึงแสดงพร้อมป้าย Caution เสมอ</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span style="display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden">
        <button class="btn ${T1 ? "g" : "p"}" onclick="setPilotFormula('EG')" style="border-radius:0;padding:6px 14px;font-size:12px">B_EG (หลัก)</button>
        <button class="btn ${T1 ? "p" : "g"}" onclick="setPilotFormula('T1')" style="border-radius:0;padding:6px 14px;font-size:12px">B_T1 (shadow · Caution)</button></span>
      <span style="font-size:11.5px;color:var(--ink-2)">ตอนนี้แถบสถานะทุกหน้าแสดง <b>${T1 ? "B_T1" : "B_EG"}</b>${T1 ? " พร้อมป้าย Caution" : ""}</span>
    </div>
    <div class="tw" style="margin-top:10px"><table><thead><tr><th>สูตร</th><th>นิยาม</th><th>validity (pooled)</th><th>สถานะ</th></tr></thead><tbody>
      <tr${T1 ? "" : ' class="hl"'}><td><b>B_EG</b></td><td style="color:var(--ink-2)">cP × amp (δT ปิดด้วย evidence gate)</td><td>${cell(row("B_EG"))}</td><td><span class="pill ok">PASS · สูตรหลัก</span></td></tr>
      <tr${T1 ? ' class="hl"' : ""}><td><b>B_T1</b></td><td style="color:var(--ink-2)">cP × (ค่าคงที่ + น้ำหนักกรรมการหญิง × cW) — H1 + H4 เท่านั้น</td><td>${cell(row("B_T1"))}</td><td><span class="pill warn">CAUTION · shadow</span></td></tr>
    </tbody></table></div>
    <div style="font-size:10.8px;color:var(--ink-3);margin-top:8px">ผู้ใช้ Pro เห็นบรรทัด shadow B_T1 ใต้แถบสถานะเสมอ · ค่าสัมประสิทธิ์ของทั้งสองสูตรไม่แสดงบนหน้าจอ (ความลับทางการค้า)</div>
  </div>`;
}
/** สลับสูตรที่แสดง — เรียกจากปุ่มในหน้าสถาปัตยกรรม */
function setPilotFormula(f) {
  S.pilotFormula = f === "T1" ? "T1" : "EG"; save(); render();
  toast(S.pilotFormula === "T1" ? "แถบสถานะแสดง B_T1 (shadow · Caution)" : "แถบสถานะกลับไปแสดงสูตรหลัก B_EG");
}

/* ============================================================================
   หน้า 8 · หลักฐานความแม่น
   ============================================================================ */
/** E12 · เกณฑ์ตัดสิน validity ของโครงการ (กำหนด 24 ส.ค. 2569)
 *  Spearman ≥ .15 ผ่าน / ≥ .05 ควรระวัง · AUC ≥ .60 / ≥ .55 · Decile lift ≥ 2.0 / ≥ 1.3
 *  ตกข้อใดข้อหนึ่ง → FAIL · ผ่านครบสามข้อ → PASS · LOYO เป็นค่าที่รายงาน ไม่ใช่เกณฑ์ตัด */
const VTH = OIS.vth || { sp: [.15, .05], auc: [.60, .55], lift: [2.0, 1.3] };
const gradeOf = (v, t) => v >= t[0] ? "pass" : v >= t[1] ? "caution" : "fail";
function verdict3(r) {
  const g = [gradeOf(r.sp, VTH.sp), gradeOf(r.auc, VTH.auc), gradeOf(r.lift, VTH.lift)];
  return g.includes("fail") ? "FAIL" : g.includes("caution") ? "CAUTION" : "PASS";
}
function validity4() {
  const VY = DATA.validYear, a = VY.all, Y = VY.byYear;
  const rows = [
    { k: "sp", n: "สหสัมพันธ์อันดับ (Spearman)", v: a.sp, d: 3, g: gradeOf(a.sp, VTH.sp),
      rule: "≥ 0.15 ผ่าน · ≥ 0.05 ควรระวัง", what: "คะแนนเรียงลำดับจำนวนกิจกรรม open innovation ได้ตรงแค่ไหน",
      why: "ลำดับที่ได้ไม่ต่างจากการเรียงแบบสุ่มมากพอ ส่วนต่างคะแนนเล็กน้อยระหว่างสองบริษัทจึงไม่ถือเป็นหลักฐานว่าต่างกันจริง" },
    { k: "auc", n: "อำนาจจำแนก (AUC)", v: a.auc, d: 3, g: gradeOf(a.auc, VTH.auc),
      rule: "≥ 0.60 ผ่าน · ≥ 0.55 ควรระวัง", what: "แยกบริษัทที่ open innovation อยู่ใน tercile บนออกจากที่เหลือได้ไหม",
      why: "การแยกกลุ่มเข้าใกล้การเดาสุ่ม (จุดอ้างอิงที่ไม่มีความสัมพันธ์คือ 0.50)" },
    { k: "lift", n: "Decile lift", v: a.lift, d: 2, g: gradeOf(a.lift, VTH.lift),
      rule: "≥ 2.0 ผ่าน · ≥ 1.3 ควรระวัง", what: "ค่าเฉลี่ย open innovation ของเดไซล์บนสุด หารด้วยเดไซล์ล่างสุด",
      why: "ระยะห่างเชิงปฏิบัติระหว่างกลุ่มบนกับกลุ่มล่างน้อยเกินกว่าจะใช้ตัดสินใจ" },
  ];
  const vd = verdict3(a);
  const byYearV = Object.fromEntries(Object.entries(Y).map(([y, r]) => [y, verdict3(r)]));
  const failYears = Object.entries(byYearV).filter(([, v]) => v === "FAIL").map(([y]) => +y + 543);
  return { rows, failed: rows.filter(r => r.g !== "pass"), verdict: vd, strong: vd === "PASS",
           all: a, byYear: Y, byYearV, failYears, thresh: VTH,
           loyo: { v: a.loyo, n: "Leave-one-year-out (LOYO)", d: 3,
                   what: "fit บนปีอื่นแล้ววัดกับปีที่เหลือ", note: "ค่าที่รายงาน ไม่ใช่เกณฑ์ตัด" } };
}
/** remark สองระดับที่แนบไปกับรายงานทุกฉบับ */
function validRemark() {
  const v = validity4();
  if (v.strong) return { k: "ok", l: "Validity: PASS (pooled)", th: "ผ่านเกณฑ์ทั้งสามข้อบนแผงข้อมูลรวม",
    d: `ρ ${fmt(v.all.sp, 3)} · AUC ${fmt(v.all.auc, 3)} · lift ${fmt(v.all.lift, 2)}× บน 928 บริษัท-ปี` +
       (v.failYears.length ? ` — แต่ปี ${v.failYears.join(", ")} ไม่ผ่านเกณฑ์ ต้องอ่านผลของปีนั้นอย่างระมัดระวัง` : "") };
  return { k: "warn", l: "Use result with cautious", th: "ใช้ผลอย่างระมัดระวัง",
    d: `ไม่ผ่าน ${v.failed.length} จาก 3 เกณฑ์ — ` +
       v.failed.map(f => `<b>${f.n}</b> (เกณฑ์ ${f.rule}) ${f.why}`).join(" · ") };
}
function viewValid() {
  const VY = DATA.validYear;
  const vv = validity4(), rm = validRemark();
  const yrs = Object.entries(VY.byYear);
  const GR = { pass: ["ผ่านเกณฑ์", "ok"], caution: ["ควรระวัง", "warn"], fail: ["ไม่ผ่าน", "crit"] };
  const VD = { PASS: ["✓ PASS", "ok"], CAUTION: ["⚠ CAUTION", "warn"], FAIL: ["✕ FAIL", "crit"] };

  // เดไซล์คำนวณสดจากบริษัทในฐานอ้างอิงของต้นแบบ โดยใช้คะแนนของโมเดลใหม่
  const sorted = [...COMPS].sort((a, b) => a.B - b.B);
  const dec = Array.from({ length: 10 }, (_, i) => {
    const g = sorted.slice(Math.floor(i * sorted.length / 10), Math.floor((i + 1) * sorted.length / 10));
    return g.reduce((t, x) => t + (x.oi || 0), 0) / (g.length || 1);
  });
  const mxd = Math.max(...dec), liftLocal = dec[0] > 0 ? dec[9] / dec[0] : null;

  const cards = `<div class="grid g4 tight" style="gap:10px;margin-bottom:14px">
      ${vv.rows.map(r => `<div class="stat"><div class="k">${esc(r.n)}</div>
        <div class="v num">${fmt(r.v, r.d)}${r.k === "lift" ? "×" : ""}</div>
        <div class="u"><span class="pill ${GR[r.g][1]}">${GR[r.g][0]}</span>
          <span style="color:var(--ink-3)"> ${esc(r.rule)}</span></div></div>`).join("")}
      <div class="stat"><div class="k">${esc(vv.loyo.n)}</div>
        <div class="v num">${fmt(vv.loyo.v, 3)}</div>
        <div class="u"><span class="pill mute">รายงาน</span><span style="color:var(--ink-3)"> ${esc(vv.loyo.note)}</span></div></div>
    </div>`;

  const decCard = `<div class="card" style="margin-bottom:14px">
      <h3>ยิ่งคะแนนสูง กิจกรรมนวัตกรรมเปิดยิ่งมากจริงหรือไม่</h3>
      <p class="desc">แบ่งบริษัทในชุดแสดงผลปีบัญชี 2566 (${COMPS.length} บริษัท — ไม่ใช่ฐานอ้างอิง REF-928) เป็น 10 กลุ่มเท่า ๆ กันตามคะแนน Signal B
        แล้วดูค่าเฉลี่ยกิจกรรมนวัตกรรมเปิดจริงของแต่ละกลุ่ม ถ้าคะแนนใช้ได้ แท่งควรไต่ขึ้นจากซ้ายไปขวา ·
        ค่า Decile lift ${fmt(VY.all.lift, 2)}× ในการ์ดด้านบนคำนวณบนแผงเต็ม ${VY.all.n} บริษัท-ปี จึงไม่เท่ากับภาพนี้พอดี</p>
      <div style="display:flex;align-items:flex-end;gap:6px;height:150px;margin:14px 0 6px">
        ${dec.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px">
          <div style="font-size:11px;color:var(--ink-2)" class="num">${fmt(v, 1)}</div>
          <div style="width:100%;height:${Math.max(v / mxd * 108, 1)}px;background:${rampAt(i * 11)};border-radius:4px 4px 0 0"></div>
          <div style="font-size:9.5px;color:var(--ink-3)">${i + 1}</div></div>`).join("")}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3)">
        <span>← กลุ่มคะแนนต่ำสุด</span><span>กลุ่มที่ 1–10 ตามคะแนน Signal B</span><span>กลุ่มคะแนนสูงสุด →</span></div>
      <div class="note" style="margin-top:12px">กลุ่มบนสุดเฉลี่ย ${fmt(dec[9], 1)} รายการต่อปี เทียบกลุ่มล่างสุด ${fmt(dec[0], 1)}
        ${liftLocal ? "คิดเป็น " + fmt(liftLocal, 2) + " เท่าในภาพตัดขวางปีนี้" : ""} ·
        <b>ไม่ได้ไต่ขึ้นเป็นเส้นตรงทุกขั้น</b> ซึ่งเป็นเรื่องปกติของข้อมูลนับที่ผันผวนสูง และตัวเลขนี้เป็นผลเชิงพรรณนาในตัวอย่าง ไม่ใช่การทดสอบ</div>
    </div>`;

  const yearTable = `<div class="card" style="margin-bottom:14px">
      <h3>ความแม่นรายปี — ปีไหนสัญญาณชัด ปีไหนหาย <span class="pill blue">สิทธิ์ Pro</span></h3>
      <p class="desc">ตารางที่ 6 ของเอกสารสมการ · ตัวแปรวัดที่ปีบัญชี t − 1 ผลลัพธ์วัดที่ปี t ·
        ช่วงเชื่อมั่นของ AUC คำนวณแบบ DeLong et al. (1988)</p>
      <div class="tw"><table><thead><tr><th>ปีบัญชี (ผลลัพธ์)</th><th class="n">n</th>
        <th class="n">Spearman (p)</th><th class="n">AUC [95% CI]</th><th class="n">Decile lift</th><th class="n">LOYO ρ</th><th>สรุป</th></tr></thead><tbody>
        ${yrs.map(([y, v]) => {
    const vd = vv.byYearV[y];
    return `<tr${vd === "FAIL" ? ' class="hl"' : ""}><td><b>${+y + 543}</b> <span style="color:var(--ink-3)">(${+y + 544})</span></td>
          <td class="n">${v.n}</td>
          <td class="n"><span style="color:${v.sp > 0 ? "var(--ink)" : "var(--crit)"}">${fmt(v.sp, 3)}</span>
            <span style="color:var(--ink-3);font-size:10.5px">(${v.p < .001 ? "<0.001" : fmt(v.p, 3)})</span></td>
          <td class="n">${fmt(v.auc, 3)} <span style="color:var(--ink-3);font-size:10.5px">[${fmt(v.ci[0], 3)}, ${fmt(v.ci[1], 3)}]</span></td>
          <td class="n">${fmt(v.lift, 2)}×</td><td class="n">${fmt(v.loyo, 3)}</td>
          <td><span class="pill ${VD[vd][1]}">${VD[vd][0]}</span></td></tr>`;
  }).join("")}
        <tr class="hl"><td><b>รวมทุกปี</b></td><td class="n">${VY.all.n}</td>
          <td class="n"><b>${fmt(VY.all.sp, 3)}</b> <span style="color:var(--ink-3);font-size:10.5px">(&lt;0.001)</span></td>
          <td class="n"><b>${fmt(VY.all.auc, 3)}</b> <span style="color:var(--ink-3);font-size:10.5px">[${fmt(VY.all.ci[0], 3)}, ${fmt(VY.all.ci[1], 3)}]</span></td>
          <td class="n"><b>${fmt(VY.all.lift, 2)}×</b></td><td class="n"><b>${fmt(VY.all.loyo, 3)}</b></td>
          <td><span class="pill ${VD[vv.verdict][1]}">${VD[vv.verdict][0]}</span></td></tr>
      </tbody></table></div>
      <div class="note crit" style="margin-top:12px">
        <b>ปีบัญชี 2565 (ผลลัพธ์ 2566) ไม่ผ่านเกณฑ์ทั้งชุด</b> — สหสัมพันธ์อันดับ ${fmt(VY.byYear["2022"].sp, 3)}
        และ AUC ${fmt(VY.byYear["2022"].auc, 3)} ซึ่งเท่ากับเดาสุ่ม · รายงานของบริษัทในปีนั้นจะติดป้าย
        <b>“Caution: ปีนี้ไม่ผ่านเกณฑ์ validity”</b> อัตโนมัติ และธง “สัญญาณ OI” จะไม่ขึ้นในปีนั้น (กติกา R3 และ E13)</div>
      <div class="tw" style="margin-top:14px"><table><thead><tr><th>ทดสอบ</th><th>แสดงอะไร</th><th>ถ้าตกแล้วกระทบอะไร</th></tr></thead><tbody>
        ${vv.rows.map(r => `<tr><td><b>${esc(r.n)}</b><br><span class="pill ${GR[r.g][1]}">${GR[r.g][0]}</span>
          <span style="color:var(--ink-3);font-size:10.6px"> ${esc(r.rule)}</span></td>
          <td>${esc(r.what)}</td><td style="color:${r.g === "pass" ? "var(--ink-3)" : "var(--ink-2)"}">${esc(r.why)}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="tw" style="margin-top:14px"><table><thead><tr><th>สูตรคะแนนทางเลือก</th><th>นิยาม</th>
        <th class="n">Spearman</th><th class="n">AUC</th><th class="n">Lift</th><th class="n">LOYO</th><th>อ่านผล</th></tr></thead><tbody>
        ${(VY.alt || []).map(a => `<tr${a[0].indexOf("หลัก") > 0 ? ' class="hl"' : ""}><td><b>${esc(a[0])}</b></td><td style="color:var(--ink-2)">${esc(a[1])}</td>
          <td class="n">${fmt(a[2], 3)}</td><td class="n">${fmt(a[3], 3)}</td><td class="n">${fmt(a[4], 2)}×</td>
          <td class="n">${a[5] === null ? "—" : fmt(a[5], 3)}</td><td style="color:var(--ink-2);font-size:11.5px">${esc(a[6])}</td></tr>`).join("")}
      </tbody></table></div>
      <div style="font-size:11px;color:var(--ink-2);margin-top:8px">แถว <b>B_T1</b> คือสูตร shadow ตามแนวทาง Pilot — ผู้ใช้ Pro เห็นค่า B_T1 ใต้แถบสถานะทุกหน้า
        และสลับให้แถบสถานะแสดง B_T1 (พร้อมป้าย Caution) ได้ที่หน้า “สถาปัตยกรรมข้อมูล” <button class="lnk" data-goto="arch">ไปที่ตัวสลับสูตร</button>
        · ตอนนี้แสดง <b>${useT1() ? "B_T1" : "B_EG"}</b></div>
      <div style="font-size:10.8px;color:var(--ink-3);margin-top:8px">Firm-cluster bootstrap 500 รอบ · ρ 95% CI
        ${fmt(VY.boot.sp[0], 3)}–${fmt(VY.boot.sp[1], 3)} (SE ${fmt(VY.boot.spSE, 3)}) ·
        AUC ${fmt(VY.boot.auc[0], 3)}–${fmt(VY.boot.auc[1], 3)} (SE ${fmt(VY.boot.aucSE, 3)}) ·
        out-of-sample แบบ stacked LOYO ρ = ${fmt(VY.boot.stacked, 3)}</div>
    </div>`;

  const indTable = `<div class="card" style="margin-bottom:14px">
      <h3>หลักฐานรายอุตสาหกรรม — ที่ไหนอ่านผลได้มั่นใจกว่ากัน</h3>
      <p class="desc">ρ รายอุตสาหกรรม (ตารางที่ 8 · REF-928) · อุตสาหกรรมที่ติดป้าย “หลักฐานอ่อน” จะมีป้ายเดียวกันบนแถบสถานะของบริษัทในกลุ่มนั้น (R5)</p>
      <div class="tw"><table><thead><tr><th>อุตสาหกรรม</th><th class="n">n</th><th class="n">ρ (Spearman)</th><th class="n">p</th><th>สถานะ</th></tr></thead><tbody>
        ${Object.entries(OIS.indValid || VY.ind8 || {}).map(([k, v]) => {
          const weak = WEAK_IND.has(+k), near = !weak && v[2] > .05;
          const tag = weak ? ["warn", "⚠ หลักฐานอ่อน"] : near ? ["mute", `ใกล้เกณฑ์ (p = ${fmt(v[2], 3)}) — รอตัดสินใจ`] : ["ok", "ต่างจากศูนย์"];
          return `<tr${weak ? ' class="hl"' : ""}><td>${esc(IND[k])}</td><td class="n">${v[0]}</td>
          <td class="n">${fmt(v[1], 3)}</td><td class="n">${fmt(v[2], 3)}</td>
          <td><span class="pill ${tag[0]}">${tag[1]}</span></td></tr>`; }).join("")}
      </tbody></table></div>
      <div style="font-size:10.8px;color:var(--ink-3);margin-top:6px">อุตสาหกรรม 1 และ 2 ติดป้าย “หลักฐานอ่อน” (ρ ไม่ต่างจากศูนย์) ·
        อุตสาหกรรม 4 อยู่ใกล้เกณฑ์ (p = .071) — รอทีมวิจัยตัดสินใจว่าจะติดป้ายหรือไม่ จึงยังไม่ติดป้ายบนแถบสถานะ</div>
      <div class="tw" style="margin-top:14px"><table><thead><tr><th>Tier</th><th class="n">n</th>
        <th class="n">ค่าเฉลี่ย open innovation</th><th class="n">มัธยฐาน</th></tr></thead><tbody>
        ${(VY.tier8 || []).map(t => `<tr><td><b>Tier ${t[0]}</b></td><td class="n">${t[1]}</td>
          <td class="n">${fmt(t[2], 2)}</td><td class="n">${t[3]}</td></tr>`).join("")}
      </tbody></table></div>
    </div>`;

  const proWall = `<div class="card" style="margin-bottom:14px">
      <h3>ตัวชี้วัดเต็มชุดและความแม่นรายปี <span class="pill mute">🔒 สิทธิ์ Pro</span></h3>
      <p class="desc" style="margin-bottom:0">ผู้ใช้ฟรีเห็น remark สองระดับด้านบน ซึ่งเป็นสิ่งที่แนบไปกับรายงานทุกฉบับ ·
        ตัวชี้วัดรายข้อ ตารางรายปี ตารางรายอุตสาหกรรม และการเปรียบเทียบสูตรคะแนน เป็นสิทธิ์ของผู้ใช้ Pro
        <button class="lnk" data-pro="1">สลับผู้ใช้สาธิตเป็น Pro</button></p></div>`;

  return pageHead("ระบบและหลักฐาน", "Validity — คะแนนนี้อ้างอิงได้แค่ไหน",
    `เกณฑ์สามข้อ (Spearman · AUC · Decile lift) เป็นกติกาที่โครงการกำหนดเอง ไม่ใช่ค่าจากวรรณกรรม ·
     ผ่านครบสามข้อรายงานว่า PASS · ตกข้อใดข้อหนึ่งรายงานว่าใช้อย่างระมัดระวัง พร้อมระบุเกณฑ์ที่ตกและเหตุผล ·
     LOYO เป็นค่าที่รายงานไว้ประกอบ ไม่ใช่เกณฑ์ตัด`)
    + `<div class="note ${rm.k}" style="margin-bottom:14px;font-size:12.6px">
      <b style="font-size:14px">${esc(rm.l)}</b> · ${esc(rm.th)}<br>${rm.d}</div>`
    + (S.plan === "pro" ? cards + decCard + yearTable + indTable : proWall + decCard)
    + `<div class="card">
      <h3>สิ่งที่ต้องพูดคู่กับตัวเลขเสมอ</h3>
      <div class="grid g2" style="gap:12px;margin-top:10px">
        <div class="note"><b>1 · สหสัมพันธ์ ไม่ใช่เหตุผล</b><br>
          บริษัทที่ได้คะแนนสูงมีนวัตกรรมเปิดมากกว่าจริง แต่ไม่ได้แปลว่าการปรับบอร์ดจะทำให้นวัตกรรมเพิ่ม</div>
        <div class="note"><b>2 · ขนาดของสัญญาณปานกลาง</b><br>
          AUC ${fmt(VY.all.auc, 2)} แปลว่าดีกว่าเดาสุ่ม แต่ยังห่างจากเครื่องมือที่ใช้ตัดสินใจเดี่ยว ๆ ได้
          ควรวางตำแหน่งเป็น “หนึ่งสัญญาณที่มีหลักฐาน” ประกอบการตัดสินใจ</div>
        <div class="note"><b>3 · เอกสารฉบับเดียวกัน</b><br>
          ภาษาผู้บริหารและจำนวนกิจกรรมนวัตกรรมนับจากรายงานประจำปีฉบับเดียวกัน จึงมีความเสี่ยงเรื่อง
          ตัวแปรกำหนดภายใน (endogeneity) ที่ยังไม่ได้แก้</div>
        <div class="note crit"><b>4 · ห้ามใช้ให้คะแนนบุคคล</b><br>
          เพศ อายุ และความเชื่อมโยงทางการเมืองเป็นข้อมูลอ่อนไหวตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 26
          ระบบนี้ออกแบบให้ประเมิน<b>โครงสร้างองค์กร</b>เท่านั้น</div>
      </div>
    </div>`;
}

/* ============================================================================
   หน้า 0 · Company Profile — หน้าแรกหลังล็อกอิน และเมื่อเลือกบริษัทจากตัวเลือกด้านบน (F2)
   โครง 4 ชั้นของเอกสารสมการ: tier + percentile + ช่วง 90% → quadrant → แถบสถานะ → bottom line (ตารางที่ 10)
   ============================================================================ */
function viewProfile() {
  const c = cur(), vd = verdictOf(c), z = ZONES[vd.quad], ist = DATA.indstats[c.ind] || {};
  const peers = indComps(c.ind).sort((a, b) => b.ipi - a.ipi), rank = peers.findIndex(x => x.t === c.t) + 1;
  const fn = femaleN(c.fem, c.bsize);
  const st = vd.st, inD = vd.inDomain;
  const chipHtml = vd.chips.map(x => `<span class="chip" title="${esc(x.t)}">${esc(x.k)}</span>`).join("");
  const inputs = [
    ["กรรมการหญิง", pct1(c.fem) + (fn !== null ? ` (${fn} คน)` : ""), "เข้าสูตร · ค่าที่มีน้ำหนักมากที่สุด", "ok"],
    ["กรรมการครอบครัว", pct1(c.fam), "บริบท — ไม่ใช่คันโยก (R6)", "mute"],
    ["political ties", c.pol ? "มี (1)" : "ไม่มี (0)", "บริบท · ค่า 0/1 — ไม่ใช้เป็นเหตุผลเชิงบวก", "mute"],
    ["อายุงานเฉลี่ยบอร์ด", fmt(c.ten, 1) + " ปี", "บริบท — ไม่มีผลต่อคะแนน (δT = 0)", "mute"],
    ["CEO Promotion Focus", "เปอร์เซ็นไทล์ " + fmt(c.dp, 0), "เข้าสูตร · ค่าดิบ " + fmt(c.promo, 2) + (c.pRaw !== undefined ? " (กรอก LIWC-22)" : ""), "ok"],
    ["จำนวนกรรมการทั้งหมด", c.bsize ? fmt(c.bsize) + " คน" : "ยังไม่ระบุ", c.bsize ? "ใช้ตรวจ critical mass" : "ระบุใน Zone A เพื่อตรวจ critical mass", c.bsize ? "ok" : "warn"],
  ];
  const layer = (n, title, body) => `<div style="display:grid;grid-template-columns:34px 1fr;gap:10px;padding:11px 0;border-top:1px solid var(--line)">
    <div style="width:26px;height:26px;border-radius:99px;background:var(--panel-2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--ink-2)">${n}</div>
    <div><div style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:3px">${title}</div>${body}</div></div>`;
  const tierLine = inD
    ? `<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:30px;font-weight:600;letter-spacing:-.03em">Tier ${vd.tier}</span>
        <span style="font-size:14px">OpenInnoScore <b>${fmt(c.ois ?? c.ipi, 1)}</b> <span style="color:var(--ink-3)">(เปอร์เซ็นไทล์ในฐานอ้างอิง REF-928 · ไม่ใช่ความน่าจะเป็น)</span></span></div>
       <div style="font-size:12px;color:var(--ink-2);margin-top:3px">ช่วง 90% ${fmt(vd.band[0], 1)}–${fmt(vd.band[1], 1)} (Krinsky–Robb) · ในอุตสาหกรรม OIS ${fmt(c.oisInd ?? c.iip, 0)} · อันดับ ${rank} จาก ${peers.length} (ปีบัญชี 2566)</div>`
    : `<div style="font-size:16px;font-weight:500">นอกกลุ่มอ้างอิง — ไม่แสดง tier</div><div style="font-size:12px;color:var(--ink-2)">บริษัทนอกอุตสาหกรรม 1–7 (R4)</div>`;
  const quadLine = `<div style="display:flex;align-items:center;gap:9px"><span style="width:12px;height:12px;border-radius:99px;background:${z.c};display:inline-block"></span>
      <b style="font-size:15px">${esc(z.q)}</b> <span style="color:var(--ink-2)">· ${esc(z.th)}</span></div>
    <div style="font-size:12px;color:var(--ink-2);margin-top:3px">${esc(z.d)}</div>`;
  const bottom = inD ? `<div style="font-size:12.8px;line-height:1.7">
      ${esc(c.t)} อยู่ที่เปอร์เซ็นไทล์ <b>${fmt(c.ois ?? c.ipi, 0)}</b> ของฐานอ้างอิง — CEO Promotion Focus ${c.cP >= 0 ? "สูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ยฐานอ้างอิง
      และองค์ประกอบบอร์ด${c.amp >= 0 ? "อยู่ในรูปแบบที่สัมพันธ์กับการหนุน" : "ไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน"}สัญญาณนั้น (amp ${c.amp >= 0 ? "> 0" : "≤ 0"}) ·
      บริษัทในช่อง Tier ${vd.tier} × ${vd.quad} ของ REF-928 มีกิจกรรม open innovation เฉลี่ย <b>${fmt(st.oi, 2)}</b> รายการต่อปี (n = ${st.n}) —
      เป็นค่าเฉลี่ยของกลุ่มในฐานอ้างอิง ไม่ใช่ค่าคาดหมายของบริษัทนี้ (R1, R7)</div>`
    : `<div style="font-size:12.8px">ไม่มี bottom line สำหรับบริษัทนอกกลุ่มอ้างอิง (R4)</div>`;

  return pageHead("Company Profile", `${c.t} · ${c.n}`,
    `${esc(IND[c.ind] || "นอกกลุ่มอ้างอิง")} · ภาพรวมค่าป้อนปีบัญชี 2566 และผลลัพธ์ 4 ชั้นของ OpenInnoScore — อ่านเป็นตำแหน่งบนฐานอ้างอิง REF-928 ${ASSOC}`)
    + `<div class="grid g-side">
    <div class="stack">
      <div class="card">
        <h3>ค่าป้อนปีบัญชี 2566${isEdited() ? ` <span class="pill warn" style="font-size:9.5px">แก้ค่าเองใน Zone A</span>` : ""}</h3>
        <p class="desc">สองค่าแรกที่ติดป้าย “เข้าสูตร” คือองค์ประกอบของ B = cP × amp · ที่เหลือเป็นบริบท</p>
        ${inputs.map(([k, v, u, cls]) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12.5px">
          <div><div>${k}</div><div style="font-size:10.5px;color:var(--ink-3)">${u}</div></div>
          <div style="text-align:right;white-space:nowrap"><b>${v}</b><br><span class="pill ${cls}" style="font-size:9px">${cls === "ok" ? "เข้าสูตร" : cls === "warn" ? "ยังไม่ระบุ" : "บริบท"}</span></div></div>`).join("")}
        <div style="font-size:10.8px;color:var(--ink-3);margin-top:9px">${critText(c)}</div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">OpenInnoScore</div>
        ${inD ? gauge(c.ipi, "เปอร์เซ็นไทล์ในฐานอ้างอิง") : `<div style="padding:22px 0;color:var(--ink-3)">ไม่แสดง tier / เปอร์เซ็นไทล์ (R4)</div>`}
        <div style="font-size:11px;color:var(--ink-2)">เทียบค่าเฉลี่ยฐานอ้างอิง: กรรมการหญิง ${pct1(OM.W)} · กรรมการครอบครัว ${pct1(OM.F)} · political ties ${pct1(OM.G)} · promotion ${fmt(OM.P, 2)}</div>
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <h3>ผลลัพธ์ 4 ชั้น</h3>
        ${layer(1, "Tier · เปอร์เซ็นไทล์ · ช่วง 90%", tierLine)}
        ${layer(2, "Quadrant (Board Strategy Compass)", quadLine)}
        ${layer(3, "แถบสถานะ (ตารางที่ 10 + ป้ายเตือน E13)", statusBar(c))}
        ${layer(4, "Bottom line เทียบฐานอ้างอิง", bottom)}
        ${chipHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${chipHtml}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <button class="btn p" data-goto="docs">เข้า Main Canvas (Zone A)</button>
          <button class="btn s" data-goto="fit">ดูรายงานวินิจฉัย</button>
          <button class="btn g" data-goto="matrix">ดู 2×2</button>
        </div>
      </div>
      <div class="card">
        <h3>เทียบค่าเฉลี่ยอุตสาหกรรม · ${esc(IND[c.ind] || "—")}</h3>
        ${bars([
          { l: "กรรมการหญิง · บริษัทนี้", v: c.fem * 100, t: pct1(c.fem), c: "var(--s1)", hl: 1 },
          { l: "กรรมการหญิง · ค่าเฉลี่ยอุตฯ", v: (ist.fem || 0) * 100, t: pct1(ist.fem || 0), c: "var(--q3)" },
          { l: "CEO Promotion Focus pct · บริษัทนี้", v: c.dp, t: fmt(c.dp, 0), c: "var(--s1)", hl: 1 },
          { l: "CEO Promotion Focus pct · ค่าเฉลี่ยอุตฯ", v: promoPct(ist.promo || OM.P), t: fmt(promoPct(ist.promo || OM.P), 0), c: "var(--q3)" },
        ], { lw: 210, max: 100 })}
        <div style="font-size:10.8px;color:var(--ink-3);margin-top:8px">แสดงเฉพาะสององค์ประกอบที่เข้าสูตร · ครอบครัว / political ties / อายุงาน ดูได้ในตารางซ้ายเป็นบริบท</div>
      </div>
    </div>
  </div>`;
}
function wireProfile(h) { /* ปุ่มทั้งหมดใช้ data-goto ซึ่ง wireActions ผูกให้แล้ว */ }

/* ============================================================================
   ตัวประกอบหน้าจอ · การผูกเหตุการณ์ · เริ่มระบบ
   ============================================================================ */
const VIEWS = { profile: viewProfile, fit: viewFit, matrix: viewMatrix, peer: viewPeer, studio: viewStudio, sector: viewSector, billing: viewBilling, arch: viewArch, valid: viewValid };
function render() {
  const host = $("#v-" + S.view);
  // หน้าของแก้ไขครั้งที่ 1 (Zone A/B/C) ถูกลงทะเบียนในไฟล์ถัดไป — ตอนบูตอาจยังไม่มี จึงต้องกันไว้
  if (!host || typeof VIEWS[S.view] !== "function") return;
  host.innerHTML = VIEWS[S.view]();
  wireActions(host);
  ({ profile: wireProfile, fit: wireFit, matrix: wireMatrix, peer: wirePeer, studio: wireStudio, sector: wireSector, billing: wireBilling,
     compass: typeof wireCompass === "function" ? wireCompass : null }[S.view] || (() => { }))(host);
  syncChrome();
}
function wireFit(h) {
  const b = h.querySelector("#btnFree");
  if (b) b.onclick = () => { S.freeCo = S.t; save(); toast("ใช้สิทธิ์รายงานฟรีกับ " + S.t + " แล้ว"); render(); };
}
function wireMatrix(h) {
  const g = h.querySelector("#mxPathG"), cb = h.querySelector("#mxPath");
  if (cb && g) cb.onchange = () => g.style.display = cb.checked ? "" : "none";
  h.querySelectorAll(".mk").forEach(p => {
    const me = p.dataset.t === S.t;
    tipOn(p, el => `<div class="tk">${el.dataset.z}</div><b>${el.dataset.t}</b> · ${el.dataset.n}<br>OIS ${el.dataset.i}${me ? "" : " — คลิกเพื่อเปลี่ยนไปดูบริษัทนี้"}`);
    if (!me) p.onclick = () => { S.t = p.dataset.t; S.peers = []; S.wi = null; $("#selCo").value = S.t; render(); };
  });
}
function wirePeer(h) {
  const c = cur(), pool = indComps(c.ind).filter(x => x.t !== c.t).sort((a, b) => b.ipi - a.ipi);
  const box = h.querySelector("#peerPick");
  if (box) {
    box.innerHTML = [0, 1, 2].map(i => `<select class="sel" data-slot="${i}" style="font-size:12px;padding:5px 9px">
      <option value="">— ไม่เลือก —</option>
      ${pool.map(x => `<option value="${x.t}"${S.peers[i] === x.t ? " selected" : ""}>${esc(x.t)} · OIS ${x.ipi}</option>`).join("")}</select>`).join("");
    box.querySelectorAll("select").forEach(s => s.onchange = () => {
      S.peers = [...box.querySelectorAll("select")].map(x => x.value).filter(Boolean);
      S.peers = [...new Set(S.peers)].slice(0, 3); render();
    });
  }
  const a = h.querySelector("#btnPeerAuto");
  if (a) a.onclick = () => { S.peers = autoPeers(c).map(x => x.t); render(); };
}
function wireStudio(h) {
  const c = cur(), w = wiInit();
  h.querySelectorAll("[data-wi]").forEach(r => r.oninput = () => { w[r.dataset.wi] = +r.value; render(); });
  h.querySelectorAll("[data-pol]").forEach(b => b.onclick = () => { w.pol = +b.dataset.pol; render(); });
  const dp = h.querySelector("#slDp");
  if (dp) dp.oninput = () => { w.dp = +dp.value; w.src = "ปรับด้วยตัวเลื่อนเอง"; render(); };
  const rs = h.querySelector("#btnWiReset");
  if (rs) rs.onclick = () => { const k = wiInit(true); k.dp = w.dp; k.src = w.src; render(); };
  const cr = h.querySelector("#btnCeoReset");
  if (cr) cr.onclick = () => { w.dp = c.dp; w.src = "ค่าจริงของบริษัท"; S.ceo = null; render(); };
  const ta = h.querySelector("#ceoTxt");
  if (ta && S.ceo) { ta.value = S.ceo.text; renderCeoOut(S.ceo.text, S.ceo.r); }
  const runIt = txt => {
    if (!txt.trim()) return toast("ยังไม่มีข้อความให้วิเคราะห์");
    const r = analyseText(txt);
    S.ceo = { text: txt, r }; w.dp = r.dp; w.src = `วิเคราะห์จากข้อความ ${fmt(r.wc)} คำ`;
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
      try { const t = await readFileText(f); ta.value = t.slice(0, 60000); runIt(ta.value); toast("อ่าน " + f.name + " เสร็จแล้ว"); }
      catch (err) { toast("อ่านไฟล์ไม่สำเร็จ — " + err.message); }
    };
  }
}
function wireSector(h) {
  h.querySelectorAll("[data-setind]").forEach(b => b.onclick = () => {
    S.ind = b.dataset.setind; $("#selInd").value = S.ind; fillCompanies(); render();
  });
  const cs = h.querySelector("#btnSecCsv");
  if (cs) cs.onclick = () => {
    const pool = indComps(+S.ind).slice().sort((a, b) => b.ipi - a.ipi);
    const head = ["อันดับ", "ตัวย่อ", "ชื่อบริษัท", "อุตสาหกรรม", "โซน", "OI", "CEO_Drive", "Board_Amp_pct", "Board_Amp_raw",
      "promotion_focus", "กรรมการหญิง_%", "กรรมการครอบครัว_%", "สายนโยบาย", "อายุงานเฉลี่ย_ปี", "นวัตกรรมเปิด"].join(",");
    const rows = pool.map((x, i) => [i + 1, x.t, `"${x.n}"`, `"${IND[x.ind]}"`, `"${ZONES[zoneOf(x.promo, x.amp)].l}"`,
      x.ipi, x.dp, ampPct(x.amp), x.amp.toFixed(4), x.promo, (x.fem * 100).toFixed(1), (x.fam * 100).toFixed(1),
      x.pol ? "มี" : "ไม่มี", x.ten.toFixed(1), x.oi].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `openinnoscore_${IND[S.ind]}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
}
function wireBilling(h) {
  h.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const n = +b.dataset.buy, p = PACKS.find(x => x.n === n);
    if (!confirm(`ต้นแบบ — จำลองการชำระเงิน\n\nแพ็กเกจ ${n} token · ฿${fmt(p.baht)}\nระบบจริงจะพาไปหน้าชำระเงิน (พร้อมเพย์ / บัตรเครดิต)\n\nกดตกลงเพื่อจำลองว่าชำระสำเร็จ`)) return;
    S.credits += n; S.log.unshift({ what: "topup", t: "-", cost: -n, label: `เติม ${n} token · ฿${fmt(p.baht)}`, at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) });
    save(); toast(`เติม ${n} tokenแล้ว · คงเหลือ ${S.credits}`); render();
  });
  const r = h.querySelector("#btnResetDemo");
  if (r) r.onclick = () => {
    if (!confirm("รีเซ็ตข้อมูลสาธิตทั้งหมด?\n\ntoken กลับเป็นค่าเริ่มต้น · ล้างสิทธิ์ที่ปลดล็อกไว้ · คืนสิทธิ์รายงานฟรี · ล้างพอร์ตและมติที่บันทึกไว้")) return;
    S.credits = 3; S.freeCo = null; S.unlocked = {}; S.sectors = {}; S.log = [];
    S.port = []; S.dec = {};
    save(); toast("รีเซ็ตแล้ว"); render();
  };
}

/* ---------------------------------------------------------------- แบรนด์ */
const BRANDS = [{ k: "A", n: "OpenInnoScore", d: "น้ำเงินเข้ม + ฟ้า + มิ้นต์ — CI ที่ตกลงแล้วในรอบแก้ไขครั้งที่ 1" }];
function setBrand(k) { document.body.dataset.brand = k; save(); syncChrome(); }
function setMode(m) { document.body.dataset.mode = m; save(); }

/* ---------------------------------------------------------------- เริ่มระบบ */
/** เข้าระบบ — ล็อกอินใหม่เปิดหน้า Company Profile เสมอ (F2) · restore = เปิดจาก localStorage ให้คงหน้าเดิม */
function enter(mail, restore) {
  S.user = mail || $("#gMail").value.trim() || "guest@openinnoscore.co";
  if (!restore) S.view = "profile";
  save();
  $("#gate").style.display = "none";
  $("#app").style.display = "";
  $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + S.view));
  fillSelectors(); syncChrome(); render();
}
function boot() {
  buildNav();

  $("#btnMode").onclick = () => setMode(document.body.dataset.mode === "dark" ? "light" : "dark");
  $("#btnGoogle").onclick = () => enter($("#gMail").value.trim());
  $("#btnEnter").onclick = () => enter();
  $("#btnOut").onclick = () => { S.user = null; save(); $("#app").style.display = "none"; $("#gate").style.display = ""; };
  $("#btnTopUp").onclick = () => go("billing");
  $("#selInd").onchange = e => { S.ind = e.target.value; fillCompanies(); S.peers = []; render(); };
  // เลือกบริษัทจากตัวเลือกด้านบน → เปิด Company Profile ของบริษัทนั้น (F2)
  $("#selCo").onchange = e => { S.t = e.target.value; S.peers = []; S.wi = null; S.ceo = null; go("profile"); };

  const u = load();
  syncChrome();
  if (u) { $("#gMail").value = u; enter(u, true); }
}
/* ลงทะเบียนหน้า Company Profile กับตารางผูกเหตุการณ์ของชั้นถัดไป (WIRES2 ถูกประกาศในไฟล์ถัดไป จึงต้องรอให้สคริปต์ทั้งหมดโหลดก่อน) */
setTimeout(() => {
  if (typeof WIRES2 !== "undefined" && WIRES2 && !WIRES2.profile) WIRES2.profile = wireProfile;
  if (typeof VIEWS !== "undefined" && !VIEWS.profile) VIEWS.profile = viewProfile;
}, 0);
boot();
