/**
 * Data Manager
 * Управление загрузкой, кешированием и обновлением данных
 * с сервера 1С (http://45.154.116.216:3240/tt.json)
 */

class DataManager {
    constructor() {
        // Кешированные данные в памяти
        this.data = null;
        
        // Для localStorage кеширования
        this.CACHE_KEY = 'store-locator-data-v1';
        this.CACHE_TIMESTAMP_KEY = 'store-locator-timestamp';
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
        
        // Використовуємо CORS Proxy (з Basic Auth)
        // Формат: https://corsproxy.io/?url=ТВОЙ_URL
        const username = 'ItsLogin!#%Motherfucker';
        const password = 'ThatIs%Passoword99123~';
        const auth = btoa(`${username}:${password}`);
        
        // НЕ ПРАЦЮВАТИМЕ! CORS proxy не передає Authorization!
        // Тому ПОТРІБЕН власний proxy (Railway.app)
        this.API_URL = 'ПОТРІБЕН_RAILWAY'; // placeholder
        
        this.TIMEOUT = 15000; // 15 сек
        
        // Шифрование (из crypto.js)
        this.crypto = {
            encryptData,
            decryptData,
            isValidEncryptedData
        };
    }

    /**
     * Загрузить данные с сервера
     * Процесс: Скачать -> Расшифровать -> Валидировать -> Кешировать
     */
    async fetchFromServer() {
        try {
            console.log('[DataManager] Загрузка данных с сервера...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
            
            const response = await fetch(this.API_URL, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }
            
            const encryptedJson = await response.json();
            console.log('[DataManager] Данные скачаны, объем:', JSON.stringify(encryptedJson).length);
            
            // ВРЕМЕННО: Пропускаем расшифровку для отладки
            let decrypted;
            
            // Проверяем, зашифрованы ли данные
            if (encryptedJson.data && typeof encryptedJson.data === 'string') {
                console.log('[DataManager] Обнаружены зашифрованные данные, пытаемся расшифровать...');
                decrypted = this.crypto.decryptData(encryptedJson.data);
                if (!decrypted) {
                    console.warn('[DataManager] Не удалось расшифровать, пробуем использовать как есть...');
                    // Если не удалось расшифровать, возможно данные уже в plain JSON
                    decrypted = encryptedJson;
                }
            } else {
                console.log('[DataManager] Данные в открытом виде (без шифрования)');
                decrypted = encryptedJson;
            }
            
            console.log('[DataManager] Данные обработаны успешно');
            
            // Валидируем структуру
            if (!this.validateDataStructure(decrypted)) {
                throw new Error('Некорректная структура данных');
            }
            
            // Кешируем
            this.saveToCache(decrypted);
            this.data = decrypted;
            
            console.log('[DataManager] ✓ Данные загружены, магазинов:', decrypted.shops?.length || 0);
            return decrypted;
            
        } catch (error) {
            console.error('[DataManager] Ошибка загрузки:', error);
            
            // Пытаемся использовать кеш
            const cached = this.loadFromCache();
            if (cached) {
                console.warn('[DataManager] Используем кешированные данные');
                this.data = cached;
                return cached;
            }
            
            throw error;
        }
    }

    /**
     * Валидация структуры данных
     */
    validateDataStructure(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Обязательные поля
        if (!Array.isArray(data.shops)) {
            console.error('[DataManager] Ошибка: нет массива shops');
            return false;
        }
        
        if (!Array.isArray(data.products)) {
            console.error('[DataManager] Ошибка: нет массива products');
            return false;
        }
        
        // Проверим хотя бы один магазин
        if (data.shops.length === 0) {
            console.warn('[DataManager] Нет магазинов в данных');
            return false;
        }
        
        const firstShop = data.shops[0];
        if (!firstShop.id || !firstShop.name || !Array.isArray(firstShop.products)) {
            console.error('[DataManager] Некорректный формат магазина');
            return false;
        }
        
        // Проверим продукты
        const firstProduct = data.products[0];
        if (!firstProduct.id || !firstProduct.title) {
            console.error('[DataManager] Некорректный формат продукта');
            return false;
        }
        
        return true;
    }

    /**
     * Сохранить в localStorage
     */
    saveToCache(data) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log('[DataManager] Данные сохранены в кеш');
        } catch (error) {
            console.warn('[DataManager] Ошибка сохранения в localStorage:', error);
        }
    }

    /**
     * Загрузить из localStorage
     */
    loadFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
            
            if (!cached || !timestamp) {
                return null;
            }
            
            const age = Date.now() - parseInt(timestamp);
            if (age > this.CACHE_TTL) {
                console.log('[DataManager] Кеш устарел');
                localStorage.removeItem(this.CACHE_KEY);
                localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
                return null;
            }
            
            console.log('[DataManager] Кеш найден, возраст:', Math.round(age / 1000 / 60), 'мин');
            return JSON.parse(cached);
        } catch (error) {
            console.warn('[DataManager] Ошибка загрузки кеша:', error);
            return null;
        }
    }

    /**
     * Очистить кеш
     */
    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
        this.data = null;
        console.log('[DataManager] Кеш очищен');
    }

    /**
     * Получить все данные
     */
    getData() {
        return this.data;
    }

    /**
     * Получить все магазины
     */
    getShops() {
        return this.data?.shops || [];
    }

    /**
     * Получить все продукты
     */
    getProducts() {
        return this.data?.products || [];
    }

    /**
     * Получить города
     */
    getCities() {
        return this.data?.cities || [];
    }

    /**
     * Найти магазин по ID
     */
    getShopById(id) {
        return this.getShops().find(shop => shop.id === id);
    }

    /**
     * Найти продукт по ID
     */
    getProductById(id) {
        return this.getProducts().find(product => product.id === id);
    }

    /**
     * Получить доступные категории в магазине
     * С фильтрацией по свежести (< 2 недель = яркие, > 2 месяцев = скрыто)
     */
    getShopCategories(shopId) {
        const shop = this.getShopById(shopId);
        if (!shop || !shop.products) return [];
        
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        return shop.products.map(productRef => {
            const product = this.getProductById(productRef.id);
            if (!product) return null;
            
            const deliveryDate = new Date(productRef.timestamp);
            
            // Определяем статус свежести
            let status = 'old'; // > 2 месяца - скрыто
            if (deliveryDate > twoMonthsAgo) {
                status = 'stale'; // > 2 недель - тусклое
            }
            if (deliveryDate > twoWeeksAgo) {
                status = 'fresh'; // < 2 недель - яркое
            }
            
            return {
                id: product.id,
                title: product.title,
                timestamp: productRef.timestamp,
                status: status, // 'fresh', 'stale', 'old'
                isVisible: status !== 'old'
            };
        }).filter(cat => cat !== null);
    }

    /**
     * Для WordPress: экспортировать данные в формат для БД
     * Структура подходит для сохранения в WordPress options или custom posts
     */
    exportForWordPress() {
        if (!this.data) return null;
        
        return {
            exportDate: new Date().toISOString(),
            cities: this.data.cities,
            shops: this.data.shops.map(shop => ({
                wp_id: null, // WordPress заполнит
                ext_id: shop.id,
                name: shop.name,
                coordinates: this.parseCoordinates(shop.map),
                map_url: shop.map,
                categories: this.getShopCategories(shop.id),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })),
            products: this.data.products,
            meta: {
                version: '1.0',
                lastUpdate: new Date().toISOString(),
                totalShops: this.data.shops.length,
                totalProducts: this.data.products.length
            }
        };
    }

    /**
     * Парсить координаты из Google Maps ссылки
     * https://www.google.com/maps/...@lat,lng,... -> {lat, lng}
     */
    parseCoordinates(mapUrl) {
        try {
            if (!mapUrl) return null;
            
            // Паттерн 1: /place/lat,lng (наш формат)
            let match = mapUrl.match(/\/place\/([-+]?[0-9]{1,2}\.[0-9]+),([-+]?[0-9]{1,3}\.[0-9]+)/);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            }
            
            // Паттерн 2: @lat,lng (Google Maps)
            match = mapUrl.match(/@([-+]?[0-9]{1,2}\.[0-9]+),([-+]?[0-9]{1,3}\.[0-9]+)/);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            }
            
            return null;
        } catch (error) {
            console.warn('[DataManager] Ошибка парсинга координат:', error);
            return null;
        }
    }

}

// Создаем глобальный экземпляр
const dataManager = new DataManager();
