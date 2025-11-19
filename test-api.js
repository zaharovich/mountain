/**
 * Тест доступу до 1С API
 */

const http = require('http');

const username = 'ItsLogin!#%Motherfucker';
const password = 'ThatIs%Passoword99123~';
const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

const options = {
  hostname: '45.154.116.216',
  port: 3240,
  path: '/tt.json',
  method: 'GET',
  headers: {
    'Authorization': auth,
    'User-Agent': 'Node.js Test Script'
  }
};

console.log('🔍 Тестуємо доступ до 1С API...');
console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('');

const req = http.request(options, (res) => {
  console.log('✅ ВІДПОВІДЬ ОТРИМАНО!');
  console.log('HTTP Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📦 Розмір відповіді:', data.length, 'байт');
    console.log('');

    try {
      const json = JSON.parse(data);
      console.log('✅ JSON ВАЛІДНИЙ!');
      console.log('');
      console.log('📊 Структура даних:');
      console.log('  - cities:', json.cities?.length || 0);
      console.log('  - shops:', json.shops?.length || 0);
      console.log('  - products:', json.products?.length || 0);
      console.log('');
      
      if (json.shops && json.shops.length > 0) {
        console.log('🏪 Перший магазин (приклад):');
        console.log(JSON.stringify(json.shops[0], null, 2));
      }
      
      console.log('');
      console.log('🎉 ВСЕ ПРАЦЮЄ! API доступний!');
      
    } catch (error) {
      console.error('❌ ПОМИЛКА ПАРСИНГУ JSON:');
      console.error(error.message);
      console.log('');
      console.log('📄 Перші 500 символів відповіді:');
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ПОМИЛКА З\'ЄДНАННЯ:');
  console.error(error.message);
  console.log('');
  console.log('💡 Можливі причини:');
  console.log('  - Сервер недоступний');
  console.log('  - Невірна адреса/порт');
  console.log('  - Файрвол блокує доступ');
});

req.end();

