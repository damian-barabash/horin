/* HORIN — panel administracyjny (admin.html)
   Supabase: auth (jedno konto, tabela `admins`), `photos`, `texts`,
   `messages`, RPC `stats_overview`, bucket `media`, edge function `translate`
   (PL → EN przez Barabash AI). Strona publiczna czyta to samo przez
   RPC `site_content` (assets/js/content.js). */

const SB_URL = 'https://bprgedjtklowtmspimtr.supabase.co';
const SB_KEY = 'sb_publishable_OLN9-O4Y7c-u6QT4Ox4p2A_RN8Ard00';
const MEDIA = `${SB_URL}/storage/v1/object/public/media/`;

const sb = window.supabase.createClient(SB_URL, SB_KEY, {
  auth: { storageKey: 'horin-admin-auth', persistSession: true, autoRefreshToken: true },
});

/* ---------- tiny DOM helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k in n && k !== 'list') n[k] = v;
    else n.setAttribute(k, v);
  });
  kids.flat().forEach((c) => { if (c != null && c !== false) n.append(c); });
  return n;
}
function toast(msg, kind) {
  const t = el('div', { class: `toast${kind ? ` is-${kind}` : ''}`, text: msg });
  $('#toasts').append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 6000 : 3200);
}
const fail = (what, error) => {
  console.error(what, error);
  toast(`${what}: ${(error && error.message) || 'błąd'}`, 'bad');
};
async function busy(btn, fn) {
  btn.classList.add('is-busy');
  try { return await fn(); } finally { btn.classList.remove('is-busy'); }
}
const fmtDate = (iso) => new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- what lives where on the site ---------- */

const look = (k, name) => ({
  label: `Sylwetka ${k} — ${name}`,
  anchor: `lk${k}.title`,
  keys: [[`lk${k}.vertical`, 'Pionowe słowo obok tekstu'], [`lk${k}.kicker`, 'Nadtytuł'], [`lk${k}.title`, 'Tytuł'], [`lk${k}.text`, 'Opis sylwetki']],
});
const dwScene = (k) => ({
  label: `Scena ${k}`,
  anchor: `dw.s${k}.title`,
  keys: [[`dw.s${k}.vertical`, 'Pionowe słowo obok tekstu'], [`dw.s${k}.title`, 'Tytuł'], [`dw.s${k}.text`, 'Tekst sceny']],
});

const PAGES = [
  {
    id: 'index', label: 'Kolekcja', url: 'index.html',
    groups: [
      { label: 'Nagłówek i okładka', anchor: 'hero.title', keys: [
        ['hdr.project', 'Nazwa projektu — lewy górny róg (wszystkie strony kolekcji)'],
        ['hdr.sub', 'Podpis pod nazwą projektu'],
        ['hero.title', 'Duży tytuł na okładce'],
        ['hero.by', 'Podtytuł pod tytułem — lewy'],
        ['hero.no', 'Podtytuł pod tytułem — prawy'],
        ['hero.hint', 'Podpowiedź przewijania (prawy dolny róg)'],
        ['nav.contact', 'Link „Kontakt” w nagłówku (wspólny)'],
      ] },
      { label: 'Manifest kolekcji', anchor: 'man.title', keys: [
        ['man.vertical', 'Pionowe słowo obok tekstu'], ['man.kicker', 'Nadtytuł'], ['man.title', 'Tytuł'], ['man.text', 'Opis kolekcji'],
      ] },
      look(1, 'moduły'), look(2, 'geometria'), look(3, 'szarość'),
      look(4, 'inspiracje radzieckie'), look(5, 'konstrukcja'), look(6, 'asymetria'),
      { label: 'Zakończenie strony', anchor: 'outro.kicker', keys: [
        ['outro.kicker', 'Zdanie nad dużym linkiem'],
        ['outro.link', 'Duży link do kontaktu (wspólny z „Twój, Dawid”)'],
        ['outro.brand', 'Stopka — lewa strona'],
        ['lb.close', 'Przycisk zamknięcia powiększonego zdjęcia (wspólny)'],
      ] },
      { label: 'Karta przeglądarki', anchor: 'hero.title', keys: [['title.index', 'Tytuł karty / wyniku w Google']] },
    ],
  },
  {
    id: 'dawid', label: 'Twój, Dawid', url: 'twoj-dawid.html',
    groups: [
      { label: 'Nagłówek i okładka', anchor: 'dw.title', keys: [
        ['dw.hdr', 'Nazwa — lewy górny róg'],
        ['dw.hdr.sub', 'Podpis pod nazwą'],
        ['dw.kicker', 'Nadtytuł nad dużym tytułem'],
        ['dw.title', 'Duży tytuł (nazwa kostiumu)'],
        ['dw.hint', 'Podpowiedź przewijania'],
        ['nav.collection', 'Link „Kolekcja” w nagłówku (wspólny)'],
        ['dw.scene', 'Słowo przed numerem sceny'],
      ] },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map(dwScene),
      { label: 'Zakończenie strony', anchor: 'dw.outro.kicker', keys: [
        ['dw.outro.kicker', 'Zdanie nad dużym linkiem'], ['dw.outro.brand', 'Stopka — lewa strona'],
      ] },
      { label: 'Karta przeglądarki', anchor: 'dw.title', keys: [['title.dawid', 'Tytuł karty / wyniku w Google']] },
    ],
  },
  {
    id: 'contact', label: 'Kontakt', url: 'contact.html',
    groups: [
      { label: 'Wstęp', anchor: 'c.intro', keys: [['c.vertical', 'Pionowe słowo'], ['c.intro', 'Tekst nad formularzem']] },
      { label: 'Formularz', anchor: 'f.name', keys: [
        ['f.name', 'Pole 01 — etykieta'], ['f.name.ph', 'Pole 01 — podpowiedź w polu'],
        ['f.email', 'Pole 02 — etykieta'], ['f.email.ph', 'Pole 02 — podpowiedź w polu'],
        ['f.subject', 'Pole 03 — etykieta'],
        ['pill.collab', 'Temat 1'], ['pill.order', 'Temat 2'], ['pill.press', 'Temat 3'], ['pill.other', 'Temat 4'],
        ['f.msg', 'Pole 04 — etykieta'], ['f.msg.ph', 'Pole 04 — podpowiedź w polu'],
        ['f.send', 'Przycisk wysyłania'], ['f.note', 'Notka obok przycisku'],
        ['f.error', 'Komunikat: błąd wysyłki'], ['f.rate', 'Komunikat: zbyt wiele wiadomości'],
      ] },
      { label: 'Ekran po wysłaniu', anchor: 'c.intro', keys: [['cs.title', 'Tytuł'], ['cs.sub', 'Podpis'], ['cs.back', 'Link powrotu']] },
      { label: 'Karta przeglądarki', anchor: 'c.intro', keys: [['title.contact', 'Tytuł karty / wyniku w Google']] },
    ],
  },
];

