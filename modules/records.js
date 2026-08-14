// ════════════════════════════════════════════════════════════════
// โมดูล records.js — โหลดแบบ lazy เมื่อเข้าเมนู นักเรียน / แผนการวัด / รายงานผล / ปก ปพ.5
// (หน้าที่ครูใช้แค่ตอนต้น/ปลายภาค ไม่ใช่ทุกวัน เหมือน เวลาเรียน/คะแนน/ประเมิน)
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// 3. STUDENTS
// ════════════════════════════════════════════════════════════════
let allStu=[];

// ════ เลื่อนชั้น ══════════════════════════════════════════════
function openPromoteDialog(){
  // สร้าง unique ชั้น/ห้อง จาก allStu
  const rooms = [...new Set(allStu.map(s=>s.grade_level+'_'+s.room))]
    .sort()
    .map(k=>{ const [g,r]=k.split('_'); return {grade:+g,room:+r,label:grm(g,r)}; });
  if(!rooms.length){ toast('ยังไม่มีนักเรียนในระบบ','er'); return; }

  const wrap = document.createElement('div');
  wrap.id = 'promote-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.45);backdrop-filter:blur(10px);animation:fadeIn .15s ease';

  const gradeOpts = (sel='') => GRADE_LEVELS.map(g=>
    `<option value="${g}" ${String(sel)===String(g)?'selected':''}>${GRADE_PREFIX}${g}</option>`
  ).join('');
  const roomOpts = (sel='') => [0,1,2,3,4,5,6,7,8,9,10].map(r=>
    `<option value="${r}" ${sel==r?'selected':''}>${r===0?'ห้อง 0 (ไม่ระบุห้อง)':'ห้อง '+r}</option>`
  ).join('');

  // คำนวณค่า default: ชั้นถัดไปของ room แรก
  const firstRoom = rooms[0];
  const _maxGradeNum = Math.max(...GRADE_LEVELS.map(g=>+g||0));
  const nextGrade = Math.min(_maxGradeNum, firstRoom.grade+1);

  wrap.innerHTML =
    '<div id="promote-box" style="background:rgba(255,255,255,.85);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border-radius:22px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.2);animation:dlgPop .22s cubic-bezier(.34,1.56,.64,1)">' +
      '<div style="padding:24px 24px 16px">' +
        '<div style="width:52px;height:52px;background:#fff7ed;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>' +
        '</div>' +
        '<div style="font-size:17px;font-weight:700;text-align:center;margin-bottom:4px">เลื่อนชั้นนักเรียน</div>' +
        '<div style="font-size:12.5px;color:#8e8e93;text-align:center;margin-bottom:18px">เปลี่ยนชั้น/ห้องของนักเรียนกลุ่มหนึ่ง<br>ใช้รหัสผู้บริหารยืนยัน</div>' +

        // จากห้อง
        '<div style="margin-bottom:12px">' +
          '<div style="font-size:12px;font-weight:700;color:#555;margin-bottom:5px">จากห้อง (ปัจจุบัน)</div>' +
          '<select id="promo-from" class="fs" style="width:100%" onchange="_updatePromotePreview()">' +
            rooms.map(r=>`<option value="${r.grade}_${r.room}">${r.label}</option>`).join('') +
          '</select>' +
        '</div>' +

        // ไปชั้น/ห้องใหม่
        '<div style="margin-bottom:14px">' +
          '<div style="font-size:12px;font-weight:700;color:#555;margin-bottom:5px">ไปยังชั้น/ห้องใหม่</div>' +
          '<div style="display:flex;gap:8px">' +
            '<select id="promo-to-grade" class="fs" style="flex:1" onchange="_updatePromotePreview()">' +
              gradeOpts(nextGrade) +
            '</select>' +
            '<select id="promo-to-room" class="fs" style="flex:1" onchange="_updatePromotePreview()">' +
              roomOpts(firstRoom.room) +
            '</select>' +
          '</div>' +
        '</div>' +

        // preview
        '<div id="promo-preview" style="background:#f7f7f9;border-radius:10px;padding:10px 12px;font-size:12.5px;min-height:44px"></div>' +
      '</div>' +
      '<div style="border-top:1px solid #f3f4f6">' +
        '<button onclick="_confirmPromote()" style="width:100%;padding:14px;font-size:15px;font-weight:600;color:#c2410c;background:none;border:none;border-bottom:1px solid #f3f4f6;cursor:pointer;font-family:var(--font)">ใส่รหัสผู้บริหารและเลื่อนชั้น</button>' +
        '<button onclick="_closePromoteDialog()" style="width:100%;padding:14px;font-size:15px;color:#8e8e93;background:none;border:none;cursor:pointer;font-family:var(--font)">ยกเลิก</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(wrap);
  // แสดง preview ครั้งแรก
  setTimeout(_updatePromotePreview, 50);
}

function _closePromoteDialog(){
  const w=document.getElementById('promote-wrap');
  if(w){ w.style.animation='fadeIn .15s ease reverse forwards'; setTimeout(()=>w.remove(),150); }
}

function _updatePromotePreview(){
  const fromVal = document.getElementById('promo-from')?.value||'';
  const toGrade = document.getElementById('promo-to-grade')?.value||'';
  const toRoom  = document.getElementById('promo-to-room')?.value||'';
  const prev = document.getElementById('promo-preview');
  if(!prev||!fromVal) return;

  const [fromG,fromR] = fromVal.split('_');
  const students = allStu.filter(s=>String(s.grade_level)===fromG&&String(s.room)===fromR);

  if(!students.length){
    prev.innerHTML = '<span style="color:#8e8e93">ไม่พบนักเรียนในห้องนี้</span>';
    return;
  }

  // ตรวจว่าชั้นใหม่เท่ากับเดิมไหม
  const sameRoom = fromG===String(toGrade) && fromR===String(toRoom);
  const warnHtml = sameRoom
    ? `<div style="color:#dc2626;font-size:11.5px;margin-top:4px">${_ico.warning} ชั้น/ห้องใหม่เหมือนเดิม</div>`
    : '';

  prev.innerHTML =
    '<div style="font-weight:700;color:#c2410c;margin-bottom:5px">' +
      'จะเปลี่ยน <strong>' + students.length + ' คน</strong>' +
      ' จาก '+grm(fromG,fromR)+' → '+grm(toGrade,toRoom)+' ' +
    '</div>' +
    '<div style="font-size:11.5px;color:#555;line-height:1.7;max-height:80px;overflow-y:auto">' +
      students.slice(0,8).map(s=>esc(s.student_name)).join(' · ') +
      (students.length>8 ? ' ... และอีก '+(students.length-8)+' คน' : '') +
    '</div>' +
    warnHtml;
}

function _confirmPromote(){
  const fromVal    = document.getElementById('promo-from')?.value||'';
  const toGradeStr = document.getElementById('promo-to-grade')?.value??'';
  const toRoomStr  = document.getElementById('promo-to-room')?.value??'';
  const toGrade = +toGradeStr;
  const toRoom  = +toRoomStr;
  if(!fromVal || !toGradeStr || toRoomStr===''){ toast('กรุณาเลือกข้อมูลให้ครบ','er'); return; }

  const [fromG,fromR] = fromVal.split('_');
  const students = allStu.filter(s=>String(s.grade_level)===fromG&&String(s.room)===fromR);
  if(!students.length){ toast('ไม่พบนักเรียนในห้องนี้','er'); return; }
  if(String(fromG)===String(toGrade)&&String(fromR)===String(toRoom)){
    toast('ชั้น/ห้องใหม่เหมือนเดิม กรุณาเลือกใหม่','er'); return;
  }

  _closePromoteDialog();

  adminAuth({
    title: 'ยืนยันการเลื่อนชั้น',
    msg: 'เลื่อน <strong>'+students.length+' คน</strong> จาก ม.'+fromG+'/'+fromR+
         ' → ม.'+toGrade+'/'+toRoom+
         '<br><span style="font-size:12px;color:#8e8e93">ข้อมูลคะแนน/เวลาเรียนที่บันทึกไว้จะยังคงอยู่</span>',
    icon: 'lock',
    onSuccess: ()=>{
      confirm2({
        title: 'ยืนยันอีกครั้ง',
        msg: 'เลื่อนชั้นนักเรียน <strong>'+students.length+' คน</strong><br>' +
             'จาก <strong>ม.'+fromG+'/'+fromR+'</strong> → <strong>ม.'+toGrade+'/'+toRoom+'</strong>',
        type: 'warn',
        confirmText: 'เลื่อนชั้นเลย',
        cancelText: 'ยกเลิก',
        onConfirm: ()=>_doPromote(students, toGrade, toRoom, fromG, fromR)
      });
    }
  });
}

async function _doPromote(students, toGrade, toRoom, fromG, fromR){
  loading(true);
  try{
    // ตรวจสอบ student_code ที่มีอยู่แล้วในห้องปลายทาง เพื่อหลีกเลี่ยง duplicate key
    const existingInTarget = await q(
      sb.from('students').select('student_code').eq('grade_level', toGrade).eq('room', toRoom)
    );
    const existingCodes = new Set(existingInTarget.map(s=>String(s.student_code)));
    const toUpdate = students.filter(s=>!existingCodes.has(String(s.student_code)));
    const skipped = students.length - toUpdate.length;

    if(toUpdate.length === 0){
      loading(false);
      alert2({title:'ไม่มีรายการที่ต้องย้าย',msg:'นักเรียนทุกคนมีรหัสซ้ำในห้องปลายทางแล้ว',type:'warn'});
      return;
    }

    const ids = toUpdate.map(s=>s.id);
    const batchSize = 50;
    for(let i=0; i<ids.length; i+=batchSize){
      const batch = ids.slice(i, i+batchSize);
      await q(sb.from('students').update({grade_level:toGrade, room:toRoom}).in('id', batch));
    }
    allStu = allStu.map(s=>ids.includes(s.id)?{...s,grade_level:toGrade,room:toRoom}:s);
    clearStuCache();
    const detail = skipped>0
      ? `ย้ายสำเร็จ <strong>${toUpdate.length} คน</strong><br>ข้าม <strong>${skipped} คน</strong> ที่มีรหัสซ้ำในห้องปลายทางแล้ว`
      : `ย้ายนักเรียน <strong>${toUpdate.length} คน</strong> เรียบร้อยแล้ว`;
    logAudit('promote_students', `เลื่อนชั้น ${toUpdate.length} คน จาก ม.${fromG}/${fromR} → ม.${toGrade}/${toRoom}`);
    alert2({
      title: `เลื่อนชั้นสำเร็จ ${grm(fromG,fromR)} → ${grm(toGrade,toRoom)}`,
      msg: detail,
      type: skipped>0?'warn':'ok',
      onOk: filterStu
    });
  }catch(e){
    toast('เกิดข้อผิดพลาด: '+e.message,'er');
  }finally{
    loading(false);
  }
}

async function pgStudents(){
  loading(true);
  allStu=await qAll(()=>sb.from('students').select('*').order('grade_level').order('room').order('student_code'));
  loading(false);
  const grs=[...new Set(allStu.map(s=>`${grm(s.grade_level,s.room)}`))].sort();
  $('pg').innerHTML=`
  <div class="ph">
    <div><div class="ptitle">จัดการนักเรียน</div><div class="psub" id="stu-cnt">รวม ${allStu.length} คน</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn bs" onclick="openPromoteDialog()" style="background:rgba(255,149,0,.1);color:#c2410c"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>เลื่อนชั้น</button>
      <button class="btn bs" onclick="openImport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>นำเข้ารายชื่อ</button>
      <button class="btn bp" onclick="openStuModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>เพิ่มนักเรียน</button>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px"><div class="cb" style="padding:10px 16px">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <input class="fi" id="stu-q" placeholder="ค้นหาชื่อ/รหัส..." style="max-width:220px" oninput="filterStu()">
      <select class="fs" id="stu-gr" style="max-width:140px" onchange="filterStu()">
        <option value="">ทุกชั้น/ห้อง</option>
        ${grs.map(g=>`<option>${g}</option>`).join('')}
      </select>
    </div>
  </div></div>
  <div class="card"><div class="cb" id="stu-tb">${renderStuTbl(allStu)}</div></div>`;
}
function renderStuTbl(list){
  if(!list.length)return`<div class="empty"><svg class="ei" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#c7c7cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg><div>ไม่พบนักเรียน</div></div>`;
  return`<div class="tw"><table>
    <thead><tr><th>ลำดับ</th><th>รหัส</th><th class="tl">ชื่อ-สกุล</th><th>ชั้น/ห้อง</th><th>เพศ</th><th>จัดการ</th></tr></thead>
    <tbody>${list.map((s,i)=>`<tr>
      <td class="tc">${i+1}</td><td class="tc">${esc(s.student_code)}</td>
      <td style="white-space:nowrap">${esc(s.student_name)}</td>
      <td class="tc">${grm(s.grade_level,s.room)}</td>
      <td class="tc">${s.gender==='ช'?'ชาย':s.gender==='ญ'?'หญิง':esc(s.gender||'-')}</td>
      <td class="tc">
        <button class="btn bs btn-sm" onclick="openStuModal('${s.id}')" style="padding:5px 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn bd btn-sm" onclick="delStu('${s.id}','${escJs(s.student_name)}')" style="padding:5px 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
      </td></tr>`).join('')}
    </tbody></table></div>`;
}
function filterStu(){
  const qv=$('stu-q').value.toLowerCase(),gr=$('stu-gr').value;
  $('stu-tb').innerHTML=renderStuTbl(allStu.filter(s=>{
    const mq=!qv||s.student_name.toLowerCase().includes(qv)||s.student_code.toLowerCase().includes(qv);
    const mg=!gr||`${grm(s.grade_level,s.room)}`===gr;
    return mq&&mg;
  }));
}
function openStuModal(id){
  const s=id?allStu.find(x=>x.id===id):null;
  if(s){
    // แจ้งเตือนก่อนแก้ไข
    confirm2({title:'แก้ไขข้อมูลนักเรียน',
      msg:'การแก้ไข <strong>'+esc(s.student_name)+'</strong><br>จะมีผลกับทุกวิชาที่นักเรียนคนนี้ลงทะเบียนไว้',
      type:'warn',confirmText:'แก้ไขต่อ',cancelText:'ยกเลิก',
      onConfirm:()=>_doOpenStuModal(id)});
    return;
  }
  _doOpenStuModal(id);
}
function _doOpenStuModal(id){
  const s=id?allStu.find(x=>x.id===id):null;
  const pfx=['เด็กชาย','เด็กหญิง','นาย','นางสาว','นาง'];
  document.body.insertAdjacentHTML('beforeend',`
  <div class="mo" id="stuMod"><div class="md">
    <div class="mh"><div class="mt">${s?'แก้ไขนักเรียน':'เพิ่มนักเรียน'}</div>
    <button class="mx" onclick="rmModal('stuMod')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
    <div class="mb"><div class="fg">
      <div><label class="fl">คำนำหน้า</label>
        <select class="fs" id="sf-pfx">${pfx.map(p=>`<option ${s?.prefix===p?'selected':''}>${p}</option>`).join('')}</select></div>
      <div style="grid-column:span 2"><label class="fl">ชื่อ-นามสกุล <span class="req">*</span></label>
        <input class="fi" id="sf-nm" value="${esc(s?.student_name?.replace(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)/,'').trim()||'')}"></div>
      <div><label class="fl">รหัสนักเรียน</label><input class="fi" id="sf-code" value="${esc(s?.student_code||'')}"></div>
      <div><label class="fl">ชั้น ม.</label>
        <select class="fs" id="sf-gr">${gradeSelectOptions(s?.grade_level)}</select></div>
      <div><label class="fl">ห้อง</label><input class="fi" id="sf-rm" value="${esc(s?.room||'')}"></div>
    </div></div>
    <div class="mf">
      <button class="btn bs" onclick="rmModal('stuMod')">ยกเลิก</button>
      <button class="btn bp" onclick="saveStu('${id||''}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>บันทึก</button>
    </div>
  </div></div>`);
}
async function saveStu(id){
  const pfx=$('sf-pfx').value,nm=$('sf-nm').value.trim();
  if(!nm){toast('กรุณากรอกชื่อ','er');return;}
  const gender=pfx==='เด็กชาย'||pfx==='นาย'?'ช':'ญ';
  const payload={student_code:$('sf-code').value.trim(),student_name:pfx+nm,
    prefix:pfx,grade_level:$('sf-gr').value,room:$('sf-rm').value.trim(),gender};
  loading(true);
  try{
    if(id){ await q(sb.from('students').update(payload).eq('id',id)); }
    else   { await q(sb.from('students').insert(payload)); }
    clearStuCache();
    allStu=await qAll(()=>sb.from('students').select('*').order('grade_level').order('room').order('student_code'));
    rmModal('stuMod');toast(id?'แก้ไขเรียบร้อย':'เพิ่มนักเรียนเรียบร้อย');
    filterStu();$('stu-cnt').textContent='รวม '+allStu.length+' คน';
  }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
}
async function delStu(id,name){
  adminAuth({
    title:'ลบนักเรียน',
    msg:'การลบ <strong>'+name+'</strong><br>ต้องใช้รหัสผู้บริหาร<br><span style="font-size:12px;color:#8e8e93">เพราะนักเรียนใช้ร่วมกันทุกวิชา</span>',
    icon:'trash',
    onSuccess:async()=>{
      confirm2({title:'ยืนยันการลบ',msg:'ลบ "<strong>'+name+'</strong>" ออกจากระบบ?<br><span style="font-size:12px;color:#dc2626">ข้อมูลทุกวิชาที่เกี่ยวข้องจะหายด้วย</span>',type:'danger',confirmText:'ลบถาวร',cancelText:'ยกเลิก',onConfirm:async()=>{
        loading(true);
        try{
          await q(sb.from('students').delete().eq('id',id));
          clearStuCache();
          allStu=await qAll(()=>sb.from('students').select('*').order('grade_level').order('room').order('student_code'));
          logAudit('delete_student','ลบนักเรียน "'+name+'"');
          toast('ลบเรียบร้อย');filterStu();
        }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
      }});
    }
  });
}
function openImport(){
  document.body.insertAdjacentHTML('beforeend',`
  <div class="mo" id="impMod"><div class="md md-lg">
    <div class="mh"><div class="mt">นำเข้ารายชื่อนักเรียน</div>
    <button class="mx" onclick="rmModal('impMod')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
    <div class="mb">
      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:16px">
        <button class="tab active" data-tg="imp" data-ti="imp-excel" onclick="swTab('imp','imp-excel')">ไฟล์ Excel (.xlsx)</button>
        <button class="tab" data-tg="imp" data-ti="imp-paste" onclick="swTab('imp','imp-paste')">วางข้อความ (ทีละห้อง)</button>
      </div>

      <!-- TAB: Excel ทั้งโรงเรียน -->
      <div class="tp active" id="imp-excel" data-tp="imp">
        <div class="alert al-in" style="margin-bottom:12px"><div class="alert-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div>
            <strong>รองรับ format คอลัมน์:</strong><br>
            <code>เลขที่ | รหัส | ชื่อ-สกุล | ชั้น | ห้อง</code><br>
            <span style="font-size:12px;color:var(--muted)">
              • ชั้น = ตัวเลข เช่น 1, 2, 3 (ไม่ต้องมีคำว่า ม.)<br>
              • ห้อง = ตัวเลข เช่น 1, 2, 3<br>
              • คำนำหน้าในชื่อจะตรวจจับอัตโนมัติ (เด็กชาย/เด็กหญิง/นาย/นางสาว)
            </span>
          </div>
        </div>
        <div style="border:2px dashed var(--bdr);border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:all .2s"
             id="drop-zone"
             onclick="$('excel-file').click()"
             ondragover="event.preventDefault();this.style.borderColor='var(--ac)'"
             ondragleave="this.style.borderColor='var(--bdr)'"
             ondrop="handleFileDrop(event)">
          <div style="margin-bottom:10px;color:#8e8e93"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></div>
          <div style="font-weight:600;color:var(--txt);margin-bottom:4px">คลิกเพื่อเลือกไฟล์ หรือลากวางที่นี่</div>
          <div style="font-size:12.5px;color:var(--muted)">รองรับ .xlsx, .xls</div>
          <input type="file" id="excel-file" accept=".xlsx,.xls" style="display:none" onchange="handleFileSelect(this)">
        </div>
        <div id="imp-preview" style="margin-top:14px"></div>
      </div>

      <!-- TAB: วางข้อความทีละห้อง -->
      <div class="tp" id="imp-paste" data-tp="imp">
        <div class="alert al-in" style="margin-bottom:12px">
          วางข้อมูลจาก Excel: <code>เลขที่[TAB]รหัส[TAB]ชื่อ-สกุล</code>
        </div>
        <div class="fg" style="margin-bottom:12px">
          <div><label class="fl">ชั้น ม.</label>
            <select class="fs" id="imp-gr">${gradeSelectOptions()}</select></div>
          <div><label class="fl">ห้อง <span class="req">*</span></label>
            <input class="fi" id="imp-rm" placeholder="เช่น 1"></div>
        </div>
        <div><label class="fl">รายชื่อนักเรียน</label>
          <textarea class="fta" id="imp-txt" rows="10"
            placeholder="1&#9;02411&#9;เด็กชายกฤษฎา พงาตุนัตถ์&#10;2&#9;02412&#9;เด็กชายชานนท์ รัตน์เมือง"></textarea></div>
      </div>
    </div>
    <div class="mf">
      <button class="btn bs" onclick="rmModal('impMod')">ยกเลิก</button>
      <button class="btn bp" id="imp-btn" onclick="doImport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>นำเข้า</button>
    </div>
  </div></div>`);
}

