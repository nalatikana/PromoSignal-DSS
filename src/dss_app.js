/* ============================================================================
   PromoSignal DSS — ต้นแบบระบบสนับสนุนการตัดสินใจ
   ขั้นที่ 1 อัปโหลดเอกสาร → ขั้นที่ 2 โมเดลวิเคราะห์ → ขั้นที่ 3 แดชบอร์ดและรายงาน
   ทำงานในเบราว์เซอร์ทั้งหมด · โมเดลมาจาก out/dss_model.json (ฝังอยู่ในตัวแปร M)
   ============================================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = (v, d = 2) => (v === null || v === undefined || isNaN(v)) ? "—"
  : Number(v).toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------------------------------------------------------- สถานะ */
const S = {
  engine: "B",
  doc: null,            // ผลสกัดจากเอกสาร
  form: {},             // ค่าที่ใช้คำนวณ (ปรับด้วย slider ได้)
  base: {},             // ค่าตั้งต้น สำหรับปุ่มคืนค่า
  cands: [],            // ผู้สมัคร/บริษัทที่เก็บไว้
  alias: "",
};

/* ---------------------------------------------------------------- นิยามตัวแปร */
const VARS = {
  promotion: { lab: "Promotion focus (ภาษาเชิงรุก)", unit: "", min: 0, max: 2.3, step: .01, dec: 3 },
  female_pct: { lab: "สัดส่วนกรรมการหญิง", unit: "%", min: 0, max: 70, step: 1, dec: 1 },
  pol_tie: { lab: "มีกรรมการเชื่อมโยงการเมือง", unit: "", min: 0, max: 1, step: 1, dec: 0, bool: true },
  wa_board_tenure: { lab: "อายุงานเฉลี่ยของบอร์ด", unit: "ปี", min: 0, max: 30, step: .5, dec: 1 },
  indep_pct: { lab: "สัดส่วนกรรมการอิสระ", unit: "%", min: 0, max: 80, step: 1, dec: 1 },
  board_size: { lab: "ขนาดคณะกรรมการ", unit: "คน", min: 3, max: 20, step: 1, dec: 0 },
  ln_assets: { lab: "ขนาดบริษัท (ln สินทรัพย์)", unit: "", min: 12, max: 24, step: .1, dec: 2, ctrl: true },
  firm_age: { lab: "อายุบริษัท", unit: "ปี", min: 1, max: 90, step: 1, dec: 0, ctrl: true },
  roa: { lab: "ROA", unit: "%", min: -30, max: 40, step: .1, dec: 2, ctrl: true },
  de_ratio_w: { lab: "หนี้สินต่อทุน", unit: "เท่า", min: 0, max: 6, step: .05, dec: 2, ctrl: true },
};
// ตัวแปรบริบท: มีในข้อมูลแต่ไม่เข้าสมการหลัก
const CTX = [
  ["family_pct", "สัดส่วนกรรมการครอบครัว", "%", "ทิศทางเป็นบวกเล็กน้อยแต่ไม่มีนัยสำคัญ (p = 0.53) — ใช้ตั้งคำถามเรื่องการถ่วงดุลอำนาจ ไม่ใช้ถ่วงน้ำหนักคะแนน"],
  ["ceo_tenure", "อายุงาน CEO", "ปี", "ไม่พบผลอย่างมีนัยสำคัญต่อจำนวนนวัตกรรมเปิด — ใช้เป็นบริบทของการสืบทอดตำแหน่ง"],
];

const ENG_NOTE = {
  B: { cls: "ok", html: "<b>ชุดโมเดล B — ตามหลักฐานที่รันได้จริง</b><br>ใช้ตัวแปรโครงสร้างคณะกรรมการที่มีนัยสำคัญ: อายุงานเฉลี่ยบอร์ด (p&nbsp;=&nbsp;0.001) · สัดส่วนกรรมการอิสระ (p&nbsp;=&nbsp;0.001) · ขนาดบอร์ด (p&nbsp;=&nbsp;0.006) — เลื่อน slider แล้วเห็นผลจริง" },
  A: { cls: "warn", html: "<b>ชุดโมเดล A — ตามสเปกใน Pitch2.pptx</b><br>ใช้ Promotion × %กรรมการหญิง และ Promotion × การเมือง เป็นตัวขยายผล แต่ในข้อมูลชุดนี้ทั้งสองตัว <b>ไม่มีนัยสำคัญทางสถิติ</b> (p&nbsp;=&nbsp;0.80 และ p&nbsp;=&nbsp;0.27) — slider จะขยับแล้วค่าคาดการณ์เปลี่ยนน้อยมาก และช่วงความเชื่อมั่นจะกว้าง นี่คือพฤติกรรมที่ถูกต้องของโมเดล ไม่ใช่ข้อผิดพลาดของระบบ" },
};

/* ---------------------------------------------------------------- คณิตศาสตร์ */
/** สร้างเวกเตอร์ดีไซน์ตามลำดับ cov_order ของชุดโมเดล */
function designVec(eng, f) {
  return eng.cov_order.map(t => {
    if (t === "Intercept") return 1;
    const parts = t.split(":");
    return parts.reduce((acc, p) => {
      const k = p.replace(/^c_/, "");
      const v = (f[k] === null || f[k] === undefined || isNaN(f[k])) ? M.center[k] : f[k];
      return acc * (v - M.center[k]);
    }, 1);
  });
}
/** ค่าคาดการณ์ + ช่วงความเชื่อมั่น 95% (delta method บนสเกล log) */
function predict(engKey, f, industry, year) {
  const eng = M.engines[engKey];
  const x = designVec(eng, f);
  let lp = 0;
  eng.cov_order.forEach((t, i) => {
    lp += (t === "Intercept" ? eng.intercept : eng.coef[t]) * x[i];
  });
  lp += eng.base_industry[industry] || 0;
  lp += eng.base_year[year] || 0;
  // var(lp) = x' V x  (ไม่รวมความไม่แน่นอนของ FE — ระบุไว้ในหน้าอ้างอิง)
  let v = 0;
  for (let i = 0; i < x.length; i++) for (let j = 0; j < x.length; j++) v += x[i] * eng.cov[i][j] * x[j];
  const se = Math.sqrt(Math.max(v, 0));
  return { mu: Math.exp(lp), lo: Math.exp(lp - 1.96 * se), hi: Math.exp(lp + 1.96 * se), lp, se };
}
/** ควอนไทล์ของ Negative Binomial (NB2: Var = mu + alpha*mu^2)
 *  ใช้บอก "ช่วงที่ค่าจริงน่าจะตกอยู่" ซึ่งกว้างกว่า CI ของค่าเฉลี่ยมาก */
function nbQuantile(mu, alpha, target) {
  if (!(mu > 0) || !(alpha > 0)) return 0;
  const r = 1 / alpha, pr = r / (r + mu);
  let pmf = Math.pow(pr, r), cdf = pmf, k = 0;
  const KMAX = 5000;
  while (cdf < target && k < KMAX) {
    k++;
    pmf *= (k + r - 1) / k * (1 - pr);
    cdf += pmf;
  }
  return k;
}
/** ช่วงพยากรณ์ค่าจริง 90% */
function predInterval(mu, alpha) {
  return { lo: nbQuantile(mu, alpha, .05), hi: nbQuantile(mu, alpha, .95) };
}

/** เปอร์เซ็นไทล์จากอาร์เรย์ควอนไทล์ 101 ค่า */
function pctOf(v, arr) {
  if (v === null || v === undefined || isNaN(v)) return 50;
  if (v <= arr[0]) return 0;
  if (v >= arr[100]) return 100;
  let lo = 0, hi = 100;
  while (lo < hi - 1) { const m = (lo + hi) >> 1; (arr[m] <= v) ? lo = m : hi = m; }
  const span = arr[hi] - arr[lo] || 1;
  return lo + (v - arr[lo]) / span;
}
function quintileOf(v, edges) {
  for (let i = 0; i < edges.length; i++) if (v < edges[i]) return i + 1;
  return 5;
}
/** ตัวแปรที่ "ใช้จริง" ของชุดโมเดลนี้ (ไม่รวม control) */
function engVars(engKey) {
  const skip = new Set(M.controls);
  return M.engines[engKey].vars
    .filter(t => !t.includes(":"))
    .map(t => t.replace(/^c_/, ""))
    .filter(k => !skip.has(k));
}

