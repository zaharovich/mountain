/**
 * Геолокация и поиск ближайших магазинов
 * Функции для работы с координатами и расчета расстояний
 */

class GeoLocation {
    /**
     * Запросить геолокацию пользователя
     * @returns {Promise<{latitude, longitude}>}
     */
    static async requestLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Браузер не поддерживает Geolocation API'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(new Error(this.getErrorMessage(error.code)));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Расчет расстояния между двумя точками (Haversine формула)
     * @param {number} lat1 - Широта точки 1
     * @param {number} lon1 - Долгота точки 1
     * @param {number} lat2 - Широта точки 2
     * @param {number} lon2 - Долгота точки 2
     * @returns {number} Расстояние в км
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в км
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Найти все магазины в радиусе
     * @param {Array} shops - Массив магазинов
     * @param {number} userLat - Широта пользователя
     * @param {number} userLon - Долгота пользователя
     * @param {number} radiusKm - Радиус в км
     * @returns {Array} Магазины отсортированные по расстоянию
     */
    static findShopsInRadius(shops, userLat, userLon, radiusKm) {
        const filtered = shops
            .map(shop => {
                const coords = dataManager.parseCoordinates(shop.map);
                if (!coords) return null;

                const distance = this.calculateDistance(
                    userLat, userLon,
                    coords.lat, coords.lng
                );

                return distance <= radiusKm ? { ...shop, distance, coords } : null;
            })
            .filter(shop => shop !== null)
            .sort((a, b) => a.distance - b.distance);

        return filtered;
    }

    /**
     * Найти N ближайших магазинов с адаптивным радиусом
     * Сначала ищем в 3км, потом 6км, 10км - пока не найдем минимум магазинов
     * 
     * @param {Array} shops - Все магазины
     * @param {number} userLat - Широта
     * @param {number} userLon - Долгота
     * @param {number} minShops - Минимум магазинов (по умолчанию 10)
     * @returns {Promise<{shops, radius, minCount}>}
     */
    static findAdaptiveRadius(shops, userLat, userLon, minShops = 5) {
        const radii = [2, 6, 10, 20]; // км

        // Пробуем найти магазины начиная с 2км
        for (const radius of radii) {
            const found = this.findShopsInRadius(shops, userLat, userLon, radius);
            if (found.length >= minShops) {
                return {
                    shops: found,
                    radius: radius,
                    message: `Найдено ${found.length} магазин${this.getPlural(found.length)} в радиусе ${radius}км`
                };
            }
        }

        // Если найдено мало магазинов, все равно возвращаем их
        const allNearby = this.findShopsInRadius(shops, userLat, userLon, 20);
        if (allNearby.length > 0) {
            return {
                shops: allNearby,
                radius: 20,
                message: `Найдено ${allNearby.length} магазин${this.getPlural(allNearby.length)} в радиусе 20км`
            };
        }

        // Если ничего не найдено вообще, вернуть пустой результат
        return {
            shops: [],
            radius: 20,
            message: 'К сожалению, поблизости нет магазинов'
        };
    }

    /**
     * Проверить расстояние между двумя точками
     * (для защиты от парсинга)
     * @param {number} lat1, lon1 - Первая координата
     * @param {number} lat2, lon2 - Вторая координата
     * @returns {boolean} true если расстояние <= 1км
     */
    static isWithinRadius(lat1, lon1, lat2, lon2, radiusKm = 1) {
        const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
        return distance <= radiusKm;
    }

    /**
     * Получить эндпоинт Google Maps для координат
     */
    static getGoogleMapsURL(latitude, longitude, zoom = 15) {
        return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&zoom=${zoom}`;
    }

    /**
     * Получить сообщение об ошибке геолокации
     */
    static getErrorMessage(code) {
        const messages = {
            1: 'Доступ к геолокации запрещен. Проверьте настройки браузера.',
            2: 'Не удалось определить вашу геолокацию. Проверьте интернет.',
            3: 'Истекло время ожидания определения геолокации.',
        };
        return messages[code] || 'Неизвестная ошибка геолокации';
    }

    /**
     * Вспомогательная функция для множественного числа
     */
    static getPlural(count) {
        if (count % 10 === 1 && count % 100 !== 11) return '';
        return 'ов';
    }
}

/**
 * IP-based Rate Limiter для защиты от парсинга
 * Ограничивает 1 IP максимум 3 запросами в радиусе 1км за 24 часа
 */
class RateLimiter {
    constructor() {
        this.STORAGE_KEY = 'rate-limiter-data';
        this.MAX_REQUESTS = 3;
        this.RADIUS_KM = 1;
        this.TTL = 24 * 60 * 60 * 1000; // 24 часа
    }

    /**
     * Получить IP клиента (примерно, клиентский IP)
     * На клиенте можем использовать WebRTC для уточнения
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('Не удалось получить IP:', error);
            return 'local-client';
        }
    }

    /**
     * Проверить и записать запрос
     * @returns {boolean} true если запрос разрешен
     */
    async checkAndRecord(latitude, longitude) {
        const ip = await this.getClientIP();
        const history = this.getHistory();

        // Очистить старые записи
        const now = Date.now();
        const filtered = history.filter(record => (now - record.timestamp) < this.TTL);

        // Проверить записи для этого IP
        const ipRecords = filtered.filter(record => record.ip === ip);

        // Проверить находятся ли они близко друг к другу
        const nearbyCount = ipRecords.filter(record =>
            GeoLocation.isWithinRadius(latitude, longitude, record.lat, record.lon, this.RADIUS_KM)
        ).length;

        if (nearbyCount >= this.MAX_REQUESTS) {
            console.warn(`[RateLimiter] IP ${ip} превышил лимит запросов в радиусе ${this.RADIUS_KM}км`);
            return false;
        }

        // Добавить новую запись
        filtered.push({
            ip,
            lat: latitude,
            lon: longitude,
            timestamp: now
        });

        // Сохранить
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
            console.warn('Ошибка сохранения rate-limiter данных:', error);
        }

        return true;
    }

    /**
     * Получить историю из localStorage
     */
    getHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.warn('Ошибка загрузки rate-limiter данных:', error);
            return [];
        }
    }

    /**
     * Очистить историю
     */
    clearHistory() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[RateLimiter] История очищена');
    }
}

// Глобальный экземпляр rate limiter
const rateLimiter = new RateLimiter();
