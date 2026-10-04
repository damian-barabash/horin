/* HORIN — i18n EN/PL.
   EN живёт в разметке как дефолт (SEO), словарь (dict.js) подменяет
   innerHTML по data-i18n и placeholder по data-i18n-ph. Поверх словаря
   ложатся правки из админки (Supabase `texts`, plain text — см. content.js).
   Смена языка: тексты гаснут, фото ныряют вниз (event 'horin:langdip'
   слушают scene.js / dawid.js), подмена, тексты проявляются. */

(() => {
  const BASE = window.HORIN_DICT;
  const DICT = { en: { ...BASE.en }, pl: { ...BASE.pl } };

  const KEY = 'horin-lang';
  const CACHE = 'horin-content';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  /* admin stores plain text; here it becomes safe HTML.
     Keys whose default is built of <p> keep paragraphs (blank line = new <p>) */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const isRich = (k) => /^<p>/.test(BASE.en[k] || '');
  function toHtml(k, plain) {
    const t = String(plain).replace(/\r\n?/g, '\n').trim();
    if (isRich(k)) {
      return t.split(/\n{2,}/).filter(Boolean)
        .map((par) => `<p>${esc(par).replace(/\n/g, '<br>')}</p>`).join('');
    }
    return esc(t).replace(/\n/g, '<br>');
  }

  /* overrides: { key: { pl, en } }, null/undefined = keep the default */
  function setOverrides(texts) {
    ['en', 'pl'].forEach((l) => {
      DICT[l] = { ...BASE[l] };
      Object.entries(texts || {}).forEach(([k, v]) => {
        if (!(k in BASE.en) || !v || v[l] == null) return;
        DICT[l][k] = toHtml(k, v[l]);
      });
    });
  }

  try {
    const cached = JSON.parse(store.get(CACHE) || 'null');
    if (cached && cached.texts) setOverrides(cached.texts);
  } catch { /* broken cache — defaults */ }

  let lang = store.get(KEY);
  if (!DICT[lang]) lang = 'en';

  const targets = () => [...document.querySelectorAll('[data-i18n], [data-i18n-ph]')];

  function apply(l = lang) {
    const d = DICT[l];
    document.documentElement.lang = l;
    targets().forEach((el) => {
      const k = el.dataset.i18n;
      if (k && d[k] != null && el.innerHTML !== d[k]) el.innerHTML = d[k];
      const pk = el.dataset.i18nPh;
      if (pk && d[pk] != null) el.placeholder = d[pk].replace(/<br>/g, ' ');
    });
    const title = d[`title.${document.body.dataset.page || 'index'}`];
    if (title) document.title = title.replace(/<[^>]+>/g, ' ');
    document.querySelectorAll('.ls-btn').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.lang === l);
    });
  }

  const dip = (v) => dispatchEvent(new CustomEvent('horin:langdip', { detail: v }));

  let busy = false;
  function setLang(l, instant) {
    if (l === lang || busy || !DICT[l]) return;
    lang = l;
    store.set(KEY, l);
    if (instant) { apply(l); dip(0); return; }
    busy = true;
    dip(1); // фото уходят вниз
    const els = targets();
    els.forEach((el) => {
      el.style.transition = 'opacity 0.38s ease';
      el.style.opacity = '0';
    });
    setTimeout(() => {
      apply(l);
      els.forEach((el) => { el.style.opacity = '1'; });
      setTimeout(() => {
        dip(0); // фото возвращаются
        els.forEach((el) => { el.style.transition = ''; el.style.opacity = ''; });
        busy = false;
      }, 420);
    }, 440);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.ls-btn');
    if (b) setLang(b.dataset.lang);
  });

  window.HORIN_I18N = {
    get lang() { return lang; },
    t: (k) => DICT[lang][k],
    apply,
    setLang,
    /* fresh content from Supabase (content.js) */
    setOverrides(texts) { setOverrides(texts); apply(); dip(0); },
    /* admin live preview: one unsaved value */
    preview(k, l, plain) {
      if (!(k in BASE.en) || !DICT[l]) return;
      DICT[l][k] = plain == null ? BASE[l][k] : toHtml(k, plain);
      if (l !== lang) setLang(l, true); else { apply(); dip(0); }
    },
  };

  apply(lang); // на загрузке — мгновенно, без анимации
})();
