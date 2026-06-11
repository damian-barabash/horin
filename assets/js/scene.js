/* HORIN — DEFORMED IN CONCRETE
   fixed Three.js scene: grey concrete column + 27 photos in a spiral.
   Scroll twists the spiral, three chapters pull their photos toward
   the camera while the chapter text fades in, then release them back. */

import * as THREE from 'three';

const IMGS = [
  'mg_0043', 'mg_0046', 'mg_0049', 'mg_0084', 'mg_0124', 'mg_0134',
  'mg_0135', 'mg_0218', 'mg_0228', 'mg_0243', 'mg_9724', 'mg_9751',
  'mg_9754', 'mg_9794', 'mg_9799', 'mg_9809', 'mg_9834', 'mg_9834_1',
  'mg_9835', 'mg_9880', 'mg_9913', 'mg_9950', 'mg_9951', 'mg_9971',
  'mg_9991', 'mg_9995', 'mg_9996',
];

const PER_BLOCK = 9;
const CHAPTERS = [
  { range: [0.16, 0.38] },
  { range: [0.44, 0.64] },
  { range: [0.70, 0.88] },
];

const SPIRAL = { radius: 2.9, stepY: 0.8, topY: 1.4, anglePer: (Math.PI * 2) / 7.2 };
const CAM = { z: 9.0, fov: 42, yFrom: 2.4, yTo: -21.0 };

const PAPER = { top: 0xf4f4f2, bottom: 0xd9d9d6 };
const DARK = { top: 0x111111, bottom: 0x030303 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/* NB: НЕ читаем prefers-reduced-motion — Windows с выключенными
   «Эффектами анимации» репортит его и молча убивал всю анимацию сайта
   (статичная спираль + дёрганый скролл без сглаживания) */
const reduceMotion = false;

/* ---------- renderer / scene ---------- */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAPER.bottom, 13, 34);

const camera = new THREE.PerspectiveCamera(CAM.fov, innerWidth / innerHeight, 0.1, 80);
camera.position.set(0, CAM.yFrom, CAM.z);

/* low ambient + strong side key light: the white column reads through
   the shadow gradient wrapping around the cylinder */
scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8d89, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(7, 5, 3);
scene.add(sun);
const rim = new THREE.DirectionalLight(0xffffff, 0.2);
rim.position.set(-6, 2, -4);
scene.add(rim);

/* ---------- concrete column ---------- */

function concreteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#efefec';
  x.fillRect(0, 0, 512, 512);
  // noise
  const img = x.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  // vertical flutes
  x.globalAlpha = 0.16;
  for (let i = 0; i < 8; i++) {
    const px = i * 64 + 22;
    const g = x.createLinearGradient(px, 0, px + 22, 0);
    g.addColorStop(0, '#b9b9b5');
    g.addColorStop(0.5, '#efefec');
    g.addColorStop(1, '#b9b9b5');
    x.fillStyle = g;
    x.fillRect(px, 0, 22, 512);
  }
  // formwork seams
  x.globalAlpha = 0.22;
  x.fillStyle = '#a8a8a4';
  for (let yy = 0; yy < 512; yy += 128) x.fillRect(0, yy, 512, 2);
  x.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  return tex;
}

const colTex = concreteTexture();
const colClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -4); // keeps y < constant
const colMat = new THREE.MeshStandardMaterial({
  color: 0xb8b8b4,
  map: colTex,
  bumpMap: colTex,
  bumpScale: 0.85,
  roughness: 0.9,
  metalness: 0,
  transparent: true,
  clippingPlanes: [colClip],
});
/* fresnel alpha: silhouette edges dissolve into the background gradient */
colMat.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    `#include <dithering_fragment>
    float colFres = abs(dot(normalize(vViewPosition), normalize(vNormal)));
    gl_FragColor.a *= pow(smoothstep(0.0, 1.1, colFres), 2.8);`
  );
};
const column = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.99, 74, 72, 1), colMat);
column.position.y = -12;
scene.add(column);

/* portrait screens: slimmer column, camera further back */
let camZ = CAM.z;
function applyResponsive() {
  const portrait = innerWidth / innerHeight < 0.9;
  const s = portrait ? 0.68 : 1;
  column.scale.set(s, 1, s);
  camZ = portrait ? 10.6 : CAM.z;
}
applyResponsive();

/* ---------- photos ---------- */