// ── Excel file handlers ──────────────────────────────────────────
let _excelData = []; // เก็บข้อมูลที่อ่านจาก Excel

function handleFileDrop(e){
  e.preventDefault();
  $('drop-zone').style.borderColor='var(--bdr)';
  const file=e.dataTransfer.files[0];
  if(file) readExcelFile(file);
}
function handleFileSelect(input){
  const file=input.files[0];
  if(file) readExcelFile(file);
}

async function readExcelFile(file){
  $('imp-preview').innerHTML='<div style="color:var(--muted);font-size:13px">⏳ กำลังอ่านไฟล์...</div>';
  try{ await ensureXLSX(); }
  catch(e){ $('imp-preview').innerHTML=`<div class="alert al-er">โหลดตัวอ่าน Excel ไม่สำเร็จ: ${e.message}</div>`; return; }
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      parseExcelRows(rows);
    }catch(err){
      $('imp-preview').innerHTML=`<div class="alert al-er">อ่านไฟล์ไม่ได้: ${err.message}</div>`;
    }
  };
  reader.readAsBinaryString(file);
}

function parseExcelRows(rows){
  _excelData=[];
  const prefixes=['เด็กชาย','เด็กหญิง','นาย','นางสาว','นาง'];
  let skipped=0;

  // ตรวจหา header row (แถวที่มีคำว่า ชื่อ หรือ name)
  let dataStart=0;
  for(let i=0;i<Math.min(5,rows.length);i++){
    const r=rows[i].map(c=>String(c||'').trim().toLowerCase());
    if(r.some(c=>c.includes('ชื่อ')||c.includes('name')||c.includes('student'))){
      dataStart=i+1; break;
    }
  }

  for(let i=dataStart;i<rows.length;i++){
    const r=rows[i].map(c=>String(c||'').trim());
    if(r.every(c=>!c)) continue; // skip empty rows

    // หา columns: รองรับทั้ง format [เลขที่,รหัส,ชื่อ,ชั้น,ห้อง] และ [รหัส,ชื่อ,ชั้น,ห้อง]
    let code='',name='',grade='',room='';

    if(r.length>=5 && !isNaN(r[0]) && !isNaN(r[1]) && !isNaN(r[3])){
      // format: เลขที่(ตัวเลข) | รหัส(ตัวเลข) | ชื่อ | ชั้น | ห้อง
      code=r[1]; name=r[2]; grade=r[3]; room=r[4];
    } else if(r.length>=4 && !isNaN(r[2])){
      // format: รหัส | ชื่อ | ชั้น | ห้อง
      code=r[0]; name=r[1]; grade=r[2]; room=r[3];
    } else if(r.length>=3 && !isNaN(r[0]) && !isNaN(r[1])){
      // format: เลขที่ | รหัส | ชื่อ (ไม่มีชั้น/ห้อง — skip)
      skipped++; continue;
    } else { skipped++; continue; }

    if(!code||!name||!grade||!room){ skipped++; continue; }
    // normalize grade: "1", "ม.1", "ม1" → "1"
    grade=String(grade).replace(/[^0-9]/g,'');
    room=String(room).replace(/[^0-9]/g,'');
    if(!grade||!room){ skipped++; continue; }

    const pfx=prefixes.find(p=>name.startsWith(p))||'';
    const gender=pfx==='เด็กชาย'||pfx==='นาย'?'ช':'ญ';
    _excelData.push({student_code:code,student_name:name,prefix:pfx,grade_level:grade,room,gender});
  }

  // สรุปตามชั้น/ห้อง
  const groups={};
  _excelData.forEach(s=>{ const k=`${grm(s.grade_level,s.room)}`; groups[k]=(groups[k]||0)+1; });
  const groupList=Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0]));

  $('imp-preview').innerHTML=_excelData.length===0
    ?`<div class="alert al-er">ไม่พบข้อมูลที่ถูกต้อง — ตรวจสอบ format คอลัมน์ (ต้องมีคอลัมน์ ชั้น และ ห้อง)</div>`
    :`<div class="alert al-ok" style="margin-bottom:8px">
        ${_ico.checkCircle} พบข้อมูล <strong>${_excelData.length} คน</strong>
        ${skipped>0?`<span style="color:var(--warn-txt)"> (ข้าม ${skipped} แถวที่ไม่ครบข้อมูล)</span>`:''}
      </div>
      <div class="tw"><table>
        <thead><tr><th>ชั้น/ห้อง</th><th>จำนวน</th></tr></thead>
        <tbody>${groupList.map(([k,n])=>`<tr><td class="tc">${k}</td><td class="tc">${n} คน</td></tr>`).join('')}</tbody>
      </table></div>`;
}

async function doImport(){
  // ตรวจว่าอยู่ tab ไหน
  const excelTab=$('imp-excel');
  const isExcel = excelTab && excelTab.classList.contains('active');

  if(isExcel){
    // นำเข้าจาก Excel
    if(!_excelData.length){toast('กรุณาเลือกไฟล์ Excel ก่อน','er');return;}
    loading(true);
    try{
      // แบ่ง upsert เป็น batch 100 คน กัน timeout
      const BATCH=100;
      let total=0;
      for(let i=0;i<_excelData.length;i+=BATCH){
        const batch=_excelData.slice(i,i+BATCH);
        await q(sb.from('students').upsert(batch,{onConflict:'student_code,grade_level,room',ignoreDuplicates:false}));
        total+=batch.length;
      }
      clearStuCache();
      allStu=await qAll(()=>sb.from('students').select('*').order('grade_level').order('room').order('student_code'));
      _excelData=[];
      rmModal('impMod');
      toast('นำเข้า '+total+' คนเรียบร้อย');
      filterStu();$('stu-cnt').textContent='รวม '+allStu.length+' คน';
    }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
  } else {
    // นำเข้าจากการวางข้อความ (เดิม)
    const gr=$('imp-gr').value,rm=$('imp-rm').value.trim(),txt=$('imp-txt').value.trim();
    if(!rm){toast('กรุณากรอกห้อง','er');return;}
    const lines=txt.split('\n').filter(l=>l.trim());
    const arr=lines.map(l=>{
      const p=l.split(/\t/).map(x=>x.trim());
      let code='',name='';
      if(p.length>=3&&!isNaN(p[0])){code=p[1];name=p[2];}
      else if(p.length>=2){code=p[0];name=p[1];}
      else name=p[0];
      if(!name)return null;
      const pfx=['เด็กชาย','เด็กหญิง','นาย','นางสาว','นาง'].find(p=>name.startsWith(p))||'';
      const gender=pfx==='เด็กชาย'||pfx==='นาย'?'ช':'ญ';
      return{student_code:code,student_name:name,prefix:pfx,grade_level:gr,room:rm,gender};
    }).filter(Boolean);
    if(!arr.length){toast('ไม่พบรายชื่อ','er');return;}
    loading(true);
    try{
      await q(sb.from('students').upsert(arr,{onConflict:'student_code,grade_level,room',ignoreDuplicates:false}));
      clearStuCache();
      allStu=await qAll(()=>sb.from('students').select('*').order('grade_level').order('room').order('student_code'));
      rmModal('impMod');toast('นำเข้า '+arr.length+' คนเรียบร้อย');
      filterStu();$('stu-cnt').textContent='รวม '+allStu.length+' คน';
    }catch(e){toast('เกิดข้อผิดพลาด: '+e.message,'er');}finally{loading(false);}
  }
}

// ════════════════════════════════════════════════════════════════
// 6.5 EVAL PLAN (แผนการวัดและประเมินผล)
// ════════════════════════════════════════════════════════════════
let epUnits=[], epUnitInd={}, epIndScores=[];
let _epPickUnit=null, _epPickSearch='', _epPickKind='';

async function pgEvalPlan(){
  if(!S.subjects.length){$('pg').innerHTML=`<div class="card"><div class="empty"><svg class="ei" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#c7c7cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg><div>ยังไม่มีรายวิชา</div></div></div>`;return;}
  if(!S.selSub) S.selSub=S.subjects[0].id;
  loading(true);
  try{
    await _loadIndicatorsAll();
    await loadEvalPlan(S.selSub);
  }finally{ loading(false); }
  renderEvalPlanPage();
}
async function loadEvalPlan(sid){
  epUnits = await q(sb.from('eval_plan_units').select('*').eq('subject_id',sid).order('seq'));
  const unitIds = epUnits.map(u=>u.id);
  const links = unitIds.length ? await q(sb.from('eval_plan_unit_indicators').select('*').in('unit_id',unitIds)) : [];
  epUnitInd = {};
  links.forEach(l=>{
    if(!epUnitInd[l.unit_id]) epUnitInd[l.unit_id]=[];
    epUnitInd[l.unit_id].push(l.indicator_id);
  });
  epIndScores = await q(sb.from('eval_plan_indicator_scores').select('*').eq('subject_id',sid));
}
function changeEvalPlanSub(id){ S.selSub=id; pgEvalPlan(); }

// ── คัดลอกแผนการวัดฯ + คะแนนหน่วยก่อน/หลังกลางภาค จากวิชาอื่น (เช่น ห้องอื่นที่รหัสวิชาเดียวกัน) ──
function openCopyEvalPlanModal(){
  const cur=getSubject(S.selSub);
  if(!cur){toast('ไม่พบวิชา','er');return;}
  const candidates=S.subjects.filter(s=>s.id!==cur.id);
  if(!candidates.length){toast('ไม่มีวิชาอื่นให้คัดลอก','er');return;}
  const sameCode=candidates.filter(s=>s.subject_code===cur.subject_code);
  const others=candidates.filter(s=>s.subject_code!==cur.subject_code);
  const opt=s=>`<option value="${s.id}">${esc(s.subject_name)} ${grm(s.grade_level,s.room)} (${esc(s.subject_code)})</option>`;
  document.body.insertAdjacentHTML('beforeend',`
  <div class="mo" id="cepMod"><div class="md">
    <div class="mh"><div class="mt">คัดลอกแผนการวัดฯ จากวิชาอื่น</div>
      <button class="mx" onclick="rmModal('cepMod')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
    <div class="mb">
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">คัดลอกมาให้ "<strong>${esc(cur.subject_name)} ${grm(cur.grade_level,cur.room)}</strong>" — คัดลอกเฉพาะโครงสร้าง (หน่วย/ตัวชี้วัด/น้ำหนักคะแนน) ไม่คัดลอกคะแนนนักเรียนจริง</div>
      <label class="fl">วิชาต้นทาง</label>
      <select class="fs" id="cep-src">
        ${sameCode.length?`<optgroup label="รหัสวิชาเดียวกัน (${esc(cur.subject_code)})">${sameCode.map(opt).join('')}</optgroup>`:''}
        ${others.length?`<optgroup label="วิชาอื่น">${others.map(opt).join('')}</optgroup>`:''}
      </select>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13.5px;cursor:pointer"><input type="checkbox" id="cep-c-plan" checked style="width:16px;height:16px;margin-top:1px;flex-shrink:0">แผนการวัดฯ (หน่วยการเรียนรู้ + ตัวชี้วัด + น้ำหนักคะแนนรายตัวชี้วัด)</label>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13.5px;cursor:pointer"><input type="checkbox" id="cep-c-units" checked style="width:16px;height:16px;margin-top:1px;flex-shrink:0">คะแนนหน่วยก่อน/หลังกลางภาค (หน้าบันทึกคะแนน) — คัดลอกเฉพาะชื่อหน่วยและคะแนนเต็ม คะแนนของนักเรียนแต่ละคนเริ่มที่ 0</label>
      </div>
    </div>
    <div class="mf">
      <button class="btn bs" onclick="rmModal('cepMod')">ยกเลิก</button>
      <button class="btn bp" onclick="doCopyEvalPlan()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>คัดลอก</button>
    </div>
  </div></div>`);
}
async function doCopyEvalPlan(){
  const srcId=$('cep-src').value;
  const copyPlan=$('cep-c-plan').checked;
  const copyUnits=$('cep-c-units').checked;
  const destId=S.selSub;
  if(!srcId){toast('กรุณาเลือกวิชาต้นทาง','er');return;}
  if(!copyPlan&&!copyUnits){toast('กรุณาเลือกอย่างน้อย 1 รายการ','er');return;}
  loading(true);
  try{
    if(copyPlan){
      const existingUnits=await q(sb.from('eval_plan_units').select('id').eq('subject_id',destId));
      if(existingUnits.length) throw new Error('วิชานี้มีแผนการวัดฯ (หน่วยการเรียนรู้) อยู่แล้ว — กรุณาลบหน่วยเดิมออกก่อนคัดลอกทับ เพื่อป้องกันข้อมูลซ้ำ');
      const units=await q(sb.from('eval_plan_units').select('*').eq('subject_id',srcId).order('seq'));
      const unitIdMap={};
      for(const u of units){
        const nu=await q(sb.from('eval_plan_units').insert({subject_id:destId,seq:u.seq,unit_name:u.unit_name,hours:u.hours,weight:u.weight,weight_final:u.weight_final}).select('id'));
        unitIdMap[u.id]=nu[0].id;
      }
      const oldUnitIds=units.map(u=>u.id);
      if(oldUnitIds.length){
        const links=await q(sb.from('eval_plan_unit_indicators').select('*').in('unit_id',oldUnitIds));
        if(links.length){
          const newLinks=links.map(l=>({unit_id:unitIdMap[l.unit_id],indicator_id:l.indicator_id}));
          await q(sb.from('eval_plan_unit_indicators').insert(newLinks));
        }
      }
      const scores=await q(sb.from('eval_plan_indicator_scores').select('*').eq('subject_id',srcId));
      if(scores.length){
        const newScores=scores.map(s=>({subject_id:destId,indicator_id:s.indicator_id,
          score_k:s.score_k,score_p:s.score_p,score_a:s.score_a,score_mid:s.score_mid,score_final:s.score_final,note:s.note}));
        await q(sb.from('eval_plan_indicator_scores').insert(newScores));
      }
    }
    if(copyUnits){
      const existingScUnits=await q(sb.from('score_units').select('id').eq('subject_id',destId).limit(1));
      if(existingScUnits.length) throw new Error('วิชานี้มีคะแนนหน่วยก่อน/หลังกลางภาคอยู่แล้ว — กรุณาลบหน่วยเดิมออกก่อนคัดลอกทับ เพื่อป้องกันข้อมูลซ้ำ');
      const srcScUnits=await qAll(()=>sb.from('score_units').select('*').eq('subject_id',srcId));
      const unitDefs={};
      srcScUnits.forEach(u=>{
        const k=u.period+'_'+u.unit_number;
        if(!unitDefs[k]) unitDefs[k]={period:u.period,unit_number:u.unit_number,unit_name:u.unit_name,standard_ref:u.standard_ref,max_score:u.max_score};
      });
      const defs=Object.values(unitDefs);
      if(defs.length){
        const destStus=await getStudentsBySubject(destId);
        const rows=[];
        destStus.forEach(s=>{
          defs.forEach(d=>{
            rows.push({subject_id:destId,student_id:s.id,period:d.period,unit_number:d.unit_number,
              unit_name:d.unit_name,standard_ref:d.standard_ref,max_score:d.max_score,score:0});
          });
        });
        if(rows.length) await q(sb.from('score_units').upsert(rows,{onConflict:'subject_id,student_id,period,unit_number'}));
      }
    }
    rmModal('cepMod');
    toast('คัดลอกเรียบร้อย');
    cacheInv('sc_units_'+destId); cacheInv('sc_sum_'+destId);
    await loadEvalPlan(destId);
    renderEvalPlanPage();
  }catch(e){ toast('คัดลอกไม่สำเร็จ: '+e.message,'er'); }
  finally{ loading(false); }
}

