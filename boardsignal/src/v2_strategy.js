/* ============================================================================
   Board Strategy Compass — Strategy Grid 2×2 และรายงานประเด็นสำหรับบอร์ด
   ตามข้อเสนอของลูกค้า (เอกสาร 2×2 grid · แก้ไขครั้งที่ 2.1)
     · Grid คือ "ประเด็นที่บอร์ดควรหารือ" ไม่ใช่ "ช่องที่ควรย้ายไป"
       (แก้ไขครั้งที่ 2.2: ชั้น "จุดอ้างอิงและเส้นทางย้ายโซน" เป็นตัวเลือกเสริมของ Pro/Pro Max ปิดไว้เป็นค่าเริ่มต้น
        จุดอ้างอิง = ค่ามัธยฐานช่อง Deliver ในอุตสาหกรรมเดียวกัน — ไม่ใช่เป้าหมายที่ระบบแนะนำ)
     · ใต้กราฟ = ประเด็นสำหรับบอร์ด 6 ส่วน: สิ่งที่ข้อมูลแสดง / สิ่งที่ยังสรุปไม่ได้ /
       คำถามสำหรับหารือ (3 ข้อ) / หลักฐานที่ใช้ตรวจ / เรื่องที่ให้บอร์ดพิจารณา / ผลหลังประชุม
     · ระบบเติมได้เฉพาะ 5 ส่วนแรก — "ผลหลังประชุม" มติ ผู้รับผิดชอบ ต้องมาจากการประชุมจริงและผู้ใช้กรอกเอง
     · มุมมองตาม Use case (USECASES / ucLens) ใช้เนื้อหาฐานชุดเดียว (COMPASS) แล้วปรับถ้อยคำตามผู้อ่าน
   ============================================================================ */

/* ============================================================================
   ZONE_CFG — ชื่อช่อง คำอธิบาย และกติกา/ข้อความกลยุทธ์ของ 2×2 ทั้งหมดที่แสดงบนหน้าจอ อยู่ในวัตถุเดียวนี้ (แก้ไขครั้งที่ 2.4)
   ชื่อช่องและกติกากลยุทธ์รอผู้วิจัยยืนยัน (ฉบับทบทวนวรรณกรรมใหม่) — เปลี่ยนที่นี่ที่เดียว แล้ว render() ใหม่ ทุกหน้าจะใช้ชื่อใหม่
     name  = ชื่อที่ลูกค้าใช้อยู่ (Deliver / Discipline / Develop / Discover)
     paper = ชื่อตามบทความวิจัย (OIS.quadName: Amplified drive / Constrained drive / Consistent restraint / Untapped board)
     th · desc = คำอธิบายสั้น/ยาว · head · sub · shows · cannot · qs · ev · ask = เนื้อหาประเด็นสำหรับบอร์ด (มุมมองพื้นฐาน)
     uc.{credit|search|investor} = ถ้อยคำตามมุมมองการใช้งาน
   ZONES[k].l / .th / .q / .d ของ v2_app.js ถูกผูกให้อ่านจากวัตถุนี้ (getter) จึงเปลี่ยนตามทุกจุดที่ใช้ ZONES
   ============================================================================ */
const ZONE_CFG = window.ZONE_CFG = {
  /** แสดงชื่อตามบทความคู่กับชื่อของลูกค้า เช่น "Deliver (A · Amplified drive)" */
  showPaper: true,
  pendingNote: "ชื่อและกติกากลยุทธ์ของแต่ละช่องรอผู้วิจัยยืนยัน (ฉบับทบทวนวรรณกรรมใหม่)",
  A: { name: "Deliver", paper: (OIS.quadName || {}).A || "Amplified drive", th: "เปลี่ยนโอกาสเป็นผลลัพธ์",
       desc: "ภาษาของ CEO เน้นโอกาสสูงกว่าค่าเฉลี่ยฐานอ้างอิง และองค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุนสัญญาณนั้น",
       head: "เปลี่ยนโอกาสเป็นผลลัพธ์",
       sub: "ตรวจความพร้อมในการดำเนินงาน",
       shows: "ข้อความ CEO มีสัญญาณเน้นโอกาสสูงกว่าค่าเฉลี่ยฐานอ้างอิง และสัญญาณบทบาทของโครงสร้างบอร์ดตามโมเดลอยู่เหนือเกณฑ์แบ่ง (amp > 0) — องค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุนสัญญาณนั้นในฐานอ้างอิง",
       cannot: "ยังสรุปไม่ได้ว่าบริษัทมีขีดความสามารถในการดำเนินโครงการร่วมพัฒนาได้จริง — ตำแหน่งบอกรูปแบบของข้อความและองค์ประกอบบอร์ด ไม่ได้บอกผลการดำเนินงาน",
       qs: ["มีหลักเกณฑ์คัดเลือกพันธมิตร จัดสรรทรัพยากร และติดตามผลรองรับทิศทางการเติบโตหรือไม่?",
            "บริษัทสื่อสารเรื่องการเติบโตผ่านพันธมิตรอย่างชัดเจน แล้วบอร์ดมีหลักฐานติดตามการคัดเลือกพันธมิตร การเรียนรู้ และเกณฑ์หยุดโครงการอย่างไร?",
            "ทีมที่รับและใช้ความรู้จากพันธมิตร (absorptive capacity) มีทรัพยากรเพียงพอกับจำนวนโครงการที่เปิดอยู่หรือไม่?"],
       ev: ["เกณฑ์คัดเลือกพันธมิตรและตารางเปรียบเทียบทางเลือกที่เสนอต่อบอร์ด",
            "รายงานติดตามโครงการร่วมพัฒนา พร้อมตัวชี้วัดและจุดทบทวน (stage gate)",
            "แผนจัดสรรงบประมาณและบุคลากรของโครงการร่วมพัฒนาเทียบกับแผนกลยุทธ์"],
       ask: "จำเป็นต้องปรับรูปแบบรายงานติดตามหรือความถี่ในการทบทวนโครงการหรือไม่?" },
  B: { name: "Discipline", paper: (OIS.quadName || {}).B || "Constrained drive", th: "เติบโตอย่างมีหลักเกณฑ์",
       desc: "ภาษาของ CEO เน้นโอกาสสูง แต่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน — ประเด็นสำหรับหารือคือเกณฑ์อนุมัติ ทบทวน และหยุดโครงการ",
       head: "เติบโตอย่างมีหลักเกณฑ์",
       sub: "ตรวจการกำกับดูแลการเติบโต",
       shows: "ข้อความ CEO มีสัญญาณเน้นโอกาสสูง ขณะที่สัญญาณโครงสร้างบอร์ดอยู่ต่ำกว่าเกณฑ์แบ่งของฐานที่ระบุ (amp ≤ 0) — องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุนในฐานอ้างอิง",
       cannot: "ยังสรุปไม่ได้ว่าบอร์ดกำกับนวัตกรรมไม่เพียงพอ — ข้อมูลที่ใช้คำนวณเป็นองค์ประกอบของบอร์ด ไม่ใช่กระบวนการทำงานของบอร์ด",
       qs: ["บอร์ดใช้ข้อมูลและเกณฑ์ใดพิจารณาความเสี่ยงของโครงการร่วมพัฒนากับพันธมิตร?",
            "บอร์ดได้รับข้อมูลเพียงพอสำหรับท้าทายสมมติฐานหรือไม่?",
            "มีเกณฑ์อนุมัติ ทบทวน และหยุดโครงการอย่างไร?"],
       ev: ["เอกสารเสนออนุมัติโครงการ เกณฑ์เลือกพันธมิตร รายงานความเสี่ยง และผลติดตามโครงการ",
            "บันทึกการทบทวนโครงการที่ยังไม่ให้ผล พร้อมเหตุผลที่ไปต่อ ปรับ หรือหยุด"],
       ask: "จำเป็นต้องปรับเกณฑ์อนุมัติหรือรูปแบบรายงานติดตามหรือไม่?" },
  C: { name: "Develop", paper: (OIS.quadName || {}).C || "Consistent restraint", th: "ทบทวนฐานความพร้อม",
       desc: "ทั้งภาษาของ CEO และองค์ประกอบบอร์ดอยู่ด้านระมัดระวัง — คะแนนที่สูงมาจากความเข้ากัน (ผลคูณของค่าลบสองค่า) ไม่ใช่สัญญาณ open innovation",
       head: "ทบทวนฐานความพร้อม",
       sub: "ตรวจบริบทก่อนกำหนดการพัฒนา",
       shows: "ทั้งข้อความ CEO และสัญญาณโครงสร้างบอร์ดอยู่ต่ำกว่าเกณฑ์แบ่งของฐานอ้างอิง — คะแนนที่ได้มาจากความเข้ากันของสองด้าน (ผลคูณของค่าลบสองค่า) ไม่ใช่สัญญาณ open innovation",
       cannot: "ยังสรุปไม่ได้ว่ารูปแบบนี้เป็นปัญหา — ความระมัดระวังอาจเหมาะกับช่วงธุรกิจ และโมเดลไม่ได้เห็นข้อมูลภายในทั้งหมด",
       qs: ["รูปแบบนี้เหมาะกับช่วงธุรกิจหรือไม่?",
            "มีข้อมูลใดที่โมเดลยังไม่สะท้อน?",
            "บอร์ดขาดความรู้หรือกระบวนการใดจริงหรือไม่?"],
       ev: ["แผนธุรกิจและวาระบอร์ดย้อนหลัง 2 ปี ที่แสดงลำดับความสำคัญในช่วงนี้",
            "รายการกิจกรรมความร่วมมือกับภายนอกที่เกิดขึ้นจริงแต่ไม่ปรากฏในรายงานประจำปี",
            "ผลประเมินตนเองของคณะกรรมการ (ระดับคณะ) และ skill matrix ฉบับล่าสุด"],
       ask: "จะเก็บข้อมูลบริบทเพิ่มก่อนกำหนดประเด็นพัฒนาบอร์ด หรือปรับการเปิดเผยกิจกรรมความร่วมมือในรายงานประจำปีให้ครบถ้วนขึ้นหรือไม่?" },
  D: { name: "Discover", paper: (OIS.quadName || {}).D || "Untapped board", th: "เปิดมุมมองโอกาส",
       desc: "องค์ประกอบบอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุน แต่ภาษาของ CEO ยังไม่สะท้อนการบุก",
       head: "เปิดมุมมองโอกาส",
       sub: "ตรวจความเชื่อมโยงกับทิศทางองค์กร",
       shows: "สัญญาณโครงสร้างบอร์ดอยู่เหนือเกณฑ์แบ่ง (amp > 0) ขณะที่ข้อความ CEO มีสัญญาณเน้นโอกาสต่ำกว่าค่าเฉลี่ยฐานอ้างอิง",
       cannot: "ยังสรุปไม่ได้ว่าบริษัทพลาดโอกาส — ข้อความในรายงานประจำปีสะท้อนการสื่อสาร ไม่ใช่กิจกรรมทั้งหมดที่เกิดขึ้น",
       qs: ["บริษัทมีโอกาสร่วมพัฒนากับภายนอกที่ยังไม่ได้พิจารณาหรือไม่?",
            "การสื่อสารของ CEO สะท้อนกลยุทธ์จริงเพียงใด?",
            "หากเริ่มทดลอง บริษัทพร้อมรับและใช้ความรู้จากพันธมิตรอย่างไร และจะเรียนรู้อะไรเพื่อใช้ตัดสินใจต่อ?"],
       ev: ["รายงานการประชุมคณะทำงานกลยุทธ์ที่กล่าวถึงทางเลือกความร่วมมือ",
            "สารจาก CEO ในรายงานประจำปีเทียบกับแผนกลยุทธ์ที่บอร์ดอนุมัติ",
            "ร่างโครงการทดลองที่ระบุทีมรับความรู้ สมมติฐาน และตัวชี้วัด"],
       ask: "เห็นชอบให้ฝ่ายกลยุทธ์จัดทำทางเลือกและตรวจความพร้อมภายใน ก่อนเสนอขออนุมัติทดลองโครงการหรือไม่?" },
};

/* ---------------------------------------------------------------- มุมมองตาม Use case
   เนื้อหาฐานชุดเดียว (COMPASS) → adapt(base, c, k) คืน { qs[3], ev[], ask, askLabel, audience, note }
   ถ้อยคำเชิงความสัมพันธ์ (R7) · ไม่ให้คะแนนรายบุคคล · political ties ไม่ใช่เหตุผลเชิงบวก (R6) */
