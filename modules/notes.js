// ════════════════════════════════════════════════════════════════
// จดโน้ตของครู (แดชบอร์ด) — ตาราง teacher_notes (RLS: เห็น/แก้ได้เฉพาะของตัวเอง)
// เนื้อหาเก็บเป็น HTML จาก contenteditable — ทำความสะอาดก่อนแสดงทุกครั้ง (เหลือเฉพาะแท็กจัดรูปแบบ)
// ════════════════════════════════════════════════════════════════
const NOTE_COLORS={yellow:['#fff8d6','#f5c518','เหลือง'],blue:['#e8f2ff','#007AFF','ฟ้า'],green:['#e8f8ec','#34c759','เขียว'],pink:['#ffeef4','#e0306f','ชมพู'],purple:['#f1eefe','#7c3aed','ม่วง'],gray:['#f2f2f7','#8e8e93','เทา']};
let _notes=[], _noteQ='', _noteShowDone=false, _noteEdit=null, _noteSaveT=null, _noteSubF='';
// แนบวิชา/นักเรียน: subject_id (วิชาของครู) + student_ids/student_names (เก็บชื่อไว้ด้วย ไม่ต้องดึงตารางนักเรียนตอนแสดงการ์ด)
const _noteSub=id=>(S.subjectsAll||S.subjects||[]).find(x=>x.id===id);
const _noteSubLbl=id=>{const x=_noteSub(id);return x?x.subject_name+' '+grm(x.grade_level,x.room):'วิชา (ภาคอื่น)'};
let _noteStuCache={};
// ตัวเลือกแนบวิชา: เฉพาะวิชาภาคปัจจุบัน (แอดมินมี S.subjects ทุกภาค จึงกรองซ้ำที่นี่)
const _noteCurSubs=()=>(S.subjects||[]).filter(x=>typeof _inCurTerm!=='function'||_inCurTerm(x));

