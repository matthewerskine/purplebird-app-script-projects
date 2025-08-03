// Simulate Skip Logic
// This script simulates the exact Airtable.js logic to diagnose the skip issue

// Mock data based on common scenarios
const mockScenarios = [
  {
    name: "Scenario 1: Exact 'airtableAction' column",
    headers: ['name', 'phone', 'websiteUrl', 'airtableAction', 'processed'],
    rows: [
      ['Company A', '123-456-7890', 'https://example.com', 'skip', ''],
      ['Company B', '098-765-4321', 'https://test.com', 'send', ''],
      ['Company C', '555-123-4567', 'https://demo.com', 'Skip', ''],
      ['Company D', '111-222-3333', 'https://sample.com', '', ''],
      ['Company E', '444-555-6666', 'https://example.org', ' SKIP ', '']
    ]
  },
  {
    name: "Scenario 2: 'Airtable Action' column (space)",
    headers: ['name', 'phone', 'websiteUrl', 'Airtable Action', 'processed'],
    rows: [
      ['Company A', '123-456-7890', 'https://example.com', 'skip', ''],
      ['Company B', '098-765-4321', 'https://test.com', 'send', ''],
      ['Company C', '555-123-4567', 'https://demo.com', 'Skip', '']
    ]
  },
  {
    name: "Scenario 3: 'airtable action' column (lowercase)",
    headers: ['name', 'phone', 'websiteUrl', 'airtable action', 'processed'],
    rows: [
      ['Company A', '123-456-7890', 'https://example.com', 'skip', ''],
      ['Company B', '098-765-4321', 'https://test.com', 'send', '']
    ]
  },
  {
    name: "Scenario 4: No airtable action column",
    headers: ['name', 'phone', 'websiteUrl', 'processed'],
    rows: [
      ['Company A', '123-456-7890', 'https://example.com', ''],
      ['Company B', '098-765-4321', 'https://test.com', '']
    ]
  },
  {
    name: "Scenario 5: 'AirtableAction' column (camelCase)",
    headers: ['name', 'phone', 'websiteUrl', 'AirtableAction', 'processed'],
    rows: [
      ['Company A', '123-456-7890', 'https://example.com', 'skip', ''],
      ['Company B', '098-765-4321', 'https://test.com', 'send', '']
    ]
  }
];

// Function to create header map exactly like the Apps Script code
function createHeaderMap(headers) {
  const headerMap = {};
  headers.forEach((headerValue, index) => {
    const headerKey = String(headerValue || '').trim();
    if (headerKey) {
      headerMap[headerKey] = index;
    }
  });
  return headerMap;
}

// Enhanced column finding function (from our fix)
function findAirtableActionColumn(headerMap) {
  // Try exact match first
  if (headerMap['airtableAction'] !== undefined) {
    return headerMap['airtableAction'];
  }
  
  // Try common variations
  const variations = [
    'Airtable Action',
    'airtable action',
    'AirtableAction',
    'airtable_action',
    'Airtable_Action',
    'AirtableAction',
    'airtableAction'
  ];
  
  for (const variation of variations) {
    if (headerMap[variation] !== undefined) {
      console.log(`Found airtable action column: "${variation}"`);
      return headerMap[variation];
    }
  }
  
  // Try fuzzy matching - look for any column containing both "airtable" and "action"
  for (const key of Object.keys(headerMap)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('airtable') && lowerKey.includes('action')) {
      console.log(`Found airtable action column (fuzzy match): "${key}"`);
      return headerMap[key];
    }
  }
  
  console.log('WARNING: No airtable action column found');
  return undefined;
}

// Simulate the exact Airtable.js logic
function simulateAirtableLogic(headers, rows) {
  console.log('\n=== SIMULATING AIRTABLE.JS LOGIC ===');
  
  const headerMap = createHeaderMap(headers);
  const SHEET_COL_AIRTABLE_ACTION = 'airtableaction';
  const airtableActionColIndex = headerMap[SHEET_COL_AIRTABLE_ACTION];
  
  console.log(`Looking for column: "${SHEET_COL_AIRTABLE_ACTION}"`);
  console.log(`Found at index: ${airtableActionColIndex}`);
  
  if (airtableActionColIndex === undefined) {
    console.log('PROBLEM: airtableAction column not found!');
    console.log('Available columns:');
    Object.keys(headerMap).forEach(key => {
      console.log(`  - "${key}"`);
    });
    return;
  }
  
  // Simulate the exact logic from Airtable.js
  console.log('\nSimulating processDataRows logic:');
  rows.forEach((rowData, i) => {
    const rowIndex = i + 2;
    console.log(`\nRow ${rowIndex}:`);
    
    // This is the exact logic from Airtable.js
    if (airtableActionColIndex !== undefined) {
      const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();
      
      console.log(`  Raw action value: "${rowData[airtableActionColIndex]}"`);
      console.log(`  Cleaned action value: "${actionValue}"`);
      
      if (actionValue === 'skip') {
        console.log(`  -> WOULD SKIP (actionValue === 'skip')`);
      } else {
        console.log(`  -> WOULD PROCESS (actionValue !== 'skip')`);
      }
    } else {
      console.log(`  -> WOULD PROCESS (no airtableAction column)`);
    }
  });
}

// Test the enhanced logic
function testEnhancedLogic(headers, rows) {
  console.log('\n=== TESTING ENHANCED LOGIC ===');
  
  const headerMap = createHeaderMap(headers);
  const airtableActionColIndex = findAirtableActionColumn(headerMap);
  
  if (airtableActionColIndex === undefined) {
    console.log('✗ NO AIRTABLE ACTION COLUMN FOUND!');
    console.log('This explains why the skip logic is not working.');
    return;
  }
  
  console.log(`✓ Found airtable action column at index: ${airtableActionColIndex}`);
  
  // Test skip logic on rows
  rows.forEach((rowData, i) => {
    const rowIndex = i + 2;
    const rawActionValue = rowData[airtableActionColIndex];
    const actionValue = String(rawActionValue || '').trim().toLowerCase();
    const wouldSkip = actionValue === 'skip';
    
    console.log(`Row ${rowIndex}:`);
    console.log(`  Raw value: "${rawActionValue}"`);
    console.log(`  Cleaned value: "${actionValue}"`);
    console.log(`  Would skip: ${wouldSkip ? 'YES' : 'NO'}`);
    console.log(`  Company name: "${rowData[headerMap['name']] || 'N/A'}"`);
    console.log('');
  });
}

// Run all scenarios
function runAllScenarios() {
  console.log('=== DIAGNOSING SKIP LOGIC WITH MOCK DATA ===');
  
  mockScenarios.forEach((scenario, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SCENARIO ${index + 1}: ${scenario.name}`);
    console.log(`${'='.repeat(60)}`);
    
    console.log('\nHeaders:', scenario.headers);
    
    // Test original logic
    simulateAirtableLogic(scenario.headers, scenario.rows);
    
    // Test enhanced logic
    testEnhancedLogic(scenario.headers, scenario.rows);
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log('The enhanced logic should handle all column name variations.');
  console.log('The original logic only works with exact "airtableAction" column name.');
  console.log('This explains why the skip logic might not be working in your sheet.');
}

// Run the diagnosis
if (require.main === module) {
  runAllScenarios();
}

module.exports = {
  createHeaderMap,
  findAirtableActionColumn,
  simulateAirtableLogic,
  testEnhancedLogic,
  runAllScenarios
}; 