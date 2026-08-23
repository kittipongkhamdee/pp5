-- โรงเรียนกำหนดสิทธิ์ "จัดการนักเรียน" ผ่าน menu_permissions.menu_key='students' อยู่แล้ว
-- (หน้า "นักเรียน" ใน ปพ.5 gate ด้วยสิทธิ์นี้ และทุกจุดที่เขียนข้อมูลนักเรียนอยู่ในหน้านั้น)
-- แต่ RLS เดิมปล่อยให้ครูทุกคนเพิ่ม/แก้ไขนักเรียนได้ ไม่ตรงกับที่ตั้งใจไว้ จึงปรับให้ตรงกัน

CREATE OR REPLACE FUNCTION public.has_menu_permission(k text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM menu_permissions mp
                 WHERE mp.teacher_id = auth.uid() AND mp.menu_key = k);
$$;
REVOKE ALL ON FUNCTION public.has_menu_permission(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_menu_permission(text) TO authenticated;

-- อ่านได้ทุกคนเหมือนเดิม (หน้าคะแนน/เวลาเรียน/ประเมิน ต้องใช้ข้อมูลนักเรียน)
-- เพิ่ม/แก้ไข = แอดมิน หรือครูที่ได้รับสิทธิ์ "นักเรียน" เท่านั้น
DROP POLICY IF EXISTS students_insert ON students;
CREATE POLICY students_insert ON students FOR INSERT
  WITH CHECK (is_admin() = true OR public.has_menu_permission('students'));

DROP POLICY IF EXISTS students_update ON students;
CREATE POLICY students_update ON students FOR UPDATE
  USING (is_admin() = true OR public.has_menu_permission('students'))
  WITH CHECK (is_admin() = true OR public.has_menu_permission('students'));

-- ลบตรงๆ ยังสงวนให้แอดมิน ส่วนครูที่ได้รับสิทธิ์ลบผ่าน RPC ที่ตรวจรหัสผู้บริหารซ้ำ
-- (RPC เพิ่มเงื่อนไขสิทธิ์ด้วย ไม่ใช่แค่รหัสถูก เพื่อไม่ให้ครูที่ไม่ได้รับมอบหมายลบได้)
CREATE OR REPLACE FUNCTION public.delete_student_with_password(p_student_id uuid, pw text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
  IF NOT (is_admin() = true OR public.has_menu_permission('students')) THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่ได้รับสิทธิ์จัดการนักเรียน';
  END IF;
  IF NOT public.verify_admin_password(pw) THEN
    RAISE EXCEPTION 'รหัสผู้บริหารไม่ถูกต้อง';
  END IF;
  DELETE FROM students WHERE id = p_student_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_student_with_password(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_student_with_password(uuid, text) TO authenticated;
