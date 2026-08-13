// ==UserScript==
// @name         Autofill SGS จากระบบ ปพ.5
// @namespace    pp5-sgs-autofill
// @version      2.0.0
// @description  วางคะแนนที่คัดลอกจากระบบ ปพ.5 ลงหน้ากรอกคะแนน SGS (sgs.bopp-obec.info) ให้อัตโนมัติ
// @match        https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx*
// @match        https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts2-Table.aspx*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// วิธีใช้:
// 1. ที่หน้า SGS ติ๊กกล่องเช็คบล็อกด้านบนคอลัมน์ที่ต้องการกรอกคะแนนด้วยตัวเองก่อน
//    (เช่น ติ๊กช่อง "1" เพื่อปลดล็อกคอลัมน์ S1 — สคริปต์นี้จะไม่ติ๊กให้อัตโนมัติ
//    เพื่อให้ครูควบคุมได้เองว่าจะปลดล็อกคอลัมน์ไหนตอนไหน)
// 2. วาง JSON ที่คัดลอกจากปุ่ม "Autofill SGS" ในระบบ ปพ.5 ลงกล่องมุมขวาล่าง
// 3. กด "เริ่มกรอก" — สคริปต์จะกรอกเฉพาะคอลัมน์ที่ติ๊กเช็คไว้แล้วเท่านั้น ไล่ทีละคอลัมน์
//    จากบนลงล่างจนครบทุกแถวในหน้านี้
//
// ⚠️ ทดสอบกับนักเรียน 1 คนก่อนเสมอ แล้วรีเฟรชหน้าเพื่อตรวจว่าคะแนนถูกบันทึกจริง
// ก่อนใช้กับทั้งห้อง — โครงสร้างหน้าเว็บนี้วิเคราะห์จาก HTML จริงที่ครูส่งมาให้ตอนพัฒนา
// แต่ SGS อาจเปลี่ยนแปลงได้ทุกเมื่อโดยไม่แจ้งล่วงหน้า

