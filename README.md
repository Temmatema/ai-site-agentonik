# АгентникАИ

Сайт ИИ-агентов для бизнеса: Vite + three.js.

## Запуск

Нужен Node.js 20+ (https://nodejs.org).

```bash
npm install
npm run dev      # разработка, http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # проверить сборку
```

## Структура

- `index.html` — разметка: hero, демо агента, продукты, форма
- `src/scene.js` — 3D-сцена (робот и заявки), three.js
- `src/demo.js` — интерактивное демо «агент разбирает заявку»
- `src/data.js` — тексты заявок
- `src/main.js` — связка интерфейса и сцены
- `src/style.css` — стили и дизайн-токены в `:root`
