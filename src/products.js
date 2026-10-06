// Блок «Продукты»: три карточки. По наведению или клику снизу раскрывается панель
// «Как работает» с мини-схемой процесса. Все примеры иллюстративные.
import { animate } from 'motion';
import { ico } from './icons.js';

const chan = (cls, name) => `<span class="chan ${cls}">${ico(name)}</span>`;

/* ---------- данные ---------- */
const PRODUCTS = [
  {
    title: 'Как работают ИИ-агенты',
    sub: 'Пример реальной заявки: посмотрите, как агент обрабатывает сообщение от первого слова до записи в CRM.',
    cta: { text: 'Попробовать на своей заявке', href: '#demo' },
    tabs: [
      {
        label: 'Telegram', ico: 'send',
        nodes: [
          { k: 'msg', chan: ['tg', 'tgPlane'], title: 'Входящая заявка', time: '12:14', text: 'Здравствуйте! Нужен ИИ-ассистент для отдела продаж, бюджет около 300 тыс. Можно демо на этой неделе? Мой номер +7 913 555-12-34' },
          { k: 'list', ico: 'search', title: 'Агент анализирует', items: ['Определяет тип: горячий лид', 'Извлекает бюджет: ≈ 300 000 ₽', 'Находит нужные кейсы', 'Готовит персональный ответ'] },
          { k: 'text', ico: 'send', title: 'Отправляет ответ', badge: 'Готово', text: 'Здравствуйте! Давайте покажем, как наши ИИ-агенты помогают отделу продаж. Подскажите удобное время для демо?' },
          { k: 'list', ico: 'database', title: 'Создаёт запись в CRM', badge: 'Готово', items: ['Новый лид создан', 'Источник: Telegram', 'Тег: Продажи', 'Ответственный: менеджер'] },
        ],
        done: { text: 'Заявка обработана за 7,4 секунды. Агент выполнил 4 действия.', meta: [['Тип заявки', { ico: 'fireFill', tone: 'hot' }, 'Горячий лид'], ['Бюджет', { ico: 'ruble' }, '≈ 300 000 ₽'], ['Канал', { chan: ['tg', 'tgPlane'] }, 'Telegram']] },
      },
      {
        label: 'Почта', ico: 'mail',
        nodes: [
          { k: 'msg', chan: ['mail', 'mail'], title: 'Входящее письмо', time: '09:41', text: 'Добрый день! Пришлите, пожалуйста, коммерческое предложение на чат-бота для интернет-магазина. У нас 12 менеджеров.' },
          { k: 'list', ico: 'search', title: 'Агент анализирует', items: ['Определяет тип: запрос КП', 'Извлекает объём: 12 менеджеров', 'Подбирает тариф «Команда»', 'Собирает КП в PDF'] },
          { k: 'text', ico: 'mail', title: 'Отправляет письмо', badge: 'Готово', text: 'Добрый день! Во вложении коммерческое предложение на чат-бота для вашей команды из 12 менеджеров. Обсудим детали на звонке?' },
          { k: 'list', ico: 'database', title: 'Создаёт запись в CRM', badge: 'Готово', items: ['Сделка создана', 'Источник: почта', 'Тег: КП', 'Ответственный: менеджер'] },
        ],
        done: { text: 'Письмо обработано за 9,1 секунды. Агент выполнил 4 действия.', meta: [['Тип заявки', { ico: 'file' }, 'Запрос КП'], ['Тариф', { ico: 'tag' }, 'Команда'], ['Канал', { chan: ['mail', 'mail'] }, 'Почта']] },
      },
      {
        label: 'Чаты', ico: 'chat',
        nodes: [
          { k: 'msg', chan: ['web', 'globe'], title: 'Сообщение в чате', time: '18:02', text: 'Подскажите, как отследить мой заказ? Номер 48213. Обещали привезти вчера.' },
          { k: 'list', ico: 'search', title: 'Агент анализирует', items: ['Определяет тип: вопрос по заказу', 'Находит заказ №48213', 'Проверяет статус доставки', 'Готовит ответ'] },
          { k: 'text', ico: 'chat', title: 'Отвечает в чате', badge: 'Готово', text: 'Заказ №48213 уже в пути, курьер приедет завтра с 10 до 14. Прислать вам ссылку для отслеживания?' },
          { k: 'list', ico: 'database', title: 'Закрывает обращение', badge: 'Готово', items: ['Обращение закрыто', 'Источник: чат на сайте', 'Тег: доставка', 'Менеджер не понадобился'] },
        ],
        done: { text: 'Обращение закрыто за 3,2 секунды. Агент выполнил 4 действия.', meta: [['Тип заявки', { ico: 'cart' }, 'Вопрос по заказу'], ['Эскалация', { ico: 'check' }, 'Не нужна'], ['Канал', { chan: ['web', 'globe'] }, 'Чат на сайте']] },
      },
      {
        label: 'CRM', ico: 'grid',
        nodes: [
          { k: 'msg', chan: ['web', 'grid'], title: 'Зависшая сделка', time: '10:30', text: 'Сделка №1093 висит 3 дня: клиент не получил счёт и больше не отвечает.' },
          { k: 'list', ico: 'search', title: 'Агент анализирует', items: ['Находит просроченные сделки', 'Проверяет историю общения', 'Определяет причину: нет счёта', 'Готовит напоминание'] },
          { k: 'text', ico: 'send', title: 'Отправляет счёт', badge: 'Готово', text: 'Добрый день! Отправляю счёт №1093 повторно. Если удобнее, пришлю ссылку на оплату.' },
          { k: 'list', ico: 'database', title: 'Обновляет CRM', badge: 'Готово', items: ['Задача закрыта', 'Следующий шаг назначен', 'Тег: счета', 'Ответственный: бухгалтер'] },
        ],
        done: { text: 'Сделка разморожена за 5,6 секунды. Агент выполнил 4 действия.', meta: [['Тип задачи', { ico: 'clock' }, 'Зависла сделка'], ['Сумма', { ico: 'ruble' }, '≈ 85 000 ₽'], ['Источник', { chan: ['web', 'grid'] }, 'CRM']] },
      },
    ],
  },
  {
    title: 'Как работает ИИ-дизайн',
    sub: 'Пример: из короткого брифа получаем набор готовых макетов в стиле вашего бренда.',
    cta: { text: 'Обсудить дизайн', href: '#contact' },
    tabs: [
      {
        label: 'Маркетплейсы', ico: 'cart',
        nodes: [
          { k: 'msg', ico: 'file', title: 'Бриф', time: '5 слайдов', text: 'Карточки для стеклянного чайника. Стиль бренда: тёплый минимализм. Акцент на безопасность стекла и скорость нагрева.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ создаёт варианты', items: ['Подбирает композицию', 'Ставит фирменные цвета и шрифты', 'Генерирует 12 макетов', 'Проверяет читаемость текста'] },
          { k: 'thumbs', ico: 'image', title: 'Показывает варианты', badge: 'Готово', tiles: [['#ffe3d6', '#ffc7b0'], ['#e8f6c4', '#cfe98a'], ['#e9e6dc', '#d3cfc2']], sel: 1 },
          { k: 'list', ico: 'download', title: 'Готовит файлы', badge: 'Готово', items: ['Размеры под Ozon, WB, Маркет', 'Экспорт PNG и PSD', 'Сохраняет в папку бренда'] },
        ],
        done: { text: '12 макетов за 3 минуты. Осталось выбрать лучший вариант.', meta: [['Формат', { ico: 'layers' }, 'Карточки 3:4'], ['Макетов', { ico: 'image' }, '12 шт.'], ['Площадки', { ico: 'cart' }, 'Ozon, WB, Маркет']] },
      },
      {
        label: 'Соцсети', ico: 'share',
        nodes: [
          { k: 'msg', ico: 'file', title: 'Бриф', time: 'Неделя', text: 'Контент-план для кофейни на неделю: 7 постов и 7 сторис в едином стиле, акция на сезонный латте.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ создаёт варианты', items: ['Подбирает визуальный стиль', 'Пишет короткие подписи', 'Генерирует 14 макетов', 'Выстраивает ленту в сетке'] },
          { k: 'thumbs', ico: 'image', title: 'Показывает варианты', badge: 'Готово', tiles: [['#f3e6d6', '#e2c9a6'], ['#ffe3d6', '#ffbfa6'], ['#e8f6c4', '#cfe98a']], sel: 0 },
          { k: 'list', ico: 'download', title: 'Готовит публикации', badge: 'Готово', items: ['Размеры для постов и сторис', 'Экспорт PNG и MP4', 'План публикаций на неделю'] },
        ],
        done: { text: '14 макетов за 4 минуты. Лента выглядит единой.', meta: [['Формат', { ico: 'layers' }, 'Посты и сторис'], ['Макетов', { ico: 'image' }, '14 шт.'], ['Период', { ico: 'clock' }, 'Неделя']] },
      },
      {
        label: 'Баннеры', ico: 'banner',
        nodes: [
          { k: 'msg', ico: 'file', title: 'Бриф', time: 'Кампания', text: 'Баннеры для распродажи электроники: 6 размеров, крупная скидка, фирменные цвета бренда.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ создаёт варианты', items: ['Адаптирует макет под 6 размеров', 'Ставит скидку и цену', 'Подбирает фон и товар', 'Проверяет безопасные зоны'] },
          { k: 'thumbs', ico: 'image', title: 'Показывает варианты', badge: 'Готово', tiles: [['#e9e6dc', '#cfcab9'], ['#ffd9cd', '#ffb59f'], ['#e8f6c4', '#c4e478']], sel: 2 },
          { k: 'list', ico: 'download', title: 'Готовит файлы', badge: 'Готово', items: ['Экспорт JPG и HTML5', 'Названия по шаблону', 'Передача в рекламный кабинет'] },
        ],
        done: { text: '18 баннеров за 5 минут. Все размеры готовы к запуску.', meta: [['Размеров', { ico: 'layers' }, '6 шт.'], ['Баннеров', { ico: 'image' }, '18 шт.'], ['Форматы', { ico: 'download' }, 'JPG, HTML5']] },
      },
      {
        label: 'Презентации', ico: 'slides',
        nodes: [
          { k: 'msg', ico: 'file', title: 'Бриф', time: '12 слайдов', text: 'Презентация для инвесторов: рынок, продукт, команда, финансы. Строгий стиль, акцент на цифры.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ создаёт слайды', items: ['Строит структуру истории', 'Верстает слайды в стиле бренда', 'Рисует графики по цифрам', 'Сокращает тексты'] },
          { k: 'thumbs', ico: 'image', title: 'Показывает слайды', badge: 'Готово', tiles: [['#e4e6ea', '#cfd3da'], ['#e8f6c4', '#cfe98a'], ['#ffe3d6', '#ffc7b0']], sel: 0 },
          { k: 'list', ico: 'download', title: 'Готовит файлы', badge: 'Готово', items: ['Экспорт PPTX и PDF', 'Заметки докладчика', 'Версия для печати'] },
        ],
        done: { text: '12 слайдов за 6 минут. Остались только правки по вкусу.', meta: [['Слайдов', { ico: 'slides' }, '12 шт.'], ['Стиль', { ico: 'layers' }, 'Бренд'], ['Форматы', { ico: 'download' }, 'PPTX, PDF']] },
      },
    ],
  },
  {
    title: 'Как работает ИИ-реклама',
    sub: 'Пример: запускаем десятки связок, находим лучшую и перераспределяем бюджет автоматически.',
    cta: { text: 'Обсудить рекламу', href: '#contact' },
    tabs: [
      {
        label: 'Таргет', ico: 'target',
        nodes: [
          { k: 'msg', ico: 'target', title: 'Задача', time: 'Старт', text: 'Продвигаем онлайн-курс по дизайну. Аудитория 22–35 лет, Москва. Бюджет 80 000 ₽ в месяц.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ готовит креативы', items: ['Пишет 10 заголовков', 'Собирает 6 баннеров', 'Подбирает аудитории', 'Запускает A/B-тест'] },
          { k: 'bars', ico: 'trend', title: 'A/B-тест идёт', badge: '3 дня', rows: [['Связка 1', 'CTR 1,4%', 38], ['Связка 2', 'CTR 1,9%', 52], ['Связка 3', 'CTR 3,1%', 86, true]] },
          { k: 'list', ico: 'check', title: 'Выбирает лучшую', badge: 'Готово', items: ['Связка 3 выигрывает', 'Цена клика −21%', 'Бюджет перераспределён', 'Отчёт ушёл в Telegram'] },
        ],
        done: { text: 'Лучшая связка найдена за 3 дня вместо недель ручных тестов.', meta: [['Цена клика', { ico: 'trend' }, '−21%'], ['Креативов', { ico: 'image' }, '16 шт.'], ['Площадка', { ico: 'target' }, 'Таргет']] },
      },
      {
        label: 'Контекст', ico: 'search',
        nodes: [
          { k: 'msg', ico: 'search', title: 'Задача', time: 'Старт', text: 'Контекстная реклама для магазина кофемашин. Нужны заявки по горячим запросам, цена клика не выше 40 ₽.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ готовит объявления', items: ['Собирает 120 ключевых фраз', 'Пишет 30 объявлений', 'Группирует по намерению', 'Запускает тест'] },
          { k: 'bars', ico: 'trend', title: 'Тест объявлений', badge: '5 дней', rows: [['Группа 1', 'CTR 4,2%', 44], ['Группа 2', 'CTR 5,0%', 58], ['Группа 3', 'CTR 7,8%', 90, true]] },
          { k: 'list', ico: 'check', title: 'Оптимизирует', badge: 'Готово', items: ['Отключает слабые фразы', 'Ставки подстроены под цель', 'Минус-слова добавлены', 'Недельный отчёт готов'] },
        ],
        done: { text: 'Кампания вышла на целевую цену клика за 5 дней.', meta: [['Цена клика', { ico: 'trend' }, '34 ₽'], ['Объявлений', { ico: 'file' }, '30 шт.'], ['Площадка', { ico: 'search' }, 'Контекст']] },
      },
      {
        label: 'Маркетплейсы', ico: 'cart',
        nodes: [
          { k: 'msg', ico: 'cart', title: 'Задача', time: 'Старт', text: 'Поднять продажи чайника на маркетплейсе. Карточка есть, продвижения нет. Бюджет 50 000 ₽.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ готовит продвижение', items: ['Переписывает заголовок и описание', 'Делает 4 обложки для теста', 'Подбирает ставки по запросам', 'Запускает тест обложек'] },
          { k: 'bars', ico: 'trend', title: 'Тест обложек', badge: '4 дня', rows: [['Обложка 1', 'CTR 2,1%', 40], ['Обложка 2', 'CTR 2,6%', 54], ['Обложка 3', 'CTR 4,4%', 88, true]] },
          { k: 'list', ico: 'check', title: 'Фиксирует результат', badge: 'Готово', items: ['Обложка 3 в основе', 'Ставки снижены', 'Позиция в поиске выросла', 'Отчёт отправлен'] },
        ],
        done: { text: 'Новая обложка подняла кликабельность вдвое за 4 дня.', meta: [['Кликабельность', { ico: 'trend' }, '×2'], ['Обложек', { ico: 'image' }, '4 шт.'], ['Площадка', { ico: 'cart' }, 'Маркетплейс']] },
      },
      {
        label: 'Соцсети', ico: 'share',
        nodes: [
          { k: 'msg', ico: 'share', title: 'Задача', time: 'Старт', text: 'Раскрутить сообщество фитнес-студии. Нужны подписчики и записи на пробное занятие.' },
          { k: 'list', ico: 'sparkles', title: 'ИИ готовит контент', items: ['Пишет 20 постов', 'Собирает 10 креативов', 'Находит похожие аудитории', 'Запускает тест'] },
          { k: 'bars', ico: 'trend', title: 'Тест креативов', badge: '4 дня', rows: [['Креатив 1', '18 ₽ за подписчика', 36], ['Креатив 2', '14 ₽ за подписчика', 58], ['Креатив 3', '9 ₽ за подписчика', 90, true]] },
          { k: 'list', ico: 'check', title: 'Масштабирует', badge: 'Готово', items: ['Креатив 3 в основе', 'Бюджет перераспределён', 'Записи на пробное растут', 'Отчёт в Telegram'] },
        ],
        done: { text: 'Подписчик стал вдвое дешевле. Бюджет ушёл в лучший креатив.', meta: [['Цена подписчика', { ico: 'trend' }, '9 ₽'], ['Креативов', { ico: 'image' }, '10 шт.'], ['Площадка', { ico: 'share' }, 'Соцсети']] },
      },
    ],
  },
];

