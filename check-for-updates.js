// Check for new/closed restaurants by comparing with Google Places API
// Run this script manually: node check-for-updates.js
// This will use Google API credits - use sparingly!

const fs = require('fs');

const API_KEY = 'AIzaSyC8t2D1cJ3rHPc9kPSxBeY-sVLEuTCbixU';

// Brand search configuration
const brands = {
    mcdonalds: { searchTerm: "McDonald's", matchPatterns: ["mcdonald", "mc donald"] },
    burgerking: { searchTerm: "Burger King", matchPatterns: ["burger king"] },
    sunset: { searchTerm: "Sunset Boulevard restaurant", matchPatterns: ["sunset boulevard", "sunset blvd"] },
    max: { searchTerm: "Max Burgers", matchPatterns: ["max burger", "max hamburg"] },
    jagger: { searchTerm: "Jagger restaurant", matchPatterns: ["jagger"] }
};

// Denmark bounding box
const DENMARK_BOUNDS = {
    minLat: 54.5, maxLat: 57.8,
    minLng: 8.0, maxLng: 13.0
};

// Check if address is in Denmark
function isDanishAddress(address) {
    if (!address) return false;
    const addressLower = address.toLowerCase();
    if (addressLower.includes('denmark') || addressLower.includes('danmark')) return true;
    if (addressLower.includes('germany') || addressLower.includes('deutschland') ||
        addressLower.includes('norway') || addressLower.includes('sverige')) return false;
    const postalMatch = address.match(/\b(\d{4})\s+\w/);
    if (postalMatch && !address.match(/\b\d{5}\b/)) {
        const postalCode = parseInt(postalMatch[1]);
        if (postalCode >= 800 && postalCode <= 9990) return true;
    }
    return false;
}

// Load current data
function loadCurrentData() {
    const dataContent = fs.readFileSync('data.js', 'utf8');
    const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
    let restaurants;
    eval('restaurants = ' + match[1]);
    return restaurants;
}

// Search for restaurants using Google Places API
async function searchBrand(brandKey, brandConfig) {
    const foundPlaces = new Map();
    const gridStep = 0.4;
    let areasChecked = 0;

    for (let lat = DENMARK_BOUNDS.minLat; lat <= DENMARK_BOUNDS.maxLat; lat += gridStep) {
        for (let lng = DENMARK_BOUNDS.minLng; lng <= DENMARK_BOUNDS.maxLng; lng += gridStep) {
            areasChecked++;
            process.stdout.write(`\r  Searching ${brandConfig.searchTerm}... ${areasChecked} areas, ${foundPlaces.size} found`);

            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=30000&keyword=${encodeURIComponent(brandConfig.searchTerm)}&type=restaurant&key=${API_KEY}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.results) {
                    for (const place of data.results) {
                        const nameLower = place.name.toLowerCase();
                        const isMatch = brandConfig.matchPatterns.some(pattern => nameLower.includes(pattern));
                        if (isMatch && !foundPlaces.has(place.place_id)) {
                            foundPlaces.set(place.place_id, place);
                        }
                    }
                }
            } catch (error) {
                // Continue on error
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    console.log('');

    // Get details and filter to Denmark only
    const restaurants = [];
    let i = 0;
    for (const [placeId, place] of foundPlaces) {
        i++;
        process.stdout.write(`\r  Getting details... ${i}/${foundPlaces.size}`);

        try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,opening_hours&key=${API_KEY}`;
            const response = await fetch(detailsUrl);
            const data = await response.json();

            if (data.result && isDanishAddress(data.result.formatted_address)) {
                restaurants.push({
                    name: data.result.name,
                    address: data.result.formatted_address,
                    lat: data.result.geometry.location.lat,
                    lng: data.result.geometry.location.lng,
                    rating: data.result.rating,
                    placeId: placeId
                });
            }
        } catch (error) {
            // Continue on error
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('');
    return restaurants;
}

// Compare coordinates to check if same restaurant (within ~200m)
function isSameLocation(lat1, lng1, lat2, lng2) {
    const latDiff = Math.abs(lat1 - lat2);
    const lngDiff = Math.abs(lng1 - lng2);
    return latDiff < 0.002 && lngDiff < 0.002;
}

// Main update function
async function checkForUpdates() {
    console.log('='.repeat(60));
    console.log('CHECKING FOR NEW/CLOSED RESTAURANTS');
    console.log('This will use Google API credits!');
    console.log('='.repeat(60));
    console.log('');

    const currentData = loadCurrentData();
    const changes = {
        new: [],
        closed: [],
        unchanged: 0
    };

    for (const [brandKey, brandConfig] of Object.entries(brands)) {
        console.log(`\n=== ${brandConfig.searchTerm} ===`);

        const currentRestaurants = currentData[brandKey].filter(r => r.status !== 'closed');
        console.log(`  Current active: ${currentRestaurants.length}`);

        const freshData = await searchBrand(brandKey, brandConfig);
        console.log(`  Found in Google: ${freshData.length}`);

        // Find new restaurants (in Google but not in current)
        for (const fresh of freshData) {
            const exists = currentRestaurants.some(curr =>
                isSameLocation(curr.lat, curr.lng, fresh.lat, fresh.lng)
            );
            if (!exists) {
                changes.new.push({
                    brand: brandKey,
                    ...fresh,
                    status: 'new',
                    addedDate: new Date().toISOString().split('T')[0]
                });
                console.log(`  NEW: ${fresh.name} - ${fresh.address}`);
            }
        }

        // Find closed restaurants (in current but not in Google)
        for (const curr of currentRestaurants) {
            const stillExists = freshData.some(fresh =>
                isSameLocation(curr.lat, curr.lng, fresh.lat, fresh.lng)
            );
            if (!stillExists) {
                changes.closed.push({
                    brand: brandKey,
                    name: curr.name,
                    address: curr.address
                });
                console.log(`  CLOSED?: ${curr.name} - ${curr.address}`);
            } else {
                changes.unchanged++;
            }
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`New restaurants found: ${changes.new.length}`);
    console.log(`Possibly closed: ${changes.closed.length}`);
    console.log(`Unchanged: ${changes.unchanged}`);

    if (changes.new.length > 0 || changes.closed.length > 0) {
        // Save changes report
        const report = {
            date: new Date().toISOString(),
            new: changes.new,
            possiblyClosed: changes.closed
        };
        fs.writeFileSync('update-report.json', JSON.stringify(report, null, 2));
        console.log('\nReport saved to update-report.json');
        console.log('Review the report and run "node apply-updates.js" to apply changes.');
    } else {
        console.log('\nNo changes detected!');
    }
}

checkForUpdates();
