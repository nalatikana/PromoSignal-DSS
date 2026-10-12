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

/* ---------------------------------------------------------------- ตัวช่วยร่วม */
const RP_ST = { todo: "ยังไม่เริ่ม", doing: "กำลังทำ", done: "เสร็จ", late: "เลื่อน" };
const RP_SRC = { grid: "Grid", matrix: "Grid", compass: "Compass", peer: "Peer", whatif: "What-if", bod: "BOD",
  res: "มติ", report: "Insight" };
const RP_UC = { board: "BOD Evaluation", credit: "ลูกค้าสินเชื่อ", search: "Nomination", investor: "Engagement", bankbod: "บอร์ดธนาคาร", invest: "นักลงทุน", cg: "CG / เลขานุการบริษัท",
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
function peerQs(c, p, d) {
  const q = [];
  if (d.cross) q.push(`ความต่างระหว่าง ${c.t} กับ ${p.t} อาจมาจากบริบทอุตสาหกรรม (${IND[c.ind] || "—"} เทียบ ${IND[p.ind] || "—"}) มากกว่าการกำกับดูแล — ลักษณะธุรกิจ วงจรการลงทุน และแนวปฏิบัติการเขียนรายงานของสองอุตสาหกรรมต่างกันอย่างไร?`);
  if (Math.abs(d.dDp) < 10 && Math.abs(d.dAp) < 10) {
    q.push(`ความต่างของทั้งสองแกนน้อย (ไม่เกิน 10 เปอร์เซ็นไทล์)${d.overlap ? " และช่วง 90% ของคะแนนซ้อนทับกัน" : ""} — ควรถือว่าสองบริษัทอยู่ในรูปแบบใกล้เคียงกันหรือไม่ ก่อนกำหนดแนวทางพัฒนาจากความต่างนี้?`);
  }
  const qCeo = `ความต่างของภาษา CEO (${p.t} ${d.dDp > 0 ? "สูงกว่า" : "ต่ำกว่า"} ${Math.abs(d.dDp)} เปอร์เซ็นไทล์) สะท้อนกลยุทธ์ที่ต่างกันจริง หรือเป็นเพียงรูปแบบการเขียนรายงาน?`;
  const qCeo2 = `สารถึงผู้ถือหุ้นของสองบริษัทจัดทำโดยใครและผ่านการเรียบเรียงต่างกันอย่างไร — ทิศทางที่เขียนไว้มีแผนงานหรือโครงการรองรับจริงหรือไม่?`;
  const qBrd = `องค์ประกอบบอร์ดที่ต่างกัน (สัญญาณโครงสร้างบอร์ดของ ${p.t} ${d.dAp > 0 ? "สูงกว่า" : "ต่ำกว่า"} ${Math.abs(d.dAp)} เปอร์เซ็นไทล์) เกิดจากโครงสร้างผู้ถือหุ้น ช่วงธุรกิจ หรือกระบวนการสรรหา?`;
  const qFem = Math.abs(d.dFem) >= 5 ? `สัดส่วนกรรมการหญิงที่ต่างกัน (${pct1(c.fem)} เทียบ ${pct1(p.fem)}) มาจากแผนสรรหาและวาระกรรมการที่ต่างกันหรือไม่ และจำนวนคนถึงระดับ critical mass (≥ ${CRIT_N} คน) หรือยัง?` : "";
  // แกนที่ต่างมากที่สุดก่อน · ถ้าแกนรองต่าง ≥ 10 เปอร์เซ็นไทล์ ถามด้วย · คำถามต่อเนื่องของแกนหลักไว้ท้าย
  if (d.dom === "ceo") { q.push(qCeo); if (Math.abs(d.dAp) >= 10) q.push(qFem || qBrd); q.push(qCeo2); }
  else { q.push(qBrd); if (Math.abs(d.dDp) >= 10) q.push(qCeo); if (qFem) q.push(qFem); }
  if (d.qc === d.qp && d.tc !== d.tp) q.push(`ทั้งสองบริษัทอยู่ช่อง ${ZONES[d.qc].l} เดียวกันแต่ต่าง tier (${d.tc} เทียบ ${d.tp}) — ความต่างมาจากความเข้มของสัญญาณด้านใด${d.overlap ? " และเมื่อช่วง 90% ซ้อนทับกัน ควรสรุปว่าต่างกันจริงหรือไม่" : ""}?`);
  else if (d.qc !== d.qp) q.push(`สองบริษัทอยู่คนละช่อง (${ZONES[d.qc].l} เทียบ ${ZONES[d.qp].l}) — รูปแบบของแต่ละบริษัทเหมาะกับช่วงธุรกิจของตนหรือไม่ แทนการตั้งเป้าย้ายช่องตาม peer?`);
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
    const qHtml = qs.map(q => { const i = RP_Q.push({ t: q, p: p.t }) - 1;
      return `<li><span>${esc(q)}</span><button class="btn g rp-add" data-rpq="${i}">+ เพิ่มเข้าแผนพัฒนาบอร์ด</button></li>`; }).join("");
    return `<div class="rp-peer">
      <div class="rp-peer-h"><b>${esc(c.t)} เทียบ ${esc(p.t)}</b><span>${esc(p.n || "")}</span>
        ${d.cross ? `<span class="pill warn">ข้ามอุตสาหกรรม</span>` : ""}
        <span class="pill mute">ความต่างหลัก: ${d.dom === "ceo" ? "ภาษา CEO" : "องค์ประกอบบอร์ด"}</span></div>
      <div class="tw"><table class="rp-tbl rp-tbl-s"><thead><tr><th>แกนของโมเดล</th><th class="n">${esc(c.t)}</th><th class="n">${esc(p.t)}</th><th class="n">ความต่าง</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="n">${esc(r[1])}</td><td class="n">${esc(r[2])}</td>
          <td class="n">${typeof r[3] === "number" ? (r[3] > 0 ? "+" : "") + r[3] : esc(r[3])}</td></tr>`).join("")}</tbody></table></div>
      <div class="rp-k">คำถามว่าความแตกต่างเกิดจากอะไร</div>
      <ol class="rp-qs">${qHtml}</ol>
      <div class="rp-k">บริบทที่ควรตรวจก่อนสรุป <span class="pill mute">บริบท</span></div>
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
  `จำนวนกรรมการหญิงเป็นคน ≥ ${typeof CRIT_N !== "undefined" ? CRIT_N : 3} คนตามหลักฐาน critical mass — ไม่ใช่สัดส่วนอย่างเดียว`];
