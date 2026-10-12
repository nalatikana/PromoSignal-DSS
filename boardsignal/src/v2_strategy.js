/* ============================================================================
   Board Strategy Compass — Strategy Grid 2×2 และรายงานประเด็นสำหรับบอร์ด
   ตามข้อเสนอของลูกค้า (เอกสาร 2×2 grid · แก้ไขครั้งที่ 2.1)
     · Grid คือ "ประเด็นที่บอร์ดควรหารือ" ไม่ใช่ "ช่องที่ควรย้ายไป"
       (แก้ไขครั้งที่ 2.2: ชั้น "จุดอ้างอิงและเส้นทางย้ายโซน" เป็นตัวเลือกเสริมของ Pro/Pro Max ปิดไว้เป็นค่าเริ่มต้น
        จุดอ้างอิง = ค่ามัธยฐานช่อง Deliver ในอุตสาหกรรมเดียวกัน — ไม่ใช่เป้าหมายที่ระบบแนะนำ)
     · ใต้กราฟ = ประเด็นสำหรับบอร์ด 6 ส่วน: สิ่งที่ข้อมูลแสดง / สิ่งที่ยังสรุปไม่ได้ /
       คำถามสำหรับหารือ (3 ข้อ) / หลักฐานที่ควรตรวจ / เรื่องที่ให้บอร์ดพิจารณา / ผลหลังประชุม
     · ระบบเติมได้เฉพาะ 5 ส่วนแรก — "ผลหลังประชุม" มติ ผู้รับผิดชอบ ต้องมาจากการประชุมจริงและผู้ใช้กรอกเอง
     · มุมมองตาม Use case (USECASES / ucLens) ใช้เนื้อหาฐานชุดเดียว (COMPASS) แล้วปรับถ้อยคำตามผู้อ่าน
   ============================================================================ */

/** เนื้อหาฐานประจำช่อง (single source of truth) — คำถามประยุกต์จากงานวิจัย ไม่ใช่แบบวัดที่รับรองแล้ว
 *  คำถามข้อที่ตรงกับเอกสารของลูกค้าคงถ้อยคำตามต้นฉบับ */