const loadManager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(loadManager);

const photoGeo = new THREE.PlaneGeometry(1.18, 1.77);
const photos = [];

IMGS.forEach((name, i) => {
  const tex = texLoader.load(`assets/img/${name}.webp`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(photoGeo, mat);
  mesh.renderOrder = 1;
  scene.add(mesh);
  photos.push({
    mesh,
    theta: i * SPIRAL.anglePer,
    baseY: SPIRAL.topY - i * SPIRAL.stepY,
    block: Math.floor(i / PER_BLOCK),
    slot: i % PER_BLOCK,
    entered: 0,
  });
});

/* showcase slot in camera-local space: photos hug the screen edges and
   recede into depth, keeping the centre clear for the chapter text.
   Computed from NDC so the композиция держится на любом aspect. */
function slotLocal(j, out) {
  /* portrait phones: фото разъезжаются двумя лентами к верхнему и нижнему
     краю экрана (5 сверху / 4 снизу), середина целиком под текст главы */
  if (camera.aspect < 0.9) {
    const top = j % 2 === 0;
    const col = Math.floor(j / 2);
    const n = top ? 5 : 4;
    const d = 5.0 + (col % 2) * 1.1;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
    const halfW = halfH * camera.aspect;
    const nx = (col - (n - 1) / 2) * 0.4;
    const ny = (top ? 1 : -1) * (0.7 + Math.sin(j * 2.1) * 0.04);
    out.pos.set(nx * halfW, ny * halfH, -d);
    // photo height as a stable fraction of the viewport height
    out.scale = (halfH * 0.34) / 1.77;
    return out;
  }
  const side = j % 2 === 0 ? -1 : 1;
  const rank = Math.floor(j / 2); // 0..4
  const d = 4.6 + rank * 1.3;
  const halfH = d * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
  const halfW = halfH * camera.aspect;
  /* k: 1 = wide desktop (photo wall flanks the text),
     0 = narrow window (photos peek in from the screen edges,
     centre stays clear so текст и фото не конфликтуют) */
  const k = clamp((camera.aspect - 1.2) / 0.25, 0, 1);
  const nx = side * lerp(1.06, 0.74 + rank * 0.055, k);
  const ny = Math.sin(j * 1.7) * lerp(0.52, 0.48, k) - 0.07 * k;
  out.pos.set(nx * halfW, ny * halfH, -d);
  // photo width as a stable fraction of the viewport, deeper ranks smaller
  out.scale = (halfW * lerp(0.62, 0.34 - rank * 0.02, k)) / 1.18;
  return out;
}
const slotTmp = { pos: new THREE.Vector3(), scale: 1 };

/* ---------- preloader ---------- */

const preloader = document.getElementById('preloader');
const plLogo = preloader.querySelector('.pl-logo');
const plFill = preloader.querySelector('.pl-fill');
const plCount = preloader.querySelector('.pl-count');
const header = document.querySelector('.site-header');
const headerLogo = document.querySelector('.h-logo');
const hero = document.querySelector('.hero');

let loadedFrac = 0;
let sceneStart = -1;
const MIN_PRELOAD = reduceMotion ? 0 : 1400;
const t0 = performance.now();

loadManager.onProgress = (_u, done, total) => {
  loadedFrac = done / total;
};
loadManager.onLoad = () => { loadedFrac = 1; };

function tickPreloader(now) {
  const timeFrac = clamp((now - t0) / MIN_PRELOAD, 0, 1);
  let f = Math.min(loadedFrac, MIN_PRELOAD ? timeFrac : 1);
  // safety net: never trap the visitor on the preloader (slow/flaky network)
  if (now - t0 > 10000) f = 1;
  plFill.style.height = `${(f * 100).toFixed(1)}%`;
  plCount.textContent = `${String(Math.round(f * 100)).padStart(3, '0')} %`;
  if (f >= 1) { flyUp(); return; }
  requestAnimationFrame(tickPreloader);
}

function flyUp() {
  // FLIP the preloader logo into the header logo slot
  const from = plLogo.getBoundingClientRect();
  const to = headerLogo.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  plLogo.style.setProperty('--fly-x', `${dx}px`);
  plLogo.style.setProperty('--fly-y', `${dy}px`);
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
  };
  if (reduceMotion) { finish(); return; }
  // transitionend bubbles up from .pl-fill/.pl-count — wait strictly for
  // the logo's own transform transition, otherwise the header pops early
  const onEnd = (e) => {
    if (e.target !== plLogo || e.propertyName !== 'transform') return;
    plLogo.removeEventListener('transitionend', onEnd);
    finish();
  };
  plLogo.addEventListener('transitionend', onEnd);
  setTimeout(() => { onEnd({ target: plLogo, propertyName: 'transform' }); }, 1200); // safety net
}

