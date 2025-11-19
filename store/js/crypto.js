/**
 * Простое шифрование с XOR и Base64
 * Для 1С выгрузки (store-locator)
 * 
 * Процесс шифрования: JSON -> XOR (с ключом) -> Base64
 * Процесс расшифровки: Base64 -> XOR (с ключом) -> JSON
 * 
 * Преимущества: простое, быстрое, легко интегрируется в 1С и WordPress
 */

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// Ключ для XOR - можно генерировать на 1С стороне
// Важно: ОДИНАКОВЫЙ КЛЮЧ должен использоваться везде (1С, Frontend, WordPress)
const ENCRYPTION_KEY = 'store-locator-secret-2025';

// ============================================
// XOR ШИФРОВАНИЕ
// ============================================

/**
 * Простое XOR шифрование (побайтовое)
 * @param {string} text - Текст для шифрования
 * @param {string} key - Ключ шифрования
 * @returns {string} Зашифрованная строка
 */
function xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
            text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return result;
}

/**
 * Расшифрование XOR (симметричная операция)
 * XOR расшифровывается точно так же как шифруется
 * @param {string} encrypted - Зашифрованная строка
 * @param {string} key - Ключ шифрования
 * @returns {string} Расшифрованный текст
 */
function xorDecrypt(encrypted, key) {
    return xorEncrypt(encrypted, key); // XOR - обратимая операция
}

// ============================================
// BASE64 КОДИРОВАНИЕ
// ============================================

/**
 * Кодирование строки в Base64 (поддержка Unicode)
 * @param {string} str - Строка для кодирования
 * @returns {string} Base64 строка
 */
function toBase64(str) {
    try {
        // encodeURIComponent -> escape -> btoa обеспечивает работу с Unicode
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.error('Ошибка кодирования Base64:', e);
        return null;
    }
}

/**
 * Декодирование Base64 в строку (поддержка Unicode)
 * @param {string} encoded - Base64 строка
 * @returns {string} Декодированная строка
 */
function fromBase64(encoded) {
    try {
        return decodeURIComponent(escape(atob(encoded)));
    } catch (e) {
        console.error('Ошибка декодирования Base64:', e);
        return null;
    }
}

// ============================================
// ПУБЛИЧНЫЙ API
// ============================================

/**
 * Шифрование данных (объект -> JSON -> XOR -> Base64)
 * 
 * @param {object|array} data - Данные для шифрования
 * @param {string} key - Опциональный ключ (по умолчанию ENCRYPTION_KEY)
 * @returns {string} Зашифрованная Base64 строка готовая для передачи
 * 
 * @example
 * const encrypted = encryptData({shops: [...]});
 * console.log(encrypted); // Base64 строка
 */
function encryptData(data, key = ENCRYPTION_KEY) {
    try {
        if (!data) throw new Error('Нет данных для шифрования');
        
        // 1. Преобразуем объект в JSON строку
        const jsonStr = JSON.stringify(data);
        
        // 2. Шифруем XOR
        const xorEncrypted = xorEncrypt(jsonStr, key);
        
        // 3. Кодируем в Base64 для безопасной передачи
        const base64Encrypted = toBase64(xorEncrypted);
        
        return base64Encrypted;
    } catch (error) {
        console.error('Ошибка при шифровании:', error);
        return null;
    }
}

/**
 * Расшифрование данных (Base64 -> XOR -> JSON -> объект)
 * 
 * @param {string} encrypted - Зашифрованная Base64 строка
 * @param {string} key - Опциональный ключ (по умолчанию ENCRYPTION_KEY)
 * @returns {object|array|null} Расшифрованные данные или null если ошибка
 * 
 * @example
 * const data = decryptData(encryptedString);
 * console.log(data.shops); // Доступ к данным
 */
function decryptData(encrypted, key = ENCRYPTION_KEY) {
    try {
        if (!encrypted || typeof encrypted !== 'string') {
            throw new Error('Некорректный формат зашифрованных данных');
        }

        // 1. Декодируем Base64
        const xorEncrypted = fromBase64(encrypted);
        if (!xorEncrypted) throw new Error('Ошибка Base64 декодирования');

        // 2. Расшифровываем XOR
        const jsonStr = xorDecrypt(xorEncrypted, key);

        // 3. Парсим JSON
        const data = JSON.parse(jsonStr);

        return data;
    } catch (error) {
        console.error('Ошибка расшифровки:', error);
        return null;
    }
}

/**
 * Проверка целостности зашифрованных данных
 * Пытается расшифровать и спарсить как JSON
 * 
 * @param {string} encrypted - Зашифрованная строка
 * @param {string} key - Ключ для попытки расшифровки
 * @returns {boolean} true если данные корректные и расшифровываются
 */
function isValidEncryptedData(encrypted, key = ENCRYPTION_KEY) {
    const decrypted = decryptData(encrypted, key);
    return decrypted !== null;
}

/**
 * Генерация простого хеша для контрольной суммы
 * Используется для проверки не изменились ли данные
 * @param {string} str - Строка для хеширования
 * @returns {string} Хеш (hex)
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

// ============================================
// ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ
// ============================================

// Для использования в CommonJS (Node.js/Express)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encryptData,
        decryptData,
        isValidEncryptedData,
        xorEncrypt,
        xorDecrypt,
        toBase64,
        fromBase64,
        simpleHash,
        ENCRYPTION_KEY
    };
}
