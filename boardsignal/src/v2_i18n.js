/* OpenInnoScore 2.4 · ชั้นแปลภาษาอังกฤษของหน้าจอ (โหลดท้ายสุด)
   ============================================================================
   ที่ประชุม 15 ต.ค. 2569 §1: หน้าจอ ภาพประกอบ และ user journey ต้องเป็นภาษาอังกฤษทั้งหมด (ยื่นทุน อว. / อาจารย์วิพากษ์)
   ปุ่ม EN/TH ด้านบนคงไว้ · เวอร์ชันไทยและอังกฤษแยกกันชัดเจน

   หลักการ: ชั้นแปลบน DOM — ไม่แก้ไฟล์อื่น
     • S.lang === "EN": ทุกครั้งที่ DOM เปลี่ยน (MutationObserver บน document.body · callback เป็น microtask จึงทำงานก่อนเบราว์เซอร์วาดภาพ
       ไม่มีจังหวะที่เห็นภาษาไทยแวบขึ้นมา) แปล text node และ attribute (title · placeholder · aria-label · alt · label · value ของปุ่ม)
     • การแปล = (ก) ตรงทั้งข้อความใน DICT → (ข) กฎรูปแบบที่มีตัวเลข (ปี พ.ศ. → ค.ศ., วันที่ไทย, หน่วยนับ) →
       (ค) แทนที่ส่วนย่อยภาษาไทยที่ยาวที่สุดก่อน (ดัชนีตามอักษร 2 ตัวแรก) → (ง) ชื่อบริษัทไทย → ชื่อย่อหลักทรัพย์
     • สลับกลับเป็น TH: คืนข้อความเดิมของทุก node ที่เคยแปล แล้ว render() ใหม่ (หน้าที่ render สร้างภาษาไทยเองอยู่แล้ว)
     • ไม่แปลเนื้อหาที่ผู้ใช้ป้อนหรือเนื้อหาเอกสาร: textarea · input · contenteditable · [data-noi18n] · คำสั่ง/รายงาน AI ·
       ข้อความ CEO ที่ไฮไลต์ · คำในพจนานุกรมที่นับได้ — ดู NO_SEL
     • ข้อความที่ผู้ใช้พิมพ์แต่ถูกแสดงซ้ำเป็นข้อความธรรมดา (ความเห็นผู้ตรวจ บันทึกการอนุมัติ ข้อสั่งการ/ผู้รับผิดชอบ ข้อสรุป/มติในหน้า Follow-up
       ความเห็นรายด้านของ BOD SET ฯลฯ) — ทะเบียน USER: บรรทัดที่ผู้ใช้พิมพ์ใหม่เมื่อยืนยันช่องกรอก (change — ไม่รวมค่าเริ่มต้นที่ระบบใส่ และไม่ใช่ทุกตัวอักษรที่พิมพ์) ·
       ช่องที่ผู้ใช้กรอกซึ่งเก็บในสถานะของแอป (harvest) แล้ว "กันไว้" ไม่แปลทั้งเมื่อเป็นข้อความทั้ง node และเมื่ออยู่กลางประโยคของระบบ
       (เดิม: ความเห็น "ตรวจแล้ว" ถูกแปลเป็น "ตรวจ done")
   พจนานุกรม: src/i18n/en.json ({ข้อความไทย: English}) ถูกฝังแทนที่ placeholder __I18NDICT__ ตอน build (build_v2.py)
   ใช้ต่อจากโค้ดอื่น: window.I18N.t("ข้อความ") คืนคำแปลเมื่อ S.lang === "EN" (สำหรับหัวคอลัมน์ CSV/MD ที่สร้างจากสตริง)
   ============================================================================ */
