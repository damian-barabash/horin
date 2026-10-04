/* HORIN — content from Supabase (texts + photo order edited in admin.html).
   One request for the whole site; the answer is cached in localStorage so
   repeat visits paint the edited texts immediately. If Supabase is slow or
   down the pages fall back to the cache, then to the built-in defaults —
   сайт никогда не зависит от бэкенда. */

export const SB_URL = 'https://bprgedjtklowtmspimtr.supabase.co';
export const SB_KEY = 'sb_publishable_OLN9-O4Y7c-u6QT4Ox4p2A_RN8Ard00';

const CACHE = 'horin-content';
const TIMEOUT = 2500;
const page = document.body.dataset.page || 'index';
const isPreview = new URLSearchParams(location.search).has('preview');

export async function rpc(fn, args) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(args || {}),
  });
  if (!r.ok) {
    const err = new Error('rpc failed');
    try { err.detail = await r.json(); } catch { /* no body */ }
    throw err;
  }
  return r.status === 204 ? null : r.json().catch(() => null);
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { return null; }
}

async function load() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/site_content`, {
      headers: { apikey: SB_KEY },
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch { /* private mode */ }
    if (window.HORIN_I18N) window.HORIN_I18N.setOverrides(data.texts);
    return data;
  } catch {
    return readCache();
  } finally {
    clearTimeout(timer);
  }
}

/* resolves to { texts, photos } or null (use built-in defaults) */
export const contentReady = load();

/* ordered photos of one collection, or null when the backend has none */
export function photosFor(content, collection) {
  const list = ((content && content.photos) || []).filter((p) => p.c === collection && p.src);
  return list.length ? list : null;
}

/* ---------- cookieless page view ---------- */

function track() {
  if (isPreview || window.parent !== window) return;
  try { if (localStorage.getItem('horin-admin')) return; } catch { /* count it */ }
  let ref = null;
  try {
    const host = document.referrer && new URL(document.referrer).hostname;
    if (host && host !== location.hostname) ref = host;
  } catch { /* malformed referrer */ }
  rpc('track_view', {
    p_page: page,
    p_lang: (window.HORIN_I18N && window.HORIN_I18N.lang) || 'en',
    p_device: matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop',
    p_ref: ref,
  }).catch(() => { /* analytics must never break the page */ });
}
if (document.readyState === 'complete') track();
else addEventListener('load', track, { once: true });

/* ---------- admin live preview (page shown inside admin.html iframe) ---------- */

if (isPreview && window.parent !== window) {
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data) return;
    const m = e.data;
    if (m.t === 'horin:text' && window.HORIN_I18N) window.HORIN_I18N.preview(m.key, m.lang, m.value);
    if (m.t === 'horin:lang' && window.HORIN_I18N) window.HORIN_I18N.setLang(m.lang, true);
    if (m.t === 'horin:goto' && window.HORIN_GOTO) window.HORIN_GOTO(m.key);
  });
  contentReady.then(() => parent.postMessage({ t: 'horin:ready', page }, location.origin));
}
