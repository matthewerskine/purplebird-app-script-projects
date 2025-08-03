// SAFE DIAGNOSTIC - READ ONLY
// This function only reads data and logs information - NO DESTRUCTIVE ACTIONS

function safeDiagnoseRow2706() {
  const spreadsheetId = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
  const sheetName = 'GM - Qualify';
  const targetRow = 2706;
  
  Logger.log('=== SAFE DIAGNOSTIC FOR ROW 2706 ===');
  Logger.log('READ ONLY - NO CHANGES WILL BE MADE');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('ERROR: Sheet not found: ' + sheetName);
      return;
    }
    
    // Get headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('\n=== HEADER ANALYSIS ===');
    Logger.log('All column headers:');
    headers.forEach((header, index) => {
      Logger.log(`${index + 1}: "${header}"`);
    });
    
    // Create header map exactly like the code does
    const headerMap = {};
    headers.forEach((headerValue, index) => {
      const headerKey = String(headerValue || '').trim();
      if (headerKey) {
        headerMap[headerKey] = index;
      }
    });
    
    Logger.log('\n=== HEADER MAP ===');
    Object.keys(headerMap).forEach(key => {
      Logger.log(`"${key}" -> column ${headerMap[key] + 1}`);
    });
    
    // Check for airtableAction column
    const airtableActionColIndex = headerMap['airtableaction'];
    Logger.log(`\n=== AIRTABLE ACTION COLUMN ===`);
    Logger.log(`Looking for: "airtableAction"`);
    Logger.log(`Found at index: ${airtableActionColIndex}`);
    Logger.log(`Column letter: ${airtableActionColIndex !== undefined ? String.fromCharCode(65 + airtableActionColIndex) : 'NOT FOUND'}`);
    
    if (airtableActionColIndex === undefined) {
      Logger.log('❌ PROBLEM: airtableAction column not found!');
      Logger.log('This explains why the skip logic is not working.');
      return;
    }
    
    // Get row 2706 data (READ ONLY)
    Logger.log(`\n=== ROW ${targetRow} ANALYSIS ===`);
    const rowData = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('Row data (non-empty cells):');
    rowData.forEach((cell, index) => {
      if (cell !== '') {
        Logger.log(`  Col ${index + 1} (${headers[index]}): "${cell}"`);
      }
    });
    
    // Check the airtableAction value specifically
    const rawActionValue = rowData[airtableActionColIndex];
    Logger.log(`\n=== AIRTABLE ACTION VALUE ===`);
    Logger.log(`Raw value: "${rawActionValue}"`);
    Logger.log(`Type: ${typeof rawActionValue}`);
    Logger.log(`Length: ${rawActionValue ? rawActionValue.length : 0}`);
    
    // Check for hidden characters
    if (rawActionValue) {
      Logger.log(`Character codes: ${Array.from(rawActionValue).map(c => c.charCodeAt(0)).join(', ')}`);
    }
    
    // Apply the exact logic from Airtable.js
    const actionValue = String(rawActionValue || '').trim().toLowerCase();
    Logger.log(`\n=== LOGIC ANALYSIS ===`);
    Logger.log(`Cleaned value: "${actionValue}"`);
    Logger.log(`Length after trim: ${actionValue.length}`);
    Logger.log(`Comparison with 'skip': ${actionValue === 'skip'}`);
    Logger.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
    
    // Check what the current code would do
    Logger.log(`\n=== WHAT THE CODE WOULD DO ===`);
    if (actionValue === 'skip') {
      Logger.log('✅ CORRECT: Would skip this row');
    } else {
      Logger.log('❌ PROBLEM: Would process this row (should skip)');
      Logger.log('This explains why the lead is being sent despite "skip"');
    }
    
    // Additional debugging
    Logger.log(`\n=== ADDITIONAL DEBUGGING ===`);
    Logger.log(`actionValue === 'skip': ${actionValue === 'skip'}`);
    Logger.log(`actionValue.length: ${actionValue.length}`);
    Logger.log(`actionValue.charCodeAt(0): ${actionValue.length > 0 ? actionValue.charCodeAt(0) : 'N/A'}`);
    Logger.log(`'skip'.charCodeAt(0): ${'skip'.charCodeAt(0)}`);
    
  } catch (error) {
    Logger.log('ERROR in safeDiagnoseRow2706: ' + error.toString());
  }
  
  Logger.log('\n=== DIAGNOSTIC COMPLETE ===');
  Logger.log('NO CHANGES WERE MADE TO THE SPREADSHEET');
}

// Function to test the exact Airtable.js logic on row 2706
function testAirtableLogicOnRow2706() {
  const spreadsheetId = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
  const sheetName = 'GM - Qualify';
  const targetRow = 2706;
  
  Logger.log('=== TESTING AIRTABLE.JS LOGIC ON ROW 2706 ===');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('ERROR: Sheet not found: ' + sheetName);
      return;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((headerValue, index) => {
      const headerKey = String(headerValue || '').trim();
      if (headerKey) {
        headerMap[headerKey] = index;
      }
    });
    
      const SHEET_COL_AIRTABLE_ACTION = 'airtableaction';
  const airtableActionColIndex = headerMap[SHEET_COL_AIRTABLE_ACTION];
  
  Logger.log(`Looking for column: "${SHEET_COL_AIRTABLE_ACTION}"`);
    Logger.log(`Found at index: ${airtableActionColIndex}`);
    
    if (airtableActionColIndex === undefined) {
      Logger.log('PROBLEM: airtableAction column not found!');
      return;
    }
    
    // Get row 2706 data
    const rowData = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log(`\nRow ${targetRow} data:`);
    rowData.forEach((cell, index) => {
      if (cell !== '') {
        Logger.log(`  Col ${index + 1} (${headers[index]}): "${cell}"`);
      }
    });
    
    // Simulate the exact logic from Airtable.js
    Logger.log(`\n=== SIMULATING AIRTABLE.JS LOGIC ===`);
    
    if (airtableActionColIndex !== undefined) {
      const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();
      
      Logger.log(`  Raw action value: "${rowData[airtableActionColIndex]}"`);
      Logger.log(`  Cleaned action value: "${actionValue}"`);
      
      if (actionValue === 'skip') {
        Logger.log(`  -> WOULD SKIP (actionValue === 'skip')`);
      } else {
        Logger.log(`  -> WOULD PROCESS (actionValue !== 'skip')`);
        Logger.log(`  -> This explains why the lead is being sent!`);
      }
    } else {
      Logger.log(`  -> WOULD PROCESS (no airtableAction column)`);
    }
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
} 