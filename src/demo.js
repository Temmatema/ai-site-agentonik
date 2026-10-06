// Демо «агент разбирает заявку»: схема-поток. Заявка слева, понимание запроса в центре,
// пять действий справа и итог внизу. Всё считается в браузере по простым правилам,
// чтобы показать логику работы. Настоящий агент подключается к CRM, прайсу и каналам.
import { animate } from 'motion';

const PRESETS = [
  { label: 'Горячий лид', channel: 'Telegram', text: 'Здравствуйте! Нужен ИИ-ассистент для отдела продаж, бюджет около 300 тыс. Можно демо на этой неделе? Мой номер +7 913 555-12-34' },
  { label: 'Вопрос о цене', channel: 'Сайт', text: 'Добрый день, сколько стоит чат-бот, который отвечает на вопросы клиентов?' },
  { label: 'Жалоба', channel: 'WhatsApp', text: 'Третий день не могу получить счёт, никто не отвечает! Это безобразие, верните деньги.' },
  { label: 'Спам', channel: 'Почта', text: 'Выиграйте iPhone! Переходите по ссылке http://bit.ly/win и получите бонус в казино.' },
];

const CHANNELS = {
  Telegram: { cls: 'tg', ico: 'send', notify: 'Slack' },
  WhatsApp: { cls: 'wa', ico: 'chat', notify: 'Slack' },
  Сайт: { cls: 'web', ico: 'globe', notify: 'Slack' },
  Почта: { cls: 'mail', ico: 'mail', notify: 'Slack' },
};

const TYPES = {
  hot: { name: 'Горячий лид', ico: 'fire', tone: 'hot', dept: 'Продажи', deptIco: 'target' },
  price: { name: 'Вопрос о цене', ico: 'tag', tone: '', dept: 'Продажи', deptIco: 'target' },
  complaint: { name: 'Жалоба', ico: 'alert', tone: 'hot', dept: 'Поддержка', deptIco: 'users' },
  spam: { name: 'Спам', ico: 'alert', tone: 'mute', dept: 'Фильтр', deptIco: 'users' },
  question: { name: 'Общий вопрос', ico: 'chat', tone: '', dept: 'Поддержка', deptIco: 'users' },
};

const REPLIES = {
  hot: (x) => `${x.hello}Спасибо, что написали! Задача понятна${x.budget ? `, бюджет ${x.budget} нам подходит` : ''}. Предлагаю короткое демо на 30 минут: покажем, как агент разбирает ваши заявки. ${x.phone ? 'Менеджер позвонит вам сегодня.' : 'Подскажите телефон или удобное время для связи.'}`,
  price: (x) => `${x.hello}Стоимость зависит от каналов и объёма заявок: простой агент для ответов стартует от 49 000 ₽ в месяц. Подскажите, сколько обращений в день вы получаете, и я пришлю точный расчёт.`,
  complaint: (x) => `${x.hello}Приношу извинения за ожидание, это недопустимо. Я передал ваше обращение руководителю поддержки с пометкой «срочно», счёт будет у вас в течение часа.`,
  spam: () => 'Ответ не требуется. Сообщение помечено как спам и скрыто.',
  question: (x) => `${x.hello}Спасибо за вопрос! Нашёл ответ в базе знаний и отправил его вам. Если останутся вопросы, напишите сюда, я на связи круглосуточно.`,
};