function renderEvalPlanPage(){
  const sid=S.selSub;
  const sub=S.subjects.find(s=>s.id===sid);
  $('pg').innerHTML=`
  <div class="ph">
    <div>
      <div class="ptitle">แผนการวัดและประเมินผล</div>
      <div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(sub?.subject_name||'')} &nbsp;·&nbsp; ${esc(sub?.subject_code||'')} &nbsp;·&nbsp; ${grm(sub?.grade_level,sub?.room)} &nbsp;·&nbsp; ภาคเรียนที่ ${sub?.semester||1}/${esc(sub?.academic_year||'')}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn bs no-print" onclick="openCopyEvalPlanModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>คัดลอกจากวิชาอื่น</button>
      <button class="btn bs no-print" onclick="exportEvalPlan()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>Excel</button>
      <button class="btn bs no-print" onclick="printEvalPlan()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>พิมพ์</button>
    </div>
  </div>
  <div style="margin-bottom:14px">
    <select class="fs" style="max-width:340px" onchange="changeEvalPlanSub(this.value)">
      ${S.subjects.map(s=>`<option value="${s.id}" ${s.id===sid?'selected':''}>${esc(s.subject_name)} ${grm(s.grade_level,s.room)}</option>`).join('')}
    </select>
  </div>
  <div class="tabs">
    <button class="tab active" data-tg="epl" data-ti="epl-units" onclick="swTab('epl','epl-units')">หน่วยการเรียนรู้ &amp; มาตรฐาน</button>
    <button class="tab" data-tg="epl" data-ti="epl-ratio" onclick="swTab('epl','epl-ratio')">สัดส่วนคะแนน</button>
  </div>
  <div class="tp active" id="epl-units" data-tp="epl">${renderEplUnitsTab()}</div>
  <div class="tp" id="epl-ratio" data-tp="epl">${renderEplRatioTab()}</div>`;
}

