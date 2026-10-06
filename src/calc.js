// Блок «Калькулятор выгоды»: три ползунка, справа оценка экономии. Кнопка переносит
// введённые цифры в форму заявки. Расчёт оценочный, допущение вынесено в SHARE.
import { animate } from 'motion';
import { prefillTask } from './contact.js';

const SHARE = 0.7;      // какую долю времени на обработку заявок берёт на себя агент
const WORKDAY = 8;      // часов в рабочем дне
const num = (n) => Math.round(n).toLocaleString('ru-RU');
const plural = (n, one, few, many) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };

export function initCalc() {
  const root = document.getElementById('calc');
  if (!root) return;
  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (id) => document.getElementById(id);
  const leads = $('roiLeads'), mins = $('roiMin'), rate = $('roiRate');
  const money = $('roiMoney'), hours = $('roiHours'), days = $('roiDays');

  let shown = 0, anim = null;
  function update(instant) {
    const L = +leads.value, M = +mins.value, R = +rate.value;
    $('roiLeadsOut').textContent = num(L);
    $('roiMinOut').textContent = M + ' мин';
    $('roiRateOut').textContent = num(R) + ' ₽';
    // закрашенная часть дорожки ползунка
    [leads, mins, rate].forEach((el) => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%'));

    const h = (L * M / 60) * SHARE, rub = h * R;
    hours.textContent = num(h) + ' ч';
    const d = Math.round(h / WORKDAY);
    days.textContent = num(d);
    $('roiDaysLbl').textContent = plural(d, 'рабочий день', 'рабочих дня', 'рабочих дней');
    // сумма плавно «докручивается» до нового значения
    if (anim) anim.stop();
    if (instant || calm) { shown = rub; money.textContent = num(rub) + ' ₽'; }
    else anim = animate(shown, rub, { duration: 0.45, ease: 'easeOut', onUpdate: (v) => { shown = v; money.textContent = num(v) + ' ₽'; } });
    return { L, M, R, h, rub };
  }

  [leads, mins, rate].forEach((el) => el.addEventListener('input', () => update(false)));
  update(true);

  $('roiCta').addEventListener('click', () => {
    const v = update(true);
    prefillTask(`Хочу расчёт для своей компании: ${num(v.L)} заявок в месяц, ${v.M} мин на заявку, час сотрудника ${num(v.R)} ₽. По калькулятору экономия около ${num(v.h)} ч и ${num(v.rub)} ₽ в месяц.`);
  });
}
