// Script to fetch Google Places ratings, addresses, and opening hours
// Run with: node fetch-ratings.js

const fs = require('fs');

const API_KEY = 'AIzaSyBZo42YoLf_an0fwRpqGFNatwMrLD4AS5E';

// Read current data
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
if (!match) {
    console.error('Could not parse data.js');
    process.exit(1);
}

// Parse the restaurants object
let restaurants;
eval('restaurants = ' + match[1]);

async function fetchPlaceId(lat, lng, brandName) {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&keyword=${encodeURIComponent(brandName)}&key=${API_KEY}`;

    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            return data.results[0].place_id;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function fetchPlaceDetails(placeId) {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,formatted_address,opening_hours&key=${API_KEY}`;

    try {
        const response = await fetch(detailsUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
            const result = data.result;
            let hours = null;

            if (result.opening_hours && result.opening_hours.weekday_text) {
                // Get a simplified version of hours
                hours = result.opening_hours.weekday_text.join(' | ');
            }

            return {
                rating: result.rating || null,
                address: result.formatted_address || null,
                hours: hours
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function main() {
    console.log('Fetching data from Google Places API...\n');

    let totalUpdated = 0;
    let totalProcessed = 0;

    for (const brand of Object.keys(restaurants)) {
        const brandName = {
            mcdonalds: "McDonald's",
            burgerking: "Burger King",
            sunset: "Sunset Boulevard",
            max: "Max Burgers",
            jagger: "Jagger"
        }[brand];

        console.log(`\n=== ${brandName} (${restaurants[brand].length} locations) ===`);

        for (let i = 0; i < restaurants[brand].length; i++) {
            const restaurant = restaurants[brand][i];
            totalProcessed++;

            process.stdout.write(`  [${i + 1}/${restaurants[brand].length}] ${restaurant.name}... `);

            // First, find the place
            const placeId = await fetchPlaceId(restaurant.lat, restaurant.lng, brandName);

            if (placeId) {
                // Then get details
                const details = await fetchPlaceDetails(placeId);

                if (details) {
                    if (details.rating) {
                        restaurant.rating = details.rating;
                    }
                    if (details.address) {
                        restaurant.address = details.address;
                    }
                    if (details.hours) {
                        restaurant.hours = details.hours;
                    }
                    console.log(`★ ${details.rating || '-'}`);
                    totalUpdated++;
                } else {
                    console.log('no details');
                }
            } else {
                console.log('not found');
            }

            // Rate limiting - wait 150ms between requests
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    console.log(`\n\nDone! Updated ${totalUpdated}/${totalProcessed} restaurants.`);

    // Write updated data back to file
    const newDataContent = `// Restaurant data for Denmark
// Generated: ${new Date().toISOString().split('T')[0]}
// Data fetched from Google Places API (ratings, addresses, opening hours)

const restaurants = ${JSON.stringify(restaurants, null, 2)};`;

    fs.writeFileSync('data.js', newDataContent);
    console.log('\ndata.js has been updated!');
}

main();