/* ---------------------------------------------------------------- อ่านไฟล์ */
const MAX_MB = 90;
function setStat(msg, kind) { const e = $("#stat"); e.textContent = msg || ""; e.className = "stat" + (kind ? " " + kind : ""); }
function normText(t) { return String(t || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n"); }
function countWords(t) {
  const latin = (t.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length;
  const thai = (t.match(/[฀-๿]/g) || []).length;
  return latin + Math.round(thai / 4.2);
}
function countHits(t, words) {
  const low = t.toLowerCase(); let n = 0; const found = {};
  for (const w of words) {
    const nd = w.toLowerCase(); let i = 0, c = 0;
    while ((i = low.indexOf(nd, i)) !== -1) { c++; i += nd.length; }
    if (c) { n += c; found[w] = c; }
  }
  return { n, found };
}
async function readAnyFile(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return readPdf(file);
  if (n.endsWith(".docx")) return readDocx(file);
  return { text: await file.text(), pages: 0 };
}
async function readPdf(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf, useSystemFonts: true }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const pg = await pdf.getPage(i), tc = await pg.getTextContent();
    let last = null, line = "";
    for (const it of tc.items) {
      if (last !== null && Math.abs(it.transform[5] - last) > 2) { out += line.trim() + "\n"; line = ""; }
      line += it.str + (it.hasEOL ? "\n" : ""); last = it.transform[5];
    }
    out += line + "\n\n";
    if (i % 3 === 0 || i === pdf.numPages) setStat(`กำลังอ่านหน้า ${i} / ${pdf.numPages} …`);
  }
  return { text: out, pages: pdf.numPages };
}
async function readDocx(file) {
  const zip = fflate.unzipSync(new Uint8Array(await file.arrayBuffer()));
  const xml = new TextDecoder().decode(zip["word/document.xml"] || new Uint8Array());
  return { text: xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""), pages: 0 };
}
function sliceStatement(text) {
  const low = text.toLowerCase(); let start = -1, head = null;
  for (const h of LEX.statementHeads) {
    const i = low.indexOf(h.toLowerCase());
    if (i !== -1 && (start === -1 || i < start)) { start = i; head = h; }
  }
  if (start === -1) return { text: "", head: null };
  let end = text.length;
  for (const e of LEX.statementEnds) {
    const i = low.indexOf(e.toLowerCase(), start + 200);
    if (i !== -1 && i < end) end = i;
  }
  if (end - start > 40000) end = start + 40000;
  return { text: text.slice(start, end).trim(), head };
}
function analyseText(stmt, full) {
  const wc = countWords(stmt);
  const pro = countHits(stmt, [...LEX.promotion.th, ...LEX.promotion.en]);
  const pre = countHits(stmt, [...LEX.prevention.th, ...LEX.prevention.en]);
  const denom = (pro.n + pre.n) || 1;
  const ratio = (pro.n - pre.n) / denom;
  const I = M.liwc.intensity_median;
  const promotion = +(I * (1 + ratio) / 2).toFixed(3);
  const prevention = +(I * (1 - ratio) / 2).toFixed(3);
  const inv = {};
  for (const k of ["product", "service", "process", "partner"])
    inv[k] = countHits(full, [...LEX.innovation[k].th, ...LEX.innovation[k].en]).n;
  return {
    wc, proN: pro.n, preN: pre.n, ratio, promotion, prevention,
    topPro: Object.entries(pro.found).sort((a, b) => b[1] - a[1]).slice(0, 10),
    topPre: Object.entries(pre.found).sort((a, b) => b[1] - a[1]).slice(0, 10),
    inv, invTotal: inv.product + inv.service + inv.process + inv.partner,
  };
}
function guessBoard(text) {
  const g = {};
  for (const k of ["female", "political"]) g[k] = countHits(text, LEX.titles[k]).n;
  const male = countHits(text, LEX.titles.male).n;
  g.total = g.female + male;
  return g;
}

/* ---------------------------------------------------------------- ขั้นที่ 1 UI */
function initStep1() {
  const ind = $("#fIndustry"), yr = $("#fYear");
  ind.innerHTML = Object.keys(M.industry).sort().map(i => `<option>${esc(i)}</option>`).join("");
  yr.innerHTML = M.meta.years.map(y => `<option${y === 2024 ? " selected" : ""}>${y}</option>`).join("");
  ind.onchange = yr.onchange = () => { seedFromIndustry(); renderModel(); };

  const dz = $("#dz"), fi = $("#file");
  dz.onclick = () => fi.click();
  dz.ondragover = e => { e.preventDefault(); dz.classList.add("hot"); };
  dz.ondragleave = () => dz.classList.remove("hot");
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove("hot"); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  fi.onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };

  $("#stmt").oninput = () => { recomputeDoc(); };
  $("#fAlias").oninput = e => { S.alias = e.target.value; $("#fAlias2").value = S.alias; };
  $("#btnClearDoc").onclick = () => { $("#stmt").value = ""; S.doc = null; $("#fileInfo").innerHTML = ""; setStat(""); recomputeDoc(); };
  $("#btnToModel").onclick = () => go("mo");
}

async function handleFile(file) {
  if (file.size > MAX_MB * 1e6) return setStat(`ไฟล์ใหญ่เกิน ${MAX_MB} MB`, "err");
  setStat("กำลังอ่านไฟล์ …");
  try {
    const t0 = performance.now();
    const { text, pages } = await readAnyFile(file);
    const full = normText(text);
    const st = sliceStatement(full);
    $("#stmt").value = st.text || full.slice(0, 6000);
    S.rawFull = full;
    S.fileMeta = { name: file.name, mb: (file.size / 1e6).toFixed(2), pages, words: countWords(full), head: st.head, ms: Math.round(performance.now() - t0) };
    const bg = guessBoard(full);
    if (bg.total >= 4) {
      const pct = Math.round(bg.female / bg.total * 100);
      S.boardGuess = { total: bg.total, femalePct: pct, pol: bg.political > 0 };
    } else S.boardGuess = null;
    setStat("อ่านไฟล์เสร็จแล้ว", "ok");
    recomputeDoc();
  } catch (e) {
    console.error(e); setStat("อ่านไฟล์ไม่สำเร็จ — ลองวางข้อความลงในกล่องด้านล่างแทน", "err");
  }
}

function recomputeDoc() {
  const stmt = $("#stmt").value.trim();
  const full = S.rawFull || stmt;
  S.doc = stmt ? analyseText(stmt, full) : null;
  seedFromIndustry();
  renderStep1();
  renderModel();
}

function seedFromIndustry() {
  const ind = $("#fIndustry").value, r = M.ranges, i = M.industry[ind] || {};
  const b = {
    promotion: S.doc ? S.doc.promotion : (i.promotion_median ?? r.promotion.median),
    female_pct: S.boardGuess ? S.boardGuess.femalePct : (i.female_pct_median ?? r.female_pct.median),
    pol_tie: S.boardGuess ? (S.boardGuess.pol ? 1 : 0) : 0,
    wa_board_tenure: i.tenure_median ?? r.wa_board_tenure.median,
    indep_pct: i.indep_pct_median ?? r.indep_pct.median,
    board_size: i.board_size_median ?? r.board_size.median,
    ln_assets: r.ln_assets.median, firm_age: r.firm_age.median,
    roa: r.roa.median, de_ratio_w: r.de_ratio_w.median,
    family_pct: r.family_pct ? r.family_pct.median : 20,
    ceo_tenure: r.ceo_tenure ? r.ceo_tenure.median : 8,
  };
  // เก็บค่าที่ผู้ใช้เลื่อนเองไว้ ไม่ให้ถูกทับ เว้นแต่กดคืนค่า
  S.base = b;
  S.form = Object.assign({}, b, S.userTouched || {});
}

