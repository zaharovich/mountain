const ENCRYPTION_KEY = 'store-locator-secret-2025';

function xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
            text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return result;
}

function xorDecrypt(encrypted, key) {
    return xorEncrypt(encrypted, key);
}

function toBase64(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return null;
    }
}

function fromBase64(encoded) {
    try {
        return decodeURIComponent(escape(atob(encoded)));
    } catch (e) {
        return null;
    }
}

function encryptData(data, key = ENCRYPTION_KEY) {
    try {
        if (!data) throw new Error('Нет данных для шифрования');
        
        const jsonStr = JSON.stringify(data);
        
        const xorEncrypted = xorEncrypt(jsonStr, key);
        
        const base64Encrypted = toBase64(xorEncrypted);
        
        return base64Encrypted;
    } catch (error) {
        return null;
    }
}

function decryptData(encrypted, key = ENCRYPTION_KEY) {
    try {
        if (!encrypted || typeof encrypted !== 'string') {
            throw new Error('Некорректный формат зашифрованных данных');
        }

        const xorEncrypted = fromBase64(encrypted);
        if (!xorEncrypted) throw new Error('Ошибка Base64 декодирования');

        const jsonStr = xorDecrypt(xorEncrypted, key);

        const data = JSON.parse(jsonStr);

        return data;
    } catch (error) {
        return null;
    }
}

function isValidEncryptedData(encrypted, key = ENCRYPTION_KEY) {
    const decrypted = decryptData(encrypted, key);
    return decrypted !== null;
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

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
