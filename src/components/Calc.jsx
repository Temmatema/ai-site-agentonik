// Калькулятор выгоды: три ползунка и оценка экономии на зелёной плоскости. Кнопка переносит
// введённые цифры в форму заявки. Расчёт оценочный, допущение вынесено в SHARE.
import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { SHARE, WORKDAY, num, plural } from '../data/calc.js';
import { useTask } from '../task.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';

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
    <section className="section roi" id="calc">
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
