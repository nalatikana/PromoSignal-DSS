/* ============================================================================
   OpenInnoScore — ตัวเชื่อมโหมดเซิร์ฟเวอร์ (ฝังเฉพาะไฟล์ OpenInnoScore_server.html)
   DP6 · เบราว์เซอร์ไม่มีบันทึกพารามิเตอร์ (สัมประสิทธิ์ ค่าเฉลี่ย จุดตัด V̂f ฐานอ้างอิงดิบ) และไม่มี amp / cP / B ดิบ
   แก้ไขครั้งที่ 2.5 (ภาคผนวก ง ใหม่-2 / ง-4): POST /api/score รับเฉพาะ {ticker, fem_count, bsize, ten, variant}
     ของบริษัทที่มีอยู่แล้ว — What-if จำลองได้สองตัวแปร: จำนวนกรรมการหญิง (กับขนาดบอร์ด 5–25 คน) และอายุงานเฉลี่ย (B_FULL)
     ค่าป้อนอื่น (CEO Promotion Focus · ครอบครัว · political ties) เซิร์ฟเวอร์อ่านจากค่าที่เก็บของบริษัทเอง
     ผลลัพธ์: OIS (1 ตำแหน่ง) · ipi · tier · quadrant · ช่วง 90% · ap / dp (จำนวนเต็ม) · B_T1 · full — ไม่มีเครื่องหมายหรือธง clip
   ฟังก์ชันของโมเดล (ampOf, cpOf, signalB, oisOf …) ยังถูกเรียกแบบ synchronous ระหว่าง render จึงใช้แคช + "ค่าตัวแทน" (surrogate):
     · ampOf(fam, pol, fem) คืน "amp ตัวแทน" = (ap − zA) บังคับเครื่องหมายตาม quadrant + เศษเฉพาะตัว 1e-9
     · cpOf(promo)          คืน "cP ตัวแทน" = (dp − zP) บังคับเครื่องหมายตาม quadrant + เศษเฉพาะตัว
     · signalB(promo, amp) = cP ตัวแทน × amp ตัวแทน → oisOf / oisIndOf ถอดคู่ค่าป้อนกลับจากทะเบียน แล้วอ่านผลจากแคช
   แปลงการเรียกเป็นคำขอ: (promo, fam, pol) ต้องตรงกับค่าที่เก็บของบริษัทใดบริษัทหนึ่ง (เลือก S.t ก่อน) และ fem ต้องเขียนเป็น k/b
     ได้ (b 5–25) · ten ปัดทีละ 0.5 (0–40) — ค่าป้อนที่ไม่มีทางไปเซิร์ฟเวอร์ (เช่น promoAtPct(dp) ของตัวเลื่อน CEO เดิม, OM.* บริษัทสมมติ
     ที่ค่าเฉลี่ย, fam/pol ที่ไม่ตรงบริษัทใด) คืน NaN → หน้าจอแสดง "—" (fmt) · ค่าของบริษัทเอง (196 บริษัท) อยู่ในแคชตั้งแต่เปิดหน้า
   ไม่มีในแคช → คืนค่าชั่วคราว (ผลของค่าป้อนที่ใกล้ที่สุด) + เข้าคิว → ส่งเป็นชุดหลัง 50 ms → ได้ผลแล้ว render() ใหม่หนึ่งครั้ง
   ทุก fetch ไป /api/* แนบ header X-OIS-Plan = S.plan (เซิร์ฟเวอร์ใช้เมื่อ PLAN_SOURCE=client เท่านั้น — ดู server/app.py require_plan)
   ไฟล์นี้ถูกต่อไว้หน้า v2_app.js ในสคริปต์เดียวกัน
   ============================================================================ */
