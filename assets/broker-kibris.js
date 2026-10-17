// Kıbrıs sayfaları için Sunum girişi: köşede küçük bağlantı + şifre penceresi. Brokerlar (Umut, Makbule) ana sayfadaki
// Broker PIN'iyle (assets/broker.js, perfAuth) girer; danışmanlar kendi PIN'iyle (aşağıdaki DANISMAN izleri, kibrisAuth)
// sadece Kıbrıs sunumu ve 360'a girer. Giren kişi kibrisKim'e yazılır; sunumun son slaytı onu gösterir.
// Statik sitede hafif bir kilit; gerçek güvenlik değildir.
// Hedef mutlak adres: kibrisburda.com bu dosyayı dogusportal.com'dan yükler, göreli link orada 404 verir.
(function(){
  var K = 'perfAuth', HEDEF = 'https://dogusportal.com/kibris-360-tur.html', SUNUM = 'https://dogusportal.com/kibris-sunum.html';
  var me = document.currentScript, gate = me && me.hasAttribute('data-gate');
  /* Danışman PIN izleri (PBKDF2-SHA256, 150.000 tur, tuz dogus-kibris-v1) → danışman kimliği */
  var DANISMAN = {
    "f6172fa762daec01011979f8133d02d64019935c500903379ba30b730cabcb21": "gizem",
    "0b0f6c757de321e9494f4ad8d4fb584e46365747977349698c75a392c81c3c99": "aysegul",
    "1d72ea6f57b123300d6ff1aa8506b51742da4b3d8ac458d9e1e20bdcaaaa61cf": "aysun",
    "f12f5ecddf3e3e1c396d196805581345e394f743935fdeebda46915aef41c8ea": "evsen",
    "29edda42c3be5924b881f07141a9ff849527bd52b08c643e89ff491d6b9f6170": "gamze",
    "3dd3a2d2cbe29c3a366c6b6da72761ac571d047730a5b541ab9977493cdad746": "irem",
    "d5f8569a6ecd82bf1ba7e246d894fccd6980449a8a63fe06c414a499096dfd9a": "orhan",
    "4bf6eb2bbbb143119de5949295bafa07c6902653480439619bcd1e6f189cbb21": "ozlem"
    };
  function ok(){ try{ return sessionStorage.getItem(K) === 'ok' || sessionStorage.getItem('kibrisAuth') === 'ok'; }catch(e){ return false; } }
  function hex(b){ return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0'+x.toString(16)).slice(-2); }).join(''); }
  function danismanKim(pin){
    pin = String(pin||'').trim();
    if (!/^\d{4,6}$/.test(pin) || !window.crypto || !crypto.subtle) return Promise.resolve(null);
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
      .then(function(k){ return crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:enc.encode('dogus-kibris-v1'), iterations:150000 }, k, 256); })
      .then(function(b){ return DANISMAN[hex(b)] || null; })
      .catch(function(){ return null; });
  }
  /* Önce danışman, sonra broker PIN'i; giren kişiyi kaydeder */
  function giris(pin){
    return danismanKim(pin).then(function(id){
      if(id){ try{ sessionStorage.setItem('kibrisAuth', 'ok'); sessionStorage.setItem('kibrisKim', id); }catch(e){} return true; }
      return (window.brokerKim ? window.brokerKim(pin) : Promise.resolve(null)).then(function(b){
        if(!b) return false;
        try{ sessionStorage.setItem(K, 'ok'); sessionStorage.setItem('kibrisKim', b); }catch(e){}
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
      giris(i.value).then(function(x){
        if(!x){ e.textContent = 'Şifre hatalı'; i.select(); return; }
        d.remove(); onOk();
      });
    };
  }
  function menu(){
    css();
    var d = document.createElement('div'); d.id = 'brokerGate';
    d.innerHTML = '<form><b>Sunum</b><a class="ch" href="' + HEDEF + '">360° VR turlar<small>Projeleri havadan ve içeriden gez</small></a><a class="ch" href="' + SUNUM + '">Kıbrıs sunumu<small>Müşteriye sunum, konuşmacı notlarıyla</small></a><div class="r"><button type="button" class="no">Kapat</button></div></form>';
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
    var a = document.createElement('a'); a.id = 'brokerLink'; a.href = HEDEF; a.textContent = 'Sunum'; a.rel = 'nofollow';
    a.onclick = function(ev){ ev.preventDefault(); if(ok()) menu(); else ask(menu); };
    document.body.appendChild(a);
  });
})();
