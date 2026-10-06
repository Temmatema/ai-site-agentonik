import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TICKETS, PORTRAIT_IDS } from './data.js';

/*
 * Hero-сцена: робот-агент и заявки. Хаос: заявки парят, дрожат и убегают от курсора.
 * Клик по заявке (или переключатель): заявка летит в агента и выходит разобранной в свою колонку.
 * Настроение робота и цифры на странице следят за долей разобранных заявок.
 */

const CW = 2.5; // ширина карточки в мире
const CH = 1.25;
const FOV = 32;
const CHAOS_SC = 0.88; // в хаосе заявки чуть меньше, чтобы не слипались
const C_CORAL = new THREE.Color('#ff5b3a');
const C_LIME = new THREE.Color('#c4f25a');

const easeInCubic = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const deg = (d) => (d * Math.PI) / 180;

/* ---------- текстуры карточек ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function drawTicket(ticket, state) {
  const W = 768, H = 384, m = 26, r = 38;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const x = m, y = m, w = W - 2 * m, h = H - 2 * m;
  const isOrder = state === 'order';
  const d = ticket[state];

  ctx.save();
  ctx.shadowColor = 'rgba(20,22,26,0.24)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = isOrder ? '#7fc01c' : '#ff5b3a';
  ctx.fillRect(x, y, 16, h);
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#8d9097';
  ctx.font = '700 22px "JetBrains Mono", Consolas, monospace';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.fillText(ticket.tag.toUpperCase(), x + 44, y + 62);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  ctx.font = '700 24px Onest, "Segoe UI", sans-serif';
  const cw = ctx.measureText(d.c).width + 46;
  const cx = x + w - cw - 30, cy = y + 28;
  ctx.fillStyle = isOrder ? '#e9f9c4' : '#ffe1d9';
  roundRect(ctx, cx, cy, cw, 46, 23);
  ctx.fill();
  ctx.fillStyle = isOrder ? '#4a7a0c' : '#b83a1f';
  ctx.beginPath();
  ctx.arc(cx + 22, cy + 23, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(d.c, cx + 36, cy + 32);

  ctx.fillStyle = '#14161a';
  ctx.font = '600 40px Onest, "Segoe UI", sans-serif';
  const lines = wrapLines(ctx, d.t, w - 96, 3);
  lines.forEach((ln, i) => ctx.fillText(ln, x + 44, y + 150 + i * 52));
  return cv;
}

/* ---------- сцена ---------- */
export function createHeroScene(canvas, hooks = {}) {
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const speed = reduce ? 0.02 : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3.5, 6, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d0c0, 0.55));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* робот */
  const clay = new THREE.MeshPhysicalMaterial({ color: 0xf8f5ef, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.45 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x14161a, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc4f25a, roughness: 0.45 });
  const glow = new THREE.MeshBasicMaterial({ color: C_CORAL.clone(), toneMapped: false });

  const agent = new THREE.Group();
  const rig = new THREE.Group(); // сюда применяем «сплющивание» при проглатывании заявки
  agent.add(rig);
  const add = (mesh, parent = rig) => { mesh.castShadow = true; parent.add(mesh); return mesh; };

  const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 0.7, 12, 32), clay));
  body.position.y = -1.0;
  const head = new THREE.Group();
  head.position.y = 1.0;
  rig.add(head);
  add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.7, 1.7, 8, 0.55), clay), head);
  const screen = add(new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.1, 0.2, 6, 0.1), dark), head);
  screen.position.set(0, 0, 0.78);
  const eyeL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), glow);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.4, 0.1, 0.9);
  eyeR.position.set(0.4, 0.1, 0.9);
  head.add(eyeL, eyeR);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 24, Math.PI), glow);
  mouth.position.set(0, -0.2, 0.9);
  head.add(mouth);
  for (const sx of [-1, 1]) {
    const ear = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 28), accent), head);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(sx * 1.2, 0, 0);
  }
  const antenna = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12), dark), head);
  antenna.position.y = 1.05;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20), glow);
  bulb.position.y = 1.4;
  head.add(bulb);

  // счётчик на груди
  const chestCv = document.createElement('canvas');
  chestCv.width = 256; chestCv.height = 128;
  const chestTex = new THREE.CanvasTexture(chestCv);
  chestTex.colorSpace = THREE.SRGBColorSpace;
  const chest = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.5, 0.12, 4, 0.06), dark);
  chest.position.set(0, -0.75, 0.82);
  rig.add(chest);
  const chestFace = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.42), new THREE.MeshBasicMaterial({ map: chestTex, toneMapped: false }));
  chestFace.position.set(0, -0.75, 0.885);
  rig.add(chestFace);
  let chestN = 1284, chestLast = 0;
  function drawChest(txt, color) {
    const c = chestCv.getContext('2d');
    c.fillStyle = '#14161a'; c.fillRect(0, 0, 256, 128);
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 64px "JetBrains Mono", Consolas, monospace';
    c.fillText(txt, 128, 68);
    chestTex.needsUpdate = true;
  }

  const hands = [-1, 1].map((sx) => {
    const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 24), clay));
    h.userData = { sx, base: new THREE.Vector3(sx * 1.4, -0.85, 0.25) };
    return h;
  });
  scene.add(agent);

  /* карточки */
  const cardGeo = new THREE.PlaneGeometry(CW, CH);
  const texCache = new Map();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function ticketTex(i, state) {
    const key = i + state;
    if (!texCache.has(key)) {
      const t = new THREE.CanvasTexture(drawTicket(TICKETS[i], state));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      texCache.set(key, t);
    }
    return texCache.get(key);
  }

  const cards = TICKETS.map((_, i) => {
    const mat = new THREE.MeshBasicMaterial({ map: ticketTex(i, 'chaos'), transparent: true, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(cardGeo, mat);
    mesh.userData.i = i;
    scene.add(mesh);
    return {
      i, mesh, mat, active: true, done: false, slot: -1, hover: 0, hovered: false,
      phase: rand(0, 6.28), blend: 1, push: new THREE.Vector2(),
      base: new THREE.Vector3(), baseRot: 0, seg: null, queue: [],
    };
  });
  const activeCards = () => cards.filter((c) => c.active);

  /* раскладка */
  const L = { cs: 1, slots: [], agentS: 1, agentY: 0, mouth: new THREE.Vector3(0, 0, 1.4), halfW: 6, halfH: 3.7, portrait: false };

  function placeAgent(topY, bottomY) {
    const ext = 4.72, mid = 0.16; // высота робота в мире и смещение его центра от начала координат
    const s = clamp((topY - bottomY) / ext, 0.35, 1.25);
    L.agentS = s;
    L.agentY = (topY + bottomY) / 2 - mid * s;
    agent.scale.setScalar(s);
    agent.position.set(0, L.agentY, 0);
    floor.position.y = bottomY + 0.12 * s;
    L.mouth.set(0, L.agentY + 1.0 * s, 1.6);
  }

  function layout() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const portrait = aspect < 0.85;
    const tan = Math.tan(deg(FOV / 2));
    camera.position.z = portrait ? Math.max(13, 3.0 / (tan * aspect)) : 13;
    camera.updateProjectionMatrix();
    const halfH = tan * camera.position.z, halfW = halfH * aspect;
    Object.assign(L, { halfH, halfW, portrait });

    cards.forEach((c) => {
      c.active = !portrait || PORTRAIT_IDS.includes(c.i);
      c.mesh.visible = c.active;
    });
    const act = activeCards();
    L.slots = [];

    if (!portrait) {
      L.cs = clamp(halfW / 6.4, 0.62, 0.95);
      placeAgent(0.36 * halfH, -0.74 * halfH);
      const chaos = [[-0.76, 0.14, -8], [-0.52, -0.18, 6], [-0.78, -0.48, -4], [-0.38, 0.26, 9], [0.76, 0.18, 7], [0.52, -0.2, -6], [0.78, -0.5, 5], [0.38, 0.28, -9]];
      act.forEach((c, k) => {
        const p = chaos[k];
        c.base.set(p[0] * halfW, p[1] * halfH, 0);
        c.baseRot = deg(p[2]);
      });
      const xCol = halfW - (CW * L.cs) / 2 - 0.45;
      const pitch = CH * L.cs * 1.2, yc = -0.14 * halfH;
      for (let k = 0; k < act.length; k++) {
        const col = k < 4 ? -1 : 1, row = k % 4;
        L.slots.push(new THREE.Vector3(col * xCol, yc + (1.5 - row) * pitch, 0));
      }
    } else {
      L.cs = 1.0;
      const topY = 0.44 * halfH, bottomY = -0.58 * halfH;
      const y1 = topY - 0.8, y2 = y1 - CH * 1.2;
      placeAgent(y2 - 0.9, bottomY);
      const chaos = [[-0.5, 0.34, -8], [0.5, 0.18, 7], [-0.46, -0.04, 5], [0.52, -0.2, -7]];
      act.forEach((c, k) => {
        const p = chaos[k];
        c.base.set(p[0] * halfW, p[1] * halfH, 0);
        c.baseRot = deg(p[2]);
      });
      const xc = 1.4;
      [[-xc, y1], [xc, y1], [-xc, y2], [xc, y2]].forEach(([x, y]) => L.slots.push(new THREE.Vector3(x, y, 0)));
    }
  }

  /* прогресс и режим */
  let mode = 'chaos';
  let slotCounter = 0;
  const doneCount = () => activeCards().filter((c) => c.done).length;
  function emitProgress() {
    const total = activeCards().length, n = doneCount();
    hooks.onProgress && hooks.onProgress(total ? n / total : 0, n, total);
    if (n === total && mode !== 'order') { mode = 'order'; hooks.onMode && hooks.onMode('order'); }
    if (n === 0 && mode !== 'chaos') { mode = 'chaos'; hooks.onMode && hooks.onMode('chaos'); }
  }

  let squash = 0;
  function startSeg(c, seg) {
    seg.t = 0; seg.started = false;
    seg.from = new THREE.Vector3(); seg.fromRot = new THREE.Vector3();
    seg.delay = (seg.delay || 0);
    c.seg = seg;
    c.blend = 0;
  }
  function queueSeg(c, seg) { c.queue.push(seg); if (!c.seg) startSeg(c, c.queue.shift()); }

  function processCard(c, delay) {
    if (c.done || c.busy) return;
    c.busy = true;
    c.slot = slotCounter++;
    const slotAt = c.slot;
    queueSeg(c, {
      delay, dur: 0.5 / speed, ease: easeInCubic,
      to: L.mouth.clone(), toRotZ: 0, toRotY: 0, toSc: 0.22, lift: 0.9,
      onDone() {
        c.done = true; squash = 1;
        c.mat.map = ticketTex(c.i, 'order');
        emitProgress();
      },
    });
    queueSeg(c, {
      delay: 0, dur: 0.75 / speed, ease: easeOutBack,
      get to() { return L.slots[slotAt] ? L.slots[slotAt].clone() : new THREE.Vector3(); },
      toRotZ: 0, toRotY: 0, spin: Math.PI * 2, toSc: null, lift: 0.5,
      onStart() { c.mesh.visible = c.active; },
      onDone() { c.busy = false; },
    });
  }

  function resetCard(c, delay) {
    if (!c.done && !c.busy && !c.seg) return;
    c.queue.length = 0;
    c.busy = true;
    queueSeg(c, {
      delay, dur: 0.8 / speed, ease: easeInOut,
      get to() { return c.base.clone(); }, toRotZ: c.baseRot, toRotY: 0, toSc: CHAOS_SC, spin: -Math.PI * 2, lift: 0,
      onStart() { c.mat.map = ticketTex(c.i, 'chaos'); c.done = false; c.slot = -1; emitProgress(); },
      onDone() { c.busy = false; },
    });
  }

  function setMode(next) {
    if (next === 'order') {
      activeCards().filter((c) => !c.done && !c.busy).forEach((c, k) => processCard(c, k * 0.12 / speed));
      mode = 'order';
    } else {
      slotCounter = 0;
      activeCards().forEach((c, k) => resetCard(c, k * 0.08 / speed));
      mode = 'chaos';
    }
  }

  /* указатель */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0, wx: 0, wy: 0, inside: false };
  const tmp = new THREE.Vector3();
  function updatePointer(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    pointer.x = ndc.x; pointer.y = ndc.y; pointer.inside = true;
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const k = -o.z / d.z;
    pointer.wx = o.x + d.x * k; pointer.wy = o.y + d.y * k;
  }
  function pick() {
    const meshes = activeCards().filter((c) => !c.done && !c.busy).map((c) => c.mesh);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? cards[hit.object.userData.i] : null;
  }
  canvas.addEventListener('pointermove', (e) => {
    updatePointer(e);
    const hit = pick();
    cards.forEach((c) => (c.hovered = c === hit));
    canvas.style.cursor = hit ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
    cards.forEach((c) => (c.hovered = false));
    canvas.style.cursor = '';
  });
  canvas.addEventListener('pointerdown', (e) => {
    updatePointer(e);
    const hit = pick();
    if (hit) { processCard(hit, 0); hooks.onFirstClick && hooks.onFirstClick(); }
  });

  /* кадр */
  const clock = new THREE.Clock();
  let running = true, visible = true, raf = 0, t = 0;
  let mood = 0, lookX = 0, lookY = 0, blink = 0, nextBlink = 2;

  function idleCard(c, dt) {
    const m = c.mesh;
    c.blend = Math.min(1, c.blend + dt * 2.2);
    const b = c.blend;
    let sc = 1, x, y, z = 0, rx = 0, ry = 0, rz;
    if (c.done) {
      const s = L.slots[c.slot] || c.base;
      x = s.x; y = s.y; rz = 0; sc = L.cs;
      ry = pointer.x * 0.08 * b; rx = -pointer.y * 0.05 * b;
    } else {
      const amp = reduce ? 0 : 1;
      let ox = Math.sin(t * 0.8 + c.phase) * 0.14 + Math.sin(t * 24 + c.phase * 7) * 0.014;
      let oy = Math.cos(t * 0.7 + c.phase * 1.3) * 0.12 + Math.cos(t * 27 + c.phase * 5) * 0.014;
      let px = 0, py = 0;
      if (pointer.inside && !reduce) {
        const dx = c.base.x - pointer.wx, dy = c.base.y - pointer.wy, d = Math.hypot(dx, dy) || 1;
        if (d < 2.6) { const f = ((2.6 - d) / 2.6) * 1.0; px = (dx / d) * f; py = (dy / d) * f; }
      }
      c.push.x += (px - c.push.x) * Math.min(1, dt * 6);
      c.push.y += (py - c.push.y) * Math.min(1, dt * 6);
      x = c.base.x + (ox + c.push.x) * amp * b + c.push.x * (1 - amp);
      y = c.base.y + (oy + c.push.y) * amp * b;
      z = Math.sin(t * 0.9 + c.phase) * 0.25 * amp;
      rz = c.baseRot + Math.sin(t * 0.9 + c.phase) * 0.05 * amp;
      ry = (Math.sin(t * 0.6 + c.phase) * 0.18 + pointer.x * 0.12) * amp;
      rx = pointer.y * 0.08 * amp;
      sc = CHAOS_SC;
    }
    c.hover += ((c.hovered ? 1 : 0) - c.hover) * Math.min(1, dt * 10);
    m.position.set(x, y, z + c.hover * 0.4);
    m.rotation.set(rx, ry, rz);
    m.scale.setScalar(sc * (1 + c.hover * 0.08));
  }

  function stepSeg(c, dt) {
    const s = c.seg;
    if (s.delay > 0) { s.delay -= dt; idleCard(c, dt); c.blend = 1; return; }
    const m = c.mesh;
    if (!s.started) {
      s.started = true;
      s.from.copy(m.position);
      s.fromRot.set(m.rotation.x, m.rotation.y, m.rotation.z);
      s.fromSc = m.scale.x;
      s.toV = s.to;
      s.toScale = s.toSc == null ? L.cs : s.toSc;
      m.visible = c.active;
      s.onStart && s.onStart();
    }
    s.t = Math.min(1, s.t + dt / s.dur);
    const e = s.ease(s.t), a = s.from, b = s.toV, u = 1 - e;
    const lift = (s.lift || 0) * Math.sin(Math.PI * s.t);
    m.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + lift, a.z + (b.z - a.z) * e + lift * 0.6);
    m.rotation.set(s.fromRot.x * u, s.fromRot.y * u + (s.toRotY || 0) * e + (s.spin || 0) * e, s.fromRot.z * u + s.toRotZ * e);
    m.scale.setScalar(s.fromSc + (s.toScale - s.fromSc) * e);
    if (s.t >= 1) {
      c.seg = null;
      s.onDone && s.onDone();
      if (c.queue.length) startSeg(c, c.queue.shift());
    }
  }

  function updateAgent(dt) {
    const f = activeCards().length ? doneCount() / activeCards().length : 0;
    mood += (f - mood) * Math.min(1, dt * 4);
    glow.color.lerpColors(C_CORAL, C_LIME, mood);

    const calm = reduce ? 1 : mood;
    agent.position.y = L.agentY + Math.sin(t * (1.2 + 3 * (1 - calm))) * (0.05 + 0.07 * (1 - calm)) * L.agentS;
    agent.rotation.z = Math.sin(t * 19) * 0.014 * (1 - calm);

    const tx = pointer.inside ? pointer.x : Math.sin(t * 0.5) * 0.4;
    const ty = pointer.inside ? pointer.y : Math.cos(t * 0.4) * 0.15;
    lookX += (tx - lookX) * Math.min(1, dt * 6);
    lookY += (ty - lookY) * Math.min(1, dt * 6);
    head.rotation.y = lookX * 0.5;
    head.rotation.x = -lookY * 0.25;
    eyeL.position.x = -0.4 + lookX * 0.12; eyeR.position.x = 0.4 + lookX * 0.12;
    eyeL.position.y = eyeR.position.y = 0.1 + lookY * 0.08;

    nextBlink -= dt;
    if (nextBlink < 0) { blink = 0.14; nextBlink = rand(2.2, 5); }
    blink = Math.max(0, blink - dt);
    const wide = 1.2 - 0.2 * mood;
    eyeL.scale.y = eyeR.scale.y = blink > 0 ? 0.12 : wide;

    mouth.scale.y = 0.9 + (-1.0 - 0.9) * mood;
    mouth.position.y = -0.2 + mood * 0.1;

    bulb.visible = mood > 0.95 || reduce ? true : Math.sin(t * 14) > 0;
    antenna.rotation.z = Math.sin(t * 20) * 0.1 * (1 - calm);

    squash = Math.max(0, squash - dt * 4);
    const sq = Math.sin(squash * Math.PI) * 0.1;
    rig.scale.set(1 + sq, 1 - sq, 1 + sq);

    for (const h of hands) {
      const { sx, base } = h.userData;
      const k = 1 - calm;
      h.position.set(
        base.x + Math.sin(t * 7 + sx) * 0.12 * k + sx * 0.08 * calm,
        base.y + Math.sin(t * 9 + sx * 2) * 0.18 * k + Math.sin(t * 1.4 + sx) * 0.05,
        base.z,
      );
    }

    if (mood > 0.98) {
      if (t - chestLast > 0.9) { chestN += Math.floor(rand(1, 4)); chestLast = t; drawChest(String(chestN), '#c4f25a'); }
    } else if (t - chestLast > 0.25) {
      chestLast = t;
      drawChest(mood < 0.05 ? 'ERR' : `${Math.round(mood * 100)}%`, mood < 0.05 ? '#ff5b3a' : '#e8c15a');
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running || !visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    cards.forEach((c) => { if (c.active) (c.seg ? stepSeg(c, dt) : idleCard(c, dt)); });
    updateAgent(dt);
    renderer.render(scene, camera);
  }

  /* жизненный цикл */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }) : null;
  io && io.observe(canvas);
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  const onVis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  layout();
  drawChest('ERR', '#ff5b3a');
  cards.forEach((c) => { if (c.active) idleCard(c, 0.016); });
  frame();

  return {
    setMode,
    get mode() { return mode; },
    dispose() {
      cancelAnimationFrame(raf); io && io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
