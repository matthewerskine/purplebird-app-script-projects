/**
 * Test function to debug enrichment issues
 */
function testEnrichmentSetup() {
  Logger.log('=== TESTING ENRICHMENT SETUP ===');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  if (!sheet) {
    Logger.log('❌ Could not find "GM - Qualify" sheet.');
    return;
  }
  
  Logger.log('✅ Found GM - Qualify sheet');
  
  const allSheetData = sheet.getDataRange().getValues();
  Logger.log(`Sheet has ${allSheetData.length} rows and ${allSheetData[0].length} columns`);
  
  // Check if enrichment columns exist
  const headers = allSheetData[0];
  const headerMap = getHeaderMap(headers);
  
  Logger.log('Looking for enrichment columns:');
  Logger.log(`- enrichmentMeta.status: ${headerMap['enrichmentMeta.status'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
  Logger.log(`- enrichmentMeta.notes: ${headerMap['enrichmentMeta.notes'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
  
  if (headerMap['enrichmentMeta.status'] === undefined) {
    Logger.log('❌ enrichmentMeta.status column not found - this is why enrichment is failing');
  }
  
  if (headerMap['enrichmentMeta.notes'] === undefined) {
    Logger.log('❌ enrichmentMeta.notes column not found - this is why enrichment is failing');
  }
  
  Logger.log('=== END TEST ===');
}

/**
 * Test function to debug API queue issues
 */
function testApiQueueSetup() {
  Logger.log('=== TESTING API QUEUE SETUP ===');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('API');
  if (!sheet) {
    Logger.log('❌ Could not find "API" sheet.');
    return;
  }
  
  Logger.log('✅ Found API sheet');
  
  const allSheetData = sheet.getDataRange().getValues();
  Logger.log(`Sheet has ${allSheetData.length} rows and ${allSheetData[0].length} columns`);
  
  // Check if required columns exist
  const headers = allSheetData[0];
  const headerMap = getHeaderMap(headers);
  
  Logger.log('Looking for required API columns:');
  Logger.log(`- processed: ${headerMap['processed'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
  Logger.log(`- category: ${headerMap['category'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
  Logger.log(`- region: ${headerMap['region'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
  Logger.log(`- pageOffset: ${headerMap['pageOffset'] !== undefined ? 'FOUND' : 'NOT FOUND'}`);
  
  Logger.log('=== END TEST ===');
} 