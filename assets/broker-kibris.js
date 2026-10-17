// Kıbrıs sayfaları için Broker girişi: köşede küçük bağlantı + şifre penceresi. Doğrulama assets/broker.js'teki
// brokerDogrula ile (ana sayfadaki Broker PIN'i ve aynı oturum işareti). Statik sitede hafif bir kilit; gerçek güvenlik değildir.
// Hedef mutlak adres: kibrisburda.com bu dosyayı dogusportal.com'dan yükler, göreli link orada 404 verir.
(function(){
  var K = 'perfAuth', HEDEF = 'https://dogusportal.com/kibris-360-tur.html', SUNUM = 'https://dogusportal.com/kibris-sunum.html';
  var me = document.currentScript, gate = me && me.hasAttribute('data-gate');
  function ok(){ try{ return sessionStorage.getItem(K) === 'ok'; }catch(e){ return false; } }
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
    d.innerHTML = '<form><b>Broker girişi</b><input type="password" inputmode="numeric" autocomplete="off" placeholder="Şifre"><span class="e"></span><div class="r"><button type="button" class="no">İptal</button><button class="go">Giriş</button></div></form>';
    document.body.appendChild(d);
    var f = d.querySelector('form'), i = d.querySelector('input'), e = d.querySelector('.e');
    setTimeout(function(){ i.focus(); }, 30);
    d.querySelector('.no').onclick = function(){ d.remove(); if(onCancel) onCancel(); };
    f.onsubmit = function(ev){
      ev.preventDefault();
      window.brokerDogrula(i.value).then(function(x){
        if(!x){ e.textContent = 'Şifre hatalı'; i.select(); return; }
        try{ sessionStorage.setItem(K, 'ok'); }catch(er){}
        d.remove(); onOk();
      });
    };
  }
  function menu(){
    css();
    var d = document.createElement('div'); d.id = 'brokerGate';
    d.innerHTML = '<form><b>Broker alanı</b><a class="ch" href="' + HEDEF + '">360° VR turlar<small>Projeleri havadan ve içeriden gez</small></a><a class="ch" href="' + SUNUM + '">Kıbrıs sunumu<small>Müşteriye sunum, konuşmacı notlarıyla</small></a><div class="r"><button type="button" class="no">Kapat</button></div></form>';
    document.body.appendChild(d);
    d.querySelector('.no').onclick = function(){ d.remove(); };
    d.onclick = function(ev){ if(ev.target === d) d.remove(); };
  }
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  if(gate){
    if(ok()) return;
    css();
    ready(function(){ ask(function(){ var s = document.getElementById('brokerCss'); if(s) s.remove(); }, function(){ location.href = 'kibris.html'; }); });
    return;
  }
  ready(function(){
    css();
    var a = document.createElement('a'); a.id = 'brokerLink'; a.href = HEDEF; a.textContent = 'Broker'; a.rel = 'nofollow';
    a.onclick = function(ev){ ev.preventDefault(); if(ok()) menu(); else ask(menu); };
    document.body.appendChild(a);
  });
})();
