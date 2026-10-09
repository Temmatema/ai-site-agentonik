import DATA from './mascot/frames.json';

/*
 * Маскот главного экрана: плюшевый зверёк ведёт взгляд за курсором слева направо.
 * Это не 3D, а кадры из видео, где он плавно переводит глаза из одного края в другой
 * (видео замедлено вчетверо с достройкой промежуточных кадров).
 * Кадры идут целиком, с родным зелёным фоном: маскот не вырезан, поэтому край меха не мерцает.
 * На странице края кадра растворяются в пятне того же цвета (см. .m-wrap в style.css).
 * Взгляд — число 0..1 (0 — влево, 1 — вправо); по нему берутся два соседних кадра из 97 и смешиваются.
 * Зрачки в кадрах стёрты: их рисуем сами по координатам, снятым с видео, поэтому они едут плавно.
 * Наборов кадров два: hd для компьютера и sd для телефона. Каждый разложен на четыре файла через
 * один кадр: маскот появляется после первого файла, остальные догружаются и уплотняют движение.
 * В frames.json — размеры, координаты зрачков и то, какому взгляду соответствует каждый кадр.
 */

const SHEETS = import.meta.glob('./mascot/{hd,sd}-*.webp', { eager: true, query: '?url', import: 'default' });
const { cw: SRC_W, cols: COLS, sets: SETS, gBody: G_BODY, pupils: PUPILS, pupilR: PUPIL_R } = DATA;
const TIER_ORDER = [2, 1, 3];   // после первого файла сначала середины промежутков, потом четверти
const EYES_Y = 0.44;            // уровень глаз в кадре (доля высоты)
const ANCHOR_Y = 0.66;          // куда влетают карточки: середина тела

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
// картинку сразу раскодируем в bitmap: иначе браузер может выгрузить большой спрайт из памяти и подтормозить на повторной раскодировке
const load = (url) => new Promise((ok, fail) => {
  const im = new Image();
  im.onload = () => (window.createImageBitmap ? createImageBitmap(im).then(ok, () => ok(im)) : ok(im));
  im.onerror = fail; im.src = url;
});
// взгляд → номер кадра и доля следующего
function locate(table, g) {
  let i = 0;
  while (i < table.length - 2 && table[i + 1] <= g) i++;
  return [i, clamp((g - table[i]) / (table[i + 1] - table[i]), 0, 1)];
}

export async function createMascot(canvas, hero, stage, soft) {
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const set = matchMedia('(min-width: 1001px)').matches ? 'hd' : 'sd';
  const { w: W, h: H } = SETS[set], K = W / SRC_W, url = (tier) => SHEETS[`./mascot/${set}-${tier}.webp`];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });

  // кадры: только из уже загруженных файлов; при включённой экономии трафика остаётся первый
  const tiers = [await load(url(0)), null, null, null];
  let frames = [], gBody = [];
  const index = () => {
    frames = G_BODY.map((g, i) => ({ g, i, img: tiers[i % 4], cell: i >> 2 })).filter((fr) => fr.img);
    gBody = frames.map((fr) => fr.g);
  };
  index();

  /* состояние */
  let t = 0, last = 0, gaze = 0.5, drawn = -1, on = true, glow = 0, pulseT = 0, lookX = 0, lookY = 0, running = true, visible = true, raf = 0;
  const pointer = { x: 0, y: 0, inside: false };

  if (!(navigator.connection && navigator.connection.saveData)) {
    (async () => { for (const k of TIER_ORDER) { tiers[k] = await load(url(k)); index(); drawn = -1; } })().catch(() => {});
  }

  function draw(g) {
    const [bi, bk] = locate(gBody, g), a = frames[bi], b = frames[bi + 1];
    const put = (fr) => ctx.drawImage(fr.img, (fr.cell % COLS) * W, Math.floor(fr.cell / COLS) * H, W, H, 0, 0, W, H);
    ctx.globalAlpha = 1; put(a);
    if (bk > 0.02) { ctx.globalAlpha = bk; put(b); }
    // зрачки: чёрная точка с маленьким бликом, как в видео
    ctx.globalAlpha = 1;
    const p0 = PUPILS[a.i], p1 = PUPILS[b.i], r = PUPIL_R * K;
    for (let k = 0; k < 4; k += 2) {
      const x = (p0[k] + (p1[k] - p0[k]) * bk) * K, y = (p0[k + 1] + (p1[k + 1] - p0[k + 1]) * bk) * K;
      ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.24, 0, Math.PI * 2); ctx.fill();
    }
  }

  function update(dt) {
    t += dt;
    pulseT *= Math.exp(-2.4 * dt);
    glow = damp(glow, Math.min(1, pulseT), 9, dt);

    // за курсором; без него (и на телефоне) маскот сам неспешно водит глазами; вручную смотрит перед собой
    const idle = Math.sin(t * 0.55) * Math.sin(t * 0.21 + 1) * 0.85;
    const tx = !on || reduce ? 0 : pointer.inside ? pointer.x + Math.sin(t * 0.9) * 0.02 : idle;
    lookX = damp(lookX, tx, on ? 7 : 2, dt); lookY = damp(lookY, on ? (pointer.inside ? pointer.y : 0) : -0.5, 5, dt);
    gaze = clamp(lookX * 0.5 + 0.5, 0, 1);
    if (Math.abs(gaze - drawn) > 0.0003) { draw(gaze); drawn = gaze; }

    // тело: дышит, чуть клонится за взглядом, на заявку коротко «сглатывает»; вручную оседает
    const calm = reduce ? 0 : 1, breath = Math.sin(t * (on ? 1.9 : 1.1)) * 0.01 * calm;
    const sx = 1 - breath * 0.6 - lookY * 0.006 + glow * 0.04 + (on ? 0 : 0.015);
    const sy = 1 + breath + lookY * 0.012 - glow * 0.045 - (on ? 0 : 0.025);
    canvas.style.transform = `rotate(${(lookX * 1.1 * calm).toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    if (soft) { soft.style.setProperty('--mx', (pointer.x * calm).toFixed(3)); soft.style.setProperty('--my', (pointer.y * calm).toFixed(3)); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!running || !visible || hero.dataset.covered) return;
    update(dt);
  }

  // курсор считаем от глаз маскота: x — доля ширины экрана, y — вверх от уровня глаз
  const onMove = (e) => {
    const r = canvas.parentElement.getBoundingClientRect();
    pointer.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.4), -1, 1);
    pointer.y = clamp(-(e.clientY - (r.top + r.height * EYES_Y)) / (r.height * 0.8), -1, 1);
    pointer.inside = e.pointerType === 'mouse';
  };
  const onLeave = () => { pointer.inside = false; };
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }) : null;
  io && io.observe(hero);
  const onVis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  draw(gaze); drawn = gaze;
  canvas.parentElement.classList.add('is-ready');
  last = performance.now(); raf = requestAnimationFrame(frame);

  return {
    pulse(v = 1) { pulseT = Math.min(1.3, pulseT + v); },
    // точка в пикселях относительно hero: сюда влетают карточки
    anchor() {
      const hr = hero.getBoundingClientRect(), r = canvas.parentElement.getBoundingClientRect();
      return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height * ANCHOR_Y };
    },
    setMode(v) { on = v; },
    dispose() { cancelAnimationFrame(raf); io && io.disconnect(); hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVis); },
  };
}
