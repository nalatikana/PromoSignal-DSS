/* OpenInnoScore 2.3 · ขอบเขต MVP1: ชุดข้อมูล/Data Dictionary, Evidence Pack, Structured Data 56-1, ใบเสร็จตัวอย่าง */
/* ============================================================================
   v2_mvp.js — แก้ไขครั้งที่ 2.3 (โหลดเป็นไฟล์สุดท้าย)
     1 หน้า "ชุดข้อมูลและ Data Dictionary" (#v-datasets) — 3 ชุดข้อมูล · Data Dictionary (DV/IV/MV/CV) ตามงานวิจัย ·
       ฟิลด์ที่ผู้ใช้เพิ่มเอง (Phase II UX) · นำเข้า JSON (SET Smart Marketplace · One Report Structured Data — โครงร่างสมมติ)
     2 หน้า "Evidence Pack" (#v-evidence) — งานวิจัย §4.7: รวมทุกอย่างที่แสดงสำหรับแฟ้มการตัดสินใจ · พิมพ์ / .md / JSON · Pro ขึ้นไป
     3 ใบเสร็จตัวอย่างเมื่อเติมเครดิต (จำลองการชำระเงิน · ไม่ใช่ใบเสร็จ/ใบกำกับภาษีจริง)
   กติกา: ถ้อยคำเชิงความสัมพันธ์ · ไม่แสดงค่าสัมประสิทธิ์ · ไม่ใช้ window.alert/confirm/prompt · ใช้ esc() กับข้อความทุกจุด
   ============================================================================ */
