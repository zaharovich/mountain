#!/bin/bash

echo "🔧 ВИПРАВЛЯЄМО СТРУКТУРУ ДЛЯ RAILWAY"
echo "====================================="
echo ""

# Створюємо нову папку
cd /Users/zaharbelousenko/Downloads
mkdir -p railway-api
cd railway-api

# Копіюємо ТІЛЬКИ потрібні файли
echo "📦 Копіюємо потрібні файли..."
cp ../store-loc-clear/server.js .
cp ../store-loc-clear/package.json .

# Створюємо .gitignore
echo "📝 Створюємо .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
.env
.DS_Store
*.log
EOF

# Git init
echo "🔧 Ініціалізація Git..."
git init

# Додаємо файли
echo "📁 Додаємо файли..."
git add .

# Коммит
echo "💾 Створюємо коміт..."
git commit -m "Railway API: server.js only"

# Додаємо remote (видаляємо старий якщо є)
echo "🔗 Підключаємо GitHub..."
git remote add origin https://github.com/zaharovich/mountain.git 2>/dev/null || git remote set-url origin https://github.com/zaharovich/mountain.git

# Force push (перезаписуємо старий код)
echo "⬆️  Завантажуємо на GitHub (перезапис)..."
git branch -M main
git push -u origin main --force

echo ""
echo "✅ ГОТОВО!"
echo ""
echo "Тепер Railway автоматично ПЕРЕЗАПУСТИТЬ деплой!"
echo ""
echo "Через 1-2 хвилини:"
echo "1. Оновіть сторінку Railway"
echo "2. Має бути ACTIVE (зелений)"
echo "3. Settings → Generate Domain"
echo "4. Пришліть мені URL!"
echo ""

