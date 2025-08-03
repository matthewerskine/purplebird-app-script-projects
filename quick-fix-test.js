function quickFixTest() {
  console.log('=== QUICK FIX TEST ===');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = getHeaderMap(headers);
  
  console.log('All available columns:');
  Object.keys(headerMap).forEach(key => {
    const index = headerMap[key];
    const columnLetter = String.fromCharCode(65 + index);
    console.log(`"${key}" -> Column ${columnLetter} (index ${index})`);
  });
  
  // Check row 2706 specifically
  if (sheet.getLastRow() >= 2706) {
    const row2706 = sheet.getRange(2706, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('\nRow 2706 values:');
    row2706.forEach((value, index) => {
      if (value && String(value).trim()) {
        const columnLetter = String.fromCharCode(65 + index);
        const headerName = headers[index] || `Column ${columnLetter}`;
        console.log(`Column ${columnLetter} ("${headerName}"): "${value}"`);
      }
    });
  }
  
  // Test the enhanced function
  console.log('\n=== TESTING ENHANCED FUNCTION ===');
  const airtableActionColIndex = findAirtableActionColumn(headerMap);
  console.log(`Enhanced function result: ${airtableActionColIndex}`);
  
  if (airtableActionColIndex !== undefined) {
    const row2706 = sheet.getRange(2706, 1, 1, sheet.getLastColumn()).getValues()[0];
    const actionValue = String(row2706[airtableActionColIndex] || '').trim().toLowerCase();
    console.log(`Action value in row 2706: "${actionValue}"`);
    console.log(`Should skip: ${actionValue === 'skip'}`);
  }
} 