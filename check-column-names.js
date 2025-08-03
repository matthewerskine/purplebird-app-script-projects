function checkColumnNames() {
  console.log('=== CHECKING COLUMN NAMES ===');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = getHeaderMap(headers);
  
  console.log('All available columns:');
  Object.keys(headerMap).forEach(key => {
    const index = headerMap[key];
    const columnLetter = String.fromCharCode(65 + index);
    console.log(`"${key}" -> Column ${columnLetter} (index ${index})`);
  });
  
  console.log('\n=== CHECKING SPECIFIC COLUMNS ===');
  
  // Check for website-related columns
  const websiteVariations = ['websiteUrl', 'website', 'url', 'Website URL', 'website_url'];
  console.log('Looking for website column:');
  websiteVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Check for email-related columns
  const emailVariations = ['extractEmail.email', 'email', 'Email', 'extractEmail', 'email_extracted'];
  console.log('\nLooking for email column:');
  emailVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Check for phone-related columns
  const phoneVariations = ['phone', 'Phone', 'telephone', 'contact'];
  console.log('\nLooking for phone column:');
  phoneVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
  
  // Check for industry/category columns
  const industryVariations = ['category', 'industry', 'Industry', 'Category'];
  console.log('\nLooking for industry/category column:');
  industryVariations.forEach(variation => {
    if (headerMap[variation] !== undefined) {
      console.log(`✅ FOUND: "${variation}" at column ${String.fromCharCode(65 + headerMap[variation])}`);
    } else {
      console.log(`❌ NOT FOUND: "${variation}"`);
    }
  });
} 