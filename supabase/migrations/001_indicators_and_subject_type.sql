-- ประเภทรายวิชา (subject_type) บนตาราง subjects
-- ค่าที่ใช้ได้ถูกเก็บเป็น JSON array ใน config.subject_types (แก้ไขได้จากหน้าตั้งค่าในแอป)
-- ค่าเริ่มต้น: ["รายวิชาพื้นฐาน","วิชาเพิ่มเติม"]
alter table public.subjects
  add column if not exists subject_type text;

-- คลังตัวชี้วัด (ตัวชี้วัดระหว่างทาง/ปลายทาง ตามหลักสูตรแกนกลาง)
create table if not exists public.indicators (
  id bigint generated always as identity primary key,
  subject_group text not null,
  subject_type text not null default 'รายวิชาพื้นฐาน',
  grade_level text not null,             -- เช่น 'ม.1' .. 'ม.6' หรือ 'ม.4-6'
  standard_code text not null,           -- เช่น 'ท 1.1'
  indicator_code text not null,          -- เช่น 'ท 1.1 ม.1/2'
  indicator_text text not null,
  kind text not null check (kind in ('ระหว่างทาง','ปลายทาง')),
  created_at timestamptz default now(),
  unique (grade_level, indicator_code, kind)
);

create index if not exists indicators_lookup_idx
  on public.indicators (subject_type, subject_group, grade_level);

alter table public.indicators enable row level security;

-- ข้อมูลอ้างอิงกลาง ไม่ผูก user_id (เหมือน config/activities) — อนุญาตให้ผู้ใช้ที่ล็อกอินแล้วอ่านได้ทุกคน
-- ปรับ policy นี้ตาม convention จริงของโปรเจกต์ถ้าต่างจากนี้ (เช่นถ้า config/activities ใช้ policy อื่น)
create policy "indicators_select_authenticated"
  on public.indicators for select
  to authenticated
  using (true);
