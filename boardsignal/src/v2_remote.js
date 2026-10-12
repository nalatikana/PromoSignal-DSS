/* ============================================================================
   OpenInnoScore — ตัวเชื่อมโหมดเซิร์ฟเวอร์ (ฝังเฉพาะไฟล์ OpenInnoScore_server.html)
   ในโหมดนี้ OIS ไม่มี par / chol — ค่า amp, amp T1 และช่วง 90% มาจาก /api/amp และ /api/band
   ฟังก์ชันของโมเดลยังถูกเรียกแบบ synchronous ระหว่าง render จึงใช้แคช:
     · มีในแคช → คืนค่าทันที
     · ไม่มี   → คืนค่าชั่วคราว (ค่าจากแคชที่ค่าป้อนใกล้ที่สุด) + เข้าคิว → ส่งเป็นชุดหลัง 50 ms
                → ได้ผลแล้ว render() ใหม่หนึ่งครั้ง
   ไฟล์นี้ถูกต่อไว้หน้า v2_app.js ในสคริปต์เดียวกัน: ฟังก์ชัน wins/OCUT ถูกเรียกตอนใช้งานเท่านั้น
   ============================================================================ */
const OIS_REMOTE = (() => {
  const amp = new Map(), t1 = new Map(), band = new Map();
  const qAmp = new Map(), qBand = new Map();          // key → item ที่รอส่ง
  const inflight = new Set(), failedAt = new Map();
  const MAX = 64, RETRY_MS = 8000;
  let seeded = false, timer = null, pendingRender = false, ptrDown = false, busy = 0, chip = null, lastErr = "";

  const fx = x => (+x).toFixed(10);
  const ok = (...a) => a.every(x => typeof x === "number" ? isFinite(x) : x !== undefined && x !== null && !isNaN(+x));
  const kAmp = (fam, pol, fem) => fx(wins(+fam, "F")) + "|" + (pol ? 1 : 0) + "|" + fx(wins(+fem, "W"));
  const kT1 = fem => fx(wins(+fem, "W"));
  const kBand = (promo, fam, pol, fem) => fx(wins(+promo, "P")) + "|" + kAmp(fam, pol, fem);
  const num = k => k.split("|").map(Number);

  function seed() {
    if (seeded) return; seeded = true;
    const sv = OIS.sv || {};
    DATA.comps.forEach(c => {
      const s = sv[c.t]; if (!s) return;
      amp.set(kAmp(c.fam, c.pol, c.fem), s[0]);
      t1.set(kT1(c.fem), s[1]);
      band.set(kBand(c.promo, c.fam, c.pol, c.fem), [s[2], s[3]]);
    });
  }
  /** ค่าชั่วคราวระหว่างรอเซิร์ฟเวอร์ = ค่าในแคชที่ค่าป้อนใกล้ที่สุด (เลื่อนตัวเลื่อนแล้วตัวเลขไม่กระโดด) */
  function nearest(map, key, w) {
    const v = num(key); let best, bd = Infinity;
    map.forEach((val, k) => {
      const u = num(k); let d = 0;
      for (let i = 0; i < v.length; i++) d += Math.abs(u[i] - v[i]) * (w[i] || 1);
      if (d < bd) { bd = d; best = val; }
    });
    return best;
  }
  const medAmp = () => REF_AMP[REF_AMP.length >> 1];
  const blocked = k => { const t = failedAt.get(k); return t && Date.now() - t < RETRY_MS; };

  function enqueue(map, key, item) {
    if (inflight.has(key) || map.has(key) || blocked(key)) return;
    map.set(key, item); schedule(); showChip();
  }
  function schedule() { if (!timer) timer = setTimeout(flush, 50); }

  async function post(url, body) {
    const r = await fetch(url, { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) { location.href = "/login"; throw new Error("ต้องเข้าสู่ระบบใหม่"); }
    if (!r.ok) throw new Error(r.status === 429 ? "เรียกบ่อยเกินไป — รอสักครู่" : "เซิร์ฟเวอร์ตอบ " + r.status);
    return r.json();
  }
  async function flush() {
    timer = null;
    const jobs = [];
    const a = [...qAmp.entries()]; qAmp.clear();
    const b = [...qBand.entries()]; qBand.clear();
    for (let i = 0; i < a.length; i += MAX) jobs.push(["amp", a.slice(i, i + MAX)]);
    for (let i = 0; i < b.length; i += MAX) jobs.push(["band", b.slice(i, i + MAX)]);
    if (!jobs.length) return;
    let fresh = 0;
    busy++; showChip();
    await Promise.all(jobs.map(async ([kind, chunk]) => {
      chunk.forEach(([k]) => inflight.add(k));
      try {
        if (kind === "amp") {
          const res = await post("/api/amp", { items: chunk.map(([, it]) => it) });
          chunk.forEach(([k, it], i) => {
            if (it.t1only) { if (!t1.has(it.k1)) fresh++; t1.set(it.k1, res.ampT1[i]); return; }
            if (!amp.has(k)) fresh++;
            amp.set(k, res.amp[i]);
            const k1 = kT1(it.fem); if (!t1.has(k1)) { t1.set(k1, res.ampT1[i]); fresh++; }
          });
        } else {
          const res = await post("/api/band", { items: chunk.map(([, it]) => it) });
          chunk.forEach(([k], i) => { if (!band.has(k)) fresh++; band.set(k, res.band[i]); });
        }
        lastErr = "";
      } catch (e) {
        lastErr = String(e.message || e);
        chunk.forEach(([k]) => failedAt.set(k, Date.now()));
        setTimeout(() => rerender(), RETRY_MS + 50);       // ลองใหม่อัตโนมัติเมื่อพ้นช่วงพัก
      } finally { chunk.forEach(([k]) => inflight.delete(k)); }
    }));
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
    if (typeof render === "function") render();
    if (sel) { const n = document.querySelector(sel); if (n && n !== document.activeElement) try { n.focus({ preventScroll: true }); } catch (e) { } }
  }
  document.addEventListener("pointerdown", () => ptrDown = true, true);
  document.addEventListener("pointerup", () => ptrDown = false, true);

  function showChip() {
    const on = busy > 0 || qAmp.size > 0 || qBand.size > 0 || !!lastErr;
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

  /* ---- API ที่ชั้นโมเดลใน v2_app.js เรียก (synchronous) ---- */
  function ampOf(fam, pol, fem) {
    if (!ok(fam, fem)) return NaN;
    seed();
    const k = kAmp(fam, pol, fem);
    if (amp.has(k)) return amp.get(k);
    enqueue(qAmp, k, { fam: +fam, pol: pol ? 1 : 0, fem: +fem });
    const v = nearest(amp, k, [1, 10, 1]);
    return v === undefined ? medAmp() : v;
  }
  function ampT1(fem) {
    if (!ok(fem)) return NaN;
    seed();
    const k = kT1(fem);
    if (t1.has(k)) return t1.get(k);
    enqueue(qAmp, "t1:" + k, { fam: 0, pol: 0, fem: +fem, t1only: true, k1: k });
    const v = nearest(t1, k, [1]);
    return v === undefined ? medAmp() : v;
  }
  function band90(promo, fam, pol, fem) {
    if (!ok(promo, fam, fem)) return [NaN, NaN];
    seed();
    const k = kBand(promo, fam, pol, fem);
    if (band.has(k)) return band.get(k).slice();
    enqueue(qBand, k, { promo: +promo, fam: +fam, pol: pol ? 1 : 0, fem: +fem });
    const v = nearest(band, k, [1, 1, 10, 1]);
    return v ? v.slice() : [0, 100];
  }
  /* OPAR ในโหมดเซิร์ฟเวอร์: ไม่มีสัมประสิทธิ์ในไฟล์ — หน้าจอที่ต้องใช้ "ความชันต่อกรรมการหญิง" (การแปลงส่วนต่าง
     เป็นจุดเปอร์เซ็นต์) ได้ค่าจากผลต่างของ amp T1 สองจุดที่เซิร์ฟเวอร์คืนมา (NaN → หน้าจอแสดง "—" ระหว่างรอ) */
  const par = {
    get dW() { const a = ampT1(.10), b = ampT1(.30), k = [kT1(.10), kT1(.30)];
      return k.every(x => t1.has(x)) ? (b - a) / .20 : NaN; },
  };
  return { ampOf, ampT1, band90, par, stats: () => ({ amp: amp.size, t1: t1.size, band: band.size }) };
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
    /** { llm, anthropic, openai, ocr } — boolean เท่านั้น */
    integrations: () => call("/api/integrations"),
    logout: () => { location.href = "/logout"; },
  };
})();
