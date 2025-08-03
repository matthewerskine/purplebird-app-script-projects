/**
 * Comprehensive diagnostic function to identify exactly what's failing
 */
function comprehensiveDiagnostic() {
  Logger.log('=== COMPREHENSIVE DIAGNOSTIC ===');
  
  // Test 1: Check if sheets exist
  Logger.log('\n--- TEST 1: SHEET EXISTENCE ---');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const apiSheet = ss.getSheetByName('API');
  const qualifySheet = ss.getSheetByName('GM - Qualify');
  const rawSheet = ss.getSheetByName('GM - RAW');
  
  Logger.log(`API sheet exists: ${apiSheet ? 'YES' : 'NO'}`);
  Logger.log(`GM - Qualify sheet exists: ${qualifySheet ? 'YES' : 'NO'}`);
  Logger.log(`GM - RAW sheet exists: ${rawSheet ? 'YES' : 'NO'}`);
  
  // Test 2: Check API sheet columns
  if (apiSheet) {
    Logger.log('\n--- TEST 2: API SHEET COLUMNS ---');
    const apiHeaders = apiSheet.getRange(1, 1, 1, apiSheet.getLastColumn()).getValues()[0];
    const apiHeaderMap = getHeaderMap(apiHeaders);
    
    Logger.log('API sheet headers found:');
    apiHeaders.forEach((header, index) => {
      Logger.log(`  ${String.fromCharCode(65 + index)}: "${header}"`);
    });
    
    Logger.log('\nChecking required API columns:');
    Logger.log(`- processed: ${apiHeaderMap['processed'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
    Logger.log(`- category: ${apiHeaderMap['category'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
    Logger.log(`- region: ${apiHeaderMap['region'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
    Logger.log(`- pageOffset: ${apiHeaderMap['pageOffset'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check for pending rows
    if (apiHeaderMap['processed'] !== undefined) {
      const processedCol = apiHeaderMap['processed'] + 1;
      const dataRows = apiSheet.getRange(2, processedCol, apiSheet.getLastRow() - 1, 1).getValues();
      let pendingCount = 0;
      dataRows.forEach((row, index) => {
        if (String(row[0]).trim().toLowerCase() === 'no') {
          pendingCount++;
        }
      });
      Logger.log(`Pending rows (processed = "No"): ${pendingCount}`);
    }
  }
  
  // Test 3: Check GM - Qualify sheet columns
  if (qualifySheet) {
    Logger.log('\n--- TEST 3: GM - QUALIFY SHEET COLUMNS ---');
    const qualifyHeaders = qualifySheet.getRange(1, 1, 1, qualifySheet.getLastColumn()).getValues()[0];
    const qualifyHeaderMap = getHeaderMap(qualifyHeaders);
    
    Logger.log('GM - Qualify sheet headers found:');
    qualifyHeaders.forEach((header, index) => {
      Logger.log(`  ${String.fromCharCode(65 + index)}: "${header}"`);
    });
    
    Logger.log('\nChecking enrichment columns:');
    Logger.log(`- enrichmentMeta.status: ${qualifyHeaderMap['enrichmentMeta.status'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
    Logger.log(`- enrichmentMeta.notes: ${qualifyHeaderMap['enrichmentMeta.notes'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check for pending enrichment rows
    if (qualifyHeaderMap['enrichmentMeta.status'] !== undefined) {
      const statusCol = qualifyHeaderMap['enrichmentMeta.status'] + 1;
      const dataRows = qualifySheet.getRange(2, statusCol, qualifySheet.getLastRow() - 1, 1).getValues();
      let pendingCount = 0;
      dataRows.forEach((row, index) => {
        const status = String(row[0]).trim();
        if (status === '' || status.toLowerCase() === 'pending') {
          pendingCount++;
        }
      });
      Logger.log(`Pending enrichment rows: ${pendingCount}`);
    }
  }
  
  // Test 4: Check script properties
  Logger.log('\n--- TEST 4: SCRIPT PROPERTIES ---');
  const scriptProperties = PropertiesService.getScriptProperties();
  const rapidApiKey = scriptProperties.getProperty('RAPIDAPI_KEY');
  const slackWebhookUrl = scriptProperties.getProperty('SLACK_WEBHOOK_URL');
  
  Logger.log(`RAPIDAPI_KEY set: ${rapidApiKey ? 'YES' : 'NO'}`);
  Logger.log(`SLACK_WEBHOOK_URL set: ${slackWebhookUrl ? 'YES' : 'NO'}`);
  
  // Test 5: Test getHeaderMap function
  Logger.log('\n--- TEST 5: getHeaderMap FUNCTION ---');
  const testHeaders = ['Test', 'Header', 'Example'];
  const testHeaderMap = getHeaderMap(testHeaders);
  Logger.log(`getHeaderMap test result: ${JSON.stringify(testHeaderMap)}`);
  
  Logger.log('\n=== DIAGNOSTIC COMPLETE ===');
} 