const UC_TEXT = {
  /* MVP 1 (F3 · #14): มุมมอง UC1 = โปรแกรมความสัมพันธ์กับลูกค้า — คำถามด้านความสัมพันธ์/นวัตกรรมเท่านั้น
     ไม่อ้างถึงคำขอใด ๆ ของลูกค้า และไม่มีคำถามเรื่องแผนชำระคืน (ตัดข้อ 3 เดิม) · ถ้อยคำผ่านกติกาห้ามใช้คำของที่ปรึกษา 14 พ.ย. */
  credit: {
    A: { qs: ["ชวนลูกค้าเล่าว่าเลือกพันธมิตรด้านนวัตกรรมอย่างไร และอยากขยายเครือข่ายความร่วมมือไปทางใดในปีถัดไป",
              "ลูกค้าสื่อสารการเติบโตผ่านพันธมิตรชัดเจน — ชวนคุยว่าคณะกรรมการติดตามการคัดเลือกพันธมิตร การเรียนรู้ และเกณฑ์หยุดโครงการอย่างไร"],
         ev: ["ตัวอย่างโครงการร่วมพัฒนาที่ลูกค้าเปิดเผยต่อสาธารณะ (รายงานประจำปี / ข่าวประกาศ)",
              "บันทึกการพบลูกค้าครั้งล่าสุดขององค์กรนำร่อง"] },
    B: { qs: ["ชวนลูกค้าเล่าว่าคณะกรรมการมีส่วนร่วมกับแผนนวัตกรรมหรือความร่วมมือกับภายนอกอย่างไร และอยากได้มุมมองแบบใดเพิ่ม",
              "ชวนคุยเรื่องการพัฒนาคณะกรรมการและการกำกับดูแล — มีหัวข้อใดที่ลูกค้าอยากแลกเปลี่ยนกับเครือข่ายขององค์กรนำร่อง"],
         ev: ["ส่วนการกำกับดูแลกิจการและองค์ประกอบคณะกรรมการใน 56-1 One Report",
              "บันทึกการพบลูกค้าครั้งล่าสุดขององค์กรนำร่อง"] },
    C: { qs: ["ชวนลูกค้าเล่าว่าช่วงนี้ให้ความสำคัญกับเรื่องใด และมีกิจกรรมความร่วมมือที่ทำอยู่แต่ยังไม่ปรากฏในรายงานประจำปีหรือไม่",
              "สอบถามว่าบริการพื้นฐานที่องค์กรนำร่องให้อยู่ตอบโจทย์ลูกค้าเพียงใด และควรนัดติดตามรอบถัดไปเมื่อใด"],
         ev: ["สารจาก CEO และแผนธุรกิจที่เปิดเผยในรายงานประจำปี",
              "บันทึกการพบลูกค้าครั้งล่าสุดขององค์กรนำร่อง"] },
    D: { qs: ["ชวนประธานกรรมการหรือผู้บริหารเล่าถึงโอกาสร่วมพัฒนากับภายนอกที่สนใจ และสิ่งที่ยังทำให้ไม่ได้เริ่ม",
              "สอบถามความสนใจเข้าร่วมเวิร์กช็อปด้านนวัตกรรมหรือการแลกเปลี่ยนกับเครือข่ายขององค์กรนำร่อง"],
         ev: ["สารจาก CEO ฉบับล่าสุดและแผนกลยุทธ์ที่เปิดเผย",
              "บันทึกการพบลูกค้าครั้งล่าสุดขององค์กรนำร่อง"] },
  },
  search: {
    A: { qs: ["skill matrix ของคณะกรรมการมีทักษะด้านการกำกับความร่วมมือภายนอกและการคัดเลือกพันธมิตรครบถ้วนหรือไม่ และยังขาดทักษะใด?",
              "เมื่อกรรมการครบวาระ องค์ประกอบใหม่จะคงความหลากหลายของมุมมองที่สัมพันธ์กับรูปแบบปัจจุบันอย่างไร (พิจารณาระดับคณะ)?",
              "nomination brief รอบถัดไปจะระบุประสบการณ์ด้านการติดตามโครงการร่วมพัฒนาและการหยุดโครงการเป็นคุณสมบัติที่ต้องการหรือไม่?"],
         ev: ["skill matrix ของคณะกรรมการฉบับล่าสุด",
              "ตารางวาระกรรมการที่จะครบในอีก 1–3 ปี",
              "นโยบายสรรหาและความหลากหลายของคณะกรรมการ"] },
    B: { qs: ["skill matrix มีทักษะด้านการประเมินความเสี่ยงโครงการและการท้าทายสมมติฐานการเติบโตครบถ้วนหรือไม่?",
              "องค์ประกอบคณะกรรมการปัจจุบัน (เช่น จำนวนกรรมการหญิงเทียบ critical mass ≥ 3 คน) สอดคล้องกับนโยบายความหลากหลายที่ประกาศไว้หรือไม่?",
              "nomination brief รอบถัดไปจะเน้นประสบการณ์ด้านเกณฑ์อนุมัติและการติดตามโครงการเติบโตหรือไม่?"],
         ev: ["skill matrix ของคณะกรรมการฉบับล่าสุด",
              "รายงานคณะกรรมการสรรหาฯ และเกณฑ์ที่ใช้ในการสรรหารอบล่าสุด",
              "ตารางวาระกรรมการที่จะครบในอีก 1–3 ปี"] },
    C: { qs: ["ผลประเมินตนเองของคณะกรรมการชี้ว่าขาดความรู้หรือกระบวนการใดจริง ก่อนกำหนดคุณสมบัติกรรมการใหม่?",
              "องค์ประกอบปัจจุบันเหมาะกับช่วงธุรกิจหรือไม่ และแผนธุรกิจระบุช่วงเวลาที่ความต้องการทักษะจะเปลี่ยนไว้หรือไม่?",
              "มีประสบการณ์ของกรรมการที่โมเดลไม่เห็น (ไม่ได้เปิดเผยในรายงานประจำปี) ที่จะบันทึกใน skill matrix หรือไม่?"],
         ev: ["ผลประเมินตนเองของคณะกรรมการ (ระดับคณะ)",
              "skill matrix ของคณะกรรมการฉบับล่าสุด",
              "แผนธุรกิจ 3 ปีที่ใช้กำหนดทักษะที่ต้องการ"] },
    D: { qs: ["คณะกรรมการมีทักษะด้านการมองหาโอกาสและความร่วมมือภายนอกที่ยังไม่ได้ใช้ในวาระกลยุทธ์หรือไม่?",
              "จะเน้นประสบการณ์ด้านการพัฒนาธุรกิจใหม่ใน nomination brief หรือทบทวนบทบาทคณะกรรมการชุดย่อยก่อนสรรหาเพิ่ม?",
              "การสื่อสารของ CEO กับวาระของคณะกรรมการสอดคล้องกันเพียงใด — เป็นประเด็นการทำงานร่วมกันหรือประเด็นองค์ประกอบ?"],
         ev: ["skill matrix ของคณะกรรมการฉบับล่าสุด",
              "กฎบัตรและวาระของคณะกรรมการชุดย่อยด้านกลยุทธ์/นวัตกรรม",
              "นโยบายสรรหาและความหลากหลายของคณะกรรมการ"] },
  },
  investor: {
    A: { qs: ["ขอให้ฝ่ายจัดการอธิบายเกณฑ์คัดเลือกพันธมิตร การจัดสรรทรัพยากร และตัวชี้วัดที่ใช้ติดตามแผนเติบโตผ่านความร่วมมือ",
              "คณะกรรมการมีหลักฐานติดตามการคัดเลือกพันธมิตร การเรียนรู้ และเกณฑ์หยุดโครงการอย่างไร และเปิดเผยต่อผู้ถือหุ้นได้ในระดับใด?",
              "บริษัทจะรายงานความคืบหน้าของโครงการร่วมพัฒนาต่อผู้ถือหุ้นในรูปแบบใดและบ่อยเพียงใด?"],
         ev: ["สารจาก CEO และส่วนกลยุทธ์ใน 56-1 One Report",
              "เอกสาร Opportunity Day และรายงานการประชุมผู้ถือหุ้น",
              "รายงานความยั่งยืน/นวัตกรรมที่เปิดเผย"] },
    B: { qs: ["คณะกรรมการใช้ข้อมูลและเกณฑ์ใดพิจารณาความเสี่ยงของโครงการร่วมพัฒนากับพันธมิตร?",
              "ผู้ถือหุ้นจะเห็นเกณฑ์อนุมัติ ทบทวน และหยุดโครงการเติบโตได้จากการเปิดเผยข้อมูลส่วนใด?",
              "คณะกรรมการได้รับข้อมูลเพียงพอสำหรับท้าทายสมมติฐานการเติบโตหรือไม่ และใช้กลไกใด (เช่น คณะกรรมการชุดย่อย ที่ปรึกษาอิสระ)?"],
         ev: ["ส่วนการบริหารความเสี่ยงใน 56-1 One Report",
              "รายงานคณะกรรมการตรวจสอบ/บริหารความเสี่ยง",
              "ประวัติการลงทุนโครงการใหม่และผลที่เปิดเผย"] },
    C: { qs: ["ฝ่ายจัดการมองว่าแนวทางระมัดระวังในปัจจุบันเหมาะกับช่วงธุรกิจอย่างไร และจะทบทวนเมื่อใด?",
              "มีกิจกรรมความร่วมมือที่บริษัททำอยู่แต่ยังไม่เปิดเผยในรายงานประจำปีหรือไม่?",
              "คณะกรรมการระบุประเด็นพัฒนาของตนจากการประเมินตนเองรอบล่าสุดว่าอย่างไร?"],
         ev: ["ส่วนการประเมินคณะกรรมการใน 56-1 One Report",
              "แผนธุรกิจที่นำเสนอนักลงทุน",
              "ข่าวประกาศความร่วมมือย้อนหลัง 2 ปี"] },
    D: { qs: ["บริษัทได้ประเมินโอกาสร่วมพัฒนากับภายนอกที่ยังไม่ได้ดำเนินการหรือไม่ และใช้เกณฑ์ใดตัดสินใจ?",
              "สารจาก CEO สะท้อนกลยุทธ์ที่คณะกรรมการอนุมัติเพียงใด?",
              "หากเริ่มโครงการทดลอง ผู้ถือหุ้นจะติดตามผลการเรียนรู้ได้อย่างไร?"],
         ev: ["สารจาก CEO และแผนกลยุทธ์ที่เปิดเผย",
              "เอกสาร Opportunity Day / Analyst meeting",
              "ข่าวประกาศความร่วมมือหรือการลงทุนในกิจการใหม่"] },
  },
};
/* ถ้อยคำตามมุมมองการใช้งานย้ายเข้า ZONE_CFG[k].uc — UC_TEXT เหลือเป็นทางเข้าเดิมที่อ่านจาก ZONE_CFG */
["credit", "search", "investor"].forEach(u => ["A", "B", "C", "D"].forEach(k => { (ZONE_CFG[k].uc = ZONE_CFG[k].uc || {})[u] = UC_TEXT[u][k]; }));
["credit", "search", "investor"].forEach(u => { UC_TEXT[u] = {}; ["A", "B", "C", "D"].forEach(k =>
  Object.defineProperty(UC_TEXT[u], k, { enumerable: true, get: () => ZONE_CFG[k].uc[u] })); });
/** เนื้อหาฐานประจำช่อง — ชื่อเดิม COMPASS ชี้ไปที่ ZONE_CFG (วัตถุเดียวกัน) */
const COMPASS = ZONE_CFG;
/** ชื่อช่องที่แสดงบนหน้าจอ — ชื่อของลูกค้า + (รหัส · ชื่อตามบทความ) */
function zoneName(k, short) {
  const z = ZONE_CFG[k]; if (!z) return k;
  return !short && ZONE_CFG.showPaper ? `${z.name} (${k} · ${z.paper})` : z.name;
}
/* ผูก ZONES ของ v2_app.js ให้อ่านจาก ZONE_CFG — ทุกไฟล์ที่ใช้ ZONES[k].l จึงได้ชื่อจากที่เดียว */
["A", "B", "C", "D"].forEach(k => {
  const Z = ZONES[k]; if (!Z) return;
  Object.defineProperty(Z, "l", { configurable: true, enumerable: true, get: () => zoneName(k) });
  Object.defineProperty(Z, "name", { configurable: true, enumerable: true, get: () => ZONE_CFG[k].name });
  Object.defineProperty(Z, "th", { configurable: true, enumerable: true, get: () => `${ZONE_CFG[k].name} — ${ZONE_CFG[k].th}` });
  Object.defineProperty(Z, "q", { configurable: true, enumerable: true, get: () => `${k} ${ZONE_CFG[k].paper}` });
  Object.defineProperty(Z, "d", { configurable: true, enumerable: true, get: () => ZONE_CFG[k].desc });
});
/** ชื่อช่องทั้งหมด (ทั้งชื่อลูกค้าและชื่อตามบทความ) — ใช้ตรวจคำอ้างตำแหน่งก่อนส่งออกร่าง 56-1 */
window.zoneNamesAll = () => ["A", "B", "C", "D"].flatMap(k => [ZONE_CFG[k].name, ZONE_CFG[k].paper]).filter(Boolean);
/* MVP 1 · ขอบเขตฉบับนำร่อง (X #8 #13 #19) — แท็บมุมมองแสดงเฉพาะ UC1 · UC3 · Board Profile
   มุมมอง Executive Search และ Investor ยังอยู่ในโค้ด แต่ซ่อนด้วยค่าตั้งนี้ (ไม่ลบ เพื่อเปิดคืนได้เมื่อมีงานวิจัยรองรับ) */
const GX_PILOT = window.GX_PILOT = { hiddenLenses: ["search", "investor"], order: ["credit", "board", "bankbod"] };
const PRIMARY_UC = window.PRIMARY_UC = ["credit", "board", "bankbod"];
const PRIMARY_UC_NOTE = "ฉบับนำร่อง MVP 1 แสดงเฉพาะมุมมอง UC1 · UC3 และ Board Profile (นอกกลุ่มอ้างอิง)";
const m1SupTH = "ข้อมูลประกอบ — ไม่ใช่ข้อมูลเข้าแบบจำลองการตัดสินใจขององค์กรนำร่อง";
const m1SupEN = "Supporting information — not an input to the pilot organisation's decision models";
const USECASES = [
  { id: "board", lab: "UC3 · ประเมิน OI ของคณะกรรมการ (P1)", en: "UC3 · Board OI evaluation (P1)", short: "UC3 · Board OI evaluation", audience: "เลขานุการบริษัท / คณะกรรมการ", placeable: true,
    adapt: (b) => ({ qs: b.qs.slice(0, 3), ev: b.ev.slice(), ask: b.ask, askLabel: "เรื่องที่ให้บอร์ดพิจารณา",
      audience: "เลขานุการบริษัท / คณะกรรมการ",
      note: "ใช้ประกอบการประเมินตนเองของคณะกรรมการ (BOD Evaluation) ระดับคณะ — ไม่ประเมินกรรมการรายบุคคล" }) },
  { id: "credit", lab: "UC1 · โปรแกรมความสัมพันธ์กับลูกค้า (P2)", en: "UC1 · Client relationship (P2)", short: "UC1 · Client relationship", audience: "RM / ทีมดูแลความสัมพันธ์ลูกค้า", placeable: true,
    adapt: (b, c, k) => ({ qs: UC_TEXT.credit[k].qs, ev: UC_TEXT.credit[k].ev,
      ask: "ข้อมูลประกอบสำหรับ RM — ไม่ใช่ข้อเสนอแนะ · บันทึกคำตอบของลูกค้าและเอกสารที่ได้รับไว้ในรายงานเยี่ยมลูกค้า",
      askLabel: "ข้อมูลประกอบ — ไม่ใช่ข้อเสนอแนะ", audience: "RM / ทีมดูแลความสัมพันธ์ลูกค้า",
      note: "political ties และความเป็นกิจการครอบครัวไม่ใช้เป็นเหตุผลในการตัดสินใจใด ๆ ขององค์กรนำร่อง ไม่ว่าทางบวกหรือทางลบ (R6) · คำถามด้านบนใช้ชวนลูกค้าคุยเรื่องความสัมพันธ์และนวัตกรรม ไม่ใช่เกณฑ์ให้คะแนนลูกค้า" }) },
  { id: "search", lab: "Executive Search / Nomination", short: "Nomination", audience: "ที่ปรึกษาสรรหา / คณะกรรมการสรรหา", placeable: true,
    adapt: (b, c, k) => ({ qs: UC_TEXT.search[k].qs, ev: UC_TEXT.search[k].ev,
      ask: "ประเด็นสำหรับ nomination brief — ทักษะและมุมมองที่คณะกรรมการต้องการในระดับคณะ ไม่ใช่การประเมินหรือจัดอันดับกรรมการรายบุคคล",
      askLabel: "ประเด็นสำหรับ nomination brief", audience: "ที่ปรึกษาสรรหา / คณะกรรมการสรรหา",
      note: "ใช้ข้อมูลระดับคณะเท่านั้น · ไม่ให้คะแนนกรรมการรายบุคคล · political ties ไม่ใช่คุณสมบัติเป้าหมายในการสรรหา (R6) · ความสัมพันธ์ในโมเดลเป็นความสัมพันธ์เชิงสถิติ ไม่ใช่เหตุและผล" }) },
  { id: "investor", lab: "Engagement", short: "Engagement", audience: "ผู้จัดการกองทุน", placeable: true,
    adapt: (b, c, k) => ({ qs: UC_TEXT.investor[k].qs, ev: UC_TEXT.investor[k].ev,
      ask: "ประเด็นสำหรับการประชุม engagement กับฝ่ายจัดการและคณะกรรมการ",
      askLabel: "ประเด็นสำหรับการประชุม engagement", audience: "ผู้จัดการกองทุน",
      note: "ตำแหน่งเป็นความสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่การพยากรณ์ผลตอบแทนหรือราคาหุ้น" }) },
  { id: "bankbod", lab: "Board Profile (นอกกลุ่มอ้างอิง)", en: "Board Profile (outside the reference group)", short: "Board Profile", audience: "เลขานุการบริษัท / คณะกรรมการ", placeable: false,
    adapt: () => null },
];
const gxLensHidden = id => (GX_PILOT.hiddenLenses || []).includes(id);
const gxLensesShown = () => GX_PILOT.order.map(id => USECASES.find(u => u.id === id)).filter(u => u && !gxLensHidden(u.id));
const ucLab = u => (typeof S === "object" && S.lang === "EN" && u.en) ? u.en : u.lab;
function ucLens() {
  const id = gxLensHidden(S.uc) ? "board" : (S.uc || "board");   // มุมมองที่ซ่อนเข้าถึงไม่ได้แม้ผ่านค่าที่จำไว้/ลิงก์ตรง
  return USECASES.find(u => u.id === id) || USECASES[0];
}
/* ============================================================================
   MVP 1 · ส่วนกลางของ W2b (Strategy Grid · Portfolio Matrix · What-if Studio)
   อ่านค่าจากชั้นโมเดลของ W1 (window.PARAM_VERSION · PILOT_LABELS · FY_STATUS · CLIENT_GROUP · SCORE_FIRM · MVP_WHATIF)
   เมื่อยังไม่มี API ใช้ค่าสำรองจากโมเดลในไฟล์ (ไม่แสดงสัมประสิทธิ์) — ถ้อยคำทุกจุดผ่านกติกาห้ามใช้คำ (ที่ปรึกษา 14 พ.ย. 2569)
   ============================================================================ */
