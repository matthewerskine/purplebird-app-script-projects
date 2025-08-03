// Test Column Mapping
// Based on the exact row data provided

// Simulate the exact headers and row data
const headers = [
  "name", "title", "", "placeId", "cid", "", "companyName", "address", "phone", "rating", "reviews", 
  "facebookUrl", "mapsUrl", "category", "email", "emailStatus", "priority", "year", "team", "year2", 
  "hasWebsite", "priority2", "", "hasPhone", "hasEmail", "hasFacebook", "hasMaps", "hasCategory", 
  "hasRating", "", "airtableAction", "processed", "status"
];

const rowData = [
  "Inverness", "Landscape designer", "", "ChIJuepnp19zj0gRdFt5mOWqAJs", "0x488f735fa767eab9:0x9b00aae598795b74", 
  "", "Creative Scapes", "34 Ardholm Pl, Inverness IV2 4QG", "07587 806546", "5", "1", 
  "https://m.facebook.com/profile.php?id=2200966186859411&ref=content_filter", 
  "https://www.google.com/maps/contrib/111598435523302407250", "Landscape Gardener", "null", "unknown", 
  "Low", "2025", "Meta Design Team", "2025", "No", "High", "", "No", "No", "No", "No", "No", "No", 
  "", "skip", "Sent on 2025-07-31 (ID: recStorzN3MWsRSCC)", "Complete"
];

// Simulate the exact getHeaderMap function from Helpers.js
function getHeaderMap(sheetHeaders) {
  const map = {};
  sheetHeaders.forEach((headerValue, index) => {
    const headerKey = String(headerValue || '').trim();
    if (headerKey) {
      map[headerKey] = index;
    }
  });
  return map;
}

// Simulate the exact processDataRows logic
function testColumnMapping() {
  console.log('=== TESTING COLUMN MAPPING ===');
  
  // Create header map exactly like the code does
  const headerMap = getHeaderMap(headers);
  
  console.log('\n=== HEADER MAP ===');
  Object.keys(headerMap).forEach(key => {
    console.log(`"${key}" -> column ${headerMap[key] + 1} (index ${headerMap[key]})`);
  });
  
  // Check for airtableAction column
  const airtableActionColIndex = headerMap['airtableaction'];
  console.log(`\n=== AIRTABLE ACTION COLUMN ===`);
  console.log(`Looking for: "airtableAction"`);
  console.log(`Found at index: ${airtableActionColIndex}`);
  console.log(`Column letter: ${airtableActionColIndex !== undefined ? String.fromCharCode(65 + airtableActionColIndex) : 'NOT FOUND'}`);
  
  if (airtableActionColIndex === undefined) {
    console.log('❌ PROBLEM: airtableAction column not found!');
    return;
  }
  
  // Check the actual value
  const rawActionValue = rowData[airtableActionColIndex];
  console.log(`\n=== ACTUAL VALUE ===`);
  console.log(`Raw value: "${rawActionValue}"`);
  console.log(`Type: ${typeof rawActionValue}`);
  console.log(`Length: ${rawActionValue ? rawActionValue.length : 0}`);
  
  // Apply the exact logic from Airtable.js
  const actionValue = String(rawActionValue || '').trim().toLowerCase();
  console.log(`\n=== LOGIC ANALYSIS ===`);
  console.log(`Cleaned value: "${actionValue}"`);
  console.log(`Length after trim: ${actionValue.length}`);
  console.log(`Comparison with 'skip': ${actionValue === 'skip'}`);
  console.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
  
  // Test the exact condition from the code
  console.log(`\n=== EXACT CODE CONDITION ===`);
  console.log(`airtableActionColIndex !== undefined: ${airtableActionColIndex !== undefined}`);
  console.log(`actionValue === 'skip': ${actionValue === 'skip'}`);
  console.log(`Full condition: ${airtableActionColIndex !== undefined && actionValue === 'skip'}`);
  
  if (airtableActionColIndex !== undefined && actionValue === 'skip') {
    console.log('✅ CONDITION MET: Row should be skipped');
  } else {
    console.log('❌ CONDITION NOT MET: Row will be processed');
  }
  
  // Show all non-empty values for debugging
  console.log(`\n=== ALL NON-EMPTY VALUES ===`);
  rowData.forEach((value, index) => {
    if (value !== '') {
      console.log(`  Col ${index + 1} (${headers[index]}): "${value}"`);
    }
  });
}

// Run the test
testColumnMapping(); 