const MV_LS = { uf: "ois_userfields_v1", imp: "ois_imports_v1", rc: "ois_receipts_v1" };
const mvLoad = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (e) { return d; } };
const mvStore = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const mvNow = () => new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
function mvDl(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([(/json|csv|markdown|plain/.test(type || "") ? "" : "") + text], { type: type || "text/plain;charset=utf-8" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function mvPrint(cls) {
  document.body.classList.add(cls);
  const off = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", off); };
  window.addEventListener("afterprint", off);
  try { window.print(); } finally { setTimeout(off, 1500); }
}
const mvSum = (fn, ...a) => typeof mvSummaryText === "function" ? mvSummaryText(fn, ...a) : "";
const mvRank = () => typeof tierRank === "function" ? tierRank() : 0;
const mvCanSee = t => typeof canSeeCo === "function" ? canSeeCo(t) : true;

/* ============================================================================
   1 · ชุดข้อมูลและ Data Dictionary
   ============================================================================ */
/** หัวข้อของแบบ 56-1 One Report ที่วงไว้ในขอบเขตงาน */
const S561 = {
  p1_1: "ส่วนที่ 1 ข้อ 1 · โครงสร้างและการดำเนินงานของกลุ่มบริษัท",
  p1_4: "ส่วนที่ 1 ข้อ 4 · การวิเคราะห์และคำอธิบายของฝ่ายจัดการ (MD&A)",
  p1_5: "ส่วนที่ 1 ข้อ 5 · ข้อมูลทั่วไปและข้อมูลสำคัญอื่น",
  p2_7: "ส่วนที่ 2 ข้อ 7 · โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ",
  p2_8: "ส่วนที่ 2 ข้อ 8 · รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ",
  p3: "ส่วนที่ 3 · งบการเงิน",
  msg: "สารจากประธานกรรมการ / CEO (ภาษาอังกฤษ · ส่วนต้นของรายงาน)",
  att1: "เอกสารแนบ 1 · รายละเอียดกรรมการ ผู้บริหาร",
};
/** Data Dictionary — สรุปจาก Data Dictionary ของ REF-928 (JSM Model 3, edit6) และงานวิจัย §3.2 · ไม่มีค่าเฉลี่ย/จุดตัด/สัมประสิทธิ์
 *  [ตัวแปร, บทบาท, นิยาม, ที่มาใน 56-1, หน่วย, การ coding, winsorise, ใช้ในคะแนน] */
const DD_ROWS = [
  ["open_innov", "DV", "จำนวนรายการนวัตกรรม (สินค้า/บริการ/กระบวนการใหม่หรือปรับปรุงอย่างมีนัย) ที่พัฒนาร่วมกับภายนอก (collaborative open innovation) ในปีผลลัพธ์ t", "p1_1|p1_4", "รายการ/ปี", "นับจากรายงานปี t · 0 = ทบทวนแล้วไม่พบ", "ไม่ (ค่านับดิบ)", "val"],
  ["ceo_promotion", "IV", "ร้อยละของคำในสารถึงผู้ถือหุ้นภาษาอังกฤษที่ตรงพจนานุกรม promotion focus (LIWC-22) · ตัวแปรต้นของ H1", "msg", "% ของจำนวนคำ", "ต่อเนื่อง · วัดจากรายงานปี t − 1", "ใช่ (5/95) แล้ว mean-centre", "yes"],
  ["bod_female", "MV", "สัดส่วนกรรมการหญิง = จำนวนกรรมการหญิง ÷ จำนวนกรรมการทั้งหมด ณ วันอ้างอิงเดียวกัน · H4 · Tier 1 (คันโยก · ทนต่อ FE)", "p2_7|att1", "สัดส่วน 0–1", "นับจากรายชื่อกรรมการ", "ใช่ (5/95) แล้ว mean-centre", "yes"],
  ["bod_family", "MV", "สัดส่วนกรรมการที่มีนามสกุลเดียวกับกลุ่มนามสกุลที่ถือหุ้นรวม ≥ 30% · H2 · Tier 2 (ข้อมูลบริบท R6 · ไม่ทน FE)", "p2_7|p1_1", "สัดส่วน 0–1", "รายชื่อผู้ถือหุ้นใหญ่ + รายชื่อกรรมการ ณ วันอ้างอิงเดียวกัน", "ใช่ (5/95) แล้ว mean-centre", "yes"],
  ["bod_politicalties", "MV", "1 เมื่อมีกรรมการอย่างน้อย 1 คนที่มียศทหาร/ตำรวจ หรือดำรง/เคยดำรงตำแหน่งตามเกณฑ์ PEP ของ ปปง. · H3 · Tier 2 (ข้อมูลบริบท R6 · ไม่ทน FE)", "p2_7|att1", "0/1", "1 = (bod_military + bod_political) ≥ 1", "ไม่ (mean-centre เท่านั้น)", "yes"],
  ["bod_military · bod_political", "MV (input)", "จำนวนกรรมการที่มียศทหาร/ตำรวจ · จำนวนกรรมการในตำแหน่งตามเกณฑ์ PEP ของ ปปง. — ใช้สร้าง bod_politicalties", "p2_7|att1", "คน", "นับจากประวัติกรรมการ", "ไม่", "no"],
  ["bod_tenure", "MV", "ค่าเฉลี่ยจำนวนปีที่กรรมการแต่ละคนดำรงตำแหน่ง · H5 · Tier 3 (ปิดด้วย evidence gate g_T = 0)", "p2_7|att1", "ปี", "ต่อเนื่อง", "ใช่ (5/95)", "no"],
  ["board_size", "CV", "จำนวนกรรมการทั้งหมด ณ วันอ้างอิง · ตัวหารของสัดส่วนบอร์ด · ใช้ตรวจ critical mass (≥ 3 คน)", "p2_7", "คน", "3–18 ใน REF-928", "ไม่", "aux"],
  ["board_indep_ratio", "CV", "กรรมการอิสระ ÷ กรรมการทั้งหมด", "p2_7", "สัดส่วน", "ต่อเนื่อง", "ใช่ (5/95)", "ctl"],
  ["ceo_duality", "CV", "1 ถ้า CEO เป็นกรรมการบริษัทด้วย", "p2_7|att1", "0/1", "ตามนิยาม Table S1 ของงานวิจัย", "ไม่", "ctl"],
  ["ceo_age · ceo_tenure", "CV", "อายุ CEO · จำนวนปีในตำแหน่ง CEO", "p2_7|att1", "ปี", "ต่อเนื่อง", "ใช่ (5/95)", "ctl"],
  ["female_ceo", "CV", "1 ถ้า CEO เป็นผู้หญิง", "p2_7|att1", "0/1", "", "ไม่", "ctl"],
  ["ln_assets (firm size)", "CV", "ลอการิทึมธรรมชาติของสินทรัพย์รวม", "p3", "ln(บาท)", "LN(total_assets)", "ใช่ (5/95)", "ctl"],
  ["ROA · de_ratio · current_ratio · ebitda_m", "CV", "ผลตอบแทนต่อสินทรัพย์ · หนี้สินต่อทุน · อัตราส่วนเงินทุนหมุนเวียน · อัตรากำไร EBITDA", "p3|p1_4", "% / เท่า / สัดส่วน", "จากงบการเงิน", "ใช่ (5/95)", "ctl"],
  ["ln_firmage", "CV", "ลอการิทึมอายุบริษัทนับจากปีจดทะเบียนจัดตั้ง", "p1_5", "ln(ปี)", "LN(firm_age)", "ใช่ (5/95)", "ctl"],
  ["industry", "CV (FE)", "กลุ่มอุตสาหกรรม SET นอกกลุ่มการเงิน 1–7 (ตัวแปรหุ่นอุตสาหกรรม)", "p1_1|p1_5", "หมวด 1–7", "การจัดกลุ่มของ SET", "—", "ctl"],
  ["outcome-year dummies", "CV (FE)", "ตัวแปรหุ่นปีผลลัพธ์ 2020–2024", "", "0/1", "", "—", "ctl"],
  ["B_EG · OIS · OIS_ind · tier · quadrant", "Output", "Signal B = cP × amp · เปอร์เซ็นไทล์ mid-rank เทียบ REF-928 (ทั้งฐาน / ในอุตสาหกรรม) · Tier ควอร์ไทล์ · quadrant A–D", "", "0–100 / 1–4 / A–D", "คำนวณในชั้นประมวลผล", "—", "out"],
];
const DD_USE = { yes: ["ใช้ใน Signal B", "ok"], aux: ["ไม่เข้าสูตร · ใช้แปลงเป็นสัดส่วน/ตรวจ critical mass", "blue"], ctl: ["อยู่ในแบบจำลองวิจัย (ควบคุม) · ไม่อยู่ในคะแนน", "mute"],
  val: ["ใช้ตรวจ validity (ผลลัพธ์)", "warn"], no: ["ไม่ใช้ในคะแนน", "mute"], out: ["ผลลัพธ์ของเครื่องมือ", "blue"] };
const UF_TYPES = ["ตัวเลข", "ข้อความ", "0/1 (ใช่/ไม่ใช่)", "วันที่"];
const UF_ROLES = ["CV (ตัวแปรควบคุม)", "อื่นๆ"];
const UF = mvLoad(MV_LS.uf, []);                     // [{ id, name, type, src, role, desc, vals: { ticker: value } }]
const IMP = mvLoad(MV_LS.imp, []);                   // ประวัติการนำเข้า JSON
let _smText = "", _smRes = null;

/* ---------------- นำเข้า JSON · ชั้นแปลงฟิลด์ (mapping layer) — โครงร่างสมมติ รอ Data Specification ของ SET */
const SM_NOTE = "โครงร่างสมมติ — รอ Data Specification ของ SET";
const SM_BOARD = "part2.section7_corporateGovernanceStructure.boardOfDirectors";
const SM_MAP = [
  { to: "ticker", l: "ชื่อย่อหลักทรัพย์", paths: ["symbol", "companyInfo.symbol"] },
  { to: "fy", l: "ปีบัญชี (ค.ศ.)", paths: ["fiscalYear", "period.fiscalYear"] },
  { to: "bsize", l: "จำนวนกรรมการทั้งหมด → Zone A", paths: [SM_BOARD + ".totalDirectors"], derive: d => d.length },
  { to: "nf", l: "จำนวนกรรมการหญิง → สัดส่วนกรรมการหญิง", paths: [SM_BOARD + ".femaleDirectors"], derive: d => d.filter(x => /^(f|female|หญิง)$/i.test(String(x.gender || ""))).length },
  { to: "nfam", l: "จำนวนกรรมการครอบครัว → สัดส่วนกรรมการครอบครัว", paths: [SM_BOARD + ".familyDirectors"], derive: d => d.filter(x => x.familyOfMajorShareholder === true).length },
  { to: "pol", l: "political ties (0/1) → Zone A", paths: [SM_BOARD + ".politicalTiesFlag"], derive: d => d.some(x => x.militaryOrPoliceRank === true || x.politicallyExposedPerson === true) ? 1 : 0 },
  { to: "ten", l: "อายุงานเฉลี่ยของกรรมการ (ปี)", paths: [SM_BOARD + ".averageTenureYears"], derive: d => { const t = d.map(x => +x.tenureYears).filter(isFinite); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : undefined; } },
  { to: "letter", l: "สารถึงผู้ถือหุ้น (ภาษาอังกฤษ) → วิเคราะห์ภาษา CEO", paths: ["reportFront.messageToShareholders.text", "messageFromChairman.text"] },
];
const smGet = (o, p) => p.split(".").reduce((a, k) => a && typeof a === "object" ? a[k] : undefined, o);
function smSample(c) {
  const n = c.bsize || 11, nf = Math.round(c.fem * n), nfam = Math.round(c.fam * n);
  const dirs = Array.from({ length: n }, (_, i) => ({ seat: "D" + String(i + 1).padStart(2, "0"), gender: i < nf ? "F" : "M",
    independent: i % 3 === 0, familyOfMajorShareholder: i >= n - nfam, militaryOrPoliceRank: false, politicallyExposedPerson: !!c.pol && i === 1,
    tenureYears: Math.round((c.ten || 8) * 10) / 10 }));
  return {
    _comment: SM_NOTE + " · ตัวอย่างนี้สร้างจากค่าในฐานข้อมูลต้นแบบของบริษัทที่เลือก ไม่มีชื่อบุคคล",
    dataset: "SET Smart Marketplace · One Report Structured Data (โครงร่างสมมติ)", symbol: c.t, fiscalYear: c.fy || FY_SHOWN,
    part2: { section7_corporateGovernanceStructure: { boardOfDirectors: { totalDirectors: n, femaleDirectors: nf, familyDirectors: nfam,
      independentDirectors: dirs.filter(d => d.independent).length, politicalTiesFlag: c.pol ? 1 : 0, averageTenureYears: Math.round((c.ten || 8) * 10) / 10, directors: dirs } } },
    reportFront: { messageToShareholders: { language: "en", text: SAMPLE } },
  };
}
function smParse(txt) {
  let o; try { o = JSON.parse(txt); } catch (e) { return { err: "อ่าน JSON ไม่ได้ — " + e.message }; }
  if (!o || typeof o !== "object") return { err: "JSON ต้องเป็น object" };
  const dirs = smGet(o, SM_BOARD + ".directors");
  const rows = SM_MAP.map(m => {
    let v, from = "";
    for (const p of m.paths) { const x = smGet(o, p); if (x !== undefined && x !== null && x !== "") { v = x; from = p; break; } }
    if (v === undefined && m.derive && Array.isArray(dirs) && dirs.length) { v = m.derive(dirs); from = SM_BOARD + ".directors[] (คำนวณ)"; }
    return { to: m.to, l: m.l, v, from };
  });
  const g = k => (rows.find(r => r.to === k) || {}).v;
  const t = String(g("ticker") || "").toUpperCase().trim(), co = byT[t];
  const errs = [];
  if (!t) errs.push("ไม่พบชื่อย่อหลักทรัพย์ (symbol)");
  else if (!co) errs.push(`ไม่พบ ${t} ในชุดให้คะแนนของต้นแบบ (${COMPS.length} บริษัท)`);
  const n = +g("bsize");
  if (g("bsize") !== undefined && !(n >= 1)) errs.push("จำนวนกรรมการทั้งหมดไม่ถูกต้อง");
  ["nf", "nfam"].forEach(k => { if (g(k) !== undefined && (+g(k) < 0 || +g(k) > n)) errs.push(`${k === "nf" ? "จำนวนกรรมการหญิง" : "จำนวนกรรมการครอบครัว"} ต้องอยู่ระหว่าง 0 ถึงจำนวนกรรมการทั้งหมด`); });
  return { o, rows, t, co, errs };
}
function smApply(r) {
  if (!r || r.errs.length || !r.co) return toast("แก้ข้อผิดพลาดก่อนนำเข้า");
  if (!mvCanSee(r.t)) return toast(`ระดับสิทธิ์ปัจจุบันยังดูข้อมูลของ ${r.t} ไม่ได้ — นำเข้าได้เฉพาะบริษัทที่เปิดสิทธิ์แล้ว`);
  const g = k => (r.rows.find(x => x.to === k) || {}).v;
  S.t = r.t; S.peers = []; S.wi = null;
  const sc = $("#selCo");
  if (sc && ![...sc.options].some(o => o.value === r.t)) { S.ind = "all"; if ($("#selInd")) $("#selInd").value = "all"; fillCompanies(); }
  if (sc) sc.value = r.t;
  const n = Math.round(+g("bsize")), done = [];
  if (n >= 1) { setOv("bsize", n); done.push(`กรรมการ ${n} คน`); }
  if (n >= 1 && g("nf") !== undefined) { setOv("fem", clamp(+g("nf") / n, 0, 1)); done.push(`หญิง ${+g("nf")} คน`); }
  if (n >= 1 && g("nfam") !== undefined) { setOv("fam", clamp(+g("nfam") / n, 0, 1)); done.push(`ครอบครัว ${+g("nfam")} คน`); }
  if (g("pol") !== undefined) { setOv("pol", +g("pol") ? 1 : 0); done.push(`political ties ${+g("pol") ? 1 : 0}`); }
  if (isFinite(+g("ten")) && g("ten") !== undefined) setOv("ten", clamp(+g("ten"), 0, 40));
  IMP.unshift({ at: mvNow(), t: r.t, fy: g("fy") || null, fields: done.length + (g("letter") ? 1 : 0), src: "JSON · One Report Structured Data (โครงร่างสมมติ)" });
  IMP.splice(20); mvStore(MV_LS.imp, IMP);
  _smRes = Object.assign({}, r, { applied: done });
  save(); syncChrome();
  const txt = String(g("letter") || "");
  if (txt.trim() && typeof analyseDoc === "function") analyseDoc(txt.slice(0, 120000), "JSON · สารถึงผู้ถือหุ้น (" + r.t + ")");   // render() อยู่ในนี้
  else render();
  toast(`นำเข้าแล้ว · ${r.t} · ${done.join(" · ")}${txt.trim() ? " · วิเคราะห์ภาษา CEO แล้ว" : ""}`);
}

function viewDatasets() {
  const c = cur(), nk = OIS.nk928 || [], edited = Object.keys(S.ov || {}).filter(t => isEdited(t));
  const inD = COMPS.filter(x => inDomainOf(x.ind)).length;
  let pl = null; try { pl = JSON.parse(localStorage.getItem("ois_pilot_v1") || "null"); } catch (e) { }
  const svN = pl && pl.survey && Array.isArray(pl.survey.resp) ? pl.survey.resp.length : 0;
  const rfq = mvSum("rfqSummary", c.t), bset = mvSum("bodSetSummary", c.t, c.fy || FY_SHOWN);
  const srv = !!(window.OIS_API && typeof window.OIS_API.submit === "function");
  const src = k => String(k || "").split("|").filter(Boolean).map(x => `<span class="mv-src">${esc(S561[x] || x)}</span>`).join("") || `<span class="mv-sub">—</span>`;
  const ds = `<div class="grid g3 mv-ds" style="margin-bottom:14px">
    <div class="card"><div class="mv-dsh"><b>①</b> ชุดอ้างอิง REF-928 <span class="pill ok">freeze แล้ว</span></div>
      <div class="mv-big">928 <span>บริษัท-ปี</span></div>
      <ul class="mv-ul"><li>209 บริษัท · ปีตัวแปร 2019–2023 (ผลลัพธ์ 2020–2024) · SET นอกกลุ่มการเงิน 7 อุตสาหกรรม</li>
        <li>รุ่น <code>${esc(OIS.version)}</code> · ใช้ fit แบบจำลองและเป็นฐานเปอร์เซ็นไทล์ — <b>ห้ามแก้ไข</b> (ขอบเขตงานข้อ 1)</li>
        <li>รายอุตสาหกรรม: ${Object.keys(IND).map((k, i) => `${esc(IND[k])} ${nk[i] ?? "—"}`).join(" · ")}</li>
        <li>เบราว์เซอร์เห็นเฉพาะการกระจายแบบไม่ระบุชื่อ — ไม่มีชื่อบริษัท/กรรมการในชุดนี้</li></ul></div>
    <div class="card"><div class="mv-dsh"><b>②</b> ชุดให้คะแนน · บริษัทจดทะเบียน <span class="pill blue">ปีบัญชี ${FY_SHOWN + 543}</span></div>
      <div class="mv-big">${COMPS.length} <span>บริษัท</span></div>
      <ul class="mv-ul"><li>ภาพตัดขวางปีบัญชี ${FY_SHOWN} ที่แสดงในทุกหน้า · ในกลุ่มอ้างอิง ${inD} บริษัท</li>
        <li>รายอุตสาหกรรม: ${Object.keys(IND).map(k => `${esc(IND[k])} ${indComps(+k).length}`).join(" · ")}</li>
        <li>คะแนนทุกบริษัทเทียบกับชุด ① (ไม่ใช่เทียบกันเอง) · ข้อมูลจาก 56-1 One Report / รายงานประจำปี</li></ul></div>
    <div class="card"><div class="mv-dsh"><b>③</b> ชุดข้อมูลผู้ใช้ / Pilot <span class="pill ${srv ? "ok" : "mute"}">${srv ? "ฐานข้อมูลเซิร์ฟเวอร์" : "เก็บในเบราว์เซอร์นี้"}</span></div>
      <div class="mv-big">${edited.length} <span>บริษัทที่แก้ค่าใน Zone A</span></div>
      <ul class="mv-ul"><li>ค่าป้อน Zone A (บอร์ด · ภาษา CEO · LIWC-22) · เอกสารที่วิเคราะห์ ${(S.docs || []).length} ไฟล์ (บริษัทที่เลือก)</li>
        <li>นำเข้า JSON ${IMP.length} ครั้ง · ฟิลด์ที่ผู้ใช้เพิ่ม ${UF.length} ฟิลด์</li>
        <li>RFQ: ${rfq ? "มีผลของ " + esc(c.t) : "ยังไม่มีผลของ " + esc(c.t)} · แบบประเมินตนเองของคณะกรรมการ (SET): ${bset ? "มีผล" : "ยังไม่มีผล"} · แบบสอบถาม Pilot ${svN} ชุด</li>
        <li>ไม่ถูกนำไปปรับแบบจำลองหรือชุด ① — ใช้กับการคำนวณของผู้ใช้เท่านั้น</li></ul>
      <button class="btn g" id="mvDsExport" style="margin-top:8px">ส่งออกชุดข้อมูลผู้ใช้ (JSON)</button></div>
  </div>`;
  const imp = `<div class="card" style="margin-bottom:14px"><h3>Import รายงานประจำปี → Dataset (ขอบเขตข้อ 2.1)</h3>
    <div class="tw"><table class="mv-ptbl"><thead><tr><th>กลุ่มตัวแปร</th><th>ที่มาในรายงาน</th><th>สถานะในต้นแบบ</th></tr></thead><tbody>
      <tr><td><b>IV</b> · ภาษา CEO</td><td>${src("msg")}</td><td><span class="pill ok">ทำได้แล้ว</span> อัปโหลด PDF/TXT ใน Zone A → นับคำในเบราว์เซอร์ · ส่งออก .txt ไป LIWC-22 แล้วกรอกค่ากลับได้</td></tr>
      <tr><td><b>MV / CV</b> · องค์ประกอบบอร์ด</td><td>${src("p2_7|att1")}</td><td><span class="pill warn">กรอก/นำเข้า</span> กรอกจำนวนคนใน Zone A หรือนำเข้า JSON ด้านล่าง · อ่านตารางกรรมการจาก PDF อัตโนมัติ = Phase II</td></tr>
      <tr><td><b>CV</b> · การเงิน / ข้อมูลทั่วไป</td><td>${src("p3|p1_4|p1_5")}</td><td><span class="pill mute">Phase II</span> ไม่จำเป็นต่อคะแนน (คะแนนใช้เฉพาะ cP × amp) · เตรียมช่องผ่านฟิลด์ที่ผู้ใช้เพิ่มเอง</td></tr>
      <tr><td><b>DV</b> · open innovation</td><td>${src("p1_1|p1_4")}</td><td><span class="pill mute">งานวิจัย</span> นับด้วยมือตามคู่มือ coding · ใช้ตรวจ validity เท่านั้น</td></tr>
    </tbody></table></div>
    <div class="gx-row" style="margin-top:10px"><button class="btn p" data-goto="docs">ไปที่ Zone A · อัปโหลดรายงานประจำปี</button></div></div>`;
  const dd = `<div class="card" style="margin-bottom:14px" id="mvDict"><h3>Data Dictionary · REF-928 (ตามงานวิจัย)</h3>
    <p class="desc">บทบาท: DV = ตัวแปรตาม · IV = ตัวแปรต้น · MV = ตัวแปรกำกับ (moderator) · CV = ตัวแปรควบคุม · winsorise ที่ percentile 5/95 ของ REF-928 ·
      ไม่แสดงค่าเฉลี่ย จุดตัด หรือสัมประสิทธิ์ (อยู่ใน parameter record) · รายละเอียดตัวแปรควบคุมเป็นไปตามงานวิจัย (Model 3)</p>
    <div class="tw"><table class="mv-dd"><thead><tr><th>ตัวแปร</th><th>บทบาท</th><th>นิยาม</th><th>ที่มาใน 56-1 One Report</th><th>หน่วย</th><th>การ coding</th><th>winsorise</th><th>ใช้ในคะแนน?</th></tr></thead>
      <tbody>${DD_ROWS.map(r => `<tr><td><code>${esc(r[0])}</code></td><td><span class="mv-role r-${esc(r[1].split(" ")[0])}">${esc(r[1])}</span></td><td>${esc(r[2])}</td>
        <td>${src(r[3])}</td><td>${esc(r[4])}</td><td>${esc(r[5] || "—")}</td><td>${esc(r[6])}</td><td><span class="pill ${DD_USE[r[7]][1]}">${esc(DD_USE[r[7]][0])}</span></td></tr>`).join("")}
      ${UF.map(f => `<tr class="mv-ufrow"><td><code>${esc(f.name)}</code></td><td><span class="mv-role">${esc(f.role)}</span></td><td>${esc(f.desc || "—")}</td><td>${src(f.src)}</td>
        <td>${esc(f.type)}</td><td>ผู้ใช้กำหนด</td><td>—</td><td><span class="pill warn">ยังไม่เข้าแบบจำลอง (Phase II)</span></td></tr>`).join("")}</tbody></table></div></div>`;
  const uf = `<div class="card" style="margin-bottom:14px" id="mvUf"><h3>เพิ่มฟิลด์เอง <span class="pill warn">ฟิลด์ที่เพิ่มยังไม่เข้าแบบจำลอง (Phase II)</span></h3>
    <p class="desc">ออกแบบ UX สำหรับ Phase II (ขอบเขตข้อ 2): ผู้ใช้เพิ่มฟิลด์ของตนเองเข้าชุดข้อมูล ③ ได้ · ฟิลด์เก็บในเครื่องนี้และแสดงใน Data Dictionary ·
      <b>ไม่เปลี่ยนสูตรหรือชุดอ้างอิงที่ freeze แล้ว</b> — การนำฟิลด์ใหม่เข้าแบบจำลองต้องผ่านการวิเคราะห์ซ้ำโดยทีมวิจัย</p>
    <div class="mv-ufform">
      <label>ชื่อฟิลด์<input class="inp" id="ufName" maxlength="60" placeholder="เช่น rd_expense_ratio"></label>
      <label>ชนิดข้อมูล<select class="sel" id="ufType">${UF_TYPES.map(t => `<option>${esc(t)}</option>`).join("")}</select></label>
      <label>หัวข้อที่มาใน 56-1<select class="sel" id="ufSrc">${Object.entries(S561).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
      <label>บทบาท<select class="sel" id="ufRole">${UF_ROLES.map(t => `<option>${esc(t)}</option>`).join("")}</select></label>
      <label class="wide">คำอธิบาย<input class="inp" id="ufDesc" maxlength="200" placeholder="นิยามและวิธีเก็บ"></label>
      <button class="btn p" id="ufAdd">+ เพิ่มฟิลด์</button></div>
    ${UF.length ? `<div class="tw" style="margin-top:10px"><table class="mv-ptbl"><thead><tr><th>ฟิลด์</th><th>ชนิด</th><th>บทบาท</th><th>ค่าของ ${esc(c.t)}</th><th></th></tr></thead><tbody>
      ${UF.map(f => `<tr><td><code>${esc(f.name)}</code></td><td>${esc(f.type)}</td><td>${esc(f.role)}</td>
        <td><input class="inp" data-ufval="${esc(f.id)}" value="${esc((f.vals || {})[c.t] ?? "")}" aria-label="ค่าของ ${esc(f.name)}" style="max-width:180px"></td>
        <td><button class="btn g" data-ufdel="${esc(f.id)}">ลบ</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="gx-sm" style="margin-top:8px">ยังไม่มีฟิลด์ที่ผู้ใช้เพิ่ม</p>`}</div>`;
  const r = _smRes;
  const json = `<div class="card" style="margin-bottom:14px" id="mvImp"><h3>นำเข้า JSON (รูปแบบ SET Smart Marketplace · One Report Structured Data) <span class="pill warn">${esc(SM_NOTE)}</span></h3>
    <p class="desc">ยังไม่มี Data Specification ของ SET ต้นแบบจึงมี<b>ชั้นแปลงฟิลด์ (mapping layer)</b> ที่อ่านโครงร่างตัวอย่างด้านล่าง แล้วเติมค่าลง Zone A
      (จำนวนกรรมการ · กรรมการหญิง/ครอบครัว → สัดส่วน · political ties · สารถึงผู้ถือหุ้น → วิเคราะห์ภาษา CEO) · เมื่อได้ Data Specification จริงจะแก้เฉพาะตาราง mapping</p>
    <textarea class="inp" id="smTxt" rows="7" spellcheck="false" placeholder='{"symbol": "...", "fiscalYear": 2023, "part2": {...}}'>${esc(_smText)}</textarea>
    <div class="gx-row" style="margin-top:8px"><button class="btn s" id="smSample">ใส่ JSON ตัวอย่าง (${esc(c.t)})</button>
      <button class="btn s" id="smFileBtn">เลือกไฟล์ .json</button><input type="file" id="smFile" accept=".json,application/json" style="display:none">
      <button class="btn p" id="smParse">ตรวจและแปลงฟิลด์</button></div>
    ${r ? `<div style="margin-top:10px">${r.err ? `<div class="note crit">${esc(r.err)}</div>` : `
      <div class="tw"><table class="mv-ptbl"><thead><tr><th>ฟิลด์ปลายทาง</th><th>พาธใน JSON</th><th>ค่า</th></tr></thead><tbody>
        ${r.rows.map(x => `<tr><td>${esc(x.l)}</td><td><code>${esc(x.from || "—")}</code></td>
          <td>${x.v === undefined ? `<span class="pill mute">ไม่พบ</span>` : x.to === "letter" ? `${fmt(String(x.v).split(/\s+/).filter(Boolean).length)} คำ` : esc(typeof x.v === "number" ? fmt(x.v, Number.isInteger(x.v) ? 0 : 1) : x.v)}</td></tr>`).join("")}</tbody></table></div>
      ${r.errs.map(e => `<div class="note crit" style="margin-top:6px">${esc(e)}</div>`).join("")}
      ${r.applied ? `<div class="note ok" style="margin-top:8px"><b>เติมลง Zone A แล้ว</b> · ${esc(r.t)} · ${esc(r.applied.join(" · "))}
        <button class="btn s" data-goto="docs" style="margin-left:8px">เปิด Zone A</button></div>`
        : `<div class="gx-row" style="margin-top:8px"><button class="btn p" id="smApply"${r.errs.length ? " disabled" : ""}>เติมลง Zone A ของ ${esc(r.t || "—")}</button>
          <span class="gx-sm">ค่าที่นำเข้าแทนค่าในฐานข้อมูลต้นแบบเฉพาะในเครื่องนี้ (แก้หรือคืนค่าได้ใน Zone A)</span></div>`}`}</div>` : ""}
    ${IMP.length ? `<p class="gx-sm" style="margin-top:8px">นำเข้าล่าสุด: ${IMP.slice(0, 3).map(x => `${esc(x.t)} (${esc(x.at)})`).join(" · ")}</p>` : ""}</div>`;
  const lic = `<div class="card" style="margin-bottom:14px"><h3>เงื่อนไขบริการข้อมูล One Report ของ SET (SET Smart Marketplace)</h3>
    <div class="grid g2" style="gap:14px">
      <ul class="mv-ul"><li>ข้อมูลรายงานประจำปี (One Report) แบบมีโครงสร้าง: การประกอบธุรกิจและผลการดำเนินงาน · การกำกับดูแลกิจการ · งบการเงิน</li>
        <li>ข้อมูลย้อนหลังเริ่มตั้งแต่ปี 2564 · รับผ่าน API หรือดาวน์โหลดจาก SET Website ในรูปแบบ JSON</li>
        <li>ทดลองใช้บริการโดยไม่มีค่าใช้จ่ายในปี 2026</li></ul>
      <div class="tw"><table class="mv-ptbl"><thead><tr><th>ประเภทการใช้</th><th>ค่าบริการ (บาท / ข้อมูล 1 ปี / ครั้ง)</th></tr></thead><tbody>
        <tr><td>ใช้งานส่วนตัว / ภายในองค์กร</td><td>บุคคลธรรมดา 4,000 · นิติบุคคล 8,000</td></tr>
        <tr><td>เผยแพร่ต่อ (redistribution)</td><td>To be announced · ต้องทำสัญญาเผยแพร่ข้อมูลกับ SET แยกต่างหาก</td></tr></tbody></table></div>
    </div>
    <div class="note warn" style="margin-top:10px"><b>ข้อควรระวังเชิงสิทธิ์</b> — ระบบ SaaS ที่แสดงข้อมูลของ SET ให้ผู้ใช้หลายรายเข้าข่าย “เผยแพร่ต่อ” ซึ่งต้องมีสัญญากับ SET ก่อน ·
      ต้นแบบนี้ไม่เชื่อม API ของ SET และไม่ส่งข้อมูลใดให้ SET — การนำเข้า JSON ด้านบนเป็นไฟล์ที่ผู้ใช้ได้มาเองตามสิทธิ์ของผู้ใช้</div></div>`;
  return pageHead("ระบบและหลักฐาน", "ชุดข้อมูลและ Data Dictionary",
    "3 ชุดข้อมูลของระบบ · นิยามตัวแปรตามงานวิจัยพร้อมหัวข้อที่มาในแบบ 56-1 One Report · การนำเข้ารายงานประจำปีและ JSON · ออกแบบการเพิ่มฟิลด์เองสำหรับ Phase II")
    + (typeof algoStrip === "function" ? algoStrip(0) : "") + ds + imp + dd + json + uf + lic;
}
function wireDatasets(h) {
  if (typeof wireAlgo === "function") wireAlgo(h);
  const c = cur();
  const ta = h.querySelector("#smTxt"); if (ta) ta.oninput = () => { _smText = ta.value; };
  const parse = () => { _smText = ta ? ta.value : _smText; if (!_smText.trim()) { _smRes = { err: "ยังไม่มีข้อความ JSON" }; return render(); } _smRes = smParse(_smText); render();
    setTimeout(() => { const e = $("#mvImp"); if (e) e.scrollIntoView({ block: "start" }); }, 30); };
  const sb = h.querySelector("#smSample"); if (sb) sb.onclick = () => { _smText = JSON.stringify(smSample(c), null, 2); _smRes = null; render(); };
  const pb = h.querySelector("#smParse"); if (pb) pb.onclick = parse;
  const fb = h.querySelector("#smFileBtn"), fi = h.querySelector("#smFile");
  if (fb && fi) { fb.onclick = () => fi.click(); fi.onchange = async e => { const f = e.target.files[0]; if (!f) return;
    try { _smText = await f.text(); _smRes = smParse(_smText); } catch (er) { _smRes = { err: "อ่านไฟล์ไม่สำเร็จ — " + er.message }; } render(); }; }
  const ap = h.querySelector("#smApply"); if (ap) ap.onclick = () => smApply(_smRes);
  const add = h.querySelector("#ufAdd");
  if (add) add.onclick = () => {
    const v = id => (h.querySelector("#" + id) || {}).value || "";
    const name = v("ufName").trim().replace(/\s+/g, "_");
    if (!name) return toast("ตั้งชื่อฟิลด์ก่อน");
    if (UF.some(f => f.name === name) || DD_ROWS.some(r => r[0] === name)) return toast("มีฟิลด์ชื่อนี้แล้ว");
    UF.push({ id: "uf" + Date.now().toString(36), name, type: v("ufType"), src: v("ufSrc"), role: v("ufRole"), desc: v("ufDesc").trim(), vals: {} });
    mvStore(MV_LS.uf, UF); toast("เพิ่มฟิลด์ " + name + " แล้ว · ยังไม่เข้าแบบจำลอง (Phase II)"); render();
  };
  h.querySelectorAll("[data-ufdel]").forEach(b => b.onclick = () => confirm2(b, () => {
    const i = UF.findIndex(f => f.id === b.dataset.ufdel); if (i >= 0) UF.splice(i, 1); mvStore(MV_LS.uf, UF); render(); }, "กดอีกครั้งเพื่อลบ"));
  h.querySelectorAll("[data-ufval]").forEach(el => el.onchange = () => {
    const f = UF.find(x => x.id === el.dataset.ufval); if (!f) return;
    (f.vals = f.vals || {})[c.t] = el.value.trim(); mvStore(MV_LS.uf, UF); toast("บันทึกค่าแล้ว (ชุดข้อมูลผู้ใช้)");
  });
  const ex = h.querySelector("#mvDsExport");
  if (ex) ex.onclick = () => mvDl(`openinnoscore_user_dataset_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({
    dataset: "OpenInnoScore · ชุดข้อมูลผู้ใช้ (③)", note: "ค่าที่ผู้ใช้กรอก/นำเข้าในเครื่องนี้ · ไม่รวมชุดอ้างอิง REF-928 และไม่มีสัมประสิทธิ์",
    exported_at: new Date().toISOString(), zoneA_overrides: S.ov || {}, user_fields: UF, imports: IMP,
    assessments: { company: c.t, rfq: mvSum("rfqSummary", c.t) || null, bod_set: mvSum("bodSetSummary", c.t, c.fy || FY_SHOWN) || null } }, null, 2), "application/json;charset=utf-8");
}

/* ============================================================================
   2 · Evidence Pack (งานวิจัย §4.7 presentation layer)
   ============================================================================ */
const RULES8 = [
  ["R1", "ไม่แสดงความน่าจะเป็น — คะแนนเป็นเปอร์เซ็นไทล์เทียบฐานอ้างอิง", () => true],
  ["R2", "แสดง quadrant และข้อความสถานะคู่กับ Tier เสมอ", () => true],
  ["R3", "ติดป้าย Caution เมื่อปีบัญชีไม่ผ่านเกณฑ์ validity (FAIL)", v => v.regime === "FAIL"],
  ["R4", "ไม่แสดง Tier/เปอร์เซ็นไทล์สำหรับบริษัทนอกกลุ่มอ้างอิง", v => !v.inDomain],
  ["R5", "ติดป้ายหลักฐานอ่อนในอุตสาหกรรมที่ ρ ไม่ต่างจากศูนย์", (v, c) => WEAK_IND.has(c.ind)],
  ["R6", "กรรมการครอบครัวและ political ties เป็นข้อมูลบริบทอ่านอย่างเดียว ไม่ใช่เหตุผลเชิงบวก", () => true],
  ["R7", "ถ้อยคำเชิงความสัมพันธ์ ไม่ใช่เหตุ-ผลหรือการพยากรณ์", () => true],
  ["R8", "ติดป้าย Tier ไม่แน่นอนเมื่อช่วง 90% คร่อมมากกว่าหนึ่ง Tier", v => tierOf(v.band[0]) !== tierOf(v.band[1])],
];
function evData(c) {
  const v = verdictOf(c), L = typeof ucLens === "function" ? ucLens() : { lab: "—", audience: "—" };
  const fy = c.fy || FY_SHOWN, oi = c.oisInd ?? oisIndOf(signalB(c.promo, c.amp), c.ind), bs = c.bsize;
  const ceo = S.ceo && isEdited(c.t) && S.ceo.r ? { src: "วิเคราะห์จากเอกสารที่ผู้ใช้อัปโหลด" + (S.ceo.name ? ` (${S.ceo.name})` : ""), words: S.ceo.r.wc,
      pro: S.ceo.r.pro && S.ceo.r.pro.n, pre: S.ceo.r.pre && S.ceo.r.pre.n }
    : { src: c.pRaw !== undefined ? "ค่า LIWC-22 ที่ผู้ใช้กรอกใน Zone A" : "แผงข้อมูลวิจัย (LIWC-22 · สารถึงผู้ถือหุ้นภาษาอังกฤษ ปีบัญชีล่าสุด)" };
  return {
    meta: { generated_at: new Date().toISOString(), prepared_by: S.user || "", plan: PLAN_LAB ? PLAN_LAB[S.plan] : S.plan },
    case: { ticker: c.t, name: c.n, industry: IND[c.ind] || "", fiscal_year: fy, fiscal_year_be: fy + 543, use_case: L.lab, audience: L.audience, edited_inputs: isEdited(c.t) },
    ceo_text: Object.assign({ promotion_focus_percentile: c.dp, promotion_focus_raw: Math.round(c.promo * 100) / 100 }, ceo),
    board_context: { board_size: bs || null, board_size_assumed: !bs, female_ratio: c.fem, female_count: bs ? Math.round(c.fem * bs) : null,
      family_ratio: c.fam, political_ties: c.pol ? 1 : 0, avg_tenure_years: Math.round(c.ten * 10) / 10, note: "อ่านอย่างเดียว · ครอบครัว/political ties เป็นบริบท (R6) · อายุงานไม่เข้าสูตร" },
    score: { openinnoscore: Math.round((c.ois ?? c.ipi) * 10) / 10, band90: v.band, tier: v.tier, tier_uncertain: tierOf(v.band[0]) !== tierOf(v.band[1]),
      ois_industry: Math.round(oi * 10) / 10, industry_quartile: "Q" + tierOf(oi), formula_shown: typeof useT1 === "function" && useT1() ? "B_T1 (shadow · Caution)" : "B_EG" },
    quadrant: { code: v.quad, name: ZONES[v.quad].l, label: ZONES[v.quad].q, status_message: v.st.s, group_mean_oi: v.st.oi, group_n: v.st.n },
    regime: { fiscal_year: fy, verdict: v.regime || "ยังไม่ validate" },
    chips: v.chips.map(x => ({ label: x.k, why: x.t })), oi_flag: v.flag,
    rules: RULES8.map(([k, d, f]) => ({ rule: k, text: d, triggered: !!f(v, c) })),
    provenance: { reference: "REF-928 · 928 บริษัท-ปี · 209 บริษัท", reference_version: OIS.version, parameter_record: OIS.version,
      data_dictionary: "REF-928 Data Dictionary (JSM Model 3, edit6)", build_date: document.lastModified || "", mode: typeof OIS_SRV !== "undefined" && OIS_SRV ? "เซิร์ฟเวอร์ (สูตรอยู่ฝั่งเซิร์ฟเวอร์)" : "ไฟล์ออฟไลน์" },
    rfq: mvSum("rfqSummary", c.t) || null, bod_set: mvSum("bodSetSummary", c.t, fy) || null,
  };
}
function evHtml(d) {
  const row = (k, v) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`;
  const rc = d.regime.verdict === "PASS" ? "ok" : d.regime.verdict === "CAUTION" ? "warn" : d.regime.verdict === "FAIL" ? "crit" : "mute";
  return `<article class="mv-ev" id="mvEvDoc">
    <header class="mv-evh"><div><div class="mv-evk">OpenInnoScore™ · Evidence Pack</div><h3>${esc(d.case.name)} (${esc(d.case.ticker)})</h3>
      <div class="mv-sub">ปีบัญชี พ.ศ. ${d.case.fiscal_year_be} · ${esc(d.case.industry)} · จัดทำ ${esc(new Date(d.meta.generated_at).toLocaleString("th-TH"))} · โดย ${esc(d.meta.prepared_by || "—")}</div></div>
      <span class="pill ${rc}">Validity FY${d.regime.fiscal_year} · ${esc(d.regime.verdict)}</span></header>
    <section><h4>1 · ข้อมูลกรณี (case setup)</h4><table class="mv-evt">
      ${row("บริษัท", `${esc(d.case.ticker)} · ${esc(d.case.name)}`)}${row("อุตสาหกรรม (SET)", esc(d.case.industry))}
      ${row("ปีบัญชี", `${d.case.fiscal_year} (พ.ศ. ${d.case.fiscal_year_be})`)}${row("มุมมองการใช้งาน (Use case)", `${esc(d.case.use_case)} · ผู้อ่าน ${esc(d.case.audience)}`)}
      ${row("ค่าป้อน", d.case.edited_inputs ? `<span class="pill warn">ผู้ใช้แก้ค่าใน Zone A</span>` : "ค่าจากฐานข้อมูลต้นแบบ")}</table></section>
    <section><h4>2 · หลักฐานภาษา CEO</h4><table class="mv-evt">
      ${row("CEO Promotion Focus", `เปอร์เซ็นไทล์ ${fmt(d.ceo_text.promotion_focus_percentile, 0)} ของ REF-928 · ค่าดิบ ${fmt(d.ceo_text.promotion_focus_raw, 2)}% ของคำ`)}
      ${row("ที่มา", esc(d.ceo_text.src))}
      ${d.ceo_text.words ? row("คำที่นับได้", `${fmt(d.ceo_text.words)} คำ · คำเชิงรุก (ไฮไลต์) ${fmt(d.ceo_text.pro || 0)} · คำเชิงป้องกัน ${fmt(d.ceo_text.pre || 0)}`) : ""}</table></section>
    <section><h4>3 · บริบทบอร์ดและบริษัท (อ่านอย่างเดียว)</h4><table class="mv-evt">
      ${row("จำนวนกรรมการ", d.board_context.board_size ? `${d.board_context.board_size} คน` : "ไม่มีในฐานข้อมูล")}
      ${row("กรรมการหญิง", `${pct1(d.board_context.female_ratio)}${d.board_context.female_count !== null ? ` (≈ ${d.board_context.female_count} คน${d.board_context.female_count < CRIT_N ? " · ต่ำกว่า critical mass" : ""})` : ""}`)}
      ${row("กรรมการครอบครัว (บริบท R6)", pct1(d.board_context.family_ratio))}${row("political ties (บริบท R6)", d.board_context.political_ties ? "1 · มี" : "0 · ไม่มี")}
      ${row("อายุงานเฉลี่ยของบอร์ด", `${fmt(d.board_context.avg_tenure_years, 1)} ปี · ไม่มีผลต่อคะแนน (δT = 0)`)}</table></section>
    <section><h4>4 · คะแนน ช่วง 90% Tier และ quadrant</h4><table class="mv-evt">
      ${row("OpenInnoScore", `<b>${fmt(d.score.openinnoscore, 1)}</b> · ช่วง 90% ${fmt(d.score.band90[0], 1)}–${fmt(d.score.band90[1], 1)} · สูตรที่แสดง ${esc(d.score.formula_shown)}`)}
      ${row("Tier (ทั้งฐาน)", `Tier ${d.score.tier}${d.score.tier_uncertain ? ` <span class="pill warn">tier ไม่แน่นอน (R8)</span>` : ""}`)}
      ${row("Quartile ในอุตสาหกรรม", `${esc(d.score.industry_quartile)} · OIS ในอุตสาหกรรม ${fmt(d.score.ois_industry, 0)}`)}
      ${row("quadrant", `${esc(d.quadrant.code)} · ${esc(d.quadrant.name)} (${esc(d.quadrant.label)})`)}
      ${row("ข้อความสถานะ (ตารางที่ 10)", `${esc(d.quadrant.status_message)}<br><span class="mv-sub">ช่อง Tier × quadrant เดียวกันใน REF-928 มีกิจกรรม open innovation เฉลี่ย ${fmt(d.quadrant.group_mean_oi, 2)} รายการ/ปี (n = ${d.quadrant.group_n}) — ค่าเฉลี่ยกลุ่ม ไม่ใช่ค่าคาดหมายของบริษัทนี้</span>`)}
      ${row("ธงสัญญาณ OI", d.oi_flag ? "มี (ช่อง A · ขอบล่างช่วง 90% ≥ 50 · ปีไม่ FAIL)" : "ไม่มี")}
      ${row("ป้าย (chips)", d.chips.length ? d.chips.map(x => `<span class="chip" title="${esc(x.why)}">${esc(x.label)}</span>`).join(" ") : "—")}</table></section>
    <section><h4>5 · กติกาการแสดงผล R1–R8 ที่ใช้กับแฟ้มนี้</h4><table class="mv-evt">
      ${d.rules.map(r => row(r.rule, `${esc(r.text)} ${r.triggered ? `<span class="pill ${/R3|R4|R5|R8/.test(r.rule) ? "warn" : "ok"}">${/R3|R4|R5|R8/.test(r.rule) ? "เกิดขึ้นกับบริษัทนี้" : "ใช้แล้ว"}</span>` : `<span class="pill mute">ไม่เข้าเงื่อนไข</span>`}`)).join("")}</table></section>
    ${d.rfq || d.bod_set ? `<section><h4>6 · แบบประเมินประกอบ (ไม่เข้าคะแนน)</h4><table class="mv-evt">
      ${d.rfq ? row("RFQ (CEO Regulatory Focus · self-report)", esc(d.rfq).replace(/\n/g, "<br>")) : ""}
      ${d.bod_set ? row("แบบประเมินตนเองของคณะกรรมการ (SET)", esc(d.bod_set).replace(/\n/g, "<br>")) : ""}</table></section>` : ""}
    <section><h4>${d.rfq || d.bod_set ? 7 : 6} · ที่มาของข้อมูล (provenance)</h4><table class="mv-evt">
      ${row("ฐานอ้างอิง", esc(d.provenance.reference))}${row("รุ่นฐานอ้างอิง", `<code>${esc(d.provenance.reference_version)}</code>`)}
      ${row("parameter record", `<code>${esc(d.provenance.parameter_record)}</code> · ค่าสัมประสิทธิ์ไม่แสดง (DP6)`)}${row("Data Dictionary", esc(d.provenance.data_dictionary))}
      ${row("วันที่ไฟล์ระบบ (build)", esc(d.provenance.build_date))}${row("โหมด", esc(d.provenance.mode))}</table></section>
    <footer class="mv-evf">เชิงความสัมพันธ์ ไม่ใช่เหตุ-ผลหรือการพยากรณ์ · ไม่ใช่ความน่าจะเป็น · ไม่ใช้ประเมินหรือคัดเลือกกรรมการรายบุคคล (PDPA ม.26) · ไม่ใช่คำแนะนำการลงทุนหรือการพิจารณาสินเชื่อ</footer>
  </article>`;
}
function evMd(d) {
  const L = [`# Evidence Pack · ${d.case.name} (${d.case.ticker})`, "", `- ปีบัญชี: ${d.case.fiscal_year} (พ.ศ. ${d.case.fiscal_year_be}) · ${d.case.industry}`,
    `- Use case: ${d.case.use_case} · ผู้อ่าน ${d.case.audience}`, `- จัดทำ: ${d.meta.generated_at} · ${d.meta.prepared_by}`, "",
    "## หลักฐานภาษา CEO", `- CEO Promotion Focus: เปอร์เซ็นไทล์ ${d.ceo_text.promotion_focus_percentile} · ค่าดิบ ${d.ceo_text.promotion_focus_raw}% · ที่มา ${d.ceo_text.src}`,
    ...(d.ceo_text.words ? [`- คำที่นับได้ ${d.ceo_text.words} · เชิงรุก ${d.ceo_text.pro || 0} · เชิงป้องกัน ${d.ceo_text.pre || 0}`] : []), "",
    "## บริบทบอร์ด (อ่านอย่างเดียว)", `- กรรมการ ${d.board_context.board_size ?? "—"} คน · หญิง ${pct1(d.board_context.female_ratio)} · ครอบครัว ${pct1(d.board_context.family_ratio)} (บริบท R6) · political ties ${d.board_context.political_ties} (บริบท R6) · อายุงาน ${d.board_context.avg_tenure_years} ปี (ไม่เข้าสูตร)`, "",
    "## คะแนน", `- OpenInnoScore ${d.score.openinnoscore} · ช่วง 90% ${d.score.band90.join("–")} · Tier ${d.score.tier}${d.score.tier_uncertain ? " (ไม่แน่นอน R8)" : ""} · Quartile ในอุตสาหกรรม ${d.score.industry_quartile}`,
    `- quadrant ${d.quadrant.code} ${d.quadrant.name} · ${d.quadrant.status_message}`, `- Validity FY${d.regime.fiscal_year}: ${d.regime.verdict} · ธงสัญญาณ OI: ${d.oi_flag ? "มี" : "ไม่มี"}`,
    `- ป้าย: ${d.chips.map(x => x.label).join(" · ") || "—"}`, "", "## กติกา R1–R8", ...d.rules.map(r => `- ${r.rule} ${r.text} — ${r.triggered ? "เกิดขึ้น/ใช้แล้ว" : "ไม่เข้าเงื่อนไข"}`), "",
    ...(d.rfq ? ["## RFQ (ไม่เข้าคะแนน)", d.rfq, ""] : []), ...(d.bod_set ? ["## แบบประเมินตนเองของคณะกรรมการ (SET)", d.bod_set, ""] : []),
    "## ที่มาของข้อมูล", `- ${d.provenance.reference} · รุ่น ${d.provenance.reference_version} · parameter record ${d.provenance.parameter_record}`, `- build ${d.provenance.build_date} · ${d.provenance.mode}`, "",
    "_เชิงความสัมพันธ์ ไม่ใช่เหตุ-ผลหรือการพยากรณ์ · ไม่ใช้ประเมินกรรมการรายบุคคล_"];
  return L.join("\n");
}
function viewEvidence() {
  const c = cur(), r = mvRank();
  const head = pageHead("รายงาน", "Evidence Pack · แฟ้มหลักฐานประกอบการตัดสินใจ",
    "รวมทุกอย่างที่ระบบแสดงของบริษัทหนึ่งไว้ในหน้าเดียวสำหรับแฟ้มการตัดสินใจ (งานวิจัย §4.7): ข้อมูลกรณี · ภาษา CEO · บริบทบอร์ด · คะแนนพร้อมช่วง 90% · Tier/quadrant · สถานะ validity · ป้าย · กติกา R1–R8 · ที่มาของข้อมูล");
  if (!mvCanSee(c.t)) return typeof trCoGate === "function" ? trCoGate() : head;
  const d = evData(c), doc = evHtml(d);
  if (r < 1) return head + (typeof trWall === "function" ? trWall(doc, "Evidence Pack", "ระดับ Pro ขึ้นไปประกอบแฟ้มหลักฐานรายบริษัท พิมพ์ และส่งออก .md / JSON ได้ · ระดับ Free เห็นตัวอย่างแบบล็อก", "pro") : doc);
  return head + `<div class="gx-row mv-evtools rp-noprint"><button class="btn p" id="evPrint">พิมพ์ / บันทึก PDF</button><button class="btn s" id="evMd">ดาวน์โหลด .md</button>
      <button class="btn s" id="evJson">ดาวน์โหลด JSON</button><span class="gx-sm">ไม่มีค่าสัมประสิทธิ์ในแฟ้ม · ข้อความเชิงความสัมพันธ์ทั้งหมด</span></div>` + doc;
}
function wireEvidence(h) {
  if (mvRank() < 1 || !mvCanSee(S.t)) return;
  const c = cur(), base = `EvidencePack_${c.t}_${(c.fy || FY_SHOWN) + 543}`;
  const p = h.querySelector("#evPrint"); if (p) p.onclick = () => mvPrint("mv-print-ev");
  const m = h.querySelector("#evMd"); if (m) m.onclick = () => mvDl(base + ".md", evMd(evData(c)), "text/markdown;charset=utf-8");
  const j = h.querySelector("#evJson"); if (j) j.onclick = () => mvDl(base + ".json", JSON.stringify(evData(c), null, 2), "application/json;charset=utf-8");
}

/* ============================================================================
   3 · ใบเสร็จตัวอย่าง (เติมเครดิตแบบจำลอง)
   ============================================================================ */
const RC = mvLoad(MV_LS.rc, []);
const RC_SELLER = "OpenInnoScore (ต้นแบบ)";
const RC_WM = "ตัวอย่าง — ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษีจริง · ระบบชำระเงินจริงเป็นเฟส 2 (Payment API)";
const RC_PAY = { promptpay: "พร้อมเพย์ (จำลอง)", card: "บัตรเครดิต/เดบิต (จำลอง)" };
function mvReceiptAdd(p, method) {
  const now = new Date(), seq = RC.length + 1;
  const total = p.baht, net = Math.round(total / 1.07 * 100) / 100, vat = Math.round((total - net) * 100) / 100;
  const r = { no: `DEMO-${now.getFullYear() + 543}-${String(seq).padStart(5, "0")}`, at: now.toISOString(), pkg: `แพ็กเกจ ${p.n} เครดิต`, n: p.n,
    net, vat, total, buyer: S.user || "", method: RC_PAY[method] || RC_PAY.promptpay, seller: RC_SELLER };
  RC.unshift(r); mvStore(MV_LS.rc, RC);
  return r;
}
const thb = v => (+v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function rcDoc(r) {
  return `<div class="mv-rcpt" id="mvRcptDoc" role="document" aria-label="ใบเสร็จตัวอย่าง ${esc(r.no)}">
    <div class="mv-wm" aria-hidden="true">ตัวอย่าง</div>
    <div class="mv-rch"><div><b>${esc(r.seller)}</b><div class="mv-sub">ผู้ขาย · ต้นแบบเพื่อการทดสอบ (ไม่มีเลขประจำตัวผู้เสียภาษี)</div></div>
      <div style="text-align:right"><b>ใบเสร็จตัวอย่าง</b><div class="mv-sub">เลขที่ ${esc(r.no)}<br>${esc(new Date(r.at).toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" }))}</div></div></div>
    <div class="mv-sub" style="margin:8px 0">ผู้ซื้อ: ${esc(r.buyer || "—")} · วิธีชำระ: ${esc(r.method)}</div>
    <table class="mv-rct"><thead><tr><th>รายการ</th><th class="n">จำนวน</th><th class="n">จำนวนเงิน (บาท)</th></tr></thead><tbody>
      <tr><td>${esc(r.pkg)} · เครดิตใช้งาน OpenInnoScore</td><td class="n">1</td><td class="n">${thb(r.net)}</td></tr></tbody>
      <tfoot><tr><td colspan="2">มูลค่าก่อนภาษี</td><td class="n">${thb(r.net)}</td></tr>
        <tr><td colspan="2">ภาษีมูลค่าเพิ่ม 7%</td><td class="n">${thb(r.vat)}</td></tr>
        <tr class="tot"><td colspan="2">รวมทั้งสิ้น</td><td class="n">${thb(r.total)}</td></tr></tfoot></table>
    <div class="mv-rcwm">${esc(RC_WM)}</div></div>`;
}
function payPanel() {
  const pay = S._pay; if (!pay) return "";
  const p = PACKS.find(x => x.n === pay.n); if (!p) return "";
  const net = Math.round(p.baht / 1.07 * 100) / 100;
  return `<div class="card mv-pay" id="mvPay" role="region" aria-label="ยืนยันการชำระเงิน (จำลอง)" style="margin-bottom:14px">
    <h3>ยืนยันการชำระเงิน · จำลอง <span class="pill warn">ไม่มีการตัดเงินจริง</span></h3>
    <div class="grid g2" style="gap:14px;align-items:start">
      <div><div class="mv-big">${p.n} <span>เครดิต</span></div>
        <div class="mv-sub">ราคา ${fmt(p.baht)} บาท (รวม VAT 7%) · ก่อนภาษี ${thb(net)} · VAT ${thb(p.baht - net)}</div>
        <div class="seg" role="radiogroup" aria-label="วิธีชำระเงิน" style="margin-top:10px">${Object.entries(RC_PAY).map(([k, l]) =>
          `<button role="radio" data-paym="${k}" aria-selected="${pay.m === k}">${esc(l)}</button>`).join("")}</div></div>
      <div class="note">ระบบจริงจะพาไปหน้าชำระเงินผ่าน Payment API (เฟส 2) · ต้นแบบนี้กดยืนยันเพื่อจำลองว่าชำระสำเร็จ แล้วเติมเครดิตและออก<b>ใบเสร็จตัวอย่าง</b> (มีลายน้ำ ไม่ใช่เอกสารทางภาษี)</div></div>
    <div class="gx-row" style="margin-top:12px"><button class="btn p" id="mvPayOk">ยืนยันชำระ ${fmt(p.baht)} บาท (จำลอง)</button><button class="btn g" id="mvPayCancel">ยกเลิก</button></div></div>`;
}
function rcCard() {
  const sel = RC.find(r => r.no === S._rcpt);
  return `<div class="card" id="mvRcpts" style="margin-bottom:14px"><h3>ใบเสร็จตัวอย่าง <span class="pill mute">${RC.length} ฉบับ</span></h3>
    <p class="desc">ออกอัตโนมัติเมื่อเติมเครดิต · ${esc(RC_WM)}</p>
    ${RC.length ? `<div class="tw" style="max-height:240px;overflow:auto"><table class="mv-ptbl"><thead><tr><th>เลขที่</th><th>วันที่</th><th>แพ็กเกจ</th><th class="n">ก่อนภาษี</th><th class="n">VAT 7%</th><th class="n">รวม</th><th>ผู้ซื้อ</th><th></th></tr></thead><tbody>
      ${RC.map(r => `<tr${r.no === S._rcpt ? ' class="hl"' : ""}><td><code>${esc(r.no)}</code></td><td>${esc(new Date(r.at).toLocaleDateString("th-TH", { dateStyle: "medium" }))}</td><td>${esc(r.pkg)}</td>
        <td class="n">${thb(r.net)}</td><td class="n">${thb(r.vat)}</td><td class="n"><b>${thb(r.total)}</b></td><td>${esc(r.buyer)}</td>
        <td><button class="btn g" data-rcview="${esc(r.no)}">ดู</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div style="text-align:center;padding:18px;color:var(--ink-3);font-size:12.5px">ยังไม่มีใบเสร็จ — เลือกแพ็กเกจด้านบนเพื่อเติมเครดิต (จำลอง)</div>`}
    ${sel ? `<div class="mv-rcwrap">${rcDoc(sel)}<div class="gx-row rp-noprint" style="margin-top:8px"><button class="btn p" id="rcPrint">พิมพ์ใบเสร็จตัวอย่าง</button><button class="btn g" id="rcClose">ปิด</button></div></div>` : ""}</div>`;
}
(() => {
  const vb = VIEWS.billing, wb = WIRES2.billing;
  VIEWS.billing = function () {
    let h = vb.apply(this, arguments);
    const k = h.indexOf('<div class="card"><h3>ประวัติการใช้เครดิต');
    const add = payPanel() + rcCard();
    return k > 0 ? h.slice(0, k) + add + h.slice(k) : h + add;
  };
  WIRES2.billing = function (h) {
    if (typeof wb === "function") wb(h);
    h.querySelectorAll("[data-paym]").forEach(b => b.onclick = () => { if (S._pay) { S._pay.m = b.dataset.paym; render(); } });
    const pc = h.querySelector("#mvPayCancel"); if (pc) pc.onclick = () => { S._pay = null; render(); };
    const po = h.querySelector("#mvPayOk"); if (po) po.onclick = () => {
      const pay = S._pay, p = pay && PACKS.find(x => x.n === pay.n); if (!p) return;
      S.credits += p.n;
      S.log.unshift({ what: "topup", t: "-", cost: -p.n, label: `เติม ${p.n} เครดิต · ${fmt(p.baht)} บาท`, at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) });
      const r = mvReceiptAdd(p, pay.m);
      S._pay = null; S._rcpt = r.no; save(); toast(`เติม ${p.n} เครดิตแล้ว · ออกใบเสร็จตัวอย่าง ${r.no}`); render();
      setTimeout(() => { const e = $("#mvRcpts"); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    };
    h.querySelectorAll("[data-rcview]").forEach(b => b.onclick = () => { S._rcpt = b.dataset.rcview; render();
      setTimeout(() => { const e = $("#mvRcptDoc"); if (e) e.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); });
    const rp = h.querySelector("#rcPrint"); if (rp) rp.onclick = () => mvPrint("mv-print-rc");
    const rcx = h.querySelector("#rcClose"); if (rcx) rcx.onclick = () => { S._rcpt = null; render(); };
  };
})();

/* ============================================================================
   4 · ลงทะเบียนหน้า · เมนู · ป้ายสิทธิ์
   ============================================================================ */
VIEWS.datasets = viewDatasets; WIRES2.datasets = wireDatasets;
VIEWS.evidence = viewEvidence; WIRES2.evidence = wireEvidence;
if (typeof wireAlgo === "function") { const wv = WIRES2.valid; WIRES2.valid = function (h) { if (typeof wv === "function") wv(h); wireAlgo(h); }; }
(() => {
  if (!NAV.some(n => n.id === "evidence")) {
    const i = NAV.findIndex(n => n.id === "t561");
    const it = { id: "evidence", g: 2, ico: "▣", lab: "Evidence Pack" };
    if (i >= 0) NAV.splice(i + 1, 0, it); else NAV.push(it);
  }
  if (!NAV.some(n => n.id === "datasets")) {
    const i = NAV.findIndex(n => n.id === "arch");
    const it = { id: "datasets", g: 3, ico: "⛁", lab: "ชุดข้อมูลและ Data Dictionary" };
    if (i >= 0) NAV.splice(i, 0, it); else NAV.push(it);
  }
  if (typeof navBadge === "function") {
    const nb = navBadge;
    navBadge = function (id) { if (id === "evidence") return mvRank() < 1 ? ["Pro", "pro"] : null; return nb(id); };
  }
  buildNav();
  if (S.user) syncNavLocks();
})();
/* คืนหน้าที่ผู้ใช้เปิดค้างไว้ (หน้าที่ลงทะเบียนในไฟล์นี้ยังไม่มีตอนไฟล์ก่อนหน้าตรวจ) */
(() => {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null"), vw = o && o.vw;
    if (S.user && vw && VIEWS[vw] && S.view !== vw && $("#v-" + vw)) {
      S.view = vw; $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + vw));
      syncNavLocks(); render();
    } else if (S.user && ["valid", "billing", "datasets", "evidence"].includes(S.view)) render();
  } catch (e) { }
})();
