/* ============================================================================
   Board Strategy Compass — รายงานหน้าเดียวสำหรับวาระประชุมคณะกรรมการ
   โครงตามตัวอย่าง DISC-SIM-001 และกติกาในเอกสาร 2×2 matrix
     · ระบบเติมได้เฉพาะ "สิ่งที่ข้อมูลแสดง" "สิ่งที่ยังสรุปไม่ได้" "คำถาม" และ "หลักฐานที่ควรตรวจ"
     · ช่อง "ข้อสรุปจากการหารือ" "การดำเนินการ" "ผู้รับผิดชอบ" และ "ผลหลังประชุม"
       ต้องมาจากการประชุมจริงและผู้ใช้กรอกเอง — ห้ามให้ระบบเติมมติขึ้นมา
   ============================================================================ */

/** คำถามประจำช่อง — ดัดแปลงจากงานวิจัย ไม่ใช่แบบวัดที่รับรองแล้ว */
const COMPASS = {
  A: { head: "เปลี่ยนโอกาสเป็นผลลัพธ์",
       sub: "ตรวจความพร้อมในการดำเนินงาน",
       shows: "ภาษาของ CEO เน้นโอกาสสูงกว่าค่าเฉลี่ยฐานอ้างอิง และองค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุนสัญญาณนั้น",
       cannot: "ยังสรุปไม่ได้ว่าบริษัทมีขีดความสามารถในการดำเนินโครงการร่วมพัฒนาได้จริง — คะแนนบอกรูปแบบ ไม่ได้บอกผลการดำเนินงาน",
       qs: ["บริษัทมีหลักเกณฑ์คัดเลือกพันธมิตรและจัดสรรทรัพยากรรองรับทิศทางการเติบโตที่สื่อสารไว้หรือยัง?",
            "บอร์ดติดตามผลโครงการร่วมพัฒนาด้วยตัวชี้วัดใด และใช้เกณฑ์อะไรตัดสินว่าไปต่อ ปรับ หรือหยุด?"],
       ev: ["เกณฑ์คัดเลือกพันธมิตรและตารางเปรียบเทียบทางเลือกที่เสนอต่อบอร์ด",
            "รายงานติดตามโครงการร่วมพัฒนา พร้อมตัวชี้วัดและจุดทบทวน (stage gate)"],
       ask: "จำเป็นต้องปรับรูปแบบรายงานติดตามหรือความถี่ในการทบทวนโครงการหรือไม่?" },
  B: { head: "เติบโตอย่างมีหลักเกณฑ์",
       sub: "ตรวจการกำกับความเสี่ยงของการเติบโต",
       shows: "ภาษาของ CEO เน้นโอกาสสูงกว่าค่าเฉลี่ยฐานอ้างอิง ขณะที่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุนในฐานอ้างอิง",
       cannot: "ยังสรุปไม่ได้ว่าบอร์ดกำกับนวัตกรรมไม่เพียงพอ — ข้อมูลที่ใช้คำนวณเป็นองค์ประกอบของบอร์ด ไม่ใช่กระบวนการทำงานของบอร์ด",
       qs: ["บอร์ดได้รับข้อมูลเพียงพอสำหรับท้าทายสมมติฐานการเติบโตที่ฝ่ายจัดการเสนอหรือไม่?",
            "เกณฑ์อนุมัติ ทบทวน และหยุดโครงการในปัจจุบันเขียนไว้อย่างไร และใครเป็นผู้ใช้เกณฑ์นั้น?"],
       ev: ["เอกสารเสนออนุมัติโครงการและเกณฑ์การอนุมัติที่ใช้จริง",
            "รายงานความเสี่ยงที่เสนอบอร์ด และบันทึกการทบทวนโครงการที่ยังไม่ให้ผล"],
       ask: "ควรกำหนดเกณฑ์หยุดโครงการ (stop criteria) ให้ชัดเจนเป็นลายลักษณ์อักษรหรือไม่?" },
  C: { head: "ทบทวนฐานความพร้อม",
       sub: "ตรวจบริบทก่อนกำหนดการพัฒนา",
       shows: "ทั้งภาษาของ CEO และองค์ประกอบบอร์ดอยู่ด้านระมัดระวังเมื่อเทียบกับฐานอ้างอิง คะแนนที่ได้จึงมาจากความเข้ากันของสองด้าน ไม่ใช่สัญญาณ open innovation",
       cannot: "ยังสรุปไม่ได้ว่ารูปแบบนี้เป็นปัญหา — ความระมัดระวังอาจเหมาะกับช่วงธุรกิจ และโมเดลไม่ได้เห็นข้อมูลภายในทั้งหมด",
       qs: ["รูปแบบการสื่อสารและองค์ประกอบบอร์ดในปัจจุบันเหมาะกับช่วงธุรกิจที่บริษัทอยู่หรือไม่?",
            "มีข้อมูลหรือกิจกรรมใดที่บริษัททำอยู่แล้วแต่โมเดลยังไม่สะท้อน?"],
       ev: ["แผนธุรกิจและวาระบอร์ดย้อนหลัง 2 ปี ที่แสดงลำดับความสำคัญในช่วงนี้",
            "รายการกิจกรรมความร่วมมือกับภายนอกที่เกิดขึ้นจริงแต่ไม่ปรากฏในรายงานประจำปี"],
       ask: "ควรปรับการเปิดเผยข้อมูลกิจกรรมความร่วมมือในรายงานประจำปีให้ครบถ้วนขึ้นหรือไม่?" },
  D: { head: "เปิดมุมมองโอกาส",
       sub: "ตรวจความเชื่อมโยงกับทิศทางองค์กร",
       shows: "องค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุนในฐานอ้างอิง ขณะที่ภาษาของ CEO ยังไม่สะท้อนการมองหาโอกาส",
       cannot: "ยังสรุปไม่ได้ว่าบริษัทพลาดโอกาส — ข้อความในรายงานประจำปีสะท้อนการสื่อสาร ไม่ใช่กิจกรรมทั้งหมดที่เกิดขึ้น",
       qs: ["บริษัทได้เปรียบเทียบแหล่งความรู้และพันธมิตรที่เกี่ยวข้องกับกลยุทธ์ครบถ้วนหรือยัง?",
            "หากเริ่มทดลอง บริษัทพร้อมรับและใช้ความรู้จากพันธมิตรอย่างไร และจะเรียนรู้อะไรเพื่อใช้ตัดสินใจต่อ?"],
       ev: ["รายงานการประชุมคณะทำงานกลยุทธ์ที่กล่าวถึงทางเลือกความร่วมมือ",
            "ร่างโครงการทดลองที่ระบุทีมรับความรู้ สมมติฐาน และตัวชี้วัด"],
       ask: "เห็นชอบให้ฝ่ายกลยุทธ์จัดทำทางเลือกและตรวจความพร้อมภายใน ก่อนเสนอขออนุมัติทดลองโครงการหรือไม่?" },
};

