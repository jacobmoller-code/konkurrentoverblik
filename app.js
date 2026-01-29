// Initialize map centered on Denmark
const map = L.map('map').setView([56.0, 10.5], 7);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Brand configuration
const brandConfig = {
    mcdonalds: {
        name: "McDonald's",
        color: '#FFC72C',
        textColor: '#000'
    },
    burgerking: {
        name: 'Burger King',
        color: '#D62300',
        textColor: '#fff'
    },
    sunset: {
        name: 'Sunset Boulevard',
        color: '#E85D04',
        textColor: '#fff'
    },
    max: {
        name: 'Max',
        color: '#C1121F',
        textColor: '#fff'
    },
    jagger: {
        name: 'Jagger',
        color: '#1B4332',
        textColor: '#fff'
    }
};

// Create custom marker icons for each brand
function createMarkerIcon(brand) {
    const config = brandConfig[brand];
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${config.color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

// Store markers by brand for filtering
const markers = {
    mcdonalds: [],
    burgerking: [],
    sunset: [],
    max: [],
    jagger: []
};

// Layer groups for each brand
const layerGroups = {
    mcdonalds: L.layerGroup().addTo(map),
    burgerking: L.layerGroup().addTo(map),
    sunset: L.layerGroup().addTo(map),
    max: L.layerGroup().addTo(map),
    jagger: L.layerGroup().addTo(map)
};

// Add markers to map
function addMarkersToMap() {
    Object.keys(restaurants).forEach(brand => {
        const data = restaurants[brand];
        const config = brandConfig[brand];

        data.forEach(restaurant => {
            if (restaurant.lat && restaurant.lng) {
                const marker = L.marker([restaurant.lat, restaurant.lng], {
                    icon: createMarkerIcon(brand)
                });

                const popupContent = `
                    <div class="popup-content">
                        <span class="brand-tag brand-${brand}">${config.name}</span>
                        <h3>${restaurant.name}</h3>
                        <p>${restaurant.address || ''}</p>
                        <p>${restaurant.zipCity || ''}</p>
                        ${restaurant.rating ? `<p class="rating">★ ${restaurant.rating}</p>` : ''}
                        ${restaurant.hours ? `<p>Åbningstider: ${restaurant.hours}</p>` : ''}
                    </div>
                `;

                marker.bindPopup(popupContent);
                marker.addTo(layerGroups[brand]);
                markers[brand].push(marker);
            }
        });

        // Update count
        document.getElementById(`count-${brand}`).textContent = data.length;
    });
}

// Filter functionality
function setupFilters() {
    Object.keys(brandConfig).forEach(brand => {
        const checkbox = document.getElementById(`filter-${brand}`);
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                map.addLayer(layerGroups[brand]);
            } else {
                map.removeLayer(layerGroups[brand]);
            }
            renderList();
        });
    });
}

// View toggle
function setupViewToggle() {
    const btnMap = document.getElementById('btn-map');
    const btnList = document.getElementById('btn-list');
    const mapView = document.getElementById('map-view');
    const listView = document.getElementById('list-view');

    btnMap.addEventListener('click', () => {
        btnMap.classList.add('active');
        btnList.classList.remove('active');
        mapView.classList.add('active');
        listView.classList.remove('active');
        map.invalidateSize();
    });

    btnList.addEventListener('click', () => {
        btnList.classList.add('active');
        btnMap.classList.remove('active');
        listView.classList.add('active');
        mapView.classList.remove('active');
        renderList();
    });
}

// Render list view
function renderList() {
    const container = document.getElementById('restaurant-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    // Collect all visible restaurants
    let allRestaurants = [];

    Object.keys(restaurants).forEach(brand => {
        const checkbox = document.getElementById(`filter-${brand}`);
        if (checkbox.checked) {
            restaurants[brand].forEach(r => {
                allRestaurants.push({ ...r, brand });
            });
        }
    });

    // Filter by search
    if (searchTerm) {
        allRestaurants = allRestaurants.filter(r =>
            (r.name && r.name.toLowerCase().includes(searchTerm)) ||
            (r.address && r.address.toLowerCase().includes(searchTerm)) ||
            (r.zipCity && r.zipCity.toLowerCase().includes(searchTerm))
        );
    }

    // Sort
    allRestaurants.sort((a, b) => {
        switch (sortBy) {
            case 'brand':
                return brandConfig[a.brand].name.localeCompare(brandConfig[b.brand].name);
            case 'city':
                return (a.zipCity || '').localeCompare(b.zipCity || '');
            default:
                return (a.name || '').localeCompare(b.name || '');
        }
    });

    // Render
    container.innerHTML = allRestaurants.map(r => {
        const config = brandConfig[r.brand];
        return `
            <div class="restaurant-item" data-lat="${r.lat}" data-lng="${r.lng}">
                <div class="restaurant-brand" style="background-color: ${config.color}; color: ${config.textColor}">
                    ${config.name.charAt(0)}
                </div>
                <div class="restaurant-info">
                    <div class="restaurant-name">${r.name || 'Unavngivet'}</div>
                    <div class="restaurant-address">${r.address || ''} ${r.zipCity || ''}</div>
                    <div class="restaurant-details">
                        <span class="brand-name">${config.name}</span>
                        ${r.rating ? `<span class="rating">★ ${r.rating}</span>` : ''}
                        ${r.hours ? `<span>${r.hours}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers to jump to map
    container.querySelectorAll('.restaurant-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            if (lat && lng) {
                document.getElementById('btn-map').click();
                map.setView([lat, lng], 15);
            }
        });
        item.style.cursor = 'pointer';
    });
}

// Setup search and sort
function setupListControls() {
    document.getElementById('search-input').addEventListener('input', renderList);
    document.getElementById('sort-select').addEventListener('change', renderList);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    addMarkersToMap();
    setupFilters();
    setupViewToggle();
    setupListControls();
});
