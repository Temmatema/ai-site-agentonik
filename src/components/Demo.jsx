// Демо «агент разбирает заявку»: слева заявка, справа журнал из пяти шагов с рейкой прогресса.
// Всё считается в браузере по простым правилам, чтобы показать логику работы.
// Настоящий агент подключается к CRM, прайсу и каналам.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PRESETS, CHANNELS, STEP_DEFS, analyze, buildPlan, sleep, fmtSec, tween } from '../data/demo.js';
import { useTask } from '../task.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';
import Glow from './Glow.jsx';

const STEPS = [{ icon: 'search', title: 'Понимает запрос' }, ...STEP_DEFS.map((d) => ({ icon: d.icon, title: d.title.replace(/^\d+\.\s*/, '') }))];
const idle = () => STEPS.map(() => ({ state: 'idle', time: '', detail: '' }));
const Chan = ({ name }) => { const c = CHANNELS[name] || CHANNELS['Сайт']; return <span className="chan"><Icon name={c.ico} /></span>; };

export default function Demo() {
  const calm = useReducedMotion();
  const { prefill } = useTask();
  const runId = useRef(0), textRef = useRef(null);
  const [preset, setPreset] = useState(0);
  const [text, setText] = useState(PRESETS[0].text);
  const [channel, setChannel] = useState(PRESETS[0].channel);
  const [steps, setSteps] = useState(idle);
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [now, setNow] = useState('12:14');
  useEffect(() => { setNow(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })); return () => { runId.current++; }; }, []);

  const reset = () => { runId.current++; setSteps(idle()); setTags([]); setBusy(false); setResult(null); };
  const patch = (i, p) => setSteps((s) => s.map((x, k) => (k === i ? { ...x, ...p } : x)));

  async function run() {
    const src = text.trim();
    if (!src) { textRef.current.focus(); return; }
    reset();
    const my = runId.current, alive = () => my === runId.current;
    setBusy(true);
    const a = analyze(src), P = buildPlan(a, channel), t0 = performance.now();

    // шаг 1: понимает запрос, метки появляются по одной
    patch(0, { state: 'active' });
    await sleep(calm ? 0 : 420); if (!alive()) return;
    for (let i = 0; i < P.tags.length; i++) { setTags(P.tags.slice(0, i + 1)); await sleep(calm ? 0 : 140); if (!alive()) return; }
    await sleep(calm ? 0 : 500); if (!alive()) return;
    patch(0, { state: 'done', time: fmtSec(1200) });

    // шаги 2–5
    let actions = 1;
    for (let k = 0; k < 4; k++) {
      const st = P.steps[k], s = performance.now();
      patch(k + 1, { state: 'active', detail: k === 0 ? '' : st.detail });
      if (k === 0) {
        if (calm) patch(1, { detail: P.reply });
        else await tween(st.ms * 0.85, (v) => { if (alive()) patch(1, { detail: P.reply.slice(0, Math.floor(v * P.reply.length)) }); });
      }
      await sleep(calm ? 0 : Math.max(0, s + st.ms - performance.now())); if (!alive()) return;
      if (st.skip && k > 0) patch(k + 1, { state: 'skip', time: fmtSec(st.ms) });
      else { patch(k + 1, { state: 'done', time: fmtSec(st.ms) }); actions++; }
    }
    if (a.type === 'spam') actions = 2;
    const total = fmtSec(calm ? 3100 : performance.now() - t0).replace(' с', '');
    setResult({ type: P.type, channel, text: `Агент выполнил ${actions} ${actions === 1 ? 'действие' : actions < 5 ? 'действия' : 'действий'} за ${total} секунды.` });
    setBusy(false);
  }

  const pick = (i) => { setPreset(i); setText(PRESETS[i].text); setChannel(PRESETS[i].channel); reset(); };
  const finished = steps.filter((s) => s.state === 'done' || s.state === 'skip').length;

  return (
    <section className="section demo has-glow" id="demo">
      <Glow variant="a" />
      <div className="wrap demo-grid">
        <div className="demo-left">
          <Title>Отдайте агенту заявку и посмотрите, <em>что он делает</em></Title>
          <p className="lead">Выберите пример или напишите свою заявку. Агент прочитает её, определит тип, найдёт ответ, напишет клиенту и заведёт запись в CRM.</p>

          <div className="chips" role="group" aria-label="Примеры заявок">
            {PRESETS.map((p, i) => <button key={p.label} type="button" className="chip" aria-pressed={preset === i} onClick={() => pick(i)}>{p.label}</button>)}
          </div>

          <article className="in-card">
            <header className="in-head"><Chan name={channel} /><b>{channel}</b><time className="cap">{now}</time></header>
            <label className="sr" htmlFor="demoText">Текст заявки</label>
            <textarea id="demoText" ref={textRef} rows={5} value={text} placeholder="Напишите заявку клиента своими словами…"
              onChange={(e) => { setText(e.target.value); setPreset(-1); setChannel('Сайт'); }} />
            <button className="btn btn-main" type="button" onClick={run} disabled={busy}>Отдать агенту <Icon name="arrowUR" /></button>
          </article>
        </div>

        <div className="run" data-done={result ? '' : undefined}>
          <div className="run-list">
          <div className="run-rail" aria-hidden="true"><motion.i animate={{ scaleY: finished / STEPS.length }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} /></div>
          <ol className="run-steps">
            {STEPS.map((d, i) => {
              const s = steps[i];
              return (
                <li key={d.title} className={`run-step is-${s.state}`}>
                  <span className="run-mark">{s.state === 'done' ? <Icon name="check" /> : s.state === 'skip' ? <Icon name="dash" /> : <Icon name={d.icon} />}</span>
                  <div className="run-body">
                    <div className="run-head"><b>{d.title}</b><time className="cap">{s.time || (s.state === 'active' ? 'идёт' : 'ждёт')}</time></div>
                    {i === 0 ? (
                      <ul className="tags">
                        <AnimatePresence initial={false}>
                          {tags.map((t) => (
                            <motion.li key={t.txt} className={`tag ${t.tone || ''}`} initial={{ opacity: 0, scale: 0.85, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
                              <Icon name={t.ico} />{t.txt}
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    ) : s.detail && <p className="run-detail">{s.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          </div>

          <div className="run-done" aria-live="polite">
            <div><b>{result ? 'Готово!' : busy ? 'Агент работает' : 'Ждём заявку'}</b><p>{result ? result.text : busy ? 'Следите за шагами выше.' : 'Нажмите «Отдать агенту», и журнал оживёт.'}</p></div>
            {result && (
              <dl className="run-meta">
                <div><dt className="cap">Тип заявки</dt><dd><Icon name={result.type.ico} />{result.type.name}</dd></div>
                <div><dt className="cap">Канал</dt><dd><Chan name={result.channel} />{result.channel}</dd></div>
              </dl>
            )}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div className="demo-cta" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
                <div className="demo-cta-in">
                  <div><b>Хотите так же на своих заявках?</b><p>Расскажите о задаче, и мы покажем, как агент будет отвечать вашим клиентам и что занесёт в CRM.</p></div>
                  <a className="btn btn-line" href="#contact" onClick={() => prefill(`Хочу, чтобы агент разбирал мои заявки. Основной канал: ${channel}.`)}>Обсудить мою задачу <Icon name="arrowUR" /></a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="mini">Это демонстрация: ответы собираются по шаблонам прямо в браузере. Настоящий агент подключается к вашей CRM, прайсу и каналам связи.</p>
        </div>
      </div>
    </section>
  );
}