document.body.classList.add('is-locked');
scrollTo(0, 0);
requestAnimationFrame(tickPreloader);

/* ---------- scroll / DOM blocks ---------- */

const chapterEls = [...document.querySelectorAll('.chapter')];
const outroEl = document.querySelector('.outro');
const bgDarkEl = document.getElementById('bg-dark');

/* write style values only when they actually change — стиль-рекалк на
   каждый кадр и был источником лагов скролла на слабых машинах */
const styleCache = new Map();
function setCached(key, apply, value, eps = 0.002) {
  const prev = styleCache.get(key);
  if (prev !== undefined && Math.abs(prev - value) < eps) return;
  styleCache.set(key, value);
  apply(value);
}

let pTarget = 0;
let p = 0;

function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  pTarget = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
}
addEventListener('scroll', readScroll, { passive: true });

function chapterFocus(k, prog) {
  const [a, b] = CHAPTERS[k].range;
  return Math.min(smoothstep(a, a + 0.06, prog), 1 - smoothstep(b - 0.06, b, prog));
}

const colBottom = new THREE.Color();
const cPaperBot = new THREE.Color(PAPER.bottom);
const cDarkBot = new THREE.Color(DARK.bottom);

/* ---------- mouse parallax ---------- */

let mx = 0, my = 0, mxS = 0, myS = 0;

/* ---------- language swap (i18n.js) ----------
   detail 1 = спираль ныряет под кадр пока тексты гаснут,
   detail 0 = поднимается обратно уже с новым языком */

let langDipTarget = 0;
let langDip = 0;
addEventListener('horin:langdip', (e) => { langDipTarget = e.detail; });

/* ---------- lightbox: click a photo to view it fullscreen ---------- */

const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('img');
const lbNum = lightbox.querySelector('.lb-num');
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const photoMeshes = photos.map((ph) => ph.mesh);

function photoAt(clientX, clientY) {
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster
    .intersectObjects(photoMeshes)
    .find((h) => h.object.material.opacity > 0.35);
  return hit ? photoMeshes.indexOf(hit.object) : -1;
}

let lbOpenedAt = -1;
function openLightbox(i) {
  lbImg.classList.remove('is-loaded');
  lbImg.onload = () => lbImg.classList.add('is-loaded');
  lbImg.src = `assets/img/full/${IMGS[i]}.webp`;
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
  // тач: синтезированный после открытия click хит-тестится уже по
  // открытому lightbox — не даём ему мгновенно закрыть просмотр
  if (performance.now() - lbOpenedAt < 500) return;
  closeLightbox();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

/* tap vs scroll: track press distance, open on a genuine click only */
let downX = 0, downY = 0;
let touchHandledAt = -1;
addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY;
}, { passive: true });

/* iOS Safari не синтезирует click по неинтерактивным элементам
   (тап уходит в #scroll-space/canvas) — тач обрабатываем сами по
   pointerup; скролл-жест отсеивается дистанцией, прерванный — браузер
   шлёт pointercancel вместо pointerup */
addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return; // мышь идёт через click ниже
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
  touchHandledAt = performance.now();
  if (lightbox.classList.contains('is-on')) { closeLightbox(); return; }
  if (e.target.closest('a, button, input, textarea')) return;
  const i = photoAt(e.clientX, e.clientY);
  if (i >= 0) openLightbox(i);
}, { passive: true });

