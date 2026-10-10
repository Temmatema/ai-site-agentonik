// Калькулятор выгоды: три ползунка и оценка экономии на зелёной плоскости. Кнопка переносит
// введённые цифры в форму заявки. Расчёт оценочный, допущение вынесено в SHARE.
import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { SHARE, WORKDAY, num, plural } from '../data/calc.js';
import { useTask } from '../task.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';

// Фон-чертёж: тусклая сетка, которая отзывается на мышь. Вокруг курсора она проявляется ярче (пятно идёт за ним
// с небольшим отставанием), а клетка, над которой он стоит, подсвечивается. Шаг и сдвиг сетки — как в .tgrid в стилях
const CELL = 240, SHIFT = 90;
function GridBg() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current, host = el.parentElement;
    if (!matchMedia('(hover: hover)').matches) return undefined;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0, first = true;
    const tick = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      el.style.setProperty('--mx', `${x.toFixed(1)}px`); el.style.setProperty('--my', `${y.toFixed(1)}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.4 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (first || calm) { x = tx; y = ty; first = false; }
      el.style.setProperty('--cx', `${Math.floor((tx - SHIFT) / CELL) * CELL + SHIFT}px`);
      el.style.setProperty('--cy', `${Math.floor((ty - SHIFT) / CELL) * CELL + SHIFT}px`);
      el.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const leave = () => { el.classList.remove('is-on'); first = true; };
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  }, []);
  return <div className="tgrid" ref={ref} aria-hidden="true"><i className="tgrid-lit" /><i className="tgrid-cell" /></div>;
}

function Range({ id, label, value, out, min, max, step, onChange }) {
  return (
    <label className="roi-f" htmlFor={id}>
      <span className="roi-top">{label}<output htmlFor={id}>{out}</output></span>
      <input type="range" id={id} min={min} max={max} step={step} value={value} style={{ '--p': ((value - min) / (max - min)) * 100 + '%' }} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

export default function Calc() {
  const calm = useReducedMotion();
  const { prefill } = useTask();
  const [L, setL] = useState(250), [M, setM] = useState(12), [R, setR] = useState(600);
  const h = (L * M / 60) * SHARE, rub = h * R, d = Math.round(h / WORKDAY);
  const money = useRef(null), shown = useRef(rub);

  // сумма плавно «докручивается» до нового значения
  useEffect(() => {
    const put = (v) => { shown.current = v; if (money.current) money.current.textContent = num(v) + ' ₽'; };
    if (calm) { put(rub); return undefined; }
    const a = animate(shown.current, rub, { duration: 0.45, ease: 'easeOut', onUpdate: put });
    return () => a.stop();
  }, [rub, calm]);

  return (
    <section className="section roi has-glow" id="calc">
      <GridBg />
      <div className="wrap roi-grid">
        <div className="roi-left">
          <Title>Сколько времени агент <em>вернёт команде</em></Title>
          <div className="roi-fields">
            <Range id="roiLeads" label="Заявок в месяц" value={L} out={num(L)} min={50} max={3000} step={50} onChange={setL} />
            <Range id="roiMin" label="Минут менеджера на одну заявку" value={M} out={`${M} мин`} min={2} max={30} step={1} onChange={setM} />
            <Range id="roiRate" label="Стоимость часа сотрудника" value={R} out={`${num(R)} ₽`} min={200} max={2000} step={50} onChange={setR} />
          </div>
        </div>
        <div className="roi-out" aria-live="polite">
          <span className="cap">Экономия в месяц</span>
          <div className="roi-money" ref={money}>{num(rub)} ₽</div>
          <dl className="roi-row">
            <div><dt>{num(h)} ч</dt><dd>времени команды</dd></div>
            <div><dt>{num(d)}</dt><dd>{plural(d, 'рабочий день', 'рабочих дня', 'рабочих дней')}</dd></div>
          </dl>
          <a className="btn btn-ink" href="#contact"
            onClick={() => prefill(`Хочу расчёт для своей компании: ${num(L)} заявок в месяц, ${M} мин на заявку, час сотрудника ${num(R)} ₽. По калькулятору экономия около ${num(h)} ч и ${num(rub)} ₽ в месяц.`)}>
            Получить расчёт для моей компании <Icon name="arrowUR" />
          </a>
          <p className="mini">Оценка: считаем, что агент берёт на себя 70% времени на обработку заявок. Точные цифры зависят от ваших процессов.</p>
        </div>
      </div>
    </section>
  );
}
