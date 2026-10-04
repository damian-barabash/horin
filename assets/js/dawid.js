/* HORIN — TWÓJ, DAWID / LETNIE BRZMIENIA
   fixed Three.js scene: a festival stage (assets/models/stage.glb) lit in
   violet. On arrival the stage sits in the middle of the frame, the title
   below it and the concert photos peek half-hidden from the bottom edge.
   Scrolling sends the photos onto the stage, the camera moves in and walks
   the whole width of the stage: every stop lifts one pair of photos to the
   left of the frame (top on portrait screens) next to its text. At the end
   the camera dives into the round LED screen at the back of the stage and
   the contact CTA appears inside it.

   Photo order comes from the admin panel (Supabase `photos`, collection
   'dawid'): photos 1+2 = scene 1, 3+4 = scene 2, … */

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/addons/libs/meshopt_decoder.module.js';
import { contentReady, photosFor } from './content.js';

const t0 = performance.now();

/* built-in fallback when the backend gives nothing: [file, width, height] */
const DEFAULT_IMGS = [
  ['img_2609', 810, 1080], ['img_2610', 810, 1080], // cape in motion
  ['img_2673', 810, 1080], ['img_2770', 842, 1080], // uniform, front
  ['img_2608', 810, 1080], ['img_2624', 810, 1080], // navy + yellow
  ['img_2738', 901, 1080], ['img_2747', 810, 1080], // tails
  ['img_3006', 810, 1080], ['img_2996', 810, 1080], // side stripe
  ['img_3071', 810, 1080], ['img_3057', 810, 1080], // second act
  ['img_3188', 810, 1080], ['img_3204', 810, 1080], // in the light
];

const MAX_SCENES = 8; // text blocks in twoj-dawid.html
const FOV = 38;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
/* stage.glb: 46 wide (x ±23), 17.3 high, deck top at y 1.6, opening faces +z */
/* inner = half-width of the performance area between the truss towers:
   photos must stand inside it, the wings (x beyond ±13) carry the LED walls */
const STAGE = { cy: 8.4, deckY: 1.6, restZ: 5.2, backZ: 1.4, inner: 11.6, yawRef: 16 };

/* Spotify player (right edge). Overridden from the admin panel:
   Supabase `texts` key 'cfg.spotify' = any open.spotify.com link, 'off' = hidden */
const SPOTIFY_DEFAULT = 'https://open.spotify.com/artist/0t94HGOfXAG5BnHlRWlIqk';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- content ---------- */

let IMGS = DEFAULT_IMGS.map(([n, w, h]) => ({
  src: `assets/img/dawid/${n}.webp`, full: `assets/img/dawid/full/${n}.webp`, ar: w / h,
}));
const content = await contentReady;
const live = photosFor(content, 'dawid');
if (live) {
  IMGS = live.map((ph) => ({
    src: ph.src, full: ph.full || ph.src, ar: ph.w && ph.h ? ph.w / ph.h : 0.75,
  }));
}
IMGS = IMGS.slice(0, MAX_SCENES * 2);
const N = Math.ceil(IMGS.length / 2); // scenes

/* scroll timeline (p = 0..1) */
const T = { introA: 0.025, introB: 0.13, stopsA: 0.155, stopsB: 0.875, exitB: 0.955 };
const GAP = 0.012;
const RANGE_W = (T.stopsB - T.stopsA - GAP * (N - 1)) / N;
const RANGES = Array.from({ length: N }, (_, k) => {
  const a = T.stopsA + k * (RANGE_W + GAP);
  return [a, a + RANGE_W];
});
const FOCUS_EDGE = Math.min(0.028, RANGE_W * 0.3);

document.getElementById('scroll-space').style.height = `${N * 170 + 430}vh`;

/* ---------- renderer / scene ---------- */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07050d, 0.0075);

const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 400);

/* ---------- light: violet house + moving heads ---------- */