/* ---------- отрисовка ---------- */
const check = '<span class="ck">' + ico('check') + '</span>';

function nodeHTML(n) {
  const icon = n.chan ? chan(n.chan[0], n.chan[1]) : ico(n.ico);
  const head = `<header class="pn-head"><span class="pn-ico">${icon}</span><b>${n.title}</b>${n.time ? `<time>${n.time}</time>` : ''}${n.badge ? `<span class="pn-badge">${n.badge}</span>` : ''}</header>`;
  let body = '';
  if (n.k === 'msg' || n.k === 'text') body = `<p class="pn-bubble">${n.text}</p>`;
  else if (n.k === 'list') body = `<ul class="pn-list">${n.items.map((t) => `<li>${check}<span>${t}</span></li>`).join('')}</ul>`;
  else if (n.k === 'thumbs') body = `<div class="thumbs">${n.tiles.map((t, i) => `<span class="thumb${i === n.sel ? ' sel' : ''}" style="--a:${t[0]};--b:${t[1]}"></span>`).join('')}</div>`;
  else if (n.k === 'bars') body = `<div class="mrow">${n.rows.map((r) => `<div class="${r[3] ? 'win' : ''}"><span>${r[0]}</span><b>${r[1]}</b><span class="mbar"><i style="width:${r[2]}%"></i></span></div>`).join('')}</div>`;
  return `<article class="pnode">${head}${body}</article>`;
}

