// Шапка: получает фон после начала прокрутки, черта ездит под пунктом текущего раздела,
// глаза в логотипе следят за курсором, на узких экранах меню открывается кнопкой.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import Icon from './Icon.jsx';

const LINKS = [['#demo', 'Как это работает'], ['#products', 'Продукты'], ['#cases', 'Кейсы'], ['#faq', 'Вопросы'], ['#contact', 'Контакты']];
// какой пункт меню подсвечивать, пока на экране секция с этим id
const OWNER = { demo: '#demo', calc: '#demo', products: '#products', cases: '#cases', faq: '#faq', contact: '#contact' };

export function Brand() {
  const mark = useRef(null);
  useEffect(() => {
    const move = (e) => {
      if (e.pointerType !== 'mouse' || !mark.current) return;
      const r = mark.current.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160);
      mark.current.style.setProperty('--ex', ((dx / d) * 2.2 * k).toFixed(2) + 'px');
      mark.current.style.setProperty('--ey', ((dy / d) * 1.8 * k).toFixed(2) + 'px');
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return (
    <a className="brand" href="#hero" aria-label="АгентникАИ — наверх">
      <span className="brand-mark" ref={mark} aria-hidden="true"><i /><i /></span>
      АгентникАИ
    </a>
  );
}

export default function Nav() {
  const ref = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let queued = false;
    const update = () => {
      queued = false;
      setScrolled(window.scrollY > 40);
      // текущей считается последняя секция, верх которой уже выше 40% высоты экрана
      const line = window.innerHeight * 0.4;
      let cur = null;
      Object.keys(OWNER).forEach((id) => { const s = document.getElementById(id); if (s && s.getBoundingClientRect().top <= line) cur = id; });
      setActive(cur ? OWNER[cur] : null);
    };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    update();
    return () => { window.removeEventListener('scroll', ask); window.removeEventListener('resize', ask); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (!ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', out); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`} ref={ref}>
      <Brand />
      <nav className="nav-links" id="navLinks" aria-label="Разделы" onClick={(e) => { if (e.target.closest('a')) setOpen(false); }}>
        {LINKS.map(([href, text]) => (
          <a key={href} href={href} aria-current={active === href ? 'true' : undefined}>
            {text}
            {active === href && <motion.i layoutId="nav-line" className="nav-line" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
          </a>
        ))}
        <a className="btn btn-main nav-cta-m" href="#contact">Получить консультацию <Icon name="arrowUR" /></a>
      </nav>
      <a className="btn btn-main btn-s nav-cta" href="#contact">Консультация <Icon name="arrowUR" /></a>
      <button className="nav-burger" type="button" aria-label="Меню" aria-expanded={open} aria-controls="navLinks" onClick={() => setOpen((v) => !v)}><i /><i /></button>
    </header>
  );
}
