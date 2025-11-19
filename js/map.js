// Робота з картою Leaflet

class MapService {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentLocation = null;
        this.markerIcon = null;
        this.shops = [];
    }

    // Ініціалізація карти
    init(latitude, longitude) {
        log('Ініціалізація карти для', latitude, longitude);

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.map = L.map('map').setView([latitude, longitude], 13);

        // Додаємо OpenStreetMap тайли
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Позначаємо поточну локацію
        this.addCurrentLocationMarker(latitude, longitude);
        this.currentLocation = { latitude, longitude };
    }

    // Додавання маркера поточної локації користувача
    addCurrentLocationMarker(latitude, longitude) {
        const marker = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#2563eb',
            color: '#1e40af',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);

        marker.bindPopup('Ваша локація');
        return marker;
    }

    // Додавання маркерів магазинів
    addShopMarkers(shops) {
        // Очищаємо старі маркери
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
        this.shops = shops;

        shops.forEach((shop, index) => {
            if (!shop.coordinates) return;

            const marker = L.marker(
                [shop.coordinates.latitude, shop.coordinates.longitude],
                {
                    title: shop.name,
                    icon: this.getShopIcon(shop)
                }
            ).addTo(this.map);

            // Обработка кліку на маркер
            marker.on('click', () => {
                this.onShopMarkerClick(shop);
            });

            marker.shopData = shop;
            this.markers.push(marker);
        });

        log(`Додано ${this.markers.length} маркерів`);

        // Автоматично масштабуємо карту для того щоб всі маркери були видні
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Отримання іконки для магазину
    getShopIcon(shop) {
        // Вибираємо кольор за першим продуктом
        let color = '#3b82f6';
        if (shop.products && shop.products.length > 0) {
            color = Utils.getCategoryColor(shop.products[0].id);
        }

        return L.divIcon({
            html: `
                <div class="shop-marker" style="background-color: ${color};">
                    ${shop.products ? shop.products.length : 0}
                </div>
            `,
            className: 'shop-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
    }

    // Обработка кліку на маркер магазину
    onShopMarkerClick(shop) {
        this.showShopPopup(shop);
    }

    // Показання попапу магазину
    showShopPopup(shop) {
        const popup = document.getElementById('shopPopup');
        const shopNameEl = document.getElementById('shopName');
        const shopProductsEl = document.getElementById('shopProducts');

        // Назва магазину
        shopNameEl.textContent = shop.name;

        // Продукти
        if (!shop.products || shop.products.length === 0) {
            shopProductsEl.innerHTML = '<p style="color: #999;">Нема товарів</p>';
        } else {
            shopProductsEl.innerHTML = shop.products.map(product => {
                const productInfo = api.data.products.find(p => p.id === product.id);
                const isFresh = Utils.isProductFresh(product.timestamp);
                const color = Utils.getCategoryColor(product.id);

                return `
                    <div class="product-badge" title="${productInfo?.title || 'Товар'} (${Utils.formatDate(product.timestamp)})">
                        <div class="product-badge__icon ${isFresh ? 'product-badge__icon--bright' : 'product-badge__icon--faded'}"
                             style="background-color: ${color}; width: 40px; height: 40px; border-radius: 4px;"></div>
                        <div class="product-badge__name">${productInfo?.title || 'Товар'}</div>
                    </div>
                `;
            }).join('');
        }

        popup.style.display = 'flex';
    }

    // Очищення карти
    clear() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
        this.shops = [];
    }
}

// Глобальний екземпляр
const mapService = new MapService();

// CSS для маркерів
const style = document.createElement('style');
style.textContent = `
    .shop-marker-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background-color: #3b82f6;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        color: white;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    
    .shop-marker-icon:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);
