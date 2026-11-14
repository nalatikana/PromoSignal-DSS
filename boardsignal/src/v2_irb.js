/* ============================================================================
   v2_irb.js — OpenInnoScore MVP1 · ส่วนงานวิจัยในคน (REC/IRB ชุด v10 · 30 ต.ค. 2569 · บันทึกอาจารย์ 14 พ.ย. 2569 ข้อ 2)
     1. หน้าข้อความยินยอมเมื่อเข้าระบบครั้งแรก — เอกสารชี้แจงชุดที่ 3 + หนังสือแสดงความยินยอม (ข้อความตรงตามภาพจำลองของอาจารย์ /
        AF03-06 EN) · ต้องลงนามก่อนใช้ระบบ · ปฏิเสธ = ออกจากระบบ · หน้า "consent" ดูบันทึกการลงนาม ดาวน์โหลดสำเนา และขอถอนตัว
     2. แบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2 · ภาคผนวก ฉ) — 8 หน้าจอตามภาพจำลอง · กลุ่ม A/B (ภาพเมทริกซ์ 2×2 / ตาราง)
        · สถิติสำหรับผู้ดูแลตามแผนการวิเคราะห์ของโครงร่าง (3.2.4.2 (จ) และตารางที่ 3.10)
     3. ภาคผนวก ค แบบบันทึกการนำร่อง (หน้า "pilotrec") · ภาคผนวก ง แบบบันทึกการสัมภาษณ์ผู้เชี่ยวชาญ (หน้า "expertrec")
   ภาษา: S.lang === "EN" แสดงข้อความอังกฤษโดยตรง (ไม่ผ่านชั้นแปล) · ข้อความไทยตรงตามต้นฉบับ
   ข้อห้ามคำ (บันทึกอาจารย์ 14 พ.ย.): ข้อความต้นฉบับที่มีคำว่า "สถาบันการเงิน" / "financial institutions" ถูกตัดออกที่ WORDING_FIX ที่เดียว
   ============================================================================ */