function renderStep1() {
  const out = $("#extractOut"), fm = S.fileMeta;
  $("#fileInfo").innerHTML = fm ? `<div class="chips">
      <span class="chip"><b>${esc(fm.name)}</b></span>
      <span class="chip">${fm.mb} MB</span>${fm.pages ? `<span class="chip">${fm.pages} หน้า</span>` : ""}
      <span class="chip">${fm.words.toLocaleString()} คำ</span>
      ${fm.head ? `<span class="chip">พบหัวข้อ “${esc(fm.head)}”</span>` : `<span class="chip">ไม่พบหัวข้อสารผู้บริหาร</span>`}
      <span class="chip">${fm.ms} ms</span></div>` : "";

  if (!S.doc) { out.innerHTML = ""; return; }
  const d = S.doc, pPct = pctOf(d.promotion, M.liwc.promotion_q);
  const wl = w => `<span class="chip"><b>${esc(w[0])}</b> ${w[1]}</span>`;
  out.innerHTML = `
  <div class="card">
    <h3>โทนภาษาผู้บริหาร</h3>
    <p class="desc">นับคำจากพจนานุกรมเปิดแบบ substring รองรับทั้งไทยและอังกฤษ · ดัชนี = (เชิงรุก − เชิงป้องกัน) ÷ ผลรวม จึงไม่ขึ้นกับความยาวเอกสาร</p>
    <div class="tiles" style="grid-template-columns:repeat(4,1fr)">
      <div class="tile"><div class="lab">คำเชิงรุก</div><div class="val" style="color:var(--accent)">${d.proN}</div><div class="sub">ครั้งในสาร</div></div>
      <div class="tile"><div class="lab">คำเชิงป้องกัน</div><div class="val" style="color:var(--azure)">${d.preN}</div><div class="sub">ครั้งในสาร</div></div>
      <div class="tile"><div class="lab">ดัชนีโทนภาษา</div><div class="val">${fmt(d.ratio, 2)}</div><div class="sub">ช่วง −1 ถึง 1</div></div>
      <div class="tile"><div class="lab">Promotion (สเกลฐานข้อมูล)</div><div class="val">${fmt(d.promotion, 2)}</div><div class="sub">เปอร์เซ็นไทล์ ${Math.round(pPct)}</div></div>
    </div>
    <div style="margin-top:12px;font-size:11.5px;color:var(--greyl)">คำเชิงรุกที่พบบ่อย</div><div class="chips">${d.topPro.map(wl).join("") || "<span class='chip'>ไม่พบ</span>"}</div>
    <div style="margin-top:10px;font-size:11.5px;color:var(--greyl)">คำเชิงป้องกันที่พบบ่อย</div><div class="chips">${d.topPre.map(wl).join("") || "<span class='chip'>ไม่พบ</span>"}</div>
    <div class="note" style="margin-top:12px">ความยาวสารที่วัดได้ ${d.wc.toLocaleString()} คำ (ค่ากลางฐานข้อมูล ${M.liwc.wc_median.toLocaleString()} คำ) · เป็นพจนานุกรมเปิดที่แก้ไขได้ ไม่ใช่ซอฟต์แวร์ LIWC ที่มีลิขสิทธิ์ — ให้ผลตรงกันเชิงทิศทาง แต่ค่าตัวเลขอาจต่างกัน</div>
  </div>
  <div class="card">
    <h3>การประกาศนวัตกรรมในเอกสาร</h3>
    <p class="desc">นับจากทั้งเอกสาร ไม่ใช่เฉพาะสารผู้บริหาร เพราะการประกาศมักอยู่ในหมวดผลการดำเนินงานหรือกลยุทธ์</p>
    <div class="tiles" style="grid-template-columns:repeat(2,1fr)">
      <div class="tile" style="background:var(--mint)"><div class="lab">พันธมิตร / JV / MOU <b style="color:var(--accent)">= นวัตกรรมเปิด</b></div><div class="val" style="color:#0d7a5c">${d.inv.partner}</div><div class="sub">ตัวแปรที่โมเดลทำนาย</div></div>
      <div class="tile"><div class="lab">รวมทุกประเภท</div><div class="val">${d.invTotal}</div><div class="sub">ผลิตภัณฑ์ + บริการ + กระบวนการ + พันธมิตร</div></div>
    </div>
    <table style="margin-top:14px"><thead><tr><th>ประเภท</th><th class="n">จำนวนที่นับได้</th><th>หมายเหตุ</th></tr></thead><tbody>
      <tr><td>ผลิตภัณฑ์ใหม่</td><td class="n">${d.inv.product}</td><td style="color:var(--greyl)">ไม่เข้าโมเดลนี้</td></tr>
      <tr><td>บริการใหม่</td><td class="n">${d.inv.service}</td><td style="color:var(--greyl)">ไม่เข้าโมเดลนี้</td></tr>
      <tr><td>นวัตกรรมกระบวนการ</td><td class="n">${d.inv.process}</td><td style="color:var(--greyl)">ไม่เข้าโมเดลนี้</td></tr>
      <tr class="me"><td><b>พันธมิตรเชิงกลยุทธ์</b></td><td class="n"><b>${d.inv.partner}</b></td><td>คือค่าจริงที่ใช้เทียบกับค่าคาดการณ์</td></tr>
    </tbody></table>
    ${S.boardGuess ? `<div class="note ok" style="margin-top:12px"><b>เดาโครงสร้างบอร์ดจากเอกสาร</b> — พบคำนำหน้าชื่อรวม ${S.boardGuess.total} รายการ · ประมาณกรรมการหญิง ${S.boardGuess.femalePct}%${S.boardGuess.pol ? " · พบตำแหน่งเชิงการเมือง" : ""} · ค่านี้เป็นเพียงการประมาณ กรุณายืนยันในขั้นที่ 2</div>` : ""}
  </div>`;
}

/* ---------------------------------------------------------------- ขั้นที่ 2 UI */
function initStep2() {
  $$("#engTog button").forEach(b => b.onclick = () => {
    S.engine = b.dataset.e;
    $$("#engTog button").forEach(x => x.setAttribute("aria-selected", x === b));
    renderModel();
  });
  $("#btnResetSl").onclick = () => { S.userTouched = null; seedFromIndustry(); renderModel(); };
  $("#btnSaveCand").onclick = saveCandidate;
  // ช่องชื่อเรียกมี 2 ที่ (ขั้น 1 และขั้น 2) — ให้ค่าตรงกันเสมอ
  const sync = e => { S.alias = e.target.value; $("#fAlias").value = S.alias; $("#fAlias2").value = S.alias; };
  $("#fAlias2").oninput = sync;
}

function buildSliders() {
  const keys = engVars(S.engine).concat(M.controls);
  const host = $("#sliders");
  host.innerHTML = keys.map(k => {
    const v = VARS[k]; if (!v) return "";
    const cur = S.form[k];
    const rg = M.ranges[k];
    // ขอบเขต slider อิงข้อมูลจริง เผื่อขอบเล็กน้อย
    const lo = rg ? Math.floor((rg.min - (rg.max - rg.min) * .04) / v.step) * v.step : v.min;
    const hi = rg ? Math.ceil((rg.max + (rg.max - rg.min) * .04) / v.step) * v.step : v.max;
    if (v.bool) {
      return `<div class="sl" data-k="${k}"><div class="top"><span>${v.lab}</span>
        <span class="tog" style="padding:2px"><button data-v="0" ${cur ? "" : 'aria-selected="true"'} style="padding:4px 12px;font-size:11.5px">ไม่มี</button>
        <button data-v="1" ${cur ? 'aria-selected="true"' : ""} style="padding:4px 12px;font-size:11.5px">มี</button></span></div></div>`;
    }
    return `<div class="sl" data-k="${k}">
      <div class="top"><span>${v.lab}${v.ctrl ? ' <span style="color:var(--greyl);font-size:10.5px">· ควบคุม</span>' : ""}</span><b>${fmt(cur, v.dec)}${v.unit ? " " + v.unit : ""}</b></div>
      <input type="range" min="${lo}" max="${hi}" step="${v.step}" value="${cur}">
      <div class="hint"></div></div>`;
  }).join("");

  host.querySelectorAll(".sl").forEach(el => {
    const k = el.dataset.k, v = VARS[k];
    if (v.bool) {
      el.querySelectorAll("button").forEach(b => b.onclick = () => {
        setVar(k, +b.dataset.v);
        el.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
        renderModel(true);
      });
    } else {
      const inp = el.querySelector("input");
      inp.oninput = () => { setVar(k, +inp.value); el.querySelector("b").textContent = fmt(+inp.value, v.dec) + (v.unit ? " " + v.unit : ""); updateHint(el, k, +inp.value); renderModel(true); };
      updateHint(el, k, S.form[k]);
    }
  });
}
function updateHint(el, k, val) {
  const r = M.ranges[k]; if (!r) return;
  const h = el.querySelector(".hint"); if (!h) return;
  if (val < r.p05 || val > r.p95) {
    h.className = "hint warn";
    h.textContent = `⚠ นอกช่วงข้อมูลที่พบจริง (${fmt(r.p05, 1)}–${fmt(r.p95, 1)}) — ค่าคาดการณ์เป็นการคาดนอกช่วง ความเชื่อมั่นต่ำ`;
  } else {
    h.className = "hint";
    h.textContent = `ค่ากลางฐานข้อมูล ${fmt(r.median, 1)} · ช่วงที่พบบ่อย ${fmt(r.p05, 1)}–${fmt(r.p95, 1)}`;
  }
}
function setVar(k, v) { S.form[k] = v; S.userTouched = Object.assign({}, S.userTouched || {}, { [k]: v }); }

