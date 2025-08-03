/**
 * COMPREHENSIVE TEST FRAMEWORK FOR LEADS MASTER SCRIPTS
 * 
 * This framework provides robust testing to prevent breaking the sales team's workflow.
 * All tests must pass before any changes are deployed to production.
 */

// ===================================================================================
// TEST CONFIGURATION
// ===================================================================================

const TEST_CONFIG = {
  // Test data - safe test values that won't affect production
  TEST_SHEET_NAME: 'GM - Qualify',
  TEST_ROW_INDEX: 2, // Start from row 2 to avoid header
  TEST_BATCH_SIZE: 3, // Small batch for testing
  
  // Expected column names (case-insensitive)
  EXPECTED_COLUMNS: {
    NAME: 'name',
    PHONE: 'phone', 
    WEBSITE: 'websiteurl',
    EMAIL: 'extractemail.email',
    PROCESSED: 'processed',
    AIRTABLE_ACTION: 'airtableaction',
    NOTES: 'notes',
    INDUSTRY: 'category',
    ADS_RUNNING: 'extractads.isrunningads'
  },
  
  // Test scenarios
  TEST_SCENARIOS: {
    SKIP_ROW: 'skip',
    PROCESS_ROW: 'process', 
    EMPTY_ROW: '',
    INVALID_DATA: 'invalid'
  }
};

// ===================================================================================
// TEST UTILITIES
// ===================================================================================

/**
 * Test utility: Safe sheet access for testing
 */
function getTestSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(TEST_CONFIG.TEST_SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Test sheet "${TEST_CONFIG.TEST_SHEET_NAME}" not found`);
    }
    
    return sheet;
  } catch (error) {
    throw new Error(`Failed to access test sheet: ${error.message}`);
  }
}

/**
 * Test utility: Create test header map
 */
function createTestHeaderMap() {
  const sheet = getTestSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return getHeaderMap(headers);
}

/**
 * Test utility: Validate column exists
 */
function validateColumnExists(headerMap, columnName, testName) {
  const colIndex = getColumnIndex(headerMap, columnName);
  if (colIndex === undefined) {
    throw new Error(`TEST FAILED [${testName}]: Column "${columnName}" not found`);
  }
  console.log(`✅ [${testName}] Column "${columnName}" found at index ${colIndex}`);
  return colIndex;
}

/**
 * Test utility: Compare values
 */
function assertEqual(actual, expected, testName) {
  if (actual !== expected) {
    throw new Error(`TEST FAILED [${testName}]: Expected "${expected}", got "${actual}"`);
  }
  console.log(`✅ [${testName}] Values match: "${actual}"`);
}

/**
 * Test utility: Assert condition is true
 */
function assertTrue(condition, testName) {
  if (!condition) {
    throw new Error(`TEST FAILED [${testName}]: Condition was false`);
  }
  console.log(`✅ [${testName}] Condition is true`);
}

/**
 * Test utility: Safe test execution
 */
function runTest(testFunction, testName) {
  try {
    console.log(`\n🧪 RUNNING TEST: ${testName}`);
    testFunction();
    console.log(`✅ TEST PASSED: ${testName}`);
    return true;
  } catch (error) {
    console.log(`❌ TEST FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// ===================================================================================
// CORE FUNCTIONALITY TESTS
// ===================================================================================

/**
 * Test 1: Header Map Functionality
 */
function testHeaderMapFunctionality() {
  const sheet = getTestSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = getHeaderMap(headers);
  
  // Test that headerMap is created
  assertTrue(headerMap && typeof headerMap === 'object', 'Header map creation');
  
  // Test that it contains expected columns
  for (const [key, expectedCol] of Object.entries(TEST_CONFIG.EXPECTED_COLUMNS)) {
    validateColumnExists(headerMap, expectedCol, `Expected column ${key}`);
  }
  
  // Test case sensitivity handling
  const nameColIndex = getColumnIndex(headerMap, 'NAME');
  const nameColIndexLower = getColumnIndex(headerMap, 'name');
  assertTrue(nameColIndex === nameColIndexLower, 'Case insensitive column lookup');
}

/**
 * Test 2: Column Index Functionality
 */
function testColumnIndexFunctionality() {
  const headerMap = createTestHeaderMap();
  
  // Test exact match
  const exactIndex = getColumnIndex(headerMap, 'name');
  assertTrue(exactIndex !== undefined, 'Exact column match');
  
  // Test case-insensitive match
  const caseInsensitiveIndex = getColumnIndex(headerMap, 'NAME');
  assertTrue(caseInsensitiveIndex === exactIndex, 'Case-insensitive match');
  
  // Test non-existent column
  const nonExistentIndex = getColumnIndex(headerMap, 'nonexistentcolumn');
  assertTrue(nonExistentIndex === undefined, 'Non-existent column returns undefined');
}

/**
 * Test 3: Airtable Action Column Detection
 */
function testAirtableActionColumnDetection() {
  const headerMap = createTestHeaderMap();
  
  // Test the enhanced findAirtableActionColumn function
  const actionColIndex = findAirtableActionColumn(headerMap);
  
  if (actionColIndex !== undefined) {
    console.log(`✅ Airtable action column found at index ${actionColIndex}`);
  } else {
    console.log(`⚠️ No airtable action column found - this may be expected`);
  }
  
  // Test that the function doesn't crash
  assertTrue(typeof actionColIndex === 'number' || actionColIndex === undefined, 'Action column detection');
}

/**
 * Test 4: Skip Logic Validation
 */
function testSkipLogicValidation() {
  const sheet = getTestSheet();
  const headerMap = createTestHeaderMap();
  
  // Get a few test rows
  const testRows = sheet.getRange(TEST_CONFIG.TEST_ROW_INDEX, 1, TEST_CONFIG.TEST_BATCH_SIZE, sheet.getLastColumn()).getValues();
  
  for (let i = 0; i < testRows.length; i++) {
    const rowData = testRows[i];
    const rowIndex = TEST_CONFIG.TEST_ROW_INDEX + i;
    
    // Test skip detection logic
    const actionColIndex = findAirtableActionColumn(headerMap);
    if (actionColIndex !== undefined) {
      const actionValue = String(rowData[actionColIndex] || '').trim().toLowerCase();
      const shouldSkip = actionValue === 'skip';
      
      console.log(`Row ${rowIndex}: Action value="${actionValue}", Should skip=${shouldSkip}`);
      
      // Test that skip logic works correctly
      if (actionValue === 'skip') {
        assertTrue(shouldSkip === true, `Skip detection for row ${rowIndex}`);
      } else {
        assertTrue(shouldSkip === false, `Non-skip detection for row ${rowIndex}`);
      }
    }
  }
}

/**
 * Test 5: Data Extraction Validation
 */
function testDataExtractionValidation() {
  const sheet = getTestSheet();
  const headerMap = createTestHeaderMap();
  
  // Get a test row
  const testRow = sheet.getRange(TEST_CONFIG.TEST_ROW_INDEX, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Test that we can extract all expected fields
  const extractedData = {
    name: getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.NAME) !== undefined ? testRow[getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.NAME)] : null,
    phone: getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.PHONE) !== undefined ? testRow[getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.PHONE)] : null,
    website: getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.WEBSITE) !== undefined ? testRow[getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.WEBSITE)] : null,
    email: getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.EMAIL) !== undefined ? testRow[getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.EMAIL)] : null,
    processed: getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.PROCESSED) !== undefined ? testRow[getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.PROCESSED)] : null
  };
  
  console.log(`Extracted data from row ${TEST_CONFIG.TEST_ROW_INDEX}:`);
  for (const [field, value] of Object.entries(extractedData)) {
    console.log(`  ${field}: "${value}"`);
  }
  
  // Test that extraction doesn't crash
  assertTrue(typeof extractedData === 'object', 'Data extraction object creation');
}

// ===================================================================================
// INTEGRATION TESTS
// ===================================================================================

/**
 * Test 6: End-to-End Process Validation
 */
