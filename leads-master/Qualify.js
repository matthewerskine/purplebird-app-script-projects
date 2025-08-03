
// Qualify.gs - Verified and Corrected Version

const SHEET_RAW_CLEANER = 'GM - RAW';
  const RAW_NAME_HEADER_CLEANER = 'name'; // Header in 'GM - RAW' for the business name

/**
 * Main function to transfer selected rows from the RAW sheet to the Qualify sheet.
 * It performs a multi-stage de-duplication check and reports the results
 * in a non-blocking sidebar for a clear, user-friendly experience.
 *
 * De-duplication Priority:
 * 1. Checks if the row is already marked as 'Sent'.
 * 2. Checks against the 'GM - Qualify' sheet.
 * 3. Checks against the 'Archived Leads' sheet.
 * 4. Checks against the legacy 'Height' data sheet.
 * 5. Checks for duplicates within the current selection itself.
 */

// =======================================================================================
// ===== FINAL, CORRECTED sendToQualifySheet FUNCTION ====================================
// This version fixes the case-sensitivity mismatch causing the transfer to fail.
// =======================================================================================
function sendToQualifySheet() {
  const SHEET_RAW = 'GM - RAW';
  const SHEET_QUALIFY = 'GM - Qualify';
  const SHEET_ARCHIVED = 'Archived Leads';
  const SHEET_HEIGHT = 'Height';

  const SHEET_COL_NAME = 'name'; // Column header for the company name in the source sheet.
  const SHEET_COL_NOTES = 'notes'; // Column header for writing skip reasons.
  const SHEET_COL_SENT_TO_QUALIFY = 'sentToQualify'; // Column header for the status column in the source sheet.


  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_RAW);
  const destinationSheet = ss.getSheetByName(SHEET_QUALIFY);
  const archivedSheet = ss.getSheetByName(SHEET_ARCHIVED);
  const heightSheet = ss.getSheetByName(SHEET_HEIGHT);

  // --- 1. Initial Validations ---
  if (!sourceSheet || !destinationSheet || !archivedSheet || !heightSheet) {
    ui.alert('Sheet Not Found', `Please ensure "${SHEET_RAW}", "${SHEET_QUALIFY}", "${SHEET_ARCHIVED}", and "${SHEET_HEIGHT}" sheets all exist.`, ui.ButtonSet.OK);
    return;
  }
  if (ss.getActiveSheet().getName() !== SHEET_RAW) {
    ui.alert('Wrong Sheet', `This function must be run from the "${SHEET_RAW}" sheet.`, ui.ButtonSet.OK);
    return;
  }
  let dataRange = ss.getActiveRange();
  if (!dataRange || dataRange.isBlank()) {
    ss.toast('Please select one or more rows to transfer.', 'No Selection', 5);
    return;
  }
  if (dataRange.getRow() === 1) {
    if (dataRange.getNumRows() > 1) {
      dataRange = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
    } else {
      ss.toast('Please select data rows, not the header.', 'Header Selected', 5);
      return;
    }
  }

  // --- 2. Start Process & Load Data Sets for De-duplication ---
  ss.toast('De-duplication process started...', 'Processing', 5);

  const sourceHeaderMap = getHeaderMap(sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0]);
  const destHeaderArray = destinationSheet.getRange(1, 1, 1, destinationSheet.getLastColumn()).getValues()[0];
  
  const previousRawNamesSet = getPreviousRawNamesSet(sourceSheet, sourceHeaderMap, dataRange.getRow());
  const existingQualifyNamesSet = getExistingCompanyNames(destinationSheet, getHeaderMap(destHeaderArray));
  const archivedNamesSet = getArchivedCompanyNamesSet(archivedSheet);
  const heightNamesSet = getHeightCompanyNamesSet(heightSheet);

  // --- 3. Process Selection and Build Log ---
  const selectedData = dataRange.getValues();
  const sourceNameColIdx = sourceHeaderMap[SHEET_COL_NAME]; // All keys are now lowercase
  const sentToQualifyColIdx = sourceHeaderMap[SHEET_COL_SENT_TO_QUALIFY]; // All keys are now lowercase
  const notesColSourceIdx = sourceHeaderMap[SHEET_COL_NOTES]; // All keys are now lowercase
  
  const logMessages = [];
  const counters = { transferred: 0, alreadySent: 0, inQualify: 0, inArchive: 0, inHeight: 0, inRaw: 0 };
  const rowsToTransfer = [];
  const todayISO = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < selectedData.length; i++) {
    const sourceRowData = selectedData[i];
    const companyName = sourceNameColIdx !== undefined ? sourceRowData[sourceNameColIdx] : '';
    if (!companyName) continue;

    const normalizedName = String(companyName).trim().toLowerCase();
    let skipReason = '';

    if (sentToQualifyColIdx !== undefined && sourceRowData[sentToQualifyColIdx]) {
      counters.alreadySent++; skipReason = 'Already marked as sent';
    } else if (existingQualifyNamesSet.has(normalizedName)) {
      counters.inQualify++; skipReason = 'Found in Qualify Sheet';
    } else if (archivedNamesSet.has(normalizedName)) {
      counters.inArchive++; skipReason = 'Found in Archive';
    } else if (heightNamesSet.has(normalizedName)) {
      counters.inHeight++; skipReason = 'Found in legacy Height data';
    } else if (previousRawNamesSet.has(normalizedName)) {
      counters.inRaw++; skipReason = 'Duplicate in this selection';
    }

    if (skipReason) {
      logMessages.push(`<div class="log-entry skipped"><b>⚠️ Skipped:</b> ${companyName} <i>(${skipReason})</i></div>`);
      if (notesColSourceIdx !== undefined) sourceSheet.getRange(dataRange.getRow() + i, notesColSourceIdx + 1).setValue(`Skipped (${skipReason})`);
      continue;
    }

    let successLog = `<div class="log-entry success"><b>✅ Transferred: ${companyName}</b><ul class="checklist">`;
    successLog += `<li>✓ Checked against Qualify Sheet</li>`;
    successLog += `<li>✓ Checked against Archive</li>`;
    successLog += `<li>✓ Checked against Height Data</li>`;
    successLog += `<li>✓ Checked against other RAW entries</li>`;
    successLog += `</ul></div>`;
    logMessages.push(successLog);
    
    // =============================================================
    // ===== THE FIX IS HERE =======================================
    // =============================================================
    const newRow = destHeaderArray.map(header => {
      // Find the index by looking up the header (all keys are now lowercase)
      const sourceColIndex = sourceHeaderMap[header];
      
      // Use the found index to get data from the source row. If not found, return a blank.
      return sourceColIndex !== undefined ? sourceRowData[sourceColIndex] : '';
    });
    // =============================================================
    
    rowsToTransfer.push(newRow);
    counters.transferred++;
    
    existingQualifyNamesSet.add(normalizedName);
    previousRawNamesSet.add(normalizedName);
    if (sentToQualifyColIdx !== undefined) sourceSheet.getRange(dataRange.getRow() + i, sentToQualifyColIdx + 1).setValue(`Sent on ${todayISO}`);
  }

  // --- 4. Write Data and Display Report ---
  if (rowsToTransfer.length > 0) {
    destinationSheet.getRange(destinationSheet.getLastRow() + 1, 1, rowsToTransfer.length, rowsToTransfer[0].length).setValues(rowsToTransfer);
  }

  logMessages.push('<div class="summary">');
  logMessages.push('<div class="summary-title">Summary</div>');
  logMessages.push(`<div class="summary-line">✅ <b>Successfully Transferred:</b> ${counters.transferred}</div>`);
  if (counters.inArchive > 0) logMessages.push(`<div class="summary-line">⚠️ <b>Skipped (in Archive):</b> ${counters.inArchive}</div>`);
  if (counters.inHeight > 0) logMessages.push(`<div class="summary-line">⚠️ <b>Skipped (in Height):</b> ${counters.inHeight}</div>`);
  if (counters.inQualify > 0) logMessages.push(`<div class="summary-line">⚠️ <b>Skipped (in Qualify Sheet):</b> ${counters.inQualify}</div>`);
  if (counters.alreadySent > 0) logMessages.push(`<div class="summary-line">⚠️ <b>Skipped (already sent):</b> ${counters.alreadySent}</div>`);
  if (counters.inRaw > 0) logMessages.push(`<div class="summary-line">⚠️ <b>Skipped (duplicate in selection):</b> ${counters.inRaw}</div>`);
  logMessages.push('</div>');
  
  const htmlTemplate = HtmlService.createTemplateFromFile('DeDupeSidebar');
  htmlTemplate.logs = logMessages.join('');
  
  const htmlOutput = htmlTemplate.evaluate().setTitle('De-duplication Report').setWidth(350);
  ui.showSidebar(htmlOutput);
}

