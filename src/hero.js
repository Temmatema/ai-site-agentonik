// Главный экран: красные заявки слева влетают в маскота и вылетают справа
// обработанными (зелёными). В режиме «С агентами» маскот берёт все заявки разом,
// пачкой; клик по заявке обрабатывает её сразу. Данные условные.
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
  { ch: 'tg', time: '12:14', chip: 'Новый', text: 'Нужен ИИ-ассистент для продаж', out: { name: 'Иван Петров', hot: true, sub: 'ИИ-агент для продаж', st: 'Горячий лид', av: ['#f3c9a8', '#c98a64'] } },
  { ch: 'mail', time: '11:08', chip: 'Нет бюджета', text: 'Сколько стоит? Нужен прайс', out: { name: 'Анна Смирнова', sub: 'Внедрение для поддержки', st: 'В работе', av: ['#e9c7de', '#b97ba5'] } },
  { ch: 'wa', time: '10:45', chip: 'Холодный', text: 'Когда сможете начать?', out: { name: 'ООО «СтройИнвест»', org: true, sub: 'Автоматизация заявок', st: 'Квалификация', av: ['#cfd6dc', '#8e9aa4'] } },
  { ch: 'call', time: '09:12', chip: 'Не целевой', text: 'Уже работаем с подрядчиком', out: { name: 'Максим Кузнецов', sub: 'Нужна презентация', st: 'Ответ отправлен', av: ['#c9d6f0', '#7d93c4'] } },
  { ch: 'avito', time: '13:02', chip: 'Новый', text: 'Ещё актуально? Хочу демо', out: { name: 'Елена Орлова', sub: 'Чат-бот для магазина', st: 'Горячий лид', hot: true, av: ['#f3d6b8', '#c79c6a'] } },
  { ch: 'site', time: '13:20', chip: 'Новый', text: 'Нужен агент для записи в салон', out: { name: 'Студия «Лотос»', org: true, sub: 'Запись клиентов', st: 'В работе', av: ['#d7ecc8', '#8fbf74'] } },
  { ch: 'tg', time: '14:05', chip: 'Холодный', text: 'Есть интеграция с 1С?', out: { name: 'Дмитрий Волков', sub: 'Интеграция с 1С', st: 'Квалификация', av: ['#cfe0f3', '#7ba3cf'] } },
  { ch: 'mail', time: '14:31', chip: 'Новый', text: 'Пришлите, пожалуйста, КП', out: { name: 'Ольга Карпова', sub: 'КП на чат-бота', st: 'Ответ отправлен', av: ['#f0cfd6', '#c4808f'] } },
];