const m1EN = () => typeof S === "object" && S.lang === "EN";
const m1T = (en, th) => m1EN() ? en : th;
/** ลงทะเบียนคำแปลของไฟล์นี้ — ชั้นแปลโหลดท้ายสุด จึงรอจนพร้อม */
function m1I18n(d) {
  const go = () => { try { if (window.I18N && typeof window.I18N.load === "function") { window.I18N.load(d); return true; } } catch (e) { } return false; };
  if (!go()) document.addEventListener("DOMContentLoaded", go, { once: true });
}
window.m1I18n = m1I18n;
/** ป้ายจาก PILOT_LABELS (W1) — คีย์ <k>_en / <k>_th หรือ { en, th } · ไม่มีค่า → ข้อความสำรอง */
function m1Lab(k, en, th) {
  const L = window.PILOT_LABELS || {};
  const o = L[k], e = L[k + "_en"], t = L[k + "_th"];
  if (o && typeof o === "object") return m1EN() ? (o.en || en) : (o.th || th);
  if (e || t) return m1EN() ? (e || en) : (t || th);
  if (typeof o === "string") return o;
  return m1EN() ? en : th;
}
const m1Supporting = () => m1Lab("supporting", m1SupEN, m1SupTH);
const m1Ver = () => window.PARAM_VERSION || (typeof OIS === "object" && OIS.version) || "REF928-edit9-20261013";
/** สถานะปีบัญชี (F9 · R3 · G5) — FY_STATUS ของ W1 หรือค่าสำรองจากตาราง validity */
function m1FY(fy) {
  fy = +fy || FY_SHOWN;
  if (typeof window.FY_STATUS === "function") { try { const r = window.FY_STATUS(fy); if (r && r.code) return r; } catch (e) { } }
  const reg = fy > 2023 ? "NYV" : (REGIME[fy] || (fy < 2019 ? "NYV" : "PASS"));
  const lab = { PASS: ["PASS", "PASS"], CAUTION: ["CAUTION", "CAUTION"], FAIL: ["FAIL", "FAIL"], NYV: ["Not yet validated", "ยังไม่ผ่านการตรวจความแม่น"] }[reg] || [reg, reg];
  return { code: reg, label_en: lab[0], label_th: lab[1], rule_en: reg === "FAIL" ? "Normal reading withheld · What-if suspended (R3, G5)" : reg === "NYV" ? "Fiscal year after 2023 — not yet validated" : "",
    whatIfAllowed: reg !== "FAIL", readingAllowed: reg !== "FAIL" };
}
const m1FYCls = st => ({ PASS: "ok", CAUTION: "warn", FAIL: "crit" })[st.code] || "mute";
function m1FYChip(fy, extra) {
  const st = m1FY(fy);
  return `<span class="pill ${m1FYCls(st)} m1b-fy" data-fy="${+fy || FY_SHOWN}" data-fycode="${esc(st.code)}" title="${esc(st.rule_en || "")}">FY${+fy || FY_SHOWN} · ${esc(m1EN() ? st.label_en : (st.label_th || st.label_en))}</span>${extra || ""}`;
}
/** ป้ายนอกกลุ่มอ้างอิง / ยังไม่ตรวจความแม่น */
const m1OutLab = () => m1T("Outside the reference sample", "นอกกลุ่มอ้างอิง (Outside the reference sample)");
const m1NyvLab = () => m1T("Not yet validated", "ยังไม่ผ่านการตรวจความแม่น (Not yet validated)");
/** ประตู JN (G3) — promotion ≥ 0.6858 (P65.7) */
const M1_JN = 0.6858;
/** ข้อมูลนำเข้าของบริษัทใน REF / ชุดแสดงผล → รูปแบบเดียวกับกรณีทดสอบ */
/** ค่าป้อนของ SCORE_FIRM / MVP_WHATIF (คีย์ตามสัญญา API ของ W1 เท่านั้น) — บริษัทในชุดแสดงผลส่ง ticker + ค่าที่ใช้อยู่ (รวมค่าที่ผู้ใช้แก้ใน Zone A) */
const M1_IN_KEYS = ["promotion", "family_share", "political_ties", "female_share", "industry", "fiscal_year", "board_size", "women"];
function m1Pick(inp) { const o = {}; M1_IN_KEYS.forEach(k => { const v = inp[k]; if (v !== undefined && v !== null && v !== "") o[k] = v; }); return o; }
function m1InpOf(c) {
  if (c._client) return m1Pick(c._inp || {});
  return { ticker: c.t, promotion: c.promo, family_share: c.fam, political_ties: c.pol ? 1 : 0, female_share: c.fem };
}
/** ค่าของบริษัทบน Grid (B_EG) — SCORE_FIRM ของ W1 หรือค่าสำรองของบริษัทในชุดแสดงผล */
function m1ScoreOf(c) {
  if (typeof window.SCORE_FIRM === "function" && !c._noScore) {
    try { const r = window.SCORE_FIRM(m1InpOf(c)); if (r && isFinite(r.X) && isFinite(r.Y)) return r; } catch (e) { }
  }
  if (c._scored && isFinite(c._scored.X)) return c._scored;
  const v = typeof verdictOf === "function" && byT[c.t] ? verdictOf(c) : null;
  const ois = c.ois ?? c.ipi, band = (v && v.band) || c.band || null, tier = tierOf(ois);
  const quad = c.quad || zoneOf(c.promo, c.amp);
  const tu = !!band && tierOf(band[0]) !== tierOf(band[1]);
  let t1 = null;
  try { const a = t1Of(c); if (a && isFinite(a.ois)) t1 = { quad: a.quad, ois: a.ois, tier: a.tier, Y: NaN, band90: null }; } catch (e) { }
  return { X: c.dp ?? promoPct(c.promo), Y: c.ap ?? ampPct(c.amp), quad, ois, band90: band, tier, tier_uncertain: tu, t1, _fallback: true };
}
/** เส้นแบ่งของ Grid (เปอร์เซ็นไทล์) — จากชั้นโมเดล (cP = 0 · amp = 0) */
const m1Div = () => ({ x: isFinite(Z_CP) ? Z_CP : 53.8, y: isFinite(Z_AMP) ? Z_AMP : 36.0 });
/** จุดพื้นหลัง REF-928 บนสเกลเปอร์เซ็นไทล์ (ไม่ระบุชื่อ) */
let _m1Bg = null;
function m1BgPts() {
  if (_m1Bg) return _m1Bg;
  const srv = typeof OIS_SRV !== "undefined" && OIS_SRV;
  _m1Bg = REF_PTS.map(p => srv ? { x: +p[0], y: +p[1] + (isFinite(Z_AMP) ? Z_AMP : 0), q: p[2], ind: p[4] }
    : { x: Math.round(midRank(REF_PROMO, q8(p[0])) * 10) / 10, y: Math.round(midRank(REF_AMP, q8(p[1])) * 10) / 10, q: p[2], ind: p[4] });
  return _m1Bg;
}
/** ลูกค้าที่นำเข้าจากหน้า Import (W2a) — localStorage "ois_clients_v1" (ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น) */
function m1Clients() {
  try { const a = JSON.parse(localStorage.getItem("ois_clients_v1") || "[]"); return Array.isArray(a) ? a.filter(x => x && x.ticker) : []; } catch (e) { return []; }
}
window.m1Clients = m1Clients;
/** กลุ่มลูกค้า 1–6 (slide 16) — CLIENT_GROUP ของ W1 หรือกติกาสำรอง */
function m1GroupOf(cl) {
  const inp = Object.assign({ ticker: cl.ticker, name: cl.name, industry: cl.industry, financial: cl.financial, english_letter: cl.english_letter,
    board_table: cl.board_table, fiscal_year: cl.fiscal_year }, cl.inputs || {});
  if (typeof window.CLIENT_GROUP === "function") { try { const g = window.CLIENT_GROUP(inp); if (g && g.group) return g; } catch (e) { } }
  const fy = +(inp.fiscal_year || 0), inRef = !!inp.in_REF928;
  const g = inp.listed === false ? 6 : (inp.financial === true || inp.financial === "yes" || +inp.industry === 8) ? 5
    : (inp.english_letter === false || inp.english_letter === "no") ? 4 : fy > 2023 ? 3 : inRef ? 1 : 2;
  return { group: g, label_en: ["", "In REF-928", "Outside the reference sample", "Outside the reference sample · Not yet validated", "Board Profile only", "Board Profile only", "Not applicable"][g],
    labels: g === 2 ? ["Outside the reference sample"] : g === 3 ? (inRef ? ["Not yet validated"] : ["Outside the reference sample", "Not yet validated"]) : [] };
}
/** ลูกค้าที่นำเข้า → รูปแบบบริษัท (สำหรับ Grid / Portfolio / Studio) */
function m1ClientCo(cl) {
  const inp = Object.assign({ ticker: cl.ticker, name: cl.name, industry: cl.industry, fiscal_year: cl.fiscal_year,
    financial: cl.financial, english_letter: cl.english_letter, board_table: cl.board_table, listed: true }, cl.inputs || {});
  const g = m1GroupOf(cl);
  const promo = +(inp.promotion ?? inp.promo), n = +(inp.board_size || 0), w = +(inp.women ?? NaN);
  const fem = isFinite(+inp.female_share) ? +inp.female_share : (n > 0 && isFinite(w) ? w / n : NaN);
  const co = { t: cl.ticker, n: cl.name || cl.ticker, ind: +inp.industry || 0, promo, fem, fam: +(inp.family_share ?? 0), pol: +(inp.political_ties ?? 0) ? 1 : 0,
    ten: +(inp.tenure ?? NaN), bsize: n > 0 ? n : null, fy: +(inp.fiscal_year || cl.fiscal_year || FY_SHOWN), _client: true, _group: g, _inp: inp, _scored: cl.scored || null };
  if (isFinite(promo) && isFinite(fem)) { try { co.amp = ampOf(co.fam, co.pol, fem, co.ten); co.dp = promoPct(promo); co.ap = ampPct(co.amp);
    co.quad = zoneOf(promo, co.amp); co.ois = oisOf(signalB(promo, co.amp)); co.ipi = Math.round(co.ois); } catch (e) { } }
  return co;
}
window.m1ClientCo = m1ClientCo;
/* ---------------------------------------------------------------- Playbook UC1 (F3) */
const PLAYBOOK_UC1 = window.PLAYBOOK_UC1 = {
  order: ["A", "B", "D", "C"],
  A: { name: ["Growth partner", "พันธมิตรการเติบโต"], body: ["Senior team, innovation network, expansion services", "ทีมผู้บริหารระดับสูง เครือข่ายนวัตกรรม และบริการเพื่อการขยายธุรกิจ"],
       wi: ["What-if is not the main point", "What-if ไม่ใช่ประเด็นหลัก"], nums: true },
  B: { name: ["Unlock", "ปลดล็อก"], body: ["Governance and board-development conversation", "การสนทนาด้านการกำกับดูแลและการพัฒนาคณะกรรมการ"],
       wi: ["What-if only when promotion ≥ 0.686 (G3)", "What-if เฉพาะเมื่อ promotion ≥ 0.686 (G3)"], nums: true, gate: true },
  D: { name: ["Activate", "กระตุ้น"], body: ["Chair-level conversation, innovation workshop", "การสนทนาระดับประธานกรรมการ และเวิร์กช็อปด้านนวัตกรรม"],
       wi: ["No numbers (G3)", "ไม่แสดงตัวเลข (G3)"], nums: false },
  C: { name: ["Maintain", "ดูแลต่อเนื่อง"], body: ["Core efficiency services, yearly follow-up", "บริการด้านประสิทธิภาพพื้นฐาน และติดตามรายปี"],
       wi: ["No numbers (G3)", "ไม่แสดงตัวเลข (G3)"], nums: false },
};
/** ตัวอย่างถ้อยคำที่ใช้ได้ / ห้ามใช้ (G6) — ตัวอย่างห้ามใช้เขียนใหม่ให้ไม่มีคำต้องห้าม */
function m1Wording() {
  return `<div class="m1b-words" role="note">
    <div class="m1b-word ok"><b>${m1T("Allowed (G6)", "ใช้ได้ (G6)")}</b><p>${m1T(
      "In the reference data, a board with 30% women and this level of CEO drive is associated with about 23% more expected open-innovation activity (90% range 16%–31%), other factors held constant.",
      "ในข้อมูลอ้างอิง คณะกรรมการที่มีกรรมการหญิง 30% และระดับแรงขับของ CEO ระดับนี้ สัมพันธ์กับกิจกรรม open innovation ที่คาดหมายสูงขึ้นราว 23% (ช่วง 90% 16%–31%) เมื่อปัจจัยอื่นคงที่")}</p></div>
    <div class="m1b-word no"><b>${m1T("Do not use", "ห้ามใช้")}</b><p>${m1T(
      "“Adding two women will raise innovation by 23% and will improve the client's terms with the pilot organisation.” — causal wording, and a link to the pilot organisation's decisions",
      "“เพิ่มกรรมการหญิงสองคนแล้วนวัตกรรมจะเพิ่ม 23% และเงื่อนไขของลูกค้ากับองค์กรนำร่องจะดีขึ้น” — ถ้อยคำเชิงเหตุ-ผล และโยงไปการตัดสินใจขององค์กรนำร่อง")}</p></div></div>`;
}
/** การ์ด Playbook ของช่อง q (UC1) — selected = ช่องที่เลือกอยู่ */
function m1PlaybookCard(q, opt) {
  opt = opt || {};
  const P = PLAYBOOK_UC1[q]; if (!P) return "";
  const z = ZONES[q];
  return `<div class="m1b-pb${opt.sel ? " sel" : ""}" style="--zc:${z.c}" data-pbq="${q}">
    <div class="m1b-pbh"><span class="m1b-pbq">${q}</span><b>${esc(ZONE_CFG[q].name)} · ${esc(m1T(P.name[0], P.name[1]))}</b></div>
    <p>${esc(m1T(P.body[0], P.body[1]))}</p>
    <span class="pill ${P.nums ? (P.gate ? "warn" : "mute") : "mute"}">${esc(m1T(P.wi[0], P.wi[1]))}</span></div>`;
}
function m1PlaybookAll(selQ) {
  return `<div class="m1b-pbgrid">${PLAYBOOK_UC1.order.map(q => m1PlaybookCard(q, { sel: q === selQ })).join("")}</div>`;
}
window.m1PlaybookCard = m1PlaybookCard; window.m1PlaybookAll = m1PlaybookAll; window.m1Wording = m1Wording;
/** หัวข้อ "ข้อมูลประกอบ" ของมุมมอง UC1 */
const m1SupBadge = () => `<div class="m1b-sup" role="note"><b>${esc(m1Supporting())}</b></div>`;
/* ---------------------------------------------------------------- Grid 2×2 บนสเกลเปอร์เซ็นไทล์ (ใช้ร่วม Strategy Grid · Portfolio Matrix)
   X = เปอร์เซ็นไทล์ CEO Promotion Focus · Y = เปอร์เซ็นไทล์ Board Amplification · เส้นแบ่ง P53.8 / P36.0 (B_EG)
   pts: { x, y, q, t, n, hollow, num, me, sub, data } · shadow: { x0,y0,x,y,label } (B_T1 · CAUTION) · ref: { x, y } (ไม่ใช่เป้าหมาย) */
