class GeoLocation {
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

    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

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

    static findAdaptiveRadius(shops, userLat, userLon, minShops = 5) {
        const radii = [2, 6, 10, 20];

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

        const allNearby = this.findShopsInRadius(shops, userLat, userLon, 20);
        if (allNearby.length > 0) {
            return {
                shops: allNearby,
                radius: 20,
                message: `Найдено ${allNearby.length} магазин${this.getPlural(allNearby.length)} в радиусе 20км`
            };
        }

        return {
            shops: [],
            radius: 20,
            message: 'К сожалению, поблизости нет магазинов'
        };
    }

    static isWithinRadius(lat1, lon1, lat2, lon2, radiusKm = 1) {
        const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
        return distance <= radiusKm;
    }

    static getGoogleMapsURL(latitude, longitude, zoom = 15) {
        return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&zoom=${zoom}`;
    }

    static getErrorMessage(code) {
        const messages = {
            1: 'Доступ к геолокации запрещен. Проверьте настройки браузера.',
            2: 'Не удалось определить вашу геолокацию. Проверьте интернет.',
            3: 'Истекло время ожидания определения геолокации.',
        };
        return messages[code] || 'Неизвестная ошибка геолокации';
    }

    static getPlural(count) {
        if (count % 10 === 1 && count % 100 !== 11) return '';
        return 'ов';
    }
}

class RateLimiter {
    constructor() {
        this.STORAGE_KEY = 'rate-limiter-data';
        this.MAX_REQUESTS = 3;
        this.RADIUS_KM = 1;
        this.TTL = 24 * 60 * 60 * 1000;
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'local-client';
        }
    }

    async checkAndRecord(latitude, longitude) {
        const ip = await this.getClientIP();
        const history = this.getHistory();

        const now = Date.now();
        const filtered = history.filter(record => (now - record.timestamp) < this.TTL);

        const ipRecords = filtered.filter(record => record.ip === ip);

        const nearbyCount = ipRecords.filter(record =>
            GeoLocation.isWithinRadius(latitude, longitude, record.lat, record.lon, this.RADIUS_KM)
        ).length;

        if (nearbyCount >= this.MAX_REQUESTS) {
            return false;
        }

        filtered.push({
            ip,
            lat: latitude,
            lon: longitude,
            timestamp: now
        });

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
        }

        return true;
    }

    getHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    }

    clearHistory() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

const rateLimiter = new RateLimiter();
