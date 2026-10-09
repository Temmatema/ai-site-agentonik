// Заголовок секции: один раз проявляется слева направо, как и всё движение на странице.
// Маска лежит на вложенном span: сам h2 остаётся видимым для наблюдателя прокрутки.
import { motion } from 'motion/react';

const wipe = {
  hide: { clipPath: 'inset(0 100% 0 0)' },
  show: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

export default function Title({ children, className = '' }) {
  return (
    <motion.h2 className={className} initial="hide" whileInView="show" viewport={{ once: true, amount: 0.5 }}>
      <motion.span className="h2-in" variants={wipe}>{children}</motion.span>
    </motion.h2>
  );
}
