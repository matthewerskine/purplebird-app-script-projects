/**
 * TEST COVERAGE ANALYSIS
 * 
 * This analyzes all files and functions to ensure comprehensive test coverage.
 * It identifies which functions are tested and which need testing.
 */

// ===================================================================================
// FILE ANALYSIS
// ===================================================================================

const FILE_ANALYSIS = {
  // Core functionality files (CRITICAL - must be tested)
  CRITICAL_FILES: {
    'Airtable.js': {
      description: 'Main Airtable integration and lead processing',
      functions: [
        'sendSelectedLeadsToAirtable',
        'processDataRows', 
        'findAirtableActionColumn',
        'getColumnIndex',
        'identifyBadRecords',
        'deleteBadRecords',
        'updatePipelineLeadsSource',
        'callAirtableApi'
      ],
      testStatus: 'PARTIALLY_TESTED',
      testFunctions: [
        'testHeaderMapFunctionality',
        'testColumnIndexFunctionality', 
        'testAirtableActionColumnDetection',
        'testSkipLogicValidation',
        'testDataExtractionValidation',
        'testEndToEndProcessValidation'
      ],
      missingTests: [
        'testAirtableApiCalls',
        'testBadRecordsIdentification',
        'testBadRecordsDeletion',
        'testPipelineLeadsUpdate'
      ]
    },
    
    'Helpers.js': {
      description: 'Utility functions and header mapping',
      functions: [
        'getHeaderMap',
        'getArchivedCompanyNamesSet',
        'getExistingCompanyNames',
        'getPreviousRawNamesSet',
        'createNormalizedSearchFormula',
        'callAirtableApi'
      ],
      testStatus: 'TESTED',
      testFunctions: [
        'testHeaderMapFunctionality',
        'testColumnIndexFunctionality'
      ],
      missingTests: [
        'testArchivedCompanyNames',
        'testExistingCompanyNames',
        'testNormalizedSearchFormula'
      ]
    },
    
    'Qualify.js': {
      description: 'Lead qualification and deduplication',
      functions: [
        'sendToQualifySheet',
        'openCleanerSidebar',
        'findMatchingLeads',
        'deleteMatchingLeads'
      ],
      testStatus: 'NOT_TESTED',
      testFunctions: [],
      missingTests: [
        'testQualifySheetTransfer',
        'testDeduplicationLogic',
        'testMatchingLeads',
        'testLeadDeletion'
      ]
    },
    
    'EnrichmentAgent.js': {
      description: 'Lead enrichment and data extraction',
      functions: [
        'processPendingRowsBatch',
        'resetEnrichmentStatus',
        'verifyCompanyStatusFree_bg',
        'verifyAttribution_bg',
        'extractEmail_bg',
        'extractAdPresence_bg',
        'callOpenRouter',
        'setupSheetProcessing'
      ],
      testStatus: 'NOT_TESTED',
      testFunctions: [],
      missingTests: [
        'testEnrichmentProcessing',
        'testCompanyStatusVerification',
        'testEmailExtraction',
        'testAdPresenceDetection',
        'testOpenRouterIntegration'
      ]
    },
    
    'Scraper.js': {
      description: 'Google Maps scraping and data collection',
      functions: [
        'processApiQueue',
        'findNextRowToProcess',
        'callRapidApi',
        'appendDataToRawSheet',
        'sendSlackNotification'
      ],
      testStatus: 'NOT_TESTED',
      testFunctions: [],
      missingTests: [
        'testApiQueueProcessing',
        'testRowProcessing',
        'testRapidApiCalls',
        'testDataAppending',
        'testSlackNotifications'
      ]
    },
    
    'Reporting.js': {
      description: 'Reporting and analytics functions',
      functions: [
        'generateQualifyReport',
        'generateSelectionReport'
      ],
      testStatus: 'NOT_TESTED',
      testFunctions: [],
      missingTests: [
        'testQualifyReportGeneration',
        'testSelectionReportGeneration'
      ]
    },
    
    'Archiver.js': {
      description: 'Lead archiving and cleanup',
      functions: [
        'archiveQualifiedLeads',
        'cleanupArchivedLeads'
      ],
      testStatus: 'NOT_TESTED',
      testFunctions: [],
      missingTests: [
        'testLeadArchiving',
        'testArchivedLeadsCleanup'
      ]
    },
    
    'API.js': {
      description: 'API integration and external services',
      functions: [
        'callExternalAPI',
        'handleApiResponse'
      ],
      testStatus: 'NOT_TESTED',
      testFunctions: [],
      missingTests: [
        'testExternalApiCalls',
        'testApiResponseHandling'
      ]
    }
  },
  
  // Debug tools (OPTIONAL - not critical for production)
  DEBUG_FILES: {
    'debug-tools/debug-menu-item.js': {
      description: 'Debug menu functionality',
      testStatus: 'NOT_TESTED',
      priority: 'LOW'
    },
    'debug-tools/quick-debug.js': {
      description: 'Quick debugging utilities',
      testStatus: 'NOT_TESTED', 
      priority: 'LOW'
    },
    'debug-tools/identify-bad-records.js': {
      description: 'Bad records identification',
      testStatus: 'NOT_TESTED',
      priority: 'MEDIUM'
    },
    'debug-tools/delete-bad-records.js': {
      description: 'Bad records deletion',
      testStatus: 'NOT_TESTED',
      priority: 'MEDIUM'
    }
  },
  
  // Test suite files (ALREADY TESTED)
  TEST_FILES: {
    'test-suite/TestFramework.js': {
      description: 'Core testing framework',
      testStatus: 'SELF_TESTED',
      priority: 'HIGH'
    },
    'test-suite/DeploymentSafety.js': {
      description: 'Deployment safety checks',
      testStatus: 'SELF_TESTED',
      priority: 'HIGH'
    },
    'test-suite/TestRunner.js': {
      description: 'Test runner utilities',
      testStatus: 'SELF_TESTED',
      priority: 'HIGH'
    }
  }
};

