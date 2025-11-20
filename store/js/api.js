class APIService {
    constructor() {
        this.data = null;
        this.lastFetch = null;
    }

    async fetchEncryptedData() {
        try {
            
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


            try {
                const data = JSON.parse(text);
                return data;
            } catch (e) {
                const decrypted = CryptoService.decryptJSON(text, CONFIG.ENCRYPTION_KEY);
                return decrypted;
            }
        } catch (error) {
            Utils.showMessage('Помилка завантаження даних магазинів', 'error', 5000);
            throw error;
        }
    }

    async parseData(rawData) {
        try {
            const data = {
                cities: rawData.cities || [],
                products: rawData.products || [],
                shops: this.parseShops(rawData.shops || [])
            };

            this.data = data;
            this.lastFetch = new Date();

            return data;
        } catch (error) {
            throw error;
        }
    }

    parseShops(shops) {
        return shops.map(shop => {
            const coords = Utils.parseGoogleMapsCoordinates(shop.map);
            return {
                ...shop,
                coordinates: coords || { latitude: 0, longitude: 0 },
                products: (shop.products || []).filter(p => 
                    Utils.shouldShowProduct(p.timestamp)
                )
            };
        });
    }

    getData() {
        return this.data;
    }

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

    async getNearestShops(latitude, longitude, minCount = CONFIG.MIN_SHOPS_TO_SHOW) {
        if (!this.data) {
            throw new Error('Дані не завантажені');
        }

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

        return {
            shops: foundShops.slice(0, minCount + 10),
            radius: CONFIG.SEARCH_RADIUS[Math.min(currentRadiusIndex - 1, CONFIG.SEARCH_RADIUS.length - 1)]
        };
    }

    async checkIPLocationLimit(latitude, longitude) {
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
            return { allowed: true };
        }
    }

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
            return result;
        } catch (error) {
            throw error;
        }
    }
}

const api = new APIService();
