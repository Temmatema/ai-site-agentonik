// Бегущая строка-пауза между первым экраном и демо: откуда приходят заявки и что агент с ними делает.
const ITEMS = ['Telegram', 'WhatsApp', 'Почта', 'Авито', 'Чат на сайте', 'Запись в CRM', 'Отчёты и сводки', 'Передача менеджеру'];

const Star = () => <svg className="mq-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c.9 6.2 3.8 9.100 11 11-7.200 1.900-10.100 4.800-11 11-.9-6.200-3.800-9.100-11-11 7.200-1.900 10.100-4.800 11-11z" /></svg>;

export default function Marquee() {
  const row = (hidden) => (
    <ul aria-hidden={hidden || undefined}>
      {ITEMS.map((t) => <li key={t}>{t}<Star /></li>)}
    </ul>
  );
  return (
    <div className="mq" role="presentation">
      <div className="mq-track">{row(false)}{row(true)}{row(true)}</div>
    </div>
  );
}
