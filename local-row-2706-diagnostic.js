// Local Row 2706 Diagnostic
// This script can access Google Sheets data directly to diagnose the issue

const { google } = require('googleapis');

// Configuration
const SPREADSHEET_ID = '1nS-_D28tM3YhZcWSrI1c12uIXq8ePweqz76LAPhwU_g';
const SHEET_NAME = 'GM - Qualify';
const TARGET_ROW = 2706;

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

// Function to get specific row data
async function getRowData(sheets, rowNumber) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${rowNumber}:${rowNumber}`
    });
    
    return response.data.values ? response.data.values[0] : null;
  } catch (error) {
    console.error('Error getting row data:', error);
    return null;
  }
}

// Function to get headers
async function getHeaders(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`
    });
    
    return response.data.values ? response.data.values[0] : null;
  } catch (error) {
    console.error('Error getting headers:', error);
    return null;
  }
}

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

// Main diagnostic function
async function diagnoseRow2706() {
  console.log('=== DIAGNOSING ROW 2706 ===');
  console.log('READ ONLY - NO CHANGES WILL BE MADE');
  
  const sheets = await authenticateGoogleSheets();
  if (!sheets) {
    console.log('\nCould not authenticate with Google Sheets API.');
    console.log('Please set up Google Cloud credentials as described above.');
    return;
  }
  
  // Get headers
  const headers = await getHeaders(sheets);
  if (!headers) {
    console.log('Could not retrieve headers.');
    return;
  }
  
  console.log('\n=== HEADER ANALYSIS ===');
  console.log('All column headers:');
  headers.forEach((header, index) => {
    console.log(`${index + 1}: "${header}"`);
  });
  
  // Create header map exactly like the Apps Script code
  const headerMap = createHeaderMap(headers);
  
  console.log('\n=== HEADER MAP ===');
  Object.keys(headerMap).forEach(key => {
    console.log(`"${key}" -> column ${headerMap[key] + 1}`);
  });
  
  // Check for airtableAction column
  const airtableActionColIndex = headerMap['airtableAction'];
  console.log(`\n=== AIRTABLE ACTION COLUMN ===`);
  console.log(`Looking for: "airtableAction"`);
  console.log(`Found at index: ${airtableActionColIndex}`);
  console.log(`Column letter: ${airtableActionColIndex !== undefined ? String.fromCharCode(65 + airtableActionColIndex) : 'NOT FOUND'}`);
  
  if (airtableActionColIndex === undefined) {
    console.log('❌ PROBLEM: airtableAction column not found!');
    console.log('This explains why the skip logic is not working.');
    return;
  }
  
  // Get row 2706 data
  const rowData = await getRowData(sheets, TARGET_ROW);
  if (!rowData) {
    console.log(`Could not retrieve row ${TARGET_ROW} data.`);
    return;
  }
  
  console.log(`\n=== ROW ${TARGET_ROW} ANALYSIS ===`);
  console.log('Row data (non-empty cells):');
  rowData.forEach((cell, index) => {
    if (cell !== '') {
      console.log(`  Col ${index + 1} (${headers[index]}): "${cell}"`);
    }
  });
  
  // Check the airtableAction value specifically
  const rawActionValue = rowData[airtableActionColIndex];
  console.log(`\n=== AIRTABLE ACTION VALUE ===`);
  console.log(`Raw value: "${rawActionValue}"`);
  console.log(`Type: ${typeof rawActionValue}`);
  console.log(`Length: ${rawActionValue ? rawActionValue.length : 0}`);
  
  // Check for hidden characters
  if (rawActionValue) {
    console.log(`Character codes: ${Array.from(rawActionValue).map(c => c.charCodeAt(0)).join(', ')}`);
  }
  
  // Apply the exact logic from Airtable.js
  const actionValue = String(rawActionValue || '').trim().toLowerCase();
  console.log(`\n=== LOGIC ANALYSIS ===`);
  console.log(`Cleaned value: "${actionValue}"`);
  console.log(`Length after trim: ${actionValue.length}`);
  console.log(`Comparison with 'skip': ${actionValue === 'skip'}`);
  console.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
  
  // Check what the current code would do
  console.log(`\n=== WHAT THE CODE WOULD DO ===`);
  if (actionValue === 'skip') {
    console.log('✅ CORRECT: Would skip this row');
  } else {
    console.log('❌ PROBLEM: Would process this row (should skip)');
    console.log('This explains why the lead is being sent despite "skip"');
  }
  
  // Additional debugging
  console.log(`\n=== ADDITIONAL DEBUGGING ===`);
  console.log(`actionValue === 'skip': ${actionValue === 'skip'}`);
  console.log(`actionValue.length: ${actionValue.length}`);
  console.log(`actionValue.charCodeAt(0): ${actionValue.length > 0 ? actionValue.charCodeAt(0) : 'N/A'}`);
  console.log(`'skip'.charCodeAt(0): ${'skip'.charCodeAt(0)}`);
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
  console.log('NO CHANGES WERE MADE TO THE SPREADSHEET');
}

// Run the diagnosis
if (require.main === module) {
  diagnoseRow2706().catch(console.error);
}

module.exports = {
  authenticateGoogleSheets,
  getRowData,
  getHeaders,
  createHeaderMap,
  diagnoseRow2706
}; 