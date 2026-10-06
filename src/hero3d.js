import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/*
 * 3D-маскот главного экрана: белая голова с тёмным визором и синими глазами-дугами,
 * ленты-завитки, тёмные перчатки и зелёный куб с искрой. Вокруг парят кубики-иконки
 * и мягкие размытые шары. Сцена подгоняется под DOM-элемент «stage».
 */

const FOV = 32;
const CAM_Z = 13;
const MODEL_H = 4.9;  // высота модели в её единицах
const MODEL_W = 7.4;  // ширина с парящими кубиками
const MODEL_CY = 2.1; // вертикальный центр модели

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

/* ---------- текстуры ---------- */
function canvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const haloTex = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const softSphereTex = () => canvasTex(256, (c, s) => {
  const g = c.createRadialGradient(96, 88, 8, 128, 128, 112);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f0efeb'); g.addColorStop(1, '#cfcec8');
  if ('filter' in c) c.filter = 'blur(7px)';
  c.fillStyle = g; c.beginPath(); c.arc(s / 2, s / 2, 104, 0, Math.PI * 2); c.fill();
});
const shadowTex = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(40,36,28,0.5)'); g.addColorStop(0.5, 'rgba(40,36,28,0.18)'); g.addColorStop(1, 'rgba(40,36,28,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
function sparkle(c, cx, cy, r) {
  c.beginPath();
  c.moveTo(cx, cy - r);
  c.quadraticCurveTo(cx + r * 0.12, cy - r * 0.12, cx + r, cy);
  c.quadraticCurveTo(cx + r * 0.12, cy + r * 0.12, cx, cy + r);
  c.quadraticCurveTo(cx - r * 0.12, cy + r * 0.12, cx - r, cy);
  c.quadraticCurveTo(cx - r * 0.12, cy - r * 0.12, cx, cy - r);
  c.closePath(); c.fill();
}
const sparkleTex = () => canvasTex(256, (c, s) => {
  c.shadowColor = 'rgba(255,255,255,0.9)'; c.shadowBlur = 24; c.fillStyle = '#fff';
  sparkle(c, s * 0.52, s * 0.54, s * 0.34);
  sparkle(c, s * 0.24, s * 0.26, s * 0.12);
});
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
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e2d6, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-3, 5, 7); scene.add(key);
  const rimBlue = new THREE.PointLight(0x6aa0ff, 16, 24); rimBlue.position.set(-4.5, 2.5, -2); scene.add(rimBlue);
  const rimLime = new THREE.PointLight(0xc4f25a, 12, 24); rimLime.position.set(4.5, 1.5, -2); scene.add(rimLime);

  const world = new THREE.Group(); scene.add(world);
  const model = new THREE.Group(); world.add(model);

  /* материалы */
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8f8fb, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x1a2142, roughness: 0.42, clearcoat: 0.45 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x080d22, roughness: 0.1, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.04 });
  const green = new THREE.MeshPhysicalMaterial({ color: 0xb4ec4e, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.55 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x5aa0ff, toneMapped: false });
  const eyeCore = new THREE.MeshBasicMaterial({ color: 0xe6f3ff, toneMapped: false });
  const halo = new THREE.SpriteMaterial({ map: haloTex(), color: 0x3a78ff, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });

  const sph = new THREE.SphereGeometry(1, 48, 32);
  const ell = (mat, x, y, z) => { const m = new THREE.Mesh(sph, mat); m.scale.set(x, y, z); return m; };

  /* пьедестал и мягкая тень */
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.45, 0.36, 80), white);
  ped.position.y = -0.18; model.add(ped);
  const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.02, 64), new THREE.MeshStandardMaterial({ color: 0xe6e4de, roughness: 0.6 }));
  pedTop.position.y = 0.005; model.add(pedTop);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -0.34; blob.scale.set(6.8, 4.2, 1); model.add(blob);

  /* маскот */
  const bot = new THREE.Group(); model.add(bot);
  // ботинки и ноги
  const footL = ell(navy, 0.5, 0.28, 0.68); footL.position.set(-0.6, 0.3, 0.4); footL.rotation.y = 0.28; bot.add(footL);
  const footR = ell(navy, 0.5, 0.28, 0.68); footR.position.set(0.72, 0.3, 0.1); footR.rotation.y = -0.22; bot.add(footR);
  const legGeo = new THREE.CapsuleGeometry(0.17, 0.4, 8, 16);
  const legL = new THREE.Mesh(legGeo, white); legL.position.set(-0.52, 0.85, 0.28); legL.rotation.z = 0.08; bot.add(legL);
  const legR = new THREE.Mesh(legGeo, white); legR.position.set(0.64, 0.85, 0.08); legR.rotation.z = -0.1; bot.add(legR);
  // тело
  const torso = ell(white, 0.88, 0.78, 0.72); torso.position.set(0, 1.62, 0.05); torso.rotation.x = 0.18; bot.add(torso);
  // голова
  const head = new THREE.Group(); head.position.set(0, 3.05, 0.1); bot.add(head);
  head.add(new THREE.Mesh(new RoundedBoxGeometry(3.0, 2.2, 2.5, 14, 1.0), white));
  const visor = ell(visorMat, 1.22, 0.84, 0.36); visor.position.set(0, -0.02, 0.97); head.add(visor);
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));
  shine.position.set(-0.3, 0.5, 1.325); shine.rotation.z = 0.12; head.add(shine);
  // глаза-дуги
  const eyes = [-1, 1].map((sx) => {
    const g = new THREE.Group(); g.position.set(sx * 0.52, -0.06, 1.31);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.092, 14, 36, Math.PI), eyeMat));
    const core = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.034, 8, 36, Math.PI), eyeCore); core.position.z = 0.012; g.add(core);
    const h = new THREE.Sprite(halo); h.scale.setScalar(1.9); h.position.set(0, 0.1, 0.05); g.add(h);
    head.add(g);
    return { g, h };
  });
  // руки
  const boneGeo = new THREE.CylinderGeometry(0.16, 0.16, 1, 18);
  const UP = new THREE.Vector3(0, 1, 0);
  const tmpD = new THREE.Vector3();
  function bone(m, A, B) { tmpD.copy(B).sub(A); const len = tmpD.length() || 1e-4; m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(UP, tmpD.divideScalar(len)); }
  function ik(S, H, l1, l2, pole) {
    const d = H.clone().sub(S); let len = d.length(); const mx = l1 + l2 - 0.01;
    if (len > mx) { d.multiplyScalar(mx / len); len = mx; }
    const dir = d.clone().normalize(), a = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    return S.clone().add(dir.clone().multiplyScalar(a)).add(p.multiplyScalar(h));
  }
  const arms = [-1, 1].map((sx) => {
    const S = new THREE.Vector3(sx * 0.9, 2.0, 0.2);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), white); sh.position.copy(S); bot.add(sh);
    const up = new THREE.Mesh(boneGeo, white), fo = new THREE.Mesh(boneGeo, white);
    const el = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), white);
    const hand = ell(navy, 0.3, 0.27, 0.34);
    bot.add(up, fo, el, hand);
    return { sx, S, up, fo, el, hand, base: new THREE.Vector3(sx < 0 ? -0.3 : 1.25, sx < 0 ? 1.0 : 1.15, sx < 0 ? 1.65 : 1.55), pole: new THREE.Vector3(sx, -0.35, 0) };
  });

  // куб с искрой в руках
  const cube = new THREE.Group(); cube.position.set(0.45, 1.5, 1.5); cube.rotation.set(-0.25, -0.5, 0.12); bot.add(cube);
  cube.add(new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.5, 1.5, 8, 0.34), green));
  const spark = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: sparkleTex(), transparent: true, toneMapped: false, depthWrite: false }));
  spark.position.z = 0.77; cube.add(spark);

  /* парящие кубики-иконки */
  function iconCube(mat, kind, ink, size, pos, rot) {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.set(...rot);
    g.add(new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 6, size * 0.22), mat));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.8, size * 0.8), new THREE.MeshBasicMaterial({ map: iconTex(kind, ink), transparent: true, toneMapped: false, depthWrite: false }));
    pl.position.z = size / 2 + 0.01; g.add(pl);
    model.add(g);
    return { g, base: pos.clone(), ph: rand(0, 6.28), sp: rand(0.6, 1.1) };
  }
  const floaters = [
    iconCube(green, 'plane', '#17351a', 0.95, new THREE.Vector3(3.1, 3.5, 0.6), [-0.3, -0.45, 0.25]),
    iconCube(green, 'db', '#17351a', 0.85, new THREE.Vector3(2.85, 1.45, 0.4), [0.2, -0.5, -0.2]),
    iconCube(pale, 'lines', '#8c8f95', 0.95, new THREE.Vector3(-3.25, 1.7, 0.5), [-0.2, 0.5, 0.2]),
    iconCube(pale, 'button', '#8c8f95', 0.8, new THREE.Vector3(-3.5, 3.3, 0.1), [0.3, 0.4, -0.3]),
  ];
  const balls = [
    { m: new THREE.Mesh(sph, pale), p: new THREE.Vector3(3.7, 0.55, 0.3), s: 0.28 },
    { m: new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ color: 0xffd9cc, roughness: 0.6 })), p: new THREE.Vector3(-3.2, 0.35, 0.4), s: 0.22 },
    { m: new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ color: 0xc4f25a, roughness: 0.5 })), p: new THREE.Vector3(2.2, 4.1, 0.1), s: 0.12 },
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
  const L = { W: 1, H: 1, halfW: 1, halfH: 1, s: 1, stageOk: false };
  let t = 0, pulseV = 0, off = 0, offTarget = 0, lookX = 0, lookY = 0, running = true, visible = true, raf = 0;
  const pointer = { x: 0, y: 0, inside: false };

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
    L.s = clamp(Math.min(sh / ppu / MODEL_H, sw / ppu / MODEL_W), 0.2, 1.6);
    const cx = sr.left - hr.left + sr.width / 2, cy = sr.top - hr.top + sr.height / 2;
    world.position.set(((cx / W) - 0.5) * 2 * halfW, (0.5 - cy / H) * 2 * halfH - MODEL_CY * L.s, 0);
    world.scale.setScalar(L.s);
    SOFT.forEach((d) => {
      const persp = (CAM_Z - d.z) / CAM_Z;
      d.pos.set(d.nx * halfW * persp, d.ny * halfH * persp, d.z);
      d.sc = d.size * (halfH / 3.7);
    });
  }

  function update(dt) {
    t += dt;
    off = damp(off, offTarget, 3, dt);
    pulseV = Math.max(0, pulseV - dt * 1.6);
    const calm = reduce ? 0 : 1;

    const tx = pointer.inside ? pointer.x : Math.sin(t * 0.5) * 0.4, ty = pointer.inside ? pointer.y : Math.cos(t * 0.4) * 0.15;
    lookX = damp(lookX, tx, 5, dt); lookY = damp(lookY, ty, 5, dt);

    model.position.y = Math.sin(t * 1.2) * 0.07 * calm;
    bot.rotation.set(0.05, -0.12, Math.sin(t * 0.7) * 0.015 * calm);
    head.rotation.set(-lookY * 0.18 - off * 0.12 + 0.04, -0.22 + lookX * 0.32, -0.12 - lookX * 0.04);

    // глаза: радостные дуги, при «ручном» режиме приглушены и вытянуты в линию
    eyes.forEach(({ g, h }) => {
      g.scale.set(1 + pulseV * 0.18, lerp(1, 0.14, off) * (1 + pulseV * 0.2), 1);
      h.material.opacity = lerp(0.62, 0.22, off) + pulseV * 0.35;
    });
    eyeMat.color.setHex(0x5aa0ff).lerp(new THREE.Color(0x8d93a8), off);

    // куб и руки
    const bob = Math.sin(t * 1.5) * 0.05 * calm;
    cube.position.set(0.45, 1.5 + bob + pulseV * 0.08, 1.5 + pulseV * 0.1);
    cube.rotation.set(-0.25 + Math.sin(t * 0.8) * 0.04 * calm, -0.5 + Math.sin(t * 0.6) * 0.06 * calm, 0.12);
    cube.scale.setScalar(1 + pulseV * 0.1);
    spark.scale.setScalar(1 + pulseV * 0.25); spark.rotation.z = t * 0.3 * (1 - off * 0.8);
    green.color.setHex(0xb4ec4e).lerp(new THREE.Color(0xc9d3b0), off * 0.7);
    arms.forEach((a) => {
      a.hand.position.set(a.base.x, a.base.y + bob, a.base.z);
      const E = ik(a.S, a.hand.position, 0.9, 0.9, a.pole);
      bone(a.up, a.S, E); bone(a.fo, E, a.hand.position); a.el.position.copy(E);
      a.hand.rotation.z = a.sx * 0.3;
    });

    // парящие кубики и шары
    floaters.forEach((f) => { f.g.position.set(f.base.x, f.base.y + Math.sin(t * f.sp + f.ph) * 0.12 * calm, f.base.z); f.g.rotation.y += Math.sin(t * 0.5 + f.ph) * 0.002; });
    balls.forEach((b) => { b.m.position.y = b.p.y + Math.sin(t * 0.9 + b.ph) * 0.1 * calm; });

    // мягкие шары по краям: параллакс и оттенок режима
    SOFT.forEach((d) => {
      const par = -d.z * 0.06;
      d.sp.position.set(d.pos.x + Math.sin(t * 0.3 + d.ph) * 0.25 - pointer.x * par, d.pos.y + Math.sin(t * 0.45 + d.ph) * 0.2 - pointer.y * par * 0.6, d.pos.z);
      d.sp.scale.setScalar(d.sc * 2);
      d.mat.color.lerpColors(d.cB, d.cA, off);
    });
    rimBlue.intensity = lerp(16, 6, off); rimLime.intensity = lerp(12, 4, off);
    blob.material.opacity = 0.55 - Math.sin(t * 1.2) * 0.05;
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
