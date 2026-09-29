// Autofill SGS จากระบบ ปพ.5
// วางคะแนนที่คัดลอกจากระบบ ปพ.5 ลงหน้ากรอกคะแนน SGS (sgs.bopp-obec.info) ให้อัตโนมัติ
//
// รองรับ 4 หน้า: กลางภาค (TblTranscripts1) / หลังกลางภาค (TblTranscripts2) /
// คุณลักษณะอันพึงประสงค์ (TblTranscriptsQ) / อ่าน คิดวิเคราะห์ และเขียน (TblTranscriptsL)
//
// วิธีใช้:
// 1. ที่หน้า SGS ติ๊กกล่องเช็คบล็อกด้านบนคอลัมน์ที่ต้องการกรอกคะแนนด้วยตัวเองก่อน
//    (เช่น ติ๊กช่อง "1" เพื่อปลดล็อกคอลัมน์ S1 — ส่วนขยายนี้จะไม่ติ๊กให้อัตโนมัติ
//    เพื่อให้ครูควบคุมได้เองว่าจะปลดล็อกคอลัมน์ไหนตอนไหน)
// 2. วาง JSON ที่คัดลอกจากปุ่ม "Autofill SGS" ในระบบ ปพ.5 ลงกล่องมุมขวาล่าง
// 3. กด "เริ่มกรอก" — จะกรอกเฉพาะคอลัมน์ที่ติ๊กเช็คไว้แล้วเท่านั้น ไล่ทีละคอลัมน์
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
  // หน้าบันทึกผลประเมิน: Q = คุณลักษณะอันพึงประสงค์ (หัวข้อ 1-10), L = อ่าน คิดวิเคราะห์ และเขียน (หัวข้อ 1-5)
  const evalKind = location.pathname.includes('TblTranscriptsQ') ? 'char'
    : location.pathname.includes('TblTranscriptsL') ? 'read' : null;
  const isEval = !!evalKind;
  if (!isPage1 && !isPage2 && !isEval) return;

  // แต่ละคอลัมน์คะแนนมีกล่องเช็คบล็อกของตัวเอง (ctl00_PageContent_CheckX) ต้องติ๊กก่อนถึงจะกรอกช่องนั้นได้
  // key คือชื่อ field ต่อแถว (เช่น ctl00_..._ctl00_S1), value คือ id ของกล่องเช็คบล็อกระดับคอลัมน์
  const CHECKBOX_MAP = isEval ? {} : isPage1
    ? { S1: 'Check1', S2: 'Check2', S3: 'Check3', S4: 'Check4', S5: 'Check5', S6: 'Check6', S7: 'Check7', S8: 'Check8', S9: 'Check9', Midterm: 'CheckM' }
    : { S10: 'Check10', S11: 'Check11', S12: 'Check12', S13: 'Check13', S14: 'Check14', S15: 'Check15', S16: 'Check16', S17: 'Check17', S18: 'Check18', Final: 'CheckF' };

  const FIELD_ORDER = Object.keys(CHECKBOX_MAP);

  // เลขรุ่นที่แสดงในกล่อง: ส่วนขยายอ่านจาก manifest.json (สคริปต์ Tampermonkey ถูกแทนที่บรรทัดนี้ตอนสร้างไฟล์)
  const APP_VERSION = (() => { try { return 'ส่วนขยาย v' + chrome.runtime.getManifest().version; } catch (e) { return ''; } })();
  const DEVELOPER = 'นายกิตติพงษ์ คำดี';

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

  // เติมค่าลงช่องเดียว — ไม่บังคับปลดล็อก ไม่จำลองกด Enter (ครูปลดล็อกคอลัมน์เองผ่านกล่องเช็คบล็อก
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
    if (!filledFields.length) return false;
    log('รอ 2 วินาทีแล้วตรวจสอบซ้ำทุกช่องที่กรอกไป...');
    await sleep(2000);
    const mismatches = filledFields.filter(({ id, value }) => {
      const el = document.getElementById(id);
      return !el || el.value !== value;
    });
    if (!mismatches.length) { log('ตรวจซ้ำแล้ว ทุกช่องยังมีค่าติดอยู่ครบ (ถ้าจอยังไม่ขึ้นตัวเลข ให้ส่ง log นี้กลับมาดูเพิ่ม)'); return true; }
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
    return fixedCount === mismatches.length;
  }

  // ── กดปุ่ม "บันทึก" ของ SGS ให้ (ตัวเลือก ปิดไว้เป็นค่าเริ่มต้น) ──
  // ปุ่มบันทึกของ SGS คือ <input type="image" title="บันทึก" id="...SaveButton"> บันทึกทั้งหน้าที่แสดงอยู่
  // กดให้เฉพาะเมื่อ: รหัสวิชาตรง (ตรวจตอนกดเริ่มแล้ว) + ตรวจซ้ำแล้วทุกช่องค่ายังอยู่ + ไม่ได้กดหยุด
  // ไม่ถามยืนยันก่อนกด (ครูเลือกเปิด "กดปุ่มบันทึก" เองแล้ว) เพราะบันทึกลงระบบราชการแล้วย้อนยาก จึงยังต้องผ่านเงื่อนไขข้างบนครบ
  function findSaveButton() {
    const btns = Array.from(document.querySelectorAll('input[type="image"]'))
      .filter((b) => b.title === 'บันทึก' || /SaveButton$/.test(b.id));
    return btns.length === 1 ? btns[0] : null;
  }
  async function maybeAutoSave(verified) {
    const cb = document.getElementById('pp5-sgs-autosave');
    if (!cb || !cb.checked) return;
    if (stopRequested) { log('หยุดกลางคัน — ไม่กดบันทึกให้', true); return; }
    if (!verified) { log('ยังมีช่องที่ค่าไม่ติด หรือไม่ได้กรอกเลย — ไม่กดบันทึกให้ ตรวจตัวเลขแล้วกดบันทึกเอง', true); return; }
    const btn = findSaveButton();
    if (!btn) { log('หาปุ่มบันทึกของ SGS ไม่เจอ (หรือเจอมากกว่า 1 ปุ่ม) — กดบันทึกเอง', true); return; }
    const chainCb = document.getElementById('pp5-sgs-chain');
    const isMid = isPage1 || isPage2;
    const willChain = (isMid || evalKind === 'char') && !!chainCb && chainCb.checked && !!(lastPayload && lastPayload.subject_code);
    if (willChain) {
      const g = findGroupSelect();
      const go = g && g.options[g.selectedIndex];
      saveChain({ step: isMid ? 'goQ' : 'goL', code: lastPayload.subject_code, group: go ? { value: go.value, text: go.text.trim() } : null, tries: 0 });
    }
    log('กดปุ่มบันทึกของ SGS แล้ว — รอหน้ารีโหลด แล้วตรวจว่าค่าถูกบันทึกจริง (ข้อมูลที่วางยังจำไว้ให้ ไม่ต้องวางใหม่)');
    btn.click();
    if (willChain) { await sleep(6000); if (isMid) afterSaveOnMid(); else afterSaveOnQ(); } // ถ้าหน้ารีโหลดเต็มหน้า สคริปต์นี้ตายก่อน หน้าใหม่จะเรียกขั้นต่อไปเอง
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
  // ใช้ตอนที่ id ที่เดาไว้ (REPEATER_PREFIX) หาช่องไม่เจอเลยสักช่อง
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

    // เช็คว่า element ตาม pattern ที่ใช้จริงมีไหม สำหรับแถว 00-05
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

  // ── ช่อง "Remark" (หมายเหตุ) ของ SGS — ใช้ใส่ "ผลพิเศษ" จากระบบ ปพ.5 (ร / มส / มผ / ผ) ──
  // หาจากหัวคอลัมน์ที่เขียนว่า Remark (ไม่ผูกกับ id ตายตัว) และใช้กล่องเช็คบล็อกในหัวคอลัมน์เดียวกันเป็นตัวปลดล็อก
  function findRemarkLayout() {
    for (const tr of Array.from(document.querySelectorAll('tr'))) {
      const cells = Array.from(tr.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
      const texts = cells.map((c) => c.textContent.replace(/\s+/g, ' ').trim());
      const codeIdx = texts.findIndex((t) => t === 'เลขประจำตัว' || t === 'รหัสนักเรียน');
      const remIdx = texts.findIndex((t) => /^remark$/i.test(t));
      if (codeIdx < 0 || remIdx < 0) continue;
      return { headerRow: tr, table: tr.closest('table'), codeIdx, remIdx, checkbox: cells[remIdx].querySelector('input[type=checkbox]') };
    }
    return null;
  }
  let remarkInputSeq = 0;
  async function fillRemarks(dataStudents) {
    const lay = findRemarkLayout();
    const hasSpecial = Object.keys(dataStudents).some((c) => dataStudents[c] && dataStudents[c].special);
    if (!lay) { if (hasSpecial) log('มีผลพิเศษในข้อมูลที่วาง แต่ไม่พบคอลัมน์ Remark ในหน้านี้ — ข้าม', true); return; }
    if (lay.checkbox && !lay.checkbox.checked) {
      if (hasSpecial) log('มีผลพิเศษ (ร/มส/มผ/ผ) ในข้อมูลที่วาง — ติ๊กช่องเช็คบล็อกที่หัวคอลัมน์ Remark แล้วกดเริ่มใหม่ หากต้องการให้กรอก');
      return;
    }
    log('กำลังกรอกคอลัมน์ Remark (ผลพิเศษ) ...');
    let n = 0;
    for (const tr of Array.from(lay.table.rows)) {
      if (stopRequested) break;
      if (tr === lay.headerRow) continue;
      const cells = Array.from(tr.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
      const codeCell = cells[lay.codeIdx];
      const code = codeCell ? codeCell.textContent.trim() : '';
      if (!/^\d+$/.test(code)) continue;
      const data = dataStudents[code];
      const val = data && data.special;
      if (!val) continue; // ไม่มีผลพิเศษ = ไม่แตะช่อง Remark (ไม่เขียนทับหมายเหตุที่ครูพิมพ์ไว้)
      const inp = evalCellInput(cells[lay.remIdx]);
      if (!inp) { log('  [debug] ' + code + ' Remark: ไม่พบช่องกรอก', true); continue; }
      if (inp.disabled || inp.readOnly) { log('  [debug] ' + code + ' Remark: ช่องยังถูกล็อกอยู่', true); continue; }
      if (!inp.id) inp.id = 'pp5-rm-' + (remarkInputSeq++);
      applyValue(inp, val);
      filledFields.push({ id: inp.id, code, key: 'Remark', value: String(val) });
      await sleep(60);
      n++;
    }
    log('กรอก Remark (ผลพิเศษ) แล้ว ' + n + ' ช่อง');
  }

  async function runFill(dataStudents) {
    if (running) { log('กำลังทำงานอยู่ รอให้เสร็จก่อน', true); return; }
    const activeKeys = FIELD_ORDER.filter(isColumnUnlocked);
    const remLay = findRemarkLayout();
    const remarkOn = !!(remLay && remLay.checkbox && remLay.checkbox.checked);
    if (!activeKeys.length && !remarkOn) {
      log('ยังไม่ได้ติ๊กช่องเช็คบล็อกของคอลัมน์ไหนเลย — ติ๊กคอลัมน์ที่ต้องการกรอกในหน้า SGS ก่อน แล้วกดเริ่มใหม่', true);
      return;
    }
    running = true;
    stopRequested = false;
    filledFields.length = 0;
    log('พบคอลัมน์ที่ปลดล็อกแล้ว: ' + activeKeys.concat(remarkOn ? ['Remark'] : []).join(', '));
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
    await fillRemarks(dataStudents);
    log(stopRequested ? 'หยุดกลางคัน — ตรวจสอบคะแนนที่กรอกไปแล้วให้ดี' : 'กรอกครบคอลัมน์ที่ติ๊กไว้แล้ว — ตรวจตัวเลขให้ครบก่อนไปขั้นถัดไป');
    const verified = await recheckFilledFields();
    running = false;
    await maybeAutoSave(verified);
  }

  // ══ โหมดผลประเมิน (หน้า Q คุณลักษณะฯ / หน้า L อ่าน คิดวิเคราะห์ และเขียน) ══
  // ยังไม่ทราบ id จริงของช่องกรอกในสองหน้านี้ จึงอ่านโครงตารางแทน: หาแถวหัวตารางที่มี "ผลการประเมิน" กับ
  // หัวคอลัมน์รหัสนักเรียน แล้วจับคู่ช่องกรอกด้วยตำแหน่งคอลัมน์ (หัวคอลัมน์ตัวเลข 1,2,3... = หัวข้อที่ 1,2,3...)
  function evalCells(tr) {
    return Array.from(tr.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
  }
  function evalTableLayout() {
    for (const tr of Array.from(document.querySelectorAll('tr'))) {
      const texts = evalCells(tr).map((c) => c.textContent.replace(/\s+/g, ' ').trim());
      const codeIdx = texts.findIndex((t) => t === 'เลขประจำตัว' || t === 'รหัสนักเรียน');
      const resIdx = texts.findIndex((t) => t === 'ผลการประเมิน');
      if (codeIdx < 0 || resIdx < 0) continue;
      const items = {};
      texts.forEach((t, i) => { if (/^\d+$/.test(t)) items[parseInt(t, 10)] = i; });
      return { headerRow: tr, table: tr.closest('table'), codeIdx, resIdx, items };
    }
    return null;
  }
  function evalCellInput(cell) {
    return cell ? cell.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=hidden])') : null;
  }
  // ไม่กรอกช่อง "ผลการประเมิน" (ผลรวม) — SGS คำนวณเองจากคะแนนแต่ละหัวข้อ (ใช้หัวคอลัมน์นี้แค่ช่วยหาตำแหน่งตาราง)
  let evalInputSeq = 0;
  async function runEvalFill(dataStudents) {
    if (running) { log('กำลังทำงานอยู่ รอให้เสร็จก่อน', true); return; }
    const layout = evalTableLayout();
    if (!layout) { log('ไม่พบตารางบันทึกผลในหน้านี้ (หาหัวคอลัมน์ "ผลการประเมิน" ไม่เจอ) — ลองกดปุ่ม "สแกนโครงสร้างหน้านี้"', true); return; }
    running = true;
    stopRequested = false;
    filledFields.length = 0;
    const itemNos = Object.keys(layout.items).map(Number).sort((a, b) => a - b);
    const lockedItems = new Set();
    let students = 0;
    let missingData = false;
    for (const tr of Array.from(layout.table.rows)) {
      if (stopRequested) break;
      if (tr === layout.headerRow) continue;
      const cells = evalCells(tr);
      const codeCell = cells[layout.codeIdx];
      const code = codeCell ? codeCell.textContent.trim() : '';
      if (!/^\d+$/.test(code)) continue;
      const data = dataStudents[code];
      if (!data) { log('ไม่พบข้อมูลเลขประจำตัว ' + code + ' ในไฟล์ที่วาง — ข้าม', true); continue; }
      const arr = evalKind === 'char' ? data.char : data.read;
      if (!Array.isArray(arr)) { missingData = true; break; }
      const targets = itemNos.map((n) => ({ label: 'หัวข้อ ' + n, no: n, value: arr[n - 1], input: evalCellInput(cells[layout.items[n]]) }));
      for (const t of targets) {
        if (t.value === undefined || t.value === null || t.value === '' || !t.input) continue;
        if (t.input.disabled || t.input.readOnly) { lockedItems.add(t.label); continue; }
        if (!t.input.id) t.input.id = 'pp5-ev-' + (evalInputSeq++);
        applyValue(t.input, t.value);
        filledFields.push({ id: t.input.id, code, key: t.label, value: String(t.value) });
        await sleep(60);
      }
      students++;
    }
    if (missingData) log('ข้อมูลที่วางไม่มีผลประเมิน — ไปกดปุ่ม "Autofill SGS" ในระบบ ปพ.5 ใหม่ (ต้องเป็นเวอร์ชันล่าสุด) แล้ววางอีกครั้ง', true);
    if (lockedItems.size) log('ช่องเหล่านี้ยังถูกล็อกอยู่ จึงไม่ได้กรอก: ' + Array.from(lockedItems).join(', ') + ' — ติ๊กที่ "หัวข้อ" ด้านบนของหน้า SGS ให้ตรงก่อน แล้วกดเริ่มใหม่', true);
    log(stopRequested ? 'หยุดกลางคัน — ตรวจสอบค่าที่กรอกไปแล้วให้ดี' : ('กรอกแล้ว ' + filledFields.length + ' ช่อง จากนักเรียน ' + students + ' คน — ตรวจให้ครบก่อนกดบันทึก'));
    const verified = await recheckFilledFields();
    running = false;
    await maybeAutoSave(verified);
  }
  function scanEvalPage() {
    log('=== ผลสแกนหน้าผลประเมิน (' + (evalKind === 'char' ? 'คุณลักษณะฯ' : 'อ่าน คิดวิเคราะห์ เขียน') + ') ===');
    const layout = evalTableLayout();
    if (!layout) { log('ไม่พบแถวหัวตารางที่มี "ผลการประเมิน" และ "เลขประจำตัว/รหัสนักเรียน"', true); return; }
    log('คอลัมน์รหัสนักเรียน = ลำดับที่ ' + (layout.codeIdx + 1) + ', ผลการประเมิน = ลำดับที่ ' + (layout.resIdx + 1));
    log('หัวข้อที่พบ: ' + Object.keys(layout.items).join(', '));
    const first = Array.from(layout.table.rows).find((tr) => tr !== layout.headerRow && /^\d+$/.test((evalCells(tr)[layout.codeIdx] || {}).textContent ? evalCells(tr)[layout.codeIdx].textContent.trim() : ''));
    if (first) {
      const cells = evalCells(first);
      Object.keys(layout.items).forEach((n) => {
        const el = evalCellInput(cells[layout.items[n]]);
        log('  แถวแรก หัวข้อ ' + n + ': ' + (el ? 'พบช่อง disabled=' + el.disabled + ' readOnly=' + el.readOnly : 'ไม่พบช่องกรอก'));
      });
      const r = evalCellInput(cells[layout.resIdx]);
      log('  แถวแรก ผลการประเมิน: ' + (r ? 'พบช่อง disabled=' + r.disabled + ' readOnly=' + r.readOnly : 'ไม่พบช่องกรอก'));
    }
    log('=== จบผลสแกน ===');
  }

  // ── ตำแหน่ง/สถานะย่อ-ขยายของกล่อง — จำไว้ใน localStorage กันบังตารางคะแนนซ้ำทุกครั้งที่เปิดหน้าใหม่
  const POS_KEY = 'pp5SgsPanelPos';
  function loadPanelState() {
    try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch (e) { return {}; }
  }
  function savePanelState(state) {
    try { localStorage.setItem(POS_KEY, JSON.stringify(state)); } catch (e) { /* ไม่เป็นไร แค่จำตำแหน่งไม่ได้ */ }
  }

  // ── จำข้อมูลที่วางไว้ข้ามหน้า SGS — ทุกหน้าอยู่โดเมนเดียวกัน (sgs.bopp-obec.info) จึงแชร์ localStorage กันได้
  // สลับหน้ากลางภาค/หลังกลางภาค/อ่าน คิดฯ/คุณลักษณะฯ แล้วข้อมูลใส่กล่องให้เองไม่ต้องวางใหม่
  // หมดอายุใน 12 ชั่วโมง กันข้อมูลวิชาเก่าค้างข้ามวัน และมีปุ่มล้างข้อมูลที่จำไว้ใน "ตัวเลือกเพิ่มเติม"
  const DATA_KEY = 'pp5SgsPayload';
  const DATA_TTL_MS = 12 * 60 * 60 * 1000;
  function saveData(raw) {
    try { localStorage.setItem(DATA_KEY, JSON.stringify({ raw, savedAt: Date.now() })); } catch (e) { /* จำไม่ได้ก็ไม่เป็นไร แค่ต้องวางใหม่ */ }
  }
  function loadSavedData() {
    try {
      const s = JSON.parse(localStorage.getItem(DATA_KEY));
      if (!s || !s.raw || Date.now() - s.savedAt > DATA_TTL_MS) return null;
      return s;
    } catch (e) { return null; }
  }
  function describePayload(raw) {
    try { const p = JSON.parse(raw); return ((p.subject_code || '') + ' ' + (p.subject_name || '')).trim(); } catch (e) { return ''; }
  }

  // ── หน้าคุณลักษณะฯ / อ่าน คิดฯ เขียน: ต้องติ๊ก "หัวข้อ" แล้วกดปุ่ม "สร้าง" ก่อน ตารางถึงจะมีแถวนักเรียนให้กรอก ──
  // ส่วนขยายทำให้เองถ้าตารางยังไม่มีแถวนักเรียน: ติ๊กหัวข้อ 1..N (N = จำนวนหัวข้อในข้อมูลที่วาง: คุณลักษณะ 8 / อ่านคิดฯ 5)
  // และเอาติ๊กหัวข้อที่เกิน N ออก → กด "สร้าง" → รอแถวนักเรียนขึ้น (หน้ารีโหลดเต็มหน้าก็กรอกต่อให้เองผ่าน flag)
  function evalHasRows() {
    const l = evalTableLayout();
    if (!l) return false;
    return Array.from(l.table.rows).some((tr) => {
      if (tr === l.headerRow) return false;
      const c = evalCells(tr)[l.codeIdx];
      return !!c && /^\d+$/.test(c.textContent.trim());
    });
  }
  function findItemCheckboxes() {
    const label = leafTexts(/^หัวข้อ$/)[0];
    if (!label) return null;
    let box = label.el;
    let cbs = [];
    for (let i = 0; i < 6 && box; i++) {
      cbs = Array.from(box.querySelectorAll('input[type="checkbox"]')).filter((c) => !c.closest('#pp5-sgs-panel'));
      if (cbs.length >= 3) break;
      box = box.parentElement;
    }
    if (cbs.length < 3) return null;
    const numOf = (cb) => {
      let t = '';
      if (cb.id) { const l = document.querySelector('label[for="' + cb.id + '"]'); if (l) t = l.textContent; }
      if (!t.trim()) { let n = cb.nextSibling; while (n && !t.trim()) { if (n.nodeType === 1 && n.tagName === 'INPUT') break; t = n.textContent || ''; n = n.nextSibling; } }
      if (!t.trim() && cb.parentElement) t = cb.parentElement.textContent || '';
      const m = t.trim().match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    };
    return cbs.map((cb, i) => ({ cb, no: numOf(cb) || i + 1 }));
  }
  function findCreateButton() {
    const cands = Array.from(document.querySelectorAll('input[type="image"], input[type="submit"], input[type="button"], button, a'))
      .filter((el) => !el.closest('#pp5-sgs-panel'));
    const byText = cands.find((el) => [el.title, el.alt, el.value, el.textContent].some((t) => (t || '').replace(/\s+/g, ' ').trim() === 'สร้าง'));
    if (byText) return byText;
    const byId = cands.filter((el) => /(Create|Generate|Build)\w*(Button)?$/i.test(el.id));
    if (byId.length === 1) return byId[0];
    // สำรอง: ปุ่มเดียวในแถวเดียวกับช่องเลือกรายวิชา (ปุ่ม "สร้าง" อยู่ข้างช่องรายวิชา)
    for (const sel of document.querySelectorAll('select')) {
      const opt = sel.options[sel.selectedIndex];
      if (!opt || !/[A-Za-zก-ฮ]{1,3}\s?\d{4,6}/.test(opt.text)) continue;
      const row = sel.closest('tr');
      if (!row) continue;
      const btns = Array.from(row.querySelectorAll('input[type="image"], input[type="submit"], input[type="button"], button'));
      if (btns.length === 1) return btns[0];
    }
    return null;
  }
  async function ensureCreated(students) {
    if (!isEval) return true;
    if (evalHasRows()) return true;
    if (resumeStep === 'create') { log('กด "สร้าง" อัตโนมัติแล้วแต่ยังไม่มีแถวนักเรียนในตาราง — ตรวจว่าเลือกรายวิชา/กลุ่มแล้ว แล้วติ๊กหัวข้อและกด "สร้าง" เอง จากนั้นกดเริ่มใหม่', true); return false; }
    const boxes = findItemCheckboxes();
    if (!boxes) { log('ตารางยังไม่มีแถวนักเรียน และหาช่องเลือก "หัวข้อ" ไม่เจอ — ติ๊กหัวข้อ กด "สร้าง" เอง แล้วกดเริ่มใหม่', true); return false; }
    const sample = Object.values(students).find((d) => Array.isArray(evalKind === 'char' ? d.char : d.read));
    const need = sample ? (evalKind === 'char' ? sample.char : sample.read).length : (evalKind === 'char' ? 8 : 5);
    log('ตารางยังไม่มีแถวนักเรียน — กำลังติ๊กหัวข้อ 1-' + need + ' แล้วกด "สร้าง" ให้...');
    setResume('create');
    for (const { cb, no } of boxes) {
      const want = no <= need;
      if (cb.checked !== want) { cb.click(); await sleep(80); }
    }
    await sleep(300);
    const btn = findCreateButton();
    if (!btn) { clearResume(); log('หาปุ่ม "สร้าง" ไม่เจอ — หัวข้อติ๊กให้แล้ว กดปุ่ม "สร้าง" เอง แล้วกดเริ่มใหม่', true); return false; }
    btn.click();
    for (let i = 0; i < 50; i++) {
      await sleep(300);
      if (evalHasRows()) { clearResume(); await sleep(600); log('สร้างรายการนักเรียนแล้ว'); return true; }
    }
    clearResume();
    log('รอแถวนักเรียนหลังกด "สร้าง" ไม่สำเร็จ — กดปุ่ม "สร้าง" เอง แล้วกดเริ่มใหม่', true);
    return false;
  }

  // ── ปรับช่อง "รายการ / หน้า" ให้แสดงนักเรียนครบทุกคนในหน้าเดียว ──
  // SGS แบ่งหน้าละ 10 แถว (เช่น "1 ของ 3") ส่วนขยายกรอกได้เฉพาะแถวที่แสดงอยู่ ครูจึงต้องใส่ช่อง "รายการ / หน้า"
  // ให้ ≥ จำนวนนักเรียนเอง — ตอนกดเริ่มกรอก ถ้าช่องนี้น้อยกว่าจำนวนรายการทั้งหมด จะปรับให้แล้วรอตารางอัปเดตก่อนกรอก
  // ยังไม่ทราบ id จริงของช่อง/ปุ่มยืนยัน จึงหาหลายวิธี: id ที่มีคำว่า PageSize → ช่องข้อความที่อยู่ก่อนข้อความ "/ หน้า"
  // ถ้าหน้ารีโหลดเต็มหน้า (ไม่ใช่อัปเดตบางส่วน) จะจำ flag ไว้แล้วกดเริ่มกรอกต่อให้เองหลังโหลดเสร็จ (ครั้งเดียว)
  const RESUME_KEY = 'pp5SgsResume';
  let resumeStep = ''; // ขั้นที่ทำค้างไว้ก่อนหน้ารีโหลด ('create' = สร้างรายการนักเรียน, 'pagesize' = ปรับรายการ/หน้า)
  function setResume(step) { try { localStorage.setItem(RESUME_KEY, JSON.stringify({ ts: Date.now(), step })); } catch (e) { /* ไม่เป็นไร */ } }
  function clearResume() { try { localStorage.removeItem(RESUME_KEY); } catch (e) { /* ไม่เป็นไร */ } }
  function leafTexts(re) {
    const out = [];
    document.querySelectorAll('td, span, div, b, label').forEach((el) => {
      if (el.closest('#pp5-sgs-panel')) return;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length <= 30 && re.test(t)) out.push({ el, m: t.match(re) });
    });
    return out;
  }
  function findPageSizeInput() {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]')).filter((i) => !i.closest('#pp5-sgs-panel'));
    const byId = inputs.find((i) => /PageSize/i.test(i.id) || /PageSize/i.test(i.name));
    if (byId) return byId;
    const label = leafTexts(/^\/\s*หน้า$/)[0];
    if (!label) return null;
    let found = null;
    inputs.forEach((i) => { if (i.compareDocumentPosition(label.el) & Node.DOCUMENT_POSITION_FOLLOWING) found = i; });
    return found;
  }
  function readTotalRecords() {
    const r = leafTexts(/^(\d+)\s*รายการ$/)[0];
    return r ? parseInt(r.m[1], 10) : 0;
  }
  function readTotalPages() {
    const r = leafTexts(/^ของ\s*(\d+)$/)[0];
    return r ? parseInt(r.m[1], 10) : 0;
  }
  function findPageSizeButton(inp) {
    const byId = document.querySelector('[id*="PageSizeButton"], [id*="PageSizeOK"]');
    if (byId) return byId;
    const box = inp.closest('td, div');
    return box ? box.querySelector('input[type="image"], input[type="submit"], input[type="button"], button') : null;
  }
  async function ensureFullPage(expectCount) {
    const inp = findPageSizeInput();
    const total = readTotalRecords() || expectCount || 0;
    if (!inp || !total) { log('หาช่อง "รายการ / หน้า" หรือจำนวนรายการทั้งหมดไม่เจอ — ตรวจเองว่าช่องนี้ ≥ จำนวนนักเรียน (ไม่งั้นจะกรอกได้เฉพาะหน้าที่แสดงอยู่)', true); return true; }
    const cur = parseInt(inp.value, 10) || 0;
    if (cur >= total && readTotalPages() <= 1) return true;
    if (resumeStep === 'pagesize') { log('ปรับช่อง "รายการ / หน้า" อัตโนมัติแล้วแต่ยังแสดงไม่ครบ — ปรับเองเป็น ' + total + ' แล้วกดเริ่มใหม่', true); return false; }
    log('ช่อง "รายการ / หน้า" เป็น ' + cur + ' แต่มีนักเรียน ' + total + ' รายการ — กำลังปรับเป็น ' + total + ' ให้...');
    setResume('pagesize');
    inp.focus();
    setNativeValue(inp, String(Math.max(total, cur)));
    const btn = findPageSizeButton(inp);
    if (btn) btn.click();
    else ['keydown', 'keypress', 'keyup'].forEach((t) => inp.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', keyCode: 13, which: 13, bubbles: true })));
    let changeSent = false;
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      if (readTotalPages() === 1) {
        clearResume();
        await sleep(400);
        log('ปรับช่อง "รายการ / หน้า" เป็น ' + total + ' แล้ว');
        return true;
      }
      if (i === 9 && !changeSent) { changeSent = true; const cur2 = findPageSizeInput(); if (cur2) fireEvent(cur2, 'change'); }
    }
    clearResume();
    log('รอตารางอัปเดตหลังปรับ "รายการ / หน้า" ไม่สำเร็จ — ปรับช่องนี้เองเป็น ' + total + ' แล้วกดเริ่มใหม่', true);
    return false;
  }

  // ── ตรวจรหัสวิชา: เทียบ subject_code ในข้อมูลที่วางกับวิชาที่หน้า SGS แสดงอยู่ ──
  // นักเรียนห้องเดียวกันมีเลขประจำตัวชุดเดียวกันทุกวิชา ถ้าวางคะแนนผิดวิชาจะกรอกให้โดยไม่รู้ตัว จึงต้องเช็ค
  // อ่านรหัสจาก 2 ที่: ตัวเลือกที่ถูกเลือกอยู่ในช่อง <select> (เช่น "รายวิชา") และเซลล์ตารางที่ขึ้นต้นด้วยรหัสวิชา
  // (คอลัมน์ "วิชา") — ไม่อ่านทุกตัวเลือกใน select เพราะจะรวมรหัสวิชาอื่นทั้งหมดที่เลือกได้
  const normCode = (v) => String(v || '').replace(/\s+/g, '').toUpperCase();
  function pageSubjectCodes() {
    const codes = new Set();
    const add = (text) => { (String(text).match(/[A-Za-zก-ฮ]{1,3}\s?\d{4,6}/g) || []).forEach((c) => codes.add(normCode(c))); };
    document.querySelectorAll('select').forEach((sel) => {
      const opt = sel.options[sel.selectedIndex];
      if (opt) add(opt.text);
    });
    document.querySelectorAll('td').forEach((td) => {
      if (td.closest('#pp5-sgs-panel')) return;
      const t = td.textContent.trim();
      if (t.length <= 80 && /^[A-Za-zก-ฮ]{1,3}\s?\d{4,6}(\s|$)/.test(t)) add(t);
    });
    return codes;
  }
  // คืน true = กรอกต่อได้, false = ห้ามกรอก (รหัสวิชาไม่ตรง) — infoOnly = แค่แจ้งใน log ไม่บล็อก
  function checkSubject(payload, infoOnly) {
    const want = normCode(payload && payload.subject_code);
    if (!want) {
      if (!infoOnly) log('ข้อมูลที่วางไม่มีรหัสวิชา (คัดลอกจาก ปพ.5 รุ่นเก่า) — ข้ามการตรวจรหัสวิชา ตรวจวิชาเองก่อนกรอก', true);
      return true;
    }
    const found = pageSubjectCodes();
    const label = payload.subject_code + (payload.subject_name ? ' ' + payload.subject_name : '');
    if (found.has(want)) { log('✓ รหัสวิชาตรงกัน: ' + label); return true; }
    if (!found.size) {
      log('⚠️ หารหัสวิชาในหน้า SGS นี้ไม่เจอ จึงเทียบไม่ได้ — ตรวจให้แน่ใจว่าเป็นวิชา ' + label + ' ก่อนกรอก', true);
      return true;
    }
    const skip = document.getElementById('pp5-sgs-skipcode');
    const skipped = !!(skip && skip.checked);
    log('✗ รหัสวิชาไม่ตรง: ข้อมูลที่วางเป็นของ ' + label + ' แต่หน้า SGS เป็นวิชา ' + Array.from(found).join(', ') +
      (infoOnly ? ' — ถ้าจะกรอกวิชานี้ ให้กดวางข้อมูลของวิชานี้ใหม่' : (skipped ? ' — ข้ามการตรวจตามที่เลือกไว้' : ' — ไม่กรอก เลือกวิชาใน SGS ให้ตรง หรือกดวางข้อมูลของวิชานี้ใหม่')), true);
    return infoOnly || skipped;
  }

  // ── ต่อหน้า "อ่าน คิดวิเคราะห์ และเขียน" หลังบันทึกหน้า "คุณลักษณะอันพึงประสงค์" เสร็จ (ติ๊กเปิด/ปิดได้) ──
  // ขั้นตอน: หน้า Q กรอก+บันทึกเสร็จ → (ตรวจว่าค่ายังอยู่หลังบันทึก) → ไปหน้า L → เลือกรายวิชาและกลุ่มเดียวกับหน้า Q
  // → กดเริ่มกรอกให้เอง (ที่เหลือเป็นขั้นตอนปกติ: สร้างแถว/ปรับรายการต่อหน้า/กรอก/บันทึก)
  // สถานะเก็บใน localStorage (ข้ามการรีโหลด/เปลี่ยนหน้า) หมดอายุ 3 นาทีต่อขั้น และนับจำนวนรอบกันวนซ้ำ
  const CHAIN_KEY = 'pp5SgsChain';
  let lastPayload = null;
  function loadChain() {
    try { const c = JSON.parse(localStorage.getItem(CHAIN_KEY)); return c && c.ts && Date.now() - c.ts < 180000 ? c : null; } catch (e) { return null; }
  }
  function saveChain(c) {
    try { localStorage.setItem(CHAIN_KEY, JSON.stringify(Object.assign({}, loadChain() || {}, c, { ts: Date.now() }))); } catch (e) { /* ไม่เป็นไร */ }
  }
  function clearChain() { try { localStorage.removeItem(CHAIN_KEY); } catch (e) { /* ไม่เป็นไร */ } }
  // URL ของหน้าถัดไปในสายต่อเนื่อง (ใช้โฮสต์/นามสกุลไฟล์เดียวกับหน้าปัจจุบัน)
  function sgsPageUrl(kind) {
    const dir = kind === 'Q' ? 'TblTranscriptsQ/Edit-TblTranscriptsQ-Table' : 'TblTranscriptsL/Edit-TblTranscriptsL-Table';
    const ext = (location.pathname.match(/(\.\w+)$/) || ['', '.aspx'])[1];
    return location.href.split('/sgs/')[0] + '/sgs/' + dir + ext;
  }
  function readPageUrl() { return sgsPageUrl('L'); }
  // ช่องเลือก "กลุ่ม" = <select> แรกที่อยู่หลังข้อความ "กลุ่ม"
  function findGroupSelect() {
    const label = leafTexts(/^กลุ่ม$/)[0];
    if (!label) return null;
    let found = null;
    Array.from(document.querySelectorAll('select')).forEach((sel) => {
      if (!found && !sel.closest('#pp5-sgs-panel') && (label.el.compareDocumentPosition(sel) & Node.DOCUMENT_POSITION_FOLLOWING)) found = sel;
    });
    return found;
  }
  function currentPayloadStudents() {
    try { return JSON.parse(document.getElementById('pp5-sgs-paste').value).students || null; } catch (e) { return null; }
  }
  // หลังบันทึกหน้า Q: ถ้าตารางยังมีแถว เช็คว่าค่าข้อ 1 ตรงกับที่กรอก (true/false) ถ้าตารางว่างเช็คไม่ได้ (null)
  function quickVerifySaved() {
    const students = currentPayloadStudents();
    const layout = evalTableLayout();
    if (!students || !layout || !layout.items[1]) return null;
    let checked = 0;
    for (const tr of Array.from(layout.table.rows)) {
      if (tr === layout.headerRow) continue;
      const cells = evalCells(tr);
      const code = cells[layout.codeIdx] ? cells[layout.codeIdx].textContent.trim() : '';
      const d = students[code];
      if (!d || !Array.isArray(d.char) || d.char[0] === '' || d.char[0] == null) continue;
      const inp = evalCellInput(cells[layout.items[1]]);
      if (!inp) continue;
      checked++;
      if (inp.value !== String(d.char[0])) return false;
    }
    return checked ? true : null;
  }
  async function afterSaveOnQ() {
    const c = loadChain();
    if (!c || c.step !== 'goL') return;
    const ok = quickVerifySaved();
    if (ok === false) { clearChain(); log('หลังบันทึก ค่าในตารางไม่ตรงกับที่กรอก (อาจบันทึกไม่สำเร็จ) — ไม่ไปหน้าถัดไปให้ ตรวจแล้วทำต่อเอง', true); return; }
    if (ok === null) log('ตรวจซ้ำค่าหลังบันทึกไม่ได้ (ตารางว่างหลังบันทึก) — ไปหน้าถัดไปต่อ');
    saveChain({ step: 'onL', tries: 0 });
    log('บันทึกหน้าคุณลักษณะฯ แล้ว — ไปหน้า "อ่าน คิดวิเคราะห์ และเขียน" ต่อให้...');
    await sleep(600);
    location.href = readPageUrl();
  }
  // หลังบันทึกหน้ากลางภาค/หลังกลางภาค: เช็คว่าค่าคอลัมน์ Midterm/Final ที่ SGS โหลดกลับมาตรงกับที่กรอก แล้วไปหน้าคุณลักษณะฯ (Q)
  function quickVerifyMid() {
    const students = currentPayloadStudents();
    if (!students) return null;
    const key = isPage1 ? 'Midterm' : 'Final';
    let checked = 0;
    for (let i = 0; i < 60; i++) {
      const rowIdx = String(i).padStart(2, '0');
      const el = document.getElementById(REPEATER_PREFIX + rowIdx + '_' + key);
      if (!el) continue;
      const d = students[getRowStudentCode(rowIdx, key)];
      const v = d && (isPage1 ? d.mid : d.final);
      if (v === '' || v == null) continue;
      checked++;
      if (parseFloat(el.value) !== parseFloat(v)) return false;
    }
    return checked ? true : null;
  }
  async function afterSaveOnMid() {
    const c = loadChain();
    if (!c || c.step !== 'goQ') return;
    const ok = quickVerifyMid();
    if (ok === false) { clearChain(); log('หลังบันทึก ค่าในตารางไม่ตรงกับที่กรอก (อาจบันทึกไม่สำเร็จ) — ไม่ไปหน้าถัดไปให้ ตรวจแล้วทำต่อเอง', true); return; }
    if (ok === null) log('ตรวจซ้ำค่าหลังบันทึกไม่ได้ (ตารางว่างหรือไม่ได้กรอกคอลัมน์ผลสอบ) — ไปหน้าถัดไปต่อ');
    saveChain({ step: 'onQ', tries: 0 });
    log('บันทึกหน้านี้แล้ว — ไปหน้า "คุณลักษณะอันพึงประสงค์" ต่อให้...');
    await sleep(600);
    location.href = sgsPageUrl('Q');
  }
  async function advanceChainOnRead(chain) {
    const fail = (m) => { clearChain(); log(m, true); };
    if ((chain.tries || 0) > 5) return fail('เลือกรายวิชา/กลุ่มอัตโนมัติหลายรอบแล้วยังไม่สำเร็จ — เลือกเอง แล้วกดเริ่มกรอก');
    saveChain({ tries: (chain.tries || 0) + 1 });
    log('ต่อจากหน้าก่อนหน้า — กำลังเลือกรายวิชา ' + chain.code + (chain.group ? ' กลุ่ม ' + chain.group.text : '') + ' ให้...');
    await sleep(600);
    const want = normCode(chain.code);
    const subSel = Array.from(document.querySelectorAll('select')).find((sel) => !sel.closest('#pp5-sgs-panel') && Array.from(sel.options).some((o) => normCode(o.text).includes(want)));
    if (!subSel) return fail('ไม่พบรายวิชา ' + chain.code + ' ในหน้านี้ — เลือกรายวิชา/กลุ่มเอง แล้วกดเริ่มกรอก');
    const curSub = subSel.options[subSel.selectedIndex];
    if (!curSub || !normCode(curSub.text).includes(want)) {
      const opt = Array.from(subSel.options).find((o) => normCode(o.text).includes(want));
      subSel.value = opt.value;
      fireEvent(subSel, 'change');
      await sleep(3000); // ถ้าหน้ารีโหลดเต็มหน้า สคริปต์ตายตรงนี้ หน้าใหม่จะทำขั้นนี้ต่อ ถ้าอัปเดตบางส่วนจะวนเช็คใหม่
      return advanceChainOnRead(loadChain() || chain);
    }
    if (chain.group) {
      const gSel = findGroupSelect();
      const curG = gSel && gSel.options[gSel.selectedIndex];
      if (gSel && (!curG || (curG.text.trim() !== chain.group.text && curG.value !== chain.group.value))) {
        const opt = Array.from(gSel.options).find((o) => o.text.trim() === chain.group.text) || Array.from(gSel.options).find((o) => o.value === chain.group.value);
        if (!opt) return fail('ไม่พบกลุ่ม ' + chain.group.text + ' ในหน้านี้ — เลือกกลุ่มเอง แล้วกดเริ่มกรอก');
        gSel.value = opt.value;
        fireEvent(gSel, 'change');
        await sleep(3000);
        return advanceChainOnRead(loadChain() || chain);
      }
    }
    clearChain();
    log('เลือกรายวิชา/กลุ่มแล้ว — เริ่มกรอกให้');
    document.getElementById('pp5-sgs-start').click();
  }

  function buildUI() {
    const wrap = document.createElement('div');
    wrap.id = 'pp5-sgs-panel';
    wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#fff;border:2px solid #4f46e5;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.25);padding:12px;width:320px;font-family:sans-serif;font-size:13px;color:#111';
    wrap.innerHTML =
      '<div id="pp5-sgs-header" style="cursor:move;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;user-select:none">' +
      '<span style="font-weight:700;color:#4f46e5">📋 Autofill SGS จาก ปพ.5 (' + (isEval ? (evalKind === 'char' ? 'คุณลักษณะฯ' : 'อ่าน คิดฯ เขียน') : (isPage1 ? 'กลางภาค' : 'หลังกลางภาค')) + ')</span>' +
      '<button id="pp5-sgs-min" title="ย่อ/ขยายกล่องนี้ — ลากที่แถบหัวข้อเพื่อย้ายตำแหน่งได้" style="flex-shrink:0;background:#eef2ff;border:1px solid #c7d2fe;border-radius:5px;cursor:pointer;font-size:13px;color:#4f46e5;width:22px;height:22px;line-height:1;padding:0">–</button>' +
      '</div>' +
      '<div id="pp5-sgs-body">' +
      '<textarea id="pp5-sgs-paste" placeholder="วาง JSON ที่คัดลอกจากปุ่ม &quot;Autofill SGS&quot; ในระบบ ปพ.5 ตรงนี้" style="width:100%;height:60px;font-size:11px;margin-bottom:6px;box-sizing:border-box"></textarea>' +
      '<button id="pp5-sgs-pasteclip" style="width:100%;margin-bottom:8px;padding:4px;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;font-size:11px;font-weight:500">📋 วางจากคลิปบอร์ด</button>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px">' +
      '<button id="pp5-sgs-start" style="flex:1;padding:13px 8px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:700;box-shadow:0 2px 6px rgba(79,70,229,.45)">เริ่มกรอกคอลัมน์ที่ติ๊กไว้</button>' +
      '<button id="pp5-sgs-stop" style="padding:13px 14px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">หยุด</button>' +
      '</div>' +
      '<label style="display:flex;align-items:flex-start;gap:6px;font-size:11px;margin-bottom:6px;cursor:pointer"><input type="checkbox" id="pp5-sgs-autosave" style="margin-top:2px"> กดปุ่ม "บันทึก" ของ SGS</label>' +
      (isPage1 || isPage2
        ? '<label style="display:flex;align-items:flex-start;gap:6px;font-size:11px;margin-bottom:6px;cursor:pointer"><input type="checkbox" id="pp5-sgs-chain" style="margin-top:2px"> เมื่อบันทึกหน้านี้เสร็จ ไปหน้า "คุณลักษณะอันพึงประสงค์" แล้ว "อ่าน คิดวิเคราะห์ และเขียน" ต่อให้เลย</label>'
        : evalKind === 'char'
        ? '<label style="display:flex;align-items:flex-start;gap:6px;font-size:11px;margin-bottom:6px;cursor:pointer"><input type="checkbox" id="pp5-sgs-chain" style="margin-top:2px"> เมื่อบันทึกหน้านี้เสร็จ ไปหน้า "อ่าน คิดวิเคราะห์ และเขียน" ต่อให้เลย</label>'
        : '') +
      '<details style="margin-bottom:6px">' +
      '<summary style="cursor:pointer;font-size:11px;color:#666;padding:2px 0">⚙️ ตัวเลือกเพิ่มเติม</summary>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;margin-top:6px;cursor:pointer"><input type="checkbox" id="pp5-sgs-skipcode"> ไม่ตรวจรหัสวิชา (ใช้เมื่อรหัสใน SGS ต่างจาก ปพ.5)</label>' +
      '<button id="pp5-sgs-clearsaved" style="width:100%;margin-top:6px;padding:5px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-size:11px">🗑️ ล้างข้อมูลที่จำไว้ (เปลี่ยนวิชา/เลิกใช้)</button>' +
      '<button id="pp5-sgs-scan" style="width:100%;margin-top:6px;padding:5px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;cursor:pointer;font-size:11px">🔍 สแกนโครงสร้างหน้านี้ (ถ้ากรอกแล้วไม่ขึ้นเลย)</button>' +
      '<button id="pp5-sgs-copylog" style="width:100%;margin-top:6px;padding:5px;background:#eee;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:11px">📄 คัดลอก log ทั้งหมด (ส่งให้ผู้พัฒนาช่วยตรวจ)</button>' +
      '</details>' +
      '<div id="pp5-sgs-log" style="max-height:160px;overflow-y:auto;background:#f5f5f5;border-radius:6px;padding:6px;font-size:11px;line-height:1.6"></div>' +
      '<div id="pp5-sgs-credit" style="font-size:10px;color:#94a3b8;margin-top:8px;padding-top:6px;border-top:1px solid #e5e7eb;text-align:center">ผู้พัฒนา: ' + DEVELOPER + (APP_VERSION ? ' · ' + APP_VERSION : '') + '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    // ── ย้ายตำแหน่งกล่องได้ (ลากที่แถบหัวข้อ) กันบังคอลัมน์คะแนนที่กำลังกรอก ──
    const header = document.getElementById('pp5-sgs-header');
    const savedState = loadPanelState();
    if (savedState.left != null && savedState.top != null) {
      wrap.style.left = savedState.left + 'px';
      wrap.style.top = savedState.top + 'px';
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
    }
    header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'pp5-sgs-min') return;
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      wrap.style.left = rect.left + 'px';
      wrap.style.top = rect.top + 'px';
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
      function onMove(ev) {
        const maxLeft = window.innerWidth - wrap.offsetWidth;
        const maxTop = window.innerHeight - wrap.offsetHeight;
        wrap.style.left = Math.min(Math.max(0, ev.clientX - offsetX), Math.max(0, maxLeft)) + 'px';
        wrap.style.top = Math.min(Math.max(0, ev.clientY - offsetY), Math.max(0, maxTop)) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        savePanelState(Object.assign(loadPanelState(), {
          left: parseInt(wrap.style.left, 10), top: parseInt(wrap.style.top, 10)
        }));
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // ── ย่อ/ขยาย — ย่อเหลือแค่แถบหัวข้อเวลาต้องดูตารางที่ถูกบังอยู่ ──
    const body = document.getElementById('pp5-sgs-body');
    const minBtn = document.getElementById('pp5-sgs-min');
    function applyCollapsed(collapsed) {
      body.style.display = collapsed ? 'none' : 'block';
      minBtn.textContent = collapsed ? '+' : '–';
      wrap.style.width = collapsed ? 'auto' : '320px';
    }
    applyCollapsed(!!savedState.collapsed);
    const autoSaveCb = document.getElementById('pp5-sgs-autosave');
    // ค่าเริ่มต้น = ติ๊กไว้ (กดบันทึกให้ โดยไม่ถามยืนยัน) ตามที่ผู้ใช้กำหนด — ถ้าเอาติ๊กออกจะจำค่าที่เลือกไว้
    // การกดบันทึกยังต้องผ่านเงื่อนไขความปลอดภัยเดิมครบ: รหัสวิชาตรง + ตรวจซ้ำผ่าน + ไม่ได้กดหยุด + เจอปุ่มบันทึกปุ่มเดียว
    autoSaveCb.checked = savedState.autosave !== false;
    autoSaveCb.onchange = () => savePanelState(Object.assign(loadPanelState(), { autosave: autoSaveCb.checked }));
    const chainCb = document.getElementById('pp5-sgs-chain');
    if (chainCb) {
      chainCb.checked = savedState.chain !== false;
      chainCb.onchange = () => savePanelState(Object.assign(loadPanelState(), { chain: chainCb.checked }));
    }
    minBtn.onclick = () => {
      const collapsed = body.style.display !== 'none';
      applyCollapsed(collapsed);
      savePanelState(Object.assign(loadPanelState(), { collapsed }));
    };

    document.getElementById('pp5-sgs-pasteclip').onclick = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) { log('คลิปบอร์ดว่างเปล่า — ไปกดปุ่ม "Autofill SGS" ในระบบ ปพ.5 เพื่อคัดลอกคะแนนก่อน', true); return; }
        document.getElementById('pp5-sgs-paste').value = text;
        try { const parsed = JSON.parse(text); saveData(text); checkSubject(parsed, true); log('วางข้อมูลจากคลิปบอร์ดแล้ว (จำไว้ให้ข้ามหน้า SGS) — ตรวจสอบว่าเป็นคะแนนถูกวิชาแล้วกด "เริ่มกรอกคอลัมน์ที่ติ๊กไว้"'); }
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
      saveData(raw);
      lastPayload = payload;
      if (!checkSubject(payload)) return;
      ensureCreated(payload.students).then((created) => (created ? ensureFullPage(Object.keys(payload.students).length) : false)).then((ok) => {
        if (!ok) return;
        if (isEval) runEvalFill(payload.students); else runFill(payload.students);
      });
    };
    document.getElementById('pp5-sgs-stop').onclick = () => { stopRequested = true; };
    document.getElementById('pp5-sgs-clearsaved').onclick = () => {
      try { localStorage.removeItem(DATA_KEY); } catch (e) { /* ignore */ }
      document.getElementById('pp5-sgs-paste').value = '';
      log('ล้างข้อมูลที่จำไว้แล้ว — วางข้อมูลใหม่จากระบบ ปพ.5 ได้เลย');
    };
    const saved = loadSavedData();
    if (saved) {
      document.getElementById('pp5-sgs-paste').value = saved.raw;
      log('ใส่ข้อมูลที่วางไว้ก่อนหน้าให้แล้ว — วิชา ' + (describePayload(saved.raw) || '(ไม่ระบุ)') + ' (จำไว้เมื่อ ' + new Date(saved.savedAt).toLocaleTimeString('th-TH') + ') ตรวจให้ตรงกับวิชาที่กำลังกรอก ถ้าไม่ตรงให้กดวางใหม่');
      try { checkSubject(JSON.parse(saved.raw), true); } catch (e) { /* ข้อมูลเสีย ไม่ต้องเช็ค */ }
      const chain = loadChain();
      if (chain && evalKind === 'char' && chain.step === 'goL') afterSaveOnQ();
      else if (chain && evalKind === 'read' && chain.step === 'onL') advanceChainOnRead(chain);
      else if (chain && (isPage1 || isPage2) && chain.step === 'goQ') afterSaveOnMid();
      else if (chain && evalKind === 'char' && chain.step === 'onQ') advanceChainOnRead(chain);
      let resume = null;
      try { resume = JSON.parse(localStorage.getItem(RESUME_KEY)); localStorage.removeItem(RESUME_KEY); } catch (e) { /* ไม่เป็นไร */ }
      if (resume && resume.ts && Date.now() - resume.ts < 60000) {
        resumeStep = resume.step || 'pagesize';
        log('หน้ารีโหลดหลัง' + (resumeStep === 'create' ? 'กด "สร้าง"' : 'ปรับ "รายการ / หน้า"') + ' — กรอกต่อให้อัตโนมัติ');
        setTimeout(() => document.getElementById('pp5-sgs-start').click(), 800);
      }
    }
    document.getElementById('pp5-sgs-scan').onclick = () => (isEval ? scanEvalPage() : scanPage());
    document.getElementById('pp5-sgs-copylog').onclick = async () => {
      const text = document.getElementById('pp5-sgs-log').innerText;
      try { await navigator.clipboard.writeText(text); log('คัดลอก log แล้ว'); }
      catch (e) { log('คัดลอกไม่สำเร็จ ลองเลือกข้อความใน log แล้วคัดลอกเอง', true); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();
})();
