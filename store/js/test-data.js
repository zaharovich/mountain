/**
 * Тестовые данные для разработки
 * Используйте это для локального тестирования ДО подключения 1С сервера
 */

const TEST_DATA = {
    cities: [
        { name: "Харків", id: "1" },
        { name: "Львів", id: "2" },
        { name: "Київ", id: "3" }
    ],
    
    shops: [
        {
            id: "1380",
            name: "Магазин \"Смак\" на вул. Тернопільська",
            map: "https://www.google.com/maps/place/50.0056,36.2345",
            products: [
                { id: "130", timestamp: "2025-01-10" },
                { id: "174", timestamp: "2025-01-08" }
            ]
        },
        {
            id: "1381",
            name: "Лавка здоров'я на проспекті Гагаріна",
            map: "https://www.google.com/maps/place/50.0105,36.2456",
            products: [
                { id: "130", timestamp: "2025-01-11" },
                { id: "182", timestamp: "2025-01-09" }
            ]
        },
        {
            id: "1382",
            name: "Органіка маркет на вул. Совєцькій",
            map: "https://www.google.com/maps/place/50.0045,36.2234",
            products: [
                { id: "174", timestamp: "2024-11-01" },
                { id: "182", timestamp: "2024-11-15" }
            ]
        },
        {
            id: "1383",
            name: "Супермаркет \"Родина\" на вул. Червоні Казарми",
            map: "https://www.google.com/maps/place/50.0200,36.2500",
            products: [
                { id: "130", timestamp: "2025-01-12" }
            ]
        },
        {
            id: "1384",
            name: "Крамниця біо-продуктів на вул. Шевченка",
            map: "https://www.google.com/maps/place/49.9945,36.2345",
            products: [
                { id: "182", timestamp: "2025-01-05" },
                { id: "174", timestamp: "2024-12-25" }
            ]
        }
    ],
    
    products: [
        {
            id: "130",
            title: "Горішки"
        },
        {
            id: "174",
            title: "Морозиво веган"
        },
        {
            id: "182",
            title: "Прянеспеченя"
        }
    ]
};

/**
 * Функция для шифрования тестовых данных
 * Используйте это для генерации тестового зашифрованного JSON
 */
function generateTestEncryptedData() {
    const encrypted = encryptData(TEST_DATA);
    const payload = {
        data: encrypted,
        timestamp: new Date().toISOString()
    };
    
    console.log('Тестовый зашифрованный JSON для использования на сервере:');
    console.log(JSON.stringify(payload, null, 2));
    
    return payload;
}

/**
 * Для тестирования НУЖНО:
 * 1. Откомментировать следующие строки в index.html после crypto.js:
 *    <script src="js/test-data.js"></script>
 * 
 * 2. В консоли браузера запустить:
 *    generateTestEncryptedData()
 * 
 * 3. Скопировать результат и использовать как mock сервера
 */

// Для автоматического тестирования расшифровки:
function testDecryption() {
    console.log('[Test] Тестирование шифрования/расшифровки...');
    
    const encrypted = encryptData(TEST_DATA);
    console.log('[Test] Зашифрованные данные:', encrypted);
    
    const decrypted = decryptData(encrypted);
    console.log('[Test] Расшифрованные данные:', decrypted);
    
    const match = JSON.stringify(decrypted) === JSON.stringify(TEST_DATA);
    console.log('[Test] ✓ Данные совпадают:', match);
    
    return match;
}

// Запустить тест при загрузке
console.log('%c[TEST DATA] Модуль тестовых данных загружен', 'color: green; font-weight: bold');
console.log('Доступные функции: generateTestEncryptedData(), testDecryption()');
