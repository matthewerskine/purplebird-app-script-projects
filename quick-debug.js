// Quick Debug Script for Leads Master Scripts
// This can be run directly in the Apps Script editor

function quickDebug() {
  const spreadsheetId = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
  const sheetName = 'GM - Qualify';
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('ERROR: Sheet not found: ' + sheetName);
      return;
    }
    
    // Get headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('=== QUICK DEBUG ===');
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
    
    Logger.log('\nHeader Map:');
    Object.keys(headerMap).forEach(key => {
      Logger.log(`"${key}" -> column ${headerMap[key] + 1}`);
    });
    
    // Check for airtable action column
    const airtableActionColIndex = headerMap['airtableaction'];
    Logger.log(`\nAirtable Action Column Index: ${airtableActionColIndex}`);
    
    if (airtableActionColIndex === undefined) {
      Logger.log('PROBLEM: airtableAction column not found!');
      Logger.log('This is likely why the skip logic is not working.');
      
      // Look for similar columns
      Logger.log('\nLooking for similar columns:');
      Object.keys(headerMap).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('airtable') || lowerKey.includes('action')) {
          Logger.log(`  - "${key}" (contains airtable or action)`);
        }
      });
    } else {
      Logger.log('✓ airtableAction column found');
      
      // Test a few rows
      const testRows = sheet.getRange(2, 1, Math.min(5, sheet.getLastRow() - 1), sheet.getLastColumn()).getValues();
      
      Logger.log('\nTesting skip logic on first 5 rows:');
      testRows.forEach((rowData, i) => {
        const rowIndex = i + 2;
        const rawActionValue = rowData[airtableActionColIndex];
        const actionValue = String(rawActionValue || '').trim().toLowerCase();
        const wouldSkip = actionValue === 'skip';
        
        Logger.log(`Row ${rowIndex}: "${rawActionValue}" -> "${actionValue}" -> ${wouldSkip ? 'SKIP' : 'PROCESS'}`);
      });
    }
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
}

// Function to test a specific row
function testRow(rowNumber = 5) {
  const spreadsheetId = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
  const sheetName = 'GM - Qualify';
  
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
    
    const rowData = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log(`=== TESTING ROW ${rowNumber} ===`);
    Logger.log('Row data:');
    rowData.forEach((cell, index) => {
      if (cell !== '') {
        Logger.log(`  Col ${index + 1} (${headers[index]}): "${cell}"`);
      }
    });
    
    const airtableActionColIndex = headerMap['airtableaction'];
    Logger.log(`\nAirtable Action Column Index: ${airtableActionColIndex}`);
    
    if (airtableActionColIndex !== undefined) {
      const rawActionValue = rowData[airtableActionColIndex];
      const actionValue = String(rawActionValue || '').trim().toLowerCase();
      const wouldSkip = actionValue === 'skip';
      
      Logger.log(`Raw action value: "${rawActionValue}"`);
      Logger.log(`Cleaned action value: "${actionValue}"`);
      Logger.log(`Would skip: ${wouldSkip ? 'YES' : 'NO'}`);
    } else {
      Logger.log('ERROR: airtableAction column not found!');
    }
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
}

// Function to find the correct column name
function findCorrectColumnName() {
  const spreadsheetId = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
  const sheetName = 'GM - Qualify';
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('ERROR: Sheet not found: ' + sheetName);
      return;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('=== FINDING CORRECT COLUMN NAME ===');
    Logger.log('All headers:');
    headers.forEach((header, index) => {
      Logger.log(`${index + 1}: "${header}"`);
    });
    
    Logger.log('\nSearching for airtable action related columns:');
    headers.forEach((header, index) => {
      const lowerHeader = String(header || '').toLowerCase();
      if (lowerHeader.includes('airtable') || lowerHeader.includes('action')) {
        Logger.log(`  ${index + 1}: "${header}" (contains airtable or action)`);
      }
    });
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
} 