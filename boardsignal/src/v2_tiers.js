/* ============================================================================
   v2_tiers.js — แก้ไขครั้งที่ 2.2
     1 สิทธิ์ 3 ระดับตามรายงานหัวข้อ 4: Level 1 Basic (ค่าภายใน free) · Level 2 Pro (Pay-Per-Use) · Level 3 Pro Max (Subscription, add-on จาก Pro)
     2 อัตราเครดิตและแพ็กเกจตามรายงานหัวข้อ 5 (การชำระเงินยังเป็นการจำลอง · เติมเครดิตด้วยมือ)
     3 ร่าง 56-1 · Template ที่ลูกค้าแก้เองได้ + ขั้นอนุมัติก่อนส่งออก (หัวข้อ 6 · 56-1 ส่วนที่ 2 ข้อ 7 และ 8)
     4 คู่มือการใช้งานในหน้าระบบ (ชิ้นงานส่งมอบข้อ 4) + ลิงก์ "?" บนหัวทุกหน้า
   ไฟล์นี้โหลดเป็นลำดับสุดท้าย — ห่อ (wrap) ฟังก์ชันของไฟล์ก่อนหน้า ไม่แก้ไฟล์ต้นทาง
   กติกา: ถ้อยคำเชิงความสัมพันธ์ · ไม่แสดงค่าสัมประสิทธิ์ · ร่าง 56-1 ไม่มีชื่อบริษัทอื่นและไม่ใช้คะแนนเป็นหลักฐานประสิทธิผลของบอร์ด
   ============================================================================ */

/* ---------------------------------------------------------------- 1 · ราคาและแพ็กเกจ (หัวข้อ 5) */
Object.assign(PRICE, { report: 1, peer: 1, studio: 1, ceotext: 1, sector: 5 });
Object.assign(PLAN_TOKENS, { free: 3, pro: 20, max: 40 });
PACKS.splice(0, PACKS.length,
  { n: 5, baht: 490, tag: "" },
  { n: 15, baht: 1290, tag: "คุ้มที่สุด" },
  { n: 40, baht: 2990, tag: "สำหรับทีมงาน" });
const SECTOR_BAHT = 990;
/* แก้ไขครั้งที่ 2.4 (ประชุม 15 ต.ค.) — ชื่อที่แสดง Level 1 = "Basic" (ค่าภายในยังเป็น "free")
   Basic: บริษัทตนเองบริษัทเดียว (รายงาน การวิเคราะห์ ทางเลือกสำหรับการพิจารณา)
   Pro: เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน · Pro Max: เทียบทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง */
const TR_PLANS = [
  { k: "free", lv: "Level 1", n: "Basic", sub: "ผู้ใช้งานทั่วไป · บริษัทของตนเองบริษัทเดียว", tok: PLAN_TOKENS.free,
    d: "รายงาน การวิเคราะห์ และทางเลือกสำหรับการพิจารณาของบริษัทตนเอง (Zone A–C · Compass · เมทริกซ์ 2×2) · หลักฐานความแม่นยำ · แบบประเมินตนเองของบอร์ด · RFQ" },
  { k: "pro", lv: "Level 2", n: "Pro", sub: "Pay-Per-Use · คิดตามการใช้งานจริง ไม่มีค่ารายเดือน", tok: PLAN_TOKENS.pro,
    d: "เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน · What-if 2 ตัวแปร (กรรมการหญิง + อายุงาน) · ปลดล็อกบริษัทอื่นรายบริษัท · Evidence Pack · ร่าง 56-1" },
  { k: "max", lv: "Level 3", n: "Pro Max", sub: "Subscription · add-on จาก Pro (เหมาจ่ายองค์กร)", tok: PLAN_TOKENS.max,
    d: "ทุกบริษัท · เทียบทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง · เทียบข้ามอุตสาหกรรม · ฉากทัศน์ขาลง · ข้อสั่งการ/Compliance · Email Approval" },
];
/** ตารางสิทธิ์ — แหล่งเดียวของหน้า billing คู่มือ และการบังคับสิทธิ์ในหน้า (ให้ตรงกัน · ภาคผนวก ง ข้อ 6–7) */
const PERM = [
  ["ดูข้อมูลบริษัท", "เฉพาะบริษัทตนเอง (บริษัทเดียว)", "+ ปลดล็อกบริษัทอื่นรายบริษัท · 1 เครดิต", "ทุกบริษัทในฐานข้อมูล"],
  ["รายงาน ข้อค้นพบ และทางเลือกสำหรับการพิจารณา (Zone A–C · Compass)", "บริษัทตนเอง ครบทุกส่วน", "+ บริษัทที่ปลดล็อก", "ทุกบริษัท"],
  ["เมทริกซ์กลยุทธ์ 2×2", "ตำแหน่งบริษัทตนเอง", "+ เทียบ 3 บริษัทในอุตสาหกรรมเดียวกัน · จุดอ้างอิง (ชั้นเสริม)", "+ เทียบทั้งอุตสาหกรรม · บริษัทคะแนนใกล้เคียง"],
  ["เทียบคู่แข่ง (Peer Benchmark)", "✕", "ตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน · 1 เครดิต", "+ ข้ามอุตสาหกรรม / ข้ามประเภทธุรกิจ"],
  ["ภาพรวมทั้งอุตสาหกรรม · บริษัทคะแนนใกล้เคียง", "✕", "✕", "ทั้งอุตสาหกรรม + CSV · บริษัทที่อันดับติดกัน (±2 ในอุตสาหกรรม · ±2 ทั้งตลาด)"],
  ["What-if Studio", "ทดลอง 1 ตัวแปร (จำนวนกรรมการหญิง)", "2 ตัวแปร: จำนวนกรรมการหญิง + อายุงาน (ความไว B_FULL) · 1 เครดิต", "+ ฉากทัศน์ขาลง (กรรมการหญิงลาออก · อายุงานเปลี่ยน)"],
  ["นำเข้าเอกสาร", "สาร CEO .txt ≥ 2,000 คำ · 56-1 One Report .pdf/.txt", "เหมือน Basic", "เหมือน Basic (ยกเลิกการดึงอัตโนมัติจาก SET)"],
  ["Evidence Pack", "✕", "บริษัทที่ดูได้ · พิมพ์ / .md / JSON", "ทุกบริษัท"],
  ["ร่าง 56-1 · Structured Data", "✕", "ร่าง + Template + ส่งออก", "+ ขั้นอนุมัติ (Email Approval)"],
  ["ข้อสั่งการบอร์ด / Compliance", "✕", "✕", "✓"],
  ["สรุปผล RFQ ทุกชุดในเครื่อง (สำหรับผู้ดูแล)", "✕", "✕", "✓ (หรือผู้ดูแลระบบบนเซิร์ฟเวอร์)"],
  /* แก้ไขรอบสุดท้าย — 2 แถวที่บังคับจริงแต่เดิมไม่อยู่ในตาราง (TR_PAID "port" · aiCharge/aiDebit ใน v2_ai.js) */
  ["พอร์ตลงทุน · โหมดที่ประชุม (IC)", "โหมดที่ประชุมเฉพาะบริษัทตนเอง · พอร์ต ✕", "พอร์ต: ปลดครั้งเดียว 3 เครดิต · เฉพาะบริษัทที่ดูได้ (ตนเอง + ที่ปลดล็อก)", "ทุกบริษัท · รวมใน Subscription (ไม่ตัดเครดิต)"],
  ["AI Report Studio", "✕", "1 เครดิต ต่อ 1 รายงาน (บางเทมเพลตเป็นสิทธิ์ Pro Max)", "รวมใน Subscription (ไม่ตัดเครดิต)"],
];
const TARIFF = [
  ["รายงานบริษัทตนเอง / เมทริกซ์ 2×2 / หน้าหลักฐานความแม่นยำ", "ฟรี", "เปิดถาวร"],
  ["รายงานบริษัทที่ 2 ขึ้นไป (Pro)", "1", "ต่อ 1 บริษัท · ปลดล็อกครั้งเดียวดูได้ตลอด"],
  ["เทียบคู่แข่ง 3 ราย (Pro)", "1", "เปลี่ยนคู่แข่งได้ไม่จำกัดหลังปลดล็อก"],
  ["What-if Studio (Pro)", "1", "รวมการวัดภาษา CEO จากไฟล์ .txt"],
  ["ภาพรวมทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง", "—", "รวมใน Subscription ของ Pro Max"],
  ["พอร์ตลงทุน (Pro)", "3", "ปลดครั้งเดียวต่อบัญชี · เฉพาะบริษัทที่ดูได้ · Basic ✕ · Pro Max ไม่ตัดเครดิต"],
  ["AI Report Studio (Pro)", "1", "ต่อ 1 รายงาน · Basic ✕ · Pro Max ไม่ตัดเครดิต"],
];
/** ชื่อรายการในประวัติการใช้เครดิต — ไม่แสดงคีย์ภายในดิบ (เช่น "aireport") */
const TR_LOG_LAB = { report: "รายงานวินิจฉัย / ข้อมูลบริษัท", peer: "เทียบคู่แข่ง", studio: "What-if Studio + ตรวจภาษา CEO", sector: "ภาพรวมอุตสาหกรรม + CSV",
  ceotext: "ตรวจข้อความ CEO", port: "พอร์ตลงทุน", topup: "เติมเครดิต", aireport: "AI Report Studio · สร้างรายงาน" };
const trLogLab = k => TR_LOG_LAB[k] || (/^ai/i.test(String(k)) ? "AI Report Studio" : "รายการอื่น");

/* ---------------------------------------------------------------- 2 · ตรรกะสิทธิ์ */
const ownInd = () => { const o = S.freeCo && byT[S.freeCo]; return o ? o.ind : cur().ind; };
/** ดูข้อมูลบริษัทนี้ได้หรือไม่ — Basic เฉพาะบริษัทตนเอง · Pro ปลดรายบริษัท · Pro Max ทุกบริษัท */
function canSeeCo(t) {
  t = t || S.t; const r = tierRank();
  if (r >= 2) return true;
  if (!S.freeCo || S.freeCo === t) return true;
  return r >= 1 && !!S.unlocked[keyOf("report", t)];
}
const TR_PAID = ["report", "peer", "studio", "ceotext", "sector", "port"];   // port: Basic ✕ · Pro 3 เครดิต (ครั้งเดียว) · Pro Max ฟรี
const _trIsU = isUnlocked;
isUnlocked = function (what, t) {
  t = what === "port" ? "ALL" : (t || S.t); const r = tierRank();
  if (!TR_PAID.includes(what)) return _trIsU(what, t);
  if (r >= 2) return true;                                         // Pro Max · Subscription
  if (what === "report") return S.freeCo === t || (r >= 1 && !!S.unlocked[keyOf("report", t)]);
  if (r < 1) return false;                                         // Basic · ✕
  if (what === "sector") return false;                             // ภาพรวมทั้งอุตสาหกรรม = Pro Max เท่านั้น (แก้ไขครั้งที่ 2.4)
  if (what === "ceotext") return !!S.unlocked[keyOf("studio", t)];
  return !!S.unlocked[keyOf(what, t)];
};
const _trSpend = spend;
spend = function (what, t, label) {
  t = what === "port" ? "ALL" : (t || S.t); const r = tierRank();
  if (!TR_PAID.includes(what)) return _trSpend(what, t, label);
  if (r >= 2) { toast("รวมอยู่ในสิทธิ์ Pro Max แล้ว — ไม่ใช้เครดิต"); return true; }
  if (r < 1) {
    toast("ระดับ Basic ใช้เครดิตปลดล็อกไม่ได้ — เปลี่ยนเป็น Pro (Pay-Per-Use) แล้วใช้เครดิตที่มีอยู่ได้ทันที");
    go("billing"); return false;
  }
  if (what === "sector") { toast("ภาพรวมทั้งอุตสาหกรรมและบริษัทคะแนนใกล้เคียงเป็นสิทธิ์ Pro Max"); go("billing"); return false; }
  const w = what === "ceotext" ? "studio" : what, cost = PRICE[w] || 1;
  if (S.credits < cost) { go("billing"); toast(`เครดิตไม่พอ — เหลือ ${S.credits} ต้องใช้ ${cost}`); return false; }
  S.credits -= cost;
  if (w === "sector") S.sectors[t] = true; else S.unlocked[keyOf(w, t)] = true;
  S.log.unshift({ what: w, t, cost, label: label || "", at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) });
  save(); syncChrome(); toast(`ปลดล็อกแล้ว · ใช้ ${cost} เครดิต · เหลือ ${S.credits}`);
  return true;
};
/** ตัวเลือกบริษัทบนหัว (เขียนทับ fillCompanies ของ v2_app.js) — ต่ำกว่า Pro Max เรียงตามตัวย่อ ไม่เรียงตามคะแนน
 *  (การเรียงตาม OIS เปิดเผยอันดับของบริษัทที่ยังดูไม่ได้) · ป้ายมีเฉพาะตัวย่อและชื่อ ไม่มีคะแนน */
fillCompanies = function () {
  const sel = $("#selCo"); if (!sel) return;
  const base = (S.ind === "all" ? COMPS : indComps(+S.ind)).slice();
  const list = tierRank() >= 2 ? base.sort((a, b) => b.ipi - a.ipi) : base.sort((a, b) => a.t.localeCompare(b.t));
  sel.innerHTML = list.map(c => `<option value="${esc(c.t)}">${esc(c.t)} · ${esc(c.n)}</option>`).join("");
  if (!list.some(c => c.t === S.t)) S.t = list[0].t;
  sel.value = S.t;
  sel.dataset.b5sort = tierRank() >= 2 ? "ois" : "ticker";
};
/** ตรวจชุดคู่เทียบใหม่ตามระดับสิทธิ์ — ต่ำกว่า Pro Max ใช้ได้เฉพาะอุตสาหกรรมเดียวกัน (ภาคผนวก ง ข้อ 12) */
function trRevalidatePeers() {
  if (tierRank() >= 2) return;
  const same = (co, t) => byT[t] && byT[co] && byT[t].ind === byT[co].ind && t !== co;
  S.peerAll = false;
  S.peers = (S.peers || []).filter(t => same(S.t, t));
  if (S.peerMap && typeof S.peerMap === "object") {
    let ch = false;
    Object.keys(S.peerMap).forEach(co => { const a = S.peerMap[co] || [], b = a.filter(t => same(co, t)); if (b.length !== a.length) { S.peerMap[co] = b; ch = true; } });
    if (ch) try { localStorage.setItem("ois_peers_v1", JSON.stringify(S.peerMap)); } catch (e) { }
  }
}
const PLAN_NAME = { free: "Level 1 · Basic", pro: "Level 2 · Pro (Pay-Per-Use)", max: "Level 3 · Pro Max (Subscription)" };
function setPlan(p) {
  if (!PLAN_RANK.hasOwnProperty(p)) return;
  if (S.planSrv) { toast(`ระดับสิทธิ์ของบัญชีนี้กำหนดโดยเซิร์ฟเวอร์ (${PLAN_NAME[S.planSrv] || S.planSrv}) — ติดต่อผู้ดูแลระบบเพื่อเปลี่ยนระดับ`); return; }
  const up = PLAN_RANK[p] > tierRank();
  S.plan = p;
  if (up && S.credits < PLAN_TOKENS[p]) S.credits = PLAN_TOKENS[p];
  trRevalidatePeers();
  try { fillCompanies(); } catch (e) { }
  save(); syncChrome();
  toast(`เปลี่ยนเป็น ${PLAN_NAME[p]} · เครดิต ${S.credits}`);
}
/* โหมดเซิร์ฟเวอร์: ถ้า OIS_API.me() ส่งระดับสิทธิ์ (plan) มา ใช้ค่านั้นแทนการเลือกในเครื่อง (ภาคผนวก ง ข้อ 5) */
function trApplyServerPlan(me) {
  const raw = me && (me.plan || (me.user && me.user.plan)); if (!raw) return false;
  const p = String(raw).toLowerCase().replace(/[\s_-]+/g, "");
  const k = p === "basic" || p === "free" || p === "level1" ? "free" : p === "pro" || p === "level2" ? "pro" : p === "promax" || p === "max" || p === "level3" ? "max" : null;
  if (!k) return false;
  S.srvAdmin = me && (me.role === "admin" || (me.user && me.user.role === "admin")) || false;
  const changed = S.plan !== k || S.planSrv !== k;
  S.plan = k; S.planSrv = k; trRevalidatePeers();
  try { fillCompanies(); } catch (e) { }
  if (changed && S.user) { save(); syncChrome(); if (typeof render === "function") render(); }
  return true;
}
(() => {
  try {
    if (!(window.OIS_API && typeof window.OIS_API.me === "function")) return;
    Promise.resolve(window.OIS_API.me()).then(me => {
      const adm = !!(me && (me.role === "admin" || (me.user && me.user.role === "admin")));
      if (!trApplyServerPlan(me) && adm !== !!S.srvAdmin) { S.srvAdmin = adm; if (S.user && typeof render === "function") render(); }
    }).catch(() => { });
  } catch (e) { }
})();
goPro = function () { if (tierRank() >= 1) return; setPlan("pro"); };
/** โค้ดเดิมบางจุดเช็ก S.plan === "pro" ตรง ๆ — Pro Max ต้องได้ทุกอย่างที่ Pro ได้ จึงให้มองเห็นเป็น "pro" ชั่วขณะตอนวาด */
function asPro(fn) {
  if (S.plan !== "max") return fn();
  S.plan = "pro";
  try { return fn(); } finally { S.plan = "max"; }
}
const _trStatusBar = statusBar;
statusBar = function (c) { return asPro(() => _trStatusBar(c)); };
if (typeof svAdmin === "function") { const _sa = svAdmin; svAdmin = function () { return asPro(() => _sa()); }; }

/* ---------------------------------------------------------------- 3 · ผนังสิทธิ์ (ข้อความเป็น "เครดิต")
   แก้ไขครั้งที่ 2.4 (ภาคผนวก ง ข้อ 10) — ไม่สร้างเนื้อหาที่ล็อกไว้ใต้ภาพเบลอ: พารามิเตอร์ inner ถูกละไว้ แสดงโครงว่างแทนเสมอ */
