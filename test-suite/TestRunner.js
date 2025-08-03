/**
 * TEST RUNNER - EASY ACCESS TO ALL TESTING FUNCTIONS
 * 
 * Use these functions to test your changes before deployment.
 */

/**
 * 🧪 RUN THIS FIRST - Quick test to validate basic functionality
 */
function testBasicFunctionality() {
  console.log('🧪 TESTING BASIC FUNCTIONALITY');
  console.log('===============================');
  
  try {
    // Test 1: Header map creation
    console.log('\n1. Testing header map creation...');
    const headerMap = createTestHeaderMap();
    assertTrue(headerMap && typeof headerMap === 'object', 'Header map creation');
    console.log('✅ Header map created successfully');
    
    // Test 2: Column index lookup
    console.log('\n2. Testing column index lookup...');
    const nameIndex = getColumnIndex(headerMap, 'name');
    assertTrue(nameIndex !== undefined, 'Name column lookup');
    console.log('✅ Column index lookup working');
    
    // Test 3: Skip logic
    console.log('\n3. Testing skip logic...');
    const actionCol = findAirtableActionColumn(headerMap);
    console.log(`✅ Skip logic test completed (action column: ${actionCol !== undefined ? 'found' : 'not found'})`);
    
    console.log('\n🎉 BASIC FUNCTIONALITY TEST PASSED!');
    console.log('✅ Core functions are working correctly');
    return true;
    
  } catch (error) {
    console.log(`\n❌ BASIC FUNCTIONALITY TEST FAILED!`);
    console.log(`Error: ${error.message}`);
    console.log('\n🔧 REQUIRED ACTIONS:');
    console.log('   1. Check the error above');
    console.log('   2. Fix the issue');
    console.log('   3. Run this test again');
    console.log('   4. DO NOT DEPLOY until this passes!');
    return false;
  }
}

/**
 * 🔍 RUN THIS SECOND - Comprehensive test suite
 */
function testComprehensiveSuite() {
  console.log('🔍 RUNNING COMPREHENSIVE TEST SUITE');
  console.log('====================================');
  
  try {
    const results = runAllTests();
    
    if (results.failed > 0) {
      throw new Error(`${results.failed} tests failed`);
    }
    
    console.log('\n🎉 COMPREHENSIVE TEST SUITE PASSED!');
    console.log('✅ All functionality validated');
    console.log('✅ Safe to proceed with deployment');
    return true;
    
  } catch (error) {
    console.log(`\n❌ COMPREHENSIVE TEST SUITE FAILED!`);
    console.log(`Error: ${error.message}`);
    console.log('\n🔧 REQUIRED ACTIONS:');
    console.log('   1. Review the failed tests above');
    console.log('   2. Fix the issues');
    console.log('   3. Run testComprehensiveSuite() again');
    console.log('   4. DO NOT DEPLOY until all tests pass!');
    return false;
  }
}

/**
 * 🛡️ RUN THIS BEFORE DEPLOYMENT - Complete safety check
 */
function runPreDeploymentCheck() {
  console.log('🛡️ PRE-DEPLOYMENT SAFETY CHECK');
  console.log('===============================');
  
  // Step 1: Basic functionality
  console.log('\nStep 1: Testing basic functionality...');
  const basicPassed = testBasicFunctionality();
  
  if (!basicPassed) {
    console.log('\n❌ DEPLOYMENT BLOCKED: Basic functionality failed');
    return false;
  }
  
  // Step 2: Comprehensive tests
  console.log('\nStep 2: Running comprehensive tests...');
  const comprehensivePassed = testComprehensiveSuite();
  
  if (!comprehensivePassed) {
    console.log('\n❌ DEPLOYMENT BLOCKED: Comprehensive tests failed');
    return false;
  }
  
  // Step 3: Production readiness
  console.log('\nStep 3: Checking production readiness...');
  const productionReady = checkProductionReadiness();
  
  if (!productionReady) {
    console.log('\n❌ DEPLOYMENT BLOCKED: Production readiness check failed');
    return false;
  }
  
  console.log('\n🎉 ALL PRE-DEPLOYMENT CHECKS PASSED!');
  console.log('✅ Safe to deploy changes');
  console.log('');
  console.log('📋 Deployment checklist:');
  console.log('   ✅ Basic functionality validated');
  console.log('   ✅ Comprehensive tests passed');
  console.log('   ✅ Production readiness confirmed');
  console.log('');
  console.log('🚀 You can now safely deploy your changes!');
  
  return true;
}

/**
 * 📊 RUN THIS AFTER DEPLOYMENT - Monitor system health
 */