/* names that stay identical in both languages — never auto-translated */
const NO_TR = new Set(['hdr.project', 'hero.title', 'outro.brand', 'dw.hdr', 'dw.title', 'dw.outro.brand', 'title.index', 'title.dawid', 'f.email.ph']);

const COLLECTIONS = {
  concrete: {
    label: 'Kolekcja — Deformed in Concrete', url: 'index.html', flat: false,
    sections: [1, 2, 3, 4, 5, 6].map((k) => ({ id: k, label: `Sylwetka ${k}`, anchor: `lk${k}.title` })),
  },
  dawid: {
    label: 'Twój, Dawid', url: 'twoj-dawid.html', flat: true, max: 16,
  },
};

/* ---------- state ---------- */

const state = {
  tab: 'pulpit',
  texts: {}, // key → row
  photos: [],
  messages: [],
  txPage: 'index',
  phCollection: 'concrete',
  msgFilter: 'new',
  statDays: 30,
  autoTr: localStorage.getItem('horin-admin-autotr') !== '0',
};

/* built-in dictionary → the plain text the admin edits */
const tmp = document.createElement('div');
function toPlain(html) {
  if (!html) return '';
  tmp.innerHTML = html.replace(/<br\s*\/?>/g, '\n');
  const ps = [...tmp.querySelectorAll('p')];
  return ps.length ? ps.map((p) => p.textContent).join('\n\n') : tmp.textContent;
}
const DEF = { pl: {}, en: {} };
['pl', 'en'].forEach((l) => Object.entries(window.HORIN_DICT[l]).forEach(([k, v]) => { DEF[l][k] = toPlain(v); }));
const isRich = (k) => /^<p>/.test(window.HORIN_DICT.en[k] || '');

const saved = (k, l) => {
  const row = state.texts[k];
  return row && row[l] != null ? row[l] : DEF[l][k];
};
const draft = {}; // key → { pl, en } while edited
const cur = (k, l) => (draft[k] && draft[k][l] != null ? draft[k][l] : saved(k, l));
const dirtyKeys = () => Object.keys(draft).filter((k) => cur(k, 'pl') !== saved(k, 'pl') || cur(k, 'en') !== saved(k, 'en'));
const isStale = (k) => {
  const row = state.texts[k];
  return !!row && saved(k, 'pl') !== (row.en_src != null ? row.en_src : DEF.pl[k]);
};

/* ---------- auth ---------- */

async function isAdmin() {
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true;
}

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (session && await isAdmin()) return showApp(session);
  if (session) await sb.auth.signOut();
  showLogin();
}

function showLogin() {
  try { localStorage.removeItem('horin-admin'); } catch { /* private mode */ }
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#login-email').focus();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  $('#login-err').textContent = '';
  await busy(btn, async () => {
    const { data, error } = await sb.auth.signInWithPassword({
      email: $('#login-email').value.trim(), password: $('#login-pass').value,
    });
    if (error) { $('#login-err').textContent = 'Nieprawidłowy e-mail lub hasło.'; return; }
    if (!(await isAdmin())) {
      await sb.auth.signOut();
      $('#login-err').textContent = 'To konto nie ma dostępu do panelu.';
      return;
    }
    $('#login-pass').value = '';
    showApp(data.session);
  });
});

$('#logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.hash = '';
  showLogin();
});

async function showApp(session) {
  // the admin's own visits are not counted in the statistics
  try { localStorage.setItem('horin-admin', '1'); } catch { /* private mode */ }
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#who').textContent = session.user.email;
  await Promise.all([loadTexts(), loadPhotos(), loadMessages()]);
  route();
}

/* ---------- data ---------- */

async function loadTexts() {
  const { data, error } = await sb.from('texts').select('*');
  if (error) return fail('Teksty', error);
  state.texts = Object.fromEntries(data.map((r) => [r.key, r]));
}
async function loadPhotos() {
  const { data, error } = await sb.from('photos').select('*')
    .order('collection').order('section').order('sort').order('created_at');
  if (error) return fail('Zdjęcia', error);
  state.photos = data;
}
async function loadMessages() {
  const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return fail('Zgłoszenia', error);
  state.messages = data;
  const n = data.filter((m) => !m.read_at && !m.archived).length;
  $('#badge-msg').hidden = n === 0;
  $('#badge-msg').textContent = n;
}

async function translate(text, from = 'pl', to = 'en') {
  const { data, error } = await sb.functions.invoke('translate', { body: { text, from, to } });
  if (error || !data || typeof data.text !== 'string') throw new Error('Serwer tłumaczeń nie odpowiada');
  return data.text;
}

/* ---------- live preview pane ---------- */

const preview = {
  url: null, ready: false, pending: null, device: 'desktop',
  frame: $('#pv-iframe'),
  open(url, key) {
    $('#app').classList.add('has-preview');
    $('#preview').hidden = false;
    if (this.url !== url) {
      this.url = url;
      this.ready = false;
      this.pending = key || null;
      this.frame.src = `${url}?preview=1`;
    } else if (key) this.goto(key);
    this.fit();
  },
  close() {
    $('#app').classList.remove('has-preview', 'pv-open');
    $('#preview').hidden = true;
  },
  reload(key) {
    if (!this.url) return;
    this.ready = false;
    this.pending = key || this.pending;
    this.frame.src = `${this.url}?preview=1&t=${Date.now()}`;
  },
  post(msg) {
    if (this.ready && this.frame.contentWindow) this.frame.contentWindow.postMessage(msg, location.origin);
  },
  goto(key) {
    this.pending = key;
    this.post({ t: 'horin:goto', key });
  },
  /* the page renders at a real viewport size and is scaled into the pane */
  fit() {
    const stage = $('#pv-stage');
    const frame = $('#pv-frame');
    const [w, h] = this.device === 'mobile' ? [390, 800] : [1360, 850];
    const room = $('#preview').clientHeight - 150; // bar + note + paddings
    const k = Math.min(stage.clientWidth / w, room / h) || 0.3;
    stage.style.height = `${Math.round(h * k)}px`;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.transform = `translateX(-50%) scale(${k})`;
  },
};
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.t !== 'horin:ready') return;
  preview.ready = true;
  if (preview.pending) preview.post({ t: 'horin:goto', key: preview.pending });
});
addEventListener('resize', () => preview.fit());
$('#pv-device').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  preview.device = b.dataset.device;
  [...$('#pv-device').children].forEach((x) => x.classList.toggle('is-on', x === b));
  preview.fit();
  preview.reload();
});
$('#pv-reload').addEventListener('click', () => preview.reload());

