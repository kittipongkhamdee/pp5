-- แผนการวัดและประเมินผล (per รายวิชา)
-- ใช้ subjects.score_before_mid/score_mid/score_after_mid/score_final และ
-- subjects.knowledge_ratio/skill_ratio/moral_ratio ที่มีอยู่แล้วเป็นค่าสัดส่วนหลัก
-- (ระหว่างภาค:ปลายภาค และ ความรู้:ทักษะ:คุณธรรม) — ไม่สร้างคอลัมน์ซ้ำ

-- หน่วยการเรียนรู้ (รายการต่อวิชา)
create table if not exists public.eval_plan_units (
  id uuid primary key default extensions.uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  seq int not null default 0,
  unit_name text not null default '',
  hours numeric not null default 0,
  weight numeric not null default 0,
  created_at timestamptz default now()
);
create index if not exists eval_plan_units_subject_idx on public.eval_plan_units(subject_id);

-- ตัวชี้วัดที่ผูกกับแต่ละหน่วยการเรียนรู้ (many-to-many กับคลัง indicators)
create table if not exists public.eval_plan_unit_indicators (
  id bigint generated always as identity primary key,
  unit_id uuid not null references public.eval_plan_units(id) on delete cascade,
  indicator_id bigint not null references public.indicators(id) on delete cascade,
  unique (unit_id, indicator_id)
);
create index if not exists eval_plan_unit_indicators_unit_idx on public.eval_plan_unit_indicators(unit_id);

-- น้ำหนักคะแนนรายตัวชี้วัด (derive รายการตัวชี้วัดจาก eval_plan_unit_indicators ของวิชานั้น)
create table if not exists public.eval_plan_indicator_scores (
  id bigint generated always as identity primary key,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  indicator_id bigint not null references public.indicators(id) on delete cascade,
  score_k numeric not null default 0,
  score_p numeric not null default 0,
  score_a numeric not null default 0,
  score_mid numeric not null default 0,
  score_final numeric not null default 0,
  note text not null default '',
  unique (subject_id, indicator_id)
);
create index if not exists eval_plan_indicator_scores_subject_idx on public.eval_plan_indicator_scores(subject_id);

-- ตารางแสดงสัดส่วนคะแนนแยกช่วงเวลา (ก่อนกลาง/กลาง/หลังกลาง/ปลาย) x (ความรู้/ทักษะ/คุณธรรม)
-- แถวรวมต้อง = knowledge_ratio/skill_ratio/moral_ratio, คอลัมน์รวมต้อง = score_before_mid/score_mid/score_after_mid/score_final
alter table public.subjects
  add column if not exists kpa_before_mid_k numeric not null default 0,
  add column if not exists kpa_before_mid_p numeric not null default 0,
  add column if not exists kpa_before_mid_a numeric not null default 0,
  add column if not exists kpa_mid_k numeric not null default 0,
  add column if not exists kpa_mid_p numeric not null default 0,
  add column if not exists kpa_mid_a numeric not null default 0,
  add column if not exists kpa_after_mid_k numeric not null default 0,
  add column if not exists kpa_after_mid_p numeric not null default 0,
  add column if not exists kpa_after_mid_a numeric not null default 0,
  add column if not exists kpa_final_k numeric not null default 0,
  add column if not exists kpa_final_p numeric not null default 0,
  add column if not exists kpa_final_a numeric not null default 0;

alter table public.eval_plan_units enable row level security;
alter table public.eval_plan_unit_indicators enable row level security;
alter table public.eval_plan_indicator_scores enable row level security;

-- policy: ผูกกับเจ้าของวิชา (subjects.user_id) เหมือน convention ของ subjects เอง + admin ทำได้ทุกวิชา
create policy "eval_plan_units_own" on public.eval_plan_units for all
  using (exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()));
create policy "eval_plan_units_admin" on public.eval_plan_units for all
  using (is_admin() = true) with check (is_admin() = true);

create policy "eval_plan_unit_indicators_own" on public.eval_plan_unit_indicators for all
  using (exists (
    select 1 from public.eval_plan_units u join public.subjects s on s.id = u.subject_id
    where u.id = unit_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.eval_plan_units u join public.subjects s on s.id = u.subject_id
    where u.id = unit_id and s.user_id = auth.uid()
  ));
create policy "eval_plan_unit_indicators_admin" on public.eval_plan_unit_indicators for all
  using (is_admin() = true) with check (is_admin() = true);

create policy "eval_plan_indicator_scores_own" on public.eval_plan_indicator_scores for all
  using (exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()));
create policy "eval_plan_indicator_scores_admin" on public.eval_plan_indicator_scores for all
  using (is_admin() = true) with check (is_admin() = true);
