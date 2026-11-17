/* Ofis TV'leri: hangi ekran gösterilecek? (Ekranlar uygulamasındaki "Açılınca" seçimi)
   data-ben="yon" → /tv yönlendirir; "skorbord" / "nobet" → sayfa 3 dk'da bir sorar, seçim değişince geçer. */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbzWtvlQxgUzeFeVWc2EeKqEqaySI7ynUluRkQHqgF6WfHbUKpyD93KMwOKxisocHPm6/exec?ne=tvSayfa';
  var YOL = { skorbord: '/danisman-skorbord-tv.html', nobet: '/tv-nobet.html' };
  var ben = (document.currentScript && document.currentScript.getAttribute('data-ben')) || '';
  function sor() {
    var ctl = window.AbortController ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 6000);
    return fetch(API + '&t=' + Date.now(), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && YOL[d.sayfa] ? d.sayfa : null; })
      .catch(function () { return null; });
  }
  function git(s) { try { localStorage.setItem('tvEkran', '1'); } catch (e) {} location.replace(YOL[s]); }
  if (ben === 'yon') {
    var bitti = false;
    sor().then(function (s) { if (!bitti) { bitti = true; git(s || 'skorbord'); } });
    setTimeout(function () { if (!bitti) { bitti = true; git('skorbord'); } }, 7000);
    return;
  }
  var tv = ben === 'nobet';
  try { tv = tv || localStorage.getItem('tvEkran') === '1'; } catch (e) {}
  if (!tv) return;   // telefondan/bilgisayardan açılan skorbord yönlendirilmez
  function kontrol() { sor().then(function (s) { if (s && s !== ben) git(s); }); }
  setTimeout(kontrol, 3000);
  setInterval(kontrol, 3 * 60 * 1000);
})();
