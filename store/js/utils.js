class Utils {
    static getDistance(lat1, lon1, lat2, lon2) {
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

    static getShopsInRadius(shops, latitude, longitude, radiusKm) {
        return shops.filter(shop => {
            if (!shop.coordinates) return false;
            const distance = this.getDistance(
                latitude,
                longitude,
                shop.coordinates.latitude,
                shop.coordinates.longitude
            );
            return distance <= radiusKm;
        }).sort((a, b) => {
            const distA = this.getDistance(
                latitude,
                longitude,
                a.coordinates.latitude,
                a.coordinates.longitude
            );
            const distB = this.getDistance(
                latitude,
                longitude,
                b.coordinates.latitude,
                b.coordinates.longitude
            );
            return distA - distB;
        });
    }

    static isProductFresh(timestamp) {
        const productDate = new Date(timestamp);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return productDate >= twoWeeksAgo;
    }

    static shouldShowProduct(timestamp) {
        const productDate = new Date(timestamp);
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        return productDate >= twoMonthsAgo;
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA');
    }

    static getClientIP() {
        return 'client-ip';
    }

    static isWithinRadius(lat1, lon1, lat2, lon2, radiusKm = 1) {
        return this.getDistance(lat1, lon1, lat2, lon2) <= radiusKm;
    }

    static parseGoogleMapsCoordinates(url) {
        if (!url) return null;

        const patterns = [
            /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            /q=location@(-?\d+\.?\d*),(-?\d+\.?\d*)/
        ];

        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    latitude: parseFloat(match[1]),
                    longitude: parseFloat(match[2])
                };
            }
        }

        return null;
    }

    static generateProductIcon(color = '#3b82f6') {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <rect width="100" height="100" rx="15" fill="${color}"/>
                <circle cx="50" cy="35" r="12" fill="white"/>
                <path d="M 50 50 Q 35 65 35 80 L 65 80 Q 65 65 50 50 Z" fill="white"/>
            </svg>
        `;
        return 'data:image/svg+xml;base64,' + btoa(svg);
    }

    static getCategoryColor(productId) {
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
            '#06b6d4', '#84cc16'
        ];
        const hash = parseInt(productId) % colors.length;
        return colors[hash];
    }

    static formatCurrency(amount, currency = 'UAH') {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static setWithTTL(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    static getWithTTL(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) {
            return null;
        }
        const item = JSON.parse(itemStr);
        const now = new Date();
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    }

    static showMessage(text, type = 'success', duration = 3000) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message message--${type}`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, duration);
    }
}
