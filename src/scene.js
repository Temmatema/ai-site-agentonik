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
  ctx.shadowColor = 'rgba(20,22,26,0.16)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
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

/* ---------- мягкие текстуры ---------- */
function haloTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// нейтральный размытый шар: цвет задаётся тонировкой спрайта
function softSphereTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(96, 88, 8, 128, 128, 112);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#f0efeb');
  g.addColorStop(1, '#cfcec8');
  if ('filter' in c) c.filter = 'blur(7px)';
  c.fillStyle = g;
  c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function blobShadowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(40,36,28,0.55)');
  g.addColorStop(0.5, 'rgba(40,36,28,0.2)');
  g.addColorStop(1, 'rgba(40,36,28,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

const TAU = Math.PI * 2;
const wrapAngle = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

/* ---------- сцена ---------- */
export function createHeroScene(canvas, hooks = {}) {
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const speed = reduce ? 0.02 : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  scene.environmentIntensity = 0.9;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e0d4, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const rim = new THREE.PointLight(0xc4f25a, 14, 22);
  rim.position.set(4.5, 1.5, -3);
  scene.add(rim);

  // мягкая «контактная» тень вместо жёсткой
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  scene.add(blob);

  /* робот: компактная «игрушка». Белая голова-капсула со встроенным экраном и гладкое тело-кокон */
  const clay = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.8, sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff) });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e23, roughness: 0.55 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc4f25a, roughness: 0.6 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x0f1115, roughness: 0.14, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0xe2dfd8, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const glow = new THREE.MeshBasicMaterial({ color: C_CORAL.clone(), toneMapped: false });
  const haloMat = new THREE.SpriteMaterial({ map: haloTexture(), color: C_CORAL.clone(), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
  const halo = (parent, x, y, z, size) => {
    const sp = new THREE.Sprite(haloMat);
    sp.position.set(x, y, z); sp.scale.setScalar(size);
    parent.add(sp);
    return sp;
  };

  const agent = new THREE.Group();
  const rig = new THREE.Group(); // сюда применяем «сплющивание» при проглатывании заявки
  agent.add(rig);
  const add = (mesh, parent = rig) => { parent.add(mesh); return mesh; };

  // тело: мягкая капсула, чуть выше головы
  const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.92, 0.3, 16, 40), clay));
  body.position.y = -1.13;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.34, 32), dark)).position.y = 0.03;

  // голова: цельная капсула, чуть шире тела
  const head = new THREE.Group();
  head.position.y = 0.95;
  rig.add(head);
  add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.7, 1.5, 12, 0.5), clay), head);

  // экран встроен в переднюю грань, без выступающей массы
  const bezel = add(new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(1.82, 1.06, 0.4), 24), bezelMat), head);
  bezel.position.z = 0.752;
  const screen = add(new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(1.72, 0.96, 0.34), 24), visorMat), head);
  screen.position.z = 0.756;
  const shine = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false })), head);
  shine.position.set(-0.25, 0.32, 0.762); shine.rotation.z = 0.1;

  // лицо: два маленьких вертикальных глаза и тонкая улыбка
  const eyeL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.2, 6, 12), glow);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.3, 0.1, 0.78);
  eyeR.position.set(0.3, 0.1, 0.78);
  head.add(eyeL, eyeR);
  const haloEyeL = halo(head, -0.3, 0.1, 0.8, 0.6);
  const haloEyeR = halo(head, 0.3, 0.1, 0.8, 0.6);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 24, Math.PI), glow);
  mouth.position.set(0, -0.14, 0.78);
  head.add(mouth);

  // боковые накладки (без колец)
  for (const sx of [-1, 1]) {
    const pad = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 36), clay), head);
    pad.rotation.z = Math.PI / 2; pad.position.set(sx * 1.2, 0, 0);
    const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 32), accent), head);
    cap.rotation.z = Math.PI / 2; cap.position.set(sx * 1.2, 0, 0);
  }

  // короткая антенна
  const antenna = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 12), dark), head);
  antenna.position.y = 1.0;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), glow);
  bulb.position.y = 1.2;
  head.add(bulb);
  const haloBulb = halo(head, 0, 1.2, 0, 0.7);

  // счётчик на груди
  const chestCv = document.createElement('canvas');
  chestCv.width = 256; chestCv.height = 128;
  const chestTex = new THREE.CanvasTexture(chestCv);
  chestTex.colorSpace = THREE.SRGBColorSpace;
  const chest = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.42, 0.1, 4, 0.05), dark);
  chest.position.set(0, -0.8, 0.88);
  rig.add(chest);
  const chestFace = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.36), new THREE.MeshBasicMaterial({ map: chestTex, toneMapped: false }));
  chestFace.position.set(0, -0.8, 0.935);
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

  // руки: простые округлые сегменты и маленькая рукавица-«грипер»
  const boneGeo = new THREE.CylinderGeometry(0.13, 0.13, 1, 18);
  const UP = new THREE.Vector3(0, 1, 0);
  const vE = new THREE.Vector3(), vH = new THREE.Vector3(), vD = new THREE.Vector3();
  const arms = [-1, 1].map((sx) => {
    const S = new THREE.Vector3(sx * 0.88, -0.55, 0.25);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), clay)).position.copy(S);
    const upper = add(new THREE.Mesh(boneGeo, clay));
    const fore = add(new THREE.Mesh(boneGeo, clay));
    const elbow = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), clay));
    const hand = new THREE.Group();
    rig.add(hand);
    const glove = sx > 0 ? dark : clay;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 20), glove);
    palm.scale.set(0.23, 0.27, 0.2);
    hand.add(palm);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), glove);
    thumb.position.set(sx * 0.2, 0.05, 0.06);
    hand.add(thumb);
    return { sx, S, upper, fore, elbow, hand };
  });

  function bone(mesh, A, B) {
    vD.copy(B).sub(A);
    const len = vD.length() || 1e-4;
    mesh.position.copy(A).add(B).multiplyScalar(0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(UP, vD.divideScalar(len));
  }
  function solveArm(arm, hx, hy) {
    const { S, sx } = arm, l1 = 0.62, l2 = 0.62;
    let dx = hx - S.x, dy = hy - S.y, d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.02;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    d = Math.max(d, 0.3);
    const ux = dx / d, uy = dy / d;
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const ex = S.x + ux * a, ey = S.y + uy * a, px = -uy, py = ux;
    const sign = (ex + px * h - S.x) * sx > (ex - px * h - S.x) * sx ? 1 : -1; // сгиб наружу
    vE.set(ex + px * h * sign, ey + py * h * sign, S.z);
    vH.set(S.x + dx, S.y + dy, S.z);
    bone(arm.upper, S, vE);
    bone(arm.fore, vE, vH);
    arm.elbow.position.copy(vE);
    arm.hand.position.copy(vH);
    vD.copy(vH).sub(vE).normalize();
    arm.hand.quaternion.setFromUnitVectors(UP, vD);
  }
  scene.add(agent);

  /* фон: большие размытые шары на краях и несколько чётких матовых фигур */
  const softTex = softSphereTexture();
  const SOFT = [
    { nx: -1.0, ny: 0.62, z: -6, size: 2.0, c: '#f1ece6', o: '#f2f2ee' },
    { nx: 1.02, ny: 0.8, z: -8, size: 2.6, c: '#fff0e8', o: '#ecf6c6' },
    { nx: -0.9, ny: -0.7, z: -5, size: 1.6, c: '#ffe0d4', o: '#e3f2ac' },
    { nx: 0.98, ny: -0.1, z: -5, size: 1.7, c: '#f1ece6', o: '#f2f2ee' },
    { nx: -1.05, ny: 0.02, z: -4, size: 1.1, c: '#ffffff', o: '#fbfbf8' },
    { nx: 0.7, ny: -0.75, z: -7, size: 1.9, c: '#ffe9df', o: '#e9f5bd' },
  ];
  const softItems = SOFT.map((d) => {
    const mat = new THREE.SpriteMaterial({ map: softTex, color: d.c, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
    const sp = new THREE.Sprite(mat);
    scene.add(sp);
    return { ...d, mesh: sp, mat, cA: new THREE.Color(d.c), cB: new THREE.Color(d.o), phase: rand(0, 6.28), pos: new THREE.Vector3(), sc: 1 };
  });

  const sph = new THREE.SphereGeometry(1, 32, 24);
  const matte = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0 });
  const CRISP = [
    { nx: -0.5, ny: -0.02, z: -1.2, size: 0.5, geo: new RoundedBoxGeometry(1, 1, 1, 5, 0.3), c: '#1c1e23', o: '#1c1e23' },
    { nx: 0.42, ny: -0.52, z: -1.0, size: 0.26, geo: sph, c: '#f6f4ee', o: '#f6f4ee' },
    { nx: 0.5, ny: -0.22, z: -1.3, size: 0.46, geo: sph.clone().scale(1, 0.8, 0.8), c: '#ff5b3a', o: '#c4f25a' },
  ];
  const bgItems = CRISP.map((d) => {
    const mat = matte(d.c);
    const mesh = new THREE.Mesh(d.geo, mat);
    scene.add(mesh);
    return { ...d, mesh, mat, cA: new THREE.Color(d.c), cB: new THREE.Color(d.o), phase: rand(0, 6.28), spin: new THREE.Vector3(rand(-0.5, 0.5), rand(-0.5, 0.5), rand(-0.3, 0.3)), pos: new THREE.Vector3(), sc: 1 };
  });

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
      phase: rand(0, 6.28), placed: false, push: new THREE.Vector2(),
      base: new THREE.Vector3(), baseRot: 0, seg: null, queue: [],
    };
  });
  const activeCards = () => cards.filter((c) => c.active);

  /* раскладка */
  const L = { cs: 1, slots: [], agentS: 1, agentY: 0, mouth: new THREE.Vector3(0, 0, 1.4), halfW: 6, halfH: 3.7, portrait: false };

  function placeAgent(topY, bottomY) {
    const ext = 4.5, mid = 0.05; // высота робота в мире и смещение его центра от начала координат
    const s = clamp((topY - bottomY) / ext, 0.35, 1.25);
    L.agentS = s;
    L.agentY = (topY + bottomY) / 2 - mid * s;
    agent.scale.setScalar(s);
    agent.position.set(0, L.agentY, 0);
    blob.position.set(0, bottomY + 0.1 * s, 0);
    blob.userData.s = s;
    blob.scale.set(4.6 * s, 7 * s, 1);
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
    const k = halfH / 3.73;
    [...softItems, ...bgItems].forEach((it) => {
      const persp = (camera.position.z - it.z) / camera.position.z;
      it.pos.set(it.nx * halfW * persp, it.ny * halfH * persp, it.z);
      it.sc = it.size * k * (portrait ? 0.8 : 1);
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
      const zoneTop = 0.46 * halfH, zoneBot = -0.7 * halfH;
      L.cs = Math.min(L.cs, (zoneTop - zoneBot) / (4 * CH * 1.12));
      const xCol = halfW - (CW * L.cs) / 2 - 0.45;
      const pitch = CH * L.cs * 1.12, yc = (zoneTop + zoneBot) / 2;
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
  }
  function queueSeg(c, seg) { c.queue.push(seg); if (!c.seg) startSeg(c, c.queue.shift()); }

  function processCard(c, delay) {
    if (c.done || c.busy) return;
    c.busy = true;
    c.slot = slotCounter++;
    const slotAt = c.slot;
    queueSeg(c, {
      delay, dur: 0.62 / speed, ease: easeInOut,
      to: L.mouth.clone(), toRotZ: 0, toRotY: 0, toSc: 0.22, lift: 0.9,
      onDone() {
        c.done = true; squash = 1;
        c.mat.map = ticketTex(c.i, 'order');
        emitProgress();
      },
    });
    queueSeg(c, {
      delay: 0, dur: 0.95 / speed, ease: easeOutBack,
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
    c.resetting = true;
    queueSeg(c, {
      delay, dur: 1.0 / speed, ease: easeInOut,
      get to() { return c.base.clone(); }, toRotZ: c.baseRot, toRotY: 0, toSc: CHAOS_SC, spin: -Math.PI * 2, lift: 0,
      onStart() { c.mat.map = ticketTex(c.i, 'chaos'); c.done = false; c.slot = -1; emitProgress(); },
      onDone() { c.busy = false; c.resetting = false; },
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
    let sc, x, y, z = 0, rx = 0, ry = 0, rz;
    if (c.done) {
      const s = L.slots[c.slot] || c.base;
      x = s.x; y = s.y; rz = 0; sc = L.cs;
      ry = pointer.x * 0.08; rx = -pointer.y * 0.05;
    } else {
      const amp = reduce ? 0 : 1;
      const ox = Math.sin(t * 0.7 + c.phase) * 0.14, oy = Math.cos(t * 0.6 + c.phase * 1.3) * 0.12;
      let px = 0, py = 0;
      if (pointer.inside && !reduce) {
        const dx = c.base.x - pointer.wx, dy = c.base.y - pointer.wy, d = Math.hypot(dx, dy) || 1;
        if (d < 2.6) { const f = ((2.6 - d) / 2.6) * 0.9; px = (dx / d) * f; py = (dy / d) * f; }
      }
      c.push.x += (px - c.push.x) * (1 - Math.exp(-dt * 4));
      c.push.y += (py - c.push.y) * (1 - Math.exp(-dt * 4));
      x = c.base.x + (ox + c.push.x) * amp;
      y = c.base.y + (oy + c.push.y) * amp;
      z = Math.sin(t * 0.8 + c.phase) * 0.25 * amp;
      rz = c.baseRot + Math.sin(t * 0.7 + c.phase) * 0.04 * amp;
      ry = (Math.sin(t * 0.5 + c.phase) * 0.16 + pointer.x * 0.1) * amp;
      rx = pointer.y * 0.07 * amp;
      sc = CHAOS_SC;
    }
    c.hover += ((c.hovered ? 1 : 0) - c.hover) * (1 - Math.exp(-dt * 8));
    z += c.hover * 0.4;
    sc *= 1 + c.hover * 0.07;
    if (!c.placed) {
      c.placed = true;
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.setScalar(sc);
      return;
    }
    const k = 1 - Math.exp(-dt * 9); // плавное приближение к цели
    m.position.x += (x - m.position.x) * k;
    m.position.y += (y - m.position.y) * k;
    m.position.z += (z - m.position.z) * k;
    m.rotation.x += (rx - m.rotation.x) * k;
    m.rotation.y += (ry - m.rotation.y) * k;
    m.rotation.z += (rz - m.rotation.z) * k;
    m.scale.setScalar(m.scale.x + (sc - m.scale.x) * k);
  }

  function stepSeg(c, dt) {
    const s = c.seg;
    if (s.delay > 0) { s.delay -= dt; idleCard(c, dt); return; }
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
      m.rotation.set(wrapAngle(m.rotation.x), wrapAngle(m.rotation.y), wrapAngle(m.rotation.z));
      c.seg = null;
      s.onDone && s.onDone();
      if (c.queue.length) startSeg(c, c.queue.shift());
    }
  }

  function updateAgent(dt) {
    const f = activeCards().length ? doneCount() / activeCards().length : 0;
    mood += (f - mood) * Math.min(1, dt * 4);
    glow.color.lerpColors(C_CORAL, C_LIME, mood);
    haloMat.color.copy(glow.color);
    rim.color.lerpColors(C_CORAL, C_LIME, mood);

    const calm = reduce ? 1 : mood;
    agent.position.y = L.agentY + Math.sin(t * (1.1 + 1.2 * (1 - calm))) * (0.05 + 0.05 * (1 - calm)) * L.agentS;
    agent.rotation.z = Math.sin(t * 2.2) * 0.02 * (1 - calm);

    const tx = pointer.inside ? pointer.x : Math.sin(t * 0.5) * 0.4;
    const ty = pointer.inside ? pointer.y : Math.cos(t * 0.4) * 0.15;
    lookX += (tx - lookX) * Math.min(1, dt * 6);
    lookY += (ty - lookY) * Math.min(1, dt * 6);
    head.rotation.y = lookX * 0.5;
    head.rotation.x = -lookY * 0.25;
    head.rotation.z = -0.08 + lookX * -0.04;
    eyeL.position.x = -0.3 + lookX * 0.08; eyeR.position.x = 0.3 + lookX * 0.08;
    eyeL.position.y = eyeR.position.y = 0.1 + lookY * 0.06;
    haloEyeL.position.x = eyeL.position.x; haloEyeR.position.x = eyeR.position.x;
    haloEyeL.position.y = haloEyeR.position.y = eyeL.position.y;

    nextBlink -= dt;
    if (nextBlink < 0) { blink = 0.14; nextBlink = rand(2.2, 5); }
    blink = Math.max(0, blink - dt);
    const wide = 1.1 - 0.1 * mood;
    eyeL.scale.y = eyeR.scale.y = blink > 0 ? 0.12 : wide;

    mouth.scale.y = 0.9 + (-1.0 - 0.9) * mood;
    mouth.position.y = -0.14 + mood * 0.05;

    const bp = 1 + (reduce ? 0 : Math.sin(t * (2 + 3 * (1 - calm))) * 0.18 * (1 - calm * 0.7));
    bulb.scale.setScalar(bp); haloBulb.scale.setScalar(0.7 * bp);
    antenna.rotation.z = Math.sin(t * 2.4) * 0.06 * (1 - calm);

    squash = Math.max(0, squash - dt * 4);
    const sq = Math.sin(squash * Math.PI) * 0.1;
    rig.scale.set(1 + sq, 1 - sq, 1 + sq);

    const k = 1 - calm;
    const wave = clamp((mood - 0.5) / 0.35, 0, 1); // правая рука машет, когда почти всё разобрано
    for (const arm of arms) {
      const { sx } = arm;
      const lowX = sx * 1.35 + Math.sin(t * 3.2 + sx) * 0.2 * k;
      const lowY = -1.25 + Math.sin(t * 3.8 + sx * 2) * 0.25 * k + Math.sin(t * 1.4 + sx) * 0.04;
      if (sx > 0) {
        const wx = 1.4 + Math.sin(t * 4) * 0.12, wy = 0.3 + Math.cos(t * 4) * 0.04;
        solveArm(arm, lowX + (wx - lowX) * wave, lowY + (wy - lowY) * wave);
      } else solveArm(arm, lowX, lowY);
    }
    const bob = Math.sin(t * (1.1 + 1.2 * (1 - calm)));
    blob.material.opacity = 0.5 - bob * 0.06;
    blob.scale.set(4.6 * L.agentS * (1 - bob * 0.04), 7 * L.agentS * (1 - bob * 0.04), 1);

    if (mood > 0.98) {
      if (t - chestLast > 0.9) { chestN += Math.floor(rand(1, 4)); chestLast = t; drawChest(String(chestN), '#c4f25a'); }
    } else if (t - chestLast > 0.25) {
      chestLast = t;
      drawChest(mood < 0.05 ? 'ERR' : `${Math.round(mood * 100)}%`, mood < 0.05 ? '#ff5b3a' : '#e8c15a');
    }
  }

  function updateBg(dt) {
    const chaosK = reduce ? 0 : 1 - mood;
    const pulse = 1 + Math.sin(squash * Math.PI) * 0.1;
    const place = (it, jit) => {
      const par = -it.z * 0.07;
      it.mesh.position.set(
        it.pos.x + Math.sin(t * 0.4 + it.phase) * 0.25 - pointer.x * par,
        it.pos.y + Math.sin(t * 0.6 + it.phase) * 0.2 * (1 + jit * 0.6) - pointer.y * par * 0.6,
        it.pos.z,
      );
      it.mat.color.lerpColors(it.cA, it.cB, mood);
    };
    for (const it of softItems) {
      place(it, chaosK * 0.4);
      it.mesh.scale.setScalar(it.sc * 2 * pulse);
    }
    for (const it of bgItems) {
      const m = it.mesh;
      m.rotation.x += it.spin.x * dt * (0.2 + 0.8 * chaosK);
      m.rotation.y += it.spin.y * dt * (0.2 + 0.8 * chaosK);
      m.rotation.z += it.spin.z * dt * (0.2 + 0.6 * chaosK);
      place(it, chaosK);
      m.scale.setScalar(it.sc * pulse);
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running || !visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    cards.forEach((c) => { if (c.active) (c.seg ? stepSeg(c, dt) : idleCard(c, dt)); });
    updateAgent(dt);
    updateBg(dt);
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