const REFS = [
  "Laursen, K., &amp; Salter, A. (2006). Open for innovation. <i>Strategic Management Journal</i>, 27(2), 131–150. — การค้นหาความรู้ภายนอก",
  "Cohen, W. M., &amp; Levinthal, D. A. (1990). Absorptive capacity. <i>Administrative Science Quarterly</i>, 35(1), 128–152. — ความสามารถรับและใช้ความรู้",
  "Cooper, R. G. (1990). Stage-gate systems. <i>Business Horizons</i>, 33(3), 44–54. — จุดทบทวนโครงการ",
  "Eppler, M. J., &amp; Platts, K. W. (2009). Visual strategizing. <i>Long Range Planning</i>, 42(1), 42–74. — เหตุผลของการใช้ภาพช่วยการหารือกลยุทธ์",
  "Forbes, D. P., &amp; Milliken, F. J. (1999). Cognition and corporate governance. <i>Academy of Management Review</i>, 24(3), 489–505. — กระบวนการทำงานของบอร์ด",
  "Dahlander, L., Gann, D. M., &amp; Wallin, M. W. (2021). How open is innovation? <i>Research Policy</i>, 50(4), 104218. — นิยามความเปิดของนวัตกรรม",
];

/** ช่องที่ผู้ใช้กรอกเอง เก็บแยกตามบริษัท */
const SKEY = () => "sc:" + S.t;
const scGet = () => (S.sc || (S.sc = {}))[SKEY()] || {};
function scSet(k, v) { const o = scGet(); o[k] = v; (S.sc || (S.sc = {}))[SKEY()] = o; save(); }

