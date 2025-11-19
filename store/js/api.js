// Робота з API і даними

class APIService {
    constructor() {
        this.data = null;
        this.lastFetch = null;
    }

    // Завантаження зашифрованих даних
    async fetchEncryptedData() {
        try {
            log('Завантажування даних з', CONFIG.API_ENDPOINT);
            
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            log('Отримано', text.length, 'символів');

            // Спробуємо распарсити як звичайний JSON спочатку
            try {
                const data = JSON.parse(text);
                log('JSON распарсений без дешифрування');
                return data;
            } catch (e) {
                // Якщо не JSON, то пробуємо дешифрувати
                log('JSON не распарсений, пробуємо дешифрувати...');
                const decrypted = CryptoService.decryptJSON(text, CONFIG.ENCRYPTION_KEY);
                log('Дані дешифровані успішно');
                return decrypted;
            }
        } catch (error) {
            log('Помилка завантаження даних:', error);
            Utils.showMessage('Помилка завантаження даних магазинів', 'error', 5000);
            throw error;
        }
    }

    // Парсування даних і підготовка до використання
    async parseData(rawData) {
        try {
            const data = {
                cities: rawData.cities || [],
                products: rawData.products || [],
                shops: this.parseShops(rawData.shops || [])
            };

            // Кешування в пам'яті
            this.data = data;
            this.lastFetch = new Date();

            log('Дані распарсені. Магазинів:', data.shops.length);
            return data;
        } catch (error) {
            log('Помилка парсування даних:', error);
            throw error;
        }
    }

    // Парсування магазинів з витягуванням координат
    parseShops(shops) {
        return shops.map(shop => {
            const coords = Utils.parseGoogleMapsCoordinates(shop.map);
            return {
                ...shop,
                coordinates: coords || { latitude: 0, longitude: 0 },
                // Філтруємо продукти - показуємо тільки свіжі (менше 2х місяців)
                products: (shop.products || []).filter(p => 
                    Utils.shouldShowProduct(p.timestamp)
                )
            };
        });
    }

    // Отримання даних
    getData() {
        return this.data;
    }

    // Отримання продуктів за ID магазину
    getShopProducts(shopId, products) {
        const shop = this.data.shops.find(s => s.id === shopId);
        if (!shop) return [];

        return shop.products.map(sp => {
            const product = products.find(p => p.id === sp.id);
            return {
                ...product,
                deliveryDate: sp.timestamp,
                isFresh: Utils.isProductFresh(sp.timestamp)
            };
        });
    }

    // Отримання ближайших магазинів з динамічним радіусом
    async getNearestShops(latitude, longitude, minCount = CONFIG.MIN_SHOPS_TO_SHOW) {
        if (!this.data) {
            throw new Error('Дані не завантажені');
        }

        // Перевіряємо IP защиту перед пошуком
        const ipCheck = await this.checkIPLocationLimit(latitude, longitude);
        if (!ipCheck.allowed) {
            throw new Error(ipCheck.reason);
        }

        const shops = this.data.shops;
        let foundShops = [];
        let currentRadiusIndex = 0;

        while (foundShops.length < minCount && currentRadiusIndex < CONFIG.SEARCH_RADIUS.length) {
            const radius = CONFIG.SEARCH_RADIUS[currentRadiusIndex];
            foundShops = Utils.getShopsInRadius(shops, latitude, longitude, radius);
            currentRadiusIndex++;
        }

        log(`Знайдено ${foundShops.length} магазинів`);
        return {
            shops: foundShops.slice(0, minCount + 10), // Показуємо до 20 магазинів
            radius: CONFIG.SEARCH_RADIUS[Math.min(currentRadiusIndex - 1, CONFIG.SEARCH_RADIUS.length - 1)]
        };
    }

    // Перевірка IP защити - максимум 3 унікальні локації в радіусі 1км
    async checkIPLocationLimit(latitude, longitude) {
        // На фронтенді ми не маємо IP, тому запитуємо у бекенду
        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/check-ip-location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latitude,
                    longitude
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            // Якщо немає бекенду, дозволяємо
            log('Бекенд не доступен, пропускаємо IP проверку');
            return { allowed: true };
        }
    }

    // Відправка запиту про новий магазин
    async sendLocationRequest(latitude, longitude, feedback = '') {
        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/location-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latitude,
                    longitude,
                    feedback,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();
            log('Запит відправлений на бекенд', result);
            return result;
        } catch (error) {
            log('Помилка відправки запиту:', error);
            throw error;
        }
    }
}

// Глобальний екземпляр
const api = new APIService();