function analyze(text) {
  const s = text.toLowerCase();
  const phone = (text.match(/(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/) || [])[0] || '';
  const budgetM = text.match(/(\d[\d\s]*)\s*(тыс|к\b|₽|руб)/i);
  let budget = '';
  if (budgetM) {
    const n = parseInt(budgetM[1].replace(/\s/g, ''), 10);
    if (n) budget = (/тыс|к\b/i.test(budgetM[2]) ? n * 1000 : n).toLocaleString('ru-RU') + ' ₽';
  }
  const nameM = text.match(/(?:меня зовут|я\s)\s*([А-ЯЁ][а-яё]+)/);
  const name = nameM ? nameM[1] : '';
  const has = (...w) => w.some((x) => s.includes(x));
  let type = 'question';
  if (has('http', 'выиграй', 'казино', 'бонус', 'заработ') || (text.match(/!/g) || []).length > 3) type = 'spam';
  else if (has('безобраз', 'жалоб', 'верните', 'не работает', 'ужас', 'обман', 'никто не отвечает')) type = 'complaint';
  else if (has('нужен', 'нужна', 'хочу', 'заказать', 'купить', 'демо', 'интересует', 'бюджет', 'подключить') || phone) type = 'hot';
  else if (has('сколько стоит', 'цена', 'стоимость', 'прайс', 'тариф', 'почём')) type = 'price';
  return { type, phone, budget, name, demo: has('демо', 'презентац'), link: has('http'), hello: name ? `${name}, здравствуйте! ` : 'Здравствуйте! ' };
}

/* ---------- иконки ---------- */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  fire: '<path d="M12 2.5s5.5 4.2 5.5 9.8a5.5 5.5 0 0 1-11 0c0-2.1 1-3.4 2.1-4.4.1 1.6.7 2.6 1.7 3.1C10 8.6 10.6 5.2 12 2.5z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v13c0 1.7 3.1 3 7 3s7-1.3 7-3v-13M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17.5 14.2c2.4.2 4 2 4 5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  send: '<path d="M21 3 3 10.5l7 3 3 7z"/><path d="M10 13.5 21 3"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  clip: '<path d="m20 11.5-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.5 17a1.7 1.7 0 0 1-2.4-2.4L15 6.7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  dash: '<path d="M6 12h12"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 17.5v.5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const chanBadge = (name) => { const c = CHANNELS[name] || CHANNELS['Сайт']; return `<span class="chan ${c.cls}">${ico(c.ico)}</span>`; };

const STEP_DEFS = [
  { icon: 'chat', title: '2. Готовит ответ' },
  { icon: 'database', title: '3. Создаёт запись в CRM' },
  { icon: 'send', title: '4. Отправляет ответ клиенту' },
  { icon: 'bell', title: '5. Уведомляет команду' },
];

const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtSec = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' с';
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function tween(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / ms);
      fn(p);
      if (p < 1) requestAnimationFrame(step); else res();
    })(t0);
  });
}

/* что агент «увидел» и сделал для конкретной заявки */
function buildPlan(a, channel) {
  const T = TYPES[a.type];
  const tags = [{ ico: T.ico, txt: T.name, tone: T.tone }, { ico: T.deptIco, txt: T.dept, tone: a.type === 'spam' ? 'mute' : '' }];
  if (a.budget) tags.push({ ico: 'database', txt: `Бюджет ≈ ${a.budget}` });
  if (a.demo) tags.push({ ico: 'users', txt: 'Нужна демонстрация' });
  if (a.type === 'price') tags.push({ ico: 'target', txt: 'Нужен расчёт' });
  if (a.type === 'complaint') tags.push({ ico: 'alert', txt: 'Срочный приоритет', tone: 'hot' });
  if (a.type === 'spam' && a.link) tags.push({ ico: 'alert', txt: 'Есть ссылка', tone: 'mute' });
  if (a.type === 'question') tags.push({ ico: 'chat', txt: 'Ответит агент' });
  if (a.phone) tags.push({ ico: 'phone', txt: 'Оставил телефон' });
  else if (a.type === 'hot') tags.push({ ico: 'phone', txt: 'Нет телефона', tone: 'mute' });

  const notify = CHANNELS[channel] ? CHANNELS[channel].notify : 'Slack';
  const spam = a.type === 'spam';
  return {
    type: T, tags: tags.slice(0, 5),
    reply: REPLIES[a.type](a),
    steps: [
      { ms: 1800, skip: false },
      { ms: 600, skip: spam, detail: spam ? 'Запись не создаётся' : a.type === 'complaint' ? `Тикет «Срочный» создан\nИсточник: ${channel}` : `Новый лид создан\nИсточник: ${channel}` },
      { ms: 400, skip: spam, detail: spam ? 'Отправка не нужна' : `Сообщение отправлено\nв ${channel}` },
      { ms: 300, skip: spam || a.type === 'price' || a.type === 'question', detail: spam ? 'Команду не беспокоим' : a.type === 'complaint' ? `Руководитель поддержки\nполучил срочное в ${notify}` : a.type === 'hot' ? `Менеджер получил уведомление\nв ${notify}` : 'Уведомление не нужно\nвопрос закрыт агентом' },
    ],
  };
}

