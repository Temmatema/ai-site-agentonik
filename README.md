# АгентникАИ

Сайт ИИ-агентов для бизнеса: Vite + React + Motion (бывший Framer Motion).

## Запуск

Нужен Node.js 20+ (https://nodejs.org).

```bash
npm install
npm run dev      # разработка, http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # проверить сборку
```

## Структура

- `index.html` — оболочка страницы и подключение шрифтов
- `src/main.jsx`, `src/App.jsx` — вход и порядок блоков
- `src/components/` — блоки страницы: `Hero`, `Marquee`, `Demo`, `Facts`, `Calc`, `Products`, `Cases`, `Faq`, `Contact`, `Footer`, `Nav`
- `src/data/` — тексты и данные блоков (заявки, сценарии, кейсы, вопросы)
- `src/mascot.js` — маскот главного экрана: следит глазами за курсором (кадры из видео в `src/mascot/`)
- `src/assets/` — стоп-кадры маскота для чата и подвала
- `src/task.js` — текст задачи, который блоки подставляют в форму заявки
- `src/style.css` — стили и дизайн-токены в `:root`

## Документы

- `PRODUCT.md` — что это за продукт, для кого, какие факты подтверждены
- `DESIGN.md` — дизайн-система сайта
- `archive/DESIGN-SYSTEM.md` — исходное описание системы по референсам из `references/`
- `archive/site-v1/` — прежняя версия сайта на ванильном JS
