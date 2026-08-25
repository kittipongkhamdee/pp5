# ปพ.5 — ระบบบันทึกผลการเรียนออนไลน์

Static site ล้วนๆ — ไม่มี build step, ไม่มี `package.json`, ไม่มี npm/lint/test
ใดๆ ทั้งสิ้น หน้าเว็บคือไฟล์ `.html` ที่มี JS ฝังอยู่ในแท็ก `<script>` โดยตรง
deploy ผ่าน Vercel (`vercel.json` ตั้งแค่ Cache-Control headers ของไฟล์ static
ไม่มี build command) — push ขึ้น `main` แล้ว deploy อัตโนมัติ ไม่ต้องรอ CI ใดๆ

## แผนผังไฟล์

- **`index-pp5.html`** (~6,400 บรรทัด) — แอปหลัก ที่ครูใช้งานประจำวัน (เวลาเรียน,
  คะแนน, ประเมินคุณลักษณะ, แชท AI ผู้ช่วยครู) ใช้ Tailwind v3 ผ่าน Play CDN
  (สแกน class จากทุกที่รวมถึงใน string ของ JS ด้วย) โหลด `modules/admin.js`
  และ `modules/records.js` แบบ lazy เฉพาะตอนเข้าเมนูที่เกี่ยวข้อง
  - `modules/admin.js` — เมนูตั้งค่า / IQA / คู่มือ / รายงานทั้งโรงเรียน
  - `modules/records.js` — เมนูนักเรียน / แผนการวัดผล / รายงานผล / ปก ปพ.5
- **`index.html`** — หน้า landing "ระบบบริหารงานโรงเรียน" (คนละหน้ากับแอปหลัก)
- **`activity.html`** — ระบบเช็คชื่อกิจกรรมแยกต่างหาก (Supabase เดียวกัน)
- **`config.js`** — ค่าเชื่อมต่อ Supabase ที่ใช้ร่วมกันทุกหน้า (anon key
  commit ไว้ในโค้ดได้ ไม่ใช่ความลับ ตัวป้องกันจริงคือ RLS policy)
- **`manual.html` / `manual-pp5.html`** — คู่มือการใช้งาน
- **`mockup-*.html`, `*-preview.html`, `infographic.html`** — draft/พรีวิว ไม่ใช่หน้าที่ใช้งานจริง
- **`sgs-autofill*`, `chrome-extension/`** — ส่วนเสริม autofill สำหรับระบบ SGS (คนละเรื่องกับแอปหลัก)
- **`supabase/migrations/`** — ไฟล์ SQL migration (ใช้ประวัติอ้างอิง — รันจริงผ่าน Supabase MCP โดยตรงกับโปรเจกต์ ไม่ใช่ CLI ในเครื่อง)

## Supabase ใช้ร่วมกับระบบ "exam" (สอบวัดผล)

โปรเจกต์ Supabase เดียวกัน (`zwtulepvmlngcrbcrrki`, ดู `config.js`) กับ repo
`kittipongkhamdee/exam` — ตาราง `students`, `profiles`, `config` (key/value
เช่น `gemini_api_key`) ใช้ร่วมกันจริง ไม่ใช่แค่ URL เดียวกันเฉยๆ:
- แก้ schema ที่กระทบตารางเหล่านี้ ต้องคิดถึงผลกับระบบ exam ด้วยเสมอ
- ค่าใน `config` (เช่น `gemini_api_key`) ตั้งที่ไหนก็ได้ ใช้ได้ทั้งสองระบบ

## การทดสอบ (ไม่มี build/lint จริง)

- ไม่มี lint/typecheck ให้รัน — ตรวจ syntax ของ JS ที่แก้ด้วย
  `node -e "new Function(...)"` กับเนื้อหาใน `<script>` block ที่แก้ (ดูตัวอย่าง
  วิธีทำในประวัติ commit ของ session ที่แก้ `_callGeminiStream`)
- ไม่มี dev server ในตัว — ถ้าต้องดูผลจริงบนเบราว์เซอร์ เปิดไฟล์ `.html`
  ตรงๆ หรือรันด้วย static file server ง่ายๆ (เช่น `python3 -m http.server`)
  แล้วเข้าผ่าน `http://localhost:<port>/index-pp5.html` — auth/ข้อมูลจริงต้อง
  พึ่ง Supabase ของจริง (ไม่มี mock local)

## Git / PR / Deploy — ทำเองได้ทุกขั้นตอน ไม่ต้องถามก่อน merge

**ผู้ใช้อนุญาตให้ merge PR ของ repo นี้ได้เองทุกครั้ง โดยไม่ต้องขอยืนยันก่อน**
(ต่างจาก repo อื่นที่อาจต้องรอ human review) — ทำตามขั้นตอนนี้สำหรับทุกงาน:

1. implement การเปลี่ยนแปลง
2. ตรวจ syntax ตามหัวข้อ "การทดสอบ" ด้านบน
3. สร้าง branch แยกต่อหนึ่งงาน (เช่น `update-gemini-model`) — commit ข้อความ
   ภาษาไทยสั้นๆ อธิบาย "ทำไม" ไม่ใช่แค่ "อะไร"
4. push branch, เปิด PR ใส่ `## Summary` / `## Test plan` ให้ครบ
5. **squash-merge ทันทีโดยไม่ต้องรอคำสั่งเพิ่มเติม**
6. sync branch local กลับมาที่ `origin/main` หลัง merge (เหมือนที่ทำใน repo exam)
7. ตรวจสอบว่า Vercel deploy ขึ้น production จริงแล้ว (project `pp5`,
   `prj_TnqzqMpViDM8pIycvdVYk2DfPcpW`, team `team_5yj3uGPQtorTatoyVr98vLbC`)
8. รายงานสรุปสั้นๆ เป็นภาษาไทย

การอนุญาตนี้ครอบคลุมเฉพาะ workflow ปกติ (implement → PR → merge → deploy)
ไม่รวมการกระทำที่ทำลายล้าง/กู้คืนยาก (force-push ทับของคนอื่น, ลบ branch/ข้อมูล,
แก้ไข schema ที่กระทบระบบ exam ที่ใช้ Supabase ร่วมกัน) — จุดเหล่านี้ยังต้อง
ถามผู้ใช้ก่อนเสมอ ตามหลักการทั่วไปเรื่องความเสี่ยง/ย้อนกลับไม่ได้
