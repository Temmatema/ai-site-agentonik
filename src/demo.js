import { animate } from 'motion';

// Демо «агент разбирает заявку»: всё считается в браузере по простым правилам,
// чтобы показать логику работы. Настоящий агент подключается к CRM, прайсу и каналам.

const PRESETS = [
  { label: 'Горячий лид', channel: 'Telegram', text: 'Здравствуйте! Нужен ИИ-ассистент для отдела продаж, бюджет около 300 тыс. Можно демо на этой неделе? Мой номер +7 913 555-12-34' },
  { label: 'Вопрос о цене', channel: 'Сайт', text: 'Добрый день, сколько стоит чат-бот, который отвечает на вопросы клиентов?' },
  { label: 'Жалоба', channel: 'WhatsApp', text: 'Третий день не могу получить счёт, никто не отвечает! Это безобразие, верните деньги.' },
  { label: 'Спам', channel: 'Почта', text: 'Выиграйте iPhone! Переходите по ссылке http://bit.ly/win и получите бонус в казино.' },
];

const TYPES = {
  hot: { name: 'Горячий лид', cls: 'hot', route: 'Менеджер по продажам', prio: 'Высокий', kb: 'Сценарий «Демо за 30 минут»' },
  price: { name: 'Вопрос о цене', cls: '', route: 'Агент закрывает сам', prio: 'Средний', kb: 'Прайс, раздел «Чат-боты»' },
  complaint: { name: 'Жалоба', cls: 'hot', route: 'Руководитель поддержки', prio: 'Срочный', kb: 'Регламент возвратов и счетов' },
  spam: { name: 'Спам', cls: 'mute', route: 'Не требует ответа', prio: 'Нет', kb: 'Список спам-признаков' },
  question: { name: 'Общий вопрос', cls: '', route: 'Агент закрывает сам', prio: 'Низкий', kb: 'База знаний, раздел «Частые вопросы»' },
};

const REPLIES = {
  hot: (x) => `${x.hello}Спасибо, что написали! Задача понятна${x.budget ? `, бюджет ${x.budget} нам подходит` : ''}. Предлагаю короткое демо на 30 минут: покажем, как агент разбирает ваши заявки. ${x.phone ? 'Менеджер позвонит вам сегодня.' : 'Подскажите телефон или удобное время для связи.'}`,
  price: (x) => `${x.hello}Стоимость зависит от каналов и объёма заявок: простой агент для ответов стартует от 49 000 ₽ в месяц. Подскажите, сколько обращений в день вы получаете, и я пришлю точный расчёт.`,
  complaint: (x) => `${x.hello}Приношу извинения за ожидание, это недопустимо. Я передал ваше обращение руководителю поддержки с пометкой «срочно», счёт будет у вас в течение часа. Мы вернёмся с ответом лично.`,
  spam: () => 'Ответ не требуется. Сообщение помечено как спам и скрыто, менеджеры его не увидят.',
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
  let type = 'question', conf = 0.72;
  if (has('http', 'выиграй', 'казино', 'бонус', 'заработ') || (text.match(/!/g) || []).length > 3) { type = 'spam'; conf = 0.97; }
  else if (has('безобраз', 'жалоб', 'верните', 'не работает', 'ужас', 'обман', 'никто не отвечает')) { type = 'complaint'; conf = 0.94; }
  else if (has('нужен', 'нужна', 'хочу', 'заказать', 'купить', 'демо', 'интересует', 'бюджет', 'подключить') || phone) { type = 'hot'; conf = budget || phone ? 0.95 : 0.84; }
  else if (has('сколько стоит', 'цена', 'стоимость', 'прайс', 'тариф', 'почём')) { type = 'price'; conf = 0.91; }

  return { type, conf, phone, budget, name, hello: name ? `${name}, здравствуйте! ` : 'Здравствуйте! ' };
}