window.OIS_SERVER = true;   // ประกาศก่อนทุกอย่าง — โค้ดส่วนอื่นตรวจได้ว่าเป็นฉบับเซิร์ฟเวอร์ (ฉบับออฟไลน์ไม่มีตัวแปรนี้และไม่มี OIS_API)
/* แนบระดับสิทธิ์ที่เบราว์เซอร์ประกาศกับทุกคำขอ /api/* (ไม่ใช่การยืนยันสิทธิ์ — เซิร์ฟเวอร์ใช้เฉพาะเมื่อ PLAN_SOURCE=client และบันทึก log) */
(() => {
  const f0 = window.fetch && window.fetch.bind(window); if (!f0) return;
  window.fetch = (input, init) => {
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const same = url.startsWith("/api/") || url.startsWith(location.origin + "/api/");
      const plan = typeof S !== "undefined" && S && S.plan;
      if (same && plan) {
        init = Object.assign({}, init || {});
        const h = new Headers(init.headers || (typeof input !== "string" && input.headers) || {});
        if (!h.has("X-OIS-Plan")) h.set("X-OIS-Plan", String(plan));
        init.headers = h;
      }
    } catch (e) { }
    return f0(input, init);
  };
})();
const OIS_REMOTE = (() => {
  const ZA = +OIS.zA || 50, ZP = +OIS.zP || 50;
  const R = new Map();                       // key → ผลจากเซิร์ฟเวอร์
  const Q = new Map();                       // key → คำขอที่รอส่ง
  const inflight = new Set(), failedAt = new Map();
  const MAX = 64, RETRY_MS = 8000;
  let seeded = false, timer = null, pendingRender = false, ptrDown = false, busy = 0, chip = null, lastErr = "", warned = false;

  /* ---- ค่าพิเศษ ---- */
  const PCT0 = -1e6, INV0 = -2e6;
  const isMean = x => !!(x && typeof x === "object" && x.__mean);
  const meanTok = (k, v) => Object.assign(new Number(v), { __mean: k });
  const isPctTok = x => typeof x === "number" && x <= PCT0 + 1e-6 && x >= INV0 - 2000;
  const promoAtPct = dp => PCT0 - Math.round(clamp(+dp, 0, 100) * 10);
  const promoInv = p => INV0 - Math.round(clamp(+p, 0, 100) * 10);
  const fx = x => (+x).toFixed(10);
  const okNum = x => !isMean(x) && x !== undefined && x !== null && x !== "" && isFinite(+x) && !isPctTok(+x);

  const pKey = p => isMean(p) ? "mean" : isPctTok(p) ? "tok:" + p : fx(p);
  const vKey = x => isMean(x) ? "mean" : (x === undefined || x === null || x === "") ? "-" : fx(x);
  const fpKey = (fam, pol) => vKey(fam) + "/" + (pol ? 1 : 0);
  const aKey = (fam, pol, fem) => fpKey(fam, pol) + "/" + vKey(fem);

  /* ---- ดัชนีบริษัท: ค่าป้อนที่เก็บไว้ → บริษัท (ทางเดียวที่ค่าป้อนจะไปถึงเซิร์ฟเวอร์ได้) ---- */
  let IDX = null;
  function idx() {
    if (IDX) return IDX;
    IDX = { byP: new Map(), byFP: new Map() };
    const push = (m, k, c) => { if (!m.has(k)) m.set(k, []); m.get(k).push(c); };
    DATA.comps.forEach(c => { if (!(OIS.co || {})[c.t] || !okNum(c.promo) || !okNum(c.fem)) return;
      push(IDX.byP, pKey(c.promo), c); push(IDX.byFP, fpKey(c.fam, c.pol), c); });
    return IDX;
  }
  const pref = list => { if (!list || !list.length) return null;
    const t = typeof S !== "undefined" && S ? S.t : null; return list.find(c => c.t === t) || list[0]; };
  /** สัดส่วนกรรมการหญิง → {k, b} บนกริดที่เซิร์ฟเวอร์รับ (b 5–25) หรือ null */
  function femGrid(fem, b0) {
    if (!okNum(fem)) return null;
    const f = +fem; if (f < 0 || f > 1) return null;
    const bs = [Math.round(+b0 || 0)].filter(b => b >= 5 && b <= 25);
    for (let b = 5; b <= 25; b++) bs.push(b);
    for (const b of bs) { const k = Math.round(f * b); if (Math.abs(k / b - f) < 1e-9) return { k, b }; }
    return null;
  }
  const tenGrid = t => okNum(t) ? clamp(Math.round(+t * 2) / 2, 0, 40) : null;
  /** คำขอของคู่ (บริษัท c, fem, ten) → คำอธิบายคำขอ หรือ null เมื่อไม่มีทางไปเซิร์ฟเวอร์ */
  function reqOf(c, fem, ten, full) {
    if (!c || !okNum(fem)) return null;
    const own = fx(fem) === fx(c.fem), g = own ? null : femGrid(fem, c.bsize);
    if (!own && !g) return null;
    const d = { t: c.t, pk: pKey(c.promo), ak: aKey(c.fam, c.pol, fem), ind: c.ind };
    if (g) { d.fc = g.k; d.bs = g.b; }
    if (full) {
      const tv = ten === undefined || ten === null ? c.ten : ten, tg = tenGrid(tv);
      if (tg === null && okNum(c.ten)) return null;
      d.full = 1; d.tk = vKey(tv);
      if (!(okNum(c.ten) && fx(tv) === fx(c.ten))) d.ten = tg;
    }
    return d;
  }
  const sKey = d => "s|" + d.pk + "|" + d.ak;
  const fKey = d => "f|" + d.pk + "|" + d.ak + "|" + d.tk;

  /* ---- ทะเบียนค่าตัวแทน ---- */
  let sid = 0;
  const AREG = new Map(), AVAL = new Map(), CREG = new Map(), CVAL = new Map(), BREG = new Map(), AKV = new Map();
  const surr = (pct, z, sg) => { let b = Math.round((pct - z) * 10) / 10; if (sg > 0 && b <= 0) b = .05; if (sg < 0 && b >= 0) b = -.05; return b + sg * (++sid) * 1e-9; };
  function regA(ak, r, real) {
    const o = AREG.get(ak); if (o && o.real && !real) return o;
    if (o && o.ap === r.ap && o.asg === r.asg) { o.real = o.real || real; return o; }
    const e = { ak, ap: r.ap, asg: r.asg, real, s: surr(r.ap, ZA, r.asg) };
    AREG.set(ak, e); AVAL.set(e.s, ak); return e;
  }
  function regC(pk, r, real) {
    const o = CREG.get(pk); if (o && o.real && !real) return o;
    if (o && o.dp === r.dp && o.csg === r.csg) { o.real = o.real || real; return o; }
    const e = { pk, dp: r.dp, csg: r.csg, real, s: surr(r.dp, ZP, r.csg) };
    CREG.set(pk, e); CVAL.set(e.s, pk); return e;
  }

  /* ---- ผลลัพธ์ → แคช · เครื่องหมายอ่านจาก quadrant (ค่าที่หน้าจอแสดงอยู่แล้ว — เซิร์ฟเวอร์ไม่ส่ง csg/asg) ---- */
  const asgOf = q => "AD".includes(q) ? 1 : -1, csgOf = q => "AB".includes(q) ? 1 : -1;
  const CLIP = new Map();
  function fill(d, r) {
    if (!r || r.ois === undefined) return;
    const s = d.pk + "|" + d.ak;
    R.set("a|" + d.ak, { ap: r.ap, asg: asgOf(r.quad) }); regA(d.ak, R.get("a|" + d.ak), true);
    if (!R.has("c|" + d.pk)) { R.set("c|" + d.pk, { dp: r.dp, csg: csgOf(r.quad) }); regC(d.pk, R.get("c|" + d.pk), true); }
    R.set("s|" + s, { ois: r.ois, ipi: r.ipi, tier: r.tier, quad: r.quad, t1: r.t1 });
    if (d.ind !== undefined && r.oisInd !== undefined) R.set("i|" + s + "|" + d.ind, { oisInd: r.oisInd, iip: r.iip });
    if (r.band) R.set("b|" + s, { band: r.band });
    if (r.full && d.tk) R.set("f|" + s + "|" + d.tk, r.full);
  }
  /** ค่าตั้งต้นจากไฟล์ (196 บริษัท) — หน้าแรกแสดงผลได้ทันทีโดยไม่ต้องรอเซิร์ฟเวอร์ */
  function seed() {
    if (seeded) return; seeded = true;
    DATA.comps.forEach(c => {
      const o = (OIS.co || {})[c.t]; if (!o || !okNum(c.promo) || !okNum(c.fem)) return;
      const d = { pk: pKey(c.promo), ak: aKey(c.fam, c.pol, c.fem), ind: c.ind, tk: vKey(c.ten) };
      AKV.set(d.ak, { fam: c.fam, pol: c.pol, fem: c.fem });
      fill(d, o);
      const cl = o.clip || [];
      CLIP.set("P|" + d.pk, cl.includes("P")); CLIP.set("F|" + vKey(c.fam), cl.includes("F")); CLIP.set("W|" + vKey(c.fem), cl.includes("W"));
    });
  }

  /* ---- คิดค่าชั่วคราวจากผลที่ใกล้ที่สุด (เลื่อนตัวเลื่อนแล้วตัวเลขไม่กระโดด) ---- */
  const nums = k => k.split(/[|/]/).map(x => x === "mean" || x === "-" ? 0 : x.startsWith("tok:") ? -1 : +x);
  function nearest(prefix, key) {
    const v = nums(key); let best, bd = Infinity;
    R.forEach((val, k) => {
      if (!k.startsWith(prefix)) return;
      const u = nums(k.slice(prefix.length)); if (u.length !== v.length) return;
      let dd = 0; for (let i = 0; i < v.length; i++) dd += Math.abs((u[i] || 0) - (v[i] || 0)) || 0;
      if (dd < bd) { bd = dd; best = val; }
    });
    return best;
  }

  /* ---- คิวและการส่ง ---- */
  const blocked = k => { const t = failedAt.get(k); return t && Date.now() - t < RETRY_MS; };
  function want(key, d) {
    if (R.has(key)) return R.get(key);
    if (d && !inflight.has(key) && !Q.has(key) && !blocked(key)) { Q.set(key, Object.assign({ key }, d)); schedule(); showChip(); }
    return undefined;
  }
  function schedule() { if (!timer) timer = setTimeout(flush, 50); }
  /** คำขอที่ส่งจริง — เฉพาะ 5 คีย์ที่ /api/score รับ */
  function wire(d) {
    const it = { ticker: d.t };
    if (d.fc !== undefined) { it.fem_count = d.fc; it.bsize = d.bs; }
    if (d.full) { it.variant = "full"; if (d.ten !== undefined && d.ten !== null) it.ten = d.ten; }
    return it;
  }
  async function post(url, body) {
    const r = await fetch(url, { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) { location.href = "/login"; throw new Error("ต้องเข้าสู่ระบบใหม่"); }
    if (!r.ok) { let m = ""; try { m = (await r.json()).error || ""; } catch (e) { }
      throw new Error(m || (r.status === 429 ? "เรียกบ่อยเกินไป — รอสักครู่" : "เซิร์ฟเวอร์ตอบ " + r.status)); }
    return r.json();
  }
  async function flush() {
    timer = null;
    let all = [...Q.values()]; Q.clear();
    const ods = all.filter(d => d.od); all = all.filter(d => !d.od);
    // คำขอ full ของคู่เดียวกันให้ผล eg ด้วย — ตัดคำขอ eg ที่ซ้ำ
    const fullPairs = new Set(all.filter(d => d.full).map(d => d.pk + "|" + d.ak));
    all = all.filter(d => d.full || !fullPairs.has(d.pk + "|" + d.ak));
    if (!all.length && !ods.length) return;
    let fresh = 0;
    busy++; showChip();
    const jobs = [];
    for (let i = 0; i < all.length; i += MAX) jobs.push(all.slice(i, i + MAX));
    const run = async (chunk, go) => {
      chunk.forEach(d => inflight.add(d.key));
      try { await go(); lastErr = ""; }
      catch (e) {
        lastErr = String(e.message || e);
        chunk.forEach(d => failedAt.set(d.key, Date.now()));
        setTimeout(() => rerender(), RETRY_MS + 50);       // ลองใหม่อัตโนมัติเมื่อพ้นช่วงพัก
      } finally { chunk.forEach(d => inflight.delete(d.key)); }
    };
    await Promise.all(jobs.map(chunk => run(chunk, async () => {
      const res = await post("/api/score", { items: chunk.map(wire) });
      chunk.forEach((d, i) => { fill(d, res.items[i]); if (!R.has(d.key)) R.set(d.key, null); fresh++; });
    })).concat(ods.map(d => run([d], async () => { R.set(d.key, await post("/api/outdomain", d.od)); fresh++; }))));
    busy--;
    if (fresh) rerender();
    showChip();
  }

  /* render ใหม่โดยไม่ขัดจังหวะผู้ใช้: กำลังพิมพ์ → รอ blur/change · กำลังลากตัวเลื่อน → รอปล่อยเมาส์ */
  const isTyping = el => el && (el.isContentEditable || el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && !/^(range|checkbox|radio|button|submit|reset|color|file)$/i.test(el.type)));
  function rerender() {
    const el = document.activeElement;
    if (isTyping(el) || (ptrDown && el && el.type === "range")) {
      if (!pendingRender) {
        pendingRender = true;
        const go = () => { pendingRender = false; document.removeEventListener("focusout", go, true);
          document.removeEventListener("pointerup", go, true); setTimeout(rerender, 0); };
        document.addEventListener(isTyping(el) ? "focusout" : "pointerup", go, true);
      }
      return;
    }
    const sel = el && el !== document.body ? (el.id ? "#" + CSS.escape(el.id)
      : el.dataset && el.dataset.wi ? `[data-wi="${CSS.escape(el.dataset.wi)}"]` : null) : null;
    if (typeof render === "function" && typeof S !== "undefined" && S.user) render();
    if (sel) { const n = document.querySelector(sel); if (n && n !== document.activeElement) try { n.focus({ preventScroll: true }); } catch (e) { } }
  }
  document.addEventListener("pointerdown", () => ptrDown = true, true);
  document.addEventListener("pointerup", () => ptrDown = false, true);

  function showChip() {
    const on = busy > 0 || Q.size > 0 || !!lastErr;
    if (!chip) {
      if (!on || !document.body) return;
      chip = document.createElement("div");
      chip.setAttribute("role", "status");
      chip.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9999;padding:6px 12px;border-radius:999px;" +
        "font:12px/1.4 Sarabun,system-ui,sans-serif;background:var(--card,#fff);color:var(--ink-2,#445);" +
        "border:1px solid var(--line,#d5dbe5);box-shadow:0 2px 10px rgba(0,0,0,.08);pointer-events:none;transition:opacity .2s";
      document.body.appendChild(chip);
    }
    chip.textContent = lastErr ? "คำนวณบนเซิร์ฟเวอร์ไม่สำเร็จ: " + lastErr : "กำลังคำนวณบนเซิร์ฟเวอร์…";
    chip.style.opacity = on ? "1" : "0";
  }

  /* ---- ชั้นโมเดล (synchronous) ---- */
  /** คู่ (promo key, board key) → บริษัทที่ค่าป้อนตรง (S.t ก่อน) */
  function pairCo(pk, ak) {
    const v = AKV.get(ak); if (!v) return null;
    const fp = fpKey(v.fam, v.pol);
    return pref((idx().byP.get(pk) || []).filter(c => fpKey(c.fam, c.pol) === fp));
  }
  function ampEntry(fam, pol, fem) {
    seed();
    const ak = aKey(fam, pol, fem);
    if (R.get("a|" + ak)) return regA(ak, R.get("a|" + ak), true);
    const c = pref(idx().byFP.get(fpKey(fam, pol))), d = reqOf(c, fem);
    if (!d) return null;                                     // ไม่มีทางไปเซิร์ฟเวอร์ (fam/pol ไม่ตรงบริษัทใด หรือ fem นอกกริด)
    AKV.set(ak, { fam, pol, fem });
    want(sKey(d), d);
    if (R.get("a|" + ak)) return regA(ak, R.get("a|" + ak), true);
    const e = AREG.get(ak); if (e) return e;
    return regA(ak, nearest("a|", ak) || { ap: 50, asg: 1 }, false);
  }
  function cpEntry(promo) {
    seed();
    const r = R.get("c|" + pKey(promo));
    return r ? regC(pKey(promo), r, true) : null;            // CEO Promotion Focus ปรับไม่ได้ในโหมดเซิร์ฟเวอร์ — เฉพาะค่าของบริษัท
  }
  const ampOf = (fam, pol, fem) => { const e = okNum(fem) ? ampEntry(fam, pol, fem) : null; return e ? e.s : NaN; };
  const cpOf = promo => { const e = cpEntry(promo); return e ? e.s : NaN; };
  /** B ตัวแทน = cP ตัวแทน × amp ตัวแทน — จดคู่ค่าป้อนไว้ให้ oisOf ถอดกลับ */
  function signalB(promo, a) {
    const c = cpOf(promo), b = c * a;
    if (isFinite(b)) BREG.set(b, [CVAL.get(c), AVAL.get(a)]);
    return b;
  }
  /** ถอด B ตัวแทนกลับเป็นคู่ (promo, บอร์ด) — รองรับทั้งค่าที่มาจาก signalB และ c.cP * c.amp ที่คูณเอง */
  function decode(b) {
    if (BREG.has(b)) return BREG.get(b);
    if (!isFinite(b)) return null;
    for (const [cs, pk] of CVAL) {
      if (!cs) continue;
      const guess = b / cs;
      for (const g of [guess, guess * (1 + 1e-15), guess * (1 - 1e-15)]) {
        const ak = AVAL.get(g);
        if (ak && cs * g === b) { BREG.set(b, [pk, ak]); return [pk, ak]; }
      }
      for (const [as, ak] of AVAL) if (cs * as === b) { BREG.set(b, [pk, ak]); return [pk, ak]; }
    }
    BREG.set(b, null);
    if (!warned) { warned = true; console.warn("OIS_REMOTE: oisOf() ได้ค่า B ที่ไม่ได้มาจาก signalB/ampOf/cpOf — ฉบับเซิร์ฟเวอร์คืน NaN (ใช้ OIS_REMOTE.scoreOf แทน)"); }
    return null;
  }
  /** ปรับค่า 1 ตำแหน่งให้ Math.round() = ipi และ tierOf() = tier ของเซิร์ฟเวอร์ (ค่าที่ปัดแล้วคร่อมเส้น .5 / เส้น tier) */
  function fitO(o, ipi, tier) {
    let v = o;
    if (ipi !== undefined && Math.round(v) !== ipi) v = ipi > v ? ipi - .5 : v - .01;
    if (tier !== undefined && typeof tierOf === "function" && tierOf(v) !== tier) v -= .001;
    return v;
  }
  /** ผล eg ของคู่ (pk, ak) — แคช / คำขอใหม่ / ค่าชั่วคราว · null = ไม่มีทางไปเซิร์ฟเวอร์ */
  function scorePair(pk, ak, full, ten) {
    seed();
    const s = pk + "|" + ak;
    if (!full && R.get("s|" + s)) return { r: R.get("s|" + s), d: null };
    const c = pairCo(pk, ak), v = AKV.get(ak), d = c && v ? reqOf(c, v.fem, ten, full) : null;
    if (!d) return null;
    const k = full ? fKey(d) : sKey(d);
    const r = want(k, d);
    return { r: r || (full ? nearest("f|", s + "|" + d.tk) : nearest("s|", s)), d };
  }
  function oisOf(b) {
    const d = decode(b); if (!d || !d[0] || !d[1]) return NaN;
    const p = scorePair(d[0], d[1]), r = p && p.r; return r ? fitO(r.ois, r.ipi, r.tier) : NaN;
  }
  function oisIndOf(b, ind) {
    const d = decode(b); if (!d || !d[0] || !d[1]) return NaN;
    const s = d[0] + "|" + d[1], k = "i|" + s + "|" + ind;
    if (R.get(k)) return fitO(R.get(k).oisInd, R.get(k).iip);
    const c = pairCo(d[0], d[1]); if (!c || String(c.ind) !== String(ind)) return NaN;   // ข้ามอุตสาหกรรมไม่มีทางไปเซิร์ฟเวอร์
    scorePair(d[0], d[1]);
    const r = R.get(k) || nearest("i|", s + "|" + ind);
    return r ? fitO(r.oisInd, r.iip) : NaN;
  }
  function band90(promo, fam, pol, fem) {
    seed();
    const pk = pKey(promo), ak = aKey(fam, pol, fem), s = pk + "|" + ak;
    if (R.get("b|" + s)) return R.get("b|" + s).band.slice();
    if (!AKV.has(ak) && okNum(fem)) AKV.set(ak, { fam, pol, fem });
    const p = scorePair(pk, ak); if (!p) return [NaN, NaN];
    const r = R.get("b|" + s) || nearest("b|", s);
    return r && r.band ? r.band.slice() : [NaN, NaN];
  }
  /** ผลรวมของค่าป้อนชุดหนึ่ง (ทางเลือกที่ไม่ต้องผ่าน signalB) → { ois, ipi, tier, quad, ap, dp, t1, band?, oisInd?, real } หรือ null */
  function scoreOf(promo, fam, pol, fem, opt) {
    opt = opt || {};
    const a = okNum(fem) ? ampEntry(fam, pol, fem) : null, c = cpEntry(promo); if (!a || !c) return null;
    const p = scorePair(c.pk, a.ak), r = p && p.r; if (!r) return null;
    const out = Object.assign({}, r, { ois: fitO(r.ois, r.ipi, r.tier), ap: a.ap, dp: c.dp, real: !!R.get("s|" + c.pk + "|" + a.ak) });
    if (opt.ind !== undefined) out.oisInd = oisIndOf(c.s * a.s, opt.ind);
    if (opt.band) out.band = band90(promo, fam, pol, fem);
    return out;
  }
  /** B_FULL (อายุงานเข้าสูตร) — การวิเคราะห์ความไวเท่านั้น · ten ปัดทีละ 0.5 ปี (0–40) */
  function fullOf(promo, fam, pol, fem, ten) {
    if (!okNum(fem) || !okNum(ten)) return null;
    const a = ampEntry(fam, pol, fem), c = cpEntry(promo); if (!a || !c) return null;
    const k = "f|" + c.pk + "|" + a.ak + "|" + vKey(ten);
    let r = R.get(k);
    if (!r) { const p = scorePair(c.pk, a.ak, true, ten); r = p && p.r; }
    return r ? { ois: fitO(r.ois, r.ipi, r.tier), ipi: r.ipi, tier: r.tier, real: !!R.get(k) } : null;
  }
  function t1Of(promo, fam, pol, fem) {
    const a = okNum(fem) ? ampEntry(fam, pol, fem) : null, c = cpEntry(promo);
    const p = a && c ? scorePair(c.pk, a.ak) : null, r = p && p.r;
    return r && r.t1 ? { B: NaN, ois: r.t1.ois, tier: r.t1.tier, quad: r.t1.quad } : { B: NaN, ois: NaN, tier: 4, quad: "C" };
  }
  /** เปอร์เซ็นไทล์ amp: ค่าตัวแทนที่ลงทะเบียนแล้ว → ap จากเซิร์ฟเวอร์ · ค่าบนสเกลจุดพื้นหลัง (เช่นมัธยฐาน) → ค่า + zA */
  function ampPct(a) {
    const ak = AVAL.get(a); if (ak) return AREG.get(ak).ap;
    return isFinite(a) ? clamp(Math.round((a + ZA) * 10) / 10, 0, 100) : NaN;
  }
  function promoPct(p) { const e = cpEntry(p); return e ? e.dp : NaN; }
  /** clip (C5) — ป้ายของค่าที่เก็บไว้ของบริษัท (จากไฟล์) · ค่าที่จำลองใหม่ไม่มีธง clip จากเซิร์ฟเวอร์ (ภาคผนวก ง ใหม่-2) */
  function clipped(x, k) {
    if (!okNum(x)) return false;
    seed();
    return !!CLIP.get((k === "P" ? "P|" + pKey(x) : k + "|" + vKey(x)));
  }
  /** โหมดนอกกลุ่มอ้างอิง → POST /api/outdomain {fem_count, fam_count, bsize} (จำนวนคน) · คืน {femP, famP} หรือ null ระหว่างรอ */
  function od(o) {
    const bs = Math.round(clamp(+o.bsize || 1, 1, 30)), fc = Math.round(clamp(+o.fem_count || 0, 0, bs)), mc = Math.round(clamp(+o.fam_count || 0, 0, bs));
    const k = `o|${fc}|${mc}|${bs}`;
    return want(k, { od: { fem_count: fc, fam_count: mc, bsize: bs } }) || null;
  }
  /** ค่าป้อนนี้คำนวณบนเซิร์ฟเวอร์ได้หรือไม่ (ใช้แสดงป้าย "—" / ข้อความอธิบายแทนตัวเลข) */
  function canScore(promo, fam, pol, fem) {
    seed(); if (!cpEntry(promo) || !okNum(fem)) return false;
    const ak = aKey(fam, pol, fem); if (R.get("s|" + pKey(promo) + "|" + ak)) return true;
    const c = pref((idx().byP.get(pKey(promo)) || []).filter(x => fpKey(x.fam, x.pol) === fpKey(fam, pol)));
    return !!reqOf(c, fem);
  }
  /* OPAR ในโหมดเซิร์ฟเวอร์: ไม่มีสัมประสิทธิ์ — โค้ดที่หารด้วย OPAR.dW ได้ NaN (หน้าจอแสดง "—") */
  const par = { b1: NaN, dF: NaN, dG: NaN, dW: NaN, dT: NaN, gT: 0 };
  /** OM ฉบับเซิร์ฟเวอร์ — ป้ายค่าเฉลี่ย (ไม่ใช่ตัวเลขของบันทึกพารามิเตอร์) · OM.P มีค่าเท่ากับ zP เพื่อวาดเส้นแบ่งบนสเกลเปอร์เซ็นไทล์ */
  const mean = { P: meanTok("P", ZP), F: meanTok("F", NaN), G: meanTok("G", NaN), W: meanTok("W", NaN), T: meanTok("T", NaN) };
  return { ampOf, cpOf, signalB, oisOf, oisIndOf, band90, scoreOf, fullOf, t1Of, ampPct, promoPct, clipped, od, canScore,
    femGrid, tenGrid, promoAtPct, promoInv, isPctTok, isMean, par, mean, zA: ZA, zP: ZP, firm: t => (OIS.co || {})[t] || null,
    stats: () => ({ cache: R.size, amp: AREG.size, cp: CREG.size, queued: Q.size }) };
})();

