// ==UserScript==
// @name         Autofill SGS จากระบบ ปพ.5
// @namespace    pp5-sgs-autofill
// @version      2.6.0
// @description  วางคะแนนที่คัดลอกจากระบบ ปพ.5 ลงหน้ากรอกคะแนน SGS (sgs.bopp-obec.info) ให้อัตโนมัติ
// @match        https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx*
// @match        https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts2-Table.aspx*
// @run-at       document-idle
// @grant        none
// @updateURL    https://pp5-ten.vercel.app/sgs-autofill.user.js
// @downloadURL  https://pp5-ten.vercel.app/sgs-autofill.user.js
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

  // สรุปสถานะการแสดงผลจริงของ element ให้อ่านง่าย (ไม่ต้องเปิด DevTools เอง)
  function describeEl(el) {
    if (!el) return 'ไม่พบ element';
    const cs = getComputedStyle(el);
    return 'value="' + el.value + '" disabled=' + el.disabled +
      ' display=' + cs.display + ' visibility=' + cs.visibility + ' opacity=' + cs.opacity +
      ' ขนาด=' + el.offsetWidth + 'x' + el.offsetHeight;
  }

  // เติมค่าลงช่องเดียว — ไม่บังคับปลดล็อก ไม่จำลองกด Enter อีกต่อไป (ครูปลดล็อกคอลัมน์เองผ่านกล่องเช็คบล็อก
  // ของ SGS โดยตรง ปลอดภัยกว่าเพราะใช้กลไกจริงของ SGS ไม่ใช่การเดาพฤติกรรม JS ของเขา)
  // เก็บทุกช่องที่กรอกไว้ใน filledFields เพื่อเช็คซ้ำอีกทีตอนจบรอบ (ดูว่าค่าที่ตั้งไป "ติด" จริงไหม
  // หรือถูกอะไรบางอย่างล้าง/ซ่อนทิ้งภายหลัง) โดยไม่ต้องให้ครูเปิด DevTools เอง
  function applyValue(el, value) {
    el.focus();
    setNativeValue(el, value === '' || value == null ? '' : String(value));
    fireEvent(el, 'input');
    fireEvent(el, 'change');
    fireEvent(el, 'blur');
  }

  const filledFields = [];
  async function fillField(rowIdx, key, value, code) {
    const id = REPEATER_PREFIX + rowIdx + '_' + key;
    const el = document.getElementById(id);
    if (!el) { log('  [debug] ' + code + ' ' + key + ': ไม่พบ element id=' + id, true); return false; }
    if (el.disabled) { log('  [debug] ' + code + ' ' + key + ': ช่องยัง disabled อยู่ (SGS ยังไม่ปลดล็อกจริงแม้ติ๊กเช็คแล้ว)', true); return false; }
    applyValue(el, value);
    const rightAfter = describeEl(el);
    filledFields.push({ id, code, key, value: String(value) });
    await sleep(150);
    log('  [debug] ' + code + ' ' + key + ' ตั้งค่า="' + value + '" → ' + rightAfter);
    return true;
  }

  // เรียกหลังกรอกครบทุกช่องในรอบนี้แล้ว รอสักพักแล้วเช็คซ้ำทุกช่องอีกครั้งว่ายัง "ติด" อยู่ไหม
  // ถ้าเจอช่องไหนค่าหาย จะลองกรอกซ้ำให้อัตโนมัติอีก 1 ครั้ง (เผื่อเป็นจังหวะเวลาแค่ชั่วคราว)
  async function recheckFilledFields() {
    if (!filledFields.length) return;
    log('รอ 2 วินาทีแล้วตรวจสอบซ้ำทุกช่องที่กรอกไป...');
    await sleep(2000);
    const mismatches = filledFields.filter(({ id, value }) => {
      const el = document.getElementById(id);
      return !el || el.value !== value;
    });
    if (!mismatches.length) { log('ตรวจซ้ำแล้ว ทุกช่องยังมีค่าติดอยู่ครบ (ถ้าจอยังไม่ขึ้นตัวเลข ให้ส่ง log นี้กลับมาดูเพิ่ม)'); return; }
    log('พบ ' + mismatches.length + ' ช่องที่ค่าหายไปหลังรอ 2 วินาที — กำลังลองกรอกซ้ำอัตโนมัติ...', true);
    let fixedCount = 0;
    for (const { id, code, key, value } of mismatches) {
      const el = document.getElementById(id);
      if (!el) { log('  [ลองซ้ำ] ' + code + ' ' + key + ': ไม่พบ element แล้ว', true); continue; }
      applyValue(el, value);
      await sleep(200);
      const ok = el.value === value;
      log('  [ลองซ้ำ] ' + code + ' ' + key + ' → ' + describeEl(el), !ok);
      if (ok) fixedCount++;
    }
    log(fixedCount === mismatches.length
      ? 'ลองกรอกซ้ำสำเร็จครบทุกช่องแล้ว — ตรวจตัวเลขให้ครบอีกครั้งก่อนไปขั้นถัดไป'
      : ('ลองกรอกซ้ำแล้วยังเหลือ ' + (mismatches.length - fixedCount) + ' ช่องที่ยังไม่ติด — กรอกช่องนั้นด้วยมือ หรือคัดลอก log ส่งกลับมาดูเพิ่ม'));
  }

  // หาเลขประจำตัวนักเรียนของแถวนั้นจากข้อความในตาราง (ไม่ใช่ช่องกรอก)
  // หมายเหตุสำคัญ: ช่องกรอกคะแนนแต่ละช่องถูกห่อด้วย <table> ซ้อนอีกชั้น (คู่กับเครื่องหมาย *
  // ของตัว validator) ดังนั้น el.closest('tr') เพียงอย่างเดียวจะได้ <tr> ของตารางซ้อนข้างใน
  // (ที่ไม่มีข้อมูลนักเรียน) ไม่ใช่แถวจริงของตารางหลัก — ต้องไต่ขึ้นไปถึง <td class="ttc"> ที่ห่อ
  // ตารางซ้อนทั้งก้อนไว้ก่อน แล้วค่อยหา <tr> จากตรงนั้นถึงจะได้แถวจริง
  function getRowStudentCode(rowIdx, key) {
    const el = document.getElementById(REPEATER_PREFIX + rowIdx + '_' + key);
    if (!el) return null;
    const outerTd = el.closest('td.ttc');
    if (!outerTd) return null;
    const tr = outerTd.closest('tr');
    if (!tr) return null;
    const tds = tr.querySelectorAll(':scope > td.ttc');
    // ลำดับคอลัมน์ใน SGS: ห้อง, เลขที่, เลขประจำตัว, ชื่อ-นามสกุล, ...
    if (tds.length < 3) return null;
    return tds[2].textContent.trim();
  }

  // สแกนหน้าเว็บจริงแบบอ่านอย่างเดียว (ไม่แก้ไขอะไร) เพื่อดูว่า id ของช่องกรอกจริงเป็นแบบไหน
  // ใช้ตอนที่ id ที่สคริปต์เดาไว้ (REPEATER_PREFIX) หาช่องไม่เจอเลยสักช่อง
  function scanPage() {
    log('=== ผลสแกนหน้านี้ ===');
    const allInputs = document.querySelectorAll('input.field_input');
    log('พบช่องกรอกคะแนนทั้งหมด (class field_input): ' + allInputs.length + ' ช่อง');
    const sample = Array.from(allInputs).slice(0, 6);
    sample.forEach((el) => log('  id="' + el.id + '" disabled=' + el.disabled));
    if (allInputs.length > 6) log('  ... และอีก ' + (allInputs.length - 6) + ' ช่อง');

    // เช็คว่า checkbox คอลัมน์ที่เดาไว้มีจริงไหม
    FIELD_ORDER.forEach((key) => {
      const cbId = 'ctl00_PageContent_' + CHECKBOX_MAP[key];
      const cb = document.getElementById(cbId);
      log('checkbox ' + key + ' (id=' + cbId + '): ' + (cb ? ('พบ, checked=' + cb.checked) : 'ไม่พบ'));
    });

    // เช็คว่า element ตาม pattern ที่สคริปต์ใช้จริงมีไหม สำหรับแถว 00-05
    for (let i = 0; i < 6; i++) {
      const rowIdx = String(i).padStart(2, '0');
      const testId = REPEATER_PREFIX + rowIdx + '_' + FIELD_ORDER[0];
      const el = document.getElementById(testId);
      log('แถว ' + rowIdx + ' (id=' + testId + '): ' + (el ? 'พบ' : 'ไม่พบ'));
    }
    log('=== จบผลสแกน — คัดลอก log ทั้งหมดส่งกลับมาดูได้เลย ===');
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
    filledFields.length = 0;
    log('พบคอลัมน์ที่ปลดล็อกแล้ว: ' + activeKeys.join(', '));
    const MAX_ROWS = 60; // เผื่อตั้งจำนวนต่อหน้า (page size) ไว้มากกว่า 10 แถว
    for (const key of activeKeys) {
      if (stopRequested) break;
      log('กำลังกรอกคอลัมน์ ' + key + ' ...');
      let notFoundCount = 0;
      for (let i = 0; i < MAX_ROWS; i++) {
        if (stopRequested) break;
        const rowIdx = String(i).padStart(2, '0');
        const el = document.getElementById(REPEATER_PREFIX + rowIdx + '_' + key);
        if (!el) { notFoundCount++; continue; } // เกินจำนวนนักเรียนในหน้านี้แล้ว
        const code = getRowStudentCode(rowIdx, key);
        if (!code) { log('  [debug] แถว ' + rowIdx + ' คอลัมน์ ' + key + ': เจอช่องกรอกแต่หาเลขประจำตัวไม่เจอ', true); continue; }
        const data = dataStudents[code];
        if (!data) { log('ไม่พบข้อมูลเลขประจำตัว ' + code + ' ในไฟล์ที่วาง — ข้าม', true); continue; }
        const ok = await fillField(rowIdx, key, getValueForKey(data, key), code);
        if (!ok) log('เลขประจำตัว ' + code + ' คอลัมน์ ' + key + ' ยังกรอกไม่ได้ (อาจยังไม่ปลดล็อก)', true);
      }
      if (notFoundCount === MAX_ROWS) log('  [debug] ไม่พบช่องกรอกคอลัมน์ ' + key + ' เลยสักแถว (id ที่เดาไว้อาจไม่ตรงกับหน้านี้) — ลองกดปุ่ม "สแกนโครงสร้างหน้านี้" ดู', true);
    }
    log(stopRequested ? 'หยุดกลางคัน — ตรวจสอบคะแนนที่กรอกไปแล้วให้ดี' : 'กรอกครบคอลัมน์ที่ติ๊กไว้แล้ว — ตรวจตัวเลขให้ครบก่อนไปขั้นถัดไป');
    await recheckFilledFields();
    running = false;
  }

  function buildUI() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#fff;border:2px solid #0066cc;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.25);padding:12px;width:320px;font-family:sans-serif;font-size:13px;color:#111';
    wrap.innerHTML =
      '<div style="font-weight:700;margin-bottom:6px;color:#0066cc">📋 Autofill SGS จาก ปพ.5 (' + (isPage1 ? 'กลางภาค' : 'หลังกลางภาค') + ')</div>' +
      '<div style="font-size:11px;color:#555;margin-bottom:6px">1) ติ๊กกล่องเช็คบล็อกด้านบนคอลัมน์ที่จะกรอกในหน้า SGS เองก่อน 2) กดวางจากคลิปบอร์ด (หรือวางเอง) 3) กดเริ่มกรอก</div>' +
      '<textarea id="pp5-sgs-paste" placeholder="วาง JSON ที่คัดลอกจากปุ่ม &quot;Autofill SGS&quot; ในระบบ ปพ.5 ตรงนี้" style="width:100%;height:60px;font-size:11px;margin-bottom:6px;box-sizing:border-box"></textarea>' +
      '<button id="pp5-sgs-pasteclip" style="width:100%;margin-bottom:6px;padding:6px;background:#e0e7ff;color:#3730a3;border:1px solid #6366f1;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">📋 วางจากคลิปบอร์ด</button>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px">' +
      '<button id="pp5-sgs-start" style="flex:1;padding:6px;background:#0066cc;color:#fff;border:none;border-radius:6px;cursor:pointer">เริ่มกรอกคอลัมน์ที่ติ๊กไว้</button>' +
      '<button id="pp5-sgs-stop" style="padding:6px 10px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer">หยุด</button>' +
      '</div>' +
      '<button id="pp5-sgs-scan" style="width:100%;margin-bottom:6px;padding:5px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;cursor:pointer;font-size:11px">🔍 สแกนโครงสร้างหน้านี้ (ถ้ากรอกแล้วไม่ขึ้นเลย)</button>' +
      '<div id="pp5-sgs-log" style="max-height:160px;overflow-y:auto;background:#f5f5f5;border-radius:6px;padding:6px;font-size:11px;line-height:1.6"></div>' +
      '<button id="pp5-sgs-copylog" style="width:100%;margin-top:6px;padding:5px;background:#eee;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:11px">คัดลอก log ทั้งหมด (ส่งให้ผู้พัฒนาช่วยตรวจ)</button>' +
      '<div style="font-size:10px;color:#888;margin-top:6px">⚠️ ทดสอบกับนักเรียน 1 คนก่อน แล้วรีเฟรชหน้าตรวจว่าคะแนนถูกบันทึกจริง ก่อนกรอกทั้งห้อง</div>';
    document.body.appendChild(wrap);

    document.getElementById('pp5-sgs-pasteclip').onclick = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) { log('คลิปบอร์ดว่างเปล่า — ไปกดปุ่ม "Autofill SGS" ในระบบ ปพ.5 เพื่อคัดลอกคะแนนก่อน', true); return; }
        document.getElementById('pp5-sgs-paste').value = text;
        try { JSON.parse(text); log('วางข้อมูลจากคลิปบอร์ดแล้ว — ตรวจสอบว่าเป็นคะแนนถูกวิชาแล้วกด "เริ่มกรอกคอลัมน์ที่ติ๊กไว้"'); }
        catch (e) { log('วางข้อมูลจากคลิปบอร์ดแล้ว แต่ไม่ใช่รูปแบบ JSON ที่ถูกต้อง — ตรวจสอบว่าคัดลอกมาจากปุ่ม "Autofill SGS" ในระบบ ปพ.5 จริงหรือไม่', true); }
      } catch (e) {
        log('วางจากคลิปบอร์ดอัตโนมัติไม่สำเร็จ (' + e.message + ') — วางเองด้วย Ctrl+V ในกล่องข้อความแทนได้', true);
      }
    };
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
    document.getElementById('pp5-sgs-scan').onclick = () => scanPage();
    document.getElementById('pp5-sgs-copylog').onclick = async () => {
      const text = document.getElementById('pp5-sgs-log').innerText;
      try { await navigator.clipboard.writeText(text); log('คัดลอก log แล้ว'); }
      catch (e) { log('คัดลอกไม่สำเร็จ ลองเลือกข้อความใน log แล้วคัดลอกเอง', true); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();
})();
