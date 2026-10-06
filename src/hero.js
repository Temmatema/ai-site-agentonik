// Главный экран: красные заявки слева проходят через маскота и появляются справа
// обработанными (зелёными). Клик по заявке обрабатывает её сразу; в режиме
// «С агентами» маскот разбирает заявки сам. Данные условные.
import { animate } from 'motion';
import { ico } from './icons.js';

const CH = {
  tg: { name: 'Telegram', cls: 'ch-tg', ico: 'tgPlane' },
  mail: { name: 'Почта', cls: 'ch-mail', ico: 'mail' },
  wa: { name: 'WhatsApp', cls: 'ch-wa', ico: 'chat' },
  call: { name: 'Звонок', cls: 'ch-call', ico: 'phone' },
  avito: { name: 'Авито', cls: 'ch-avito', ico: 'tag' },
  site: { name: 'Сайт', cls: 'ch-site', ico: 'globe' },
};

// вход: что пришло; out: во что агент превратил заявку
const LEADS = [
  { ch: 'tg', time: '12:14', chip: 'Новый', text: 'Нужен ИИ-ассистент для отдела продаж. Бюджет ~ 300 тыс.', out: { name: 'Иван Петров', hot: true, sub: 'ИИ-агент для отдела продаж', sum: '≈ 300 000 ₽', st: 'Горячий лид', av: ['#f3c9a8', '#c98a64'] } },
  { ch: 'mail', time: '11:08', chip: 'Нет бюджета', text: 'Сколько стоит? Нужен прайс.', out: { name: 'Анна Смирнова', sub: 'Внедрение для поддержки', sum: '≈ 150 000 ₽', st: 'В работе', av: ['#e9c7de', '#b97ba5'] } },
  { ch: 'wa', time: '10:45', chip: 'Холодный', text: 'Когда сможете начать?', out: { name: 'ООО «СтройИнвест»', org: true, sub: 'Автоматизация заявок', sum: '≈ 250 000 ₽', st: 'Квалификация', av: ['#cfd6dc', '#8e9aa4'] } },
  { ch: 'call', time: '09:12', chip: 'Не целевой', text: 'Мы уже работаем с другим подрядчиком.', out: { name: 'Максим Кузнецов', sub: 'Нужна презентация', sum: '≈ 100 000 ₽', st: 'Ответ отправлен', av: ['#c9d6f0', '#7d93c4'] } },
  { ch: 'avito', time: '13:02', chip: 'Новый', text: 'Здравствуйте, ещё актуально? Хочу демо.', out: { name: 'Елена Орлова', sub: 'Чат-бот для магазина', sum: '≈ 180 000 ₽', st: 'Горячий лид', hot: true, av: ['#f3d6b8', '#c79c6a'] } },
  { ch: 'site', time: '13:20', chip: 'Новый', text: 'Нужен агент для записи клиентов в салон.', out: { name: 'Студия «Лотос»', org: true, sub: 'Запись клиентов', sum: '≈ 90 000 ₽', st: 'В работе', av: ['#d7ecc8', '#8fbf74'] } },
  { ch: 'tg', time: '14:05', chip: 'Холодный', text: 'Можно подробнее про интеграцию с 1С?', out: { name: 'Дмитрий Волков', sub: 'Интеграция с 1С', sum: '≈ 220 000 ₽', st: 'Квалификация', av: ['#cfe0f3', '#7ba3cf'] } },
  { ch: 'mail', time: '14:31', chip: 'Новый', text: 'Пришлите, пожалуйста, коммерческое предложение.', out: { name: 'Ольга Карпова', sub: 'КП на чат-бота', sum: '≈ 130 000 ₽', st: 'Ответ отправлен', av: ['#f0cfd6', '#c4808f'] } },
];

const VISIBLE = 4;
const initials = (n) => n.replace(/[«»"]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const NS = 'http://www.w3.org/2000/svg';
function tween(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function step(now) { const p = Math.min(1, (now - t0) / ms); fn(p); if (p < 1) requestAnimationFrame(step); else res(); })(t0);
  });
}

