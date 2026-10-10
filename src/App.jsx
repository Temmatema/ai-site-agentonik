import { useCallback, useEffect, useMemo, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { MotionConfig, motion, useScroll } from 'motion/react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Marquee from './components/Marquee.jsx';
import Demo from './components/Demo.jsx';
import Facts from './components/Facts.jsx';
import Calc from './components/Calc.jsx';
import Products from './components/Products.jsx';
import Cases from './components/Cases.jsx';
import Faq from './components/Faq.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import { TaskCtx } from './task.js';

// Свой текст посетителя в форме заявки не затираем: auto = true, пока в поле лежит подставленный текст.

export default function App() {
  const [task, setTask] = useState({ text: '', auto: true });
  const prefill = useCallback((text) => setTask((t) => (t.text.trim() && !t.auto ? t : { text, auto: true })), []);
  const type = useCallback((text) => setTask({ text, auto: false }), []);
  const ctx = useMemo(() => ({ task: task.text, prefill, type }), [task.text, prefill, type]);
  const { scrollYProgress } = useScroll();

  // плавная прокрутка колесом: страница доезжает с инерцией, а не прыгает шагами. Якоря из меню едут так же,
  // отступ под шапку берётся из scroll-padding-top в стилях. На тачскринах прокрутка остаётся родной; при «меньше движения» не включаем вовсе
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9, anchors: true });
    return () => lenis.destroy();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <TaskCtx.Provider value={ctx}>
        <motion.div className="progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
        <Nav />
        <main>
          <Hero />
          <Marquee />
          <Demo />
          <Facts />
          <Calc />
          <Products />
          <Cases />
          <Faq />
          <Contact />
        </main>
        <Footer />
      </TaskCtx.Provider>
    </MotionConfig>
  );
}
