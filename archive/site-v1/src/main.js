import { animate, inView, scroll, stagger } from 'motion';
import { initDemo } from './demo.js';
import { initProducts } from './products.js';
import { initContact } from './contact.js';
import { initCalc } from './calc.js';
import { initCases } from './cases.js';
import { initFaq } from './faq.js';
import { initFooter } from './footer.js';
import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const hero = $('hero');

/* иконки, заданные в разметке как data-ico */
document.querySelectorAll('#hero [data-ico]').forEach((el) => { el.innerHTML = ico(el.dataset.ico); });

/* главный экран: DOM-логика работает сразу, маскот подключается, когда загрузятся его кадры */
const heroCtl = initHero(null);
(async () => {
  try {
    const { createMascot } = await import('./mascot.js');
    heroCtl.setScene(await createMascot($('mascot'), hero, $('hStage'), $('hSoft')));
  } catch (err) {
    console.warn('Маскот не загрузился:', err);
  }
})();

/* демо агента */
initDemo();

initProducts();

initContact();

initCalc();

initCases();

initFaq();

initFooter();

initNav();

/* motion: появление блоков и вступление hero */
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!calm) {
  document.documentElement.classList.add('motion-ready');
  animate('.h-copy .eyebrow, .hero h1', { opacity: [0, 1], y: [28, 0] }, { delay: stagger(0.12), duration: 0.9, ease: [0.2, 0.8, 0.2, 1] });
  scroll(animate('#progress', { scaleX: [0, 1] }, { ease: 'linear' }));
  inView('.reveal', (el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    const d = Math.max(0, sibs.indexOf(el)) * 0.1;
    const a = animate(el, { opacity: [0, 1], y: [48, 0] }, { type: 'spring', stiffness: 120, damping: 18, delay: d });
    a.finished.then(() => { el.style.removeProperty('transform'); el.style.removeProperty('translate'); });
  }, { amount: 0.2 });
  // страховка: если что-то не успело появиться
  setTimeout(() => document.querySelectorAll('.reveal').forEach((el) => { if (getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < window.innerHeight) el.style.opacity = '1'; }), 4000);
}

/* «шторка»: демо выезжает и накладывается на главный экран */
if (!calm) {
  const under = hero, over = $('demo');
  const pin = () => { under.style.top = Math.min(0, window.innerHeight - under.offsetHeight) + 'px'; };
  pin();
  if (window.ResizeObserver) new ResizeObserver(pin).observe(under);
  window.addEventListener('resize', pin);
  scroll((p) => {
    under.style.setProperty('--cover', p.toFixed(3));
    // полностью закрытый экран не анимируем и не рисуем
    if (p >= 1) under.dataset.covered = '1'; else delete under.dataset.covered;
  }, { target: over, offset: ['start end', 'start start'] });
}

/* прокрутка: у каждого стыка блоков свой характер. Значения 0..1 уходят в CSS-переменные */
if (!calm) {
  const bind = (el, name, offset, target = el) => el && scroll((p) => el.style.setProperty(name, p.toFixed(3)), { target, offset });
  bind($('calc'), '--rv', ['start end', 'start 0.15']);                     // лаймовый фон разливается кругом
  bind($('pcards'), '--fan', ['start end', 'start 0.55']);                  // карточки продуктов съезжаются веером
  bind($('faq'), '--fq', ['start end', 'start 0.35']);                      // чат доворачивается на место
  bind($('contact'), '--in', ['start end', 'start 0.25']);                  // тёмная карточка растягивается на всю ширину
  // параллакс фоновых фигур: каждая сдвигается от прокрутки своей секции и от курсора, сила зависит от её «глубины» (--d в CSS)
  document.querySelectorAll('.demo-deco, .prod-deco, .c-deco, .deco').forEach((deco) => {
    const sec = deco.parentElement;
    scroll((p) => deco.style.setProperty('--sp', (p - 0.5).toFixed(3)), { target: sec, offset: ['start end', 'end start'] });
    sec.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = sec.getBoundingClientRect();
      deco.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      deco.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  });
}

$('year').textContent = new Date().getFullYear();
