// Apply updates from update-report.json to data.js
// Run after reviewing the report from check-for-updates.js

const fs = require('fs');

// Check if report exists
if (!fs.existsSync('update-report.json')) {
    console.log('No update-report.json found. Run check-for-updates.js first.');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync('update-report.json', 'utf8'));
console.log(`Report from: ${report.date}`);
console.log(`New restaurants: ${report.new.length}`);
console.log(`Possibly closed: ${report.possiblyClosed.length}`);

// Load current data
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let restaurants;
eval('restaurants = ' + match[1]);

// Add new restaurants
for (const newRestaurant of report.new) {
    const brand = newRestaurant.brand;
    delete newRestaurant.brand; // Remove brand key from restaurant object
    newRestaurant.status = 'new';
    restaurants[brand].push(newRestaurant);
    console.log(`Added: ${newRestaurant.name} (${brand})`);
}

// Mark closed restaurants
for (const closed of report.possiblyClosed) {
    const brand = closed.brand;
    const restaurant = restaurants[brand].find(r =>
        r.address === closed.address || r.name === closed.name
    );
    if (restaurant) {
        restaurant.status = 'closed';
        restaurant.closedDate = new Date().toISOString().split('T')[0];
        console.log(`Marked closed: ${restaurant.name} (${brand})`);
    }
}

// Calculate totals
const totals = {};
let total = 0;
Object.keys(restaurants).forEach(brand => {
    const active = restaurants[brand].filter(r => r.status !== 'closed').length;
    totals[brand] = active;
    total += restaurants[brand].length;
});

// Write back
const newContent = `// Restaurant data for Denmark
// Baseline established: 2026-01-30
// Last updated: ${new Date().toISOString().split('T')[0]}
// Status: active = confirmed open, new = recently discovered, closed = no longer found
//
// McDonald's: ${totals.mcdonalds || 0} | Burger King: ${totals.burgerking || 0} | Sunset Boulevard: ${totals.sunset || 0} | Max: ${totals.max || 0} | Jagger: ${totals.jagger || 0}
// Total: ${total} restaurants

const restaurantMetadata = {
  "lastUpdated": "${new Date().toISOString().split('T')[0]}",
  "baselineDate": "2026-01-30",
  "totalRestaurants": ${total}
};

const restaurants = ${JSON.stringify(restaurants, null, 2)};`;

fs.writeFileSync('data.js', newContent);

// Archive the report
const archiveName = `update-report-${new Date().toISOString().split('T')[0]}.json`;
fs.renameSync('update-report.json', archiveName);

console.log('\nChanges applied to data.js');
console.log(`Report archived as ${archiveName}`);
