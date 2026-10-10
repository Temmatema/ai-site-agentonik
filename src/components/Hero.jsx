// Главный экран: красные заявки слева влетают в маскота и вылетают справа обработанными (зелёными).
// В режиме «С агентами» маскот берёт все заявки разом, пачкой; клик по заявке обрабатывает её сразу.
// Вручную всё как в жизни: слева заявки валятся кучей, человек разбирает их по одной и медленно,
// справа сначала пусто, и обработанные заявки появляются по одной. Заголовок справа меняется. Данные условные.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CH, LEADS, VISIBLE, HOURS_PER_LEAD, initials } from '../data/leads.js';
import Icon from './Icon.jsx';
import manTired from '../mascot/man-tired.webp';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NS = 'http://www.w3.org/2000/svg';
const SPRING = { type: 'spring', stiffness: 220, damping: 26 };
const rnd = (a, b) => a + Math.random() * (b - a);
// точки на кадре человека (доли ширины и высоты). Провода уходят ему за спину и выходят из-за ноутбука (MAN_IN, MAN_OUT),
// MAN_FAN — на какую долю высоты кадра они расходятся веером; карточки летят в клавиатуру и из крышки (MAN_KEYS, MAN_LID)
const MAN_IN = [0.38, 0.63], MAN_OUT = [0.62, 0.68], MAN_FAN = 0.34, MAN_KEYS = [0.5, 0.82], MAN_LID = [0.8, 0.66];

function LeadIn({ lead }) {
  const c = CH[lead.ch];
  return (
    <>
      <span className="lead-ch"><Icon name={c.ico} /></span>
      <span className="lead-main">
        <span className="lead-top"><b>{c.name}</b><time>{lead.time}</time><span className="cap lead-chip">{lead.chip}</span></span>
        <span className="lead-text">{lead.text}</span>
      </span>
    </>
  );
}

function LeadOut({ o }) {
  return (
    <>
      <span className="lead-av">{o.org ? <Icon name="grid" /> : initials(o.name)}</span>
      <span className="lead-main">
        <span className="lead-top"><b>{o.name}</b>{o.hot && <span className="lead-hot"><Icon name="fireFill" /></span>}</span>
        <span className="lead-text">{o.sub}</span>
      </span>
      <span className="cap lead-st">{o.st}</span>
    </>
  );
}

