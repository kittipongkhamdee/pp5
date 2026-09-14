-- นักเรียนกลุ่มยืดหยุ่น (สพฐ. 3 รูปแบบการจัดการเรียนรู้) + เพดานเกรดสูงสุดรายบุคคล/รายกลุ่มสาระ
-- เลือกจากนักเรียนที่มีอยู่แล้วในตาราง students — ไม่ใช่ตารางนักเรียนแยกต่างหาก

create table public.flexible_students (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  learning_format text not null check (learning_format in ('ในระบบ','นอกระบบ','ตามอัธยาศัย')),
  created_at timestamptz not null default now(),
  unique(student_id)
);

alter table public.flexible_students enable row level security;

create policy "flexible_students_select" on public.flexible_students
  for select using (auth.role() = 'authenticated');

create policy "flexible_students_write" on public.flexible_students
  for all using (is_admin() = true or has_menu_permission('students'))
  with check (is_admin() = true or has_menu_permission('students'));

-- เพดานเกรดสูงสุด: ตั้งแยกรายนักเรียน x รายกลุ่มสาระการเรียนรู้ (ไม่ตั้ง = ไม่จำกัด)
create table public.flexible_grade_caps (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_group text not null,
  max_grade numeric(3,1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, subject_group)
);

create trigger flexible_grade_caps_set_updated_at
  before update on public.flexible_grade_caps
  for each row execute function public.home_links_touch_updated_at();

alter table public.flexible_grade_caps enable row level security;

create policy "flexible_grade_caps_select" on public.flexible_grade_caps
  for select using (auth.role() = 'authenticated');

create policy "flexible_grade_caps_write" on public.flexible_grade_caps
  for all using (is_admin() = true or has_menu_permission('students'))
  with check (is_admin() = true or has_menu_permission('students'));
