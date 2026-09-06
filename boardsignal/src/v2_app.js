/* ============================================================================
   Board Signal — ต้นแบบ Web Application
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

/* ---------------------------------------------------------------- 1 · โมเดล */
const MEAN = DATA.means, BETA = DATA.betas, NEU = DATA.neutral;
const IND = DATA.ind, COMPS = DATA.comps;
const byT = Object.fromEntries(COMPS.map(c => [c.t, c]));

/** เปอร์เซ็นไทล์ของค่าหนึ่งในอาร์เรย์ที่เรียงแล้ว (0–100) */
function pctile(sortedArr, v) {
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; sortedArr[m] <= v ? lo = m + 1 : hi = m; }
  return Math.round(lo / sortedArr.length * 100);
}
/** Board Amplification = ผลของโครงสร้างบอร์ดต่อการขยายสัญญาณของ CEO */
function ampOf(fam, pol, fem, ten) {
  return BETA.promo
    + BETA.pXfam * (fam - MEAN.bod_family)
    + BETA.pXpol * (pol - MEAN.bod_politicalties)
    + BETA.pXfem * (fem - MEAN.bod_female)
    + BETA.pXten * (ten - MEAN.bod_tenure);
}
const REF_AMP = [...DATA.refAmp].sort((a, b) => a - b);
const REF_PROMO = [...DATA.refPromo].sort((a, b) => a - b);
const ampPct = a => pctile(REF_AMP, a);
const promoPct = p => pctile(REF_PROMO, p);
/** OI = ครึ่งหนึ่งของเปอร์เซ็นไทล์ CEO + ครึ่งหนึ่งของเปอร์เซ็นไทล์บอร์ด */
const ipiFrom = (dp, amp) => Math.round(.5 * dp + .5 * ampPct(amp));

const ZONES = {
  engine: { l: "Innovation Engine", th: "เครื่องยนต์นวัตกรรม", c: "var(--ok)", d: "CEO ใช้ภาษาเชิงรุกสูง และโครงสร้างบอร์ดช่วยขยายสัญญาณ — อยู่ในตำแหน่งที่เอื้อต่อ open innovation มากที่สุด" },
  constrained: { l: "Constrained Drive", th: "แรงขับถูกจำกัด", c: "var(--serious)", d: "CEO รุก แต่โครงสร้างบอร์ดไม่ขยายสัญญาณ — แรงผลักดันมีอยู่ แต่ติดที่กลไกกำกับดูแล" },
  primed: { l: "Primed Board", th: "บอร์ดพร้อม รอผู้นำ", c: "var(--s1)", d: "บอร์ดพร้อมขยายสัญญาณ แต่ CEO ยังไม่สื่อสารเชิงรุก — ศักยภาพยังไม่ถูกกระตุ้น" },
  dormant: { l: "Dormant", th: "สงบนิ่ง", c: "var(--crit)", d: "ทั้งภาษาผู้นำและโครงสร้างบอร์ดอยู่ต่ำกว่าค่าเฉลี่ยตลาด — สัญญาณนวัตกรรมยังไม่ก่อตัว" },
};
const zoneOf = (promo, amp) => promo >= NEU.promo
  ? (amp >= NEU.amp ? "engine" : "constrained")
  : (amp >= NEU.amp ? "primed" : "dormant");

const IPI_ALL = COMPS.map(c => c.ipi).sort((a, b) => a - b);
const qstats = arr => {
  const a = [...arr].sort((x, y) => x - y), q = p => {
    const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return a[lo] + (a[hi] - a[lo]) * (i - lo);
  };
  return { min: a[0], q1: q(.25), med: q(.5), q3: q(.75), max: a[a.length - 1] };
};
const indComps = i => COMPS.filter(c => c.ind === i);

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
  view: "fit",
};
const LS = "boardsignal_demo_v1";
function save() { try { localStorage.setItem(LS, JSON.stringify({ u: S.user, c: S.credits, f: S.freeCo, k: S.unlocked, s: S.sectors,
    l: S.log.slice(0, 40), m: document.body.dataset.mode,
    pl: S.plan, ov: S.ov, lg: S.lang, tn: S.tone, cs: S.cons, hz: S.horizon, pr: S.priority, vw: S.view })); } catch (e) { } }
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null"); if (!o) return null;
    Object.assign(S, { user: o.u, credits: o.c ?? 3, freeCo: o.f ?? null, unlocked: o.k || {}, sectors: o.s || {}, log: o.l || [],
      plan: o.pl || "free", ov: o.ov || {}, lang: o.lg || "EN", tone: o.tn || "search",
      cons: o.cs || { sizeFixed: true, fem30: false, fam25: false }, horizon: o.hz || "12m", priority: o.pr || "max",
      view: o.vw || "docs" });
    if (o.m) document.body.dataset.mode = o.m;
    return o.u;
  } catch (e) { return null; }
}
/** ค่า promotion focus ที่ตรงกับเปอร์เซ็นไทล์ — ใช้ย้อนกลับจากคะแนนภาษาเป็นค่าดิบ
 *  เพื่อให้แผนภาพน้ำตกกับคะแนนรวมมาจากชุดตัวเลขเดียวกันเสมอ */
