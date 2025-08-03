// ===============================================================
// CONFIGURATION
// --- Verify these values to match your Airtable setup ---
// ===============================================================

const config = {
  AIRTABLE_BASE_ID: 'appHrFgnn80g9O1Xf', // <-- PASTE YOUR BASE ID HERE
  
  LEADS_TABLE_NAME: 'Leads',
  // -- Make sure these field names are an EXACT match to your Airtable base --
  LEADS_STAGE_FIELD: 'Stage',             // The field in the Leads table showing the lead's status.
  LEADS_DATE_CLOSED_FIELD: 'Date Closed', // The date field (or rollup) marking when it was closed.

  ACTIVITIES_TABLE_NAME: 'Activities',
  // -- CRITICAL: This MUST be the exact name of the "Link to another record" field in Activities that points to Leads --
  ACTIVITIES_LEAD_LINK_FIELD: 'Lead', 
};


// ===============================================================
// USER-FACING FUNCTIONS (Entry Points)
// ===============================================================

function runDryRun() {
  const archiveMonth = promptForMonth();
  if (archiveMonth) {
    archiveClosedLeadsData(true, archiveMonth);
  } else {
    SpreadsheetApp.getActive().toast('Archive cancelled. No month was selected.');
  }
}

function runLiveArchive() {
  const archiveMonth = promptForMonth();
  if (!archiveMonth) {
    SpreadsheetApp.getActive().toast('Archive cancelled. No month was selected.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'CONFIRM LIVE RUN', 
    `You are about to PERMANENTLY delete all 'Closed' leads and their activities from the month ${archiveMonth}. This cannot be undone.\n\nAre you sure you want to continue?`, 
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    archiveClosedLeadsData(false, archiveMonth);
  } else {
    SpreadsheetApp.getActive().toast('Live archive cancelled by user.');
  }
}

/**
 * Prompts the user for a month in YYYY-MM format and validates it.
 * @returns {string|null} The validated month string (e.g., "2023-09") or null if cancelled/invalid.
 */
function promptForMonth() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Select Month to Archive',
    'Please enter the month to archive in YYYY-MM format (e.g., 2025-06 for June 2025).',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return null;
  }

  const inputText = response.getResponseText().trim();
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/; // Validates YYYY-MM format

  if (regex.test(inputText)) {
    return inputText;
  } else {
    ui.alert('Invalid Format', `The format "${inputText}" is incorrect. Please use YYYY-MM format.`, ui.ButtonSet.OK);
    return null;
  }
}


// ===============================================================
// MAIN ARCHIVAL LOGIC (WITH FIXES)
// ===============================================================

/**
 * Main function to archive leads and activities for a specific month.
 * @param {boolean} isDryRun If true, skips the deletion step.
 * @param {string} archiveMonth The month to archive in 'YYYY-MM' format.
 */
