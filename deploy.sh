#!/bin/bash

echo "🚀 ДЕПЛОЙ НА GITHUB"
echo "===================="
echo ""

# Переходим в директорію
cd /Users/zaharbelousenko/Downloads/store-loc-clear

# Git init
echo "📦 Ініціалізація Git..."
git init

# Додаємо всі файли
echo "📁 Додаємо файли..."
git add .

# Коммит
echo "💾 Створюємо коміт..."
git commit -m "Store Locator API with 1C proxy"

# Додаємо remote
echo "🔗 Підключаємо GitHub репозиторій..."
git remote add origin https://github.com/zaharovich/mountain.git 2>/dev/null || git remote set-url origin https://github.com/zaharovich/mountain.git

# Push
echo "⬆️  Завантажуємо на GitHub..."
git branch -M main
git push -u origin main --force

echo ""
echo "✅ ГОТОВО!"
echo ""
echo "Тепер:"
echo "1. Зайди на https://railway.app/"
echo "2. New Project → Deploy from GitHub repo"
echo "3. Вибери 'mountain'"
echo "4. Settings → Generate Domain"
echo "5. Пришли мені URL!"
echo ""