export default function Hero() {
  const calm = useReducedMotion();
  const heroRef = useRef(null), archRef = useRef(null), canvasRef = useRef(null), manRef = useRef(null), svgRef = useRef(null), dotsRef = useRef(null);
  const listInRef = useRef(null), listOutRef = useRef(null);
  const els = useRef(new Map()), mascot = useRef(null), uid = useRef(100), nextIdx = useRef(0), doneManual = useRef(0), wireSeeds = useRef([]);
  const S = useRef({ on: true, inbox: [], busy: new Set(), alive: true, visible: true, vis: VISIBLE });

  const [on, setOn] = useState(true);
  const [tried, setTried] = useState(0); // 0 — ещё не трогали, 1 — выключили, 2 — вернули агентов
  const [inbox, setInbox] = useState([]);
  const [out, setOut] = useState([]);
  const [manual, setManual] = useState([]);   // что человек успел обработать вручную: с начала режима список пуст
  const [flights, setFlights] = useState([]);
  const [pile, setPile] = useState([]);   // вручную: заявки, наваленные поверх списка входящих
  const [counts, setCounts] = useState({ in: 37, out: 28, hours: 62 });
  const [live, setLive] = useState('');
  const [load, setLoad] = useState(0);     // доля загруженных кадров маскота
  const [ready, setReady] = useState(false);
  S.current.on = on; S.current.inbox = inbox;

  /* стартовые списки: на телефоне по две карточки, чтобы маскот помещался на экран вместе с ними */
  useEffect(() => {
    const vis = matchMedia('(max-width: 1000px)').matches ? 2 : VISIBLE;
    S.current.vis = vis; nextIdx.current = vis;
    setInbox(LEADS.slice(0, vis).map((lead, i) => ({ id: i + 1, lead })));
    setOut(Array.from({ length: vis }, (_, i) => ({ id: 50 + i, o: LEADS[LEADS.length - 1 - i].out })));
  }, []);

  /* маскот: кадры рисует mascot.js, он же отдаёт точку, куда влетают карточки. Пока кадры грузятся, на его месте индикатор */
  useEffect(() => {
    let dead = false, ctl = null;
    S.current.alive = true;
    import('../mascot.js')
      .then(({ createMascot }) => createMascot(canvasRef.current, heroRef.current, (v) => { if (!dead) setLoad(v); }, manRef.current))
      .then((c) => { if (dead) c.dispose(); else { ctl = c; mascot.current = c; c.setMode(S.current.on); setReady(true); } })
      // без маскота экран всё равно должен работать: снимаем загрузку и запускаем заявки
      .catch((err) => { console.warn('Маскот не загрузился:', err); if (!dead) setReady(true); });
    const io = new IntersectionObserver((en) => { S.current.visible = en[0].isIntersecting; });
    io.observe(heroRef.current);
    return () => { dead = true; S.current.alive = false; io.disconnect(); if (ctl) ctl.dispose(); mascot.current = null; };
  }, []);
  useEffect(() => { if (mascot.current) mascot.current.setMode(on); }, [on]);

  const centre = (el) => {
    const hr = heroRef.current.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2 };
  };
  // точка на кадре человека в координатах hero. Считаем от раскладки, а не от экрана: пока он появляется, его блок сдвинут и сжат
  const manPoint = ([fx, fy]) => {
    const box = manRef.current.parentElement, wr = box.parentElement.getBoundingClientRect(), hr = heroRef.current.getBoundingClientRect();
    return { x: wr.left - hr.left + wr.width / 2 + (fx - 0.5) * box.offsetWidth, y: wr.bottom - hr.top - (1 - fy) * box.offsetHeight };
  };
  // куда влетает заявка и откуда вылетает готовая: у маскота это середина тела, у человека — клавиатура и крышка ноутбука
  const anchor = (side = 'in') => {
    if (!S.current.on && manRef.current) return manPoint(side === 'in' ? MAN_KEYS : MAN_LID);
    if (mascot.current) return mascot.current.anchor();
    const hr = heroRef.current.getBoundingClientRect(), r = archRef.current.getBoundingClientRect();
    return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height * 0.7 };
  };

  /* заявка: красная карточка улетает в маскота, на её место приходит новая, зелёная вылетает справа */
  const process = useCallback(async (id) => {
    const st = S.current;
    const item = st.inbox.find((x) => x.id === id), el = els.current.get(id);
    if (!item || !el || st.busy.has(id)) return;
    st.busy.add(id);
    const fast = st.on, small = matchMedia('(max-width: 1000px)').matches; // с агентами всё в разы быстрее, чем вручную
    const T = !fast ? { in: 1.2, hold: 0, out: 1.2 } : small ? { in: 0.55, hold: 100, out: 0.55 } : { in: 0.45, hold: 80, out: 0.45 };
    const swapIn = () => {
      const lead = LEADS[nextIdx.current++ % LEADS.length];
      setInbox((l) => [...l.filter((x) => x.id !== id), { id: ++uid.current, lead }]);
      setCounts((c) => ({ ...c, in: Math.max(st.on ? st.vis : 0, c.in - 1) }));
    };

    if (!calm) {
      const from = centre(el), a = anchor(), fid = ++uid.current;
      setFlights((f) => [...f, { id: fid, kind: 'in', lead: item.lead, x: from.x, y: from.y, w: el.offsetWidth, dx: a.x - from.x, dy: a.y - from.y, dur: T.in }]);
      swapIn();
      await sleep(T.in * 1000);
      if (!st.alive) return;
      setFlights((f) => f.filter((x) => x.id !== fid));
    } else swapIn();

    if (mascot.current) mascot.current.pulse(fast ? 0.5 : 1);
    setLive(`Заявка обработана: ${item.lead.out.name}`);
    await sleep(calm ? 0 : T.hold);
    if (!st.alive) return;

    if (!calm && listOutRef.current) {
      const a = anchor('out'), box = listOutRef.current, to = centre(box.querySelector('.lead-slot') || box.firstElementChild || box), fid = ++uid.current;
      setFlights((f) => [...f, { id: fid, kind: 'out', o: item.lead.out, x: to.x, y: to.y, w: box.offsetWidth, dx: a.x - to.x, dy: a.y - to.y, dur: T.out }]);
      await sleep(T.out * 1000);
      if (!st.alive) return;
      setFlights((f) => f.filter((x) => x.id !== fid));
    }
    // чья заявка — решает режим, в котором её взяли: то, что агент не донёс до переключения, человеку не засчитываем
    if (fast) setOut((o) => [{ id: ++uid.current, o: item.lead.out }, ...o].slice(0, st.vis));
    else {
      // вручную заявка встаёт в первое пустое место; когда мест не осталось, самая старая уходит и снизу снова пусто
      setManual((m) => [...m, { id: ++uid.current, o: item.lead.out }]);
      setTimeout(() => { if (st.alive) setManual((m) => (m.length >= st.vis ? m.slice(1) : m)); }, 1400);
    }
    if (!fast) doneManual.current += 1;
    setCounts((c) => ({ ...c, out: c.out + 1, hours: fast ? c.hours + HOURS_PER_LEAD : c.hours })); // вручную время команды не экономится
    st.busy.delete(id);
  }, [calm]);

  /* автопилот: с агентами маскот забирает все видимые заявки одной пачкой */
  useEffect(() => {
    if (!on || calm || !ready) return undefined;
    let timer = 0, stop = false;
    const small = matchMedia('(max-width: 1000px)').matches;
    const tick = () => {
      timer = setTimeout(async () => {
        const st = S.current;
        if (st.visible && !document.hidden) {
          const batch = st.inbox.filter((x) => !st.busy.has(x.id));
          await Promise.all(batch.map((x, i) => sleep(i * (small ? 190 : 130)).then(() => !stop && process(x.id))));
        }
        if (!stop) tick();
      }, small ? 750 : 850);
    };
    const first = setTimeout(tick, 500);
    return () => { stop = true; clearTimeout(timer); clearTimeout(first); };
  }, [on, calm, ready, process]);

  /* вручную человек берёт по одной заявке, и то не сразу: следующую — только когда закончил с предыдущей */
  useEffect(() => {
    if (on || calm || !ready) return undefined;
    const take = () => {
      const st = S.current;
      if (!st.visible || document.hidden || st.busy.size) return;
      const free = st.inbox;
      if (free.length) process(free[Math.floor(Math.random() * free.length)].id);
    };
    const first = setTimeout(take, 4000), t = setInterval(take, 10000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [on, calm, ready, process]);

  /* вручную заявки копятся кучей: падают вкривь поверх списка и торчат за края. С агентами куча разом улетает */
  useEffect(() => {
    if (on) { setPile([]); return undefined; }
    const max = S.current.vis < VISIBLE ? 5 : 10;
    const drop = () => setPile((p) => (p.length >= max ? p : [...p, {
      id: ++uid.current, lead: LEADS[Math.floor(Math.random() * LEADS.length)],
      x: rnd(-38, 44), top: rnd(12, 86), r: (Math.random() < 0.5 ? -1 : 1) * rnd(2.5, 8),
    }]));
    const first = [0, 1, 2, 3].map((i) => setTimeout(drop, 200 + i * 150));
    const t = setInterval(() => { if (S.current.visible && !document.hidden) drop(); }, 1800);
    return () => { first.forEach(clearTimeout); clearInterval(t); };
  }, [on]);

  /* новые заявки приходят всегда; вручную очередь растёт заметно быстрее */
  useEffect(() => {
    const t = setInterval(() => {
      if (!S.current.visible || document.hidden) return;
      const add = on ? (Math.random() < 0.35 ? 1 : 0) : 1;
      if (add) setCounts((c) => ({ ...c, in: c.in + add }));
    }, on ? 3200 : 1800);
    return () => clearInterval(t);
  }, [on]);

  const setMode = (next) => {
    if (next === on) return;
    setOn(next);
    if (!next) { setManual([]); doneManual.current = 0; }
    setTried((t) => (next ? (t ? 2 : 0) : Math.max(t, 1)));
    setLive(next ? 'Режим: с агентами. Заявки разбираются автоматически.' : 'Режим: вручную. Заявки копятся.');
  };

  /* провода: от каждой заявки к проёму и от проёма к обработанным, по ним бегут точки.
     Вручную они так же уходят человеку за спину, но от каждой заявки в куче идёт свой провод: клубок и есть хаос.
     Сами провода рисуются один раз и больше не трогаются; точки — отдельные элементы, которые двигает transform.
     Так браузер не перерисовывает каждый кадр весь слой проводов со свечением, и экран не подтормаживает */
  useEffect(() => {
    const svg = svgRef.current, dots = dotsRef.current, hero = heroRef.current;
    let runs = [], raf = 0, timer = 0;
    const seeds = wireSeeds.current;
    const mk = (cls, tag = 'path') => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); svg.appendChild(e); return e; };
    const build = () => {
      svg.replaceChildren(); dots.replaceChildren(); runs = [];
      if (matchMedia('(max-width: 1000px)').matches || !listInRef.current) return;
      const hr = hero.getBoundingClientRect(), ar = archRef.current.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${hr.width} ${hr.height}`);
      const rel = (r) => ({ l: r.left - hr.left, r: r.right - hr.left, y: r.top - hr.top + r.height / 2 });
      const man = !on && manRef.current, mIn = man && manPoint(MAN_IN), mOut = man && manPoint(MAN_OUT);
      const cy = man ? 0 : anchor().y, aL = ar.left - hr.left, aR = ar.right - hr.left;
      // у человека проводов больше (список и куча), поэтому веер общий: шаг между концами не меньше, чем позволяет его спина
      const nIn = listInRef.current.children.length + (man ? pile.length : 0);
      const stepIn = man ? Math.min(22, (manRef.current.parentElement.offsetHeight * MAN_FAN) / Math.max(1, nIn - 1)) : 22;
      const into = (i) => (man ? [mIn.x, mIn.y + (i - (nIn - 1) / 2) * stepIn] : [aL, cy + (i - (nIn - 1) / 2) * 22]);
      const from = (i, n) => (man ? [mOut.x, mOut.y + (i - (n - 1) / 2) * 22] : [aR, cy + (i - (n - 1) / 2) * 22]);
      const wire = (x1, y1, x2, y2, cls) => {
        const dx = (x2 - x1) * 0.5, d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
        // свечение провода — две широкие полупрозрачные линии под ним: выглядит как ореол, а стоит как обычная линия
        mk('hl hl-glow is-wide ' + cls).setAttribute('d', d); mk('hl hl-glow ' + cls).setAttribute('d', d);
        const p = mk('hl ' + cls); p.setAttribute('d', d);
        const c = document.createElement('i'); c.className = 'hl-run ' + cls; dots.appendChild(c);
        // фаза и скорость точки закреплены за номером провода: когда провода перестраиваются, точки не прыгают
        const k = runs.length, seed = seeds[k] || (seeds[k] = { off: Math.random(), speed: 0.00013 + Math.random() * 0.00008 });
        runs.push({ p, c, len: p.getTotalLength(), ...seed, red: cls.startsWith('is-red') });
      };
      [...listInRef.current.children].forEach((li, i, arr) => { const a = rel(li.getBoundingClientRect()); wire(a.r, a.y, ...into(i), 'is-red'); });
      [...listOutRef.current.children].forEach((li, i, arr) => { const b = rel(li.getBoundingClientRect()); wire(...from(i, arr.length), b.l, b.y, 'is-green'); });
      // куча: место каждой карточки известно из её данных, поэтому не ждём, пока она долетит
      if (man && pile.length) {
        const sr = listInRef.current.parentElement.getBoundingClientRect(), h = listInRef.current.firstElementChild ? listInRef.current.firstElementChild.offsetHeight : 70;
        pile.forEach((p, i) => {
          const a = (p.r * Math.PI) / 180, cx = sr.left - hr.left + p.x + sr.width / 2, cyp = sr.top - hr.top + (sr.height * p.top) / 100 + h / 2;
          wire(cx + Math.cos(a) * sr.width / 2, cyp + Math.sin(a) * sr.width / 2, ...into(listInRef.current.children.length + i), 'is-red is-pile');
        });
      }
    };
    const later = (ms = 60) => { clearTimeout(timer); timer = setTimeout(build, ms); };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (calm || !S.current.visible || document.hidden) return;
      const k = S.current.on ? 3.2 : 0.35;
      runs.forEach((a) => {
        if (!S.current.on && !a.red) { a.c.style.opacity = 0; return; }
        const u = (a.off + now * a.speed * k) % 1, pt = a.p.getPointAtLength(a.len * u);
        a.c.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
        a.c.style.opacity = Math.sin(Math.PI * u);
      });
    };
    const ro = new ResizeObserver(() => later());
    ro.observe(hero); ro.observe(archRef.current);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => later());
    later(700); // карточки сначала встают на место
    raf = requestAnimationFrame(loop);
    return () => { ro.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [calm, on, pile, inbox.length, out.length, manual.length]);

  const hint = tried === 0 ? 'Выключите агента и сравните' : tried === 1 ? 'А теперь включите обратно' : '';
  const fly = { x: { ease: [0.5, 0, 0.9, 0.7] }, y: { ease: [0.3, 0, 0.6, 1] }, scale: { ease: [0.5, 0, 0.8, 0.6] } };

  return (
    <section className="hero" id="hero" ref={heroRef} data-mode={on ? 'on' : 'off'}>
      <svg className="hflow" ref={svgRef} aria-hidden="true" />
      <div className="hflow hflow-dots" ref={dotsRef} aria-hidden="true" />

      <h1 className="h-title">
        <span className="h-t1">Пока ваш менеджер скучает,</span>{' '}
        <span className="h-t2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={on ? 'on' : 'off'} className="h-swap"
              initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -22, filter: 'blur(8px)' }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}>
              {on ? 'агент уже ответил' : 'клиент уже ушёл'}
            </motion.span>
          </AnimatePresence>
        </span>
      </h1>

      <div className="h-stage" ref={archRef}>
        <div className="h-switch">
          <span className="cap h-state">{on ? 'агент включён' : 'агент выключен'}</span>
          <button type="button" role="switch" className="tgl" aria-checked={on} aria-label="Агент" onClick={() => setMode(!on)}>
            <span className="tgl-label is-on" aria-hidden="true">С агентами</span>
            <span className="tgl-label is-off" aria-hidden="true">Вручную</span>
            <span className="tgl-knob" aria-hidden="true"><Icon name="bolt" /><Icon name="clock" /></span>
          </button>
          <span className="h-hint" aria-hidden="true">{hint}</span>
        </div>
        <div className="m-wrap" aria-hidden="true"><canvas className="mascot" ref={canvasRef} /><div className="m-man"><img src={manTired} alt="" width="1100" height="710" decoding="async" /><canvas ref={manRef} /></div></div>
        <AnimatePresence>
          {!ready && (
            <motion.div className="m-load" role="status" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <span className="cap">агент просыпается</span>
              <span className="m-load-bar"><i style={{ transform: `scaleX(${load})` }} /></span>
              <span className="m-load-n">{Math.round(load * 100)}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="h-side h-in" aria-label="Входящие заявки">
        <header className="h-head"><span className="cap">Входящие</span><motion.b key={counts.in} initial={calm ? false : { scale: 1.25 }} animate={{ scale: 1 }}>{counts.in}</motion.b></header>
        <div className="h-stack">
        <ul className="h-list" ref={listInRef}>
          <AnimatePresence mode="popLayout" initial={false}>
            {inbox.map(({ id, lead }) => (
              <motion.li key={id} layout transition={SPRING} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0 } }}>
                <button type="button" className="lead lead-in" ref={(el) => { if (el) els.current.set(id, el); else els.current.delete(id); }}
                  onClick={() => process(id)} aria-label={`Обработать заявку: ${CH[lead.ch].name}, ${lead.text}`}>
                  <LeadIn lead={lead} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <ul className="h-pile" aria-hidden="true">
          <AnimatePresence>
            {pile.map((p, i) => (
              <motion.li key={p.id} className="lead lead-in lead-pile" style={{ top: `${p.top}%`, zIndex: i }}
                initial={calm ? false : { opacity: 0, x: p.x - 24, y: -70, rotate: p.r * 2.2, scale: 1.06 }}
                animate={{ opacity: 1, x: p.x, y: 0, rotate: p.r, scale: 1 }}
                exit={calm ? { opacity: 0 } : { opacity: 0, x: S.current.vis < VISIBLE ? 0 : 240, y: S.current.vis < VISIBLE ? 160 : 20, rotate: 0, scale: 0.2, transition: { duration: 0.4, delay: i * 0.045, ease: [0.5, 0, 0.9, 0.7] } }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                <LeadIn lead={p.lead} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        </div>
        <p className="h-foot"><span>Получаем заявок в месяц</span><b>247</b></p>
      </aside>

      <aside className="h-side h-out" aria-label="Обработанные лиды">
        <header className="h-head"><span className="cap">Обработано</span><motion.b key={on ? counts.out : `m${doneManual.current}`} initial={calm ? false : { scale: 1.25 }} animate={{ scale: 1 }}>{on ? counts.out : doneManual.current}</motion.b></header>
        <ul className="h-list" ref={listOutRef}>
          <AnimatePresence mode="popLayout" initial={false}>
            {(on ? out : manual).map(({ id, o }) => (
              <motion.li key={id} layout transition={SPRING} className="lead lead-out" initial={calm ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                <LeadOut o={o} />
              </motion.li>
            ))}
            {!on && Array.from({ length: Math.max(0, S.current.vis - manual.length) }, (_, i) => (
              <motion.li key={`slot${i}`} layout transition={SPRING} className={`lead lead-out lead-slot${i ? ' is-blank' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                <span className="lead-av"><Icon name="clock" /></span>
                <span className="lead-main"><span className="lead-top"><b>Ждёт ответа</b></span><span className="lead-text">Руки ещё не дошли</span></span>
                <span className="cap lead-st">В очереди</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="h-foot"><span>Экономим команде в неделю</span><b>{counts.hours.toFixed(1).replace('.', ',')} часа</b></p>
      </aside>

      <div className="h-cta">
        <a className="btn btn-main" href="#demo">Попробовать на своей заявке <Icon name="arrowUR" /></a>
      </div>

      <ul className="h-fly" aria-hidden="true">
        {flights.map((f) => (f.kind === 'in' ? (
          <motion.li key={f.id} className="lead lead-in lead-ghost" style={{ left: f.x - f.w / 2, top: f.y, width: f.w }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }} animate={{ x: f.dx, y: f.dy, scale: 0.1, opacity: [1, 1, 0] }}
            transition={{ duration: f.dur, ...fly, opacity: { times: [0, 0.75, 1], ease: 'linear', duration: f.dur } }}>
            <LeadIn lead={f.lead} />
          </motion.li>
        ) : (
          <motion.li key={f.id} className="lead lead-out lead-ghost" style={{ left: f.x - f.w / 2, top: f.y, width: f.w }}
            initial={{ x: f.dx, y: f.dy, scale: 0.1, opacity: 0 }} animate={{ x: 0, y: 0, scale: 1, opacity: [0, 1, 1] }}
            transition={{ duration: f.dur, x: { ease: [0.1, 0.3, 0.5, 1] }, y: { ease: [0.4, 0, 0.7, 1] }, scale: { ease: [0.2, 0.4, 0.5, 1] }, opacity: { times: [0, 0.25, 1], ease: 'linear', duration: f.dur } }}>
            <LeadOut o={f.o} />
          </motion.li>
        )))}
      </ul>

      <div className="sr" aria-live="polite">{live}</div>
    </section>
  );
}
