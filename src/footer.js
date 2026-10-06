// Подвал: маленький робот следит глазами за курсором, а при наведении на соцсеть
// поворачивается к ней и меняет реплику. На устройствах без наведения реплики идут по кругу.
import { animate } from 'motion';
import { ico } from './icons.js';

export function initFooter() {
  const foot = document.getElementById('footer'), bot = document.getElementById('ftBot'), say = document.getElementById('ftSay');
  if (!foot || !bot || !say) return;
  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  foot.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = ico(el.dataset.ico); });

  const links = [...foot.querySelectorAll('.ft-s')];
  const idle = say.textContent;
  let cur = idle;

  function speak(text) {
    if (text === cur) return;
    cur = text; say.textContent = text;
    if (!calm) animate(say, { opacity: [0, 1], y: [6, 0], scale: [0.96, 1] }, { duration: 0.3, ease: 'easeOut' });
  }
  // глаза смещаются в сторону точки (в пикселях окна), но не дальше края визора
  function look(x, y) {
    const r = bot.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 220);
    bot.style.setProperty('--ex', ((dx / d) * 7 * k).toFixed(1) + 'px');
    bot.style.setProperty('--ey', ((dy / d) * 4 * k).toFixed(1) + 'px');
  }
  const rest = () => { bot.style.setProperty('--ex', '0px'); bot.style.setProperty('--ey', '0px'); };

  foot.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') look(e.clientX, e.clientY); });
  foot.addEventListener('pointerleave', () => { rest(); speak(idle); });
  links.forEach((a) => {
    const on = () => { speak(a.dataset.say); const r = a.getBoundingClientRect(); look(r.left + r.width / 2, r.top + r.height / 2); };
    a.addEventListener('pointerenter', on);
    a.addEventListener('focus', on);
    a.addEventListener('pointerleave', () => speak(idle));
    a.addEventListener('blur', () => { speak(idle); rest(); });
  });

  // на телефоне наведения нет: робот сам по очереди «показывает» на соцсети, пока подвал на экране
  if (matchMedia('(hover: none)').matches && !calm && 'IntersectionObserver' in window) {
    let i = 0, timer = 0;
    const step = () => {
      links.forEach((a) => a.classList.remove('is-hint'));
      const a = links[i % links.length]; i++;
      a.classList.add('is-hint');
      speak(a.dataset.say);
      const r = a.getBoundingClientRect(); look(r.left + r.width / 2, r.top + r.height / 2);
    };
    new IntersectionObserver((en) => {
      clearInterval(timer);
      if (en[0].isIntersecting) timer = setInterval(step, 2600);
    }, { threshold: 0.4 }).observe(foot);
  }
}
