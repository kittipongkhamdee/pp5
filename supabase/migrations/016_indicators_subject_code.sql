-- ตัวชี้วัดของ "วิชาเพิ่มเติม" ต้องผูกกับรหัสวิชาเฉพาะ (ไม่ใช่แค่กลุ่มสาระ)
-- เพราะแต่ละวิชาเพิ่มเติมมี "ข้อที่ 1..N" ของตัวเอง ต่างจากรายวิชาพื้นฐานที่ใช้
-- มาตรฐาน/ตัวชี้วัดกลางร่วมกันทั้งกลุ่มสาระ (ตามหลักสูตรแกนกลาง) — subject_code
-- เป็น null ได้สำหรับข้อมูลเก่าที่ยังไม่ได้ระบุวิชา (จะยังคงแสดงร่วมกันทั้งกลุ่ม
-- สาระไปก่อนตามพฤติกรรมเดิม จนกว่าจะถูกแก้ไขระบุวิชาให้ชัดเจน)

alter table public.indicators add column subject_code text;

alter table public.indicators drop constraint indicators_subject_group_grade_level_indicator_code_kind_key;

-- รายวิชาพื้นฐาน: กันซ้ำในระดับกลุ่มสาระ+ระดับชั้นเหมือนเดิม (ใช้ร่วมกันทุกวิชาพื้นฐานในกลุ่มสาระนั้น)
create unique index indicators_basic_uniq
  on public.indicators(subject_group, grade_level, indicator_code, kind)
  where subject_type = 'รายวิชาพื้นฐาน';

-- วิชาเพิ่มเติมที่ระบุรหัสวิชาแล้ว: กันซ้ำเฉพาะภายในวิชานั้นๆ
create unique index indicators_extra_assigned_uniq
  on public.indicators(subject_code, grade_level, indicator_code, kind)
  where subject_type = 'วิชาเพิ่มเติม' and subject_code is not null;

-- วิชาเพิ่มเติมที่ยังไม่ระบุรหัสวิชา (ข้อมูลเก่า): กันซ้ำแบบเดิม (ระดับกลุ่มสาระ)
create unique index indicators_extra_unassigned_uniq
  on public.indicators(subject_group, grade_level, indicator_code, kind)
  where subject_type = 'วิชาเพิ่มเติม' and subject_code is null;
