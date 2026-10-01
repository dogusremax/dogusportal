/* RE/MAX Doğuş — broker PIN doğrulama.
   PIN'in kendisi burada YOK; sadece PBKDF2 izi (150.000 tur) tutulur. */
(function(){
  var IZ = '561cc65b3a47c38a75d5af5f24f13559f102d17d37138e114f0787a224d7d22d';
  var TUZ = 'dogus-broker-v1', TUR = 150000;
  function hex(b){ return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0'+x.toString(16)).slice(-2); }).join(''); }
  window.brokerDogrula = function(pin){
    pin = String(pin||'').trim();
    if (!/^\d{6}$/.test(pin) || !window.crypto || !crypto.subtle) return Promise.resolve(false);
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
      .then(function(k){ return crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:enc.encode(TUZ), iterations:TUR }, k, 256); })
      .then(function(b){ return hex(b) === IZ; })
      .catch(function(){ return false; });
  };
  /* Sayfa kapısı: ?k=PIN ile gelindiyse doğrula, adres çubuğundan PIN'i sil */
  window.brokerKapi = function(){
    if (sessionStorage.getItem('perfAuth') === 'ok') return true;
    var q = new URLSearchParams(location.search), k = q.get('k');
    if (k) {
      document.documentElement.style.visibility = 'hidden';
      brokerDogrula(k).then(function(ok){
        if (!ok) { location.href = 'https://dogusportal.com'; return; }
        sessionStorage.setItem('perfAuth', 'ok');
        q.delete('k');
        location.replace(location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
      });
    } else location.href = 'https://dogusportal.com';
    throw new Error('auth');
  };
})();
