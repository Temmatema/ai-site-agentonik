// Блок «Контакты»: форма с тремя шагами. Шаги зажигаются по мере заполнения,
// а после отправки третий шаг показывает подобранные решения.
// Форма пока ничего никуда не отправляет (прототип).
import { animate } from 'motion';
import { ico } from './icons.js';

const SOLUTIONS = {
  agents: { ico: 'chat', t: 'ИИ-агент для заявок', d: 'Отвечает клиентам в Telegram, на сайте и Авито, определяет тип обращения и заводит запись в CRM.', re: /авито|заявк|клиент|чат|telegram|телеграм|whatsapp|ватсап|поддержк|обращени|звонк|лид/i },
  reports: { ico: 'database', t: 'Агент для отчётов и CRM', d: 'Собирает данные из таблиц и CRM, готовит сводки по расписанию и напоминает о зависших сделках.', re: /отч[её]т|excel|эксел|таблиц|crm|црм|сводк|остатк|склад|счет|счёт|учет|учёт/i },
  design: { ico: 'image', t: 'ИИ-дизайн', d: 'Карточки товаров, баннеры и презентации в стиле вашего бренда за часы, а не недели.', re: /баннер|дизайн|карточк|макет|презентац|картинк|креатив для/i },
  ads: { ico: 'megaphone', t: 'ИИ-реклама', d: 'Креативы, тексты и A/B-тесты, которые находят самые дешёвые связки.', re: /реклам|таргет|директ|креатив|трафик|лидоген|тест/i },
};
const AUDIT = { ico: 'search', t: 'Разбор процессов', d: 'Короткий созвон: найдём, где команда теряет больше всего времени, и покажем, что автоматизировать первым.' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isContact = (v) => {
  v = v.trim();
  if (/^@[\w]{4,}$/.test(v)) return true;
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return true;
  return v.replace(/\D/g, '').length >= 10;
};
const RULES = {
  name: [(v) => v.trim().length >= 2, 'Подскажите, как к вам обращаться.'],
  contact: [isContact, 'Укажите телефон, @telegram или почту.'],
  task: [(v) => v.trim().length >= 5, 'Напишите пару слов о задаче.'],
};

// Подставляет текст задачи из других блоков (калькулятор, демо). Свой текст посетителя не затираем.
export function prefillTask(text) {
  const form = document.getElementById('ctaForm');
  if (!form) return;
  const task = form.elements.task;
  if (task.value.trim() && !task.dataset.auto) return;
  task.value = text; task.dataset.auto = '1';
  task.dispatchEvent(new Event('input', { bubbles: true }));
}

export function initContact() {
  const form = document.getElementById('ctaForm');
  if (!form) return;
  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const body = document.getElementById('cBody'), result = document.getElementById('cResult');
  const steps = [...document.querySelectorAll('#steps3 li')];

  // иконки, которые лежат в разметке как data-ico
  document.querySelectorAll('#contact [data-ico]').forEach((el) => { el.innerHTML = ico(el.dataset.ico); });

  const val = (n) => form.elements[n].value;
  const ok = (n) => RULES[n][0](val(n));

  function paintSteps(sent) {
    const s1 = ok('name') && ok('contact'), s2 = s1 && ok('task');
    const states = sent ? ['done', 'done', 'done'] : [s1 ? 'done' : 'active', s2 ? 'done' : s1 ? 'active' : 'idle', 'idle'];
    steps.forEach((li, i) => {
      const prev = li.dataset.state;
      li.dataset.state = states[i];
      li.classList.toggle('is-active', states[i] === 'active');
      li.classList.toggle('is-done', states[i] === 'done');
      li.firstElementChild.innerHTML = states[i] === 'done' ? ico('check') : String(i + 1);
      if (!calm && prev && prev !== states[i] && states[i] !== 'idle') animate(li.firstElementChild, { scale: [0.8, 1.15, 1] }, { duration: 0.45 });
    });
  }

  function setError(name, show) {
    const f = form.elements[name].closest('.cfield');
    f.classList.toggle('bad', show);
    const e = f.querySelector('.err');
    e.hidden = !show;
    if (show) e.textContent = RULES[name][1];
  }

  form.addEventListener('input', (e) => {
    const n = e.target.name;
    if (e.isTrusted) delete e.target.dataset.auto; // посетитель правит текст сам
    if (RULES[n] && e.target.closest('.cfield').classList.contains('bad') && ok(n)) setError(n, false);
    paintSteps(false);
  });

  function pickSolutions(text) {
    const found = Object.values(SOLUTIONS).filter((s) => s.re.test(text)).slice(0, 2);
    if (!found.length) found.push(SOLUTIONS.agents);
    return [...found, AUDIT];
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = Object.keys(RULES).filter((n) => !ok(n));
    Object.keys(RULES).forEach((n) => setError(n, bad.includes(n)));
    if (bad.length) { form.elements[bad[0]].focus(); return; }

    const sols = pickSolutions(val('task'));
    result.innerHTML = `
      <h3>Спасибо, ${esc(val('name').trim())}!</h3>
      <p>Вот с чего мы бы начали для вашей задачи:</p>
      ${sols.map((s) => `<div class="c-sol"><span class="sbox">${ico(s.ico)}</span><div><b>${s.t}</b><span>${s.d}</span></div></div>`).join('')}
      <p class="mini">Это прототип: заявка пока никуда не отправляется. Когда форма будет подключена, ответ придёт на указанный контакт.</p>
      <button class="btn btn-ink" type="button" id="cReset">Заполнить заново <span aria-hidden="true">→</span></button>`;
    body.hidden = true;
    result.hidden = false;
    paintSteps(true);
    if (!calm) {
      animate(result, { opacity: [0, 1], y: [16, 0] }, { type: 'spring', stiffness: 170, damping: 20 });
      animate(result.querySelectorAll('.c-sol'), { opacity: [0, 1], x: [-12, 0] }, { duration: 0.4, delay: (i) => 0.15 + i * 0.12 });
    }
    document.getElementById('cReset').addEventListener('click', () => {
      form.reset();
      result.hidden = true; body.hidden = false;
      Object.keys(RULES).forEach((n) => setError(n, false));
      paintSteps(false);
      form.elements.name.focus();
    });
  });

  paintSteps(false);
}
