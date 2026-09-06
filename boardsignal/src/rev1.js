/* ============================================================================
   PromoSignal DSS — Revision 1
   Workspace เดียว เรียงตามลำดับงานจริง  Upload → Insights → Recommendation
   ชั้นคำนวณทั้งหมดมาจาก boardsignal/src/app.js + invest.js (ตัดมาตอนบิลด์)
   ไฟล์นี้เป็นชั้นหน้าจอล้วน ไม่มีการนิยามสูตรใหม่
   ============================================================================ */

/* ---------------------------------------------------------------- สถานะ */
const S = {
  t: "PTG",
  role: "search",          // search | iod
  lang: "EN",              // ภาษาของข้อความ insight — อาจารย์ขอให้ EN มาก่อน
  plan: "free",            // free | pro
  tokens: 3,
  ownCo: null,             // บริษัทของผู้ใช้เอง ดูได้ฟรีตลอด
  unlocked: {},            // peer:PTG · national:PTG
  ov: {},                  // ค่าที่ผู้ใช้แก้เอง { PTG: { fem: .3 } }
  docs: [],                // เอกสารที่อัปโหลด
  ceo: null,               // { text, r } ผลวิเคราะห์ภาษา CEO จากเอกสารจริง
  peers: [],
  log: [],
};
const LS = "promosignal_rev1";
const PRICE = { report: 1, peer: 1, national: 3 };
const PACK_MIN = 3;
const PLAN_TOKENS = { free: 3, pro: 20 };

function save() {
  try {
    localStorage.setItem(LS, JSON.stringify({
      t: S.t, role: S.role, lang: S.lang, plan: S.plan, tokens: S.tokens, ownCo: S.ownCo,
      unlocked: S.unlocked, ov: S.ov, peers: S.peers, log: S.log.slice(0, 30),
    }));
  } catch (e) { }
}
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null");
    if (o) Object.assign(S, o);
  } catch (e) { }
}
function logIt(title, sub) {
  S.log.unshift({ title, sub, at: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) });
  S.log = S.log.slice(0, 30); save();
}

/* ---------------------------------------------------------------- บริษัทที่ใช้คำนวณ
   ผสมค่าที่ผู้ใช้แก้เองเข้ากับค่าจากฐานข้อมูล แล้วคิด amp / dp / ipi ใหม่ทั้งหมด
   ตัวเลขทุกจุดในหน้าจึงมาจากชุดเดียวกันเสมอ */
const FIELDS = ["fem", "fam", "pol", "ten", "dp"];
/** ค่า promotion focus ที่ตรงกับเปอร์เซ็นไทล์ที่กำหนด — ใช้ย้อนกลับจาก CEO Drive เป็นค่าดิบ
 *  เพื่อให้แผนภาพน้ำตกและคะแนนรวมมาจากชุดตัวเลขเดียวกันเสมอ */
function promoAtPct(dp) {
  const a = REF_PROMO, n = a.length;
  return a[clamp(Math.round(dp / 100 * n) - 1, 0, n - 1)];
}
function co(t) {
  t = t || S.t;
  const b = byT[t], o = S.ov[t] || {};
  const dirty = FIELDS.some(k => o[k] !== undefined) || (t === S.t && S.ceo);
  if (!dirty) return b;
  const m = Object.assign({}, b);
  ["fem", "fam", "pol", "ten"].forEach(k => { if (o[k] !== undefined) m[k] = o[k]; });
  const dp = o.dp !== undefined ? o.dp : (t === S.t && S.ceo) ? S.ceo.r.dp : b.dp;
  if (dp !== b.dp) m.promo = promoAtPct(dp);   // ย้อนค่าดิบให้ตรงกับเปอร์เซ็นไทล์
  m.amp = ampOf(m.fam, m.pol, m.fem, m.ten);
  m.ap = ampPct(m.amp);
  m.dp = dp;
  m.ipi = Math.round(.5 * m.dp + .5 * m.ap);
  m.edited = true;
  return m;
}
const isEdited = t => { const o = S.ov[t || S.t] || {}; return FIELDS.some(k => o[k] !== undefined); };
const setOv = (k, v) => { (S.ov[S.t] = S.ov[S.t] || {})[k] = v; save(); };
const clearOv = () => { delete S.ov[S.t]; S.ceo = null; save(); };

/* ---------------------------------------------------------------- token */
/** บริษัทของผู้ใช้เองดูรายงานหลักได้ฟรี · การเทียบคู่แข่งและรายงานอุตสาหกรรมใช้ token เสมอ */
const isUnlocked = (what, t) => (what === "report" && (t || S.t) === S.ownCo) || !!S.unlocked[what + ":" + (t || S.t)];
function spend(what, label) {
  const cost = PRICE[what];
  if (S.tokens < cost) { toast(`token ไม่พอ — เหลือ ${S.tokens} ต้องใช้ ${cost}`); return false; }
  S.tokens -= cost;
  S.unlocked[what + ":" + S.t] = true;
  logIt(label, `ใช้ ${cost} token · เหลือ ${S.tokens}`);
  save(); toast(`ปลดล็อกแล้ว · ใช้ ${cost} token · เหลือ ${S.tokens}`);
  return true;
}

/* ---------------------------------------------------------------- ตัวช่วยหน้าจอ */
let toastT;
function toast(msg) {
  let e = $("#toast");
  if (!e) { e = document.createElement("div"); e.id = "toast"; document.body.appendChild(e); }
  e.textContent = msg; e.style.opacity = "1";
  clearTimeout(toastT); toastT = setTimeout(() => { e.style.opacity = "0"; }, 2600);
}
const T = (en, th) => S.lang === "EN" ? en : th;
const pillOf = k => k === "crit" ? "crit" : k === "warn" ? "warn" : "ok";
const WF_SHORT = { promo: "ภาษา CEO", fem: "กรรมการหญิง", fam: "กรรมการครอบครัว", pol: "สายนโยบาย", ten: "อายุงานบอร์ด" };
const WF_EN = { promo: "CEO language", fem: "Female directors", fam: "Family directors", pol: "Political ties", ten: "Board tenure" };
const wfLab = k => S.lang === "EN" ? WF_EN[k] : WF_SHORT[k];

/* ---------------------------------------------------------------- ชั้นแปลภาษา
   ชั้นคำนวณคืนข้อความไทยเสมอ (ใช้ร่วมกับ Board Signal)  ตรงนี้แปลเฉพาะตอนแสดงผล
   ไม่มีการคิดเกณฑ์ใหม่ จึงไม่มีทางที่สองภาษาจะให้ผลต่างกัน */
const IND_EN = { 1: "Agro & Food", 2: "Technology", 3: "Resources", 4: "Services",
  5: "Industrials", 6: "Consumer Products", 7: "Property & Construction" };
const indL = i => S.lang === "EN" ? (IND_EN[i] || IND[i]) : IND[i];
const LEVEL_EN = { "สูง": "High", "ปานกลาง": "Moderate", "ต่ำ–ปานกลาง": "Low–moderate", "ต่ำ": "Low" };
const levelL = l => S.lang === "EN" ? (LEVEL_EN[l] || l) : l;
const REC_EN = {
  engage: ["Engage with the board",
    "The CEO is already assertive while board structure is the binding constraint — the case where a governance change pays off most clearly."],
  "watch-up": ["Watch and wait for the moment",
    "There is upside in board composition, but the CEO's language does not yet support it. Wait for a signal from management first."],
  caution: ["Proceed with caution",
    "There are structural red flags that should be checked before increasing exposure."],
  hold: ["Hold and monitor",
    "Already in the top group. What board change would add is not large enough to be the main reason to engage; the task is holding position as directors reach the end of their terms."],
  pass: ["Not the moment",
    "Neither the current score nor the remaining upside stands out against the other firms in the group."],
};
const recL = c => { const r = recommendation(c);
  return S.lang === "EN" && REC_EN[r.k] ? { k: r.k, c: r.c, l: REC_EN[r.k][0], d: REC_EN[r.k][1] } : r; };
/** ธงความเสี่ยง — ใช้เกณฑ์จากชั้นคำนวณเดิมทุกข้อ แปลเฉพาะข้อความ */
function flagsL(c) {
  const F = riskFlags(c);
  if (S.lang !== "EN") return F;
  const pool = indComps(c.ind);
  const med = k => qAt(pool.map(x => x[k]), .5);
  const EN = {
    "ผู้นำรุกแต่บอร์ดกระจุกในครอบครัว": ["Assertive CEO, family-concentrated board",
      `Family directors at ${pct1(c.fam)} put the firm in the top band of its industry while the CEO's language sits at percentile ${c.dp}. That combination is associated with inward-looking decisions and weak counterbalance.`],
    "กรรมการครอบครัวสูงกว่ากลุ่ม": ["Family directors above the industry group",
      `${pct1(c.fam)} against an industry median of ${pct1(med("fam"))}.`],
    "ความหลากหลายทางเพศต่ำ": ["Low gender diversity on the board",
      `Female directors at ${pct1(c.fem)} put the firm in the bottom band of its industry — the variable the model identifies as the strongest amplifier.`],
    "บอร์ดอยู่ในตำแหน่งนาน": ["Long-serving board",
      `Average tenure of ${fmt(c.ten, 1)} years is in the top band of the industry, which carries a risk of slower uptake of new agendas.`],
    "บอร์ดพร้อมแต่ผู้นำยังไม่ขยับ": ["The board is ready, the CEO has not moved",
      `Board structure sits at percentile ${ampPct(c.amp)} while the CEO's language is at ${c.dp}. The capacity is there but nothing is triggering it.`],
    "ไม่พบธงความเสี่ยงเชิงโครงสร้าง": ["No structural red flag",
      "Every variable sits inside the normal range for this industry — worth revisiting when directors reach the end of their terms."],
  };
  return F.map(f => EN[f.l] ? { lv: f.lv, l: EN[f.l][0], d: EN[f.l][1] } : f);
}