/**
 * Opens the interactive cleaner sidebar.
 */
function openCleanerSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('CleanerSidebar')
      .setTitle('Interactive Lead Cleaner')
      .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Finds how many rows in the RAW sheet match a given search term.
 * This is called by the sidebar's "Preview" button.
 * @param {string} searchText The text to search for in the company name column.
 * @returns {number} The number of matching rows.
 */
function findMatchingLeads(searchText) {


  if (!searchText || searchText.trim().length === 0) {
    return 0;
  }
  const normalizedSearchText = searchText.trim().toLowerCase();
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RAW_CLEANER);
  const allData = sheet.getDataRange().getValues();
  const headerMap = getHeaderMap(allData[0]); // Assumes getHeaderMap function exists
  const nameColIdx = headerMap[RAW_NAME_HEADER_CLEANER];

  if (nameColIdx === undefined) {
    throw new Error(`Column "${RAW_NAME_HEADER_CLEANER}" not found.`);
  }

  let matchCount = 0;
  for (let i = 1; i < allData.length; i++) {
    const companyName = allData[i][nameColIdx];
    if (companyName && String(companyName).toLowerCase().includes(normalizedSearchText)) {
      matchCount++;
    }
  }
  return matchCount;
}

/**
 * Finds AND DELETES rows in the RAW sheet that match a given search term.
 * This is called by the sidebar's "Delete" button.
 * @param {string} searchText The text to search for in the company name column.
 * @returns {number} The number of rows deleted.
 */
function deleteMatchingLeads(searchText) {
  if (!searchText || searchText.trim().length === 0) {
    return 0;
  }
  const normalizedSearchText = searchText.trim().toLowerCase();
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RAW_CLEANER);
  const allData = sheet.getDataRange().getValues();
  const headerMap = getHeaderMap(allData[0]);
  const nameColIdx = headerMap[RAW_NAME_HEADER_CLEANER];

  if (nameColIdx === undefined) {
    throw new Error(`Column "${RAW_NAME_HEADER_CLEANER}" not found.`);
  }

  const rowsToDelete = [];
  for (let i = 1; i < allData.length; i++) { // Find all rows that match
    const companyName = allData[i][nameColIdx];
    if (companyName && String(companyName).toLowerCase().includes(normalizedSearchText)) {
      rowsToDelete.push(i + 1); // Add the actual row number
    }
  }

  if (rowsToDelete.length > 0) {
    // Delete from the bottom up to prevent row index shifting
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
  }
  
  return rowsToDelete.length;
}