const TR_NEED = { pro: "Level 2 · Pro (Pay-Per-Use)", max: "Level 3 · Pro Max (Subscription)" };
const trSkel = n => `<div class="card">${[...Array(n)].map((_, i) => `<div class="tr-skel" style="width:${92 - i * 9}%"></div>`).join("")}</div>`;
function trWall(inner, title, body, need) {
  return `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${trSkel(6)}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:56px"><div class="paycard">
      <div class="lk">◈</div>
      <div class="tr-eyebrow">สิทธิ์ของ ${esc(TR_NEED[need] || need)}</div>
      <h3 style="font-size:16px;margin-bottom:5px">${esc(title)}</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-setplan="${need}">เปลี่ยนเป็น ${need === "max" ? "Pro Max" : "Pro"}</button>
        <button class="btn s" data-goto="billing">ดูตารางสิทธิ์</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px;line-height:1.6">ต้นแบบยังไม่เชื่อมระบบชำระเงิน — สลับระดับได้ทันทีเพื่อสาธิต</div>
    </div></div></div>`;
}
paywall = function (inner, what, title, body, cost, tag) {
  if (tierRank() < 1 && TR_PAID.includes(what))
    return trWall("", title, body + `<br><b>ระดับ Basic ใช้เครดิตปลดล็อกส่วนนี้ไม่ได้</b> — เปลี่ยนเป็น Pro แล้วใช้เครดิตที่มีอยู่ได้ทันที`, "pro");
  return `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${trSkel(6)}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:64px"><div class="paycard">
      <div class="lk">🔒</div>
      <h3 style="font-size:16px;margin-bottom:5px">${esc(title)}</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-unlock="${what}">ปลดล็อก · ใช้ ${cost} เครดิต</button>
        <button class="btn s" data-goto="billing">ดูแพ็กเกจเครดิต</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">คุณมี <b style="color:var(--ink)">${S.credits}</b> เครดิต${tag ? " · " + tag : ""}
        · Pro Max ใช้ได้โดยไม่ตัดเครดิต</div>
    </div></div></div>`;
};
prowall = function (inner, title, body) { return trWall("", title, body, "pro"); };

/* ---------------------------------------------------------------- 4 · ประตูสิทธิ์รายบริษัท */
const CO_VIEWS = ["profile", "docs", "fit", "zonec", "matrix", "compass", "peer", "studio", "ic", "t561"];
function trCoGate() {
  const c = cur(), r = tierRank(), mine = S.freeCo && byT[S.freeCo];
  return pageHead("สิทธิ์การดูข้อมูลบริษัท", `${c.t} · ${c.n}`,
    r < 1 ? "ระดับ Basic (Level 1) ดูข้อมูลได้เฉพาะบริษัทของคุณเองบริษัทเดียว — ไม่สามารถดูข้อมูลบริษัทอื่นได้"
      : "ระดับ Pro (Level 2) ปลดล็อกข้อมูลบริษัทเพิ่มได้ทีละบริษัทด้วยเครดิต — ปลดครั้งเดียวดูได้ตลอด")
    + `<div class="card tr-gate">
      <div class="tr-gate-ic" aria-hidden="true">🔒</div>
      <div style="flex:1;min-width:240px">
        <h3 style="margin:0 0 4px">${r < 1 ? `ข้อมูลของ ${esc(c.t)} ยังไม่เปิดสำหรับระดับ Basic` : `ปลดล็อกข้อมูลของ ${esc(c.t)}`}</h3>
        <p class="desc" style="margin:0">${r < 1
          ? `บริษัทของคุณคือ <b>${esc(S.freeCo)}</b>${mine ? ` (${esc(mine.n)})` : ""} · เปลี่ยนเป็น Pro (Pay-Per-Use ไม่มีค่ารายเดือน) เพื่อปลดล็อกบริษัทอื่นทีละบริษัท หรือ Pro Max เพื่อดูได้ทุกบริษัท`
          : `ใช้ ${PRICE.report} เครดิต เปิด Company Profile, รายงานวินิจฉัยฉบับเต็ม, Zone A–C และ Grid ของบริษัทนี้ · คุณมี <b>${S.credits}</b> เครดิต · Pro Max ดูได้ทุกบริษัทโดยไม่ตัดเครดิต`}</p>
        <div class="gx-row" style="margin-top:12px">
          ${r >= 1 ? `<button class="btn p" data-unlock="report">ปลดล็อกบริษัทนี้ · ${PRICE.report} เครดิต</button>` : `<button class="btn p" data-setplan="pro">เปลี่ยนเป็น Pro (Pay-Per-Use)</button>`}
          ${S.freeCo ? `<button class="btn s" data-trco="${esc(S.freeCo)}">กลับไปที่บริษัทของฉัน (${esc(S.freeCo)})</button>` : ""}
          <button class="btn g" data-setplan="max">Pro Max · ดูได้ทุกบริษัท</button></div>
      </div></div>` + trSkel(4);
}
CO_VIEWS.forEach(k => {
  const v = VIEWS[k];
  if (typeof v === "function") VIEWS[k] = function () { return canSeeCo(S.t) ? v.apply(this, arguments) : trCoGate(); };
  const w = WIRES2[k];
  WIRES2[k] = function (h) { if (!canSeeCo(S.t)) return; if (typeof w === "function") w(h); };
});

/* ---------------------------------------------------------------- 5 · หน้าที่ปรับตามสิทธิ์ */
/* Peer Benchmark — Basic ✕ */
(() => {
  const v = VIEWS.peer, w = WIRES2.peer;
  VIEWS.peer = function () {
    if (tierRank() >= 1 || !canSeeCo(S.t)) return v.apply(this, arguments);
    const c = cur();
    return pageHead("เทียบคู่แข่ง", `Peer Benchmark · ${c.t}`, "เทียบตัวต่อตัวกับคู่แข่งในอุตสาหกรรมเดียวกัน 3 ราย")
      + trWall("", "Peer Benchmark", "ระดับ Pro เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน ด้วย 1 เครดิต (เปลี่ยนคู่แข่งได้ไม่จำกัดหลังปลดล็อก) · Pro Max เทียบทั้งอุตสาหกรรม บริษัทคะแนนใกล้เคียง และข้ามอุตสาหกรรมได้", "pro");
  };
  WIRES2.peer = function (h) { if (tierRank() < 1) return; if (typeof w === "function") w(h); };
})();

/* ภาพรวมอุตสาหกรรม — แก้ไขครั้งที่ 2.4: Pro Max เท่านั้น (เทียบทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง)
   Basic / Pro ไม่สร้างตาราง ปุ่ม CSV หรือข้อมูลบริษัทอื่นใน DOM เลย (ภาคผนวก ง ข้อ 10) */
(() => {
  const v = VIEWS.sector, w = WIRES2.sector;
  VIEWS.sector = function () {
    const r = tierRank();
    if (r < 2) return pageHead("ภาพรวมอุตสาหกรรม", "Industry Overview", "เทียบทั้งอุตสาหกรรม · การกระจายตัวของคะแนน · บริษัทคะแนนใกล้เคียง")
      + trWall("", "ภาพรวมทั้งอุตสาหกรรม · บริษัทคะแนนใกล้เคียง",
        `เป็นสิทธิ์ของ Pro Max (Subscription) — ดูตารางทั้งอุตสาหกรรม ส่งออก CSV และบริษัทที่อันดับคะแนนอยู่ติดกับบริษัทของคุณ เพื่อศึกษารูปแบบเชิงกลยุทธ์ของกลุ่มนั้น ·
         ${r >= 1 ? "ระดับ Pro เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกันได้ที่หน้า “เทียบคู่แข่ง”" : "ระดับ Pro เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน"}`, "max");
    const h = v.apply(this, arguments), c = cur();
    return h + (typeof b4NeighCard === "function" && inDomainOf(c.ind) ? `<div style="margin-top:14px">${b4NeighCard(c)}</div>` : "");
  };
  WIRES2.sector = function (h) { if (tierRank() < 2) return; if (typeof w === "function") w(h); };
})();

/* หลักฐานความแม่น — Pro Max เห็นตารางรายปีเหมือน Pro */
if (typeof VIEWS.valid === "function") { const v = VIEWS.valid; VIEWS.valid = function () { return asPro(() => v.apply(this, arguments)); }; }
/* ข้อสั่งการบอร์ด / Compliance — สิทธิ์ Pro Max · บังคับจริง (ภาคผนวก ง ข้อ 7) ระดับอื่นไม่สร้างเนื้อหาของหน้า */
if (typeof VIEWS.directives === "function") {
  const v = VIEWS.directives, wd = WIRES2.directives;
  VIEWS.directives = function () {
    if (tierRank() >= 2) return v.apply(this, arguments);
    return pageHead("Pilot", "ข้อสั่งการบอร์ด / Compliance program", "แผนกำกับดูแลรายเดือน/รายไตรมาส และการติดตามข้อสั่งการของคณะกรรมการ")
      + trWall("", "ข้อสั่งการบอร์ด / Compliance program", "เป็นสิทธิ์ของ Pro Max (Subscription) ตามตารางสิทธิ์ · ข้อสั่งการที่บันทึกไว้แล้วยังแสดงในหน้า Follow-up ของบริษัทที่เกี่ยวข้อง", "max");
  };
  WIRES2.directives = function (h) { if (tierRank() < 2) return; if (typeof wd === "function") wd(h); };
}

