/* ============================================================================
   v2_assess.js — OpenInnoScore 2.3 · แบบประเมิน (ขอบเขต MVP1 ข้อ 2.3, 2.4 และแบบประเมิน BOD ของ SET)
     A. RFQ — แบบประเมิน CEO Regulatory Focus (Higgins et al., 2001) ฉบับแปลใช้งาน · เก็บผลในเครื่อง
     B. Dictionary ของผู้ใช้ — สร้างพจนานุกรม Promotion / Prevention เอง แล้วคำนวณ Promotion Focus จากข้อความ
     C. แบบประเมินตนเองของคณะกรรมการ (รูปแบบ SET) — ตัวสร้างแบบประเมิน + ทำแบบประเมิน + ผลและประวัติ
   กติกา: ผลจากหน้านี้ไม่เข้าสูตร OpenInnoScore (แบบจำลองที่ตรึงไว้ใช้ตัววัดจากข้อความด้วย Dictionary ชุดของระบบ)
          ไม่เก็บชื่อบุคคล · ข้อความ CEO ไม่ถูกบันทึกหรือส่งออกนอกเครื่อง · ไม่ใช้ window.alert/confirm/prompt
   ใช้ตัวช่วยจาก v2_pilot.js (plCsv, plDl, plMean, plId, plBE, plAsk, plSD, plAlpha) และ v2_app.js (esc, fmt, toast, render, go, cur)
   ============================================================================ */
const asLoad = (k, d) => { try { const o = JSON.parse(localStorage.getItem(k) || "null"); return o == null ? d : o; } catch (e) { return d; } };
const asStore = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("บันทึกในเครื่องไม่สำเร็จ (พื้นที่เต็มหรือถูกปิดกั้น)"); } };
/** ส่งเข้าเซิร์ฟเวอร์เมื่อมี OIS_API.submit (ฉบับเซิร์ฟเวอร์) — คืน Promise<boolean> · ตัวจริงอยู่ใน v2_pilot.js */
const asSubmit = (kind, ticker, payload) => plSubmit(kind, ticker, payload);
const asTick = () => { const c = cur(); return c && c.t ? c.t : ""; };
const asCoName = t => (t && byT[t]) ? `${t} · ${byT[t].n}` : (t || "ไม่ระบุบริษัท");
const asNow = () => new Date().toISOString();
const asThDT = iso => { try { return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso || ""; } };
const asR2 = v => (v === null || v === undefined || isNaN(v)) ? "" : Math.round(v * 1000) / 1000;

/* ============================================================================
   A · RFQ — Regulatory Focus Questionnaire (ฉบับแปลใช้งาน)
   ============================================================================ */
const RFQ_KEY = "ois_rfq_v1";
const RFQ_SRC = "Higgins, E. T., Friedman, R. S., Harlow, R. E., Idson, L. C., Ayduk, O. N., & Taylor, A. (2001). Achievement orientations from subjective histories of success: Promotion pride versus prevention pride. European Journal of Social Psychology, 31(1), 3–23.";
const RFQ_A = {
  freq: ["ไม่เคยหรือนาน ๆ ครั้ง", "", "บางครั้ง", "", "บ่อยมาก"],
  always: ["ไม่เคยหรือนาน ๆ ครั้ง", "", "บางครั้ง", "", "เสมอ"],
  true9: ["ไม่จริงเลย / ไม่เคย", "", "บางครั้ง", "", "จริงบ่อยมาก"],
  cert: ["ไม่จริงอย่างแน่นอน", "", "ไม่แน่ใจ", "", "จริงอย่างแน่นอน"],
};
/* s = subscale (P = Promotion, V = Prevention) · r = กลับคะแนน (6 − x) · ถ้อยคำเป็นฉบับแปลใช้งานที่เรียบเรียงใหม่ ไม่ใช่ถ้อยคำต้นฉบับ */
const RFQ_ITEMS = [
  { n: 1, s: "P", r: true, a: "freq", t: "เมื่อเปรียบเทียบกับคนทั่วไป ท่านพบว่าตนเองมักไม่ได้สิ่งที่ต้องการในชีวิตบ่อยเพียงใด" },
  { n: 2, s: "V", r: true, a: "freq", t: "ในช่วงที่เติบโตขึ้น ท่านเคยทำสิ่งที่ “เกินขอบเขต” จนพ่อแม่หรือผู้ปกครองยอมรับไม่ได้บ่อยเพียงใด" },
  { n: 3, s: "P", r: false, a: "freq", t: "ท่านทำสิ่งต่าง ๆ สำเร็จจนรู้สึกฮึกเหิมและอยากทุ่มเททำงานให้หนักขึ้นอีกบ่อยเพียงใด" },
  { n: 4, s: "V", r: true, a: "freq", t: "ในช่วงที่เติบโตขึ้น ท่านทำให้พ่อแม่หรือผู้ปกครองรู้สึกรำคาญใจบ่อยเพียงใด" },
  { n: 5, s: "V", r: false, a: "always", t: "ท่านปฏิบัติตามกฎและข้อตกลงที่พ่อแม่หรือผู้ปกครองวางไว้บ่อยเพียงใด" },
  { n: 6, s: "V", r: true, a: "freq", t: "ในช่วงที่เติบโตขึ้น ท่านเคยประพฤติตนในแบบที่พ่อแม่หรือผู้ปกครองเห็นว่าไม่สมควรบ่อยเพียงใด" },
  { n: 7, s: "P", r: false, a: "freq", t: "เมื่อท่านลองทำสิ่งต่าง ๆ ที่หลากหลาย ท่านมักทำได้ดีบ่อยเพียงใด" },
  { n: 8, s: "V", r: true, a: "freq", t: "ความไม่รอบคอบหรือไม่ระมัดระวังมากพอ เคยทำให้ท่านประสบปัญหาบ่อยเพียงใด" },
  { n: 9, s: "P", r: true, a: "true9", t: "เมื่อพยายามทำสิ่งที่สำคัญต่อตนเองให้สำเร็จ ท่านพบว่าตนทำได้ไม่ดีเท่าที่ตั้งใจไว้" },
  { n: 10, s: "P", r: false, a: "cert", t: "ท่านรู้สึกว่าตนเองได้ก้าวหน้าไปสู่ความสำเร็จในชีวิตแล้ว" },
  { n: 11, s: "P", r: true, a: "cert", t: "ในชีวิตของท่าน มีงานอดิเรกหรือกิจกรรมเพียงไม่กี่อย่างที่ดึงดูดความสนใจหรือทำให้อยากทุ่มเทแรงกายแรงใจ" },
];
const RFQ_P = RFQ_ITEMS.filter(i => i.s === "P"), RFQ_V = RFQ_ITEMS.filter(i => i.s === "V");
const RFQ_BAND = 0.25;
const RFQ_ROLE = { self: "CEO ตอบเอง (self-report)", proxy: "ผู้ประเมินตอบแทน CEO (proxy)" };
const RFQ_PROXY = ["เลขานุการบริษัท", "กรรมการ", "ผู้บริหารที่ทำงานใกล้ชิด CEO", "อื่น ๆ"];
const rfqVal = (it, x) => it.r ? 6 - x : x;
/** คะแนน RFQ — Promotion = เฉลี่ยข้อ 1R, 3, 7, 9R, 10, 11R · Prevention = เฉลี่ยข้อ 2R, 4R, 5, 6R, 8R (R = 6 − x) */
function rfqScore(a) {
  if (RFQ_ITEMS.some(i => !(a[i.n] >= 1 && a[i.n] <= 5))) return null;
  const prom = plMean(RFQ_P.map(i => rfqVal(i, a[i.n]))), prev = plMean(RFQ_V.map(i => rfqVal(i, a[i.n])));
  const diff = prom - prev;
  return { prom, prev, diff, focus: diff > RFQ_BAND ? "prom" : diff < -RFQ_BAND ? "prev" : "bal" };
}
const RFQ_FOCUS = { prom: "เน้น Promotion", prev: "เน้น Prevention", bal: "สมดุล" };
let RFQ = asLoad(RFQ_KEY, []); if (!Array.isArray(RFQ)) RFQ = [];
const rfqSave = () => asStore(RFQ_KEY, RFQ);
const rfqCode = () => "R-" + Math.random().toString(36).slice(2, 7).toUpperCase();
let _rfq = null, _rfqLast = null, _rfqSrv = null;
const rfqDraft = () => _rfq || (_rfq = { role: "self", proxy: RFQ_PROXY[0], ticker: asTick(), a: {}, code: rfqCode() });

/** ตารางสรุปของกลุ่มคำตอบ — n, ค่าเฉลี่ย, SD, Cronbach's alpha (n ≥ 5) */
function rfqStats(R) {
  const sub = (items, k) => {
    const xs = R.map(r => r.scores && r.scores[k]).filter(v => typeof v === "number");
    const rows = R.map(r => items.map(i => rfqVal(i, r.answers[i.n]))).filter(a => a.every(v => v >= 1 && v <= 5));
    return { n: xs.length, mean: plMean(xs), sd: plSD(xs), alpha: rows.length >= 5 ? plAlpha(rows) : NaN };
  };
  return { P: sub(RFQ_P, "prom"), V: sub(RFQ_V, "prev"), D: (() => { const xs = R.map(r => r.scores && r.scores.diff).filter(v => typeof v === "number"); return { n: xs.length, mean: plMean(xs), sd: plSD(xs) }; })() };
}
function pearson(x, y) {
  const n = x.length; if (n < 3) return NaN;
  const mx = plMean(x), my = plMean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}
