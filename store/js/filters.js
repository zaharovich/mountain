class FilterService {
    constructor() {
        this.selectedFilters = new Set();
    }

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

        document.querySelectorAll('.filter-item__input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.onFilterChange(e));
        });

        products.forEach(p => {
            this.selectedFilters.add(p.id);
        });
    }

    onFilterChange(event) {
        const productId = event.target.value;
        
        if (event.target.checked) {
            this.selectedFilters.add(productId);
        } else {
            this.selectedFilters.delete(productId);
        }

        this.updateShopsDisplay();
    }

    updateShopsDisplay() {
        const filteredShops = this.filterShops(mapService.shops);
        mapService.addShopMarkers(filteredShops);
    }

    filterShops(shops) {
        if (this.selectedFilters.size === 0) {
            return [];
        }

        return shops.filter(shop => {
            return shop.products && shop.products.some(p => 
                this.selectedFilters.has(p.id)
            );
        });
    }

    getSelectedFilters() {
        return Array.from(this.selectedFilters);
    }

    clearFilters() {
        this.selectedFilters.clear();
        document.querySelectorAll('.filter-item__input').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    selectAllFilters() {
        document.querySelectorAll('.filter-item__input').forEach(checkbox => {
            checkbox.checked = true;
            this.selectedFilters.add(checkbox.value);
        });
    }
}

const filterService = new FilterService();