export function initHero(scene) {
  const hero = document.getElementById('hero');
  const listIn = document.getElementById('listIn'), listOut = document.getElementById('listOut');
  const cntIn = document.getElementById('cntIn'), cntOut = document.getElementById('cntOut');
  const svg = document.getElementById('hflow'), stage = document.getElementById('hStage');
  const live = document.getElementById('live');
  const segOn = document.getElementById('segOn'), segOff = document.getElementById('segOff');
  if (!hero || !listIn) return { setScene() {} };

  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const narrow = matchMedia('(max-width: 1000px)');
  let sc = scene, on = true, busy = false, nextIdx = VISIBLE, inbox = 37, done = 28, visible = true;

  /* ---------- разметка карточек ---------- */
  function inEl(lead) {
    const c = CH[lead.ch], li = document.createElement('li');
    li.className = 'lead lead-in'; li.tabIndex = 0; li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Обработать заявку: ${c.name}, ${lead.text}`);
    li.innerHTML = `<span class="lead-ch ${c.cls}">${ico(c.ico)}</span>
      <div class="lead-main"><div class="lead-top"><b>${c.name}</b><time>${lead.time}</time><span class="lead-chip">${lead.chip}</span></div><p>${lead.text}</p></div>`;
    li._lead = lead;
    return li;
  }
  function outEl(o) {
    const li = document.createElement('li');
    li.className = 'lead lead-out';
    li.innerHTML = `<span class="av" style="--a:${o.av[0]};--b:${o.av[1]}">${o.org ? ico('grid') : initials(o.name)}</span>
      <div class="lead-main"><b>${o.name}${o.hot ? `<span class="hotf">${ico('fireFill')}</span>` : ''}</b><small>${o.sub}</small><small>${o.sum}</small></div>
      <span class="lead-st">${o.st}</span><span class="chev">${ico('arrowR')}</span>`;
    return li;
  }

  for (let i = 0; i < VISIBLE; i++) listIn.appendChild(inEl(LEADS[i]));
  for (let i = 0; i < VISIBLE; i++) listOut.appendChild(outEl(LEADS[(LEADS.length - 1 - i + LEADS.length) % LEADS.length].out));

  /* ---------- линии-связи ---------- */
  const mk = (cls, tag = 'path') => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); svg.appendChild(e); return e; };
  let redP = [], greenP = [], ambient = [];
  function rebuildPaths() {
    svg.innerHTML = '';
    redP = []; greenP = []; ambient = [];
    if (narrow.matches) return;
    const hr = hero.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${hr.width} ${hr.height}`); svg.setAttribute('width', hr.width); svg.setAttribute('height', hr.height);
    const cx = sr.left - hr.left + sr.width / 2, cy = sr.top - hr.top + sr.height * 0.58;
    const rel = (r) => ({ l: r.left - hr.left, r: r.right - hr.left, y: r.top - hr.top + r.height / 2 });
    [...listIn.children].forEach((li, i, arr) => {
      const a = rel(li.getBoundingClientRect()), ty = cy + (i - (arr.length - 1) / 2) * 16, tx = cx - sr.width * 0.2;
      const d = `M${a.r},${a.y} C${a.r + (tx - a.r) * 0.55},${a.y} ${tx - (tx - a.r) * 0.45},${ty} ${tx},${ty}`;
      const p = mk('hl hl-red'); p.setAttribute('d', d); redP.push(p);
      const dot = mk('hl-dot hl-dot-red', 'circle'); dot.setAttribute('cx', a.r); dot.setAttribute('cy', a.y); dot.setAttribute('r', 6);
    });
    [...listOut.children].forEach((li, i, arr) => {
      const b = rel(li.getBoundingClientRect()), sy = cy + (i - (arr.length - 1) / 2) * 16, sx = cx + sr.width * 0.22;
      const d = `M${sx},${sy} C${sx + (b.l - sx) * 0.55},${sy} ${b.l - (b.l - sx) * 0.45},${b.y} ${b.l},${b.y}`;
      const p = mk('hl hl-green'); p.setAttribute('d', d); greenP.push(p);
      const dot = mk('hl-dot hl-dot-green', 'circle'); dot.setAttribute('cx', b.l); dot.setAttribute('cy', b.y); dot.setAttribute('r', 6);
    });
    // фоновые «бегущие» точки
    [...redP, ...greenP].forEach((p, i) => {
      const c = mk('hl-run ' + (i < redP.length ? 'hl-run-red' : 'hl-run-green'), 'circle'); c.setAttribute('r', 4);
      ambient.push({ p, c, len: p.getTotalLength(), off: Math.random(), speed: 0.00011 + Math.random() * 0.00008 });
    });
  }
  let layoutT = 0;
  function layout() { clearTimeout(layoutT); layoutT = setTimeout(rebuildPaths, 30); }
  if (window.ResizeObserver) { const ro = new ResizeObserver(layout); ro.observe(hero); ro.observe(stage); }
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  rebuildPaths();

  (function loop(now) {
    requestAnimationFrame(loop);
    if (calm || !visible || document.hidden) return;
    const k = on ? 1 : 0.35;
    ambient.forEach((a) => {
      const isRed = a.c.classList.contains('hl-run-red');
      if (!on && !isRed) { a.c.style.opacity = 0; return; }
      const u = (a.off + now * a.speed * k) % 1, pt = a.p.getPointAtLength(a.len * u);
      a.c.setAttribute('cx', pt.x); a.c.setAttribute('cy', pt.y);
      a.c.style.opacity = Math.sin(Math.PI * u) * 0.9;
    });
  })(performance.now());

  /* ---------- вспомогательное ---------- */
  function flip(list, mutate) {
    const before = new Map([...list.children].map((c) => [c, c.getBoundingClientRect().top]));
    mutate();
    if (calm) return;
    [...list.children].forEach((c) => {
      if (!before.has(c)) return;
      const dy = before.get(c) - c.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) animate(c, { y: [dy, 0] }, { type: 'spring', stiffness: 220, damping: 26 });
    });
  }
  function bump(el, n) {
    el.textContent = String(n);
    if (!calm) animate(el, { scale: [1.25, 1] }, { duration: 0.35, ease: 'easeOut' });
  }
  function fly(path, cls, ms) {
    if (!path || narrow.matches || calm) return sleep(narrow.matches ? 250 : 0);
    const len = path.getTotalLength(), c = mk('hl-token ' + cls, 'circle');
    c.setAttribute('r', 9);
    return tween(ms, (v) => { const pt = path.getPointAtLength(len * easeInOut(v)); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); }).then(() => c.remove());
  }

  /* ---------- обработка заявки ---------- */
  async function process(li) {
    if (busy || !li || !li.isConnected) return;
    busy = true;
    const lead = li._lead, idx = [...listIn.children].indexOf(li);
    li.classList.add('is-busy');
    svg.classList.add('is-flow');

    await fly(redP[idx], 'hl-token-red', 650);
    if (sc) sc.pulse(1);
    if (live) live.textContent = `Заявка обработана: ${lead.out.name}`;

    // левая колонка: заявка уходит, снизу приходит новая
    if (!calm) animate(li, { opacity: [1, 0], x: [0, 24] }, { duration: 0.28 });
    await sleep(calm ? 0 : 260);
    flip(listIn, () => {
      li.remove();
      const nl = inEl(LEADS[nextIdx % LEADS.length]); nextIdx++;
      listIn.appendChild(nl);
      if (!calm) animate(nl, { opacity: [0, 1], y: [24, 0] }, { type: 'spring', stiffness: 180, damping: 20 });
    });
    inbox = Math.max(0, inbox - 1); bump(cntIn, inbox);

    // правая колонка: зелёная точка летит к верхней карточке, потом появляется обработанная
    await fly(greenP[0], 'hl-token-green', 600);
    flip(listOut, () => {
      if (listOut.children.length >= VISIBLE) listOut.lastElementChild.remove();
      const ne = outEl(lead.out);
      listOut.prepend(ne);
      if (!calm) animate(ne, { opacity: [0, 1], scale: [0.92, 1], y: [-18, 0] }, { type: 'spring', stiffness: 200, damping: 20 });
    });
    done += 1; bump(cntOut, done);

    layout();
    svg.classList.remove('is-flow');
    busy = false;
  }

  listIn.addEventListener('click', (e) => { const li = e.target.closest('.lead-in'); if (li) { process(li); wake(); } });
  listIn.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.lead-in'); if (li) { e.preventDefault(); process(li); wake(); }
  });

  /* ---------- автопилот и режимы ---------- */
  let timer = 0, arrive = 0;
  const idleMs = () => (on ? 2800 : 0);
  function tick() {
    clearTimeout(timer);
    if (!on || calm) return;
    timer = setTimeout(async () => {
      if (visible && !document.hidden && !busy) await process(listIn.firstElementChild);
      tick();
    }, idleMs());
  }
  function wake() { if (on && !calm) tick(); }

  function arrivals() {
    clearInterval(arrive);
    arrive = setInterval(() => {
      if (!visible || document.hidden) return;
      inbox += on ? (Math.random() < 0.35 ? 1 : 0) : 1;
      bump(cntIn, inbox);
    }, on ? 3200 : 1800);
  }

  function setMode(next) {
    if (next === on) return;
    on = next;
    hero.dataset.mode = on ? 'on' : 'off';
    segOn.setAttribute('aria-checked', String(on)); segOff.setAttribute('aria-checked', String(!on));
    segOn.tabIndex = on ? 0 : -1; segOff.tabIndex = on ? -1 : 0;
    if (sc) sc.setMode(on);
    if (live) live.textContent = on ? 'Режим: с агентами. Заявки разбираются автоматически.' : 'Режим: вручную. Заявки копятся.';
    arrivals(); on ? tick() : clearTimeout(timer);
  }
  segOn.addEventListener('click', () => setMode(true));
  segOff.addEventListener('click', () => setMode(false));
  document.getElementById('seg').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setMode(true); segOn.focus(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setMode(false); segOff.focus(); }
  });

  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) tick(); }).observe(hero);
  hero.dataset.mode = 'on';
  arrivals();
  setTimeout(tick, 1600);

  return { setScene(s) { sc = s; if (sc) sc.setMode(on); } };
}