function renderModel(skipSliders) {
  const note = ENG_NOTE[S.engine];
  $("#engNote").innerHTML = `<div class="note ${note.cls}" style="margin:0">${note.html}</div>`;
  if (!skipSliders) buildSliders();

  const ind = $("#fIndustry").value, yr = +$("#fYear").value;
  const p = predict(S.engine, S.form, ind, yr);
  const uni = M.universe[S.engine];
  const pct = pctOf(p.mu, uni.quantiles);
  const q = quintileOf(p.mu, uni.quintile_edges);
  const im = M.industry[ind] || {};
  const actual = S.doc ? S.doc.inv.partner : null;

  /* --- tiles --- */
  const alpha = M.engines[S.engine].alpha || 1;
  const PI = predInterval(p.mu, alpha);
  const inPI = actual !== null && actual >= PI.lo && actual <= PI.hi;
  $("#modelTiles").innerHTML = `
    <div class="tile hero"><div class="lab">ค่าคาดการณ์นวัตกรรมเปิด</div><div class="val">${fmt(p.mu, 2)}</div><div class="sub">รายการ/ปี · ค่าเฉลี่ยที่โมเดลคาด</div></div>
    <div class="tile"><div class="lab">95% CI ของค่าเฉลี่ย</div><div class="val" style="font-size:20px">${fmt(p.lo, 1)} – ${fmt(p.hi, 1)}</div><div class="sub">ความไม่แน่นอนของ “ค่ากลาง”</div></div>
    <div class="tile" style="background:var(--sand)"><div class="lab">90% ช่วงพยากรณ์ค่าจริง</div><div class="val" style="font-size:20px">${PI.lo} – ${PI.hi}</div><div class="sub">ช่วงที่บริษัทหนึ่ง ๆ น่าจะตกอยู่จริง</div></div>
    <div class="tile"><div class="lab">ค่าจริงที่นับได้จากเอกสาร</div><div class="val" style="color:${actual === null ? "var(--greyl)" : "var(--ink)"}">${actual === null ? "—" : actual}</div><div class="sub">${actual === null ? "ยังไม่ได้อัปโหลดเอกสาร" : (inPI ? "อยู่ในช่วงพยากรณ์ 90%" : "นอกช่วงพยากรณ์ 90%")}</div></div>`;

  /* --- gauge --- */
  const R = 52, C = 2 * Math.PI * R, frac = Math.min(pct / 100, 1);
  $("#gauge").innerHTML = `
    <svg width="124" height="124" viewBox="0 0 124 124">
      <circle cx="62" cy="62" r="${R}" fill="none" stroke="#eef1f4" stroke-width="13"/>
      <circle cx="62" cy="62" r="${R}" fill="none" stroke="${frac > .6 ? "#17b387" : frac > .35 ? "#3c8dde" : "#e8973a"}" stroke-width="13"
        stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 62 62)"/>
      <text x="62" y="60" text-anchor="middle" font-family="Kanit" font-size="23" font-weight="600" fill="#0f2233">${Math.round(pct)}</text>
      <text x="62" y="77" text-anchor="middle" font-family="Kanit" font-size="9.5" fill="#93a1ac">เปอร์เซ็นไทล์</text>
    </svg>
    <div class="txt">
      <div class="big">${fmt(p.mu, 2)} <span style="font-size:15px;font-weight:300;color:var(--grey)">รายการ/ปี</span></div>
      <div class="ci">95% CI ของค่าเฉลี่ย : <b>${fmt(p.lo, 2)} – ${fmt(p.hi, 2)}</b></div>
      <div class="ci" style="color:#a3651c">90% ช่วงพยากรณ์ค่าจริง : <b>${PI.lo} – ${PI.hi}</b> รายการ</div>
      <div class="cap">สองช่วงนี้ตอบคนละคำถาม — <b>CI</b> บอกว่า “ค่ากลางของบริษัทแบบนี้อยู่ตรงไหน” · <b>ช่วงพยากรณ์</b> บอกว่า “บริษัทหนึ่ง ๆ จะออกมาเท่าไร” ซึ่งกว้างกว่าเสมอ${(PI.hi - PI.lo) > 3 * p.mu ? " — กรณีนี้กว้างมาก อย่าใช้ตัวเลขเดียวชี้ขาด" : ""}</div>
    </div>`;

  /* --- quintile --- */
  const edges = [0, ...uni.quintile_edges, uni.quantiles[100]];
  $("#quint").innerHTML = [1, 2, 3, 4, 5].map(i => {
    const mid = (edges[i - 1] + edges[i]) / 2;
    const h = Math.max(12, mid / (edges[5] || 1) * 100);
    return `<div class="qbar${i === q ? " me" : ""}"><div class="n">${fmt(mid, 1)}</div><div class="b" style="height:${h}%"></div><div class="l">Q${i}</div></div>`;
  }).join("");

  /* --- sensitivity --- */
  const vars = engVars(S.engine);
  const rows = vars.map(k => {
    const r = M.ranges[k]; if (!r) return null;
    const d = VARS[k] && VARS[k].bool ? 1 : r.sd;
    const f2 = Object.assign({}, S.form); f2[k] = S.form[k] + d;
    const p2 = predict(S.engine, f2, ind, yr);
    const pctChg = (p2.mu / p.mu - 1) * 100;
    const eng = M.engines[S.engine];
    const pv = Math.min(...eng.vars.filter(t => t.includes("c_" + k)).map(t => eng.p[t]));
    return { k, lab: (VARS[k] || {}).lab || k, chg: pctChg, p: pv, step: d, unit: (VARS[k] || {}).unit || "" };
  }).filter(Boolean).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg));
  const mx = Math.max(...rows.map(r => Math.abs(r.chg)), 1) * 1.1;
  $("#sens").innerHTML = rows.map(r => {
    const sig = r.p < .05, w = Math.abs(r.chg) / mx * 48;
    const col = !sig ? "#c3ccd4" : r.chg < 0 ? "var(--rose)" : "var(--accent)";
    return `<div class="bar" style="--lw:200px"><div>${r.lab}<div style="font-size:10px;color:var(--greyl)">+${fmt(r.step, 1)}${r.unit ? " " + r.unit : ""} · p = ${fmt(r.p, 3)} ${sig ? "" : "(ไม่มีนัยสำคัญ)"}</div></div>
      <div class="t"><span class="z" style="left:50%"></span><span class="f" style="left:${r.chg < 0 ? 50 - w : 50}%;width:${w}%;background:${col}"></span></div>
      <div class="v" style="color:${sig ? "var(--ink)" : "var(--greyl)"}">${r.chg > 0 ? "+" : ""}${fmt(r.chg, 1)}%</div></div>`;
  }).join("") || "<div class='empty'>ไม่มีตัวแปรให้แสดง</div>";

  /* --- context band --- */
  $("#ctxBand").innerHTML = CTX.map(([k, lab, unit, why]) => {
    const r = M.ranges[k];
    const cur = S.form[k] ?? (r ? r.median : 0);
    const hi = r ? Math.ceil(r.max) : (k === "family_pct" ? 90 : 40);
    return `<div class="sl" style="opacity:.75"><div class="top"><span>${lab}</span><b>${fmt(cur, 1)} ${unit}</b></div>
      <input type="range" min="0" max="${hi}" step="1" value="${cur}" data-c="${k}">
      <div class="hint">${why}</div></div>`;
  }).join("");
  $("#ctxBand").querySelectorAll("input").forEach(i => i.oninput = e => { S.form[e.target.dataset.c] = +e.target.value; e.target.closest(".sl").querySelector("b").textContent = fmt(+e.target.value, 1) + " " + (e.target.dataset.c === "family_pct" ? "%" : "ปี"); });

  /* --- advice --- */
  const sigRows = rows.filter(r => r.p < .05);
  const nsRows = rows.filter(r => r.p >= .05);
  const lifts = sigRows.map(r => {
    const dir = r.chg > 0 ? "เพิ่ม" : "ลด";
    return `<li><b>${dir}${r.lab}</b> ${fmt(Math.abs(r.step), 1)}${r.unit ? " " + r.unit : ""} → ค่าคาดการณ์เปลี่ยน <b style="color:${r.chg > 0 ? "var(--accent)" : "var(--rose)"}">${r.chg > 0 ? "+" : ""}${fmt(r.chg, 1)}%</b> (p = ${fmt(r.p, 3)})</li>`;
  }).join("");
  $("#advice").innerHTML = `
    ${sigRows.length ? `<div class="note ok" style="margin-bottom:10px"><b>มีหลักฐานทางสถิติรองรับ</b><ul style="margin:7px 0 0;padding-left:17px;line-height:1.75">${lifts}</ul></div>` : `<div class="note warn" style="margin-bottom:10px"><b>ไม่มีตัวแปรใดในชุดโมเดลนี้ที่มีนัยสำคัญที่ระดับ 5%</b><br>แปลว่าการเลื่อน slider ไม่ควรถูกใช้เป็นเหตุผลในการตัดสินใจ</div>`}
    ${nsRows.length ? `<div class="note warn"><b>สิ่งที่ไม่ควรใช้เป็นเหตุผล</b><ul style="margin:7px 0 0;padding-left:17px;line-height:1.75">${nsRows.map(r => `<li>${r.lab} — p = ${fmt(r.p, 3)} ไม่ผ่านเกณฑ์นัยสำคัญ ผลที่เห็นบน slider อาจเป็นความบังเอิญของข้อมูล</li>`).join("")}</ul></div>` : ""}
    <div class="note info" style="margin-top:10px"><b>ข้อจำกัดที่ต้องแนบทุกครั้ง</b> — โมเดลจับความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง 5 ปี ไม่ใช่ความสัมพันธ์เชิงสาเหตุ · การเปลี่ยนโครงสร้างบอร์ดจริงอาจไม่ให้ผลตามที่คำนวณ · ใช้จัดลำดับว่าควรตรวจสอบประเด็นไหนก่อน ไม่ใช่คำรับประกันผล</div>`;

  renderScenarios(ind, yr, p.mu, alpha);
  renderAbout();
  renderDashboard();
}

