// Конфігурація
const CONFIG = {
    // API endpoints
    API_ENDPOINT: 'http://45.154.116.216:3240/tt.json',
    BACKEND_URL: 'http://localhost:3000', // Для локальної розробки
    
    // Геопошук
    SEARCH_RADIUS: [3, 6, 10, 20], // км
    MIN_SHOPS_TO_SHOW: 10,
    
    // IP Protection
    IP_LOCATION_CACHE_KEY: 'ipLocationCache',
    MAX_LOCATIONS_PER_IP: 3, // Максимум унікальних локацій в радіусі 1км
    LOCATION_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 години в мс
    
    // Timezone
    TIMEZONE: 'Europe/Kyiv',
    
    // Шифрування
    ENCRYPTION_KEY: 'store-locator-secret-key-2025', // Замінити на реальний ключ
    
    // Telegram
    TELEGRAM_WEBHOOK_URL: 'http://localhost:3000/api/telegram/notify',
    
    // Product categories (default)
    PRODUCT_CATEGORIES: {}
};

// Debug mode
const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[Store Locator]', ...args);
    }
}
