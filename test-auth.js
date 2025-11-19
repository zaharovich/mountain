// Тест доступа к защищенному JSON
const http = require('http');

const username = 'ItsLogin!#%Motherfucker';
const password = 'ThatIs%Passoword99123~';
const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

console.log('Тестируем доступ к защищенному JSON...');
console.log('URL: http://45.154.116.216:3240/tt.json');
console.log('Authorization header:', auth.substring(0, 20) + '...\n');

const options = {
    hostname: '45.154.116.216',
    port: 3240,
    path: '/tt.json',
    method: 'GET',
    headers: {
        'Authorization': auth
    }
};

const req = http.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('');

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log('✅ Успешно! Авторизация прошла.');
                console.log('📊 Данные:');
                console.log('   - Городов:', json.cities?.length || 0);
                console.log('   - Магазинов:', json.shops?.length || 0);
                console.log('   - Продуктов:', json.products?.length || 0);
            } catch (error) {
                console.log('✅ Данные получены, но:', error.message);
                console.log('Первые 200 символов:', data.substring(0, 200));
            }
        } else if (res.statusCode === 401) {
            console.log('❌ Ошибка 401: Неверный логин или пароль');
        } else {
            console.log('❌ Ошибка:', res.statusCode);
            console.log('Ответ:', data.substring(0, 500));
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Ошибка запроса:', error.message);
});

req.end();