function viewCompass() {
  const c = cur(), v = verdictOf(c), k = v.quad, z = ZONES[k], cp = COMPASS[k];
  const u = scGet();
  const d = new Date();
  const dstr = d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  const code = k + "-" + c.t + "-" + String(d.getFullYear() + 543).slice(-2);

  const cell = (key, pos) => {
    const zz = ZONES[key], on = key === k;
    return `<div class="cmp-cell${on ? " on" : ""}" style="--zc:${zz.c};grid-area:${pos}">
      ${on ? `<span class="cmp-dot" style="background:${zz.c}"></span>` : ""}
      <b>${zz.l}</b><span>${esc(COMPASS[key].head)}</span></div>`;
  };
  const field = (key, ph, rows) => `<div class="cmp-in" contenteditable="true" role="textbox" aria-label="${esc(ph)}"
    data-f="${key}" data-ph="${esc(ph)}" style="min-height:${rows * 19 + 14}px">${esc(u[key] || "")}</div>`;

  const grid = `<div class="cmp-grid">
      <div class="cmp-ylab">Board Amplification Signal · ต่ำ → สูง</div>
      ${cell("D", "1/2/2/3")}${cell("A", "1/3/2/4")}
      ${cell("C", "2/2/3/3")}${cell("B", "2/3/3/4")}
      <div class="cmp-xlab">CEO Promotion Focus · ต่ำ → สูง</div>
    </div>`;

  return `<div class="cmp">
    <div class="cmp-head">
      <div><b>OpenInnoScore</b><span>Board Strategy Compass / ${esc(z.l).toUpperCase()}</span></div>
      <div class="r"><span class="cmp-badge">ต้นแบบ · ร่างเพื่อพิจารณา</span>
        <span>รหัสรายงาน ${esc(code)} · ฉบับ 01</span><span>จัดทำ ${esc(dstr)}</span></div>
    </div>

    <h2 class="cmp-h1">${esc(cp.head)}</h2>
    <p class="cmp-sub">${esc(c.n)} (${esc(c.t)}) · วาระทบทวนการกำกับดูแลนวัตกรรม · สำหรับคณะกรรมการบริษัท</p>

    <h3 class="cmp-sec">ตำแหน่งจากผลโมเดล</h3>
    <div class="grid g-side-r cmp-pos">
      <div>${grid}
        <div class="cmp-inputs">ค่าป้อน: CEO Promotion Focus ${fmt(wins(c.promo, "P"), 3)} (cP ${fmt(c.cP ?? cpOf(c.promo), 3)}) ·
          amp ${fmt(c.amp, 3)} · B ${fmt(c.B ?? (cpOf(c.promo) * c.amp), 4)} ·
          OpenInnoScore ${fmt(c.ois ?? c.ipi, 1)} (ช่วง 90% ${fmt(v.band[0], 1)}–${fmt(v.band[1], 1)}) · Tier ${v.tier}<br>
          ฐานอ้างอิง ${COMPS.length} บริษัท ปีบัญชี 2566 · ${esc(OIS.version)}</div>
      </div>
      <div class="cmp-panel">
        <b style="color:${z.c}">${esc(z.l)} · ${esc(z.q)}</b>
        <p class="cmp-q">ประเด็นสำหรับบอร์ด: ${esc(cp.sub)}</p>
        <p><b>สิ่งที่ข้อมูลแสดง</b> — ${esc(cp.shows)}</p>
        <p><b>สิ่งที่ยังสรุปไม่ได้</b> — ${esc(cp.cannot)}</p>
        ${v.chips.length ? `<div class="sbchips">${v.chips.map(x => `<span class="chip" title="${esc(x.t)}">${esc(x.k)}</span>`).join("")}</div>` : ""}
        <p class="cmp-note">การอยู่โซนนี้ใช้เป็นจุดเริ่มต้นตั้งคำถาม ไม่ได้ยืนยันว่า CEO หรือบอร์ดมีข้อบกพร่อง ·
          สี่ช่องนี้คือ quadrant ไม่ใช่ควอไทล์อันดับอุตสาหกรรม</p>
      </div>
    </div>

    <h3 class="cmp-sec">คำถามที่ใช้ในการหารือ
      <span class="cmp-tag">คำถามประยุกต์จากงานวิจัย ไม่ใช่แบบวัดที่รับรองแล้ว</span></h3>
    <ol class="cmp-qs">${cp.qs.map((q, i) => `<li>${esc(q)} <span class="cmp-ev">หลักฐาน E0${i + 1}</span></li>`).join("")}</ol>

    <h3 class="cmp-sec">จากหลักฐานสู่การดำเนินการ
      <span class="cmp-tag">ช่องสีขาวเป็นข้อมูลที่ผู้ใช้กรอกและตรวจทานเอง — ระบบไม่เติมมติให้</span></h3>
    <div class="tw"><table class="cmp-tbl"><thead><tr>
      <th style="width:26%">หลักฐานที่ควรตรวจ <span>ระบบเสนอ</span></th>
      <th style="width:25%">ข้อสรุปจากการหารือ <span>ผู้ใช้กรอก</span></th>
      <th style="width:27%">การดำเนินการ / ผลส่งมอบ <span>ผู้ใช้กรอก</span></th>
      <th style="width:22%">ผู้รับผิดชอบ / กำหนดส่ง <span>ผู้ใช้กรอก</span></th></tr></thead><tbody>
      ${cp.ev.map((e, i) => `<tr>
        <td><b>E0${i + 1}</b><br>${esc(e)}<div class="cmp-hint">ระบุเลขที่เอกสาร วันที่ วาระ และหน้าเมื่อแนบเข้ารายงาน</div></td>
        <td>${field("c" + i, "สรุปสิ่งที่บอร์ดหารือจากหลักฐานชิ้นนี้", 4)}</td>
        <td>${field("a" + i, "A0" + (i + 1) + " · งานที่ตกลงกัน และเกณฑ์ว่างานเสร็จเมื่อใด", 4)}</td>
        <td>${field("o" + i, "ผู้รับผิดชอบ · หน่วยงานร่วม · กำหนดส่ง", 4)}</td></tr>`).join("")}
    </tbody></table></div>

    <h3 class="cmp-sec">แผนพัฒนาบอร์ดที่เก็บไว้จากรายงานฉบับนี้
      <span class="cmp-tag">ประเด็นที่กดเพิ่มจะเก็บไว้กับบริษัทนี้ในเครื่องของผู้ใช้เท่านั้น</span></h3>
    ${(u.plan || []).length ? `<ol class="cmp-plan">${(u.plan || []).map((x, i) =>
        `<li><span>${esc(x.t)}</span><span class="cmp-plan-d">เพิ่มเมื่อ ${esc(x.d)}</span>
          <button class="lnk" data-rm="${i}">นำออก</button></li>`).join("")}</ol>`
      : `<p class="cmp-note" style="margin:0 0 10px">ยังไม่มีประเด็นในแผน — กดปุ่มด้านล่างเพื่อเพิ่มคำถามหรือหลักฐานที่ต้องตรวจเข้าแผนพัฒนาบอร์ด</p>`}
    <div class="cmp-tools">
      ${cp.qs.map((q, i) => `<button class="btn g" data-add="${esc(q)}">+ เพิ่มคำถามข้อ ${i + 1} เข้าแผน</button>`).join("")}
      ${cp.ev.map((e, i) => `<button class="btn g" data-add="ตรวจหลักฐาน E0${i + 1} · ${esc(e)}">+ เพิ่มหลักฐาน E0${i + 1} เข้าแผน</button>`).join("")}
      <button class="btn" data-print="1">พิมพ์ / บันทึกเป็น PDF</button>
    </div>

    <h3 class="cmp-sec">เรื่องเสนอให้บอร์ดพิจารณา</h3>
    <p class="cmp-ask">${esc(cp.ask)}</p>
    ${field("res", "มติหรือข้อสรุปหลังการประชุมจริง — กรอกหลังประชุมเท่านั้น", 3)}
    <p class="cmp-status">สถานะ: ${u.res ? "มีบันทึกผลหลังประชุมแล้ว" : "ยังไม่มีมติบอร์ด"} ·
      การเห็นชอบแผนศึกษานี้ไม่ใช่การอนุมัติงบลงทุนหรือรับรองพันธมิตร</p>

    <div class="grid g3 cmp-foot">
      <div><b>ผู้จัดทำและยืนยันข้อสรุป</b>${field("sign", "ฝ่ายกลยุทธ์ / เลขานุการบริษัท", 2)}</div>
      <div><b>การตรวจหลักฐานและถ้อยคำ</b>${field("cg", "ผู้รับผิดชอบงาน CG ที่ตรวจทาน", 2)}</div>
      <div><b>รอบติดตามถัดไป</b>${field("next", "วันที่นำกลับเข้าวาระ", 2)}</div>
    </div>

    <div class="cmp-legal">
      <b>ข้อจำกัดของรายงานฉบับนี้</b> — ตำแหน่งบนกริดคำนวณจากองค์ประกอบคณะกรรมการและภาษาในรายงานประจำปี
      เทียบกับฐานอ้างอิงที่ freeze แล้ว เป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่ความสัมพันธ์เชิงสาเหตุ
      ไม่ใช่ความน่าจะเป็น และไม่ใช่จำนวนกิจกรรม open innovation ที่คาดว่าจะเกิด ·
      ตำแหน่งบนกริดเพียงอย่างเดียวยังไม่ใช่หลักฐานว่าบอร์ดพัฒนาประสิทธิผลสำเร็จ จึงนำไปใช้ในร่าง 56-1
      ได้เฉพาะส่วนกระบวนการประเมิน ประเด็นพัฒนา และการดำเนินการที่เกิดขึ้นจริงและผ่านการตรวจอนุมัติแล้ว ·
      ระบบไม่ใช้ political ties เป็นเหตุผลเชิงบวก และห้ามนำผลไปให้คะแนนกรรมการรายบุคคล
      <div class="cmp-refs"><b>ฐานแนวคิดของคำถามและการออกแบบกริด</b> — งานเหล่านี้รองรับเหตุผลในการออกแบบ
        ไม่ได้รับรองแกนหรือการจัดโซนของโมเดลนี้
        <ol>${REFS.map(r => `<li>${r}</li>`).join("")}</ol></div>
    </div>
  </div>`;
}