const VISIBLE = 3;
const HOURS_PER_LEAD = 0.1; // сколько часов команды условно экономит одна обработанная заявка
const initials = (n) => n.replace(/[«»"]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NS = 'http://www.w3.org/2000/svg';

export function initHero(scene) {
  const hero = document.getElementById('hero');
  const listIn = document.getElementById('listIn'), listOut = document.getElementById('listOut');
  const cntIn = document.getElementById('cntIn'), cntOut = document.getElementById('cntOut'), cntHours = document.getElementById('cntHours');
  const svg = document.getElementById('hflow'), stage = document.getElementById('hStage');
  const live = document.getElementById('live');
  const segOn = document.getElementById('segOn'), segOff = document.getElementById('segOff');
  if (!hero || !listIn) return { setScene() {} };

  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const narrow = matchMedia('(max-width: 1000px)');
  let sc = scene, on = true, nextIdx = VISIBLE, inbox = 37, done = 28, hours = 62, visible = true;

  /* ---------- разметка карточек ---------- */
  function inEl(lead) {
    const c = CH[lead.ch], li = document.createElement('li');
    li.className = 'lead lead-in'; li.tabIndex = 0; li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Обработать заявку: ${c.name}, ${lead.text}`);
    li.innerHTML = `<span class="lead-ch ${c.cls}">${ico(c.ico)}</span>
      <div class="lead-main"><div class="lead-top"><b>${c.name}</b><time>${lead.time}</time><span class="lead-chip">${lead.chip}</span></div><p>${lead.text}</p></div>
      <span class="lead-go" aria-hidden="true">Отдать агенту →</span>`;
    li._lead = lead;
    return li;
  }
  function outEl(o) {
    const li = document.createElement('li');
    li.className = 'lead lead-out';
    li.innerHTML = `<span class="av" style="--a:${o.av[0]};--b:${o.av[1]}">${o.org ? ico('grid') : initials(o.name)}</span>
      <div class="lead-main"><b>${o.name}${o.hot ? `<span class="hotf">${ico('fireFill')}</span>` : ''}</b><small>${o.sub}</small></div>
      <span class="lead-st">${o.st}</span>`;
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
  // линии перестраиваем, когда карточки уже встали на место
  let layoutT = 0;
  function layout(ms = 30) { clearTimeout(layoutT); layoutT = setTimeout(rebuildPaths, ms); }
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => layout()); ro.observe(hero); ro.observe(stage); }
  window.addEventListener('resize', () => layout());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());
  rebuildPaths();

  (function loop(now) {
    requestAnimationFrame(loop);
    if (calm || !visible || document.hidden || hero.dataset.covered) return;
    const k = on ? 2.6 : 0.35;
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
  const showHours = () => { if (cntHours) cntHours.textContent = hours.toFixed(1).replace('.', ',') + ' часа'; };
  showHours();

  /* ---------- полёт карточек через маскота ---------- */
  const fly = document.createElement('ul');
  fly.className = 'h-fly'; fly.setAttribute('aria-hidden', 'true'); hero.appendChild(fly);
  // центр элемента в координатах hero (панели наклонены, поэтому берём центр, а не угол)
  function centre(el) {
    const hr = hero.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2 };
  }
  // точка, куда влетают и откуда вылетают карточки: визор маскота
  function anchor() {
    const a = sc && sc.anchor ? sc.anchor() : null;
    if (a) return a;
    const hr = hero.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { x: sr.left - hr.left + sr.width / 2, y: sr.top - hr.top + sr.height * 0.32 };
  }
  // «призрак» карточки поверх сцены: c — где должен оказаться его центр
  function ghost(el, c, w) {
    el.classList.add('lead-ghost'); el.removeAttribute('tabindex'); el.removeAttribute('role');
    el.style.width = w + 'px';
    fly.appendChild(el);
    el.style.left = (c.x - w / 2) + 'px'; el.style.top = (c.y - el.offsetHeight / 2) + 'px';
    return el;
  }

  /* ---------- обработка заявки ---------- */
  function swapIn(li) {
    flip(listIn, () => {
      li.remove();
      const nl = inEl(LEADS[nextIdx % LEADS.length]); nextIdx++;
      listIn.appendChild(nl);
      if (!calm) animate(nl, { opacity: [0, 1], y: [24, 0] }, { type: 'spring', stiffness: 180, damping: 20 });
    });
    inbox = Math.max(on ? VISIBLE : 0, inbox - 1); bump(cntIn, inbox);
    layout(600);
  }

  async function process(li) {
    if (!li || !li.isConnected || li._busy) return;
    li._busy = true;
    const lead = li._lead, fast = on; // с агентами всё в разы быстрее, чем вручную
    const T = fast ? { in: 0.6, hold: 120, out: 0.6 } : { in: 1.6, hold: 900, out: 1.4 };
    const flying = !calm && !narrow.matches;

    // красная карточка улетает в визор, на её место снизу приходит новая
    if (flying) {
      const from = centre(li), a = anchor();
      const g = ghost(li.cloneNode(true), from, li.offsetWidth);
      li.style.visibility = 'hidden';
      const end = animate(g, { x: [0, a.x - from.x], y: [0, a.y - from.y], scale: [1, 0.1], opacity: [1, 1, 0] }, {
        duration: T.in, x: { ease: [0.5, 0, 0.9, 0.7] }, y: { ease: [0.3, 0, 0.6, 1] }, scale: { ease: [0.5, 0, 0.8, 0.6] }, opacity: { times: [0, 0.75, 1], ease: 'linear' },
      }).finished;
      await sleep(T.in * 350);
      swapIn(li);
      await end; g.remove();
    } else {
      if (!calm) { animate(li, { opacity: [1, 0], x: [0, 24] }, { duration: 0.2 }); await sleep(220); }
      swapIn(li);
    }
    if (sc) sc.pulse(fast ? 0.5 : 1);
    if (live) live.textContent = `Заявка обработана: ${lead.out.name}`;
    await sleep(calm ? 0 : T.hold);

    // зелёная карточка вылетает из визора и встаёт первой в списке обработанных
    if (flying) {
      const a = anchor(), to = centre(listOut.firstElementChild || listOut);
      const g = ghost(outEl(lead.out), to, listOut.offsetWidth);
      await animate(g, { x: [a.x - to.x, 0], y: [a.y - to.y, 0], scale: [0.1, 1], opacity: [0, 1, 1] }, {
        duration: T.out, x: { ease: [0.1, 0.3, 0.5, 1] }, y: { ease: [0.4, 0, 0.7, 1] }, scale: { ease: [0.2, 0.4, 0.5, 1] }, opacity: { times: [0, 0.25, 1], ease: 'linear' },
      }).finished;
      g.remove();
    }
    flip(listOut, () => {
      while (listOut.children.length >= VISIBLE) listOut.lastElementChild.remove();
      const ne = outEl(lead.out);
      listOut.prepend(ne);
      if (!flying && !calm) animate(ne, { opacity: [0, 1], scale: [0.92, 1], y: [-18, 0] }, { type: 'spring', stiffness: 200, damping: 20 });
    });
    done += 1; bump(cntOut, done);
    if (fast) { hours += HOURS_PER_LEAD; showHours(); } // вручную время команды не экономится
    layout(600);
  }

  listIn.addEventListener('click', (e) => { const li = e.target.closest('.lead-in'); if (li) process(li); });
  listIn.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.lead-in'); if (li) { e.preventDefault(); process(li); }
  });

  /* ---------- автопилот и режимы ---------- */
  // с агентами маскот забирает все видимые заявки одной пачкой, а не по одной
  let timer = 0, arrive = 0;
  function tick() {
    clearTimeout(timer);
    if (!on || calm) return;
    timer = setTimeout(async () => {
      if (visible && !document.hidden && !hero.dataset.covered) {
        const batch = [...listIn.children].filter((li) => !li._busy);
        await Promise.all(batch.map((li, i) => sleep(i * 170).then(() => on && process(li))));
      }
      tick();
    }, 1100);
  }

  function arrivals() {
    clearInterval(arrive);
    arrive = setInterval(() => {
      if (!visible || document.hidden) return;
      inbox += on ? (Math.random() < 0.35 ? 1 : 0) : 1;
      bump(cntIn, inbox);
    }, on ? 3200 : 1800);
  }

  // вторая половина заголовка меняется вместе с режимом: старая фраза уезжает вверх и расплывается, новая приходит снизу
  const swapEl = document.getElementById('hSwap');
  let swapTok = 0;
  async function swapTitle() {
    if (!swapEl) return;
    const my = ++swapTok, text = on ? 'агент уже ответил' : 'клиент уже ушёл';
    if (!calm) await animate(swapEl, { opacity: [1, 0], y: [0, -22], filter: ['blur(0px)', 'blur(8px)'] }, { duration: 0.28, ease: 'easeIn' }).finished;
    if (my !== swapTok) return;
    swapEl.textContent = text;
    if (!calm) animate(swapEl, { opacity: [0, 1], y: [26, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] });
  }

  function setMode(next) {
    if (next === on) return;
    on = next;
    swapTitle();
    hero.dataset.mode = on ? 'on' : 'off';
    segOn.setAttribute('aria-checked', String(on)); segOff.setAttribute('aria-checked', String(!on));
    segOn.tabIndex = on ? 0 : -1; segOff.tabIndex = on ? -1 : 0;
    if (sc) sc.setMode(on);
    if (live) live.textContent = on ? 'Режим: с агентами. Заявки разбираются автоматически.' : 'Режим: вручную. Заявки копятся.';
    arrivals(); on ? tick() : clearTimeout(timer);
    // подсказка ведёт по кругу: сначала «Вручную», потом обратно к агентам, и исчезает
    const seg = document.getElementById('seg'), hint = document.getElementById('segHint');
    if (on) seg.dataset.tried = '1';
    else if (hint && !seg.dataset.tried) hint.textContent = 'А теперь верните агентов';
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
