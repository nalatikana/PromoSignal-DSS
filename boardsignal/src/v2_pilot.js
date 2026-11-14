/* ============================================================================
   v2_pilot.js — หน้าตามแนวทาง Pilot (องค์กรนำร่อง · REC)
     A. BOD Self-Assessment OI-1…OI-6 (ระดับคณะ) — window.bodOiFor(ticker, fy) ใช้ในรายงานคณะกรรมการ
     B. Board Profile (outside the reference group) — เชิงพรรณนา ไม่มี tier / OIS / What-if (F7)
     C. ข้อสั่งการบอร์ด / Compliance program (Level 3 add-on · ฉบับนำร่องไม่ส่งอีเมล)
     D. แบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2) — ย้ายไป v2_irb.js (MVP1)
     E. System log (ระดับรวม) + ตรวจการคำนวณรายบริษัท (ค่าในบันทึกพารามิเตอร์แสดงเฉพาะผู้ดูแลในฉบับเซิร์ฟเวอร์)
     F. การเชื่อมต่อ (Phase ถัดไป)
   กติกา: ฉบับออฟไลน์เก็บสถานะใน localStorage คีย์เดียว ไม่เก็บชื่อ อีเมล IP หรือรหัสพนักงาน
          ฉบับเซิร์ฟเวอร์ส่งคำตอบเข้าฐานข้อมูลกลางผูกกับบัญชีผู้ใช้ (ดู PL_PRIVACY)
   ============================================================================ */
const PL_KEY = "ois_pilot_v1";
const PL = (() => {
  const d = { bod: { a: {}, ev: {}, draft: "" }, bodAll: {}, bodYear: null,
              od: { name: "", sector: "", bsize: null, femN: null, famN: null, pol: 0, draft: "", _v2: 1 },
              dir: { rows: [], mode: "table" },
              survey: { step: 0, cur: null, resp: [] },   /* ข้อมูลรุ่นเดิม — แบบสอบถามใหม่เก็บที่ ois_irb_survey_v1 (v2_irb.js) */
              log: { crash: 0, errs: [], render: {}, issues: [] },
              integr: { ep: {}, res: {} } };
  try {
    const o = JSON.parse(localStorage.getItem(PL_KEY) || "null");
    if (o && typeof o === "object") Object.keys(d).forEach(k => { if (o[k] && typeof o[k] === "object" && d[k]) Object.assign(d[k], o[k]); });
    if (o && typeof o.bodYear === "number") d.bodYear = o.bodYear;
  } catch (e) { }
  return d;
})();
const PL_SRV = !!(window.OIS_API && window.OIS_SERVER);
/** ข้อความความเป็นส่วนตัวที่ตรงกับการเก็บข้อมูลจริงของแต่ละโหมด (ภาคผนวก ง · survey) */
const PL_PRIVACY = PL_SRV
  ? `ฉบับเซิร์ฟเวอร์: คำตอบถูกบันทึกในฐานข้อมูลกลางของโครงการ <b>ผูกกับบัญชีที่ท่านเข้าสู่ระบบ</b> — ระบบเก็บอีเมลหรือชื่อบัญชี
     ชื่อที่แสดง วิธีเข้าสู่ระบบ รหัสสุ่มของเบราว์เซอร์ (client id) เวลาที่ส่ง และคำตอบ · ไม่เก็บ IP ในฐานข้อมูล ·
     ผู้เห็นข้อมูลรายคน: ผู้ดูแลระบบและคณะผู้วิจัยเท่านั้น (ส่งออก CSV เพื่อวิเคราะห์) · รายงานผลเป็นภาพรวมกลุ่มเมื่อ n ≥ 5 ·
     เก็บไว้จนสิ้นสุดโครงการวิจัยแล้วลบหรือทำให้ไม่ระบุตัวตน · ขอดู/ลบคำตอบของท่านได้โดยติดต่อผู้ดูแลระบบ`
  : `ฉบับออฟไลน์: ไม่เก็บชื่อ อีเมล IP หรือรหัสพนักงาน · คำตอบเก็บในเครื่องนี้ (localStorage) ด้วยรหัสสุ่ม ไม่ถูกส่งออกจากเครื่อง ·
     รายงานผลเป็นกลุ่มเมื่อมีผู้ตอบ ≥ 5 คนเท่านั้น`;
/** ชุดคำตอบ BOD OI-1…6 แยกตามบริษัท × ปีรายงาน (ภาคผนวก ง: เดิมทับกันเมื่อประเมินหลายบริษัทในเครื่องเดียว)
 *  PL.bod ชี้ไปที่ชุดของบริษัท/ปีที่เลือกอยู่เสมอ (v2_tiers.js อ่าน PL.bod.a) */
/* ปีของชุดคำตอบ = ปีบัญชี (พ.ศ.) ที่เลือก — ตั้งต้นจากปีบัญชีของข้อมูลคะแนน (c.fy / FY_SHOWN) ไม่ใช่นาฬิกาเครื่อง (ภาคผนวก ง-33) */
const bodFy0 = () => { const c = typeof byT === "object" && typeof S === "object" ? byT[S.t] : null; return ((c && c.fy) || FY_SHOWN) + 543; };
const bodYear = () => PL.bodYear || bodFy0();
/** ตัวเลือกปีบัญชี: ปีของข้อมูลคะแนน + 3 ปีถัดไป + ปีที่มีคำตอบเก็บไว้แล้วของบริษัทนี้ */
function bodYears() {
  const y0 = bodFy0(), ys = new Set([y0, y0 + 1, y0 + 2, y0 + 3]);
  if (PL.bodYear) ys.add(PL.bodYear);
  Object.keys(PL.bodAll || {}).forEach(k => { const [t, y] = k.split("|"); if (t === S.t && +y) ys.add(+y); });
  return [...ys].sort((a, b) => a - b);
}
/** คำตอบ BOD OI-1…6 ของบริษัท × ปีบัญชี — ไม่ย้อนไปใช้ชุดของบริษัทอื่นหรือปีอื่น (ภาคผนวก ง ใหม่: ร่าง 56-1 ใช้คำตอบผิดบริษัท)
 *  fy รับได้ทั้ง ค.ศ. (2023) และ พ.ศ. (2566) · คืน { ticker, year (พ.ศ.), a: {OI-1: 1–5 …}, ev: {OI-1: หลักฐาน …},
 *  done: ["OI-1", …], mean, draft } หรือ null ถ้ายังไม่มีคำตอบ · ใช้โดยร่าง 56-1 (v2_tiers.js t561Bod) */
function bodOiFor(ticker, fy) {
  const t = String(ticker || "").toUpperCase(), y0 = +fy || bodFy0(), y = y0 < 2400 ? y0 + 543 : y0;
  const o = (PL.bodAll || {})[`${t}|${y}`];
  if (!o || !o.a) return null;
  const done = OI_ITEMS.map(i => i.id).filter(id => o.a[id]);
  if (!done.length) return null;
  return { ticker: t, year: y, a: Object.assign({}, o.a), ev: Object.assign({}, o.ev || {}), done,
           mean: plMean(done.map(id => o.a[id])), draft: o.draft || "" };
}
window.bodOiFor = bodOiFor;
function bodSel() {
  const k = `${(typeof S === "object" && S.t) || "-"}|${bodYear()}`;
  if (!PL.bodAll[k]) {
    const old = PL.bod;     // ย้ายคำตอบรุ่นเดิม (ไม่มีบริษัท/ปี) มาไว้ที่ชุดแรกที่เปิด
    PL.bodAll[k] = old && !old._k && (Object.keys(old.a || {}).length || old.draft) ? Object.assign({}, old) : { a: {}, ev: {}, draft: "" };
    PL.bodAll[k]._k = k;
  }
  PL.bod = PL.bodAll[k];
  return PL.bod;
}
function plSave() { try { localStorage.setItem(PL_KEY, JSON.stringify(PL)); } catch (e) { } }
function plDl(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: type || "application/json;charset=utf-8" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function plCopy(txt) {
  const fb = () => { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); toast("คัดลอกแล้ว"); } catch (e) { toast("คัดลอกไม่สำเร็จ"); } t.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast("คัดลอกแล้ว")).catch(fb); else fb();
}
const plCsv = rows => "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
const plBE = () => new Date().getFullYear() + 543;
const plMean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
const plId = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
/** ส่วนเบี่ยงเบนมาตรฐานตัวอย่าง (n − 1) */
const plSD = a => { const x = a.filter(v => typeof v === "number" && !isNaN(v)); if (x.length < 2) return NaN;
  const m = plMean(x); return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1)); };
/** Cronbach's alpha — rows = [[ข้อ1, ข้อ2, …], …] เฉพาะแถวที่ครบ · α = k/(k−1)·(1 − Σσ²ᵢ/σ²รวม) ใช้ความแปรปรวนตัวอย่าง */
function plAlpha(rows) {
  const R = rows.filter(r => r.every(v => typeof v === "number" && !isNaN(v))); if (R.length < 2) return NaN;
  const k = R[0].length; if (k < 2) return NaN;
  const vr = a => { const s = plSD(a); return s * s; };
  const sumItem = [...Array(k)].reduce((s, _, i) => s + vr(R.map(r => r[i])), 0), tot = vr(R.map(r => r.reduce((s, v) => s + v, 0)));
  return tot > 0 ? k / (k - 1) * (1 - sumItem / tot) : NaN;
}
/** ส่งเข้าเซิร์ฟเวอร์เมื่อเป็นฉบับเซิร์ฟเวอร์ (window.OIS_API.submit) — คืน Promise<boolean> · โหมดออฟไลน์คืน false ทันที */
function plSubmit(kind, ticker, payload) {
  const api = window.OIS_API; if (!api || typeof api.submit !== "function") return Promise.resolve(false);
  return Promise.resolve().then(() => api.submit({ kind, ticker: ticker || null, payload }))
    .then(r => !(r && (r.ok === false || r.enabled === false))).catch(() => false);
}
/** ยืนยันในหน้า (แทน window.confirm) — แทรกแถบยืนยัน/ยกเลิกถัดจากปุ่ม */
function plAsk(btn, msg, fn) {
  const old = btn.parentElement && btn.parentElement.querySelector(".as-ask"); if (old) old.remove();
  const d = document.createElement("span"); d.className = "as-ask"; d.setAttribute("role", "alert");
  d.innerHTML = `<span>${esc(msg)}</span><button type="button" class="btn p as-yes">ยืนยัน</button><button type="button" class="btn g as-no">ยกเลิก</button>`;
  btn.insertAdjacentElement("afterend", d);
  d.querySelector(".as-yes").onclick = () => { d.remove(); fn(); };
  d.querySelector(".as-no").onclick = () => d.remove();
  d.querySelector(".as-no").focus();
}
/** ปุ่มมาตราส่วน 1–5 — ใช้ร่วมกันทุกหน้า */
function plScale(key, val, labs) {
  return `<div class="pl-scale" data-scale="${esc(key)}">${[1, 2, 3, 4, 5].map(v =>
    `<button type="button" class="${val === v ? "on" : ""}" data-v="${v}" title="${esc(labs ? labs[v - 1] : v)}">
      <b>${v}</b>${labs ? `<span>${esc(labs[v - 1])}</span>` : ""}</button>`).join("")}</div>`;
}
function plWireScale(h, onPick) {
  h.querySelectorAll(".pl-scale button").forEach(b => b.onclick = () => onPick(b.parentElement.dataset.scale, +b.dataset.v));
}
const PL_LEGAL = `เครื่องมือนี้เป็นเครื่องมือช่วยเสนอแนะ (suggestion tool) ไม่มีการตัดสินใจอัตโนมัติ
  และไม่ใช้ประเมินบุคคล · ข้อมูลทั้งหมดเป็นระดับคณะหรือระดับองค์กร · ` + (PL_SRV
  ? "ฉบับเซิร์ฟเวอร์บันทึกการใช้งานผูกกับบัญชีผู้ใช้ (ไม่เก็บ IP ในฐานข้อมูล)" : "ไม่เก็บชื่อ อีเมล หรือ IP");

