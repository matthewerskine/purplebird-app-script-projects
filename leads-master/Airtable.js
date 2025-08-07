// --- CONFIGURATION ---
const scriptProperties = PropertiesService.getScriptProperties();
const AIRTABLE_API_KEY = scriptProperties.getProperty('AIRTABLE_API_KEY');
const AIRTABLE_BASE_ID = scriptProperties.getProperty('AIRTABLE_BASE_ID');
const AIRTABLE_TABLE_NAME = scriptProperties.getProperty('AIRTABLE_TABLE_NAME');

// --- SHEET NAMES (Centralized for easy updating) ---
const SHEET_RAW = 'GM - RAW';
const SHEET_QUALIFY = 'GM - Qualify';

// --- Other Configuration ---
const DEFAULT_LEAD_SOURCE = 'GM';
const DEFAULT_LEAD_STAGE = 'Qualified';

// --- Enhanced function to find airtable action column ---
function findAirtableActionColumn(headerMap) {
  return headerMap[SHEET_COL_AIRTABLE_ACTION];
}

// Column names in your Google Sheet
const SHEET_COL_NAME = 'name';
const SHEET_COL_PHONE = 'phone';
const SHEET_COL_WEBSITE = 'websiteUrl';
const SHEET_COL_INDUSTRY = 'category';
const SHEET_COL_PROCESSED = 'processed';
const SHEET_COL_EMAIL_EXTRACTED = 'extractEmail.email';
const SHEET_COL_ADS_RUNNING = 'extractAds.isRunningAds';
const SHEET_COL_NOTES = 'notes'; // For marking duplicates
// --- NEW: Column for skipping rows ---
const SHEET_COL_AIRTABLE_ACTION = 'airtableAction';

// Additional columns for enrichment and other functions
const SHEET_COL_REGION = 'region';
const SHEET_COL_CATEGORY = 'category';
const SHEET_COL_SEARCH_QUERY = 'searchQuery';
const SHEET_COL_GOOGLE_PLACE_ID = 'googlePlaceId';
const SHEET_COL_GOOGLE_ID = 'googleId';
const SHEET_COL_POSITION = 'position';
const SHEET_COL_ADDRESS = 'address';
const SHEET_COL_RATING = 'rating';
const SHEET_COL_REVIEWS_COUNT = 'reviewsCount';
const SHEET_COL_OWNER_PROFILE_URL = 'ownerProfileUrl';
const SHEET_COL_MAIN_CATEGORY = 'mainCategory';
const SHEET_COL_VERIFY_COMPANY_STATUS_COMPANY_NUMBER = 'verifyCompanyStatus.companyNumber';
const SHEET_COL_VERIFY_COMPANY_STATUS_TRADING_STATUS = 'verifyCompanyStatus.tradingStatus';
const SHEET_COL_VERIFY_COMPANY_STATUS_CONFIDENCE = 'verifyCompanyStatus.confidence';
const SHEET_COL_ATTRIBUTION_LAST_UPDATED_DATE = 'attribution.lastUpdatedDate';
const SHEET_COL_ATTRIBUTION_AGENCY_NAME = 'attribution.agencyName';
const SHEET_COL_ATTRIBUTION_ATTRIBUTION_YEAR = 'attribution.attributionYear';
const SHEET_COL_ATTRIBUTION_IS_OUTDATED = 'attribution.isOutdated';
const SHEET_COL_ATTRIBUTION_CONFIDENCE = 'attribution.confidence';
const SHEET_COL_EXTRACT_ADS_GOOGLE = 'extractAds.google';
const SHEET_COL_EXTRACT_ADS_FACEBOOK = 'extractAds.facebook';
const SHEET_COL_EXTRACT_ADS_LINKEDIN = 'extractAds.linkedin';
const SHEET_COL_EXTRACT_ADS_TIKTOK = 'extractAds.tiktok';
const SHEET_COL_EXTRACT_ADS_TWITTER = 'extractAds.twitter';
const SHEET_COL_EXTRACT_ADS_GOOGLE_ADS_LINK = 'extractAds.googleAdsLink'; 

// Airtable Field Names
const AIRTABLE_FIELD_COMPANY_NAME = 'Company Name';
const AIRTABLE_FIELD_EMAIL = 'Email';
const AIRTABLE_FIELD_PHONE = 'Phone';
const AIRTABLE_FIELD_WEBSITE_URL = 'Website URL';
const AIRTABLE_FIELD_DATE_CREATED = 'Date Added';
const AIRTABLE_FIELD_INDUSTRY = 'Industry';
const AIRTABLE_FIELD_STRATEGY = 'Strategy';
const AIRTABLE_FIELD_SOURCE = 'Source';
const AIRTABLE_FIELD_STAGE = 'Stage';
const AIRTABLE_FIELD_ADS_RUNNING = 'Is Running Ads';

/**
 * Sends a notification message to a pre-configured Slack channel.
 */
function sendSlackNotification(message) {
  if (!SLACK_WEBHOOK_URL) {
    Logger.log('Slack Webhook URL not configured. Skipping notification.');
    return;
  }
  const payload = { 'text': `[Leads Manager] ${message}` };
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) };
  try { 
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options); 
  } catch (e) { 
    Logger.log(`Could not send Slack notification. Error: ${e.message}`); 
  }
}

function sendSelectedLeadsToAirtable() {
  // Check for API Keys first
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    SpreadsheetApp.getUi().alert('Configuration Error', 'Airtable API Key or Base ID is missing. Please set them in Project Properties > Script Properties.', SpreadsheetApp.getUi().ButtonSet.OK);
    throw new Error('Missing Airtable credentials.');
  }
  
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Ensure this function is run from the correct sheet
  if (sheet.getName() !== SHEET_QUALIFY) {
    ui.alert('Wrong Sheet', `This function should only be run from the "${SHEET_QUALIFY}" sheet.`, ui.ButtonSet.OK);
    return;
  }

  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const requiredSheetCols = [SHEET_COL_NAME, SHEET_COL_PROCESSED]; // airtableAction is optional

  for (const col of requiredSheetCols) {
    if (headerMap[col] === undefined) {
      ui.alert('Missing Header Column', `A required column "${col}" was not found in Row 1 of your sheet.`, ui.ButtonSet.OK);
      return;
    }
  }

  const selection = sheet.getSelection();
  let dataRange = selection.getActiveRange();
  
  if (!dataRange || dataRange.isBlank()) {
    ui.alert('No Data Selected', 'Please select the data rows you want to send to Airtable.', ui.ButtonSet.OK);
    return;
  }

  if (dataRange.getRow() === 1) {
    if (dataRange.getNumRows() > 1) {
      dataRange = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
    } else {
       ui.alert('Header Row Selected', 'Please select data rows below Row 1.', ui.ButtonSet.OK);
       return;
    }
  }
  
  processDataRows(sheet, dataRange, headerMap);
}


