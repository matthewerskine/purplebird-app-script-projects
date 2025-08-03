// Debug Selection Function
// This will show you exactly which rows are being processed

function debugSelection() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  Logger.log('=== DEBUGGING SELECTION ===');
  Logger.log(`Current sheet: ${sheet.getName()}`);
  
  // Get the current selection
  const selection = sheet.getSelection();
  let dataRange = selection.getActiveRange();
  
  Logger.log(`Selection: ${dataRange ? dataRange.getA1Notation() : 'None'}`);
  
  if (!dataRange || dataRange.isBlank()) {
    Logger.log('❌ No data selected');
    return;
  }
  
  Logger.log(`Selected range: ${dataRange.getA1Notation()}`);
  Logger.log(`Start row: ${dataRange.getRow()}`);
  Logger.log(`End row: ${dataRange.getLastRow()}`);
  Logger.log(`Number of rows: ${dataRange.getNumRows()}`);
  
  // Check if header row is included
  if (dataRange.getRow() === 1) {
    Logger.log('⚠️ Header row is included in selection');
    if (dataRange.getNumRows() > 1) {
      const adjustedRange = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
      Logger.log(`Adjusted range: ${adjustedRange.getA1Notation()}`);
      Logger.log(`Adjusted start row: ${adjustedRange.getRow()}`);
      Logger.log(`Adjusted end row: ${adjustedRange.getLastRow()}`);
      dataRange = adjustedRange;
    } else {
      Logger.log('❌ Only header row selected');
      return;
    }
  }
  
  // Get the actual data
  const dataRows = dataRange.getValues();
  Logger.log(`\n=== PROCESSING ${dataRows.length} ROWS ===`);
  
  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((headerValue, index) => {
    const headerKey = String(headerValue || '').trim();
    if (headerKey) {
      headerMap[headerKey] = index;
    }
  });
  
  const airtableActionColIndex = headerMap['airtableAction'];
  Logger.log(`Airtable Action Column Index: ${airtableActionColIndex}`);
  
  // Process each row
  for (let i = 0; i < dataRows.length; i++) {
    const rowData = dataRows[i];
    const actualSheetRowIndex = dataRange.getRow() + i;
    
    Logger.log(`\n--- ROW ${actualSheetRowIndex} ---`);
    
    // Check airtableAction
    if (airtableActionColIndex !== undefined) {
      const rawActionValue = rowData[airtableActionColIndex];
      const actionValue = String(rawActionValue || '').trim().toLowerCase();
      
      Logger.log(`Raw action value: "${rawActionValue}"`);
      Logger.log(`Cleaned action value: "${actionValue}"`);
      Logger.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
      
      if (actionValue === 'skip') {
        Logger.log(`✅ ROW ${actualSheetRowIndex}: SKIPPED due to 'skip'`);
        continue;
      }
    }
    
    // Check if already processed
    const processedColIndex = headerMap['processed'];
    if (processedColIndex !== undefined) {
      const processedValue = rowData[processedColIndex];
      const processedString = String(processedValue || '').toLowerCase();
      
      Logger.log(`Processed value: "${processedValue}"`);
      Logger.log(`Processed string: "${processedString}"`);
      
      if (processedString.startsWith('sent') || processedString.startsWith('verified')) {
        Logger.log(`✅ ROW ${actualSheetRowIndex}: SKIPPED - already processed`);
        continue;
      }
    }
    
    // Check company name
    const nameColIndex = headerMap['name'];
    if (nameColIndex !== undefined) {
      const companyName = rowData[nameColIndex];
      Logger.log(`Company name: "${companyName}"`);
      
      if (!companyName) {
        Logger.log(`❌ ROW ${actualSheetRowIndex}: SKIPPED - no company name`);
        continue;
      }
    }
    
    Logger.log(`✅ ROW ${actualSheetRowIndex}: WOULD BE PROCESSED`);
  }
  
  Logger.log(`\n=== SUMMARY ===`);
  Logger.log(`Total rows in selection: ${dataRows.length}`);
  Logger.log(`Make sure row 2706 is included in your selection!`);
}

// Instructions:
// 1. Copy this function to your Apps Script project
// 2. Select the rows you want to process (including row 2706)
// 3. Run debugSelection()
// 4. Check the execution logs to see exactly which rows are being processed 