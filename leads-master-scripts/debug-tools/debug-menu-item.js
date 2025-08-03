// Debug Menu Item Function
// This mimics the exact conditions of sendSelectedLeadsToAirtable but only logs

function debugSelectedLeadsToAirtable() {
  // Check for API Keys first (same as original)
  const scriptProperties = PropertiesService.getScriptProperties();
  const AIRTABLE_API_KEY = scriptProperties.getProperty('AIRTABLE_API_KEY');
  const AIRTABLE_BASE_ID = scriptProperties.getProperty('AIRTABLE_BASE_ID');
  
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    SpreadsheetApp.getUi().alert('Configuration Error', 'Airtable API Key or Base ID is missing. Please set them in Project Properties > Script Properties.', SpreadsheetApp.getUi().ButtonSet.OK);
    throw new Error('Missing Airtable credentials.');
  }
  
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  Logger.log('=== DEBUG: sendSelectedLeadsToAirtable SIMULATION ===');
  Logger.log(`Current sheet: ${sheet.getName()}`);
  
  // Ensure this function is run from the correct sheet (same as original)
  const SHEET_QUALIFY = 'GM - Qualify';
  if (sheet.getName() !== SHEET_QUALIFY) {
    Logger.log(`❌ WRONG SHEET: Expected "${SHEET_QUALIFY}", got "${sheet.getName()}"`);
    ui.alert('Wrong Sheet', `This function should only be run from the "${SHEET_QUALIFY}" sheet.`, ui.ButtonSet.OK);
    return;
  }
  
  Logger.log(`✅ CORRECT SHEET: ${SHEET_QUALIFY}`);

  // Get headers (same as original)
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const requiredSheetCols = ['name', 'processed']; // airtableAction is optional

  Logger.log('=== CHECKING REQUIRED COLUMNS ===');
  for (const col of requiredSheetCols) {
    Logger.log(`Checking column: "${col}"`);
    if (headerMap[col] === undefined) {
      Logger.log(`❌ MISSING COLUMN: "${col}"`);
      ui.alert('Missing Header Column', `A required column "${col}" was not found in Row 1 of your sheet.`, ui.ButtonSet.OK);
      return;
    } else {
      Logger.log(`✅ FOUND COLUMN: "${col}" at index ${headerMap[col]}`);
    }
  }

  // Get selection (same as original)
  const selection = sheet.getSelection();
  let dataRange = selection.getActiveRange();
  
  Logger.log('=== CHECKING SELECTION ===');
  Logger.log(`Selection: ${dataRange ? dataRange.getA1Notation() : 'None'}`);
  
  if (!dataRange || dataRange.isBlank()) {
    Logger.log('❌ NO DATA SELECTED');
    ui.alert('No Data Selected', 'Please select the data rows you want to send to Airtable.', ui.ButtonSet.OK);
    return;
  }

  Logger.log(`Selected range: ${dataRange.getA1Notation()}`);
  Logger.log(`Start row: ${dataRange.getRow()}`);
  Logger.log(`End row: ${dataRange.getLastRow()}`);
  Logger.log(`Number of rows: ${dataRange.getNumRows()}`);

  if (dataRange.getRow() === 1) {
    Logger.log('⚠️ HEADER ROW INCLUDED - ADJUSTING');
    if (dataRange.getNumRows() > 1) {
      dataRange = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
      Logger.log(`Adjusted range: ${dataRange.getA1Notation()}`);
      Logger.log(`Adjusted start row: ${dataRange.getRow()}`);
      Logger.log(`Adjusted end row: ${dataRange.getLastRow()}`);
    } else {
      Logger.log('❌ ONLY HEADER ROW SELECTED');
      ui.alert('Header Row Selected', 'Please select data rows below Row 1.', ui.ButtonSet.OK);
      return;
    }
  }
  
  // Now simulate the exact processDataRows logic
  Logger.log('\n=== SIMULATING processDataRows ===');
  debugProcessDataRows(sheet, dataRange, headerMap);
}

function debugProcessDataRows(sheet, dataRowsRange, headerMap) {
  const dataRowsToProcess = dataRowsRange.getValues();
  
  Logger.log(`Processing ${dataRowsToProcess.length} rows`);
  
  let successCount = 0;
  let failCount = 0;
  let alreadyProcessedCount = 0;
  let skippedByActionCount = 0;
  const recordsToCreate = [];
  
  // Get column index for the action column (same as original)
  const airtableActionColIndex = headerMap['airtableaction'];
  Logger.log(`Airtable Action Column Index: ${airtableActionColIndex}`);

  for (let i = 0; i < dataRowsToProcess.length; i++) {
    const rowData = dataRowsToProcess[i];
    const actualSheetRowIndex = dataRowsRange.getRow() + i;
    
    Logger.log(`\n--- PROCESSING ROW ${actualSheetRowIndex} ---`);
    
    // Check the airtableAction column first (same as original)
    if (airtableActionColIndex !== undefined) {
      const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();
      Logger.log(`Raw action value: "${rowData[airtableActionColIndex]}"`);
      Logger.log(`Cleaned action value: "${actionValue}"`);
      Logger.log(`Action comparison: ${actionValue === 'skip'}`);

      if (actionValue === 'skip') {
        skippedByActionCount++;
        Logger.log(`✅ ROW ${actualSheetRowIndex}: SKIPPED due to 'skip' command`);
        continue; // Go to the next row immediately
      } else {
        Logger.log(`➡️ ROW ${actualSheetRowIndex}: NOT SKIPPED - action value is not 'skip'`);
      }
    } else {
      Logger.log(`⚠️ ROW ${actualSheetRowIndex}: No airtableAction column found`);
    }

    // Check if already processed (same as original)
    const processedStatusCell = rowData[headerMap['processed']];
    Logger.log(`Processed status: "${processedStatusCell}"`);
    
    if (processedStatusCell && (String(processedStatusCell).toLowerCase().startsWith('sent') || String(processedStatusCell).toLowerCase().startsWith('verified'))) {
      alreadyProcessedCount++;
      Logger.log(`✅ ROW ${actualSheetRowIndex}: SKIPPED - already processed`);
      continue;
    }

    const companyName = rowData[headerMap['name']];
    Logger.log(`Company name: "${companyName}"`);
    
    if (!companyName) {
      Logger.log(`❌ ROW ${actualSheetRowIndex}: SKIPPED - missing company name`);
      failCount++;
      continue;
    }

    Logger.log(`✅ ROW ${actualSheetRowIndex}: WOULD BE SENT TO AIRTABLE`);
    successCount++;
  }

  Logger.log(`\n=== FINAL SUMMARY ===`);
  Logger.log(`Total rows processed: ${dataRowsToProcess.length}`);
  Logger.log(`Would be sent: ${successCount}`);
  Logger.log(`Already processed: ${alreadyProcessedCount}`);
  Logger.log(`Skipped by 'skip' action: ${skippedByActionCount}`);
  Logger.log(`Failed (no company name): ${failCount}`);
  
  if (successCount === 0) {
    Logger.log('ℹ️ No rows would be sent to Airtable');
  } else {
    Logger.log(`⚠️ ${successCount} rows would be sent to Airtable`);
  }
}

// Add this to your menu
function addDebugMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Debug Tools')
    .addItem('Debug Selected Leads (No Send)', 'debugSelectedLeadsToAirtable')
    .addToUi();
} 