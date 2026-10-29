/* Danışman sitesi renk temaları (danisman.html, site/<ad>/, ozlemvarol.com ve site/duzenle.html paneli ortak kullanır).
   Danışman panelden seçer, data/danisman-site.json'da "tema" olarak durur; yoksa klasik RE/MAX. */
(function () {
  var T = {
    klasik:   { ad: 'Klasik RE/MAX', navy: '#050A30', red: '#DC1C2E', redd: '#910B19', coral: '#FB5160', tint: '#fdecee' },
    lacivert: { ad: 'Okyanus',       navy: '#04243F', red: '#0A6FD6', redd: '#06467F', coral: '#4DB2FF', tint: '#e5f0fc' },
    zumrut:   { ad: 'Zümrüt',        navy: '#05291F', red: '#0B8F63', redd: '#065C40', coral: '#3FD39E', tint: '#e2f5ed' },
    bordo:    { ad: 'Bordo Altın',   navy: '#2A0A14', red: '#A8741F', redd: '#7A1F33', coral: '#E3B55A', tint: '#f8efdc' },
    mor:      { ad: 'Lavanta',       navy: '#1B0F36', red: '#7B3AEC', redd: '#4A1D93', coral: '#B794F6', tint: '#f0e9fd' },
    antrasit: { ad: 'Antrasit',      navy: '#1C2026', red: '#E2540A', redd: '#A23B05', coral: '#FF9F59', tint: '#fdede3' }
  };
  var rgb = function (h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(','); };
  window.SITE_TEMALAR = T;
  window.siteTema = function (ad, kok) {
    var t = T[ad] || T.klasik, st = (kok || document.documentElement).style;
    st.setProperty('--navy', t.navy); st.setProperty('--red', t.red); st.setProperty('--redd', t.redd);
    st.setProperty('--coral', t.coral); st.setProperty('--tint', t.tint);
    st.setProperty('--nr', rgb(t.navy)); st.setProperty('--rr', rgb(t.red));
    st.setProperty('--grad', 'linear-gradient(160deg,' + t.redd + ',' + t.red + ' 45%,' + t.coral + ')');
    st.setProperty('--chk', 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M4 8.3l2.6 2.5L12 5.4\' fill=\'none\' stroke=\'%23' + t.red.slice(1) + '\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")');
    if (!kok) { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.navy; }
    return t;
  };
})();
