/* Danışman Takip puanı jetonu (Müşteri Takip'teki animasyonun aynısı, Umut 26.10.2026).
 * puanJeton(puan, kaynakEl): ekran kararır, altın jeton tuştan dönerek ortaya gelir, parıltı geçer,
 * yukarı uçup kaybolur; altta "+5 puan Danışman Takip'e yazıldı" yazar.
 * Yalnızca sunucu puanı gerçekten yazınca (cevapta puan > 0) çağrılır. Kullanan: kira-dosya.html, odeme.html */
(function () {
  var CSS = '.pu-karart{position:fixed;inset:0;z-index:9998;pointer-events:none;background:rgba(5,12,28,0)}' +
    '.pu-jeton{position:fixed;left:0;top:0;width:120px;height:120px;z-index:10000;pointer-events:none;transform-style:preserve-3d;will-change:transform,opacity}' +
    '.pu-yuz{position:absolute;inset:0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:inherit;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;color:#6b4708}' +
    '.pu-on{background:radial-gradient(circle at 32% 28%,#fff3c4 0%,#f2c85b 32%,#d29a2c 70%,#a8741a 100%);box-shadow:inset 0 0 0 5px rgba(255,255,255,.35),inset 0 0 0 9px #b8862a,0 18px 40px rgba(0,0,0,.35)}' +
    '.pu-arka{background:radial-gradient(circle at 32% 28%,#ffe9a6,#d29a2c 70%,#a8741a);transform:rotateY(180deg);box-shadow:inset 0 0 0 5px rgba(255,255,255,.35),inset 0 0 0 9px #b8862a;font-size:13px;font-weight:800;letter-spacing:.12em}' +
    '.pu-yuz b{font-size:46px;font-weight:800;line-height:1;letter-spacing:-.03em;text-shadow:0 1px 0 rgba(255,255,255,.5)}' +
    '.pu-yuz small{font-size:10.5px;font-weight:800;letter-spacing:.24em;margin-top:2px}' +
    '.pu-parilti{position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.85) 50%,transparent 60%);transform:translateX(-100%)}' +
    '#puanBildirim{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#0e1a30;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9999;max-width:90vw;text-align:center;transition:opacity .3s;pointer-events:none}';
  function stil() {
    if (document.getElementById('puJetonStil')) return;
    var s = document.createElement('style'); s.id = 'puJetonStil'; s.textContent = CSS; document.head.appendChild(s);
  }
  function bildir(metin) {
    var el = document.getElementById('puanBildirim');
    if (!el) { el = document.createElement('div'); el.id = 'puanBildirim'; document.body.appendChild(el); }
    el.textContent = metin; el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(function () { el.style.opacity = '0'; }, 3500);
  }
  window.puanJeton = function (puan, kaynakEl) {
    puan = Number(puan) || 0;
    if (puan <= 0) return;
    stil();
    var yazi = function () { bildir('⭐ +' + puan + ' puan Danışman Takip\'e yazıldı'); };
    var hareketAz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (hareketAz || !document.body.animate) { yazi(); return; }
    var W = window.innerWidth, H = window.innerHeight, R = 60;
    var k = kaynakEl && kaynakEl.getBoundingClientRect ? kaynakEl.getBoundingClientRect() : null;
    var bx = k && k.width ? k.left + k.width / 2 : W / 2, by = k && k.height ? k.top + k.height / 2 : H * 0.7;
    var cx = W / 2, cy = H * 0.42, hx = W / 2, hy = -R;
    var karart = document.createElement('div'); karart.className = 'pu-karart'; document.body.appendChild(karart);
    var j = document.createElement('div'); j.className = 'pu-jeton';
    j.innerHTML = '<div class="pu-yuz pu-on"><b>+' + puan + '</b><small>PUAN</small><div class="pu-parilti"></div></div><div class="pu-yuz pu-arka">RE/MAX</div>';
    document.body.appendChild(j);
    if (navigator.vibrate) { try { navigator.vibrate([20, 40, 20]); } catch (e) {} }
    var T = function (x, y, s, ry) { return 'translate(' + (x - R) + 'px,' + (y - R) + 'px) scale(' + s + ') rotateY(' + ry + 'deg)'; };
    karart.animate([{ background: 'rgba(5,12,28,0)' }, { background: 'rgba(5,12,28,.55)', offset: .15 }, { background: 'rgba(5,12,28,.55)', offset: .62 }, { background: 'rgba(5,12,28,0)' }], { duration: 2300, fill: 'forwards' });
    var a = j.animate([
      { transform: T(bx, by, .2, 0), opacity: 0, offset: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: T(cx, cy, 1.15, 720), opacity: 1, offset: .32, easing: 'ease-out' },
      { transform: T(cx, cy, 1, 720), opacity: 1, offset: .42 },
      { transform: T(cx, cy - 6, 1, 720), opacity: 1, offset: .68, easing: 'cubic-bezier(.55,0,.75,.3)' },
      { transform: T(hx, hy, .3, 1080), opacity: 0, offset: 1 }
    ], { duration: 2300, fill: 'forwards' });
    setTimeout(function () {
      var p = j.querySelector('.pu-parilti');
      if (p) p.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(100%)' }], { duration: 650, easing: 'ease-in-out' });
    }, 800);
    setTimeout(yazi, 1500);
    a.onfinish = function () { j.remove(); karart.remove(); };
  };
})();
