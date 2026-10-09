import { useCallback, useMemo, useState } from 'react';
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
