/* HORIN — i18n EN/PL.
   EN живёт в разметке как дефолт (SEO), словарь подменяет innerHTML по
   data-i18n и placeholder по data-i18n-ph. Смена языка: тексты гаснут,
   спираль фото ныряет вниз (event 'horin:langdip' слушает scene.js),
   подмена, тексты проявляются, спираль поднимается. */

(() => {
  const DICT = {
    en: {
      'title.index': 'HORIN — Deformed in Concrete',
      'title.contact': 'Contact — HORIN',

      'hdr.project': 'Deformed<br>in concrete',
      'hdr.sub': 'Project',
      'nav.contact': 'Contact',
      'nav.collection': 'Collection',

      'hero.title': 'Deformed in&nbsp;concrete',
      'hero.by': 'Project by HORIN',
      'hero.no': 'Collection N°1',
      'hero.hint': 'Scroll to descend',

      'ch1.vertical': 'Deformed',
      'ch1.kicker': '01 / Collection',
      'ch1.title': 'In concrete',
      'ch1.text':
        'Tailoring cast under pressure. Shoulders are poured like formwork, ' +
        'waists fracture along the stress lines, hems carry the weight of the ' +
        'slab. The collection begins where the body meets the wall — and ' +
        'refuses to come out unchanged.',

      'ch2.vertical': 'Form',
      'ch2.kicker': '02 / Silhouette',
      'ch2.title': 'Under pressure',
      'ch2.text':
        'Cropped blazers with cantilevered shoulders. Trousers that flare like ' +
        'cracks running to the ground. Every look is a load-bearing structure: ' +
        'strict on the surface, deformed at the core.',

      'ch3.vertical': 'Raw',
      'ch3.kicker': '03 / Craft',
      'ch3.title': 'Surface &amp; seam',
      'ch3.text':
        'Dense wool, dry cotton, hardware stripped to zero. Seams stay exposed ' +
        'like rebar — the garment admits how it was built. Nothing decorative ' +
        'survives the pour.',

      'outro.kicker': 'The collection is a cast — see it in person',
      'outro.link': 'Contact',
      'outro.brand': 'HORIN — Deformed in concrete',

      'lb.close': 'Close',

      'c.vertical': 'Contact',
      'c.intro':
        'Collaborations, private orders, press &amp; showroom requests. ' +
        'Leave a message — the atelier replies personally.',
      'f.name': 'Name',
      'f.name.ph': 'Your name',
      'f.email': 'Email',
      'f.email.ph': 'you@mail.com',
      'f.subject': 'Subject',
      'pill.collab': 'Collaboration',
      'pill.order': 'Private order',
      'pill.press': 'Press',
      'pill.other': 'Other',
      'f.msg': 'Message',
      'f.msg.ph': 'Tell the atelier what you have in mind…',
      'f.send': 'Send <span class="s-arrow">→</span>',
      'f.note': 'HORIN atelier<br>Deformed in concrete — Collection N°1',
      'cs.title': 'Received',
      'cs.sub': 'The atelier will reply personally',
      'cs.back': 'Back to the collection',
    },

    pl: {
      'title.index': 'HORIN — Zdeformowane w betonie',
      'title.contact': 'Kontakt — HORIN',

      'hdr.project': 'Zdeformowane<br>w betonie',
      'hdr.sub': 'Projekt',
      'nav.contact': 'Kontakt',
      'nav.collection': 'Kolekcja',

      'hero.title': 'Zdeformowane w&nbsp;betonie',
      'hero.by': 'Projekt HORIN',
      'hero.no': 'Kolekcja N°1',
      'hero.hint': 'Przewiń, by zejść niżej',

      'ch1.vertical': 'Odlew',
      'ch1.kicker': '01 / Kolekcja',
      'ch1.title': 'W betonie',
      'ch1.text':
        'Krawiectwo odlane pod ciśnieniem. Ramiona wylane jak szalunek, ' +
        'talie pękają wzdłuż linii naprężeń, doły niosą ciężar płyty. ' +
        'Kolekcja zaczyna się tam, gdzie ciało spotyka ścianę — ' +
        'i odmawia wyjścia w niezmienionej formie.',

      'ch2.vertical': 'Forma',
      'ch2.kicker': '02 / Sylwetka',
      'ch2.title': 'Pod naciskiem',
      'ch2.text':
        'Skrócone żakiety ze wspornikowymi ramionami. Spodnie rozszerzające ' +
        'się jak pęknięcia biegnące ku ziemi. Każda sylwetka to konstrukcja ' +
        'nośna: surowa na powierzchni, zdeformowana w rdzeniu.',

      'ch3.vertical': 'Surowe',
      'ch3.kicker': '03 / Rzemiosło',
      'ch3.title': 'Powierzchnia i szew',
      'ch3.text':
        'Gęsta wełna, sucha bawełna, dodatki zredukowane do zera. Szwy ' +
        'zostają odsłonięte jak zbrojenie — ubranie przyznaje, jak zostało ' +
        'zbudowane. Nic dekoracyjnego nie przetrwa wylewki.',

      'outro.kicker': 'Kolekcja jest odlewem — zobacz ją na żywo',
      'outro.link': 'Kontakt',
      'outro.brand': 'HORIN — Zdeformowane w betonie',

      'lb.close': 'Zamknij',

      'c.vertical': 'Kontakt',
      'c.intro':
        'Współprace, zamówienia prywatne, prasa i showroom. ' +
        'Zostaw wiadomość — atelier odpowiada osobiście.',
      'f.name': 'Imię',
      'f.name.ph': 'Twoje imię',
      'f.email': 'E-mail',
      'f.email.ph': 'ty@mail.com',
      'f.subject': 'Temat',
      'pill.collab': 'Współpraca',
      'pill.order': 'Zamówienie prywatne',
      'pill.press': 'Prasa',
      'pill.other': 'Inne',
      'f.msg': 'Wiadomość',
      'f.msg.ph': 'Napisz atelier, co masz na myśli…',
      'f.send': 'Wyślij <span class="s-arrow">→</span>',
      'f.note': 'Atelier HORIN<br>Zdeformowane w betonie — Kolekcja N°1',
      'cs.title': 'Otrzymano',
      'cs.sub': 'Atelier odpowie osobiście',
      'cs.back': 'Wróć do kolekcji',
    },
  };

  const KEY = 'horin-lang';
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } },
  };

  let lang = store.get();
  if (!DICT[lang]) lang = 'en';

  const targets = () => [...document.querySelectorAll('[data-i18n], [data-i18n-ph]')];

  function apply(l) {
    const d = DICT[l];
    document.documentElement.lang = l;
    targets().forEach((el) => {
      const k = el.dataset.i18n;
      if (k && d[k] != null) el.innerHTML = d[k];
      const pk = el.dataset.i18nPh;
      if (pk && d[pk] != null) el.placeholder = d[pk];
    });
    const titleKey = document.body.classList.contains('contact-page')
      ? 'title.contact' : 'title.index';
    document.title = d[titleKey];
    document.querySelectorAll('.ls-btn').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.lang === l);
    });
  }

  const dip = (v) => dispatchEvent(new CustomEvent('horin:langdip', { detail: v }));

  let busy = false;
  function setLang(l) {
    if (l === lang || busy || !DICT[l]) return;
    busy = true;
    lang = l;
    store.set(l);
    dip(1); // спираль уходит вниз
    const els = targets();
    els.forEach((el) => {
      el.style.transition = 'opacity 0.38s ease';
      el.style.opacity = '0';
    });
    setTimeout(() => {
      apply(l);
      els.forEach((el) => { el.style.opacity = '1'; });
      setTimeout(() => {
        dip(0); // спираль возвращается
        els.forEach((el) => { el.style.transition = ''; el.style.opacity = ''; });
        busy = false;
      }, 420);
    }, 440);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.ls-btn');
    if (b) setLang(b.dataset.lang);
  });

  apply(lang); // на загрузке — мгновенно, без анимации
})();
