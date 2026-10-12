/* ============================================================================
   v2_tiers.js — แก้ไขครั้งที่ 2.2
     1 สิทธิ์ 3 ระดับตามรายงานหัวข้อ 4: Level 1 Free · Level 2 Pro (Pay-Per-Use) · Level 3 Pro Max (Subscription, add-on จาก Pro)
     2 อัตราเครดิตและแพ็กเกจตามรายงานหัวข้อ 5 (การชำระเงินยังเป็นการจำลอง · เติมเครดิตด้วยมือ)
     3 ร่าง 56-1 · Template ที่ลูกค้าแก้เองได้ + ขั้นอนุมัติก่อนส่งออก (หัวข้อ 6 · 56-1 ส่วนที่ 2 ข้อ 7 และ 8)
     4 คู่มือการใช้งานในหน้าระบบ (ชิ้นงานส่งมอบข้อ 4) + ลิงก์ "?" บนหัวทุกหน้า
   ไฟล์นี้โหลดเป็นลำดับสุดท้าย — ห่อ (wrap) ฟังก์ชันของไฟล์ก่อนหน้า ไม่แก้ไฟล์ต้นทาง
   กติกา: ถ้อยคำเชิงความสัมพันธ์ · ไม่แสดงค่าสัมประสิทธิ์ · ร่าง 56-1 ไม่มีชื่อบริษัทอื่นและไม่ใช้คะแนนเป็นหลักฐานประสิทธิผลของบอร์ด
   ============================================================================ */

/* ---------------------------------------------------------------- 1 · ราคาและแพ็กเกจ (หัวข้อ 5) */
Object.assign(PRICE, { report: 1, peer: 1, studio: 1, ceotext: 1, sector: 5 });
Object.assign(PLAN_TOKENS, { free: 3, pro: 20, max: 40 });
PACKS.splice(0, PACKS.length,
  { n: 5, baht: 490, tag: "" },
  { n: 15, baht: 1290, tag: "คุ้มที่สุด" },
  { n: 40, baht: 2990, tag: "สำหรับทีมงาน" });
const SECTOR_BAHT = 990;
const TR_PLANS = [
  { k: "free", lv: "Level 1", n: "Free", sub: "ผู้ใช้งานทั่วไป / ทดลองใช้ฟรี", tok: PLAN_TOKENS.free,
    d: "ดูได้เฉพาะบริษัทตนเอง · รายงานวินิจฉัยฉบับเต็มฟรี 1 บริษัท · เมทริกซ์ 2×2 · หลักฐานความแม่นยำ · BOD Evaluation · แบบสอบถาม RFQ" },
  { k: "pro", lv: "Level 2", n: "Pro", sub: "Pay-Per-Use · คิดตามการใช้งานจริง ไม่มีค่ารายเดือน", tok: PLAN_TOKENS.pro,
    d: "ปลดล็อกรายบริษัทด้วยเครดิต · Peer 1 vs 3 · What-if 3 ตัวแปร + ตรวจภาษา CEO · อัปโหลด PDF/TXT · Top 5 อุตสาหกรรม · ร่าง 56-1" },
  { k: "max", lv: "Level 3", n: "Pro Max", sub: "Subscription · add-on จาก Pro (เหมาจ่ายองค์กร)", tok: PLAN_TOKENS.max,
    d: "ทุกบริษัท · เทียบข้ามอุตสาหกรรม · ฉากทัศน์ขาลง · ภาพรวมทั้งอุตสาหกรรม + CSV · วิเคราะห์เชิงลึก + Compliance · Email Approval" },
];
/** ตารางสิทธิ์ตามรายงานหัวข้อ 4 — แหล่งเดียวของหน้า billing และคู่มือ */
const PERM = [
  ["ดูข้อมูลบริษัท", "เฉพาะบริษัทตนเอง", "ปลดล็อกเพิ่มรายบริษัท · 1 เครดิต", "ทุกบริษัทในฐานข้อมูล"],
  ["เมทริกซ์กลยุทธ์ 2×2", "ตำแหน่งใน 4 โซน เฉพาะบริษัทตนเอง", "+ จุดอ้างอิงและเส้นทางย้ายโซน (ชั้นเสริม เปิด/ปิดได้)", "+ เปรียบเทียบอุตสาหกรรม"],
  ["รายงานวินิจฉัยบริษัท", "ฟรี 1 บริษัทแรก", "บริษัทที่ 2 ขึ้นไป · 1 เครดิต/บริษัท", "ฉบับเต็มไม่จำกัด"],
  ["Peer Benchmark", "✕", "1 vs 3 ราย ในอุตสาหกรรมเดียวกัน · 1 เครดิต", "ข้ามอุตสาหกรรม / ข้ามประเภทธุรกิจ"],
  ["What-if Studio", "✕ (ทดลอง 1 ตัวแปรเป็นตัวอย่าง)", "บอร์ด 3 ตัวแปร + ตรวจภาษา CEO · 1 เครดิต", "+ ฉากทัศน์ขาลง (Downside) · รายไตรมาส: เฟสถัดไป"],
  ["ตรวจภาษา CEO", "พิมพ์/วางข้อความเอง ≥ 2,000 คำ · แบบประเมิน RFQ (แบบวัดแยก ไม่เข้าคะแนน) · Dictionary ของผู้ใช้", "อัปโหลด PDF/TXT สแกนคำอัตโนมัติ", "+ ดึงรายงานประจำปีอัตโนมัติ (เฟสถัดไป)"],
  ["ภาพรวมอุตสาหกรรม", "✕", "Top 5 ในกลุ่มตนเอง (ทั้งกลุ่ม + CSV ปลดได้ 5 เครดิต/กลุ่ม)", "ทั้งอุตสาหกรรม + ส่งออก CSV (รวมใน Subscription)"],
  ["Agentic AI · ร่าง 56-1", "✕", "ร่างรายงานการกำกับดูแลนวัตกรรมแนบ 56-1 + Template", "+ วิเคราะห์เชิงลึก · AI Strategic Advice · ข้อสั่งการ/Compliance"],
  ["Email Approval Workflow", "✕", "✕", "ส่งขออนุมัติผู้บริหาร (จำลอง · อีเมลจริงต้องใช้เซิร์ฟเวอร์)"],
];
const TARIFF = [
  ["เมทริกซ์ 2×2 / หน้าหลักฐานความแม่นยำ / รายงานบริษัทแรก", "ฟรี", "เปิดถาวร"],
  ["รายงานบริษัทที่ 2 ขึ้นไป", "1", "ต่อ 1 บริษัท · ปลดล็อกครั้งเดียวดูได้ตลอด"],
  ["เทียบคู่แข่ง 3 ราย", "1", "เปลี่ยนคู่แข่งได้ไม่จำกัดหลังปลดล็อก"],
  ["What-if Studio", "1", "รวมการตรวจภาษา CEO"],
  ["ภาพรวมทั้งอุตสาหกรรม + ส่งออก CSV", "5", `หรือซื้อแยกรายกลุ่ม ${fmt(SECTOR_BAHT)} บาท · Pro Max รวมใน Subscription`],
];

/* ---------------------------------------------------------------- 2 · ตรรกะสิทธิ์ */
const ownInd = () => { const o = S.freeCo && byT[S.freeCo]; return o ? o.ind : cur().ind; };
/** ดูข้อมูลบริษัทนี้ได้หรือไม่ — Free เฉพาะบริษัทตนเอง · Pro ปลดรายบริษัท · Pro Max ทุกบริษัท */
function canSeeCo(t) {
  t = t || S.t; const r = tierRank();
  if (r >= 2) return true;
  if (!S.freeCo || S.freeCo === t) return true;
  return r >= 1 && !!S.unlocked[keyOf("report", t)];
}
const TR_PAID = ["report", "peer", "studio", "ceotext", "sector"];
const _trIsU = isUnlocked;
isUnlocked = function (what, t) {
  t = t || S.t; const r = tierRank();
  if (!TR_PAID.includes(what)) return _trIsU(what, t);
  if (r >= 2) return true;                                         // Pro Max · Subscription
  if (what === "report") return S.freeCo === t || (r >= 1 && !!S.unlocked[keyOf("report", t)]);
  if (r < 1) return false;                                         // Free · ✕
  if (what === "sector") return !!S.sectors[t];
  if (what === "ceotext") return !!S.unlocked[keyOf("studio", t)];
  return !!S.unlocked[keyOf(what, t)];
};
const _trSpend = spend;
spend = function (what, t, label) {
  t = t || S.t; const r = tierRank();
  if (!TR_PAID.includes(what)) return _trSpend(what, t, label);
  if (r >= 2) { toast("รวมอยู่ในสิทธิ์ Pro Max แล้ว — ไม่ใช้เครดิต"); return true; }
  if (r < 1) {
    toast("ระดับ Free ใช้เครดิตปลดล็อกไม่ได้ — เปลี่ยนเป็น Pro (Pay-Per-Use) แล้วใช้เครดิตที่มีอยู่ได้ทันที");
    go("billing"); return false;
  }
  const w = what === "ceotext" ? "studio" : what, cost = PRICE[w] || 1;
  if (S.credits < cost) { go("billing"); toast(`เครดิตไม่พอ — เหลือ ${S.credits} ต้องใช้ ${cost}`); return false; }
  S.credits -= cost;
  if (w === "sector") S.sectors[t] = true; else S.unlocked[keyOf(w, t)] = true;
  S.log.unshift({ what: w, t, cost, label: label || "", at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) });
  save(); syncChrome(); toast(`ปลดล็อกแล้ว · ใช้ ${cost} เครดิต · เหลือ ${S.credits}`);
  return true;
};
function setPlan(p) {
  if (!PLAN_RANK.hasOwnProperty(p)) return;
  const up = PLAN_RANK[p] > tierRank();
  S.plan = p;
  if (up && S.credits < PLAN_TOKENS[p]) S.credits = PLAN_TOKENS[p];
  if (p !== "max") S.peerAll = false;
  save(); syncChrome();
  toast(`เปลี่ยนเป็น ${({ free: "Level 1 · Free", pro: "Level 2 · Pro (Pay-Per-Use)", max: "Level 3 · Pro Max (Subscription)" })[p]} · เครดิต ${S.credits}`);
}
goPro = function () { if (tierRank() >= 1) return; setPlan("pro"); };
/** โค้ดเดิมบางจุดเช็ก S.plan === "pro" ตรง ๆ — Pro Max ต้องได้ทุกอย่างที่ Pro ได้ จึงให้มองเห็นเป็น "pro" ชั่วขณะตอนวาด */
function asPro(fn) {
  if (S.plan !== "max") return fn();
  S.plan = "pro";
  try { return fn(); } finally { S.plan = "max"; }
}
const _trStatusBar = statusBar;
statusBar = function (c) { return asPro(() => _trStatusBar(c)); };
if (typeof svAdmin === "function") { const _sa = svAdmin; svAdmin = function () { return asPro(() => _sa()); }; }

/* ---------------------------------------------------------------- 3 · ผนังสิทธิ์ (ข้อความเป็น "เครดิต") */
const TR_NEED = { pro: "Level 2 · Pro (Pay-Per-Use)", max: "Level 3 · Pro Max (Subscription)" };
function trWall(inner, title, body, need) {
  return `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${inner}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:56px"><div class="paycard">
      <div class="lk">◈</div>
      <div class="tr-eyebrow">สิทธิ์ของ ${esc(TR_NEED[need] || need)}</div>
      <h3 style="font-size:16px;margin-bottom:5px">${esc(title)}</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-setplan="${need}">เปลี่ยนเป็น ${need === "max" ? "Pro Max" : "Pro"}</button>
        <button class="btn s" data-goto="billing">ดูตารางสิทธิ์</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px;line-height:1.6">ต้นแบบยังไม่เชื่อมระบบชำระเงิน — สลับระดับได้ทันทีเพื่อสาธิต</div>
    </div></div></div>`;
}
paywall = function (inner, what, title, body, cost, tag) {
  if (tierRank() < 1 && TR_PAID.includes(what))
    return trWall(inner, title, body + `<br><b>ระดับ Free ใช้เครดิตปลดล็อกส่วนนี้ไม่ได้</b> — เปลี่ยนเป็น Pro แล้วใช้เครดิตที่มีอยู่ได้ทันที`, "pro");
  return `<div class="lockwrap">
    <div class="blurred" aria-hidden="true">${inner}</div>
    <div class="paywall" style="align-items:flex-start;padding-top:64px"><div class="paycard">
      <div class="lk">🔒</div>
      <h3 style="font-size:16px;margin-bottom:5px">${esc(title)}</h3>
      <p style="font-size:12.3px;color:var(--ink-2);margin:0 0 15px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
        <button class="btn p" data-unlock="${what}">ปลดล็อก · ใช้ ${cost} เครดิต</button>
        <button class="btn s" data-goto="billing">ดูแพ็กเกจเครดิต</button></div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:11px">คุณมี <b style="color:var(--ink)">${S.credits}</b> เครดิต${tag ? " · " + tag : ""}
        · Pro Max ใช้ได้โดยไม่ตัดเครดิต</div>
    </div></div></div>`;
};
prowall = function (inner, title, body) { return trWall(inner, title, body, "pro"); };
const trSkel = n => `<div class="card">${[...Array(n)].map((_, i) => `<div class="tr-skel" style="width:${92 - i * 9}%"></div>`).join("")}</div>`;

