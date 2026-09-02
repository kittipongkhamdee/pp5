-- แก้บั๊ก: ฟีเจอร์ "ครูออนไลน์" (Realtime Presence channel 'pp5-presence' ในหน้า ปพ.5)
-- ใช้งานไม่ได้เลยสำหรับทุกคน เพราะ realtime.messages เปิด RLS ไว้แต่ไม่มี policy เลย
-- (default-deny) — เพิ่ม policy จำกัดเฉพาะ topic 'pp5-presence' และเฉพาะผู้ใช้ที่ล็อกอินแล้ว

create policy "pp5_presence_select" on realtime.messages
  for select to authenticated
  using (realtime.topic() = 'pp5-presence');

create policy "pp5_presence_insert" on realtime.messages
  for insert to authenticated
  with check (realtime.topic() = 'pp5-presence');
