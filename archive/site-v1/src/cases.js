// Блок «Кейсы»: лента крупных карточек с обложками. Ленту можно тянуть мышью или листать
// стрелками; клик по карточке открывает кейс целиком: задача, что сделали, результат.
// ВАЖНО: кейсы ниже условные, это заготовка формата. Замените CASES на реальные данные.
// Обложка: если у кейса есть поле img (путь к картинке), показывается она, иначе рисованный макет.
import { animate } from 'motion';
import { prefillTask } from './contact.js';

const CASES = [
  {
    tag: 'Интернет-магазин', product: 'ИИ-агент', cover: 'chat', bg: 'linear-gradient(150deg, #e9f9c4, #c9ec7a)',
    title: 'Агент отвечает на заявки вместо менеджеров',
    key: ['−89%', 'потерянных заявок'],
    task: 'Заявки приходили из пяти каналов, менеджеры не успевали отвечать в день обращения, часть клиентов уходила к конкурентам.',
    did: ['Подключили агента к Telegram, почте и чату на сайте', 'Научили определять тип заявки и бюджет', 'Горячих клиентов агент сразу передаёт менеджеру'],
    res: [['Время первого ответа', '3 ч 40 мин', '45 сек'], ['Потерянные заявки', '27%', '3%'], ['Рутина менеджеров в неделю', '58 ч', '14 ч']],
  },
  {
    tag: 'Сеть клиник', product: 'ИИ-агент', cover: 'cal', bg: 'linear-gradient(150deg, #ffe7de, #ffc4b0)',
    title: 'Запись на приём без администратора',
    key: ['64%', 'записей без участия людей'],
    task: 'Вечером и ночью на сообщения никто не отвечал, пациенты записывались в другие клиники. Администраторы тонули в переносах.',
    did: ['Агент записывает на приём круглосуточно', 'Напоминает о визите и сам переносит запись', 'Сложные вопросы передаёт администратору'],
    res: [['Время ответа пациенту', '1 ч 35 мин', '1 мин'], ['Неявки на приём', '18%', '6%'], ['Записей без администратора', '0%', '64%']],
  },
  {
    tag: 'Агентство недвижимости', product: 'ИИ-реклама', cover: 'ads', bg: 'linear-gradient(150deg, #e6e2f6, #c4b9ea)',
    title: 'Реклама, которая находит дешёвые заявки сама',
    key: ['×2,3', 'целевых лидов в месяц'],
    task: 'Бюджет уходил на заявки, которые не доходили до просмотра. Связки тестировали вручную, отчёты собирали по полдня.',
    did: ['Креативы и тексты тестируются десятками', 'Агент квалифицирует лиды до звонка менеджера', 'Отчёт по связкам собирается автоматически'],
    res: [['Цена заявки', '1 850 ₽', '1 120 ₽'], ['Целевых лидов в месяц', '42', '97'], ['Время на отчёты в неделю', '9 ч', '1 ч']],
  },
  {
    tag: 'Производство мебели', product: 'ИИ-дизайн', cover: 'cards', bg: 'linear-gradient(150deg, #f3ecd9, #e2d2a8)',
    title: 'Карточки для маркетплейсов за день вместо недели',
    key: ['×6', 'быстрее выпуск карточек'],
    task: 'Новая коллекция выходила на маркетплейсы с опозданием: дизайнер не успевал готовить карточки под каждую площадку.',
    did: ['Собрали шаблоны в фирменном стиле', 'ИИ готовит варианты под Ozon, WB и Маркет', 'Дизайнер только выбирает и правит лучшее'],
    res: [['Срок выпуска коллекции', '6 дней', '1 день'], ['Карточек в неделю', '20', '120'], ['Кликабельность карточек', '2,1%', '3,4%']],
  },
];

