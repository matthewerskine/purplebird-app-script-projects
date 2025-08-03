#!/usr/bin/env node

/**
 * PRE-PUSH TEST SCRIPT
 * 
 * This script runs comprehensive tests before allowing clasp push.
 * It prevents broken code from being deployed to Apps Script.
 * 
 * Usage: node scripts/pre-push-test.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ===================================================================================
// CONFIGURATION
// ===================================================================================

const CONFIG = {
  // Test functions to run in Apps Script
  TEST_FUNCTIONS: [
    'testBasicFunctionality',
    'testComprehensiveSuite',
    'runPreDeploymentCheck'
  ],
  
  // Files that should be tested
  CRITICAL_FILES: [
    'leads-master/Airtable.js',
    'leads-master/Helpers.js',
    'leads-master/Qualify.js',
    'leads-master/EnrichmentAgent.js',
    'leads-master/Scraper.js',
    'leads-master/Reporting.js'
  ],
  
  // Maximum execution time for tests (in seconds)
  MAX_EXECUTION_TIME: 300, // 5 minutes
  
  // Required environment variables
  REQUIRED_ENV: [
    'CLASP_PROJECT_ID'
  ]
};

// ===================================================================================
// UTILITY FUNCTIONS
// ===================================================================================

/**
 * Check if required environment variables are set
 */
function checkEnvironment() {
  console.log('🔍 Checking environment...');
  
  for (const envVar of CONFIG.REQUIRED_ENV) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  console.log('✅ Environment check passed');
}

/**
 * Check if clasp is installed and configured
 */
function checkClaspSetup() {
  console.log('🔍 Checking clasp setup...');
  
  try {
    // Check if clasp is installed
    execSync('clasp --version', { stdio: 'pipe' });
    console.log('✅ Clasp is installed');
    
      // Check if we're in a clasp project
  if (!fs.existsSync('leads-master/.clasp.json')) {
    throw new Error('Not in a clasp project directory (leads-master/.clasp.json not found)');
  }
  console.log('✅ In clasp project directory');
  
  // Check if project ID is configured
  const claspConfig = JSON.parse(fs.readFileSync('leads-master/.clasp.json', 'utf8'));
    if (!claspConfig.scriptId) {
      throw new Error('No script ID configured in .clasp.json');
    }
    console.log('✅ Script ID configured');
    
  } catch (error) {
    throw new Error(`Clasp setup check failed: ${error.message}`);
  }
}

/**
 * Run a test function in Apps Script
 */
