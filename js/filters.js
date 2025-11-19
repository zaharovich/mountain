// Робота з фільтрами категорій

class FilterService {
    constructor() {
        this.selectedFilters = new Set();
    }

    // Ініціалізація фільтрів
    init(products) {
        const filterContent = document.getElementById('filterContent');
        filterContent.innerHTML = '';

        products.forEach(product => {
            const color = Utils.getCategoryColor(product.id);
            const itemHTML = `
                <label class="filter-item" data-product-id="${product.id}">
                    <input type="checkbox" class="filter-item__input" value="${product.id}" checked>
                    <div class="filter-item__icon" style="background-color: ${color};"></div>
                    <span class="filter-item__label">${product.title}</span>
                </label>
            `;
            filterContent.innerHTML += itemHTML;
        });

        // Додаємо обработчики
        document.querySelectorAll('.filter-item__input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.onFilterChange(e));
        });

        // Спочатку всі фільтри обрані
        products.forEach(p => {
            this.selectedFilters.add(p.id);
        });

        log('Фільтри ініціалізовані');
    }

    // Обработка зміни фільтру
    onFilterChange(event) {
        const productId = event.target.value;
        
        if (event.target.checked) {
            this.selectedFilters.add(productId);
        } else {
            this.selectedFilters.delete(productId);
        }

        // Перерисуємо маркери
        this.updateShopsDisplay();
    }

    // Оновлення відображення магазинів
    updateShopsDisplay() {
        const filteredShops = this.filterShops(mapService.shops);
        mapService.addShopMarkers(filteredShops);
        log('Маркери оновлені');
    }

    // Фільтрування магазинів за вибраними категоріями
    filterShops(shops) {
        if (this.selectedFilters.size === 0) {
            return [];
        }

        return shops.filter(shop => {
            // Магазин повинен мати хоча б один продукт з вибраних категорій
            return shop.products && shop.products.some(p => 
                this.selectedFilters.has(p.id)
            );
        });
    }

    // Отримання обраних фільтрів
    getSelectedFilters() {
        return Array.from(this.selectedFilters);
    }

    // Очищення всіх фільтрів
    clearFilters() {
        this.selectedFilters.clear();
        document.querySelectorAll('.filter-item__input').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // Обрання всіх фільтрів
    selectAllFilters() {
        document.querySelectorAll('.filter-item__input').forEach(checkbox => {
            checkbox.checked = true;
            this.selectedFilters.add(checkbox.value);
        });
    }
}

// Глобальний екземпляр
const filterService = new FilterService();
