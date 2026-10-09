// Блок «Контакты»: форма с тремя шагами. Шаги зажигаются по мере заполнения,
// а после отправки третий шаг показывает подобранные решения.
// Форма пока ничего никуда не отправляет (прототип).
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SOLUTIONS, AUDIT, RULES } from '../data/contact.js';
import { useTask } from '../task.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';

const STEPS = ['Контакты', 'Задача', 'Решения'];
const PROMISES = [['Ответим', 'в течение 1 часа'], ['Подберём решения', 'под ваш кейс'], ['Рассчитаем', 'потенциальную выгоду']];
const EASE = [0.2, 0.8, 0.2, 1];

function pickSolutions(text) {
  const found = Object.values(SOLUTIONS).filter((s) => s.re.test(text)).slice(0, 2);
  if (!found.length) found.push(SOLUTIONS.agents);
  return [...found, AUDIT];
}

export default function Contact() {
  const { task, type } = useTask();
  const form = useRef(null);
  const [name, setName] = useState(''), [contact, setContact] = useState('');
  const [bad, setBad] = useState([]);
  const [sent, setSent] = useState(null);
  const val = { name, contact, task };
  const ok = (n) => RULES[n][0](val[n]);
  const s1 = ok('name') && ok('contact'), s2 = s1 && ok('task');
  const states = sent ? ['done', 'done', 'done'] : [s1 ? 'done' : 'active', s2 ? 'done' : s1 ? 'active' : 'idle', 'idle'];

  const set = (n, fn) => (e) => { fn(e.target.value); if (bad.includes(n) && RULES[n][0](e.target.value)) setBad((b) => b.filter((x) => x !== n)); };
  const submit = (e) => {
    e.preventDefault();
    const wrong = Object.keys(RULES).filter((n) => !ok(n));
    setBad(wrong);
    if (wrong.length) { form.current.elements[wrong[0]].focus(); return; }
    setSent({ name: name.trim(), sols: pickSolutions(task) });
  };
  const reset = () => { setName(''); setContact(''); type(''); setBad([]); setSent(null); setTimeout(() => form.current && form.current.elements.name.focus(), 0); };
  const err = (n) => bad.includes(n) && <small className="err" id={`err-${n}`}>{RULES[n][1]}</small>;
  const aria = (n) => ({ 'aria-invalid': bad.includes(n) || undefined, 'aria-describedby': bad.includes(n) ? `err-${n}` : undefined });

  return (
    <section className="section contact" id="contact">
      <div className="wrap contact-grid">
        <div className="c-left">
          <Title>Расскажите, где у вас тонет <em>команда</em></Title>
          <p className="lead">Покажем, какие процессы агент возьмёт на себя, и посчитаем выгоду на ваших цифрах.</p>
          <ul className="c-feats">{PROMISES.map(([a, b]) => <li key={a}><Icon name="check" /><span><b>{a}</b> {b}</span></li>)}</ul>
        </div>

        <form className="cform" ref={form} onSubmit={submit} noValidate>
          <ol className="steps3" aria-label="Шаги заявки">
            {STEPS.map((t, i) => (
              <li key={t} className={`is-${states[i]}`}>
                <motion.span key={states[i]} initial={states[i] === 'idle' ? false : { scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                  {states[i] === 'done' ? <Icon name="check" /> : i + 1}
                </motion.span>{t}
              </li>
            ))}
          </ol>

          <AnimatePresence mode="wait" initial={false}>
            {!sent ? (
              <motion.div key="body" className="c-body" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <label className={`cfield${bad.includes('name') ? ' bad' : ''}`}><span className="lbl">Как к вам обращаться</span>
                  <input name="name" type="text" autoComplete="name" placeholder="Анна" value={name} onChange={set('name', setName)} {...aria('name')} />{err('name')}</label>
                <label className={`cfield${bad.includes('contact') ? ' bad' : ''}`}><span className="lbl">Телефон или Telegram</span>
                  <input name="contact" type="text" autoComplete="tel" placeholder="+7 900 000-00-00" value={contact} onChange={set('contact', setContact)} {...aria('contact')} />{err('contact')}</label>
                <label className={`cfield${bad.includes('task') ? ' bad' : ''}`}><span className="lbl">Что хотите автоматизировать</span>
                  <textarea name="task" rows={3} placeholder="Например: отвечать на заявки с Авито" value={task} onChange={set('task', type)} {...aria('task')} />{err('task')}</label>
                <div className="c-submit">
                  <button className="btn btn-main" type="submit">Отправить заявку <Icon name="arrowUR" /></button>
                  <span className="c-secure"><Icon name="lock" />Ваши данные в безопасности</span>
                </div>
                <p className="mini">После отправки мы свяжемся с вами в течение 1 часа и предложим варианты решения.</p>
              </motion.div>
            ) : (
              <motion.div key="result" className="c-result" aria-live="polite" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                <h3>Спасибо, {sent.name}!</h3>
                <p>Вот с чего мы бы начали для вашей задачи:</p>
                {sent.sols.map((s, i) => (
                  <motion.div key={s.t} className="c-sol" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: EASE }}>
                    <Icon name={s.ico} /><div><b>{s.t}</b><span>{s.d}</span></div>
                  </motion.div>
                ))}
                <p className="mini">Это прототип: заявка пока никуда не отправляется. Когда форма будет подключена, ответ придёт на указанный контакт.</p>
                <button className="btn btn-line" type="button" onClick={reset}>Заполнить заново <Icon name="arrowUR" /></button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </section>
  );
}
