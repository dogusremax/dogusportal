// Kıbrıs sayfaları için Broker girişi: köşede küçük bağlantı + şifre penceresi. Doğrulama assets/broker.js'teki
// brokerDogrula ile (ana sayfadaki Broker PIN'i ve aynı oturum işareti). Statik sitede hafif bir kilit; gerçek güvenlik değildir.
(function(){
  var K = 'perfAuth', HEDEF = 'kibris-360-deneme.html';
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
    a.onclick = function(ev){ ev.preventDefault(); if(ok()) location.href = HEDEF; else ask(function(){ location.href = HEDEF; }); };
    document.body.appendChild(a);
  });
})();