function m1GridSvg(o) {
  o = o || {};
  const W = o.W || 760, H = o.H || 480, L = 46, R = 16, T = 18, B = 46;
  const X = v => L + clamp(v, 0, 100) / 100 * (W - L - R), Y = v => H - B - clamp(v, 0, 100) / 100 * (H - T - B);
  const dv = m1Div(), cx = X(dv.x), cy = Y(dv.y);
  const sk = `paint-order="stroke" stroke="var(--panel)" stroke-width="3.5" stroke-linejoin="round"`;
  const zk = o.zk || null, selQ = o.selQ || null;
  const rect = (x0, y0, x1, y1, k) => `<rect class="gx-q${k === selQ ? " sel" : ""}" data-q="${k}" x="${Math.min(x0, x1).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}"
      width="${Math.abs(x1 - x0).toFixed(1)}" height="${Math.abs(y1 - y0).toFixed(1)}" fill="${ZONES[k].c}"
      fill-opacity="${k === selQ ? .13 : k === zk ? .08 : .035}"><title>${esc(ZONES[k].l)}</title></rect>`;
  const dotCol = q => ZONES[q] ? ZONES[q].c : "var(--ink-3)";
  const bg = (o.bg || []).map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.1" fill="${dotCol(p.q)}" fill-opacity=".26"/>`).join("");
  const corner = (k, x, y, anc) => `<g class="gx-cl" data-q="${k}"><text x="${x}" y="${y}" font-size="12" font-weight="600" fill="${ZONES[k].c}" text-anchor="${anc}" ${sk}>${esc(ZONES[k].l)}</text>
      ${o.cornerSub ? `<text x="${x}" y="${y + 13}" font-size="9.8" fill="var(--ink-3)" text-anchor="${anc}" ${sk}>${esc(o.cornerSub(k))}</text>` : ""}</g>`;
  const mk = p => {
    const col = p.col || dotCol(p.q), r = p.me ? 11 : p.num ? 8.5 : 6.5;
    const shape = p.hollow
      ? `<circle r="${r}" fill="var(--panel)" stroke="${col}" stroke-width="2.6"/>`
      : `<circle r="${r}" fill="${col}" stroke="var(--panel)" stroke-width="1.5"/>`;
    const num = p.num ? `<text y="${p.me ? 4 : 3.5}" text-anchor="middle" font-size="${p.me ? 12 : 10}" font-weight="600" fill="${p.hollow ? col : "var(--panel)"}">${p.num}</text>` : "";
    return `<g class="mk m1b-mk${p.me ? " me" : ""}${p.hollow ? " hollow" : ""}" tabindex="0" role="button" transform="translate(${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)})"
      data-t="${esc(p.t)}" data-n="${esc(p.n || "")}" data-i="${esc(p.i ?? "")}" data-z="${esc(ZONES[p.q] ? ZONES[p.q].l : "")}" data-q="${p.q || ""}" data-sub="${esc(p.sub || "")}"
      data-hollow="${p.hollow ? 1 : 0}" data-client="${p.client ? 1 : 0}" aria-label="${esc(p.t)}${p.hollow ? " — " + esc(m1OutLab()) : ""}">
      <circle r="${r + 7}" fill="transparent"/>${shape}${num}
      ${p.label ? (() => { const flip = X(p.x) + r + 8 + p.label.length * 6.2 > W - R;      // ป้ายชิดขอบขวา → วางด้านซ้ายของจุด
        return `<text x="${flip ? -(r + 5) : r + 5}" y="4" font-size="11" font-weight="600" fill="var(--ink)" text-anchor="${flip ? "end" : "start"}" ${sk} pointer-events="none">${esc(p.label)}</text>`; })() : ""}</g>`;
  };
  const sh = o.shadow && isFinite(o.shadow.y) ? (() => { const s = o.shadow, x0 = X(s.x0), y0 = Y(s.y0), x1 = X(s.x), y1 = Y(s.y);
    return `<g class="m1b-shadow" pointer-events="none"><line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="3 3"/>
      <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="7" fill="none" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="2 2"/>
      <text x="${(x1 + 11).toFixed(1)}" y="${(y1 + 4).toFixed(1)}" font-size="10" fill="var(--ink-3)" ${sk}>${esc(s.label || "B_T1 · CAUTION")}</text></g>`; })() : "";
  const ref = o.ref && isFinite(o.ref.x) && isFinite(o.ref.y) ? `<g class="tr-path m1b-ref" pointer-events="none">
      ${o.ref.from ? `<line x1="${X(o.ref.from.x).toFixed(1)}" y1="${Y(o.ref.from.y).toFixed(1)}" x2="${X(o.ref.x).toFixed(1)}" y2="${Y(o.ref.y).toFixed(1)}" stroke="var(--brand)" stroke-width="1.4" stroke-dasharray="2 5"/>` : ""}
      <circle cx="${X(o.ref.x).toFixed(1)}" cy="${Y(o.ref.y).toFixed(1)}" r="7" fill="var(--panel)" stroke="var(--brand)" stroke-width="2" stroke-dasharray="3 2"/>
      <text x="${(X(o.ref.x) + 11).toFixed(1)}" y="${(Y(o.ref.y) - 6).toFixed(1)}" font-size="10" fill="var(--brand)" ${sk}>${esc(m1T("Comparison point · not a target", "จุดเปรียบเทียบ · ไม่ใช่เป้าหมาย"))}</text></g>` : "";
  const xl = o.xLabel || m1T("CEO Promotion Focus · percentile in REF-928 →", "CEO Promotion Focus · เปอร์เซ็นไทล์ใน REF-928 →");
  const yl = o.yLabel || m1T("Board amplification · percentile in REF-928 →", "Board amplification · เปอร์เซ็นไทล์ใน REF-928 →");
  const ticks = [0, 25, 50, 75, 100].map(v => `<text x="${X(v).toFixed(1)}" y="${H - B + 14}" font-size="9" fill="var(--ink-3)" text-anchor="middle">${v}</text>
      <text x="${L - 6}" y="${(Y(v) + 3).toFixed(1)}" font-size="9" fill="var(--ink-3)" text-anchor="end">${v}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" class="gx-svg m1b-grid" role="img" aria-label="${esc(m1T("2×2 grid — X CEO Promotion Focus percentile, Y board amplification percentile", "Grid 2×2 — แกนนอนเปอร์เซ็นไทล์ CEO Promotion Focus แกนตั้งเปอร์เซ็นไทล์ Board amplification"))}">
    ${rect(cx, T, W - R, cy, "A")}${rect(cx, cy, W - R, H - B, "B")}${rect(L, T, cx, cy, "D")}${rect(L, cy, cx, H - B, "C")}
    <g pointer-events="none">${bg}
      <line class="m1b-divx" x1="${cx.toFixed(1)}" y1="${T}" x2="${cx.toFixed(1)}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
      <line class="m1b-divy" x1="${L}" y1="${cy.toFixed(1)}" x2="${W - R}" y2="${cy.toFixed(1)}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
      <text x="${(cx + 5).toFixed(1)}" y="${H - B - 6}" font-size="9.5" fill="var(--ink-3)" ${sk}>P${fmt(dv.x, 1)}</text>
      <text x="${W - R - 4}" y="${(cy - 5).toFixed(1)}" font-size="9.5" fill="var(--ink-3)" text-anchor="end" ${sk}>P${fmt(dv.y, 1)}</text>
      ${ticks}</g>
    ${corner("A", cx + 9, T + 15, "start")}${corner("D", cx - 9, T + 15, "end")}
    ${corner("B", cx + 9, H - B - 22, "start")}${corner("C", cx - 9, H - B - 22, "end")}
    ${ref}${sh}
    ${(o.pts || []).filter(p => isFinite(p.x) && isFinite(p.y)).sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0)).map(mk).join("")}
    <text x="${(L + (W - L - R) / 2).toFixed(0)}" y="${H - 10}" font-size="11.5" fill="var(--ink-2)" text-anchor="middle">${esc(xl)}</text>
    <text transform="translate(13,${(T + (H - T - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">${esc(yl)}</text>
  </svg>`;
}
window.m1GridSvg = m1GridSvg;
m1I18n({
  "UC1 · โปรแกรมความสัมพันธ์กับลูกค้า (P2)": "UC1 · Client relationship (P2)",
  "UC3 · ประเมิน OI ของคณะกรรมการ (P1)": "UC3 · Board OI evaluation (P1)",
  "Board Profile (นอกกลุ่มอ้างอิง)": "Board Profile (outside the reference group)",
  "RM / ทีมดูแลความสัมพันธ์ลูกค้า": "RM / client relationship team",
  [m1SupTH]: m1SupEN,
  "ข้อมูลประกอบ — ไม่ใช่ข้อเสนอแนะ": "Supporting information — not a recommendation",
  "ข้อมูลประกอบสำหรับ RM — ไม่ใช่ข้อเสนอแนะ · บันทึกคำตอบของลูกค้าและเอกสารที่ได้รับไว้ในรายงานเยี่ยมลูกค้า": "Supporting information for the RM — not a recommendation · record the client's answers and the documents received in the client visit report",
  "political ties และความเป็นกิจการครอบครัวไม่ใช้เป็นเหตุผลในการตัดสินใจใด ๆ ขององค์กรนำร่อง ไม่ว่าทางบวกหรือทางลบ (R6) · คำถามด้านบนใช้ชวนลูกค้าคุยเรื่องความสัมพันธ์และนวัตกรรม ไม่ใช่เกณฑ์ให้คะแนนลูกค้า": "Political ties and family-business status are never used as reasons in any decision of the pilot organisation, positive or negative (R6) · the questions above open a relationship and innovation conversation with the client; they are not criteria for scoring the client",
  "ชวนลูกค้าเล่าว่าเลือกพันธมิตรด้านนวัตกรรมอย่างไร และอยากขยายเครือข่ายความร่วมมือไปทางใดในปีถัดไป": "Invite the client to describe how it chooses innovation partners and where it would like to extend its collaboration network next year",
  "ลูกค้าสื่อสารการเติบโตผ่านพันธมิตรชัดเจน — ชวนคุยว่าคณะกรรมการติดตามการคัดเลือกพันธมิตร การเรียนรู้ และเกณฑ์หยุดโครงการอย่างไร": "The client communicates growth through partners clearly — talk about how the board tracks partner selection, learning and project stop criteria",
  "ตัวอย่างโครงการร่วมพัฒนาที่ลูกค้าเปิดเผยต่อสาธารณะ (รายงานประจำปี / ข่าวประกาศ)": "Examples of joint-development projects the client has disclosed publicly (annual report / announcements)",
  "บันทึกการพบลูกค้าครั้งล่าสุดขององค์กรนำร่อง": "The pilot organisation's latest client visit note",
  "ชวนลูกค้าเล่าว่าคณะกรรมการมีส่วนร่วมกับแผนนวัตกรรมหรือความร่วมมือกับภายนอกอย่างไร และอยากได้มุมมองแบบใดเพิ่ม": "Invite the client to describe how the board takes part in innovation plans or external collaboration, and which perspectives it would like to add",
  "ชวนคุยเรื่องการพัฒนาคณะกรรมการและการกำกับดูแล — มีหัวข้อใดที่ลูกค้าอยากแลกเปลี่ยนกับเครือข่ายขององค์กรนำร่อง": "Talk about board development and governance — which topics would the client like to exchange with the pilot organisation's network?",
  "ส่วนการกำกับดูแลกิจการและองค์ประกอบคณะกรรมการใน 56-1 One Report": "Corporate governance and board composition sections of the 56-1 One Report",
  "ชวนลูกค้าเล่าว่าช่วงนี้ให้ความสำคัญกับเรื่องใด และมีกิจกรรมความร่วมมือที่ทำอยู่แต่ยังไม่ปรากฏในรายงานประจำปีหรือไม่": "Invite the client to share its current priorities and any collaboration activities not yet visible in the annual report",
  "สอบถามว่าบริการพื้นฐานที่องค์กรนำร่องให้อยู่ตอบโจทย์ลูกค้าเพียงใด และควรนัดติดตามรอบถัดไปเมื่อใด": "Ask how well the core services of the pilot organisation meet the client's needs, and when the next yearly follow-up should be",
  "สารจาก CEO และแผนธุรกิจที่เปิดเผยในรายงานประจำปี": "CEO statement and business plan disclosed in the annual report",
  "ชวนประธานกรรมการหรือผู้บริหารเล่าถึงโอกาสร่วมพัฒนากับภายนอกที่สนใจ และสิ่งที่ยังทำให้ไม่ได้เริ่ม": "Invite the chair or senior management to talk about external co-development opportunities of interest and what has kept them from starting",
  "สอบถามความสนใจเข้าร่วมเวิร์กช็อปด้านนวัตกรรมหรือการแลกเปลี่ยนกับเครือข่ายขององค์กรนำร่อง": "Ask about interest in an innovation workshop or an exchange with the pilot organisation's network",
  "สารจาก CEO ฉบับล่าสุดและแผนกลยุทธ์ที่เปิดเผย": "Latest CEO statement and the disclosed strategic plan",
  [PRIMARY_UC_NOTE]: "The MVP 1 pilot build shows only the UC1, UC3 and Board Profile (outside the reference group) lenses",
});

/** เนื้อหาของช่อง k ตามมุมมองที่เลือก — คืน null เมื่อมุมมองนั้นวางบน Grid ไม่ได้ */
function gxContent(k, c, lens) {
  lens = lens || ucLens();
  const b = COMPASS[k], a = lens.adapt(b, c, k);
  return a ? Object.assign({ head: b.head, sub: b.sub, shows: b.shows, cannot: b.cannot }, a) : null;
}

const REFS = [
  "Laursen, K., &amp; Salter, A. (2006). Open for innovation. <i>Strategic Management Journal</i>, 27(2), 131–150. — การค้นหาความรู้ภายนอก",
  "Cohen, W. M., &amp; Levinthal, D. A. (1990). Absorptive capacity. <i>Administrative Science Quarterly</i>, 35(1), 128–152. — ความสามารถรับและใช้ความรู้",
  "Cooper, R. G. (1990). Stage-gate systems. <i>Business Horizons</i>, 33(3), 44–54. — จุดทบทวนโครงการ",
  "Eppler, M. J., &amp; Platts, K. W. (2009). Visual strategizing. <i>Long Range Planning</i>, 42(1), 42–74. — เหตุผลของการใช้ภาพช่วยการหารือกลยุทธ์",
  "Speier, C. (2006). The influence of information presentation formats on complex task decision-making performance. <i>International Journal of Human-Computer Studies</i>, 64(11), 1115–1131. — เหตุผลของปุ่มดูเป็นตาราง",
  "Forbes, D. P., &amp; Milliken, F. J. (1999). Cognition and corporate governance. <i>Academy of Management Review</i>, 24(3), 489–505. — กระบวนการทำงานของบอร์ด",
  "Heemskerk, K. (2019). Promising avenue or dead end street? A meta analytic review of the Forbes and Milliken model of board behaviour. <i>Corporate Governance</i>, 19(3), 471–489. — หลักฐานรวมของกรอบกระบวนการทำงานของบอร์ด",
  "Gamache, D. L., McNamara, G., Mannor, M. J., &amp; Johnson, R. E. (2015). Motivated to acquire? The impact of CEO regulatory focus on firm acquisitions. <i>Academy of Management Journal</i>, 58(4), 1261–1282. — ที่มาของแกน CEO Promotion Focus (ศึกษาการเข้าซื้อกิจการ ไม่ใช่หลักฐานด้าน open innovation โดยตรง)",
  "Dahlander, L., Gann, D. M., &amp; Wallin, M. W. (2021). How open is innovation? <i>Research Policy</i>, 50(4), 104218. — นิยามความเปิดของนวัตกรรม",
];

/** ช่องที่ผู้ใช้กรอกเอง เก็บแยกตามบริษัท */
const SKEY = () => "sc:" + S.t;
const scGet = () => (S.sc || (S.sc = {}))[SKEY()] || {};
function scSet(k, v) { const o = scGet(); o[k] = v; (S.sc || (S.sc = {}))[SKEY()] = o; save(); }

/* ค่าตั้งของหน้า (มุมมอง Use case · โหมดตาราง) — เก็บคนละกุญแจ เพราะ save() เดิมเขียนทับทั้งก้อน */
const LS_GX = LS + "_gx";
(function gxLoad() {
  try { const o = JSON.parse(localStorage.getItem(LS_GX) || "null") || {};
    if (S.uc === undefined) S.uc = USECASES.some(u => u.id === o.uc) ? o.uc : "board";
    if (S.gxTable === undefined) S.gxTable = !!o.tb;
    S.gxPath = false;            /* F9 · G6: ชั้นจุดอ้างอิงปิดทุกครั้งที่เปิดแอป (ไม่จำค่า) */
    if (S.gxIndCmp === undefined) S.gxIndCmp = !!o.ic;
    if (S.gxMode === undefined) S.gxMode = ["self", "peers", "industry"].includes(o.md) ? o.md : (o.ic ? "industry" : "self");
  } catch (e) { S.uc = S.uc || "board"; S.gxTable = !!S.gxTable; S.gxPath = !!S.gxPath; S.gxIndCmp = !!S.gxIndCmp; S.gxMode = S.gxMode || "self"; }
})();
const _saveGx = save;
save = function () {
  _saveGx();
  try { localStorage.setItem(LS_GX, JSON.stringify({ uc: S.uc || "board", tb: !!S.gxTable, pa: !!S.gxPath, ic: !!S.gxIndCmp, md: S.gxMode || "self" })); } catch (e) { }
};

/* ---------------------------------------------------------------- ส่วนประกอบร่วมของสองหน้า */
const GX_SPLIT = "เกณฑ์แบ่งสูง–ต่ำ: แกนนอนแบ่งที่เปอร์เซ็นไทล์ P53.8 (cP = 0 ค่าเฉลี่ยฐานอ้างอิง) · แกนตั้งแบ่งที่เปอร์เซ็นไทล์ P36.0 (amp = 0 · B_EG) — ทั้งสองแกนเป็นเปอร์เซ็นไทล์ใน REF-928";
m1I18n({ "ตรวจการกำกับดูแลการเติบโต": "Check board oversight of growth", [GX_SPLIT]: "High–low split: the horizontal axis splits at percentile P53.8 (cP = 0, the reference-base mean) · the vertical axis at percentile P36.0 (amp = 0 · B_EG) — both axes are percentiles in REF-928",
  [GX_SPLIT.replace(/^เกณฑ์แบ่งสูง–ต่ำ: /, "")]: "the horizontal axis splits at percentile P53.8 (cP = 0, the reference-base mean) · the vertical axis at percentile P36.0 (amp = 0 · B_EG) — both axes are percentiles in REF-928" });
const GX_X = "CEO Promotion Focus (สัญญาณจากข้อความ) ต่ำ → สูง";
const GX_Y = "สัญญาณบทบาทของโครงสร้างบอร์ดตามโมเดล (Board Amplification Signal) ต่ำ → สูง";
const GX_DISC = "คำถามเหล่านี้เป็นแนวทางสำหรับตรวจสอบต่อ ไม่ใช่ข้อสรุปว่าบริษัทในช่องนั้นมีปัญหาตามที่ถาม · สี่ช่องนี้คือ quadrant ไม่ใช่ควอไทล์อันดับอุตสาหกรรม · ตำแหน่งบน Grid เพียงอย่างเดียวยังไม่ใช่หลักฐานว่าบอร์ดพัฒนาประสิทธิผลสำเร็จ";
const gxToday = () => new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

/** แถบที่มาของข้อมูล — แหล่งข้อมูล ปี กลุ่มเปรียบเทียบ สถานะตรวจคุณภาพ เกณฑ์แบ่ง */
function gxProv(c, v) {
  const ed = isEdited(c.t) || !!c.edited;
  const fy = +(v.fy || c.fy || FY_SHOWN), reg = REGIME[fy];
  const rc = reg === "PASS" ? "ok" : reg === "CAUTION" ? "warn" : reg === "FAIL" ? "crit" : "mute";
  const chips = v.chips.filter(x => !/^amp ≤ 0$/.test(x.k));
  return `<dl class="gx-prov">
    <div><dt>แหล่งข้อมูล</dt><dd>${ed ? `<span class="pill warn">ค่าที่ผู้ใช้แก้ใน Zone A</span> ไม่ใช่ค่าจากฐานข้อมูล`
      : "56-1 One Report / รายงานประจำปี (สารจาก CEO) + องค์ประกอบคณะกรรมการ"}</dd></div>
    <div><dt>ปีบัญชี</dt><dd>พ.ศ. ${fy + 543} (FY${fy}) ${m1FYChip(fy)}</dd></div>
    <div><dt>กลุ่มเปรียบเทียบ</dt><dd>ฐานอ้างอิง REF-928 · 928 บริษัท-ปี · 209 บริษัท · SET นอกกลุ่มการเงิน · ปีบัญชี 2562–2566
      <span class="gx-ver m1b-ver">${esc(m1Ver())}</span></dd></div>
    <div><dt>สถานะตรวจคุณภาพ</dt><dd>${m1FYChip(fy)}
      ${!v.inDomain ? `<span class="pill crit">นอกกลุ่มอ้างอิง</span>` : ""}
      ${chips.filter(x => !/^นอกกลุ่ม/.test(x.k)).map(x => `<span class="chip" title="${esc(x.t)}">${esc(x.k)}</span>`).join("")}</dd></div>
    <div><dt>เกณฑ์แบ่งสูง–ต่ำ</dt><dd>${esc(GX_SPLIT.replace(/^เกณฑ์แบ่งสูง–ต่ำ: /, ""))}</dd></div>
  </dl>`;
}

/** ตัวเลือกมุมมอง Use case */
function gxLensBar() {
  const L = ucLens();
  return `<div class="gx-lens"><div class="gx-lens-h"><span class="seglab">มุมมองการใช้งาน (Use case)</span>
      <span class="gx-aud">ผู้อ่าน: <b>${esc(L.audience)}</b></span></div>
    <div class="seg gx-seg m1b-lens" role="tablist">${gxLensesShown().map(u =>
      `<button role="tab" data-uc="${u.id}" aria-selected="${u.id === L.id}">${esc(ucLab(u))}</button>`).join("")}</div>
    <p class="gx-sm b4-ucnote">${esc(PRIMARY_UC_NOTE)}</p></div>`;
}

/** "สิ่งที่ข้อมูลแสดง" เฉพาะบริษัท — ต่อท้ายข้อความฐานด้วยตำแหน่งจริงเทียบเกณฑ์แบ่ง */
function gxShows(c, k) {
  const cP = c.cP ?? cpOf(c.promo);
  return `${COMPASS[k].shows} · ${c.t}: CEO Promotion Focus เปอร์เซ็นไทล์ ${fmt(c.dp, 0)} ของฐานอ้างอิง (${cP >= 0 ? "เหนือ" : "ต่ำกว่า"}ค่าเฉลี่ย) ·
    สัญญาณโครงสร้างบอร์ด${c.amp > 0 ? "เหนือ" : "ไม่เกิน"}เกณฑ์แบ่ง amp = 0 (เปอร์เซ็นไทล์ ${fmt(c.ap, 0)})`;
}
/** "สิ่งที่ยังสรุปไม่ได้" — ข้อความฐาน + ข้อจำกัดเฉพาะของตำแหน่งนี้ */
function gxCannot(c, v, k) {
  const out = [COMPASS[k].cannot];
  const sp = a => (a[a.length - 1] - a[0]) * .04;
  if (Math.abs(c.cP ?? cpOf(c.promo)) < sp(REF_PROMO) || Math.abs(c.amp) < sp(REF_AMP))
    out.push("ตำแหน่งอยู่ใกล้เส้นแบ่ง — ป้ายช่องอาจเปลี่ยนได้เมื่อค่าป้อนเปลี่ยนเล็กน้อย จึงยังสรุปจากชื่อช่องไม่ได้");
  if (v.chips.some(x => x.k === "tier ไม่แน่นอน")) out.push("ช่วง 90% ของคะแนนคร่อมมากกว่าหนึ่ง tier — ระดับคะแนนยังไม่แน่นอน");
  if (v.chips.some(x => /หลักฐานอ่อน/.test(x.k))) out.push("ในอุตสาหกรรมนี้ ความสัมพันธ์ระหว่างคะแนนกับกิจกรรม open innovation ยังไม่ต่างจากศูนย์อย่างมีนัย");
  if (v.regime && v.regime !== "PASS") out.push(`ปีบัญชีนี้มีผลตรวจ validity = ${v.regime}`);
  return out;
}

/* ---------------------------------------------------------------- Strategy Grid 2×2 */
/* ---------------------------------------------------------------- สิทธิ์และชั้นเสริมของ Grid (แก้ไขครั้งที่ 2.2) */
const gxRank = () => typeof tierRank === "function" ? tierRank() : 2;
/* แก้ไขครั้งที่ 2.3 · มุมมอง 3 แบบตามผู้ว่าจ้าง (1) ดูเฉพาะบริษัท — ทั่วไป (2) เทียบคู่แข่ง 3 ราย — Pro (3) เทียบทั้งอุตสาหกรรม — Pro Max
   ชั้น "จุดอ้างอิงและเส้นทางย้ายโซน" ยังเป็นตัวเลือกเสริมแยก · โหมด (3) แทนกล่องเลือก "เปรียบเทียบอุตสาหกรรม" เดิม */
const GX_MODES = [
  { k: "self", l: "ดูเฉพาะบริษัท", tag: "Basic", need: 0 },
  { k: "peers", l: "เทียบคู่แข่ง 3 ราย", tag: "Pro", need: 1 },
  { k: "industry", l: "เทียบทั้งอุตสาหกรรม", tag: "Pro Max (Subscription)", need: 2 },
];
const gxMode = () => { const m = GX_MODES.find(x => x.k === S.gxMode) || GX_MODES[0]; return gxRank() >= m.need ? m.k : "self"; };
/** Free เห็นเฉพาะตำแหน่งบริษัทตนเอง — ไม่แสดงจุดของบริษัทอื่นที่ระบุชื่อ · คู่เทียบแสดงเฉพาะโหมด "เทียบคู่แข่ง 3 ราย" */
const gxPeersOf = (c, show) => show && gxMode() === "peers"
  ? (typeof peersFor === "function" ? peersFor(c) : (S.peers || [])).map(t => byT[t]).filter(x => x && x.t !== c.t).slice(0, 3) : [];
/** บริษัทอื่นในอุตสาหกรรมเดียวกัน (ชุดแสดงผล) — โหมด "เทียบทั้งอุตสาหกรรม" */
const gxIndCos = (c, show) => show && gxMode() === "industry" ? indComps(c.ind).filter(x => x.t !== c.t && inDomainOf(x.ind)) : [];
/** ชั้นจุดอ้างอิงใช้ได้กับ Pro ขึ้นไป และไม่แสดงในมุมมองธนาคาร (credit / bankbod) */
const gxPathAllowed = L => !["credit", "bankbod"].includes(L.id);   // UC1 / Board Profile: ไม่มีชั้นนี้ · UC3: ปิดเป็นค่าเริ่มต้น
const gxPathOn = (L, show) => show && gxPathAllowed(L) && gxRank() >= 1 && !!S.gxPath;
const gxIndOn = show => show && gxMode() === "industry";
const gxMed = a => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
/** จุดอ้างอิงเชิงเปรียบเทียบ = ค่ามัธยฐาน (P_w, amp) ของ REF-928 ช่อง A ในอุตสาหกรรมเดียวกัน */
function gxRefPoint(c) {
  let pts = REF_PTS.filter(p => p[2] === "A" && p[4] === c.ind), scope = "ind";
  if (pts.length < 5) { pts = REF_PTS.filter(p => p[2] === "A"); scope = "all"; }
  const P = gxMed(pts.map(p => p[0])), A = gxMed(pts.map(p => p[1]));
  /* โหมดเซิร์ฟเวอร์: REF_PTS เป็นสเกลเปอร์เซ็นไทล์ (ไม่มีค่าดิบ) → ใช้ OIS.dlv ที่เซิร์ฟเวอร์คำนวณด้วยนิยามเดียวกับออฟไลน์
     (มัธยฐาน REF-928 ช่อง A ต่ออุตสาหกรรม / "all") ทุกฟิลด์: dp · ap (เปอร์เซ็นไทล์แล้ว) · ipi · n — ห้ามส่ง dp/ap เข้า promoPct/ampPct ซ้ำ */
  if (typeof OIS_SRV !== "undefined" && OIS_SRV) {
    const D = OIS.dlv || {}, d = D[scope === "ind" ? c.ind : "all"] || (scope === "all" ? null : D[c.ind]) || D.all || null;
    return { P, A, srv: true, dlv: !!d, n: d && isFinite(d.n) ? d.n : pts.length, scope: d && d.scope ? d.scope : scope,
      ois: d && isFinite(d.ipi) ? d.ipi : NaN, dp: d && isFinite(d.dp) ? d.dp : NaN, ap: d && isFinite(d.ap) ? d.ap : NaN, quad: "A" };
  }
  const ois = oisOf(signalB(P, A));
  return { P, A, n: pts.length, scope, ois, quad: quadOf(cpOf(P), A) };
}
/** สัดส่วนช่องของอุตสาหกรรมเทียบทั้งฐาน (Pro Max) */
function gxIndShares(ind) {
  const pts = REF_PTS.filter(p => p[4] === ind), N = REF_PTS.length;
  return ["A", "B", "C", "D"].map(k => ({ k, n: pts.filter(p => p[2] === k).length, tot: pts.length,
    all: REF_PTS.filter(p => p[2] === k).length / N }));
}
function gxSvg(c, v, show, selQ, opt) {
  opt = opt || {};
  const L = ucLens(), uc1 = L.id === "credit";
  const peers = gxPeersOf(c, show), others = gxIndCos(c, show);
  const sc = show ? m1ScoreOf(c) : null;
  const bg = m1BgPts().filter(p => !opt.ind || p.ind === c.ind);
  const pts = [];
  others.forEach(x => { const s = m1ScoreOf(x); pts.push({ x: s.X, y: s.Y, q: s.quad, t: x.t, n: x.n, i: fmt(s.ois, 0), col: "var(--s2)", sub: m1T("same industry", "อุตสาหกรรมเดียวกัน") }); });
  peers.forEach((x, i) => { const s = m1ScoreOf(x); pts.push({ x: s.X, y: s.Y, q: s.quad, t: x.t, n: x.n, i: fmt(s.ois, 0), num: i + 2, col: SER[i] }); });
  /* UC1: ลูกค้านอก REF-928 (กลุ่ม 2–3) เป็นวงกลมโปร่ง พร้อมป้าย "Outside the reference sample" */
  if (show && uc1) gxClientPts().forEach(p => pts.push(p));
  if (sc) pts.push({ x: sc.X, y: sc.Y, q: sc.quad, t: c.t, n: c.n, i: fmt(sc.ois, 0), num: 1, me: true, col: "var(--ink)",
    label: c.t + m1T(" · click to open the points", " · คลิกเพื่อเปิดประเด็น") });
  /* D1: B_T1 เป็นเงาสีเทา + CAUTION เฉพาะมุมมอง UC1 */
  const shadow = sc && uc1 && sc.t1 && isFinite(sc.t1.Y) ? { x0: sc.X, y0: sc.Y, x: isFinite(sc.t1.X) ? sc.t1.X : sc.X, y: sc.t1.Y, label: "B_T1 · CAUTION" } : null;
  let ref = null;
  if (opt.ref && sc) { const r = opt.ref; ref = r.srv ? { x: r.dp, y: r.ap } : { x: promoPct(r.P), y: ampPct(r.A) }; ref.from = { x: sc.X, y: sc.Y }; }
  return m1GridSvg({ bg, pts, selQ, zk: sc ? sc.quad : null, shadow, ref,
    cornerSub: k => { const q = QN[k] || [0, 0];
      if (opt.ind) { const n = bg.filter(p => p.q === k).length; return m1T(`this industry n = ${n} · whole base ${fmt(q[1] / REF_PTS.length * 100, 0)}%`, `อุตสาหกรรมนี้ n = ${n} · ทั้งฐาน ${fmt(q[1] / REF_PTS.length * 100, 0)}%`); }
      return m1T(`n = ${q[1]} firm-years · mean OI ${fmt(q[0], 2)}`, `n = ${q[1]} บริษัท-ปี · OI เฉลี่ย ${fmt(q[0], 2)}`); } });
}
/** ลูกค้าที่นำเข้า (ois_clients_v1) ที่วางบน Grid ได้ — กลุ่ม 2–3 เป็นวงกลมโปร่ง · กลุ่ม 1 ทึบ · กลุ่ม 4–6 ไม่วาง */
function gxClientPts() {
  return m1Clients().map(cl => { const co = m1ClientCo(cl), g = co._group.group;
    if (g > 3) return null;
    const s = m1ScoreOf(co); if (!s || !isFinite(s.X) || !isFinite(s.Y)) return null;
    const labs = (co._group.labels || []).length ? co._group.labels : g >= 2 ? ["Outside the reference sample"] : [];
    return { x: s.X, y: s.Y, q: s.quad, t: co.t, n: co.n, i: fmt(s.ois, 0), hollow: g >= 2, sub: labs.join(" · "), client: true,
      label: co.t + (labs.length ? " · " + labs.join(" · ") : "") };
  }).filter(Boolean);
}
/** มุมมองตาราง (Speier 2006) — สี่ช่องของ REF-928 + แถวของบริษัทนี้ */
function gxTable(c, v, show) {
  const N = REF_PTS.length;
  const row = k => { const q = QN[k] || [0, 0];
    return `<tr data-q="${k}" class="gx-trow${show && k === v.quad ? " hl" : ""}"><td><b style="color:${ZONES[k].c}">${ZONES[k].l}</b> · ${esc(COMPASS[k].sub)}
      <div class="gx-sm">${k === "A" || k === "B" ? "CEO สูง" : "CEO ต่ำ"} / ${k === "A" || k === "D" ? "บอร์ดสูง" : "บอร์ดต่ำ"} · ${esc(ZONES[k].q)}</div></td>
      <td class="n">${q[1]}</td><td class="n">${fmt(q[1] / N * 100, 1)}%</td><td class="n">${fmt(q[0], 2)}</td></tr>`; };
  return `<div class="tw"><table class="gx-tbl"><caption>ฐานอ้างอิง REF-928 แยกตามช่อง (n = ${N} บริษัท-ปี) · OI = จำนวนกิจกรรม open innovation เฉลี่ยต่อปีของกลุ่ม</caption>
    <thead><tr><th>ช่อง</th><th class="n">n</th><th class="n">% ของ ${N}</th><th class="n">OI เฉลี่ย</th></tr></thead>
    <tbody>${["A", "B", "C", "D"].map(row).join("")}</tbody></table></div>
    ${show ? `<div class="tw" style="margin-top:10px"><table class="gx-tbl"><caption>ค่าของบริษัทนี้</caption>
      <thead><tr><th>บริษัท</th><th class="n">CEO Promotion Focus (เปอร์เซ็นไทล์)</th><th class="n">Board Amplification (เปอร์เซ็นไทล์)</th><th class="n">OpenInnoScore</th><th class="n">ช่วง 90%</th><th>Tier</th><th>ช่อง</th></tr></thead>
      <tbody><tr class="hl"><td><b>${esc(c.t)}</b></td><td class="n">${fmt(c.dp, 0)}</td>
        <td class="n">${fmt(c.ap ?? ampPct(c.amp), 0)}</td><td class="n"><b>${fmt(c.ois ?? c.ipi, 1)}</b></td>
        <td class="n">${fmt(v.band[0], 1)}–${fmt(v.band[1], 1)}</td><td>${v.tier}</td><td>${ZONES[v.quad].l} (${v.quad})</td></tr></tbody></table></div>`
      : `<p class="gx-sm" style="margin-top:8px">ไม่มีแถวของบริษัท — มุมมองนี้/บริษัทนี้วางบน Grid ไม่ได้ (R4)</p>`}
    ${(() => {
      const md = gxMode(), xs = md === "peers" ? gxPeersOf(c, show) : md === "industry" ? gxIndCos(c, show) : [];
      if (!show || !xs.length) return "";
      const all = [c, ...xs].sort((a, b) => (b.ois ?? b.ipi) - (a.ois ?? a.ipi));
      return `<div class="tw" style="margin-top:10px"><table class="gx-tbl"><caption>${md === "peers" ? "เทียบคู่แข่ง 3 ราย" : "เทียบทั้งอุตสาหกรรม · " + esc(IND[c.ind] || "")} — เรียงตาม OpenInnoScore</caption>
        <thead><tr><th>บริษัท</th><th class="n">OIS</th><th>Tier</th><th>ช่อง</th><th class="n">OIS ในอุตสาหกรรม</th><th>Quartile ในอุตสาหกรรม</th></tr></thead>
        <tbody>${all.map(x => { const oi = x.oisInd ?? oisIndOf(signalB(x.promo, x.amp), x.ind), q = rpQuadOf(x);
          return `<tr${x.t === c.t ? ' class="hl"' : ""}><td><b>${esc(x.t)}</b>${x.ind !== c.ind ? ` <span class="gx-sm">${esc(IND[x.ind])}</span>` : ""}</td><td class="n">${fmt(x.ois ?? x.ipi, 0)}</td>
            <td>${tierOf(x.ois ?? x.ipi)}</td><td>${esc(ZONES[q].l)}</td><td class="n">${fmt(oi, 0)}</td><td>Q${tierOf(oi)}</td></tr>`; }).join("")}</tbody></table></div>`;
    })()}`;
}
const rpQuadOf = x => x.quad || zoneOf(x.promo, x.amp);

/** สถานะที่เลือกใต้กราฟ: ช่องใด และเป็นตำแหน่งของบริษัทหรือเป็นตัวอย่างประจำช่อง */
function gxSel(c, v, show) {
  const s = S.gxSel && S.gxSel.t === c.t ? S.gxSel.q : null;
  const q = s || (show ? v.quad : null);
  return { q, own: show && q === v.quad };
}

/** ประเด็นสำหรับบอร์ด 6 ส่วน */
function gxPanel(c, v, show, sel) {
  const L = ucLens(), u = scGet();
  if (!sel.q) {
    return `<div class="gx-panel gx-off" id="gxPanel">${!L.placeable ? gxBank() : gxOut(c)}
      <p class="gx-sm" style="margin-top:10px">คลิกช่องใดช่องหนึ่งบนกราฟเพื่อดูตัวอย่างคำถามประจำช่อง</p></div>`;
  }
  const k = sel.q, z = ZONES[k];
  const ct = gxContent(k, c, L.placeable ? L : USECASES[0]);
  if (!sel.own) {
    return `<div class="gx-panel gx-ex" id="gxPanel" style="--zc:${z.c}">
      <div class="gx-ph"><span class="gx-exlab">ตัวอย่างคำถามประจำช่อง (ไม่ใช่ตำแหน่งของบริษัทนี้)</span>
        <h3><span style="color:${z.c}">${z.l}</span> · ${esc(ct.sub)}</h3>
        <span class="gx-sm">${k === "A" || k === "D" ? "บอร์ดสูง" : "บอร์ดต่ำ"} / ${k === "A" || k === "B" ? "CEO สูง" : "CEO ต่ำ"} · มุมมอง ${esc(L.placeable ? L.short : USECASES[0].short)}</span></div>
      <div class="gx-part"><b>รูปแบบของช่องนี้</b><p>${esc(COMPASS[k].shows)}</p></div>
      <div class="gx-part"><b>คำถามสำหรับหารือ (3 ข้อ)</b><ol class="gx-qs">${ct.qs.map(q => `<li>${esc(q)}</li>`).join("")}</ol></div>
      <div class="gx-part"><b>หลักฐานที่ใช้ตรวจ</b><ul class="gx-ev">${ct.ev.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>
      <button class="btn s" data-gxq="">${show ? `← กลับไปที่ตำแหน่งของ ${esc(c.t)} (${ZONES[v.quad].l})` : "← กลับไปที่คำอธิบายนอกกลุ่มอ้างอิง"}</button>
    </div>`;
  }
  const addB = (txt, lab) => `<button class="btn g gx-add" data-gxadd="${esc(txt)}" title="${esc(txt)}">+ เพิ่มประเด็นเข้าสู่แผนพัฒนาบอร์ด${lab ? " · " + lab : ""}</button>`;
  const inPlan = t => (u.plan || []).some(x => x.t === t);
  const uc1 = L.id === "credit";
  const pTitle = uc1 ? m1T(`Relationship programme · ${ZONE_CFG[k].name} (${k}) · ${PLAYBOOK_UC1[k].name[0]}`, `โปรแกรมความสัมพันธ์ · ${ZONE_CFG[k].name} (${k}) · ${PLAYBOOK_UC1[k].name[1]}`)
    : m1T(`Points for the board · ${c.t}`, `ประเด็นสำหรับบอร์ด · ${c.t}`);
  return `<div class="gx-panel" id="gxPanel" style="--zc:${z.c}">
    <div class="gx-ph"><span class="gx-exlab on m1b-ptitle">${esc(pTitle)}</span>
      <h3><span style="color:${z.c}">${z.l}</span> · ${esc(ct.sub)}</h3>
      <span class="gx-sm">${m1T("Lens", "มุมมอง")}: ${esc(ucLab(L))} · ${m1T("Reader", "ผู้อ่าน")}: ${esc(ct.audience)}</span></div>
    ${uc1 ? m1SupBadge() + gxCreditNote(c) + `<div class="gx-part m1b-pbwrap"><b>${m1T("Relationship programme by quadrant", "โปรแกรมความสัมพันธ์ตามช่อง")}</b>${m1PlaybookAll(k)}</div>` : ""}
    <div class="gx-part"><b><i>1</i>สิ่งที่ข้อมูลแสดง</b><p>${esc(gxShows(c, k))}</p></div>
    <div class="gx-part"><b><i>2</i>สิ่งที่ยังสรุปไม่ได้</b><ul class="gx-ev">${gxCannot(c, v, k).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <div class="gx-part"><b><i>3</i>คำถามสำหรับหารือ (${ct.qs.length} ข้อ)</b>
      <ol class="gx-qs">${ct.qs.map((q, i) => `<li><span>${esc(q)}</span>
        ${inPlan(q) ? `<span class="pill ok">อยู่ในแผนแล้ว</span>` : addB(q, "คำถามข้อ " + (i + 1))}</li>`).join("")}</ol></div>
    <div class="gx-part"><b><i>4</i>หลักฐานที่ใช้ตรวจ</b>
      <ul class="gx-ev gx-evb">${ct.ev.map((e, i) => { const t = "ตรวจหลักฐาน E0" + (i + 1) + " · " + e;
        return `<li><span><b>E0${i + 1}</b> ${esc(e)}</span>${inPlan(t) ? `<span class="pill ok">อยู่ในแผนแล้ว</span>` : addB(t, "E0" + (i + 1))}</li>`; }).join("")}</ul></div>
    <div class="gx-part"><b><i>5</i>${esc(ct.askLabel)}</b><p class="gx-ask">${esc(ct.ask)}</p>${uc1 ? m1Wording() : ""}</div>
    <div class="gx-part"><b><i>6</i>ผลหลังประชุม</b>
      <label class="gx-sm" for="gxRes">ผู้ใช้กรอกหลังประชุมจริงเท่านั้น — ระบบไม่เติมมติ</label>
      <textarea class="inp gx-res" id="gxRes" rows="3" placeholder="ข้อสรุป มติ ผู้รับผิดชอบ และวันติดตาม — กรอกหลังการประชุมจริง">${esc(u.res || "")}</textarea></div>
    <p class="gx-sm gx-ucnote">${esc(ct.note)}</p>
    ${L.id === "search" ? `<button class="btn s" data-goto="zonec">เปิด Zone C · Board Refresh (ข้อมูลระดับคณะ)</button>` : ""}
    <div class="gx-plan">${(u.plan || []).length ? `<b>แผนพัฒนาบอร์ดของ ${esc(c.t)}</b> · ${(u.plan || []).length} ประเด็น — ดูและแก้ไขในรายงานฉบับเต็ม` :
      `<span class="gx-sm">ยังไม่มีประเด็นในแผนพัฒนาบอร์ดของบริษัทนี้</span>`}
      <button class="btn p" data-goto="compass">เปิดรายงานฉบับเต็ม (Compass)</button></div>
  </div>`;
}
/** มุมมอง UC1 (D1): B_EG เป็นตัวหลักของช่องและ OIS · B_T1 แสดงเป็นเงาสีเทาพร้อมชิป CAUTION เท่านั้น · ไม่มีแถวครอบครัว/political ties */
function gxCreditNote(c) {
  const sc = m1ScoreOf(c), t1 = sc.t1 || (() => { try { return t1Of(c); } catch (e) { return null; } })();
  return `<div class="note gx-cnote m1b-d1"><b>${m1T("Lens formula: B_EG", "สูตรของมุมมองนี้: B_EG")}</b> — ${m1T("quadrant and OIS on this screen come from B_EG (pooled PASS)", "ช่องและ OIS บนหน้านี้มาจาก B_EG (ผ่านเกณฑ์ภาพรวม)")} ·
    <span class="m1b-shadowtxt">${m1T("Shadow", "เงา")} B_T1: ${t1 && isFinite(t1.ois) ? `OIS ${fmt(t1.ois, 1)} · ${m1T("quadrant", "ช่อง")} ${t1.quad}` : m1T("not available", "ไม่มีค่า")}</span>
    <span class="pill warn m1b-caution">CAUTION</span>
    <div class="gx-sm" style="margin-top:4px">${m1T("Political ties and family-business status are context only and are never used as reasons in any decision of the pilot organisation (R6) — those rows are hidden in this lens.",
      "political ties และความเป็นกิจการครอบครัวเป็นข้อมูลบริบท ไม่ใช้เป็นเหตุผลในการตัดสินใจใด ๆ ขององค์กรนำร่อง (R6) — ซ่อนแถวเหล่านี้ในมุมมองนี้")}</div></div>`;
}
/** มุมมอง Board Profile (นอกกลุ่มอ้างอิง) — ไม่วางบน Grid (R4 · D2) */
function gxBank() {
  return `<div class="gx-ph"><span class="gx-exlab on">${esc(m1T("Board Profile (outside the reference group)", "Board Profile (นอกกลุ่มอ้างอิง)"))}</span>
      <h3>${m1T("This lens is not placed on the Grid", "มุมมองนี้ไม่วางตำแหน่งบน Grid")}</h3></div>
    <p class="gx-p">${m1T("REF-928 covers SET firms in industries 1–7 outside the Financials sector. Boards outside that group — Financials, firms without an English letter, or the board under review when it is outside REF-928 — get a descriptive Board Profile only: no position, OIS, tier or What-if (R4, D2). The background points show the quadrant definitions only.",
      "REF-928 ครอบคลุมบริษัท SET อุตสาหกรรม 1–7 นอกกลุ่มธุรกิจการเงิน (Financials) · บอร์ดที่อยู่นอกกลุ่มนี้ — กลุ่มธุรกิจการเงิน บริษัทที่ไม่มีสารภาษาอังกฤษ หรือบอร์ดที่ประเมินซึ่งอยู่นอก REF-928 — ได้เฉพาะ Board Profile เชิงพรรณนา ไม่มีตำแหน่ง OIS tier หรือ What-if (R4, D2) · จุดพื้นหลังแสดงนิยามของช่องเท่านั้น")}</p>
    <p class="gx-p">${m1T("Use the board-level OI-1…OI-6 self-assessment and the descriptive board profile instead · no individual director is assessed · political ties are never a positive reason.",
      "ใช้ชุดคำถามประเมินตนเองระดับคณะ OI-1…OI-6 และโปรไฟล์องค์ประกอบคณะกรรมการเชิงพรรณนาแทน · ไม่ประเมินกรรมการรายบุคคล · political ties ไม่ใช่เหตุผลเชิงบวก")}</p>
    <div class="gx-row"><button class="btn p" data-goto="bod">BOD Self-Assessment (OI-1…6)</button>
      <button class="btn s" data-goto="outdomain">${esc(m1T("Board Profile (outside the reference group)", "Board Profile (นอกกลุ่มอ้างอิง)"))}</button></div>`;
}
function gxOut(c) {
  return `<div class="gx-ph"><span class="gx-exlab on">นอกกลุ่มอ้างอิง</span><h3>${esc(c.t)} อยู่นอกกลุ่มอ้างอิง — ไม่แสดงตำแหน่งบน Grid</h3></div>
    <p class="gx-p">บริษัทนี้อยู่นอกอุตสาหกรรม 1–7 หรือไม่มีสารถึงผู้ถือหุ้นภาษาอังกฤษ (R4) ระบบจึงไม่วางจุดบนกราฟ ·
      ใช้โปรไฟล์เชิงพรรณนาและชุดคำถาม BOD แทน</p>
    <div class="gx-row"><button class="btn p" data-goto="outdomain">${esc(m1T("Board Profile (outside the reference group)", "Board Profile (นอกกลุ่มอ้างอิง)"))}</button>
      <button class="btn s" data-goto="bod">BOD Self-Assessment (OI-1…6)</button></div>`;
}

function viewMatrix2() {
  const c = cur(), v = verdictOf(c), L = ucLens();
  const show = v.inDomain && L.placeable;
  const sel = gxSel(c, v, show);
  const tbl = !!S.gxTable;
  const peers = gxPeersOf(c, show);
  const pathOn = gxPathOn(L, show), indOn = gxIndOn(show);
  const ref = pathOn ? gxRefPoint(c) : null;
  const msg = !v.inDomain ? `<div class="note warn gx-msg"><b>${esc(c.t)} อยู่นอกกลุ่มอ้างอิง</b> — ไม่แสดงจุดของบริษัทบนกราฟ (R4)
        <button class="btn s" data-goto="outdomain">เปิดโหมดนอกกลุ่มอ้างอิง</button></div>`
    : !L.placeable ? `<div class="note warn gx-msg"><b>${esc(m1T("Board Profile (outside the reference group)", "Board Profile (นอกกลุ่มอ้างอิง)"))}</b> — ${m1T("boards outside REF-928 get a descriptive profile only; no point is placed on the Grid (R4)", "บอร์ดนอก REF-928 ได้เฉพาะโปรไฟล์เชิงพรรณนา ไม่วางจุดบนกราฟ (R4)")}
        <button class="btn s" data-goto="bod">OI-1…6</button><button class="btn s" data-goto="outdomain">Board Profile</button></div>` : "";
  const uc1 = L.id === "credit", sc0 = show ? m1ScoreOf(c) : null, clPts = show && uc1 ? gxClientPts() : [];
  return pageHead("Board Strategy Compass · 2×2", "ตำแหน่งบริษัทและประเด็นสำหรับการหารือของบอร์ด",
    `Grid นี้ใช้เปิด <b>ประเด็นสำหรับการหารือของบอร์ด</b> — ไม่ได้บอกว่าบริษัทต้องย้ายไปช่องใด ·
     คลิกจุดของบริษัท (หมายเลข 1) หรือคลิกช่องใดก็ได้ เพื่อดูคำถาม หลักฐานที่ใช้ตรวจ และเรื่องที่ให้พิจารณาใต้กราฟ`)
    + gxLensBar() + (uc1 ? m1SupBadge() : "")
    + `<div class="note warn b4-zpend" role="note"><b>${esc(ZONE_CFG.pendingNote)}</b> · ชื่อบนหน้าจอแสดงทั้งชื่อที่ใช้อยู่และชื่อตามบทความวิจัย เช่น “${esc(zoneName("A"))}”</div>`
    + `<div class="gx-sb">${statusBar(c)}</div>
    <div class="card gx-card">
      <div class="gx-main">
        <div class="gx-plot">
          <div class="gx-tools"><h3>Strategy Grid 2×2 · ${esc(c.t)}</h3>
            <div class="seg" role="tablist" aria-label="รูปแบบการแสดงผล">
              <button data-gxtb="0" aria-selected="${!tbl}">ดูเป็นกราฟ</button>
              <button data-gxtb="1" aria-selected="${tbl}">ดูเป็นตาราง</button></div></div>
          ${msg}
          ${gxModeBar(c, show)}
          ${gxLayerBar(L, show)}
          <div class="gx-svgwrap">${tbl ? gxTable(c, v, show) : gxSvg(c, v, show, sel.q, { ref, ind: indOn })}</div>
          ${tbl ? "" : `<div class="legend gx-legend">
            ${["A", "B", "C", "D"].map(k => `<span><i style="background:${ZONES[k].c};opacity:.55"></i>${esc(ZONES[k].l)}</span>`).join("")}
            ${clPts.some(p => p.hollow) ? `<span class="m1b-lg-hollow"><i style="background:transparent;border:2px solid var(--ink-2);border-radius:99px"></i>${esc(m1OutLab())}${clPts.some(p => /Not yet validated/.test(p.sub)) ? " · " + esc(m1NyvLab()) : ""}</span>` : ""}
            ${sc0 && uc1 && sc0.t1 && isFinite(sc0.t1.Y) ? `<span class="m1b-lg-shadow"><i style="background:transparent;border:2px dashed var(--ink-3);border-radius:99px"></i>B_T1 ${m1T("shadow", "เงา")} <span class="pill warn">CAUTION</span></span>` : ""}
            ${show ? `<span><i style="background:var(--ink);border-radius:99px"></i><b>1</b> ${esc(c.t)} — คลิกเพื่อเปิดประเด็น</span>` : ""}
            ${peers.map((p, i) => `<span><i style="background:${SER[i]};border-radius:99px"></i><b>${i + 2}</b> ${esc(p.t)} (คู่เทียบ)</span>`).join("")}
            ${indOn ? `<span><i style="background:var(--s2);border-radius:99px"></i>บริษัทอื่นใน${esc(IND[c.ind] || "อุตสาหกรรมเดียวกัน")} (${gxIndCos(c, show).length} บริษัท · คลิกเพื่อเปิด)</span>` : ""}</div>`}
          <div class="gx-qpick"><span class="gx-sm">ดูคำถามประจำช่อง:</span>${["D", "A", "C", "B"].map(k =>
            `<button class="btn g${k === sel.q ? " on" : ""}" data-gxq="${k}" style="--zc:${ZONES[k].c}">${ZONES[k].l}${show && k === v.quad ? " ●" : ""}</button>`).join("")}</div>
          <p class="gx-split">${esc(GX_SPLIT)}</p>
          ${ref ? gxPathCard(c, ref) : ""}
          ${indOn ? gxIndCard(c) : ""}
        </div>
        <aside class="gx-side"><div class="gx-sideh">ที่มาของข้อมูลและสถานะตรวจคุณภาพ</div>${gxProv(c, v)}
          <p class="gx-sm">${indOn ? `จุดพื้นหลัง = REF-928 เฉพาะ${esc(IND[c.ind] || "อุตสาหกรรมเดียวกัน")} (ไม่ระบุชื่อ)` : "จุดพื้นหลัง = REF-928 ทั้งชุด (ไม่ระบุชื่อ)"} ·
            ${gxMode() === "peers" ? "วงกลม 2–4 = คู่แข่ง 3 รายที่เลือก (ชุดเดียวกับหน้า “เทียบคู่แข่ง” · คลิกเพื่อเลือกเปิดประเด็นของบริษัทนั้น)"
              : gxMode() === "industry" ? `วงกลมโปร่ง = บริษัทอื่นในอุตสาหกรรมเดียวกัน (ชุดแสดงผลปีบัญชี ${FY_SHOWN + 543})`
              : gxRank() >= 1 ? "มุมมอง “ดูเฉพาะบริษัท” — เลือกมุมมองที่ 2 หรือ 3 เพื่อแสดงบริษัทอื่น" : "ระดับ Basic แสดงเฉพาะตำแหน่งบริษัทของคุณ — ไม่แสดงจุดของบริษัทอื่นที่ระบุชื่อ"}</p></aside>
      </div>
      ${gxPanel(c, v, show, sel)}
      <p class="gx-disc">${esc(GX_DISC)}</p>
      <details class="gx-refs"><summary>ฐานแนวคิดของคำถามและการออกแบบ Grid (${REFS.length} รายการ)</summary>
        <p class="gx-sm">งานเหล่านี้รองรับเหตุผลในการออกแบบ ไม่ได้รับรองแกนหรือการจัดช่องของโมเดลนี้</p>
        <ol>${REFS.map(r => `<li>${r}</li>`).join("")}</ol></details>
    </div>`;
}

/** ตัวเลือกมุมมอง 3 แบบ (segmented control) — ระดับที่ยังไม่มีสิทธิ์แสดงเป็นปุ่มล็อก */
function gxModeBar(c, show) {
  if (!show) return "";
  const r = gxRank(), m = gxMode();
  const btns = GX_MODES.map((x, i) => r >= x.need
    ? `<button role="radio" data-gxmode="${x.k}" aria-checked="${m === x.k}" aria-selected="${m === x.k}"><b>${i + 1}</b> ${esc(x.l)} <span class="mv-modetag">${esc(x.tag)}</span></button>`
    : `<button role="radio" aria-checked="false" class="tr-locked" data-trlock="${x.need >= 2 ? "max" : "pro"}" title="${esc(x.l)} เป็นสิทธิ์ ${esc(x.tag)}">🔒 <b>${i + 1}</b> ${esc(x.l)} <span class="mv-modetag">${esc(x.tag)}</span></button>`).join("");
  let pick = "";
  if (m === "peers") {
    const cur3 = gxPeersOf(c, show).map(x => x.t), same = indComps(c.ind).filter(x => x.t !== c.t).sort((a, b) => b.ipi - a.ipi);
    const other = r >= 2 ? COMPS.filter(x => x.ind !== c.ind).sort((a, b) => a.ind - b.ind || b.ipi - a.ipi) : [];
    const opts = sel => `<optgroup label="อุตสาหกรรมเดียวกัน · ${esc(IND[c.ind] || "")} (ค่าเริ่มต้นตามการจัดกลุ่มของ SET)">${same.map(x =>
        `<option value="${esc(x.t)}"${x.t === sel ? " selected" : ""}>${esc(x.t)} · OIS ${x.ipi}</option>`).join("")}</optgroup>`
      + (other.length ? `<optgroup label="อุตสาหกรรมอื่น (Pro Max)">${other.map(x =>
        `<option value="${esc(x.t)}"${x.t === sel ? " selected" : ""}>${esc(x.t)} · ${esc(IND[x.ind])} · OIS ${x.ipi}</option>`).join("")}</optgroup>` : "");
    pick = `<div class="mv-peerpick" id="gxPeerPick"><span class="gx-sm">คู่แข่ง 3 ราย (เลือกเองได้):</span>
      ${[0, 1, 2].map(i => `<select class="sel" data-gxpeer="${i}" aria-label="คู่แข่งรายที่ ${i + 1}">${opts(cur3[i])}</select>`).join("")}
      <button class="btn g" id="gxPeerAuto">เลือกอัตโนมัติ</button>
      <span class="gx-sm">${r >= 2 ? "Pro Max เลือกข้ามอุตสาหกรรมได้" : "Pro เลือกได้ในอุตสาหกรรมเดียวกัน · ข้ามอุตสาหกรรมเป็นสิทธิ์ Pro Max"} · ใช้ชุดเดียวกับหน้า “เทียบคู่แข่ง”</span></div>`;
  }
  return `<div class="mv-modes"><span class="seglab">มุมมอง</span><div class="seg mv-seg" role="radiogroup" aria-label="มุมมองของ Grid">${btns}</div></div>${pick}`;
}
/** แถบชั้นเสริม — จุดอ้างอิง/เส้นทาง (Pro ขึ้นไป) · การเทียบอุตสาหกรรมย้ายไปเป็นมุมมองที่ 3 */
function gxLayerBar(L, show) {
  if (!show) return "";
  const r = gxRank(), out = [];
  if (gxPathAllowed(L)) out.push(r >= 1
    ? `<label class="tr-tog"><input type="checkbox" id="gxPathTog"${S.gxPath ? " checked" : ""}> แสดงจุดอ้างอิงและเส้นทางย้ายโซน</label>`
    : `<button class="btn g tr-locked" data-trlock="pro" title="ชั้นนี้เป็นสิทธิ์ Pro / Pro Max">🔒 แสดงจุดอ้างอิงและเส้นทางย้ายโซน · Pro</button>`);
  return out.length ? `<div class="tr-layers"><span class="gx-sm">ชั้นข้อมูลเสริม:</span>${out.join("")}</div>` : "";
}
/** การ์ดใต้กราฟเมื่อเปิดชั้นจุดอ้างอิง — ระยะห่างรายแกน (ถ้อยคำเชิงความสัมพันธ์) และคะแนน ณ จุดอ้างอิง */
function gxPathCard(c, ref) {
  /* ออฟไลน์: แปลงค่าดิบเป็นเปอร์เซ็นไทล์ · เซิร์ฟเวอร์: ใช้ c.dp / c.ap และ ref.dp / ref.ap (เป็นเปอร์เซ็นไทล์อยู่แล้ว) */
  const srv = !!ref.srv;
  const cX = srv ? c.dp : promoPct(c.promo), rX = srv ? ref.dp : promoPct(ref.P);
  const cY = srv ? (c.ap ?? ampPct(c.amp)) : ampPct(c.amp), rY = srv ? ref.ap : ampPct(ref.A);
  const row = (l, a, b) => { if (!isFinite(a) || !isFinite(b)) return `<tr><td>${esc(l)}</td><td class="n">${isFinite(a) ? fmt(a, 0) : "—"}</td><td class="n">${isFinite(b) ? fmt(b, 0) : "—"}</td><td class="n">—</td><td>ยังไม่มีค่าจากเซิร์ฟเวอร์</td></tr>`;
    const d = Math.round((b - a) * 10) / 10;
    return `<tr><td>${esc(l)}</td><td class="n">${fmt(a, 0)}</td><td class="n">${fmt(b, 0)}</td>
      <td class="n"><b>${d > 0 ? "+" : ""}${fmt(d, 0)}</b></td>
      <td>${d > 0 ? "บริษัทในช่อง " + ZONE_CFG.A.name + " กลุ่มนี้มีค่ากลางสูงกว่า" : d < 0 ? "บริษัทนี้สูงกว่าค่ากลางของช่อง " + ZONE_CFG.A.name + " กลุ่มนี้" : "ใกล้เคียงกัน"}</td></tr>`; };
  return `<div class="tr-pathcard">
    <div class="tr-pathh"><b>จุดอ้างอิงเชิงเปรียบเทียบ (ค่ามัธยฐานช่อง ${esc(ZONE_CFG.A.name)} ในอุตสาหกรรมเดียวกัน) — ใช้เทียบระยะห่างเท่านั้น ไม่ใช่เป้าหมาย</b>
      ${ref.scope === "all" ? `<span class="pill warn">ช่อง ${esc(ZONE_CFG.A.name)} ในอุตสาหกรรมนี้มีน้อยกว่า 5 บริษัท-ปี — ใช้มัธยฐานทั้งฐานแทน</span> <span class="pill mute" id="gxRefN">n = ${ref.n} บริษัท-ปี</span>` : `<span class="pill mute" id="gxRefN">n = ${ref.n} บริษัท-ปี</span>`}</div>
    <div class="grid g2 tight" style="gap:12px;align-items:start">
      <div><div class="tr-k">ระยะห่างบนแต่ละแกน (เปอร์เซ็นไทล์ในฐานอ้างอิง)</div>
        <div class="tw"><table class="tr-tbl"><thead><tr><th>แกน</th><th class="n">${esc(c.t)}</th><th class="n">จุดอ้างอิง</th><th class="n">ระยะห่าง</th><th>อ่านว่า</th></tr></thead>
          <tbody>${row("CEO Promotion Focus (แกนนอน)", cX, rX)}${row("Board Amplification Signal (แกนตั้ง)", cY, rY)}</tbody></table></div></div>
      <div><div class="tr-k">คะแนน ณ จุดอ้างอิง</div>
        <div class="tr-refois"><span class="num" id="gxRefOis">${isFinite(ref.ois) ? fmt(ref.ois, 0) : "—"}</span><span>OpenInnoScore ณ จุดอ้างอิง · ${esc(c.t)} ปัจจุบัน ${fmt(c.ois ?? c.ipi, 0)}</span></div>
        <p class="gx-sm" style="margin:6px 0 0">เส้นประคือระยะห่างเชิงตำแหน่งบนกราฟ ไม่ใช่เส้นทางที่ต้องเดินตาม ·
          บริษัทในช่อง ${esc(ZONE_CFG.A.name)} ของกลุ่มเดียวกัน<b>มีความสัมพันธ์</b>กับตำแหน่งนี้ในข้อมูลย้อนหลัง — ไม่ได้แปลว่าการขยับค่าบนแกนจะทำให้ย้ายช่องหรือเกิดนวัตกรรมเพิ่ม ·
          ประเด็นสำหรับบอร์ดด้านล่างยังเป็นเนื้อหาหลักของหน้า</p></div>
    </div></div>`;
}
/** การ์ดสัดส่วนช่องของอุตสาหกรรม (Pro Max) */
function gxIndCard(c) {
  const sh = gxIndShares(c.ind), tot = sh[0].tot || 1;
  return `<div class="tr-pathcard"><div class="tr-pathh"><b>สัดส่วนสี่ช่องใน${esc(IND[c.ind] || "อุตสาหกรรมนี้")} เทียบทั้งฐาน REF-928</b>
      <span class="pill blue">Pro Max</span><span class="pill mute">n = ${tot} บริษัท-ปี</span></div>
    <div class="tr-shares">${sh.map(x => `<div class="tr-share"><span style="color:${ZONES[x.k].c}"><b>${esc(ZONES[x.k].l)}</b></span>
      <div class="mbar"><span style="width:${(x.n / tot * 100).toFixed(1)}%;background:${ZONES[x.k].c}"></span></div>
      <span class="num">${fmt(x.n / tot * 100, 0)}%</span><span class="gx-sm">ทั้งฐาน ${fmt(x.all * 100, 0)}%</span></div>`).join("")}</div>
    ${(() => { const pool = indComps(c.ind).slice().sort((a, b) => b.ipi - a.ipi), k = pool.findIndex(x => x.t === c.t) + 1,
        oi = c.oisInd ?? oisIndOf(signalB(c.promo, c.amp), c.ind), q = tierOf(oi);
      return `<p class="gx-sm mv-indrank" style="margin:8px 0 0"><b>${esc(c.t)}</b>: อันดับ OIS #${k} จาก ${pool.length} บริษัทในชุดแสดงผลของกลุ่มนี้ ·
        Quartile ในอุตสาหกรรม <b>Q${q}</b> (OIS ในอุตสาหกรรม ${fmt(oi, 0)} · เทียบ REF-928 เฉพาะกลุ่มเดียวกัน)</p>`; })()}
    <p class="gx-sm" style="margin:6px 0 0">จุดพื้นหลังบนกราฟกรองเหลือเฉพาะอุตสาหกรรมเดียวกัน (ไม่ระบุชื่อ) · วงกลมโปร่ง = บริษัทในชุดแสดงผล · สัดส่วนเป็นการพรรณนาฐานอ้างอิง ไม่ใช่การจัดอันดับ</p></div>`
    + b4NeighCard(c);
}

/* ---------------------------------------------------------------- บริษัทคะแนนใกล้เคียง (Pro Max · แก้ไขครั้งที่ 2.4)
   ตามที่ประชุม: Pro Max ดูบริษัทที่คะแนนอยู่ติดกัน (เช่น อันดับ 3 และ 4) เพื่อศึกษารูปแบบเชิงกลยุทธ์ของกลุ่มนั้น
   · ในอุตสาหกรรมเดียวกัน = อันดับเหนือ/ใต้บริษัทนี้ ±B4_NEAR_IND อันดับ · ทั้งตลาด (ทุกอุตสาหกรรมในกลุ่มอ้างอิง) = ±B4_NEAR_ALL อันดับ
   · แสดงรูปแบบ (ช่อง 2×2 · บริบทองค์ประกอบบอร์ด) และคำถามสำหรับหารือ — ไม่จัดว่าแบบใดดีกว่า */
const B4_NEAR_IND = 2, B4_NEAR_ALL = 2;
const b4Ois = x => x.ois ?? x.ipi;
function b4Neigh(c) {
  const rankIn = pool => { const s = pool.slice().sort((a, b) => b4Ois(b) - b4Ois(a) || String(a.t).localeCompare(b.t)); return { s, k: s.findIndex(x => x.t === c.t) }; };
  const around = (pool, n) => { const { s, k } = rankIn(pool); if (k < 0) return { rows: [], k: -1, N: s.length };
    return { rows: s.slice(Math.max(0, k - n), k + n + 1).map(x => ({ x, r: s.indexOf(x) + 1, me: x.t === c.t })), k: k + 1, N: s.length }; };
  const ind = around(indComps(c.ind).filter(x => inDomainOf(x.ind)), B4_NEAR_IND);
  const all = around(COMPS.filter(x => inDomainOf(x.ind)), B4_NEAR_ALL);
  return { ind, all };
}
const b4Med = a => { const b = a.filter(v => isFinite(v)).sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
function b4NeighTable(rows, c, cap) {
  const q = x => x.quad || zoneOf(x.promo, x.amp);
  const ctx = !(typeof ucLens === "function" && ucLens().id === "credit");    // D1: UC1 ซ่อนแถวครอบครัว / political ties
  return `<div class="tw"><table class="tr-tbl b4-ntbl"><caption>${esc(cap)}</caption>
    <thead><tr><th class="n">อันดับ</th><th>บริษัท</th><th class="n">OIS</th><th>ช่อง 2×2</th><th class="n">กรรมการหญิง</th><th class="n">อายุงานเฉลี่ย (ปี)</th>
      ${ctx ? `<th class="n">ครอบครัว <span class="gx-sm">บริบท</span></th><th>political ties <span class="gx-sm">บริบท</span></th>` : ""}</tr></thead>
    <tbody>${rows.map(({ x, r, me }) => { const fn = femaleN(x.fem, x.bsize);
      return `<tr${me ? ' class="hl"' : ""}><td class="n">${r}</td><td><b>${esc(x.t)}</b> <span class="gx-sm">${esc(x.n || "")}${x.ind !== c.ind ? " · " + esc(IND[x.ind] || "") : ""}</span>${me ? ` <span class="pill blue">บริษัทนี้</span>` : ""}</td>
        <td class="n">${fmt(b4Ois(x), 0)}</td><td style="white-space:nowrap" title="${esc(ZONES[q(x)].l)}"><span style="color:${ZONES[q(x)].c}">●</span> ${esc(zoneName(q(x), true))} (${q(x)})</td>
        <td class="n">${pct1(x.fem)}${fn !== null ? ` · ${fn} คน` : ""}</td><td class="n">${fmt(x.ten, 1)}</td>${ctx ? `<td class="n">${pct1(x.fam)}</td><td>${x.pol ? "มี" : "ไม่มี"}</td>` : ""}</tr>`; }).join("")}</tbody></table></div>`;
}
/** การ์ดบริษัทคะแนนใกล้เคียง — Pro Max เท่านั้น (ระดับอื่นไม่สร้างเนื้อหา) */
function b4NeighCard(c) {
  if ((typeof tierRank === "function" ? tierRank() : 0) < 2) return "";
  if (!inDomainOf(c.ind)) return `<div class="card b4-neigh"><h3>บริษัทคะแนนใกล้เคียง</h3><p class="desc">${esc(c.t)} อยู่นอกกลุ่มอ้างอิง — ไม่จัดอันดับ (R4)</p></div>`;
  const N = b4Neigh(c), q = x => x.quad || zoneOf(x.promo, x.amp);
  const others = [...N.ind.rows, ...N.all.rows].filter(r => !r.me).map(r => r.x).filter((x, i, a) => a.findIndex(y => y.t === x.t) === i);
  const mix = ["A", "B", "C", "D"].map(k => ({ k, n: others.filter(x => q(x) === k).length })).filter(m => m.n);
  const top = mix.slice().sort((a, b) => b.n - a.n)[0];
  const mFem = b4Med(others.map(x => x.fem)), mTen = b4Med(others.map(x => x.ten));
  const qs = [
    top ? `บริษัทคะแนนใกล้เคียงส่วนใหญ่อยู่ช่อง ${zoneName(top.k)} (${top.n} จาก ${others.length} บริษัท) ส่วน ${c.t} อยู่ช่อง ${zoneName(q(c))} — รูปแบบการกำกับดูแลและการสื่อสารของกลุ่มนี้เหมือนหรือต่างจากบริษัทเราอย่างไร?` : "",
    isFinite(mFem) ? `สัดส่วนกรรมการหญิงของกลุ่ม (ค่ากลาง ${pct1(mFem)}) เทียบกับ ${c.t} ${pct1(c.fem)} — ความต่างนี้มาจากแผนสรรหา วาระกรรมการ หรือโครงสร้างผู้ถือหุ้น?` : "",
    isFinite(mTen) ? `อายุงานเฉลี่ยของบอร์ดในกลุ่ม (ค่ากลาง ${fmt(mTen, 1)} ปี) เทียบกับ ${fmt(c.ten, 1)} ปี — บอร์ดอยู่ในช่วงการเปลี่ยนผ่านต่างกันหรือไม่ (อายุงานไม่เข้าคะแนนหลัก)?` : "",
    `สารจาก CEO ในรายงานประจำปีของบริษัทกลุ่มนี้ใช้ถ้อยคำเชิงโอกาสและเชิงป้องกันต่างจากของเราอย่างไร — อ่านจากเอกสารฉบับจริงก่อนสรุป`,
  ].filter(Boolean);
  return `<div class="card b4-neigh" id="b4Neigh">
    <h3>บริษัทคะแนนใกล้เคียง — ศึกษารูปแบบเชิงกลยุทธ์ <span class="pill blue">Pro Max</span></h3>
    <p class="desc">บริษัทที่อันดับ OpenInnoScore อยู่ติดกับ ${esc(c.t)} (เหนือ/ใต้ ${B4_NEAR_IND} อันดับในอุตสาหกรรมเดียวกัน และ ${B4_NEAR_ALL} อันดับในทั้งตลาด) ·
      ใช้ดูว่ากลุ่มที่คะแนนใกล้กันมีรูปแบบช่อง 2×2 และองค์ประกอบบอร์ดอย่างไร — เป็นข้อมูลประกอบการหารือ ไม่ได้บอกว่ารูปแบบใดดีกว่า</p>
    <div class="stack" style="gap:12px">
      ${b4NeighTable(N.ind.rows, c, `ในอุตสาหกรรม${IND[c.ind] || ""} · ${c.t} อันดับ ${N.ind.k} จาก ${N.ind.N}`)}
      ${b4NeighTable(N.all.rows, c, `ทั้งตลาด (กลุ่มอ้างอิง) · ${c.t} อันดับ ${N.all.k} จาก ${N.all.N}`)}</div>
    <div class="b4-mix"><span class="gx-sm">สัดส่วนช่อง 2×2 ของบริษัทคะแนนใกล้เคียง:</span>
      ${mix.map(m => `<span class="pill" style="border-color:${ZONES[m.k].c};color:${ZONES[m.k].c}">${esc(zoneName(m.k))} · ${m.n}</span>`).join("")}</div>
    <div class="rp-k" style="margin-top:10px">คำถามสำหรับหารือ</div>
    <ol class="gx-qs">${qs.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <p class="gx-sm">ข้อมูลบอร์ดเป็นบริบท (ครอบครัวและ political ties อ่านอย่างเดียว R6) · อันดับใช้ชุดแสดงผลปีบัญชี ${FY_SHOWN + 543} (${COMPS.length} บริษัท) · ตำแหน่งเป็นความสัมพันธ์ ไม่ใช่เป้าหมาย</p>
  </div>`;
}
window.b4NeighCard = b4NeighCard;

function gxAddPlan(t, src) {
  const o = scGet(), lst = (o.plan || []).slice();
  if (lst.some(x => x.t === t)) { toast("ประเด็นนี้อยู่ในแผนแล้ว"); return false; }
  lst.push({ t, d: gxToday(), uc: S.uc || "board", src });
  scSet("plan", lst); toast("เพิ่มเข้าแผนพัฒนาบอร์ดแล้ว"); return true;
}
function gxSetUc(h) {
  h.querySelectorAll("[data-uc]").forEach(b => b.onclick = () => { S.uc = b.dataset.uc; save(); render(); });
}
function wireMatrix2(h) {
  gxSetUc(h);
  h.querySelectorAll("[data-gxtb]").forEach(b => b.onclick = () => { S.gxTable = b.dataset.gxtb === "1"; save(); render(); });
  const pt = h.querySelector("#gxPathTog"); if (pt) pt.onchange = () => { S.gxPath = pt.checked; save(); render(); };
  const it = h.querySelector("#gxIndTog"); if (it) it.onchange = () => { S.gxIndCmp = it.checked; save(); render(); };
  h.querySelectorAll("[data-gxmode]").forEach(b => b.onclick = () => {
    S.gxMode = b.dataset.gxmode; S.gxIndCmp = S.gxMode === "industry";
    if (S.gxMode === "peers" && typeof peersFor === "function" && !(S.peers || []).length) S.peers = peersFor(cur());
    save(); render(); });
  h.querySelectorAll("[data-gxpeer]").forEach(sl => sl.onchange = () => {
    const v = [...h.querySelectorAll("[data-gxpeer]")].map(x => x.value).filter(Boolean);
    S.peers = [...new Set(v)].filter(t => t !== S.t).slice(0, 3);
    if (typeof rememberPeers === "function") rememberPeers();
    save(); render(); });
  const pa = h.querySelector("#gxPeerAuto");
  if (pa) pa.onclick = () => { S.peers = autoPeers(cur()).map(x => x.t); if (typeof rememberPeers === "function") rememberPeers(); render(); };
  h.querySelectorAll("[data-trlock]").forEach(b => b.onclick = () =>
    toast(b.dataset.trlock === "max" ? "เทียบทั้งอุตสาหกรรมเป็นสิทธิ์ Pro Max (Subscription) — ดูได้ที่หน้า เครดิตและแผน"
      : b.closest(".mv-modes") ? "เทียบคู่แข่ง 3 รายเป็นสิทธิ์ Pro — ดูได้ที่หน้า เครดิตและแผน" : "ชั้นจุดอ้างอิงและเส้นทางย้ายโซนเป็นสิทธิ์ Pro / Pro Max"));
  const pick = q => { S.gxSel = q ? { t: S.t, q } : null; S._gxScroll = true; render(); };
  h.querySelectorAll("[data-gxq]").forEach(b => b.onclick = () => pick(b.dataset.gxq));
  h.querySelectorAll(".gx-q, .gx-cl, .gx-trow").forEach(r => r.addEventListener("click", () => pick(r.dataset.q)));
  const wrap = h.querySelector(".gx-svgwrap");
  const closePop = () => { const p = h.querySelector(".gx-pop"); if (p) p.remove(); };
  h.querySelectorAll(".mk").forEach(m => {
    const me = m.classList.contains("me");
    tipOn(m, el => `<div class="tk">${esc(el.dataset.z)}</div><b>${esc(el.dataset.t)}</b> · ${esc(el.dataset.n)}<br>OIS ${el.dataset.i}${el.dataset.sub ? "<br>" + esc(el.dataset.sub) : ""}
      ${me ? "<br>คลิกเพื่อเปิดประเด็นสำหรับบอร์ด" : "<br>คลิกเพื่อเลือกเปิดประเด็นของบริษัทนี้"}`);
    const act = e => {
      e.stopPropagation(); if (typeof TT !== "undefined" && TT) TT.classList.remove("on");
      if (me) { S.gxSel = null; S._gxScroll = true; render(); return; }
      closePop();
      const wr = wrap.getBoundingClientRect(), r = m.getBoundingClientRect();
      const pop = document.createElement("div"); pop.className = "gx-pop"; pop.setAttribute("role", "dialog");
      const isCl = m.dataset.client === "1" || !byT[m.dataset.t];
      pop.innerHTML = `<b>${esc(m.dataset.t)}</b> · ${esc(m.dataset.n)}<div class="gx-sm">${esc(m.dataset.z)} · OIS ${esc(m.dataset.i)}${m.dataset.sub ? " · " + esc(m.dataset.sub) : ""}</div>
        <div class="gx-row">${isCl ? "" : `<button class="btn p" data-open="1">${m1T("Open this company's points", "เปิดประเด็นของบริษัทนี้")}</button>`}<button class="btn g" data-x="1">${m1T("Close", "ปิด")}</button></div>`;
      wrap.appendChild(pop);
      const pw = pop.offsetWidth;
      pop.style.left = Math.max(4, Math.min(r.left - wr.left + r.width / 2 - pw / 2, wr.width - pw - 4)) + "px";
      pop.style.top = (r.bottom - wr.top + 6) + "px";
      pop.querySelector("[data-x]").onclick = closePop;
      if (pop.querySelector("[data-open]")) pop.querySelector("[data-open]").onclick = () => {
        const t = m.dataset.t;
        S.t = t; S.peers = []; S.wi = null; S.gxSel = null;
        const sc = $("#selCo");
        if (sc && ![...sc.options].some(o => o.value === t)) { S.ind = "all"; if ($("#selInd")) $("#selInd").value = "all"; fillCompanies(); }
        if (sc) sc.value = t;
        save(); render(); toast("เปิดประเด็นของ " + t);
      };
    };
    m.addEventListener("click", act);
    m.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(e); } });
  });
  h.querySelectorAll("[data-gxadd]").forEach(b => b.onclick = () => { if (gxAddPlan(b.dataset.gxadd, "grid")) render(); });
  const ta = h.querySelector("#gxRes");
  if (ta) ta.addEventListener("change", () => scSet("res", ta.value.trim()));
  if (S._gxScroll) {
    S._gxScroll = false;
    const p = h.querySelector("#gxPanel");
    if (p) requestAnimationFrame(() => p.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

/* ---------------------------------------------------------------- รายงานฉบับเต็ม (Compass) */
function viewCompass() {
  const c = cur(), v = verdictOf(c), k = v.quad, z = ZONES[k], L = ucLens();
  const u = scGet();
  const d = new Date();
  const dstr = d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  const code = k + "-" + c.t + "-" + String(d.getFullYear() + 543).slice(-2);
  const cp = gxContent(k, c, L);           // null เมื่อมุมมองวางบน Grid ไม่ได้ (บอร์ดธนาคาร)

  const cell = (key, pos) => {
    const zz = ZONES[key], on = key === k && !!cp && v.inDomain;
    return `<div class="cmp-cell${on ? " on" : ""}" style="--zc:${zz.c};grid-area:${pos}">
      ${on ? `<span class="cmp-dot" style="background:${zz.c}"></span>` : ""}
      <b>${zz.l}</b><span>${esc(COMPASS[key].sub)}</span></div>`;
  };
  const field = (key, ph, rows) => `<div class="cmp-in" contenteditable="true" role="textbox" aria-label="${esc(ph)}"
    data-f="${key}" data-ph="${esc(ph)}" style="min-height:${rows * 19 + 14}px">${esc(u[key] || "")}</div>`;
  const grid = `<div class="cmp-grid">
      <div class="cmp-ylab">${esc(GX_Y)}</div>
      ${cell("D", "1/2/2/3")}${cell("A", "1/3/2/4")}
      ${cell("C", "2/2/3/3")}${cell("B", "2/3/3/4")}
      <div class="cmp-xlab">${esc(GX_X)}</div>
    </div><p class="gx-split" style="margin-top:8px">${esc(GX_SPLIT)}</p>`;
  const head = `<div class="cmp-head">
      <div><b>OpenInnoScore</b><span>Board Strategy Compass / ${esc(cp ? z.l : "Out of domain").toUpperCase()}</span></div>
      <div class="r"><span class="cmp-badge">ต้นแบบ · ร่างเพื่อพิจารณา</span>
        <span>รหัสรายงาน ${esc(code)} · ฉบับ 01</span><span>จัดทำ ${esc(dstr)}</span></div>
    </div>
    ${gxLensBar()}
    <p class="gx-lensline">มุมมอง: <b>${esc(ucLab(L))}</b> · ผู้อ่าน: <b>${esc(L.audience)}</b></p>${L.id === "credit" ? m1SupBadge() : ""}`;
  const legal = `<div class="cmp-legal">
      <b>ข้อจำกัดของรายงานฉบับนี้</b> — ตำแหน่งบนกริดคำนวณจากองค์ประกอบคณะกรรมการและข้อความในรายงานประจำปี
      เทียบกับฐานอ้างอิงที่ freeze แล้ว เป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่ความสัมพันธ์เชิงสาเหตุ
      ไม่ใช่ความน่าจะเป็น และไม่ใช่จำนวนกิจกรรม open innovation ที่คาดว่าจะเกิด · ${esc(GX_DISC)} จึงนำไปใช้ในร่าง 56-1
      ได้เฉพาะส่วนกระบวนการประเมิน ประเด็นพัฒนา และการดำเนินการที่เกิดขึ้นจริงและผ่านการตรวจอนุมัติแล้ว ·
      ระบบไม่ใช้ political ties เป็นเหตุผลเชิงบวก และห้ามนำผลไปให้คะแนนกรรมการรายบุคคล
      <div class="cmp-refs"><b>ฐานแนวคิดของคำถามและการออกแบบกริด</b> — งานเหล่านี้รองรับเหตุผลในการออกแบบ
        ไม่ได้รับรองแกนหรือการจัดโซนของโมเดลนี้
        <ol>${REFS.map(r => `<li>${r}</li>`).join("")}</ol></div>
    </div>`;

  if (!cp || !v.inDomain) {
    return `<div class="cmp">${head}
      <h2 class="cmp-h1">${!cp ? esc(m1T("Board Profile (outside the reference group) — board-level self-assessment instead of a Grid position", "Board Profile (นอกกลุ่มอ้างอิง) — ใช้การประเมินตนเองระดับคณะแทนตำแหน่งบน Grid")) : esc(c.t) + " อยู่นอกกลุ่มอ้างอิง"}</h2>
      <div class="grid g-side-r cmp-pos"><div>${grid}</div>
        <div class="cmp-panel">${!cp ? gxBank() : gxOut(c)}</div></div>
      ${legal}</div>`;
  }

  return `<div class="cmp">${head}
    <h2 class="cmp-h1">${L.id === "credit" ? esc(m1T(`Relationship programme · ${ZONE_CFG[k].name} (${k}) · ${PLAYBOOK_UC1[k].name[0]}`, `โปรแกรมความสัมพันธ์ · ${ZONE_CFG[k].name} (${k}) · ${PLAYBOOK_UC1[k].name[1]}`)) : esc(cp.head)}</h2>
    ${L.id === "credit" ? `<div class="m1b-pbwrap">${m1PlaybookAll(k)}</div>` : ""}
    <p class="cmp-sub">${esc(c.n)} (${esc(c.t)}) · วาระทบทวนการกำกับดูแลนวัตกรรม · สำหรับ${esc(L.audience)}</p>

    <h3 class="cmp-sec">ตำแหน่งจากผลโมเดล</h3>
    <div class="grid g-side-r cmp-pos">
      <div>${grid}
        <div class="cmp-inputs">ตำแหน่ง: CEO Promotion Focus เปอร์เซ็นไทล์ ${fmt(c.dp, 0)} · Board Amplification เปอร์เซ็นไทล์ ${fmt(c.ap ?? ampPct(c.amp), 0)} ·
          OpenInnoScore ${fmt(c.ois ?? c.ipi, 1)} (ช่วง 90% ${fmt(v.band[0], 1)}–${fmt(v.band[1], 1)}) · Tier ${v.tier}</div>
        ${gxProv(c, v)}
      </div>
      <div class="cmp-panel">
        <b style="color:${z.c}">${esc(z.l)} · ${esc(z.q)}</b>
        <p class="cmp-q">ประเด็นสำหรับหารือ: ${esc(cp.sub)}</p>
        <p><b>สิ่งที่ข้อมูลแสดง</b> — ${esc(gxShows(c, k))}</p>
        <p><b>สิ่งที่ยังสรุปไม่ได้</b> — ${esc(gxCannot(c, v, k).join(" · "))}</p>
        ${L.id === "credit" ? gxCreditNote(c) : ""}
        <p class="cmp-note">${esc(cp.note)} · การอยู่ช่องนี้ใช้เป็นจุดเริ่มต้นตั้งคำถาม ไม่ได้ยืนยันว่า CEO หรือบอร์ดมีข้อบกพร่อง ·
          สี่ช่องนี้คือ quadrant ไม่ใช่ควอไทล์อันดับอุตสาหกรรม</p>
      </div>
    </div>

    <h3 class="cmp-sec">คำถามที่ใช้ในการหารือ (${cp.qs.length} ข้อ)
      <span class="cmp-tag">คำถามประยุกต์จากงานวิจัย ไม่ใช่แบบวัดที่รับรองแล้ว</span></h3>
    <ol class="cmp-qs">${cp.qs.map((q, i) => `<li>${esc(q)} <span class="cmp-ev">หลักฐาน E0${Math.min(i + 1, cp.ev.length)}</span></li>`).join("")}</ol>

    <h3 class="cmp-sec">จากหลักฐานสู่การดำเนินการ
      <span class="cmp-tag">ช่องสีขาวเป็นข้อมูลที่ผู้ใช้กรอกและตรวจทานเอง — ระบบไม่เติมมติให้</span></h3>
    <div class="tw"><table class="cmp-tbl"><thead><tr>
      <th style="width:26%">หลักฐานที่ใช้ตรวจ <span>ระบบเสนอ</span></th>
      <th style="width:25%">ข้อสรุปจากการหารือ <span>ผู้ใช้กรอก</span></th>
      <th style="width:27%">การดำเนินการ / ผลส่งมอบ <span>ผู้ใช้กรอก</span></th>
      <th style="width:22%">ผู้รับผิดชอบ / กำหนดส่ง <span>ผู้ใช้กรอก</span></th></tr></thead><tbody>
      ${cp.ev.map((e, i) => `<tr>
        <td><b>E0${i + 1}</b><br>${esc(e)}<div class="cmp-hint">ระบุเลขที่เอกสาร วันที่ วาระ และหน้าเมื่อแนบเข้ารายงาน</div></td>
        <td>${field("c" + i, "สรุปสิ่งที่หารือจากหลักฐานชิ้นนี้", 4)}</td>
        <td>${field("a" + i, "A0" + (i + 1) + " · งานที่ตกลงกัน และเกณฑ์ว่างานเสร็จเมื่อใด", 4)}</td>
        <td>${field("o" + i, "ผู้รับผิดชอบ · หน่วยงานร่วม · กำหนดส่ง", 4)}</td></tr>`).join("")}
    </tbody></table></div>

    <h3 class="cmp-sec">แผนพัฒนาบอร์ดที่เก็บไว้จากรายงานฉบับนี้
      <span class="cmp-tag">ประเด็นที่กดเพิ่ม (จากหน้านี้และจาก Strategy Grid) เก็บไว้กับบริษัทนี้ในเครื่องของผู้ใช้เท่านั้น</span></h3>
    ${(u.plan || []).length ? `<ol class="cmp-plan">${(u.plan || []).map((x, i) => {
        const ul = USECASES.find(y => y.id === x.uc);
        return `<li><span>${esc(x.t)}</span><span class="cmp-plan-d">เพิ่มเมื่อ ${esc(x.d)}${ul ? " · มุมมอง " + esc(ul.short) : ""}${x.src === "grid" ? " · จาก Grid" : ""}</span>
          <button class="lnk" data-rm="${i}">นำออก</button></li>`; }).join("")}</ol>`
      : `<p class="cmp-note" style="margin:0 0 10px">ยังไม่มีประเด็นในแผน — กดปุ่มด้านล่างเพื่อเพิ่มคำถามหรือหลักฐานที่ต้องตรวจเข้าแผนพัฒนาบอร์ด</p>`}
    <div class="cmp-tools">
      ${cp.qs.map((q, i) => `<button class="btn g" data-add="${esc(q)}">+ เพิ่มคำถามข้อ ${i + 1} เข้าแผน</button>`).join("")}
      ${cp.ev.map((e, i) => `<button class="btn g" data-add="ตรวจหลักฐาน E0${i + 1} · ${esc(e)}">+ เพิ่มหลักฐาน E0${i + 1} เข้าแผน</button>`).join("")}
      <button class="btn s" data-goto="matrix">กลับไป Strategy Grid 2×2</button>
      <button class="btn" data-print="1">พิมพ์ / บันทึกเป็น PDF</button>
    </div>

    <h3 class="cmp-sec">${esc(cp.askLabel)}</h3>
    <p class="cmp-ask">${esc(cp.ask)}</p>${L.id === "credit" ? m1Wording() : ""}
    <div class="gx-sm" style="margin-bottom:5px">ผลหลังประชุม — ผู้ใช้กรอกหลังประชุมจริงเท่านั้น — ระบบไม่เติมมติ</div>
    ${field("res", "มติหรือข้อสรุปหลังการประชุมจริง — กรอกหลังประชุมเท่านั้น", 3)}
    <p class="cmp-status">สถานะ: ${u.res ? "มีบันทึกผลหลังประชุมแล้ว" : "ยังไม่มีมติ"} ·
      การเห็นชอบแผนศึกษานี้ไม่ใช่การอนุมัติงบประมาณหรือรับรองพันธมิตร</p>

    <div class="grid g3 cmp-foot">
      <div><b>ผู้จัดทำและยืนยันข้อสรุป</b>${field("sign", "ฝ่ายกลยุทธ์ / เลขานุการบริษัท", 2)}</div>
      <div><b>การตรวจหลักฐานและถ้อยคำ</b>${field("cg", "ผู้รับผิดชอบงาน CG ที่ตรวจทาน", 2)}</div>
      <div><b>รอบติดตามถัดไป</b>${field("next", "วันที่นำกลับเข้าวาระ", 2)}</div>
    </div>
    ${legal}
  </div>`;
}

function wireCompass(h) {
  gxSetUc(h);
  h.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { if (gxAddPlan(b.dataset.add, "compass")) render(); });
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

/* ---------------------------------------------------------------- ลงทะเบียนหน้าและเมนู */
VIEWS.compass = viewCompass;
VIEWS.matrix = viewMatrix2;
if (typeof WIRES2 === "object" && WIRES2) { WIRES2.compass = wireCompass; WIRES2.matrix = wireMatrix2; }
(function gxNav() {
  const mx = NAV.find(n => n.id === "matrix");
  if (mx) mx.lab = "Strategy Grid 2×2 · ประเด็นสำหรับบอร์ด";
  if (!NAV.some(n => n.id === "compass"))
    NAV.splice(NAV.findIndex(n => n.id === "matrix") + 1, 0, { id: "compass", g: 2, ico: "◳", lab: "", lock: "report" });
  NAV.find(n => n.id === "compass").lab = "รายงานประเด็นสำหรับบอร์ด (Compass)";
})();
/* เมนูถูกประกอบไปแล้วใน initV2 ก่อนไฟล์นี้ทำงาน จึงต้องประกอบใหม่ */
buildNav();
if (S.user) syncNavLocks();
/* ถ้าเปิดค้างไว้ที่หน้านี้ (restore จาก localStorage) หน้าแรกถูกวาดด้วยตัวเดิมก่อนไฟล์นี้โหลด — วาดใหม่ */
if (S.user && (S.view === "matrix" || S.view === "compass") && $("#app") && $("#app").style.display !== "none") render();
