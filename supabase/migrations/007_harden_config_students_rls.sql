-- ปิดช่องโหว่สิทธิ์: ครูทุกคนเคยอ่าน/แก้ค่าอ่อนไหวใน config ได้ และลบนักเรียนได้ทุกคน
-- (รหัสผู้บริหารเดิมถูกเทียบฝั่งเบราว์เซอร์เท่านั้น ซึ่งข้ามได้)

-- 1) ตรวจรหัสผู้บริหารฝั่งเซิร์ฟเวอร์ — ไคลเอนต์จึงไม่ต้องอ่านค่ารหัสอีก
CREATE OR REPLACE FUNCTION public.verify_admin_password(pw text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT COALESCE((SELECT value FROM config WHERE key='admin_password'),'1234') = pw; $$;
REVOKE ALL ON FUNCTION public.verify_admin_password(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO authenticated;

-- 2) ลบนักเรียนโดยตรวจรหัสผู้บริหารซ้ำฝั่งเซิร์ฟเวอร์ (คงเวิร์กโฟลว์เดิมของครูที่รู้รหัส)
CREATE OR REPLACE FUNCTION public.delete_student_with_password(p_student_id uuid, pw text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
  IF NOT public.verify_admin_password(pw) THEN RAISE EXCEPTION 'รหัสผู้บริหารไม่ถูกต้อง'; END IF;
  DELETE FROM students WHERE id = p_student_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_student_with_password(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_student_with_password(uuid, text) TO authenticated;

-- 3) คีย์ config ที่ห้ามครูทั่วไปแตะ (ล็อกเฉพาะที่อันตราย เวิร์กโฟลว์อื่นไม่กระทบ)
CREATE OR REPLACE FUNCTION public.is_protected_config_key(k text)
RETURNS boolean LANGUAGE sql IMMUTABLE
AS $$ SELECT k IN ('admin_password','gemini_api_key','typhoon_api_key','maintenance_mode','maintenance_message'); $$;

-- 4) ซ่อนรหัสผู้บริหารจากครูทั่วไป
DROP POLICY IF EXISTS config_select ON config;
CREATE POLICY config_select ON config FOR SELECT
  USING (auth.role() = 'authenticated' AND (key <> 'admin_password' OR is_admin() = true));

-- 5) ครูทั่วไปเขียน config ได้ทุกคีย์ ยกเว้นคีย์อ่อนไหว
DROP POLICY IF EXISTS config_update ON config;
CREATE POLICY config_update ON config FOR UPDATE
  USING (auth.role() = 'authenticated' AND (is_admin() = true OR NOT public.is_protected_config_key(key)))
  WITH CHECK (auth.role() = 'authenticated' AND (is_admin() = true OR NOT public.is_protected_config_key(key)));

DROP POLICY IF EXISTS config_insert ON config;
CREATE POLICY config_insert ON config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND (is_admin() = true OR NOT public.is_protected_config_key(key)));

-- 6) เดิมไม่มี policy DELETE บน config เลย ทำให้ปุ่ม "ลบโลโก้" ลบไม่ได้จริงแบบเงียบๆ
DROP POLICY IF EXISTS config_delete ON config;
CREATE POLICY config_delete ON config FOR DELETE USING (is_admin() = true);

-- 7) ปิดการลบนักเรียนตรงๆ ให้เหลือเฉพาะแอดมิน (ครูที่รู้รหัสใช้ RPC ข้อ 2)
DROP POLICY IF EXISTS students_delete ON students;
CREATE POLICY students_delete ON students FOR DELETE USING (is_admin() = true);
