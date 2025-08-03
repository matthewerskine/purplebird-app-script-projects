function checkActualColumns() {
  console.log('=== CHECKING ACTUAL COLUMNS IN SHEET ===');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  console.log(`Current sheet: ${sheet.getName()}`);
  
  // Get all headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  console.log(`Total columns: ${headers.length}`);
  
  // Create header map
  const headerMap = getHeaderMap(headers);
  
  console.log('\n=== ALL AVAILABLE COLUMNS ===');
  Object.keys(headerMap).forEach(key => {
    const index = headerMap[key];
    const columnLetter = String.fromCharCode(65 + index);
    console.log(`"${key}" -> Column ${columnLetter} (index ${index})`);
  });
  
  // Check for airtable action related columns
  console.log('\n=== LOOKING FOR AIRTABLE ACTION COLUMNS ===');
  const airtableActionVariations = [
    'airtableAction',
    'Airtable Action',
    'airtable action',
    'AirtableAction',
    'airtable_action',
    'Airtable_Action',
    'action',
    'Action',
    'skip',
    'Skip'
  ];
  
  airtableActionVariations.forEach(variation => {
    const index = headerMap[variation];
    if (index !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + index)} (index ${index})`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Fuzzy search for columns containing "airtable" or "action"
  console.log('\n=== FUZZY SEARCH FOR AIRTABLE/ACTION COLUMNS ===');
  Object.keys(headerMap).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('airtable') || lowerKey.includes('action') || lowerKey.includes('skip')) {
      const index = headerMap[key];
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`🔍 POTENTIAL MATCH: "${key}" -> Column ${columnLetter} (index ${index})`);
    }
  });
  
  // Check row 2706 specifically
  console.log('\n=== CHECKING ROW 2706 SPECIFICALLY ===');
  if (sheet.getLastRow() >= 2706) {
    const row2706 = sheet.getRange(2706, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log(`Row 2706 has ${row2706.length} columns`);
    
    // Show all non-empty values in row 2706
    row2706.forEach((value, index) => {
      if (value && String(value).trim()) {
        const columnLetter = String.fromCharCode(65 + index);
        const headerName = headers[index] || `Column ${columnLetter}`;
        console.log(`Column ${columnLetter} ("${headerName}"): "${value}"`);
      }
    });
  } else {
    console.log('Row 2706 does not exist in this sheet');
  }
} 