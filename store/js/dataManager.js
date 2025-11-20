class DataManager {
    constructor() {
        this.data = null;
        
        this.CACHE_KEY = 'store-locator-data-v1';
        this.CACHE_TIMESTAMP_KEY = 'store-locator-timestamp';
        this.CACHE_TTL = 24 * 60 * 60 * 1000;
        
        this.API_URL = 'https://mountain-production-edd9.up.railway.app/api/remote-tt.json';
        
        this.TIMEOUT = 15000;
        
        this.crypto = {
            encryptData,
            decryptData,
            isValidEncryptedData
        };
    }

    async fetchFromServer() {
        try {
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
            
            let decrypted;
            
            if (encryptedJson.data && typeof encryptedJson.data === 'string') {
                decrypted = this.crypto.decryptData(encryptedJson.data);
                if (!decrypted) {
                    decrypted = encryptedJson;
                }
            } else {
                decrypted = encryptedJson;
            }
            
            if (!this.validateDataStructure(decrypted)) {
                throw new Error('Некорректная структура данных');
            }
            
            this.saveToCache(decrypted);
            this.data = decrypted;
            
            return decrypted;
            
        } catch (error) {
            const cached = this.loadFromCache();
            if (cached) {
                this.data = cached;
                return cached;
            }
            
            throw error;
        }
    }

    validateDataStructure(data) {
        if (!data || typeof data !== 'object') return false;
        
        if (!Array.isArray(data.shops)) {
            return false;
        }
        
        if (!Array.isArray(data.products)) {
            return false;
        }
        
        if (data.shops.length === 0) {
            return false;
        }
        
        const firstShop = data.shops[0];
        if (!firstShop.id || !firstShop.name || !Array.isArray(firstShop.products)) {
            return false;
        }
        
        const firstProduct = data.products[0];
        if (!firstProduct.id || !firstProduct.title) {
            return false;
        }
        
        return true;
    }

    saveToCache(data) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
        }
    }

    loadFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
            
            if (!cached || !timestamp) {
                return null;
            }
            
            const age = Date.now() - parseInt(timestamp);
            if (age > this.CACHE_TTL) {
                localStorage.removeItem(this.CACHE_KEY);
                localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
                return null;
            }
            
            return JSON.parse(cached);
        } catch (error) {
            return null;
        }
    }

    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
        this.data = null;
    }

    getData() {
        return this.data;
    }

    getShops() {
        return this.data?.shops || [];
    }

    getProducts() {
        return this.data?.products || [];
    }

    getCities() {
        return this.data?.cities || [];
    }

    getShopById(id) {
        return this.getShops().find(shop => shop.id === id);
    }

    getProductById(id) {
        return this.getProducts().find(product => product.id === id);
    }

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
            
            let status = 'old';
            if (deliveryDate > twoMonthsAgo) {
                status = 'stale';
            }
            if (deliveryDate > twoWeeksAgo) {
                status = 'fresh';
            }
            
            return {
                id: product.id,
                title: product.title,
                timestamp: productRef.timestamp,
                status: status,
                isVisible: status !== 'old'
            };
        }).filter(cat => cat !== null);
    }

    exportForWordPress() {
        if (!this.data) return null;
        
        return {
            exportDate: new Date().toISOString(),
            cities: this.data.cities,
            shops: this.data.shops.map(shop => ({
                wp_id: null,
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

    parseCoordinates(mapUrl) {
        try {
            if (!mapUrl) return null;
            
            let match = mapUrl.match(/\/place\/([-+]?[0-9]{1,2}\.[0-9]+),([-+]?[0-9]{1,3}\.[0-9]+)/);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            }
            
            match = mapUrl.match(/@([-+]?[0-9]{1,2}\.[0-9]+),([-+]?[0-9]{1,3}\.[0-9]+)/);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

}

const dataManager = new DataManager();