/* ---------- ตาราง What-if แบบสถานการณ์สำเร็จรูป ---------- */
const SCEN = [
  ["ปัจจุบัน (ค่าที่กรอก)", null],
  ["กรรมการหญิง +10 จุด%", f => ({ female_pct: Math.min(f.female_pct + 10, 71) })],
  ["กรรมการอิสระ +10 จุด%", f => ({ indep_pct: Math.min(f.indep_pct + 10, 80) })],
  ["อายุงานเฉลี่ยบอร์ด −5 ปี", f => ({ wa_board_tenure: Math.max(f.wa_board_tenure - 5, 0) })],
  ["ขนาดบอร์ด +2 คน", f => ({ board_size: Math.min(f.board_size + 2, 20) })],
  ["Promotion focus +0.5", f => ({ promotion: Math.min(f.promotion + .5, 2.3) })],
  ["สลับสถานะกรรมการการเมือง", f => ({ pol_tie: f.pol_tie ? 0 : 1 })],
  ["ทำทั้งหมดพร้อมกัน", f => ({
    female_pct: Math.min(f.female_pct + 10, 71), indep_pct: Math.min(f.indep_pct + 10, 80),
    wa_board_tenure: Math.max(f.wa_board_tenure - 5, 0), board_size: Math.min(f.board_size + 2, 20),
  })],
];
function renderScenarios(ind, yr, baseMu, alpha) {
  const host = $("#scen"); if (!host) return;
  const eng = M.engines[S.engine];
  const rows = SCEN.map(([lab, fn]) => {
    const f2 = fn ? Object.assign({}, S.form, fn(S.form)) : S.form;
    const pr = predict(S.engine, f2, ind, yr);
    const changed = fn ? Object.keys(fn(S.form)) : [];
    const anySig = changed.some(k => Math.min(...eng.vars.filter(t => t.includes("c_" + k)).map(t => eng.p[t]), 1) < .05);
    return { lab, mu: pr.mu, chg: (pr.mu / baseMu - 1) * 100, base: !fn, sig: anySig, none: changed.length === 0 };
  });
  const mx = Math.max(...rows.map(r => r.mu)) * 1.1;
  host.innerHTML = `<table><thead><tr><th>สถานการณ์</th><th class="n">ค่าคาดหวัง</th><th style="width:34%">เทียบกัน</th><th class="n">เปลี่ยนแปลง</th><th>หลักฐาน</th></tr></thead><tbody>
    ${rows.map(r => `<tr${r.base ? ' class="me"' : ""}>
      <td>${r.base ? "<b>" + r.lab + "</b>" : r.lab}</td>
      <td class="n"><b>${fmt(r.mu, 2)}</b></td>
      <td><div class="t" style="height:9px;border-radius:99px;background:#eef1f4;position:relative;overflow:hidden">
        <span style="position:absolute;top:0;bottom:0;left:0;width:${r.mu / mx * 100}%;border-radius:99px;background:${r.base ? "var(--ink2)" : r.chg > 0 ? "var(--accent)" : "var(--rose)"}"></span></div></td>
      <td class="n" style="color:${r.base ? "var(--greyl)" : r.chg > 0 ? "var(--accent)" : "var(--rose)"}">${r.base ? "—" : (r.chg > 0 ? "+" : "") + fmt(r.chg, 1) + "%"}</td>
      <td>${r.base ? "" : r.sig ? '<span class="pill ok">มีนัยสำคัญ</span>' : '<span class="pill no">ไม่มีนัยสำคัญ</span>'}</td></tr>`).join("")}
  </tbody></table>
  <div class="note" style="margin-top:12px">แถวที่ขึ้น <b>“ไม่มีนัยสำคัญ”</b> แปลว่าตัวแปรที่ปรับในสถานการณ์นั้นไม่ผ่านเกณฑ์นัยสำคัญ 5% ในชุดโมเดลที่เลือกอยู่ — ตัวเลขที่เห็นอาจเป็นความบังเอิญของข้อมูล ไม่ควรใช้เป็นเหตุผลตัดสินใจ</div>`;
}

/* ---------- แถบข้าง: เกี่ยวกับโมเดล ---------- */
function renderAbout() {
  const host = $("#about"); if (!host) return;
  const e = M.engines[S.engine], o = e.oos || {};
  const drivers = e.vars.filter(t => !M.controls.includes(t.replace(/^c_/, "")))
    .map(t => ({ t, p: e.p[t], irr: Math.exp(e.coef[t]) }))
    .sort((a, b) => a.p - b.p).slice(0, 4);
  const nm = t => (VARS[t.replace(/^c_/, "")] || {}).lab || t.replace(/^c_/, "").replace(/:c_/, " × ");
  const grade = (v, good, ok) => v >= good ? "ok" : v >= ok ? "warn" : "bad";
  host.innerHTML = `
    <div class="ab-h">เกี่ยวกับโมเดล</div>
    <div class="ab-k"><span>ชุดโมเดลที่ใช้</span><b>${S.engine} · ${esc(e.label)}</b></div>
    <div class="ab-k"><span>เทอมทั้งหมด</span><b>${e.n_terms}</b></div>
    <div class="ab-k"><span>α (overdispersion)</span><b>${fmt(e.alpha, 3)}</b></div>
    <div class="ab-k"><span>ข้อมูลที่ใช้ฟิต</span><b>${e.n} บริษัท-ปี</b></div>
    <div class="ab-k"><span>ปีในฐานข้อมูล</span><b>${M.meta.years[0]}–${M.meta.years[M.meta.years.length - 1]}</b></div>
    <div class="ab-h2">ตัวขับเคลื่อนหลัก</div>
    <ul class="ab-ul">${drivers.map(d => `<li><b>${nm(d.t)}</b><br>IRR = ${fmt(d.irr, 3)} · p = ${fmt(d.p, 3)}
      <span class="pill ${d.p < .05 ? "ok" : "no"}" style="margin-left:4px">${d.p < .05 ? "มีนัยสำคัญ" : "ไม่มีนัยสำคัญ"}</span></li>`).join("")}</ul>
    <div class="ab-h2">ความแม่นจากการทดสอบนอกกลุ่มตัวอย่าง</div>
    <div class="ab-k"><span>ทดสอบกับ</span><b>${o.n_test ?? "—"} บริษัท-ปี</b></div>
    <div class="ab-k"><span>Spearman (จัดอันดับ)</span><b class="g-${grade(o.spearman ?? 0, .3, .15)}">${fmt(o.spearman, 3)}</b></div>
    <div class="ab-k"><span>c-index</span><b class="g-${grade(o.c_index ?? 0, .65, .55)}">${fmt(o.c_index, 3)}</b></div>
    <div class="ab-k"><span>MASE (เทียบการเดาแบบ naive)</span><b class="g-${(o.mase ?? 9) < 1 ? "ok" : "warn"}">${fmt(o.mase, 3)}</b></div>
    <div class="ab-k"><span>ช่วงพยากรณ์ 90% ครอบคลุมจริง</span><b class="g-${Math.abs((o.pi90_coverage ?? 0) - .9) < .06 ? "ok" : "warn"}">${fmt((o.pi90_coverage ?? 0) * 100, 1)}%</b></div>
    <div class="ab-note ${(o.mase ?? 9) < 1 ? "ok" : "warn"}">
      ${(o.mase ?? 9) < 1
        ? "MASE &lt; 1 — โมเดลทำได้ดีกว่าการเดาด้วยค่าปีก่อนของบริษัทเดียวกัน"
        : `MASE = ${fmt(o.mase, 2)} ≥ 1 — <b>โมเดลยังไม่ชนะการเดาด้วยค่าปีก่อน</b> ในเชิงค่าสัมบูรณ์ จุดแข็งอยู่ที่การ<b>จัดอันดับ</b> (c-index ${fmt(o.c_index, 2)}) ไม่ใช่การทำนายจำนวนที่แม่นยำ`}
    </div>
    <div class="ab-note warn"><b>หมายเหตุการเทียบกับโมเดลอีกชุด</b><br>
      โมเดลอีกชุดที่ทีมได้รับ รายงาน Political × Promotion IRR = 2.09 (p = .005)<br>
      ชุดข้อมูลนี้ทดสอบ 6 สเปกแล้วได้ IRR 0.70–0.86 (p = 0.06–0.28) — <b>ทิศทางตรงข้าม</b><br>
      สาเหตุที่เป็นไปได้: นิยามตัวแปรตามต่างกัน · α ต่างกัน (0.707 vs ${fmt(e.alpha, 2)}) · จำนวนเทอมต่างกัน (31 vs ${e.n_terms})<br>
      <b>ต้องเทียบ data dictionary และ do-file กันก่อนสรุป</b> ระบบนี้ไม่แก้ตัวเลขให้ตรงกันโดยไม่รู้สาเหตุ</div>`;
}

function saveCandidate() {
  const ind = $("#fIndustry").value, yr = +$("#fYear").value;
  const alias = ($("#fAlias2").value || $("#fAlias").value || "").trim() || `ผู้สมัคร ${String.fromCharCode(65 + S.cands.length)}`;
  const pA = predict("A", S.form, ind, yr), pB = predict("B", S.form, ind, yr);
  S.cands.push({
    alias, industry: ind, year: yr,
    form: Object.assign({}, S.form),
    actual: S.doc ? S.doc.inv.partner : null,
    doc: S.doc ? { promotion: S.doc.promotion, ratio: S.doc.ratio, wc: S.doc.wc, invTotal: S.doc.invTotal } : null,
    A: pA, B: pB,
    pctA: pctOf(pA.mu, M.universe.A.quantiles), pctB: pctOf(pB.mu, M.universe.B.quantiles),
    qA: quintileOf(pA.mu, M.universe.A.quintile_edges), qB: quintileOf(pB.mu, M.universe.B.quintile_edges),
  });
  renderDashboard();
  go("db");
}

