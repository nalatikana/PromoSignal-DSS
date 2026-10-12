/* ============================================================================
   v2_pilot.js — หน้าตามแนวทาง Pilot (BBL guideline · REC exemption)
     A. BOD Self-Assessment OI-1…OI-6 (ระดับคณะ)
     B. โหมดนอกกลุ่มอ้างอิง (ธนาคาร / การเงิน) — เชิงพรรณนา ไม่มี tier
     C. ข้อสั่งการบอร์ด / Compliance program (Level 3 add-on)
     D. แบบสอบถามทดสอบการยอมรับ (consent + anonymous)
     E. System log (ระดับรวม)
     F. การเชื่อมต่อ (Phase ถัดไป)
   กติกา: เก็บสถานะใน localStorage คีย์เดียว ไม่เก็บชื่อ อีเมล IP หรือรหัสพนักงาน
   ============================================================================ */
const PL_KEY = "ois_pilot_v1";
const PL = (() => {
  const d = { bod: { a: {}, ev: {}, draft: "" },
              od: { name: "", sector: "bank", bsize: 12, femN: 2, famN: 0, pol: 0, draft: "" },
              dir: { rows: [], mode: "table" },
              survey: { step: 0, cur: null, resp: [] },
              log: { crash: 0, errs: [], render: {}, issues: [] },
              integr: { ep: {}, res: {} } };
  try {
    const o = JSON.parse(localStorage.getItem(PL_KEY) || "null");
    if (o && typeof o === "object") Object.keys(d).forEach(k => { if (o[k] && typeof o[k] === "object") Object.assign(d[k], o[k]); });
  } catch (e) { }
  return d;
})();
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
const PL_LEGAL = `เครื่องมือนี้เป็นเครื่องมือช่วยเสนอแนะ (suggestion tool) ไม่มีการตัดสินใจอัตโนมัติ ไม่ใช่คะแนนเครดิต
  และไม่ใช้ประเมินบุคคล · ข้อมูลทั้งหมดเป็นระดับคณะหรือระดับองค์กร · ไม่เก็บชื่อ อีเมล หรือ IP`;

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
  return `ในปี ${plBE()} คณะกรรมการบริษัทได้ประเมินตนเองในระดับคณะเพิ่มเติมในประเด็นการกำกับดูแลนวัตกรรมแบบเปิด ${done.length} ประเด็น (${done.map(i => i.id).join(", ")}) ` +
    `โดยอ้างอิงหลักปฏิบัติตามหลักการกำกับดูแลกิจการที่ดีสำหรับบริษัทจดทะเบียน ปี 2560 ผลการประเมินเฉลี่ยอยู่ที่ ${fmt(plMean(vals), 2)} จากคะแนนเต็ม 5` +
    (hi.length ? ` ประเด็นที่คณะกรรมการเห็นว่ามีการดำเนินการเป็นส่วนใหญ่หรืออย่างเป็นระบบแล้ว ได้แก่ ${li(hi)}` : "") +
    (lo.length ? ` ประเด็นที่คณะกรรมการกำหนดเป็นแนวทางพัฒนาในปีถัดไป ได้แก่ ${li(lo)} โดยมอบหมายให้ฝ่ายจัดการเสนอแผนดำเนินการและรอบติดตามต่อคณะกรรมการ` : "") +
    ` ทั้งนี้ ผลการประเมินดังกล่าวเป็นภาพรวมระดับคณะ ไม่มีการประเมินหรือให้คะแนนกรรมการรายบุคคล และใช้ประกอบกระบวนการประเมินผลการปฏิบัติงานของคณะกรรมการตามที่เปิดเผยในส่วนที่ 2 ข้อ 7–8`;
}
function viewBod() {
  const a = PL.bod.a, ev = PL.bod.ev, done = OI_ITEMS.filter(i => a[i.id]);
  const mean = plMean(done.map(i => a[i.id])), lo = done.filter(i => a[i.id] <= 2);
  return pageHead("Pilot · Use Case 1", "BOD Self-Assessment · ชุดคำถามเสริมด้านการกำกับดูแลนวัตกรรมแบบเปิด",
    `หกประเด็น OI-1…OI-6 ผูกกับหลักปฏิบัติใน CG Code 2560 · ใช้เสริมแบบประเมินตนเองประจำปีของคณะกรรมการ ไม่ใช่แทนที่ ·
     มาตราส่วน 1 = ไม่มีเลย … 5 = มีอย่างเป็นระบบ พร้อมช่องหลักฐานอ้างอิง`)
    + `<div class="note crit pl-banner"><b>ตอบในระดับคณะ (aggregate) เท่านั้น</b> — ไม่เก็บคำตอบรายกรรมการ ไม่ประเมินบุคคล (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล ม.26) ·
       ผู้กรอก: เลขานุการบริษัท / ฝ่ายกำกับดูแล สรุปจากการหารือของคณะกรรมการ</div>`
    + `<div class="grid g-side-r">
      <div class="stack">${OI_ITEMS.map((i, n) => `<div class="card pl-q">
        <div class="pl-qhead"><span class="pill mute">${i.id}</span><span class="chip">CG Code 2560 · ${esc(i.ref)}</span>
          ${a[i.id] ? `<span class="pill ${a[i.id] <= 2 ? "warn" : "ok"}" style="margin-left:auto">${a[i.id]} · ${esc(OI_LABS[a[i.id] - 1])}</span>` : ""}</div>
        <p class="pl-qt">${n + 1}. ${esc(i.t)}</p>
        ${plScale(i.id, a[i.id], OI_LABS)}
        <label class="pl-lab">หลักฐานอ้างอิง (เอกสาร / มติ / วาระ — ไม่ระบุชื่อบุคคล)</label>
        <textarea class="inp pl-ta" data-ev="${i.id}" rows="2" placeholder="เช่น มติที่ประชุมครั้งที่ 3/${plBE()} วาระ 5 · นโยบายนวัตกรรม ฉบับ ${plBE() - 1}">${esc(ev[i.id] || "")}</textarea>
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
          <div class="pl-tools"><button class="btn g" id="plBodJson">Export JSON</button><button class="btn g" id="plBodClear">ล้างคำตอบ</button></div>
          <p class="desc" style="margin:8px 0 0">ไฟล์มีเฉพาะรหัสข้อ คะแนน และหลักฐานที่กรอก — ไม่มีข้อมูลบุคคล</p></div>
      </div></div>`;
}
function wireBod(h) {
  plWireScale(h, (k, v) => { PL.bod.a[k] = v; PL.bod.draft = ""; plSave(); render(); });
  h.querySelectorAll("[data-ev]").forEach(t => t.onchange = () => { PL.bod.ev[t.dataset.ev] = t.value.trim(); plSave(); });
  const d = h.querySelector("#plBodDraft"); if (d) d.onclick = () => { PL.bod.draft = bodDraft(); plSave(); render(); };
  const c = h.querySelector("#plBodCopy"); if (c) c.onclick = () => plCopy(PL.bod.draft);
  const j = h.querySelector("#plBodJson"); if (j) j.onclick = () => plDl(`ois_bod_oi_${plBE()}.json`,
    JSON.stringify({ level: "board-aggregate", year: plBE(), items: OI_ITEMS.map(i => ({ id: i.id, ref: i.ref, score: PL.bod.a[i.id] || null, evidence: PL.bod.ev[i.id] || "" })) }, null, 2));
  const x = h.querySelector("#plBodClear"); if (x) x.onclick = () => plAsk(x, "ล้างคำตอบ OI-1…6 ทั้งหมด?", () => { PL.bod = { a: {}, ev: {}, draft: "" }; plSave(); render(); });
  const td = h.querySelector("#plBodToDir"); if (td) td.onclick = () => {
    const lo = OI_ITEMS.filter(i => PL.bod.a[i.id] && PL.bod.a[i.id] <= 2);
    let n = 0;
    lo.forEach(i => { if (PL.dir.rows.some(r => r.src === "bod" && r.t.startsWith(i.id))) return;
      PL.dir.rows.push(dirRow({ t: `${i.id} · ${i.t}`, src: "bod" })); n++; });
    plSave(); toast(`เพิ่มร่างข้อสั่งการ ${n} รายการ`); go("directives");
  };
}

/* ============================================================================
   B · โหมดนอกกลุ่มอ้างอิง — เชิงพรรณนา ไม่มี tier / percentile / Signal B
   ============================================================================ */
const OD_SECTORS = { bank: "ธนาคาร", fin: "การเงิน / หลักทรัพย์", ins: "ประกันภัย / ประกันชีวิต", other: "อื่น ๆ นอก SET อุตสาหกรรม 1–7", noen: "ไม่มีสารถึงผู้ถือหุ้นภาษาอังกฤษ" };
let _odRef = null;
function odRef() {
  if (_odRef) return _odRef;
  const W = REF_PTS.map(p => p[8] + OM.W).sort((a, b) => a - b), F = REF_PTS.map(p => p[6] + OM.F).sort((a, b) => a - b);
  const G = plMean(REF_PTS.map(p => p[7] + OM.G));
  return _odRef = { W, F, G };
}
/** แถบฮิสโตแกรม SVG ของฐานอ้างอิง พร้อมเส้นตำแหน่งค่าที่ป้อน */
function odStrip(sorted, v, color) {
  const nb = 20, mx = Math.max(sorted[sorted.length - 1], v, .01), bins = new Array(nb).fill(0);
  sorted.forEach(x => bins[Math.min(nb - 1, Math.floor(x / mx * nb))]++);
  const top = Math.max(...bins), W = 320, H = 56, bw = W / nb;
  const bars = bins.map((b, i) => `<rect x="${(i * bw).toFixed(1)}" y="${(H - 10 - b / top * (H - 14)).toFixed(1)}" width="${(bw - 1.5).toFixed(1)}" height="${(b / top * (H - 14)).toFixed(1)}" rx="1.5" fill="var(--q3)"/>`).join("");
  const x = Math.min(W - 1, v / mx * W);
  return `<svg class="pl-hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="ตำแหน่งค่าเทียบฐานอ้างอิง">${bars}
    <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="2" y2="${H - 8}" stroke="${color}" stroke-width="2"/>
    <text x="0" y="${H - 1}" font-size="8" fill="var(--ink-3)">0%</text><text x="${W}" y="${H - 1}" font-size="8" fill="var(--ink-3)" text-anchor="end">${fmt(mx * 100, 0)}%</text></svg>`;
}
function odCalc() {
  const o = PL.od, r = odRef(), bs = Math.max(1, +o.bsize || 1);
  const fem = clamp((+o.femN || 0) / bs, 0, 1), fam = clamp((+o.famN || 0) / bs, 0, 1);
  return { bs, fem, fam, femP: midRank(r.W, fem), famP: midRank(r.F, fam), gShare: r.G, fn: femaleN(fem, bs) };
}
function odDraft() {
  const o = PL.od, c = odCalc(), nm = o.name.trim() || "บริษัท";
  return `ในปี ${plBE()} คณะกรรมการ${nm}ได้ใช้ข้อมูลเชิงพรรณนาเปรียบเทียบองค์ประกอบของคณะกรรมการกับฐานอ้างอิงบริษัทจดทะเบียนนอกกลุ่มการเงิน (928 บริษัท-ปี) ประกอบการหารือเรื่องการพัฒนาคณะกรรมการ ` +
    `โดยสัดส่วนกรรมการหญิงร้อยละ ${fmt(c.fem * 100, 1)} (${c.fn} คน จาก ${c.bs} คน) อยู่ที่เปอร์เซ็นไทล์ ${fmt(c.femP, 0)} และสัดส่วนกรรมการที่มีความสัมพันธ์กับผู้ถือหุ้นใหญ่/ครอบครัวร้อยละ ${fmt(c.fam * 100, 1)} อยู่ที่เปอร์เซ็นไทล์ ${fmt(c.famP, 0)} ของฐานอ้างอิง ` +
    `งานวิจัยที่อ้างอิงพบความสัมพันธ์ (association) ระหว่างองค์ประกอบคณะกรรมการบางลักษณะกับระดับกิจกรรมนวัตกรรมแบบเปิดในบริษัทกลุ่มอ้างอิง ซึ่งไม่ใช่ความสัมพันธ์เชิงสาเหตุ และเนื่องจาก${nm}อยู่นอกกลุ่มอ้างอิง จึงไม่มีการจัดระดับ (tier) หรือคะแนนเปรียบเทียบ ` +
    `คณะกรรมการใช้ข้อมูลดังกล่าวเป็นบริบทประกอบการทบทวนทักษะและองค์ประกอบของคณะกรรมการ (skill matrix) และการประเมินตนเองระดับคณะเท่านั้น ไม่มีการประเมินกรรมการรายบุคคล`;
}
function viewOutdomain() {
  const o = PL.od, c = odCalc();
  const inp = (k, lab, type, extra) => `<label class="pl-lab">${lab}<input class="inp" data-od="${k}" type="${type}" value="${esc(o[k])}" ${extra || ""}></label>`;
  return pageHead("Pilot · Use Case 2", "โหมดนอกกลุ่มอ้างอิง (out of domain) — ธนาคาร / การเงิน / ไม่มีสารภาษาอังกฤษ",
    `ฐานอ้างอิง REF-928 ครอบคลุม SET อุตสาหกรรม 1–7 เท่านั้น · บริษัทนอกกลุ่มนี้ได้เฉพาะ<b>ข้อมูลเชิงพรรณนา</b>และชุดคำถาม BOD ·
     ระบบจะไม่คำนวณ tier, percentile หรือ Signal B ให้ (R4)`)
    + `<div class="sbar mute" style="margin-bottom:14px"><div class="sbtop"><span class="pill crit">out of domain — ไม่แสดง tier/percentile (R4)</span>
        <b>${esc(o.name.trim() || "บริษัทนอกกลุ่มอ้างอิง")}</b> · ${esc(OD_SECTORS[o.sector] || "")}</div>
      <div class="sbmsg">ค่าที่แสดงด้านล่างเป็นตำแหน่งของสัดส่วนองค์ประกอบคณะกรรมการเทียบการกระจายในฐานอ้างอิง ไม่ใช่คะแนน และไม่ได้บอกว่าดีหรือไม่ดี</div></div>`
    + `<div class="grid g-side">
      <div class="card"><h3>ข้อมูลองค์ประกอบคณะกรรมการ</h3><p class="desc">กรอกจำนวนคน (ระดับคณะ) — ไม่ต้องระบุชื่อ</p>
        ${inp("name", "ชื่อบริษัท (แสดงผลเท่านั้น ไม่บันทึกออกนอกเครื่อง)", "text", 'placeholder="เช่น ธนาคาร ก"')}
        <label class="pl-lab">กลุ่มธุรกิจ<select class="sel" data-od="sector">${Object.entries(OD_SECTORS).map(([k, v]) => `<option value="${k}"${o.sector === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
        ${inp("bsize", "จำนวนกรรมการทั้งหมด (คน)", "number", 'min="1" max="30"')}
        ${inp("femN", "กรรมการหญิง (คน)", "number", 'min="0" max="30"')}
        ${inp("famN", "กรรมการที่มีความสัมพันธ์กับผู้ถือหุ้นใหญ่/ครอบครัว (คน)", "number", 'min="0" max="30"')}
        <label class="pl-lab">มีกรรมการที่มีความเชื่อมโยงทางการเมือง (political ties)
          <div class="seg" style="margin-top:4px"><button class="btn ${o.pol ? "g" : "p"}" data-odpol="0" style="padding:5px 12px">ไม่มี</button><button class="btn ${o.pol ? "p" : "g"}" data-odpol="1" style="padding:5px 12px">มี</button></div></label>
      </div>
      <div class="stack">
        <div class="card"><h3>(2) โปรไฟล์เชิงพรรณนาเทียบ REF-928</h3>
          <p class="desc">เปอร์เซ็นไทล์แบบ mid-rank ของค่าที่ป้อน เทียบการกระจายของ 928 บริษัท-ปี · แถบ = ฮิสโตแกรมของฐานอ้างอิง เส้น = ตำแหน่งของบริษัทนี้</p>
          <div class="grid g2">
            <div class="pl-prof"><div class="k">สัดส่วนกรรมการหญิง</div><div class="v">${fmt(c.fem * 100, 1)}%<span> · เปอร์เซ็นไทล์ ${fmt(c.femP, 0)}</span></div>
              ${odStrip(odRef().W, c.fem, "var(--s1)")}
              <div class="u">ค่าเฉลี่ยฐานอ้างอิง ${fmt(OM.W * 100, 1)}% · กรรมการหญิง ${c.fn} คน ${c.fn < CRIT_N ? `— <b>ต่ำกว่า critical mass (${CRIT_N} คน)</b> งานวิจัยพบว่าบอร์ดที่มี 1–2 คนไม่ต่างจาก 0 คนอย่างมีนัย` : `— ถึง critical mass (≥ ${CRIT_N} คน)`}</div></div>
            <div class="pl-prof"><div class="k">สัดส่วนกรรมการครอบครัว / ผู้ถือหุ้นใหญ่</div><div class="v">${fmt(c.fam * 100, 1)}%<span> · เปอร์เซ็นไทล์ ${fmt(c.famP, 0)}</span></div>
              ${odStrip(odRef().F, c.fam, "var(--s2)")}
              <div class="u">ค่าเฉลี่ยฐานอ้างอิง ${fmt(OM.F * 100, 1)}%</div></div>
          </div>
          <div class="note ${o.pol ? "warn" : ""}" style="margin-top:12px"><b>Political ties: ${o.pol ? "มี" : "ไม่มี"}</b> · บริบท: ในฐานอ้างอิง REF-928 มีบริษัท-ปีที่มีความเชื่อมโยงทางการเมือง ${fmt(c.gShare * 100, 1)}% ·
            <b>political ties ไม่ใช้เป็นเหตุผลเชิงบวก (R6)</b> และเป็นข้อมูลอ่อนไหวตาม PDPA ม.26 — แสดงเป็นบริบทระดับคณะเท่านั้น</div>
        </div>
        <div class="grid g2">
          <div class="card"><h3>(1) ชุดคำถาม BOD OI-1…OI-6</h3>
            <p class="desc">ส่วนที่ใช้ได้เต็มรูปแบบกับบริษัทนอกกลุ่มอ้างอิง — ประเมินตนเองระดับคณะตาม CG Code 2560</p>
            <button class="btn p" data-goto="bod">ไปที่ BOD Self-Assessment →</button>
            ${Object.keys(PL.bod.a).length ? `<div class="u" style="font-size:11.5px;color:var(--ink-3);margin-top:8px">ตอบแล้ว ${Object.keys(PL.bod.a).length}/6 ประเด็น</div>` : ""}</div>
          <div class="card"><h3>(3) ร่างข้อความระดับคณะสำหรับ 56-1</h3>
            <p class="desc">ส่วนที่ 2 ข้อ 7–8 · ถ้อยคำแบบ association ไม่ใช่ causal · ไม่มี tier/คะแนน</p>
            <button class="btn s" id="plOdDraft">สร้างร่างข้อความ</button>
            ${o.draft ? `<textarea class="inp pl-ta" rows="8" readonly style="margin-top:10px">${esc(o.draft)}</textarea>
              <div class="pl-tools"><button class="btn g" id="plOdCopy">คัดลอก</button></div>` : ""}</div>
        </div>
        <div class="note" style="font-size:11.2px">${PL_LEGAL} · ไม่มี Signal B สำหรับบริษัทนอกกลุ่มอ้างอิง เพราะไม่มีค่า promotion focus และฐานอ้างอิงไม่ครอบคลุมกลุ่มการเงิน</div>
      </div></div>`;
}
function wireOutdomain(h) {
  h.querySelectorAll("[data-od]").forEach(el => el.onchange = () => {
    const k = el.dataset.od; PL.od[k] = el.type === "number" ? Math.max(0, +el.value || 0) : el.value; PL.od.draft = ""; plSave(); render();
  });
  h.querySelectorAll("[data-odpol]").forEach(b => b.onclick = () => { PL.od.pol = +b.dataset.odpol; PL.od.draft = ""; plSave(); render(); });
  const d = h.querySelector("#plOdDraft"); if (d) d.onclick = () => { PL.od.draft = odDraft(); plSave(); render(); };
  const c = h.querySelector("#plOdCopy"); if (c) c.onclick = () => plCopy(PL.od.draft);
}

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
/** ดึงร่างจาก Compass (S.sc) และรายการ insight (S.report) — เฉพาะข้อความ ไม่เอาชื่อบุคคล */
function dirImport() {
  const out = [];
  Object.entries(S.sc || {}).forEach(([k, o]) => {
    if (!o || typeof o !== "object") return;
    const t = k.replace(/^sc:/, "");
    ["a0", "a1", "a2"].forEach(f => { if (o[f] && String(o[f]).trim()) out.push(dirRow({ t: `[${t}] ${String(o[f]).trim().slice(0, 140)}`, src: "compass", due: o.next && /^\d{4}-\d{2}-\d{2}$/.test(o.next) ? o.next : "" })); });
    (o.plan || []).forEach(p => { if (p && p.t) out.push(dirRow({ t: `[${t}] ${String(p.t).slice(0, 140)}`, src: "compass" })); });
  });
  (Array.isArray(S.report) ? S.report : []).forEach(r => {
    const t = typeof r === "string" ? r : (r && (r.t || r.title || r.lab || r.text || r.h)) || "";
    if (t) out.push(dirRow({ t: String(t).slice(0, 140), src: "report" }));
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
   D · แบบสอบถามทดสอบการยอมรับ — consent + anonymous (REC exemption)
   ============================================================================ */
const SUS_ITEMS = ["ฉันคิดว่าฉันอยากใช้ระบบนี้บ่อย ๆ", "ฉันพบว่าระบบนี้ซับซ้อนโดยไม่จำเป็น", "ฉันคิดว่าระบบนี้ใช้งานง่าย",
  "ฉันคิดว่าฉันต้องการความช่วยเหลือจากผู้เชี่ยวชาญทางเทคนิคจึงจะใช้ระบบนี้ได้", "ฉันพบว่าฟังก์ชันต่าง ๆ ในระบบนี้ทำงานร่วมกันได้ดี",
  "ฉันคิดว่าระบบนี้มีความไม่สอดคล้องกันมากเกินไป", "ฉันคิดว่าคนส่วนใหญ่จะเรียนรู้การใช้ระบบนี้ได้อย่างรวดเร็ว", "ฉันพบว่าระบบนี้ใช้งานยุ่งยากมาก",
  "ฉันรู้สึกมั่นใจมากในการใช้ระบบนี้", "ฉันต้องเรียนรู้หลายสิ่งก่อนจึงจะเริ่มใช้ระบบนี้ได้"];
const TAM_ITEMS = ["ท่านสามารถเรียนรู้การใช้งานระบบจำลองได้ง่าย", "ท่านเข้าใจเมทริกซ์กลยุทธ์ 2x2 (Strategy Matrix) ได้ด้วยตนเอง",
  "ท่านสามารถเรียกดูรายงานวินิจฉัยเชิงพรรณนา (Descriptive Diagnostic Report) ขององค์กรเปรียบเทียบในอุตสาหกรรมได้สะดวก",
  "หน้าจอแสดงผลภาพรวม (Dashboard Layout) มีความชัดเจนตามสิทธิ์การใช้งาน",
  "คำอธิบายเชิงลึกประกอบผลการประเมินและการแสดงสถิติดัชนีกลุ่ม (Percentile) ช่วยให้เข้าใจผลได้",
  "ดัชนีกลุ่มอุตสาหกรรม (Industry-adjusted Percentile) ช่วยให้องค์กรมองเห็นตำแหน่งของตนเทียบกับคู่แข่ง",
  "รายงานผลสัมฤทธิ์เชิงประจักษ์ (Evidence Base) ช่วยลดเวลาของฝ่ายกลยุทธ์/เลขานุการบริษัทในการเตรียมวาระ BOD Evaluation",
  "ระบบสะท้อนช่องว่าง (Headroom) ระหว่างโครงสร้างผู้นำกับกลยุทธ์นวัตกรรมได้", "ระบบมีประโยชน์ต่อองค์กรของท่าน",
  "ระบบช่วยลดอัตวิสัยในการประเมินของคณะกรรมการ", "ท่านจะนำรายงานไปใช้กับ Workflow การประเมินบอร์ดประจำปี",
  "ท่านเชื่อมั่นต่อความปลอดภัย เนื่องจากระบบรันบนข้อมูลสาธารณะ (56-1 One Report) และแยก Engine หลังบ้านเพื่อรักษาความลับทางการค้า",
  "What-if Studio ให้มุมมองที่ดีกว่าการประเมินแบบเดิม", "ท่านจะนำระบบไปใช้เมื่อเป็น Full Scale SaaS",
  "ท่านจะผลักดันให้ฝ่ายกลยุทธ์/กำกับกฎเกณฑ์ใช้ระบบนี้", "ท่านจะใช้ระบบเพื่อติดตามผลอย่างต่อเนื่อง",
  "ท่านจะแนะนำระบบนี้ให้พันธมิตรหรือบริษัทมหาชนอื่น"];
const TAM_GRP = [["PEOU", "การรับรู้ว่าใช้งานง่าย", 1, 5], ["PU", "การรับรู้ประโยชน์", 6, 9], ["ATT", "ทัศนคติ", 10, 13], ["BI", "ความตั้งใจใช้", 14, 17]];
const LIK = ["ไม่เห็นด้วยอย่างยิ่ง", "ไม่เห็นด้วย", "เฉย ๆ", "เห็นด้วย", "เห็นด้วยอย่างยิ่ง"];
const COMP_Q = [
  { q: "tier ของ OpenInnoScore เป็นความน่าจะเป็นที่บริษัทจะผิดนัดชำระหนี้", o: ["จริง", "ไม่จริง — tier เป็นลำดับควอร์ไทล์ของสัญญาณเทียบฐานอ้างอิง ไม่ใช่ความน่าจะเป็นใด ๆ"], c: 1 },
  { q: "บริษัทที่ได้คะแนนสูงใน quadrant C (Develop) หมายถึงมีสัญญาณ open innovation เด่น", o: ["จริง", "ไม่จริง — คะแนนสูงใน C มาจากความเข้ากันของสองด้านที่ระมัดระวัง ไม่ใช่สัญญาณ open innovation"], c: 1 },
  { q: "ปีที่ regime = FAIL ควรอ่านผลอย่างไร", o: ["ใช้ผลได้ตามปกติ", "อ่านอย่างระมัดระวัง ไม่ขึ้นธงสัญญาณ OI และระบุว่าปีนั้นไม่ผ่านเกณฑ์ validity", "ไม่ต้องแสดงผลเลย"], c: 1 },
  { q: "ระบบให้คะแนนกรรมการรายบุคคลหรือไม่", o: ["ให้ — เพื่อใช้ประกอบการสรรหา", "ไม่ — ประเมินโครงสร้างคณะกรรมการระดับองค์กรเท่านั้น (PDPA ม.26)"], c: 1 },
  { q: "ตัวเลขของระบบเป็นความสัมพันธ์เชิงสาเหตุ (การปรับบอร์ดจะทำให้นวัตกรรมเพิ่ม) หรือไม่", o: ["ใช่", "ไม่ — เป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง"], c: 1 },
];
/* ส่วนที่ 4ข แทรกหลัง TAM — คงโครงสร้าง 6 ส่วนตามเอกสาร REC (ส่วนที่ 4 มีสองช่วงย่อย) */
const SV_STEPS = ["เอกสารชี้แจงและความยินยอม", "ส่วนที่ 1 ข้อมูลทั่วไป", "ส่วนที่ 2 งานตามสถานการณ์", "ส่วนที่ 3 SUS", "ส่วนที่ 4 TAM", "ส่วนที่ 4ข คุณค่าเชิงพาณิชย์", "ส่วนที่ 5 ความเข้าใจ", "ส่วนที่ 6 ปลายเปิด"];
const SV_DONE = SV_STEPS.length;
const svShuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
/** การทดสอบที่ 1 (A/B) — สุ่มกลุ่มตอนให้ความยินยอม: grid = มี 2×2 · table = ข้อมูลชุดเดียวกันเป็นตาราง/ข้อความ */
const svNew = () => {
  let lens = null; try { lens = typeof ucLens === "function" ? (ucLens() || {}).id ?? null : null; } catch (e) { lens = null; }
  return { id: plId(), arm: Math.random() < .5 ? "grid" : "table", lens, demoT: (cur() || {}).t || null,
    perm: { q4: svShuffle(["ok", "causal", "indiv", "other"]), q5: svShuffle(["ok", "zone", "cp", "tier"]) },
    p1: {}, task: {}, tasks: {}, ti: 0, sus: {}, tam: {}, wtp: {}, comp: {}, open: {} };
};
const svDemo = r => { const c = (r && r.demoT && byT[r.demoT]) ? coOf(r.demoT) : cur(), v = verdictOf(c);
  return { c, v, tier: v.tier, quad: v.quad, reg: v.regime || "ยังไม่ validate", cP: c.cP !== undefined ? c.cP : cpOf(c.promo),
    sx: "AB".includes(v.quad) ? 1 : -1, sy: "AD".includes(v.quad) ? 1 : -1 }; };
/** คำถามสำหรับที่ประชุมบอร์ดที่เหมาะกับแต่ละโซน (ตัวเลือกที่ถูกของงาน 4) */
const SV_ZQ = {
  A: "จะกำหนดตัวชี้วัดและรอบติดตามอย่างไร ให้แผนนวัตกรรมแบบเปิดที่ทั้ง CEO และบอร์ดหนุนอยู่แล้วเปลี่ยนเป็นผลลัพธ์ที่ตรวจสอบได้",
  B: "เกณฑ์อนุมัติ ทบทวน และหยุดโครงการนวัตกรรมที่ CEO ผลักดัน ชัดเจนเพียงพอหรือไม่ และบอร์ดมีทักษะที่จะกำกับโครงการเหล่านี้หรือยัง",
  C: "tier ที่สูงมาจากความระมัดระวังที่เข้ากัน — บริษัทมีฐานความพร้อม (ทักษะบอร์ด ทรัพยากร พันธมิตร) เพียงพอหรือยังหากจะเริ่มนวัตกรรมแบบเปิด",
  D: "บอร์ดอยู่ในรูปแบบที่พร้อมหนุน แต่ฝ่ายจัดการยังไม่สื่อสารโอกาส — มีโอกาสจากพันธมิตรภายนอกใดที่ยังไม่ถูกนำเสนอต่อบอร์ด",
};
const SV_OPP = { A: "C", C: "A", B: "D", D: "B" };
/** คำถามที่ถูกของงาน 4 = คำถามข้อแรกของช่องนั้นในเอกสารแนวทาง 2×2 ของลูกค้า (COMPASS) — ใช้ SV_ZQ เป็นค่าสำรอง */
const svZQ = q => (typeof COMPASS === "object" && COMPASS[q] && COMPASS[q].qs && COMPASS[q].qs[0]) || SV_ZQ[q] || "—";
const SV_TL = ["tier", "quad", "reg", "q4", "q5"];
/** งาน 1–5 ของส่วนที่ 2 — คำถามและหลักฐานเหมือนกันทั้งสองกลุ่ม ต่างกันเฉพาะรูปแบบการแสดงหลักฐาน */
function svTasks(r, d) {
  const z = ZONES[d.quad] || { l: "—" };
  const q4 = { ok: svZQ(d.quad), other: svZQ(SV_OPP[d.quad]),
    causal: "บอร์ดต้องเพิ่มกรรมการหญิงเพื่อเพิ่มนวัตกรรมของบริษัท",
    indiv: "ควรให้คะแนนกรรมการรายบุคคลเพื่อหาว่าใครทำให้ผลประเมินต่ำ" };
  const bd = d.v.band || [0, 0];
  const q5 = { ok: "การปรับองค์ประกอบคณะกรรมการจะทำให้ระดับนวัตกรรมแบบเปิดของบริษัทนี้เปลี่ยนไป",
    zone: `ตำแหน่งของบริษัทเทียบฐานอ้างอิง REF-928 อยู่ในโซน ${z.l}`,
    cp: `ภาษาของ CEO ${d.sx > 0 ? "เน้นโอกาสสูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ยฐานอ้างอิง`,
    tier: `tier ที่แสดงคือ Tier ${d.tier} และช่วง 90% ${tierOf(bd[0]) !== tierOf(bd[1]) ? "คร่อมมากกว่าหนึ่ง tier" : "อยู่ใน tier เดียว"}` };
  return [
    { k: "tier", q: "งาน 1 — จากหลักฐานในกรอบ บริษัทสาธิตอยู่ tier ใด", o: [1, 2, 3, 4].map(v => ({ v, l: "Tier " + v })), ok: v => v === d.tier },
    { k: "quad", q: "งาน 2 — บริษัทสาธิตอยู่ quadrant ใด", o: ["D", "A", "C", "B"].map(v => ({ v, l: `${ZONES[v].l} (${v})` })), ok: v => v === d.quad },
    { k: "reg", q: "งาน 3 — ป้าย regime ของปีบัญชีที่แสดงคือข้อใด", o: ["PASS", "CAUTION", "FAIL", "ยังไม่ validate"].map(v => ({ v, l: v })), ok: v => v === d.reg },
    { k: "q4", q: "งาน 4 — จากข้อมูลนี้ ข้อใดเป็นคำถามที่เหมาะสมที่สุดสำหรับนำเข้าที่ประชุมบอร์ด", o: (r.perm?.q4 || Object.keys(q4)).map(v => ({ v, l: q4[v] })), ok: v => v === "ok" },
    { k: "q5", q: "งาน 5 — ข้อใดเป็นสิ่งที่ยังสรุปไม่ได้จากข้อมูลนี้", o: (r.perm?.q5 || Object.keys(q5)).map(v => ({ v, l: q5[v] })), ok: v => v === "ok" },
  ];
}
/** ข้อความแถบสถานะ — ใช้เหมือนกันทั้งสองกลุ่ม */
function svStatus(d) {
  const v = d.v, bd = v.band || [NaN, NaN];
  return `<div class="sbar ${esc(v.st.c)} pl-ev-sb"><div class="sbtop"><b>Tier ${v.tier}</b><span>ช่วง 90% ${fmt(bd[0], 1)}–${fmt(bd[1], 1)}</span>
      <span class="pill mute">regime ปีบัญชี ${esc(v.fy)}: ${esc(d.reg)}</span></div>
    <div class="sbmsg">${esc(v.st.s)}</div>
    ${v.chips.length ? `<div class="sbchips">${v.chips.map(x => `<span class="chip">${esc(x.k)}</span>`).join("")}</div>` : ""}</div>`;
}
/** กลุ่ม grid — 2×2 ขนาดเล็ก ตำแหน่งจุดตามเครื่องหมายและขนาดของ cP / amp เทียบช่วงของ REF-928 */
let _svSc = null;
function svGrid(d) {
  const c = d.c;
  if (!_svSc) _svSc = { x: Math.max(...REF_PTS.map(p => Math.abs(p[0] - OM.P))) || 1, y: Math.max(...REF_PTS.map(p => Math.abs(p[1]))) || 1 };
  const W = 340, H = 236, L = 30, R = 8, T = 8, B = 30, cx = (L + W - R) / 2, cy = (T + H - B) / 2, hw = (W - R - L) / 2 - 12, hh = (H - B - T) / 2 - 12;
  /* ตำแหน่งตามเครื่องหมายของ quadrant ที่ระบบคำนวณ (ให้ภาพตรงกับตาราง) · ระยะจากเส้นแบ่งตามขนาด |cP|, |amp| */
  const x = cx + d.sx * (6 + clamp(Math.abs(d.cP) / _svSc.x, 0, 1) * (hw - 6)), y = cy - d.sy * (6 + clamp(Math.abs(c.amp || 0) / _svSc.y, 0, 1) * (hh - 6));
  const cell = (x0, y0, k) => `<rect x="${x0}" y="${y0}" width="${cx - L}" height="${cy - T}" fill="${ZONES[k].c}" fill-opacity=".07" stroke="var(--line)"/>
    <text x="${x0 + (cx - L) / 2}" y="${y0 + 16}" font-size="11.5" font-weight="600" text-anchor="middle" fill="${ZONES[k].c}">${ZONES[k].l} (${k})</text>`;
  return `<svg class="pl-mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="Strategy Grid 2×2 ของบริษัทสาธิต">
    ${cell(L, T, "D")}${cell(cx, T, "A")}${cell(L, cy, "C")}${cell(cx, cy, "B")}
    <line x1="${cx}" x2="${cx}" y1="${T}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="4 3"/>
    <line x1="${L}" x2="${W - R}" y1="${cy}" y2="${cy}" stroke="var(--ink-3)" stroke-dasharray="4 3"/>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="var(--ink)" stroke="var(--panel)" stroke-width="2.5"/>
    <text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" font-size="9" font-weight="700" text-anchor="middle" fill="var(--panel)">1</text>
    <text x="${(L + W - R) / 2}" y="${H - 9}" font-size="10.5" text-anchor="middle" fill="var(--ink-2)">CEO Promotion Focus →</text>
    <text transform="translate(12 ${(T + H - B) / 2}) rotate(-90)" font-size="10.5" text-anchor="middle" fill="var(--ink-2)">สัญญาณบทบาทของโครงสร้างบอร์ด →</text></svg>
    <div class="pl-mcap">จุด 1 = บริษัทสาธิต · CEO Promotion Focus เปอร์เซ็นไทล์ ${fmt(c.dp, 0)} · สัญญาณบทบาทของโครงสร้างบอร์ด เปอร์เซ็นไทล์ ${fmt(c.ap, 0)} · เส้นประ = ค่าเฉลี่ยฐานอ้างอิง / amp = 0</div>`;
}
/** กลุ่ม table — ข้อมูลชุดเดียวกับ grid ในรูปตาราง ไม่มีภาพ */
function svTable(d) {
  const c = d.c, z = ZONES[d.quad] || { l: "—" };
  return `<div class="tw"><table class="pl-evt"><tbody>
    <tr><th>Quadrant</th><td><b>${esc(z.l)} (${esc(d.quad)})</b></td></tr>
    <tr><th>CEO Promotion Focus</th><td>${d.sx > 0 ? "สูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ยฐานอ้างอิง (เปอร์เซ็นไทล์ ${fmt(c.dp, 0)})</td></tr>
    <tr><th>สัญญาณบทบาทของโครงสร้างบอร์ด</th><td>${d.sy > 0 ? "อยู่ในรูปแบบที่สัมพันธ์กับการหนุน (≥ 0)" : "ไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน (< 0)"} (เปอร์เซ็นไทล์ ${fmt(c.ap, 0)})</td></tr>
  </tbody></table></div>`;
}
const SV_WTP_SETS = [[40000, 180000], [60000, 250000], [90000, 330000]];
const SV_WTP_OPT = { a: "ก", b: "ข", c: "ค", d: "ง" };
const SV_ROLE = ["ผู้ใช้ผล", "ผู้เสนอซื้อ", "ผู้อนุมัติงบ", "ไม่เกี่ยว"];
const SV_YN = ["ใช่", "ไม่แน่ใจ", "ไม่"];
const SV_PAY = ["OpenInnoScore เป็นหลัก", "ที่ปรึกษาเป็นหลัก", "ทั้งสอง", "ไม่จ่ายเพิ่ม"];
let _svT0 = {};
const svPct = v => isNaN(v) ? "—" : fmt(v, 0) + "%";
const svMedian = a => { const b = a.filter(v => typeof v === "number" && !isNaN(v)).sort((x, y) => x - y); if (!b.length) return NaN;
  const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
function susScore(s) { if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some(i => !s[i])) return NaN;
  let t = 0; for (let i = 1; i <= 10; i++) t += i % 2 ? s[i] - 1 : 5 - s[i]; return t * 2.5; }
const tamMean = (t, a, b) => plMean([...Array(b - a + 1)].map((_, i) => t[a + i]).filter(Boolean));
const compPct = c => 100 * COMP_Q.filter((q, i) => c[i] === q.c).length / COMP_Q.length;
function viewSurvey() {
  const sv = PL.survey, st = sv.step, r = sv.cur, d = svDemo(r);
  const prog = `<div class="pl-prog" aria-label="ความคืบหน้า"><span style="width:${Math.round(st / SV_DONE * 100)}%"></span></div>
    <div class="pl-steps">${SV_STEPS.map((s, i) => `<span class="${i === st ? "on" : i < st ? "done" : ""}">${i}. ${esc(s)}</span>`).join("")}</div>`;
  const navBtn = (back, next, nextLab) => `<div class="pl-tools" style="margin-top:14px">${back ? `<button class="btn g" data-svstep="${st - 1}">← ย้อนกลับ</button>` : ""}<span class="spacer"></span>
    <button class="btn p" data-svstep="${st + 1}">${nextLab || "ถัดไป →"}</button></div>`;
  const radio = (grp, k, opts, val) => `<div class="pl-opts">${opts.map((o, i) => `<label class="${val === (typeof o === "object" ? o.v : o) ? "on" : ""}"><input type="radio" name="${grp}-${k}" data-sv="${grp}" data-k="${k}" value="${esc(typeof o === "object" ? o.v : o)}"${val === (typeof o === "object" ? o.v : o) ? " checked" : ""}> ${esc(typeof o === "object" ? o.l : o)}</label>`).join("")}</div>`;
  const likert = (grp, items, from) => items.map((t, i) => `<div class="pl-lik"><div><b>${from + i}.</b> ${esc(t)}</div>${plScale(grp + ":" + (from + i), r[grp][from + i])}</div>`).join("");
  let body = "";
  if (st === 0) body = `<div class="card"><h3>เอกสารชี้แจงผู้เข้าร่วมการทดสอบ</h3>
      <div class="pl-info">
        <p><b>วัตถุประสงค์</b> — ทดสอบความสามารถในการใช้งานและการยอมรับต้นแบบ OpenInnoScore™ (Dashboard Simulation) เพื่อปรับปรุงระบบก่อนขยายผล</p>
        <p><b>ใช้เวลา</b> ประมาณ 15–20 นาที · 6 ส่วน: ข้อมูลทั่วไป (ช่วงกว้าง) · งานตามสถานการณ์ 5 งาน (จับเวลา) · SUS 10 ข้อ · TAM 17 ข้อ และส่วนที่ 4ข ทางเลือกการซื้อ 3 ชุด · แบบทดสอบความเข้าใจ 5 ข้อ · คำถามปลายเปิด 2 ข้อ</p>
        <p><b>การจัดกลุ่ม</b> — ระบบสุ่มรูปแบบการแสดงหลักฐานในส่วนที่ 2 (ภาพ 2×2 หรือตาราง) ให้แต่ละท่าน เพื่อเปรียบเทียบความเข้าใจและเวลาที่ใช้ระหว่างสองรูปแบบ · ผลไม่ได้ใช้ประเมินตัวท่าน</p>
        <p><b>ความเป็นส่วนตัว</b> — ไม่เก็บชื่อ อีเมล IP หรือรหัสพนักงาน · คำตอบเก็บในเครื่องนี้ด้วยรหัสสุ่ม · รายงานผลเป็นกลุ่มเมื่อมีผู้ตอบ ≥ 5 คนเท่านั้น</p>
        <p><b>สิทธิ์ของท่าน</b> — เข้าร่วมโดยสมัครใจ ถอนตัวได้ทุกขั้นตอนโดยปิดหน้านี้ ไม่มีผลต่อหน้าที่การงาน</p>
        <p><b>ผู้วิจัย</b> — โครงการ OpenInnoScore™ (ติดต่อผ่านช่องทางของโครงการ)</p>
      </div>
      <div class="note" style="margin-top:8px">บริษัทสาธิตที่ใช้ในงานตามสถานการณ์คือบริษัทที่เลือกอยู่ด้านบนขณะนี้: <b>${esc(d.c.t)} · ${esc(d.c.n)}</b> — เปลี่ยนได้จากตัวเลือกบริษัทก่อนเริ่ม</div>
      <div class="pl-tools" style="margin-top:14px"><button class="btn p" id="plSvConsent">ยินยอมและเริ่มตอบ</button>
        ${sv.resp.length ? `<span class="chip">บันทึกในเครื่องแล้ว <b>${sv.resp.length}</b> ชุด</span>` : ""}</div></div>`;
  else if (st === SV_DONE) body = `<div class="card" style="text-align:center;padding:36px"><div style="font-size:30px">✓</div><h3 style="justify-content:center">ขอบคุณที่ร่วมทดสอบ</h3>
      <p class="desc">คำตอบของท่านถูกบันทึกในเครื่องนี้ด้วยรหัสสุ่ม (ไม่มีข้อมูลระบุตัวตน) · ผลจะรายงานเป็นกลุ่มเมื่อ n ≥ 5</p>
      ${_svSrv ? `<div class="note ${_svSrv === "ok" ? "ok" : _svSrv === "fail" ? "warn" : ""}" id="plSvSrv" style="margin:0 auto 12px;max-width:420px">${_svSrv === "ok" ? "บันทึกเข้าเซิร์ฟเวอร์แล้ว" : _svSrv === "fail" ? "บันทึกเข้าเซิร์ฟเวอร์ไม่สำเร็จ — คำตอบยังอยู่ในเครื่องนี้" : "กำลังบันทึกเข้าเซิร์ฟเวอร์…"}</div>` : ""}
      <button class="btn s" data-svstep="0">กลับหน้าแรกของแบบสอบถาม</button></div>`;
  else if (!r) body = `<div class="note">ยังไม่ได้ให้ความยินยอม</div>`;
  else if (st === 1) body = `<div class="card"><h3>ส่วนที่ 1 · ข้อมูลทั่วไป (ช่วงกว้าง)</h3>
      <p class="pl-qt">1. สายงานของท่าน</p>${radio("p1", "role", ["กลยุทธ์", "เลขานุการบริษัท / กำกับดูแล", "อื่น ๆ"], r.p1.role)}
      <p class="pl-qt">2. ประสบการณ์ทำงานที่เกี่ยวข้อง</p>${radio("p1", "exp", ["< 5 ปี", "5–10 ปี", "> 10 ปี"], r.p1.exp)}${navBtn(true)}</div>`;
  else if (st === 2) {
    const T = svTasks(r, d), ti = clamp(r.ti || 0, 0, T.length - 1), t = T[ti], a = (r.tasks || {})[t.k];
    if (!_svT0[ti]) _svT0[ti] = performance.now();
    body = `<div class="card"><h3>ส่วนที่ 2 · งานตามสถานการณ์ (บริษัทสาธิต: ${esc(d.c.t)}) <span class="pill mute" style="margin-left:auto">งาน ${ti + 1} / ${T.length}</span></h3>
      <p class="desc">ตอบจาก<b>หลักฐานในกรอบด้านล่างเท่านั้น</b> (ไม่ต้องเปิดหน้าอื่น) · ระบบบันทึกเวลาที่ใช้ตอบแต่ละงาน — ไม่ได้ใช้ประเมินตัวท่าน</p>
      <div class="pl-ev" data-arm="${esc(r.arm)}"><div class="pl-ev-h">หลักฐานของบริษัทสาธิต · ${esc(d.c.t)} · ${esc(d.c.n)} · ปีบัญชี ${esc(d.v.fy)}</div>
        <div class="pl-ev-b">${r.arm === "grid" ? svGrid(d) : svTable(d)}${svStatus(d)}</div></div>
      <p class="pl-qt">${esc(t.q)}</p>
      <div class="pl-opts ${ti >= 3 ? "pl-col" : ""}">${t.o.map(o => `<label class="${a && a.ans === o.v ? "on" : ""}"><input type="radio" name="svt-${t.k}" data-svtask="${ti}" value="${esc(o.v)}"${a && a.ans === o.v ? " checked" : ""}> ${esc(o.l)}</label>`).join("")}</div>
      <div class="pl-tools" style="margin-top:14px">${ti ? `<button class="btn g" data-svti="${ti - 1}">← งานก่อนหน้า</button>` : `<button class="btn g" data-svstep="1">← ย้อนกลับ</button>`}<span class="spacer"></span>
        ${ti < T.length - 1 ? `<button class="btn p" data-svti="${ti + 1}" id="plSvTiNext" ${a ? "" : "disabled"}>งานถัดไป →</button>`
          : `<button class="btn p" data-svstep="3" id="plSvTiNext" ${a ? "" : "disabled"}>ถัดไป →</button>`}</div></div>`;
  }
  else if (st === 3) body = `<div class="card"><h3>ส่วนที่ 3 · System Usability Scale (10 ข้อ)</h3><p class="desc">1 = ไม่เห็นด้วยอย่างยิ่ง … 5 = เห็นด้วยอย่างยิ่ง</p>${likert("sus", SUS_ITEMS, 1)}${navBtn(true)}</div>`;
  else if (st === 4) body = `<div class="card"><h3>ส่วนที่ 4 · การยอมรับเทคโนโลยี (TAM · 17 ข้อ)</h3><p class="desc">5 = เห็นด้วยอย่างยิ่ง … 1 = ไม่เห็นด้วยอย่างยิ่ง</p>
      ${TAM_GRP.map(([k, l, a, b]) => `<div class="pl-grp">${k} · ${esc(l)}</div>${likert("tam", TAM_ITEMS.slice(a - 1, b), a)}`).join("")}${navBtn(true)}</div>`;
  else if (st === 5) {
    const w = r.wtp || {};
    body = `<div class="card"><h3>ส่วนที่ 4ข · คุณค่าเชิงพาณิชย์ (ทางเลือกการซื้อ 3 ชุด)</h3>
      <div class="note warn pl-wtpnote">ราคาเป็นสมมติฐานสำหรับการทดสอบ ไม่ใช่ใบเสนอราคา · ความเห็นว่ามีประโยชน์ ≠ ความเต็มใจจ่าย ≠ การอนุมัติซื้อจริง (Schmidt &amp; Bijmolt, 2020)</div>
      <p class="desc">สมมติว่าองค์กรของท่านต้องเลือกวิธีประเมินคณะกรรมการรอบปีหน้า — ในแต่ละชุด เลือก<b>หนึ่ง</b>ทางเลือกที่องค์กรน่าจะเลือกจริง (ราคาต่อปี ไม่รวม VAT)</p>
      ${SV_WTP_SETS.map(([pb, pc], i) => { const k = "s" + (i + 1), v = w[k];
        const opt = [["a", "วิธีเดิม", "แบบประเมินบอร์ดฟรี + สรุปใน Excel", 0], ["b", "เครื่องมือ + รายงาน", "เครื่องมือ OpenInnoScore + รายงาน", pb],
          ["c", "เครื่องมือ + ที่ปรึกษา", "เครื่องมือ + ที่ปรึกษาตีความ/ประชุมหารือ", pc], ["d", "ไม่ซื้อ", "ไม่ซื้อ / ไม่เปลี่ยนวิธี", null]];
        return `<div class="pl-cset"><div class="pl-grp">ชุดที่ ${i + 1}</div><div class="pl-cbox">${opt.map(([o, h, sc, pr]) => `<label class="${v === o ? "on" : ""}">
          <input type="radio" name="wtp-${k}" data-sv="wtp" data-k="${k}" value="${o}"${v === o ? " checked" : ""}>
          <span class="pl-ck">(${SV_WTP_OPT[o]}) ${esc(h)}</span><span class="pl-cs">${esc(sc)}</span>
          <span class="pl-cp">${pr === null ? "—" : pr === 0 ? "0 บาท" : fmt(pr) + " บาท/ปี"}</span></label>`).join("")}</div></div>`; }).join("")}
      <p class="pl-qt">บทบาทของท่านในการตัดสินใจซื้อเครื่องมือลักษณะนี้</p>${radio("wtp", "role", SV_ROLE, w.role)}
      <p class="pl-qt">หากมีการทดลองใช้แบบเสียเงิน 3 เดือน ท่านจะเสนอให้องค์กรทดลองหรือไม่</p>${radio("wtp", "trial", SV_YN, w.trial)}
      <p class="pl-qt">(ก) ท่านคาดว่าเครื่องมือนี้ลดเวลางานของเลขานุการบริษัท/ฝ่าย CG ได้ประมาณกี่ชั่วโมงต่อรอบการประเมิน</p>
      <label class="pl-lab pl-hrs"><input class="inp" type="number" min="0" max="1000" step="1" data-svwtp="hrs" value="${w.hrs ?? ""}"> ชั่วโมง / รอบ</label>
      <p class="pl-qt">(ข) เครื่องมือทำให้พบประเด็นพัฒนาที่วิธีเดิมไม่พบหรือไม่</p>${radio("wtp", "newIss", SV_YN, w.newIss)}
      <label class="pl-lab">ประเด็นอะไร (ถ้ามี — ไม่ระบุชื่อบุคคล)<textarea class="inp pl-ta" rows="2" data-svwtp="newIssTxt">${esc(w.newIssTxt || "")}</textarea></label>
      <p class="pl-qt">(ค) หากซื้อ ท่านจะจ่ายเพิ่มเพื่อ OpenInnoScore โดยเฉพาะ หรือจ่ายเฉพาะบริการที่ปรึกษา</p>${radio("wtp", "pay", SV_PAY, w.pay)}
      ${navBtn(true)}</div>`;
  }
  else if (st === 6) body = `<div class="card"><h3>ส่วนที่ 5 · แบบทดสอบความเข้าใจ (5 ข้อ)</h3>
      ${COMP_Q.map((q, i) => `<p class="pl-qt">${i + 1}. ${esc(q.q)}</p>${radio("comp", String(i), q.o.map((o, j) => ({ v: j, l: o })), r.comp[i])}`).join("")}${navBtn(true)}</div>`;
  else if (st === 7) body = `<div class="card"><h3>ส่วนที่ 6 · คำถามปลายเปิด</h3>
      <label class="pl-lab">1. ฟังก์ชันที่อยากให้เพิ่มใน Dashboard Simulation<textarea class="inp pl-ta" rows="3" data-svopen="f1">${esc(r.open.f1 || "")}</textarea></label>
      <label class="pl-lab">2. ข้อเสนอแนะอื่น<textarea class="inp pl-ta" rows="3" data-svopen="f2">${esc(r.open.f2 || "")}</textarea></label>
      <div class="note" style="margin-top:8px">กรุณาไม่ระบุชื่อบุคคลหรือข้อมูลที่ระบุตัวตนในคำตอบ</div>
      <div class="pl-tools" style="margin-top:14px"><button class="btn g" data-svstep="${st - 1}">← ย้อนกลับ</button><span class="spacer"></span><button class="btn p" id="plSvSubmit">ส่งแบบสอบถาม</button></div></div>`;
  return pageHead("Pilot · การทดสอบการยอมรับ", "แบบสอบถามทดสอบการยอมรับ (consent + anonymous)",
    `ตามแนวทางยกเว้นการพิจารณาจริยธรรม (REC exemption): ไม่เก็บข้อมูลระบุตัวตน · ผลรายงานเป็นกลุ่ม · ถอนตัวได้ทุกเมื่อ`)
    + prog + body + svAdmin();
}
let _svSrv = null, _svSrvR = null, _svSrvMsg = "";
/** แปลงผลจาก OIS_API.admin เป็นอาร์เรย์คำตอบ — รองรับ [..] / {items|rows|responses|data:[..]} และแถวแบบ {payload} */
function svFromServer(res) {
  const arr = Array.isArray(res) ? res : res && (res.items || res.rows || res.responses || res.data || res.results);
  if (!Array.isArray(arr)) return null;
  return arr.map(x => { let p = x && x.payload !== undefined ? x.payload : x; if (typeof p === "string") { try { p = JSON.parse(p); } catch (e) { p = null; } } return p; })
    .filter(p => p && typeof p === "object" && p.sus && p.tam).map(p => Object.assign({ p1: {}, task: {}, comp: {}, open: {}, wtp: {} }, p));
}
const SV_BAND = [[4.51, "มากที่สุด"], [3.51, "มาก"], [2.51, "ปานกลาง"], [1.51, "น้อย"], [1, "น้อยที่สุด"]];
/** การแปลผลค่าเฉลี่ยมาตราส่วน 5 ระดับ (Best & Kahn, 1993) — ปัดเป็นทศนิยม 2 ตำแหน่งก่อนเทียบช่วง */
const svBand = m => { if (isNaN(m)) return "—"; const r = Math.round(m * 100) / 100; return (SV_BAND.find(([lo]) => r >= lo) || SV_BAND[SV_BAND.length - 1])[1]; };
/** สถิติเชิงพรรณนา TAM / SUS — ค่าเฉลี่ย SD การแจกแจงความถี่รายข้อ และ Cronbach's alpha รายโครงสร้าง TAM (n ≥ 5) */
function svAdminDesc(R) {
  const col = (g, i) => R.map(x => x[g] && x[g][i]).filter(v => v >= 1 && v <= 5);
  const freq = a => [1, 2, 3, 4, 5].map(v => a.filter(x => x === v).length);
  const itemRow = (g, i, t) => { const a = col(g, i), f = freq(a), m = plMean(a);
    return `<tr><td class="n">${i}</td><td class="as-dtq" title="${esc(t)}">${esc(t)}</td><td class="n">${a.length}</td>${f.map(c => `<td class="n">${c}</td>`).join("")}
      <td class="n"><b>${fmt(m, 2)}</b></td><td class="n">${fmt(plSD(a), 2)}</td><td>${svBand(m)}</td></tr>`; };
  const head = `<thead><tr><th class="n">ข้อ</th><th>ข้อคำถาม</th><th class="n">n</th><th class="n">1</th><th class="n">2</th><th class="n">3</th><th class="n">4</th><th class="n">5</th><th class="n">x̄</th><th class="n">SD</th><th>แปลผล</th></tr></thead>`;
  const grp = TAM_GRP.map(([k, l, a, b]) => {
    const per = R.map(x => tamMean(x.tam, a, b)).filter(v => !isNaN(v));
    const rows = R.map(x => [...Array(b - a + 1)].map((_, j) => x.tam[a + j])).filter(r => r.every(v => v >= 1 && v <= 5));
    const al = rows.length >= 5 ? plAlpha(rows) : NaN;
    return `<tr class="as-dtg"><td colspan="8"><b>${k} · ${esc(l)}</b> (ข้อ ${a}–${b}) · α = ${rows.length >= 5 ? fmt(al, 2) : `<span class="pill mute">n < 5</span>`}</td>
      <td class="n"><b>${fmt(plMean(per), 2)}</b></td><td class="n">${fmt(plSD(per), 2)}</td><td><b>${svBand(plMean(per))}</b></td></tr>`
      + TAM_ITEMS.slice(a - 1, b).map((t, j) => itemRow("tam", a + j, t)).join("");
  }).join("");
  const susAll = R.map(x => susScore(x.sus)).filter(v => !isNaN(v));
  const tamAll = R.map(x => tamMean(x.tam, 1, TAM_ITEMS.length)).filter(v => !isNaN(v));
  return `<h3 style="margin-top:16px">สถิติเชิงพรรณนา · TAM และ SUS (n = ${R.length})</h3>
    <p class="desc">ความถี่ = จำนวนผู้ตอบในแต่ละระดับ 1–5 · x̄ = ค่าเฉลี่ย · SD = ส่วนเบี่ยงเบนมาตรฐานตัวอย่าง · Cronbach's α รายโครงสร้าง TAM คำนวณเมื่อมีผู้ตอบครบทุกข้อ ≥ 5 คน<br>
      เกณฑ์แปลผลค่าเฉลี่ย 5 ระดับ (Best &amp; Kahn, 1993): 4.51–5.00 = มากที่สุด · 3.51–4.50 = มาก · 2.51–3.50 = ปานกลาง · 1.51–2.50 = น้อย · 1.00–1.50 = น้อยที่สุด</p>
    <div class="grid g4 tight">
      <div class="stat"><div class="k">TAM รวม 17 ข้อ</div><div class="v" id="plTamAll">${fmt(plMean(tamAll), 2)}</div><div class="u">SD ${fmt(plSD(tamAll), 2)} · ${svBand(plMean(tamAll))}</div></div>
      <div class="stat"><div class="k">SUS (0–100)</div><div class="v">${fmt(plMean(susAll), 1)}</div><div class="u">SD ${fmt(plSD(susAll), 1)} · n = ${susAll.length}</div></div></div>
    <div class="tw as-dtw" style="margin-top:10px"><table class="as-dt" id="plTamDesc">${head}<tbody>${grp}</tbody></table></div>
    <h3 style="margin-top:14px;font-size:12.5px">SUS รายข้อ</h3>
    <p class="desc">ข้อคู่ (2, 4, 6, 8, 10) เป็นข้อความเชิงลบ — คำแปลผลบอกระดับความเห็นด้วยกับข้อความ ไม่ใช่ระดับความใช้งานง่าย · คะแนน SUS รวมกลับคะแนนข้อคู่แล้ว (Brooke, 1996)</p>
    <div class="tw as-dtw"><table class="as-dt" id="plSusDesc">${head}<tbody>${SUS_ITEMS.map((t, i) => itemRow("sus", i + 1, t)).join("")}</tbody></table></div>`;
}
function svAdmin() {
  if (S.plan !== "pro") return "";
  const R = _svSrvR || PL.survey.resp, n = R.length;
  const canSrv = !!(window.OIS_API && typeof window.OIS_API.admin === "function");
  const sus = R.map(x => susScore(x.sus)).filter(v => !isNaN(v)), susM = plMean(sus);
  const tam = TAM_GRP.map(([k, l, a, b]) => [k, plMean(R.map(x => tamMean(x.tam, a, b)).filter(v => !isNaN(v)))]);
  const comp = plMean(R.map(x => compPct(x.comp)));
  const task = ["tier", "quad", "reg", "q4", "q5"].map(k => [k, n ? 100 * R.filter(x => x.taskOk && x.taskOk[k]).length / n : NaN]);
  const sub = (lab, key) => { const g = {}; R.forEach(x => { const v = x.p1[key] || "ไม่ระบุ"; (g[v] = g[v] || []).push(x); });
    return `<tr><th colspan="3">${lab}</th></tr>` + Object.entries(g).map(([v, xs]) => `<tr><td>${esc(v)}</td><td class="n">${xs.length}</td>
      <td class="n">${xs.length >= 5 ? fmt(plMean(xs.map(x => susScore(x.sus)).filter(q => !isNaN(q))), 1) : `<span class="pill mute">n < 5 ไม่แสดง</span>`}</td></tr>`).join(""); };
  return `<div class="card pl-admin" style="margin-top:16px"><h3>ผลรวม (n = ${n}) <span class="pill mute">ผู้ดูแล · Pro</span>
      <span class="pill ${_svSrvR ? "blue" : "mute"}">${_svSrvR ? "ข้อมูลจากเซิร์ฟเวอร์" : "ข้อมูลในเครื่องนี้"}</span></h3>
    <p class="desc">ค่าเฉลี่ยระดับกลุ่มเท่านั้น · กลุ่มย่อยแสดงเมื่อ n ≥ 5 · ไม่มีตัวระบุตัวตนในข้อมูล</p>
    ${canSrv ? `<div class="pl-tools" style="margin-bottom:10px"><button class="btn s" id="plSvLoadSrv">โหลดคำตอบทั้งหมดจากเซิร์ฟเวอร์</button>
      ${_svSrvR ? `<button class="btn g" id="plSvLocal">กลับไปใช้ข้อมูลในเครื่อง</button>` : ""}<span class="as-sm">${esc(_svSrvMsg)}</span></div>` : ""}
    <div class="grid g4 tight">
      <div class="stat"><div class="k">SUS เฉลี่ย</div><div class="v" style="color:${susM >= 68 ? "var(--ok)" : "inherit"}">${fmt(susM, 1)}</div><div class="u">เป้าหมาย ≥ 68 (n=${sus.length})</div></div>
      ${tam.map(([k, m]) => `<div class="stat"><div class="k">TAM · ${k}</div><div class="v">${fmt(m, 2)}</div><div class="u">จาก 5</div></div>`).join("")}
      <div class="stat"><div class="k">ความเข้าใจถูกต้อง</div><div class="v">${svPct(comp)}</div><div class="u">5 ข้อ</div></div>
      ${task.map(([k, p], i) => `<div class="stat"><div class="k">งาน ${i + 1} (${k}) ถูกต้อง</div><div class="v">${svPct(p)}</div></div>`).join("")}</div>
    <div class="tw" style="margin-top:12px"><table><thead><tr><th>กลุ่มย่อย</th><th class="n">n</th><th class="n">SUS เฉลี่ย</th></tr></thead><tbody>${sub("สายงาน", "role")}${sub("ประสบการณ์", "exp")}</tbody></table></div>
    ${svAdminDesc(R)}${svAdminAB(R)}${svAdminWtp(R)}
    <div class="pl-tools" style="margin-top:12px"><button class="btn g" id="plSvCsv">Export CSV</button><button class="btn g" id="plSvJson">Export JSON</button><button class="btn g" id="plSvClear">ล้างคำตอบทั้งหมด</button></div></div>`;
}
/** การทดสอบที่ 1 · Grid vs ตาราง — แสดงตัวเลขเมื่อแต่ละกลุ่ม n ≥ 5 */
function svAdminAB(R) {
  const arms = [["grid", "Grid 2×2"], ["table", "ตาราง/ข้อความ"]].map(([k, l]) => {
    const xs = R.filter(x => x.arm === k && x.tasks), ok = xs.length >= 5;
    const acc = plMean(xs.map(x => 100 * SV_TL.filter(t => x.tasks[t] && x.tasks[t].correct).length / SV_TL.length));
    return { k, l, n: xs.length, ok, acc, med: SV_TL.map(t => svMedian(xs.map(x => x.tasks[t] && x.tasks[t].ms))), tot: svMedian(xs.map(x => x.task_ms)) };
  });
  const cell = (a, v) => a.ok ? v : `<span class="pill mute">n < 5</span>`, sec = ms => fmt(ms / 1000, 1);
  return `<h3 style="margin-top:16px">การทดสอบที่ 1 · Grid vs ตาราง (A/B) <span class="pill mute">แสดงผลเมื่อแต่ละกลุ่ม n ≥ 5</span></h3>
    <p class="desc">สุ่มกลุ่มตอนให้ความยินยอม · หลักฐานและคำถามชุดเดียวกัน ต่างกันเฉพาะรูปแบบการแสดง · เวลา = มัธยฐาน (วินาที) จากแสดงงานถึงตอบ</p>
    <div class="tw"><table class="pl-abt"><thead><tr><th>กลุ่ม</th><th class="n">n</th><th class="n">ความถูกต้อง งาน 1–5</th>
      ${SV_TL.map((_, i) => `<th class="n">งาน ${i + 1}</th>`).join("")}<th class="n">รวม</th></tr></thead><tbody>
      ${arms.map(a => `<tr><td>${a.l}</td><td class="n">${a.n}</td><td class="n">${cell(a, fmt(a.acc, 0) + "%")}</td>
        ${a.med.map(m => `<td class="n">${cell(a, sec(m))}</td>`).join("")}<td class="n">${cell(a, sec(a.tot))}</td></tr>`).join("")}</tbody></table></div>`;
}
/** การทดสอบที่ 2 · คุณค่าเชิงพาณิชย์ */
function svAdminWtp(R) {
  const W = R.map(x => x.wtp).filter(w => w && (w.s1 || w.s2 || w.s3 || w.role)), n = W.length;
  const pc = (xs, f) => xs.length ? 100 * xs.filter(f).length / xs.length : NaN;
  const dist = (k, labs) => labs.map(l => `<span class="chip">${esc(l)} <b>${svPct(pc(W, w => w[k] === l))}</b></span>`).join(" ");
  const sets = SV_WTP_SETS.map(([pb, pc2], i) => { const k = "s" + (i + 1), xs = W.filter(w => w[k]);
    return `<tr><td>ชุดที่ ${i + 1} <span style="color:var(--ink-3)">· ข ${fmt(pb)} / ค ${fmt(pc2)}</span></td><td class="n">${xs.length}</td>
      ${Object.keys(SV_WTP_OPT).map(o => `<td class="n">${svPct(pc(xs, w => w[k] === o))}</td>`).join("")}</tr>`; }).join("");
  const allNo = pc(W.filter(w => w.s1 && w.s2 && w.s3), w => w.s1 === "d" && w.s2 === "d" && w.s3 === "d");
  const hrs = W.map(w => w.hrs).filter(v => typeof v === "number");
  const byRole = SV_ROLE.map(l => { const xs = W.filter(w => w.role === l);
    return `<tr><td>${esc(l)}</td><td class="n">${xs.length}</td><td class="n">${xs.length >= 5 ? fmt(pc(xs.flatMap(w => ["s1", "s2", "s3"].map(k => w[k]).filter(Boolean)), v => v === "b" || v === "c"), 0) + "%" : `<span class="pill mute">n < 5</span>`}</td></tr>`; }).join("");
  return `<h3 style="margin-top:16px">การทดสอบที่ 2 · คุณค่าเชิงพาณิชย์ (n = ${n})</h3>
    <p class="desc">ราคาเป็นสมมติฐานสำหรับการทดสอบ ไม่ใช่ใบเสนอราคา · ความเห็นว่ามีประโยชน์ ≠ ความเต็มใจจ่าย ≠ การอนุมัติซื้อจริง (Schmidt &amp; Bijmolt, 2020) — ต้องติดตามการทดลองแบบเสียเงินหรือการอนุมัติซื้อจริงต่อ</p>
    <div class="tw"><table class="pl-abt"><thead><tr><th>ชุดราคา</th><th class="n">n</th><th class="n">(ก) วิธีเดิม</th><th class="n">(ข) เครื่องมือ+รายงาน</th><th class="n">(ค) +ที่ปรึกษา</th><th class="n">(ง) ไม่ซื้อ</th></tr></thead><tbody>${sets}</tbody></table></div>
    <div class="grid g4 tight" style="margin-top:10px">
      <div class="stat"><div class="k">ไม่ซื้อทั้ง 3 ชุด</div><div class="v">${svPct(allNo)}</div><div class="u">เลือก (ง) ทุกชุด</div></div>
      <div class="stat"><div class="k">จะเสนอทดลองแบบเสียเงิน 3 เดือน</div><div class="v">${svPct(pc(W, w => w.trial === "ใช่"))}</div><div class="u">ตอบ "ใช่"</div></div>
      <div class="stat"><div class="k">ชั่วโมงที่ลดได้ / รอบ (เฉลี่ย)</div><div class="v">${fmt(plMean(hrs), 1)}</div><div class="u">n = ${hrs.length} · มัธยฐาน ${fmt(svMedian(hrs), 1)}</div></div>
      <div class="stat"><div class="k">พบประเด็นพัฒนาใหม่</div><div class="v">${svPct(pc(W, w => w.newIss === "ใช่"))}</div><div class="u">ตอบ "ใช่"</div></div></div>
    <div class="pl-dist"><span class="pl-dl">บทบาทในการซื้อ</span> ${dist("role", SV_ROLE)}</div>
    <div class="pl-dist"><span class="pl-dl">จ่ายเพิ่มเพื่ออะไร</span> ${dist("pay", SV_PAY)}</div>
    <div class="tw" style="margin-top:8px"><table><thead><tr><th>บทบาทในการซื้อ</th><th class="n">n</th><th class="n">เลือก (ข) หรือ (ค) · ทุกชุดรวม</th></tr></thead><tbody>${byRole}</tbody></table></div>`;
}
function wireSurvey(h) {
  const sv = PL.survey;
  const c = h.querySelector("#plSvConsent"); if (c) c.onclick = () => { sv.cur = svNew(); _svT0 = {}; sv.step = 1; plSave(); render(); };
  h.querySelectorAll("[data-svti]").forEach(b => b.onclick = () => { if (!sv.cur) return; sv.cur.ti = +b.dataset.svti; plSave(); render(); });
  h.querySelectorAll("input[data-svtask]").forEach(i => i.onchange = () => { const r = sv.cur; if (!r) return;
    const ti = +i.dataset.svtask, t = svTasks(r, svDemo(r))[ti]; let v = i.value; if (t.k === "tier") v = +v;
    const ms = Math.round(performance.now() - (_svT0[ti] || performance.now()));
    r.tasks = r.tasks || {}; r.tasks[t.k] = { ans: v, correct: !!t.ok(v), ms }; r.task[t.k] = v; plSave();
    i.closest(".pl-opts").querySelectorAll("label").forEach(l => l.classList.toggle("on", l.contains(i)));
    const nx = h.querySelector("#plSvTiNext"); if (nx) nx.disabled = false; });
  h.querySelectorAll("[data-svwtp]").forEach(el => el.onchange = () => { const r = sv.cur; if (!r) return; r.wtp = r.wtp || {};
    const k = el.dataset.svwtp; r.wtp[k] = k === "hrs" ? (el.value === "" ? null : clamp(+el.value || 0, 0, 1000)) : el.value.trim().slice(0, 500); plSave(); });
  h.querySelectorAll("[data-svstep]").forEach(b => b.onclick = () => { sv.step = +b.dataset.svstep; plSave(); render(); });
  h.querySelectorAll("input[data-sv]").forEach(i => i.onchange = () => { if (!sv.cur) return;
    const g = i.dataset.sv, k = i.dataset.k; let v = i.value; if (g === "task" && k === "tier") v = +v; if (g === "comp") v = +v;
    sv.cur[g] = sv.cur[g] || {}; sv.cur[g][k] = v; plSave(); i.closest(".pl-opts, .pl-cbox").querySelectorAll("label").forEach(l => l.classList.toggle("on", l.contains(i))); });
  plWireScale(h, (k, v) => { if (!sv.cur) return; const [g, i] = k.split(":"); sv.cur[g][+i] = v; plSave();
    const sc = h.querySelector(`.pl-scale[data-scale="${k}"]`); sc.querySelectorAll("button").forEach(b => b.classList.toggle("on", +b.dataset.v === v)); });
  h.querySelectorAll("[data-svopen]").forEach(t => t.onchange = () => { if (sv.cur) { sv.cur.open[t.dataset.svopen] = t.value.trim().slice(0, 1000); plSave(); } });
  const sb = h.querySelector("#plSvSubmit"); if (sb) sb.onclick = () => {
    if (!sv.cur) return; const r = sv.cur, d = svDemo(r), tk = r.tasks || {};
    r.taskOk = Object.fromEntries(SV_TL.map(k => [k, !!(tk[k] && tk[k].correct)]));
    r.task_ms = SV_TL.every(k => tk[k]) ? SV_TL.reduce((s, k) => s + tk[k].ms, 0) : null;
    r.demo = d.c.t; r.day = new Date().toISOString().slice(0, 10); r.sus_score = susScore(r.sus);
    sv.resp.push(r); sv.cur = null; sv.step = SV_DONE; plSave(); toast("บันทึกแบบสอบถามแล้ว (ไม่มีข้อมูลระบุตัวตน)");
    _svSrv = window.OIS_API && typeof window.OIS_API.submit === "function" ? "pending" : null;
    if (_svSrv) plSubmit("survey", r.demo, r).then(ok => { _svSrv = ok ? "ok" : "fail"; if (ok) { r.srv = true; plSave(); toast("บันทึกเข้าเซิร์ฟเวอร์แล้ว"); } if (S.view === "survey") render(); });
    render();
  };
  const x = h.querySelector("#plSvCsv"); if (x) x.onclick = () => plDl("ois_survey_responses.csv", plCsv([
    ["id", "day", "demo", "arm", "lens", "role", "exp", "task_tier", "task_quad", "task_reg", "tier_ok", "quad_ok", "reg_ok",
      ...SV_TL.flatMap((_, i) => [`t${i + 1}_ans`, `t${i + 1}_ok`, `t${i + 1}_ms`]), "task_total_ms", "q4_order", "q5_order",
      ...SUS_ITEMS.map((_, i) => "sus" + (i + 1)), "sus_score", ...TAM_ITEMS.map((_, i) => "tam" + (i + 1)),
      "wtp_s1", "wtp_s2", "wtp_s3", "wtp_buy_role", "wtp_trial3m", "wtp_hrs_saved", "wtp_new_issue", "wtp_new_issue_txt", "wtp_pay_for",
      ...COMP_Q.map((_, i) => "comp" + (i + 1)), "open1", "open2"],
    ...(_svSrvR || sv.resp).map(r => { const tk = r.tasks || {}, w = r.wtp || {};
      return [r.id, r.day, r.demo, r.arm ?? "", r.lens ?? "", r.p1.role, r.p1.exp, r.task.tier, r.task.quad, r.task.reg, r.taskOk?.tier, r.taskOk?.quad, r.taskOk?.reg,
      ...SV_TL.flatMap(k => tk[k] ? [tk[k].ans, tk[k].correct ? 1 : 0, tk[k].ms] : ["", "", ""]), r.task_ms ?? "", (r.perm?.q4 || []).join("|"), (r.perm?.q5 || []).join("|"),
      ...SUS_ITEMS.map((_, i) => r.sus[i + 1]), r.sus_score, ...TAM_ITEMS.map((_, i) => r.tam[i + 1]),
      ...["s1", "s2", "s3"].map(k => w[k] ? SV_WTP_OPT[w[k]] : ""), w.role, w.trial, w.hrs ?? "", w.newIss, w.newIssTxt, w.pay,
      ...COMP_Q.map((q, i) => r.comp[i] === q.c ? 1 : 0), r.open.f1, r.open.f2]; })]), "text/csv;charset=utf-8");
  const j = h.querySelector("#plSvJson"); if (j) j.onclick = () => plDl("ois_survey_responses.json", JSON.stringify(_svSrvR || sv.resp, null, 2));
  const ls = h.querySelector("#plSvLoadSrv"); if (ls) ls.onclick = async () => {
    ls.disabled = true; ls.textContent = "กำลังโหลด…";
    try { const arr = svFromServer(await window.OIS_API.admin({ kind: "survey" }));
      if (arr) { _svSrvR = arr; _svSrvMsg = `โหลดแล้ว ${arr.length} ชุด`; } else { _svSrvR = null; _svSrvMsg = "เซิร์ฟเวอร์ไม่ส่งข้อมูลกลับ (หรือไม่มีสิทธิ์ผู้ดูแล) — ใช้ข้อมูลในเครื่อง"; }
    } catch (e) { _svSrvR = null; _svSrvMsg = "โหลดจากเซิร์ฟเวอร์ไม่สำเร็จ — ใช้ข้อมูลในเครื่อง"; }
    render(); };
  const lc = h.querySelector("#plSvLocal"); if (lc) lc.onclick = () => { _svSrvR = null; _svSrvMsg = ""; render(); };
  const cl = h.querySelector("#plSvClear"); if (cl) cl.onclick = () => plAsk(cl, `ลบคำตอบทั้งหมด ${sv.resp.length} ชุดในเครื่องนี้?`, () => { sv.resp = []; _svSrvR = null; plSave(); render(); });
}

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
(() => { const _r = render; render = function () { const t0 = performance.now(); _r.apply(this, arguments); logEvent("render", S.view, performance.now() - t0); }; })();
const LOG_SEV = { low: "ต่ำ", mid: "ปานกลาง", high: "สูง" };
function viewSyslog() {
  const L = PL.log, open = L.issues.filter(i => !i.closed), views = Object.entries(L.render).sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n);
  const navLab = id => (NAV.find(n => n.id === id) || {}).lab || id;
  return pageHead("Pilot · การติดตามระบบ", "System log (ระดับรวม ไม่มีข้อมูลบุคคล)",
    `นับจำนวน crash (window.onerror / unhandledrejection), เวลาสร้างหน้าและรายงานแต่ละหน้า และบันทึกปัญหาที่ผู้ทดสอบพบ · เก็บในเครื่องเท่านั้น`)
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
      <div class="pl-tools" style="margin-top:12px"><button class="btn g" id="plLogJson">Export JSON</button><button class="btn g" id="plLogClear">ล้าง log</button></div></div>`;
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
      <div class="pl-tools"><button class="btn s" data-eptest="${x.k}">ทดสอบการเชื่อมต่อ</button>
        ${r ? `<span class="pill ${r.ok ? "ok" : "crit"}">${r.ok ? "เข้าถึงได้" : "เข้าถึงไม่ได้"}</span><span style="font-size:11px;color:var(--ink-3)">${esc(r.msg)} · ${esc(r.at)}</span>` : ""}</div></div>`; }).join("")}</div>`
    + `<div class="note brand" style="margin-top:14px"><b>LIWC-22:</b> ต้นแบบส่งออก .txt จาก Zone A เพื่อรันด้วย academic license แล้วนำค่า % (promotion focus) กลับมากรอก — ยังไม่มีการเรียก LIWC ผ่าน API</div>
      <div class="note" style="margin-top:10px;font-size:11.2px">${PL_LEGAL} · การทดสอบการเชื่อมต่อส่งเพียงคำขอ HEAD แบบไม่มีเนื้อหา (no-cors, timeout 3 วินาที) ไปยัง URL ที่กรอก</div>`;
}
function wireIntegr(h) {
  h.querySelectorAll("[data-ep]").forEach(i => i.onchange = () => { PL.integr.ep[i.dataset.ep] = i.value.trim().slice(0, 300); plSave(); });
  h.querySelectorAll("[data-eptest]").forEach(b => b.onclick = async () => {
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
VIEWS.bod = viewBod; VIEWS.outdomain = viewOutdomain; VIEWS.directives = viewDirectives;
VIEWS.survey = viewSurvey; VIEWS.syslog = viewSyslog; VIEWS.integr = viewIntegr;
if (typeof WIRES2 === "object" && WIRES2) Object.assign(WIRES2, { bod: wireBod, outdomain: wireOutdomain, directives: wireDirectives, survey: wireSurvey, syslog: wireSyslog, integr: wireIntegr });
NAV.push({ id: "bod", g: 4, ico: "☑", lab: "BOD Self-Assessment (OI-1…6)" },
  { id: "outdomain", g: 4, ico: "◌", lab: "โหมดนอกกลุ่มอ้างอิง (ธนาคาร)" },
  { id: "directives", g: 4, ico: "≡", lab: "ข้อสั่งการบอร์ด / Compliance (Level 3)" },
  { id: "survey", g: 4, ico: "✎", lab: "แบบสอบถามทดสอบการยอมรับ" },
  { id: "syslog", g: 4, ico: "⌁", lab: "System log" },
  { id: "integr", g: 4, ico: "⚙", lab: window.OIS_API ? "การเชื่อมต่อ" : "การเชื่อมต่อ (โหมดออฟไลน์)" });
buildNav();
if (S.user) syncNavLocks();
