/* OpenInnoScore 2.4 · ข้อมูลหลายปี · อัปโหลดปีใหม่ · แยกข้อมูลผู้ใช้จนกว่าผู้ดูแลอนุมัติ · Validity คำนวณใหม่
   ----------------------------------------------------------------------------------------------------------
   หลักการที่หน้าจอทั้งหมดในไฟล์นี้ยึด (บทความ §4.3 DP2 · ฐานอ้างอิงตรึง)
     · บริษัท-ปีใหม่ถูกให้คะแนน "เทียบ" ฐานอ้างอิง REF-928 ที่ตรึงไว้ทันที — ข้อมูลใหม่ไม่เคยขยับฐานอ้างอิง
     · หลักฐานความเที่ยงตรง (validity) คำนวณใหม่บน "ชุดประเมิน" = ปีอ้างอิงของบทความ + ปีใหม่ที่อนุมัติแล้วและมีผลลัพธ์ปีถัดไป
     · การตรึงฐานใหม่ (re-freeze) เป็นการตัดสินใจที่ตั้งใจและมีเวอร์ชัน — ระบบบันทึกได้เพียงข้อเสนอ
   โหมดออฟไลน์: เก็บใน localStorage "ois_data_v1" แยกตามอีเมลผู้ใช้ (S.user) · ผู้ดูแลเป็นโหมดจำลองที่ติดป้ายชัดเจน
   โหมดเซิร์ฟเวอร์: OIS_API.data → /api/data/* (server/data_api.py) · แยกตามบัญชีที่เข้าสู่ระบบ · ผู้ดูแลตาม ADMIN_USER / ADMIN_EMAILS
   ไฟล์อ้างอิงรายแถว (NDA) ไม่เคยถูกฝังในไฟล์นี้ — โหมดเซิร์ฟเวอร์ได้รับเฉพาะค่าสรุปรายบริษัทและสถิติรายปี */
