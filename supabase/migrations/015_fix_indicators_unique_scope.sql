-- แก้บั๊ก unique constraint เดิม (grade_level, indicator_code, kind) ไม่ได้รวม subject_group
-- ทำให้ "ข้อที่ 1" ของกลุ่มสาระหนึ่ง ชนกับ "ข้อที่ 1" ของอีกกลุ่มสาระที่ระดับชั้นเดียวกัน
-- (เช่น การงานอาชีพ ม.4-6 ข้อที่ 1 มีอยู่แล้ว ทำให้เพิ่ม วิทยาศาสตร์ฯ ม.4-6 ข้อที่ 1 ไม่ได้)
-- ที่ถูกต้องคือต้องซ้ำกันเฉพาะภายในกลุ่มสาระเดียวกันเท่านั้น

alter table public.indicators drop constraint indicators_grade_level_indicator_code_kind_key;
alter table public.indicators add constraint indicators_subject_group_grade_level_indicator_code_kind_key
  unique (subject_group, grade_level, indicator_code, kind);