function monitorDeploymentHealth() {
  console.log('📊 MONITORING DEPLOYMENT HEALTH');
  console.log('===============================');
  
  const healthChecks = [
    { name: 'Sheet Access', func: () => {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
      return sheet !== null;
    }},
    { name: 'Header Map', func: () => {
      try {
        const headerMap = createTestHeaderMap();
        return headerMap && Object.keys(headerMap).length > 0;
      } catch (error) {
        return false;
      }
    }},
    { name: 'Column Index', func: () => {
      try {
        const headerMap = createTestHeaderMap();
        const nameIndex = getColumnIndex(headerMap, 'name');
        return nameIndex !== undefined;
      } catch (error) {
        return false;
      }
    }},
    { name: 'Skip Logic', func: () => {
      try {
        const headerMap = createTestHeaderMap();
        const actionCol = findAirtableActionColumn(headerMap);
        return true; // Just check it doesn't crash
      } catch (error) {
        return false;
      }
    }},
    { name: 'Data Extraction', func: () => {
      try {
        const headerMap = createTestHeaderMap();
        const sheet = getTestSheet();
        const testRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
        const nameIndex = getColumnIndex(headerMap, 'name');
        return nameIndex !== undefined && testRow[nameIndex] !== undefined;
      } catch (error) {
        return false;
      }
    }}
  ];
  
  let allHealthy = true;
  const results = [];
  
  for (const check of healthChecks) {
    try {
      const healthy = check.func();
      results.push({ name: check.name, healthy });
      
      if (healthy) {
        console.log(`✅ ${check.name}: Healthy`);
      } else {
        console.log(`❌ ${check.name}: Unhealthy`);
        allHealthy = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Error - ${error.message}`);
      results.push({ name: check.name, healthy: false });
      allHealthy = false;
    }
  }
  
  console.log('\n📊 HEALTH SUMMARY:');
  const healthyCount = results.filter(r => r.healthy).length;
  const totalCount = results.length;
  
  console.log(`Healthy: ${healthyCount}/${totalCount}`);
  
  if (allHealthy) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL');
    console.log('✅ Deployment appears successful');
  } else {
    console.log('⚠️ ISSUES DETECTED');
    console.log('🔧 Run runPreDeploymentCheck() to diagnose issues');
  }
  
  return allHealthy;
}

/**
 * 🚨 EMERGENCY FUNCTION - Use if deployment causes issues
 */
function emergencyDisable() {
  console.log('🚨 EMERGENCY DISABLE');
  console.log('===================');
  console.log('');
  console.log('⚠️ WARNING: This will disable critical functions');
  console.log('Only use if deployment has caused issues!');
  console.log('');
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Emergency Disable',
    'This will disable critical functions to prevent further issues. Only proceed if deployment has caused problems. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    console.log('🔄 Disabling critical functions...');
    
    // Disable critical functions
    globalThis.processDataRows = function() {
      throw new Error('CRITICAL FUNCTION DISABLED - Emergency disable active');
    };
    
    globalThis.sendSelectedLeadsToAirtable = function() {
      throw new Error('CRITICAL FUNCTION DISABLED - Emergency disable active');
    };
    
    globalThis.identifyBadRecords = function() {
      throw new Error('CRITICAL FUNCTION DISABLED - Emergency disable active');
    };
    
    globalThis.deleteBadRecords = function() {
      throw new Error('CRITICAL FUNCTION DISABLED - Emergency disable active');
    };
    
    console.log('✅ Critical functions disabled');
    console.log('🚨 Contact the development team immediately');
    console.log('📧 Provide the error details to the team');
    
    return true;
  } else {
    console.log('❌ Emergency disable cancelled');
    return false;
  }
}

/**
 * 📋 DEPLOYMENT CHECKLIST - Print deployment checklist
 */
function printDeploymentChecklist() {
  console.log('📋 DEPLOYMENT CHECKLIST');
  console.log('=======================');
  console.log('');
  console.log('BEFORE DEPLOYMENT:');
  console.log('  ✅ Run testBasicFunctionality()');
  console.log('  ✅ Run testComprehensiveSuite()');
  console.log('  ✅ Run runPreDeploymentCheck()');
  console.log('  ✅ All tests must pass');
  console.log('  ✅ Have rollback plan ready');
  console.log('');
  console.log('DURING DEPLOYMENT:');
  console.log('  ✅ Deploy changes');
  console.log('  ✅ Test with small batch first');
  console.log('  ✅ Monitor for errors');
  console.log('');
  console.log('AFTER DEPLOYMENT:');
  console.log('  ✅ Run monitorDeploymentHealth()');
  console.log('  ✅ Monitor sales team feedback');
  console.log('  ✅ Watch for any issues');
  console.log('  ✅ Be ready to rollback if needed');
  console.log('');
  console.log('EMERGENCY PROCEDURES:');
  console.log('  🚨 If issues occur, run emergencyDisable()');
  console.log('  🚨 Contact development team immediately');
  console.log('  🚨 Provide error details and context');
  console.log('');
  console.log('⚠️ NEVER DEPLOY WITHOUT RUNNING TESTS FIRST!');
}

/**
 * 🎯 QUICK START - Run this to get started with testing
 */
function quickStart() {
  console.log('🎯 QUICK START - TESTING FRAMEWORK');
  console.log('===================================');
  console.log('');
  console.log('This will guide you through the testing process:');
  console.log('');
  
  // Step 1: Basic test
  console.log('Step 1: Running basic functionality test...');
  const basicPassed = testBasicFunctionality();
  
  if (!basicPassed) {
    console.log('\n❌ Basic test failed - fix issues before proceeding');
    return false;
  }
  
  console.log('\n✅ Basic test passed!');
  
  // Step 2: Ask if user wants comprehensive test
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Quick Start',
    'Basic test passed! Would you like to run the comprehensive test suite? (Recommended before deployment)',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    console.log('\nStep 2: Running comprehensive test suite...');
    const comprehensivePassed = testComprehensiveSuite();
    
    if (comprehensivePassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Safe to deploy changes');
    } else {
      console.log('\n❌ Comprehensive tests failed');
      console.log('🔧 Fix issues before deployment');
    }
    
    return comprehensivePassed;
  } else {
    console.log('\n✅ Quick start completed');
    console.log('📋 Run testComprehensiveSuite() before deployment');
    return true;
  }
} 