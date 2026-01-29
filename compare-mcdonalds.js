// Script to compare McDonald's data from Excel vs Google Places API
const fs = require('fs');
const XLSX = require('xlsx');

// Read the Excel file with geo coordinates
const workbook = XLSX.readFile('Restaurant geo location.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const excelData = XLSX.utils.sheet_to_json(worksheet);

console.log(`\n=== McDonald's from Excel file: ${excelData.length} restaurants ===\n`);

// Read data.js to get Google results
const dataContent = fs.readFileSync('data.js', 'utf8');
const match = dataContent.match(/const restaurants = ({[\s\S]*});/);
let restaurants;
eval('restaurants = ' + match[1]);

const googleMcdonalds = restaurants.mcdonalds;
console.log(`=== McDonald's from Google Places: ${googleMcdonalds.length} restaurants ===\n`);

// Create lookup maps
const excelByName = new Map();
excelData.forEach(r => {
    const name = (r.Name || r.name || '').toLowerCase().trim();
    excelByName.set(name, r);
});

const googleByAddress = new Map();
googleMcdonalds.forEach(r => {
    const addr = (r.address || '').toLowerCase();
    googleByAddress.set(addr, r);
});

// Find restaurants in Google but not in Excel (by rough name matching)
console.log('\n=== Restaurants found by Google but NOT in your Excel file ===\n');
let notInExcel = [];
googleMcdonalds.forEach(g => {
    const gName = (g.name || '').toLowerCase();
    // Try to find a match in Excel
    let found = false;
    for (const [excelName, excelRow] of excelByName) {
        if (gName.includes(excelName) || excelName.includes(gName)) {
            found = true;
            break;
        }
    }

    // Also try matching by coordinates (within ~100m)
    if (!found) {
        for (const excelRow of excelData) {
            const excelLat = excelRow.Latitude || excelRow.lat;
            const excelLng = excelRow.Longitude || excelRow.lng;
            if (excelLat && excelLng) {
                const latDiff = Math.abs(g.lat - excelLat);
                const lngDiff = Math.abs(g.lng - excelLng);
                if (latDiff < 0.001 && lngDiff < 0.001) { // ~100m
                    found = true;
                    break;
                }
            }
        }
    }

    if (!found) {
        notInExcel.push(g);
    }
});

console.log(`Found ${notInExcel.length} restaurants in Google but not in Excel:\n`);
notInExcel.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   Address: ${r.address}`);
    console.log(`   Rating: ${r.rating || 'N/A'}`);
    console.log('');
});

// Find restaurants in Excel but not in Google
console.log('\n=== Restaurants in your Excel file but NOT found by Google ===\n');
let notInGoogle = [];
excelData.forEach(e => {
    const eLat = e.Latitude || e.lat;
    const eLng = e.Longitude || e.lng;

    let found = false;
    for (const g of googleMcdonalds) {
        const latDiff = Math.abs(g.lat - eLat);
        const lngDiff = Math.abs(g.lng - eLng);
        if (latDiff < 0.002 && lngDiff < 0.002) { // ~200m tolerance
            found = true;
            break;
        }
    }

    if (!found) {
        notInGoogle.push(e);
    }
});

console.log(`Found ${notInGoogle.length} restaurants in Excel but not found by Google:\n`);
notInGoogle.forEach((r, i) => {
    console.log(`${i + 1}. ${r.Name || r.name || 'Unknown'}`);
    console.log(`   Location: ${r.Latitude || r.lat}, ${r.Longitude || r.lng}`);
    console.log('');
});

console.log('\n=== SUMMARY ===');
console.log(`Excel file: ${excelData.length} restaurants`);
console.log(`Google found: ${googleMcdonalds.length} restaurants`);
console.log(`In Google but not Excel: ${notInExcel.length}`);
console.log(`In Excel but not Google: ${notInGoogle.length}`);
