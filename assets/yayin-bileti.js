// A1 güvenlik: Instagram/story yayını artık sunucuda broker PIN'iyle alınan 12 saatlik
// "yayın bileti" ister. Bilet imzalı bir izindir, yönetim anahtarı DEĞİLDİR; anahtar hiçbir
// sayfada bulunmaz. Bilet bu tarayıcıda 12 saat saklanır, süresi dolunca PIN yeniden sorulur.
(function () {
  var DT = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
  var A = 'dogusYayinBileti';
  async function yayinBileti(yenile) {
    if (!yenile) {
      try { var v = JSON.parse(localStorage.getItem(A) || 'null'); if (v && v.bitis > Date.now() + 60000) return v.bilet; } catch (e) {}
    }
    var pin = window.prompt('Yayın için broker PIN\'ini gir');
    if (!pin) throw new Error('PIN girilmedi, yayın yapılmadı.');
    var r = await (await fetch(DT, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action: 'yayinBileti', pin: pin }) })).json();
    if (!r || !r.success) throw new Error((r && r.error) || 'PIN doğrulanamadı.');
    localStorage.setItem(A, JSON.stringify({ bilet: r.bilet, bitis: r.bitis }));
    return r.bilet;
  }
  /** fetch(url,{method:'POST',body:JSON.stringify(govde)}) yerine: bileti ekler, geçersizse bir kez yeniden ister. */
  window.yayinPost = async function (url, govde) {
    for (var deneme = 0; deneme < 2; deneme++) {
      var bilet = await yayinBileti(deneme > 0);
      var r = await fetch(url, { method: 'POST', redirect: 'follow', body: JSON.stringify(Object.assign({}, govde, { bilet: bilet })) });
      var t = await r.text(), j = null;
      try { j = JSON.parse(t); } catch (e) {}
      if (j && j.error === 'YAYIN_BILETI' && deneme === 0) { localStorage.removeItem(A); continue; }
      return new Response(t, { status: r.status, headers: { 'Content-Type': 'application/json' } });
    }
  };
})();