// ===================================================================================
// COVERAGE ANALYSIS FUNCTIONS
// ===================================================================================

/**
 * Analyze test coverage across all files
 */
function analyzeTestCoverage() {
  console.log('📊 TEST COVERAGE ANALYSIS');
  console.log('==========================');
  console.log('');
  
  let totalFunctions = 0;
  let testedFunctions = 0;
  let criticalFiles = 0;
  let testedCriticalFiles = 0;
  
  // Analyze critical files
  console.log('🔍 CRITICAL FILES ANALYSIS:');
  console.log('============================');
  
  for (const [fileName, fileInfo] of Object.entries(FILE_ANALYSIS.CRITICAL_FILES)) {
    const functionCount = fileInfo.functions.length;
    const testCount = fileInfo.testFunctions.length;
    const missingCount = fileInfo.missingTests.length;
    
    totalFunctions += functionCount;
    testedFunctions += testCount;
    criticalFiles++;
    
    if (fileInfo.testStatus === 'TESTED' || fileInfo.testStatus === 'PARTIALLY_TESTED') {
      testedCriticalFiles++;
    }
    
    console.log(`\n📁 ${fileName}:`);
    console.log(`   Description: ${fileInfo.description}`);
    console.log(`   Functions: ${functionCount}`);
    console.log(`   Tests: ${testCount}`);
    console.log(`   Missing: ${missingCount}`);
    console.log(`   Status: ${fileInfo.testStatus}`);
    
    if (missingCount > 0) {
      console.log(`   ⚠️ Missing tests:`);
      fileInfo.missingTests.forEach(test => {
        console.log(`      - ${test}`);
      });
    }
  }
  
  // Calculate coverage percentages
  const functionCoverage = (testedFunctions / totalFunctions) * 100;
  const fileCoverage = (testedCriticalFiles / criticalFiles) * 100;
  
  console.log('\n📈 COVERAGE SUMMARY:');
  console.log('====================');
  console.log(`Critical Files: ${criticalFiles}/${criticalFiles} (${fileCoverage.toFixed(1)}%)`);
  console.log(`Functions: ${testedFunctions}/${totalFunctions} (${functionCoverage.toFixed(1)}%)`);
  
  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('===================');
  
  if (functionCoverage < 80) {
    console.log('❌ COVERAGE TOO LOW - Need more tests!');
    console.log('Priority files to test:');
    
    const priorityFiles = Object.entries(FILE_ANALYSIS.CRITICAL_FILES)
      .filter(([_, info]) => info.testStatus === 'NOT_TESTED')
      .sort((a, b) => b[1].missingTests.length - a[1].missingTests.length);
    
    priorityFiles.forEach(([fileName, fileInfo]) => {
      console.log(`   - ${fileName}: ${fileInfo.missingTests.length} missing tests`);
    });
  } else if (functionCoverage < 95) {
    console.log('⚠️ COVERAGE GOOD - Some tests missing');
    console.log('Consider adding tests for:');
    
    Object.entries(FILE_ANALYSIS.CRITICAL_FILES)
      .filter(([_, info]) => info.missingTests.length > 0)
      .forEach(([fileName, fileInfo]) => {
        console.log(`   - ${fileName}: ${fileInfo.missingTests.join(', ')}`);
      });
  } else {
    console.log('✅ EXCELLENT COVERAGE!');
    console.log('All critical functions are tested');
  }
  
  return {
    functionCoverage,
    fileCoverage,
    totalFunctions,
    testedFunctions,
    criticalFiles,
    testedCriticalFiles
  };
}