/* ============================================================================
   A · BOD Self-Assessment · OI-1…OI-6
   ============================================================================ */
const OI_ITEMS = [
  { id: "OI-1", ref: "หลักปฏิบัติ 2.2", t: "คณะกรรมการกำหนดวัตถุประสงค์และเป้าหมายด้านนวัตกรรมแบบเปิด (open innovation) ที่วัดผลได้ และสื่อสารให้ฝ่ายจัดการนำไปใช้วางแผน" },
  { id: "OI-2", ref: "หลักปฏิบัติ 5.1", t: "คณะกรรมการกำกับให้มีกรอบการคัดเลือกพันธมิตรและการร่วมมือกับภายนอก (เกณฑ์คัดเลือก การจัดสรรทรัพยากร และการบริหารความเสี่ยง)" },
  { id: "OI-3", ref: "หลักปฏิบัติ 3.1.1", t: "องค์ประกอบและทักษะของคณะกรรมการ (skill matrix) สอดคล้องกับกลยุทธ์นวัตกรรมของบริษัท และมีการทบทวนเมื่อกลยุทธ์เปลี่ยน" },
  { id: "OI-4", ref: "หลักปฏิบัติ 5.4", t: "มีการติดตามผลโครงการร่วมกับพันธมิตรด้วยตัวชี้วัดที่ชัดเจน และกำหนดเกณฑ์ทบทวน/หยุดโครงการ (stage gate / stop criteria)" },
  { id: "OI-5", ref: "หลักปฏิบัติ 4", t: "ผู้บริหารระดับสูงมีความรับผิดชอบและตัวชี้วัดผลงาน (KPI) ด้านนวัตกรรมแบบเปิดที่คณะกรรมการเห็นชอบ" },
  { id: "OI-6", ref: "หลักปฏิบัติ 6", t: "มีกระบวนการเรียนรู้จากผลโครงการนวัตกรรมแบบเปิด และเปิดเผยข้อมูลผลลัพธ์ในรายงาน 56-1 One Report อย่างเหมาะสม" },
];
const OI_LABS = ["ไม่มีเลย", "เริ่มต้น", "มีบางส่วน", "มีเป็นส่วนใหญ่", "มีอย่างเป็นระบบ"];
function bodDraft() {
  const a = PL.bod.a, done = OI_ITEMS.filter(i => a[i.id]), vals = done.map(i => a[i.id]);
  if (!done.length) return "";
  const hi = done.filter(i => a[i.id] >= 4), lo = done.filter(i => a[i.id] <= 2);
  const li = arr => arr.map(i => `${i.id} (${i.ref})`).join(", ");
  return `ในปี ${bodYear()} คณะกรรมการบริษัทได้ประเมินตนเองในระดับคณะเพิ่มเติมในประเด็นการกำกับดูแลนวัตกรรมแบบเปิด ${done.length} ประเด็น (${done.map(i => i.id).join(", ")}) ` +
    `โดยอ้างอิงหลักปฏิบัติตามหลักการกำกับดูแลกิจการที่ดีสำหรับบริษัทจดทะเบียน ปี 2560 ผลการประเมินเฉลี่ยอยู่ที่ ${fmt(plMean(vals), 2)} จากคะแนนเต็ม 5` +
    (hi.length ? ` ประเด็นที่คณะกรรมการเห็นว่ามีการดำเนินการเป็นส่วนใหญ่หรืออย่างเป็นระบบแล้ว ได้แก่ ${li(hi)}` : "") +
    (lo.length ? ` ประเด็นที่คณะกรรมการกำหนดเป็นแนวทางพัฒนาในปีถัดไป ได้แก่ ${li(lo)} โดยมอบหมายให้ฝ่ายจัดการเสนอแผนดำเนินการและรอบติดตามต่อคณะกรรมการ` : "") +
    ` ทั้งนี้ ผลการประเมินดังกล่าวเป็นภาพรวมระดับคณะ ไม่มีการประเมินหรือให้คะแนนกรรมการรายบุคคล และใช้ประกอบกระบวนการประเมินผลการปฏิบัติงานของคณะกรรมการตามที่เปิดเผยในส่วนที่ 2 ข้อ 7–8`;
}
let _bodSrv = "";
function viewBod() {
  bodSel();
  const a = PL.bod.a, ev = PL.bod.ev, done = OI_ITEMS.filter(i => a[i.id]);
  const yrs = bodYears();
  const mean = plMean(done.map(i => a[i.id])), lo = done.filter(i => a[i.id] <= 2);
  return pageHead("Pilot · Use Case 1", "BOD Self-Assessment · ชุดคำถามเสริมด้านการกำกับดูแลนวัตกรรมแบบเปิด",
    `หกประเด็น OI-1…OI-6 ผูกกับหลักปฏิบัติใน CG Code 2560 · ใช้เสริมแบบประเมินตนเองประจำปีของคณะกรรมการ ไม่ใช่แทนที่ ·
     มาตราส่วน 1 = ไม่มีเลย … 5 = มีอย่างเป็นระบบ พร้อมช่องหลักฐานอ้างอิง`)
    + `<div class="pl-tools" style="margin-bottom:10px"><span class="chip">บริษัท <b>${esc(S.t)}</b></span>
        <label class="pl-lab" style="display:inline-flex;gap:6px;align-items:center;margin:0">ปีบัญชี (พ.ศ.)
          <select class="sel" id="plBodYear">${yrs.map(y => `<option value="${y}"${y === bodYear() ? " selected" : ""}>${y}</option>`).join("")}</select></label>
        <span class="as-sm">คำตอบแยกเก็บตามบริษัท × ปีบัญชี (ตั้งต้นที่ปีบัญชีของข้อมูลคะแนน) · เปลี่ยนบริษัทจากตัวเลือกด้านบน</span></div>`
    + `<div class="note crit pl-banner"><b>ตอบในระดับคณะ (aggregate) เท่านั้น</b> — ไม่เก็บคำตอบรายกรรมการ ไม่ประเมินบุคคล (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล ม.26) ·
       ผู้กรอก: เลขานุการบริษัท / ฝ่ายกำกับดูแล สรุปจากการหารือของคณะกรรมการ</div>`
    + `<div class="grid g-side-r">
      <div class="stack">${OI_ITEMS.map((i, n) => `<div class="card pl-q">
        <div class="pl-qhead"><span class="pill mute">${i.id}</span><span class="chip">CG Code 2560 · ${esc(i.ref)}</span>
          ${a[i.id] ? `<span class="pill ${a[i.id] <= 2 ? "warn" : "ok"}" style="margin-left:auto">${a[i.id]} · ${esc(OI_LABS[a[i.id] - 1])}</span>` : ""}</div>
        <p class="pl-qt">${n + 1}. ${esc(i.t)}</p>
        ${plScale(i.id, a[i.id], OI_LABS)}
        <label class="pl-lab">หลักฐานอ้างอิง (เอกสาร / มติ / วาระ — ไม่ระบุชื่อบุคคล)</label>
        <textarea class="inp pl-ta" data-ev="${i.id}" rows="2" placeholder="เช่น มติที่ประชุมครั้งที่ 3/${bodYear()} วาระ 5 · นโยบายนวัตกรรม ฉบับ ${bodYear() - 1}">${esc(ev[i.id] || "")}</textarea>
      </div>`).join("")}</div>
      <div class="stack">
        <div class="stat hero"><div class="k">คะแนนเฉลี่ยระดับคณะ</div>
          <div class="v">${done.length ? fmt(mean, 2) : "—"}<span style="font-size:14px;font-weight:300;opacity:.7"> / 5</span></div>
          <div class="u">ตอบแล้ว ${done.length} จาก ${OI_ITEMS.length} ประเด็น</div></div>
        <div class="card"><h3>ประเด็นสำหรับหารือ <span class="pill ${lo.length ? "warn" : "mute"}">${lo.length} ประเด็น</span></h3>
          <p class="desc">ประเด็นที่ได้ ≤ 2 — เสนอเข้าวาระพัฒนาคณะกรรมการ และบันทึกเป็นข้อสั่งการได้ในหน้า Compliance</p>
          ${lo.length ? `<ul class="pl-ul">${lo.map(i => `<li><b>${i.id}</b> · ${esc(i.t)} <span class="pill warn">${a[i.id]}</span></li>`).join("")}</ul>`
            : `<div class="note">${done.length ? "ไม่มีประเด็นที่ได้ ≤ 2" : "ยังไม่มีคำตอบ"}</div>`}
          ${lo.length ? `<button class="btn s" id="plBodToDir" style="margin-top:10px">ส่งเป็นร่างข้อสั่งการ → Compliance</button>` : ""}
        </div>
        <div class="card"><h3>ร่างข้อความสำหรับ 56-1</h3>
          <p class="desc">ส่วนที่ 2 ข้อ 7–8 (การประเมินผลการปฏิบัติงานของคณะกรรมการ) — ถ้อยคำกลาง ระดับคณะ ไม่มีชื่อบุคคล · ต้องผ่านการตรวจทานของเลขานุการบริษัทก่อนใช้</p>
          <button class="btn p" id="plBodDraft" ${done.length ? "" : "disabled"}>ร่างข้อความสำหรับ 56-1 ส่วนที่ 2 ข้อ 7–8 (ระดับคณะ)</button>
          ${PL.bod.draft ? `<textarea class="inp pl-ta" id="plBodDraftTxt" rows="9" readonly style="margin-top:10px">${esc(PL.bod.draft)}</textarea>
            <div class="pl-tools"><button class="btn s" id="plBodCopy">คัดลอก</button></div>` : ""}
        </div>
        <div class="card"><h3>ส่งออก / ล้าง</h3>
          ${PL_SRV ? `<div class="pl-tools" style="margin-bottom:8px"><button class="btn p" id="plBodSubmit" ${done.length ? "" : "disabled"}>ส่งผลเข้าฐานข้อมูลกลาง (bod_oi)</button>
            ${_bodSrv ? `<span class="pill ${_bodSrv === "ok" ? "ok" : _bodSrv === "fail" ? "warn" : "mute"}">${_bodSrv === "ok" ? "ส่งแล้ว" : _bodSrv === "fail" ? "ส่งไม่สำเร็จ" : "กำลังส่ง…"}</span>` : ""}</div>
            <p class="desc" style="margin:0 0 8px">ส่งคะแนน OI-1…6 หลักฐาน บริษัท และปีรายงาน ผูกกับบัญชีที่เข้าสู่ระบบ — ผู้ดูแลระบบเห็นเพื่อรวบรวมผลการทดสอบ</p>` : ""}
          <div class="pl-tools"><button class="btn g" id="plBodJson">Export JSON</button><button class="btn g" id="plBodClear">ล้างคำตอบ</button></div>
          <p class="desc" style="margin:8px 0 0">ไฟล์มีเฉพาะรหัสข้อ คะแนน และหลักฐานที่กรอก — ไม่มีข้อมูลบุคคล</p></div>
      </div></div>`;
}
function wireBod(h) {
  plWireScale(h, (k, v) => { PL.bod.a[k] = v; PL.bod.draft = ""; plSave(); render(); });
  h.querySelectorAll("[data-ev]").forEach(t => t.onchange = () => { PL.bod.ev[t.dataset.ev] = t.value.trim(); plSave(); });
  const d = h.querySelector("#plBodDraft"); if (d) d.onclick = () => { PL.bod.draft = bodDraft(); plSave(); render(); };
  const c = h.querySelector("#plBodCopy"); if (c) c.onclick = () => plCopy(PL.bod.draft);
  const payload = () => ({ level: "board-aggregate", ticker: S.t, year: bodYear(),
    items: OI_ITEMS.map(i => ({ id: i.id, ref: i.ref, score: PL.bod.a[i.id] || null, evidence: PL.bod.ev[i.id] || "" })),
    mean: plMean(OI_ITEMS.filter(i => PL.bod.a[i.id]).map(i => PL.bod.a[i.id])) || null });
  const j = h.querySelector("#plBodJson"); if (j) j.onclick = () => plDl(`ois_bod_oi_${S.t}_${bodYear()}.json`, JSON.stringify(payload(), null, 2));
  const x = h.querySelector("#plBodClear"); if (x) x.onclick = () => plAsk(x, "ล้างคำตอบ OI-1…6 ของบริษัท/ปีนี้?", () => {
    const k = PL.bod._k; PL.bodAll[k] = { a: {}, ev: {}, draft: "", _k: k }; bodSel(); plSave(); render(); });
  const yr = h.querySelector("#plBodYear"); if (yr) yr.onchange = () => { PL.bodYear = +yr.value; bodSel(); _bodSrv = ""; plSave(); render(); };
  const sb = h.querySelector("#plBodSubmit"); if (sb) sb.onclick = () => {
    _bodSrv = "pending"; render();
    plSubmit("bod_oi", S.t, payload()).then(ok => { _bodSrv = ok ? "ok" : "fail"; toast(ok ? "ส่งผล BOD OI เข้าฐานข้อมูลกลางแล้ว" : "ส่งไม่สำเร็จ — คำตอบยังอยู่ในเครื่องนี้"); if (S.view === "bod") render(); });
  };
  const td = h.querySelector("#plBodToDir"); if (td) td.onclick = () => {
    const lo = OI_ITEMS.filter(i => PL.bod.a[i.id] && PL.bod.a[i.id] <= 2);
    let n = 0;
    lo.forEach(i => { if (PL.dir.rows.some(r => r.src === "bod" && r.t.startsWith(i.id))) return;
      PL.dir.rows.push(dirRow({ t: `${i.id} · ${i.t}`, src: "bod" })); n++; });
    plSave(); toast(`เพิ่มร่างข้อสั่งการ ${n} รายการ`); go("directives");
  };
}

