import DATA from './mascot/frames.json';
import MAN from './mascot/man.json';

/*
 * Маскот главного экрана. Это не 3D, а кадры из видео (src/mascot/mascot-new-4k.mp4, 60 кадров/с): зверёк смотрит влево,
 * щурится, моргает и поворачивается вправо. Кадры идут со скоростью ролика, без смешивания: где зверёк движется — все подряд, где почти замер — через один; тёмный фон
 * видео убран в прозрачность, поэтому маскот стоит прямо на поле страницы. Глаза и зрачки — только из видео.
 *
 * Поз две: взгляд влево (начало ролика) и взгляд вправо (конец). Курсор левее маскота — он поворачивается
 * влево, правее — вправо; поворот — это ролик, проигранный целиком за TURN секунд, вместе с морганием
 * посередине. За самим курсором взгляд не ездит. Без курсора (и на телефоне) маскот сам смотрит
 * то влево, то вправо. На месте он только дышит.
 *
 * Вручную маскота сменяет уставший человек за ноутбуком (src/mascot/tired-man-4k.mp4): те же две позы, влево
 * и вправо, между ними он прикрывает глаза и поворачивает голову. Его кадры догружаются уже после маскота.
 *
 * Вручную сам маскот закрывает глаза и ждёт. Наборов кадров два: hd для компьютера и sd для телефона,
 * каждый разложен на несколько файлов. Маскот появляется, когда загружены все: onProgress получает долю 0..1.
 */

const SHEETS = import.meta.glob('./mascot/{hd,sd,man-hd,man-sd}-*.webp', { eager: true, query: '?url', import: 'default' });
const CLOSED = DATA.closed;
const ANCHOR_Y = 0.62;          // куда влетают карточки: середина тела
const TURN = 2;               // сколько секунд длится поворот из стороны в сторону: 3.3 — скорость исходного видео
const MAN_TURN = 1.28;          // то же для человека: 1.28 — скорость исходного видео
const IDLE_HOLD = 5.5;          // без курсора: сколько секунд маскот смотрит в одну сторону, прежде чем повернуться
const DEAD = 0.06;              // мёртвая зона у середины, чтобы маскот не дёргался, когда курсор стоит прямо под ним
const SMOOTH_OFF = 0.8;         // за сколько секунд маскот закрывает глаза в режиме «Вручную»

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

// набор кадров: спрайты разложены на несколько файлов, кадр i лежит в файле i % tiers.
// Каждый лист после загрузки режем на отдельные кадры и сам лист выбрасываем. Лист маскота — это 4200×4620 точек
// (около 78 МБ в памяти видеокарты), и соседние кадры лежат в разных листах: пока рисовали прямо из листов, поворот
// заставлял видеокарту держать и подгружать все шесть разом, отчего страница подтормаживала. Отдельный кадр весит 3 МБ
async function loadSet(data, prefix, set, onProgress = () => {}) {
  const { cols, tiers: n, p } = data, { w, h } = data.sets[set];
  // при включённой экономии трафика берём только первый файл: движение будет грубее, но картинка появится быстро
  const want = navigator.connection && navigator.connection.saveData ? [0] : [...Array(n).keys()];
  const part = Array(n).fill(0), tiers = Array(n).fill(null);
  await Promise.all(want.map(async (k) => {
    const sheet = await load(SHEETS[`./mascot/${prefix}${set}-${k}.webp`], (v) => { part[k] = v; onProgress(want.reduce((s, i) => s + part[i], 0) / want.length); });
    const count = Math.ceil((p.length - k) / n);   // сколько кадров лежит в этом листе
    tiers[k] = await Promise.all(Array.from({ length: count }, (_, c) => createImageBitmap(sheet, (c % cols) * w, Math.floor(c / cols) * h, w, h)));
    sheet.close();
  }));
  const frames = p.map((pos, i) => ({ p: pos, img: tiers[i % n] && tiers[i % n][Math.floor(i / n)] })).filter((fr) => fr.img);
  return { w, h, frames, table: frames.map((fr) => fr.p) };
}
// рисует на холсте кадр, ближайший к месту g на шкале. Кадры не смешиваем: наложение двух даёт муть и видимые «слайды»
function painter(canvas, { w, h, frames, table }) {
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  let drawn = -1;
  return (g) => {
    const [bi, bk] = locate(table, g), i = bk > 0.5 && frames[bi + 1] ? bi + 1 : bi;
    if (i === drawn) return;
    drawn = i;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(frames[i].img, 0, 0);
  };
}