/**
 * Generate missing test functions
 */
function generateMissingTests() {
  console.log('\n🔧 GENERATING MISSING TESTS:');
  console.log('=============================');
  
  for (const [fileName, fileInfo] of Object.entries(FILE_ANALYSIS.CRITICAL_FILES)) {
    if (fileInfo.missingTests.length > 0) {
      console.log(`\n📁 ${fileName}:`);
      
      fileInfo.missingTests.forEach(testName => {
        console.log(`\nfunction ${testName}() {`);
        console.log(`  console.log('🧪 Testing: ${testName}');`);
        console.log(`  `);
        console.log(`  try {`);
        console.log(`    // TODO: Implement test for ${testName}`);
        console.log(`    // This should test the ${fileInfo.description} functionality`);
        console.log(`    `);
        console.log(`    // Test setup`);
        console.log(`    const sheet = getTestSheet();`);
        console.log(`    const headerMap = createTestHeaderMap();`);
        console.log(`    `);
        console.log(`    // Test execution`);
        console.log(`    // TODO: Add actual test logic here`);
        console.log(`    `);
        console.log(`    // Assertions`);
        console.log(`    assertTrue(true, '${testName} test passed');`);
        console.log(`    `);
        console.log(`    console.log('✅ ${testName} test passed');`);
        console.log(`    return true;`);
        console.log(`    `);
        console.log(`  } catch (error) {`);
        console.log(`    console.log(\`❌ ${testName} test failed: \${error.message}\`);`);
        console.log(`    return false;`);
        console.log(`  }`);
        console.log(`}`);
      });
    }
  }
}

/**
 * Check if all critical functions are covered
 */
function checkCriticalFunctionCoverage() {
  console.log('\n🛡️ CRITICAL FUNCTION COVERAGE CHECK:');
  console.log('=====================================');
  
  const criticalFunctions = [
    // Airtable.js - Core lead processing
    'sendSelectedLeadsToAirtable',
    'processDataRows',
    'findAirtableActionColumn',
    'getColumnIndex',
    'callAirtableApi',
    
    // Helpers.js - Core utilities
    'getHeaderMap',
    'getExistingCompanyNames',
    
    // Qualify.js - Lead qualification
    'sendToQualifySheet',
    
    // EnrichmentAgent.js - Data enrichment
    'processPendingRowsBatch',
    'extractEmail_bg',
    'extractAdPresence_bg',
    
    // Scraper.js - Data collection
    'processApiQueue',
    'findNextRowToProcess',
    
    // Reporting.js - Analytics
    'generateQualifyReport',
    
    // Archiver.js - Data management
    'archiveQualifiedLeads'
  ];
  
  const testedFunctions = [
    // Currently tested functions
    'getHeaderMap',
    'getColumnIndex', 
    'findAirtableActionColumn',
    'processDataRows'
  ];
  
  const missingFunctions = criticalFunctions.filter(func => !testedFunctions.includes(func));
  
  console.log(`Total critical functions: ${criticalFunctions.length}`);
  console.log(`Tested functions: ${testedFunctions.length}`);
  console.log(`Missing tests: ${missingFunctions.length}`);
  
  if (missingFunctions.length > 0) {
    console.log('\n❌ MISSING CRITICAL FUNCTION TESTS:');
    missingFunctions.forEach(func => {
      console.log(`   - ${func}`);
    });
    
    console.log('\n🔧 PRIORITY ACTIONS:');
    console.log('   1. Add tests for missing critical functions');
    console.log('   2. Focus on Airtable.js and EnrichmentAgent.js first');
    console.log('   3. Ensure all API calls are properly mocked');
    console.log('   4. Test error handling scenarios');
    
    return false;
  } else {
    console.log('\n✅ ALL CRITICAL FUNCTIONS ARE TESTED!');
    return true;
  }
}