function wireCompass(h) {
  h.querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
    const o = scGet(), lst = (o.plan || []).slice();
    if (lst.some(x => x.t === b.dataset.add)) { toast("ประเด็นนี้อยู่ในแผนแล้ว"); return; }
    lst.push({ t: b.dataset.add, d: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) });
    scSet("plan", lst); toast("เพิ่มเข้าแผนพัฒนาบอร์ดแล้ว"); render();
  });
  h.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
    const lst = (scGet().plan || []).slice(); lst.splice(+b.dataset.rm, 1); scSet("plan", lst); render();
  });
  const pr = h.querySelector("[data-print]"); if (pr) pr.onclick = () => window.print();
  h.querySelectorAll(".cmp-in").forEach(el => {
    if (!el.textContent.trim()) el.classList.add("empty");
    el.addEventListener("input", () => el.classList.toggle("empty", !el.textContent.trim()));
    el.addEventListener("blur", () => scSet(el.dataset.f, el.textContent.trim()));
  });
}

VIEWS.compass = viewCompass;
if (typeof WIRES2 === "object" && WIRES2) WIRES2.compass = wireCompass;
NAV.splice(NAV.findIndex(n => n.id === "matrix") + 1, 0,
  { id: "compass", g: 2, ico: "◳", lab: "รายงาน Strategy Compass", lock: "report" });
/* แก้ไขครั้งที่ 2 — เมนูถูกประกอบไปแล้วใน initV2 ก่อนไฟล์นี้ทำงาน จึงต้องประกอบใหม่ ไม่เช่นนั้นปุ่ม Compass ไม่ปรากฏ */
buildNav();
if (S.user) syncNavLocks();
