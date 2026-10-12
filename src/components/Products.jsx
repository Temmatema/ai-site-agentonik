// Блок «Продукты»: три карточки в ряд. Открытая — широкая, в ней живая сцена: она проигрывается сама, шаги под ней
// отмечаются по ходу. Две другие узкие: название, цифра и маленький мотив, который оживает под курсором.
// Сцены у продуктов разные: у агентов переписка печатается на глазах, у дизайна макеты проявляются и перекрашиваются
// кнопками стиля, у рекламы связки растут наперегонки и победитель забирает бюджет. Все примеры иллюстративные.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { PRODUCTS } from '../data/products.js';
import { useTask } from '../task.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';
import Glow from './Glow.jsx';

const EASE = [0.2, 0.8, 0.2, 1];
const pop = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: EASE } };
const tag = (i, from = 0.3) => ({ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { delay: from + i * 0.4, duration: 0.3, ease: EASE } });
// сколько миллисекунд длится каждый из четырёх шагов сцены
const TIMES = { agent: [1300, 2100, 3400, 1500], design: [2000, 2400, 2800, 1400], ads: [1500, 3500, 1500, 1700] };
const STYLES = [['Тёплый', 'warm'], ['Строгий', 'strict'], ['Яркий', 'bright']];
const num = (v) => v.toFixed(1).replace('.', ',');

// ход сцены: s растёт от 0 до числа шагов, пока блок на экране. Новый key (другой сценарий, повтор) запускает её заново
function useSteps(times, key, on, calm) {
  const [st, setSt] = useState({ key, s: 0 });
  useEffect(() => {
    if (!on) return undefined;
    if (calm) { setSt({ key, s: times.length }); return undefined; }
    setSt({ key, s: 0 });
    let acc = 0;
    const ids = times.map((ms, i) => setTimeout(() => setSt({ key, s: i + 1 }), (acc += ms)));
    return () => ids.forEach(clearTimeout);
  }, [times, key, on, calm]);
  return st.key === key ? st.s : 0;
}

// текст печатается по буквам; место под него занято сразу, чтобы сцена не прыгала
function Typed({ text, on = true, calm, speed = 24 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    if (calm) { setN(text.length); return undefined; }
    const t = setInterval(() => setN((v) => { if (v >= text.length) clearInterval(t); return Math.min(text.length, v + 1); }), speed);
    return () => clearInterval(t);
  }, [text, on, calm, speed]);
  return <span aria-label={text}><span aria-hidden="true">{text.slice(0, n)}</span><span className="typed-rest" aria-hidden="true">{text.slice(n)}</span></span>;
}

/* агенты: задача пришла, агент разобрался, ответ печатается, запись в CRM обновлена */
function AgentScene({ t, s, calm }) {
  return (
    <div className="sc sc-agent">
      <motion.div className="sc-in" {...pop}>
        <span className="sc-ico"><Icon name={t.ico} /></span>
        <span className="sc-main"><b>{t.title}</b><span>{t.text}</span></span>
        <span className="cap">{t.from} · {t.time}</span>
      </motion.div>
      {s >= 1 && (
        <motion.div className="sc-think" {...pop}>
          {t.finds.map((f, i) => <motion.span key={f} className="sc-tag" {...tag(i)}>{f}</motion.span>)}
        </motion.div>
      )}
      {s >= 2 && <motion.p className="sc-reply" {...pop}><Typed text={t.reply} calm={calm} /></motion.p>}
      {s >= 3 && (
        <motion.div className="sc-out" {...pop}>
          <span className="sc-ok"><Icon name="check" /></span>
          <span className="sc-main"><b>{t.out}</b></span>
          <span className="cap">CRM</span>
        </motion.div>
      )}
    </div>
  );
}