const pvToggle = () => el('button', {
  class: 'btn btn-sm pv-toggle', type: 'button', text: 'Podgląd',
  onclick: () => { $('#app').classList.add('pv-open'); preview.fit(); },
});
$('.pv-bar').append(el('button', {
  class: 'link pv-close', type: 'button', text: 'Zamknij',
  onclick: () => $('#app').classList.remove('pv-open'),
}));

/* ---------- router ---------- */

const TABS = { pulpit: viewDashboard, zdjecia: viewPhotos, teksty: viewTexts, zgloszenia: viewMessages, statystyki: viewStats, ustawienia: viewSettings };

function route() {
  const tab = location.hash.slice(1);
  state.tab = TABS[tab] ? tab : 'pulpit';
  [...$('#nav').children].forEach((a) => a.classList.toggle('is-on', a.dataset.tab === state.tab));
  if (state.tab !== 'zdjecia' && state.tab !== 'teksty') preview.close();
  $('#main').scrollTop = 0;
  TABS[state.tab]();
  renderSavebar();
}
addEventListener('hashchange', () => { if (!$('#app').hidden) route(); });
addEventListener('beforeunload', (e) => { if (dirtyKeys().length) e.preventDefault(); });

const main = () => $('#main');
function page(title, lead, ...actions) {
  main().replaceChildren(el('div', { class: 'page-head' },
    el('div', null, el('h1', { text: title }), lead && el('p', { text: lead })),
    el('div', { class: 'row' }, actions)));
}

/* ============================================================
   PULPIT
   ============================================================ */

async function viewDashboard() {
  page('Pulpit', 'Stan strony horin.pl w skrócie.');
  const unread = state.messages.filter((m) => !m.read_at && !m.archived);
  const cards = el('div', { class: 'grid-cards' });
  const stat = (n, label, sub) => el('div', { class: 'stat' }, el('b', { text: n }), el('span', { text: label }), sub && el('small', { text: sub }));
  cards.append(
    stat(unread.length, 'nowe zgłoszenia'),
    stat('…', 'wizyty dziś'),
    stat('…', 'wizyty — 7 dni'),
    stat(state.photos.length, 'zdjęć na stronie',
      `kolekcja ${state.photos.filter((p) => p.collection === 'concrete').length} · Dawid ${state.photos.filter((p) => p.collection === 'dawid').length}`),
  );
  main().append(cards);

  const stale = Object.keys(state.texts).filter((k) => k in DEF.pl && isStale(k)).length;
  const box = el('div', { class: 'card' },
    el('div', { class: 'card-head' }, el('h2', { text: 'Do zrobienia' })),
    el('div', { class: 'kv' },
      unread.length
        ? el('a', { href: '#zgloszenia', text: `Odpowiedz na ${unread.length} nowe zgłoszenia →` })
        : el('span', { class: 'muted', text: 'Brak nowych zgłoszeń.' }),
      stale
        ? el('a', { href: '#teksty', text: `${stale} tekstów ma nieaktualne tłumaczenie EN →` })
        : el('span', { class: 'muted', text: 'Tłumaczenia EN są aktualne.' })));
  main().append(box);

  if (unread.length) {
    main().append(el('div', { class: 'card' },
      el('div', { class: 'card-head' }, el('h2', { text: 'Ostatnie zgłoszenia' }), el('a', { href: '#zgloszenia', class: 'link', text: 'Wszystkie' })),
      unread.slice(0, 4).map((m) => el('div', { class: 'msg' }, el('a', { class: 'msg-head', href: '#zgloszenia', style: 'text-decoration:none' },
        el('span', { class: 'msg-dot' }), el('span', { class: 'msg-from', text: m.name }),
        el('span', { class: 'msg-snip', text: m.message }), el('span', { class: 'msg-date', text: fmtDate(m.created_at) }))))));
  }

  const { data, error } = await sb.rpc('stats_overview', { p_days: 7 });
  if (error || state.tab !== 'pulpit') return;
  cards.children[1].firstChild.textContent = data.today.views;
  cards.children[1].append(el('small', { text: `${data.today.visitors} odwiedzających` }));
  cards.children[2].firstChild.textContent = data.window.views;
  cards.children[2].append(el('small', { text: `${data.window.visitors} odwiedzających` }));
}

/* ============================================================
   ZDJĘCIA
   ============================================================ */

const photosOf = (c) => state.photos.filter((p) => p.collection === c);
const thumb = (p) => p.src;

/* schematic of the real layout: the same slot maths as scene.js / dawid.js */
function miniConcrete(list) {
  const box = el('div', { class: 'mini' });
  list.forEach((p, j) => {
    const side = j % 2 === 0 ? -1 : 1;
    const rank = Math.floor(j / 2);
    const nx = side * (0.74 + rank * 0.055);
    const ny = Math.sin(j * 1.7) * 0.48 - 0.07;
    box.append(el('img', {
      src: thumb(p), alt: '', loading: 'lazy',
      style: `left:${(nx + 1) * 50}%;top:${(1 - ny) * 50}%;width:${Math.max(6, 18 - rank * 1.6)}%;z-index:${20 - rank}`,
    }));
  });
  box.append(el('div', { class: 'mini-text', style: 'left:34%;right:34%;top:38%' }, el('i'), el('i'), el('i'), el('i')));
  return box;
}
function miniDawid(pair) {
  const box = el('div', { class: 'mini is-dawid' });
  pair.forEach((p, j) => box.append(el('img', {
    src: thumb(p), alt: '', loading: 'lazy',
    style: `left:${j === 0 ? 14 : 36}%;top:${j === 0 ? 47 : 55}%;width:19%;aspect-ratio:${p.w && p.h ? `${p.w}/${p.h}` : '3/4'}`,
  })));
  box.append(el('div', { class: 'mini-text', style: 'left:56%;right:6%;top:40%' }, el('i'), el('i'), el('i')));
  return box;
}

let dragId = null;