function processDataRows(sheet, dataRowsRange, headerMap) {
  const ui = SpreadsheetApp.getUi();
  const dataRowsToProcess = dataRowsRange.getValues();

  let successCount = 0;
  let failCount = 0;
  let alreadyProcessedCount = 0;
  let skippedByActionCount = 0; // --- NEW: Counter for 'skip' action
  const recordsToCreate = [];
  const todayISO = new Date().toISOString().slice(0, 10);

  // --- Get column index for the action column ---
  const airtableActionColIndex = findAirtableActionColumn(headerMap);

  for (let i = 0; i < dataRowsToProcess.length; i++) {
    const rowData = dataRowsToProcess[i];
    const actualSheetRowIndex = dataRowsRange.getRow() + i;

    // --- Check the airtableAction column first ---
    // This check is case-insensitive and trims whitespace (e.g., "skip", "Skip ", " SKIP " all work)
    if (airtableActionColIndex !== undefined) {
      const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();

      if (actionValue === 'skip') {
        skippedByActionCount++;
        Logger.log(`Row ${actualSheetRowIndex}: Skipping due to 'skip' command in airtableAction column.`);
        continue; // Go to the next row immediately
      }
    }

    // --- EXISTING LOGIC: Check if already processed ---
    const processedStatusCell = rowData[headerMap[SHEET_COL_PROCESSED]];
    if (processedStatusCell && (String(processedStatusCell).toLowerCase().startsWith('sent') || String(processedStatusCell).toLowerCase().startsWith('verified'))) {
      alreadyProcessedCount++;
      continue;
    }

    const companyName = rowData[headerMap[SHEET_COL_NAME]];
    if (!companyName) {
      Logger.log(`Sheet Row ${actualSheetRowIndex}: Skipping due to missing company name.`);
      failCount++;
      continue;
    }

    const airtableRecord = {
      fields: {
        [AIRTABLE_FIELD_COMPANY_NAME]: companyName,
        [AIRTABLE_FIELD_PHONE]: headerMap[SHEET_COL_PHONE] !== undefined ? String(rowData[headerMap[SHEET_COL_PHONE]] || '') : null,
        [AIRTABLE_FIELD_WEBSITE_URL]: headerMap[SHEET_COL_WEBSITE] !== undefined ? rowData[headerMap[SHEET_COL_WEBSITE]] : null,
        [AIRTABLE_FIELD_INDUSTRY]: headerMap[SHEET_COL_INDUSTRY] !== undefined ? rowData[headerMap[SHEET_COL_INDUSTRY]] : null,
        [AIRTABLE_FIELD_DATE_CREATED]: todayISO,
        [AIRTABLE_FIELD_STRATEGY]: 'Cold Call',
        [AIRTABLE_FIELD_SOURCE]: DEFAULT_LEAD_SOURCE,
        [AIRTABLE_FIELD_STAGE]: DEFAULT_LEAD_STAGE,
      }
    };

    if (headerMap[SHEET_COL_EMAIL_EXTRACTED] !== undefined) {
      airtableRecord.fields[AIRTABLE_FIELD_EMAIL] = rowData[headerMap[SHEET_COL_EMAIL_EXTRACTED]] || null;
    }
    
    if (headerMap[SHEET_COL_ADS_RUNNING] !== undefined) {
      const sheetValue = rowData[headerMap[SHEET_COL_ADS_RUNNING]];
      airtableRecord.fields[AIRTABLE_FIELD_ADS_RUNNING] = String(sheetValue || '').trim().toLowerCase() === 'yes';
    }

    for (const key in airtableRecord.fields) {
      if (airtableRecord.fields[key] === null || airtableRecord.fields[key] === undefined) {
        delete airtableRecord.fields[key];
      }
    }

    recordsToCreate.push({ record: airtableRecord, sheetRowIndex: actualSheetRowIndex });
  }

  if (recordsToCreate.length === 0) {
    let alertMessage = 'No new leads to process.';
    if (alreadyProcessedCount > 0 || skippedByActionCount > 0) {
      alertMessage = 'No new leads found to send.\n' + 
                     (alreadyProcessedCount > 0 ? `${alreadyProcessedCount} lead(s) were already processed/verified.\n` : '') +
                     (skippedByActionCount > 0 ? `${skippedByActionCount} lead(s) were marked as 'skip'.` : '');
    }
    ui.alert('No New Leads', alertMessage, ui.ButtonSet.OK);
    return;
  }

  const batchSize = 10;
  for (let i = 0; i < recordsToCreate.length; i += batchSize) {
    const batch = recordsToCreate.slice(i, i + batchSize);
    const payloadBatch = batch.map(item => item.record);
    const response = callAirtableApi('POST', { records: payloadBatch });

    if (response && response.records) {
      response.records.forEach((createdRecord, index) => {
        const originalItem = batch[index];
        if (createdRecord.id) {
          successCount++;
          sheet.getRange(originalItem.sheetRowIndex, headerMap[SHEET_COL_PROCESSED] + 1).setValue(`Sent on ${todayISO} (ID: ${createdRecord.id})`);
        } else {
          failCount++;
          sheet.getRange(originalItem.sheetRowIndex, headerMap[SHEET_COL_PROCESSED] + 1).setValue(`Error on ${todayISO}`);
        }
      });
    } else {
      failCount += batch.length;
      batch.forEach(originalItem => {
        sheet.getRange(originalItem.sheetRowIndex, headerMap[SHEET_COL_PROCESSED] + 1).setValue(`API Error on ${todayISO}`);
      });
    }
  }

  // --- MODIFIED: Updated summary message ---
  let message = `Processing complete:\n` +
                `Successfully sent: ${successCount}\n` +
                (failCount > 0 ? `Failed: ${failCount}\n` : '') +
                (alreadyProcessedCount > 0 ? `Skipped (already processed): ${alreadyProcessedCount}\n` : '') +
                (skippedByActionCount > 0 ? `Skipped (marked as 'skip'): ${skippedByActionCount}\n` : '');
  ui.alert('Processing Complete', message, ui.ButtonSet.OK);
}


/*
===============================================================================================
  NOTE: The functions below (verifyLeadsInAirtable and its helpers) remain unchanged.
  They are included here so you can replace the entire script file.
===============================================================================================
*/

// --- This function and its helpers are not modified, but included for completeness ---
// --- SAFE DIAGNOSTIC FUNCTION: Analyze row 2706 (READ ONLY) ---
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
    const airtableActionColIndex = headerMap['airtableAction'];
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

