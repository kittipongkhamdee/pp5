-- รายการ "ระบบหลัก" และ "เอกสาร/คู่มือ" ที่แสดงบนหน้าแรก (index.html)
-- ย้ายจากของที่ hardcode ไว้ในโค้ด มาเก็บในตารางนี้แทน เพื่อให้แอดมินเพิ่ม/ลบ/แก้ผ่านหน้า admin-home.html ได้
-- โดยไม่ต้องแก้โค้ด — index.html จะ fetch จากตารางนี้ (fallback เป็นค่า hardcode เดิมถ้า fetch ไม่สำเร็จ)

create table public.home_links (
  id bigint generated always as identity primary key,
  section text not null check (section in ('system','quick_link')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  href text not null,
  -- section='system': ชื่อสีพาเลตที่มี CSS พร้อมใช้ (blue/green/purple/orange/red/teal)
  -- section='quick_link': โค้ดสี hex เช่น #0071e3 (ใช้เป็น stroke ของไอคอนตรงๆ)
  color text not null,
  icon_svg text not null,           -- inner markup ของ <svg> ไอคอนหลัก เช่น '<path d="..."/>'
  title text not null,
  subtitle text not null default '',
  description text not null default '',  -- ใช้เฉพาะ section='system'
  cta_label text,                        -- ใช้เฉพาะ section='system'
  badge text,                            -- ใช้เฉพาะ section='system'
  tags jsonb not null default '[]',      -- ใช้เฉพาะ section='system' — [{"icon":"<svg inner>","text":"...","svg":"fill=...(ไม่บังคับ)"}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.home_links_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger home_links_set_updated_at
  before update on public.home_links
  for each row execute function public.home_links_touch_updated_at();

alter table public.home_links enable row level security;

-- ทุกคน (รวมผู้ไม่ได้ล็อกอิน) อ่านได้เฉพาะรายการที่เปิดใช้งาน — สำหรับหน้าแรกสาธารณะ
create policy "home_links_public_read" on public.home_links
  for select using (is_active = true);

-- เฉพาะแอดมินเท่านั้นที่เพิ่ม/แก้/ลบได้ (รวมถึงอ่านรายการที่ปิดใช้งานด้วย)
create policy "home_links_admin_write" on public.home_links
  for all using (is_admin() = true) with check (is_admin() = true);

-- ── seed ข้อมูลเดิมที่เคย hardcode ไว้ใน index.html ──
insert into public.home_links
  (section, sort_order, href, color, icon_svg, title, subtitle, description, cta_label, badge, tags)
values
(
  'system', 1, 'index-pp5.html', 'blue',
  '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  'ระบบ ปพ.5', 'บันทึกผลการเรียน',
  'บันทึกและจัดการผลการเรียนรายวิชา ออกเอกสาร ปพ.5 ตามมาตรฐานกระทรวงศึกษาธิการ พร้อมระบบพิมพ์เอกสาร',
  'เข้าสู่ระบบ ปพ.5', 'ปพ.5',
  '[
    {"icon":"<path d=\"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z\"/>","text":"บันทึกคะแนน"},
    {"icon":"<polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/>","text":"สรุปผลการเรียน"},
    {"icon":"<polyline points=\"6 9 6 2 18 2 18 9\"/><path d=\"M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\"/>","text":"พิมพ์เอกสาร"}
  ]'::jsonb
),
(
  'system', 2, 'activity.html', 'green',
  '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12l2 2 4-4"/>',
  'ระบบเช็คชื่อ', 'กิจกรรมและแต่งกาย',
  'เช็คชื่อการเข้าร่วมกิจกรรม ตรวจแต่งกาย ออกรายงาน และติดตามนักเรียนที่ขาดเรียนต่อเนื่อง',
  'เข้าสู่ระบบเช็คชื่อ', 'Activity',
  '[
    {"icon":"<polyline points=\"20 6 9 17 4 12\"/>","text":"เช็คชื่อ"},
    {"icon":"<path d=\"M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z\"/>","text":"แต่งกาย","svg":"fill=\"currentColor\""},
    {"icon":"<path d=\"M18 20V10\"/><path d=\"M12 20V4\"/><path d=\"M6 20v-6\"/>","text":"รายงาน"},
    {"icon":"<path d=\"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 01-3.46 0\"/>","text":"ขาดต่อเนื่อง"}
  ]'::jsonb
),
(
  'system', 3, 'https://kittipongkhamdee.github.io/test/#/', 'purple',
  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
  'ระบบการจัดสอบ', 'จัดตารางและคุมสอบ',
  'จัดตารางสอบและจัดห้องสอบ',
  'เข้าสู่ระบบการจัดสอบ', 'Exam',
  '[
    {"icon":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/>","text":"ตารางสอบ"},
    {"icon":"<path d=\"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"4\" rx=\"2\"/>","text":"ห้องสอบ"}
  ]'::jsonb
),
(
  'quick_link', 1, 'manual.html', '#0071e3',
  '<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>',
  'คู่มือเช็คชื่อ', 'ระบบกิจกรรม · เช็คชื่อ', '', null, null, '[]'::jsonb
),
(
  'quick_link', 2, 'manual-pp5.html', '#4f46e5',
  '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  'คู่มือ ปพ.5', 'ระบบบันทึกผลการเรียน', '', null, null, '[]'::jsonb
),
(
  'quick_link', 3, 'infographic.html', '#7c3aed',
  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  'Infographic', 'ภาพรวมระบบ A4', '', null, null, '[]'::jsonb
);