function photoCard(p, n, c) {
  const card = el('div', { class: 'ph', draggable: true, dataset: { id: p.id }, title: 'Przeciągnij, aby zmienić kolejność' },
    el('img', { src: thumb(p), alt: '', loading: 'lazy' }),
    el('span', { class: 'ph-n', text: n }),
    el('div', { class: 'ph-tools' },
      el('button', { type: 'button', text: '←', 'aria-label': 'Przesuń wcześniej', onclick: () => nudge(c, p.id, -1) }),
      el('button', { type: 'button', class: 'del', text: '×', 'aria-label': 'Usuń zdjęcie', onclick: () => removePhoto(p) }),
      el('button', { type: 'button', text: '→', 'aria-label': 'Przesuń dalej', onclick: () => nudge(c, p.id, 1) })));
  card.addEventListener('dragstart', (e) => {
    dragId = p.id;
    card.classList.add('is-drag');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', p.id);
  });
  card.addEventListener('dragend', () => { dragId = null; card.classList.remove('is-drag'); });
  card.addEventListener('dragover', (e) => { if (dragId && dragId !== p.id) { e.preventDefault(); card.classList.add('is-target'); } });
  card.addEventListener('dragleave', () => card.classList.remove('is-target'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('is-target');
    if (dragId && dragId !== p.id) movePhoto(c, dragId, p.id, null);
  });
  return card;
}

function dropZone(c, section) {
  const input = el('input', { type: 'file', accept: 'image/*', multiple: true });
  input.addEventListener('change', () => { uploadPhotos(c, section, [...input.files]); input.value = ''; });
  return el('label', { class: 'drop' }, input, el('span', { text: '+ Dodaj zdjęcia' }));
}

function gridFor(c, section, cards) {
  const grid = el('div', { class: 'ph-grid' }, cards, dropZone(c, section));
  grid.addEventListener('dragover', (e) => {
    if (!dragId && ![...(e.dataTransfer.types || [])].includes('Files')) return;
    e.preventDefault();
    grid.classList.add('is-over');
  });
  grid.addEventListener('dragleave', () => grid.classList.remove('is-over'));
  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    grid.classList.remove('is-over');
    if (dragId) { movePhoto(c, dragId, null, section); return; }
    // files dragged in from the desktop
    const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) uploadPhotos(c, section, files);
  });
  return grid;
}

function viewPhotos() {
  const c = state.phCollection;
  const cfg = COLLECTIONS[c];
  const seg = el('div', { class: 'seg' }, Object.entries(COLLECTIONS).map(([id, x]) => el('button', {
    type: 'button', class: id === c ? 'is-on' : '', text: x.label,
    onclick: () => { state.phCollection = id; viewPhotos(); },
  })));
  page('Zdjęcia',
    'Przeciągnij zdjęcie, aby zmienić jego miejsce — kolejność zapisuje się od razu. Nowe pliki są automatycznie zamieniane na WebP. Schemat obok pokazuje, gdzie zdjęcia stoją na stronie.',
    pvToggle());
  main().append(el('div', { class: 'row', style: 'margin-bottom:16px' }, seg));
  preview.open(cfg.url);

  const list = photosOf(c);
  const title = (key) => cur(key, 'pl') || '';
  const showBtn = (anchor) => el('button', {
    class: 'btn btn-sm', type: 'button', text: 'Pokaż na stronie',
    onclick: () => { preview.goto(anchor); $('#app').classList.add('pv-open'); preview.fit(); },
  });

  if (cfg.flat) {
    main().append(el('p', { class: 'muted', style: 'margin-bottom:14px', text: `Zdjęcia łączą się w pary: 1 + 2 to scena 1, 3 + 4 to scena 2 itd. Maksymalnie ${cfg.max} zdjęć (8 scen). Na okładce wszystkie wystają z dolnej krawędzi ekranu.` }));
    const scenes = Math.max(1, Math.ceil(list.length / 2));
    for (let k = 0; k < scenes; k++) {
      const pair = list.slice(k * 2, k * 2 + 2);
      const last = k === scenes - 1;
      main().append(el('section', { class: 'card ph-section' },
        el('div', { class: 'card-head' },
          el('h2', { text: `Scena ${k + 1}${title(`dw.s${k + 1}.title`) ? ` — ${title(`dw.s${k + 1}.title`)}` : ''}` }),
          showBtn(`dw.s${k + 1}.title`)),
        el('div', { class: 'ph-layout' },
          gridForFlat(c, pair.map((p, j) => photoCard(p, k * 2 + j + 1, c)), last && list.length < cfg.max),
          el('div', { class: 'mini-wrap' }, el('span', { text: 'Układ na stronie' }), miniDawid(pair)))));
    }
    return;
  }

  cfg.sections.forEach((s) => {
    const inLook = list.filter((p) => p.section === s.id);
    main().append(el('section', { class: 'card ph-section' },
      el('div', { class: 'card-head' },
        el('h2', { text: `${s.label}${title(s.anchor) ? ` — ${title(s.anchor)}` : ''}` }),
        el('div', { class: 'row' }, el('span', { class: 'tag', text: `${inLook.length} zdjęć` }), showBtn(s.anchor))),
      el('div', { class: 'ph-layout' },
        gridFor(c, s.id, inLook.map((p, i) => photoCard(p, i + 1, c))),
        el('div', { class: 'mini-wrap' }, el('span', { text: 'Układ na stronie' }), miniConcrete(inLook)))));
  });
}

function gridForFlat(c, cards, withDrop) {
  const grid = el('div', { class: 'ph-grid' }, cards, withDrop && dropZone(c, null));
  grid.addEventListener('dragover', (e) => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
  grid.addEventListener('drop', (e) => {
    const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); uploadPhotos(c, null, files); }
  });
  return grid;
}

/* ordered groups of one collection: { sectionId: [photo, …] } (flat = one group) */
function groupsOf(c) {
  const list = photosOf(c);
  if (COLLECTIONS[c].flat) return { 0: list };
  const g = {};
  COLLECTIONS[c].sections.forEach((s) => { g[s.id] = list.filter((p) => p.section === s.id); });
  return g;
}

/* write section/sort back after any reorder; only changed rows are sent */
async function persistOrder(c, groups) {
  const changed = [];
  const ordered = [];
  Object.entries(groups).forEach(([sid, list]) => list.forEach((p, i) => {
    const flat = COLLECTIONS[c].flat;
    const section = flat ? Math.floor(i / 2) + 1 : Number(sid);
    if (p.section !== section || p.sort !== i) { p.section = section; p.sort = i; changed.push(p); }
    ordered.push(p);
  }));
  state.photos = [...state.photos.filter((p) => p.collection !== c), ...ordered];
  viewPhotos();
  if (!changed.length) return;
  const { error } = await sb.from('photos').upsert(changed);
  if (error) { fail('Kolejność zdjęć', error); await loadPhotos(); viewPhotos(); return; }
  toast('Kolejność zapisana', 'ok');
  preview.reload();
}