export async function createMascot(canvas, hero, onProgress = () => {}, manCanvas = null) {
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const set = matchMedia('(min-width: 1001px)').matches ? 'hd' : 'sd';
  const body = await loadSet(DATA, '', set, onProgress), table = body.table;
  const draw = painter(canvas, body);

  /* состояние */
  let t = 0, last = 0, side = 1, turn = 1, turnMan = 1, shown = 1, drawMan = null, dead = false, on = true, glow = 0, pulseT = 0, lookX = 0, running = true, visible = true, raf = 0;
  const pointer = { x: 0, inside: false };
  const [ci, ck] = locate(table, CLOSED), closed = table[ck > 0.5 ? Math.min(ci + 1, table.length - 1) : ci];

  function update(dt) {
    t += dt;
    pulseT *= Math.exp(-2.4 * dt);
    glow = damp(glow, Math.min(1, pulseT), 9, dt);

    // сторона: где курсор, туда и смотрит; без него (и на телефоне) — по очереди влево и вправо
    if (!pointer.inside) side = Math.floor(t / IDLE_HOLD) % 2 ? 0 : 1;
    else if (pointer.x > DEAD) side = 1; else if (pointer.x < -DEAD) side = 0;
    // ролик идёт ровно, как в исходном видео: плавность движения в нём уже есть
    turn = clamp(turn + (side ? dt : -dt) / TURN, 0, 1);
    const aim = !on ? closed : reduce ? side : turn;
    shown = !on && !reduce ? damp(shown, aim, 2 / SMOOTH_OFF, dt) : aim;
    draw(shown);
    turnMan = clamp(turnMan + (side ? dt : -dt) / MAN_TURN, 0, 1);
    if (drawMan && !on) drawMan(reduce ? side : turnMan);

    // тело: дышит, клонится в сторону взгляда, на заявку коротко «сглатывает»; вручную оседает
    const calm = reduce ? 0 : 1, lookY = on ? 0 : -0.5;
    lookX = damp(lookX, on ? turn * 2 - 1 : 0, on ? 5 : 2, dt);
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

  // курсор считаем от середины маскота: левее — минус, правее — плюс
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.parentElement.getBoundingClientRect();
    pointer.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.4), -1, 1);
    pointer.inside = true;
  };
  const onLeave = () => { pointer.inside = false; };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }) : null;
  io && io.observe(hero);
  const onVis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  draw(shown);
  canvas.parentElement.classList.add('is-ready');
  // человек нужен только в ручном режиме, поэтому его кадры качаем после маскота; до тех пор стоит картинка-заглушка
  if (manCanvas) loadSet(MAN, 'man-', set).then((m) => {
    if (dead) return;
    drawMan = painter(manCanvas, m); drawMan(reduce ? side : turnMan);
    manCanvas.parentElement.classList.add('is-live');
  }).catch((err) => console.warn('Кадры человека не загрузились:', err));
  last = performance.now(); raf = requestAnimationFrame(frame);

  return {
    pulse(v = 1) { pulseT = Math.min(1.3, pulseT + v); },
    // точка в пикселях относительно hero: сюда влетают карточки
    anchor() {
      const hr = hero.getBoundingClientRect(), r = canvas.parentElement.getBoundingClientRect();
      return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height * ANCHOR_Y };
    },
    setMode(v) { on = v; },
    dispose() { dead = true; cancelAnimationFrame(raf); io && io.disconnect(); window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVis); },
  };
}
