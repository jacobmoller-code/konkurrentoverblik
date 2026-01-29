const fs = require('fs');
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let restaurants;
eval('restaurants = ' + match[1]);

// Add missing Fields location
const fieldsLocation = {
    name: "Burger King",
    address: "Arne Jacobsens Allé 12, 2300 København S, Denmark",
    lat: 55.6312,
    lng: 12.5773,
    rating: null,
    hours: null
};

// Check if Fields already exists
const hasFields = restaurants.burgerking.some(r => r.address.includes('Arne Jacobsen'));
if (!hasFields) {
    restaurants.burgerking.push(fieldsLocation);
    console.log('Added Fields location');
}

// Fix Rødovre address if needed (update Islevdalvej to Jyllingevej)
restaurants.burgerking = restaurants.burgerking.map(r => {
    if (r.address.includes('Islevdalvej') && r.address.includes('Rødovre')) {
        r.address = 'Jyllingevej 336C, 2610 Rødovre, Denmark';
        console.log('Fixed Rødovre address');
    }
    return r;
});

console.log('Total Burger King: ' + restaurants.burgerking.length);

// Write back
const newContent = `// Restaurant data for Denmark
// Generated: ${new Date().toISOString().split('T')[0]}
// McDonald's data from internal Excel files (${restaurants.mcdonalds.length} locations)
// Competitor data from Google Places API

const restaurants = ${JSON.stringify(restaurants, null, 2)};`;

fs.writeFileSync('data.js', newContent);
console.log('data.js updated!');