/* ---- window.OIS_API — จุดเชื่อม AI (Claude / OpenAI) และ OCR ฝั่งเซิร์ฟเวอร์ ----
   ทุกฟังก์ชันคืน Promise; ฟีเจอร์ที่เจ้าของระบบยังไม่ตั้ง API key บน Render จะคืน { enabled:false, reason } */
window.OIS_API = (() => {
  async function call(url, opt) {
    const r = await fetch(url, Object.assign({ credentials: "same-origin" }, opt));
    if (r.status === 401) { location.href = "/login"; return { enabled: false, reason: "ต้องเข้าสู่ระบบใหม่" }; }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok) return Object.assign({ ok: false, status: r.status }, j || { reason: "เซิร์ฟเวอร์ตอบ " + r.status });
    return Object.assign({ ok: true }, j);
  }
  return {
    server: true,
    /** task เช่น "board_brief" | "explain_score" | "whatif_summary" | "draft_directive" · payload = ผลลัพธ์ (ไม่ใช่สูตร) */
    llm: (task, payload) => call("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }) }),
    /** file = File/Blob ของ PDF (เช่น แบบ 56-1 One Report) → { ok, text } */
    ocr: file => { const f = new FormData(); f.append("file", file, file.name || "upload.pdf");
      return call("/api/ocr", { method: "POST", body: f }); },
    /** provider (ไม่บังคับ) = "anthropic" | "openai" — ถ้าเจ้านั้นไม่มี key เซิร์ฟเวอร์ใช้เจ้าที่มีแทน (ดู res.provider) */
    llmWith: (task, payload, provider) => call("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload, provider }) }),
    /** { llm, anthropic, openai, providers[], ocr, google, db, admin } */
    integrations: () => call("/api/integrations"),
    /* ---- ฐานข้อมูลกลาง: เก็บคำตอบของผู้ทดสอบ (40 คน) ไว้ที่เซิร์ฟเวอร์ แทน localStorage ของแต่ละเครื่อง ----
       kind: "survey" | "rfq" | "bodset" | "bod_oi" | "approval" | "dict" (meta เท่านั้น ไม่ส่งรายการคำ) | "feedback"
       payload ≤ 64 KB · คืน { ok, id } หรือ { ok:false, status, error } */
    /* รับได้ทั้ง submit(kind, payload, ticker) และ submit({ kind, ticker, payload }) */
    submit: (kind, payload, ticker) => (kind && typeof kind === "object" ? (payload = kind.payload, ticker = kind.ticker, kind = kind.kind) : 0, call("/api/responses", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload, ticker: ticker || null,
        client_id: (() => { try { let k = localStorage.getItem("ois_cid");
          if (!k) { k = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 40); localStorage.setItem("ois_cid", k); }
          return k; } catch (e) { return null; } })() }) })),
    /** รายการที่ผู้ใช้คนนี้ส่งไว้ (ล่าสุดก่อน) → { ok, items:[{id, kind, ticker, payload, created}] } */
    mine: kind => call("/api/responses/mine" + (kind ? "?kind=" + encodeURIComponent(kind) : "")),
    /** { email, name, role: "admin"|"user", provider: "google"|"password", plan: "free"|"pro"|"max", record }
        plan = แผนที่ผู้ดูแลตั้งไว้บนเซิร์ฟเวอร์ (แหล่งจริงของสิทธิ์ในโหมดเซิร์ฟเวอร์ — ป้ายบนหน้าจอ free = "Basic") */
    me: () => call("/api/me"),
    /* admin({ kind }) → { items:[{payload,…}], n } (เฉพาะผู้ดูแล) · admin.summary() / users() / exportUrl() / backupUrl() */
    admin: Object.assign(opts => call("/api/admin/responses?format=json" +
        (opts && opts.kind ? "&kind=" + encodeURIComponent(opts.kind) : "")), {
      /** จำนวนคำตอบต่อ kind / ผู้ใช้ / 7 วันล่าสุด (เฉพาะผู้ดูแล — คนอื่นได้ { ok:false, status:403 }) */
      summary: () => call("/api/admin/summary"),
      users: () => call("/api/admin/users"),
      /** URL สำหรับลิงก์ดาวน์โหลด (CSV เปิดใน Excel ภาษาไทยได้ · json) — ใช้กับ <a href> หรือ location.href */
      exportUrl: (kind, fmt) => "/api/admin/responses?format=" + encodeURIComponent(fmt || "csv") +
        (kind ? "&kind=" + encodeURIComponent(kind) : ""),
      backupUrl: () => "/api/admin/backup",
      /** ตรวจการคำนวณรายบริษัท ทีละขั้นพร้อมค่าในบันทึกพารามิเตอร์ (ผู้ดูแลเท่านั้น · บันทึกใน audit log) */
      trace: ticker => call("/api/admin/trace/" + encodeURIComponent(ticker)),
      /** แผนของผู้ใช้: plan(id) อ่าน · plan(id, "free"|"pro"|"max") ตั้ง */
      plan: (id, plan) => plan ? call(`/api/admin/users/${+id}/plan`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }) }) : call(`/api/admin/users/${+id}/plan`),
    }),
    logout: () => { location.href = "/logout"; },
    /* AI Report Studio (server/report_api.py) — body = { template_id, payload, lang?, tone?, overrides?, section? }
       templates() → ทะเบียน + สถานะ AI · preview(body) → คำสั่งฉบับเต็ม (ไม่เรียก AI) · generate(body) → { sections, warnings, usage, model } */
    report: {
      templates: () => call("/api/report/templates"),
      preview: body => call("/api/report/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      generate: body => call("/api/report/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    },
  };
})();