/* ---------------------------------------------------------------- 4 · ประตูสิทธิ์รายบริษัท */
const CO_VIEWS = ["profile", "docs", "fit", "zonec", "matrix", "compass", "peer", "studio", "ic", "t561"];
function trCoGate() {
  const c = cur(), r = tierRank(), mine = S.freeCo && byT[S.freeCo];
  return pageHead("สิทธิ์การดูข้อมูลบริษัท", `${c.t} · ${c.n}`,
    r < 1 ? "ระดับ Free (Level 1) ดูข้อมูลได้เฉพาะบริษัทของคุณเอง — ไม่สามารถดูข้อมูลบริษัทอื่นได้ (Inspect before pay)"
      : "ระดับ Pro (Level 2) ปลดล็อกข้อมูลบริษัทเพิ่มได้ทีละบริษัทด้วยเครดิต — ปลดครั้งเดียวดูได้ตลอด")
    + `<div class="card tr-gate">
      <div class="tr-gate-ic" aria-hidden="true">🔒</div>
      <div style="flex:1;min-width:240px">
        <h3 style="margin:0 0 4px">${r < 1 ? `ข้อมูลของ ${esc(c.t)} ยังไม่เปิดสำหรับระดับ Free` : `ปลดล็อกข้อมูลของ ${esc(c.t)}`}</h3>
        <p class="desc" style="margin:0">${r < 1
          ? `บริษัทของคุณคือ <b>${esc(S.freeCo)}</b>${mine ? ` (${esc(mine.n)})` : ""} · เปลี่ยนเป็น Pro (Pay-Per-Use ไม่มีค่ารายเดือน) เพื่อปลดล็อกบริษัทอื่นทีละบริษัท หรือ Pro Max เพื่อดูได้ทุกบริษัท`
          : `ใช้ ${PRICE.report} เครดิต เปิด Company Profile, รายงานวินิจฉัยฉบับเต็ม, Zone A–C และ Grid ของบริษัทนี้ · คุณมี <b>${S.credits}</b> เครดิต · Pro Max ดูได้ทุกบริษัทโดยไม่ตัดเครดิต`}</p>
        <div class="gx-row" style="margin-top:12px">
          ${r >= 1 ? `<button class="btn p" data-unlock="report">ปลดล็อกบริษัทนี้ · ${PRICE.report} เครดิต</button>` : `<button class="btn p" data-setplan="pro">เปลี่ยนเป็น Pro (Pay-Per-Use)</button>`}
          ${S.freeCo ? `<button class="btn s" data-trco="${esc(S.freeCo)}">กลับไปที่บริษัทของฉัน (${esc(S.freeCo)})</button>` : ""}
          <button class="btn g" data-setplan="max">Pro Max · ดูได้ทุกบริษัท</button></div>
      </div></div>` + trSkel(4);
}
CO_VIEWS.forEach(k => {
  const v = VIEWS[k];
  if (typeof v === "function") VIEWS[k] = function () { return canSeeCo(S.t) ? v.apply(this, arguments) : trCoGate(); };
  const w = WIRES2[k];
  WIRES2[k] = function (h) { if (!canSeeCo(S.t)) return; if (typeof w === "function") w(h); };
});

/* ---------------------------------------------------------------- 5 · หน้าที่ปรับตามสิทธิ์ */
/* Peer Benchmark — Free ✕ */
(() => {
  const v = VIEWS.peer, w = WIRES2.peer;
  VIEWS.peer = function () {
    if (tierRank() >= 1 || !canSeeCo(S.t)) return v.apply(this, arguments);
    const c = cur();
    return pageHead("เทียบคู่แข่ง", `Peer Benchmark · ${c.t}`, "เทียบตัวต่อตัวกับคู่แข่งในอุตสาหกรรมเดียวกัน 3 ราย")
      + trWall(trSkel(6), "Peer Benchmark", "ระดับ Pro ปลดล็อกการเทียบ 1 vs 3 ราย ในอุตสาหกรรมเดียวกัน ด้วย 1 เครดิต (เปลี่ยนคู่แข่งได้ไม่จำกัดหลังปลดล็อก) · Pro Max เทียบข้ามอุตสาหกรรม / ข้ามประเภทธุรกิจได้", "pro");
  };
  WIRES2.peer = function (h) { if (tierRank() < 1) return; if (typeof w === "function") w(h); };
})();

