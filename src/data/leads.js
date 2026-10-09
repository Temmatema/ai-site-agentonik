export const CH = {
  tg: { name: 'Telegram', cls: 'ch-tg', ico: 'tgPlane' },
  mail: { name: 'Почта', cls: 'ch-mail', ico: 'mail' },
  wa: { name: 'WhatsApp', cls: 'ch-wa', ico: 'chat' },
  call: { name: 'Звонок', cls: 'ch-call', ico: 'phone' },
  avito: { name: 'Авито', cls: 'ch-avito', ico: 'tag' },
  site: { name: 'Сайт', cls: 'ch-site', ico: 'globe' },
};

// вход: что пришло; out: во что агент превратил заявку
export const LEADS = [
  { ch: 'tg', time: '12:14', chip: 'Новый', text: 'Нужен ИИ-ассистент для продаж', out: { name: 'Иван Петров', hot: true, sub: 'ИИ-агент для продаж', st: 'Горячий лид', av: ['#f3c9a8', '#c98a64'] } },
  { ch: 'mail', time: '11:08', chip: 'Нет бюджета', text: 'Сколько стоит? Нужен прайс', out: { name: 'Анна Смирнова', sub: 'Внедрение для поддержки', st: 'В работе', av: ['#e9c7de', '#b97ba5'] } },
  { ch: 'wa', time: '10:45', chip: 'Холодный', text: 'Когда сможете начать?', out: { name: 'ООО «СтройИнвест»', org: true, sub: 'Автоматизация заявок', st: 'Квалификация', av: ['#cfd6dc', '#8e9aa4'] } },
  { ch: 'call', time: '09:12', chip: 'Не целевой', text: 'Уже работаем с подрядчиком', out: { name: 'Максим Кузнецов', sub: 'Нужна презентация', st: 'Ответ отправлен', av: ['#c9d6f0', '#7d93c4'] } },
  { ch: 'avito', time: '13:02', chip: 'Новый', text: 'Ещё актуально? Хочу демо', out: { name: 'Елена Орлова', sub: 'Чат-бот для магазина', st: 'Горячий лид', hot: true, av: ['#f3d6b8', '#c79c6a'] } },
  { ch: 'site', time: '13:20', chip: 'Новый', text: 'Нужен агент для записи в салон', out: { name: 'Студия «Лотос»', org: true, sub: 'Запись клиентов', st: 'В работе', av: ['#d7ecc8', '#8fbf74'] } },
  { ch: 'tg', time: '14:05', chip: 'Холодный', text: 'Есть интеграция с 1С?', out: { name: 'Дмитрий Волков', sub: 'Интеграция с 1С', st: 'Квалификация', av: ['#cfe0f3', '#7ba3cf'] } },
  { ch: 'mail', time: '14:31', chip: 'Новый', text: 'Пришлите, пожалуйста, КП', out: { name: 'Ольга Карпова', sub: 'КП на чат-бота', st: 'Ответ отправлен', av: ['#f0cfd6', '#c4808f'] } },
];

export const VISIBLE = 3;
export const HOURS_PER_LEAD = 0.1; // сколько часов команды условно экономит одна обработанная заявка
export const initials = (n) => n.replace(/[«»"]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
