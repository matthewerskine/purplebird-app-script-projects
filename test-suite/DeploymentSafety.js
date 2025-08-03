/**
 * DEPLOYMENT SAFETY WRAPPER
 * 
 * This ensures all changes are tested before deployment to prevent breaking the sales team.
 * NEVER deploy without running these safety checks first.
 */

// ===================================================================================
// DEPLOYMENT SAFETY CHECKS
// ===================================================================================

/**
 * Pre-deployment safety check - MUST run before any deployment
 */
function preDeploymentSafetyCheck() {
  console.log('🛡️ PRE-DEPLOYMENT SAFETY CHECK');
  console.log('================================');
  console.log('This will validate all critical functions before deployment.');
  console.log('');
  
  try {
    // Step 1: Quick functionality test
    console.log('Step 1: Quick functionality test...');
    const quickTestPassed = quickTest();
    
    if (!quickTestPassed) {
      throw new Error('Quick test failed - DO NOT DEPLOY!');
    }
    
    console.log('✅ Quick test passed');
    console.log('');
    
    // Step 2: Comprehensive test suite
    console.log('Step 2: Comprehensive test suite...');
    const results = runAllTests();
    
    if (results.failed > 0) {
      throw new Error(`Comprehensive tests failed - DO NOT DEPLOY!`);
    }
    
    console.log('✅ Comprehensive tests passed');
    console.log('');
    
    // Step 3: Production readiness check
    console.log('Step 3: Production readiness check...');
    const productionReady = checkProductionReadiness();
    
    if (!productionReady) {
      throw new Error('Production readiness check failed - DO NOT DEPLOY!');
    }
    
    console.log('✅ Production readiness confirmed');
    console.log('');
    
    console.log('🎉 ALL SAFETY CHECKS PASSED!');
    console.log('✅ Safe to deploy changes');
    console.log('📋 Remember to:');
    console.log('   - Test with a small batch first');
    console.log('   - Monitor the sales team feedback');
    console.log('   - Have a rollback plan ready');
    
    return true;
    
  } catch (error) {
    console.log('');
    console.log('❌ DEPLOYMENT BLOCKED!');
    console.log('========================');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('🔧 REQUIRED ACTIONS:');
    console.log('   1. Fix the failing tests');
    console.log('   2. Run preDeploymentSafetyCheck() again');
    console.log('   3. Only deploy when ALL tests pass');
    console.log('');
    console.log('⚠️ DO NOT DEPLOY UNTIL ALL TESTS PASS!');
    
    return false;
  }
}

/**
 * Check if the system is ready for production deployment
 */
function checkProductionReadiness() {
  console.log('  Checking production readiness...');
  
  // Check 1: Verify all required functions exist
  const requiredFunctions = [
    'getHeaderMap',
    'getColumnIndex', 
    'findAirtableActionColumn',
    'processDataRows',
    'callAirtableApi'
  ];
  
  for (const funcName of requiredFunctions) {
    if (typeof globalThis[funcName] !== 'function') {
      console.log(`  ❌ Missing required function: ${funcName}`);
      return false;
    }
  }
  
  console.log('  ✅ All required functions present');
  
  // Check 2: Verify sheet access
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
    if (!sheet) {
      console.log('  ❌ Cannot access GM - Qualify sheet');
      return false;
    }
    console.log('  ✅ Sheet access confirmed');
  } catch (error) {
    console.log(`  ❌ Sheet access error: ${error.message}`);
    return false;
  }
  
  // Check 3: Verify column structure
  try {
    const headerMap = createTestHeaderMap();
    const requiredColumns = ['name', 'processed'];
    
    for (const col of requiredColumns) {
      if (getColumnIndex(headerMap, col) === undefined) {
        console.log(`  ❌ Missing required column: ${col}`);
        return false;
      }
    }
    
    console.log('  ✅ Required columns present');
  } catch (error) {
    console.log(`  ❌ Column structure error: ${error.message}`);
    return false;
  }
  
  return true;
}

// ===================================================================================
// DEPLOYMENT WORKFLOW FUNCTIONS
// ===================================================================================

/**
 * Safe deployment workflow - use this before any deployment
 */