/* ============================================================================
   B · Board Profile (outside the reference group) — F7 · R4 · D2 · D3
     • ชื่อเมนู/หน้า "Board Profile (outside the reference group)" (PILOT_LABELS ถ้ามี) · ไม่ระบุประเภทองค์กร · ไม่มีกลุ่มธุรกิจตั้งต้น
     • ไม่มี tier, OIS หรือ What-if · ป้าย "นอกโดเมน / Outside the reference sample"
     • เปอร์เซ็นไทล์เป็นตำแหน่งเชิงพรรณนาเทียบการกระจายของ REF-928 เท่านั้น — ไม่จัดอันดับหรือเทียบกับบริษัทอื่น
     • รับบริษัทที่หน้านำเข้าส่งมา (กลุ่ม 4–5 รวมกลุ่มธุรกิจการเงิน) ผ่าน localStorage "ois_bp_target_v1"
     • หมายเหตุ critical mass อ้าง Torchia, Calabrò & Huse (2011) เท่านั้น (D3)
   ============================================================================ */
const PLB = (k, en, th) => { const P = window.PILOT_LABELS || {}, isEn = typeof S === "object" && S.lang === "EN";
  const v = P[k + (isEn ? "_en" : "_th")] ?? (P[k] && typeof P[k] === "object" ? P[k][isEn ? "en" : "th"] : P[k]);
  return typeof v === "string" && v ? v : isEn ? en : th; };
const BP_TITLE = () => PLB("boardprofile", "Board Profile (outside the reference group)", "Board Profile (นอกกลุ่มอ้างอิง)");
const BP_OUTSIDE = () => PLB("outside_sample", "Outside the reference sample", "นอกโดเมน / Outside the reference sample");
const BP_CM = () => PLB("critical_mass", "Critical mass = three or more women directors. Torchia, Calabrò & Huse (2011) report that boards moving from one or two women to at least three were associated with higher firm organizational innovation.",
  "Critical mass = กรรมการหญิงตั้งแต่ 3 คนขึ้นไป · Torchia, Calabrò & Huse (2011) รายงานว่าคณะกรรมการที่เปลี่ยนจากกรรมการหญิง 1–2 คนเป็นอย่างน้อย 3 คน สัมพันธ์กับนวัตกรรมเชิงองค์กรของบริษัทที่สูงขึ้น");
const BP_CM_EN = () => { const P = window.PILOT_LABELS || {}; return typeof P.critical_mass_en === "string" && P.critical_mass_en ? P.critical_mass_en : null; };
/** กลุ่มธุรกิจ — ไม่มีค่าตั้งต้น (F7) · "กลุ่มธุรกิจการเงิน (Financials)" ตามบันทึกอาจารย์ 14 พ.ย. (ไม่ใช้คำว่า สถาบันการเงิน) */
const OD_SECTORS = () => ({
  fin: PLB("financials", "Financials", "กลุ่มธุรกิจการเงิน (Financials)"),
  other: T("Other industry outside the reference base (outside SET industries 1–7)", "อุตสาหกรรมอื่นนอกฐานอ้างอิง (นอก SET อุตสาหกรรม 1–7)"),
  noen: T("No English letter to shareholders", "ไม่มีสารถึงผู้ถือหุ้นภาษาอังกฤษ") });
/* ค่าที่บันทึกจากรุ่นเดิม: กลุ่มธุรกิจเดิม (bank / ins) → Financials · ขนาดคณะตั้งต้น 12 ของรุ่นเดิมไม่ถือเป็นค่าที่ผู้ใช้กรอก */
(() => { const o = PL.od || (PL.od = {});
  if (o.sector === "bank" || o.sector === "ins") o.sector = "fin";
  if (!o._v2) { if (o.bsize === 12 && o.femN === 2 && !o.name) { o.bsize = null; o.femN = null; o.famN = null; } o._v2 = 1; }
  ["name", "sector"].forEach(k => { if (o[k] == null) o[k] = ""; });
})();
/** บริษัทที่หน้านำเข้าส่งมา (กลุ่ม 4–5) — รูปแบบยืดหยุ่น: {ticker,name,industry,financial,bsize|board_size,femN|fem_count|women|fem(สัดส่วน),famN|fam_count|fam(สัดส่วน),pol,group,at} */
function bpTarget() { try { const o = JSON.parse(localStorage.getItem("ois_bp_target_v1") || "null"); return o && typeof o === "object" ? o : null; } catch (e) { return null; } }
function bpApplyTarget(force) {
  const t = bpTarget(); if (!t) return null;
  const sig = JSON.stringify(t); if (!force && PL.od._bpSig === sig) return t;
  const n = v => v === "" || v === null || v === undefined || isNaN(+v) ? null : +v;
  const inp = Object.assign({}, t, t.inputs || {});
  const bs = n(inp.bsize ?? inp.board_size ?? inp.boardSize ?? inp.directors);
  const cnt = (a, b, r) => { const x = n(a ?? b); if (x !== null) return Math.round(x); const p = n(r); return p !== null && bs ? Math.round((p > 1 ? p / 100 : p) * bs) : null; };
  Object.assign(PL.od, { name: String(t.name || t.ticker || "").slice(0, 120), ticker: t.ticker || "",
    sector: t.financial || /financ|การเงิน/i.test(String(t.industry || t.sector || "")) ? "fin" : t.noEnglish || t.no_en ? "noen" : "other",
    bsize: bs, femN: cnt(inp.femN, inp.fem_count ?? inp.women, inp.fem), famN: cnt(inp.famN, inp.fam_count, inp.fam),
    pol: inp.pol ? 1 : 0, draft: "", _bpSig: sig, _bpFrom: t.ticker || t.name || "1" });
  plSave(); return t;
}
let _odRef = null;
const odQ = x => Math.round(x * 1e6) / 1e6;
/* เปอร์เซ็นไทล์เทียบ REF-928 — ออฟไลน์คำนวณจากจุดอ้างอิงที่ฝังไว้ (ไม่แสดงค่าเฉลี่ย/จุดตัด) · เซิร์ฟเวอร์ถาม POST /api/outdomain
   ปัด 6 ตำแหน่งทั้งฐานและค่าป้อนก่อนจัดอันดับ (ตรงกับ Engine.od ใน server/ois_engine.py) */
