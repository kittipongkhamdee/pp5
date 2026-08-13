// ==UserScript==
// @name         Autofill SGS จากระบบ ปพ.5
// @namespace    pp5-sgs-autofill
// @version      1.0.0
// @description  วางคะแนนที่คัดลอกจากระบบ ปพ.5 ลงหน้ากรอกคะแนน SGS (sgs.bopp-obec.info) ให้อัตโนมัติ
// @match        https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx*
// @match        https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts2-Table.aspx*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// ⚠️ สคริปต์นี้เขียนจากการวิเคราะห์โครงสร้าง HTML จริงของหน้า SGS ที่ครูส่งมาให้ตอนพัฒนา
// แต่ SGS อาจเปลี่ยนโครงสร้างหน้าเว็บได้ทุกเมื่อโดยไม่แจ้งล่วงหน้า และมีจุดที่ยืนยัน
// การทำงานจริงของ JavaScript ฝั่ง SGS ไม่ได้ 100% (ไฟล์ JS ของเขาไม่ได้ถูกบันทึกมาด้วย)
// ก่อนใช้งานจริงกับทั้งห้อง ให้ทดสอบกับนักเรียน "1 คน" ก่อนเสมอ แล้ว "รีเฟรชหน้า" เพื่อ
// ตรวจว่าคะแนนถูกบันทึกลงเซิร์ฟเวอร์จริง ไม่ใช่แค่ขึ้นในช่องกรอกเฉยๆ

(function () {
  'use strict';

  const REPEATER_PREFIX = 'ctl00_PageContent_TblTranscriptsTableControlRepeater_ctl';
  const isPage1 = location.pathname.includes('TblTranscripts1'); // กลางภาค: S1-S9 + Midterm
  const isPage2 = location.pathname.includes('TblTranscripts2'); // หลังกลางภาค: S10-S18 + Final
  if (!isPage1 && !isPage2) return;

  // ลำดับช่องที่ต้องกรอกต่อแถว ต้องกรอกครบตามลำดับนี้เสมอ (ช่องว่างก็ต้องกรอกผ่าน เพราะ
  // SGS ล็อกช่องถัดไปไว้จนกว่าจะกด Enter ในช่องก่อนหน้า)
  const FIELD_CHAIN = isPage1
    ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'Midterm']
    : ['S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'Final'];

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

  function fireKeyEnter(el) {
    ['keydown', 'keypress', 'keyup'].forEach((type) => {
      el.dispatchEvent(new KeyboardEvent(type, {
        bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      }));
    });
  }

  async function fillField(rowIdx, key, value) {
    const id = REPEATER_PREFIX + rowIdx + '_' + key;
    const el = document.getElementById(id);
    if (!el) return false;
    el.disabled = false; // กันกรณี SGS ยังไม่ปลดล็อกช่องนี้ให้ทัน
    el.focus();
    setNativeValue(el, value === '' || value == null ? '' : String(value));
    fireEvent(el, 'input');
    fireEvent(el, 'change');
    await sleep(90);
    fireKeyEnter(el); // จำลองกด Enter ตามที่หน้า SGS ออกแบบไว้ให้เลื่อนไปช่องถัดไป + บันทึก
    await sleep(260); // เผื่อเวลาระบบ SGS บันทึกและปลดล็อกช่องถัดไป
    return true;
  }

  // หาเลขประจำตัวนักเรียนของแถวนั้นจากข้อความในตาราง (ไม่ใช่ช่องกรอก)
  function getRowStudentCode(rowIdx) {
    const firstInput = document.getElementById(REPEATER_PREFIX + rowIdx + '_' + FIELD_CHAIN[0]);
    if (!firstInput) return null;
    const tr = firstInput.closest('tr');
    if (!tr) return null;
    const tds = tr.querySelectorAll('td.ttc');
    // ลำดับคอลัมน์ใน SGS: ห้อง, เลขที่, เลขประจำตัว, ชื่อ-นามสกุล, ...
    if (tds.length < 3) return null;
    return tds[2].textContent.trim();
  }

  async function runFill(dataStudents) {
    if (running) { log('กำลังทำงานอยู่ รอให้เสร็จก่อน', true); return; }
    running = true;
    stopRequested = false;
    log('เริ่มกรอกคะแนนหน้านี้ (' + (isPage1 ? 'กลางภาค' : 'หลังกลางภาค') + ')...');
    for (let i = 0; i < 10; i++) {
      if (stopRequested) { log('หยุดแล้ว'); break; }
      const rowIdx = String(i).padStart(2, '0');
      const code = getRowStudentCode(rowIdx);
      if (!code) continue; // หน้าสุดท้ายอาจมีนักเรียนไม่ครบ 10 คน
      const data = dataStudents[code];
      if (!data) { log('ไม่พบข้อมูลเลขประจำตัว ' + code + ' ในไฟล์ที่วาง — ข้ามแถวนี้', true); continue; }
      log('กำลังกรอก ' + code + ' ' + (data.name || ''));
      const scores = isPage1 ? [...data.before, data.mid] : [...data.after, data.final];
      for (let f = 0; f < FIELD_CHAIN.length; f++) {
        if (stopRequested) break;
        await fillField(rowIdx, FIELD_CHAIN[f], scores[f]);
      }
    }
    log(stopRequested ? 'หยุดกลางคัน — ตรวจสอบคะแนนที่กรอกไปแล้วให้ดี' : 'กรอกครบทุกแถวในหน้านี้แล้ว — ตรวจตัวเลขให้ครบก่อนไปหน้าถัดไป');
    running = false;
  }

  function buildUI() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#fff;border:2px solid #0066cc;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.25);padding:12px;width:320px;font-family:sans-serif;font-size:13px;color:#111';
    wrap.innerHTML =
      '<div style="font-weight:700;margin-bottom:6px;color:#0066cc">📋 Autofill SGS จาก ปพ.5 (' + (isPage1 ? 'กลางภาค' : 'หลังกลางภาค') + ')</div>' +
      '<textarea id="pp5-sgs-paste" placeholder="วาง JSON ที่คัดลอกจากปุ่ม &quot;Autofill SGS&quot; ในระบบ ปพ.5 ตรงนี้" style="width:100%;height:60px;font-size:11px;margin-bottom:6px;box-sizing:border-box"></textarea>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px">' +
      '<button id="pp5-sgs-start" style="flex:1;padding:6px;background:#0066cc;color:#fff;border:none;border-radius:6px;cursor:pointer">เริ่มกรอกหน้านี้</button>' +
      '<button id="pp5-sgs-stop" style="padding:6px 10px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer">หยุด</button>' +
      '</div>' +
      '<div id="pp5-sgs-log" style="max-height:120px;overflow-y:auto;background:#f5f5f5;border-radius:6px;padding:6px;font-size:11px;line-height:1.6"></div>' +
      '<div style="font-size:10px;color:#888;margin-top:6px">⚠️ ทดสอบกับนักเรียน 1 คนก่อน แล้วรีเฟรชหน้าตรวจว่าคะแนนถูกบันทึกจริง ก่อนกรอกทั้งห้อง สคริปต์กรอกทีละหน้า (10 คน) ทำหน้านี้เสร็จแล้วค่อยกด "หน้าถัดไป" ของ SGS เองแล้วกดเริ่มใหม่</div>';
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
