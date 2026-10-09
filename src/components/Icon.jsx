import { ICONS } from '../icons.js';

// Линейные иконки 24×24 из общего набора; варианты *Fill и tgPlane рисуются заливкой.
export default function Icon({ name, className = '' }) {
  const fill = name.endsWith('Fill') || name === 'tgPlane';
  return <svg className={`i ${fill ? 'f ' : ''}${className}`} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
