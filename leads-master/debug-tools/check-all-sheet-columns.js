/**
 * EMERGENCY FUNCTION: Check ALL sheet column names
 * Reports exact column names as they appear in every sheet
 * No case changes, no assumptions - just the raw data
 */

function checkAllSheetColumns() {
  console.log('=== EMERGENCY COLUMN CHECK ===');
  console.log('Checking ALL sheets for exact column names...');
  console.log('');
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  
  for (const sheet of sheets) {
    const sheetName = sheet.getName();
    console.log(`\n--- SHEET: "${sheetName}" ---`);
    
    if (sheet.getLastColumn() === 0) {
      console.log('  (Empty sheet - no columns)');
      continue;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log(`  Total columns: ${headers.length}`);
    console.log('  Column names (exact as they appear):');
    
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`    ${columnLetter}: "${header}"`);
    });
  }
  
  console.log('\n=== END OF COLUMN CHECK ===');
  console.log('Report these exact column names back to me.');
}

/**
 * Alternative function that can be run from Apps Script editor
 */
function emergencyColumnCheck() {
  Logger.log('=== EMERGENCY COLUMN CHECK ===');
  Logger.log('Checking ALL sheets for exact column names...');
  Logger.log('');
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  
  for (const sheet of sheets) {
    const sheetName = sheet.getName();
    Logger.log(`\n--- SHEET: "${sheetName}" ---`);
    
    if (sheet.getLastColumn() === 0) {
      Logger.log('  (Empty sheet - no columns)');
      continue;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`  Total columns: ${headers.length}`);
    Logger.log('  Column names (exact as they appear):');
    
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      Logger.log(`    ${columnLetter}: "${header}"`);
    });
  }
  
  Logger.log('\n=== END OF COLUMN CHECK ===');
  Logger.log('Report these exact column names back to me.');
} 