// ── TAB 1: หน่วยการเรียนรู้ & มาตรฐาน ──────────────────────────────
function renderEplUnitsTab(){
  const sub=S.subjects.find(s=>s.id===S.selSub)||{};
  let sumHours=0,sumWeight=0,sumWeightFinal=0;
  epUnits.forEach(u=>{ sumHours+=+u.hours||0; sumWeight+=+u.weight||0; sumWeightFinal+=+u.weight_final||0; });
  const mid=+sub.score_mid||0;
  const betweenWithMid=sumWeight+mid;
  const targetBetween=(+sub.score_before_mid||0)+mid+(+sub.score_after_mid||0);
  const targetFinal=+sub.score_final||0;
  const grand=sumWeight+mid+sumWeightFinal;
  return`<div class="card">
    <div class="ch"><div class="ct">หน่วยการเรียนรู้ มาตรฐานการเรียนรู้ ภาระงาน และสัดส่วนคะแนนประเมินผล</div>
      <span style="font-size:11.5px;color:var(--muted)">${epUnits.length} หน่วย</span></div>
    <div class="cb">
      <div class="tw"><table>
        <thead><tr>
          <th style="width:34px" rowspan="2">ที่</th>
          <th class="tl" style="min-width:150px" rowspan="2">ชื่อหน่วยการเรียนรู้</th>
          <th class="tl" style="min-width:240px" rowspan="2">มาตรฐานการเรียนรู้ / ตัวชี้วัด</th>
          <th style="width:80px" rowspan="2">เวลา (ชม.)</th>
          <th colspan="2">น้ำหนักคะแนน</th>
          <th style="width:30px" rowspan="2"></th>
        </tr><tr>
          <th style="width:90px">ระหว่างภาค</th>
          <th style="width:90px">ปลายภาค</th>
        </tr></thead>
        <tbody>
        ${epUnits.length===0?`<tr><td colspan="7" class="tc" style="padding:20px;color:var(--muted)">ยังไม่มีหน่วยการเรียนรู้ — กด "เพิ่มหน่วยการเรียนรู้" ด้านล่าง</td></tr>`:
        epUnits.map((u,i)=>`<tr>
          <td class="tc">${i+1}</td>
          <td><textarea class="cell-in" rows="3" style="resize:vertical;white-space:normal;overflow-wrap:break-word;min-height:36px" placeholder="ชื่อหน่วยการเรียนรู้" onchange="saveEplUnit('${u.id}',{unit_name:this.value})">${esc(u.unit_name)}</textarea></td>
          <td>${renderIndCell(u)}</td>
          <td><input class="cell-in num" type="number" value="${u.hours||0}" min="0" onchange="saveEplUnit('${u.id}',{hours:+this.value||0})"></td>
          <td><input class="cell-in num" type="number" value="${u.weight||0}" min="0" onchange="saveEplUnit('${u.id}',{weight:+this.value||0})"></td>
          <td><input class="cell-in num" type="number" value="${u.weight_final||0}" min="0" onchange="saveEplUnit('${u.id}',{weight_final:+this.value||0})"></td>
          <td class="tc"><button class="rowdel" title="ลบหน่วย" onclick="delEplUnit('${u.id}','${escJs(u.unit_name||'หน่วยที่ '+(i+1))}')">✕</button></td>
        </tr>`).join('')}
        <tr style="font-weight:700;background:var(--card2)">
          <td colspan="3" style="text-align:right;padding-right:14px">รวมหน่วยการเรียนรู้</td>
          <td class="tc" style="color:${sumHours===(+sub.total_hours||0)?'var(--ok-txt)':'var(--err-txt)'}">${sumHours}${sumHours===(+sub.total_hours||0)?' ✓':' (ต้อง = '+(+sub.total_hours||0)+')'}</td>
          <td class="tc" style="color:${betweenWithMid===targetBetween?'var(--ok-txt)':'var(--err-txt)'}" title="หน่วยฯ ${sumWeight} + คะแนนสอบกลางภาค ${mid} = ${betweenWithMid}">${betweenWithMid}${betweenWithMid===targetBetween?' ✓':' (ต้อง = '+targetBetween+')'}</td>
          <td class="tc" style="color:${sumWeightFinal===targetFinal?'var(--ok-txt)':'var(--err-txt)'}" title="คะแนนสอบปลายภาคที่ตั้งไว้ในแท็บ &quot;สัดส่วนคะแนน&quot; = ${targetFinal}">${sumWeightFinal}${sumWeightFinal===targetFinal?' ✓':' (ต้อง = '+targetFinal+')'}</td>
          <td></td>
        </tr>
        <tr style="font-weight:700;background:var(--card2)">
          <td colspan="3" style="text-align:right;padding-right:14px">รวมคะแนนประเมินผล</td>
          <td colspan="3" class="tc" style="font-size:14px;color:${grand===100?'var(--ok-txt)':'var(--err-txt)'}">${grand}${grand===100?' ✓':' (ต้อง = 100)'}</td>
          <td></td>
        </tr>
        <tr style="display:${betweenWithMid!==targetBetween?'table-row':'none'}">
          <td colspan="7" style="padding:8px 14px;font-size:12px;color:var(--err-txt)">${_ico.warning} คะแนนระหว่างภาครวม (หน่วยการเรียนรู้ ${sumWeight} + คะแนนสอบกลางภาค ${mid} = ${betweenWithMid}) ไม่ตรงกับคะแนนก่อนกลางภาค+กลางภาค+หลังกลางภาคที่ตั้งไว้ในแท็บ <a href="javascript:void(0)" onclick="swTab('epl','epl-ratio')" style="color:inherit;text-decoration:underline;font-weight:600">"สัดส่วนคะแนน"</a> (${targetBetween}) — แก้ไขคะแนนระหว่างภาคของแต่ละหน่วยด้านบน คะแนนสอบกลางภาคที่หน้าบันทึกคะแนน หรือปรับโครงสร้างคะแนนในแท็บสัดส่วนคะแนนให้ตรงกัน</td>
        </tr>
        <tr style="display:${sumWeightFinal!==targetFinal?'table-row':'none'}">
          <td colspan="7" style="padding:8px 14px;font-size:12px;color:var(--err-txt)">${_ico.warning} คะแนนสอบปลายภาครวมจากหน่วยการเรียนรู้ (${sumWeightFinal}) ไม่ตรงกับคะแนนปลายภาคที่ตั้งไว้ในแท็บ <a href="javascript:void(0)" onclick="swTab('epl','epl-ratio')" style="color:inherit;text-decoration:underline;font-weight:600">"สัดส่วนคะแนน"</a> (${targetFinal}) — แก้ไขคะแนนปลายภาคของแต่ละหน่วยด้านบน หรือปรับคะแนนปลายภาคในแท็บสัดส่วนคะแนนให้ตรงกัน</td>
        </tr>
        </tbody>
      </table></div>
      <button class="btn bs" style="margin-top:10px" onclick="addEplUnit()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>เพิ่มหน่วยการเรียนรู้</button>
    </div>
  </div>`;
}
function renderIndCell(u){
  const ids=epUnitInd[u.id]||[];
  const inds=ids.map(id=>(_indicatorsAll||[]).find(x=>x.id===id)).filter(Boolean);
  return`<div>
    ${inds.map(ind=>`<div class="ind-detail">
      <div class="ind-detail-head">
        <span class="ind-detail-code">${esc(ind.indicator_code)}</span>
        <button onclick="rmEplUnitIndicator('${u.id}',${ind.id})" title="เอาออก">✕</button>
      </div>
      <div class="ind-detail-text">${esc(ind.indicator_text)}</div>
    </div>`).join('')}
    <button class="btn bs btn-sm" style="padding:3px 8px;margin-top:2px" onclick="openIndPicker('${u.id}')">+ เพิ่มตัวชี้วัด</button>
  </div>`;
}
async function saveEplUnit(id,patch){
  try{
    await q(sb.from('eval_plan_units').update(patch).eq('id',id));
    const u=epUnits.find(x=>x.id===id); if(u) Object.assign(u,patch);
    const tab=$('epl-units'); if(tab) tab.innerHTML=renderEplUnitsTab();
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
}
async function addEplUnit(){
  loading(true);
  try{
    const seq=epUnits.length?Math.max(...epUnits.map(u=>u.seq||0))+1:1;
    const inserted=await q(sb.from('eval_plan_units').insert({subject_id:S.selSub,seq,unit_name:'',hours:0,weight:0,weight_final:0}).select('*'));
    epUnits.push(inserted[0]);
    const tab=$('epl-units'); if(tab) tab.innerHTML=renderEplUnitsTab();
  }catch(e){ toast('เพิ่มหน่วยไม่สำเร็จ: '+e.message,'er'); }
  finally{ loading(false); }
}
function delEplUnit(id,name){
  confirm2({title:'ลบหน่วยการเรียนรู้',msg:'ต้องการลบหน่วย "<strong>'+name+'</strong>"? ตัวชี้วัดที่ผูกไว้จะถูกเอาออกด้วย',type:'danger',confirmText:'ลบเลย',cancelText:'ยกเลิก',onConfirm:async()=>{
    loading(true);
    try{
      await q(sb.from('eval_plan_units').delete().eq('id',id));
      epUnits=epUnits.filter(u=>u.id!==id);
      delete epUnitInd[id];
      const utab=$('epl-units'); if(utab) utab.innerHTML=renderEplUnitsTab();
      const rtab=$('epl-ratio'); if(rtab) rtab.innerHTML=renderEplRatioTab();
      toast('ลบเรียบร้อย');
    }catch(e){ toast('ลบไม่สำเร็จ: '+e.message,'er'); }
    finally{ loading(false); }
  }});
}

// ── ตัวเลือกตัวชี้วัด (จากคลัง indicators กรองตามกลุ่มสาระ/ระดับชั้น/ประเภทวิชา) ──
function _epPickBasePool(sub){
  const g=String(sub.grade_level||'');
  const stype=sub.subject_type||'รายวิชาพื้นฐาน';
  return (_indicatorsAll||[]).filter(ind=>{
    if(sub.subject_group && ind.subject_group!==sub.subject_group) return false;
    if(ind.subject_type!==stype) return false;
    if(g){
      // "ม.4-6" คือการรวมมาตรฐานช่วงชั้นตอนปลายตามเอกสารหลักสูตรมัธยมศึกษาต้นฉบับ — ยังผูกกับคำนำหน้า ม. โดยเฉพาะ
      const grOk = ind.grade_level===GRADE_PREFIX+g || (GRADE_PREFIX==='ม.' && ['4','5','6'].includes(g) && ind.grade_level==='ม.4-6');
      if(!grOk) return false;
    }
    return true;
  });
}
function openIndPicker(unitId){
  _epPickUnit=unitId; _epPickSearch='';
  const sub=S.subjects.find(s=>s.id===S.selSub)||{};
  // ค่าเริ่มต้น: เริ่มออกแบบหน่วยจากตัวชี้วัด "ปลายทาง" ก่อนเสมอถ้ามี (ตามแนวทาง backward design) — ถ้าไม่มี (เช่นวิชาเพิ่มเติมที่มีแต่ "ผลการเรียนรู้") ค่อย fallback
  const kindsPresent=new Set(_epPickBasePool(sub).map(i=>i.kind));
  _epPickKind = kindsPresent.has('ปลายทาง') ? 'ปลายทาง' : (kindsPresent.has('ผลการเรียนรู้') ? 'ผลการเรียนรู้' : '');
  document.body.insertAdjacentHTML('beforeend',`
  <div class="mo" id="indPickMod"><div class="md md-lg">
    <div class="mh"><div class="mt">เลือกตัวชี้วัด — ${esc(sub.subject_group||'ไม่ระบุกลุ่มสาระ')} ม.${esc(String(sub.grade_level||''))}</div>
      <button class="mx" onclick="rmModal('indPickMod')">✕</button></div>
    <div class="mb">
      <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;align-items:flex-end">
        <div style="min-width:170px">
          <label class="fl">ประเภทตัวชี้วัด</label>
          <select class="fs" id="ind-pick-kind" onchange="_epPickKindChange(this.value)">
            <option value="" ${_epPickKind===''?'selected':''}>ทั้งหมด</option>
            <option value="ปลายทาง" ${_epPickKind==='ปลายทาง'?'selected':''}>ปลายทาง</option>
            <option value="ระหว่างทาง" ${_epPickKind==='ระหว่างทาง'?'selected':''}>ระหว่างทาง</option>
            <option value="ผลการเรียนรู้" ${_epPickKind==='ผลการเรียนรู้'?'selected':''}>ผลการเรียนรู้</option>
          </select>
        </div>
        <input class="fi" placeholder="ค้นหารหัสหรือข้อความตัวชี้วัด..." autocomplete="off" oninput="_epPickFilter(this.value)" style="flex:1;min-width:200px">
      </div>
      <div id="ind-pick-list">${renderIndPickList()}</div>
    </div>
    <div class="mf"><button class="btn bp" onclick="rmModal('indPickMod')">เสร็จสิ้น</button></div>
  </div></div>`);
}
function _epPickFilter(v){
  _epPickSearch=v;
  const el=$('ind-pick-list'); if(el) el.innerHTML=renderIndPickList();
}
function _epPickKindChange(v){
  _epPickKind=v;
  const el=$('ind-pick-list'); if(el) el.innerHTML=renderIndPickList();
}
function renderIndPickList(){
  const sub=S.subjects.find(s=>s.id===S.selSub)||{};
  const pool=_epPickBasePool(sub).filter(ind=>!_epPickKind||ind.kind===_epPickKind);
  const kw=(_epPickSearch||'').trim().toLowerCase();
  const filtered = kw ? pool.filter(ind=>ind.indicator_code.toLowerCase().includes(kw)||ind.indicator_text.toLowerCase().includes(kw)||(ind.standard_code||'').toLowerCase().includes(kw)) : pool;
  if(!filtered.length) return `<div class="empty" style="padding:24px">ไม่พบตัวชี้วัดที่ตรงกับตัวกรอง — ลองปรับประเภทตัวชี้วัดหรือคำค้นหา</div>`;
  const selected=new Set(epUnitInd[_epPickUnit]||[]);
  return filtered.map(ind=>`
    <label class="ind-pick-row">
      <input type="checkbox" ${selected.has(ind.id)?'checked':''} onchange="toggleEplUnitIndicator('${_epPickUnit}',${ind.id},this.checked)">
      <div style="min-width:0;flex:1">
        <div style="font-size:12px;font-weight:700;color:var(--ac)">${esc(ind.indicator_code)} <span class="badge ${_kindBadgeCls(ind.kind)}" style="margin-left:4px">${esc(ind.kind)}</span></div>
        <div style="font-size:12.5px;color:var(--txt2);margin-top:2px">${esc(ind.indicator_text)}</div>
      </div>
    </label>`).join('');
}
async function toggleEplUnitIndicator(unitId,indId,checked){
  try{
    if(checked){
      await q(sb.from('eval_plan_unit_indicators').insert({unit_id:unitId,indicator_id:indId}));
      if(!epUnitInd[unitId]) epUnitInd[unitId]=[];
      epUnitInd[unitId].push(indId);
    }else{
      await q(sb.from('eval_plan_unit_indicators').delete().eq('unit_id',unitId).eq('indicator_id',indId));
      if(epUnitInd[unitId]) epUnitInd[unitId]=epUnitInd[unitId].filter(x=>x!==indId);
    }
    const tab=$('epl-units'); if(tab) tab.innerHTML=renderEplUnitsTab();
    const rtab=$('epl-ratio'); if(rtab) rtab.innerHTML=renderEplRatioTab();
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
}
function rmEplUnitIndicator(unitId,indId){ toggleEplUnitIndicator(unitId,indId,false); }

// ── TAB 2: สัดส่วนคะแนน ────────────────────────────────────────────
function renderEplRatioTab(){
  const sub=S.subjects.find(s=>s.id===S.selSub)||{};
  const bef=+sub.score_before_mid||0, mid=+sub.score_mid||0, aft=+sub.score_after_mid||0, fin=+sub.score_final||0;
  const totScore=bef+mid+aft+fin;
  const between=bef+mid+aft;
  const k=+sub.knowledge_ratio||0, p=+sub.skill_ratio||0, a=+sub.moral_ratio||0;
  return`
  <div class="card">
    <div class="ch"><div class="ct">1. สัดส่วนคะแนนระหว่างภาค : ปลายภาค</div></div>
    <div class="cb">
      <div class="score-box" style="margin-top:0">
        <div class="score-box-title">โครงสร้างคะแนน (รวม = <span id="epl-tot" style="color:${totScore===100?'var(--ok)':'var(--err)'}">${totScore}</span> / 100)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div><label class="fl">ก่อนกลางภาค</label><input type="number" class="fi" id="epl-sbm" value="${bef}" min="0" max="100" oninput="_eplUpdTot()"></div>
          <div><label class="fl">กลางภาค</label><input type="number" class="fi" id="epl-sm" value="${mid}" min="0" max="100" oninput="_eplUpdTot()"></div>
          <div><label class="fl">หลังกลางภาค</label><input type="number" class="fi" id="epl-sam" value="${aft}" min="0" max="100" oninput="_eplUpdTot()"></div>
          <div><label class="fl">ปลายภาค</label><input type="number" class="fi" id="epl-sf" value="${fin}" min="0" max="100" oninput="_eplUpdTot()"></div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="kpa-tag"><span class="kpa-dot" style="background:var(--ac)"></span>ระหว่างภาค <strong>${between}</strong></span>
        <span class="ratio-sep">:</span>
        <span class="kpa-tag"><span class="kpa-dot" style="background:var(--warn)"></span>ปลายภาค <strong>${fin}</strong></span>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">2. สัดส่วนคะแนน ด้านความรู้ : ทักษะ/กระบวนการ : คุณธรรม</div></div>
    <div class="cb">
      <div class="ratio-row">
        <span class="kpa-tag"><span class="kpa-dot" style="background:#007AFF"></span>ความรู้ (K)</span>
        <input class="ratio-in" id="epl-k" value="${k}" oninput="_eplUpdKpa()">
        <span class="ratio-sep">:</span>
        <span class="kpa-tag"><span class="kpa-dot" style="background:#34C759"></span>ทักษะ (P)</span>
        <input class="ratio-in" id="epl-p" value="${p}" oninput="_eplUpdKpa()">
        <span class="ratio-sep">:</span>
        <span class="kpa-tag"><span class="kpa-dot" style="background:#FF9500"></span>คุณธรรม (A)</span>
        <input class="ratio-in" id="epl-a" value="${a}" oninput="_eplUpdKpa()">
        <span class="ratio-pill ${k+p+a===100?'pill-ok':'pill-warn'}" id="epl-kpa-pill">รวม ${k+p+a}${k+p+a===100?' ✓':' — ต้องเท่ากับ 100'}</span>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">3. ตารางแสดงสัดส่วนคะแนน</div><span style="font-size:11.5px;color:var(--muted)">แบ่งตามช่วงเวลาสอบ</span></div>
    <div class="cb">${renderKpaMatrix(sub)}
      <div style="margin-top:10px;display:flex;justify-content:flex-end">
        <button class="btn bp" onclick="saveEplRatioAll()">บันทึกสัดส่วนคะแนน (ข้อ 1-3)</button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><div class="ct">4. ตารางแสดงน้ำหนักคะแนนรายตัวชี้วัด</div><span style="font-size:11.5px;color:var(--muted)">อ้างอิงจากหน่วยการเรียนรู้ในแท็บแรก</span></div>
    <div class="cb">${renderIndicatorScoreTable()}</div>
  </div>

  <div class="summary-strip">
    <div class="cell"><div class="v">${k}%</div><div class="l">ด้านความรู้ (K)</div></div>
    <div class="cell"><div class="v">${p}%</div><div class="l">ด้านทักษะ (P)</div></div>
    <div class="cell"><div class="v">${a}%</div><div class="l">ด้านคุณธรรม (A)</div></div>
    <div class="cell"><div class="v">${totScore}</div><div class="l">คะแนนรวมทั้งหมด</div></div>
  </div>`;
}
function _eplUpdTot(){
  const t=['epl-sbm','epl-sm','epl-sam','epl-sf'].reduce((a,i)=>a+(+$(i)?.value||0),0);
  const el=$('epl-tot'); if(el){ el.textContent=t; el.style.color=t===100?'var(--ok)':'var(--err)'; }
}
function _eplUpdKpa(){
  const k=+$('epl-k').value||0,p=+$('epl-p').value||0,a=+$('epl-a').value||0;
  const pill=$('epl-kpa-pill'); const t=k+p+a;
  if(pill){ pill.textContent='รวม '+t+(t===100?' ✓':' — ต้องเท่ากับ 100'); pill.className='ratio-pill '+(t===100?'pill-ok':'pill-warn'); }
}
// คอลัมน์แต่ละช่วงเวลาในตารางนี้ต้องรวมได้เท่ากับคะแนนเต็มของช่วงนั้นตามโครงสร้างคะแนน (การ์ดที่ 1) เสมอ — ไม่งั้นคะแนนรวมทั้งวิชาจะเกิน/ขาดจาก 100
function _eplKpaPeriods(sub){
  return[
    {key:'before_mid',label:'ก่อนกลางภาค',target:+sub.score_before_mid||0},
    {key:'mid',label:'กลางภาค',target:+sub.score_mid||0},
    {key:'after_mid',label:'หลังกลางภาค',target:+sub.score_after_mid||0},
    {key:'final',label:'ปลายภาค',target:+sub.score_final||0},
  ];
}
// แถว K/P/A ในตารางนี้ต้องรวมได้เท่ากับสัดส่วน K:P:A ของการ์ดที่ 2 เสมอ
function _eplKpaRows(sub){
  return[
    {k:'k',label:'ความรู้ (K)',color:'#007AFF',target:+sub.knowledge_ratio||0},
    {k:'p',label:'ทักษะ/กระบวนการ (P)',color:'#34C759',target:+sub.skill_ratio||0},
    {k:'a',label:'คุณธรรมฯ (A)',color:'#FF9500',target:+sub.moral_ratio||0},
  ];
}
function renderKpaMatrix(sub){
  const periods=_eplKpaPeriods(sub);
  const rows=_eplKpaRows(sub);
  const val=(pk,rk)=>+sub['kpa_'+pk+'_'+rk]||0;
  const colTotal=pk=>rows.reduce((s,r)=>s+val(pk,r.k),0);
  const rowTotal=rk=>periods.reduce((s,p)=>s+val(p.key,rk),0);
  const grandTarget=periods.reduce((s,p)=>s+p.target,0);
  const grand=periods.reduce((s,p)=>s+colTotal(p.key),0);
  const allMatch=periods.every(p=>colTotal(p.key)===p.target)&&rows.every(r=>rowTotal(r.k)===r.target);
  return`<div class="tw"><table>
    <thead><tr><th class="tl">คุณลักษณะ</th>${periods.map(p=>`<th>${p.label}<br><span style="font-size:10px;font-weight:400;opacity:.65">(เต็ม ${p.target})</span></th>`).join('')}<th>รวม</th></tr></thead>
    <tbody>
      ${rows.map(r=>`<tr>
        <td class="tl"><span class="kpa-tag"><span class="kpa-dot" style="background:${r.color}"></span>${r.label}</span></td>
        ${periods.map(p=>`<td><input class="cell-in num" type="number" id="epl-kpa-${p.key}-${r.k}" value="${val(p.key,r.k)}" oninput="_eplKpaMatrixTouch()"></td>`).join('')}
        <td class="tc" style="font-weight:700;color:${rowTotal(r.k)===r.target?'var(--ok)':'var(--err)'}" id="epl-kpa-row-${r.k}">${rowTotal(r.k)}</td>
      </tr>`).join('')}
      <tr style="font-weight:700;background:var(--card2)">
        <td class="tl">รวม</td>
        ${periods.map(p=>`<td class="tc" id="epl-kpa-col-${p.key}" style="color:${colTotal(p.key)===p.target?'var(--ok)':'var(--err)'}">${colTotal(p.key)}</td>`).join('')}
        <td class="tc" id="epl-kpa-grand" style="color:${grand===grandTarget?'var(--ok)':'var(--err)'}">${grand}</td>
      </tr>
    </tbody>
  </table></div>
  <div id="epl-kpa-warn" style="margin-top:8px;font-size:12px;color:var(--err);display:${allMatch?'none':'block'}">
    ${_ico.warning} ผลรวมแต่ละช่วงเวลาต้องเท่ากับคะแนนเต็มของช่วงนั้น (${periods.map(p=>p.label+' '+p.target).join(' / ')} รวม ${grandTarget}) และผลรวมแต่ละคุณลักษณะต้องเท่ากับสัดส่วน K:P:A ในข้อ 2 (${rows.map(r=>r.label+' '+r.target).join(' / ')}) — แก้ให้ตรงก่อนถึงจะบันทึกได้
  </div>`;
}
function _eplKpaMatrixTouch(){
  const sub=S.subjects.find(s=>s.id===S.selSub)||{};
  const periods=_eplKpaPeriods(sub), rows=_eplKpaRows(sub);
  let grand=0, grandTarget=0, allMatch=true;
  rows.forEach(r=>{
    let rt=0; periods.forEach(p=>{ rt+=+$('epl-kpa-'+p.key+'-'+r.k)?.value||0; });
    if(rt!==r.target) allMatch=false;
    const el=$('epl-kpa-row-'+r.k); if(el){ el.textContent=rt; el.style.color=rt===r.target?'var(--ok)':'var(--err)'; }
  });
  periods.forEach(p=>{
    let ct=0; rows.forEach(r=>{ ct+=+$('epl-kpa-'+p.key+'-'+r.k)?.value||0; });
    grand+=ct; grandTarget+=p.target;
    if(ct!==p.target) allMatch=false;
    const el=$('epl-kpa-col-'+p.key); if(el){ el.textContent=ct; el.style.color=ct===p.target?'var(--ok)':'var(--err)'; }
  });
  const gEl=$('epl-kpa-grand'); if(gEl){ gEl.textContent=grand; gEl.style.color=grand===grandTarget?'var(--ok)':'var(--err)'; }
  const warnEl=$('epl-kpa-warn'); if(warnEl) warnEl.style.display=allMatch?'none':'block';
}
// บันทึกทั้ง 3 ส่วนของแท็บสัดส่วนคะแนนพร้อมกันในปุ่มเดียว (โครงสร้างคะแนน / สัดส่วน K:P:A / ตารางแบ่งตามช่วงเวลาสอบ)
// ตรวจสอบไขว้กันทั้งหมดจากค่าที่กำลังกรอกอยู่ (ยังไม่บันทึก) เพื่อความสอดคล้องกันก่อนเขียนลงฐานข้อมูลจริง
async function saveEplRatioAll(){
  const bef=+$('epl-sbm').value||0, mid=+$('epl-sm').value||0, aft=+$('epl-sam').value||0, fin=+$('epl-sf').value||0;
  const k=+$('epl-k').value||0, p=+$('epl-p').value||0, a=+$('epl-a').value||0;
  if(bef+mid+aft+fin!==100){ toast('ข้อ 1: คะแนนรวมต้องเท่ากับ 100 (ตอนนี้ '+(bef+mid+aft+fin)+')','er'); return; }
  if(k+p+a!==100){ toast('ข้อ 2: สัดส่วน K:P:A ต้องรวมเท่ากับ 100 (ตอนนี้ '+(k+p+a)+')','er'); return; }

  const periods=_eplKpaPeriods({score_before_mid:bef,score_mid:mid,score_after_mid:aft,score_final:fin});
  const rows=_eplKpaRows({knowledge_ratio:k,skill_ratio:p,moral_ratio:a});
  const patch={score_before_mid:bef,score_mid:mid,score_after_mid:aft,score_final:fin,knowledge_ratio:k,skill_ratio:p,moral_ratio:a};
  const colTotals=Object.fromEntries(periods.map(pp=>[pp.key,0]));
  const rowTotals=Object.fromEntries(rows.map(r=>[r.k,0]));
  periods.forEach(pp=>rows.forEach(r=>{
    const v=+$('epl-kpa-'+pp.key+'-'+r.k)?.value||0;
    patch['kpa_'+pp.key+'_'+r.k]=v;
    colTotals[pp.key]+=v;
    rowTotals[r.k]+=v;
  }));
  const colMismatch=periods.filter(pp=>colTotals[pp.key]!==pp.target);
  const rowMismatch=rows.filter(r=>rowTotals[r.k]!==r.target);
  if(colMismatch.length||rowMismatch.length){
    const parts=[];
    if(colMismatch.length) parts.push(colMismatch.map(pp=>pp.label+' ('+colTotals[pp.key]+'/'+pp.target+')').join(', '));
    if(rowMismatch.length) parts.push(rowMismatch.map(r=>r.label+' ('+rowTotals[r.k]+'/'+r.target+')').join(', '));
    toast('ข้อ 3: ผลรวมยังไม่ตรง: '+parts.join(' — '),'er');
    return;
  }
  loading(true);
  try{
    await q(sb.from('subjects').update(patch).eq('id',S.selSub));
    invalidateSubjects(); await loadSubjects();
    toast('บันทึกสัดส่วนคะแนนเรียบร้อย');
    const tab=$('epl-ratio'); if(tab) tab.innerHTML=renderEplRatioTab();
    const utab=$('epl-units'); if(utab) utab.innerHTML=renderEplUnitsTab();
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
  finally{ loading(false); }
}
// รวมน้ำหนักคะแนนของทุกหน่วยการเรียนรู้ที่ผูกกับตัวชี้วัดนี้ (ใช้เทียบกับผลรวม K+P+A รายตัวชี้วัด)
function _indicatorUnitWeight(indId){
  return epUnits.reduce((sum,u)=>((epUnitInd[u.id]||[]).includes(indId)?sum+(+u.weight||0):sum),0);
}
function renderIndicatorScoreTable(){
  const sub=S.subjects.find(s=>s.id===S.selSub)||{};
  const idSet=new Set();
  Object.values(epUnitInd).forEach(arr=>arr.forEach(id=>idSet.add(id)));
  const ids=[...idSet];
  if(!ids.length) return `<div class="empty" style="padding:20px">ยังไม่มีตัวชี้วัดที่ผูกกับหน่วยการเรียนรู้ — ไปที่แท็บ "หน่วยการเรียนรู้ &amp; มาตรฐาน" เพื่อเพิ่มตัวชี้วัด</div>`;
  const rows=ids.map(id=>{
    const ind=(_indicatorsAll||[]).find(x=>x.id===id);
    const sc=epIndScores.find(x=>x.indicator_id===id)||{score_k:0,score_p:0,score_a:0,score_mid:0,score_final:0};
    return {ind,sc};
  }).filter(r=>r.ind).sort((a,b)=>a.ind.indicator_code.localeCompare(b.ind.indicator_code,'th'));
  const fields=['score_k','score_p','score_a','score_mid','score_final'];
  const totals={score_k:0,score_p:0,score_a:0,score_mid:0,score_final:0};
  rows.forEach(r=>fields.forEach(f=>totals[f]+=+r.sc[f]||0));
  // เป้าหมายอ้างอิงจากตารางแสดงสัดส่วนคะแนน (ข้อ 3): คะแนนเก็บ K/P/A มาจากช่วงก่อนกลาง+หลังกลางภาครวมกัน กลางภาค/ปลายภาคมาจากคอลัมน์นั้นตรงๆ
  const targets={
    score_k:(+sub.kpa_before_mid_k||0)+(+sub.kpa_after_mid_k||0),
    score_p:(+sub.kpa_before_mid_p||0)+(+sub.kpa_after_mid_p||0),
    score_a:(+sub.kpa_before_mid_a||0)+(+sub.kpa_after_mid_a||0),
    score_mid:(+sub.kpa_mid_k||0)+(+sub.kpa_mid_p||0)+(+sub.kpa_mid_a||0),
    score_final:(+sub.kpa_final_k||0)+(+sub.kpa_final_p||0)+(+sub.kpa_final_a||0),
  };
  const fieldLabel={score_k:'คะแนนเก็บ (K)',score_p:'คะแนนเก็บ (P)',score_a:'คะแนนเก็บ (A)',score_mid:'กลางภาค',score_final:'ปลายภาค'};
  const mismatched=fields.filter(f=>totals[f]!==targets[f]);
  return`<div class="tw"><table>
    <thead><tr>
      <th class="tl" style="min-width:170px">ตัวชี้วัด</th>
      ${fields.map(f=>`<th>${fieldLabel[f]}<br><span style="font-size:10px;font-weight:400;opacity:.65">(เต็ม ${targets[f]})</span></th>`).join('')}
      <th>รวม</th>
    </tr></thead>
    <tbody>
    ${rows.map(({ind,sc})=>{
      const rowTot=fields.reduce((s,f)=>s+(+sc[f]||0),0);
      const kpaSum=(+sc.score_k||0)+(+sc.score_p||0)+(+sc.score_a||0);
      const unitWeight=_indicatorUnitWeight(ind.id);
      const rowOk=kpaSum===unitWeight;
      return`<tr>
        <td class="tl" title="${esc(ind.indicator_text)}">${esc(ind.indicator_code)}</td>
        ${fields.map(f=>`<td><input class="cell-in num" type="number" value="${sc[f]||0}" onchange="saveEplIndScore(${ind.id},{${f}:+this.value||0})"></td>`).join('')}
        <td class="tc" style="font-weight:700;color:${rowOk?'var(--ok-txt)':'var(--err-txt)'}" title="น้ำหนักคะแนนจากหน่วยการเรียนรู้ (คะแนนเก็บ K+P+A ต้องรวมได้ ${unitWeight})">${rowTot}${rowOk?' ✓':' (หน่วย='+unitWeight+')'}</td>
      </tr>`;
    }).join('')}
    <tr style="font-weight:700;background:var(--card2)">
      <td class="tl">รวมคะแนน</td>
      ${fields.map(f=>`<td class="tc" style="color:${totals[f]===targets[f]?'var(--ok)':'var(--err)'}">${totals[f]}</td>`).join('')}
      <td class="tc">${fields.reduce((s,f)=>s+totals[f],0)}</td>
    </tr>
    </tbody>
  </table></div>
  <div style="margin-top:8px;font-size:12px;color:var(--err);display:${mismatched.length?'block':'none'}">
    ${_ico.warning} ผลรวม ${mismatched.map(f=>fieldLabel[f]+' ('+totals[f]+'/'+targets[f]+')').join(', ')} ยังไม่ตรงกับตารางแสดงสัดส่วนคะแนน (ข้อ 3)
  </div>
  <div style="margin-top:6px;font-size:12px;color:var(--err);display:${rows.some(({ind,sc})=>((+sc.score_k||0)+(+sc.score_p||0)+(+sc.score_a||0))!==_indicatorUnitWeight(ind.id))?'block':'none'}">
    ${_ico.warning} คะแนนเก็บ (K+P+A) ของบางตัวชี้วัดยังไม่ตรงกับน้ำหนักคะแนนที่ตั้งไว้ในตารางหน่วยการเรียนรู้ — ดูช่อง "รวม" สีแดงในตารางด้านบน
  </div>`;
}
async function saveEplIndScore(indId,patch){
  try{
    const existing=epIndScores.find(x=>x.indicator_id===indId);
    const row=Object.assign({subject_id:S.selSub,indicator_id:indId,
      score_k:existing?.score_k||0,score_p:existing?.score_p||0,score_a:existing?.score_a||0,
      score_mid:existing?.score_mid||0,score_final:existing?.score_final||0,note:existing?.note||''},patch);
    const saved=await q(sb.from('eval_plan_indicator_scores').upsert(row,{onConflict:'subject_id,indicator_id'}).select('*'));
    if(existing) Object.assign(existing,patch); else epIndScores.push(saved[0]);
    const tab=$('epl-ratio'); if(tab) tab.innerHTML=renderEplRatioTab();
  }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'er'); }
}

// ── พิมพ์ / ส่งออก Excel ────────────────────────────────────────
// สร้าง <thead> แบบ 2 แถว จาก headRows ของ buildEvalPlanUnitRows() — "น้ำหนักคะแนน" ครอบ 2 คอลัมน์ย่อย
function _evalUnitTheadHTML(headRows){
  let h='<tr>';
  headRows[0].forEach((label,j)=>{
    if(j===5) return; // ถูกรวมเข้ากับ colspan ของคอลัมน์ก่อนหน้าแล้ว
    if(j===4){ h+=`<th colspan="2">${esc(String(label))}</th>`; return; }
    h+=`<th rowspan="2">${esc(String(label))}</th>`;
  });
  h+='</tr><tr>';
  headRows[1].slice(4).forEach(label=>{ h+=`<th>${esc(String(label))}</th>`; });
  h+='</tr>';
  return h;
}
// สร้าง <td> ของแถว "รวมคะแนนประเมินผล" (แถวสุดท้ายจาก buildEvalPlanUnitRows) — ผสานช่องคะแนนรวมเป็นช่องเดียวกว้าง 3 คอลัมน์ (เวลา/ระหว่างภาค/ปลายภาค)
function _evalUnitGrandRowHTML(row){
  return `<td class="l" colspan="3">${esc(String(row[0]))}</td><td colspan="3">${esc(String(row[3]))}</td>`;
}
// headRows: 2 แถวหัวตาราง (แถวบนมี "น้ำหนักคะแนน" ครอบคอลัมน์ ระหว่างภาค/ปลายภาค)
// rows: ข้อมูลหน่วยการเรียนรู้ ตามด้วย 2 แถวสรุปท้ายตาราง (รวมหน่วยการเรียนรู้ / รวมคะแนนประเมินผล)
function buildEvalPlanUnitRows(){
  const sub=getSubject(S.selSub)||{};
  const headRows=[
    ['ที่','ชื่อหน่วยการเรียนรู้','มาตรฐานการเรียนรู้ / ตัวชี้วัด','เวลา (ชม.)','น้ำหนักคะแนน',''],
    ['','','','','ระหว่างภาค','ปลายภาค'],
  ];
  const rows=[];
  let sumHours=0,sumWeight=0,sumWeightFinal=0;
  epUnits.forEach((u,i)=>{
    const codes=(epUnitInd[u.id]||[]).map(id=>{
      const ind=(_indicatorsAll||[]).find(x=>x.id===id);
      return ind?`${ind.indicator_code} — ${ind.indicator_text}`:null;
    }).filter(Boolean).join('\n');
    sumHours+=+u.hours||0; sumWeight+=+u.weight||0; sumWeightFinal+=+u.weight_final||0;
    rows.push([i+1,u.unit_name||'',codes,u.hours||0,u.weight||0,u.weight_final||0]);
  });
  const mid=+sub.score_mid||0;
  rows.push(['','รวมหน่วยการเรียนรู้','',sumHours,sumWeight,sumWeightFinal]);
  rows.push(['รวมคะแนนประเมินผล','','',sumWeight+mid+sumWeightFinal,'','']);
  return {headRows,rows};
}
function buildEvalPlanKpaRows(){
  const sub=getSubject(S.selSub)||{};
  const periods=[{key:'before_mid',label:'ก่อนกลางภาค'},{key:'mid',label:'กลางภาค'},{key:'after_mid',label:'หลังกลางภาค'},{key:'final',label:'ปลายภาค'}];
  const rowsDef=[{k:'k',label:'ความรู้ (K)'},{k:'p',label:'ทักษะ/กระบวนการ (P)'},{k:'a',label:'คุณธรรมฯ (A)'}];
  const val=(pk,rk)=>+sub['kpa_'+pk+'_'+rk]||0;
  const h=['คุณลักษณะ',...periods.map(p=>p.label),'รวม'];
  const rows=[h];
  rowsDef.forEach(r=>{
    const vals=periods.map(p=>val(p.key,r.k));
    rows.push([r.label,...vals,vals.reduce((a,b)=>a+b,0)]);
  });
  const colTotals=periods.map(p=>rowsDef.reduce((s,r)=>s+val(p.key,r.k),0));
  rows.push(['รวม',...colTotals,colTotals.reduce((a,b)=>a+b,0)]);
  return rows;
}
function buildEvalPlanIndicatorRows(){
  const idSet=new Set();
  Object.values(epUnitInd).forEach(arr=>arr.forEach(id=>idSet.add(id)));
  const h=['ตัวชี้วัด','คะแนนเก็บ (K)','คะแนนเก็บ (P)','คะแนนเก็บ (A)','กลางภาค','ปลายภาค','รวม'];
  const rows=[h];
  const fields=['score_k','score_p','score_a','score_mid','score_final'];
  const totals={score_k:0,score_p:0,score_a:0,score_mid:0,score_final:0};
  [...idSet].map(id=>{
    const ind=(_indicatorsAll||[]).find(x=>x.id===id);
    const sc=epIndScores.find(x=>x.indicator_id===id)||{};
    return {ind,sc};
  }).filter(r=>r.ind).sort((a,b)=>a.ind.indicator_code.localeCompare(b.ind.indicator_code,'th')).forEach(({ind,sc})=>{
    const vals=fields.map(f=>+sc[f]||0);
    vals.forEach((v,i)=>totals[fields[i]]+=v);
    rows.push([ind.indicator_code,...vals,vals.reduce((a,b)=>a+b,0)]);
  });
  rows.push(['รวมคะแนน',...fields.map(f=>totals[f]),fields.reduce((s,f)=>s+totals[f],0)]);
  return rows;
}
function exportEvalPlan(){
  const sub=getSubject(S.selSub); if(!sub){ toast('ไม่พบรายวิชา','er'); return; }
  const head=[
    [`${S.config.school_name||''} — แผนการวัดและประเมินผล`],
    [`วิชา ${sub.subject_name} (${sub.subject_code}) ${grm(sub.grade_level,sub.room)}  ครู${sub.teacher_name||''}`],
    [`ปีการศึกษา ${S.config.academic_year} ภาคเรียนที่ ${S.config.semester}`],
    []
  ];
  const unitBuilt=buildEvalPlanUnitRows();
  const hr0=head.length, hr1=head.length+1;
  const grandRow=head.length+unitBuilt.headRows.length+unitBuilt.rows.length-1;
  exportExcel([
    {name:'หน่วยการเรียนรู้',aoa:[...head,...unitBuilt.headRows,...unitBuilt.rows],colWidths:[6,26,60,10,12,12],
      merges:[
        {s:{r:hr0,c:0},e:{r:hr1,c:0}},{s:{r:hr0,c:1},e:{r:hr1,c:1}},{s:{r:hr0,c:2},e:{r:hr1,c:2}},{s:{r:hr0,c:3},e:{r:hr1,c:3}},
        {s:{r:hr0,c:4},e:{r:hr0,c:5}},
        {s:{r:grandRow,c:0},e:{r:grandRow,c:2}},{s:{r:grandRow,c:3},e:{r:grandRow,c:5}},
      ]},
    {name:'สัดส่วนคะแนน',aoa:[...head,...buildEvalPlanKpaRows()],colWidths:[22,14,14,14,14,12]},
    {name:'น้ำหนักตัวชี้วัด',aoa:[...head,...buildEvalPlanIndicatorRows()],colWidths:[18,12,12,12,10,10,10]},
  ],`แผนการวัดและประเมินผล_${sub.subject_code}_ม${sub.grade_level}-${sub.room}.xlsx`);
}
function printEvalPlan(){
  const sub=getSubject(S.selSub); if(!sub){ toast('ไม่พบรายวิชา','er'); return; }
  const e2=v=>esc(String(v));

  const unitBuilt=buildEvalPlanUnitRows();
  const unitRows=unitBuilt.rows;
  let p1='<div style="page-break-after:always">';
  p1+='<h3 style="margin-bottom:6px">หน่วยการเรียนรู้ มาตรฐานการเรียนรู้ และสัดส่วนคะแนนประเมินผล</h3>';
  p1+=`<div class="meta" style="margin-bottom:8px">วิชา ${esc(sub.subject_name)} (${esc(sub.subject_code)}) ${grm(sub.grade_level,sub.room)} &nbsp; ครู ${esc(sub.teacher_name||'')}</div>`;
  p1+='<table><thead>'+_evalUnitTheadHTML(unitBuilt.headRows)+'</thead><tbody>';
  unitRows.forEach((row,i)=>{
    const isFoot=i>=unitRows.length-2;
    const isGrand=i===unitRows.length-1;
    p1+=`<tr${isFoot?' style="font-weight:700;background:#f5f5f5"':''}>`;
    if(isGrand) p1+=_evalUnitGrandRowHTML(row);
    else row.forEach((v,j)=>{p1+=`<td class="${j===1||j===2?'l':''}"${j===2?' style="white-space:pre-line"':''}>${e2(v)}</td>`;});
    p1+='</tr>';
  });
  p1+='</tbody></table></div>';

  const kpaRows=buildEvalPlanKpaRows();
  const between=(+sub.score_before_mid||0)+(+sub.score_mid||0)+(+sub.score_after_mid||0);
  const fin=+sub.score_final||0;
  let p2='<div>';
  p2+='<h3 style="margin-bottom:6px">สัดส่วนคะแนน</h3>';
  p2+=`<div class="meta" style="margin-bottom:8px">วิชา ${esc(sub.subject_name)} (${esc(sub.subject_code)}) ${grm(sub.grade_level,sub.room)}</div>`;
  p2+=`<div class="meta" style="margin-bottom:4px">ระหว่างภาค : ปลายภาค = ${between} : ${fin} &nbsp;&nbsp;|&nbsp;&nbsp; ความรู้(K) : ทักษะ(P) : คุณธรรม(A) = ${+sub.knowledge_ratio||0} : ${+sub.skill_ratio||0} : ${+sub.moral_ratio||0}</div>`;
  p2+='<table><thead><tr>';
  kpaRows[0].forEach(h=>{p2+=`<th>${e2(h)}</th>`;});
  p2+='</tr></thead><tbody>';
  for(let i=1;i<kpaRows.length;i++){
    const isFoot=i===kpaRows.length-1;
    p2+=`<tr${isFoot?' style="font-weight:700;background:#f5f5f5"':''}>`;
    kpaRows[i].forEach((v,j)=>{p2+=`<td class="${j===0?'l':''}">${e2(v)}</td>`;});
    p2+='</tr>';
  }
  p2+='</tbody></table></div>';

  const indRows=buildEvalPlanIndicatorRows();
  let p3='<div>';
  p3+='<h3 style="margin-bottom:6px">น้ำหนักคะแนนรายตัวชี้วัด</h3>';
  p3+=`<div class="meta" style="margin-bottom:8px">วิชา ${esc(sub.subject_name)} (${esc(sub.subject_code)}) ${grm(sub.grade_level,sub.room)}</div>`;
  p3+='<table><thead><tr>';
  indRows[0].forEach(h=>{p3+=`<th>${e2(h)}</th>`;});
  p3+='</tr></thead><tbody>';
  for(let i=1;i<indRows.length;i++){
    const isFoot=i===indRows.length-1;
    p3+=`<tr${isFoot?' style="font-weight:700;background:#f5f5f5"':''}>`;
    indRows[i].forEach((v,j)=>{p3+=`<td class="${j===0?'l':''}">${e2(v)}</td>`;});
    p3+='</tr>';
  }
  p3+='</tbody></table></div>';

  const styleTag='<style>.ep-print td{vertical-align:top}</style>';
  printHTML(`แผนการวัดและประเมินผล — ${sub.subject_name} ${grm(sub.grade_level,sub.room)}`, styleTag+'<div class="ep-print">'+p1+p2+p3+'</div>', 'portrait');
}
// 7. REPORT
// ════════════════════════════════════════════════════════════════
async function pgReport(){
  if(!S.subjects.length){$('pg').innerHTML=`<div class="card"><div class="empty"><svg class="ei" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#c7c7cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><div>ยังไม่มีรายวิชา</div></div></div>`;return;}
  if(!S.selSub) S.selSub=S.subjects[0].id;
  loading(true);
  const sub=getSubject(S.selSub);
  const [stus,sumRows,erRows,ecRows,attRows]=await Promise.all([
    getStudentsBySubject(S.selSub),
    qc('sc_sum_'+S.selSub,  ()=>q(sb.from('score_summary').select('*').eq('subject_id',S.selSub))),
    qc('ev_read_'+S.selSub, ()=>q(sb.from('eval_read').select('*').eq('subject_id',S.selSub))),
    qc('ev_char_'+S.selSub, ()=>q(sb.from('eval_char').select('*').eq('subject_id',S.selSub))),
    qc('att_sum_'+S.selSub, ()=>qAll(()=>sb.from('attendance').select('student_id,status,periods,year_month,date_day').eq('subject_id',S.selSub)))
  ]);
  loading(false);
  const sumMap=Object.fromEntries(sumRows.map(s=>[s.student_id,s]));
  const erMap=Object.fromEntries(erRows.map(e=>[e.student_id,e]));
  const ecMap=Object.fromEntries(ecRows.map(e=>[e.student_id,e]));
  // calc att summary
  const attMap={};
  const totalH=attHeldHours(attRows);
  stus.forEach(s=>{attMap[s.id]={attended:0,totalH,pct:0,ms:false};});
  attRows.forEach(a=>{
    if(!attMap[a.student_id])attMap[a.student_id]={attended:0,totalH,pct:0,ms:false};
    if(a.status!=='absent')attMap[a.student_id].attended+=(parseInt(a.periods)||1);
  });
  Object.values(attMap).forEach(m=>{m.pct=m.totalH>0?Math.round(m.attended/m.totalH*100):0;m.ms=m.totalH>0&&m.pct<80;});
  // เก็บไว้ใน state เพื่อให้ export ใช้ได้
  S._rpt={sub,stus,sumMap,erMap,ecMap,attMap};
  // stats — filter เฉพาะนักเรียนในห้องจริง
  const stuIds=new Set(stus.map(s=>String(s.id)));
  const stuSumRows=sumRows.filter(s=>stuIds.has(String(s.student_id)));
  const pass=stuSumRows.filter(s=>s.grade!=null&&s.grade!==''&&parseFloat(s.grade)>0).length;
  const avg=stuSumRows.length>0?(stuSumRows.reduce((a,b)=>a+(parseFloat(b.total_score)||0),0)/stuSumRows.length).toFixed(1):0;
  const gradeCount={4:0,3.5:0,3:0,2.5:0,2:0,1.5:0,1:0,0:0};
  stuSumRows.forEach(s=>{const g=parseFloat(s.grade);if(gradeCount[g]!==undefined)gradeCount[g]++;});
  const pct=stus.length>0?((pass/stus.length)*100).toFixed(1):0;

  $('pg').innerHTML=`
  <div class="ph"><div class="ptitle">รายงานผลการเรียน</div>
    <div style="display:flex;gap:8px">
      <button class="btn bs no-print" onclick="exportReport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>Excel</button>
      <button class="btn bs no-print" onclick="printReport()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>พิมพ์</button>
    </div></div>
  <div style="display:flex;gap:10px;margin-bottom:18px" class="no-print">
    <select class="fs" style="max-width:310px" onchange="changeRptSub(this.value)">
      ${S.subjects.map(s=>`<option value="${s.id}" ${s.id===S.selSub?'selected':''}>${s.subject_name} ${grm(s.grade_level,s.room)}</option>`).join('')}
    </select>
  </div>
  <div class="sg no-print">
    <div class="sc"><div class="si" style="background:linear-gradient(135deg,#34aadc,#007AFF)"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="sv">${stus.length}</div><div class="sl">นักเรียน</div></div></div>
    <div class="sc"><div class="si" style="background:linear-gradient(135deg,#34c759,#28a745)"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="sv">${pass}<small style="font-size:13px"> (${pct}%)</small></div><div class="sl">ผ่าน</div></div></div>
    <div class="sc"><div class="si" style="background:linear-gradient(135deg,#ff453a,#dc2626)"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><div><div class="sv">${stus.length-pass}</div><div class="sl">ไม่ผ่าน</div></div></div>
    <div class="sc"><div class="si" style="background:linear-gradient(135deg,#bf5af2,#9b59b6)"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div><div class="sv">${avg}</div><div class="sl">คะแนนเฉลี่ย</div></div></div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="ch"><div>
      <div class="ct">สรุปผลการเรียนรายบุคคล</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:2px">${esc(sub?.subject_name||'')} (${esc(sub?.subject_code||'')}) ${grm(sub?.grade_level||0,sub?.room||0)} ครู${esc(sub?.teacher_name||'')}</div>
    </div></div>
    <div class="cb"><div class="tw"><table>
      <thead><tr>
        <th>เลขที่</th><th class="tl">ชื่อ-สกุล</th>
        <th>รวมก่อนกลาง</th><th>รวมหลังกลาง</th><th>กลางภาค</th><th>ปลายภาค</th>
        <th>รวม</th><th>ผลการเรียน</th><th>ผลพิเศษ</th>
        <th>เวลาเรียน</th><th>อ่าน/คิด/เขียน</th><th>คุณลักษณะ</th>
      </tr></thead>
      <tbody>${stus.map((s,i)=>{
        const sm=sumMap[s.id]||{};
        const er=erMap[s.id]||{};
        const ec=ecMap[s.id]||{};
        const att=attMap[s.id]||{pct:0,ms:false};
        const g=sm.grade??'-';
        return`<tr>
          <td class="tc">${i+1}</td><td style="white-space:nowrap">${esc(s.student_name)}</td>
          <td class="tr2">${sm.total_before_mid??0}</td>
          <td class="tr2">${sm.total_after_mid??0}</td>
          <td class="tr2">${sm.mid_normal??0}</td>
          <td class="tr2">${sm.final_score??0}</td>
          <td class="tr2">${sm.total_score??0}</td>
          <td class="tc"><span class="${gcls(g)}" style="font-size:15px;font-weight:700">${g}</span></td>
          <td class="tc">${sm.special_result?`<span class="badge bg-r">${esc(sm.special_result)}</span>`:`<span class="badge bg-g">ปกติ</span>`}</td>
          <td class="tc"><span class="badge ${att.ms?'bg-r':'bg-g'}">${att.pct}%${att.ms?' (มส)':''}</span></td>
          <td class="tc"><span class="badge bg-b">${elb(er.result)}</span></td>
          <td class="tc"><span class="badge bg-b">${elb(ec.overall_result)}</span></td>
        </tr>`;
      }).join('')}
      </tbody></table></div></div>
  </div>
  <div class="card no-print">
    <div class="ch"><div class="ct">การกระจายผลการเรียน</div></div>
    <div class="cb"><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;padding:8px 0">
      ${[[4,'#1a6e37'],[3.5,'#2a7a44'],[3,'#2d72d2'],[2.5,'#4a90d9'],
         [2,'#e6940a'],[1.5,'#c0810a'],[1,'#c0392b'],[0,'#922b21']].map(([grade,color])=>{
        const cnt=gradeCount[grade]||0;
        const p=stus.length>0?Math.round(cnt/stus.length*100):0;
        return`<div style="text-align:center;min-width:52px">
          <div style="height:${Math.max(4,p*1.4)}px;background:#555;border-radius:4px;margin-bottom:4px;min-height:4px"></div>
          <div style="font-size:14px;font-weight:700;color:${color}">${grade}</div>
          <div style="font-size:11px;color:var(--muted)">${cnt} คน (${p}%)</div>
        </div>`;}).join('')}
    </div></div>
  </div>`;
}
async function changeRptSub(sid){S.selSub=sid;await pgReport();}

function exportReport(){
  if(!S._rpt){toast('ไม่มีข้อมูลรายงาน','er');return;}
  const {sub,stus,sumMap,erMap,ecMap,attMap}=S._rpt;
  const h=['เลขที่','รหัส','ชื่อ-สกุล',
    `ก่อนกลาง(${sub.score_before_mid})`,`หลังกลาง(${sub.score_after_mid})`,
    `กลางภาค(${sub.score_mid})`,`ปลายภาค(${sub.score_final})`,
    'รวม(100)','ผลการเรียน','ผลพิเศษ','เวลาเรียน(%)','สถานะเวลา','อ่าน/คิด/เขียน','คุณลักษณะ'];
  const aoa=[
    [`${S.config.school_name||''} — รายงานผลการเรียน`],
    [`วิชา ${sub.subject_name} (${sub.subject_code}) ${grm(sub.grade_level,sub.room)}  ครู${sub.teacher_name||''}`],
    [`ปีการศึกษา ${S.config.academic_year} ภาคเรียนที่ ${S.config.semester}`],
    [],
    h
  ];
  stus.forEach((s,i)=>{
    const sm=sumMap[s.id]||{}, er=erMap[s.id]||{}, ec=ecMap[s.id]||{}, att=attMap[s.id]||{};
    aoa.push([i+1,s.student_code,s.student_name,
      sm.total_before_mid??0,sm.total_after_mid??0,sm.mid_normal??0,sm.final_score??0,
      sm.total_score??0,sm.grade??'',sm.special_result||'',
      (att.pct??0)+'%',att.ms?'มส':'ปกติ',elb(er.result),elb(ec.overall_result)]);
  });
  exportExcel([{name:'รายงานผล',aoa,colWidths:[6,10,28,14,14,12,12,10,8,10,12,10,14,14]}],
    `รายงานผล_${sub.subject_code}_ม${sub.grade_level}-${sub.room}.xlsx`);
}

function printReport(){
  if(!S._rpt){toast('ไม่มีข้อมูล','er');return;}
  const {sub,stus,sumMap,erMap,ecMap,attMap}=S._rpt;
  const cfg=S.config||{};
  const schoolName=cfg.school_name||'';
  const _elb=v=>{const n=parseInt(v);return[0,1,2,3].includes(n)?String(n):'-';};
  const _gcol=g=>{const n=parseFloat(g);if(n>=3.5)return'#15803d';if(n>=2.5)return'#0284c7';if(n>=1.5)return'#e6940a';if(n>=1)return'#c0392b';return'#922b21';};

  let rows='';
  stus.forEach((s,i)=>{
    const sm=sumMap[s.id]||{};
    const er=erMap[s.id]||{};
    const ec=ecMap[s.id]||{};
    const att=attMap[s.id]||{pct:0,ms:false};
    const g=sm.grade??'-';
    const gCol=parseFloat(g)>0?_gcol(g):'#555';
    rows+=`<tr>
      <td>${i+1}</td>
      <td class="l">${esc(s.student_name)}</td>
      <td>${sm.total_before_mid??0}</td>
      <td>${sm.total_after_mid??0}</td>
      <td>${sm.mid_normal??0}</td>
      <td>${sm.final_score??0}</td>
      <td>${sm.total_score??0}</td>
      <td style="color:${gCol}">${g}</td>
      <td>${sm.special_result||'-'}</td>
      <td>${att.pct}%${att.ms?' <span style="color:#c0392b">(มส)</span>':''}</td>
      <td>${_elb(er.result)}</td>
      <td>${_elb(ec.overall_result)}</td>
    </tr>`;
  });

  const w=window.open('','_blank');
  if(!w){toast('เบราว์เซอร์บล็อก Popup — กรุณาอนุญาต Popup แล้วลองใหม่','er');return;}
  w.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8"><title>รายงานผลการเรียน — ${esc(sub.subject_name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      @page{size:A4 landscape;margin:1cm;}
      *{box-sizing:border-box;}
      body{margin:0;padding:0;background:#fff;font-family:'Sarabun','TH SarabunNew','Noto Sans Thai',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      #pbody{width:100%;padding:0;background:#fff;font-size:13px;color:#000;line-height:1.5;}
      .ph{text-align:center;margin-bottom:8px;border-bottom:2px solid #000;padding-bottom:6px;}
      .ph h1{font-size:16px;font-weight:800;margin:0 0 2px;}
      .ph h2{font-size:13px;font-weight:600;margin:0 0 2px;}
      .meta{font-size:11.5px;color:#444;}
      table{width:100%;border-collapse:collapse;margin-top:6px;}
      thead{display:table-header-group;}
      tr{page-break-inside:avoid;}
      th,td{border:1px solid #666;padding:4px 5px;font-size:11.5px;text-align:center;font-family:'Sarabun','TH SarabunNew',sans-serif;}
      th{font-weight:700;background:#f0f0f0;}
      td.l{text-align:left;padding-left:6px;white-space:nowrap;}
      .action-bar{display:flex;gap:10px;justify-content:center;padding:14px;margin-top:20px;background:#f5f5f7;border-radius:10px;position:sticky;bottom:0;}
      .btn-print{padding:9px 22px;font-size:14px;cursor:pointer;font-family:'Sarabun',sans-serif;border:none;border-radius:10px;background:#1d1d1f;color:#fff;font-weight:600;}
      @media print{.action-bar{display:none!important;}}
    </style></head><body>
    <div id="pbody">
      <div class="ph">
        <h1>${esc(schoolName)}</h1>
        <h2>รายงานผลการเรียน — ${esc(sub.subject_name)} (${esc(sub.subject_code)}) ${grm(sub.grade_level,sub.room)}</h2>
        <div class="meta">ครูผู้สอน: ${esc(sub.teacher_name||'')} &nbsp;|&nbsp; ปีการศึกษา ${esc(cfg.academic_year||'')} ภาคเรียนที่ ${esc(cfg.semester||'')} &nbsp;|&nbsp; นักเรียน ${stus.length} คน</div>
      </div>
      <table>
        <thead><tr>
          <th style="width:32px">ที่</th>
          <th class="l">ชื่อ-สกุล</th>
          <th>รวมก่อนกลาง<br>(${sub.score_before_mid||0})</th>
          <th>รวมหลังกลาง<br>(${sub.score_after_mid||0})</th>
          <th>กลางภาค<br>(${sub.score_mid||0})</th>
          <th>ปลายภาค<br>(${sub.score_final||0})</th>
          <th>รวม<br>(100)</th>
          <th>ผลการเรียน</th>
          <th>ผลพิเศษ</th>
          <th>เวลาเรียน</th>
          <th>อ่าน/คิด/เขียน</th>
          <th>คุณลักษณะ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="action-bar">
      <button class="btn-print" onclick="document.fonts.ready.then(()=>window.print())"><svg style="vertical-align:-.15em" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> พิมพ์</button>
    </div>
    </body></html>`);
  w.document.close();
}

function _buildPP5Body(sub,cfg,stus,sumMap,erMap,ecMap,scUnitsAll,attRows,attMap,totH){
  const schoolName=schoolNameWithPrefix(cfg.school_name);
  const mBef=sub.score_before_mid||25, mAft=sub.score_after_mid||25;
  const mM=sub.score_mid||20, mF=sub.score_final||30;
  const ph=(title,pn,tp)=>`<div class="ph"><h1>${esc(schoolName)}</h1><h2>${esc(title)}</h2><div class="meta">ปีการศึกษา ${esc(cfg.academic_year||'')} ภาคเรียนที่ ${esc(cfg.semester||'')}</div></div><div class="m2">วิชา ${esc(sub.subject_name)} (${esc(sub.subject_code)}) ${grm(sub.grade_level,sub.room)} &nbsp; ครูผู้สอน ${esc(sub.teacher_name||'')}${tp>1?' &nbsp; <strong>(หน้า '+pn+'/'+tp+')</strong>':''}</div>`;
  const elb=v=>{const n=parseInt(v);return[0,1,2,3].includes(n)?String(n):'-';};
  let body='';

  // ── 1. ปก ปพ.5 ─── สร้าง HTML โดยตรงจากข้อมูล ────────────────
  const totalN=stus.length;
  const stuIds=new Set(stus.map(s=>String(s.id)));
  const gc={4:0,3.5:0,3:0,2.5:0,2:0,1.5:0,1:0,0:0};let rC=0,msC=0;
  Object.entries(sumMap).forEach(([sid,s])=>{if(!stuIds.has(String(sid)))return;const g=parseFloat(s.grade);if(gc[g]!==undefined)gc[g]++;if(s.special_result==='ร')rC++;if(s.special_result==='มส')msC++;});
  const cvErLv={3:0,2:0,1:0,0:0};let cvErTotal=0;
  Object.entries(erMap).filter(([sid])=>stuIds.has(String(sid))).forEach(([,e])=>{cvErTotal++;const v=parseInt(e.result);if(v in cvErLv)cvErLv[v]++;});
  const cvEcLv={3:0,2:0,1:0,0:0};let cvEcTotal=0;
  Object.entries(ecMap).filter(([sid])=>stuIds.has(String(sid))).forEach(([,e])=>{cvEcTotal++;const v=parseInt(e.overall_result);if(v in cvEcLv)cvEcLv[v]++;});
  const cvPct=n=>totalN>0?(n/totalN*100).toFixed(2):'';
  const cvTh=(c,ex='')=>`<td style="border:1px solid #000;padding:3px 4px;text-align:center;font-size:11px;font-weight:600;background:#f0f0f0;${ex}">${c}</td>`;
  const cvTd=(c,ex='')=>`<td style="border:1px solid #000;padding:4px;text-align:center;font-size:12px;${ex}">${c}</td>`;
  body+=`<div class="cv sec"><div style="border:1.5px solid #333;padding:12px 18px 14px;font-family:'Sarabun','TH SarabunNew',sans-serif;background:#fff;position:relative;min-height:270mm">
<div style="position:absolute;top:10px;right:16px;font-size:12px;font-weight:700;letter-spacing:.5px">ปพ. 5</div>
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin:8px 0 10px;text-align:center"><img src="${cfg.logo_url||'/assets/logo.webp'}" alt="ตราโรงเรียน" style="height:80px;width:auto;object-fit:contain;display:block;margin:0 auto" onerror="this.style.display='none'"></div>
<div style="text-align:center;font-size:16px;font-weight:700;margin-bottom:10px">แบบบันทึกผลการเรียนประจำรายวิชา</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px;table-layout:fixed"><colgroup><col style="width:150px"><col><col style="width:80px"><col></colgroup>
<tr><td style="padding:4px 6px">โรงเรียน</td><td colspan="3" style="padding:4px 6px;border-bottom:1px solid #666">${esc(schoolNameOnly(cfg.school_name))}</td></tr>
<tr><td style="padding:4px 6px">อำเภอ/เขต</td><td style="padding:4px 6px;border-bottom:1px solid #666">${esc(cfg.school_district||'')}</td><td style="padding:4px 6px">จังหวัด</td><td style="padding:4px 6px;border-bottom:1px solid #666">${esc(cfg.school_province||'')}</td></tr>
<tr><td style="padding:4px 6px">ชั้นมัธยมศึกษาปีที่</td><td style="padding:4px 6px;border-bottom:1px solid #666">${sub.grade_level}</td><td style="padding:4px 6px">ห้อง</td><td style="padding:4px 6px;border-bottom:1px solid #666">${+sub.room===0?'':sub.room}</td></tr>
<tr><td style="padding:4px 6px">ภาคเรียนที่</td><td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${cfg.semester||''}</td><td style="padding:4px 6px;white-space:nowrap">ปีการศึกษา</td><td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${cfg.academic_year||''}</td></tr>
<tr><td style="padding:4px 6px">รหัสวิชา</td><td style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.subject_code)}</td><td style="padding:4px 6px;white-space:nowrap">รายวิชา</td><td style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.subject_name)}</td></tr>
<tr><td style="padding:4px 6px">ประเภท</td><td colspan="3" style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.subject_type||'')}</td></tr>
<tr><td style="padding:4px 6px">หน่วยกิต</td><td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${sub.credits}</td><td style="padding:4px 6px;white-space:nowrap">เวลาเรียน</td><td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${sub.total_hours} ชม./ภาค (${sub.hours_per_week} ชม./สัปดาห์)</td></tr>
<tr><td style="padding:4px 6px">ครูผู้สอน</td><td colspan="3" style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.teacher_name||'')}</td></tr>
</table>
<div style="font-size:13px;font-weight:700;margin:6px 0 4px">สรุปผลการประเมิน</div>
<table style="width:100%;border-collapse:collapse;border:1px solid #666;font-size:13px;margin-bottom:5px"><thead><tr style="background:#efefef">
${cvTh('จำนวน<br>นักเรียน','vertical-align:middle;font-size:11px;')}${[4,3.5,3,2.5,2,1.5,1,0].map(g=>cvTh(g,'font-size:13px;font-weight:700;')).join('')}${cvTh('ร','font-size:13px;font-weight:700;')}${cvTh('มส','font-size:13px;font-weight:700;')}
</tr></thead><tbody>
<tr>${cvTd(totalN,'font-weight:600;')}${[4,3.5,3,2.5,2,1.5,1,0].map(g=>cvTd(gc[g]||'')).join('')}${cvTd(rC||'')}${cvTd(msC||'')}</tr>
<tr style="background:#fafafa">${cvTd('ร้อยละ','font-size:13px;color:#555;')}${[4,3.5,3,2.5,2,1.5,1,0].map(g=>cvTd(cvPct(gc[g]),'font-size:13px;')).join('')}${cvTd(cvPct(rC),'font-size:13px;')}${cvTd(cvPct(msC),'font-size:13px;')}</tr>
</tbody></table>
<table style="width:100%;border-collapse:collapse;border:1px solid #666;font-size:13px;margin-bottom:12px"><thead><tr style="background:#efefef">
${cvTh('รายการประเมิน','text-align:left;padding-left:6px;font-size:11.5px;')}${cvTh('จำนวน','font-size:13px;')}${cvTh('ดีเยี่ยม (3)','font-size:13px;')}${cvTh('ดี (2)','font-size:13px;')}${cvTh('ผ่าน (1)','font-size:13px;')}${cvTh('ไม่ผ่าน (0)','font-size:13px;')}
</tr></thead><tbody>
<tr><td style="border:1px solid #666;padding:4px 6px;font-size:13px">การอ่าน คิดวิเคราะห์ และเขียน</td>${cvTd(cvErTotal||'')}${[3,2,1,0].map(v=>cvTd(cvErLv[v]?(cvErLv[v]+(cvErTotal>0?' ('+(cvErLv[v]/cvErTotal*100).toFixed(1)+'%)':'')):'','font-size:13px;')).join('')}</tr>
<tr><td style="border:1px solid #666;padding:4px 6px;font-size:13px">คุณลักษณะอันพึงประสงค์</td>${cvTd(cvEcTotal||'')}${[3,2,1,0].map(v=>cvTd(cvEcLv[v]?(cvEcLv[v]+(cvEcTotal>0?' ('+(cvEcLv[v]/cvEcTotal*100).toFixed(1)+'%)':'')):'','font-size:13px;')).join('')}</tr>
</tbody></table>
<div style="font-size:13px;font-weight:700;margin-bottom:8px">การอนุมัติผลการเรียน</div>
<div style="text-align:center;font-size:13px;margin-bottom:48px"><div style="margin-bottom:2px">ลงชื่อ …………………………………………………</div><div style="margin-bottom:2px">(${esc(sub.teacher_name||'…………………………………………………')})</div><div style="font-size:12px">ครูผู้สอน</div></div>
<div style="display:flex;justify-content:space-around;font-size:13px;margin-bottom:22px">
<div style="flex:1;text-align:center"><div style="margin-bottom:2px">ลงชื่อ …………………………………………</div><div style="margin-bottom:2px">(${esc(sub.head_of_group||'........................................')})</div><div style="font-size:12px">หัวหน้ากลุ่มสาระการเรียนรู้</div></div>
<div style="flex:1;text-align:center"><div style="margin-bottom:2px">ลงชื่อ …………………………………………</div><div style="margin-bottom:2px">(${esc(cfg.head_registrar||'........................................')})</div><div style="font-size:12px">หัวหน้างานทะเบียนวัดผล</div></div>
<div style="flex:1;text-align:center"><div style="margin-bottom:2px">ลงชื่อ …………………………………………</div><div style="margin-bottom:2px">(${esc(cfg.head_academic||'........................................')})</div><div style="font-size:12px">หัวหน้างานวิชาการ</div></div>
</div>
<div style="display:flex;justify-content:space-around;font-size:13px;margin-top:16px">
<div style="flex:1;text-align:center"><div style="margin-bottom:48px;text-align:left;padding-left:32px">เรียน เสนอมาเพื่อโปรดพิจารณา</div><div style="margin-bottom:2px">ลงชื่อ …………………………………………</div><div style="margin-bottom:2px">(${esc(cfg.vice_director||'……………………………………………')})</div><div style="font-size:12px">รองผู้อำนวยการโรงเรียน${esc(schoolNameOnly(cfg.school_name))}</div></div>
<div style="flex:1;text-align:center"><div style="margin-bottom:48px"><span style="font-size:18px">☐</span> อนุมัติ &nbsp;&nbsp; <span style="font-size:18px">☐</span> ไม่อนุมัติ</div><div style="margin-bottom:2px">ลงชื่อ …………………………………………</div><div style="margin-bottom:2px">(${esc(cfg.director_name||'……………………………………………')})</div><div style="font-size:12px">ผู้อำนวยการโรงเรียน${esc(schoolNameOnly(cfg.school_name))}</div><div style="font-size:11.5px;margin-top:4px">วันที่ ……… เดือน …………………………………… พ.ศ. ………</div></div>
</div>
</div></div>`;

  // ── 2. บันทึกเวลาเรียน ──────────────────────────────────────
  const mMap={};
  attRows.forEach(a=>{ const ym=String(a.year_month||'').trim(); if(!ym)return; if(!mMap[ym]) mMap[ym]={ym,monthName:a.month_name||'',dayMap:{},cells:{}}; const M=mMap[ym]; M.dayMap[a.date_day]=parseInt(a.periods)||1; if(!M.cells[a.student_id]) M.cells[a.student_id]={}; M.cells[a.student_id][a.date_day]=a.status; });
  const aMon=Object.values(mMap).map(M=>({...M,days:Object.keys(M.dayMap).map(d=>({day:parseInt(d),periods:M.dayMap[d]})).sort((a,b)=>a.day-b.day)})).sort((a,b)=>a.ym.localeCompare(b.ym));
  const AABB={present:'/',absent:'ข',leave:'ล'};
  const aCols=[]; aMon.forEach(M=>{ M.days.forEach(d=>{ aCols.push({monthName:M.monthName,day:d.day,periods:d.periods,cells:M.cells}); }); });
  const aCk=[]; if(!aCols.length){ aCk.push([]); } else { for(let i=0;i<aCols.length;i+=15) aCk.push(aCols.slice(i,i+15)); }
  aCk.forEach((cols,ci)=>{
    const isLast=ci===aCk.length-1;
    const mg=[]; cols.forEach(c=>{ if(!mg.length||mg[mg.length-1].name!==c.monthName) mg.push({name:c.monthName,count:1}); else mg[mg.length-1].count++; });
    body+=`<div class="sec pb">${ph('บันทึกเวลาเรียน — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),ci+1,aCk.length)}<div class="m2">เวลาเรียนสะสม (เช็คชื่อแล้ว) ${totH} ชั่วโมง</div><table><thead><tr><th rowspan="2">เลขที่</th><th rowspan="2">รหัส</th><th rowspan="2" class="l">ชื่อ-สกุล</th>`;
    mg.forEach(g=>{ body+=`<th colspan="${g.count}">${esc(g.name)}</th>`; });
    if(isLast) body+=`<th rowspan="2">มา</th><th rowspan="2">ขาด</th><th rowspan="2">ลา</th><th rowspan="2">รวม</th><th rowspan="2">%</th><th rowspan="2">สถานะ</th>`;
    body+=`</tr><tr>`; cols.forEach(c=>{ body+=`<th>${c.day}</th>`; }); body+=`</tr></thead><tbody>`;
    stus.forEach((s,i)=>{
      body+=`<tr><td>${i+1}</td><td>${esc(s.student_code||'')}</td><td class="l">${esc(s.student_name)}</td>`;
      cols.forEach(c=>{ const st=(c.cells[s.id]||{})[c.day]||''; body+=`<td>${st?AABB[st]:''}</td>`; });
      if(isLast){ const m=attMap[s.id]||{present:0,absent:0,leave:0,attended:0,pct:0,ms:false}; body+=`<td>${m.present}</td><td>${m.absent}</td><td>${m.leave}</td><td>${m.attended}</td><td>${m.pct}%</td><td>${m.ms?'มส':'-'}</td>`; }
      body+=`</tr>`;
    });
    body+=`</tbody></table>`;
    if(isLast) body+=`<div class="legend">สัญลักษณ์: / = มา, ข = ขาด, ล = ลา</div>`;
    body+=`</div>`;
  });

  // ── 3. บันทึกคะแนน ──────────────────────────────────────────
  const um={};
  scUnitsAll.forEach(u=>{ const k=`${u.period}_${parseInt(u.unit_number)}`; if(!um[k]) um[k]={period:u.period,unit_number:parseInt(u.unit_number),unit_name:u.unit_name||'',max_score:parseFloat(u.max_score)||20}; });
  const uBef=Object.values(um).filter(u=>u.period==='before').sort((a,b)=>a.unit_number-b.unit_number);
  const uAft=Object.values(um).filter(u=>u.period==='after').sort((a,b)=>a.unit_number-b.unit_number);
  const gscA=(sid,period,un)=>{ const r=scUnitsAll.find(s=>String(s.student_id)===String(sid)&&s.period===period&&parseInt(s.unit_number)===un); return r!=null?parseFloat(r.score):null; };
  const CP=6;
  const befCk=[]; for(let i=0;i<uBef.length;i+=CP) befCk.push(uBef.slice(i,i+CP));
  const aftCk=[]; for(let i=0;i<uAft.length;i+=CP) aftCk.push(uAft.slice(i,i+CP));
  const scCk=[...befCk.map((c,i)=>({cols:c,lB:i===befCk.length-1,lA:false})),...aftCk.map((c,i)=>({cols:c,lB:false,lA:i===aftCk.length-1}))];
  const scTP=scCk.length+1;
  scCk.forEach(({cols,lB,lA},ci)=>{
    const pl=cols[0]?.period==='before'?'ก่อนกลางภาค':'หลังกลางภาค';
    body+=`<div class="sec pb">${ph('บันทึกคะแนน — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),ci+1,scTP)}<h3>บันทึกคะแนนหน่วยการเรียน</h3><table><thead><tr><th rowspan="2">เลขที่</th><th rowspan="2">รหัส</th><th rowspan="2" class="l">ชื่อ-สกุล</th><th colspan="${cols.length}">${pl}</th>`;
    if(lB) body+=`<th rowspan="2">รวมก่อน<br>(/${mBef})</th>`;
    if(lA) body+=`<th rowspan="2">รวมหลัง<br>(/${mAft})</th>`;
    body+=`</tr><tr>`;
    cols.forEach(u=>{ body+=`<th>${u.unit_number}${u.unit_name?'<br><span style="font-size:8px;font-weight:400">'+esc(u.unit_name.slice(0,10))+'</span>':''}<br><span style="font-size:8px;opacity:.6">/${u.max_score}</span></th>`; });
    body+=`</tr></thead><tbody>`;
    stus.forEach((s,i)=>{
      body+=`<tr><td>${i+1}</td><td>${esc(s.student_code||'')}</td><td class="l">${esc(s.student_name)}</td>`;
      cols.forEach(u=>{ const v=gscA(s.id,u.period,u.unit_number); body+=`<td>${v!=null?v:''}</td>`; });
      if(lB){ const t=uBef.reduce((a,u)=>a+(gscA(s.id,'before',u.unit_number)??0),0); body+=`<td><strong>${t||''}</strong></td>`; }
      if(lA){ const t=uAft.reduce((a,u)=>a+(gscA(s.id,'after',u.unit_number)??0),0); body+=`<td><strong>${t||''}</strong></td>`; }
      body+=`</tr>`;
    });
    body+=`</tbody></table></div>`;
  });
  body+=`<div class="sec pb">${ph('บันทึกคะแนน — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),scTP,scTP)}<h3>สรุปคะแนนและผลการเรียน</h3><table><thead><tr><th>เลขที่</th><th>รหัส</th><th class="l">ชื่อ-สกุล</th><th>รวมก่อน<br>(/${mBef})</th><th>รวมหลัง<br>(/${mAft})</th><th>กลางภาค<br>(/${mM})</th><th>รวมระหว่างภาค</th><th>ปลายภาค<br>(/${mF})</th><th>คะแนนรวม<br>(100)</th><th>ผลการเรียน</th></tr></thead><tbody>`;
  stus.forEach((s,i)=>{
    const sm=sumMap[s.id]||{};
    const bef=sm.total_before_mid??uBef.reduce((a,u)=>a+(gscA(s.id,'before',u.unit_number)??0),0);
    const aft=sm.total_after_mid??uAft.reduce((a,u)=>a+(gscA(s.id,'after',u.unit_number)??0),0);
    const mid=parseFloat(sm.mid_normal)||0, fin=parseFloat(sm.final_score)||0;
    const disp=['ร','มส','มผ','ผ'].includes(sm.special_result||'')?sm.special_result:(sm.grade??'-');
    body+=`<tr><td>${i+1}</td><td>${esc(s.student_code||'')}</td><td class="l">${esc(s.student_name)}</td><td>${bef||''}</td><td>${aft||''}</td><td>${mid||''}</td><td>${(parseFloat(bef)+parseFloat(aft)+mid)||''}</td><td>${fin||''}</td><td><strong>${sm.total_score??0}</strong></td><td><strong>${disp}</strong></td></tr>`;
  });
  body+=`</tbody></table></div>`;

  // ── 4. การประเมิน: อ่าน คิด เขียน ──────────────────────────
  body+=`<div class="sec pb">${ph('การประเมิน — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),1,2)}<h3>การอ่าน คิดวิเคราะห์ และเขียน</h3><table><thead><tr><th>เลขที่</th><th>รหัส</th><th class="l">ชื่อ-สกุล</th><th>ครั้ง 1</th><th>ครั้ง 2</th><th>ครั้ง 3</th><th>ครั้ง 4</th><th>ครั้ง 5</th><th>ผลสรุป</th></tr></thead><tbody>`;
  stus.forEach((s,i)=>{ const er=erMap[s.id]||{}; body+=`<tr><td>${i+1}</td><td>${esc(s.student_code||'')}</td><td class="l">${esc(s.student_name)}</td><td>${elb(er.t1)}</td><td>${elb(er.t2)}</td><td>${elb(er.t3)}</td><td>${elb(er.t4)}</td><td>${elb(er.t5)}</td><td><strong>${elb(er.result)}</strong></td></tr>`; });
  body+=`</tbody></table></div>`;

  // ── 5. การประเมิน: คุณลักษณะ ──────────────────────────────────
  body+=`<div class="sec pb">${ph('การประเมิน — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),2,2)}<h3>คุณลักษณะอันพึงประสงค์</h3><table><thead><tr><th>เลขที่</th><th>รหัส</th><th class="l">ชื่อ-สกุล</th>`;
  CHAR8.forEach((_,i)=>{ body+=`<th>ข้อ ${i+1}</th>`; });
  body+=`<th>ผลสรุป</th></tr></thead><tbody>`;
  stus.forEach((s,i)=>{ const ec=ecMap[s.id]||{}; body+=`<tr><td>${i+1}</td><td>${esc(s.student_code||'')}</td><td class="l">${esc(s.student_name)}</td>`; CHAR8.forEach(c=>{ body+=`<td>${elb(ec[c.key])}</td>`; }); body+=`<td><strong>${elb(ec.overall_result)}</strong></td></tr>`; });
  body+=`</tbody></table><div style="margin-top:8px;font-size:9.5px;line-height:1.8;color:#333"><strong>หมายเหตุ</strong><br>`;
  CHAR8.forEach((item,i)=>{ body+=`ข้อที่ ${i+1} ${item.label}<br>`; });
  body+=`</div></div>`;

  // ── 6. รายงานผลการเรียน ──────────────────────────────────────
  const gcl=g=>{const n=parseFloat(g);if(n>=3.5)return'#15803d';if(n>=2.5)return'#0284c7';if(n>=1.5)return'#e6940a';if(n>=1)return'#c0392b';return'#922b21';};
  body+=`<div class="sec pb">${ph('รายงานผลการเรียน — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),1,1)}<h3>สรุปผลการเรียนรายบุคคล</h3><table><thead><tr><th>ที่</th><th class="l">ชื่อ-สกุล</th><th>รวมก่อน<br>(/${mBef})</th><th>รวมหลัง<br>(/${mAft})</th><th>กลางภาค<br>(/${mM})</th><th>ปลายภาค<br>(/${mF})</th><th>รวม<br>(100)</th><th>ผลการเรียน</th><th>ผลพิเศษ</th><th>เวลาเรียน</th><th>อ่าน/คิด</th><th>คุณลักษณะ</th></tr></thead><tbody>`;
  stus.forEach((s,i)=>{ const sm=sumMap[s.id]||{},er=erMap[s.id]||{},ec=ecMap[s.id]||{},att=attMap[s.id]||{pct:0,ms:false},g=sm.grade??'-'; body+=`<tr><td>${i+1}</td><td class="l">${esc(s.student_name)}</td><td>${sm.total_before_mid??0}</td><td>${sm.total_after_mid??0}</td><td>${sm.mid_normal??0}</td><td>${sm.final_score??0}</td><td>${sm.total_score??0}</td><td style="color:${gcl(g)}"><strong>${g}</strong></td><td>${sm.special_result||'-'}</td><td>${att.pct}%${att.ms?' (มส)':''}</td><td>${elb(er.result)}</td><td>${elb(ec.overall_result)}</td></tr>`; });
  body+=`</tbody></table></div>`;

  // ── 7. แผนการวัดและประเมินผล ── ไว้ท้ายเล่มเป็นเอกสารอ้างอิงประกอบ ──
  const evalUnitBuilt=buildEvalPlanUnitRows();
  const evalUnitRows=evalUnitBuilt.rows;
  body+=`<div class="sec pb">${ph('แผนการวัดและประเมินผล — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),1,2)}<h3>หน่วยการเรียนรู้ มาตรฐานการเรียนรู้ และสัดส่วนคะแนนประเมินผล</h3><table><thead>${_evalUnitTheadHTML(evalUnitBuilt.headRows)}</thead><tbody>`;
  evalUnitRows.forEach((row,i)=>{
    const isFoot=i>=evalUnitRows.length-2;
    const isGrand=i===evalUnitRows.length-1;
    body+=`<tr${isFoot?' style="font-weight:700;background:#f5f5f5"':''}>`;
    if(isGrand) body+=_evalUnitGrandRowHTML(row);
    else row.forEach((v,j)=>{ body+=`<td class="${j===1||j===2?'l':''}"${j===2?' style="white-space:pre-line"':''}>${esc(String(v))}</td>`; });
    body+='</tr>';
  });
  body+='</tbody></table></div>';

  const evalKpaRows=buildEvalPlanKpaRows();
  const evalBetween=(+sub.score_before_mid||0)+(+sub.score_mid||0)+(+sub.score_after_mid||0);
  const evalFinal=+sub.score_final||0;
  body+=`<div class="sec pb">${ph('แผนการวัดและประเมินผล — '+sub.subject_name+' '+grm(sub.grade_level,sub.room),2,2)}<h3>สัดส่วนคะแนน</h3><div class="m2">ระหว่างภาค : ปลายภาค = ${evalBetween} : ${evalFinal} &nbsp;&nbsp;|&nbsp;&nbsp; ความรู้(K) : ทักษะ(P) : คุณธรรม(A) = ${+sub.knowledge_ratio||0} : ${+sub.skill_ratio||0} : ${+sub.moral_ratio||0}</div><table><thead><tr>`;
  evalKpaRows[0].forEach(h=>{ body+=`<th>${esc(String(h))}</th>`; });
  body+='</tr></thead><tbody>';
  for(let i=1;i<evalKpaRows.length;i++){
    const isFoot=i===evalKpaRows.length-1;
    body+=`<tr${isFoot?' style="font-weight:700;background:#f5f5f5"':''}>`;
    evalKpaRows[i].forEach((v,j)=>{ body+=`<td class="${j===0?'l':''}">${esc(String(v))}</td>`; });
    body+='</tr>';
  }
  body+='</tbody></table>';

  const evalIndRows=buildEvalPlanIndicatorRows();
  body+='<h3>น้ำหนักคะแนนรายตัวชี้วัด</h3><table><thead><tr>';
  evalIndRows[0].forEach(h=>{ body+=`<th>${esc(String(h))}</th>`; });
  body+='</tr></thead><tbody>';
  for(let i=1;i<evalIndRows.length;i++){
    const isFoot=i===evalIndRows.length-1;
    body+=`<tr${isFoot?' style="font-weight:700;background:#f5f5f5"':''}>`;
    evalIndRows[i].forEach((v,j)=>{ body+=`<td class="${j===0?'l':''}">${esc(String(v))}</td>`; });
    body+='</tr>';
  }
  body+='</tbody></table></div>';

  return body;
}

