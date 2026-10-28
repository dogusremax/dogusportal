/* Bildirimdeki dış link (ac.html, bildirimlerim.html): düğme yazısı + Müşteri Takip'e broker girişi.
   Müşteri Takip linki #m=<müşteri> taşır; bu cihazda broker modu açıksa #bk=PIN eklenir, şifre sorulmaz. */
window.bildirimLink = function (u) {
  u = String(u || '');
  var mt = /script\.google\.com\/macros\/s\/AKfycbxO_8XnwUg88hl54DVwovsWRQmPF7/.test(u), pin = '';
  if (mt) {
    try { if (localStorage.getItem('dogusBroker') === 'ok') pin = localStorage.getItem('dogusBrokerPin') || ''; } catch (e) {}
    if (pin && !/[#&]bk=/.test(u)) u += (u.indexOf('#') > -1 ? '&' : '#') + 'bk=' + pin;
  }
  var etiket = mt ? (/[#&]m=/.test(u) ? 'Müşteriyi aç' : "Müşteri Takip'i aç")
    : /sahibinden\.com/.test(u) ? "İlanı sahibinden'de aç"
    : /facebook\.com/.test(u) ? "Meta'da aç" : 'Bağlantıyı aç';
  return { u: u, etiket: etiket };
};
