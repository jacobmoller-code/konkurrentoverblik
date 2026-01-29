// ============================================
// GOOGLE PLACES API KEY - Add your key here
// ============================================
const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE';

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

    // Sort by brand, then by name
    allRestaurants.sort((a, b) => {
        const brandCompare = brandConfig[a.brand].name.localeCompare(brandConfig[b.brand].name);
        if (brandCompare !== 0) return brandCompare;
        return (a.name || '').localeCompare(b.name || '');
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

// ============================================
// GOOGLE PLACES API FUNCTIONS
// ============================================

// Fetch place details from Google Places API
async function fetchPlaceDetails(lat, lng, name) {
    if (GOOGLE_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('Google API key not configured');
        return null;
    }

    try {
        // First, find the place using Nearby Search
        const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${GOOGLE_API_KEY}`;

        // Note: This needs to be done server-side or via a proxy due to CORS
        // For client-side, you'd use the Google Maps JavaScript API instead
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const place = data.results[0];
            return {
                rating: place.rating,
                placeId: place.place_id
            };
        }
    } catch (error) {
        console.error('Error fetching place details:', error);
    }
    return null;
}

// Enrich all restaurants with Google data (run once to update data.js)
async function enrichWithGoogleData() {
    if (GOOGLE_API_KEY === 'YOUR_API_KEY_HERE') {
        alert('Please add your Google API key to app.js first!');
        return;
    }

    console.log('Starting to fetch Google Places data...');

    for (const brand of Object.keys(restaurants)) {
        for (const restaurant of restaurants[brand]) {
            const details = await fetchPlaceDetails(restaurant.lat, restaurant.lng, restaurant.name);
            if (details) {
                restaurant.rating = details.rating;
                console.log(`Updated ${restaurant.name}: rating ${details.rating}`);
            }
            // Rate limiting - wait 200ms between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    console.log('Done! Copy this data to update data.js:');
    console.log(JSON.stringify(restaurants, null, 2));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    addMarkersToMap();
    setupFilters();
    setupViewToggle();
    renderList();
});