/* ---- OIS_API.data — ข้อมูลหลายปี · อนุมัติโดยผู้ดูแล · validity คำนวณใหม่ (ใช้โดย v2_data.js · server/data_api.py) ----
   ข้อมูลที่ยังไม่อนุมัติเห็นเฉพาะเจ้าของ · ทุกฟังก์ชันคืน Promise ของ { ok, … } หรือ { ok:false, status, error } */
window.OIS_API.data = (() => {
  async function call(url, opt) {
    const r = await fetch(url, Object.assign({ credentials: "same-origin" }, opt));
    if (r.status === 401) { location.href = "/login"; return { ok: false, status: 401, error: "ต้องเข้าสู่ระบบใหม่" }; }
    let j = null; try { j = await r.json(); } catch (e) { }
    return Object.assign({ ok: r.ok, status: r.status }, j || (r.ok ? {} : { error: "เซิร์ฟเวอร์ตอบ " + r.status }));
  }
  const post = (url, body) => call(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  return {
    submit: rec => post("/api/data/records", rec),
    mine: () => call("/api/data/records?mine=1"),
    list: ticker => call("/api/data/records" + (ticker ? "?ticker=" + encodeURIComponent(ticker) : "")),
    withdraw: id => post(`/api/data/records/${+id}/withdraw`),
    pending: () => call("/api/data/pending"),
    approve: (id, comment) => post(`/api/data/records/${+id}/approve`, { comment }),
    reject: (id, comment) => post(`/api/data/records/${+id}/reject`, { comment }),
    log: () => call("/api/data/log"),
    history: ticker => call("/api/data/history?ticker=" + encodeURIComponent(ticker)),
    validity: () => call("/api/data/validity"),
    referenceStatus: () => call("/api/data/reference"),
    uploadReference: file => { const f = new FormData(); f.append("file", file, file.name || "REF928_scored.csv"); return call("/api/data/reference", { method: "POST", body: f }); },
    refreezeList: () => call("/api/data/refreeze"),
    refreeze: comment => post("/api/data/refreeze", { comment }),
  };
})();