addEventListener('click', (e) => {
  // браузеры, которые синтезируют click после тача, уже обработаны выше
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

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const spiralQ = new THREE.Quaternion();
const eul = new THREE.Euler();

function frame(now) {
  requestAnimationFrame(frame);
  const t = now * 0.001;

  p += (pTarget - p) * (reduceMotion ? 1 : 0.07);

  /* background: stay light on the cover, sink into black.
     Crossfade of two static gradients — opacity only, no repaint */
  const dark = smoothstep(0.05, 0.30, p);
  setCached('bgDark', (v) => { bgDarkEl.style.opacity = v.toFixed(3); }, dark);
  colBottom.copy(cPaperBot).lerp(cDarkBot, dark);
  scene.fog.color.copy(colBottom);
  header.classList.toggle('is-inverse', dark > 0.55);

  langDip += (langDipTarget - langDip) * (reduceMotion ? 1 : 0.075);

  /* column draw-in */
  if (sceneStart > 0) {
    const e = clamp((now - sceneStart) / 1500, 0, 1);
    colClip.constant = lerp(-4, 50, easeInOut(e));
  } else {
    colClip.constant = -4;
  }

  /* camera descends the column */
  const camY = lerp(CAM.yFrom, CAM.yTo, p);
  mxS += (mx - mxS) * 0.04;
  myS += (my - myS) * 0.04;
  camera.position.set(mxS * 0.7, camY + myS * -0.35, camZ);
  camera.lookAt(0, camY - 0.7, 0);
  camera.updateMatrixWorld();

  /* chapter focuses */
  const focuses = CHAPTERS.map((_, k) => chapterFocus(k, p));
  const fMax = Math.max(...focuses);

  /* spiral twist */
  const rot = p * Math.PI * 2.5 + (reduceMotion ? 0 : t * 0.04);

  photos.forEach((ph) => {
    const { mesh } = ph;

    /* entrance: rise from below, staggered */
    let enter = 1;
    if (sceneStart > 0) {
      enter = clamp((now - sceneStart - 200 - ph.slot * 70 - ph.block * 40) / 900, 0, 1);
      enter = easeInOut(enter);
    } else enter = 0;

    const a = ph.theta + rot;
    const sx = Math.cos(a) * SPIRAL.radius;
    const sz = Math.sin(a) * SPIRAL.radius;
    const sy = ph.baseY - (1 - enter) * 5.5;

    /* cylindrical billboard: face the camera, never edge-on */
    eul.set(0, Math.atan2(camera.position.x - sx, camera.position.z - sz), 0);
    spiralQ.setFromEuler(eul);

    const f = easeInOut(focuses[ph.block]);
    if (f > 0.001) {
      slotLocal(ph.slot, slotTmp);
      tmpV.copy(slotTmp.pos).applyMatrix4(camera.matrixWorld);
      mesh.position.set(lerp(sx, tmpV.x, f), lerp(sy, tmpV.y, f), lerp(sz, tmpV.z, f));
      tmpQ.copy(camera.quaternion);
      mesh.quaternion.copy(spiralQ).slerp(tmpQ, f);
      const s = lerp(1, slotTmp.scale, f);
      mesh.scale.set(s, s, s);
    } else {
      mesh.position.set(sx, sy, sz);
      mesh.quaternion.copy(spiralQ);
      mesh.scale.set(1, 1, 1);
    }

    /* language swap: each photo dives below the frame, staggered by slot */
    const phDip = easeInOut(clamp(langDip * 1.45 - ph.slot * 0.05, 0, 1));
    if (phDip > 0.0005) mesh.position.y -= phDip * 8;

    /* focused block stays bright, the rest sink back */
    const dim = fMax > 0 ? (focuses[ph.block] === fMax && fMax > 0.01 ? 1 : 1 - fMax * 0.92) : 1;
    mesh.material.opacity = enter * dim * (1 - phDip);
  });

  /* DOM chapters */
  chapterEls.forEach((el, k) => {
    const f = focuses[k];
    setCached(`ch${k}`, (v) => {
      el.style.opacity = v.toFixed(3);
      el.style.visibility = v > 0.005 ? 'visible' : 'hidden';
      el.style.setProperty('--chOff', (1 - easeInOut(v)) * 26);
    }, f);
  });

  /* hero out, outro in (held back until the logo lands) */
  const heroIn = sceneStart > 0 ? clamp((now - sceneStart) / 700, 0, 1) : 0;
  const heroF = (1 - smoothstep(0.015, 0.085, p)) * easeInOut(heroIn);
  setCached('hero', (v) => {
    hero.style.opacity = v.toFixed(3);
    hero.style.visibility = v > 0.005 ? 'visible' : 'hidden';
  }, heroF);

  const outroF = smoothstep(0.92, 0.985, p);
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
  applyResponsive();
});

readScroll();
requestAnimationFrame(frame);