const COMPASS = {
  A: { head: "เปลี่ยนโอกาสเป็นผลลัพธ์",
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
  B: { head: "เติบโตอย่างมีหลักเกณฑ์",
       sub: "ตรวจการกำกับความเสี่ยงของการเติบโต",
       shows: "ข้อความ CEO มีสัญญาณเน้นโอกาสสูง ขณะที่สัญญาณโครงสร้างบอร์ดอยู่ต่ำกว่าเกณฑ์แบ่งของฐานที่ระบุ (amp ≤ 0) — องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุนในฐานอ้างอิง",
       cannot: "ยังสรุปไม่ได้ว่าบอร์ดกำกับนวัตกรรมไม่เพียงพอ — ข้อมูลที่ใช้คำนวณเป็นองค์ประกอบของบอร์ด ไม่ใช่กระบวนการทำงานของบอร์ด",
       qs: ["บอร์ดใช้ข้อมูลและเกณฑ์ใดพิจารณาความเสี่ยงของโครงการร่วมพัฒนากับพันธมิตร?",
            "บอร์ดได้รับข้อมูลเพียงพอสำหรับท้าทายสมมติฐานหรือไม่?",
            "มีเกณฑ์อนุมัติ ทบทวน และหยุดโครงการอย่างไร?"],
       ev: ["เอกสารเสนออนุมัติโครงการ เกณฑ์เลือกพันธมิตร รายงานความเสี่ยง และผลติดตามโครงการ",
            "บันทึกการทบทวนโครงการที่ยังไม่ให้ผล พร้อมเหตุผลที่ไปต่อ ปรับ หรือหยุด"],
       ask: "จำเป็นต้องปรับเกณฑ์อนุมัติหรือรูปแบบรายงานติดตามหรือไม่?" },
  C: { head: "ทบทวนฐานความพร้อม",
       sub: "ตรวจบริบทก่อนกำหนดการพัฒนา",
       shows: "ทั้งข้อความ CEO และสัญญาณโครงสร้างบอร์ดอยู่ต่ำกว่าเกณฑ์แบ่งของฐานอ้างอิง — คะแนนที่ได้มาจากความเข้ากันของสองด้าน (ผลคูณของค่าลบสองค่า) ไม่ใช่สัญญาณ open innovation",
       cannot: "ยังสรุปไม่ได้ว่ารูปแบบนี้เป็นปัญหา — ความระมัดระวังอาจเหมาะกับช่วงธุรกิจ และโมเดลไม่ได้เห็นข้อมูลภายในทั้งหมด",
       qs: ["รูปแบบนี้เหมาะกับช่วงธุรกิจหรือไม่?",
            "มีข้อมูลใดที่โมเดลยังไม่สะท้อน?",
            "บอร์ดขาดความรู้หรือกระบวนการใดจริงหรือไม่?"],
       ev: ["แผนธุรกิจและวาระบอร์ดย้อนหลัง 2 ปี ที่แสดงลำดับความสำคัญในช่วงนี้",
            "รายการกิจกรรมความร่วมมือกับภายนอกที่เกิดขึ้นจริงแต่ไม่ปรากฏในรายงานประจำปี",
            "ผลประเมินตนเองของคณะกรรมการ (ระดับคณะ) และ skill matrix ฉบับล่าสุด"],
       ask: "ควรเก็บข้อมูลบริบทเพิ่มก่อนกำหนดประเด็นพัฒนาบอร์ด หรือปรับการเปิดเผยกิจกรรมความร่วมมือในรายงานประจำปีให้ครบถ้วนขึ้นหรือไม่?" },
  D: { head: "เปิดมุมมองโอกาส",
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
  credit: {
    A: { qs: ["ขอให้ลูกค้าอธิบายเกณฑ์คัดเลือกพันธมิตร การจัดสรรทรัพยากร และการติดตามผลที่รองรับแผนเติบโตซึ่งใช้ประกอบคำขอสินเชื่อ",
              "ลูกค้าสื่อสารการเติบโตผ่านพันธมิตรชัดเจน — ขอให้อธิบายว่าคณะกรรมการติดตามการคัดเลือกพันธมิตร การเรียนรู้ และเกณฑ์หยุดโครงการอย่างไร",
              "ขอให้ลูกค้าแสดงว่ากระแสเงินสดของโครงการร่วมพัฒนาแยกจากธุรกิจหลักอย่างไร และหากโครงการหยุดกลางทาง แผนชำระหนี้มีสมมติฐานรองรับอย่างไร"],
         ev: ["เอกสารเสนออนุมัติโครงการร่วมพัฒนาต่อคณะกรรมการ (ฉบับที่อนุมัติแล้ว)",
              "ประมาณการกระแสเงินสดแยกรายโครงการ พร้อมสมมติฐานหลัก",
              "รายงานติดตามโครงการล่าสุดที่เสนอคณะกรรมการ"] },
    B: { qs: ["ขอให้ลูกค้าอธิบายว่าคณะกรรมการใช้ข้อมูลและเกณฑ์ใดพิจารณาความเสี่ยงของโครงการร่วมพัฒนากับพันธมิตร",
              "ขอดูตัวอย่างวาระจริงว่าข้อมูลที่ฝ่ายจัดการเสนอคณะกรรมการเพียงพอให้ท้าทายสมมติฐานการเติบโตที่ใช้ในประมาณการหรือไม่",
              "ขอให้ลูกค้าแสดงเกณฑ์อนุมัติ ทบทวน และหยุดโครงการที่เป็นลายลักษณ์อักษร และกรณีที่เคยใช้เกณฑ์นั้นหยุดโครงการ"],
         ev: ["เอกสารเสนออนุมัติโครงการ เกณฑ์เลือกพันธมิตร รายงานความเสี่ยง และผลติดตามโครงการ",
              "ประมาณการทางการเงินของโครงการเติบโตพร้อมกรณีอ่อนไหว (sensitivity)",
              "นโยบายอำนาจอนุมัติ (DOA) ที่ใช้กับการลงทุนใหม่"] },
    C: { qs: ["ขอให้ลูกค้าอธิบายว่าแนวทางระมัดระวังในปัจจุบันสอดคล้องกับช่วงธุรกิจและวัตถุประสงค์การใช้เงินกู้อย่างไร",
              "สอบถามกิจกรรมความร่วมมือหรือการพัฒนาธุรกิจที่ลูกค้าทำอยู่แต่ยังไม่ปรากฏในรายงานประจำปี",
              "สอบถามว่าคณะกรรมการทบทวนความรู้และกระบวนการของตนครั้งล่าสุดเมื่อใด และพบประเด็นใดที่เกี่ยวกับแผนธุรกิจ"],
         ev: ["แผนธุรกิจ 3 ปีและวัตถุประสงค์การใช้เงินกู้",
              "รายการสัญญาความร่วมมือหรือ MOU ที่มีผลอยู่",
              "สรุปผลประเมินตนเองของคณะกรรมการ (ระดับคณะ)"] },
    D: { qs: ["ขอให้ลูกค้าอธิบายโอกาสร่วมพัฒนากับภายนอกที่ศึกษาไว้แต่ยังไม่ได้ดำเนินการ และเหตุผลที่ยังไม่ดำเนินการ",
              "สอบถามว่าข้อความของผู้บริหารในรายงานประจำปีสอดคล้องกับแผนธุรกิจที่ใช้ประกอบคำขอสินเชื่อเพียงใด",
              "หากมีโครงการใหม่ในช่วงอายุสินเชื่อ ขอให้ลูกค้าอธิบายขั้นตอนนำเสนอและติดตามผ่านคณะกรรมการ"],
         ev: ["แผนกลยุทธ์ที่คณะกรรมการอนุมัติ และสารจาก CEO ฉบับล่าสุด",
              "บันทึกการพิจารณาทางเลือกความร่วมมือ (ถ้ามี)",
              "แผนการลงทุนในช่วงอายุสินเชื่อ"] },
  },
  search: {
    A: { qs: ["skill matrix ของคณะกรรมการมีทักษะด้านการกำกับความร่วมมือภายนอกและการคัดเลือกพันธมิตรครบถ้วนหรือไม่ และยังขาดทักษะใด?",
              "เมื่อกรรมการครบวาระ องค์ประกอบใหม่ควรคงความหลากหลายของมุมมองที่สัมพันธ์กับรูปแบบปัจจุบันอย่างไร (พิจารณาระดับคณะ)?",
              "nomination brief รอบถัดไปควรระบุประสบการณ์ด้านการติดตามโครงการร่วมพัฒนาและการหยุดโครงการเป็นคุณสมบัติที่ต้องการหรือไม่?"],
         ev: ["skill matrix ของคณะกรรมการฉบับล่าสุด",
              "ตารางวาระกรรมการที่จะครบในอีก 1–3 ปี",
              "นโยบายสรรหาและความหลากหลายของคณะกรรมการ"] },
    B: { qs: ["skill matrix มีทักษะด้านการประเมินความเสี่ยงโครงการและการท้าทายสมมติฐานการเติบโตครบถ้วนหรือไม่?",
              "องค์ประกอบคณะกรรมการปัจจุบัน (เช่น จำนวนกรรมการหญิงเทียบ critical mass ≥ 3 คน) สอดคล้องกับนโยบายความหลากหลายที่ประกาศไว้หรือไม่?",
              "nomination brief รอบถัดไปควรเน้นประสบการณ์ด้านเกณฑ์อนุมัติและการติดตามโครงการเติบโตหรือไม่?"],
         ev: ["skill matrix ของคณะกรรมการฉบับล่าสุด",
              "รายงานคณะกรรมการสรรหาฯ และเกณฑ์ที่ใช้ในการสรรหารอบล่าสุด",
              "ตารางวาระกรรมการที่จะครบในอีก 1–3 ปี"] },
    C: { qs: ["ผลประเมินตนเองของคณะกรรมการชี้ว่าขาดความรู้หรือกระบวนการใดจริง ก่อนกำหนดคุณสมบัติกรรมการใหม่?",
              "องค์ประกอบปัจจุบันเหมาะกับช่วงธุรกิจหรือไม่ และแผนธุรกิจระบุช่วงเวลาที่ความต้องการทักษะจะเปลี่ยนไว้หรือไม่?",
              "มีประสบการณ์ของกรรมการที่โมเดลไม่เห็น (ไม่ได้เปิดเผยในรายงานประจำปี) ที่ควรบันทึกใน skill matrix หรือไม่?"],
         ev: ["ผลประเมินตนเองของคณะกรรมการ (ระดับคณะ)",
              "skill matrix ของคณะกรรมการฉบับล่าสุด",
              "แผนธุรกิจ 3 ปีที่ใช้กำหนดทักษะที่ต้องการ"] },
    D: { qs: ["คณะกรรมการมีทักษะด้านการมองหาโอกาสและความร่วมมือภายนอกที่ยังไม่ได้ใช้ในวาระกลยุทธ์หรือไม่?",
              "ควรเน้นประสบการณ์ด้านการพัฒนาธุรกิจใหม่ใน nomination brief หรือควรทบทวนบทบาทคณะกรรมการชุดย่อยก่อนสรรหาเพิ่ม?",
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
const USECASES = [
  { id: "board", lab: "ประเมินบอร์ดตัวเอง (BOD Evaluation)", short: "BOD Evaluation", audience: "เลขานุการบริษัท / คณะกรรมการ", placeable: true,
    adapt: (b) => ({ qs: b.qs.slice(0, 3), ev: b.ev.slice(), ask: b.ask, askLabel: "เรื่องที่ให้บอร์ดพิจารณา",
      audience: "เลขานุการบริษัท / คณะกรรมการ",
      note: "ใช้ประกอบการประเมินตนเองของคณะกรรมการ (BOD Evaluation) ระดับคณะ — ไม่ประเมินกรรมการรายบุคคล" }) },
  { id: "credit", lab: "ธนาคาร · ลูกค้าสินเชื่อ (Pilot Use case 2)", short: "ลูกค้าสินเชื่อ", audience: "RM / ฝ่ายสินเชื่อ", placeable: true,
    adapt: (b, c, k) => ({ qs: UC_TEXT.credit[k].qs, ev: UC_TEXT.credit[k].ev,
      ask: "ข้อมูลประกอบสำหรับ RM — ไม่ใช่ข้อเสนออนุมัติหรือปฏิเสธสินเชื่อ · บันทึกคำตอบของลูกค้าและเอกสารที่ได้รับไว้ในรายงานเยี่ยมลูกค้า",
      askLabel: "ข้อมูลประกอบสำหรับ RM", audience: "RM / ฝ่ายสินเชื่อ",
      note: "แนวทาง Pilot Use case 2: แสดงสูตร B_T1 คู่กับป้าย Caution เสมอ · political ties และความเป็นกิจการครอบครัวไม่ใช้เป็นเหตุผลในการพิจารณาสินเชื่อ ไม่ว่าทางบวกหรือทางลบ · คำถามด้านบนใช้หารือกับลูกค้า ไม่ใช่เกณฑ์ให้คะแนนสินเชื่อ" }) },
  { id: "search", lab: "Executive Search / Nomination", short: "Nomination", audience: "ที่ปรึกษาสรรหา / คณะกรรมการสรรหา", placeable: true,
    adapt: (b, c, k) => ({ qs: UC_TEXT.search[k].qs, ev: UC_TEXT.search[k].ev,
      ask: "ประเด็นสำหรับ nomination brief — ทักษะและมุมมองที่คณะกรรมการต้องการในระดับคณะ ไม่ใช่การประเมินหรือจัดอันดับกรรมการรายบุคคล",
      askLabel: "ประเด็นสำหรับ nomination brief", audience: "ที่ปรึกษาสรรหา / คณะกรรมการสรรหา",
      note: "ใช้ข้อมูลระดับคณะเท่านั้น · ไม่ให้คะแนนกรรมการรายบุคคล · political ties ไม่ใช่คุณสมบัติเป้าหมายในการสรรหา (R6) · ความสัมพันธ์ในโมเดลเป็นความสัมพันธ์เชิงสถิติ ไม่ใช่เหตุและผล" }) },
  { id: "investor", lab: "นักลงทุน / Engagement", short: "Engagement", audience: "ผู้จัดการกองทุน", placeable: true,
    adapt: (b, c, k) => ({ qs: UC_TEXT.investor[k].qs, ev: UC_TEXT.investor[k].ev,
      ask: "ประเด็นสำหรับการประชุม engagement กับฝ่ายจัดการและคณะกรรมการ — ไม่ใช่คำแนะนำการลงทุน",
      askLabel: "ประเด็นสำหรับการประชุม engagement", audience: "ผู้จัดการกองทุน",
      note: "ไม่ใช่คำแนะนำการลงทุน · ตำแหน่งเป็นความสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่การพยากรณ์ผลตอบแทนหรือราคาหุ้น" }) },
  { id: "bankbod", lab: "บอร์ดธนาคาร (Pilot Use case 1 · นอกกลุ่มอ้างอิง)", short: "บอร์ดธนาคาร", audience: "เลขานุการบริษัท / คณะกรรมการธนาคาร", placeable: false,
    adapt: () => null },
];
function ucLens() { return USECASES.find(u => u.id === (S.uc || "board")) || USECASES[0]; }
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
    if (S.gxPath === undefined) S.gxPath = !!o.pa;
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
const GX_SPLIT = "เกณฑ์แบ่งสูง–ต่ำ: แกนนอนแบ่งที่ค่าเฉลี่ยฐานอ้างอิง (cP = 0) · แกนตั้งแบ่งที่ amp = 0 (ความชันของ promotion focus เป็นบวก/ไม่เป็นบวก)";
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
    <div><dt>ปีบัญชี</dt><dd>พ.ศ. ${fy + 543} (FY${fy})</dd></div>
    <div><dt>กลุ่มเปรียบเทียบ</dt><dd>ฐานอ้างอิง REF-928 · 928 บริษัท-ปี · 209 บริษัท · SET นอกกลุ่มการเงิน · ปีบัญชี 2562–2566
      <span class="gx-ver">${esc(OIS.version)}</span></dd></div>
    <div><dt>สถานะตรวจคุณภาพ</dt><dd><span class="pill ${rc}" title="verdict รายปีจากตารางที่ 6 (R3)">${reg ? "FY" + fy + " · " + reg : "ยังไม่ validate"}</span>
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
    <div class="seg gx-seg" role="tablist">${USECASES.map(u =>
      `<button role="tab" data-uc="${u.id}" aria-selected="${u.id === L.id}">${esc(u.lab)}</button>`).join("")}</div></div>`;
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
    out.push("ตำแหน่งอยู่ใกล้เส้นแบ่ง — ป้ายช่องอาจเปลี่ยนได้เมื่อค่าป้อนเปลี่ยนเล็กน้อย จึงยังไม่ควรสรุปจากชื่อช่อง");
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
  { k: "self", l: "ดูเฉพาะบริษัท", tag: "ทั่วไป (Free)", need: 0 },
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
const gxPathAllowed = L => !["credit", "bankbod"].includes(L.id);
const gxPathOn = (L, show) => show && gxPathAllowed(L) && gxRank() >= 1 && !!S.gxPath;
const gxIndOn = show => show && gxMode() === "industry";
const gxMed = a => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
/** จุดอ้างอิงเชิงเปรียบเทียบ = ค่ามัธยฐาน (P_w, amp) ของ REF-928 ช่อง A ในอุตสาหกรรมเดียวกัน */
function gxRefPoint(c) {
  let pts = REF_PTS.filter(p => p[2] === "A" && p[4] === c.ind), scope = "ind";
  if (pts.length < 5) { pts = REF_PTS.filter(p => p[2] === "A"); scope = "all"; }
  const P = gxMed(pts.map(p => p[0])), A = gxMed(pts.map(p => p[1]));
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
  const mP = OM.P, pw = x => wins(x.promo, "P");
  const peers = gxPeersOf(c, show), others = gxIndCos(c, show);
  const marked = show ? [c, ...peers, ...others] : [];
  const ref = opt.ref || null;
  const bg = opt.ind ? REF_PTS.filter(p => p[4] === c.ind) : REF_PTS;
  const px = REF_PTS.map(p => p[0]).concat(ref ? [ref.P] : []), ax = REF_PTS.map(p => p[1]).concat(ref ? [ref.A] : []);
  const xr = [Math.min(...px, ...marked.map(pw), mP), Math.max(...px, ...marked.map(pw), mP)];
  const yr = [Math.min(...ax, ...marked.map(x => x.amp), 0), Math.max(...ax, ...marked.map(x => x.amp), 0)];
  const padx = (xr[1] - xr[0]) * .06 || .1, pady = (yr[1] - yr[0]) * .06 || .1;
  const W = 760, H = 480, L = 40, R = 16, T = 18, B = 44;
  const X = x => L + (x - (xr[0] - padx)) / ((xr[1] + padx) - (xr[0] - padx)) * (W - L - R);
  const Y = y => H - B - (y - (yr[0] - pady)) / ((yr[1] + pady) - (yr[0] - pady)) * (H - T - B);
  const cx = X(mP), cy = Y(0), zk = show ? v.quad : null;
  const sk = `paint-order="stroke" stroke="var(--panel)" stroke-width="3.5" stroke-linejoin="round"`;
  const rect = (x0, y0, x1, y1, k) => `<rect class="gx-q${k === selQ ? " sel" : ""}" data-q="${k}" x="${Math.min(x0, x1).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}"
      width="${Math.abs(x1 - x0).toFixed(1)}" height="${Math.abs(y1 - y0).toFixed(1)}" fill="${ZONES[k].c}"
      fill-opacity="${k === selQ ? .13 : k === zk ? .08 : .035}"><title>${esc(ZONES[k].l)} · ${esc(COMPASS[k].sub)} — คลิกเพื่อดูคำถามประจำช่อง</title></rect>`;
  const dotCol = q => q === "A" ? "var(--ok)" : q === "C" ? "var(--serious)" : "var(--ink-3)";
  const dots = bg.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.2" fill="${dotCol(p[2])}" fill-opacity=".3"/>`).join("");
  const corner = (k, x, y, anc) => {
    const q = QN[k] || [0, 0];
    const sub = opt.ind ? (() => { const n = bg.filter(p => p[2] === k).length;
      return `อุตสาหกรรมนี้ n = ${n} (${fmt(bg.length ? n / bg.length * 100 : 0, 0)}%) · ทั้งฐาน ${fmt(q[1] / REF_PTS.length * 100, 0)}%`; })()
      : `n = ${q[1]} บริษัท-ปี · OI เฉลี่ย ${fmt(q[0], 2)}`;
    return `<g class="gx-cl" data-q="${k}"><text x="${x}" y="${y}" font-size="12" font-weight="600" fill="${ZONES[k].c}" text-anchor="${anc}" ${sk}>${ZONES[k].l} · ${esc(COMPASS[k].sub)}</text>
      <text x="${x}" y="${y + 14}" font-size="9.8" fill="var(--ink-3)" text-anchor="${anc}" ${sk}>${sub}</text></g>`;
  };
  const num = (x, i) => {
    const r = i === 0 ? 11 : 8.5, col = i === 0 ? "var(--ink)" : SER[i - 1];
    return `<g class="mk${i === 0 ? " me" : ""}" tabindex="0" role="button" transform="translate(${X(pw(x)).toFixed(1)},${Y(x.amp).toFixed(1)})"
        data-t="${esc(x.t)}" data-n="${esc(x.n)}" data-i="${x.ipi}" data-z="${esc(ZONES[x.quad || zoneOf(x.promo, x.amp)].l)}"
        aria-label="${esc(x.t)} ${i === 0 ? "— เปิดประเด็นสำหรับบอร์ด" : "— คู่เทียบ"}">
      <circle r="${r + 7}" fill="transparent"/><circle r="${r + 2.5}" fill="var(--panel)"/>
      <circle r="${r}" fill="${col}" stroke="var(--panel)" stroke-width="1.5"/>
      <text y="${i === 0 ? 4 : 3.5}" text-anchor="middle" font-size="${i === 0 ? 12 : 10}" font-weight="600" fill="var(--panel)">${i + 1}</text></g>`;
  };
  const lab = show ? (() => { const mx = X(pw(c)), flip = mx > W - 160;
    // เมื่อเปิดชั้นจุดอ้างอิงและเส้นประพาดไปฝั่งเดียวกับป้าย — ยกป้ายบริษัทขึ้นเหนือจุดแทน
    const rx = ref ? X(ref.P) : null, up = ref && (flip ? rx < mx - 12 : rx > mx + 12);
    if (up) return `<text x="${mx.toFixed(1)}" y="${(Y(c.amp) - 18).toFixed(1)}" font-size="12" font-weight="600"
      text-anchor="${mx > W - 120 ? "end" : mx < L + 120 ? "start" : "middle"}" fill="var(--ink)" ${sk} pointer-events="none">${esc(c.t)} · คลิกเพื่อเปิดประเด็น</text>`;
    return `<text x="${(flip ? mx - 17 : mx + 17).toFixed(1)}" y="${(Y(c.amp) + 4).toFixed(1)}" font-size="12" font-weight="600"
      text-anchor="${flip ? "end" : "start"}" fill="var(--ink)" ${sk} pointer-events="none">${esc(c.t)} · คลิกเพื่อเปิดประเด็น</text>`; })() : "";
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" class="gx-svg" role="img" aria-label="Strategy Grid 2 คูณ 2 — ${esc(GX_X)} และ ${esc(GX_Y)}">
    ${rect(cx, T, W - R, cy, "A")}${rect(cx, cy, W - R, H - B, "B")}${rect(L, T, cx, cy, "D")}${rect(L, cy, cx, H - B, "C")}
    <g pointer-events="none">${dots}
      <line x1="${cx.toFixed(1)}" y1="${T}" x2="${cx.toFixed(1)}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
      <line x1="${L}" y1="${cy.toFixed(1)}" x2="${W - R}" y2="${cy.toFixed(1)}" stroke="var(--ink-3)" stroke-dasharray="5 4"/>
      <text x="${(cx + 5).toFixed(1)}" y="${(cy + 14).toFixed(1)}" font-size="9.5" fill="var(--ink-3)" ${sk}>cP = 0 (ค่าเฉลี่ยฐานอ้างอิง)</text>
      <text x="${(W - R - 4)}" y="${(cy - 5).toFixed(1)}" font-size="9.5" fill="var(--ink-3)" text-anchor="end" ${sk}>amp = 0</text></g>
    ${corner("A", cx + 9, T + 15, "start")}${corner("D", cx - 9, T + 15, "end")}
    ${corner("B", cx + 9, H - B - 26, "start")}${corner("C", cx - 9, H - B - 26, "end")}
    ${ref && show ? (() => {
      const x0 = X(pw(c)), y0 = Y(c.amp), x1 = X(ref.P), y1 = Y(ref.A), dx = x1 - x0, dy = y1 - y0, dd = Math.hypot(dx, dy) || 1;
      const sx = x0 + dx / dd * 14, sy = y0 + dy / dd * 14, ex = x1 - dx / dd * 9, ey = y1 - dy / dd * 9;
      // ป้ายอยู่ฝั่งตรงข้ามกับบริษัท ไม่ให้ทับป้ายของบริษัท · ชิดขอบกราฟแล้วกลับด้าน
      let flip = x0 > x1; if (!flip && x1 > W - 250) flip = true; if (flip && x1 < L + 250) flip = false;
      const ly = dd < 70 ? (y0 <= y1 ? y1 + 22 : y1 - 22) : y1 - 4;
      return `<g class="tr-path" pointer-events="none">
        <defs><marker id="trArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--brand)"/></marker></defs>
        ${dd > 24 ? `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="var(--brand)" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#trArrow)"/>` : ""}
        <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="8" fill="var(--panel)" stroke="var(--brand)" stroke-width="2.2" stroke-dasharray="3 2"/>
        <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.6" fill="var(--brand)"/>
        <text x="${(flip ? x1 - 13 : x1 + 13).toFixed(1)}" y="${ly.toFixed(1)}" font-size="10.8" font-weight="600" fill="var(--brand)" text-anchor="${flip ? "end" : "start"}" ${sk}>จุดอ้างอิงเชิงเปรียบเทียบ</text>
        <text x="${(flip ? x1 - 13 : x1 + 13).toFixed(1)}" y="${(ly + 13).toFixed(1)}" font-size="9.4" fill="var(--ink-2)" text-anchor="${flip ? "end" : "start"}" ${sk}>มัธยฐานช่อง Deliver ${ref.scope === "ind" ? "ในอุตสาหกรรมเดียวกัน" : "ทั้งฐาน"} · ไม่ใช่เป้าหมาย</text></g>`;
    })() : ""}
    ${others.map(x => `<g class="mk mv-indmk" tabindex="0" role="button" transform="translate(${X(pw(x)).toFixed(1)},${Y(x.amp).toFixed(1)})"
        data-t="${esc(x.t)}" data-n="${esc(x.n)}" data-i="${x.ipi}" data-z="${esc(ZONES[x.quad || zoneOf(x.promo, x.amp)].l)}" aria-label="${esc(x.t)} — บริษัทในอุตสาหกรรมเดียวกัน">
      <circle r="9" fill="transparent"/><circle r="4.6" fill="var(--panel)" stroke="var(--s2)" stroke-width="2"/></g>`).join("")}
    ${peers.map((p, i) => num(p, i + 1)).join("")}${show ? num(c, 0) : ""}${lab}
    <text x="${(L + (W - L - R) / 2).toFixed(0)}" y="${H - 12}" font-size="11.5" fill="var(--ink-2)" text-anchor="middle">${esc(GX_X)}</text>
    <text transform="translate(14,${(T + (H - T - B) / 2).toFixed(0)}) rotate(-90)" font-size="11" fill="var(--ink-2)" text-anchor="middle">${esc(GX_Y)}</text>
  </svg>`;
}

/** มุมมองตาราง (Speier 2006) — สี่ช่องของ REF-928 + แถวของบริษัทนี้ */
function gxTable(c, v, show) {
  const N = REF_PTS.length;
  const row = k => { const q = QN[k] || [0, 0];
    return `<tr data-q="${k}" class="gx-trow${show && k === v.quad ? " hl" : ""}"><td><b style="color:${ZONES[k].c}">${ZONES[k].l}</b> · ${esc(COMPASS[k].sub)}
      <div class="gx-sm">${k === "A" || k === "B" ? "CEO สูง" : "CEO ต่ำ"} / ${k === "A" || k === "D" ? "บอร์ดสูง" : "บอร์ดต่ำ"} · ${esc(ZONES[k].q)}</div></td>
      <td class="n">${q[1]}</td><td class="n">${fmt(q[1] / N * 100, 1)}%</td><td class="n">${fmt(q[0], 2)}</td></tr>`; };
  const cP = c.cP ?? cpOf(c.promo);
  return `<div class="tw"><table class="gx-tbl"><caption>ฐานอ้างอิง REF-928 แยกตามช่อง (n = ${N} บริษัท-ปี) · OI = จำนวนกิจกรรม open innovation เฉลี่ยต่อปีของกลุ่ม</caption>
    <thead><tr><th>ช่อง</th><th class="n">n</th><th class="n">% ของ ${N}</th><th class="n">OI เฉลี่ย</th></tr></thead>
    <tbody>${["A", "B", "C", "D"].map(row).join("")}</tbody></table></div>
    ${show ? `<div class="tw" style="margin-top:10px"><table class="gx-tbl"><caption>ค่าของบริษัทนี้</caption>
      <thead><tr><th>บริษัท</th><th class="n">P (หลัง winsorise)</th><th class="n">cP</th><th class="n">amp</th><th class="n">B</th><th class="n">OpenInnoScore</th><th class="n">ช่วง 90%</th><th>Tier</th><th>ช่อง</th></tr></thead>
      <tbody><tr class="hl"><td><b>${esc(c.t)}</b></td><td class="n">${fmt(wins(c.promo, "P"), 3)}</td><td class="n">${fmt(cP, 3)}</td>
        <td class="n">${fmt(c.amp, 3)}</td><td class="n">${fmt(c.B ?? cP * c.amp, 4)}</td><td class="n"><b>${fmt(c.ois ?? c.ipi, 1)}</b></td>
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
      <div class="gx-part"><b>หลักฐานที่ควรตรวจ</b><ul class="gx-ev">${ct.ev.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>
      <button class="btn s" data-gxq="">${show ? `← กลับไปที่ตำแหน่งของ ${esc(c.t)} (${ZONES[v.quad].l})` : "← กลับไปที่คำอธิบายนอกกลุ่มอ้างอิง"}</button>
    </div>`;
  }
  const addB = (txt, lab) => `<button class="btn g gx-add" data-gxadd="${esc(txt)}" title="${esc(txt)}">+ เพิ่มประเด็นเข้าสู่แผนพัฒนาบอร์ด${lab ? " · " + lab : ""}</button>`;
  const inPlan = t => (u.plan || []).some(x => x.t === t);
  return `<div class="gx-panel" id="gxPanel" style="--zc:${z.c}">
    <div class="gx-ph"><span class="gx-exlab on">ประเด็นสำหรับบอร์ด · ${esc(c.t)}</span>
      <h3><span style="color:${z.c}">${z.l}</span> · ${esc(ct.sub)}</h3>
      <span class="gx-sm">มุมมอง: ${esc(L.lab)} · ผู้อ่าน: ${esc(ct.audience)}</span></div>
    ${L.id === "credit" ? gxCreditNote(c) : ""}
    <div class="gx-part"><b><i>1</i>สิ่งที่ข้อมูลแสดง</b><p>${esc(gxShows(c, k))}</p></div>
    <div class="gx-part"><b><i>2</i>สิ่งที่ยังสรุปไม่ได้</b><ul class="gx-ev">${gxCannot(c, v, k).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <div class="gx-part"><b><i>3</i>คำถามสำหรับหารือ (3 ข้อ)</b>
      <ol class="gx-qs">${ct.qs.map((q, i) => `<li><span>${esc(q)}</span>
        ${inPlan(q) ? `<span class="pill ok">อยู่ในแผนแล้ว</span>` : addB(q, "คำถามข้อ " + (i + 1))}</li>`).join("")}</ol></div>
    <div class="gx-part"><b><i>4</i>หลักฐานที่ควรตรวจ</b>
      <ul class="gx-ev gx-evb">${ct.ev.map((e, i) => { const t = "ตรวจหลักฐาน E0" + (i + 1) + " · " + e;
        return `<li><span><b>E0${i + 1}</b> ${esc(e)}</span>${inPlan(t) ? `<span class="pill ok">อยู่ในแผนแล้ว</span>` : addB(t, "E0" + (i + 1))}</li>`; }).join("")}</ul></div>
    <div class="gx-part"><b><i>5</i>${esc(ct.askLabel)}</b><p class="gx-ask">${esc(ct.ask)}</p></div>
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
function gxCreditNote(c) {
  const t1 = c.t1 || t1Of(c), pf = typeof S.pilotFormula !== "undefined" ? S.pilotFormula : null;
  return `<div class="note warn gx-cnote"><span class="pill warn">Caution · B_T1</span>
    <b>แนวทาง Pilot Use case 2:</b> แสดงสูตร B_T1 คู่กับป้าย Caution — B_T1: OpenInnoScore ${fmt(t1.ois, 1)} · Tier ${t1.tier} · ช่อง ${t1.quad}
    (ทุกตัวชี้วัด validity ของ B_T1 ต่ำกว่าเกณฑ์ผ่าน ใช้เปรียบเทียบเท่านั้น) ·
    ${pf ? `แถบสถานะตอนนี้แสดง <b>${pf === "T1" ? "B_T1 (shadow · Caution)" : "B_EG (สูตรหลัก)"}</b> — สลับได้ที่หน้าสถาปัตยกรรมข้อมูล · ` : ""}
    <b>political ties และความเป็นกิจการครอบครัวไม่ใช้เป็นเหตุผลในการพิจารณาสินเชื่อ</b></div>`;
}
function gxBank() {
  return `<div class="gx-ph"><span class="gx-exlab on">บอร์ดธนาคาร · Pilot Use case 1</span>
      <h3>บอร์ดธนาคารวางบน Grid นี้ไม่ได้</h3></div>
    <p class="gx-p">ฐานอ้างอิง REF-928 ครอบคลุมบริษัท SET อุตสาหกรรม 1–7 นอกกลุ่มการเงินเท่านั้น ธนาคารจึงอยู่นอกกลุ่มอ้างอิง (R4) —
      ระบบไม่คำนวณตำแหน่ง tier เปอร์เซ็นไทล์ หรือ Signal B และไม่แสดงจุดบนกราฟ จุดพื้นหลังด้านบนเป็นบริษัทนอกกลุ่มการเงินเพื่อให้เห็นนิยามของช่องเท่านั้น</p>
    <p class="gx-p">สำหรับบอร์ดธนาคาร ใช้ชุดคำถามประเมินตนเองระดับคณะ OI-1…OI-6 (CG Code 2560) และโปรไฟล์องค์ประกอบคณะกรรมการเชิงพรรณนาแทน ·
      ไม่ประเมินกรรมการรายบุคคล · political ties ไม่ใช่เหตุผลเชิงบวก</p>
    <div class="gx-row"><button class="btn p" data-goto="bod">BOD Self-Assessment (OI-1…6)</button>
      <button class="btn s" data-goto="outdomain">โหมดนอกกลุ่มอ้างอิง (ธนาคาร)</button></div>`;
}
function gxOut(c) {
  return `<div class="gx-ph"><span class="gx-exlab on">นอกกลุ่มอ้างอิง</span><h3>${esc(c.t)} อยู่นอกกลุ่มอ้างอิง — ไม่แสดงตำแหน่งบน Grid</h3></div>
    <p class="gx-p">บริษัทนี้อยู่นอกอุตสาหกรรม 1–7 หรือไม่มีสารถึงผู้ถือหุ้นภาษาอังกฤษ (R4) ระบบจึงไม่วางจุดบนกราฟ ·
      ใช้โปรไฟล์เชิงพรรณนาและชุดคำถาม BOD แทน</p>
    <div class="gx-row"><button class="btn p" data-goto="outdomain">เปิดโหมดนอกกลุ่มอ้างอิง</button>
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
    : !L.placeable ? `<div class="note warn gx-msg"><b>มุมมองบอร์ดธนาคาร</b> — ธนาคารอยู่นอกฐานอ้างอิง REF-928 จึงไม่แสดงจุดบนกราฟ (R4)
        <button class="btn s" data-goto="bod">OI-1…6</button><button class="btn s" data-goto="outdomain">โหมดนอกกลุ่มอ้างอิง</button></div>` : "";
  return pageHead("Board Strategy Compass · 2×2", "ตำแหน่งบริษัทและประเด็นสำหรับการหารือของบอร์ด",
    `Grid นี้ใช้เปิด <b>ประเด็นที่บอร์ดควรหารือ</b> — ไม่ได้บอกว่าบริษัทควรย้ายไปช่องใด ·
     คลิกจุดของบริษัท (หมายเลข 1) หรือคลิกช่องใดก็ได้ เพื่อดูคำถาม หลักฐานที่ควรตรวจ และเรื่องที่ให้พิจารณาใต้กราฟ`)
    + gxLensBar()
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
            <span><i style="background:var(--ok);opacity:.55"></i>A Deliver</span>
            <span><i style="background:var(--serious);opacity:.55"></i>C Develop</span>
            <span><i style="background:var(--ink-3);opacity:.45"></i>B Discipline · D Discover</span>
            ${show ? `<span><i style="background:var(--ink);border-radius:99px"></i><b>1</b> ${esc(c.t)} — คลิกเพื่อเปิดประเด็น</span>` : ""}
            ${peers.map((p, i) => `<span><i style="background:${SER[i]};border-radius:99px"></i><b>${i + 2}</b> ${esc(p.t)} (คู่เทียบ)</span>`).join("")}
            ${indOn ? `<span><i style="background:transparent;border:2px solid var(--s2);border-radius:99px"></i>บริษัทอื่นใน${esc(IND[c.ind] || "อุตสาหกรรมเดียวกัน")} (${gxIndCos(c, show).length} บริษัท · คลิกเพื่อเปิด)</span>` : ""}</div>`}
          <div class="gx-qpick"><span class="gx-sm">ดูคำถามประจำช่อง:</span>${["D", "A", "C", "B"].map(k =>
            `<button class="btn g${k === sel.q ? " on" : ""}" data-gxq="${k}" style="--zc:${ZONES[k].c}">${ZONES[k].l}${show && k === v.quad ? " ●" : ""}</button>`).join("")}</div>
          <p class="gx-split">${esc(GX_SPLIT)}</p>
          ${ref ? gxPathCard(c, ref) : ""}
          ${indOn ? gxIndCard(c) : ""}
        </div>
        <aside class="gx-side"><div class="gx-sideh">ที่มาของข้อมูลและสถานะตรวจคุณภาพ</div>${gxProv(c, v)}
          <p class="gx-sm">${indOn ? `จุดพื้นหลัง = REF-928 เฉพาะ${esc(IND[c.ind] || "อุตสาหกรรมเดียวกัน")} (ไม่ระบุชื่อ)` : "จุดพื้นหลัง = REF-928 ทั้งชุด (ไม่ระบุชื่อ)"} ·
            ${gxMode() === "peers" ? "วงกลม 2–4 = คู่แข่ง 3 รายที่เลือก (ชุดเดียวกับหน้า “เทียบคู่แข่ง” · คลิกเพื่อเลือกเปิดประเด็นของบริษัทนั้น)"
              : gxMode() === "industry" ? "วงกลมโปร่ง = บริษัทอื่นในอุตสาหกรรมเดียวกัน (ชุดแสดงผลปีบัญชี 2566)"
              : gxRank() >= 1 ? "มุมมอง “ดูเฉพาะบริษัท” — เลือกมุมมองที่ 2 หรือ 3 เพื่อแสดงบริษัทอื่น" : "ระดับ Free แสดงเฉพาะตำแหน่งบริษัทของคุณ — ไม่แสดงจุดของบริษัทอื่นที่ระบุชื่อ"}</p></aside>
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
  const cX = promoPct(c.promo), rX = promoPct(ref.P), cY = ampPct(c.amp), rY = ampPct(ref.A);
  const row = (l, a, b) => { const d = Math.round((b - a) * 10) / 10;
    return `<tr><td>${esc(l)}</td><td class="n">${fmt(a, 0)}</td><td class="n">${fmt(b, 0)}</td>
      <td class="n"><b>${d > 0 ? "+" : ""}${fmt(d, 0)}</b></td>
      <td>${d > 0 ? "บริษัทในช่อง Deliver กลุ่มนี้มีค่ากลางสูงกว่า" : d < 0 ? "บริษัทนี้สูงกว่าค่ากลางของช่อง Deliver กลุ่มนี้" : "ใกล้เคียงกัน"}</td></tr>`; };
  return `<div class="tr-pathcard">
    <div class="tr-pathh"><b>จุดอ้างอิงเชิงเปรียบเทียบ (ค่ามัธยฐานช่อง Deliver ในอุตสาหกรรมเดียวกัน) — ไม่ใช่เป้าหมายที่ระบบแนะนำ</b>
      ${ref.scope === "all" ? `<span class="pill warn">ช่อง Deliver ในอุตสาหกรรมนี้มีน้อยกว่า 5 บริษัท-ปี — ใช้มัธยฐานทั้งฐานแทน</span>` : `<span class="pill mute">n = ${ref.n} บริษัท-ปี</span>`}</div>
    <div class="grid g2 tight" style="gap:12px;align-items:start">
      <div><div class="tr-k">ระยะห่างบนแต่ละแกน (เปอร์เซ็นไทล์ในฐานอ้างอิง)</div>
        <div class="tw"><table class="tr-tbl"><thead><tr><th>แกน</th><th class="n">${esc(c.t)}</th><th class="n">จุดอ้างอิง</th><th class="n">ระยะห่าง</th><th>อ่านว่า</th></tr></thead>
          <tbody>${row("CEO Promotion Focus (แกนนอน)", cX, rX)}${row("Board Amplification Signal (แกนตั้ง)", cY, rY)}</tbody></table></div></div>
      <div><div class="tr-k">คะแนน ณ จุดอ้างอิง</div>
        <div class="tr-refois"><span class="num">${fmt(ref.ois, 0)}</span><span>OpenInnoScore ณ จุดอ้างอิง · ${esc(c.t)} ปัจจุบัน ${fmt(c.ois ?? c.ipi, 0)}</span></div>
        <p class="gx-sm" style="margin:6px 0 0">เส้นประคือระยะห่างเชิงตำแหน่งบนกราฟ ไม่ใช่เส้นทางที่ระบบแนะนำให้เดิน ·
          บริษัทในช่อง Deliver ของกลุ่มเดียวกัน<b>มีความสัมพันธ์</b>กับตำแหน่งนี้ในข้อมูลย้อนหลัง — ไม่ได้แปลว่าการขยับค่าบนแกนจะทำให้ย้ายช่องหรือเกิดนวัตกรรมเพิ่ม ·
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
    <p class="gx-sm" style="margin:6px 0 0">จุดพื้นหลังบนกราฟกรองเหลือเฉพาะอุตสาหกรรมเดียวกัน (ไม่ระบุชื่อ) · วงกลมโปร่ง = บริษัทในชุดแสดงผล · สัดส่วนเป็นการพรรณนาฐานอ้างอิง ไม่ใช่การจัดอันดับ</p></div>`;
}

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
    tipOn(m, el => `<div class="tk">${esc(el.dataset.z)}</div><b>${esc(el.dataset.t)}</b> · ${esc(el.dataset.n)}<br>OIS ${el.dataset.i}
      ${me ? "<br>คลิกเพื่อเปิดประเด็นสำหรับบอร์ด" : "<br>คลิกเพื่อเลือกเปิดประเด็นของบริษัทนี้"}`);
    const act = e => {
      e.stopPropagation(); if (typeof TT !== "undefined" && TT) TT.classList.remove("on");
      if (me) { S.gxSel = null; S._gxScroll = true; render(); return; }
      closePop();
      const wr = wrap.getBoundingClientRect(), r = m.getBoundingClientRect();
      const pop = document.createElement("div"); pop.className = "gx-pop"; pop.setAttribute("role", "dialog");
      pop.innerHTML = `<b>${esc(m.dataset.t)}</b> · ${esc(m.dataset.n)}<div class="gx-sm">${esc(m.dataset.z)} · OIS ${esc(m.dataset.i)} · คู่เทียบ</div>
        <div class="gx-row"><button class="btn p" data-open="1">เปิดประเด็นของบริษัทนี้</button><button class="btn g" data-x="1">ปิด</button></div>`;
      wrap.appendChild(pop);
      const pw = pop.offsetWidth;
      pop.style.left = Math.max(4, Math.min(r.left - wr.left + r.width / 2 - pw / 2, wr.width - pw - 4)) + "px";
      pop.style.top = (r.bottom - wr.top + 6) + "px";
      pop.querySelector("[data-x]").onclick = closePop;
      pop.querySelector("[data-open]").onclick = () => {
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
    <p class="gx-lensline">มุมมอง: <b>${esc(L.lab)}</b> · ผู้อ่าน: <b>${esc(L.audience)}</b></p>`;
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
      <h2 class="cmp-h1">${!cp ? "บอร์ดธนาคาร — ใช้การประเมินตนเองระดับคณะแทนตำแหน่งบน Grid" : esc(c.t) + " อยู่นอกกลุ่มอ้างอิง"}</h2>
      <div class="grid g-side-r cmp-pos"><div>${grid}</div>
        <div class="cmp-panel">${!cp ? gxBank() : gxOut(c)}</div></div>
      ${legal}</div>`;
  }

  return `<div class="cmp">${head}
    <h2 class="cmp-h1">${esc(cp.head)}</h2>
    <p class="cmp-sub">${esc(c.n)} (${esc(c.t)}) · วาระทบทวนการกำกับดูแลนวัตกรรม · สำหรับ${esc(L.audience)}</p>

    <h3 class="cmp-sec">ตำแหน่งจากผลโมเดล</h3>
    <div class="grid g-side-r cmp-pos">
      <div>${grid}
        <div class="cmp-inputs">ค่าป้อน: CEO Promotion Focus ${fmt(wins(c.promo, "P"), 3)} (cP ${fmt(c.cP ?? cpOf(c.promo), 3)}) ·
          amp ${fmt(c.amp, 3)} · B ${fmt(c.B ?? (cpOf(c.promo) * c.amp), 4)} ·
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

    <h3 class="cmp-sec">คำถามที่ใช้ในการหารือ (3 ข้อ)
      <span class="cmp-tag">คำถามประยุกต์จากงานวิจัย ไม่ใช่แบบวัดที่รับรองแล้ว</span></h3>
    <ol class="cmp-qs">${cp.qs.map((q, i) => `<li>${esc(q)} <span class="cmp-ev">หลักฐาน E0${Math.min(i + 1, cp.ev.length)}</span></li>`).join("")}</ol>

    <h3 class="cmp-sec">จากหลักฐานสู่การดำเนินการ
      <span class="cmp-tag">ช่องสีขาวเป็นข้อมูลที่ผู้ใช้กรอกและตรวจทานเอง — ระบบไม่เติมมติให้</span></h3>
    <div class="tw"><table class="cmp-tbl"><thead><tr>
      <th style="width:26%">หลักฐานที่ควรตรวจ <span>ระบบเสนอ</span></th>
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
    <p class="cmp-ask">${esc(cp.ask)}</p>
    <div class="gx-sm" style="margin-bottom:5px">ผลหลังประชุม — ผู้ใช้กรอกหลังประชุมจริงเท่านั้น — ระบบไม่เติมมติ</div>
    ${field("res", "มติหรือข้อสรุปหลังการประชุมจริง — กรอกหลังประชุมเท่านั้น", 3)}
    <p class="cmp-status">สถานะ: ${u.res ? "มีบันทึกผลหลังประชุมแล้ว" : "ยังไม่มีมติ"} ·
      การเห็นชอบแผนศึกษานี้ไม่ใช่การอนุมัติงบลงทุนหรือรับรองพันธมิตร</p>

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
