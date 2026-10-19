/* Geniş emoji seçici (bildirim-gonder.html, duyuru.html).
   EmojiSecici.kur(kutu, ekle): kutu içine sekmeli emoji ızgarası çizer; dokunulan emoji ekle(emoji) ile yazılır.
   Son kullanılanlar bu cihazda hatırlanır. */
(function () {
  var GRUPLAR = [
    ['🔔', 'Sık', '🔔 📢 📣 ✅ ❗ ⚠️ 📌 📍 🗓️ 📅 ⏰ 🏠 🏢 🔑 📝 🎉 👏 💪 🙏 👍 👋 😊 🤝 🎯 🚀 ⭐ 🔥 ❤️ 💙 ☀️'],
    ['🏠', 'Emlak & İş', '🏠 🏡 🏘️ 🏢 🏬 🏗️ 🏙️ 🌆 🏖️ 🏝️ 🛋️ 🛏️ 🚪 🪟 🔑 🗝️ 🔐 📐 📏 🧱 🛠️ 🔧 🔨 🧰 💼 📁 📂 🗂️ 📋 📄 📑 🧾 ✍️ 🖊️ 📝 📊 📈 📉 💰 💵 💶 💷 💳 🏦 🪙 💸 🧮 🤝 📞 ☎️ 📱 💻 🖨️ ✉️ 📧 📨 📩 📬 🔗 🌐 🚗 🚙 🅿️ 🛗'],
    ['📅', 'Zaman', '🗓️ 📅 📆 ⏰ ⏱️ ⏳ ⌛ 🕘 🕙 🕚 🕛 🕐 🕑 🕒 🕓 🕔 🕕 🕖 🕗 ☀️ 🌅 🌄 🌇 🌙 🌛 ⭐ 🌟 ✨'],
    ['🎉', 'Kutlama', '🎉 🎊 🥳 🎂 🍰 🎁 🎈 🏆 🥇 🥈 🥉 🏅 🎖️ 👑 💎 🌹 💐 🌷 🥂 🍾 🎆 🎇 🙌 👏 💯 🔝 🆕 🆒'],
    ['😊', 'Yüzler', '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😎 🤩 🤗 🤔 🤫 😐 😏 😌 😴 🤒 🤯 😮 😲 😢 😭 😤 😡 🥺 😬 🙄 😱 🫡 🫶'],
    ['👋', 'El & İnsan', '👋 🤚 ✋ 👌 🤌 ✌️ 🤞 🫰 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 👏 🙌 🫶 👐 🤲 🤝 🙏 💪 ✍️ 👀 🧠 👤 👥 👨‍💼 👩‍💼 🧑‍💼 👨‍👩‍👧 👨‍👩‍👧‍👦 🏃 🚶'],
    ['✅', 'İşaretler', '✅ ☑️ ✔️ ❌ ❎ ❗ ❕ ❓ ❔ ‼️ ⚠️ 🚫 ⛔ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟥 🟩 🟦 ➡️ ⬅️ ⬆️ ⬇️ ↗️ 🔄 🔁 ➕ ➖ ✖️ ℹ️ 🆗 🆙 🔝 🔜 📍 📌 🔔 🔕 📢 📣 💬 💭 🗨️ 🔍 🔎 💡 🔒 🔓 #️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟'],
    ['❤️', 'Kalpler', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💖 💗 💓 💞 💕 💘 💝 ❣️ 💔 ♥️'],
    ['☕', 'Yemek & Doğa', '☕ 🍵 🧃 🥤 🍽️ 🍕 🍔 🥙 🥗 🍰 🍩 🍪 🍫 🍎 🍉 🍇 🌿 🍀 🌱 🌳 🌸 🌻 🌼 🌊 ⛰️ 🌍 🌈 ☁️ ⛅ 🌧️ ❄️ ⚡ 🔥 🐾 🐶 🐱'],
    ['✈️', 'Seyahat', '✈️ 🛫 🛬 🚀 🚗 🚕 🚌 🚆 🚇 ⛴️ 🚢 🛳️ 🗺️ 🧭 🏝️ 🏖️ 🏨 🛎️ 🧳 🎫 🇹🇷 🇨🇾 🇬🇧 🇩🇪 🇷🇺 🇮🇷 🇸🇦 🇦🇪 🇺🇸']
  ];
  var ANAHTAR = 'emoji_son_v1';
  function sonlar() { try { return JSON.parse(localStorage.getItem(ANAHTAR) || '[]'); } catch (e) { return []; } }
  function sonaEkle(e) {
    try { var l = sonlar().filter(function (x) { return x !== e; }); l.unshift(e); localStorage.setItem(ANAHTAR, JSON.stringify(l.slice(0, 24))); } catch (er) {}
  }
  var stil = document.createElement('style');
  stil.textContent =
    '.es{background:#0b0f2a;border:1px solid rgba(255,255,255,.15);border-radius:12px;margin:8px 0;overflow:hidden}' +
    '.es-sek{display:flex;gap:2px;overflow-x:auto;padding:6px;border-bottom:1px solid rgba(255,255,255,.1);scrollbar-width:none}' +
    '.es-sek::-webkit-scrollbar{display:none}' +
    '.es-sek button{flex:none;background:transparent!important;font-size:20px!important;padding:6px 8px!important;border-radius:8px!important;opacity:.55;min-width:0!important}' +
    '.es-sek button.on{background:rgba(255,255,255,.12)!important;opacity:1}' +
    '.es-ad{font:600 11px "Plus Jakarta Sans",sans-serif;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;padding:8px 10px 0}' +
    '.es-iz{display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));gap:2px;padding:6px 8px 10px;max-height:236px;overflow-y:auto}' +
    '.es-iz button{background:transparent!important;font-size:26px!important;line-height:1;padding:7px 0!important;border-radius:8px!important;min-width:0!important}' +
    '.es-iz button:active,.es-iz button:hover{background:rgba(255,255,255,.1)!important}';
  document.head.appendChild(stil);

  function kur(kutu, ekle) {
    kutu.classList.add('es');
    kutu.innerHTML = '<div class="es-sek"></div><div class="es-ad"></div><div class="es-iz"></div>';
    var sek = kutu.querySelector('.es-sek'), ad = kutu.querySelector('.es-ad'), iz = kutu.querySelector('.es-iz');
    var gruplar = [['🕘', 'Son kullanılanlar', null]].concat(GRUPLAR);
    function goster(i) {
      var g = gruplar[i];
      var liste = g[2] === null ? sonlar() : g[2].split(' ');
      if (g[2] === null && !liste.length) { goster(1); return; }
      ad.textContent = g[1];
      iz.innerHTML = liste.map(function (e) { return '<button type="button">' + e + '</button>'; }).join('');
      iz.scrollTop = 0;
      [].forEach.call(sek.children, function (b, j) { b.classList.toggle('on', j === i); });
    }
    sek.innerHTML = gruplar.map(function (g) { return '<button type="button" title="' + g[1] + '">' + g[0] + '</button>'; }).join('');
    [].forEach.call(sek.children, function (b, i) { b.onclick = function () { goster(i); }; });
    // mousedown'da odak yazı alanında kalsın (Safari/iPhone imleci kaybetmesin)
    kutu.addEventListener('mousedown', function (e) { e.preventDefault(); });
    iz.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      sonaEkle(b.textContent); ekle(b.textContent);
    });
    goster(sonlar().length ? 0 : 1);
  }
  window.EmojiSecici = { kur: kur };
})();