function metaHTML([label, icon, text]) {
  const i = icon.chan ? chan(icon.chan[0], icon.chan[1]) : `<span class="tico ${icon.tone || ''}">${ico(icon.ico)}</span>`;
  return `<div><small>${label}</small><span>${i}${text}</span></div>`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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

export function initProducts() {
  const cardsEl = document.getElementById('pcards');
  const panel = document.getElementById('ppanel');
  const inner = document.getElementById('ppanelIn');
  const notch = document.getElementById('notch');
  if (!cardsEl || !panel) return;

  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const narrow = matchMedia('(max-width: 1000px)');
  const cards = [...cardsEl.querySelectorAll('.pcard')];
  cards.forEach((c) => { c.querySelector('.pcard-ico').innerHTML = ico(c.querySelector('.pcard-ico').dataset.ico); });

  let cur = 0;
  const tabOf = PRODUCTS.map(() => 0);
  let token = 0, started = false, flow, svg, paths = [], dots = [];

  function render() {
    const P = PRODUCTS[cur], T = P.tabs[tabOf[cur]];
    inner.innerHTML = `
      <div class="ptop">
        <div><h3>${P.title}</h3><p>${P.sub}</p></div>
        <div class="pctrl">
          <div class="ptabs" role="tablist" aria-label="Сценарии" style="display:contents">
            ${P.tabs.map((t, i) => `<button type="button" class="ptab" role="tab" aria-selected="${i === tabOf[cur]}" data-t="${i}">${ico(t.ico)}${t.label}</button>`).join('')}
          </div>
          <div class="pager"><span>${cur + 1} / ${PRODUCTS.length}</span><button type="button" data-d="-1" aria-label="Предыдущий продукт">${ico('arrowL')}</button><button type="button" data-d="1" aria-label="Следующий продукт">${ico('arrowR')}</button></div>
        </div>
      </div>
      <div class="pflow" id="pflow"><svg class="flow-svg pflow-svg" id="pflowSvg" aria-hidden="true"></svg>${T.nodes.map(nodeHTML).join('')}</div>
      <div class="pdone" id="pdone">
        <span class="pdone-ico">${ico('check')}</span>
        <div class="pdone-text"><b>Готово!</b><p>${T.done.text}</p></div>
        <div class="pdone-meta">${T.done.meta.map(metaHTML).join('')}</div>
        <a class="btn btn-lime" href="${P.cta.href}">${P.cta.text} <span aria-hidden="true">→</span></a>
      </div>
      <p class="mini pnote">Примеры иллюстративные: реальные цифры зависят от вашего бизнеса.</p>`;
    flow = document.getElementById('pflow');
    svg = document.getElementById('pflowSvg');
    buildSvg();
    layout();
  }

  /* связи между шагами */
  const NS = 'http://www.w3.org/2000/svg';
  function buildSvg() {
    svg.innerHTML = '';
    paths = []; dots = [];
    const n = flow.querySelectorAll('.pnode').length;
    for (let i = 0; i < n - 1; i++) {
      const mk = (tag, cls) => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); svg.appendChild(e); return e; };
      const base = mk('path', 'c-base'), act = mk('path', 'c-act'), s = mk('circle', 'c-end'), e = mk('circle', 'c-end'), dot = mk('circle', 'c-dot');
      dot.setAttribute('r', 5); s.setAttribute('r', 5); e.setAttribute('r', 5);
      paths.push({ base, act, s, e }); dots.push(dot);
    }
  }
  function layout() {
    if (!flow || narrow.matches) return;
    const W = flow.offsetWidth, H = flow.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const nodes = [...flow.querySelectorAll('.pnode')];
    paths.forEach((p, i) => {
      const a = nodes[i], b = nodes[i + 1];
      const x1 = a.offsetLeft + a.offsetWidth, y1 = a.offsetTop + 40, x2 = b.offsetLeft, y2 = b.offsetTop + 40;
      const dx = (x2 - x1) * 0.5;
      const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
      p.base.setAttribute('d', d); p.act.setAttribute('d', d);
      p.s.setAttribute('cx', x1); p.s.setAttribute('cy', y1);
      p.e.setAttribute('cx', x2); p.e.setAttribute('cy', y2);
      if (p.act.dataset.on) { p.act.style.strokeDasharray = p.act.getTotalLength(); p.act.style.strokeDashoffset = 0; }
    });
  }
  function drawLink(i, ms) {
    if (narrow.matches || !paths[i]) return Promise.resolve();
    const p = paths[i].act, dot = dots[i], len = p.getTotalLength();
    p.dataset.on = '1'; p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.style.opacity = 1; dot.style.opacity = 1;
    return tween(ms, (v) => {
      const e = easeInOut(v);
      p.style.strokeDashoffset = len * (1 - e);
      const pt = p.getPointAtLength(len * e);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    }).then(() => { dot.style.opacity = 0; });
  }

  /* появление схемы по шагам */
  async function play() {
    const my = ++token;
    const nodes = [...flow.querySelectorAll('.pnode')], done = document.getElementById('pdone');
    if (calm) { paths.forEach((p) => { p.act.style.opacity = 1; }); return; }
    nodes.forEach((n) => { n.style.opacity = 0; });
    done.style.opacity = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (my !== token) return;
      animate(nodes[i], { opacity: [0, 1], y: [20, 0] }, { type: 'spring', stiffness: 170, damping: 20 });
      const items = nodes[i].querySelectorAll('.pn-list li, .mrow > div, .thumb');
      items.forEach((li, k) => animate(li, { opacity: [0, 1], x: [-8, 0] }, { duration: 0.35, delay: 0.18 + k * 0.09 }));
      await sleep(320);
      if (i < nodes.length - 1) await drawLink(i, 380);
    }
    if (my !== token) return;
    animate(done, { opacity: [0, 1], y: [14, 0] }, { type: 'spring', stiffness: 160, damping: 20 });
  }

  /* выбор продукта и сценария */
  function placeNotch() {
    if (narrow.matches) return;
    const cr = cards[cur].getBoundingClientRect(), pr = panel.getBoundingClientRect();
    notch.style.left = (cr.left + cr.width / 2 - pr.left) + 'px';
  }
  function swap(withMotion) {
    token++;
    if (withMotion && !calm) animate(inner, { opacity: [0.2, 1], y: [10, 0] }, { duration: 0.35, ease: 'easeOut' });
    render();
    if (started) play();
    panel.setAttribute('aria-labelledby', 'ptab-' + cur);
  }
  function select(i, opts = {}) {
    if (i === cur && !opts.force) return;
    cur = i;
    cards.forEach((c, k) => { c.setAttribute('aria-selected', String(k === i)); c.tabIndex = k === i ? 0 : -1; });
    placeNotch();
    swap(true);
  }

  cards.forEach((c, i) => {
    let timer = 0;
    c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') timer = setTimeout(() => select(i), 130); });
    c.addEventListener('pointerleave', () => clearTimeout(timer));
    c.addEventListener('click', (e) => {
      select(i);
      if (narrow.matches && e.target.closest('.pcard-cta')) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const j = (i + (e.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length;
        select(j); cards[j].focus();
      }
    });
  });

  inner.addEventListener('click', (e) => {
    const tab = e.target.closest('.ptab');
    if (tab) { tabOf[cur] = Number(tab.dataset.t); swap(false); return; }
    const arrow = e.target.closest('.pager button');
    if (arrow) select((cur + Number(arrow.dataset.d) + PRODUCTS.length) % PRODUCTS.length);
  });

  if (window.ResizeObserver) new ResizeObserver(() => { layout(); placeNotch(); }).observe(panel);
  window.addEventListener('resize', () => { layout(); placeNotch(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); placeNotch(); });

  render();
  placeNotch();
  if (!calm) {
    // схема появляется, когда панель попадает в поле зрения
    flow.querySelectorAll('.pnode').forEach((n) => { n.style.opacity = 0; });
    document.getElementById('pdone').style.opacity = 0;
    const kick = () => { if (!started) { started = true; play(); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { kick(); ob.disconnect(); } }, { threshold: 0.3 }).observe(panel);
    }
    setTimeout(kick, 8000);
  }
}
