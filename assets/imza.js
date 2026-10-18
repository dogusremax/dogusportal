/* RE/MAX Doğuş — e-posta imzası (Umut'un formatı, 18 Ekim 2026).
   Broker: Umut ve Makbule; diğerleri "Gayrimenkul Danışmanı". Fotoğraflar yuvarlak çerçevede (assets/imza/{id}.png),
   alıcının posta programında görünsün diye mutlak https adresleriyle. Tablo düzeni: Outlook/Gmail/Apple Mail uyumlu. */
(function () {
  var KOK = 'https://dogusportal.com/assets/';
  // [id, ad, cep, e-posta] — cep ve e-posta: apps-script dijital-kart PREFILL / Kod.js danışman numaraları
  var KISILER = [
    ['umut', 'Umut Tokkuş', '0532 472 41 48', 'umut'], ['makbule', 'Makbule Tokkuş', '0532 478 13 31', 'makbule'],
    ['aysegul_alpay', 'Ayşegül Alpay', '0532 456 79 56', 'aysegul'], ['aysun', 'Aysun Yılmaz', '0532 363 35 54', 'aysun'],
    ['evsen', 'Evşen Özazman', '0532 518 11 67', 'evsen'], ['gamze', 'Gamze Yetkin', '0538 354 41 65', 'gamze'],
    ['gizem', 'Gizem Gök', '0507 097 74 31', 'gizem'], ['irem', 'İrem Aleyna Tetik', '0546 281 91 77', 'irem'],
    ['orhan', 'Orhan Özazman', '0533 436 19 95', 'orhan'], ['ozlem_varol', 'Özlem Varol', '0533 624 85 98', 'ozlem']
  ];
  var BROKER = { umut: 1, makbule: 1 };
  function kac(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.IMZA_KISILER = KISILER.map(function (k) { return { id: k[0], ad: k[1], cep: k[2], eposta: k[3] + '@remaxdogus.com.tr', unvan: BROKER[k[0]] ? 'Broker' : 'Gayrimenkul Danışmanı' }; });
  window.imzaHtml = function (id, adYerine) {
    var k = window.IMZA_KISILER.filter(function (x) { return x.id === id; })[0] || window.IMZA_KISILER[0];
    var ad = kac(adYerine || k.ad), t = 'font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#050A30;';
    return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;' + t + '">' +
      '<tr><td style="padding:0 0 8px 0"><img src="' + KOK + 'imza/' + k.id + '.png?v=2" width="84" height="84" alt="' + ad + '" style="display:block;width:84px;height:84px;border-radius:50%;border:0"></td></tr>' +
      '<tr><td style="' + t + 'font-size:15px;line-height:21px;font-weight:bold">' + ad + '</td></tr>' +
      '<tr><td style="' + t + 'color:#DC1C2E;font-weight:bold">' + k.unvan + ' · RE/MAX Doğuş</td></tr>' +
      '<tr><td style="' + t + '">☎ <a href="tel:+902163151515" style="color:#050A30;text-decoration:none">0216 315 15 15</a></td></tr>' +
      '<tr><td style="' + t + '">Cep: <a href="tel:+9' + k.cep.replace(/\s/g, '') + '" style="color:#050A30;text-decoration:none">' + k.cep + '</a></td></tr>' +
      '<tr><td style="' + t + '"><a href="https://www.remaxdogus.com.tr" style="color:#050A30;text-decoration:underline">www.remaxdogus.com.tr</a></td></tr>' +
      '<tr><td style="' + t + '"><a href="mailto:' + k.eposta + '" style="color:#050A30;text-decoration:none">' + k.eposta + '</a></td></tr>' +
      '<tr><td style="' + t + '">Fikirtepe / Kadıköy, İstanbul</td></tr>' +
      '<tr><td style="padding:8px 0 0 0"><img src="' + KOK + 'dogus-logo-koyu.png" height="38" alt="RE/MAX Doğuş" style="display:block;height:38px;border:0"></td></tr>' +
      '</table>';
  };
})();