function _noteClean(html){
  const box=document.createElement('div');box.innerHTML=html||'';
  const OK={B:1,STRONG:1,I:1,EM:1,U:1,S:1,STRIKE:1,MARK:1,BR:1,P:1,DIV:1,UL:1,OL:1,LI:1,H3:1,H4:1,SPAN:1,INPUT:1,LABEL:1,A:1};
  (function walk(n){[...n.childNodes].forEach(c=>{
    if(c.nodeType===1){
      if(!OK[c.tagName]){c.replaceWith(...c.childNodes);return walk(n)}
      [...c.attributes].forEach(a=>{
        const keep=(c.tagName==='INPUT'&&(a.name==='type'||a.name==='checked'))||(c.tagName==='A'&&a.name==='href'&&/^https?:/i.test(a.value))||(a.name==='class'&&/^note-/.test(a.value))||(a.name==='style'&&c.tagName==='SPAN'&&/^background-color:[#\w(),.\s]+;?$/.test(a.value));
        if(!keep)c.removeAttribute(a.name);
      });
      if(c.tagName==='INPUT'&&c.getAttribute('type')!=='checkbox'){c.remove();return}
      if(c.tagName==='A'){c.setAttribute('target','_blank');c.setAttribute('rel','noopener')}
      walk(c);
    }else if(c.nodeType!==3)c.remove();
  })})(box);
  return box.innerHTML;
}
const _noteText=h=>{const d=document.createElement('div');d.innerHTML=h||'';return d.textContent||''};
function _noteCheckStat(h){const d=document.createElement('div');d.innerHTML=h||'';const c=d.querySelectorAll('input[type=checkbox]');return {n:c.length,done:[...c].filter(x=>x.hasAttribute('checked')).length}}
function _noteDue(n){
  if(!n.due_date||n.done)return '';
  const t=new Date();t.setHours(0,0,0,0);const d=new Date(n.due_date+'T00:00:00');const diff=Math.round((d-t)/864e5);
  const lbl=diff<0?`เลยกำหนด ${-diff} วัน`:diff===0?'ครบกำหนดวันนี้':diff===1?'พรุ่งนี้':`อีก ${diff} วัน`;
  const col=diff<0?'#dc2626':diff<=1?'#c2410c':'#6e6e73';
  return `<span style="font-size:11px;font-weight:700;color:${col}">⏰ ${lbl}</span>`;
}

async function notesInit(){
  const el=document.getElementById('dash-notes');if(!el)return;
  el.innerHTML='<div class="card"><div class="cb" style="color:var(--muted);font-size:13px">กำลังโหลดโน้ต…</div></div>';
  try{_notes=await q(sb.from('teacher_notes').select('*').eq('user_id',S.user.id).order('pinned',{ascending:false}).order('updated_at',{ascending:false}))||[]}
  catch(e){el.innerHTML=`<div class="card"><div class="cb" style="color:var(--err-txt);font-size:13px">โหลดโน้ตไม่สำเร็จ: ${esc(e.message||'')}</div></div>`;return}
  notesRender();
}

function notesRender(){
  const el=document.getElementById('dash-notes');if(!el)return;
  const q_=_noteQ.trim().toLowerCase();
  const list=_notes.filter(n=>(_noteShowDone||!n.done)&&(!_noteSubF||n.subject_id===_noteSubF)&&(!q_||(n.title+' '+_noteText(n.body)+' '+(n.student_names||[]).join(' ')+' '+(n.subject_id?_noteSubLbl(n.subject_id):'')).toLowerCase().includes(q_)));
  const due=_notes.filter(n=>!n.done&&n.due_date&&n.due_date<=new Date(Date.now()+864e5).toISOString().slice(0,10)).length;
  const doneN=_notes.filter(n=>n.done).length;
  el.innerHTML=`<div class="card"><div class="ch" style="flex-wrap:wrap;gap:8px">
    <div class="ct">📝 โน้ตของฉัน ${due?`<span style="font-size:11px;font-weight:700;color:#fff;background:#ff3b30;border-radius:99px;padding:1px 8px;margin-left:4px">${due} ใกล้ครบกำหนด</span>`:''}</div>
    <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
      <input class="fi" placeholder="ค้นหาโน้ต…" value="${esc(_noteQ)}" oninput="_noteQ=this.value;notesRender();const i=document.querySelector('#dash-notes input');i.focus();i.setSelectionRange(i.value.length,i.value.length)" style="height:32px;width:140px;font-size:13px;padding:4px 10px">
      ${_notes.some(n=>n.subject_id)?`<select class="fs" onchange="_noteSubF=this.value;notesRender()" style="height:32px;font-size:12.5px;padding:2px 8px;width:auto;max-width:150px"><option value="">ทุกวิชา</option>${[...new Set(_notes.map(n=>n.subject_id).filter(Boolean))].map(id=>`<option value="${id}" ${_noteSubF===id?'selected':''}>${esc(_noteSubLbl(id))}</option>`).join('')}</select>`:''}
      <button class="btn bp btn-sm" onclick="noteOpen()">+ โน้ตใหม่</button>
    </div></div>
    <div class="cb">
    ${list.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">${list.map(n=>{
      const [bg,bd]=NOTE_COLORS[n.color]||NOTE_COLORS.yellow;const ck=_noteCheckStat(n.body);
      return `<div onclick="noteOpen('${n.id}')" style="cursor:pointer;background:${bg};border-left:4px solid ${bd};border-radius:12px;padding:10px 12px;min-height:90px;display:flex;flex-direction:column;gap:4px;${n.done?'opacity:.55':''}">
        <div style="display:flex;gap:6px;align-items:flex-start">
          <b style="flex:1;font-size:14px;${n.done?'text-decoration:line-through':''}">${esc(n.title||'(ไม่มีหัวข้อ)')}</b>
          <span onclick="event.stopPropagation();notePin('${n.id}')" title="ปักหมุด" style="cursor:pointer;opacity:${n.pinned?1:.3}">📌</span>
        </div>
        ${n.subject_id||(n.student_names||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:4px">${n.subject_id?`<span style="font-size:11px;background:rgba(255,255,255,.7);border-radius:99px;padding:1px 8px">📘 ${esc(_noteSubLbl(n.subject_id))}</span>`:''}${(n.student_names||[]).slice(0,3).map(x=>`<span style="font-size:11px;background:rgba(255,255,255,.7);border-radius:99px;padding:1px 8px">👤 ${esc(x)}</span>`).join('')}${(n.student_names||[]).length>3?`<span style="font-size:11px;color:#6e6e73">+${n.student_names.length-3}</span>`:''}</div>`:''}
        <div class="note-prev" style="font-size:12.5px;color:#3a3a3c;line-height:1.5;max-height:6.2em;overflow:hidden">${_noteClean(n.body).replace(/<input /g,'<input disabled ')}</div>
        <div style="margin-top:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:11px;color:#6e6e73">
          ${ck.n?`<span>☑ ${ck.done}/${ck.n}</span>`:''}${_noteDue(n)}
          <span style="margin-left:auto">${new Date(n.updated_at).toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</span>
        </div></div>`}).join('')}</div>`
      :`<div style="text-align:center;color:var(--muted);font-size:13px;padding:14px">${_notes.length?'ไม่พบโน้ตที่ค้นหา':'ยังไม่มีโน้ต — จดงานที่ต้องทำ เช่น ส่งคะแนน, ตามงานนักเรียน, ประชุม'}</div>`}
    ${doneN?`<button onclick="_noteShowDone=!_noteShowDone;notesRender()" style="margin-top:10px;background:none;border:none;color:var(--ac);font:inherit;font-size:12.5px;cursor:pointer">${_noteShowDone?'ซ่อน':'แสดง'}โน้ตที่เสร็จแล้ว (${doneN})</button>`:''}
    </div></div>`;
}

async function notePin(id){
  const n=_notes.find(x=>x.id===id);if(!n)return;
  try{await q(sb.from('teacher_notes').update({pinned:!n.pinned}).eq('id',id));n.pinned=!n.pinned;
    _notes.sort((a,b)=>(b.pinned-a.pinned)||(b.updated_at>a.updated_at?1:-1));notesRender()}catch(e){toast('บันทึกไม่สำเร็จ','er')}
}

// ── ตัวแก้ไขโน้ต ──
function noteOpen(id){
  const n=id?_notes.find(x=>x.id===id):null;
  _noteEdit=n?{...n,student_ids:[...(n.student_ids||[])],student_names:[...(n.student_names||[])]}:{id:null,title:'',body:'',color:'yellow',pinned:false,due_date:null,done:false,subject_id:_noteSubF||null,student_ids:[],student_names:[]};
  const tb=(cmd,label,title,arg)=>`<button type="button" onmousedown="event.preventDefault()" onclick="noteCmd('${cmd}'${arg?`,'${arg}'`:''})" title="${title}" style="min-width:32px;height:32px;border:none;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13.5px">${label}</button>`;
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="noteMod"><div class="md md-lg">
    <div class="mh"><input id="note-title" class="fi" placeholder="หัวข้อโน้ต" value="${esc(_noteEdit.title)}" style="font-weight:700;font-size:16px;border:none;background:none;padding:0;flex:1" oninput="_noteDirty()">
      <button class="mx" onclick="noteClose()">✕</button></div>
    <div class="mb" style="padding-top:6px">
      <div style="display:flex;flex-wrap:wrap;gap:4px;background:#f2f2f7;border-radius:10px;padding:4px;margin-bottom:8px;position:sticky;top:0;z-index:2">
        ${tb('bold','<b>B</b>','ตัวหนา')}${tb('italic','<i>I</i>','ตัวเอียง')}${tb('underline','<u>U</u>','ขีดเส้นใต้')}${tb('strikeThrough','<s>S</s>','ขีดฆ่า')}
        ${tb('hilite','<span style="background:#fde047;padding:0 3px">ไฮไลต์</span>','ไฮไลต์')}
        ${tb('formatBlock','H','หัวข้อย่อย','H3')}${tb('insertUnorderedList','• รายการ','รายการ')}${tb('insertOrderedList','1. ลำดับ','ลำดับเลข')}
        ${tb('check','☑ เช็คบ็อกซ์','เพิ่มเช็คบ็อกซ์')}${tb('stamp','🕒 เวลา','แทรกวันเวลาปัจจุบัน')}${tb('removeFormat','⌫ ล้างรูปแบบ','ล้างรูปแบบ')}
      </div>
      <div id="note-body" contenteditable="true" oninput="_noteDirty()" onclick="_noteBodyClick(event)" style="min-height:220px;max-height:50vh;overflow:auto;border:1px solid var(--sep);border-radius:12px;padding:12px;font-size:14.5px;line-height:1.7;outline:none;background:#fff">${_noteClean(_noteEdit.body)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:12px;font-size:13px">
        <div style="display:flex;gap:6px;align-items:center">สี ${Object.entries(NOTE_COLORS).map(([k,c])=>`<button type="button" title="${c[2]}" onclick="_noteEdit.color='${k}';document.querySelectorAll('.note-sw').forEach(b=>b.style.outline='');this.style.outline='2px solid ${c[1]}';_noteDirty()" class="note-sw" style="width:22px;height:22px;border-radius:50%;border:2px solid ${c[1]};background:${c[0]};cursor:pointer;outline-offset:2px;${_noteEdit.color===k?`outline:2px solid ${c[1]}`:''}"></button>`).join('')}</div>
        <label style="display:flex;gap:6px;align-items:center">⏰ ครบกำหนด <input type="date" class="fi" id="note-due" value="${_noteEdit.due_date||''}" onchange="_noteDirty()" style="height:32px;padding:2px 8px;width:auto"></label>
        <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="note-pin" ${_noteEdit.pinned?'checked':''} onchange="_noteDirty()"> 📌 ปักหมุด</label>
        <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="note-done" ${_noteEdit.done?'checked':''} onchange="_noteDirty()"> ✅ เสร็จแล้ว</label>
      </div>
      <div style="margin-top:12px;padding:10px;border:1px solid var(--sep);border-radius:12px;font-size:13px">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">📘 แนบวิชา
          <select class="fs" id="note-sub" onchange="_noteSetSub(this.value)" style="height:32px;padding:2px 8px;width:auto;flex:1;min-width:160px">
            <option value="">— ไม่แนบ —</option>
            ${_noteCurSubs().map(x=>`<option value="${x.id}" ${_noteEdit.subject_id===x.id?'selected':''}>${esc(x.subject_name+' '+grm(x.grade_level,x.room))}</option>`).join('')}
            ${_noteEdit.subject_id&&!_noteCurSubs().some(x=>x.id===_noteEdit.subject_id)?`<option value="${_noteEdit.subject_id}" selected>${esc(_noteSubLbl(_noteEdit.subject_id))}</option>`:''}
          </select></div>
        ${_noteCurSubs().length?'':`<div style="font-size:12px;color:var(--muted);margin-top:6px">ยังไม่มีวิชาในภาคเรียนปัจจุบัน (${esc(S.config.semester||'')}/${esc(S.config.academic_year||'')})</div>`}
        <div id="note-stu" style="margin-top:8px"></div>
      </div>
      <div id="note-st" style="font-size:12px;color:var(--muted);margin-top:8px">${_noteEdit.id?'บันทึกอัตโนมัติขณะพิมพ์':'โน้ตใหม่ — บันทึกอัตโนมัติเมื่อเริ่มพิมพ์'}</div>
    </div>
    <div class="mf">
      ${_noteEdit.id?`<button class="btn bd" onclick="noteDel()" style="margin-right:auto">ลบโน้ต</button>`:''}
      <button class="btn bp" onclick="noteClose()">เสร็จ</button>
    </div></div></div>`);
  _noteStuRender();
  setTimeout(()=>(_noteEdit.id?document.getElementById('note-body'):document.getElementById('note-title')).focus(),50);
}
function noteCmd(cmd,arg){
  const ed=document.getElementById('note-body');ed.focus();
  if(cmd==='check'){document.execCommand('insertHTML',false,'<div><input type="checkbox">&nbsp;</div>')}
  else if(cmd==='stamp'){document.execCommand('insertText',false,new Date().toLocaleString('th-TH',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})+' ')}
  else if(cmd==='hilite'){document.execCommand('hiliteColor',false,'#fde047')}
  else document.execCommand(cmd,false,arg||null);
  _noteDirty();
}
// แตะเช็คบ็อกซ์ในโน้ต: เก็บสถานะ checked ลงใน HTML (attribute) ให้บันทึกติดไปด้วย
function _noteBodyClick(e){
  const t=e.target;if(t.tagName!=='INPUT'||t.type!=='checkbox')return;
  if(t.checked)t.setAttribute('checked','');else t.removeAttribute('checked');
  const row=t.parentElement;if(row)row.style.textDecoration=t.checked?'line-through':'';
  _noteDirty();
}
function _noteDirty(){
  const st=document.getElementById('note-st');if(st)st.textContent='กำลังบันทึก…';
  clearTimeout(_noteSaveT);_noteSaveT=setTimeout(noteSave,700);
}
async function noteSave(){
  clearTimeout(_noteSaveT);
  if(!_noteEdit||!document.getElementById('noteMod'))return;
  const row={title:document.getElementById('note-title').value.trim(),body:_noteClean(document.getElementById('note-body').innerHTML),
    color:_noteEdit.color,due_date:document.getElementById('note-due').value||null,pinned:document.getElementById('note-pin').checked,
    done:document.getElementById('note-done').checked,updated_at:new Date().toISOString(),
    subject_id:_noteEdit.subject_id||null,student_ids:_noteEdit.student_ids||[],student_names:_noteEdit.student_names||[]};
  if(!_noteEdit.id&&!row.title&&!_noteText(row.body).trim())return; // โน้ตใหม่ที่ยังว่าง ไม่ต้องสร้าง
  const st=document.getElementById('note-st');
  try{
    if(_noteEdit.id){await q(sb.from('teacher_notes').update(row).eq('id',_noteEdit.id));}
    else{const r=await q(sb.from('teacher_notes').insert(row).select('id,created_at'));_noteEdit.id=r[0].id;row.created_at=r[0].created_at;}
    const i=_notes.findIndex(x=>x.id===_noteEdit.id);const full={..._noteEdit,...row};
    if(i>=0)_notes[i]=full;else _notes.unshift(full);
    _noteEdit=full;
    if(st)st.textContent='✓ บันทึกแล้ว '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  }catch(e){if(st)st.textContent='บันทึกไม่สำเร็จ: '+(e.message||e)}
}
async function noteClose(){
  if(_noteSaveT)await noteSave();
  rmModal('noteMod');_noteEdit=null;
  _notes.sort((a,b)=>(b.pinned-a.pinned)||(b.updated_at>a.updated_at?1:-1));notesRender();
}
async function noteDel(){
  if(!_noteEdit?.id)return;
  if(!confirm('ลบโน้ตนี้? ลบแล้วกู้คืนไม่ได้'))return;
  try{await q(sb.from('teacher_notes').delete().eq('id',_noteEdit.id));_notes=_notes.filter(x=>x.id!==_noteEdit.id);
    clearTimeout(_noteSaveT);_noteSaveT=null;rmModal('noteMod');_noteEdit=null;notesRender();toast('ลบโน้ตแล้ว')}
  catch(e){toast('ลบไม่สำเร็จ: '+e.message,'er')}
}

// ── แนบนักเรียน (เลือกจากห้องของวิชาที่แนบ) ──
function _noteSetSub(id){
  _noteEdit.subject_id=id||null;
  // เปลี่ยนวิชา → นักเรียนที่แนบไว้เป็นคนละห้อง ล้างทิ้ง
  _noteEdit.student_ids=[];_noteEdit.student_names=[];
  _noteStuRender();_noteDirty();
}
async function _noteStuRender(){
  const el=document.getElementById('note-stu');if(!el)return;
  const ids=_noteEdit.student_ids||[], names=_noteEdit.student_names||[];
  const chips=ids.map((id,i)=>`<span style="display:inline-flex;gap:4px;align-items:center;font-size:12px;background:#f2f2f7;border-radius:99px;padding:2px 4px 2px 10px;margin:0 4px 4px 0">👤 ${esc(names[i]||'')}<button type="button" onclick="_noteStuToggle('${id}')" style="border:none;background:#d1d1d6;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:11px;line-height:1">✕</button></span>`).join('');
  const sub=_noteSub(_noteEdit.subject_id);
  if(!sub){el.innerHTML=(chips?`<div>${chips}</div>`:'')+'<div style="color:var(--muted);font-size:12px">เลือกวิชาก่อน เพื่อแนบนักเรียนในห้องนั้น</div>';return}
  el.innerHTML=`<div>${chips}</div><input class="fi" id="note-stu-q" placeholder="👤 พิมพ์ชื่อหรือรหัสนักเรียนเพื่อแนบ…" oninput="_noteStuSearch(this.value)" style="height:32px;font-size:13px"><div id="note-stu-res"></div>`;
}
async function _noteStuSearch(v){
  const sub=_noteSub(_noteEdit.subject_id);const box=document.getElementById('note-stu-res');if(!sub||!box)return;
  const k=sub.grade_level+'_'+sub.room;
  if(!_noteStuCache[k]){try{_noteStuCache[k]=await q(sb.from('students').select('id,student_code,student_name').eq('grade_level',sub.grade_level).eq('room',sub.room).order('student_code'))||[]}catch(e){_noteStuCache[k]=[]}}
  v=(v||'').trim().toLowerCase();
  const list=_noteStuCache[k].filter(x=>!v||(x.student_name+' '+x.student_code).toLowerCase().includes(v)).slice(0,8);
  box.innerHTML=list.map(x=>{const on=(_noteEdit.student_ids||[]).includes(x.id);
    return `<div onclick="_noteStuToggle('${x.id}','${escJs(x.student_name)}')" style="cursor:pointer;padding:6px 8px;border-radius:8px;display:flex;justify-content:space-between;${on?'background:var(--ac-lt)':''}"><span>${esc(x.student_name)} <span style="color:var(--muted);font-size:11.5px">${esc(x.student_code)}</span></span>${on?'✓':'+'}</div>`}).join('')||'<div style="color:var(--muted);font-size:12px;padding:6px">ไม่พบนักเรียน</div>';
}
function _noteStuToggle(id,name){
  const i=_noteEdit.student_ids.indexOf(id);
  if(i>=0){_noteEdit.student_ids.splice(i,1);_noteEdit.student_names.splice(i,1)}
  else{_noteEdit.student_ids.push(id);_noteEdit.student_names.push(name||'')}
  const qv=document.getElementById('note-stu-q')?.value||'';
  _noteStuRender().then(()=>{const inp=document.getElementById('note-stu-q');if(inp){inp.value=qv;inp.focus();_noteStuSearch(qv)}});
  _noteDirty();
}
