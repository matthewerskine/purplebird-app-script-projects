// Analyze Exact Row Contents
// Based on the actual row data provided

const exactRowData = [
  "Inverness",
  "Landscape designer",
  "",
  "ChIJuepnp19zj0gRdFt5mOWqAJs",
  "0x488f735fa767eab9:0x9b00aae598795b74",
  "",
  "Creative Scapes",
  "34 Ardholm Pl, Inverness IV2 4QG",
  "07587 806546",
  "5",
  "1",
  "https://m.facebook.com/profile.php?id=2200966186859411&ref=content_filter",
  "https://www.google.com/maps/contrib/111598435523302407250",
  "Landscape Gardener",
  "null",
  "unknown",
  "Low",
  "2025",
  "Meta Design Team",
  "2025",
  "No",
  "High",
  "",
  "No",
  "No",
  "No",
  "No",
  "No",
  "No",
  "",
  "skip",  // This is the airtableAction value
  "Sent on 2025-07-31 (ID: recStorzN3MWsRSCC)",
  "Complete"
];

// Simulate the exact Airtable.js logic
function analyzeExactRow() {
  console.log('=== ANALYZING EXACT ROW 2706 ===');
  
  // Find the airtableAction column (should be column 31, index 30)
  const airtableActionValue = exactRowData[30]; // 31st column (0-indexed)
  
  console.log(`Airtable Action Value: "${airtableActionValue}"`);
  console.log(`Type: ${typeof airtableActionValue}`);
  console.log(`Length: ${airtableActionValue ? airtableActionValue.length : 0}`);
  
  // Character analysis
  if (airtableActionValue) {
    console.log('\nCharacter analysis:');
    Array.from(airtableActionValue).forEach((char, index) => {
      const code = char.charCodeAt(0);
      console.log(`  ${index}: "${char}" (code: ${code}, hex: 0x${code.toString(16)})`);
    });
  }
  
  // Apply the exact logic from Airtable.js
  const actionValue = String(airtableActionValue || '').trim().toLowerCase();
  console.log(`\n=== LOGIC ANALYSIS ===`);
  console.log(`Cleaned value: "${actionValue}"`);
  console.log(`Length after trim: ${actionValue.length}`);
  console.log(`Comparison with 'skip': ${actionValue === 'skip'}`);
  console.log(`Would skip: ${actionValue === 'skip' ? 'YES' : 'NO'}`);
  
  // Check for common issues
  console.log(`\n=== COMMON ISSUES CHECK ===`);
  if (airtableActionValue && airtableActionValue.includes('\u200B')) {
    console.log('❌ FOUND: Zero-width space character (invisible)');
  }
  if (airtableActionValue && airtableActionValue.includes('\u00A0')) {
    console.log('❌ FOUND: Non-breaking space character');
  }
  if (airtableActionValue && airtableActionValue.length > 4) {
    console.log('❌ FOUND: Extra characters beyond "skip"');
  }
  if (actionValue === '') {
    console.log('❌ FOUND: Empty value after trim');
  }
  if (actionValue !== 'skip' && actionValue.includes('skip')) {
    console.log('❌ FOUND: Contains "skip" but not exactly "skip"');
  }
  
  console.log('\n=== CONCLUSION ===');
  if (actionValue === 'skip') {
    console.log('✅ The logic should work correctly');
    console.log('✅ This row should be SKIPPED');
    console.log('❓ If it\'s not being skipped, the issue might be:');
    console.log('   1. Wrong column index in the code');
    console.log('   2. Different row being processed');
    console.log('   3. Code not reaching this logic');
  } else {
    console.log('❌ The logic would process this row');
    console.log('❌ This explains why the lead is being sent');
  }
}

// Run the analysis
analyzeExactRow(); 