/* дизайн: бриф, шесть макетов проявляются по одному. Стиль и любимый макет посетитель выбирает сам */
function DesignScene({ t, s, on, calm }) {
  const [style, setStyle] = useState('warm');
  const [pick, setPick] = useState(null);
  // если посетитель не выбрал макет сам, к шагу «Файлы» выбор делает сцена
  useEffect(() => { if (s >= 3) setPick((p) => (p === null ? 1 : p)); }, [s]);
  return (
    <div className="sc sc-design" data-style={style}>
      <div className="sc-brief">
        <span className="sc-ico"><Icon name="file" /></span>
        <p><Typed text={t.brief} on={on} calm={calm} speed={20} /></p>
      </div>
      <div className="sc-bar">
        <span className="cap">Стиль</span>
        <div className="chips">
          {STYLES.map(([label, id]) => <button key={id} type="button" className="chip" aria-pressed={style === id} onClick={() => setStyle(id)}>{label}</button>)}
        </div>
      </div>
      <div className="sc-tiles" style={{ '--ratio': t.ratio }}>
        {Array.from({ length: 6 }, (_, i) => (
          <button key={i} type="button" className={`tile v${i}`} data-ready={s >= 1} aria-pressed={pick === i} aria-label={`Макет ${i + 1}`} disabled={s < 1}
            onClick={() => setPick(i)} style={{ '--d': `${i * 0.22}s` }}>
            <span className="tile-art" aria-hidden="true"><i className="obj" /><i className="h" /><i className="l" /><i className="tag" /></span>
            {pick === i && <motion.span className="tile-ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}><Icon name="check" /></motion.span>}
          </button>
        ))}
      </div>
      <div className="sc-files">
        {s < 3 && s >= 1 && pick === null && <motion.span {...pop}>Нажмите на макет, который нравится</motion.span>}
        {s < 3 && pick !== null && <motion.span key="p" {...pop}>Выбран макет {pick + 1}</motion.span>}
        {s >= 3 && t.files.map((f, i) => <motion.span key={f} className="sc-tag" {...tag(i, 0.1)}>{f}</motion.span>)}
      </div>
    </div>
  );
}

// гонка столбиков: каждый растёт к своей цели в своём темпе и с лёгкой болтанкой, как живые цифры теста
function useRace(targets, on, calm, ms = 3200) {
  const [v, setV] = useState(() => targets.map(() => 0));
  useEffect(() => {
    if (!on) return undefined;
    if (calm) { setV(targets); return undefined; }
    let raf = 0;
    const t0 = performance.now(), ph = targets.map(() => Math.random() * 6), pace = targets.map(() => 1.4 + Math.random() * 2.4);
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / ms);
      setV(targets.map((t, i) => t * (1 - (1 - u) ** pace[i]) * (1 + 0.2 * Math.sin(u * 10 + ph[i]) * (1 - u))));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targets, on, calm, ms]);
  return v;
}

/* реклама: три связки идут в тест, одна вырывается вперёд и получает основной бюджет. Победитель каждый раз другой */
function AdsScene({ t, s, calm }) {
  const order = useMemo(() => { const k = Math.floor(Math.random() * 3); return t.vals.map((_, i) => t.vals[(i + k) % 3]); }, [t]);
  const max = Math.max(...order), win = order.indexOf(max), over = s >= 2;
  const live = useRace(order, s >= 1, calm);
  return (
    <div className="sc sc-ads">
      <motion.div className="sc-brief" {...pop}>
        <span className="sc-ico"><Icon name={t.ico} /></span>
        <p>{t.task}</p>
        <span className="cap">{s < 1 ? 'Старт' : over ? t.days : 'Идёт тест'}</span>
      </motion.div>
      <div className="race">
        {order.map((_, i) => (
          <div key={i} className={`race-row${over ? (i === win ? ' win' : ' out') : ''}`}>
            <span>{t.unit} {i + 1}</span>
            <span className="race-bar"><i style={{ transform: `scaleX(${(live[i] / (max * 1.06)).toFixed(4)})` }} /></span>
            <b>CTR {num(live[i])}%</b>
          </div>
        ))}
      </div>
      <div className="budget">
        <span className="cap">Бюджет</span>
        <span className="budget-bar">{order.map((_, i) => <i key={i} className={s >= 3 && i === win ? 'win' : ''} style={{ flexGrow: s >= 3 ? (i === win ? 70 : 15) : 33 }} />)}</span>
        <span className="budget-note">{s >= 3 ? `70% бюджета ушло в ${t.into} ${win + 1}` : 'Поровну, пока идёт тест'}</span>
      </div>
    </div>
  );
}

