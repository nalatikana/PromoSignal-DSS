/* ============================================================================
   v2_reports.js — ชุดรายงาน 4 ฉบับที่ต่อเนื่องกัน (แก้ไขครั้งที่ 2.1)
     1 รายงานบริษัท + 2×2 Grid (หน้า matrix / compass — ไฟล์อื่น)
     2 Peer Benchmark — ความแตกต่างจาก peer และคำถามว่าความแตกต่างเกิดจากอะไร
     3 What-if Report — ผลภายใต้สมมติฐาน ทางเลือก และหลักฐานที่ต้องมีก่อนดำเนินการ
     4 Board Development & Follow-up — ข้อสรุป มติ ผู้รับผิดชอบ และกำหนดติดตาม
   กติกา: ถ้อยคำเชิงความสัมพันธ์เท่านั้น · ไม่แสดงค่าสัมประสิทธิ์ · political ties ไม่ใช่เหตุผลเชิงบวก
          มติและข้อสรุปต้องมาจากการประชุมจริงและผู้ใช้ยืนยัน — ระบบไม่เติมให้
   ไฟล์นี้ห่อ (wrap) หน้าที่มีอยู่แล้ว ไม่เขียนทับฟังก์ชันของไฟล์อื่น
   ============================================================================ */

/* ============================================================================
   MVP 1 (14 พ.ย. 2569) · ตัวช่วยร่วมของไฟล์กลุ่ม W2a (v2_reports · v2_tiers · v2_assess · v2_mvp · v2_ai · v2_data)
   window.M1A — ป้ายจาก PILOT_LABELS · เวอร์ชันพารามิเตอร์ (PARAM_VERSION) · สถานะปีบัญชี (FY_STATUS) · กลุ่มลูกค้า (CLIENT_GROUP)
   · ให้คะแนนบริษัทนอก REF-928 (SCORE_FIRM) · มุมมอง UC1 / UC3 / Board Profile · รายชื่อลูกค้าในเบราว์เซอร์ (ois_clients_v1)
   ทุกฟังก์ชันมีค่าสำรองเมื่อ API ของ v2_app.js (W1) ยังไม่มา — ค่าสำรองไม่มีสัมประสิทธิ์และติดป้าย "provisional"
   ============================================================================ */
const M1A = window.M1A = (() => {
  const isEN = () => typeof S !== "undefined" && S.lang === "EN";
  const Tx = (en, th) => isEN() ? en : th;
  const LBL = {
    supporting: ["Supporting information — not an input to the pilot organisation's decision models", "ข้อมูลประกอบ — ไม่ใช่ข้อมูลเข้าแบบจำลองการตัดสินใจขององค์กรนำร่อง"],
    financials: ["Financials", "กลุ่มธุรกิจการเงิน (Financials)"],
    outside: ["Outside the reference sample", "นอกโดเมน (นอกกลุ่มตัวอย่างอ้างอิง)"],
    notval: ["Not yet validated", "ยังไม่ได้ตรวจความเที่ยงตรง (Not yet validated)"],
    uc1: ["UC1 · Client relationship (P2)", "UC1 · ความสัมพันธ์ลูกค้า (P2)"],
    uc3: ["UC3 · Board OI evaluation (P1)", "UC3 · ประเมิน OI ของคณะกรรมการ (P1)"],
    bp: ["Board Profile (outside the reference group)", "Board Profile (นอกกลุ่มอ้างอิง)"],
  };
  const ALIAS = { outside: ["outside_ref", "outside", "outside_sample", "out_of_ref"], notval: ["nyv", "not_validated", "notval"],
    supporting: ["supporting"], financials: ["financials", "financial"], uc1: ["uc1"], uc3: ["uc3"], bp: ["boardprofile", "board_profile", "bp"] };
  /** ป้ายจาก window.PILOT_LABELS (W1 · แก้คำได้ที่เดียว) → ค่าสำรองตามบันทึกอาจารย์ 14 พ.ย. */
  function lab(key, lang) {
    const en = lang ? lang === "EN" : isEN(), P = window.PILOT_LABELS || {};
    for (const k of (ALIAS[key] || [key])) {
      const v = P[k + (en ? "_en" : "_th")]; if (typeof v === "string" && v) return v;
      const o = P[k]; if (o && typeof o === "object" && typeof o[en ? "en" : "th"] === "string") return o[en ? "en" : "th"];
      if (typeof o === "string" && o) return o;
    }
    const d = LBL[key]; return d ? d[en ? 0 : 1] : key;
  }
  const ver = () => (typeof window.PARAM_VERSION === "string" && window.PARAM_VERSION) || "REF928-edit9-20261013";
  const FYT = { 2019: "PASS", 2020: "CAUTION", 2021: "PASS", 2022: "FAIL", 2023: "PASS" };
  /** สถานะปีบัญชี — FY_STATUS(fy) ของ W1 ถ้ามี · สำรองตามพารามิเตอร์ edit9 */
  function fy(y) {
    y = +y;
    if (typeof window.FY_STATUS === "function") { try { const r = window.FY_STATUS(y); if (r && r.code) return r; } catch (e) { } }
    const code = y > 2023 ? "NYV" : FYT[y] || "NYV";
    const L = { PASS: ["PASS", "PASS"], CAUTION: ["CAUTION", "CAUTION"], FAIL: ["FAIL", "FAIL"], NYV: [lab("notval", "EN"), lab("notval", "TH")] }[code];
    return { code, label_en: L[0], label_th: L[1], rule_en: `FY${y} letter → outcome ${y + 1}`,
      whatIfAllowed: code !== "FAIL", readingAllowed: code !== "FAIL" };
  }
  const fyCode = y => { const c = String(fy(y).code || "").toUpperCase(); return /NOT|NYV|VALID/.test(c) && c !== "PASS" ? "NYV" : c; };
  /** ชิปสถานะปี: "FY2023 letter → outcome 2024 · PASS" (กติกานับปี F8/F9) */
  function fyChip(y, extra) {
    const r = fy(y), c = fyCode(y), cls = { PASS: "ok", CAUTION: "warn", FAIL: "crit" }[c] || "mute";
    const t = Tx(`FY${+y} letter → outcome ${+y + 1} · ${r.label_en || c}`, `จดหมาย FY${+y} → ผลลัพธ์ ${+y + 1} · ${r.label_th || r.label_en || c}`);
    return `<span class="pill ${cls} m1a-fy" data-fy="${+y}" data-fycode="${esc(c)}"${extra ? " " + extra : ""}>${esc(t)}</span>`;
  }
  const fyText = (y, lang) => { const r = fy(y), en = lang ? lang === "EN" : isEN();
    return en ? `FY${+y} letter → outcome ${+y + 1} · ${r.label_en || r.code}` : `จดหมาย FY${+y} → ผลลัพธ์ ${+y + 1} · ${r.label_th || r.label_en || r.code}`; };
  /** มุมมอง (lens) — ชื่อไม่ระบุประเภทองค์กร (#12) */
  function lens(id) {
    id = id || (typeof rpUcId === "function" ? rpUcId() : "board");
    if (id === "credit") return { id, code: "UC1", lab: lab("uc1"), readers: Tx("Relationship team", "ทีมดูแลความสัมพันธ์ลูกค้า"), uc1: true };
    if (id === "bankbod") return { id, code: "BP", lab: lab("bp"), readers: Tx("Company secretary / board", "เลขานุการบริษัท / คณะกรรมการ") };
    if (id === "board") return { id, code: "UC3", lab: lab("uc3"), readers: Tx("Company secretary / board", "เลขานุการบริษัท / คณะกรรมการ"), uc3: true };
    return { id, code: id, lab: id, readers: "—" };
  }
  /** กลุ่มลูกค้า 6 กลุ่ม (สไลด์ 16 · do-file S2) — CLIENT_GROUP ของ W1 ถ้ามี */
  function group(o) {
    if (typeof window.CLIENT_GROUP === "function") { try { const r = window.CLIENT_GROUP(o); if (r && r.group) return r; } catch (e) { } }
    const g = !o.listed ? 6 : o.financial ? 5 : !(o.english_letter && o.board_table) ? 4 : (+o.fiscal_year > 2023) ? 3 : o.in_REF928 ? 1 : 2;
    const L = { 1: ["In REF-928, FY2019–2023", "อยู่ใน REF-928 ปี 2019–2023"], 2: ["Listed, non-financial, English letter + board table, not one of the 209", "จดทะเบียน ไม่ใช่กลุ่มธุรกิจการเงิน มีจดหมายภาษาอังกฤษ + ตารางกรรมการ ไม่อยู่ใน 209 บริษัท"],
      3: ["Fiscal year after 2023", "ปีบัญชีหลัง 2023"], 4: ["Listed, no English letter (or no board table)", "จดทะเบียน ไม่มีจดหมายภาษาอังกฤษ (หรือไม่มีตารางกรรมการ)"],
      5: ["Financials sector", "กลุ่มธุรกิจการเงิน"], 6: ["Not listed", "ไม่ได้จดทะเบียน"] }[g];
    return { group: g, label_en: L[0], label_th: L[1], provisional: true,
      provides: g <= 3 ? "matrix" : g <= 5 ? "board_profile" : "none" };
  }
  /** ให้คะแนนบริษัทเทียบ REF-928 ที่ตรึงไว้ (ไม่เพิ่มเข้า REF-928 · DP6) — SCORE_FIRM ของ W1 · สำรอง = เครื่องคำนวณเดิมในไฟล์ */
  function score(i) {
    if (typeof window.SCORE_FIRM === "function") {
      try { const r = window.SCORE_FIRM(i); if (r && isFinite(+r.ois)) return Object.assign({ engine: "SCORE_FIRM" }, r, { quad: String(r.quad || "").charAt(0) }); }
      catch (e) { console.warn("SCORE_FIRM", e); }
    }
    try {
      const amp = ampOf(i.family_share, i.political_ties ? 1 : 0, i.female_share), cP = cpOf(i.promotion), B = cP * amp, o = oisOf(B);
      const bd = band90(i.promotion, i.family_share, i.political_ties ? 1 : 0, i.female_share);
      let t1 = null; try { const a1 = ampT1(i.female_share), o1 = oisT1Of(cP * a1); if (isFinite(o1)) t1 = { ois: Math.round(o1 * 10) / 10, quad: quadOf(cP, a1), tier: tierOf(o1), band90: null }; } catch (e) { }
      return { engine: "provisional", provisional: true, cP, amp, B, X: typeof promoPct === "function" ? promoPct(i.promotion) : null, Y: typeof ampPct === "function" ? ampPct(amp) : null,
        quad: quadOf(cP, amp), ois: Math.round(o * 10) / 10, band90: bd, tier: tierOf(o), tier_uncertain: tierOf(bd[0]) !== tierOf(bd[1]), t1 };
    } catch (e) { return null; }
  }
  const JN = 0.6858;
  const CL_KEY = "ois_clients_v1", BP_KEY = "ois_bp_target_v1", EV_KEY = "ois_ev_subject_v1";
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const clients = () => { const a = ls(CL_KEY, []); return Array.isArray(a) ? a : []; };
  /** ลงทะเบียนคำแปลอังกฤษจากไฟล์ของเรา — ชั้นแปล (v2_i18n.js) โหลดทีหลัง จึงลองซ้ำจนพบ */
  function en(d) {
    try { (window.__I18N_Q = window.__I18N_Q || []).push(d); } catch (e) { }
    const reg = () => { try { if (window.I18N && typeof window.I18N.load === "function") { window.I18N.load(d); return true; } } catch (e) { } return false; };
    let n = 0; const retry = () => { if (!reg() && ++n < 80) setTimeout(retry, 100); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retry); else retry();
  }
  const IND_EN1 = { 1: "Agro & Food Industry", 2: "Technology", 3: "Resources", 4: "Services", 5: "Industrials", 6: "Consumer Products", 7: "Property & Construction" };
  const indName = (k, lang) => { const e = lang ? lang === "EN" : isEN(); if (k === "fin" || k === 0 || k === "0") return lab("financials", e ? "EN" : "TH");
    return e ? IND_EN1[k] || String(k) : (typeof IND === "object" && IND[k]) || IND_EN1[k] || String(k); };
  /** ป้ายข้อมูลประกอบ (F2) — HTML บนหน้าจอ */
  const supportingBanner = () => `<div class="m1a-supp" role="note" data-m1a="supporting"><b>${esc(lab("supporting"))}</b></div>`;
  return { isEN, T: Tx, lab, ver, fy, fyCode, fyChip, fyText, lens, group, score, JN, CL_KEY, BP_KEY, EV_KEY, ls, lsSet, clients, en, indName, supportingBanner };
})();