const RP_EV_CEO = ["ยุทธศาสตร์ที่เขียนไว้จริงและแผนงานที่รองรับ", "ตัวอย่างโครงการร่วมพัฒนากับภายนอกที่เกิดขึ้นจริง",
  "ผลรัน LIWC-22 ของสารถึงผู้ถือหุ้นฉบับจริง (ไม่ใช่ร่างทดสอบ)"];
const RP_WI_INFO = {
  opt: { ev: RP_EV_FEM, as: ["สัดส่วนกรรมการหญิงขึ้นไปที่ p90 ของอุตสาหกรรม", "ภาษา CEO คงเปอร์เซ็นไทล์เดิม"] },
  con: { ev: ["แผนรองรับเมื่อกรรมการหญิงครบวาระ", "รายชื่อตำแหน่งที่จะว่างและเกณฑ์สรรหาทดแทน"], as: ["สัดส่วนกรรมการหญิงลดลงไปที่ p10 ของอุตสาหกรรม (กรณีไม่ได้แทนที่)", "ภาษา CEO คงเปอร์เซ็นไทล์เดิม"] },
  sq: { ev: ["บันทึกเหตุผลของบอร์ดที่เลือกคงโครงสร้าง", "ผลติดตามปีถัดไปเพื่อตรวจว่าตำแหน่งยังคงที่"], as: ["ไม่ปรับคันโยกใด"] },
  reg: { ev: [...RP_EV_FEM, "แนวทางของ ตลท. ที่อ้างอิงและปีที่มีผล"], as: ["สัดส่วนกรรมการหญิงอย่างน้อย 30% ตามแนวทางกำกับ", "ภาษา CEO คงเปอร์เซ็นไทล์เดิม"] },
  new: { ev: [...RP_EV_CEO, ...RP_EV_FEM], as: ["CEO Promotion Focus อยู่ที่เปอร์เซ็นไทล์ 75", "สัดส่วนกรรมการหญิงขึ้นไปที่ p90 ของอุตสาหกรรม"] },
};
const RP_AS_COMMON = ["กรรมการครอบครัว political ties และอายุงานตรึงไว้ที่ค่าจริง (ข้อมูลบริบท ไม่ใช่คันโยก)",
  "ฐานอ้างอิง REF-928 และสูตรไม่เปลี่ยน", "บริษัทอื่นในฐานอ้างอิงไม่เปลี่ยนตำแหน่ง"];
