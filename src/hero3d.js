import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/*
 * 3D-маскот главного экрана: круглый пушистый «плюшевый» шарик кремового цвета
 * с маленькими чёрными глазками, розовыми щёчками, короткими ручками и лаймовым ростком.
 * Мех собран из тонких слоёв-оболочек с шумом. Вокруг парят кубики-иконки и мягкие шары.
 * Сцена подгоняется под DOM-элемент «stage».
 */

const FOV = 32;
const CAM_Z = 13;
const MODEL_H = 4.6;  // высота модели в её единицах
const MODEL_W = 6.4;  // ширина с парящими кубиками
const MODEL_CY = 1.75; // вертикальный центр модели

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

/* ---------- текстуры ---------- */
function canvasTex(size, draw, srgb = true) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const radial = (size, stops) => canvasTex(size, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const blushTex = () => radial(128, [[0, 'rgba(255,140,165,0.95)'], [0.55, 'rgba(255,150,175,0.45)'], [1, 'rgba(255,160,185,0)']]);
const shadowTex = () => radial(128, [[0, 'rgba(40,36,28,0.5)'], [0.5, 'rgba(40,36,28,0.18)'], [1, 'rgba(40,36,28,0)']]);
const softSphereTex = () => canvasTex(256, (c, s) => {
  const g = c.createRadialGradient(96, 88, 8, 128, 128, 112);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f0efeb'); g.addColorStop(1, '#cfcec8');
  if ('filter' in c) c.filter = 'blur(7px)';
  c.fillStyle = g; c.beginPath(); c.arc(s / 2, s / 2, 104, 0, Math.PI * 2); c.fill();
});
const dropTex = () => canvasTex(64, (c, s) => {
  const g = c.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, '#d4ecff'); g.addColorStop(1, '#7fbaf5');
  c.fillStyle = g; c.beginPath();
  c.moveTo(s / 2, 4); c.bezierCurveTo(s * 0.95, s * 0.5, s * 0.8, s - 4, s / 2, s - 4); c.bezierCurveTo(s * 0.2, s - 4, s * 0.05, s * 0.5, s / 2, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(s * 0.38, s * 0.55, 5, 9, 0.2, 0, Math.PI * 2); c.fill();
});
// мягкий шум для меха: рисуем мелко и растягиваем, чтобы пряди были «пучками»
const furNoise = () => {
  const t = canvasTex(128, (c, s) => {
    const small = document.createElement('canvas'); small.width = small.height = 64;
    const sc = small.getContext('2d'), img = sc.createImageData(64, 64);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    sc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true; c.drawImage(small, 0, 0, s, s);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3);
  return t;
};
const iconTex = (kind, ink) => canvasTex(256, (c, s) => {
  c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 14; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'plane') {
    c.save(); c.translate(s * 0.14, s * 0.14); c.scale(s * 0.72 / 24, s * 0.72 / 24); c.lineWidth = 1.6;
    c.stroke(new Path2D('M21 3 3 10.5l7 3 3 7z')); c.stroke(new Path2D('M10 13.5 21 3')); c.restore();
  } else if (kind === 'db') {
    const cx = s / 2, w = s * 0.3;
    c.beginPath(); c.ellipse(cx, s * 0.3, w, s * 0.11, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(cx - w, s * 0.3); c.lineTo(cx - w, s * 0.7); c.ellipse(cx, s * 0.7, w, s * 0.11, 0, Math.PI, 0, true); c.lineTo(cx + w, s * 0.3); c.stroke();
    c.beginPath(); c.ellipse(cx, s * 0.5, w, s * 0.11, 0, 0, Math.PI); c.stroke();
  } else if (kind === 'lines') {
    [0.34, 0.5, 0.66].forEach((y, i) => { c.beginPath(); c.moveTo(s * 0.3, s * y); c.lineTo(s * (i === 1 ? 0.55 : 0.7), s * y); c.stroke(); });
  } else if (kind === 'button') {
    c.beginPath(); c.arc(s / 2, s / 2, s * 0.2, 0, Math.PI * 2); c.stroke();
  }
});

export function createHero3D(canvas, hero, stage) {
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf0e6d8, 1.05));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.0); key.position.set(-3, 5, 7); scene.add(key);
  const rimPink = new THREE.PointLight(0xffb3c6, 10, 24); rimPink.position.set(-4.5, 2.5, -2); scene.add(rimPink);
  const rimLime = new THREE.PointLight(0xc4f25a, 9, 24); rimLime.position.set(4.5, 1.5, -2); scene.add(rimLime);

  const world = new THREE.Group(); scene.add(world);
  const model = new THREE.Group(); world.add(model);

  /* материалы */
  const pale = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.55 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8f8fb, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
  const green = new THREE.MeshPhysicalMaterial({ color: 0xb4ec4e, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const leafMat = new THREE.MeshPhysicalMaterial({ color: 0xb4ec4e, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x8cc83a, roughness: 0.5 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x3b2a2c, toneMapped: false });

  const sph = new THREE.SphereGeometry(1, 48, 32);

  /* пьедестал и мягкая тень */
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.45, 0.36, 80), white);
  ped.position.y = -0.18; model.add(ped);
  const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.02, 64), new THREE.MeshStandardMaterial({ color: 0xe6e4de, roughness: 0.6 }));
  pedTop.position.y = 0.005; model.add(pedTop);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -0.34; blob.scale.set(6.8, 4.2, 1); model.add(blob);

  /* мех: набор оболочек с общим шумом. Нижние слои темнее, кончики светлее */
  const SHELLS = 14, STEP = 0.0085;
  const noise = furNoise();
  const baseC = new THREE.Color(0xdcc093), tipC = new THREE.Color(0xfbe9c4);
  const furMats = Array.from({ length: SHELLS }, (_, i) => {
    const f = i / (SHELLS - 1);
    return new THREE.MeshStandardMaterial({ color: baseC.clone().lerp(tipC, Math.pow(f, 0.8)), roughness: 1, metalness: 0, alphaMap: i ? noise : null, alphaTest: i ? 0.1 + 0.74 * f : 0 });
  });
  const fur = (sx, sy, sz, geo = sph) => {
    const g = new THREE.Group();
    furMats.forEach((m, i) => { const mesh = new THREE.Mesh(geo, m); mesh.scale.setScalar(1 + i * STEP * 1.2); g.add(mesh); });
    g.scale.set(sx, sy, sz);
    return g;
  };

  /* маскот */
  const bot = new THREE.Group(); model.add(bot);
  const mascot = new THREE.Group(); mascot.position.y = 1.85; bot.add(mascot);   // тело и лицо прыгают вместе
  mascot.add(fur(1.55, 1.45, 1.4));
  // лапки и ручки
  const feet = [-1, 1].map((sx) => { const f = fur(0.5, 0.3, 0.66); f.position.set(sx * 0.65, 0.3, 0.55); bot.add(f); return f; });
  const arms = [-1, 1].map((sx) => {
    const g = new THREE.Group(); g.position.set(sx * 1.45, 0.1, 0.25); mascot.add(g);
    const a = fur(0.36, 0.62, 0.36); a.position.y = -0.38; g.add(a);
    return { sx, g };
  });
  // лицо
  const face = new THREE.Group(); mascot.add(face);
  const eyes = [-1, 1].map((sx) => {
    const g = new THREE.Group(); g.position.set(sx * 0.52, 0.22, 1.52);
    const ball = new THREE.Mesh(sph, eyeMat); ball.scale.set(0.15, 0.17, 0.1); g.add(ball);
    const gl = new THREE.Mesh(sph, glint); gl.scale.setScalar(0.04); gl.position.set(0.05, 0.07, 0.09); g.add(gl);
    face.add(g);
    return { g, sx };
  });
  const blushMat = new THREE.SpriteMaterial({ map: blushTex(), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
  [-1, 1].forEach((sx) => { const sp = new THREE.Sprite(blushMat); sp.position.set(sx * 0.95, -0.1, 1.42); sp.scale.set(0.78, 0.55, 1); face.add(sp); });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 20, Math.PI), mouthMat);
  mouth.position.set(0, 0.0, 1.57); mouth.rotation.z = Math.PI; face.add(mouth);
  const drop = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  drop.scale.set(0.28, 0.36, 1); drop.position.set(1.0, 0.9, 1.2); face.add(drop);
  // росток на макушке
  const sprout = new THREE.Group(); sprout.position.set(0, 1.42, 0.05); mascot.add(sprout);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 10), stemMat); stem.position.y = 0.18; sprout.add(stem);
  const leaves = [-1, 1].map((sx) => {
    const l = new THREE.Mesh(sph, leafMat); l.scale.set(0.34, 0.13, 0.1);
    const g = new THREE.Group(); g.position.set(0, 0.4, 0); l.position.x = sx * 0.3; g.add(l); sprout.add(g);
    return { g, sx };
  });

  /* парящие кубики-иконки */
  function iconCube(mat, kind, ink, size, pos, rot) {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.set(...rot);
    g.add(new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 6, size * 0.22), mat));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.8, size * 0.8), new THREE.MeshBasicMaterial({ map: iconTex(kind, ink), transparent: true, toneMapped: false, depthWrite: false }));
    pl.position.z = size / 2 + 0.01; g.add(pl);
    model.add(g);
    return { g, base: pos.clone(), ph: rand(0, 6.28), sp: rand(0.6, 1.1) };
  }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const floaters = [
    iconCube(green, 'plane', '#17351a', 0.9, V3(3.05, 3.2, 0.6), [-0.3, -0.45, 0.25]),
    iconCube(green, 'db', '#17351a', 0.8, V3(2.9, 1.3, 0.4), [0.2, -0.5, -0.2]),
    iconCube(pale, 'lines', '#8c8f95', 0.9, V3(-3.15, 1.6, 0.5), [-0.2, 0.5, 0.2]),
    iconCube(pale, 'button', '#8c8f95', 0.75, V3(-3.3, 3.1, 0.1), [0.3, 0.4, -0.3]),
  ];
  const balls = [
    { m: new THREE.Mesh(sph, pale), p: V3(3.65, 0.5, 0.3), s: 0.26 },
    { m: new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ color: 0xffd9cc, roughness: 0.6 })), p: V3(-3.15, 0.35, 0.4), s: 0.2 },
    { m: new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ color: 0xc4f25a, roughness: 0.5 })), p: V3(2.1, 3.9, 0.1), s: 0.11 },
  ].map((b) => { b.m.position.copy(b.p); b.m.scale.setScalar(b.s); model.add(b.m); return { ...b, ph: rand(0, 6.28) }; });

  /* фон: большие размытые шары */
  const softTex = softSphereTex();
  const SOFT = [
    { nx: -1.02, ny: 0.7, z: -6, size: 2.2, c: '#f0ebe4', o: '#f1f3ec' },
    { nx: 1.04, ny: 0.78, z: -7, size: 2.4, c: '#f7ede6', o: '#eef5d8' },
    { nx: -0.98, ny: -0.72, z: -4, size: 2.0, c: '#ffe2d6', o: '#e9f4bd' },
    { nx: 1.0, ny: -0.74, z: -4, size: 2.0, c: '#f1ece6', o: '#f1f1ec' },
    { nx: -1.05, ny: 0.0, z: -5, size: 1.2, c: '#ffffff', o: '#fbfbf8' },
  ].map((d) => {
    const mat = new THREE.SpriteMaterial({ map: softTex, color: d.c, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
    const sp = new THREE.Sprite(mat); scene.add(sp);
    return { ...d, sp, mat, cA: new THREE.Color(d.c), cB: new THREE.Color(d.o), ph: rand(0, 6.28), pos: new THREE.Vector3(), sc: 1 };
  });

  /* состояние */
  const L = { W: 1, H: 1, halfW: 1, halfH: 1, s: 1 };
  let t = 0, pulseV = 0, off = 0, offTarget = 0, lookX = 0, lookY = 0, blink = 0, nextBlink = 2, running = true, visible = true, raf = 0;
  const pointer = { x: 0, y: 0, inside: false };
  const greenOn = new THREE.Color(0xb4ec4e), greenOff = new THREE.Color(0xc9d3b0);

  function layout() {
    const hr = hero.getBoundingClientRect();
    const W = Math.max(1, Math.round(hr.width)), H = Math.max(1, Math.round(hr.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const halfH = Math.tan((FOV / 2) * Math.PI / 180) * CAM_Z, halfW = halfH * camera.aspect;
    Object.assign(L, { W, H, halfW, halfH });
    const ppu = H / (2 * halfH);
    const sr = stage.getBoundingClientRect();
    const sw = Math.max(80, sr.width), sh = Math.max(80, sr.height);
    L.s = clamp(Math.min(sh / ppu / MODEL_H, sw / ppu / MODEL_W), 0.2, 1.7);
    const cx = sr.left - hr.left + sr.width / 2, cy = sr.top - hr.top + sr.height / 2;
    world.position.set(((cx / W) - 0.5) * 2 * halfW, (0.5 - cy / H) * 2 * halfH - MODEL_CY * L.s, 0);
    world.scale.setScalar(L.s);
    SOFT.forEach((d) => {
      const persp = (CAM_Z - d.z) / CAM_Z;
      d.pos.set(d.nx * halfW * persp, d.ny * halfH * persp, d.z);
      d.sc = d.size * (halfH / 3.7);
    });
  }

  const eyeBase = [-0.52, 0.52];
  function update(dt) {
    t += dt;
    off = damp(off, offTarget, 3, dt);
    pulseV = Math.max(0, pulseV - dt * 1.6);
    const calm = reduce ? 0 : 1;
    const hop = Math.sin(clamp(pulseV, 0, 1) * Math.PI);   // дуга прыжка после каждой заявки
    const joy = clamp(pulseV, 0, 1);

    const tx = pointer.inside ? pointer.x : Math.sin(t * 0.5) * 0.4, ty = pointer.inside ? pointer.y : Math.cos(t * 0.4) * 0.15;
    lookX = damp(lookX, tx, 5, dt); lookY = damp(lookY, ty, 5, dt);

    // тело: дыхание, прыжок, мягкое сжатие, наклон в сторону курсора
    const breathe = Math.sin(t * 1.8) * 0.03 * calm;
    mascot.position.y = 1.85 + hop * 0.5 * calm + Math.sin(t * 1.3) * 0.04 * calm;
    mascot.scale.set(1 - hop * 0.04 - breathe * 0.4, 1 + breathe + hop * 0.06, 1 - hop * 0.04 - breathe * 0.4);
    mascot.rotation.set(-lookY * 0.1 + off * 0.06, lookX * 0.28, Math.sin(t * 0.9) * 0.03 * calm + lookX * -0.04 + off * Math.sin(t * 3) * 0.03 * calm);
    feet.forEach((f) => { f.position.y = 0.3 + hop * 0.18 * calm; });

    // глазки: следят, моргают; при усталости (вручную) прикрыты, при радости чуть прищурены
    nextBlink -= dt;
    if (nextBlink < 0) { blink = 0.13; nextBlink = rand(2.5, 5.5); }
    blink = Math.max(0, blink - dt);
    const squint = lerp(1, 0.55, off) * lerp(1, 0.75, joy * 0.6);
    eyes.forEach(({ g }, i) => {
      g.position.x = eyeBase[i] + lookX * 0.09;
      g.position.y = 0.22 + lookY * 0.06 - off * 0.04;
      g.scale.set(1, blink > 0 ? 0.12 : squint, 1);
    });
    // щёчки краснеют от радости, бледнеют от усталости
    blushMat.opacity = 0.55 + joy * 0.35 - off * 0.25;
    // рот: улыбка, при «ручном» режиме почти прямая линия, при радости шире
    const m = lerp(1, 0.12, off);
    mouth.scale.set(1 + joy * 0.5, m * (1 + joy * 0.7), 1);
    mouth.position.y = lerp(0.0, -0.06, off) - joy * 0.02;
    // капелька пота, когда заявки копятся
    const fall = (t * 0.7) % 1;
    drop.material.opacity = off * (1 - fall) * 0.95;
    drop.position.set(1.0, 0.95 - fall * 0.55, 1.2);

    // ручки: машут; при усталости мечутся, при заявке взлетают вверх
    arms.forEach(({ sx, g }, i) => {
      const wave = Math.sin(t * (5 + off * 4) + i * 1.6) * (0.28 + off * 0.35) * calm;
      g.rotation.z = sx * (0.55 + off * 0.2) + (sx > 0 ? -wave : wave * 0.35) + sx * joy * 1.1;
    });

    // росток покачивается и приподнимается от радости
    leaves.forEach(({ g, sx }) => { g.rotation.z = -sx * (0.35 + joy * 0.35) + Math.sin(t * 2 + sx) * 0.1 * calm; });
    sprout.rotation.z = Math.sin(t * 1.4) * 0.08 * calm - lookX * 0.1;
    sprout.scale.setScalar(1 + joy * 0.12);

    // парящие кубики и шары
    floaters.forEach((f) => { f.g.position.set(f.base.x, f.base.y + Math.sin(t * f.sp + f.ph) * 0.12 * calm, f.base.z); f.g.rotation.y += Math.sin(t * 0.5 + f.ph) * 0.002; });
    balls.forEach((b) => { b.m.position.y = b.p.y + Math.sin(t * 0.9 + b.ph) * 0.1 * calm; });
    green.color.copy(greenOn).lerp(greenOff, off * 0.7);

    // мягкие шары по краям: параллакс и оттенок режима
    SOFT.forEach((d) => {
      const par = -d.z * 0.06;
      d.sp.position.set(d.pos.x + Math.sin(t * 0.3 + d.ph) * 0.25 - pointer.x * par, d.pos.y + Math.sin(t * 0.45 + d.ph) * 0.2 - pointer.y * par * 0.6, d.pos.z);
      d.sp.scale.setScalar(d.sc * 2);
      d.mat.color.lerpColors(d.cB, d.cA, off);
    });
    rimPink.intensity = lerp(10, 4, off); rimLime.intensity = lerp(9, 3, off);
    blob.material.opacity = 0.55 - Math.sin(t * 1.3) * 0.05 - hop * 0.15;
    blob.scale.set(6.8 - hop * 0.8, 4.2 - hop * 0.5, 1);
  }

  const clock = new THREE.Clock();
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running || !visible) { clock.getDelta(); return; }
    update(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  }

  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1); pointer.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1); pointer.inside = true;
  });
  hero.addEventListener('pointerleave', () => { pointer.inside = false; });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }) : null;
  io && io.observe(hero);
  const ro = new ResizeObserver(layout);
  ro.observe(hero); ro.observe(stage);
  const onVis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  layout(); update(0.016); frame();

  return {
    pulse(v = 1) { pulseV = Math.min(1.2, pulseV + v); },
    setMode(on) { offTarget = on ? 0 : 1; },
    layout,
    dispose() { cancelAnimationFrame(raf); io && io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); renderer.dispose(); },
  };
}
