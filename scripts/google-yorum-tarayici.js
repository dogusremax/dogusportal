// Google yorum penceresinde ("Google yorum özeti" başlıklı açılır pencere) tarayıcı konsolunda çalıştırılır.
// Arama sayfasındaki "Google 4,9/5 · N yorum" kartından pencereyi açar, sonuna kadar kaydırır,
// "Daha fazla"ları açar ve tüm yorumları JSON olarak döndürür. Yeni olanları google-yorum-ekle.py ayıklar.
(async () => {
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  // Pencere kapalıysa "Google 4,9/5 · N yorum" kartındaki "N yorum" yazısına tıklayarak aç
  if (!document.body.innerText.includes('Google yorum özeti')) {
    const yazi = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^\d+ yorum$/.test((e.innerText || '').trim()));
    for (let t = yazi, i = 0; t && i < 5 && !document.body.innerText.includes('Google yorum özeti'); i++, t = t.parentElement) {
      ['mousedown', 'mouseup', 'click'].forEach(ev => t.dispatchEvent(new MouseEvent(ev, { bubbles: true })));
      await bekle(1500);
    }
  }
  const kutu = [...document.querySelectorAll('div')]
    .filter(d => d.scrollHeight > d.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(d).overflowY) && d.innerText.includes('Google yorum özeti'))
    .sort((a, b) => a.innerText.length - b.innerText.length)[0];
  if (!kutu) return JSON.stringify({ hata: 'Yorum penceresi bulunamadı' });

  let son = -1, ayni = 0;
  for (let i = 0; i < 80 && ayni < 6; i++) {
    kutu.scrollTop = kutu.scrollHeight;
    await new Promise(r => setTimeout(r, 900));
    if (kutu.scrollHeight === son) ayni++; else { ayni = 0; son = kutu.scrollHeight; }
  }
  [...kutu.querySelectorAll('a,span,div[role=button]')].filter(e => e.innerText.trim() === 'Daha fazla').forEach(e => e.click());
  await new Promise(r => setTimeout(r, 1500));

  const ozet = kutu.innerText.match(/(\d,\d)\s*\n?.*?\((\d+)\)/s);
  const hepsi = [...kutu.querySelectorAll('.bwb7ce[data-id]')];
  const yeni = hepsi.map(r => {
    const puan = [...r.querySelectorAll('.h3PQJ svg')].filter(s => {
      const p = s.querySelector('path');
      return /fabb05|251, 187, 5/i.test(((p && p.getAttribute('fill')) || '') + ' ' + getComputedStyle(p || s).fill);
    }).length;
    const tam = r.querySelector('.gbdaZe .d83Iyc') || r.querySelector('.EJ8fFf .d83Iyc') || r.querySelector('.d83Iyc');
    const t = r.innerText, s = t.indexOf('(Sahibi)');
    const yanit = s > -1 ? t.slice(s + 8).split('\n').map(x => x.trim()).filter(x => x && !/önce$|^Yanıt|tepki/i.test(x)).join('\n') : '';
    return {
      id: r.dataset.id,
      yazar: r.querySelector('.rhtdWc')?.innerText.trim() || '',
      foto: (r.querySelector('.QNewyd')?.style.backgroundImage || '').replace(/^url\("?|"?\)$/g, ''),
      yazarUrl: r.querySelector('a.yC3ZMb')?.href || '',
      puan,
      once: (r.querySelector('.m6Mr5d, .y3Ibjb')?.innerText || '').trim(),
      metin: tam ? tam.innerText.replace(/\s*…\s*Daha fazla$/, '').trim() : '',
      yanit,
    };
  });
  return JSON.stringify({
    puan: ozet ? parseFloat(ozet[1].replace(',', '.')) : null,
    toplam: ozet ? +ozet[2] : null,
    yuklenen: hepsi.length,
    yeni,
  });
})()
