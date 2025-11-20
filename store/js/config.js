const CONFIG = {
    API_ENDPOINT: 'http://45.154.116.216:3240/tt.json',
    BACKEND_URL: 'http://localhost:3000',
    
    SEARCH_RADIUS: [3, 6, 10, 20],
    MIN_SHOPS_TO_SHOW: 10,
    
    IP_LOCATION_CACHE_KEY: 'ipLocationCache',
    MAX_LOCATIONS_PER_IP: 3,
    LOCATION_CACHE_TTL: 24 * 60 * 60 * 1000,
    
    TIMEZONE: 'Europe/Kyiv',
    
    ENCRYPTION_KEY: 'store-locator-secret-key-2025',
    
    TELEGRAM_WEBHOOK_URL: 'http://localhost:3000/api/telegram/notify',
    
    PRODUCT_CATEGORIES: {}
};