(function () {
  "use strict";
  if (typeof S !== "object" || typeof VIEWS !== "object") return;
  /* ---- ข้อความต้นฉบับ (สร้างโดย gen_irb_data.py · ห้ามแก้ด้วยมือ) ----
     ไทย: ภาพจำลองของอาจารย์ OpenInnoScore_Survey_Mockup_Step4-2_v2_20261030.html (ตรงกับภาคผนวก ฉ และเอกสารชี้แจงชุดที่ 3)
     อังกฤษ: AF03-06_PIS_Consent_4Sets_EN_20261030.docx (ชุดที่ 3) */
  const PIS_TH = [["kv", "ชื่อโครงการวิจัย", "การพัฒนาและศึกษาความเป็นไปได้เชิงพาณิชย์ของต้นแบบนวัตกรรมเครื่องมือประเมินแรงจูงใจเชิงกำกับของผู้นำองค์กรที่ส่งผลกระทบต่อการดำเนินกลยุทธ์นวัตกรรมแบบเปิดโดยมีโครงสร้างคณะกรรมการบริษัทเป็นตัวแปรกำกับ"], ["kv", "ชื่อผู้วิจัย", "นางสาวครองสิญจ์ สมประสงค์ ตำแหน่ง นิสิตระดับบัณฑิตศึกษา (นิสิตปริญญาเอกที่สอบผ่านการสอบวัดคุณสมบัติแล้ว) หลักสูตรวิทยาศาสตรดุษฎีบัณฑิต สาขาวิชาการจัดการเทคโนโลยีและนวัตกรรมผู้ประกอบการ (สหสาขาวิชา)"], ["kv", "สถานที่ทำงานและที่อยู่ติดต่อ", "ระดับปริญญาเอก หลักสูตรวิทยาศาสตรดุษฎีบัณฑิต สาขาวิชาการจัดการเทคโนโลยีและนวัตกรรมผู้ประกอบการ (สหสาขาวิชา) จุฬาลงกรณ์มหาวิทยาลัย 254 ถนนพญาไท แขวงวังใหม่ เขตปทุมวัน กรุงเทพฯ 10330 โทรศัพท์มือถือ 082-492-2451 E-mail: krongsin.s@gmail.com"], ["kv", "แหล่งทุนวิจัย/ผู้สนับสนุนการวิจัย", "ไม่มี (ทุนส่วนตัวของผู้วิจัย)"], ["kv", "ฉบับของเอกสาร", "ฉบับที่ 1 วันที่ 30 ตุลาคม 2569 (ระบบแสดงเลขที่หนังสือรับรองจริยธรรมในหน้าลงนามยินยอมหลังได้รับการรับรอง)"], ["p", "ขอเรียนเชิญท่านเข้าร่วมการวิจัย ก่อนตัดสินใจเข้าร่วมในการวิจัย โปรดทำความเข้าใจว่างานวิจัยนี้เกี่ยวข้องกับอะไรและทำเพราะเหตุใด กรุณาใช้เวลาในการอ่านข้อมูลต่อไปนี้อย่างรอบคอบ หากมีข้อความใดที่อ่านแล้วไม่เข้าใจหรือไม่ชัดเจน โปรดสอบถามเพิ่มเติมกับผู้วิจัยได้ตลอดเวลา"], ["cap", "ตารางที่ 1", "สาระสำคัญโดยย่อ"], ["table", [["เรื่อง", "สรุป"], ["สิ่งที่ท่านดำเนินการ", "ลงนามยินยอมผ่านระบบ ชมการสาธิตระบบประมาณ 20 นาที ตอบแบบสอบถามประเมินต้นแบบนวัตกรรมผ่านระบบประมาณ 30 นาที และทบทวนการอ่านผลกับผู้วิจัยประมาณ 10 นาที รวม 1 ครั้ง ไม่เกิน 60 นาที (ข้อ 8)"], ["ความเสี่ยง", "ต่ำ ได้แก่ การสละเวลา และความเสี่ยงที่ความเห็นอาจถูกระบุตัวได้ ผู้วิจัยลดความเสี่ยงด้วยการใช้รหัสแทนตัวตนและรายงานเฉพาะภาพรวม (ข้อ 9)"], ["ข้อมูลส่วนบุคคลที่เก็บ", "ข้อมูลบัญชีผู้ใช้ เวลาที่ส่งคำตอบ บันทึกการลงนามยินยอม และช่องทางติดต่อเฉพาะผู้ที่ประสงค์ให้ติดต่อกลับ ระบบไม่เก็บหมายเลข IP และไม่เก็บข้อมูลอ่อนไหว (ข้อ 11)"], ["สิทธิของท่าน", "เข้าร่วมโดยสมัครใจ ถอนตัวได้ทุกเมื่อ และขอให้ลบข้อมูลได้ถึงวันที่ 20 กุมภาพันธ์ 2570 (ข้อ 11.7 และข้อ 14)"], ["ค่าตอบแทน", "ไม่มี (ข้อ 13)"]]], ["h", "รายละเอียดงานวิจัย"], ["h", "1. งานวิจัยนี้ศึกษาอะไรและทำเพื่ออะไร"], ["p", "งานวิจัยนี้พัฒนาระบบช่วยประเมินชื่อ OpenInnoScore ซึ่งใช้ข้อมูลที่บริษัทจดทะเบียนเปิดเผยต่อสาธารณะ เช่น รายงานประจำปีและแบบ 56-1 One Report มาสรุปแนวโน้มการดำเนินนวัตกรรมแบบเปิดของบริษัทเป็นคะแนนระดับบริษัท ระบบไม่ประเมินบุคคลรายคน งานวิจัยระยะนี้ต้องการทราบว่าปัญหาที่ระบบมุ่งแก้มีอยู่จริงหรือไม่ ระบบเข้ากับการทำงานจริงหรือไม่ ผู้ใช้เข้าใจและยอมรับระบบหรือไม่ และระบบมีความเป็นไปได้เชิงพาณิชย์ภายใต้เงื่อนไขใด ในขั้นนี้ ผู้วิจัยขอให้ท่านชมการสาธิตระบบและตอบแบบสอบถามประเมินต้นแบบนวัตกรรมผ่านระบบออนไลน์ เพื่อประเมินการยอมรับ ความง่ายในการใช้งาน ความเข้าใจผล และคุณค่าเชิงพาณิชย์ของบริการ"], ["h", "2. การเปิดเผยผลประโยชน์"], ["p", "ผู้วิจัยตั้งใจนำผลการวิจัยไปใช้เชิงพาณิชย์หลังสิ้นสุดโครงการ ซึ่งอาจเป็นผลประโยชน์ทางการเงินแก่ผู้วิจัยในอนาคต ระหว่างโครงการไม่มีการขาย การทำสัญญา หรือการรับชำระเงิน และสิทธิ์ในทรัพย์สินทางปัญญาของผลงานเป็นไปตามระเบียบที่เกี่ยวข้องของจุฬาลงกรณ์มหาวิทยาลัย"], ["h", "3. การให้ข้อมูลและการขอความยินยอม"], ["p", "ผู้วิจัยส่งเอกสารนี้พร้อมหนังสือเชิญล่วงหน้าอย่างน้อย 3 วัน เพื่อให้ท่านมีเวลาอ่านและสอบถามผู้วิจัยก่อนตัดสินใจ หากท่านตัดสินใจเข้าร่วม ท่านลงนามยินยอมผ่านระบบก่อนเริ่มตอบแบบสอบถาม โดย (1) เข้าสู่ระบบด้วยบัญชีที่ได้รับเชิญ (2) อ่านเอกสารนี้ในหน้าลงนามยินยอม (3) ทำเครื่องหมายในช่องยืนยันแต่ละข้อของหนังสือแสดงความยินยอม และ (4) กดปุ่ม “ลงนามยินยอม” ระบบบันทึกบัญชีผู้ลงนาม วันและเวลาที่ลงนาม ฉบับของเอกสาร และรายการที่ท่านยินยอม และเปิดแบบสอบถามให้หลังลงนามแล้วเท่านั้น ท่านดาวน์โหลดสำเนาเอกสารนี้และหนังสือแสดงความยินยอมที่ลงนามแล้วเก็บไว้ได้ การกดปุ่ม “ลงนามยินยอม” เป็นการลงลายมือชื่ออิเล็กทรอนิกส์ตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544"], ["h", "4. รายละเอียดของผู้เข้าร่วมการวิจัยและคุณสมบัติ"], ["p", "ผู้ใช้เป้าหมาย 30 คน ผู้วิจัยตั้งเป้าหมายเชิญผู้เข้าร่วมทั้งหมดไม่เกิน 50 คน แบ่งเป็นกลุ่มละอย่างน้อย 5 คน และรับผู้ตอบไม่เกิน 2 คนต่อองค์กรจาก 4 กลุ่ม ได้แก่"], ["ol", ["ผู้ปฏิบัติงานด้านเลขานุการบริษัท การกำกับดูแลกิจการ หรือกลยุทธ์ในบริษัทจดทะเบียน", "ผู้ดูแลความสัมพันธ์ลูกค้าองค์กร เช่น ในสถาบันการเงิน บริษัทที่ปรึกษา หรือบริษัทให้บริการด้านการเงินและการลงทุน", "ที่ปรึกษาสรรหาผู้บริหาร", "นักลงทุนหรือนักวิเคราะห์"]], ["h", "5. เกณฑ์คัดเข้า"], ["ol", ["อายุ 20 ปีขึ้นไป", "ปฏิบัติงานในกลุ่มใดกลุ่มหนึ่งไม่น้อยกว่า 2 ปี", "อ่านและเข้าใจภาษาไทย", "เข้าระบบออนไลน์ได้ด้วยบัญชีที่ได้รับเชิญ สมัครใจเข้าร่วม และลงนามยินยอมผ่านระบบ"]], ["h", "6. เกณฑ์คัดออก"], ["ol", ["บุคลากรขององค์กรที่ผู้วิจัยใช้นำร่องระบบ", "ผู้ที่เข้าร่วมขั้นตอนที่ 4.1", "ผู้ที่มีความสัมพันธ์เชิงพาณิชย์กับโครงการ"]], ["h", "7. การคัดกรองผู้เข้าร่วมวิจัย"], ["p", "ผู้วิจัยเชิญผ่านเครือข่ายวิชาชีพร่วมกับการแนะนำต่อ และผู้สนใจนัดหมายกับผู้วิจัยเอง ก่อนนัดหมาย ผู้วิจัยสอบถามคุณสมบัติของท่านตามเกณฑ์ในข้อ 5 และข้อ 6 โดยย่อ ใช้เวลาประมาณ 5 นาที ทางโทรศัพท์หรือข้อความ การคัดกรองไม่มีอันตราย ผู้ที่ไม่ผ่านเกณฑ์จะไม่ถูกบันทึกข้อมูลใด ๆ ท่านต้องผ่านการคัดกรองก่อนจึงจะเป็นผู้เข้าร่วมวิจัยได้"], ["h", "8. สิ่งที่ผู้เข้าร่วมวิจัยดำเนินการ"], ["p", "ท่านเข้าร่วม 1 ครั้ง ไม่เกิน 60 นาที แบบพบตัวหรือออนไลน์ ระหว่างวันที่ 16 มกราคม ถึง 12 กุมภาพันธ์ 2570 ตามลำดับในตารางที่ 2"], ["cap", "ตารางที่ 2", "ลำดับกิจกรรมและเวลาโดยประมาณ"], ["table", [["ลำดับ", "กิจกรรม", "เวลาโดยประมาณ"], ["1", "ลงนามยินยอมผ่านระบบตามข้อ 3", "ก่อนเริ่มกิจกรรม"], ["2", "ชมการสาธิตระบบตามบทสาธิตมาตรฐานด้วยข้อมูลสาธารณะของบริษัทจดทะเบียน", "20 นาที"], ["3", "ตอบแบบสอบถามประเมินต้นแบบนวัตกรรม 7 ส่วน ตามตารางที่ 3", "30 นาที"], ["4", "ทบทวนการอ่านผลกับผู้วิจัย", "10 นาที"]]], ["cap", "ตารางที่ 3", "ส่วนของแบบสอบถามประเมินต้นแบบนวัตกรรม"], ["table", [["ส่วนของแบบสอบถาม", "เนื้อหา", "จำนวน"], ["1 ข้อมูลทั่วไป", "กลุ่มผู้ใช้และช่วงประสบการณ์ทำงาน", "2 ข้อ"], ["2 งานตามสถานการณ์", "อ่านผลของบริษัทสาธิต ระบบจับเวลาและบันทึกความถูกต้อง", "5 งาน"], ["3 SUS", "ความง่ายในการใช้งานระบบ", "10 ข้อ"], ["4ก แบบสอบถามการยอมรับเทคโนโลยี", "การรับรู้ความง่ายในการใช้งาน การรับรู้ประโยชน์ ทัศนคติในการใช้งาน และความตั้งใจที่จะใช้", "17 ข้อ"], ["4ข คุณค่าเชิงพาณิชย์", "ชุดทางเลือกการซื้อ และคำถามประกอบ", "3 ชุด และ 6 ข้อ"], ["5 ความเข้าใจ", "ความหมายของผลที่ระบบแสดง", "5 ข้อ"], ["6 คำถามปลายเปิด", "ประโยชน์ของรายงาน จุดที่เข้าใจยาก และข้อเสนอแนะ", "5 ข้อ"]]], ["p", "ระบบจัดผู้ตอบเข้ากลุ่มการแสดงผล 2 แบบ (ภาพเมทริกซ์ 2×2 หรือตาราง) สลับกันตามลำดับการเข้าร่วม ซึ่งไม่ใช่การสุ่ม และทั้งสองกลุ่มเห็นหลักฐานชุดเดียวกัน ชุดบริการและราคาในส่วนคุณค่าเชิงพาณิชย์เป็นสถานการณ์สมมติ ไม่มีการขายหรือรับชำระเงิน"], ["p", "ในส่วนที่ 4ข ข้อ 6 ท่านเลือกได้ว่าประสงค์ให้ผู้วิจัยติดต่อกลับเพื่อสนทนาเรื่องบทบาทผู้ซื้อหรือความร่วมมือในขั้นตอนที่ 5.3 หรือไม่ หากประสงค์ ท่านระบุช่องทางติดต่อ ซึ่งระบบเก็บแยกจากคำตอบ การให้ช่องทางติดต่อไม่ใช่การยินยอมเข้าร่วมขั้นตอนที่ 5.3 เพราะผู้วิจัยจะส่งเอกสารชี้แจงชุดที่ 4 และขอให้ท่านลงนามก่อนเริ่ม และการไม่ให้ช่องทางติดต่อไม่มีผลต่อการเข้าร่วมขั้นตอนนี้"], ["p", "ผู้วิจัยไม่บันทึกเสียงหรือภาพ ท่านข้ามข้อคำถามที่ไม่ต้องการตอบได้ ยกเว้นงานตามสถานการณ์ในส่วนที่ 2 ซึ่งระบบให้ตอบแต่ละงานก่อนไปงานถัดไป และท่านหยุดตอบแบบสอบถามได้ทุกเมื่อ"], ["h", "9. ความเสี่ยงและความไม่สะดวกที่อาจเกิดขึ้น"], ["p", "การเข้าร่วมมีความเสี่ยงต่ำ ได้แก่ ความไม่สะดวกจากการสละเวลา และความเสี่ยงที่ความเห็นของท่านอาจถูกระบุตัวได้ ผู้วิจัยป้องกันโดยใช้รหัสแทนชื่อ ไม่ยกคำพูดรายบุคคล และไม่รายงานกลุ่มย่อยที่มีน้อยกว่า 5 คน ความเสี่ยงที่ข้อมูลรั่วไหลจากระบบออนไลน์อยู่ในระดับต่ำ และผู้วิจัยลดความเสี่ยงด้วยมาตรการในข้อ 11.6 หากท่านรู้สึกไม่สะดวกระหว่างกิจกรรม ท่านหยุดพักหรือยุติได้ทันที หากเกิดผลกระทบใด ๆ จากการเข้าร่วม โปรดแจ้งผู้วิจัยที่หมายเลข 082-492-2451"], ["h", "10. ประโยชน์ในการเข้าร่วมการวิจัย"], ["p", "ท่านไม่ได้รับประโยชน์โดยตรง แต่ได้ทดลองใช้ระบบประเมินรูปแบบใหม่ และได้รับสรุปผลระดับกลุ่มเมื่อร้องขอ ผลการวิจัยจะช่วยพัฒนาเครื่องมือที่ใช้ข้อมูลสาธารณะเพื่อสนับสนุนการอภิปรายเรื่องการกำกับดูแลนวัตกรรมของบริษัทจดทะเบียน"], ["h", "11. การเก็บรักษาความลับและการคุ้มครองข้อมูลส่วนบุคคล"], ["p", "ข้อมูลของท่านเก็บเป็นความลับ ผู้วิจัยดำเนินการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 และเก็บข้อมูลเท่าที่จำเป็นต่อการวิจัย ดังนี้"], ["sh", "11.1 ผู้รับผิดชอบข้อมูลส่วนบุคคล"], ["p", "ผู้วิจัย (นางสาวครองสิญจ์ สมประสงค์) เป็นผู้ควบคุมข้อมูลส่วนบุคคลของโครงการวิจัยนี้ ท่านติดต่อเรื่องข้อมูลส่วนบุคคลได้ที่โทรศัพท์มือถือ 082-492-2451 หรือ E-mail: krongsin.s@gmail.com"], ["sh", "11.2 ข้อมูลที่เก็บ วัตถุประสงค์ และระยะเวลาเก็บ"], ["cap", "ตารางที่ 4", "ข้อมูลส่วนบุคคลที่เก็บ วัตถุประสงค์ การจัดเก็บ และระยะเวลาเก็บ"], ["table", [["ข้อมูล", "วัตถุประสงค์", "การจัดเก็บและผู้เข้าถึง", "ระยะเวลาเก็บ"], ["ข้อมูลบัญชีผู้ใช้ ได้แก่ อีเมลหรือชื่อบัญชี ชื่อที่แสดง และวิธีเข้าสู่ระบบ", "ยืนยันว่าเป็นผู้ได้รับเชิญ ป้องกันการตอบซ้ำ และรองรับการขอถอนตัว", "ระบบออนไลน์ เข้าถึงได้เฉพาะผู้วิจัยและผู้ดูแลระบบ", "ตัดการเชื่อมโยงกับคำตอบหลังวันที่ 20 กุมภาพันธ์ 2570 และลบภายในวันที่ 31 สิงหาคม 2570"], ["รหัสสุ่มของเบราว์เซอร์และเวลาที่ส่งคำตอบ", "ป้องกันการตอบซ้ำ", "เก็บคู่กับคำตอบในระบบออนไลน์", "เช่นเดียวกับข้อมูลบัญชีผู้ใช้"], ["บันทึกการลงนามยินยอม ได้แก่ บัญชีผู้ลงนาม วันและเวลาที่ลงนาม ฉบับของเอกสาร และรายการที่ยินยอม", "เป็นหลักฐานการให้ความยินยอม", "เก็บแยกจากคำตอบ เข้าถึงได้เฉพาะผู้วิจัยและผู้ดูแลระบบ", "ลบภายในวันที่ 31 สิงหาคม 2570"], ["คำตอบแบบสอบถาม เวลาและความถูกต้องของงานตามสถานการณ์ และผลการทบทวนการอ่านผล", "วิเคราะห์ผลการวิจัย", "ผู้วิจัยส่งออกข้อมูลวิเคราะห์ด้วยรหัสแทนอีเมล ผู้เข้าถึงคือผู้วิจัยและอาจารย์ที่ปรึกษา", "ทำลายข้อมูลดิบภายในวันที่ 31 สิงหาคม 2570 และเก็บเฉพาะสถิติระดับกลุ่ม"], ["ช่องทางติดต่อ (เฉพาะผู้ที่ประสงค์ให้ติดต่อกลับ)", "ติดต่อเพื่อเชิญเข้าร่วมขั้นตอนที่ 5.3", "เก็บแยกจากคำตอบ เข้าถึงได้เฉพาะผู้วิจัย", "ทำลายหลังวันที่ 20 กุมภาพันธ์ 2570"]]], ["p", "ระบบไม่เก็บหมายเลข IP ไม่บันทึกเสียง ภาพ หรือวิดีโอ ไม่ขอเลขประจำตัวประชาชน และไม่เก็บข้อมูลส่วนบุคคลที่มีความอ่อนไหวตามมาตรา 26 ของพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"], ["sh", "11.3 ฐานในการประมวลผลและผลของการไม่ให้ข้อมูล"], ["p", "ผู้วิจัยเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่านโดยอาศัยความยินยอมของท่านตามมาตรา 19 และใช้เฉพาะเพื่อวัตถุประสงค์ของการวิจัยนี้ ท่านไม่มีหน้าที่ตามกฎหมายหรือสัญญาที่ต้องให้ข้อมูล หากท่านไม่ให้ความยินยอม ท่านจะไม่ได้ตอบแบบสอบถามในขั้นตอนนี้ โดยไม่มีผลกระทบใด ๆ ต่อท่าน"], ["sh", "11.4 ผู้ที่อาจได้รับข้อมูล"], ["p", "ผู้วิจัยไม่ขาย ไม่ให้ และไม่เปิดเผยข้อมูลที่ระบุตัวท่านแก่บุคคลภายนอก ผู้ที่เข้าถึงข้อมูลได้มีเพียง (1) ผู้วิจัยและผู้ดูแลระบบ ซึ่งเข้าถึงข้อมูลรายคน (2) อาจารย์ที่ปรึกษาวิทยานิพนธ์ ซึ่งเข้าถึงข้อมูลที่ใช้รหัสแทนอีเมล (3) ผู้ให้บริการเซิร์ฟเวอร์ให้เช่า ซึ่งจัดเก็บข้อมูลตามคำสั่งของผู้วิจัยและไม่มีสิทธิ์ใช้ข้อมูลเพื่อวัตถุประสงค์อื่น และ (4) คณะกรรมการพิจารณาจริยธรรมการวิจัย ซึ่งอาจขอตรวจเอกสารของโครงการเพื่อกำกับดูแลการวิจัย ผู้พัฒนาระบบภายนอกไม่มีสิทธิ์เข้าถึงระบบเก็บข้อมูลและข้อมูลของท่าน ผู้วิจัยเสนอผลการวิจัยเป็นภาพรวม ไม่ยกคำพูดรายบุคคล และไม่รายงานกลุ่มย่อยที่มีผู้ตอบน้อยกว่า 5 คน"], ["sh", "11.5 สถานที่จัดเก็บและการส่งข้อมูลไปต่างประเทศ"], ["p", "ระบบออนไลน์ใช้บริการเซิร์ฟเวอร์ให้เช่าที่มีมาตรการรักษาความปลอดภัยของข้อมูล และแสดงประเทศที่ตั้งของเซิร์ฟเวอร์ในหน้าลงนามยินยอม หากเซิร์ฟเวอร์ตั้งอยู่ในประเทศไทย ข้อมูลจัดเก็บภายในประเทศตามมาตรการในข้อ 11.6 หากเซิร์ฟเวอร์ตั้งอยู่นอกประเทศไทย การส่งหรือโอนข้อมูลส่วนบุคคลของท่านไปต่างประเทศเป็นไปตามมาตรา 28 และระบบแสดงช่องยินยอมการโอนข้อมูลให้ท่านเลือก หากประเทศปลายทางมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลไม่เพียงพอ ผู้วิจัยแจ้งให้ท่านทราบในหน้าลงนามยินยอมก่อนขอความยินยอม"], ["sh", "11.6 มาตรการรักษาความปลอดภัย"], ["p", "ผู้วิจัยใช้มาตรการ ได้แก่ (1) เข้ารหัสข้อมูลระหว่างการส่งและขณะจัดเก็บ (2) จำกัดสิทธิ์เข้าถึงตามบทบาท (3) สำรองข้อมูล (4) ส่งออกข้อมูลวิเคราะห์ด้วยรหัสแทนอีเมล (5) เก็บตารางจับคู่รหัสกับบุคคลแยกไฟล์ ใส่รหัสผ่าน และเข้าถึงได้เฉพาะผู้วิจัย (6) เก็บไฟล์ข้อมูลวิเคราะห์ในอุปกรณ์ที่เข้ารหัสหรือบัญชีคลาวด์ของมหาวิทยาลัย และ (7) ไม่ส่งคำตอบของท่านให้ผู้ช่วยปัญญาประดิษฐ์ของระบบ หากเกิดเหตุละเมิดข้อมูลส่วนบุคคล ผู้วิจัยแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลและแจ้งท่านตามที่กฎหมายกำหนด"], ["sh", "11.7 สิทธิของท่านเกี่ยวกับข้อมูลส่วนบุคคล"], ["p", "ท่านมีสิทธิตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ได้แก่ (1) ถอนความยินยอมเมื่อใดก็ได้ ซึ่งไม่กระทบการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลที่ทำไปแล้วก่อนการถอน (มาตรา 19) (2) ขอเข้าถึงและขอรับสำเนาข้อมูลของท่าน (3) ขอรับหรือขอให้ส่งโอนข้อมูลในรูปแบบอิเล็กทรอนิกส์ (4) คัดค้านการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูล (5) ขอให้ลบ ทำลาย หรือทำให้ข้อมูลไม่สามารถระบุตัวท่านได้ (6) ขอให้ระงับการใช้ข้อมูล และ (7) ขอให้แก้ไขข้อมูลให้ถูกต้อง (มาตรา 30 ถึงมาตรา 36) ท่านใช้สิทธิได้โดยติดต่อผู้วิจัยตามข้อ 11.1 หรือกดปุ่ม “ขอถอนตัวหรือขอลบข้อมูล” ในระบบ ผู้วิจัยดำเนินการตามคำขอโดยไม่ชักช้าและไม่เกิน 30 วันนับแต่วันที่ได้รับคำขอ สิทธิบางประการอาจมีข้อจำกัดตามที่กฎหมายกำหนด ซึ่งผู้วิจัยจะแจ้งเหตุผลให้ท่านทราบ หลังวันที่ 20 กุมภาพันธ์ 2570 ข้อมูลที่รวมเป็นสถิติระดับกลุ่มแล้วจะแยกออกไม่ได้ แต่ผู้วิจัยยังลบข้อมูลดิบรายคนตามคำขอ หากท่านเห็นว่าผู้วิจัยไม่ปฏิบัติตามกฎหมาย ท่านร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลได้"], ["h", "12. การทำลายข้อมูลเมื่อเสร็จสิ้นการวิจัย"], ["p", "ผู้วิจัยตัดการเชื่อมโยงคำตอบกับบัญชีผู้ใช้ และทำลายตารางจับคู่รหัสและช่องทางติดต่อหลังวันที่ 20 กุมภาพันธ์ 2570 และทำลายข้อมูลดิบ ข้อมูลบัญชีผู้ใช้ และบันทึกการลงนามยินยอมภายใน 6 เดือนหลังสิ้นสุดโครงการ (ภายในวันที่ 31 สิงหาคม 2570) โดยเก็บเฉพาะสถิติระดับกลุ่ม ผู้วิจัยไม่บันทึกเสียงหรือภาพ และไม่เก็บข้อมูลไว้ศึกษาต่อ"], ["h", "13. การแสดงความขอบคุณผู้เข้าร่วมวิจัย"], ["p", "ผู้วิจัยไม่มีค่าตอบแทน ค่าเสียเวลา ค่าพาหนะ หรือของที่ระลึก มีเพียงคำขอบคุณที่ท่านสละเวลามาร่วมงานวิจัย และส่งสรุปผลระดับกลุ่มให้เมื่อท่านร้องขอ"], ["h", "14. รายละเอียดเพิ่มเติม"], ["p", "การเข้าร่วมการวิจัยเป็นโดยสมัครใจ สามารถปฏิเสธที่จะเข้าร่วมหรือถอนตัวจากการวิจัยได้ทุกขณะ โดยไม่ต้องให้เหตุผล ไม่สูญเสียประโยชน์ที่พึงได้รับ และไม่มีผลกระทบใด ๆ ต่อผู้เข้าร่วมวิจัย ท่านถอนตัวได้โดยแจ้งผู้วิจัยหรือผู้ดูแลระบบ หรือกดปุ่ม “ขอถอนตัวหรือขอลบข้อมูล” ในระบบ หากท่านถอนตัว ท่านขอให้ลบข้อมูลของท่านได้ถึงวันที่ 20 กุมภาพันธ์ 2570 หลังวันดังกล่าว ข้อมูลที่รวมเป็นสถิติระดับกลุ่มแล้วจะแยกออกไม่ได้ แต่ผู้วิจัยยังลบข้อมูลดิบรายคนตามคำขอ"], ["p", "หากมีข้อสงสัย โปรดสอบถามเพิ่มเติมจากผู้วิจัยได้ตลอดเวลา และหากผู้วิจัยมีข้อมูลเพิ่มเติมที่เป็นประโยชน์หรือโทษเกี่ยวกับการวิจัย ผู้วิจัยจะแจ้งให้ท่านทราบอย่างรวดเร็ว"], ["p", "หากได้รับการปฏิบัติไม่ตรงตามข้อมูลดังกล่าวสามารถร้องเรียนได้ที่ คณะกรรมการพิจารณาจริยธรรมการวิจัยในคน กลุ่มสหสถาบัน ชุดที่ 1 จุฬาลงกรณ์มหาวิทยาลัย 254 อาคารจามจุรี 1 ชั้น 2 ถนนพญาไท เขตปทุมวัน กรุงเทพฯ 10330 โทรศัพท์ 0-2218-3202, 0-2218-3049 E-mail: eccu@chula.ac.th"]];
  const CONSENT_TH = [["p", "ข้าพเจ้าซึ่งลงนามท้ายหนังสือนี้ผ่านระบบ ขอแสดงความยินยอมดังต่อไปนี้ โดยทำเครื่องหมายในช่องที่ข้าพเจ้ายินยอม"], ["sh", "ส่วนที่ 1 การรับทราบข้อมูล"], ["check", "1. ข้าพเจ้าได้อ่านและเข้าใจเอกสารชี้แจงข้อมูลสำหรับผู้เข้าร่วมการวิจัย ชุดที่ 3 แล้ว ได้แก่ วัตถุประสงค์ สิ่งที่ข้าพเจ้าต้องทำ ระยะเวลา ความเสี่ยง ประโยชน์ การรักษาความลับ การคุ้มครองข้อมูลส่วนบุคคล และสิทธิในการถอนตัว และได้รับโอกาสซักถามผู้วิจัยจนเข้าใจ (จำเป็นต้องเลือก)"], ["sh", "ส่วนที่ 2 ความยินยอมเข้าร่วมการวิจัย"], ["check", "2. ข้าพเจ้ายินยอมเข้าร่วมการวิจัยนี้ด้วยความสมัครใจ และทราบว่าข้าพเจ้าปฏิเสธหรือถอนตัวได้ทุกเมื่อโดยไม่ต้องให้เหตุผล ไม่สูญเสียประโยชน์ที่พึงได้รับ และไม่มีผลกระทบใด ๆ (จำเป็นต้องเลือก)"], ["sh", "ส่วนที่ 3 ความยินยอมด้านข้อมูลส่วนบุคคล"], ["check", "3. ข้าพเจ้ายินยอมให้ผู้วิจัยเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าตามข้อ 11.2 และข้อ 11.4 ของเอกสารชี้แจง เพื่อวัตถุประสงค์ของการวิจัยนี้เท่านั้น และเก็บไว้ไม่เกินระยะเวลาที่ระบุในข้อ 12 (จำเป็นต้องเลือก)"], ["check", "4. ข้าพเจ้ายินยอมให้ส่งหรือโอนข้อมูลส่วนบุคคลของข้าพเจ้าไปจัดเก็บบนเซิร์ฟเวอร์ที่ตั้งอยู่ใน [ประเทศที่ระบบแสดง] ตามข้อ 11.5 ของเอกสารชี้แจง (ระบบแสดงข้อนี้และกำหนดให้เลือกเฉพาะกรณีที่เซิร์ฟเวอร์ตั้งอยู่นอกประเทศไทย)"], ["p", "ความยินยอมให้ผู้วิจัยติดต่อกลับเพื่อเชิญเข้าร่วมขั้นตอนที่ 5.3 เป็นความยินยอมแยกต่างหาก ข้าพเจ้าเลือกได้ในแบบสอบถามส่วนที่ 4ข ข้อ 6 และการเลือกนั้นไม่เป็นเงื่อนไขของการเข้าร่วมการวิจัยนี้"], ["sh", "ส่วนที่ 4 สิทธิของผู้ลงนาม"], ["p", "ข้าพเจ้าทราบว่า (1) ข้าพเจ้าถอนความยินยอมตามข้อ 2 ถึงข้อ 4 ได้ทุกเมื่อ โดยแจ้งผู้วิจัยหรือกดปุ่ม “ขอถอนตัวหรือขอลบข้อมูล” ในระบบ และการถอนความยินยอมไม่กระทบการดำเนินการที่ทำไปแล้วก่อนการถอน (2) ข้าพเจ้าขอให้ลบข้อมูลได้ถึงวันที่ 20 กุมภาพันธ์ 2570 หลังวันดังกล่าว ข้อมูลที่รวมเป็นสถิติระดับกลุ่มแล้วจะแยกออกไม่ได้ แต่ผู้วิจัยยังลบข้อมูลดิบรายคนตามคำขอ (3) ข้าพเจ้ามีสิทธิเกี่ยวกับข้อมูลส่วนบุคคลตามข้อ 11.7 ของเอกสารชี้แจง และ (4) หากข้าพเจ้าไม่ได้รับการปฏิบัติตามที่ระบุไว้ ข้าพเจ้าร้องเรียนได้ที่คณะกรรมการพิจารณาจริยธรรมการวิจัยในคน กลุ่มสหสถาบัน ชุดที่ 1 จุฬาลงกรณ์มหาวิทยาลัย 254 อาคารจามจุรี 1 ชั้น 2 ถนนพญาไท เขตปทุมวัน กรุงเทพฯ 10330 โทรศัพท์ 0-2218-3202, 0-2218-3049 E-mail: eccu@chula.ac.th"], ["sh", "ส่วนที่ 5 การลงนามผ่านระบบ"], ["p", "ข้าพเจ้าลงนามในหนังสือนี้โดยกดปุ่ม “ลงนามยินยอม” หลังทำเครื่องหมายในช่องที่จำเป็นครบ การกดปุ่มนี้เป็นการลงลายมือชื่ออิเล็กทรอนิกส์ของข้าพเจ้าตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 ระบบบันทึกบัญชีผู้ลงนาม วันและเวลาที่ลงนาม ฉบับของเอกสาร และรายการที่ข้าพเจ้ายินยอมตามตารางที่ 1 และข้าพเจ้าได้รับสำเนาเอกสารชี้แจงและหนังสือแสดงความยินยอมนี้ในรูปแบบไฟล์ที่ดาวน์โหลดได้"], ["cap", "ตารางที่ 1", "บันทึกการลงนามผ่านระบบ"], ["table", [["บันทึกการลงนาม (ระบบสร้างอัตโนมัติ)"], ["ผู้เข้าร่วมการวิจัย (ลายมือชื่ออิเล็กทรอนิกส์)", "[อีเมลหรือชื่อบัญชีผู้ลงนาม]"], ["วันและเวลาที่ลงนาม", "[วว/ดด/ปปปป ชช:นน:วว เวลาประเทศไทย]"], ["รายการที่ยินยอม", "[ข้อ 1 ข้อ 2 ข้อ 3 และข้อ 4 หากระบบแสดง]"], ["ฉบับของเอกสาร", "เอกสารชี้แจงชุดที่ 3 และหนังสือแสดงความยินยอม ฉบับที่ 1 วันที่ 30 ตุลาคม 2569"], ["ประเทศที่ตั้งของเซิร์ฟเวอร์", "[ระบบแสดง]"], ["เลขที่หนังสือรับรองจริยธรรม", "[ระบุหลังได้รับการรับรอง]"], ["ผู้วิจัยหลัก", "นางสาวครองสิญจ์ สมประสงค์"]]]];
  const PIS_EN = [["kv", "Title of research project", "Development and Commercialization Feasibility Study of the Assessment Tool for CEO Regulatory Focus and Its Impact on Open Innovation with Board Composition as a Moderator: A Study of Thai Listed Companies"], ["kv", "Principal researcher", "Ms. Krongsin Somprasonk, Position: Graduate student (PhD Candidate), Doctor of Philosophy Program in Technology Management and Innopreneurship (Interdisciplinary Program)"], ["kv", "Workplace and contact address", "Doctoral Degree, Doctor of Philosophy Program in Technology Management and Innopreneurship (Interdisciplinary Program), Chulalongkorn University, 254 Phayathai Rd., Wangmai, Patumwan, Bangkok 10330. Cell phone 082-492-2451, E-mail: krongsin.s@gmail.com"], ["kv", "Funding", "None (self-funded by the researcher)"], ["kv", "Document version", "Version 1, 30 October 2026 (the system shows the ethics approval number on the consent page after approval)"], ["p", "You are invited to take part in this research project. Before you decide, please read the following information carefully so that you understand why the research is being done and what it involves. Please ask the researcher about anything that is unclear."], ["cap", "Table 1", "Key information"], ["table", [["Topic", "Summary"], ["What you do", "Sign the consent form through the system, watch a demonstration of about 20 minutes, answer the prototype evaluation questionnaire in the system in about 30 minutes, and review your reading of the results with the researcher for about 10 minutes: one session of no more than 60 minutes (item 8)."], ["Risks", "Low: the time you give and the risk that your opinions could be identified, which the researcher reduces with codes and aggregate reporting (item 9)."], ["Personal data collected", "Account data, submission time, the consent record, and a contact channel only if you ask to be contacted again. The system does not store IP addresses or sensitive data (item 11)."], ["Your rights", "Participation is voluntary; you may withdraw at any time and ask for your data to be deleted until 20 February 2027 (items 11.7 and 14)."], ["Payment", "None (item 13)."]]], ["h", "Research details"], ["h", "1. What the study is about"], ["p", "This research develops an assessment system called OpenInnoScore. The system uses information that listed companies disclose to the public, such as annual reports and Form 56-1 One Report, to summarize a company’s open-innovation tendency as a company-level score. The system does not assess any individual person. This phase asks whether the problem the system addresses exists, whether the system fits real work, whether users understand and accept it, and under which conditions it is commercially feasible. In this step, the researcher asks you to watch a demonstration of the system and answer the prototype evaluation questionnaire online to assess acceptance, ease of use, understanding of the results and the commercial value of the service."], ["h", "2. Disclosure of interest"], ["p", "The researcher intends to commercialize the results after the project ends, which may bring the researcher a financial benefit in the future. During the project there are no sales, contracts or payments, and intellectual property rights in the work follow the relevant regulations of Chulalongkorn University."], ["h", "3. How information is given and consent is obtained"], ["p", "The researcher sends this document with the invitation at least 3 days in advance so that you have time to read it and ask questions before you decide. If you decide to take part, you sign the consent form through the system before starting the questionnaire: (1) sign in with the invited account; (2) read this document on the consent page; (3) tick each confirmation box of the consent form; and (4) click “Sign consent”. The system records the signing account, the date and time of signing, the document version and the items you consented to, and opens the questionnaire only after you have signed. You can download a copy of this document and the signed consent form. Clicking “Sign consent” is an electronic signature under the Electronic Transactions Act B.E. 2544 (2001)."], ["h", "4. Who can take part"], ["p", "Thirty target users. The researcher aims to invite no more than 50 participants in total, with at least 5 per group and at most 2 respondents per organization, from 4 groups: (1) company-secretary, governance or strategy staff in listed companies; (2) corporate relationship managers, for example in financial institutions, consulting firms or financial and investment service companies; (3) executive search consultants; and (4) investors or analysts."], ["h", "5. Inclusion criteria"], ["p", "(1) aged 20 or over; (2) at least 2 years in one of the groups; (3) able to read and understand Thai; and (4) able to sign in to the online system with the invited account, voluntary, and signing the consent form through the system."], ["h", "6. Exclusion criteria"], ["p", "(1) staff of the organization where the researcher pilots the system; (2) people who took part in step 4.1; and (3) people with a commercial relationship with the project."], ["h", "7. Screening"], ["p", "Invitations go through the researcher’s professional network and referrals, and interested people make their own appointment with the researcher. Before an appointment, the researcher briefly checks your eligibility against the criteria in items 5 and 6 by telephone or message, which takes about 5 minutes. Screening carries no risk, and no data are recorded for people who are not eligible. You must pass screening before you can take part."], ["h", "8. What you will do"], ["p", "You take part in one session of no more than 60 minutes, in person or online, between 16 January and 12 February 2027, in the order shown in Table 2:"], ["cap", "Table 2", "Order of activities and approximate time"], ["table", [["Order", "Activity", "Approximate time"], ["1", "Sign the consent form through the system (item 3)", "Before the activities"], ["2", "Watch a standard demonstration of the system with public data on listed companies", "20 minutes"], ["3", "Answer the 7-part prototype evaluation questionnaire (Table 3)", "30 minutes"], ["4", "Review your reading of the results with the researcher", "10 minutes"]]], ["cap", "Table 3", "Parts of the prototype evaluation questionnaire"], ["table", [["Questionnaire part", "Content", "Items"], ["1 General information", "User group and range of work experience", "2 items"], ["2 Scenario tasks", "Reading the results of a demonstration company; the system records time and accuracy", "5 tasks"], ["3 SUS", "Ease of use of the system", "10 items"], ["4A Technology Acceptance Model questionnaire", "Perceived ease of use, perceived usefulness, attitude toward use and behavioral intention", "17 items"], ["4B Commercial value", "Purchase-choice sets and related questions", "3 sets and 6 items"], ["5 Comprehension", "Meaning of the results shown by the system", "5 items"], ["6 Open-ended questions", "Usefulness of the report, unclear points and suggestions", "5 items"]]], ["p", "The system assigns respondents to one of 2 display formats (2×2 matrix chart or table) in alternating order, which is not random; both groups see the same evidence. The service packages and prices in the commercial-value part are hypothetical; there is no sale or payment."], ["p", "In part 4B, item 6, you can choose whether the researcher may contact you again about buying roles or collaboration in step 5.3. If you agree, you give a contact channel, which the system stores separately from your answers. Giving a contact channel is not consent to step 5.3: the researcher will send information sheet Set 4 and ask for your signature before it starts. Not giving a contact channel has no effect on your participation in this step."], ["p", "No audio or video is recorded. You may skip any question you do not wish to answer, except the scenario tasks in part 2, where the system asks you to answer each task before moving to the next. You may stop answering at any time."], ["h", "9. Risks and inconvenience"], ["p", "The risks are low: the inconvenience of giving your time, and the risk that your opinions could be identified. The researcher uses codes instead of names, does not quote individuals, and does not report subgroups with fewer than 5 people. The risk of a data leak from the online system is low, and the researcher reduces it with the safeguards in item 11.6. You may pause or stop at any time. If you experience any effect from taking part, please inform the researcher at 082-492-2451."], ["h", "10. Benefits"], ["p", "There is no direct benefit to you, but you will try a new type of assessment system and may receive a group-level summary of results on request. The results will help develop a tool that uses public information to support discussion of innovation governance in listed companies."], ["h", "11. Confidentiality and personal data protection"], ["p", "Your information is kept confidential. The researcher follows the Personal Data Protection Act B.E. 2562 (2019) and collects only the data the research needs, as follows."], ["sh", "11.1 Who is responsible for your personal data"], ["p", "The researcher (Ms. Krongsin Somprasonk) is the data controller for this research project. You can contact her about your personal data at 082-492-2451 or krongsin.s@gmail.com."], ["sh", "11.2 Data collected, purposes and retention"], ["cap", "Table 4", "Personal data collected, purposes, storage and retention"], ["table", [["Data", "Purpose", "Storage and access", "Retention"], ["Account data: e-mail or account name, display name and sign-in method", "Confirm that you were invited, prevent duplicate responses and support withdrawal", "Online system; only the researcher and the system administrator", "Unlinked from answers after 20 February 2027; deleted by 31 August 2027"], ["Random browser code and submission time", "Prevent duplicate responses", "Stored with the answers in the online system", "As for account data"], ["Consent record: signing account, date and time, document version and the items consented to", "Evidence of consent", "Stored separately from the answers; only the researcher and the system administrator", "Deleted by 31 August 2027"], ["Questionnaire answers, time and accuracy in the scenario tasks, and the result-reading review", "Analysis of the research results", "Exported for analysis with codes instead of e-mails; the researcher and the thesis advisor", "Raw data destroyed by 31 August 2027; only group statistics kept"], ["Contact channel (only if you ask to be contacted again)", "Contact to invite you to step 5.3", "Stored separately from the answers; only the researcher", "Destroyed after 20 February 2027"]]], ["p", "The system does not store IP addresses, does not record audio, images or video, does not ask for national ID numbers, and does not collect sensitive personal data under Section 26 of the Personal Data Protection Act B.E. 2562 (2019)."], ["sh", "11.3 Legal basis and the effect of not giving data"], ["p", "The researcher collects, uses and discloses your personal data on the basis of your consent under Section 19 and only for the purposes of this research. You have no legal or contractual duty to give the data. If you do not consent, you will not answer the questionnaire in this step, with no consequence for you."], ["sh", "11.4 Who may receive the data"], ["p", "The researcher does not sell, give or disclose data that identify you to outside parties. Access is limited to (1) the researcher and the system administrator, who can see individual records; (2) the thesis advisor, who sees coded data; (3) the rented-server provider, which stores the data on the researcher’s instructions and may not use them for any other purpose; and (4) the research ethics committee, which may inspect project records to oversee the research. The external system developer has no access to the data system or to your data. Results are reported in aggregate, without individual quotations, and subgroups with fewer than 5 respondents are not reported."], ["sh", "11.5 Where the data are stored and transfers abroad"], ["p", "The online system uses a rented server service with data-security safeguards and shows the country where the server is located on the consent page. If the server is in Thailand, the data stay in the country under the safeguards in item 11.6. If the server is outside Thailand, any transfer of your personal data abroad follows Section 28, and the system shows a consent box for the transfer. If the destination country has inadequate personal data protection standards, the researcher tells you so on the consent page before asking for consent."], ["sh", "11.6 Security safeguards"], ["p", "The safeguards are: (1) encryption in transit and at rest; (2) role-based access control; (3) backups; (4) analysis exports with codes instead of e-mails; (5) a separate, password-protected code-link file accessible only to the researcher; (6) analysis files kept on encrypted devices or the university cloud account; and (7) your answers are not sent to the system’s AI assistant. If a personal data breach occurs, the researcher notifies the Office of the Personal Data Protection Committee and you as required by law."], ["sh", "11.7 Your rights over your personal data"], ["p", "Under the Personal Data Protection Act B.E. 2562 (2019) you may (1) withdraw your consent at any time, which does not affect processing done before the withdrawal (Section 19); (2) access and obtain a copy of your data; (3) receive your data or have them transferred in electronic form; (4) object to the collection, use or disclosure of your data; (5) ask for your data to be deleted, destroyed or made non-identifiable; (6) ask for the use of your data to be restricted; and (7) ask for your data to be corrected (Sections 30–36). To use these rights, contact the researcher (item 11.1) or click “Withdraw or delete my data” in the system. The researcher acts on a request without delay and within 30 days of receiving it. Some rights may be limited by law, in which case the researcher will tell you why. After 20 February 2027, data already combined into group statistics cannot be separated, but the researcher will still delete your individual raw data on request. If you believe the researcher has not complied with the law, you may complain to the Office of the Personal Data Protection Committee."], ["h", "12. Data destruction"], ["p", "The researcher unlinks answers from user accounts and destroys the code-link file and contact channels after 20 February 2027, and destroys raw data, account data and consent records within 6 months after the project ends (by 31 August 2027), keeping only group-level statistics. No audio or video is recorded, and data are not kept for future studies."], ["h", "13. Thanks to participants"], ["p", "There is no payment, compensation for time, travel allowance or souvenir. The researcher can only offer thanks for your time and a group-level summary of results on request."], ["h", "14. Further details"], ["p", "Participation is voluntary. You may refuse to take part or withdraw at any time without giving a reason, without losing any benefit, and without any consequence. You can withdraw by telling the researcher or the system administrator, or by clicking “Withdraw or delete my data” in the system. If you withdraw, you may ask for your data to be deleted until 20 February 2027. After that date, data already combined into group statistics cannot be separated, but the researcher will still delete your individual raw data on request."], ["p", "If you have any questions, please contact the researcher at any time. If the researcher obtains new information about benefits or risks of the research, you will be informed promptly."], ["p", "If the researcher does not act as described in this information sheet and consent form, you can report it to the Research Ethics Review Committee for Research Involving Human Research Participants, Group I, Chulalongkorn University (RECCU), Chamchuri 1 Building, 2nd Floor, 254 Phayathai Road, Pathum Wan, Bangkok 10330, Tel. 0-2218-3202, 0-2218-3049, E-mail: eccu@chula.ac.th"]];
  const CONSENT_EN = [["p", "I, the person signing this form through the system, give the following consent by ticking the boxes I agree to."], ["sh", "Part 1 Information received"], ["check", "1. I have read and understood information sheet Set 3, including the purpose, what I will do, the time involved, risks, benefits, confidentiality, personal data protection and my right to withdraw, and I have had the chance to ask the researcher questions. (required)"], ["sh", "Part 2 Consent to take part"], ["check", "2. I voluntarily agree to take part in this research and understand that I may refuse or withdraw at any time without giving a reason, without losing any benefit and without any consequence. (required)"], ["sh", "Part 3 Consent on personal data"], ["check", "3. I agree that the researcher may collect, use and disclose my personal data as described in items 11.2 and 11.4 of the information sheet, only for the purposes of this research, and keep them no longer than stated in item 12. (required)"], ["check", "4. I agree to the transfer of my personal data to a server located in [country shown by the system] as described in item 11.5 of the information sheet. (The system shows and requires this box only if the server is located outside Thailand.)"], ["p", "Consent to be contacted again about step 5.3 is separate. I can choose it in part 4B, item 6 of the questionnaire, and my choice is not a condition of taking part in this research."], ["sh", "Part 4 My rights"], ["p", "I understand that (1) I may withdraw consent under items 2–4 at any time by telling the researcher or clicking “Withdraw or delete my data” in the system, and withdrawal does not affect processing done before it; (2) I may ask for my data to be deleted until 20 February 2027, after which data already combined into group statistics cannot be separated, but my individual raw data will still be deleted on request; (3) I have the personal data rights in item 11.7 of the information sheet; and (4) if I am not treated as described, I may report it to the Research Ethics Review Committee for Research Involving Human Research Participants, Group I, Chulalongkorn University (RECCU), Chamchuri 1 Building, 2nd Floor, 254 Phayathai Road, Pathum Wan, Bangkok 10330, Tel. 0-2218-3202, 0-2218-3049, E-mail: eccu@chula.ac.th"], ["sh", "Part 5 Signing through the system"], ["p", "I sign this form by clicking “Sign consent” after ticking the required boxes. Clicking this button is my electronic signature under the Electronic Transactions Act B.E. 2544 (2001). The system records the signing account, the date and time of signing, the document version and the items I consented to (Table 5), and I receive a downloadable copy of the information sheet and this consent form."], ["cap", "Table 5", "Signing record through the system"], ["table", [["Signing record (generated by the system)"], ["Participant (electronic signature)", "[e-mail or account name of the signer]"], ["Date and time of signing", "[dd/mm/yyyy hh:mm:ss, Thailand time]"], ["Items consented to", "[items 1, 2, 3 and 4 if shown]"], ["Document version", "Information sheet Set 3 and consent form, Version 1, 30 October 2026"], ["Server location", "[shown by the system]"], ["Ethics approval number", "[added after approval]"], ["Principal researcher", "Ms. Krongsin Somprasonk"]]]];
  const M_DOC_VERSION = "เอกสารชี้แจงชุดที่ 3 และหนังสือแสดงความยินยอม ฉบับที่ 1 วันที่ 30 ตุลาคม 2569";
  const M_WTP_INTRO = "ระบบนำเสนอชุดทางเลือกการซื้อ 3 ชุด ทีละชุด และให้เลือก 1 ทางเลือกต่อชุด ชุดบริการและราคาเป็นสถานการณ์สมมติ ไม่มีการขายหรือรับชำระเงิน และผลส่วนนี้ใช้เป็นข้อมูลความสนใจ ไม่ใช่หลักฐานราคา ทางเลือก (ก) คือบริการวิเคราะห์รายโครงการโดยนักวิเคราะห์ (managed assessment) ซึ่งรวมการรับข้อมูล การตรวจคุณภาพ รายงาน และการหารือผล 1 ครั้ง ทางเลือก (ข) และ (ค) คือสิทธิ์ใช้ระบบรายปีต่อองค์กรระดับ Pro และ Pro Max ตามลำดับ และทางเลือก (ง) คือไม่ซื้อ";
  const M_ROLES = ["เลขานุการบริษัท การกำกับดูแลกิจการ หรือกลยุทธ์", "ผู้ดูแลความสัมพันธ์ลูกค้าองค์กร (เช่น สถาบันการเงิน บริษัทที่ปรึกษา หรือบริษัทให้บริการด้านการเงินและการลงทุน)", "ที่ปรึกษาสรรหาหรือคณะกรรมการสรรหา", "นักลงทุนหรือนักวิเคราะห์", "อื่น ๆ"];
  const M_EXPS = ["2–5 ปี", "6–10 ปี", "มากกว่า 10 ปี"];
  const M_SUS = ["ข้าพเจ้าคิดว่าอยากใช้ระบบนี้บ่อย ๆ", "ข้าพเจ้าพบว่าระบบนี้ซับซ้อนเกินความจำเป็น", "ข้าพเจ้าคิดว่าระบบนี้ใช้งานง่าย", "ข้าพเจ้าคิดว่าต้องมีผู้ช่วยด้านเทคนิคจึงจะใช้ระบบนี้ได้", "ข้าพเจ้าพบว่าฟังก์ชันต่าง ๆ ของระบบทำงานร่วมกันได้ดี", "ข้าพเจ้าคิดว่าระบบนี้มีความไม่สอดคล้องกันมากเกินไป", "ข้าพเจ้าคิดว่าคนส่วนใหญ่จะเรียนรู้การใช้ระบบนี้ได้อย่างรวดเร็ว", "ข้าพเจ้าพบว่าระบบนี้ใช้งานยุ่งยาก", "ข้าพเจ้ามั่นใจในการใช้ระบบนี้", "ข้าพเจ้าต้องเรียนรู้หลายอย่างก่อนจะเริ่มใช้ระบบนี้ได้"];
  const M_WTP_SETS = [[135000, 40000, 180000], [150000, 60000, 250000], [165000, 90000, 330000]];
  const M_WTP_ROLE = ["ผู้ใช้", "ผู้เสนอ", "เจ้าของงบประมาณ", "ผู้อนุมัติ", "ผู้ให้คำแนะนำด้านเทคโนโลยีสารสนเทศ"];
  const M_WTP_PAY = ["งบประมาณของหน่วยงานผู้ใช้", "งบประมาณส่วนกลางขององค์กร", "งบประมาณด้านเทคโนโลยีสารสนเทศ", "งบประมาณของสำนักเลขานุการบริษัทหรือคณะกรรมการ", "ยังไม่ทราบ"];
  const M_OPEN = ["ข้อมูลใดในรายงานที่เป็นประโยชน์ต่องานของท่านมากที่สุด เพราะเหตุใด", "มีจุดใดที่เข้าใจยาก ขาดหลักฐาน หรืออาจทำให้ตีความเกินขอบเขตที่รายงานรองรับหรือไม่", "ข้อเสนอแนะเพื่อปรับปรุงรายงาน การสาธิต หรือขั้นตอนการใช้ พร้อมเหตุผล", "สิ่งที่ควรปรับปรุงก่อนนำไปใช้ในงาน", "ข้อเสนอแนะอื่น"];
  const M_TAM = [["PEOU การรับรู้ความง่ายในการใช้งาน", [["PEOU1", "ท่านสามารถเรียนรู้การใช้งานระบบจำลองได้ง่าย"], ["PEOU2", "ท่านเข้าใจเมทริกซ์กลยุทธ์ 2x2 (Strategy Matrix) ได้ด้วยตนเอง"], ["PEOU3", "ท่านสามารถเรียกดูรายงานวินิจฉัยเชิงพรรณนาขององค์กรเปรียบเทียบในอุตสาหกรรมได้สะดวก"], ["PEOU4", "หน้าจอแสดงผลภาพรวมมีความชัดเจนตามสิทธิ์การใช้งาน"], ["PEOU5", "คำอธิบายเชิงลึกประกอบผลการประเมินและสถิติดัชนีกลุ่ม (Percentile) ช่วยให้เข้าใจผลได้"]]], ["PU การรับรู้ประโยชน์", [["PU1", "ดัชนีกลุ่มอุตสาหกรรมช่วยให้องค์กรมองเห็นตำแหน่งของตนเทียบกับคู่แข่ง"], ["PU2", "รายงานผลเชิงประจักษ์ช่วยลดเวลาเตรียมวาระ BOD Evaluation"], ["PU3", "ระบบสะท้อนช่องว่างระหว่างโครงสร้างผู้นำกับกลยุทธ์นวัตกรรมได้"], ["PU4", "ระบบมีประโยชน์ต่อองค์กรของท่าน"]]], ["ATT ทัศนคติในการใช้งาน", [["ATT1", "ระบบช่วยลดอัตวิสัยในการประเมินของคณะกรรมการ"], ["ATT2", "ท่านจะนำรายงานไปใช้กับการประเมินบอร์ดประจำปี"], ["ATT3", "ท่านเชื่อมั่นต่อความปลอดภัย เพราะระบบใช้ข้อมูลสาธารณะและแยกส่วนคำนวณหลังบ้านเพื่อรักษาความลับทางการค้า"], ["ATT4", "What-if Studio ให้มุมมองที่ดีกว่าการประเมินแบบเดิม"]]], ["BI ความตั้งใจที่จะใช้", [["BI1", "ท่านจะนำระบบไปใช้เมื่อเป็นบริการเต็มรูปแบบ"], ["BI2", "ท่านจะผลักดันให้ฝ่ายกลยุทธ์/กำกับกฎเกณฑ์ใช้ระบบนี้"], ["BI3", "ท่านจะใช้ระบบเพื่อติดตามผลอย่างต่อเนื่อง"], ["BI4", "ท่านจะแนะนำระบบนี้ให้พันธมิตรหรือบริษัทมหาชนอื่น"]]]];
  const M_COMP = [["ระดับ (Tier) ของคะแนนหมายถึงอะไร", ["(ก) ความน่าจะเป็นที่บริษัทจะมีนวัตกรรมแบบเปิดในปีถัดไป", "(ข) ตำแหน่งของบริษัทเทียบชุดข้อมูลอ้างอิง แบ่งเป็น 4 ระดับที่จุดตัดควอไทล์", "(ค) ผลประเมินคุณภาพของคณะกรรมการ"], 1], ["บริษัทในควอดแรนต์ C ที่มีคะแนนสูง หมายความว่าอย่างไร", ["(ก) มีสัญญาณนวัตกรรมแบบเปิดเด่น", "(ข) ทั้งภาษาของ CEO และองค์ประกอบคณะกรรมการอยู่ด้านระมัดระวัง คะแนนสูงในช่องนี้จึงไม่ได้หมายถึงสัญญาณนวัตกรรมเด่น", "(ค) คณะกรรมการขยายแรงจูงใจเชิงส่งเสริมของ CEO"], 1], ["ปีบัญชีที่มีสถานะไม่ผ่าน (FAIL) ควรอ่านผลอย่างไร", ["(ก) อ่านผลตามปกติ", "(ข) งดการอ่านผลตามปกติ เพราะคะแนนปีนั้นไม่ผ่านเกณฑ์ความตรง", "(ค) ใช้ผลปีนั้นแทนปีอื่น"], 1], ["ระบบนี้ประเมินกรรมการเป็นรายบุคคลหรือไม่", ["(ก) ประเมินรายบุคคล", "(ข) ไม่ประเมินรายบุคคล และให้ผลระดับบริษัทเท่านั้น"], 1], ["ความสัมพันธ์ระหว่างคะแนนกับนวัตกรรมแบบเปิดหมายถึงอะไร", ["(ก) การเปลี่ยนองค์ประกอบคณะกรรมการทำให้นวัตกรรมแบบเปิดเพิ่มขึ้น", "(ข) ความสัมพันธ์เชิงสถิติ ไม่ใช่เหตุและผล"], 1]];

  /* ---------------------------------------------------------------- ตัวช่วยทั่วไป */
  const EN = () => S.lang === "EN";
  const L = (th, en) => (EN() ? en : th);
  const E = s => esc(String(s ?? ""));
  /** ข้อห้ามคำบนหน้าเว็บ (บันทึกอาจารย์ 14 พ.ย. 2569) — แก้ที่นี่ที่เดียว · ใช้กับข้อความต้นฉบับทุกส่วนก่อนแสดง */
  const WORDING_FIX = [
    ["เช่น ในสถาบันการเงิน บริษัทที่ปรึกษา หรือ", "เช่น ในบริษัทที่ปรึกษา หรือ"],
    ["(เช่น สถาบันการเงิน บริษัทที่ปรึกษา หรือ", "(เช่น บริษัทที่ปรึกษา หรือ"],
    ["for example in financial institutions, consulting firms or", "for example in consulting firms or"],
  ];
  const wf = s => typeof s === "string" ? WORDING_FIX.reduce((t, [a, b]) => t.split(a).join(b), s) : s;
  const wfDeep = x => Array.isArray(x) ? x.map(wfDeep) : wf(x);
  const LSget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (e) { return d; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const SRV = !!(window.OIS_API && window.OIS_SERVER);
  const nowTH = d => (d || new Date()).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dispT = (iso, fb) => { const d = new Date(iso); return isNaN(d) ? (fb || iso || "") : nowTH(d); };
  const fmtN = n => Number(n).toLocaleString("en-US");
  const submit = (kind, payload, ticker) => {
    const api = window.OIS_API; if (!api || typeof api.submit !== "function") return Promise.resolve(null);
    return Promise.resolve().then(() => api.submit({ kind, ticker: ticker || null, payload }))
      .then(r => (r && (r.ok === false || r.enabled === false) ? false : true)).catch(() => false);
  };
  function dl(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const csv = rows => "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  /** สิทธิ์ผู้ดูแล — เซิร์ฟเวอร์: role admin จาก /api/me (plIsAdmin ของ v2_pilot.js) · ออฟไลน์: เครื่องผู้ดูแลการทดสอบ (ระดับ Pro ขึ้นไป) */
  const isAdmin = () => SRV ? (typeof plIsAdmin === "function" && plIsAdmin())
    : (typeof tierRank === "function" ? tierRank() >= 1 : S.plan === "pro" || S.plan === "max");
  const acct = () => String(S.user || "").trim().toLowerCase() || "guest";
  /** ชื่อบัญชีที่แสดงในบันทึกการลงนาม — ฉบับเซิร์ฟเวอร์ใช้อีเมล/ชื่อบัญชีจาก /api/me (บัญชีที่เข้าสู่ระบบจริง) */
  const signer = () => { const m = SRV && typeof plMe === "function" ? plMe() : null; return String((m && (m.email || m.name || m.username)) || acct()).trim(); };
  const head = (eyebrow, title, sub) => typeof pageHead === "function" ? pageHead(eyebrow, title, sub)
    : `<div class="pagehead"><div class="eyebrow">${E(eyebrow)}</div><h2>${E(title)}</h2><p>${sub}</p></div>`;

  /* ---------------------------------------------------------------- ฉบับเอกสาร · การตั้งค่าของผู้วิจัย */
  const CONSENT_VER = "PIS-Set3-v1-20261030";
  const DOC_VERSION = () => L(M_DOC_VERSION, "Information sheet Set 3 and consent form, Version 1, 30 October 2026");
  const PI_NAME = () => L("นางสาวครองสิญจ์ สมประสงค์", "Ms. Krongsin Somprasonk");
  const CFG_KEY = "ois_irb_cfg_v1";
  /** srv: "th" | "abroad" (ที่ตั้งเซิร์ฟเวอร์ — ข้อ 4 ของหนังสือยินยอมแสดงเมื่อ abroad) · country: ชื่อประเทศ · approval: เลขที่หนังสือรับรอง · demoT: บริษัทสาธิต */
  const cfg = () => Object.assign({ srv: "th", country: "", approval: "", demoT: "" }, window.IRB_CONFIG || {}, LSget(CFG_KEY, {}));
  const srvCountry = () => { const c = cfg(); return c.srv === "abroad" ? (c.country || L("[ชื่อประเทศที่ตั้งเซิร์ฟเวอร์]", "[country of the server]")) : L("ประเทศไทย", "Thailand"); };
  const approvalNo = () => cfg().approval || L("(ระบุหลังได้รับการรับรอง)", "(added after approval)");

  /* ---------------------------------------------------------------- บันทึกการลงนาม (ต่อบัญชี) */
  const CONSENT_KEY = "ois_consent_v1";
  const allRecs = () => LSget(CONSENT_KEY, {}) || {};
  const recOf = a => (allRecs()[a || acct()] || null);
  const setRec = (rec, a) => { const o = allRecs(); if (rec) o[a || acct()] = rec; else delete o[a || acct()]; LSset(CONSENT_KEY, o); };
  const valid = r => !!(r && r.ver === CONSENT_VER && r.signed_at && !r.withdrawn);
  /* ข้อ 4 (โอนข้อมูลไปต่างประเทศ) — ผู้วิจัยสั่งซ่อนไว้ก่อน (14 พ.ย.) จนกว่าจะเริ่มเก็บข้อมูลจริง: เปลี่ยนเป็น true เพื่อเปิด */
  const XFER_ON = false;
  const needed = () => XFER_ON && cfg().srv === "abroad" ? ["c1", "c2", "c3", "c4"] : ["c1", "c2", "c3"];

  /* ---------------------------------------------------------------- เนื้อเอกสาร (บล็อก) */
  const PIS = () => wfDeep(EN() ? PIS_EN : PIS_TH);
  const CONSENT = () => wfDeep(EN() ? CONSENT_EN : CONSENT_TH);
  const inl = t => E(t).replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
  const tableHTML = rows => `<div class="tw"><table class="irb-t"><tr>${rows[0].map(c => `<th>${inl(c)}</th>`).join("")}</tr>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${inl(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
  function blocksHTML(bl) {
    return bl.map(b => {
      switch (b[0]) {
        case "kv": return `<p><b>${E(b[1])}</b> ${inl(b[2])}</p>`;
        case "h": return `<h3>${E(b[1])}</h3>`;
        case "sh": return `<h4>${E(b[1])}</h4>`;
        case "p": return `<p>${inl(b[1])}</p>`;
        case "table": return tableHTML(b[1]);
        case "ol": return `<ol class="irb-ol">${b[1].map(x => `<li>${inl(x)}</li>`).join("")}</ol>`;
        case "cap": return `<p class="irb-cap"><b>${E(b[1])}</b> ${E(b[2])}</p>`;
        default: return "";
      }
    }).join("");
  }
  /** ข้อความช่องยินยอม — แทน [ประเทศที่ระบบแสดง] และตัดหมายเหตุท้ายข้อ (ตามภาพจำลอง checkText) */
  const checkText = t => t.replace("[ประเทศที่ระบบแสดง]", srvCountry()).replace("[country shown by the system]", srvCountry())
    .replace(/ \(จำเป็นต้องเลือก\)$/, "").replace(/ \(ระบบแสดงข้อนี้[^)]*\)$/, "").replace(/ \(required\)$/, "").replace(/ \(The system shows and requires[^)]*\)$/, "");
  const itemsTxt = items => EN() ? "Items " + items.map(k => k.slice(1)).join(", ") : "ข้อ " + items.map(k => k.slice(1)).join(" ");
  function sigRows(rec) {
    return [[L("ผู้เข้าร่วมการวิจัย (ลายมือชื่ออิเล็กทรอนิกส์)", "Participant (electronic signature)"), rec.account],
      [L("วันและเวลาที่ลงนาม", "Date and time of signing"), dispT(rec.signed_at, rec.signed_at_th) + L(" (เวลาประเทศไทย)", " (Thailand time)")],
      [L("รายการที่ยินยอม", "Items consented to"), itemsTxt(rec.items || [])],
      [L("ฉบับของเอกสาร", "Document version"), DOC_VERSION()],
      ...(XFER_ON ? [[L("ประเทศที่ตั้งของเซิร์ฟเวอร์", "Server location"), rec.srv === "abroad" ? (rec.country || srvCountry()) : L("ประเทศไทย", "Thailand")]] : []),
      [L("เลขที่หนังสือรับรองจริยธรรม", "Ethics approval number"), rec.approval || approvalNo()],
      [L("ผู้วิจัยหลัก", "Principal researcher"), PI_NAME()]];
  }
  const sigRecord = rec => rec ? `<div class="tw"><table class="irb-t irb-sig" id="irbSigRec"><tr><th colspan="2">${L("บันทึกการลงนาม (ระบบสร้างอัตโนมัติ)", "Signing record (generated by the system)")}</th></tr>
      ${sigRows(rec).map(([a, b]) => `<tr><td>${E(a)}</td><td>${E(b)}</td></tr>`).join("")}</table></div>` : "";
  /** ส่วนหนังสือแสดงความยินยอม — chk = สถานะช่องที่ติ๊ก · rec = บันทึกที่ลงนามแล้ว (ช่องถูกล็อก) */
  function consentHTML(chk, rec) {
    let ci = 0; const abroad = XFER_ON && (rec ? rec.srv : cfg().srv) === "abroad";
    return CONSENT().map(b => {
      if (b[0] === "check") {
        const k = "c" + (++ci); if (k === "c4" && !abroad) return "";
        const on = rec ? (rec.items || []).includes(k) : !!chk[k];
        return `<label class="irb-check"><input type="checkbox" data-irbchk="${k}" ${on ? "checked" : ""} ${rec ? "disabled" : ""}><span>${inl(checkText(b[1]))} <span class="irb-tag req">${L("จำเป็น", "Required")}</span></span></label>`;
      }
      if (b[0] === "table") return sigRecord(rec);
      if (b[0] === "cap") return rec ? `<p class="irb-cap"><b>${E(b[1])}</b> ${E(b[2])}</p>` : "";
      if (b[0] === "sh") return `<h4>${E(b[1])}</h4>`;
      if (b[0] === "p") return `<p>${inl(b[1])}</p>`;
      return "";
    }).join("");
  }
  const srvNote = () => !XFER_ON ? "" : cfg().srv === "abroad"
    ? `<div class="irb-warnbox">${L(`เซิร์ฟเวอร์ของระบบตั้งอยู่นอกประเทศไทย (${E(srvCountry())}) ข้อมูลของท่านจะถูกส่งไปจัดเก็บที่ประเทศดังกล่าวตามข้อ 11.5 ระบบจึงขอความยินยอมเพิ่มในข้อ 4`,
        `The system's server is located outside Thailand (${E(srvCountry())}). Your data will be transferred to and stored in that country as described in item 11.5, so the system asks for additional consent in item 4.`)}</div>`
    : `<div class="irb-note">${L("เซิร์ฟเวอร์ของระบบตั้งอยู่ในประเทศไทย ข้อมูลจัดเก็บภายในประเทศตามข้อ 11.5", "The system's server is located in Thailand; data are stored in the country as described in item 11.5.")}</div>`;
  const pisTitle = () => L("เอกสารชี้แจงข้อมูลสำหรับผู้เข้าร่วมการวิจัย", "Research participant information sheet");
  const pisSub = () => L(`ชุดที่ 3 สำหรับผู้ใช้เป้าหมายที่ตอบแบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2) · ฉบับที่ 1 วันที่ 30 ตุลาคม 2569 · โปรดอ่านให้ครบก่อนลงนาม`,
    "Set 3: Target users answering the prototype evaluation questionnaire (step 4.2) · Version 1, 30 October 2026 · Please read in full before signing");
  const consentTitle = () => L("หนังสือแสดงความยินยอมเข้าร่วมการวิจัยและยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล (ลงนามผ่านระบบ)",
    "Consent to take part in research and to the collection, use and disclosure of personal data (signed through the system)");
  /** เนื้อหาหน้าเอกสารชี้แจง + หนังสือยินยอม (ตาม pConsent ของภาพจำลอง) */
  function consentPage(st, rec, opts) {
    const allOk = needed().every(k => st.chk[k]);
    const signed = rec ? `<div class="irb-okbox" id="irbSignedBox"><b>${L("ลงนามยินยอมแล้ว", "Consent signed")}</b>${rec.arm ? ` · ${L("ระบบจัดท่านอยู่ในกลุ่มการแสดงหลักฐาน", "The system assigned you to the evidence display group")}: <b>${armName(rec.arm)}</b>` : ""}</div>
      <div class="irb-btns" style="justify-content:flex-start"><button class="btn g" data-irbdl="pis">${L("ดาวน์โหลดเอกสารชี้แจง", "Download the information sheet")}</button><button class="btn g" data-irbdl="consent">${L("ดาวน์โหลดหนังสือแสดงความยินยอมที่ลงนามแล้ว", "Download the signed consent form")}</button></div>` : "";
    return `<h1 class="irb-h1">${E(pisTitle())}</h1><p class="irb-sub">${E(pisSub())}</p>
      <div class="irb-pis" tabindex="0" aria-label="${E(pisTitle())}">${blocksHTML(PIS())}</div>
      <div class="irb-consent"><h2 class="irb-h2">${E(consentTitle())}</h2>${srvNote()}${consentHTML(st.chk, rec)}</div>
      <p class="irb-sub" style="margin-top:10px">${L("ลงนามด้วยบัญชี", "Signing with account")}: <b>${E(rec ? rec.account : signer())}</b> · ${L("ระบบเปิดแบบสอบถามหลังลงนามแล้วเท่านั้น", "The questionnaire opens only after you have signed")}</p>
      ${signed}
      ${opts && opts.foot !== undefined ? opts.foot : `<div class="irb-btns"><button class="lnk irb-link" id="irbLeave">${L("ไม่ประสงค์เข้าร่วม และออกจากระบบ", "I do not wish to take part — sign out")}</button>
        ${rec ? `<span class="irb-btnrow"><button class="btn g" id="irbToSurvey">${L("เริ่มตอบแบบสอบถาม", "Start the questionnaire")}</button><button class="btn p" id="irbEnterApp">${L("เข้าใช้ระบบ OpenInnoScore", "Continue to OpenInnoScore")}</button></span>`
          : `<button class="btn p" id="irbSign" ${allOk ? "" : "disabled"}>${L("ลงนามยินยอม", "Sign consent")}</button>`}</div>`}`;
  }
  /* ---------------------------------------------------------------- สำเนาดาวน์โหลด (ข้อความล้วน ตาม dl() ของภาพจำลอง) */
  function plainBlocks(bl) {
    return bl.map(b => b[0] === "kv" ? b[1] + " " + b[2] : b[0] === "table" ? b[1].map(r => r.join(" | ")).join("\n")
      : b[0] === "ol" ? b[1].map((x, n) => (n + 1) + ") " + x).join("\n") : b[0] === "cap" ? b[1] + " " + b[2] : (b[1] || "")).join("\n\n").replace(/<\/?b>/g, "");
  }
  function dlDoc(kind, rec) {
    rec = rec || recOf();
    if (kind === "pis") return dl(L("เอกสารชี้แจงชุดที่3.txt", "Information_sheet_Set3.txt"), pisTitle() + L(" ชุดที่ 3", " Set 3") + "\n\n" + plainBlocks(PIS()));
    const abroad = XFER_ON && (rec ? rec.srv === "abroad" : cfg().srv === "abroad");
    let ci = 0;
    const body = consentTitle() + "\n\n" + plainBlocks(CONSENT().filter(b => b[0] !== "table" && b[0] !== "cap").map(b => {
      if (b[0] !== "check") return b; const k = "c" + (++ci); if (k === "c4" && !abroad) return null;
      return ["p", (rec && (rec.items || []).includes(k) ? "☑ " : "☐ ") + checkText(b[1])]; }).filter(Boolean))
      + (rec ? "\n\n" + L("บันทึกการลงนาม", "Signing record") + "\n" + sigRows(rec).map(([a, b]) => a + ": " + b).join("\n") : "");
    dl(L("หนังสือแสดงความยินยอม_ลงนามแล้ว.txt", "Consent_form_signed.txt"), body);
  }

  /* ---------------------------------------------------------------- กลุ่มการแสดงหลักฐาน (A/B) — จัดตอนลงนาม */
  const armName = a => a === "table" ? L("ตาราง", "Table") : L("ภาพเมทริกซ์ 2×2", "2×2 matrix chart");
  const SV_KEY = "ois_irb_survey_v1";
  const svStore = () => { const o = LSget(SV_KEY, null) || {}; o.cur = o.cur || {}; o.resp = Array.isArray(o.resp) ? o.resp : []; o.started = o.started || []; o.done = o.done || {}; return o; };
  const svSave = o => LSset(SV_KEY, o);
  /** สลับตามลำดับการเข้าร่วม (กำหนดแน่นอน ไม่ใช่การสุ่ม): ให้กลุ่มที่น้อยกว่า · เท่ากันสลับตามลำดับ */
  function armBalanced(c) { const g = c.grid || 0, t = c.table || 0; if (g !== t) return g < t ? "grid" : "table"; return (g + t) % 2 === 0 ? "grid" : "table"; }
  async function assignArm() {
    if (SRV) {
      try {
        const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 2500);
        const r = await fetch("/api/survey/arms", { credentials: "same-origin", signal: ac.signal }); clearTimeout(tm);
        if (r.ok) { const j = await r.json(); if (j && (j.arm === "grid" || j.arm === "table")) return { arm: j.arm, src: "server" }; }
      } catch (e) { }
    }
    const o = svStore(), c = { grid: 0, table: 0 };
    Object.values(allRecs()).forEach(r => { if (r && r.arm && c[r.arm] !== undefined && !r.withdrawn) c[r.arm]++; });
    return { arm: armBalanced(c), src: "local" };
  }

  /* ---------------------------------------------------------------- ประตูยินยอมครั้งแรก (เต็มจอ)
     แสดงในหน้า "consent" (#v-consent) แบบล็อก: body.irb-lock ทำให้ส่วนนี้คลุมเต็มจอ ซ่อนเมนูและแถบบน · ไปหน้าอื่นไม่ได้จนกว่าจะลงนาม
     ลงนามแล้ว → กลับไปหน้าที่ผู้ใช้จะเข้า (ตั้งต้น Company Profile) · ปฏิเสธ → ออกจากระบบ */
  const G = { chk: {}, leave: false, busy: false, ret: null };
  function gateNeeded() { return !!S.user && !valid(recOf()); }
  const gateOn = () => document.body.classList.contains("irb-lock");
  function gateHTML() {
    const old = recOf();
    const top = `<div class="irb-top"><div class="irb-logo">OpenInnoScore<small>${L("เอกสารชี้แจงและหนังสือแสดงความยินยอม · แบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2)", "Information sheet and consent form · Prototype evaluation questionnaire (step 4.2)")}</small></div>
      <div class="irb-topr"><span class="seg irb-lang"><button class="btn ${EN() ? "g" : "s"}" data-irblang="TH" aria-pressed="${!EN()}">TH</button><button class="btn ${EN() ? "s" : "g"}" data-irblang="EN" aria-pressed="${EN()}">EN</button></span>
      <span class="irb-acct">${L("บัญชีที่ได้รับเชิญ", "Invited account")}: ${E(signer())}</span></div></div>`;
    const body = G.leave
      ? `<h1 class="irb-h1">${L("ท่านเลือกไม่เข้าร่วม", "You chose not to take part")}</h1><p>${L("ระบบไม่บันทึกข้อมูลใด ๆ และออกจากระบบแล้ว", "The system has not recorded any data and you have been signed out.")}</p>
         <div class="irb-btns"><button class="btn g" id="irbBack">${L("กลับไปหน้าลงนาม", "Back to the consent page")}</button></div>`
      : (old && old.withdrawn ? `<div class="irb-warnbox" id="irbWasWd">${L(`บัญชีนี้ขอถอนตัวแล้วเมื่อ ${E(dispT(old.withdrawn.at, old.withdrawn.at_th))} — หากต้องการใช้ระบบอีกครั้ง โปรดอ่านเอกสารและลงนามยินยอมใหม่`, `This account withdrew on ${E(dispT(old.withdrawn.at, old.withdrawn.at_th))}. To use the system again, please read the documents and sign consent again.`)}</div>` : "")
        + consentPage(G, null);
    return `<div class="irb-gate" id="irbGate" role="dialog" aria-modal="true" aria-label="${E(pisTitle())}">${top}<div class="irb-wrap"><main class="card irb-card">${body}</main>
      <p class="irb-foot">${L("ระบบเปิดหน้าหลักของ OpenInnoScore หลังลงนามยินยอมแล้วเท่านั้น · ดูบันทึกการลงนามหรือขอถอนตัวได้ภายหลังที่เมนู “ความยินยอมและการถอนตัว”",
        "OpenInnoScore opens only after consent is signed · You can view your signing record or withdraw later from the “Consent & withdrawal” menu")}</p></div></div>`;
  }
  function wireGate(g) {
    g.querySelectorAll("[data-irblang]").forEach(b => b.onclick = () => { S.lang = b.dataset.irblang; try { save(); } catch (e) { } render(); });
    g.querySelectorAll("[data-irbchk]").forEach(c => c.onchange = () => { G.chk[c.dataset.irbchk] = c.checked; const s = g.querySelector("#irbSign"); if (s) s.disabled = !needed().every(k => G.chk[k]); });
    const sg = g.querySelector("#irbSign"); if (sg) sg.onclick = () => sign(sg);
    const lv = g.querySelector("#irbLeave"); if (lv) lv.onclick = () => decline();
    const bk = g.querySelector("#irbBack"); if (bk) bk.onclick = () => { G.leave = false; location.reload(); };
  }
  async function sign(btn) {
    if (G.busy || !needed().every(k => G.chk[k])) return;
    G.busy = true; if (btn) btn.disabled = true;
    const d = new Date(), c = cfg(), a = acct();
    const ar = await assignArm();
    const rec = { ver: CONSENT_VER, account: signer(), signed_at: d.toISOString(), signed_at_th: nowTH(d), items: needed().filter(k => G.chk[k]),
      srv: c.srv, country: c.srv === "abroad" ? (c.country || "") : "TH", approval: c.approval || "", doc_version_th: M_DOC_VERSION,
      arm: ar.arm, arm_src: ar.src, withdrawn: null, history: ((recOf() || {}).history || []).slice(-10) };
    setRec(rec, a); G.busy = false; G.chk = {};
    unlock();
    try { toast(L("ลงนามยินยอมแล้ว", "Consent signed")); } catch (e) { }
    const to = G.ret && G.ret !== "consent" ? G.ret : "profile"; G.ret = null; go(to);
    const ok = await submit("feedback", { type: "consent", consent_log: { account: rec.account, signed_at: rec.signed_at, signed_at_th: rec.signed_at_th, doc_version: M_DOC_VERSION,
      ver: CONSENT_VER, items: rec.items, server_country: rec.srv === "abroad" ? rec.country || "abroad" : "TH", approval_no: rec.approval || null }, arm: rec.arm });
    if (ok !== null) { const r2 = recOf(a); if (r2) { r2.srv_sent = !!ok; setRec(r2, a); } if (S.view === "consent") render(); }
  }
  function decline() {
    G.leave = true; G.chk = {}; lock(); render();
    if (SRV && window.OIS_API && typeof window.OIS_API.logout === "function") { setTimeout(() => window.OIS_API.logout(), 2500); return; }
    S.user = null; try { save(); } catch (e) { }
    setTimeout(() => { unlock(); G.leave = false; const app = document.getElementById("app"), gate = document.getElementById("gate");
      if (app) app.style.display = "none"; if (gate) gate.style.display = ""; }, 2500);
  }
  function lock() { document.body.classList.add("irb-lock"); }
  function unlock() { document.body.classList.remove("irb-lock"); }
  /** ตรวจหลังเข้าระบบ/เปลี่ยนหน้า — ไม่มีบันทึกที่ใช้ได้ → เปิดประตูยินยอม (ฉบับเซิร์ฟเวอร์ตรวจบันทึกบนเซิร์ฟเวอร์ก่อน: ลงนามจากเครื่องอื่นแล้ว) */
  let _srvAsked = {};
  function check() {
    if (!S.user) { if (!G.leave) unlock(); return; }
    if (!gateNeeded()) { if (gateOn() && !G.leave) { unlock(); if (S.view === "consent") render(); } return; }
    if (W.sent && S.view === "consent") return;
    lock();
    if (S.view !== "consent") { G.ret = G.ret || S.view; _goRaw("consent"); } else render();
    const a = acct();
    if (SRV && !_srvAsked[a] && window.OIS_API && typeof window.OIS_API.mine === "function") {
      _srvAsked[a] = 1;
      Promise.resolve(window.OIS_API.mine("feedback")).then(res => {
        const items = (res && res.items) || [];
        const pl = x => { let p = x && x.payload; if (typeof p === "string") { try { p = JSON.parse(p); } catch (e) { p = null; } } return p || {}; };
        const last = items.map(x => Object.assign({ created: x.created }, pl(x))).filter(p => p.type === "consent" || p.type === "withdraw")
          .sort((x, y) => String(y.created).localeCompare(String(x.created)))[0];
        if (last && last.type === "consent" && last.consent_log && last.consent_log.ver === CONSENT_VER && acct() === a && gateNeeded()) {
          const l = last.consent_log;
          setRec({ ver: CONSENT_VER, account: a, signed_at: l.signed_at, signed_at_th: l.signed_at_th || l.signed_at, items: l.items || [], srv: l.server_country && l.server_country !== "TH" ? "abroad" : "th",
            country: l.server_country || "TH", approval: l.approval_no || "", arm: last.arm || null, arm_src: "server", withdrawn: null, srv_sent: true, from_server: true }, a);
          unlock(); const to = G.ret || "profile"; G.ret = null; go(to);
        }
      }).catch(() => { });
    }
  }
  let _goRaw = v => go(v);

  /* ---------------------------------------------------------------- หน้า "consent": บันทึกการลงนาม · ดาวน์โหลด · ขอถอนตัว */
  const W = { open: false, scope: "delete", sent: null };
  function signOut() {
    if (SRV && window.OIS_API && typeof window.OIS_API.logout === "function") return window.OIS_API.logout();
    unlock(); S.user = null; try { save(); } catch (e) { }
    const app = document.getElementById("app"), gate = document.getElementById("gate"); if (app) app.style.display = "none"; if (gate) gate.style.display = "";
  }
  function viewConsent() {
    if ((gateNeeded() && !W.sent) || G.leave) { lock(); return gateHTML(); }
    unlock();
    const rec = recOf(), ok = valid(rec);
    const wdBody = W.sent
      ? `<h3>${L("ส่งคำขอแล้ว", "Request sent")}</h3><div class="irb-okbox" id="irbWdSent">${L(`ระบบส่งคำขอ${W.sent.scope === "delete" ? "ถอนตัวและลบข้อมูล" : "ถอนตัว"}ถึงผู้วิจัยเมื่อ ${E(dispT(W.sent.at, W.sent.at_th))} ผู้วิจัยดำเนินการโดยไม่ชักช้าและไม่เกิน 30 วัน และแจ้งผลทางอีเมลที่ใช้เข้าสู่ระบบ`,
          `The system sent your request to ${W.sent.scope === "delete" ? "withdraw and delete your data" : "withdraw"} to the researcher on ${E(dispT(W.sent.at, W.sent.at_th))}. The researcher acts without delay and within 30 days, and informs you of the outcome by the e-mail you used to sign in.`)}</div>
        <p class="irb-sub">${L("การใช้ระบบต่อจากนี้ต้องลงนามยินยอมใหม่", "To keep using the system you will need to sign consent again.")}</p>
        <div class="irb-btns"><button class="btn g" id="irbWdBack">${L("กลับ", "Back")}</button><button class="btn p" id="irbWdOut">${L("ออกจากระบบ", "Sign out")}</button></div>`
      : `<h3>${L("ขอถอนตัวหรือขอลบข้อมูล", "Withdraw or delete my data")}</h3>
        <p>${L("ท่านถอนตัวได้ทุกเมื่อโดยไม่ต้องให้เหตุผลและไม่มีผลกระทบใด ๆ (เอกสารชี้แจงข้อ 11.7 และข้อ 14) ท่านขอให้ลบข้อมูลได้ถึงวันที่ 20 กุมภาพันธ์ 2570 หลังวันดังกล่าว ข้อมูลที่รวมเป็นสถิติระดับกลุ่มแล้วจะแยกออกไม่ได้ แต่ผู้วิจัยยังลบข้อมูลดิบรายคนตามคำขอ",
          "You may withdraw at any time without giving a reason and without any consequence (information sheet items 11.7 and 14). You may ask for your data to be deleted until 20 February 2027. After that date, data already combined into group statistics cannot be separated, but the researcher will still delete your individual raw data on request.")}</p>
        <div class="irb-q"><label class="irb-opt"><input type="radio" name="irbWds" value="delete" ${W.scope === "delete" ? "checked" : ""}><span>${L("ถอนตัวและขอให้ลบข้อมูลของข้าพเจ้า", "Withdraw and delete my data")}</span></label>
          <label class="irb-opt"><input type="radio" name="irbWds" value="stop" ${W.scope === "stop" ? "checked" : ""}><span>${L("ถอนตัวโดยหยุดตอบ และให้ใช้ข้อมูลที่ส่งแล้วได้", "Withdraw by stopping, and allow the data already sent to be used")}</span></label></div>
        <p class="irb-sub">${L("หรือติดต่อผู้วิจัย โทรศัพท์ 082-492-2451 · krongsin.s@gmail.com", "Or contact the researcher: tel. 082-492-2451 · krongsin.s@gmail.com")}</p>
        <div class="irb-btns"><button class="btn g" id="irbWdCancel">${L("ยกเลิก", "Cancel")}</button><button class="btn p" id="irbWdSend">${L("ส่งคำขอ", "Send request")}</button></div>`;
    const status = ok
      ? `<div class="irb-okbox"><b>${L("ลงนามยินยอมแล้ว", "Consent signed")}</b> · ${E(dispT(rec.signed_at, rec.signed_at_th))} · ${E(itemsTxt(rec.items || []))} · ${L("ฉบับ", "version")} <span class="mono">${E(rec.ver)}</span>
          ${SRV ? ` · <span class="pill ${rec.srv_sent ? "ok" : "mute"}">${rec.srv_sent ? L("บันทึกในฐานข้อมูลกลางแล้ว", "Recorded in the central database") : L("บันทึกในเครื่องนี้", "Recorded on this device")}</span>` : ""}</div>`
      : `<div class="irb-warnbox">${L("บัญชีนี้ยังไม่มีบันทึกการลงนามยินยอมที่ใช้ได้", "This account has no valid consent record.")}</div>`;
    const c = cfg();
    const admin = isAdmin() ? `<div class="card irb-admin" style="margin-top:14px"><h3>${L("การตั้งค่าของผู้วิจัย (ผู้ดูแล)", "Researcher settings (administrator)")}</h3>
        <p class="desc">${XFER_ON ? "" : `<b>${L("ข้อ 4 (โอนข้อมูลไปต่างประเทศ) ปิดไว้ชั่วคราวจนกว่าจะเริ่มเก็บข้อมูลจริง — ค่าที่ตั้งด้านล่างยังไม่มีผลกับหน้าลงนาม", "Item 4 (transfer abroad) is switched off until data collection starts — the server setting below has no effect on the signing page yet")}</b><br>`}${L("ค่าที่แสดงในหน้าลงนาม: ที่ตั้งเซิร์ฟเวอร์ (ข้อ 4 แสดงและบังคับเฉพาะนอกประเทศไทย) และเลขที่หนังสือรับรองจริยธรรม · บริษัทสาธิตของงานตามสถานการณ์ตั้งได้ในหน้าแบบสอบถาม", "Values shown on the consent page: server location (item 4 is shown and required only outside Thailand) and the ethics approval number · the scenario-task demonstration company is set on the questionnaire page")}</p>
        <div class="irb-grid3"><label class="pl-lab">${L("ที่ตั้งเซิร์ฟเวอร์", "Server location")}<select class="sel" id="irbCfgSrv"><option value="th"${c.srv === "th" ? " selected" : ""}>${L("ในประเทศไทย", "In Thailand")}</option><option value="abroad"${c.srv === "abroad" ? " selected" : ""}>${L("นอกประเทศไทย", "Outside Thailand")}</option></select></label>
          <label class="pl-lab">${L("ประเทศ (กรณีนอกประเทศไทย)", "Country (if outside Thailand)")}<input class="inp" id="irbCfgCountry" value="${E(c.country)}"></label>
          <label class="pl-lab">${L("เลขที่หนังสือรับรองจริยธรรม", "Ethics approval number")}<input class="inp" id="irbCfgAppr" value="${E(c.approval)}"></label></div>
        <div class="pl-tools"><button class="btn s" id="irbCfgSave">${L("บันทึกการตั้งค่า", "Save settings")}</button></div></div>` : "";
    return head(L("งานวิจัยในคน · REC", "Human research · REC"), L("ความยินยอมและการถอนตัว", "Consent & withdrawal"),
        L("บันทึกการลงนามยินยอมผ่านระบบตามเอกสารชี้แจงชุดที่ 3 · ดาวน์โหลดสำเนา · ขอถอนตัวหรือขอลบข้อมูล", "Your consent record under information sheet Set 3 · download copies · withdraw or ask for deletion"))
      + `<div class="grid g-side irb-cgrid"><div class="card irb-card">${status}${ok ? sigRecord(rec) : ""}
          <div class="irb-btns" style="justify-content:flex-start">${ok ? `<button class="btn g" data-irbdl="consent">${L("ดาวน์โหลดหนังสือแสดงความยินยอมที่ลงนามแล้ว", "Download the signed consent form")}</button>` : ""}<button class="btn g" data-irbdl="pis">${L("ดาวน์โหลดเอกสารชี้แจง", "Download the information sheet")}</button></div>
          <details class="irb-det"><summary>${L("อ่านเอกสารชี้แจงและหนังสือแสดงความยินยอม", "Read the information sheet and consent form")}</summary>${consentPage({ chk: {} }, ok ? rec : null, { foot: "" })}</details></div>
        <div class="stack"><div class="card irb-card irb-wd" id="irbWdCard">${ok || W.sent ? (W.open || W.sent ? wdBody
            : `<h3>${L("ขอถอนตัวหรือขอลบข้อมูล", "Withdraw or delete my data")}</h3><p class="desc">${L("ถอนตัวได้ทุกเมื่อโดยไม่ต้องให้เหตุผล", "You may withdraw at any time without giving a reason")}</p><button class="btn p" id="irbWdOpen">${L("ขอถอนตัวหรือขอลบข้อมูล", "Withdraw or delete my data")}</button>`)
            : `<p class="desc">${L("ยังไม่มีความยินยอมที่ใช้อยู่", "No active consent")}</p><button class="btn p" id="irbSignNow">${L("อ่านเอกสารและลงนามยินยอม", "Read and sign consent")}</button>`}</div>
          <div class="card irb-card"><h3>${L("รีเซ็ตความยินยอม (สาธิต)", "Reset consent (demo)")}</h3>
            <p class="desc">${L("สำหรับการสาธิตเท่านั้น: ลบบันทึกการลงนามของบัญชีนี้ในเครื่องนี้ แล้วแสดงหน้าลงนามอีกครั้ง — ไม่ใช่การถอนตัว และไม่ลบข้อมูลบนเซิร์ฟเวอร์", "Demo only: removes this account's consent record on this device and shows the consent page again — this is not a withdrawal and does not delete server data")}</p>
            <button class="btn g" id="irbReset">${L("รีเซ็ตความยินยอม (สาธิต)", "Reset consent (demo)")}</button></div></div></div>` + admin;
  }
  function wireConsent(h) {
    if (h.querySelector("#irbGate")) return wireGate(h);
    h.querySelectorAll("[data-irbdl]").forEach(b => b.onclick = () => dlDoc(b.dataset.irbdl));
    const op = h.querySelector("#irbWdOpen"); if (op) op.onclick = () => { W.open = true; render(); };
    h.querySelectorAll("input[name=irbWds]").forEach(r => r.onchange = () => { W.scope = r.value; });
    const cn = h.querySelector("#irbWdCancel"); if (cn) cn.onclick = () => { W.open = false; render(); };
    const sd = h.querySelector("#irbWdSend"); if (sd) sd.onclick = async () => {
      sd.disabled = true;
      const rec = recOf(), d = new Date(), a = acct();
      const wd = { at: d.toISOString(), at_th: nowTH(d), scope: W.scope };
      if (rec) { rec.withdrawn = wd; (rec.history = rec.history || []).push({ signed_at: rec.signed_at, withdrawn_at: wd.at, scope: wd.scope }); setRec(rec, a); }
      if (W.scope === "delete") {   // ลบคำตอบที่เก็บในเครื่องนี้ของบัญชีนี้ทันที (บนเซิร์ฟเวอร์ผู้วิจัยดำเนินการตามคำขอ)
        const o = svStore(); delete o.cur[a]; const rid = o.done[a]; if (rid) o.resp = o.resp.filter(r => r.id !== rid); delete o.done[a]; svSave(o);
        const rr = LSget(REC_KEY, {}) || {}; ["pilotrec", "expertrec"].forEach(k => { rr[k] = (rr[k] || []).filter(x => x.acct !== a); }); LSset(REC_KEY, rr);
      }
      await submit("feedback", { type: "withdraw", withdraw_request: { account: a, requested_at: wd.at, requested_at_th: wd.at_th, scope: wd.scope, ver: CONSENT_VER } });
      W.sent = wd; W.open = false; render();
    };
    const bk = h.querySelector("#irbWdBack"); if (bk) bk.onclick = () => { W.sent = null; check(); render(); };
    const out = h.querySelector("#irbWdOut"); if (out) out.onclick = () => { W.sent = null; signOut(); };
    const sn = h.querySelector("#irbSignNow"); if (sn) sn.onclick = () => check();
    const rs = h.querySelector("#irbReset"); if (rs) rs.onclick = () => { setRec(null); W.sent = null; W.open = false; G.chk = {}; G.ret = "consent"; check(); };
    const cs = h.querySelector("#irbCfgSave"); if (cs) cs.onclick = () => {
      const o = LSget(CFG_KEY, {}) || {};
      o.srv = h.querySelector("#irbCfgSrv").value; o.country = h.querySelector("#irbCfgCountry").value.trim().slice(0, 80); o.approval = h.querySelector("#irbCfgAppr").value.trim().slice(0, 80);
      LSset(CFG_KEY, o); try { toast(L("บันทึกการตั้งค่าแล้ว", "Settings saved")); } catch (e) { } render();
    };
  }

  /* ============================================================================
     แบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2 · ภาคผนวก ฉ) — ตามภาพจำลองของอาจารย์ 8 หน้าจอ + หน้าส่งแล้ว
     ============================================================================ */
  const SV_VER = "4.2-mockup-v2-20261030";
  const PAGES = () => [L("ชี้แจงและลงนามยินยอม", "Information and consent"), L("ส่วนที่ 1 ข้อมูลทั่วไป", "Part 1 General information"),
    L("ส่วนที่ 2 งานตามสถานการณ์", "Part 2 Scenario tasks"), L("ส่วนที่ 3 SUS", "Part 3 SUS"),
    L("ส่วนที่ 4ก แบบสอบถามการยอมรับเทคโนโลยี 17 ข้อ", "Part 4A Technology acceptance questionnaire (17 items)"), L("ส่วนที่ 4ข คุณค่าเชิงพาณิชย์", "Part 4B Commercial value"),
    L("ส่วนที่ 5 ความเข้าใจ", "Part 5 Comprehension"), L("ส่วนที่ 6 คำถามปลายเปิด", "Part 6 Open-ended questions"), L("ส่งคำตอบแล้ว", "Answers submitted")];
  /* ---- ข้อความส่วนต่าง ๆ: ไทยจากภาพจำลอง (M_*) · อังกฤษแปลโดยผู้พัฒนา (SUS ใช้ถ้อยคำต้นฉบับของ Brooke, 1996) */
  const ROLES = () => EN() ? ["Company secretary, corporate governance or strategy", "Corporate relationship manager (e.g. consulting firms or financial and investment service companies)",
    "Executive search consultant or nomination committee", "Investor or analyst", "Other"] : wfDeep(M_ROLES);
  const EXPS = () => EN() ? ["2–5 years", "6–10 years", "More than 10 years"] : M_EXPS;
  const SUS_EN = ["I think that I would like to use this system frequently.", "I found the system unnecessarily complex.", "I thought the system was easy to use.",
    "I think that I would need the support of a technical person to be able to use this system.", "I found the various functions in this system were well integrated.",
    "I thought there was too much inconsistency in this system.", "I would imagine that most people would learn to use this system very quickly.",
    "I found the system very cumbersome to use.", "I felt very confident using the system.", "I needed to learn a lot of things before I could get going with this system."];
  const SUS = () => EN() ? SUS_EN : M_SUS;
  const TAM_EN = [["PEOU Perceived ease of use", [["PEOU1", "You can learn to use the simulation system easily"], ["PEOU2", "You can understand the 2x2 Strategy Matrix on your own"],
      ["PEOU3", "You can conveniently view the descriptive diagnostic report of the organisation compared within its industry"], ["PEOU4", "The overview screen is clear for your access rights"],
      ["PEOU5", "The in-depth explanations of the assessment results and the group index statistics (Percentile) help you understand the results"]]],
    ["PU Perceived usefulness", [["PU1", "The industry group index helps the organisation see its position relative to competitors"], ["PU2", "The evidence-based results report helps reduce the time to prepare the BOD Evaluation agenda"],
      ["PU3", "The system reflects the gap between leadership structure and innovation strategy"], ["PU4", "The system is useful to your organisation"]]],
    ["ATT Attitude toward use", [["ATT1", "The system helps reduce subjectivity in board assessment"], ["ATT2", "You will use the report in the annual board evaluation"],
      ["ATT3", "You trust the system's security because it uses public data and separates the back-end computation to protect trade secrets"], ["ATT4", "What-if Studio gives a better view than the conventional assessment"]]],
    ["BI Behavioral intention", [["BI1", "You will use the system when it becomes a full service"], ["BI2", "You will push the strategy / compliance unit to use this system"],
      ["BI3", "You will use the system to follow up continuously"], ["BI4", "You will recommend this system to partners or other public companies"]]]];
  const TAM = () => EN() ? TAM_EN : M_TAM;
  /** องค์ประกอบ TAM: [รหัส, ข้อแรก, ข้อสุดท้าย] (tam1–tam17 ตามโครงร่าง: PEOU 1–5 · PU 6–9 · ATT 10–13 · BI 14–17) */
  const TAM_GRP = [["PEOU", 1, 5], ["PU", 6, 9], ["ATT", 10, 13], ["BI", 14, 17]];
  const TAM_FLAT = () => TAM().flatMap(([, items]) => items);
  const WTP_INTRO = () => L(M_WTP_INTRO, "The system presents 3 purchase-choice sets, one at a time, and asks you to choose 1 option per set. The service packages and prices are hypothetical; there is no sale or payment, and the results of this part are used as information on interest, not as price evidence. Option (A) is a per-project analysis service by an analyst (managed assessment), which includes data intake, quality checks, a report and one results discussion. Options (B) and (C) are annual per-organisation licences at the Pro and Pro Max levels respectively, and option (D) is not buying.");
  const WTP_ROLE = () => EN() ? ["User", "Proposer", "Budget owner", "Approver", "IT adviser"] : M_WTP_ROLE;
  const WTP_PAY = () => EN() ? ["The user unit's budget", "The organisation's central budget", "The IT budget", "The company secretary's office or board budget", "Not known yet"] : M_WTP_PAY;
  const YN = () => [L("ใช่", "Yes"), L("ไม่ใช่", "No")];
  const RECON = () => [L("ประสงค์", "Yes, I would like to be contacted"), L("ไม่ประสงค์", "No")];
  const COMP_EN = [["What does the score's tier mean?", ["(a) The probability that the company will have open innovation in the next year", "(b) The company's position against the reference data set, divided into 4 levels at the quartile cut points", "(c) A quality assessment of the board"], 1],
    ["What does a high score in quadrant C mean?", ["(a) A strong open-innovation signal", "(b) Both the CEO's language and the board composition are on the cautious side, so a high score in this cell does not mean a strong innovation signal", "(c) The board amplifies the CEO's promotion motivation"], 1],
    ["How should a fiscal year with FAIL status be read?", ["(a) Read the results as usual", "(b) Do not read the results as usual, because that year's score did not pass the validity criterion", "(c) Use that year's results in place of other years"], 1],
    ["Does this system assess directors individually?", ["(a) It assesses individuals", "(b) It does not assess individuals and gives company-level results only"], 1],
    ["What does the relationship between the score and open innovation mean?", ["(a) Changing the board composition makes open innovation increase", "(b) A statistical association, not cause and effect"], 1]];
  const COMP = () => EN() ? COMP_EN : M_COMP;
  const OPEN = () => EN() ? ["Which information in the report is most useful for your work, and why?", "Is there any point that is hard to understand, lacks evidence, or could lead to interpretation beyond what the report supports?",
    "Suggestions to improve the report, the demonstration or the steps of use, with reasons", "What should be improved before use in your work", "Other suggestions"] : M_OPEN;
  const REG_LAB = () => ({ PASS: L("ผ่าน (PASS)", "Pass (PASS)"), CAUTION: L("เฝ้าระวัง (CAUTION)", "Monitor (CAUTION)"), FAIL: L("ไม่ผ่าน (FAIL)", "Fail (FAIL)"), NV: L("ยังไม่ตรวจความตรง", "Not yet validated") });
  /* คำถามสำรองของงาน 4 (ภาพจำลอง) — ใช้เมื่อไม่มีรายงาน Compass · A Deliver · B Discipline · C Develop · D Discover */
  const Q4_FALLBACK = { A: "คณะกรรมการจะติดตามให้โครงการนวัตกรรมแบบเปิดที่ประกาศไว้ส่งมอบผลได้ตามแผนอย่างไร", B: "คณะกรรมการควรเพิ่มความรอบคอบในการอนุมัติความร่วมมือภายนอกในด้านใดบ้าง",
    C: "บริษัทควรเริ่มทดลองความร่วมมือภายนอกขนาดเล็กในเรื่องใดก่อน", D: "องค์ประกอบคณะกรรมการปัจจุบันช่วยให้แสวงหาโอกาสใหม่ได้มากขึ้นในเรื่องใด" };
  const Q4_FALLBACK_EN = { A: "How will the board make sure the announced open-innovation projects deliver results as planned?", B: "In which areas should the board be more careful when approving external collaboration?",
    C: "Which small external collaboration should the company try first?", D: "In which areas does the current board composition help the company look for new opportunities?" };
  const tr = s => (EN() && window.I18N && typeof window.I18N.raw === "function") ? window.I18N.raw(s) : s;
  const q4Text = k => { const C = window.ZONE_CFG || (typeof COMPASS === "object" ? COMPASS : null); const q = C && C[k] && C[k].qs && C[k].qs[0];
    return q ? tr(q) : (EN() ? Q4_FALLBACK_EN[k] : Q4_FALLBACK[k]); };

  /* ---------------------------------------------------------------- บริษัทสาธิต (ชุดเดียวกันทุกคน · ไม่แสดงชื่อจริง) */
  function demoT() {
    const c = cfg().demoT; if (c && typeof byT === "object" && byT[c]) return c;
    if (typeof COMPS === "undefined") return null;
    /* ค่าตั้งต้นแบบกำหนดแน่นอน: บริษัทในโดเมน ปีบัญชีผ่านการตรวจความตรง (PASS) Tier 2 ควอดแรนต์ A (ตามภาพจำลอง) — เรียงตามชื่อย่อ */
    const pool = COMPS.filter(x => x && x.t && (typeof inDomainOf !== "function" || inDomainOf(x.ind))).slice().sort((a, b) => a.t.localeCompare(b.t));
    const ok = x => { try { const v = verdictOf(x); return v.regime === "PASS" && v.tier === 2 && v.quad === "A"; } catch (e) { return false; } };
    return (pool.find(ok) || pool[0] || {}).t || null;
  }
  function demo() {
    const t = demoT(), c = t ? byT[t] : null; if (!c) return null;
    const v = verdictOf(c), reg = v.regime === "PASS" || v.regime === "CAUTION" || v.regime === "FAIL" ? v.regime : "NV";
    const fy = v.fy || c.fy || FY_SHOWN, band = v.band || [NaN, NaN];
    return { t, tier: v.tier, quad: v.quad, reg, fy, ois: c.ipi, lo: band[0], hi: band[1], cP: c.dp, bP: c.ap };
  }
  const fyLab = fy => EN() ? `FY${fy}` : String(+fy + 543);
  const QNAME = { A: "A · Deliver (Amplified drive)", B: "B · Discipline (Constrained drive)", C: "C · Develop (Consistent restraint)", D: "D · Discover (Untapped board)" };
  /** งาน 1–5 — คีย์คำตอบไม่ขึ้นกับภาษา (เก็บเป็นรหัส) · เฉลยคำนวณจากบริษัทสาธิต ณ เวลาที่ตอบ */
  function tasks(r, d) {
    const RL = REG_LAB();
    const q5 = { quad: L(`บริษัทสาธิตอยู่ในควอดแรนต์ ${d.quad}`, `The demonstration company is in quadrant ${d.quad}`),
      tier: L(`คะแนนของบริษัทสาธิตอยู่ในระดับ Tier ${d.tier}`, `The demonstration company's score is at Tier ${d.tier}`),
      fy: d.reg === "PASS" ? L(`ปีบัญชี ${fyLab(d.fy)} ผ่านการตรวจความตรง`, `Fiscal year ${fyLab(d.fy)} passed the validity check`) : L(`ปีบัญชี ${fyLab(d.fy)} มีสถานะความตรง ${RL[d.reg]}`, `Fiscal year ${fyLab(d.fy)} has validity status ${RL[d.reg]}`),
      causal: L("การเพิ่มสัดส่วนกรรมการหญิงจะทำให้บริษัทสาธิตมีนวัตกรรมแบบเปิดมากขึ้น", "Increasing the proportion of women directors would give the demonstration company more open innovation") };
    return [
      { k: "tier", t: L("อ่านระดับ (Tier) ของบริษัทสาธิต", "Read the tier of the demonstration company"), o: [1, 2, 3, 4].map(v => [v, "Tier " + v]), ok: d.tier },
      { k: "quad", t: L("ระบุควอดแรนต์ของบริษัทสาธิต", "Identify the quadrant of the demonstration company"), o: ["A", "B", "C", "D"].map(v => [v, v]), ok: d.quad },
      { k: "reg", t: L("อ่านสถานะความตรงของปีบัญชีที่แสดง", "Read the validity status of the fiscal year shown"), o: ["PASS", "CAUTION", "FAIL", "NV"].map(v => [v, RL[v]]), ok: d.reg },
      { k: "q4", t: L("เลือกคำถามที่ควรนำไปหารือกับคณะกรรมการ", "Choose the question that should be discussed with the board"), o: r.perm.q4.map(v => [v, q4Text(v)]), ok: d.quad, shuffle: true },
      { k: "q5", t: L("ระบุสิ่งที่ยังสรุปไม่ได้จากผล", "Identify what cannot yet be concluded from the results"), o: r.perm.q5.map(v => [v, q5[v]]), ok: "causal", shuffle: true },
    ];
  }
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  function newResp(arm, src) {
    return { id: uid(), sv: SV_VER, consent_ver: CONSENT_VER, arm, arm_src: src, demoT: demoT(), page: 1, ti: 0, started: new Date().toISOString(),
      perm: { q4: shuffle(["A", "B", "C", "D"]), q5: shuffle(["quad", "tier", "fy", "causal"]) },
      p1: {}, task: {}, task_ok: {}, task_ms: {}, sus: {}, tam: {}, wtp: { set: 0 }, comp: {}, open: {} };
  }
  const susScore = s => { for (let i = 1; i <= 10; i++) if (!s[i]) return null; let t = 0; for (let i = 1; i <= 10; i++) t += i % 2 ? s[i] - 1 : 5 - s[i]; return t * 2.5; };
  const T0 = {};                       // เวลาเริ่มของงานที่กำลังแสดง (หน่วยความจำ ไม่บันทึก)
  let _svSrv = null;                   // สถานะการส่งเข้าเซิร์ฟเวอร์ของคำตอบล่าสุด

  /* ---------------------------------------------------------------- หลักฐานของบริษัทสาธิต (ภาพ 2×2 หรือ ตาราง) + แถบสถานะ + มาตรวัด OIS */
  function gridSVG(d) {
    const W0 = 420, H0 = 300, L0 = 40, R0 = 20, T0_ = 10, B0 = 30, w = W0 - L0 - R0, h = H0 - T0_ - B0;
    const MV = window.MVP_DIVIDERS || {}, dx = (+MV.x || 53.8) / 100, dy = (+MV.y || 36.0) / 100;   // เส้นแบ่งควอดแรนต์ตามเปอร์เซ็นไทล์ (edit9) — ไม่แสดงตัวเลข
    const cx = L0 + dx * w, cy = T0_ + (1 - dy) * h;
    let x = L0 + clamp((+d.cP || 50) / 100, 0, 1) * w, y = T0_ + (1 - clamp((+d.bP || 50) / 100, 0, 1)) * h;
    const right = "AB".includes(d.quad), up = "AD".includes(d.quad);           // ให้จุดอยู่ในช่องเดียวกับควอดแรนต์ที่ระบบคำนวณเสมอ
    x = right ? clamp(x, cx + 10, L0 + w - 10) : clamp(x, L0 + 10, cx - 10); y = up ? clamp(y, T0_ + 10, cy - 10) : clamp(y, cy + 10, T0_ + h - 10);
    const q = (lab, sub, xx, yy, col) => `<text x="${xx}" y="${yy}" fill="${col}" font-size="15" font-weight="700" text-anchor="middle">${lab}</text><text x="${xx}" y="${yy + 18}" fill="currentColor" opacity=".7" font-size="12" text-anchor="middle">${sub}</text>`;
    return `<svg viewBox="0 0 ${W0} ${H0}" width="100%" role="img" aria-label="Strategy Matrix" class="irb-svg">
      <rect x="${L0}" y="${T0_}" width="${w}" height="${h}" fill="none" stroke="currentColor" opacity=".35"/>
      <line x1="${cx}" y1="${T0_}" x2="${cx}" y2="${T0_ + h}" stroke="currentColor" opacity=".35"/><line x1="${L0}" y1="${cy}" x2="${L0 + w}" y2="${cy}" stroke="currentColor" opacity=".35"/>
      ${q("D", "Discover", (L0 + cx) / 2, T0_ + 28, "#2f6db3")}${q("A", "Deliver", (cx + L0 + w) / 2, T0_ + 28, "#2e7d5b")}${q("C", "Develop", (L0 + cx) / 2, T0_ + h - 34, "#6b7280")}${q("B", "Discipline", (cx + L0 + w) / 2, T0_ + h - 34, "#c27c0e")}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="var(--brand)" stroke="var(--panel)" stroke-width="2"/><text x="${(x + 12).toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="12" fill="currentColor">${L("บริษัทสาธิต", "Demo company")}</text>
      <text x="${L0 + w / 2}" y="${H0 - 8}" font-size="12" fill="currentColor" text-anchor="middle" opacity=".8">${L("ทิศทางแรงจูงใจของ CEO: ระมัดระวัง ← → เน้นโอกาส", "CEO motivation direction: cautious ← → opportunity-focused")}</text>
      <text x="14" y="${T0_ + h / 2}" font-size="12" fill="currentColor" text-anchor="middle" opacity=".8" transform="rotate(-90 14 ${T0_ + h / 2})">${L("ผลของคณะกรรมการ: ลดทอน ↔ ขยาย", "Board effect: dampens ↔ amplifies")}</text></svg>`;
  }
  function evidence(r, d) {
    const up = "AD".includes(d.quad), right = "AB".includes(d.quad);
    const g = r.arm === "grid"
      ? `<div class="irb-panel" id="irbArmGrid"><div class="irb-pt">${L("ภาพเมทริกซ์ 2×2 (Strategy Matrix)", "2×2 matrix chart (Strategy Matrix)")}</div>${gridSVG(d)}</div>`
      : `<div class="irb-panel" id="irbArmTable"><div class="irb-pt">${L("ตารางควอดแรนต์ ทิศทาง และเปอร์เซ็นไทล์", "Quadrant, direction and percentile table")}</div><table class="irb-t">
          <tr><th>${L("ควอดแรนต์", "Quadrant")}</th><td><b>${E(QNAME[d.quad] || d.quad)}</b></td></tr>
          <tr><th>${L("ทิศทางแรงจูงใจของ CEO", "CEO motivation direction")}</th><td>${right ? L("เน้นโอกาส (+)", "Opportunity-focused (+)") : L("ระมัดระวัง (−)", "Cautious (−)")}</td></tr>
          <tr><th>${L("ผลของคณะกรรมการ", "Board effect")}</th><td>${up ? L("ขยายสัญญาณ (+)", "Amplifies the signal (+)") : L("ลดทอนสัญญาณ (−)", "Dampens the signal (−)")}</td></tr>
          <tr><th>${L("เปอร์เซ็นไทล์ CEO", "CEO percentile")}</th><td>${fmt(d.cP, 0)}</td></tr><tr><th>${L("เปอร์เซ็นไทล์คณะกรรมการ", "Board percentile")}</th><td>${fmt(d.bP, 0)}</td></tr></table></div>`;
    const pc = v => clamp(+v || 0, 0, 100) + "%";
    const gauge = `<div class="irb-panel"><div class="irb-pt">${L("คะแนน OpenInnoScore (OIS) และช่วงความไม่แน่นอน 90%", "OpenInnoScore (OIS) and 90% uncertainty band")}</div>
      <div class="irb-gauge"><div class="irb-bands"><div style="background:#9aa3b2">Tier 4</div><div style="background:#7a96b8">Tier 3</div><div style="background:#3f7fb8">Tier 2</div><div style="background:#0f4c81">Tier 1</div></div>
        <div class="irb-ci" style="left:${pc(d.lo)};width:${clamp((+d.hi || 0) - (+d.lo || 0), 0, 100)}%"></div><div class="irb-mk" style="left:${pc(d.ois)}"><span>${fmt(d.ois, 0)}</span></div></div>
      <div class="irb-gscale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      <p class="irb-sub" style="margin:8px 0 0;font-size:12.5px">${L("ช่วง 90%", "90% band")}: ${fmt(d.lo, 0)}–${fmt(d.hi, 0)} · ${L("จุดตัดระดับที่ 25 50 และ 75", "tier cut points at 25, 50 and 75")}</p></div>`;
    const badge = { PASS: "ok", CAUTION: "warn", FAIL: "crit", NV: "mute" }[d.reg];
    return `<div class="irb-status" id="irbStatus"><b>${L("บริษัทสาธิต (ข้อมูลตัวอย่าง)", "Demonstration company (sample data)")}</b><span>${L("ปีบัญชี", "Fiscal year")} ${fyLab(d.fy)}</span><span class="pill ${badge}">${E(REG_LAB()[d.reg])}</span><span>OIS ${fmt(d.ois, 0)} (${L("ช่วง 90%", "90% band")}: ${fmt(d.lo, 0)}–${fmt(d.hi, 0)})</span></div>
      <div class="irb-evid">${g}${gauge}</div>`;
  }

  /* ---------------------------------------------------------------- หน้าจอของแบบสอบถาม */
  const radio = (name, opts, cur, attr) => `<div class="irb-opts${attr && attr.row ? " row" : ""}">${opts.map(([v, lab]) => `<label class="irb-opt"><input type="radio" name="${name}" value="${E(v)}" data-${attr.data}="${E(attr.key)}" ${String(cur) === String(v) && cur !== undefined && cur !== null ? "checked" : ""}><span>${E(lab)}</span></label>`).join("")}</div>`;
  const idxOpts = arr => arr.map((l, i) => [i + 1, l]);
  function scaleTable(rows, store, grp) {
    let h = `<div class="tw"><table class="irb-scale" data-scale="${grp}"><tr><th>${L("ข้อ", "Item")}</th><th>${L("ข้อคำถาม", "Statement")}</th>${[1, 2, 3, 4, 5].map(n => `<th class="c">${n}</th>`).join("")}</tr>`;
    rows.forEach(r => {
      if (r.grp) { h += `<tr class="grp"><td colspan="7">${E(r.grp)}</td></tr>`; return; }
      h += `<tr><td class="code">${E(r.code)}</td><td>${E(r.text)}</td>${[1, 2, 3, 4, 5].map(n => `<td class="c"><input type="radio" name="${grp}${r.idx}" aria-label="${E(r.code)} = ${n}" data-sc="${grp}" data-i="${r.idx}" value="${n}" ${store[r.idx] === n ? "checked" : ""}></td>`).join("")}</tr>`;
    });
    return h + "</table></div>";
  }
  const navBtns = (prevOk, nextLab, nextOk, nextId) => `<div class="irb-btns"><button class="btn g" data-svgo="prev" ${prevOk ? "" : "disabled"}>${L("ย้อนกลับ", "Back")}</button>
    <button class="btn p" id="${nextId || "irbNext"}" data-svgo="next" ${nextOk === false ? "disabled" : ""}>${nextLab || L("ถัดไป", "Next")}</button></div>`;
  function pageBody(r, d) {
    const P = r.page;
    if (P === 1) {
      const other = r.p1.role === 5 ? `<div style="margin:6px 0 0 26px">${L("โปรดระบุ", "Please specify")} <input class="inp" type="text" id="irbRoleOther" maxlength="120" value="${E(r.p1.roleOther || "")}"></div>` : "";
      return `<h1 class="irb-h1">${L("ส่วนที่ 1 ข้อมูลทั่วไป", "Part 1 General information")}</h1><p class="irb-sub">${L("ข้อมูลนี้ใช้จัดกลุ่มผลการวิเคราะห์ระดับกลุ่มเท่านั้น", "This information is used only to group results at group level")}</p>
        <div class="irb-q"><div class="irb-qt">${L("กลุ่มผู้ใช้", "User group")}</div>${radio("irbRole", idxOpts(ROLES()), r.p1.role, { data: "p1", key: "role" })}${other}</div>
        <div class="irb-q"><div class="irb-qt">${L("ประสบการณ์ทำงาน", "Work experience")}</div>${radio("irbExp", idxOpts(EXPS()), r.p1.exp, { data: "p1", key: "exp", row: true })}</div>${navBtns(true)}`;
    }
    if (P === 2) {
      const T = tasks(r, d), ti = clamp(r.ti || 0, 0, 4), t = T[ti], cur = r.task[t.k];
      if (!T0[ti]) T0[ti] = performance.now();
      return `<h1 class="irb-h1">${L("ส่วนที่ 2 งานตามสถานการณ์", "Part 2 Scenario tasks")}</h1><p class="irb-sub">${L("ระบบแสดงหลักฐานของบริษัทสาธิตชุดเดียวกันแก่ผู้ตอบทุกคน ต่างกันเฉพาะรูปแบบตามกลุ่มที่ระบบจัด ระบบบันทึกเวลาและความถูกต้องของแต่ละงานโดยอัตโนมัติ และท่านต้องตอบงานแต่ละข้อก่อนไปข้อถัดไป",
          "The system shows the same evidence on a demonstration company to every respondent; only the format differs by the group the system assigned. The system records the time and accuracy of each task automatically, and you must answer each task before moving to the next.")}</p>
        ${evidence(r, d)}
        <div class="irb-q"><div class="irb-taskhead"><div class="irb-qt" id="irbTaskTitle">${L(`งานที่ ${ti + 1} จาก 5`, `Task ${ti + 1} of 5`)}: ${E(t.t)}</div><span class="irb-pill">${L("กลุ่ม", "Group")}: ${armName(r.arm)}</span></div>
          ${radio("irbTask" + ti, t.o, cur, { data: "task", key: t.k })}</div>
        <div class="irb-btns"><button class="btn g" data-svti="${ti - 1}">${L("ย้อนกลับ", "Back")}</button>
          <button class="btn p" id="irbNext" data-svti="${ti + 1}" ${cur !== undefined ? "" : "disabled"}>${ti < 4 ? L("งานถัดไป", "Next task") : L("ถัดไป", "Next")}</button></div>`;
    }
    if (P === 3) {
      const rows = SUS().map((t, i) => ({ code: String(i + 1), text: t, idx: i + 1 }));
      return `<h1 class="irb-h1">${L("ส่วนที่ 3 SUS", "Part 3 SUS")}</h1><p class="irb-sub">${L("(1 = ไม่เห็นด้วยอย่างยิ่ง ถึง 5 = เห็นด้วยอย่างยิ่ง) · ท่านข้ามข้อที่ไม่ต้องการตอบได้", "(1 = strongly disagree to 5 = strongly agree) · you may skip items you do not wish to answer")}</p>${scaleTable(rows, r.sus, "sus")}${navBtns(true)}`;
    }
    if (P === 4) {
      const rows = []; let n = 0;
      TAM().forEach(([g, items]) => { rows.push({ grp: g }); items.forEach(([c, t]) => { n++; rows.push({ code: c, text: t, idx: n }); }); });
      return `<h1 class="irb-h1">${L("ส่วนที่ 4ก แบบสอบถามการยอมรับเทคโนโลยี 17 ข้อ", "Part 4A Technology acceptance questionnaire (17 items)")}</h1>
        <p class="irb-sub">${L("โปรดตอบจากรายงานที่ได้ชม และเลือกหนึ่งระดับต่อข้อ 1 = ไม่เห็นด้วยอย่างยิ่ง 2 = ไม่เห็นด้วย 3 = ไม่แน่ใจหรือปานกลาง 4 = เห็นด้วย 5 = เห็นด้วยอย่างยิ่ง หากประเมินไม่ได้ให้เว้นว่าง และท่านสามารถข้ามข้อหรือยุติการตอบได้",
          "Please answer based on the report you watched and choose one level per item: 1 = strongly disagree, 2 = disagree, 3 = unsure or neutral, 4 = agree, 5 = strongly agree. If you cannot assess an item, leave it blank; you may skip items or stop answering.")}</p>${scaleTable(rows, r.tam, "tam")}${navBtns(true)}`;
    }
    if (P === 5) {
      const w = r.wtp, k = clamp(w.set || 0, 0, 2), prices = M_WTP_SETS[k], cur = w["s" + (k + 1)];
      const ch = (id, lab, price, unit) => `<div class="irb-choice ${cur === id ? "sel" : ""}" data-wtpch="${id}" role="button" tabindex="0" aria-pressed="${cur === id}"><b>${lab}</b>${price ? `<span class="p">${fmtN(price)} ${L("บาท", "THB")}</span><span class="u">${unit}</span>` : `<span class="p" style="color:var(--ink-3)">${L("ไม่ซื้อ", "Do not buy")}</span><span class="u">&nbsp;</span>`}</div>`;
      return `<h1 class="irb-h1">${L("ส่วนที่ 4ข คุณค่าเชิงพาณิชย์", "Part 4B Commercial value")}</h1><div class="irb-note">${E(WTP_INTRO())}</div>
        <div class="irb-q"><div class="irb-taskhead"><div class="irb-qt" id="irbWtpSet">${L(`ชุดทางเลือกที่ ${k + 1} จาก 3`, `Choice set ${k + 1} of 3`)}</div><span class="irb-pill">${L("เลือก 1 ทางเลือก", "Choose 1 option")}</span></div>
          <div class="irb-setcard">${ch("a", L("(ก) บริการวิเคราะห์รายโครงการ", "(A) Per-project analysis service"), prices[0], L("ต่อโครงการ", "per project"))}${ch("b", L("(ข) Pro", "(B) Pro"), prices[1], L("ต่อปีต่อองค์กร", "per year per organisation"))}${ch("c", L("(ค) Pro Max", "(C) Pro Max"), prices[2], L("ต่อปีต่อองค์กร", "per year per organisation"))}${ch("d", L("(ง) ไม่ซื้อ", "(D) Do not buy"), 0, "")}</div>
          <div class="irb-btns"><button class="btn g" data-wtpset="${k - 1}" ${k ? "" : "disabled"}>${L("ชุดก่อนหน้า", "Previous set")}</button><button class="btn s" id="irbWtpNextSet" data-wtpset="${k + 1}" ${k < 2 && cur ? "" : "disabled"}>${L("ชุดถัดไป", "Next set")}</button></div></div>
        <h2 class="irb-h2">${L("คำถามประกอบ", "Related questions")}</h2>
        <div class="irb-q"><div class="irb-qt">1. ${L("บทบาทของท่านในการซื้อบริการลักษณะนี้ในองค์กร", "Your role in buying this kind of service in your organisation")}</div>${radio("irbWrole", idxOpts(WTP_ROLE()), w.role, { data: "wtp", key: "role", row: true })}</div>
        <div class="irb-q"><div class="irb-qt">2. ${L("ท่านสนใจทดลองใช้บริการนี้ 3 เดือนหรือไม่", "Are you interested in trying this service for 3 months?")}</div>${radio("irbWtrial", idxOpts(YN()), w.trial, { data: "wtp", key: "trial", row: true })}</div>
        <div class="irb-q"><div class="irb-qt">3. ${L("ในหนึ่งปี หน่วยงานของท่านใช้เวลาประมาณกี่ชั่วโมงในการรวบรวม ตรวจสอบ และสรุปข้อมูลประเภทนี้เพื่อเตรียมการประเมินคณะกรรมการหรือการตัดสินใจที่เกี่ยวข้อง", "In one year, about how many hours does your unit spend collecting, checking and summarising this kind of information to prepare the board evaluation or related decisions?")}</div>
          <input class="inp" type="number" min="0" max="1000" step="1" id="irbWhrs" value="${w.hrs ?? ""}" style="width:140px"> ${L("ชั่วโมง", "hours")} <span class="irb-sub">(0–1,000)</span></div>
        <div class="irb-q"><div class="irb-qt">4. ${L("ท่านพบประเด็นใหม่จากรายงานหรือไม่", "Did you find new issues in the report?")}</div>${radio("irbWnew", idxOpts(YN()), w.newIss, { data: "wtp", key: "newIss", row: true })}
          ${w.newIss === 1 ? `<textarea class="inp irb-ta" maxlength="500" id="irbWnewTxt" placeholder="${E(L("โปรดระบุ (ไม่เกิน 500 ตัวอักษร)", "Please specify (up to 500 characters)"))}">${E(w.newIssTxt || "")}</textarea><div class="irb-counter">${(w.newIssTxt || "").length} / 500</div>` : ""}</div>
        <div class="irb-q"><div class="irb-qt">5. ${L("หากองค์กรของท่านซื้อบริการนี้ งบประมาณจะมาจากแหล่งใด", "If your organisation bought this service, where would the budget come from?")}</div>${radio("irbWpay", idxOpts(WTP_PAY()), w.pay, { data: "wtp", key: "pay" })}</div>
        <div class="irb-q"><div class="irb-qt">6. ${L("ท่านประสงค์ให้ผู้วิจัยติดต่อกลับเพื่อสนทนาเรื่องบทบาทผู้ซื้อหรือความร่วมมือในขั้นตอนที่ 5.3 หรือไม่", "Would you like the researcher to contact you again to discuss buying roles or collaboration in step 5.3?")}</div>${radio("irbWrec", idxOpts(RECON()), w.recontact, { data: "wtp", key: "recontact", row: true })}
          ${w.recontact === 1 ? `<div style="margin-top:8px">${L("ช่องทางติดต่อ", "Contact channel")} <input class="inp" type="text" id="irbContact" maxlength="120" style="width:min(320px,100%)" placeholder="${E(L("อีเมลหรือหมายเลขโทรศัพท์", "E-mail or telephone number"))}" value="${E(r._contact || "")}">
            <p class="irb-sub" style="margin:4px 0 0;font-size:13px">${L("ช่องทางติดต่อเก็บแยกจากคำตอบ การให้ช่องทางติดต่อไม่ใช่การยินยอมเข้าร่วมขั้นตอนที่ 5.3", "The contact channel is stored separately from your answers. Giving a contact channel is not consent to step 5.3.")}</p></div>` : ""}</div>
        <p class="irb-sub" style="font-size:13px">${L("หมายเหตุ: การสนทนาในขั้นตอนที่ 5.3 เป็นการสนทนาแบบมีโครงสร้างไม่เกิน 30 นาที แบบพบตัวหรือผ่าน Zoom Meeting ไม่บันทึกเสียงหรือภาพ และผู้ให้ข้อมูลลงนามในเอกสารชี้แจงชุดที่ 4 ก่อนเริ่ม",
          "Note: the step 5.3 conversation is a structured conversation of no more than 30 minutes, in person or via Zoom Meeting, with no audio or video recording, and the informant signs information sheet Set 4 before it starts.")}</p>${navBtns(true)}`;
    }
    if (P === 6) return `<h1 class="irb-h1">${L("ส่วนที่ 5 ความเข้าใจ", "Part 5 Comprehension")}</h1><p class="irb-sub">${L("เลือก 1 คำตอบต่อข้อ", "Choose 1 answer per item")}</p>
        ${COMP().map(([q, opts], i) => `<div class="irb-q"><div class="irb-qt">${i + 1}. ${E(q)}</div>${radio("irbComp" + i, opts.map((o, j) => [j, o]), r.comp[i + 1], { data: "comp", key: String(i + 1) })}</div>`).join("")}${navBtns(true)}`;
    if (P === 7) return `<h1 class="irb-h1">${L("ส่วนที่ 6 คำถามปลายเปิด", "Part 6 Open-ended questions")}</h1><p class="irb-sub">${L("ข้อละไม่เกิน 1,000 ตัวอักษร · ท่านข้ามข้อที่ไม่ต้องการตอบได้ · โปรดไม่ระบุชื่อบุคคลหรือข้อมูลลับขององค์กร", "Up to 1,000 characters each · you may skip questions · please do not name people or include confidential organisational information")}</p>
        ${OPEN().map((q, i) => `<div class="irb-q"><div class="irb-qt">${i + 1}. ${E(q)}</div><textarea class="inp irb-ta" maxlength="1000" data-open="${i + 1}">${E(r.open[i + 1] || "")}</textarea><div class="irb-counter">${fmtN((r.open[i + 1] || "").length)} / 1,000</div></div>`).join("")}
        <div class="irb-btns"><button class="btn g" data-svgo="prev">${L("ย้อนกลับ", "Back")}</button><button class="btn p" id="irbSubmit">${L("ส่งคำตอบ", "Submit answers")}</button></div>`;
    return "";
  }
  function viewSurvey() {
    const o = svStore(), a = acct(), rec = recOf(), d = demo();
    let r = o.cur[a] || null;
    const doneId = o.done[a];
    const page = doneId && !r ? 8 : r ? r.page : 0;
    const n = Math.min(page, 7), names = PAGES();
    const shell = `<div class="irb-svtop"><span class="irb-logo2">OpenInnoScore<small>${L("แบบสอบถามประเมินต้นแบบนวัตกรรม (ขั้นตอนที่ 4.2)", "Prototype evaluation questionnaire (step 4.2)")}</small></span>
        <span class="irb-btnrow"><button class="lnk irb-link" data-goto="consent" id="irbWdLink">${L("ขอถอนตัวหรือขอลบข้อมูล", "Withdraw or delete my data")}</button><span class="irb-acct">${L("บัญชีที่ได้รับเชิญ", "Invited account")}: ${E(signer())}</span></span></div>
      <div class="irb-progress"><div class="irb-steps" id="irbSteps">${Array.from({ length: 8 }, (_, i) => `<div class="irb-step ${i < n ? "done" : ""} ${i === n && page < 8 ? "cur" : ""} ${page === 8 ? "done" : ""}"></div>`).join("")}</div>
        <div class="irb-steplabel"><span id="irbStepTxt">${page === 8 ? L("เสร็จสิ้น", "Completed") : L(`ขั้นที่ ${page + 1} จาก 8`, `Step ${page + 1} of 8`)}</span><span id="irbStepName">${E(names[page])}</span></div></div>`;
    let body;
    if (!d) body = `<div class="irb-warnbox">${L("ยังไม่มีข้อมูลบริษัทสาธิต", "No demonstration company data")}</div>`;
    else if (page === 0) body = valid(rec) ? consentPage({ chk: {} }, rec, { foot: `<div class="irb-btns"><span></span><button class="btn p" id="irbStart">${L("เริ่มตอบแบบสอบถาม", "Start the questionnaire")}</button></div>` })
      : `<div class="irb-warnbox">${L("ต้องลงนามยินยอมก่อนตอบแบบสอบถาม", "You must sign consent before answering the questionnaire")}</div><div class="irb-btns"><span></span><button class="btn p" id="irbSignNow2">${L("อ่านเอกสารและลงนามยินยอม", "Read and sign consent")}</button></div>`;
    else if (page === 8) body = `<div style="text-align:center;padding:20px 0" id="irbDone"><div class="irb-done-ico">✓</div><h1 class="irb-h1">${L("ส่งคำตอบเรียบร้อยแล้ว", "Your answers have been submitted")}</h1>
        <p>${L("ขอบคุณที่สละเวลาร่วมงานวิจัย ระบบบันทึกคำตอบของท่านในฐานข้อมูลกลางแล้ว", "Thank you for your time. The system has recorded your answers in the central database.")}</p>
        ${_svSrv ? `<div class="irb-${_svSrv === "fail" ? "warnbox" : "note"}" id="irbSvSrv">${_svSrv === "ok" ? L("บันทึกเข้าเซิร์ฟเวอร์แล้ว", "Saved to the server") : _svSrv === "fail" ? L("บันทึกเข้าเซิร์ฟเวอร์ไม่สำเร็จ — คำตอบยังอยู่ในเครื่องนี้", "Could not save to the server — your answers remain on this device") : L("กำลังบันทึกเข้าเซิร์ฟเวอร์…", "Saving to the server…")}</div>` : SRV ? "" : `<p class="irb-sub">${L("ฉบับออฟไลน์: คำตอบบันทึกในเครื่องนี้", "Offline version: answers are stored on this device")}</p>`}</div>
      <div class="irb-note">${L("ขั้นถัดไป: ผู้วิจัยจะทบทวนการอ่านผลกับท่านประมาณ 10 นาที", "Next: the researcher will review your reading of the results with you for about 10 minutes")}<br>${L("หากต้องการถอนตัว ท่านขอให้ลบข้อมูลได้ถึงวันที่ 20 กุมภาพันธ์ 2570 โดยกดปุ่ม “ขอถอนตัวหรือขอลบข้อมูล” ด้านบน หรือแจ้งผู้วิจัย (โทรศัพท์ 082-492-2451 · krongsin.s@gmail.com)",
        "If you wish to withdraw, you may ask for your data to be deleted until 20 February 2027 by clicking “Withdraw or delete my data” above or by telling the researcher (tel. 082-492-2451 · krongsin.s@gmail.com)")}</div>
      <div class="irb-btns" style="justify-content:flex-start"><button class="btn g" data-irbdl="consent">${L("ดาวน์โหลดหนังสือแสดงความยินยอมที่ลงนามแล้ว", "Download the signed consent form")}</button></div>`;
    else body = pageBody(r, d);
    return head(L("งานวิจัย · ขั้นตอนที่ 4.2", "Research · step 4.2"), L("แบบสอบถามประเมินต้นแบบนวัตกรรม", "Prototype evaluation questionnaire"),
        L("ข้อความตรงกับภาคผนวก ฉ ของโครงร่างฉบับวันที่ 30 ตุลาคม 2569 และเอกสารชี้แจงชุดที่ 3 · ระบบจับเวลาและบันทึกความถูกต้องของงานตามสถานการณ์", "Wording follows Appendix F (ภาคผนวก ฉ) of the protocol dated 30 October 2026 and information sheet Set 3 · the system times and records accuracy of the scenario tasks"))
      + `<div class="irb-sv">${shell}<div class="card irb-card" id="irbSvMain">${body}</div></div>` + (isAdmin() ? svAdmin() : "");
  }
  function curR() { const o = svStore(); return [o, o.cur[acct()] || null]; }
  function wireSurvey(h) {
    h.querySelectorAll("[data-irbdl]").forEach(b => b.onclick = () => dlDoc(b.dataset.irbdl));
    const sn = h.querySelector("#irbSignNow2"); if (sn) sn.onclick = () => check();
    const st = h.querySelector("#irbStart"); if (st) st.onclick = async () => {
      st.disabled = true; const rec = recOf();
      let arm = rec && rec.arm, src = rec && rec.arm_src;
      if (!arm) { const x = await assignArm(); arm = x.arm; src = x.src; if (rec) { rec.arm = arm; rec.arm_src = src; setRec(rec); } }
      const o = svStore(); o.cur[acct()] = newResp(arm, src || "local"); svSave(o); for (const k in T0) delete T0[k]; render();
    };
    const [o, r] = curR(); if (!r) return;
    const save1 = () => { o.cur[acct()] = r; svSave(o); };
    h.querySelectorAll("[data-svgo]").forEach(b => b.onclick = () => {
      const dir = b.dataset.svgo === "prev" ? -1 : 1;
      if (r.page === 3 && dir < 0) { r.page = 2; r.ti = 4; } else r.page = clamp(r.page + dir, 0, 7);
      if (r.page === 0) { delete o.cur[acct()]; svSave(o); } else save1(); render(); window.scrollTo(0, 0); });
    h.querySelectorAll("[data-svti]").forEach(b => b.onclick = () => { const ti = +b.dataset.svti;
      if (ti < 0) r.page = 1; else if (ti > 4) r.page = 3; else r.ti = ti; save1(); render(); });
    h.querySelectorAll("input[data-task]").forEach(i => i.onchange = () => {
      const d = demo(), T = tasks(r, d), t = T.find(x => x.k === i.dataset.task); let v = i.value; if (t.k === "tier") v = +v;
      if (r.task[t.k] === undefined) r.task_ms[t.k] = Math.round(performance.now() - (T0[r.ti] || performance.now()));
      r.task[t.k] = v; r.task_ok[t.k] = String(v) === String(t.ok) ? 1 : 0; save1();
      const nx = h.querySelector("#irbNext"); if (nx) nx.disabled = false; });
    h.querySelectorAll("input[data-p1]").forEach(i => i.onchange = () => { r.p1[i.dataset.p1] = +i.value; save1(); if (i.dataset.p1 === "role") render(); });
    const ro = h.querySelector("#irbRoleOther"); if (ro) ro.onchange = () => { r.p1.roleOther = ro.value.trim().slice(0, 120); save1(); };
    h.querySelectorAll("input[data-sc]").forEach(i => i.onchange = () => { r[i.dataset.sc][+i.dataset.i] = +i.value; save1(); });
    h.querySelectorAll("[data-wtpch]").forEach(c => { const pick = () => { r.wtp["s" + ((r.wtp.set || 0) + 1)] = c.dataset.wtpch; save1(); render(); };
      c.onclick = pick; c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }; });
    h.querySelectorAll("[data-wtpset]").forEach(b => b.onclick = () => { r.wtp.set = clamp(+b.dataset.wtpset, 0, 2); save1(); render(); });
    h.querySelectorAll("input[data-wtp]").forEach(i => i.onchange = () => { r.wtp[i.dataset.wtp] = +i.value; save1(); if (i.dataset.wtp === "newIss" || i.dataset.wtp === "recontact") render(); });
    const hr = h.querySelector("#irbWhrs"); if (hr) hr.onchange = () => { if (hr.value === "") { r.wtp.hrs = null; } else { hr.value = clamp(Math.round(+hr.value || 0), 0, 1000); r.wtp.hrs = +hr.value; } save1(); };
    const nt = h.querySelector("#irbWnewTxt"); if (nt) nt.oninput = () => { r.wtp.newIssTxt = nt.value.slice(0, 500); nt.nextElementSibling.textContent = nt.value.length + " / 500"; save1(); };
    const ct = h.querySelector("#irbContact"); if (ct) ct.oninput = () => { r._contact = ct.value.slice(0, 120); save1(); };
    h.querySelectorAll("input[data-comp]").forEach(i => i.onchange = () => { r.comp[+i.dataset.comp] = +i.value; save1(); });
    h.querySelectorAll("textarea[data-open]").forEach(t => t.oninput = () => { r.open[+t.dataset.open] = t.value.slice(0, 1000); t.nextElementSibling.textContent = fmtN(t.value.length) + " / 1,000"; save1(); });
    const sb = h.querySelector("#irbSubmit"); if (sb) sb.onclick = () => submitSurvey(o, r);
  }
  function submitSurvey(o, r) {
    const d = demo(), a = acct();
    const resp = JSON.parse(JSON.stringify(r)); delete resp._contact; delete resp.page; delete resp.ti; delete resp.wtp.set;
    resp.submitted = new Date().toISOString(); resp.day = resp.submitted.slice(0, 10);
    resp.demo = d ? { tier: d.tier, quad: d.quad, reg: d.reg, fy: d.fy } : null;
    resp.task_total_ms = ["tier", "quad", "reg", "q4", "q5"].every(k => r.task_ms[k] !== undefined) ? ["tier", "quad", "reg", "q4", "q5"].reduce((s, k) => s + r.task_ms[k], 0) : null;
    resp.sus_score = susScore(r.sus);
    resp.comp_ok = Object.fromEntries(M_COMP.map((c, i) => [i + 1, r.comp[i + 1] === undefined ? null : r.comp[i + 1] === c[2] ? 1 : 0]));
    o.resp.push(resp); o.done[a] = resp.id; delete o.cur[a]; svSave(o);
    /* ช่องทางติดต่อ: เก็บแยกจากคำตอบ (ข้อ 11.2) — ในเครื่อง: คีย์ต่างหาก · เซิร์ฟเวอร์: ส่งเป็นรายการ feedback แยก ไม่มีรหัสคำตอบ */
    if (r.wtp.recontact === 1 && r._contact) {
      const cs = LSget("ois_irb_contact_v1", []) || []; cs.push({ channel: r._contact, at: resp.day }); LSset("ois_irb_contact_v1", cs);
      submit("feedback", { type: "contact", step: "5.3", channel: r._contact });
    }
    _svSrv = window.OIS_API && typeof window.OIS_API.submit === "function" ? "pending" : null;
    if (_svSrv) submit("survey", resp, null).then(ok => { _svSrv = ok ? "ok" : "fail"; if (ok) { const o2 = svStore(), x = o2.resp.find(y => y.id === resp.id); if (x) { x.srv = true; svSave(o2); } } if (S.view === "survey") render(); });
    try { toast(L("ส่งคำตอบแล้ว", "Answers submitted")); } catch (e) { }
    render(); window.scrollTo(0, 0);
  }

  /* ============================================================================
     สถิติสำหรับผู้ดูแล — ตามแผนการวิเคราะห์ของโครงร่าง 3.2.4.2 (จ) 1)–7) และเกณฑ์ตารางที่ 3.10
     ข้อที่เว้นตอบ = ข้อมูลขาดหาย ไม่แทนค่า · คะแนนรายองค์ประกอบคำนวณเมื่อตอบอย่างน้อย 3 ข้อในองค์ประกอบนั้น
     ============================================================================ */
  const num = v => typeof v === "number" && isFinite(v);
  const mean = a => { const x = a.filter(num); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : NaN; };
  const sd = a => { const x = a.filter(num); if (x.length < 2) return NaN; const m = mean(x); return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1)); };
  const median = a => { const b = a.filter(num).sort((x, y) => x - y); if (!b.length) return NaN; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  /** ค่าวิกฤต t (สองทาง 95%) ตาม df */
  const T975 = [NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
  const tcrit = df => df < 1 ? NaN : df <= 30 ? T975[df] : df <= 40 ? 2.021 + (40 - df) * 0.0021 : df <= 60 ? 2.000 + (60 - df) * 0.00105 : df <= 120 ? 1.980 + (120 - df) * 0.00033 : 1.96;
  const ci95 = a => { const x = a.filter(num); if (x.length < 2) return [NaN, NaN]; const m = mean(x), h = tcrit(x.length - 1) * sd(x) / Math.sqrt(x.length); return [m - h, m + h]; };
  /** การแปลผลค่าเฉลี่ย 5 ระดับ (Best & Kahn, 1993) — โครงร่างตารางที่ 3.10 ใช้ 3.51–4.50 = “มาก” */
  const BAND = [[4.51, "มากที่สุด", "Very high"], [3.51, "มาก", "High"], [2.51, "ปานกลาง", "Moderate"], [1.51, "น้อย", "Low"], [1, "น้อยที่สุด", "Very low"]];
  const band = m => { if (!num(m)) return "—"; const r = Math.round(m * 100) / 100, b = BAND.find(([lo]) => r >= lo) || BAND[BAND.length - 1]; return L(b[1], b[2]); };
  function alpha(rows) {
    const R = rows.filter(r => r.every(num)); if (R.length < 2) return NaN; const k = R[0].length; if (k < 2) return NaN;
    const vr = a => { const s = sd(a); return s * s; };
    const si = [...Array(k)].reduce((s, _, i) => s + vr(R.map(r => r[i])), 0), tot = vr(R.map(r => r.reduce((s, v) => s + v, 0)));
    return tot > 0 ? k / (k - 1) * (1 - si / tot) : NaN;
  }
  /** ช่วงความเชื่อมั่น bootstrap 95% (percentile · 2,000 รอบ · seed คงที่ เพื่อให้ผลซ้ำได้) */
  function alphaBoot(rows, B) {
    const R = rows.filter(r => r.every(num)); if (R.length < 3) return [NaN, NaN];
    let s = 20261030; const u = () => (s = (s * 48271) % 2147483647) / 2147483647;
    const out = []; for (let b = 0; b < (B || 2000); b++) { const x = R.map(() => R[Math.floor(u() * R.length)]); const a = alpha(x); if (num(a)) out.push(a); }
    out.sort((x, y) => x - y); if (out.length < 20) return [NaN, NaN];
    return [out[Math.floor(.025 * out.length)], out[Math.min(out.length - 1, Math.floor(.975 * out.length))]];
  }
  const pearson = (x, y) => { const n = x.length; if (n < 3) return NaN; const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0;
    for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : NaN; };
  /** สหสัมพันธ์ระหว่างข้อกับคะแนนรวมที่ไม่รวมข้อนั้น (corrected item–total) */
  const citc = (rows, i) => { const R = rows.filter(r => r.every(num)); return pearson(R.map(r => r[i]), R.map(r => r.reduce((s, v, j) => s + (j === i ? 0 : v), 0))); };
  const ranks = a => { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = Array(a.length); let i = 0;
    while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rk; i = j + 1; } return r; };
  const spearman = (x, y) => { const p = x.map((v, i) => [v, y[i]]).filter(([a, b]) => num(a) && num(b)); if (p.length < 3) return { r: NaN, n: p.length };
    return { r: pearson(ranks(p.map(q => q[0])), ranks(p.map(q => q[1]))), n: p.length }; };
  const lgam = n => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
  /** Fisher's exact test 2×2 (สองทาง) */
  function fisher(a, b, c, d) {
    const n = a + b + c + d, r1 = a + b, c1 = a + c, p = x => Math.exp(lgam(r1) + lgam(n - r1) + lgam(c1) + lgam(n - c1) - lgam(n) - lgam(x) - lgam(r1 - x) - lgam(c1 - x) - lgam(n - r1 - c1 + x));
    const p0 = p(a); let t = 0; for (let x = Math.max(0, r1 + c1 - n); x <= Math.min(r1, c1); x++) { const q = p(x); if (q <= p0 * (1 + 1e-7)) t += q; } return Math.min(1, t);
  }
  const erf = x => { const t = 1 / (1 + .3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  /** Mann–Whitney U (สองทาง · ประมาณด้วยการแจกแจงปกติ แก้ค่าซ้ำและความต่อเนื่อง) */
  function mannWhitney(x, y) {
    x = x.filter(num); y = y.filter(num); const n1 = x.length, n2 = y.length; if (!n1 || !n2) return { U: NaN, p: NaN };
    const all = x.concat(y), rk = ranks(all), R1 = rk.slice(0, n1).reduce((s, v) => s + v, 0), U1 = R1 - n1 * (n1 + 1) / 2, U = Math.min(U1, n1 * n2 - U1);
    const N = n1 + n2, cnt = {}; all.forEach(v => cnt[v] = (cnt[v] || 0) + 1); const tie = Object.values(cnt).reduce((s, t) => s + (t ** 3 - t), 0);
    const sig = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tie / (N * (N - 1)))); if (!sig) return { U, p: 1 };
    const z = (Math.abs(U1 - n1 * n2 / 2) - .5) / sig; return { U, p: Math.min(1, 2 * (1 - .5 * (1 + erf(Math.max(0, z) / Math.SQRT2)))) };
  }
  const f2 = v => fmt(v, 2), f1 = v => fmt(v, 1), pc = v => num(v) ? fmt(v, 0) + "%" : "—";
  const pv = p => !num(p) ? "—" : p < .001 ? "< .001" : fmt(p, 3);
  /** คะแนนองค์ประกอบของผู้ตอบหนึ่งคน — ตอบ ≥ 3 ข้อในองค์ประกอบ มิฉะนั้นขาดหาย */
  const consScore = (t, a, b) => { const x = []; for (let i = a; i <= b; i++) if (num(t[i])) x.push(t[i]); return x.length >= 3 ? mean(x) : NaN; };

  let _admR = null, _admMsg = "";
  function admRows() { return (_admR || svStore().resp).filter(r => r && r.sv === SV_VER); }
  function svFromServer(res) {
    const arr = Array.isArray(res) ? res : res && (res.items || res.rows || res.responses || res.data);
    if (!Array.isArray(arr)) return null;
    return arr.map(x => { let p = x && x.payload !== undefined ? x.payload : x; if (typeof p === "string") { try { p = JSON.parse(p); } catch (e) { p = null; } } return p; })
      .filter(p => p && typeof p === "object" && p.sv === SV_VER);
  }
  function svAdmin() {
    const R = admRows(), n = R.length;
    const crit = [];
    const desc = (vals) => { const x = vals.filter(num), c = ci95(x); return { n: x.length, m: mean(x), s: sd(x), mn: x.length ? Math.min(...x) : NaN, mx: x.length ? Math.max(...x) : NaN, lo: c[0], hi: c[1] }; };
    const dCells = o => `<td class="n">${o.n}</td><td class="n"><b>${f2(o.m)}</b></td><td class="n">${f2(o.s)}</td><td class="n">${fmt(o.mn, 0)}</td><td class="n">${fmt(o.mx, 0)}</td><td class="n">${f2(o.lo)}–${f2(o.hi)}</td>`;
    const freq = a => [1, 2, 3, 4, 5].map(v => a.filter(x => x === v).length);
    const TF = TAM_FLAT();
    /* 1) + 2) TAM รายข้อและรายองค์ประกอบ · α · bootstrap CI · corrected item–total r */
    const consRows = TAM_GRP.map(([k, a, b]) => {
      const rows = R.map(x => { const t = x.tam || {}; const v = []; for (let i = a; i <= b; i++) v.push(num(t[i]) ? t[i] : NaN); return v; });
      const al = alpha(rows), bt = alphaBoot(rows), nc = rows.filter(r => r.every(num)).length;
      const cs = desc(R.map(x => consScore(x.tam || {}, a, b)));
      crit.push([L(`ความเชื่อมั่น ${k}: α ≥ .70`, `Reliability ${k}: α ≥ .70`), num(al) ? f2(al) : "—", num(al) ? al >= .70 : null]);
      crit.push([L(`ระดับการยอมรับ ${k}: ค่าเฉลี่ย ≥ 3.51`, `Acceptance ${k}: mean ≥ 3.51`), f2(cs.m), num(cs.m) ? Math.round(cs.m * 100) / 100 >= 3.51 : null]);
      const items = []; for (let i = a; i <= b; i++) {
        const v = R.map(x => (x.tam || {})[i]).filter(num), f = freq(v), o = desc(v);
        items.push(`<tr><td class="code">${E(TF[i - 1][0])}</td><td class="irb-dtq" title="${E(TF[i - 1][1])}">${E(TF[i - 1][1])}</td>${dCells(o)}${f.map(c => `<td class="n">${c}</td>`).join("")}<td class="n">${f2(citc(rows, i - a))}</td><td>${band(o.m)}</td></tr>`);
      }
      return `<tr class="irb-dtg" data-cons="${k}"><td colspan="2"><b>${E(TAM()[TAM_GRP.findIndex(g => g[0] === k)][0])}</b> · α = <b class="irb-alpha" data-alpha="${k}">${num(al) ? f2(al) : "—"}</b> ${num(bt[0]) ? `(95% CI ${f2(bt[0])}–${f2(bt[1])})` : ""} · n<sub>α</sub> = ${nc}</td>${dCells(cs)}<td colspan="6"></td><td><b>${band(cs.m)}</b></td></tr>` + items.join("");
    }).join("");
    const tamAll = desc(R.map(x => { const ok = TAM_GRP.every(([, a, b]) => num(consScore(x.tam || {}, a, b))); return ok ? mean(Object.values(x.tam || {}).filter(num)) : NaN; }));
    crit.push([L("ระดับการยอมรับรวม: ค่าเฉลี่ยรวม 17 ข้อ ≥ 4.00", "Overall acceptance: 17-item mean ≥ 4.00"), f2(tamAll.m), num(tamAll.m) ? tamAll.m >= 4.00 : null]);
    const dHead = `<th class="n">n</th><th class="n">x̄</th><th class="n">SD</th><th class="n">${L("ต่ำสุด", "Min")}</th><th class="n">${L("สูงสุด", "Max")}</th><th class="n">95% CI</th>`;
    /* 3) SUS */
    const sus = desc(R.map(x => x.sus_score ?? susScore(x.sus || {})));
    crit.push([L("ความสามารถในการใช้งาน: ค่าเฉลี่ย SUS ≥ 68", "Usability: mean SUS ≥ 68"), f1(sus.m), num(sus.m) ? sus.m >= 68 : null]);
    const susItems = SUS().map((t, i) => { const v = R.map(x => (x.sus || {})[i + 1]).filter(num), f = freq(v), o = desc(v);
      return `<tr><td class="code">${i + 1}</td><td class="irb-dtq" title="${E(t)}">${E(t)}</td>${dCells(o)}${f.map(c => `<td class="n">${c}</td>`).join("")}</tr>`; }).join("");
    /* 4) งานตามสถานการณ์ แยกกลุ่ม */
    const TK = ["tier", "quad", "reg", "q4", "q5"], arms = ["grid", "table"].map(k => ({ k, xs: R.filter(x => x.arm === k) }));
    const armOk = arms.every(a => a.xs.length >= 5);
    const taskRow = (k, i) => { const cells = arms.map(a => { const v = a.xs.filter(x => x.task_ok && x.task_ok[k] !== undefined); const c = v.filter(x => x.task_ok[k] === 1).length;
        return { n: v.length, c, p: v.length ? 100 * c / v.length : NaN, med: median(a.xs.map(x => x.task_ms && x.task_ms[k])), ms: a.xs.map(x => x.task_ms && x.task_ms[k]) }; });
      const fp = fisher(cells[0].c, cells[0].n - cells[0].c, cells[1].c, cells[1].n - cells[1].c), mw = mannWhitney(cells[0].ms, cells[1].ms);
      return `<tr><td>${L("งาน", "Task")} ${i + 1}</td>${cells.map(c => armOk ? `<td class="n">${pc(c.p)} <span class="irb-mut">(${c.c}/${c.n})</span></td><td class="n">${f1(c.med / 1000)}</td>` : `<td class="n" colspan="2"><span class="pill mute">n < 5</span></td>`).join("")}
        <td class="n">${armOk ? pv(fp) : "—"}</td><td class="n">${armOk ? pv(mw.p) : "—"}</td></tr>`; };
    /* 5) ความเข้าใจ — ร้อยละตอบถูกรายข้อ เทียบเกณฑ์ ≥ 80% */
    const compRows = M_COMP.map((c, i) => { const v = R.filter(x => x.comp && num(x.comp[i + 1])); const ok = v.filter(x => x.comp[i + 1] === c[2]).length, p = v.length ? 100 * ok / v.length : NaN;
      crit.push([L(`ความเข้าใจข้อ ${i + 1}: ตอบถูก ≥ 80%`, `Comprehension item ${i + 1}: ≥ 80% correct`), pc(p), num(p) ? p >= 80 : null]);
      return `<tr><td>${i + 1}. ${E(COMP()[i][0])}</td><td class="n">${v.length}</td><td class="n"><b>${pc(p)}</b></td><td>${num(p) ? (p >= 80 ? `<span class="pill ok">${L("ผ่าน", "Pass")}</span>` : `<span class="pill warn">${L("ต่ำกว่าเกณฑ์", "Below")}</span>`) : "—"}</td></tr>`; }).join("");
    crit.push([L("ความปลอดภัยในการอ่านผล: ไม่มีประเด็นระดับสูงค้างหลังการชี้แจง (ภาคผนวก ช)", "Reading safety: no high-severity issue left after the briefing (Appendix G)"), L("บันทึกนอกระบบ", "Recorded outside the system"), null]);
    /* 6) Spearman ระหว่างองค์ประกอบ */
    const CS = Object.fromEntries(TAM_GRP.map(([k, a, b]) => [k, R.map(x => consScore(x.tam || {}, a, b))]));
    const sp = TAM_GRP.map(([k]) => `<tr><th>${k}</th>${TAM_GRP.map(([k2]) => { if (k === k2) return `<td class="n">1</td>`; const s = spearman(CS[k], CS[k2]); return `<td class="n">${f2(s.r)} <span class="irb-mut">n=${s.n}</span></td>`; }).join("")}</tr>`).join("");
    /* 7) ส่วน 4ข — ร้อยละของแต่ละทางเลือก */
    const W = R.map(x => x.wtp || {});
    const pcOf = (xs, f) => xs.length ? 100 * xs.filter(f).length / xs.length : NaN;
    const setRows = M_WTP_SETS.map((pr, i) => { const k = "s" + (i + 1), xs = W.filter(w => w[k]);
      return `<tr><td>${L(`ชุดที่ ${i + 1}`, `Set ${i + 1}`)} <span class="irb-mut">(${pr.map(fmtN).join(" / ")})</span></td><td class="n">${xs.length}</td>${["a", "b", "c", "d"].map(o => `<td class="n">${pc(pcOf(xs, w => w[k] === o))}</td>`).join("")}</tr>`; }).join("");
    const dist = (key, labs) => { const xs = W.filter(w => num(w[key])); return `<div class="irb-dist"><span class="irb-dl">${L("n", "n")} = ${xs.length}</span> ${labs.map((l, j) => `<span class="chip">${E(l)} <b>${pc(pcOf(xs, w => w[key] === j + 1))}</b></span>`).join(" ")}</div>`; };
    const hrs = W.map(w => w.hrs).filter(num);
    const okChip = v => v === null ? `<span class="pill mute">${L("ประเมินไม่ได้/นอกระบบ", "n/a / outside")}</span>` : v ? `<span class="pill ok">${L("ผ่าน", "Pass")}</span>` : `<span class="pill warn">${L("ไม่ผ่าน", "Not met")}</span>`;
    const small = n < 5 ? `<div class="irb-warnbox">${L("ผู้ตอบน้อยกว่า 5 คน — ไม่รายงานผลกลุ่มย่อยต่อภายนอก (เอกสารชี้แจงข้อ 9)", "Fewer than 5 respondents — subgroups are not reported outside (information sheet item 9)")}</div>` : "";
    return `<div class="card irb-admin" id="irbSvAdmin" style="margin-top:16px"><h3>${L("ผลรวมสำหรับผู้วิจัย", "Results for the researcher")} (n = <span id="irbAdmN">${n}</span>) <span class="pill mute">${L("ผู้ดูแล", "Administrator")}</span>
        <span class="pill ${_admR ? "blue" : "mute"}">${_admR ? L("ข้อมูลจากเซิร์ฟเวอร์", "Server data") : L("ข้อมูลในเครื่องนี้", "Data on this device")}</span></h3>
      <p class="desc">${L("แผนการวิเคราะห์ตามโครงร่างหัวข้อ 3.2.4.2 (จ) และเกณฑ์ตารางที่ 3.10 · ข้อที่เว้นตอบถือเป็นข้อมูลขาดหาย ไม่แทนค่า · คะแนนรายองค์ประกอบคำนวณเมื่อตอบอย่างน้อย 3 ข้อในองค์ประกอบ · การเปรียบเทียบระหว่างกลุ่มเป็นข้อมูลเชิงสำรวจ (จัดกลุ่มแบบสลับ ไม่ใช่การสุ่ม)",
        "Analysis plan per protocol section 3.2.4.2 (e) and criteria in Table 3.10 · skipped items are missing, not imputed · a construct score is computed when at least 3 items of the construct are answered · between-group comparisons are exploratory (alternating assignment, not randomised)")}</p>
      ${small}
      <div class="pl-tools" style="margin-bottom:10px">${window.OIS_API && typeof window.OIS_API.admin === "function" ? `<button class="btn s" id="irbAdmLoad">${L("โหลดคำตอบทั้งหมดจากเซิร์ฟเวอร์", "Load all answers from the server")}</button>${_admR ? `<button class="btn g" id="irbAdmLocal">${L("กลับไปใช้ข้อมูลในเครื่อง", "Back to data on this device")}</button>` : ""}<span class="as-sm">${E(_admMsg)}</span>` : ""}
        <button class="btn g" id="irbSvCsv">${L("ส่งออก CSV", "Export CSV")}</button><button class="btn g" id="irbSvJson">${L("ส่งออก JSON", "Export JSON")}</button><button class="btn g" id="irbSvClear">${L("ล้างคำตอบในเครื่องนี้", "Clear answers on this device")}</button></div>
      <div class="pl-tools" style="margin-bottom:10px"><label class="pl-lab" style="margin:0">${L("บริษัทสาธิตของงานตามสถานการณ์ (ไม่แสดงชื่อแก่ผู้ตอบ)", "Demonstration company for the scenario tasks (not shown to respondents)")}
        <select class="sel" id="irbDemoSel">${(typeof COMPS === "object" ? COMPS : []).slice().sort((a, b) => a.t.localeCompare(b.t)).map(c => `<option value="${E(c.t)}"${c.t === demoT() ? " selected" : ""}>${E(c.t)}</option>`).join("")}</select></label></div>
      <h4 class="irb-h4">${L("เกณฑ์ตัดสินการยอมรับ (ตารางที่ 3.10)", "Acceptance criteria (Table 3.10)")}</h4>
      <div class="tw"><table class="as-dt irb-dt" id="irbCrit"><thead><tr><th>${L("ด้าน / เกณฑ์ของโครงการ", "Aspect / project criterion")}</th><th class="n">${L("ผล", "Result")}</th><th>${L("สถานะ", "Status")}</th></tr></thead><tbody>
        ${crit.map(([a, b, c]) => `<tr><td>${E(a)}</td><td class="n">${E(b)}</td><td>${okChip(c)}</td></tr>`).join("")}</tbody></table></div>
      <h4 class="irb-h4">1)–2) ${L("แบบสอบถามการยอมรับเทคโนโลยี: สถิติเชิงพรรณนา ความเชื่อมั่น (Cronbach's α) และสหสัมพันธ์ข้อ–รวม", "Technology acceptance questionnaire: descriptives, reliability (Cronbach's α) and item–total correlations")}</h4>
      <p class="desc">${L("แปลผลค่าเฉลี่ยตาม Best & Kahn (1993): 4.51–5.00 มากที่สุด · 3.51–4.50 มาก · 2.51–3.50 ปานกลาง · 1.51–2.50 น้อย · 1.00–1.50 น้อยที่สุด · α คำนวณจากผู้ตอบครบทุกข้อขององค์ประกอบ ช่วงความเชื่อมั่นแบบ bootstrap 2,000 รอบ · r<sub>it</sub> = สหสัมพันธ์ระหว่างข้อกับคะแนนรวมที่ไม่รวมข้อนั้น (Nunnally & Bernstein, 1994)",
        "Means interpreted per Best & Kahn (1993): 4.51–5.00 very high · 3.51–4.50 high · 2.51–3.50 moderate · 1.51–2.50 low · 1.00–1.50 very low · α from respondents with all items of the construct, bootstrap CI with 2,000 resamples · r<sub>it</sub> = corrected item–total correlation (Nunnally & Bernstein, 1994)")}</p>
      <div class="tw as-dtw"><table class="as-dt irb-dt" id="irbTamDesc"><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("ข้อคำถาม", "Item")}</th>${dHead}<th class="n">1</th><th class="n">2</th><th class="n">3</th><th class="n">4</th><th class="n">5</th><th class="n">r<sub>it</sub></th><th>${L("แปลผล", "Level")}</th></tr></thead>
        <tbody>${consRows}<tr class="irb-dtg"><td colspan="2"><b>${L("รวม 17 ข้อ", "All 17 items")}</b></td>${dCells(tamAll)}<td colspan="6"></td><td><b>${band(tamAll.m)}</b></td></tr></tbody></table></div>
      <h4 class="irb-h4">3) SUS (Brooke, 1996) ${L("เทียบค่ากลางอ้างอิง 68 (Lewis, 2018)", "against the reference midpoint 68 (Lewis, 2018)")}</h4>
      <div class="grid g4 tight"><div class="stat"><div class="k">${L("SUS เฉลี่ย (0–100)", "Mean SUS (0–100)")}</div><div class="v" id="irbSusMean">${f1(sus.m)}</div><div class="u">SD ${f1(sus.s)} · n = ${sus.n} · 95% CI ${f1(sus.lo)}–${f1(sus.hi)}</div></div>
        <div class="stat"><div class="k">${L("เทียบ 68", "vs 68")}</div><div class="v">${!num(sus.m) ? "—" : sus.lo > 68 ? L("สูงกว่า", "Above") : sus.hi < 68 ? L("ต่ำกว่า", "Below") : L("ไม่ต่างชัด", "Overlaps")}</div><div class="u">${L("จากช่วงความเชื่อมั่น 95%", "from the 95% CI")}</div></div></div>
      <details class="irb-det"><summary>${L("SUS รายข้อ (ข้อคู่เป็นข้อความเชิงลบ)", "SUS items (even items are negatively worded)")}</summary><div class="tw as-dtw"><table class="as-dt irb-dt"><thead><tr><th>${L("ข้อ", "Item")}</th><th>${L("ข้อคำถาม", "Statement")}</th>${dHead}<th class="n">1</th><th class="n">2</th><th class="n">3</th><th class="n">4</th><th class="n">5</th></tr></thead><tbody>${susItems}</tbody></table></div></details>
      <h4 class="irb-h4">4) ${L("งานตามสถานการณ์: ร้อยละความถูกต้องและมัธยฐานเวลา แยกตามกลุ่มการแสดงหลักฐาน", "Scenario tasks: accuracy and median time by display group")}</h4>
      <p class="desc">${L("แสดงตัวเลขเมื่อแต่ละกลุ่มมี n ≥ 5 · เวลา = มัธยฐาน (วินาที) · Fisher's exact (ความถูกต้อง) และ Mann–Whitney (เวลา ประมาณด้วยการแจกแจงปกติ) เป็นการเปรียบเทียบเชิงสำรวจ", "Shown when each group has n ≥ 5 · time = median (seconds) · Fisher's exact (accuracy) and Mann–Whitney (time, normal approximation) are exploratory")}</p>
      <div class="tw"><table class="as-dt irb-dt" id="irbAB"><thead><tr><th></th><th class="n" colspan="2">${armName("grid")} (n = ${arms[0].xs.length})</th><th class="n" colspan="2">${armName("table")} (n = ${arms[1].xs.length})</th><th class="n">Fisher p</th><th class="n">Mann–Whitney p</th></tr>
        <tr><th></th><th class="n">${L("ถูก", "Correct")}</th><th class="n">${L("เวลา (วินาที)", "Time (s)")}</th><th class="n">${L("ถูก", "Correct")}</th><th class="n">${L("เวลา (วินาที)", "Time (s)")}</th><th></th><th></th></tr></thead><tbody>${TK.map(taskRow).join("")}</tbody></table></div>
      <h4 class="irb-h4">5) ${L("ความเข้าใจ: ร้อยละตอบถูกรายข้อ (เกณฑ์ ≥ 80%)", "Comprehension: % correct per item (criterion ≥ 80%)")}</h4>
      <div class="tw"><table class="as-dt irb-dt" id="irbComp"><thead><tr><th>${L("ข้อ", "Item")}</th><th class="n">n</th><th class="n">${L("ตอบถูก", "Correct")}</th><th>${L("เกณฑ์", "Criterion")}</th></tr></thead><tbody>${compRows}</tbody></table></div>
      <p class="desc">${L("การทบทวนการอ่านผลก่อนและหลังการชี้แจง (McNemar แบบ exact) ใช้ข้อมูลภาคผนวก ช ซึ่งผู้วิจัยบันทึกนอกแบบสอบถามนี้", "The before/after reading review (exact McNemar) uses Appendix G data recorded by the researcher outside this questionnaire")}</p>
      <h4 class="irb-h4">6) ${L("สหสัมพันธ์ของ Spearman ระหว่างองค์ประกอบ (เชิงสำรวจ)", "Spearman correlations between constructs (exploratory)")}</h4>
      <div class="tw"><table class="as-dt irb-dt" id="irbSpear"><thead><tr><th></th>${TAM_GRP.map(([k]) => `<th class="n">${k}</th>`).join("")}</tr></thead><tbody>${sp}</tbody></table></div>
      <p class="desc">${L("การวิเคราะห์ความไวโดยใช้ผู้ตอบ 1 คนต่อองค์กรต้องใช้รหัสองค์กรจากตารางจับคู่ของผู้วิจัย (ไม่เก็บในแบบสอบถาม)", "The sensitivity analysis with one respondent per organisation needs organisation codes from the researcher's code-link file (not collected in the questionnaire)")}</p>
      <h4 class="irb-h4">7) ${L("ส่วน 4ข คุณค่าเชิงพาณิชย์: ร้อยละของแต่ละทางเลือก", "Part 4B commercial value: % per option")}</h4>
      <p class="desc">${L("ข้อมูลความสนใจ ไม่ใช่หลักฐานราคา และแยกจากหลักฐานราคาของขั้นตอนที่ 5.3", "Information on interest, not price evidence, and kept separate from the step 5.3 price evidence")}</p>
      <div class="tw"><table class="as-dt irb-dt" id="irbWtp"><thead><tr><th>${L("ชุดทางเลือก (ก / ข / ค บาท)", "Choice set (A / B / C THB)")}</th><th class="n">n</th><th class="n">${L("(ก) รายโครงการ", "(A) Per project")}</th><th class="n">(${L("ข", "B")}) Pro</th><th class="n">(${L("ค", "C")}) Pro Max</th><th class="n">(${L("ง", "D")}) ${L("ไม่ซื้อ", "Do not buy")}</th></tr></thead><tbody>${setRows}</tbody></table></div>
      <div class="irb-dist"><span class="irb-dl">1. ${L("บทบาทในการซื้อ", "Buying role")}</span></div>${dist("role", WTP_ROLE())}
      <div class="irb-dist"><span class="irb-dl">2. ${L("สนใจทดลองใช้ 3 เดือน", "Interested in a 3-month trial")}</span></div>${dist("trial", YN())}
      <div class="irb-dist"><span class="irb-dl">3. ${L("ชั่วโมงต่อปี", "Hours per year")}: n = ${hrs.length} · ${L("มัธยฐาน", "median")} ${f1(median(hrs))}</span></div>
      <div class="irb-dist"><span class="irb-dl">4. ${L("พบประเด็นใหม่", "Found new issues")}</span></div>${dist("newIss", YN())}
      <div class="irb-dist"><span class="irb-dl">5. ${L("แหล่งงบประมาณ", "Budget source")}</span></div>${dist("pay", WTP_PAY())}
      <div class="irb-dist"><span class="irb-dl">6. ${L("ประสงค์ให้ติดต่อกลับ", "Would like to be contacted")}</span></div>${dist("recontact", RECON())}
      <p class="desc">${L("คำตอบปลายเปิดส่งออกใน CSV เพื่อจัดเข้าหมวดที่กำหนดไว้ก่อน (ข้อมูล ฟีเจอร์ การตีความ กระบวนงาน การกำกับดูแล) โดยไม่ยกคำพูดรายบุคคล", "Open-ended answers are exported in the CSV for coding into the predefined categories (data, feature, interpretation, process, governance) without quoting individuals")}</p></div>`;
  }
  const SV_COLS = ["id", "sv", "consent_ver", "day", "arm", "arm_src", "demo_tier", "demo_quad", "demo_reg", "demo_fy", "p1_role", "p1_role_other", "p1_exp",
    "task_tier", "task_quad", "task_reg", "q4", "q5", "tier_ok", "quad_ok", "reg_ok", "q4_ok", "q5_ok", "t1_ms", "t2_ms", "t3_ms", "t4_ms", "t5_ms", "task_total_ms", "q4_order", "q5_order",
    ...Array.from({ length: 10 }, (_, i) => "sus" + (i + 1)), "sus_score", ...Array.from({ length: 17 }, (_, i) => "tam" + (i + 1)),
    "wtp_s1", "wtp_s2", "wtp_s3", "wtp_role", "wtp_trial", "wtp_hrs", "wtp_newiss", "wtp_newiss_txt", "wtp_pay_source", "wtp_recontact",
    ...Array.from({ length: 5 }, (_, i) => "comp" + (i + 1)), ...Array.from({ length: 5 }, (_, i) => "comp" + (i + 1) + "_ok"), ...Array.from({ length: 5 }, (_, i) => "open" + (i + 1))];
  function svCsvRows(R) {
    const TK = ["tier", "quad", "reg", "q4", "q5"];
    return R.map(r => { const t = r.task || {}, ok = r.task_ok || {}, ms = r.task_ms || {}, w = r.wtp || {}, d = r.demo || {};
      return [r.id, r.sv, r.consent_ver, r.day, r.arm, r.arm_src, d.tier, d.quad, d.reg, d.fy, (r.p1 || {}).role, (r.p1 || {}).roleOther, (r.p1 || {}).exp,
        ...TK.map(k => t[k]), ...TK.map(k => ok[k]), ...TK.map(k => ms[k]), r.task_total_ms, (r.perm || {}).q4 ? r.perm.q4.join("|") : "", (r.perm || {}).q5 ? r.perm.q5.join("|") : "",
        ...Array.from({ length: 10 }, (_, i) => (r.sus || {})[i + 1]), r.sus_score, ...Array.from({ length: 17 }, (_, i) => (r.tam || {})[i + 1]),
        w.s1, w.s2, w.s3, w.role, w.trial, w.hrs, w.newIss, w.newIssTxt, w.pay, w.recontact,
        ...Array.from({ length: 5 }, (_, i) => (r.comp || {})[i + 1]), ...Array.from({ length: 5 }, (_, i) => (r.comp_ok || {})[i + 1]), ...Array.from({ length: 5 }, (_, i) => (r.open || {})[i + 1])]; });
  }
  function wireAdmin(h) {
    const ld = h.querySelector("#irbAdmLoad"); if (ld) ld.onclick = async () => { ld.disabled = true;
      try { const arr = svFromServer(await window.OIS_API.admin({ kind: "survey" })); if (arr) { _admR = arr; _admMsg = L(`โหลดแล้ว ${arr.length} ชุด`, `Loaded ${arr.length}`); } else { _admR = null; _admMsg = L("เซิร์ฟเวอร์ไม่ส่งข้อมูลกลับ — ใช้ข้อมูลในเครื่อง", "No data from the server — using data on this device"); } }
      catch (e) { _admR = null; _admMsg = L("โหลดไม่สำเร็จ", "Loading failed"); } render(); };
    const lc = h.querySelector("#irbAdmLocal"); if (lc) lc.onclick = () => { _admR = null; _admMsg = ""; render(); };
    const cv = h.querySelector("#irbSvCsv"); if (cv) cv.onclick = () => dl(`ois_survey_step4-2_${new Date().toISOString().slice(0, 10)}.csv`, csv([SV_COLS, ...svCsvRows(admRows())]), "text/csv;charset=utf-8");
    const js = h.querySelector("#irbSvJson"); if (js) js.onclick = () => dl("ois_survey_step4-2.json", JSON.stringify(admRows(), null, 2), "application/json;charset=utf-8");
    const cl = h.querySelector("#irbSvClear"); if (cl) cl.onclick = () => (typeof confirm2 === "function" ? confirm2 : (b, f) => f())(cl, () => { const o = svStore(); o.resp = []; o.done = {}; svSave(o); _admR = null; render(); }, L("กดอีกครั้งเพื่อยืนยันการล้าง", "Click again to confirm"));
    const ds = h.querySelector("#irbDemoSel"); if (ds) ds.onchange = () => { const o = LSget(CFG_KEY, {}) || {}; o.demoT = ds.value; LSset(CFG_KEY, o); render(); };
  }

  /* ============================================================================
     ภาคผนวก ค แบบบันทึกการนำร่อง (ขั้นตอนที่ 4.1) · ภาคผนวก ง แบบบันทึกการสัมภาษณ์ผู้เชี่ยวชาญแบบมีโครงสร้าง (ขั้นตอนที่ 4.1)
     ข้อความ ตัวเลือก และลำดับตามโครงร่าง REC v10 (30 ต.ค. 2569) · เก็บในเครื่อง + ส่ง OIS_API.submit kind "feedback" (payload.type)
     ============================================================================ */
  const REC_KEY = "ois_irb_rec_v1";
  const recStore = () => { const o = LSget(REC_KEY, {}) || {}; o.pilotrec = o.pilotrec || []; o.expertrec = o.expertrec || []; o.draft = o.draft || {}; return o; };
  const recSave = o => LSset(REC_KEY, o);
  const PTYPES = ["P1", "P2", "P3", "P4"];
  const CAT = () => [["data", L("ข้อมูล", "Data")], ["feature", L("ฟีเจอร์", "Feature")], ["interp", L("การตีความ", "Interpretation")], ["process", L("กระบวนงาน", "Process")], ["gov", L("การกำกับดูแล", "Governance")]];
  const SEV = () => [["high", L("สูง", "High")], ["mid", L("กลาง", "Medium")], ["low", L("ต่ำ", "Low")]];
  const FEATS = () => [["peer", L("เทียบเคียงคู่แข่งในอุตสาหกรรม", "Industry peer benchmarking")], ["whatif", L("จำลองสถานการณ์ (what-if)", "Scenario simulation (what-if)")],
    ["evidence", L("ชุดหลักฐานส่งออก", "Exportable evidence pack")], ["draft", L("ร่างข้อความประกอบรายงาน", "Draft report text")], ["rbac", L("สิทธิ์การเข้าถึงตามบทบาท", "Role-based access rights")], ["other", L("อื่น ๆ", "Other")]];
  const C_ITEMS = () => [
    ["C1", L("ข้อมูลที่ระบบต้องใช้หาได้จากแหล่งสาธารณะภายในเวลาที่งานนี้กำหนด", "The data the system needs can be obtained from public sources within the time this work allows")],
    ["C2", L("ระบุได้ว่าผลของระบบจะใช้ในขั้นตอนใดของงาน และใครเป็นผู้ใช้ผล", "It is possible to say at which step of the work the system's results will be used and who uses them")],
    ["C3", L("การใช้ระบบในงานนี้ไม่ขัดข้อห้ามด้านการกำกับดูแล ไม่ใช้ผลเป็นเกณฑ์ตัดสิน และไม่ใช้ข้อมูลส่วนบุคคลหรือข้อมูลลูกค้า", "Using the system in this work does not breach governance restrictions, does not use the results as a decision criterion, and does not use personal or client data")],
    ["C4", L("เวลาตั้งแต่เตรียมข้อมูลจนได้รายงาน", "Time from preparing the data to obtaining the report")],
    ["C5", L("อ่านระดับ ควอดแรนต์ ช่วงความไม่แน่นอน และสถานะรายปีได้ตรงกับคำอธิบายของระบบ", "The tier, quadrant, uncertainty band and yearly status were read in line with the system's explanation")]];
  const QS = () => EN() ? ["In your view, what are the main problems in preparing information for decisions on innovation governance or board composition?",
      "Who uses this kind of information, and at which step of the decision?", "What are the main steps in collecting, checking and summarising this kind of information (at the level of work type, without internal details of the organisation)?",
      "Which information must be recorded so that it can be traced back, such as source, date and data owner?", "Which risks regarding accuracy or interpretation of the results concern you?",
      "If a system like this were adopted, in what scope should it start, and when should it be expanded?", "How should the system present its results to reduce duplicated steps and explain where the results come from?",
      "In organisations of the kind you know, who is the user, the proposer, the budget owner and the approver for buying this kind of service?",
      "Which indicators should be used to track whether the system helps the work, such as time, completeness, accuracy and continued use?",
      "What conditions on data access, accountability and post-implementation support are necessary?"]
    : ["ในมุมมองของท่าน ปัญหาหลักในการเตรียมข้อมูลเพื่อการตัดสินใจด้านการกำกับดูแลนวัตกรรมหรือองค์ประกอบคณะกรรมการคืออะไร", "ผู้ใดใช้ข้อมูลประเภทนี้ และใช้ในขั้นตอนใดของการตัดสินใจ",
      "ขั้นตอนหลักในการรวบรวม ตรวจสอบ และสรุปข้อมูลประเภทนี้มีอะไรบ้าง (ระดับประเภทงาน ไม่ต้องระบุรายละเอียดภายในขององค์กร)", "ข้อมูลใดที่ต้องบันทึกไว้เพื่อให้ตรวจย้อนกลับได้ เช่น แหล่งที่มา วันที่ และเจ้าของข้อมูล",
      "ความเสี่ยงด้านความถูกต้องหรือการตีความผลที่ท่านกังวลมีอะไรบ้าง", "หากนำระบบลักษณะนี้มาใช้ ควรเริ่มในขอบเขตใด และควรขยายเมื่อใด", "ระบบควรแสดงผลอย่างไร จึงจะลดขั้นตอนซ้ำซ้อนและอธิบายที่มาของผลได้",
      "ในองค์กรลักษณะที่ท่านคุ้นเคย ผู้ใดเป็นผู้ใช้ ผู้เสนอ เจ้าของงบประมาณ และผู้อนุมัติการซื้อบริการลักษณะนี้", "ควรใช้ตัวชี้วัดใดติดตามว่าระบบช่วยงานได้ เช่น เวลา ความครบถ้วน ความถูกต้อง และการใช้ต่อเนื่อง",
      "เงื่อนไขด้านการเข้าถึงข้อมูล ความรับผิดชอบ และการสนับสนุนหลังการใช้งานที่จำเป็นมีอะไรบ้าง"];
  const THEMES = () => [["TH01", L("ข้อมูลกระจัดกระจาย", "Scattered data")], ["TH02", L("การตรวจย้อนกลับ", "Traceability")], ["TH03", L("ผู้ใช้และผู้ซื้อหลายบทบาท", "Multiple user and buyer roles")],
    ["TH04", L("ความเสี่ยงด้านความถูกต้อง", "Accuracy risk")], ["TH05", L("การนำไปใช้แบบเป็นระยะ", "Phased adoption")], ["other", L("อื่น", "Other")]];
  const CLOSE = () => [["c1", L("ยืนยันปัญหาที่ระบบมุ่งแก้", "Confirms the problem the system addresses")], ["c2", L("ระบุผู้ใช้และจุดใช้ผลได้", "Identifies users and where results are used")],
    ["c3", L("ระบุเจ้าของงบประมาณหรือผู้อนุมัติได้", "Identifies the budget owner or approver")], ["c4", L("กระบวนงานตรวจย้อนกลับได้", "The process can be traced back")]];
  const YESNO = () => [["yes", L("ใช่", "Yes")], ["no", L("ไม่ใช่", "No")]];
  const appVer = () => (typeof window.PARAM_VERSION === "string" && window.PARAM_VERSION ? "OpenInnoScore MVP1 · " + window.PARAM_VERSION : "OpenInnoScore MVP1");
  const blankPilot = () => ({ id: uid(), type: "pilotrec", form: "C-v10-20261030", rid: "", ptype: "", pcode: "", sysver: appVer(), date: new Date().toISOString().slice(0, 10), round: "",
    c: { C1: "", C1why: "", C2: "", C3: "", C4: "", C5: "", C5which: "" }, issues: [0, 1, 2, 3, 4].map(() => ({ t: "", cat: "", sev: "", fix: "" })), feats: [], featOther: "", notUse: "", exp: "" });
  const blankExpert = () => ({ id: uid(), type: "expertrec", form: "D-v10-20261030", eid: "", ptype: "", date: new Date().toISOString().slice(0, 10), tstart: "", tend: "", consent1: false, mode: "",
    q: Array.from({ length: 10 }, () => ({ s: "", th: [], other: "" })), close: { c1: "", c2: "", c3: "", c4: "", confirmed: false } });
  const R_UI = { pilotrec: { msg: "", edit: null }, expertrec: { msg: "", edit: null } };
  const rb = (name, opts, cur, attr) => `<span class="irb-inl">${opts.map(([v, l]) => `<label class="irb-opt inl"><input type="radio" name="${name}" value="${E(v)}" ${attr} ${cur === v ? "checked" : ""}><span>${E(l)}</span></label>`).join("")}</span>`;
  const cb = (name, opts, cur, attr) => `<span class="irb-inl">${opts.map(([v, l]) => `<label class="irb-opt inl"><input type="checkbox" name="${name}" value="${E(v)}" ${attr} ${(cur || []).includes(v) ? "checked" : ""}><span>${E(l)}</span></label>`).join("")}</span>`;
  function draftOf(kind) { const o = recStore(); const d = o.draft[kind + "|" + acct()]; return d && d.type === kind ? d : (kind === "pilotrec" ? blankPilot() : blankExpert()); }
  function setDraft(kind, d) { const o = recStore(); o.draft[kind + "|" + acct()] = d; recSave(o); }

  function viewPilotRec() {
    const d = draftOf("pilotrec"), ui = R_UI.pilotrec, ci = C_ITEMS();
    const inp = (k, v, type, ph) => `<input class="inp" data-f="${k}" type="${type || "text"}" value="${E(v)}" ${ph ? `placeholder="${E(ph)}"` : ""}>`;
    const form = `<div class="card irb-card irb-form" id="irbPilotForm">
      <h3 class="irb-h3">${L("ภาคผนวก ค แบบบันทึกการนำร่อง (ขั้นตอนที่ 4.1)", "Appendix C Pilot record form (step 4.1)")}</h3>
      <p class="irb-sub">${L("ใช้ในหัวข้อ 3.2.4.1 และ ตารางที่ 3.13", "Used in section 3.2.4.1 and Table 3.13")}</p>
      <div class="irb-note"><b>${L("คำชี้แจง", "Instructions")}</b> ${L("ขั้นตอนที่ 4.1 (เตรียมการ) ผู้วิจัยกรอกตอนที่ 1–3 และขั้นตอนที่ 4.1 (ผู้เชี่ยวชาญ) ผู้เข้าร่วมกรอกตอนที่ 1–4 หลังให้ความยินยอม ห้ามระบุชื่อบุคคล ชื่อลูกค้า หรือข้อมูลลับขององค์กร ใช้เวลากรอกประมาณ 15 นาที",
        "Step 4.1 (preparation): the researcher completes parts 1–3; step 4.1 (experts): participants complete parts 1–4 after giving consent. Do not name any person or client, or include confidential organisational information. It takes about 15 minutes to complete.")}</div>
      <h4 class="irb-h4">${L("ตอนที่ 1 ข้อมูลรหัส (ผู้วิจัยกำหนด)", "Part 1 Codes (assigned by the researcher)")}</h4>
      <table class="irb-t irb-ft"><tr><th>${L("รหัสผู้บันทึก", "Recorder code")}</th><td>${inp("rid", d.rid)}</td></tr>
        <tr><th>${L("ประเภทกระบวนงาน", "Process type")}</th><td>${rb("pr_ptype", PTYPES.map(p => [p, p]), d.ptype, 'data-f="ptype"')}</td></tr>
        <tr><th>${L("รหัสกระบวนงาน", "Process code")}</th><td>${inp("pcode", d.pcode)}</td></tr>
        <tr><th>${L("รุ่นของระบบ", "System version")}</th><td>${inp("sysver", d.sysver)}</td></tr>
        <tr><th>${L("วันที่", "Date")}</th><td>${inp("date", d.date, "date")}</td></tr>
        <tr><th>${L("ครั้งที่", "Round")}</th><td>${rb("pr_round", [["1", "1"], ["2", "2"]], d.round, 'data-f="round"')}</td></tr></table>
      <h4 class="irb-h4">${L("ตอนที่ 2 ความสอดคล้องกับงาน", "Part 2 Fit with the work")}</h4>
      <table class="irb-t irb-ft"><tr><th>${L("รหัส", "Code")}</th><th>${L("ข้อความ", "Statement")}</th><th>${L("บันทึก", "Record")}</th></tr>
        <tr><td class="code">C1</td><td>${E(ci[0][1])}</td><td>${rb("pr_c1", YESNO(), d.c.C1, 'data-c="C1"')}<div>${L("เหตุผล", "Reason")} <input class="inp" data-c="C1why" value="${E(d.c.C1why)}"></div></td></tr>
        <tr><td class="code">C2</td><td>${E(ci[1][1])}</td><td>${rb("pr_c2", YESNO(), d.c.C2, 'data-c="C2"')}</td></tr>
        <tr><td class="code">C3</td><td>${E(ci[2][1])}</td><td>${rb("pr_c3", YESNO(), d.c.C3, 'data-c="C3"')}</td></tr>
        <tr><td class="code">C4</td><td>${E(ci[3][1])}</td><td><input class="inp" type="number" min="0" max="100000" step="1" data-c="C4" id="irbC4" value="${E(d.c.C4)}" style="width:110px"> ${L("นาที", "minutes")}</td></tr>
        <tr><td class="code">C5</td><td>${E(ci[4][1])}</td><td>${rb("pr_c5", [["match", L("ตรง", "Matches")], ["nomatch", L("ไม่ตรง", "Does not match")]], d.c.C5, 'data-c="C5"')}<div>${L("ข้อที่ไม่ตรง", "Items not matching")} <input class="inp" data-c="C5which" value="${E(d.c.C5which)}"></div></td></tr></table>
      <h4 class="irb-h4">${L("ตอนที่ 3 บันทึกประเด็นปัญหา (บันทึกได้หลายรายการ และใช้นับ C6)", "Part 3 Issue log (several entries allowed; used to count C6)")}</h4>
      <div class="tw"><table class="irb-t irb-ft" id="irbIssues"><tr><th>${L("ลำดับ", "No.")}</th><th>${L("ประเด็นปัญหาโดยย่อ (ไม่ระบุข้อมูลลับ)", "Brief issue (no confidential data)")}</th><th>${L("หมวด", "Category")}</th><th>${L("ความรุนแรง", "Severity")}</th><th>${L("ข้อเสนอแนวทางแก้", "Suggested fix")}</th></tr>
        ${d.issues.map((x, i) => `<tr><td class="code">${i + 1}</td><td><textarea class="inp irb-ta s" data-iss="${i}" data-k="t">${E(x.t)}</textarea></td><td>${rb("pr_cat" + i, CAT(), x.cat, `data-iss="${i}" data-k="cat"`)}</td>
          <td>${rb("pr_sev" + i, SEV(), x.sev, `data-iss="${i}" data-k="sev"`)}</td><td><textarea class="inp irb-ta s" data-iss="${i}" data-k="fix">${E(x.fix)}</textarea></td></tr>`).join("")}</table></div>
      <div class="pl-tools"><button class="btn g" id="irbIssAdd">${L("+ เพิ่มรายการ", "+ Add entry")}</button></div>
      <h4 class="irb-h4">${L("ตอนที่ 4 สรุปประสบการณ์การใช้งาน (เฉพาะผู้เชี่ยวชาญในขั้นตอนที่ 4.1)", "Part 4 Summary of the user experience (step 4.1 experts only)")}</h4>
      <table class="irb-t irb-ft"><tr><th>${L("ฟีเจอร์ที่ควรพัฒนาก่อน (เลือกได้ไม่เกิน 3 ข้อ)", "Features to develop first (choose up to 3)")}</th><td>${cb("pr_feat", FEATS(), d.feats, 'data-feat="1"')}<div>${L("อื่น ๆ", "Other")} <input class="inp" data-f="featOther" value="${E(d.featOther)}"></div></td></tr>
        <tr><th>${L("กรณีที่ไม่ควรใช้ระบบนี้ (ถ้ามี)", "Cases where this system should not be used (if any)")}</th><td><textarea class="inp irb-ta s" data-f="notUse">${E(d.notUse)}</textarea></td></tr>
        <tr><th>${L("ประสบการณ์การใช้งานโดยรวม (ไม่เกิน 3 บรรทัด)", "Overall user experience (up to 3 lines)")}</th><td><textarea class="inp irb-ta s" rows="3" data-f="exp" data-maxlines="3">${E(d.exp)}</textarea></td></tr></table>
      <div class="irb-btns"><button class="btn g" id="irbRecNew">${L("ล้างแบบฟอร์ม", "Clear form")}</button><span class="irb-btnrow">${ui.msg ? `<span class="pill ok" id="irbRecMsg">${E(ui.msg)}</span>` : ""}<button class="btn p" id="irbRecSave">${L("บันทึกและส่ง", "Save and submit")}</button></span></div></div>`;
    return head(L("งานวิจัย · ขั้นตอนที่ 4.1", "Research · step 4.1"), L("แบบบันทึกการนำร่อง (ภาคผนวก ค)", "Pilot record form (Appendix C)"),
        L("บันทึกผลตามเกณฑ์ C1–C6 ประเด็นปัญหา ระดับความรุนแรง และฟีเจอร์ที่ควรพัฒนา โดยไม่ระบุชื่อ · บันทึกในเครื่องและส่งเข้าฐานข้อมูลกลาง", "Record criteria C1–C6, issues, severity and features to develop, without names · saved on this device and sent to the central database"))
      + form + recList("pilotrec") + (isAdmin() ? recAdmin("pilotrec") : "");
  }
  function viewExpertRec() {
    const d = draftOf("expertrec"), ui = R_UI.expertrec, Q = QS(), TH = THEMES();
    const inp = (k, v, type) => `<input class="inp" data-f="${k}" type="${type || "text"}" value="${E(v)}">`;
    const form = `<div class="card irb-card irb-form" id="irbExpertForm">
      <h3 class="irb-h3">${L("ภาคผนวก ง แบบบันทึกการสัมภาษณ์ผู้เชี่ยวชาญแบบมีโครงสร้าง (ขั้นตอนที่ 4.1)", "Appendix D Structured expert interview record form (step 4.1)")}</h3>
      <p class="irb-sub">${L("ใช้ในหัวข้อ 3.2.4.1 ข้อ (ง) และ ตารางที่ 3.13", "Used in section 3.2.4.1 (d) and Table 3.13")}</p>
      <div class="irb-note"><b>${L("คำชี้แจง", "Instructions")}</b> ${L("ผู้วิจัยถามคำถามตามลำดับและถ้อยคำที่กำหนด ไม่ถามต่อนอกแนวคำถาม จดคำตอบสรุปรายข้อ ไม่บันทึกเสียงหรือภาพ ไม่บันทึกชื่อ และอ่านสรุปให้ผู้เข้าร่วมยืนยันก่อนจบ ใช้เวลาไม่เกิน 60 นาที",
        "The researcher asks the questions in the set order and wording, does not ask follow-up questions outside the guide, notes a summary answer per item, records no audio or images and no names, and reads the summary back for the participant to confirm before ending. No more than 60 minutes.")}</div>
      <h4 class="irb-h4">${L("ตอนที่ 1 ข้อมูลรหัส (ผู้วิจัยกำหนด)", "Part 1 Codes (assigned by the researcher)")}</h4>
      <table class="irb-t irb-ft"><tr><th>${L("รหัสผู้เชี่ยวชาญ", "Expert code")}</th><td>${inp("eid", d.eid)}</td></tr>
        <tr><th>${L("ประเภทกระบวนงาน", "Process type")}</th><td>${rb("ex_ptype", PTYPES.map(p => [p, p]), d.ptype, 'data-f="ptype"')}</td></tr>
        <tr><th>${L("วันที่", "Date")}</th><td>${inp("date", d.date, "date")}</td></tr>
        <tr><th>${L("เวลาเริ่มและเวลาจบ", "Start and end time")}</th><td>${inp("tstart", d.tstart, "time")} – ${inp("tend", d.tend, "time")}</td></tr>
        <tr><th>${L("ลงนามยินยอม (ชุดที่ 1)", "Consent signed (Set 1)")}</th><td><label class="irb-opt inl"><input type="checkbox" data-f="consent1" ${d.consent1 ? "checked" : ""}><span>${L("แล้ว", "Done")}</span></label></td></tr>
        <tr><th>${L("รูปแบบ", "Format")}</th><td>${rb("ex_mode", [["inperson", L("พบตัว", "In person")], ["online", L("ออนไลน์", "Online")]], d.mode, 'data-f="mode"')}</td></tr></table>
      <h4 class="irb-h4">${L("ตอนที่ 2 คำถามแบบมีโครงสร้าง", "Part 2 Structured questions")}</h4>
      <div class="tw"><table class="irb-t irb-ft" id="irbQs"><tr><th>${L("ข้อ", "No.")}</th><th>${L("คำถาม", "Question")}</th><th>${L("สรุปคำตอบ", "Answer summary")}</th><th>${L("หมวด", "Theme")}</th></tr>
        ${Q.map((q, i) => `<tr><td class="code">Q${String(i + 1).padStart(2, "0")}</td><td>${E(q)}</td><td><textarea class="inp irb-ta s" data-q="${i}" data-k="s">${E(d.q[i].s)}</textarea></td>
          <td>${cb("ex_th" + i, TH, d.q[i].th, `data-q="${i}" data-k="th"`)}${d.q[i].th.includes("other") ? `<input class="inp" data-q="${i}" data-k="other" value="${E(d.q[i].other)}" placeholder="${E(L("ระบุ", "Specify"))}">` : ""}</td></tr>`).join("")}</table></div>
      <p class="irb-sub">${L("หมวดที่กำหนดไว้ก่อน", "Predefined themes")} ${TH.slice(0, 5).map(([k, l]) => `${k} ${E(l)}`).join(" · ")}</p>
      <h4 class="irb-h4">${L("ตอนที่ 3 สรุปท้ายการสัมภาษณ์", "Part 3 Closing summary")}</h4>
      <table class="irb-t irb-ft"><tr><th>${L("ประเด็น", "Point")}</th><th>${L("บันทึก", "Record")}</th></tr>
        ${CLOSE().map(([k, l]) => `<tr><td>${E(l)}</td><td>${rb("ex_cl" + k, YESNO(), d.close[k], `data-cl="${k}"`)}</td></tr>`).join("")}
        <tr><td>${L("ผู้เข้าร่วมยืนยันสรุปคำตอบแล้ว", "The participant has confirmed the answer summary")}</td><td><label class="irb-opt inl"><input type="checkbox" data-cl="confirmed" ${d.close.confirmed ? "checked" : ""}><span>${L("ยืนยัน", "Confirmed")}</span></label></td></tr></table>
      <div class="irb-btns"><button class="btn g" id="irbRecNew">${L("ล้างแบบฟอร์ม", "Clear form")}</button><span class="irb-btnrow">${ui.msg ? `<span class="pill ok" id="irbRecMsg">${E(ui.msg)}</span>` : ""}<button class="btn p" id="irbRecSave">${L("บันทึกและส่ง", "Save and submit")}</button></span></div></div>`;
    return head(L("งานวิจัย · ขั้นตอนที่ 4.1", "Research · step 4.1"), L("แบบบันทึกการสัมภาษณ์ผู้เชี่ยวชาญ (ภาคผนวก ง)", "Expert interview record form (Appendix D)"),
        L("คำถามแบบมีโครงสร้าง 10 ข้อ (Q01–Q10) หมวด TH01–TH05 และสรุปท้ายการสัมภาษณ์ · ไม่บันทึกชื่อ เสียง หรือภาพ", "10 structured questions (Q01–Q10), themes TH01–TH05 and closing summary · no names, audio or images recorded"))
      + form + recList("expertrec") + (isAdmin() ? recAdmin("expertrec") : "");
  }
  /** รายการที่บันทึกในเครื่องนี้ (ของบัญชีนี้) — เปิดแก้/ลบได้ */
  function recList(kind) {
    const xs = recStore()[kind].filter(x => x.acct === acct());
    const lab = x => kind === "pilotrec" ? `${x.rid || "—"} · ${x.ptype || "—"} · ${x.date || ""} · ${L("ครั้งที่", "round")} ${x.round || "—"}` : `${x.eid || "—"} · ${x.ptype || "—"} · ${x.date || ""}`;
    return `<div class="card irb-card" style="margin-top:14px" id="irbRecList"><h3>${L("รายการที่บันทึกแล้ว (บัญชีนี้ · เครื่องนี้)", "Saved records (this account · this device)")} <span class="pill mute">${xs.length}</span></h3>
      ${xs.length ? `<ul class="pl-ul">${xs.map(x => `<li>${E(lab(x))} <span class="irb-mut">${E((x.saved_at || "").slice(0, 16).replace("T", " "))}</span> ${x.srv === true ? `<span class="pill ok">${L("ส่งแล้ว", "Sent")}</span>` : x.srv === false ? `<span class="pill warn">${L("ยังไม่ส่ง", "Not sent")}</span>` : ""}
        <button class="lnk" data-recedit="${x.id}">${L("แก้ไข", "Edit")}</button> · <button class="lnk" data-recdel="${x.id}">${L("ลบ", "Delete")}</button></li>`).join("")}</ul>` : `<p class="desc">${L("ยังไม่มีรายการ", "No records yet")}</p>`}</div>`;
  }
  function recAdmin(kind) {
    const xs = recStore()[kind], n = xs.length, pc2 = (f, ys) => (ys || xs).length ? 100 * (ys || xs).filter(f).length / (ys || xs).length : NaN;
    let body = "";
    if (kind === "pilotrec") {
      const c4 = xs.map(x => +x.c.C4).filter(v => num(v) && v > 0), iss = xs.flatMap(x => (x.issues || []).filter(i => i.t && i.t.trim()));
      const yn = k => { const ys = xs.filter(x => x.c[k]); return `<td class="n">${ys.length}</td><td class="n">${pc(pc2(x => x.c[k] === "yes" || x.c[k] === "match", ys))}</td>`; };
      body = `<div class="tw"><table class="as-dt irb-dt" id="irbPrSum"><thead><tr><th>${L("เกณฑ์", "Criterion")}</th><th class="n">n</th><th class="n">${L("ใช่ / ตรง", "Yes / matches")}</th></tr></thead><tbody>
          ${["C1", "C2", "C3", "C5"].map(k => `<tr><td>${k} · ${E(C_ITEMS().find(c => c[0] === k)[1])}</td>${yn(k)}</tr>`).join("")}
          <tr><td>C4 · ${E(C_ITEMS()[3][1])}</td><td class="n">${c4.length}</td><td class="n">${L("มัธยฐาน", "median")} <b id="irbC4Med">${fmt(median(c4), 0)}</b> · ${L("เฉลี่ย", "mean")} ${f1(mean(c4))} ${L("นาที", "min")}</td></tr>
          <tr><td>C6 · ${L("จำนวนประเด็นปัญหาที่บันทึก", "Number of issues logged")}</td><td class="n">${n}</td><td class="n"><b id="irbC6">${iss.length}</b></td></tr></tbody></table></div>
        <div class="tw" style="margin-top:8px"><table class="as-dt irb-dt" id="irbPrIss"><thead><tr><th>${L("หมวด × ความรุนแรง", "Category × severity")}</th>${SEV().map(([, l]) => `<th class="n">${E(l)}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th></tr></thead><tbody>
          ${CAT().map(([k, l]) => `<tr><td>${E(l)}</td>${SEV().map(([s]) => `<td class="n">${iss.filter(i => i.cat === k && i.sev === s).length}</td>`).join("")}<td class="n">${iss.filter(i => i.cat === k).length}</td></tr>`).join("")}</tbody></table></div>
        <div class="irb-dist"><span class="irb-dl">${L("ฟีเจอร์ที่ควรพัฒนาก่อน", "Features to develop first")}</span> ${FEATS().map(([k, l]) => `<span class="chip">${E(l)} <b>${xs.filter(x => (x.feats || []).includes(k)).length}</b></span>`).join(" ")}</div>`;
    } else {
      const TH = THEMES();
      body = `<div class="tw"><table class="as-dt irb-dt" id="irbExSum"><thead><tr><th>${L("ข้อ", "No.")}</th>${TH.map(([k]) => `<th class="n">${k === "other" ? L("อื่น", "Other") : k}</th>`).join("")}<th class="n">${L("มีสรุปคำตอบ", "With summary")}</th></tr></thead><tbody>
          ${Array.from({ length: 10 }, (_, i) => `<tr><td>Q${String(i + 1).padStart(2, "0")}</td>${TH.map(([k]) => `<td class="n">${xs.filter(x => x.q[i] && (x.q[i].th || []).includes(k)).length}</td>`).join("")}<td class="n">${xs.filter(x => x.q[i] && x.q[i].s && x.q[i].s.trim()).length}</td></tr>`).join("")}</tbody></table></div>
        <div class="tw" style="margin-top:8px"><table class="as-dt irb-dt"><thead><tr><th>${L("สรุปท้ายการสัมภาษณ์", "Closing summary")}</th><th class="n">n</th><th class="n">${L("ใช่", "Yes")}</th></tr></thead><tbody>
          ${CLOSE().map(([k, l]) => { const ys = xs.filter(x => x.close[k]); return `<tr><td>${E(l)}</td><td class="n">${ys.length}</td><td class="n">${pc(pc2(x => x.close[k] === "yes", ys))}</td></tr>`; }).join("")}
          <tr><td>${L("ผู้เข้าร่วมยืนยันสรุปคำตอบแล้ว", "The participant has confirmed the answer summary")}</td><td class="n">${n}</td><td class="n">${pc(pc2(x => x.close.confirmed))}</td></tr></tbody></table></div>`;
    }
    return `<div class="card irb-admin" style="margin-top:14px" id="irbRecAdmin"><h3>${L("สรุปสำหรับผู้วิจัย", "Summary for the researcher")} (n = <span id="irbRecN">${n}</span>) <span class="pill mute">${L("ผู้ดูแล · ทุกบัญชีในเครื่องนี้", "Administrator · all accounts on this device")}</span></h3>
      <p class="desc">${L("ฉบับเซิร์ฟเวอร์: ส่งออกทุกรายการจากหน้าผู้ดูแล (kind feedback · type " + kind + ")", "Server version: export all records from the admin export (kind feedback · type " + kind + ")")}</p>${body}
      <div class="pl-tools"><button class="btn g" id="irbRecCsv">${L("ส่งออก CSV", "Export CSV")}</button>${kind === "pilotrec" ? `<button class="btn g" id="irbRecCsvIss">${L("ส่งออก CSV ประเด็นปัญหา", "Export issues CSV")}</button>` : ""}<button class="btn g" id="irbRecJson">${L("ส่งออก JSON", "Export JSON")}</button></div></div>`;
  }
  function recCsv(kind, issues) {
    const xs = recStore()[kind];
    if (kind === "pilotrec" && issues) return csv([[L("รหัสบันทึก", "record_id"), L("รหัสผู้บันทึก", "recorder_code"), L("ลำดับ", "no"), L("ประเด็นปัญหา", "issue"), L("หมวด", "category"), L("ความรุนแรง", "severity"), L("ข้อเสนอแนวทางแก้", "suggested_fix")],
      ...xs.flatMap(x => (x.issues || []).map((i, j) => [x.id, x.rid, j + 1, i.t, i.cat, i.sev, i.fix]).filter(r => String(r[3] || "").trim()))]);
    if (kind === "pilotrec") return csv([[L("รหัสบันทึก", "record_id"), L("วันที่บันทึก", "saved_at"), L("รหัสผู้บันทึก", "recorder_code"), L("ประเภทกระบวนงาน", "process_type"), L("รหัสกระบวนงาน", "process_code"), L("รุ่นของระบบ", "system_version"), L("วันที่", "date"), L("ครั้งที่", "round"),
        "C1", L("C1 เหตุผล", "C1_reason"), "C2", "C3", L("C4 นาที", "C4_minutes"), "C5", L("C5 ข้อที่ไม่ตรง", "C5_items_not_matching"), L("C6 จำนวนประเด็น", "C6_issue_count"), L("ฟีเจอร์ที่ควรพัฒนาก่อน", "features_first"), L("ฟีเจอร์อื่น", "feature_other"), L("กรณีที่ไม่ควรใช้", "not_to_use"), L("ประสบการณ์โดยรวม", "overall_experience")],
      ...xs.map(x => [x.id, x.saved_at, x.rid, x.ptype, x.pcode, x.sysver, x.date, x.round, x.c.C1, x.c.C1why, x.c.C2, x.c.C3, x.c.C4, x.c.C5, x.c.C5which, (x.issues || []).filter(i => i.t && i.t.trim()).length, (x.feats || []).join("|"), x.featOther, x.notUse, x.exp])]);
    return csv([[L("รหัสบันทึก", "record_id"), L("วันที่บันทึก", "saved_at"), L("รหัสผู้เชี่ยวชาญ", "expert_code"), L("ประเภทกระบวนงาน", "process_type"), L("วันที่", "date"), L("เวลาเริ่ม", "start_time"), L("เวลาจบ", "end_time"), L("ลงนามยินยอมชุดที่ 1", "consent_set1"), L("รูปแบบ", "format"),
        ...Array.from({ length: 10 }, (_, i) => { const q = "Q" + String(i + 1).padStart(2, "0"); return [q + L(" สรุปคำตอบ", "_summary"), q + L(" หมวด", "_themes"), q + L(" อื่น", "_other")]; }).flat(),
        ...CLOSE().map(([k]) => L("สรุป ", "closing_") + k), L("ยืนยันสรุปแล้ว", "summary_confirmed")],
      ...xs.map(x => [x.id, x.saved_at, x.eid, x.ptype, x.date, x.tstart, x.tend, x.consent1 ? 1 : 0, x.mode, ...x.q.flatMap(q => [q.s, (q.th || []).join("|"), q.other]), ...CLOSE().map(([k]) => x.close[k]), x.close.confirmed ? 1 : 0])]);
  }
  function wireRec(kind) {
    return h => {
      const d = draftOf(kind), ui = R_UI[kind], keep = () => { setDraft(kind, d); ui.msg = ""; const m = h.querySelector("#irbRecMsg"); if (m) m.remove(); };
      h.querySelectorAll("[data-f]").forEach(el => el.onchange = () => {
        const k = el.dataset.f; if (el.type === "checkbox") d[k] = el.checked; else if (el.type === "radio") { if (el.checked) d[k] = el.value; } else d[k] = el.value.slice(0, 2000);
        if (el.dataset.maxlines) { const v = el.value.split("\n").slice(0, 3).join("\n"); el.value = v; d[k] = v; } keep(); });
      h.querySelectorAll("[data-c]").forEach(el => el.onchange = () => { if (el.type === "radio" && !el.checked) return; d.c[el.dataset.c] = el.type === "number" ? (el.value === "" ? "" : String(Math.max(0, Math.round(+el.value || 0)))) : el.value.slice(0, 500); keep(); });
      h.querySelectorAll("[data-iss]").forEach(el => el.onchange = () => { if (el.type === "radio" && !el.checked) return; d.issues[+el.dataset.iss][el.dataset.k] = el.value.slice(0, 1000); keep(); });
      const ia = h.querySelector("#irbIssAdd"); if (ia) ia.onclick = () => { d.issues.push({ t: "", cat: "", sev: "", fix: "" }); keep(); render(); };
      h.querySelectorAll("input[data-feat]").forEach(el => el.onchange = () => {
        const s = new Set(d.feats || []); if (el.checked) { if (s.size >= 3) { el.checked = false; try { toast(L("เลือกได้ไม่เกิน 3 ข้อ", "Choose up to 3")); } catch (e) { } return; } s.add(el.value); } else s.delete(el.value);
        d.feats = [...s]; keep(); });
      h.querySelectorAll("[data-q]").forEach(el => el.onchange = () => { const q = d.q[+el.dataset.q], k = el.dataset.k;
        if (k === "th") { const s = new Set(q.th || []); el.checked ? s.add(el.value) : s.delete(el.value); q.th = [...s]; keep(); if (el.value === "other") render(); } else { q[k] = el.value.slice(0, 2000); keep(); } });
      h.querySelectorAll("[data-cl]").forEach(el => el.onchange = () => { if (el.type === "checkbox") d.close[el.dataset.cl] = el.checked; else if (el.checked) d.close[el.dataset.cl] = el.value; keep(); });
      const nw = h.querySelector("#irbRecNew"); if (nw) nw.onclick = () => { setDraft(kind, kind === "pilotrec" ? blankPilot() : blankExpert()); ui.msg = ""; render(); };
      const sv = h.querySelector("#irbRecSave"); if (sv) sv.onclick = () => {
        const o = recStore(), rec = JSON.parse(JSON.stringify(d)); rec.acct = acct(); rec.saved_at = new Date().toISOString();
        const i = o[kind].findIndex(x => x.id === rec.id); if (i >= 0) o[kind][i] = rec; else o[kind].push(rec);
        o.draft[kind + "|" + acct()] = kind === "pilotrec" ? blankPilot() : blankExpert(); recSave(o);
        ui.msg = L("บันทึกแล้ว", "Saved"); render();
        const payload = Object.assign({}, rec); delete payload.acct;
        submit("feedback", payload).then(ok => { if (ok === null) return; const o2 = recStore(), x = o2[kind].find(y => y.id === rec.id); if (x) { x.srv = !!ok; recSave(o2); }
          ui.msg = ok ? L("บันทึกแล้ว · ส่งเข้าฐานข้อมูลกลางแล้ว", "Saved · sent to the central database") : L("บันทึกในเครื่องแล้ว · ส่งเข้าเซิร์ฟเวอร์ไม่สำเร็จ", "Saved on this device · could not send to the server"); if (S.view === kind) render(); });
      };
      h.querySelectorAll("[data-recedit]").forEach(b => b.onclick = () => { const x = recStore()[kind].find(y => y.id === b.dataset.recedit); if (x) { setDraft(kind, JSON.parse(JSON.stringify(x))); ui.msg = ""; render(); window.scrollTo(0, 0); } });
      h.querySelectorAll("[data-recdel]").forEach(b => b.onclick = () => (typeof confirm2 === "function" ? confirm2 : (x, f) => f())(b, () => { const o = recStore(); o[kind] = o[kind].filter(y => y.id !== b.dataset.recdel); recSave(o); render(); }, L("ยืนยันลบ", "Confirm delete")));
      const c1 = h.querySelector("#irbRecCsv"); if (c1) c1.onclick = () => dl(`ois_${kind}_${new Date().toISOString().slice(0, 10)}.csv`, recCsv(kind), "text/csv;charset=utf-8");
      const c2 = h.querySelector("#irbRecCsvIss"); if (c2) c2.onclick = () => dl(`ois_pilotrec_issues_${new Date().toISOString().slice(0, 10)}.csv`, recCsv(kind, true), "text/csv;charset=utf-8");
      const j = h.querySelector("#irbRecJson"); if (j) j.onclick = () => dl(`ois_${kind}.json`, JSON.stringify(recStore()[kind], null, 2), "application/json;charset=utf-8");
    };
  }

  /* ============================================================================
     ลงทะเบียนหน้า · เมนู · จุดเกี่ยวกับการเข้าระบบ
     ============================================================================ */
  VIEWS.survey = viewSurvey; VIEWS.consent = viewConsent; VIEWS.pilotrec = viewPilotRec; VIEWS.expertrec = viewExpertRec;
  if (typeof WIRES2 === "object" && WIRES2) Object.assign(WIRES2, { survey: wireSurvey, consent: wireConsent, pilotrec: wireRec("pilotrec"), expertrec: wireRec("expertrec") });
  const _ws = WIRES2 && WIRES2.survey; if (_ws) WIRES2.survey = h => { wireAdmin(h); _ws(h); };
  if (Array.isArray(NAV)) {
    const at = NAV.findIndex(n => n.id === "survey");
    const add = [{ id: "consent", g: 4, ico: "✓", lab: "ความยินยอมและการถอนตัว" },
      { id: "pilotrec", g: 4, ico: "☰", lab: "แบบบันทึกการนำร่อง (ภาคผนวก ค)" },
      { id: "expertrec", g: 4, ico: "☷", lab: "แบบบันทึกการสัมภาษณ์ผู้เชี่ยวชาญ (ภาคผนวก ง)" }].filter(x => !NAV.some(n => n.id === x.id));
    if (at >= 0) NAV.splice(at + 1, 0, ...add); else NAV.push(...add);
    try { buildNav(); if (S.user) syncNavLocks(); } catch (e) { }
  }
  /* ป้ายเมนูภาษาอังกฤษ (ชั้นแปลโหลดหลังไฟล์นี้) */
  const EN_DICT = { "ความยินยอมและการถอนตัว": "Consent & withdrawal", "แบบบันทึกการนำร่อง (ภาคผนวก ค)": "Pilot record form (Appendix C)",
    "แบบบันทึกการสัมภาษณ์ผู้เชี่ยวชาญ (ภาคผนวก ง)": "Expert interview record form (Appendix D)", "แบบสอบถามประเมินต้นแบบนวัตกรรม (4.2)": "Prototype evaluation questionnaire (4.2)",
    "Board Profile (นอกกลุ่มอ้างอิง)": "Board Profile (outside the reference group)", "นอกโดเมน / Outside the reference sample": "Outside the reference sample" };
  try { (window.__I18N_Q = window.__I18N_Q || []).push(EN_DICT); } catch (e) { }
  (function reg(n) { if (window.I18N && typeof window.I18N.load === "function") window.I18N.load(EN_DICT); else if (n < 100) setTimeout(() => reg(n + 1), 30); })(0);

  /* เข้าระบบ / เปลี่ยนหน้า → ตรวจความยินยอม (ห่อฟังก์ชันส่วนกลาง เรียกต่อของเดิมเสมอ) */
  if (typeof enter === "function") { const _enter = enter; enter = function () { G.leave = false; G.ret = null; const r = _enter.apply(this, arguments); check(); return r; }; }   // eslint-disable-line no-global-assign
  if (typeof go === "function") {
    const _go = go; _goRaw = v => _go(v);
    go = function (v) { if (gateNeeded() && v !== "consent") { G.ret = v; lock(); return _go("consent"); } const r = _go.apply(this, arguments); check(); return r; };   // eslint-disable-line no-global-assign
  }
  const appOn = () => { const a = document.getElementById("app"); return !!(a && a.style.display !== "none"); };
  if (S.user && appOn()) check();

  window.IRB = { check, recOf, valid, CONSENT_VER, SV_VER, demo, svStore, recStore, stats: { alpha, alphaBoot, fisher, mannWhitney, spearman, citc },
    resetConsent: () => { setRec(null); check(); } };
})();
