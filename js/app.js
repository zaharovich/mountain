/**
 * Store Locator App - Главная логика
 * Управляет геолокацией, поиском магазинов, отображением на карте
 */

class StoreLocatorApp {
    constructor() {
        // Состояние приложения
        this.state = {
            locationGranted: false,
            userLocation: null,
            shops: [],
            filteredShops: [],
            selectedCategories: new Set(), // Выбранные категории фильтра
            map: null,
            markers: {},
            searchRadius: 2,
            isLoading: false,
            isDesktop: window.innerWidth > 768
        };

        // Константы
        this.SEARCH_RADII = [2, 4, 6, 9]; // км
        this.MIN_SHOPS_TARGET = 10;
        this.MAX_SHOPS_TARGET = 15;
        this.MAX_RADIUS = 20; // км для показа всех магазинов если ничего не найдено
    }

    /**
     * Инициализация приложения
     */
    async init() {
        console.log('[App] Инициализация приложения...');
        
        try {
            // ВРЕМЕННО: Используем тестовую локацию для разработки
            // Полтава, центр
            const testLocation = {
                latitude: 49.5883,
                longitude: 34.5514,
                accuracy: 10
            };
            
            console.log('[App] ⚠️ ИСПОЛЬЗУЕТСЯ ТЕСТОВАЯ ЛОКАЦИЯ (Полтава, центр)');
            await this.startWithLocation(testLocation);
            
            // Инициализируем обработчик кнопки тестовых координат
            this.initTestCoordinatesHandler();
            
            /* ЗАКОММЕНТИРОВАНО: Реальная геолокация
            // 1. Проверяем сохраненную локацию
            const savedLocation = this.getSavedLocation();
            if (savedLocation) {
                console.log('[App] Найдена сохраненная локация');
                await this.startWithLocation(savedLocation);
            } else {
                console.log('[App] Локация не сохранена, запрашиваем...');
                await this.requestLocationAndStart();
            }
            */
        } catch (error) {
            console.error('[App] Ошибка инициализации:', error);
            this.showError(error.message);
        }
    }