function movePhoto(c, id, beforeId, toSection) {
  const groups = groupsOf(c);
  let moved;
  Object.values(groups).forEach((list) => {
    const i = list.findIndex((p) => p.id === id);
    if (i >= 0) [moved] = list.splice(i, 1);
  });
  if (!moved) return;
  if (beforeId) {
    Object.values(groups).forEach((list) => {
      const i = list.findIndex((p) => p.id === beforeId);
      if (i >= 0) list.splice(i, 0, moved);
    });
  } else {
    (groups[toSection] || groups[0]).push(moved);
  }
  persistOrder(c, groups);
}

/* ← / → buttons: one step in reading order, crossing into the next look */
function nudge(c, id, dir) {
  const groups = groupsOf(c);
  const ids = Object.keys(groups);
  for (let g = 0; g < ids.length; g++) {
    const list = groups[ids[g]];
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) continue;
    const j = i + dir;
    if (j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
    } else if (dir < 0 && g > 0) {
      groups[ids[g - 1]].push(list.splice(i, 1)[0]);
    } else if (dir > 0 && g < ids.length - 1) {
      groups[ids[g + 1]].unshift(list.splice(i, 1)[0]);
    } else return;
    persistOrder(c, groups);
    return;
  }
}

async function removePhoto(p) {
  if (!confirm('Usunąć to zdjęcie ze strony?')) return;
  const { error } = await sb.from('photos').delete().eq('id', p.id);
  if (error) return fail('Usuwanie', error);
  const own = [p.src, p.full_src].filter((u) => u.startsWith(MEDIA)).map((u) => u.slice(MEDIA.length));
  if (own.length) await sb.storage.from('media').remove(own);
  state.photos = state.photos.filter((x) => x.id !== p.id);
  await persistOrder(p.collection, groupsOf(p.collection));
  toast('Zdjęcie usunięte', 'ok');
  preview.reload();
}

/* canvas → WebP. Safari's canvas cannot encode WebP (it silently returns
   PNG), so there the libwebp wasm encoder is loaded instead */
async function toWebp(canvas, quality) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (blob && blob.type === 'image/webp' && !window.HORIN_FORCE_WASM_WEBP) return blob;
  const { encodeWebp } = await import('../vendor/webp-enc.js');
  const ctx = canvas.getContext('2d');
  return encodeWebp(ctx.getImageData(0, 0, canvas.width, canvas.height), Math.round(quality * 100));
}

/* display + full versions. Collection photos are cut to 2:3 (the 3D spiral
   uses one plane size); Dawid photos keep their own proportions */
async function renderVersions(file, c) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const draw = (w, h, sx, sy, sw, sh) => {
    const cv = el('canvas', { width: w, height: h });
    cv.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    return cv;
  };
  const fit = (max) => {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    return draw(Math.round(bmp.width * k), Math.round(bmp.height * k), 0, 0, bmp.width, bmp.height);
  };
  let small;
  if (c === 'concrete') {
    const ar = 2 / 3;
    const sw = Math.min(bmp.width, bmp.height * ar);
    const sh = sw / ar;
    const h = Math.min(1080, Math.round(sh));
    small = draw(Math.round(h * ar), h, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh);
  } else small = fit(1080);
  const big = fit(1920);
  const out = {
    small: await toWebp(small, 0.82), full: await toWebp(big, 0.8), w: small.width, h: small.height,
  };
  bmp.close();
  return out;
}

