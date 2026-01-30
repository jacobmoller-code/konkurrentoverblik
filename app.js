// ============================================
// GOOGLE PLACES API KEY - Add your key here
// ============================================
const GOOGLE_API_KEY = 'AIzaSyC8t2D1cJ3rHPc9kPSxBeY-sVLEuTCbixU';

// Initialize map centered on Denmark
const map = L.map('map').setView([56.0, 10.5], 7);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Brand configuration with official colors and logos
const brandConfig = {
    mcdonalds: {
        name: "McDonald's",
        color: '#FFC72C',
        textColor: '#000',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/40px-McDonald%27s_Golden_Arches.svg.png'
    },
    burgerking: {
        name: 'Burger King',
        color: '#D62300',
        textColor: '#fff',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/40px-Burger_King_logo_%281999%29.svg.png'
    },
    sunset: {
        name: 'Sunset Boulevard',
        color: '#F15A24',
        textColor: '#fff',
        logo: 'https://sunset-boulevard.dk/wp-content/uploads/2023/02/cropped-sunset-favicon-270x270.png'
    },
    max: {
        name: 'Max',
        color: '#E30613',
        textColor: '#fff',
        logo: 'https://www.max.se/Static/images/max-logo.svg'
    },
    jagger: {
        name: 'Jagger',
        color: '#2D5A27',
        textColor: '#fff',
        logo: 'https://jagger.dk/wp-content/uploads/2021/03/cropped-jagger-favicon-270x270.png'
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

// Current sort state
let currentSort = { field: 'name', direction: 'asc' };

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

                // Search by name and address to find the actual restaurant listing
                const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address || ''}`);
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
                const popupContent = `
                    <div class="popup-content">
                        <span class="brand-tag brand-${brand}">${config.name}</span>
                        <h3>${restaurant.name}</h3>
                        <p>${restaurant.address || ''}</p>
                        <p>${restaurant.zipCity || ''}</p>
                        ${restaurant.rating ? `<p class="rating">★ ${restaurant.rating}</p>` : ''}
                        <a href="${googleMapsUrl}" target="_blank" class="google-maps-btn">Åbn i Google Maps</a>
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

// Calculate weekly open hours percentage
function calculateOpenPct(hours) {
    if (!hours) return null;

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let totalHours = 0;

    const parts = hours.split(' | ');
    parts.forEach(part => {
        weekdays.forEach(day => {
            if (part.startsWith(day)) {
                let time = part.replace(day + ': ', '');

                if (time.includes('Open 24') || time.includes('24 hours')) {
                    totalHours += 24;
                } else if (time.includes('Closed')) {
                    // 0 hours
                } else {
                    const match = time.match(/(\d+):?(\d*)\s*([AP]M)?\s*[–-]\s*(\d+):?(\d*)\s*([AP]M)?/i);
                    if (match) {
                        let openHour = parseInt(match[1]);
                        let openMin = match[2] ? parseInt(match[2]) : 0;
                        let closeHour = parseInt(match[4]);
                        let closeMin = match[5] ? parseInt(match[5]) : 0;

                        if (match[3] && match[3].toUpperCase() === 'PM' && openHour < 12) openHour += 12;
                        if (match[6] && match[6].toUpperCase() === 'PM' && closeHour < 12) closeHour += 12;
                        if (match[3] && match[3].toUpperCase() === 'AM' && openHour === 12) openHour = 0;
                        if (match[6] && match[6].toUpperCase() === 'AM' && closeHour === 12) closeHour = 0;

                        let dayHours = closeHour - openHour + (closeMin - openMin) / 60;
                        if (dayHours < 0) dayHours += 24; // Crosses midnight
                        totalHours += dayHours;
                    }
                }
            }
        });
    });

    // 168 hours in a week (24 * 7)
    return Math.round((totalHours / 168) * 100);
}

// Render list view
function renderList() {
    const container = document.getElementById('restaurant-list');

    // Collect all visible restaurants with calculated openPct
    let allRestaurants = [];

    Object.keys(restaurants).forEach(brand => {
        const checkbox = document.getElementById(`filter-${brand}`);
        if (checkbox.checked) {
            restaurants[brand].forEach(r => {
                const openPct = calculateOpenPct(r.hours);
                allRestaurants.push({ ...r, brand, openPct });
            });
        }
    });

    // Sort based on current sort state
    allRestaurants.sort((a, b) => {
        let comparison = 0;

        if (currentSort.field === 'name') {
            comparison = (a.name || '').localeCompare(b.name || '');
        } else if (currentSort.field === 'address') {
            comparison = (a.address || '').localeCompare(b.address || '');
        } else if (currentSort.field === 'rating') {
            const ratingA = a.rating ?? -1;
            const ratingB = b.rating ?? -1;
            comparison = ratingB - ratingA;
        } else if (currentSort.field === 'openPct') {
            const pctA = a.openPct ?? -1;
            const pctB = b.openPct ?? -1;
            comparison = pctB - pctA;
        }

        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    // Update sort arrows in header
    document.querySelectorAll('.sortable').forEach(th => {
        const arrow = th.querySelector('.sort-arrow');
        if (th.dataset.sort === currentSort.field) {
            arrow.textContent = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
            th.classList.add('sorted');
        } else {
            arrow.textContent = '';
            th.classList.remove('sorted');
        }
    });

    // Render table rows with weekday hours
    container.innerHTML = allRestaurants.map(r => {
        const config = brandConfig[r.brand];
        const searchQuery = encodeURIComponent(`${r.name} ${r.address || ''}`);
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;

        // Parse hours into weekday columns
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const hoursMap = {};

        if (r.hours) {
            const parts = r.hours.split(' | ');
            parts.forEach(part => {
                weekdays.forEach(day => {
                    if (part.startsWith(day)) {
                        let time = part.replace(day + ': ', '');
                        const match = time.match(/(\d+):?\d*\s*([AP]M)?\s*[–-]\s*(\d+):?\d*\s*([AP]M)?/i);
                        if (match) {
                            let open = parseInt(match[1]);
                            let close = parseInt(match[3]);
                            if (match[2] && match[2].toUpperCase() === 'PM' && open < 12) open += 12;
                            if (match[4] && match[4].toUpperCase() === 'PM' && close < 12) close += 12;
                            if (match[2] && match[2].toUpperCase() === 'AM' && open === 12) open = 0;
                            if (match[4] && match[4].toUpperCase() === 'AM' && close === 12) close = 0;
                            hoursMap[day] = `${open}-${close}`;
                        } else if (time.includes('Open 24') || time.includes('24 hours')) {
                            hoursMap[day] = '24t';
                        } else if (time.includes('Closed')) {
                            hoursMap[day] = 'Lukket';
                        } else {
                            hoursMap[day] = time.substring(0, 10);
                        }
                    }
                });
            });
        }

        const statusClass = r.status === 'new' ? 'status-new' : (r.status === 'closed' ? 'status-closed' : '');

        return `
            <tr class="restaurant-row ${statusClass}" data-url="${googleMapsUrl}">
                <td class="name-cell">${r.name || '-'}</td>
                <td class="address-cell">${r.address || '-'}</td>
                <td class="rating-cell">${r.rating ? '★' + r.rating : '-'}</td>
                <td class="pct-cell">${r.openPct !== null ? r.openPct + '%' : '-'}</td>
                <td class="hour-cell">${hoursMap['Monday'] || '-'}</td>
                <td class="hour-cell">${hoursMap['Tuesday'] || '-'}</td>
                <td class="hour-cell">${hoursMap['Wednesday'] || '-'}</td>
                <td class="hour-cell">${hoursMap['Thursday'] || '-'}</td>
                <td class="hour-cell">${hoursMap['Friday'] || '-'}</td>
                <td class="hour-cell">${hoursMap['Saturday'] || '-'}</td>
                <td class="hour-cell">${hoursMap['Sunday'] || '-'}</td>
            </tr>
        `;
    }).join('');

    // Add click handlers to open Google Maps
    container.querySelectorAll('.restaurant-row').forEach(row => {
        row.addEventListener('click', () => {
            const url = row.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
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

// Populate admin section with metadata
function updateAdminInfo() {
    if (typeof restaurantMetadata !== 'undefined') {
        const lastUpdated = document.getElementById('last-updated');
        const baselineDate = document.getElementById('baseline-date');
        const totalRestaurants = document.getElementById('total-restaurants');

        if (lastUpdated) lastUpdated.textContent = restaurantMetadata.lastUpdated || '-';
        if (baselineDate) baselineDate.textContent = restaurantMetadata.baselineDate || '-';
        if (totalRestaurants) totalRestaurants.textContent = restaurantMetadata.totalRestaurants || '-';
    }
}

// Setup admin toggle
function setupAdminToggle() {
    const toggle = document.getElementById('admin-toggle');
    const panel = document.getElementById('admin-panel');
    if (toggle && panel) {
        toggle.addEventListener('click', () => {
            panel.classList.toggle('show');
        });
    }
}

// Setup sorting on table headers
function setupSorting() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;

            // Toggle direction if same field, otherwise default to asc (or desc for rating/openPct)
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                // Rating and openPct default to descending (highest first), others to ascending
                currentSort.direction = (field === 'rating' || field === 'openPct') ? 'desc' : 'asc';
            }

            renderList();
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    addMarkersToMap();
    setupFilters();
    setupViewToggle();
    setupSorting();
    renderList();
    updateAdminInfo();
    setupAdminToggle();
});
