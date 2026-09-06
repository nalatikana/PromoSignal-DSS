/* ============================================================================
   OpenInnoScore™ — CEO Regulatory Focus × Board Composition Assessment
   ชั้นหน้าจอล้วน  สูตรทั้งหมดมาจาก boardsignal/src/{app,invest}.js ที่ตัดมาตอนบิลด์
   โครง  Overview → Assessment (Zone A/B/C) → What-if Studio → Validity
   ============================================================================ */

/* ---------------------------------------------------------------- สถานะ */
const S = {
  user: null, plan: "free", tokens: 3, ownCo: null,
  t: "PTG", tab: "overview", lang: "EN", tone: "search",
  unlocked: {}, ov: {}, ceo: null, docs: [], peers: [],
  sortBy: "impact", report: [], log: [],
  wi: null, wiPreset: "current",
  cons: { fam25: false, fem30: false, sizeFixed: true },
  horizon: "12m", priority: "max",
};
const LS = "openinnoscore_v1";
const PRICE = { report: 1, peer: 1, national: 3 };
const PACK_MIN = 3;
const PLAN_TOKENS = { free: 3, pro: 20 };

function save() {
  try {
    localStorage.setItem(LS, JSON.stringify({
      user: S.user, plan: S.plan, tokens: S.tokens, ownCo: S.ownCo, t: S.t, tab: S.tab,
      lang: S.lang, tone: S.tone, unlocked: S.unlocked, ov: S.ov, peers: S.peers,
      sortBy: S.sortBy, report: S.report, log: S.log.slice(0, 30),
      cons: S.cons, horizon: S.horizon, priority: S.priority,
    }));
  } catch (e) { }
}
function load() { try { const o = JSON.parse(localStorage.getItem(LS) || "null"); if (o) Object.assign(S, o); } catch (e) { } }
function logIt(title, sub) {
  S.log.unshift({ title, sub, at: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) });
  S.log = S.log.slice(0, 30); save(); renderTL();
}

/* ---------------------------------------------------------------- ภาษา */
const T = (en, th) => S.lang === "EN" ? en : th;
const IND_EN = { 1: "Agro & Food", 2: "Technology", 3: "Resources", 4: "Services",
  5: "Industrials", 6: "Consumer Products", 7: "Property & Construction" };
const indL = i => S.lang === "EN" ? (IND_EN[i] || IND[i]) : IND[i];
const LEVEL_EN = { "สูง": "High", "ปานกลาง": "Moderate", "ต่ำ–ปานกลาง": "Low–moderate", "ต่ำ": "Low" };
const levelL = l => S.lang === "EN" ? (LEVEL_EN[l] || l) : l;
const VARS = {
  fem: { en: "Female directors", th: "กรรมการหญิง", beta: "pXfem" },
  fam: { en: "Family directors", th: "กรรมการครอบครัว", beta: "pXfam" },
  pol: { en: "Political ties", th: "กรรมการสายนโยบาย", beta: "pXpol" },
  ten: { en: "Board tenure", th: "อายุงานเฉลี่ยบอร์ด", beta: "pXten" },
  promo: { en: "CEO regulatory focus", th: "ภาษาเชิงรุกของ CEO", beta: "promo" },
};
const vL = k => S.lang === "EN" ? VARS[k].en : VARS[k].th;

/* ---------------------------------------------------------------- บริษัทที่ใช้คำนวณ */
const FIELDS = ["fem", "fam", "pol", "ten", "dp"];
function promoAtPct(dp) { const a = REF_PROMO, n = a.length; return a[clamp(Math.round(dp / 100 * n) - 1, 0, n - 1)]; }
/** ผสมค่าที่ผู้ใช้แก้เองกับค่าจากฐานข้อมูล แล้วคิด amp / dp / OI ใหม่ทั้งชุด */
function co(t) {
  t = t || S.t;
  const b = byT[t], o = S.ov[t] || {};
  const dirty = FIELDS.some(k => o[k] !== undefined) || (t === S.t && S.ceo);
  if (!dirty) return b;
  const m = Object.assign({}, b);
  ["fem", "fam", "pol", "ten"].forEach(k => { if (o[k] !== undefined) m[k] = o[k]; });
  const dp = o.dp !== undefined ? o.dp : (t === S.t && S.ceo) ? S.ceo.r.dp : b.dp;
  if (dp !== b.dp) m.promo = promoAtPct(dp);
  m.amp = ampOf(m.fam, m.pol, m.fem, m.ten);
  m.ap = ampPct(m.amp);
  m.dp = dp;
  m.ipi = Math.round(.5 * m.dp + .5 * m.ap);
  m.edited = true;
  return m;
}
const isEdited = t => { const o = S.ov[t || S.t] || {}; return FIELDS.some(k => o[k] !== undefined); };
const setOv = (k, v) => { (S.ov[S.t] = S.ov[S.t] || {})[k] = v; save(); };
const clearOv = () => { delete S.ov[S.t]; S.ceo = null; S.docs = []; save(); };
/** OI ของโปรไฟล์สมมติ เทียบมาตรฐานกับบริษัทต้นทาง */
const lever = (c, k, v) => ipiAt(c, Object.assign(profOf(c), { [k]: v })) - c.ipi;

/* ---------------------------------------------------------------- token */
const isUnlocked = (what, t) => (what === "report" && (t || S.t) === S.ownCo) || !!S.unlocked[what + ":" + (t || S.t)];
function spend(what, label) {
  const cost = PRICE[what];
  if (S.tokens < cost) { toast(T(`Not enough tokens — ${S.tokens} left, ${cost} needed`, `token ไม่พอ — เหลือ ${S.tokens} ต้องใช้ ${cost}`)); return false; }
  S.tokens -= cost; S.unlocked[what + ":" + S.t] = true;
  logIt(label, `${cost} token · ${T("left", "เหลือ")} ${S.tokens}`);
  save(); toast(T(`Unlocked · ${cost} token used · ${S.tokens} left`, `ปลดล็อกแล้ว · ใช้ ${cost} token · เหลือ ${S.tokens}`));
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
const pillOf = k => k === "crit" ? "crit" : k === "warn" ? "warn" : "ok";
const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));

/* ---------------------------------------------------------------- ชั้นแปลข้อความจากชั้นคำนวณ */
const REC_EN = {
  engage: ["Engage with the board", "The CEO is already assertive while board structure is the binding constraint — the case where a governance change pays off most clearly."],
  "watch-up": ["Watch and wait for the moment", "There is upside in board composition, but the CEO's language does not yet support it."],
  caution: ["Proceed with caution", "There are structural red flags that should be checked before acting."],
  hold: ["Hold and monitor", "Already in the top group; what board change adds is not large enough to be the main reason to act."],
  pass: ["Not the moment", "Neither the current score nor the remaining upside stands out against the group."],
};
const recL = c => { const r = recommendation(c);
  return S.lang === "EN" && REC_EN[r.k] ? { k: r.k, c: r.c, l: REC_EN[r.k][0], d: REC_EN[r.k][1] } : r; };
function flagsL(c) {
  const F = riskFlags(c);
  if (S.lang !== "EN") return F;
  const pool = indComps(c.ind), med = k => qAt(pool.map(x => x[k]), .5);
  const EN = {
    "ผู้นำรุกแต่บอร์ดกระจุกในครอบครัว": ["Assertive CEO, family-concentrated board",
      `Family directors at ${pct1(c.fam)} sit in the top band of the industry while CEO language is at percentile ${c.dp}.`],
    "กรรมการครอบครัวสูงกว่ากลุ่ม": ["Family directors above the industry group", `${pct1(c.fam)} against an industry median of ${pct1(med("fam"))}.`],
    "ความหลากหลายทางเพศต่ำ": ["Low gender diversity on the board",
      `Female directors at ${pct1(c.fem)} sit in the bottom band of the industry — the strongest amplifier in the model.`],
    "บอร์ดอยู่ในตำแหน่งนาน": ["Long-serving board", `Average tenure ${fmt(c.ten, 1)} years is in the top band of the industry.`],
    "บอร์ดพร้อมแต่ผู้นำยังไม่ขยับ": ["The board is ready, the CEO has not moved",
      `Board structure at percentile ${ampPct(c.amp)} while CEO language is at ${c.dp}.`],
    "ไม่พบธงความเสี่ยงเชิงโครงสร้าง": ["No structural red flag", "Every variable sits inside the normal range for this industry."],
  };
  return F.map(f => EN[f.l] ? { lv: f.lv, l: EN[f.l][0], d: EN[f.l][1] } : f);
}

/* ---------------------------------------------------------------- Validity ตามประเภทผู้ใช้ */
/** เกณฑ์ผ่าน 4 ข้อจากแผนตรวจสอบของโมเดล — ผ่านครบ = Strong · ตกข้อใดข้อหนึ่ง = ใช้อย่างระมัดระวัง */
function validity() {
  const V = DATA.validYear, a = V.all, Y = V.byYear;
  const yrs = Object.entries(Y);
  const spAllYears = yrs.every(([, r]) => r.sp > 0);
  const loyoAllYears = yrs.every(([, r]) => r.loyo > 0);
  const badSp = yrs.filter(([, r]) => r.sp <= 0).map(([y]) => +y + 543);
  const rows = [
    { k: "spearman", n: "Rank correlation (Spearman)", th_: "สหสัมพันธ์อันดับ (Spearman)",
      v: a.sp, pass: a.sp > 0 && spAllYears, rule: T("> 0 and positive every year", "> 0 และเป็นบวกทุกปี"),
      what: T("Does the score rank real open-innovation activity?", "คะแนนเรียงลำดับ OI จริงได้ไหม"),
      why: T(`Pooled value is ${fmt(a.sp, 3)}, but ${badSp.join(", ")} is not positive — the ordering does not hold in every year, so a small score gap between two firms is not evidence of a real difference.`,
        `ค่ารวมทั้งแผงคือ ${fmt(a.sp, 3)} แต่ปี ${badSp.join(", ")} ไม่เป็นบวก การเรียงลำดับจึงไม่คงเส้นทุกปี ส่วนต่างคะแนนเล็กน้อยระหว่างสองบริษัทจึงไม่ถือเป็นหลักฐานว่าต่างกันจริง`) },
    { k: "auc", n: "Discrimination (AUC)", th_: "อำนาจจำแนก (AUC)",
      v: a.auc, pass: a.auc > 0.5, rule: "> 0.50",
      what: T("Does it separate the top tercile from the rest?", "แยกบริษัท OI สูง (top tercile) จากที่เหลือได้ไหม"),
      why: T("Separation would be no better than a coin flip.", "การแยกกลุ่มจะไม่ต่างจากการเดาสุ่ม") },
    { k: "lift", n: "Decile lift", th_: "Decile lift",
      v: a.lift, pass: a.lift > 1.5, rule: "> 1.5×",
      what: T("Average OI of the top-score group over the bottom group", "ค่าเฉลี่ย OI ของกลุ่มคะแนนสูงหารด้วยกลุ่มคะแนนต่ำ"),
      why: T("The practical gap between the top and bottom group would be too small to act on.",
        "ระยะห่างเชิงปฏิบัติระหว่างกลุ่มบนกับกลุ่มล่างจะน้อยเกินกว่าจะใช้ตัดสินใจ") },
    { k: "loyo", n: "Leave-one-year-out", th_: "Leave-one-year-out",
      v: a.loyo, pass: a.loyo > 0 && loyoAllYears, rule: T("positive every year, mean > 0", "เป็นบวกทุกปี และค่าเฉลี่ย > 0"),
      what: T("Fit on four years, predict the year left out", "fit 4 ปี แล้วทำนายปีที่เหลือ"),
      why: T("At least one year is not positive out of sample, so the relationship would not carry forward.",
        "มีอย่างน้อยหนึ่งปีที่ผลนอกตัวอย่างไม่เป็นบวก ความสัมพันธ์จึงไม่ส่งต่อไปยังปีถัดไป") },
  ];
  const failed = rows.filter(r => !r.pass);
  return { rows, failed, strong: failed.length === 0, all: a, byYear: Y, thresh: V.thresh };
}
function validityRemark() {
  const v = validity();
  return v.strong
    ? { k: "ok", label: "Strong predictive diagnosis", th: "ผลประเมินอ้างอิงได้ในระดับ Strong",
      d: T("All four validity tests pass on the pooled panel.", "ผ่านเกณฑ์ทั้งสี่ข้อบนแผงข้อมูลรวม") }
    : { k: "warn", label: "Use result with caution", th: "ใช้ผลอย่างระมัดระวัง",
      d: T(`Fails ${v.failed.length} of the 4 validity tests — `, `ไม่ผ่าน ${v.failed.length} จาก 4 เกณฑ์ — `) +
        v.failed.map(f => (S.lang === "EN" ? f.n : f.th_) + " (" + T("criterion ", "เกณฑ์ ") + f.rule + "): " + f.why).join(" · ") };
}

/* ---------------------------------------------------------------- แผนภาพน้ำตก
   ผลรวมของทุกขั้นเท่ากับ OI จริงเสมอ — ปัดเศษครั้งเดียวด้วยวิธี largest remainder */
