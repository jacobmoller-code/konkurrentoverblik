// Check Excel file structure
const XLSX = require('xlsx');

console.log('\n=== Restaurant geo location.xlsx ===');
const wb1 = XLSX.readFile('Restaurant geo location.xlsx');
const ws1 = wb1.Sheets[wb1.SheetNames[0]];
const data1 = XLSX.utils.sheet_to_json(ws1);
console.log('Columns:', Object.keys(data1[0]));
console.log('Sample row:', data1[0]);
console.log('Total rows:', data1.length);

console.log('\n\n=== McDonald restaurants.xlsx ===');
const wb2 = XLSX.readFile('McDonald restaurants.xlsx');
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const data2 = XLSX.utils.sheet_to_json(ws2);
console.log('Columns:', Object.keys(data2[0]));
console.log('Sample row:', data2[0]);
console.log('Total rows:', data2.length);
