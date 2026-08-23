-- ตาราง students มี policy ซ้อนกันคำสั่งละ 2 ตัว (ตัวกว้าง true บังตัวแคบจนเป็นโค้ดตาย)
-- ทำให้อ่านโมเดลสิทธิ์แล้วเข้าใจผิดว่าครูเห็นเฉพาะห้องตัวเอง ทั้งที่จริงเห็นทั้งโรงเรียน
-- รวมให้เหลือคำสั่งละตัวเดียว โดยไม่เปลี่ยนสิทธิ์ที่มีผลจริง (ทดสอบแล้ว: อ่าน/แก้ 110 แถวเท่าเดิม)
-- ถ้าต้องการจำกัดให้ครูเห็นเฉพาะห้องที่ตัวเองสอน แก้ USING ของ students_select เป็น
--   EXISTS (SELECT 1 FROM subjects su WHERE su.user_id=auth.uid()
--           AND su.grade_level=students.grade_level AND su.room=students.room)
-- ซึ่งเป็นการเปลี่ยนพฤติกรรม (ครูจะเห็นนักเรียนน้อยลง) ต้องยืนยันก่อนใช้

DROP POLICY IF EXISTS "authenticated users can select students" ON students;
DROP POLICY IF EXISTS students_read ON students;
CREATE POLICY students_select ON students FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated users can insert students" ON students;
DROP POLICY IF EXISTS students_write ON students;
CREATE POLICY students_insert ON students FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated users can update students" ON students;
DROP POLICY IF EXISTS students_update ON students;
CREATE POLICY students_update ON students FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