/* рисованные обложки-макеты: стоят на месте будущих скриншотов */
const MOCK = {
  chat: `<div class="mk mk-chat"><span class="mk-b">Здравствуйте! Есть в наличии? Нужно к пятнице</span><span class="mk-b me">Да, есть. Оформить доставку на четверг?</span><span class="mk-toast">Лид создан в CRM</span></div>`,
  cal: `<div class="mk mk-cal"><div class="mk-grid">${'<i></i>'.repeat(15)}</div><span class="mk-toast">Напоминание отправлено</span></div>`,
  ads: `<div class="mk mk-ads"><div class="mk-tiles"><i></i><i class="win"></i><i></i></div><div class="mk-bars"><i style="width:38%"></i><i class="win" style="width:86%"></i><i style="width:52%"></i></div></div>`,
  cards: `<div class="mk mk-cards"><i></i><i></i><i></i><i></i></div>`,
};
const cover = (c) => `<div class="cs-cover" style="background:${c.bg}">${c.img ? `<img src="${c.img}" alt="" loading="lazy" />` : MOCK[c.cover]}</div>`;

export function initCases() {
  const track = document.getElementById('csTrack'), dlg = document.getElementById('csDlg');
  if (!track || !dlg) return;
  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const body = document.getElementById('csDlgBody');

  /* карточки */
  CASES.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cs-card'; b.dataset.i = i;
    b.innerHTML = `${cover(c)}
      <div class="cs-body">
        <div class="cs-tags"><span>${c.tag}</span><span>${c.product}</span></div>
        <h3>${c.title}</h3>
        <div class="cs-key"><b>${c.key[0]}</b><span>${c.key[1]}</span></div>
        <span class="cs-more">Смотреть кейс <i aria-hidden="true">→</i></span>
      </div>`;
    track.appendChild(b);
  });

  /* лента: стрелки и перетаскивание мышью */
  const step = () => (track.firstElementChild.offsetWidth + 22) * (track.offsetWidth > 900 ? 2 : 1);
  document.getElementById('csPrev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: calm ? 'auto' : 'smooth' }));
  document.getElementById('csNext').addEventListener('click', () => track.scrollBy({ left: step(), behavior: calm ? 'auto' : 'smooth' }));
  let drag = null, moved = false;
  track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0) { drag = { x: e.clientX, left: track.scrollLeft }; moved = false; } });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-drag'); }
    if (moved) track.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => { if (drag) { drag = null; track.classList.remove('is-drag'); } });

  /* окно кейса */
  // прокрутку страницы возвращаем сразу при закрытии, не дожидаясь события close
  const shut = () => { if (dlg.open) dlg.close(); document.documentElement.style.overflow = ''; };
  function open(i) {
    const c = CASES[i];
    body.innerHTML = `${cover(c)}
      <div class="cs-d">
        <div class="cs-tags"><span>${c.tag}</span><span>${c.product}</span></div>
        <h3>${c.title}</h3>
        <div class="cs-cols">
          <div><h4>Задача</h4><p>${c.task}</p></div>
          <div><h4>Что сделали</h4><ul>${c.did.map((t) => `<li>${t}</li>`).join('')}</ul></div>
        </div>
        <h4>Результат</h4>
        <div class="cs-res">${c.res.map((r) => `<div><small>${r[0]}</small><span><s>${r[1]}</s><i aria-hidden="true">→</i><b>${r[2]}</b></span></div>`).join('')}</div>
        <div class="cs-foot">
          <a class="btn btn-lime" href="#contact" id="csCta">Хочу так же <span aria-hidden="true">→</span></a>
          <p class="mini">Пример условный и показывает формат. Реальные цифры зависят от вашего бизнеса.</p>
        </div>
      </div>`;
    document.getElementById('csCta').addEventListener('click', () => {
      prefillTask(`Хочу похожий результат, как в кейсе «${c.title}» (${c.tag.toLowerCase()}).`);
      shut();
    });
    dlg.showModal();
    dlg.scrollTop = 0;
    document.documentElement.style.overflow = 'hidden';
    if (!calm) {
      animate(dlg, { opacity: [0, 1], y: [40, 0], scale: [0.96, 1] }, { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] });
      animate(body.querySelectorAll('.cs-res > div'), { opacity: [0, 1], y: [14, 0] }, { duration: 0.4, delay: (k) => 0.25 + k * 0.1 });
    }
  }
  track.addEventListener('click', (e) => {
    if (moved) { moved = false; return; } // это было перетаскивание ленты, а не клик
    const card = e.target.closest('.cs-card');
    if (card) open(Number(card.dataset.i));
  });
  dlg.addEventListener('close', shut);   // закрытие клавишей Esc
  dlg.addEventListener('cancel', shut);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) shut(); }); // клик по затемнению
  document.getElementById('csClose').addEventListener('click', shut);
}
