#!/bin/bash
# Store Locator - Скрипт для запуску локального сервера

echo "🚀 Store Locator - HTTP Сервер"
echo "==============================="
echo ""

# Перевіряємо чи встановлений Node.js
if command -v node &> /dev/null; then
    echo "✓ Node.js знайдений"
    echo "Запускаємо сервер на http://localhost:8000"
    echo ""
    npx http-server -p 8000 -o
    exit 0
fi

# Перевіряємо Python 3
if command -v python3 &> /dev/null; then
    echo "✓ Python 3 знайдений"
    echo "Запускаємо сервер на http://localhost:8000"
    echo ""
    cd "$(dirname "$0")"
    python3 -m http.server 8000
    exit 0
fi

# Перевіряємо Python 2
if command -v python &> /dev/null; then
    echo "✓ Python знайдений"
    echo "Запускаємо сервер на http://localhost:8000"
    echo ""
    cd "$(dirname "$0")"
    python -m SimpleHTTPServer 8000
    exit 0
fi

echo "❌ Не знайдено Node.js або Python"
echo ""
echo "Встановіть одне з них:"
echo "  • Node.js: https://nodejs.org"
echo "  • Python: https://python.org"
exit 1
