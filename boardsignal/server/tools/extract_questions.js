/* สกัดคำถามหารือ 3 ข้อต่อ quadrant × use case จาก src/v2_strategy.js (COMPASS / UC_TEXT / USECASES)
   → server/questions.json  ·  ใช้: node server/tools/extract_questions.js
   ไม่ได้ import JS ตอนเซิร์ฟเวอร์ทำงาน — รันใหม่เมื่อถ้อยคำใน v2_strategy.js เปลี่ยน แล้ว commit json */
const vm = require("vm"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..", "..");
const src = fs.readFileSync(path.join(root, "src", "v2_strategy.js"), "utf8");
const cut = src.indexOf("function ucLens");
if (cut < 0) throw new Error("ไม่พบ function ucLens ใน v2_strategy.js");
const r = vm.runInContext(src.slice(0, cut) + "\n;({COMPASS, UC_TEXT, USECASES})", vm.createContext({}));
const out = { source: "src/v2_strategy.js (COMPASS, UC_TEXT, USECASES)", extracted: new Date().toISOString().slice(0, 10),
  disclaimer: "คำถามเหล่านี้เป็นแนวทางสำหรับตรวจสอบต่อ ไม่ใช่ข้อสรุปว่าบริษัทในช่องนั้นมีปัญหาตามที่ถาม · ตำแหน่งบน Grid เพียงอย่างเดียวยังไม่ใช่หลักฐานว่าบอร์ดพัฒนาประสิทธิผลสำเร็จ",
  usecases: {} };
for (const u of r.USECASES) {
  if (!["board", "credit", "search", "investor"].includes(u.id)) continue;
  const q = {};
  for (const k of "ABCD") {
    const b = r.COMPASS[k];
    const a = u.adapt(b, {}, k);
    q[k] = { head: b.head, sub: b.sub, shows: b.shows, cannot: b.cannot, questions: a.qs.slice(0, 3), evidence: a.ev,
             ask: a.ask, ask_label: a.askLabel };
  }
  out.usecases[u.id] = { label: u.lab, audience: u.audience, note: u.adapt(r.COMPASS.A, {}, "A").note, quadrants: q };
}
fs.writeFileSync(path.join(root, "server", "questions.json"), JSON.stringify(out, null, 1) + "\n");
console.log("wrote server/questions.json", Object.keys(out.usecases));