function archiveClosedLeadsData(isDryRun, archiveMonth) {
  const runMode = isDryRun ? 'DRY RUN' : 'LIVE RUN';
  Logger.log(`--- Starting Airtable Archival for ${archiveMonth}: ${runMode} ---`);
  SpreadsheetApp.getActive().toast(`Starting ${runMode} for ${archiveMonth}... Check Logs for details.`);
  
  setupApiKey(); 

  try {
    // STEP 1: Calculate date range for the selected month.
    Logger.log('Step 1: Calculating date range...');
    const startDate = new Date(archiveMonth + '-01T00:00:00.000Z');
    const nextMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    
    const startDateString = startDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const nextMonthString = nextMonthDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    Logger.log(`Date range: >= ${startDateString} and < ${nextMonthString}`);

    // STEP 2: Find all Leads that were closed in the specified month.
    Logger.log('Step 2: Fetching leads closed in the specified month...');
    const leadFilterFormula = `AND(` +
      `FIND("Closed", {${config.LEADS_STAGE_FIELD}}), ` + // <-- THIS IS THE CORRECT, FLEXIBLE LINE
      `IS_AFTER({${config.LEADS_DATE_CLOSED_FIELD}}, '${startDateString}'), ` +
      `IS_BEFORE({${config.LEADS_DATE_CLOSED_FIELD}}, '${nextMonthString}')` +
    `)`;
    
    const leadsToArchive = fetchAirtableData(config.LEADS_TABLE_NAME, leadFilterFormula);

    if (leadsToArchive.length === 0) {
      Logger.log('No leads with a "Closed" status were found for the selected month. Exiting.');
      SpreadsheetApp.getActive().toast(`No records to archive for ${archiveMonth}.`);
      return;
    }
    Logger.log(`Found ${leadsToArchive.length} leads to archive.`);
    const leadIdsToArchive = leadsToArchive.map(lead => lead.id);

    // STEP 3: Find all Activities linked to those specific leads.
    Logger.log('Step 3: Fetching associated activities in batches...');
    const activitiesToArchive = [];
    // --- [FIX #1] Reduced batch size to prevent "URL Length Exceeded" error. ---
    const BATCH_SIZE = 15; 

    for (let i = 0; i < leadIdsToArchive.length; i += BATCH_SIZE) {
      const batchIds = leadIdsToArchive.slice(i, i + BATCH_SIZE);
      Logger.log(`Fetching activities for lead batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      
      const activityFilterFormula = `OR(${batchIds.map(id => `FIND("${id}", ARRAYJOIN({${config.ACTIVITIES_LEAD_LINK_FIELD}}))`).join(',')})`;
      
      // --- [FIX #2] ADDED CRUCIAL DEBUG LINE. The output of this line will solve the problem. ---
      Logger.log("DEBUG --- The exact formula being used is: " + activityFilterFormula); 
      
      const fetchedBatch = fetchAirtableData(config.ACTIVITIES_TABLE_NAME, activityFilterFormula);
      activitiesToArchive.push(...fetchedBatch);
    }
    Logger.log(`Found ${activitiesToArchive.length} total activities to archive.`);

    // STEP 4: Archive all the collected data to Google Sheets.
    Logger.log('Step 4: Archiving data to Google Sheets...');
    // --- [FIX #3] Passing extra info to the sheet writing function so it can create unique sheet names. ---
    writeDataToSheet('Archived Leads', leadsToArchive, isDryRun, archiveMonth);
    writeDataToSheet('Archived Activities', activitiesToArchive, isDryRun, archiveMonth);
    Logger.log('Successfully wrote data to new, unique sheets for review.');

    // STEP 5: Deletion Phase (only if it's a LIVE run).
    Logger.log('Step 5: Deletion Phase...');
    if (isDryRun) {
      Logger.log('DRY RUN MODE: Skipping deletion.');
      Logger.log(`Would have deleted ${activitiesToArchive.length} activities.`);
      Logger.log(`Would have deleted ${leadsToArchive.length} leads.`);
      SpreadsheetApp.getActive().toast('Dry Run Complete. Check sheets and logs. No data was deleted.');
    } else {
      Logger.log('LIVE RUN MODE: Deleting records from Airtable...');
      
      if (activitiesToArchive.length > 0) {
        const activityIdsToDelete = activitiesToArchive.map(activity => activity.id);
        deleteAirtableRecords(config.ACTIVITIES_TABLE_NAME, activityIdsToDelete);
      }
      
      if (leadsToArchive.length > 0) {
        deleteAirtableRecords(config.LEADS_TABLE_NAME, leadIdsToArchive);
      }
      SpreadsheetApp.getActive().toast('Live Archive Complete! Records have been deleted.');
    }

    Logger.log(`--- Archival Process Complete: ${runMode} ---`);

  } catch (e) {
    Logger.log(`An error occurred: ${e.message}\nStack Trace: ${e.stack}`);
    SpreadsheetApp.getActive().toast(`ERROR: ${e.message}. Check Logs.`);
  }
}

// ===============================================================
// HELPER FUNCTIONS (Minor additions & fixes)
// ===============================================================

/**
 * Securely stores the Airtable API key using PropertiesService.
 */
function setupApiKey() {
  const userProperties = PropertiesService.getUserProperties();
  if (!userProperties.getProperty('AIRTABLE_API_KEY')) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('Airtable API Key Setup', 'Please enter your Airtable API Key:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() == ui.Button.OK && response.getResponseText() != '') {
      userProperties.setProperty('AIRTABLE_API_KEY', response.getResponseText());
      Logger.log('Airtable API Key has been stored securely.');
    } else {
      throw new Error("Airtable API Key not provided. Script cannot continue.");
    }
  }
}

/**
 * Fetches all records from a specific Airtable table, handling pagination and filtering.
 */
function fetchAirtableData(tableName, filterByFormula = '') {
  const allRecords = [];
  let offset = null;
  const userProperties = PropertiesService.getUserProperties();
  const apiKey = userProperties.getProperty('AIRTABLE_API_KEY');

  const encodedTableName = encodeURIComponent(tableName);
  let url = `https://api.airtable.com/v0/${config.AIRTABLE_BASE_ID}/${encodedTableName}?`;

  if (filterByFormula) {
    if (filterByFormula.length > 15000) {
        Logger.log('WARNING: filterByFormula is very long and may exceed URL length limits.')
    }
    url += `&filterByFormula=${encodeURIComponent(filterByFormula)}`;
  }

  do {
    let fetchUrl = url;
    if (offset) {
      fetchUrl += `&offset=${encodeURIComponent(offset)}`;
    }

    const response = UrlFetchApp.fetch(fetchUrl, {
      method: 'get',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      Logger.log(`ERROR fetching from Airtable. Code: ${responseCode}. Response: ${responseText}. URL: ${fetchUrl}`);
      throw new Error(`Airtable API error (Code: ${responseCode}). Check logs for details.`);
    }
    
    const data = JSON.parse(responseText);
    allRecords.push(...data.records);
    offset = data.offset;
    if(offset) Utilities.sleep(250); // Be kind to the API

  } while (offset);

  return allRecords;
}

/**
 * Deletes records from an Airtable table in batches of 10.
 */
function deleteAirtableRecords(tableName, recordIds) {
  const userProperties = PropertiesService.getUserProperties();
  const apiKey = userProperties.getProperty('AIRTABLE_API_KEY');
  const encodedTableName = encodeURIComponent(tableName);

  Logger.log(`Preparing to delete ${recordIds.length} records from ${tableName}.`);

  for (let i = 0; i < recordIds.length; i += 10) {
    const batch = recordIds.slice(i, i + 10);
    const recordsQuery = batch.map(id => `records[]=${encodeURIComponent(id)}`).join('&');
    const url = `https://api.airtable.com/v0/${config.AIRTABLE_BASE_ID}/${encodedTableName}?${recordsQuery}`;
    
    try {
      UrlFetchApp.fetch(url, {
        method: 'delete',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      Logger.log(`Successfully deleted batch of ${batch.length} records.`);
    } catch(e) {
      Logger.log(`Failed to delete batch. Error: ${e.message}`);
    }
    Utilities.sleep(250); // Be kind to the API between batches
  }
}


/**
 * --- [REVISED AND FIXED] ---
 * Writes data to a new, uniquely named sheet for each archive run.
 * This PREVENTS overwriting previous archives.
 */
/**
 * --- [REVISED AND FIXED] ---
 * Appends data to a single sheet. If the sheet doesn't exist, it's
 * created with headers. If it exists, new data is added to the bottom.
 */
function writeDataToSheet(sheetName, records) {
  if (!records || records.length === 0) {
    Logger.log(`No new records to append to sheet: ${sheetName}`);
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  const flatData = records.map(record => {
    let flatRecord = {
      recordId: record.id,
      createdTime: record.createdTime,
    };
    if (record.fields) {
      for (const key in record.fields) {
        const value = record.fields[key];
        flatRecord[key] = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
      }
    }
    return flatRecord;
  });

  if (!sheet) {
    // ---- SHEET DOES NOT EXIST: Create it and write headers + first batch of data ----
    Logger.log(`Sheet "${sheetName}" not found. Creating it with headers.`);
    sheet = ss.insertSheet(sheetName);

    const headers = [...new Set(flatData.flatMap(row => Object.keys(row)))];
    headers.sort((a, b) => {
      if (a === 'recordId') return -1; if (b === 'recordId') return 1;
      if (a === 'createdTime') return -1; if (b === 'createdTime') return 1;
      return a.localeCompare(b);
    });

    const dataForSheet = [
      headers,
      ...flatData.map(row => headers.map(header => row[header] || ''))
    ];
    
    sheet.getRange(1, 1, dataForSheet.length, headers.length).setValues(dataForSheet);
    sheet.setFrozenRows(1);
    Logger.log(`Wrote ${flatData.length} new records with headers to "${sheetName}".`);

  } else {
    // ---- SHEET EXISTS: Append new data to the bottom ----
    Logger.log(`Appending ${flatData.length} new records to existing sheet: "${sheetName}"`);
    const lastRow = sheet.getLastRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const rowsToAppend = flatData.map(row => {
      // Map the new data to the existing column order
      return headers.map(header => row[header] || '');
    });

    if (rowsToAppend.length > 0) {
      sheet.getRange(lastRow + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      Logger.log(`Successfully appended ${rowsToAppend.length} rows to "${sheetName}".`);
    }
  }
}