(() => {
  const DT_LS = "ois_data_v1";
  const MIN_WORDS = 2000, MIN_N = 30;
  const DTV = new Set(["dataupload", "dataadmin", "valid", "profile"]);
  const API = () => (typeof window.OIS_API === "object" && window.OIS_API && window.OIS_API.server && window.OIS_API.data) ? window.OIS_API.data : null;
  const SRV = () => !!API();
  const th = y => (+y) + 543;
  const isEN = () => typeof S !== "undefined" && S.lang === "EN";
  const yr = y => isEN() ? String(+y) : String(th(y));                // ปีที่ยืนเดี่ยวในตาราง/กราฟ: EN = ค.ศ. · TH = พ.ศ.
  const yrP = y => isEN() ? "" : ` <span style="color:var(--ink-3)">(${y})</span>`;
  const f3 = v => v === null || v === undefined || !isFinite(v) ? "—" : fmt(v, 3).replace(/^-/, "−");
  const f2 = v => v === null || v === undefined || !isFinite(v) ? "—" : fmt(v, 2);
  const f1 = v => v === null || v === undefined || !isFinite(v) ? "—" : fmt(v, 1);   // OIS: ทศนิยม 1 ตำแหน่งทั้งออฟไลน์และเซิร์ฟเวอร์
  const r1 = v => Math.round(v * 10) / 10;
  const U = t => `<span data-noi18n>${esc(t == null ? "" : String(t))}</span>`;   // ข้อความที่ผู้ใช้พิมพ์/ชื่อไฟล์/อีเมล — ชั้นแปลภาษาไม่แตะ
  const NO_SET = "การดึงข้อมูลอัตโนมัติจาก SET / Smart Marketplace ถูกยกเลิก — ใช้ข้อมูลที่เจ้าหน้าที่ตรวจและบันทึกแล้วเท่านั้น";
  const EST_LAB = "ค่าประมาณจากพจนานุกรมเปิด — เทียบฐานได้โดยประมาณ";
  const LIWC_LAB = "LIWC-22 (ผู้ใช้กรอกเอง)";
  const REFV = OIS.version || "REF928-edit6-20260930";
  const VTHX = (typeof VTH === "object" && VTH) || { sp: [.15, .05], auc: [.60, .55], lift: [2.0, 1.3] };
  const ST = { pending: ["รออนุมัติ (เห็นเฉพาะคุณ)", "warn"], approved: ["อนุมัติแล้ว · อยู่ในชุดข้อมูลหลัก", "ok"],
               rejected: ["ไม่อนุมัติ (เห็นเฉพาะคุณ)", "crit"], withdrawn: ["ถอนแล้ว", "mute"] };
  const VDP = { PASS: ["✓ PASS", "ok"], CAUTION: ["⚠ CAUTION", "warn"], FAIL: ["✕ FAIL", "crit"] };
  const VCOL = { PASS: "var(--ok)", CAUTION: "var(--warn)", FAIL: "var(--crit)" };
  const DT = { cache: {}, loading: {}, form: null, last: null, msg: null };
  try { DT.adminDemo = sessionStorage.getItem("ois_dt_admin") === "1"; } catch (e) { DT.adminDemo = false; }

  /* ======================================================================= สถิติ (ตรงกับ server/data_api.py) */
  function rankAvg(x) {
    const idx = x.map((v, i) => i).sort((a, b) => x[a] - x[b]), r = new Array(x.length);
    for (let i = 0; i < idx.length;) {
      let j = i; while (j + 1 < idx.length && x[idx[j + 1]] === x[idx[i]]) j++;
      const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = avg; i = j + 1;
    }
    return r;
  }
  function pearson(a, b) {
    const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
  }
  function lgamma(z) {   // Lanczos
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function betacf(a, b, x) {
    const T = 1e-300, qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap; d = 1 / (Math.abs(d) < T ? T : d); let h = d;
    for (let m = 1; m < 300; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; d = 1 / (Math.abs(d) < T ? T : d); c = 1 + aa / (Math.abs(c) < T ? T : c); h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; d = 1 / (Math.abs(d) < T ? T : d); c = 1 + aa / (Math.abs(c) < T ? T : c);
      const de = d * c; h *= de; if (Math.abs(de - 1) < 1e-14) break;
    }
    return h;
  }
  function betainc(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const lb = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
    return x < (a + 1) / (a + b + 2) ? Math.exp(lb) * betacf(a, b, x) / a : 1 - Math.exp(lb) * betacf(b, a, 1 - x) / b;
  }
  function spearman(s, y) {
    const n = s.length; if (n < 3) return [null, null];
    const rho = pearson(rankAvg(s), rankAvg(y)); if (rho === null) return [null, null];
    if (Math.abs(rho) >= 1) return [rho, 0];
    const t = rho * Math.sqrt((n - 2) / (1 - rho * rho)), df = n - 2;
    return [rho, betainc(df / 2, .5, df / (df + t * t))];
  }
  function pctileStata(x, p) {
    const v = x.slice().sort((a, b) => a - b), n = v.length, P = n * p / 100;
    if (Math.abs(P - Math.round(P)) < 1e-9) { const k = Math.round(P); if (k <= 0) return v[0]; if (k >= n) return v[n - 1]; return (v[k - 1] + v[k]) / 2; }
    return v[Math.min(Math.floor(P), n - 1)];
  }
  function aucMW(s, lab) {
    const n1 = lab.reduce((t, v) => t + v, 0), n0 = lab.length - n1;
    if (!n1 || !n0) return [null, n1, n0];
    const r = rankAvg(s); let r1 = 0; lab.forEach((l, i) => { if (l) r1 += r[i]; });
    return [(r1 - n1 * (n1 + 1) / 2) / (n1 * n0), n1, n0];
  }
  function hanleyMcNeil(a, n1, n0) {
    if (a === null || !n1 || !n0) return null;
    const q1 = a / (2 - a), q2 = 2 * a * a / (1 + a);
    return Math.sqrt(Math.max(0, (a * (1 - a) + (n1 - 1) * (q1 - a * a) + (n0 - 1) * (q2 - a * a)) / (n1 * n0)));
  }
  function decileLift(s, y) {
    const cuts = Array.from({ length: 9 }, (_, i) => pctileStata(s, 10 * (i + 1))), top = [], bot = [];
    s.forEach((v, i) => { let d = cuts.findIndex(c => v <= c); if (d < 0) d = 9; if (d === 9) top.push(y[i]); else if (d === 0) bot.push(y[i]); });
    if (!top.length || !bot.length) return [null, null, null];
    const mt = top.reduce((a, b) => a + b, 0) / top.length, mb = bot.reduce((a, b) => a + b, 0) / bot.length;
    if (mb === 0) return [mt > 0 ? Infinity : null, mt, mb];
    return [mt / mb, mt, mb];
  }
  const gradeX = (v, t) => v === null || v === undefined ? null : v >= t[0] ? "pass" : v >= t[1] ? "caution" : "fail";
  function verdictX(sp, auc, lift) {
    const g = [gradeX(sp, VTHX.sp), gradeX(auc, VTHX.auc), gradeX(lift, VTHX.lift)];
    if (g.includes(null)) return null;
    return g.includes("fail") ? "FAIL" : g.every(x => x === "pass") ? "PASS" : "CAUTION";
  }
  function vStats(s, y) {
    const n = s.length, [sp, p] = spearman(s, y), cut = pctileStata(y, 66.667), lab = y.map(v => v >= cut ? 1 : 0);
    const [auc, n1, n0] = aucMW(s, lab), se = hanleyMcNeil(auc, n1, n0), [lift, d10, d1] = n >= 10 ? decileLift(s, y) : [null, null, null];
    return { n, sp, p, p_txt: p === null ? null : p < .001 ? "<0.001" : p < .1 ? p.toFixed(3) : p.toFixed(2), auc, se,
             ci: se === null ? null : [Math.max(0, auc - 1.96 * se), Math.min(1, auc + 1.96 * se)], n_top: n1, cut,
             lift: lift === Infinity ? null : lift, lift_inf: lift === Infinity, d10, d1, v: verdictX(sp, auc, lift === Infinity ? 1e9 : lift) };
  }
  const STATS = { rankAvg, spearman, pctileStata, aucMW, hanleyMcNeil, decileLift, verdictX, vStats, betainc };

  /* ======================================================================= นับคำ · อ่านไฟล์ */
  /** ตัวนับคำหลัก = window.countWords (ตัวเดียวกับ Zone A) ถ้ามี · ไม่มีก็ใช้ countWords เดิมของ v2_app.js */
  function wordsOf(t) {
    if (typeof window.countWords === "function") return window.countWords(t);
    if (typeof countWords === "function") return countWords(t);
    try { const seg = new Intl.Segmenter("th", { granularity: "word" }); let n = 0; for (const s of seg.segment(t)) if (s.isWordLike) n++; return n; }
    catch (e) { return (t.match(/\S+/g) || []).length; }
  }
  /** ตัวนับของเซิร์ฟเวอร์ (server/data_api.py count_words) = กติกาสำรองของ window.countWords เมื่อไม่มีตัวตัดคำไทย:
   *  อักขระไทย ÷ 5 (ปัดเศษ) + token ที่คั่นด้วยช่องว่างซึ่งมีตัวอักษร/ตัวเลข · เซิร์ฟเวอร์ไม่เชื่อจำนวนคำจากเบราว์เซอร์และนับซ้ำด้วยกติกานี้
   *  การนำเข้าจึงต้องผ่านทั้งสองตัวนับ (ออฟไลน์และเซิร์ฟเวอร์ใช้กติกาเดียวกัน) */
  function wordsSrv(t) {
    t = String(t || ""); if (!t.trim()) return 0;
    const TH = /[\u0E00-\u0E7F]+/g, th = (t.match(TH) || []).join("").length;
    return Math.round(th / 5) + t.replace(TH, " ").split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
  }
  async function sha256(buf) {
    try { const h = await crypto.subtle.digest("SHA-256", buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""); }
    catch (e) { return null; }
  }

  /* ======================================================================= ที่เก็บในเครื่อง (ออฟไลน์) */
  function lsLoad() {
    try { const o = JSON.parse(localStorage.getItem(DT_LS) || "null"); if (o && o.v === 1 && o.recs) return o; } catch (e) { }
    return { v: 1, seq: 0, recs: {}, log: [], refreeze: [], vAt: null };
  }
  function lsSave(o) { try { localStorage.setItem(DT_LS, JSON.stringify(o)); return true; } catch (e) { toast("บันทึกในเครื่องไม่สำเร็จ (พื้นที่เต็ม?)"); return false; } }
  const meKey = () => String(S.user || "guest").trim().toLowerCase();
  /** การแยกข้อมูล: รายการของผู้อื่นที่ยังไม่อนุมัติ "ไม่ถูกส่งออกจากฟังก์ชันนี้" — หน้าใดก็เห็นไม่ได้ */
  function lsVisible(o) {
    const me = meKey(), out = [];
    Object.entries(o.recs).forEach(([u, arr]) => arr.forEach(r => {
      if (u === me || r.status === "approved") out.push(Object.assign({}, r, { mine: u === me, owner: u === me ? u : null }));
    }));
    return out.sort((a, b) => a.fy - b.fy || a.id - b.id);
  }
  function lsAll(o) { const out = []; Object.entries(o.recs).forEach(([u, arr]) => arr.forEach(r => out.push(Object.assign({}, r, { owner: u, mine: u === meKey() })))); return out.sort((a, b) => a.id - b.id); }
  function lsLog(o, rid, action, comment) { o.log.unshift({ id: o.log.length + 1, record_id: rid, actor_label: meKey() + (action === "submit" || action === "withdraw" ? "" : " (ผู้ดูแลจำลอง)"), action, comment: comment || "", created: new Date().toISOString() }); }

  /* ======================================================================= ให้คะแนนเทียบฐานอ้างอิงที่ตรึงไว้ (โหมดออฟไลน์ — ฟังก์ชันเดียวกับทุกหน้า) */
  function scoreLocal(p) {
    const promo = p.liwc !== null && p.liwc !== undefined ? +p.liwc : promoAtPct(p.dp);
    const amp = ampOf(p.fam, p.pol, p.fem), cP = cpOf(promo), B = cP * amp, o = oisOf(B);
    return { promo, promo_src: p.liwc !== null && p.liwc !== undefined ? "liwc" : "lexicon", amp, B, ois: r1(o),
             ois_ind: r1(oisIndOf(B, p.ind)), tier: tierOf(o), quad: quadOf(cP, amp),
             band: band90(promo, p.fam, p.pol, p.fem), regime: REGIME[p.fy] || null, ref: REFV, frozen: true, scored: new Date().toISOString() };
  }

  /* ======================================================================= ตรวจคุณภาพข้อมูล (ตรงกับ quality_checks ฝั่งเซิร์ฟเวอร์) */
  function checks(p, prevFy, dup) {
    const out = [], add = (k, ok, t) => out.push({ k, ok, t });
    add("สัดส่วนอยู่ในช่วง 0–1", p.fem >= 0 && p.fem <= 1 && p.fam >= 0 && p.fam <= 1 ? "ok" : "fail", `กรรมการหญิง ${fmt(p.fem, 3)} · กรรมการครอบครัว ${fmt(p.fam, 3)}`);
    add("จำนวนคนไม่เกินขนาดบอร์ด", p.nfem <= p.bsize && p.nfam <= p.bsize ? "ok" : "fail", `หญิง ${p.nfem} · ครอบครัว ${p.nfam} · บอร์ด ${p.bsize} คน`);
    add("อายุงานเฉลี่ย 0–40 ปี", p.ten >= 0 && p.ten <= 40 ? "ok" : "fail", fmt(p.ten, 1) + " ปี");
    const wS = (p.ceo || {}).words_server ?? (p.ceo || {}).words ?? 0, wC = (p.ceo || {}).words || 0;
    add("สาร CEO ≥ 2,000 คำ", wS >= MIN_WORDS && wC >= MIN_WORDS ? "ok" : "fail", `${fmt(wC)} คำ · ตัวนับของเซิร์ฟเวอร์ ${fmt(wS)} คำ`);
    if (prevFy === null || prevFy === undefined) add("ลำดับปีบัญชี", "warn", "ยังไม่มีปีก่อนหน้าของบริษัทนี้ในระบบ — ตรวจว่าเป็นบริษัทใหม่จริง");
    else if (p.fy === prevFy + 1) add("ลำดับปีบัญชี", "ok", `ต่อจากปี ${th(prevFy)} (${prevFy})`);
    else add("ลำดับปีบัญชี", "warn", `เว้นช่วง ${p.fy - prevFy - 1} ปี จากปีล่าสุด (${th(prevFy)})`);
    if (dup) add("ซ้ำกับข้อมูลที่อนุมัติแล้ว", "warn", "มีบริษัท-ปีนี้ในชุดข้อมูลหลักแล้ว — การอนุมัติจะเพิ่มอีกแถว");
    add("ที่มาของค่า promotion", p.liwc !== null && p.liwc !== undefined ? "ok" : "warn", p.liwc !== null && p.liwc !== undefined ? LIWC_LAB : EST_LAB);
    add("แบบ 56-1 One Report", p.r561 ? "ok" : "warn", p.r561 ? p.r561.filename : "ไม่ได้แนบ");
    add("ผลลัพธ์ปีถัดไป (สำหรับ validity)", p.oi_next !== null && p.oi_next !== undefined ? "ok" : "warn",
      p.oi_next !== null && p.oi_next !== undefined ? p.oi_next + " รายการ" : "ไม่มี — แถวนี้ไม่เข้าชุดประเมิน validity");
    return out;
  }
  function prevLocal(o, r) {
    const appr = lsAll(o).filter(x => x.status === "approved" && x.ticker === r.ticker && x.id !== r.id);
    const yrs = appr.map(x => x.fy).concat(byT[r.ticker] ? [2023] : []);
    const before = yrs.filter(y => y < r.fy);
    const prevFy = before.length ? Math.max(...before) : null, dup = yrs.includes(r.fy);
    const pa = appr.filter(x => x.fy < r.fy).sort((a, b) => a.fy - b.fy).pop();
    let prev = null;
    if (pa) prev = { src: `ข้อมูลอนุมัติแล้ว ปี ${th(pa.fy)}`, fy: pa.fy, bsize: pa.payload.bsize, fem: pa.payload.fem, fam: pa.payload.fam, pol: pa.payload.pol, ten: pa.payload.ten,
                     ois: pa.score.ois, tier: pa.score.tier, quad: pa.score.quad };
    else if (byT[r.ticker] && r.fy > 2023) {
      const c = byT[r.ticker], amp = ampOf(c.fam, c.pol, c.fem), cP = cpOf(c.promo), o2 = oisOf(cP * amp);
      const oc = c.ois !== undefined ? r1(c.ois) : r1(o2);
      prev = { src: "ชุดข้อมูลปัจจุบัน ปี 2566", fy: 2023, bsize: c.bsize, fem: c.fem, fam: c.fam, pol: c.pol, ten: c.ten, ois: oc, tier: tierOf(oc), quad: quadOf(cP, amp) };
    }
    return { prevFy, dup, prev };
  }

  /* ======================================================================= แคชข้อมูลจากเซิร์ฟเวอร์ (render ใหม่เมื่อได้ผล) */
  function need(key, fn) {
    if (key in DT.cache) return DT.cache[key];
    if (!DT.loading[key]) {
      DT.loading[key] = true;
      Promise.resolve().then(fn).then(v => { DT.cache[key] = v; }, e => { DT.cache[key] = { ok: false, error: String(e && e.message || e) }; })
        .finally(() => { DT.loading[key] = false; if (DTV.has(S.view)) render(); });
    }
    return undefined;
  }
  /** GET ไปยัง /api/data/* พร้อม header ที่เซิร์ฟเวอร์ใช้ตรวจสิทธิ์: X-OIS-Own = บริษัทของผู้ใช้ที่เลือกตอนเข้าใช้ (S.freeCo — เซิร์ฟเวอร์ตรึงค่าแรกไว้กับบัญชี)
   *  และ X-OIS-Plan = ระดับที่เลือก (เซิร์ฟเวอร์ใช้เฉพาะเมื่อ PLAN_SOURCE=client ซึ่งเป็นช่วงทดสอบ · ค่าเริ่มต้นใช้ระดับของบัญชี) */
  async function srvGet(url) {
    const h = {}; if (S.freeCo) h["X-OIS-Own"] = String(S.freeCo); if (S.plan) h["X-OIS-Plan"] = String(S.plan);
    const r = await fetch(url, { credentials: "same-origin", headers: h });
    if (r.status === 401) { location.href = "/login"; return { ok: false, status: 401, error: "ต้องเข้าสู่ระบบใหม่" }; }
    let j = null; try { j = await r.json(); } catch (e) { }
    return Object.assign({ ok: r.ok, status: r.status }, j || (r.ok ? {} : { error: "เซิร์ฟเวอร์ตอบ " + r.status }));
  }
  /** สิทธิ์ดูตาราง validity รายปีที่คำนวณใหม่ — กติกาเดียวกับตารางหลักของหน้า valid (Pro ขึ้นไป) · ผู้ดูแลบนเซิร์ฟเวอร์ดูได้ */
  function canValidity() {
    const r = typeof tierRank === "function" ? tierRank() : (S.plan === "free" ? 0 : 1);
    if (r >= 1) return true;
    if (SRV()) { const m = need("me", () => window.OIS_API.me()); return !!(m && m.role === "admin"); }
    return false;               // ไฟล์ออฟไลน์: สวิตช์ผู้ดูแลจำลองเปิดได้ทุกคน จึงไม่ใช้ปลดล็อกส่วนนี้
  }
  const drop = (...pre) => Object.keys(DT.cache).forEach(k => { if (!pre.length || pre.some(p => k.startsWith(p))) delete DT.cache[k]; });
  function isAdmin() {
    if (!SRV()) return DT.adminDemo;
    const m = need("me", () => window.OIS_API.me());
    return !!(m && m.role === "admin");
  }

  /* ======================================================================= ตัวช่วยหน้าจอ */
  const pill = (t, cls) => `<span class="pill ${cls}">${esc(t)}</span>`;
  const loading = t => `<div class="dt-load" role="status">${esc(t || "กำลังโหลดจากเซิร์ฟเวอร์…")}</div>`;
  const vpill = v => v ? pill(VDP[v][0], VDP[v][1]) : pill("—", "mute");
  const srcPill = s => ({ research: pill("งานวิจัย", "dt-src-r"), current: pill("ข้อมูลปัจจุบัน", "dt-src-c"),
    approved: pill("ผู้ใช้อนุมัติแล้ว", "dt-src-a"), pending: pill("รออนุมัติ · เห็นเฉพาะคุณ", "warn"), rejected: pill("ไม่อนุมัติ · เห็นเฉพาะคุณ", "crit") }[s] || pill(s, "mute"));
  const regimeBadge = r => r ? vpill(r) : pill("ยังไม่ได้ validate", "mute");
  const noteSet = () => `<div class="note dt-noset"><b>หมายเหตุจากการประชุม 15 ต.ค. 2569:</b> ${esc(NO_SET)}</div>`;

  /** กราฟเส้น SVG (ใช้สีจากตัวแปรธีม — อ่านได้ทั้งโหมดสว่างและมืด) */
  function lineChart(o) {
    const W = 560, H = o.h || 230, L = 46, R = 74, T = 16, B = 40, PX = 18;
    const xs = o.xs, nx = xs.length, x = i => L + PX + (nx === 1 ? (W - L - R - 2 * PX) / 2 : i * (W - L - R - 2 * PX) / (nx - 1));
    const y = v => T + (1 - (v - o.y0) / (o.y1 - o.y0)) * (H - T - B);
    const g = [];
    const ticks = o.ticks || [];
    ticks.forEach(t => g.push(`<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="dt-grid"/><text x="${L - 6}" y="${y(t) + 3.5}" text-anchor="end" class="dt-ax">${o.yf ? o.yf(t) : t}</text>`));
    (o.th || []).forEach(t => g.push(`<line x1="${L}" x2="${W - R}" y1="${y(t.v)}" y2="${y(t.v)}" class="dt-th ${t.cls}"/>` +
      `<text x="${t.left ? L + 4 : W - R + 4}" y="${y(t.v) + (t.left ? -4 : 3.5)}" text-anchor="start" class="dt-thl ${t.cls}">${esc(t.l)}</text>`));
    xs.forEach((lab, i) => g.push(`<text x="${x(i)}" y="${H - B + 16}" text-anchor="middle" class="dt-ax">${esc(lab[0])}</text>` +
      (lab[1] ? `<text x="${x(i)}" y="${H - B + 29}" text-anchor="middle" class="dt-ax2">${esc(lab[1])}</text>` : "")));
    (o.series || []).forEach(s => {
      const pts = s.pts.filter(p => p.v !== null && p.v !== undefined && isFinite(p.v));
      const cl = v => Math.min(Math.max(v, o.y0), o.y1);
      (s.ci || []).forEach(c => { if (c && c.lo !== undefined) g.push(`<line x1="${x(c.i)}" x2="${x(c.i)}" y1="${y(cl(c.lo))}" y2="${y(cl(c.hi))}" class="dt-ci" style="stroke:${c.c}"/>`); });
      if (!s.noline) {   // เส้นขาดตรงปีที่ไม่มีค่า (เช่น ข้อมูลยังไม่พอ)
        const segs = []; pts.forEach((p, k) => { if (!k || p.i - pts[k - 1].i > 1) segs.push([]); segs[segs.length - 1].push(p); });
        segs.filter(sg => sg.length > 1).forEach(sg => g.push(`<polyline fill="none" class="dt-ln${s.dash ? " dash" : ""}" points="${sg.map(p => x(p.i) + "," + y(p.v)).join(" ")}"/>`));
      }
      if (!s.nomark) pts.forEach(p => {
        const cx = x(p.i), cy = y(p.v), c = p.c || "var(--s1)";
        const shp = p.shape === "sq" ? `<rect x="${cx - 5}" y="${cy - 5}" width="10" height="10" rx="1.5" style="fill:${p.hollow ? "var(--panel)" : c};stroke:${c}" class="dt-pt"/>`
          : p.shape === "dia" ? `<path d="M${cx} ${cy - 6.5}L${cx + 6.5} ${cy}L${cx} ${cy + 6.5}L${cx - 6.5} ${cy}Z" style="fill:${p.hollow ? "var(--panel)" : c};stroke:${c}" class="dt-pt"/>`
          : `<circle cx="${cx}" cy="${cy}" r="5.5" style="fill:${p.hollow ? "var(--panel)" : c};stroke:${c}" class="dt-pt"/>`;
        g.push(`<g><title>${esc(p.tip || "")}</title>${shp}${p.lab ? `<text x="${cx}" y="${cy - 10}" text-anchor="middle" class="dt-pl" style="fill:${c}">${esc(p.lab)}</text>` : ""}</g>`);
      });
    });
    (o.gaps || []).forEach(gp => g.push(`<text x="${x(gp.i)}" y="${T + 14}" text-anchor="middle" class="dt-gap">${esc(gp.t)}</text>`));
    return `<svg class="dt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}"><line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" class="dt-axis"/>
      <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="dt-axis"/>${g.join("")}</svg>`;
  }

  /* ======================================================================= 1 · หน้านำเข้าข้อมูลปีใหม่ */
  function formInit(force) {
    if (DT.form && !force) return DT.form;
    const c = cur(), bs = c.bsize || 10;
    DT.form = { ticker: c.t, name: "", ind: c.ind || 1, fyTh: 2567, bsize: bs, nfem: Math.round((c.fem || 0) * bs), nfam: Math.round((c.fam || 0) * bs),
                pol: c.pol ? 1 : 0, ten: c.ten !== undefined ? Math.round(c.ten * 10) / 10 + 1 : 8, liwc: "", oi: "", ceo: null, r561: null };
    return DT.form;
  }
  function formPayload(F) {
    const t = String(F.ticker || "").trim().toUpperCase(), bs = +F.bsize, nf = +F.nfem, nm = +F.nfam;
    const errs = [];
    if (!t || !/^[A-Z0-9.\-&_]{1,16}$/.test(t)) errs.push("ticker ต้องเป็นตัวอักษรอังกฤษ/ตัวเลข 1–16 ตัว");
    const isNew = t && !byT[t];
    if (isNew && !String(F.name || "").trim()) errs.push("บริษัทใหม่: ต้องระบุชื่อบริษัท");
    const fy = Math.round(+F.fyTh) - 543;
    if (!(fy >= 2010 && fy <= 2040)) errs.push("ปีบัญชี (พ.ศ.) ต้องอยู่ระหว่าง 2553–2583");
    if (!(Number.isInteger(bs) && bs >= 3 && bs <= 30)) errs.push("จำนวนกรรมการต้องเป็นจำนวนเต็ม 3–30");
    if (!(Number.isInteger(nf) && nf >= 0 && nf <= bs)) errs.push("จำนวนกรรมการหญิงต้องเป็นจำนวนเต็ม 0 ถึงจำนวนกรรมการ");
    if (!(Number.isInteger(nm) && nm >= 0 && nm <= bs)) errs.push("จำนวนกรรมการครอบครัวต้องเป็นจำนวนเต็ม 0 ถึงจำนวนกรรมการ");
    if (!(F.ten !== "" && +F.ten >= 0 && +F.ten <= 40)) errs.push("อายุงานเฉลี่ยต้องอยู่ระหว่าง 0–40 ปี");
    if (!F.ceo) errs.push("ต้องแนบสาร CEO (.txt)");
    else if (F.ceo.error) errs.push(F.ceo.error);
    else if (F.ceo.words < MIN_WORDS) errs.push(`สาร CEO มี ${fmt(F.ceo.words)} คำ — ต้องมีอย่างน้อย ${fmt(MIN_WORDS)} คำ`);
    else if (F.ceo.wordsSrv < MIN_WORDS) errs.push(`สาร CEO มี ${fmt(F.ceo.wordsSrv)} คำตามตัวนับของเซิร์ฟเวอร์ (อักขระไทย ÷ 5 + คำภาษาอังกฤษ/ตัวเลข) — ต้องมีอย่างน้อย ${fmt(MIN_WORDS)} คำ`);
    if (F.r561 && F.r561.error) errs.push(F.r561.error);
    const liwc = F.liwc === "" || F.liwc === null ? null : +F.liwc;
    if (liwc !== null && !(liwc >= 0 && liwc <= 20)) errs.push("ค่า LIWC-22 promotion ต้องอยู่ระหว่าง 0–20");
    const oi = F.oi === "" || F.oi === null ? null : +F.oi;
    if (oi !== null && !(Number.isInteger(oi) && oi >= 0 && oi <= 1000)) errs.push("จำนวนกิจกรรม open innovation ต้องเป็นจำนวนเต็ม 0–1000");
    const ind = isNew ? +F.ind : (byT[t] || {}).ind;
    const p = { ticker: t, name: isNew ? String(F.name).trim().slice(0, 160) : (byT[t] || {}).n, new_ticker: !!isNew, ind, fy, bsize: bs, nfem: nf, nfam: nm,
                fem: bs ? nf / bs : 0, fam: bs ? nm / bs : 0, pol: F.pol ? 1 : 0, ten: +F.ten, liwc, oi_next: oi,
                dp: F.ceo && !F.ceo.error ? F.ceo.dp : null,
                ceo: F.ceo && !F.ceo.error ? { filename: F.ceo.filename, words: F.ceo.words, words_server: F.ceo.wordsSrv, sha256: F.ceo.sha256, pro: F.ceo.pro, pre: F.ceo.pre, dp: F.ceo.dp } : null,
                r561: F.r561 && !F.r561.error ? { filename: F.r561.filename, type: F.r561.type, size: F.r561.size, sha256: F.r561.sha256, pages: F.r561.pages, words: F.r561.words } : null };
    return { p, errs };
  }
  const errBox = errs => errs.length ? `<ul class="dt-errs" id="dtErrs">${errs.map(e => `<li>${esc(e)}</li>`).join("")}</ul>`
    : `<div class="note ok" style="margin-top:10px">ข้อมูลครบ — กดส่งเพื่อให้คะแนนและส่งเข้าคิวอนุมัติ</div>`;
  function recRow(r, actions) {
    const s = r.score || {}, p = r.payload || {};
    return `<tr data-dtrec="${r.id}"><td><b>${esc(r.ticker)}</b>${p.new_ticker ? ` <span class="pill mute" style="font-size:9px">ใหม่</span>` : ""}</td>
      <td class="n">${yr(r.fy)}</td><td>${pill(...(ST[r.status] || [r.status, "mute"]))}</td>
      <td class="n"><b>${f1(s.ois)}</b></td><td class="n">${s.tier || "—"}</td><td>${esc(s.quad || "—")}</td><td>${regimeBadge(s.regime)}</td>
      <td style="font-size:11px">${s.promo_src === "liwc" ? LIWC_LAB : EST_LAB}</td>
      <td class="n">${p.oi_next ?? "—"}</td>
      <td style="font-size:11px">${esc((r.created || "").slice(0, 16).replace("T", " "))}${r.review_comment ? `<br><span style="color:var(--ink-3)">ความเห็น: ${U(r.review_comment)}</span>` : ""}</td>
      <td>${actions && r.status === "pending" && r.mine ? `<button class="btn g dt-sm" data-dtwd="${r.id}">ถอน</button>` : ""}</td></tr>`;
  }
  const recHead = `<thead><tr><th>บริษัท</th><th class="n">ปีบัญชี</th><th>สถานะ</th><th class="n">OIS</th><th class="n">Tier</th><th>Quadrant</th><th>ปีนี้ผ่านเกณฑ์?</th><th>ที่มาค่า promotion</th><th class="n">OI ปีถัดไป</th><th>ส่งเมื่อ</th><th></th></tr></thead>`;
  function myRecords() {
    if (SRV()) { const r = need("mine", () => API().mine()); return r === undefined ? null : (r.items || []); }
    return lsVisible(lsLoad()).filter(r => r.mine);
  }
  function scoreCard(r) {
    if (!r) return "";
    const s = r.score, p = r.payload, z = ZONES[s.quad] || {};
    return `<div class="card dt-result" id="dtResult"><h3>ผลคะแนนของ ${esc(r.ticker)} ปีบัญชี ${th(r.fy)} ${pill(...ST[r.status])}</h3>
      <p class="desc">ให้คะแนนทันทีเทียบฐานอ้างอิงที่ตรึงไว้ <b>${esc(s.ref || REFV)}</b> — ข้อมูลนี้ไม่ได้เปลี่ยนฐานอ้างอิง และคะแนนของบริษัทอื่นไม่เปลี่ยนตาม</p>
      <div class="grid g4 tight" style="gap:10px">
        <div class="stat"><div class="k">OpenInnoScore</div><div class="v num">${f1(s.ois)}</div><div class="u">ช่วง 90% ${f1(s.band && s.band[0])}–${f1(s.band && s.band[1])}</div></div>
        <div class="stat"><div class="k">Tier</div><div class="v num">${s.tier}</div><div class="u">ในอุตสาหกรรม OIS ${f1(s.ois_ind)}</div></div>
        <div class="stat"><div class="k">Quadrant</div><div class="v num">${esc(s.quad)}</div><div class="u">${esc(z.th || z.l || "")}</div></div>
        <div class="stat"><div class="k">ปีนี้ผ่านเกณฑ์ validity?</div><div class="v" style="font-size:15px;margin-top:6px">${regimeBadge(s.regime)}</div>
          <div class="u">${s.regime ? "verdict ของปีบัญชีนี้ในงานวิจัย" : "ปีใหม่ — ยังไม่มีผลลัพธ์ปีถัดไปให้ตรวจ (R3)"}</div></div>
      </div>
      <p class="dt-prov">ที่มาของค่า CEO promotion: <b>${s.promo_src === "liwc" ? LIWC_LAB : EST_LAB}</b>${s.promo !== undefined && s.promo !== null ? ` · ค่าที่ใช้ ${fmt(s.promo, 3)}` : ""}
        ${p.ceo ? ` · สาร CEO ${fmt(p.ceo.words)} คำ${p.ceo.words_client != null && p.ceo.words_client !== p.ceo.words ? ` (ตัวนับของเซิร์ฟเวอร์ · เบราว์เซอร์นับได้ ${fmt(p.ceo.words_client)} คำ)` : ""} · ไฟล์ ${U(p.ceo.filename || "")}` : ""}
        ${p.ceo && p.ceo.dp_src === "server" ? ` · ค่าภาษาเชิงรุกคำนวณซ้ำบนเซิร์ฟเวอร์จากข้อความ (เปอร์เซ็นไทล์ ${p.ceo.dp})` : p.ceo && p.ceo.dp_src === "client_unverified" ? ` · <b>ค่าภาษาเชิงรุกจากเบราว์เซอร์ ยังไม่ได้ตรวจ</b> — ผู้ดูแลตรวจทานก่อนอนุมัติ` : ""}</p></div>`;
  }
  function viewDataUpload() {
    const F = formInit(), { p, errs } = formPayload(F), t = String(F.ticker || "").trim().toUpperCase(), isNew = t && !byT[t];
    const mine = myRecords();
    const polTxt = typeof POL_TICK === "string" ? POL_TICK : "มีกรรมการอย่างน้อย 1 คนที่มียศทหาร/ตำรวจ หรือเป็นบุคคลที่มีสถานภาพทางการเมือง (PEP) ตามเกณฑ์ ปปง.";
    const ceo = F.ceo, r5 = F.r561;
    const fld = (id, lab, inner, hint) => `<label class="dt-f" for="${id}"><span>${lab}</span>${inner}${hint ? `<small>${hint}</small>` : ""}</label>`;
    const num = (k, step, min, max) => `<input id="dt_${k}" data-dtf="${k}" type="number" inputmode="decimal" step="${step}" min="${min}" max="${max}" value="${esc(F[k])}">`;
    return pageHead("ข้อมูลหลายปี", "นำเข้าข้อมูลปีใหม่",
      "กรอกข้อมูลบริษัท-ปีที่ตรวจแล้ว ระบบให้คะแนนทันทีเทียบฐานอ้างอิงที่ตรึงไว้ · ข้อมูลเห็นเฉพาะคุณจนกว่าผู้ดูแล/อาจารย์อนุมัติเข้าสู่ชุดข้อมูลหลัก")
      + noteSet()
      + `<div class="grid g2 dt-2" style="margin-top:14px">
      <div class="card"><h3>ข้อมูลบริษัท-ปี</h3>
        <p class="desc">ตัวเลขทุกช่องมาจากเอกสารที่เจ้าหน้าที่ตรวจแล้ว (แบบ 56-1 One Report / รายงานประจำปี) · สัดส่วนคำนวณจากจำนวนคนให้อัตโนมัติ</p>
        <div class="dt-form">
          ${fld("dt_ticker", "ชื่อย่อหลักทรัพย์ (ticker)", `<input id="dt_ticker" data-dtf="ticker" list="dtTk" autocomplete="off" value="${esc(F.ticker)}"><datalist id="dtTk">${COMPS.map(c => `<option value="${esc(c.t)}">${esc(c.n)}</option>`).join("")}</datalist>`,
            isNew ? "บริษัทใหม่ — ยังไม่มีในชุดข้อมูลปัจจุบัน" : esc((byT[t] || {}).n || "") + " · " + esc(IND[(byT[t] || {}).ind] || ""))}
          ${isNew ? fld("dt_name", "ชื่อบริษัท", `<input id="dt_name" data-dtf="name" value="${esc(F.name)}">`) +
            fld("dt_ind", "กลุ่มอุตสาหกรรม", `<select id="dt_ind" data-dtf="ind">${Object.entries(IND).map(([k, v]) => `<option value="${k}"${+k === +F.ind ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>`) : ""}
          ${fld("dt_fyTh", "ปีบัญชี (พ.ศ.)", num("fyTh", 1, 2553, 2583), `= ค.ศ. ${Math.round(+F.fyTh) - 543 || "—"}`)}
          ${fld("dt_bsize", "จำนวนกรรมการทั้งหมด (คน)", num("bsize", 1, 3, 30))}
          ${fld("dt_nfem", "จำนวนกรรมการหญิง (คน)", num("nfem", 1, 0, 30), `สัดส่วน ${p.bsize ? pct1(p.fem) : "—"}`)}
          ${fld("dt_nfam", "จำนวนกรรมการครอบครัว (คน)", num("nfam", 1, 0, 30), `สัดส่วน ${p.bsize ? pct1(p.fam) : "—"}`)}
          ${fld("dt_ten", "อายุงานเฉลี่ยของกรรมการ (ปี)", num("ten", 0.1, 0, 40))}
          <label class="dt-f dt-tick"><span><input type="checkbox" id="dt_pol" data-dtf="pol"${F.pol ? " checked" : ""}> มีความเชื่อมโยงทางการเมือง (political ties)</span><small>เกณฑ์: ${esc(polTxt)}</small></label>
        </div></div>
      <div class="card"><h3>เอกสารประกอบ</h3>
        <p class="desc">สาร CEO รับเฉพาะไฟล์ <b>.txt</b> ความยาวอย่างน้อย <b>2,000 คำ</b> · แบบ 56-1 One Report รับ <b>.pdf</b> หรือ <b>.txt</b> ·
          ${SRV() ? "เซิร์ฟเวอร์เก็บข้อความสาร CEO (ไม่เกิน 100 KB) ให้ผู้ดูแลอ่านทวนตอนอนุมัติ ส่วนแบบ 56-1 เก็บเฉพาะชื่อไฟล์ ขนาด จำนวนหน้า และรหัสตรวจสอบไฟล์ (SHA-256)"
            : "ไฟล์นี้ (ออฟไลน์) เก็บเฉพาะชื่อไฟล์ จำนวนคำ/หน้า และรหัสตรวจสอบไฟล์ (SHA-256) — ไม่เก็บตัวไฟล์"}</p>
        <div class="dt-form">
          ${fld("dt_ceo", "สาร CEO (.txt)", `<input id="dt_ceo" type="file" accept=".txt,text/plain">`,
            ceo ? (ceo.error ? `<b class="dt-bad">${esc(ceo.error)}</b>` : `${U(ceo.filename)} · <b id="dtWords" class="${ceo.words >= MIN_WORDS && ceo.wordsSrv >= MIN_WORDS ? "dt-good" : "dt-bad"}">${fmt(ceo.words)} คำ</b> ${ceo.words >= MIN_WORDS && ceo.wordsSrv >= MIN_WORDS ? "✓ ผ่านเกณฑ์ 2,000 คำ" : "✕ ไม่ถึง 2,000 คำ — ส่งไม่ได้"} · ตัวนับของเซิร์ฟเวอร์ <b id="dtWordsSrv">${fmt(ceo.wordsSrv)} คำ</b> · คำเชิงรุก ${ceo.pro} · คำเชิงป้องกัน ${ceo.pre} → เปอร์เซ็นไทล์ ${ceo.dp}${SRV() ? " (เซิร์ฟเวอร์นับคำและคำนวณค่านี้ซ้ำจากข้อความเอง)" : ""}`) : "ยังไม่ได้เลือกไฟล์")}
          ${fld("dt_r561", "แบบ 56-1 One Report (.pdf / .txt) — ไม่บังคับ", `<input id="dt_r561" type="file" accept=".pdf,.txt,application/pdf,text/plain">`,
            r5 ? (r5.error ? `<b class="dt-bad">${esc(r5.error)}</b>` : `${U(r5.filename)} · ${fmt(r5.size / 1024, 0)} KB${r5.pages ? ` · ${r5.pages} หน้า` : ""}${r5.words ? ` · ${fmt(r5.words)} คำ` : ""}`) : "ยังไม่ได้เลือกไฟล์")}
          ${fld("dt_liwc", "ค่า CEO promotion จาก LIWC-22 — ไม่บังคับ", `<input id="dt_liwc" data-dtf="liwc" type="number" step="0.0001" min="0" max="20" value="${esc(F.liwc)}" placeholder="เช่น 0.7319">`,
            "ถ้ากรอก ระบบใช้ค่านี้แทนค่าประมาณจากพจนานุกรมเปิด และติดป้ายที่มา “" + LIWC_LAB + "”")}
          ${fld("dt_oi", "จำนวนกิจกรรม open innovation ปีถัดไป — ไม่บังคับ", `<input id="dt_oi" data-dtf="oi" type="number" step="1" min="0" max="1000" value="${esc(F.oi)}">`,
            "ใช้ตรวจความเที่ยงตรง (validity) เท่านั้น ไม่มีผลต่อคะแนน · ปีที่มีอย่างน้อย 30 บริษัทจึงคำนวณได้")}
        </div>
        <div id="dtErrBox">${errBox(errs)}</div>
        <div class="gx-row" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn p" id="dtSubmit"${errs.length ? " disabled" : ""}>ให้คะแนนและส่งเข้าคิวอนุมัติ</button>
          <button class="btn g" id="dtReset">ล้างฟอร์ม</button></div>
        ${DT.msg ? `<div class="note ${DT.msg.k}" style="margin-top:10px" role="status">${esc(DT.msg.t)}</div>` : ""}
      </div></div>`
      + scoreCard(DT.last)
      + `<div class="card" style="margin-top:14px"><h3>ข้อมูลที่ฉันส่ง</h3>
        <p class="desc">รายการที่ยังไม่อนุมัติ <b>เห็นเฉพาะคุณ</b> ผู้ใช้อื่นมองไม่เห็นจนกว่าผู้ดูแล/อาจารย์จะอนุมัติ · ${SRV() ? "เก็บบนเซิร์ฟเวอร์ แยกตามบัญชีที่เข้าสู่ระบบ" : `เก็บในเบราว์เซอร์นี้ แยกตามอีเมล <b>${esc(meKey())}</b>`}</p>
        ${mine === null ? loading() : mine.length ? `<div class="tw"><table class="dt-tab" id="dtMine">${recHead}<tbody>${mine.slice().reverse().map(r => recRow(r, true)).join("")}</tbody></table></div>`
          : `<div class="dt-empty">ยังไม่มีรายการ</div>`}</div>`
      + frozenNote(true);
  }
  function frozenNote(short) {
    return `<div class="card dt-frozen" style="margin-top:14px"><h3>คะแนนของปีใหม่กับ “ไม้บรรทัดที่ตรึงไว้”</h3>
      <div class="grid g2" style="gap:12px;margin-top:6px">
        <div class="note"><b>1 · ไม้บรรทัดสำหรับให้คะแนน — ตรึงไว้ ไม่ขยับ</b><br>
          คะแนน OpenInnoScore คือตำแหน่งของบริษัทเมื่อเทียบกับ 928 บริษัท-ปีในฐานอ้างอิง ${esc(REFV)} ·
          บริษัทปีใหม่ถูกวัดด้วยไม้บรรทัดเดิมทันทีที่ส่ง คะแนนของบริษัทอื่นและของปีก่อน ๆ จึงไม่เปลี่ยนตาม และเทียบข้ามปีได้</div>
        <div class="note"><b>2 · หลักฐานว่าไม้บรรทัดยังใช้ได้ — สะสมเพิ่ม</b><br>
          เมื่อผู้ดูแลอนุมัติปีใหม่ที่มีผลลัพธ์ปีถัดไป ระบบคำนวณความเที่ยงตรงใหม่ทันที (หน้า “หลักฐานความแม่น”) ·
          ${short ? "" : "ผลนี้บอกว่าคะแนนยังเรียงลำดับบริษัทได้ดีแค่ไหน แต่"}ไม่ได้เปลี่ยนไม้บรรทัด · การเปลี่ยนไม้บรรทัด (re-freeze) ต้องเป็นการตัดสินใจโดยตั้งใจ ออกฉบับใหม่พร้อมเลขเวอร์ชัน ระบบไม่ทำเอง</div>
      </div></div>`;
  }

  async function onCeoFile(file) {
    const F = formInit();
    if (!file) { F.ceo = null; return; }
    if (!/\.txt$/i.test(file.name)) { F.ceo = { filename: file.name, error: "สาร CEO รับเฉพาะไฟล์ .txt เท่านั้น" }; return; }
    if (file.size > 2 * 1024 * 1024) { F.ceo = { filename: file.name, error: "ไฟล์ใหญ่เกิน 2 MB" }; return; }
    const buf = await file.arrayBuffer(), text = new TextDecoder("utf-8").decode(buf);
    const an = analyseText(text);
    F.ceo = { filename: file.name, size: file.size, words: wordsOf(text), wordsSrv: wordsSrv(text), dp: an.dp, pro: an.pro.n, pre: an.pre.n, sha256: await sha256(buf), text };
  }
  async function onR561(file) {
    const F = formInit();
    if (!file) { F.r561 = null; return; }
    const isPdf = /\.pdf$/i.test(file.name), isTxt = /\.txt$/i.test(file.name);
    if (!isPdf && !isTxt) { F.r561 = { filename: file.name, error: "แบบ 56-1 One Report รับเฉพาะ .pdf หรือ .txt" }; return; }
    const buf = await file.arrayBuffer(), r = { filename: file.name, type: isPdf ? "pdf" : "txt", size: file.size, sha256: await sha256(buf), pages: null, words: null };
    if (isTxt) r.words = wordsOf(new TextDecoder("utf-8").decode(buf));
    else { try { if (typeof pdfjsLib === "object") { const d = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise; r.pages = d.numPages; } } catch (e) { } }
    F.r561 = r;
  }
  async function submit() {
    const F = formInit(), { p, errs } = formPayload(F);
    if (errs.length) { toast(errs[0]); return; }
    DT.msg = null;
    if (SRV()) {
      const body = Object.assign({}, p, { ceo: Object.assign({}, p.ceo, { text: F.ceo.text }) });
      const r = await API().submit(body);
      if (!r.ok) { DT.msg = { k: "crit", t: "ส่งไม่สำเร็จ: " + (r.error || r.reason || r.status) }; render(); return; }
      DT.last = r.record; drop("mine", "hist:", "validity");
    } else {
      const o = lsLoad(), me = meKey();
      o.seq = (o.seq || 0) + 1;
      const rec = { id: o.seq, ticker: p.ticker, fy: p.fy, status: "pending", payload: p, score: scoreLocal(p), created: new Date().toISOString() };
      (o.recs[me] = o.recs[me] || []).push(rec);
      lsLog(o, rec.id, "submit", `${p.ticker} ปี ${th(p.fy)}`);
      if (!lsSave(o)) return;
      DT.last = Object.assign({}, rec, { mine: true });
    }
    DT.msg = { k: "ok", t: `ส่งแล้ว — ${p.ticker} ปี ${th(p.fy)} อยู่ในสถานะ “รออนุมัติ (เห็นเฉพาะคุณ)”` };
    toast("ให้คะแนนแล้ว · รออนุมัติ");
    render();
    const el = document.getElementById("dtResult"); if (el) el.scrollIntoView({ block: "nearest" });
  }
  function wireUpload(h) {
    h.querySelectorAll("[data-dtf]").forEach(el => {
      const k = el.dataset.dtf, ev = el.type === "checkbox" || el.tagName === "SELECT" || k === "ticker" ? "change" : "input";
      el.addEventListener(ev, () => {
        const F = formInit(); F[k] = el.type === "checkbox" ? (el.checked ? 1 : 0) : el.value;
        if (ev === "change") render();
        else { const { errs } = formPayload(F), b = h.querySelector("#dtSubmit"), eb = h.querySelector("#dtErrBox");
          if (b) b.disabled = errs.length > 0; if (eb) eb.innerHTML = errBox(errs); }
      });
    });
    const fc = h.querySelector("#dt_ceo"); if (fc) fc.onchange = async () => { await onCeoFile(fc.files[0]); render(); };
    const fr = h.querySelector("#dt_r561"); if (fr) fr.onchange = async () => { await onR561(fr.files[0]); render(); };
    const sb = h.querySelector("#dtSubmit"); if (sb) sb.onclick = () => { sb.disabled = true; submit().catch(e => { DT.msg = { k: "crit", t: String(e) }; render(); }); };
    const rs = h.querySelector("#dtReset"); if (rs) rs.onclick = () => { formInit(true); DT.msg = null; DT.last = null; render(); };
    wireCommon(h);
  }
  function wireCommon(h) {
    h.querySelectorAll("[data-dtwd]").forEach(b => b.onclick = async () => {
      const id = +b.dataset.dtwd;
      if (SRV()) { const r = await API().withdraw(id); if (!r.ok) return toast(r.error || "ถอนไม่สำเร็จ"); drop(); }
      else { const o = lsLoad(), r = (o.recs[meKey()] || []).find(x => x.id === id); if (!r || r.status !== "pending") return; r.status = "withdrawn"; lsLog(o, id, "withdraw"); lsSave(o); }
      toast("ถอนรายการแล้ว"); render();
    });
  }

  /* ======================================================================= 2 · หน้าอนุมัติข้อมูล (ผู้ดูแล/อาจารย์) */
  function diffTable(r, prev) {
    const p = r.payload, s = r.score || {};
    const rows = [["จำนวนกรรมการ", prev && prev.bsize, p.bsize, v => v ?? "—"], ["กรรมการหญิง", prev && prev.fem, p.fem, v => v === null || v === undefined ? "—" : pct1(v)],
      ["กรรมการครอบครัว", prev && prev.fam, p.fam, v => v === null || v === undefined ? "—" : pct1(v)], ["political ties", prev && prev.pol, p.pol, v => v === null || v === undefined ? "—" : v ? "มี" : "ไม่มี"],
      ["อายุงานเฉลี่ย (ปี)", prev && prev.ten, p.ten, v => v === null || v === undefined ? "—" : fmt(v, 1)], ["OIS", prev && prev.ois, s.ois, v => f1(v)],
      ["Tier", prev && prev.tier, s.tier, v => v ?? "—"], ["Quadrant", prev && prev.quad, s.quad, v => v ?? "—"]];
    return `<div class="tw"><table class="dt-tab dt-diff"><thead><tr><th>รายการ</th><th class="n">${prev ? esc(prev.src) : "ปีก่อนหน้า"}</th><th class="n">ปีนี้ (${th(r.fy)})</th><th class="n">เปลี่ยน</th></tr></thead><tbody>
      ${rows.map(([k, a, b, f]) => { const ch = prev && a !== undefined && a !== null && b !== null && b !== undefined && a !== b;
        const d = ch && typeof a === "number" && typeof b === "number" && k !== "political ties" ? (b - a > 0 ? "▲ " : "▼ ") + (k.includes("กรรมการหญิง") || k.includes("ครอบครัว") ? fmt(Math.abs(b - a) * 100, 1) + " จุด" : fmt(Math.abs(b - a), 1)) : ch ? "เปลี่ยน" : "";
        return `<tr${ch ? ' class="dt-chg"' : ""}><td>${k}</td><td class="n">${prev ? f(a) : "—"}</td><td class="n"><b>${f(b)}</b></td><td class="n">${d}</td></tr>`; }).join("")}
      </tbody></table></div>${prev ? "" : `<p class="dt-sm2">ไม่มีปีก่อนหน้าของบริษัทนี้ในระบบ</p>`}`;
  }
  function pendingCard(it, chks, prev) {
    const p = it.payload, s = it.score || {}, ic = { ok: "✓", warn: "⚠", fail: "✕" };
    return `<div class="card dt-pend" data-dtp="${it.id}"><h3>${esc(it.ticker)} · ปีบัญชี ${th(it.fy)} ${pill("รออนุมัติ", "warn")}
        <span style="margin-left:auto;font-size:11px;color:var(--ink-3)">ส่งโดย ${U(it.owner || "—")} · ${esc((it.created || "").slice(0, 16).replace("T", " "))}</span></h3>
      <p class="desc">${p.new_ticker ? U(p.name || "") : esc(p.name || "")} · ${esc(IND[p.ind] || "")} · OIS ${f1(s.ois)} (tier ${s.tier}, quadrant ${esc(s.quad || "—")}) — ให้คะแนนแล้วเทียบฐานอ้างอิงที่ตรึงไว้ · ที่มาค่า promotion: ${s.promo_src === "liwc" ? LIWC_LAB : EST_LAB}</p>
      <div class="grid g2 dt-2" style="gap:12px">
        <div><div class="dt-sub">ตรวจคุณภาพข้อมูล</div><ul class="dt-chk">${chks.map(c => `<li class="${c.ok}"><span aria-hidden="true">${ic[c.ok]}</span> <b>${esc(c.k)}</b> — ${esc(c.t)}</li>`).join("")}</ul>
          ${p.ceo && p.ceo.preview ? `<details class="dt-prev"><summary>อ่านสาร CEO (ตัวอย่าง 1,500 ตัวอักษรแรก)</summary><pre data-noi18n>${esc(p.ceo.preview)}</pre></details>` : ""}
          ${p.ceo && p.ceo.sha256 ? `<p class="dt-sm2">SHA-256 สาร CEO: <code>${esc(p.ceo.sha256.slice(0, 16))}…</code>${p.r561 && p.r561.sha256 ? ` · 56-1: <code>${esc(p.r561.sha256.slice(0, 16))}…</code>` : ""}</p>` : ""}</div>
        <div><div class="dt-sub">เทียบกับปีก่อนหน้า</div>${diffTable(it, prev)}</div>
      </div>
      <label class="dt-f" style="margin-top:10px"><span>ความเห็นของผู้ตรวจ (บังคับเมื่อไม่อนุมัติ)</span><textarea rows="2" data-dtcm="${it.id}"></textarea></label>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn p" data-dtok="${it.id}"${chks.some(c => c.ok === "fail") ? " disabled title=\"มีรายการตรวจที่ไม่ผ่าน\"" : ""}>อนุมัติเข้าสู่ชุดข้อมูลหลัก</button>
        <button class="btn s" data-dtno="${it.id}">ไม่อนุมัติ</button></div></div>`;
  }
  function logTable(log) {
    const A = { submit: "ส่งข้อมูล", approve: "อนุมัติ", reject: "ไม่อนุมัติ", withdraw: "ถอน", reference_upload: "อัปโหลดไฟล์อ้างอิง", refreeze_proposal: "ข้อเสนอ re-freeze", own_declare: "ประกาศบริษัทของตน (Basic)" };
    return log && log.length ? `<div class="tw"><table class="dt-tab" id="dtLog"><thead><tr><th>เวลา (UTC)</th><th>ผู้ทำ</th><th>การกระทำ</th><th class="n">รายการ</th><th>ความเห็น</th></tr></thead><tbody>
      ${log.slice(0, 60).map(l => `<tr><td style="white-space:nowrap">${esc((l.created || "").slice(0, 16).replace("T", " "))}</td><td>${U(l.actor_label || "")}</td><td>${esc(A[l.action] || l.action)}</td><td class="n">${l.record_id ?? "—"}</td><td>${l.action === "submit" || l.action === "reference_upload" || l.action === "own_declare" ? esc(l.comment || "") : U(l.comment || "")}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="dt-empty">ยังไม่มีบันทึก</div>`;
  }
  function viewDataAdmin() {
    const srv = SRV();
    let body = "";
    const head = pageHead("ข้อมูลหลายปี", "อนุมัติข้อมูล (ผู้ดูแล/อาจารย์)",
      "ตรวจข้อมูลที่ผู้ใช้ส่ง ก่อนนำเข้าสู่ชุดข้อมูลหลักที่ผู้ใช้ทุกคนเห็น · การอนุมัติทำให้ระบบคำนวณความเที่ยงตรงใหม่ทันที แต่ไม่เปลี่ยนฐานอ้างอิงที่ใช้ให้คะแนน") + noteSet();
    const demo = srv ? "" : `<div class="card dt-demo" style="margin-top:14px"><label class="dt-tick" style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" id="dtAdminDemo"${DT.adminDemo ? " checked" : ""}>
        <span><b>โหมดสาธิต: สวมบทผู้ดูแลในเบราว์เซอร์นี้</b><br><small>ไฟล์ออฟไลน์ไม่มีระบบบัญชีผู้ใช้จริง — สวิตช์นี้มีไว้สาธิตขั้นตอนอนุมัติเท่านั้น
          ในฉบับเซิร์ฟเวอร์ สิทธิ์ผู้ดูแลกำหนดจากบัญชีที่เข้าสู่ระบบ (ADMIN_USER / ADMIN_EMAILS) และผู้ใช้ทั่วไปกดอนุมัติไม่ได้</small></span></label></div>`;
    if (srv) {
      const m = need("me", () => window.OIS_API.me());
      if (m === undefined) return head + loading();
      if (!(m && m.role === "admin")) return head + `<div class="card" style="margin-top:14px"><h3>เฉพาะผู้ดูแล/อาจารย์</h3><p class="desc">บัญชีของคุณไม่มีสิทธิ์อนุมัติข้อมูล — ข้อมูลที่คุณส่งรอผู้ดูแลตรวจได้ที่หน้า “นำเข้าข้อมูลปีใหม่”</p></div>`;
      const d = need("pending", () => API().pending());
      if (d === undefined) return head + loading();
      if (d.ok === false) return head + `<div class="note crit">${esc(d.error || "โหลดไม่สำเร็จ")}</div>`;
      body = `<h3 class="dt-h">รออนุมัติ ${d.items.length} รายการ</h3>` + (d.items.length ? d.items.map(it => pendingCard(it, it.checks, it.prev)).join("") : `<div class="card dt-empty">ไม่มีรายการรออนุมัติ</div>`)
        + `<div class="card" style="margin-top:14px"><h3>บันทึกการอนุมัติ (ใคร · เมื่อไร · ความเห็น)</h3>${logTable(d.log)}</div>` + refCard() + refreezeCard(true);
    } else {
      if (!DT.adminDemo) return head + demo + `<div class="card" style="margin-top:14px"><h3>เฉพาะผู้ดูแล/อาจารย์</h3><p class="desc">เปิดโหมดสาธิตด้านบนเพื่อดูขั้นตอนอนุมัติ</p></div>`;
      const o = lsLoad(), pend = lsAll(o).filter(r => r.status === "pending");
      body = `<h3 class="dt-h">รออนุมัติ ${pend.length} รายการ</h3>` + (pend.length ? pend.map(r => { const pv = prevLocal(o, r); return pendingCard(r, checks(r.payload, pv.prevFy, pv.dup), pv.prev); }).join("")
        : `<div class="card dt-empty">ไม่มีรายการรออนุมัติ</div>`)
        + `<div class="card" style="margin-top:14px"><h3>บันทึกการอนุมัติ (ใคร · เมื่อไร · ความเห็น)</h3>${logTable(o.log)}</div>` + refCard() + refreezeCard(true);
    }
    return head + demo + body;
  }
  function refCard() {
    if (!SRV()) return `<div class="card" style="margin-top:14px"><h3>ไฟล์อ้างอิงรายแถว (REF928_scored)</h3>
      <p class="desc">ไฟล์รายแถวของงานวิจัยอยู่ภายใต้ข้อตกลงรักษาความลับ จึง<b>ไม่ถูกฝังในไฟล์ออฟไลน์นี้</b> · ในฉบับเซิร์ฟเวอร์ ผู้ดูแลอัปโหลดไฟล์ไปเก็บบนเซิร์ฟเวอร์ได้
        แล้วระบบคำนวณ validity ปี 2562–2566 จากข้อมูลจริง และแสดงประวัติรายบริษัท (เฉพาะค่าสรุป) — ที่นี่จึงแสดงค่าตามบทความแทน</p></div>`;
    const st = need("refst", () => API().referenceStatus());
    return `<div class="card" style="margin-top:14px" id="dtRefCard"><h3>ไฟล์อ้างอิงรายแถว (REF928_scored · NDA)</h3>
      <p class="desc">เก็บบนดิสก์ของเซิร์ฟเวอร์ข้างไฟล์ฐานข้อมูล ไม่อยู่ในโค้ดและไม่ถูกส่งให้เบราว์เซอร์ทั้งไฟล์ — ผู้ใช้ได้เฉพาะค่าสรุปรายบริษัท (ปี · OIS · tier · quadrant · ผลเกณฑ์ของปี) และสถิติรายปี</p>
      ${st === undefined ? loading() : st.present ? `<div class="note ok">มีไฟล์แล้ว · ${fmt(st.n)} แถว · ${fmt(st.firms)} บริษัท · ปี ${(st.years || []).map(th).join(", ")} · อัปโหลดเมื่อ ${esc((st.uploaded || "").replace("T", " "))}</div>`
        : `<div class="note">ยังไม่มีไฟล์ — หน้า validity ใช้ค่าตามบทความ</div>`}
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><input type="file" id="dtRefFile" accept=".csv,text/csv"><button class="btn s" id="dtRefUp">อัปโหลดไฟล์อ้างอิง</button></div>
      ${DT.refRes ? `<div class="note ${DT.refRes.ok ? "ok" : "crit"}" style="margin-top:10px" id="dtRefRes">${DT.refRes.ok ? `อัปโหลดแล้ว ${fmt(DT.refRes.n)} แถว · ผลคำนวณซ้ำเทียบตารางที่ 3 ของบทความ: ${
        (DT.refRes.reproduced || []).map(r => `${r.fy} ${r.match && r.match.ok ? "✓ ตรง" : "✕ ไม่ตรง"}`).join(" · ")} · รวม ${DT.refRes.pooled_match && DT.refRes.pooled_match.ok ? "✓ ตรง" : "✕"}` : esc(DT.refRes.error || "ไม่สำเร็จ")}</div>` : ""}</div>`;
  }
  function refreezeList() {
    if (SRV()) { const r = need("refreeze", () => srvGet("/api/data/refreeze")); return r === undefined ? null : (r.items || []); }
    return lsLoad().refreeze || [];
  }
  function refreezeCard(adminCtx) {
    const items = refreezeList(), adm = isAdmin();
    return `<div class="card" style="margin-top:14px" id="dtRefreeze"><h3>ข้อเสนอตรึงฐานอ้างอิงใหม่ (re-freeze)</h3>
      <p class="desc">ฐานอ้างอิงที่ใช้ให้คะแนนตอนนี้: <b>${esc(REFV)}</b> · การตรึงใหม่เป็นเหตุการณ์ที่ตั้งใจ ต้องออกฉบับใหม่พร้อมเลขเวอร์ชัน ตรวจซ้ำ และประกาศให้ผู้ใช้ทราบ ·
        ปุ่มด้านล่าง<b>บันทึกเพียงข้อเสนอ</b> (พร้อมภาพรวมหลักฐาน validity ณ เวลานั้น) — ไม่เปลี่ยนคะแนนของใคร</p>
      ${adm ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><label class="dt-f" style="flex:1;min-width:220px"><span>เหตุผล/หมายเหตุ</span><input id="dtRfNote" placeholder="เช่น มีปี 2567–2568 ที่อนุมัติแล้วครบ 2 ปี"></label>
        <button class="btn s" id="dtRfBtn">บันทึกข้อเสนอ re-freeze</button></div>` : `<p class="dt-sm2">เฉพาะผู้ดูแล/อาจารย์บันทึกข้อเสนอได้</p>`}
      ${items === null ? loading() : items.length ? `<div class="tw" style="margin-top:10px"><table class="dt-tab"><thead><tr><th>เวลา (UTC)</th><th>ผู้เสนอ</th><th>หมายเหตุ</th><th>สถานะ</th></tr></thead><tbody>
        ${items.map(x => `<tr><td>${esc((x.created || "").slice(0, 16).replace("T", " "))}</td><td>${U(x.actor_label || "")}</td><td>${U(x.comment || "")}</td><td>${pill("บันทึกข้อเสนอแล้ว · ยังไม่ใช้", "mute")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="dt-empty">ยังไม่มีข้อเสนอ</div>`}</div>`;
  }
  async function review(id, ok, h) {
    const cm = (h.querySelector(`[data-dtcm="${id}"]`) || {}).value || "";
    if (!ok && !cm.trim()) return toast("การไม่อนุมัติต้องระบุเหตุผล");
    if (SRV()) {
      const r = await (ok ? API().approve(id, cm) : API().reject(id, cm));
      if (!r.ok) return toast(r.error || "ไม่สำเร็จ");
      drop();
    } else {
      const o = lsLoad(); let rec = null;
      Object.values(o.recs).forEach(a => a.forEach(r => { if (r.id === id) rec = r; }));
      if (!rec || rec.status !== "pending") return;
      Object.assign(rec, { status: ok ? "approved" : "rejected", reviewer_label: meKey() + " (ผู้ดูแลจำลอง)", reviewed: new Date().toISOString(), review_comment: cm.trim() });
      lsLog(o, id, ok ? "approve" : "reject", cm.trim());
      if (ok) o.vAt = new Date().toISOString();
      lsSave(o);
    }
    toast(ok ? "อนุมัติแล้ว — เข้าสู่ชุดข้อมูลหลัก · คำนวณ validity ใหม่แล้ว" : "บันทึกการไม่อนุมัติแล้ว");
    render();
  }
  function wireAdmin(h) {
    const dm = h.querySelector("#dtAdminDemo");
    if (dm) dm.onchange = () => { DT.adminDemo = dm.checked; try { sessionStorage.setItem("ois_dt_admin", dm.checked ? "1" : "0"); } catch (e) { } render(); };
    h.querySelectorAll("[data-dtok]").forEach(b => b.onclick = () => review(+b.dataset.dtok, true, h));
    h.querySelectorAll("[data-dtno]").forEach(b => b.onclick = () => review(+b.dataset.dtno, false, h));
    const ru = h.querySelector("#dtRefUp"), rf = h.querySelector("#dtRefFile");
    if (ru && rf) ru.onclick = async () => {
      if (!rf.files[0]) return toast("เลือกไฟล์ .csv ก่อน");
      ru.disabled = true; DT.refRes = await API().uploadReference(rf.files[0]); drop(); render();
    };
    wireRefreeze(h); wireCommon(h);
  }
  function wireRefreeze(h) {
    const b = h.querySelector("#dtRfBtn");
    if (b) b.onclick = async () => {
      const note = (h.querySelector("#dtRfNote") || {}).value || "";
      if (SRV()) { const r = await API().refreeze(note); if (!r.ok) return toast(r.error || "ไม่สำเร็จ"); drop("refreeze"); }
      else {
        const o = lsLoad(), v = validityLocal();
        o.refreeze = o.refreeze || [];
        o.refreeze.unshift({ id: o.refreeze.length + 1, actor_label: meKey() + " (ผู้ดูแลจำลอง)", comment: note, created: new Date().toISOString(),
          snapshot: { frozen_reference: REFV, n_new_with_outcome: v.n_new_with_outcome, applied: false } });
        lsLog(o, null, "refreeze_proposal", note || "(ไม่มีหมายเหตุ)"); lsSave(o);
      }
      toast("บันทึกข้อเสนอแล้ว — ฐานอ้างอิงที่ใช้ให้คะแนนยังเป็น " + REFV); render();
    };
  }

  /* ======================================================================= 3 · ประวัติหลายปีบน Company Profile */
  function historyRows(c) {
    const out = [], vd = verdictOf(c);
    let research = [], refPresent = false, recs;
    if (SRV()) {
      const h = need("hist:" + c.t, () => srvGet("/api/data/history?ticker=" + encodeURIComponent(c.t)));
      if (h === undefined) return null;
      if (h.ok === false) return { locked: !!h.locked || h.status === 403, error: h.error || "โหลดไม่สำเร็จ", own: h.own };
      research = h.research || []; refPresent = !!h.reference_present; recs = h.records || [];
    } else recs = lsVisible(lsLoad()).filter(r => r.ticker === c.t);
    research.forEach(r => out.push({ fy: r.fy, ois: r.ois, tier: r.tier, quad: r.quad, regime: r.regime, src: "research" }));
    out.push({ fy: FY_SHOWN, ois: r1(c.ois ?? c.ipi), tier: vd.tier, quad: vd.quad, regime: REGIME[FY_SHOWN] || null, src: "current" });
    recs.filter(r => ["approved", "pending", "rejected"].includes(r.status)).forEach(r => out.push({ fy: r.fy, ois: r.score && r.score.ois != null ? r1(r.score.ois) : null, tier: r.score && r.score.tier, quad: r.score && r.score.quad,
      regime: r.score && r.score.regime, src: r.status === "approved" ? "approved" : r.status, mine: r.mine }));
    return { rows: out.sort((a, b) => a.fy - b.fy || ["research", "current", "approved", "pending", "rejected"].indexOf(a.src) - ["research", "current", "approved", "pending", "rejected"].indexOf(b.src)), refPresent };
  }
  function historyCard() {
    const c = cur(), H = historyRows(c);
    if (H === null) return `<div class="card dt-hist" id="dtHist" style="margin-top:14px"><h3>คะแนนย้อนหลังหลายปี</h3>${loading()}</div>`;
    if (H.error) return `<div class="card dt-hist" id="dtHist" style="margin-top:14px"><h3>คะแนนย้อนหลังหลายปี · ${esc(c.t)} ${H.locked ? pill("🔒 สิทธิ์ Pro", "mute") : ""}</h3>
      <p class="desc" id="dtHistLock">${H.locked ? `<span>ประวัติหลายปีของบริษัทนี้เป็นสิทธิ์ระดับ Pro ขึ้นไป</span>${H.own ? ` · <span>บริษัทของคุณ</span> <b>${esc(H.own)}</b>` : ""}
        <br><span>เซิร์ฟเวอร์ตรวจสิทธิ์นี้เอง (ไม่ใช่เพียงซ่อนในเบราว์เซอร์): ระดับ Basic ดูประวัติได้เฉพาะบริษัทของตนที่เลือกตอนเข้าใช้ครั้งแรก และบริษัทที่ตนส่งข้อมูลเอง</span>` : esc(H.error)}</p></div>`;
    const rows = H.rows, years = [...new Set(rows.map(r => r.fy))].sort((a, b) => a - b);
    const SC = { research: ["var(--s1)", "circle"], current: ["var(--s3)", "sq"], approved: ["var(--s2)", "dia"], pending: ["var(--s2)", "circle"], rejected: ["var(--crit)", "circle"] };
    const pref = ["approved", "current", "research"], main = years.map((fy, i) => {
      const r = pref.map(s => rows.find(x => x.fy === fy && x.src === s)).find(Boolean); return r ? { i, v: r.ois } : null; }).filter(Boolean);
    const pts = rows.filter(r => r.src !== "rejected").map(r => ({ i: years.indexOf(r.fy), v: r.ois, c: SC[r.src][0], shape: SC[r.src][1], hollow: r.src === "pending",
      tip: `${th(r.fy)} · OIS ${f1(r.ois)} · ${r.src}`, lab: r.src === "pending" ? "รอ" : "" }));
    const chart = lineChart({ xs: years.map(y => [yr(y), isEN() ? "" : String(y)]), y0: 0, y1: 100, ticks: [0, 25, 50, 75, 100], h: 240,
      th: [{ v: 75, l: "Tier 1 ≥ 75", cls: "ok" }, { v: 50, l: "50", cls: "mute" }, { v: 25, l: "Tier 4 < 25", cls: "warn" }],
      series: [{ pts: main, nomark: true }, { pts, noline: true }], aria: `OIS ของ ${c.t} รายปี` });
    const lg = [["research", "งานวิจัย (REF-928)"], ["current", "ข้อมูลปัจจุบัน ปี 2566"], ["approved", "ผู้ใช้อนุมัติแล้ว"], ["pending", "รออนุมัติ · เห็นเฉพาะคุณ"]];
    return `<div class="card dt-hist" id="dtHist" style="margin-top:14px"><h3>คะแนนย้อนหลังหลายปี · ${esc(c.t)}</h3>
      <p class="desc">OIS ทุกปีเป็นตำแหน่งเทียบฐานอ้างอิงที่ตรึงไว้ ${esc(REFV)} ชุดเดียวกัน จึงเทียบข้ามปีได้ ·
        ${SRV() ? (H.refPresent ? "ปี 2562–2566 จากไฟล์อ้างอิงของงานวิจัย (ค่าสรุปเท่านั้น)" : "ผู้ดูแลยังไม่ได้อัปโหลดไฟล์อ้างอิง — ยังไม่มีปีของงานวิจัย")
          : "ไฟล์ออฟไลน์มีเฉพาะปีปัจจุบันและรายการในเครื่องนี้ (ปีของงานวิจัยแสดงในฉบับเซิร์ฟเวอร์)"}</p>
      <div class="grid dt-hgrid"><div>${chart}
        <div class="dt-legend">${lg.map(([k, l]) => `<span><svg width="14" height="14" aria-hidden="true">${SC[k][1] === "sq" ? `<rect x="2" y="2" width="10" height="10" style="fill:${SC[k][0]}"/>` : SC[k][1] === "dia" ? `<path d="M7 1L13 7L7 13L1 7Z" style="fill:${SC[k][0]}"/>` : `<circle cx="7" cy="7" r="5" style="fill:${k === "pending" ? "var(--panel)" : SC[k][0]};stroke:${SC[k][0]};stroke-width:2"/>`}</svg>${l}</span>`).join("")}</div></div>
      <div class="tw"><table class="dt-tab" id="dtHistTab"><thead><tr><th>ปีบัญชี</th><th class="n">OIS</th><th class="n">Tier</th><th>Quadrant</th><th>ผลเกณฑ์ของปี</th><th>แหล่งข้อมูล</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${yr(r.fy)}${yrP(r.fy)}</td><td class="n"><b>${f1(r.ois)}</b></td><td class="n">${r.tier ?? "—"}</td><td>${esc(r.quad || "—")}</td><td>${regimeBadge(r.regime)}</td><td>${srcPill(r.src)}</td></tr>`).join("")}
      </tbody></table></div></div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn s" data-goto="dataupload">+ นำเข้าข้อมูลปีใหม่ของ ${esc(c.t)}</button></div></div>`;
  }

  /* ======================================================================= 4 · Validity คำนวณใหม่ (ต่อท้ายหน้าหลักฐานความแม่น) */
  function validityLocal() {
    const P = typeof PAPER === "object" && PAPER ? PAPER : null;
    const years = (P ? P.byYear : []).map(r => ({ fy: r.fy, src: "paper", label: "ค่าตามบทความ", n: r.n, sp: r.sp, p_txt: r.p, auc: r.auc, ci: r.ci, lift: r.lift, v: r.v }));
    const appr = lsVisible(lsLoad()).filter(r => r.status === "approved");
    const by = {};
    appr.forEach(r => { if (r.payload.oi_next !== null && r.payload.oi_next !== undefined && r.score) (by[r.fy] = by[r.fy] || []).push([r.score.B, +r.payload.oi_next]); });
    let all = [];
    Object.keys(by).map(Number).sort((a, b) => a - b).forEach(fy => {
      const g = by[fy]; all = all.concat(g);
      years.push(g.length < MIN_N ? { fy, src: "approved", label: "ข้อมูลผู้ใช้ที่อนุมัติแล้ว", n: g.length, insufficient: true }
        : Object.assign(vStats(g.map(x => x[0]), g.map(x => x[1])), { fy, src: "approved", label: "ข้อมูลผู้ใช้ที่อนุมัติแล้ว" }));
    });
    const pp = P ? P.pooled : null;
    return { source: "paper", years, pooled_ref: pp ? { fy: "pooled", src: "paper", n: pp.n, sp: pp.sp, p_txt: pp.p, auc: pp.auc, ci: pp.ci, lift: pp.lift, v: pp.v } : null,
             pooled_all: all.length >= MIN_N ? Object.assign(vStats(all.map(x => x[0]), all.map(x => x[1])), { fy: "pooled_new", src: "approved", label: "รวมเฉพาะปีใหม่ที่อนุมัติ" }) : null,
             n_new_with_outcome: all.length, n_approved: appr.length, computed: lsLoad().vAt || null, frozen_reference: REFV, ci_method: "Hanley–McNeil (1982) ±1.96·SE" };
  }
  function validityData() { return SRV() ? need("validity", () => srvGet("/api/data/validity")) : validityLocal(); }
  function vChart(V, key, o) {
    const yrs = V.years, xs = yrs.map(r => [yr(r.fy) + (r.src === "approved" ? "*" : ""), `${r.fy}→${r.fy + 1}`]);
    const pts = yrs.map((r, i) => r.insufficient ? null : { i, v: r[key], c: VCOL[r.v] || "var(--ink-3)", lab: r.v ? r.v[0] : "", tip: `${th(r.fy)} · ${o.name} ${f3(r[key])} · ${r.v || "—"}` }).filter(Boolean);
    const ci = key === "auc" ? yrs.map((r, i) => r.ci ? { i, lo: r.ci[0], hi: r.ci[1], c: VCOL[r.v] || "var(--ink-3)" } : null).filter(Boolean) : [];
    const gaps = yrs.map((r, i) => r.insufficient ? { i, t: `ข้อมูลยังไม่พอ (n = ${r.n})` } : null).filter(Boolean);
    const pooled = V.pooled_ref && V.pooled_ref[key];
    const vals = pts.map(p => p.v).concat(ci.map(c => c.lo), ci.map(c => c.hi));
    const y0 = Math.min(o.y0, Math.floor((Math.min(...vals, o.y0) - .02) * 10) / 10), y1 = Math.max(o.y1, Math.ceil((Math.max(...vals, o.y1) + .02) * 10) / 10);
    const ticks = []; for (let t = Math.round(y0 * 10); t <= Math.round(y1 * 10); t++) ticks.push(t / 10);
    return lineChart({ xs, y0, y1, ticks, yf: o.yf, h: 250, gaps, aria: o.name + " รายปี",
      th: [{ v: o.t[0], l: `ผ่าน ≥ ${o.t[0]}`, cls: "ok" }, { v: o.t[1], l: `ระวัง ≥ ${o.t[1]}`, cls: "warn" }].concat(pooled !== undefined && pooled !== null ? [{ v: pooled, l: `ค่ารวม ${f3(pooled)}`, cls: "mute", left: true }] : []),
      series: [{ pts, ci }] });
  }
  function vRow(r) {
    const fy = r.fy === "pooled" ? "รวมปีอ้างอิง" : r.fy === "pooled_all" ? "รวมปีอ้างอิง + ปีใหม่" : r.fy === "pooled_new" ? "รวมเฉพาะปีใหม่" : `${yr(r.fy)} → ${yr(r.fy + 1)}${yrP(r.fy + "→" + (r.fy + 1))}`;
    const src = r.src === "ref_csv" ? pill("คำนวณจากไฟล์อ้างอิง", "dt-src-r") : r.src === "paper" ? pill("ค่าตามบทความ", "mute") : r.src === "approved" ? pill("ผู้ใช้อนุมัติแล้ว", "dt-src-a") : pill("รวมทุกแหล่ง", "dt-src-c");
    if (r.insufficient) return `<tr class="dt-ins"><td>${fy}</td><td class="n">${r.n}</td><td colspan="4"><b>ข้อมูลยังไม่พอ (n = ${r.n})</b> — ต้องมีอย่างน้อย ${MIN_N} บริษัทที่มีผลลัพธ์ปีถัดไป</td><td>${src}</td></tr>`;
    const m = r.match ? (r.match.ok ? ` <span class="dt-good" title="ต่างจากบทความ ρ ${r.match.diff.sp} · AUC ${r.match.diff.auc} · lift ${r.match.diff.lift}">✓ ตรงบทความ</span>` : ` <span class="dt-bad">ต่างจากบทความ</span>`) : "";
    return `<tr${typeof r.fy !== "number" ? ' class="dt-pool"' : ""}><td>${fy}</td><td class="n">${fmt(r.n)}</td><td class="n">${f3(r.sp)} <span style="color:var(--ink-3)">(p ${esc(r.p_txt || "—")})</span></td>
      <td class="n">${f3(r.auc)} <span style="color:var(--ink-3)">${r.ci ? `[${f3(r.ci[0])}, ${f3(r.ci[1])}]` : ""}</span></td><td class="n">${r.lift_inf ? "∞" : f2(r.lift)}×</td><td>${vpill(r.v)}${m}</td><td>${src}</td></tr>`;
  }
  /** Basic: เห็นคำอธิบาย (ไม้บรรทัดตรึง · วิธีคำนวณ) เท่านั้น — ตาราง/กราฟรายปีและข้อเสนอ re-freeze เป็นสิทธิ์ Pro เหมือนตารางหลักของหน้า */
  function validityLocked() {
    return `<div class="card dt-vp" id="dtValid" style="margin-top:14px">
      <h3>ผลตรวจความเที่ยงตรงล่าสุด (คำนวณใหม่เมื่อฐานข้อมูลเปลี่ยน) <span class="pill mute">🔒 สิทธิ์ Pro</span></h3>
      <p class="desc" id="dtValidLock"><span>ตาราง Spearman ρ · AUC · Decile lift รายปีที่คำนวณใหม่เมื่อผู้ดูแลอนุมัติข้อมูลปีใหม่ กราฟรายปี และข้อเสนอตรึงฐานอ้างอิงใหม่ เป็นสิทธิ์ของผู้ใช้ Pro ขึ้นไป — กติกาเดียวกับตาราง Table 3–5 รายปีด้านบน</span>
        ${SRV() ? `<span>(เซิร์ฟเวอร์ตรวจสิทธิ์นี้เองด้วย)</span>` : ""} · <span>ด้านล่างคือคำอธิบายหลักการและวิธีคำนวณ</span></p>
      <div class="note dt-key"><b>ปีใหม่เปลี่ยน “หลักฐาน” ไม่ได้เปลี่ยน “ไม้บรรทัด”</b> — <span>เมื่อผู้ดูแลอนุมัติปีใหม่ที่มีผลลัพธ์ปีถัดไป ระบบคำนวณความเที่ยงตรงใหม่ แต่คะแนนทุกบริษัทยังวัดเทียบฐานอ้างอิงที่ตรึงไว้</span>
        ${esc(REFV)} <span>เหมือนเดิม · การตรึงฐานใหม่ (re-freeze) เป็นการตัดสินใจแยกต่างหาก มีเลขเวอร์ชัน และไม่เกิดขึ้นเอง</span></div>
      ${noteSet()}</div>` + manual();
  }
  function validityPanel() {
    if (!canValidity()) return validityLocked();
    const V = validityData();
    if (V === undefined) return `<div class="card dt-vp" id="dtValid" style="margin-top:14px"><h3>ผลตรวจความเที่ยงตรงล่าสุด (คำนวณใหม่เมื่อฐานข้อมูลเปลี่ยน)</h3>${loading()}</div>`;
    if (V.ok === false) return `<div class="card dt-vp" id="dtValid" style="margin-top:14px"><h3>ผลตรวจความเที่ยงตรงล่าสุด</h3><div class="note crit">${esc(V.error || "โหลดไม่สำเร็จ")}</div></div>`;
    const rows = V.years.concat([V.pooled_ref, V.pooled_all].filter(Boolean));
    const srcTxt = V.source === "ref_csv" ? "ปี 2562–2566 คำนวณจริงจากไฟล์อ้างอิงรายแถวบนเซิร์ฟเวอร์ (ตรวจแล้วว่าตรงกับตารางที่ 3 ของบทความภายใน ±0.005)"
      : "ปี 2562–2566 เป็น <b>ค่าตามบทความ</b> (ตารางที่ 3) เพราะไฟล์อ้างอิงรายแถวไม่อยู่ในไฟล์นี้";
    return `<div class="card dt-vp" id="dtValid" style="margin-top:14px">
      <h3>ผลตรวจความเที่ยงตรงล่าสุด (คำนวณใหม่เมื่อฐานข้อมูลเปลี่ยน)</h3>
      <p class="desc">${srcTxt} · ปีใหม่ = ข้อมูลที่ผู้ดูแลอนุมัติแล้วและมีผลลัพธ์ปีถัดไป (ตอนนี้ ${fmt(V.n_new_with_outcome)} บริษัท-ปี จาก ${fmt(V.n_approved)} รายการที่อนุมัติ) ·
        คำนวณล่าสุด ${esc(V.computed ? V.computed.replace("T", " ").slice(0, 16) + " UTC" : "ตอนเปิดหน้า")} · ช่วงความเชื่อมั่นของ AUC ที่คำนวณในระบบใช้วิธี Hanley–McNeil (บทความใช้ DeLong — ต่างกันไม่เกินราว 0.005)</p>
      <div class="note dt-key"><b>ปีใหม่เปลี่ยน “หลักฐาน” ไม่ได้เปลี่ยน “ไม้บรรทัด”</b> — ตารางและกราฟนี้คำนวณใหม่ทุกครั้งที่ชุดข้อมูลหลักเปลี่ยน
        แต่คะแนนทุกบริษัทยังวัดเทียบฐานอ้างอิงที่ตรึงไว้ ${esc(V.frozen_reference || REFV)} เหมือนเดิม · การตรึงฐานใหม่ (re-freeze) เป็นการตัดสินใจแยกต่างหาก มีเลขเวอร์ชัน และไม่เกิดขึ้นเอง</div>
      <div class="tw" style="margin-top:12px"><table class="dt-tab" id="dtVTab"><thead><tr><th>ปีที่ใช้ทำนาย → ปีผลลัพธ์</th><th class="n">N</th><th class="n">Spearman ρ (p)</th><th class="n">AUC [95% CI]</th><th class="n">Decile lift</th><th>ผลตัดสิน</th><th>แหล่งข้อมูล</th></tr></thead>
        <tbody>${rows.map(vRow).join("")}</tbody></table></div>
      <p class="dt-sm2">เกณฑ์ (กำหนดล่วงหน้า 24 ส.ค. 2569): ρ ≥ 0.15 ผ่าน / ≥ 0.05 ระวัง · AUC ≥ 0.60 / ≥ 0.55 · lift ≥ 2.0 / ≥ 1.3 · ข้อใดต่ำกว่าระดับระวัง → FAIL · ผ่านครบสามข้อ → PASS · นอกนั้น CAUTION · * = ปีจากข้อมูลผู้ใช้</p>
      <div class="grid g2 dt-2" style="margin-top:12px">
        <figure class="dt-fig"><figcaption>Spearman ρ รายปี</figcaption>${vChart(V, "sp", { name: "Spearman ρ", y0: -0.1, y1: 0.4, ticks: [-0.1, 0, 0.1, 0.2, 0.3, 0.4], yf: t => fmt(t, 1), t: VTHX.sp })}</figure>
        <figure class="dt-fig"><figcaption>AUC รายปี (เส้นตั้ง = ช่วงความเชื่อมั่น 95%)</figcaption>${vChart(V, "auc", { name: "AUC", y0: 0.35, y1: 0.8, ticks: [0.4, 0.5, 0.6, 0.7, 0.8], yf: t => fmt(t, 1), t: VTHX.auc })}</figure>
      </div>
      <div class="dt-legend"><span><i style="background:var(--ok)"></i>P = PASS</span><span><i style="background:var(--warn)"></i>C = CAUTION</span><span><i style="background:var(--crit)"></i>F = FAIL</span><span>เส้นประ = ระดับเกณฑ์ · เส้นจาง = ค่ารวม</span></div>
      ${noteSet()}
    </div>` + refreezeCard(false) + manual();
  }
  function manual() {
    return `<div class="card dt-man" id="dtManual" style="margin-top:14px"><h3>ที่มาของสูตรและวิธีคำนวณ</h3>
      <p class="desc">คู่มือสำหรับผู้ตรวจ: ทุกตัวเลขในตารางด้านบนคำนวณด้วยวิธีต่อไปนี้ (ฝั่งเซิร์ฟเวอร์ใน server/data_api.py และในเบราว์เซอร์ใช้สูตรเดียวกัน) · ตรงกับไฟล์คำสั่ง Stata ของงานวิจัย (Section 3 และ 5)</p>
      <ol class="dt-ol">
        <li><b>ข้อมูลที่ใช้ตรวจ</b> — คู่ (คะแนนปี t, จำนวนกิจกรรม open innovation ปี t+1) ของแต่ละบริษัท · คะแนนคือ Signal B ที่วัดเทียบฐานอ้างอิงที่ตรึงไว้ (ลำดับเท่ากับ OIS ทุกประการ)</li>
        <li><b>Spearman ρ (สหสัมพันธ์อันดับ)</b> — เรียงอันดับคะแนนและผลลัพธ์แยกกัน ค่าที่เท่ากันได้อันดับเฉลี่ย แล้วหาสหสัมพันธ์เพียร์สันของอันดับ:
          <span class="dt-eq">ρ = Σ(rₓ − r̄ₓ)(r_y − r̄_y) / √[Σ(rₓ − r̄ₓ)² · Σ(r_y − r̄_y)²]</span>
          ค่า p สองทางจาก <span class="dt-eq">t = ρ·√((n − 2)/(1 − ρ²))</span> ที่องศาอิสระ n − 2 (วิธีเดียวกับคำสั่ง spearman ของ Stata) · 0 = ไม่สัมพันธ์</li>
        <li><b>กลุ่มบน (top tercile)</b> — บริษัทที่ผลลัพธ์ ≥ เปอร์เซ็นไทล์ที่ 66.667 ของปีนั้น (แถวรวมใช้จุดตัดของข้อมูลรวม) · จุดตัดใช้นิยามเปอร์เซ็นไทล์ของ Stata: P = n·p/100 ถ้า P เป็นจำนวนเต็มใช้ค่าเฉลี่ยของลำดับที่ P และ P+1 ไม่เช่นนั้นใช้ลำดับที่ ⌊P⌋+1</li>
        <li><b>AUC (อำนาจจำแนก)</b> — ความน่าจะเป็นที่บริษัทจากกลุ่มบนได้คะแนนสูงกว่าบริษัทจากกลุ่มที่เหลือ เมื่อสุ่มมาอย่างละหนึ่งราย (คะแนนเท่ากันนับครึ่ง) คำนวณผ่านสถิติ Mann–Whitney:
          <span class="dt-eq">AUC = U / (n₁·n₀) · U = R₁ − n₁(n₁+1)/2</span> (R₁ = ผลรวมอันดับของกลุ่มบน) · 0.50 = เดาสุ่ม (Fawcett, 2006; Hanley &amp; McNeil, 1982)</li>
        <li><b>ช่วงความเชื่อมั่นของ AUC (Hanley–McNeil)</b> — <span class="dt-eq">SE² = [A(1−A) + (n₁−1)(Q₁−A²) + (n₀−1)(Q₂−A²)] / (n₁·n₀)</span>
          โดย Q₁ = A/(2−A), Q₂ = 2A²/(1+A) · ช่วง 95% = A ± 1.96·SE · บทความใช้วิธี DeLong (DeLong et al., 1988) ซึ่งไม่ต้องสมมติรูปการกระจาย — สองวิธีให้ช่วงต่างกันราว 0.005 ในข้อมูลชุดนี้</li>
        <li><b>Decile lift</b> — แบ่งบริษัทเป็น 10 กลุ่มตามคะแนน (จุดตัดที่เปอร์เซ็นไทล์ 10, 20, …, 90 · คะแนนเท่ากันอยู่กลุ่มเดียวกัน แบบคำสั่ง xtile ของ Stata) แล้ว
          <span class="dt-eq">lift = ค่าเฉลี่ยผลลัพธ์ของกลุ่มที่ 10 ÷ ค่าเฉลี่ยของกลุ่มที่ 1</span> · 1.0 = ไม่แยกกลุ่ม</li>
        <li><b>ผลตัดสิน</b> — ρ ≥ 0.15 ผ่าน / ≥ 0.05 ระวัง · AUC ≥ 0.60 / ≥ 0.55 · lift ≥ 2.0 / ≥ 1.3 · ข้อใดต่ำกว่าระดับระวัง → FAIL · ผ่านครบสามข้อ → PASS · นอกนั้น CAUTION ·
          เกณฑ์เป็นระดับใช้งานที่โครงการกำหนดล่วงหน้า (บันทึก 24 ส.ค. 2569) ไม่ได้มาจากวรรณกรรม (บทความ §3.3)</li>
        <li><b>ปีใหม่ต้องมีอย่างน้อย ${MIN_N} บริษัท</b> — กติกาของระบบนี้ (ไม่ใช่ของบทความ) เพื่อไม่ให้ตัวเลขจากตัวอย่างเล็กมากถูกอ่านเป็นหลักฐาน · ปีที่น้อยกว่าแสดง “ข้อมูลยังไม่พอ”</li>
        <li><b>ทำไมฐานอ้างอิงต้องตรึง (บทความ §4.3 DP2)</b> — คะแนนคือเปอร์เซ็นไทล์แบบ mid-rank เทียบฐาน
          <span class="dt-eq">OIS(b) = 100 · [#{B_j &lt; b} + 0.5·#{B_j = b}] / 928</span>
          ถ้าฐานขยับทุกครั้งที่มีข้อมูลใหม่ คะแนนเดิมของทุกบริษัทจะเปลี่ยนตามโดยที่บริษัทไม่ได้เปลี่ยนอะไร และเทียบข้ามเวลาไม่ได้ · ข้อมูลใหม่จึงถูกวัดเทียบฐานที่ตรึงไว้เสมอ
          และการตรึงใหม่เป็นเหตุการณ์ที่ตั้งใจ มีเวอร์ชัน (เช่น REF928-edit6-20260930 → ฉบับถัดไป)</li>
        <li><b>ความเที่ยงตรงเป็นหลักฐานที่สะสม</b> ไม่ใช่ตัวเลขเดียว (Cronbach &amp; Meehl, 1955; Messick, 1995) — ผลรายปีจึงถูกแสดงคู่กับค่ารวมเสมอ รวมถึงปีที่ไม่ผ่าน</li>
      </ol>
      <p class="dt-ref">อ้างอิง: DeLong, E. R., DeLong, D. M., &amp; Clarke-Pearson, D. L. (1988). Biometrics, 44(3), 837–845 ·
        Fawcett, T. (2006). Pattern Recognition Letters, 27(8), 861–874 · Hanley, J. A., &amp; McNeil, B. J. (1982). Radiology, 143(1), 29–36 ·
        Cronbach, L. J., &amp; Meehl, P. E. (1955). Psychological Bulletin, 52(4), 281–302 · Messick, S. (1995). American Psychologist, 50(9), 741–749 ·
        บทความ OpenInnoScore §3.3 (เกณฑ์), §4.3 (DP2 ฐานอ้างอิงตรึง), ตารางที่ 3 (ผลรายปี)</p></div>`;
  }

  /* ======================================================================= 5 · ลงทะเบียนหน้า · ห่อหน้าที่มีอยู่ · เมนู */
  VIEWS.dataupload = viewDataUpload; WIRES2.dataupload = wireUpload;
  VIEWS.dataadmin = viewDataAdmin; WIRES2.dataadmin = wireAdmin;
  if (typeof VIEWS.valid === "function") {
    const v = VIEWS.valid, w = WIRES2.valid;
    VIEWS.valid = function () { return v.apply(this, arguments) + validityPanel(); };
    WIRES2.valid = function (h) { if (typeof w === "function") w(h); wireRefreeze(h); };
  }
  {
    const v = VIEWS.profile, w = WIRES2.profile;
    VIEWS.profile = function () {
      const html = v.apply(this, arguments);
      if (typeof canSeeCo === "function" && !canSeeCo(S.t)) return html;
      return html + historyCard();
    };
    WIRES2.profile = function (h) { if (typeof w === "function") w(h); else if (typeof wireProfile === "function") wireProfile(h); };
  }
  // เปลี่ยนบริษัท/ผู้ใช้ → ล้างแคชประวัติ (ข้อมูลของผู้ใช้คนอื่นต้องไม่ค้างในหน้าจอ)
  (() => { let u = S.user, k = S.plan + "|" + S.freeCo; const _r = render; render = function () {
    if (S.user !== u) { u = S.user; drop(); DT.form = null; DT.last = null; DT.msg = null; }
    if (S.plan + "|" + S.freeCo !== k) { k = S.plan + "|" + S.freeCo; drop("hist:", "validity", "refreeze"); }
    return _r.apply(this, arguments); }; })();
  (() => {
    const add = (it, after) => { if (NAV.some(n => n.id === it.id)) return; const i = NAV.findIndex(n => n.id === after); if (i >= 0) NAV.splice(i + 1, 0, it); else NAV.push(it); };
    add({ id: "dataupload", g: 3, ico: "⇪", lab: "นำเข้าข้อมูลปีใหม่" }, "datasets");
    add({ id: "dataadmin", g: 3, ico: "☑", lab: "อนุมัติข้อมูล (ผู้ดูแล/อาจารย์)" }, "dataupload");
    buildNav();
    if (S.user) syncNavLocks();
    try {
      const o = JSON.parse(localStorage.getItem(LS) || "null"), vw = o && o.vw;
      if (S.user && (vw === "dataupload" || vw === "dataadmin") && $("#v-" + vw)) {
        S.view = vw; $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + vw)); syncNavLocks(); render();
      } else if (S.user && (S.view === "valid" || S.view === "profile")) render();
    } catch (e) { }
  })();
  window.DTX = { STATS, wordsOf, wordsSrv, canValidity, lsLoad, lsVisible, scoreLocal, checks, validityLocal, DT, MIN_WORDS, MIN_N };
})();