/* ภาพรวมอุตสาหกรรม — Free ✕ · Pro Top 5 ในกลุ่มตนเอง (ทั้งกลุ่ม + CSV ปลด 5 เครดิต) · Pro Max ทั้งอุตสาหกรรม + CSV */
(() => {
  const v = VIEWS.sector, w = WIRES2.sector;
  function top5(ind) {
    const pool = indComps(ind).slice().sort((a, b) => b.ipi - a.ipi), top = pool.slice(0, 5);
    return pageHead("ภาพรวมอุตสาหกรรม", `${IND[ind]} · Top 5`,
      `ระดับ Pro ดูได้เฉพาะ 5 อันดับแรกในกลุ่มของบริษัทคุณ (${pool.length} บริษัทในกลุ่ม) · ทั้งกลุ่มและไฟล์ CSV เป็นสิทธิ์ Pro Max หรือปลดรายกลุ่ม ${PRICE.sector} เครดิต`)
      + `<div class="card" style="margin-bottom:14px"><h3>5 อันดับแรกของ${esc(IND[ind])} <span class="pill blue">Pro</span></h3>
        <p class="desc">เรียงตาม OpenInnoScore · ใช้ดูตำแหน่งเทียบเท่านั้น ไม่ใช่การจัดอันดับคุณภาพบอร์ด · คลิกแถวเพื่อเปิดบริษัท (บริษัทอื่นต้องปลดล็อกรายบริษัท)</p>
        <div class="tw"><table class="tr-top5"><thead><tr><th class="n">#</th><th>บริษัท</th><th>โซน</th><th class="n">OIS</th>
          <th class="n">CEO Promotion Focus</th><th class="n">Board Amp</th><th class="n">กก.หญิง</th></tr></thead>
          <tbody>${top.map((x, k) => { const zz = ZONES[zoneOf(x.promo, x.amp)];
            return `<tr data-co="${esc(x.t)}" style="cursor:pointer"${x.t === S.t ? ' class="hl"' : ""}><td class="n">${k + 1}</td>
              <td><b>${esc(x.t)}</b> <span style="color:var(--ink-3)">${esc(x.n)}</span></td>
              <td><span class="pill" style="border-color:${zz.c};color:${zz.c};font-size:9.5px">${esc(zz.l)}</span></td>
              <td class="n"><b>${x.ipi}</b></td><td class="n">${x.dp}</td><td class="n">${ampPct(x.amp)}</td><td class="n">${pct1(x.fem)}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="gx-sm" style="margin-top:8px">แสดง ${top.length} จาก ${pool.length} บริษัท · อีก ${Math.max(0, pool.length - top.length)} บริษัทและไฟล์ CSV อยู่ในสิทธิ์ทั้งกลุ่ม</p></div>
      <div class="card tr-buy"><div style="flex:1;min-width:240px"><h3 style="margin:0 0 4px">ดูทั้งกลุ่ม + ส่งออก CSV</h3>
          <p class="desc" style="margin:0">ปลดล็อก${esc(IND[ind])}ทั้งกลุ่ม ${pool.length} บริษัท ด้วย ${PRICE.sector} เครดิต (หรือซื้อแยกรายกลุ่ม ${fmt(SECTOR_BAHT)} บาท) · Pro Max รวมใน Subscription ทุกอุตสาหกรรม · คุณมี <b>${S.credits}</b> เครดิต</p></div>
        <div class="gx-row"><button class="btn p" data-trsec="${ind}">ปลดล็อกทั้งกลุ่ม · ${PRICE.sector} เครดิต</button>
          <button class="btn s" data-setplan="max">ดู Pro Max</button></div></div>`;
  }
  VIEWS.sector = function () {
    const r = tierRank();
    if (r >= 2) return v.apply(this, arguments);
    if (r < 1) return pageHead("ภาพรวมอุตสาหกรรม", "Industry Overview", "ตารางจัดอันดับรายอุตสาหกรรม การกระจายตัวของคะแนน และค่ากลางองค์ประกอบบอร์ด")
      + trWall(trSkel(7), "ภาพรวมอุตสาหกรรม", "ระดับ Pro ดู Top 5 ในกลุ่มตนเอง · Pro Max ดูทั้งอุตสาหกรรมและส่งออก CSV (หรือใช้ 5 เครดิตต่อกลุ่ม)", "pro");
    if (S.ind !== "all" && isUnlocked("sector", S.ind)) return v.apply(this, arguments);
    if (S.ind === "all" || +S.ind === ownInd()) return top5(ownInd());
    return v.apply(this, arguments);
  };
  WIRES2.sector = function (h) { if (tierRank() < 1) return; if (typeof w === "function") w(h); };
})();

/* หลักฐานความแม่น — Pro Max เห็นตารางรายปีเหมือน Pro */
if (typeof VIEWS.valid === "function") { const v = VIEWS.valid; VIEWS.valid = function () { return asPro(() => v.apply(this, arguments)); }; }
/* ข้อสั่งการบอร์ด / Compliance — สิทธิ์ Pro Max (ต้นแบบเปิดให้ทดลองเพื่อ Pilot) */
if (typeof VIEWS.directives === "function") {
  const v = VIEWS.directives;
  VIEWS.directives = function () {
    const h = v.apply(this, arguments);
    if (tierRank() >= 2) return h;
    const note = `<div class="note warn tr-maxnote"><b>Compliance program รายเดือน/รายไตรมาส เป็นสิทธิ์ Pro Max</b> (รายงานหัวข้อ 4 · Agentic AI) — ต้นแบบเปิดหน้านี้ให้ทดลองเพื่อ Pilot ·
      <button class="lnk" data-setplan="max">เปลี่ยนเป็น Pro Max</button></div>`;
    const i = h.indexOf("</div>", h.indexOf('class="pagehead"'));
    return i > 0 ? h.slice(0, i + 6) + note + h.slice(i + 6) : note + h;
  };
}

/* ---------------------------------------------------------------- 6 · หน้าเครดิตและแผน */
function viewBillingTr() {
  const r = tierRank(), used = S.log.filter(l => l.cost > 0).reduce((a, b) => a + b.cost, 0);
  const col = k => PLAN_RANK[k] === r ? " tr-cur" : "";
  const cell = v => v === "✕" ? `<span class="tr-x" aria-label="ไม่สามารถใช้งานได้">✕</span>` : esc(v);
  return pageHead("บัญชีของคุณ", "เครดิตและแผนการใช้งาน",
    "สิทธิ์ 3 ระดับ — Free · Pro (Pay-Per-Use) · Pro Max (Subscription, add-on จาก Pro) · คิดค่าบริการด้วยเครดิตตามการใช้งานจริง ปลดล็อกแล้วอยู่ตลอด")
    + `<div class="grid g4 tight" style="gap:10px;margin-bottom:16px">
      <div class="stat hero"><div class="k">เครดิตคงเหลือ</div><div class="v num">${S.credits}</div>
        <div class="u">${S.credits ? "พร้อมใช้งาน" : "หมดแล้ว — เติมเพื่อใช้งานต่อ"}</div></div>
      <div class="stat"><div class="k">ระดับปัจจุบัน</div><div class="v" style="font-size:19px">${esc(PLAN_LAB[S.plan])}</div>
        <div class="u">${esc(TR_PLANS[r].lv)} · ${esc(TR_PLANS[r].sub)}</div></div>
      <div class="stat"><div class="k">ใช้ไปแล้ว</div><div class="v num">${used}</div><div class="u">${S.log.length} รายการ</div></div>
      <div class="stat"><div class="k">บริษัทของคุณ (ฟรี)</div><div class="v" style="font-size:19px">${esc(S.freeCo || "ยังไม่ได้เลือก")}</div>
        <div class="u">รายงานวินิจฉัยฉบับเต็มฟรี 1 บริษัท</div></div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>ระดับสิทธิ์การใช้งาน</h3>
      <p class="desc">ระดับกำหนดว่าเปิดฟีเจอร์ใดได้ ส่วนเครดิตใช้จ่ายรายครั้งในระดับ Pro · Pro Max เป็น Subscription ที่ต่อยอดจาก Pro จึงไม่ตัดเครดิตกับรายการในตาราง</p>
      <div class="grid g3 tr-plans">${TR_PLANS.map(p => `<div class="tr-plan${p.k === S.plan ? " on" : ""}">
          <div class="tr-plan-h"><span class="tr-lv">${esc(p.lv)}</span>${p.k === S.plan ? `<span class="pill ok">ระดับปัจจุบัน</span>` : ""}</div>
          <b class="tr-plan-n">${esc(p.n)}</b><div class="tr-plan-s">${esc(p.sub)}</div>
          <p>${esc(p.d)}</p><div class="tr-plan-t">เริ่มต้น ${p.tok} เครดิต${p.k === "free" ? " (รับทันทีเมื่อสมัคร)" : ""}</div>
          ${p.k === S.plan ? "" : `<button class="btn ${PLAN_RANK[p.k] > r ? "p" : "g"}" data-setplan="${p.k}">${PLAN_RANK[p.k] > r ? "อัปเกรดเป็น" : "สลับไป"} ${esc(p.n)}</button>`}
        </div>`).join("")}</div>
      <div class="note" style="margin-top:12px">ต้นแบบยังไม่เชื่อมระบบชำระเงิน — สลับระดับได้ทันทีเพื่อสาธิต · อัตรา Subscription ของ Pro Max เป็นไปตามข้อตกลงองค์กร (ยังไม่กำหนดในต้นแบบ) · ระบบจริงจะผูกระดับกับการชำระเงินและออกใบเสร็จ (เฟส 2)</div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3>ตารางสิทธิ์การใช้งาน <span class="pill blue">ตามรายงานหัวข้อ 4</span></h3>
      <p class="desc">คอลัมน์ที่ไฮไลต์คือระดับปัจจุบันของคุณ</p>
      <div class="tw"><table class="tr-perm"><thead><tr><th>ฟีเจอร์ / สิทธิ์การเข้าถึง</th>
        <th class="${col("free")}">Level 1 · Free</th><th class="${col("pro")}">Level 2 · Pro (Pay-Per-Use)</th><th class="${col("max")}">Level 3 · Pro Max (Subscription)</th></tr></thead>
        <tbody>${PERM.map(row => `<tr><th scope="row">${esc(row[0])}</th><td class="${col("free")}">${cell(row[1])}</td>
          <td class="${col("pro")}">${cell(row[2])}</td><td class="${col("max")}">${cell(row[3])}</td></tr>`).join("")}</tbody></table></div>
    </div>

    <div class="grid g2" style="margin-bottom:14px">
      <div class="card"><h3>อัตราการใช้เครดิต (Credit Tariff)</h3>
        <div class="tw"><table><thead><tr><th>รายการ</th><th class="n">เครดิต</th><th>หมายเหตุ</th></tr></thead><tbody>
          ${TARIFF.map(t => `<tr><td>${esc(t[0])}</td><td class="n"><b>${esc(t[1])}</b></td><td style="color:var(--ink-2)">${esc(t[2])}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="gx-sm" style="margin-top:8px">หลักคิด: ให้ตรวจสอบก่อนจ่าย · จ่ายตามที่ใช้จริง · ปลดล็อกแล้วอยู่ตลอด · ขายเป็นชุดได้ในระดับอุตสาหกรรม</p></div>
      <div class="card"><h3>แพ็กเกจเติมเครดิต (Credit Packages)</h3>
        <div class="tr-packs">${PACKS.map((p, i) => `<div class="tr-pack${i === 1 ? " best" : ""}">
            ${p.tag ? `<span class="tr-tag">${esc(p.tag)}</span>` : ""}
            <div class="tr-pack-n">${p.n}<span> เครดิต</span></div>
            <div class="tr-pack-b">${fmt(p.baht)} บาท</div>
            <div class="gx-sm">เฉลี่ย ${fmt(Math.round(p.baht / p.n))} บาท / รายงาน</div>
            <button class="btn ${i === 1 ? "p" : "s"}" data-buy="${p.n}">เลือกแพ็กเกจนี้</button></div>`).join("")}</div>
        <div class="note" style="margin-top:12px">การชำระเงินเป็นการจำลอง — กดเลือกแพ็กเกจแล้วยืนยันเพื่อเติมเครดิตด้วยมือ ไม่มีการตัดบัตรจริง (ระบบชำระเงินและใบเสร็จอยู่ในเฟส 2)</div></div>
    </div>

    <div class="card"><h3>ประวัติการใช้เครดิต</h3>
      ${S.log.length ? `<div class="tw" style="max-height:260px;overflow:auto"><table><thead><tr><th>รายการ</th><th>อ้างอิง</th><th class="n">เครดิต</th><th>เวลา</th></tr></thead><tbody>
        ${S.log.map(l => `<tr><td>${esc(({ report: "รายงานวินิจฉัย / ข้อมูลบริษัท", peer: "เทียบคู่แข่ง", studio: "What-if Studio + ตรวจภาษา CEO", sector: "ภาพรวมอุตสาหกรรม + CSV", ceotext: "ตรวจข้อความ CEO", port: "พอร์ตลงทุน", topup: "เติมเครดิต" })[l.what] || l.what)}</td>
          <td style="color:var(--ink-2)">${esc(l.label || l.t)}</td><td class="n">${l.cost > 0 ? "−" + l.cost : "+" + (-l.cost)}</td>
          <td style="color:var(--ink-3);font-size:11px">${esc(l.at)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div style="text-align:center;padding:26px 10px;color:var(--ink-3);font-size:12.5px">ยังไม่มีการใช้เครดิต</div>`}
      <button class="btn g" id="btnResetDemo" style="margin-top:12px;width:100%;justify-content:center">รีเซ็ตข้อมูลสาธิต (คืนเครดิต 3 และล้างสิทธิ์ที่ปลดล็อก)</button>
    </div>`;
}
VIEWS.billing = viewBillingTr;

/* ---------------------------------------------------------------- 7 · ร่าง 56-1 · Template และการอนุมัติ */
const T561_KEY = "ois_t561_v1";
const T561_PH = ["ชื่อบริษัท", "ปีบัญชี", "กระบวนการประเมิน", "ประเด็นพัฒนา", "การดำเนินการที่เสร็จและมีมติ", "ผลประเมิน BOD", "ผล RFQ"];
/** ข้อความสรุปจากหน้าแบบประเมิน (ไฟล์ v2_assess.js) — รองรับทั้ง string และ { text | summary } · ไม่มีฟังก์ชัน/ไม่มีผล → "" */
function mvSummaryText(fn, ...args) {
  try {
    if (typeof window[fn] !== "function") return "";
    const r = window[fn](...args);
    if (!r) return "";
    if (typeof r === "string") return r.trim();
    if (typeof r === "object") return String(r.text || r.summary || "").trim();
  } catch (e) { }
  return "";
}
const T561_DEFAULT = () => ({ id: "default", name: "แบบมาตรฐาน · 56-1 ส่วนที่ 2 ข้อ 7–8", secs: [
  { h: "ส่วนที่ 2 ข้อ 7 · โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ — การประเมินผลการปฏิบัติงานของคณะกรรมการด้านการกำกับดูแลนวัตกรรม",
    b: "ในปีบัญชี {{ปีบัญชี}} คณะกรรมการ{{ชื่อบริษัท}}ได้ประเมินผลการปฏิบัติงานของคณะกรรมการในระดับคณะ เพิ่มเติมในประเด็นการกำกับดูแลนวัตกรรมแบบเปิด โดยมีกระบวนการดังนี้\n{{กระบวนการประเมิน}}\n\n{{ผลประเมิน BOD}}" },
  { h: "ส่วนที่ 2 ข้อ 8 · รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ — การกำกับดูแลนวัตกรรมแบบเปิด",
    b: "ประเด็นพัฒนาที่คณะกรรมการกำหนดจากการประเมิน ได้แก่\n{{ประเด็นพัฒนา}}\n\nการดำเนินการที่แล้วเสร็จและผ่านมติของคณะกรรมการในรอบปี\n{{การดำเนินการที่เสร็จและมีมติ}}" },
] });
const T561 = (() => {
  const d = { tpl: [T561_DEFAULT()], cur: "default", ap: {}, sd: {} };
  try { const o = JSON.parse(localStorage.getItem(T561_KEY) || "null");
    if (o && Array.isArray(o.tpl) && o.tpl.length) { d.tpl = o.tpl; d.cur = o.cur || o.tpl[0].id; d.ap = o.ap || {}; }
    if (o && o.sd && typeof o.sd === "object") d.sd = o.sd; } catch (e) { }
  if (!d.tpl.some(t => t.id === "default")) d.tpl.unshift(T561_DEFAULT());
  return d;
})();
const t561Save = () => { try { localStorage.setItem(T561_KEY, JSON.stringify(T561)); } catch (e) { } };
const t561Tpl = () => T561.tpl.find(t => t.id === T561.cur) || T561.tpl[0];
const t561Now = () => new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
const t561Hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const T561_ROLES = ["ประธานกรรมการ", "เลขานุการบริษัท", "ประธานคณะกรรมการบรรษัทภิบาล"];
let _t561Ai = null, _t561Focus = null;

/** ผล BOD Self-Assessment (OI-1…6) จาก ois_pilot_v1 — ระดับคณะเท่านั้น */
function t561Bod() {
  let a = null;
  try { if (typeof PL === "object" && PL && PL.bod) a = PL.bod.a; } catch (e) { }
  if (!a) try { const o = JSON.parse(localStorage.getItem("ois_pilot_v1") || "null"); a = o && o.bod && o.bod.a; } catch (e) { }
  a = a || {};
  const items = typeof OI_ITEMS !== "undefined" ? OI_ITEMS : [];
  const done = items.filter(i => a[i.id]);
  return { done, hi: done.filter(i => a[i.id] >= 4), lo: done.filter(i => a[i.id] <= 2) };
}
/** ค่าที่เติมลงตัวแทน — เฉพาะสิ่งที่เกิดขึ้นจริงและผ่านมติ · ไม่มีชื่อบริษัทอื่น · ไม่ใช้คะแนนแบบจำลอง */
function t561Values(c) {
  const done = typeof fuDoneItems === "function" ? fuDoneItems(c.t) : [];
  const decided = typeof fuRows === "function"
    ? fuRows().filter(r => String(r.dec || "").trim() && (!r.co || r.co === c.t)).map(r => rpAnon(r.issue.replace(/^\[[^\]]+\]\s*/, ""), c.t)) : [];
  const bod = t561Bod();
  const proc = [];
  if (bod.done.length) proc.push(`- คณะกรรมการตอบชุดคำถามประเมินตนเองระดับคณะด้านการกำกับดูแลนวัตกรรมแบบเปิด ${bod.done.length} ประเด็น (${bod.done.map(i => i.id).join(", ")}) ซึ่งอ้างอิงหลักการกำกับดูแลกิจการที่ดีสำหรับบริษัทจดทะเบียน ปี 2560 โดยเลขานุการบริษัทสรุปจากการหารือของคณะกรรมการ`);
  if (decided.length) proc.push(`- นำประเด็นที่ได้จากการประเมินเข้าสู่วาระการหารือของคณะกรรมการ บันทึกข้อสรุปและมติ กำหนดผู้รับผิดชอบในระดับตำแหน่ง และรอบการติดตามผล`);
  const isu = [...bod.lo.map(i => `${i.id} · ${i.t}`), ...decided];
  return {
    "ชื่อบริษัท": c.n || c.t,
    "ปีบัญชี": String((c.fy || FY_SHOWN) + 543),
    "กระบวนการประเมิน": proc.length ? proc.join("\n") : "[ยังไม่มีข้อมูลกระบวนการประเมิน — กรอกหลังการประชุมจริง]",
    "ประเด็นพัฒนา": isu.length ? [...new Set(isu)].map(x => "- " + x).join("\n") : "[ยังไม่มีประเด็นพัฒนาที่ผ่านการหารือ]",
    "การดำเนินการที่เสร็จและมีมติ": done.length ? done.map((r, i) => `${i + 1}. ${r.issue} — การดำเนินการตามมติ: ${r.dec}`).join("\n")
      : "[ยังไม่มีรายการที่ดำเนินการแล้วเสร็จและมีมติ — ส่วนนี้แสดงเฉพาะการดำเนินการที่เกิดขึ้นจริงและผ่านการอนุมัติ]",
    "ผล RFQ": mvSummaryText("rfqSummary", c.t) || "[ยังไม่มีผลแบบประเมิน RFQ — ทำได้ที่หน้า RFQ · เป็นแบบวัดตนเองของ CEO แยกจากคะแนน]",
    "ผลประเมิน BOD": mvSummaryText("bodSetSummary", c.t, c.fy || FY_SHOWN) || (bod.done.length
      ? `ผลการประเมินตนเองระดับคณะ: ประเด็นที่คณะกรรมการเห็นว่ามีการดำเนินการเป็นส่วนใหญ่หรืออย่างเป็นระบบแล้ว ได้แก่ ${bod.hi.map(i => i.id).join(", ") || "—"}`
        + ` · ประเด็นที่กำหนดเป็นแนวทางพัฒนาในปีถัดไป ได้แก่ ${bod.lo.map(i => i.id).join(", ") || "—"} · ผลเป็นภาพรวมระดับคณะ ไม่มีการประเมินหรือให้คะแนนกรรมการรายบุคคล`
      : "[ยังไม่มีผลประเมินตนเองของคณะกรรมการ — ทำได้ที่หน้าแบบประเมินตนเองของคณะกรรมการ (SET) หรือ BOD Self-Assessment OI-1…6]"),
  };
}
/** กฎก่อนส่งออก — ไม่มีชื่อบริษัทอื่น (ใช้ตัวแทนชื่อ) · ไม่อ้างคะแนนแบบจำลองเป็นหลักฐานประสิทธิผลของบอร์ด */
const T561_SCORE_RX = /OpenInnoScore|\bOIS\b|\bTier\s*\d|เปอร์เซ็นไทล์|percentile|quadrant|Signal\s*B|Board Amplification|ช่อง\s*(Deliver|Develop|Discipline|Discover)/i;
function t561Build(c) {
  const vals = t561Values(c), tpl = t561Tpl(), unknown = new Set();
  const fill = s => String(s || "").replace(/{{\s*([^}]+?)\s*}}/g, (m, k) => vals[k] !== undefined ? vals[k] : (unknown.add(k), m));
  const secs = tpl.secs.map(x => ({ h: rpAnon(fill(x.h), c.t), b: rpAnon(fill(x.b), c.t) }));
  const text = secs.map(x => `${x.h}\n\n${x.b}`).join("\n\n");
  const issues = [];
  const m = text.match(T561_SCORE_RX);
  if (m) issues.push(`พบคำที่อ้างคะแนน/ตำแหน่งจากแบบจำลอง (“${m[0]}”) — ห้ามใช้คะแนนเป็นหลักฐานว่าบอร์ดมีประสิทธิผล ให้แก้ Template ก่อน`);
  if (unknown.size) issues.push(`ตัวแทนที่ระบบไม่รู้จัก: ${[...unknown].map(k => "{{" + k + "}}").join(", ")}`);
  const gaps = (text.match(/\[ยังไม่มี[^\]]*\]/g) || []).length;
  return { secs, text, issues, gaps, hash: t561Hash(text) };
}
function t561Ap(t) { return T561.ap[t] || (T561.ap[t] = { st: "draft", hist: [] }); }
function t561State(c, b) {
  const a = t561Ap(c.t);
  if ((a.st === "pending" || a.st === "approved") && a.hash !== b.hash) return { k: "changed", a };
  return { k: a.st, a };
}
const T561_STEPS = [["draft", "ร่าง"], ["pending", "รออนุมัติ"], ["approved", "อนุมัติแล้ว / ส่งกลับแก้"], ["ready", "พร้อมส่งออก"]];
function t561Flow(st) {
  const idx = st === "pending" ? 1 : st === "approved" ? 3 : st === "returned" ? 2 : 0;
  return `<ol class="tr-flow">${T561_STEPS.map(([k, l], i) => `<li class="${i < idx ? "done" : i === idx ? "on" : ""}${st === "returned" && i === 2 ? " ret" : ""}">
    <b>${i + 1}</b><span>${st === "returned" && i === 2 ? "ส่งกลับแก้" : esc(l)}</span></li>`).join("")}</ol>`;
}
function t561Mail(c, a) {
  return `<div class="tr-mail" role="group" aria-label="ตัวอย่างอีเมลขออนุมัติ">
    <div class="tr-mail-h"><span>ถึง</span><b>${esc(a.role || T561_ROLES[0])}</b> <span class="pill mute">จำลอง · อีเมลจริงต้องใช้เซิร์ฟเวอร์</span></div>
    <div class="tr-mail-h"><span>เรื่อง</span><b>ขออนุมัติร่างข้อความแบบ 56-1 ส่วนที่ 2 ข้อ 7–8 · ${esc(c.n || c.t)} · ปีบัญชี ${(c.fy || FY_SHOWN) + 543}</b></div>
    <div class="tr-mail-b">เรียน ${esc(a.role || T561_ROLES[0])}<br>
      ฝ่ายเลขานุการบริษัทขอเสนอร่างข้อความการกำกับดูแลนวัตกรรมสำหรับแนบแบบ 56-1 One Report (Template “${esc(t561Tpl().name)}”)
      เพื่อพิจารณาอนุมัติก่อนนำส่งออก · ร่างนี้ใช้เฉพาะการดำเนินการที่เกิดขึ้นจริงและผ่านมติแล้ว ไม่ระบุชื่อบริษัทอื่น และไม่ใช้คะแนนแบบจำลองเป็นหลักฐานประสิทธิผลของคณะกรรมการ<br>
      <span class="tr-mail-btns"><span>✓ อนุมัติ</span><span>↺ ส่งกลับแก้</span></span>
      <span class="gx-sm">กดได้จากอุปกรณ์ใดก็ได้ (Anydevice Approval) — ในต้นแบบจำลองด้วยปุ่มด้านล่าง</span></div></div>`;
}
/* ---------------------------------------------------------------- 7ข · Structured Data สำหรับกรอกใน SETLink (แก้ไขครั้งที่ 2.3)
   ขั้นตอนของ SET: กรอก Structured Data → อัปโหลดรูปเล่ม → ตรวจสอบและอนุมัติ → เผยแพร่
   ระบบนี้ช่วยเตรียมเฉพาะฟิลด์ของ 56-1 ส่วนที่ 2 ข้อ 7 และข้อ 8 · ไม่ส่งข้อมูลให้ SET · รูปแบบฟิลด์เป็นสมมติฐาน */
const SD_NOTE = "รูปแบบฟิลด์สมมติ — ตรวจกับแบบฟอร์ม Structured Data ของ SETLink ก่อนใช้จริง";
const SD_METHODS = ["", "ประเมินทั้งคณะ", "ประเมินรายบุคคล", "ประเมินทั้งคณะและรายบุคคล", "ประเมินทั้งคณะ + คณะกรรมการชุดย่อย", "ประเมินทั้งคณะ + รายบุคคล + คณะกรรมการชุดย่อย"];
const SD_COMMITTEES = [["audit", "คณะกรรมการตรวจสอบ"], ["nomrem", "คณะกรรมการสรรหาและพิจารณาค่าตอบแทน"], ["cgrisk", "คณะกรรมการบรรษัทภิบาล / บริหารความเสี่ยง"]];
function sdFields(c) {
  const bs = c.bsize, done = typeof fuDoneItems === "function" ? fuDoneItems(c.t) : [];
  const bodTxt = mvSummaryText("bodSetSummary", c.t, c.fy || FY_SHOWN), bod = t561Bod();
  const evalDone = !!bodTxt || bod.done.length > 0;
  const F = [
    { sec: 7, k: "board_total", l: "จำนวนกรรมการทั้งหมด (คน)", t: "int", v: bs || "", src: bs ? "Zone A" : "" },
    { sec: 7, k: "board_independent", l: "จำนวนกรรมการอิสระ (คน)", t: "int", v: "", src: "" },
    { sec: 7, k: "board_executive", l: "จำนวนกรรมการที่เป็นผู้บริหาร (คน)", t: "int", v: "", src: "" },
    { sec: 7, k: "board_female", l: "จำนวนกรรมการหญิง (คน)", t: "int", v: bs ? Math.round(c.fem * bs) : "", src: bs ? "Zone A (สัดส่วน × จำนวนกรรมการ)" : "" },
    { sec: 7, k: "board_family", l: "จำนวนกรรมการที่เป็นครอบครัวผู้ถือหุ้นใหญ่ (คน)", t: "int", v: bs ? Math.round(c.fam * bs) : "", src: bs ? "Zone A (สัดส่วน × จำนวนกรรมการ)" : "" },
    { sec: 7, k: "avg_tenure_years", l: "อายุการดำรงตำแหน่งเฉลี่ยของกรรมการ (ปี)", t: "num", v: isFinite(c.ten) ? Math.round(c.ten * 10) / 10 : "", src: "แผงข้อมูล / Zone A" },
    ...SD_COMMITTEES.flatMap(([k, l]) => [
      { sec: 7, k: `cmt_${k}_total`, l: `${l} · จำนวนกรรมการ`, t: "int", v: "", src: "", cmt: k },
      { sec: 7, k: `cmt_${k}_independent`, l: `${l} · กรรมการอิสระ`, t: "int", v: "", src: "", cmt: k }]),
    { sec: 7, k: "board_self_assessment_done", l: "มีการประเมินตนเองของคณะกรรมการในปีนี้", t: "yn", v: evalDone ? "Y" : "", src: evalDone ? "หน้าแบบประเมินตนเอง" : "" },
    { sec: 7, k: "board_self_assessment_method", l: "รูปแบบการประเมิน", t: "sel", v: evalDone ? "ประเมินทั้งคณะ" : "", src: evalDone ? "หน้าแบบประเมินตนเอง" : "" },
    { sec: 8, k: "board_meetings", l: "จำนวนครั้งการประชุมคณะกรรมการในปี", t: "int", v: "", src: "" },
    { sec: 8, k: "board_attendance_pct", l: "อัตราการเข้าประชุมเฉลี่ย (%)", t: "num", v: "", src: "" },
    { sec: 8, k: "dev_actions_completed", l: "จำนวนการดำเนินการพัฒนาที่แล้วเสร็จและมีมติ", t: "int", v: done.length || "", src: done.length ? "หน้า Follow-up" : "" },
    { sec: 8, k: "dev_actions_list", l: "รายการการดำเนินการที่แล้วเสร็จและมีมติ", t: "text", v: done.map((r, i) => `${i + 1}. ${r.issue} — ${r.dec}`).join("\n"), src: done.length ? "หน้า Follow-up" : "" },
    { sec: 8, k: "bod_evaluation_summary", l: "สรุปผลการประเมินคณะกรรมการ (ระดับคณะ)", t: "text", v: t561Values(c)["ผลประเมิน BOD"].replace(/^\[.*\]$/, ""), src: evalDone ? "หน้าแบบประเมินตนเอง" : "" },
  ];
  const o = (T561.sd || {})[c.t] || {};
  F.forEach(f => { if (o[f.k] !== undefined) { f.v = o[f.k]; f.ed = true; } });
  return F;
}
const sdFilled = F => F.filter(f => String(f.v ?? "").trim() !== "").length;
function sdJson(c, F) {
  const val = f => f.t === "int" || f.t === "num" ? (f.v === "" ? null : +f.v) : f.t === "yn" ? (f.v === "Y" ? true : f.v === "N" ? false : null) : (f.v || null);
  const pick = sec => Object.fromEntries(F.filter(f => f.sec === sec && !f.cmt).map(f => [f.k, val(f)]));
  return { schema: "OIS-SETLink-StructuredData-draft-0.1", note: SD_NOTE,
    disclaimer: "ระบบนี้ไม่ส่งข้อมูลให้ SET — ผู้ใช้กรอกใน SETLink เอง", company: { ticker: c.t, name: c.n }, fiscal_year: c.fy || FY_SHOWN,
    part2_item7_board_structure: Object.assign(pick(7), { committees: SD_COMMITTEES.map(([k, l]) => ({ key: k, name: l,
      members: val(F.find(f => f.k === `cmt_${k}_total`)), independent: val(F.find(f => f.k === `cmt_${k}_independent`)) })) }),
    part2_item8_governance_performance: pick(8), generated_at: new Date().toISOString() };
}
function sdCsv(c, F) {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [["section", "field_key", "label_th", "value", "source"].map(q).join(","),
    ...F.map(f => [`56-1 ส่วนที่ 2 ข้อ ${f.sec}`, f.k, f.l, f.v, f.ed ? "ผู้ใช้แก้" : f.src || ""].map(q).join(","))].join("\n");
}
function sdPanel(c) {
  const F = sdFields(c), n = sdFilled(F);
  const inp = f => {
    const id = "sd_" + f.k;
    if (f.t === "yn") return `<select class="sel" id="${id}" data-sd="${f.k}"><option value=""${!f.v ? " selected" : ""}>— ยังไม่ระบุ —</option>
      <option value="Y"${f.v === "Y" ? " selected" : ""}>Y · มี</option><option value="N"${f.v === "N" ? " selected" : ""}>N · ไม่มี</option></select>`;
    if (f.t === "sel") return `<select class="sel" id="${id}" data-sd="${f.k}">${SD_METHODS.map(m => `<option value="${esc(m)}"${m === f.v ? " selected" : ""}>${esc(m || "— ยังไม่ระบุ —")}</option>`).join("")}</select>`;
    if (f.t === "text") return `<textarea class="inp" id="${id}" data-sd="${f.k}" rows="3">${esc(f.v)}</textarea>`;
    return `<input class="inp" id="${id}" data-sd="${f.k}" type="number" min="0" step="${f.t === "num" ? "0.1" : "1"}" value="${esc(f.v)}">`;
  };
  const row = f => `<div class="mv-sdrow${f.t === "text" ? " wide" : ""}"><label for="sd_${f.k}">${esc(f.l)}</label>${inp(f)}
    <span class="mv-sdsrc">${f.ed ? `<span class="pill blue">ผู้ใช้แก้</span>` : f.src ? `<span class="pill mute">เติมจาก ${esc(f.src)}</span>` : `<span class="pill warn">ต้องกรอก</span>`}</span></div>`;
  const sec = k => F.filter(f => f.sec === k);
  return `<div class="card mv-sd" id="mvSd" style="margin-top:14px">
    <h3>Structured Data (สำหรับกรอกใน SETLink) <span class="pill ${n === F.length ? "ok" : "warn"}">กรอกแล้ว ${n} / ${F.length} ฟิลด์</span></h3>
    <div class="note warn" style="margin-bottom:10px"><b>${esc(SD_NOTE)}</b> · ใช้เตรียมข้อมูลก่อนกรอกในระบบ SETLink (ขั้นที่ 1 ของ 56-1 One Report) · ระบบนี้ไม่ส่งข้อมูลให้ SET</div>
    <div class="grid g2" style="gap:16px;align-items:start">
      <div><div class="tr-k">ส่วนที่ 2 ข้อ 7 · โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ</div>
        ${sec(7).filter(f => !f.cmt).map(row).join("")}
        <div class="tr-k" style="margin-top:10px">คณะกรรมการชุดย่อย (ถ้ามี)</div>
        ${sec(7).filter(f => f.cmt).map(row).join("")}</div>
      <div><div class="tr-k">ส่วนที่ 2 ข้อ 8 · รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ</div>
        ${sec(8).map(row).join("")}
        <p class="gx-sm">ค่าที่เติมให้มาจากข้อมูลในระบบ (Zone A · Follow-up · แบบประเมินตนเอง) — ตรวจกับเอกสารจริงก่อนใช้ · ไม่ใช้คะแนนแบบจำลองเป็นหลักฐานประสิทธิผลของคณะกรรมการ</p></div>
    </div>
    <div class="gx-row" style="margin-top:10px"><button class="btn s" id="sdJson">ส่งออก JSON</button><button class="btn s" id="sdCsv">ส่งออก CSV</button>
      <button class="btn g" id="sdReset">ล้างค่าที่แก้ (กลับไปใช้ค่าที่เติมให้)</button></div>
  </div>`;
}
/** แถบขั้นตอนตาม SETLink — ระบบนี้ทำได้ขั้น 1 (เตรียมข้อมูล) และขั้น 3 (อนุมัติภายในองค์กร) เท่านั้น */
function setlinkFlow(c) {
  const F = sdFields(c), n = sdFilled(F), b = t561Build(c), st = t561State(c, b).k, r = tierRank();
  const steps = [
    ["กรอก Structured Data", `เตรียมในระบบนี้ · ${n}/${F.length} ฟิลด์`, n === F.length ? "done" : "on", "#mvSd"],
    ["อัปโหลดรูปเล่ม", "ทำนอกระบบ — อัปโหลดไฟล์ 56-1 ฉบับเต็มใน SETLink", "ext", ""],
    ["ตรวจสอบและอนุมัติ", r >= 2 ? `ขั้นอนุมัติของระบบนี้ · สถานะ: ${({ draft: "ร่าง", pending: "รออนุมัติ", approved: "อนุมัติแล้ว", returned: "ส่งกลับแก้", changed: "แก้หลังส่ง — ต้องส่งใหม่" })[st] || st}` : "Email Approval เป็นสิทธิ์ Pro Max · Pro ตรวจทานเอง", st === "approved" ? "done" : r >= 2 ? "on" : "ext", ".tr-appr"],
    ["เผยแพร่", "ทำใน SETLink — ระบบนี้ไม่ส่งข้อมูลให้ SET", "ext", ""],
  ];
  return `<ol class="mv-flow" aria-label="ขั้นตอน 56-1 One Report ผ่าน SETLink">${steps.map(([h, p, k, a], i) =>
    `<li class="${k}"${a ? ` data-sdgo="${a}" tabindex="0" role="button"` : ""}><b>${i + 1}</b><div><i>${esc(h)}</i><span>${esc(p)}</span></div></li>`).join("")}</ol>`;
}
function wireSd(h, c) {
  const set = (k, v) => { T561.sd = T561.sd || {}; (T561.sd[c.t] = T561.sd[c.t] || {})[k] = v; t561Save(); render(); };
  h.querySelectorAll("[data-sd]").forEach(el => el.onchange = () => set(el.dataset.sd, el.value.trim()));
  const base = `56-1_StructuredData_ส่วนที่2_ข้อ7-8_${c.t}_${(c.fy || FY_SHOWN) + 543}`;
  const j = h.querySelector("#sdJson"); if (j) j.onclick = () => t561Dl(base + ".json", JSON.stringify(sdJson(c, sdFields(c)), null, 2), "application/json;charset=utf-8");
  const v = h.querySelector("#sdCsv"); if (v) v.onclick = () => t561Dl(base + ".csv", sdCsv(c, sdFields(c)), "text/csv;charset=utf-8");
  const r = h.querySelector("#sdReset"); if (r) r.onclick = () => confirm2(r, () => { if (T561.sd) delete T561.sd[c.t]; t561Save(); render(); }, "กดอีกครั้งเพื่อล้างค่าที่แก้");
  h.querySelectorAll("[data-sdgo]").forEach(li => { const f = () => { const t = h.querySelector(li.dataset.sdgo); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    li.onclick = f; li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; });
}

function viewT561() {
  const r = tierRank(), c = cur();
  const head = pageHead("Agentic AI · 56-1", "ร่าง 56-1 · Template และการอนุมัติ",
    `ลูกค้าเปลี่ยน Template รายงานเองได้ และมีขั้นอนุมัติก่อนส่งข้อมูลออก (รายงานหัวข้อ 6) · หัวข้อที่เกี่ยวข้องคือ 56-1 ส่วนที่ 2 ข้อ 7 และข้อ 8 ·
     ข้อความสร้างจากกฎ (rule-based) — AI ทำหน้าที่เรียบเรียงเท่านั้น คะแนนมาจากเครื่องคำนวณหลังบ้าน`);
  if (r < 1) return head + trWall(trSkel(8), "ร่างรายงาน 56-1 ด้วย Agentic AI",
    "ระดับ Pro สร้างร่างรายงานการกำกับดูแลนวัตกรรมแนบ 56-1 และแก้ Template เองได้ · Pro Max เพิ่มขั้นอนุมัติผ่านอีเมล (Email Approval Workflow) การวิเคราะห์เชิงลึก และ Compliance program", "pro");
  const tpl = t561Tpl(), b = t561Build(c), s = t561State(c, b), a = s.a;
  const blocked = b.issues.length > 0;
  const canExport = !blocked && (r < 2 || (s.k === "approved"));
  const ai = typeof window !== "undefined" && window.OIS_API && typeof window.OIS_API.llm === "function";
  const editor = `<div class="card tr-ed">
    <div class="tr-edh"><h3 style="margin:0">ก · Template</h3>
      <select class="sel" id="t5Tpl" aria-label="เลือก Template">${T561.tpl.map(t => `<option value="${esc(t.id)}"${t.id === tpl.id ? " selected" : ""}>${esc(t.name)}</option>`).join("")}</select></div>
    <label class="tr-k" for="t5Name">ชื่อ Template</label>
    <input class="inp" id="t5Name" value="${esc(tpl.name)}" style="width:100%"${tpl.id === "default" ? "" : ""}>
    <div class="tr-ph"><span class="gx-sm">ตัวแทนข้อมูล — คลิกเพื่อแทรกในช่องข้อความที่เลือกล่าสุด:</span>
      ${T561_PH.map(p => `<button class="tr-chip" data-t5ph="${esc(p)}">{{${esc(p)}}}</button>`).join("")}</div>
    ${tpl.secs.map((x, i) => `<div class="tr-sec">
      <div class="tr-sec-h"><span class="pill mute">ส่วนที่ ${i + 1}</span>
        <button class="btn g" data-t5up="${i}" ${i ? "" : "disabled"} title="เลื่อนขึ้น">↑</button>
        <button class="btn g" data-t5del="${i}" ${tpl.secs.length > 1 ? "" : "disabled"} title="ลบส่วนนี้">ลบ</button></div>
      <input class="inp" data-t5h="${i}" value="${esc(x.h)}" aria-label="หัวข้อส่วนที่ ${i + 1}" style="width:100%;font-weight:600">
      <textarea class="inp" data-t5b="${i}" rows="6" aria-label="ข้อความส่วนที่ ${i + 1}" style="width:100%;margin-top:6px;resize:vertical">${esc(x.b)}</textarea>
    </div>`).join("")}
    <div class="gx-row">
      <button class="btn s" id="t5Add">+ เพิ่มส่วน</button>
      <button class="btn p" id="t5Save">บันทึก Template</button>
      <button class="btn s" id="t5SaveAs">บันทึกเป็น Template ใหม่</button>
      <button class="btn g" id="t5Reset">คืนค่าเริ่มต้น</button>
      ${tpl.id !== "default" ? `<button class="btn g" id="t5Del">ลบ Template นี้</button>` : ""}</div>
    <p class="gx-sm" style="margin-top:8px">แก้ข้อความแล้วกดนอกช่องเพื่อบันทึกอัตโนมัติ · Template เก็บในเครื่องนี้ (${T561.tpl.length} ชุด) · เมื่อแก้หลังส่งขออนุมัติ ร่างจะกลับเป็นสถานะ “ร่าง”</p>
  </div>`;
  const preview = `<div class="card tr-prev">
    <div class="tr-edh"><h3 style="margin:0">ข · ตัวอย่างร่าง · ${esc(c.t)}</h3>
      ${b.gaps ? `<span class="pill warn">ข้อมูลยังไม่ครบ ${b.gaps} จุด</span>` : `<span class="pill ok">เติมข้อมูลครบ</span>`}</div>
    <div class="note tr-rules"><b>กติกาที่ระบบบังคับ</b> · ใช้เฉพาะการดำเนินการที่เกิดขึ้นจริงและผ่านมติแล้ว (สถานะ “เสร็จ” + มีมติในหน้า Follow-up) ·
      ชื่อบริษัทอื่นถูกแทนด้วย “บริษัทในกลุ่มเปรียบเทียบ” · ไม่ใช้คะแนน/ตำแหน่งจากแบบจำลองเป็นหลักฐานว่าบอร์ดมีประสิทธิผล · ไม่ระบุชื่อบุคคล</div>
    ${b.issues.map(x => `<div class="note crit" style="margin-top:8px">⚠ ${esc(x)}</div>`).join("")}
    <article class="tr-doc" id="t5Doc">${b.secs.map(x => `<h4>${esc(x.h)}</h4>${x.b.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}`).join("")}</article>
    <div class="tr-ai">
      ${ai ? `<button class="btn s" id="t5Ai">ให้ AI เรียบเรียง (ต้องเปิดใช้บนเซิร์ฟเวอร์)</button>`
        : `<button class="btn g" disabled title="ต้องเปิดใช้บนเซิร์ฟเวอร์">ให้ AI เรียบเรียง (ต้องเปิดใช้บนเซิร์ฟเวอร์)</button>`}
      <span class="gx-sm">${ai ? "AI เรียบเรียงถ้อยคำตามโครงสร้างของ SET เท่านั้น — ไม่เพิ่มข้อเท็จจริงและไม่เข้าถึงสูตรคำนวณ" : "ต้นแบบนี้ยังไม่ได้เชื่อมบริการ AI ฝั่งเซิร์ฟเวอร์ — ร่างด้านบนสร้างจากกฎทั้งหมด"}</span></div>
    ${_t561Ai ? `<div class="tr-aiout ${_t561Ai.ok ? "" : "off"}"><div class="tr-k">${_t561Ai.ok ? "ข้อความที่ AI เรียบเรียง — ตรวจทานก่อนใช้ (ยังไม่ผ่านขั้นอนุมัติจนกว่าจะคัดลอกลง Template)" : "บริการ AI"}</div>
        <div class="tr-aitxt">${esc(_t561Ai.text).replace(/\n/g, "<br>")}</div></div>` : ""}
  </div>`;
  const hist = a.hist.length ? `<div class="tw" style="margin-top:10px"><table class="tr-tbl"><thead><tr><th>เวลา</th><th>การดำเนินการ</th><th>บทบาท</th><th>หมายเหตุ</th></tr></thead>
    <tbody>${a.hist.slice().reverse().map(h => `<tr><td style="white-space:nowrap">${esc(h.at)}</td><td>${esc(h.act)}</td><td>${esc(h.role || "—")}</td><td>${esc(h.note || "")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="gx-sm" style="margin-top:8px">ยังไม่มีประวัติการอนุมัติ</p>`;
  const approval = r < 2 ? `<div class="card tr-lockcard"><h3>ค · ขั้นอนุมัติก่อนส่งออก <span class="pill blue">Pro Max</span></h3>
      <p class="desc" style="margin:0">Email Approval Workflow (ร่าง → รออนุมัติ → อนุมัติแล้ว/ส่งกลับแก้ → พร้อมส่งออก) เป็นสิทธิ์ Pro Max ·
        ระดับ Pro ร่างและส่งออกได้โดยไม่ผ่านขั้นอนุมัติ — ผู้ใช้ต้องตรวจทานกับเลขานุการบริษัทเอง</p>
      <button class="btn s" data-setplan="max" style="margin-top:10px">ดูสิทธิ์ Pro Max</button></div>`
    : `<div class="card tr-appr"><h3>ค · ขั้นอนุมัติก่อนส่งออก <span class="pill blue">Pro Max</span></h3>
      ${t561Flow(s.k === "changed" ? "draft" : s.k)}
      ${s.k === "changed" ? `<div class="note warn" style="margin:8px 0">เนื้อหาเปลี่ยนหลังส่งขออนุมัติ — ต้องส่งขออนุมัติใหม่ก่อนส่งออก</div>` : ""}
      ${s.k === "draft" || s.k === "returned" || s.k === "changed" ? `
        ${s.k === "returned" && a.note ? `<div class="note warn" style="margin:8px 0"><b>ส่งกลับแก้โดย ${esc(a.by || "")}</b> · ${esc(a.note)}</div>` : ""}
        <div class="gx-row" style="align-items:center"><label class="gx-sm" for="t5Role">ผู้อนุมัติ (บทบาท)</label>
          <select class="sel" id="t5Role">${T561_ROLES.map(x => `<option${x === (a.role || T561_ROLES[0]) ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>
          <button class="btn p" id="t5Submit"${blocked ? " disabled title=\"แก้ข้อที่ระบบเตือนก่อน\"" : ""}>ส่งขออนุมัติ</button></div>
        <p class="gx-sm">ระบบจำลองการส่งอีเมลไปยังบทบาทที่เลือก — อีเมลจริงต้องใช้เซิร์ฟเวอร์</p>`
      : s.k === "pending" ? `${t561Mail(c, a)}
        <label class="tr-k" for="t5Note" style="margin-top:10px">ความเห็นผู้อนุมัติ</label>
        <textarea class="inp" id="t5Note" rows="2" style="width:100%" placeholder="เช่น ปรับถ้อยคำย่อหน้าที่ 2 ให้ตรงกับมติครั้งที่ 4/2567"></textarea>
        <div class="gx-row"><button class="btn p" id="t5Ok">✓ อนุมัติ (จำลองในบทบาท ${esc(a.role)})</button>
          <button class="btn s" id="t5Ret">↺ ส่งกลับแก้</button></div>`
      : `<div class="note ok" style="margin:8px 0"><b>อนุมัติแล้ว · พร้อมส่งออก</b> — โดย ${esc(a.by || "")} · ${esc(a.at || "")}${a.note ? " · " + esc(a.note) : ""}</div>
        <button class="btn g" id="t5Reopen">เปิดร่างเพื่อแก้ไขอีกครั้ง</button>`}
      <div class="tr-k" style="margin-top:12px">ประวัติ</div>${hist}</div>`;
  const exportCard = `<div class="card tr-exp"><h3>ส่งออก</h3>
    <p class="desc">${r >= 2 ? (canExport ? "ร่างได้รับอนุมัติแล้ว — ส่งออกได้" : "ปุ่มส่งออกเปิดเมื่อร่างได้รับอนุมัติแล้ว (พร้อมส่งออก)") : blocked ? "แก้ข้อที่ระบบเตือนก่อนส่งออก" : "ระดับ Pro ส่งออกได้ทันที — ตรวจทานกับเลขานุการบริษัทก่อนใช้"}</p>
    <div class="gx-row"><button class="btn s" data-t5x="copy"${canExport ? "" : " disabled"}>คัดลอกข้อความ</button>
      <button class="btn s" data-t5x="txt"${canExport ? "" : " disabled"}>ดาวน์โหลด .txt</button>
      <button class="btn s" data-t5x="md"${canExport ? "" : " disabled"}>ดาวน์โหลด .md</button>
      <button class="btn s" data-t5x="print"${canExport ? "" : " disabled"}>พิมพ์</button></div></div>`;
  const maxCard = `<div class="card"><h3>ต่อยอดระดับ Pro Max <span class="pill ${r >= 2 ? "ok" : "blue"}">${r >= 2 ? "เปิดแล้ว" : "Pro Max"}</span></h3>
    <div class="tr-links">
      ${[["compass", "รายงานวิเคราะห์เชิงลึก", "Board Strategy Compass ฉบับเต็ม"], ["zonec", "AI Strategic Advice", "Zone C · ข้อเสนอระดับคณะ (กรรมการหญิง + ภาษา CEO)"],
        ["directives", "แผนกำกับดูแลและข้อสั่งการบอร์ด", "Compliance program รายเดือน / รายไตรมาส"]].map(([v, l, d]) =>
        r >= 2 ? `<button class="tr-link" data-goto="${v}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`
          : `<button class="tr-link off" data-setplan="max"><b>🔒 ${esc(l)}</b><span>${esc(d)}</span></button>`).join("")}</div></div>`;
  return head + (typeof reportChain === "function" ? reportChain(4).replace('aria-current="page"', "").replace(" on\"", "\"") : "")
    + setlinkFlow(c)
    + `<div class="tr-t5grid"><div class="stack">${editor}${maxCard}</div><div class="stack">${preview}${approval}${exportCard}</div></div>`
    + sdPanel(c);
}
function t561Dl(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function wireT561(h) {
  if (typeof wireChain === "function") wireChain(h);
  const c = cur(), tpl = t561Tpl();
  wireSd(h, c);
  const afterEdit = () => { const a = t561Ap(c.t); t561Save(); render(); return a; };
  const sel = h.querySelector("#t5Tpl"); if (sel) sel.onchange = () => { T561.cur = sel.value; _t561Ai = null; t561Save(); render(); };
  const nm = h.querySelector("#t5Name"); if (nm) nm.onchange = () => { tpl.name = nm.value.trim() || tpl.name; t561Save(); render(); };
  h.querySelectorAll("[data-t5h]").forEach(el => { el.onfocus = () => _t561Focus = el; el.onchange = () => { tpl.secs[+el.dataset.t5h].h = el.value; afterEdit(); }; });
  h.querySelectorAll("[data-t5b]").forEach(el => { el.onfocus = () => _t561Focus = el; el.onchange = () => { tpl.secs[+el.dataset.t5b].b = el.value; afterEdit(); }; });
  h.querySelectorAll("[data-t5ph]").forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => {
    const el = _t561Focus && h.contains(_t561Focus) ? _t561Focus : h.querySelector("[data-t5b]");
    if (!el) return;
    const ins = "{{" + b.dataset.t5ph + "}}", p0 = el.selectionStart ?? el.value.length, p1 = el.selectionEnd ?? p0;
    el.value = el.value.slice(0, p0) + ins + el.value.slice(p1);
    el.dispatchEvent(new Event("change")); }; });
  h.querySelectorAll("[data-t5del]").forEach(b => b.onclick = () => { tpl.secs.splice(+b.dataset.t5del, 1); afterEdit(); });
  h.querySelectorAll("[data-t5up]").forEach(b => b.onclick = () => { const i = +b.dataset.t5up; if (i < 1) return;
    [tpl.secs[i - 1], tpl.secs[i]] = [tpl.secs[i], tpl.secs[i - 1]]; afterEdit(); });
  const add = h.querySelector("#t5Add"); if (add) add.onclick = () => { tpl.secs.push({ h: "หัวข้อใหม่", b: "ข้อความ — ใช้ตัวแทนข้อมูลได้ เช่น {{ชื่อบริษัท}}" }); afterEdit(); };
  const sv = h.querySelector("#t5Save"); if (sv) sv.onclick = () => { t561Save(); toast("บันทึก Template แล้ว"); };
  const sa = h.querySelector("#t5SaveAs"); if (sa) sa.onclick = () => {
    const id = "t" + Date.now().toString(36), cp = JSON.parse(JSON.stringify(tpl));
    cp.id = id; cp.name = (tpl.name || "Template") + " (สำเนา)";
    T561.tpl.push(cp); T561.cur = id; t561Save(); toast("บันทึกเป็น Template ใหม่แล้ว"); render(); };
  const rs = h.querySelector("#t5Reset"); if (rs) rs.onclick = () => confirm2(rs, () => {
    const d = T561_DEFAULT(); tpl.secs = d.secs; if (tpl.id === "default") tpl.name = d.name; afterEdit(); toast("คืนค่าเริ่มต้นแล้ว"); },
    "กดอีกครั้งเพื่อคืนค่าเป็นแบบมาตรฐาน");
  const dl = h.querySelector("#t5Del"); if (dl) dl.onclick = () => confirm2(dl, () => {
    T561.tpl = T561.tpl.filter(t => t.id !== tpl.id); T561.cur = "default"; t561Save(); render(); }, `กดอีกครั้งเพื่อลบ “${tpl.name}”`);
  /* การอนุมัติ (Pro Max) */
  const push = (a, act, note) => { a.hist.push({ at: t561Now(), act, role: a.role, note: note || "" }); };
  const sub = h.querySelector("#t5Submit"); if (sub) sub.onclick = () => {
    if (tierRank() < 2) return;
    const b = t561Build(c); if (b.issues.length) return toast("แก้ข้อที่ระบบเตือนก่อนส่งขออนุมัติ");
    const a = t561Ap(c.t); a.role = (h.querySelector("#t5Role") || {}).value || T561_ROLES[0];
    a.st = "pending"; a.hash = b.hash; a.note = ""; push(a, "ส่งขออนุมัติ (จำลองอีเมล)");
    t561Save(); toast("ส่งขออนุมัติแล้ว (จำลอง) · ถึง " + a.role); render(); };
  const ok = h.querySelector("#t5Ok"); if (ok) ok.onclick = () => {
    const a = t561Ap(c.t), n = (h.querySelector("#t5Note") || {}).value || "";
    a.st = "approved"; a.by = a.role; a.at = t561Now(); a.note = n.trim(); push(a, "อนุมัติแล้ว → พร้อมส่งออก", a.note);
    t561Save(); toast("อนุมัติแล้ว · พร้อมส่งออก"); render(); };
  const ret = h.querySelector("#t5Ret"); if (ret) ret.onclick = () => {
    const a = t561Ap(c.t), n = ((h.querySelector("#t5Note") || {}).value || "").trim();
    if (!n) return toast("ระบุความเห็นที่ต้องแก้ก่อนส่งกลับ");
    a.st = "returned"; a.by = a.role; a.at = t561Now(); a.note = n; push(a, "ส่งกลับแก้", n);
    t561Save(); toast("ส่งกลับแก้แล้ว"); render(); };
  const ro = h.querySelector("#t5Reopen"); if (ro) ro.onclick = () => { const a = t561Ap(c.t); a.st = "draft"; push(a, "เปิดร่างเพื่อแก้ไข"); t561Save(); render(); };
  /* ส่งออก */
  h.querySelectorAll("[data-t5x]").forEach(btn => btn.onclick = () => {
    const b = t561Build(c), k = btn.dataset.t5x, base = `56-1_ส่วนที่2_ข้อ7-8_${c.t}_${(c.fy || FY_SHOWN) + 543}`;
    if (b.issues.length) return toast("แก้ข้อที่ระบบเตือนก่อนส่งออก");
    if (tierRank() >= 2 && t561State(c, b).k !== "approved") return toast("ต้องได้รับอนุมัติก่อนส่งออก");
    if (k === "copy") return typeof copyText === "function" ? copyText(b.text) : navigator.clipboard && navigator.clipboard.writeText(b.text);
    if (k === "txt") return t561Dl(base + ".txt", b.text, "text/plain;charset=utf-8");
    if (k === "md") return t561Dl(base + ".md", b.secs.map(x => `## ${x.h}\n\n${x.b}`).join("\n\n"), "text/markdown;charset=utf-8");
    if (k === "print") return typeof rpPrint === "function" ? rpPrint("tr-print-561") : window.print();
  });
  /* AI เรียบเรียง — ทำงานเมื่อเซิร์ฟเวอร์เปิดให้ใช้เท่านั้น */
  const aiB = h.querySelector("#t5Ai"); if (aiB) aiB.onclick = async () => {
    const b = t561Build(c);
    if (b.issues.length) return toast("แก้ข้อที่ระบบเตือนก่อนส่งให้ AI");
    aiB.disabled = true; aiB.textContent = "กำลังเรียบเรียง …";
    try {
      const res = await Promise.resolve(window.OIS_API.llm("t561_rewrite", { text: b.text,
        rules: ["เรียบเรียงถ้อยคำตามโครงสร้าง 56-1 ส่วนที่ 2 ข้อ 7–8 เท่านั้น", "ห้ามเพิ่มข้อเท็จจริง ตัวเลข หรือชื่อบริษัท/บุคคล", "ห้ามอ้างคะแนนเป็นหลักฐานประสิทธิผลของคณะกรรมการ"] }));
      if (!res || res.enabled === false || res.ok === false) _t561Ai = { ok: false, text: (res && (res.message || res.reason || res.error)) || "บริการ AI ยังไม่ได้เปิดใช้บนเซิร์ฟเวอร์ — ใช้ร่างที่สร้างจากกฎไปก่อน" };
      else {
        const t = typeof res === "string" ? res : (res.text || res.output || res.content || "");
        const out = rpAnon(String(t), c.t);
        _t561Ai = T561_SCORE_RX.test(out) ? { ok: false, text: "ข้อความจาก AI อ้างคะแนนแบบจำลอง จึงไม่แสดง — ใช้ร่างจากกฎแทน" } : { ok: !!out, text: out || "AI ไม่ได้ส่งข้อความกลับมา" };
      }
    } catch (e) { _t561Ai = { ok: false, text: "เรียก AI ไม่สำเร็จ — " + (e && e.message || e) }; }
    render();
  };
}
VIEWS.t561 = viewT561;
WIRES2.t561 = function (h) { if (!canSeeCo(S.t) || tierRank() < 1) return; wireT561(h); };
/* ประตูสิทธิ์บริษัทถูกห่อไว้ก่อนลงทะเบียน t561 — ห่ออีกครั้งให้ครบ */
(() => { const v = VIEWS.t561; VIEWS.t561 = function () { return canSeeCo(S.t) ? v() : trCoGate(); }; })();

/* ---------------------------------------------------------------- 8 · คู่มือการใช้งาน (ในหน้าระบบ) */
const MAN_SECS = [["man-start", "เริ่มต้น"], ["man-plans", "ระดับสิทธิ์และเครดิต"], ["man-flow", "เส้นทางการทำงาน"], ["man-t561", "ร่าง 56-1"],
  ["man-read", "อ่านผลอย่างไร"], ["man-whatif", "What-if (จำนวนคน)"], ["man-uc", "Use Case"], ["man-rules", "กติกาสำคัญ"], ["man-pilot", "หน้า Pilot"],
  ["man-assess", "RFQ · Dictionary · ประเมินตนเองของบอร์ด"], ["man-data", "ชุดข้อมูล · Evidence Pack · Structured Data"], ["man-rcpt", "ใบเสร็จตัวอย่าง"], ["man-faq", "คำถามที่พบบ่อย"]];
const MAN_HELP = { profile: "man-v-profile", docs: "man-v-docs", fit: "man-v-fit", zonec: "man-v-zonec", matrix: "man-v-matrix", compass: "man-v-compass",
  peer: "man-v-peer", studio: "man-whatif", followup: "man-v-followup", t561: "man-t561", sector: "man-plans", billing: "man-plans", port: "man-flow", ic: "man-flow",
  arch: "man-rules", valid: "man-read", bod: "man-pilot", rfq: "man-assess", dict: "man-assess", bodset: "man-assess",
  datasets: "man-data", evidence: "man-data", outdomain: "man-pilot", directives: "man-pilot", survey: "man-pilot", syslog: "man-pilot", integr: "man-pilot" };
const MAN_CHIPS = [
  ["tier ไม่แน่นอน", "ช่วง 90% ของคะแนนคร่อมมากกว่าหนึ่ง tier — อย่าสรุประดับจากตัวเลขเดียว"],
  ["Caution: ปีนี้ไม่ผ่านเกณฑ์ validity", "ปีบัญชีนั้นตกเกณฑ์อย่างน้อยหนึ่งข้อในตาราง validity — อ่านผลอย่างระมัดระวัง"],
  ["ยังไม่ได้ validate", "ยังไม่มีข้อมูลปีถัดไปให้ตรวจ"],
  ["หลักฐานอ่อนในอุตสาหกรรมนี้", "ความสัมพันธ์ระหว่างคะแนนกับกิจกรรม open innovation ในอุตสาหกรรมนี้ยังไม่ต่างจากศูนย์อย่างมีนัย"],
  ["กรรมการหญิง … คน — ต่ำกว่า critical mass", "งานวิจัยพบความสัมพันธ์มีนัยเมื่อมีกรรมการหญิงอย่างน้อย 3 คน"],
  ["amp ≤ 0", "บอร์ดอยู่ในรูปแบบที่ภาษาเชิงรุกของ CEO ไม่สัมพันธ์กับ open innovation ที่สูงขึ้น"],
  ["ค่าป้อนถูก clip", "ค่าอยู่นอกช่วง p5–p95 ของฐานอ้างอิง จึงถูกแทนด้วยจุดตัดก่อนเข้าสูตร"],
  ["นอกกลุ่มอ้างอิง", "ธนาคาร/การเงิน หรือไม่มีสารภาษาอังกฤษ — ไม่แสดง tier เปอร์เซ็นไทล์ หรือตำแหน่งบน Grid"],
  ["ธงสัญญาณ OI", "อยู่ช่อง Deliver และขอบล่างของช่วง 90% ≥ 50 ในปีที่ผ่าน validity — เป็นธงเชิงความสัมพันธ์ ไม่ใช่การรับรอง"],
];
const MAN_FAQ = [
  ["คะแนน OpenInnoScore คือความน่าจะเป็นที่บริษัทจะทำนวัตกรรมใช่ไหม", "ไม่ใช่ — เป็นเปอร์เซ็นไทล์ของสัญญาณเทียบฐานอ้างอิง REF-928 (928 บริษัท-ปี) อ่านเชิงความสัมพันธ์ ไม่ใช่การพยากรณ์และไม่ใช่เหตุ-ผล"],
  ["ทำไมระดับ Free เปิดบริษัทอื่นไม่ได้ แม้มีเครดิต", "Free ออกแบบให้ “ตรวจสอบก่อนจ่าย” กับบริษัทของตนเอง · เครดิต 3 หน่วยที่ได้ตอนสมัครใช้ได้ทันทีเมื่อเปลี่ยนเป็น Pro (Pay-Per-Use ไม่มีค่ารายเดือน)"],
  ["ปลดล็อกแล้วต้องจ่ายซ้ำไหม", "ไม่ต้อง — ปลดล็อกครั้งเดียวดูได้ตลอดสำหรับบริษัท/อุตสาหกรรมนั้น · Pro Max ไม่ตัดเครดิตกับรายการในตาราง"],
  ["ทำไม What-if ปรับกรรมการครอบครัวและ political ties ได้ แต่ระบบไม่แนะนำ", "ปรับได้เพื่อให้เข้าใจโมเดล แต่ความสัมพันธ์ของสองตัวแปรนี้ไม่ทนต่อการวิเคราะห์ fixed-effects (H2, H3) และ political ties ไม่ใช้เป็นเหตุผลเชิงบวก (R6) จึงไม่อยู่ในข้อเสนอ Zone C หรือฉากทัศน์สำเร็จรูป"],
  ["จุดอ้างอิงบน Grid คือเป้าหมายที่ควรไปใช่ไหม", "ไม่ใช่ — เป็นค่ามัธยฐานของบริษัทช่อง Deliver ในอุตสาหกรรมเดียวกัน ใช้เทียบระยะห่างเท่านั้น และปิดไว้เป็นค่าเริ่มต้น"],
  ["ร่าง 56-1 เอาคะแนนไปใส่ได้ไหม", "ไม่ได้ — ร่างใช้เฉพาะกระบวนการประเมิน ประเด็นพัฒนา และการดำเนินการที่เกิดขึ้นจริงและผ่านมติ ระบบจะเตือนและบล็อกการส่งออกถ้าพบคำอ้างคะแนน"],
  ["ข้อมูลที่อัปโหลดถูกส่งไปที่ไหน", "ต้นแบบนี้อ่านเอกสารในเบราว์เซอร์เท่านั้น ไม่ส่งออก · ข้อมูลอยู่ใน localStorage ของเครื่องนี้"],
  ["ทำไมธนาคารไม่มีจุดบน Grid", "ธนาคารอยู่นอกฐานอ้างอิง REF-928 (อุตสาหกรรม 1–7 นอกกลุ่มการเงิน) — ใช้ BOD Self-Assessment และโหมดนอกกลุ่มอ้างอิงแทน"],
];
function viewManual() {
  const step = (id, n, h, p) => `<li id="man-v-${id}"><b>${n}. ${esc(h)}</b> <button class="lnk" data-goto="${id}">เปิดหน้า →</button><div>${p}</div></li>`;
  return pageHead("คู่มือ", "คู่มือการใช้งาน OpenInnoScore",
    "คู่มือย่อในหน้าระบบ — เริ่มต้น เส้นทางการทำงาน วิธีอ่านผล และกติกาสำคัญ · กด “?” บนหัวของแต่ละหน้าเพื่อกลับมาที่หัวข้อที่เกี่ยวข้อง")
    + `<div class="tr-man">
    <nav class="tr-toc" aria-label="สารบัญคู่มือ">${MAN_SECS.map(([id, l], i) => `<button data-mango="${id}">${i + 1}. ${esc(l)}</button>`).join("")}</nav>
    <div class="tr-mbody">
    <section class="card" id="man-start"><h3>1 · เริ่มต้น</h3>
      <ol class="tr-ol"><li>หน้าเข้าสู่ระบบ: เลือกระดับผู้ใช้ (Free · Pro · Pro Max) เลือก “บริษัทของคุณ” แล้วกดเข้าสู่ระบบ — ไฟล์ HTML ออฟไลน์จำลองการล็อกอิน · ในเวอร์ชันเว็บ (เซิร์ฟเวอร์) ใช้ Google Sign-in จริง</li>
        <li>บริษัทของคุณ = บริษัทที่ดูรายงานวินิจฉัยฉบับเต็มได้ฟรี · Free รับ ${PLAN_TOKENS.free} เครดิตทันที</li>
        <li>แถบบนแสดงระดับและเครดิตคงเหลือ · เปลี่ยนบริษัท/อุตสาหกรรมได้จากตัวเลือกด้านบน · ปุ่ม “เติม” พาไปหน้าเครดิตและแผน</li></ol></section>
    <section class="card" id="man-plans"><h3>2 · ระดับสิทธิ์และเครดิต</h3>
      <div class="tw"><table class="tr-perm"><thead><tr><th>ฟีเจอร์</th><th>Free</th><th>Pro (Pay-Per-Use)</th><th>Pro Max (Subscription)</th></tr></thead>
        <tbody>${PERM.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>
      <p class="gx-sm" style="margin-top:8px">เครดิต: รายงานบริษัทที่ 2 ขึ้นไป 1 · เทียบคู่แข่ง 3 ราย 1 · What-if (รวมตรวจภาษา CEO) 1 · ภาพรวมทั้งอุตสาหกรรม + CSV 5 (หรือ ${fmt(SECTOR_BAHT)} บาท/กลุ่ม) ·
        แพ็กเกจ 5 เครดิต 490 บาท · 15 เครดิต 1,290 บาท · 40 เครดิต 2,990 บาท · การชำระเงินในต้นแบบเป็นการจำลอง</p></section>
    <section class="card" id="man-flow"><h3>3 · เส้นทางการทำงาน</h3>
      <ol class="tr-steps">
        ${step("profile", 1, "Company Profile", "ภาพรวมบริษัท ข้อมูลองค์ประกอบบอร์ด และจุดเริ่มของทุกหน้า")}
        ${step("docs", 2, "Zone A · Document Intelligence", "อัปโหลดสารจาก CEO (Pro) หรือพิมพ์/วางข้อความ ≥ 2,000 คำ (Free) · แก้ค่าบอร์ดเองได้ทุกช่อง และทุกตัวเลขบอกที่มา")}
        ${step("fit", 3, "Zone B · Insight Generator", "รายงานวินิจฉัย: OpenInnoScore, tier, ช่วง 90%, quadrant และข้อค้นพบที่กด “Add to Report” ได้")}
        ${step("zonec", 4, "Zone C · Board Refresh", "ข้อเสนอระดับคณะ — ใช้เฉพาะสัดส่วนกรรมการหญิงและภาษา CEO · ไม่เสนอกรรมการครอบครัวหรือ political ties")}
        ${step("matrix", 5, "Strategy Grid 2×2", "ตำแหน่งบริษัท + ประเด็นสำหรับบอร์ด 6 ส่วน · Pro เปิดชั้น “จุดอ้างอิงและเส้นทางย้ายโซน” ได้ · Pro Max เปรียบเทียบอุตสาหกรรม")}
        ${step("compass", 6, "Compass · รายงานประเด็นสำหรับบอร์ด", "รายงานฉบับเต็มสำหรับการประชุม — ผลหลังประชุมผู้ใช้กรอกเอง")}
        ${step("peer", 7, "Peer Benchmark", "เทียบ 1 vs 3 ราย พร้อมคำถามว่าความต่างเกิดจากอะไร · ข้ามอุตสาหกรรมเป็นสิทธิ์ Pro Max")}
        ${step("studio", 8, "What-if Studio", "ฉากทัศน์ภายใต้สมมติฐาน + What-if Report · Pro Max มีฉากทัศน์ขาลง")}
        ${step("followup", 9, "Follow-up", "ข้อสรุป มติ ผู้รับผิดชอบ (ตำแหน่ง) และกำหนดติดตาม — ข้อมูลต้นทางของร่าง 56-1")}
        ${step("t561", 10, "ร่าง 56-1 · Template และการอนุมัติ", "เติมข้อความลง Template แล้วส่งขออนุมัติก่อนส่งออก")}
      </ol></section>
    <section class="card" id="man-t561"><h3>4 · ร่าง 56-1 · Template และการอนุมัติ</h3>
      <ul class="tr-ol"><li>Template แบ่งเป็นส่วน แก้หัวข้อและข้อความได้ · แทรกตัวแทนข้อมูล ${T561_PH.map(p => `<code>{{${esc(p)}}}</code>`).join(" ")} · บันทึกได้หลายชุด และคืนค่าเริ่มต้นได้</li>
        <li>ค่าเริ่มต้นผูกกับแบบ 56-1 ส่วนที่ 2 ข้อ 7 (โครงสร้างการกำกับดูแลกิจการและข้อมูลสำคัญเกี่ยวกับคณะกรรมการ) และข้อ 8 (รายงานผลการดำเนินงานสำคัญด้านการกำกับดูแลกิจการ)</li>
        <li>ระบบใช้เฉพาะรายการ “เสร็จ” ที่มีมติ · แทนชื่อบริษัทอื่นด้วยคำกลาง · บล็อกการส่งออกถ้าพบคำอ้างคะแนนแบบจำลอง</li>
        <li>Pro Max: ร่าง → ส่งขออนุมัติ (จำลองอีเมลถึงประธานกรรมการ / เลขานุการบริษัท) → อนุมัติ หรือ ส่งกลับแก้ (บันทึกความเห็น บทบาท เวลา) → พร้อมส่งออก · Pro: ร่างและส่งออกได้โดยไม่ผ่านขั้นอนุมัติ</li>
        <li>ปุ่ม “ให้ AI เรียบเรียง” ทำงานเมื่อเปิดใช้บนเซิร์ฟเวอร์เท่านั้น</li></ul></section>
    <section class="card" id="man-read"><h3>5 · อ่านผลอย่างไร</h3>
      <dl class="tr-dl">
        <dt>OpenInnoScore (0–100)</dt><dd>เปอร์เซ็นไทล์ของสัญญาณ B = cP × amp เทียบฐาน REF-928 — ไม่ใช่ความน่าจะเป็น</dd>
        <dt>Tier 1–4</dt><dd>ระดับของคะแนนตามจุดตัดของฐานอ้างอิง · อ่านคู่กับช่วง 90% เสมอ</dd>
        <dt>เปอร์เซ็นไทล์</dt><dd>ตำแหน่งเทียบฐานอ้างอิง เช่น 70 = สูงกว่าราว 70% ของบริษัท-ปีในฐาน</dd>
        <dt>ช่วง 90%</dt><dd>ความไม่แน่นอนของคะแนนจากค่าประมาณของแบบจำลอง — ถ้าคร่อมหลาย tier ระบบจะติดป้าย “tier ไม่แน่นอน”</dd>
        <dt>quadrant (A Deliver · B Discipline · C Develop · D Discover)</dt><dd>แกนนอน = CEO Promotion Focus · แกนตั้ง = Board Amplification Signal · เป็นสี่ช่อง ไม่ใช่ควอไทล์อันดับ</dd>
        <dt>แถบสถานะ</dt><dd>สรุป Tier × quadrant พร้อมค่าเฉลี่ยกิจกรรม open innovation ของกลุ่มเดียวกันในฐาน (ไม่ใช่ค่าคาดหมายของบริษัท)</dd></dl>
      <div class="tr-k" style="margin-top:10px">ป้าย (chips) บนแถบสถานะ</div>
      <dl class="tr-dl">${MAN_CHIPS.map(([k, d]) => `<dt><span class="chip">${esc(k)}</span></dt><dd>${esc(d)}</dd>`).join("")}</dl></section>
    <section class="card" id="man-whatif"><h3>6 · What-if Studio</h3>
      <ul class="tr-ol"><li><b>ปรับเป็นจำนวนคน</b> ตามที่ผู้ว่าจ้างกำหนด: จำนวนกรรมการทั้งหมด · จำนวนกรรมการหญิง · จำนวนกรรมการครอบครัว (ปุ่ม − / +) และ political ties แบบติ๊กตามเกณฑ์ (ยศทหาร/ตำรวจ หรือตำแหน่งตามเกณฑ์ PEP ของ ปปง.) — ระบบแปลงเป็นสัดส่วน (จำนวน ÷ ขนาดบอร์ด) แล้วเข้าสูตรเดิม · ถ้าฐานข้อมูลไม่มีจำนวนกรรมการ ระบบตั้งต้นที่ 11 คน (กรอกจำนวนจริงได้ใน Zone A)</li>
        <li>ผลลัพธ์หลักคือ <b>Quartile ในอุตสาหกรรม</b> (Q1 = บนสุด 25% ของบริษัท-ปีในอุตสาหกรรมเดียวกันของ REF-928) คู่กับ Tier ทั้งฐานและโซน — เป็นการจำลองตำแหน่ง ไม่ใช่การพยากรณ์</li>
        <li>Free ทดลอง 1 ตัวแปร (จำนวนกรรมการหญิง) · Pro ปลดล็อกรายบริษัท 1 เครดิต: บอร์ดแบบจำนวนคน + ตรวจภาษา CEO · Pro Max เพิ่มฉากทัศน์ขาลง</li>
        <li>กรรมการครอบครัว: ${esc(typeof WARN_FAM !== "undefined" ? WARN_FAM : "")}</li>
        <li>political ties (0/1 เท่านั้น): ${esc(typeof WARN_POL !== "undefined" ? WARN_POL : "")}</li>
        <li>เมื่อขยับสองตัวนี้ ผลจะติดป้าย “${esc(typeof CHIP_CTX !== "undefined" ? CHIP_CTX : "")}” · มุมมองธนาคารล็อกสองตัวนี้ไว้ · อายุงานไม่มีผลต่อคะแนน (δT = 0)</li>
        <li>การคำนวณรายไตรมาสต้องใช้ข้อมูลรายไตรมาสซึ่งงานวิจัยยังไม่มี — เตรียมไว้สำหรับเฟสถัดไป</li></ul></section>
    <section class="card" id="man-uc"><h3>7 · มุมมอง Use Case</h3>
      <p class="desc">เลือกมุมมองที่หน้า Strategy Grid — เนื้อหาฐานชุดเดียวกัน แต่ถ้อยคำและผู้อ่านต่างกัน</p>
      <ul class="tr-ol">${(typeof USECASES !== "undefined" ? USECASES : []).map(u => `<li><b>${esc(u.lab)}</b> — ผู้อ่าน: ${esc(u.audience)}</li>`).join("")}</ul>
      <p class="gx-sm">มุมมองธนาคาร (ลูกค้าสินเชื่อ / บอร์ดธนาคาร) ซ่อนชั้นจุดอ้างอิง และล็อกตัวแปรบริบทใน What-if ตามแนวทาง Pilot</p></section>
    <section class="card" id="man-rules"><h3>8 · กติกาสำคัญ</h3>
      <ul class="tr-ol"><li><b>ไม่ใช่เชิงสาเหตุ</b> — ทุกตัวเลขเป็นความสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่การรับประกันผล</li>
        <li><b>ไม่ให้คะแนนบุคคล</b> — ผลเป็นระดับคณะ ห้ามใช้ประเมินหรือคัดเลือกกรรมการรายบุคคล (ข้อมูลอ่อนไหว พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล ม.26)</li>
        <li><b>political ties</b> — ข้อมูลบริบท ไม่ใช้เป็นเหตุผลเชิงบวก ไม่ใช่เป้าการสรรหา (R6)</li>
        <li><b>นอกกลุ่มอ้างอิง</b> — ธนาคาร/การเงิน ไม่แสดง tier เปอร์เซ็นไทล์ หรือตำแหน่งบน Grid (R4)</li>
        <li><b>ไม่แสดงค่าสัมประสิทธิ์</b> — สูตรและพารามิเตอร์เป็นความลับทางการค้า ประมวลผลหลังบ้านในระบบจริง</li></ul></section>
    <section class="card" id="man-pilot"><h3>9 · หน้า Pilot</h3>
      <ul class="tr-ol"><li><button class="lnk" data-goto="bod">BOD Self-Assessment (OI-1…6)</button> — ประเมินตนเองระดับคณะ · ผลนำไปใช้ใน {{ผลประเมิน BOD}} ของร่าง 56-1</li>
        <li><button class="lnk" data-goto="outdomain">โหมดนอกกลุ่มอ้างอิง (ธนาคาร)</button> — โปรไฟล์เชิงพรรณนาสำหรับบริษัทนอกฐาน</li>
        <li><button class="lnk" data-goto="directives">ข้อสั่งการบอร์ด / Compliance</button> — สิทธิ์ Pro Max (เปิดให้ทดลองใน Pilot)</li>
        <li><button class="lnk" data-goto="survey">แบบสอบถามทดสอบการยอมรับ</button> · <button class="lnk" data-goto="syslog">System log</button> · <button class="lnk" data-goto="integr">การเชื่อมต่อ (Phase ถัดไป)</button></li></ul></section>
    <section class="card" id="man-assess"><h3>10 · RFQ · Dictionary ของผู้ใช้ · แบบประเมินตนเองของคณะกรรมการ</h3>
      <ul class="tr-ol"><li><button class="lnk" data-mango2="rfq">แบบประเมิน CEO Regulatory Focus (RFQ)</button> — แบบวัดตนเอง (self-report) ของ CEO · <b>เป็นแบบวัดแยก ไม่ถูกนำไปใช้ในคะแนน</b> ซึ่งวัดจากภาษาในสารถึงผู้ถือหุ้น · ผลสรุปใช้ในตัวแทน <code>{{ผล RFQ}}</code> ของร่าง 56-1 และใน Evidence Pack ได้</li>
        <li><button class="lnk" data-mango2="dict">Dictionary ของผู้ใช้</button> — สร้างหรืออัปโหลดรายการคำเองเพื่อสำรวจข้อความ (ขอบเขตข้อ 2.3) · ไม่เปลี่ยนพจนานุกรมและสูตรที่ freeze แล้ว</li>
        <li><button class="lnk" data-mango2="bodset">แบบประเมินตนเองของคณะกรรมการ (SET)</button> — ผู้ใช้ทั่วไปตอบแบบประเมิน Board Evaluation · ผลระดับคณะเติมลงตัวแทน <code>{{ผลประเมิน BOD}}</code> และช่อง “สรุปผลการประเมินคณะกรรมการ” ของ Structured Data · ไม่ประเมินกรรมการรายบุคคล</li>
        <li>ทางเข้า: Zone A (การ์ด “ทำแบบประเมิน RFQ” และ “อัปโหลด Dictionary ของคุณเอง”) หรือเมนูด้านซ้าย</li></ul></section>
    <section class="card" id="man-data"><h3>11 · ชุดข้อมูล · Evidence Pack · Structured Data 56-1</h3>
      <ul class="tr-ol"><li><button class="lnk" data-mango2="datasets">ชุดข้อมูลและ Data Dictionary</button> — 3 ชุดข้อมูล (REF-928 ที่ freeze · ชุดให้คะแนนบริษัทจดทะเบียน · ข้อมูลที่ผู้ใช้กรอก) พร้อมนิยามตัวแปร DV / IV / MV / CV และหัวข้อที่มาใน 56-1 One Report ·
          “เพิ่มฟิลด์เอง” เก็บในเครื่อง และ<b>ยังไม่เข้าแบบจำลอง (Phase II)</b> · นำเข้า JSON (รูปแบบ SET Smart Marketplace · One Report Structured Data) ผ่านชั้นแปลงฟิลด์ — โครงร่างสมมติ รอ Data Specification ของ SET</li>
        <li><button class="lnk" data-mango2="evidence">Evidence Pack</button> — รวมทุกอย่างที่แสดงสำหรับแฟ้มการตัดสินใจหนึ่งบริษัท: ข้อมูลกรณี ภาษา CEO บริบทบอร์ด คะแนนพร้อมช่วง 90% Tier/quadrant แถบสถานะ ป้าย กติกา R1–R8 และที่มาของข้อมูล · พิมพ์ / .md / JSON · สิทธิ์ Pro ขึ้นไป</li>
        <li>หน้า <button class="lnk" data-mango2="t561">ร่าง 56-1</button> มีแผง “Structured Data (สำหรับกรอกใน SETLink)” สำหรับส่วนที่ 2 ข้อ 7–8 (ส่งออก JSON / CSV) และแถบขั้นตอน SETLink: กรอก Structured Data → อัปโหลดรูปเล่ม (นอกระบบ) → ตรวจสอบและอนุมัติ → เผยแพร่ (ทำใน SETLink — ระบบนี้ไม่ส่งข้อมูลให้ SET) · รูปแบบฟิลด์สมมติ ตรวจกับแบบฟอร์มจริงก่อนใช้</li>
        <li>หน้า <button class="lnk" data-mango2="valid">Validity</button> แสดงตัวเลขตาม Table 3–5 ของงานวิจัย และ Marginal plot (Moderation Analysis) ของความชันตามสัดส่วนกรรมการหญิง/ครอบครัว</li></ul></section>
    <section class="card" id="man-rcpt"><h3>12 · การเติมเครดิตและใบเสร็จตัวอย่าง</h3>
      <ul class="tr-ol"><li>เลือกแพ็กเกจที่หน้า <button class="lnk" data-mango2="billing">เครดิตและแผน</button> → ยืนยันการชำระเงิน (จำลอง) ในหน้า → ระบบเติมเครดิตและออก<b>ใบเสร็จตัวอย่าง</b> (เลขที่ วันที่ แพ็กเกจ ยอดก่อนภาษี VAT 7% ยอดรวม อีเมลผู้ซื้อ)</li>
        <li>ดูและพิมพ์ใบเสร็จได้จากรายการ “ใบเสร็จตัวอย่าง” · ทุกฉบับมีลายน้ำ <b>“ตัวอย่าง — ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษีจริง”</b> · ระบบชำระเงินจริงเป็นเฟส 2 (Payment API)</li></ul></section>
    <section class="card" id="man-faq"><h3>13 · คำถามที่พบบ่อย</h3>
      ${MAN_FAQ.map(([q, a]) => `<details class="tr-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>
    </div></div>`;
}
function wireManual(h) {
  h.querySelectorAll("[data-mango]").forEach(b => b.onclick = () => { const t = h.querySelector("#" + b.dataset.mango); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
  /* ลิงก์ไปหน้าที่ลงทะเบียนในไฟล์อื่น — ตรวจตอนคลิก (หน้าอาจยังไม่มีในไฟล์ฉบับนี้) */
  h.querySelectorAll("[data-mango2]").forEach(b => b.onclick = () => { const v = b.dataset.mango2;
    if (typeof VIEWS[v] === "function" && $("#v-" + v)) go(v); else toast("หน้านี้ยังไม่พร้อมในไฟล์ฉบับนี้"); });
  if (S._manSec) {
    const id = S._manSec; S._manSec = null;
    setTimeout(() => { const t = h.querySelector("#" + id); if (t) { t.scrollIntoView({ behavior: "smooth", block: "start" }); t.classList.add("tr-flash"); setTimeout(() => t.classList.remove("tr-flash"), 1600); } }, 380);
  }
}
VIEWS.manual = viewManual;
WIRES2.manual = wireManual;

/* ---------------------------------------------------------------- 9 · เมนู และป้ายล็อก */
(() => {
  const bl = NAV.find(n => n.id === "billing"); if (bl) bl.lab = "เครดิตและแผนการใช้งาน";
  if (!NAV.some(n => n.id === "t561")) {
    const i = NAV.findIndex(n => n.id === "followup");
    const it = { id: "t561", g: 2, ico: "✎", lab: "ร่าง 56-1 · Template และการอนุมัติ" };
    if (i >= 0) NAV.splice(i + 1, 0, it); else NAV.push(it);
  }
  if (!NAV.some(n => n.id === "manual")) {
    const i = NAV.findIndex(n => n.g === 3);
    const it = { id: "manual", g: 3, ico: "?", lab: "คู่มือการใช้งาน" };
    if (i >= 0) NAV.splice(i, 0, it); else NAV.push(it);
  }
})();
const CO_LOCK_VIEWS = ["profile", "docs", "fit", "zonec", "matrix", "compass", "ic"];
function navBadge(id) {
  const r = tierRank(), see = canSeeCo(S.t);
  if (CO_LOCK_VIEWS.includes(id)) {
    if (!see) return r < 1 ? ["🔒", "lock"] : [PRICE.report + " เครดิต", "cost"];
    if (id === "fit") return r >= 2 ? null : S.freeCo === S.t ? ["ฟรี", "ok"] : ["เปิดแล้ว", "ok"];
    return null;
  }
  if (r >= 2 && ["peer", "studio", "sector", "t561"].includes(id)) return null;     // Pro Max · รวมใน Subscription
  if (id === "peer" || id === "studio") {
    if (r < 1) return ["Pro", "pro"];
    if (!see) return ["🔒", "lock"];
    return isUnlocked(id) ? ["เปิดแล้ว", "ok"] : [PRICE[id] + " เครดิต", "cost"];
  }
  if (id === "sector") return r < 1 ? ["Pro", "pro"] : r < 2 ? (S.ind !== "all" && isUnlocked("sector", S.ind) ? ["เปิดแล้ว", "ok"] : ["Top 5", "cost"]) : ["เปิดแล้ว", "ok"];
  if (id === "t561") return r < 1 ? ["Pro", "pro"] : r < 2 ? ["ร่าง", "ok"] : ["+อนุมัติ", "ok"];
  if (id === "directives") return r < 2 ? ["Pro Max", "max"] : null;
  if (id === "port") return isUnlocked("port") ? ["เปิดแล้ว", "ok"] : ["🔒", "lock"];
  return null;
}
syncNavLocks = function () {
  $$(".nav button").forEach(b => {
    const id = b.dataset.v, tag = b.querySelector(".lockb");
    b.setAttribute("aria-current", id === S.view ? "page" : "false");
    if (!tag) return;
    const s = navBadge(id);
    tag.textContent = s ? s[0] : ""; tag.style.display = s ? "" : "none";
    tag.dataset.k = s ? s[1] : "";
  });
};
buildNav();

/* ---------------------------------------------------------------- 10 · หน้าเข้าสู่ระบบ — ตัวเลือก 3 ระดับ */
(() => {
  const pp = $("#planPick"); if (!pp) return;
  const set = (k, html) => { const l = pp.querySelector(`[data-plan="${k}"] div`); if (l) l.innerHTML = html; };
  set("free", `<b>Level 1 · Free · ${PLAN_TOKENS.free} เครดิต</b><span>ดูได้เฉพาะบริษัทของคุณ · รายงานวินิจฉัยฉบับเต็มฟรี 1 บริษัท · เมทริกซ์ 2×2 · Validity · BOD Evaluation</span>`);
  set("pro", `<b>Level 2 · Pro (Pay-Per-Use) · ${PLAN_TOKENS.pro} เครดิต</b><span>ปลดล็อกรายบริษัทด้วยเครดิต · Peer 1 vs 3 · What-if 3 ตัวแปร + ตรวจภาษา CEO · ร่าง 56-1</span>`);
  if (!pp.querySelector('[data-plan="max"]')) {
    const l = document.createElement("label");
    l.className = "planopt"; l.dataset.plan = "max";
    l.innerHTML = `<input type="radio" name="plan" value="max"><div><b>Pro Max · Subscription (add-on จาก Pro) · ${PLAN_TOKENS.max} เครดิต</b>
      <span>ทุกบริษัท · เทียบข้ามอุตสาหกรรม · ฉากทัศน์ขาลง · ภาพรวมทั้งอุตสาหกรรม + CSV · Email Approval</span></div>`;
    pp.appendChild(l);
  }
  $$("#planPick .planopt").forEach(l => l.onclick = () => { $$("#planPick .planopt").forEach(x => x.classList.remove("on")); l.classList.add("on"); });
  /* ข้อความเดิมบนหน้าเข้าสู่ระบบยังเป็นราคารอบก่อน (token ขั้นต่ำ 3) — ปรับให้ตรงหัวข้อ 5 */
  const g = $("#gate");
  /* แก้ไขครั้งที่ 2.3 — ไฟล์ออฟไลน์จำลองการล็อกอิน · เวอร์ชันเว็บ (เซิร์ฟเวอร์) ใช้ Google Sign-in จริง */
  if (g && !OIS_SRV) {
    const dv = g.querySelector(".divider"); if (dv) dv.textContent = "ไฟล์ออฟไลน์ · จำลองการล็อกอิน";
    const gb = $("#btnGoogle"); if (gb && !gb.querySelector(".mv-gsim")) gb.insertAdjacentHTML("beforeend", `<span class="mv-gsim">(จำลองในไฟล์ออฟไลน์)</span>`);
    const nt = [...g.querySelectorAll(".note")].find(n => /Google OAuth/.test(n.textContent));
    if (nt) nt.innerHTML = `ไฟล์ HTML ออฟไลน์นี้<b>จำลอง</b>การเข้าสู่ระบบด้วย Google · <b>ในเวอร์ชันเว็บ (เซิร์ฟเวอร์) ใช้ Google Sign-in จริง</b> (OAuth 2.0) และเก็บเฉพาะอีเมลกับรหัสผู้ใช้ ไม่เก็บรหัสผ่าน ·
      แพ็กเกจเครดิตเริ่มต้น 5 เครดิต 490 บาท · การชำระเงินในต้นแบบเป็นการจำลอง (ระบบชำระเงินจริงเป็นเฟส 2)`;
  }
  if (g && document.createTreeWalker) {
    const w = document.createTreeWalker(g, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      if (!/token/.test(n.nodeValue)) continue;
      n.nodeValue = n.nodeValue.replace(/การซื้อ token ขั้นต่ำ 3 token ต่อครั้ง/, "แพ็กเกจเครดิตเริ่มต้น 5 เครดิต 490 บาท · การชำระเงินในต้นแบบเป็นการจำลอง")
        .replace(/เติม token ด้วยมือได้ตลอด/, "เติมเครดิตด้วยมือได้ตลอด (จำลองการชำระเงิน)").replace(/token/g, "เครดิต");
    }
  }
})();

/* ---------------------------------------------------------------- 11 · หลังวาดทุกหน้า — ปุ่มสิทธิ์ และลิงก์ "?" ไปคู่มือ */
const _trRender = render;
render = function () {
  _trRender.apply(this, arguments);
  const host = $("#v-" + S.view); if (!host) return;
  host.querySelectorAll("[data-setplan]").forEach(b => b.onclick = () => { setPlan(b.dataset.setplan); render(); });
  host.querySelectorAll("[data-trco]").forEach(b => b.onclick = () => {
    const t = b.dataset.trco; if (!byT[t]) return;
    S.t = t; S.peers = []; S.wi = null;
    const sc = $("#selCo");
    if (sc && ![...sc.options].some(o => o.value === t)) { S.ind = "all"; if ($("#selInd")) $("#selInd").value = "all"; fillCompanies(); }
    if (sc) sc.value = t;
    save(); syncChrome(); render();
  });
  host.querySelectorAll("[data-trsec]").forEach(b => b.onclick = () => {
    const i = +b.dataset.trsec;
    if (spend("sector", String(i), IND[i])) { S.ind = String(i); if ($("#selInd")) $("#selInd").value = S.ind; fillCompanies(); save(); render(); }
  });
  const ph = host.querySelector(".pagehead");
  if (ph && S.view !== "manual" && !ph.querySelector(".tr-help")) {
    const a = document.createElement("button");
    a.className = "tr-help"; a.type = "button"; a.textContent = "?";
    a.title = "เปิดคู่มือส่วนที่เกี่ยวข้องกับหน้านี้"; a.setAttribute("aria-label", "คู่มือการใช้งานของหน้านี้");
    const sec = MAN_HELP[S.view] || "man-flow";
    a.onclick = () => { S._manSec = sec; go("manual"); };
    ph.appendChild(a);
  }
};

/* ---------------------------------------------------------------- 12 · เริ่มระบบ */
(() => {
  if (!S.user) return;
  try {
    const o = JSON.parse(localStorage.getItem(LS) || "null"), vw = o && o.vw;
    if (vw && VIEWS[vw] && S.view !== vw) { S.view = vw; $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + vw)); }
  } catch (e) { }
  syncChrome(); render();
})();