function safeDeploymentWorkflow() {
  console.log('🚀 SAFE DEPLOYMENT WORKFLOW');
  console.log('============================');
  console.log('');
  
  // Step 1: Safety check
  console.log('Step 1: Running safety checks...');
  const safetyPassed = preDeploymentSafetyCheck();
  
  if (!safetyPassed) {
    console.log('');
    console.log('❌ DEPLOYMENT ABORTED!');
    console.log('Fix the issues above before attempting deployment.');
    return false;
  }
  
  console.log('');
  console.log('Step 2: Deployment approved!');
  console.log('You can now safely deploy your changes.');
  console.log('');
  console.log('📋 Deployment checklist:');
  console.log('   ✅ All tests passed');
  console.log('   ✅ Production readiness confirmed');
  console.log('   ✅ Safety checks completed');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Deploy your changes');
  console.log('   2. Test with a small batch');
  console.log('   3. Monitor sales team feedback');
  console.log('   4. Have rollback plan ready');
  
  return true;
}

/**
 * Emergency rollback function - use if deployment causes issues
 */
function emergencyRollback() {
  console.log('🚨 EMERGENCY ROLLBACK');
  console.log('=====================');
  console.log('');
  console.log('⚠️ WARNING: This will disable critical functions');
  console.log('Only use if deployment has caused issues!');
  console.log('');
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Emergency Rollback',
    'This will disable critical functions. Only proceed if deployment has caused issues. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    console.log('🔄 Initiating emergency rollback...');
    
    // Disable critical functions
    globalThis.processDataRows = function() {
      throw new Error('CRITICAL FUNCTION DISABLED - Emergency rollback active');
    };
    
    globalThis.sendSelectedLeadsToAirtable = function() {
      throw new Error('CRITICAL FUNCTION DISABLED - Emergency rollback active');
    };
    
    console.log('✅ Emergency rollback completed');
    console.log('Critical functions have been disabled');
    console.log('Contact the development team immediately');
    
    return true;
  } else {
    console.log('❌ Rollback cancelled');
    return false;
  }
}

// ===================================================================================
// MONITORING FUNCTIONS
// ===================================================================================

/**
 * Monitor system health after deployment
 */
function monitorSystemHealth() {
  console.log('📊 SYSTEM HEALTH MONITOR');
  console.log('========================');
  
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
    }}
  ];
  
  let allHealthy = true;
  
  for (const check of healthChecks) {
    try {
      const healthy = check.func();
      if (healthy) {
        console.log(`✅ ${check.name}: Healthy`);
      } else {
        console.log(`❌ ${check.name}: Unhealthy`);
        allHealthy = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Error - ${error.message}`);
      allHealthy = false;
    }
  }
  
  console.log('');
  if (allHealthy) {
    console.log('🎉 SYSTEM HEALTH: ALL SYSTEMS OPERATIONAL');
  } else {
    console.log('⚠️ SYSTEM HEALTH: ISSUES DETECTED');
    console.log('Run preDeploymentSafetyCheck() to diagnose issues');
  }
  
  return allHealthy;
}

/**
 * Quick health check for immediate feedback
 */
function quickHealthCheck() {
  console.log('⚡ QUICK HEALTH CHECK');
  console.log('====================');
  
  try {
    // Test basic functionality
    const headerMap = createTestHeaderMap();
    const nameIndex = getColumnIndex(headerMap, 'name');
    const actionCol = findAirtableActionColumn(headerMap);
    
    if (nameIndex !== undefined) {
      console.log('✅ Basic functionality: OK');
      return true;
    } else {
      console.log('❌ Basic functionality: FAILED');
      return false;
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
    return false;
  }
}

// ===================================================================================
// DEPLOYMENT MENU
// ===================================================================================

/**
 * Create deployment menu in Apps Script
 */
function createDeploymentMenu() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🛡️ Deployment Safety')
    .addItem('Run Safety Check', 'preDeploymentSafetyCheck')
    .addItem('Safe Deployment Workflow', 'safeDeploymentWorkflow')
    .addSeparator()
    .addItem('Quick Health Check', 'quickHealthCheck')
    .addItem('System Health Monitor', 'monitorSystemHealth')
    .addSeparator()
    .addItem('Emergency Rollback', 'emergencyRollback')
    .addToUi();
  
  console.log('✅ Deployment Safety menu created');
  console.log('Look for "🛡️ Deployment Safety" in the menu bar');
} 