const PALETTE = [0x7a2bff, 0xd63bff, 0x4b3bff, 0xff4fd8, 0x9a5cff, 0x6a1bff, 0xc04bff, 0x5a3bff]
  .map((c) => new THREE.Color(c));

scene.add(new THREE.HemisphereLight(0x9a6cff, 0x1a0b33, 1.5));
const front = new THREE.DirectionalLight(0xcdb5ff, 1.3);
front.position.set(4, 14, 30);
scene.add(front);

/* three moving heads hung under the roof, sweeping the deck */
const heads = [-11, 0, 11].map((x, i) => {
  const spot = new THREE.SpotLight(PALETTE[i], 900, 60, 0.42, 0.7, 1.6);
  spot.position.set(x, 13.5, 2);
  spot.target.position.set(x, STAGE.deckY, 3);
  scene.add(spot, spot.target);
  return { spot, x, phase: i * 2.1 };
});
/* follow-spot: tracks the pointer across the stage (drifts on touch screens) */
const follow = new THREE.PointLight(0xe2c8ff, 260, 26, 1.7);
follow.position.set(0, 6, 7);
scene.add(follow);

/* ---------- stage model ---------- */

const loadManager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(loadManager);
const gltfLoader = new GLTFLoader(loadManager);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

/* the round LED screen at the back of the stage — the finale flies into it.
   Measured from the model on load; these are the fallback numbers */
const portal = new THREE.Vector3(0, 8.4, -6.5);

const beams = []; // translucent haze cones — pulsing
const glows = []; // emissive lenses / LED bars — follow the palette
const stageRoot = new THREE.Group();
scene.add(stageRoot);

gltfLoader.load('assets/models/stage.glb', (gltf) => {
  const drop = [];
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  gltf.scene.updateWorldMatrix(true, true);
  gltf.scene.traverse((o) => {
    // the file ships 24 punctual lights + a camera: we light the stage ourselves
    if (o.isLight || o.isCamera) { drop.push(o); return; }
    if (!o.isMesh) return;
    const m = o.material;
    if (/LED screen/i.test(m.name)) {
      // circle + side walls share one mesh: the circle is the part near x = 0
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (Math.abs(v.x) < 9) box.expandByPoint(v);
      }
      if (!box.isEmpty()) portal.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z);
    }
    if (/beam haze/i.test(m.name)) {
      m.blending = THREE.AdditiveBlending;
      m.depthWrite = false;
      m.fog = false;
      m.userData.base = m.opacity * 3.2;
      beams.push(m);
      o.renderOrder = 2;
    } else if (m.emissiveIntensity > 1) {
      m.userData.base = m.emissiveIntensity;
      m.userData.color = m.emissive.clone();
      glows.push(m);
    }
  });
  drop.forEach((o) => o.removeFromParent());
  stageRoot.add(gltf.scene);
});

/* ---------- photos ---------- */

const photoGeo = new THREE.PlaneGeometry(1, 1);
const photos = IMGS.map((img, i) => {
  const tex = texLoader.load(img.src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, fog: false,
  });
  const mesh = new THREE.Mesh(photoGeo, mat);
  mesh.renderOrder = 3 + i;
  scene.add(mesh);
  return { mesh, ar: img.ar, i, scene: Math.floor(i / 2), side: i % 2 };
});
const photoMeshes = photos.map((ph) => ph.mesh);

let portrait = camera.aspect < 0.9;

/* 1 — hero strip: a fanned row along the bottom edge, exactly half hidden.
   Camera-local, sized from the viewport → holds on any window or phone */
function stripSlot(ph, out) {
  const d = 8;
  const halfH = d * TAN;
  const halfW = halfH * camera.aspect;
  const h = 2 * halfH * (portrait ? 0.25 : 0.34);
  const w = h * ph.ar;
  const u = Math.max(0, halfW * 0.94 - w / 2);
  const t = photos.length > 1 ? (ph.i / (photos.length - 1)) * 2 - 1 : 0;
  out.pos.set(t * u, -halfH + Math.sin(ph.i * 2.3) * h * 0.035, -d + ph.i * 0.012);
  out.rotZ = -t * 0.09 + Math.sin(ph.i * 1.7) * 0.035;
  out.h = h;
  return out;
}

