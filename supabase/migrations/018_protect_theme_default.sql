-- ธีมเริ่มต้นของโรงเรียน (config.theme_default) ให้แก้ได้เฉพาะแอดมิน — ธีมของครูแต่ละคน (theme_u_<uid>) ยังแก้เองได้
-- ฟังก์ชันนี้ใช้ร่วมกับระบบ exam: เพิ่มคีย์อย่างเดียว คีย์เดิมคงไว้ทั้งหมด
create or replace function public.is_protected_config_key(k text) returns boolean language sql immutable as $$
  select k in ('admin_password','gemini_api_key','typhoon_api_key','maintenance_mode','maintenance_message','watchlist_enabled','ai_assistant_enabled','exam_rules_notice','theme_default');
$$;
