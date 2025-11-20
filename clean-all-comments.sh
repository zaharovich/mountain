#!/bin/bash

echo "🧹 ПОВНА ОЧИСТКА КОДУ (коментарі + console.log)"
echo "================================================"
echo ""

cd /Users/zaharbelousenko/Downloads/store-loc-clear/store/js

for js_file in *.js; do
    if [ -f "$js_file" ]; then
        echo "📄 Обробка: $js_file"
        
        # Використовуємо Node.js для точного видалення
        node -e "
const fs = require('fs');
const file = '$js_file';
let code = fs.readFileSync(file, 'utf8');

// 1. Видаляємо console.* (всі варіанти)
code = code.replace(/console\\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd)\\([^)]*\\);?\\s*/g, '');

// 2. Видаляємо багаторядкові коментарі /** ... */
code = code.replace(/\\/\\*\\*[\\s\\S]*?\\*\\//g, '');

// 3. Видаляємо звичайні багаторядкові коментарі /* ... */
code = code.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');

// 4. Видаляємо однорядкові коментарі //
code = code.replace(/\\/\\/.*$/gm, '');

// 5. Видаляємо порожні рядки (більше 2 підряд)
code = code.replace(/\\n\\s*\\n\\s*\\n+/g, '\\n\\n');

// 6. Видаляємо пробіли в кінці рядків
code = code.replace(/[ \\t]+$/gm, '');

// 7. Видаляємо порожні рядки на початку файлу
code = code.replace(/^\\s*\\n+/, '');

fs.writeFileSync(file, code, 'utf8');
console.log('  ✓ Очищено');
"
    fi
done

echo ""
echo "✅ ГОТОВО! Весь код очищено!"
echo ""