async function printAllPP5(){
  if(!S.selSub){ toast('กรุณาเลือกรายวิชาก่อน','er'); return; }
  const sub=getSubject(S.selSub);
  if(!sub){ toast('ไม่พบข้อมูลรายวิชา','er'); return; }
  const subId=sub.id;
  const cfg=S.config||{};

  toast('กำลังเตรียมข้อมูล...','in');
  loading(true);
  try{
    const [stus,sumRows,erRows,ecRows,scUnitsAll,attRows]=await Promise.all([
      getStudentsBySubject(subId),
      qc('sc_sum_'+subId,   ()=>q(sb.from('score_summary').select('*').eq('subject_id',subId))),
      qc('ev_read_'+subId,  ()=>q(sb.from('eval_read').select('*').eq('subject_id',subId))),
      qc('ev_char_'+subId,  ()=>q(sb.from('eval_char').select('*').eq('subject_id',subId))),
      qc('sc_units_'+subId, ()=>qAll(()=>sb.from('score_units').select('*').eq('subject_id',subId))),
      qc('att_'+subId,      ()=>qAll(()=>sb.from('attendance').select('*').eq('subject_id',subId))),
      _loadIndicatorsAll(),
      loadEvalPlan(subId)
    ]);
    loading(false);
    const sumMap=Object.fromEntries(sumRows.map(s=>[s.student_id,s]));
    const erMap=Object.fromEntries(erRows.map(e=>[e.student_id,e]));
    const ecMap=Object.fromEntries(ecRows.map(e=>[e.student_id,e]));
    const totH=attHeldHours(attRows);
    const attMap={};
    stus.forEach(s=>{ attMap[s.id]={present:0,absent:0,leave:0,attended:0,pct:0,ms:false}; });
    attRows.forEach(a=>{ if(!attMap[a.student_id]) attMap[a.student_id]={present:0,absent:0,leave:0,attended:0,pct:0,ms:false}; const p=parseInt(a.periods)||1; if(a.status in attMap[a.student_id]) attMap[a.student_id][a.status]+=p; });
    Object.values(attMap).forEach(m=>{ m.attended=m.present+m.leave; m.pct=totH>0?Math.round(m.attended/totH*100):0; m.ms=totH>0&&m.pct<80; });

    const body=_buildPP5Body(sub,cfg,stus,sumMap,erMap,ecMap,scUnitsAll,attRows,attMap,totH);
    const css=`
      @page{size:A4 portrait;margin:12mm 14mm;}
      *{box-sizing:border-box;}
      body{margin:0;padding:0;background:#fff;font-family:'Sarabun','TH SarabunNew','Noto Sans Thai',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:12px;color:#000;line-height:1.4;}
      .sec{padding:0;margin:0;} .pb{page-break-before:always;}
      .ph{text-align:center;margin-bottom:6px;border-bottom:2px solid #000;padding-bottom:5px;}
      .ph h1{font-size:15px;font-weight:800;margin:0 0 2px;} .ph h2{font-size:13px;font-weight:600;margin:0 0 2px;} .ph .meta{font-size:11px;color:#444;margin:0;}
      .m2{font-size:10.5px;color:#444;margin:3px 0;}
      h3{font-size:12px;font-weight:700;margin:8px 0 4px;}
      table{width:100%;border-collapse:collapse;margin-top:4px;} thead{display:table-header-group;} tr{page-break-inside:avoid;}
      .sec:not(.cv) th,.sec:not(.cv) td{border:1px solid #666;padding:2px 3px;font-size:10px;text-align:center;font-family:'Sarabun','TH SarabunNew',sans-serif;}
      .sec:not(.cv) th{font-weight:700;background:#f0f0f0;} .sec:not(.cv) td.l,.sec:not(.cv) th.l{text-align:left;padding-left:5px;white-space:nowrap;}
      .legend{font-size:9.5px;margin-top:4px;color:#555;}
      .action-bar{display:flex;gap:10px;justify-content:center;padding:14px;margin-top:20px;background:#f5f5f7;border-radius:10px;position:sticky;bottom:0;}
      .btn-print{padding:9px 22px;font-size:14px;cursor:pointer;font-family:'Sarabun',sans-serif;border:none;border-radius:10px;background:#1d1d1f;color:#fff;font-weight:600;}
      @media print{.action-bar{display:none!important;}}
    `;
    const w=window.open('','_blank');
    if(!w){ toast('เบราว์เซอร์บล็อก Popup — กรุณาอนุญาต Popup แล้วลองใหม่','er'); return; }
    w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>ปพ.5 ทั้งหมด — ${esc(sub.subject_name)} ${grm(sub.grade_level,sub.room)}</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>${css}</style></head><body><div id="pbody">${body}</div><div class="action-bar"><button class="btn-print" onclick="document.fonts.ready.then(()=>window.print())"><svg style="vertical-align:-.15em" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> พิมพ์ ปพ.5 ทั้งหมด</button></div></body></html>`);
    w.document.close();
  }catch(e){
    loading(false);
    toast('เกิดข้อผิดพลาด: '+(e.message||e),'er');
  }
}

// ════════════════════════════════════════════════════════════════
// 8. COVER
// ════════════════════════════════════════════════════════════════
async function pgCover(){
  if(!S.subjects.length){$('pg').innerHTML=`<div class="card"><div class="empty"><div class="ei"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></div><div>ยังไม่มีรายวิชา</div></div></div>`;return;}
  if(!S.selSub) S.selSub=S.subjects[0].id;
  loading(true);
  const sub=getSubject(S.selSub);
  const [sumRows,erRows,ecRows]=await Promise.all([
    qc('sc_sum_cvr_'+S.selSub,  ()=>q(sb.from('score_summary').select('student_id,grade,special_result').eq('subject_id',S.selSub))),
    qc('ev_read_cvr_'+S.selSub, ()=>q(sb.from('eval_read').select('student_id,result').eq('subject_id',S.selSub))),
    qc('ev_char_cvr_'+S.selSub, ()=>q(sb.from('eval_char').select('student_id,overall_result').eq('subject_id',S.selSub)))
  ]);
  loading(false);
  const cfg=S.config;
  const cvStus=await getStudentsBySubject(S.selSub);
  const totalN=cvStus.length;
  const cvStuIds=new Set(cvStus.map(s=>String(s.id)));

  // ── ระดับผลการเรียน (filter เฉพาะนักเรียนในห้อง) ──
  const gc={4:0,3.5:0,3:0,2.5:0,2:0,1.5:0,1:0,0:0};
  let rC=0,msC=0;
  sumRows.filter(s=>cvStuIds.has(String(s.student_id))).forEach(s=>{
    const g=parseFloat(s.grade);
    if(gc[g]!==undefined) gc[g]++;
    if(s.special_result==='ร')  rC++;
    if(s.special_result==='มส') msC++;
  });

  // ── ประเมินการอ่าน ──
  const erLv={3:0,2:0,1:0,0:0};
  const erFiltered=erRows.filter(e=>cvStuIds.has(String(e.student_id)));
  erFiltered.forEach(e=>{ const v=parseInt(e.result); if(v in erLv) erLv[v]++; });
  const erTotal=erFiltered.length;

  // ── คุณลักษณะ ──
  const ecLv={3:0,2:0,1:0,0:0};
  const ecFiltered=ecRows.filter(e=>cvStuIds.has(String(e.student_id)));
  ecFiltered.forEach(e=>{ const v=parseInt(e.overall_result); if(v in ecLv) ecLv[v]++; });
  const ecTotal=ecFiltered.length;

  const td=(c,ex='')=>`<td style="border:1px solid #000;padding:4px;text-align:center;font-size:12px;${ex}">${c}</td>`;
  const th=(c,ex='')=>`<td style="border:1px solid #000;padding:3px 4px;text-align:center;font-size:11px;font-weight:600;background:#f0f0f0;${ex}">${c}</td>`;
  const pct=(n)=>totalN>0?(n/totalN*100).toFixed(2):'';

  $('pg').innerHTML=`
  <div class="ph no-print"><div class="ptitle">ปก ปพ.5</div>
    <button class="btn bs no-print" onclick="printCover()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>พิมพ์ปก</button>
      <button class="btn no-print" style="background:linear-gradient(135deg,#1d1d1f,#3a3a3c);color:#fff;border:none;font-weight:600" onclick="printAllPP5()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>พิมพ์ทั้งหมด</button></div>
  <div style="display:flex;gap:10px;margin-bottom:14px" class="no-print">
    <select class="fs" style="max-width:310px" onchange="changeCvrSub(this.value)">
      ${S.subjects.map(s=>`<option value="${s.id}" ${s.id===S.selSub?'selected':''}>${s.subject_name} ${grm(s.grade_level,s.room)}</option>`).join('')}
    </select>
  </div>

  <div id="cov-content" style="max-width:210mm;margin:auto">
  <div style="border:1.5px solid #333;padding:12px 18px 14px;font-family:'Sarabun','TH SarabunNew',sans-serif;background:#fff;position:relative;min-height:270mm">

    <!-- ปพ. 5 มุมบนขวา -->
    <div style="position:absolute;top:10px;right:16px;font-size:12px;font-weight:700;letter-spacing:.5px">ปพ. 5</div>

    <!-- ตราโรงเรียน — กึ่งกลาง -->
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin:8px 0 10px;text-align:center">
      <img src="${S.config.logo_url||'/assets/logo.webp'}"
           alt="ตราโรงเรียน"
           style="height:80px;width:auto;object-fit:contain;display:block;margin:0 auto"
           onerror="this.style.display='none'">
    </div>

    <!-- หัวกระดาษ -->
    <div style="text-align:center;font-size:16px;font-weight:700;margin-bottom:10px">แบบบันทึกผลการเรียนประจำรายวิชา</div>

    <!-- ข้อมูลวิชา -->
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px;table-layout:fixed">
      <colgroup><col style="width:150px"><col><col style="width:80px"><col></colgroup>
      <tr><td style="padding:4px 6px">โรงเรียน</td>
          <td colspan="3" style="padding:4px 6px;border-bottom:1px solid #666">${esc(schoolNameOnly(cfg.school_name))}</td></tr>
      <tr><td style="padding:4px 6px">อำเภอ/เขต</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666">${esc(cfg.school_district||'')}</td>
          <td style="padding:4px 6px">จังหวัด</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666">${esc(cfg.school_province||'')}</td></tr>
      <tr><td style="padding:4px 6px">ชั้นมัธยมศึกษาปีที่</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666">${sub.grade_level}</td>
          <td style="padding:4px 6px">ห้อง</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666">${+sub.room===0?'':sub.room}</td></tr>
      <tr><td style="padding:4px 6px">ภาคเรียนที่</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${cfg.semester||''}</td>
          <td style="padding:4px 6px;white-space:nowrap">ปีการศึกษา</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${cfg.academic_year||''}</td></tr>
      <tr><td style="padding:4px 6px">รหัสวิชา</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.subject_code)}</td>
          <td style="padding:4px 6px;white-space:nowrap">รายวิชา</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.subject_name)}</td></tr>
      <tr><td style="padding:4px 6px">ประเภท</td>
          <td colspan="3" style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.subject_type||'')}</td></tr>
      <tr><td style="padding:4px 6px">หน่วยกิต</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${sub.credits}</td>
          <td style="padding:4px 6px;white-space:nowrap">เวลาเรียน</td>
          <td style="padding:4px 6px;border-bottom:1px solid #666;white-space:nowrap">${sub.total_hours} ชม./ภาค (${sub.hours_per_week} ชม./สัปดาห์)</td></tr>
      <tr><td style="padding:4px 6px">ครูผู้สอน</td>
          <td colspan="3" style="padding:4px 6px;border-bottom:1px solid #666">${esc(sub.teacher_name||'')}</td></tr>
    </table>

    <!-- สรุปผลการประเมิน -->
    <div style="font-size:13px;font-weight:700;margin:6px 0 4px">สรุปผลการประเมิน</div>

    <!-- ตารางระดับผลการเรียน -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #666;font-size:13px;margin-bottom:5px">
      <thead><tr style="background:#efefef">
        ${th('จำนวน<br>นักเรียน','vertical-align:middle;font-size:11px;')}
        ${[4,3.5,3,2.5,2,1.5,1,0].map(g=>th(g,'font-size:13px;font-weight:700;')).join('')}
        ${th('ร','font-size:13px;font-weight:700;')}${th('มส','font-size:13px;font-weight:700;')}
      </tr></thead>
      <tbody>
        <tr>
          ${td(totalN,'font-weight:600;')}
          ${[4,3.5,3,2.5,2,1.5,1,0].map(g=>td(gc[g]||'')).join('')}
          ${td(rC||'')}${td(msC||'')}
        </tr>
        <tr style="background:#fafafa">
          ${td('ร้อยละ','font-size:13px;color:#555;')}
          ${[4,3.5,3,2.5,2,1.5,1,0].map(g=>td(pct(gc[g]),'font-size:13px;')).join('')}
          ${td(pct(rC),'font-size:13px;')}${td(pct(msC),'font-size:13px;')}
        </tr>
      </tbody>
    </table>

    <!-- ตารางประเมิน -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #666;font-size:13px;margin-bottom:12px">
      <thead><tr style="background:#efefef">
        ${th('รายการประเมิน','text-align:left;padding-left:6px;font-size:11.5px;')}
        ${th('จำนวน','font-size:13px;')}
        ${th('ดีเยี่ยม (3)','font-size:13px;')}${th('ดี (2)','font-size:13px;')}${th('ผ่าน (1)','font-size:13px;')}${th('ไม่ผ่าน (0)','font-size:13px;')}
      </tr></thead>
      <tbody>
        <tr>
          <td style="border:1px solid #666;padding:4px 6px;font-size:13px">การอ่าน คิดวิเคราะห์ และเขียน</td>
          ${td(erTotal||'')}
          ${[3,2,1,0].map(v=>td(erLv[v]?(erLv[v]+(erTotal>0?' ('+(erLv[v]/erTotal*100).toFixed(1)+'%)':'')):'','font-size:13px;')).join('')}
        </tr>
        <tr>
          <td style="border:1px solid #666;padding:4px 6px;font-size:13px">คุณลักษณะอันพึงประสงค์</td>
          ${td(ecTotal||'')}
          ${[3,2,1,0].map(v=>td(ecLv[v]?(ecLv[v]+(ecTotal>0?' ('+(ecLv[v]/ecTotal*100).toFixed(1)+'%)':'')):'','font-size:13px;')).join('')}
        </tr>
      </tbody>
    </table>

    <!-- การอนุมัติ -->
    <div style="font-size:13px;font-weight:700;margin-bottom:8px">การอนุมัติผลการเรียน</div>

    <!-- ครูผู้สอน กึ่งกลาง -->
    <div style="text-align:center;font-size:13px;margin-bottom:48px">
      <div style="margin-bottom:2px">ลงชื่อ …………………………………………………</div>
      <div style="margin-bottom:2px">(${esc(sub.teacher_name||'…………………………………………………')})</div>
      <div style="font-size:12px">ครูผู้สอน</div>
    </div>

    <!-- หัวหน้ากลุ่มสาระ + หัวหน้างานทะเบียน -->
    <div style="display:flex;justify-content:space-around;font-size:13px;margin-bottom:22px">
      <div style="flex:1;text-align:center">
        <div style="margin-bottom:2px">ลงชื่อ …………………………………………</div>
        <div style="margin-bottom:2px">(${esc(sub.head_of_group||'........................................')})</div>
        <div style="font-size:12px">หัวหน้ากลุ่มสาระการเรียนรู้</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="margin-bottom:2px">ลงชื่อ …………………………………………</div>
        <div style="margin-bottom:2px">(${esc(cfg.head_registrar||'........................................')})</div>
        <div style="font-size:12px">หัวหน้างานทะเบียนวัดผล</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="margin-bottom:2px">ลงชื่อ …………………………………………</div>
        <div style="margin-bottom:2px">(${esc(cfg.head_academic||'........................................')})</div>
        <div style="font-size:12px">หัวหน้างานวิชาการ</div>
      </div>
    </div>

    <!-- รองผู้อำนวยการ + ผู้อำนวยการ -->
    <div style="display:flex;justify-content:space-around;font-size:13px;margin-top:16px">
      <div style="flex:1;text-align:center">
        <div style="margin-bottom:48px;text-align:left;padding-left:32px">เรียน เสนอมาเพื่อโปรดพิจารณา</div>
        <div style="margin-bottom:2px">ลงชื่อ …………………………………………</div>
        <div style="margin-bottom:2px">(${esc(cfg.vice_director||'……………………………………………')})</div>
        <div style="font-size:12px">รองผู้อำนวยการโรงเรียน${esc(schoolNameOnly(cfg.school_name))}</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="margin-bottom:48px"><span style="font-size:18px">☐</span> อนุมัติ &nbsp;&nbsp; <span style="font-size:18px">☐</span> ไม่อนุมัติ</div>
        <div style="margin-bottom:2px">ลงชื่อ …………………………………………</div>
        <div style="margin-bottom:2px">(${esc(cfg.director_name||'……………………………………………')})</div>
        <div style="font-size:12px">ผู้อำนวยการโรงเรียน${esc(schoolNameOnly(cfg.school_name))}</div>
        <div style="font-size:11.5px;margin-top:4px">วันที่ ……… เดือน …………………………………… พ.ศ. ………</div>
      </div>
    </div>

  </div></div>`;
}
async function changeCvrSub(sid){S.selSub=sid;await pgCover();}

// ════ PRINT COVER ════════════════════════════════════════════════
function printCover(){
  const el = document.getElementById('cov-content');
  if(!el){ toast('ไม่พบเนื้อหาปก','er'); return; }
  const win = window.open('','_blank');
  if(!win){ toast('เบราว์เซอร์บล็อก popup — กรุณาอนุญาต popup แล้วลองใหม่','er'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}
body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
select,.no-print{display:none!important}
</style></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.addEventListener('load',()=>{
    win.focus();
    Promise.race([win.document.fonts.ready, new Promise(r=>setTimeout(r,2000))]).then(()=>{
      win.print();
      setTimeout(()=>win.close(),1500);
    });
  });
}

