/**
 * Скрипт для генерации зашифрованного JSON файла с тестовыми данными
 * Запуск: node generate-encrypted-data.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// КОНФИГУРАЦИЯ (копия из crypto.js)
// ============================================
const ENCRYPTION_KEY = 'store-locator-secret-2025';

// ============================================
// XOR ШИФРОВАНИЕ
// ============================================
function xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
            text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return result;
}

// ============================================
// BASE64 КОДИРОВАНИЕ
// ============================================
function toBase64(str) {
    // Конвертируем в binary string, затем в base64 (совместимо с браузером)
    const binaryString = Array.from(str).map(char => 
        String.fromCharCode(char.charCodeAt(0))
    ).join('');
    return Buffer.from(binaryString, 'binary').toString('base64');
}

// ============================================
// ФУНКЦИЯ ШИФРОВАНИЯ
// ============================================
function encryptData(data, key = ENCRYPTION_KEY) {
    try {
        // 1. JSON строка
        const jsonStr = JSON.stringify(data);
        
        // 2. XOR шифрование
        const xorEncrypted = xorEncrypt(jsonStr, key);
        
        // 3. Base64
        const base64Encrypted = toBase64(xorEncrypted);
        
        return base64Encrypted;
    } catch (error) {
        console.error('Ошибка шифрования:', error);
        return null;
    }
}

// ============================================
// ТЕСТОВЫЕ ДАННЫЕ
// ============================================
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

// ============================================
// ГЕНЕРАЦИЯ И СОХРАНЕНИЕ
// ============================================
console.log('🔐 Генерация зашифрованного JSON...');
console.log('Данные:', JSON.stringify(TEST_DATA, null, 2));

const encrypted = encryptData(TEST_DATA);

if (encrypted) {
    const output = {
        data: encrypted,
        timestamp: new Date().toISOString()
    };
    
    const outputPath = path.join(__dirname, 'assets', 'tt.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log('✅ Файл успешно создан:', outputPath);
    console.log('📦 Размер зашифрованных данных:', encrypted.length, 'символов');
    console.log('📄 Содержимое файла:', JSON.stringify(output, null, 2));
} else {
    console.error('❌ Ошибка при шифровании данных');
}
