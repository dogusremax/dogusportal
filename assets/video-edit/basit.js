/* Video Düzenle · Basit mod
   Tek ekran, 4 adım: Video seç → Otomatik düzelt → Yazı/efekt ekle → İndir.
   Sekmeler ve gelişmiş ayarlar gizlenir; "Gelişmiş" düğmesi eski ekranı aynen geri getirir.
   video-duzenle.html'deki ana betikten sonra yüklenir. */
var BASIT_ANAHTAR = 'vdBasit';
var FAVORILER = [
  ['🔤', 'Yazı', 'Ekrana yazı', function(){ yaziEkle(); }],
  ['💥', 'Vurucu başlık', 'Harf harf iki satır', function(){ efektEkle('kinetic'); }],
  ['🅰️', 'Dev yazı', 'Kafanın arkasından', function(){ efektEkle('giant'); }],
  ['🔍', 'Yakınlaş', 'Yüze zoom', function(){ zoomEkle(); }],
  ['💬', 'Yorum çağrısı', '“Yorumlara yaz”', function(){ efektEkle('cta'); }],
  ['🎞️', 'Sinema görünümü', 'Film bantları', function(){ efektEkle('film'); }],
  ['🏷️', 'Başlık kartı', 'Video karta küçülür', function(){ efektEkle('title'); }],
  ['🔊', 'Ses efekti', 'Whoosh sesi', function(){ sfxEkle('whoosh'); bildir('Whoosh sesi ' + zmn(video.currentTime) + ' saniyesine eklendi'); listele(); basitYenile(); }]
];
function basitMi(){ return document.body.classList.contains('basit'); }
function basitAyarla(acik){
  document.body.classList.toggle('basit', !!acik);
  try { localStorage.setItem(BASIT_ANAHTAR, acik ? '1' : '0'); } catch(e){}
  f('modBtn').textContent = acik ? 'Gelişmiş' : '← Basit mod';
  f('modBtn').title = acik ? 'Bütün ayarları göster' : 'Sade ekrana dön';
  /* "Öğeler" listesi basit modda ana ekranda durur */
  var liste = f('liste').closest('.kart');
  if (acik) f('basitListe').appendChild(liste); else f('pOge').appendChild(liste);
  if (acik) basitAna(); else sekmeAc(secili ? 'pOge' : 'pEfekt');
  boyutla();
}
function basitAna(){
  if (secili) { secili = null; formDoldur(); cizdir(); listele(); }
  sekmeAc('pBasit'); basitYenile();
}
function basitYenile(){
  if (!basitMi()) return;
  var var_ = !!video.src, aktif = document.querySelector('.panel.aktif');
  f('basitGeri').classList.toggle('gizli', !aktif || aktif.id === 'pBasit');
  f('adim1').classList.toggle('tamam', var_);
  f('basitVideoBtn').textContent = var_ ? '🎬 Başka video seç' : '🎬 Video seç';
  f('basitVideoBtn').classList.toggle('ana', !var_);
  f('basitVideoNot').textContent = var_ ? 'Video hazır · ' + zmn(sure()).replace(/\.\d$/, '') + ' sn' : 'Telefonundan çektiğin videoyu seç.';
  f('basitDuzeltBtn').disabled = !var_ || !videoDosyasi;
  f('basitIndirBtn').disabled = !var_;
  f('adim3').classList.toggle('tamam', ogeler.length > 0);
}
function otomatikDuzelt(){
  if (!videoDosyasi) return;
  var b = f('basitDuzeltBtn'); b.disabled = true; f('basitDurum').textContent = 'Düzeltiliyor…';
  ses.gurultu = true; ses.pro = true; f('sGurultu').checked = true; f('sPro').checked = true;
  try { sesHazirla(); sesBagla(); } catch(e){}
  kaydet();
  var d = f('nefesDurum'), once = d.textContent;
  var gozcu = new MutationObserver(function(){
    var m = d.textContent; if (!m || m === once || /inceleniyor/.test(m)) return;
    gozcu.disconnect(); b.disabled = false;
    f('basitDurum').textContent = '✓ Ses temizlendi ve güçlendirildi. ' + m;
    f('adim2').classList.add('tamam');
  });
  gozcu.observe(d, { childList: true, characterData: true, subtree: true });
  nefesSil();
}
function basitKur(){
  var k = f('favoriler');
  FAVORILER.forEach(function(x){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fav';
    b.innerHTML = '<span></span><b></b><small></small>';
    b.querySelector('span').textContent = x[0]; b.querySelector('b').textContent = x[1]; b.querySelector('small').textContent = x[2];
    b.onclick = function(){ if (!video.src) { bildir('Önce 1. adımda videonu seç'); return; } x[3](); basitYenile(); };
    k.appendChild(b);
  });
  var tum = document.createElement('button'); tum.type = 'button'; tum.className = 'fav tum';
  tum.textContent = '✦ Bütün efektler (100+)'; tum.onclick = function(){ sekmeAc('pEfekt'); basitYenile(); };
  k.appendChild(tum);
  /* her sekme değişiminde "Ana menü" çubuğunu güncelle */
  Array.prototype.forEach.call(document.querySelectorAll('.sekme'), function(s){ s.addEventListener('click', function(){ setTimeout(basitYenile, 0); }); });
  var eskiSekmeAc = sekmeAc;
  sekmeAc = function(id){
    if (basitMi() && !document.querySelector('.sekme[data-p="' + id + '"]')) {
      Array.prototype.forEach.call(document.querySelectorAll('.panel'), function(p){ p.classList.toggle('aktif', p.id === id); });
      Array.prototype.forEach.call(document.querySelectorAll('.sekme'), function(x){ x.classList.remove('aktif'); });
    } else eskiSekmeAc(id);
    setTimeout(basitYenile, 0);
  };
  /* basit modda: bir şey seçilince düzenleme kartı, seçim bitince ana menü */
  var eskiSec = sec;
  sec = function(id){
    eskiSec(id);
    if (!basitMi()) return;
    var aktif = document.querySelector('.panel.aktif');
    if (id != null && (!aktif || aktif.id !== 'pOge')) sekmeAc('pOge');
    if (id == null && aktif && aktif.id === 'pOge') sekmeAc('pBasit');
  };
  video.addEventListener('loadedmetadata', basitYenile);
  var eskiListele = listele;
  listele = function(){ eskiListele(); basitYenile(); };
  var kayitli = null; try { kayitli = localStorage.getItem(BASIT_ANAHTAR); } catch(e){}
  basitAyarla(kayitli !== '0');
}
basitKur();
