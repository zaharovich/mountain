const http = require('http');
const fs = require('fs');

console.log('Загружаем данные через прокси...\n');

http.get('http://localhost:3000/api/remote-tt.json', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            
            console.log('=== СТАТИСТИКА ===');
            console.log('Городов:', json.cities.length);
            console.log('Магазинов:', json.shops.length);
            console.log('Продуктов:', json.products.length);
            
            console.log('\n=== ПЕРВЫЙ МАГАЗИН ===');
            console.log(JSON.stringify(json.shops[0], null, 2));
            
            console.log('\n=== ВСЕ ПРОДУКТЫ ===');
            json.products.forEach((p, i) => {
                console.log(`${i + 1}. [${p.id}] ${p.title}`);
            });
            
            console.log('\n=== ПРОВЕРКА КООРДИНАТ ===');
            const firstShop = json.shops[0];
            console.log('map field:', firstShop.map || '(ПУСТО)');
            
            // Проверяем сколько магазинов БЕЗ координат
            const withoutCoords = json.shops.filter(s => !s.map || s.map === '').length;
            const withCoords = json.shops.length - withoutCoords;
            console.log(`\nМагазинов С координатами: ${withCoords}`);
            console.log(`Магазинов БЕЗ координат: ${withoutCoords}`);
            
        } catch (error) {
            console.error('Ошибка:', error);
        }
    });
}).on('error', (error) => {
    console.error('Ошибка запроса:', error);
});
