// Шапка: сжимается после начала прокрутки, лаймовая плашка ездит под пунктом текущего
// раздела, глаза в логотипе следят за курсором, на узких экранах меню открывается кнопкой.

// какой пункт меню подсвечивать, пока на экране секция с этим id
const OWNER = { demo: '#demo', calc: '#demo', products: '#products', cases: '#cases', faq: '#faq', contact: '#contact' };

export function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('.nav-links a[href^="#"]:not(.btn)')];
  const pill = nav.querySelector('.nav-pill'), burger = document.getElementById('navBurger'), mark = nav.querySelector('.brand-mark');
  const secs = Object.keys(OWNER).map((id) => document.getElementById(id)).filter(Boolean);
  let active = null, queued = false;

  function movePill() {
    if (!pill) return;
    if (!active || !active.offsetParent) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = active.offsetWidth + 'px';
    pill.style.translate = active.offsetLeft + 'px 0';
  }
  function update() {
    queued = false;
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    // текущей считается последняя секция, верх которой уже выше 40% высоты экрана
    const line = window.innerHeight * 0.4;
    let cur = null;
    secs.forEach((s) => { if (s.getBoundingClientRect().top <= line) cur = s; });
    const next = cur ? links.find((a) => a.getAttribute('href') === OWNER[cur.id]) : null;
    if (next !== active) {
      if (active) active.removeAttribute('aria-current');
      active = next || null;
      if (active) active.setAttribute('aria-current', 'true');
    }
    movePill();
  }
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ask);
  update();

  /* глаза логотипа смотрят в сторону курсора */
  if (mark) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = mark.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160);
      mark.style.setProperty('--ex', ((dx / d) * 2.5 * k).toFixed(2) + 'px');
      mark.style.setProperty('--ey', ((dy / d) * 2 * k).toFixed(2) + 'px');
    }, { passive: true });
  }

  /* меню на узких экранах */
  if (burger) {
    const set = (open) => { nav.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', String(open)); };
    burger.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.querySelector('.nav-links').addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }
}
