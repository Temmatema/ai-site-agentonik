// Фоновое свечение раздела: размытые клубы света в цветах сайта, сложенные в диагональные полосы.
// За курсором ничего не ездит. Когда мышь подходит к свечению, оно ведёт себя как туман: ближние клубы
// плавно расходятся от курсора в разные стороны, расплываются и бледнеют, а потом так же плавно собираются обратно.
import { useEffect, useRef } from 'react';

// раскладка по разделам: [цвет, плотность, слева %, сверху %, ширина vw, поворот°]
const S = 'sage', C = 'coral';
const SETS = {
  a: [[S, 0.24, 36, -12, 44, -32], [S, 0.26, 56, 2, 42, -32], [S, 0.2, 76, 20, 34, -32], [C, 0.12, -14, 52, 36, -24], [C, 0.1, 8, 68, 30, -24]],
  c: [[S, 0.2, 2, -14, 44, -14], [S, 0.22, 30, -8, 46, -14], [S, 0.18, 60, -2, 40, -14], [S, 0.14, 50, 58, 36, -38], [S, 0.12, 72, 74, 30, -38]],
  d: [[C, 0.13, 50, -8, 38, 34], [C, 0.14, 68, 10, 36, 34], [S, 0.22, -18, 40, 40, 26], [S, 0.24, 4, 56, 38, 26], [S, 0.16, 26, 74, 30, 26]],
  e: [[S, 0.24, -18, -2, 42, -32], [S, 0.26, 2, 14, 40, -32], [S, 0.18, 24, 34, 32, -32], [S, 0.14, 58, 52, 34, -40], [S, 0.12, 78, 70, 28, -40]],
  f: [[S, 0.22, 30, 4, 44, -22], [S, 0.26, 52, 20, 42, -22], [S, 0.18, 74, 40, 34, -22], [C, 0.11, -18, -6, 36, -30], [C, 0.09, 2, 10, 30, -30]],
};
const REACH = 0.85;   // на каком расстоянии клуб чувствует курсор, в долях своей ширины
const PUSH = 0.34;    // насколько он отходит, в долях своей ширины
const EASE = 0.045;   // плавность: меньше — туман ленивее

export default function Glow({ variant = 'a' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current, host = el.parentElement;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover)').matches) return undefined;
    const puffs = [...el.children].map((node, i) => ({ node, x: 0, y: 0, f: 0, tx: 0, ty: 0, tf: 0, turn: i % 2 ? 1 : -1 }));
    let raf = 0;
    const tick = () => {
      let moving = false;
      puffs.forEach((p) => {
        p.x += (p.tx - p.x) * EASE; p.y += (p.ty - p.y) * EASE; p.f += (p.tf - p.f) * EASE;
        if (Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.3 || Math.abs(p.tf - p.f) > 0.003) moving = true;
        p.node.style.translate = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
        p.node.style.scale = (1 + p.f * 0.4).toFixed(3);
        p.node.style.opacity = (1 - p.f * 0.5).toFixed(3);
      });
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      puffs.forEach((p) => {
        const n = p.node, w = n.offsetWidth, cx = n.offsetLeft + w / 2, cy = n.offsetTop + n.offsetHeight / 2;
        const dx = cx - mx, dy = cy - my, d = Math.hypot(dx, dy) || 1, f = Math.max(0, 1 - d / (w * REACH)) ** 1.5;
        // клуб уходит от курсора и чуть вбок, у соседних — в разные стороны: так свет расползается, а не просто сдвигается
        const ux = dx / d, uy = dy / d;
        p.tx = (ux - uy * 0.55 * p.turn) * w * PUSH * f; p.ty = (uy + ux * 0.55 * p.turn) * w * PUSH * f; p.tf = f;
      });
      wake();
    };
    const leave = () => { puffs.forEach((p) => { p.tx = 0; p.ty = 0; p.tf = 0; }); wake(); };
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  }, []);

  return (
    <div className="glow" ref={ref} aria-hidden="true">
      {SETS[variant].map(([c, a, l, t, w, r], i) => (
        <i key={i} className="glow-b" style={{ '--c': `var(--${c}-rgb)`, '--a': a, left: `${l}%`, top: `${t}%`, width: `${w}vw`, rotate: `${r}deg` }}>
          <b style={{ animationDuration: `${17 + i * 3}s`, animationDelay: `${-i * 4}s` }} />
        </i>
      ))}
    </div>
  );
}
