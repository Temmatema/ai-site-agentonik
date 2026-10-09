// Блок «Вопросы»: FAQ в виде чата с агентом. Клик по вопросу слева или свой вопрос в поле
// добавляет реплику посетителя, агент «печатает» ответ. Вопрос, на который нет готового
// ответа, агент предлагает передать команде: текст подставляется в форму заявки.
// Ответы собраны из шаблонов прямо в браузере, без обращения к серверу.
import { animate } from 'motion';
import { prefillTask } from './contact.js';

// q: вопрос, re: по каким словам узнаём его в свободном вводе, a: ответ, cta: кнопка под ответом
const FAQ = [
  { q: 'А если агент ответит клиенту неправильно?', re: /ошиб|неправильн|не так|соврет|соврёт|глуп|галлюц/i,
    a: 'Агент отвечает только по вашим материалам: прайсу, базе знаний и скриптам. Если вопрос выходит за их рамки или он не уверен в ответе, диалог уходит менеджеру вместе с историей переписки.' },
  { q: 'С какими каналами и CRM он работает?', re: /канал|crm|црм|битрикс|amo|амо|telegram|телеграм|whatsapp|ватсап|авито|почт|интеграц|1с/i,
    a: 'Подключаем агента туда, где вам уже пишут клиенты: Telegram, WhatsApp, почта, чат на сайте, Авито. Записи он заводит в вашей CRM. Напишите, чем пользуетесь, и мы скажем, как это будет устроено у вас.' },
  { q: 'Сколько это стоит?', re: /стои|цен|прайс|тариф|бюджет|дорог|сколько.*(руб|₽)/i,
    a: 'Стоимость зависит от числа каналов и сценариев, которые берёт на себя агент. Прикиньте экономию в калькуляторе выше, а точную цену назовём после короткого разбора ваших процессов.',
    cta: { text: 'Открыть калькулятор', href: '#calc' } },
  { q: 'Как быстро можно запустить?', re: /срок|быстро|долго|запус|внедр|когда|сколько времени/i,
    a: 'Начинаем с одного сценария, например с ответов на входящие заявки, и запускаем его на части обращений. Когда он работает стабильно, подключаем остальные каналы. Сроки зависят от того, сколько у вас сценариев и готовы ли материалы.' },
  { q: 'Можно ли передать диалог человеку?', re: /человек|менеджер|оператор|живо|передать|перевести/i,
    a: 'Да. Агент сам зовёт менеджера, когда клиент просит человека, когда вопрос нестандартный или когда лид горячий. Менеджер получает уведомление и видит всю переписку.' },
  { q: 'Что будет с данными наших клиентов?', re: /данны|безопас|конфиденц|утечк|персональн|хран/i,
    a: 'Агент видит только то, к чему вы сами дали доступ. Где хранятся переписки и кто может их читать, фиксируем в договоре до запуска.' },
  { q: 'Нужен ли программист с нашей стороны?', re: /программист|разработчик|айти|it-|техническ|сами настро/i,
    a: 'Нет. Подключение и настройку делаем мы. От вас нужны доступы к каналам и CRM и материалы, по которым агент будет отвечать.' },
];
const HELLO = 'Здравствуйте! Отвечу на частые вопросы о внедрении. Выберите вопрос слева или напишите свой.';
const NEXT = 'Если хотите, разберём вашу ситуацию: покажем, что агент возьмёт на себя именно у вас.';
const UNKNOWN = 'На такой вопрос лучше ответит человек из команды. Передать его? Вопрос уже будет в заявке, останется оставить контакт.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function initFaq() {
  const list = document.getElementById('faqList'), box = document.getElementById('faqMsgs'), form = document.getElementById('faqForm');
  if (!list || !box || !form) return;
  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const input = form.elements.q;
  let busy = false, answered = 0, offered = false;

  const down = () => { box.scrollTop = box.scrollHeight; };
  function bubble(who, text = '') {
    const el = document.createElement('div');
    el.className = 'faq-msg faq-from-' + who;
    el.textContent = text;
    box.appendChild(el);
    if (!calm) animate(el, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, ease: 'easeOut' });
    down();
    return el;
  }
  function addCta(el, cta) {
    const a = document.createElement('a');
    a.className = 'faq-cta'; a.href = cta.href; a.textContent = cta.text + ' →';
    if (cta.onClick) a.addEventListener('click', cta.onClick);
    el.appendChild(a);
    down();
  }
  // агент «думает», потом печатает ответ по буквам
  async function say(text, cta) {
    const el = bubble('bot');
    if (!calm) {
      el.innerHTML = '<span class="faq-dots"><i></i><i></i><i></i></span>';
      await sleep(650);
      el.textContent = '';
      for (let i = 0; i < text.length; i += 3) { el.textContent = text.slice(0, i + 3); down(); await sleep(16); }
    }
    el.textContent = text;
    if (cta) addCta(el, cta);
    down();
  }

  async function ask(text, item) {
    if (busy) return;
    busy = true; form.classList.add('is-busy');
    bubble('user', text);
    const found = item || FAQ.find((f) => f.re.test(text));
    if (found) {
      const btn = list.querySelector(`[data-i="${FAQ.indexOf(found)}"]`);
      if (btn) btn.classList.add('is-asked');
      await say(found.a, found.cta);
      answered++;
      if (answered >= 2 && !offered) {
        offered = true;
        await sleep(calm ? 0 : 500);
        await say(NEXT, { text: 'Оставить заявку', href: '#contact' });
      }
    } else {
      await say(UNKNOWN, { text: 'Передать вопрос команде', href: '#contact', onClick: () => prefillTask('Вопрос с сайта: ' + text) });
    }
    busy = false; form.classList.remove('is-busy');
  }

  FAQ.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'faq-q'; b.dataset.i = i;
    b.innerHTML = '<span></span><i aria-hidden="true">→</i>';
    b.firstElementChild.textContent = f.q;
    b.addEventListener('click', () => ask(f.q, f));
    list.appendChild(b);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    ask(text);
  });

  bubble('bot', HELLO);
}
