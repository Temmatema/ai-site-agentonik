// Блок «Кейсы»: ряд карточек с рисованными обложками; выбранный кейс раскрывается под рядом:
// задача, что сделали, результат «было → стало».
// ВАЖНО: кейсы условные, это заготовка формата. Замените CASES в data/cases.js на реальные данные.
// Обложка: если у кейса есть поле img (путь к картинке), показывается она, иначе рисованный макет.
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CASES } from '../data/cases.js';
import { useTask } from '../task.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';

const EASE = [0.2, 0.8, 0.2, 1];

/* рисованные обложки-макеты: стоят на месте будущих скриншотов */
const MOCK = {
  chat: <div className="mk mk-chat"><span className="mk-b">Здравствуйте! Есть в наличии? Нужно к пятнице</span><span className="mk-b me">Да, есть. Оформить доставку на четверг?</span><span className="cap mk-toast">Лид создан в CRM</span></div>,
  cal: <div className="mk mk-cal"><div className="mk-grid">{Array.from({ length: 15 }, (_, i) => <i key={i} />)}</div><span className="cap mk-toast">Напоминание отправлено</span></div>,
  ads: <div className="mk mk-ads"><div className="mk-tiles"><i /><i className="win" /><i /></div><div className="mk-bars"><i style={{ width: '38%' }} /><i className="win" style={{ width: '86%' }} /><i style={{ width: '52%' }} /></div></div>,
  cards: <div className="mk mk-cards"><i /><i /><i /><i /></div>,
};

export default function Cases() {
  const { prefill } = useTask();
  const [open, setOpen] = useState(null);
  const detail = useRef(null);
  const c = open === null ? null : CASES[open];
  const toggle = (i) => {
    setOpen((v) => (v === i ? null : i));
    // на телефоне карточки идут лентой, и раскрытый кейс оказывается ниже экрана: подводим его под взгляд
    if (open !== i) setTimeout(() => { if (detail.current && detail.current.getBoundingClientRect().top > window.innerHeight * 0.7) detail.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 480);
  };

  return (
    <section className="section cases" id="cases">
      <div className="wrap">
        <div className="cs-head">
          <Title>Как это работает <em>у других</em></Title>
          <p className="cs-warn"><Icon name="alert" />Примеры условные и показывают формат: реальные кейсы появятся здесь позже.</p>
        </div>

        <div className="cs-track">
          {CASES.map((k, i) => (
            <button key={k.title} type="button" className="cs-card" aria-expanded={open === i} aria-controls="csDetail" onClick={() => toggle(i)}>
              <span className="cs-cover" data-cover={k.cover}>{k.img ? <img src={k.img} alt="" loading="lazy" /> : MOCK[k.cover]}</span>
              <span className="cs-tags"><span className="cap">{k.tag}</span><span className="cap">{k.product}</span></span>
              <span className="cs-title">{k.title}</span>
              <span className="cs-key"><b>{k.key[0]}</b><span>{k.key[1]}</span></span>
              <span className="cs-more">{open === i ? 'Свернуть' : 'Смотреть кейс'}<Icon name="arrowUR" /></span>
            </button>
          ))}
        </div>

        <div id="csDetail" ref={detail}>
          <AnimatePresence initial={false} mode="wait">
            {c && (
              <motion.div key={open} className="cs-d-wrap" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                <article className="cs-d">
                  <header className="cs-d-head">
                    <h3>{c.title}</h3>
                    <button type="button" className="cs-x" aria-label="Закрыть кейс" onClick={() => setOpen(null)}><Icon name="dash" /></button>
                  </header>
                  <div className="cs-cols">
                    <div><h4 className="cap">Задача</h4><p>{c.task}</p></div>
                    <div><h4 className="cap">Что сделали</h4><ul>{c.did.map((t) => <li key={t}>{t}</li>)}</ul></div>
                    <div>
                      <h4 className="cap">Результат</h4>
                      <dl className="cs-res">
                        {c.res.map((r, k) => (
                          <motion.div key={r[0]} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + k * 0.1, duration: 0.4, ease: EASE }}>
                            <dt>{r[0]}</dt><dd><s>{r[1]}</s><Icon name="arrowR" /><b>{r[2]}</b></dd>
                          </motion.div>
                        ))}
                      </dl>
                    </div>
                  </div>
                  <footer className="cs-foot">
                    <a className="btn btn-main" href="#contact" onClick={() => prefill(`Хочу похожий результат, как в кейсе «${c.title}» (${c.tag.toLowerCase()}).`)}>Хочу так же <Icon name="arrowUR" /></a>
                    <p className="mini">Пример условный и показывает формат. Реальные цифры зависят от вашего бизнеса.</p>
                  </footer>
                </article>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
