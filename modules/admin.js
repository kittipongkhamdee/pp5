// ════════════════════════════════════════════════════════════════
// โมดูล admin.js — โหลดแบบ lazy เมื่อเข้าเมนู ตั้งค่า / IQA / คู่มือ / รายงานทั้งโรงเรียน เท่านั้น
// (แยกออกจาก index-pp5.html เพื่อลดขนาดโค้ดที่ต้องโหลด/ประมวลผลตอนล็อกอินสำหรับครูทั่วไป)
// ════════════════════════════════════════════════════════════════

// ════ EXPORT COVER PDF ═══════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// 9. SETTINGS
// ════════════════════════════════════════════════════════════════

// ════ CLEAR ALL DATA ══════════════════════════════════════════

const CLEAR_TABLES = [
  'eval_char','eval_read','score_summary','score_units',
  'attendance','students','subjects'
];

function openClearAllDialog(){
  const wrap = document.createElement('div');
  wrap.id = 'clearall-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.25);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);animation:fadeIn .15s ease';
  wrap.innerHTML =
    '<div style="background:rgba(255,255,255,.85);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border-radius:22px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.2);animation:dlgPop .22s cubic-bezier(.34,1.56,.64,1)">' +
      '<div style="padding:24px 24px 16px">' +
        '<div style="width:54px;height:54px;background:#fff1f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
        '</div>' +
        '<div style="font-size:17px;font-weight:700;text-align:center;margin-bottom:6px;">ล้างข้อมูลทั้งหมด</div>' +
        '<div style="font-size:12.5px;color:#6e6e73;text-align:center;line-height:1.6;margin-bottom:16px;">' +
          'จะลบ <strong style="color:#dc2626">รายวิชา · นักเรียน · เวลาเรียน · คะแนน · ประเมิน</strong><br>' +
          'ทั้งหมดออกจากระบบ ไม่สามารถกู้คืนได้' +
        '</div>' +
        '<div style="background:#fff1f0;border-radius:10px;padding:10px 14px;margin-bottom:14px;">' +
          '<div style="font-size:12.5px;font-weight:700;color:#dc2626;margin-bottom:6px;">พิมพ์ยืนยัน: <code style="background:#fecaca;padding:1px 6px;border-radius:4px;">ลบข้อมูล</code></div>' +
          '<input id="clearall-confirm-txt" class="fi" placeholder="พิมพ์ ลบข้อมูล เพื่อยืนยัน" oninput="_checkClearInput(this)">' +
        '</div>' +
      '</div>' +
      '<div style="border-top:0.5px solid rgba(0,0,0,.08);">' +
        '<button id="clearall-btn" disabled onclick="_doClearAll()" ' +
          'style="width:100%;padding:14px;font-size:15px;font-weight:600;color:#dc2626;background:none;border:none;border-bottom:1px solid #f3f4f6;cursor:not-allowed;opacity:.4;font-family:var(--font);">ล้างข้อมูลทั้งหมด</button>' +
        '<button onclick="_closeClearAllDialog()" ' +
          'style="width:100%;padding:14px;font-size:15px;color:#8e8e93;background:none;border:none;cursor:pointer;font-family:var(--font);">ยกเลิก</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
}

function _checkClearInput(el){
  const btn=document.getElementById('clearall-btn');
  const ok = el.value.trim() === 'ลบข้อมูล';
  if(btn){ btn.disabled=!ok; btn.style.cursor=ok?'pointer':'not-allowed'; btn.style.opacity=ok?'1':'.4'; }
}

function _closeClearAllDialog(){
  const w=document.getElementById('clearall-wrap');
  if(w){ w.style.animation='fadeIn .15s ease reverse forwards'; setTimeout(()=>w.remove(),150); }
}

async function _doClearAll(){
  _closeClearAllDialog();
  confirm2({
    title:'ยืนยันการล้างข้อมูล',
    msg:'ข้อมูล<strong>ทั้งหมด</strong>จะถูกลบถาวรทันที<br><span style="color:#dc2626;font-size:12px;">ไม่สามารถกู้คืนได้ในทุกกรณี</span>',
    type:'danger', confirmText:'ลบทั้งหมดเลย', cancelText:'ยกเลิก',
    onConfirm: async()=>{
      loading(true);
      const errors=[];
      try{
        toast('กำลังล้างข้อมูล...','in');
        for(const tbl of CLEAR_TABLES){
          try{
            await q(sb.from(tbl).delete().neq('id','00000000-0000-0000-0000-000000000000'));
          }catch(e){ errors.push(tbl+': '+e.message); }
        }
        // reset local state
        cacheInvAll();
        S.subjects=[]; S.selSub=null;
        logAudit('wipe_data', errors.length ? `ล้างข้อมูลทั้งหมด (มีข้อผิดพลาด ${errors.length} จุด)` : 'ล้างข้อมูลทั้งหมดสำเร็จ');
        if(errors.length){
          toast('ล้างข้อมูลเสร็จ (มีข้อผิดพลาด '+errors.length+' จุด)','in');
        } else {
          toast('ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว ✓');
        }
        setTimeout(()=>nav('dashboard'),800);
      }catch(e){
        toast('เกิดข้อผิดพลาด: '+e.message,'er');
      }finally{
        loading(false);
      }
    }
  });
}

// ════ ADMIN PANEL ══════════════════════════════════════════════════
async function openAdminPanel(){
  loading(true);
  try{
    const [profiles, subjects] = await Promise.all([
      q(sb.from('profiles').select('id,full_name,is_admin').order('full_name')),
      q(sb.from('subjects').select('user_id')),
    ]);
    const subCount={};
    subjects.forEach(s=>{ subCount[s.user_id]=(subCount[s.user_id]||0)+1; });

    const rows=profiles.map(p=>`
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr)">
        <div style="width:36px;height:36px;border-radius:50%;background:${_avColor(p.id).bg};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${_avInitials(p.full_name||'?')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.full_name||'(ไม่มีชื่อ)')}</div>
          <div style="font-size:12px;color:var(--muted)">${subCount[p.id]||0} วิชา${p.is_admin?` · ${_ico.crown} Admin`:''}</div>
        </div>
        ${p.id!==S.user.id
          ? `<button class="btn bs" style="color:var(--err);font-size:12px;padding:6px 12px;flex-shrink:0"
              onclick="deleteTeacherData('${p.id}','${esc(p.full_name||p.id)}')">ลบข้อมูล</button>`
          : `<span style="font-size:12px;color:var(--muted);flex-shrink:0">(ตัวเอง)</span>`}
      </div>`).join('');

    const wrap=document.createElement('div');
    wrap.id='admin-panel-wrap';
    wrap.style.cssText='position:fixed;inset:0;z-index:1500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.55);animation:fadeIn .15s ease';
    wrap.innerHTML=`
      <div style="background:#fff;border-radius:18px;padding:24px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0">
          <div style="font-size:17px;font-weight:700;display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="#af52de" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            จัดการข้อมูลครู
          </div>
          <button onclick="document.getElementById('admin-panel-wrap')?.remove()"
            style="background:var(--input-bg);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:18px;color:var(--muted);line-height:1;display:flex;align-items:center;justify-content:center">×</button>
        </div>
        <div class="alert al-in" style="margin-bottom:14px;font-size:12px;flex-shrink:0">
          การลบข้อมูลจะลบ: วิชา · นักเรียน · คะแนน · เวลาเรียน · การประเมิน ของครูคนนั้น
        </div>
        <div style="overflow-y:auto;flex:1">${rows||'<div style="padding:20px;text-align:center;color:var(--muted)">ไม่พบข้อมูลครู</div>'}</div>
      </div>`;
    wrap.addEventListener('click',e=>{ if(e.target===wrap) wrap.remove(); });
    document.body.appendChild(wrap);
  }catch(e){
    toast('โหลดข้อมูลไม่สำเร็จ: '+e.message,'er');
  }finally{
    loading(false);
  }
}

async function deleteTeacherData(userId, name){
  confirm2({
    title:'ลบข้อมูลครู',
    msg:`ต้องการลบข้อมูลทั้งหมดของ <strong>${esc(name)}</strong>?<br><span style="font-size:12px;color:#dc2626">วิชา · นักเรียน · คะแนน · เวลาเรียน · การประเมิน จะถูกลบถาวร</span>`,
    type:'danger', confirmText:'ลบข้อมูล', cancelText:'ยกเลิก',
    onConfirm: async()=>{
      loading(true);
      try{
        // ดึง subject_ids ของครูคนนี้ก่อน
        const subjRows = await q(sb.from('subjects').select('id').eq('user_id',userId));
        const sids = subjRows.map(r=>r.id);
        // ลบข้อมูลที่ผูกกับ subject_id ก่อน แล้วค่อยลบ subjects
        if(sids.length){
          await Promise.all([
            q(sb.from('attendance').delete().in('subject_id',sids)),
            q(sb.from('score_units').delete().in('subject_id',sids)),
            q(sb.from('score_summary').delete().in('subject_id',sids)),
            q(sb.from('eval_read').delete().in('subject_id',sids)),
            q(sb.from('eval_char').delete().in('subject_id',sids)),
          ]);
        }
        await q(sb.from('subjects').delete().eq('user_id',userId));
        document.getElementById('admin-panel-wrap')?.remove();
        toast('ลบข้อมูลของ '+name+' เรียบร้อยแล้ว ✓');
        setTimeout(openAdminPanel, 600);
      }catch(e){
        toast('เกิดข้อผิดพลาด: '+e.message,'er');
      }finally{
        loading(false);
      }
    }
  });
}

function _sgListHTML(list){
  if(!list.length) return '<div style="color:#8e8e93;font-size:13px;text-align:center;padding:12px 0">ยังไม่มีกลุ่มสาระ</div>';
  return list.map((g,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid var(--bdr)"><span style="font-size:12px;color:#8e8e93;min-width:22px">${i+1}.</span><span style="flex:1;font-size:13px">${esc(g)}</span><button class="btn bs" onclick="sgMove(${i},-1)" ${i===0?'disabled':''} style="padding:3px 8px;min-width:28px">▲</button><button class="btn bs" onclick="sgMove(${i},1)" ${i===list.length-1?'disabled':''} style="padding:3px 8px;min-width:28px">▼</button><button class="btn" onclick="sgDel(${i})" style="padding:3px 9px;color:#FF3B30;border-color:rgba(255,59,48,.3);background:rgba(255,59,48,.08);font-size:12px">ลบ</button></div>`).join('');
}
function _sgRefresh(){ const el=document.getElementById('sg-list'); if(el) el.innerHTML=_sgListHTML(_sgList); }
function sgAdd(){
  const inp=document.getElementById('sg-new'); if(!inp) return;
  const name=inp.value.trim();
  if(!name){ toast('กรุณาใส่ชื่อกลุ่มสาระ','er'); return; }
  if(_sgList.includes(name)){ toast('กลุ่มสาระนี้มีอยู่แล้ว','er'); return; }
  _sgList.push(name); inp.value=''; _sgRefresh();
}
function sgMove(i,dir){ const j=i+dir; if(j<0||j>=_sgList.length) return; [_sgList[i],_sgList[j]]=[_sgList[j],_sgList[i]]; _sgRefresh(); }
function sgDel(i){ if(!confirm(`ลบ "${_sgList[i]}" ออกจากรายการกลุ่มสาระ?`)) return; _sgList.splice(i,1); _sgRefresh(); }
async function saveSgList(){
  if(!_sgList.length){ toast('ต้องมีกลุ่มสาระอย่างน้อย 1 กลุ่ม','er'); return; }
  loading(true);
  try{
    await q(sb.from('config').upsert([{key:'subject_groups',value:JSON.stringify(_sgList)}],{onConflict:'key'}));
    SUBJECT_GROUPS=[..._sgList];
    S.config.subject_groups=JSON.stringify(_sgList);
    toast('บันทึกกลุ่มสาระเรียบร้อย');
    pgSettings();
  }catch(e){ toast('เกิดข้อผิดพลาด: '+e.message,'er'); }
  finally{ loading(false); }
}

async function saveRoomsPerGrade(){
  const obj={};
  GRADE_LEVELS.forEach(g=>{ obj[g]=Math.max(1,parseInt($('rpg-'+g)?.value)||1); });
  loading(true);
  try{
    await q(sb.from('config').upsert([{key:'rooms_per_grade',value:JSON.stringify(obj)}],{onConflict:'key'}));
    ROOMS_PER_GRADE={...obj};
    S.config.rooms_per_grade=JSON.stringify(obj);
    toast('บันทึกจำนวนห้องเรียบร้อย');
    pgSettings();
  }catch(e){ toast('เกิดข้อผิดพลาด: '+e.message,'er'); }
  finally{ loading(false); }
}

// ── ระดับชั้นที่ใช้ในระบบ (คำนำหน้า + รายการ) ──────────────────────
function _glListHTML(list){
  if(!list.length) return '<div style="color:#8e8e93;font-size:13px;text-align:center;padding:12px 0">ยังไม่มีระดับชั้น</div>';
  return list.map((g,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid var(--bdr)"><span style="font-size:12px;color:#8e8e93;min-width:22px">${i+1}.</span><span style="flex:1;font-size:13px">${esc(_glPrefix)}${esc(g)}</span><button class="btn bs" onclick="glMove(${i},-1)" ${i===0?'disabled':''} style="padding:3px 8px;min-width:28px">▲</button><button class="btn bs" onclick="glMove(${i},1)" ${i===list.length-1?'disabled':''} style="padding:3px 8px;min-width:28px">▼</button><button class="btn" onclick="glDel(${i})" style="padding:3px 9px;color:#FF3B30;border-color:rgba(255,59,48,.3);background:rgba(255,59,48,.08);font-size:12px">ลบ</button></div>`).join('');
}
function _glRefresh(){ const el=$('gl-list'); if(el) el.innerHTML=_glListHTML(_glList); }
function _glPrefixInput(v){ _glPrefix=v; _glRefresh(); }
function glAdd(){
  const inp=$('gl-new'); if(!inp) return;
  const v=inp.value.trim();
  if(!v){ toast('กรุณาใส่ระดับชั้น','er'); return; }
  if(_glList.includes(v)){ toast('มีระดับชั้นนี้อยู่แล้ว','er'); return; }
  _glList.push(v); inp.value=''; _glRefresh();
}
function glMove(i,dir){ const j=i+dir; if(j<0||j>=_glList.length) return; [_glList[i],_glList[j]]=[_glList[j],_glList[i]]; _glRefresh(); }
function glDel(i){ if(!confirm(`ลบระดับชั้น "${_glPrefix}${_glList[i]}" ออกจากรายการ?`)) return; _glList.splice(i,1); _glRefresh(); }
async function saveGradeLevels(){
  if(!_glList.length){ toast('ต้องมีระดับชั้นอย่างน้อย 1 ระดับ','er'); return; }
  const prefix=($('gl-prefix')?.value||'').trim()||'ม.';
  loading(true);
  try{
    const payload={prefix,levels:[..._glList]};
    await q(sb.from('config').upsert([{key:'grade_config',value:JSON.stringify(payload)}],{onConflict:'key'}));
    GRADE_PREFIX=prefix; GRADE_LEVELS=[..._glList];
    S.config.grade_config=JSON.stringify(payload);
    toast('บันทึกระดับชั้นเรียบร้อย');
    pgSettings();
  }catch(e){ toast('เกิดข้อผิดพลาด: '+e.message,'er'); }
  finally{ loading(false); }
}

// ── จัดการตัวชี้วัด: นำเข้า/ส่งออก Excel (แอดมินเท่านั้น) ──────────
let _indExcelData=[], _indExcelSkipped=0;
const IND_KIND_VALUES=['ระหว่างทาง','ปลายทาง','ผลการเรียนรู้'];

function openIndicatorImport(){
  document.body.insertAdjacentHTML('beforeend',`
  <div class="mo" id="indImpMod"><div class="md md-lg">
    <div class="mh"><div class="mt">นำเข้าตัวชี้วัดจาก Excel</div>
    <button class="mx" onclick="rmModal('indImpMod')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
    <div class="mb">
      <div class="alert al-in" style="margin-bottom:12px"><div class="alert-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div>
          <strong>รองรับ format คอลัมน์ (แถวแรกเป็นหัวข้อ):</strong><br>
          <code>กลุ่มสาระ | ประเภทวิชา | ระดับชั้น | มาตรฐาน | รหัสตัวชี้วัด | คำอธิบาย | ประเภท</code><br>
          <span style="font-size:12px;color:var(--muted)">
            • ประเภทวิชา เว้นว่างได้ (ค่าเริ่มต้น "รายวิชาพื้นฐาน")<br>
            • ประเภท ต้องเป็น "ระหว่างทาง" หรือ "ปลายทาง" (รายวิชาพื้นฐาน) หรือ "ผลการเรียนรู้" (วิชาเพิ่มเติม) เท่านั้น — แถวที่ประเภทวิชาเป็น "วิชาเพิ่มเติม" จะถูกบังคับเป็น "ผลการเรียนรู้" เสมอไม่ว่าคอลัมน์นี้จะระบุอะไร<br>
            • รายการที่มี ระดับชั้น + รหัสตัวชี้วัด + ประเภท ซ้ำกับที่มีอยู่แล้ว จะถูกอัปเดตทับ ไม่สร้างซ้ำ<br>
            • กด "ส่งออก Excel" ก่อน เพื่อใช้ไฟล์เดิมเป็นเทมเพลตได้
          </span>
        </div>
      </div>
      <div style="border:2px dashed var(--bdr);border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:all .2s"
           id="ind-drop-zone"
           onclick="$('ind-excel-file').click()"
           ondragover="event.preventDefault();this.style.borderColor='var(--ac)'"
           ondragleave="this.style.borderColor='var(--bdr)'"
           ondrop="handleIndFileDrop(event)">
        <div style="margin-bottom:10px;color:#8e8e93"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></div>
        <div style="font-weight:600;color:var(--txt);margin-bottom:4px">คลิกเพื่อเลือกไฟล์ หรือลากวางที่นี่</div>
        <div style="font-size:12.5px;color:var(--muted)">รองรับ .xlsx, .xls</div>
        <input type="file" id="ind-excel-file" accept=".xlsx,.xls" style="display:none" onchange="handleIndFileSelect(this)">
      </div>
      <div id="ind-imp-preview" style="margin-top:14px"></div>
    </div>
    <div class="mf">
      <button class="btn bs" onclick="rmModal('indImpMod')">ยกเลิก</button>
      <button class="btn bp" id="ind-imp-btn" onclick="doIndicatorImport()" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>นำเข้า</button>
    </div>
  </div></div>`);
}
function handleIndFileDrop(e){
  e.preventDefault();
  $('ind-drop-zone').style.borderColor='var(--bdr)';
  const file=e.dataTransfer.files[0];
  if(file) readIndExcelFile(file);
}
function handleIndFileSelect(input){
  const file=input.files[0];
  if(file) readIndExcelFile(file);
}
async function readIndExcelFile(file){
  $('ind-imp-preview').innerHTML='<div style="color:var(--muted);font-size:13px">⏳ กำลังอ่านไฟล์...</div>';
  try{ await ensureXLSX(); }
  catch(e){ $('ind-imp-preview').innerHTML=`<div class="alert al-er">โหลดตัวอ่าน Excel ไม่สำเร็จ: ${e.message}</div>`; return; }
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      parseIndExcelRows(rows);
    }catch(err){
      $('ind-imp-preview').innerHTML=`<div class="alert al-er">อ่านไฟล์ไม่ได้: ${err.message}</div>`;
    }
  };
  reader.readAsBinaryString(file);
}
function parseIndExcelRows(rows){
  _indExcelData=[]; _indExcelSkipped=0;
  // ตรวจหา header row (แถวที่มีคำว่า "รหัสตัวชี้วัด" หรือ indicator)
  let dataStart=0;
  for(let i=0;i<Math.min(5,rows.length);i++){
    const r=(rows[i]||[]).map(c=>String(c||'').trim());
    if(r.some(c=>c.includes('รหัสตัวชี้วัด')||c.toLowerCase().includes('indicator'))){ dataStart=i+1; break; }
  }
  for(let i=dataStart;i<rows.length;i++){
    const r=(rows[i]||[]).map(c=>String(c??'').trim());
    if(r.every(c=>!c)) continue; // ข้ามแถวว่าง
    const [subject_group,subject_type_raw,grade_level,standard_code,indicator_code,indicator_text,kind_raw]=r;
    const subject_type=(subject_type_raw||'').trim()||'รายวิชาพื้นฐาน';
    // วิชาเพิ่มเติมใช้ "ผลการเรียนรู้" เสมอ ไม่ว่าคอลัมน์ประเภทในไฟล์จะระบุอะไรมา
    const kind=subject_type==='วิชาเพิ่มเติม'?'ผลการเรียนรู้':(kind_raw||'').trim();
    if(!subject_group||!grade_level||!indicator_code||!indicator_text||!IND_KIND_VALUES.includes(kind)){ _indExcelSkipped++; continue; }
    _indExcelData.push({
      subject_group,
      subject_type,
      grade_level,
      standard_code:(standard_code||'').trim(),
      indicator_code,
      indicator_text,
      kind
    });
  }
  const groups={};
  _indExcelData.forEach(r=>{ const k=r.subject_group+' · '+r.grade_level; groups[k]=(groups[k]||0)+1; });
  const groupList=Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'th'));
  const btn=$('ind-imp-btn');
  if(!_indExcelData.length){
    $('ind-imp-preview').innerHTML=`<div class="alert al-er">ไม่พบข้อมูลที่ถูกต้อง — ตรวจสอบ format คอลัมน์ และค่า "ประเภท" ต้องเป็น ระหว่างทาง/ปลายทาง/ผลการเรียนรู้ เท่านั้น</div>`;
    if(btn) btn.disabled=true;
  }else{
    $('ind-imp-preview').innerHTML=`<div class="alert al-ok" style="margin-bottom:8px">
        ${_ico.checkCircle} พบข้อมูล <strong>${_indExcelData.length} รายการ</strong>
        ${_indExcelSkipped>0?`<span style="color:var(--warn-txt)"> (ข้าม ${_indExcelSkipped} แถวที่ไม่ครบ/ไม่ถูกต้อง)</span>`:''}
      </div>
      <div class="tw"><table>
        <thead><tr><th class="tl">กลุ่มสาระ · ระดับชั้น</th><th>จำนวน</th></tr></thead>
        <tbody>${groupList.map(([k,n])=>`<tr><td class="tl">${esc(k)}</td><td class="tc">${n} รายการ</td></tr>`).join('')}</tbody>
      </table></div>`;
    if(btn) btn.disabled=false;
  }
}
async function doIndicatorImport(){
  if(!_indExcelData.length){ toast('กรุณาเลือกไฟล์ที่มีข้อมูลถูกต้องก่อน','er'); return; }
  const btn=$('ind-imp-btn'); if(btn) btn.disabled=true;
  loading(true);
  try{
    const CHUNK=500;
    for(let i=0;i<_indExcelData.length;i+=CHUNK){
      const chunk=_indExcelData.slice(i,i+CHUNK);
      await q(sb.from('indicators').upsert(chunk,{onConflict:'grade_level,indicator_code,kind'}));
    }
    _indicatorsAll=null; // บังคับให้หน้าแผนการวัดโหลดตัวชี้วัดใหม่ครั้งถัดไป
    rmModal('indImpMod');
    toast(`นำเข้าตัวชี้วัดสำเร็จ ${_indExcelData.length} รายการ`);
    pgSettings();
  }catch(e){ toast('นำเข้าไม่สำเร็จ: '+e.message,'er'); if(btn) btn.disabled=false; }
  finally{ loading(false); }
}
async function exportIndicators(){
  loading(true);
  try{
    const rows=await qAll(()=>sb.from('indicators').select('subject_group,subject_type,grade_level,standard_code,indicator_code,indicator_text,kind').order('subject_group').order('grade_level').order('indicator_code'));
    const aoa=[
      ['กลุ่มสาระ','ประเภทวิชา','ระดับชั้น','มาตรฐาน','รหัสตัวชี้วัด','คำอธิบาย','ประเภท'],
      ...rows.map(r=>[r.subject_group,r.subject_type,r.grade_level,r.standard_code,r.indicator_code,r.indicator_text,r.kind])
    ];
    exportExcel([{name:'ตัวชี้วัด',aoa,colWidths:[24,16,10,10,16,50,12]}],'ตัวชี้วัด.xlsx');
  }catch(e){ toast('ส่งออกไม่สำเร็จ: '+e.message,'er'); }
  finally{ loading(false); }
}

