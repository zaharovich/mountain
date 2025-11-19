// Тест прокси-сервера
const http = require('http');

console.log('Проверка прокси-сервера...\n');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/remote-tt.json',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('✅ Успешно загружено!');
            console.log(`📊 Статистика:`);
            console.log(`   - Городов: ${json.cities?.length || 0}`);
            console.log(`   - Магазинов: ${json.shops?.length || 0}`);
            console.log(`   - Продуктов: ${json.products?.length || 0}`);
            
            console.log(`\n📦 Первые 15 продуктов:`);
            json.products.slice(0, 15).forEach((p, i) => {
                console.log(`   ${i + 1}. [${p.id}] ${p.title}`);
            });
            
            console.log(`\n🏪 Первые 3 магазина:`);
            json.shops.slice(0, 3).forEach((s, i) => {
                console.log(`   ${i + 1}. [${s.id}] ${s.name}`);
                console.log(`      Продукты: ${s.products.map(p => p.id).join(', ')}`);
            });
        } catch (error) {
            console.error('❌ Ошибка парсинга JSON:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Ошибка запроса:', error.message);
});

req.end();