/* ---------------------------------------------------------------- 6 · หน้าเครดิตและแผน */
function viewBillingTr() {
  const r = tierRank(), used = S.log.filter(l => l.cost > 0).reduce((a, b) => a + b.cost, 0);
  const col = k => PLAN_RANK[k] === r ? " tr-cur" : "";
  const cell = v => v === "✕" ? `<span class="tr-x" aria-label="ไม่สามารถใช้งานได้">✕</span>` : esc(v);
  return pageHead("บัญชีของคุณ", "เครดิตและแผนการใช้งาน",
    "สิทธิ์ 3 ระดับ — Basic (บริษัทตนเอง) · Pro (Pay-Per-Use · เทียบ 3 บริษัท) · Pro Max (Subscription · ทั้งอุตสาหกรรม) · คิดค่าบริการด้วยเครดิตตามการใช้งานจริง ปลดล็อกแล้วอยู่ตลอด")
    + `<div class="grid g4 tight" style="gap:10px;margin-bottom:16px">
      <div class="stat hero"><div class="k">เครดิตคงเหลือ</div><div class="v num">${S.credits}</div>
        <div class="u">${S.credits ? "พร้อมใช้งาน" : "หมดแล้ว — เติมเพื่อใช้งานต่อ"}</div></div>
      <div class="stat"><div class="k">ระดับปัจจุบัน</div><div class="v" style="font-size:19px">${esc(PLAN_LAB[S.plan])}</div>
        <div class="u">${esc(TR_PLANS[r].lv)} · ${esc(TR_PLANS[r].sub)}</div></div>
      <div class="stat"><div class="k">ใช้ไปแล้ว</div><div class="v num">${used}</div><div class="u">${S.log.length} รายการ</div></div>
      <div class="stat"><div class="k">บริษัทของคุณ</div><div class="v" style="font-size:19px">${esc(S.freeCo || "ยังไม่ได้เลือก")}</div>
        <div class="u">รายงาน การวิเคราะห์ และทางเลือกสำหรับการพิจารณา — ทุกระดับ</div></div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>ระดับสิทธิ์การใช้งาน</h3>
      <p class="desc">ระดับกำหนดว่าเปิดฟีเจอร์ใดได้ ส่วนเครดิตใช้จ่ายรายครั้งในระดับ Pro · Pro Max เป็น Subscription ที่ต่อยอดจาก Pro จึงไม่ตัดเครดิตกับรายการในตาราง</p>
      <div class="grid g3 tr-plans">${TR_PLANS.map(p => `<div class="tr-plan${p.k === S.plan ? " on" : ""}">
          <div class="tr-plan-h"><span class="tr-lv">${esc(p.lv)}</span>${p.k === S.plan ? `<span class="pill ok">ระดับปัจจุบัน</span>` : ""}</div>
          <b class="tr-plan-n">${esc(p.n)}</b><div class="tr-plan-s">${esc(p.sub)}</div>
          <p>${esc(p.d)}</p><div class="tr-plan-t">เริ่มต้น ${p.tok} เครดิต${p.k === "free" ? " (รับทันทีเมื่อสมัคร)" : ""}</div>
          ${p.k === S.plan ? "" : `<button class="btn ${PLAN_RANK[p.k] > r ? "p" : "g"}" data-setplan="${p.k}">${PLAN_RANK[p.k] > r ? "อัปเกรดเป็น" : "สลับไป"} ${esc(p.n)}</button>`}
        </div>`).join("")}</div>
      ${S.planSrv ? `<div class="note warn" style="margin-top:12px">ระดับสิทธิ์ของบัญชีนี้กำหนดโดยเซิร์ฟเวอร์ (${esc(PLAN_NAME[S.planSrv] || S.planSrv)})</div>` : ""}
      <div class="note" style="margin-top:12px">ต้นแบบยังไม่เชื่อมระบบชำระเงิน — สลับระดับได้ทันทีเพื่อสาธิต · อัตรา Subscription ของ Pro Max เป็นไปตามข้อตกลงองค์กร (ยังไม่กำหนดในต้นแบบ) · ระบบจริงจะผูกระดับกับการชำระเงินและออกใบเสร็จ (เฟส 2)</div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>ตารางสิทธิ์การใช้งาน <span class="pill blue">ตามที่ประชุม 15 ต.ค. 2569</span></h3>
      <p class="desc">คอลัมน์ที่ไฮไลต์คือระดับปัจจุบันของคุณ · หน้าในระบบตรวจสิทธิ์ตามตารางนี้</p>
      <div class="tw"><table class="tr-perm"><thead><tr><th>ฟีเจอร์ / สิทธิ์การเข้าถึง</th>
        <th class="${col("free")}">Level 1 · Basic</th><th class="${col("pro")}">Level 2 · Pro (Pay-Per-Use)</th><th class="${col("max")}">Level 3 · Pro Max (Subscription)</th></tr></thead>
        <tbody>${PERM.map(row => `<tr><th scope="row">${esc(row[0])}</th><td class="${col("free")}">${cell(row[1])}</td>
          <td class="${col("pro")}">${cell(row[2])}</td><td class="${col("max")}">${cell(row[3])}</td></tr>`).join("")}</tbody></table></div>
    </div>

    <div class="grid g2" style="margin-bottom:14px">
      <div class="card"><h3>อัตราการใช้เครดิต (Credit Tariff)</h3>
        <div class="tw"><table><thead><tr><th>รายการ</th><th class="n">เครดิต</th><th>หมายเหตุ</th></tr></thead><tbody>
          ${TARIFF.map(t => `<tr><td>${esc(t[0])}</td><td class="n"><b>${esc(t[1])}</b></td><td style="color:var(--ink-2)">${esc(t[2])}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="gx-sm" style="margin-top:8px">หลักคิด: ให้ตรวจสอบก่อนจ่าย · จ่ายตามที่ใช้จริง · ปลดล็อกแล้วอยู่ตลอด · ขายเป็นชุดได้ในระดับอุตสาหกรรม</p></div>
      <div class="card"><h3>แพ็กเกจเติมเครดิต (Credit Packages)</h3>
        <div class="tr-packs">${PACKS.map((p, i) => `<div class="tr-pack${i === 1 ? " best" : ""}">
            ${p.tag ? `<span class="tr-tag">${esc(p.tag)}</span>` : ""}
            <div class="tr-pack-n">${p.n}<span> เครดิต</span></div>
            <div class="tr-pack-b">${fmt(p.baht)} บาท</div>
            <div class="gx-sm">เฉลี่ย ${fmt(Math.round(p.baht / p.n))} บาท / รายงาน</div>
            <button class="btn ${i === 1 ? "p" : "s"}" data-buy="${p.n}">เลือกแพ็กเกจนี้</button></div>`).join("")}</div>
        <div class="note" style="margin-top:12px">การชำระเงินเป็นการจำลอง — กดเลือกแพ็กเกจแล้วยืนยันเพื่อเติมเครดิตด้วยมือ ไม่มีการตัดบัตรจริง (ระบบชำระเงินและใบเสร็จอยู่ในเฟส 2)</div></div>
    </div>

    <div class="card"><h3>ประวัติการใช้เครดิต</h3>
      ${S.log.length ? `<div class="tw" style="max-height:260px;overflow:auto"><table><thead><tr><th>รายการ</th><th>อ้างอิง</th><th class="n">เครดิต</th><th>เวลา</th></tr></thead><tbody>
        ${S.log.map(l => `<tr><td>${esc(trLogLab(l.what))}</td>
          <td style="color:var(--ink-2)">${esc(l.label || l.t)}</td><td class="n">${l.cost > 0 ? "−" + l.cost : "+" + (-l.cost)}</td>
          <td style="color:var(--ink-3);font-size:11px">${esc(l.at)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div style="text-align:center;padding:26px 10px;color:var(--ink-3);font-size:12.5px">ยังไม่มีการใช้เครดิต</div>`}
      <button class="btn g" id="btnResetDemo" style="margin-top:12px;width:100%;justify-content:center">รีเซ็ตข้อมูลสาธิต (คืนเครดิต 3 และล้างสิทธิ์ที่ปลดล็อก)</button>
    </div>`;
}
VIEWS.billing = viewBillingTr;

/* ---------------------------------------------------------------- 7 · ร่าง 56-1 · Template และการอนุมัติ */
const T561_KEY = "ois_t561_v1";
const T561_PH = ["ชื่อบริษัท", "ปีบัญชี", "กระบวนการประเมิน", "ประเด็นพัฒนา", "การดำเนินการที่เสร็จและมีมติ", "ผลประเมิน BOD", "ผล RFQ"];
/* ชื่อตัวแทนข้อมูลภาษาอังกฤษ (ลำดับเดียวกับ T561_PH) — ใช้ได้ทั้งสองแบบทุกที่และได้ค่าเดียวกัน ({{company}} ≡ {{ชื่อบริษัท}})
   ปุ่มแทรก/คู่มือแสดงแบบที่ตรงกับภาษาหน้าจอ · ชั้นแปล (v2_i18n.js) แปลงตัวแทนไทยในข้อความของระบบเป็นแบบอังกฤษเมื่อหน้าจอเป็น EN */
const T561_PH_EN = ["company", "fiscal_year", "evaluation_process", "development_issues", "completed_actions_with_resolutions", "bod_evaluation_result", "rfq_result"];
const T561_ALIAS = window.T561_ALIAS = Object.fromEntries(T561_PH.map((p, i) => [p, T561_PH_EN[i]]));
const t561Ph = () => S.lang === "EN" ? T561_PH_EN : T561_PH;
/** ข้อความสรุปจากหน้าแบบประเมิน (ไฟล์ v2_assess.js) — รองรับทั้ง string และ { text | summary } · ไม่มีฟังก์ชัน/ไม่มีผล → "" */
function mvSummaryText(fn, ...args) {
  try {
    if (typeof window[fn] !== "function") return "";
    const r = window[fn](...args);
    if (!r) return "";
    if (typeof r === "string") return r.trim();
    if (typeof r === "object") return String(r.text || r.summary || "").trim();
  } catch (e) { }
  return "";
}
const T561_DEFAULT = () => ({ id: "default", name: "แบบมาตรฐาน · 56-1 ส่วนที่ 2 ข้อ 7–8", secs: [
  { h: "ส่วนที่ 2 ข้อ 7 · โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ — การประเมินผลการปฏิบัติงานของคณะกรรมการด้านการกำกับดูแลนวัตกรรม",
    b: "ในปีบัญชี {{ปีบัญชี}} คณะกรรมการ{{ชื่อบริษัท}}ได้ประเมินผลการปฏิบัติงานของคณะกรรมการในระดับคณะ เพิ่มเติมในประเด็นการกำกับดูแลนวัตกรรมแบบเปิด โดยมีกระบวนการดังนี้\n{{กระบวนการประเมิน}}\n\n{{ผลประเมิน BOD}}" },
  { h: "ส่วนที่ 2 ข้อ 8 · รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ — การกำกับดูแลนวัตกรรมแบบเปิด",
    b: "ประเด็นพัฒนาที่คณะกรรมการกำหนดจากการประเมิน ได้แก่\n{{ประเด็นพัฒนา}}\n\nการดำเนินการที่แล้วเสร็จและผ่านมติของคณะกรรมการในรอบปี\n{{การดำเนินการที่เสร็จและมีมติ}}" },
] });
/** แบบมาตรฐานภาษาอังกฤษ — 56-1 One Report ยื่นทั้งภาษาไทยและภาษาอังกฤษ (ส่วนที่ 2 ข้อ 7–8) · ใช้เมื่อหน้าจอเป็น EN และผู้ใช้ยังไม่แก้ Template มาตรฐาน */
const T561_DEFAULT_EN = () => ({ id: "default", name: "Standard · Form 56-1 One Report Part 2 Items 7–8", secs: [
  { h: "Part 2 Item 7 · Corporate governance structure and key information on the board of directors — Board performance evaluation on innovation governance",
    b: "In fiscal year {{fiscal_year}}, the Board of Directors of {{company}} evaluated its performance at board level, additionally covering the governance of open innovation, through the following process:\n{{evaluation_process}}\n\n{{bod_evaluation_result}}" },
  { h: "Part 2 Item 8 · Report on key operating results in corporate governance — Open innovation governance",
    b: "Development issues set by the board from the evaluation:\n{{development_issues}}\n\nActions completed and approved by board resolution during the year:\n{{completed_actions_with_resolutions}}" },
] });
const t561DefFor = lang => lang === "EN" ? T561_DEFAULT_EN() : T561_DEFAULT();
/** Template มาตรฐานที่ผู้ใช้ยังไม่แก้ (ตรงกับแบบไทยหรือแบบอังกฤษทุกตัวอักษร) → สลับเป็นภาษาของหน้าจอ · Template ที่แก้แล้ว/ที่บันทึกเองไม่แตะ */
function t561LangSync() {
  const want = t561DefFor(S.lang === "EN" ? "EN" : "TH"), same = (a, b) => a.name === b.name && a.secs.length === b.secs.length && a.secs.every((x, i) => x.h === b.secs[i].h && x.b === b.secs[i].b);
  T561.tpl.forEach(t => { if (t.id !== "default" || !Array.isArray(t.secs) || same(t, want)) return;
    if (same(t, T561_DEFAULT()) || same(t, T561_DEFAULT_EN())) { t.name = want.name; t.secs = want.secs; } });
}
const T561 = (() => {
  const d = { tpl: [T561_DEFAULT()], cur: "default", ap: {}, sd: {} };
  try { const o = JSON.parse(localStorage.getItem(T561_KEY) || "null");
    if (o && Array.isArray(o.tpl) && o.tpl.length) { d.tpl = o.tpl; d.cur = o.cur || o.tpl[0].id; d.ap = o.ap || {}; }
    if (o && o.sd && typeof o.sd === "object") d.sd = o.sd; } catch (e) { }
  if (!d.tpl.some(t => t.id === "default")) d.tpl.unshift(T561_DEFAULT());
  return d;
})();
const t561Save = () => { try { localStorage.setItem(T561_KEY, JSON.stringify(T561)); } catch (e) { } };
const t561Tpl = () => { t561LangSync(); return T561.tpl.find(t => t.id === T561.cur) || T561.tpl[0]; };
const t561Now = () => new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
const t561Hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const T561_ROLES = ["ประธานกรรมการ", "เลขานุการบริษัท", "ประธานคณะกรรมการบรรษัทภิบาล"];
let _t561Ai = null, _t561Focus = null;

/** ผล BOD Self-Assessment (OI-1…6) จาก ois_pilot_v1 — ระดับคณะเท่านั้น */
/** คำตอบ BOD OI-1…6 ของบริษัท c เท่านั้น (แก้ไขรอบสุดท้าย) — window.bodOiFor(ticker, fy) ถ้ามี · สำรอง: PL.bodAll["TICKER|ปี"]
 *  ไม่ใช้ PL.bod (ชุดที่เปิดค้างไว้ ซึ่งอาจเป็นของบริษัทอื่น) */
function t561Bod(c) {
  c = c || cur();
  const fy = c.fy || FY_SHOWN;
  let a = null;
  if (typeof window.bodOiFor === "function") {
    try { const r = window.bodOiFor(c.t, fy); a = r ? (r.a && typeof r.a === "object" ? r.a : r.answers && typeof r.answers === "object" ? r.answers : r) : null; } catch (e) { a = null; }
  } else {
    let all = null;
    try { if (typeof PL === "object" && PL && PL.bodAll) all = PL.bodAll; } catch (e) { }
    if (!all) try { const o = JSON.parse(localStorage.getItem("ois_pilot_v1") || "null"); all = o && o.bodAll; } catch (e) { }
    if (all && typeof all === "object") {
      const mine = Object.keys(all).filter(k => k.split("|")[0] === c.t);
      const k = [`${c.t}|${fy + 543}`, `${c.t}|${fy + 544}`, `${c.t}|${fy}`].find(x => all[x]) || mine.sort().pop();
      a = k && all[k] ? all[k].a : null;
    }
  }
  a = a && typeof a === "object" ? a : {};
  const items = typeof OI_ITEMS !== "undefined" ? OI_ITEMS : [];
  const done = items.filter(i => a[i.id]);
  return { done, hi: done.filter(i => a[i.id] >= 4), lo: done.filter(i => a[i.id] <= 2) };
}
/** ค่าที่เติมลงตัวแทน — เฉพาะสิ่งที่เกิดขึ้นจริงและผ่านมติ · ไม่มีชื่อบริษัทอื่น · ไม่ใช้คะแนนแบบจำลอง
 *  lang (ค่าเริ่มต้น = ภาษาหน้าจอ) "EN": ข้อความที่ระบบสร้างเป็นภาษาอังกฤษ · ชื่อบริษัท = ชื่อย่อหลักทรัพย์ · ปีบัญชีเป็น ค.ศ.
 *  ข้อความที่ผู้ใช้พิมพ์ (ประเด็น/มติในหน้า Follow-up) คงตามที่พิมพ์ · คืนทั้งคีย์ไทยและคีย์อังกฤษ (T561_ALIAS) ค่าเดียวกัน */
function t561Values(c, lang) {
  const en = (lang || S.lang) === "EN", tr = x => en && window.I18N && typeof window.I18N.raw === "function" ? window.I18N.raw(String(x)) : String(x);
  const done = typeof fuDoneItems === "function" ? fuDoneItems(c.t) : [];
  const decided = typeof fuRows === "function"
    ? fuRows().filter(r => String(r.dec || "").trim() && r.co === c.t).map(r => rpAnon(r.issue.replace(/^\[[^\]]+\]\s*/, ""), c.t)) : [];
  const bod = t561Bod(c);
  const proc = [];
  if (bod.done.length) proc.push(en
    ? `- The board completed a board-level self-assessment on open innovation governance covering ${bod.done.length} item${bod.done.length === 1 ? "" : "s"} (${bod.done.map(i => i.id).join(", ")}), referencing the 2017 Corporate Governance Code for Listed Companies; the company secretary summarised the board's discussion`
    : `- คณะกรรมการตอบชุดคำถามประเมินตนเองระดับคณะด้านการกำกับดูแลนวัตกรรมแบบเปิด ${bod.done.length} ประเด็น (${bod.done.map(i => i.id).join(", ")}) ซึ่งอ้างอิงหลักการกำกับดูแลกิจการที่ดีสำหรับบริษัทจดทะเบียน ปี 2560 โดยเลขานุการบริษัทสรุปจากการหารือของคณะกรรมการ`);
  if (decided.length) proc.push(en
    ? "- Issues from the evaluation were placed on the board agenda for discussion; conclusions and resolutions were recorded, owners were assigned by position, and a follow-up cycle was set"
    : `- นำประเด็นที่ได้จากการประเมินเข้าสู่วาระการหารือของคณะกรรมการ บันทึกข้อสรุปและมติ กำหนดผู้รับผิดชอบในระดับตำแหน่ง และรอบการติดตามผล`);
  const isu = [...bod.lo.map(i => `${i.id} · ${tr(i.t)}`), ...decided];
  const ids = a => a.map(i => i.id).join(", ") || "—";
  const v = en ? {
    "ชื่อบริษัท": c.t,
    "ปีบัญชี": String(c.fy || FY_SHOWN),
    "กระบวนการประเมิน": proc.length ? proc.join("\n") : "[No evaluation process data yet — fill in after the actual board meeting]",
    "ประเด็นพัฒนา": isu.length ? [...new Set(isu)].map(x => "- " + x).join("\n") : "[No development issues discussed yet]",
    "การดำเนินการที่เสร็จและมีมติ": done.length ? done.map((r, i) => `${i + 1}. ${r.issue} — action taken per resolution: ${r.dec}`).join("\n")
      : "[No completed actions with board resolutions yet — this part lists only actions that actually took place and were approved]",
    "ผล RFQ": mvSummaryText("rfqSummary", c.t, "EN") || "[No RFQ results yet — available on the RFQ page · a CEO self-report measure, separate from the score]",
    "ผลประเมิน BOD": mvSummaryText("bodSetSummary", c.t, c.fy || FY_SHOWN, "EN") || (bod.done.length
      ? `Board-level self-assessment results: items the board considers largely or systematically in place: ${ids(bod.hi)}`
        + ` · items set as development priorities for the next year: ${ids(bod.lo)} · results are a board-level overview; no individual director is assessed or scored`
      : "[No board self-evaluation results yet — available on the Board Self-Evaluation (SET) page or BOD Self-Assessment OI-1…6]"),
  } : {
    "ชื่อบริษัท": c.n || c.t,
    "ปีบัญชี": String((c.fy || FY_SHOWN) + 543),
    "กระบวนการประเมิน": proc.length ? proc.join("\n") : "[ยังไม่มีข้อมูลกระบวนการประเมิน — กรอกหลังการประชุมจริง]",
    "ประเด็นพัฒนา": isu.length ? [...new Set(isu)].map(x => "- " + x).join("\n") : "[ยังไม่มีประเด็นพัฒนาที่ผ่านการหารือ]",
    "การดำเนินการที่เสร็จและมีมติ": done.length ? done.map((r, i) => `${i + 1}. ${r.issue} — การดำเนินการตามมติ: ${r.dec}`).join("\n")
      : "[ยังไม่มีรายการที่ดำเนินการแล้วเสร็จและมีมติ — ส่วนนี้แสดงเฉพาะการดำเนินการที่เกิดขึ้นจริงและผ่านการอนุมัติ]",
    "ผล RFQ": mvSummaryText("rfqSummary", c.t, "TH") || "[ยังไม่มีผลแบบประเมิน RFQ — ทำได้ที่หน้า RFQ · เป็นแบบวัดตนเองของ CEO แยกจากคะแนน]",
    "ผลประเมิน BOD": mvSummaryText("bodSetSummary", c.t, c.fy || FY_SHOWN, "TH") || (bod.done.length
      ? `ผลการประเมินตนเองระดับคณะ: ประเด็นที่คณะกรรมการเห็นว่ามีการดำเนินการเป็นส่วนใหญ่หรืออย่างเป็นระบบแล้ว ได้แก่ ${ids(bod.hi)}`
        + ` · ประเด็นที่กำหนดเป็นแนวทางพัฒนาในปีถัดไป ได้แก่ ${ids(bod.lo)} · ผลเป็นภาพรวมระดับคณะ ไม่มีการประเมินหรือให้คะแนนกรรมการรายบุคคล`
      : "[ยังไม่มีผลประเมินตนเองของคณะกรรมการ — ทำได้ที่หน้าแบบประเมินตนเองของคณะกรรมการ (SET) หรือ BOD Self-Assessment OI-1…6]"),
  };
  T561_PH.forEach(k => { v[T561_ALIAS[k]] = v[k]; });
  return v;
}
/** กฎก่อนส่งออก — ไม่มีชื่อบริษัทอื่น (ใช้ตัวแทนชื่อ) · ไม่อ้างคะแนนแบบจำลองเป็นหลักฐานประสิทธิผลของบอร์ด */
const T561_SCORE_RX = /OpenInnoScore|\bOIS\b|\bTier\s*\d|เปอร์เซ็นไทล์|percentile|quadrant|Signal\s*B|Board Amplification|ช่อง\s*(Deliver|Develop|Discipline|Discover)/i;
/** ตัวตรวจคำอ้างคะแนน/ตำแหน่ง — ใช้กับทุกช่องทางส่งออก (ร่าง 56-1 · Structured Data JSON/CSV · ข้อความจาก AI) · ชื่อช่องอ่านจาก ZONE_CFG
 *  คืนคำที่พบ หรือ "" */
function t561ScoreHit(text) {
  const s = String(text || ""), m = s.match(T561_SCORE_RX); if (m) return m[0];
  const names = typeof zoneNamesAll === "function" ? zoneNamesAll() : [];
  for (const n of names) { const r = new RegExp(`ช่อง\\s*${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"); const mm = s.match(r); if (mm) return mm[0]; }
  return "";
}
window.t561ScoreHit = t561ScoreHit;
function t561Build(c) {
  const vals = t561Values(c), tpl = t561Tpl(), unknown = new Set();
  const fill = s => String(s || "").replace(/{{\s*([^}]+?)\s*}}/g, (m, k) => vals[k] !== undefined ? vals[k] : (unknown.add(k), m));
  const secs = tpl.secs.map(x => ({ h: rpAnon(fill(x.h), c.t), b: rpAnon(fill(x.b), c.t) }));
  const text = secs.map(x => `${x.h}\n\n${x.b}`).join("\n\n");
  const issues = [];
  const m = t561ScoreHit(text);
  if (m) issues.push(`พบคำที่อ้างคะแนน/ตำแหน่งจากแบบจำลอง (“${m}”) — ห้ามใช้คะแนนเป็นหลักฐานว่าบอร์ดมีประสิทธิผล ให้แก้ Template หรือแก้ข้อความประเด็นในหน้า Follow-up ก่อน`);
  if (unknown.size) issues.push(`ตัวแทนที่ระบบไม่รู้จัก: ${[...unknown].map(k => "{{" + k + "}}").join(", ")}`);
  const gaps = (text.match(/\[ยังไม่มี[^\]]*\]/g) || []).length;
  return { secs, text, issues, gaps, hash: t561Hash(text) };
}
function t561Ap(t) { return T561.ap[t] || (T561.ap[t] = { st: "draft", hist: [] }); }
function t561State(c, b) {
  const a = t561Ap(c.t);
  if ((a.st === "pending" || a.st === "approved") && a.hash !== b.hash) return { k: "changed", a };
  return { k: a.st, a };
}
const T561_STEPS = [["draft", "ร่าง"], ["pending", "รออนุมัติ"], ["approved", "อนุมัติแล้ว / ส่งกลับแก้"], ["ready", "พร้อมส่งออก"]];
function t561Flow(st) {
  const idx = st === "pending" ? 1 : st === "approved" ? 3 : st === "returned" ? 2 : 0;
  return `<ol class="tr-flow">${T561_STEPS.map(([k, l], i) => `<li class="${i < idx ? "done" : i === idx ? "on" : ""}${st === "returned" && i === 2 ? " ret" : ""}">
    <b>${i + 1}</b><span>${st === "returned" && i === 2 ? "ส่งกลับแก้" : esc(l)}</span></li>`).join("")}</ol>`;
}
function t561Mail(c, a) {
  return `<div class="tr-mail" role="group" aria-label="ตัวอย่างอีเมลขออนุมัติ">
    <div class="tr-mail-h"><span>ถึง</span><b>${esc(a.role || T561_ROLES[0])}</b> <span class="pill mute">จำลอง · อีเมลจริงต้องใช้เซิร์ฟเวอร์</span></div>
    <div class="tr-mail-h"><span>เรื่อง</span><b>ขออนุมัติร่างข้อความแบบ 56-1 ส่วนที่ 2 ข้อ 7–8 · ${esc(c.n || c.t)} · ปีบัญชี ${(c.fy || FY_SHOWN) + 543}</b></div>
    <div class="tr-mail-b">เรียน ${esc(a.role || T561_ROLES[0])}<br>
      ฝ่ายเลขานุการบริษัทขอเสนอร่างข้อความการกำกับดูแลนวัตกรรมสำหรับแนบแบบ 56-1 One Report (Template “${esc(t561Tpl().name)}”)
      เพื่อพิจารณาอนุมัติก่อนนำส่งออก · ร่างนี้ใช้เฉพาะการดำเนินการที่เกิดขึ้นจริงและผ่านมติแล้ว ไม่ระบุชื่อบริษัทอื่น และไม่ใช้คะแนนแบบจำลองเป็นหลักฐานประสิทธิผลของคณะกรรมการ<br>
      <span class="tr-mail-btns"><span>✓ อนุมัติ</span><span>↺ ส่งกลับแก้</span></span>
      <span class="gx-sm">กดได้จากอุปกรณ์ใดก็ได้ (Anydevice Approval) — ในต้นแบบจำลองด้วยปุ่มด้านล่าง</span></div></div>`;
}
/* ---------------------------------------------------------------- 7ข · Structured Data สำหรับกรอกใน SETLink (แก้ไขครั้งที่ 2.3)
   ขั้นตอนของ SET: กรอก Structured Data → อัปโหลดรูปเล่ม → ตรวจสอบและอนุมัติ → เผยแพร่
   ระบบนี้ช่วยเตรียมเฉพาะฟิลด์ของ 56-1 ส่วนที่ 2 ข้อ 7 และข้อ 8 · ไม่ส่งข้อมูลให้ SET · รูปแบบฟิลด์เป็นสมมติฐาน */
const SD_NOTE = "รูปแบบฟิลด์สมมติ — ตรวจกับแบบฟอร์ม Structured Data ของ SETLink ก่อนใช้จริง";
const SD_METHODS = ["", "ประเมินทั้งคณะ", "ประเมินรายบุคคล", "ประเมินทั้งคณะและรายบุคคล", "ประเมินทั้งคณะ + คณะกรรมการชุดย่อย", "ประเมินทั้งคณะ + รายบุคคล + คณะกรรมการชุดย่อย"];
const SD_COMMITTEES = [["audit", "คณะกรรมการตรวจสอบ"], ["nomrem", "คณะกรรมการสรรหาและพิจารณาค่าตอบแทน"], ["cgrisk", "คณะกรรมการบรรษัทภิบาล / บริหารความเสี่ยง"]];
function sdFields(c) {
  const bs = c.bsize, done = typeof fuDoneItems === "function" ? fuDoneItems(c.t) : [];
  const bodTxt = mvSummaryText("bodSetSummary", c.t, c.fy || FY_SHOWN), bod = t561Bod(c);
  const evalDone = !!bodTxt || bod.done.length > 0;
  const F = [
    { sec: 7, k: "board_total", l: "จำนวนกรรมการทั้งหมด (คน)", t: "int", v: bs || "", src: bs ? "Zone A" : "" },
    { sec: 7, k: "board_independent", l: "จำนวนกรรมการอิสระ (คน)", t: "int", v: "", src: "" },
    { sec: 7, k: "board_executive", l: "จำนวนกรรมการที่เป็นผู้บริหาร (คน)", t: "int", v: "", src: "" },
    { sec: 7, k: "board_female", l: "จำนวนกรรมการหญิง (คน)", t: "int", v: bs ? Math.round(c.fem * bs) : "", src: bs ? "Zone A (สัดส่วน × จำนวนกรรมการ)" : "" },
    { sec: 7, k: "board_family", l: "จำนวนกรรมการที่เป็นครอบครัวผู้ถือหุ้นใหญ่ (คน)", t: "int", v: bs ? Math.round(c.fam * bs) : "", src: bs ? "Zone A (สัดส่วน × จำนวนกรรมการ)" : "" },
    { sec: 7, k: "avg_tenure_years", l: "อายุการดำรงตำแหน่งเฉลี่ยของกรรมการ (ปี)", t: "num", v: isFinite(c.ten) ? Math.round(c.ten * 10) / 10 : "", src: "แผงข้อมูล / Zone A" },
    ...SD_COMMITTEES.flatMap(([k, l]) => [
      { sec: 7, k: `cmt_${k}_total`, l: `${l} · จำนวนกรรมการ`, t: "int", v: "", src: "", cmt: k },
      { sec: 7, k: `cmt_${k}_independent`, l: `${l} · กรรมการอิสระ`, t: "int", v: "", src: "", cmt: k }]),
    { sec: 7, k: "board_self_assessment_done", l: "มีการประเมินตนเองของคณะกรรมการในปีนี้", t: "yn", v: evalDone ? "Y" : "", src: evalDone ? "หน้าแบบประเมินตนเอง" : "" },
    { sec: 7, k: "board_self_assessment_method", l: "รูปแบบการประเมิน", t: "sel", v: evalDone ? "ประเมินทั้งคณะ" : "", src: evalDone ? "หน้าแบบประเมินตนเอง" : "" },
    { sec: 8, k: "board_meetings", l: "จำนวนครั้งการประชุมคณะกรรมการในปี", t: "int", v: "", src: "" },
    { sec: 8, k: "board_attendance_pct", l: "อัตราการเข้าประชุมเฉลี่ย (%)", t: "num", v: "", src: "" },
    { sec: 8, k: "dev_actions_completed", l: "จำนวนการดำเนินการพัฒนาที่แล้วเสร็จและมีมติ", t: "int", v: done.length || "", src: done.length ? "หน้า Follow-up" : "" },
    { sec: 8, k: "dev_actions_list", l: "รายการการดำเนินการที่แล้วเสร็จและมีมติ", t: "text", v: done.map((r, i) => `${i + 1}. ${r.issue} — ${r.dec}`).join("\n"), src: done.length ? "หน้า Follow-up" : "" },
    { sec: 8, k: "bod_evaluation_summary", l: "สรุปผลการประเมินคณะกรรมการ (ระดับคณะ)", t: "text", v: t561Values(c)["ผลประเมิน BOD"].replace(/^\[.*\]$/, ""), src: evalDone ? "หน้าแบบประเมินตนเอง" : "" },
  ];
  const o = (T561.sd || {})[c.t] || {};
  F.forEach(f => { if (o[f.k] !== undefined) { f.v = o[f.k]; f.ed = true; } });
  return F;
}
const sdFilled = F => F.filter(f => String(f.v ?? "").trim() !== "").length;
/** ฟิลด์ข้อความของ Structured Data ที่มีคำอ้างคะแนน — ใช้ตัวตรวจเดียวกับร่าง 56-1 (ภาคผนวก ง ข้อ 14) */
const sdScoreIssues = F => F.filter(f => (f.t === "text" || f.t === "sel") && t561ScoreHit(f.v)).map(f => ({ k: f.k, l: f.l, hit: t561ScoreHit(f.v) }));
function sdJson(c, F) {
  const val = f => f.t === "int" || f.t === "num" ? (f.v === "" ? null : +f.v) : f.t === "yn" ? (f.v === "Y" ? true : f.v === "N" ? false : null) : (f.v || null);
  const pick = sec => Object.fromEntries(F.filter(f => f.sec === sec && !f.cmt).map(f => [f.k, val(f)]));
  return { schema: "OIS-SETLink-StructuredData-draft-0.1", note: SD_NOTE,
    disclaimer: "ระบบนี้ไม่ส่งข้อมูลให้ SET — ผู้ใช้กรอกใน SETLink เอง", company: { ticker: c.t, name: c.n }, fiscal_year: c.fy || FY_SHOWN,
    part2_item7_board_structure: Object.assign(pick(7), { committees: SD_COMMITTEES.map(([k, l]) => ({ key: k, name: l,
      members: val(F.find(f => f.k === `cmt_${k}_total`)), independent: val(F.find(f => f.k === `cmt_${k}_independent`)) })) }),
    part2_item8_governance_performance: pick(8), generated_at: new Date().toISOString() };
}
function sdCsv(c, F) {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [["section", "field_key", "label_th", "value", "source"].map(q).join(","),
    ...F.map(f => [(typeof b5H === "function" ? b5H : (x => x))(`56-1 ส่วนที่ 2 ข้อ ${f.sec}`), f.k, f.l, f.v, f.ed ? "ผู้ใช้แก้" : f.src || ""].map(q).join(","))].join("\n");
}
function sdPanel(c) {
  const F = sdFields(c), n = sdFilled(F), bad = sdScoreIssues(F);
  const inp = f => {
    const id = "sd_" + f.k;
    if (f.t === "yn") return `<select class="sel" id="${id}" data-sd="${f.k}"><option value=""${!f.v ? " selected" : ""}>— ยังไม่ระบุ —</option>
      <option value="Y"${f.v === "Y" ? " selected" : ""}>Y · มี</option><option value="N"${f.v === "N" ? " selected" : ""}>N · ไม่มี</option></select>`;
    if (f.t === "sel") return `<select class="sel" id="${id}" data-sd="${f.k}">${SD_METHODS.map(m => `<option value="${esc(m)}"${m === f.v ? " selected" : ""}>${esc(m || "— ยังไม่ระบุ —")}</option>`).join("")}</select>`;
    if (f.t === "text") return `<textarea class="inp" id="${id}" data-sd="${f.k}" rows="3">${esc(f.v)}</textarea>`;
    return `<input class="inp" id="${id}" data-sd="${f.k}" type="number" min="0" step="${f.t === "num" ? "0.1" : "1"}" value="${esc(f.v)}">`;
  };
  const row = f => `<div class="mv-sdrow${f.t === "text" ? " wide" : ""}"><label for="sd_${f.k}">${esc(f.l)}</label>${inp(f)}
    <span class="mv-sdsrc">${f.ed ? `<span class="pill blue">ผู้ใช้แก้</span>` : f.src ? `<span class="pill mute">เติมจาก ${esc(f.src)}</span>` : `<span class="pill warn">ต้องกรอก</span>`}</span></div>`;
  const sec = k => F.filter(f => f.sec === k);
  return `<div class="card mv-sd" id="mvSd" style="margin-top:14px">
    <h3>Structured Data (สำหรับกรอกใน SETLink) <span class="pill ${n === F.length ? "ok" : "warn"}">กรอกแล้ว ${n} / ${F.length} ฟิลด์</span></h3>
    <div class="note warn" style="margin-bottom:10px"><b>${esc(SD_NOTE)}</b> · ใช้เตรียมข้อมูลก่อนกรอกในระบบ SETLink (ขั้นที่ 1 ของ 56-1 One Report) · ระบบนี้ไม่ส่งข้อมูลให้ SET</div>
    <div class="grid g2" style="gap:16px;align-items:start">
      <div><div class="tr-k">ส่วนที่ 2 ข้อ 7 · โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ</div>
        ${sec(7).filter(f => !f.cmt).map(row).join("")}
        <div class="tr-k" style="margin-top:10px">คณะกรรมการชุดย่อย (ถ้ามี)</div>
        ${sec(7).filter(f => f.cmt).map(row).join("")}</div>
      <div><div class="tr-k">ส่วนที่ 2 ข้อ 8 · รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ</div>
        ${sec(8).map(row).join("")}
        <p class="gx-sm">ค่าที่เติมให้มาจากข้อมูลในระบบ (Zone A · Follow-up · แบบประเมินตนเอง) — ตรวจกับเอกสารจริงก่อนใช้ · ไม่ใช้คะแนนแบบจำลองเป็นหลักฐานประสิทธิผลของคณะกรรมการ</p></div>
    </div>
    ${bad.map(x => `<div class="note crit" style="margin-top:8px">⚠ ช่อง “${esc(x.l)}” มีคำอ้างคะแนน/ตำแหน่ง (“${esc(x.hit)}”) — แก้ก่อนส่งออก (แก้ในช่องนี้ หรือแก้ข้อความประเด็นในหน้า Follow-up)</div>`).join("")}
    <div class="gx-row" style="margin-top:10px"><button class="btn s" id="sdJson"${bad.length ? " disabled" : ""}>ส่งออก JSON</button><button class="btn s" id="sdCsv"${bad.length ? " disabled" : ""}>ส่งออก CSV</button>
      <button class="btn g" id="sdReset">ล้างค่าที่แก้ (กลับไปใช้ค่าที่เติมให้)</button></div>
  </div>`;
}
/** แถบขั้นตอนตาม SETLink — ระบบนี้ทำได้ขั้น 1 (เตรียมข้อมูล) และขั้น 3 (อนุมัติภายในองค์กร) เท่านั้น */
function setlinkFlow(c) {
  const F = sdFields(c), n = sdFilled(F), b = t561Build(c), st = t561State(c, b).k, r = tierRank();
  const steps = [
    ["กรอก Structured Data", `เตรียมในระบบนี้ · ${n}/${F.length} ฟิลด์`, n === F.length ? "done" : "on", "#mvSd"],
    ["อัปโหลดรูปเล่ม", "ทำนอกระบบ — อัปโหลดไฟล์ 56-1 ฉบับเต็มใน SETLink", "ext", ""],
    ["ตรวจสอบและอนุมัติ", r >= 2 ? `ขั้นอนุมัติของระบบนี้ · สถานะ: ${({ draft: "ร่าง", pending: "รออนุมัติ", approved: "อนุมัติแล้ว", returned: "ส่งกลับแก้", changed: "แก้หลังส่ง — ต้องส่งใหม่" })[st] || st}` : "Email Approval เป็นสิทธิ์ Pro Max · Pro ตรวจทานเอง", st === "approved" ? "done" : r >= 2 ? "on" : "ext", ".tr-appr"],
    ["เผยแพร่", "ทำใน SETLink — ระบบนี้ไม่ส่งข้อมูลให้ SET", "ext", ""],
  ];
  return `<ol class="mv-flow" aria-label="ขั้นตอน 56-1 One Report ผ่าน SETLink">${steps.map(([h, p, k, a], i) =>
    `<li class="${k}"${a ? ` data-sdgo="${a}" tabindex="0" role="button"` : ""}><b>${i + 1}</b><div><i>${esc(h)}</i><span>${esc(p)}</span></div></li>`).join("")}</ol>`;
}
function wireSd(h, c) {
  const set = (k, v) => { T561.sd = T561.sd || {}; (T561.sd[c.t] = T561.sd[c.t] || {})[k] = v; t561Save(); render(); };
  h.querySelectorAll("[data-sd]").forEach(el => el.onchange = () => set(el.dataset.sd, el.value.trim()));
  const base = `56-1_StructuredData_ส่วนที่2_ข้อ7-8_${c.t}_${(c.fy || FY_SHOWN) + 543}`;
  const okSd = () => { const b = sdScoreIssues(sdFields(c)); if (b.length) { toast(`แก้ช่อง “${b[0].l}” ก่อนส่งออก — มีคำอ้างคะแนน (“${b[0].hit}”)`); return false; } return true; };
  const j = h.querySelector("#sdJson"); if (j) j.onclick = () => okSd() && t561Dl(base + ".json", JSON.stringify(sdJson(c, sdFields(c)), null, 2), "application/json;charset=utf-8");
  const v = h.querySelector("#sdCsv"); if (v) v.onclick = () => okSd() && t561Dl(base + ".csv", sdCsv(c, sdFields(c)), "text/csv;charset=utf-8");
  const r = h.querySelector("#sdReset"); if (r) r.onclick = () => confirm2(r, () => { if (T561.sd) delete T561.sd[c.t]; t561Save(); render(); }, "กดอีกครั้งเพื่อล้างค่าที่แก้");
  h.querySelectorAll("[data-sdgo]").forEach(li => { const f = () => { const t = h.querySelector(li.dataset.sdgo); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    li.onclick = f; li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; });
}

function viewT561() {
  const r = tierRank(), c = cur();
  const head = pageHead("Agentic AI · 56-1", "ร่าง 56-1 · Template และการอนุมัติ",
    `ลูกค้าเปลี่ยน Template รายงานเองได้ และมีขั้นอนุมัติก่อนส่งข้อมูลออก (รายงานหัวข้อ 6) · หัวข้อที่เกี่ยวข้องคือ 56-1 ส่วนที่ 2 ข้อ 7 และข้อ 8 ·
     ข้อความสร้างจากกฎ (rule-based) — AI ทำหน้าที่เรียบเรียงเท่านั้น คะแนนมาจากเครื่องคำนวณหลังบ้าน`);
  if (r < 1) return head + trWall(trSkel(8), "ร่างรายงาน 56-1 ด้วย Agentic AI",
    "ระดับ Pro สร้างร่างรายงานการกำกับดูแลนวัตกรรมแนบ 56-1 และแก้ Template เองได้ · Pro Max เพิ่มขั้นอนุมัติผ่านอีเมล (Email Approval Workflow) การวิเคราะห์เชิงลึก และ Compliance program", "pro");
  const tpl = t561Tpl(), b = t561Build(c), s = t561State(c, b), a = s.a;
  const blocked = b.issues.length > 0;
  const canExport = !blocked && (r < 2 || (s.k === "approved"));
  const ai = typeof window !== "undefined" && window.OIS_API && typeof window.OIS_API.llm === "function";
  const editor = `<div class="card tr-ed">
    <div class="tr-edh"><h3 style="margin:0">ก · Template</h3>
      <select class="sel" id="t5Tpl" aria-label="เลือก Template">${T561.tpl.map(t => `<option value="${esc(t.id)}"${t.id === tpl.id ? " selected" : ""}>${esc(t.name)}</option>`).join("")}</select></div>
    <label class="tr-k" for="t5Name">ชื่อ Template</label>
    <input class="inp" id="t5Name" value="${esc(tpl.name)}" style="width:100%"${tpl.id === "default" ? "" : ""}>
    <div class="tr-ph"><span class="gx-sm">ตัวแทนข้อมูล — คลิกเพื่อแทรกในช่องข้อความที่เลือกล่าสุด:</span>
      ${t561Ph().map(p => `<button class="tr-chip" data-t5ph="${esc(p)}" data-noi18n>{{${esc(p)}}}</button>`).join("")}</div>
    ${tpl.secs.map((x, i) => `<div class="tr-sec">
      <div class="tr-sec-h"><span class="pill mute">ส่วนที่ ${i + 1}</span>
        <button class="btn g" data-t5up="${i}" ${i ? "" : "disabled"} title="เลื่อนขึ้น">↑</button>
        <button class="btn g" data-t5del="${i}" ${tpl.secs.length > 1 ? "" : "disabled"} title="ลบส่วนนี้">ลบ</button></div>
      <input class="inp" data-t5h="${i}" value="${esc(x.h)}" aria-label="หัวข้อส่วนที่ ${i + 1}" style="width:100%;font-weight:600">
      <textarea class="inp" data-t5b="${i}" rows="6" aria-label="ข้อความส่วนที่ ${i + 1}" style="width:100%;margin-top:6px;resize:vertical">${esc(x.b)}</textarea>
    </div>`).join("")}
    <div class="gx-row">
      <button class="btn s" id="t5Add">+ เพิ่มส่วน</button>
      <button class="btn p" id="t5Save">บันทึก Template</button>
      <button class="btn s" id="t5SaveAs">บันทึกเป็น Template ใหม่</button>
      <button class="btn g" id="t5Reset">คืนค่าเริ่มต้น</button>
      ${tpl.id !== "default" ? `<button class="btn g" id="t5Del">ลบ Template นี้</button>` : ""}</div>
    <p class="gx-sm" style="margin-top:8px">แก้ข้อความแล้วกดนอกช่องเพื่อบันทึกอัตโนมัติ · Template เก็บในเครื่องนี้ (${T561.tpl.length} ชุด) · เมื่อแก้หลังส่งขออนุมัติ ร่างจะกลับเป็นสถานะ “ร่าง”</p>
  </div>`;
  const preview = `<div class="card tr-prev">
    <div class="tr-edh"><h3 style="margin:0">ข · ตัวอย่างร่าง · ${esc(c.t)}</h3>
      ${b.gaps ? `<span class="pill warn">ข้อมูลยังไม่ครบ ${b.gaps} จุด</span>` : `<span class="pill ok">เติมข้อมูลครบ</span>`}</div>
    <div class="note tr-rules"><b>กติกาที่ระบบบังคับ</b> · ใช้เฉพาะการดำเนินการที่เกิดขึ้นจริงและผ่านมติแล้ว (สถานะ “เสร็จ” + มีมติในหน้า Follow-up) ·
      ชื่อบริษัทอื่นถูกแทนด้วย “บริษัทในกลุ่มเปรียบเทียบ” · ไม่ใช้คะแนน/ตำแหน่งจากแบบจำลองเป็นหลักฐานว่าบอร์ดมีประสิทธิผล · ไม่ระบุชื่อบุคคล</div>
    ${b.issues.map(x => `<div class="note crit" style="margin-top:8px">⚠ ${esc(x)}</div>`).join("")}
    ${""/* ตัวอย่างร่าง = ข้อความของ Template (ของผู้ใช้หรือแบบมาตรฐานตามภาษาหน้าจอ) + ค่าที่ระบบเติมตามภาษาหน้าจอ → ไม่ผ่านชั้นแปล (data-noi18n) */}
    <article class="tr-doc" id="t5Doc" data-noi18n>${b.secs.map(x => `<h4>${esc(x.h)}</h4>${x.b.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}`).join("")}</article>
    <div class="tr-ai">
      ${ai ? `<button class="btn s" id="t5Ai">ให้ AI เรียบเรียง (ต้องเปิดใช้บนเซิร์ฟเวอร์)</button>`
        : `<button class="btn g" disabled title="ต้องเปิดใช้บนเซิร์ฟเวอร์">ให้ AI เรียบเรียง (ต้องเปิดใช้บนเซิร์ฟเวอร์)</button>`}
      <span class="gx-sm">${ai ? "AI เรียบเรียงถ้อยคำตามโครงสร้างของ SET เท่านั้น — ไม่เพิ่มข้อเท็จจริงและไม่เข้าถึงสูตรคำนวณ" : "ต้นแบบนี้ยังไม่ได้เชื่อมบริการ AI ฝั่งเซิร์ฟเวอร์ — ร่างด้านบนสร้างจากกฎทั้งหมด"}</span></div>
    ${_t561Ai ? `<div class="tr-aiout ${_t561Ai.ok ? "" : "off"}"><div class="tr-k">${_t561Ai.ok ? "ข้อความที่ AI เรียบเรียง — ตรวจทานก่อนใช้ (ยังไม่ผ่านขั้นอนุมัติจนกว่าจะคัดลอกลง Template)" : "บริการ AI"}</div>
        <div class="tr-aitxt">${esc(_t561Ai.text).replace(/\n/g, "<br>")}</div></div>` : ""}
  </div>`;
  const hist = a.hist.length ? `<div class="tw" style="margin-top:10px"><table class="tr-tbl"><thead><tr><th>เวลา</th><th>การดำเนินการ</th><th>บทบาท</th><th>หมายเหตุ</th></tr></thead>
    <tbody>${a.hist.slice().reverse().map(h => `<tr><td style="white-space:nowrap">${esc(h.at)}</td><td>${esc(h.act)}</td><td>${esc(h.role || "—")}</td><td>${esc(h.note || "")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="gx-sm" style="margin-top:8px">ยังไม่มีประวัติการอนุมัติ</p>`;
  const approval = r < 2 ? `<div class="card tr-lockcard"><h3>ค · ขั้นอนุมัติก่อนส่งออก <span class="pill blue">Pro Max</span></h3>
      <p class="desc" style="margin:0">Email Approval Workflow (ร่าง → รออนุมัติ → อนุมัติแล้ว/ส่งกลับแก้ → พร้อมส่งออก) เป็นสิทธิ์ Pro Max ·
        ระดับ Pro ร่างและส่งออกได้โดยไม่ผ่านขั้นอนุมัติ — ผู้ใช้ต้องตรวจทานกับเลขานุการบริษัทเอง</p>
      <button class="btn s" data-setplan="max" style="margin-top:10px">ดูสิทธิ์ Pro Max</button></div>`
    : `<div class="card tr-appr"><h3>ค · ขั้นอนุมัติก่อนส่งออก <span class="pill blue">Pro Max</span></h3>
      ${t561Flow(s.k === "changed" ? "draft" : s.k)}
      ${s.k === "changed" ? `<div class="note warn" style="margin:8px 0">เนื้อหาเปลี่ยนหลังส่งขออนุมัติ — ต้องส่งขออนุมัติใหม่ก่อนส่งออก</div>` : ""}
      ${s.k === "draft" || s.k === "returned" || s.k === "changed" ? `
        ${s.k === "returned" && a.note ? `<div class="note warn" style="margin:8px 0"><b>ส่งกลับแก้โดย ${esc(a.by || "")}</b> · ${esc(a.note)}</div>` : ""}
        <div class="gx-row" style="align-items:center"><label class="gx-sm" for="t5Role">ผู้อนุมัติ (บทบาท)</label>
          <select class="sel" id="t5Role">${T561_ROLES.map(x => `<option${x === (a.role || T561_ROLES[0]) ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>
          <button class="btn p" id="t5Submit"${blocked ? " disabled title=\"แก้ข้อที่ระบบเตือนก่อน\"" : ""}>ส่งขออนุมัติ</button></div>
        <p class="gx-sm">ระบบจำลองการส่งอีเมลไปยังบทบาทที่เลือก — อีเมลจริงต้องใช้เซิร์ฟเวอร์</p>`
      : s.k === "pending" ? `${t561Mail(c, a)}
        <label class="tr-k" for="t5Note" style="margin-top:10px">ความเห็นผู้อนุมัติ</label>
        <textarea class="inp" id="t5Note" rows="2" style="width:100%" placeholder="เช่น ปรับถ้อยคำย่อหน้าที่ 2 ให้ตรงกับมติครั้งที่ 4/2567"></textarea>
        <div class="gx-row"><button class="btn p" id="t5Ok">✓ อนุมัติ (จำลองในบทบาท ${esc(a.role)})</button>
          <button class="btn s" id="t5Ret">↺ ส่งกลับแก้</button></div>`
      : `<div class="note ok" style="margin:8px 0"><b>อนุมัติแล้ว · พร้อมส่งออก</b> — โดย ${esc(a.by || "")} · ${esc(a.at || "")}${a.note ? " · " + esc(a.note) : ""}</div>
        <button class="btn g" id="t5Reopen">เปิดร่างเพื่อแก้ไขอีกครั้ง</button>`}
      <div class="tr-k" style="margin-top:12px">ประวัติ</div>${hist}</div>`;
  const exportCard = `<div class="card tr-exp"><h3>ส่งออก</h3>
    <p class="desc">${r >= 2 ? (canExport ? "ร่างได้รับอนุมัติแล้ว — ส่งออกได้" : "ปุ่มส่งออกเปิดเมื่อร่างได้รับอนุมัติแล้ว (พร้อมส่งออก)") : blocked ? "แก้ข้อที่ระบบเตือนก่อนส่งออก" : "ระดับ Pro ส่งออกได้ทันที — ตรวจทานกับเลขานุการบริษัทก่อนใช้"}</p>
    <div class="gx-row"><button class="btn s" data-t5x="copy"${canExport ? "" : " disabled"}>คัดลอกข้อความ</button>
      <button class="btn s" data-t5x="txt"${canExport ? "" : " disabled"}>ดาวน์โหลด .txt</button>
      <button class="btn s" data-t5x="md"${canExport ? "" : " disabled"}>ดาวน์โหลด .md</button>
      <button class="btn s" data-t5x="print"${canExport ? "" : " disabled"}>พิมพ์</button></div></div>`;
  const maxCard = `<div class="card"><h3>ต่อยอดระดับ Pro Max <span class="pill ${r >= 2 ? "ok" : "blue"}">${r >= 2 ? "เปิดแล้ว" : "Pro Max"}</span></h3>
    <div class="tr-links">
      ${[["sector", "ภาพรวมทั้งอุตสาหกรรม", "เทียบทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง"],
        ["directives", "แผนกำกับดูแลและข้อสั่งการบอร์ด", "Compliance program รายเดือน / รายไตรมาส"]].map(([v, l, d]) =>
        r >= 2 ? `<button class="tr-link" data-goto="${v}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`
          : `<button class="tr-link off" data-setplan="max"><b>🔒 ${esc(l)}</b><span>${esc(d)}</span></button>`).join("")}</div></div>`;
  return head + (typeof reportChain === "function" ? reportChain(4).replace('aria-current="page"', "").replace(" on\"", "\"") : "")
    + setlinkFlow(c)
    + `<div class="tr-t5grid"><div class="stack">${editor}${maxCard}</div><div class="stack">${preview}${approval}${exportCard}</div></div>`
    + sdPanel(c);
}
function t561Dl(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function wireT561(h) {
  if (typeof wireChain === "function") wireChain(h);
  const c = cur(), tpl = t561Tpl();
  wireSd(h, c);
  const afterEdit = () => { const a = t561Ap(c.t); t561Save(); render(); return a; };
  const sel = h.querySelector("#t5Tpl"); if (sel) sel.onchange = () => { T561.cur = sel.value; _t561Ai = null; t561Save(); render(); };
  const nm = h.querySelector("#t5Name"); if (nm) nm.onchange = () => { tpl.name = nm.value.trim() || tpl.name; t561Save(); render(); };
  h.querySelectorAll("[data-t5h]").forEach(el => { el.onfocus = () => _t561Focus = el; el.onchange = () => { tpl.secs[+el.dataset.t5h].h = el.value; afterEdit(); }; });
  h.querySelectorAll("[data-t5b]").forEach(el => { el.onfocus = () => _t561Focus = el; el.onchange = () => { tpl.secs[+el.dataset.t5b].b = el.value; afterEdit(); }; });
  h.querySelectorAll("[data-t5ph]").forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => {
    const el = _t561Focus && h.contains(_t561Focus) ? _t561Focus : h.querySelector("[data-t5b]");
    if (!el) return;
    const ins = "{{" + b.dataset.t5ph + "}}", p0 = el.selectionStart ?? el.value.length, p1 = el.selectionEnd ?? p0;
    el.value = el.value.slice(0, p0) + ins + el.value.slice(p1);
    el.dispatchEvent(new Event("change")); }; });
  h.querySelectorAll("[data-t5del]").forEach(b => b.onclick = () => { tpl.secs.splice(+b.dataset.t5del, 1); afterEdit(); });
  h.querySelectorAll("[data-t5up]").forEach(b => b.onclick = () => { const i = +b.dataset.t5up; if (i < 1) return;
    [tpl.secs[i - 1], tpl.secs[i]] = [tpl.secs[i], tpl.secs[i - 1]]; afterEdit(); });
  const add = h.querySelector("#t5Add"); if (add) add.onclick = () => { tpl.secs.push(S.lang === "EN" ? { h: "New section", b: "Text — placeholders can be used, e.g. {{company}}" } : { h: "หัวข้อใหม่", b: "ข้อความ — ใช้ตัวแทนข้อมูลได้ เช่น {{ชื่อบริษัท}}" }); afterEdit(); };
  const sv = h.querySelector("#t5Save"); if (sv) sv.onclick = () => { t561Save(); toast("บันทึก Template แล้ว"); };
  const sa = h.querySelector("#t5SaveAs"); if (sa) sa.onclick = () => {
    const id = "t" + Date.now().toString(36), cp = JSON.parse(JSON.stringify(tpl));
    cp.id = id; cp.name = (tpl.name || "Template") + (S.lang === "EN" ? " (copy)" : " (สำเนา)");
    T561.tpl.push(cp); T561.cur = id; t561Save(); toast("บันทึกเป็น Template ใหม่แล้ว"); render(); };
  const rs = h.querySelector("#t5Reset"); if (rs) rs.onclick = () => confirm2(rs, () => {
    const d = t561DefFor(S.lang === "EN" ? "EN" : "TH"); tpl.secs = d.secs; if (tpl.id === "default") tpl.name = d.name; afterEdit(); toast("คืนค่าเริ่มต้นแล้ว"); },
    "กดอีกครั้งเพื่อคืนค่าเป็นแบบมาตรฐาน");
  const dl = h.querySelector("#t5Del"); if (dl) dl.onclick = () => confirm2(dl, () => {
    T561.tpl = T561.tpl.filter(t => t.id !== tpl.id); T561.cur = "default"; t561Save(); render(); }, `กดอีกครั้งเพื่อลบ “${tpl.name}”`);
  /* การอนุมัติ (Pro Max) */
  const push = (a, act, note) => { a.hist.push({ at: t561Now(), act, role: a.role, note: note || "" }); };
  const sub = h.querySelector("#t5Submit"); if (sub) sub.onclick = () => {
    if (tierRank() < 2) return;
    const b = t561Build(c); if (b.issues.length) return toast("แก้ข้อที่ระบบเตือนก่อนส่งขออนุมัติ");
    const a = t561Ap(c.t); a.role = (h.querySelector("#t5Role") || {}).value || T561_ROLES[0];
    a.st = "pending"; a.hash = b.hash; a.note = ""; push(a, "ส่งขออนุมัติ (จำลองอีเมล)");
    t561Save(); toast("ส่งขออนุมัติแล้ว (จำลอง) · ถึง " + a.role); render(); };
  const ok = h.querySelector("#t5Ok"); if (ok) ok.onclick = () => {
    const a = t561Ap(c.t), n = (h.querySelector("#t5Note") || {}).value || "";
    a.st = "approved"; a.by = a.role; a.at = t561Now(); a.note = n.trim(); push(a, "อนุมัติแล้ว → พร้อมส่งออก", a.note);
    t561Save(); toast("อนุมัติแล้ว · พร้อมส่งออก"); render(); };
  const ret = h.querySelector("#t5Ret"); if (ret) ret.onclick = () => {
    const a = t561Ap(c.t), n = ((h.querySelector("#t5Note") || {}).value || "").trim();
    if (!n) return toast("ระบุความเห็นที่ต้องแก้ก่อนส่งกลับ");
    a.st = "returned"; a.by = a.role; a.at = t561Now(); a.note = n; push(a, "ส่งกลับแก้", n);
    t561Save(); toast("ส่งกลับแก้แล้ว"); render(); };
  const ro = h.querySelector("#t5Reopen"); if (ro) ro.onclick = () => { const a = t561Ap(c.t); a.st = "draft"; push(a, "เปิดร่างเพื่อแก้ไข"); t561Save(); render(); };
  /* ส่งออก */
  h.querySelectorAll("[data-t5x]").forEach(btn => btn.onclick = () => {
    const b = t561Build(c), k = btn.dataset.t5x, base = `56-1_ส่วนที่2_ข้อ7-8_${c.t}_${(c.fy || FY_SHOWN) + 543}`;
    if (b.issues.length) return toast("แก้ข้อที่ระบบเตือนก่อนส่งออก");
    if (tierRank() >= 2 && t561State(c, b).k !== "approved") return toast("ต้องได้รับอนุมัติก่อนส่งออก");
    if (k === "copy") return typeof copyText === "function" ? copyText(b.text) : navigator.clipboard && navigator.clipboard.writeText(b.text);
    if (k === "txt") return t561Dl(base + ".txt", b.text, "text/plain;charset=utf-8");
    if (k === "md") return t561Dl(base + ".md", b.secs.map(x => `## ${x.h}\n\n${x.b}`).join("\n\n"), "text/markdown;charset=utf-8");
    if (k === "print") return typeof rpPrint === "function" ? rpPrint("tr-print-561") : window.print();
  });
  /* AI เรียบเรียง — ทำงานเมื่อเซิร์ฟเวอร์เปิดให้ใช้เท่านั้น */
  const aiB = h.querySelector("#t5Ai"); if (aiB) aiB.onclick = async () => {
    const b = t561Build(c);
    if (b.issues.length) return toast("แก้ข้อที่ระบบเตือนก่อนส่งให้ AI");
    aiB.disabled = true; aiB.textContent = "กำลังเรียบเรียง …";
    try {
      const res = await Promise.resolve(window.OIS_API.llm("t561_rewrite", { text: b.text,
        rules: ["เรียบเรียงถ้อยคำตามโครงสร้าง 56-1 ส่วนที่ 2 ข้อ 7–8 เท่านั้น", "ห้ามเพิ่มข้อเท็จจริง ตัวเลข หรือชื่อบริษัท/บุคคล", "ห้ามอ้างคะแนนเป็นหลักฐานประสิทธิผลของคณะกรรมการ"] }));
      if (!res || res.enabled === false || res.ok === false) _t561Ai = { ok: false, text: (res && (res.message || res.reason || res.error)) || "บริการ AI ยังไม่ได้เปิดใช้บนเซิร์ฟเวอร์ — ใช้ร่างที่สร้างจากกฎไปก่อน" };
      else {
        const t = typeof res === "string" ? res : (res.text || res.output || res.content || "");
        const out = rpAnon(String(t), c.t);
        _t561Ai = t561ScoreHit(out) ? { ok: false, text: "ข้อความจาก AI อ้างคะแนนแบบจำลอง จึงไม่แสดง — ใช้ร่างจากกฎแทน" } : { ok: !!out, text: out || "AI ไม่ได้ส่งข้อความกลับมา" };
      }
    } catch (e) { _t561Ai = { ok: false, text: "เรียก AI ไม่สำเร็จ — " + (e && e.message || e) }; }
    render();
  };
}
VIEWS.t561 = viewT561;
WIRES2.t561 = function (h) { if (!canSeeCo(S.t) || tierRank() < 1) return; wireT561(h); };
/* ประตูสิทธิ์บริษัทถูกห่อไว้ก่อนลงทะเบียน t561 — ห่ออีกครั้งให้ครบ */
(() => { const v = VIEWS.t561; VIEWS.t561 = function () { return canSeeCo(S.t) ? v() : trCoGate(); }; })();

/* ---------------------------------------------------------------- 8 · คู่มือการใช้งาน (ในหน้าระบบ) */
const MAN_SECS = [["man-start", "เริ่มต้น"], ["man-plans", "ระดับสิทธิ์และเครดิต"], ["man-flow", "เส้นทางการทำงาน"], ["man-t561", "ร่าง 56-1"],
  ["man-read", "อ่านผลอย่างไร"], ["man-whatif", "What-if (กรรมการหญิง + อายุงาน)"], ["man-uc", "Use Case"], ["man-rules", "กติกาสำคัญ"], ["man-pilot", "หน้า Pilot"],
  ["man-assess", "RFQ · Dictionary · ประเมินตนเองของบอร์ด"], ["man-data", "ชุดข้อมูล · Evidence Pack · Structured Data"], ["man-rcpt", "ใบเสร็จตัวอย่าง"], ["man-faq", "คำถามที่พบบ่อย"],
  /* แก้ไขรอบสุดท้าย — ส่วนของหน้าใหม่ (เลข 14–19 ต่อท้าย เพื่อไม่เปลี่ยนเลขส่วนเดิม) */
  ["man-tiers", "Basic · Pro · Pro Max โดยย่อ"], ["man-port", "พอร์ตลงทุน · โหมดที่ประชุม"], ["man-ai", "AI Report Studio"],
  ["man-upload", "นำเข้าข้อมูลปีใหม่และการอนุมัติ"], ["man-valid", "Validity · คำนวณใหม่เมื่อข้อมูลเปลี่ยน"], ["man-lang", "สลับภาษา ไทย / English"]];
const MAN_HELP = { profile: "man-v-profile", docs: "man-v-docs", fit: "man-v-fit", zonec: "man-v-zonec", matrix: "man-v-matrix", compass: "man-v-compass",
  peer: "man-v-peer", studio: "man-whatif", followup: "man-v-followup", t561: "man-t561", sector: "man-tiers", billing: "man-plans", port: "man-port", ic: "man-port",
  arch: "man-rules", valid: "man-valid", bod: "man-pilot", rfq: "man-assess", dict: "man-assess", bodset: "man-assess",
  aireport: "man-ai", dataupload: "man-upload", dataadmin: "man-upload",
  datasets: "man-data", evidence: "man-data", outdomain: "man-pilot", directives: "man-pilot", survey: "man-pilot", syslog: "man-pilot", integr: "man-pilot" };
const MAN_CHIPS = [
  ["tier ไม่แน่นอน", "ช่วง 90% ของคะแนนคร่อมมากกว่าหนึ่ง tier — อย่าสรุประดับจากตัวเลขเดียว"],
  ["Caution: ปีนี้ไม่ผ่านเกณฑ์ validity", "ปีบัญชีนั้นตกเกณฑ์อย่างน้อยหนึ่งข้อในตาราง validity — อ่านผลอย่างระมัดระวัง"],
  ["ยังไม่ได้ validate", "ยังไม่มีข้อมูลปีถัดไปให้ตรวจ"],
  ["หลักฐานอ่อนในอุตสาหกรรมนี้", "ความสัมพันธ์ระหว่างคะแนนกับกิจกรรม open innovation ในอุตสาหกรรมนี้ยังไม่ต่างจากศูนย์อย่างมีนัย"],
  ["กรรมการหญิง … คน — ต่ำกว่าเกณฑ์ critical mass", "เกณฑ์คือกรรมการหญิงอย่างน้อย 3 คน — เป็นเกณฑ์ที่ผู้วิจัยกำหนด อิงแนวคิด critical mass (Konrad, Kramer & Erkut, 2008) ไม่ได้มาจากตารางผลของบทความ"],
  ["amp ≤ 0", "บอร์ดอยู่ในรูปแบบที่ภาษาเชิงรุกของ CEO ไม่สัมพันธ์กับ open innovation ที่สูงขึ้น"],
  ["ค่าป้อนถูก clip", "ค่าอยู่นอกช่วงของฐานอ้างอิง จึงถูกปรับเข้าขอบช่วงก่อนเข้าสูตร"],
  ["นอกกลุ่มอ้างอิง", "ธนาคาร/การเงิน หรือไม่มีสารภาษาอังกฤษ — ไม่แสดง tier เปอร์เซ็นไทล์ หรือตำแหน่งบน Grid"],
  ["ธงสัญญาณ OI", "อยู่ช่อง A (ช่องมุมขวาบน) และขอบล่างของช่วง 90% ≥ 50 ในปีที่ผ่าน validity — เป็นธงเชิงความสัมพันธ์ ไม่ใช่การรับรอง"],
];
const MAN_FAQ = [
  ["คะแนน OpenInnoScore คือความน่าจะเป็นที่บริษัทจะทำนวัตกรรมใช่ไหม", "ไม่ใช่ — เป็นเปอร์เซ็นไทล์ของสัญญาณเทียบฐานอ้างอิง REF-928 (928 บริษัท-ปี) อ่านเชิงความสัมพันธ์ ไม่ใช่การพยากรณ์และไม่ใช่เหตุ-ผล"],
  ["ทำไมระดับ Basic เปิดบริษัทอื่นไม่ได้ แม้มีเครดิต", "Basic ออกแบบให้ “ตรวจสอบก่อนจ่าย” กับบริษัทของตนเอง · เครดิต 3 หน่วยที่ได้ตอนสมัครใช้ได้ทันทีเมื่อเปลี่ยนเป็น Pro (Pay-Per-Use ไม่มีค่ารายเดือน)"],
  ["ปลดล็อกแล้วต้องจ่ายซ้ำไหม", "ไม่ต้อง — ปลดล็อกครั้งเดียวดูได้ตลอดสำหรับบริษัท/อุตสาหกรรมนั้น · Pro Max ไม่ตัดเครดิตกับรายการในตาราง"],
  ["ทำไม What-if ไม่มีตัวปรับกรรมการครอบครัวและ political ties", "ตามที่ประชุมตกลง What-if จำลองได้ 2 ตัวแปร (จำนวนกรรมการหญิงและอายุงาน) · สองตัวแปรบริบทนี้ความสัมพันธ์ไม่ทนต่อการวิเคราะห์ fixed-effects และกติกา R6 ของงานวิจัยกำหนดให้เป็นข้อมูลอ่านอย่างเดียว ไม่ใช้เป็นเหตุผลเชิงบวก"],
  ["ทำไมปรับอายุงานแล้วคะแนนหลักไม่เปลี่ยน", "คะแนนหลัก (B_EG) ตัดอายุงานออกด้วย evidence gate (DP1) เพราะงานวิจัยไม่พบหลักฐานที่ทนต่อการวิเคราะห์ · ผลของอายุงานจึงแสดงแยกเป็น “การวิเคราะห์ความไว (B_FULL)” ซึ่งในงานวิจัยให้ผลความแม่นใกล้เคียงกับคะแนนหลัก"],
  ["ระบบบอกไหมว่าทางเลือกใดดีกว่า", "ไม่ — ทางเลือกสำหรับการพิจารณาเรียงลำดับคงที่ แต่ละข้อแสดงความสัมพันธ์ตามสูตรคู่กับข้อแลกเปลี่ยน ผู้ใช้วิเคราะห์และตัดสินใจเอง · คำอธิบายอ้างอิงบทความวิจัยและฐานความรู้ของผู้ว่าจ้าง"],
  ["จุดอ้างอิงบน Grid คือเป้าหมายที่ควรไปใช่ไหม", "ไม่ใช่ — เป็นค่ามัธยฐานของบริษัทช่อง Deliver ในอุตสาหกรรมเดียวกัน ใช้เทียบระยะห่างเท่านั้น และปิดไว้เป็นค่าเริ่มต้น"],
  ["ร่าง 56-1 เอาคะแนนไปใส่ได้ไหม", "ไม่ได้ — ร่างใช้เฉพาะกระบวนการประเมิน ประเด็นพัฒนา และการดำเนินการที่เกิดขึ้นจริงและผ่านมติ ระบบจะเตือนและบล็อกการส่งออกถ้าพบคำอ้างคะแนน"],
  ["ข้อมูลที่อัปโหลดถูกส่งไปที่ไหน", "ต้นแบบนี้อ่านเอกสารในเบราว์เซอร์เท่านั้น ไม่ส่งออก · ข้อมูลอยู่ใน localStorage ของเครื่องนี้"],
  ["ทำไมธนาคารไม่มีจุดบน Grid", "ธนาคารอยู่นอกฐานอ้างอิง REF-928 (อุตสาหกรรม 1–7 นอกกลุ่มการเงิน) — ใช้ BOD Self-Assessment และโหมดนอกกลุ่มอ้างอิงแทน"],
];
/** ส่วนคู่มือของหน้าใหม่ (แก้ไขรอบสุดท้าย) — มีข้อความอังกฤษในตัว (T) เพราะเป็นข้อความใหม่ที่พจนานุกรมยังไม่มี */
function manNewSecs() {
  const L = (id, l) => `<button class="lnk" data-mango2="${id}">${esc(l)}</button>`;
  return `<section class="card b5-man" id="man-tiers"><h3>${T("14 · Basic · Pro · Pro Max at a glance", "14 · Basic · Pro · Pro Max โดยย่อ")}</h3>
      <ul class="tr-ol"><li>${T("<b>Basic (Level 1)</b> — your own company only: report, analysis and options for consideration (Zone A–C · Compass · 2×2 position). Other companies' scores are not shown, the company picker is sorted by ticker, and starter credits cannot unlock anything until you switch to Pro.",
          "<b>Basic (Level 1)</b> — เฉพาะบริษัทของคุณเอง: รายงาน การวิเคราะห์ และทางเลือกสำหรับการพิจารณา (Zone A–C · Compass · ตำแหน่งบน 2×2) · ไม่แสดงคะแนนของบริษัทอื่น ตัวเลือกบริษัทเรียงตามตัวย่อ และเครดิตเริ่มต้นใช้ปลดล็อกไม่ได้จนกว่าจะเปลี่ยนเป็น Pro")}</li>
        <li>${T("<b>Pro (Level 2 · Pay-Per-Use)</b> — head-to-head with 3 companies in the same industry, What-if (female directors + tenure), unlock other companies one at a time, portfolio (3 credits once), AI Report Studio (1 credit per report).",
          "<b>Pro (Level 2 · Pay-Per-Use)</b> — เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน · What-if (กรรมการหญิง + อายุงาน) · ปลดล็อกบริษัทอื่นทีละบริษัท · พอร์ตลงทุน (3 เครดิต ครั้งเดียว) · AI Report Studio (1 เครดิตต่อรายงาน)")}</li>
        <li>${T("<b>Pro Max (Level 3 · Subscription)</b> — whole industry, neighbouring-score companies, cross-industry peers, downside scenarios, directives/compliance and approval; no credits are charged for items in the table.",
          "<b>Pro Max (Level 3 · Subscription)</b> — ทั้งอุตสาหกรรม · บริษัทคะแนนใกล้เคียง · เทียบข้ามอุตสาหกรรม · ฉากทัศน์ขาลง · ข้อสั่งการ/Compliance และขั้นอนุมัติ · ไม่ตัดเครดิตกับรายการในตาราง")}</li>
        <li>${T(`Full permission table: ${L("billing", "Credits and plans")} (${PERM.length} rows).`, `ตารางสิทธิ์ฉบับเต็ม: ${L("billing", "เครดิตและแผนการใช้งาน")} (${PERM.length} แถว)`)}</li></ul></section>
    <section class="card b5-man" id="man-port"><h3>${T("15 · Portfolio · Investment-committee mode", "15 · พอร์ตลงทุน · โหมดที่ประชุม")}</h3>
      <ul class="tr-ol"><li>${T("Portfolio: Basic ✕ · Pro unlocks once (3 credits) and lists only companies you can see (your own + unlocked) · Pro Max includes all companies with no credit charge.",
          "พอร์ตลงทุน: Basic ✕ · Pro ปลดครั้งเดียว (3 เครดิต) และใส่ได้เฉพาะบริษัทที่ดูได้ (บริษัทตนเอง + ที่ปลดล็อก) · Pro Max ทุกบริษัท ไม่ตัดเครดิต")}</li>
        <li>${T("Committee mode shows the same numbers as the diagnostic report. Wording is descriptive (\"points that may be considered first\") — the committee decides.",
          "โหมดที่ประชุมใช้ตัวเลขชุดเดียวกับรายงานวินิจฉัย · ถ้อยคำเป็นการบรรยาย (“ประเด็นที่อาจพิจารณาก่อน”) ไม่ใช่ข้อเสนอ — ที่ประชุมตัดสินใจเอง")}</li>
        <li>${T("The index used to sort the portfolio combines formula gap, CEO language and distance to the group leader; it is a sort key, not a recommendation.",
          "ดัชนีลำดับพิจารณารวมช่องว่างตามสูตร ภาษาผู้นำ และระยะห่างจากผู้นำกลุ่ม — ใช้เรียงข้อมูล ไม่ใช่คำแนะนำ")}</li></ul></section>
    <section class="card b5-man" id="man-ai"><h3>${T("16 · AI Report Studio", "16 · AI Report Studio")}</h3>
      <ul class="tr-ol"><li>${T(`${L("aireport", "Open AI Report Studio")} — choose a template, review the data sent to the AI (payload) and the full prompt, then generate. The report language follows the screen language.`,
          `${L("aireport", "เปิด AI Report Studio")} — เลือกเทมเพลต ตรวจข้อมูลที่ส่งให้ AI (payload) และคำสั่งฉบับเต็ม แล้วจึงสร้างรายงาน · ภาษาของรายงานตามภาษาหน้าจอ`)}</li>
        <li>${T("Permissions: Basic ✕ · Pro 1 credit per report (some templates are Pro Max) · Pro Max included. History lists each report under “AI Report Studio”.",
          "สิทธิ์: Basic ✕ · Pro 1 เครดิตต่อ 1 รายงาน (บางเทมเพลตเป็นสิทธิ์ Pro Max) · Pro Max รวมใน Subscription · ประวัติการใช้เครดิตแสดงเป็น “AI Report Studio”")}</li>
        <li>${T("AI text is checked by the same score-claim filter as the 56-1 draft before it can be used.", "ข้อความจาก AI ผ่านตัวตรวจคำอ้างคะแนนชุดเดียวกับร่าง 56-1 ก่อนนำไปใช้")}</li></ul></section>
    <section class="card b5-man" id="man-upload"><h3>${T("17 · New-year data upload and approval", "17 · นำเข้าข้อมูลปีใหม่และการอนุมัติ")}</h3>
      <ul class="tr-ol"><li>${T(`${L("dataupload", "Upload a new year")} — CEO statement .txt (≥ 2,000 words, counted with the same word counter as Zone A) and 56-1 One Report .pdf/.txt. Uploaded data is visible only to you until approved.`,
          `${L("dataupload", "นำเข้าข้อมูลปีใหม่")} — สาร CEO .txt (≥ 2,000 คำ นับด้วยตัวนับคำเดียวกับ Zone A) และ 56-1 One Report .pdf/.txt · ข้อมูลที่นำเข้ามองเห็นเฉพาะผู้ใช้นั้นจนกว่าจะได้รับอนุมัติ`)}</li>
        <li>${T(`${L("dataadmin", "Approval")} — an administrator/the researcher reviews and approves before the data enters the main database; the index is then recomputed.`,
          `${L("dataadmin", "อนุมัติข้อมูล")} — ผู้ดูแลระบบ/อาจารย์ตรวจและอนุมัติก่อนนำเข้าฐานข้อมูลหลัก แล้วระบบคำนวณดัชนีใหม่`)}</li></ul></section>
    <section class="card b5-man" id="man-valid"><h3>${T("18 · Validity — recomputed when the data changes", "18 · Validity · คำนวณใหม่เมื่อข้อมูลเปลี่ยน")}</h3>
      <ul class="tr-ol"><li>${T(`${L("valid", "Validity page")} shows the research tables (Table 3–5) and the Spearman checks as tables and charts; when approved new-year data arrives the checks are recomputed on the updated base.`,
          `${L("valid", "หน้า Validity")} แสดงตารางของงานวิจัย (Table 3–5) และการทดสอบ Spearman ทั้งตารางและกราฟ · เมื่อมีข้อมูลปีใหม่ที่อนุมัติแล้ว ระบบคำนวณการทดสอบใหม่บนฐานที่อัปเดต`)}</li>
        <li>${T("The critical-mass threshold (≥ 3 women) is a researcher-set threshold following the critical-mass literature, not a result table of the paper.",
          "เกณฑ์ critical mass (กรรมการหญิง ≥ 3 คน) เป็นเกณฑ์ที่ผู้วิจัยกำหนด อิงแนวคิดในวรรณกรรม ไม่ใช่ตารางผลของบทความ")}</li></ul></section>
    <section class="card b5-man" id="man-lang"><h3>${T("19 · Language switch (ไทย / English)", "19 · สลับภาษา ไทย / English")}</h3>
      <ul class="tr-ol"><li>${T("Use the TH / EN switch at the top. Screens, exports (CSV/MD column headers) and AI reports follow the selected language; data values are not translated.",
          "ใช้ปุ่ม TH / EN ด้านบน · หน้าจอ หัวคอลัมน์ไฟล์ส่งออก (CSV/MD) และรายงาน AI ตามภาษาที่เลือก · ค่าข้อมูลไม่ถูกแปล")}</li>
        <li>${T("What-if simulates two variables only: number of female directors (board size is the denominator) and average board tenure (shown as a B_FULL sensitivity).",
          "What-if จำลอง 2 ตัวแปรเท่านั้น: จำนวนกรรมการหญิง (ขนาดบอร์ดเป็นตัวหาร) และอายุงานเฉลี่ยของบอร์ด (แสดงเป็นความไว B_FULL)")}</li></ul></section>`;
}
function viewManual() {
  const step = (id, n, h, p) => `<li id="man-v-${id}"><b>${n}. ${esc(h)}</b> <button class="lnk" data-goto="${id}">เปิดหน้า →</button><div>${p}</div></li>`;
  return pageHead("คู่มือ", "คู่มือการใช้งาน OpenInnoScore",
    "คู่มือย่อในหน้าระบบ — เริ่มต้น เส้นทางการทำงาน วิธีอ่านผล และกติกาสำคัญ · กด “?” บนหัวของแต่ละหน้าเพื่อกลับมาที่หัวข้อที่เกี่ยวข้อง")
    + `<div class="tr-man">
    <nav class="tr-toc" aria-label="สารบัญคู่มือ">${MAN_SECS.map(([id, l], i) => `<button data-mango="${id}">${i + 1}. ${esc(l)}</button>`).join("")}</nav>
    <div class="tr-mbody">
    <section class="card" id="man-start"><h3>1 · เริ่มต้น</h3>
      <ol class="tr-ol"><li>หน้าเข้าสู่ระบบ: เลือกระดับผู้ใช้ (Basic · Pro · Pro Max) เลือก “บริษัทของคุณ” แล้วกดเข้าสู่ระบบ — ไฟล์ HTML ออฟไลน์จำลองการล็อกอิน · ในเวอร์ชันเว็บ (เซิร์ฟเวอร์) ใช้ Google Sign-in จริง</li>
        <li>บริษัทของคุณ = บริษัทที่ดูรายงาน การวิเคราะห์ และทางเลือกสำหรับการพิจารณาได้ครบทุกระดับ · Basic รับ ${PLAN_TOKENS.free} เครดิตทันที (ใช้ได้เมื่อเปลี่ยนเป็น Pro)</li>
        <li>เวอร์ชันเว็บ (เซิร์ฟเวอร์): ถ้าบัญชีมีระดับสิทธิ์บนเซิร์ฟเวอร์ ระบบใช้ระดับนั้นแทนการเลือกในเครื่อง</li>
        <li>แถบบนแสดงระดับและเครดิตคงเหลือ · เปลี่ยนบริษัท/อุตสาหกรรมได้จากตัวเลือกด้านบน · ปุ่ม “เติม” พาไปหน้าเครดิตและแผน</li></ol></section>
    <section class="card" id="man-plans"><h3>2 · ระดับสิทธิ์และเครดิต</h3>
      <div class="tw"><table class="tr-perm"><thead><tr><th>ฟีเจอร์</th><th>Basic</th><th>Pro (Pay-Per-Use)</th><th>Pro Max (Subscription)</th></tr></thead>
        <tbody>${PERM.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>
      <p class="gx-sm" style="margin-top:8px">เครดิต (Pro): รายงานบริษัทที่ 2 ขึ้นไป 1 · เทียบคู่แข่ง 3 ราย 1 · What-if (รวมวัดภาษา CEO) 1 · ภาพรวมทั้งอุตสาหกรรมและบริษัทคะแนนใกล้เคียงรวมใน Pro Max ·
        แพ็กเกจ 5 เครดิต 490 บาท · 15 เครดิต 1,290 บาท · 40 เครดิต 2,990 บาท · การชำระเงินในต้นแบบเป็นการจำลอง</p></section>
    <section class="card" id="man-flow"><h3>3 · เส้นทางการทำงาน</h3>
      <ol class="tr-steps">
        ${step("profile", 1, "Company Profile", "ภาพรวมบริษัท ข้อมูลองค์ประกอบบอร์ด และจุดเริ่มของทุกหน้า")}
        ${step("docs", 2, "Zone A · Document Intelligence", "สาร CEO: ไฟล์ .txt ≥ 2,000 คำ (ทุกระดับ · วางข้อความได้ด้วยเกณฑ์เดียวกัน) · แบบ 56-1: .pdf/.txt · แก้ค่าบอร์ดเองได้ทุกช่อง และทุกตัวเลขบอกที่มา")}
        ${step("fit", 3, "Zone B · Insight Generator", "รายงานวินิจฉัย: OpenInnoScore, tier, ช่วง 90%, quadrant และข้อค้นพบที่กด “Add to Report” ได้")}
        ${step("zonec", 4, "Zone C · Board Refresh", "ทางเลือกสำหรับการพิจารณาระดับคณะ (ลำดับคงที่ พร้อมข้อแลกเปลี่ยน) — ใช้เฉพาะสัดส่วนกรรมการหญิงและภาษา CEO · ไม่ชี้ว่าทางเลือกใดดีกว่า")}
        ${step("matrix", 5, "Strategy Grid 2×2", "ตำแหน่งบริษัท + ประเด็นสำหรับบอร์ด 6 ส่วน · ชื่อช่องแสดงทั้งชื่อที่ใช้อยู่และชื่อตามบทความ (รอผู้วิจัยยืนยัน) · Pro เทียบ 3 บริษัท · Pro Max เทียบทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง")}
        ${step("compass", 6, "Compass · รายงานประเด็นสำหรับบอร์ด", "รายงานฉบับเต็มสำหรับการประชุม — ผลหลังประชุมผู้ใช้กรอกเอง")}
        ${step("peer", 7, "Peer Benchmark", "เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน (Pro) พร้อมคำถามว่าความต่างเกิดจากอะไร · ข้ามอุตสาหกรรมเป็นสิทธิ์ Pro Max")}
        ${step("studio", 8, "What-if Studio", "จำลอง 2 ตัวแปร (กรรมการหญิง · อายุงาน) + What-if Report · Pro Max มีฉากทัศน์ขาลง")}
        ${step("followup", 9, "Follow-up", "ข้อสรุป มติ ผู้รับผิดชอบ (ตำแหน่ง) และกำหนดติดตาม — แก้ข้อความประเด็นได้ · ข้อมูลต้นทางของร่าง 56-1")}
        ${step("t561", 10, "ร่าง 56-1 · Template และการอนุมัติ", "เติมข้อความลง Template แล้วส่งขออนุมัติก่อนส่งออก")}
      </ol></section>
    <section class="card" id="man-t561"><h3>4 · ร่าง 56-1 · Template และการอนุมัติ</h3>
      <ul class="tr-ol"><li>Template แบ่งเป็นส่วน แก้หัวข้อและข้อความได้ · แทรกตัวแทนข้อมูล ${t561Ph().map(p => `<code>{{${esc(p)}}}</code>`).join(" ")} · บันทึกได้หลายชุด และคืนค่าเริ่มต้นได้</li>
        <li>ค่าเริ่มต้นผูกกับแบบ 56-1 ส่วนที่ 2 ข้อ 7 (โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ) และข้อ 8 (รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ)</li>
        <li>ระบบใช้เฉพาะรายการ “เสร็จ” ที่มีมติของบริษัทนั้น · แทนชื่อบริษัทอื่นด้วยคำกลาง · บล็อกการส่งออก (รวม Structured Data JSON/CSV) ถ้าพบคำอ้างคะแนนหรือชื่อช่อง — แก้ข้อความประเด็นได้ที่หน้า Follow-up</li>
        <li>Pro Max: ร่าง → ส่งขออนุมัติ (จำลองอีเมลถึงประธานกรรมการ / เลขานุการบริษัท) → อนุมัติ หรือ ส่งกลับแก้ (บันทึกความเห็น บทบาท เวลา) → พร้อมส่งออก · Pro: ร่างและส่งออกได้โดยไม่ผ่านขั้นอนุมัติ</li>
        <li>ปุ่ม “ให้ AI เรียบเรียง” ทำงานเมื่อเปิดใช้บนเซิร์ฟเวอร์เท่านั้น</li></ul></section>
    <section class="card" id="man-read"><h3>5 · อ่านผลอย่างไร</h3>
      <dl class="tr-dl">
        <dt>OpenInnoScore (0–100)</dt><dd>เปอร์เซ็นไทล์ของสัญญาณ B = cP × amp เทียบฐาน REF-928 — ไม่ใช่ความน่าจะเป็น</dd>
        <dt>Tier 1–4</dt><dd>ระดับของคะแนนตามจุดตัดของฐานอ้างอิง · อ่านคู่กับช่วง 90% เสมอ</dd>
        <dt>เปอร์เซ็นไทล์</dt><dd>ตำแหน่งเทียบฐานอ้างอิง เช่น 70 = สูงกว่าราว 70% ของบริษัท-ปีในฐาน</dd>
        <dt>ช่วง 90%</dt><dd>ความไม่แน่นอนของคะแนนจากค่าประมาณของแบบจำลอง — ถ้าคร่อมหลาย tier ระบบจะติดป้าย “tier ไม่แน่นอน”</dd>
        <dt>ช่อง 2×2 (${["A", "B", "C", "D"].map(k => esc(ZONES[k].l)).join(" · ")})</dt><dd>แกนนอน = CEO Promotion Focus · แกนตั้ง = Board Amplification Signal · เป็นสี่ช่อง ไม่ใช่ควอไทล์อันดับ · ${esc(typeof ZONE_CFG !== "undefined" ? ZONE_CFG.pendingNote : "")}</dd>
        <dt>แถบสถานะ</dt><dd>สรุป Tier × quadrant พร้อมค่าเฉลี่ยกิจกรรม open innovation ของกลุ่มเดียวกันในฐาน (ไม่ใช่ค่าคาดหมายของบริษัท)</dd></dl>
      <div class="tr-k" style="margin-top:10px">ป้าย (chips) บนแถบสถานะ</div>
      <dl class="tr-dl">${MAN_CHIPS.map(([k, d]) => `<dt><span class="chip">${esc(k)}</span></dt><dd>${esc(d)}</dd>`).join("")}</dl></section>
    <section class="card" id="man-whatif"><h3>6 · What-if Studio</h3>
      <ul class="tr-ol"><li><b>จำลองได้ 2 ตัวแปร</b> ตามที่ประชุมตกลง: (1) จำนวนกรรมการหญิง (ปุ่ม − / +) โดยมีขนาดบอร์ดเป็นตัวหาร (2) อายุงานเฉลี่ยของบอร์ด (ปี) · ถ้าฐานข้อมูลไม่มีจำนวนกรรมการ ระบบตั้งต้นที่ 11 คน (กรอกจำนวนจริงได้ใน Zone A)</li>
        <li><b>อายุงานไม่ขยับคะแนนหลัก</b> — คะแนนหลัก (B_EG) ตัดอายุงานออก (δT = 0 · DP1) เมื่อปรับอายุงาน ระบบแสดงผลแยกในการ์ด “การวิเคราะห์ความไว (B_FULL: รวมอายุงาน)” · ถ้าชั้นคำนวณ B_FULL ยังไม่พร้อม การ์ดจะแจ้ง “ยังไม่พร้อม”</li>
        <li>กรรมการครอบครัวและ political ties ไม่มีตัวปรับ — แสดงเป็นข้อมูลบริบทอ่านอย่างเดียว (R6) · ภาษา CEO ใช้ค่าจริงหรือค่าที่วัดจากไฟล์สาร CEO (.txt ≥ 2,000 คำ)</li>
        <li>ผลลัพธ์หลักคือ <b>Quartile ในอุตสาหกรรม</b> (Q1 = บนสุด 25% ของบริษัท-ปีในอุตสาหกรรมเดียวกันของ REF-928) คู่กับ Tier ทั้งฐานและช่อง 2×2 — เป็นการจำลองตำแหน่ง ไม่ใช่การพยากรณ์</li>
        <li>ตารางเปรียบเทียบการเปลี่ยนแปลงเรียงตามชื่อตัวแปร ไม่จัดอันดับและไม่ไฮไลต์ “ดีที่สุด”</li>
        <li>Basic ทดลอง 1 ตัวแปร (จำนวนกรรมการหญิง) · Pro ปลดล็อกรายบริษัท 1 เครดิต: 2 ตัวแปร + วัดภาษา CEO · Pro Max เพิ่มฉากทัศน์ขาลง (กรรมการหญิงลาออก · อายุงานเปลี่ยน)</li>
        <li>การคำนวณรายไตรมาสต้องใช้ข้อมูลรายไตรมาสซึ่งงานวิจัยยังไม่มี — เตรียมไว้สำหรับเฟสถัดไป</li></ul></section>
    <section class="card" id="man-uc"><h3>7 · มุมมอง Use Case</h3>
      <p class="desc">เลือกมุมมองที่หน้า Strategy Grid — เนื้อหาฐานชุดเดียวกัน แต่ถ้อยคำและผู้อ่านต่างกัน · ${esc(typeof PRIMARY_UC_NOTE !== "undefined" ? PRIMARY_UC_NOTE : "")}</p>
      <ul class="tr-ol">${(typeof USECASES !== "undefined" ? USECASES : []).map(u => `<li>${typeof PRIMARY_UC !== "undefined" && PRIMARY_UC.includes(u.id) ? "★ " : ""}<b>${esc(u.lab)}</b> — ผู้อ่าน: ${esc(u.audience)}</li>`).join("")}</ul>
      <p class="gx-sm">มุมมองธนาคาร (ลูกค้าสินเชื่อ / บอร์ดธนาคาร) ซ่อนชั้นจุดอ้างอิงตามแนวทาง Pilot · ตัวแปรบริบทอ่านอย่างเดียวในทุกมุมมอง</p></section>
    <section class="card" id="man-rules"><h3>8 · กติกาสำคัญ</h3>
      <ul class="tr-ol"><li><b>ไม่ใช่เชิงสาเหตุ</b> — ทุกตัวเลขเป็นความสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่การรับประกันผล</li>
        <li><b>ไม่ให้คะแนนบุคคล</b> — ผลเป็นระดับคณะ ห้ามใช้ประเมินหรือคัดเลือกกรรมการรายบุคคล (ข้อมูลอ่อนไหว พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล ม.26)</li>
        <li><b>political ties</b> — ข้อมูลบริบท ไม่ใช้เป็นเหตุผลเชิงบวก ไม่ใช่เป้าการสรรหา (R6)</li>
        <li><b>นอกกลุ่มอ้างอิง</b> — ธนาคาร/การเงิน ไม่แสดง tier เปอร์เซ็นไทล์ หรือตำแหน่งบน Grid (R4)</li>
        <li><b>ไม่แสดงค่าสัมประสิทธิ์</b> — สูตรและพารามิเตอร์เป็นความลับทางการค้า ประมวลผลหลังบ้านในระบบจริง</li></ul></section>
    <section class="card" id="man-pilot"><h3>9 · หน้า Pilot</h3>
      <ul class="tr-ol"><li><button class="lnk" data-goto="bod">BOD Self-Assessment (OI-1…6)</button> — ประเมินตนเองระดับคณะ · ผลนำไปใช้ใน {{ผลประเมิน BOD}} ของร่าง 56-1</li>
        <li><button class="lnk" data-goto="outdomain">โหมดนอกกลุ่มอ้างอิง (ธนาคาร)</button> — โปรไฟล์เชิงพรรณนาสำหรับบริษัทนอกฐาน</li>
        <li><button class="lnk" data-goto="directives">ข้อสั่งการบอร์ด / Compliance</button> — สิทธิ์ Pro Max</li>
        <li><button class="lnk" data-goto="survey">แบบสอบถามทดสอบการยอมรับ</button> · <button class="lnk" data-goto="syslog">System log</button> · <button class="lnk" data-goto="integr">การเชื่อมต่อ (Phase ถัดไป)</button></li></ul></section>
    <section class="card" id="man-assess"><h3>10 · RFQ · Dictionary ของผู้ใช้ · แบบประเมินตนเองของคณะกรรมการ</h3>
      <ul class="tr-ol"><li><button class="lnk" data-mango2="rfq">แบบประเมิน CEO Regulatory Focus (RFQ)</button> — แบบวัดตนเอง (self-report) ของ CEO · <b>เป็นแบบวัดแยก ไม่ถูกนำไปใช้ในคะแนน</b> ซึ่งวัดจากภาษาในสารถึงผู้ถือหุ้น · ผลสรุปใช้ในตัวแทน <code>{{ผล RFQ}}</code> ของร่าง 56-1 และใน Evidence Pack ได้ · ตารางสรุปคำตอบทุกชุด (α) แสดงเฉพาะผู้ดูแลระบบ หรือ Pro Max</li>
        <li><button class="lnk" data-mango2="dict">Dictionary ของผู้ใช้</button> — สร้างหรืออัปโหลดรายการคำเองเพื่อสำรวจข้อความ (ขอบเขตข้อ 2.3) · ไม่เปลี่ยนพจนานุกรมและสูตรที่ freeze แล้ว</li>
        <li><button class="lnk" data-mango2="bodset">แบบประเมินตนเองของคณะกรรมการ (SET)</button> — ผู้ใช้ทั่วไปตอบแบบประเมิน Board Evaluation · ผลระดับคณะเติมลงตัวแทน <code>{{ผลประเมิน BOD}}</code> และช่อง “สรุปผลการประเมินคณะกรรมการ” ของ Structured Data · ไม่ประเมินกรรมการรายบุคคล</li>
        <li>ทางเข้า: Zone A (การ์ด “ทำแบบประเมิน RFQ” และ “อัปโหลด Dictionary ของคุณเอง”) หรือเมนูด้านซ้าย</li></ul></section>
    <section class="card" id="man-data"><h3>11 · ชุดข้อมูล · Evidence Pack · Structured Data 56-1</h3>
      <ul class="tr-ol"><li><button class="lnk" data-mango2="datasets">ชุดข้อมูลและ Data Dictionary</button> — 3 ชุดข้อมูล (REF-928 ที่ freeze · ชุดให้คะแนนบริษัทจดทะเบียน · ข้อมูลที่ผู้ใช้กรอก) พร้อมนิยามตัวแปร DV / IV / MV / CV และหัวข้อที่มาใน 56-1 One Report ·
          “เพิ่มฟิลด์เอง” เก็บในเครื่อง และ<b>ยังไม่เข้าแบบจำลอง (Phase II)</b> · การดึงข้อมูลอัตโนมัติจาก SET / Smart Marketplace ยกเลิก — ใช้ข้อมูลที่เจ้าหน้าที่ตรวจและบันทึกเข้าคลังข้อมูลแล้ว</li>
        <li><button class="lnk" data-mango2="evidence">Evidence Pack</button> — รวมทุกอย่างที่แสดงสำหรับแฟ้มการตัดสินใจหนึ่งบริษัท: ข้อมูลกรณี ภาษา CEO บริบทบอร์ด คะแนนพร้อมช่วง 90% Tier/quadrant แถบสถานะ ป้าย กติกา R1–R8 และที่มาของข้อมูล · พิมพ์ / .md / JSON · สิทธิ์ Pro ขึ้นไป</li>
        <li>หน้า <button class="lnk" data-mango2="t561">ร่าง 56-1</button> มีแผง “Structured Data (สำหรับกรอกใน SETLink)” สำหรับส่วนที่ 2 ข้อ 7–8 (ส่งออก JSON / CSV) และแถบขั้นตอน SETLink: กรอก Structured Data → อัปโหลดรูปเล่ม (นอกระบบ) → ตรวจสอบและอนุมัติ → เผยแพร่ (ทำใน SETLink — ระบบนี้ไม่ส่งข้อมูลให้ SET) · รูปแบบฟิลด์สมมติ ตรวจกับแบบฟอร์มจริงก่อนใช้</li>
        <li>หน้า <button class="lnk" data-mango2="valid">Validity</button> แสดงตัวเลขตาม Table 3–5 ของงานวิจัย และ Marginal plot (Moderation Analysis) ของความชันตามสัดส่วนกรรมการหญิง/ครอบครัว</li></ul></section>
    <section class="card" id="man-rcpt"><h3>12 · การเติมเครดิตและใบเสร็จตัวอย่าง</h3>
      <ul class="tr-ol"><li>เลือกแพ็กเกจที่หน้า <button class="lnk" data-mango2="billing">เครดิตและแผน</button> → ยืนยันการชำระเงิน (จำลอง) ในหน้า → ระบบเติมเครดิตและออก<b>ใบเสร็จตัวอย่าง</b> (เลขที่ วันที่ แพ็กเกจ ยอดก่อนภาษี VAT 7% ยอดรวม อีเมลผู้ซื้อ)</li>
        <li>ดูและพิมพ์ใบเสร็จได้จากรายการ “ใบเสร็จตัวอย่าง” · ทุกฉบับมีลายน้ำ <b>“ตัวอย่าง — ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษีจริง”</b> · ระบบชำระเงินจริงเป็นเฟส 2 (Payment API)</li></ul></section>
    <section class="card" id="man-faq"><h3>13 · คำถามที่พบบ่อย</h3>
      ${MAN_FAQ.map(([q, a]) => `<details class="tr-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>
    ${manNewSecs()}
    </div></div>`;
}
function wireManual(h) {
  h.querySelectorAll("[data-mango]").forEach(b => b.onclick = () => { const t = h.querySelector("#" + b.dataset.mango); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
  /* ลิงก์ไปหน้าที่ลงทะเบียนในไฟล์อื่น — ตรวจตอนคลิก (หน้าอาจยังไม่มีในไฟล์ฉบับนี้) */
  h.querySelectorAll("[data-mango2]").forEach(b => b.onclick = () => { const v = b.dataset.mango2;
    if (typeof VIEWS[v] === "function" && $("#v-" + v)) go(v); else toast("หน้านี้ยังไม่พร้อมในไฟล์ฉบับนี้"); });
  if (S._manSec) {
    const id = S._manSec; S._manSec = null;
    setTimeout(() => { const t = h.querySelector("#" + id); if (t) { t.scrollIntoView({ behavior: "smooth", block: "start" }); t.classList.add("tr-flash"); setTimeout(() => t.classList.remove("tr-flash"), 1600); } }, 380);
  }
}
VIEWS.manual = viewManual;
WIRES2.manual = wireManual;

/* ---------------------------------------------------------------- 9 · เมนู และป้ายล็อก */
(() => {
  const bl = NAV.find(n => n.id === "billing"); if (bl) bl.lab = "เครดิตและแผนการใช้งาน";
  if (!NAV.some(n => n.id === "t561")) {
    const i = NAV.findIndex(n => n.id === "followup");
    const it = { id: "t561", g: 2, ico: "✎", lab: "ร่าง 56-1 · Template และการอนุมัติ" };
    if (i >= 0) NAV.splice(i + 1, 0, it); else NAV.push(it);
  }
  if (!NAV.some(n => n.id === "manual")) {
    const i = NAV.findIndex(n => n.g === 3);
    const it = { id: "manual", g: 3, ico: "?", lab: "คู่มือการใช้งาน" };
    if (i >= 0) NAV.splice(i, 0, it); else NAV.push(it);
  }
})();
const CO_LOCK_VIEWS = ["profile", "docs", "fit", "zonec", "matrix", "compass", "ic"];
function navBadge(id) {
  const r = tierRank(), see = canSeeCo(S.t);
  if (CO_LOCK_VIEWS.includes(id)) {
    if (!see) return r < 1 ? ["🔒", "lock"] : [PRICE.report + " เครดิต", "cost"];
    if (id === "fit") return r >= 2 ? null : S.freeCo === S.t ? ["Basic", "ok"] : ["เปิดแล้ว", "ok"];
    return null;
  }
  if (r >= 2 && ["peer", "studio", "sector", "t561", "directives"].includes(id)) return null;     // Pro Max · รวมใน Subscription
  if (id === "peer" || id === "studio") {
    if (r < 1) return ["Pro", "pro"];
    if (!see) return ["🔒", "lock"];
    return isUnlocked(id) ? ["เปิดแล้ว", "ok"] : [PRICE[id] + " เครดิต", "cost"];
  }
  if (id === "sector") return ["Pro Max", "max"];                                   // ภาพรวมทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง
  if (id === "t561") return r < 1 ? ["Pro", "pro"] : r < 2 ? ["ร่าง", "ok"] : ["+อนุมัติ", "ok"];
  if (id === "directives") return r < 2 ? ["Pro Max", "max"] : null;
  if (id === "port") return r < 1 ? ["Pro", "pro"] : r >= 2 ? null : isUnlocked("port") ? ["เปิดแล้ว", "ok"] : [PRICE.port + " เครดิต", "cost"];
  return null;
}
syncNavLocks = function () {
  $$(".nav button").forEach(b => {
    const id = b.dataset.v, tag = b.querySelector(".lockb");
    b.setAttribute("aria-current", id === S.view ? "page" : "false");
    if (!tag) return;
    const s = navBadge(id);
    tag.textContent = s ? s[0] : ""; tag.style.display = s ? "" : "none";
    tag.dataset.k = s ? s[1] : "";
  });
};
buildNav();

/* ---------------------------------------------------------------- 10 · หน้าเข้าสู่ระบบ — ตัวเลือก 3 ระดับ */
(() => {
  const pp = $("#planPick"); if (!pp) return;
  const set = (k, html) => { const l = pp.querySelector(`[data-plan="${k}"] div`); if (l) l.innerHTML = html; };
  set("free", `<b>Level 1 · Basic · ${PLAN_TOKENS.free} เครดิต</b><span>บริษัทของคุณบริษัทเดียว · รายงาน การวิเคราะห์ และทางเลือกสำหรับการพิจารณา · เมทริกซ์ 2×2 · Validity</span>`);
  set("pro", `<b>Level 2 · Pro (Pay-Per-Use) · ${PLAN_TOKENS.pro} เครดิต</b><span>เทียบตัวต่อตัวกับ 3 บริษัทในอุตสาหกรรมเดียวกัน · What-if 2 ตัวแปร · ปลดล็อกรายบริษัทด้วยเครดิต · ร่าง 56-1</span>`);
  if (!pp.querySelector('[data-plan="max"]')) {
    const l = document.createElement("label");
    l.className = "planopt"; l.dataset.plan = "max";
    l.innerHTML = `<input type="radio" name="plan" value="max"><div><b>Pro Max · Subscription (add-on จาก Pro) · ${PLAN_TOKENS.max} เครดิต</b>
      <span>ทุกบริษัท · เทียบทั้งอุตสาหกรรม + บริษัทคะแนนใกล้เคียง · ข้ามอุตสาหกรรม · ฉากทัศน์ขาลง · Email Approval</span></div>`;
    pp.appendChild(l);
  }
  $$("#planPick .planopt").forEach(l => l.onclick = () => { $$("#planPick .planopt").forEach(x => x.classList.remove("on")); l.classList.add("on"); });
  /* ข้อความเดิมบนหน้าเข้าสู่ระบบยังเป็นราคารอบก่อน (token ขั้นต่ำ 3) — ปรับให้ตรงหัวข้อ 5 */
  const g = $("#gate");
  /* แก้ไขครั้งที่ 2.3 — ไฟล์ออฟไลน์จำลองการล็อกอิน · เวอร์ชันเว็บ (เซิร์ฟเวอร์) ใช้ Google Sign-in จริง */
  if (g && !OIS_SRV) {
    const dv = g.querySelector(".divider"); if (dv) dv.textContent = "ไฟล์ออฟไลน์ · จำลองการล็อกอิน";
    const gb = $("#btnGoogle"); if (gb && !gb.querySelector(".mv-gsim")) gb.insertAdjacentHTML("beforeend", `<span class="mv-gsim">(จำลองในไฟล์ออฟไลน์)</span>`);
    const nt = [...g.querySelectorAll(".note")].find(n => /Google OAuth/.test(n.textContent));
    if (nt) nt.innerHTML = `ไฟล์ HTML ออฟไลน์นี้<b>จำลอง</b>การเข้าสู่ระบบด้วย Google · <b>ในเวอร์ชันเว็บ (เซิร์ฟเวอร์) ใช้ Google Sign-in จริง</b> (OAuth 2.0) และเก็บเฉพาะอีเมลกับรหัสผู้ใช้ ไม่เก็บรหัสผ่าน ·
      แพ็กเกจเครดิตเริ่มต้น 5 เครดิต 490 บาท · การชำระเงินในต้นแบบเป็นการจำลอง (ระบบชำระเงินจริงเป็นเฟส 2)`;
  }
  if (g && document.createTreeWalker) {
    const w = document.createTreeWalker(g, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      if (!/token/.test(n.nodeValue)) continue;
      n.nodeValue = n.nodeValue.replace(/การซื้อ token ขั้นต่ำ 3 token ต่อครั้ง/, "แพ็กเกจเครดิตเริ่มต้น 5 เครดิต 490 บาท · การชำระเงินในต้นแบบเป็นการจำลอง")
        .replace(/เติม token ด้วยมือได้ตลอด/, "เติมเครดิตด้วยมือได้ตลอด (จำลองการชำระเงิน)").replace(/token/g, "เครดิต");
    }
  }
})();

/* ---------------------------------------------------------------- 11 · หลังวาดทุกหน้า — ปุ่มสิทธิ์ และลิงก์ "?" ไปคู่มือ */
const _trRender = render;
render = function () {
  _trRender.apply(this, arguments);
  const host = $("#v-" + S.view); if (!host) return;
  host.querySelectorAll("[data-setplan]").forEach(b => b.onclick = () => { setPlan(b.dataset.setplan); render(); });
  host.querySelectorAll("[data-trco]").forEach(b => b.onclick = () => {
    const t = b.dataset.trco; if (!byT[t]) return;
    S.t = t; S.peers = []; S.wi = null;
    const sc = $("#selCo");
    if (sc && ![...sc.options].some(o => o.value === t)) { S.ind = "all"; if ($("#selInd")) $("#selInd").value = "all"; fillCompanies(); }
    if (sc) sc.value = t;
    save(); syncChrome(); render();
  });
  host.querySelectorAll("[data-trsec]").forEach(b => b.onclick = () => {
    const i = +b.dataset.trsec;
    if (spend("sector", String(i), IND[i])) { S.ind = String(i); if ($("#selInd")) $("#selInd").value = S.ind; fillCompanies(); save(); render(); }
  });
  const ph = host.querySelector(".pagehead");
  if (ph && S.view !== "manual" && !ph.querySelector(".tr-help")) {
    const a = document.createElement("button");
    a.className = "tr-help"; a.type = "button"; a.textContent = "?";
    a.title = "เปิดคู่มือส่วนที่เกี่ยวข้องกับหน้านี้"; a.setAttribute("aria-label", "คู่มือการใช้งานของหน้านี้");
    const sec = MAN_HELP[S.view] || "man-flow";
    a.onclick = () => { S._manSec = sec; go("manual"); };
    ph.appendChild(a);
  }
};

/* ---------------------------------------------------------------- 12 · เริ่มระบบ */
(() => {
  if (!S.user) return;
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null"), vw = o && o.vw;
    if (vw && VIEWS[vw] && S.view !== vw) { S.view = vw; $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + vw)); }
  } catch (e) { }
  syncChrome(); render();
})();

/* ---------------------------------------------------------------- 13 · คำแปลอังกฤษของข้อความใหม่ในรอบนี้ (แก้ไขรอบสุดท้าย)
   ข้อความคงที่ที่เพิ่ม/เปลี่ยนในไฟล์ของกลุ่มนี้ยังไม่อยู่ใน src/i18n/en.json — ลงทะเบียนผ่าน I18N.load ตอนเริ่มระบบ
   (ข้อความที่มีตัวเลขเปลี่ยนได้ใช้ b5T/T ในโค้ดแทน) */
const B5_EN = {
  "พอร์ตลงทุน · โหมดที่ประชุม (IC)": "Investment portfolio · committee mode (IC)",
  "โหมดที่ประชุมเฉพาะบริษัทตนเอง · พอร์ต ✕": "Committee mode for your own company · portfolio ✕",
  "พอร์ต: ปลดครั้งเดียว 3 เครดิต · เฉพาะบริษัทที่ดูได้ (ตนเอง + ที่ปลดล็อก)": "Portfolio: unlock once for 3 credits · only companies you can view (own + unlocked)",
  "ทุกบริษัท · รวมใน Subscription (ไม่ตัดเครดิต)": "All companies · included in the subscription (no credits charged)",
  "1 เครดิต ต่อ 1 รายงาน (บางเทมเพลตเป็นสิทธิ์ Pro Max)": "1 credit per report (some templates are Pro Max)",
  "รวมใน Subscription (ไม่ตัดเครดิต)": "Included in the subscription (no credits charged)",
  "พอร์ตลงทุน (Pro)": "Investment portfolio (Pro)",
  "ปลดครั้งเดียวต่อบัญชี · เฉพาะบริษัทที่ดูได้ · Basic ✕ · Pro Max ไม่ตัดเครดิต": "Unlock once per account · only companies you can view · Basic ✕ · Pro Max not charged",
  "ต่อ 1 รายงาน · Basic ✕ · Pro Max ไม่ตัดเครดิต": "Per report · Basic ✕ · Pro Max not charged",
  "AI Report Studio · สร้างรายงาน": "AI Report Studio · report generated",
  "รายการอื่น": "Other item",
  "What-if (กรรมการหญิง + อายุงาน)": "What-if (female directors + tenure)",
  "Basic · Pro · Pro Max โดยย่อ": "Basic · Pro · Pro Max at a glance",
  "พอร์ตลงทุน · โหมดที่ประชุม": "Portfolio · committee mode",
  "นำเข้าข้อมูลปีใหม่และการอนุมัติ": "New-year data upload and approval",
  "Validity · คำนวณใหม่เมื่อข้อมูลเปลี่ยน": "Validity · recomputed when data changes",
  "สลับภาษา ไทย / English": "Language switch (Thai / English)",
  "คะแนนยังไม่สูง · ช่องว่างตามสูตรมาก": "Lower score · large formula gap",
  "คะแนนสูง · ช่องว่างตามสูตรมาก": "Higher score · large formula gap",
  "คะแนนยังไม่สูง · ช่องว่างตามสูตรน้อย": "Lower score · small formula gap",
  "คะแนนสูง · ช่องว่างตามสูตรน้อย": "Higher score · small formula gap",
  "มุมซ้ายบนคือบริษัทที่คะแนนวันนี้ยังไม่สูงและมีช่องว่างตามสูตรมาก — เป็นการบรรยายตำแหน่ง ไม่ใช่ข้อเสนอให้ดำเนินการ": "Top-left = companies whose score is not yet high and whose formula gap is large — a description of position, not a proposal to act",
  "เส้นประคือค่ากลางของพอร์ตเอง ไม่ใช่ค่าคงที่": "dashed lines are the portfolio's own medians, not fixed values",
  "ดัชนีลำดับพิจารณา (สูงสุดในพอร์ต)": "Consideration-order index (highest in portfolio)",
  "ดัชนีรวมจากช่องว่างตามสูตร ภาษาผู้นำ และระยะห่างจากผู้นำกลุ่ม — เป็นการเรียงข้อมูล ไม่ใช่คำแนะนำ": "Composite of formula gap, CEO language and distance to the group leader — a sort key, not a recommendation",
  "ดัชนีรวมจากระยะห่างตามสูตร ภาษาผู้นำ และระยะห่างจากผู้นำในกลุ่ม — เป็นการเรียงข้อมูล ไม่ใช่คำแนะนำ": "Composite of formula gap, CEO language and distance to the group leader — a sort key, not a recommendation",
  "สีของแท่ง = ระดับความเสี่ยงเชิงโครงสร้าง · ความยาวแท่ง = ดัชนีลำดับพิจารณา (ไม่ใช่การจัดอันดับว่าบริษัทใดดีกว่า)": "Bar colour = structural risk level · bar length = consideration-order index (not a ranking of which company is better)",
  "ดัชนีลำดับพิจารณา": "Consideration-order index",
  "รูปแบบ": "Pattern",
  "กรรมการหญิง +10 จุด": "Female directors +10 pts",
  "กรรมการหญิง −10 จุด": "Female directors −10 pts",
  "นัดหารือกับบอร์ด": "Arrange a discussion with the board",
  "ยังไม่มีค่าจากเซิร์ฟเวอร์": "Not yet received from the server",
  "ประเด็นที่อาจพิจารณาก่อน": "Points that may be considered first",
};
(() => {
  const reg = () => { try { if (window.I18N && typeof window.I18N.load === "function") {
    const d = Object.assign({}, B5_EN); if (typeof MKT_TH === "function") d[MKT_TH()] = MKT_EN(); window.I18N.load(d); return true; } } catch (e) { } return false; };
  /* สคริปต์ชั้นแปล (v2_i18n.js) อยู่ในแท็กถัดไป — รอจน DOMContentLoaded แล้วลองซ้ำเป็นระยะจนพบ */
  let n = 0; const retry = () => { if (!reg() && ++n < 60) setTimeout(retry, 100); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retry); else retry();
})();
