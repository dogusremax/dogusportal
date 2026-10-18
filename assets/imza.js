/* RE/MAX Doğuş — e-posta imzası (Umut'un formatı, 18 Ekim 2026).
   Broker: Umut ve Makbule; diğerleri "Gayrimenkul Danışmanı". Fotoğraflar yuvarlak çerçevede (assets/imza/{id}.png),
   alıcının posta programında görünsün diye mutlak https adresleriyle. Tablo düzeni: Outlook/Gmail/Apple Mail uyumlu. */
(function () {
  var KOK = 'https://dogusportal.com/assets/';
  var KISILER = [
    ['umut', 'Umut Tokkuş'], ['makbule', 'Makbule Tokkuş'],
    ['aysegul_alpay', 'Ayşegül Alpay'], ['aysun', 'Aysun Yılmaz'], ['evsen', 'Evşen Özazman'], ['gamze', 'Gamze Yetkin'],
    ['gizem', 'Gizem Gök'], ['irem', 'İrem Aleyna Tetik'], ['orhan', 'Orhan Özazman'], ['ozlem_varol', 'Özlem Varol']
  ];
  var BROKER = { umut: 1, makbule: 1 };
  function kac(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.IMZA_KISILER = KISILER.map(function (k) { return { id: k[0], ad: k[1], unvan: BROKER[k[0]] ? 'Broker' : 'Gayrimenkul Danışmanı' }; });
  window.imzaHtml = function (id, adYerine) {
    var k = window.IMZA_KISILER.filter(function (x) { return x.id === id; })[0] || window.IMZA_KISILER[0];
    var ad = kac(adYerine || k.ad), t = 'font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#050A30;';
    return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;' + t + '">' +
      '<tr><td style="padding:0 0 8px 0"><img src="' + KOK + 'imza/' + k.id + '.png" width="84" height="84" alt="' + ad + '" style="display:block;width:84px;height:84px;border-radius:50%;border:0"></td></tr>' +
      '<tr><td style="' + t + 'font-size:15px;line-height:21px;font-weight:bold">' + ad + '</td></tr>' +
      '<tr><td style="' + t + 'color:#DC1C2E;font-weight:bold">' + k.unvan + ' · RE/MAX Doğuş</td></tr>' +
      '<tr><td style="' + t + '">📞 <a href="tel:+902163151515" style="color:#050A30;text-decoration:none">0216 315 15 15</a></td></tr>' +
      '<tr><td style="' + t + '"><a href="https://www.remaxdogus.com.tr" style="color:#050A30;text-decoration:underline">www.remaxdogus.com.tr</a></td></tr>' +
      '<tr><td style="' + t + '">Fikirtepe / Kadıköy, İstanbul</td></tr>' +
      '<tr><td style="padding:8px 0 0 0"><img src="' + KOK + 'dogus-logo-koyu.png" height="38" alt="RE/MAX Doğuş" style="display:block;height:38px;border:0"></td></tr>' +
      '</table>';
  };
})();
