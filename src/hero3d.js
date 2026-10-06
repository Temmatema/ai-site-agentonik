import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/*
 * 3D-маскот главного экрана: парящий робот-агент. Белый глянцевый корпус, тёмный
 * стеклянный визор с лаймовыми глазами, антенна и «ядро» на груди. Пьедестала нет:
 * робот висит в воздухе. На каждую заявку он не прыгает, а мягко «принимает» её:
 * по визору пробегает световая полоска, глаза довольно щурятся. Карточки заявок влетают
 * в визор и вылетают из него (см. anchor).
 * Сцена подгоняется под DOM-элемент «stage».
 */

const FOV = 32;
const CAM_Z = 13;
const MODEL_H = 4.6;  // высота модели в её единицах
const MODEL_W = 5.2;  // ширина с запасом по бокам
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
const glowTex = () => radial(128, [[0, 'rgba(196,242,90,0.9)'], [0.45, 'rgba(196,242,90,0.3)'], [1, 'rgba(196,242,90,0)']]);
const scanTex = () => canvasTex(64, (c, s) => {
  const g = c.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, 'rgba(196,242,90,0)'); g.addColorStop(0.5, 'rgba(226,255,150,0.95)'); g.addColorStop(1, 'rgba(196,242,90,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const shadowTex = () => radial(128, [[0, 'rgba(40,36,28,0.5)'], [0.5, 'rgba(40,36,28,0.18)'], [1, 'rgba(40,36,28,0)']]);
const softSphereTex = () => canvasTex(256, (c, s) => {
  const g = c.createRadialGradient(96, 88, 8, 128, 128, 112);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f0efeb'); g.addColorStop(1, '#cfcec8');
  if ('filter' in c) c.filter = 'blur(7px)';
  c.fillStyle = g; c.beginPath(); c.arc(s / 2, s / 2, 104, 0, Math.PI * 2); c.fill();
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

  const hemi = new THREE.HemisphereLight(0xffffff, 0xf0e6d8, 1.05); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e6, 1.0); key.position.set(-3, 5, 7); scene.add(key);
  const rimPink = new THREE.PointLight(0xffb3c6, 10, 24); rimPink.position.set(-4.5, 2.5, -2); scene.add(rimPink);
  const rimLime = new THREE.PointLight(0xc4f25a, 9, 24); rimLime.position.set(4.5, 1.5, -2); scene.add(rimLime);

  const world = new THREE.Group(); scene.add(world);
  const model = new THREE.Group(); world.add(model);

  /* материалы */
  const pale = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.55 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8f8fb, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
  const green = new THREE.MeshPhysicalMaterial({ color: 0xb4ec4e, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.45, metalness: 0.3 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0f13, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xc4f25a, toneMapped: false });   // глаза, антенна, ядро

  const sph = new THREE.SphereGeometry(1, 48, 32);

  /* мягкая тень на «полу» (без пьедестала) */
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.3, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -0.2; blob.scale.set(3.8, 1.8, 1); model.add(blob);

  /* робот */
  const BOT_Y = 2.0;
  const bot = new THREE.Group(); bot.position.y = BOT_Y; model.add(bot);
  // голова с визором
  const head = new THREE.Group(); head.position.y = 0.75; bot.add(head);
  head.add(new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.9, 1.9, 8, 0.7), white));
  const visor = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.1, 0.4, 6, 0.2), visorMat); visor.position.z = 0.8; head.add(visor);
  [-1, 1].forEach((sx) => {
    // сплюснутая сфера вместо цилиндра: без острых кромок
    const ear = new THREE.Mesh(sph, green);
    ear.scale.set(0.17, 0.38, 0.38); ear.position.x = sx * 1.25; head.add(ear);
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), dark); stem.position.y = 1.13; head.add(stem);
  const tip = new THREE.Mesh(sph, lightMat); tip.position.y = 1.42; head.add(tip);
  // лицо на визоре
  const face = new THREE.Group(); face.position.z = 1.01; head.add(face);
  const eyes = [-1, 1].map((sx) => { const e = new THREE.Mesh(sph, lightMat); e.position.set(sx * 0.42, 0.1, 0); face.add(e); return e; });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 24, Math.PI), lightMat);
  mouth.position.set(0, -0.2, 0); mouth.rotation.z = Math.PI; face.add(mouth);
  // корпус, шея, ядро
  const body = new THREE.Group(); body.position.y = -0.95; bot.add(body);
  const torso = new THREE.Mesh(sph, white); torso.scale.set(0.85, 0.75, 0.7); body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 24), dark); neck.position.y = 0.72; body.add(neck);
  const core = new THREE.Mesh(sph, lightMat); core.position.set(0, 0.1, 0.68); body.add(core);
  const arms = [-1, 1].map((sx) => { const a = new THREE.Mesh(sph, white); a.scale.set(0.22, 0.36, 0.22); body.add(a); return { sx, a }; });
  // свечение под корпусом
  const glowMat = new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, toneMapped: false });
  const jet = new THREE.Sprite(glowMat); jet.position.y = -0.95; body.add(jet);
  // сканер: полоска света по визору, так робот «принимает» заявки
  const scanMat = new THREE.MeshBasicMaterial({ map: scanTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.96), scanMat); scan.position.z = 1.012; head.add(scan);

  /* мелкие шары вокруг */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
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
    return { ...d, sp, mat, cA: new THREE.Color('#262a31'), cB: new THREE.Color(d.o), ph: rand(0, 6.28), pos: new THREE.Vector3(), sc: 1 };
  });

  /* состояние */
  const L = { W: 1, H: 1, halfW: 1, halfH: 1, s: 1 };
  let t = 0, pulseT = 0, glow = 0, sinceScan = 9, off = 0, offTarget = 0, lookX = 0, lookY = 0, blink = 0, nextBlink = 2, running = true, visible = true, raf = 0;
  const pointer = { x: 0, y: 0, inside: false };
  const greenOn = new THREE.Color(0xb4ec4e), greenOff = new THREE.Color(0xc9d3b0);
  const lightOn = new THREE.Color(0xc4f25a), lightOff = new THREE.Color(0x7d8872), lightHot = new THREE.Color(0xf0ffb8);
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

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

  let bob = 0;
  function update(dt) {
    off = damp(off, offTarget, 3, dt);
    t += dt * lerp(1, 0.45, off);   // вручную всё движется вдвое медленнее
    // импульс от заявки гаснет сам, а glow догоняет его плавно: без рывков
    pulseT *= Math.exp(-2.4 * dt);
    glow = damp(glow, Math.min(1, pulseT), 7, dt);
    const calm = reduce ? 0 : 1;

    const tx = pointer.inside ? pointer.x : Math.sin(t * 0.5) * 0.4, ty = pointer.inside ? pointer.y : Math.cos(t * 0.4) * 0.15;
    lookX = damp(lookX, tx, 4, dt); lookY = damp(lookY, ty, 4, dt);

    // парение: медленная синусоида, в ручном режиме робот «оседает»
    bob = Math.sin(t * 1.2) * 0.1 * calm;
    bot.position.y = BOT_Y + bob - off * 0.18 + glow * 0.05 * calm;
    bot.rotation.z = Math.sin(t * 0.8) * 0.025 * calm;
    head.rotation.set(-lookY * 0.12 + off * 0.14 - glow * 0.04, lookX * 0.3, -lookX * 0.04);
    body.rotation.y = lookX * 0.14;
    arms.forEach(({ sx, a }, i) => {
      a.position.set(sx * (1.12 + glow * 0.06), -0.02 + Math.sin(t * 1.2 + 1 + i * 1.4) * 0.07 * calm, 0.1);
      a.rotation.z = sx * (0.22 + glow * 0.2);
    });

    // лицо: глаза следят и моргают; в ручном режиме гаснут и сужаются
    nextBlink -= dt;
    if (nextBlink < 0) { blink = 0.13; nextBlink = rand(2.5, 5.5); }
    blink = Math.max(0, blink - dt);
    face.position.x = lookX * 0.1; face.position.y = lookY * 0.06;
    // сканер: полоска идёт слева направо; глаза при этом довольно щурятся, рот шире
    sinceScan += dt;
    const sp = clamp(sinceScan / 0.7, 0, 1);
    scan.position.x = lerp(-0.75, 0.75, easeInOut(sp));
    scanMat.opacity = Math.sin(Math.PI * sp) * 0.85;
    const open = (blink > 0 ? 0.1 : lerp(1, 0.22, off)) * (1 - glow * 0.4);
    eyes.forEach((e) => { e.scale.set(0.15 + glow * 0.02, 0.24 * open, 0.03); });
    mouth.scale.set(1 + glow * 0.3, lerp(1, 0.1, off), 1);
    lightMat.color.copy(lightOn).lerp(lightOff, off).lerp(lightHot, glow * 0.6);
    tip.scale.setScalar(0.12 * (1 + glow * 0.4 + Math.sin(t * 2.4) * 0.05 * calm));
    core.scale.set(0.2 + glow * 0.04, 0.2 + glow * 0.04, 0.05);
    glowMat.opacity = (0.75 + Math.sin(t * 2.4) * 0.1 + glow * 0.25) * (1 - off * 0.8);
    jet.scale.set(1.9 + glow * 0.4, 0.9 + glow * 0.2, 1);

    // парящие кубики и шары
    balls.forEach((b) => { b.m.position.y = b.p.y + Math.sin(t * 0.9 + b.ph) * 0.1 * calm; });
    green.color.copy(greenOn).lerp(greenOff, off * 0.7);

    // мягкие шары по краям: параллакс и оттенок режима
    SOFT.forEach((d) => {
      const par = -d.z * 0.06;
      d.sp.position.set(d.pos.x + Math.sin(t * 0.3 + d.ph) * 0.25 - pointer.x * par, d.pos.y + Math.sin(t * 0.45 + d.ph) * 0.2 - pointer.y * par * 0.6, d.pos.z);
      d.sp.scale.setScalar(d.sc * 2);
      d.mat.color.lerpColors(d.cB, d.cA, off);
      d.mat.opacity = lerp(0.8, 0.4, off);
    });
    rimPink.intensity = lerp(10, 4, off); rimLime.intensity = lerp(9, 1.5, off);
    // вручную сцена гаснет: меньше света и экспозиции
    hemi.intensity = lerp(1.05, 0.32, off); key.intensity = lerp(1.0, 0.45, off);
    scene.environmentIntensity = lerp(0.95, 0.35, off); renderer.toneMappingExposure = lerp(1.04, 0.72, off);
    blob.material.opacity = 0.3 - bob * 0.5;
    blob.scale.set(3.8 - bob * 2, 1.8 - bob, 1);
  }

  const clock = new THREE.Clock();
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running || !visible || hero.dataset.covered) { clock.getDelta(); return; }
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
    pulse(v = 1) {
      pulseT = Math.min(1.3, pulseT + v);
      if (!reduce && sinceScan > 0.6) sinceScan = 0;   // пачка заявок даёт один проход сканера, а не три рывка
    },
    // центр визора в пикселях относительно hero: сюда влетают карточки
    anchor() {
      const v = visor.getWorldPosition(new THREE.Vector3()).project(camera);
      return { x: (v.x * 0.5 + 0.5) * L.W, y: (0.5 - v.y * 0.5) * L.H };
    },
    setMode(on) { offTarget = on ? 0 : 1; },
    layout,
    dispose() { cancelAnimationFrame(raf); io && io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); renderer.dispose(); },
  };
}
