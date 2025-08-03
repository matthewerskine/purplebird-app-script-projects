// In file: Reporting.gs

/**
 * Main function for the de-dupe report. Called by the menu.
 * Audits selected rows in the Qualify sheet against all known data sources.
 * This version has been corrected to use the correct "name" column and removes the blocking modal.
 */
function runDedupeReport() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const qualifySheet = ss.getActiveSheet();

  if (qualifySheet.getName() !== 'GM - Qualify') {
    ui.alert('Wrong Sheet', 'This report must be run from the "GM - Qualify" sheet.', ui.ButtonSet.OK);
    return;
  }
  
  const selection = qualifySheet.getActiveRange();
  if (!selection || selection.isBlank()) {
    ss.toast('Please select one or more rows to audit.', 'No Selection', 5);
    return;
  }
  
  // --- REPLACED MODAL WITH A NON-BLOCKING TOAST ---
  ss.toast('Loading data sources for audit... Please wait.', 'Preparing Report', 10);

  // --- Pre-load all data sets for efficient checking ---
  const heightSet = getHeightCompanyNamesSet(ss.getSheetByName('Height'));
  const archiveSet = getArchivedCompanyNamesSet(ss.getSheetByName('Archived Leads'));
  const rawSet = getRawCompanyNamesSet(ss.getSheetByName('GM - RAW'));
  const airtableSet = getAirtableCompanyNamesSet();

  // --- CORRECTED LOGIC TO FIND THE 'name' COLUMN ---
  const qualifyHeaderMap = getHeaderMap(qualifySheet.getRange(1, 1, 1, qualifySheet.getLastColumn()).getValues()[0]);
  const qualifyNameColIdx = qualifyHeaderMap['name']; // Find the index of the 'name' column.

  if (qualifyNameColIdx === undefined) {
    ui.alert('Error', 'Could not find a column named "name" in the "GM - Qualify" sheet.', ui.ButtonSet.OK);
    return;
  }
  
  const qualifyData = qualifySheet.getDataRange().getValues();
  const qualifyNamesMap = new Map();
  qualifyData.slice(1).forEach((row, index) => {
    // Use the correct column index to get the name
    const name = String(row[qualifyNameColIdx] || '').trim().toLowerCase();
    if (name) {
      if (!qualifyNamesMap.has(name)) qualifyNamesMap.set(name, []);
      qualifyNamesMap.get(name).push(index + 2); // Store row number
    }
  });

  const selectedData = selection.getValues();
  const selectionStartCol = selection.getColumn();
  const selectionHeaderMap = getHeaderMap(qualifySheet.getRange(1, selectionStartCol, 1, selection.getWidth()).getValues()[0]);
  const selectionNameColOffset = selectionHeaderMap['name']; // Find offset of 'name' within the selection

  const logMessages = [];

  for (let i = 0; i < selectedData.length; i++) {
    // Get the company name from the correct column within the selection
    const companyName = selectedData[i][selectionNameColOffset];
    if (!companyName) continue;
    
    const normalizedName = String(companyName).trim().toLowerCase();
    
    let reportHtml = `<div class="log-entry success"><b>Audit for: ${companyName}</b><ul class="checklist">`;
    reportHtml += `<li>${airtableSet.has(normalizedName) ? '✅ Found' : '❌ Not Found'} in Airtable</li>`;
    reportHtml += `<li>${archiveSet.has(normalizedName) ? '✅ Found' : '❌ Not Found'} in Archive</li>`;
    reportHtml += `<li>${heightSet.has(normalizedName) ? '✅ Found' : '❌ Not Found'} in Height</li>`;
    reportHtml += `<li>${rawSet.has(normalizedName) ? '✅ Found' : '❌ Not Found'} in GM - RAW</li>`;
    
    const qualifyInstances = qualifyNamesMap.get(normalizedName) || [];
    if (qualifyInstances.length > 1) {
      reportHtml += `<li style="color:red;">⚠️ Found multiple times in GM - Qualify (Rows: ${qualifyInstances.join(', ')})</li>`;
    } else {
      reportHtml += `<li>✓ Single instance in GM - Qualify</li>`;
    }

    reportHtml += `</ul></div>`;
    logMessages.push(reportHtml);
  }
  
  const htmlTemplate = HtmlService.createTemplateFromFile('DeDupeSidebar');
  htmlTemplate.logs = logMessages.join('');
  
  const htmlOutput = htmlTemplate.evaluate().setTitle('Audit Report').setWidth(350);
  ui.showSidebar(htmlOutput);
}