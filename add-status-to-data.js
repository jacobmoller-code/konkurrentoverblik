// Add status field to all restaurants and create baseline
const fs = require('fs');

const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let restaurants;
eval('restaurants = ' + match[1]);

// Add status: "active" to all existing restaurants (they become the baseline)
Object.keys(restaurants).forEach(brand => {
    restaurants[brand] = restaurants[brand].map(r => ({
        ...r,
        status: r.status || 'active',  // Keep existing status or set to active
        addedDate: r.addedDate || new Date().toISOString().split('T')[0]  // When first added
    }));
});

// Create metadata
const metadata = {
    lastUpdated: new Date().toISOString().split('T')[0],
    baselineDate: '2026-01-30',
    totalRestaurants: Object.values(restaurants).reduce((sum, arr) => sum + arr.length, 0)
};

// Write back with metadata
const newContent = `// Restaurant data for Denmark
// Baseline established: ${metadata.baselineDate}
// Last updated: ${metadata.lastUpdated}
// Status: active = confirmed open, new = recently discovered, closed = no longer found
//
// McDonald's: ${restaurants.mcdonalds.length} | Burger King: ${restaurants.burgerking.length} | Sunset Boulevard: ${restaurants.sunset.length} | Max: ${restaurants.max.length} | Jagger: ${restaurants.jagger.length}
// Total: ${metadata.totalRestaurants} restaurants

const restaurantMetadata = ${JSON.stringify(metadata, null, 2)};

const restaurants = ${JSON.stringify(restaurants, null, 2)};`;

fs.writeFileSync('data.js', newContent);

console.log('Added status field to all restaurants');
console.log(`Total: ${metadata.totalRestaurants} restaurants marked as "active" baseline`);