const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initDemo() {
  const $ = (id) => document.getElementById(id);
  const presetsEl = $('demoPresets'), textEl = $('demoText'), runBtn = $('demoRun'), chanEl = $('demoChannel');
  const stepsEl = $('demoSteps'), replyBox = $('demoReply'), replyText = $('demoReplyText');
  const crmBox = $('demoCrm'), crmList = $('demoCrmList'), verdict = $('demoVerdict'), timerEl = $('demoTimer');
  if (!presetsEl) return;

  let channel = PRESETS[0].channel;
  const setChannel = (c) => { channel = c; chanEl.textContent = 'Канал: ' + c; };

  PRESETS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = p.label;
    b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', () => {
      presetsEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      textEl.value = p.text; setChannel(p.channel);
      reset();
    });
    presetsEl.appendChild(b);
  });
  textEl.value = PRESETS[0].text; setChannel(PRESETS[0].channel);
  textEl.addEventListener('input', () => {
    presetsEl.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    setChannel('сайт');
  });

  const STEP_NAMES = ['Прочитал сообщение', 'Определил тип и срочность', 'Нашёл ответ в базе знаний', 'Написал ответ клиенту', 'Занёс в CRM и уведомил команду'];
  function buildSteps() {
    stepsEl.innerHTML = STEP_NAMES.map((n, i) => `<li class="step"><span class="step-ico">${i + 1}</span><div><div class="step-name">${n}</div><p class="step-detail"></p></div></li>`).join('');
  }
  const stepEl = (i) => stepsEl.children[i];
  const setStep = (i, state, detail) => {
    const el = stepEl(i);
    el.classList.toggle('active', state === 'active');
    el.classList.toggle('done', state === 'done');
    if (state === 'done') el.querySelector('.step-ico').textContent = '✓';
    if (state !== 'idle' && !reduceMotion) animate(el.querySelector('.step-ico'), { scale: [0.7, 1.25, 1] }, { duration: 0.45, ease: 'easeOut' });
    if (state === 'done' && detail && !reduceMotion) animate(el.querySelector('.step-detail'), { opacity: [0, 1], x: [-8, 0] }, { duration: 0.4 });
    if (detail != null) el.querySelector('.step-detail').innerHTML = detail;
  };

  let timerId = 0, runId = 0;
  function reset() {
    runId++; clearInterval(timerId);
    buildSteps();
    replyBox.hidden = crmBox.hidden = verdict.hidden = true;
    timerEl.textContent = '0,0 с'; runBtn.disabled = false;
  }
  buildSteps();

  async function run() {
    const text = textEl.value.trim();
    if (!text) { textEl.focus(); return; }
    reset();
    const my = ++runId;
    runBtn.disabled = true;
    const t0 = performance.now();
    timerId = setInterval(() => { timerEl.textContent = ((performance.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' с'; }, 100);
    const alive = () => my === runId;

    const a = analyze(text), T = TYPES[a.type];

    setStep(0, 'active'); await sleep(650); if (!alive()) return;
    const facts = [`канал: ${esc(channel)}`, a.name && `имя: ${esc(a.name)}`, a.phone && `телефон: ${esc(a.phone)}`, a.budget && `бюджет: ${a.budget}`].filter(Boolean);
    setStep(0, 'done', facts.join(' · '));

    setStep(1, 'active'); await sleep(750); if (!alive()) return;
    setStep(1, 'done', `<span class="tag ${T.cls}">${T.name}</span>уверенность ${Math.round(a.conf * 100)}%, приоритет: ${T.prio.toLowerCase()}`);

    setStep(2, 'active'); await sleep(650); if (!alive()) return;
    setStep(2, 'done', a.type === 'spam' ? 'совпало со списком спам-признаков' : `источник: ${T.kb}`);

    setStep(3, 'active');
    const reply = REPLIES[a.type](a);
    replyBox.hidden = false;
    if (!reduceMotion) animate(replyBox, { opacity: [0, 1], y: [12, 0] }, { type: 'spring', stiffness: 260, damping: 22 });
    replyText.textContent = ''; replyText.classList.add('typing');
    for (let i = 0; i < reply.length; i++) {
      replyText.textContent += reply[i];
      if (i % 2 === 0) await sleep(14);
      if (!alive()) return;
    }
    replyText.classList.remove('typing');
    setStep(3, 'done', a.type === 'spam' ? 'отправлять не нужно' : 'отправлено клиенту');

    setStep(4, 'active'); await sleep(600); if (!alive()) return;
    const rows = [['Тип', T.name], ['Приоритет', T.prio], ['Ответственный', T.route]];
    if (a.name) rows.unshift(['Клиент', a.name]);
    if (a.phone) rows.push(['Телефон', a.phone]);
    if (a.budget) rows.push(['Бюджет', a.budget]);
    crmList.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    crmBox.hidden = false;
    if (!reduceMotion) animate(crmBox, { opacity: [0, 1], y: [12, 0] }, { type: 'spring', stiffness: 260, damping: 22 });
    setStep(4, 'done', a.type === 'spam' ? 'сообщение скрыто' : 'карточка создана, менеджер получил уведомление');

    clearInterval(timerId);
    const sec = (performance.now() - t0) / 1000;
    timerEl.textContent = sec.toFixed(1).replace('.', ',') + ' с';
    verdict.hidden = false;
    if (!reduceMotion) animate(verdict, { opacity: [0, 1], scale: [0.96, 1] }, { type: 'spring', stiffness: 300, damping: 20 });
    verdict.innerHTML = `Агент справился за <b>${sec.toFixed(1).replace('.', ',')} сек</b>. Вручную до первого ответа обычно проходят часы <span style="font-weight:400;opacity:.7">(условная оценка)</span>.`;
    runBtn.disabled = false;
  }
  runBtn.addEventListener('click', run);
}
