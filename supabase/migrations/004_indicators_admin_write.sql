-- อนุญาตให้แอดมินเพิ่ม/แก้ไข/ลบตัวชี้วัดได้ (สำหรับฟีเจอร์นำเข้า/ส่งออก Excel ในหน้าตั้งค่า)
create policy "indicators_admin_write" on public.indicators for all
  using (is_admin() = true) with check (is_admin() = true);