function odRef() {
  if (_odRef) return _odRef;
  if (OIS_SRV) return _odRef = { W: [], F: [] };
  const W = REF_PTS.map(p => odQ(p[8] + OM.W)).sort((a, b) => a - b), F = REF_PTS.map(p => odQ(p[6] + OM.F)).sort((a, b) => a - b);
  return _odRef = { W, F };
}
/** แถบฮิสโตแกรมของการกระจายในฐานอ้างอิง (OIS.hist · ช่องละ 5 จุดเปอร์เซ็นต์) พร้อมเส้นตำแหน่งค่าที่ป้อน — ไม่มีจุดของบริษัทอื่น */
function odStrip(key, v, color) {
  const H0 = OIS.hist || {}, bins = (H0[key] || []).slice(0, 14), bw0 = H0.w || .05, mx = bins.length * bw0 || .7;
  const top = Math.max(1, ...bins), W = 320, H = 56, bw = W / Math.max(1, bins.length);
  const bars = bins.map((b, i) => `<rect x="${(i * bw).toFixed(1)}" y="${(H - 10 - b / top * (H - 14)).toFixed(1)}" width="${(bw - 1.5).toFixed(1)}" height="${(b / top * (H - 14)).toFixed(1)}" rx="1.5" fill="var(--q3)"/>`).join("");
  const x = Math.min(W - 1, v / mx * W);
  return `<svg class="pl-hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T("Position against the reference distribution", "ตำแหน่งค่าเทียบการกระจายของฐานอ้างอิง"))}">${bars}
    <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="2" y2="${H - 8}" stroke="${color}" stroke-width="2"/>
    <text x="0" y="${H - 1}" font-size="8" fill="var(--ink-3)">0%</text><text x="${W}" y="${H - 1}" font-size="8" fill="var(--ink-3)" text-anchor="end">${fmt(mx * 100, 0)}%</text></svg>`;
}
function odCalc() {
  const o = PL.od, ok = +o.bsize >= 1, r = odRef(), bs = ok ? +o.bsize : NaN;
  if (!ok) return { ok, bs, fem: NaN, fam: NaN, femP: NaN, famP: NaN, fn: null };
  const fem = clamp((+o.femN || 0) / bs, 0, 1), fam = clamp((+o.famN || 0) / bs, 0, 1);
  if (OIS_SRV) { const p = OIS_REMOTE.od({ fem_count: +o.femN || 0, fam_count: +o.famN || 0, bsize: bs }) || {};
    return { ok, bs, fem, fam, femP: p.femP ?? NaN, famP: p.famP ?? NaN, fn: Math.round(+o.femN || 0) }; }
  return { ok, bs, fem, fam, femP: midRank(r.W, odQ(fem)), famP: midRank(r.F, odQ(fam)), fn: Math.round(+o.femN || 0) };
}
function odDraft() {
  const o = PL.od, c = odCalc(), nm = o.name.trim() || T("the company", "บริษัท");
  if (!c.ok) return "";
  if (S.lang === "EN") return `In fiscal year ${bodYear() - 543}, the board of ${nm} used descriptive information comparing its board composition with the distribution of the REF-928 reference base (928 firm-years of listed companies) as context for its discussion of board development. ` +
    `Women directors were ${fmt(c.fem * 100, 1)}% of the board (${c.fn} of ${c.bs}), a descriptive position at percentile ${fmt(c.femP, 0)} of the reference distribution, and directors related to major shareholders or the family were ${fmt(c.fam * 100, 1)}%, at percentile ${fmt(c.famP, 0)}. ` +
    `These positions describe where the values sit in the reference distribution; they are not scores and do not rank the company against other companies. Because ${nm} is outside the reference sample, no tier, score or what-if result is produced. ` +
    `The board uses this information only as context for reviewing its skill matrix and its board-level self-assessment; no individual director is assessed.`;
  return `ในปีบัญชี ${bodYear()} คณะกรรมการ${nm}ได้ใช้ข้อมูลเชิงพรรณนาเปรียบเทียบองค์ประกอบของคณะกรรมการกับการกระจายในฐานอ้างอิง REF-928 (928 บริษัท-ปีของบริษัทจดทะเบียน) ประกอบการหารือเรื่องการพัฒนาคณะกรรมการ ` +
    `โดยสัดส่วนกรรมการหญิงร้อยละ ${fmt(c.fem * 100, 1)} (${c.fn} คน จาก ${c.bs} คน) อยู่ที่ตำแหน่งเปอร์เซ็นไทล์ ${fmt(c.femP, 0)} ของการกระจายในฐานอ้างอิง และสัดส่วนกรรมการที่มีความสัมพันธ์กับผู้ถือหุ้นใหญ่/ครอบครัวร้อยละ ${fmt(c.fam * 100, 1)} อยู่ที่ตำแหน่งเปอร์เซ็นไทล์ ${fmt(c.famP, 0)} ` +
    `ตำแหน่งดังกล่าวเป็นข้อมูลเชิงพรรณนา ไม่ใช่คะแนน และไม่ใช้จัดอันดับหรือเปรียบเทียบกับบริษัทอื่น และเนื่องจาก${nm}อยู่นอกกลุ่มอ้างอิง จึงไม่มีการจัดระดับ คะแนน หรือผลจำลองสถานการณ์ ` +
    `คณะกรรมการใช้ข้อมูลดังกล่าวเป็นบริบทประกอบการทบทวนทักษะและองค์ประกอบของคณะกรรมการ (skill matrix) และการประเมินตนเองระดับคณะเท่านั้น ไม่มีการประเมินกรรมการรายบุคคล`;
}
function viewOutdomain() {
  const tg = bpApplyTarget(false), o = PL.od, c = odCalc(), SEC = OD_SECTORS();
  const inp = (k, lab, type, extra) => `<label class="pl-lab">${lab}<input class="inp" data-od="${k}" type="${type}" value="${esc(o[k] ?? "")}" ${extra || ""}></label>`;
  const cm = BP_CM_EN() && S.lang === "EN" ? BP_CM_EN() : BP_CM();
  const pctTxt = p => T(`descriptive position: percentile ${fmt(p, 0)} of the reference distribution`, `ตำแหน่งเชิงพรรณนา: เปอร์เซ็นไทล์ ${fmt(p, 0)} ของการกระจายในฐานอ้างอิง`);
  return pageHead("Board Profile", BP_TITLE(),
    T(`For a board outside the REF-928 reference group (SET industries 1–7 with an English letter to shareholders), including companies routed from the import check (client groups 4–5, incl. Financials). The page gives <b>descriptive positions only</b> — no tier, OpenInnoScore or What-if (R4 · D2).`,
      `สำหรับคณะกรรมการที่อยู่นอกกลุ่มอ้างอิง REF-928 (SET อุตสาหกรรม 1–7 ที่มีสารถึงผู้ถือหุ้นภาษาอังกฤษ) รวมบริษัทที่ส่งมาจากการตรวจตอนนำเข้า (ลูกค้ากลุ่ม 4–5 รวมกลุ่มธุรกิจการเงิน) · หน้านี้ให้<b>ตำแหน่งเชิงพรรณนาเท่านั้น</b> — ไม่มีระดับ (tier) คะแนน OpenInnoScore หรือ What-if (R4 · D2)`))
    + `<div class="sbar mute bp-bar" style="margin-bottom:14px"><div class="sbtop"><span class="pill crit" id="bpOutside">${esc(BP_OUTSIDE())}</span>
        <b>${esc(o.name.trim() || T("Company (not named)", "บริษัท (ยังไม่ระบุชื่อ)"))}</b>${o.sector ? ` · ${esc(SEC[o.sector] || "")}` : ""}</div>
      <div class="sbmsg">${T("Values below are positions of board-composition ratios within the reference distribution. They are not scores, do not say good or bad, and are not compared with or ranked against any other company.",
        "ค่าด้านล่างเป็นตำแหน่งของสัดส่วนองค์ประกอบคณะกรรมการในการกระจายของฐานอ้างอิง ไม่ใช่คะแนน ไม่ได้บอกว่าดีหรือไม่ดี และไม่เทียบหรือจัดอันดับกับบริษัทอื่น")}</div></div>`
    + (tg ? `<div class="note bp-imp" style="margin-bottom:12px">${T("Routed from the import page", "ส่งมาจากหน้านำเข้าข้อมูล")}: <b>${esc(tg.name || tg.ticker || "—")}</b>${tg.industry ? ` · ${esc(tg.industry)}` : ""}${tg.group ? ` · ${T("client group", "กลุ่มลูกค้า")} ${esc(tg.group)}` : ""}
        <button class="btn g" id="plOdReload" style="padding:3px 10px;margin-left:8px">${T("Reload imported values", "โหลดค่าที่นำเข้าอีกครั้ง")}</button></div>` : "")
    + `<div class="grid g-side">
      <div class="card"><h3>${T("Board composition", "ข้อมูลองค์ประกอบคณะกรรมการ")}</h3><p class="desc">${T("Enter head counts (board level) — no names. Actual board size is required.", "กรอกจำนวนคน (ระดับคณะ) — ไม่ต้องระบุชื่อ · ต้องกรอกจำนวนกรรมการจริง")}</p>
        ${inp("name", T("Company name (display only, not sent off this device)", "ชื่อบริษัท (แสดงผลเท่านั้น ไม่บันทึกออกนอกเครื่อง)"), "text", `placeholder="${esc(T("e.g. Company A", "เช่น บริษัท ก"))}"`)}
        <label class="pl-lab">${T("Business group", "กลุ่มธุรกิจ")}<select class="sel" data-od="sector"><option value=""${o.sector ? "" : " selected"}>${T("— select —", "— เลือก —")}</option>${Object.entries(SEC).map(([k, v]) => `<option value="${k}"${o.sector === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
        ${inp("bsize", T("Total directors (persons)", "จำนวนกรรมการทั้งหมด (คน)"), "number", 'min="1" max="30"')}
        ${inp("femN", T("Women directors (persons)", "กรรมการหญิง (คน)"), "number", 'min="0" max="30"')}
        ${inp("famN", T("Directors related to major shareholders / family (persons)", "กรรมการที่มีความสัมพันธ์กับผู้ถือหุ้นใหญ่/ครอบครัว (คน)"), "number", 'min="0" max="30"')}
        <label class="pl-lab">${T("Directors with political ties", "มีกรรมการที่มีความเชื่อมโยงทางการเมือง (political ties)")}
          <div class="seg" style="margin-top:4px"><button class="btn ${o.pol ? "g" : "p"}" data-odpol="0" style="padding:5px 12px">${T("None", "ไม่มี")}</button><button class="btn ${o.pol ? "p" : "g"}" data-odpol="1" style="padding:5px 12px">${T("Yes", "มี")}</button></div></label>
      </div>
      <div class="stack">
        <div class="card"><h3>${T("(2) Descriptive profile against the REF-928 distribution", "(2) โปรไฟล์เชิงพรรณนาเทียบการกระจายของ REF-928")}</h3>
          <p class="desc">${T("Mid-rank percentile of the entered value within the distribution of 928 firm-years · bars = reference histogram (5-point bins), line = this board · reference means and cut values are not shown",
            "เปอร์เซ็นไทล์แบบ mid-rank ของค่าที่ป้อนในการกระจายของ 928 บริษัท-ปี · แถบ = ฮิสโตแกรมของฐานอ้างอิง (ช่องละ 5 จุดเปอร์เซ็นต์) เส้น = คณะกรรมการนี้ · ไม่แสดงค่าเฉลี่ยและจุดตัดของฐานอ้างอิง")}${OIS_SRV ? T(" · computed on the server", " · คำนวณบนเซิร์ฟเวอร์") : ""}</p>
          ${c.ok ? `<div class="grid g2">
            <div class="pl-prof"><div class="k">${T("Women directors", "สัดส่วนกรรมการหญิง")}</div><div class="v">${fmt(c.fem * 100, 1)}%<span> · ${pctTxt(c.femP)}</span></div>
              ${odStrip("W", c.fem, "var(--s1)")}
              <div class="u">${T(`Women directors: ${c.fn} of ${c.bs}`, `กรรมการหญิง ${c.fn} คน จาก ${c.bs} คน`)} — ${c.fn < CRIT_N ? T(`below critical mass (${CRIT_N})`, `ต่ำกว่า critical mass (${CRIT_N} คน)`) : T(`critical mass reached (≥ ${CRIT_N})`, `ถึง critical mass (≥ ${CRIT_N} คน)`)}
                <div class="bp-cm" id="bpCm">${esc(cm)}</div></div></div>
            <div class="pl-prof"><div class="k">${T("Family / major-shareholder directors", "สัดส่วนกรรมการครอบครัว / ผู้ถือหุ้นใหญ่")}</div><div class="v">${fmt(c.fam * 100, 1)}%<span> · ${pctTxt(c.famP)}</span></div>
              ${odStrip("F", c.fam, "var(--s2)")}
              <div class="u">${T("Position within the reference distribution — not a score and not a comparison with other companies", "ตำแหน่งในการกระจายของฐานอ้างอิง — ไม่ใช่คะแนนและไม่ใช่การเทียบกับบริษัทอื่น")}</div></div>
          </div>` : `<div class="note warn" id="bpNeedSize">${T("Enter the actual number of directors to see the descriptive profile.", "กรอกจำนวนกรรมการจริงเพื่อดูโปรไฟล์เชิงพรรณนา")}</div>`}
          <div class="note ${o.pol ? "warn" : ""}" style="margin-top:12px"><b>Political ties: ${o.pol ? T("yes", "มี") : T("none", "ไม่มี")}</b> · ${T("Political ties are not used as a positive reason (R6) and are sensitive data under PDPA s.26 — shown as board-level context only.",
            "political ties ไม่ใช้เป็นเหตุผลเชิงบวก (R6) และเป็นข้อมูลอ่อนไหวตาม PDPA ม.26 — แสดงเป็นบริบทระดับคณะเท่านั้น")}</div>
        </div>
        <div class="grid g2">
          <div class="card"><h3>${T("(1) BOD question set OI-1…OI-6", "(1) ชุดคำถาม BOD OI-1…OI-6")}</h3>
            <p class="desc">${T("Fully usable for a board outside the reference group — board-level self-assessment under the CG Code 2017", "ส่วนที่ใช้ได้เต็มรูปแบบกับคณะกรรมการนอกกลุ่มอ้างอิง — ประเมินตนเองระดับคณะตาม CG Code 2560")}</p>
            <button class="btn p" data-goto="bod">${T("Go to BOD Self-Assessment →", "ไปที่ BOD Self-Assessment →")}</button>
            ${Object.keys(PL.bod.a).length ? `<div class="u" style="font-size:11.5px;color:var(--ink-3);margin-top:8px">${T(`Answered ${Object.keys(PL.bod.a).length}/6`, `ตอบแล้ว ${Object.keys(PL.bod.a).length}/6 ประเด็น`)}</div>` : ""}</div>
          <div class="card"><h3>${T("(3) Board-level draft text for 56-1", "(3) ร่างข้อความระดับคณะสำหรับ 56-1")}</h3>
            <p class="desc">${T("Part 2 items 7–8 · associational wording · no tier or score", "ส่วนที่ 2 ข้อ 7–8 · ถ้อยคำแบบ association ไม่ใช่ causal · ไม่มีระดับหรือคะแนน")}</p>
            <button class="btn s" id="plOdDraft" ${c.ok ? "" : "disabled"}>${T("Create draft text", "สร้างร่างข้อความ")}</button>
            ${o.draft ? `<textarea class="inp pl-ta" rows="8" readonly style="margin-top:10px">${esc(o.draft)}</textarea>
              <div class="pl-tools"><button class="btn g" id="plOdCopy">${T("Copy", "คัดลอก")}</button></div>` : ""}</div>
        </div>
        <div class="note" style="font-size:11.2px">${PL_LEGAL}</div>
      </div></div>`;
}
function wireOutdomain(h) {
  h.querySelectorAll("[data-od]").forEach(el => el.onchange = () => {
    const k = el.dataset.od; PL.od[k] = el.type === "number" ? (el.value === "" ? null : Math.max(0, Math.round(+el.value || 0))) : el.value; PL.od.draft = ""; plSave(); render();
  });
  h.querySelectorAll("[data-odpol]").forEach(b => b.onclick = () => { PL.od.pol = +b.dataset.odpol; PL.od.draft = ""; plSave(); render(); });
  const d = h.querySelector("#plOdDraft"); if (d) d.onclick = () => { PL.od.draft = odDraft(); plSave(); render(); };
  const c = h.querySelector("#plOdCopy"); if (c) c.onclick = () => plCopy(PL.od.draft);
  const rl = h.querySelector("#plOdReload"); if (rl) rl.onclick = () => { bpApplyTarget(true); render(); };
}
window.bpApplyTarget = bpApplyTarget;


/* ============================================================================
   C · ข้อสั่งการของบอร์ดและ Compliance program (Level 3 add-on)
   ============================================================================ */
const DIR_SRC = { res: "มติที่ประชุม", compass: "Board Strategy Compass", bod: "BOD Self-Assessment", report: "Insight (Add to Report)" };
const DIR_ST = { todo: "ยังไม่เริ่ม", doing: "กำลังทำ", done: "เสร็จ", late: "เลื่อน" };
const DIR_CYC = { m: "รายเดือน", q: "รายไตรมาส" };
const dirRow = o => Object.assign({ id: plId(), t: "", src: "res", own: "", due: "", cyc: "q", st: "todo" }, o || {});
const dirMonth = d => d ? d.slice(0, 7) : "ไม่ระบุกำหนดส่ง";
const dirQuarter = d => d ? `${d.slice(0, 4)} Q${Math.ceil(+d.slice(5, 7) / 3)}` : "ไม่ระบุกำหนดส่ง";
const dirThDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—";
/** แทนชื่อบริษัทอื่น (ไม่ใช่ keep) ด้วยคำกลาง — rpAnon ของ v2_reports.js ถ้ามี */
const dirAnon = (txt, keep) => typeof rpAnon === "function" ? rpAnon(txt, keep || null) : txt;
/** ดึงร่างจาก Compass (S.sc) และรายการ insight (S.report) — เฉพาะข้อความ ไม่เอาชื่อบุคคล */
function dirImport() {
  const out = [];
  Object.entries(S.sc || {}).forEach(([k, o]) => {
    if (!o || typeof o !== "object") return;
    const t = k.replace(/^sc:/, "");
    ["a0", "a1", "a2"].forEach(f => { if (o[f] && String(o[f]).trim()) out.push(dirRow({ t: `[${t}] ${dirAnon(String(o[f]).trim(), t).slice(0, 140)}`, src: "compass", due: o.next && /^\d{4}-\d{2}-\d{2}$/.test(o.next) ? o.next : "" })); });
    (o.plan || []).forEach(p => { if (p && p.t) out.push(dirRow({ t: `[${t}] ${dirAnon(String(p.t), t).slice(0, 140)}`, src: "compass" })); });
  });
  /* Insight (Add to Report): S.report = [{ t: ticker, kind, h: หัวข้อ, p: รายละเอียด }] — หัวข้อใช้ข้อความ insight (h → p) ไม่ใช่ ticker
     และขึ้นต้นด้วย [TICKER] ให้ Follow-up / ร่าง 56-1 ผูกกับบริษัทได้ · ชื่อบริษัทอื่นในข้อความผ่าน rpAnon (ภาคผนวก ง: directives) */
  (Array.isArray(S.report) ? S.report : []).forEach(r => {
    const tk = r && typeof r === "object" && r.t && byT[r.t] ? r.t : "";
    const txt = typeof r === "string" ? r : (r && (r.h || r.title || r.lab || r.text || r.p)) || "";
    if (String(txt).trim()) out.push(dirRow({ t: (tk ? `[${tk}] ` : "") + dirAnon(String(txt).trim(), tk).slice(0, 140), src: "report" }));
  });
  return out;
}
function dirEmail() {
  const rows = PL.dir.rows.filter(r => r.st !== "done"), today = new Date().toISOString().slice(0, 10);
  const late = rows.filter(r => r.due && r.due < today), soon = rows.filter(r => !r.due || r.due >= today);
  const li = r => `  - ${r.t || "(ไม่มีหัวข้อ)"} · ผู้รับผิดชอบ: ${r.own || "ยังไม่กำหนด"} · กำหนดส่ง ${dirThDate(r.due)} · สถานะ ${DIR_ST[r.st]}`;
  return `เรื่อง: [OpenInnoScore] สรุปข้อสั่งการบอร์ดที่ยังเปิดอยู่ · ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}\nถึง: ตำแหน่งผู้รับผิดชอบตามรายการ (ระบบจะส่งตามกล่องจดหมายของตำแหน่ง ไม่ใช่บุคคล)\n\n` +
    `เกินกำหนด (${late.length})\n${late.map(li).join("\n") || "  - ไม่มี"}\n\nยังไม่ถึงกำหนด (${soon.length})\n${soon.map(li).join("\n") || "  - ไม่มี"}\n\n` +
    `ข้อความนี้สร้างโดยต้นแบบ OpenInnoScore™ — ยังไม่ได้ส่งจริง การส่งต้องเปิดใช้บนเซิร์ฟเวอร์ (Phase ถัดไป)`;
}
function viewDirectives() {
  const rows = PL.dir.rows, mode = PL.dir.mode;
  const sel = (r, k, map) => `<select class="sel pl-cell" data-dr="${r.id}" data-k="${k}">${Object.entries(map).map(([v, l]) => `<option value="${v}"${r[k] === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const txt = (r, k, ph) => `<input class="inp pl-cell" data-dr="${r.id}" data-k="${k}" value="${esc(r[k])}" placeholder="${esc(ph)}">`;
  const open = rows.filter(r => r.st !== "done").length, late = rows.filter(r => r.st !== "done" && r.due && r.due < new Date().toISOString().slice(0, 10)).length;
  const table = `<div class="tw"><table class="pl-tbl"><thead><tr><th>หัวข้อ</th><th>ที่มา</th><th>ผู้รับผิดชอบ (ตำแหน่ง)</th><th>กำหนดส่ง</th><th>รอบติดตาม</th><th>สถานะ</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr class="${r.st === "done" ? "pl-done" : ""}">
      <td style="min-width:240px">${txt(r, "t", "หัวข้อข้อสั่งการ")}</td><td>${sel(r, "src", DIR_SRC)}</td>
      <td>${txt(r, "own", "เช่น เลขานุการบริษัท / CSO")}</td><td><input class="inp pl-cell" type="date" data-dr="${r.id}" data-k="due" value="${esc(r.due)}"></td>
      <td>${sel(r, "cyc", DIR_CYC)}</td><td>${sel(r, "st", DIR_ST)}</td>
      <td><button class="lnk" data-drdel="${r.id}" title="ลบ">✕</button></td></tr>`).join("")
      : `<tr><td colspan="7" style="color:var(--ink-3)">ยังไม่มีข้อสั่งการ — กด "เพิ่มแถว" หรือ "นำเข้าจาก Compass"</td></tr>`}</tbody></table></div>`;
  const groupView = key => {
    const g = {}; rows.forEach(r => { const k = key(r.due); (g[k] = g[k] || []).push(r); });
    const keys = Object.keys(g).sort();
    return keys.length ? keys.map(k => `<div class="card" style="margin-bottom:10px"><h3>${esc(k)} <span class="pill mute">${g[k].length} รายการ</span></h3>
      <ul class="pl-ul">${g[k].map(r => `<li><span class="pill ${r.st === "done" ? "ok" : r.st === "late" ? "warn" : "mute"}">${DIR_ST[r.st]}</span> ${esc(r.t || "(ไม่มีหัวข้อ)")}
        <span style="color:var(--ink-3)">· ${esc(r.own || "ยังไม่กำหนดผู้รับผิดชอบ")} · ${dirThDate(r.due)} · ${esc(DIR_SRC[r.src])}</span></li>`).join("")}</ul></div>`).join("")
      : `<div class="note">ยังไม่มีรายการ</div>`;
  };
  return pageHead("Pilot · Level 3 add-on (ต้นแบบ)", "ข้อสั่งการของบอร์ดและ Compliance program",
    `บันทึกข้อสั่งการที่เกิดจากมติที่ประชุม, Strategy Compass และ BOD Self-Assessment แล้วสร้างตารางติดตามรายเดือน/รายไตรมาส ·
     ผู้รับผิดชอบระบุเป็น<b>ตำแหน่ง</b> ไม่ใช่ชื่อบุคคล · ข้อมูลอยู่ในเครื่องผู้ใช้เท่านั้น`)
    + `<div class="grid g4 tight" style="margin-bottom:14px">
      <div class="stat"><div class="k">ข้อสั่งการทั้งหมด</div><div class="v">${rows.length}</div></div>
      <div class="stat"><div class="k">ยังเปิดอยู่</div><div class="v">${open}</div></div>
      <div class="stat"><div class="k">เกินกำหนด</div><div class="v" style="color:${late ? "var(--crit)" : "inherit"}">${late}</div></div>
      <div class="stat"><div class="k">เสร็จแล้ว</div><div class="v">${rows.length - open}</div></div></div>`
    + `<div class="pl-tools" style="margin-bottom:12px">
      <div class="seg">${[["table", "ตาราง"], ["m", "Compliance program รายเดือน"], ["q", "รายไตรมาส"]].map(([k, l]) => `<button class="btn ${mode === k ? "p" : "g"}" data-dmode="${k}" style="padding:5px 12px">${l}</button>`).join("")}</div>
      <span class="spacer"></span>
      <button class="btn s" id="plDirAdd">+ เพิ่มแถว</button>
      <button class="btn s" id="plDirImport">นำเข้าจาก Compass</button>
      <button class="btn g" id="plDirCsv">Export CSV</button>
      <span title="ต้องเปิดใช้บนเซิร์ฟเวอร์ (Phase ถัดไป) — ดูหน้าการเชื่อมต่อ"><button class="btn g" id="plDirMail" disabled>Email แจ้งเตือน Issues</button></span></div>`
    + (mode === "table" ? `<div class="card">${table}</div>` : groupView(mode === "m" ? dirMonth : dirQuarter))
    + `<div class="card" style="margin-top:14px"><h3>ตัวอย่างอีเมลแจ้งเตือนที่ระบบจะส่ง <span class="pill mute">ยังไม่ส่ง · ดูหน้าการเชื่อมต่อ</span></h3>
      <p class="desc">ส่งถึงกล่องจดหมายของตำแหน่ง (role mailbox) ไม่ใช่บุคคล · เนื้อหามีเฉพาะหัวข้อ กำหนดส่ง และสถานะ</p>
      <pre class="pl-pre">${esc(dirEmail())}</pre></div>`;
}
function wireDirectives(h) {
  const find = id => PL.dir.rows.find(r => r.id === id);
  h.querySelectorAll("[data-dr]").forEach(el => el.onchange = () => { const r = find(el.dataset.dr); if (!r) return; r[el.dataset.k] = el.value; plSave();
    if (el.tagName === "SELECT" && el.dataset.k === "st") render(); });
  h.querySelectorAll("[data-drdel]").forEach(b => b.onclick = () => { PL.dir.rows = PL.dir.rows.filter(r => r.id !== b.dataset.drdel); plSave(); render(); });
  h.querySelectorAll("[data-dmode]").forEach(b => b.onclick = () => { PL.dir.mode = b.dataset.dmode; plSave(); render(); });
  const a = h.querySelector("#plDirAdd"); if (a) a.onclick = () => { PL.dir.rows.push(dirRow()); PL.dir.mode = "table"; plSave(); render();
    const last = $$("#v-directives [data-k='t']").pop(); if (last) last.focus(); };
  const im = h.querySelector("#plDirImport"); if (im) im.onclick = () => {
    const d = dirImport().filter(n => !PL.dir.rows.some(r => r.t === n.t));
    if (!d.length) return toast("ไม่พบร่างใหม่ใน Compass / รายงาน — กรอกช่องการดำเนินการใน Compass ก่อน");
    PL.dir.rows.push(...d); PL.dir.mode = "table"; plSave(); toast(`นำเข้า ${d.length} รายการเป็นร่าง`); render();
  };
  const c = h.querySelector("#plDirCsv"); if (c) c.onclick = () => plDl(`ois_directives_${plBE()}.csv`,
    plCsv([["หัวข้อ", "ที่มา", "ผู้รับผิดชอบ(ตำแหน่ง)", "กำหนดส่ง", "รอบติดตาม", "สถานะ"], ...PL.dir.rows.map(r => [r.t, DIR_SRC[r.src], r.own, r.due, DIR_CYC[r.cyc], DIR_ST[r.st]])]), "text/csv;charset=utf-8");
}

/* ============================================================================
   D · แบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2) ย้ายไป v2_irb.js (MVP1 · ตามภาพจำลองของอาจารย์ 30 ต.ค. 2569)
   ส่วนนี้คงไว้เฉพาะตัวช่วยที่หน้าอื่นใช้ร่วม: plMe / plIsAdmin (สิทธิ์ผู้ดูแลจาก /api/me) และ svMedian
   ============================================================================ */
const svMedian = a => { const b = a.filter(v => typeof v === "number" && !isNaN(v)).sort((x, y) => x - y); if (!b.length) return NaN;
  const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
/* ผลรวม/สถิติผู้ดูแล: ฉบับเซิร์ฟเวอร์ใช้ role admin จาก /api/me */
let _plMe = null, _plMeAsk = false;
function plMe() {
  if (!PL_SRV || _plMe || _plMeAsk || typeof window.OIS_API.me !== "function") return _plMe;
  _plMeAsk = true;
  Promise.resolve().then(() => window.OIS_API.me()).then(m => { _plMe = m && m.ok !== false ? m : { role: "user" };
    if (["survey", "syslog", "consent", "pilotrec", "expertrec"].includes(S.view)) render(); }).catch(() => { _plMe = { role: "user" }; });
  return null;
}
const plIsAdmin = () => !!(plMe() && _plMe.role === "admin");

/* ============================================================================
   E · System log — ระดับรวม ไม่มีข้อมูลบุคคล
   ============================================================================ */
function logEvent(kind, view, ms) {
  const L = PL.log;
  if (kind === "render") { const r = L.render[view] = L.render[view] || { n: 0, sum: 0, max: 0 };
    r.n++; r.sum += ms; r.max = Math.max(r.max, ms); if (r.n % 10 === 1) plSave(); }
}
function plCrash(msg, src) {
  const L = PL.log; L.crash++; L.errs.unshift({ at: new Date().toISOString().slice(0, 16), view: S.view, src: src || "error", msg: String(msg || "").slice(0, 200) });
  L.errs = L.errs.slice(0, 50); plSave();
}
window.addEventListener("error", e => plCrash(e.message, "onerror"));
window.addEventListener("unhandledrejection", e => plCrash(e.reason && e.reason.message || e.reason, "promise"));
/* เวลาสร้างหน้า: ภาคผนวก ง — เดิมวัดเฉพาะ render() ชั้นนี้ ไม่รวมงานหลัง render ของไฟล์ที่โหลดทีหลัง (v2_tiers.js ห่อ render ชั้นนอก)
   และ layout/paint → เริ่มจับเวลาที่ชั้นนอกสุดในรอบเดียวกัน (microtask แรกหลังเรียก) ไม่ได้ จึงวัดจาก "ก่อนเริ่ม" ถึง
   หลังรอบวาดภาพถัดไป (requestAnimationFrame → setTimeout 0) ซึ่งรวมทุกชั้นที่ห่อ render และ layout/paint · หลายครั้งในเฟรมเดียวนับครั้งเดียว */
let _plT0 = null;
(() => { const _r = render; render = function () {
  const first = _plT0 === null; if (first) _plT0 = performance.now();
  const view = S.view;
  try { return _r.apply(this, arguments); }
  finally {
    if (first) {
      const done = () => { const ms = performance.now() - _plT0; _plT0 = null; logEvent("render", view, ms); };
      if (typeof requestAnimationFrame === "function" && document.visibilityState !== "hidden") requestAnimationFrame(() => setTimeout(done, 0));
      else setTimeout(done, 0);
    }
  }
}; })();
const LOG_SEV = { low: "ต่ำ", mid: "ปานกลาง", high: "สูง" };
function viewSyslog() {
  const L = PL.log, open = L.issues.filter(i => !i.closed), views = Object.entries(L.render).sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n);
  const navLab = id => (NAV.find(n => n.id === id) || {}).lab || id;
  return pageHead("Pilot · การติดตามระบบ", "System log (ระดับรวม ไม่มีข้อมูลบุคคล)",
    `นับจำนวน crash (window.onerror / unhandledrejection), เวลาสร้างหน้าและรายงานแต่ละหน้า (รวมงานหลัง render และการวาดหน้าจอ) และบันทึกปัญหาที่ผู้ทดสอบพบ · เก็บในเครื่องเท่านั้น ·
     ส่วนท้าย: ตรวจการคำนวณรายบริษัทสำหรับอาจารย์/ผู้ดูแล`)
    + `<div class="grid g4 tight" style="margin-bottom:14px">
      <div class="stat"><div class="k">Crash ที่จับได้</div><div class="v" style="color:${L.crash ? "var(--crit)" : "inherit"}">${L.crash}</div><div class="u">ตั้งแต่เริ่มเก็บ</div></div>
      <div class="stat"><div class="k">ปัญหาที่เปิดอยู่</div><div class="v">${open.length}</div><div class="u">จาก ${L.issues.length} รายการ</div></div>
      <div class="stat"><div class="k">หน้าที่วัดแล้ว</div><div class="v">${views.length}</div><div class="u">${fmt(views.reduce((s, v) => s + v[1].n, 0))} ครั้งที่สร้างหน้า</div></div>
      <div class="stat"><div class="k">เวลาสร้างหน้าสูงสุด</div><div class="v">${fmt(Math.max(0, ...views.map(v => v[1].max)), 0)}<span style="font-size:13px;font-weight:300"> ms</span></div><div class="u">${views.length ? esc(navLab(views.sort((a, b) => b[1].max - a[1].max)[0][0])) : "—"}</div></div></div>`
    + `<div class="grid g2">
      <div class="card"><h3>เวลาสร้างหน้า / รายงาน (ms)</h3><p class="desc">วัดรอบ render() ของแต่ละหน้า · เฉลี่ยและสูงสุด</p>
        <div class="tw"><table><thead><tr><th>หน้า</th><th class="n">ครั้ง</th><th class="n">เฉลี่ย</th><th class="n">สูงสุด</th></tr></thead><tbody>
        ${views.sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n).map(([k, v]) => `<tr><td>${esc(navLab(k))}</td><td class="n">${v.n}</td><td class="n">${fmt(v.sum / v.n, 1)}</td><td class="n">${fmt(v.max, 1)}</td></tr>`).join("") || `<tr><td colspan="4" style="color:var(--ink-3)">ยังไม่มีข้อมูล</td></tr>`}</tbody></table></div></div>
      <div class="card"><h3>บันทึกปัญหาที่พบ</h3><p class="desc">ผู้ทดสอบบันทึกเอง — ไม่ต้องระบุชื่อ</p>
        <div class="pl-form"><input class="inp" id="plIsT" placeholder="หัวข้อปัญหา">
          <select class="sel" id="plIsV">${NAV.map(n => `<option value="${n.id}"${n.id === S.view ? " selected" : ""}>${esc(n.lab)}</option>`).join("")}</select>
          <select class="sel" id="plIsS">${Object.entries(LOG_SEV).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
          <button class="btn p" id="plIsAdd">เพิ่ม</button></div>
        <div class="tw" style="margin-top:10px"><table><thead><tr><th>เวลา</th><th>หัวข้อ</th><th>หน้า</th><th>ความรุนแรง</th><th></th></tr></thead><tbody>
        ${L.issues.map((i, n) => `<tr class="${i.closed ? "pl-done" : ""}"><td>${esc(i.at)}</td><td>${esc(i.t)}</td><td>${esc(navLab(i.v))}</td><td><span class="pill ${i.sev === "high" ? "crit" : i.sev === "mid" ? "warn" : "mute"}">${LOG_SEV[i.sev]}</span></td>
          <td><button class="lnk" data-isclose="${n}">${i.closed ? "เปิดใหม่" : "ปิด"}</button></td></tr>`).join("") || `<tr><td colspan="5" style="color:var(--ink-3)">ยังไม่มีรายการ</td></tr>`}</tbody></table></div></div></div>`
    + `<div class="card" style="margin-top:14px"><h3>ข้อผิดพลาดล่าสุด (${L.errs.length})</h3>
      ${L.errs.length ? `<div class="tw"><table><thead><tr><th>เวลา</th><th>หน้า</th><th>ชนิด</th><th>ข้อความ</th></tr></thead><tbody>${L.errs.slice(0, 20).map(e => `<tr><td>${esc(e.at)}</td><td>${esc(navLab(e.view))}</td><td>${esc(e.src)}</td><td class="mono" style="font-size:11px">${esc(e.msg)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="desc" style="margin:0">ไม่มี</p>`}
      <div class="pl-tools" style="margin-top:12px"><button class="btn g" id="plLogJson">Export JSON</button><button class="btn g" id="plLogClear">ล้าง log</button></div></div>`
    + traceCard();
}

/* ============================================================================
   E2 · ตรวจการคำนวณรายบริษัท (ที่ประชุม 15 ต.ค. 2569 §6 — อาจารย์ตรวจความถูกต้องของหลักการคำนวณ และรองรับสูตรที่เปลี่ยนในอนาคต)
   ทุกขั้น: ค่าป้อน → winsorise → centring → amp → B → percentile → tier / quadrant / ช่วง 90% / regime / ธง
   · ออฟไลน์ และผู้ใช้ทั่วไปในฉบับเซิร์ฟเวอร์: แสดงลำดับขั้นและผลลัพธ์ — ค่าในบันทึกพารามิเตอร์และค่ากลาง (cP, amp, B ดิบ) ซ่อน
   · ผู้ดูแลในฉบับเซิร์ฟเวอร์: GET /api/admin/trace/{ticker} คืนทุกขั้นพร้อมพารามิเตอร์ (บันทึกใน audit log ทุกครั้ง)
   ============================================================================ */
const TR_HIDDEN = "ค่าในบันทึกพารามิเตอร์ — แสดงเฉพาะผู้ดูแล/อาจารย์ในฉบับเซิร์ฟเวอร์";
let _trSrv = {};
const trRecord = () => OIS_SRV ? (OIS.record || OIS.version) : OIS.version + " (ฝังในไฟล์ออฟไลน์)";
function trLocal(c) {
  const v = verdictOf(c), hid = `<span class="pill mute" title="${esc(TR_HIDDEN)}">ซ่อน</span>`;
  const cl = c.clipped || [];
  let check = null;
  if (!OIS_SRV) {     // คำนวณซ้ำจากค่าป้อนแล้วเทียบกับค่าที่บันทึกไว้ตอน build (OIS.co) — ไม่แสดงค่ากลาง
    const o = (OIS.co || {})[c.t], ois = oisOf(signalB(c.promo, ampOf(c.fam, c.pol, c.fem, c.ten)));
    check = o && !isEdited(c.t) ? { ok: Math.abs(ois - o.ois) < 1e-3 && tierOf(ois) === o.tier && zoneOf(c.promo, ampOf(c.fam, c.pol, c.fem)) === o.quad, ois } : null;
  }
  return [
    ["1 · ค่าป้อน (ข้อมูลสาธารณะ)", `CEO Promotion Focus ${fmt(c.promo, 3)} · กรรมการครอบครัว ${pct1(c.fam)} · political ties ${c.pol ? 1 : 0} · กรรมการหญิง ${pct1(c.fem)} · อายุงาน ${fmt(c.ten, 1)} ปี · อุตสาหกรรม ${esc(IND[c.ind] || c.ind)}${isEdited(c.t) ? ' <span class="pill warn">แก้ค่าเองใน Zone A</span>' : ""}`],
    ["2 · winsorise 5/95 (E2)", `จุดตัด ${hid} · ตัวแปรที่ถูก clip: ${cl.length ? esc(cl.join(", ")) : "ไม่มี"}`],
    ["3 · mean-centring (E3)", `ค่าเฉลี่ย REF-928 ${hid} · cP ${c.cP >= 0 ? "≥ 0 (เหนือค่าเฉลี่ย)" : "< 0 (ต่ำกว่าค่าเฉลี่ย)"} · cF/cG/cW ${hid}`],
    ["4 · amp = β1 + δF·cF + δG·cG + δW·cW (E4 · δT ปิดด้วย g_T = 0)", `สัมประสิทธิ์ ${hid} · amp ${c.amp >= 0 ? "≥ 0" : "< 0"} · เปอร์เซ็นไทล์ amp ${fmt(ampPct(c.amp), 0)}`],
    ["5 · B = cP × amp (E5)", `ค่า B ${hid} · เครื่องหมาย ${(c.cP >= 0) === (c.amp >= 0) ? "บวก" : "ลบ"}`],
    ["6 · mid-rank percentile เทียบ REF-928 (E7)", `OpenInnoScore ${fmt(c.ois ?? c.ipi, 1)} · ในอุตสาหกรรม ${fmt(c.oisInd ?? c.iip, 1)} · CEO Promotion Focus เปอร์เซ็นไทล์ ${fmt(c.dp, 0)}`],
    ["7 · tier (E9) / quadrant (E10) / ช่วง 90% (E11)", `Tier ${v.tier} · quadrant ${esc(v.quad)} · ช่วง 90% ${fmt(v.band[0], 1)}–${fmt(v.band[1], 1)}${tierOf(v.band[0]) !== tierOf(v.band[1]) ? " · tier ไม่แน่นอน (R8)" : ""}`],
    ["8 · regime (R3) · ป้ายเตือน · ธงสัญญาณ OI (E13)", `ปีบัญชี ${esc(v.fy)} · ${esc(v.regime || "ยังไม่ validate")} · ธง ${v.flag ? "ขึ้น" : "ไม่ขึ้น"}${v.chips.length ? " · " + v.chips.map(x => esc(x.k)).join(" · ") : ""}`],
    ...(check ? [["ตรวจซ้ำ", check.ok ? `<span class="pill ok">✓ คำนวณซ้ำตรงกับค่าที่บันทึก (OIS ${fmt(check.ois, 4)})</span>` : `<span class="pill crit">✕ ไม่ตรงกับค่าที่บันทึก</span>`]] : []),
  ];
}
const trVal = v => v === null || v === undefined ? "—" : typeof v === "number" ? (Number.isInteger(v) ? String(v) : fmt(v, Math.abs(v) < 1 ? 6 : 4))
  : Array.isArray(v) ? "[" + v.map(trVal).join(", ") + "]" : typeof v === "object" ? Object.entries(v).map(([k, x]) => `${esc(k)} = ${trVal(x)}`).join(" · ") : esc(v);
function traceCard() {
  const c = cur(), admin = PL_SRV && plIsAdmin(), T = _trSrv[c.t];
  const rows = admin && T && T.steps
    ? T.steps.map(st => [esc(st.h), (st.p ? `<div class="pl-trp"><span class="pill blue">บันทึกพารามิเตอร์</span> ${trVal(st.p)}</div>` : "") + `<div>${trVal(st.v)}</div>`])
      .concat(T.check ? [["ตรวจซ้ำกับค่าที่บันทึก", T.check.match ? `<span class="pill ok">✓ ตรงกัน</span>` : `<span class="pill crit">✕ ไม่ตรง</span>`]] : [])
    : trLocal(c);
  return `<div class="card" id="plTrace" style="margin-top:14px"><h3>ตรวจการคำนวณรายบริษัท · ${esc(c.t)} <span class="pill mute">บันทึกพารามิเตอร์ ${esc(admin && T ? T.record : trRecord())}</span></h3>
    <p class="desc">ลำดับการคำนวณของบริษัทที่เลือกอยู่ด้านบน ตามสมการ E1–E13 · เปลี่ยนบริษัทจากตัวเลือกด้านบน ·
      ${admin ? "ท่านเป็นผู้ดูแล — กดปุ่มเพื่อโหลดทุกขั้นพร้อมค่าในบันทึกพารามิเตอร์จากเซิร์ฟเวอร์ (บันทึกใน audit log)"
        : esc(TR_HIDDEN) + (PL_SRV ? " (ต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแล)" : "")}</p>
    ${admin ? `<div class="pl-tools" style="margin-bottom:8px"><button class="btn p" id="plTrLoad">โหลดการคำนวณเต็ม (ผู้ดูแล)</button>
      ${T && T.err ? `<span class="pill crit">${esc(T.err)}</span>` : ""}</div>` : ""}
    <div class="tw"><table class="pl-trace"><tbody>${rows.map(([h, v]) => `<tr><th style="width:34%">${h}</th><td>${v}</td></tr>`).join("")}</tbody></table></div>
    <p class="desc" style="margin:8px 0 0">เมื่อสูตรหรือฐานอ้างอิงเปลี่ยนในอนาคต ผู้ดูแลเปลี่ยนไฟล์บันทึกพารามิเตอร์บนเซิร์ฟเวอร์ (ดู server/README_DEPLOY.md) แล้วรหัสรุ่นด้านบนจะเปลี่ยนตาม</p></div>`;
}
function wireSyslog(h) {
  const a = h.querySelector("#plIsAdd"); if (a) a.onclick = () => {
    const t = h.querySelector("#plIsT").value.trim(); if (!t) return toast("กรอกหัวข้อปัญหาก่อน");
    PL.log.issues.unshift({ at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }), t: t.slice(0, 200), v: h.querySelector("#plIsV").value, sev: h.querySelector("#plIsS").value, closed: false });
    plSave(); render();
  };
  h.querySelectorAll("[data-isclose]").forEach(b => b.onclick = () => { const i = PL.log.issues[+b.dataset.isclose]; i.closed = !i.closed; plSave(); render(); });
  const j = h.querySelector("#plLogJson"); if (j) j.onclick = () => plDl("ois_syslog.json", JSON.stringify(PL.log, null, 2));
  const c = h.querySelector("#plLogClear"); if (c) c.onclick = () => plAsk(c, "ล้าง log ทั้งหมด?", () => { PL.log = { crash: 0, errs: [], render: {}, issues: [] }; plSave(); render(); });
  const tl = h.querySelector("#plTrLoad"); if (tl) tl.onclick = async () => {
    const t = S.t; tl.disabled = true; tl.textContent = "กำลังโหลด…";
    try { const r = await window.OIS_API.admin.trace(t);
      _trSrv[t] = r && r.ok !== false && r.steps ? r : { err: (r && (r.error || r.reason)) || "โหลดไม่สำเร็จ" };
    } catch (e) { _trSrv[t] = { err: "โหลดไม่สำเร็จ" }; }
    if (S.view === "syslog") render();
  };
}

/* ============================================================================
   F · การเชื่อมต่อ (Phase ถัดไป — ต้องมีเซิร์ฟเวอร์)
   ============================================================================ */
const INTEGR = [
  { k: "ocr", t: "OCR PDF", cost: "0.20 บาท/หน้า", d: "เมื่อเปิดใช้: ผู้ใช้อัปโหลด 56-1 / รายงานประจำปีที่เป็นภาพสแกน เซิร์ฟเวอร์แปลงเป็นข้อความแล้วส่งกลับเฉพาะข้อความ (ไม่เก็บไฟล์) เพื่อนับคำใน Zone A · คิดค่าใช้จ่ายตามจำนวนหน้า" },
  { k: "llm", t: "LLM API (Claude / OpenAI)", cost: "ตามการใช้งาน", d: "เมื่อเปิดใช้: สร้าง insight และร่างข้อความ 56-1 จากผลคะแนน · <b>prompt และ API key ต้องอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามวางในเครื่องผู้ใช้</b> (ตามมติที่ประชุม) · เบราว์เซอร์ส่งเฉพาะตัวเลขผลลัพธ์ ไม่ส่งเอกสารต้นฉบับ" },
  { k: "onereport", t: "One Report (SET)", cost: "—", d: "ตอนนี้ = กรอกข้อมูลองค์ประกอบคณะกรรมการเองใน Zone A · เมื่อเปิดใช้: ดึงข้อมูล 56-1 One Report ผ่าน API ของ SET เป็น Phase ถัดไป เพื่อลดการกรอกมือและให้ปีบัญชีตรงกับฐานอ้างอิง" },
  { k: "mail", t: "Email แจ้งเตือน / Anydevice Approval", cost: "—", d: "เมื่อเปิดใช้: ส่งสรุปข้อสั่งการที่ยังเปิดอยู่ไปยังกล่องจดหมายของตำแหน่งตามรอบติดตาม และให้ผู้รับผิดชอบกดรับทราบ/อนุมัติจากอุปกรณ์ใดก็ได้ · เนื้อหามีเฉพาะหัวข้อ กำหนดส่ง สถานะ" },
];
/* สถานะบริการบนเซิร์ฟเวอร์ — อ่านจาก OIS_API.integrations() (boolean เท่านั้น) · ไม่มี OIS_API = โหมดออฟไลน์ */
let _plInteg = null;
const PL_SRV_SVC = [["ai", "AI (Claude / OpenAI)", d => d.llm ?? d.ai ?? (d.anthropic || d.openai), d => d.anthropic ? "Claude" : d.openai ? "OpenAI" : ""],
  ["ocr", "OCR PDF", d => d.ocr], ["db", "ฐานข้อมูล (เก็บแบบสอบถาม / แบบประเมิน)", d => d.db ?? d.database ?? d.store], ["google", "Google Sign-in", d => d.google ?? d.oauth ?? d.google_auth]];
function plIntegLoad() {
  const api = window.OIS_API;
  if (!api || typeof api.integrations !== "function" || (_plInteg && _plInteg.st !== "err")) return;
  _plInteg = { st: "loading", d: {} };
  Promise.resolve().then(() => api.integrations()).then(d => { _plInteg = { st: d && d.ok !== false ? "ok" : "err", d: d || {} }; })
    .catch(() => { _plInteg = { st: "err", d: {} }; }).then(() => { if (S.view === "integr") render(); });
}
function plIntegStatus() {
  const api = window.OIS_API, has = !!(api && typeof api.integrations === "function");
  if (!has) return `<div class="card as-srvst" id="plSrvSt"><h3>สถานะการเชื่อมต่อ <span class="pill mute">โหมดออฟไลน์</span></h3>
    <p class="desc" style="margin:0">ไฟล์นี้เปิดแบบออฟไลน์ (ไฟล์ HTML เดียว) — ไม่มีการเชื่อมต่อ AI, OCR, ฐานข้อมูล หรือ Google · ข้อมูลทั้งหมดอยู่ใน localStorage ของเครื่องนี้</p></div>`;
  plIntegLoad();
  const I = _plInteg || { st: "loading", d: {} };
  return `<div class="card as-srvst" id="plSrvSt"><h3>สถานะการเชื่อมต่อบนเซิร์ฟเวอร์ <span class="pill ${I.st === "ok" ? "ok" : I.st === "err" ? "crit" : "mute"}">${I.st === "ok" ? "เชื่อมต่อแล้ว" : I.st === "err" ? "ตรวจสอบไม่สำเร็จ" : "กำลังตรวจสอบ…"}</span></h3>
    <div class="as-svc">${PL_SRV_SVC.map(([k, l, f, ex]) => { const v = I.st === "ok" ? f(I.d) : undefined, x = ex && v ? ex(I.d) : "";
      return `<div><span class="pill ${v === true ? "ok" : v === false ? "mute" : "mute"}">${v === true ? "เปิดใช้" : v === false ? "ยังไม่เปิดใช้" : "ไม่ทราบสถานะ"}</span> <b>${esc(l)}</b>${x ? ` <span class="chip">${esc(x)}</span>` : ""}</div>`; }).join("")}</div>
    <p class="desc" style="margin:8px 0 0">ค่าจาก /api/integrations เป็น boolean เท่านั้น — ไม่มีการส่ง API key มายังเบราว์เซอร์ · “ไม่ทราบสถานะ” = เซิร์ฟเวอร์รุ่นนี้ยังไม่รายงานรายการนั้น</p></div>`;
}
function viewIntegr() {
  const I = PL.integr, srv = !!(window.OIS_API && typeof window.OIS_API.integrations === "function");
  return pageHead("Pilot · การเชื่อมต่อ", srv ? "การเชื่อมต่อ (ฉบับเซิร์ฟเวอร์)" : "การเชื่อมต่อ (โหมดออฟไลน์ — บริการเปิดใช้บนเซิร์ฟเวอร์)",
    `${srv ? "ฉบับเซิร์ฟเวอร์: สถานะ AI / OCR / ฐานข้อมูล / Google แสดงด้านล่าง" : "ต้นแบบไฟล์เดียวทำงานในเบราว์เซอร์ทั้งหมด"} · การ์ดด้านล่างใช้ทดสอบว่า endpoint ฝั่งเซิร์ฟเวอร์เข้าถึงได้หรือไม่ ·
     <b>ไม่มีช่องกรอก API key ในเครื่องผู้ใช้</b> และการทดสอบไม่ส่งเอกสารใด ๆ`)
    + plIntegStatus()
    + `<div class="grid g2" style="margin-top:14px">${INTEGR.map(x => { const r = I.res[x.k], on = srv && _plInteg && _plInteg.st === "ok" && (x.k === "ocr" ? _plInteg.d.ocr === true : x.k === "llm" ? !!(_plInteg.d.llm ?? (_plInteg.d.anthropic || _plInteg.d.openai)) : false);
      return `<div class="card"><h3>${esc(x.t)} <span class="pill ${on ? "ok" : "mute"}">${on ? "เปิดใช้บนเซิร์ฟเวอร์" : "ยังไม่เปิดใช้"}</span>${x.cost !== "—" ? `<span class="chip">${esc(x.cost)}</span>` : ""}</h3>
      <p class="desc">${x.d}</p>
      <label class="pl-lab">Endpoint ฝั่งเซิร์ฟเวอร์ (URL)<input class="inp" data-ep="${x.k}" value="${esc(I.ep[x.k] || "")}" placeholder="https://api.example.com/${x.k}" spellcheck="false"></label>
      <div class="pl-tools"><button class="btn s" data-eptest="${x.k}"${srv ? ' disabled title="ปิดในฉบับเซิร์ฟเวอร์ — CSP connect-src \'self\'"' : ""}>ทดสอบการเชื่อมต่อ</button>
        ${r ? `<span class="pill ${r.ok ? "ok" : "crit"}">${r.ok ? "เข้าถึงได้" : "เข้าถึงไม่ได้"}</span><span style="font-size:11px;color:var(--ink-3)">${esc(r.msg)} · ${esc(r.at)}</span>` : ""}</div></div>`; }).join("")}</div>`
    + `<div class="note brand" style="margin-top:14px"><b>LIWC-22:</b> ต้นแบบส่งออก .txt จาก Zone A เพื่อรันด้วย academic license แล้วนำค่า % (promotion focus) กลับมากรอก — ยังไม่มีการเรียก LIWC ผ่าน API</div>
      <div class="note" style="margin-top:10px;font-size:11.2px">${PL_LEGAL} · ${srv
        ? "ฉบับเซิร์ฟเวอร์ปิดปุ่มทดสอบ endpoint: นโยบายความปลอดภัย (CSP connect-src 'self') อนุญาตให้หน้าเว็บเชื่อมต่อได้เฉพาะเซิร์ฟเวอร์ของตัวเอง การทดสอบไปยังโดเมนอื่นจึงล้มเหลวเสมอ และการให้เซิร์ฟเวอร์ยิงไปยัง URL ที่ผู้ใช้กรอกเปิดช่อง SSRF — สถานะจริงของบริการดูจากการ์ดด้านบน (ตรวจบนเซิร์ฟเวอร์ รวมการเชื่อมต่อฐานข้อมูลจริง)"
        : "การทดสอบการเชื่อมต่อส่งเพียงคำขอ HEAD แบบไม่มีเนื้อหา (no-cors, timeout 3 วินาที) ไปยัง URL ที่กรอก"}</div>`;
}
function wireIntegr(h) {
  h.querySelectorAll("[data-ep]").forEach(i => i.onchange = () => { PL.integr.ep[i.dataset.ep] = i.value.trim().slice(0, 300); plSave(); });
  h.querySelectorAll("[data-eptest]").forEach(b => b.onclick = async () => {
    if (PL_SRV) return;
    const k = b.dataset.eptest, url = (h.querySelector(`[data-ep="${k}"]`).value || "").trim();
    PL.integr.ep[k] = url;
    const at = new Date().toLocaleTimeString("th-TH", { timeStyle: "short" });
    if (!/^https?:\/\/\S+$/i.test(url)) { PL.integr.res[k] = { ok: false, msg: "URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)", at }; plSave(); render(); return; }
    b.disabled = true; b.textContent = "กำลังทดสอบ…";
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 3000);
    try { await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: ac.signal }); PL.integr.res[k] = { ok: true, msg: "มีการตอบกลับจากปลายทาง (ยังไม่ตรวจสิทธิ์)", at }; }
    catch (e) { PL.integr.res[k] = { ok: false, msg: e.name === "AbortError" ? "หมดเวลา 3 วินาที" : "เครือข่ายหรือปลายทางไม่ตอบ", at }; }
    clearTimeout(tm); plSave(); render();
  });
}

/* ============================================================================
   ลงทะเบียนหน้า · เมนูกลุ่ม 4
   ============================================================================ */
bodSel();
VIEWS.bod = viewBod; VIEWS.outdomain = viewOutdomain; VIEWS.directives = viewDirectives;
VIEWS.syslog = viewSyslog; VIEWS.integr = viewIntegr;
if (typeof WIRES2 === "object" && WIRES2) Object.assign(WIRES2, { bod: wireBod, outdomain: wireOutdomain, directives: wireDirectives, syslog: wireSyslog, integr: wireIntegr });
NAV.push({ id: "bod", g: 4, ico: "☑", lab: "BOD Self-Assessment (OI-1…6)" },
  { id: "outdomain", g: 4, ico: "◌", lab: BP_TITLE() },
  { id: "directives", g: 4, ico: "≡", lab: "ข้อสั่งการบอร์ด / Compliance (Level 3)" },
  { id: "survey", g: 4, ico: "✎", lab: "แบบสอบถามประเมินต้นแบบนวัตกรรม (4.2)" },
  { id: "syslog", g: 4, ico: "⌁", lab: "System log" },
  { id: "integr", g: 4, ico: "⚙", lab: window.OIS_API ? "การเชื่อมต่อ" : "การเชื่อมต่อ (โหมดออฟไลน์)" });
buildNav();
if (S.user) syncNavLocks();
