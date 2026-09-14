-- ปรับ "กำหนดเกรดสูงสุด" จากรายบุคคล เป็นตั้งครั้งเดียวใช้กับนักเรียนกลุ่มยืดหยุ่นทั้งหมด
-- (ตามที่ผู้ใช้แจ้งแก้ไขหลังใช้งานจริง — ตารางเดิม flexible_grade_caps ยังไม่มีข้อมูลจริงใช้งาน)

drop table if exists public.flexible_grade_caps;

create table public.flexible_grade_cap_settings (
  id bigint generated always as identity primary key,
  subject_group text not null unique,
  max_grade numeric(3,1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger flexible_grade_cap_settings_set_updated_at
  before update on public.flexible_grade_cap_settings
  for each row execute function public.home_links_touch_updated_at();

alter table public.flexible_grade_cap_settings enable row level security;

create policy "flexible_grade_cap_settings_select" on public.flexible_grade_cap_settings
  for select using (auth.role() = 'authenticated');

create policy "flexible_grade_cap_settings_write" on public.flexible_grade_cap_settings
  for all using (is_admin() = true or has_menu_permission('students'))
  with check (is_admin() = true or has_menu_permission('students'));
