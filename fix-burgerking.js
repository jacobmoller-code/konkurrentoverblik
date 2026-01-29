const fs = require('fs');
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let restaurants;
eval('restaurants = ' + match[1]);

// Remove Norwegian restaurants and charging station
const filteredBK = restaurants.burgerking.filter(r => {
    const addr = r.address.toLowerCase();
    // Remove Norway
    if (addr.includes('norway') || addr.includes('kristiansand') || addr.includes('mandal')) return false;
    // Remove charging station
    if (r.name.toLowerCase().includes('charging')) return false;
    return true;
});

console.log('After filtering: ' + filteredBK.length + ' Burger King restaurants');

// Check for Fields and Rødovre
const hasFields = filteredBK.some(r => r.address.includes('Arne Jacobsen'));
const hasRodovre = filteredBK.some(r => r.address.includes('Jyllingevej'));

console.log('Has Fields (Arne Jacobsens Allé):', hasFields);
console.log('Has Rødovre (Jyllingevej):', hasRodovre);

// Update the data
restaurants.burgerking = filteredBK;

// Write back
const newContent = `// Restaurant data for Denmark
// Generated: ${new Date().toISOString().split('T')[0]}
// McDonald's data from internal Excel files (${restaurants.mcdonalds.length} locations)
// Competitor data from Google Places API

const restaurants = ${JSON.stringify(restaurants, null, 2)};`;

fs.writeFileSync('data.js', newContent);
console.log('\ndata.js updated! Now has ' + filteredBK.length + ' Burger King restaurants.');