function wfSvg(c, opt = {}) {
  const w = waterfall(c);
  const cols = [{ l: T("Market median", "ค่ากลางตลาด"), from: 0, to: w.base, k: "base" }]
    .concat(w.steps.map(s => ({ l: vL(s.k), from: s.to - s.d, to: s.to, d: s.d, key: s.k,
      k: s.d > 0 ? "up" : s.d < 0 ? "dn" : "flat" })))
    .concat([{ l: esc(c.t), from: 0, to: w.total, k: "tot" }]);
  const W = 780, H = opt.h || 264, L = 38, R = 12, Tp = 20, B = opt.h ? 62 : 66;
  const top = Math.max(100, ...cols.map(o => Math.max(o.from, o.to)));
  const Y = v => H - B - clamp(v, 0, top) / top * (H - Tp - B);
  const n = cols.length, slot = (W - L - R) / n, cw = Math.min(68, slot * .56);
  const CX = i => L + slot * (i + .5);
  const FILL = { base: "var(--ink-3)", tot: "var(--blue)", up: "var(--mint-ink)", dn: "var(--s2)", flat: "var(--ink-3)" };
  const grid = [0, 25, 50, 75, 100].map(v =>
    `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - R}" y2="${Y(v).toFixed(1)}" stroke="var(--line-2)"/>
     <text x="${L - 6}" y="${(Y(v) + 3.4).toFixed(1)}" font-size="9" fill="var(--ink-3)" text-anchor="end">${v}</text>`).join("");
  const body = cols.map((o, i) => {
    const y0 = Y(Math.max(o.from, o.to)), y1 = Y(Math.min(o.from, o.to));
    const h = Math.max(2.5, y1 - y0), x = CX(i) - cw / 2;
    const lab = o.d === undefined ? fmt(o.to) : sgn(o.d);
    const link = i < n - 1 ? `<line x1="${(x + cw).toFixed(1)}" y1="${Y(o.to).toFixed(1)}" x2="${(CX(i + 1) - cw / 2).toFixed(1)}"
      y2="${Y(o.to).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>` : "";
    return `${link}<g>
      <rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"
        fill="${FILL[o.k]}" fill-opacity="${o.k === "flat" ? .4 : .9}"/>
      <text x="${CX(i).toFixed(1)}" y="${(y0 - 6).toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--ink)">${lab}</text>
      <text x="${CX(i).toFixed(1)}" y="${H - B + 16}" font-size="9.6" text-anchor="middle" fill="var(--ink-2)">${esc(o.l)}</text>
      ${o.d !== undefined ? `<text x="${CX(i).toFixed(1)}" y="${H - B + 28}" font-size="9" text-anchor="middle" fill="var(--ink-3)">→ ${fmt(o.to)}</text>` : ""}
    </g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${T("Score decomposition", "แผนภาพน้ำตกของคะแนน")}">
    ${grid}${body}<line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1.1"/></svg>
  <div class="legend">
    <span><i style="background:var(--ink-3)"></i>${T("Start: a firm at the market median on every variable", "จุดตั้งต้น = บริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด")}</span>
    <span><i style="background:var(--mint-ink)"></i>${T("Raises the score", "ตัวที่ดันคะแนนขึ้น")}</span>
    <span><i style="background:var(--s2)"></i>${T("Lowers the score", "ตัวที่ฉุดคะแนนลง")}</span>
    <span><i style="background:var(--blue)"></i>${T("Actual score", "คะแนนจริง")}</span></div>`;
}

/* ============================================================================
   Zone A · Document Intelligence
   ============================================================================ */
const EXTRACT = [
  { k: "fem", en: "Female BOD %", th: "กรรมการหญิง %", kind: "pct" },
  { k: "fam", en: "Family BOD %", th: "กรรมการครอบครัว %", kind: "pct" },
  { k: "pol", en: "Political ties", th: "กรรมการสายนโยบาย", kind: "bool" },
  { k: "ten", en: "Average tenure", th: "อายุงานเฉลี่ยบอร์ด", kind: "yr" },
];
const CONF = {
  db: { k: "warn", en: "Medium", th: "ปานกลาง", den: "from the 2019–2023 panel", dth: "จากแผงข้อมูล 2562–2566" },
  user: { k: "ok", en: "High", th: "สูง", den: "entered by the user", dth: "ผู้ใช้กรอกเอง" },
  doc: { k: "ok", en: "High", th: "สูง", den: "counted from the uploaded file", dth: "นับจากไฟล์ที่อัปโหลดจริง" },
};
const confOf = k => { const o = S.ov[S.t] || {};
  if (o[k] !== undefined) return CONF.user;
  if (k === "dp" && S.ceo) return CONF.doc;
  return CONF.db; };
const confLab = c => S.lang === "EN" ? c.en : c.th;
const confDesc = c => S.lang === "EN" ? c.den : c.dth;
const stepState = () => (S.docs.length || S.ceo) ? ((isEdited() || S.ceo) ? 2 : 1) : 0;

function zoneA() {
  const c = co(), st = stepState(), ist = DATA.indstats[c.ind];
  const steps = [
    { h: T("Upload documents", "อัปโหลดเอกสาร"), p: T("56-1 One Report · Annual Report · CEO letter · meeting transcript", "56-1 One Report · รายงานประจำปี · สารจาก CEO · transcript การประชุม") },
    { h: T("Generate insights", "สรุปเป็นข้อค้นพบ"), p: T("The model scores the firm and explains what drives it, in the tone you choose.", "โมเดลคิดคะแนนแล้วอธิบายว่าอะไรเป็นตัวขับ ด้วยโทนที่เลือกได้") },
    { h: T("Recommend action", "เสนอสิ่งที่ควรทำ"), p: T("Ranked board-refresh actions with the score impact and feasibility of each.", "จัดลำดับการปรับบอร์ด พร้อมผลต่อคะแนนและความยากง่ายของแต่ละข้อ") },
  ];
  const flow = `<div class="flowbar">${steps.map((s, i) =>
    `<div class="fstep ${i < st ? "done" : i === st ? "on" : ""}"><div class="fn">${i < st ? "✓" : i + 1}</div>
      <h4>${esc(s.h)}</h4><p>${esc(s.p)}</p></div>`).join("")}</div>`;

  /* การ์ดสรุปสี่ใบเรียงแถวตามสเปก + ช่องแก้ค่าเองในทุกใบ */
  const cards = EXTRACT.map(f => {
    const cf = confOf(f.k), v = c[f.k], ed = (S.ov[S.t] || {})[f.k] !== undefined;
    const disp = f.kind === "pct" ? pct1(v) : f.kind === "yr" ? fmt(v, 1) + T(" yr", " ปี") : (v ? T("Yes", "มี") : T("No", "ไม่มี"));
    const ref = f.kind === "pct" ? pct1(ist[f.k]) : f.kind === "yr" ? fmt(ist.ten, 1) + T(" yr", " ปี")
      : T(`${fmt(ist.pol * 100, 0)}% of firms`, `${fmt(ist.pol * 100, 0)}% ของบริษัทในกลุ่ม`);
    const inp = f.kind === "bool"
      ? `<select class="inp ${ed ? "edited" : ""}" data-ex="${f.k}">
          <option value="1"${v ? " selected" : ""}>${T("Yes", "มี")}</option>
          <option value="0"${v ? "" : " selected"}>${T("No", "ไม่มี")}</option></select>`
      : `<input class="inp ${ed ? "edited" : ""}" data-ex="${f.k}" type="number" inputmode="decimal" step="0.1"
          min="0" max="${f.kind === "pct" ? 100 : 40}" value="${f.kind === "pct" ? fmt(v * 100, 1) : fmt(v, 1)}">`;
    return `<div class="excard">
      <div class="k">${esc(S.lang === "EN" ? f.en : f.th)}</div>
      <div class="v num">${disp}</div>
      <div style="font-size:11.2px;color:var(--ink-3)">${T("industry", "ค่ากลุ่ม")} ${ref}</div>
      <div class="row"><span class="pill ${cf.k}" title="${esc(confDesc(cf))}">${T("Confidence", "ความเชื่อมั่น")} ${esc(confLab(cf))}</span></div>
      <div style="margin-top:6px">${inp}</div></div>`;
  }).join("");

  const cf = confOf("dp");
  const files = S.docs.length ? `<div class="files">${S.docs.map((d, i) => `<div class="file">
      <span class="pill ${d.st === "ok" ? "ok" : d.st === "warn" ? "warn" : "mute"}">${d.st === "ok" ? T("Completed", "เสร็จแล้ว") : d.st === "warn" ? T("Needs review", "ควรตรวจซ้ำ") : T("Processing", "กำลังประมวลผล")}</span>
      <span class="nm" title="${esc(d.name)}">${esc(d.name)}</span>
      <span style="color:var(--ink-3);font-size:11.4px;white-space:nowrap">${d.words ? fmt(d.words) + " " + T("words", "คำ") : ""}</span>
      <button class="btn s sm" data-rmdoc="${i}">✕</button></div>`).join("")}</div>` : "";

  const preview = S.ceo ? `<details class="blk"${S.docs.length ? " open" : ""}>
      <summary><b>${T("CEO text preview", "ตัวอย่างข้อความ CEO")}</b>
        <span style="color:var(--ink-3);font-size:11.6px">${fmt(S.ceo.r.wc)} ${T("words", "คำ")} · ${T("forward-looking", "คำเชิงรุก")} ${fmt(S.ceo.r.pro.n)} · ${T("guarding", "คำเชิงป้องกัน")} ${fmt(S.ceo.r.pre.n)}</span></summary>
      <div class="bd"><div class="ev">${highlight(S.ceo.text.slice(0, 3000), S.ceo.r)}</div>
        <div style="font-size:11.2px;color:var(--ink-3);margin-top:7px">
          <span class="hi">${T("forward-looking", "เชิงรุก")}</span> · <span class="hi prev">${T("guarding", "เชิงป้องกัน")}</span> ·
          ${T("every counted word is highlighted so the score can be traced back to the source",
    "ทุกคำที่นับได้ถูกระบายสีไว้ จึงตรวจย้อนกลับได้ว่าคะแนนมาจากข้อความตรงไหน")}</div></div></details>`
    : "";

  return `<section class="zone" id="zoneA">
    <div class="zhead"><div><div class="zcode">Zone A</div>
      <h2>Document Intelligence</h2>
      <p>${T("Fast data extraction from uploaded files — every field can be corrected by hand and every number says where it came from.",
    "ดึงข้อมูลจากเอกสารที่อัปโหลดอย่างรวดเร็ว — แก้ค่าเองได้ทุกช่อง และทุกตัวเลขบอกที่มา")}</p></div></div>
    ${flow}
    <div class="grid gside-l">
      <div class="card">
        <h3>${T("Upload", "อัปโหลดเอกสาร")}</h3>
        <p class="desc">${T("PDF or text · read in your browser only, never sent to a server.", "PDF หรือไฟล์ข้อความ · อ่านในเบราว์เซอร์เท่านั้น ไม่ถูกส่งออกไปที่เซิร์ฟเวอร์ใด")}</p>
        <div class="dz" id="dz" tabindex="0" role="button">
          <div class="ico">⬆</div>
          <div style="font-size:13.4px;margin-top:6px">${T("Drop files here, or click to choose", "วางไฟล์ตรงนี้ หรือคลิกเพื่อเลือกไฟล์")}</div>
          <div style="font-size:11.4px;color:var(--ink-3)">.pdf .txt · ${T("multiple files supported", "รองรับหลายไฟล์")}</div></div>
        <input type="file" id="fileIn" accept=".pdf,.txt,.md,.html" multiple style="display:none">
        ${files}
        <div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">
          <button class="btn s" id="btnSample">${T("Use sample text", "ใช้ข้อความตัวอย่าง")}</button>
          ${S.ceo ? `<button class="btn s" id="btnReExtract">${T("Re-extract", "ประมวลผลใหม่")}</button>` : ""}
          ${(S.ceo || isEdited()) ? `<button class="btn s" id="btnReset">${T("Reset to database", "คืนค่าจากฐานข้อมูล")}</button>` : ""}
          <button class="btn s" disabled title="${T("needs the year-by-year panel — Phase II", "ต้องใช้แผงข้อมูลรายปี — Phase II")}">${T("Compare with previous year", "เทียบกับปีก่อน")}</button>
        </div>
        <div class="note" style="margin-top:11px;font-size:11.4px">
          ${T("The year-on-year comparison needs the firm-level panel for every year, which is Phase II. The prototype uses the 2023 snapshot.",
      "การเทียบกับปีก่อนต้องใช้แผงข้อมูลรายบริษัทรายปี ซึ่งอยู่ใน Phase II · ต้นแบบใช้ภาพปี 2566")}</div>
      </div>

      <div style="display:grid;gap:14px;align-content:start">
        <div class="card">
          <h3>${T("Extracted data summary", "สรุปข้อมูลที่ดึงได้")}
            ${isEdited() ? `<span class="pill blue">${T("edited by hand", "แก้ด้วยมือ")}</span>`
      : S.ceo ? `<span class="pill ok">${T("updated from document", "อัปเดตจากเอกสาร")}</span>` : ""}</h3>
          <p class="desc">${T("Four board-composition variables plus the CEO language score. Editing any field recalculates the whole page.",
    "ตัวแปรโครงสร้างบอร์ดสี่ตัวและคะแนนภาษาผู้บริหาร · แก้ช่องใดก็ตาม ทั้งหน้าจะคำนวณใหม่ทันที")}</p>
          <div class="grid g4">${cards}</div>

          <div class="grid g2" style="margin-top:12px;align-items:center">
            <div class="excard" style="background:var(--blue-soft);border-color:var(--blue-line)">
              <div class="k">${T("CEO regulatory focus (percentile)", "ภาษาผู้บริหาร (เปอร์เซ็นไทล์)")}</div>
              <div class="v num">${c.dp}</div>
              <div style="font-size:11.2px;color:var(--ink-3)">${T("promotion focus", "ค่าดิบ promotion focus")} ${fmt(c.promo, 2)} · ${esc(confDesc(cf))}</div>
              <div class="row"><span class="pill ${cf.k}">${T("Confidence", "ความเชื่อมั่น")} ${esc(confLab(cf))}</span></div>
              <div style="margin-top:6px"><input class="inp ${(S.ov[S.t] || {}).dp !== undefined ? "edited" : ""}" data-ex="dp"
                type="number" min="0" max="100" step="1" value="${c.dp}"></div>
            </div>
            <div>
              <button class="btn p" id="btnLing" style="width:100%">${T("Send to Linguistic Analysis", "ส่งเข้าการวิเคราะห์ภาษา")}</button>
              <div style="font-size:11.4px;color:var(--ink-3);margin-top:7px;line-height:1.6">
                ${T("Counts forward-looking against guarding vocabulary in the uploaded text and converts the ratio into a market percentile.",
      "นับคำเชิงรุกเทียบคำเชิงป้องกันในข้อความที่อัปโหลด แล้วแปลงสัดส่วนเป็นเปอร์เซ็นไทล์ของตลาด")}</div>
            </div>
          </div>
          ${preview}
          <div class="note warn" style="margin-top:12px">
            <b>${T("What is honest about this prototype", "สิ่งที่ต้องบอกตามตรง")}</b> —
            ${T("CEO language is genuinely counted from the file you upload. Board composition is not yet read from the PDF; it is pre-filled from the 2019–2023 panel and is meant to be corrected by hand. Automatic board extraction and PDF source-jumping are Phase II.",
      "ภาษา CEO นับจากไฟล์ที่อัปโหลดจริง ส่วนองค์ประกอบบอร์ดยังไม่ได้อ่านจาก PDF — ระบบเติมค่าจากแผงข้อมูล 2562–2566 มาให้ก่อนแล้วให้ผู้ใช้แก้เอง · การอ่านบอร์ดอัตโนมัติและการกดตัวเลขเพื่อกระโดดไปหน้า PDF ต้นทางเป็นงาน Phase II")}</div>
        </div>
      </div>
    </div>
  </section>`;
}

/* ============================================================================
   Zone B · Automated Insight Generator
   เปลี่ยนผลของโมเดลเป็นข้อความที่ตัดสินใจต่อได้ — ทุกประโยคผูกกับตัวเลขจริง
   ============================================================================ */
const TONES = [
  { k: "investor", en: "Investor", th: "นักลงทุน" },
  { k: "board", en: "Board", th: "คณะกรรมการ" },
  { k: "search", en: "Search Firm", th: "Search Firm" },
  { k: "iod", en: "IOD", th: "IOD" },
];
const TONE_IMPL = {
  investor: {
    strength: ["For a portfolio screen this is what keeps the firm in the upper band, and it is observable from public filings so it can be monitored every year.",
      "ในมุมการคัดกรองพอร์ต นี่คือสิ่งที่ทำให้บริษัทอยู่ในกลุ่มบน และตรวจได้จากเอกสารเปิดเผย จึงติดตามได้ทุกปี"],
    constraint: ["This is the line item to raise in an engagement meeting — the cheapest change with the clearest effect on the score.",
      "นี่คือประเด็นที่ควรยกขึ้นในการเข้าพบ เป็นการเปลี่ยนที่ต้นทุนต่ำที่สุดและเห็นผลต่อคะแนนชัดที่สุด"],
    opportunity: ["Treat this as the upside case in the engagement thesis, not as a forecast of returns.",
      "ใช้เป็นกรณีขาขึ้นในเหตุผลการเข้าพบ ไม่ใช่การพยากรณ์ผลตอบแทน"],
    risk: ["Flag this in the investment memo before sizing the position.",
      "ระบุข้อนี้ในบันทึกการลงทุนก่อนกำหนดขนาดการถือครอง"],
  },
  board: {
    strength: ["Worth stating in the annual governance report as evidence of an innovation-supporting structure.",
      "ควรระบุในรายงานการกำกับดูแลกิจการประจำปี เป็นหลักฐานว่าโครงสร้างเอื้อต่อนวัตกรรม"],
    constraint: ["Put this on the nomination committee agenda before the next term expiry.",
      "ควรบรรจุเป็นวาระของคณะกรรมการสรรหาก่อนกรรมการชุดถัดไปครบวาระ"],
    opportunity: ["A single well-chosen appointment closes most of this gap.",
      "การแต่งตั้งกรรมการเพียงคนเดียวที่เลือกดี ๆ ปิดช่องว่างนี้ได้เกือบทั้งหมด"],
    risk: ["The board should record the reason it accepts, or acts on, this observation.",
      "คณะกรรมการควรบันทึกเหตุผลว่ายอมรับหรือจะดำเนินการกับข้อสังเกตนี้อย่างไร"],
  },
  search: {
    strength: ["Use this in the pitch — the mandate is not to replace what already works.",
      "ใช้ในการนำเสนอ: โจทย์ไม่ใช่การเปลี่ยนสิ่งที่ทำงานได้ดีอยู่แล้ว"],
    constraint: ["This is the gap the search mandate should be written against.",
      "นี่คือช่องว่างที่ควรใช้เขียนโจทย์การสรรหา"],
    opportunity: ["Quantifies the value of the placement — the number that justifies the fee.",
      "เป็นตัวเลขที่บอกมูลค่าของการสรรหาครั้งนี้ และใช้อธิบายค่าบริการได้"],
    risk: ["Raise it with the client before the longlist, not after.",
      "ควรคุยกับลูกค้าก่อนทำ longlist ไม่ใช่หลังจากนั้น"],
  },
  iod: {
    strength: ["A usable case study for director development programmes.",
      "ใช้เป็นกรณีศึกษาในหลักสูตรพัฒนากรรมการได้"],
    constraint: ["Maps directly onto a board evaluation criterion.",
      "แปลงเป็นเกณฑ์หนึ่งใน board evaluation ได้ทันที"],
    opportunity: ["Evidence for the policy argument that board composition and open innovation are linked.",
      "เป็นหลักฐานประกอบข้อเสนอเชิงนโยบายว่าองค์ประกอบบอร์ดสัมพันธ์กับ open innovation"],
    risk: ["Report it alongside the validity caveat when advising members.",
      "ควรรายงานพร้อมข้อจำกัดด้านความแม่นเมื่อให้คำแนะนำสมาชิก"],
  },
};
const toneImpl = kind => { const p = (TONE_IMPL[S.tone] || TONE_IMPL.search)[kind]; return S.lang === "EN" ? p[0] : p[1]; };
const FOCUS = [
  { k: "all", en: "All dimensions", th: "ทุกมิติ" },
  { k: "board", en: "Board composition", th: "โครงสร้างบอร์ด" },
  { k: "ceo", en: "CEO language", th: "ภาษาผู้บริหาร" },
];
S.focus = S.focus || "all";

/** หลักฐานของแต่ละข้อค้นพบ — บอกว่าสัมประสิทธิ์ตัวไหนหรือข้อมูลจุดไหนเป็นตัวขับ */
function evidence(c, rows) {
  return `<table><tbody>${rows.map(r => `<tr><td style="width:52%">${esc(r[0])}</td>
    <td class="n"><b>${esc(r[1])}</b></td></tr>`).join("")}</tbody></table>`;
}
function insights(c) {
  const w = waterfall(c), u = upsideOf(c), F = flagsL(c), ist = DATA.indstats[c.ind];
  const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
  const rank = pool.findIndex(x => x.t === c.t) + 1;
  const elig = S.focus === "board" ? w.steps.filter(s => s.k !== "promo")
    : S.focus === "ceo" ? w.steps.filter(s => s.k === "promo") : w.steps;
  const pickFrom = elig.length ? elig : w.steps;
  const best = pickFrom.slice().sort((a, b) => b.d - a.d)[0];
  const worst = pickFrom.slice().sort((a, b) => a.d - b.d)[0];
  const down = ipiAt(c, Object.assign(profOf(c), { fem: clamp(c.fem - .1, 0, 1), ten: c.ten + 3 })) - c.ipi;
  const val = k => k === "ten" ? fmt(c.ten, 1) + T(" yr", " ปี") : k === "pol" ? (c.pol ? T("yes", "มี") : T("no", "ไม่มี"))
    : k === "promo" ? fmt(c.promo, 2) : pct1(c[k]);
  const iref = k => k === "ten" ? fmt(ist.ten, 1) + T(" yr", " ปี") : k === "pol" ? fmt(ist.pol * 100, 0) + "%"
    : k === "promo" ? fmt(ist.promo, 2) : pct1(ist[k]);
  const out = [];

  out.push({ kind: "strength", tag: T("Strength", "จุดแข็ง"), impact: best.d,
    h: T(`${VARS[best.k].en} adds ${fmt(best.d)} points to the score`, `${VARS[best.k].th} เพิ่มคะแนน ${fmt(best.d)} จุด`),
    p: T(`Starting from a firm at the market median on every variable (OI ${fmt(w.base)}), ${c.t} reaches ${c.ipi}. CEO language sits at percentile ${c.dp}, board structure at ${ampPct(c.amp)}.`,
      `เริ่มจากบริษัทสมมติที่ทุกตัวแปรเท่าค่ากลางตลาด (OI ${fmt(w.base)}) ${c.t} ขึ้นมาที่ ${c.ipi} · ภาษาผู้บริหารอยู่ที่เปอร์เซ็นไทล์ ${c.dp} โครงสร้างบอร์ดอยู่ที่ ${ampPct(c.amp)}`),
    ev: [[T("Driver", "ตัวขับ"), vL(best.k)], [T("Coefficient β", "สัมประสิทธิ์ β"), fmt(BETA[VARS[best.k].beta], 4)],
      [T("This firm", "บริษัทนี้"), val(best.k)], [T("Industry average", "ค่าเฉลี่ยอุตสาหกรรม"), iref(best.k)],
      [T("Step in the waterfall", "ขั้นในแผนภาพน้ำตก"), sgn(best.d) + T(" pts", " จุด")]] });

  out.push({ kind: "constraint", tag: T("Constraint", "ข้อจำกัด"), impact: Math.min(0, worst.d),
    h: worst.d < 0 ? T(`${VARS[worst.k].en} costs ${fmt(-worst.d)} points`, `${VARS[worst.k].th} ทำให้เสียคะแนน ${fmt(-worst.d)} จุด`)
      : T("No single variable pulls the score down", "ไม่มีตัวแปรใดฉุดคะแนนลง"),
    p: worst.d < 0
      ? T(`On this variable the firm is at ${val(worst.k)} against an industry average of ${iref(worst.k)}.`,
        `ตัวแปรนี้บริษัทอยู่ที่ ${val(worst.k)} เทียบกับค่าเฉลี่ยอุตสาหกรรม ${iref(worst.k)}`)
      : T("Every variable is at or above the market median; the remaining distance is to the leaders of the group.",
        "ทุกตัวแปรอยู่ที่หรือสูงกว่าค่ากลางตลาด ที่เหลือคือระยะห่างจากผู้นำของกลุ่ม"),
    ev: [[T("Driver", "ตัวขับ"), vL(worst.k)], [T("Coefficient β", "สัมประสิทธิ์ β"), fmt(BETA[VARS[worst.k].beta], 4)],
      [T("This firm", "บริษัทนี้"), val(worst.k)], [T("Industry average", "ค่าเฉลี่ยอุตสาหกรรม"), iref(worst.k)],
      [T("Step in the waterfall", "ขั้นในแผนภาพน้ำตก"), sgn(worst.d) + T(" pts", " จุด")]] });

  out.push({ kind: "opportunity", tag: T("Opportunity", "โอกาส"), impact: u.delta,
    h: u.delta > 0 ? T(`Board refresh alone moves the score to ${fmt(u.best)}`, `ปรับเฉพาะโครงสร้างบอร์ดก็ขยับคะแนนไปที่ ${fmt(u.best)}`)
      : T("Board structure is already at the industry ceiling", "โครงสร้างบอร์ดอยู่ที่เพดานของอุตสาหกรรมแล้ว"),
    p: u.delta > 0
      ? T(`The ceiling is not an ideal figure — it is the best value actually observed among the ${pool.length} firms in ${indL(c.ind)}: female directors at the 90th percentile, family directors and tenure at the 10th.`,
        `เพดานนี้ไม่ใช่ค่าอุดมคติ แต่เป็นค่าที่ดีที่สุดที่พบจริงใน ${pool.length} บริษัทของกลุ่ม${IND[c.ind]} — กรรมการหญิงที่เปอร์เซ็นไทล์ 90 กรรมการครอบครัวและอายุงานที่เปอร์เซ็นไทล์ 10`)
      : T("Further gains would have to come from CEO communication rather than board composition.",
        "ส่วนที่เพิ่มได้ต่อจากนี้ต้องมาจากการสื่อสารของผู้นำ ไม่ใช่องค์ประกอบบอร์ด"),
    ev: [[T("Current OI", "OI วันนี้"), c.ipi], [T("Structural ceiling", "เพดานเชิงโครงสร้าง"), fmt(u.best)],
      [T("Female target", "เป้าหมายกรรมการหญิง"), pct1(u.target.fem)], [T("Family target", "เป้าหมายกรรมการครอบครัว"), pct1(u.target.fam)],
      [T("Tenure target", "เป้าหมายอายุงาน"), fmt(u.target.ten, 1) + T(" yr", " ปี")]] });

  const rf = F.find(x => x.lv === "crit") || F.find(x => x.lv === "warn") || F[0];
  const vr = validityRemark();
  out.push({ kind: "risk", tag: T("Risk", "ข้อควรระวัง"), impact: down,
    h: rf.lv === "ok" ? T("No structural red flag, but read the score with its limits", "ไม่พบธงความเสี่ยงเชิงโครงสร้าง แต่ต้องอ่านคะแนนพร้อมข้อจำกัด") : rf.l,
    p: rf.d + " · " + (S.lang === "EN" ? vr.label : vr.th) + " — " + vr.d,
    ev: [[T("Downside scenario", "ฉากทัศน์ถอยหลัง"), T("female −10 pts, tenure +3 yr", "กรรมการหญิง −10 จุด อายุงาน +3 ปี")],
      [T("Score effect", "ผลต่อคะแนน"), sgn(down) + T(" pts", " จุด")],
      ["Spearman", fmt(DATA.validYear.all.sp, 3)], ["AUC", fmt(DATA.validYear.all.auc, 3)],
      [T("Worst year (2022)", "ปีที่แย่ที่สุด (2565)"), "AUC " + fmt(DATA.validYear.byYear["2022"].auc, 3)]] });

  return { list: out, rank, pool, w, u };
}

function peerStrip(c) {
  const ist = DATA.indstats[c.ind], pool = indComps(c.ind);
  const med = k => qAt(pool.map(x => x[k]), .5);
  const cells = [
    { k: "OI Score", v: c.ipi, ref: fmt(med("ipi")), d: c.ipi - med("ipi") },
    { k: "CEO Drive", v: c.dp, ref: fmt(med("dp")), d: c.dp - med("dp") },
    { k: T("Board Amplification", "โครงสร้างบอร์ด"), v: ampPct(c.amp), ref: fmt(med("ap")), d: ampPct(c.amp) - med("ap") },
    { k: T("Female directors", "กรรมการหญิง"), v: pct1(c.fem), ref: pct1(ist.fem), d: (c.fem - ist.fem) * 100 },
  ];
  return `<div class="peerstrip">${cells.map(x => `<div class="pcell">
    <div class="k">${esc(x.k)}</div><div class="v num">${x.v}</div>
    <div class="d" style="color:${x.d > 0 ? "var(--ok)" : x.d < 0 ? "var(--crit)" : "var(--ink-3)"}">
      ${sgn(x.d)} ${T("vs industry median", "เทียบค่ากลางอุตสาหกรรม")} ${x.ref}</div></div>`).join("")}</div>`;
}

function zoneB() {
  const c = co(), I = insights(c);
  const list = S.sortBy === "impact" ? I.list.slice().sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)) : I.list;
  const cards = list.map((i, n) => `<div class="ins ${i.kind}" data-ins="${i.kind}">
    <div class="bd">
      <div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between">
        <div style="min-width:0"><div class="tag">${esc(i.tag)}</div><h4>${esc(i.h)}</h4></div>
        <div class="imp" style="color:${i.impact > 0 ? "var(--ok)" : i.impact < 0 ? "var(--crit)" : "var(--ink-3)"}">
          ${sgn(i.impact)}<span style="font-size:11px;font-weight:400;color:var(--ink-3)"> ${T("pts", "จุด")}</span></div>
      </div>
      <p>${esc(i.p)}</p>
      <p style="margin-top:7px;color:var(--ink);font-size:12.6px">→ ${esc(toneImpl(i.kind))}</p>
      <div class="acts">
        <button class="btn s sm" data-copy="${n}">${T("Copy", "คัดลอก")}</button>
        <button class="btn s sm" data-addrep="${n}">${S.report.includes(i.kind) ? "✓ " + T("in report", "อยู่ในรายงาน") : T("Add to Report", "เพิ่มเข้ารายงาน")}</button>
      </div>
    </div>
    <details class="blk" style="margin:0;border:0;border-top:1px solid var(--line-2);border-radius:0">
      <summary style="font-size:12.2px;color:var(--ink-2)">${T("Evidence", "หลักฐาน")}</summary>
      <div class="bd" style="padding-top:0">${evidence(c, i.ev)}</div></details>
  </div>`).join("");

  return `<section class="zone" id="zoneB">
    <div class="zhead"><div><div class="zcode">Zone B</div>
      <h2>Automated Insight Generator</h2>
      <p>${T("Model output turned into decision-ready statements, in the tone of the audience in the room.",
    "แปลผลของโมเดลเป็นข้อความที่ตัดสินใจต่อได้ ด้วยโทนของผู้ฟังในห้องนั้น")}</p></div>
      <div class="spacer"></div>
      <select class="sel" id="selFocus" style="max-width:190px">
        ${FOCUS.map(f => `<option value="${f.k}"${S.focus === f.k ? " selected" : ""}>${T("Focus:", "เน้น:")} ${esc(S.lang === "EN" ? f.en : f.th)}</option>`).join("")}
      </select>
      <button class="btn s" id="btnRegen">${T("Regenerate", "สร้างใหม่")}</button>
      <div class="seg" id="segSort">
        <button type="button" data-sort="impact" aria-selected="${S.sortBy === "impact"}">${T("By impact", "เรียงตามผล")}</button>
        <button type="button" data-sort="type" aria-selected="${S.sortBy === "type"}">${T("By type", "เรียงตามประเภท")}</button></div>
    </div>
    ${peerStrip(c)}
    <div class="card" style="margin-bottom:14px">
      <h3>${T("Where the score comes from", "คะแนนนี้มาจากไหน")}</h3>
      <p class="desc">${T("Each variable is switched from the market median to this firm's actual value, one at a time. The steps always add up to the real score.",
    "เปลี่ยนทีละตัวแปรจากค่ากลางตลาดเป็นค่าจริงของบริษัท ผลรวมของทุกขั้นเท่ากับคะแนนจริงเสมอ")}</p>
      ${wfSvg(c)}
    </div>
    <div class="grid g2" style="align-items:start">${cards}</div>
  </section>`;
}

