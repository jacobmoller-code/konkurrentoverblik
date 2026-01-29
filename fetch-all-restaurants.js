// Script to fetch ALL restaurants for each brand from Google Places API
// Run with: node fetch-all-restaurants.js

const fs = require('fs');

const API_KEY = 'AIzaSyC8t2D1cJ3rHPc9kPSxBeY-sVLEuTCbixU';

// Denmark bounding box - we'll search in a grid pattern
const DENMARK_BOUNDS = {
    minLat: 54.5,
    maxLat: 57.8,
    minLng: 8.0,
    maxLng: 13.0
};

// Function to check if address is in Denmark
function isDanishAddress(address) {
    if (!address) return false;
    const addressLower = address.toLowerCase();

    // Must contain "denmark" or "danmark"
    if (addressLower.includes('denmark') || addressLower.includes('danmark')) {
        return true;
    }

    // Check for Danish postal code pattern (4 digits followed by Danish city)
    // Danish postal codes are 4 digits, German are 5 digits
    const postalMatch = address.match(/\b(\d{4})\s+\w/);
    if (postalMatch) {
        const postalCode = parseInt(postalMatch[1]);
        // Danish postal codes range from 0800 to 9990
        // Exclude anything that looks like a German 5-digit code
        if (!address.match(/\b\d{5}\b/) && postalCode >= 800 && postalCode <= 9990) {
            // Additional check: should NOT contain "Germany" or "Deutschland"
            if (!addressLower.includes('germany') && !addressLower.includes('deutschland')) {
                return true;
            }
        }
    }

    return false;
}

// Grid size for searching
const GRID_SIZE = 0.4; // degrees

const brands = {
    mcdonalds: { searchTerm: "McDonald's", matchPatterns: ["mcdonald", "mc donald"] },
    burgerking: { searchTerm: "Burger King", matchPatterns: ["burger king"] },
    sunset: { searchTerm: "Sunset Boulevard", matchPatterns: ["sunset boulevard", "sunset blvd"] },
    max: { searchTerm: "Max Burgers", matchPatterns: ["max burger", "max hamburg"] },
    jagger: { searchTerm: "Jagger", matchPatterns: ["jagger"] }
};

function matchesBrand(placeName, matchPatterns) {
    const nameLower = placeName.toLowerCase();
    return matchPatterns.some(pattern => nameLower.includes(pattern));
}

async function searchPlaces(lat, lng, keyword, radius = 50000) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results;
        } else if (data.status === 'ZERO_RESULTS') {
            return [];
        } else {
            if (data.status !== 'REQUEST_DENIED') {
                console.log(`  API: ${data.status}`);
            }
            return [];
        }
    } catch (error) {
        return [];
    }
}

async function getPlaceDetails(placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,opening_hours&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
            const r = data.result;
            let hours = null;
            if (r.opening_hours && r.opening_hours.weekday_text) {
                hours = r.opening_hours.weekday_text.join(' | ');
            }
            return {
                name: r.name,
                address: r.formatted_address,
                lat: r.geometry.location.lat,
                lng: r.geometry.location.lng,
                rating: r.rating,
                hours: hours
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function findAllRestaurantsForBrand(brandKey, brandConfig) {
    console.log(`\n=== Searching for ${brandConfig.searchTerm} ===`);

    const foundPlaces = new Map(); // Use Map to deduplicate by place_id

    // Search in a grid pattern across Denmark
    let searches = 0;
    for (let lat = DENMARK_BOUNDS.minLat; lat <= DENMARK_BOUNDS.maxLat; lat += GRID_SIZE) {
        for (let lng = DENMARK_BOUNDS.minLng; lng <= DENMARK_BOUNDS.maxLng; lng += GRID_SIZE) {
            searches++;
            process.stdout.write(`\r  Searching... ${searches} areas checked, ${foundPlaces.size} found`);

            const results = await searchPlaces(lat, lng, brandConfig.searchTerm);

            for (const place of results) {
                // Only include if name matches the brand
                if (matchesBrand(place.name, brandConfig.matchPatterns)) {
                    if (!foundPlaces.has(place.place_id)) {
                        foundPlaces.set(place.place_id, place);
                    }
                }
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 80));
        }
    }

    console.log(`\n  Total unique ${brandConfig.searchTerm} locations: ${foundPlaces.size}`);

    // Now get details for each place
    if (foundPlaces.size > 0) {
        console.log(`  Fetching details and filtering to Denmark only...`);
        const restaurants = [];
        let i = 0;
        let skipped = 0;

        for (const [placeId, place] of foundPlaces) {
            i++;
            process.stdout.write(`\r  [${i}/${foundPlaces.size}] Fetching details... (${restaurants.length} Danish, ${skipped} skipped)`);

            const details = await getPlaceDetails(placeId);
            if (details) {
                // Only include if address is in Denmark
                if (isDanishAddress(details.address)) {
                    restaurants.push(details);
                } else {
                    skipped++;
                }
            } else {
                // Use basic info if details fail - check vicinity
                if (isDanishAddress(place.vicinity)) {
                    restaurants.push({
                        name: place.name,
                        address: place.vicinity,
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng,
                        rating: place.rating,
                        hours: null
                    });
                } else {
                    skipped++;
                }
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('');
        console.log(`  Filtered: ${skipped} non-Danish locations removed`);
        return restaurants;
    }

    return [];
}

async function main() {
    console.log('Fetching ALL restaurants from Google Places API...');
    console.log('Searching across Denmark with brand name filtering.\n');

    const allRestaurants = {};

    for (const [brandKey, brandConfig] of Object.entries(brands)) {
        allRestaurants[brandKey] = await findAllRestaurantsForBrand(brandKey, brandConfig);
        console.log(`  ${brandConfig.searchTerm}: ${allRestaurants[brandKey].length} restaurants\n`);
    }

    // Summary
    console.log('\n========== SUMMARY ==========');
    let total = 0;
    for (const [brandKey, restaurants] of Object.entries(allRestaurants)) {
        console.log(`${brands[brandKey].searchTerm}: ${restaurants.length} locations`);
        total += restaurants.length;
    }
    console.log(`TOTAL: ${total} restaurants`);

    // Write to file
    const dataContent = `// Restaurant data for Denmark
// Generated: ${new Date().toISOString().split('T')[0]}
// Data fetched from Google Places API (ratings, addresses, opening hours)

const restaurants = ${JSON.stringify(allRestaurants, null, 2)};`;

    fs.writeFileSync('data.js', dataContent);
    console.log('\ndata.js has been updated!');
}

main();