/* 2 — on the stage: pairs standing on the deck across its whole width */
const REST_H = 2.7;
/* widest pair decides how far from the middle the outer pairs may stand */
const PAIR_HALF = Math.max(...Array.from({ length: N }, (_, k) =>
  Math.max(...IMGS.slice(k * 2, k * 2 + 2).map((im) => im.ar)))) * REST_H + 0.1;
const SPAN = Math.max(0, STAGE.inner - PAIR_HALF);
const sceneX = (u) => (N > 1 ? lerp(-SPAN, SPAN, u / (N - 1)) : 0);
function restSlot(ph, out) {
  const cx = sceneX(ph.scene);
  const w = REST_H * ph.ar;
  const dir = ph.side === 0 ? -1 : 1;
  /* two rows: odd scenes stand upstage and higher, so neighbouring pairs
     never collide however many scenes there are */
  const back = ph.scene % 2 === 1;
  out.pos.set(
    cx + dir * (w / 2 + 0.1),
    STAGE.deckY + 0.35 + REST_H / 2 + (back ? 2.5 : 0),
    back ? STAGE.backZ : STAGE.restZ
  );
  out.rotY = -dir * 0.16;
  out.h = REST_H;
  return out;
}

/* 3 — in focus: the pair fills the left half (top half on portrait).
   Camera-local again, measured in viewport fractions */
function focusSlot(ph, out) {
  const d = 7;
  const halfH = d * TAN;
  const halfW = halfH * camera.aspect;
  let cellW, cellH, nx, ny;
  if (portrait) {
    cellW = 0.86 * halfW; // 43 % of the width each
    cellH = 0.66 * halfH; // 33 % of the height
    nx = ph.side === 0 ? -0.46 : 0.46;
    // top block: below the header, above the text (text starts at 49vh)
    ny = 0.36 + (ph.side === 0 ? 0.02 : -0.02);
  } else {
    cellW = 0.4 * halfW; // 20 % of the width each
    cellH = 1.22 * halfH; // 61 % of the height
    nx = ph.side === 0 ? -0.74 : -0.3;
    ny = ph.side === 0 ? 0.05 : -0.09;
  }
  const h = Math.min(cellH, cellW / ph.ar);
  out.pos.set(nx * halfW, ny * halfH, -d + ph.side * 0.05);
  out.h = h;
  return out;
}

/* ---------- camera path ---------- */

const camPos = new THREE.Vector3();
const heroPos = new THREE.Vector3();
const stopPos = new THREE.Vector3();
const portalPos = new THREE.Vector3();

/* whole stage in frame: fits the width AND leaves room for title + strip */
function heroCam(out) {
  const fitW = portrait ? 27 : 50;
  const fracH = portrait ? 0.36 : 0.47;
  const d = Math.max(fitW / (2 * TAN * camera.aspect * 0.94), 19 / (2 * TAN * fracH));
  const ny = portrait ? 0.16 : 0.4; // stage centre above the middle of the screen
  return out.set(0, STAGE.cy - ny * d * TAN, d + 4);
}
function stopCam(u, out) {
  return out.set(sceneX(u) * 1.25, 5.4, portrait ? 34 : 25);
}

/* u = which stop the camera stands at (fractional while it travels) */
function stopIndex(p) {
  if (N < 2) return 0;
  const c0 = (RANGES[0][0] + RANGES[0][1]) / 2;
  const step = RANGE_W + GAP;
  const u = clamp((p - c0) / step, 0, N - 1);
  const k = Math.floor(u);
  // hold near each stop, travel in between
  return k + smoothstep(0.3, 0.7, u - k);
}

