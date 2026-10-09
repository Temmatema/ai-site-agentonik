// Блок «Продукты»: слева три продукта, справа схема процесса для выбранного. У каждого продукта
// несколько сценариев; шаги схемы проявляются по очереди. Все примеры иллюстративные.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PRODUCTS } from '../data/products.js';
import Icon from './Icon.jsx';
import Title from './Title.jsx';

const CARDS = [
  { name: 'ИИ-агенты', text: 'Отвечают клиентам, разбирают заявки и почту, собирают отчёты, обновляют CRM. Работают круглосуточно и передают вам только важное.', list: ['Заявки и поддержка', 'Отчёты и сводки', 'Интеграции с CRM'] },
  { name: 'ИИ-дизайн', text: 'Баннеры, карточки товаров и презентации за часы, а не недели. Единый стиль бренда в каждом макете.', list: ['Карточки для маркетплейсов', 'Баннеры и соцсети', 'Презентации'] },
  { name: 'ИИ-реклама', text: 'Креативы, тексты и A/B-тесты в большом количестве. Находим связки, которые приводят клиентов дешевле.', list: ['Креативы и тексты', 'A/B-тесты', 'Аналитика связок'] },
];
const EASE = [0.2, 0.8, 0.2, 1];
const flow = { show: { transition: { staggerChildren: 0.28 } } };
const node = { hide: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

const NodeIcon = ({ n }) => <span className={`pn-ico${n.chan ? ' chan' : ''}`}><Icon name={n.chan ? n.chan[1] : n.ico} /></span>;

function Node({ n, i }) {
  return (
    <motion.article className="pnode" variants={node}>
      <header className="pn-head"><NodeIcon n={n} /><b>{n.title}</b><span className="cap">{n.badge || n.time || `шаг ${i + 1}`}</span></header>
      {(n.k === 'msg' || n.k === 'text') && <p className={`pn-bubble${n.k === 'msg' ? ' is-in' : ''}`}>{n.text}</p>}
      {n.k === 'list' && <ul className="pn-list">{n.items.map((t) => <li key={t}><Icon name="check" /><span>{t}</span></li>)}</ul>}
      {n.k === 'thumbs' && <div className="thumbs">{n.tiles.map((t, k) => <span key={k} className={`thumb${k === n.sel ? ' sel' : ''}`} style={{ '--a': t[0], '--b': t[1] }} />)}</div>}
      {n.k === 'bars' && <div className="mrow">{n.rows.map((r) => <div key={r[0]} className={r[3] ? 'win' : ''}><span>{r[0]}</span><b>{r[1]}</b><span className="mbar"><i style={{ width: r[2] + '%' }} /></span></div>)}</div>}
    </motion.article>
  );
}

export default function Products() {
  const [cur, setCur] = useState(0);
  const [tabs, setTabs] = useState(() => PRODUCTS.map(() => 0));
  const P = PRODUCTS[cur], T = P.tabs[tabs[cur]];
  const onKey = (e, i) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowDown' ? 1 : CARDS.length - 1)) % CARDS.length;
    setCur(next); document.getElementById('ptab-' + next).focus();
  };

  return (
    <section className="section products" id="products">
      <div className="wrap">
        <div className="prod-head">
          <Title>Три продукта, которые <em>снимают рутину</em></Title>
          <p className="lead">Закрываем ключевые задачи: общение с клиентами, оформление контента и реклама. Выберите продукт, и мы покажем процесс на примере.</p>
        </div>

        <div className="prod-grid">
          <div className="ptabs-v" role="tablist" aria-label="Продукты" aria-orientation="vertical">
            {CARDS.map((c, i) => (
              <button key={c.name} type="button" role="tab" id={`ptab-${i}`} className="pcard" aria-selected={cur === i} aria-controls="ppanel" tabIndex={cur === i ? 0 : -1}
                onClick={() => setCur(i)} onKeyDown={(e) => onKey(e, i)}>
                {cur === i && <motion.span layoutId="pcard-on" className="pcard-on" transition={{ type: 'spring', stiffness: 300, damping: 32 }} />}
                <span className="pcard-name">{c.name}<Icon name="arrowUR" /></span>
                <span className="pcard-text">{c.text}</span>
                <AnimatePresence initial={false}>
                  {cur === i && (
                    <motion.span className="pcard-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                      <span className="pcard-list">{c.list.map((t) => <span key={t} className="cap">{t}</span>)}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          <div className="ppanel" id="ppanel" role="tabpanel" aria-labelledby={`ptab-${cur}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={cur} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
                <div className="ptop">
                  <div><h3>{P.title}</h3><p>{P.sub}</p></div>
                  <div className="chips" role="tablist" aria-label="Сценарии">
                    {P.tabs.map((t, i) => (
                      <button key={t.label} type="button" role="tab" className="chip" aria-selected={i === tabs[cur]} onClick={() => setTabs((a) => a.map((v, k) => (k === cur ? i : v)))}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <motion.div key={tabs[cur]} className="pflow" variants={flow} initial="hide" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
                  {T.nodes.map((n, i) => <Node key={n.title} n={n} i={i} />)}
                  <motion.div className="pdone" variants={node}>
                    <span className="pdone-ico"><Icon name="check" /></span>
                    <p><b>Готово!</b> {T.done.text}</p>
                    <dl className="pdone-meta">{T.done.meta.map(([label, , text]) => <div key={label}><dt className="cap">{label}</dt><dd>{text}</dd></div>)}</dl>
                  </motion.div>
                </motion.div>

                <div className="pfoot">
                  <a className="btn btn-line" href={P.cta.href}>{P.cta.text} <Icon name="arrowUR" /></a>
                  <p className="mini">Примеры иллюстративные: реальные цифры зависят от вашего бизнеса.</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