const RP_CAVEAT = "ผลตามสูตรเชิงความสัมพันธ์ ไม่ใช่การรับประกันว่าปรับแล้วจะเกิดผล";
function rpScen(c, fem, dp) {
  const promo = dp === c.dp ? c.promo : promoAtPct(dp);
  const amp = ampOf(c.fam, c.pol, fem, c.ten), B = signalB(promo, amp), ois = oisOf(B);
  let band = null;
  if (dp === c.dp && Math.abs(fem - c.fem) < 1e-9 && c.band) band = c.band;          // ไม่ขยับคันโยก → ใช้ช่วงเดียวกับทุกหน้า
  else try { band = band90(promo, c.fam, c.pol, fem); } catch (e) { }
  return { fem, dp, ois, ipi: Math.round(ois), tier: tierOf(ois), quad: quadOf(cpOf(promo), amp), band };
}
let RP_WI = [];
function whatIfReport(c, w) {
  if (typeof WI_PRESETS === "undefined") return "";
  const base = { l: "ปัจจุบัน (ค่าจริง)", fem: c.fem, dp: c.dp, ois: c.ois ?? c.ipi, ipi: c.ipi, tier: rpTier(c), quad: rpQuad(c), band: c.band };
  const sim = rpScen(c, w.fem, w.dp);
  const simEv = [...(Math.abs(w.fem - c.fem) > 1e-9 ? RP_EV_FEM : []), ...(w.dp !== c.dp ? RP_EV_CEO : [])];
  const simAs = [Math.abs(w.fem - c.fem) > 1e-9 ? `สัดส่วนกรรมการหญิง ${pct1(w.fem)} (ค่าจริง ${pct1(c.fem)})` : "สัดส่วนกรรมการหญิงคงค่าจริง",
    w.dp !== c.dp ? `CEO Promotion Focus เปอร์เซ็นไทล์ ${w.dp} (ค่าจริง ${c.dp}) · ที่มา: ${w.src || "ผู้ใช้ปรับ"}` : "ภาษา CEO คงค่าจริง"];
  RP_WI = [{ k: "sim", l: "สถานะจำลองปัจจุบัน", d: "ค่าที่ตั้งไว้บนหน้านี้", ev: simEv.length ? simEv : ["ไม่มีการปรับคันโยก — ไม่มีหลักฐานเพิ่มเติมที่ต้องใช้"], as: simAs, s: sim }];
  WI_PRESETS.filter(p => p.k !== "cur").forEach(p => {
    const v = p.f(c), info = RP_WI_INFO[p.k] || { ev: [], as: [p.d || ""] };
    RP_WI.push({ k: p.k, l: p.th, d: p.d || "", ev: info.ev, as: info.as, s: rpScen(c, v.fem, v.dp) });
  });
  const bandTxt = b => b ? `${fmt(b[0], 1)}–${fmt(b[1], 1)}` : "—";
  const dTxt = v => { const d = v.ipi - base.ipi; return d > 0 ? `<span class="pill ok">+${d}</span>` : d < 0 ? `<span class="pill crit">${d}</span>` : `<span class="pill mute">±0</span>`; };
  const row = (l, v, extra) => `<tr${extra ? ` class="${extra}"` : ""}><td>${esc(l)}</td><td class="n">${pct1(v.fem)}</td><td class="n">${fmt(v.dp)}</td>
    <td class="n"><b>${fmt(v.ois, 1)}</b></td><td class="n">${v === base ? "—" : dTxt(v)}</td><td class="n">${v.tier}</td>
    <td>${esc(ZONES[v.quad].l)}${v.quad !== base.quad ? ` <span class="pill warn">ย้ายช่อง</span>` : ""}</td><td class="n">${bandTxt(v.band)}</td></tr>`;
  const alts = RP_WI.map((a, i) => `<div class="rp-alt">
      <div class="rp-alt-h"><b>${esc(a.l)}</b>${a.d ? `<span>${esc(a.d)}</span>` : ""}
        <span class="rp-alt-v">OIS ${fmt(a.s.ois, 1)} · Tier ${a.s.tier} · ${esc(ZONES[a.s.quad].l)} ${dTxt(a.s)}</span></div>
      <div class="grid g2 tight rp-alt-g">
        <div><div class="rp-k">สมมติฐานที่ใช้</div><ul class="rp-ctx">${a.as.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><div class="rp-k">หลักฐานที่ต้องมีก่อนดำเนินการ</div><ul class="rp-ctx">${a.ev.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
      <button class="btn g rp-add rp-noprint" data-rpwi="${i}">+ เพิ่มทางเลือกนี้เข้าแผนพัฒนาบอร์ด</button>
    </div>`).join("");
  return `<div class="card rp-block rp-wi" style="margin-top:14px">
    <div class="rp-print-head">OpenInnoScore · What-if Report · ${esc(c.n)} (${esc(c.t)}) · ${esc(rpNow())}</div>
    <h3>รายงาน What-if · ผลภายใต้สมมติฐาน ทางเลือก และหลักฐานที่ต้องมีก่อนดำเนินการ <span class="pill mute">รายงานฉบับที่ 3</span></h3>
    <p class="desc">ใช้หารือทางเลือกกับที่ปรึกษา · คันโยกที่พิจารณามีสองตัว: สัดส่วนกรรมการหญิงและภาษา CEO · ช่วง 90% คำนวณด้วยชุดสุ่มเดียวกับทุกหน้า</p>
    <div class="note warn" style="margin-bottom:12px"><b>${esc(RP_CAVEAT)}</b> — ตัวเลขเป็นตำแหน่งบนฐานอ้างอิงตามสูตร ไม่ใช่ความน่าจะเป็นหรือจำนวนกิจกรรมที่คาดว่าจะเกิด</div>
    <div class="tw"><table class="rp-tbl"><thead><tr><th>ฉากทัศน์</th><th class="n">กรรมการหญิง</th><th class="n">CEO PF (pct)</th>
      <th class="n">OIS</th><th class="n">เทียบปัจจุบัน</th><th class="n">Tier</th><th>quadrant</th><th class="n">ช่วง 90%</th></tr></thead>
      <tbody>${row(base.l, base, "rp-base")}${RP_WI.map(a => row(a.l, a.s, a.k === "sim" ? "rp-sim" : "")).join("")}</tbody></table></div>
    <div class="rp-k" style="margin-top:14px">ทางเลือก สมมติฐาน และหลักฐานที่ต้องมี</div>
    ${alts}
    <div class="rp-k">สมมติฐานร่วมของทุกฉากทัศน์</div>
    <ul class="rp-ctx">${RP_AS_COMMON.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <div class="rp-tools rp-noprint"><button class="btn s" id="rpWiPrint">พิมพ์รายงาน What-if</button>
      <span class="rp-hint">พิมพ์เฉพาะบล็อกนี้ · บันทึกเป็น PDF ได้จากหน้าต่างพิมพ์</span></div>
    <p class="rp-foot">${esc(RP_CAVEAT)} · ไม่แสดงค่าสัมประสิทธิ์ของสูตร · กรรมการครอบครัว political ties และอายุงานไม่อยู่ในข้อเสนอ</p>
  </div>`;
}
const _rpViewStudio = VIEWS.studio;
VIEWS.studio = function () {
  const h = _rpViewStudio();
  if (!isUnlocked("studio")) return rpInsertChain(h, 3);
  const c = cur(), w = typeof wiInit2 === "function" ? wiInit2() : S.wi;
  if (!w) return rpInsertChain(h, 3);
  return rpInsertChain(h, 3) + whatIfReport(c, w);
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
      out.push({ key: `c|${t}|${i}`, co: t, kind: "cmp", issue: o["a" + i] ? `E0${i + 1} · ${o["a" + i]}` : `ตรวจหลักฐาน E0${i + 1}`, src: "Compass", uc: o.uc || "board",
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
    const map = { concl: "concl", dec: "decision", own: "owner", due: "due", st: "status" };
    p[map[f]] = v;
    if (typeof scSet === "function" && a === S.t) scSet("plan", o.plan); else save();
  } else if (kind === "c") {
    const o = rpSc(a), map = { concl: "c" + b, dec: "cdec" + b, own: "o" + b, due: "cdue" + b, st: "cst" + b };
    o[map[f]] = v; save();
  } else if (kind === "d") {
    const P = rpPilot(), r = (P.o.dir.rows || []).find(x => x.id === a); if (!r) return;
    const map = { concl: "concl", dec: "dec", own: "own", due: "due", st: "st" };
    r[map[f]] = v; rpPilotSave(P);
  }
}
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
  const TK = new Set(COMPS.map(c => String(c.t).toUpperCase()).filter(t => !["CEO", "OIS", "OI", "SET", "BOD", "CG", "AI"].includes(t)));
  const anon = t => String(t).replace(/[A-Za-z][A-Za-z0-9&.\-]*/g, w => TK.has(w.toUpperCase()) ? "บริษัทในกลุ่มเปรียบเทียบ" : w);
  const items = ok.map(r => `${anon(r.issue.replace(/^\[[^\]]+\]\s*/, ""))} — การดำเนินการตามมติ: ${anon(r.dec)}`);
  RP_561 = [lead + (cos.length > 1 ? ` (รวม ${cos.length} บริษัทในแฟ้มนี้ — ใช้เฉพาะรายการของบริษัทที่จัดทำแบบ 56-1)` : ""), ...items.map((x, i) => `${i + 1}. ${x}`)].join("\n");
  return `<p class="rp-561-lead">${esc(lead)}</p><ol class="rp-561">${items.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <button class="btn g rp-noprint" id="fu561Copy">คัดลอกข้อความ</button>`;
}
let RP_561 = "";
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
      <td class="rp-issue">${esc(r.issue)}${r.added ? `<div class="rp-hint">เพิ่มเมื่อ ${esc(r.added)}</div>` : ""}${r.late ? `<div><span class="pill crit">เกินกำหนด</span></div>` : ""}</td>
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
    <div class="note warn rp-rule"><b>มติและข้อสรุปต้องมาจากการประชุมจริงและผู้ใช้ยืนยัน — ระบบไม่เติมให้</b> ·
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
    rpDl(`ois_followup_${new Date().getFullYear() + 543}.csv`, rpCsv([["บริษัท", "ประเด็น", "ที่มา", "มุมมอง use case", "ข้อสรุปจากการหารือ", "มติ", "ผู้รับผิดชอบ (ตำแหน่ง)", "กำหนดติดตาม", "สถานะ", "เกินกำหนด"],
      ...rows.map(r => [r.co, r.issue, r.src, rpUcLabel(r.uc), r.concl, r.dec, r.own, r.due, RP_ST[r.st] || r.st, r.late ? "ใช่" : ""])]));
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
    rpPlanAdd(`[Peer ${q.p}] ${q.t}`, "peer"); b.textContent = "✓ อยู่ในแผนแล้ว"; b.disabled = true;
  });
  h.querySelectorAll("[data-rpwi]").forEach(b => b.onclick = () => {
    const a = RP_WI[+b.dataset.rpwi]; if (!a) return;
    rpPlanAdd(`[What-if] พิจารณาทางเลือก “${a.l}” (OIS ตามสูตร ${fmt(a.s.ois, 1)} · ${ZONES[a.s.quad].l}) — หลักฐานที่ต้องมี: ${a.ev.join("; ")}`, "whatif");
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