/* ============================================================================
   Zone C · Board Refresh Recommendation Engine
   ============================================================================ */
const HORIZON = [
  { k: "agm", en: "Next AGM", th: "AGM ถัดไป", maxHard: 1 },
  { k: "12m", en: "12 months", th: "12 เดือน", maxHard: 2 },
  { k: "24m", en: "24 months", th: "24 เดือน", maxHard: 3 },
];
const PRIORITY = [
  { k: "max", en: "Max OI Score", th: "คะแนนสูงสุด" },
  { k: "bal", en: "Balanced", th: "สมดุล" },
  { k: "low", en: "Lowest disruption", th: "กระทบน้อยที่สุด" },
];
const HARD = { 1: { en: "Easy", th: "ทำได้เร็ว", k: "ok" }, 2: { en: "Moderate", th: "ปานกลาง", k: "warn" }, 3: { en: "Difficult", th: "ต้องใช้เวลา", k: "crit" } };
const KEYWORDS = {
  fem: [["Female", "กรรมการหญิง"], ["Independent", "กรรมการอิสระ"], ["Digital / innovation experience", "ประสบการณ์ดิจิทัลหรือนวัตกรรม"], ["No family linkage", "ไม่มีความเชื่อมโยงกับครอบครัวผู้ถือหุ้น"]],
  fam: [["Independent", "กรรมการอิสระ"], ["No shareholder linkage", "ไม่มีความเชื่อมโยงกับผู้ถือหุ้นใหญ่"], ["Audit / governance track record", "มีประสบการณ์ด้านตรวจสอบหรือธรรมาภิบาล"]],
  ten: [["New to this board", "ยังไม่เคยเป็นกรรมการของบริษัทนี้"], ["Cross-industry experience", "ประสบการณ์ข้ามอุตสาหกรรม"], ["Active executive", "ยังเป็นผู้บริหารที่ทำงานอยู่"]],
};
/** โครงสร้างบอร์ดเป้าหมาย — ค่าที่ดีที่สุดที่พบจริงในอุตสาหกรรม ปรับด้วยข้อจำกัดที่ผู้ใช้เปิด */
function targetBoard(c) {
  const pool = indComps(c.ind);
  let fem = Math.max(c.fem, qAt(pool.map(x => x.fem), .9));
  let fam = Math.min(c.fam, qAt(pool.map(x => x.fam), .1));
  let ten = Math.min(c.ten, qAt(pool.map(x => x.ten), .1));
  if (S.cons.fem30) fem = Math.max(fem, .30);      // เป้าหมายกรรมการหญิงอย่างน้อย 30%
  if (S.cons.fam25) fam = Math.min(fam, .25);      // จำกัดกรรมการครอบครัวไม่เกิน 25%
  return { promo: c.promo, pol: c.pol, fem, fam, ten };
}
/** คันโยกทั้งหมด พร้อมชนิดการกระทำ ผลต่อคะแนน และความยากง่าย */
function levers(c) {
  const tg = targetBoard(c), out = [];
  const add = (k, act, dEn, dTh, hard) => {
    const d = lever(c, k, tg[k]);
    out.push({ k, act, d, hard: clamp(hard, 1, 3), tg: tg[k],
      en: dEn, th: dTh, kw: KEYWORDS[k] || [] });
  };
  if (tg.fem > c.fem + 1e-9) {
    const pt = (tg.fem - c.fem) * 100;
    add("fem", S.cons.sizeFixed ? "replace" : "add",
      `${S.cons.sizeFixed ? "Replace seats with" : "Add"} independent female directors — ${pct1(c.fem)} → ${pct1(tg.fem)} (${sgn(pt)} pts of the board)`,
      `${S.cons.sizeFixed ? "เปลี่ยนที่นั่งเป็น" : "เพิ่ม"}กรรมการอิสระหญิง — ${pct1(c.fem)} → ${pct1(tg.fem)} (${sgn(pt)} จุดของสัดส่วนบอร์ด)`,
      pt <= 8 ? 1 : pt <= 18 ? 2 : 3);
  }
  if (tg.fam < c.fam - 1e-9) {
    const pt = (c.fam - tg.fam) * 100;
    add("fam", "reduce",
      `Reduce family-affiliated seats — ${pct1(c.fam)} → ${pct1(tg.fam)}`,
      `ลดสัดส่วนกรรมการที่ผูกกับครอบครัว — ${pct1(c.fam)} → ${pct1(tg.fam)}`,
      pt <= 10 ? 2 : 3);
  }
  if (tg.ten < c.ten - 1e-9) {
    const yr = c.ten - tg.ten;
    add("ten", "replace",
      `Rotate long-serving seats — average tenure ${fmt(c.ten, 1)} → ${fmt(tg.ten, 1)} yr (${fmt(yr, 1)} yr shorter)`,
      `หมุนเวียนกรรมการที่อยู่นาน — อายุงานเฉลี่ย ${fmt(c.ten, 1)} → ${fmt(tg.ten, 1)} ปี (สั้นลง ${fmt(yr, 1)} ปี)`,
      yr <= 2 ? 1 : yr <= 4.5 ? 2 : 3);
  }
  return out.sort((a, b) => b.d - a.d);
}
/** คันโยกที่ผ่านทั้งกรอบเวลาและโหมดการจัดลำดับ */
function selectedLevers(c) {
  const all = levers(c);
  const hz = HORIZON.find(h => h.k === S.horizon) || HORIZON[1];
  let sel = all.filter(x => x.hard <= hz.maxHard);
  if (S.priority === "low") sel = sel.filter(x => x.hard <= 1);
  else if (S.priority === "bal" && sel.length > 1) {
    const mx = Math.max(...sel.map(x => x.d));
    sel = sel.filter(x => x.hard <= 2 || x.d >= mx * .5);
  }
  return { all, sel, hz };
}
/** คะแนนหลังใช้เฉพาะคันโยกที่เลือก */
function scenarioOf(c) {
  const { all, sel } = selectedLevers(c);
  const p = profOf(c), tg = targetBoard(c);
  sel.forEach(x => { p[x.k] = tg[x.k]; });
  return { now: c.ipi, after: ipiAt(c, p), target: p, sel, all };
}