/* ---------- preloader (same choreography as the collection page) ---------- */

const preloader = document.getElementById('preloader');
const plLogo = preloader.querySelector('.pl-logo');
const plFill = preloader.querySelector('.pl-fill');
const plCount = preloader.querySelector('.pl-count');
const header = document.querySelector('.site-header');
const headerLogo = document.querySelector('.h-logo');
const hero = document.querySelector('.hero');

let loadedFrac = 0;
let sceneStart = -1;
const MIN_PRELOAD = 1400;

loadManager.onProgress = (_u, done, total) => { loadedFrac = done / total; };
loadManager.onLoad = () => { loadedFrac = 1; };

function tickPreloader(now) {
  const timeFrac = clamp((now - t0) / MIN_PRELOAD, 0, 1);
  let f = Math.min(loadedFrac, timeFrac);
  if (now - t0 > 12000) f = 1; // never trap the visitor on a slow network
  plFill.style.height = `${(f * 100).toFixed(1)}%`;
  plCount.textContent = `${String(Math.round(f * 100)).padStart(3, '0')} %`;
  if (f >= 1) { flyUp(); return; }
  requestAnimationFrame(tickPreloader);
}

function flyUp() {
  const from = plLogo.getBoundingClientRect();
  const to = headerLogo.getBoundingClientRect();
  plLogo.style.setProperty('--fly-x', `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
  plLogo.style.setProperty('--fly-y', `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  plLogo.style.setProperty('--fly-s', `${to.width / from.width}`);
  preloader.classList.add('is-flying');
  plLogo.classList.add('is-flying');

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    header.classList.add('is-on');
    hero.classList.add('is-ready');
    preloader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    sceneStart = performance.now();
    setTimeout(() => preloader.remove(), 700);
    setTimeout(showPlayer, 1400);
  };
  const onEnd = (e) => {
    if (e.target !== plLogo || e.propertyName !== 'transform') return;
    plLogo.removeEventListener('transitionend', onEnd);
    finish();
  };
  plLogo.addEventListener('transitionend', onEnd);
  setTimeout(() => { onEnd({ target: plLogo, propertyName: 'transform' }); }, 1200);
}

document.body.classList.add('is-locked');
scrollTo(0, 0);
requestAnimationFrame(tickPreloader);

/* ---------- Spotify player ---------- */

const playerEl = document.getElementById('dw-player');
const playerTab = playerEl.querySelector('.dwp-tab');
const playerBody = playerEl.querySelector('.dwp-body');

