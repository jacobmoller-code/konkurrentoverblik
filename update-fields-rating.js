const fs = require('fs');
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let restaurants;
eval('restaurants = ' + match[1]);

// Update Fields rating
restaurants.burgerking = restaurants.burgerking.map(r => {
    if (r.address.includes('Arne Jacobsen')) {
        r.rating = 4.2;
        console.log('Updated Fields rating to 4.2');
    }
    return r;
});

// Write back
const newContent = `// Restaurant data for Denmark
// Generated: ${new Date().toISOString().split('T')[0]}
// McDonald's data from internal Excel files (${restaurants.mcdonalds.length} locations)
// Competitor data from Google Places API

const restaurants = ${JSON.stringify(restaurants, null, 2)};`;

fs.writeFileSync('data.js', newContent);
console.log('data.js updated!');