/* ---------------------------------------------------------------- ขั้นที่ 3 UI */
function renderDashboard() {
  const C = S.cands, E = S.engine;
  if (!C.length) {
    $("#dbTiles").innerHTML = "";
    ["#rankTable", "#benchTable", "#cmpChart", "#engCmp"].forEach(s =>
      $(s).innerHTML = `<div class="empty">ยังไม่มีผู้สมัคร — ไปที่ขั้นที่ 2 แล้วกด “＋ เก็บเป็นผู้สมัคร”</div>`);
    return;
  }
  const key = c => c[E].mu;
  const sorted = [...C].sort((a, b) => key(b) - key(a));
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const spread = C.length > 1 ? (best[E].mu / (worst[E].mu || .01) - 1) * 100 : 0;
  const flips = C.filter(c => quintileOf(c.A.mu, M.universe.A.quintile_edges) !== quintileOf(c.B.mu, M.universe.B.quintile_edges)).length;

  $("#dbTiles").innerHTML = `
    <div class="tile hero"><div class="lab">อันดับ 1 (ชุดโมเดล ${E})</div><div class="val" style="font-size:20px">${esc(best.alias)}</div><div class="sub">${fmt(best[E].mu, 2)} รายการ/ปี · เปอร์เซ็นไทล์ ${Math.round(E === "A" ? best.pctA : best.pctB)}</div></div>
    <div class="tile"><div class="lab">จำนวนที่เก็บไว้</div><div class="val">${C.length}</div><div class="sub">ผู้สมัคร / บริษัท</div></div>
    <div class="tile"><div class="lab">ช่วงห่างอันดับ 1 กับสุดท้าย</div><div class="val">${C.length > 1 ? "+" + fmt(spread, 0) + "%" : "—"}</div><div class="sub">${C.length > 1 ? "ยิ่งห่างมาก ยิ่งแยกความต่างได้ชัด" : "ต้องมีอย่างน้อย 2 ราย"}</div></div>
    <div class="tile"><div class="lab">อันดับเปลี่ยนเมื่อสลับชุดโมเดล</div><div class="val" style="color:${flips ? "var(--amber)" : "var(--accent)"}">${flips}</div><div class="sub">${flips ? "ข้อสรุปขึ้นกับสมมติฐานของโมเดล" : "ทั้งสองชุดโมเดลให้ข้อสรุปเดียวกัน"}</div></div>`;

  /* ranking */
  $("#rankTable").innerHTML = `<table><thead><tr>
    <th>#</th><th>ชื่อเรียก</th><th>อุตสาหกรรม</th><th class="n">คาดการณ์</th><th class="n">CI 95%</th><th class="n">%ile</th><th class="n">Q</th><th class="n">ค่าจริง</th></tr></thead><tbody>
    ${sorted.map((c, i) => {
      const p = c[E], pc = E === "A" ? c.pctA : c.pctB, q = E === "A" ? c.qA : c.qB;
      return `<tr data-i="${C.indexOf(c)}" style="cursor:pointer">
        <td class="n">${i + 1}</td><td><b>${esc(c.alias)}</b></td><td style="color:var(--grey)">${esc(c.industry)} · ${c.year}</td>
        <td class="n"><b>${fmt(p.mu, 2)}</b></td><td class="n" style="color:var(--greyl)">${fmt(p.lo, 1)}–${fmt(p.hi, 1)}</td>
        <td class="n">${Math.round(pc)}</td><td class="n"><span class="pill ${q >= 4 ? "ok" : q <= 2 ? "bad" : "warn"}">Q${q}</span></td>
        <td class="n">${c.actual === null ? "—" : c.actual}</td></tr>`;
    }).join("")}</tbody></table>`;
  $("#rankTable").querySelectorAll("tr[data-i]").forEach(tr => tr.onclick = () => {
    const c = C[+tr.dataset.i];
    S.form = Object.assign({}, c.form); S.userTouched = Object.assign({}, c.form);
    $("#fIndustry").value = c.industry; $("#fYear").value = c.year;
    $("#fAlias").value = $("#fAlias2").value = S.alias = c.alias;
    go("mo"); renderModel();
  });

  /* bench vs industry */
  const c0 = sorted[0], im = M.industry[c0.industry] || {};
  const BR = [["female_pct", "สัดส่วนกรรมการหญิง (%)", im.female_pct_median],
              ["indep_pct", "สัดส่วนกรรมการอิสระ (%)", im.indep_pct_median],
              ["wa_board_tenure", "อายุงานเฉลี่ยบอร์ด (ปี)", im.tenure_median],
              ["board_size", "ขนาดคณะกรรมการ (คน)", im.board_size_median],
              ["promotion", "Promotion focus", im.promotion_median]];
  $("#benchTable").innerHTML = `<div style="font-size:11.5px;color:var(--greyl);margin-bottom:8px">อันดับ 1 : <b style="color:var(--ink)">${esc(c0.alias)}</b> · ${esc(c0.industry)} (n = ${im.n ?? "—"})</div>
    <table><thead><tr><th>ตัวแปร</th><th class="n">ค่าที่กรอก</th><th class="n">ค่ากลางอุตสาหกรรม</th><th class="n">ต่าง</th></tr></thead><tbody>
    ${BR.map(([k, lab, med]) => {
      const v = c0.form[k], d = (med === undefined || med === null) ? null : v - med;
      const col = d === null ? "var(--greyl)" : Math.abs(d) < 1e-9 ? "var(--greyl)" : d > 0 ? "var(--accent)" : "var(--amber)";
      return `<tr><td>${lab}</td><td class="n"><b>${fmt(v, 1)}</b></td><td class="n" style="color:var(--grey)">${fmt(med, 1)}</td>
        <td class="n" style="color:${col}">${d === null ? "—" : (d > 0 ? "+" : "") + fmt(d, 1)}</td></tr>`;
    }).join("")}</tbody></table>
    <div class="note" style="margin-top:12px">“สูงกว่า” ไม่ได้แปลว่าดีเสมอไป — อายุงานเฉลี่ยของบอร์ดยิ่งต่ำยิ่งสัมพันธ์กับนวัตกรรมเปิดที่สูงขึ้น</div>`;

  /* candidate compare */
  const CV = ["female_pct", "indep_pct", "wa_board_tenure", "board_size", "promotion"];
  $("#cmpChart").innerHTML = CV.map(k => {
    const v = VARS[k], vals = C.map(c => c.form[k]);
    const mx = Math.max(...vals, .0001) * 1.12;
    return `<div style="margin-bottom:13px"><div style="font-size:11.5px;color:var(--greyl);margin-bottom:3px">${v.lab}${v.unit ? " (" + v.unit + ")" : ""}</div>
      ${C.map((c, i) => `<div class="bar" style="--lw:120px;margin:4px 0"><div style="font-size:11.5px">${esc(c.alias)}</div>
        <div class="t"><span class="f" style="left:0;width:${c.form[k] / mx * 100}%;background:${["#17b387", "#3c8dde", "#e8973a", "#7a6ad8", "#c2506b"][i % 5]}"></span></div>
        <div class="v">${fmt(c.form[k], v.dec)}</div></div>`).join("")}</div>`;
  }).join("");

  /* engine compare */
  const mxE = Math.max(...C.flatMap(c => [c.A.mu, c.B.mu])) * 1.12;
  $("#engCmp").innerHTML = C.map(c => {
    const qa = quintileOf(c.A.mu, M.universe.A.quintile_edges), qb = quintileOf(c.B.mu, M.universe.B.quintile_edges);
    return `<div style="margin-bottom:13px"><div style="font-size:12px;margin-bottom:3px"><b>${esc(c.alias)}</b>
      ${qa !== qb ? `<span class="pill warn" style="margin-left:6px">อันดับต่างกัน Q${qa} ↔ Q${qb}</span>` : `<span class="pill ok" style="margin-left:6px">ตรงกัน Q${qa}</span>`}</div>
      <div class="bar" style="--lw:110px;margin:4px 0"><div style="font-size:11.5px;color:var(--amber)">A · สเปก Pitch</div>
        <div class="t"><span class="f" style="left:0;width:${c.A.mu / mxE * 100}%;background:var(--amber)"></span></div><div class="v">${fmt(c.A.mu, 2)}</div></div>
      <div class="bar" style="--lw:110px;margin:4px 0"><div style="font-size:11.5px;color:var(--accent)">B · ตามหลักฐาน</div>
        <div class="t"><span class="f" style="left:0;width:${c.B.mu / mxE * 100}%;background:var(--accent)"></span></div><div class="v">${fmt(c.B.mu, 2)}</div></div></div>`;
  }).join("") + `<div class="note info" style="margin-top:6px">ถ้าอันดับเปลี่ยนเมื่อสลับชุดโมเดล แปลว่าข้อสรุปขึ้นกับสมมติฐานของโมเดล ไม่ใช่ขึ้นกับข้อมูล — ต้องรายงานให้ผู้ตัดสินใจทราบทุกครั้ง</div>`;
}

