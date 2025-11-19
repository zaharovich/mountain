const fs = require('fs');

// Читаем файл
const buffer = fs.readFileSync('remote-data.json');

// Удаляем BOM
let data = buffer;
if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    data = buffer.slice(3);
}

const jsonString = data.toString('utf8');
const json = JSON.parse(jsonString);

console.log('=== СТАТИСТИКА ===');
console.log('Городов:', json.cities.length);
console.log('Магазинов:', json.shops.length);
console.log('Продуктов:', json.products.length);

console.log('\n=== ПЕРВЫЙ МАГАЗИН ===');
console.log(JSON.stringify(json.shops[0], null, 2));

console.log('\n=== ВСЕ 11 ПРОДУКТОВ ===');
json.products.forEach((p, i) => {
    console.log(`${i + 1}. [${p.id}] ${p.title}`);
});

console.log('\n=== ПРОВЕРКА КООРДИНАТ ===');
const firstShop = json.shops[0];
console.log('map field:', firstShop.map);
console.log('Есть ли координаты?', firstShop.map ? 'ДА' : 'НЕТ (ПУСТО!)');

// Проверяем сколько магазинов БЕЗ координат
const withoutCoords = json.shops.filter(s => !s.map || s.map === '').length;
console.log(`\nМагазинов БЕЗ координат: ${withoutCoords} из ${json.shops.length}`);