/* ---------------------------------------------------------------- ตัวช่วยร่วม */
const RP_ST ={ todo: "ยังไม่เริ่ม", doing: "กำลังทำ", done: "เสร็จ", late: "เลื่อน" };
const RP_SRC = { grid: "Grid", matrix: "Grid", compass: "Compass", peer: "Peer", whatif: "What-if", bod: "BOD",
  res: "มติ", report: "Insight" };
const RP_UC = { board: "BOD Evaluation", credit: "UC1 · ความสัมพันธ์ลูกค้า (P2)", search: "Nomination", investor: "Engagement", bankbod: "Board Profile (นอกกลุ่มอ้างอิง)", invest: "Engagement", cg: "CG / เลขานุการบริษัท",
  strategy: "ฝ่ายกลยุทธ์", consult: "ที่ปรึกษา", advisor: "ที่ปรึกษา", mgmt: "ฝ่ายจัดการ" };
const rpToday = () => new Date().toISOString().slice(0, 10);
const rpIso = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
const rpThDate = d => rpIso(d) ? new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : (d || "—");
const rpNow = () => new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
function rpUcId() {
  try { if (typeof ucLens === "function") { const u = ucLens(); if (u && u.id) return u.id; } } catch (e) { }
  return "board";
}
function rpUcLabel(id) {
  if (!id) return "—";
  try { if (typeof USECASES !== "undefined" && Array.isArray(USECASES)) { const u = USECASES.find(x => x.id === id); if (u) return u.short || u.lab || id; } } catch (e) { }
  try { if (typeof ucLens === "function") { const u = ucLens(); if (u && u.id === id && (u.short || u.lab)) return u.short || u.lab; } } catch (e) { }
  return RP_UC[id] || id;
}
/** ที่เก็บ Compass ของบริษัทใดก็ได้ — คีย์เดียวกับ scGet/scSet ใน v2_strategy.js ("sc:" + ticker) */
function rpSc(t) {
  S.sc = S.sc || {};
  const k = "sc:" + t;
  if (!S.sc[k] || typeof S.sc[k] !== "object") S.sc[k] = {};
  return S.sc[k];
}
/** เพิ่มประเด็นเข้าแผนพัฒนาบอร์ดของบริษัทที่กำลังดู — ใช้ scGet/scSet เมื่อมี (เส้นทางเก็บเดียวกับหน้า Compass) */
function rpPlanAdd(text, src, extra) {
  const t = String(text || "").trim(); if (!t) return;
  const useSc = typeof scGet === "function" && typeof scSet === "function";
  const o = useSc ? scGet() : rpSc(S.t);
  const lst = (o.plan || []).slice();
  if (lst.some(x => x && x.t === t)) { toast("ประเด็นนี้อยู่ในแผนแล้ว"); return; }
  lst.push(Object.assign({ t, d: rpNow(), src, uc: rpUcId() }, extra || {}));
  if (useSc) scSet("plan", lst); else { rpSc(S.t).plan = lst; save(); }
  toast("เพิ่มเข้าแผนพัฒนาบอร์ดแล้ว · ดูได้ที่ Board Development & Follow-up");
}
function rpDl(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: type || "text/csv;charset=utf-8" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const rpCsv = rows => "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
/** พิมพ์เฉพาะบล็อกรายงาน — ใส่คลาสบน body แล้วให้ @media print ซ่อนส่วนอื่น */
function rpPrint(cls) {
  document.body.classList.add(cls);
  const off = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", off); };
  window.addEventListener("afterprint", off);
  try { window.print(); } finally { setTimeout(off, 1500); }
}

/* ---------------------------------------------------------------- ตัวนำทางชุดรายงาน 4 ฉบับ */
const RP_CHAIN = [
  { n: 1, v: "matrix", h: "รายงานบริษัท + 2×2 Grid", p: "ตำแหน่ง คำถามสำคัญ ข้อจำกัดของข้อมูล" },
  { n: 2, v: "peer", h: "Peer Benchmark", p: "ความต่างจาก peer และเกิดจากอะไร" },
  { n: 3, v: "studio", h: "What-if Report", p: "สมมติฐาน ทางเลือก หลักฐานก่อนดำเนินการ" },
  { n: 4, v: "followup", h: "Follow-up Report", p: "ข้อสรุป มติ ผู้รับผิดชอบ กำหนดติดตาม" },
];
function reportChain(active) {
  return `<nav class="rp-chain rp-noprint" aria-label="ชุดรายงาน 4 ฉบับ"><span class="rp-chain-k">ชุดรายงาน 4 ฉบับ</span>
    <div class="rp-chain-row">${RP_CHAIN.map((s, i) => `${i ? `<span class="rp-chain-arr" aria-hidden="true">→</span>` : ""}
      <button class="rp-chain-step${s.n === active ? " on" : ""}" data-rpgo="${s.v}"${s.n === active ? ' aria-current="page"' : ""}>
        <b>${s.n}</b><span><i>${esc(s.h)}</i><em>${esc(s.p)}</em></span></button>`).join("")}</div></nav>`;
}
function wireChain(h) {
  h.querySelectorAll("[data-rpgo]").forEach(b => b.onclick = () => { if (b.getAttribute("aria-current")) return; go(b.dataset.rpgo); });
}
/** แทรกตัวนำทางต่อจากหัวเรื่องของหน้า (ถ้าหาหัวเรื่องไม่พบ วางไว้บนสุด) */
function rpInsertChain(html, n) {
  const i = html.indexOf('class="pagehead"');
  if (i >= 0) {
    const j = html.indexOf("</div>", html.indexOf("</p>", i));
    if (j > 0) return html.slice(0, j + 6) + reportChain(n) + html.slice(j + 6);
  }
  return reportChain(n) + html;
}

/* ============================================================================
   2 · Peer Benchmark — ความแตกต่างจาก peer และคำถามว่าความแตกต่างเกิดจากอะไร
   ============================================================================ */
let RP_Q = [];                         // ข้อความคำถามของหน้าปัจจุบัน (อ้างด้วยดัชนีจากปุ่ม)
const rpAp = x => x.ap !== undefined ? x.ap : ampPct(x.amp);
const rpQuad = x => x.quad || zoneOf(x.promo, x.amp);
const rpTier = x => x.tier || tierOf(x.ois ?? x.ipi);
function peerDiff(c, p) {
  const dDp = Math.round(p.dp - c.dp), dAp = Math.round(rpAp(p) - rpAp(c));
  const dFem = Math.round((p.fem - c.fem) * 1000) / 10;
  const qc = rpQuad(c), qp = rpQuad(p), tc = rpTier(c), tp = rpTier(p);
  const bc = c.band || [c.ipi, c.ipi], bp = p.band || [p.ipi, p.ipi];
  return { dDp, dAp, dFem, qc, qp, tc, tp, cross: p.ind !== c.ind,
    dom: Math.abs(dDp) >= Math.abs(dAp) ? "ceo" : "board",
    overlap: !(bc[1] < bp[0] || bp[1] < bc[0]),
    dFam: Math.round((p.fam - c.fam) * 1000) / 10, dTen: Math.round(((p.ten || 0) - (c.ten || 0)) * 10) / 10,
    polDiff: !!p.pol !== !!c.pol };
}
/** คำถามว่าความต่างเกิดจากอะไร — คืน { t: ข้อความบนหน้าจอ, f: ข้อความสำหรับแผนพัฒนาบอร์ด/Follow-up }
 *  f ไม่มีคำอ้างคะแนน (เปอร์เซ็นไทล์ · OIS · tier · ชื่อช่อง) เพื่อให้ร่าง 56-1 ส่งออกได้ (ภาคผนวก ง ข้อ 13) */
function peerQs(c, p, d) {
  const q = [], Q = (t, f) => q.push({ t, f: f || t });
  if (d.cross) Q(`ความต่างระหว่าง ${c.t} กับ ${p.t} อาจมาจากบริบทอุตสาหกรรม (${IND[c.ind] || "—"} เทียบ ${IND[p.ind] || "—"}) มากกว่าการกำกับดูแล — ลักษณะธุรกิจ วงจรการลงทุน และแนวปฏิบัติการเขียนรายงานของสองอุตสาหกรรมต่างกันอย่างไร?`);
  if (Math.abs(d.dDp) < 10 && Math.abs(d.dAp) < 10) {
    Q(`ความต่างของทั้งสองแกนน้อย (ไม่เกิน 10 เปอร์เซ็นไทล์)${d.overlap ? " และช่วง 90% ของคะแนนซ้อนทับกัน" : ""} — จะถือว่าสองบริษัทอยู่ในรูปแบบใกล้เคียงกันหรือไม่ ก่อนกำหนดแนวทางพัฒนาจากความต่างนี้?`,
      `ตำแหน่งของ ${c.t} กับ ${p.t} ใกล้เคียงกัน — จะถือว่าสองบริษัทอยู่ในรูปแบบใกล้เคียงกันหรือไม่ ก่อนกำหนดแนวทางพัฒนาจากความต่างนี้?`);
  }
  const qCeo = [`ความต่างของภาษา CEO (${p.t} ${d.dDp > 0 ? "สูงกว่า" : "ต่ำกว่า"} ${Math.abs(d.dDp)} เปอร์เซ็นไทล์) สะท้อนกลยุทธ์ที่ต่างกันจริง หรือเป็นเพียงรูปแบบการเขียนรายงาน?`,
    `ภาษาในสารถึงผู้ถือหุ้นที่ต่างกันระหว่าง ${c.t} กับ ${p.t} สะท้อนกลยุทธ์ที่ต่างกันจริง หรือเป็นเพียงรูปแบบการเขียนรายงาน?`];
  const qCeo2 = [`สารถึงผู้ถือหุ้นของสองบริษัทจัดทำโดยใครและผ่านการเรียบเรียงต่างกันอย่างไร — ทิศทางที่เขียนไว้มีแผนงานหรือโครงการรองรับจริงหรือไม่?`];
  const qBrd = [`องค์ประกอบบอร์ดที่ต่างกัน (สัญญาณโครงสร้างบอร์ดของ ${p.t} ${d.dAp > 0 ? "สูงกว่า" : "ต่ำกว่า"} ${Math.abs(d.dAp)} เปอร์เซ็นไทล์) เกิดจากโครงสร้างผู้ถือหุ้น ช่วงธุรกิจ หรือกระบวนการสรรหา?`,
    `องค์ประกอบบอร์ดที่ต่างกันระหว่าง ${c.t} กับ ${p.t} เกิดจากโครงสร้างผู้ถือหุ้น ช่วงธุรกิจ หรือกระบวนการสรรหา?`];
  const qFem = Math.abs(d.dFem) >= 5 ? [`สัดส่วนกรรมการหญิงที่ต่างกัน (${pct1(c.fem)} เทียบ ${pct1(p.fem)}) มาจากแผนสรรหาและวาระกรรมการที่ต่างกันหรือไม่ และจำนวนคนถึงเกณฑ์ critical mass (≥ ${CRIT_N} คน) หรือยัง?`] : null;
  // แกนที่ต่างมากที่สุดก่อน · ถ้าแกนรองต่าง ≥ 10 เปอร์เซ็นไทล์ ถามด้วย · คำถามต่อเนื่องของแกนหลักไว้ท้าย
  if (d.dom === "ceo") { Q(...qCeo); if (Math.abs(d.dAp) >= 10) Q(...(qFem || qBrd)); Q(...qCeo2); }
  else { Q(...qBrd); if (Math.abs(d.dDp) >= 10) Q(...qCeo); if (qFem) Q(...qFem); }
  if (d.qc === d.qp && d.tc !== d.tp) Q(`ทั้งสองบริษัทอยู่ช่อง ${ZONES[d.qc].l} เดียวกันแต่ต่าง tier (${d.tc} เทียบ ${d.tp}) — ความต่างมาจากความเข้มของสัญญาณด้านใด${d.overlap ? " และเมื่อช่วง 90% ซ้อนทับกัน จะสรุปว่าต่างกันจริงหรือไม่" : ""}?`,
    `${c.t} กับ ${p.t} อยู่ในรูปแบบเดียวกันแต่ระดับต่างกัน — ความต่างมาจากด้านภาษาผู้นำหรือองค์ประกอบบอร์ด?`);
  else if (d.qc !== d.qp) Q(`สองบริษัทอยู่คนละช่อง (${ZONES[d.qc].l} เทียบ ${ZONES[d.qp].l}) — รูปแบบของแต่ละบริษัทเหมาะกับช่วงธุรกิจของตนหรือไม่ แทนการตั้งเป้าย้ายช่องตาม peer?`,
    `${c.t} กับ ${p.t} อยู่คนละรูปแบบ — รูปแบบของแต่ละบริษัทเหมาะกับช่วงธุรกิจของตนหรือไม่ แทนการตั้งเป้าตามคู่เทียบ?`);
  return q.slice(0, 3);
}
function peerQuestions(c, peers) {
  RP_Q = [];
  if (!peers.length) return "";
  const cards = peers.map(p => {
    const d = peerDiff(c, p), qs = peerQs(c, p, d);
    const ctx = [];
    if (d.cross) ctx.push(`ต่างอุตสาหกรรม — ${esc(IND[c.ind] || "—")} เทียบ ${esc(IND[p.ind] || "—")} · ค่าอ้างอิงรายอุตสาหกรรมต่างกัน`);
    if (Math.abs(d.dFam) >= 5) ctx.push(`สัดส่วนกรรมการครอบครัวต่างกัน ${fmt(Math.abs(d.dFam), 1)} จุด (${pct1(c.fam)} เทียบ ${pct1(p.fam)}) — สะท้อนโครงสร้างผู้ถือหุ้นที่ต่างกันได้`);
    if (d.polDiff) ctx.push(`political ties ต่างกัน — ข้อมูลบริบทเท่านั้น ไม่ใช้เป็นเหตุผลเชิงบวกและไม่ใช่คันโยก`);
    if (Math.abs(d.dTen) >= 1) ctx.push(`อายุงานเฉลี่ยบอร์ดต่างกัน ${fmt(Math.abs(d.dTen), 1)} ปี — ไม่มีผลต่อคะแนน แต่บอกช่วงการเปลี่ยนผ่านของบอร์ด`);
    if (c.bsize && p.bsize && c.bsize !== p.bsize) ctx.push(`ขนาดบอร์ด ${c.bsize} เทียบ ${p.bsize} คน — จำนวนกรรมการหญิงที่เป็นคนจริงต่างจากสัดส่วน`);
    if (d.overlap) ctx.push(`ช่วง 90% ของ OpenInnoScore ทั้งสองบริษัทซ้อนทับกัน — ความต่างของคะแนนอาจอยู่ในช่วงความไม่แน่นอน`);
    ctx.push(`ปีบัญชีและแหล่งข้อความ CEO ของทั้งสองบริษัทตรงกันหรือไม่ (สารถึงผู้ถือหุ้นฉบับภาษาอังกฤษ)`);
    const rows = [
      ["CEO Promotion Focus (เปอร์เซ็นไทล์)", fmt(c.dp), fmt(p.dp), d.dDp],
      ["สัญญาณโครงสร้างบอร์ด (เปอร์เซ็นไทล์)", fmt(rpAp(c)), fmt(rpAp(p)), d.dAp],
      ["quadrant", ZONES[d.qc].l, ZONES[d.qp].l, d.qc === d.qp ? "เหมือน" : "ต่าง"],
      ["tier", d.tc, d.tp, d.tc === d.tp ? "เหมือน" : "ต่าง"],
      ["สัดส่วนกรรมการหญิง", pct1(c.fem), pct1(p.fem), (d.dFem > 0 ? "+" : "") + fmt(d.dFem, 1) + " จุด"],
    ];
    const qHtml = qs.map(q => { const i = RP_Q.push({ t: q.t, f: q.f, p: p.t }) - 1;
      return `<li><span>${esc(q.t)}</span><button class="btn g rp-add" data-rpq="${i}">+ เพิ่มเข้าแผนพัฒนาบอร์ด</button></li>`; }).join("");
    return `<div class="rp-peer">
      <div class="rp-peer-h"><b>${esc(c.t)} เทียบ ${esc(p.t)}</b><span>${esc(p.n || "")}</span>
        ${d.cross ? `<span class="pill warn">ข้ามอุตสาหกรรม</span>` : ""}
        <span class="pill mute">ความต่างหลัก: ${d.dom === "ceo" ? "ภาษา CEO" : "องค์ประกอบบอร์ด"}</span></div>
      <div class="tw"><table class="rp-tbl rp-tbl-s"><thead><tr><th>แกนของโมเดล</th><th class="n">${esc(c.t)}</th><th class="n">${esc(p.t)}</th><th class="n">ความต่าง</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="n">${esc(r[1])}</td><td class="n">${esc(r[2])}</td>
          <td class="n">${typeof r[3] === "number" ? (r[3] > 0 ? "+" : "") + r[3] : esc(r[3])}</td></tr>`).join("")}</tbody></table></div>
      <div class="rp-k">คำถามว่าความแตกต่างเกิดจากอะไร</div>
      <ol class="rp-qs">${qHtml}</ol>
      <div class="rp-k">บริบทที่ตรวจก่อนสรุป <span class="pill mute">บริบท</span></div>
      <ul class="rp-ctx">${ctx.map(x => `<li>${x}</li>`).join("")}</ul>
    </div>`;
  }).join("");
  return `<div class="card rp-block" style="margin-top:14px">
    <h3>ความแตกต่างจาก peer และคำถามว่าความแตกต่างเกิดจากอะไร <span class="pill mute">รายงานฉบับที่ 2</span></h3>
    <p class="desc">ใช้ตรวจบริบทก่อนกำหนดแนวทางพัฒนา · ความต่างเป็นตำแหน่งบนฐานอ้างอิงเชิงความสัมพันธ์ ไม่ใช่เหตุ-ผล ·
      คำถามสร้างจากแกนที่ต่างกันมากที่สุด เป็นแนวทางตรวจสอบต่อ ไม่ใช่ข้อสรุปว่าบริษัทใดมีปัญหา</p>
    ${cards}
    <div class="note" style="margin-top:10px;font-size:11px">กรรมการครอบครัว political ties และอายุงานเป็น<b>ข้อมูลบริบท</b> ไม่ใช่คันโยก ·
      ระบบไม่ใช้ political ties เป็นเหตุผลเชิงบวก · ห้ามนำผลเทียบไปให้คะแนนกรรมการรายบุคคล</div>
  </div>`;
}
const _rpViewPeer = VIEWS.peer;
VIEWS.peer = function () {
  const h = _rpViewPeer();
  if (!isUnlocked("peer")) return rpInsertChain(h, 2);
  const c = cur(), peers = (S.peers || []).map(t => byT[t]).filter(Boolean);
  return rpInsertChain(h, 2) + peerQuestions(c, peers);
};

/* ============================================================================
   3 · What-if Report — ผลภายใต้สมมติฐาน ทางเลือก และหลักฐานที่ต้องมีก่อนดำเนินการ
   ============================================================================ */
const RP_EV_FEM = ["skills matrix ของบอร์ดปัจจุบันและทักษะที่ยังขาด", "แผนสรรหาและวาระกรรมการ (ใครครบวาระเมื่อใด)",
  `จำนวนกรรมการหญิงเป็นคน ≥ ${typeof CRIT_N !== "undefined" ? CRIT_N : 3} คนตามเกณฑ์ critical mass ที่ผู้วิจัยกำหนด — ไม่ใช่สัดส่วนอย่างเดียว`];
const RP_EV_CEO = ["ยุทธศาสตร์ที่เขียนไว้จริงและแผนงานที่รองรับ", "ตัวอย่างโครงการร่วมพัฒนากับภายนอกที่เกิดขึ้นจริง",
  "ผลรัน LIWC-22 ของสารถึงผู้ถือหุ้นฉบับจริง (ไม่ใช่ร่างทดสอบ)"];
const RP_CAVEAT = "ผลตามสูตรเชิงความสัมพันธ์ ไม่ใช่การรับประกันว่าปรับแล้วจะเกิดผล";
/* MVP 1 · F4 (G1–G6) — รายงาน What-if ใต้ Studio
   ฉากทัศน์: ปัจจุบัน · กรรมการหญิงที่ p90 ของอุตสาหกรรม · ขั้นต่ำ 30% (+ สถานะที่ตั้งบน Studio ถ้าต่างจากปัจจุบัน)
   ตัวแปรเดียว = จำนวนกรรมการหญิง (เพิ่มขึ้นเท่านั้น · ≤ 50%) · ไม่มีอายุงาน/B_FULL (G1) · ต้องมีจำนวนกรรมการจริง (D4)
   ผลจาก window.MVP_WHATIF ผ่าน m1WhatIf ของ Studio (ตัวคูณ e^ΔB + ช่วง 90% · W* เป็นร้อยละและจำนวนคน · ประโยค G6)
   ไม่ผ่าน G3 → ไม่แสดงผลต่างของคะแนน · ปี FAIL → งด What-if (G5) */
const RP_WI_INFO = () => ({
  sim: { ev: RP_EV_FEM, as: [M1A.T("Number of women directors as set on the What-if Studio", "จำนวนกรรมการหญิงตามที่ตั้งบน What-if Studio")] },
  opt: { ev: RP_EV_FEM, as: [M1A.T("Share of women directors raised to the industry p90 (at most 50%)", "สัดส่วนกรรมการหญิงขึ้นไปที่ p90 ของอุตสาหกรรม (ไม่เกิน 50%)")] },
  reg: { ev: [...RP_EV_FEM, M1A.T("The SET guideline referred to and its effective year", "แนวทางของ ตลท. ที่อ้างอิงและปีที่มีผล")], as: [M1A.T("Share of women directors at least 30% (at most 50%)", "สัดส่วนกรรมการหญิงอย่างน้อย 30% (ไม่เกิน 50%)")] },
});
const RP_AS_COMMON = () => [M1A.T("One simulated variable: the number of women directors (increase-only, at most 50%) with the actual board size entered (D4)", "ตัวแปรที่จำลองมีตัวเดียว: จำนวนกรรมการหญิง (เพิ่มขึ้นเท่านั้น ไม่เกิน 50%) ด้วยจำนวนกรรมการจริงที่กรอก (D4)"),
  M1A.T("All other inputs keep their actual values; family directors and political ties are read-only context (G1 · R6)", "ค่าป้อนอื่นทั้งหมดใช้ค่าจริง · กรรมการครอบครัวและ political ties เป็นข้อมูลบริบทอ่านอย่างเดียว (G1 · R6)"),
  M1A.T("The REF-928 reference base and the formula do not change; other companies keep their positions", "ฐานอ้างอิง REF-928 และสูตรไม่เปลี่ยน · บริษัทอื่นในฐานอ้างอิงไม่เปลี่ยนตำแหน่ง")];
let RP_WI = [];
function rpWiCap(n, now) { return Math.max(now, Math.floor(.5 * n + 1e-9)); }
function whatIfReport() {
  const T = M1A.T;
  if (typeof window.M1_WI_STATE !== "function" || typeof m1Subj !== "function" || typeof m1WhatIf !== "function") return "";
  let st = null; try { st = window.M1_WI_STATE(); } catch (e) { st = null; }
  const sub = m1Subj(), co = sub && sub.co ? sub.co : cur();
  const head = `<div class="rp-print-head">OpenInnoScore · What-if Report · ${esc(co.n || co.t)} (${esc(co.t)}) · ${esc(rpNow())} · ${esc(M1A.ver())}</div>
    <h3>${T("What-if Report · results under assumptions, options and evidence needed first", "รายงาน What-if · ผลภายใต้สมมติฐาน ทางเลือก และหลักฐานที่ต้องมีก่อนดำเนินการ")} <span class="pill mute">${T("Report 3", "รายงานฉบับที่ 3")}</span></h3>`;
  const wrap = body => `<div class="card rp-block rp-wi" style="margin-top:14px" id="rpWi">${head}${body}</div>`;
  if (!st || !st.ready) {
    const r = st && st.result;
    return wrap(`<div class="note" id="rpWiNeed">${r && r.error && !/board_size/.test(r.error) ? esc(r.error) : T("Enter the actual board size in the What-if Studio first (D4) — there is no default board size.", "กรอกจำนวนกรรมการจริงใน What-if Studio ก่อน (D4) — ไม่มีขนาดบอร์ดตั้งต้น")}</div>`);
  }
  const n = st.n, now = st.now, r0 = st.result, fy = r0.fyStatus ? r0.fyStatus.fy : (co.fy || FY_SHOWN);
  if (st.suspended) return wrap(`<div class="m1a-chips">${M1A.fyChip(fy)}</div><div class="note crit" id="rpWiSusp">${esc(M1A.isEN() ? r0.message_en || "" : r0.message_th || r0.message_en || "")}</div>`);
  const withheld = !!st.withheld;
  const tgtP90 = Math.min(rpWiCap(n, now), Math.max(now, Math.round((typeof femQ === "function" ? femQ(co.ind, .9) : 0) * n)));
  const tgtReg = Math.min(rpWiCap(n, now), Math.max(now, Math.ceil(.3 * n - 1e-9)));
  const sc = [{ k: "cur", l: T("Current", "ปัจจุบัน"), t: now }];
  if (st.target !== now) sc.push({ k: "sim", l: T("Set on the Studio", "ตามที่ตั้งบน Studio"), t: st.target });
  sc.push({ k: "opt", l: T("More women (industry p90)", "กรรมการหญิงที่ p90 อุตสาหกรรม"), t: tgtP90 }, { k: "reg", l: T("Minimum 30%", "ขั้นต่ำ 30%"), t: tgtReg });
  sc.forEach(x => { try { x.r = x.t === st.target ? r0 : m1WhatIf(sub, n, now, x.t); } catch (e) { x.r = null; } });
  const f1 = v => v === null || v === undefined || !isFinite(+v) ? "—" : fmt(+v, 1);
  const f3 = v => v === null || v === undefined || !isFinite(+v) ? "—" : (+v).toFixed(3);
  const WH = `<span class="pill mute">${T("withheld (G3)", "ไม่แสดง (G3)")}</span>`;
  const row = x => { const r = x.r || {}, s = x.k === "cur" ? r.cur : r.sim || {}, same = x.t === now;
    return `<tr data-rpsc="${x.k}"><td>${esc(x.l)}</td><td class="n">${x.t} ${T("of", "จาก")} ${n} (${pct1(x.t / n)})</td>
      <td class="n">${withheld && !same ? WH : `<b>${f1(s.ois)}</b> <span class="gx-sm">[${f1((s.band90 || [])[0])}, ${f1((s.band90 || [])[1])}]</span>`}</td>
      <td>${withheld && !same ? WH : esc(s.quad || "—")}</td><td class="n">Y P${f1(s.Y)}</td>
      <td class="n">${same ? "—" : withheld ? WH : r.multiplier ? `×${f3(r.multiplier)} [${f3((r.multiplier_band90 || [])[0])}, ${f3((r.multiplier_band90 || [])[1])}]` : "—"}</td></tr>`; };
  const ws = r0.W_star, wsTxt = isFinite(ws) ? (ws <= 0 ? T("W* ≤ 0% — above the divider at any share", "W* ≤ 0% — อยู่เหนือเส้นแบ่งที่ทุกสัดส่วน")
    : `W* = ${fmt(ws * 100, 1)}% (≈ ${r0.W_star_headcount} ${T("of", "จาก")} ${n})`) : "W* —";
  RP_WI = sc.filter(x => x.k !== "cur").map(x => { const info = RP_WI_INFO()[x.k] || { ev: [], as: [] };
    return { k: x.k, l: x.l, lf: `${x.l} · ${T("women directors", "กรรมการหญิง")} ${x.t} ${T("of", "จาก")} ${n}`, ev: info.ev, as: info.as, r: x.r, t: x.t }; });
  const alts = RP_WI.map((a, i) => { const r = a.r || {}, sen = M1A.isEN() ? r.sentence_en : (r.sentence_th || r.sentence_en);
    return `<div class="rp-alt">
      <div class="rp-alt-h"><b>${esc(a.l)}</b><span>${a.t} ${T("of", "จาก")} ${n}</span></div>
      ${withheld ? `<p class="gx-sm">${esc(M1A.lab("withheld_g3"))}</p>` : sen && a.t !== now ? `<p class="m1a-g6">${esc(sen)}</p>` : ""}
      <div class="grid g2 tight rp-alt-g">
        <div><div class="rp-k">${T("Assumptions", "สมมติฐานที่ใช้")}</div><ul class="rp-ctx">${a.as.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><div class="rp-k">${T("Evidence needed before acting", "หลักฐานที่ต้องมีก่อนดำเนินการ")}</div><ul class="rp-ctx">${a.ev.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
      <button class="btn g rp-add rp-noprint" data-rpwi="${i}">${T("+ Add this option to the board development plan", "+ เพิ่มทางเลือกนี้เข้าแผนพัฒนาบอร์ด")}</button></div>`; }).join("");
  return wrap(`<p class="desc">${T("One variable only — the number of women directors (increase-only, at most 50%), with the actual board size entered. Options are listed in a fixed order, not ranked by score.", "ตัวแปรเดียว — จำนวนกรรมการหญิง (เพิ่มขึ้นเท่านั้น ไม่เกิน 50%) ด้วยจำนวนกรรมการจริงที่กรอก · ทางเลือกเรียงลำดับคงที่ ไม่จัดอันดับตามคะแนน")}</p>
    <div class="m1a-chips" style="margin-bottom:8px">${M1A.fyChip(fy)}${withheld ? ` <span class="pill warn" id="rpWiG3">${esc(M1A.lab("withheld_g3"))}</span>` : ""}</div>
    <div class="note warn" style="margin-bottom:12px"><b>${esc(RP_CAVEAT)}</b> — ${T("positions against the reference base by formula; not probabilities or expected counts", "ตัวเลขเป็นตำแหน่งบนฐานอ้างอิงตามสูตร ไม่ใช่ความน่าจะเป็นหรือจำนวนกิจกรรมที่คาดว่าจะเกิด")}</div>
    <div class="tw"><table class="rp-tbl" id="rpWiTbl"><thead><tr><th>${T("Scenario", "ฉากทัศน์")}</th><th class="n">${T("Women directors", "กรรมการหญิง")}</th><th class="n">OIS [${T("90% band", "ช่วง 90%")}]</th>
      <th>${T("Quadrant", "ช่อง 2×2")}</th><th class="n">${T("Board amplification", "Board amplification")}</th><th class="n">${T("Multiplier e^ΔB [90%]", "ตัวคูณ e^ΔB [90%]")}</th></tr></thead>
      <tbody>${sc.map(row).join("")}</tbody></table></div>
    <p class="gx-sm" id="rpWiWstar">${esc(wsTxt)} · ${T("share of women directors at which board amplification reaches the divider", "สัดส่วนกรรมการหญิงที่ board amplification ถึงเส้นแบ่ง")}</p>
    <div class="rp-k" style="margin-top:14px">${T("Options, assumptions and evidence needed", "ทางเลือก สมมติฐาน และหลักฐานที่ต้องมี")}</div>
    ${alts}
    <div class="rp-k">${T("Assumptions common to every scenario", "สมมติฐานร่วมของทุกฉากทัศน์")}</div>
    <ul class="rp-ctx">${RP_AS_COMMON().map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <div class="rp-tools rp-noprint"><button class="btn s" id="rpWiPrint">${T("Print What-if report", "พิมพ์รายงาน What-if")}</button>
      <span class="rp-hint">${T("Prints this block only", "พิมพ์เฉพาะบล็อกนี้ · บันทึกเป็น PDF ได้จากหน้าต่างพิมพ์")}</span></div>
    <p class="rp-foot">${esc(RP_CAVEAT)} · ${T("no coefficients shown · family directors and political ties are read-only context", "ไม่แสดงค่าสัมประสิทธิ์ของสูตร · กรรมการครอบครัวและ political ties เป็นข้อมูลบริบท อ่านอย่างเดียว")} · ${esc(M1A.ver())}</p>`);
}
const _rpViewStudio = VIEWS.studio;
VIEWS.studio = function () {
  const h = _rpViewStudio();
  if (!isUnlocked("studio")) return rpInsertChain(h, 3);
  return rpInsertChain(h, 3) + whatIfReport();
};

/* ============================================================================
   4 · Board Development & Follow-up Report
   รวม (ก) แผนพัฒนาบอร์ดจาก Compass ทุกบริษัท (ข) ช่องที่ผู้ใช้กรอกใน Compass (ค) ข้อสั่งการจาก ois_pilot_v1
   ============================================================================ */
function rpPilot() {
  if (typeof PL === "object" && PL && PL.dir) return { o: PL, live: true };
  try { const o = JSON.parse(localStorage.getItem("ois_pilot_v1") || "null"); if (o && o.dir) return { o, live: false }; } catch (e) { }
  return { o: { dir: { rows: [] } }, live: false };
}
function rpPilotSave(P) {
  if (P.live && typeof plSave === "function") return plSave();
  try { localStorage.setItem("ois_pilot_v1", JSON.stringify(P.o)); } catch (e) { }
}
/** รวมทุกแถวเป็นรูปแบบเดียว · ref ชี้กลับไปที่วัตถุต้นทางเพื่อเขียนค่าที่แก้กลับ */
function fuRows() {
  const out = [];
  Object.entries(S.sc || {}).forEach(([k, o]) => {
    if (!o || typeof o !== "object" || !/^sc:/.test(k)) return;
    const t = k.slice(3);
    (o.plan || []).forEach((p, i) => { if (!p || !p.t) return;
      out.push({ key: `p|${t}|${i}`, co: t, kind: "plan", issue: p.t, src: RP_SRC[p.src] || (p.src ? p.src : "Compass"), uc: p.uc || "board",
        concl: p.concl || "", dec: p.decision || "", own: p.owner || "", due: p.due || "", st: p.status || "todo", added: p.d || "" }); });
    [0, 1, 2].forEach(i => {
      if (![o["c" + i], o["a" + i], o["o" + i]].some(x => x && String(x).trim())) return;
      out.push({ key: `c|${t}|${i}`, co: t, kind: "cmp", issue: o["iss" + i] || (o["a" + i] ? `E0${i + 1} · ${o["a" + i]}` : `ตรวจหลักฐาน E0${i + 1}`), src: "Compass", uc: o.uc || "board",
        concl: o["c" + i] || "", dec: o["cdec" + i] || "", own: o["o" + i] || "", due: o["cdue" + i] || (rpIso(o.next) ? o.next : ""), st: o["cst" + i] || "todo" });
    });
  });
  const P = rpPilot();
  (P.o.dir.rows || []).forEach(r => {
    const m = /^\[([A-Z0-9.&-]+)\]\s*/.exec(r.t || "");
    out.push({ key: `d|${r.id}`, co: m ? m[1] : "", kind: "dir", issue: r.t || "(ไม่มีหัวข้อ)", src: RP_SRC[r.src] || "มติ", uc: r.uc || "board",
      concl: r.concl || "", dec: r.dec || "", own: r.own || "", due: r.due || "", st: r.st || "todo" });
  });
  const today = rpToday();
  out.forEach(r => { r.late = r.st !== "done" && rpIso(r.due) && r.due < today; });
  return out;
}
/** เขียนค่าที่แก้บนหน้า Follow-up กลับเข้าที่เก็บต้นทาง */
function fuSet(key, f, v) {
  const [kind, a, b] = key.split("|");
  if (kind === "p") {
    const o = rpSc(a), p = (o.plan || [])[+b]; if (!p) return;
    const map = { concl: "concl", dec: "decision", own: "owner", due: "due", st: "status", issue: "t" };
    if (f === "issue" && !String(v).trim()) return;
    p[map[f]] = v;
    if (typeof scSet === "function" && a === S.t) scSet("plan", o.plan); else save();
  } else if (kind === "c") {
    const o = rpSc(a), map = { concl: "c" + b, dec: "cdec" + b, own: "o" + b, due: "cdue" + b, st: "cst" + b, issue: "iss" + b };
    o[map[f]] = v; save();
  } else if (kind === "d") {
    const P = rpPilot(), r = (P.o.dir.rows || []).find(x => x.id === a); if (!r) return;
    const map = { concl: "concl", dec: "dec", own: "own", due: "due", st: "st", issue: "t" };
    if (f === "issue" && !String(v).trim()) return;
    r[map[f]] = v; rpPilotSave(P);
  }
}
/* ร่าง 56-1 ต้องไม่มีชื่อบริษัทอื่น — แทนชื่อย่อหลักทรัพย์ด้วยคำกลาง (keep = ชื่อย่อที่อนุญาต เช่น บริษัทที่จัดทำแบบ 56-1 เอง) */
/* แก้ไขครั้งที่ 2.4 (ภาคผนวก ง ข้อ 15) — เทียบชื่อย่อหลักทรัพย์แบบตรงตัวพิมพ์ (ตัวพิมพ์ใหญ่) และต้องเป็นคำทั้งคำ
   คำภาษาอังกฤษทั่วไปอย่าง or · top · ace จึงไม่ถูกแทน · ชื่อย่อที่ตรงกับคำย่อทั่วไป (CEO, OIS, SET …) ไม่ถูกแทน */
let _rpTK = null;
/** F5 · รายงานที่ออกนอกองค์กรเรียกบริษัทอื่นว่า "บริษัทหนึ่งในกลุ่มเปรียบเทียบ" / "a company in the comparison group" */
const RP_ANON = () => typeof S === "object" && S.lang === "EN" ? "a company in the comparison group" : "บริษัทหนึ่งในกลุ่มเปรียบเทียบ";
function rpAnon(t, keep) {
  const AN = RP_ANON();
  if (!_rpTK) _rpTK = new Set(COMPS.map(c => String(c.t)).filter(t => /[A-Z]/.test(t) && !["CEO", "OIS", "OI", "SET", "BOD", "CG", "AI"].includes(t)));
  const k = keep ? String(keep) : null;
  let out = String(t ?? "").replace(/(^|[^A-Za-z0-9&.\-])([A-Z][A-Z0-9&.\-]*[A-Z0-9]|[A-Z])(?![A-Za-z0-9&\-]|\.[A-Za-z0-9])/g,
    (m, pre, w) => (_rpTK.has(w) && w !== k) ? pre + AN : m);
  /* ชื่อย่อที่มีตัวพิมพ์เล็ก (เช่น True) — เทียบตรงตัวทั้งคำ */
  _rpTK.forEach(tk => { if (tk === k || !/[a-z]/.test(tk)) return;
    out = out.replace(new RegExp(`(^|[^A-Za-z0-9])${tk.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}(?![A-Za-z0-9])`, "g"), (m, pre) => pre + AN); });
  // ชื่อเต็มของบริษัทอื่น (ภาษาไทย/อังกฤษ) ก็ต้องไม่ปรากฏ
  COMPS.forEach(c => { if (c.n && c.n.length > 3 && String(c.t).toUpperCase() !== k && out.includes(c.n)) out = out.split(c.n).join(AN); });
  return out;
}
/** รายการที่ "เสร็จ" และมีมติ — ใช้ร่วมกับหน้า Template 56-1 (v2_tiers.js) · co = จำกัดเฉพาะบริษัทเดียว (แถวข้อสั่งการที่ไม่ระบุบริษัทนับรวม) */
function fuDoneItems(co) {
  /* แก้ไขครั้งที่ 2.4 (ภาคผนวก ง ข้อ 16) — เมื่อระบุบริษัท ใช้เฉพาะรายการที่ผูกกับบริษัทนั้น (ข้อสั่งการที่ไม่ระบุบริษัทไม่นับ) */
  const rows = fuRows().filter(r => r.st === "done" && String(r.dec || "").trim() && (!co || r.co === co));
  return rows.map(r => ({ co: r.co, src: r.src, issue: rpAnon(r.issue.replace(/^\[[^\]]+\]\s*/, ""), co), dec: rpAnon(r.dec, co), concl: rpAnon(r.concl, co) }));
}
window.fuDoneItems = fuDoneItems; window.rpAnon = rpAnon; window.fuRows = fuRows;
function fu561(rows) {
  const ok = rows.filter(r => r.st === "done" && String(r.dec || "").trim());
  if (!ok.length) return `<p class="rp-hint" style="margin:0">ยังไม่มีรายการที่มีสถานะ “เสร็จ” และมีมติบันทึกไว้ — ส่วนนี้จะแสดงเฉพาะรายการที่ครบทั้งสองเงื่อนไข</p>`;
  const bySrc = {}; ok.forEach(r => { (bySrc[r.src] = bySrc[r.src] || []).push(r); });
  const srcTh = { Grid: "การทบทวนตำแหน่งบน 2×2 Grid", Compass: "รายงาน Board Strategy Compass", Peer: "การเทียบกับกลุ่มบริษัทอ้างอิง",
    "What-if": "การพิจารณาทางเลือกภายใต้สมมติฐาน", BOD: "การประเมินตนเองของคณะกรรมการ (OI-1…OI-6)", "มติ": "มติที่ประชุมคณะกรรมการ", Insight: "ข้อค้นพบจากรายงานวินิจฉัย" };
  const cos = [...new Set(ok.map(r => r.co).filter(Boolean))];
  const lead = `ในรอบปีที่ผ่านมา คณะกรรมการได้ใช้ผลการประเมินด้านการกำกับดูแลนวัตกรรมประกอบการหารือ และกำหนดประเด็นพัฒนารวม ${ok.length} เรื่อง`
    + ` ซึ่งได้ดำเนินการแล้วเสร็จตามมติหรือข้อสรุปของที่ประชุม โดยมีที่มาจาก${Object.keys(bySrc).map(s => (srcTh[s] || s) + ` (${bySrc[s].length} เรื่อง)`).join(" ")}`;
  /* ร่าง 56-1 ต้องไม่มีชื่อบริษัทอื่น — แทนชื่อย่อหลักทรัพย์ด้วยคำกลาง */
  const anon = t => rpAnon(t);
  const items = ok.map(r => `${anon(r.issue.replace(/^\[[^\]]+\]\s*/, ""))} — การดำเนินการตามมติ: ${anon(r.dec)}`);
  RP_561 = [lead + (cos.length > 1 ? ` (รวม ${cos.length} บริษัทในแฟ้มนี้ — ใช้เฉพาะรายการของบริษัทที่จัดทำแบบ 56-1)` : ""), ...items.map((x, i) => `${i + 1}. ${x}`)].join("\n");
  return `<p class="rp-561-lead">${esc(lead)}</p><ol class="rp-561">${items.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <button class="btn g rp-noprint" id="fu561Copy">คัดลอกข้อความ</button>`;
}
let RP_561 = "";
/** ตัวตรวจคำอ้างคะแนน/ตำแหน่งจากแบบจำลอง — ชุดเดียวกับร่าง 56-1 และ Structured Data (ใช้ของ v2_tiers.js เมื่อโหลดแล้ว) */
function T561_SCORE_HIT(t) {
  if (typeof t561ScoreHit === "function") return t561ScoreHit(t);
  const m = String(t || "").match(/OpenInnoScore|\bOIS\b|\bTier\s*\d|เปอร์เซ็นไทล์|percentile|quadrant|Signal\s*B/i);
  return m ? m[0] : "";
}
function viewFollowup() {
  const rows = fuRows(), cnt = { todo: 0, doing: 0, done: 0, late: 0 };
  rows.forEach(r => { cnt[r.st] = (cnt[r.st] || 0) + 1; });
  const overdue = rows.filter(r => r.late).length;
  const f = S.fuF || "all";
  const shown = rows.filter(r => f === "all" ? true : f === "overdue" ? r.late : r.st === f);
  const groups = {}; shown.forEach(r => { const g = r.kind === "dir" ? "__dir" : r.co; (groups[g] = groups[g] || []).push(r); });
  const order = Object.keys(groups).sort((a, b) => a === "__dir" ? 1 : b === "__dir" ? -1 : (a === S.t ? -1 : b === S.t ? 1 : a.localeCompare(b)));
  const ta = (r, k, ph) => `<textarea class="inp rp-ta" rows="2" data-fu="${esc(r.key)}" data-f="${k}" placeholder="${esc(ph)}" aria-label="${esc(ph)}">${esc(r[k])}</textarea>`;
  const inp = (r, k, ph) => `<input class="inp rp-in" data-fu="${esc(r.key)}" data-f="${k}" value="${esc(r[k])}" placeholder="${esc(ph)}" aria-label="${esc(ph)}">`;
  const date = r => rpIso(r.due) || !r.due ? `<input class="inp rp-in" type="date" data-fu="${esc(r.key)}" data-f="due" value="${esc(r.due)}" aria-label="กำหนดติดตาม">`
    : `<div class="rp-hint">${esc(r.due)}</div><input class="inp rp-in" type="date" data-fu="${esc(r.key)}" data-f="due" aria-label="กำหนดติดตาม">`;
  const sel = r => `<select class="sel rp-in rp-st-${r.st}" data-fu="${esc(r.key)}" data-f="st" aria-label="สถานะ">${Object.entries(RP_ST).map(([v, l]) =>
    `<option value="${v}"${r.st === v ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  const coHead = g => {
    if (g === "__dir") return `<tr class="rp-grp"><td colspan="8"><b>ข้อสั่งการบอร์ด / Compliance program</b> <span>จากหน้า Pilot · ois_pilot_v1</span></td></tr>`;
    const o = (S.sc || {})["sc:" + g] || {}, co = byT[g];
    const meta = [o.res ? `มติ/ข้อสรุปหลังประชุม: ${esc(o.res)}` : "ยังไม่มีมติหลังประชุม",
      o.sign ? `ผู้จัดทำ: ${esc(o.sign)}` : "", o.cg ? `ตรวจ CG: ${esc(o.cg)}` : "", o.next ? `รอบติดตามถัดไป: ${esc(rpThDate(o.next))}` : ""].filter(Boolean).join(" · ");
    return `<tr class="rp-grp"><td colspan="8"><b>${esc(g)}</b>${co ? ` <span>${esc(co.n)}</span>` : ""}
      <div class="rp-grp-m">${meta} <button class="lnk rp-noprint" data-fucmp="${esc(g)}">แก้ใน Compass</button></div></td></tr>`;
  };
  const body = order.length ? order.map(g => coHead(g) + groups[g].map(r => `<tr class="${r.late ? "rp-late" : ""}${r.st === "done" ? " rp-done" : ""}">
      <td class="rp-issue"><textarea class="inp rp-ta rp-issue-ed" rows="2" data-fu="${esc(r.key)}" data-f="issue" aria-label="ข้อความประเด็น (แก้ได้)">${esc(r.issue)}</textarea>${T561_SCORE_HIT(r.issue) ? `<div class="rp-hint b4-scorehint">มีคำอ้างคะแนน/ตำแหน่ง (“${esc(T561_SCORE_HIT(r.issue))}”) — แก้ข้อความก่อนใช้ในร่าง 56-1</div>` : ""}${r.added ? `<div class="rp-hint">เพิ่มเมื่อ ${esc(r.added)}</div>` : ""}${r.late ? `<div><span class="pill crit">เกินกำหนด</span></div>` : ""}</td>
      <td><span class="pill mute">${esc(r.src)}</span></td>
      <td class="rp-uc">${esc(rpUcLabel(r.uc))}</td>
      <td>${ta(r, "concl", "สรุปสิ่งที่หารือ")}</td>
      <td>${ta(r, "dec", "มติจากการประชุมจริง")}</td>
      <td>${inp(r, "own", "ตำแหน่ง เช่น CSO")}</td>
      <td>${date(r)}</td>
      <td>${sel(r)}</td></tr>`).join("")).join("")
    : `<tr><td colspan="8" class="rp-empty">${rows.length ? "ไม่มีรายการในตัวกรองนี้" : "ยังไม่มีประเด็นติดตาม — กด “+ เพิ่มเข้าแผนพัฒนาบอร์ด” จากหน้า Compass, Peer Benchmark หรือ What-if หรือกรอกตารางในหน้า Compass"}</td></tr>`;
  const stat = (k, l, v, col) => `<button class="stat rp-stat${f === k ? " on" : ""}" data-fuf="${k}"><div class="k">${l}</div><div class="v"${col ? ` style="color:${col}"` : ""}>${v}</div></button>`;
  return `<div class="rp-fu">${pageHead("รายงานฉบับที่ 4 · ติดตามผล", "Board Development & Follow-up Report",
      "ข้อสรุปจากการหารือ มติ ผู้รับผิดชอบ และกำหนดติดตาม — เปลี่ยนผลประเมินเป็นงานที่ติดตามได้ · รวมประเด็นจาก Grid, Compass, Peer, What-if และข้อสั่งการบอร์ดของทุกบริษัทที่บันทึกไว้ในเครื่องนี้")}
    ${reportChain(4)}
    <div class="note warn rp-rule"><b>มติและข้อสรุปต้องมาจากการประชุมจริงและผู้ใช้ยืนยัน — ระบบไม่เติมให้</b> · แก้ข้อความประเด็นได้ในช่องแรกของตาราง ·
      ผู้รับผิดชอบระบุเป็นตำแหน่ง ไม่ใช่ชื่อบุคคล · ข้อมูลอยู่ในเครื่องผู้ใช้เท่านั้น</div>
    <div class="grid g4 tight rp-stats rp-noprint">
      ${stat("all", "ทั้งหมด", rows.length)}${stat("todo", RP_ST.todo, cnt.todo)}${stat("doing", RP_ST.doing, cnt.doing)}
      ${stat("done", RP_ST.done, cnt.done, "var(--ok)")}${stat("late", RP_ST.late, cnt.late, "var(--warn)")}
      ${stat("overdue", "เกินกำหนด", overdue, overdue ? "var(--crit)" : "")}</div>
    <div class="rp-tools rp-noprint">
      <span class="rp-hint">ตัวกรอง: ${f === "all" ? "ทั้งหมด" : f === "overdue" ? "เกินกำหนด" : RP_ST[f]} · วันนี้ ${esc(rpThDate(rpToday()))} · แก้ค่าในตารางแล้วบันทึกอัตโนมัติ</span>
      <span style="flex:1"></span>
      <button class="btn g" id="fuCsv">ส่งออก CSV</button>
      <button class="btn s" id="fuPrint">พิมพ์รายงาน</button></div>
    <div class="card rp-card"><div class="tw"><table class="rp-tbl rp-futbl"><thead><tr>
      <th style="min-width:220px">ประเด็น</th><th>ที่มา</th><th>มุมมอง use case</th>
      <th style="min-width:170px">ข้อสรุปจากการหารือ <span>ผู้ใช้กรอก</span></th><th style="min-width:170px">มติ <span>ผู้ใช้กรอก</span></th>
      <th style="min-width:130px">ผู้รับผิดชอบ (ตำแหน่ง)</th><th>กำหนดติดตาม</th><th>สถานะ</th></tr></thead>
      <tbody>${body}</tbody></table></div></div>
    <div class="card rp-card" style="margin-top:14px">
      <h3>ข้อความที่ใช้ในร่าง 56-1 ได้ <span class="pill mute">เฉพาะรายการ “เสร็จ” ที่มีมติ</span></h3>
      <p class="desc">ใช้เฉพาะกระบวนการประเมิน ประเด็นพัฒนา และการดำเนินการที่เกิดขึ้นจริงและผ่านการตรวจอนุมัติแล้ว ·
        ข้อความเขียนเป็นภาพรวม ไม่ระบุชื่อบุคคลหรือตำแหน่งผู้รับผิดชอบ · ตำแหน่งบน Grid เพียงอย่างเดียวไม่ใช่หลักฐานว่าบอร์ดพัฒนาประสิทธิผลสำเร็จ ·
        ตรวจถ้อยคำในมติอีกครั้งว่าไม่มีชื่อบุคคลก่อนนำไปใช้</p>
      ${fu561(rows)}
      <div class="rp-noprint" style="margin-top:9px"><button class="btn s" data-goto="t561">เปิดหน้า ร่าง 56-1 · Template และการอนุมัติ →</button></div>
    </div>
    <p class="rp-foot">ผลประเมินเป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่เหตุ-ผล · ห้ามนำผลไปให้คะแนนกรรมการรายบุคคล ·
      พิมพ์จาก OpenInnoScore ต้นแบบ · ${esc(rpThDate(rpToday()))}</p>
  </div>`;
}
function wireFollowup(h) {
  wireChain(h);
  h.querySelectorAll("[data-fu]").forEach(el => {
    const fire = () => { fuSet(el.dataset.fu, el.dataset.f, el.tagName === "SELECT" || el.type === "date" ? el.value : el.value.trim()); };
    if (el.tagName === "SELECT" || el.type === "date") el.onchange = () => { fire(); render(); };
    else if (el.dataset.f === "issue") el.addEventListener("change", () => { fire(); render(); });
    else el.addEventListener("change", fire);
  });
  h.querySelectorAll("[data-fuf]").forEach(b => b.onclick = () => { S.fuF = S.fuF === b.dataset.fuf ? "all" : b.dataset.fuf; render(); });
  h.querySelectorAll("[data-fucmp]").forEach(b => b.onclick = () => {
    const t = b.dataset.fucmp; if (!byT[t]) return;
    S.t = t; S.peers = []; S.wi = null; const sc = $("#selCo"); if (sc) sc.value = t;
    if (typeof syncChrome === "function") syncChrome(); go("compass");
  });
  const csv = h.querySelector("#fuCsv"); if (csv) csv.onclick = () => {
    const rows = fuRows();
    const uc1 = rpUcId() === "credit" || rows.some(r => r.uc === "credit");
    rpDl(`ois_followup_${new Date().getFullYear() + 543}.csv`, rpCsv([...(uc1 ? [[M1A.lab("supporting")]] : []), ["param_version", M1A.ver()], ["บริษัท", "ประเด็น", "ที่มา", "มุมมอง use case", "ข้อสรุปจากการหารือ", "มติ", "ผู้รับผิดชอบ (ตำแหน่ง)", "กำหนดติดตาม", "สถานะ", "เกินกำหนด"].map(x => typeof b5H === "function" ? b5H(x) : x),
      ...rows.map(r => [r.co, rpAnon(r.issue, r.co), r.src, rpUcLabel(r.uc), rpAnon(r.concl, r.co), rpAnon(r.dec, r.co), r.own, r.due, RP_ST[r.st] || r.st, r.late ? "ใช่" : ""])]));
    toast(`ส่งออก ${rows.length} รายการ`);
  };
  const pr = h.querySelector("#fuPrint"); if (pr) pr.onclick = () => rpPrint("rp-print-fu");
  const cp = h.querySelector("#fu561Copy"); if (cp) cp.onclick = () => {
    if (typeof copyText === "function") copyText(RP_561); else if (navigator.clipboard) navigator.clipboard.writeText(RP_561).then(() => toast("คัดลอกแล้ว"));
  };
}

/* ---------------------------------------------------------------- wiring ของหน้าที่ห่อไว้ */
function wireReportsCommon(h) {
  wireChain(h);
  h.querySelectorAll("[data-rpq]").forEach(b => b.onclick = () => {
    const q = RP_Q[+b.dataset.rpq]; if (!q) return;
    rpPlanAdd(`[Peer ${q.p}] ${q.f || q.t}`, "peer"); b.textContent = "✓ อยู่ในแผนแล้ว"; b.disabled = true;
  });
  h.querySelectorAll("[data-rpwi]").forEach(b => b.onclick = () => {
    const a = RP_WI[+b.dataset.rpwi]; if (!a) return;
    /* ข้อความในแผนไม่มีคะแนนหรือชื่อช่อง — ใช้ต่อในร่าง 56-1 ได้ (ภาคผนวก ง ข้อ 13) */
    rpPlanAdd(`[What-if] พิจารณาทางเลือก “${a.lf || a.l}” — หลักฐานที่ต้องมี: ${a.ev.join("; ")}`, "whatif");
    b.textContent = "✓ อยู่ในแผนแล้ว"; b.disabled = true;
  });
  const wp = h.querySelector("#rpWiPrint"); if (wp) wp.onclick = () => rpPrint("rp-print-wi");
}

/* ---------------------------------------------------------------- ลงทะเบียน */
VIEWS.followup = viewFollowup;
if (typeof WIRES2 === "object" && WIRES2) {
  WIRES2.followup = wireFollowup;
  ["peer", "studio"].forEach(k => {
    const _w = WIRES2[k];
    WIRES2[k] = function (h) { if (typeof _w === "function") _w(h); wireReportsCommon(h); };
  });
}
(function () {
  if (NAV.some(n => n.id === "followup")) return;
  const i = NAV.findIndex(n => n.id === "compass");
  const item = { id: "followup", g: 2, ico: "✓", lab: "Board Development & Follow-up" };
  if (i >= 0) NAV.splice(i + 1, 0, item); else NAV.push(item);
  buildNav();
  if (S.user) syncNavLocks();
  if (S.user && ["peer", "studio", "followup"].includes(S.view)) render();
})();

/* แก้ไขครั้งที่ 2.1 — หน้าที่ลงทะเบียนในไฟล์หลัง ๆ (compass, followup, หน้า Pilot) ถูก initV2 ตีกลับไป Zone A ตอนเปิดหน้าใหม่
   เพราะยังไม่มีอยู่ตอนตรวจ — คืนหน้าที่ผู้ใช้เปิดค้างไว้หลังทุกไฟล์โหลดครบ */
(() => {
  try {
    const o = JSON.parse(localStorage.getItem("boardsignal_demo_v1") || "null");
    const vw = o && o.vw;
    if (S.user && vw && VIEWS[vw] && S.view !== vw) {
      S.view = vw;
      $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + vw));
      if (typeof syncNavLocks === "function") syncNavLocks();
      render();
    }
  } catch (e) { }
})();

/* ============================================================================
   MVP 1 · F6 — รายงานการกำกับดูแล OI ของคณะกรรมการ (Board OI Governance report) · หน้า #v-boardreport
   รายงานฉบับเดียวสำหรับพิมพ์ ของบริษัทหนึ่ง ปีบัญชีหนึ่ง เรียงตามลำดับในรายงานแก้ไข F6:
     (1) แบบประเมินตนเอง SET ตามที่ตอบ (0–4) · (2) OI-1…6 ตามที่ตอบ (1–5) พร้อมหลักฐาน · (3) ตำแหน่งบน Grid และประเด็นสำหรับบอร์ด
     (4) หมายเหตุ What-if เฉพาะเมื่อผ่าน G3 · (5) ร่างข้อความ 56-1 สำหรับให้คนตรวจ
   กติกา: สองมาตราส่วนแสดงคู่กันตามที่ตอบ ไม่รวมเป็นคะแนนเดียว (#11 = MVP 2) · ไม่มีคะแนนกรรมการรายบุคคล ·
          ส่งผ่านขั้นตรวจและอนุมัติเดิมของร่าง 56-1 (T561.ap)
   ============================================================================ */
const BR = { fy: null };
function brYears(c) {
  const ys = new Set([c.fy || FY_SHOWN]);
  try { (window.bodSetYears ? window.bodSetYears(c.t) : []).forEach(y => ys.add(+y)); } catch (e) { }
  try { const all = (typeof PL === "object" && PL && PL.bodAll) || {}; Object.keys(all).forEach(k => { const [t, y] = k.split("|"); if (t === c.t && +y) ys.add(+y > 2400 ? +y - 543 : +y); }); } catch (e) { }
  return [...ys].filter(y => y > 2000 && y < 2100).sort((a, b) => a - b);
}
function brFy(c) {
  const ys = brYears(c);
  if (!BR.fy || !ys.includes(BR.fy)) {
    const withData = ys.filter(y => (window.bodSetFor && window.bodSetFor(c.t, y)) || (window.bodOiFor && window.bodOiFor(c.t, y)));
    BR.fy = withData.length ? withData[withData.length - 1] : (c.fy || FY_SHOWN);
  }
  return BR.fy;
}
/** ข้อมูลของรายงาน — ใช้ร่วมกับร่าง 56-1 ({{ผลประเมิน BOD}}) */
function brData(c, fy) {
  const set = window.bodSetFor ? window.bodSetFor(c.t, fy) : null;
  const oi = window.bodOiFor ? window.bodOiFor(c.t, fy) : null;
  return { set, oi, items: typeof OI_ITEMS !== "undefined" ? OI_ITEMS : [], labs: typeof OI_LABS !== "undefined" ? OI_LABS : [] };
}
window.m1aBoardData = brData;
function brSetHtml(D, fy) {
  const T = M1A.T, s = D.set;
  if (!s) return `<div class="m1a-empty">${T(`No whole-board SET self-assessment saved for FY${fy}.`, `ยังไม่มีผลแบบประเมินตนเอง SET แบบทั้งคณะของปีบัญชี ${fy + 543} (FY${fy})`)}
    <button class="lnk rp-noprint" data-goto="bodset">${T("Open Board self-assessment (SET) →", "เปิดแบบประเมินตนเองของคณะกรรมการ (SET) →")}</button></div>`;
  const sc = s.calc.sc, rows = s.calc.dims.map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.name)}</td><td class="n">${d.n}</td><td class="n"><b>${isNaN(d.mean) ? "—" : fmt(d.mean, 2)}</b></td></tr>`).join("");
  const items = s.ev.dims.map((d, i) => `<details class="m1a-det"><summary>${i + 1}. ${esc(d.name)}</summary><ol class="m1a-ans">${d.items.map(it => `<li><span>${esc(it.t)}</span><b class="m1a-v">${typeof it.v === "number" ? it.v : "—"}</b></li>`).join("")}</ol></details>`).join("");
  return `<p class="m1a-scale">${T(`Scale ${sc.lo}–${sc.hi} as answered`, `มาตราส่วน ${sc.lo}–${sc.hi} ตามที่ตอบ`)} · ${T("whole board (board level only)", "ประเมินทั้งคณะ (ระดับคณะเท่านั้น)")} · ${esc(s.ev.at ? String(s.ev.at).slice(0, 10) : "")}</p>
    <div class="tw"><table class="m1a-tbl" id="brSetTbl"><thead><tr><th>#</th><th>${T("Dimension", "ด้าน")}</th><th class="n">${T("Items", "ข้อ")}</th><th class="n">${T(`Mean (${sc.lo}–${sc.hi})`, `ค่าเฉลี่ย (${sc.lo}–${sc.hi})`)}</th></tr></thead>
    <tbody>${rows}<tr class="m1a-tot"><td colspan="3">${T("All items", "ทุกข้อ")}</td><td class="n"><b>${isNaN(s.calc.mean) ? "—" : fmt(s.calc.mean, 2)}</b> / ${sc.hi}</td></tr></tbody></table></div>
    ${items}${s.others ? `<p class="m1a-sm">${T(`${s.others} individual/committee evaluation(s) for this year exist and are not included (no individual-director scores in this report).`, `มีแบบประเมินรายบุคคล/ชุดย่อยของปีนี้ ${s.others} แบบ ซึ่งไม่นำมารวมในรายงานนี้ (ไม่มีคะแนนกรรมการรายบุคคล)`)}</p>` : ""}`;
}
function brOiHtml(D, fy) {
  const T = M1A.T, o = D.oi;
  if (!o) return `<div class="m1a-empty">${T(`No OI-1…6 answers saved for FY${fy}.`, `ยังไม่มีคำตอบ OI-1…6 ของปีบัญชี ${fy + 543} (FY${fy})`)}
    <button class="lnk rp-noprint" data-goto="bod">${T("Open BOD Self-Assessment (OI-1…6) →", "เปิด BOD Self-Assessment (OI-1…6) →")}</button></div>`;
  return `<p class="m1a-scale">${T("Scale 1–5 as answered", "มาตราส่วน 1–5 ตามที่ตอบ")} · ${T("board-level answers only", "คำตอบระดับคณะเท่านั้น")} · ${T(`${o.done.length} of ${D.items.length} answered`, `ตอบแล้ว ${o.done.length} จาก ${D.items.length} ข้อ`)}</p>
    <div class="tw"><table class="m1a-tbl" id="brOiTbl"><thead><tr><th>${T("Item", "ข้อ")}</th><th>${T("CG Code", "CG Code")}</th><th class="n">${T("Answer (1–5)", "คำตอบ (1–5)")}</th><th>${T("Evidence", "หลักฐาน")}</th></tr></thead><tbody>
    ${D.items.map(i => { const v = o.a[i.id]; return `<tr><td><b>${esc(i.id)}</b><div class="m1a-sm">${esc(i.t)}</div></td><td>${esc(i.ref || "")}</td>
      <td class="n"><b class="m1a-v">${v || "—"}</b>${v && D.labs[v - 1] ? `<div class="m1a-sm">${esc(D.labs[v - 1])}</div>` : ""}</td><td><span data-noi18n>${esc(o.ev[i.id] || "—")}</span></td></tr>`; }).join("")}
    </tbody></table></div>`;
}
/** ข้อความผลประเมินของคณะกรรมการ สำหรับ {{ผลประเมิน BOD}} / {{bod_evaluation_result}} — จาก SET + OI-1…6 ของปีบัญชีเดียวกัน
 *  สองมาตราส่วนรายงานแยกกัน ไม่รวมเป็นคะแนนเดียว · ไม่มีคะแนนแบบจำลอง (ผ่านตัวตรวจ t561ScoreHit) · ไม่มีรายบุคคล */
function m1aBodResult(c, fy, lang) {
  const en = (lang || S.lang) === "EN", D = brData(c, fy), out = [];
  const tr = x => en && window.I18N && typeof window.I18N.raw === "function" ? window.I18N.raw(String(x)) : String(x);
  if (D.set) {
    const k = D.set.calc, sc = k.sc, dims = k.dims.filter(d => !isNaN(d.mean));
    out.push(en ? `Board self-assessment (SET form, whole board, scale ${sc.lo}–${sc.hi} as answered): overall mean ${fmt(k.mean, 2)} of ${sc.hi}; by dimension: ${dims.map(d => `${tr(d.name)} ${fmt(d.mean, 2)}`).join(" · ")}.`
      : `ผลแบบประเมินตนเองของคณะกรรมการ (รูปแบบ SET ประเมินทั้งคณะ มาตราส่วน ${sc.lo}–${sc.hi} ตามที่ตอบ): ค่าเฉลี่ยรวม ${fmt(k.mean, 2)} จาก ${sc.hi} · รายด้าน: ${dims.map(d => `${d.name} ${fmt(d.mean, 2)}`).join(" · ")}`);
  }
  if (D.oi) {
    const o = D.oi, hi = o.done.filter(id => o.a[id] >= 4), lo = o.done.filter(id => o.a[id] <= 2);
    out.push(en ? `Open-innovation governance items OI-1…6 (board level, scale 1–5 as answered): ${o.done.map(id => `${id} ${o.a[id]}`).join(" · ")}; items largely or systematically in place: ${hi.join(", ") || "—"}; development priorities for the next year: ${lo.join(", ") || "—"}.`
      : `ประเด็นการกำกับดูแลนวัตกรรมแบบเปิด OI-1…6 (ระดับคณะ มาตราส่วน 1–5 ตามที่ตอบ): ${o.done.map(id => `${id} ${o.a[id]}`).join(" · ")} · ประเด็นที่มีการดำเนินการเป็นส่วนใหญ่หรืออย่างเป็นระบบ: ${hi.join(", ") || "—"} · ประเด็นที่กำหนดเป็นแนวทางพัฒนาในปีถัดไป: ${lo.join(", ") || "—"}`);
  }
  if (!out.length) return "";
  out.push(en ? "The two scales are reported separately as answered and are not combined into one result; results are a board-level overview and no individual director is assessed or scored."
    : "สองมาตราส่วนรายงานแยกกันตามที่ตอบ ไม่รวมเป็นผลเดียว · ผลเป็นภาพรวมระดับคณะ ไม่มีการประเมินหรือให้คะแนนกรรมการรายบุคคล");
  return out.join("\n");
}
window.m1aBodResult = m1aBodResult;
function brGridHtml(c, fy) {
  const T = M1A.T, v = verdictOf(Object.assign({}, c, { fy })), fs = M1A.fy(fy), withhold = M1A.fyCode(fy) === "FAIL";
  const Z = ZONES[v.quad] || {}, unc = tierOf(v.band[0]) !== tierOf(v.band[1]);
  const lensB = typeof USECASES !== "undefined" ? USECASES.find(u => u.id === "board") : null;
  let pts = null; try { pts = lensB && typeof gxContent === "function" ? gxContent(v.quad, c, lensB) : null; } catch (e) { pts = null; }
  const inDom = v.inDomain !== false;
  return `<div class="m1a-chips">${M1A.fyChip(fy)}</div>
    ${!inDom ? `<p>${T("Outside the reference group — Board Profile only: no matrix position, score or tier (R4).", "นอกกลุ่มอ้างอิง — ใช้ Board Profile เท่านั้น: ไม่แสดงตำแหน่งบนเมทริกซ์ คะแนน หรือ tier (R4)")}</p>`
      : withhold ? `<p>${T(`FY${fy} did not meet the validity thresholds (FAIL): the usual reading is withheld and What-if is suspended (R3, G5).`, `ปีบัญชี FY${fy} ไม่ผ่านเกณฑ์ validity (FAIL): งดการอ่านผลตามปกติและงด What-if (R3, G5)`)}</p>`
      : `<table class="m1a-tbl m1a-kv"><tbody>
        <tr><th>${T("Quadrant", "ช่อง (quadrant)")}</th><td><b>${esc(v.quad)} · ${esc(Z.l || "")}</b></td></tr>
        <tr><th>OpenInnoScore</th><td><b>${fmt(c.ois ?? c.ipi, 1)}</b> · ${T("90% band", "ช่วง 90%")} ${fmt(v.band[0], 1)}–${fmt(v.band[1], 1)} · Tier ${v.tier}${unc ? ` <span class="pill warn">${T("tier uncertain (R8)", "tier ไม่แน่นอน (R8)")}</span>` : ""}</td></tr>
        <tr><th>${T("Formula", "สูตร")}</th><td>B_EG · ${esc(M1A.ver())}</td></tr></tbody></table>
        ${pts && pts.qs && pts.qs.length ? `<h5 class="m1a-h5">${T("Points for the board", "ประเด็นสำหรับบอร์ด")}</h5><ol class="m1a-ol">${pts.qs.map(q => `<li>${q}</li>`).join("")}</ol>` : ""}`}
    <p class="m1a-sm">${T("Associational reading of reference data, not cause and effect · board level only.", "อ่านเชิงความสัมพันธ์จากข้อมูลอ้างอิง ไม่ใช่เหตุ-ผล · ระดับคณะเท่านั้น")}</p>`;
}
function brWhatIfHtml(c, fy) {
  const T = M1A.T, promo = +c.promo, g3 = isFinite(promo) && promo >= M1A.JN, fyOk = M1A.fy(fy).whatIfAllowed !== false && M1A.fyCode(fy) !== "FAIL";
  if (!(g3 && fyOk)) return null;      // (4) แสดงเฉพาะเมื่อผ่าน G3 (และปีไม่ FAIL)
  return `<p>${T("G3 passes (CEO promotion focus at or above the Johnson–Neyman bound 0.686): the What-if Studio may be used for board-composition planning with the actual board size. In the reference data, a higher share of women directors at this level of CEO drive is associated with more expected open-innovation activity, other factors held constant — a relational statement, not a forecast.",
    "ผ่าน G3 (CEO promotion focus ไม่ต่ำกว่าขอบ Johnson–Neyman 0.686): ใช้ What-if Studio วางแผนองค์ประกอบคณะกรรมการได้ โดยใช้จำนวนกรรมการจริง · ในข้อมูลอ้างอิง สัดส่วนกรรมการหญิงที่สูงขึ้นที่ระดับภาษาเชิงรุกของ CEO นี้สัมพันธ์กับกิจกรรม open innovation ที่คาดหมายสูงขึ้น เมื่อปัจจัยอื่นคงที่ — เป็นข้อความเชิงความสัมพันธ์ ไม่ใช่การพยากรณ์")}
    <button class="lnk rp-noprint" data-goto="studio">${T("Open What-if Studio →", "เปิด What-if Studio →")}</button></p>`;
}
function viewBoardReport() {
  const T = M1A.T, c = cur();
  const head = pageHead(T("UC3 · Board OI evaluation", "UC3 · ประเมิน OI ของคณะกรรมการ"), T("Board OI Governance report", "รายงานการกำกับดูแล OI ของคณะกรรมการ"),
    T("One printable report for one fiscal year: SET self-assessment, OI-1…6, Grid position and points for the board, What-if note (only when G3 passes) and the 56-1 draft text for review — each scale as answered, never combined into one score.",
      "รายงานฉบับเดียวสำหรับพิมพ์ของปีบัญชีหนึ่ง: แบบประเมินตนเอง SET · OI-1…6 · ตำแหน่งบน Grid และประเด็นสำหรับบอร์ด · หมายเหตุ What-if (เฉพาะเมื่อผ่าน G3) · ร่างข้อความ 56-1 สำหรับตรวจ — แต่ละมาตราส่วนแสดงตามที่ตอบ ไม่รวมเป็นคะแนนเดียว"));
  if (typeof canSeeCo === "function" && !canSeeCo(c.t)) return typeof trCoGate === "function" ? trCoGate() : head;
  const fy = brFy(c), ys = brYears(c), D = brData(c, fy), cf = Object.assign({}, c, { fy });
  let b = null; try { b = typeof t561Build === "function" ? t561Build(cf) : null; } catch (e) { b = null; }
  let st = null; try { st = b && typeof t561State === "function" ? t561State(c, b) : null; } catch (e) { st = null; }
  const stLab = !st ? "" : st.k === "approved" ? `<span class="pill ok">${T("Approved", "อนุมัติแล้ว")}</span>` : st.k === "pending" ? `<span class="pill warn">${T("Waiting for approval", "รออนุมัติ")}</span>`
    : st.k === "changed" ? `<span class="pill warn">${T("Changed after submission — resubmit", "แก้ไขหลังส่ง — ต้องส่งใหม่")}</span>` : st.k === "returned" ? `<span class="pill crit">${T("Returned for revision", "ส่งกลับแก้")}</span>` : `<span class="pill mute">${T("Draft — needs human review", "ร่าง — ต้องให้คนตรวจ")}</span>`;
  const wi = brWhatIfHtml(c, fy);
  const sec = (n, h, body) => `<section class="m1a-sec" data-brsec="${n}"><h4>${n} · ${h}</h4>${body}</section>`;
  return head + `<div class="gx-row rp-noprint m1a-tools"><label class="m1a-lab">${T("Fiscal year", "ปีบัญชี")} <select class="sel" id="brFy">${ys.map(y => `<option value="${y}"${y === fy ? " selected" : ""}>FY${y} (${T("B.E.", "พ.ศ.")} ${y + 543})</option>`).join("")}</select></label>
      <button class="btn p" id="brPrint">${T("Print / save PDF", "พิมพ์ / บันทึก PDF")}</button>
      <button class="btn s" data-goto="t561">${T("Review & approval (56-1 draft) →", "ตรวจและอนุมัติ (ร่าง 56-1) →")}</button></div>
    <article class="card m1a-br" id="m1aBR">
      <header class="m1a-brh"><div><div class="m1a-k">OpenInnoScore™ · ${T("Board OI Governance report", "รายงานการกำกับดูแล OI ของคณะกรรมการ")}</div>
        <h3>${esc(c.n || c.t)} (${esc(c.t)}) · FY${fy}</h3>
        <div class="m1a-sm">${esc(M1A.lab("uc3"))} · ${T("board level", "ระดับคณะ")} · ${esc(M1A.ver())} · ${esc(new Date().toISOString().slice(0, 10))}</div></div>
        <div class="m1a-chips">${M1A.fyChip(fy)} ${stLab}</div></header>
      <div class="m1a-note" id="brNoMerge">${T("The SET self-assessment (0–4) and OI-1…6 (1–5) are shown side by side, each as answered. They are not combined into one score (a merged score is planned for MVP 2, #11). No individual-director scores appear in this report.",
        "แบบประเมินตนเอง SET (0–4) และ OI-1…6 (1–5) แสดงคู่กัน แต่ละแบบตามที่ตอบ ไม่รวมเป็นคะแนนเดียว (คะแนนรวมอยู่ใน MVP 2, #11) · รายงานนี้ไม่มีคะแนนกรรมการรายบุคคล")}</div>
      <div class="grid g2 m1a-side">
        ${sec(1, T("SET self-assessment (0–4, as answered)", "แบบประเมินตนเอง SET (0–4 ตามที่ตอบ)"), brSetHtml(D, fy))}
        ${sec(2, T("OI-1…6 (1–5, as answered, with evidence)", "OI-1…6 (1–5 ตามที่ตอบ พร้อมหลักฐาน)"), brOiHtml(D, fy))}
      </div>
      ${sec(3, T("Grid position and points for the board", "ตำแหน่งบน Grid และประเด็นสำหรับบอร์ด"), brGridHtml(c, fy))}
      ${wi ? sec(4, T("What-if note (G3 passes)", "หมายเหตุ What-if (ผ่าน G3)"), wi) : ""}
      ${sec(5, T("Form 56-1 draft text — for human review", "ร่างข้อความแบบ 56-1 — สำหรับให้คนตรวจ"),
        b ? `<p class="m1a-sm">${T("Filled from the saved SET and OI-1…6 results of this fiscal year ({{bod_evaluation_result}}). Must pass the review & approval step before use.", "เติมจากผล SET และ OI-1…6 ที่บันทึกของปีบัญชีนี้ ({{ผลประเมิน BOD}}) · ต้องผ่านขั้นตรวจและอนุมัติก่อนใช้")}</p>
          ${b.issues.length ? `<div class="note warn">${b.issues.map(esc).join("<br>")}</div>` : ""}
          <pre class="m1a-561" id="br561">${esc(b.text)}</pre>` : `<p>${T("56-1 draft is not available in this build.", "ร่าง 56-1 ไม่พร้อมในไฟล์ฉบับนี้")}</p>`)}
      <footer class="m1a-foot">${T("Board-level report · each scale as answered · associational, not causal · no individual-director scores (PDPA s.26) · ", "รายงานระดับคณะ · แต่ละมาตราส่วนตามที่ตอบ · เชิงความสัมพันธ์ ไม่ใช่เหตุ-ผล · ไม่มีคะแนนกรรมการรายบุคคล (PDPA ม.26) · ")}${esc(M1A.ver())} · ${esc(M1A.fyText(fy))}</footer>
    </article>`;
}
function wireBoardReport(h) {
  const s = h.querySelector("#brFy"); if (s) s.onchange = () => { BR.fy = +s.value; render(); };
  const p = h.querySelector("#brPrint"); if (p) p.onclick = () => { h.querySelectorAll("#m1aBR details").forEach(d => { d.open = true; }); rpPrint("m1a-print-br"); };
}
VIEWS.boardreport = viewBoardReport;
if (typeof WIRES2 === "object" && WIRES2) WIRES2.boardreport = wireBoardReport;
(function () {
  if (NAV.some(n => n.id === "boardreport")) return;
  const i = NAV.findIndex(n => n.id === "t561"), j = NAV.findIndex(n => n.id === "followup");
  const item = { id: "boardreport", g: 2, ico: "▥", lab: "รายงานการกำกับดูแล OI ของคณะกรรมการ" };
  const k = i >= 0 ? i : j; if (k >= 0) NAV.splice(k + 1, 0, item); else NAV.push(item);
  buildNav();
})();
M1A.en({ "รายงานการกำกับดูแล OI ของคณะกรรมการ": "Board OI Governance report" });