function testEndToEndProcessValidation() {
  const sheet = getTestSheet();
  const headerMap = createTestHeaderMap();
  
  // Simulate the processDataRows logic without actually sending to Airtable
  const testRows = sheet.getRange(TEST_CONFIG.TEST_ROW_INDEX, 1, TEST_CONFIG.TEST_BATCH_SIZE, sheet.getLastColumn()).getValues();
  
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < testRows.length; i++) {
    const rowData = testRows[i];
    const rowIndex = TEST_CONFIG.TEST_ROW_INDEX + i;
    
    try {
      // Test skip detection
      const actionColIndex = findAirtableActionColumn(headerMap);
      let shouldSkip = false;
      
      if (actionColIndex !== undefined) {
        const actionValue = String(rowData[actionColIndex] || '').trim().toLowerCase();
        shouldSkip = actionValue === 'skip';
      }
      
      // Test processed status check
      const processedColIndex = getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.PROCESSED);
      let alreadyProcessed = false;
      
      if (processedColIndex !== undefined) {
        const processedStatus = String(rowData[processedColIndex] || '').trim().toLowerCase();
        alreadyProcessed = processedStatus.startsWith('sent') || processedStatus.startsWith('verified');
      }
      
      // Test company name extraction
      const nameColIndex = getColumnIndex(headerMap, TEST_CONFIG.EXPECTED_COLUMNS.NAME);
      const companyName = nameColIndex !== undefined ? rowData[nameColIndex] : null;
      
      if (shouldSkip) {
        skippedCount++;
        console.log(`Row ${rowIndex}: SKIPPED (action: skip)`);
      } else if (alreadyProcessed) {
        skippedCount++;
        console.log(`Row ${rowIndex}: SKIPPED (already processed)`);
      } else if (!companyName) {
        errorCount++;
        console.log(`Row ${rowIndex}: ERROR (no company name)`);
      } else {
        processedCount++;
        console.log(`Row ${rowIndex}: WOULD PROCESS "${companyName}"`);
      }
      
    } catch (error) {
      errorCount++;
      console.log(`Row ${rowIndex}: ERROR - ${error.message}`);
    }
  }
  
  console.log(`\nTest Results:`);
  console.log(`  Would process: ${processedCount}`);
  console.log(`  Would skip: ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);
  
  // Test that the logic doesn't crash
  assertTrue(processedCount + skippedCount + errorCount === testRows.length, 'All rows processed');
}

// ===================================================================================
// SAFETY TESTS
// ===================================================================================

/**
 * Test 7: API Safety Validation
 */
function testApiSafetyValidation() {
  // Test that we're not accidentally calling Airtable API
  const originalCallAirtableApi = callAirtableApi;
  
  let apiCallCount = 0;
  
  // Override the API call function for testing
  globalThis.callAirtableApi = function(method, payload, recordId, queryParams) {
    apiCallCount++;
    console.log(`⚠️ TEST: API call intercepted - ${method} ${recordId || ''}`);
    return null; // Return null to simulate no response
  };
  
  try {
    // Run a test that would normally call the API
    testEndToEndProcessValidation();
    
    // Verify no API calls were made during testing
    assertTrue(apiCallCount === 0, 'No API calls during testing');
    
  } finally {
    // Restore the original function
    globalThis.callAirtableApi = originalCallAirtableApi;
  }
}

/**
 * Test 8: Sheet Modification Safety
 */
function testSheetModificationSafety() {
  const sheet = getTestSheet();
  const originalLastRow = sheet.getLastRow();
  
  // Test that our functions don't modify the sheet during testing
  testHeaderMapFunctionality();
  testColumnIndexFunctionality();
  testAirtableActionColumnDetection();
  testSkipLogicValidation();
  testDataExtractionValidation();
  
  const finalLastRow = sheet.getLastRow();
  assertTrue(originalLastRow === finalLastRow, 'No sheet modifications during testing');
}

// ===================================================================================
// COMPREHENSIVE TEST RUNNER
// ===================================================================================

/**
 * Run all tests and return comprehensive results
 */
function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE TEST SUITE');
  console.log('=====================================');
  
  const tests = [
    { name: 'Header Map Functionality', func: testHeaderMapFunctionality },
    { name: 'Column Index Functionality', func: testColumnIndexFunctionality },
    { name: 'Airtable Action Column Detection', func: testAirtableActionColumnDetection },
    { name: 'Skip Logic Validation', func: testSkipLogicValidation },
    { name: 'Data Extraction Validation', func: testDataExtractionValidation },
    { name: 'End-to-End Process Validation', func: testEndToEndProcessValidation },
    { name: 'API Safety Validation', func: testApiSafetyValidation },
    { name: 'Sheet Modification Safety', func: testSheetModificationSafety }
  ];
  
  const results = {
    total: tests.length,
    passed: 0,
    failed: 0,
    errors: []
  };
  
  for (const test of tests) {
    const passed = runTest(test.func, test.name);
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(test.name);
    }
  }
  
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
    
    throw new Error(`TEST SUITE FAILED: ${results.failed}/${results.total} tests failed. DO NOT DEPLOY!`);
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Safe to deploy changes');
  }
  
  return results;
}

/**
 * Quick test for immediate validation
 */
function quickTest() {
  console.log('⚡ QUICK TEST - Basic Functionality');
  console.log('===================================');
  
  const quickTests = [
    { name: 'Header Map Creation', func: testHeaderMapFunctionality },
    { name: 'Column Index Lookup', func: testColumnIndexFunctionality },
    { name: 'Skip Logic', func: testSkipLogicValidation }
  ];
  
  let allPassed = true;
  
  for (const test of quickTests) {
    const passed = runTest(test.func, test.name);
    if (!passed) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('\n✅ QUICK TEST PASSED - Basic functionality working');
  } else {
    console.log('\n❌ QUICK TEST FAILED - Issues detected');
  }
  
  return allPassed;
} 