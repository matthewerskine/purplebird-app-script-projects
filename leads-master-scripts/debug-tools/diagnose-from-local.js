// Diagnose from Local Environment
// This script can access Google Sheets data to diagnose the skip logic issue

const { google } = require('googleapis');
const fs = require('fs');

// Configuration
const SPREADSHEET_ID = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
const SHEET_NAME = 'GM - Qualify';

// Function to authenticate with Google Sheets API
async function authenticateGoogleSheets() {
  try {
    // For now, we'll use Application Default Credentials
    // You'll need to set up Google Cloud credentials
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Error setting up Google Sheets API:', error);
    console.log('\nTo set up Google Sheets API access:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Google Sheets API');
    console.log('4. Create service account credentials');
    console.log('5. Download JSON key file');
    console.log('6. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    return null;
  }
}

// Function to get sheet data
async function getSheetData(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME
    });
    
    return response.data.values;
  } catch (error) {
    console.error('Error getting sheet data:', error);
    return null;
  }
}

// Function to analyze the sheet structure
function analyzeSheetStructure(data) {
  if (!data || data.length === 0) {
    console.log('No data found in sheet');
    return;
  }
  
  const headers = data[0];
  const rows = data.slice(1);
  
  console.log('=== SHEET STRUCTURE ANALYSIS ===');
  console.log('\nAll column headers:');
  headers.forEach((header, index) => {
    console.log(`${index + 1}: "${header}"`);
  });
  
  // Create header map exactly like the Apps Script code does
  const headerMap = {};
  headers.forEach((headerValue, index) => {
    const headerKey = String(headerValue || '').trim();
    if (headerKey) {
      headerMap[headerKey] = index;
    }
  });
  
  console.log('\nHeader Map:');
  Object.keys(headerMap).forEach(key => {
    console.log(`"${key}" -> column ${headerMap[key] + 1}`);
  });
  
  // Find airtable action column
  console.log('\nSearching for airtable action column:');
  const airtableActionVariations = [
    'airtableAction',
    'Airtable Action',
    'airtable action',
    'AirtableAction',
    'airtable_action',
    'Airtable_Action'
  ];
  
  let foundColumn = null;
  let foundColumnName = null;
  
  for (const variation of airtableActionVariations) {
    if (headerMap[variation] !== undefined) {
      foundColumn = headerMap[variation];
      foundColumnName = variation;
      console.log(`✓ FOUND: "${variation}" -> column ${foundColumn + 1}`);
      break;
    }
  }
  
  if (!foundColumn) {
    console.log('✗ No exact match found, searching for fuzzy matches...');
    for (const key of Object.keys(headerMap)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('airtable') && lowerKey.includes('action')) {
        foundColumn = headerMap[key];
        foundColumnName = key;
        console.log(`✓ FUZZY MATCH: "${key}" -> column ${foundColumn + 1}`);
        break;
      }
    }
  }
  
  if (!foundColumn) {
    console.log('✗ NO AIRTABLE ACTION COLUMN FOUND!');
    console.log('This explains why the skip logic is not working.');
    return { headerMap, foundColumn: null, foundColumnName: null };
  }
  
  // Test skip logic on sample rows
  console.log('\n=== TESTING SKIP LOGIC ===');
  const sampleRows = rows.slice(0, Math.min(10, rows.length));
  
  sampleRows.forEach((rowData, i) => {
    const rowIndex = i + 2; // +2 because we start from row 2
    const rawActionValue = rowData[foundColumn];
    const actionValue = String(rawActionValue || '').trim().toLowerCase();
    const wouldSkip = actionValue === 'skip';
    
    console.log(`Row ${rowIndex}:`);
    console.log(`  Raw value: "${rawActionValue}"`);
    console.log(`  Cleaned value: "${actionValue}"`);
    console.log(`  Would skip: ${wouldSkip ? 'YES' : 'NO'}`);
    console.log(`  Company name: "${rowData[headerMap['name']] || 'N/A'}"`);
    console.log('');
  });
  
  return { headerMap, foundColumn, foundColumnName };
}

// Function to simulate the exact Airtable.js logic
function simulateAirtableLogic(data, headerMap) {
  console.log('\n=== SIMULATING AIRTABLE.JS LOGIC ===');
  
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
  const sampleRows = data.slice(1, Math.min(6, data.length)); // Skip header row
  
  sampleRows.forEach((rowData, i) => {
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

// Main function
async function diagnoseFromLocal() {
  console.log('=== DIAGNOSING FROM LOCAL ENVIRONMENT ===');
  
  const sheets = await authenticateGoogleSheets();
  if (!sheets) {
    console.log('\nCould not authenticate with Google Sheets API.');
    console.log('Please set up Google Cloud credentials as described above.');
    return;
  }
  
  const data = await getSheetData(sheets);
  if (!data) {
    console.log('Could not retrieve sheet data.');
    return;
  }
  
  const analysis = analyzeSheetStructure(data);
  simulateAirtableLogic(data, analysis.headerMap);
  
  console.log('\n=== DIAGNOSIS COMPLETE ===');
}

// Run the diagnosis
if (require.main === module) {
  diagnoseFromLocal().catch(console.error);
}

module.exports = {
  authenticateGoogleSheets,
  getSheetData,
  analyzeSheetStructure,
  simulateAirtableLogic,
  diagnoseFromLocal
}; 