    /**
     * Инициализировать обработчик тестовых координат
     */
    initTestCoordinatesHandler() {
        const input = document.getElementById('testCoordinatesInput');
        const button = document.getElementById('applyCoordinatesBtn');
        
        if (!input || !button) return;
        
        // Заполняем поле текущими координатами
        if (this.state.userLocation) {
            input.value = `${this.state.userLocation.latitude}, ${this.state.userLocation.longitude}`;
        }
        
        // Обработчик нажатия на кнопку
        button.addEventListener('click', async () => {
            const value = input.value.trim();
            if (!value) {
                this.showToast('Введіть координати', 'error');
                return;
            }
            
            // Парсим координаты (формат: "49.5883, 34.5514" или "49.5883,34.5514")
            const coords = this.parseCoordinates(value);
            if (!coords) {
                this.showToast('Невірний формат координат. Використовуйте: широта, довгота', 'error');
                return;
            }
            
            console.log('[App] Застосовую тестові координати:', coords);
            
            // Применяем новые координаты
            await this.applyNewCoordinates(coords);
        });
        
        // Обработчик нажатия Enter в поле ввода
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                button.click();
            }
        });
    }
    
    /**
     * Парсить координаты из строки
     * @param {string} value - строка вида "49.5883, 34.5514"
     * @returns {{latitude: number, longitude: number} | null}
     */
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
    
    /**
     * Применить новые координаты и перезагрузить карту
     */
    async applyNewCoordinates(location) {
        try {
            this.showLoadingState('Перезавантаження з новими координатами...');
            
            // Сохраняем старые данные
            const oldShops = this.state.shops;
            
            // Обновляем локацию пользователя
            this.state.userLocation = location;
            
            // Получаем все магазины из dataManager
            const allShops = dataManager.getData().shops.map(shop => ({
                ...shop,
                coords: dataManager.parseCoordinates(shop.map)
            })).filter(shop => shop.coords !== null);
            
            this.state.shops = allShops;
            
            // Удаляем старую карту
            if (this.state.map) {
                this.state.map.remove();
                this.state.map = null;
                this.state.markers = {};
            }
            
            // Создаем новую карту с новой локацией
            this.initializeMap();
            
            // Переинициализируем фильтры
            this.initializeFilters();
            
            // Ищем ближайшие магазины
            await this.findNearestShops();
            
            this.hideLoadingState();
            this.showToast('Координати застосовано успішно!', 'success');
            
            console.log('[App] Карта перезагружена с новыми координатами');
            
        } catch (error) {
            console.error('[App] Ошибка применения координат:', error);
            this.showToast('Помилка застосування координат', 'error');
            this.hideLoadingState();
        }
    }

    /**
     * Запросить геолокацию и начать приложение
     */
    async requestLocationAndStart() {
        try {
            this.showLoadingState('Получаем вашу геолокацию...');
            
            const location = await GeoLocation.requestLocation();
            console.log('[App] Геолокация получена:', location);
            
            // Проверяем rate limiter
            const allowed = await rateLimiter.checkAndRecord(location.latitude, location.longitude);
            if (!allowed) {
                throw new Error('Слишком много запросов с вашей локации. Попробуйте позже.');
            }
            
            this.saveLocation(location);
            await this.startWithLocation(location);
            
        } catch (error) {
            console.error('[App] Ошибка получения локации:', error);
            this.showLocationError(error.message);
        }
    }

    /**
     * Начать приложение с полученной локацией
     */
    async startWithLocation(location) {
        try {
            this.state.userLocation = location;
            this.state.locationGranted = true;
            
            // Скрываем запрос локации
            document.getElementById('locationRequest').style.display = 'none';
            document.getElementById('mapContainer').style.display = 'flex';
            
            // Загружаем данные
            this.showLoadingState('Загружаем данные магазинов...');
            await this.loadData();
            
            // Инициализируем карту
            this.initializeMap();
            
            // Инициализируем фильтры
            this.initializeFilters();
            
            // Ищем ближайшие магазины
            await this.findNearestShops();
            
            // Скрываем loading
            this.hideLoadingState();
            
            console.log('[App] ✓ Приложение готово');
            
        } catch (error) {
            console.error('[App] Ошибка старта:', error);
            this.showError(error.message);
        }
    }

    /**
     * Загрузить данные магазинов с сервера
     */
    async loadData() {
        try {
            // Загружаем данные
            this.showLoadingState('Загружаем данные магазинов...');
            const data = await dataManager.fetchFromServer();
            
            console.log('[App] Получено магазинов с сервера:', data.shops.length);
            
            // Парсим ТОЛЬКО координаты из поля map (БЕЗ геокодирования)
            this.state.shops = data.shops.map(shop => ({
                ...shop,
                coords: dataManager.parseCoordinates(shop.map)
            })).filter(shop => shop.coords !== null);
            
            console.log('[App] ✓ Магазинов с координатами:', this.state.shops.length);
            
            return data;
            
        } catch (error) {
            console.error('[App] Ошибка загрузки данных:', error);
            throw new Error('Не удалось загрузить данные магазинов. ' + error.message);
        }
    }

    /**
     * Инициализировать карту Leaflet с черно-белым стилем
     */
    initializeMap() {
        const mapElement = document.getElementById('map');
        
        // Создаем карту Leaflet
        this.state.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView(
            [this.state.userLocation.latitude, this.state.userLocation.longitude],
            14
        );
        
        // Добавляем черно-белые тайлы (grayscale)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.state.map);
        
        // Маркер пользователя (синяя точка)
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
        ).addTo(this.state.map).bindPopup('Ваша локация');
        
        console.log('[App] Leaflet карта инициализирована с черно-белым стилем');
    }

    /**
     * Инициализировать фильтры категорий
     */
    initializeFilters() {
        const products = dataManager.getProducts();
        const filterSelect = document.getElementById('categoryFilter');
        
        if (!filterSelect) return;
        
        // Очищаем select
        filterSelect.innerHTML = '';
        
        // Добавляем опцию "Категорії" (все товары)
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Категорії';
        allOption.selected = true;
        filterSelect.appendChild(allOption);
        
        // Добавляем каждый товар как опцию
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.title;
            filterSelect.appendChild(option);
        });
        
        // Инициализируем Select2
        $(filterSelect).select2({
            placeholder: 'Категорії',
            minimumResultsForSearch: -1, // Отключаем поиск
            width: '100%'
        });
        
        // Обработчик изменения фильтра через Select2
        $(filterSelect).on('change', (e) => {
            // Закрываем попап если он открыт
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
        
        console.log('[App] Фильтры инициализированы с Select2');
    }

    /**
     * Найти ближайшие магазины с новой логикой
     */
    async findNearestShops() {
        try {
            // Ищем 10-15 магазинов в радиусе до 9км
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
                
                // Если нашли от 10 до 15 магазинов - отлично
                if (foundShops.length >= this.MIN_SHOPS_TARGET) {
                    // Берем только первые 15
                    foundShops = foundShops.slice(0, this.MAX_SHOPS_TARGET);
                    break;
                }
            }
            
            this.state.searchRadius = usedRadius;
            
            // Если ничего не найдено в радиусе до 9км
            if (foundShops.length === 0) {
                console.log('[App] Магазинов в радиусе 9км не найдено. Показываем диалог.');
                this.showNoShopsDialog();
                return;
            }
            
            // Показываем найденные магазины
            this.state.shops = foundShops;
            this.applyFilters();
            this.showShopsOnMap(foundShops);
            
            // Показываем кнопку расширенного поиска если радиус < 9км
            const expandBtn = document.getElementById('expandSearchBtnMain');
            if (expandBtn && usedRadius < 9) {
                expandBtn.style.display = 'block';
                expandBtn.querySelector('button').onclick = () => this.expandSearchFromMain();
            } else if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            
            console.log('[App] Найдено магазинов:', foundShops.length, 'в радиусе:', usedRadius, 'км');
            
        } catch (error) {
            console.error('[App] Ошибка поиска магазинов:', error);
            throw error;
        }
    }

    /**
     * Применить фильтры категорий
     */
    applyFilters() {
        if (this.state.selectedCategories.size === 0) {
            // Если ничего не выбрано - показываем все магазины
            this.state.filteredShops = this.state.shops;
        } else {
            // Фильтруем магазины которые содержат выбранные категории
            this.state.filteredShops = this.state.shops.filter(shop => {
                const shopProducts = this.getShopProducts(shop);
                return shopProducts.some(product => 
                    this.state.selectedCategories.has(product.id)
                );
            });
        }
        
        console.log('[App] После фильтрации магазинов:', this.state.filteredShops.length);
        
        // Обновляем карту
        this.updateMapMarkers();
    }

    /**
     * Показать магазины на карте
     */
    showShopsOnMap(shops) {
        // Очищаем старые маркеры
        Object.values(this.state.markers).forEach(marker => {
            this.state.map.removeLayer(marker);
        });
        this.state.markers = {};
        
        // Добавляем новые маркеры
        shops.forEach(shop => {
            if (!shop.coords) return;
            
            // Получаем категории для магазина
            const categories = dataManager.getShopCategories(shop.id)
                .filter(cat => cat.isVisible);
            
            const iconHtml = `
                <div class="shop-marker">
                    <img src="assets/point.png" alt="marker" class="shop-marker__pin-img" />
                </div>
            `;
            
            // Создаем кастомную иконку для Leaflet
            const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-shop-marker',
                iconSize: [40, 60],
                iconAnchor: [20, 60],
                popupAnchor: [0, -60]
            });
            
            // Создаем маркер
            const marker = L.marker([shop.coords.lat, shop.coords.lng], {
                icon: customIcon,
                title: shop.name
            }).addTo(this.state.map);
            
            // При клике показываем информацию
            marker.on('click', () => {
                this.showShopPopup(shop);
            });
            
            this.state.markers[shop.id] = marker;
        });
        
        // Зумируем на магазины
        if (shops.length > 0) {
            const bounds = L.latLngBounds(
                shops.map(shop => [shop.coords.lat, shop.coords.lng])
            );
            this.state.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
    
    /**
     * Получить продукты магазина
     */
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

    /**
     * Получить SVG иконку для категории продукта
     */
    getCategoryIcon(categoryTitle) {
        // Нормализуем название
        const normalized = categoryTitle.trim().toLowerCase();
        
        // SVG иконки - минималистичные черные
        const icons = {
            // Горішки - орех
            nuts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2c-2.5 0-4.5 2-4.5 4.5 0 1.5.7 2.8 1.8 3.7C8.5 11.3 8 12.6 8 14c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.4-.5-2.7-1.3-3.8 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2z"/>
                <circle cx="12" cy="14" r="2"/>
            </svg>`,
            
            // Морозиво веган - листик
            vegan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 20c0-3 2-5 4-6 0-2-1-4-3-5 3-1 6 0 7 3 1-3 4-4 7-3-2 1-3 3-3 5 2 1 4 3 4 6"/>
            </svg>`,
            
            // Морозиво на паличці - эскимо
            popsicle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="8" y="3" width="8" height="12" rx="4"/>
                <rect x="10" y="15" width="4" height="6" rx="1"/>
            </svg>`,
            
            // Морозиво у стакані - рожок
            cone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="5"/>
                <path d="M8 12 L12 21 L16 12"/>
            </svg>`,
            
            // Моті - японский десерт
            mochi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="8"/>
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
            </svg>`,
            
            // Протеїнове - гантель/мышца
            protein: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 5v14M17 5v14M10 9h4M10 15h4"/>
                <rect x="5" y="4" width="4" height="3" rx="1"/>
                <rect x="5" y="17" width="4" height="3" rx="1"/>
                <rect x="15" y="4" width="4" height="3" rx="1"/>
                <rect x="15" y="17" width="4" height="3" rx="1"/>
            </svg>`,
            
            // Торти - тортик со свечкой
            cake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v3"/>
                <rect x="5" y="6" width="14" height="5" rx="1"/>
                <rect x="4" y="11" width="16" height="8" rx="1"/>
                <path d="M8 14h8M8 16h8"/>
            </svg>`,
            
            // Цукерки - конфета
            candy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="7" y="9" width="10" height="6" rx="2"/>
                <path d="M7 12h-3M17 12h3"/>
                <path d="M4 10l1 4M4 14l1-4"/>
                <path d="M20 10l-1 4M20 14l-1-4"/>
            </svg>`,
            
            // Сирки - творожный сырок
            cheese: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="8" width="12" height="10" rx="2"/>
                <path d="M9 5c0-1 .5-2 1.5-2h3c1 0 1.5 1 1.5 2v3H9V5z"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>`,
            
            // Шоколад - плитка шоколада
            chocolate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="4" width="14" height="16" rx="1"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
                <line x1="5" y1="10" x2="19" y2="10"/>
                <line x1="5" y1="14" x2="19" y2="14"/>
            </svg>`,
            
            // По умолчанию - магазин
            default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>`
        };
        
        // Определяем какая иконка нужна
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

    /**
     * Получить цвет для категории продукта
     */
    getCategoryColor(categoryId) {
        // Генерируем разные цвета для каждого ID
        const colors = [
            '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#F38181',
            '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFCDA3', '#FEA47F',
            '#25CCF7'
        ];
        const index = parseInt(categoryId) % colors.length;
        return colors[index];
    }

    /**
     * Обновить маркеры на основе фильтров
     */
    updateMapMarkers() {
        // Скрываем все маркеры
        Object.values(this.state.markers).forEach(marker => {
            this.state.map.removeLayer(marker);
        });
        
        // Показываем только отфильтрованные
        this.showShopsOnMap(this.state.filteredShops);
    }

    /**
     * Показать попап магазина
     */
    showShopPopup(shop) {
        const popup = document.getElementById('shopPopup');
        const overlay = document.getElementById('shopPopupOverlay');
        if (!popup || !overlay) return;
        
        console.log('[App] Показываем попап для магазина:', shop);
        
        // Получаем продукты магазина
        const shopProducts = this.getShopProducts(shop);
        console.log('[App] Продукты магазина:', shopProducts);
        
        // Создаем кружочки продукции с тултипами и иконками
        let productsHtml = '';
        if (shopProducts.length > 0) {
            const productCircles = shopProducts.map(product => {
                const color = this.getCategoryColor(product.id);
                const icon = this.getCategoryIcon(product.title);
                return `
                    <div class="product-circle" style="background-color: ${color};" data-tooltip="${product.title}">
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
        
        // Получаем координаты маркера на экране
        const marker = this.state.markers[shop.id];
        if (marker) {
            const markerLatLng = marker.getLatLng();
            
            // Проверяем, нужно ли сдвинуть карту
            const popupHeight = 280; // высота попапа + отступ + стрелка
            const mapContainer = this.state.map.getContainer();
            const mapHeight = mapContainer.offsetHeight;
            
            // Получаем точку маркера на экране
            let markerPoint = this.state.map.latLngToContainerPoint(markerLatLng);
            
            // Если попап не помещается сверху, сдвигаем карту
            if (markerPoint.y < popupHeight) {
                // Вычисляем насколько нужно сдвинуть карту
                const currentCenter = this.state.map.getCenter();
                const pixelOffset = popupHeight - markerPoint.y + 40; // +40px дополнительный запас
                
                // Конвертируем пиксельный сдвиг в географические координаты
                const targetPoint = this.state.map.project(currentCenter, this.state.map.getZoom());
                targetPoint.y -= pixelOffset;
                const targetLatLng = this.state.map.unproject(targetPoint, this.state.map.getZoom());
                
                // Плавно перемещаем карту
                this.state.map.panTo(targetLatLng, { animate: true, duration: 0.3 });
                
                // Ждем завершения анимации и пересчитываем позицию
                setTimeout(() => {
                    markerPoint = this.state.map.latLngToContainerPoint(markerLatLng);
                    popup.style.left = markerPoint.x + 'px';
                    popup.style.top = markerPoint.y + 'px';
                }, 300);
            }
            
            // Позиционируем попап над маркером (центрируем)
            popup.style.display = 'block';
            popup.style.left = markerPoint.x + 'px';
            popup.style.top = markerPoint.y + 'px';
            popup.classList.add('shop-popup--positioned');
        } else {
            popup.style.display = 'block';
        }
        
        overlay.style.display = 'block';
        
        // Закрытие по клику на overlay
        const closePopup = () => {
            popup.style.display = 'none';
            overlay.style.display = 'none';
            popup.classList.remove('shop-popup--positioned');
            
            // Убираем обработчики событий
            this.state.map.off('movestart', closePopup);
            this.state.map.off('zoomstart', closePopup);
            document.removeEventListener('keydown', handleEsc);
        };
        
        overlay.onclick = closePopup;
        
        // Закрытие по кнопке
        const closeBtn = document.getElementById('shopPopupClose');
        if (closeBtn) {
            closeBtn.onclick = closePopup;
        }
        
        // Закрытие по ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closePopup();
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // Закрытие при перетаскивании карты или зуме
        this.state.map.on('movestart', closePopup);
        this.state.map.on('zoomstart', closePopup);
        
        // Сохраняем функцию закрытия для использования при смене фильтра
        this.state.activePopupClose = closePopup;
    }

    /**
     * Показать диалог когда магазинов нет (финальный, без кнопки расширенного поиска)
     */
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

    /**
     * Показать диалог "Магазинов не найдено"
     */
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
        
        // Закрытие попапа
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
        
        // Закрытие по Escape
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * Расширить поиск в больший радиус (из главного интерфейса)
     */
    async expandSearchFromMain() {
        const newRadius = 20;
        
        // Получаем все магазины из dataManager
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
            
            // Скрываем кнопку расширенного поиска
            const expandBtn = document.getElementById('expandSearchBtnMain');
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            
            this.applyFilters();
            this.showShopsOnMap(shopsInLargeRadius);
            
            this.showToast(`Найдено ${shopsInLargeRadius.length} магазинов в радиусе 20км`, 'success');
        } else {
            this.showToast('К сожалению, магазинов нет даже в радиусе 20км', 'error');
        }
    }

    /**
     * Расширить поиск в больший радиус (из попапа)
     */
    async expandSearch() {
        const newRadius = 20;
        
        // Получаем все магазины
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
        
        // Закрываем диалог
        document.getElementById('noShopsDialog').style.display = 'none';
        document.getElementById('noShopsOverlay').style.display = 'none';
        
        if (shopsInLargeRadius.length > 0) {
            this.state.shops = shopsInLargeRadius;
            this.state.searchRadius = newRadius;
            
            // СКРЫВАЕМ кнопку расширенного поиска (т.к. уже показали все до 20км)
            const expandBtn = document.getElementById('expandSearchBtnMain');
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            
            this.showShopsOnMap(shopsInLargeRadius);
            this.showToast(`Показано ${shopsInLargeRadius.length} магазинов в радиусе 20км`, 'info');
        } else {
            // Если и в 20км ничего нет - показываем попап БЕЗ кнопки "Шукати у більшому радіусі"
            this.showNoShopsDialogFinal();
        }
    }

    /**
     * Отправить запрос партнерства
     */
    async sendPartnerRequest() {
        const dialog = document.getElementById('noShopsDialog');
        dialog.innerHTML = `
            <div class="no-shops__content">
                <h2>Дякуємо! ✓</h2>
                <p>Ми прийняли Ваш запит і вже шукаємо партнерів у Вашому регіоні.</p>
                <p class="text-muted">Ми свяжемся с вами в ближайшее время</p>
            </div>
        `;
        
        // Отправляем в Телеграм (позже, когда добавим бот)
        console.log('[App] Запрос партнерства:', {
            latitude: this.state.userLocation.latitude,
            longitude: this.state.userLocation.longitude,
            googleMapsUrl: GeoLocation.getGoogleMapsURL(
                this.state.userLocation.latitude,
                this.state.userLocation.longitude
            ),
            timestamp: new Date().toISOString()
        });
        
        // Закроем диалог через 3 секунды
        setTimeout(() => {
            dialog.style.display = 'none';
        }, 3000);
    }

    /**
     * Сохранить локацию в localStorage
     */
    saveLocation(location) {
        try {
            localStorage.setItem('store-locator-location', JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('[App] Ошибка сохранения локации:', error);
        }
    }

    /**
     * Загрузить сохраненную локацию
     */
    getSavedLocation() {
        try {
            const saved = localStorage.getItem('store-locator-location');
            if (!saved) return null;
            
            const data = JSON.parse(saved);
            const age = Date.now() - data.timestamp;
            
            // Локация актуальна 1 час
            if (age > 60 * 60 * 1000) {
                localStorage.removeItem('store-locator-location');
                return null;
            }
            
            return { latitude: data.latitude, longitude: data.longitude };
        } catch (error) {
            console.warn('[App] Ошибка загрузки локации:', error);
            return null;
        }
    }

    /**
     * Показать ошибку геолокации
     */
    showLocationError(message) {
        const container = document.getElementById('locationRequest');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'location-error';
        errorDiv.innerHTML = `
            <div class="location-error__content">
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Попробовать снова</button>
            </div>
        `;
        container.appendChild(errorDiv);
        
        if (this.state.isDesktop) {
            // На десктопе показываем инструкции
            document.getElementById('instructions').style.display = 'block';
        }
    }

    /**
     * Показать toast уведомление
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            // Удаляем через 3 секунды
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    /**
     * Показать error сообщение
     */
    showError(message) {
        alert('❌ Ошибка: ' + message);
    }

    /**
     * Показать loading состояние
     */
    showLoadingState(message) {
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.innerHTML = `<p>${message}</p>`;
            loadingEl.style.display = 'block';
        }
    }

    /**
     * Скрыть loading состояние
     */
    hideLoadingState() {
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
}

// Инициализируем приложение когда DOM готов
document.addEventListener('DOMContentLoaded', () => {
    const app = new StoreLocatorApp();
    app.init().catch(error => {
        console.error('[App] Критическая ошибка:', error);
    });
});
        