/** แผนภาพน้ำตก — ผลรวมทุกขั้นเท่ากับ IPI จริงเสมอ */
function wfSvg(c) {
  const w = waterfall(c);
  const cols = [{ l: T("Market median", "ค่ากลางตลาด"), from: 0, to: w.base, k: "base" }]
    .concat(w.steps.map(s => ({ l: wfLab(s.k), from: s.to - s.d, to: s.to, d: s.d, key: s.k,
      k: s.d > 0 ? "up" : s.d < 0 ? "dn" : "flat" })))
    .concat([{ l: esc(c.t), from: 0, to: w.total, k: "tot" }]);
  const W = 780, H = 268, L = 38, R = 12, Tp = 22, B = 68;
  const top = Math.max(100, ...cols.map(o => Math.max(o.from, o.to)));
  const Y = v => H - B - clamp(v, 0, top) / top * (H - Tp - B);
  const n = cols.length, slot = (W - L - R) / n, cw = Math.min(70, slot * .58);
  const CX = i => L + slot * (i + .5);
  const FILL = { base: "var(--ink-3)", tot: "var(--s1)", up: "var(--s3)", dn: "var(--s2)", flat: "var(--ink-3)" };
  const grid = [0, 25, 50, 75, 100].map(v =>
    `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - R}" y2="${Y(v).toFixed(1)}" stroke="var(--line-2)"/>
     <text x="${L - 6}" y="${(Y(v) + 3.4).toFixed(1)}" font-size="9" fill="var(--ink-3)" text-anchor="end">${v}</text>`).join("");
  const body = cols.map((o, i) => {
    const y0 = Y(Math.max(o.from, o.to)), y1 = Y(Math.min(o.from, o.to));
    const h = Math.max(2.5, y1 - y0), x = CX(i) - cw / 2;
    const lab = o.d === undefined ? fmt(o.to) : (o.d > 0 ? "+" + fmt(o.d) : o.d < 0 ? "−" + fmt(-o.d) : "±0");
    const link = i < n - 1 ? `<line x1="${(x + cw).toFixed(1)}" y1="${Y(o.to).toFixed(1)}" x2="${(CX(i + 1) - cw / 2).toFixed(1)}"
      y2="${Y(o.to).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3" opacity=".65"/>` : "";
    return `${link}<g>
      <rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"
        fill="${FILL[o.k]}" fill-opacity="${o.k === "flat" ? .45 : .88}"/>
      <text x="${CX(i).toFixed(1)}" y="${(y0 - 6).toFixed(1)}" font-size="11" font-weight="500" text-anchor="middle" fill="var(--ink)">${lab}</text>
      <text x="${CX(i).toFixed(1)}" y="${H - B + 16}" font-size="9.4" text-anchor="middle" fill="var(--ink-2)">${esc(o.l)}</text>
      ${o.d !== undefined ? `<text x="${CX(i).toFixed(1)}" y="${H - B + 29}" font-size="8.8" text-anchor="middle" fill="var(--ink-3)">→ ${fmt(o.to)}</text>` : ""}
    </g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${T("Score decomposition", "แผนภาพน้ำตกของคะแนน")}">
    ${grid}${body}
    <line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1.1"/>
  </svg>
  <div class="legend">
    <span><i style="background:var(--ink-3)"></i>${T("Start: a firm at the market median on every variable", "จุดตั้งต้น = บริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด")}</span>
    <span><i style="background:var(--s3)"></i>${T("Raises the score", "ตัวที่ดันคะแนนขึ้น")}</span>
    <span><i style="background:var(--s2)"></i>${T("Lowers the score", "ตัวที่ฉุดคะแนนลง")}</span>
    <span><i style="background:var(--s1)"></i>${T("Actual score", "คะแนนจริง")}</span></div>`;
}

/* ============================================================================
   Zone A · Document Intelligence
   อัปโหลดเอกสารแล้วดึงค่าออกมา — แก้ค่าเองได้ทุกช่อง และบอกที่มาของทุกตัวเลข
   ============================================================================ */
const EXTRACT = [
  { k: "fem", l: "Female BOD %", th: "สัดส่วนกรรมการหญิง", kind: "pct" },
  { k: "fam", l: "Family BOD %", th: "สัดส่วนกรรมการครอบครัว", kind: "pct" },
  { k: "pol", l: "Political ties", th: "กรรมการสายนโยบาย", kind: "bool" },
  { k: "ten", l: "Average tenure", th: "อายุงานเฉลี่ยของบอร์ด", kind: "yr" },
  { k: "dp", l: "CEO language (percentile)", th: "ภาษาผู้นำ (เปอร์เซ็นไทล์)", kind: "pctile" },
];
const CONF = {
  db: { k: "warn", en: "Database", th: "ฐานข้อมูล",
    den: "2019–2023 panel of 209 firms", dth: "แผงข้อมูล 209 บริษัท 2562–2566" },
  user: { k: "ok", en: "Manual", th: "ผู้ใช้กรอกเอง",
    den: "entered by the user", dth: "ผู้ใช้แก้ค่าเอง" },
  doc: { k: "ok", en: "Document", th: "จากเอกสาร",
    den: "counted from the uploaded file", dth: "นับจากไฟล์ที่อัปโหลดจริง" },
};
const confLab = c => S.lang === "EN" ? c.en : c.th;
const confDesc = c => S.lang === "EN" ? c.den : c.dth;

function confOf(k) {
  const o = S.ov[S.t] || {};
  if (o[k] !== undefined) return CONF.user;
  if (k === "dp" && S.ceo) return CONF.doc;
  return CONF.db;
}
const stepState = () => S.docs.length || S.ceo ? (isEdited() || S.ceo ? 2 : 1) : 0;

function zoneA() {
  const c = co(), st = stepState();
  const steps = [
    { n: 1, h: T("Upload documents", "อัปโหลดเอกสาร"), p: T("56-1 One Report, Annual Report, CEO letter or meeting transcript.", "56-1 One Report · รายงานประจำปี · สารจาก CEO หรือ transcript การประชุม") },
    { n: 2, h: T("Generate insights", "สรุปเป็นข้อค้นพบ"), p: T("The model scores the firm and explains what drives it, in plain language.", "โมเดลคิดคะแนนแล้วอธิบายว่าอะไรเป็นตัวขับ ด้วยภาษาที่ใช้ประชุมได้") },
    { n: 3, h: T("Recommend action", "เสนอสิ่งที่ควรทำ"), p: T("Ranked board-refresh options with the score impact of each.", "จัดลำดับข้อเสนอปรับบอร์ด พร้อมผลต่อคะแนนของแต่ละข้อ") },
  ];
  const flow = `<div class="flowbar">${steps.map((s, i) =>
    `<div class="fstep ${i < st ? "done" : i === st ? "on" : ""}">
      <div class="fn">${i < st ? "✓" : s.n}</div><h4>${esc(s.h)}</h4><p>${esc(s.p)}</p></div>`).join("")}</div>`;

  const rows = EXTRACT.map(f => {
    const cf = confOf(f.k), v = c[f.k], ed = (S.ov[S.t] || {})[f.k] !== undefined;
    const inp = f.kind === "bool"
      ? `<select class="inp ${ed ? "edited" : ""}" data-ex="${f.k}" style="width:100%">
           <option value="1"${v ? " selected" : ""}>${T("Yes", "มี")}</option>
           <option value="0"${v ? "" : " selected"}>${T("No", "ไม่มี")}</option></select>`
      : `<input class="inp ${ed ? "edited" : ""}" data-ex="${f.k}" type="number" inputmode="decimal"
           step="${f.kind === "pct" || f.kind === "yr" ? "0.1" : "1"}"
           min="0" max="${f.kind === "pct" || f.kind === "pctile" ? "100" : "40"}"
           value="${f.kind === "pct" ? fmt(v * 100, 1) : fmt(v, f.kind === "yr" ? 1 : 0)}">`;
    const sub = f.k === "dp"
      ? confDesc(cf) + " · promotion focus " + fmt(c.promo, 2)
      : confDesc(cf);
    return `<div class="ex">
      <div><div class="lb">${esc(S.lang === "EN" ? f.l : f.th)}</div>
        <div class="sub">${esc(sub)}</div></div>
      <div class="cf">${inp}</div>
      <div><span class="pill ${cf.k}">${esc(confLab(cf))}</span></div>
    </div>`;
  }).join("");

  const files = S.docs.length ? `<div class="files">${S.docs.map((d, i) => `<div class="file">
      <span class="pill ${d.st === "ok" ? "ok" : d.st === "warn" ? "warn" : "mute"}">${d.st === "ok" ? "Completed" : d.st === "warn" ? "Needs review" : "Processing"}</span>
      <span class="nm" title="${esc(d.name)}">${esc(d.name)}</span>
      <span style="color:var(--ink-3);font-size:11px;white-space:nowrap">${d.words ? fmt(d.words) + " " + T("words", "คำ") : ""}</span>
      <button class="btn s" data-rmdoc="${i}" style="padding:2px 8px;font-size:11px">✕</button></div>`).join("")}</div>` : "";

  const ev = S.ceo ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px">
      <span class="pill ok">${T("Forward-looking words", "คำเชิงรุก")} ${fmt(S.ceo.r.pro.n)}</span>
      <span class="pill warn">${T("Guarding words", "คำเชิงป้องกัน")} ${fmt(S.ceo.r.pre.n)}</span>
      <span class="pill mute">${T("Total words", "จำนวนคำ")} ${fmt(S.ceo.r.wc)}</span>
      <span class="pill blue">CEO Drive ${S.ceo.r.dp}</span>
    </div>
    <div class="ev">${highlight(S.ceo.text.slice(0, 2600), S.ceo.r)}</div>
    <div style="font-size:10.6px;color:var(--ink-3);margin-top:7px;line-height:1.6">
      ${T("Every counted word is highlighted in the source text so the number can be traced back.",
    "ทุกคำที่นับได้ถูกระบายสีในข้อความต้นทาง จึงตรวจย้อนกลับได้ว่าเลขมาจากไหน")} ·
      <span class="hi">${T("forward-looking", "เชิงรุก")}</span> · <span class="hi prev">${T("guarding", "เชิงป้องกัน")}</span></div>`
    : `<div class="note">${T("Upload a CEO letter or annual report and every counted word will be highlighted here, so the language score can be traced back to the source.",
      "อัปโหลดสารจาก CEO หรือรายงานประจำปี แล้วทุกคำที่ระบบนับได้จะถูกระบายสีไว้ตรงนี้ เพื่อให้ตรวจย้อนกลับได้ว่าคะแนนภาษามาจากข้อความตรงไหน")}</div>`;

  return `<section class="zone" id="zoneA">
    <div class="zhead">
      <div><div class="zcode">Zone A</div>
        <h2>${T("Document Intelligence", "อ่านข้อมูลจากเอกสาร")}</h2>
        <p>${T("Pull the board and CEO-language variables out of company documents, and let the user correct anything the system got wrong.",
    "ดึงตัวแปรของบอร์ดและภาษา CEO จากเอกสารบริษัท และให้ผู้ใช้แก้ค่าที่ระบบอ่านผิดได้ทุกช่อง")}</p></div>
    </div>
    ${flow}
    <div class="grid gside-l">
      <div class="card">
        <h3>${T("Upload", "อัปโหลดเอกสาร")}</h3>
        <p class="desc">${T("PDF or text · read in your browser only, never uploaded to a server.", "PDF หรือไฟล์ข้อความ · อ่านในเบราว์เซอร์เท่านั้น ไม่ถูกส่งออกไปที่เซิร์ฟเวอร์ใด")}</p>
        <div class="dz" id="dz" tabindex="0" role="button">
          <div class="ico">⬆</div>
          <div style="font-size:13px;margin-top:6px">${T("Drop a file here, or click to choose", "วางไฟล์ตรงนี้ หรือคลิกเพื่อเลือกไฟล์")}</div>
          <div style="font-size:11px;color:var(--ink-3)">56-1 One Report · Annual Report · CEO Letter · .pdf .txt</div>
        </div>
        <input type="file" id="fileIn" accept=".pdf,.txt,.md,.html" style="display:none">
        ${files}
        <div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">
          <button class="btn s" id="btnSample">${T("Use sample text", "ใช้ข้อความตัวอย่าง")}</button>
          ${(S.ceo || isEdited()) ? `<button class="btn s" id="btnReset">${T("Reset to database", "คืนค่าจากฐานข้อมูล")}</button>` : ""}
        </div>
      </div>
      <div style="display:grid;gap:14px;align-content:start">
        <div class="card">
          <h3>${T("Extracted data", "ข้อมูลที่ดึงได้")} ${isEdited() || S.ceo ? `<span class="pill blue">${T("edited", "แก้แล้ว")}</span>` : ""}</h3>
          <p class="desc">${T("Every field can be overridden by hand — the score below recalculates immediately.",
    "ทุกช่องแก้เองได้ คะแนนด้านล่างจะคำนวณใหม่ทันที")}</p>
          ${rows}
          <div class="note warn" style="margin-top:12px">
            <b>${T("What is honest about this prototype", "สิ่งที่ต้องบอกตามตรง")}</b> —
            ${T("CEO language is genuinely counted from the file you upload. Board composition is not yet read from the PDF; it is pre-filled from the 2019–2023 panel and is meant to be corrected by hand. Automatic board extraction is Phase II.",
      "ภาษา CEO นับจากไฟล์ที่อัปโหลดจริง ส่วนองค์ประกอบบอร์ดยังไม่ได้อ่านจาก PDF — ระบบเติมค่าจากแผงข้อมูล 2562–2566 มาให้ก่อนแล้วให้ผู้ใช้แก้เอง การอ่านบอร์ดอัตโนมัติเป็นงาน Phase II")}</div>
        </div>
        <div class="card">
          <h3>${T("Evidence", "หลักฐานที่มา")}</h3>
          <p class="desc">${T("Source highlighting for the CEO language score.", "การระบายสีต้นทางของคะแนนภาษา CEO")}</p>
          ${ev}
        </div>
      </div>
    </div>
  </section>`;
}

/* ============================================================================
   Zone B · Automated Insight Generator
   เปลี่ยนคะแนนของโมเดลเป็นประโยคที่ใช้ประชุมได้ — ทุกประโยคผูกกับตัวเลขจริง
   ============================================================================ */
/** ผลของการปรับตัวแปรเดียว โดยตรึงตัวแปรอื่นไว้ */
const lever = (c, k, v) => ipiAt(c, Object.assign(profOf(c), { [k]: v })) - c.ipi;

/** สี่ข้อค้นพบ สร้างจากตัวเลข ไม่ใช่ข้อความสำเร็จรูป */
function insights(c) {
  const w = waterfall(c), u = upsideOf(c), F = flagsL(c);
  const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
  const rank = pool.findIndex(x => x.t === c.t) + 1;
  const ist = DATA.indstats[c.ind];
  const best = w.steps.slice().sort((a, b) => b.d - a.d)[0];
  const worst = w.steps.slice().sort((a, b) => a.d - b.d)[0];
  const vy = DATA.validYear.all;
  const out = [];

  out.push({ kind: "strength", tag: T("Strength", "จุดแข็ง"),
    h: S.lang === "EN"
      ? `${WF_EN[best.k]} adds ${fmt(best.d)} points — the largest single contributor`
      : `${WF_SHORT[best.k]} เพิ่มคะแนน ${fmt(best.d)} จุด เป็นตัวได้ที่มากที่สุด`,
    p: S.lang === "EN"
      ? `Starting from a firm sitting at the market median on every variable (IPI ${fmt(w.base)}), ${c.t} reaches ${c.ipi}. CEO language sits at percentile ${c.dp} and board structure at ${ampPct(c.amp)}.`
      : `เริ่มจากบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด (IPI ${fmt(w.base)}) ${c.t} ขึ้นมาอยู่ที่ ${c.ipi} · ภาษาผู้นำอยู่ที่เปอร์เซ็นไทล์ ${c.dp} และโครงสร้างบอร์ดอยู่ที่ ${ampPct(c.amp)}` });

  out.push({ kind: "constraint", tag: T("Constraint", "ข้อจำกัด"),
    h: worst.d < 0
      ? (S.lang === "EN" ? `${WF_EN[worst.k]} costs ${fmt(-worst.d)} points` : `${WF_SHORT[worst.k]} ทำให้เสียคะแนน ${fmt(-worst.d)} จุด`)
      : (S.lang === "EN" ? `No single variable pulls the score down` : `ไม่มีตัวแปรใดฉุดคะแนนลง`),
    p: worst.d < 0
      ? (S.lang === "EN"
        ? `On this variable the firm is at ${worst.k === "ten" ? fmt(c.ten, 1) + " years" : worst.k === "pol" ? (c.pol ? "yes" : "no") : pct1(c[worst.k])} against an industry average of ${worst.k === "ten" ? fmt(ist.ten, 1) + " years" : worst.k === "pol" ? fmt(ist.pol * 100, 0) + "% of firms" : pct1(ist[worst.k])}.`
        : `ตัวแปรนี้บริษัทอยู่ที่ ${worst.k === "ten" ? fmt(c.ten, 1) + " ปี" : worst.k === "pol" ? (c.pol ? "มี" : "ไม่มี") : pct1(c[worst.k])} เทียบกับค่าเฉลี่ยอุตสาหกรรม ${worst.k === "ten" ? fmt(ist.ten, 1) + " ปี" : worst.k === "pol" ? fmt(ist.pol * 100, 0) + "% ของบริษัท" : pct1(ist[worst.k])}`)
      : (S.lang === "EN" ? `Every variable is at or above the market median, so the room left is in how far above.` : `ทุกตัวแปรอยู่ที่หรือสูงกว่าค่ากลางตลาด ที่เหลือจึงเป็นเรื่องระยะห่างจากผู้นำกลุ่ม`) });

  out.push({ kind: "opportunity", tag: T("Opportunity", "โอกาส"),
    h: u.delta > 0
      ? (S.lang === "EN" ? `Board refresh alone can move the score to ${fmt(u.best)} (+${fmt(u.delta)})` : `ปรับเฉพาะโครงสร้างบอร์ดก็ขยับคะแนนไปที่ ${fmt(u.best)} ได้ (+${fmt(u.delta)})`)
      : (S.lang === "EN" ? `Board structure already sits at the ceiling observed in this industry` : `โครงสร้างบอร์ดอยู่ที่เพดานเท่าที่พบจริงในอุตสาหกรรมนี้แล้ว`),
    p: u.delta > 0
      ? (S.lang === "EN"
        ? `The ceiling is not an ideal figure — it is the best value actually observed among the ${indComps(c.ind).length} firms in ${indL(c.ind)}: female directors at the 90th percentile, family directors and tenure at the 10th.`
        : `เพดานนี้ไม่ใช่ค่าอุดมคติ แต่เป็นค่าที่ดีที่สุดที่พบจริงใน ${indComps(c.ind).length} บริษัทของกลุ่ม${IND[c.ind]} — กรรมการหญิงที่เปอร์เซ็นไทล์ 90 กรรมการครอบครัวและอายุงานที่เปอร์เซ็นไทล์ 10`)
      : (S.lang === "EN" ? `Further gains would have to come from CEO communication rather than board composition.` : `ส่วนที่เพิ่มได้ต่อจากนี้ต้องมาจากการสื่อสารของผู้นำ ไม่ใช่องค์ประกอบบอร์ด`) });

  const rf = F.find(x => x.lv === "crit") || F.find(x => x.lv === "warn") || F[0];
  out.push({ kind: "risk", tag: T("Risk", "ข้อควรระวัง"),
    h: S.lang === "EN" ? (rf.lv === "ok" ? "No structural red flag, but read the score with its limits" : rf.l) : rf.l,
    p: S.lang === "EN"
      ? `${rf.d} · Model-wide the ranking holds only moderately (Spearman ${fmt(vy.sp, 3)}, AUC ${fmt(vy.auc, 2)}), and in 2022 the signal disappeared altogether.`
      : `${rf.d} · ในภาพรวมโมเดลเรียงลำดับได้เพียงระดับปานกลาง (Spearman ${fmt(vy.sp, 3)} · AUC ${fmt(vy.auc, 2)}) และปี 2565 สัญญาณหายไปทั้งปี` });
  return { list: out, rank, pool, w, u };
}

function zoneB() {
  const c = co(), I = insights(c), z = ZONES[zoneOf(c.promo, c.amp)];
  const e = engagement(c);
  const stats = [
    { k: "OI / IPI Score", v: c.ipi, u: T(`rank ${I.rank} of ${I.pool.length} in ${indL(c.ind)}`, `อันดับ ${I.rank} จาก ${I.pool.length} ใน${IND[c.ind]}`), hero: 1 },
    { k: "CEO Drive", v: c.dp, u: T("percentile of market", "เปอร์เซ็นไทล์ในตลาด") },
    { k: "Board Amplification", v: ampPct(c.amp), u: T("percentile of market", "เปอร์เซ็นไทล์ในตลาด") },
    { k: T("Engagement priority", "ลำดับการเข้าพบ"), v: e.score, u: T(`priority ${levelL(e.tier.l)}`, `ความสำคัญ${e.tier.l}`) },
  ];
  return `<section class="zone" id="zoneB">
    <div class="zhead">
      <div><div class="zcode">Zone B</div>
        <h2>${T("Automated Insight Generator", "สรุปเป็นข้อค้นพบอัตโนมัติ")}</h2>
        <p>${T("The model's numbers, rewritten as four statements a nomination committee can act on.",
    "แปลตัวเลขของโมเดลเป็นสี่ข้อความที่คณะกรรมการสรรหาใช้ตัดสินใจต่อได้")}</p></div>
      <div class="spacer"></div>
      <div class="seg" id="segLang" aria-label="${T("Language", "ภาษา")}">
        <button type="button" data-lang="EN" aria-selected="${S.lang === "EN"}">EN</button>
        <button type="button" data-lang="TH" aria-selected="${S.lang === "TH"}">TH</button></div>
    </div>

    <div class="grid g4" style="margin-bottom:14px">
      ${stats.map(s => `<div class="stat${s.hero ? " hero" : ""}"><div class="k">${esc(s.k)}</div>
        <div class="v num">${s.v}</div><div class="u">${esc(s.u)}</div></div>`).join("")}
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>${T("Where the score comes from", "คะแนนนี้มาจากไหน")}</h3>
      <p class="desc">${T("Each variable is switched from the market median to this firm's actual value, one at a time. The steps always add up to the real score.",
    "เปลี่ยนทีละตัวแปรจากค่ากลางตลาดเป็นค่าจริงของบริษัท ผลรวมของทุกขั้นเท่ากับคะแนนจริงเสมอ")} ·
        <span style="color:var(--ink-2)">${esc(z.l)}</span></p>
      ${wfSvg(c)}
    </div>

    <div class="insights">
      ${I.list.map(i => `<div class="ins ${i.kind}">
        <div class="tag">${esc(i.tag)}</div><h4>${esc(i.h)}</h4><p>${esc(i.p)}</p></div>`).join("")}
    </div>
  </section>`;
}

/* ============================================================================
   Zone C · Board Refresh Recommendation Engine
   ให้ข้อเสนอที่ทำต่อได้ ไม่ใช่แค่คะแนน — ผลกระทบทุกข้อคำนวณจากโมเดลเดิม
   ============================================================================ */
function levers(c) {
  const pool = indComps(c.ind), tgt = optimalBoard(c), out = [];
  const p90f = qAt(pool.map(x => x.fem), .9), p10a = qAt(pool.map(x => x.fam), .1), p10t = qAt(pool.map(x => x.ten), .1);
  if (tgt.fem > c.fem) {
    const d = lever(c, "fem", tgt.fem), pt = (tgt.fem - c.fem) * 100;
    out.push({ k: "fem", d,
      en: "Add independent female directors", th: "เพิ่มกรรมการอิสระหญิง",
      sen: `from ${pct1(c.fem)} to ${pct1(tgt.fem)} — the 90th percentile actually observed in ${indL(c.ind)}`,
      sth: `จาก ${pct1(c.fem)} เป็น ${pct1(tgt.fem)} — เปอร์เซ็นไทล์ 90 ที่พบจริงในกลุ่ม${IND[c.ind]}`,
      hard: pt <= 8 ? 1 : pt <= 16 ? 2 : 3,
      when_en: "Next nomination cycle", when_th: "รอบการสรรหาถัดไป" });
  }
  if (tgt.fam < c.fam) {
    const d = lever(c, "fam", tgt.fam), pt = (c.fam - tgt.fam) * 100;
    out.push({ k: "fam", d,
      en: "Reduce family-affiliated seats", th: "ลดสัดส่วนกรรมการที่ผูกกับครอบครัว",
      sen: `from ${pct1(c.fam)} to ${pct1(tgt.fam)} — the 10th percentile actually observed in the industry`,
      sth: `จาก ${pct1(c.fam)} เป็น ${pct1(tgt.fam)} — เปอร์เซ็นไทล์ 10 ที่พบจริงในอุตสาหกรรม`,
      hard: pt <= 10 ? 2 : 3,
      when_en: "Over two nomination cycles", when_th: "ทยอยใน 2 รอบการสรรหา" });
  }
  if (tgt.ten < c.ten) {
    const d = lever(c, "ten", tgt.ten), yr = c.ten - tgt.ten;
    out.push({ k: "ten", d,
      en: "Shorten average board tenure", th: "ลดอายุงานเฉลี่ยของบอร์ด",
      sen: `from ${fmt(c.ten, 1)} to ${fmt(tgt.ten, 1)} years by rotating long-serving seats`,
      sth: `จาก ${fmt(c.ten, 1)} ปี เหลือ ${fmt(tgt.ten, 1)} ปี ด้วยการหมุนเวียนกรรมการที่อยู่นาน`,
      hard: yr <= 2 ? 1 : yr <= 4 ? 2 : 3,
      when_en: "Next AGM / 12 months", when_th: "AGM ถัดไป ภายใน 12 เดือน" });
  }
  return out.sort((a, b) => b.d - a.d);
}
const HARD = { 1: { en: "Easy", th: "ทำได้เร็ว", k: "ok" }, 2: { en: "Moderate", th: "ปานกลาง", k: "warn" }, 3: { en: "Hard", th: "ต้องใช้เวลา", k: "crit" } };

function zoneC() {
  const c = co(), u = upsideOf(c), L = levers(c), rec = recL(c);
  const pool = indComps(c.ind);
  const bars = [
    { l: T("Female directors", "กรรมการหญิง"), now: c.fem * 100, tgt: u.target.fem * 100, unit: "%" },
    { l: T("Family directors", "กรรมการครอบครัว"), now: c.fam * 100, tgt: u.target.fam * 100, unit: "%" },
    { l: T("Board tenure", "อายุงานบอร์ด"), now: c.ten, tgt: u.target.ten, unit: T(" yr", " ปี") },
  ];
  const mx = k => Math.max(...bars.map(b => Math.max(b.now, b.tgt)), 1);
  const scale = { 0: Math.max(bars[0].now, bars[0].tgt, 40), 1: Math.max(bars[1].now, bars[1].tgt, 40), 2: Math.max(bars[2].now, bars[2].tgt, 15) };

  const cmp = bars.map((b, i) => {
    const same = Math.abs(b.now - b.tgt) < .05;
    return `<div class="cmprow"><span>${esc(b.l)}</span>
      <div class="tk"><div class="fl now" style="width:${clamp(b.now / scale[i] * 100, 2, 100).toFixed(1)}%"></div></div>
      <b class="n num">${fmt(b.now, 1)}${b.unit}</b></div>
    ${same ? `<div class="cmprow"><span></span>
        <div style="font-size:11px;color:var(--ok)">✓ ${T("already at the best value observed in this industry", "อยู่ที่ค่าที่ดีที่สุดของอุตสาหกรรมแล้ว")}</div>
        <b class="n num" style="color:var(--ink-3)">—</b></div>`
      : `<div class="cmprow"><span style="color:var(--ink-3);font-size:11.5px">${T("target", "เป้าหมาย")}</span>
        <div class="tk"><div class="fl" style="width:${clamp(b.tgt / scale[i] * 100, 2, 100).toFixed(1)}%"></div></div>
        <b class="n num" style="color:var(--brand)">${fmt(b.tgt, 1)}${b.unit}</b></div>`}`;
  }).join("");

  const recs = L.length ? L.map(x => `<div class="rec">
      <div><b>${esc(S.lang === "EN" ? x.en : x.th)}</b>
        <span>${esc(S.lang === "EN" ? x.sen : x.sth)} · ${esc(S.lang === "EN" ? x.when_en : x.when_th)}
          <span class="pill ${HARD[x.hard].k}" style="margin-left:4px">${esc(S.lang === "EN" ? HARD[x.hard].en : HARD[x.hard].th)}</span></span></div>
      <div class="imp">${x.d > 0 ? "+" + fmt(x.d) : fmt(x.d)}</div></div>`).join("")
    : `<div class="note ok">${T("Board composition is already at the best values observed in this industry — there is no structural lever left to pull.",
      "โครงสร้างบอร์ดอยู่ที่ค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมนี้แล้ว ไม่มีคันโยกเชิงโครงสร้างเหลือให้ปรับ")}</div>`;

  return `<section class="zone" id="zoneC">
    <div class="zhead">
      <div><div class="zcode">Zone C</div>
        <h2>${T("Board Refresh Recommendation", "ข้อเสนอปรับโครงสร้างบอร์ด")}</h2>
        <p>${T("Ranked by the score impact each change would produce, using the same coefficients as the report.",
    "จัดลำดับตามผลต่อคะแนนของแต่ละข้อ คำนวณจากสัมประสิทธิ์ชุดเดียวกับรายงาน")}</p></div>
    </div>
    <div class="grid gside">
      <div style="display:grid;gap:14px;align-content:start">
        <div class="card">
          <h3>${T("Ranked recommendations", "ข้อเสนอเรียงตามผล")}</h3>
          <p class="desc">${T("Each impact is the effect of that change alone, holding everything else fixed.",
    "ตัวเลขคือผลของการปรับข้อนั้นข้อเดียว โดยตรึงตัวแปรอื่นไว้")}</p>
          <div style="display:grid;gap:8px">${recs}</div>
          ${L.length > 1 ? `<div style="font-size:10.7px;color:var(--ink-3);margin-top:9px;line-height:1.6">
            ${T(`The individual impacts do not add up to the ${fmt(u.delta)}-point ceiling: percentiles are not linear, so applying all the changes together is worth less than the sum of the parts.`,
      `ผลของแต่ละข้อรวมกันแล้วไม่เท่ากับเพดาน ${fmt(u.delta)} จุด เพราะเปอร์เซ็นไทล์ไม่ใช่ฟังก์ชันเชิงเส้น การปรับพร้อมกันจึงได้น้อยกว่าผลรวมของแต่ละข้อ`)}</div>` : ""}
          <div class="note warn" style="margin-top:12px">
            <b>${T("Do not target political ties", "ไม่ตั้งกรรมการสายนโยบายเป็นเป้าหมาย")}</b> —
            ${T("The coefficient is positive (β = +0.48) but the system deliberately excludes it from the recommendation set: it is not a legitimate criterion for selecting directors, and using it that way would turn a diagnostic into a screening rule.",
      "สัมประสิทธิ์เป็นบวก (β = +0.48) แต่ระบบตัดออกจากชุดข้อเสนอโดยตั้งใจ เพราะไม่ใช่เกณฑ์ที่ควรใช้คัดเลือกกรรมการ และการใช้แบบนั้นจะเปลี่ยนเครื่องมือวินิจฉัยให้กลายเป็นเกณฑ์กลั่นกรองคน")}</div>
        </div>
        <div class="card">
          <h3>${T("Current vs best observed in industry", "ปัจจุบันเทียบกับค่าที่ดีที่สุดในอุตสาหกรรม")}</h3>
          <p class="desc">${T(`Reference group: ${pool.length} firms in ${indL(c.ind)}. The target is an observed value, not an ideal.`,
    `กลุ่มอ้างอิง ${pool.length} บริษัทในกลุ่ม${IND[c.ind]} · เป้าหมายเป็นค่าที่พบจริง ไม่ใช่ค่าอุดมคติ`)}</p>
          <div class="cmp">${cmp}</div>
        </div>
      </div>
      <div style="display:grid;gap:14px;align-content:start">
        <div class="scn">
          <small>${T("Scenario impact", "ผลของฉากทัศน์")}</small>
          <div class="big">${c.ipi} → ${fmt(u.best)}</div>
          <p>${u.delta > 0
      ? T(`Applying every board lever above lifts the score by ${fmt(u.delta)} points. CEO language is left untouched.`,
        `ใช้ทุกคันโยกด้านบนพร้อมกันจะเพิ่มคะแนน ${fmt(u.delta)} จุด โดยไม่แตะภาษาผู้นำ`)
      : T("Board composition is already at the industry ceiling.", "โครงสร้างบอร์ดอยู่ที่เพดานของอุตสาหกรรมแล้ว")}</p>
          <div style="display:flex;gap:6px;align-items:flex-end;height:74px;margin-top:14px">
            ${(() => { const w = waterfall(c); let acc = w.base;
      return [{ v: w.base, c: "rgba(255,255,255,.3)" }].concat(w.steps.map(s => { acc += s.d; return { v: acc, c: s.d < 0 ? "var(--s2)" : "rgba(23,179,135,.85)" }; })).concat([{ v: u.best, c: "var(--s3)" }])
        .map(b => `<i style="flex:1;display:block;border-radius:5px 5px 2px 2px;background:${b.c};height:${clamp(b.v, 4, 100)}%"></i>`).join(""); })()}
          </div>
          <div style="font-size:10.4px;color:#9fb6cc;margin-top:6px">${T("median → each board variable → ceiling", "ค่ากลาง → ทีละตัวแปร → เพดาน")}</div>
        </div>
        <div class="card">
          <h3>${T("What the system suggests", "ข้อเสนอของระบบ")}</h3>
          <div class="note brand" style="margin-top:4px"><b style="color:${rec.c}">${esc(rec.l)}</b> — ${esc(rec.d)}</div>
          <div style="display:grid;gap:8px;margin-top:12px">
            <button class="btn p lg" id="btnBrief">${T("Generate Candidate Brief", "สร้างโจทย์การสรรหากรรมการ")}</button>
            <button class="btn" id="btnMemo">${T("Export Board Memo", "ออกบันทึกวาระประชุม")}</button>
            <button class="btn s" id="btnSaveScn">${T("Save scenario", "บันทึกฉากทัศน์")}</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/* ============================================================================
   เทียบคู่แข่ง และรายงานระดับอุตสาหกรรม — สองส่วนที่ใช้ token
   ============================================================================ */
const CMP_ROWS = [
  { l: "OI / IPI", th: "OI / IPI", f: c => c.ipi, hi: 1, big: 1 },
  { l: "CEO Drive", th: "CEO Drive", f: c => c.dp, hi: 1 },
  { l: "Board Amplification", th: "Board Amplification", f: c => ampPct(c.amp), hi: 1 },
  { l: "Female directors", th: "กรรมการหญิง", f: c => c.fem * 100, hi: 1, d: 1, u: "%" },
  { l: "Family directors", th: "กรรมการครอบครัว", f: c => c.fam * 100, hi: 0, d: 1, u: "%" },
  { l: "Board tenure", th: "อายุงานเฉลี่ยบอร์ด", f: c => c.ten, hi: 0, d: 1, uen: " yr", u: " ปี" },
  { l: "Upside from board", th: "ศักยภาพจากการปรับบอร์ด", f: c => upsideOf(c).delta, hi: 1 },
  { l: "Open-innovation events", th: "กิจกรรมนวัตกรรมเปิดที่นับได้", f: c => c.oi, hi: 1 },
];
function autoPeers(c) {
  const pool = COMPS.filter(x => x.t !== c.t).sort((a, b) => b.ipi - a.ipi);
  const same = pool.filter(x => x.ind === c.ind);
  const out = [];
  if (same[0]) out.push(same[0]);
  const near = same.filter(x => !out.some(o => o.t === x.t)).sort((a, b) => Math.abs(a.ipi - c.ipi) - Math.abs(b.ipi - c.ipi))[0];
  if (near) out.push(near);
  const cross = pool.filter(x => x.ind !== c.ind).slice(0, 1)[0];   // ข้าม sector ได้ตามสเปก MVP
  if (cross) out.push(cross);
  return out.slice(0, 3).map(x => x.t);
}
function peerTable(c, peers) {
  const all = [c, ...peers];
  return `<div class="tw"><table><thead><tr><th>${T("Metric", "ตัวชี้วัด")}</th>
    ${all.map((x, i) => `<th class="n">${esc(x.t)}${i === 0 ? ` <span class="pill blue">${T("this firm", "บริษัทนี้")}</span>` : ""}</th>`).join("")}</tr></thead><tbody>
    ${CMP_ROWS.map(r => {
    const vs = all.map(r.f);
    const best = r.hi ? Math.max(...vs) : Math.min(...vs);
    return `<tr${r.big ? ' style="background:var(--mute-bg)"' : ""}><td>${esc(S.lang === "EN" ? r.l : r.th)}</td>
      ${vs.map(v => `<td class="n"${Math.abs(v - best) < 1e-9 ? ' style="font-weight:500"' : ""}>${fmt(v, r.d || 0)}${(S.lang === "EN" ? (r.uen || r.u) : r.u) || ""}${Math.abs(v - best) < 1e-9 ? ' <span style="color:var(--brand)">✦</span>' : ""}</td>`).join("")}</tr>`;
  }).join("")}
  </tbody></table></div>
  <div style="font-size:10.6px;color:var(--ink-3);margin-top:7px">✦ ${T("best value in the row — the system already knows which rows are better when lower.",
    "ค่าที่ดีที่สุดในแถว — ระบบคิดทิศทางให้แล้วว่าแถวไหนน้อยกว่าดีกว่า")}</div>`;
}
function lockCard(what, title, body) {
  return `<div class="paywall"><div class="paycard">
    <div class="lk">🔒</div>
    <h3 style="font-size:15px;margin-bottom:5px">${esc(title)}</h3>
    <p style="font-size:12.2px;color:var(--ink-2);margin:0 0 14px;line-height:1.65">${body}</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="btn p" data-unlock="${what}">${T("Unlock", "ปลดล็อก")} · ${PRICE[what]} token</button>
      <button class="btn s" data-topup="1">${T("Top up tokens", "เติม token")}</button></div>
    <div style="font-size:11px;color:var(--ink-3);margin-top:10px">
      ${T("You have", "คุณมี")} <b style="color:var(--ink)">${S.tokens}</b> token ·
      ${T("your own company is always free", "รายงานบริษัทของตัวเองดูได้ฟรีเสมอ")}</div>
  </div></div>`;
}
function zonePeer() {
  const c = co();
  if (!S.peers.length) S.peers = autoPeers(c);
  const peers = S.peers.map(t => byT[t]).filter(Boolean);
  const inner = `<div class="card">
    <h3>${T("Head-to-head comparison", "ตารางเทียบตัวต่อตัว")}</h3>
    <p class="desc">${T("Up to three peers, and they may sit in other sectors — cross-sector comparison is part of the MVP scope.",
    "เลือกได้สูงสุด 3 บริษัท และข้ามกลุ่มอุตสาหกรรมได้ตามขอบเขต MVP")}</p>
    <div id="peerPick" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>
    ${peerTable(c, peers)}
  </div>`;
  const nat = `<div class="card" style="margin-top:14px">
    <h3>${T("Industry report", "รายงานระดับอุตสาหกรรม")}</h3>
    <p class="desc">${T(`Full ranking of all ${indComps(c.ind).length} firms in ${indL(c.ind)}, exportable as CSV.`,
    `จัดอันดับครบทั้ง ${indComps(c.ind).length} บริษัทในกลุ่ม${IND[c.ind]} ส่งออกเป็น CSV ได้`)}</p>
    ${isUnlocked("national") ? natTable(c) : ""}
  </div>`;
  return `<section class="zone" id="zonePeer">
    <div class="zhead"><div><div class="zcode">${T("Extended scope", "ขยายขอบเขต")}</div>
      <h2>${T("Peer & industry comparison", "เทียบคู่แข่งและภาพรวมอุตสาหกรรม")}</h2>
      <p>${T("Reports on your own company are free. Comparing other companies spends tokens.",
    "รายงานบริษัทของตัวเองฟรี · การดูบริษัทอื่นใช้ token")}</p></div></div>
    ${isUnlocked("peer") ? inner : `<div class="lockwrap"><div class="blurred" aria-hidden="true">${inner}</div>
      ${lockCard("peer", T("Peer comparison", "เทียบคู่แข่ง"),
      T("Compare this company against up to three others, in any sector. Unlock once and change the peers as often as you like.",
        "เทียบบริษัทนี้กับอีกไม่เกิน 3 ราย ข้ามกลุ่มอุตสาหกรรมได้ · ปลดล็อกครั้งเดียวแล้วเปลี่ยนคู่เทียบได้ไม่จำกัด"))}</div>`}
    ${isUnlocked("national") ? nat : `<div class="lockwrap" style="margin-top:14px"><div class="blurred" aria-hidden="true">${nat}${natTable(c, 6)}</div>
      ${lockCard("national", T("Industry report", "รายงานระดับอุตสาหกรรม"),
      T("The full ranked table for this industry plus CSV export.", "ตารางจัดอันดับครบทั้งกลุ่มพร้อมส่งออก CSV"))}</div>`}
  </section>`;
}
function natTable(c, limit) {
  const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
  const rows = limit ? pool.slice(0, limit) : pool;
  return `<div class="tw"><table><thead><tr><th>#</th><th>${T("Company", "บริษัท")}</th>
      <th class="n">IPI</th><th class="n">CEO</th><th class="n">Board</th><th class="n">${T("Upside", "เพิ่มได้")}</th><th>${T("Risk", "ความเสี่ยง")}</th></tr></thead><tbody>
    ${rows.map((x, i) => { const r = riskLevel(x), u = upsideOf(x);
    return `<tr${x.t === c.t ? ' style="background:var(--brand-soft)"' : ""}>
      <td class="n">${i + 1}</td><td><b>${esc(x.t)}</b> <span style="color:var(--ink-3);font-size:11px">${esc(x.n)}</span></td>
      <td class="n"><b>${x.ipi}</b></td><td class="n">${x.dp}</td><td class="n">${ampPct(x.amp)}</td>
      <td class="n">${u.delta > 0 ? "+" + fmt(u.delta) : "—"}</td>
      <td><span class="pill ${pillOf(r.k)}">${esc(levelL(r.l))}</span></td></tr>`; }).join("")}
  </tbody></table></div>
  ${limit ? "" : `<button class="btn s" id="btnCsv" style="margin-top:12px">${T("Download CSV", "ดาวน์โหลด CSV")}</button>`}`;
}

/* ============================================================================
   Validity Remark — free เห็นสรุปสั้น · paid เห็นครบ
   ============================================================================ */
function zoneValid() {
  const V = DATA.validYear, all = V.all, th = V.thresh;
  /* ป้ายผลใช้เกณฑ์จากไฟล์ข้อมูลตรง ๆ และเลี่ยงคำว่า Strong เพราะค่าที่ได้จริงอยู่ใกล้เส้นเกณฑ์มาก */
  const mark = (v, t) => v >= t[0] ? { k: "ok", l: T("Passes", "ผ่านเกณฑ์") }
    : v >= t[1] ? { k: "warn", l: T("Marginal", "อ่อน") } : { k: "crit", l: T("Fails", "ไม่ผ่าน") };
  const short = `<div class="grid g4">
      ${[["Spearman", fmt(all.sp, 3), mark(all.sp, th.sp)], ["AUC", fmt(all.auc, 2), mark(all.auc, th.auc)],
    ["Decile lift", fmt(all.lift, 2) + "×", mark(all.lift, th.lift)], ["LOYO", "+" + fmt(all.loyo, 2), { k: "ok", l: T("Positive", "เป็นบวก") }]]
      .map(([k, v, m]) => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}</div>
        <div class="u"><span class="pill ${m.k}">${esc(m.l)}</span></div></div>`).join("")}
    </div>
    <div style="font-size:10.7px;color:var(--ink-3);margin-top:9px;line-height:1.6">
      ${T(`Thresholds come from the model's own validation plan (Spearman > ${fmt(th.sp[0], 2)} · AUC > ${fmt(th.auc[0], 2)} · lift > ${fmt(th.lift[0], 1)}×). Spearman and AUC clear them, but only just — that is the honest reading, not "strong".`,
      `เกณฑ์ผ่านมาจากแผนการตรวจสอบของโมเดลเอง (Spearman > ${fmt(th.sp[0], 2)} · AUC > ${fmt(th.auc[0], 2)} · lift > ${fmt(th.lift[0], 1)}×) · Spearman และ AUC ผ่านเกณฑ์แต่ผ่านแบบเฉียด นี่คือการอ่านผลตามตรง ไม่ใช่คำว่า “แข็งแรง”`)}</div>
    <div class="note warn" style="margin-top:13px">
      <b>${T("Read the score with this in mind", "อ่านคะแนนโดยจำข้อนี้ไว้")}</b> —
      ${T(`Across ${fmt(all.n)} firm-years the model ranks companies only moderately well (AUC ${fmt(all.auc, 2)} against 0.50 for a coin flip). It is a diagnostic, not a forecast, and the relationships are correlational.`,
      `จากข้อมูล ${fmt(all.n)} บริษัท-ปี โมเดลเรียงลำดับบริษัทได้เพียงระดับปานกลาง (AUC ${fmt(all.auc, 2)} เทียบกับ 0.50 ที่เท่ากับเดาสุ่ม) เป็นเครื่องมือวินิจฉัย ไม่ใช่การพยากรณ์ และเป็นความสัมพันธ์เชิงสหสัมพันธ์`)}</div>`;
  const full = `<div class="card" style="margin-top:14px">
      <h3>${T("Year by year — including the year the signal disappeared", "รายปี รวมปีที่สัญญาณหายไป")}</h3>
      <p class="desc">${T("Reporting only the pooled average would hide 2022 entirely. It is shown here on purpose.",
    "ถ้ารายงานแต่ค่าเฉลี่ยรวมจะกลบปี 2565 ไปทั้งปี จึงแสดงไว้ตรงนี้โดยตั้งใจ")}</p>
      <div class="tw"><table><thead><tr><th>${T("Year", "ปี")}</th><th class="n">n</th><th class="n">Spearman</th><th class="n">AUC</th><th class="n">Lift</th><th class="n">LOYO</th><th>${T("Verdict", "ผลตรวจ")}</th></tr></thead><tbody>
      ${Object.entries(V.byYear).map(([y, r]) => { const m = mark(r.auc, th.auc);
    return `<tr${y === "2022" ? ' style="background:var(--crit-bg)"' : ""}><td>${+y + 543} <span style="color:var(--ink-3)">(${y})</span></td>
      <td class="n">${fmt(r.n)}</td><td class="n">${fmt(r.sp, 3)}</td><td class="n">${fmt(r.auc, 3)}</td>
      <td class="n">${fmt(r.lift, 2)}×</td><td class="n">${fmt(r.loyo, 3)}</td>
      <td><span class="pill ${m.k}">${esc(m.l)}</span></td></tr>`; }).join("")}
      </tbody></table></div>
      <div class="note crit" style="margin-top:12px"><b>${T("2022 must be said out loud", "ปี 2565 ต้องพูดตรง ๆ")}</b> —
        ${T("Spearman −0.023 and AUC 0.494 mean the score carried no information that year. Any client-facing use has to state that the relationship is not stable across years.",
      "Spearman −0.023 และ AUC 0.494 แปลว่าคะแนนไม่ได้บอกอะไรเลยในปีนั้น การนำไปใช้กับลูกค้าต้องระบุว่าความสัมพันธ์ไม่คงที่ทุกปี")}</div>
    </div>`;
  return `<section class="zone" id="zoneValid">
    <div class="zhead"><div><div class="zcode">${T("Evidence", "หลักฐาน")}</div>
      <h2>Validity Remark</h2>
      <p>${T("Free users see the summary. The full year-by-year breakdown is a paid feature — but the caveat is never hidden behind the paywall.",
    "ผู้ใช้ฟรีเห็นสรุป · รายละเอียดรายปีเป็นส่วนของผู้ใช้แบบชำระเงิน แต่ข้อควรระวังไม่เคยถูกซ่อนไว้หลังผนังจ่ายเงิน")}</p></div></div>
    <div class="card">${short}</div>
    ${S.plan === "pro" ? full : `<div class="note" style="margin-top:14px">${T("Switch the demo user to Pro to see the year-by-year table.",
      "สลับผู้ใช้สาธิตเป็น Pro เพื่อดูตารางรายปี")} <button class="lnk" id="btnPro">${T("Switch to Pro", "สลับเป็น Pro")}</button></div>`}
  </section>`;
}

/* ============================================================================
   เอกสารสำหรับพิมพ์ — พิมพ์ผ่าน iframe จึงไม่ถูกตัวปิดกั้นป๊อปอัปบล็อก
   ============================================================================ */
const DOC_CSS = `
@page{size:A4 portrait;margin:12mm}
html,body{background:#fff}
body{margin:0;font-size:10.6px}
.dw{max-width:186mm;margin:0 auto}
.dh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;
  border-bottom:2px solid var(--brand);padding-bottom:9px;margin-bottom:11px}
.dt{font-size:21px;font-weight:500;letter-spacing:-.02em;line-height:1.18}
.db{border:1px solid var(--line);border-radius:9px;padding:9px 11px;break-inside:avoid;margin-bottom:8px}
.db h4{font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--brand);margin:0 0 5px}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dg3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.sig div>div{border-bottom:1px solid var(--ink-3);height:22px}
.sig small{font-size:8.6px;color:var(--ink-3)}
.dfoot{margin-top:10px;padding-top:7px;border-top:1px solid var(--line);font-size:8.4px;color:var(--ink-3);line-height:1.55}
table{font-size:10px}th,td{padding:4px 6px}
.card{box-shadow:none;border:0;padding:0}
`;
function printDoc(title, inner) {
  const styles = [...document.querySelectorAll("style")].map(s => s.textContent).join("\n");
  const doc = "<" + `!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>${styles}</style><style>${DOC_CSS}</style></head><body>${inner}</body></html>`;
  let f = $("#printFrame");
  if (!f) { f = document.createElement("iframe"); f.id = "printFrame"; f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(f); }
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("เบราว์เซอร์ปิดกั้นการพิมพ์ — ลองใช้ Ctrl+P"); } };
  f.srcdoc = doc;
  toast(T("Preparing document …", "กำลังเตรียมเอกสาร …"));
}
const DFOOT = `<div class="dfoot">PromoSignal DSS · Revision 1 · เครื่องมือ<b>ประเมิน</b> (diagnostic) ไม่ใช่การพยากรณ์ ·
  คะแนนสร้างจากแผงข้อมูล 209 บริษัท 928 บริษัท-ปี (2562–2566) ความสัมพันธ์เป็นเชิงสหสัมพันธ์ ไม่ใช่เชิงสาเหตุ
  และไม่คงที่ทุกปี (ปี 2565 AUC 0.494) · ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน ·
  <b>ห้ามนำไปใช้ให้คะแนนหรือคัดกรองกรรมการรายบุคคล</b> — เพศ อายุ และความเชื่อมโยงทางการเมืองเป็นข้อมูลอ่อนไหวตาม PDPA มาตรา 26</div>`;

function briefHtml(c) {
  const u = upsideOf(c), L = levers(c), pool = indComps(c.ind);
  const want = [];
  if (u.target.fem > c.fem) want.push(["กรรมการอิสระหญิง", `เพิ่มสัดส่วนจาก ${pct1(c.fem)} ไปที่ ${pct1(u.target.fem)} ซึ่งเป็นค่าที่พบจริงในกลุ่ม${IND[c.ind]}`]);
  if (u.target.fam < c.fam) want.push(["กรรมการที่ไม่ผูกกับผู้ถือหุ้นครอบครัว", `ลดสัดส่วนกรรมการที่ผูกกับครอบครัวจาก ${pct1(c.fam)} ไปที่ ${pct1(u.target.fam)}`]);
  if (u.target.ten < c.ten) want.push(["กรรมการเข้าใหม่เพื่อลดอายุงานเฉลี่ย", `จาก ${fmt(c.ten, 1)} ปี เหลือ ${fmt(u.target.ten, 1)} ปี ด้วยการหมุนเวียนที่นั่งที่อยู่นานที่สุด`]);
  if (!want.length) want.push(["รักษาโครงสร้างปัจจุบัน", "ทุกตัวแปรอยู่ที่ค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมแล้ว โจทย์คือรักษาไว้เมื่อกรรมการครบวาระ"]);
  return `<div class="dw">
    <div class="dh">
      <div><div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)">Candidate Brief · โจทย์การสรรหากรรมการ</div>
        <div class="dt">${esc(c.t)} · ${esc(c.n)}</div>
        <div style="font-size:10.5px;color:var(--ink-2)">${esc(IND[c.ind])} · กลุ่มอ้างอิง ${pool.length} บริษัท · ข้อมูลปี 2566</div></div>
      <div style="text-align:right"><div style="font-size:32px;font-weight:500;line-height:1">${c.ipi}</div>
        <div style="font-size:9px;color:var(--ink-3)">OI / IPI วันนี้<br>${u.delta > 0 ? "เพดานเชิงโครงสร้าง " + fmt(u.best) : "ถึงเพดานของกลุ่มแล้ว"}</div></div>
    </div>
    <div class="db"><h4>โจทย์ของการสรรหารอบนี้</h4>
      <p style="margin:0;font-size:11px;line-height:1.6">${u.delta > 0
      ? `ช่องว่างเชิงโครงสร้างที่โมเดลชี้คือ ${fmt(u.delta)} จุดคะแนน การสรรหารอบนี้จึงควรตั้งเป้าปิดช่องว่างนี้ ไม่ใช่การหากรรมการตามสเปกทั่วไป`
      : `โครงสร้างบอร์ดอยู่ที่เพดานของอุตสาหกรรมแล้ว การสรรหารอบนี้จึงเป็นการรักษาระดับเมื่อกรรมการครบวาระ`}</p></div>
    <div class="dg">
      <div class="db"><h4>คุณสมบัติเชิงโครงสร้างที่ต้องการ</h4>
        <table><tbody>${want.map(x => `<tr><td style="width:44%"><b>${esc(x[0])}</b></td><td>${esc(x[1])}</td></tr>`).join("")}</tbody></table></div>
      <div class="db"><h4>ผลต่อคะแนนของแต่ละข้อ</h4>
        <table><tbody>${L.length ? L.map(x => `<tr><td>${esc(x.th)}</td>
          <td class="n" style="font-weight:500;color:var(--ok);font-size:13px">+${fmt(x.d)}</td></tr>`).join("")
      : `<tr><td>ไม่มีคันโยกเชิงโครงสร้างเหลือ</td><td class="n">—</td></tr>`}
        </tbody></table>
        <div style="font-size:9.4px;color:var(--ink-3);margin-top:5px">ตัวเลขคือผลของการปรับข้อนั้นข้อเดียว โดยตรึงตัวแปรอื่นไว้</div></div>
    </div>
    <div class="db"><h4>ข้อห้ามในการใช้เอกสารนี้</h4>
      <p style="margin:0;font-size:10.6px;line-height:1.65">เอกสารนี้อธิบาย<b>คุณสมบัติเชิงโครงสร้างของคณะกรรมการ</b>ที่โมเดลชี้ว่าสัมพันธ์กับผลลัพธ์ระดับบริษัท
        <b>ไม่ใช่การชี้ตัวบุคคล</b> และห้ามนำไปใช้ให้คะแนนหรือคัดกรองผู้สมัครรายคน ·
        ระบบไม่ตั้ง “กรรมการสายนโยบาย” เป็นเป้าหมายในการสรรหา แม้สัมประสิทธิ์ในโมเดลจะเป็นบวก
        เพราะไม่ใช่เกณฑ์ที่ควรใช้คัดเลือกกรรมการ</p></div>
    <div class="sig"><div><div></div><small>ผู้จัดทำ · Executive Search / Advisory</small></div>
      <div><div></div><small>ประธานคณะกรรมการสรรหา</small></div></div>
    ${DFOOT}</div>`;
}
function memoHtml(c) {
  const I = insights(c), u = upsideOf(c), L = levers(c), rec = recommendation(c), F = riskFlags(c);
  const V = DATA.validYear.all;
  return `<div class="dw">
    <div class="dh">
      <div><div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)">Board Memo · บันทึกสำหรับวาระประชุม</div>
        <div class="dt">${esc(c.t)} · ${esc(c.n)}</div>
        <div style="font-size:10.5px;color:var(--ink-2)">${esc(IND[c.ind])} · อันดับ ${I.rank} จาก ${I.pool.length} ในอุตสาหกรรม</div></div>
      <div style="text-align:right"><div style="font-size:32px;font-weight:500;line-height:1">${c.ipi}</div>
        <div style="font-size:9px;color:var(--ink-3)">OI / IPI · ${esc(ZONES[zoneOf(c.promo, c.amp)].l)}<br>
          ${u.delta > 0 ? "เพดาน " + fmt(u.best) + " (+" + fmt(u.delta) + ")" : "ถึงเพดานของกลุ่มแล้ว"}</div></div>
    </div>
    <div class="dg" style="margin-bottom:8px">
      ${I.list.map(i => `<div class="db"><h4>${esc(i.tag)}</h4>
        <div style="font-size:11.5px;font-weight:500;line-height:1.35;margin-bottom:3px">${esc(i.h)}</div>
        <p style="margin:0;font-size:10.2px;color:var(--ink-2);line-height:1.55">${esc(i.p)}</p></div>`).join("")}
    </div>
    <div class="dg">
      <div class="db"><h4>ข้อเสนอเรียงตามผลต่อคะแนน</h4>
        <table><tbody>${L.length ? L.map(x => `<tr><td><b>${esc(x.th)}</b><div style="font-size:9.4px;color:var(--ink-3)">${esc(x.sth)}</div></td>
          <td class="n" style="font-weight:500;color:var(--ok);font-size:13px">+${fmt(x.d)}</td></tr>`).join("")
      : `<tr><td>โครงสร้างบอร์ดอยู่ที่เพดานของอุตสาหกรรมแล้ว</td><td class="n">—</td></tr>`}</tbody></table>
        <div style="margin-top:6px;font-size:10.4px"><b>ข้อเสนอของระบบ · ${esc(rec.l)}</b>
          <span style="color:var(--ink-2)">— ${esc(rec.d)}</span></div></div>
      <div class="db"><h4>ธงความเสี่ยงและความน่าเชื่อถือของคะแนน</h4>
        ${F.map(f => `<div style="font-size:10.4px;line-height:1.55;margin-bottom:3px">${f.lv === "crit" ? "▲" : f.lv === "warn" ? "△" : "✓"}
          <b>${esc(f.l)}</b><br><span style="color:var(--ink-3)">${esc(f.d)}</span></div>`).join("")}
        <div style="font-size:10.2px;color:var(--ink-2);margin-top:6px;line-height:1.55">
          ทั้งแผง Spearman ${fmt(V.sp, 3)} · AUC ${fmt(V.auc, 2)} · decile lift ${fmt(V.lift, 2)}× ·
          <b>ปี 2565 สัญญาณหายไปทั้งปี</b> (AUC 0.494)</div></div>
    </div>
    <div class="db"><h4>มติที่ประชุม</h4>
      <div style="display:flex;gap:12px;font-size:10.4px;margin-bottom:5px">
        <span>☐ เห็นชอบตามข้อเสนอ</span><span>☐ เห็นชอบบางส่วน</span><span>☐ ขอข้อมูลเพิ่ม</span><span>☐ ยังไม่พิจารณา</span></div>
      <div style="border-bottom:1px solid var(--line);height:14px"></div>
      <div style="border-bottom:1px solid var(--line);height:14px"></div></div>
    <div class="sig"><div><div></div><small>ผู้เสนอวาระ</small></div><div><div></div><small>ประธานที่ประชุม</small></div></div>
    ${DFOOT}</div>`;
}

/* ============================================================================
   ประกอบหน้า · ผูกเหตุการณ์ · เริ่มระบบ
   ============================================================================ */
function chrome() {
  const c = co(), z = ZONES[zoneOf(c.promo, c.amp)];
  $("#ctxCo").textContent = c.t + " · " + c.n;
  $("#ctxSub").innerHTML = esc(indL(c.ind)) + " · " + T("Annual Report 2023 / 56-1 One Report", "รายงานประจำปี 2566 / 56-1 One Report") +
    (isEdited() || S.ceo ? ` · <b style="color:var(--blue)">${T("edited by user", "แก้ค่าเอง")}</b>` : "");
  $("#ctxZone").innerHTML = `<span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span> ${esc(z.l)} · IPI <b>${c.ipi}</b>`;
  $("#tokChip").innerHTML = `◈ ${S.plan === "pro" ? "Pro" : "Free"} · <b>${S.tokens}</b> token`;
  $("#selCo").value = S.t;
  $$("#segRole button").forEach(b => b.setAttribute("aria-selected", b.dataset.role === S.role));
}
function render() {
  const w = $("#wrap");
  const core = zoneB() + zoneC();
  w.innerHTML = zoneA()
    + (isUnlocked("report") ? core
      : `<div class="lockwrap"><div class="blurred" aria-hidden="true">${core}</div>
         ${lockCard("report", T("Full report for this company", "รายงานฉบับเต็มของบริษัทนี้"),
        T(`Insights and board-refresh recommendations for ${co().t}. Reports on your own company (${S.ownCo}) stay free; other companies cost one token each and stay unlocked afterwards.`,
          `ข้อค้นพบและข้อเสนอปรับบอร์ดของ ${co().t} · รายงานบริษัทของคุณเอง (${S.ownCo}) ฟรีเสมอ ส่วนบริษัทอื่นใช้ 1 token ต่อบริษัท ปลดล็อกแล้วดูได้ตลอด`))}</div>`)
    + zonePeer() + zoneValid() + floatBar() + footNote();
  wire(w); chrome(); renderTL();
}
function floatBar() {
  return `<div class="floating">
    <button type="button" id="fbReport">${T("Generate Full Report", "ออกรายงานฉบับเต็ม")}</button>
    <button type="button" id="fbScn">${T("Save Scenario", "บันทึกฉากทัศน์")}</button>
    <button type="button" id="fbBrief">${T("Export Candidate Brief", "ออกโจทย์การสรรหา")}</button>
    <button type="button" id="fbTl">${T("Activity Timeline", "ประวัติการทำงาน")}</button>
  </div>`;
}
function footNote() {
  return `<footer>PromoSignal DSS · Revision 1 · ${T("prototype for presentation only", "ต้นแบบเพื่อการนำเสนอ ไม่ใช่ระบบจริง")} ·
    ${T("Diagnostic decision support built on a 209-firm, 928 firm-year panel (2019–2023). Relationships are correlational, not causal, and not stable across years.",
    "เครื่องมือสนับสนุนการตัดสินใจเชิงวินิจฉัย สร้างจากแผงข้อมูล 209 บริษัท 928 บริษัท-ปี (2562–2566) ความสัมพันธ์เป็นเชิงสหสัมพันธ์ ไม่ใช่เชิงสาเหตุ และไม่คงที่ทุกปี")} ·
    ${T("Not investment or employment advice. Never use it to score individuals.",
      "ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน · ห้ามนำไปใช้ให้คะแนนรายบุคคล")}</footer>`;
}
function renderTL() {
  $("#tl").innerHTML = S.log.length
    ? S.log.map((l, i) => `<div class="tli"><div class="dot">${S.log.length - i}</div>
        <div><b>${esc(l.title)}</b><span>${esc(l.sub)} · ${esc(l.at)}</span></div></div>`).join("")
    : `<div style="font-size:11.8px;color:var(--ink-3)">${T("Nothing yet — upload a document or unlock a comparison.", "ยังไม่มีรายการ — ลองอัปโหลดเอกสารหรือปลดล็อกการเทียบคู่แข่ง")}</div>`;
}

function analyse(txt, name) {
  if (!txt.trim()) return toast(T("Nothing to analyse", "ไม่มีข้อความให้วิเคราะห์"));
  const r = analyseText(txt);
  S.ceo = { text: txt, r };
  const st = r.tot < 6 ? "warn" : "ok";
  S.docs.unshift({ name: name || T("pasted text", "ข้อความที่วาง"), st, words: r.wc });
  S.docs = S.docs.slice(0, 5);
  logIt(T("Uploaded ", "อัปโหลด ") + (name || T("sample text", "ข้อความตัวอย่าง")),
    `${fmt(r.wc)} ${T("words", "คำ")} · CEO Drive ${r.dp}${st === "warn" ? " · " + T("few keywords found — needs review", "พบคำสำคัญน้อย ควรตรวจซ้ำ") : ""}`);
  toast(T(`Analysed · CEO Drive ${r.dp}`, `วิเคราะห์แล้ว · CEO Drive ${r.dp}`));
  render();
}

function wire(h) {
  /* ---- Zone A ---- */
  const dz = h.querySelector("#dz"), fi = h.querySelector("#fileIn");
  if (dz && fi) {
    dz.onclick = () => fi.click();
    dz.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } };
    ["dragenter", "dragover"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("over"); }));
    const take = async f => {
      if (!f) return;
      toast(T("Reading ", "กำลังอ่าน ") + f.name + " …");
      try { const t = await readFileText(f); analyse(t.slice(0, 80000), f.name); }
      catch (err) { toast(T("Could not read the file — ", "อ่านไฟล์ไม่สำเร็จ — ") + err.message); }
    };
    dz.addEventListener("drop", e => take(e.dataTransfer.files[0]));
    fi.onchange = e => take(e.target.files[0]);
  }
  const sm = h.querySelector("#btnSample"); if (sm) sm.onclick = () => analyse(SAMPLE, T("sample CEO letter", "สารจาก CEO ตัวอย่าง"));
  const rs = h.querySelector("#btnReset");
  if (rs) rs.onclick = () => { clearOv(); S.docs = []; logIt(T("Reset to database values", "คืนค่าจากฐานข้อมูล"), S.t); render(); };
  h.querySelectorAll("[data-rmdoc]").forEach(b => b.onclick = () => {
    S.docs.splice(+b.dataset.rmdoc, 1); if (!S.docs.length) S.ceo = null; render();
  });
  h.querySelectorAll("[data-ex]").forEach(el => el.onchange = () => {
    const k = el.dataset.ex, f = EXTRACT.find(x => x.k === k);
    let v = +el.value;
    if (!isFinite(v)) return render();
    if (f.kind === "pct") v = clamp(v, 0, 100) / 100;
    else if (f.kind === "yr") v = clamp(v, 0, 40);
    else if (f.kind === "bool") v = v ? 1 : 0;
    else v = Math.round(clamp(v, 0, 100));
    setOv(k, v);
    logIt(T("Corrected ", "แก้ค่า ") + (S.lang === "EN" ? f.l : f.th), S.t + " → " + el.value);
    render();
  });

  /* ---- Zone B ---- */
  h.querySelectorAll("#segLang button").forEach(b => b.onclick = () => { S.lang = b.dataset.lang; save(); render(); });

  /* ---- Zone C ---- */
  const br = h.querySelector("#btnBrief"), mm = h.querySelector("#btnMemo"), sv = h.querySelector("#btnSaveScn");
  if (br) br.onclick = () => { printDoc("Candidate Brief · " + co().t, briefHtml(co())); logIt(T("Exported Candidate Brief", "ออกโจทย์การสรรหา"), co().t); renderTL(); };
  if (mm) mm.onclick = () => { printDoc("Board Memo · " + co().t, memoHtml(co())); logIt(T("Exported Board Memo", "ออกบันทึกวาระประชุม"), co().t); renderTL(); };
  if (sv) sv.onclick = () => { const c = co(), u = upsideOf(c);
    logIt(T("Saved board refresh scenario", "บันทึกฉากทัศน์ปรับบอร์ด"), `${c.t} · ${c.ipi} → ${fmt(u.best)} (+${fmt(u.delta)})`);
    toast(T("Scenario saved to the timeline", "บันทึกฉากทัศน์ไว้ในประวัติแล้ว")); renderTL(); };

  /* ---- token ---- */
  h.querySelectorAll("[data-unlock]").forEach(b => b.onclick = () => {
    const w = b.dataset.unlock;
    if (spend(w, T("Unlocked ", "ปลดล็อก ") + ({ report: T("full report", "รายงานฉบับเต็ม"), peer: T("peer comparison", "การเทียบคู่แข่ง"), national: T("industry report", "รายงานอุตสาหกรรม") }[w]) + " · " + S.t)) render();
  });
  h.querySelectorAll("[data-topup]").forEach(b => b.onclick = () => {
    if (!confirm(T(`Demo top-up — add ${PACK_MIN} tokens?\n\nThe real system will connect a Thai payment channel in Phase II.`,
      `จำลองการเติม token — เพิ่ม ${PACK_MIN} token?\n\nระบบจริงจะเชื่อมช่องทางชำระเงินไทยใน Phase II`))) return;
    S.tokens += PACK_MIN; logIt(T("Topped up tokens", "เติม token"), "+" + PACK_MIN + " · " + T("minimum pack", "แพ็กขั้นต่ำ"));
    save(); toast(T(`+${PACK_MIN} tokens · you now have ${S.tokens}`, `เติม ${PACK_MIN} token แล้ว · คงเหลือ ${S.tokens}`)); render();
  });
  const pk = h.querySelector("#peerPick");
  if (pk) {
    const list = COMPS.filter(x => x.t !== S.t).sort((a, b) => b.ipi - a.ipi);
    pk.innerHTML = [0, 1, 2].map(i => `<select class="sel" data-slot="${i}">
      <option value="">— ${T("none", "ไม่เลือก")} —</option>
      ${list.map(x => `<option value="${esc(x.t)}"${S.peers[i] === x.t ? " selected" : ""}>${esc(x.t)} · ${esc(indL(x.ind))} · IPI ${x.ipi}</option>`).join("")}</select>`).join("");
    pk.querySelectorAll("select").forEach(s => s.onchange = () => {
      S.peers = [...new Set([...pk.querySelectorAll("select")].map(x => x.value).filter(Boolean))].slice(0, 3);
      save(); render();
    });
  }
  const cs = h.querySelector("#btnCsv");
  if (cs) cs.onclick = () => {
    const c = co(), pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
    const head = ["rank", "ticker", "company", "industry", "zone", "IPI", "CEO_drive", "board_amp", "upside", "risk"].join(",");
    const rows = pool.map((x, i) => [i + 1, x.t, `"${x.n}"`, `"${IND[x.ind]}"`, `"${ZONES[zoneOf(x.promo, x.amp)].l}"`,
      x.ipi, x.dp, ampPct(x.amp), fmt(upsideOf(x).delta), `"${riskLevel(x).l}"`].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `promosignal_${IND[c.ind]}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    logIt(T("Downloaded industry CSV", "ดาวน์โหลด CSV อุตสาหกรรม"), IND[c.ind]); renderTL();
  };
  const pr = h.querySelector("#btnPro");
  if (pr) pr.onclick = () => { S.plan = "pro"; S.tokens = Math.max(S.tokens, PLAN_TOKENS.pro); save();
    logIt(T("Switched demo user to Pro", "สลับผู้ใช้สาธิตเป็น Pro"), `${PLAN_TOKENS.pro} token`); render(); };

  /* ---- แถบปุ่มลอย ---- */
  const fb = { fbReport: () => { printDoc("Full Report · " + co().t, memoHtml(co()) + briefHtml(co())); logIt(T("Generated full report", "ออกรายงานฉบับเต็ม"), co().t); },
    fbScn: () => sv && sv.click(), fbBrief: () => br && br.click(),
    fbTl: () => { $("#drawer").classList.toggle("on"); } };
  Object.entries(fb).forEach(([id, fn]) => { const e = h.querySelector("#" + id); if (e) e.onclick = fn; });
}

