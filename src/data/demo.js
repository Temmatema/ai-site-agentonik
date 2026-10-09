export const PRESETS = [
  { label: 'Горячий лид', channel: 'Telegram', text: 'Здравствуйте! Нужен ИИ-ассистент для отдела продаж, бюджет около 300 тыс. Можно демо на этой неделе? Мой номер +7 913 555-12-34' },
  { label: 'Вопрос о цене', channel: 'Сайт', text: 'Добрый день, сколько стоит чат-бот, который отвечает на вопросы клиентов?' },
  { label: 'Жалоба', channel: 'WhatsApp', text: 'Третий день не могу получить счёт, никто не отвечает! Это безобразие, верните деньги.' },
  { label: 'Спам', channel: 'Почта', text: 'Выиграйте iPhone! Переходите по ссылке http://bit.ly/win и получите бонус в казино.' },
];

export const CHANNELS = {
  Telegram: { cls: 'tg', ico: 'tgPlane', notify: 'Slack' },
  WhatsApp: { cls: 'wa', ico: 'chat', notify: 'Slack' },
  Сайт: { cls: 'web', ico: 'globe', notify: 'Slack' },
  Почта: { cls: 'mail', ico: 'mail', notify: 'Slack' },
};

export const TYPES = {
  hot: { name: 'Горячий лид', ico: 'fireFill', tone: 'hot', dept: 'Продажи', deptIco: 'target' },
  price: { name: 'Вопрос о цене', ico: 'tag', tone: '', dept: 'Продажи', deptIco: 'target' },
  complaint: { name: 'Жалоба', ico: 'alert', tone: 'hot', dept: 'Поддержка', deptIco: 'users' },
  spam: { name: 'Спам', ico: 'alert', tone: 'mute', dept: 'Фильтр', deptIco: 'users' },
  question: { name: 'Общий вопрос', ico: 'chat', tone: '', dept: 'Поддержка', deptIco: 'users' },
};

export const REPLIES = {
  hot: (x) => `${x.hello}Спасибо, что написали! Задача понятна${x.budget ? `, бюджет ${x.budget} нам подходит` : ''}. Предлагаю короткое демо на 30 минут: покажем, как агент разбирает ваши заявки. ${x.phone ? 'Менеджер позвонит вам сегодня.' : 'Подскажите телефон или удобное время для связи.'}`,
  price: (x) => `${x.hello}Стоимость зависит от числа каналов и объёма заявок. Подскажите, сколько обращений в день вы получаете, и я пришлю точный расчёт.`,
  complaint: (x) => `${x.hello}Приношу извинения за ожидание, это недопустимо. Я передал ваше обращение руководителю поддержки с пометкой «срочно», счёт будет у вас в течение часа.`,
  spam: () => 'Ответ не требуется. Сообщение помечено как спам и скрыто.',
  question: (x) => `${x.hello}Спасибо за вопрос! Нашёл ответ в базе знаний и отправил его вам. Если останутся вопросы, напишите сюда, я на связи круглосуточно.`,
};

export function analyze(text) {
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


export const STEP_DEFS = [
  { icon: 'chat', title: '2. Готовит ответ' },
  { icon: 'database', title: '3. Создаёт запись в CRM' },
  { icon: 'send', title: '4. Отправляет ответ клиенту' },
  { icon: 'bell', title: '5. Уведомляет команду' },
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmtSec = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' с';
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function tween(ms, fn) {
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
export function buildPlan(a, channel) {
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