function spotifyEmbed(url) {
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]+)/.exec(url || '');
  return m ? { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`, uri: `spotify:${m[1]}:${m[2]}` } : null;
}
const spotifyCfg = content && content.texts && content.texts['cfg.spotify'] && content.texts['cfg.spotify'].pl;
const spotify = /^off$/i.test((spotifyCfg || '').trim()) ? null : (spotifyEmbed(spotifyCfg) || spotifyEmbed(SPOTIFY_DEFAULT));

/* Spotify iFrame API: gives a controller, so the music can start by itself
   when the camera reaches the stage. Browsers only allow sound after the
   visitor has clicked/tapped somewhere on the site — if the first attempt is
   refused, the next click, tap or key press starts it. Started once only:
   after that the visitor's own pause is respected. */
let spCtrl = null;
let spWanted = false;
let spStarted = false;
function loadSpotify() {
  window.onSpotifyIframeApiReady = (api) => {
    if (playerBody.firstChild) return; // plain iframe already in place
    const host = document.createElement('div');
    playerBody.append(host);
    api.createController(host, { uri: spotify.uri, width: '100%', height: 152, theme: 'dark' }, (ctrl) => {
      spCtrl = ctrl;
      ctrl.addListener('playback_update', (e) => {
        const playing = !e.data.isPaused;
        if (playing) spStarted = true;
        playerEl.classList.toggle('is-playing', playing);
      });
      ctrl.addListener('ready', () => { if (spWanted) tryPlay(); });
    });
  };
  const s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1';
  s.async = true;
  document.head.append(s);
}
function tryPlay() {
  if (!spStarted && spCtrl) spCtrl.play();
}
function autoPlay() {
  spWanted = true;
  tryPlay();
  const kick = () => {
    if (spStarted) {
      removeEventListener('pointerdown', kick);
      removeEventListener('keydown', kick);
    } else tryPlay();
  };
  addEventListener('pointerdown', kick, { passive: true });
  addEventListener('keydown', kick);
}

function setPlayerOpen(open) {
  playerEl.classList.toggle('is-open', open);
  playerTab.setAttribute('aria-expanded', String(open));
  // fallback when the iFrame API did not load: a plain embed, play by hand
  if (open && !playerBody.firstChild) {
    const f = document.createElement('iframe');
    f.src = spotify.src;
    f.title = 'Twój, Dawid — Spotify';
    f.loading = 'lazy';
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    playerBody.append(f);
  }
}
/* until the visitor touches the tab the player runs itself: closed on the
   cover (it would cover the end of the title), open once the walk begins */
let playerAuto = false;
playerTab.addEventListener('click', () => {
  playerAuto = false;
  setPlayerOpen(!playerEl.classList.contains('is-open'));
});

/* slides in from the right once the stage is on; opens by itself where
   there is room for it (desktop), stays a tab on phones and short windows */
function showPlayer() {
  if (!spotify) return;
  playerEl.hidden = false;
  loadSpotify();
  requestAnimationFrame(() => requestAnimationFrame(() => playerEl.classList.add('is-in')));
  playerAuto = !portrait && innerHeight >= 760 && innerWidth >= 1000;
}

/* ---------- DOM blocks ---------- */

const chapterEls = [...document.querySelectorAll('.chapter')];
chapterEls.forEach((el, k) => {
  if (k >= N) { el.remove(); return; }
  el.querySelector('.dw-num').textContent =
    `${String(k + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
});
chapterEls.length = Math.min(chapterEls.length, N);
const outroEl = document.querySelector('.outro');
const scrimEl = document.getElementById('dw-scrim');
const portalEl = document.getElementById('dw-portal');
const flashEl = document.getElementById('dw-flash');

const styleCache = new Map();
function setCached(key, apply, value, eps = 0.002) {
  const prev = styleCache.get(key);
  if (prev !== undefined && Math.abs(prev - value) < eps) return;
  styleCache.set(key, value);
  apply(value);
}

/* long texts crawl inside their clipped box (small phones, long edits) */
const chTexts = chapterEls.map((el) => ({
  clip: el.querySelector('.ch-clip'), text: el.querySelector('.ch-text'), ov: 0,
}));
function measureTexts() {
  chTexts.forEach((ct, k) => {
    ct.text.style.transform = '';
    styleCache.delete(`txt${k}`);
    ct.ov = Math.max(0, ct.text.scrollHeight - ct.clip.clientHeight);
    ct.clip.classList.toggle('is-overflow', ct.ov > 4);
  });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureTexts);
measureTexts();

let pTarget = 0;
let p = 0;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  pTarget = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
}
addEventListener('scroll', readScroll, { passive: true });

function sceneFocus(k, prog) {
  const [a, b] = RANGES[k];
  return Math.min(smoothstep(a, a + FOCUS_EDGE, prog), 1 - smoothstep(b - FOCUS_EDGE, b, prog));
}

/* ---------- language swap: photos dive, come back with the new text ---------- */

let langDipTarget = 0;
let langDip = 0;
addEventListener('horin:langdip', (e) => {
  langDipTarget = e.detail;
  if (e.detail === 0) measureTexts();
});

/* ---------- pointer / lightbox ---------- */

let mx = 0, my = 0, mxS = 0, myS = 0;