async function uploadPhotos(c, section, files) {
  const cfg = COLLECTIONS[c];
  let room = cfg.max ? cfg.max - photosOf(c).length : Infinity;
  if (room <= 0) return toast(`Limit: ${cfg.max} zdjęć. Usuń któreś, aby dodać nowe.`, 'bad');
  let done = 0;
  for (const file of files) {
    if (room-- <= 0) { toast(`Limit ${cfg.max} zdjęć — część plików pominięto.`, 'bad'); break; }
    toast(`Przetwarzam ${file.name}…`);
    try {
      const v = await renderVersions(file, c);
      const base = `${c}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const opts = { contentType: 'image/webp', cacheControl: '31536000' };
      const up1 = await sb.storage.from('media').upload(`${base}.webp`, v.small, opts);
      if (up1.error) throw up1.error;
      const up2 = await sb.storage.from('media').upload(`${base}-full.webp`, v.full, opts);
      if (up2.error) throw up2.error;
      const list = photosOf(c);
      const inSection = cfg.flat ? list : list.filter((p) => p.section === section);
      const { data, error } = await sb.from('photos').insert({
        collection: c,
        section: cfg.flat ? Math.floor(list.length / 2) + 1 : section,
        sort: inSection.length,
        src: `${MEDIA}${base}.webp`,
        full_src: `${MEDIA}${base}-full.webp`,
        w: v.w, h: v.h,
      }).select().single();
      if (error) throw error;
      state.photos.push(data);
      done++;
    } catch (err) {
      fail(`Nie udało się dodać ${file.name}`, err && err.name === 'InvalidStateError' ? { message: 'nieobsługiwany format — użyj JPG, PNG lub WebP' } : err);
    }
  }
  if (done) {
    toast(done === 1 ? 'Zdjęcie dodane (WebP)' : `Dodano ${done} zdjęć (WebP)`, 'ok');
    if (state.tab === 'zdjecia') viewPhotos();
    preview.reload();
  }
}

/* ============================================================
   TEKSTY
   ============================================================ */

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight + 2}px`;
}

function viewTexts() {
  const pg = PAGES.find((x) => x.id === state.txPage);
  const seg = el('div', { class: 'seg' }, PAGES.map((x) => el('button', {
    type: 'button', class: x.id === pg.id ? 'is-on' : '', text: x.label,
    onclick: () => { state.txPage = x.id; viewTexts(); },
  })));
  const auto = el('label', { class: 'row', style: 'gap:8px;cursor:pointer' },
    el('input', {
      type: 'checkbox', checked: state.autoTr,
      onchange: (e) => { state.autoTr = e.target.checked; localStorage.setItem('horin-admin-autotr', state.autoTr ? '1' : '0'); },
    }),
    el('span', { text: 'Przy zapisie tłumacz automatycznie PL → EN' }));

  page('Teksty',
    'Pisz po polsku — wersję angielską przygotuje tłumacz AI (możesz ją poprawić ręcznie). Kliknij pole, a podgląd przewinie stronę do miejsca, w którym ten tekst stoi.',
    pvToggle());
  main().append(el('div', { class: 'row', style: 'margin-bottom:16px;justify-content:space-between' }, seg, auto));
  preview.open(pg.url);

  pg.groups.forEach((g, gi) => {
    const fields = el('div', { class: 'tx-fields' });
    g.keys.forEach(([key, where]) => fields.append(textField(key, where, g)));
    const changed = g.keys.filter(([k]) => state.texts[k]).length;
    const stale = g.keys.filter(([k]) => isStale(k)).length;
    const det = el('details', { class: 'card tx-group', open: gi === 0 },
      el('summary', null,
        el('h3', { text: g.label }),
        stale ? el('span', { class: 'tag tag-warn', text: `EN nieaktualne: ${stale}` }) : null,
        changed ? el('span', { class: 'tag', text: `zmienione: ${changed}` }) : null),
      fields,
      el('div', { class: 'tx-actions', style: 'margin-top:16px' },
        el('button', {
          class: 'btn btn-ai btn-sm', type: 'button', text: 'Przetłumacz całą sekcję PL → EN',
          onclick: (e) => busy(e.target, () => translateGroup(g)),
        })));
    det.addEventListener('toggle', () => {
      if (!det.open) return;
      det.querySelectorAll('textarea').forEach(autosize);
      preview.goto(g.anchor);
    });
    main().append(det);
  });
  main().querySelectorAll('details[open] textarea').forEach(autosize);
  renderSavebar();
}

function textField(key, where, group) {
  const rich = isRich(key);
  const mk = (l) => {
    const ta = el('textarea', {
      rows: rich ? 5 : 1, value: cur(key, l), lang: l, dataset: { key, lang: l },
      spellcheck: true,
      class: cur(key, l) !== saved(key, l) ? 'is-dirty' : '',
    });
    ta.addEventListener('focus', () => {
      preview.post({ t: 'horin:lang', lang: l });
      // keys without a visible element (tab title, placeholders) → show the block
      preview.goto(/^title\.|\.ph$|^f\.(error|rate)$/.test(key) ? group.anchor : key);
    });
    ta.addEventListener('input', () => {
      draft[key] = draft[key] || {};
      draft[key][l] = ta.value;
      ta.classList.toggle('is-dirty', ta.value !== saved(key, l));
      autosize(ta);
      preview.post({ t: 'horin:text', key, lang: l, value: ta.value });
      renderSavebar();
    });
    return ta;
  };
  const pl = mk('pl');
  const en = mk('en');
  const tags = el('span', { class: 'row', style: 'gap:6px' });
  const paintTags = () => {
    tags.replaceChildren(...[
      state.texts[key] && el('span', { class: 'tag', text: 'zmienione' }),
      isStale(key) && el('span', { class: 'tag tag-warn', text: 'EN nieaktualne' }),
      NO_TR.has(key) && el('span', { class: 'tag', text: 'nazwa własna — bez tłumaczenia' }),
      rich && el('span', { class: 'tag', text: 'pusta linia = nowy akapit' }),
    ].filter(Boolean));
  };
  paintTags();
  const field = el('div', { class: 'tx-field', dataset: { key } },
    el('div', { class: 'tx-meta' }, el('b', { text: where }), tags),
    el('div', { class: 'tx-cols' },
      el('div', { class: 'tx-col' }, el('span', { text: 'PL' }), pl),
      el('div', { class: 'tx-col' }, el('span', { text: 'EN' }), en)),
    el('div', { class: 'tx-actions' },
      el('button', {
        class: 'btn btn-ai btn-sm', type: 'button', text: 'Przetłumacz PL → EN',
        onclick: (e) => busy(e.target, async () => {
          try { setDraft(key, 'en', await translate(pl.value)); } catch (err) { fail('Tłumaczenie', err); }
        }),
      }),
      el('button', {
        class: 'link', type: 'button', text: 'Przywróć tekst domyślny',
        onclick: () => { setDraft(key, 'pl', DEF.pl[key]); setDraft(key, 'en', DEF.en[key]); },
      })));
  field.paintTags = paintTags;
  return field;
}

/* set a value programmatically (translation / reset) and refresh the field */
function setDraft(key, l, value) {
  draft[key] = draft[key] || {};
  draft[key][l] = value;
  const ta = main().querySelector(`textarea[data-key="${CSS.escape(key)}"][data-lang="${l}"]`);
  if (ta) {
    ta.value = value;
    ta.classList.toggle('is-dirty', value !== saved(key, l));
    autosize(ta);
  }
  preview.post({ t: 'horin:text', key, lang: l, value });
  renderSavebar();
}

async function translateGroup(g) {
  let n = 0;
  for (const [key] of g.keys) {
    if (NO_TR.has(key) || !cur(key, 'pl').trim()) continue;
    try { setDraft(key, 'en', await translate(cur(key, 'pl'))); n++; } catch (err) { fail('Tłumaczenie', err); break; }
  }
  if (n) toast(`Przetłumaczono ${n} pól — sprawdź i zapisz`, 'ok');
}

function renderSavebar() {
  const n = dirtyKeys().length;
  let bar = $('.savebar');
  if (!n || state.tab !== 'teksty') { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = el('div', { class: 'savebar' },
      el('span', { class: 'sb-n' }),
      el('button', { class: 'link', type: 'button', text: 'Odrzuć', onclick: discardTexts }),
      el('button', { class: 'btn btn-primary', type: 'button', text: 'Zapisz zmiany', onclick: (e) => busy(e.target, saveTexts) }));
    document.body.append(bar);
  }
  bar.querySelector('.sb-n').textContent = `Niezapisane zmiany: ${n}`;
}

function discardTexts() {
  Object.keys(draft).forEach((k) => delete draft[k]);
  viewTexts();
  preview.reload();
}

async function saveTexts() {
  const keys = dirtyKeys();
  const upserts = [];
  const deletes = [];
  for (const key of keys) {
    const pl = cur(key, 'pl');
    let en = cur(key, 'en');
    const plChanged = pl !== saved(key, 'pl');
    const enChanged = en !== saved(key, 'en');
    let enSrc = state.texts[key] ? state.texts[key].en_src : null;
    if (enChanged) enSrc = pl;
    else if (plChanged && state.autoTr && !NO_TR.has(key) && pl.trim()) {
      try {
        en = await translate(pl);
        setDraft(key, 'en', en);
        enSrc = pl;
      } catch (err) {
        toast('Tłumacz AI nie odpowiada — zapisuję tylko wersję PL, EN oznaczam jako nieaktualne.', 'bad');
      }
    } else if (plChanged && NO_TR.has(key)) enSrc = pl;
    const row = {
      key,
      pl: pl === DEF.pl[key] ? null : pl,
      en: en === DEF.en[key] ? null : en,
      en_src: enSrc,
      updated_at: new Date().toISOString(),
    };
    if (row.pl == null && row.en == null) deletes.push(key);
    else upserts.push(row);
  }
  if (upserts.length) {
    const { error } = await sb.from('texts').upsert(upserts);
    if (error) return fail('Zapis tekstów', error);
  }
  if (deletes.length) {
    const { error } = await sb.from('texts').delete().in('key', deletes);
    if (error) return fail('Zapis tekstów', error);
  }
  upserts.forEach((r) => { state.texts[r.key] = r; });
  deletes.forEach((k) => { delete state.texts[k]; });
  Object.keys(draft).forEach((k) => delete draft[k]);
  toast(`Zapisano (${keys.length}) — zmiany są już na stronie`, 'ok');
  const open = [...main().querySelectorAll('details')].map((d) => d.open);
  const top = main().scrollTop;
  viewTexts();
  [...main().querySelectorAll('details')].forEach((d, i) => { d.open = open[i]; });
  main().querySelectorAll('details[open] textarea').forEach(autosize);
  main().scrollTop = top;
  preview.reload();
}

/* ============================================================
   ZGŁOSZENIA
   ============================================================ */

function viewMessages() {
  const filters = { new: 'Nowe', all: 'Wszystkie', archive: 'Archiwum' };
  const seg = el('div', { class: 'seg' }, Object.entries(filters).map(([id, label]) => el('button', {
    type: 'button', class: id === state.msgFilter ? 'is-on' : '', text: label,
    onclick: () => { state.msgFilter = id; viewMessages(); },
  })));
  page('Zgłoszenia', 'Wiadomości wysłane przez formularz kontaktowy na stronie.',
    el('button', { class: 'btn btn-sm', type: 'button', text: 'Odśwież', onclick: async () => { await loadMessages(); viewMessages(); } }),
    el('button', { class: 'btn btn-sm', type: 'button', text: 'Eksport CSV', onclick: exportCsv }));
  main().append(el('div', { class: 'row', style: 'margin-bottom:16px' }, seg));

  const list = state.messages.filter((m) => (state.msgFilter === 'archive' ? m.archived
    : state.msgFilter === 'new' ? !m.archived && !m.read_at : !m.archived));
  if (!list.length) {
    main().append(el('div', { class: 'empty', text: state.msgFilter === 'new' ? 'Brak nowych zgłoszeń.' : 'Brak wiadomości.' }));
    return;
  }
  const card = el('div', { class: 'card' });
  list.forEach((m) => card.append(messageRow(m)));
  main().append(card);
}

function messageRow(m) {
  const body = el('div', { class: 'msg-body', hidden: true });
  const row = el('div', { class: `msg${m.read_at ? ' is-read' : ''}` });
  const patch = async (fields, done) => {
    const { error } = await sb.from('messages').update(fields).eq('id', m.id);
    if (error) return fail('Zgłoszenie', error);
    Object.assign(m, fields);
    await loadMessages();
    if (done) done();
  };
  const head = el('button', {
    class: 'msg-head', type: 'button',
    onclick: () => {
      body.hidden = !body.hidden;
      if (!body.hidden && !m.read_at) patch({ read_at: new Date().toISOString() }, () => row.classList.add('is-read'));
    },
  },
  el('span', { class: 'msg-dot' }),
  el('span', { class: 'msg-from', text: m.name }),
  el('span', { class: 'msg-snip', text: `${m.topic ? `${m.topic} — ` : ''}${m.message}` }),
  el('span', { class: 'msg-date', text: fmtDate(m.created_at) }));

  const subject = encodeURIComponent(`HORIN — ${m.topic || 'odpowiedź'}`);
  body.append(
    el('div', { class: 'row' },
      el('a', { href: `mailto:${m.email}`, text: m.email }),
      m.topic && el('span', { class: 'tag tag-violet', text: m.topic }),
      m.lang && el('span', { class: 'tag', text: m.lang.toUpperCase() })),
    el('div', { class: 'msg-text', text: m.message }),
    el('div', { class: 'row' },
      el('a', { class: 'btn btn-primary btn-sm', href: `mailto:${m.email}?subject=${subject}`, text: 'Odpowiedz e-mailem' }),
      el('button', { class: 'btn btn-sm', type: 'button', text: 'Oznacz jako nieprzeczytane', onclick: () => patch({ read_at: null }, viewMessages) }),
      el('button', { class: 'btn btn-sm', type: 'button', text: m.archived ? 'Przywróć z archiwum' : 'Archiwizuj', onclick: () => patch({ archived: !m.archived }, viewMessages) }),
      el('button', {
        class: 'btn btn-sm btn-danger', type: 'button', text: 'Usuń',
        onclick: async () => {
          if (!confirm('Usunąć tę wiadomość na stałe?')) return;
          const { error } = await sb.from('messages').delete().eq('id', m.id);
          if (error) return fail('Usuwanie', error);
          await loadMessages();
          viewMessages();
        },
      })));
  row.append(head, body);
  return row;
}

function exportCsv() {
  const cell = (v) => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no formula injection in spreadsheets
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = [['data', 'imię', 'e-mail', 'temat', 'wiadomość', 'język', 'przeczytane', 'archiwum']]
    .concat(state.messages.map((m) => [m.created_at, m.name, m.email, m.topic, m.message, m.lang, m.read_at ? 'tak' : 'nie', m.archived ? 'tak' : 'nie']));
  const blob = new Blob([`﻿${rows.map((r) => r.map(cell).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `horin-zgloszenia-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ============================================================
   STATYSTYKI
   ============================================================ */

const PAGE_NAMES = { index: 'Kolekcja', dawid: 'Twój, Dawid', contact: 'Kontakt' };

async function viewStats() {
  const seg = el('div', { class: 'seg' }, [7, 30, 90].map((d) => el('button', {
    type: 'button', class: d === state.statDays ? 'is-on' : '', text: `${d} dni`,
    onclick: () => { state.statDays = d; viewStats(); },
  })));
  page('Statystyki', 'Odwiedziny strony liczone bez plików cookie i bez danych osobowych. Twoje wizyty po zalogowaniu do panelu nie są liczone.', seg);
  const { data, error } = await sb.rpc('stats_overview', { p_days: state.statDays });
  if (error) return fail('Statystyki', error);
  if (state.tab !== 'statystyki') return;

  const stat = (o, label) => el('div', { class: 'stat' }, el('b', { text: o.views }), el('span', { text: label }), el('small', { text: `${o.visitors} odwiedzających` }));
  main().append(el('div', { class: 'grid-cards' },
    stat(data.today, 'wizyty dziś'), stat(data.window, `wizyty — ${data.days} dni`), stat(data.all, 'wizyty łącznie')));

  const max = Math.max(1, ...data.daily.map((d) => d.views));
  main().append(el('div', { class: 'card' },
    el('div', { class: 'card-head' }, el('h2', { text: 'Wizyty dziennie' })),
    el('div', { class: 'chart' }, data.daily.map((d) => el('div', {
      class: `bar${d.views ? '' : ' is-zero'}`,
      style: `height:${d.views ? Math.max(4, (d.views / max) * 100) : 2}%`,
      dataset: { tip: `${d.day.slice(8, 10)}.${d.day.slice(5, 7)} — ${d.views} wizyt, ${d.visitors} osób` },
    }))),
    el('div', { class: 'chart-axis' }, el('span', { text: data.daily[0].day }), el('span', { text: data.daily[data.daily.length - 1].day }))));

  const table = (title, rows, name) => {
    const top = Math.max(1, ...rows.map((r) => r.n != null ? r.n : r.views));
    return el('div', { class: 'card' },
      el('div', { class: 'card-head' }, el('h2', { text: title })),
      rows.length
        ? el('div', { class: 'kv' }, rows.map((r) => {
          const n = r.n != null ? r.n : r.views;
          return el('div', { class: 'kv-row' }, el('span', { text: name(r) }), el('b', { text: n }), el('i', { style: `width:${(n / top) * 100}%` }));
        }))
        : el('span', { class: 'muted', text: 'Brak danych w tym okresie.' }));
  };
  main().append(el('div', { class: 'split' },
    table('Strony', data.pages, (r) => PAGE_NAMES[r.page] || r.page),
    table('Urządzenia', data.devices, (r) => ({ mobile: 'Telefon', desktop: 'Komputer' }[r.k] || 'Inne')),
    table('Język strony', data.langs, (r) => ({ pl: 'Polski', en: 'Angielski' }[r.k] || 'Inny')),
    table('Kraje', data.countries, (r) => r.k),
    table('Skąd przyszli', data.refs, (r) => r.k)));
}

/* ============================================================
   USTAWIENIA
   ============================================================ */

function viewSettings() {
  page('Ustawienia', 'Konto administratora i diagnostyka.');
  const p1 = el('input', { type: 'password', autocomplete: 'new-password' });
  const p2 = el('input', { type: 'password', autocomplete: 'new-password' });
  main().append(el('form', {
    class: 'card', style: 'max-width:460px;display:grid;gap:14px',
    onsubmit: async (e) => {
      e.preventDefault();
      if (p1.value.length < 10) return toast('Hasło musi mieć co najmniej 10 znaków.', 'bad');
      if (p1.value !== p2.value) return toast('Hasła nie są takie same.', 'bad');
      const { error } = await sb.auth.updateUser({ password: p1.value });
      if (error) return fail('Zmiana hasła', error);
      p1.value = ''; p2.value = '';
      toast('Hasło zmienione', 'ok');
    },
  },
  el('h2', { text: 'Zmiana hasła' }),
  el('label', { class: 'fld' }, el('span', { text: 'Nowe hasło' }), p1),
  el('label', { class: 'fld' }, el('span', { text: 'Powtórz nowe hasło' }), p2),
  el('div', null, el('button', { class: 'btn btn-primary', type: 'submit', text: 'Zmień hasło' }))));

  /* Spotify player on the „Twój, Dawid” page: stored as texts key 'cfg.spotify' */
  const SP_KEY = 'cfg.spotify';
  const spRe = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|artist|playlist|episode|show)\/[A-Za-z0-9]+/;
  const spRow = state.texts[SP_KEY];
  const spOff = !!spRow && /^off$/i.test(spRow.pl || '');
  const spInput = el('input', { type: 'text', value: spRow && !spOff ? spRow.pl : '', placeholder: 'https://open.spotify.com/track/…' });
  const spShow = el('input', { type: 'checkbox', checked: !spOff });
  main().append(el('form', {
    class: 'card', style: 'max-width:460px;display:grid;gap:14px',
    onsubmit: async (e) => {
      e.preventDefault();
      const v = spInput.value.trim();
      if (spShow.checked && v && !spRe.test(v)) return toast('To nie jest link ze Spotify (utwór, album, playlista lub artysta).', 'bad');
      const value = spShow.checked ? v : 'off';
      const res = value
        ? await sb.from('texts').upsert({ key: SP_KEY, pl: value, en: null, en_src: value, updated_at: new Date().toISOString() })
        : await sb.from('texts').delete().eq('key', SP_KEY);
      if (res.error) return fail('Spotify', res.error);
      await loadTexts();
      toast('Zapisano — odtwarzacz na stronie zaktualizowany', 'ok');
    },
  },
  el('h2', { text: 'Odtwarzacz Spotify — „Twój, Dawid”' }),
  el('label', { class: 'row', style: 'gap:8px;cursor:pointer' }, spShow, el('span', { text: 'Pokazuj odtwarzacz na stronie' })),
  el('label', { class: 'fld' }, el('span', { text: 'Link do utworu, albumu, playlisty lub artysty' }), spInput),
  el('span', { class: 'muted', text: 'Puste pole = profil artysty (najpopularniejsze utwory). Wklej link „Udostępnij → Kopiuj link” ze Spotify, aby grał konkretny utwór.' }),
  el('div', null, el('button', { class: 'btn btn-primary', type: 'submit', text: 'Zapisz' }))));

  const out = el('span', { class: 'muted', text: 'Sprawdza, czy serwer tłumaczeń odpowiada.' });
  main().append(el('div', { class: 'card', style: 'max-width:460px;display:grid;gap:12px' },
    el('h2', { text: 'Tłumacz AI (PL → EN)' }),
    out,
    el('div', null, el('button', {
      class: 'btn btn-ai', type: 'button', text: 'Sprawdź tłumacza',
      onclick: (e) => busy(e.target, async () => {
        const t = performance.now();
        try {
          const text = await translate('Kolekcja inspirowana brutalizmem.');
          out.className = '';
          out.textContent = `Działa (${((performance.now() - t) / 1000).toFixed(1)} s): „${text}”`;
        } catch (err) {
          out.textContent = 'Serwer tłumaczeń nie odpowiada. Teksty PL nadal można zapisywać; EN trzeba wtedy wpisać ręcznie.';
        }
      }),
    }))));

  main().append(el('div', { class: 'card', style: 'max-width:460px;display:grid;gap:8px' },
    el('h2', { text: 'Strona' }),
    el('a', { href: 'index.html', target: '_blank', rel: 'noopener', text: 'Otwórz kolekcję →' }),
    el('a', { href: 'twoj-dawid.html', target: '_blank', rel: 'noopener', text: 'Otwórz „Twój, Dawid” →' }),
    el('a', { href: 'contact.html', target: '_blank', rel: 'noopener', text: 'Otwórz kontakt →' }),
    el('span', { class: 'muted', text: 'Gdyby baza była niedostępna, strona pokaże ostatnią zapamiętaną wersję treści, a w ostateczności teksty i zdjęcia wbudowane.' })));
}

boot();