/* ---------------------------------------------------------------- เมนูซ้ายไฮไลต์ตามที่เลื่อน */
function watchScroll() {
  const links = $$(".nav a");
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle("on", a.dataset.z === e.target.id)); });
  }, { rootMargin: "-20% 0px -70% 0px" });
  ["zoneA", "zoneB", "zoneC", "zonePeer", "zoneValid"].forEach(id => { const e = $("#" + id); if (e) io.observe(e); });
}

function boot() {
  load();
  if (!byT[S.t]) S.t = "PTG";
  if (!S.ownCo) S.ownCo = S.t;                       // บริษัทแรกที่เปิด = บริษัทของผู้ใช้ ดูฟรีตลอด
  $("#selCo").innerHTML = COMPS.slice().sort((a, b) => b.ipi - a.ipi)
    .map(x => `<option value="${esc(x.t)}">${esc(x.t)} · ${esc(x.n)}</option>`).join("");
  $("#selCo").onchange = e => { S.t = e.target.value; S.peers = []; S.ceo = null; S.docs = []; save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $$("#segRole button").forEach(b => b.onclick = () => { S.role = b.dataset.role; save(); render(); });
  $("#btnPresent").onclick = () => {
    const on = !document.body.classList.contains("present");
    document.body.classList.toggle("present", on);
    $("#btnPresent").textContent = on ? T("Exit presentation", "ออกจากโหมดนำเสนอ") : T("Presentation mode", "โหมดนำเสนอ");
    try { on ? document.documentElement.requestFullscreen() : document.exitFullscreen(); } catch (e) { }
  };
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) { document.body.classList.remove("present"); $("#btnPresent").textContent = T("Presentation mode", "โหมดนำเสนอ"); }
  });
  $("#drawerClose").onclick = () => $("#drawer").classList.remove("on");
  render();
  watchScroll();
}
boot();