const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('img');
const lbNum = lightbox.querySelector('.lb-num');
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function photoAt(clientX, clientY) {
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(photoMeshes).find((h) => h.object.material.opacity > 0.6);
  return hit ? photoMeshes.indexOf(hit.object) : -1;
}

let lbOpenedAt = -1;
function openLightbox(i) {
  lbImg.classList.remove('is-loaded');
  lbImg.onload = () => lbImg.classList.add('is-loaded');
  lbImg.src = IMGS[i].full;
  lbNum.textContent = `${String(i + 1).padStart(2, '0')} / ${IMGS.length}`;
  lightbox.classList.add('is-on');
  document.body.classList.add('is-locked');
  lbOpenedAt = performance.now();
}
function closeLightbox() {
  lightbox.classList.remove('is-on');
  document.body.classList.remove('is-locked');
}
lightbox.addEventListener('click', () => {
  if (performance.now() - lbOpenedAt < 500) return;
  closeLightbox();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

let downX = 0, downY = 0;
let touchHandledAt = -1;
addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, { passive: true });

/* iOS Safari не синтезирует click по неинтерактивным элементам — тач
   обрабатываем по pointerup (см. scene.js) */
addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
  touchHandledAt = performance.now();
  if (lightbox.classList.contains('is-on')) { closeLightbox(); return; }
  if (e.target.closest('a, button, input, textarea')) return;
  const i = photoAt(e.clientX, e.clientY);
  if (i >= 0) openLightbox(i);
}, { passive: true });

addEventListener('click', (e) => {
  if (performance.now() - touchHandledAt < 500) return;
  if (lightbox.classList.contains('is-on')) return;
  if (e.target.closest('a, button, input, textarea')) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
  const i = photoAt(e.clientX, e.clientY);
  if (i >= 0) openLightbox(i);
});

addEventListener('pointermove', (e) => {
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
  if (e.pointerType === 'mouse' && !lightbox.classList.contains('is-on')) {
    document.body.style.cursor = photoAt(e.clientX, e.clientY) >= 0 ? 'pointer' : '';
  }
}, { passive: true });

/* ---------- main loop ---------- */

const sA = { pos: new THREE.Vector3(), rotZ: 0, h: 1 };
const sB = { pos: new THREE.Vector3(), rotY: 0, h: 1 };
const sC = { pos: new THREE.Vector3(), h: 1 };
const vA = new THREE.Vector3();
const vC = new THREE.Vector3();
const qA = new THREE.Quaternion();
const qB = new THREE.Quaternion();
const qZ = new THREE.Quaternion();
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const colA = new THREE.Color();