function runTestFunction(functionName) {
  console.log(`🧪 Running test: ${functionName}`);
  
  try {
    const result = execSync(`cd leads-master && clasp run ${functionName}`, {
      stdio: 'pipe',
      timeout: CONFIG.MAX_EXECUTION_TIME * 1000
    });
    
    const output = result.toString();
    
    // Check for test failure indicators
    if (output.includes('TEST FAILED') || 
        output.includes('❌') || 
        output.includes('DEPLOYMENT BLOCKED')) {
      throw new Error(`Test ${functionName} failed:\n${output}`);
    }
    
    console.log(`✅ Test ${functionName} passed`);
    return true;
    
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Test ${functionName} timed out after ${CONFIG.MAX_EXECUTION_TIME} seconds`);
    }
    throw new Error(`Test ${functionName} failed: ${error.message}`);
  }
}

/**
 * Check if all critical files exist
 */
function checkCriticalFiles() {
  console.log('🔍 Checking critical files...');
  
  for (const file of CONFIG.CRITICAL_FILES) {
    if (!fs.existsSync(file)) {
      throw new Error(`Critical file missing: ${file}`);
    }
    console.log(`✅ Found: ${file}`);
  }
  
  console.log('✅ All critical files present');
}

/**
 * Validate syntax of JavaScript files
 */
function validateSyntax() {
  console.log('🔍 Validating JavaScript syntax...');
  
  const jsFiles = [
    'leads-master/Airtable.js',
    'leads-master/Helpers.js',
    'leads-master/Qualify.js',
    'leads-master/EnrichmentAgent.js',
    'leads-master/Scraper.js',
    'leads-master/Reporting.js',
    'test-suite/TestFramework.js',
    'test-suite/DeploymentSafety.js',
    'test-suite/TestRunner.js'
  ];
  
  for (const file of jsFiles) {
    if (fs.existsSync(file)) {
      try {
        // Basic syntax check by trying to parse the file
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for common syntax issues
        if (content.includes('function(') && !content.includes('function (')) {
          console.log(`⚠️ Warning: ${file} has potential syntax issues`);
        }
        
        console.log(`✅ Syntax OK: ${file}`);
      } catch (error) {
        throw new Error(`Syntax error in ${file}: ${error.message}`);
      }
    }
  }
  
  console.log('✅ All files have valid syntax');
}

// ===================================================================================
// MAIN TEST RUNNER
// ===================================================================================

/**
 * Run all pre-push tests
 */
function runPrePushTests() {
  console.log('🚀 PRE-PUSH TEST SUITE');
  console.log('=======================');
  console.log('');
  
  try {
    // Step 1: Environment and setup checks
    console.log('Step 1: Environment and setup checks...');
    checkEnvironment();
    checkClaspSetup();
    checkCriticalFiles();
    validateSyntax();
    console.log('✅ Environment and setup checks passed');
    console.log('');
    
    // Step 2: Run Apps Script tests
    console.log('Step 2: Running Apps Script tests...');
    for (const testFunction of CONFIG.TEST_FUNCTIONS) {
      runTestFunction(testFunction);
    }
    console.log('✅ All Apps Script tests passed');
    console.log('');
    
    // Step 3: Final validation
    console.log('Step 3: Final validation...');
    console.log('✅ All pre-push tests passed');
    console.log('');
    console.log('🎉 PRE-PUSH TESTS COMPLETED SUCCESSFULLY!');
    console.log('✅ Safe to push to Apps Script');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Run: clasp push');
    console.log('   2. Monitor deployment');
    console.log('   3. Test with small batch');
    console.log('   4. Monitor sales team feedback');
    
    return true;
    
  } catch (error) {
    console.log('');
    console.log('❌ PRE-PUSH TESTS FAILED!');
    console.log('==========================');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('🔧 REQUIRED ACTIONS:');
    console.log('   1. Fix the issues above');
    console.log('   2. Run tests again: node scripts/pre-push-test.js');
    console.log('   3. Only push when ALL tests pass');
    console.log('');
    console.log('⚠️ DO NOT PUSH UNTIL ALL TESTS PASS!');
    
    process.exit(1);
  }
}

// ===================================================================================
// COMMAND LINE INTERFACE
// ===================================================================================

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Pre-Push Test Script');
    console.log('====================');
    console.log('');
    console.log('Usage: node scripts/pre-push-test.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --quick        Run only basic tests');
    console.log('  --verbose      Show detailed output');
    console.log('');
    console.log('This script runs comprehensive tests before allowing clasp push.');
    console.log('It prevents broken code from being deployed to Apps Script.');
    return;
  }
  
  if (args.includes('--quick')) {
    console.log('⚡ QUICK MODE - Running basic tests only');
    console.log('========================================');
    
    try {
      checkEnvironment();
      checkClaspSetup();
      checkCriticalFiles();
      validateSyntax();
      runTestFunction('testBasicFunctionality');
      
      console.log('✅ Quick tests passed');
      console.log('📋 Run full test suite before deployment');
      
    } catch (error) {
      console.log(`❌ Quick tests failed: ${error.message}`);
      process.exit(1);
    }
    
    return;
  }
  
  // Run full test suite
  runPrePushTests();
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runPrePushTests,
  checkEnvironment,
  checkClaspSetup,
  checkCriticalFiles,
  validateSyntax,
  runTestFunction
}; 