// Подвал: маскот выглядывает из-за края и смотрит на соцсети; при наведении на соцсеть меняет реплику.
// На устройствах без наведения реплики идут по кругу, пока подвал на экране.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import mascot from '../assets/mascot-right.webp';
import { Brand } from './Nav.jsx';
import Icon from './Icon.jsx';

const IDLE = 'Загляните к нам в соцсети. Я там тоже есть';
// TODO: подставить настоящие ссылки на соцсети вместо href="#"
const SOCIALS = [
  { name: 'Telegram', sub: 'написать нам', say: 'В Telegram отвечаем быстрее всего', href: '#' },
  { name: 'Instagram', sub: 'закулисье', say: 'В Instagram показываем, как всё устроено изнутри', href: '#' },
  { name: 'ВКонтакте', sub: 'новости и кейсы', say: 'Во ВКонтакте делимся новостями и кейсами', href: '#' },
];
const NAV = [['#demo', 'Как это работает'], ['#calc', 'Калькулятор'], ['#products', 'Продукты'], ['#cases', 'Кейсы'], ['#faq', 'Вопросы'], ['#contact', 'Контакты']];

export default function Footer() {
  const calm = useReducedMotion();
  const foot = useRef(null);
  const [hot, setHot] = useState(-1);
  const say = hot < 0 ? IDLE : SOCIALS[hot].say;

  useEffect(() => {
    if (calm || !matchMedia('(hover: none)').matches) return undefined;
    let i = 0, timer = 0;
    const io = new IntersectionObserver((en) => {
      clearInterval(timer);
      if (en[0].isIntersecting) timer = setInterval(() => setHot(i++ % SOCIALS.length), 2600);
    }, { threshold: 0.4 });
    io.observe(foot.current);
    return () => { io.disconnect(); clearInterval(timer); };
  }, [calm]);

  return (
    <footer className="footer" id="footer" ref={foot}>
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-hero">
            <img className="ft-mascot" src={mascot} alt="" width="820" height="992" loading="lazy" />
            <p className="ft-say" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={say} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>{say}</motion.span>
              </AnimatePresence>
            </p>
          </div>
          <nav className="ft-soc" aria-label="Мы в соцсетях" onPointerLeave={() => setHot(-1)}>
            {SOCIALS.map((s, i) => (
              <a key={s.name} className={`ft-s${hot === i ? ' is-hot' : ''}`} href={s.href} onPointerEnter={() => setHot(i)} onFocus={() => setHot(i)} onBlur={() => setHot(-1)}>
                <b>{s.name}</b><span className="cap">{s.sub}</span><Icon name="arrowUR" />
              </a>
            ))}
          </nav>
        </div>
        <div className="ft-bottom">
          <Brand />
          <nav className="ft-nav" aria-label="Разделы">{NAV.map(([h, t]) => <a key={h} href={h}>{t}</a>)}</nav>
          <span className="cap ft-copy">© {new Date().getFullYear()} АгентникАИ</span>
        </div>
      </div>
    </footer>
  );
}