/* ---------------------------------------------------------------- ส่งออก */
const EXPORT_COLS = [
  ["alias", "ชื่อเรียก"], ["industry", "อุตสาหกรรม"], ["year", "ปี"],
  ["promotion", "Promotion focus"], ["female_pct", "กรรมการหญิง %"], ["indep_pct", "กรรมการอิสระ %"],
  ["wa_board_tenure", "อายุงานเฉลี่ยบอร์ด ปี"], ["board_size", "ขนาดบอร์ด คน"], ["pol_tie", "กรรมการการเมือง 0/1"],
  ["family_pct", "กรรมการครอบครัว %"], ["ln_assets", "ln สินทรัพย์"], ["firm_age", "อายุบริษัท"], ["roa", "ROA %"], ["de_ratio_w", "D/E"],
  ["A_mu", "คาดการณ์ A"], ["A_lo", "A ล่าง 95%"], ["A_hi", "A บน 95%"], ["A_pct", "A เปอร์เซ็นไทล์"], ["A_q", "A quintile"],
  ["B_mu", "คาดการณ์ B"], ["B_lo", "B ล่าง 95%"], ["B_hi", "B บน 95%"], ["B_pct", "B เปอร์เซ็นไทล์"], ["B_q", "B quintile"],
  ["actual", "ค่าจริงจากเอกสาร"],
];
function rowOf(c) {
  const o = { alias: c.alias, industry: c.industry, year: c.year, actual: c.actual ?? "" };
  ["promotion", "female_pct", "indep_pct", "wa_board_tenure", "board_size", "pol_tie", "family_pct", "ln_assets", "firm_age", "roa", "de_ratio_w"]
    .forEach(k => o[k] = c.form[k] === undefined ? "" : +(+c.form[k]).toFixed(3));
  for (const e of ["A", "B"]) {
    o[e + "_mu"] = +c[e].mu.toFixed(3); o[e + "_lo"] = +c[e].lo.toFixed(3); o[e + "_hi"] = +c[e].hi.toFixed(3);
    o[e + "_pct"] = Math.round(e === "A" ? c.pctA : c.pctB); o[e + "_q"] = e === "A" ? c.qA : c.qB;
  }
  return o;
}
function dl(name, text, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function initExport() {
  $("#btnCsv").onclick = () => {
    if (!S.cands.length) return alert("ยังไม่มีผู้สมัคร");
    const head = EXPORT_COLS.map(c => c[1]).join(",");
    const body = S.cands.map(c => { const r = rowOf(c); return EXPORT_COLS.map(k => `"${String(r[k[0]] ?? "").replace(/"/g, '""')}"`).join(","); });
    dl("promosignal_ranking.csv", "﻿" + [head, ...body].join("\n"), "text/csv;charset=utf-8");
  };
  $("#btnJson").onclick = () => {
    dl("promosignal_export.json", JSON.stringify({
      generated: new Date().toISOString(), engine_used: S.engine,
      model_meta: M.meta, engines_summary: summariseEngines(),
      candidates: S.cands.map(rowOf),
      disclaimer: "ผลลัพธ์เป็นการคาดการณ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่ความสัมพันธ์เชิงสาเหตุ ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน",
    }, null, 2), "application/json");
  };
  $("#btnHtml").onclick = () => dl("promosignal_report.html", buildReport(), "text/html;charset=utf-8");
  $("#btnPrint").onclick = () => window.print();
}
function summariseEngines() {
  const o = {};
  for (const k of ["A", "B"]) {
    const e = M.engines[k];
    o[k] = { label: e.label, n: e.n, pseudo_r2: e.pseudo_r2, oos: e.oos,
      terms: e.vars.map(t => ({ term: t, coef: +e.coef[t].toFixed(5), se: +e.se[t].toFixed(5), p: +e.p[t].toFixed(4), significant_5pct: e.p[t] < .05 })) };
  }
  return o;
}
function buildReport() {
  const rows = S.cands.map(rowOf);
  const th = EXPORT_COLS.map(c => `<th>${esc(c[1])}</th>`).join("");
  const tb = rows.map(r => `<tr>${EXPORT_COLS.map(k => `<td>${esc(r[k[0]] ?? "")}</td>`).join("")}</tr>`).join("");
  const eng = summariseEngines();
  const engTbl = ["A", "B"].map(k => `<h3>ชุดโมเดล ${k} — ${esc(eng[k].label)}</h3>
    <p>N = ${eng[k].n} · pseudo R² = ${eng[k].pseudo_r2}${eng[k].oos ? ` · ทดสอบนอกกลุ่มตัวอย่าง n = ${eng[k].oos.n_test}, MAE = ${eng[k].oos.mae}` : ""}</p>
    <table><thead><tr><th>ตัวแปร</th><th>สัมประสิทธิ์</th><th>SE</th><th>p</th><th>นัยสำคัญ 5%</th></tr></thead><tbody>
    ${eng[k].terms.map(t => `<tr><td>${esc(t.term)}</td><td>${t.coef}</td><td>${t.se}</td><td>${t.p}</td><td>${t.significant_5pct ? "ใช่" : "ไม่"}</td></tr>`).join("")}
    </tbody></table>`).join("");
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>PromoSignal — รายงานผล</title>
<style>body{font-family:"Kanit","Sarabun",system-ui,sans-serif;font-weight:300;max-width:1100px;margin:34px auto;padding:0 22px;color:#0f2233;line-height:1.65}
h1{font-size:23px;font-weight:600;margin:0 0 4px}h2{font-size:17px;font-weight:600;margin:28px 0 6px}h3{font-size:14px;font-weight:600;margin:18px 0 5px}
p{font-size:13px;color:#5c6b78}table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:8px}
th{text-align:left;background:#edf1f5;padding:6px 8px;font-weight:500}td{padding:5px 8px;border-bottom:1px solid #eef1f4}
.note{background:#fbf3e9;border-radius:9px;padding:12px 15px;font-size:12px;margin-top:16px}
.warn{background:#fceef1}</style></head><body>
<h1>PromoSignal — รายงานผลการวิเคราะห์</h1>
<p>สร้างเมื่อ ${new Date().toLocaleString("th-TH")} · ชุดโมเดลที่ใช้จัดอันดับ: ${S.engine} · ผู้สมัคร/บริษัท ${rows.length} ราย</p>
<h2>ผลรายราย</h2><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>
<h2>รายละเอียดโมเดล</h2>${engTbl}
<h2>ฐานข้อมูลอ้างอิง</h2>
<p>${esc(M.meta.n_rows)} บริษัท-ปี · ${esc(M.meta.n_firms)} บริษัทจดทะเบียนไทย · ปี ${M.meta.years.join("–")} · ${esc(M.meta.model)}<br>
ตัวแปรตาม: ${esc(M.meta.target)} · ข้อมูลปกปิดชื่อทั้งหมด ไม่มีชื่อบริษัทหรือชื่อบุคคล</p>
<div class="note warn"><b>ข้อจำกัดที่ต้องอ่านก่อนใช้ตัวเลข</b><br>
1. โมเดลจับความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง 5 ปี ไม่ใช่ความสัมพันธ์เชิงสาเหตุ<br>
2. ชุดโมเดล A ใช้ตัวแปรกำกับที่ <b>ไม่มีนัยสำคัญทางสถิติ</b> ในข้อมูลชุดนี้ (p = 0.80 และ 0.27) — ผลที่ได้จึงไม่ควรใช้ชี้ขาด<br>
3. ตัวแปรตาม “นวัตกรรมเปิด” นับจากการประกาศในรายงานประจำปี ไม่ใช่นวัตกรรมจริงที่เกิดขึ้น<br>
4. ตัวแปรต้นและตัวแปรตามส่วนหนึ่งมาจากเอกสารฉบับเดียวกัน จึงมีความเสี่ยงเรื่อง endogeneity<br>
5. ต้นแบบนี้ไม่ใช่ระบบ production และไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน</div>
</body></html>`;
}

/* ---------------------------------------------------------------- หน้าอ้างอิง */
function renderMethod() {
  const eng = summariseEngines();
  const tbl = k => `<table><thead><tr><th>ตัวแปร</th><th class="n">สัมประสิทธิ์</th><th class="n">SE</th><th class="n">p</th><th>นัยสำคัญ 5%</th></tr></thead><tbody>
    ${eng[k].terms.map(t => `<tr><td>${esc(t.term.replace(/^c_/, "").replace(/:c_/, " × "))}</td><td class="n">${t.coef.toFixed(5)}</td><td class="n">${t.se.toFixed(5)}</td>
      <td class="n">${t.p.toFixed(3)}</td><td><span class="pill ${t.significant_5pct ? "ok" : "no"}">${t.significant_5pct ? "มี" : "ไม่มี"}</span></td></tr>`).join("")}</tbody></table>`;
  $("#methodOut").innerHTML = `
  <div class="grid g2">
    <div class="card"><h3>ชุดโมเดล B — ตามหลักฐาน <span class="pill ok">แนะนำ</span></h3>
      <p class="desc">N = ${eng.B.n} · pseudo R² = ${eng.B.pseudo_r2} · Negative Binomial ควบคุมปีและอุตสาหกรรม</p>${tbl("B")}</div>
    <div class="card"><h3>ชุดโมเดล A — ตามสเปก Pitch <span class="pill warn">ตัวขยายผลไม่มีนัยสำคัญ</span></h3>
      <p class="desc">N = ${eng.A.n} · pseudo R² = ${eng.A.pseudo_r2} · โครงสร้างตามที่ระบุใน Pitch2.pptx</p>${tbl("A")}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>ทำไมต้องมีสองชุดโมเดล</h3>
    <p class="desc">เพื่อให้ผู้ตัดสินใจเห็นด้วยตาตัวเองว่าข้อสรุปเปลี่ยนไปแค่ไหนเมื่อเปลี่ยนสมมติฐานของโมเดล</p>
    <div class="grid g2">
      <div class="note warn"><b>สเปกเดิมใน Pitch2.pptx ระบุว่า</b> “β4, β5 > 0 และ significant → ใช้ขยายผลได้อย่างมั่นใจ”<br><br>
        แต่เมื่อรันกับข้อมูลจริง 900 บริษัท-ปี ได้ Promotion × %กรรมการหญิง <b>p = ${eng.A.terms.find(t => t.term.includes("female")) && eng.A.terms.find(t => t.term.includes(":")) ? eng.A.terms.filter(t => t.term.includes(":"))[0].p.toFixed(3) : "—"}</b>
        และ Promotion × การเมือง <b>p = ${eng.A.terms.filter(t => t.term.includes(":"))[1] ? eng.A.terms.filter(t => t.term.includes(":"))[1].p.toFixed(3) : "—"}</b> — ทั้งคู่ไม่ผ่านเกณฑ์นัยสำคัญ<br><br>
        เงื่อนไขที่สเปกตั้งไว้จึงไม่เป็นจริง Simulator ที่สร้างบนตัวแปรเหล่านี้จะขยับน้อยมากเมื่อเลื่อน slider</div>
      <div class="note ok"><b>สิ่งที่ข้อมูลรองรับจริง</b><br><br>
        อายุงานเฉลี่ยของบอร์ด · สัดส่วนกรรมการอิสระ · ขนาดคณะกรรมการ — ทั้งสามมีนัยสำคัญที่ระดับ 0.001–0.006<br><br>
        ชุดโมเดล B จึงใช้สามตัวนี้เป็นแกน และยังคง Promotion กับ %กรรมการหญิง ไว้ในสมการเพื่อให้เทียบกับสเปกเดิมได้ตรง ๆ</div>
    </div></div>
  <div class="card" style="margin-top:16px"><h3>วิธีคำนวณค่าคาดการณ์และช่วงความเชื่อมั่น</h3>
    <p class="desc">ทุกอย่างคำนวณในเบราว์เซอร์จากสัมประสิทธิ์และเมทริกซ์ความแปรปรวนร่วมที่ฝังไว้</p>
    <div class="note info" style="font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.9">
      E[OI] = exp( β₀ + Σ βₖ·(xₖ − x̄ₖ) + FE(อุตสาหกรรม) + FE(ปี) )<br>
      Var(η) = xᵀ · V · x&nbsp;&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp;&nbsp;CI 95% = exp( η ± 1.96·√Var(η) )
    </div>
    <ul style="font-size:12.3px;color:var(--grey);line-height:1.8;margin-top:12px;padding-left:18px">
      <li>ตัวแปรทุกตัว mean-center ก่อนเข้าสมการ จึงตีความ main effect ได้ตรงแม้มี interaction</li>
      <li>ช่วงความเชื่อมั่นคำนวณด้วย delta method บนสเกล log แล้วยกกำลัง exp กลับ — <b>ยังไม่รวมความไม่แน่นอนของ fixed effect รายอุตสาหกรรมและรายปี</b> ช่วงจริงจึงกว้างกว่าที่แสดงเล็กน้อย</li>
      <li>เมื่อเลื่อน slider ออกนอกช่วงเปอร์เซ็นไทล์ที่ 5–95 ของข้อมูล ระบบจะเตือนว่าเป็นการคาดนอกช่วงข้อมูล</li>
      <li>เปอร์เซ็นไทล์และ quintile เทียบกับค่าคาดการณ์ของทุกบริษัท-ปีในฐานข้อมูลเดียวกัน ไม่ใช่ค่าจริง</li>
    </ul></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>ขอบเขตของต้นแบบนี้</h3>
      <table><tbody>
        <tr><td>ให้คะแนนจากเอกสารที่อัปโหลด</td><td><span class="pill ok">อยู่ในขอบเขต</span></td></tr>
        <tr><td>จัดอันดับผู้สมัคร / บริษัท</td><td><span class="pill ok">อยู่ในขอบเขต</span></td></tr>
        <tr><td>Board-fit simulator</td><td><span class="pill ok">อยู่ในขอบเขต</span></td></tr>
        <tr><td>ส่งออกรายงาน (CSV / JSON / HTML / PDF)</td><td><span class="pill ok">อยู่ในขอบเขต</span></td></tr>
        <tr><td>ระบบ production</td><td><span class="pill no">นอกขอบเขต</span></td></tr>
        <tr><td>บัญชีผู้ใช้และสิทธิ์การเข้าถึง</td><td><span class="pill no">นอกขอบเขต</span></td></tr>
        <tr><td>การเชื่อมข้อมูลสด (SETSMART / API)</td><td><span class="pill no">นอกขอบเขต</span></td></tr>
      </tbody></table></div>
    <div class="card"><h3>ข้อจำกัดที่ต้องแจ้งผู้ใช้ทุกครั้ง</h3>
      <div class="note warn" style="margin-bottom:9px"><b>1 · ไม่ใช่ความสัมพันธ์เชิงสาเหตุ</b><br>โมเดลบอกว่าบริษัทที่มีโครงสร้างแบบนี้มักมีนวัตกรรมเปิดเท่าไร ไม่ได้บอกว่าถ้าเปลี่ยนโครงสร้างแล้วจะได้ผลตามนั้น</div>
      <div class="note warn" style="margin-bottom:9px"><b>2 · วัดการประกาศ ไม่ใช่นวัตกรรมจริง</b><br>ตัวแปรตามนับจากข้อความในรายงานประจำปี บริษัทที่ทำมากแต่ไม่เขียนจะถูกวัดต่ำกว่าความจริง</div>
      <div class="note warn" style="margin-bottom:9px"><b>3 · เอกสารฉบับเดียวกัน</b><br>ภาษาผู้บริหารและจำนวนนวัตกรรมมาจากรายงานฉบับเดียวกัน จึงมีความเสี่ยง endogeneity ที่ยังไม่ได้แก้</div>
      <div class="note warn"><b>4 · ห้ามใช้ให้คะแนนบุคคล</b><br>ตัวแปรเพศ อายุ และความเชื่อมโยงทางการเมือง เป็นข้อมูลอ่อนไหวตาม PDPA มาตรา 26 — ต้นแบบนี้ออกแบบให้ประเมิน<b>โครงสร้างองค์กร</b> ไม่ใช่ประเมินตัวบุคคล</div>
    </div></div>`;
}

/* ---------------------------------------------------------------- นำทาง */
function go(p) {
  $$(".step").forEach(b => b.setAttribute("aria-selected", b.dataset.p === p));
  $$(".pane").forEach(s => s.classList.toggle("on", s.id === "p-" + p));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function demo() {
  $("#stmt").value = `สารจากประธานกรรมการ
เรียน ท่านผู้ถือหุ้น
ปี 2567 เป็นปีที่บริษัทเดินโตอย่างมีนัยสำคัญ เรามุ่งมั่นขยายธุรกิจเข้าสู่ตลาดใหม่ และเร่งพัฒนานวัตกรรมอย่างต่อเนื่อง
บริษัทได้ลงนามบันทึกความเข้าใจกับพันธมิตรเชิงกลยุทธ์ 3 ราย และจัดตั้งกิจการร่วมค้าเพื่อพัฒนาแพลตฟอร์มใหม่ร่วมกัน
เรามองเห็นโอกาสในการก้าวสู่การเป็นผู้นำตลาดภูมิภาค ด้วยวิสัยทัศน์ที่ชัดเจนและการลงทุนเพิ่มในเทคโนโลยีใหม่
ขณะเดียวกัน บริษัทให้ความสำคัญกับการบริหารความเสี่ยงและการกำกับดูแลกิจการที่ดี เพื่อรักษาความมั่นคงในระยะยาว`;
  S.rawFull = $("#stmt").value + " ร่วมทุน joint venture MOU พันธมิตรเชิงกลยุทธ์ ผลิตภัณฑ์ใหม่ บริการใหม่ ระบบอัตโนมัติ";
  S.fileMeta = { name: "ตัวอย่าง.txt", mb: "0.01", pages: 0, words: countWords(S.rawFull), head: "สารจากประธานกรรมการ", ms: 1 };
  S.boardGuess = null;
  $("#fAlias").value = $("#fAlias2").value = S.alias = "ผู้สมัครตัวอย่าง";
  recomputeDoc();
}

function boot() {
  initStep1(); initStep2(); initExport();
  $$(".step").forEach(b => b.onclick = () => go(b.dataset.p));
  $("#btnDemo").onclick = demo;
  $("#btnReset").onclick = () => { if (confirm("ล้างข้อมูลทั้งหมดและเริ่มใหม่?")) location.reload(); };
  seedFromIndustry(); renderStep1(); renderModel(); renderMethod();
}
boot();
