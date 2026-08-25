-- สวิตช์เปิด/ปิดผู้ช่วยครู AI (config.ai_assistant_enabled)
-- เป็นค่าระดับโรงเรียน ตั้งได้จากหน้า ตั้งค่า > แอดมิน เท่านั้น จึงต้องกันครูทั่วไปเขียนทับ
-- (ไม่งั้นครูคนเดียวเปิดกลับเองได้ ทั้งที่ปิดไว้เพราะโควต้า Gemini ใกล้หมด)
CREATE OR REPLACE FUNCTION public.is_protected_config_key(k text)
RETURNS boolean LANGUAGE sql IMMUTABLE
AS $$ SELECT k IN ('admin_password','gemini_api_key','typhoon_api_key','maintenance_mode','maintenance_message','watchlist_enabled','ai_assistant_enabled'); $$;