/** ค่าจาก Zone A ของบริษัทเดียวกัน (อ่านอย่างเดียว) — null เมื่อไม่มีข้อมูลหรือผู้ใช้ไม่มีสิทธิ์ดูบริษัทนั้น */
function rfqTextRef(t) {
  if (!t || !byT[t]) return null;
  if (typeof canSeeCo === "function" && !canSeeCo(t)) return { locked: true };
  const c = coOf(t);
  if (!c || typeof c.dp !== "number") return null;
  const ed = typeof isEdited === "function" && isEdited(t);
  return { dp: c.dp, src: ed ? "ค่าที่วิเคราะห์/แก้ใน Zone A" : "ค่าจากสารถึงผู้ถือหุ้นในรายงานประจำปี (LIWC-22) ในฐานข้อมูล" };
}
function rfqCompare(t, sc) {
  const ref = rfqTextRef(t);
  const body = !t ? `<p class="desc" style="margin:0">ไม่ได้ระบุบริษัท — เลือกบริษัทจากแถบด้านบนก่อนตอบ หากต้องการเทียบกับค่าจากข้อความ</p>`
    : !ref ? `<p class="desc" style="margin:0">ยังไม่มีค่า CEO Promotion Focus จากข้อความของ ${esc(t)}</p>`
    : ref.locked ? `<p class="desc" style="margin:0">ระดับสิทธิ์ปัจจุบันยังดูข้อมูลของ ${esc(t)} ไม่ได้ จึงไม่แสดงค่าจากข้อความ</p>`
    : `<div class="as-cmp">
        <div><div class="k">RFQ · Promotion − Prevention</div><div class="v">${sc ? (sc.diff >= 0 ? "+" : "") + fmt(sc.diff, 2) : "—"}</div><div class="u">แบบสอบถาม · ลักษณะประจำตัว (self-report trait)</div></div>
        <div><div class="k">CEO Promotion Focus จากข้อความ</div><div class="v">${fmt(ref.dp, 0)}<span> / 100</span></div><div class="u">เปอร์เซ็นไทล์ใน Zone A · ${esc(ref.src)}</div></div></div>`;
  return `<div class="card"><h3>เทียบกับตัววัดจากข้อความ (Zone A) <span class="pill mute">${esc(asCoName(t))}</span></h3>
    ${body}
    <div class="note warn" style="margin-top:10px"><b>สองตัววัดนี้เป็นคนละโครงสร้างและคนละวิธีวัด</b> — RFQ วัดแนวโน้มประจำตัวจากการรายงานตนเอง
      ส่วนค่า Zone A วัดภาษาในรายงานประจำปีด้วยการนับคำ (LIWC-22) · การวางคู่กันมีไว้เพื่อทดสอบความตรงเชิงเหมือน (convergent validity) ไม่ใช่ใช้แทนกัน ·
      <b>คะแนน RFQ ไม่ได้ใช้คำนวณ OpenInnoScore</b> แบบจำลองที่ตรึงไว้ใช้ตัววัดจากข้อความเท่านั้น</div></div>`;
}
function rfqResultCard(r) {
  const s = r.scores, pos = v => clamp((v - 1) / 4 * 100, 0, 100);
  const dpos = clamp(50 + s.diff / 4 * 50, 0, 100);
  return `<div class="card as-res" id="rfqRes"><h3>ผลแบบประเมิน RFQ <span class="pill ${s.focus === "prom" ? "ok" : s.focus === "prev" ? "warn" : "mute"}">${RFQ_FOCUS[s.focus]}</span>
      <span class="pill mute" style="margin-left:auto">${esc(r.code)}</span></h3>
    <p class="desc">${esc(RFQ_ROLE[r.role])}${r.role === "proxy" ? " · " + esc(r.proxy) : ""} · ${esc(asCoName(r.ticker))} · ${esc(asThDT(r.at))}</p>
    <div class="grid g3 tight">
      <div class="stat"><div class="k">Promotion (1–5)</div><div class="v" id="rfqProm">${fmt(s.prom, 2)}</div><div class="u">เฉลี่ยข้อ 1R, 3, 7, 9R, 10, 11R</div></div>
      <div class="stat"><div class="k">Prevention (1–5)</div><div class="v" id="rfqPrev">${fmt(s.prev, 2)}</div><div class="u">เฉลี่ยข้อ 2R, 4R, 5, 6R, 8R</div></div>
      <div class="stat"><div class="k">Promotion − Prevention</div><div class="v" id="rfqDiff">${s.diff >= 0 ? "+" : ""}${fmt(s.diff, 2)}</div><div class="u">ทิศทางที่เด่น (predominant focus)</div></div></div>
    <div class="as-bars">
      <div class="as-bar"><span>Promotion</span><div class="as-track"><i style="width:${pos(s.prom)}%;background:var(--s3)"></i></div><b>${fmt(s.prom, 2)}</b></div>
      <div class="as-bar"><span>Prevention</span><div class="as-track"><i style="width:${pos(s.prev)}%;background:var(--s2)"></i></div><b>${fmt(s.prev, 2)}</b></div>
      <div class="as-bar"><span>ผลต่าง</span><div class="as-track as-mid"><em style="left:${(50 - RFQ_BAND / 4 * 50).toFixed(2)}%;width:${(RFQ_BAND / 4 * 100).toFixed(2)}%"></em><u style="left:${dpos.toFixed(1)}%"></u></div><b>${s.diff >= 0 ? "+" : ""}${fmt(s.diff, 2)}</b></div></div>
    <p class="as-sm">ป้าย “สมดุล” ใช้เมื่อผลต่างอยู่ในช่วง ±${RFQ_BAND} — <b>เป็นเกณฑ์สำหรับการแสดงผลเท่านั้น ไม่ใช่เกณฑ์ปกติ (norm)</b> ของแบบวัด
      ${r.role === "proxy" ? `<br><b>ข้อจำกัดของการตอบแทน (proxy rating):</b> RFQ ออกแบบให้ตอบเอง คำตอบจากผู้อื่นสะท้อน “การรับรู้” ของผู้ตอบต่อ CEO และอาจคลาดเคลื่อนในข้อที่ถามประสบการณ์วัยเด็ก — ควรวิเคราะห์แยกจากกลุ่มที่ CEO ตอบเอง` : ""}</p>
    ${r.srv ? `<div class="note ok" style="margin-top:8px">บันทึกเข้าเซิร์ฟเวอร์แล้ว</div>` : ""}
    <div class="pl-tools" style="margin-top:12px"><button class="btn p" id="rfqNew">ทำแบบประเมินใหม่</button></div></div>`;
}
function rfqAdmin() {
  const R = RFQ, st = rfqStats(R), self = R.filter(r => r.role === "self"), sts = rfqStats(self);
  const row = (lab, x, al) => `<tr><td>${lab}</td><td class="n">${x.n}</td><td class="n">${fmt(x.mean, 2)}</td><td class="n">${fmt(x.sd, 2)}</td>
    <td class="n">${al ? (isNaN(x.alpha) ? `<span class="pill mute">n < 5</span>` : fmt(x.alpha, 2)) : "—"}</td></tr>`;
  /* ความตรงเชิงเหมือน: ค่าเฉลี่ยผลต่าง RFQ (CEO ตอบเอง) รายบริษัท เทียบเปอร์เซ็นไทล์จากข้อความ */
  const by = {}; self.forEach(r => { if (r.ticker && byT[r.ticker]) (by[r.ticker] = by[r.ticker] || []).push(r.scores.diff); });
  const pairs = Object.entries(by).map(([t, d]) => { const ref = rfqTextRef(t); return ref && !ref.locked ? [plMean(d), ref.dp] : null; }).filter(Boolean);
  const rr = pairs.length >= 5 ? pearson(pairs.map(p => p[0]), pairs.map(p => p[1])) : NaN;
  const tick = {}; R.forEach(r => { const k = r.ticker || "ไม่ระบุ"; tick[k] = (tick[k] || 0) + 1; });
  return `<div class="card" style="margin-top:16px" id="rfqAdmin"><h3>สรุปผลรวม (ผู้ดูแลงานวิจัย) <span class="pill mute">n = ${R.length}</span></h3>
    <p class="desc">ข้อมูลอยู่ในเครื่องนี้ (localStorage “${RFQ_KEY}”) · ใช้รหัสผู้ตอบแบบสุ่ม ไม่มีชื่อ · Cronbach's alpha คำนวณเมื่อ n ≥ 5 จากคะแนนรายข้อหลังกลับคะแนน</p>
    <div class="tw"><table class="as-tbl"><thead><tr><th>มาตรวัดย่อย</th><th class="n">n</th><th class="n">ค่าเฉลี่ย</th><th class="n">SD</th><th class="n">Cronbach's α</th></tr></thead><tbody>
      <tr><th colspan="5">ทุกคำตอบ</th></tr>${row("Promotion (6 ข้อ)", st.P, 1)}${row("Prevention (5 ข้อ)", st.V, 1)}${row("Promotion − Prevention", st.D, 0)}
      <tr><th colspan="5">เฉพาะ CEO ตอบเอง</th></tr>${row("Promotion (6 ข้อ)", sts.P, 1)}${row("Prevention (5 ข้อ)", sts.V, 1)}${row("Promotion − Prevention", sts.D, 0)}
    </tbody></table></div>
    <p class="as-sm">α = k/(k−1) × (1 − Σ ความแปรปรวนรายข้อ / ความแปรปรวนของคะแนนรวม) · ใช้ความแปรปรวนตัวอย่าง (n − 1) · ข้อมูลไม่ครบทุกข้อไม่นำมาคิด α</p>
    <div class="note brand" style="margin-top:8px"><b>ความตรงเชิงเหมือน (convergent validity) · RFQ (CEO ตอบเอง) กับ CEO Promotion Focus จากข้อความ</b> —
      ${pairs.length >= 5 ? `Pearson r = <b>${fmt(rr, 2)}</b> จาก ${pairs.length} บริษัท (ค่าเฉลี่ยผลต่าง RFQ รายบริษัท เทียบเปอร์เซ็นไทล์ใน Zone A)` : `ต้องมีอย่างน้อย 5 บริษัทที่ CEO ตอบเอง (ตอนนี้ ${pairs.length} บริษัท)`} ·
      เป็นการทดสอบเชิงพรรณนา ไม่ใช่การปรับเทียบแบบจำลอง</div>
    <div class="as-chips">${Object.entries(tick).map(([k, n]) => `<span class="chip">${esc(k)} <b>${n}</b></span>`).join("") || `<span class="as-sm">ยังไม่มีคำตอบ</span>`}</div>
    ${R.length ? `<div class="tw" style="margin-top:10px;max-height:260px"><table class="as-tbl"><thead><tr><th>รหัส</th><th>เวลา</th><th>ผู้ตอบ</th><th>บริษัท</th><th class="n">Prom</th><th class="n">Prev</th><th>ทิศทาง</th></tr></thead><tbody>
      ${R.slice().reverse().slice(0, 50).map(r => `<tr><td class="mono">${esc(r.code)}</td><td>${esc(asThDT(r.at))}</td><td>${r.role === "self" ? "CEO" : "Proxy · " + esc(r.proxy)}</td><td>${esc(r.ticker || "ไม่ระบุ")}</td>
        <td class="n">${fmt(r.scores.prom, 2)}</td><td class="n">${fmt(r.scores.prev, 2)}</td><td>${RFQ_FOCUS[r.scores.focus]}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="pl-tools" style="margin-top:12px"><button class="btn g" id="rfqCsv" ${R.length ? "" : "disabled"}>Export CSV</button><button class="btn g" id="rfqClear" ${R.length ? "" : "disabled"}>ลบคำตอบทั้งหมด</button></div></div>`;
}
function viewRfq() {
  const d = rfqDraft(), done = RFQ_ITEMS.filter(i => d.a[i.n]).length, c = cur();
  const radios = it => `<div class="as-lik" role="radiogroup" aria-label="ข้อ ${it.n}">${[1, 2, 3, 4, 5].map(v => {
    const lab = RFQ_A[it.a][v - 1];
    return `<label class="${d.a[it.n] === v ? "on" : ""}"><input type="radio" name="rfq-${it.n}" value="${v}" data-rfq="${it.n}"${d.a[it.n] === v ? " checked" : ""}><b>${v}</b>${lab ? `<span>${esc(lab)}</span>` : ""}</label>`; }).join("")}</div>`;
  const form = `<div class="card" id="rfqForm"><h3>แบบสอบถาม 11 ข้อ <span class="pill mute" style="margin-left:auto" id="rfqCnt">ตอบแล้ว ${done} / ${RFQ_ITEMS.length}</span></h3>
      <div class="pl-prog" aria-label="ความคืบหน้า"><span id="rfqBar" style="width:${Math.round(done / RFQ_ITEMS.length * 100)}%"></span></div>
      <div class="as-meta">
        <label class="pl-lab">ผู้ตอบ<select class="sel" id="rfqRole">${Object.entries(RFQ_ROLE).map(([k, v]) => `<option value="${k}"${d.role === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
        ${d.role === "proxy" ? `<label class="pl-lab">ตำแหน่งผู้ตอบแทน<select class="sel" id="rfqProxy">${RFQ_PROXY.map(p => `<option${d.proxy === p ? " selected" : ""}>${esc(p)}</option>`).join("")}</select></label>` : ""}
        <label class="pl-lab">บริษัท<select class="sel" id="rfqTick"><option value="${esc(c.t)}"${d.ticker === c.t ? " selected" : ""}>${esc(c.t)} · ${esc(c.n)}</option>
          ${d.ticker && d.ticker !== c.t && byT[d.ticker] ? `<option value="${esc(d.ticker)}" selected>${esc(asCoName(d.ticker))}</option>` : ""}
          <option value=""${!d.ticker ? " selected" : ""}>ไม่ระบุ</option></select></label>
        <label class="pl-lab">รหัสผู้ตอบ (สุ่ม · ไม่ระบุตัวตน)<input class="inp mono" value="${esc(d.code)}" readonly></label></div>
      ${d.role === "proxy" ? `<div class="note warn" style="margin:4px 0 10px"><b>การตอบแทน CEO (proxy rating)</b> — RFQ ออกแบบเป็นแบบรายงานตนเอง คำตอบแทนสะท้อนการรับรู้ของผู้ตอบ โดยเฉพาะข้อที่ถามประสบการณ์วัยเด็ก (ข้อ 2, 4, 5, 6) ผู้ตอบแทนอาจไม่ทราบจริง · ผลจะถูกติดป้าย proxy และวิเคราะห์แยกกลุ่ม</div>` : ""}
      <p class="desc">โปรดตอบตามความเป็นจริงของ${d.role === "proxy" ? "ท่าน CEO ตามที่ท่านรับรู้" : "ท่านเอง"} โดยเลือกตัวเลข 1–5 ในแต่ละข้อ (ป้ายกำกับแสดงความหมายของปลายมาตราและจุดกึ่งกลาง)</p>
      <ol class="as-items">${RFQ_ITEMS.map(it => `<li class="as-item${d.a[it.n] ? " done" : ""}" id="rfqI${it.n}"><div class="as-qt"><b>${it.n}.</b> ${esc(it.t)}</div>${radios(it)}</li>`).join("")}</ol>
      <div class="pl-tools" style="margin-top:14px"><span class="as-sm" id="rfqMsg"></span><span class="spacer"></span>
        <button class="btn g" id="rfqReset">ล้างคำตอบ</button><button class="btn p" id="rfqSubmit">ส่งแบบประเมินและดูผล</button></div></div>`;
  const last = _rfqLast;
  return pageHead("แบบประเมิน · ตรวจภาษา CEO (Input Type 3)", "แบบประเมิน CEO Regulatory Focus (RFQ)",
    `แบบสอบถาม Regulatory Focus Questionnaire 11 ข้อ (Higgins et al., 2001) สำหรับผู้ใช้ทั่วไป · เก็บผลในระบบเพื่อนำมาประเมินและทดสอบความตรงเทียบกับตัววัดจากข้อความ ·
     ไม่ได้เชื่อมต่อหรือส่งข้อมูลไปยังเว็บไซต์แบบทดสอบภายนอก`)
    + `<div class="note brand as-banner"><b>ฉบับแปลใช้งาน (working translation)</b> — ต้องผ่านการแปลย้อนกลับ (back-translation) และทดสอบความเที่ยงก่อนใช้เก็บข้อมูลวิจัยจริง ·
        ถ้อยคำภาษาไทยเรียบเรียงใหม่ให้คงความหมายของข้อคำถามต้นฉบับ ไม่ใช่ฉบับแปลที่ผ่านการรับรอง<br>
        <span class="as-sm">ที่มา: ${esc(RFQ_SRC)}</span></div>`
    + `<div class="grid g-side-r">
        <div class="stack">${last ? rfqResultCard(last) : form}</div>
        <div class="stack">${rfqCompare(last ? last.ticker : d.ticker, last ? last.scores : null)}
          <div class="card"><h3>วิธีคิดคะแนน</h3>
            <ul class="pl-ul as-ul"><li><b>Promotion</b> = ค่าเฉลี่ยของข้อ 1R, 3, 7, 9R, 10, 11R</li><li><b>Prevention</b> = ค่าเฉลี่ยของข้อ 2R, 4R, 5, 6R, 8R</li>
              <li>R = กลับคะแนน (6 − คำตอบ) · ช่วงคะแนน 1–5</li><li><b>Predominant focus</b> = Promotion − Prevention · บวก = เน้น Promotion</li>
              <li>สิทธิ์: ทุกระดับ (Free / Pro / Pro Max)</li></ul></div></div></div>`
    + rfqAdmin();
}
function rfqProg(h) {
  const d = rfqDraft(), n = RFQ_ITEMS.filter(i => d.a[i.n]).length;
  const c = h.querySelector("#rfqCnt"); if (c) c.textContent = `ตอบแล้ว ${n} / ${RFQ_ITEMS.length}`;
  const b = h.querySelector("#rfqBar"); if (b) b.style.width = Math.round(n / RFQ_ITEMS.length * 100) + "%";
}
function wireRfq(h) {
  const d = rfqDraft();
  h.querySelectorAll("input[data-rfq]").forEach(i => i.onchange = () => {
    d.a[+i.dataset.rfq] = +i.value;
    const li = i.closest(".as-item"); li.classList.add("done"); li.classList.remove("miss");
    li.querySelectorAll("label").forEach(l => l.classList.toggle("on", l.contains(i)));
    rfqProg(h);
  });
  const ro = h.querySelector("#rfqRole"); if (ro) ro.onchange = () => { d.role = ro.value; render(); };
  const px = h.querySelector("#rfqProxy"); if (px) px.onchange = () => { d.proxy = px.value; };
  const tk = h.querySelector("#rfqTick"); if (tk) tk.onchange = () => { d.ticker = tk.value; _rfqLast = null; render(); };
  const rs = h.querySelector("#rfqReset"); if (rs) rs.onclick = () => plAsk(rs, "ล้างคำตอบในฟอร์มนี้?", () => { d.a = {}; render(); });
  const nw = h.querySelector("#rfqNew"); if (nw) nw.onclick = () => { _rfqLast = null; _rfq = null; render(); };
  const sb = h.querySelector("#rfqSubmit"); if (sb) sb.onclick = () => {
    const miss = RFQ_ITEMS.filter(i => !d.a[i.n]);
    if (miss.length) {
      miss.forEach(i => { const li = h.querySelector("#rfqI" + i.n); if (li) li.classList.add("miss"); });
      const m = h.querySelector("#rfqMsg"); if (m) m.textContent = `ยังไม่ได้ตอบ ${miss.length} ข้อ: ${miss.map(i => i.n).join(", ")}`;
      const f = h.querySelector("#rfqI" + miss[0].n); if (f) f.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast(`กรุณาตอบให้ครบทุกข้อ (ขาด ${miss.length} ข้อ)`);
    }
    const sc = rfqScore(d.a);
    const r = { code: d.code, at: asNow(), role: d.role, proxy: d.role === "proxy" ? d.proxy : "", ticker: d.ticker || "",
      answers: Object.fromEntries(RFQ_ITEMS.map(i => [i.n, d.a[i.n]])), scores: { prom: sc.prom, prev: sc.prev, diff: sc.diff, focus: sc.focus }, v: "th-working-1" };
    RFQ.push(r); rfqSave(); _rfqLast = r; _rfq = null;
    toast("บันทึกแบบประเมิน RFQ แล้ว");
    asSubmit("rfq", r.ticker, r).then(ok => { if (ok) { r.srv = true; rfqSave(); if (S.view === "rfq") render(); } });
    render();
    const res = $("#rfqRes"); if (res) res.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const csv = h.querySelector("#rfqCsv"); if (csv) csv.onclick = () => plDl(`ois_rfq_${plBE()}.csv`, plCsv([
    ["code", "datetime", "respondent", "proxy_role", "ticker", ...RFQ_ITEMS.map(i => `q${i.n}${i.r ? "R" : ""}_${i.s === "P" ? "prom" : "prev"}`), "promotion", "prevention", "prom_minus_prev", "focus_label", "translation_version"],
    ...RFQ.map(r => [r.code, r.at, r.role, r.proxy, r.ticker, ...RFQ_ITEMS.map(i => r.answers[i.n]), asR2(r.scores.prom), asR2(r.scores.prev), asR2(r.scores.diff), RFQ_FOCUS[r.scores.focus], r.v || ""])]), "text/csv;charset=utf-8");
  const cl = h.querySelector("#rfqClear"); if (cl) cl.onclick = () => plAsk(cl, `ลบคำตอบ RFQ ทั้งหมด ${RFQ.length} ชุดออกจากเครื่องนี้?`, () => { RFQ = []; rfqSave(); _rfqLast = null; render(); toast("ลบคำตอบ RFQ แล้ว"); });
}
/** สรุปสั้นสำหรับหน้าอื่น (เช่น Zone A / รายงาน) — null เมื่อยังไม่มีคำตอบของบริษัทนั้น */
window.rfqSummary = function (ticker) {
  const R = RFQ.filter(r => r.ticker === ticker && r.scores); if (!R.length) return null;
  const self = R.filter(r => r.role === "self"), base = self.length ? self : R;
  const p = plMean(base.map(r => r.scores.prom)), v = plMean(base.map(r => r.scores.prev)), d = p - v;
  const lab = d > RFQ_BAND ? "เน้น Promotion" : d < -RFQ_BAND ? "เน้น Prevention" : "สมดุล";
  return `แบบประเมิน RFQ ของ ${ticker}: ${R.length} ชุด (CEO ตอบเอง ${self.length} · ผู้ประเมินตอบแทน ${R.length - self.length}) · ` +
    `${self.length ? "จากคำตอบของ CEO" : "จากคำตอบแทน (proxy)"} Promotion ${fmt(p, 2)} · Prevention ${fmt(v, 2)} · ผลต่าง ${d >= 0 ? "+" : ""}${fmt(d, 2)} (${lab}) · ไม่ได้ใช้คำนวณ OpenInnoScore`;
};

/* ============================================================================
   B · Dictionary ของผู้ใช้ — คำนวณ Promotion Focus ด้วยพจนานุกรมที่ผู้ใช้สร้างเอง
   ============================================================================ */
const DICT_KEY = "ois_dict_v1";
const DICT_SAMPLE = {
  name: "ตัวอย่าง (ประกอบการสาธิตเท่านั้น)",
  prom: "# ตัวอย่างคำเชิง Promotion — เขียนขึ้นเพื่อสาธิต ไม่ใช่ Dictionary งานวิจัย\nachiev*\ngrow*\ngain*\nopportunit*\nadvanc*\naspir*\nprogress*\nideal*\nเติบโต\nโอกาส\nก้าวหน้า\nบรรลุ\nความสำเร็จ\nพัฒนา*",
  prev: "# ตัวอย่างคำเชิง Prevention — เขียนขึ้นเพื่อสาธิต ไม่ใช่ Dictionary งานวิจัย\nprotect*\nsecur*\nsafe*\navoid*\nloss*\ncareful*\noblig*\nrisk*\nป้องกัน\nความเสี่ยง\nปลอดภัย\nระมัดระวัง\nหลีกเลี่ยง\nความสูญเสีย",
};
let DICT = asLoad(DICT_KEY, null);
if (!DICT || !Array.isArray(DICT.dicts)) DICT = { dicts: [], sel: null };
const dictSave = () => asStore(DICT_KEY, DICT);
let _dEd = null, _dTxt = "", _dRes = null, _dSys = null, _dTxtName = "";
function dictEd() {
  if (_dEd) return _dEd;
  const s = DICT.dicts.find(x => x.id === DICT.sel);
  return _dEd = s ? { id: s.id, name: s.name, prom: s.prom, prev: s.prev } : { id: null, name: "", prom: "", prev: "" };
}
const SEG = (() => { try { return typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("th", { granularity: "word" }) : null; } catch (e) { return null; } })();
/** ตัดคำ — Intl.Segmenter (ภาษาไทย) ถ้ามี · สำรอง: คำภาษาอังกฤษ/ตัวเลข และช่วงอักษรไทยต่อเนื่องนับเป็นหนึ่งคำ */
function dictTok(text) {
  const out = [];
  if (SEG) { for (const s of SEG.segment(text)) if (s.isWordLike) out.push({ w: s.segment.toLowerCase(), i: s.index, e: s.index + s.segment.length }); }
  else { const rx = /[A-Za-z0-9][A-Za-z0-9'’-]*|[฀-๿]+/g; let m; while ((m = rx.exec(text))) out.push({ w: m[0].toLowerCase(), i: m.index, e: m.index + m[0].length }); }
  return out;
}
/** แปลงรายการคำ (หนึ่งคำต่อบรรทัด · # = หมายเหตุ · * ท้ายคำ = wildcard แบบ LIWC) */
function dictParse(raw) {
  const terms = [], bad = [], seen = new Set();
  String(raw || "").split(/\r?\n/).forEach(line => {
    const t = line.replace(/#.*$/, "").trim().toLowerCase();
    if (!t) return;
    const wild = /\*$/.test(t), base = t.replace(/\*+$/, "").replace(/\s+/g, "");
    if (!base || base.includes("*")) { bad.push(line.trim()); return; }
    const key = base + (wild ? "*" : "");
    if (seen.has(key)) return; seen.add(key);
    terms.push({ raw: key, base, wild });
  });
  terms.sort((a, b) => b.base.length - a.base.length);           // คำยาวก่อน (เลือกคำที่ยาวที่สุดที่ตรง)
  return { terms, bad };
}
/** หาตำแหน่งที่ตรงในหนึ่งหมวด — ต่อโทเคนติดกันจนยาวเท่าคำในพจนานุกรม (ไม่ตัดกลางคำ) · ไม่นับซ้อนในหมวดเดียวกัน */
function dictMatch(toks, terms) {
  const hits = [], per = {};
  if (!terms.length) return { hits, per, n: 0 };
  const first = {}; terms.forEach(t => (first[t.base[0]] = first[t.base[0]] || []).push(t));
  for (let j = 0; j < toks.length;) {
    const cand = first[toks[j].w[0]] || [];
    let best = null;
    for (const t of cand) {
      let acc = "", k = j;
      while (k < toks.length && acc.length < t.base.length) {
        const nx = acc + toks[k].w;
        if (!(t.base.startsWith(nx) || (t.wild && nx.startsWith(t.base)))) break;
        acc = nx; k++;
        if (acc === t.base || (t.wild && acc.startsWith(t.base))) { if (!best || k - j > best.k - j) best = { t, k }; break; }
      }
      if (best && best.t === t) break;                            // terms เรียงยาวก่อน — ตัวแรกที่ตรงคือยาวที่สุด
    }
    if (best) { hits.push({ i: toks[j].i, e: toks[best.k - 1].e, term: best.t.raw }); per[best.t.raw] = (per[best.t.raw] || 0) + 1; j = best.k; }
    else j++;
  }
  return { hits, per, n: hits.length };
}
function dictRun(text, ed) {
  const P = dictParse(ed.prom), V = dictParse(ed.prev), toks = dictTok(text);
  const mp = dictMatch(toks, P.terms), mv = dictMatch(toks, V.terms), wc = toks.length;
  return { wc, prom: mp, prev: mv, pf: wc ? (mp.n - mv.n) / wc * 100 : NaN, nP: P.terms.length, nV: V.terms.length, seg: !!SEG };
}
function dictHighlight(text, r) {
  const marks = r.prom.hits.map(h => [h.i, h.e, "p"]).concat(r.prev.hits.map(h => [h.i, h.e, "v"])).sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const pS = new Set(r.prom.hits.map(h => h.i)), vS = new Set(r.prev.hits.map(h => h.i));
  let out = "", pos = 0;
  for (let n = 0; n < marks.length; n++) {
    const [a, b, k] = marks[n]; if (a < pos) continue;
    const both = pS.has(a) && vS.has(a);
    out += esc(text.slice(pos, a)) + `<mark class="as-hl ${both ? "b" : k}">${esc(text.slice(a, b))}</mark>`; pos = b;
  }
  return out + esc(text.slice(pos));
}
function viewDict() {
  const ed = dictEd(), P = dictParse(ed.prom), V = dictParse(ed.prev), r = _dRes, pdfOk = tierRank() >= 1;
  const saved = DICT.dicts;
  const editor = `<div class="card" id="dictEditor"><h3>1 · Dictionary <span class="pill mute" style="margin-left:auto">${saved.length} ชุดที่บันทึก</span></h3>
      <p class="desc">หนึ่งคำต่อบรรทัด · ภาษาไทยและอังกฤษ · ไม่สนตัวพิมพ์ใหญ่/เล็ก · <code>*</code> ท้ายคำ = ขึ้นต้นด้วย (wildcard แบบ LIWC) เช่น <code>grow*</code> นับ grow, growth, growing · บรรทัดที่ขึ้นต้นด้วย <code>#</code> = หมายเหตุ</p>
      <div class="as-row">
        <label class="pl-lab" style="flex:1">ชุดที่บันทึกไว้<select class="sel" id="dictSel"><option value="">— ชุดใหม่ —</option>${saved.map(s => `<option value="${esc(s.id)}"${s.id === ed.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
        <label class="pl-lab" style="flex:1.4">ชื่อ Dictionary<input class="inp" id="dictName" maxlength="80" value="${esc(ed.name)}" placeholder="เช่น Dictionary ทีมวิจัย ฉบับ 1"></label></div>
      <div class="grid g2 as-g">
        <div><label class="pl-lab as-lp">Promotion <span class="pill ok" id="dictNP">${P.terms.length} คำ</span>
            <label class="btn g as-file">อัปโหลด .txt<input type="file" accept=".txt,text/plain" data-dictfile="prom" hidden></label></label>
          <textarea class="inp as-ta" id="dictProm" rows="10" spellcheck="false" placeholder="achiev*&#10;grow*&#10;โอกาส">${esc(ed.prom)}</textarea></div>
        <div><label class="pl-lab as-lp">Prevention <span class="pill warn" id="dictNV">${V.terms.length} คำ</span>
            <label class="btn g as-file">อัปโหลด .txt<input type="file" accept=".txt,text/plain" data-dictfile="prev" hidden></label></label>
          <textarea class="inp as-ta" id="dictPrev" rows="10" spellcheck="false" placeholder="protect*&#10;avoid*&#10;ความเสี่ยง">${esc(ed.prev)}</textarea></div></div>
      <div id="dictBad">${P.bad.length + V.bad.length ? `<div class="note warn" style="margin-top:8px">ข้ามบรรทัดที่มี * กลางคำ (รองรับเฉพาะ * ท้ายคำ): ${[...P.bad, ...V.bad].slice(0, 8).map(esc).join(" · ")}</div>` : ""}</div>
      <div class="pl-tools" style="margin-top:10px">
        <button class="btn p" id="dictSave">บันทึก</button><button class="btn s" id="dictSaveAs">บันทึกเป็นชุดใหม่</button>
        <button class="btn g" id="dictSample">ใส่ Dictionary ตัวอย่าง</button>
        ${ed.id ? `<button class="btn g" id="dictDel">ลบชุดนี้</button>` : ""}</div>
      <p class="as-sm" style="margin-top:8px">Dictionary ตัวอย่างมีคำทั่วไปไม่กี่คำเพื่อสาธิตการทำงานเท่านั้น — ไม่ใช่ Dictionary สำหรับงานวิจัย</p></div>`;
  const textCard = `<div class="card" id="dictText"><h3>2 · ข้อความ CEO</h3>
      <p class="desc">วางข้อความ หรืออัปโหลด .txt${pdfOk ? " / .pdf (อ่านด้วย pdf.js ในเบราว์เซอร์)" : " · อัปโหลด PDF เป็นสิทธิ์ Pro เช่นเดียวกับ Zone A"} · ข้อความอยู่ในหน่วยความจำของหน้านี้เท่านั้น ไม่ถูกบันทึกหรือส่งออก</p>
      <textarea class="inp as-ta" id="dictTxt" rows="9" placeholder="วางสารจาก CEO / ประธานกรรมการ ที่นี่">${esc(_dTxt)}</textarea>
      <div class="pl-tools" style="margin-top:10px">
        <label class="btn g as-file">อัปโหลด ${pdfOk ? ".txt / .pdf" : ".txt"}<input type="file" id="dictTxtFile" accept="${pdfOk ? ".txt,.pdf,text/plain,application/pdf" : ".txt,text/plain"}" hidden></label>
        <span class="as-sm" id="dictTxtInfo">${_dTxtName ? esc(_dTxtName) + " · " : ""}${fmt(_dTxt.length)} ตัวอักษร</span><span class="spacer"></span>
        <button class="btn p" id="dictRun">คำนวณ Promotion Focus</button></div></div>`;
  const top = (per, cls) => Object.entries(per).sort((a, b) => b[1] - a[1]);
  const res = !r ? "" : `<div class="card" id="dictRes"><h3>3 · ผลจาก Dictionary ของผู้ใช้ <span class="pill mute">${esc(r.name || "ไม่มีชื่อ")}</span></h3>
      <div class="grid g4 tight">
        <div class="stat"><div class="k">จำนวนคำทั้งหมด</div><div class="v" id="dictWc">${fmt(r.wc)}</div><div class="u">${r.seg ? "ตัดคำด้วย Intl.Segmenter (th)" : "ตัดคำแบบสำรอง"}</div></div>
        <div class="stat"><div class="k">คำ Promotion</div><div class="v" id="dictHp" style="color:var(--s3)">${fmt(r.prom.n)}</div><div class="u">จาก ${r.nP} คำในพจนานุกรม</div></div>
        <div class="stat"><div class="k">คำ Prevention</div><div class="v" id="dictHv" style="color:var(--warn)">${fmt(r.prev.n)}</div><div class="u">จาก ${r.nV} คำในพจนานุกรม</div></div>
        <div class="stat"><div class="k">Promotion Focus</div><div class="v" id="dictPf">${isNaN(r.pf) ? "—" : (r.pf >= 0 ? "+" : "") + fmt(r.pf, 3)}</div><div class="u">ต่อ 100 คำ</div></div></div>
      <div class="note" style="margin-top:10px"><b>สูตรของ Dictionary ผู้ใช้</b> — Promotion Focus = (คำ Promotion − คำ Prevention) ÷ จำนวนคำทั้งหมด × 100
        = (${r.prom.n} − ${r.prev.n}) ÷ ${fmt(r.wc)} × 100 · แนวทางเดียวกับ Gamache et al. (2015) คือ promotion ลบ prevention แล้วปรับด้วยความยาวข้อความ ·
        คำหนึ่งตำแหน่งนับได้หนึ่งครั้งต่อหมวด (คำที่ตรงยาวที่สุด)</div>
      <div class="note crit" style="margin-top:8px"><b>คะแนนจาก Dictionary ของผู้ใช้ไม่ได้ใช้คำนวณ OpenInnoScore และเทียบกับฐาน REF-928 ไม่ได้ เพราะฐานอ้างอิงคำนวณด้วย Dictionary ชุดที่ตรึงไว้ (LIWC-22 + ส่วนขยาย)</b></div>
      <div class="as-hlbox" id="dictHl">${dictHighlight(_dTxt, r)}</div>
      <div class="legend"><span><i style="background:var(--s3)"></i>Promotion</span><span><i style="background:var(--warn)"></i>Prevention</span><span><i style="background:var(--s6)"></i>ตรงทั้งสองหมวด</span></div>
      <div class="grid g2 as-g" style="margin-top:10px">
        ${[["Promotion", r.prom.per, "ok"], ["Prevention", r.prev.per, "warn"]].map(([l, per, c]) => `<div class="tw" style="max-height:240px"><table class="as-tbl"><thead><tr><th>คำในพจนานุกรม · ${l}</th><th class="n">จำนวนครั้ง</th></tr></thead><tbody>
          ${top(per).map(([t, n]) => `<tr><td><span class="pill ${c}">${esc(t)}</span></td><td class="n">${n}</td></tr>`).join("") || `<tr><td colspan="2" class="as-sm">ไม่พบ</td></tr>`}</tbody></table></div>`).join("")}</div>
      <div class="pl-tools" style="margin-top:12px"><button class="btn g" id="dictCsv">Export CSV</button>
        ${typeof analyseText === "function" ? `<button class="btn s" id="dictSys">เทียบกับ Dictionary ของระบบ</button>` : ""}</div>
      ${_dSys ? `<div class="card as-sys" id="dictSysOut"><h3>Dictionary ของระบบ (ข้อความเดียวกัน · อ่านอย่างเดียว)</h3>
        <div class="grid g4 tight">
          <div class="stat"><div class="k">คำเชิงรุก</div><div class="v">${fmt(_dSys.pro.n)}</div></div>
          <div class="stat"><div class="k">คำเชิงป้องกัน</div><div class="v">${fmt(_dSys.pre.n)}</div></div>
          <div class="stat"><div class="k">สัดส่วนเชิงรุก</div><div class="v">${fmt(_dSys.tilt * 100, 0)}%</div></div>
          <div class="stat"><div class="k">CEO Promotion Focus</div><div class="v">${fmt(_dSys.dp, 0)}<span style="font-size:13px;font-weight:300"> / 100</span></div></div></div>
        <p class="as-sm" style="margin-top:8px">ระบบใช้พจนานุกรมเปิดของ Zone A และแปลงสัดส่วนคำเชิงรุกเป็นเปอร์เซ็นไทล์ด้วยตารางจุดยึด — คนละสูตรกับ Dictionary ของผู้ใช้ จึงเทียบตัวเลขกันตรง ๆ ไม่ได้ ใช้ดูทิศทางเท่านั้น ·
          ค่านี้ไม่ได้บันทึกลง Zone A</p></div>` : ""}</div>`;
  return pageHead("แบบประเมิน · ตรวจภาษา CEO (Input Type 2)", "Dictionary ของผู้ใช้ (คำนวณ Promotion Focus)",
    `สร้าง Dictionary คำเชิง Promotion / Prevention เอง (ขอบเขต 2.3) แล้วคำนวณ Promotion Focus ของข้อความ CEO · ใช้ได้ทุกระดับสิทธิ์ ·
     ผลใช้สำรวจและทดลองเท่านั้น <b>ไม่เข้าสูตร OpenInnoScore</b>`)
    + `<div class="grid g2 as-top">${editor}${textCard}</div>${res}`;
}
function dictCounts(h) {
  const ed = dictEd(), P = dictParse(ed.prom), V = dictParse(ed.prev);
  const a = h.querySelector("#dictNP"), b = h.querySelector("#dictNV");
  if (a) a.textContent = P.terms.length + " คำ"; if (b) b.textContent = V.terms.length + " คำ";
}
function wireDict(h) {
  const ed = dictEd();
  const sel = h.querySelector("#dictSel"); if (sel) sel.onchange = () => { DICT.sel = sel.value || null; dictSave(); _dEd = null; _dRes = null; _dSys = null; render(); };
  const nm = h.querySelector("#dictName"); if (nm) nm.oninput = () => { ed.name = nm.value.slice(0, 80); };
  [["#dictProm", "prom"], ["#dictPrev", "prev"]].forEach(([s, k]) => { const t = h.querySelector(s); if (t) t.oninput = () => { ed[k] = t.value; dictCounts(h); }; });
  h.querySelectorAll("input[data-dictfile]").forEach(i => i.onchange = async () => {
    const f = i.files && i.files[0]; if (!f) return;
    if (f.size > 2e6) return toast("ไฟล์ใหญ่เกิน 2 MB");
    ed[i.dataset.dictfile] = (await f.text()).replace(/^﻿/, ""); render();
  });
  const doSave = asNew => {
    const name = (ed.name || "").trim();
    if (!name) { const n = h.querySelector("#dictName"); if (n) n.focus(); return toast("ตั้งชื่อ Dictionary ก่อนบันทึก"); }
    const P = dictParse(ed.prom), V = dictParse(ed.prev);
    if (!P.terms.length && !V.terms.length) return toast("ยังไม่มีคำในพจนานุกรม");
    let s = !asNew && ed.id && DICT.dicts.find(x => x.id === ed.id);
    if (!s) { s = { id: plId() }; DICT.dicts.push(s); }
    Object.assign(s, { name: name.slice(0, 80), prom: ed.prom.slice(0, 200000), prev: ed.prev.slice(0, 200000), at: asNow() });
    DICT.sel = s.id; dictSave(); _dEd = null; toast(`บันทึก Dictionary “${s.name}” แล้ว`);
    asSubmit("dict", null, { name: s.name, promTerms: P.terms.length, prevTerms: V.terms.length, wildcards: P.terms.concat(V.terms).filter(t => t.wild).length, savedAt: s.at });
    render();
  };
  const sv = h.querySelector("#dictSave"); if (sv) sv.onclick = () => doSave(false);
  const sa = h.querySelector("#dictSaveAs"); if (sa) sa.onclick = () => doSave(true);
  const sm = h.querySelector("#dictSample"); if (sm) sm.onclick = () => { Object.assign(ed, { name: ed.name || DICT_SAMPLE.name, prom: DICT_SAMPLE.prom, prev: DICT_SAMPLE.prev }); render(); };
  const dl = h.querySelector("#dictDel"); if (dl) dl.onclick = () => plAsk(dl, "ลบ Dictionary ชุดนี้ออกจากเครื่อง?", () => {
    DICT.dicts = DICT.dicts.filter(x => x.id !== ed.id); DICT.sel = null; dictSave(); _dEd = null; _dRes = null; render(); });
  const tx = h.querySelector("#dictTxt"); if (tx) tx.oninput = () => { _dTxt = tx.value; _dTxtName = ""; const n = h.querySelector("#dictTxtInfo"); if (n) n.textContent = fmt(_dTxt.length) + " ตัวอักษร"; };
  const tf = h.querySelector("#dictTxtFile"); if (tf) tf.onchange = async () => {
    const f = tf.files && tf.files[0]; if (!f) return;
    const isPdf = /\.pdf$/i.test(f.name);
    if (isPdf && tierRank() < 1) return toast("อัปโหลด PDF เป็นสิทธิ์ Pro — ใช้ไฟล์ .txt หรือวางข้อความแทน");
    if (f.size > 30e6) return toast("ไฟล์ใหญ่เกิน 30 MB");
    try {
      toast(isPdf ? "กำลังอ่าน PDF…" : "กำลังอ่านไฟล์…");
      const t = isPdf && typeof readFileText === "function" ? await readFileText(f) : await f.text();
      _dTxt = String(t || "").replace(/^﻿/, "").slice(0, 400000); _dTxtName = f.name; _dRes = null; _dSys = null; render();
      if (!_dTxt.trim()) toast("ไม่พบข้อความในไฟล์ (PDF ที่เป็นภาพสแกนต้องใช้ OCR)");
    } catch (e) { toast("อ่านไฟล์ไม่สำเร็จ"); }
  };
  const run = h.querySelector("#dictRun"); if (run) run.onclick = () => {
    if (!_dTxt.trim()) return toast("ยังไม่มีข้อความ CEO");
    const P = dictParse(ed.prom), V = dictParse(ed.prev);
    if (!P.terms.length && !V.terms.length) return toast("ยังไม่มีคำใน Dictionary — กรอกเอง อัปโหลด .txt หรือใช้ตัวอย่าง");
    _dRes = Object.assign(dictRun(_dTxt, ed), { name: ed.name }); _dSys = null; render();
    const o = $("#dictRes"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const sy = h.querySelector("#dictSys"); if (sy) sy.onclick = () => { try { _dSys = analyseText(_dTxt); } catch (e) { _dSys = null; toast("คำนวณด้วย Dictionary ของระบบไม่สำเร็จ"); } render(); };
  const cs = h.querySelector("#dictCsv"); if (cs) cs.onclick = () => { const r = _dRes; if (!r) return;
    plDl(`ois_userdict_${plBE()}.csv`, plCsv([
      ["dictionary", r.name || ""], ["total_words", r.wc], ["promotion_hits", r.prom.n], ["prevention_hits", r.prev.n],
      ["promotion_focus_per100", asR2(r.pf)], ["formula", "(promotion - prevention) / total_words * 100 (user dictionary; not OpenInnoScore)"],
      ["system_dictionary_percentile", _dSys ? _dSys.dp : ""], [],
      ["category", "term", "hits"],
      ...Object.entries(r.prom.per).map(([t, n]) => ["promotion", t, n]), ...Object.entries(r.prev.per).map(([t, n]) => ["prevention", t, n])]), "text/csv;charset=utf-8"); };
}

/* ============================================================================
   C · แบบประเมินตนเองของคณะกรรมการ (รูปแบบ SET) — ตัวสร้าง · ทำแบบประเมิน · ผลและประวัติ
   ============================================================================ */
const BST_KEY = "ois_bodset_tpl_v1", BSE_KEY = "ois_bodset_v1";
const BS_SCALES = {
  "0-4": { lo: 0, hi: 4, labs: ["ไม่เห็นด้วยอย่างยิ่ง / ไม่มีการดำเนินการ", "ไม่เห็นด้วย / มีการดำเนินการเล็กน้อย", "เห็นด้วย / มีการดำเนินการพอสมควร", "ค่อนข้างเห็นด้วย / มีการดำเนินการดี", "เห็นด้วยอย่างยิ่ง / ดำเนินการอย่างดีเยี่ยม"] },
  "1-5": { lo: 1, hi: 5, labs: ["ไม่เห็นด้วยอย่างยิ่ง", "ไม่เห็นด้วย", "ไม่แน่ใจ / เป็นกลาง", "เห็นด้วย", "เห็นด้วยอย่างยิ่ง"] },
};
const BS_ROLES = { board: "คณะกรรมการทั้งคณะ", indiv: "กรรมการรายบุคคล (ประเมินตนเอง)", cmte: "คณะกรรมการชุดย่อย" };
const BS_CMTE = ["คณะกรรมการตรวจสอบ", "คณะกรรมการสรรหาและพิจารณาค่าตอบแทน", "คณะกรรมการบริหารความเสี่ยง", "คณะกรรมการบรรษัทภิบาล / ความยั่งยืน", "คณะกรรมการบริหาร", "อื่น ๆ"];
const BS_DEFAULT_DIMS = [
  ["โครงสร้างและคุณสมบัติของคณะกรรมการ", ["คณะกรรมการมีจำนวนและสัดส่วนกรรมการอิสระที่เหมาะสมกับขนาดและลักษณะธุรกิจของบริษัท",
    "องค์ประกอบของคณะกรรมการมีความหลากหลายด้านทักษะ ประสบการณ์ และความรู้ที่จำเป็นต่อกลยุทธ์ของบริษัท",
    "มีการทบทวนคุณสมบัติและตารางทักษะ (skill matrix) ของคณะกรรมการอย่างสม่ำเสมอ", "กระบวนการสรรหากรรมการโปร่งใสและมีหลักเกณฑ์ที่ชัดเจน"]],
  ["บทบาท หน้าที่ และความรับผิดชอบของคณะกรรมการ", ["คณะกรรมการมีส่วนร่วมกำหนดและทบทวนวิสัยทัศน์ พันธกิจ และกลยุทธ์ของบริษัท",
    "คณะกรรมการกำกับดูแลให้มีระบบควบคุมภายในและการบริหารความเสี่ยงที่เพียงพอ", "คณะกรรมการติดตามผลการดำเนินงานเทียบกับแผนและเป้าหมายอย่างสม่ำเสมอ",
    "คณะกรรมการดูแลเรื่องความขัดแย้งทางผลประโยชน์และรายการที่เกี่ยวโยงกันอย่างรอบคอบ", "คณะกรรมการให้ความสำคัญกับความยั่งยืนและผู้มีส่วนได้เสียทุกกลุ่ม"]],
  ["การประชุมคณะกรรมการ", ["มีการกำหนดตารางการประชุมล่วงหน้าทั้งปี และจำนวนครั้งเหมาะสมกับภาระหน้าที่",
    "กรรมการได้รับเอกสารประกอบการประชุมที่ครบถ้วนและล่วงหน้าเพียงพอต่อการพิจารณา", "ประธานกรรมการเปิดโอกาสให้กรรมการอภิปรายและแสดงความเห็นอย่างอิสระ",
    "รายงานการประชุมบันทึกสาระสำคัญ ข้อสังเกต และมติอย่างถูกต้องครบถ้วน"]],
  ["การทำหน้าที่ของกรรมการ", ["กรรมการเข้าร่วมประชุมอย่างสม่ำเสมอและเตรียมตัวล่วงหน้า", "กรรมการแสดงความเห็นอย่างเป็นอิสระและใช้ดุลยพินิจอย่างรอบคอบ",
    "กรรมการอุทิศเวลาเพียงพอต่อการปฏิบัติหน้าที่ แม้ดำรงตำแหน่งในบริษัทอื่นด้วย", "กรรมการเข้าใจบทบาทหน้าที่ตามกฎหมายและหลักการกำกับดูแลกิจการที่ดี"]],
  ["ความสัมพันธ์กับฝ่ายจัดการ", ["คณะกรรมการและฝ่ายจัดการแบ่งบทบาทหน้าที่กันอย่างชัดเจน", "คณะกรรมการเข้าถึงข้อมูลและผู้บริหารที่เกี่ยวข้องได้เมื่อต้องการ",
    "คณะกรรมการให้คำแนะนำฝ่ายจัดการอย่างสร้างสรรค์โดยไม่ก้าวก่ายงานประจำ", "มีการประเมินผลการปฏิบัติงานของประธานเจ้าหน้าที่บริหารอย่างเป็นระบบทุกปี"]],
  ["การพัฒนาตนเองของกรรมการและการพัฒนาผู้บริหาร", ["กรรมการใหม่ได้รับการปฐมนิเทศและข้อมูลที่จำเป็นต่อการปฏิบัติหน้าที่",
    "กรรมการได้รับการพัฒนาความรู้อย่างต่อเนื่อง เช่น หลักสูตรด้านการกำกับดูแลหรือการสัมมนาที่เกี่ยวข้อง",
    "คณะกรรมการดูแลให้มีแผนสืบทอดตำแหน่ง (succession plan) ของผู้บริหารระดับสูง", "คณะกรรมการติดตามการพัฒนาศักยภาพของผู้บริหารระดับสูงอย่างสม่ำเสมอ"]],
];
const BS_OI_NAME = "การกำกับดูแลนวัตกรรมแบบเปิด (OI-1…6)";
function bsDefaultTpl() {
  const mk = (name, items, on, oi) => ({ id: plId(), name, on, oi: !!oi, items: items.map(t => ({ id: plId(), t })) });
  return { id: "default", name: "แบบประเมินตนเองของคณะกรรมการ (รูปแบบ SET · ค่าเริ่มต้น)", scale: "0-4",
    dims: BS_DEFAULT_DIMS.map(([n, it]) => mk(n, it, true)).concat([mk(BS_OI_NAME, (typeof OI_ITEMS !== "undefined" ? OI_ITEMS : []).map(i => `${i.id} · ${i.t}`), false, true)]) };
}
let BST = asLoad(BST_KEY, null);
if (!BST || !Array.isArray(BST.tpls) || !BST.tpls.length) BST = { tpls: [bsDefaultTpl()], sel: "default" };
let BSE = asLoad(BSE_KEY, null);
if (!BSE || !Array.isArray(BSE.evals)) BSE = { evals: [] };
const bstSave = () => asStore(BST_KEY, BST), bseSave = () => asStore(BSE_KEY, BSE);
const bsTpl = () => BST.tpls.find(t => t.id === BST.sel) || BST.tpls[0];
let _bs = { tab: "eval", draft: null, view: null, srv: null };
const bsDraft = () => _bs.draft || (_bs.draft = { role: "board", cmte: BS_CMTE[0], fy: String(plBE() - 1), a: {}, cm: {} });
const bsActive = t => t.dims.filter(d => d.on && d.items.length);
const bsFY = fy => { const n = parseInt(fy, 10); return isNaN(n) ? "" : String(n < 2400 ? n + 543 : n); };
/** ผลรายด้าน — ค่าเฉลี่ย และร้อยละของคะแนนเต็ม ((ค่าเฉลี่ย − ต่ำสุด) ÷ (สูงสุด − ต่ำสุด)) */
function bsCalc(ev) {
  const sc = BS_SCALES[ev.scale] || BS_SCALES["0-4"], span = sc.hi - sc.lo;
  const dims = ev.dims.map(d => { const v = d.items.map(i => i.v).filter(x => typeof x === "number"), m = plMean(v);
    return { name: d.name, n: v.length, mean: m, pct: (m - sc.lo) / span * 100, comment: d.comment || "" }; });
  const all = ev.dims.flatMap(d => d.items.map(i => i.v)).filter(x => typeof x === "number"), m = plMean(all);
  const ord = dims.filter(d => !isNaN(d.mean)).slice().sort((a, b) => b.pct - a.pct);
  const top = ord.slice(0, 2), low = ord.slice(-2).reverse().filter(d => !top.includes(d));
  return { dims, mean: m, pct: (m - sc.lo) / span * 100, n: all.length, top, low, sc };
}
/** แผนภูมิเรดาร์ (SVG) — ใช้ตัวแปรสีของธีม จึงอ่านได้ทั้งโหมดสว่างและมืด · น้อยกว่า 3 ด้านแสดงเป็นแท่ง */
function bsRadar(dims) {
  if (dims.length < 3) return `<div class="as-bars">${dims.map((d, i) => `<div class="as-bar"><span>ด้าน ${i + 1}</span><div class="as-track"><i style="width:${clamp(d.pct, 0, 100)}%;background:var(--brand)"></i></div><b>${fmt(d.pct, 0)}%</b></div>`).join("")}</div>`;
  const W = 340, C = W / 2, R = 118, N = dims.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
  const pt = (i, f) => [C + Math.cos(ang(i)) * R * f, C + Math.sin(ang(i)) * R * f];
  const poly = f => dims.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(",")).join(" ");
  const data = dims.map((d, i) => pt(i, clamp(d.pct, 0, 100) / 100).map(v => v.toFixed(1)).join(",")).join(" ");
  return `<svg class="as-radar" viewBox="0 0 ${W} ${W}" role="img" aria-label="แผนภูมิเรดาร์ร้อยละของคะแนนเต็มรายด้าน">
    ${[.25, .5, .75, 1].map(f => `<polygon points="${poly(f)}" fill="none" stroke="var(--line)" stroke-width="${f === 1 ? 1.4 : 1}"/>`).join("")}
    ${dims.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`; }).join("")}
    ${[25, 50, 75, 100].map(v => `<text x="${C + 3}" y="${(C - R * v / 100 + 10).toFixed(1)}" font-size="8.5" fill="var(--ink-3)">${v}%</text>`).join("")}
    <polygon points="${data}" fill="color-mix(in srgb,var(--brand) 22%,transparent)" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round"/>
    ${dims.map((d, i) => { const [x, y] = pt(i, clamp(d.pct, 0, 100) / 100); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="var(--brand)" stroke="var(--panel)" stroke-width="1.5"><title>${esc(d.name)} · ${fmt(d.pct, 0)}%</title></circle>`; }).join("")}
    ${dims.map((d, i) => { const [x, y] = pt(i, 1.13), a = Math.cos(ang(i)); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11.5" font-weight="600" text-anchor="${a > .3 ? "start" : a < -.3 ? "end" : "middle"}" fill="var(--ink-2)">${i + 1}</text>`; }).join("")}
  </svg>`;
}
function bsRoleNote(ev) {
  if (ev.role === "indiv") return `<div class="note crit"><b>ผลการประเมินตนเองรายบุคคลเป็นความลับ</b> — ส่งถึงเลขานุการบริษัทเท่านั้นเพื่อรวมเป็นภาพรวม · ระบบไม่เก็บชื่อกรรมการ และไม่ใช้จัดอันดับหรือประเมินกรรมการรายบุคคล</div>`;
  if (ev.role === "cmte") return `<div class="note">ผลระดับคณะกรรมการชุดย่อย (${esc(ev.cmte || "")}) — เป็นภาพรวมของคณะ ไม่ใช่คะแนนของกรรมการรายบุคคล</div>`;
  return `<div class="note">ผลระดับคณะกรรมการทั้งคณะ (board-level) — ไม่ใช่คะแนนของกรรมการรายบุคคล</div>`;
}
function bsResult(ev) {
  const r = bsCalc(ev);
  return `<div class="card as-res" id="bsRes"><h3>ผลการประเมิน · ${esc(asCoName(ev.ticker))} · ปี ${esc(ev.fy)} <span class="pill mute" style="margin-left:auto">${esc(BS_ROLES[ev.role])}</span></h3>
    <p class="desc">${esc(ev.tplName)} · มาตราส่วน ${esc(ev.scale)} · บันทึก ${esc(asThDT(ev.at))}${ev.srv ? " · บันทึกเข้าเซิร์ฟเวอร์แล้ว" : ""}</p>
    ${bsRoleNote(ev)}
    <div class="as-resg">
      <div>${bsRadar(r.dims)}</div>
      <div><div class="stat hero" style="margin-bottom:10px"><div class="k">ภาพรวม (ค่าเฉลี่ยทุกข้อ)</div>
          <div class="v" id="bsOverall">${fmt(r.mean, 2)}<span style="font-size:14px;font-weight:300;opacity:.75"> / ${r.sc.hi}</span></div>
          <div class="u">ร้อยละ ${fmt(r.pct, 1)} ของคะแนนเต็ม · ${r.n} ข้อ</div></div>
        <div class="tw"><table class="as-tbl" id="bsDimTbl"><thead><tr><th>ด้าน</th><th class="n">ค่าเฉลี่ย</th><th class="n">% ของเต็ม</th></tr></thead><tbody>
          ${r.dims.map((d, i) => `<tr><td><b>${i + 1}.</b> ${esc(d.name)}</td><td class="n">${fmt(d.mean, 2)}</td><td class="n">${fmt(d.pct, 1)}%</td></tr>`).join("")}</tbody></table></div></div></div>
    <div class="grid g2 as-g" style="margin-top:12px">
      <div class="note ok"><b>จุดแข็ง (คะแนนสูงสุด 2 ด้าน)</b><ul class="as-ul">${r.top.map(d => `<li>${esc(d.name)} · ${fmt(d.pct, 0)}%</li>`).join("")}</ul></div>
      <div class="note warn"><b>ประเด็นพัฒนา (คะแนนต่ำสุด 2 ด้าน)</b><ul class="as-ul">${r.low.map(d => `<li>${esc(d.name)} · ${fmt(d.pct, 0)}%</li>`).join("") || "<li>—</li>"}</ul></div></div>
    ${r.dims.some(d => d.comment) ? `<details style="margin-top:10px"><summary class="as-sum">ความเห็นเพิ่มเติมรายด้าน</summary><ul class="as-ul">${r.dims.filter(d => d.comment).map(d => `<li><b>${esc(d.name)}:</b> ${esc(d.comment)}</li>`).join("")}</ul></details>` : ""}
    <div class="pl-tools" style="margin-top:12px">
      ${typeof rpPlanAdd === "function" && ev.ticker === S.t && r.low.length ? `<button class="btn s" id="bsToFu">ส่งประเด็นพัฒนาเข้าหน้า Follow-up</button>` : ""}
      <button class="btn g" id="bsSumBtn">ร่างข้อความ {{ผลประเมิน BOD}}</button></div>
    <div id="bsSumOut"></div></div>`;
}
function bsBuilder() {
  const t = bsTpl(), on = bsActive(t);
  return `<div class="card" id="bsBuilder"><h3>ตัวสร้างแบบประเมิน <span class="pill mute" style="margin-left:auto">${on.length} ด้านที่เปิด · ${on.reduce((s, d) => s + d.items.length, 0)} ข้อ</span></h3>
    <div class="as-row">
      <label class="pl-lab" style="flex:1.6">แบบประเมิน (Template)<select class="sel" id="bsTplSel">${BST.tpls.map(x => `<option value="${esc(x.id)}"${x.id === t.id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <label class="pl-lab" style="flex:1.6">ชื่อ Template<input class="inp" id="bsTplName" maxlength="120" value="${esc(t.name)}"></label>
      <label class="pl-lab" style="flex:1">มาตราส่วน<select class="sel" id="bsScale">${Object.keys(BS_SCALES).map(k => `<option value="${k}"${t.scale === k ? " selected" : ""}>${k === "0-4" ? "0–4 (รูปแบบที่ SET ใช้ทั่วไป)" : "1–5 (Likert)"}</option>`).join("")}</select></label></div>
    <div class="pl-tools" style="margin:2px 0 12px"><button class="btn s" id="bsTplDup">ทำสำเนาเป็น Template ใหม่</button><button class="btn g" id="bsTplNew">Template ใหม่ (ค่าเริ่มต้น)</button>
      <button class="btn g" id="bsTplExp">Export JSON</button><label class="btn g as-file">Import JSON<input type="file" id="bsTplImp" accept=".json,application/json" hidden></label>
      ${BST.tpls.length > 1 ? `<button class="btn g" id="bsTplDel">ลบ Template นี้</button>` : ""}</div>
    <div class="note brand" style="margin-bottom:10px">ข้อคำถามตัวอย่าง — แทนที่ด้วยแบบประเมินทางการของ SET เมื่อได้รับไฟล์ · แก้ไข เพิ่ม/ลด/เรียงลำดับด้านและข้อได้ทั้งหมด การแก้ไขบันทึกอัตโนมัติและไม่กระทบผลที่บันทึกไปแล้ว</div>
    <ol class="as-dims">${t.dims.map((d, di) => `<li class="as-dim${d.on ? "" : " off"}" data-dim="${esc(d.id)}">
      <div class="as-dimh"><label class="as-tog" title="เปิด/ปิดด้านนี้"><input type="checkbox" data-bsdon="${esc(d.id)}"${d.on ? " checked" : ""}><span>${d.on ? "เปิด" : "ปิด"}</span></label>
        <b class="as-dn">${di + 1}.</b><input class="inp as-dname" data-bsdname="${esc(d.id)}" value="${esc(d.name)}" maxlength="120" aria-label="ชื่อด้าน ${di + 1}">
        ${d.oi ? `<span class="pill blue">ใช้ชุดคำถาม OI-1…6</span>` : ""}
        <span class="as-btns"><button class="lnk" data-bsdmv="${esc(d.id)}|-1" title="เลื่อนขึ้น" ${di ? "" : "disabled"}>↑</button><button class="lnk" data-bsdmv="${esc(d.id)}|1" title="เลื่อนลง" ${di < t.dims.length - 1 ? "" : "disabled"}>↓</button>
          <button class="lnk" data-bsddel="${esc(d.id)}" title="ลบด้านนี้">ลบด้าน</button></span></div>
      <ol class="as-its">${d.items.map((it, ii) => `<li><input class="inp" data-bsit="${esc(d.id)}|${esc(it.id)}" value="${esc(it.t)}" maxlength="400" aria-label="ข้อ ${ii + 1} ของด้าน ${di + 1}">
        <span class="as-btns"><button class="lnk" data-bsimv="${esc(d.id)}|${esc(it.id)}|-1" ${ii ? "" : "disabled"} title="เลื่อนขึ้น">↑</button><button class="lnk" data-bsimv="${esc(d.id)}|${esc(it.id)}|1" ${ii < d.items.length - 1 ? "" : "disabled"} title="เลื่อนลง">↓</button>
          <button class="lnk" data-bsidel="${esc(d.id)}|${esc(it.id)}" title="ลบข้อ">✕</button></span></li>`).join("")}</ol>
      <button class="btn g as-add" data-bsiadd="${esc(d.id)}">+ เพิ่มข้อคำถาม</button></li>`).join("")}</ol>
    <div class="pl-tools" style="margin-top:10px"><input class="inp" id="bsNewDim" placeholder="ชื่อด้านใหม่" maxlength="120" style="flex:1;min-width:200px"><button class="btn p" id="bsDimAdd">+ เพิ่มด้าน</button>
      <button class="btn g" id="bsTplReset">คืนค่าเริ่มต้นของ Template นี้</button></div></div>`;
}
function bsEvalForm() {
  const t = bsTpl(), d = bsDraft(), dims = bsActive(t), sc = BS_SCALES[t.scale] || BS_SCALES["0-4"], c = cur();
  const vals = []; for (let v = sc.lo; v <= sc.hi; v++) vals.push(v);
  const tot = dims.reduce((s, x) => s + x.items.length, 0), done = dims.reduce((s, x) => s + x.items.filter(i => typeof d.a[i.id] === "number").length, 0);
  return `<div class="card" id="bsEval"><h3>ทำแบบประเมิน <span class="pill mute" style="margin-left:auto" id="bsCnt">ตอบแล้ว ${done} / ${tot}</span></h3>
    <div class="pl-prog"><span id="bsBar" style="width:${tot ? Math.round(done / tot * 100) : 0}%"></span></div>
    <div class="as-meta">
      <label class="pl-lab">ผู้ประเมิน<select class="sel" id="bsRole">${Object.entries(BS_ROLES).map(([k, v]) => `<option value="${k}"${d.role === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
      ${d.role === "cmte" ? `<label class="pl-lab">คณะกรรมการชุดย่อย<select class="sel" id="bsCmte">${BS_CMTE.map(x => `<option${d.cmte === x ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>` : ""}
      <label class="pl-lab">ปีที่ประเมิน (พ.ศ.)<input class="inp" id="bsFy" inputmode="numeric" maxlength="4" value="${esc(d.fy)}"></label>
      <label class="pl-lab">บริษัท<input class="inp" value="${esc(c.t)} · ${esc(c.n)}" readonly title="เปลี่ยนบริษัทได้จากตัวเลือกด้านบน"></label></div>
    ${bsRoleNote(d)}
    <p class="desc" style="margin-top:10px">${esc(t.name)} · มาตราส่วน ${sc.lo}–${sc.hi}: ${vals.map((v, i) => `<b>${v}</b> = ${esc(sc.labs[i])}`).join(" · ")}</p>
    ${dims.length ? dims.map((dm, di) => `<div class="as-edim"><div class="pl-grp">ด้านที่ ${di + 1} · ${esc(dm.name)}</div>
      ${dm.items.map((it, ii) => `<div class="as-eit${typeof d.a[it.id] === "number" ? " done" : ""}" id="bsI${esc(it.id)}"><div class="as-qt"><b>${di + 1}.${ii + 1}</b> ${esc(it.t)}</div>
        <div class="as-sc" role="radiogroup">${vals.map((v, i) => `<label class="${d.a[it.id] === v ? "on" : ""}" title="${esc(sc.labs[i])}"><input type="radio" name="bs-${esc(it.id)}" value="${v}" data-bsa="${esc(it.id)}"${d.a[it.id] === v ? " checked" : ""}><b>${v}</b></label>`).join("")}</div></div>`).join("")}
      <label class="pl-lab">ความเห็นเพิ่มเติม / ข้อเสนอแนะด้านนี้ (ไม่ระบุชื่อบุคคล)<textarea class="inp pl-ta" rows="2" data-bscm="${esc(dm.id)}">${esc(d.cm[dm.id] || "")}</textarea></label></div>`).join("")
      : `<div class="note warn">Template นี้ยังไม่มีด้านที่เปิดใช้ — ไปที่แท็บตัวสร้างแบบประเมิน</div>`}
    <div class="pl-tools" style="margin-top:14px"><span class="as-sm" id="bsMsg"></span><span class="spacer"></span>
      <button class="btn g" id="bsClearDraft">ล้างคำตอบ</button><button class="btn p" id="bsSubmit" ${dims.length ? "" : "disabled"}>บันทึกผลการประเมิน</button></div></div>`;
}
function bsHistory() {
  const t = S.t, E = BSE.evals.filter(e => e.ticker === t).slice().reverse();
  const ev = _bs.view && BSE.evals.find(e => e.id === _bs.view && e.ticker === t);
  return (ev ? bsResult(ev) : "") + `<div class="card" id="bsHist" style="margin-top:14px"><h3>ประวัติการประเมิน · ${esc(asCoName(t))} <span class="pill mute">${E.length} ครั้ง</span></h3>
    <p class="desc">เก็บในเครื่องนี้ (localStorage “${BSE_KEY}”) แยกตามบริษัทและปีที่ประเมิน · การประเมินรายบุคคลไม่มีชื่อ</p>
    ${E.length ? `<div class="tw"><table class="as-tbl"><thead><tr><th>ปี</th><th>ผู้ประเมิน</th><th>Template</th><th class="n">ภาพรวม</th><th class="n">% ของเต็ม</th><th>บันทึกเมื่อ</th><th></th></tr></thead><tbody>
      ${E.map(e => { const r = bsCalc(e); return `<tr class="${_bs.view === e.id ? "as-cur" : ""}"><td>${esc(e.fy)}</td><td>${esc(BS_ROLES[e.role])}${e.role === "cmte" ? " · " + esc(e.cmte) : ""}</td><td>${esc(e.tplName)}</td>
        <td class="n">${fmt(r.mean, 2)} / ${r.sc.hi}</td><td class="n">${fmt(r.pct, 1)}%</td><td>${esc(asThDT(e.at))}</td>
        <td class="as-nw"><button class="lnk" data-bsview="${esc(e.id)}">ดูผล</button> · <button class="lnk" data-bsdel="${esc(e.id)}">ลบ</button></td></tr>`; }).join("")}</tbody></table></div>`
      : `<div class="note">ยังไม่มีผลการประเมินของบริษัทนี้</div>`}
    <div class="pl-tools" style="margin-top:12px"><button class="btn g" id="bsCsv" ${BSE.evals.length ? "" : "disabled"}>Export CSV (ทุกบริษัท)</button></div></div>`;
}
function viewBodset() {
  const tab = _bs.tab;
  return pageHead("แบบประเมิน · BOD Evaluation (รูปแบบ SET)", "แบบประเมินตนเองของคณะกรรมการ (SET)",
    `UX/UI สำหรับเก็บและประมวลผลการประเมินตนเองของคณะกรรมการ (Self Assessment) — ผู้ใช้เพิ่ม/ลดด้านและข้อคำถามเองได้ และเก็บประวัติการประเมิน ·
     ผลใช้ประกอบรายงาน 56-1 ส่วนที่ 2 ข้อ 7–8 · ใช้ได้ทุกระดับสิทธิ์`)
    + `<div class="as-tabs" role="tablist">${[["eval", "ทำแบบประเมิน"], ["res", "ผลและประวัติ"], ["build", "ตัวสร้างแบบประเมิน (Builder)"]].map(([k, l]) =>
        `<button class="btn ${tab === k ? "p" : "g"}" role="tab" aria-selected="${tab === k}" data-bstab="${k}">${l}</button>`).join("")}</div>`
    + (tab === "build" ? bsBuilder() : tab === "res" ? bsHistory() : bsEvalForm())
    + `<div class="note" style="margin-top:14px;font-size:11.2px">${PL_LEGAL} · ผลระดับคณะกรรมการทั้งคณะไม่ใช่คะแนนของกรรมการรายบุคคล · ผลการประเมินตนเองไม่ได้ใช้คำนวณ OpenInnoScore</div>`;
}
function bsMutate(fn) { const t = bsTpl(); fn(t); bstSave(); render(); }
const bsMove = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
function bsSanitize(o) {
  if (!o || typeof o !== "object" || !Array.isArray(o.dims)) return null;
  const s = v => String(v ?? "").slice(0, 400);
  return { id: plId(), name: s(o.name || "Template ที่นำเข้า").slice(0, 120), scale: BS_SCALES[o.scale] ? o.scale : "0-4",
    dims: o.dims.slice(0, 30).map(d => ({ id: plId(), name: s(d && d.name || "ด้าน").slice(0, 120), on: d && d.on !== false, oi: !!(d && d.oi),
      items: (Array.isArray(d && d.items) ? d.items : []).slice(0, 60).map(i => ({ id: plId(), t: s(typeof i === "string" ? i : i && i.t) })).filter(i => i.t) })) };
}
function bsProg(h) {
  const t = bsTpl(), d = bsDraft(), dims = bsActive(t);
  const tot = dims.reduce((s, x) => s + x.items.length, 0), done = dims.reduce((s, x) => s + x.items.filter(i => typeof d.a[i.id] === "number").length, 0);
  const c = h.querySelector("#bsCnt"); if (c) c.textContent = `ตอบแล้ว ${done} / ${tot}`;
  const b = h.querySelector("#bsBar"); if (b) b.style.width = (tot ? Math.round(done / tot * 100) : 0) + "%";
}
function wireBodset(h) {
  h.querySelectorAll("[data-bstab]").forEach(b => b.onclick = () => { _bs.tab = b.dataset.bstab; render(); });
  const d = bsDraft();
  /* ---- ทำแบบประเมิน */
  h.querySelectorAll("input[data-bsa]").forEach(i => i.onchange = () => {
    d.a[i.dataset.bsa] = +i.value;
    const row = i.closest(".as-eit"); row.classList.add("done"); row.classList.remove("miss");
    row.querySelectorAll("label").forEach(l => l.classList.toggle("on", l.contains(i))); bsProg(h);
  });
  h.querySelectorAll("[data-bscm]").forEach(t => t.oninput = () => { d.cm[t.dataset.bscm] = t.value.slice(0, 1000); });
  const ro = h.querySelector("#bsRole"); if (ro) ro.onchange = () => { d.role = ro.value; render(); };
  const cm = h.querySelector("#bsCmte"); if (cm) cm.onchange = () => { d.cmte = cm.value; };
  const fy = h.querySelector("#bsFy"); if (fy) fy.oninput = () => { d.fy = fy.value.replace(/\D/g, "").slice(0, 4); };
  const cd = h.querySelector("#bsClearDraft"); if (cd) cd.onclick = () => plAsk(cd, "ล้างคำตอบที่กรอกไว้?", () => { d.a = {}; d.cm = {}; render(); });
  const sb = h.querySelector("#bsSubmit"); if (sb) sb.onclick = () => {
    const t = bsTpl(), dims = bsActive(t), miss = dims.flatMap(x => x.items).filter(i => typeof d.a[i.id] !== "number");
    const fyv = bsFY(d.fy);
    if (!/^\d{4}$/.test(fyv)) { toast("ระบุปีที่ประเมิน (พ.ศ. 4 หลัก)"); const f = h.querySelector("#bsFy"); if (f) f.focus(); return; }
    if (miss.length) {
      miss.forEach(i => { const r = h.querySelector("#bsI" + CSS.escape(i.id)); if (r) r.classList.add("miss"); });
      const m = h.querySelector("#bsMsg"); if (m) m.textContent = `ยังไม่ได้ตอบ ${miss.length} ข้อ`;
      const f = h.querySelector("#bsI" + CSS.escape(miss[0].id)); if (f) f.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast(`กรุณาตอบให้ครบทุกข้อ (ขาด ${miss.length} ข้อ)`);
    }
    const ev = { id: plId(), at: asNow(), ticker: S.t, fy: fyv, role: d.role, cmte: d.role === "cmte" ? d.cmte : "", tplId: t.id, tplName: t.name, scale: t.scale,
      dims: dims.map(x => ({ name: x.name, oi: !!x.oi, comment: (d.cm[x.id] || "").trim(), items: x.items.map(i => ({ t: i.t, v: d.a[i.id] })) })) };
    BSE.evals.push(ev); bseSave();
    _bs.draft = null; _bs.tab = "res"; _bs.view = ev.id;
    toast("บันทึกผลการประเมินแล้ว");
    const r = bsCalc(ev);
    asSubmit("bodset", ev.ticker, Object.assign({}, ev, { result: { overall: r.mean, pct: r.pct, dims: r.dims.map(x => ({ name: x.name, mean: x.mean, pct: x.pct })) } }))
      .then(ok => { if (ok) { ev.srv = true; bseSave(); if (S.view === "bodset") render(); } });
    render();
  };
  /* ---- ผลและประวัติ */
  h.querySelectorAll("[data-bsview]").forEach(b => b.onclick = () => { _bs.view = b.dataset.bsview; render(); const r = $("#bsRes"); if (r) r.scrollIntoView({ behavior: "smooth" }); });
  h.querySelectorAll("[data-bsdel]").forEach(b => b.onclick = () => plAsk(b, "ลบผลการประเมินครั้งนี้?", () => {
    BSE.evals = BSE.evals.filter(e => e.id !== b.dataset.bsdel); if (_bs.view === b.dataset.bsdel) _bs.view = null; bseSave(); render(); }));
  const fu = h.querySelector("#bsToFu"); if (fu) fu.onclick = () => {
    const ev = BSE.evals.find(e => e.id === _bs.view); if (!ev) return;
    bsCalc(ev).low.forEach(x => rpPlanAdd(`พัฒนาด้าน “${x.name}” (ผลประเมินตนเองของคณะกรรมการ ปี ${ev.fy} · ร้อยละ ${fmt(x.pct, 0)} ของคะแนนเต็ม)`, "BOD SET"));
  };
  const sm = h.querySelector("#bsSumBtn"); if (sm) sm.onclick = () => {
    const ev = BSE.evals.find(e => e.id === _bs.view); if (!ev) return;
    const txt = window.bodSetSummary(ev.ticker, ev.fy) || "";
    const o = h.querySelector("#bsSumOut");
    o.innerHTML = `<textarea class="inp pl-ta" id="bsSumTxt" rows="8" readonly style="margin-top:10px">${esc(txt)}</textarea>
      <div class="pl-tools"><button class="btn s" id="bsSumCopy">คัดลอก</button><span class="as-sm">ใช้แทน {{ผลประเมิน BOD}} ในร่าง 56-1 · ต้องผ่านการตรวจทานของเลขานุการบริษัท</span></div>`;
    o.querySelector("#bsSumCopy").onclick = () => plCopy(txt);
  };
  const csv = h.querySelector("#bsCsv"); if (csv) csv.onclick = () => {
    const rows = [["eval_id", "datetime", "ticker", "fy_be", "evaluator", "committee", "template", "scale", "dimension_no", "dimension", "item_no", "item", "score", "dimension_mean", "dimension_pct", "overall_mean", "overall_pct", "comment"]];
    BSE.evals.forEach(e => { const r = bsCalc(e);
      e.dims.forEach((dm, di) => dm.items.forEach((it, ii) => rows.push([e.id, e.at, e.ticker, e.fy, e.role, e.cmte, e.tplName, e.scale, di + 1, dm.name, `${di + 1}.${ii + 1}`, it.t, it.v,
        asR2(r.dims[di].mean), asR2(r.dims[di].pct), asR2(r.mean), asR2(r.pct), ii ? "" : dm.comment]))); });
    plDl(`ois_bod_set_${plBE()}.csv`, plCsv(rows), "text/csv;charset=utf-8");
  };
  /* ---- ตัวสร้าง */
  const ts = h.querySelector("#bsTplSel"); if (ts) ts.onchange = () => { BST.sel = ts.value; bstSave(); _bs.draft = null; render(); };
  const tn = h.querySelector("#bsTplName"); if (tn) tn.onchange = () => bsMutate(t => { t.name = tn.value.trim().slice(0, 120) || t.name; });
  const scl = h.querySelector("#bsScale"); if (scl) scl.onchange = () => bsMutate(t => { t.scale = scl.value; _bs.draft && (_bs.draft.a = {}); });
  h.querySelectorAll("[data-bsdon]").forEach(c => c.onchange = () => bsMutate(t => { const x = t.dims.find(z => z.id === c.dataset.bsdon); if (x) x.on = c.checked; }));
  h.querySelectorAll("[data-bsdname]").forEach(i => i.onchange = () => { const t = bsTpl(), x = t.dims.find(z => z.id === i.dataset.bsdname); if (x) { x.name = i.value.trim().slice(0, 120) || x.name; bstSave(); } });
  h.querySelectorAll("[data-bsit]").forEach(i => i.onchange = () => { const [di, ii] = i.dataset.bsit.split("|"), x = bsTpl().dims.find(z => z.id === di), it = x && x.items.find(z => z.id === ii);
    if (it) { it.t = i.value.trim().slice(0, 400) || it.t; bstSave(); } });
  h.querySelectorAll("[data-bsdmv]").forEach(b => b.onclick = () => { const [id, dd] = b.dataset.bsdmv.split("|"); bsMutate(t => bsMove(t.dims, t.dims.findIndex(z => z.id === id), +dd)); });
  h.querySelectorAll("[data-bsimv]").forEach(b => b.onclick = () => { const [di, ii, dd] = b.dataset.bsimv.split("|");
    bsMutate(t => { const x = t.dims.find(z => z.id === di); if (x) bsMove(x.items, x.items.findIndex(z => z.id === ii), +dd); }); });
  h.querySelectorAll("[data-bsddel]").forEach(b => b.onclick = () => { const x = bsTpl().dims.find(z => z.id === b.dataset.bsddel);
    plAsk(b, `ลบด้าน “${x ? x.name : ""}” และข้อคำถามทั้งหมดในด้านนี้?`, () => bsMutate(t => { t.dims = t.dims.filter(z => z.id !== b.dataset.bsddel); })); });
  h.querySelectorAll("[data-bsidel]").forEach(b => b.onclick = () => { const [di, ii] = b.dataset.bsidel.split("|");
    bsMutate(t => { const x = t.dims.find(z => z.id === di); if (x) x.items = x.items.filter(z => z.id !== ii); }); });
  h.querySelectorAll("[data-bsiadd]").forEach(b => b.onclick = () => { let nid = null;
    bsMutate(t => { const x = t.dims.find(z => z.id === b.dataset.bsiadd); if (x) { nid = plId(); x.items.push({ id: nid, t: "ข้อคำถามใหม่ — แก้ไขข้อความ" }); } });
    const el = nid && $(`[data-bsit$="|${nid}"]`); if (el) { el.focus(); el.select(); } });
  const da = h.querySelector("#bsDimAdd"); if (da) da.onclick = () => {
    const nm = (h.querySelector("#bsNewDim").value || "").trim(); if (!nm) { h.querySelector("#bsNewDim").focus(); return toast("พิมพ์ชื่อด้านใหม่ก่อน"); }
    bsMutate(t => t.dims.push({ id: plId(), name: nm.slice(0, 120), on: true, oi: false, items: [{ id: plId(), t: "ข้อคำถามใหม่ — แก้ไขข้อความ" }] })); toast(`เพิ่มด้าน “${nm}” แล้ว`);
  };
  const dup = h.querySelector("#bsTplDup"); if (dup) dup.onclick = () => { const n = bsSanitize(JSON.parse(JSON.stringify(bsTpl()))); n.name = bsTpl().name + " (สำเนา)"; BST.tpls.push(n); BST.sel = n.id; bstSave(); _bs.draft = null; render(); };
  const nw = h.querySelector("#bsTplNew"); if (nw) nw.onclick = () => { const n = bsDefaultTpl(); n.id = plId(); n.name = "Template ใหม่ " + (BST.tpls.length + 1); BST.tpls.push(n); BST.sel = n.id; bstSave(); _bs.draft = null; render(); };
  const del = h.querySelector("#bsTplDel"); if (del) del.onclick = () => plAsk(del, "ลบ Template นี้? (ผลที่บันทึกไว้แล้วไม่ถูกลบ)", () => {
    BST.tpls = BST.tpls.filter(t => t.id !== BST.sel); BST.sel = BST.tpls[0].id; bstSave(); _bs.draft = null; render(); });
  const rs = h.querySelector("#bsTplReset"); if (rs) rs.onclick = () => plAsk(rs, "คืนด้านและข้อคำถามของ Template นี้เป็นค่าเริ่มต้น?", () => bsMutate(t => { const n = bsDefaultTpl(); t.dims = n.dims; t.scale = n.scale; }));
  const ex = h.querySelector("#bsTplExp"); if (ex) ex.onclick = () => { const t = bsTpl();
    plDl(`ois_bod_set_template.json`, JSON.stringify({ format: "ois-bodset-template-1", name: t.name, scale: t.scale, dims: t.dims.map(d => ({ name: d.name, on: d.on, oi: d.oi, items: d.items.map(i => i.t) })) }, null, 2)); };
  const im = h.querySelector("#bsTplImp"); if (im) im.onchange = async () => {
    const f = im.files && im.files[0]; if (!f) return;
    try { const n = bsSanitize(JSON.parse(await f.text())); if (!n || !n.dims.length) throw 0;
      BST.tpls.push(n); BST.sel = n.id; bstSave(); _bs.draft = null; toast(`นำเข้า “${n.name}” · ${n.dims.length} ด้าน`); render();
    } catch (e) { toast("ไฟล์ JSON ไม่ใช่รูปแบบ Template ที่รองรับ"); }
  };
}
/** ข้อความสำหรับตัวแทน {{ผลประเมิน BOD}} ในร่าง 56-1 — กระบวนการ + ผลรายด้าน (ระดับคณะ ไม่มีชื่อบุคคล) · null เมื่อไม่มีผล */
window.bodSetSummary = function (ticker, fy) {
  ticker = ticker || S.t;
  let E = BSE.evals.filter(e => e.ticker === ticker);
  /* ปีที่ขอไม่มีผล (เช่น ร่าง 56-1 ส่งปีบัญชีของข้อมูลมา แต่ประเมินในปีถัดไป) → ใช้ปีล่าสุดที่มี — ข้อความระบุปีที่ประเมินไว้ชัดเจน */
  const f = fy ? bsFY(fy) : "";
  if (f && E.some(e => e.fy === f)) E = E.filter(e => e.fy === f);
  else if (E.length) { const last = E.map(e => e.fy).sort().pop(); E = E.filter(e => e.fy === last); }
  if (!E.length) return null;
  const pick = r => E.filter(e => e.role === r);
  let base, how;
  if (pick("board").length) { base = [pick("board").pop()]; how = "คณะกรรมการประเมินตนเองแบบทั้งคณะ (board self-assessment)"; }
  else if (pick("indiv").length) { base = pick("indiv"); how = `กรรมการแต่ละท่านประเมินตนเอง แล้วเลขานุการบริษัทรวบรวมเป็นภาพรวม (${base.length} แบบประเมิน) โดยผลรายบุคคลเป็นความลับ`; }
  else { base = [pick("cmte").pop()]; how = `${base[0].cmte || "คณะกรรมการชุดย่อย"}ประเมินตนเองทั้งคณะ`; }
  const ev0 = base[base.length - 1], sc = BS_SCALES[ev0.scale] || BS_SCALES["0-4"];
  /* รวมรายด้านตามชื่อด้าน (กรณีรายบุคคลหลายแบบ) */
  const agg = {};
  base.forEach(e => bsCalc(e).dims.forEach(d => { (agg[d.name] = agg[d.name] || []).push(d.mean); }));
  const dims = Object.entries(agg).map(([name, ms]) => { const m = plMean(ms); return { name, mean: m, pct: (m - sc.lo) / (sc.hi - sc.lo) * 100 }; });
  const all = plMean(base.map(e => bsCalc(e).mean)), allPct = (all - sc.lo) / (sc.hi - sc.lo) * 100;
  const ord = dims.slice().sort((a, b) => b.pct - a.pct), top = ord.slice(0, 2), low = ord.slice(-2).reverse().filter(d => !top.includes(d));
  const scaleTxt = `มาตราส่วน ${sc.lo}–${sc.hi} (${sc.lo} = ${sc.labs[0]} ถึง ${sc.hi} = ${sc.labs[sc.labs.length - 1]})`;
  return `ในปี ${ev0.fy} ${how} โดยใช้แบบประเมินที่ปรับจากแนวทางแบบประเมินตนเองของคณะกรรมการของตลาดหลักทรัพย์แห่งประเทศไทย ครอบคลุม ${dims.length} ด้าน ได้แก่ ` +
    dims.map((d, i) => `(${i + 1}) ${d.name}`).join(" ") + ` ใช้${scaleTxt} เลขานุการบริษัทเป็นผู้รวบรวมและสรุปผลเสนอต่อคณะกรรมการเพื่อพิจารณาร่วมกัน` +
    `\nผลการประเมินโดยรวมเฉลี่ย ${fmt(all, 2)} จาก ${sc.hi} คะแนน (ร้อยละ ${fmt(allPct, 1)}) ผลรายด้าน: ` +
    dims.map(d => `${d.name} ร้อยละ ${fmt(d.pct, 1)}`).join(" · ") +
    `\nด้านที่ได้ผลสูง ได้แก่ ${top.map(d => d.name).join(" และ ") || "—"} ส่วนด้านที่คณะกรรมการกำหนดเป็นแนวทางพัฒนา ได้แก่ ${low.map(d => d.name).join(" และ ") || "—"}` +
    ` ทั้งนี้ ผลการประเมินเป็นภาพรวมระดับคณะ ไม่มีการเปิดเผยหรือให้คะแนนกรรมการรายบุคคล`;
};

/* ============================================================================
   ลงทะเบียนหน้า · เมนู · คู่มือ
   ============================================================================ */
VIEWS.rfq = viewRfq; VIEWS.dict = viewDict; VIEWS.bodset = viewBodset;
if (typeof WIRES2 === "object" && WIRES2) Object.assign(WIRES2, { rfq: wireRfq, dict: wireDict, bodset: wireBodset });
(() => {
  const add = (it, afterId, fallbackG) => {
    if (NAV.some(n => n.id === it.id)) return;
    const i = NAV.findIndex(n => n.id === afterId);
    if (i >= 0) NAV.splice(i + 1, 0, it); else NAV.push(Object.assign(it, { g: fallbackG }));
  };
  add({ id: "rfq", g: 1, ico: "◐", lab: "แบบประเมิน CEO Regulatory Focus (RFQ)" }, "docs", 1);
  add({ id: "dict", g: 1, ico: "Aa", lab: "Dictionary ของผู้ใช้ (คำนวณ Promotion Focus)" }, "rfq", 1);
  /* แบบประเมินตนเองของบอร์ดอยู่ในกลุ่ม Pilot ก่อนชุดคำถามเสริม OI-1…6 */
  const bi = NAV.findIndex(n => n.id === "bod"), it = { id: "bodset", g: 4, ico: "☷", lab: "แบบประเมินตนเองของคณะกรรมการ (SET)" };
  if (!NAV.some(n => n.id === "bodset")) { if (bi >= 0) NAV.splice(bi, 0, it); else NAV.push(it); }
})();
if (typeof MAN_HELP === "object" && MAN_HELP) Object.assign(MAN_HELP, { rfq: "man-pilot", dict: "man-pilot", bodset: "man-pilot" });
buildNav();
if (S.user) syncNavLocks();
/* คืนหน้าที่เปิดค้างไว้ (ไฟล์ก่อนหน้าตรวจ VIEWS ก่อนที่หน้านี้จะลงทะเบียน) */
(() => {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null"), vw = o && o.vw;
    if (S.user && vw && ["rfq", "dict", "bodset"].includes(vw) && S.view !== vw) {
      S.view = vw; $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + vw)); syncNavLocks(); render();
    } else if (S.user && ["rfq", "dict", "bodset"].includes(S.view)) render();
  } catch (e) { }
})();
