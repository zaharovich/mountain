#!/bin/bash

echo "🚀 ДЕПЛОЙ TELEGRAM INTEGRATION НА RAILWAY"
echo "=========================================="
echo ""

cd /Users/zaharbelousenko/Downloads/store-loc-clear

git add server.js
git add store/js/app.js

git commit -m "✨ Додано відправку запитів на партнерство в Telegram

- Endpoint /api/send-partner-request в server.js
- Автоматична відправка координат у Telegram чат
- Оновлено sendPartnerRequest() в app.js"

echo ""
echo "📤 Відправка на GitHub..."
git push origin main

echo ""
echo "✅ ГОТОВО!"
echo ""
echo "Тепер Railway автоматично задеплоїть оновлення!"
echo "Зачекай 1-2 хвилини і тестуй на https://mountain.limited/store/"
echo ""