(function () {
  "use strict";
  const DICT = /*__I18NDICT__*/{};
  const TH = /[\u0E00-\u0E3E\u0E40-\u0E7F]/;   // ไทย ยกเว้น ฿ (U+0E3F)
  const isEN = () => typeof S !== "undefined" && S.lang === "EN";
  const norm = s => s.replace(/[\s ]+/g, " ").trim();

  /* ---------------------------------------------------------------- ส่วนที่ไม่แปล (เนื้อหาของผู้ใช้/เอกสาร) */
  const NO_SEL = [
    "[data-noi18n]", "script", "style", "textarea", "[contenteditable]",
    ".dt-prev pre", "#dtLog td:nth-child(2)", "#dtLog td:nth-child(5)",        // ข้อมูลหลายปี: สาร CEO · ผู้ทำ · ความเห็นผู้ตรวจ (v2_data.js ใส่ data-noi18n ด้วย)
    ".ai-pre", ".ai-print", ".ai-en", "#aiPayload",                      // คำสั่ง AI ที่ส่งจริงทุกตัวอักษร · เนื้อรายงาน AI
    "#ceoOut [style*='pre-wrap']", "#ceoOut .pill.ok", "#ceoOut .pill.warn", // ข้อความ CEO ที่ไฮไลต์ · คำที่พจนานุกรมนับได้
    "mark.as-hl", ".cmp-in",
  ].join(",");
  const ATTRS = ["title", "placeholder", "aria-label", "alt", "label"];
  const BTN_INPUT = { button: 1, submit: 1, reset: 1 };

  /* ---------------------------------------------------------------- ทะเบียนข้อความของผู้ใช้ (ไม่แปล) */
  const USER = new Set();
  let USER_LIST = [];                  // ยาว ≥ 4 ตัวอักษร เรียงยาว → สั้น สำหรับกันข้อความกลางประโยค (คำสั้นกว่านั้นกันเฉพาะเมื่อเป็นข้อความทั้ง node)
  const TH0 = /[\u0E00-\u0E3E\u0E40-\u0E7F]/;
  function userAdd(v) {
    if (typeof v !== "string") return;
    let added = false;
    v.split(/\n+/).forEach(x => { x = x.replace(/[\s\u00a0]+/g, " ").trim();
      if (x.length < 2 || !TH0.test(x) || x.length > 2000 || USER.has(x)) return; USER.add(x); added = true; });
    if (added) { USER_LIST = [...USER].filter(x => x.length >= 4).sort((a, b) => b.length - a.length); CACHE.clear(); }
  }
  const TEXT_IN = { "": 1, text: 1, search: 1, email: 1, url: 1, tel: 1 };
  const isEditable = el => el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && TEXT_IN[(el.getAttribute("type") || "").toLowerCase()]));
  /** ช่องที่ผู้ใช้กรอกซึ่งถูกเก็บในสถานะของแอปแล้วแสดงซ้ำเป็นข้อความ — ชื่อฟิลด์ตามโครงสร้างของ v2_reports / v2_pilot / v2_assess
   *  (ข้อความที่ระบบสร้าง เช่น หัวข้อแผนจาก template ไม่อยู่ในรายการนี้ จึงยังแปลได้) */
  function harvest() {
    try {
      const sc = typeof S !== "undefined" && S.sc || {};
      Object.keys(sc).forEach(k => { const o = sc[k]; if (!o || typeof o !== "object") return;
        ["res", "sign", "cg", "c0", "c1", "c2", "cdec0", "cdec1", "cdec2", "o0", "o1", "o2", "iss0", "iss1", "iss2"].forEach(f => userAdd(o[f]));
        (o.plan || []).forEach(p => { if (p) ["concl", "decision", "owner"].forEach(f => userAdd(p[f])); }); });
      const pl = typeof PL !== "undefined" && PL && PL.dir ? PL : null;
      ((pl && pl.dir.rows) || []).forEach(r => { if (!r) return; ["own", "concl", "dec"].forEach(f => userAdd(r[f])); if (r.src === "res") userAdd(r.t); });
      const bs = typeof BSE !== "undefined" && BSE && BSE.evals || [];
      bs.forEach(e => { if (!e) return; userAdd(e.cmte); (e.dims || []).forEach(d => d && userAdd(d.comment)); });
    } catch (e) { }
  }
  /* ยืนยันค่าในช่องกรอก (change) → ลงทะเบียนเฉพาะบรรทัดที่ผู้ใช้พิมพ์ใหม่ (ไม่อยู่ในค่าเริ่มต้นที่ระบบใส่ไว้ เช่น Template ร่าง 56-1) */
  document.addEventListener("change", e => { const el = e.target; if (!isEditable(el)) return;
    const base = new Set(String(el.defaultValue || "").split(/\n+/).map(x => x.replace(/[\s\u00a0]+/g, " ").trim()));
    String(el.value || "").split(/\n+/).forEach(x => { if (!base.has(x.replace(/[\s\u00a0]+/g, " ").trim())) userAdd(x); }); }, true);

  /* ---------------------------------------------------------------- ชื่อบริษัท → ชื่อย่อหลักทรัพย์ */
  const CO = (typeof DATA !== "undefined" && DATA.comps) || [];
  const EXTRA = {};                                   // คีย์ที่สร้างตอนเริ่ม (ไม่อยู่ใน en.json)
  CO.forEach(c => { if (!c.n || !TH.test(c.n)) return;
    EXTRA[c.t + " · " + c.n] = c.t; EXTRA[c.n + " (" + c.t + ")"] = c.t; EXTRA[c.t + " " + c.n] = c.t;
    EXTRA[c.t + " — " + c.n] = c.t; EXTRA[c.n] = c.t; });

  /* ---------------------------------------------------------------- ดัชนี */
  let EXACT = new Map(), IDX = new Map(), CACHE = new Map();
  function build() {
    EXACT = new Map(); IDX = new Map(); CACHE = new Map();
    const add = (k, v) => { k = norm(k); if (!k || typeof v !== "string") return; EXACT.set(k, v);
      if (k.length < 2 || !TH.test(k)) return;
      const p = k.slice(0, 2); let a = IDX.get(p); if (!a) IDX.set(p, a = []); a.push([k, v]); };
    Object.keys(DICT).forEach(k => add(k, DICT[k]));
    Object.keys(EXTRA).forEach(k => add(k, EXTRA[k]));
    IDX.forEach(a => a.sort((x, y) => y[0].length - x[0].length));
  }
  build();

  /* ---------------------------------------------------------------- กฎรูปแบบ (ก่อนแทนส่วนย่อย) */
  const MON_A = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const MON_F = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MON_ENF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const MON_RX = [...MON_F, ...MON_A].map(rx).join("|");
  const ce = y => { y = +y; return y > 2400 ? y - 543 : y < 100 ? (y >= 40 ? 1957 + y : 2000 + y) : y; };   // พ.ศ. → ค.ศ. (รองรับปีย่อ 2 หลัก)
  const monOf = m => { let i = MON_A.indexOf(m); if (i >= 0) return MON_EN[i]; i = MON_F.indexOf(m); return i >= 0 ? MON_ENF[i] : m; };
  const pl = (n, one, many) => (String(n).replace(/,/g, "") === "1" ? one : many);
  const UNITS = {
    "บริษัท-ปี": ["firm-year", "firm-years"], "บริษัท": ["firm", "firms"], "คำ": ["word", "words"], "ครั้ง": ["time", "times"],
    "รายการ": ["item", "items"], "ข้อ": ["item", "items"], "คน": ["person", "people"], "เครดิต": ["credit", "credits"],
    "ตัวอักษร": ["character", "characters"], "หน้า": ["page", "pages"], "แถว": ["row", "rows"], "เดือน": ["month", "months"],
    "วัน": ["day", "days"], "ชั่วโมง": ["hour", "hours"], "นาที": ["minute", "minutes"], "ไฟล์": ["file", "files"],
    "ปี": ["year", "years"], "ที่นั่ง": ["seat", "seats"], "คำถาม": ["question", "questions"], "เทมเพลต": ["template", "templates"],
    "อุตสาหกรรม": ["industry", "industries"], "ตัวแปร": ["variable", "variables"], "ช่อง": ["field", "fields"],
    "หัวข้อ": ["section", "sections"], "ฉบับ": ["copy", "copies"], "กลุ่ม": ["group", "groups"], "ราย": ["entry", "entries"],
    "ท่าน": ["person", "people"], "คะแนน": ["point", "points"], "จุด": ["point", "points"], "ประเด็น": ["point", "points"], "ฟิลด์": ["field", "fields"], "ด้าน": ["dimension", "dimensions"],
  };
  const UNIT_RX = Object.keys(UNITS).sort((a, b) => b.length - a.length).map(rx).join("|");
  const PRE = [
    // ประโยคแรกของร่าง 56-1 ข้อ 7 (Template มาตรฐาน) หลังเติมตัวแทนข้อมูลแล้ว
    [/ในปีบัญชี\s*(\d{4})\s*คณะกรรมการ\s*(.+?)\s*ได้ประเมินผลการปฏิบัติงานของคณะกรรมการในระดับคณะ\s*เพิ่มเติมในประเด็นการกำกับดูแลนวัตกรรมแบบเปิด\s*โดยมีกระบวนการดังนี้/g,
      (m, y, co) => `In FY${ce(y)}, the board of ${t(co)} evaluated the board's performance at board level, additionally covering open innovation governance, through the following process:`],
    // วันที่ไทย: "15 ต.ค. 2569 20:15" · "15 ตุลาคม 2569" · "ต.ค. 2569"
    [new RegExp(`(\\d{1,2})\\s*(${MON_RX})\\s*(\\d{4}|\\d{2})?(?:\\s+(?:เวลา\\s*)?(\\d{1,2}[:.]\\d{2})(?:\\s*น\\.)?)?`, "g"),
      (m, d, mo, y, t) => `${d} ${monOf(mo)}${y ? " " + ce(y) : ""}${t ? " " + t.replace(".", ":") : ""}`],
    [new RegExp(`(${MON_RX})\\s*(\\d{4})`, "g"), (m, mo, y) => `${monOf(mo)} ${ce(y)}`],
    [/(\d{1,2}:\d{2})\s*น\./g, "$1"],
    // ปีบัญชี/ปี พ.ศ.
    [/(\d{4})\s*\(พ\.ศ\.\s*(25\d\d)\)/g, (m, a, y) => (+a === ce(y) ? a : a + " (" + ce(y) + ")")],
    [/^พ\.ศ\.\s*(25\d\d)$/, "BE $1"],
    [/(?:ปีบัญชี\s*)?พ\.ศ\.\s*(25\d\d)\s*\(FY\s?(\d{4})\)/g, "FY$2"],
    [/ปีบัญชี\s*(?:พ\.ศ\.\s*)?(25\d\d)(?:\s*[–-]\s*(25\d\d))?/g, (m, a, b) => "FY" + ce(a) + (b ? "–" + ce(b) : "")],
    [/(?:ปี\s*)?พ\.ศ\.\s*(25\d\d)(?:\s*[–-]\s*(25\d\d))?/g, (m, a, b) => ce(a) + (b ? "–" + ce(b) : "")],
    [/(?:ค\.ศ\.)\s*(\d{4})/g, "$1"],
    [/ปี\s*(25\d\d)(?:\s*[–-]\s*(25\d\d))?/g, (m, a, b) => (b ? ce(a) + "–" + ce(b) : "FY" + ce(a))],
    // จำนวน + หน่วยนับ ("196 บริษัท" → "196 firms") — หน่วยต้องไม่ใช่ส่วนต้นของคำไทยที่ยาวกว่า
    [new RegExp(`(\\d[\\d,.]*)\\s*(${UNIT_RX})(?![\\u0E00-\\u0E7F])`, "g"), (m, n, u) => `${n} ${pl(n, UNITS[u][0], UNITS[u][1])}`],
    [/(\d[\d,.]*)\s*บาท(?![฀-๿])/g, "THB $1"],
    [/(?:^|(?<=\s))ข้อ\s*(\d+(?:\.\d+)?(?:\s*[–-]\s*\d+)?)/g, "item $1"],
    [/ส่วนที่\s*(\d+)/g, "Part $1"],
    [/ร้อยละ\s*(\d[\d.,]*)/g, "$1%"],
    [/ครั้งที่\s*(\d+)/g, "No. $1"],
    [/อันดับ(?:ที่)?\s*(\d+)/g, "rank $1"],
    [/เหลือ\s*(\d[\d,]*)/g, "$1 left"],
  ];
  const POST = [
    [/FY\s?(25\d\d)/g, (m, y) => "FY" + ce(y)],
    [/\b(?:[Ff]iscal [Yy]ear|[Yy]ear|B\.E\.)\s*(25\d\d)\b/g, (m, y) => "FY" + ce(y)],
    [/\b(25[3-9]\d)\s*([–-])\s*(25[3-9]\d)\b/g, (m, a, d, b) => ce(a) + d + ce(b)],
    [/\b([A-Z][A-Z0-9&.\-]{1,9})\s*(?:·|—|-)\s*\1\b/g, "$1"],          // "PTG · PTG" (ชื่อย่อ + ชื่อบริษัทที่แปลงแล้ว)
    [/\b([A-Z][A-Z0-9&.\-]{1,9}) \(\1\)/g, "$1"],
    [/(^|[^\d.,])1 (credits|sets|items|firms|companies|words|years|points|times|fields|rows|receipts|files|questions|dimensions|entries)\b/g,
      (m, p, w) => p + "1 " + ({ companies: "company", entries: "entry" }[w] || w.slice(0, -1))],
    [/\b(a|an|as|or|only|accepts?|upload|Upload|files?|in|from)\.(txt|pdf|csv|json|md|html|docx?)\b/g, "$1 .$2"],
    [/\/\.(txt|pdf|csv|json|md|html)\b/g, "/ .$1"],
    [/ {2,}/g, " "], [/\s+([,;:)]|\.(?![A-Za-z]))/g, "$1"], [/\(\s+/g, "("],
  ];

  /* ---------------------------------------------------------------- แทนส่วนย่อย ยาวที่สุดก่อน
     ภาษาไทยไม่เว้นวรรคระหว่างคำ — ส่วนย่อยต้องเริ่มและจบตรงขอบคำ (Intl.Segmenter "th") มิฉะนั้นคำสั้นอย่าง "ลด"
     จะไปแทนกลางคำ "ปลดล็อก" · ไม่มี Segmenter → ใช้เฉพาะส่วนย่อยที่ยาว ≥ 4 ตัวอักษร */
  const SEG = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("th", { granularity: "word" }) : null;
  const AN = /[A-Za-z0-9%)\u0E00-\u0E7F]/, AN0 = /[A-Za-z0-9(\u0E00-\u0E7F]/;
  function bounds(s) {
    const b = new Set([0, s.length]);
    if (SEG) for (const x of SEG.segment(s)) { b.add(x.index); b.add(x.index + x.segment.length); }
    for (let i = 1; i < s.length; i++) if (TH.test(s[i - 1]) !== TH.test(s[i])) b.add(i);   // ขอบไทย/ไม่ใช่ไทย ("ป้อน|FY2023")
    return b;
  }
  function subst(s) {
    // เลือกส่วนย่อยที่ยาวที่สุดของทั้งข้อความก่อน (ไม่ใช่ยาวที่สุด ณ ตำแหน่งแรกที่เจอ) — กัน "· ใช้" ตัดหน้าประโยคยาวที่เริ่มถัดไป
    const B = bounds(s), n = s.length, M = [];
    for (let i = 0; i + 1 < n; i++) {
      // ขอบด้านไทยต้องเป็นขอบคำ · ด้านละติน/ตัวเลขต้องไม่เริ่มกลางตัวเลขหรือคำ ("490 บาท" ห้ามจับ "0 บาท")
      if (TH.test(s[i]) ? !B.has(i) : (i > 0 && /[A-Za-z0-9]/.test(s[i]) && /[A-Za-z0-9]/.test(s[i - 1]))) continue;
      const a = IDX.get(s.substr(i, 2)); if (!a) continue;
      for (let j = 0; j < a.length; j++) {
        const k = a[j][0], e = i + k.length;
        if (e <= n && s.startsWith(k, i) && (SEG ? (B.has(e) || !TH.test(k[k.length - 1])) : k.length >= 4)) M.push([i, e, a[j][1]]);
      }
    }
    if (!M.length) return s;
    M.sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]) || x[0] - y[0]);
    const used = new Uint8Array(n), pick = [];
    for (const m of M) { let ok = true; for (let q = m[0]; q < m[1]; q++) if (used[q]) { ok = false; break; }
      if (ok) { for (let q = m[0]; q < m[1]; q++) used[q] = 1; pick.push(m); } }
    pick.sort((x, y) => x[0] - y[0]);
    let out = "", i = 0;
    for (const [st, e, v0] of pick) {
      out += s.slice(i, st); let v = v0;
      // เติมช่องว่างเฉพาะด้านที่ต้นฉบับเป็นอักษรไทยชิดกัน ("หลักฐาน E0" + "1" → "Evidence E01")
      if (v && out && TH.test(s[st]) && AN.test(out[out.length - 1]) && AN0.test(v[0])) v = " " + v;
      const nx = s[e];
      if (v && nx && TH.test(s[e - 1]) && AN0.test(nx) && AN.test(v[v.length - 1])) v += " ";
      out += v; i = e;
    }
    return out + s.slice(i);
  }
  /* ตัวแทนข้อมูลของ Template 56-1 ในข้อความของระบบ ({{ชื่อบริษัท}}) → ชื่อภาษาอังกฤษที่ใช้แทนกันได้ ({{company}}) — window.T561_ALIAS จาก v2_tiers.js
     (ข้อความใน Template ที่ผู้ใช้แก้อยู่ใน textarea จึงไม่ถูกแตะ) */
  const phEN = s => { const A = window.T561_ALIAS; return A && s.indexOf("{{") >= 0 ? s.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m, k) => A[k] ? "{{" + A[k] + "}}" : m) : s; };
  const THG = /[\u0E00-\u0E3E\u0E40-\u0E7F]/g;
  const thaiCount = x => (x.match(THG) || []).length;
  function t(src) {
    if (typeof src !== "string" || !TH.test(src)) return src;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(src), core = norm(m[2]);
    if (USER.has(core)) return src;                                       // ข้อความของผู้ใช้ทั้ง node
    let r = CACHE.get(core);
    if (r === undefined) {
      r = EXACT.get(core);
      if (r === undefined) {
        // ตัวแทนข้อมูลของ Template ({{ชื่อบริษัท}} ฯลฯ) เป็นรหัสที่ระบบใช้จริง — ไม่แปลทีละคำ (phEN ด้านล่างแปลงเป็นชื่ออังกฤษที่ใช้แทนกันได้)
        const tok = []; r = core.replace(/\{\{[^{}]*\}\}/g, x => "\u0001" + (tok.push(x) - 1) + "\u0001");
        // ข้อความของผู้ใช้กลางประโยคของระบบ ("มติ: <ข้อความผู้ใช้> · ผู้จัดทำ: <ชื่อ>") — กันไว้แบบเดียวกับตัวแทนข้อมูล
        for (let i = 0; i < USER_LIST.length; i++) { const u = USER_LIST[i]; if (r.indexOf(u) >= 0) r = r.split(u).join("\u0001" + (tok.push(u) - 1) + "\u0001"); }
        // สองทาง: (ก) ส่วนย่อยก่อนแล้วจึงกฎตัวเลข (ข) กฎตัวเลขก่อน — เลือกผลที่เหลือภาษาไทยน้อยกว่า
        const pre = x => { for (const [re, f] of PRE) x = x.replace(re, f); return x; };
        const a = TH.test(r) ? subst(pre(subst(r))) : r;
        let b = pre(r); if (TH.test(b)) { const e = EXACT.get(b); b = e !== undefined ? e : subst(b); }
        r = thaiCount(b) <= thaiCount(a) ? b : a;
        for (const [re, f] of POST) r = r.replace(re, f);
        r = r.replace(/\u0001(\d+)\u0001/g, (x, i) => tok[+i]).trim();
      }
      r = phEN(r);
      if (CACHE.size > 30000) CACHE.clear();
      CACHE.set(core, r);
    }
    return m[1] + r + m[3];
  }

  /* ---------------------------------------------------------------- เดิน DOM */
  const touched = new Set();
  const stats = { passes: 0, lastMs: 0, maxMs: 0, totalMs: 0, nodes: 0, lastNodes: 0 };
  /* ภาษาไทยไม่เว้นวรรคระหว่างข้อความกับแท็ก (<b>…</b>) — ภาษาอังกฤษต้องเว้น: เติมช่องว่างที่ขอบเมื่อพี่น้องข้างเคียงชิดกัน */
  const WL = /[A-Za-z0-9%)\]”’"'\u0E00-\u0E7F]$/, WR = /^[A-Za-z0-9(\[“‘"'\u0E00-\u0E7F]/;
  const sibText = (n, prev) => { let x = prev ? n.previousSibling : n.nextSibling;
    while (x && x.nodeType === 8) x = prev ? x.previousSibling : x.nextSibling;
    if (!x) return ""; if (x.nodeType === 1 && /^(BR|INPUT|SELECT|TEXTAREA|svg|DIV|P|LI|TR|TD|TABLE|UL|OL|H\d)$/i.test(x.tagName)) return "";
    return x.textContent || ""; };
  function space(n, e) {
    if (!/^\s/.test(e) && /^[A-Za-z0-9(“"]/.test(e) && WL.test(sibText(n, true))) e = " " + e;
    if (!/\s$/.test(e) && /[A-Za-z0-9)%.,:;”"]$/.test(e) && WR.test(sibText(n, false))) e = e + " ";
    return e;
  }
  function trText(n) {
    const v = n.nodeValue; if (!v || !TH.test(v)) return;
    let e = t(v); if (e === v) return;
    e = space(n, e);
    // ป้ายรอง "พ.ศ. 2566" ที่อยู่ข้างปี ค.ศ. เดียวกันอยู่แล้ว → ซ่อนในโหมด EN (แสดงปี ค.ศ. อย่างเดียว)
    const be = /^\s*พ\.ศ\.\s*(25\d\d)\s*$/.exec(v), g = be && n.parentElement && n.parentElement.parentElement;
    if (g && g.textContent.indexOf(String(+be[1] - 543)) >= 0) e = "";
    if (n.__i18nTh === undefined || TH.test(v)) n.__i18nTh = v;
    n.nodeValue = e; touched.add(n); stats.lastNodes++;
  }
  function trAttrs(el) {
    for (let i = 0; i < ATTRS.length; i++) {
      const a = ATTRS[i], v = el.getAttribute(a);
      if (v && TH.test(v)) { (el.__i18nA || (el.__i18nA = {}))[a] = v; el.setAttribute(a, t(v)); touched.add(el); stats.lastNodes++; }
    }
    if (el.tagName === "INPUT" && BTN_INPUT[el.type] && TH.test(el.value || "")) {
      (el.__i18nA || (el.__i18nA = {})).value = el.value; el.value = t(el.value); touched.add(el);
    }
  }
  /* ช่องข้อความ (textarea): เนื้อหาเป็นของผู้ใช้จึงไม่แปล แต่ placeholder / aria-label / title เป็นข้อความของระบบ → แปลเฉพาะ attribute */
  const taAttrOK = el => el.tagName === "TEXTAREA" && !el.hasAttribute("data-noi18n") && !(el.parentElement && el.parentElement.closest(NO_SEL));
  const FILTER = { acceptNode: n => { if (n.nodeType === 1 && n.matches(NO_SEL)) { if (taAttrOK(n)) trAttrs(n); return NodeFilter.FILTER_REJECT; } return NodeFilter.FILTER_ACCEPT; } };
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { const p = root.parentElement; if (p && !p.closest(NO_SEL)) trText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (root.closest(NO_SEL)) { if (taAttrOK(root)) trAttrs(root); return; } trAttrs(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, FILTER);
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) trText(n); else trAttrs(n); }
  }
  function timed(fn) {
    const t0 = performance.now(); stats.lastNodes = 0;
    try { fn(); } catch (e) { if (window.console) console.warn("i18n", e); }
    const ms = performance.now() - t0;
    stats.passes++; stats.lastMs = ms; stats.totalMs += ms; stats.maxMs = Math.max(stats.maxMs, ms); stats.nodes += stats.lastNodes;
  }
  function trTitle() { if (TH.test(document.title)) { if (!trTitle.th) trTitle.th = document.title; document.title = t(document.title); } }
  function translateAll() { if (!isEN()) return; timed(() => { harvest(); walk(document.body); trTitle(); }); mo.takeRecords(); }
  function restoreAll() {
    touched.forEach(n => {
      if (n.nodeType === 3) { if (n.__i18nTh !== undefined) n.nodeValue = n.__i18nTh; n.__i18nTh = undefined; }
      else if (n.__i18nA) { Object.keys(n.__i18nA).forEach(a => a === "value" ? (n.value = n.__i18nA[a]) : n.setAttribute(a, n.__i18nA[a])); n.__i18nA = null; }
    });
    touched.clear();
    if (trTitle.th) { document.title = trTitle.th; trTitle.th = null; }
    mo.takeRecords();
  }
  function prune() { if (touched.size > 20000) touched.forEach(n => { if (!n.isConnected) touched.delete(n); }); }

  const mo = new MutationObserver(recs => {
    if (!isEN()) return;
    timed(() => {
      harvest();
      for (const r of recs) {
        if (r.type === "childList") r.addedNodes.forEach(walk);
        else if (r.type === "characterData") { const p = r.target.parentElement; if (p && !p.closest(NO_SEL)) trText(r.target); }
        else if (r.type === "attributes") { const el = r.target; if (!el.closest(NO_SEL) || taAttrOK(el)) trAttrs(el); }
      }
      trTitle();
    });
    mo.takeRecords(); prune();
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat("value") });

  /* ---------------------------------------------------------------- สลับภาษา: ห่อ render() */
  let last = isEN() ? "EN" : "TH";
  function langSync() {
    const now = isEN() ? "EN" : "TH";
    if (now === last) return;
    last = now;
    document.documentElement.lang = now === "EN" ? "en" : "th";
    if (now === "EN") translateAll(); else restoreAll();
  }
  if (typeof render === "function") {
    const _render = render;
    render = function () { const r = _render.apply(this, arguments); langSync(); return r; };   // eslint-disable-line no-global-assign
  }
  /* วันที่ที่สร้างใหม่ใช้รูปแบบสากลในโหมด EN (toLocale*String("th-TH") → "en-GB") */
  ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"].forEach(f => {
    const o = Date.prototype[f];
    Date.prototype[f] = function (loc, opt) { return o.call(this, isEN() && loc === "th-TH" ? "en-GB" : loc, opt); };
  });

  /* เอกสารพิมพ์ที่สร้างเป็นสตริงแล้วใส่ iframe.srcdoc (บันทึกหน้าเดียว · brief) — แปลก่อนส่งเข้า iframe */
  function trHtml(html) {
    try {
      const d = new DOMParser().parseFromString(html, "text/html");
      walk(d.body); if (TH.test(d.title)) d.title = t(d.title);
      d.documentElement.lang = "en";
      return (/^\s*<!doctype/i.test(html) ? "<!doctype html>" : "") + d.documentElement.outerHTML;
    } catch (e) { return html; }
  }
  const SD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");
  if (SD && SD.set) Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", { configurable: true, enumerable: SD.enumerable,
    get() { return SD.get.call(this); }, set(v) { SD.set.call(this, isEN() && TH.test(v) ? trHtml(v) : v); } });

  window.I18N = {
    t: s => (isEN() ? t(s) : s),        // ใช้กับข้อความที่ไม่ได้ผ่าน DOM (หัวคอลัมน์ CSV/MD)
    raw: t, html: trHtml, translateAll, restoreAll, stats, NO_SEL,
    user: userAdd, isUser: s => USER.has(norm(String(s || ""))),         // ลงทะเบียน/ตรวจข้อความของผู้ใช้ (ไม่แปล)
    size: () => EXACT.size,
    isExact: s => EXACT.has(norm(s)),
    clearCache: () => CACHE.clear(),
    load(d) { Object.assign(DICT, d || {}); build(); if (isEN()) translateAll(); },
  };
  document.documentElement.lang = isEN() ? "en" : "th";
  if (isEN()) translateAll();
})();
