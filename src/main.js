import { animate, inView, scroll, stagger } from 'motion';
import { initDemo } from './demo.js';

const $ = (id) => document.getElementById(id);
const hero = $('hero'), hint = $('heroHint'), barNote = $('barNote'), live = $('live');
const tgChaos = $('tgChaos'), tgOrder = $('tgOrder');
const nLost = $('nLost'), nHours = $('nHours');

const TEXT = {
  chaos: {
    note: 'Заявки теряются, отчёты горят, команда тонет в рутине. <span>Цифры условные.</span>',
    hint: 'Кликните по любой заявке — агент разберёт её.',
    live: 'Режим: вручную. Заявки теряются, рутина растёт.',
  },
  order: {
    note: 'Агенты отвечают клиентам, собирают отчёты и разбирают почту. Вы видите результат. <span>Цифры условные.</span>',
    hint: 'Всё разобрано. Нажмите «Вручную», чтобы увидеть, как было.',
    live: 'Режим: с агентами. Заявки обработаны, рутина сократилась.',
  },
};

/* цифры в панели следят за долей разобранных заявок в сцене */
let target = 0, shown = 0, rafId = 0;
function paintStats(f) {
  nLost.textContent = String(Math.round(37 * (1 - f)));
  nHours.textContent = Math.round(62 - 53 * f) + ' ч';
}
function chase() {
  shown += (target - shown) * 0.12;
  if (Math.abs(target - shown) < 0.004) shown = target;
  paintStats(shown);
  rafId = shown === target ? 0 : requestAnimationFrame(chase);
}
function setProgress(f) { target = f; if (!rafId) rafId = requestAnimationFrame(chase); }

/* режим интерфейса */
let uiMode = 'chaos';
function setUi(mode) {
  if (mode === uiMode) return;
  uiMode = mode;
  const order = mode === 'order';
  hero.dataset.state = mode;
  tgChaos.setAttribute('aria-checked', String(!order)); tgOrder.setAttribute('aria-checked', String(order));
  tgChaos.tabIndex = order ? -1 : 0; tgOrder.tabIndex = order ? 0 : -1;
  live.textContent = TEXT[mode].live;
  [barNote, hint].forEach((el) => el.classList.add('fade'));
  setTimeout(() => {
    barNote.innerHTML = TEXT[mode].note; hint.textContent = TEXT[mode].hint;
    [barNote, hint].forEach((el) => el.classList.remove('fade'));
  }, 220);
}

/* 3D-сцена (если WebGL недоступен, остаётся рабочий переключатель с цифрами) */
let scene = null;
(async () => {
  try {
    const { createHeroScene } = await import('./scene.js');
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([document.fonts.load('600 40px Onest'), document.fonts.load('700 22px "JetBrains Mono"')]),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    }
    scene = createHeroScene($('scene'), {
      onProgress: (f) => setProgress(f),
      onMode: (m) => setUi(m),
    });
  } catch (err) {
    console.warn('3D-сцена недоступна:', err);
    hero.classList.add('is-fallback');
  }
})();

function choose(mode) {
  if (scene) scene.setMode(mode); else setProgress(mode === 'order' ? 1 : 0);
  setUi(mode);
}
tgChaos.addEventListener('click', () => choose('chaos'));
tgOrder.addEventListener('click', () => choose('order'));
$('toggle').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); choose('order'); tgOrder.focus(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); choose('chaos'); tgChaos.focus(); }
});

/* демо агента */
initDemo();

/* лёгкий 3D-наклон карточек продуктов */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* форма: пока прототип, ничего не отправляет */
$('ctaForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const msg = $('formMsg');
  if (!f.elements.name.value.trim() || !f.elements.contact.value.trim()) { msg.textContent = 'Укажите имя и как с вами связаться.'; return; }
  msg.textContent = `Спасибо, ${f.elements.name.value.trim()}! Это прототип: заявка пока никуда не отправляется.`;
});

/* motion: появление блоков и вступление hero */
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!calm) {
  document.documentElement.classList.add('motion-ready');
  animate('.hero-copy .eyebrow, .hero h1', { opacity: [0, 1], y: [28, 0] }, { delay: stagger(0.12), duration: 0.9, ease: [0.2, 0.8, 0.2, 1] });
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

$('year').textContent = new Date().getFullYear();
