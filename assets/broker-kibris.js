// Kıbrıs sayfaları için Sunum girişi: köşede küçük bağlantı + şifre penceresi. Brokerlar (Umut, Makbule) ana sayfadaki
// Broker PIN'iyle (assets/broker.js, perfAuth) girer; danışmanlar portalda zaten kullandıkları kendi PIN'leriyle
// (Danışman Takip Apps Script'i, action:danismanGiris; gazete.html ve karusel.html ile aynı) sadece Kıbrıs sunumu ve 360'a girer (kibrisAuth). Giren kişi kibrisKim'e yazılır; sunumun son slaytı onu gösterir.
// Statik sitede hafif bir kilit; gerçek güvenlik değildir.
// Hedef mutlak adres: kibrisburda.com bu dosyayı dogusportal.com'dan yükler, göreli link orada 404 verir.
(function(){
  var K = 'perfAuth', HEDEF = 'https://dogusportal.com/kibris-360-tur.html', SUNUM = 'https://dogusportal.com/kibris-sunum.html';
  var me = document.currentScript, gate = me && me.hasAttribute('data-gate');
  var API = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
  var KIMLIK = {aysegul_alpay:'aysegul', ozlem_varol:'ozlem'};
  function ok(){
    try{ if (sessionStorage.getItem(K) === 'ok' || sessionStorage.getItem('kibrisAuth') === 'ok') return true; }catch(e){ return false; }
    /* Portalda broker girişi yapıldıysa (broker.js PIN'i hatırlar) tekrar sorma */
    if (window.brokerPinAl && brokerPinAl()) { try{ sessionStorage.setItem(K, 'ok'); sessionStorage.setItem('kibrisKim', /makbule/i.test(brokerAdAl()) ? 'makbule' : 'umut'); }catch(e){} return true; }
    return false;
  }
  function danismanKim(pin){
    pin = String(pin||'').trim();
    if (!pin) return Promise.resolve(null);
    return fetch(API, {method:'POST', redirect:'follow', body:JSON.stringify({action:'danismanGiris', pin:pin})})
      .then(function(r){ return r.json(); })
      .then(function(r){ if(!r || !r.success) return null; var id = String(r.id||'').toLowerCase(); return KIMLIK[id] || id.split('_')[0] || null; })
      .catch(function(){ return null; });
  }
  /* Önce broker PIN'i (yerel), sonra danışman PIN'i; giren kişiyi kaydeder */
  function giris(pin){
    return (window.brokerKim ? window.brokerKim(pin) : Promise.resolve(null)).then(function(b){
      if(b){ try{ sessionStorage.setItem(K, 'ok'); sessionStorage.setItem('kibrisKim', b); sessionStorage.setItem('kibrisPin', String(pin).trim()); }catch(e){} return true; }
      return danismanKim(pin).then(function(id){
        if(!id) return false;
        try{ sessionStorage.setItem('kibrisAuth', 'ok'); sessionStorage.setItem('kibrisKim', id); sessionStorage.setItem('kibrisPin', String(pin).trim()); }catch(e){}
        return true;
      });
    });
  }
  function css(){
    if(document.getElementById('brokerCss')) return;
    var s = document.createElement('style'); s.id = 'brokerCss';
    s.textContent = '#brokerLink{position:fixed;left:12px;bottom:12px;z-index:9998;font:600 11px/1 system-ui,sans-serif;letter-spacing:.5px;color:#fff;background:rgba(0,16,64,.55);padding:5px 10px;border-radius:999px;text-decoration:none;opacity:.55;transition:opacity .2s}#brokerLink:hover{opacity:1}@media(max-width:900px){#brokerLink{bottom:calc(78px + env(safe-area-inset-bottom,0px))}}'
      + '#brokerGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,10,40,.82);font-family:system-ui,sans-serif}'
      + '#brokerGate form{background:#fff;border-radius:14px;padding:22px;width:min(300px,calc(100vw - 32px));box-shadow:0 10px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px}'
      + '#brokerGate b{color:#000a40;font-size:16px}#brokerGate input{font-size:16px;padding:10px;border:1px solid #c9cde0;border-radius:8px}'
      + '#brokerGate .r{display:flex;gap:8px;justify-content:flex-end}#brokerGate button{font:600 14px system-ui,sans-serif;padding:9px 14px;border-radius:8px;border:0;cursor:pointer}'
      + '#brokerGate .ch{display:block;text-decoration:none;text-align:left;font:700 15px system-ui,sans-serif;color:#000a40;background:#eef0f6;border-radius:10px;padding:13px 14px}#brokerGate .ch small{display:block;font-weight:500;font-size:12px;color:#5a607a;margin-top:3px}#brokerGate .ch:hover{background:#000a40;color:#fff}#brokerGate .ch:hover small{color:#c9cde0}'
      + '#brokerGate .go{background:#000a40;color:#fff}#brokerGate .no{background:#eef0f6;color:#000a40}#brokerGate .e{color:#c8102e;font-size:13px;min-height:16px}'
      + (gate ? 'body>*:not(#brokerGate){visibility:hidden!important}' : '');
    document.head.appendChild(s);
  }
  function ask(onOk, onCancel){
    css();
    var d = document.createElement('div'); d.id = 'brokerGate';
    d.innerHTML = '<form><b>Sunum girişi</b><input type="password" inputmode="numeric" autocomplete="off" placeholder="Şifre"><span class="e"></span><div class="r"><button type="button" class="no">İptal</button><button class="go">Giriş</button></div></form>';
    document.body.appendChild(d);
    var f = d.querySelector('form'), i = d.querySelector('input'), e = d.querySelector('.e');
    setTimeout(function(){ i.focus(); }, 30);
    d.querySelector('.no').onclick = function(){ d.remove(); if(onCancel) onCancel(); };
    f.onsubmit = function(ev){
      ev.preventDefault();
      e.textContent = 'Kontrol ediliyor…';
      giris(i.value).then(function(x){
        if(!x){ e.textContent = 'Şifre hatalı'; i.select(); return; }
        d.remove(); onOk();
      });
    };
  }
  /* kibrisburda.com'dan dogusportal.com'a geçerken oturum taşınmaz (ayrı site); şifre adresin # kısmında götürülür, sunucuya gitmez */
  function devir(u){
    var p = ''; try{ p = sessionStorage.getItem('kibrisPin') || ''; }catch(e){}
    if (!p && window.brokerPinAl) p = brokerPinAl();
    return p ? u + '#g=' + encodeURIComponent(p) : u;
  }
  function menu(){
    css();
    var d = document.createElement('div'); d.id = 'brokerGate';
    d.innerHTML = '<form><b>Sunum</b><a class="ch" href="' + devir(HEDEF) + '">360° VR turlar<small>Projeleri havadan ve içeriden gez</small></a><a class="ch" href="' + devir(SUNUM) + '">Kıbrıs sunumu<small>Müşteriye sunum, konuşmacı notlarıyla</small></a><div class="r"><button type="button" class="no">Kapat</button></div></form>';
    document.body.appendChild(d);
    d.querySelector('.no').onclick = function(){ d.remove(); };
    d.onclick = function(ev){ if(ev.target === d) d.remove(); };
  }
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  var gelen = (location.hash.match(/(?:^#|&)g=(\d{4,6})/) || [])[1];
  if (gelen) try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
  if(gate){
    if(ok()) return;
    css();
    if (gelen) { giris(gelen).then(function(x){ if(x){ var s = document.getElementById('brokerCss'); if(s) s.remove(); } else ready(function(){ ask(function(){ var s = document.getElementById('brokerCss'); if(s) s.remove(); }, function(){ location.href = 'kibris.html'; }); }); }); return; }
    ready(function(){ ask(function(){ var s = document.getElementById('brokerCss'); if(s) s.remove(); }, function(){ location.href = 'kibris.html'; }); });
    return;
  }
  ready(function(){
    css();
    var a = document.createElement('a'); a.id = 'brokerLink'; a.href = HEDEF; a.textContent = 'Sunum'; a.rel = 'nofollow';
    a.onclick = function(ev){ ev.preventDefault(); if(ok()) menu(); else ask(menu); };
    document.body.appendChild(a);
  });
})();
