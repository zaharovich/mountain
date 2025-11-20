class StoreLocatorApp {
    constructor() {
        this.state = {
            locationGranted: false,
            userLocation: null,
            shops: [],
            filteredShops: [],
            selectedCategories: new Set(),
            map: null,
            markers: {},
            searchRadius: 2,
            isLoading: false,
            isDesktop: window.innerWidth > 768
        };

        this.SEARCH_RADII = [2, 4, 6, 9];
        this.MIN_SHOPS_TARGET = 10;
        this.MAX_SHOPS_TARGET = 15;
        this.MAX_RADIUS = 20;
    }

    async init() {
        try {
            const testLocation = {
                latitude: 49.5883,
                longitude: 34.5514,
                accuracy: 10
            };
            
            await this.startWithLocation(testLocation);
            
            this.initTestCoordinatesHandler();
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    initTestCoordinatesHandler() {
        const input = document.getElementById('testCoordinatesInput');
        const button = document.getElementById('applyCoordinatesBtn');
        
        if (!input || !button) return;
        
        if (this.state.userLocation) {
            input.value = `${this.state.userLocation.latitude}, ${this.state.userLocation.longitude}`;
        }
        
        button.addEventListener('click', async () => {
            const value = input.value.trim();
            if (!value) {
                this.showToast('Введіть координати', 'error');
                return;
            }
            
            const coords = this.parseCoordinates(value);
            if (!coords) {
                this.showToast('Невірний формат координат. Використовуйте: широта, довгота', 'error');
                return;
            }
            
            await this.applyNewCoordinates(coords);
        });
        
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                button.click();
            }
        });
    }
    
    parseCoordinates(value) {
        const parts = value.split(',').map(s => s.trim());
        if (parts.length !== 2) return null;
        
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < -90 || lat > 90) return null;
        if (lng < -180 || lng > 180) return null;
        
        return { latitude: lat, longitude: lng, accuracy: 10 };
    }
    
    async applyNewCoordinates(location) {
        try {
            this.showLoadingState('Перезавантаження з новими координатами...');
            
            const oldShops = this.state.shops;
            
            this.state.userLocation = location;
            
            const allShops = dataManager.getData().shops.map(shop => ({
                ...shop,
                coords: dataManager.parseCoordinates(shop.map)
            })).filter(shop => shop.coords !== null);
            
            this.state.shops = allShops;
            
            if (this.state.map) {
                this.state.map.remove();
                this.state.map = null;
                this.state.markers = {};
            }
            
            this.initializeMap();
            
            this.initializeFilters();
            
            await this.findNearestShops();
            
            this.state.map.setView([location.latitude, location.longitude], 13, {
                animate: true,
                duration: 1
            });
            
            this.hideLoadingState();
            this.showToast('Координати застосовано успішно!', 'success');
            
        } catch (error) {
            this.showToast('Помилка застосування координат', 'error');
            this.hideLoadingState();
        }
    }

    async requestLocationAndStart() {
        try {
            this.showLoadingState('Отримуємо вашу геолокацію...');
            
            const location = await GeoLocation.requestLocation();
            
            const allowed = await rateLimiter.checkAndRecord(location.latitude, location.longitude);
            if (!allowed) {
                throw new Error('Занадто багато запитів з вашої локації. Спробуйте пізніше.');
            }
            
            this.saveLocation(location);
            await this.startWithLocation(location);
            
        } catch (error) {
            this.showLocationError(error.message);
        }
    }

    async startWithLocation(location) {
        try {
            this.state.userLocation = location;
            this.state.locationGranted = true;
            
            document.getElementById('locationRequest').style.display = 'none';
            document.getElementById('mapContainer').style.display = 'flex';
            
            this.showLoadingState('Завантажуємо дані магазинів...');
            await this.loadData();
            
            this.initializeMap();
            
            this.initializeFilters();
            
            await this.findNearestShops();
            
            this.hideLoadingState();
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    async loadData() {
        try {
            this.showLoadingState('Завантажуємо дані магазинів...');
            const data = await dataManager.fetchFromServer();
            
            this.state.shops = data.shops.map(shop => ({
                ...shop,
                coords: dataManager.parseCoordinates(shop.map)
            })).filter(shop => shop.coords !== null);
            
            return data;
            
        } catch (error) {
            throw new Error('Не вдалося завантажити дані магазинів. ' + error.message);
        }
    }

    initializeMap() {
        const mapElement = document.getElementById('map');
        
        this.state.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView(
            [this.state.userLocation.latitude, this.state.userLocation.longitude],
            14
        );
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.state.map);
        
        L.circleMarker(
            [this.state.userLocation.latitude, this.state.userLocation.longitude],
            {
                color: '#0066ff',
                radius: 8,
                weight: 3,
                opacity: 0.8,
                fillColor: '#0066ff',
                fillOpacity: 0.5
            }
        ).addTo(this.state.map).bindPopup('Ваша локацiя');
        
        const myLocationBtn = document.getElementById('myLocationBtn');
        if (myLocationBtn) {
            myLocationBtn.style.display = 'flex';
            myLocationBtn.onclick = () => this.centerOnUserLocation();
        }
    }
    
    centerOnUserLocation() {
        if (this.state.userLocation && this.state.map) {
            this.state.map.setView(
                [this.state.userLocation.latitude, this.state.userLocation.longitude],
                15,
                {
                    animate: true,
                    duration: 0.8
                }
            );
            this.showToast('Повернуто до вашої локації', 'info');
        }
    }

    initializeFilters() {
        const products = dataManager.getProducts();
        const filterSelect = document.getElementById('categoryFilter');
        
        if (!filterSelect) return;
        
        filterSelect.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Категорії';
        allOption.selected = true;
        filterSelect.appendChild(allOption);
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.title;
            filterSelect.appendChild(option);
        });
        
        $(filterSelect).select2({
            placeholder: 'Категорії',
            minimumResultsForSearch: -1,
            width: '100%'
        });
        
        $(filterSelect).on('change', (e) => {
            if (this.state.activePopupClose) {
                this.state.activePopupClose();
                this.state.activePopupClose = null;
            }
            
            const value = e.target.value;
            if (value === 'all') {
                this.state.selectedCategories.clear();
            } else {
                this.state.selectedCategories.clear();
                this.state.selectedCategories.add(value);
            }
            this.applyFilters();
        });
    }

    async findNearestShops() {
        try {
            let foundShops = [];
            let usedRadius = 0;
            
            for (const radius of this.SEARCH_RADII) {
                foundShops = GeoLocation.findShopsInRadius(
                    this.state.shops,
                    this.state.userLocation.latitude,
                    this.state.userLocation.longitude,
                    radius
                );
                
                usedRadius = radius;
                
                if (foundShops.length >= this.MIN_SHOPS_TARGET) {
                    foundShops = foundShops.slice(0, this.MAX_SHOPS_TARGET);
                    break;
                }
            }
            
            this.state.searchRadius = usedRadius;
            
            if (foundShops.length === 0) {
                this.showNoShopsDialog();
                return;
            }
            
            this.state.shops = foundShops;
            this.applyFilters();
            this.showShopsOnMap(foundShops);
            
            const expandBtn = document.getElementById('expandSearchBtnMain');
            if (expandBtn && usedRadius < 9) {
                expandBtn.style.display = 'block';
                expandBtn.querySelector('button').onclick = () => this.expandSearchFromMain();
            } else if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            
        } catch (error) {
            throw error;
        }
    }

    applyFilters() {
        if (this.state.selectedCategories.size === 0) {
            this.state.filteredShops = this.state.shops;
        } else {
            this.state.filteredShops = this.state.shops.filter(shop => {
                const shopProducts = this.getShopProducts(shop);
                return shopProducts.some(product => 
                    this.state.selectedCategories.has(product.id)
                );
            });
        }
        
        this.updateMapMarkers();
    }

    showShopsOnMap(shops) {
        Object.values(this.state.markers).forEach(marker => {
            this.state.map.removeLayer(marker);
        });
        this.state.markers = {};
        
        shops.forEach(shop => {
            if (!shop.coords) return;
            
            const categories = dataManager.getShopCategories(shop.id)
                .filter(cat => cat.isVisible);
            
            const iconHtml = `
                <div class="shop-marker">
                    <img src="assets/point.png" alt="marker" class="shop-marker__pin-img" />
                </div>
            `;
            
            const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-shop-marker',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [0, -41]
            });
            
            const marker = L.marker([shop.coords.lat, shop.coords.lng], {
                icon: customIcon,
                title: shop.name
            }).addTo(this.state.map);
            
            marker.on('click', () => {
                this.showShopPopup(shop);
            });
            
            this.state.markers[shop.id] = marker;
        });
        
        if (shops.length > 0) {
            const bounds = L.latLngBounds(
                shops.map(shop => [shop.coords.lat, shop.coords.lng])
            );
            this.state.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
    
    getShopProducts(shop) {
        if (!shop.products || !Array.isArray(shop.products)) return [];
        
        const allProducts = dataManager.getProducts();
        return shop.products.map(productRef => {
            const product = allProducts.find(p => p.id === productRef.id);
            return product ? {
                id: product.id,
                title: product.title,
                timestamp: productRef.timestamp
            } : null;
        }).filter(p => p !== null);
    }

    getCategoryIcon(categoryTitle) {
        const normalized = categoryTitle.trim().toLowerCase();
        
        const icons = {
            nuts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2c-2.5 0-4.5 2-4.5 4.5 0 1.5.7 2.8 1.8 3.7C8.5 11.3 8 12.6 8 14c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.4-.5-2.7-1.3-3.8 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2z"/>
                <circle cx="12" cy="14" r="2"/>
            </svg>`,
            
            vegan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 20c0-3 2-5 4-6 0-2-1-4-3-5 3-1 6 0 7 3 1-3 4-4 7-3-2 1-3 3-3 5 2 1 4 3 4 6"/>
            </svg>`,
            
            popsicle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="8" y="3" width="8" height="12" rx="4"/>
                <rect x="10" y="15" width="4" height="6" rx="1"/>
            </svg>`,
            
            cone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="5"/>
                <path d="M8 12 L12 21 L16 12"/>
            </svg>`,
            
            mochi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="8"/>
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
            </svg>`,
            
            protein: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 5v14M17 5v14M10 9h4M10 15h4"/>
                <rect x="5" y="4" width="4" height="3" rx="1"/>
                <rect x="5" y="17" width="4" height="3" rx="1"/>
                <rect x="15" y="4" width="4" height="3" rx="1"/>
                <rect x="15" y="17" width="4" height="3" rx="1"/>
            </svg>`,
            
            cake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v3"/>
                <rect x="5" y="6" width="14" height="5" rx="1"/>
                <rect x="4" y="11" width="16" height="8" rx="1"/>
                <path d="M8 14h8M8 16h8"/>
            </svg>`,
            
            candy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="7" y="9" width="10" height="6" rx="2"/>
                <path d="M7 12h-3M17 12h3"/>
                <path d="M4 10l1 4M4 14l1-4"/>
                <path d="M20 10l-1 4M20 14l-1-4"/>
            </svg>`,
            
            cheese: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="8" width="12" height="10" rx="2"/>
                <path d="M9 5c0-1 .5-2 1.5-2h3c1 0 1.5 1 1.5 2v3H9V5z"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>`,
            
            chocolate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="4" width="14" height="16" rx="1"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
                <line x1="5" y1="10" x2="19" y2="10"/>
                <line x1="5" y1="14" x2="19" y2="14"/>
            </svg>`,
            
            default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>`
        };
        
        if (normalized.includes('горішк')) return icons.nuts;
        if (normalized.includes('веган')) return icons.vegan;
        if (normalized.includes('паличці') || normalized.includes('палочке')) return icons.popsicle;
        if (normalized.includes('стакані') || normalized.includes('стакане')) return icons.cone;
        if (normalized.includes('моті') || normalized.includes('мочи')) return icons.mochi;
        if (normalized.includes('протеїнов') || normalized.includes('протеинов')) return icons.protein;
        if (normalized.includes('торт')) return icons.cake;
        if (normalized.includes('цукерк') || normalized.includes('конфет')) return icons.candy;
        if (normalized.includes('сирк') || normalized.includes('творож')) return icons.cheese;
        if (normalized.includes('шоколад')) return icons.chocolate;
        if (normalized.includes('морозив') || normalized.includes('мороженое')) return icons.cone;
        
        return icons.default;
    }

    getCategoryColor(categoryId) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#F38181',
            '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFCDA3', '#FEA47F',
            '#25CCF7'
        ];
        const index = parseInt(categoryId) % colors.length;
        return colors[index];
    }

    updateMapMarkers() {
        Object.values(this.state.markers).forEach(marker => {
            this.state.map.removeLayer(marker);
        });
        
        this.showShopsOnMap(this.state.filteredShops);
    }

    isProductOld(timestamp) {
        if (!timestamp) return false;
        const productDate = new Date(timestamp);
        const now = new Date();
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return productDate < monthAgo;
    }

    showShopPopup(shop) {
        const popup = document.getElementById('shopPopup');
        const overlay = document.getElementById('shopPopupOverlay');
        if (!popup || !overlay) return;
        
        this.state.map.panTo([shop.coords.lat, shop.coords.lng], {
            animate: true,
            duration: 0.5
        });
        
        const shopProducts = this.getShopProducts(shop);
        
        let productsHtml = '';
        if (shopProducts.length > 0) {
            const productCircles = shopProducts.map(product => {
                const color = this.getCategoryColor(product.id);
                const icon = this.getCategoryIcon(product.title);
                const isOld = this.isProductOld(product.timestamp);
                const opacityClass = isOld ? 'product-circle--old' : '';
                return `
                    <div class="product-circle ${opacityClass}" style="background-color: ${color};" data-tooltip="${product.title}">
                        <span class="product-circle__icon">${icon}</span>
                    </div>
                `;
            }).join('');
            
            productsHtml = `
                <div class="popup-products">
                    <div class="popup-products__label">Продукція:</div>
                    <div class="popup-products__circles">
                        ${productCircles}
                    </div>
                </div>
            `;
        }
        
        const popupContent = document.querySelector('#shopPopup .popup__content');
        if (popupContent) {
            popupContent.innerHTML = `
                <button class="popup__close" id="shopPopupClose">×</button>
                <div class="popup-header">
                    <div class="popup-header__content">
                        <div class="popup-header__label">Адреса:</div>
                        <h2 class="popup-header__title">${shop.name}</h2>
                    </div>
                </div>
                ${productsHtml}
            `;
        }
        
        const marker = this.state.markers[shop.id];
        if (marker) {
            setTimeout(() => {
                const markerLatLng = marker.getLatLng();
                const markerPoint = this.state.map.latLngToContainerPoint(markerLatLng);
                popup.style.display = 'block';
                popup.classList.add('shop-popup--positioned');
                
                const popupContent = popup.querySelector('.popup__content');
                const popupWidth = popupContent.offsetWidth;
                const popupHeight = popupContent.offsetHeight;
                const mapContainer = this.state.map.getContainer();
                const mapRect = mapContainer.getBoundingClientRect();
                const markerScreenX = mapRect.left + markerPoint.x;
                const markerScreenY = mapRect.top + markerPoint.y;
                const left = markerScreenX - (popupWidth / 2);
                const top = markerScreenY - popupHeight - 13; 
                popupContent.style.left = left + 'px';
                popupContent.style.top = top + 'px';
            }, 500);
        } else {
            popup.style.display = 'block';
        }
        
        overlay.style.display = 'block';
        
        const closePopup = () => {
            popup.style.display = 'none';
            overlay.style.display = 'none';
            popup.classList.remove('shop-popup--positioned');
            
            this.state.map.off('movestart', closePopup);
            this.state.map.off('zoomstart', closePopup);
            document.removeEventListener('keydown', handleEsc);
        };
        
        overlay.onclick = closePopup;
        
        const closeBtn = document.getElementById('shopPopupClose');
        if (closeBtn) {
            closeBtn.onclick = closePopup;
        }
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closePopup();
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        this.state.map.on('movestart', closePopup);
        this.state.map.on('zoomstart', closePopup);
        
        this.state.activePopupClose = closePopup;
    }

    showNoShopsDialogFinal() {
        const dialog = document.getElementById('noShopsDialog');
        const overlay = document.getElementById('noShopsOverlay');
        if (!dialog || !overlay) return;
        
        dialog.innerHTML = `
            <div class="no-shops__content">
                <button class="popup__close" id="noShopsClose">×</button>
                <div class="no-shops__icon">😔</div>
                <h2 class="no-shops__title">Оце халепа!</h2>
                <p class="no-shops__text">Магазинів поблизу нема</p>
                <div class="no-shops__buttons">
                    <button id="requestPartnerBtn" class="no-shops__button no-shops__button--primary">Хочу Вас Неподалік</button>
                </div>
            </div>
        `;
        
        dialog.style.display = 'flex';
        overlay.style.display = 'block';
        
        const closeDialog = () => {
            dialog.style.display = 'none';
            overlay.style.display = 'none';
        };
        
        document.getElementById('noShopsClose').addEventListener('click', closeDialog);
        overlay.addEventListener('click', closeDialog);
        
        document.getElementById('requestPartnerBtn').addEventListener('click', () => {
            this.sendPartnerRequest();
        });
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    showNoShopsDialog() {
        const dialog = document.getElementById('noShopsDialog');
        const overlay = document.getElementById('noShopsOverlay');
        if (!dialog || !overlay) return;
        
        dialog.innerHTML = `
            <div class="no-shops__content">
                <button class="popup__close" id="noShopsClose">×</button>
                <div class="no-shops__icon">😔</div>
                <h2 class="no-shops__title">Оце халепа!</h2>
                <p class="no-shops__text">Магазинів поблизу нема</p>
                <div class="no-shops__buttons">
                    <button id="expandSearchBtn" class="no-shops__button no-shops__button--primary">Шукати у більшому радіусі</button>
                    <button id="requestPartnerBtn" class="no-shops__button no-shops__button--secondary">Хочу Вас Неподалік</button>
                </div>
            </div>
        `;
        
        dialog.style.display = 'flex';
        overlay.style.display = 'block';
        
        const closeDialog = () => {
            dialog.style.display = 'none';
            overlay.style.display = 'none';
        };
        
        document.getElementById('noShopsClose').addEventListener('click', closeDialog);
        overlay.addEventListener('click', closeDialog);
        
        document.getElementById('expandSearchBtn').addEventListener('click', () => {
            this.expandSearch();
        });
        
        document.getElementById('requestPartnerBtn').addEventListener('click', () => {
            this.sendPartnerRequest();
        });
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    async expandSearchFromMain() {
        const newRadius = 20;
        
        const allShops = dataManager.getData().shops.map(shop => ({
            ...shop,
            coords: dataManager.parseCoordinates(shop.map)
        })).filter(shop => shop.coords !== null);
        
        const shopsInLargeRadius = GeoLocation.findShopsInRadius(
            allShops,
            this.state.userLocation.latitude,
            this.state.userLocation.longitude,
            newRadius
        );
        
        if (shopsInLargeRadius.length > 0) {
            this.state.shops = shopsInLargeRadius;
            this.state.searchRadius = newRadius;
            
            const expandBtn = document.getElementById('expandSearchBtnMain');
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            
            this.applyFilters();
            this.showShopsOnMap(shopsInLargeRadius);
            
            this.showToast(`Знайдено ${shopsInLargeRadius.length} магазинів в радіусі 20 км`, 'success');
        } else {
            this.showToast('На жаль, магазинів немає навіть у радіусі 20 км.', 'error');
        }
    }

    async expandSearch() {
        const newRadius = 20;
        
        const allShops = dataManager.getData().shops.map(shop => ({
            ...shop,
            coords: dataManager.parseCoordinates(shop.map)
        })).filter(shop => shop.coords !== null);
        
        const shopsInLargeRadius = GeoLocation.findShopsInRadius(
            allShops,
            this.state.userLocation.latitude,
            this.state.userLocation.longitude,
            newRadius
        );
        
        document.getElementById('noShopsDialog').style.display = 'none';
        document.getElementById('noShopsOverlay').style.display = 'none';
        
        if (shopsInLargeRadius.length > 0) {
            this.state.shops = shopsInLargeRadius;
            this.state.searchRadius = newRadius;
            
            const expandBtn = document.getElementById('expandSearchBtnMain');
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            
            this.showShopsOnMap(shopsInLargeRadius);
            this.showToast(`Показано ${shopsInLargeRadius.length} магазинів в радіусі 20 км`, 'info');
        } else {
            this.showNoShopsDialogFinal();
        }
    }

    async sendPartnerRequest() {
        const dialog = document.getElementById('noShopsDialog');
        
        try {
            const response = await fetch('https://mountain-production-edd9.up.railway.app/api/send-partner-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latitude: this.state.userLocation.latitude,
                    longitude: this.state.userLocation.longitude
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                dialog.innerHTML = `
                    <div class="no-shops__content">
                        <h2>Дякуємо! ✓</h2>
                        <p>Ми прийняли Ваш запит і вже шукаємо партнерів у Вашому регіоні.</p>
                        <p class="text-muted">Ми зв'яжемося з вами найближчим часом</p>
                    </div>
                `;
            } else {
                throw new Error('Помилка відправки');
            }
        } catch (error) {
            dialog.innerHTML = `
                <div class="no-shops__content">
                    <h2>Помилка ❌</h2>
                    <p>Не вдалося відправити запит. Спробуйте пізніше.</p>
                </div>
            `;
        }
        
        setTimeout(() => {
            dialog.style.display = 'none';
            document.getElementById('noShopsOverlay').style.display = 'none';
        }, 3000);
    }

    saveLocation(location) {
        try {
            localStorage.setItem('store-locator-location', JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: Date.now()
            }));
        } catch (error) {
        }
    }

    getSavedLocation() {
        try {
            const saved = localStorage.getItem('store-locator-location');
            if (!saved) return null;
            
            const data = JSON.parse(saved);
            const age = Date.now() - data.timestamp;
            
            if (age > 60 * 60 * 1000) {
                localStorage.removeItem('store-locator-location');
                return null;
            }
            
            return { latitude: data.latitude, longitude: data.longitude };
        } catch (error) {
            return null;
        }
    }

    showLocationError(message) {
        const container = document.getElementById('locationRequest');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'location-error';
        errorDiv.innerHTML = `
            <div class="location-error__content">
                <h3>Помилка</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Спробувати ще</button>
            </div>
        `;
        container.appendChild(errorDiv);
        
        if (this.state.isDesktop) {
            document.getElementById('instructions').style.display = 'block';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 6000);
        }
    }

    showError(message) {
        alert('❌ Помилка ' + message);
    }

    showLoadingState(message) {
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.innerHTML = `<p>${message}</p>`;
            loadingEl.style.display = 'block';
        }
    }

    hideLoadingState() {
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new StoreLocatorApp();
    app.init().catch(error => {
    });
});