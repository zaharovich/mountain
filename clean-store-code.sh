#!/bin/bash

echo "🧹 ОЧИСТКА КОДУ В ПАПЦІ /store/js/"
echo "===================================="
echo ""

cd /Users/zaharbelousenko/Downloads/store-loc-clear/store/js

# Функція для очистки одного файлу
clean_file() {
    local file=$1
    echo "📄 Обробка: $file"
    
    # Створюємо тимчасовий файл
    local temp_file="${file}.tmp"
    
    # Видаляємо console.log, console.error і т.д.
    sed -E '/console\.(log|error|warn|info|debug|trace)/d' "$file" > "$temp_file"
    
    # Видаляємо однорядкові коментарі //
    sed -E 's|//.*$||g' "$temp_file" > "${temp_file}.2"
    mv "${temp_file}.2" "$temp_file"
    
    # Видаляємо багаторядкові коментарі /* */
    perl -pe 's|/\*.*?\*/||gs' "$temp_file" > "${temp_file}.2"
    mv "${temp_file}.2" "$temp_file"
    
    # Видаляємо порожні рядки (більше 2 підряд)
    cat "$temp_file" | cat -s > "${temp_file}.2"
    mv "${temp_file}.2" "$temp_file"
    
    # Заміняємо оригінал
    mv "$temp_file" "$file"
    
    echo "  ✓ Очищено"
}

# Обробляємо всі JS файли
for js_file in *.js; do
    if [ -f "$js_file" ]; then
        clean_file "$js_file"
    fi
done

echo ""
echo "✅ ГОТОВО! Всі JS файли в /store/js/ очищено!"
echo ""