// --- DEBUG FUNCTION: Test the skip logic ---
function debugSkipLogic() {
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
    
    Logger.log('=== DEBUGGING SKIP LOGIC ===');
    Logger.log('All column headers:');
    headers.forEach((header, index) => {
      Logger.log(`${index + 1}: "${header}"`);
    });
    
    const airtableActionColIndex = headerMap['airtableAction'];
    Logger.log(`\nAirtable Action Column Index: ${airtableActionColIndex}`);
    
    if (airtableActionColIndex !== undefined) {
      Logger.log('✓ airtableAction column found');
      
      // Test the first 5 rows
      const testRows = sheet.getRange(2, 1, Math.min(5, sheet.getLastRow() - 1), sheet.getLastColumn()).getValues();
      
      Logger.log('\nTesting skip logic:');
      testRows.forEach((rowData, i) => {
        const rowIndex = i + 2;
        const rawActionValue = rowData[airtableActionColIndex];
        const actionValue = String(rawActionValue || '').trim().toLowerCase();
        const wouldSkip = actionValue === 'skip';
        
        Logger.log(`Row ${rowIndex}: "${rawActionValue}" -> ${wouldSkip ? 'SKIP' : 'PROCESS'}`);
      });
    } else {
      Logger.log('ERROR: airtableAction column not found!');
      Logger.log('Please ensure the column is named exactly "airtableAction"');
    }
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
}

function verifyLeadsInAirtable() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== SHEET_QUALIFY) {
    ui.alert('Wrong Sheet', `This function must be run from the "${SHEET_QUALIFY}" sheet.`, ui.ButtonSet.OK);
    return;
  }
  
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const requiredCols = [SHEET_COL_NAME, SHEET_COL_PROCESSED];
  for (const col of requiredCols) {
    if (headerMap[col] === undefined) {
      ui.alert('Missing Header Column', `A required column "${col}" was not found in Row 1.`, ui.ButtonSet.OK);
      return;
    }
  }

  const selection = sheet.getSelection();
  let dataRange = selection.getActiveRange();

  if (!dataRange || dataRange.isBlank()) {
    ui.alert('No Data Selected', 'Please select rows to verify.', ui.ButtonSet.OK);
    return;
  }
  if (dataRange.getRow() === 1) {
      if (dataRange.getNumRows() > 1) dataRange = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
      else { ui.alert('Header Row Selected', 'Please select data rows.', ui.ButtonSet.OK); return; }
  }

  const dataRowsToVerify = dataRange.getValues();
  const startRow = dataRange.getRow();
  const processedColIdx = headerMap[SHEET_COL_PROCESSED];
  const processedColNum = processedColIdx + 1;

  let verifiedCount = 0, notFoundCount = 0, skippedCount = 0, errorCount = 0;
  const todayISO = new Date().toISOString().slice(0, 10);

  ui.showModalDialog(HtmlService.createHtmlOutput('<p>Verifying leads with Airtable... Please wait.</p>'), 'Verification in Progress');

  for (let i = 0; i < dataRowsToVerify.length; i++) {
    const rowData = dataRowsToVerify[i];
    const actualSheetRowIndex = startRow + i;

    if (rowData[processedColIdx] && (String(rowData[processedColIdx]).toLowerCase().startsWith('sent') || String(rowData[processedColIdx]).toLowerCase().startsWith('verified'))) {
      skippedCount++;
      continue;
    }

    const companyName = rowData[headerMap[SHEET_COL_NAME]];
    if (!companyName) continue;

    try {
      const queryParams = createNormalizedSearchFormula(companyName);
      const response = callAirtableApi('GET', null, '', queryParams);

      if (response && response.records && response.records.length > 0) {
        verifiedCount++;
        const airtableId = response.records[0].id;
        sheet.getRange(actualSheetRowIndex, processedColNum).setValue(`Verified on ${todayISO} (ID: ${airtableId})`);
      } else if (response) {
        notFoundCount++;
      } else {
        errorCount++;
        sheet.getRange(actualSheetRowIndex, processedColNum).setValue(`API Error on ${todayISO}`);
      }
    } catch (e) {
      errorCount++;
      sheet.getRange(actualSheetRowIndex, processedColNum).setValue(`Script Error on ${todayISO}`);
    }
  }

  let message = `Verification complete:\n\n` + `Found & Verified: ${verifiedCount}\n` + `Not Found: ${notFoundCount}\n` + (skippedCount > 0 ? `Skipped (already processed): ${skippedCount}\n` : '') + (errorCount > 0 ? `Errors: ${errorCount}\n` : '');
  ui.alert('Verification Complete', message, ui.ButtonSet.OK);
}

// Debug function that mimics sendSelectedLeadsToAirtable but only logs
function debugSelectedLeadsToAirtable() {
  // Check for API Keys first (same as original)
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    SpreadsheetApp.getUi().alert('Configuration Error', 'Airtable API Key or Base ID is missing. Please set them in Project Properties > Script Properties.', SpreadsheetApp.getUi().ButtonSet.OK);
    throw new Error('Missing Airtable credentials.');
  }
  
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  Logger.log('=== DEBUG: sendSelectedLeadsToAirtable SIMULATION ===');
  Logger.log(`Current sheet: ${sheet.getName()}`);
  
  // Ensure this function is run from the correct sheet (same as original)
  if (sheet.getName() !== SHEET_QUALIFY) {
    Logger.log(`❌ WRONG SHEET: Expected "${SHEET_QUALIFY}", got "${sheet.getName()}"`);
    ui.alert('Wrong Sheet', `This function should only be run from the "${SHEET_QUALIFY}" sheet.`, ui.ButtonSet.OK);
    return;
  }
  
  Logger.log(`✅ CORRECT SHEET: ${SHEET_QUALIFY}`);

  // Get headers (same as original)
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const requiredSheetCols = [SHEET_COL_NAME, SHEET_COL_PROCESSED]; // airtableAction is optional

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
  const airtableActionColIndex = findAirtableActionColumn(headerMap);
  Logger.log(`Airtable Action Column Index: ${airtableActionColIndex}`);
  
  // Log available columns for debugging
  if (airtableActionColIndex === undefined) {
    Logger.log('Available columns:');
    Object.keys(headerMap).forEach(key => {
      Logger.log(`  - "${key}"`);
    });
  }

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
    const processedStatusCell = rowData[headerMap[SHEET_COL_PROCESSED]];
    Logger.log(`Processed status: "${processedStatusCell}"`);
    
    if (processedStatusCell && (String(processedStatusCell).toLowerCase().startsWith('sent') || String(processedStatusCell).toLowerCase().startsWith('verified'))) {
      alreadyProcessedCount++;
      Logger.log(`✅ ROW ${actualSheetRowIndex}: SKIPPED - already processed`);
      continue;
    }

    const companyName = rowData[headerMap[SHEET_COL_NAME]];
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

// ===== CRITICAL CLEANUP FUNCTIONS =====