/**
 * Generate comprehensive test plan
 */
function generateTestPlan() {
  console.log('\n📋 COMPREHENSIVE TEST PLAN:');
  console.log('============================');
  
  const testPlan = {
    'Phase 1 - Core Functions (HIGH PRIORITY)': [
      'testAirtableApiCalls',
      'testBadRecordsIdentification', 
      'testBadRecordsDeletion',
      'testPipelineLeadsUpdate'
    ],
    
    'Phase 2 - Data Processing (HIGH PRIORITY)': [
      'testQualifySheetTransfer',
      'testDeduplicationLogic',
      'testEnrichmentProcessing',
      'testEmailExtraction'
    ],
    
    'Phase 3 - External Integrations (MEDIUM PRIORITY)': [
      'testRapidApiCalls',
      'testOpenRouterIntegration',
      'testSlackNotifications',
      'testExternalApiCalls'
    ],
    
    'Phase 4 - Reporting & Analytics (MEDIUM PRIORITY)': [
      'testQualifyReportGeneration',
      'testSelectionReportGeneration',
      'testLeadArchiving'
    ],
    
    'Phase 5 - Error Handling (LOW PRIORITY)': [
      'testApiErrorHandling',
      'testTimeoutHandling',
      'testRateLimitHandling'
    ]
  };
  
  for (const [phase, tests] of Object.entries(testPlan)) {
    console.log(`\n${phase}:`);
    tests.forEach(test => {
      console.log(`   - ${test}`);
    });
  }
  
  console.log('\n📊 IMPLEMENTATION PRIORITY:');
  console.log('   1. Phase 1: Core Airtable functions (CRITICAL)');
  console.log('   2. Phase 2: Data processing (HIGH)');
  console.log('   3. Phase 3: External integrations (MEDIUM)');
  console.log('   4. Phase 4: Reporting (MEDIUM)');
  console.log('   5. Phase 5: Error handling (LOW)');
}

// ===================================================================================
// MAIN ANALYSIS FUNCTIONS
// ===================================================================================

/**
 * Run complete coverage analysis
 */
function runCoverageAnalysis() {
  console.log('🔍 RUNNING COMPLETE COVERAGE ANALYSIS');
  console.log('=====================================');
  
  const coverage = analyzeTestCoverage();
  const criticalCovered = checkCriticalFunctionCoverage();
  
  console.log('\n📊 FINAL ASSESSMENT:');
  console.log('====================');
  
  if (coverage.functionCoverage >= 80 && criticalCovered) {
    console.log('✅ COVERAGE EXCELLENT - Safe to deploy');
    console.log('All critical functions are tested');
  } else if (coverage.functionCoverage >= 60) {
    console.log('⚠️ COVERAGE ADEQUATE - Consider adding more tests');
    console.log('Core functions are tested, but some edge cases missing');
  } else {
    console.log('❌ COVERAGE INSUFFICIENT - Do not deploy');
    console.log('Critical functions are missing tests');
  }
  
  generateTestPlan();
  generateMissingTests();
  
  return {
    coverage,
    criticalCovered,
    canDeploy: coverage.functionCoverage >= 60 && criticalCovered
  };
}

/**
 * Quick coverage check
 */
function quickCoverageCheck() {
  console.log('⚡ QUICK COVERAGE CHECK');
  console.log('=======================');
  
  const criticalFunctions = [
    'getHeaderMap',
    'getColumnIndex',
    'findAirtableActionColumn', 
    'processDataRows',
    'sendSelectedLeadsToAirtable'
  ];
  
  const testedFunctions = [
    'getHeaderMap',
    'getColumnIndex',
    'findAirtableActionColumn'
  ];
  
  const missing = criticalFunctions.filter(f => !testedFunctions.includes(f));
  
  console.log(`Critical functions: ${criticalFunctions.length}`);
  console.log(`Tested functions: ${testedFunctions.length}`);
  console.log(`Missing: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\n❌ MISSING CRITICAL TESTS:');
    missing.forEach(f => console.log(`   - ${f}`));
    return false;
  } else {
    console.log('\n✅ ALL CRITICAL FUNCTIONS TESTED');
    return true;
  }
} 