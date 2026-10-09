import DATA from './mascot/frames.json';

/*
 * Маскот главного экрана. Это не 3D, а кадры из видео (src/mascot/mascot-slow-4.mp4): зверёк смотрит
 * влево с прищуром, моргает и поворачивается вправо с широко открытыми глазами. Кадры вырезаны
 * с прозрачным фоном, поэтому маскот стоит прямо на тёмном поле страницы. Глаза и зрачки — только
 * из видео, ничего не дорисовывается.
 *
 * Положение курсора по горизонтали — это место в ролике (0 — влево, 1 — вправо); место каждого кадра
 * на этой шкале записано в frames.json (p), там же место кадра с закрытыми глазами (closed).
 * Левая треть шкалы — прищур, дальше моргание и поворот, в конце взгляд вправо.
 * Пока курсор движется, взгляд идёт за ним непрерывно, плавно перетекая из кадра в кадр. Когда курсор
 * остановился, взгляд доходит до ближайшего целого кадра и замирает на нём: между двумя кадрами
 * картинка двоится. На месте маскот только дышит.
 *
 * Вручную маскот закрывает глаза и ждёт. Наборов кадров два: hd для компьютера и sd для телефона,
 * каждый разложен на несколько файлов. Маскот появляется, когда загружены все: onProgress получает долю 0..1.
 */

const SHEETS = import.meta.glob('./mascot/{hd,sd}-*.webp', { eager: true, query: '?url', import: 'default' });
const { cols: COLS, tiers: TIERS, sets: SETS, p: POS, closed: CLOSED } = DATA;
const EYES_Y = 0.4;             // уровень глаз в кадре (доля высоты)
const ANCHOR_Y = 0.62;          // куда влетают карточки: середина тела
const SETTLE = 0.14;            // через сколько секунд без движения мыши взгляд доводится до целого кадра
const FOLLOW = 6.5;             // как быстро взгляд догоняет курсор: меньше — плавнее, но с бóльшим отставанием

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

// файл качаем потоком, чтобы показывать настоящую долю загрузки, и сразу раскодируем в bitmap:
// иначе браузер может выгрузить большой спрайт из памяти и подтормозить на повторной раскодировке
async function load(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Кадры маскота: ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  let blob;
  if (res.body && total) {
    const reader = res.body.getReader(), chunks = [];
    let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onBytes(Math.min(1, got / total)); }
    blob = new Blob(chunks, { type: 'image/webp' });
  } else blob = await res.blob();
  onBytes(1);
  return createImageBitmap(blob);
}
// место на шкале → номер кадра и доля следующего
function locate(table, g) {
  let i = 0;
  while (i < table.length - 2 && table[i + 1] <= g) i++;
  return [i, clamp((g - table[i]) / (table[i + 1] - table[i] || 1), 0, 1)];
}

export async function createMascot(canvas, hero, onProgress = () => {}) {
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const set = matchMedia('(min-width: 1001px)').matches ? 'hd' : 'sd';
  const { w: W, h: H } = SETS[set], url = (tier) => SHEETS[`./mascot/${set}-${tier}.webp`];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // при включённой экономии трафика берём только первый файл: движение будет грубее, но маскот появится быстро
  const want = navigator.connection && navigator.connection.saveData ? [0] : [...Array(TIERS).keys()];
  const part = Array(TIERS).fill(0);
  const tiers = Array(TIERS).fill(null);
  await Promise.all(want.map(async (k) => {
    tiers[k] = await load(url(k), (v) => { part[k] = v; onProgress(want.reduce((s, i) => s + part[i], 0) / want.length); });
  }));
  const frames = POS.map((p, i) => ({ p, img: tiers[i % TIERS], cell: Math.floor(i / TIERS) })).filter((fr) => fr.img);
  const table = frames.map((fr) => fr.p);

  /* состояние */
  let t = 0, last = 0, pos = 1, drawn = -1, on = true, glow = 0, pulseT = 0, lookX = 0, lookY = 0, still = 0, running = true, visible = true, raf = 0;
  const pointer = { x: 0, y: 0, inside: false };

  function draw(g) {
    const [bi, bk] = locate(table, g), a = frames[bi], b = frames[bi + 1] || a;
    const put = (fr) => ctx.drawImage(fr.img, (fr.cell % COLS) * W, Math.floor(fr.cell / COLS) * H, W, H, 0, 0, W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1; put(a);
    if (bk > 0.02 && b !== a) { ctx.globalAlpha = bk; put(b); ctx.globalAlpha = 1; }
  }

  function update(dt) {
    t += dt; still += dt;
    pulseT *= Math.exp(-2.4 * dt);
    glow = damp(glow, Math.min(1, pulseT), 9, dt);

    // за курсором; без него (и на телефоне) маскот сам неспешно оглядывается; вручную закрывает глаза
    const gazeX = pointer.inside ? pointer.x : Math.sin(t * 0.55) * Math.sin(t * 0.21 + 1) * 0.85;
    const gazeY = pointer.inside ? pointer.y : Math.sin(t * 0.37 + 2) * 0.35;
    const goal = !on ? CLOSED : reduce ? 1 : clamp(gazeX * 0.5 + 0.5, 0, 1);
    // в движении идём к самой точке курсора, на месте — к ближайшему целому кадру
    const [ti, tk] = locate(table, goal), whole = table[tk > 0.5 ? Math.min(ti + 1, table.length - 1) : ti];
    const rest = !on || reduce || (pointer.inside && still > SETTLE);
    const target = rest ? whole : goal;
    pos = reduce ? target : damp(pos, target, on ? FOLLOW : 2.5, dt);
    if (rest && Math.abs(target - pos) < 0.0006) pos = target;
    if (Math.abs(pos - drawn) > 0.0004) { draw(pos); drawn = pos; }

    // тело: дышит, клонится за курсором, на заявку коротко «сглатывает»; вручную оседает
    const calm = reduce ? 0 : 1;
    lookX = damp(lookX, !on || reduce ? 0 : gazeX, on ? 5 : 2, dt); lookY = damp(lookY, on ? gazeY : -0.5, 5, dt);
    const breath = Math.sin(t * (on ? 1.9 : 1.1)) * 0.01 * calm;
    const sx = 1 - breath * 0.6 - lookY * 0.006 + glow * 0.04 + (on ? 0 : 0.015);
    const sy = 1 + breath + lookY * 0.012 - glow * 0.045 - (on ? 0 : 0.025);
    canvas.style.transform = `rotate(${(lookX * 1.1 * calm).toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!running || !visible) return;
    update(dt);
  }

  // курсор считаем от маскота по всему окну: x — доля ширины экрана, y — вверх от уровня глаз
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.parentElement.getBoundingClientRect();
    pointer.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.4), -1, 1);
    pointer.y = clamp(-(e.clientY - (r.top + r.height * EYES_Y)) / (window.innerHeight * 0.35), -1, 1);
    pointer.inside = true; still = 0;
  };
  const onLeave = () => { pointer.inside = false; };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }) : null;
  io && io.observe(hero);
  const onVis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  draw(pos); drawn = pos;
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
    dispose() { cancelAnimationFrame(raf); io && io.disconnect(); window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVis); },
  };
}
