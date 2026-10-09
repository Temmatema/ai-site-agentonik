export const SHARE = 0.7;      // какую долю времени на обработку заявок берёт на себя агент
export const WORKDAY = 8;      // часов в рабочем дне
export const num = (n) => Math.round(n).toLocaleString('ru-RU');
export const plural = (n, one, few, many) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
