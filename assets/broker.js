/* RE/MAX Doğuş — broker PIN doğrulama.
   PIN'in kendisi burada YOK; sadece PBKDF2 izi (150.000 tur) tutulur. */
(function(){
  /* Brokerlar: Umut, Makbule */
  var IZLER = ['30092762b4b93cdbcbfbead48d5c8e2fd7e36e79722664c5ab938b4bc423bbac',
               'f0cb3c4bf033518764b926abdcfe76d6e27edeca848d256fc20752cb9be2b319'];
  var TUZ = 'dogus-broker-v1', TUR = 150000;
  function hex(b){ return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0'+x.toString(16)).slice(-2); }).join(''); }
  var KIMLER = ['umut', 'makbule'];
  /* PIN hangi brokera ait: 'umut' / 'makbule' ya da null */
  window.brokerKim = function(pin){
    return izi(pin).then(function(h){ var i = IZLER.indexOf(h); if (i >= 0) pinKaydet(pin, ADLAR[i]); return i >= 0 ? KIMLER[i] : null; });
  };
  window.brokerDogrula = function(pin){
    return izi(pin).then(function(h){ var i = IZLER.indexOf(h); if (i >= 0) pinKaydet(pin, ADLAR[i]); return i >= 0; });
  };
  /* Tek giriş: broker PIN'i bir kez doğrulanınca bu cihazda hatırlanır, uygulamalar bir daha sormaz.
     Portaldaki "Broker modundan çık" brokerCikis() ile siler. */
  var ADLAR = ['Umut Tokkuş', 'Makbule Tokkuş'];
  function pinKaydet(pin, ad){ try { localStorage.setItem('dogusBrokerPin', String(pin).trim()); localStorage.setItem('dogusBrokerAd', ad); } catch(e){} }
  window.brokerPinAl = function(){ try { return localStorage.getItem('dogusBrokerPin') || ''; } catch(e){ return ''; } };
  window.brokerAdAl = function(){ try { return localStorage.getItem('dogusBrokerAd') || ''; } catch(e){ return ''; } };
  window.brokerCikis = function(){ try { localStorage.removeItem('dogusBrokerPin'); localStorage.removeItem('dogusBrokerAd'); } catch(e){} };
  function izi(pin){
    pin = String(pin||'').trim();
    if (!/^\d{4,6}$/.test(pin) || !window.crypto || !crypto.subtle) return Promise.resolve('');
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
      .then(function(k){ return crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:enc.encode(TUZ), iterations:TUR }, k, 256); })
      .then(function(b){ return hex(b); })
      .catch(function(){ return ''; });
  }
  /* Sayfa kapısı: ?k=PIN ile gelindiyse doğrula, adres çubuğundan PIN'i sil */
  window.brokerKapi = function(){
    if (sessionStorage.getItem('perfAuth') === 'ok') return true;
    var q = new URLSearchParams(location.search), k = q.get('k');
    document.documentElement.style.visibility = 'hidden';
    q.delete('k');
    var temiz = location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash;
    /* PIN linkte yoksa ya da yanlışsa sor (e-postadaki linkler PIN taşımaz) */
    var sor = function(){
      var p = window.prompt('Broker PIN');
      if (!p) { location.href = 'https://dogusportal.com'; return; }
      brokerDogrula(p).then(function(ok){
        if (!ok) { alert('Yanlış PIN'); sor(); return; }
        sessionStorage.setItem('perfAuth', 'ok');
        location.replace(temiz);
      });
    };
    var kayitli = brokerPinAl();
    (k ? brokerDogrula(k) : kayitli ? brokerDogrula(kayitli) : Promise.resolve(false)).then(function(ok){
      if (!ok) { if (!k && kayitli) brokerCikis(); setTimeout(sor, 0); return; }
      sessionStorage.setItem('perfAuth', 'ok');
      location.replace(temiz);
    });
    throw new Error('auth');
  };
})();