let _syncActivities=[];
let _mpTeachers=[],_mpGrants=new Set(); // menu_permissions grid state (จัดการสิทธิ์การเข้าถึงเมนู)
let _indicatorCount=0;
let _allLogins=[],_auditRows=[]; // บันทึกการใช้งานระบบ: ล็อกอินล่าสุด + เหตุการณ์สำคัญ
function _fmtDT(iso){
  if(!iso) return '—';
  const d=new Date(iso);
  if(isNaN(d)) return '—';
  const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), yy=d.getFullYear()+543;
  const hh=String(d.getHours()).padStart(2,'0'), mi=String(d.getMinutes()).padStart(2,'0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}
const _AUDIT_LABELS={delete_student:'ลบนักเรียน',promote_students:'เลื่อนชั้น',wipe_data:'ล้างข้อมูลทั้งหมด',restore_backup:'Restore จาก backup'};
function _auditActionLabel(action){ return esc(_AUDIT_LABELS[action]||action); }
let _settingsActiveTab='stg-general'; // จำแท็บที่เปิดอยู่ ไม่ให้กระโดดกลับแท็บแรกทุกครั้งที่บันทึก/รีเฟรชหน้า
function _stgTab(id){ _settingsActiveTab=id; swTab('stg',id); }
async function pgSettings(){
  if(_settingsActiveTab==='stg-admin'&&!S.profile?.is_admin) _settingsActiveTab='stg-general';
  const cfg=S.config;
  _sgList=[...SUBJECT_GROUPS];
  _rpgList={...ROOMS_PER_GRADE};
  _glPrefix=GRADE_PREFIX; _glList=[...GRADE_LEVELS];
  loading(true);
  try{ _syncActivities=await q(sb.from('activities').select('id,name').eq('is_active',true).order('id')); }
  catch(e){ _syncActivities=[]; }
  if(S.profile?.is_admin){
    try{
      const[teachers,permRows,indRows,allLogins,auditRows]=await Promise.all([
        q(sb.from('profiles').select('id,full_name,is_director').eq('is_admin',false).order('full_name')),
        q(sb.from('menu_permissions').select('teacher_id,menu_key')),
        qAll(()=>sb.from('indicators').select('id')),
        q(sb.from('profiles').select('id,full_name,is_admin,last_login_at').order('last_login_at',{ascending:false,nullsFirst:false})),
        q(sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(100)),
      ]);
      _mpTeachers=teachers;
      _mpGrants=new Set(permRows.map(r=>r.teacher_id+'_'+r.menu_key));
      _indicatorCount=indRows.length;
      _allLogins=allLogins;
      _auditRows=auditRows;
    }catch(e){ _mpTeachers=[]; _mpGrants=new Set(); _indicatorCount=0; _allLogins=[]; _auditRows=[]; }
  }
  loading(false);
  $('pg').innerHTML=`
  <div class="ph">
    <div class="ptitle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="vertical-align:-3px;margin-right:6px;opacity:.7"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07m14.14 0A10 10 0 0 0 4.93 4.93m7.07 2.57V3m0 18v-4.5m4.5-4.5H21M3 12h4.5M17.07 17.07l-3.18-3.18M6.93 6.93l3.18 3.18m6.96-3.18L13.89 10.11M6.93 17.07l3.18-3.18"/></svg>
      ตั้งค่าระบบ
    </div>
  </div>

  <div class="tabs" style="margin-bottom:16px">
    <button class="tab ${_settingsActiveTab==='stg-general'?'active':''}" data-tg="stg" data-ti="stg-general" onclick="_stgTab('stg-general')">ทั่วไป</button>
    <button class="tab ${_settingsActiveTab==='stg-academic'?'active':''}" data-tg="stg" data-ti="stg-academic" onclick="_stgTab('stg-academic')">การเรียนการสอน</button>
    <button class="tab ${_settingsActiveTab==='stg-security'?'active':''}" data-tg="stg" data-ti="stg-security" onclick="_stgTab('stg-security')">ความปลอดภัยและข้อมูล</button>
    ${S.profile?.is_admin?`<button class="tab ${_settingsActiveTab==='stg-admin'?'active':''}" data-tg="stg" data-ti="stg-admin" onclick="_stgTab('stg-admin')">แอดมิน</button>`:''}
  </div>

  <div class="tp ${_settingsActiveTab==='stg-general'?'active':''}" id="stg-general" data-tp="stg">

  <!-- ── โลโก้โรงเรียน ── -->
  <div class="card" style="margin-bottom:16px">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        โลโก้โรงเรียน
      </div>
    </div>
    <div class="cb">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div style="width:72px;height:72px;border-radius:16px;overflow:hidden;background:#f5f5f7;border:1px solid rgba(0,0,0,.08);flex-shrink:0;display:flex;align-items:center;justify-content:center">
          <img id="logo-preview"
            src="${S.config.logo_url||'/assets/logo.webp'}"
            style="width:72px;height:72px;object-fit:contain"
            onerror="this.style.opacity='.25'">
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--txt);margin-bottom:3px">${S.config.logo_url?'ใช้โลโก้ที่อัพโหลด':'ใช้โลโก้เริ่มต้น'}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:2px">PNG / JPG แนะนำ 400×400px ขึ้นไป ไม่เกิน 5MB</div>
          <div style="font-size:11.5px;color:var(--muted)">แสดงใน: หน้า Login · แถบข้าง · รายงาน ปพ.5</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label class="btn bs" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin:0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          เลือกรูปภาพ
          <input type="file" accept="image/*" style="display:none" onchange="uploadLogo(this)">
        </label>
        ${S.config.logo_url?`
        <button class="btn" onclick="removeLogo()" style="color:#FF3B30;border-color:rgba(255,59,48,.3)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          คืนค่าโลโก้เริ่มต้น
        </button>`:''}
      </div>
    </div>
  </div>

  <!-- ── ลิงก์คู่มือการใช้งาน (Google Drive) ── -->
  <div class="card" style="margin-bottom:16px">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        คู่มือการใช้งาน
      </div>
    </div>
    <div class="cb">
      <label class="fl">ลิงก์ไฟล์ Google Drive</label>
      <input class="fi" id="c-manual-url" value="${esc(cfg.manual_drive_url||'')}" placeholder="วางลิงก์แชร์จาก Google Drive เช่น https://drive.google.com/file/d/XXXXXXXX/view">
      <div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.7">
        เปิดไฟล์ใน Google Drive → คลิก "แชร์" → เปลี่ยนสิทธิ์เป็น <strong>"ทุกคนที่มีลิงก์"</strong> (ดูได้) → คัดลอกลิงก์มาวางที่นี่ → กด "บันทึกการตั้งค่า" ด้านล่าง<br>
        ถ้าเว้นว่างไว้ ระบบจะใช้คู่มือฉบับเริ่มต้นของระบบแทน
      </div>
    </div>
  </div>

  <!-- ── แถวบน: ข้อมูลโรงเรียน + ครูผู้สอน ── -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start;margin-bottom:16px;">

    <!-- การ์ด: ข้อมูลโรงเรียนและปีการศึกษา -->
    <div class="card" style="margin-bottom:0">
      <div class="ch">
        <div class="ct" style="display:flex;align-items:center;gap:7px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          ข้อมูลโรงเรียนและปีการศึกษา
        </div>
      </div>
      <div class="cb">
        <div class="fg">
          <div style="grid-column:1/-1">
            <label class="fl">ชื่อโรงเรียน</label>
            <input class="fi" id="c-school" value="${esc(cfg.school_name||'')}" placeholder="เช่น โรงเรียนตาเบาวิทยา">
          </div>
          <div>
            <label class="fl">อำเภอ/เขต</label>
            <input class="fi" id="c-dist" value="${esc(cfg.school_district||'')}" placeholder="อำเภอ">
          </div>
          <div>
            <label class="fl">จังหวัด</label>
            <input class="fi" id="c-prov" value="${esc(cfg.school_province||'')}" placeholder="จังหวัด">
          </div>
          <div>
            <label class="fl">ปีการศึกษา</label>
            <input class="fi" id="c-year" value="${esc(cfg.academic_year||'2568')}" placeholder="2568">
          </div>
          <div>
            <label class="fl">ภาคเรียนที่</label>
            <select class="fs" id="c-sem">
              <option ${cfg.semester=='1'?'selected':''}>1</option>
              <option ${cfg.semester=='2'?'selected':''}>2</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="fl">ชื่อผู้อำนวยการ</label>
            <input class="fi" id="c-dir" value="${esc(cfg.director_name||'')}" placeholder="ชื่อ-สกุล ผู้อำนวยการ">
          </div>
          <div style="grid-column:1/-1">
            <label class="fl">ชื่อรองผู้อำนวยการ</label>
            <input class="fi" id="c-vdir" value="${esc(cfg.vice_director||'')}" placeholder="ชื่อ-สกุล รองผู้อำนวยการ">
          </div>
          <div style="grid-column:1/-1">
            <label class="fl">หัวหน้างานทะเบียนวัดผล</label>
            <select class="fs" id="c-head-reg">
              <option value="">— เลือกครู —</option>
              ${(cfg.teachers||'').split('\n').filter(t=>t.trim()).map(t=>`<option value="${esc(t.trim())}" ${cfg.head_registrar===t.trim()?'selected':''}>${esc(t.trim())}</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="fl">หัวหน้างานวิชาการ</label>
            <select class="fs" id="c-head-acad">
              <option value="">— เลือกครู —</option>
              ${(cfg.teachers||'').split('\n').filter(t=>t.trim()).map(t=>`<option value="${esc(t.trim())}" ${cfg.head_academic===t.trim()?'selected':''}>${esc(t.trim())}</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="fl" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/></svg>
              Gemini API Key <span style="font-weight:400;color:var(--muted)">(สำหรับผู้ช่วย AI)</span>
            </label>
            <div style="position:relative">
              <input class="fi" id="c-gemini-key" type="password" value="${esc(cfg.gemini_api_key||'')}" placeholder="AIzaSy..." style="padding-right:42px">
              <button type="button" onclick="const i=$('c-gemini-key');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted)">${_ico.eye}</button>
            </div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:4px">รับฟรีได้ที่ <strong>aistudio.google.com</strong> → Get API Key</div>
          </div>
          <div style="grid-column:1/-1">
            <label class="fl" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
              Typhoon OCR API Key <span style="font-weight:400;color:var(--muted)">(สำหรับถ่ายรูปกรอกคะแนน — ทดลอง)</span>
            </label>
            <div style="position:relative">
              <input class="fi" id="c-typhoon-key" type="password" value="${esc(cfg.typhoon_api_key||'')}" placeholder="sk-..." style="padding-right:42px">
              <button type="button" onclick="const i=$('c-typhoon-key');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted)">${_ico.eye}</button>
            </div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:4px">รับฟรีได้ที่ <strong>opentyphoon.ai</strong> → สมัครและสร้าง API Key</div>
          </div>
        </div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--bdr);">
          <button class="btn bp" onclick="saveSettings()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>

    <!-- การ์ด: ครูผู้สอน -->
    <div class="card" style="margin-bottom:0">
      <div class="ch">
        <div class="ct" style="display:flex;align-items:center;gap:7px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ครูผู้สอน
        </div>
        <span style="font-size:12px;color:var(--muted);font-weight:400">${(cfg.teachers||'').split('\n').filter(t=>t.trim()).length} คน</span>
      </div>
      <div class="cb">
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          รายชื่อจะปรากฏเป็น dropdown ในหน้าเพิ่มรายวิชา
        </div>
        <div id="teacher-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          ${(cfg.teachers||'').split('\n').filter(t=>t.trim()).map((t,i)=>`
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:12px;color:var(--muted);min-width:20px;text-align:right">${i+1}.</span>
            <input class="fi" style="flex:1" value="${esc(t.trim())}" id="tc-${i}" placeholder="ชื่อ-สกุล ครู">
            <button class="btn bs" style="padding:6px 9px;color:var(--err);flex-shrink:0" onclick="this.closest('div').remove()" title="ลบ">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;align-items:center;padding-top:12px;border-top:1px solid var(--bdr);">
          <button class="btn bs" onclick="_addTeacherRow()" style="flex:1;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มครู
          </button>
          <button class="btn bp" onclick="saveSettings()" style="flex:1;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            บันทึก
          </button>
        </div>
      </div>
    </div>

  </div><!-- end top grid -->

  </div><!-- /stg-general -->

  <div class="tp ${_settingsActiveTab==='stg-academic'?'active':''}" id="stg-academic" data-tp="stg">

  <!-- ── กลุ่มสาระการเรียนรู้ ── -->
  <div class="card">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        กลุ่มสาระการเรียนรู้
      </div>
    </div>
    <div class="cb">
      <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">เพิ่ม ลบ หรือเรียงลำดับกลุ่มสาระที่ใช้ในระบบ (ใช้ในฟอร์มรายวิชาและรายงาน IQA)</div>
      <div id="sg-list">${_sgListHTML(_sgList)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input class="fi" id="sg-new" placeholder="ชื่อกลุ่มสาระใหม่..." style="flex:1" onkeydown="if(event.key==='Enter')sgAdd()">
        <button class="btn bs" onclick="sgAdd()" style="white-space:nowrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          เพิ่ม
        </button>
      </div>
      <button class="btn bp" onclick="saveSgList()" style="margin-top:14px;width:100%;justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        บันทึกกลุ่มสาระ
      </button>
    </div>
  </div>

  <!-- ── ระดับชั้นที่ใช้ในระบบ ── -->
  <div class="card">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        ระดับชั้นที่ใช้ในระบบ
      </div>
    </div>
    <div class="cb">
      <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">กำหนดคำนำหน้าและรายการระดับชั้นที่เปิดใช้งานในระบบ (ใช้ในฟอร์มรายวิชา นักเรียน และรายงานต่างๆ) — ปัจจุบันข้อมูลตัวชี้วัด/มาตรฐานที่มีในระบบเป็นของมัธยมศึกษาเท่านั้น หากเพิ่มระดับชั้นอื่นในอนาคต ต้องเตรียมข้อมูลตัวชี้วัดของระดับนั้นเพิ่มเติมเอง</div>
      <div style="margin-bottom:14px">
        <label class="fl">คำนำหน้าระดับชั้น</label>
        <input class="fi" id="gl-prefix" value="${esc(_glPrefix)}" placeholder="เช่น ม. หรือ ป." oninput="_glPrefixInput(this.value)">
      </div>
      <label class="fl">รายการระดับชั้น</label>
      <div id="gl-list">${_glListHTML(_glList)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input class="fi" id="gl-new" placeholder="เช่น 1, 2, 3..." style="flex:1" onkeydown="if(event.key==='Enter')glAdd()">
        <button class="btn bs" onclick="glAdd()" style="white-space:nowrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          เพิ่ม
        </button>
      </div>
      <button class="btn bp" onclick="saveGradeLevels()" style="margin-top:14px;width:100%;justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        บันทึกระดับชั้น
      </button>
    </div>
  </div>

  <!-- ── จำนวนห้องต่อระดับชั้น ── -->
  <div class="card">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        จำนวนห้องต่อระดับชั้น
      </div>
    </div>
    <div class="cb">
      <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">กำหนดจำนวนห้องของแต่ละระดับชั้น เพื่อใช้เป็นตัวเลือกในช่อง "ห้อง" ของฟอร์มรายวิชา</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${GRADE_LEVELS.map(g=>`<div><label class="fl">${esc(GRADE_PREFIX)}${esc(g)}</label><input type="number" class="fi" id="rpg-${g}" value="${_rpgList[g]||1}" min="1" max="30"></div>`).join('')}
      </div>
      <button class="btn bp" onclick="saveRoomsPerGrade()" style="margin-top:14px;width:100%;justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        บันทึกจำนวนห้อง
      </button>
    </div>
  </div>

  ${S.profile?.is_admin?`
  <!-- ── ปุ่มคัดลอกวิชาไปปีการศึกษาใหม่ ── -->
  <div class="card">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        ปุ่มคัดลอกวิชาไปปีการศึกษาใหม่
      </div>
    </div>
    <div class="cb">
      <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">
        ควบคุมว่าครู (ที่ไม่ใช่แอดมิน) จะเห็นปุ่ม "คัดลอกวิชาไปปีการศึกษาใหม่" ในหน้าจัดการรายวิชาหรือไม่ — ปิดไว้เพื่อป้องกันการกดโดยไม่ตั้งใจ แอดมินจะเห็นปุ่มนี้เสมอไม่ว่าจะตั้งค่าอย่างไร
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="c-copysub-on" ${S.config.copy_subjects_enabled!=='0'?'checked':''} onchange="toggleCopySubjectsEnabled(this)" style="width:18px;height:18px;accent-color:var(--ac)">
        <span style="font-size:14px;font-weight:600">แสดงปุ่มคัดลอกวิชาสำหรับครู</span>
      </label>
    </div>
  </div>`:''}

  <!-- ── เชื่อมโยงกับระบบเช็คชื่อ ── -->
  <div class="card">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        เชื่อมโยงกับระบบเช็คชื่อ
      </div>
    </div>
    <div class="cb">
      <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">
        เมื่อเปิดใช้งาน หน้า "บันทึกเวลาเรียน" จะมีปุ่มดึงข้อมูลสถานะ มา/ลา/ขาด จากระบบเช็คชื่อ มาเติมให้อัตโนมัติเฉพาะวันที่ยังไม่ได้กรอก (ครูยังแก้ไขเองได้ตามปกติ)
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer">
        <input type="checkbox" id="c-cksync-on" ${S.config.checkin_sync_enabled==='1'?'checked':''} style="width:18px;height:18px;accent-color:var(--ac)">
        <span style="font-size:14px;font-weight:600">เปิดใช้งานการดึงข้อมูล</span>
      </label>
      <div class="fg">
        <div>
          <label class="fl">กิจกรรมที่ใช้อ้างอิง</label>
          <select class="fs" id="c-cksync-act">
            <option value="">— เลือกกิจกรรม —</option>
            ${_syncActivities.map(a=>`<option value="${a.id}" ${String(S.config.checkin_sync_activity_id)===String(a.id)?'selected':''}>${esc(a.name)}</option>`).join('')}
          </select>
          ${!_syncActivities.length?`<div style="font-size:11.5px;color:#dc2626;margin-top:6px">ไม่พบกิจกรรมจากระบบเช็คชื่อที่เปิดใช้งานอยู่</div>`:''}
        </div>
        <div>
          <label class="fl">รอบ</label>
          <select class="fs" id="c-cksync-sess">
            <option value="morning" ${S.config.checkin_sync_session!=='evening'?'selected':''}>เช้า</option>
            <option value="evening" ${S.config.checkin_sync_session==='evening'?'selected':''}>บ่าย</option>
          </select>
        </div>
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--bdr);">
        <button class="btn bp" onclick="saveCheckinSync()" style="width:100%;justify-content:center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          บันทึกการตั้งค่า
        </button>
      </div>
    </div>
  </div>


  </div><!-- /stg-academic -->

  <div class="tp ${_settingsActiveTab==='stg-security'?'active':''}" id="stg-security" data-tp="stg">

  <!-- ── แถวล่าง: รหัสผ่านแอดมิน + Backup/Restore + โซนอันตราย ── -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start;">

    <!-- การ์ด: รหัสผ่านแอดมิน -->
    <div class="card" style="margin-bottom:0">
      <div class="ch">
        <div class="ct" style="display:flex;align-items:center;gap:7px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          รหัสผ่านแอดมิน
        </div>
        <span id="admpw-status" class="badge ${cfg.admin_password?'bg-g':'bg-gr'}">
          ${cfg.admin_password?'✓ ตั้งรหัสแล้ว':'ยังไม่ได้ตั้งรหัส'}
        </span>
      </div>
      <div class="cb">
        <div class="alert al-in" style="margin-bottom:14px">
          <div class="alert-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <span>ใช้สำหรับ: <strong>ดูรายงานทั้งโรงเรียน</strong> และ <strong>ลบนักเรียน</strong>${!cfg.admin_password?' (ค่าเริ่มต้น: <strong>1234</strong>)':''}</span>
        </div>
        <div class="fg" style="grid-template-columns:1fr;gap:12px">
          <div>
            <label class="fl">รหัสผ่านปัจจุบัน</label>
            <input type="password" class="fi" id="c-admpw-old" placeholder="ใส่รหัสเดิม (ถ้ามี)">
          </div>
          <div>
            <label class="fl">รหัสผ่านใหม่</label>
            <input type="password" class="fi" id="c-admpw" placeholder="ตั้งรหัสใหม่ (อย่างน้อย 4 ตัว)">
          </div>
        </div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--bdr);">
          <button class="btn bp" onclick="saveAdminPassword()" style="background:rgba(180,83,9,.9);color:#fff;width:100%;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            บันทึกรหัสผ่าน
          </button>
        </div>
      </div>
    </div>

    <!-- การ์ด: สำรองและกู้คืนข้อมูล -->
    <div class="card" style="margin-bottom:0">
      <div class="ch">
        <div class="ct" style="display:flex;align-items:center;gap:7px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          สำรองและกู้คืนข้อมูล
        </div>
      </div>
      <div class="cb">
        <div style="font-size:13px;color:#6e6e73;line-height:1.8;margin-bottom:14px">
          <strong style="color:#1d1d1f">Backup</strong> — ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ .xlsx<br>
          <strong style="color:#1d1d1f">Restore</strong> — นำเข้าข้อมูลจากไฟล์ Backup (จะแทนที่ข้อมูลปัจจุบัน)
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn bs" onclick="backupAllData()" style="background:rgba(52,199,89,.12);color:#16803d;flex:1;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Backup
          </button>
          <button class="btn bs" onclick="openRestoreDialog()" style="background:rgba(255,59,48,.1);color:#dc2626;flex:1;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Restore
          </button>
        </div>
      </div>
    </div>

    <!-- การ์ด: โซนอันตราย -->
    <div class="card" style="margin-bottom:0;border:1.5px solid #fecaca;">
      <div class="ch" style="background:#fff1f0;">
        <div class="ct" style="color:#dc2626;display:flex;align-items:center;gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          โซนอันตราย
        </div>
      </div>
      <div class="cb">
        <div style="font-size:13px;color:#6e6e73;line-height:1.9;margin-bottom:14px;">
          <strong style="color:#1d1d1f">ล้างข้อมูลทั้งหมด</strong><br>
          ลบ <strong>รายวิชา · นักเรียน · เวลาเรียน · คะแนน · การประเมิน</strong> ทั้งหมดออกจากระบบ<br>
          <span style="color:#dc2626;font-weight:700">${_ico.warning} ไม่สามารถกู้คืนได้</span> — แนะนำ <strong>Backup ก่อน</strong> ทุกครั้ง
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid #fecaca;">
          <button class="btn" onclick="openClearAllDialog()"
            style="background:#fff1f0;color:#dc2626;border:1.5px solid #fecaca;font-weight:700;flex:1;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            ล้างข้อมูลทั้งหมด
          </button>
          <span style="font-size:12px;color:#8e8e93;flex-shrink:0">ยืนยัน 3 ชั้น</span>
        </div>
      </div>
    </div>

  </div><!-- end bottom grid -->

  ${S.profile?.is_admin ? `
  <!-- ── จัดการสิทธิ์การเข้าถึงเมนู ── -->
  <div class="card" style="margin-top:16px">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        จัดการสิทธิ์การเข้าถึงเมนู
      </div>
    </div>
    <div class="cb">
      <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">
        กำหนดว่าครูแต่ละคนเข้าเมนูใดได้บ้าง ใช้แทนรหัสผ่านผู้บริหารแบบเดิม — แอดมิน (Admin) เข้าได้ทุกเมนูอยู่แล้วโดยไม่ต้องตั้งค่าตรงนี้
      </div>
      ${!_mpTeachers.length?`<div style="font-size:13px;color:var(--muted);text-align:center;padding:16px">ไม่มีครูที่ต้องตั้งค่า (มีแต่บัญชีแอดมิน)</div>`:`
      <div class="tw"><table>
        <thead><tr><th class="tl">ครู</th><th>ตั้งค่าระบบ</th><th>รายงานทั้งโรงเรียน</th><th>นักเรียน</th><th>มาตรฐานและตัวชี้วัด</th><th>ผู้บริหาร</th></tr></thead>
        <tbody>${_mpTeachers.map(t=>`<tr>
          <td class="tl">${esc(t.full_name||'')}</td>
          <td class="tc"><input type="checkbox" class="mp-cb" data-tid="${t.id}" data-key="settings" ${_mpGrants.has(t.id+'_settings')?'checked':''}></td>
          <td class="tc"><input type="checkbox" class="mp-cb" data-tid="${t.id}" data-key="school_report" ${_mpGrants.has(t.id+'_school_report')?'checked':''}></td>
          <td class="tc"><input type="checkbox" class="mp-cb" data-tid="${t.id}" data-key="students" ${_mpGrants.has(t.id+'_students')?'checked':''}></td>
          <td class="tc"><input type="checkbox" class="mp-cb" data-tid="${t.id}" data-key="standards" ${_mpGrants.has(t.id+'_standards')?'checked':''}></td>
          <td class="tc"><input type="checkbox" class="mp-director-cb" data-tid="${t.id}" ${t.is_director?'checked':''} title="ผู้บริหาร: ล็อกอินแล้วพาไปหน้ารายงานทั้งโรงเรียนทันที ซ่อนเมนูบันทึกข้อมูล/แดชบอร์ดที่ผูกกับวิชา (เพราะไม่มีวิชาของตัวเอง) และเห็นรายงานทั้งโรงเรียนเสมอ"></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.6">"ผู้บริหาร" — ล็อกอินแล้วพาไปหน้า "รายงานทั้งโรงเรียน" ทันที และซ่อนเมนูที่ผูกกับวิชา (บันทึกคะแนน/เวลาเรียน/ประเมิน ฯลฯ) เพราะไม่มีวิชาสอนเอง เหมาะสำหรับบัญชีผู้อำนวยการ/รองผู้อำนวยการ</div>
      <button class="btn bp" onclick="saveMenuPerms()" style="margin-top:14px;width:100%;justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        บันทึกสิทธิ์การเข้าถึง
      </button>`}
    </div>
  </div>` : ''}

  ${S.profile?.is_admin ? `
  <!-- ── บันทึกการใช้งานระบบ ── -->
  <div class="card" style="margin-top:16px">
    <div class="ch">
      <div class="ct" style="display:flex;align-items:center;gap:7px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        บันทึกการใช้งานระบบ
      </div>
    </div>
    <div class="cb">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">ล็อกอินล่าสุดของแต่ละคน</div>
      ${!_allLogins.length?`<div style="font-size:13px;color:var(--muted);text-align:center;padding:12px">ยังไม่มีข้อมูล</div>`:`
      <div class="tw"><table>
        <thead><tr><th class="tl">บัญชี</th><th>สิทธิ์</th><th>ล็อกอินล่าสุด</th></tr></thead>
        <tbody>${_allLogins.map(p=>`<tr>
          <td class="tl">${esc(p.full_name||'')}</td>
          <td class="tc">${p.is_admin?'แอดมิน':'ครู'}</td>
          <td class="tc">${_fmtDT(p.last_login_at)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}

      <div style="font-size:13px;font-weight:700;margin:20px 0 10px">เหตุการณ์สำคัญ <span style="font-weight:400;color:var(--muted);font-size:11.5px">(ลบนักเรียน / เลื่อนชั้น / ล้างข้อมูล / Restore — 100 รายการล่าสุด)</span></div>
      ${!_auditRows.length?`<div style="font-size:13px;color:var(--muted);text-align:center;padding:12px">ยังไม่มีเหตุการณ์บันทึกไว้</div>`:`
      <div class="tw"><table>
        <thead><tr><th class="tl">เวลา</th><th class="tl">ผู้ทำรายการ</th><th class="tl">เหตุการณ์</th><th class="tl">รายละเอียด</th></tr></thead>
        <tbody>${_auditRows.map(r=>`<tr>
          <td class="tl" style="white-space:nowrap">${_fmtDT(r.created_at)}</td>
          <td class="tl">${esc(r.actor_name||'')}</td>
          <td class="tl">${_auditActionLabel(r.action)}</td>
          <td class="tl">${esc(r.detail||'')}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
  </div>` : ''}

  </div><!-- /stg-security -->

  ${S.profile?.is_admin?`
  <div class="tp ${_settingsActiveTab==='stg-admin'?'active':''}" id="stg-admin" data-tp="stg">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start;">

    <!-- การ์ด: แผงควบคุมแอดมิน -->
    <div class="card" style="margin-bottom:0;border:1.5px solid rgba(175,82,222,.3);">
      <div class="ch" style="background:rgba(175,82,222,.07);">
        <div class="ct" style="color:#af52de;display:flex;align-items:center;gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#af52de" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          แผงควบคุมแอดมิน
        </div>
        <span class="badge" style="background:rgba(175,82,222,.15);color:#af52de;">Admin</span>
      </div>
      <div class="cb">
        <div style="font-size:13px;color:#6e6e73;line-height:1.9;margin-bottom:14px;">
          จัดการข้อมูลของครูทุกคนในระบบ<br>
          สามารถ<strong>ลบข้อมูลรายครู</strong>ได้โดยไม่กระทบครูคนอื่น
        </div>
        <button class="btn bp" onclick="openAdminPanel()"
          style="background:rgba(175,82,222,.9);border-color:rgba(175,82,222,.9);width:100%;justify-content:center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          จัดการข้อมูลครู
        </button>
      </div>
    </div>

    <!-- การ์ด: จัดการตัวชี้วัด -->
    <div class="card" style="margin-bottom:0;border:1.5px solid rgba(175,82,222,.3);">
      <div class="ch" style="background:rgba(175,82,222,.07);">
        <div class="ct" style="color:#af52de;display:flex;align-items:center;gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#af52de" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          จัดการตัวชี้วัด
        </div>
        <span class="badge" style="background:rgba(175,82,222,.15);color:#af52de;">Admin</span>
      </div>
      <div class="cb">
        <div style="font-size:13px;color:#6e6e73;line-height:1.9;margin-bottom:14px;">
          คลังตัวชี้วัดระหว่างทาง/ปลายทาง (รายวิชาพื้นฐาน) และผลการเรียนรู้ (วิชาเพิ่มเติม) ที่ใช้ในหน้า "แผนการวัดและประเมินผล" — ปัจจุบันมี <strong>${_indicatorCount.toLocaleString()}</strong> รายการ<br>
          <span style="font-size:12px;color:#8e8e93">นำเข้าไฟล์ Excel เพื่อเพิ่มตัวชี้วัดของระดับชั้นอื่น (เช่นประถมศึกษา) เอง — ข้อมูลที่มีรหัสตัวชี้วัด+ระดับชั้น+ประเภทซ้ำกับที่มีอยู่แล้วจะถูกอัปเดตทับ ไม่สร้างซ้ำ</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn bs" style="flex:1;justify-content:center;min-width:140px" onclick="exportIndicators()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ส่งออก Excel
          </button>
          <button class="btn bp" style="flex:1;justify-content:center;min-width:140px;background:rgba(175,82,222,.9);border-color:rgba(175,82,222,.9)" onclick="openIndicatorImport()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            นำเข้าจาก Excel
          </button>
        </div>
      </div>
    </div>

    <!-- การ์ด: ประกาศ/แจ้งเตือนผู้ใช้งาน -->
    <div class="card" style="margin-bottom:0;border:1.5px solid rgba(175,82,222,.3);">
      <div class="ch" style="background:rgba(175,82,222,.07);">
        <div class="ct" style="color:#af52de;display:flex;align-items:center;gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#af52de" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 0 1-5.8-1.6"/></svg>
          ประกาศ/แจ้งเตือนผู้ใช้งาน
        </div>
        <span class="badge" style="background:rgba(175,82,222,.15);color:#af52de;">Admin</span>
      </div>
      <div class="cb">
        <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">
          ตั้งข้อความให้ทุกคนเห็นเป็น popup ครั้งแรกที่เข้าระบบ (แก้ไขแล้วกดบันทึกใหม่ จะแสดงให้ทุกคนเห็นอีกครั้ง แม้จะเคยกด "รับทราบ" ไปแล้วก็ตาม)
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:14px">
          <input type="checkbox" id="c-ann-active" ${S.config.announcement_active==='1'?'checked':''} style="width:18px;height:18px;accent-color:var(--ac)">
          <span style="font-size:14px;font-weight:600">เปิดใช้งานประกาศ</span>
        </label>
        <label class="fl">หัวข้อ</label>
        <input class="fi" id="c-ann-title" value="${esc(S.config.announcement_title||'')}" placeholder="เช่น แจ้งปิดปรับปรุงระบบวันเสาร์นี้" style="margin-bottom:10px">
        <label class="fl">ข้อความ</label>
        <textarea class="fi" id="c-ann-msg" rows="3" placeholder="รายละเอียดประกาศ">${esc(S.config.announcement_message||'')}</textarea>
        <button class="btn bp" onclick="saveAnnouncement()" style="margin-top:12px;width:100%;justify-content:center;background:rgba(175,82,222,.9);border-color:rgba(175,82,222,.9)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          บันทึกประกาศ
        </button>
      </div>
    </div>

    <!-- การ์ด: โหมดปิดปรับปรุงระบบ -->
    <div class="card" style="margin-bottom:0;border:1.5px solid rgba(255,149,0,.35);">
      <div class="ch" style="background:rgba(255,149,0,.08);">
        <div class="ct" style="color:#b45309;display:flex;align-items:center;gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          โหมดปิดปรับปรุงระบบ
        </div>
        <span class="badge" style="background:rgba(255,149,0,.15);color:#b45309;">Admin</span>
      </div>
      <div class="cb">
        <div style="font-size:12px;color:#6e6e73;margin-bottom:14px;line-height:1.6">
          เมื่อเปิดไว้ ครูทุกคน (ยกเว้นแอดมิน) จะเข้าระบบไม่ได้ เห็นแค่หน้าจอแจ้งปิดปรับปรุงแทน — ใช้ตอนต้องแก้ไขข้อมูลสำคัญหรืออัปเดตระบบ
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:14px">
          <input type="checkbox" id="c-maint-on" ${S.config.maintenance_mode==='1'?'checked':''} style="width:18px;height:18px;accent-color:#FF9500">
          <span style="font-size:14px;font-weight:600;color:#b45309">ปิดระบบชั่วคราว (เฉพาะแอดมินเข้าได้)</span>
        </label>
        <label class="fl">ข้อความแจ้งผู้ใช้ (ไม่บังคับ)</label>
        <textarea class="fi" id="c-maint-msg" rows="2" placeholder="เช่น ระบบปิดปรับปรุงถึงเวลา 20:00 น. ขออภัยในความไม่สะดวก">${esc(S.config.maintenance_message||'')}</textarea>
        <button class="btn bp" onclick="saveMaintenanceMode()" style="margin-top:12px;width:100%;justify-content:center;background:#FF9500;border-color:#FF9500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          บันทึก
        </button>
      </div>
    </div>

  </div>
  </div><!-- /stg-admin -->`:''}

  `;
}
async function saveMenuPerms(){
  const rows=[];
  document.querySelectorAll('.mp-cb:checked').forEach(cb=>{
    rows.push({teacher_id:cb.dataset.tid,menu_key:cb.dataset.key});
  });
  const directorIds=Array.from(document.querySelectorAll('.mp-director-cb:checked')).map(cb=>cb.dataset.tid);
  const nonDirectorIds=Array.from(document.querySelectorAll('.mp-director-cb:not(:checked)')).map(cb=>cb.dataset.tid);
  loading(true);
  try{
    await q(sb.from('menu_permissions').delete().in('menu_key',['settings','school_report','students','standards']));
    if(rows.length) await q(sb.from('menu_permissions').insert(rows));
    if(directorIds.length) await q(sb.from('profiles').update({is_director:true}).in('id',directorIds));
    if(nonDirectorIds.length) await q(sb.from('profiles').update({is_director:false}).in('id',nonDirectorIds));
    _mpGrants=new Set(rows.map(r=>r.teacher_id+'_'+r.menu_key));
    _mpTeachers=_mpTeachers.map(t=>({...t,is_director:directorIds.includes(t.id)}));
    toast('บันทึกสิทธิ์การเข้าถึงเรียบร้อย');
  }catch(e){ toast('เกิดข้อผิดพลาด: '+e.message,'er'); }
  finally{ loading(false); }
}


async function saveAdminPassword(){
  const oldPw=$('c-admpw-old')?.value||'';
  const newPw=$('c-admpw')?.value.trim()||'';
  const current=S.config.admin_password||'1234';
  if(!newPw){toast('กรุณาใส่รหัสผ่านใหม่','er');return;}
  if(newPw.length<4){toast('รหัสผ่านต้องมีอย่างน้อย 4 ตัว','er');return;}
  // ถ้ามีรหัสเดิมอยู่แล้ว ต้องใส่รหัสเดิมให้ถูก
  if(S.config.admin_password && oldPw!==current){
    toast('รหัสผ่านเดิมไม่ถูกต้อง','er');
    const inp=$('c-admpw-old'); if(inp){inp.style.borderColor='var(--err)';inp.focus();}
    return;
  }
  loading(true);
  try{
    await q(sb.from('config').upsert([{key:'admin_password',value:newPw}],{onConflict:'key'}));
    await loadConfig();
    toast('บันทึกรหัสผ่านแอดมินเรียบร้อย');
    const inp1=$('c-admpw-old'),inp2=$('c-admpw');
    if(inp1)inp1.value='';if(inp2)inp2.value='';
    const st=$('admpw-status');
    if(st){st.textContent='✓ ตั้งรหัสไว้แล้ว';st.className='badge bg-g';}
  }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
}

function _addTeacherRow(){
  const list=document.getElementById('teacher-list');
  if(!list) return;
  const idx=list.querySelectorAll('input').length;
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:8px;align-items:center';
  div.innerHTML=`<input class="fi" style="flex:1" id="tc-${idx}" placeholder="ชื่อครู เช่น นางสาวสมหญิง ใจดี">
    <button class="btn bs" style="padding:7px 10px;color:var(--err)" onclick="this.closest('div').remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
    </button>`;
  list.appendChild(div);
  div.querySelector('input').focus();
}
// ════ IQA TARGETS SAVE ════════════════════════════════════════════
async function saveIQATargets(){
  try{
    const targets={};
    SUBJECT_GROUPS.forEach((g,i)=>{
      const v=parseFloat($('iqa-t-'+i)?.value);
      targets[g]=isNaN(v)?IQA_DEFAULT_TARGETS[g]||0:Math.min(4,Math.max(0,v));
    });
    await q(sb.from('config').upsert([{key:'iqa_targets',value:JSON.stringify(targets)}],{onConflict:'key'}));
    await loadConfig();
    toast('บันทึกค่าเป้าหมายเรียบร้อย');
    await pgIQA();
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
}

// ════ IQA REPORT ══════════════════════════════════════════════════
// รายงานนี้เป็นข้อมูลระดับทั้งโรงเรียน เข้าถึงได้ผ่านปุ่มในหน้า "รายงานทั้งโรงเรียน" เท่านั้น — ใช้สิทธิ์ school_report เดียวกัน (ครูที่เข้าถึงหน้านี้ได้ แก้ค่าเป้าหมายได้ด้วย)
async function pgIQA(){
  if(!canAccessMenu('school_report')){ _denyMenuAccess('รายงานทั้งโรงเรียน'); return; }
  loading(true);
  try{
    const cfg=S.config;
    const targets=cfg.iqa_targets?JSON.parse(cfg.iqa_targets):IQA_DEFAULT_TARGETS;

    // ดึงข้อมูลทั้งโรงเรียนโดยไม่กรอง user_id (รายงานนี้ต้องสรุปทุกวิชาของทุกครู ไม่ใช่แค่วิชาของคนที่กำลังดู)
    const [allSubjects, allSum] = await Promise.all([
      q(sb.from('subjects').select('id,subject_group')),
      qAll(()=>sb.from('score_summary').select('subject_id,grade'))
    ]);
    const subjGroupMap={}; allSubjects.forEach(s=>{ subjGroupMap[s.id]=s.subject_group||''; });

    // จัดกลุ่ม grade ต่อ subject_group
    const groupGrades={}; // {groupName: [grade,...]}
    allSum.forEach(r=>{
      const g=subjGroupMap[r.subject_id]; if(!g||r.grade==null||r.grade==='') return;
      if(!groupGrades[g]) groupGrades[g]=[];
      const gv=parseFloat(r.grade); if(!isNaN(gv)&&gv>0) groupGrades[g].push(gv);
    });

    const avg=arr=>arr.length?+(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2):null;
    const yr=cfg.academic_year||'—'; const sm=cfg.semester||'—';

    // นับวิชาต่อกลุ่ม
    const groupSubjCount={};
    allSubjects.forEach(sub=>{ const g=sub.subject_group||''; if(g) groupSubjCount[g]=(groupSubjCount[g]||0)+1; });

    window._iqaMeta={yr,sm,cfg};
    const rows=SUBJECT_GROUPS.map((g,i)=>{
      const grades=groupGrades[g]||[];
      const avgGrade=avg(grades);
      const target=targets[g]!==undefined?targets[g]:IQA_DEFAULT_TARGETS[g]||0;
      const diff=avgGrade!==null?+(avgGrade-target).toFixed(2):null;
      const pass=avgGrade!==null?avgGrade>=target:null;
      const subjCount=groupSubjCount[g]||0;
      return{g,target,avgGrade,diff,pass,subjCount,count:grades.length};
    });
    const overallTarget=(SUBJECT_GROUPS.reduce((a,g)=>a+(targets[g]||IQA_DEFAULT_TARGETS[g]||0),0)/SUBJECT_GROUPS.length).toFixed(2);
    const allGradesFlat=rows.flatMap(r=>groupGrades[r.g]||[]);
    const overallAvg=avg(allGradesFlat);
    const overallDiff=overallAvg!==null?+(overallAvg-overallTarget).toFixed(2):null;

    window._iqaRows=rows;
    window._iqaOverall={target:+overallTarget,avg:overallAvg,diff:overallDiff};

    $('pg').innerHTML=`
    <div class="ph" style="margin-bottom:0">
      <div>
        <div class="ptitle">รายงาน IQA กลุ่มสาระ</div>
        <div class="psub">${esc(schoolNameWithPrefix(cfg.school_name))} · ปีการศึกษา ${esc(yr)} ภาค ${esc(sm)}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn bs no-print" onclick="exportIQA()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
          Excel
        </button>
        <button class="btn bs no-print" onclick="printIQA()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          พิมพ์
        </button>
      </div>
    </div>

    <div id="iqa-print-area" style="padding:0 16px 24px">
      <!-- title for print -->
      <div class="print-only" style="text-align:center;margin-bottom:16px">
        <div style="font-weight:700;font-size:16px;margin-bottom:4px">รายงานสรุปผลสัมฤทธิ์ทางการเรียนของนักเรียนรายกลุ่มสาระการเรียนรู้</div>
        <div style="font-size:14px">ปีการศึกษา ${esc(yr)} ภาคเรียนที่ ${esc(sm)}</div>
        <div style="font-size:14px">${esc(schoolNameWithPrefix(cfg.school_name))}</div>
      </div>

      <div class="card" style="margin-top:16px;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px">
          <thead>
            <tr style="background:rgba(0,122,255,.06)">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;white-space:nowrap">ที่</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;white-space:nowrap">กลุ่มสาระการเรียนรู้</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600;white-space:nowrap">ค่าเป้าหมาย</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600;white-space:nowrap">ค่าเฉลี่ยภาค ${esc(sm)}/${esc(yr)}</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600;white-space:nowrap">ผลต่าง (+/-)</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600">ผล</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600;white-space:nowrap">จำนวนวิชา</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i)=>{
              const diffStr=r.diff!==null?(r.diff>=0?'+':'')+r.diff:'—';
              const diffColor=r.diff===null?'#8e8e93':r.diff>=0?'#16803d':'#dc2626';
              const avgStr=r.avgGrade!==null?r.avgGrade.toFixed(2):'—';
              const badge=r.pass===null
                ?`<span style="color:#8e8e93;font-size:12px">ไม่มีข้อมูล</span>`
                :r.pass
                  ?`<span style="background:#dcfce7;color:#16803d;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">สูงกว่าเป้าหมาย</span>`
                  :`<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">ต่ำกว่าเป้าหมาย</span>`;
              return`<tr style="border-bottom:1px solid #f3f4f6;${i%2===1?'background:rgba(0,0,0,.015)':''}">
                <td style="padding:10px 12px;text-align:center;color:#8e8e93">${i+1}</td>
                <td style="padding:10px 12px;font-weight:500;white-space:nowrap">${esc(r.g)}</td>
                <td style="padding:6px 12px;text-align:center"><input type="number" id="iqa-t-${i}" value="${r.target}" min="0" max="4" step="0.01" class="fi" style="text-align:center;padding:6px 8px;width:80px"></td>
                <td style="padding:10px 12px;text-align:center;font-weight:600">${avgStr}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${diffColor}">${diffStr}</td>
                <td style="padding:10px 12px;text-align:center">${badge}</td>
                <td style="padding:10px 12px;text-align:center;color:#8e8e93">${r.subjCount>0?r.subjCount+'&nbsp;วิชา':'—'}</td>
              </tr>`;
            }).join('')}
            <tr style="background:rgba(0,122,255,.06);font-weight:700;border-top:2px solid #e5e7eb">
              <td colspan="2" style="padding:10px 12px">ค่าเฉลี่ยรวมทุกกลุ่มสาระ</td>
              <td style="padding:10px 12px;text-align:center">${(+overallTarget).toFixed(2)}</td>
              <td style="padding:10px 12px;text-align:center">${overallAvg!==null?overallAvg.toFixed(2):'—'}</td>
              <td style="padding:10px 12px;text-align:center;color:${overallDiff===null?'#8e8e93':overallDiff>=0?'#16803d':'#dc2626'}">${overallDiff!==null?(overallDiff>=0?'+':'')+overallDiff:'—'}</td>
              <td style="padding:10px 12px;text-align:center">
                ${overallDiff===null?''
                  :overallDiff>=0
                    ?`<span style="background:#dcfce7;color:#16803d;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">สูงกว่าเป้าหมาย</span>`
                    :`<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">ต่ำกว่าเป้าหมาย</span>`}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div class="no-print" style="padding:12px;display:flex;justify-content:flex-end">
          <button class="btn bp btn-sm" onclick="saveIQATargets()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            บันทึกค่าเป้าหมาย
          </button>
        </div>
      </div>

      ${!allSubjects.filter(s=>s.subject_group).length?`
      <div class="card" style="margin-top:12px"><div class="empty">
        <svg class="ei" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c7c7cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        <div style="font-weight:600;margin-bottom:8px">ยังไม่ได้ระบุกลุ่มสาระ</div>
        <div style="font-size:13px;color:#8e8e93;margin-bottom:14px">กรุณาไปที่ <strong>รายวิชา</strong> และแก้ไขแต่ละวิชาเพื่อเลือกกลุ่มสาระการเรียนรู้</div>
        <button class="btn bp" onclick="nav('subjects')">ไปหน้ารายวิชา</button>
      </div></div>`:''}

      <!-- สรุปผลวิเคราะห์ -->
      <div class="card" style="margin-top:12px">
        <div class="ch"><div class="ct">สรุปผลการวิเคราะห์</div></div>
        <div class="cb" style="font-size:13.5px;line-height:2;color:#1d1d1f">
          จากการสรุปผลสัมฤทธิ์ทางการเรียนของนักเรียน ปีการศึกษา ${esc(yr)} ภาคเรียนที่ ${esc(sm)}
          ${esc(schoolNameWithPrefix(cfg.school_name))}
          พบว่า ค่าเฉลี่ยผลสัมฤทธิ์ทางการเรียนรวมของทุกกลุ่มสาระการเรียนรู้ เท่ากับ
          <strong>${overallAvg!==null?overallAvg.toFixed(2):'—'}</strong>
          ${overallDiff!==null&&overallDiff>=0
            ?`ซึ่ง<strong>สูงกว่า</strong>ค่าเป้าหมายที่สถานศึกษากำหนดไว้เฉลี่ยเท่ากับ ${(+overallTarget).toFixed(2)} โดยมีผลต่างเฉลี่ยเท่ากับ <strong>+${overallDiff}</strong>`
            :overallDiff!==null
            ?`ซึ่ง<strong>ต่ำกว่า</strong>ค่าเป้าหมายที่สถานศึกษากำหนดไว้เฉลี่ยเท่ากับ ${(+overallTarget).toFixed(2)} โดยมีผลต่างเฉลี่ยเท่ากับ <strong>${overallDiff}</strong>`
            :''}
        </div>
      </div>
    </div>`;
  }finally{ loading(false); }
}

function printIQA(){
  if(!window._iqaRows){toast('ไม่มีข้อมูล IQA — กรุณารอให้หน้าโหลดสำเร็จก่อน','er');return;}
  const rows=window._iqaRows, ov=window._iqaOverall, m=window._iqaMeta;
  const yr=m?.yr||S.config.academic_year||'';
  const sm=m?.sm||S.config.semester||'';
  const cfg=m?.cfg||S.config;
  const diffFmt=d=>d===null?'—':(d>=0?'+':'')+d;
  const diffColor=d=>d===null?'#555':d>=0?'#16803d':'#dc2626';
  const passStr=p=>p===null?'ไม่มีข้อมูล':p?'สูงกว่าเป้าหมาย':'ต่ำกว่าเป้าหมาย';
  const passColor=p=>p===null?'#555':p?'#16803d':'#dc2626';
  const trs=rows.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td class="l">${esc(r.g)}</td>
      <td>${r.target.toFixed(2)}</td>
      <td style="font-weight:700">${r.avgGrade!==null?r.avgGrade.toFixed(2):'—'}</td>
      <td style="font-weight:700;color:${diffColor(r.diff)}">${diffFmt(r.diff)}</td>
      <td style="font-weight:700;color:${passColor(r.pass)}">${passStr(r.pass)}</td>
      <td>${r.subjCount>0?r.subjCount+' วิชา':'—'}</td>
    </tr>`).join('');
  const bodyHTML=`
    <table>
      <thead>
        <tr>
          <th style="width:32px">ที่</th>
          <th class="l">กลุ่มสาระการเรียนรู้</th>
          <th>ค่าเป้าหมาย</th>
          <th>ค่าเฉลี่ยภาค ${esc(sm)}/${esc(yr)}</th>
          <th>ผลต่าง (+/-)</th>
          <th>ผล</th>
          <th>จำนวนวิชา</th>
        </tr>
      </thead>
      <tbody>
        ${trs}
        <tr style="font-weight:700;border-top:2px solid #333">
          <td colspan="2" class="l" style="font-weight:700">ค่าเฉลี่ยรวมทุกกลุ่มสาระ</td>
          <td>${ov.target.toFixed(2)}</td>
          <td style="font-weight:700">${ov.avg!==null?ov.avg.toFixed(2):'—'}</td>
          <td style="font-weight:700;color:${diffColor(ov.diff)}">${diffFmt(ov.diff)}</td>
          <td style="font-weight:700;color:${passColor(ov.diff===null?null:ov.diff>=0)}">${passStr(ov.diff===null?null:ov.diff>=0)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:14px;padding:10px 14px;border:1px solid #bbb;border-radius:4px;font-size:12px;line-height:2">
      <strong>สรุปผลการวิเคราะห์</strong><br>
      จากการสรุปผลสัมฤทธิ์ทางการเรียนของนักเรียน ปีการศึกษา ${esc(yr)} ภาคเรียนที่ ${esc(sm)}
      ${esc(schoolNameWithPrefix(cfg.school_name))}
      พบว่า ค่าเฉลี่ยผลสัมฤทธิ์ทางการเรียนรวมของทุกกลุ่มสาระการเรียนรู้ เท่ากับ
      <strong>${ov.avg!==null?ov.avg.toFixed(2):'—'}</strong>
      ${ov.diff!==null&&ov.diff>=0
        ?`ซึ่ง<strong>สูงกว่า</strong>ค่าเป้าหมายที่สถานศึกษากำหนดไว้เฉลี่ยเท่ากับ ${ov.target.toFixed(2)} โดยมีผลต่างเฉลี่ยเท่ากับ <strong>+${ov.diff}</strong>`
        :ov.diff!==null
        ?`ซึ่ง<strong>ต่ำกว่า</strong>ค่าเป้าหมายที่สถานศึกษากำหนดไว้เฉลี่ยเท่ากับ ${ov.target.toFixed(2)} โดยมีผลต่างเฉลี่ยเท่ากับ <strong>${ov.diff}</strong>`
        :''}
    </div>`;
  printHTML('รายงานสรุปผลสัมฤทธิ์ทางการเรียนของนักเรียนรายกลุ่มสาระการเรียนรู้', bodyHTML);
}

function exportIQA(){
  const rows=window._iqaRows; const ov=window._iqaOverall; const m=window._iqaMeta;
  if(!rows){ toast('กรุณาเปิดหน้า IQA ก่อน','er'); return; }
  const cfg=m?.cfg||S.config; const yr=m?.yr||''; const sm=m?.sm||'';
  const title=`รายงานสรุปผลสัมฤทธิ์ทางการเรียน ปีการศึกษา ${yr} ภาค ${sm}`;
  const school=cfg.school_name||'';
  const diffFmt=(d,avg)=>d===null?'ไม่มีข้อมูล':avg>=0?`+${d}`:String(d);
  const aoa=[
    ['โรงเรียน'+school+' — '+title],
    [],
    ['ที่','กลุ่มสาระการเรียนรู้','ค่าเป้าหมาย',`ค่าเฉลี่ยภาค ${sm}/${yr}`,'ผลต่าง (+/-)','ผล','จำนวนวิชา'],
    ...rows.map((r,i)=>[
      i+1, r.g,
      r.target.toFixed(2),
      r.avgGrade!==null?r.avgGrade.toFixed(2):'—',
      r.diff!==null?(r.diff>=0?'+':'')+r.diff:'—',
      r.pass===null?'ไม่มีข้อมูล':r.pass?'สูงกว่าเป้าหมาย':'ต่ำกว่าเป้าหมาย',
      r.subjCount||0
    ]),
    ['','ค่าเฉลี่ยรวมทุกกลุ่มสาระ',
      ov.target.toFixed(2),
      ov.avg!==null?ov.avg.toFixed(2):'—',
      ov.diff!==null?(ov.diff>=0?'+':'')+ov.diff:'—',
      ov.diff===null?'ไม่มีข้อมูล':ov.diff>=0?'สูงกว่าเป้าหมาย':'ต่ำกว่าเป้าหมาย',
      ''
    ]
  ];
  exportExcel([{
    name:'IQA',
    aoa,
    colWidths:[4,32,14,18,14,20,12]
  }], `IQA_${school}_${yr}_${sm}.xlsx`);
}

// ════ MANUAL ══════════════════════════════════════════════════════
// ดึง Google Drive file ID จากลิงก์แชร์ที่แอดมินวางไว้ (ตั้งค่า > ทั่วไป) รองรับทั้งวางลิงก์เต็มหรือวาง ID ตรงๆ
function _extractDriveFileId(input){
  const s=String(input||'').trim();
  if(!s) return '';
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if(m) return m[1];
  if(/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
  return '';
}
function pgManual(){
  const DEFAULT_FILE_ID = '1yzReDcGvEDGN9xsDpRuKJFeI9riZDpdN';
  const FILE_ID = _extractDriveFileId(S.config.manual_drive_url) || DEFAULT_FILE_ID;
  const previewUrl = `https://drive.google.com/file/d/${FILE_ID}/preview`;
  const openUrl    = `https://drive.google.com/file/d/${FILE_ID}/view`;
  $('pg').innerHTML=`
  <div class="ph">
    <div class="ptitle" style="display:flex;align-items:center;gap:8px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="opacity:.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      คู่มือการใช้งาน
    </div>
    <a href="${openUrl}" target="_blank" rel="noopener" class="btn bs" style="gap:6px;text-decoration:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      เปิดใน Google Drive
    </a>
  </div>
  <div class="card" style="overflow:hidden;padding:0;border-radius:14px;">
    <iframe
      src="${previewUrl}"
      style="width:100%;height:calc(100vh - 160px);min-height:500px;border:none;display:block;"
      allow="autoplay"
      loading="lazy"
      title="คู่มือการใช้งาน ปพ.5">
    </iframe>
  </div>`;
}

async function saveSettings(){
  // รวบรวมรายชื่อครูจาก input rows
  const teacherRows = document.querySelectorAll('#teacher-list input[id^="tc-"]');
  const teacherVal = Array.from(teacherRows).map(el=>el.value.trim()).filter(Boolean).join('\n');
  const updates=[
    {key:'school_name',    value:$('c-school').value.trim()},
    {key:'school_district',value:$('c-dist').value.trim()},
    {key:'school_province',value:$('c-prov').value.trim()},
    {key:'academic_year',  value:$('c-year').value.trim()},
    {key:'semester',       value:$('c-sem').value},
    {key:'director_name',  value:$('c-dir').value.trim()},
    {key:'vice_director',  value:$('c-vdir').value.trim()},
    {key:'teachers',       value:teacherVal},
    {key:'head_registrar', value:$('c-head-reg')?.value||''},
    {key:'head_academic',  value:$('c-head-acad')?.value||''},
    {key:'gemini_api_key', value:$('c-gemini-key')?.value.trim()||''},
    {key:'typhoon_api_key', value:$('c-typhoon-key')?.value.trim()||''},
    {key:'manual_drive_url', value:$('c-manual-url')?.value.trim()||''},
  ];
  loading(true);
  try{
    await q(sb.from('config').upsert(updates,{onConflict:'key'}));
    await loadConfig();
    $('school-name').textContent=S.config.school_name||'ตาเบาวิทยา';
    $('tbb').textContent='ปีการศึกษา '+S.config.academic_year+' ภาค '+S.config.semester;
    $('sb-ft-info').textContent='ปี '+S.config.academic_year+' ภาค '+S.config.semester;
    toast('บันทึกการตั้งค่าเรียบร้อย');
  }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
}


async function saveCheckinSync(){
  const updates=[
    {key:'checkin_sync_enabled',    value:$('c-cksync-on').checked?'1':''},
    {key:'checkin_sync_activity_id',value:$('c-cksync-act').value},
    {key:'checkin_sync_session',    value:$('c-cksync-sess').value},
  ];
  loading(true);
  try{
    await q(sb.from('config').upsert(updates,{onConflict:'key'}));
    await loadConfig();
    toast('บันทึกการตั้งค่าเรียบร้อย');
  }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
}

async function toggleCopySubjectsEnabled(cb){
  const val=cb.checked?'1':'0';
  cb.disabled=true;
  try{
    await q(sb.from('config').upsert([{key:'copy_subjects_enabled',value:val}],{onConflict:'key'}));
    S.config.copy_subjects_enabled=val;
    toast(cb.checked?'เปิดใช้งานปุ่มคัดลอกวิชาสำหรับครูแล้ว':'ปิดปุ่มคัดลอกวิชาสำหรับครูแล้ว — ครูจะไม่เห็นปุ่มนี้ในหน้าจัดการรายวิชา');
  }catch(e){
    cb.checked=!cb.checked;
    toast('บันทึกไม่สำเร็จ: '+e.message,'er');
  }finally{ cb.disabled=false; }
}

async function saveAnnouncement(){
  const active=$('c-ann-active').checked?'1':'0';
  const title=$('c-ann-title').value.trim();
  const msg=$('c-ann-msg').value.trim();
  if(active==='1'&&!title){ toast('กรุณาใส่หัวข้อประกาศ','er'); return; }
  loading(true);
  try{
    const newId=String(Date.now());
    await q(sb.from('config').upsert([
      {key:'announcement_active',value:active},
      {key:'announcement_title',value:title},
      {key:'announcement_message',value:msg},
      {key:'announcement_id',value:newId},
    ],{onConflict:'key'}));
    S.config.announcement_active=active;
    S.config.announcement_title=title;
    S.config.announcement_message=msg;
    S.config.announcement_id=newId;
    toast(active==='1'?'บันทึกประกาศเรียบร้อย — ทุกคนจะเห็น popup นี้เมื่อเข้าระบบครั้งถัดไป':'บันทึกแล้ว (ปิดใช้งานประกาศอยู่)');
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
  finally{ loading(false); }
}

async function saveMaintenanceMode(){
  const on=$('c-maint-on').checked?'1':'0';
  const msg=$('c-maint-msg').value.trim();
  loading(true);
  try{
    await q(sb.from('config').upsert([
      {key:'maintenance_mode',value:on},
      {key:'maintenance_message',value:msg},
    ],{onConflict:'key'}));
    S.config.maintenance_mode=on;
    S.config.maintenance_message=msg;
    toast(on==='1'?'เปิดโหมดปิดปรับปรุงแล้ว — ครูทั่วไปจะเข้าระบบไม่ได้จนกว่าจะปิด':'ปิดโหมดปิดปรับปรุงแล้ว ทุกคนใช้งานได้ตามปกติ');
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
  finally{ loading(false); }
}

async function uploadLogo(input){
  const file = input.files?.[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ toast('ไฟล์ใหญ่เกิน 5MB กรุณาเลือกไฟล์ที่เล็กกว่า','er'); return; }
  loading(true);
  try{
    const dataUrl = await new Promise((res,rej)=>{
      const reader = new FileReader();
      reader.onerror = rej;
      reader.onload = e=>{
        const img = new Image();
        img.onerror = rej;
        img.onload = ()=>{
          const MAX = 512;
          let w = img.width, h = img.height;
          if(w > MAX || h > MAX){
            if(w >= h){ h = Math.round(h*MAX/w); w = MAX; }
            else { w = Math.round(w*MAX/h); h = MAX; }
          }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          res(cv.toDataURL('image/png', 0.9));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    await q(sb.from('config').upsert([{key:'logo_url', value:dataUrl}], {onConflict:'key'}));
    S.config.logo_url = dataUrl;
    updateLogoDisplay(dataUrl);
    toast('บันทึกโลโก้เรียบร้อย');
    pgSettings();
  }catch(e){ toast('เกิดข้อผิดพลาด: '+e.message,'er'); }
  finally{ loading(false); }
}

async function removeLogo(){
  loading(true);
  try{
    await q(sb.from('config').delete().eq('key','logo_url'));
    delete S.config.logo_url;
    updateLogoDisplay(_DEFAULT_LOGO);
    toast('คืนค่าโลโก้เริ่มต้นแล้ว');
    pgSettings();
  }catch(e){ toast('เกิดข้อผิดพลาด: '+e.message,'er'); }
  finally{ loading(false); }
}

// ════ RESTORE DATA ═══════════════════════════════════════════

// ลำดับการ restore (child ก่อน parent เพื่อหลีกเลี่ยง FK conflict)
const RESTORE_ORDER = [
  'eval_char','eval_read','score_summary','score_units',
  'attendance','students','subjects'
  // config ใช้ primary key 'key' (ไม่ใช่ uuid) — จัดการแยกในขั้นตอน delete/insert
];
// tables ที่ไม่ restore (profiles = user accounts, ไม่ควรเขียนทับ)
const RESTORE_SKIP = ['profiles','README'];

// column ที่ auto-generated ใน DB — ต้องไม่ส่งกลับ
const SKIP_COLS = ['id','created_at','updated_at','user_id'];

let _restoreData = null; // เก็บข้อมูลที่อ่านจาก Excel ไว้ชั่วคราว

function openRestoreDialog(){
  // สร้าง dialog เลือกไฟล์
  const wrap = document.createElement('div');
  wrap.id = 'restore-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.25);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);animation:fadeIn .15s ease';
  wrap.innerHTML =
    '<div style="background:rgba(255,255,255,.85);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border-radius:22px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.2);animation:dlgPop .22s cubic-bezier(.34,1.56,.64,1)">' +
      '<div style="padding:24px 24px 18px">' +
        '<div style="width:52px;height:52px;background:#fff1f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '</div>' +
        '<div style="font-size:17px;font-weight:700;text-align:center;margin-bottom:8px;">Restore ข้อมูล</div>' +
        '<div style="font-size:12.5px;color:#8e8e93;text-align:center;line-height:1.6;margin-bottom:16px;">' +
          'การ Restore จะ<strong style="color:#dc2626;">ลบข้อมูลปัจจุบันทั้งหมด</strong>แล้วแทนที่ด้วยข้อมูลจากไฟล์ Backup<br>' +
          'แนะนำให้ <strong>Backup ปัจจุบันก่อน</strong> หากยังไม่ได้ทำ' +
        '</div>' +
        // drop zone
        '<div id="restore-drop" ' +
          'style="border:2px dashed #fecaca;border-radius:12px;padding:20px;text-align:center;background:#fff1f0;cursor:pointer;transition:all .15s;" ' +
          'onclick="_triggerRestoreFile()" ' +
          'ondrop="_handleRestoreDrop(event)">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32" style="margin-bottom:8px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
          '<div style="font-size:13px;font-weight:700;color:#dc2626;">เลือกหรือลากไฟล์ Backup</div>' +
          '<div style="font-size:11.5px;color:#f87171;margin-top:3px;">ไฟล์ .xlsx จาก Backup เท่านั้น</div>' +
        '</div>' +
        '<input type="file" id="restore-file-input" accept=".xlsx" style="display:none" onchange="_handleRestoreFile(this)">' +
        // preview area
        '<div id="restore-preview" style="display:none;margin-top:12px;background:#f9f9fb;border-radius:10px;padding:10px 12px;font-size:12.5px;"></div>' +
      '</div>' +
      '<div style="border-top:0.5px solid rgba(0,0,0,.08);">' +
        '<button id="restore-confirm-btn" disabled onclick="_doRestore()" ' +
          'style="width:100%;padding:14px;font-size:15px;font-weight:600;color:#dc2626;background:none;border:none;border-bottom:1px solid #f3f4f6;cursor:not-allowed;opacity:.4;font-family:var(--font);">Restore เลย</button>' +
        '<button onclick="_closeRestoreDialog()" ' +
          'style="width:100%;padding:14px;font-size:15px;color:#8e8e93;background:none;border:none;cursor:pointer;font-family:var(--font);">ยกเลิก</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  _restoreData = null;
  // ผูก drag listeners หลัง DOM พร้อม
  setTimeout(()=>{
    const dz=document.getElementById('restore-drop');
    if(!dz) return;
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.style.borderColor='#dc2626';dz.style.background='#fee2e2';});
    dz.addEventListener('dragleave',()=>{dz.style.borderColor='#fecaca';dz.style.background='#fff1f0';});
  },0);
}

function _closeRestoreDialog(){
  const w = document.getElementById('restore-wrap');
  if(w){ w.style.animation='fadeIn .15s ease reverse forwards'; setTimeout(()=>w.remove(),150); }
  _restoreData = null;
}

function _handleRestoreDrop(e){
  e.preventDefault();
  const drop = document.getElementById('restore-drop');
  if(drop){ drop.style.borderColor='#fecaca'; drop.style.background='#fff1f0'; }
  const file = e.dataTransfer?.files?.[0];
  if(file) _parseRestoreFile(file);
}

function _handleRestoreFile(input){
  const file = input.files?.[0];
  if(file) _parseRestoreFile(file);
  input.value='';
}

function _triggerRestoreFile(){
  const el=document.getElementById('restore-file-input');
  if(el) el.click();
}
async function _parseRestoreFile(file){
  if(!file.name.endsWith('.xlsx')){
    toast('ต้องเป็นไฟล์ .xlsx จาก Backup เท่านั้น','er'); return;
  }
  try{ await ensureXLSX(); }
  catch(e){ toast('โหลดตัวอ่าน Excel ไม่สำเร็จ: '+e.message,'er'); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array'});
      // ตรวจว่าเป็นไฟล์ backup จริง
      if(!wb.SheetNames.includes('README')||!wb.SheetNames.includes('students')){
        toast('ไฟล์นี้ไม่ใช่ Backup ของระบบ ปพ.5','er'); return;
      }
      // อ่าน README เพื่อแสดง preview
      const readme = XLSX.utils.sheet_to_json(wb.Sheets['README'],{header:1});
      const schoolLine = readme.find(r=>r[0]&&String(r[0]).startsWith('โรงเรียน'));
      const yearLine   = readme.find(r=>r[0]&&String(r[0]).startsWith('ปีการศึกษา'));
      const dateLine   = readme.find(r=>r[0]&&String(r[0]).startsWith('วันที่'));
      // นับ records ต่อ table
      const counts = {};
      wb.SheetNames.filter(n=>!RESTORE_SKIP.includes(n)).forEach(n=>{
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1});
        counts[n] = Math.max(0, rows.length-1); // ลบ header row
      });
      // เก็บ workbook ไว้
      _restoreData = wb;
      // แสดง preview
      const preview = document.getElementById('restore-preview');
      if(preview){
        preview.style.display='block';
        preview.innerHTML =
          '<div style="font-weight:700;color:#dc2626;margin-bottom:6px;">ข้อมูลที่จะ Restore:</div>'+
          (schoolLine?'<div>'+schoolLine[0]+'</div>':'')+
          (yearLine?'<div>'+yearLine[0]+'</div>':'')+
          (dateLine?'<div>'+dateLine[0]+'</div>':'')+
          '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;">'+
          Object.entries(counts).map(([t,n])=>
            '<span style="background:#e5e5ea;border-radius:5px;padding:2px 7px;font-size:11.5px;"><strong>'+t+'</strong> '+n+' rows</span>'
          ).join('')+'</div>'+
          '<div style="margin-top:8px;color:#dc2626;font-size:12px;font-weight:600;">'+_ico.warning+' ข้อมูลปัจจุบันทั้งหมดจะถูกลบและแทนที่</div>';
      }
      // เปิดปุ่ม confirm
      const btn = document.getElementById('restore-confirm-btn');
      if(btn){ btn.disabled=false; btn.style.cursor='pointer'; btn.style.opacity='1'; }
    }catch(err){
      toast('อ่านไฟล์ไม่ได้: '+err.message,'er');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function _doRestore(){
  if(!_restoreData){ toast('ไม่พบข้อมูล Backup','er'); return; }
  _closeRestoreDialog();
  // ยืนยันสุดท้าย
  confirm2({
    title:'ยืนยันการ Restore',
    msg:'ข้อมูลปัจจุบัน<strong>ทั้งหมด</strong>จะถูกลบถาวรแล้วแทนที่ด้วยข้อมูลจาก Backup<br><span style="font-size:12px;color:#dc2626;">ไม่สามารถย้อนกลับได้</span>',
    type:'danger', confirmText:'ลบและ Restore เลย', cancelText:'ยกเลิก',
    onConfirm: async()=>{
      loading(true);
      const errors = [];
      try{
        const wb = _restoreData;
        _restoreData = null;

        // ── Step 1: ลบข้อมูลทุก table ตามลำดับ child→parent ──
        toast('กำลังลบข้อมูลเดิม...','in');
        for(const tbl of RESTORE_ORDER){
          try{
            await q(sb.from(tbl).delete().neq('id','00000000-0000-0000-0000-000000000000'));
          }catch(e){ errors.push('ลบ '+tbl+': '+e.message); }
        }
        // config ใช้ key ไม่ใช่ uuid id
        try{
          await q(sb.from('config').delete().neq('key','__none__'));
        }catch(e){}

        // ── Step 2: insert ข้อมูลใหม่จาก backup ──
        toast('กำลัง Restore ข้อมูล...','in');
        for(const tbl of [...RESTORE_ORDER].reverse()){
          if(!wb.SheetNames.includes(tbl)) continue;
          const ws = wb.Sheets[tbl];
          const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
          if(rows.length<2) continue;
          const headers = rows[0].map(h=>String(h));
          // กรอง column ที่ไม่ส่งกลับ DB
          const keepIdx = headers
            .map((h,i)=>SKIP_COLS.includes(h)||h.endsWith('ชื่อวิชา')||h.endsWith('ชื่อนักเรียน')?-1:i)
            .filter(i=>i>=0);
          const keepHeaders = keepIdx.map(i=>headers[i]);
          // แปลง rows เป็น objects
          const data = rows.slice(1)
            .filter(r=>r.some(v=>v!==''))  // ข้ามแถวว่าง
            .map(r=>{
              const obj={};
              keepIdx.forEach((ci,ii)=>{
                let v = r[ci];
                // แปลง '' → null สำหรับ field ที่ควรเป็น null
                if(v===''||v===null||v===undefined) v=null;
                // แปลง number string
                if(typeof v==='string'&&v!==''&&!isNaN(v)&&!['student_code','year_month','month_name','unit_name','subject_name','subject_code','student_name','note','key','value','full_name','teacher_name','grade_level_str'].includes(keepHeaders[ii])){
                  v=Number(v);
                }
                obj[keepHeaders[ii]]=v;
              });
              return obj;
            });
          if(!data.length) continue;
          // insert เป็น batch ขนาด 200 rows
          const batchSize=200;
          for(let i=0;i<data.length;i+=batchSize){
            const batch=data.slice(i,i+batchSize);
            try{
              await q(sb.from(tbl).insert(batch));
            }catch(e){ errors.push('insert '+tbl+' batch '+(i/batchSize+1)+': '+e.message); }
          }
        }
        // insert config แยกต่างหาก (primary key = 'key' ไม่ใช่ 'id')
        if(wb.SheetNames.includes('config')){
          const cfgWs=wb.Sheets['config'];
          const cfgRows=XLSX.utils.sheet_to_json(cfgWs,{header:1,defval:''});
          if(cfgRows.length>=2){
            const cfgHeaders=cfgRows[0].map(h=>String(h));
            const cfgData=cfgRows.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>{
              const obj={};
              cfgHeaders.forEach((h,i)=>{ if(h&&!['created_at','updated_at'].includes(h)) obj[h]=r[i]===''?null:r[i]; });
              return obj;
            }).filter(o=>o.key);
            if(cfgData.length){
              try{
                await q(sb.from('config').upsert(cfgData,{onConflict:'key'}));
              }catch(e){ errors.push('insert config: '+e.message); }
            }
          }
        }

        // ── Step 3: รีโหลด config และ clear cache ──
        cacheInvAll();
        await loadConfig();

        logAudit('restore_backup', errors.length ? `Restore จาก backup (มีข้อผิดพลาด ${errors.length} จุด)` : 'Restore จาก backup สำเร็จ');
        if(errors.length){
          console.warn('Restore errors:', errors);
          toast('Restore เสร็จ (มีข้อผิดพลาดบางส่วน '+errors.length+' จุด — ดูใน console)','in');
        } else {
          toast('Restore สำเร็จ! กรุณา Refresh หน้าเพื่อโหลดข้อมูลใหม่');
        }
        // แนะนำ reload
        setTimeout(()=>{
          confirm2({
            title:'Restore สำเร็จ',
            msg:'ข้อมูลถูก Restore เรียบร้อยแล้ว<br>กรุณากด <strong>Refresh</strong> เพื่อโหลดข้อมูลใหม่',
            type:'warn', confirmText:'Refresh เลย', cancelText:'ทีหลัง',
            onConfirm:()=>location.reload()
          });
        },600);

      }catch(e){
        toast('Restore ผิดพลาด: '+e.message,'er');
      }finally{
        loading(false);
      }
    }
  });
}

// cacheInvAll — clear cache ทั้งหมด
function cacheInvAll(){
  try{ Object.keys(_cache).forEach(k=>delete _cache[k]); }catch(e){}
  invalidateSubjects(); clearStuCache(); invalidateSc(); invalidateAtt();
  cacheInvPrefix('ev_read_'); cacheInvPrefix('ev_char_');
}

// ════ BACKUP ALL DATA ══════════════════════════════════════════
async function backupAllData(){
  loading(true);
  try{
    const now = new Date();
    const dateStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const timeStr = String(now.getHours()).padStart(2,'0')+String(now.getMinutes()).padStart(2,'0');

    // ── ดึงข้อมูลทุก table พร้อมกัน ──
    const [
      allSubjects, allStudents, allAttendance,
      allScoreUnits, allScoreSummary,
      allEvalRead, allEvalChar, allConfig, allProfiles
    ] = await Promise.all([
      qAll(()=>sb.from('subjects').select('*').order('grade_level').order('room').order('subject_name')),
      qAll(()=>sb.from('students').select('*').order('grade_level').order('room').order('student_code')),
      qAll(()=>sb.from('attendance').select('*').order('subject_id').order('student_id').order('year_month').order('date_day')),
      qAll(()=>sb.from('score_units').select('*').order('subject_id').order('student_id').order('period').order('unit_number')),
      qAll(()=>sb.from('score_summary').select('*').order('subject_id').order('student_id')),
      qAll(()=>sb.from('eval_read').select('*').order('subject_id').order('student_id')),
      qAll(()=>sb.from('eval_char').select('*').order('subject_id').order('student_id')),
      qAll(()=>sb.from('config').select('*').order('key')),
      qAll(()=>sb.from('profiles').select('id,full_name,role').order('id')),
    ]);

    // ── helper: object array → aoa ──
    function toAoa(rows){
      if(!rows||!rows.length) return [['(ไม่มีข้อมูล)']];
      const keys = Object.keys(rows[0]);
      return [keys, ...rows.map(r=>keys.map(k=>{
        const v=r[k];
        if(v===null||v===undefined) return '';
        if(typeof v==='object') return JSON.stringify(v);
        return v;
      }))];
    }

    // ── subject name lookup ──
    const subMap = Object.fromEntries(allSubjects.map(s=>[s.id, s.subject_name+' ม.'+s.grade_level+'/'+s.room]));
    const stuMap = Object.fromEntries(allStudents.map(s=>[s.id, s.student_name]));

    // ── Sheet 1: ข้อมูลทั้งหมด (ตาม table) ──
    const sheets = [];

    // Sheet: README
    sheets.push({
      name:'README',
      aoa:[
        ['ไฟล์ Backup ระบบ ปพ.5 ออนไลน์'],
        ['โรงเรียน: '+schoolNameOnly(S.config.school_name)],
        ['ปีการศึกษา: '+(S.config.academic_year||'')+' ภาค '+(S.config.semester||'')],
        ['วันที่ Backup: '+dateStr+' เวลา '+timeStr.slice(0,2)+':'+timeStr.slice(2)],
        [],
        ['Sheet', 'เนื้อหา', 'จำนวน record'],
        ['subjects','รายวิชาทั้งหมด', allSubjects.length],
        ['students','นักเรียนทั้งหมด', allStudents.length],
        ['attendance','บันทึกเวลาเรียน', allAttendance.length],
        ['score_units','คะแนนหน่วยการเรียน', allScoreUnits.length],
        ['score_summary','สรุปคะแนนและผลการเรียน', allScoreSummary.length],
        ['eval_read','การประเมินการอ่านฯ', allEvalRead.length],
        ['eval_char','การประเมินคุณลักษณะฯ', allEvalChar.length],
        ['config','ตั้งค่าระบบ', allConfig.length],
        ['profiles','ข้อมูลผู้ใช้', allProfiles.length],
        [],
        ['หมายเหตุ: ไฟล์นี้มีข้อมูลดิบจาก Supabase ทุก table สามารถนำไป restore ได้'],
      ],
      colWidths:[22,30,15]
    });

    // Sheet: subjects
    sheets.push({ name:'subjects', aoa:toAoa(allSubjects), colWidths:Array(20).fill(16) });

    // Sheet: students
    sheets.push({ name:'students', aoa:toAoa(allStudents), colWidths:Array(10).fill(18) });

    // Sheet: attendance (อาจมีเยอะ — แสดงชื่อแทน id ด้วย)
    const attAoa = allAttendance.length ? [
      [...Object.keys(allAttendance[0]), 'ชื่อวิชา','ชื่อนักเรียน'],
      ...allAttendance.map(r=>[
        ...Object.keys(r).map(k=>r[k]??''),
        subMap[r.subject_id]||'', stuMap[r.student_id]||''
      ])
    ] : [['(ไม่มีข้อมูล)']];
    sheets.push({ name:'attendance', aoa:attAoa });

    // Sheet: score_units
    const suAoa = allScoreUnits.length ? [
      [...Object.keys(allScoreUnits[0]),'ชื่อวิชา','ชื่อนักเรียน'],
      ...allScoreUnits.map(r=>[
        ...Object.keys(r).map(k=>r[k]??''),
        subMap[r.subject_id]||'', stuMap[r.student_id]||''
      ])
    ] : [['(ไม่มีข้อมูล)']];
    sheets.push({ name:'score_units', aoa:suAoa });

    // Sheet: score_summary
    const ssAoa = allScoreSummary.length ? [
      [...Object.keys(allScoreSummary[0]),'ชื่อวิชา','ชื่อนักเรียน'],
      ...allScoreSummary.map(r=>[
        ...Object.keys(r).map(k=>r[k]??''),
        subMap[r.subject_id]||'', stuMap[r.student_id]||''
      ])
    ] : [['(ไม่มีข้อมูล)']];
    sheets.push({ name:'score_summary', aoa:ssAoa });

    // Sheet: eval_read
    const erAoa = allEvalRead.length ? [
      [...Object.keys(allEvalRead[0]),'ชื่อวิชา','ชื่อนักเรียน'],
      ...allEvalRead.map(r=>[
        ...Object.keys(r).map(k=>r[k]??''),
        subMap[r.subject_id]||'', stuMap[r.student_id]||''
      ])
    ] : [['(ไม่มีข้อมูล)']];
    sheets.push({ name:'eval_read', aoa:erAoa });

    // Sheet: eval_char
    const ecAoa = allEvalChar.length ? [
      [...Object.keys(allEvalChar[0]),'ชื่อวิชา','ชื่อนักเรียน'],
      ...allEvalChar.map(r=>[
        ...Object.keys(r).map(k=>r[k]??''),
        subMap[r.subject_id]||'', stuMap[r.student_id]||''
      ])
    ] : [['(ไม่มีข้อมูล)']];
    sheets.push({ name:'eval_char', aoa:ecAoa });

    // Sheet: config (ซ่อน admin_password)
    const configSafe = allConfig.map(r=>({...r, value: r.key==='admin_password'?'[hidden]':r.value}));
    sheets.push({ name:'config', aoa:toAoa(configSafe), colWidths:[20,30,20] });

    // Sheet: profiles
    sheets.push({ name:'profiles', aoa:toAoa(allProfiles), colWidths:[20,24,12] });

    const fileName = 'backup_pp5_'+dateStr+'_'+timeStr+'.xlsx';
    exportExcel(sheets, fileName);
    toast('Backup เสร็จแล้ว — '+fileName);

  }catch(e){
    toast('Backup ผิดพลาด: '+e.message,'er');
  }finally{
    loading(false);
  }
}

async function pgSchoolReport(){
  loading(true);
  try{
    // ดึงข้อมูลทั้งหมดโดยไม่กรอง user_id — ทุกตารางยิงพร้อมกัน (รวม students ที่เดิมยิงแยกทีหลัง) และใช้ qAll()
    // แม้กับตารางที่ปัจจุบันมีไม่ถึง 1000 แถว เพื่อกันไม่ให้ข้อมูลหายเงียบๆ เมื่อโรงเรียนมีข้อมูลมากขึ้นในอนาคต
    const [allSubjects, allSumRows, allAttRows, allProfiles, allEvalRead, allEvalChar, allStus] = await Promise.all([
      qAll(()=>sb.from('subjects').select('*').order('grade_level').order('room').order('subject_name')),
      qAll(()=>sb.from('score_summary').select('subject_id,student_id,grade,total_score,special_result,mid_normal,mid_retake,mid_repeat,final_score,total_before_mid,total_after_mid').order('id')),
      qAll(()=>sb.from('attendance').select('subject_id,student_id,status,periods,year_month,date_day')),
      qAll(()=>sb.from('profiles').select('id,full_name').order('id')),
      qAll(()=>sb.from('eval_read').select('subject_id')),
      qAll(()=>sb.from('eval_char').select('subject_id')),
      qAll(()=>sb.from('students').select('id,grade_level,room,student_name,student_code').order('grade_level').order('room').order('student_code')),
    ]);

    // สร้าง map
    const profileMap = Object.fromEntries(allProfiles.map(p=>[p.id,p.full_name||'']));
    const sumBySubj = {};
    allSumRows.forEach(r=>{ (sumBySubj[r.subject_id]=sumBySubj[r.subject_id]||[]).push(r); });
    const attBySubj = {};
    allAttRows.forEach(r=>{ (attBySubj[r.subject_id]=attBySubj[r.subject_id]||[]).push(r); });
    const evalReadSubjIds = new Set(allEvalRead.map(r=>r.subject_id));
    const evalCharSubjIds = new Set(allEvalChar.map(r=>r.subject_id));

    // นับนักเรียนต่อ ชั้น/ห้อง
    const stuCountMap = {};
    allStus.forEach(s=>{ const k=s.grade_level+'_'+s.room; stuCountMap[k]=(stuCountMap[k]||[]).concat(s.id); });
    S._schoolStudents = allStus;

    // คำนวณ stats ต่อวิชา
    const subjectsWithStats = allSubjects.map(sub=>{
      const stuIds = stuCountMap[sub.grade_level+'_'+sub.room]||[];
      const stuIdSet = new Set(stuIds.map(String));
      const total = stuIds.length;
      const sumRows = (sumBySubj[sub.id]||[]).filter(r=>stuIdSet.has(String(r.student_id)));
      const attRows = (attBySubj[sub.id]||[]).filter(a=>stuIdSet.has(String(a.student_id)));
      const pass = sumRows.filter(r=>parseFloat(r.grade)>0&&!['ร','มส','มผ','ผ'].includes(r.special_result||'')).length;
      const avg = sumRows.length>0?(sumRows.reduce((a,b)=>a+(parseFloat(b.total_score)||0),0)/sumRows.length).toFixed(1):'—';
      const pct = total>0?((sumRows.length>0?pass/sumRows.length:0)*100).toFixed(1):'—';
      // หา ms (มส) — เฉพาะนักเรียนที่มี attendance record และ < 80%
      const stuAttMapSub={};
      attRows.forEach(a=>{
        const sid=String(a.student_id);
        if(!stuAttMapSub[sid])stuAttMapSub[sid]={attended:0};
        const p=parseInt(a.periods)||1;
        if(a.status==='present'||a.status==='leave')stuAttMapSub[sid].attended+=p;
      });
      const totalH = attHeldHours(attRows);
      const msStudentIds = stuIds.filter(sid=>{
        const m=stuAttMapSub[String(sid)];
        if(!m) return false;
        return totalH>0&&(m.attended/totalH*100)<80;
      });
      const msCount = msStudentIds.length;
      const teacherName = profileMap[sub.user_id] || sub.teacher_name || '—';
      const passNum = sumRows.length>0?pass:null;
      const failNum = sumRows.length>0?sumRows.length-pass:null;
      const gradeCount={4:0,3.5:0,3:0,2.5:0,2:0,1.5:0,1:0,0:0};
      sumRows.forEach(r=>{ const g=parseFloat(r.grade); if(gradeCount[g]!==undefined)gradeCount[g]++; });
      // ความคืบหน้า ปพ.5 ต้องครบ 3 อย่าง: คะแนน + เวลาเรียน + ประเมิน (อ่าน/คิด/เขียน และ คุณลักษณะ ต้องมีทั้งคู่)
      const hasScore = sumRows.length>0;
      const hasAttendance = (attBySubj[sub.id]||[]).length>0;
      const hasEval = evalReadSubjIds.has(sub.id) && evalCharSubjIds.has(sub.id);
      // คะแนนสอบตัวจริง — แยกจาก hasScore เพราะกรอกแค่คะแนนเก็บก็ทำให้ hasScore เป็นจริงได้ทั้งที่ยังไม่สอบ
      const hasMidExam = sumRows.some(r=>(parseFloat(r.mid_normal)||0)>0||(parseFloat(r.mid_retake)||0)>0||(parseFloat(r.mid_repeat)||0)>0);
      const hasFinalExam = sumRows.some(r=>(parseFloat(r.final_score)||0)>0);
      // คะแนนเก็บ (ระหว่างภาค) — รวมจาก score_units ก่อน/หลังกลางภาค
      const hasCollectScore = sumRows.some(r=>(parseFloat(r.total_before_mid)||0)>0||(parseFloat(r.total_after_mid)||0)>0);
      return {...sub,_stats:{total,pass:passNum,fail:failNum,avg,pct,msCount,teacherName,gradeCount,sumRows,stuIds,msStudentIds,attMap:stuAttMapSub,attTotalH:totalH,hasScore,hasAttendance,hasEval,hasMidExam,hasFinalExam,hasCollectScore}};
    });

    // ── รวมสถิติโรงเรียน ──
    const schoolTotal = allSubjects.length;
    const profileIdSet = new Set(allProfiles.map(p=>p.id));
    const schoolTeachers = new Set(allSubjects.map(s=>s.user_id).filter(id=>profileIdSet.has(id))).size;
    const allPassPcts = subjectsWithStats.filter(s=>s._stats.pass!==null).map(s=>parseFloat(s._stats.pct)||0);
    const schoolPassAvg = allPassPcts.length>0?(allPassPcts.reduce((a,b)=>a+b,0)/allPassPcts.length).toFixed(1):'—';
    const allAvgs = subjectsWithStats.filter(s=>s._stats.avg!=='—').map(s=>parseFloat(s._stats.avg)||0);
    const schoolScoreAvg = allAvgs.length>0?(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(1):'—';
    // ── สถิติเพิ่มเติม ──
    const totalPassStudents = subjectsWithStats.reduce((a,s)=>a+(s._stats.pass||0),0);
    const totalFailStudents = subjectsWithStats.reduce((a,s)=>a+(s._stats.fail||0),0);
    const totalMsStudents   = subjectsWithStats.reduce((a,s)=>a+s._stats.msCount,0);
    const noScoreSubjects   = subjectsWithStats.filter(s=>s._stats.pass===null).length;
    const aboveThreshold    = subjectsWithStats.filter(s=>s._stats.pass!==null&&parseFloat(s._stats.pct)>=80).length;
    const totalRStudents    = allSumRows.filter(r=>r.special_result==='ร').length;

    // ── สรุปความคืบหน้ารายครู (คะแนน + เวลาเรียน + ประเมิน ต้องครบทั้ง 3 ถึงจะนับว่าวิชานั้นเสร็จ) ──
    const teacherProgress = {};
    subjectsWithStats.forEach(sub=>{
      const t=sub._stats.teacherName;
      if(!t||t==='—')return;
      if(!teacherProgress[t])teacherProgress[t]={teacher:t,total:0,collectDone:0,attDone:0,evalDone:0,midDone:0,finalDone:0,fullyDone:0};
      const tp=teacherProgress[t];
      tp.total++;
      if(sub._stats.hasCollectScore)tp.collectDone++;
      if(sub._stats.hasAttendance)tp.attDone++;
      if(sub._stats.hasEval)tp.evalDone++;
      if(sub._stats.hasMidExam)tp.midDone++;
      if(sub._stats.hasFinalExam)tp.finalDone++;
      if(sub._stats.hasCollectScore&&sub._stats.hasAttendance&&sub._stats.hasEval&&sub._stats.hasMidExam&&sub._stats.hasFinalExam)tp.fullyDone++;
    });
    const teacherProgressList = Object.values(teacherProgress).map(tp=>({
      ...tp,
      pct: tp.total>0?Math.round((tp.collectDone+tp.attDone+tp.evalDone+tp.midDone+tp.finalDone)/(tp.total*5)*100):0,
    })).sort((a,b)=>a.pct-b.pct||a.teacher.localeCompare(b.teacher,'th'));
    const teacherFullyDoneCount = teacherProgressList.filter(tp=>tp.pct===100).length;

    // เก็บไว้ใน state เพื่อให้ exportSchoolReport ใช้ได้
    S._schoolReport = subjectsWithStats;
    // ── render ──
    const GRADE_COLORS={4:'#15803d',3.5:'#2a7a44',3:'#007AFF',2.5:'#0284c7',2:'#e6940a',1.5:'#c0810a',1:'#c0392b',0:'#922b21'};

    function renderSubjectCard(sub,idx){
      const st=sub._stats;
      const passOk = st.pass!==null;
      const passRate = st.total>0&&st.pass!==null?((st.pass/Math.max(st.sumRows.length,1))*100).toFixed(0):'—';
      const barColor = !passOk?'#e5e5ea':parseFloat(passRate)>=80?'#007AFF':parseFloat(passRate)>=60?'#FF9500':'#FF3B30';
      const hasWarn = passOk && parseFloat(passRate)<80;
      const cardId='sc-card-'+sub.id;
      const attBadge = st.hasAttendance
        ? '<span class="badge bg-g" style="font-size:10px">✓ เวลาเรียน</span>'
        : '<span class="badge bg-gr" style="font-size:10px">⚪ ยังไม่บันทึกเวลาเรียน</span>';
      const evalBadge = st.hasEval
        ? '<span class="badge bg-g" style="font-size:10px">✓ ประเมิน</span>'
        : '<span class="badge bg-gr" style="font-size:10px">⚪ ยังไม่ประเมิน</span>';
      const midBadge = st.hasMidExam
        ? '<span class="badge bg-g" style="font-size:10px">✓ สอบกลางภาค</span>'
        : '<span class="badge bg-gr" style="font-size:10px">⚪ ยังไม่สอบกลางภาค</span>';
      const finalBadge = st.hasFinalExam
        ? '<span class="badge bg-g" style="font-size:10px">✓ สอบปลายภาค</span>'
        : '<span class="badge bg-gr" style="font-size:10px">⚪ ยังไม่สอบปลายภาค</span>';

      // grade bar
      const maxCnt = Math.max(...Object.values(st.gradeCount),1);
      const gradeBar = [4,3.5,3,2.5,2,1.5,1,0].map(g=>{
        const cnt=st.gradeCount[g]||0;
        const h = cnt>0?Math.max(4,Math.round(cnt/maxCnt*32)):3;
        return '<div style="text-align:center;min-width:20px">'+
          '<div style="height:'+h+'px;background:'+(cnt>0?GRADE_COLORS[g]:'#e5e5ea')+';border-radius:3px 3px 0 0;margin-bottom:2px"></div>'+
          '<div style="font-size:9px;font-weight:600;color:'+(cnt>0?GRADE_COLORS[g]:'#d1d5db')+'">'+g+'</div>'+
          (cnt>0?'<div style="font-size:8px;color:#9ca3af">'+cnt+'</div>':'<div style="font-size:8px;color:#e5e5ea">0</div>')+
        '</div>';
      }).join('');

      return '<div class="card" style="margin-bottom:12px;border-radius:16px'+
        (hasWarn?';border-color:rgba(220,38,38,.25)':'')+'" id="'+cardId+'">'+
        // ── header ──
        '<div style="padding:14px 16px;cursor:pointer;display:flex;align-items:flex-start;gap:12px" data-card="'+cardId+'" onclick="_toggleSchoolCard(this.dataset.card)">'+
          '<div style="flex:1;min-width:0">'+
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">'+
              '<div style="font-size:15px;font-weight:700;color:var(--txt)">'+esc(sub.subject_name)+'</div>'+
              '<span class="badge bg-b">'+grm(sub.grade_level,sub.room)+'</span>'+
              (hasWarn?'<span class="badge bg-r" style="font-size:10px">'+_ico.warning+' ผ่านต่ำกว่า 80%</span>':'')+
              attBadge+midBadge+finalBadge+evalBadge+
            '</div>'+
            '<div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">'+
              esc(sub.subject_code)+' &nbsp;·&nbsp; '+esc(st.teacherName)+' &nbsp;·&nbsp; '+sub.hours_per_week+' ชม./สัปดาห์'+
            '</div>'+
            '<div style="display:flex;align-items:center;gap:8px">'+
              '<div style="flex:1;height:5px;border-radius:10px;background:var(--bg2);overflow:hidden">'+
                '<div style="height:100%;border-radius:10px;background:'+barColor+';width:'+(passOk?passRate:0)+'%;transition:width .4s"></div>'+
              '</div>'+
              '<span style="font-size:12px;font-weight:600;color:'+barColor+'">'+passRate+'%</span>'+
            '</div>'+
            '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+
              (passOk?'ผ่าน '+st.pass+'/'+st.sumRows.length+' • เฉลี่ย '+st.avg:'ยังไม่มีคะแนน')+
              (st.msCount>0?' &nbsp;<span style="color:var(--err)">มส '+st.msCount+' คน</span>':'')+
            '</div>'+
          '</div>'+
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">'+
            (passOk?
              '<div style="display:flex;gap:4px">'+
                '<span class="badge bg-g" style="font-size:11px">ผ่าน '+st.pass+'</span>'+
                (st.fail>0?'<span class="badge bg-r" style="font-size:11px">ไม่ผ่าน '+st.fail+'</span>':'')+
              '</div>':'<span class="badge bg-gr" style="font-size:11px">ยังไม่กรอก</span>')+
            '<svg viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" class="school-chevron" style="transition:transform .2s" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>'+
          '</div>'+
        '</div>'+
        // ── detail panel (hidden) ──
        '<div class="school-detail" style="display:none;border-top:1px solid var(--bdr)">'+
          // stats row
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(75px,1fr));gap:0;background:var(--card2)">'+
            _schoolStatCell(st.total,'นักเรียน','#007AFF')+
            _schoolStatCell(passOk?st.pass+' ('+passRate+'%)':'—','ผ่าน','#16803d')+
            _schoolStatCell(passOk?st.fail:'—','ไม่ผ่าน','#dc2626')+
            _schoolStatCell(st.avg,'เฉลี่ย','#b45309')+
          '</div>'+
          // grade bar
          '<div style="padding:12px 16px;border-top:1px solid var(--bdr)">'+
            '<div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px">การกระจายผลการเรียน</div>'+
            '<div style="display:flex;gap:8px;align-items:flex-end">'+gradeBar+'</div>'+
          '</div>'+
          // ดูรายละเอียดรายนักเรียน (แอดมิน — read-only)
          '<div style="padding:0 16px 14px;border-top:1px solid var(--bdr);padding-top:12px">'+
            '<button class="btn bs" style="width:100%;justify-content:center" onclick="event.stopPropagation();openSubjectDetailModal(\''+sub.id+'\')">'+
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'+
              'ดูรายละเอียดรายนักเรียน'+
            '</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    }

    function _schoolStatCell(val,label,color){
      return '<div style="padding:10px;text-align:center;border-right:1px solid var(--bdr)">'+
        '<div style="font-size:15px;font-weight:700;color:'+color+'">'+val+'</div>'+
        '<div style="font-size:10px;color:var(--muted);margin-top:1px">'+label+'</div>'+
      '</div>';
    }

    window._hideCompleteTeachers=false;
    function renderTeacherProgressTable(){
      if(!teacherProgressList.length) return '';
      const visibleList = window._hideCompleteTeachers ? teacherProgressList.filter(tp=>tp.pct<100) : teacherProgressList;
      const rows=visibleList.map(tp=>{
        const barColor=tp.pct>=80?'#16803d':tp.pct>=50?'#b45309':'#dc2626';
        const tEsc=esc(tp.teacher).replace(/'/g,"&#39;");
        const statusBadge = tp.pct===100
          ? '<span class="badge bg-g" style="font-size:10px;margin-left:6px">✓ ครบแล้ว</span>'
          : tp.pct===0
          ? '<span class="badge bg-r" style="font-size:10px;margin-left:6px">⚠ ยังไม่เริ่ม</span>'
          : '';
        return '<tr style="cursor:pointer" onclick="_jumpToTeacher(\''+tEsc+'\')">'+
          '<td class="tl" style="font-weight:600">'+esc(tp.teacher)+statusBadge+'</td>'+
          '<td class="tc">'+tp.total+'</td>'+
          '<td class="tc">'+tp.attDone+'/'+tp.total+'</td>'+
          '<td class="tc">'+tp.collectDone+'/'+tp.total+'</td>'+
          '<td class="tc">'+tp.midDone+'/'+tp.total+'</td>'+
          '<td class="tc">'+tp.finalDone+'/'+tp.total+'</td>'+
          '<td class="tc">'+tp.evalDone+'/'+tp.total+'</td>'+
          '<td style="min-width:120px">'+
            '<div style="display:flex;align-items:center;gap:8px">'+
              '<div style="flex:1;height:6px;border-radius:10px;background:var(--bg2);overflow:hidden">'+
                '<div style="height:100%;border-radius:10px;background:'+barColor+';width:'+tp.pct+'%"></div>'+
              '</div>'+
              '<span style="font-size:12px;font-weight:700;color:'+barColor+'">'+tp.pct+'%</span>'+
            '</div>'+
          '</td>'+
        '</tr>';
      }).join('');
      const fullyDoneCount = teacherProgressList.filter(tp=>tp.pct===100).length;
      const emptyMsg = window._hideCompleteTeachers && !visibleList.length
        ? '<div class="empty" style="padding:24px 16px;text-align:center;color:var(--muted)">🎉 ครูทำครบทุกคนแล้ว ('+fullyDoneCount+'/'+teacherProgressList.length+')</div>'
        : '';
      return '<div class="card" style="margin-bottom:14px" id="teacher-progress-card">'+
        '<div class="ch">'+
          '<div><div class="ct">สรุปความคืบหน้ารายครู</div><span style="font-size:11px;color:var(--muted);font-weight:400">คลิกชื่อครูเพื่อดูรายวิชา</span></div>'+
          '<button class="btn bs btn-sm" onclick="_toggleHideCompleteTeachers()">'+
            (window._hideCompleteTeachers?'แสดงทั้งหมด':'แสดงเฉพาะยังไม่เสร็จ')+
          '</button>'+
        '</div>'+
        '<div class="cb" style="padding:0">'+
          (emptyMsg || '<div class="tw"><table>'+
            '<thead><tr><th class="tl">ครู</th><th>วิชา</th><th>เวลาเรียน</th><th>คะแนนเก็บ</th><th>กลางภาค</th><th>ปลายภาค</th><th>ประเมิน</th><th>ความคืบหน้า</th></tr></thead>'+
            '<tbody>'+rows+'</tbody>'+
          '</table></div>')+
        '</div>'+
      '</div>';
    }
    window._toggleHideCompleteTeachers=function(){
      window._hideCompleteTeachers=!window._hideCompleteTeachers;
      const el=$('teacher-progress-card');
      if(el) el.outerHTML=renderTeacherProgressTable();
    }
    window._jumpToTeacher=function(name){
      window._teacherFilter=name;
      const sel=$('sr-teacher'); if(sel) sel.value=name;
      window._renderCards&&window._renderCards();
      const cardsEl=$('school-cards'); if(cardsEl) cardsEl.scrollIntoView({behavior:'smooth',block:'start'});
    };

    // ── filter state (global เพื่อให้ onchange เข้าถึงได้) ──
    window._gradeFilter=''; window._teacherFilter='';
    const grades=[...new Set(allSubjects.map(s=>s.grade_level))].sort();
    const teachers=[...new Set(subjectsWithStats.map(s=>s._stats.teacherName))].filter(t=>t&&t!=='—').sort();

    window._renderCards=function(){
      const container=$('school-cards');
      const cnt=$('school-count');
      if(!window._teacherFilter){
        if(container) container.innerHTML='<div class="empty" style="padding:32px 16px;text-align:center;color:var(--muted)">เลือกครูด้านบนเพื่อแสดงรายวิชา<br><span style="font-size:12px">(หรือเลือก "ครูทุกคน" เพื่อแสดงทั้งหมด)</span></div>';
        if(cnt) cnt.textContent='';
        return;
      }
      let filtered=subjectsWithStats.filter(s=>{
        if(window._gradeFilter && String(s.grade_level)!==String(window._gradeFilter)) return false;
        if(window._teacherFilter!=='__all__' && s._stats.teacherName!==window._teacherFilter) return false;
        return true;
      });
      if(container) container.innerHTML=filtered.length
        ? filtered.map((s,i)=>renderSubjectCard(s,i)).join('')
        : '<div class="empty">ไม่พบรายวิชาที่ตรงกับตัวกรอง</div>';
      if(cnt) cnt.textContent='แสดง '+filtered.length+' วิชา';
    }

    $('pg').innerHTML=
      '<div class="ph">'+
        '<div>'+
          '<div class="ptitle">รายงานทั้งโรงเรียน</div>'+
          '<div class="psub">'+esc(S.config.school_name||'')+'&nbsp;·&nbsp;ปีการศึกษา '+esc(S.config.academic_year||'')+'&nbsp;ภาค&nbsp;'+esc(S.config.semester||'')+'</div>'+
        '</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
          '<button class="no-print" onclick="printMsReport()" style="display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-family:var(--font);box-shadow:0 2px 8px rgba(239,68,68,.35);transition:opacity .15s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'+
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'+
            'พิมพ์ มส'+
          '</button>'+
          '<button class="no-print" onclick="exportSchoolReport()" style="display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-family:var(--font);box-shadow:0 2px 8px rgba(22,163,74,.35);transition:opacity .15s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'+
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>'+
            'Excel'+
          '</button>'+
          '<button class="no-print" onclick="nav(\'iqa\')" style="display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-family:var(--font);box-shadow:0 2px 8px rgba(59,130,246,.35);transition:opacity .15s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'+
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'+
            'รายงาน IQA'+
          '</button>'+
        '</div>'+
      '</div>'+

      // summary stats — row 1
      '<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">'+
        '<div class="sc"><div class="si bl"><svg viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div><div class="sv">'+schoolTotal+'</div><div class="sl">รายวิชา</div></div></div>'+
        '<div class="sc"><div class="si gr"><svg viewBox="0 0 24 24" fill="none" stroke="#16803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="sv">'+schoolTeachers+'</div><div class="sl">ครูผู้สอน</div></div></div>'+
        '<div class="sc"><div class="si gr"><svg viewBox="0 0 24 24" fill="none" stroke="#16803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="sv" style="color:#16803d">'+schoolPassAvg+'%</div><div class="sl">ผ่านเฉลี่ย</div></div></div>'+
        '<div class="sc"><div class="si or"><svg viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div><div><div class="sv">'+schoolScoreAvg+'</div><div class="sl">คะแนนเฉลี่ย</div></div></div>'+
        '<div class="sc"><div class="si gr"><svg viewBox="0 0 24 24" fill="none" stroke="#16803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="sv" style="color:#16803d">'+teacherFullyDoneCount+'/'+teacherProgressList.length+'</div><div class="sl">ครูทำครบแล้ว</div></div></div>'+
      '</div>'+
      // summary stats — row 2
      '<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-top:0">'+
        '<div class="sc"><div class="si gr"><svg viewBox="0 0 24 24" fill="none" stroke="#16803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="sv" style="color:#16803d">'+totalPassStudents+'</div><div class="sl">นักเรียนที่ผ่าน</div></div></div>'+
        '<div class="sc"><div class="si" style="background:rgba(220,38,38,.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><div><div class="sv" style="color:#dc2626">'+totalFailStudents+'</div><div class="sl">นักเรียนที่ไม่ผ่าน</div></div></div>'+
        '<div class="sc"><div class="si" style="background:rgba(255,59,48,.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="sv" style="color:#FF3B30">'+totalMsStudents+'</div><div class="sl">นักเรียน มส</div></div></div>'+
        '<div class="sc"><div class="si" style="background:rgba(142,142,147,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><div class="sv" style="color:#8e8e93">'+noScoreSubjects+'</div><div class="sl">วิชายังไม่มีคะแนน</div></div></div>'+
        '<div class="sc"><div class="si bl"><svg viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div><div><div class="sv" style="color:#007AFF">'+aboveThreshold+'/'+schoolTotal+'</div><div class="sl">วิชาผ่านเกณฑ์ ≥80%</div></div></div>'+
        '<div class="sc"><div class="si or"><svg viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="sv" style="color:#b45309">'+totalRStudents+'</div><div class="sl">นักเรียน ร (รอผล)</div></div></div>'+
      '</div>'+

      // สรุปความคืบหน้ารายครู
      renderTeacherProgressTable()+

      // filter bar
      '<div class="card" style="margin-bottom:14px">'+
        '<div class="cb" style="padding:10px 16px">'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'+
            '<select class="fs" style="max-width:130px" id="sr-grade" onchange="window._gradeFilter=this.value;window._renderCards&&window._renderCards()" style="font-family:var(--font)">'+
              '<option value="">ทุกชั้น</option>'+
              grades.map(g=>'<option value="'+g+'">ม.'+g+'</option>').join('')+
            '</select>'+
            '<select class="fs" style="max-width:220px" id="sr-teacher" onchange="window._teacherFilter=this.value;window._renderCards&&window._renderCards()">'+
              '<option value="">-- เลือกครู --</option>'+
              '<option value="__all__">ครูทุกคน</option>'+
              teachers.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('')+
            '</select>'+
            '<div style="margin-left:auto;font-size:12px;color:var(--muted)" id="school-count">แสดง '+subjectsWithStats.length+' วิชา</div>'+
          '</div>'+
        '</div>'+
      '</div>'+

      // cards container
      '<div id="school-cards"></div>';

    window._renderCards();

  }catch(e){
    toast('โหลดข้อมูลไม่สำเร็จ: '+e.message,'er');
  }finally{
    loading(false);
  }
}

// ── แอดมิน: ดูรายละเอียดรายนักเรียนของวิชาใดก็ได้ (read-only ไม่แก้ไขที่นี่) ──
async function openSubjectDetailModal(subId){
  const sub=(S._schoolReport||[]).find(s=>String(s.id)===String(subId));
  if(!sub){toast('ไม่พบข้อมูลวิชา','er');return;}
  const st=sub._stats;
  const stuMap=Object.fromEntries((S._schoolStudents||[]).map(s=>[String(s.id),s]));
  loading(true);
  let evalReadRows=[],evalCharRows=[];
  try{
    [evalReadRows,evalCharRows]=await Promise.all([
      q(sb.from('eval_read').select('*').eq('subject_id',subId)),
      q(sb.from('eval_char').select('*').eq('subject_id',subId)),
    ]);
  }catch(e){}
  loading(false);
  const evalReadMap=Object.fromEntries(evalReadRows.map(r=>[String(r.student_id),r]));
  const evalCharMap=Object.fromEntries(evalCharRows.map(r=>[String(r.student_id),r]));

  const stuIds=[...st.stuIds].sort((a,b)=>{
    const ca=stuMap[String(a)]?.student_code||'', cb=stuMap[String(b)]?.student_code||'';
    return ca.localeCompare(cb,'th');
  });
  const totalH=st.attTotalH??(sub.total_hours||60);

  const scoreRows=stuIds.map(sid=>{
    const stu=stuMap[String(sid)];
    const sc=st.sumRows.find(r=>String(r.student_id)===String(sid));
    return '<tr><td class="tl">'+esc(stu?.student_name||'')+'</td>'+
      '<td class="tc">'+(sc?sc.total_score:'—')+'</td>'+
      '<td class="tc">'+(sc?sc.grade:'—')+'</td>'+
      '<td class="tc">'+esc(sc?.special_result||'')+'</td></tr>';
  }).join('');

  const attRows=stuIds.map(sid=>{
    const stu=stuMap[String(sid)];
    const am=st.attMap[String(sid)];
    const attended=am?am.attended:0;
    const pct=totalH>0?(attended/totalH*100).toFixed(1):'—';
    return '<tr><td class="tl">'+esc(stu?.student_name||'')+'</td>'+
      '<td class="tc">'+attended+'</td><td class="tc">'+totalH+'</td><td class="tc">'+pct+'%</td></tr>';
  }).join('');

  const evalRows=stuIds.map(sid=>{
    const stu=stuMap[String(sid)];
    const er=evalReadMap[String(sid)], ec=evalCharMap[String(sid)];
    return '<tr><td class="tl">'+esc(stu?.student_name||'')+'</td>'+
      '<td class="tc">'+(er?'✓ ผล '+elb(er.result):'—')+'</td>'+
      '<td class="tc">'+(ec?'✓ ผล '+elb(ec.overall_result):'—')+'</td></tr>';
  }).join('');

  document.body.insertAdjacentHTML('beforeend',
    '<div class="mo" id="subDetailMod"><div class="md md-lg">'+
      '<div class="mh"><div class="mt">'+esc(sub.subject_name)+' ('+grm(sub.grade_level,sub.room)+')</div>'+
      '<button class="mx" onclick="rmModal(\'subDetailMod\')">✕</button></div>'+
      '<div class="mb">'+
        '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">ครูผู้สอน: '+esc(st.teacherName)+' &nbsp;·&nbsp; ดูอย่างเดียว ไม่สามารถแก้ไขได้ที่นี่</div>'+
        '<div class="tabs">'+
          '<button class="tab active" data-tg="sdtl" data-ti="sdtl-score" onclick="swTab(\'sdtl\',\'sdtl-score\')">คะแนน</button>'+
          '<button class="tab" data-tg="sdtl" data-ti="sdtl-att" onclick="swTab(\'sdtl\',\'sdtl-att\')">เวลาเรียน</button>'+
          '<button class="tab" data-tg="sdtl" data-ti="sdtl-eval" onclick="swTab(\'sdtl\',\'sdtl-eval\')">ประเมิน</button>'+
        '</div>'+
        '<div class="tp active" id="sdtl-score" data-tp="sdtl">'+
          (scoreRows?'<div class="tw"><table><thead><tr><th class="tl">ชื่อ-สกุล</th><th>คะแนนรวม</th><th>เกรด</th><th>สถานะพิเศษ</th></tr></thead><tbody>'+scoreRows+'</tbody></table></div>'
            :'<div class="empty">ยังไม่มีนักเรียนในชั้น/ห้องนี้</div>')+
        '</div>'+
        '<div class="tp" id="sdtl-att" data-tp="sdtl">'+
          (attRows?'<div class="tw"><table><thead><tr><th class="tl">ชื่อ-สกุล</th><th>เข้าเรียน (ชม.)</th><th>เช็คชื่อแล้ว (ชม.)</th><th>% เวลาเรียน</th></tr></thead><tbody>'+attRows+'</tbody></table></div>'
            :'<div class="empty">ยังไม่มีนักเรียนในชั้น/ห้องนี้</div>')+
        '</div>'+
        '<div class="tp" id="sdtl-eval" data-tp="sdtl">'+
          (evalRows?'<div class="tw"><table><thead><tr><th class="tl">ชื่อ-สกุล</th><th>อ่าน/คิด/เขียน</th><th>คุณลักษณะ</th></tr></thead><tbody>'+evalRows+'</tbody></table></div>'
            :'<div class="empty">ยังไม่มีนักเรียนในชั้น/ห้องนี้</div>')+
        '</div>'+
      '</div>'+
      '<div class="mf"><button class="btn bs" onclick="rmModal(\'subDetailMod\')">ปิด</button></div>'+
    '</div></div>');
}

function printMsReport(){
  const data=S._schoolReport;
  if(!data){toast('กรุณาโหลดหน้ารายงานก่อน','er');return;}
  const stuMap=Object.fromEntries((S._schoolStudents||[]).map(s=>[String(s.id),s]));
  const cfg=S.config;
  const subjectsWithMs=data.filter(s=>s._stats.msStudentIds&&s._stats.msStudentIds.length>0);
  if(!subjectsWithMs.length){toast('ไม่พบนักเรียน มส ในทุกวิชา','in');return;}

  const totalMs=subjectsWithMs.reduce((a,s)=>a+s._stats.msStudentIds.length,0);
  const schoolLine=`<div style="text-align:center;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px">
    <div style="font-size:16px;font-weight:800">รายงานนักเรียนที่มีเวลาเรียนไม่ผ่านเกณฑ์ (มส)</div>
    <div style="font-size:14px;font-weight:600;margin-top:4px">${esc(cfg.school_name||'')} &nbsp;&nbsp;&nbsp; ปีการศึกษา ${esc(cfg.academic_year||'')} ภาคเรียนที่ ${esc(cfg.semester||'')}</div>
  </div>`;

  let pages='';
  subjectsWithMs.forEach((sub,i)=>{
    const st=sub._stats;
    const totalH=st.attTotalH??(sub.total_hours||60);
    const sorted=[...st.msStudentIds].sort((a,b)=>{
      const sa=stuMap[String(a)]?.student_code||'';
      const sb2=stuMap[String(b)]?.student_code||'';
      return sa.localeCompare(sb2,'th');
    });
    const isFirst=i===0;
    const isLast=i===subjectsWithMs.length-1;
    pages+=`<div style="page-break-after:${isLast?'auto':'always'};${isFirst?'':'padding-top:12mm'}">
      ${schoolLine}
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:7px 12px;font-weight:700;font-size:14px;margin-bottom:8px;border-radius:0 6px 6px 0">
        วิชา ${esc(sub.subject_name)} (${esc(sub.subject_code)}) ${grm(sub.grade_level,sub.room)}
        &nbsp;—&nbsp; ครูผู้สอน ${esc(st.teacherName)} &nbsp;|&nbsp; มส ${sorted.length} คน
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f5f5f7">
            <th style="width:30px;padding:5px 6px;border:1px solid #ccc;text-align:center">ที่</th>
            <th style="width:90px;padding:5px 8px;border:1px solid #ccc;text-align:center">เลขประจำตัว</th>
            <th style="padding:5px 8px;border:1px solid #ccc;text-align:left">ชื่อ-นามสกุล</th>
            <th style="width:62px;padding:5px 6px;border:1px solid #ccc;text-align:center">ชม.ที่มา</th>
            <th style="width:62px;padding:5px 6px;border:1px solid #ccc;text-align:center">ชม.ที่เช็คชื่อ</th>
            <th style="width:62px;padding:5px 6px;border:1px solid #ccc;text-align:center;color:#dc2626">%เวลา</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((sid,j)=>{
            const stu=stuMap[String(sid)];
            const att=st.attMap?.[String(sid)];
            const attended=att?.attended||0;
            const pct=totalH>0?(attended/totalH*100).toFixed(0):0;
            return `<tr style="border-bottom:1px solid #eee">
              <td style="text-align:center;padding:4px 6px;border:1px solid #ddd">${j+1}</td>
              <td style="text-align:center;padding:4px 8px;border:1px solid #ddd">${esc(stu?.student_code||'')}</td>
              <td style="text-align:left;padding:4px 8px;border:1px solid #ddd;white-space:nowrap">${esc(stu?.student_name||'(ไม่พบชื่อ)')}</td>
              <td style="text-align:center;padding:4px 6px;border:1px solid #ddd">${attended}</td>
              <td style="text-align:center;padding:4px 6px;border:1px solid #ddd">${totalH}</td>
              <td style="text-align:center;padding:4px 6px;border:1px solid #ddd;color:#dc2626;font-weight:700">${pct}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  });

  printHTML('รายงานนักเรียน มส',pages,'portrait');
}

function _toggleSchoolCard(cardId){
  const card=$(cardId); if(!card) return;
  const detail=card.querySelector('.school-detail');
  const chevron=card.querySelector('.school-chevron');
  if(!detail) return;
  const isOpen=detail.style.display!=='none';
  detail.style.display=isOpen?'none':'block';
  if(chevron) chevron.style.transform=isOpen?'':'rotate(180deg)';
}

function exportSchoolReport(){
  const data=S._schoolReport;
  if(!data||!data.length){ toast('ไม่มีข้อมูลรายงาน','er'); return; }
  const aoa=[
    [(S.config.school_name||'')+' — รายงานสรุปผลการเรียนทั้งโรงเรียน'],
    ['ปีการศึกษา '+(S.config.academic_year||'')+' ภาคเรียนที่ '+(S.config.semester||'')],
    [],
    ['ลำดับ','รหัสวิชา','ชื่อวิชา','ชั้น/ห้อง','ครูผู้สอน','นักเรียน','ผ่าน','ไม่ผ่าน','% ผ่าน','คะแนนเฉลี่ย','มส']
  ];
  data.forEach((sub,i)=>{
    const st=sub._stats;
    aoa.push([
      i+1, sub.subject_code, sub.subject_name,
      grm(sub.grade_level,sub.room), st.teacherName,
      st.total, st.pass!=null?st.pass:'-', st.fail!=null?st.fail:'-',
      st.pct!=='—'?st.pct+'%':'-', st.avg, st.msCount||0
    ]);
  });
  exportExcel(
    [{name:'รายงานทั้งโรงเรียน',aoa,colWidths:[6,10,24,10,20,8,7,8,8,10,6]}],
    'รายงานทั้งโรงเรียน_'+(S.config.academic_year||'')+'.xlsx'
  );
}
