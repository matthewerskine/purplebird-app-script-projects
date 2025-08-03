// Quick Diagnostic Function
// Copy this function to your Apps Script project and run it

function quickDiagnostic() {
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
      Logger.log('Available columns: ' + Object.keys(headerMap).join(', '));
      return;
    }
    
    // Get row 2706 data
    const rowData = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rawValue = rowData[airtableActionColIndex];
    
    Logger.log(`\n=== ROW ${targetRow} ANALYSIS ===`);
    Logger.log(`Raw value: "${rawValue}"`);
    Logger.log(`Type: ${typeof rawValue}`);
    Logger.log(`Length: ${rawValue ? rawValue.length : 0}`);
    
    // Apply the exact logic from Airtable.js
    const actionValue = String(rawValue || '').trim().toLowerCase();
    Logger.log(`\n=== LOGIC ANALYSIS ===`);
    Logger.log(`Cleaned value: "${actionValue}"`);
    Logger.log(`Length after trim: ${actionValue.length}`);
    Logger.log(`Comparison with 'skip': ${actionValue === 'skip'}`);
    Logger.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
    
    // Test the exact condition
    Logger.log(`\n=== EXACT CONDITION ===`);
    Logger.log(`airtableActionColIndex !== undefined: ${airtableActionColIndex !== undefined}`);
    Logger.log(`actionValue === 'skip': ${actionValue === 'skip'}`);
    Logger.log(`Full condition: ${airtableActionColIndex !== undefined && actionValue === 'skip'}`);
    
    if (airtableActionColIndex !== undefined && actionValue === 'skip') {
      Logger.log('✅ CONDITION MET: Row should be skipped');
    } else {
      Logger.log('❌ CONDITION NOT MET: Row will be processed');
    }
    
    // Show what the code would do
    Logger.log(`\n=== WHAT THE CODE WOULD DO ===`);
    if (actionValue === 'skip') {
      Logger.log('✅ Would SKIP this row');
      Logger.log('❓ If it\'s not being skipped, the issue might be:');
      Logger.log('   1. Different row being processed');
      Logger.log('   2. Code not reaching this logic');
      Logger.log('   3. Error before this point');
    } else {
      Logger.log('❌ Would PROCESS this row');
      Logger.log('This explains why the lead is being sent');
    }
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
}

// Instructions:
// 1. Copy this function to your Apps Script project
// 2. Run quickDiagnostic()
// 3. Check the execution logs 