function identifyBadRecords() {
  console.log('=== IDENTIFYING BAD RECORDS FOR DELETION ===');
  console.log('This script will identify records that:');
  console.log('1. Have "skip" in airtableAction column');
  console.log('2. Have "Sent on ..." in processed column');
  console.log('3. Have no Activities in Airtable');
  console.log('4. Are from GM source');
  console.log('');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  if (!sheet) {
    console.log('❌ ERROR: Could not find "GM - Qualify" sheet');
    return;
  }
  
  // Get all data
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const headerMap = getHeaderMap(headers);
  
  console.log('=== CHECKING REQUIRED COLUMNS ===');
  const requiredCols = ['name', 'processed'];
  for (const col of requiredCols) {
    const colIndex = headerMap[col];
    if (colIndex === undefined) {
      console.log(`❌ MISSING COLUMN: "${col}"`);
      return;
    } else {
      console.log(`✅ FOUND COLUMN: "${col}" at index ${colIndex}`);
    }
  }
  
  // Find airtableAction column with enhanced logic
  const airtableActionColIndex = findAirtableActionColumn(headerMap);
  if (airtableActionColIndex === undefined) {
    console.log('❌ ERROR: Could not find airtableAction column');
    console.log('Available columns:');
    Object.keys(headerMap).forEach(key => {
      console.log(`  - "${key}"`);
    });
    return;
  }
  
  console.log(`✅ Using airtableAction column at index ${airtableActionColIndex}`);
  
  const candidates = [];
  
  console.log('\n=== SCANNING SHEET ROWS ===');
  
  // Scan all rows (skip header)
  for (let i = 1; i < allData.length; i++) {
    const rowData = allData[i];
    const sheetRow = i + 1;
    
    const companyName = rowData[headerMap['name']];
    const processedStatus = String(rowData[headerMap['processed']] || '').trim();
    const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();
    
    // Check if this row has "skip" and "Sent on"
    if (actionValue === 'skip' && processedStatus.startsWith('Sent on')) {
      console.log(`🔍 ROW ${sheetRow}: "${companyName}" - SKIP + SENT`);
      
      // Extract Airtable ID from processed status
      const idMatch = processedStatus.match(/ID: ([^)]+)/);
      if (idMatch) {
        const airtableId = idMatch[1];
        candidates.push({
          sheetRow: sheetRow,
          companyName: companyName,
          airtableId: airtableId,
          processedStatus: processedStatus
        });
        console.log(`  → Airtable ID: ${airtableId}`);
      } else {
        console.log(`  ⚠️ Could not extract Airtable ID from: "${processedStatus}"`);
      }
    }
  }
  
  console.log(`\n=== FOUND ${candidates.length} CANDIDATES ===`);
  
  if (candidates.length === 0) {
    console.log('✅ No bad records found!');
    return;
  }
  
  console.log('\n=== VERIFYING AIRTABLE RECORDS ===');
  console.log('Checking each record for Activities...');
  
  const toDelete = [];
  const hasActivities = [];
  const notFound = [];
  
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`\nChecking ${i + 1}/${candidates.length}: "${candidate.companyName}" (ID: ${candidate.airtableId})`);
    
    try {
      // Rate limiting: Wait 1 second between API calls to avoid hitting limits
      Utilities.sleep(1000);
      
      // Get the record from Airtable
      const response = callAirtableApi('GET', null, candidate.airtableId);
      
      if (!response) {
        console.log(`  ❌ API ERROR: Could not fetch record`);
        console.log(`  📝 This record may have been already deleted or moved.`);
        notFound.push(candidate);
        continue;
      }
      
      if (!response.fields) {
        console.log(`  ❌ NOT FOUND: Record does not exist`);
        notFound.push(candidate);
        continue;
      }
      
      // Check for Activities
      const activities = response.fields['Activities'] || [];
      const notes = response.fields['Notes'] || '';
      const stage = response.fields['Stage'] || '';
      
      console.log(`  → Activities: ${activities.length}`);
      console.log(`  → Notes: "${notes}"`);
      console.log(`  → Stage: "${stage}"`);
      
      // Check if there's any activity
      const hasActivity = activities.length > 0 || 
                         (notes && notes.trim().length > 0) || 
                         (stage && stage !== 'Qualified'); // Assuming 'Qualified' is default
      
      if (hasActivity) {
        console.log(`  ⚠️ HAS ACTIVITY: Cannot delete - agent has used this lead`);
        hasActivities.push(candidate);
        
        // Update Airtable Source field to "GM - Unqualified"
        console.log('  📝 Updating Airtable Source field to "GM - Unqualified"...');
        const updatePayload = {
          fields: {
            'Source': 'GM - Unqualified'
          }
        };
        
        const updateResponse = callAirtableApi('PATCH', updatePayload, candidate.airtableId);
        if (updateResponse) {
          console.log(`  ✅ Successfully updated Source field in Airtable`);
        } else {
          console.log(`  ❌ Failed to update Source field in Airtable`);
        }
        
        // Update sheet to tag this as a pipeline lead
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
        const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
        const processedColIndex = headerMap['processed'];
        
        const newStatus = `In Pipeline - has activities (was: ${candidate.processedStatus})`;
        sheet.getRange(candidate.sheetRow, processedColIndex + 1).setValue(newStatus);
        console.log(`  📝 Updated sheet row ${candidate.sheetRow} to "In Pipeline"`);
      } else {
        console.log(`  ✅ NO ACTIVITY: Safe to delete`);
        toDelete.push(candidate);
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      
      // Check if it's a rate limit error
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`  ⏳ RATE LIMIT HIT: Waiting 5 seconds before continuing...`);
        Utilities.sleep(5000);
      }
      
      notFound.push(candidate);
    }
  }
  
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total candidates: ${candidates.length}`);
  console.log(`Safe to delete: ${toDelete.length}`);
  console.log(`Has activities (cannot delete): ${hasActivities.length}`);
  console.log(`Not found/errors: ${notFound.length}`);
  
  if (toDelete.length > 0) {
    console.log('\n=== RECORDS TO DELETE ===');
    toDelete.forEach((record, index) => {
      console.log(`${index + 1}. Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    });
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Review the list above carefully');
    console.log('2. Run deleteBadRecords() to proceed with deletion');
    console.log('3. Each record will be deleted individually with verification');
  }
  
  if (hasActivities.length > 0) {
    console.log('\n=== RECORDS WITH ACTIVITIES (WILL NOT DELETE) ===');
    hasActivities.forEach((record, index) => {
      console.log(`${index + 1}. Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    });
  }
  
  // Store results for the deletion function
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_TO_DELETE', JSON.stringify(toDelete));
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_HAS_ACTIVITIES', JSON.stringify(hasActivities));
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_NOT_FOUND', JSON.stringify(notFound));
  
  // Also update sheet for "not found" records
  if (notFound.length > 0) {
    console.log('\n=== UPDATING SHEET FOR "NOT FOUND" RECORDS ===');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
    const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    const processedColIndex = headerMap['processed'];
    
    for (const record of notFound) {
      const newStatus = `Record not found in Airtable (was: ${record.processedStatus})`;
      sheet.getRange(record.sheetRow, processedColIndex + 1).setValue(newStatus);
      console.log(`  📝 Updated row ${record.sheetRow}: "${record.companyName}"`);
    }
    console.log(`✅ Updated ${notFound.length} sheet rows for "not found" records`);
  }
}

function identifyBadRecordsBatch(batchSize = 10) {
  console.log(`=== PROCESSING BATCH OF ${batchSize} RECORDS ===`);
  console.log('This will process records in smaller batches to avoid timeouts.');
  console.log('');
  
  // Get the list of records to delete from properties
  const toDeleteJson = PropertiesService.getScriptProperties().getProperty('BAD_RECORDS_TO_DELETE');
  if (!toDeleteJson) {
    console.log('❌ ERROR: No records to delete found. Run identifyBadRecords() first.');
    return;
  }
  
  const allCandidates = JSON.parse(toDeleteJson);
  const processedJson = PropertiesService.getScriptProperties().getProperty('BAD_RECORDS_PROCESSED') || '[]';
  const processed = JSON.parse(processedJson);
  
  const startIndex = processed.length;
  const endIndex = Math.min(startIndex + batchSize, allCandidates.length);
  const batch = allCandidates.slice(startIndex, endIndex);
  
  console.log(`Processing records ${startIndex + 1} to ${endIndex} of ${allCandidates.length}`);
  
  // Process this batch
  for (let i = 0; i < batch.length; i++) {
    const candidate = batch[i];
    console.log(`\nProcessing ${startIndex + i + 1}/${allCandidates.length}: "${candidate.companyName}"`);
    
    // Add to processed list
    processed.push(candidate.airtableId);
  }
  
  // Update processed count
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_PROCESSED', JSON.stringify(processed));
  
  console.log('\n=== BATCH COMPLETE ===');
  console.log(`Processed: ${processed.length}/${allCandidates.length} records`);
  
  if (processed.length >= allCandidates.length) {
    console.log('✅ ALL RECORDS PROCESSED!');
    console.log('Run deleteBadRecords() to proceed with deletion.');
  } else {
    console.log(`⏳ MORE RECORDS TO PROCESS`);
    console.log(`Run identifyBadRecordsBatch() again to process the next ${batchSize} records.`);
  }
}

function updatePipelineLeadsSource() {
  console.log('=== UPDATING SOURCE FIELD FOR PIPELINE LEADS ===');
  console.log('This will update the Source field to "GM - Unqualified" for leads that:');
  console.log('1. Have "skip" in airtableAction column');
  console.log('2. Have "Sent on ..." in processed column');
  console.log('3. Have activities in Airtable (agent has used them)');
  console.log('');
  
  // Get the list of records with activities from properties
  const hasActivitiesJson = PropertiesService.getScriptProperties().getProperty('BAD_RECORDS_HAS_ACTIVITIES');
  if (!hasActivitiesJson) {
    console.log('❌ ERROR: No pipeline leads found. Run identifyBadRecords() first.');
    return;
  }
  
  const hasActivities = JSON.parse(hasActivitiesJson);
  if (hasActivities.length === 0) {
    console.log('✅ No pipeline leads to update.');
    return;
  }
  
  console.log(`Found ${hasActivities.length} pipeline leads to update.`);
  console.log('');
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Update Source Field',
    `Are you sure you want to update the Source field to "GM - Unqualified" for ${hasActivities.length} pipeline leads?\n\nThis will help deprioritize them in reporting.`,
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    console.log('❌ Update cancelled by user.');
    return;
  }
  
  console.log('✅ User confirmed update. Proceeding...');
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < hasActivities.length; i++) {
    const record = hasActivities[i];
    
    console.log(`\n--- UPDATING RECORD ${i + 1}/${hasActivities.length} ---`);
    console.log(`Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    
    try {
      // Rate limiting: Wait 1 second between API calls
      Utilities.sleep(1000);
      
      // Update Source field in Airtable
      const updatePayload = {
        fields: {
          'Source': 'GM - Unqualified'
        }
      };
      
      const updateResponse = callAirtableApi('PATCH', updatePayload, record.airtableId);
      
      if (updateResponse) {
        console.log(`  ✅ Successfully updated Source field to "GM - Unqualified"`);
        successCount++;
      } else {
        console.log(`  ❌ Failed to update Source field`);
        failCount++;
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      
      // Check if it's a rate limit error
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`  ⏳ RATE LIMIT HIT: Waiting 5 seconds before continuing...`);
        Utilities.sleep(5000);
      }
      
      failCount++;
    }
  }
  
  console.log('\n=== UPDATE COMPLETE ===');
  console.log(`Total records: ${hasActivities.length}`);
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (successCount > 0) {
    console.log('\n✅ Source field updates completed successfully!');
    console.log('Pipeline leads are now marked as "GM - Unqualified" for reporting purposes.');
  } else {
    console.log('\n❌ No records were updated. Check the logs above for issues.');
  }
}

function deleteBadRecords() {
  console.log('=== SAFE DELETION OF BAD RECORDS ===');
  console.log('This function will delete records one at a time with full verification.');
  console.log('');
  
  // Get the list of records to delete from properties
  const toDeleteJson = PropertiesService.getScriptProperties().getProperty('BAD_RECORDS_TO_DELETE');
  if (!toDeleteJson) {
    console.log('❌ ERROR: No records to delete found. Run identifyBadRecords() first.');
    return;
  }
  
  const toDelete = JSON.parse(toDeleteJson);
  if (toDelete.length === 0) {
    console.log('✅ No records to delete.');
    return;
  }
  
  console.log(`Found ${toDelete.length} records to delete.`);
  console.log('');
  
  // Show the list one more time
  console.log('=== RECORDS TO DELETE ===');
  toDelete.forEach((record, index) => {
    console.log(`${index + 1}. Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
  });
  
  console.log('');
  console.log('⚠️ WARNING: This will permanently delete these records from Airtable.');
  console.log('Each deletion will be logged and verified.');
  console.log('');
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Confirm Deletion',
    `Are you sure you want to delete ${toDelete.length} records from Airtable?\n\nThis action cannot be undone.`,
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    console.log('❌ Deletion cancelled by user.');
    return;
  }
  
  console.log('✅ User confirmed deletion. Proceeding...');
  console.log('');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const processedColIndex = headerMap['processed'];
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each record individually
  for (let i = 0; i < toDelete.length; i++) {
    const record = toDelete[i];
    
    console.log(`\n--- PROCESSING RECORD ${i + 1}/${toDelete.length} ---`);
    console.log(`Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    
    try {
      // Rate limiting: Wait 1 second between API calls to avoid hitting limits
      Utilities.sleep(1000);
      
      // Step 1: Verify record still exists in Airtable
      console.log('Step 1: Verifying record exists...');
      const verifyResponse = callAirtableApi('GET', null, record.airtableId);
      
      if (!verifyResponse || !verifyResponse.fields) {
        console.log(`  ❌ Record no longer exists in Airtable`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ Record verified in Airtable`);
      
      // Step 2: Double-check no activities
      const activities = verifyResponse.fields['Activities'] || [];
      const notes = verifyResponse.fields['Notes'] || '';
      const stage = verifyResponse.fields['Stage'] || '';
      
      const hasActivity = activities.length > 0 || 
                         (notes && notes.trim().length > 0) || 
                         (stage && stage !== 'Qualified');
      
      if (hasActivity) {
        console.log(`  ⚠️ Record now has activity - skipping deletion`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ No activities found - safe to delete`);
      
      // Rate limiting: Wait 1 second before deletion
      Utilities.sleep(1000);
      
      // Step 3: Delete from Airtable
      console.log('Step 2: Deleting from Airtable...');
      const deleteResponse = callAirtableApi('DELETE', null, record.airtableId);
      
      if (!deleteResponse) {
        console.log(`  ❌ Failed to delete from Airtable`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ Successfully deleted from Airtable`);
      
      // Step 4: Update sheet
      console.log('Step 3: Updating sheet...');
      const newStatus = `Deleted from Airtable on ${new Date().toISOString().slice(0, 10)} (was: ${record.processedStatus})`;
      sheet.getRange(record.sheetRow, processedColIndex + 1).setValue(newStatus);
      
      console.log(`  ✅ Updated sheet row ${record.sheetRow}`);
      
      successCount++;
      console.log(`✅ RECORD ${i + 1} COMPLETED SUCCESSFULLY`);
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      
      // Check if it's a rate limit error
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`  ⏳ RATE LIMIT HIT: Waiting 5 seconds before continuing...`);
        Utilities.sleep(5000);
      }
      
      failCount++;
    }
    
    // Small delay between operations
    Utilities.sleep(1000);
  }
  
  console.log('\n=== DELETION COMPLETE ===');
  console.log(`Total records: ${toDelete.length}`);
  console.log(`Successfully deleted: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (successCount > 0) {
    console.log('\n✅ Cleanup completed successfully!');
  } else {
    console.log('\n❌ No records were deleted. Check the logs above for issues.');
  }
  
  // Clear the stored data
  PropertiesService.getScriptProperties().deleteProperty('BAD_RECORDS_TO_DELETE');
  PropertiesService.getScriptProperties().deleteProperty('BAD_RECORDS_HAS_ACTIVITIES');
  PropertiesService.getScriptProperties().deleteProperty('BAD_RECORDS_NOT_FOUND');
}

function checkColumnNames() {
  console.log('=== CHECKING COLUMN NAMES ===');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  if (!sheet) {
    console.log('❌ ERROR: Could not find "GM - Qualify" sheet');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = getHeaderMap(headers);
  
  console.log('All available columns:');
  Object.keys(headerMap).forEach(key => {
    const index = headerMap[key];
    const columnLetter = String.fromCharCode(65 + index);
    console.log(`"${key}" -> Column ${columnLetter} (index ${index})`);
  });
  
  console.log('\n=== CHECKING SPECIFIC COLUMNS ===');
  
  // Check for website-related columns
  const websiteVariations = ['websiteUrl', 'website', 'url', 'Website URL', 'website_url'];
  console.log('Looking for website column:');
  websiteVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Check for email-related columns
  const emailVariations = ['extractEmail.email', 'email', 'Email', 'extractEmail', 'email_extracted'];
  console.log('\nLooking for email column:');
  emailVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Check for phone-related columns
  const phoneVariations = ['phone', 'Phone', 'telephone', 'contact'];
  console.log('\nLooking for phone column:');
  phoneVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Check for industry/category columns
  const industryVariations = ['category', 'industry', 'Industry', 'Category'];
  console.log('\nLooking for industry/category column:');
  industryVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
}

function deleteBadRecordsTest() {
  console.log('=== TEST: DELETE FIRST BAD RECORD ONLY ===');
  console.log('This will only process the FIRST record from the list.');
  console.log('');
  
  // Get the list of records to delete from properties
  const toDeleteJson = PropertiesService.getScriptProperties().getProperty('BAD_RECORDS_TO_DELETE');
  if (!toDeleteJson) {
    console.log('❌ ERROR: No records to delete found. Run identifyBadRecords() first.');
    return;
  }
  
  const toDelete = JSON.parse(toDeleteJson);
  if (toDelete.length === 0) {
    console.log('✅ No records to delete.');
    return;
  }
  
  // Only take the first record
  const testRecord = toDelete[0];
  console.log(`TESTING WITH FIRST RECORD ONLY:`);
  console.log(`Row ${testRecord.sheetRow}: "${testRecord.companyName}" (ID: ${testRecord.airtableId})`);
  console.log('');
  
  console.log('⚠️ WARNING: About to delete this record as a test:');
  console.log(`Row ${testRecord.sheetRow}: "${testRecord.companyName}" (ID: ${testRecord.airtableId})`);
  console.log('');
  console.log('✅ Proceeding with test deletion...');
  console.log('');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const processedColIndex = headerMap['processed'];
  
  try {
    // Rate limiting: Wait 1 second between API calls to avoid hitting limits
    Utilities.sleep(1000);
    
    // Step 1: Verify record still exists in Airtable
    console.log('Step 1: Verifying record exists...');
    const verifyResponse = callAirtableApi('GET', null, testRecord.airtableId);
    
    if (!verifyResponse || !verifyResponse.fields) {
      console.log(`  ❌ Record no longer exists in Airtable`);
      return;
    }
    
    console.log(`  ✅ Record verified in Airtable`);
    
    // Step 2: Double-check no activities
    const activities = verifyResponse.fields['Activities'] || [];
    const notes = verifyResponse.fields['Notes'] || '';
    const stage = verifyResponse.fields['Stage'] || '';
    
    console.log(`  → Activities: ${activities.length}`);
    console.log(`  → Notes: "${notes}"`);
    console.log(`  → Stage: "${stage}"`);
    
    const hasActivity = activities.length > 0 || 
                       (notes && notes.trim().length > 0) || 
                       (stage && stage !== 'Qualified');
    
    if (hasActivity) {
      console.log(`  ⚠️ Record has activity - skipping deletion`);
      return;
    }
    
    console.log(`  ✅ No activities found - safe to delete`);
    
    // Rate limiting: Wait 1 second before deletion
    Utilities.sleep(1000);
    
    // Step 3: Delete from Airtable
    console.log('Step 2: Deleting from Airtable...');
    const deleteResponse = callAirtableApi('DELETE', null, testRecord.airtableId);
    
    if (!deleteResponse) {
      console.log(`  ❌ Failed to delete from Airtable`);
      return;
    }
    
    console.log(`  ✅ Successfully deleted from Airtable`);
    
    // Step 4: Update sheet
    console.log('Step 3: Updating sheet...');
    const newStatus = `Deleted from Airtable on ${new Date().toISOString().slice(0, 10)} (was: ${testRecord.processedStatus})`;
    sheet.getRange(testRecord.sheetRow, processedColIndex + 1).setValue(newStatus);
    
    console.log(`  ✅ Updated sheet row ${testRecord.sheetRow}`);
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('✅ SUCCESS: First record deleted and sheet updated!');
    console.log('If this worked correctly, you can now run deleteBadRecords() for all records.');
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    
    // Check if it's a rate limit error
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      console.log(`  ⏳ RATE LIMIT HIT: Waiting 5 seconds before continuing...`);
      Utilities.sleep(5000);
    }
  }
}

// ===================================================================================
// AGENT SHEET FUNCTIONALITY
// ===================================================================================

/**
 * Sends selected leads to a specified Google Sheet (agent sheet)
 * Similar to sendSelectedLeadsToAirtable but for Google Sheets instead of Airtable
 */
function sendSelectedLeadsToAgentSheet() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Ensure this function is run from the correct sheet
  if (sheet.getName() !== SHEET_QUALIFY) {
    ui.alert('Wrong Sheet', `This function should only be run from the "${SHEET_QUALIFY}" sheet.`, ui.ButtonSet.OK);
    return;
  }

  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const requiredSheetCols = [SHEET_COL_NAME, SHEET_COL_PROCESSED];

  for (const col of requiredSheetCols) {
    if (headerMap[col] === undefined) {
      ui.alert('Missing Header Column', `A required column "${col}" was not found in Row 1 of your sheet.`, ui.ButtonSet.OK);
      return;
    }
  }

  const selection = sheet.getSelection();
  let dataRange = selection.getActiveRange();
  
  if (!dataRange || dataRange.isBlank()) {
    ui.alert('No Data Selected', 'Please select the data rows you want to send to the agent sheet.', ui.ButtonSet.OK);
    return;
  }

  if (dataRange.getRow() === 1) {
    if (dataRange.getNumRows() > 1) {
      dataRange = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
    } else {
       ui.alert('Header Row Selected', 'Please select data rows below Row 1.', ui.ButtonSet.OK);
       return;
    }
  }
  
  // Get target sheet URL from user
  const response = ui.prompt('Target Sheet', 'Please enter the Google Sheets URL for the agent sheet:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const targetUrl = response.getResponseText().trim();
  if (!targetUrl) {
    ui.alert('No URL Provided', 'Please provide a valid Google Sheets URL.', ui.ButtonSet.OK);
    return;
  }
  
  // Process the data transfer
  processDataRowsToAgentSheet(sheet, dataRange, headerMap, targetUrl);
}

/**
 * Processes data rows and sends them to the agent sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Source sheet
 * @param {GoogleAppsScript.Spreadsheet.Range} dataRowsRange - Range of data rows
 * @param {object} headerMap - Header mapping for source sheet
 * @param {string} targetUrl - Target Google Sheets URL
 */
function processDataRowsToAgentSheet(sheet, dataRowsRange, headerMap, targetUrl) {
  const ui = SpreadsheetApp.getUi();
  const dataRowsToProcess = dataRowsRange.getValues();

  // Validate and open target sheet
  const targetResult = validateAndOpenTargetSheet(targetUrl);
  if (targetResult.error) {
    const errorMsg = `Agent sheet transfer failed: ${targetResult.error}`;
    ui.alert('Error', targetResult.error, ui.ButtonSet.OK);
    sendSlackNotification(`🚨 ${errorMsg}`);
    return;
  }

  const targetSheet = targetResult.sheet;
  const sourceHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const targetHeaderMap = ensureHeadersExist(targetSheet, sourceHeaders);

  let successCount = 0;
  let failCount = 0;
  let alreadyProcessedCount = 0;
  let skippedByActionCount = 0;
  const processedRows = [];
  const airtableActionColIndex = findAirtableActionColumn(headerMap);

  for (let i = 0; i < dataRowsToProcess.length; i++) {
    const rowData = dataRowsToProcess[i];
    const actualSheetRowIndex = dataRowsRange.getRow() + i;

    // Check the airtableAction column first (same logic as Airtable function)
    if (airtableActionColIndex !== undefined) {
      const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();
      if (actionValue === 'skip') {
        skippedByActionCount++;
        Logger.log(`Row ${actualSheetRowIndex}: Skipping due to 'skip' command in airtableAction column.`);
        continue;
      }
    }

    // Check if already processed
    const processedStatusCell = rowData[headerMap[SHEET_COL_PROCESSED]];
    if (processedStatusCell && (String(processedStatusCell).toLowerCase().includes('sent to agent sheet'))) {
      alreadyProcessedCount++;
      continue;
    }

    const companyName = rowData[headerMap[SHEET_COL_NAME]];
    if (!companyName) {
      Logger.log(`Sheet Row ${actualSheetRowIndex}: Skipping due to missing company name.`);
      failCount++;
      continue;
    }

    // Copy row to target sheet
    Logger.log(`Processing row ${actualSheetRowIndex}: "${companyName}"`);
    const success = copyRowToTargetSheet(rowData, headerMap, targetSheet, targetHeaderMap, sheet, actualSheetRowIndex);
    
    if (success) {
      successCount++;
      processedRows.push(actualSheetRowIndex);
      Logger.log(`✅ Row ${actualSheetRowIndex} copied successfully`);
    } else {
      failCount++;
      Logger.log(`❌ Row ${actualSheetRowIndex} failed to copy`);
    }
  }

  // Update processed status for successful transfers
  if (processedRows.length > 0) {
    updateProcessedStatusForAgentSheet(sheet, processedRows);
  }

  // Show results
  let message = `Processing complete:\n` +
                `Successfully sent: ${successCount}\n` +
                (failCount > 0 ? `Failed: ${failCount}\n` : '') +
                (alreadyProcessedCount > 0 ? `Skipped (already sent to agent sheet): ${alreadyProcessedCount}\n` : '') +
                (skippedByActionCount > 0 ? `Skipped (marked as 'skip'): ${skippedByActionCount}\n` : '');
  ui.alert('Processing Complete', message, ui.ButtonSet.OK);
  
  // Send Slack notification for transfer results
  if (successCount > 0) {
    sendSlackNotification(`✅ Agent sheet transfer completed: ${successCount} records transferred successfully`);
  }
  if (failCount > 0) {
    sendSlackNotification(`⚠️ Agent sheet transfer had ${failCount} failures`);
  }
}

/**
 * Extracts spreadsheet ID from Google Sheets URL
 * @param {string} url - Google Sheets URL
 * @returns {string} Spreadsheet ID or null if invalid
 */
function parseGoogleSheetUrl(url) {
  // Handle formats like:
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Validates URL and opens target spreadsheet
 * @param {string} url - Google Sheets URL
 * @returns {object} {sheet, error} - Target sheet or error
 */
function validateAndOpenTargetSheet(url) {
  try {
    const spreadsheetId = parseGoogleSheetUrl(url);
    if (!spreadsheetId) {
      return { error: 'Invalid Google Sheets URL format. Please use a URL like: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit' };
    }
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getActiveSheet();
    
    return { sheet, error: null };
  } catch (error) {
    return { error: 'Cannot access target sheet. Please check the URL and ensure you have permission to access the sheet.' };
  }
}

/**
 * Ensures target sheet has required headers, creates them if missing
 * @param {GoogleAppsScript.Spreadsheet.Sheet} targetSheet - Target sheet
 * @param {string[]} sourceHeaders - Headers from source sheet
 * @returns {object} Header mapping for target sheet
 */
function ensureHeadersExist(targetSheet, sourceHeaders) {
  // Handle completely empty sheets
  if (targetSheet.getLastRow() === 0 || targetSheet.getLastColumn() === 0) {
    // Create headers in target sheet
    targetSheet.getRange(1, 1, 1, sourceHeaders.length).setValues([sourceHeaders]);
    return getHeaderMap(sourceHeaders);
  }
  
  const targetHeaders = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  const targetHeaderMap = getHeaderMap(targetHeaders);
  
  // Check if target sheet has no valid headers
  if (targetHeaders.every(h => !h)) {
    // Create headers in target sheet
    targetSheet.getRange(1, 1, 1, sourceHeaders.length).setValues([sourceHeaders]);
    return getHeaderMap(sourceHeaders);
  }
  
  // Return existing header mapping
  return targetHeaderMap;
}

/**
 * Copies a single row from source to target sheet with column mapping
 * @param {Array} sourceRow - Row data from source sheet
 * @param {object} sourceHeaderMap - Header mapping for source sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} targetSheet - Target sheet
 * @param {object} targetHeaderMap - Header mapping for target sheet
 * @returns {boolean} Success status
 */
function copyRowToTargetSheet(sourceRow, sourceHeaderMap, targetSheet, targetHeaderMap, sourceSheet, sourceRowIndex) {
  try {
    Logger.log(`Copying row with ${Object.keys(targetHeaderMap).length} target columns`);
    
    // Get the maximum column index needed for target sheet
    const targetColumnValues = Object.values(targetHeaderMap);
    const maxTargetColumn = targetColumnValues.length > 0 ? Math.max(...targetColumnValues) + 1 : 0;
    
    Logger.log(`Max target column: ${maxTargetColumn}`);
    
    if (maxTargetColumn <= 0) {
      Logger.log('No valid target columns found - using source column count');
      // Fallback: use source column count if no target mapping
      const sourceColumnCount = sourceRow.length;
      const targetRow = [...sourceRow]; // Copy all source data
      
      const nextRow = targetSheet.getLastRow() + 1;
      const targetRange = targetSheet.getRange(nextRow, 1, 1, sourceColumnCount);
      targetRange.setValues([targetRow]);
      
      // Copy cell notes for fallback case
      copyCellNotesToTarget(sourceSheet, sourceRowIndex, targetSheet, nextRow, sourceColumnCount);
      return true;
    }
    
    // Create target row array with proper size
    const targetRow = new Array(maxTargetColumn).fill('');
    
    // Map each column from source to target
    for (const [sourceHeader, sourceIndex] of Object.entries(sourceHeaderMap)) {
      const targetIndex = targetHeaderMap[sourceHeader];
      if (targetIndex !== undefined && sourceRow[sourceIndex] !== undefined) {
        targetRow[targetIndex] = sourceRow[sourceIndex];
      }
    }
    
    // Find next empty row in target sheet
    const nextRow = targetSheet.getLastRow() + 1;
    const targetRange = targetSheet.getRange(nextRow, 1, 1, maxTargetColumn);
    targetRange.setValues([targetRow]);
    
    // Copy cell notes for mapped columns
    copyCellNotesToTarget(sourceSheet, sourceRowIndex, targetSheet, nextRow, sourceHeaderMap, targetHeaderMap);
    
    return true;
  } catch (error) {
    Logger.log(`Error copying row: ${error.message}`);
    return false;
  }
}

/**
 * Copies cell notes from source to target sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sourceSheet - Source sheet
 * @param {number} sourceRowIndex - Source row index (1-based)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} targetSheet - Target sheet
 * @param {number} targetRowIndex - Target row index (1-based)
 * @param {object} sourceHeaderMap - Source header mapping (or column count for fallback)
 * @param {object} targetHeaderMap - Target header mapping (optional for fallback)
 */
function copyCellNotesToTarget(sourceSheet, sourceRowIndex, targetSheet, targetRowIndex, sourceHeaderMap, targetHeaderMap) {
  try {
    // Get all notes from source row
    const sourceRange = sourceSheet.getRange(sourceRowIndex, 1, 1, sourceSheet.getLastColumn());
    const sourceNotes = sourceRange.getNotes()[0];
    
    if (!sourceNotes || sourceNotes.every(note => !note)) {
      return; // No notes to copy
    }
    
    // Check if this is fallback mode (sourceHeaderMap is a number)
    if (typeof sourceHeaderMap === 'number') {
      // Fallback mode: copy all notes in order
      const columnCount = sourceHeaderMap;
      for (let i = 0; i < columnCount && i < sourceNotes.length; i++) {
        if (sourceNotes[i]) {
          const targetCell = targetSheet.getRange(targetRowIndex, i + 1);
          targetCell.setNote(sourceNotes[i]);
        }
      }
    } else {
      // Normal mode: copy notes for mapped columns
      for (const [sourceHeader, sourceIndex] of Object.entries(sourceHeaderMap)) {
        const targetIndex = targetHeaderMap[sourceHeader];
        if (targetIndex !== undefined && sourceNotes[sourceIndex]) {
          const targetCell = targetSheet.getRange(targetRowIndex, targetIndex + 1);
          targetCell.setNote(sourceNotes[sourceIndex]);
        }
      }
    }
  } catch (error) {
    Logger.log(`Error copying cell notes: ${error.message}`);
    sendSlackNotification(`⚠️ Cell notes transfer error: ${error.message}`);
  }
}

/**
 * Updates the processed status for rows sent to agent sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Source sheet
 * @param {number[]} rowIndices - Row indices to update
 */
function updateProcessedStatusForAgentSheet(sheet, rowIndices) {
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const processedColIndex = headerMap[SHEET_COL_PROCESSED];
  
  if (processedColIndex !== undefined) {
    const today = new Date().toISOString().slice(0, 10);
    const statusMessage = `Sent to agent sheet on ${today}`;
    
    rowIndices.forEach(rowIndex => {
      sheet.getRange(rowIndex, processedColIndex + 1).setValue(statusMessage);
    });
  }
}

/**
 * Debug function to test agent sheet functionality with specific rows
 */
function debugAgentSheetTransfer() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  if (!sheet) {
    console.log('❌ GM - Qualify sheet not found');
    return;
  }
  
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  console.log('Header map:', headerMap);
  
  // Test with rows 4425-4428
  const testRows = [4425, 4426, 4427, 4428];
  
  for (const rowNum of testRows) {
    if (rowNum > sheet.getLastRow()) {
      console.log(`Row ${rowNum}: Beyond sheet range`);
      continue;
    }
    
    const rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log(`Row ${rowNum}:`, {
      companyName: rowData[headerMap['name']],
      processed: rowData[headerMap['processed']],
      hasData: rowData.some(cell => cell !== null && cell !== ''),
      dataLength: rowData.length
    });
  }
}