(function () {
  'use strict';

  const REPEATER_PREFIX = 'ctl00_PageContent_TblTranscriptsTableControlRepeater_ctl';
  const isPage1 = location.pathname.includes('TblTranscripts1'); // กลางภาค: S1-S9 + Midterm
  const isPage2 = location.pathname.includes('TblTranscripts2'); // หลังกลางภาค: S10-S18 + Final
  if (!isPage1 && !isPage2) return;

  // แต่ละคอลัมน์คะแนนมีกล่องเช็คบล็อกของตัวเอง (ctl00_PageContent_CheckX) ต้องติ๊กก่อนถึงจะกรอกช่องนั้นได้
  // key คือชื่อ field ต่อแถว (เช่น ctl00_..._ctl00_S1), value คือ id ของกล่องเช็คบล็อกระดับคอลัมน์
  const CHECKBOX_MAP = isPage1
    ? { S1: 'Check1', S2: 'Check2', S3: 'Check3', S4: 'Check4', S5: 'Check5', S6: 'Check6', S7: 'Check7', S8: 'Check8', S9: 'Check9', Midterm: 'CheckM' }
    : { S10: 'Check10', S11: 'Check11', S12: 'Check12', S13: 'Check13', S14: 'Check14', S15: 'Check15', S16: 'Check16', S17: 'Check17', S18: 'Check18', Final: 'CheckF' };

  const FIELD_ORDER = Object.keys(CHECKBOX_MAP);

  let running = false;
  let stopRequested = false;

  function log(msg, isErr) {
    const box = document.getElementById('pp5-sgs-log');
    if (!box) return;
    const line = document.createElement('div');
    line.textContent = msg;
    line.style.color = isErr ? '#dc2626' : '#111';
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  // ตั้งค่า .value ผ่าน native setter กัน framework บาง framework hook property setter ปกติทับไว้
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  function fireEvent(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }

  function isColumnUnlocked(key) {
    const cb = document.getElementById('ctl00_PageContent_' + CHECKBOX_MAP[key]);
    return !!(cb && cb.checked);
  }

  // เติมค่าลงช่องเดียว — ไม่บังคับปลดล็อก ไม่จำลองกด Enter อีกต่อไป (ครูปลดล็อกคอลัมน์เองผ่านกล่องเช็คบล็อก
  // ของ SGS โดยตรง ปลอดภัยกว่าเพราะใช้กลไกจริงของ SGS ไม่ใช่การเดาพฤติกรรม JS ของเขา)
  async function fillField(rowIdx, key, value) {
    const el = document.getElementById(REPEATER_PREFIX + rowIdx + '_' + key);
    if (!el || el.disabled) return false; // ยังไม่ปลดล็อก (ไม่ได้ติ๊กช่องเช็คคอลัมน์นี้)
    el.focus();
    setNativeValue(el, value === '' || value == null ? '' : String(value));
    fireEvent(el, 'input');
    fireEvent(el, 'change');
    fireEvent(el, 'blur');
    await sleep(150); // เผื่อเวลาระบบ SGS บันทึกอัตโนมัติ
    return true;
  }

  // หาเลขประจำตัวนักเรียนของแถวนั้นจากข้อความในตาราง (ไม่ใช่ช่องกรอก)
  function getRowStudentCode(rowIdx, key) {
    const el = document.getElementById(REPEATER_PREFIX + rowIdx + '_' + key);
    if (!el) return null;
    const tr = el.closest('tr');
    if (!tr) return null;
    const tds = tr.querySelectorAll('td.ttc');
    // ลำดับคอลัมน์ใน SGS: ห้อง, เลขที่, เลขประจำตัว, ชื่อ-นามสกุล, ...
    if (tds.length < 3) return null;
    return tds[2].textContent.trim();
  }

  function getValueForKey(data, key) {
    if (key === 'Midterm') return data.mid;
    if (key === 'Final') return data.final;
    const num = parseInt(key.replace('S', ''), 10);
    const idx = isPage1 ? num - 1 : num - 10;
    const arr = isPage1 ? (data.before || []) : (data.after || []);
    return arr[idx];
  }

  async function runFill(dataStudents) {
    if (running) { log('กำลังทำงานอยู่ รอให้เสร็จก่อน', true); return; }
    const activeKeys = FIELD_ORDER.filter(isColumnUnlocked);
    if (!activeKeys.length) {
      log('ยังไม่ได้ติ๊กช่องเช็คบล็อกของคอลัมน์ไหนเลย — ติ๊กคอลัมน์ที่ต้องการกรอกในหน้า SGS ก่อน แล้วกดเริ่มใหม่', true);
      return;
    }
    running = true;
    stopRequested = false;
    log('พบคอลัมน์ที่ปลดล็อกแล้ว: ' + activeKeys.join(', '));
    for (const key of activeKeys) {
      if (stopRequested) break;
      log('กำลังกรอกคอลัมน์ ' + key + ' ...');
      for (let i = 0; i < 10; i++) {
        if (stopRequested) break;
        const rowIdx = String(i).padStart(2, '0');
        const code = getRowStudentCode(rowIdx, key);
        if (!code) continue; // หน้าสุดท้ายอาจมีนักเรียนไม่ครบ 10 คน
        const data = dataStudents[code];
        if (!data) { log('ไม่พบข้อมูลเลขประจำตัว ' + code + ' ในไฟล์ที่วาง — ข้าม', true); continue; }
        const ok = await fillField(rowIdx, key, getValueForKey(data, key));
        if (!ok) log('เลขประจำตัว ' + code + ' คอลัมน์ ' + key + ' ยังกรอกไม่ได้ (อาจยังไม่ปลดล็อก)', true);
      }
    }
    log(stopRequested ? 'หยุดกลางคัน — ตรวจสอบคะแนนที่กรอกไปแล้วให้ดี' : 'กรอกครบคอลัมน์ที่ติ๊กไว้แล้ว — ตรวจตัวเลขให้ครบก่อนไปขั้นถัดไป');
    running = false;
  }

  function buildUI() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#fff;border:2px solid #0066cc;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.25);padding:12px;width:320px;font-family:sans-serif;font-size:13px;color:#111';
    wrap.innerHTML =
      '<div style="font-weight:700;margin-bottom:6px;color:#0066cc">📋 Autofill SGS จาก ปพ.5 (' + (isPage1 ? 'กลางภาค' : 'หลังกลางภาค') + ')</div>' +
      '<div style="font-size:11px;color:#555;margin-bottom:6px">1) ติ๊กกล่องเช็คบล็อกด้านบนคอลัมน์ที่จะกรอกในหน้า SGS เองก่อน 2) วาง JSON ด้านล่าง 3) กดเริ่มกรอก</div>' +
      '<textarea id="pp5-sgs-paste" placeholder="วาง JSON ที่คัดลอกจากปุ่ม &quot;Autofill SGS&quot; ในระบบ ปพ.5 ตรงนี้" style="width:100%;height:60px;font-size:11px;margin-bottom:6px;box-sizing:border-box"></textarea>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px">' +
      '<button id="pp5-sgs-start" style="flex:1;padding:6px;background:#0066cc;color:#fff;border:none;border-radius:6px;cursor:pointer">เริ่มกรอกคอลัมน์ที่ติ๊กไว้</button>' +
      '<button id="pp5-sgs-stop" style="padding:6px 10px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer">หยุด</button>' +
      '</div>' +
      '<div id="pp5-sgs-log" style="max-height:120px;overflow-y:auto;background:#f5f5f5;border-radius:6px;padding:6px;font-size:11px;line-height:1.6"></div>' +
      '<div style="font-size:10px;color:#888;margin-top:6px">⚠️ ทดสอบกับนักเรียน 1 คนก่อน แล้วรีเฟรชหน้าตรวจว่าคะแนนถูกบันทึกจริง ก่อนกรอกทั้งห้อง</div>';
    document.body.appendChild(wrap);

    document.getElementById('pp5-sgs-start').onclick = () => {
      const raw = document.getElementById('pp5-sgs-paste').value.trim();
      if (!raw) { log('กรุณาวาง JSON ก่อน', true); return; }
      let payload;
      try { payload = JSON.parse(raw); }
      catch (e) { log('อ่าน JSON ไม่สำเร็จ: ' + e.message, true); return; }
      if (!payload.students) { log('รูปแบบข้อมูลไม่ถูกต้อง (ไม่พบ students)', true); return; }
      runFill(payload.students);
    };
    document.getElementById('pp5-sgs-stop').onclick = () => { stopRequested = true; };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();
})();
