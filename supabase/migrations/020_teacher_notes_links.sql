-- แนบโน้ตกับวิชา/นักเรียน — เพิ่มคอลัมน์ในตาราง teacher_notes เท่านั้น ไม่แก้ตาราง students/subjects (ใช้ร่วมกับ exam)
-- student_ids ไม่ผูก FK กับ students เพื่อไม่ให้กระทบการลบ/ย้ายนักเรียนของระบบ exam — เก็บชื่อไว้ใน student_names
alter table public.teacher_notes
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists student_ids uuid[] not null default '{}',
  add column if not exists student_names text[] not null default '{}';
create index if not exists teacher_notes_subject_idx on public.teacher_notes(subject_id);