function promoAtPct(dp) { const a = REF_PROMO, n = a.length; return a[clamp(Math.round(dp / 100 * n) - 1, 0, n - 1)]; }
const OV_FIELDS = ["fem", "fam", "pol", "ten", "dp"];
/** บริษัทที่กำลังดู — ผสมค่าที่ผู้ใช้แก้เองใน Zone A แล้วคิด amp / dp / OI ใหม่ทั้งชุด */
function coOf(t) {
  t = t || S.t;
  const b = byT[t], o = (S.ov || {})[t] || {};
  if (!OV_FIELDS.some(k => o[k] !== undefined)) return b;
  const m = Object.assign({}, b);
  ["fem", "fam", "pol", "ten"].forEach(k => { if (o[k] !== undefined) m[k] = o[k]; });
  const dp = o.dp !== undefined ? o.dp : b.dp;
  if (dp !== b.dp) m.promo = promoAtPct(dp);
  m.amp = ampOf(m.fam, m.pol, m.fem, m.ten);
  m.ap = ampPct(m.amp);
  m.dp = dp;
  m.ipi = Math.round(.5 * m.dp + .5 * m.ap);
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
  [1, 2, 3].forEach(g => {
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
    tag.textContent = ok ? "เปิดแล้ว" : (n.lock === "report" && !S.freeCo ? "ฟรี" : "🔒");
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
  $("#chipZone").innerHTML = `<span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span> ${z.l} · OI <b>${c.ipi}</b>`;
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
  { k: "tenInv", l: "บอร์ดอายุงานสั้น", f: c => -c.ten },
  { k: "promo", l: "ภาษาเชิงรุก CEO", f: c => c.promo },
];
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
function wireActions(root) {
  root.querySelectorAll("[data-unlock]").forEach(b => b.onclick = () => {
    const w = b.dataset.unlock;
    if (spend(w, w === "sector" ? S.ind : S.t, w === "sector" ? IND[S.ind] : cur().t)) render();
  });
  root.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => go(b.dataset.goto));
  root.querySelectorAll("[data-co]").forEach(b => b.onclick = () => {
    S.t = b.dataset.co; S.peers = []; $("#selCo").value = S.t; syncChrome(); go("fit");
  });
}

/* ============================================================================
   หน้า 1 · รายงานวินิจฉัย
   ============================================================================ */
function viewFit() {
  const c = cur(), z = ZONES[zoneOf(c.promo, c.amp)];
  const ist = DATA.indstats[c.ind], peers = indComps(c.ind).sort((a, b) => b.ipi - a.ipi);
  const rank = peers.findIndex(x => x.t === c.t) + 1;
  const indAvg = { fem: ist.fem, pol: ist.pol, fam: ist.fam, ten: ist.ten, promo: ist.promo };
  const medIPI = qstats(IPI_ALL).med;

  const body = `
  <div class="grid g-side">
    <div style="display:grid;gap:14px;align-content:start">
      <div class="card" style="text-align:center">
        <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">Innovation Propensity Index</div>
        ${gauge(c.ipi, "เปอร์เซ็นไทล์ในตลาด", medIPI)}
        <div style="display:inline-flex;align-items:center;gap:7px;margin-top:6px;padding:5px 13px;border-radius:99px;border:1px solid ${z.c};color:${z.c};font-size:12.5px">
          <span style="width:8px;height:8px;border-radius:99px;background:${z.c}"></span>${z.l}</div>
        <div style="font-size:10.5px;color:var(--ink-3);margin-top:7px">เส้นสีเทาบนเกจ = ค่ากลางตลาด (${fmt(medIPI)})</div>
        <div class="grid g3 tight" style="margin-top:15px;gap:8px;text-align:center">
          ${[[c.dp, "CEO Drive", "เปอร์เซ็นไทล์"], [ampPct(c.amp), "Board Amp", "เปอร์เซ็นไทล์"], ["#" + rank, "อันดับในอุตฯ", "จาก " + peers.length]]
      .map(([v, k, u]) => `<div><div style="font-size:21px;font-weight:500;letter-spacing:-.02em">${v}</div>
              <div style="font-size:10.5px;color:var(--ink-2);line-height:1.35">${k}</div>
              <div style="font-size:9.5px;color:var(--ink-3)">${u}</div></div>`).join("")}
        </div>
      </div>

      <div class="card">
        <h3>องค์ประกอบบอร์ด</h3>
        <p class="desc">แต่ละแกนปรับสเกลด้วยเปอร์เซ็นไทล์ 5–95 ของทั้งตลาด · ยิ่งออกนอกยิ่งเอื้อต่อการขยายสัญญาณ</p>
        ${radar(c, indAvg)}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
          ${[["กรรมการหญิง", pct1(c.fem), pct1(ist.fem), c.fem >= ist.fem],
      ["กรรมการครอบครัว", pct1(c.fam), pct1(ist.fam), c.fam <= ist.fam],
      ["สายการเมือง", c.pol ? "มี" : "ไม่มี", ist.pol >= .5 ? "ส่วนใหญ่มี" : "ส่วนใหญ่ไม่มี", !!c.pol],
      ["อายุงานเฉลี่ยบอร์ด", fmt(c.ten, 1) + " ปี", fmt(ist.ten, 1) + " ปี", c.ten <= ist.ten]]
      .map(([l, v, m, good]) => `<span class="pill ${good ? "ok" : "warn"}" style="font-size:10.5px">
              <span aria-hidden="true">${good ? "▲" : "▼"}</span>${l} ${v} <span style="opacity:.7">(อุตฯ ${m})</span></span>`).join("")}
        </div>
      </div>
    </div>

    <div style="display:grid;gap:14px;align-content:start">
      <div class="card">
        <h3><span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span>การวินิจฉัย · ${z.th}</h3>
        <p style="font-size:13.5px;color:var(--ink);margin:8px 0 15px;line-height:1.7">${z.d}</p>
        ${bars([
        { l: "CEO Innovation Drive", v: c.dp, t: c.dp + " / 100", c: rampAt(c.dp), hl: 1 },
        { l: "Board Amplification", v: ampPct(c.amp), t: ampPct(c.amp) + " / 100", c: rampAt(ampPct(c.amp)), hl: 1 },
      ], { lw: 175, h: 11 })}
        <div class="note brand" style="margin-top:13px">
          <b>OI = ครึ่ง CEO + ครึ่งบอร์ด</b> — ${c.dp} และ ${ampPct(c.amp)} เฉลี่ยกันได้ ${c.ipi}
          ตัวใดตัวหนึ่งต่ำจะฉุดคะแนนรวมลงเสมอ จึงต้องดูทั้งสองด้านคู่กัน</div>
      </div>

      <div class="card">
        <h3>ภาษาผู้นำ — Promotion Focus</h3>
        <p class="desc">สัดส่วนคำเชิงรุกในสารผู้บริหาร วัดด้วยพจนานุกรมแบบ LIWC · ยิ่งสูงยิ่งสื่อถึงการมองไปข้างหน้าและการแสวงหาโอกาส</p>
        <div class="grid g3 tight" style="gap:9px">
          ${[[fmt(c.promo, 2), "บริษัทนี้", "var(--ink)"], [fmt(ist.promo, 2), "ค่าเฉลี่ยอุตสาหกรรม", "var(--ink-2)"], [fmt(NEU.promo, 2), "ค่าเฉลี่ยตลาด", "var(--ink-2)"]]
      .map(([v, k, col]) => `<div class="stat" style="background:var(--panel-2);padding:11px 13px">
              <div class="v num" style="font-size:22px;color:${col}">${v}</div><div class="k" style="margin:2px 0 0">${k}</div></div>`).join("")}
        </div>
        <div style="margin-top:13px">${strip(c.dp, COMPS.map(x => x.dp))}</div>
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3)">
          <span>ต่ำสุดของตลาด</span><span>กล่องฟ้า = ครึ่งกลางของตลาด · จุด = บริษัทนี้</span><span>สูงสุด</span></div>
        <div class="note ${c.promo >= ist.promo ? "ok" : "warn"}" style="margin-top:12px">
          <b>${c.promo >= ist.promo ? "▲ สูงกว่า" : "▼ ต่ำกว่า"}ค่าเฉลี่ยอุตสาหกรรม ${fmt(Math.abs(c.promo - ist.promo), 2)}</b> ·
          อยู่ที่เปอร์เซ็นไทล์ ${c.dp} ของตลาด ${c.dp >= 75 ? "— ภาษาของผู้นำไม่ใช่คอขวด" : c.dp <= 40 ? "— นี่คือคานงัดครึ่งหนึ่งของคะแนนที่ยังไม่ได้ใช้" : ""}</div>
      </div>

      <div class="card">
        <h3>สิ่งที่ควรทำต่อ</h3>
        <p class="desc">คำนวณจากสัมประสิทธิ์ของโมเดล — เป็นฉากทัศน์เพื่อการออกแบบ ไม่ใช่การรับประกันผล</p>
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
       จะได้คะแนน OI ค่าองค์ประกอบบอร์ดเทียบอุตสาหกรรม และข้อเสนอแนะรายบริษัท`, PRICE.report,
      "สิทธิ์ฟรีใช้ไปแล้ว"));
}

/** ข้อเสนอแนะเชิงตัวเลข — เรียงตามผลกระทบต่อ OI */
function nextSteps(c) {
  const base = c.ipi, out = [];
  const mk = (lab, why, fam, pol, fem, ten, dp) => {
    const v = ipiFrom(dp ?? c.dp, ampOf(fam, pol, fem, ten));
    out.push({ lab, why, v, d: v - base });
  };
  mk("เพิ่มสัดส่วนกรรมการหญิง +10 จุด", "ตัวขยายสัญญาณที่แรงที่สุดในโมเดล (β = " + fmt(BETA.pXfem, 2) + " ต่อสัดส่วน 1.0)",
    c.fam, c.pol, clamp(c.fem + .1, 0, 1), c.ten);
  if (c.fam > .05) mk("ลดสัดส่วนกรรมการครอบครัว −10 จุด", "ครอบครัวในบอร์ดสัมพันธ์กับการลดทอนสัญญาณ (β = " + fmt(BETA.pXfam, 2) + ")",
    Math.max(0, c.fam - .1), c.pol, c.fem, c.ten);
  if (c.ten > 6) mk("ลดอายุงานเฉลี่ยบอร์ด −3 ปี", "บอร์ดที่อยู่นานสัมพันธ์กับการขยายสัญญาณที่ลดลงเล็กน้อย",
    c.fam, c.pol, c.fem, Math.max(0, c.ten - 3));
  if (!c.pol) mk("มีกรรมการที่มีเครือข่ายเชิงนโยบาย", "สัมพันธ์กับการเข้าถึงทรัพยากรและพันธมิตรภาครัฐ (β = " + fmt(BETA.pXpol, 2) + ")",
    c.fam, 1, c.fem, c.ten);
  if (c.dp < 85) mk("CEO ยกระดับภาษาเชิงรุก +15 เปอร์เซ็นไทล์", "เป็นคานงัดอีกครึ่งหนึ่งของ OI ที่ไม่ต้องแก้โครงสร้างบอร์ด",
    c.fam, c.pol, c.fem, c.ten, clamp(c.dp + 15, 0, 100));
  // ฉากทัศน์ขาลง — บอกด้วยว่าถ้าโครงสร้างถอยหลังจะเสียคะแนนเท่าไหร่
  mk("ถ้ากรรมการหญิงลดลง 10 จุด", "กรณีกรรมการหญิงครบวาระแล้วไม่ได้แทนที่ด้วยผู้หญิง",
    c.fam, c.pol, clamp(c.fem - .1, 0, 1), c.ten);
  mk("ถ้าบอร์ดชุดเดิมอยู่ต่ออีก 3 ปี", "อายุงานเฉลี่ยเพิ่มขึ้นโดยไม่ได้เติมกรรมการใหม่",
    c.fam, c.pol, c.fem, c.ten + 3);
  out.sort((a, b) => b.d - a.d);
  return out.slice(0, 5).map(o => `<div style="display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)">
    <div style="flex:1"><div style="font-size:12.8px;font-weight:400">${esc(o.lab)}</div>
      <div style="font-size:11px;color:var(--ink-3);line-height:1.5">${esc(o.why)}</div></div>
    <div class="pill ${o.d > 0 ? "ok" : "mute"}" style="white-space:nowrap;font-size:11px">
      ${o.d > 0 ? "▲ +" + o.d : o.d < 0 ? "▼ " + o.d : "±0"} → OI ${o.v}</div></div>`).join("");
}

function pageHead(eyebrow, title, sub) {
  return `<div class="pagehead"><div class="eyebrow">${esc(eyebrow)}</div>
    <h2>${esc(title)}</h2><p>${sub}</p></div>`;
}

/* ============================================================================
   หน้า 2 · เมทริกซ์กลยุทธ์ 2×2 พร้อมเส้นทางไปโซนเป้าหมาย
   ============================================================================ */
