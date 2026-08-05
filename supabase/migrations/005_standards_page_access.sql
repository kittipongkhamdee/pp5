-- หน้า "มาตรฐานและตัวชี้วัด" — เปิดให้แอดมิน และครูที่แอดมินให้สิทธิ์ผ่าน menu_permissions เข้าดู/แก้ไขได้

-- อนุญาตให้ menu_permissions.menu_key มีค่า 'standards' ได้ (เดิมมีแค่ settings/school_report/students)
alter table public.menu_permissions drop constraint menu_permissions_menu_key_check;
alter table public.menu_permissions add constraint menu_permissions_menu_key_check
  check (menu_key = any (array['settings','school_report','students','standards']));

-- แทนที่ policy เขียนตารางตัวชี้วัดเดิม (แอดมินเท่านั้น) ด้วย policy ที่ครอบคลุมครูที่ได้รับสิทธิ์ด้วย
drop policy if exists "indicators_admin_write" on public.indicators;
create policy "indicators_write_granted" on public.indicators for all
  using (
    is_admin() = true
    or exists (select 1 from public.menu_permissions mp where mp.teacher_id = auth.uid() and mp.menu_key = 'standards')
  )
  with check (
    is_admin() = true
    or exists (select 1 from public.menu_permissions mp where mp.teacher_id = auth.uid() and mp.menu_key = 'standards')
  );
