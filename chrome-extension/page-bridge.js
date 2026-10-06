// รันในบริบทหน้าเว็บ (world: MAIN) — ให้ content.js สั่งคลิกลิงก์ javascript:__doPostBack ของ SGS ได้
// (click() จาก isolated world ไม่ทำให้ postback ทำงาน) รับ id ของปุ่มผ่าน CustomEvent แล้วคลิกในบริบทหน้าเว็บ
(function () {
  if (window.__pp5Bridge) return;
  window.__pp5Bridge = 1;
  document.addEventListener('pp5-click', function (e) {
    try {
      var el = document.getElementById(String(e.detail || ''));
      if (el) el.click();
    } catch (err) { /* ไม่เป็นไร */ }
  });
  document.documentElement.setAttribute('data-pp5-bridge', '1');
})();
