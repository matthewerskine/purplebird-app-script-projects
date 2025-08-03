// Test Row 2706 Value
// This helps you check the exact value in the cell

function testRow2706Value() {
  // This is a simple test you can run in the Apps Script editor
  // Copy this function to your Apps Script project and run it
  
  const spreadsheetId = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
  const sheetName = 'GM - Qualify';
  const targetRow = 2706;
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('ERROR: Sheet not found: ' + sheetName);
      return;
    }
    
    // Get headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((headerValue, index) => {
      const headerKey = String(headerValue || '').trim();
      if (headerKey) {
        headerMap[headerKey] = index;
      }
    });
    
    // Find airtableAction column
    const airtableActionColIndex = headerMap['airtableAction'];
    Logger.log(`Airtable Action Column Index: ${airtableActionColIndex}`);
    
    if (airtableActionColIndex === undefined) {
      Logger.log('ERROR: airtableAction column not found!');
      return;
    }
    
    // Get row 2706 data
    const rowData = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rawValue = rowData[airtableActionColIndex];
    
    Logger.log(`\n=== ROW ${targetRow} ANALYSIS ===`);
    Logger.log(`Raw value: "${rawValue}"`);
    Logger.log(`Type: ${typeof rawValue}`);
    Logger.log(`Length: ${rawValue ? rawValue.length : 0}`);
    
    // Character analysis
    if (rawValue) {
      Logger.log(`\nCharacter analysis:`);
      Array.from(rawValue).forEach((char, index) => {
        const code = char.charCodeAt(0);
        Logger.log(`  ${index}: "${char}" (code: ${code}, hex: 0x${code.toString(16)})`);
      });
    }
    
    // Apply the exact logic from Airtable.js
    const actionValue = String(rawValue || '').trim().toLowerCase();
    Logger.log(`\n=== LOGIC ANALYSIS ===`);
    Logger.log(`Cleaned value: "${actionValue}"`);
    Logger.log(`Length after trim: ${actionValue.length}`);
    Logger.log(`Comparison with 'skip': ${actionValue === 'skip'}`);
    Logger.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
    
    // Check for common issues
    Logger.log(`\n=== COMMON ISSUES CHECK ===`);
    if (rawValue && rawValue.includes('\u200B')) {
      Logger.log('❌ FOUND: Zero-width space character (invisible)');
    }
    if (rawValue && rawValue.includes('\u00A0')) {
      Logger.log('❌ FOUND: Non-breaking space character');
    }
    if (rawValue && rawValue.length > 4) {
      Logger.log('❌ FOUND: Extra characters beyond "skip"');
    }
    if (actionValue === '') {
      Logger.log('❌ FOUND: Empty value after trim');
    }
    if (actionValue !== 'skip' && actionValue.includes('skip')) {
      Logger.log('❌ FOUND: Contains "skip" but not exactly "skip"');
    }
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
}

// Instructions for use:
// 1. Copy this function to your Apps Script project
// 2. Run testRow2706Value()
// 3. Check the execution logs for the analysis 