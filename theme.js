// ธีมของครูแต่ละคน (สี / ฟอนต์ / ขนาดตัวอักษร) ใช้ร่วมกันทั้ง ปพ.5 (index-pp5.html) และระบบเช็คชื่อ (activity.html)
// เก็บในตาราง config: theme_default = ค่าเริ่มต้นของโรงเรียน (แอดมินตั้ง), theme_u_<user id> = ของครูแต่ละคน
// แคชไว้ใน localStorage ด้วย เพื่อให้หน้าเปิดมาเป็นธีมเดิมทันทีไม่กระพริบ — ไม่มีผลกับหน้าพิมพ์ (หน้าต่างพิมพ์แยกใช้ฟอนต์ของตัวเอง)
(function(){
  // ชุดสีเดียวกับเว็บโรงเรียน (new.tabaowit.ac.th) + ฟ้าเดิมของระบบ — [ชื่อ, สีหลัก, สีหลักเข้ม, พื้นอ่อน, สีเน้น, r,g,b ของสีหลัก]
  const PAL={
    ios:['ฟ้า (เดิม)','#007AFF','#0062cc','#e8f2ff','#FF9500','0,122,255'],
    school:['เขียว-เหลือง','#15803d','#0d5c33','#e0f3e5','#f5c518','21,128,61'],
    blue:['น้ำเงิน-ทอง','#1559b8','#0b2a5b','#e6eefb','#f2c14e','21,89,184'],
    teal:['เขียวน้ำทะเล-ส้ม','#0f8a9d','#0b4f5c','#dcf1f4','#f59e42','15,138,157'],
    purple:['ม่วง-ทอง','#6d3fd1','#3b2480','#ece5fb','#f2c14e','109,63,209'],
    crimson:['แดงเลือดหมู-ทอง','#b3202f','#7a1620','#fbe4e6','#f2c14e','179,32,47'],
  };
  // [ชื่อ, ฟอนต์หัวข้อ, ฟอนต์เนื้อหา, family ของ Google Fonts] — 'app' = ฟอนต์เดิมของแต่ละหน้า
  const FON={
    app:['ฟอนต์เดิมของระบบ','',''],
    prompt:['Prompt + Anuphan (แบบเว็บโรงเรียน)','Prompt','Anuphan','Prompt:wght@400;500;600;700&family=Anuphan:wght@400;500;600;700'],
    sarabun:['Sarabun','Sarabun','Sarabun','Sarabun:wght@400;500;600;700'],
    noto:['Noto Sans Thai','Noto Sans Thai','Noto Sans Thai','Noto+Sans+Thai:wght@400;500;600;700'],
    kanit:['Kanit + Sarabun','Kanit','Sarabun','Kanit:wght@400;500;600&family=Sarabun:wght@400;500;600;700'],
    plex:['IBM Plex Sans Thai','IBM Plex Sans Thai','IBM Plex Sans Thai','IBM+Plex+Sans+Thai:wght@400;500;600;700'],
    mitr:['Mitr + Anuphan','Mitr','Anuphan','Mitr:wght@400;500;600&family=Anuphan:wght@400;500;600;700'],
    chakra:['Chakra Petch','Chakra Petch','Chakra Petch','Chakra+Petch:wght@400;500;600;700'],
  };
  // ขนาดตัวอักษร: ใช้ zoom ทั้งหน้า เพราะทั้งสองระบบกำหนดขนาดเป็น px ไว้ทั่วไฟล์
  const SIZ={s:['เล็ก',.92],m:['กลาง',1],l:['ใหญ่',1.08],xl:['ใหญ่มาก',1.16]};
  const BASE={p:'ios',f:'app',s:'m'};
  const LS='ptheme_v1';
  let APP='pp5', uid=null, isAdmin=false, def={...BASE,allow:true}, mine=null;

  const ok=t=>t&&PAL[t.p]&&FON[t.f]&&SIZ[t.s];
  const loadFont=k=>{const f=FON[k];if(!f||!f[3]||document.getElementById('ptf-'+k))return;
    const l=document.createElement('link');l.id='ptf-'+k;l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+f[3]+'&display=swap';document.head.appendChild(l)};
  function effective(){return (def.allow!==false&&ok(mine))?mine:(ok(def)?def:BASE)}

  function apply(t){
    t=ok(t)?t:BASE;
    const [,c,dk,lt,acc,rgb]=PAL[t.p], f=FON[t.f];
    if(f[3])loadFont(t.f);
    const body=f[2]?`'${f[2]}','Noto Sans Thai',sans-serif`:'', head=f[1]?`'${f[1]}','${f[2]}',sans-serif`:'';
    let css='';
    if(t.p!=='ios'){
      css+=APP==='pp5'
        ?`:root,body{--ac:${c}!important;--ac-dk:${dk}!important;--ac-lt:${lt}!important;--ac-mid:rgba(${rgb},.12)!important;--info-txt:${dk}!important}body.dark{--ac:${c}!important;--ac-lt:rgba(${rgb},.18)!important;--ac-mid:rgba(${rgb},.2)!important}`
        :`:root,html[data-theme]{--primary:${c}!important;--primary-dark:${dk}!important;--primary-light:${lt}!important;--blue:${c}!important}`;
      css+=`.pt-acc{color:${acc}}`;
      document.querySelector('meta[name=theme-color]')?.setAttribute('content',dk);
    }
    if(body)css+=`:root,body{--font:${body}!important}body,button,input,select,textarea{font-family:${body}!important}h1,h2,h3,.prof-name,#topbar-title{font-family:${head}!important}`;
    if(SIZ[t.s][1]!==1)css+=`body{zoom:${SIZ[t.s][1]}}`;
    let st=document.getElementById('ptheme');
    if(!st){st=document.createElement('style');st.id='ptheme';document.head.appendChild(st)}
    st.textContent=css;
  }

  async function sync(){
    if(!uid||typeof sb==='undefined')return;
    try{
      const [{data:rows},{data:pr}]=await Promise.all([
        sb.from('config').select('key,value').in('key',['theme_default','theme_u_'+uid]),
        sb.from('profiles').select('is_admin').eq('id',uid).maybeSingle()]);
      isAdmin=!!pr?.is_admin;
      const get=k=>{const r=(rows||[]).find(x=>x.key===k);try{return r&&r.value?JSON.parse(r.value):null}catch(e){return null}};
      def={...BASE,allow:true,...(get('theme_default')||{})};mine=get('theme_u_'+uid);
      const t=effective();
      try{localStorage.setItem(LS,JSON.stringify(t))}catch(e){}
      apply(t);
    }catch(e){}
  }
  async function put(key,val){
    const {error}=await sb.from('config').upsert({key,value:val==null?'':JSON.stringify(val)},{onConflict:'key'});
    if(error)throw error;
  }

  // ── หน้าต่างเลือกธีม ──
  let draft=null;
  function close(){document.getElementById('pt-modal')?.remove();apply(effective())}
  function render(){
    const m=document.getElementById('pt-modal');if(!m)return;
    const locked=def.allow===false&&!isAdmin;
    const sel=(on)=>on?'border-color:var(--pt-c);background:var(--pt-lt)':'';
    const [,c,,lt]=PAL[draft.p];
    m.querySelector('.pt-box').style.setProperty('--pt-c',c);m.querySelector('.pt-box').style.setProperty('--pt-lt',lt);
    m.querySelector('.pt-body').innerHTML=`
      ${locked?'<div class="pt-note">แอดมินตั้งให้ทุกคนใช้ธีมของโรงเรียน — เปลี่ยนเองไม่ได้</div>':''}
      <div class="pt-lbl">ชุดสี</div>
      <div class="pt-sw">${Object.entries(PAL).map(([k,p])=>`<button ${locked?'disabled':''} onclick="PTheme._set('p','${k}')" style="background:linear-gradient(135deg,${p[2]},${p[1]});box-shadow:inset 0 -7px 0 ${p[4]}${draft.p===k?`,0 0 0 3px #fff,0 0 0 5px ${p[1]}`:''}">${p[0]}</button>`).join('')}</div>
      <div class="pt-lbl">รูปแบบตัวอักษร</div>
      ${Object.entries(FON).map(([k,f])=>`<button class="pt-opt" ${locked?'disabled':''} onclick="PTheme._set('f','${k}')" style="${sel(draft.f===k)}"><b style="${f[1]?`font-family:'${f[1]}'`:''}">${f[0]}</b><span style="${f[2]?`font-family:'${f[2]}'`:''}">เช็คชื่อนักเรียน บันทึกคะแนน ๑๒๓</span></button>`).join('')}
      <div class="pt-lbl">ขนาดตัวอักษร</div>
      <div class="pt-row">${Object.entries(SIZ).map(([k,s])=>`<button class="pt-opt" ${locked?'disabled':''} onclick="PTheme._set('s','${k}')" style="text-align:center;font-size:${14*s[1]}px;${sel(draft.s===k)}">${s[0]}</button>`).join('')}</div>
      ${isAdmin?`<div class="pt-adm"><div class="pt-lbl" style="margin-top:0">สำหรับแอดมิน — ค่าเริ่มต้นของโรงเรียน</div>
        <div style="font-size:12.5px;color:#6e6e73;margin-bottom:8px">ตอนนี้: ${PAL[def.p]?.[0]||'-'} · ${FON[def.f]?.[0]||'-'} · ${SIZ[def.s]?.[0]||'-'}</div>
        <label class="pt-chk"><input type="checkbox" id="pt-allow" ${def.allow!==false?'checked':''}> อนุญาตให้ครูเปลี่ยนธีมเองได้</label>
        <button class="pt-btn pt-sec" onclick="PTheme._saveDefault()">ตั้งธีมที่เลือกอยู่เป็นค่าเริ่มต้นของโรงเรียน</button></div>`:''}`;
    m.querySelector('.pt-foot').innerHTML=locked?`<button class="pt-btn pt-sec" onclick="PTheme.close()">ปิด</button>`
      :`<button class="pt-btn pt-sec" onclick="PTheme._reset()">↺ ใช้ค่าเริ่มต้นของโรงเรียน</button><button class="pt-btn pt-pri" onclick="PTheme._save()">บันทึก</button>`;
  }
  function open(){
    if(!uid){alert('กรุณาเข้าสู่ระบบก่อน');return}
    Object.keys(FON).forEach(loadFont);
    draft={...effective()};
    document.getElementById('pt-modal')?.remove();
    const m=document.createElement('div');m.id='pt-modal';
    m.innerHTML=`<style>
      #pt-modal{position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;zoom:${1/SIZ[effective().s][1]}}
      #pt-modal .pt-box{background:#fff;color:#1d1d1f;border-radius:20px;width:100%;max-width:440px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden}
      #pt-modal .pt-hd{padding:14px 18px;background:linear-gradient(135deg,var(--pt-c),var(--pt-c));color:#fff;font-weight:700;font-size:16px;display:flex;justify-content:space-between;align-items:center}
      #pt-modal .pt-hd small{display:block;font-weight:400;font-size:12px;opacity:.9}
      #pt-modal .pt-x{background:rgba(255,255,255,.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer}
      #pt-modal .pt-body{padding:6px 16px 14px;overflow:auto}
      #pt-modal .pt-lbl{font-size:12.5px;font-weight:700;color:#6e6e73;margin:14px 0 8px}
      #pt-modal .pt-sw{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      #pt-modal .pt-sw button{height:48px;border:none;border-radius:12px;color:#fff;font-weight:700;font-size:12px;font-family:inherit;cursor:pointer;padding:0 4px 6px}
      #pt-modal .pt-opt{display:block;width:100%;text-align:left;padding:8px 12px;border-radius:12px;border:1.5px solid #e5e5ea;background:#fff;color:#1d1d1f;margin-bottom:6px;cursor:pointer;font-family:inherit}
      #pt-modal .pt-opt b{display:block;font-size:14px}#pt-modal .pt-opt span{font-size:12.5px;color:#6e6e73}
      #pt-modal .pt-row{display:flex;gap:6px}#pt-modal .pt-row .pt-opt{margin:0;padding:10px 4px}
      #pt-modal button:disabled{opacity:.45;cursor:not-allowed}
      #pt-modal .pt-foot{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e5e5ea}
      #pt-modal .pt-btn{flex:1;border:none;border-radius:12px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}
      #pt-modal .pt-pri{background:var(--pt-c);color:#fff}#pt-modal .pt-sec{background:#f2f2f7;color:#1d1d1f}
      #pt-modal .pt-adm{margin-top:16px;padding:12px;border-radius:14px;background:#fff8e6;border:1px solid #fde68a}
      #pt-modal .pt-adm .pt-btn{width:100%;margin-top:8px;background:#fff;border:1px solid #fde68a}
      #pt-modal .pt-chk{display:flex;gap:8px;align-items:center;font-size:13.5px}
      #pt-modal .pt-note{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f2f2f7;font-size:13px;color:#3a3a3c}
    </style><div class="pt-box"><div class="pt-hd"><div>🎨 ธีมและการแสดงผล<small>เปลี่ยนเฉพาะที่คุณเห็น · ใช้ทั้ง ปพ.5 และระบบเช็คชื่อ</small></div><button class="pt-x" onclick="PTheme.close()">✕</button></div><div class="pt-body"></div><div class="pt-foot"></div></div>`;
    m.addEventListener('click',e=>{if(e.target===m)close()});
    document.body.appendChild(m);render();
  }
  const msg=t=>(window.toast?toast(t):alert(t));
  window.PTheme={
    PAL,FON,SIZ,open,close,apply,sync,
    // เรียกจากหน้าหลังล็อกอิน/ออกจากระบบ
    setUser(id){uid=id||null;if(uid)sync();else{mine=null;apply(BASE)}},
    _set(k,v){draft[k]=v;apply(draft);render()},
    async _save(){try{await put('theme_u_'+uid,{p:draft.p,f:draft.f,s:draft.s});mine={...draft};try{localStorage.setItem(LS,JSON.stringify(effective()))}catch(e){};document.getElementById('pt-modal')?.remove();apply(effective());msg('บันทึกธีมแล้ว')}catch(e){msg('บันทึกไม่สำเร็จ: '+(e.message||e))}},
    async _reset(){try{await put('theme_u_'+uid,null);mine=null;try{localStorage.setItem(LS,JSON.stringify(effective()))}catch(e){};document.getElementById('pt-modal')?.remove();apply(effective());msg('กลับไปใช้ธีมของโรงเรียนแล้ว')}catch(e){msg('บันทึกไม่สำเร็จ: '+(e.message||e))}},
    async _saveDefault(){if(!isAdmin)return;const allow=!!document.getElementById('pt-allow')?.checked;
      try{await put('theme_default',{p:draft.p,f:draft.f,s:draft.s,allow});def={p:draft.p,f:draft.f,s:draft.s,allow};render();msg('ตั้งค่าเริ่มต้นของโรงเรียนแล้ว')}catch(e){msg('บันทึกไม่สำเร็จ: '+(e.message||e))}},
    init(app){APP=app;let c=null;try{c=JSON.parse(localStorage.getItem(LS)||'null')}catch(e){};if(ok(c))apply(c)},
  };
})();
