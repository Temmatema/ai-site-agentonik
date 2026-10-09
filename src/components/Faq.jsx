// Блок «Вопросы»: FAQ в виде чата с агентом. Клик по вопросу слева или свой вопрос в поле
// добавляет реплику посетителя, агент «печатает» ответ. Вопрос, на который нет готового
// ответа, агент предлагает передать команде: текст подставляется в форму заявки.
// Ответы собраны из шаблонов прямо в браузере, без обращения к серверу.
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FAQ, HELLO, NEXT, UNKNOWN } from '../data/faq.js';
import { useTask } from '../task.js';
import bot from '../assets/mascot-left.webp';
import Icon from './Icon.jsx';
import Title from './Title.jsx';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Faq() {
  const calm = useReducedMotion();
  const { prefill } = useTask();
  const box = useRef(null), uid = useRef(1), st = useRef({ answered: 0, offered: false, alive: true });
  const [msgs, setMsgs] = useState([{ id: 0, who: 'bot', text: HELLO }]);
  const [asked, setAsked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { st.current.alive = true; return () => { st.current.alive = false; }; }, []);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);

  // агент «думает», потом печатает ответ по буквам
  async function say(text, cta) {
    const id = uid.current++;
    const put = (p) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setMsgs((m) => [...m, { id, who: 'bot', text: '', dots: !calm }]);
    if (!calm) {
      await sleep(650);
      for (let i = 3; i < text.length && st.current.alive; i += 3) { put({ dots: false, text: text.slice(0, i) }); await sleep(16); }
    }
    put({ dots: false, text, cta });
  }

  async function ask(text, item) {
    if (busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { id: uid.current++, who: 'user', text }]);
    const found = item || FAQ.find((f) => f.re.test(text));
    if (found) {
      setAsked((a) => [...a, FAQ.indexOf(found)]);
      await say(found.a, found.cta);
      if (++st.current.answered >= 2 && !st.current.offered) {
        st.current.offered = true;
        await sleep(calm ? 0 : 500);
        await say(NEXT, { text: 'Оставить заявку', href: '#contact' });
      }
    } else await say(UNKNOWN, { text: 'Передать вопрос команде', href: '#contact', task: 'Вопрос с сайта: ' + text });
    setBusy(false);
  }

  const submit = (e) => {
    e.preventDefault();
    const text = q.trim();
    if (!text || busy) return;
    setQ(''); ask(text);
  };

  return (
    <section className="section faq" id="faq">
      <div className="wrap faq-grid">
        <div>
          <Title>Спросите агента <em>сами</em></Title>
          <p className="lead">Нажмите на вопрос, и агент ответит в чате. Или задайте свой.</p>
          <div className="faq-list">
            {FAQ.map((f, i) => (
              <button key={f.q} type="button" className={`faq-q${asked.includes(i) ? ' is-asked' : ''}`} onClick={() => ask(f.q, f)}>
                <span>{f.q}</span><Icon name={asked.includes(i) ? 'check' : 'arrowUR'} />
              </button>
            ))}
          </div>
        </div>

        <div className="faq-chat">
          <header className="faq-head"><img className="faq-bot" src={bot} alt="" width="40" height="48" /><div><b>Агент</b><span className="cap">онлайн, отвечает сразу</span></div></header>
          <div className="faq-msgs" ref={box} aria-live="polite">
            {msgs.map((m) => (
              <motion.div key={m.id} className={`faq-msg faq-from-${m.who}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                {m.dots ? <span className="faq-dots"><i /><i /><i /></span> : m.text}
                {m.cta && <a className="faq-cta" href={m.cta.href} onClick={m.cta.task ? () => prefill(m.cta.task) : undefined}>{m.cta.text}<Icon name="arrowUR" /></a>}
              </motion.div>
            ))}
          </div>
          <form className={`faq-form${busy ? ' is-busy' : ''}`} onSubmit={submit} noValidate>
            <label className="sr" htmlFor="faqInput">Ваш вопрос</label>
            <input id="faqInput" name="q" type="text" autoComplete="off" placeholder="Напишите свой вопрос…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="faq-send" type="submit" aria-label="Отправить вопрос"><Icon name="arrowUR" /></button>
          </form>
        </div>
      </div>
    </section>
  );
}