export function initDemo() {
  const $ = (id) => document.getElementById(id);
  const flow = $('flow');
  if (!flow) return;
  const svg = $('flowSvg'), inCard = $('inCard'), midCard = $('midCard'), rightCol = $('rightCol');
  const presetsEl = $('demoPresets'), textEl = $('demoText'), runBtn = $('demoRun');
  const chanIco = $('chanIco'), chanName = $('chanName'), tagsEl = $('demoTags'), t1 = $('t1'), probe = $('probe');
  const done = $('demoDone'), doneTitle = $('doneTitle'), doneSub = $('doneSub'), doneType = $('doneType'), doneChan = $('doneChan');
  const narrow = matchMedia('(max-width: 1000px)');

  $('chanTime').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  let channel = PRESETS[0].channel;
  const setChannel = (c) => { channel = c; chanName.textContent = c; chanIco.innerHTML = chanBadge(c); };

  /* карточки шагов справа */
  rightCol.innerHTML = STEP_DEFS.map((d, i) => `
    <article class="fcard step reveal" data-i="${i}">
      <span class="sbox">${ico(d.icon)}</span>
      <div class="sbody"><div class="shead"><b>${d.title}</b><time>—</time></div><p class="sdetail">Ждёт заявку</p></div>
      <span class="status" aria-hidden="true"></span>
    </article>`).join('');
  const stepEls = [...rightCol.children];

  /* SVG-связи */
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = `<defs><radialGradient id="ball" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f3fbd0"/><stop offset="0.6" stop-color="#cfe97c"/><stop offset="1" stop-color="#a9cb4a"/></radialGradient></defs>`;
  const mk = (tag, cls) => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); svg.appendChild(e); return e; };
  const bases = [], acts = [], dots = [], ends = [];
  for (let i = 0; i < 5; i++) { bases.push(mk('path', 'c-base')); acts.push(mk('path', 'c-act')); ends.push(mk('circle', 'c-end')); }
  const ball = mk('circle', 'c-ball');
  ball.setAttribute('r', 15); ball.setAttribute('fill', 'url(#ball)');
  for (let i = 0; i < 5; i++) { const d = mk('circle', 'c-dot'); d.setAttribute('r', 5); dots.push(d); }

  const edge = (el) => ({ l: el.offsetLeft, r: el.offsetLeft + el.offsetWidth, y: el.offsetTop + el.offsetHeight / 2 });
  const curve = (x1, y1, x2, y2) => { const dx = (x2 - x1) * 0.5; return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`; };
  function layoutFlow() {
    if (narrow.matches) return;
    const W = flow.offsetWidth, H = flow.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const a = edge(inCard), m = edge(midCard);
    const paths = [[a.r, a.y, m.l, m.y]];
    stepEls.forEach((el) => { const s = edge(el); paths.push([m.r, m.y, s.l, s.y]); });
    paths.forEach(([x1, y1, x2, y2], i) => {
      const d = curve(x1, y1, x2, y2);
      bases[i].setAttribute('d', d); acts[i].setAttribute('d', d);
      ends[i].setAttribute('cx', x2); ends[i].setAttribute('cy', y2); ends[i].setAttribute('r', 5);
      if (acts[i].dataset.on) { const len = acts[i].getTotalLength(); acts[i].style.strokeDasharray = len; acts[i].style.strokeDashoffset = 0; }
    });
    ball.setAttribute('cx', a.r); ball.setAttribute('cy', a.y);
    probe.style.left = Math.max(0, (a.r + m.l) / 2 - probe.offsetWidth / 2 - 6) + 'px';
    probe.style.top = (a.y - 64) + 'px';
  }
  if (window.ResizeObserver) new ResizeObserver(layoutFlow).observe(flow);
  window.addEventListener('resize', layoutFlow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutFlow);

  function drawPath(i, ms) {
    const p = acts[i], dot = dots[i];
    if (narrow.matches) return Promise.resolve();
    const len = p.getTotalLength();
    p.dataset.on = '1';
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.style.opacity = 1;
    dot.style.opacity = 1;
    return tween(ms, (v) => {
      const e = reduceMotion ? 1 : easeInOut(v);
      p.style.strokeDashoffset = len * (1 - e);
      const pt = p.getPointAtLength(len * e);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    }).then(() => { dot.style.opacity = 0; });
  }

  /* примеры */
  PRESETS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = p.label;
    b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', () => {
      presetsEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      textEl.value = p.text; setChannel(p.channel); reset();
    });
    presetsEl.appendChild(b);
  });
  textEl.value = PRESETS[0].text; setChannel(PRESETS[0].channel);
  textEl.addEventListener('input', () => {
    presetsEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    if (channel !== 'Сайт') setChannel('Сайт');
  });

  /* состояния */
  const setStatus = (el, state) => {
    el.classList.toggle('is-active', state === 'active');
    el.classList.toggle('is-done', state === 'done');
    el.classList.toggle('is-skip', state === 'skip');
    const st = el.querySelector('.status');
    if (st) st.innerHTML = state === 'done' ? ico('check') : state === 'skip' ? ico('dash') : '';
  };
  let runId = 0;
  function reset() {
    runId++;
    inCard.classList.remove('sent');
    probe.hidden = true;
    setStatus(midCard, 'idle'); t1.textContent = '—';
    tagsEl.innerHTML = '<li class="tags-empty">Ждёт заявку</li>';
    stepEls.forEach((el) => { setStatus(el, 'idle'); el.querySelector('time').textContent = '—'; el.querySelector('.sdetail').textContent = 'Ждёт заявку'; });
    acts.forEach((p, i) => { p.style.opacity = 0; p.dataset.on = ''; dots[i].style.opacity = 0; });
    done.classList.remove('is-done');
    doneTitle.textContent = 'Ждём заявку';
    doneSub.textContent = 'Нажмите «Отдать агенту», и схема оживёт.';
    doneType.innerHTML = '—'; doneChan.innerHTML = '—';
    runBtn.disabled = false;
  }
  reset();

  async function run() {
    const text = textEl.value.trim();
    if (!text) { textEl.focus(); return; }
    reset();
    const my = ++runId;
    const alive = () => my === runId;
    runBtn.disabled = true;
    layoutFlow();
    const a = analyze(text), P = buildPlan(a, channel);
    const t0 = performance.now();
    const waitUntil = (ts) => sleep(Math.max(0, ts - performance.now()));

    // шаг 1: понимает запрос
    inCard.classList.add('sent');
    tagsEl.innerHTML = '';
    probe.hidden = false;
    if (!reduceMotion) animate(probe, { opacity: [0, 1], y: [6, 0] }, { duration: 0.3 });
    setStatus(midCard, 'active');
    const s1 = performance.now();
    const draw1 = drawPath(0, 700);
    await sleep(420); if (!alive()) return;
    for (const tg of P.tags) {
      const li = document.createElement('li');
      li.className = 'tag ' + (tg.tone || '');
      li.innerHTML = `<span class="tico">${ico(tg.ico)}</span>${esc(tg.txt)}`;
      tagsEl.appendChild(li);
      if (!reduceMotion) animate(li, { opacity: [0, 1], scale: [0.85, 1], y: [8, 0] }, { type: 'spring', stiffness: 320, damping: 22 });
      await sleep(140); if (!alive()) return;
    }
    await draw1; await waitUntil(s1 + 1200); if (!alive()) return;
    probe.hidden = true;
    t1.textContent = fmtSec(1200);
    setStatus(midCard, 'done');

    // шаги 2–5
    let actions = 1;
    for (let k = 0; k < 4; k++) {
      const el = stepEls[k], st = P.steps[k], detail = el.querySelector('.sdetail');
      const s = performance.now();
      setStatus(el, 'active');
      const draw = drawPath(k + 1, 450);
      if (k === 0) {
        detail.textContent = '';
        await tween(st.ms * 0.85, (v) => { detail.textContent = P.reply.slice(0, Math.floor(v * P.reply.length)); });
      } else {
        detail.textContent = st.detail;
        if (!reduceMotion) animate(detail, { opacity: [0, 1], x: [-8, 0] }, { duration: 0.35 });
      }
      await draw; await waitUntil(s + st.ms); if (!alive()) return;
      el.querySelector('time').textContent = fmtSec(st.ms);
      if (st.skip && k > 0) setStatus(el, 'skip'); else { setStatus(el, 'done'); actions++; }
    }
    if (a.type === 'spam') actions = 2;

    // итог
    const total = performance.now() - t0;
    done.classList.add('is-done');
    doneTitle.textContent = 'Готово!';
    doneSub.textContent = `Агент выполнил ${actions} ${actions === 1 ? 'действие' : actions < 5 ? 'действия' : 'действий'} за ${fmtSec(total).replace(' с', '')} секунды.`;
    doneType.innerHTML = `<span class="tico ${P.type.tone}">${ico(P.type.ico)}</span>${P.type.name}`;
    doneChan.innerHTML = `${chanBadge(channel)}${esc(channel)}`;
    if (!reduceMotion) animate(done, { scale: [0.97, 1] }, { type: 'spring', stiffness: 260, damping: 20 });
    runBtn.disabled = false;
  }
  runBtn.addEventListener('click', run);
  layoutFlow();
}