const SCENES = { agent: AgentScene, design: DesignScene, ads: AdsScene };
// мотив на свёрнутой карточке: реплики, макеты, столбики
const MINI = {
  agent: <span className="mn mn-agent"><i /><i /><i /></span>,
  design: <span className="mn mn-design"><i /><i /><i /><i /></span>,
  ads: <span className="mn mn-ads"><i /><i /><i /></span>,
};

// открытая карточка: сценарии, сцена, шаги и итог
function Full({ p, seen, calm, prefill }) {
  const [tab, setTab] = useState(0), [run, setRun] = useState(0);
  const key = `${tab}-${run}`, t = p.tabs[tab], Scene = SCENES[p.kind];
  const s = useSteps(TIMES[p.kind], key, seen, calm);
  return (
    <>
      <header className="pv-top">
        <div><h3>{p.name}</h3><p>{p.line}</p></div>
        <div className="chips" role="group" aria-label="Сценарий">
          {p.tabs.map((x, i) => <button key={x.label} type="button" className="chip" aria-pressed={i === tab} onClick={() => setTab(i)}>{x.label}</button>)}
        </div>
      </header>
      <div className="pv-scene"><Scene key={key} t={t} s={s} on={seen} calm={calm} /></div>
      <ol className="steps3 pv-steps">
        {p.steps.map((label, i) => <li key={label} className={i < s ? 'is-done' : i === s ? 'is-active' : ''}><span>{i < s ? <Icon name="check" /> : i + 1}</span>{label}</li>)}
      </ol>
      <footer className="pv-foot">
        <p className="pv-res" data-on={s >= p.steps.length}><b>{t.result[0]}</b><span>{t.result[1]}</span></p>
        <button type="button" className="pv-again" aria-label="Показать ещё раз" onClick={() => setRun((v) => v + 1)}><Icon name="replay" /></button>
        <a className="btn btn-line" href={p.cta.href} onClick={() => p.cta.task && prefill(p.cta.task)}>{p.cta.text} <Icon name="arrowUR" /></a>
      </footer>
    </>
  );
}

function Card({ p, open, onOpen, seen, calm, prefill }) {
  const full = useRef(null), asked = useRef(false);
  const id = `pv-${p.kind}`;
  useEffect(() => {
    if (!open || !asked.current || !full.current) return undefined;
    asked.current = false;
    // кнопка, по которой открыли карточку, исчезает: фокус переезжает в раскрытую часть, чтобы не потеряться
    full.current.focus({ preventScroll: true });
    if (!matchMedia('(max-width: 1000px)').matches) return undefined;
    // на телефоне карточки идут столбиком: закрывшаяся сверху утягивает открытую за экран, возвращаем её под взгляд
    const t = setTimeout(() => { if (full.current) full.current.parentElement.scrollIntoView({ block: 'start' }); }, 220);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <article className="pv" data-open={open} data-kind={p.kind}>
      <button type="button" className="pv-face" aria-expanded={open} aria-controls={id} tabIndex={open ? -1 : 0} onClick={() => { asked.current = true; onOpen(); }}>
        <span className="pv-mini" aria-hidden="true">{MINI[p.kind]}</span>
        <span className="pv-name">{p.name}</span>
        <span className="pv-fig"><b>{p.fig[0]}</b><span>{p.fig[1]}</span></span>
        <span className="pv-go">Смотреть<Icon name="arrowUR" /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="pv-full" id={id} ref={full} role="region" aria-label={p.name} tabIndex={-1}
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            <Full p={p} seen={seen} calm={calm} prefill={prefill} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export default function Products() {
  const { prefill } = useTask();
  const calm = useReducedMotion();
  const [cur, setCur] = useState(0);
  const row = useRef(null);
  const seen = useInView(row, { once: true, amount: 0.3 });

  return (
    <section className="section products has-glow" id="products">
      <Glow variant="c" />
      <div className="wrap">
        <div className="prod-head">
          <Title>Три продукта, которые <em>снимают рутину</em></Title>
          <p className="lead">Откройте продукт и посмотрите его в деле.</p>
        </div>

        <div className="pv-row" ref={row}>
          {PRODUCTS.map((p, i) => <Card key={p.kind} p={p} open={cur === i} onOpen={() => setCur(i)} seen={seen} calm={calm} prefill={prefill} />)}
        </div>
        <p className="mini pv-note">Примеры иллюстративные: реальные цифры зависят от вашего бизнеса.</p>
      </div>
    </section>
  );
}