function frame(now) {
  requestAnimationFrame(frame);
  const t = now * 0.001;

  p += (pTarget - p) * 0.07;
  langDip += (langDipTarget - langDip) * 0.075;
  mxS += (mx - mxS) * 0.04;
  myS += (my - myS) * 0.04;

  /* --- camera: hero → first stop → along the stage → dive into the round screen --- */
  const u = stopIndex(p);
  const approach = easeInOut(smoothstep(T.introA, T.stopsA, p));
  const exitT = smoothstep(T.stopsB + 0.004, T.exitB, p);
  const exit = exitT * exitT * (3 - 2 * exitT) * (0.35 + 0.65 * exitT); // slow start, falling in
  heroCam(heroPos);
  stopCam(u, stopPos);
  camPos.lerpVectors(heroPos, stopPos, approach);
  // finale: straight into the glowing circle at the back of the stage
  portalPos.set(portal.x, portal.y, portal.z + 0.5);
  camPos.lerp(portalPos, exit);
  const par = 1 - exit;
  camera.position.set(camPos.x + mxS * 0.9 * par, camPos.y - myS * 0.5 * par, camPos.z);
  const fov = lerp(FOV, 62, exit); // the lens opens up as the speed builds
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // at the stops the camera turns slightly towards the middle of the stage
  const yaw = -(camPos.x / STAGE.yawRef) * 0.2 * approach * (1 - exit);
  camera.rotation.set(0, yaw - mxS * 0.012, 0);
  if (exit > 0) {
    // keep the circle dead ahead for the whole dive
    qA.copy(camera.quaternion);
    camera.lookAt(portal);
    camera.quaternion.copy(qA.slerp(camera.quaternion, easeInOut(clamp(exit * 3, 0, 1))));
  }
  camera.updateMatrixWorld();

  const focuses = RANGES.map((_, k) => sceneFocus(k, p));
  const fMax = focuses.length ? Math.max(...focuses) : 0;

  /* photos are unlit and not tone-mapped: lowering the exposure dims only
     the stage behind them, so the pair in focus and its text read clearly */
  renderer.toneMappingExposure = lerp(1.15, 0.5, fMax);

  /* --- light show: palette drifts with the walk across the stage --- */
  const pal = u + t * 0.05;
  heads.forEach((h, i) => {
    const a = PALETTE[(Math.floor(pal) + i) % PALETTE.length];
    const b = PALETTE[(Math.floor(pal) + i + 1) % PALETTE.length];
    h.spot.color.copy(a).lerp(b, pal % 1);
    h.spot.target.position.set(
      h.x + Math.sin(t * 0.55 + h.phase) * 9,
      STAGE.deckY,
      2 + Math.cos(t * 0.4 + h.phase) * 5
    );
    h.spot.intensity = 700 + Math.sin(t * 1.3 + h.phase) * 300;
  });
  follow.position.set(camPos.x + mxS * 12 + Math.sin(t * 0.3) * 3, 6 - myS * 3, 8);
  beams.forEach((m, i) => {
    m.opacity = m.userData.base * (0.55 + 0.45 * Math.sin(t * (0.7 + i * 0.23) + i * 2));
  });
  colA.copy(PALETTE[Math.floor(pal) % PALETTE.length]).lerp(PALETTE[(Math.floor(pal) + 1) % PALETTE.length], pal % 1);
  glows.forEach((m, i) => {
    m.emissive.copy(m.userData.color).lerp(colA, 0.45);
    m.emissiveIntensity = m.userData.base * (0.8 + 0.25 * Math.sin(t * 1.1 + i));
  });

  /* --- photos: strip → stage → focus slot --- */
  photos.forEach((ph) => {
    const { mesh } = ph;

    let enter = 0;
    if (sceneStart > 0) enter = easeInOut(clamp((now - sceneStart - 250 - ph.i * 55) / 900, 0, 1));

    /* landing on the stage, one after another */
    const stag = (ph.i / Math.max(1, photos.length - 1)) * 0.03;
    const land = easeInOut(smoothstep(T.introA + stag, T.introB - 0.03 + stag, p));
    const f = easeInOut(focuses[ph.scene] || 0);

    stripSlot(ph, sA);
    sA.pos.y -= (1 - enter) * sA.h * 0.9; // entrance: rise from below the edge
    vA.copy(sA.pos).applyMatrix4(camera.matrixWorld);
    restSlot(ph, sB);
    focusSlot(ph, sC);
    vC.copy(sC.pos).applyMatrix4(camera.matrixWorld);

    // arc: photos fly up over the deck before they settle
    const lift = Math.sin(land * Math.PI) * 3.2;
    mesh.position.lerpVectors(vA, sB.pos, land);
    mesh.position.y += lift;
    mesh.position.lerp(vC, f);

    qA.copy(camera.quaternion).multiply(qZ.setFromAxisAngle(AXIS_Z, sA.rotZ));
    qB.setFromAxisAngle(AXIS_Y, sB.rotY);
    mesh.quaternion.copy(qA).slerp(qB, land).slerp(camera.quaternion, f);

    const h = lerp(lerp(sA.h, sB.h, land), sC.h, f);
    mesh.scale.set(h * ph.ar, h, 1);

    const phDip = easeInOut(clamp(langDip * 1.45 - ph.side * 0.12, 0, 1));
    if (phDip > 0.0005) mesh.position.y -= phDip * (4 + f * 4);

    /* the pair in focus stays bright, the rest of the stage steps back */
    const dim = fMax > 0.01 && focuses[ph.scene] < fMax ? 1 - fMax * 0.78 : 1;
    // the camera flies through the row on its way to the screen — clear the path
    mesh.material.opacity = enter * dim * (1 - phDip) * (1 - smoothstep(0.05, 0.45, exit));
    mesh.renderOrder = 3 + ph.i + (f > 0.01 ? 40 : 0);
  });

  /* --- DOM --- */
  chapterEls.forEach((el, k) => {
    const f = focuses[k];
    setCached(`ch${k}`, (v) => {
      el.style.opacity = v.toFixed(3);
      el.style.visibility = v > 0.005 ? 'visible' : 'hidden';
      el.style.setProperty('--chOff', (1 - easeInOut(v)) * 26);
    }, f);
    const ct = chTexts[k];
    if (ct.ov > 0 && f > 0.001) {
      const [a, b] = RANGES[k];
      const tt = clamp(((p - a) / (b - a) - 0.22) / 0.56, 0, 1);
      setCached(`txt${k}`, (v) => {
        ct.text.style.transform = `translateY(${(-v).toFixed(1)}px)`;
      }, ct.ov * tt, 0.5);
    }
  });
  setCached('scrim', (v) => { scrimEl.style.opacity = v.toFixed(3); }, fMax);

  if (playerAuto && (p > 0.045) !== playerEl.classList.contains('is-open')) setPlayerOpen(p > 0.045);
  // the camera is on its way to the stage — music on
  if (!spWanted && spotify && sceneStart > 0 && p > 0.05) autoPlay();

  const heroIn = sceneStart > 0 ? clamp((now - sceneStart) / 700, 0, 1) : 0;
  const heroF = (1 - smoothstep(0.008, 0.045, p)) * easeInOut(heroIn);
  setCached('hero', (v) => {
    hero.style.opacity = v.toFixed(3);
    hero.style.visibility = v > 0.005 ? 'visible' : 'hidden';
  }, heroF);

  /* inside the circle: a lavender flash (the screen itself), then the dark
     violet room where the contact link stands */
  setCached('flash', (v) => { flashEl.style.opacity = v.toFixed(3); },
    smoothstep(0.915, 0.945, p) * (1 - smoothstep(0.95, 0.985, p)));
  setCached('portal', (v) => {
    portalEl.style.opacity = v.toFixed(3);
    portalEl.style.setProperty('--grow', (0.6 + v * 0.4).toFixed(3));
  }, smoothstep(0.935, 0.965, p));

  const outroF = smoothstep(0.955, 0.99, p);
  setCached('outro', (v) => {
    outroEl.style.opacity = v.toFixed(3);
    outroEl.style.visibility = v > 0.005 ? 'visible' : 'hidden';
    outroEl.classList.toggle('is-live', v > 0.5);
  }, outroF);

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  portrait = camera.aspect < 0.9;
  measureTexts();
});

/* admin live preview: jump to the block that shows a given text key */
window.HORIN_GOTO = (key) => {
  const el = document.querySelector(`[data-i18n="${key}"]`);
  if (!el) return;
  const ch = el.closest('.chapter');
  let to = 0;
  if (ch && chapterEls.includes(ch)) {
    const [a, b] = RANGES[chapterEls.indexOf(ch)];
    to = a + (b - a) * 0.5;
  } else if (el.closest('.outro')) to = 1;
  const go = () => {
    if (document.body.classList.contains('is-locked')) { setTimeout(go, 200); return; }
    scrollTo(0, to * (document.documentElement.scrollHeight - innerHeight));
  };
  go();
};

readScroll();
requestAnimationFrame(frame);
