-- โน้ตของครูบนแดชบอร์ด ปพ.5 (modules/notes.js) — ตารางใหม่ ไม่กระทบตารางที่ใช้ร่วมกับระบบ exam
create table if not exists public.teacher_notes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  color text not null default 'yellow',
  pinned boolean not null default false,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teacher_notes_user_idx on public.teacher_notes(user_id, updated_at desc);
alter table public.teacher_notes enable row level security;
-- เห็น/แก้/ลบได้เฉพาะโน้ตของตัวเอง (แอดมินก็ไม่เห็นโน้ตของครูคนอื่น)
create policy teacher_notes_own on public.teacher_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