/** บริษัทที่อยู่ในโซนดีอยู่แล้ว — บอกว่า “เหลือระยะห่างจากขอบโซนเท่าไหร่” แทนที่จะปล่อยการ์ดว่าง */
function holdAnalysis(c) {
  const marginP = c.promo - NEU.promo, marginA = c.amp - NEU.amp;
  // หาว่าต้องเสียกรรมการหญิงกี่จุด หรือบอร์ดต้องอยู่นานอีกกี่ปี ถึงจะหลุดโซน
  const femDrop = marginA / BETA.pXfem * 100;              // จุดเปอร์เซ็นต์
  const tenAdd = marginA / -BETA.pXten;                     // ปี
  const famAdd = marginA / -BETA.pXfam * 100;
  const polLoss = c.pol ? ampOf(c.fam, 0, c.fem, c.ten) : null;
  const rows = [
    ["กรรมการหญิงลดลง", fmt(femDrop, 1) + " จุด", "กรรมการหญิงครบวาระแล้วแทนที่ด้วยผู้ชาย"],
    ["อายุงานเฉลี่ยบอร์ดเพิ่มขึ้น", fmt(tenAdd, 1) + " ปี", "บอร์ดชุดเดิมอยู่ต่อโดยไม่เติมคนใหม่"],
    ["กรรมการครอบครัวเพิ่มขึ้น", fmt(famAdd, 1) + " จุด", "ทายาทเข้ามานั่งในบอร์ดเพิ่ม"],
  ].filter(r => parseFloat(r[1]) > 0);
  return `<div class="note ok" style="margin-bottom:12px">
      <b>อยู่ในโซน Innovation Engine แล้ว</b> — โจทย์เปลี่ยนจาก “ไปให้ถึง” เป็น <b>“อยู่ให้ได้”</b>
      ตอนนี้ห่างจากเส้นแบ่งโซนอยู่ ${fmt(marginA, 2)} หน่วยในแกนบอร์ด และ ${fmt(marginP, 2)} ในแกนภาษาผู้นำ</div>
    <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:6px">จะหลุดโซนเมื่อเกิดสิ่งใดสิ่งหนึ่งต่อไปนี้</div>
    <div class="tw"><table><thead><tr><th>เหตุการณ์</th><th class="n">ทนได้ถึง</th><th>เกิดขึ้นได้อย่างไร</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r[0]}</td><td class="n"><b>${r[1]}</b></td><td style="color:var(--ink-2)">${r[2]}</td></tr>`).join("")}
      ${polLoss !== null && polLoss < NEU.amp ? `<tr><td>เสียกรรมการสายนโยบาย</td><td class="n"><b>ทันที</b></td>
        <td style="color:var(--crit)">หลุดโซนทันทีถ้าไม่มีคนแทน</td></tr>` : ""}
    </tbody></table></div>
    <button class="btn p" data-goto="studio" style="margin-top:13px">ทดสอบฉากทัศน์เหล่านี้ใน What-if</button>`;
}

function viewMatrix() {
  const c = cur();
  const pool = S.ind === "all" ? COMPS : indComps(+S.ind);
  const zk = zoneOf(c.promo, c.amp), z = ZONES[zk];

  // ขอบเขตแกน — เผื่อขอบ 6% เพื่อไม่ให้จุดติดกรอบ
  const px = pool.map(x => x.promo), ax = pool.map(x => x.amp);
  const xr = [Math.min(...px, c.promo), Math.max(...px, c.promo)];
  const yr = [Math.min(...ax, c.amp), Math.max(...ax, c.amp)];
  const padx = (xr[1] - xr[0]) * .06 || .1, pady = (yr[1] - yr[0]) * .06 || .1;
  const W = 760, H = 470, L = 52, R = 20, T = 22, B = 46;
  const X = v => L + (v - (xr[0] - padx)) / ((xr[1] + padx) - (xr[0] - padx)) * (W - L - R);
  const Y = v => H - B - (v - (yr[0] - pady)) / ((yr[1] + pady) - (yr[0] - pady)) * (H - T - B);
  const cx = X(NEU.promo), cy = Y(NEU.amp);

  // เป้าหมาย: ค่ามัธยฐานของกลุ่ม Innovation Engine ในอุตสาหกรรมเดียวกัน
  const eng = indComps(c.ind).filter(x => zoneOf(x.promo, x.amp) === "engine");
  const tgt = eng.length ? { promo: qstats(eng.map(x => x.promo)).med, amp: qstats(eng.map(x => x.amp)).med }
    : { promo: NEU.promo + .25, amp: NEU.amp + .35 };
  const tgtIPI = ipiFrom(promoPct(tgt.promo), tgt.amp);
  const needP = Math.max(0, tgt.promo - c.promo), needA = Math.max(0, tgt.amp - c.amp);
  const showPath = zk !== "engine" && eng.length > 0;

  const zoneRect = (x0, y0, x1, y1, key) => {
    const zz = ZONES[key];
    return `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}"
      fill="${zz.c}" fill-opacity="${key === zk ? .1 : .045}"/>`;
  };
  const dots = pool.filter(x => x.t !== c.t).map(x => {
    const k = zoneOf(x.promo, x.amp);
    return `<circle class="pt" cx="${X(x.promo).toFixed(1)}" cy="${Y(x.amp).toFixed(1)}" r="4.2"
      fill="${ZONES[k].c}" fill-opacity=".5" stroke="var(--panel)" stroke-width="1.2"
      data-t="${x.t}" data-n="${esc(x.n)}" data-i="${x.ipi}" data-z="${ZONES[k].l}" style="cursor:pointer"/>`;
  }).join("");

  const inner = `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:6px">
      <div><h3>ตำแหน่งบนเมทริกซ์</h3>
        <p class="desc" style="margin-bottom:0">แกนนอน = ภาษาเชิงรุกของ CEO · แกนตั้ง = ความสามารถของบอร์ดในการขยายสัญญาณ ·
          เส้นประ = ค่าเฉลี่ยตลาด · แสดง ${pool.length} บริษัท</p></div>
      <label style="font-size:11.5px;color:var(--ink-2);display:flex;align-items:center;gap:7px;white-space:nowrap">
        <input type="checkbox" id="mxPath" ${showPath ? "checked" : ""} ${showPath ? "" : "disabled"}> แสดงเส้นทางสู่เป้าหมาย</label>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" id="mxSvg" role="img" aria-label="เมทริกซ์ 2 คูณ 2">
      ${zoneRect(cx, T, W - R, cy, "engine")}
      ${zoneRect(cx, cy, W - R, H - B, "constrained")}
      ${zoneRect(L, T, cx, cy, "primed")}
      ${zoneRect(L, cy, cx, H - B, "dormant")}
      <line x1="${cx}" y1="${T}" x2="${cx}" y2="${H - B}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="5 4"/>
      <line x1="${L}" y1="${cy}" x2="${W - R}" y2="${cy}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="5 4"/>
      <text x="${cx + 9}" y="${T + 14}" font-size="11" font-weight="500" fill="var(--ok)">Innovation Engine</text>
      <text x="${cx - 9}" y="${T + 14}" font-size="11" font-weight="500" fill="var(--s1)" text-anchor="end">Primed Board</text>
      <text x="${cx + 9}" y="${H - B - 7}" font-size="11" font-weight="500" fill="var(--serious)">Constrained Drive</text>
      <text x="${cx - 9}" y="${H - B - 7}" font-size="11" font-weight="500" fill="var(--crit)" text-anchor="end">Dormant</text>
      ${dots}
      <g id="mxPathG" style="display:${showPath ? "" : "none"}">
        <line x1="${X(c.promo).toFixed(1)}" y1="${Y(c.amp).toFixed(1)}" x2="${X(tgt.promo).toFixed(1)}" y2="${Y(tgt.amp).toFixed(1)}"
          stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#ah)" opacity=".65"/>
        <g transform="translate(${X(tgt.promo).toFixed(1)},${Y(tgt.amp).toFixed(1)})">
          <circle r="9" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 3" opacity=".7"/>
          <circle r="3" fill="var(--ink)" opacity=".7"/></g>
        <text x="${X(tgt.promo).toFixed(1)}" y="${(Y(tgt.amp) - 16).toFixed(1)}" font-size="10.5" fill="var(--ink-2)" text-anchor="middle">
          เป้าหมาย · OI ${tgtIPI}</text>
      </g>
      <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 10 5 0 10z" fill="var(--ink)" opacity=".65"/></marker></defs>
      <g transform="translate(${X(c.promo).toFixed(1)},${Y(c.amp).toFixed(1)})">
        <path d="M0-9.5 9.5 0 0 9.5-9.5 0Z" fill="var(--panel)"/>
        <path d="M0-7 7 0 0 7-7 0Z" fill="var(--ink)"/></g>
      <text x="${(X(c.promo) + 14).toFixed(1)}" y="${(Y(c.amp) + 4).toFixed(1)}" font-size="12" font-weight="500" fill="var(--ink)">${esc(c.t)} · OI ${c.ipi}</text>
      <text x="${(L + (W - L - R) / 2).toFixed(0)}" y="${H - 10}" font-size="11" fill="var(--ink-2)" text-anchor="middle">CEO Innovation Drive — ภาษาเชิงรุก →</text>
      <text transform="translate(15,${(T + (H - T - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">Board Amplification →</text>
    </svg>
    <div class="legend">
      ${Object.entries(ZONES).map(([k, v]) => `<span><i style="background:${v.c};opacity:.55"></i>${v.l}</span>`).join("")}
      <span><i class="dia" style="background:var(--ink)"></i><b>${esc(c.t)}</b> — บริษัทที่เลือก</span>
      ${showPath ? `<span><i style="background:none;border:1.5px dashed var(--ink);border-radius:99px;width:10px;height:10px"></i>เป้าหมาย</span>` : ""}
    </div>
    <div style="font-size:10.8px;color:var(--ink-3);margin-top:7px">บริษัทที่เลือกใช้<b>รูปสี่เหลี่ยมข้าวหลามตัดสีเข้ม</b>ไม่ใช่สีที่ต่างออกไป
      เพื่อให้แยกออกได้แม้ผู้อ่านตาบอดสี · เลื่อนเมาส์บนจุดใดก็ได้เพื่อดูชื่อบริษัท คลิกเพื่อเปลี่ยนไปดูบริษัทนั้น</div>
  </div>`;

  const gapCard = `
  <div class="grid g-side-r" style="margin-top:14px">
    <div class="card">
      <h3>ต้องขยับเท่าไหร่ถึงจะไปถึงโซน Innovation Engine</h3>
      <p class="desc">เป้าหมายตั้งจากค่ากลางของบริษัทที่อยู่ในโซน Innovation Engine ในอุตสาหกรรมเดียวกัน
        (${eng.length} บริษัทจาก ${indComps(c.ind).length}) — ไม่ใช่ค่าที่ตั้งขึ้นเอง</p>
      ${zk === "engine"
      ? holdAnalysis(c)
      : `<div class="tw"><table><thead><tr><th>แกน</th><th class="n">ตอนนี้</th><th class="n">เป้าหมาย</th><th class="n">ส่วนต่าง</th><th>แปลว่า</th></tr></thead><tbody>
          <tr><td>ภาษาเชิงรุก CEO</td><td class="n">${fmt(c.promo, 2)}</td><td class="n">${fmt(tgt.promo, 2)}</td>
            <td class="n"><b>${needP > 0 ? "+" + fmt(needP, 2) : "ถึงแล้ว"}</b></td>
            <td style="color:var(--ink-2)">${needP > 0 ? `เพิ่มเปอร์เซ็นไทล์จาก ${c.dp} เป็น ${promoPct(tgt.promo)}` : "ไม่ต้องขยับ"}</td></tr>
          <tr><td>Board Amplification</td><td class="n">${fmt(c.amp, 2)}</td><td class="n">${fmt(tgt.amp, 2)}</td>
            <td class="n"><b>${needA > 0 ? "+" + fmt(needA, 2) : "ถึงแล้ว"}</b></td>
            <td style="color:var(--ink-2)">${needA > 0 ? `≈ เพิ่มกรรมการหญิง ${fmt(needA / BETA.pXfem * 100, 0)} จุด หรือปรับหลายตัวรวมกัน` : "ไม่ต้องขยับ"}</td></tr>
          <tr class="hl"><td><b>OI</b></td><td class="n"><b>${c.ipi}</b></td><td class="n"><b>${tgtIPI}</b></td>
            <td class="n"><b>+${tgtIPI - c.ipi}</b></td><td style="color:var(--ink-2)">คะแนนเป้าหมายที่ควรตั้งไว้</td></tr>
        </tbody></table></div>
        <button class="btn p" data-goto="studio" style="margin-top:13px">ลองปรับจริงใน What-if Studio</button>`}
    </div>
    <div class="card">
      <h3>สัดส่วนบริษัทในแต่ละโซน</h3>
      <p class="desc">${S.ind === "all" ? "ทั้งตลาด" : IND[S.ind]} · ${pool.length} บริษัท</p>
      ${bars(Object.entries(ZONES).map(([k, v]) => {
        const n = pool.filter(x => zoneOf(x.promo, x.amp) === k).length;
        return { l: v.l, v: n, t: n + " (" + fmt(n / pool.length * 100, 0) + "%)", c: v.c, hl: k === zk };
      }), { lw: 130 })}
      <div class="note" style="margin-top:12px">${esc(c.t)} อยู่ในกลุ่ม <b>${z.l}</b>
        ซึ่งมี ${pool.filter(x => zoneOf(x.promo, x.amp) === zk).length} บริษัทจาก ${pool.length} บริษัทในมุมมองนี้</div>
    </div>
  </div>`;

  return pageHead("เมทริกซ์กลยุทธ์", "เมทริกซ์นวัตกรรม 2×2",
    `จัดตำแหน่งบริษัทตามสองแกนที่โมเดลชี้ว่าสำคัญ แล้วบอกว่า<b>ต้องได้คะแนนเท่าไหร่</b>ถึงจะขยับไปอยู่กลุ่มเดียวกับผู้นำในอุตสาหกรรม`)
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
  { k: "ipi", l: "OI (ดัชนีรวม)", f: c => c.ipi, d: 0, hi: 1, big: 1 },
  { k: "dp", l: "CEO Drive (เปอร์เซ็นไทล์)", f: c => c.dp, d: 0, hi: 1 },
  { k: "ap", l: "Board Amplification (เปอร์เซ็นไทล์)", f: c => ampPct(c.amp), d: 0, hi: 1 },
  { k: "promo", l: "Promotion focus (ค่าดิบ)", f: c => c.promo, d: 2, hi: 1 },
  { k: "fem", l: "สัดส่วนกรรมการหญิง", f: c => c.fem * 100, d: 1, hi: 1, unit: "%" },
  { k: "fam", l: "สัดส่วนกรรมการครอบครัว", f: c => c.fam * 100, d: 1, hi: 0, unit: "%" },
  { k: "ten", l: "อายุงานเฉลี่ยบอร์ด", f: c => c.ten, d: 1, hi: 0, unit: " ปี" },
  { k: "pol", l: "กรรมการสายนโยบาย", f: c => c.pol, d: 0, hi: 1, bool: 1 },
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
    <p class="desc">แถบใต้ตัวเลขคือตำแหน่งเทียบกับทั้งตลาด · ค่าที่ดีที่สุดในแต่ละแถวมีเครื่องหมาย ✦ กำกับ
      (บางแถว “น้อยกว่าดีกว่า” ระบบคิดทิศทางให้แล้ว)</p>
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
        return `<tr${r.big ? ' class="hl"' : ""}><td>${r.l}${r.hi ? "" : ` <span class="pill mute" style="font-size:9.5px">น้อย = ดี</span>`}</td>
          ${vals.map((v, i) => {
          const isBest = Math.abs(v - best) < 1e-9;
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
      <h3>ตำแหน่ง OI ในการกระจายตัว</h3>
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
      <div class="u">${better.length ? better.map(p => p.t).join(" · ") + " มี OI สูงกว่า" : "ไม่มีคู่แข่งในกลุ่มนี้ที่คะแนนสูงกว่า"}</div></div>
    <div class="stat"><div class="k">ห่างจากผู้นำกลุ่มเทียบ</div><div class="v" style="color:${gap > 0 ? "var(--crit)" : "var(--ok)"}">${gap > 0 ? "−" + gap : "+" + Math.abs(gap)}</div>
      <div class="u">${esc(lead.t)} อยู่ที่ OI ${lead.ipi}</div></div>
    <div class="stat"><div class="k">ช่องว่างหลักอยู่ที่</div><div class="v" style="font-size:19px">${which}</div>
      <div class="u">ต่างกัน ${Math.abs(Math.abs(dGap) >= Math.abs(aGap) ? dGap : aGap)} เปอร์เซ็นไทล์</div></div>
  </div>
  <div class="note ${gap > 0 ? "warn" : "ok"}">
    ${gap > 0
      ? `<b>ถ้าจะไล่ให้ทัน ${esc(lead.t)} ต้องเพิ่ม OI อีก ${gap} คะแนน</b> — ช่องว่างส่วนใหญ่มาจาก${which}
         ${Math.abs(dGap) >= Math.abs(aGap)
        ? `(${esc(lead.t)} อยู่ที่เปอร์เซ็นไทล์ ${lead.dp} ส่วน ${esc(c.t)} อยู่ที่ ${c.dp}) — เป็นด้านที่ปรับได้เร็วกว่าเพราะไม่ต้องแก้โครงสร้างคณะกรรมการ`
        : `(${esc(lead.t)} อยู่ที่ ${ampPct(lead.amp)} ส่วน ${esc(c.t)} อยู่ที่ ${ampPct(c.amp)}) — ต้องแก้ที่องค์ประกอบบอร์ด ซึ่งใช้เวลาและต้องผ่านที่ประชุมผู้ถือหุ้น`}`
      : `<b>${esc(c.t)} นำคู่แข่งทุกรายในกลุ่มเทียบนี้</b> — คำถามที่ควรถามต่อคือรักษาตำแหน่งอย่างไร
         ลองในหน้า What-if ว่าถ้ากรรมการหมดวาระพร้อมกันหลายคน คะแนนจะตกไปเท่าไหร่`}
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
const WI_CTRL = [
  { k: "fem", l: "สัดส่วนกรรมการหญิง", min: 0, max: .7, step: .01, fmt: v => pct1(v), hint: "ตัวขยายสัญญาณที่แรงที่สุดในโมเดล" },
  { k: "fam", l: "สัดส่วนกรรมการครอบครัว", min: 0, max: .8, step: .01, fmt: v => pct1(v), hint: "สัมพันธ์กับการลดทอนสัญญาณ" },
  { k: "ten", l: "อายุงานเฉลี่ยของบอร์ด", min: 0, max: 25, step: .5, fmt: v => fmt(v, 1) + " ปี", hint: "ยิ่งนานยิ่งลดการขยายเล็กน้อย" },
];
function viewStudio() {
  const c = cur(), w = wiInit();
  const amp1 = ampOf(w.fam, w.pol, w.fem, w.ten), ipi1 = ipiFrom(w.dp, amp1);
  const d = ipi1 - c.ipi;
  const z0 = zoneOf(c.promo, c.amp), z1 = zoneOf(w.dp >= c.dp ? Math.max(c.promo, NEU.promo + .001) : c.promo, amp1);
  const zone1 = zoneOf(promoInv(w.dp), amp1);

  const inner = `
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card">
      <h3>① ภาษาผู้นำ — CEO Text Testing</h3>
      <p class="desc">วางสารจากประธาน/CEO หรืออัปโหลดรายงานประจำปี ระบบจะนับคำเชิงรุกและเชิงป้องกันในเบราว์เซอร์ของคุณเอง
        แล้วแปลงเป็นคะแนน CEO Drive · <b>ไฟล์ไม่ถูกส่งขึ้นเซิร์ฟเวอร์ใด</b></p>
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
          <span>CEO Drive (ปรับเองได้)</span><span class="num"><b>${w.dp}</b> / 100</span></div>
        <input type="range" id="slDp" min="0" max="100" step="1" value="${w.dp}" style="width:100%;accent-color:var(--brand)">
        <div style="font-size:10.5px;color:var(--ink-3)">ที่มาปัจจุบัน: ${esc(w.src)}</div>
      </div>
    </div>

    <div class="card">
      <h3>② องค์ประกอบคณะกรรมการ</h3>
      <p class="desc">เลื่อนเพื่อจำลองโครงสร้างบอร์ดชุดใหม่ · ตัวเลขที่ขยับมาจากสัมประสิทธิ์ปฏิสัมพันธ์ในโมเดล
        (หญิง ${fmt(BETA.pXfem, 2)} · การเมือง ${fmt(BETA.pXpol, 2)} · ครอบครัว ${fmt(BETA.pXfam, 2)} · อายุงาน ${fmt(BETA.pXten, 3)})</p>
      ${WI_CTRL.map(v => `<div style="margin-bottom:13px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span>${v.l} <span class="hlp" title="${esc(v.hint)}">ⓘ</span></span>
          <span class="num"><b>${v.fmt(w[v.k])}</b> <span style="color:var(--ink-3);font-size:10.5px">เดิม ${v.fmt(c[v.k])}</span></span></div>
        <input type="range" data-wi="${v.k}" min="${v.min}" max="${v.max}" step="${v.step}" value="${w[v.k]}" style="width:100%;accent-color:var(--brand)">
      </div>`).join("")}
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:12px">
        <span>มีกรรมการที่มีเครือข่ายเชิงนโยบาย</span>
        <span style="display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <button class="btn ${w.pol ? "g" : "p"}" data-pol="0" style="border-radius:0;padding:5px 14px;font-size:12px">ไม่มี</button>
          <button class="btn ${w.pol ? "p" : "g"}" data-pol="1" style="border-radius:0;padding:5px 14px;font-size:12px">มี</button></span>
      </div>
      <button class="btn s" id="btnWiReset" style="width:100%;justify-content:center">↺ กลับไปใช้โครงสร้างบอร์ดจริง</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3>ผลลัพธ์จำลอง</h3>
    <div class="grid g4 tight" style="gap:10px;margin:10px 0 14px">
      <div class="stat"><div class="k">OI ปัจจุบัน</div><div class="v num">${c.ipi}</div><div class="u">${ZONES[z0].l}</div></div>
      <div class="stat hero"><div class="k">OI จำลอง</div><div class="v num">${ipi1}</div><div class="u">${ZONES[zone1].l}</div></div>
      <div class="stat"><div class="k">เปลี่ยนแปลง</div>
        <div class="v num" style="color:${d > 0 ? "var(--ok)" : d < 0 ? "var(--crit)" : "var(--ink)"}">${d > 0 ? "+" : ""}${d}</div>
        <div class="u">${d > 0 ? "▲ ดีขึ้น" : d < 0 ? "▼ แย่ลง" : "เท่าเดิม"}</div></div>
      <div class="stat"><div class="k">ย้ายโซนหรือไม่</div>
        <div class="v" style="font-size:17px;color:${zone1 !== z0 ? "var(--ok)" : "var(--ink)"}">${zone1 !== z0 ? "ย้าย" : "อยู่โซนเดิม"}</div>
        <div class="u">${zone1 !== z0 ? ZONES[z0].l + " → " + ZONES[zone1].l : ZONES[z0].l}</div></div>
    </div>
    <div style="margin-bottom:6px;font-size:11.5px;color:var(--ink-3)">ตำแหน่งบนการกระจายตัวของทั้งตลาด</div>
    ${boxplot(IPI_ALL, ipi1, "OI · 196 บริษัท")}
    <div class="legend"><span><i class="dia" style="background:var(--ink)"></i>ค่าจำลอง ${ipi1}</span>
      <span style="color:var(--ink-3)">เดิม ${c.ipi}</span></div>
    ${bars([
      { l: "CEO Drive", v: w.dp, t: `${c.dp} → ${w.dp}`, c: rampAt(w.dp), hl: 1 },
      { l: "Board Amplification", v: ampPct(amp1), t: `${ampPct(c.amp)} → ${ampPct(amp1)}`, c: rampAt(ampPct(amp1)), hl: 1 },
    ], { lw: 175, h: 10, max: 100 })}
  </div>

  <div class="grid g-side-r">
    <div class="card">
      <h3>ชุดการปรับที่ให้ผลสูงสุด</h3>
      <p class="desc">คำนวณจากสถานะจำลองปัจจุบัน · เรียงตามผลกระทบต่อ OI</p>
      ${wiScenarios(c, w)}
    </div>
    <div class="card">
      <h3>Board Persona ที่ควรสรรหา</h3>
      <p class="desc">แปลผลจากสถานะจำลอง เป็นโจทย์การสรรหากรรมการ</p>
      ${persona(w, ipi1)}
    </div>
  </div>
  <div class="note warn" style="margin-top:14px">
    <b>อ่านอย่างซื่อตรง</b> — ตัวเลขที่ขยับมาจากสัมประสิทธิ์ของแบบจำลองเชิงสหสัมพันธ์ เป็น “ฉากทัศน์เพื่อการออกแบบบอร์ด”
    ไม่ใช่การรับประกันว่าปรับแล้วนวัตกรรมจะเพิ่มจริง · <b>ห้ามใช้ผลนี้ประเมินหรือคัดเลือกรายบุคคล</b>
    เพราะเพศและความเชื่อมโยงทางการเมืองเป็นข้อมูลอ่อนไหวตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 26</div>`;

  const head = pageHead("จำลองสถานการณ์", "What-if Studio",
    `ปรับได้ทั้งสองด้านพร้อมกัน — ภาษาของ CEO จากเอกสารจริง และองค์ประกอบคณะกรรมการ — แล้วดูว่า OI ขยับไปเท่าไหร่และย้ายโซนหรือไม่`);
  return head + (isUnlocked("studio") ? inner
    : paywall(inner, "studio", "What-if Studio",
      `ปลดล็อกการจำลองสำหรับ <b>${esc(c.t)}</b> — ปรับองค์ประกอบบอร์ดได้ไม่จำกัดครั้ง
       และอัปโหลดเอกสาร CEO เพื่อวัดคะแนนภาษาจริง`, PRICE.studio));
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
  mk("กรรมการหญิง +10 จุด", "คานงัดเดี่ยวที่แรงที่สุด", w.fam, w.pol, clamp(w.fem + .1, 0, 1), w.ten);
  mk("กรรมการครอบครัว −10 จุด", "ลดการถ่วงสัญญาณ", clamp(w.fam - .1, 0, 1), w.pol, w.fem, w.ten);
  mk("อายุงานเฉลี่ยบอร์ด −3 ปี", "เติมกรรมการใหม่แทนที่ผู้ครบวาระ", w.fam, w.pol, w.fem, Math.max(0, w.ten - 3));
  if (!w.pol) mk("เพิ่มกรรมการที่มีเครือข่ายเชิงนโยบาย", "เปิดทางเข้าถึงพันธมิตรภาครัฐ", w.fam, 1, w.fem, w.ten);
  mk("แพ็กเกจรวม: หญิง +10 · ครอบครัว −10", "ปรับสองด้านพร้อมกันในการสรรหารอบเดียว",
    clamp(w.fam - .1, 0, 1), w.pol, clamp(w.fem + .1, 0, 1), w.ten);
  if (w.dp < 85) mk("CEO ยกระดับภาษาเชิงรุก +15 เปอร์เซ็นไทล์", "ไม่ต้องแก้โครงสร้างบอร์ด ทำได้ในรอบสื่อสารถัดไป",
    w.fam, w.pol, w.fem, w.ten, clamp(w.dp + 15, 0, 100));
  out.sort((a, b) => b.d - a.d);
  if (!out.length) return `<div class="note">ทุกการปรับที่ทดสอบให้ผลเท่าเดิม</div>`;
  return out.slice(0, 5).map(o => `<div style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
    <span class="pill ${o.d > 0 ? "ok" : "crit"}" style="width:64px;justify-content:center;font-size:11px">${o.d > 0 ? "+" : ""}${o.d}</span>
    <div style="flex:1"><div style="font-size:12.6px">${esc(o.l)}</div>
      <div style="font-size:10.8px;color:var(--ink-3)">${esc(o.why)}</div></div>
    <div class="num" style="font-size:13px;color:var(--ink-2)">OI ${o.v}</div></div>`).join("");
}
function persona(w, ipi) {
  const want = [];
  if (w.fem < .3) want.push("กรรมการอิสระ<b>หญิง</b>ที่มีประสบการณ์สายเทคโนโลยีหรือการพัฒนาผลิตภัณฑ์");
  if (w.fam > .2) want.push("กรรมการอิสระ<b>นอกวงศ์ตระกูล</b> เพื่อถ่วงดุลอำนาจในการอนุมัติโครงการใหม่");
  if (w.ten > 12) want.push("กรรมการ<b>วาระใหม่</b>ที่เข้ามาทดแทนผู้ครบวาระ เพื่อลดอายุงานเฉลี่ยของบอร์ด");
  if (!w.pol) want.push("กรรมการที่มี<b>เครือข่ายเชิงนโยบาย</b>หรือประสบการณ์กับหน่วยงานกำกับดูแล");
  if (w.dp < 50) want.push("<b>ผู้นำที่สื่อสารวิสัยทัศน์นวัตกรรมได้ชัด</b> — คะแนนภาษายังต่ำกว่าครึ่งตลาด");
  if (!want.length) want.push("โครงสร้างปัจจุบันอยู่ในกลุ่มที่เอื้อต่อนวัตกรรมแล้ว — โจทย์คือ<b>รักษาสมดุล</b>เมื่อกรรมการครบวาระ");
  return `<div style="font-size:12.8px;line-height:1.85">
    ณ สถานะจำลองนี้ (OI ${ipi} · CEO Drive ${w.dp} · กรรมการหญิง ${pct1(w.fem)} · ครอบครัว ${pct1(w.fam)} · อายุงาน ${fmt(w.ten, 1)} ปี)
    โปรไฟล์กรรมการที่ควรสรรหาเพิ่มคือ</div>
    <ul style="margin:9px 0 0;padding-left:19px;font-size:12.5px;line-height:1.85;color:var(--ink-2)">
      ${want.map(x => `<li>${x}</li>`).join("")}</ul>
    <div class="note" style="margin-top:12px;font-size:10.8px">
      ข้อความนี้อธิบาย<b>คุณสมบัติเชิงโครงสร้าง</b>ที่โมเดลชี้ว่าสัมพันธ์กับผลลัพธ์ ไม่ใช่การชี้ตัวบุคคล
      และไม่ควรใช้เป็นเกณฑ์คัดเลือกผู้สมัครรายคน</div>`;
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
/** จุดยึดสำหรับแปลง “ความเอียงไปทางคำเชิงรุก” เป็นเปอร์เซ็นไทล์ CEO Drive
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
      <b>CEO Drive จากข้อความนี้ = ${r.dp} / 100</b> · ค่าจริงของ ${esc(c.t)} ที่วัดจากรายงานประจำปีคือ ${c.dp}
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
    <div class="stat"><div class="k">OI มัธยฐานของกลุ่ม</div><div class="v num">${fmt(st.med)}</div>
      <div class="u">ทั้งตลาด ${fmt(qstats(IPI_ALL).med)}</div></div>
    <div class="stat"><div class="k">อยู่โซน Innovation Engine</div><div class="v num" style="color:var(--ok)">${zc("engine")}</div>
      <div class="u">${fmt(zc("engine") / pool.length * 100, 0)}% ของกลุ่ม</div></div>
    <div class="stat"><div class="k">อยู่โซน Dormant</div><div class="v num" style="color:var(--crit)">${zc("dormant")}</div>
      <div class="u">${fmt(zc("dormant") / pool.length * 100, 0)}% ของกลุ่ม</div></div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <h3>ตารางจัดอันดับทั้งกลุ่ม</h3>
    <p class="desc">คลิกแถวใดก็ได้เพื่อเปิดรายงานของบริษัทนั้น · แถบใต้ OI คือตำแหน่งเทียบทั้งตลาด</p>
    <div class="tw" style="max-height:520px;overflow:auto"><table>
      <thead style="position:sticky;top:0;background:var(--panel);z-index:2"><tr>
        <th class="n">#</th><th>บริษัท</th><th>โซน</th><th class="n">OI</th>
        <th class="n">CEO Drive</th><th class="n">Board Amp</th><th class="n">กก.หญิง</th>
        <th class="n">ครอบครัว</th><th class="n">อายุงาน</th><th class="n">นวัตกรรมเปิด</th></tr></thead>
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
    <div class="card"><h3>การกระจายตัวของ OI ในกลุ่ม</h3>
      <p class="desc">เทียบกับทั้งตลาด — บอกว่าอุตสาหกรรมนี้โดยรวมนำหรือตาม</p>
      ${boxplot(pool.map(x => x.ipi), st.med, `${IND[i]} · n = ${pool.length}`)}
      ${boxplot(IPI_ALL, qstats(IPI_ALL).med, `ทั้งตลาด · n = ${COMPS.length}`)}
      <div class="note ${st.med >= qstats(IPI_ALL).med ? "ok" : "warn"}" style="margin-top:8px">
        มัธยฐานของกลุ่มนี้ ${fmt(st.med)} ${st.med >= qstats(IPI_ALL).med ? "สูงกว่า" : "ต่ำกว่า"}ทั้งตลาด (${fmt(qstats(IPI_ALL).med)})</div>
    </div>
    <div class="card"><h3>ค่ากลางองค์ประกอบบอร์ดของกลุ่ม</h3>
      <p class="desc">ใช้เป็นเกณฑ์อ้างอิงเวลาออกแบบบอร์ดของบริษัทในกลุ่มนี้</p>
      ${bars([
        { l: "สัดส่วนกรรมการหญิง", v: ist.fem * 100, t: pct1(ist.fem), c: "var(--s1)" },
        { l: "สัดส่วนกรรมการครอบครัว", v: ist.fam * 100, t: pct1(ist.fam), c: "var(--s2)" },
        { l: "มีกรรมการสายนโยบาย", v: ist.pol * 100, t: pct1(ist.pol), c: "var(--s3)" },
        { l: "อายุงานเฉลี่ยบอร์ด (ปี)", v: ist.ten * 4, t: fmt(ist.ten, 1) + " ปี", c: "var(--q4)" },
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
          <tr><td>What-if Studio</td><td class="n"><b>${PRICE.studio}</b></td><td style="color:var(--ink-2)">รวมการอัปโหลดเอกสาร CEO</td></tr>
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
    "ที่มาของตัวเลขทุกตัวในระบบ และลำดับการต่อยอด — จากไฟล์ผลสถิติที่รันแล้ว ไปสู่การอัปโหลดเอกสารเอง และการเชื่อม API ของตลาดหลักทรัพย์")
    + `<div class="card" style="margin-bottom:14px">
      <h3>ภาพรวมการไหลของข้อมูล</h3>
      <p class="desc">สีเข้ม = ทำแล้วในต้นแบบนี้ · เส้นประ = เฟสถัดไป</p>
      <svg viewBox="0 0 900 340" width="100%" role="img" aria-label="แผนภาพสถาปัตยกรรม">
        <defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 10 5 0 10z" fill="var(--ink-3)"/></marker></defs>
        <text x="10" y="16" font-size="10" fill="var(--ink-3)" letter-spacing="1">ต้นทาง</text>
        ${box(10, 26, 200, 96, "R / Stata", ["ฟิตโมเดลจากแผงข้อมูล 5 ปี", "ส่งออกสัมประสิทธิ์และค่าอ้างอิง", "ไม่ส่งข้อมูลรายบริษัทออก"], "color-mix(in srgb,var(--s1) 10%,var(--panel))", "var(--s1)")}
        ${box(10, 138, 200, 84, "อัปโหลดเอกสารเอง", ["ผู้ใช้วาง PDF รายงานประจำปี", "ระบบนับคำในเบราว์เซอร์"], "color-mix(in srgb,var(--s3) 10%,var(--panel))", "var(--s3)")}
        ${box(10, 238, 200, 84, "SET API · เฟส 2", ["ดึงรายงานประจำปีอัตโนมัติ", "อัปเดตคะแนนรายไตรมาส"], "var(--panel-2)", "var(--ink-3)")}
        ${arrow(212, 74, 296, 120)}${arrow(212, 180, 296, 160)}${arrow(212, 280, 296, 200, "")}
        ${box(298, 96, 210, 108, "ชั้นประมวลผล", ["คำนวณ CEO Drive และ Board Amp", "จัดเปอร์เซ็นไทล์เทียบตลาด", "รวมเป็นคะแนน OI 0–100"], "color-mix(in srgb,var(--brand) 9%,var(--panel))", "var(--brand)")}
        ${arrow(510, 150, 588, 90)}${arrow(510, 150, 588, 150)}${arrow(510, 150, 588, 214)}
        ${box(590, 44, 300, 84, "รายงานรายบริษัท", ["วินิจฉัย · เมทริกซ์ 2×2 · เทียบคู่แข่ง"], "var(--panel)", "var(--line)")}
        ${box(590, 140, 300, 66, "What-if และ Persona", ["จำลองบอร์ด · ตรวจข้อความ CEO"], "var(--panel)", "var(--line)")}
        ${box(590, 218, 300, 84, "ภาพรวมอุตสาหกรรม", ["ตารางจัดอันดับ · ส่งออก CSV", "คิดค่าบริการรายครั้งหรือตัด token"], "color-mix(in srgb,var(--accent) 12%,var(--panel))", "var(--accent)")}
      </svg>
    </div>

    <div class="grid g3" style="margin-bottom:14px">
      ${[["เฟส 1 · ทำแล้ว", "ok", [
      "ฐานข้อมูลหลักจากผลสถิติ R / Stata ที่คัดกรองแล้ว",
      "อัปโหลดรายงานประจำปีเองแล้วนับคำผ่าน NLP ในเบราว์เซอร์",
      "ล็อกอิน · token · ผนังจ่ายเงิน · ประวัติการใช้",
      "รายงานวินิจฉัย · เมทริกซ์ · เทียบคู่แข่ง · What-if"]],
    ["เฟส 2 · ถัดไป", "warn", [
      "เชื่อม Google OAuth 2.0 จริง และเก็บบัญชีผู้ใช้",
      "เชื่อมช่องทางชำระเงินไทย (พร้อมเพย์ / บัตร)",
      "API ดึงรายงานประจำปีจากตลาดหลักทรัพย์",
      "เก็บผลการจำลองของผู้ใช้ไว้ข้ามอุปกรณ์"]],
    ["นอกขอบเขต", "mute", [
      "การให้คะแนนรายบุคคล — ผิดหลัก PDPA มาตรา 26",
      "คำแนะนำการลงทุนหรือการซื้อขายหลักทรัพย์",
      "การรับประกันว่าปรับบอร์ดแล้วนวัตกรรมจะเพิ่ม",
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
      <div class="note" style="margin-top:12px"><b>สถานะปัจจุบัน</b> — ต้นแบบนี้ใช้ค่าที่ส่งออกมาแล้วจากแผงข้อมูล
        209 บริษัท 928 บริษัท-ปี (2562–2566) ประกอบด้วยสัมประสิทธิ์ปฏิสัมพันธ์ 4 ตัว ค่าเฉลี่ยสำหรับ mean-centering
        และเวกเตอร์อ้างอิง 196 ค่าสำหรับจัดเปอร์เซ็นไทล์</div>
    </div>`;
}

/* ============================================================================
   หน้า 8 · หลักฐานความแม่น
   ============================================================================ */
/** เกณฑ์ผ่าน 4 ข้อตามเอกสารแก้ไขครั้งที่ 1
 *  ผ่านครบ = Strong predictive diagnosis · ตกข้อใดข้อหนึ่ง = Use result with cautious พร้อมระบุเกณฑ์และเหตุผล */
function validity4() {
  const VY = DATA.validYear, a = VY.all, Y = VY.byYear, yrs = Object.entries(Y);
  const spOK = a.sp > 0 && yrs.every(([, r]) => r.sp > 0);
  const loyoOK = a.loyo > 0 && yrs.every(([, r]) => r.loyo > 0);
  const badSp = yrs.filter(([, r]) => r.sp <= 0).map(([y]) => +y + 543);
  const rows = [
    { k: "sp", n: "สหสัมพันธ์อันดับ (Spearman)", v: a.sp, d: 3, pass: spOK, rule: "> 0 และคงเส้นทุกปี",
      what: "คะแนนเรียงลำดับ OI จริงได้ไหม",
      why: `ค่ารวมทั้งแผงคือ ${fmt(a.sp, 3)} แต่ปี ${badSp.join(", ")} ไม่เป็นบวก การเรียงลำดับจึงไม่คงเส้นทุกปี ` +
        "ส่วนต่างคะแนนเล็กน้อยระหว่างสองบริษัทจึงไม่ถือเป็นหลักฐานว่าต่างกันจริง" },
    { k: "auc", n: "อำนาจจำแนก (AUC)", v: a.auc, d: 3, pass: a.auc > .5, rule: "> 0.50",
      what: "แยกบริษัท OI สูง (top tercile) จากที่เหลือได้ไหม", why: "การแยกกลุ่มจะไม่ต่างจากการเดาสุ่ม" },
    { k: "lift", n: "Decile lift", v: a.lift, d: 2, pass: a.lift > 1.5, rule: "> 1.5×",
      what: "OI เฉลี่ยกลุ่มคะแนนสูง หารด้วยกลุ่มต่ำ", why: "ระยะห่างเชิงปฏิบัติระหว่างกลุ่มบนกับกลุ่มล่างน้อยเกินกว่าจะใช้ตัดสินใจ" },
    { k: "loyo", n: "Leave-one-year-out (LOYO)", v: a.loyo, d: 3, pass: loyoOK, rule: "บวกทุกปี และ mean > 0",
      what: "fit 4 ปี แล้วทำนายปีที่เหลือ", why: "มีอย่างน้อยหนึ่งปีที่ผลนอกตัวอย่างไม่เป็นบวก ความสัมพันธ์จึงไม่ส่งต่อไปยังปีถัดไป" },
  ];
  const failed = rows.filter(r => !r.pass);
  return { rows, failed, strong: failed.length === 0, all: a, byYear: Y, thresh: VY.thresh };
}
/** remark สองระดับที่แนบไปกับรายงานทุกฉบับ */
function validRemark() {
  const v = validity4();
  return v.strong
    ? { k: "ok", l: "Strong predictive diagnosis", th: "ผลประเมินอ้างอิงได้ในระดับ Strong",
      d: "ผ่านเกณฑ์ทั้งสี่ข้อบนแผงข้อมูลรวม 928 บริษัท-ปี" }
    : { k: "warn", l: "Use result with cautious", th: "ใช้ผลอย่างระมัดระวัง",
      d: `ไม่ผ่าน ${v.failed.length} จาก 4 เกณฑ์ — ` +
        v.failed.map(f => `<b>${f.n}</b> (เกณฑ์ ${f.rule}) ${f.why}`).join(" · ") };
}
function viewValid() {
  const V = DATA.validity, VY = DATA.validYear, th = VY.thresh;
  const vv = validity4(), rm = validRemark();
  const yrs = Object.entries(VY.byYear);
  const dec = V.decileB, mxd = Math.max(...dec);
  const grade = (v, t) => v >= t[0] ? ["ผ่านเกณฑ์", "ok"] : v >= t[1] ? ["ควรระวัง", "warn"] : ["ไม่ผ่าน", "crit"];

  const yearTable = `<div class="card" style="margin-bottom:14px">
      <h3>ความแม่นรายปี — ปีไหนสัญญาณชัด ปีไหนหาย <span class="pill blue">สิทธิ์ Pro</span></h3>
      <p class="desc">สมการถดถอยเปลี่ยนตามข้อมูลปีต่อปี ตารางนี้จึงต้องอ่านคู่กับผลวิเคราะห์ STATA หลังทำ Moderation Analysis ทุกครั้ง</p>
      <div class="tw"><table><thead><tr><th>ปี</th><th class="n">n</th>
        <th class="n">สหสัมพันธ์อันดับ</th><th class="n">AUC</th><th class="n">Decile lift</th><th class="n">LOYO</th><th>สรุป</th></tr></thead><tbody>
        ${yrs.map(([y, v]) => {
    const ok = v.sp > 0 && v.auc > .5 && v.lift > 1.5 && v.loyo > 0;
    const mid = v.auc > .5;
    return `<tr${y === "2022" ? ' class="hl"' : ""}><td><b>${+y + 543}</b> <span style="color:var(--ink-3)">(${y})</span></td>
          <td class="n">${v.n}</td>
          <td class="n"><span style="color:${v.sp > 0 ? "var(--ink)" : "var(--crit)"}">${fmt(v.sp, 3)}</span></td>
          <td class="n">${fmt(v.auc, 3)}</td><td class="n">${fmt(v.lift, 2)}×</td><td class="n">${fmt(v.loyo, 3)}</td>
          <td><span class="pill ${ok ? "ok" : mid ? "warn" : "crit"}">${ok ? "✓ ผ่านครบ 4 ข้อ" : mid ? "⚠ ผ่านบางข้อ" : "✕ ไม่ผ่าน"}</span></td></tr>`;
  }).join("")}
        <tr class="hl"><td><b>รวมทุกปี</b></td><td class="n">${VY.all.n}</td>
          <td class="n"><b>${fmt(VY.all.sp, 3)}</b></td><td class="n"><b>${fmt(VY.all.auc, 3)}</b></td>
          <td class="n"><b>${fmt(VY.all.lift, 2)}×</b></td><td class="n"><b>${fmt(VY.all.loyo, 3)}</b></td>
          <td><span class="pill warn">⚠ Spearman ไม่คงเส้น</span></td></tr>
      </tbody></table></div>
      <div class="note crit" style="margin-top:12px">
        <b>ปี 2565 สัญญาณหายไปทั้งปี</b> — สหสัมพันธ์อันดับ −0.023 และ AUC 0.494 ซึ่งเท่ากับเดาสุ่ม
        นี่คือเหตุผลเดียวที่ทำให้เกณฑ์ Spearman ไม่ผ่าน และเป็นข้อที่ต้องพูดเองในที่ประชุม ไม่ควรรอให้ถูกถาม</div>
      <div class="tw" style="margin-top:14px"><table><thead><tr><th>ทดสอบ</th><th>แสดงอะไร</th><th>ถ้าตกแล้วกระทบอะไร</th></tr></thead><tbody>
        ${vv.rows.map(r => `<tr><td><b>${esc(r.n)}</b><br><span class="pill ${r.pass ? "ok" : "crit"}">${r.pass ? "ผ่าน" : "ไม่ผ่าน"}</span>
          <span style="color:var(--ink-3);font-size:10.6px"> เกณฑ์ ${esc(r.rule)}</span></td>
          <td>${esc(r.what)}</td><td style="color:${r.pass ? "var(--ink-3)" : "var(--ink-2)"}">${esc(r.why)}</td></tr>`).join("")}
      </tbody></table></div>
    </div>`;

  return pageHead("ระบบและหลักฐาน", "Validity — คะแนนนี้อ้างอิงได้แค่ไหน",
    "เกณฑ์สี่ข้อมาจากแผนตรวจสอบของโมเดลเอง · ผ่านครบสี่ข้อรายงานว่า Strong · ตกข้อใดข้อหนึ่งรายงานว่าใช้อย่างระมัดระวัง พร้อมระบุเกณฑ์ที่ตกและเหตุผล")
    + `<div class="note ${rm.k}" style="margin-bottom:14px;font-size:12.6px">
      <b style="font-size:14px">${esc(rm.l)}</b> · ${esc(rm.th)}<br>${rm.d}</div>

    <div class="grid g4 tight" style="gap:10px;margin-bottom:14px">
      ${vv.rows.map(r => `<div class="stat"><div class="k">${esc(r.n)}</div>
        <div class="v num">${fmt(r.v, r.d)}${r.k === "lift" ? "×" : ""}</div>
        <div class="u"><span class="pill ${r.pass ? "ok" : "crit"}">${r.pass ? "ผ่าน" : "ไม่ผ่าน"}</span>
          <span style="color:var(--ink-3)"> เกณฑ์ ${esc(r.rule)}</span></div></div>`).join("")}
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>ยิ่งคะแนนสูง กิจกรรมนวัตกรรมเปิดยิ่งมากจริงหรือไม่</h3>
      <p class="desc">แบ่งบริษัททั้งหมดเป็น 10 กลุ่มเท่า ๆ กันตามคะแนน แล้วดูค่าเฉลี่ยกิจกรรมนวัตกรรมเปิดจริงของแต่ละกลุ่ม
        ถ้าคะแนนใช้ได้ แท่งควรไต่ขึ้นจากซ้ายไปขวา</p>
      <div style="display:flex;align-items:flex-end;gap:6px;height:150px;margin:14px 0 6px">
        ${dec.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px">
          <div style="font-size:11px;color:var(--ink-2)" class="num">${fmt(v, 1)}</div>
          <div style="width:100%;height:${v / mxd * 108}px;background:${rampAt(i * 11)};border-radius:4px 4px 0 0"></div>
          <div style="font-size:9.5px;color:var(--ink-3)">${i + 1}</div></div>`).join("")}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3)">
        <span>← กลุ่มคะแนนต่ำสุด</span><span>กลุ่มที่ 1–10 ตามคะแนน</span><span>กลุ่มคะแนนสูงสุด →</span></div>
      <div class="note ok" style="margin-top:12px"><b>แนวโน้มไต่ขึ้นจริง</b> — กลุ่มบนสุดเฉลี่ย ${fmt(dec[9], 1)} เทียบกลุ่มล่างสุด ${fmt(dec[0], 1)}
        คิดเป็น ${fmt(V.lift, 2)} เท่า · แต่<b>ไม่ได้ไต่ขึ้นเป็นเส้นตรงทุกขั้น</b> ซึ่งเป็นเรื่องปกติของข้อมูลนับที่ผันผวนสูง</div>
    </div>

    ${S.plan === "pro" ? yearTable : `<div class="card" style="margin-bottom:14px">
      <h3>ความแม่นรายปี <span class="pill mute">🔒 สิทธิ์ Pro</span></h3>
      <p class="desc" style="margin-bottom:0">ผู้ใช้ฟรีเห็น remark สองระดับด้านบน ซึ่งเป็นสิ่งที่แนบไปกับรายงานทุกฉบับ ·
        ตารางรายปีและคำอธิบายผลกระทบของแต่ละเกณฑ์เป็นสิทธิ์ของผู้ใช้ Pro ที่ใช้ What-if Studio ได้
        <button class="lnk" data-pro="1">สลับผู้ใช้สาธิตเป็น Pro</button></p></div>`}

    <div class="card">
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
   ตัวประกอบหน้าจอ · การผูกเหตุการณ์ · เริ่มระบบ
   ============================================================================ */
const VIEWS = { fit: viewFit, matrix: viewMatrix, peer: viewPeer, studio: viewStudio, sector: viewSector, billing: viewBilling, arch: viewArch, valid: viewValid };
function render() {
  const host = $("#v-" + S.view);
  if (!host) return;
  host.innerHTML = VIEWS[S.view]();
  wireActions(host);
  ({ fit: wireFit, matrix: wireMatrix, peer: wirePeer, studio: wireStudio, sector: wireSector, billing: wireBilling }[S.view] || (() => { }))(host);
  syncChrome();
}
function wireFit(h) {
  const b = h.querySelector("#btnFree");
  if (b) b.onclick = () => { S.freeCo = S.t; save(); toast("ใช้สิทธิ์รายงานฟรีกับ " + S.t + " แล้ว"); render(); };
}
function wireMatrix(h) {
  const g = h.querySelector("#mxPathG"), cb = h.querySelector("#mxPath");
  if (cb && g) cb.onchange = () => g.style.display = cb.checked ? "" : "none";
  h.querySelectorAll(".pt").forEach(p => {
    tipOn(p, el => `<div class="tk">${el.dataset.z}</div><b>${el.dataset.t}</b> · ${el.dataset.n}<br>OI ${el.dataset.i} — คลิกเพื่อเปิดรายงาน`);
    p.onclick = () => { S.t = p.dataset.t; S.peers = []; S.wi = null; $("#selCo").value = S.t; render(); };
  });
}
function wirePeer(h) {
  const c = cur(), pool = indComps(c.ind).filter(x => x.t !== c.t).sort((a, b) => b.ipi - a.ipi);
  const box = h.querySelector("#peerPick");
  if (box) {
    box.innerHTML = [0, 1, 2].map(i => `<select class="sel" data-slot="${i}" style="font-size:12px;padding:5px 9px">
      <option value="">— ไม่เลือก —</option>
      ${pool.map(x => `<option value="${x.t}"${S.peers[i] === x.t ? " selected" : ""}>${esc(x.t)} · OI ${x.ipi}</option>`).join("")}</select>`).join("");
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
    a.download = `boardsignal_${IND[S.ind]}.csv`; a.click();
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
function enter(mail) {
  S.user = mail || $("#gMail").value.trim() || "guest@boardsignal.co";
  save();
  $("#gate").style.display = "none";
  $("#app").style.display = "";
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
  $("#selCo").onchange = e => { S.t = e.target.value; S.peers = []; S.wi = null; S.ceo = null; render(); };

  const u = load();
  syncChrome();
  if (u) { $("#gMail").value = u; enter(u); }
}
boot();
