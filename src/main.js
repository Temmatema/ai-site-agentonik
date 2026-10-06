import { animate, inView, scroll, stagger } from 'motion';
import { initDemo } from './demo.js';
import { initProducts } from './products.js';
import { initContact } from './contact.js';
import { initHero } from './hero.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const hero = $('hero');

/* иконки, заданные в разметке как data-ico */
document.querySelectorAll('#hero [data-ico]').forEach((el) => { el.innerHTML = ico(el.dataset.ico); });

/* главный экран: DOM-логика работает всегда, 3D подключается, если доступен WebGL */
const heroCtl = initHero(null);
(async () => {
  try {
    const { createHero3D } = await import('./hero3d.js');
    const scene3d = createHero3D($('scene'), hero, $('hStage'));
    heroCtl.setScene(scene3d);
  } catch (err) {
    console.warn('3D-сцена недоступна:', err);
    hero.classList.add('is-fallback');
  }
})();

/* демо агента */
initDemo();

initProducts();

initContact();

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

/* «шторка»: блок контактов выезжает и накладывается на продукты */
if (!calm) {
  const under = $('products'), over = $('contact');
  const pin = () => { under.style.top = Math.min(0, window.innerHeight - under.offsetHeight) + 'px'; };
  pin();
  if (window.ResizeObserver) new ResizeObserver(pin).observe(under);
  window.addEventListener('resize', pin);
  window.addEventListener('load', pin);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pin);
  [300, 1200].forEach((ms) => setTimeout(pin, ms)); // подстраховка: стили и шрифты могли доехать позже
  scroll((p) => {
    under.style.setProperty('--cover', p.toFixed(3));
    over.style.setProperty('--in', p.toFixed(3));
  }, { target: over, offset: ['start end', 'start start'] });
}

$('year').textContent = new Date().getFullYear();
