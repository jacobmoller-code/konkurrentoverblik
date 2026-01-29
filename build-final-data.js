// Build final data combining Excel (McDonald's) and Google (competitors)
const fs = require('fs');
const XLSX = require('xlsx');

const API_KEY = 'AIzaSyBZo42YoLf_an0fwRpqGFNatwMrLD4AS5E';

// Read McDonald's Excel files
console.log('Reading McDonald\'s Excel files...');

const geoWorkbook = XLSX.readFile('Restaurant geo location.xlsx');
const geoSheet = geoWorkbook.Sheets[geoWorkbook.SheetNames[0]];
const geoData = XLSX.utils.sheet_to_json(geoSheet);

const restaurantWorkbook = XLSX.readFile('McDonald restaurants.xlsx');
const restaurantSheet = restaurantWorkbook.Sheets[restaurantWorkbook.SheetNames[0]];
const restaurantData = XLSX.utils.sheet_to_json(restaurantSheet);

// Filter to only Active McDonald's
const activeRestaurants = restaurantData.filter(r => r.Status === 'Active');
console.log(`Active McDonald's restaurants: ${activeRestaurants.length}`);

// Create lookup by BuildingName for addresses
const addressLookup = new Map();
activeRestaurants.forEach(r => {
    const name = (r.BuildingName || '').toUpperCase();
    addressLookup.set(name, {
        address: r.RestaurantAddress,
        zipCity: r.ZipCity
    });
});

// Build McDonald's list from geo data with addresses
const mcdonaldsList = [];
geoData.forEach(geo => {
    const locationName = (geo.__EMPTY || '').toUpperCase();
    const addressInfo = addressLookup.get(locationName) || {};

    mcdonaldsList.push({
        name: `McDonald's ${geo.__EMPTY || ''}`.trim(),
        address: addressInfo.address || '',
        zipCity: addressInfo.zipCity || '',
        lat: geo.Latitude,
        lng: geo.Longitude,
        rating: null,
        hours: null
    });
});

console.log(`McDonald's from Excel: ${mcdonaldsList.length}`);

// Read current data.js to get competitor data (already filtered to Denmark)
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let currentData;
eval('currentData = ' + match[1]);

console.log(`\nCompetitors from Google:`);
console.log(`  Burger King: ${currentData.burgerking.length}`);
console.log(`  Sunset Boulevard: ${currentData.sunset.length}`);
console.log(`  Max: ${currentData.max.length}`);
console.log(`  Jagger: ${currentData.jagger.length}`);

// Function to fetch rating from Google
async function fetchRating(lat, lng, name) {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${API_KEY}`;

    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const place = data.results[0];

            // Get detailed hours
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=rating,opening_hours&key=${API_KEY}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();

            let hours = null;
            if (detailsData.result && detailsData.result.opening_hours && detailsData.result.opening_hours.weekday_text) {
                hours = detailsData.result.opening_hours.weekday_text.join(' | ');
            }

            return {
                rating: detailsData.result?.rating || place.rating,
                hours: hours
            };
        }
    } catch (error) {
        // Ignore errors
    }
    return null;
}

async function enrichMcDonalds() {
    console.log('\nFetching Google ratings for McDonald\'s locations...');

    for (let i = 0; i < mcdonaldsList.length; i++) {
        const restaurant = mcdonaldsList[i];
        process.stdout.write(`\r  [${i + 1}/${mcdonaldsList.length}] ${restaurant.name}...`);

        const googleData = await fetchRating(restaurant.lat, restaurant.lng, "McDonald's");
        if (googleData) {
            restaurant.rating = googleData.rating;
            restaurant.hours = googleData.hours;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    console.log('\n');
}

async function main() {
    // Enrich McDonald's with Google ratings
    await enrichMcDonalds();

    // Build final data
    const finalData = {
        mcdonalds: mcdonaldsList,
        burgerking: currentData.burgerking,
        sunset: currentData.sunset,
        max: currentData.max,
        jagger: currentData.jagger
    };

    // Summary
    console.log('\n========== FINAL SUMMARY ==========');
    console.log(`McDonald's: ${finalData.mcdonalds.length} (from Excel)`);
    console.log(`Burger King: ${finalData.burgerking.length} (from Google)`);
    console.log(`Sunset Boulevard: ${finalData.sunset.length} (from Google)`);
    console.log(`Max: ${finalData.max.length} (from Google)`);
    console.log(`Jagger: ${finalData.jagger.length} (from Google)`);

    const total = finalData.mcdonalds.length + finalData.burgerking.length +
        finalData.sunset.length + finalData.max.length + finalData.jagger.length;
    console.log(`TOTAL: ${total} restaurants`);

    // Write to file
    const dataFileContent = `// Restaurant data for Denmark
// Generated: ${new Date().toISOString().split('T')[0]}
// McDonald's data from internal Excel files (${finalData.mcdonalds.length} locations)
// Competitor data from Google Places API

const restaurants = ${JSON.stringify(finalData, null, 2)};`;

    fs.writeFileSync('data.js', dataFileContent);
    console.log('\ndata.js has been updated!');
}

main();
