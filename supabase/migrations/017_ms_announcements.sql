-- บันทึกรายชื่อนักเรียนที่ "ประกาศ มส" แล้ว (เวลาเรียนไม่ถึง 80% ณ วันที่ประกาศ)
-- ที่ผ่านมารายชื่อ มส คำนวณสดจากเวลาเรียนสะสม พอนักเรียนกลับมาเรียนจนเกิน 80% ชื่อก็หายจากรายงาน
-- ทั้งที่ประกาศไปแล้ว จึงเก็บผลตอนประกาศไว้เป็นหลักฐาน (ครูยกเลิกได้เอง = cancelled_at)
-- ตารางใหม่ ไม่แก้ตารางที่ใช้ร่วมกับระบบ exam
create table if not exists public.ms_announcements (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  announced_at timestamptz not null default now(),
  announced_by uuid default auth.uid(),
  attended_hours numeric not null default 0,
  total_hours numeric not null default 0,
  pct numeric not null default 0,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_note text not null default ''
);
-- 1 นักเรียน/วิชา มีรายการที่ยังมีผลได้ 1 รายการ (ประกาศซ้ำจะไม่สร้างซ้อน)
create unique index if not exists ms_announcements_active_uq
  on public.ms_announcements(subject_id, student_id) where cancelled_at is null;
create index if not exists ms_announcements_subject_idx on public.ms_announcements(subject_id);

alter table public.ms_announcements enable row level security;

create policy ms_announcements_admin on public.ms_announcements
  for all using (is_admin() = true) with check (is_admin() = true);
create policy ms_announcements_own on public.ms_announcements
  for all
  using (exists (select 1 from public.subjects s where s.id = ms_announcements.subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.subjects s where s.id = ms_announcements.subject_id and s.user_id = auth.uid()));
