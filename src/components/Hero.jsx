// Главный экран: красные заявки слева влетают в маскота и вылетают справа обработанными (зелёными).
// В режиме «С агентами» маскот берёт все заявки разом, пачкой; клик по заявке обрабатывает её сразу.
// Вручную заявки копятся, а заголовок справа меняется. Данные условные.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CH, LEADS, VISIBLE, HOURS_PER_LEAD, initials } from '../data/leads.js';
import Icon from './Icon.jsx';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NS = 'http://www.w3.org/2000/svg';
const SPRING = { type: 'spring', stiffness: 220, damping: 26 };

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
  const heroRef = useRef(null), archRef = useRef(null), canvasRef = useRef(null), svgRef = useRef(null);
  const listInRef = useRef(null), listOutRef = useRef(null);
  const els = useRef(new Map()), mascot = useRef(null), uid = useRef(100), nextIdx = useRef(0);
  const S = useRef({ on: true, inbox: [], busy: new Set(), alive: true, visible: true, vis: VISIBLE });

  const [on, setOn] = useState(true);
  const [tried, setTried] = useState(0); // 0 — ещё не трогали, 1 — выключили, 2 — вернули агентов
  const [inbox, setInbox] = useState([]);
  const [out, setOut] = useState([]);
  const [flights, setFlights] = useState([]);
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
      .then(({ createMascot }) => createMascot(canvasRef.current, heroRef.current, (v) => { if (!dead) setLoad(v); }))
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
  const anchor = () => {
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
    const T = !fast ? { in: 1.6, hold: 900, out: 1.4 } : small ? { in: 0.7, hold: 140, out: 0.7 } : { in: 0.6, hold: 120, out: 0.6 };
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
      const a = anchor(), box = listOutRef.current, to = centre(box.firstElementChild || box), fid = ++uid.current;
      setFlights((f) => [...f, { id: fid, kind: 'out', o: item.lead.out, x: to.x, y: to.y, w: box.offsetWidth, dx: a.x - to.x, dy: a.y - to.y, dur: T.out }]);
      await sleep(T.out * 1000);
      if (!st.alive) return;
      setFlights((f) => f.filter((x) => x.id !== fid));
    }
    setOut((o) => [{ id: ++uid.current, o: item.lead.out }, ...o].slice(0, st.vis));
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
          await Promise.all(batch.map((x, i) => sleep(i * (small ? 240 : 170)).then(() => !stop && process(x.id))));
        }
        if (!stop) tick();
      }, small ? 900 : 1100);
    };
    const first = setTimeout(tick, 500);
    return () => { stop = true; clearTimeout(timer); clearTimeout(first); };
  }, [on, calm, ready, process]);

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
    setTried((t) => (next ? (t ? 2 : 0) : Math.max(t, 1)));
    setLive(next ? 'Режим: с агентами. Заявки разбираются автоматически.' : 'Режим: вручную. Заявки копятся.');
  };
  const segKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setMode(true); e.currentTarget.querySelector('#segOn').focus(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setMode(false); e.currentTarget.querySelector('#segOff').focus(); }
  };

  /* провода: от каждой заявки к проёму и от проёма к обработанным, по ним бегут точки */
  useEffect(() => {
    const svg = svgRef.current, hero = heroRef.current;
    let runs = [], raf = 0, timer = 0;
    const mk = (cls, tag = 'path') => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); svg.appendChild(e); return e; };
    const build = () => {
      svg.replaceChildren(); runs = [];
      if (matchMedia('(max-width: 1000px)').matches || !listInRef.current) return;
      const hr = hero.getBoundingClientRect(), ar = archRef.current.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${hr.width} ${hr.height}`);
      const rel = (r) => ({ l: r.left - hr.left, r: r.right - hr.left, y: r.top - hr.top + r.height / 2 });
      const cy = anchor().y, aL = ar.left - hr.left, aR = ar.right - hr.left;
      const wire = (x1, y1, x2, y2, cls) => {
        const dx = (x2 - x1) * 0.5, p = mk('hl ' + cls);
        p.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
        const c = mk('hl-run ' + cls, 'circle'); c.setAttribute('r', 3);
        runs.push({ p, c, len: p.getTotalLength(), off: Math.random(), speed: 0.00013 + Math.random() * 0.00008, red: cls === 'is-red' });
      };
      [...listInRef.current.children].forEach((li, i, arr) => { const a = rel(li.getBoundingClientRect()); wire(a.r, a.y, aL, cy + (i - (arr.length - 1) / 2) * 22, 'is-red'); });
      [...listOutRef.current.children].forEach((li, i, arr) => { const b = rel(li.getBoundingClientRect()); wire(aR, cy + (i - (arr.length - 1) / 2) * 22, b.l, b.y, 'is-green'); });
    };
    const later = (ms = 60) => { clearTimeout(timer); timer = setTimeout(build, ms); };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (calm || !S.current.visible || document.hidden) return;
      const k = S.current.on ? 2.4 : 0.35;
      runs.forEach((a) => {
        if (!S.current.on && !a.red) { a.c.style.opacity = 0; return; }
        const u = (a.off + now * a.speed * k) % 1, pt = a.p.getPointAtLength(a.len * u);
        a.c.setAttribute('cx', pt.x); a.c.setAttribute('cy', pt.y);
        a.c.style.opacity = Math.sin(Math.PI * u);
      });
    };
    const ro = new ResizeObserver(() => later());
    ro.observe(hero); ro.observe(archRef.current);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => later());
    later(700); // карточки сначала встают на место
    raf = requestAnimationFrame(loop);
    return () => { ro.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [calm, inbox.length, out.length]);

  const hint = tried === 0 ? 'Нажмите «Вручную» и сравните' : tried === 1 ? 'А теперь верните агентов' : '';
  const fly = { x: { ease: [0.5, 0, 0.9, 0.7] }, y: { ease: [0.3, 0, 0.6, 1] }, scale: { ease: [0.5, 0, 0.8, 0.6] } };

  return (
    <section className="hero" id="hero" ref={heroRef} data-mode={on ? 'on' : 'off'}>
      <svg className="hflow" ref={svgRef} aria-hidden="true" />

      <h1 className="h-title">
        <span className="h-t1">Пока вы разбираете заявки,</span>{' '}
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
          <div className="seg" role="radiogroup" aria-label="Как работает бизнес" onKeyDown={segKey}>
            <button type="button" role="radio" id="segOff" aria-checked={!on} tabIndex={on ? -1 : 0} onClick={() => setMode(false)}>
              {!on && <motion.span layoutId="seg-thumb" className="seg-thumb" transition={SPRING} />}<Icon name="clock" /><span>Вручную</span>
            </button>
            <button type="button" role="radio" id="segOn" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => setMode(true)}>
              {on && <motion.span layoutId="seg-thumb" className="seg-thumb" transition={SPRING} />}<Icon name="bolt" /><span>С агентами</span>
            </button>
          </div>
          <span className="h-hint" aria-hidden="true">{hint}</span>
        </div>
        <div className="m-wrap" aria-hidden="true"><canvas className="mascot" ref={canvasRef} /></div>
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
        <p className="h-foot"><span>Получаем заявок в месяц</span><b>247</b></p>
      </aside>

      <aside className="h-side h-out" aria-label="Обработанные лиды">
        <header className="h-head"><span className="cap">Обработано</span><motion.b key={counts.out} initial={calm ? false : { scale: 1.25 }} animate={{ scale: 1 }}>{counts.out}</motion.b></header>
        <ul className="h-list" ref={listOutRef}>
          <AnimatePresence mode="popLayout" initial={false}>
            {out.map(({ id, o }) => (
              <motion.li key={id} layout transition={SPRING} className="lead lead-out" initial={calm ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                <LeadOut o={o} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="h-foot"><span>Экономим команде в неделю</span><b>{counts.hours.toFixed(1).replace('.', ',')} часа</b></p>
      </aside>

      <div className="h-cta">
        <a className="btn btn-main" href="#demo">Попробовать на своей заявке <Icon name="arrowUR" /></a>
        <span className="h-note">Цифры на этом экране условные</span>
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