function zoneC() {
  const c = co(), sc = scenarioOf(c), rec = recL(c), tg = targetBoard(c);
  const pool = indComps(c.ind);
  const bars = [
    { k: "fem", l: vL("fem"), now: c.fem * 100, tgt: tg.fem * 100, u: "%", scale: Math.max(c.fem, tg.fem, .4) * 100 },
    { k: "fam", l: vL("fam"), now: c.fam * 100, tgt: tg.fam * 100, u: "%", scale: Math.max(c.fam, tg.fam, .4) * 100 },
    { k: "ten", l: vL("ten"), now: c.ten, tgt: tg.ten, u: T(" yr", " ปี"), scale: Math.max(c.ten, tg.ten, 15) },
  ];
  const cmp = bars.map(b => {
    const same = Math.abs(b.now - b.tgt) < .05;
    const diff = b.tgt - b.now;
    return `<div class="cmprow"><span>${esc(b.l)}</span>
      <div class="tk"><div class="fl now" style="width:${clamp(b.now / b.scale * 100, 2, 100).toFixed(1)}%"></div></div>
      <b class="n num">${fmt(b.now, 1)}${b.u}</b></div>
    <div class="cmprow"><span style="color:var(--ink-3);font-size:11.8px">${T("recommended", "ที่แนะนำ")}</span>
      ${same ? `<div style="font-size:11.6px;color:var(--ok)">✓ ${T("already at the best value observed", "อยู่ที่ค่าที่ดีที่สุดที่พบจริงแล้ว")}</div><b class="n num" style="color:var(--ink-3)">—</b>`
      : `<div class="tk"><div class="fl" style="width:${clamp(b.tgt / b.scale * 100, 2, 100).toFixed(1)}%"></div></div>
         <b class="n num" style="color:var(--mint-ink)">${fmt(b.tgt, 1)}${b.u}<div style="font-size:10.4px;font-weight:400;color:var(--ink-3)">${sgn(diff)}</div></b>`}</div>`;
  }).join("");

  const ACT = { add: { en: "Add", th: "เพิ่ม", k: "ok" }, replace: { en: "Replace", th: "เปลี่ยน", k: "blue" }, reduce: { en: "Reduce", th: "ลด", k: "warn" } };
  const recs = sc.all.length ? sc.all.map(x => {
    const inSel = sc.sel.some(s => s.k === x.k);
    return `<div class="rec" style="${inSel ? "" : "opacity:.55"}">
      <div class="hd"><div style="min-width:0">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:3px">
          <span class="pill ${ACT[x.act].k}">${esc(S.lang === "EN" ? ACT[x.act].en : ACT[x.act].th)}</span>
          <span class="pill ${HARD[x.hard].k}">${esc(S.lang === "EN" ? HARD[x.hard].en : HARD[x.hard].th)}</span>
          ${inSel ? "" : `<span class="pill mute">${T("outside the selected horizon", "อยู่นอกกรอบเวลาที่เลือก")}</span>`}</div>
        <b>${esc(S.lang === "EN" ? x.en : x.th)}</b>
        <div class="kw">${x.kw.map(k => `<span>${esc(S.lang === "EN" ? k[0] : k[1])}</span>`).join("")}</div></div>
      <div class="imp">${sgn(x.d)}<div style="font-size:10.6px;font-weight:400;color:var(--ink-3)">${T("OI pts", "จุด OI")}</div></div></div>
    </div>`; }).join("")
    : `<div class="note ok">${T("Board composition already sits at the best values observed in this industry — there is no structural lever left to pull.",
      "โครงสร้างบอร์ดอยู่ที่ค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมนี้แล้ว ไม่มีคันโยกเชิงโครงสร้างเหลือให้ปรับ")}</div>`;

  return `<section class="zone" id="zoneC">
    <div class="zhead"><div><div class="zcode">Zone C</div>
      <h2>Board Refresh Recommendation Engine</h2>
      <p>${T("Actionable recommendations ranked by the score impact each change would produce, filtered by the constraints and time horizon you set.",
    "ข้อเสนอที่ทำต่อได้ จัดลำดับตามผลต่อคะแนน และกรองด้วยข้อจำกัดกับกรอบเวลาที่ตั้งไว้")}</p></div></div>

    <div class="grid gzc">
      <div style="display:grid;gap:14px">
        <div class="card">
          <h3>${T("Current vs recommended", "ปัจจุบันเทียบกับที่แนะนำ")}</h3>
          <p class="desc">${T(`Reference group: ${pool.length} firms in ${indL(c.ind)}. Targets are values observed in the group, not ideals.`,
      `กลุ่มอ้างอิง ${pool.length} บริษัทในกลุ่ม${IND[c.ind]} · เป้าหมายเป็นค่าที่พบจริง ไม่ใช่ค่าอุดมคติ`)}</p>
          ${cmp}
        </div>
        <div class="card">
          <h3>${T("Constraints", "ข้อจำกัดที่ใช้")}</h3>
          <p class="desc">${T("These change the recommended target, not just the wording.", "ข้อจำกัดเหล่านี้เปลี่ยนเป้าหมายที่แนะนำจริง ไม่ใช่แค่ถ้อยคำ")}</p>
          <div class="ctrl">
            <label><input type="checkbox" data-cons="sizeFixed"${S.cons.sizeFixed ? " checked" : ""}>
              ${T("Keep board size unchanged (replace instead of add)", "คงขนาดคณะกรรมการเดิม (เปลี่ยนแทนการเพิ่ม)")}</label>
            <label><input type="checkbox" data-cons="fem30"${S.cons.fem30 ? " checked" : ""}>
              ${T("Female directors at least 30%", "กรรมการหญิงอย่างน้อย 30%")}</label>
            <label><input type="checkbox" data-cons="fam25"${S.cons.fam25 ? " checked" : ""}>
              ${T("Family-affiliated seats at most 25%", "กรรมการที่ผูกกับครอบครัวไม่เกิน 25%")}</label>
          </div>
          <div style="display:grid;gap:9px;margin-top:13px">
            <div><div style="font-size:11.4px;color:var(--ink-3);margin-bottom:4px">${T("Time horizon", "กรอบเวลา")}</div>
              <div class="seg" id="segHz" style="width:100%">${HORIZON.map(h => `<button type="button" data-hz="${h.k}"
                aria-selected="${S.horizon === h.k}" style="flex:1">${esc(S.lang === "EN" ? h.en : h.th)}</button>`).join("")}</div></div>
            <div><div style="font-size:11.4px;color:var(--ink-3);margin-bottom:4px">${T("Priority mode", "โหมดการจัดลำดับ")}</div>
              <div class="seg" id="segPr" style="width:100%">${PRIORITY.map(p => `<button type="button" data-pr="${p.k}"
                aria-selected="${S.priority === p.k}" style="flex:1">${esc(S.lang === "EN" ? p.en : p.th)}</button>`).join("")}</div></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>${T("Ranked recommendations", "ข้อเสนอเรียงตามผล")}</h3>
        <p class="desc">${T("Each impact is the effect of that action alone, holding everything else fixed. Greyed rows fall outside the selected horizon or priority mode.",
      "ตัวเลขคือผลของการทำข้อนั้นข้อเดียว โดยตรึงตัวแปรอื่นไว้ · แถวที่จางคืออยู่นอกกรอบเวลาหรือโหมดที่เลือก")}</p>
        <div style="display:grid;gap:9px">${recs}</div>
        ${sc.sel.length > 1 ? `<div style="font-size:11.4px;color:var(--ink-3);margin-top:10px;line-height:1.62">
          ${T(`The individual impacts do not add up to ${sgn(sc.after - sc.now)} — percentiles are not linear, so doing everything together is worth less than the sum of the parts.`,
        `ผลของแต่ละข้อรวมกันแล้วไม่เท่ากับ ${sgn(sc.after - sc.now)} เพราะเปอร์เซ็นไทล์ไม่ใช่ฟังก์ชันเชิงเส้น การทำพร้อมกันจึงได้น้อยกว่าผลรวมของแต่ละข้อ`)}</div>` : ""}
        <div class="note warn" style="margin-top:12px">
          <b>${T("Political ties are never a recommendation", "ไม่ตั้งกรรมการสายนโยบายเป็นเป้าหมาย")}</b> —
          ${T("The coefficient is positive (β = +0.48) but the engine excludes it on purpose: it is not a legitimate criterion for selecting directors, and using it that way would turn a diagnostic into a screening rule for individuals.",
        "สัมประสิทธิ์เป็นบวก (β = +0.48) แต่ระบบตัดออกจากชุดข้อเสนอโดยตั้งใจ เพราะไม่ใช่เกณฑ์ที่ควรใช้คัดเลือกกรรมการ และการใช้แบบนั้นจะเปลี่ยนเครื่องมือวินิจฉัยให้กลายเป็นเกณฑ์กลั่นกรองรายบุคคล")}</div>
      </div>

      <div style="display:grid;gap:14px">
        <div class="scn">
          <small>${T("Scenario impact", "ผลของฉากทัศน์")}</small>
          <div class="big">${sc.now} <span style="opacity:.5">→</span> <em>${fmt(sc.after)}</em></div>
          <p>${sc.after > sc.now
      ? T(`Applying the ${sc.sel.length} selected action${sc.sel.length > 1 ? "s" : ""} within ${S.lang === "EN" ? (HORIZON.find(h => h.k === S.horizon) || {}).en : (HORIZON.find(h => h.k === S.horizon) || {}).th} lifts the score by ${fmt(sc.after - sc.now)} points. CEO language is left untouched.`,
        `ทำ ${sc.sel.length} ข้อที่เลือกภายใน${(HORIZON.find(h => h.k === S.horizon) || {}).th} จะเพิ่มคะแนน ${fmt(sc.after - sc.now)} จุด โดยไม่แตะภาษาผู้บริหาร`)
      : T("No action falls inside the selected horizon and priority mode.", "ไม่มีข้อเสนอใดอยู่ในกรอบเวลาและโหมดที่เลือก")}</p>
          <div style="display:flex;gap:5px;align-items:flex-end;height:70px;margin-top:14px">
            ${(() => { const w = waterfall(c); let acc = w.base;
        return [{ v: w.base, c: "rgba(255,255,255,.28)" }]
          .concat(w.steps.map(s => { acc += s.d; return { v: acc, c: s.d < 0 ? "var(--s2)" : "rgba(119,242,161,.75)" }; }))
          .concat([{ v: sc.after, c: "var(--mint)" }])
          .map(b => `<i style="flex:1;display:block;border-radius:5px 5px 2px 2px;background:${b.c};height:${clamp(b.v, 4, 100)}%"></i>`).join(""); })()}
          </div>
          <div style="font-size:10.6px;color:#9FB6CC;margin-top:6px">${T("market median → each variable → scenario", "ค่ากลางตลาด → ทีละตัวแปร → ฉากทัศน์")}</div>
          <div style="display:grid;gap:7px;margin-top:14px">
            <button class="btn m" id="btnApply">${T("Apply Scenario in What-if Studio", "ส่งฉากทัศน์เข้า What-if Studio")}</button>
            <button class="btn" id="btnBrief" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#fff">${T("Generate Candidate Brief", "สร้างโจทย์การสรรหากรรมการ")}</button>
          </div>
        </div>
        <div class="card">
          <h3>${T("What the engine suggests", "ข้อเสนอโดยรวมของระบบ")}</h3>
          <div class="note brand" style="margin-top:4px"><b style="color:${rec.c}">${esc(rec.l)}</b> — ${esc(rec.d)}</div>
          <div style="display:grid;gap:7px;margin-top:12px">
            <button class="btn" id="btnMemo">${T("Export Board Memo", "ออกบันทึกวาระประชุม")}</button>
            <button class="btn s" id="btnSaveScn">${T("Save scenario", "บันทึกฉากทัศน์")}</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/* ============================================================================
   หน้าแรกหลังเข้าสู่ระบบ · Company Overview
   ============================================================================ */
function matrixSvg(c) {
  const pool = indComps(c.ind);
  const px = pool.map(x => x.promo), ax = pool.map(x => x.amp);
  const xr = [Math.min(...px, c.promo), Math.max(...px, c.promo)];
  const yr = [Math.min(...ax, c.amp), Math.max(...ax, c.amp)];
  const padx = (xr[1] - xr[0]) * .07 || .1, pady = (yr[1] - yr[0]) * .07 || .1;
  const W = 720, H = 400, L = 46, R = 16, Tp = 20, B = 42;
  const X = v => L + (v - (xr[0] - padx)) / ((xr[1] + padx) - (xr[0] - padx)) * (W - L - R);
  const Y = v => H - B - (v - (yr[0] - pady)) / ((yr[1] + pady) - (yr[0] - pady)) * (H - Tp - B);
  const cx = X(NEU.promo), cy = Y(NEU.amp), zk = zoneOf(c.promo, c.amp);
  const rect = (x0, y0, x1, y1, k) => `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}"
    height="${Math.abs(y1 - y0)}" fill="${ZONES[k].c}" fill-opacity="${k === zk ? .1 : .04}"/>`;
  const dots = pool.filter(x => x.t !== c.t).map(x => `<circle cx="${X(x.promo).toFixed(1)}" cy="${Y(x.amp).toFixed(1)}" r="4.2"
    fill="${ZONES[zoneOf(x.promo, x.amp)].c}" fill-opacity=".45" stroke="var(--panel)" stroke-width="1.1"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${T("Strategy matrix", "เมทริกซ์กลยุทธ์")}">
    ${rect(cx, Tp, W - R, cy, "engine")}${rect(cx, cy, W - R, H - B, "constrained")}
    ${rect(L, Tp, cx, cy, "primed")}${rect(L, cy, cx, H - B, "dormant")}
    <line x1="${cx}" y1="${Tp}" x2="${cx}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
    <line x1="${L}" y1="${cy}" x2="${W - R}" y2="${cy}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
    <text x="${cx + 8}" y="${Tp + 13}" font-size="11" font-weight="600" fill="var(--ok)">Innovation Engine</text>
    <text x="${cx - 8}" y="${Tp + 13}" font-size="11" font-weight="600" fill="var(--blue)" text-anchor="end">Primed Board</text>
    <text x="${cx + 8}" y="${H - B - 7}" font-size="11" font-weight="600" fill="var(--warn)">Constrained Drive</text>
    <text x="${cx - 8}" y="${H - B - 7}" font-size="11" font-weight="600" fill="var(--crit)" text-anchor="end">Dormant</text>
    ${dots}
    <g transform="translate(${X(c.promo).toFixed(1)},${Y(c.amp).toFixed(1)})">
      <path d="M0-9.5 9.5 0 0 9.5-9.5 0Z" fill="var(--panel)"/><path d="M0-7 7 0 0 7-7 0Z" fill="var(--navy)"/></g>
    ${(() => { const px = X(c.promo), right = px > W - 150;
      return `<text x="${(px + (right ? -14 : 14)).toFixed(1)}" y="${(Y(c.amp) + 4).toFixed(1)}" font-size="12"
        font-weight="600" fill="var(--ink)" text-anchor="${right ? "end" : "start"}">${esc(c.t)} · OI ${c.ipi}</text>`; })()}
    <text x="${((L + W - R) / 2).toFixed(0)}" y="${H - 9}" font-size="11" fill="var(--ink-2)" text-anchor="middle">CEO Regulatory Focus →</text>
    <text transform="translate(13,${((Tp + H - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">Board Amplification →</text>
  </svg>
  <div class="legend">${Object.entries(ZONES).map(([k, v]) => `<span><i style="background:${v.c};opacity:.5"></i>${v.l}</span>`).join("")}
    <span><i class="dia" style="background:var(--navy)"></i>${esc(c.t)}</span></div>`;
}

const CMP_ROWS = [
  { en: "OI Score", th: "คะแนน OI", f: c => c.ipi, hi: 1, big: 1 },
  { en: "CEO Regulatory Focus (pct)", th: "ภาษาผู้บริหาร (เปอร์เซ็นไทล์)", f: c => c.dp, hi: 1 },
  { en: "Board Amplification (pct)", th: "โครงสร้างบอร์ด (เปอร์เซ็นไทล์)", f: c => ampPct(c.amp), hi: 1 },
  { en: "Female directors", th: "กรรมการหญิง", f: c => c.fem * 100, hi: 1, d: 1, u: "%" },
  { en: "Family directors", th: "กรรมการครอบครัว", f: c => c.fam * 100, hi: 0, d: 1, u: "%" },
  { en: "Board tenure", th: "อายุงานเฉลี่ยบอร์ด", f: c => c.ten, hi: 0, d: 1, uen: " yr", u: " ปี" },
  { en: "Upside from board refresh", th: "ศักยภาพจากการปรับบอร์ด", f: c => upsideOf(c).delta, hi: 1 },
  { en: "Open-innovation events", th: "กิจกรรมนวัตกรรมเปิดที่นับได้", f: c => c.oi, hi: 1 },
];
function autoPeers(c) {
  const pool = COMPS.filter(x => x.t !== c.t).sort((a, b) => b.ipi - a.ipi);
  const same = pool.filter(x => x.ind === c.ind), out = [];
  if (same[0]) out.push(same[0]);
  const near = same.filter(x => !out.some(o => o.t === x.t)).sort((a, b) => Math.abs(a.ipi - c.ipi) - Math.abs(b.ipi - c.ipi))[0];
  if (near) out.push(near);
  const cross = pool.find(x => x.ind !== c.ind);
  if (cross) out.push(cross);
  return out.slice(0, 3).map(x => x.t);
}
function peerTable(c, peers) {
  const all = [c, ...peers];
  return `<div class="tw"><table><thead><tr><th>${T("Metric", "ตัวชี้วัด")}</th>
    ${all.map((x, i) => `<th class="n">${esc(x.t)}${i === 0 ? ` <span class="pill blue">${T("this firm", "บริษัทนี้")}</span>` : ""}</th>`).join("")}</tr></thead><tbody>
    ${CMP_ROWS.map(r => { const vs = all.map(r.f), best = r.hi ? Math.max(...vs) : Math.min(...vs);
    return `<tr${r.big ? ' style="background:var(--panel-2)"' : ""}><td>${esc(S.lang === "EN" ? r.en : r.th)}</td>
      ${vs.map(v => `<td class="n"${Math.abs(v - best) < 1e-9 ? ' style="font-weight:600"' : ""}>${fmt(v, r.d || 0)}${(S.lang === "EN" ? (r.uen || r.u) : r.u) || ""}${Math.abs(v - best) < 1e-9 ? ' <span style="color:var(--mint-ink)">✦</span>' : ""}</td>`).join("")}</tr>`; }).join("")}
  </tbody></table></div>
  <div style="font-size:11.2px;color:var(--ink-3);margin-top:7px">✦ ${T("best value in the row — the system already knows which rows are better when lower.",
    "ค่าที่ดีที่สุดในแถว — ระบบคิดทิศทางให้แล้วว่าแถวไหนน้อยกว่าดีกว่า")}</div>`;
}
function natTable(c, limit) {
  const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
  const rows = limit ? pool.slice(0, limit) : pool;
  return `<div class="tw"><table><thead><tr><th>#</th><th>${T("Company", "บริษัท")}</th><th class="n">OI</th>
    <th class="n">CEO</th><th class="n">Board</th><th class="n">${T("Upside", "เพิ่มได้")}</th><th>${T("Risk", "ความเสี่ยง")}</th></tr></thead><tbody>
    ${rows.map((x, i) => { const r = riskLevel(x), u = upsideOf(x);
    return `<tr${x.t === c.t ? ' style="background:var(--blue-soft)"' : ""}><td class="n">${i + 1}</td>
      <td><b>${esc(x.t)}</b> <span style="color:var(--ink-3);font-size:11.4px">${esc(x.n)}</span></td>
      <td class="n"><b>${x.ipi}</b></td><td class="n">${x.dp}</td><td class="n">${ampPct(x.amp)}</td>
      <td class="n">${u.delta > 0 ? "+" + fmt(u.delta) : "—"}</td>
      <td><span class="pill ${pillOf(r.k)}">${esc(levelL(r.l))}</span></td></tr>`; }).join("")}
  </tbody></table></div>
  ${limit ? "" : `<button class="btn s" id="btnCsv" style="margin-top:12px">${T("Download CSV", "ดาวน์โหลด CSV")}</button>`}`;
}
function lockCard(what, title, body) {
  return `<div class="paywall"><div class="paycard"><div class="lk">🔒</div>
    <h3 style="font-size:15.5px;margin-bottom:5px">${esc(title)}</h3>
    <p style="font-size:12.6px;color:var(--ink-2);margin:0 0 14px;line-height:1.68">${body}</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="btn p" data-unlock="${what}">${T("Unlock", "ปลดล็อก")} · ${PRICE[what]} token</button>
      <button class="btn s" data-topup="1">${T("Top up tokens", "เติม token")}</button></div>
    <div style="font-size:11.4px;color:var(--ink-3);margin-top:10px">
      ${T("You have", "คุณมี")} <b style="color:var(--ink)">${S.tokens}</b> token ·
      ${T("minimum purchase 3 tokens", "ซื้อขั้นต่ำ 3 token")}</div></div></div>`;
}

function tabOverview() {
  const c = co(), z = ZONES[zoneOf(c.promo, c.amp)], u = upsideOf(c), e = engagement(c), vr = validityRemark();
  const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
  const rank = pool.findIndex(x => x.t === c.t) + 1;
  if (!S.peers.length) S.peers = autoPeers(c);
  const peers = S.peers.map(t => byT[t]).filter(Boolean);

  const peerInner = `<div class="card"><h3>${T("Head-to-head comparison", "ตารางเทียบตัวต่อตัว")}</h3>
    <p class="desc">${T("Up to three peers, and they may sit in other sectors — cross-sector comparison is inside the MVP scope.",
    "เลือกได้สูงสุด 3 บริษัท และข้ามกลุ่มอุตสาหกรรมได้ตามขอบเขต MVP")}</p>
    <div id="peerPick" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>
    ${peerTable(c, peers)}</div>`;
  const natInner = `<div class="card"><h3>${T("Industry report", "รายงานระดับอุตสาหกรรม")}</h3>
    <p class="desc">${T(`Full ranking of all ${pool.length} firms in ${indL(c.ind)}, exportable as CSV.`,
    `จัดอันดับครบทั้ง ${pool.length} บริษัทในกลุ่ม${IND[c.ind]} ส่งออกเป็น CSV ได้`)}</p>
    ${isUnlocked("national") ? natTable(c) : natTable(c, 6)}</div>`;

  return `<section class="zone">
    <div class="zhead"><div><div class="zcode">${T("Company overview", "ภาพรวมบริษัท")}</div>
      <h2>${esc(c.t)} · ${esc(c.n)}</h2>
      <p>${esc(indL(c.ind))} · ${T("Annual Report 2023 / 56-1 One Report", "รายงานประจำปี 2566 / 56-1 One Report")} ·
        ${T(`rank ${rank} of ${pool.length} in the industry`, `อันดับ ${rank} จาก ${pool.length} ในอุตสาหกรรม`)}</p></div>
      <div class="spacer"></div>
      <button class="btn p" data-go="assess">${T("Open Assessment workspace", "เข้าสู่ Assessment workspace")}</button>
    </div>

    <div class="grid g4" style="margin-bottom:14px">
      <div class="stat hero"><div class="k">OpenInnoScore</div><div class="v num">${c.ipi}</div>
        <div class="u">${esc(z.l)} · ${T("structural ceiling", "เพดานเชิงโครงสร้าง")} ${fmt(u.best)}</div></div>
      <div class="stat"><div class="k">CEO Regulatory Focus</div><div class="v num">${c.dp}</div>
        <div class="u">${T("percentile of market", "เปอร์เซ็นไทล์ในตลาด")}</div></div>
      <div class="stat"><div class="k">Board Amplification</div><div class="v num">${ampPct(c.amp)}</div>
        <div class="u">${T("percentile of market", "เปอร์เซ็นไทล์ในตลาด")}</div></div>
      <div class="stat"><div class="k">${T("Engagement priority", "ลำดับการเข้าพบ")}</div><div class="v num">${e.score}</div>
        <div class="u">${T("priority", "ความสำคัญ")} ${esc(levelL(e.tier.l))}</div></div>
    </div>

    <div class="note ${vr.k}" style="margin-bottom:14px">
      <b>${esc(S.lang === "EN" ? vr.label : vr.th)}</b> — ${esc(vr.d)}
      ${S.plan === "pro" ? ` · <button class="lnk" data-go="valid">${T("see the full validity table", "ดูตาราง Validity ฉบับเต็ม")}</button>`
      : ` · ${T("the full year-by-year table is a Pro feature", "ตารางรายปีฉบับเต็มเป็นสิทธิ์ของผู้ใช้ Pro")}`}</div>

    <div class="grid gside">
      <div class="card"><h3>${T("Strategy matrix", "เมทริกซ์กลยุทธ์")}</h3>
        <p class="desc">${T("Horizontal = CEO regulatory focus · vertical = the board's ability to amplify that signal · dashed lines = market average.",
      "แกนนอน = ภาษาเชิงรุกของผู้บริหาร · แกนตั้ง = ความสามารถของบอร์ดในการขยายสัญญาณ · เส้นประ = ค่าเฉลี่ยตลาด")}</p>
        ${matrixSvg(c)}</div>
      <div style="display:grid;gap:14px;align-content:start">
        <div class="card"><h3>${T("Board composition", "องค์ประกอบคณะกรรมการ")}</h3>
          <div class="tw"><table><tbody>
            ${[[vL("fem"), pct1(c.fem)], [vL("fam"), pct1(c.fam)], [vL("pol"), c.pol ? T("Yes", "มี") : T("No", "ไม่มี")],
        [vL("ten"), fmt(c.ten, 1) + T(" yr", " ปี")], [T("Promotion focus (raw)", "Promotion focus (ค่าดิบ)"), fmt(c.promo, 2)],
        [T("Open-innovation events", "กิจกรรมนวัตกรรมเปิด"), fmt(c.oi)]]
        .map(r => `<tr><td>${esc(r[0])}</td><td class="n"><b>${r[1]}</b></td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="card"><h3>${T("Where to go next", "ไปต่อที่ไหน")}</h3>
          <div style="display:grid;gap:7px">
            <button class="btn p" data-go="assess">${T("Assessment — upload and analyse", "Assessment — อัปโหลดและวิเคราะห์")}</button>
            <button class="btn" data-go="whatif">${T("What-if Studio — simulate a board change", "What-if Studio — จำลองการปรับบอร์ด")}</button>
            <button class="btn s" data-go="valid">${T("Validity — how far the score can be trusted", "Validity — คะแนนนี้เชื่อได้แค่ไหน")}</button>
          </div></div>
      </div>
    </div>

    <div style="margin-top:14px">
      ${isUnlocked("peer") ? peerInner : `<div class="lockwrap"><div class="blurred" aria-hidden="true">${peerInner}</div>
        ${lockCard("peer", T("Peer comparison", "เทียบคู่แข่ง"),
      T("Compare this company against up to three others, in any sector. Unlock once, then change the peers as often as you like.",
        "เทียบบริษัทนี้กับอีกไม่เกิน 3 ราย ข้ามกลุ่มอุตสาหกรรมได้ · ปลดล็อกครั้งเดียวแล้วเปลี่ยนคู่เทียบได้ไม่จำกัด"))}</div>`}
    </div>
    <div style="margin-top:14px">
      ${isUnlocked("national") ? natInner : `<div class="lockwrap"><div class="blurred" aria-hidden="true">${natInner}</div>
        ${lockCard("national", T("Industry report", "รายงานระดับอุตสาหกรรม"),
      T("The full ranked table for this industry plus CSV export.", "ตารางจัดอันดับครบทั้งกลุ่มพร้อมส่งออก CSV"))}</div>`}
    </div>
  </section>`;
}

/* ============================================================================
   What-if Studio · Deterministic scenario analysis
   ปรับค่าตัวแปรตรง ๆ แล้วคำนวณคะแนนใหม่จากสมการเดิม จึงอธิบายที่มาได้ทุกจุด
   ============================================================================ */
const WI_CTRL = [
  { k: "fem", en: "Female directors", th: "กรรมการหญิง", min: 0, max: 60, step: .5, pct: 1 },
  { k: "fam", en: "Family directors", th: "กรรมการครอบครัว", min: 0, max: 80, step: .5, pct: 1 },
  { k: "ten", en: "Average tenure", th: "อายุงานเฉลี่ยบอร์ด", min: 0, max: 25, step: .1, unit: T(" yr", " ปี") },
  { k: "dp", en: "CEO regulatory focus", th: "ภาษาผู้บริหาร", min: 0, max: 100, step: 1, unit: "" },
];
function wiInit(force) {
  const c = co();
  if (!S.wi || force || S.wi._t !== S.t) S.wi = { _t: S.t, fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten, dp: c.dp };
  return S.wi;
}
const wiProfile = () => { const w = wiInit(); return { promo: promoAtPct(w.dp), fem: w.fem, fam: w.fam, pol: w.pol, ten: w.ten }; };
const wiScore = () => { const c = co(), p = wiProfile();
  return Math.round(.5 * S.wi.dp + .5 * ampPct(ampOf(p.fam, p.pol, p.fem, p.ten))); };

function presets(c) {
  const pool = indComps(c.ind);
  const p90f = qAt(pool.map(x => x.fem), .9), p10a = qAt(pool.map(x => x.fam), .1),
    medT = qAt(pool.map(x => x.ten), .5), p10t = qAt(pool.map(x => x.ten), .1), p90d = qAt(pool.map(x => x.dp), .9);
  return [
    { k: "current", en: "Current", th: "สถานะปัจจุบัน",
      den: "The board exactly as filed", dth: "โครงสร้างบอร์ดตามที่เปิดเผยไว้",
      v: { fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten, dp: c.dp } },
    { k: "optimistic", en: "Optimistic Board", th: "บอร์ดแบบตั้งใจปรับ",
      den: "Lower family, higher female, moderate tenure", dth: "ลดกรรมการครอบครัว เพิ่มกรรมการหญิง อายุงานปานกลาง",
      v: { fem: Math.max(c.fem, p90f), fam: Math.min(c.fam, p10a), pol: c.pol, ten: Math.min(c.ten, medT), dp: c.dp } },
    { k: "statusquo", en: "Conservative / status quo", th: "คงเดิม ไม่เปลี่ยนอะไร",
      den: "Nothing changes and the same board serves three more years", dth: "ไม่เปลี่ยนอะไร และบอร์ดชุดเดิมอยู่ต่ออีก 3 ปี",
      v: { fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten + 3, dp: c.dp } },
    { k: "compliant", en: "Regulatory-compliant minimum", th: "ขั้นต่ำตามแนวปฏิบัติ",
      den: "Female directors 30%, family-affiliated seats capped at 25%", dth: "กรรมการหญิง 30% และกรรมการที่ผูกกับครอบครัวไม่เกิน 25%",
      v: { fem: Math.max(c.fem, .30), fam: Math.min(c.fam, .25), pol: c.pol, ten: c.ten, dp: c.dp } },
    { k: "newceo", en: "New CEO + board refresh", th: "CEO ใหม่ พร้อมปรับบอร์ด",
      den: "Optimistic board together with a CEO in the top decile of forward-looking language",
      dth: "บอร์ดแบบตั้งใจปรับ ร่วมกับผู้บริหารที่ภาษาเชิงรุกอยู่กลุ่มสูงสุด 10%",
      v: { fem: Math.max(c.fem, p90f), fam: Math.min(c.fam, p10a), pol: c.pol, ten: Math.min(c.ten, p10t), dp: Math.max(c.dp, Math.round(p90d)) } },
  ];
}
/** แผนภาพส่วนร่วม — จากคะแนนปัจจุบันไปยังฉากทัศน์ ทีละตัวแปรที่เปลี่ยน */
function contribSvg(c) {
  const w = wiInit(), cur = { fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten, dp: c.dp };
  const keys = ["dp", "fem", "fam", "pol", "ten"].filter(k => Math.abs((w[k] || 0) - (cur[k] || 0)) > 1e-9);
  const scoreOf = o => Math.round(.5 * o.dp + .5 * ampPct(ampOf(o.fam, o.pol, o.fem, o.ten)));
  const acc = Object.assign({}, cur);
  const raw = [c.ipi];
  keys.forEach(k => { acc[k] = w[k]; raw.push(scoreOf(acc)); });
  const parts = raw.slice(1).map((v, i) => v - raw[i]);
  const cols = [{ l: T("Current", "ปัจจุบัน"), from: 0, to: c.ipi, k: "base" }]
    .concat(keys.map((k, i) => ({ l: vL(k === "dp" ? "promo" : k), from: raw[i], to: raw[i + 1], d: parts[i],
      k: parts[i] > 0 ? "up" : parts[i] < 0 ? "dn" : "flat" })))
    .concat([{ l: T("Scenario", "ฉากทัศน์"), from: 0, to: raw[raw.length - 1], k: "tot" }]);
  if (!keys.length) return `<div class="note">${T("Move a slider or pick a scenario to see the contribution chart.",
    "เลื่อนตัวควบคุมหรือเลือกฉากทัศน์เพื่อดูแผนภาพส่วนร่วม")}</div>`;
  const W = 700, H = 230, L = 36, R = 12, Tp = 20, B = 50;
  const top = Math.max(100, ...cols.map(o => Math.max(o.from, o.to)));
  const Y = v => H - B - clamp(v, 0, top) / top * (H - Tp - B);
  const n = cols.length, slot = (W - L - R) / n, cw = Math.min(64, slot * .56), CX = i => L + slot * (i + .5);
  const FILL = { base: "var(--ink-3)", tot: "var(--blue)", up: "var(--mint-ink)", dn: "var(--s2)", flat: "var(--ink-3)" };
  const grid = [0, 50, 100].map(v => `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - R}" y2="${Y(v).toFixed(1)}" stroke="var(--line-2)"/>
    <text x="${L - 6}" y="${(Y(v) + 3.4).toFixed(1)}" font-size="9" fill="var(--ink-3)" text-anchor="end">${v}</text>`).join("");
  const body = cols.map((o, i) => {
    const y0 = Y(Math.max(o.from, o.to)), y1 = Y(Math.min(o.from, o.to));
    const h = Math.max(2.5, y1 - y0), x = CX(i) - cw / 2;
    return `<g><rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"
      fill="${FILL[o.k]}" fill-opacity=".9"/>
      <text x="${CX(i).toFixed(1)}" y="${(y0 - 6).toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--ink)">${o.d === undefined ? fmt(o.to) : sgn(o.d)}</text>
      <text x="${CX(i).toFixed(1)}" y="${H - B + 15}" font-size="9.4" text-anchor="middle" fill="var(--ink-2)">${esc(o.l)}</text></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${T("Contribution chart", "แผนภาพส่วนร่วม")}">${grid}${body}
    <line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-3)" stroke-width="1.1"/></svg>`;
}

function tabWhatIf() {
  const c = co(), w = wiInit(), score = wiScore(), P = presets(c);
  const inner = `<div class="grid gside">
    <div style="display:grid;gap:14px">
      <div class="card">
        <h3>${T("Adjust the four variables directly", "ปรับสี่ตัวแปรได้โดยตรง")}</h3>
        <p class="desc">${T("The score is recomputed from the same regression equation and interaction terms — nothing is estimated or smoothed.",
    "คะแนนคำนวณใหม่จากสมการถดถอยและพจน์ปฏิสัมพันธ์ชุดเดิม ไม่มีการประมาณหรือเกลี่ยค่าใด ๆ")}</p>
        ${WI_CTRL.map(x => { const v = x.pct ? w[x.k] * 100 : w[x.k];
      return `<div class="sl"><span>${esc(S.lang === "EN" ? x.en : x.th)}</span>
        <input type="range" data-wi="${x.k}" min="${x.min}" max="${x.max}" step="${x.step}" value="${v}">
        <span class="val">${fmt(v, x.step < 1 ? 1 : 0)}${x.pct ? "%" : (x.unit || "")}</span></div>`; }).join("")}
        <div class="sl"><span>${esc(vL("pol"))}</span>
          <div class="seg" style="width:100%"><button type="button" data-wipol="1" aria-selected="${!!w.pol}" style="flex:1">${T("Yes", "มี")}</button>
            <button type="button" data-wipol="0" aria-selected="${!w.pol}" style="flex:1">${T("No", "ไม่มี")}</button></div>
          <span class="val"></span></div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn s" id="btnWiReset">${T("Reset to current board", "คืนค่าบอร์ดปัจจุบัน")}</button>
          <button class="btn p" id="btnWiMemo">${T("Export Board Memo", "ออกบันทึกวาระประชุม")}</button>
        </div>
        <div class="note warn" style="margin-top:12px">
          ${T("This simulation is fully transparent and maps one-to-one onto the coefficients, but it ignores uncertainty and path dependency — it does not model how the board actually gets from here to there.",
    "การจำลองนี้โปร่งใสและตรงกับสัมประสิทธิ์แบบหนึ่งต่อหนึ่ง แต่ไม่รวมความไม่แน่นอนและเส้นทางการเปลี่ยนผ่าน — ไม่ได้จำลองว่าบอร์ดจะเดินจากจุดนี้ไปถึงเป้าหมายอย่างไร")}</div>
      </div>
      <div class="card">
        <h3>${T("Contribution chart", "แผนภาพส่วนร่วม")}</h3>
        <p class="desc">${T("How each change you made moves the score, one variable at a time.", "การเปลี่ยนแต่ละอย่างขยับคะแนนเท่าไหร่ ทีละตัวแปร")}</p>
        ${contribSvg(c)}
      </div>
    </div>
    <div style="display:grid;gap:14px;align-content:start">
      <div class="scn">
        <small>${T("Simulated score", "คะแนนจำลอง")}</small>
        <div class="big">${c.ipi} <span style="opacity:.5">→</span> <em>${score}</em></div>
        <p>${score === c.ipi ? T("No change from the current board.", "ยังไม่ต่างจากบอร์ดปัจจุบัน")
      : T(`${sgn(score - c.ipi)} points against the board as filed.`, `${sgn(score - c.ipi)} จุด เทียบกับบอร์ดตามที่เปิดเผยไว้`)}</p>
        <div style="margin-top:12px;font-size:11.6px;color:#C3D4E4;line-height:1.7">
          ${T("Board Amplification", "โครงสร้างบอร์ด")} ${ampPct(ampOf(w.fam, w.pol, w.fem, w.ten))} ·
          ${T("CEO focus", "ภาษาผู้บริหาร")} ${w.dp} ·
          ${T("zone", "โซน")} ${esc(ZONES[zoneOf(promoAtPct(w.dp), ampOf(w.fam, w.pol, w.fem, w.ten))].l)}</div>
      </div>
      <div class="card">
        <h3>${T("Pre-built scenarios", "ฉากทัศน์สำเร็จรูป")}</h3>
        <p class="desc">${T("Click to load the values into the sliders.", "กดเพื่อโหลดค่าเข้าสู่ตัวควบคุม")}</p>
        <div class="presets">${P.map(p => { const s = Math.round(.5 * p.v.dp + .5 * ampPct(ampOf(p.v.fam, p.v.pol, p.v.fem, p.v.ten)));
      return `<button class="preset${S.wiPreset === p.k ? " on" : ""}" data-preset="${p.k}">
        <span style="min-width:0"><b>${esc(S.lang === "EN" ? p.en : p.th)}</b>
          <span>${esc(S.lang === "EN" ? p.den : p.dth)}</span></span>
        <span class="sc" style="color:${s > c.ipi ? "var(--mint-ink)" : s < c.ipi ? "var(--crit)" : "var(--ink-3)"}">${s}</span></button>`; }).join("")}</div>
      </div>
    </div>
  </div>`;

  if (S.plan === "pro") return `<section class="zone">
    <div class="zhead"><div><div class="zcode">What-if Studio</div>
      <h2>${T("Deterministic scenario analysis", "จำลองฉากทัศน์แบบกำหนดค่าตรง")}</h2>
      <p>${T("Adjust the board variables and the score is recalculated from the regression equation plus interaction terms. Fully explainable, and fast enough to use live in a meeting.",
    "ปรับตัวแปรของบอร์ดแล้วคะแนนคำนวณใหม่จากสมการถดถอยและพจน์ปฏิสัมพันธ์ · อธิบายที่มาได้ทุกจุด และเร็วพอจะใช้สดในที่ประชุม")}</p></div></div>
    ${inner}</section>`;
  return `<section class="zone">
    <div class="zhead"><div><div class="zcode">What-if Studio</div>
      <h2>${T("Deterministic scenario analysis", "จำลองฉากทัศน์แบบกำหนดค่าตรง")}</h2></div></div>
    <div class="lockwrap"><div class="blurred" aria-hidden="true">${inner}</div>
      <div class="paywall"><div class="paycard"><div class="lk">🔒</div>
        <h3 style="font-size:15.5px;margin-bottom:5px">${T("Pro feature", "สิทธิ์ของผู้ใช้ Pro")}</h3>
        <p style="font-size:12.6px;color:var(--ink-2);margin:0 0 14px;line-height:1.68">
          ${T("The What-if Studio and the full validity table are Pro features. Free users still get the full report on their own company and the validity remark.",
      "What-if Studio และตาราง Validity ฉบับเต็มเป็นสิทธิ์ของผู้ใช้ Pro · ผู้ใช้ฟรียังได้รายงานฉบับเต็มของบริษัทตัวเองและ remark ด้าน validity")}</p>
        <button class="btn p" id="btnPro">${T("Switch this demo user to Pro", "สลับผู้ใช้สาธิตเป็น Pro")}</button></div></div></div>
  </section>`;
}

/* ============================================================================
   Validity
   ============================================================================ */
function tabValid() {
  const v = validity(), vr = validityRemark(), V = DATA.validYear;
  const head = `<div class="zhead"><div><div class="zcode">${T("Evidence", "หลักฐาน")}</div>
    <h2>Validity Remark</h2>
    <p>${T("Four tests from the model's own validation plan. Passing all four is reported as Strong; failing any one is reported as use-with-caution, naming the test and the reason.",
    "เกณฑ์สี่ข้อจากแผนตรวจสอบของโมเดลเอง · ผ่านครบสี่ข้อรายงานว่า Strong · ตกข้อใดข้อหนึ่งรายงานว่าใช้อย่างระมัดระวัง พร้อมระบุข้อที่ตกและเหตุผล")}</p></div></div>`;

  const remark = `<div class="card">
    <div class="note ${vr.k}" style="margin:0"><b style="font-size:14px">${esc(S.lang === "EN" ? vr.label : vr.th)}</b><br>${esc(vr.d)}</div>
    <div class="grid g4" style="margin-top:14px">
      ${v.rows.map(r => `<div class="stat"><div class="k">${esc(S.lang === "EN" ? r.n : r.th_)}</div>
        <div class="v num">${fmt(r.v, r.k === "lift" ? 2 : 3)}${r.k === "lift" ? "×" : ""}</div>
        <div class="u"><span class="pill ${r.pass ? "ok" : "crit"}">${r.pass ? T("Pass", "ผ่าน") : T("Fail", "ไม่ผ่าน")}</span>
          <span style="color:var(--ink-3)"> ${T("needs", "ต้อง")} ${esc(r.rule)}</span></div></div>`).join("")}
    </div>
    <div style="font-size:11.4px;color:var(--ink-3);margin-top:11px;line-height:1.66">
      ${T("The regression is refitted as new years of data arrive, so these figures move over time. They describe the pooled 2019–2023 panel of 928 firm-years.",
    "สมการถดถอยจะถูก fit ใหม่เมื่อมีข้อมูลปีใหม่เข้ามา ตัวเลขชุดนี้จึงเปลี่ยนได้ตามเวลา · ค่าที่แสดงมาจากแผงข้อมูลรวม 2562–2566 จำนวน 928 บริษัท-ปี")}</div>
  </div>`;

  const full = `<div class="card" style="margin-top:14px">
    <h3>${T("Year by year — including the year the signal disappeared", "รายปี รวมปีที่สัญญาณหายไป")}</h3>
    <p class="desc">${T("Reporting only the pooled average would hide 2022 entirely. It is shown here on purpose.",
    "ถ้ารายงานแต่ค่าเฉลี่ยรวมจะกลบปี 2565 ไปทั้งปี จึงแสดงไว้ตรงนี้โดยตั้งใจ")}</p>
    <div class="tw"><table><thead><tr><th>${T("Year", "ปี")}</th><th class="n">n</th><th class="n">Spearman</th>
      <th class="n">AUC</th><th class="n">Lift</th><th class="n">LOYO</th><th>${T("Verdict", "ผลตรวจ")}</th></tr></thead><tbody>
      ${Object.entries(V.byYear).map(([y, r]) => { const ok = r.sp > 0 && r.auc > .5 && r.lift > 1.5 && r.loyo > 0, mid = r.auc > .5;
    return `<tr${y === "2022" ? ' style="background:var(--crit-bg)"' : ""}><td>${+y + 543} <span style="color:var(--ink-3)">(${y})</span></td>
      <td class="n">${fmt(r.n)}</td><td class="n">${fmt(r.sp, 3)}</td><td class="n">${fmt(r.auc, 3)}</td>
      <td class="n">${fmt(r.lift, 2)}×</td><td class="n">${fmt(r.loyo, 3)}</td>
      <td><span class="pill ${ok ? "ok" : mid ? "warn" : "crit"}">${ok ? T("Passes all 4", "ผ่านครบ 4 ข้อ") : mid ? T("Partial", "ผ่านบางข้อ") : T("Fails", "ไม่ผ่าน")}</span></td></tr>`; }).join("")}
    </tbody></table></div>
    <div class="note crit" style="margin-top:12px"><b>${T("2022 must be said out loud", "ปี 2565 ต้องพูดตรง ๆ")}</b> —
      ${T("Spearman −0.023 and AUC 0.494 mean the score carried no information that year. Any client-facing use has to state that the relationship is not stable across years.",
      "Spearman −0.023 และ AUC 0.494 แปลว่าคะแนนไม่ได้บอกอะไรเลยในปีนั้น การนำไปใช้กับลูกค้าต้องระบุว่าความสัมพันธ์ไม่คงที่ทุกปี")}</div>
    <div class="tw" style="margin-top:14px"><table><thead><tr><th>${T("Test", "การทดสอบ")}</th><th>${T("What it shows", "แสดงอะไร")}</th>
      <th>${T("Why it matters if it fails", "ถ้าตกแล้วกระทบอะไร")}</th></tr></thead><tbody>
      ${v.rows.map(r => `<tr><td><b>${esc(S.lang === "EN" ? r.n : r.th_)}</b><br>
        <span class="pill ${r.pass ? "ok" : "crit"}">${r.pass ? T("Pass", "ผ่าน") : T("Fail", "ไม่ผ่าน")}</span></td>
        <td>${esc(r.what)}</td><td style="color:${r.pass ? "var(--ink-3)" : "var(--ink-2)"}">${esc(r.why)}</td></tr>`).join("")}
    </tbody></table></div>
  </div>`;

  if (S.plan === "pro") return `<section class="zone">${head}${remark}${full}</section>`;
  return `<section class="zone">${head}${remark}
    <div class="note" style="margin-top:14px">${T("Free users see the two-state remark above, which is what gets attached to the report. The full year-by-year table is a Pro feature.",
      "ผู้ใช้ฟรีเห็น remark สองระดับด้านบน ซึ่งเป็นสิ่งที่แนบไปกับรายงาน · ตารางรายปีฉบับเต็มเป็นสิทธิ์ของผู้ใช้ Pro")}
      <button class="lnk" id="btnPro">${T("Switch this demo user to Pro", "สลับผู้ใช้สาธิตเป็น Pro")}</button></div></section>`;
}

/* ============================================================================
   เอกสารสำหรับพิมพ์
   ============================================================================ */
const DOC_CSS = `
@page{size:A4 portrait;margin:12mm}
html,body{background:#fff}
body{margin:0;font-size:10.8px}
.dw{max-width:186mm;margin:0 auto}
.dh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-bottom:2px solid var(--blue);
  padding-bottom:9px;margin-bottom:11px}
.dt{font-size:21px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.db{border:1px solid var(--line);border-radius:9px;padding:8px 11px;break-inside:avoid;margin-bottom:8px}
.db h4{font-size:9.6px;letter-spacing:.11em;text-transform:uppercase;color:var(--blue);margin:0 0 5px;font-weight:600}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dg3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.sig div>div{border-bottom:1px solid var(--ink-3);height:22px}
.sig small{font-size:8.8px;color:var(--ink-3)}
.dfoot{margin-top:10px;padding-top:7px;border-top:1px solid var(--line);font-size:8.6px;color:var(--ink-3);line-height:1.58}
table{font-size:10.2px}th,td{padding:4px 6px}
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
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast(T("The browser blocked printing — try Ctrl+P", "เบราว์เซอร์ปิดกั้นการพิมพ์ — ลองใช้ Ctrl+P")); } };
  f.srcdoc = doc;
  toast(T("Preparing document …", "กำลังเตรียมเอกสาร …"));
}
const DFOOT = () => { const vr = validityRemark();
  return `<div class="dfoot"><b>OpenInnoScore™</b> · CEO Regulatory Focus × Board Composition Assessment ·
  <b>Validity remark — ${esc(vr.label)}</b> ${esc(vr.d)} ·
  เครื่องมือ<b>ประเมิน</b> (diagnostic) ไม่ใช่การพยากรณ์ · สร้างจากแผงข้อมูล 209 บริษัท 928 บริษัท-ปี (2562–2566) ·
  ความสัมพันธ์เป็นเชิงสหสัมพันธ์ ไม่ใช่เชิงสาเหตุ และไม่คงที่ทุกปี (ปี 2565 AUC 0.494) ·
  ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน · <b>ห้ามนำไปใช้ให้คะแนนหรือคัดกรองกรรมการรายบุคคล</b> —
  เพศ อายุ และความเชื่อมโยงทางการเมืองเป็นข้อมูลอ่อนไหวตาม PDPA มาตรา 26</div>`; };

function briefHtml(c) {
  const sc = scenarioOf(c), tg = targetBoard(c), pool = indComps(c.ind);
  const hz = HORIZON.find(h => h.k === S.horizon) || HORIZON[1];
  return `<div class="dw">
    <div class="dh"><div>
      <div style="font-size:9.2px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue)">Candidate Brief · โจทย์การสรรหากรรมการ</div>
      <div class="dt">${esc(c.t)} · ${esc(c.n)}</div>
      <div style="font-size:10.6px;color:var(--ink-2)">${esc(IND[c.ind])} · กลุ่มอ้างอิง ${pool.length} บริษัท · ข้อมูลปี 2566 · กรอบเวลา ${esc(hz.th)}</div></div>
      <div style="text-align:right"><div style="font-size:31px;font-weight:600;line-height:1">${c.ipi}</div>
        <div style="font-size:9.2px;color:var(--ink-3)">OpenInnoScore วันนี้<br>ฉากทัศน์ที่แนะนำ ${fmt(sc.after)}</div></div></div>

    <div class="db"><h4>โจทย์ของการสรรหารอบนี้</h4>
      <p style="margin:0;font-size:11px;line-height:1.62">${sc.after > sc.now
      ? `ช่องว่างเชิงโครงสร้างที่โมเดลชี้คือ ${fmt(sc.after - sc.now)} จุดคะแนน ภายใน${hz.th} การสรรหารอบนี้จึงควรตั้งเป้าปิดช่องว่างนี้ ไม่ใช่การหากรรมการตามสเปกทั่วไป`
      : `โครงสร้างบอร์ดอยู่ที่ค่าที่ดีที่สุดเท่าที่พบจริงในอุตสาหกรรมแล้ว การสรรหารอบนี้จึงเป็นการรักษาระดับเมื่อกรรมการครบวาระ`}</p></div>

    <div class="dg">
      <div class="db"><h4>คุณสมบัติเชิงโครงสร้างที่ต้องการ</h4>
        ${sc.all.length ? sc.all.map(x => `<div style="margin-bottom:6px;font-size:10.6px;line-height:1.55">
          <b>${esc(x.th)}</b><div style="color:var(--ink-3)">โปรไฟล์ที่มองหา — ${x.kw.map(k => esc(k[1])).join(" · ")}</div></div>`).join("")
      : `<p style="margin:0">ไม่มีคันโยกเชิงโครงสร้างเหลือ — โจทย์คือรักษาโครงสร้างเดิมเมื่อกรรมการครบวาระ</p>`}</div>
      <div class="db"><h4>ผลต่อคะแนนและความยากง่าย</h4>
        <table><tbody>${sc.all.length ? sc.all.map(x => `<tr>
          <td>${esc(x.th)}<div style="font-size:9.4px;color:var(--ink-3)">${esc(HARD[x.hard].th)}${sc.sel.some(s => s.k === x.k) ? "" : " · นอกกรอบเวลา"}</div></td>
          <td class="n" style="font-weight:600;color:var(--ok);font-size:13px">${sgn(x.d)}</td></tr>`).join("")
      : `<tr><td>—</td><td class="n">—</td></tr>`}</tbody></table>
        <div style="font-size:9.4px;color:var(--ink-3);margin-top:5px">ตัวเลขคือผลของการทำข้อนั้นข้อเดียว โดยตรึงตัวแปรอื่นไว้</div></div>
    </div>

    <div class="db"><h4>ข้อห้ามในการใช้เอกสารนี้</h4>
      <p style="margin:0;font-size:10.6px;line-height:1.62">เอกสารนี้อธิบาย<b>คุณสมบัติเชิงโครงสร้างของคณะกรรมการ</b>ที่โมเดลชี้ว่าสัมพันธ์กับผลลัพธ์ระดับบริษัท
        <b>ไม่ใช่การชี้ตัวบุคคล</b> และห้ามนำไปใช้ให้คะแนนหรือคัดกรองผู้สมัครรายคน ·
        ระบบไม่ตั้ง “กรรมการสายนโยบาย” เป็นเป้าหมายในการสรรหา แม้สัมประสิทธิ์ในโมเดลจะเป็นบวก</p></div>

    <div class="sig"><div><div></div><small>ผู้จัดทำ · Executive Search / Advisory</small></div>
      <div><div></div><small>ประธานคณะกรรมการสรรหา</small></div></div>
    ${DFOOT()}</div>`;
}
function memoHtml(c) {
  const I = insights(c), sc = scenarioOf(c), rec = recommendation(c), F = riskFlags(c);
  return `<div class="dw">
    <div class="dh"><div>
      <div style="font-size:9.2px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue)">Board Memo · บันทึกสำหรับวาระประชุม</div>
      <div class="dt">${esc(c.t)} · ${esc(c.n)}</div>
      <div style="font-size:10.6px;color:var(--ink-2)">${esc(IND[c.ind])} · อันดับ ${I.rank} จาก ${I.pool.length} ในอุตสาหกรรม</div></div>
      <div style="text-align:right"><div style="font-size:31px;font-weight:600;line-height:1">${c.ipi}</div>
        <div style="font-size:9.2px;color:var(--ink-3)">OpenInnoScore · ${esc(ZONES[zoneOf(c.promo, c.amp)].l)}<br>ฉากทัศน์ ${fmt(sc.after)}</div></div></div>
    <div class="dg" style="margin-bottom:8px">
      ${I.list.map(i => `<div class="db"><h4>${esc(i.tag)} · ${sgn(i.impact)} จุด</h4>
        <div style="font-size:11.4px;font-weight:600;line-height:1.35;margin-bottom:3px">${esc(i.h)}</div>
        <p style="margin:0;font-size:10.3px;color:var(--ink-2);line-height:1.55">${esc(i.p)}</p></div>`).join("")}
    </div>
    <div class="dg">
      <div class="db"><h4>ข้อเสนอเรียงตามผลต่อคะแนน</h4>
        <table><tbody>${sc.all.length ? sc.all.map(x => `<tr>
          <td><b>${esc(x.th)}</b><div style="font-size:9.4px;color:var(--ink-3)">${esc(HARD[x.hard].th)}</div></td>
          <td class="n" style="font-weight:600;color:var(--ok);font-size:13px">${sgn(x.d)}</td></tr>`).join("")
      : `<tr><td>โครงสร้างบอร์ดอยู่ที่เพดานของอุตสาหกรรมแล้ว</td><td class="n">—</td></tr>`}</tbody></table>
        <div style="margin-top:6px;font-size:10.4px"><b>ข้อเสนอของระบบ · ${esc(rec.l)}</b>
          <span style="color:var(--ink-2)">— ${esc(rec.d)}</span></div></div>
      <div class="db"><h4>ธงความเสี่ยงเชิงโครงสร้าง</h4>
        ${F.map(f => `<div style="font-size:10.4px;line-height:1.52;margin-bottom:3px">${f.lv === "crit" ? "▲" : f.lv === "warn" ? "△" : "✓"}
          <b>${esc(f.l)}</b><br><span style="color:var(--ink-3)">${esc(f.d)}</span></div>`).join("")}</div>
    </div>
    <div class="db"><h4>มติที่ประชุม</h4>
      <div style="display:flex;gap:12px;font-size:10.4px;margin-bottom:5px">
        <span>☐ เห็นชอบตามข้อเสนอ</span><span>☐ เห็นชอบบางส่วน</span><span>☐ ขอข้อมูลเพิ่ม</span><span>☐ ยังไม่พิจารณา</span></div>
      <div style="border-bottom:1px solid var(--line);height:14px"></div>
      <div style="border-bottom:1px solid var(--line);height:14px"></div></div>
    <div class="sig"><div><div></div><small>ผู้เสนอวาระ</small></div><div><div></div><small>ประธานที่ประชุม</small></div></div>
    ${DFOOT()}</div>`;
}

/* ============================================================================
   ประกอบหน้า · ผูกเหตุการณ์ · เริ่มระบบ
   ============================================================================ */
const TABS = [
  { k: "overview", en: "Overview", th: "ภาพรวมบริษัท" },
  { k: "assess", en: "Assessment", th: "Assessment" },
  { k: "whatif", en: "What-if Studio", th: "What-if Studio", pro: 1 },
  { k: "valid", en: "Validity", th: "Validity" },
];
function tabAssess() {
  const core = zoneB() + zoneC();
  return zoneA() + (isUnlocked("report") ? core
    : `<div class="lockwrap"><div class="blurred" aria-hidden="true">${core}</div>
      ${lockCard("report", T("Full report for this company", "รายงานฉบับเต็มของบริษัทนี้"),
      T(`Insights and board-refresh recommendations for ${co().t}. Your own company (${S.ownCo}) stays free; other companies cost one token each and stay unlocked afterwards.`,
        `ข้อค้นพบและข้อเสนอปรับบอร์ดของ ${co().t} · บริษัทของคุณเอง (${S.ownCo}) ฟรีเสมอ ส่วนบริษัทอื่นใช้ 1 token ต่อบริษัท ปลดล็อกแล้วดูได้ตลอด`))}</div>`);
}
function floatBar() {
  return `<div class="floating">
    <button type="button" id="fbReport">${T("Generate Full Report", "ออกรายงานฉบับเต็ม")}${S.report.length ? ` (${S.report.length})` : ""}</button>
    <button type="button" id="fbScn">${T("Save Scenario", "บันทึกฉากทัศน์")}</button>
    <button type="button" id="fbShare">${T("Share with Team", "แชร์ให้ทีม")}</button>
    <button type="button" id="fbBrief">${T("Export Candidate Brief", "ออกโจทย์การสรรหา")}</button>
    <button type="button" id="fbTl">${T("Activity Timeline", "ประวัติการทำงาน")}</button></div>`;
}
function footNote() {
  const vr = validityRemark();
  return `<footer><b>OpenInnoScore™</b> — CEO Regulatory Focus × Board Composition Assessment ·
    ${T("prototype for presentation only", "ต้นแบบเพื่อการนำเสนอ ไม่ใช่ระบบจริง")} ·
    <b>${esc(S.lang === "EN" ? vr.label : vr.th)}</b> ·
    ${T("Diagnostic decision support built on a 209-firm, 928 firm-year panel (2019–2023). Relationships are correlational, not causal, and not stable across years. Not investment or employment advice. Never use it to score individuals.",
    "เครื่องมือสนับสนุนการตัดสินใจเชิงวินิจฉัย สร้างจากแผงข้อมูล 209 บริษัท 928 บริษัท-ปี (2562–2566) · ความสัมพันธ์เป็นเชิงสหสัมพันธ์ ไม่ใช่เชิงสาเหตุ และไม่คงที่ทุกปี · ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน · ห้ามนำไปใช้ให้คะแนนรายบุคคล")}</footer>`;
}
function renderTL() {
  const e = $("#tl"); if (!e) return;
  e.innerHTML = S.log.length ? S.log.map((l, i) => `<div class="tli"><div class="dot">${S.log.length - i}</div>
      <div><b>${esc(l.title)}</b><span>${esc(l.sub)} · ${esc(l.at)}</span></div></div>`).join("")
    : `<div style="font-size:12.4px;color:var(--ink-3)">${T("Nothing yet — upload a document or unlock a comparison.", "ยังไม่มีรายการ — ลองอัปโหลดเอกสารหรือปลดล็อกการเทียบคู่แข่ง")}</div>`;
}
function chrome() {
  const c = co(), z = ZONES[zoneOf(c.promo, c.amp)];
  $("#ctxCo").textContent = c.t + " · " + c.n;
  $("#ctxSub").innerHTML = esc(indL(c.ind)) + " · " + T("Annual Report 2023", "รายงานประจำปี 2566") +
    (isEdited() || S.ceo ? ` · <b style="color:var(--blue)">${T("edited by user", "แก้ค่าเอง")}</b>` : "") +
    (c.t === S.ownCo ? ` · <b style="color:var(--mint-ink)">${T("your company", "บริษัทของคุณ")}</b>` : "");
  $("#ctxZone").innerHTML = `<span style="width:8px;height:8px;border-radius:99px;background:${z.c};display:inline-block"></span> ${esc(z.l)} · OI <b>${c.ipi}</b>`;
  $("#tokChip").innerHTML = `◈ ${S.plan === "pro" ? "Pro" : "Free"} · <b>${S.tokens}</b> token`;
  $("#selCo").value = S.t;
  $("#segTone").innerHTML = TONES.map(t => `<button type="button" data-tone="${t.k}" aria-selected="${S.tone === t.k}">${esc(S.lang === "EN" ? t.en : t.th)}</button>`).join("");
  $$("#segLang button").forEach(b => b.setAttribute("aria-selected", b.dataset.lang === S.lang));
  $("#tabs").innerHTML = TABS.map(t => `<button type="button" data-tab="${t.k}" aria-selected="${S.tab === t.k}">
    ${esc(S.lang === "EN" ? t.en : t.th)}${t.pro && S.plan !== "pro" ? `<span class="lk">Pro</span>` : ""}</button>`).join("");
}
function render() {
  const w = $("#wrap");
  const body = { overview: tabOverview, assess: tabAssess, whatif: tabWhatIf, valid: tabValid }[S.tab] || tabOverview;
  w.innerHTML = body() + (S.tab === "assess" ? floatBar() : "") + footNote();
  chrome(); wire(w); renderTL();
}
const go = t => { S.tab = t; save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); };

function analyse(txt, name) {
  if (!txt.trim()) return toast(T("Nothing to analyse", "ไม่มีข้อความให้วิเคราะห์"));
  const r = analyseText(txt);
  S.ceo = { text: txt, r };
  S.docs.unshift({ name: name || T("pasted text", "ข้อความที่วาง"), st: r.tot < 6 ? "warn" : "ok", words: r.wc });
  S.docs = S.docs.slice(0, 6);
  logIt(T("Uploaded ", "อัปโหลด ") + (name || T("sample text", "ข้อความตัวอย่าง")),
    `${fmt(r.wc)} ${T("words", "คำ")} · CEO focus ${r.dp}${r.tot < 6 ? " · " + T("few keywords found", "พบคำสำคัญน้อย") : ""}`);
  toast(T(`Analysed · CEO focus ${r.dp}`, `วิเคราะห์แล้ว · CEO focus ${r.dp}`));
  render();
}
function copyText(s) {
  try { navigator.clipboard.writeText(s); toast(T("Copied", "คัดลอกแล้ว")); return; } catch (e) { }
  const ta = document.createElement("textarea"); ta.value = s; document.body.appendChild(ta);
  ta.select(); try { document.execCommand("copy"); toast(T("Copied", "คัดลอกแล้ว")); } catch (e) { toast(T("Could not copy", "คัดลอกไม่สำเร็จ")); }
  ta.remove();
}

function wire(h) {
  /* ---- Zone A ---- */
  const dz = h.querySelector("#dz"), fi = h.querySelector("#fileIn");
  if (dz && fi) {
    dz.onclick = () => fi.click();
    dz.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } };
    ["dragenter", "dragover"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("over"); }));
    const take = async list => {
      const fs = [...(list || [])].slice(0, 4); if (!fs.length) return;
      toast(T("Reading ", "กำลังอ่าน ") + fs.length + T(" file(s) …", " ไฟล์ …"));
      let all = "";
      for (const f of fs) {
        try { all += (await readFileText(f)) + "\n"; S.docs.unshift({ name: f.name, st: "ok" }); }
        catch (err) { S.docs.unshift({ name: f.name, st: "warn" }); }
      }
      S.docs = S.docs.slice(0, 6);
      analyse(all.slice(0, 120000), fs.map(f => f.name).join(", "));
    };
    dz.addEventListener("drop", e => take(e.dataTransfer.files));
    fi.onchange = e => take(e.target.files);
  }
  const sm = h.querySelector("#btnSample"); if (sm) sm.onclick = () => analyse(SAMPLE, T("sample CEO letter", "สารจาก CEO ตัวอย่าง"));
  const re = h.querySelector("#btnReExtract");
  if (re) re.onclick = () => { analyse(S.ceo.text, S.docs[0] ? S.docs[0].name : undefined); toast(T("Re-extracted", "ประมวลผลใหม่แล้ว")); };
  const rs = h.querySelector("#btnReset");
  if (rs) rs.onclick = () => { clearOv(); logIt(T("Reset to database values", "คืนค่าจากฐานข้อมูล"), S.t); render(); };
  const lg = h.querySelector("#btnLing");
  if (lg) lg.onclick = () => S.ceo ? (analyse(S.ceo.text, S.docs[0] && S.docs[0].name), 0)
    : toast(T("Upload a document or load the sample text first", "อัปโหลดเอกสารหรือโหลดข้อความตัวอย่างก่อน"));
  h.querySelectorAll("[data-rmdoc]").forEach(b => b.onclick = () => {
    S.docs.splice(+b.dataset.rmdoc, 1); if (!S.docs.length) S.ceo = null; render(); });
  h.querySelectorAll("[data-ex]").forEach(el => el.onchange = () => {
    const k = el.dataset.ex, f = EXTRACT.find(x => x.k === k);
    let v = +el.value; if (!isFinite(v)) return render();
    if (!f) v = Math.round(clamp(v, 0, 100));                       // ภาษาผู้บริหาร เป็นเปอร์เซ็นไทล์
    else if (f.kind === "pct") v = clamp(v, 0, 100) / 100;
    else if (f.kind === "yr") v = clamp(v, 0, 40);
    else v = v ? 1 : 0;
    setOv(k, v); S.wi = null;
    logIt(T("Corrected ", "แก้ค่า ") + (f ? (S.lang === "EN" ? f.en : f.th) : vL("promo")), S.t + " → " + el.value);
    render();
  });

  /* ---- Zone B ---- */
  const fo = h.querySelector("#selFocus"); if (fo) fo.onchange = () => { S.focus = fo.value; save(); render(); };
  const rg = h.querySelector("#btnRegen");
  if (rg) rg.onclick = () => { render(); toast(T("Insights regenerated with the current focus and tone", "สร้างข้อค้นพบใหม่ตามมิติที่เน้นและโทนปัจจุบัน")); };
  h.querySelectorAll("#segSort button").forEach(b => b.onclick = () => { S.sortBy = b.dataset.sort; save(); render(); });
  const IL = insights(co()).list;
  const sorted = S.sortBy === "impact" ? IL.slice().sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)) : IL;
  h.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => {
    const i = sorted[+b.dataset.copy];
    copyText(`[${i.tag}] ${i.h}\n${i.p}\n→ ${toneImpl(i.kind)}\n(${sgn(i.impact)} OI pts · OpenInnoScore™)`);
  });
  h.querySelectorAll("[data-addrep]").forEach(b => b.onclick = () => {
    const i = sorted[+b.dataset.addrep];
    S.report = S.report.includes(i.kind) ? S.report.filter(x => x !== i.kind) : S.report.concat([i.kind]);
    save(); logIt(T("Report updated", "ปรับรายการในรายงาน"), `${S.report.length} ${T("insights", "ข้อค้นพบ")}`); render();
  });

  /* ---- Zone C ---- */
  h.querySelectorAll("[data-cons]").forEach(el => el.onchange = () => { S.cons[el.dataset.cons] = el.checked; save(); render(); });
  h.querySelectorAll("#segHz button").forEach(b => b.onclick = () => { S.horizon = b.dataset.hz; save(); render(); });
  h.querySelectorAll("#segPr button").forEach(b => b.onclick = () => { S.priority = b.dataset.pr; save(); render(); });
  const ap = h.querySelector("#btnApply");
  if (ap) ap.onclick = () => {
    const c = co(), sc = scenarioOf(c);
    S.wi = { _t: S.t, fem: sc.target.fem, fam: sc.target.fam, pol: sc.target.pol, ten: sc.target.ten, dp: c.dp };
    S.wiPreset = ""; save();
    logIt(T("Applied scenario to What-if Studio", "ส่งฉากทัศน์เข้า What-if Studio"), `${c.t} · ${c.ipi} → ${fmt(sc.after)}`);
    go("whatif");
  };
  const br = h.querySelector("#btnBrief"), mm = h.querySelector("#btnMemo"), sv = h.querySelector("#btnSaveScn");
  if (br) br.onclick = () => { printDoc("Candidate Brief · " + co().t, briefHtml(co())); logIt(T("Exported Candidate Brief", "ออกโจทย์การสรรหา"), co().t); };
  if (mm) mm.onclick = () => { printDoc("Board Memo · " + co().t, memoHtml(co())); logIt(T("Exported Board Memo", "ออกบันทึกวาระประชุม"), co().t); };
  if (sv) sv.onclick = () => { const c = co(), sc = scenarioOf(c);
    logIt(T("Saved board refresh scenario", "บันทึกฉากทัศน์ปรับบอร์ด"), `${c.t} · ${c.ipi} → ${fmt(sc.after)}`);
    toast(T("Scenario saved to the timeline", "บันทึกฉากทัศน์ไว้ในประวัติแล้ว")); };

  /* ---- What-if Studio ---- */
  h.querySelectorAll("[data-wi]").forEach(el => el.oninput = () => {
    const w = wiInit(), k = el.dataset.wi, ctl = WI_CTRL.find(x => x.k === k);
    w[k] = ctl.pct ? +el.value / 100 : +el.value;
    S.wiPreset = ""; render();
  });
  h.querySelectorAll("[data-wipol]").forEach(b => b.onclick = () => { wiInit().pol = +b.dataset.wipol; S.wiPreset = ""; render(); });
  const wr = h.querySelector("#btnWiReset"); if (wr) wr.onclick = () => { wiInit(true); S.wiPreset = "current"; render(); };
  const wm = h.querySelector("#btnWiMemo"); if (wm) wm.onclick = () => { printDoc("Board Memo · " + co().t, memoHtml(co())); };
  h.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
    const p = presets(co()).find(x => x.k === b.dataset.preset); if (!p) return;
    S.wi = Object.assign({ _t: S.t }, p.v); S.wiPreset = p.k; save();
    logIt(T("Loaded scenario", "โหลดฉากทัศน์") + " · " + (S.lang === "EN" ? p.en : p.th), co().t); render();
  });

  /* ---- token และการนำทาง ---- */
  h.querySelectorAll("[data-unlock]").forEach(b => b.onclick = () => {
    const w = b.dataset.unlock;
    const nm = { report: T("full report", "รายงานฉบับเต็ม"), peer: T("peer comparison", "การเทียบคู่แข่ง"), national: T("industry report", "รายงานอุตสาหกรรม") }[w];
    if (spend(w, T("Unlocked ", "ปลดล็อก ") + nm + " · " + S.t)) render();
  });
  h.querySelectorAll("[data-topup]").forEach(b => b.onclick = () => topUp());
  h.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  h.querySelectorAll("#btnPro").forEach(b => b.onclick = () => {
    S.plan = "pro"; S.tokens = Math.max(S.tokens, PLAN_TOKENS.pro); save();
    logIt(T("Switched demo user to Pro", "สลับผู้ใช้สาธิตเป็น Pro"), `${PLAN_TOKENS.pro} token`); render();
  });
  const pk = h.querySelector("#peerPick");
  if (pk) {
    const list = COMPS.filter(x => x.t !== S.t).sort((a, b) => b.ipi - a.ipi);
    pk.innerHTML = [0, 1, 2].map(i => `<select class="sel" data-slot="${i}">
      <option value="">— ${T("none", "ไม่เลือก")} —</option>
      ${list.map(x => `<option value="${esc(x.t)}"${S.peers[i] === x.t ? " selected" : ""}>${esc(x.t)} · ${esc(indL(x.ind))} · OI ${x.ipi}</option>`).join("")}</select>`).join("");
    pk.querySelectorAll("select").forEach(s => s.onchange = () => {
      S.peers = [...new Set([...pk.querySelectorAll("select")].map(x => x.value).filter(Boolean))].slice(0, 3);
      save(); render();
    });
  }
  const cs = h.querySelector("#btnCsv");
  if (cs) cs.onclick = () => {
    const c = co(), pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi);
    const head = ["rank", "ticker", "company", "industry", "zone", "OI", "CEO_focus", "board_amp", "upside", "risk"].join(",");
    const rows = pool.map((x, i) => [i + 1, x.t, `"${x.n}"`, `"${IND[x.ind]}"`, `"${ZONES[zoneOf(x.promo, x.amp)].l}"`,
      x.ipi, x.dp, ampPct(x.amp), fmt(upsideOf(x).delta), `"${riskLevel(x).l}"`].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `openinnoscore_${IND[c.ind]}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    logIt(T("Downloaded industry CSV", "ดาวน์โหลด CSV อุตสาหกรรม"), IND[c.ind]);
  };

  /* ---- แถบปุ่มลอย ---- */
  const fb = {
    fbReport: () => { printDoc("Full Report · " + co().t, memoHtml(co()) + briefHtml(co())); logIt(T("Generated full report", "ออกรายงานฉบับเต็ม"), co().t); },
    fbScn: () => sv && sv.click(),
    fbShare: () => copyText(`OpenInnoScore™ — ${co().t} · OI ${co().ipi} · ${T("scenario", "ฉากทัศน์")} ${fmt(scenarioOf(co()).after)}`),
    fbBrief: () => br && br.click(),
    fbTl: () => $("#drawer").classList.toggle("on"),
  };
  Object.entries(fb).forEach(([id, fn]) => { const e = h.querySelector("#" + id); if (e) e.onclick = fn; });
}
function topUp() {
  if (!confirm(T(`Demo top-up — add ${PACK_MIN} tokens?\n\nThe real system connects a Thai payment channel in Phase II.`,
    `จำลองการเติม token — เพิ่ม ${PACK_MIN} token?\n\nระบบจริงจะเชื่อมช่องทางชำระเงินไทยใน Phase II`))) return;
  S.tokens += PACK_MIN; save();
  logIt(T("Topped up tokens", "เติม token"), "+" + PACK_MIN + " · " + T("minimum pack", "แพ็กขั้นต่ำ"));
  toast(T(`+${PACK_MIN} tokens · you now have ${S.tokens}`, `เติม ${PACK_MIN} token แล้ว · คงเหลือ ${S.tokens}`)); render();
}

/* ---------------------------------------------------------------- เริ่มระบบ */
function enter() {
  if (!$("#gConsent").checked) return toast(T("Please accept the data-processing consent first", "กรุณายอมรับความยินยอมการประมวลผลข้อมูลก่อน"));
  S.user = $("#gMail").value.trim() || "analyst@openinnoscore.co";
  S.plan = ($("#planPick input:checked") || {}).value || "free";
  S.tokens = Math.max(S.tokens || 0, PLAN_TOKENS[S.plan]);
  S.t = $("#gCo").value || S.t;
  S.ownCo = S.t; S.tab = "overview"; S.peers = [];
  save();
  $("#gate").style.display = "none";
  $("#app").classList.add("on");
  logIt(T("Signed in", "เข้าสู่ระบบ") + " · " + (S.plan === "pro" ? "Pro" : "Free"), S.user + " · " + S.t);
  render();
}
function boot() {
  load();
  if (!byT[S.t]) S.t = "PTG";
  $("#gLogo").innerHTML = LOGO_DARK.replace('width="120" height="120"', 'width="46" height="46"');
  $("#tLogo").innerHTML = LOGO_LIGHT;
  const opts = COMPS.slice().sort((a, b) => b.ipi - a.ipi)
    .map(x => `<option value="${esc(x.t)}">${esc(x.t)} · ${esc(x.n)}</option>`).join("");
  $("#gCo").innerHTML = opts; $("#selCo").innerHTML = opts;
  $("#gCo").value = S.t;
  $$("#planPick .planopt").forEach(l => l.onclick = () => {
    $$("#planPick .planopt").forEach(x => x.classList.remove("on")); l.classList.add("on");
  });
  $("#btnEnter").onclick = enter;
  $("#selCo").onchange = e => { S.t = e.target.value; S.peers = []; S.ceo = null; S.docs = []; S.wi = null; save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $("#tabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (b) go(b.dataset.tab); };
  $("#segTone").onclick = e => { const b = e.target.closest("[data-tone]"); if (b) { S.tone = b.dataset.tone; save(); render(); } };
  $("#segLang").onclick = e => { const b = e.target.closest("[data-lang]"); if (b) { S.lang = b.dataset.lang; save(); render(); } };
  $("#btnTopUp").onclick = topUp;
  $("#btnOut").onclick = () => { S.user = null; save(); $("#app").classList.remove("on"); $("#gate").style.display = ""; };
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
  if (S.user) { $("#gate").style.display = "none"; $("#app").classList.add("on"); render(); }
}
boot();
