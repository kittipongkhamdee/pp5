(function () {
  const SGS_RE = /^https:\/\/sgs\.bopp-obec\.info\/sgs\/TblTranscripts\/Edit-TblTranscripts[12]-Table\.aspx/;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const el = document.getElementById('status');
    const text = document.getElementById('statusText');
    const url = tabs && tabs[0] && tabs[0].url;
    if (url && SGS_RE.test(url)) {
      el.className = 'status ok';
      text.textContent = 'พร้อมใช้งานในหน้านี้ — เลื่อนลงมุมขวาล่างของหน้าเว็บ';
    } else {
      el.className = 'status off';
      text.textContent = 'ยังไม่ได้เปิดหน้ากรอกคะแนน SGS';
    }
  });
})();
