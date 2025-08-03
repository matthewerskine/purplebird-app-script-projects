function identifyBadRecords() {
  console.log('=== IDENTIFYING BAD RECORDS FOR DELETION ===');
  console.log('This script will identify records that:');
  console.log('1. Have "skip" in airtableAction column');
  console.log('2. Have "Sent on ..." in processed column');
  console.log('3. Have no Activities in Airtable');
  console.log('4. Are from GM source');
  console.log('');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  if (!sheet) {
    console.log('❌ ERROR: Could not find "GM - Qualify" sheet');
    return;
  }
  
  // Get all data
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const headerMap = getHeaderMap(headers);
  
  console.log('=== CHECKING REQUIRED COLUMNS ===');
  const requiredCols = ['name', 'processed', 'airtableAction'];
  for (const col of requiredCols) {
    if (headerMap[col] === undefined) {
      console.log(`❌ MISSING COLUMN: "${col}"`);
      return;
    } else {
      console.log(`✅ FOUND COLUMN: "${col}" at index ${headerMap[col]}`);
    }
  }
  
  // Find airtableAction column with enhanced logic
  const airtableActionColIndex = findAirtableActionColumn(headerMap);
  if (airtableActionColIndex === undefined) {
    console.log('❌ ERROR: Could not find airtableAction column');
    return;
  }
  
  console.log(`✅ Using airtableAction column at index ${airtableActionColIndex}`);
  
  const candidates = [];
  const processedRows = [];
  
  console.log('\n=== SCANNING SHEET ROWS ===');
  
  // Scan all rows (skip header)
  for (let i = 1; i < allData.length; i++) {
    const rowData = allData[i];
    const sheetRow = i + 1;
    
    const companyName = rowData[headerMap['name']];
    const processedStatus = String(rowData[headerMap['processed']] || '').trim();
    const actionValue = String(rowData[airtableActionColIndex] || '').trim().toLowerCase();
    
    // Check if this row has "skip" and "Sent on"
    if (actionValue === 'skip' && processedStatus.startsWith('Sent on')) {
      console.log(`🔍 ROW ${sheetRow}: "${companyName}" - SKIP + SENT`);
      
      // Extract Airtable ID from processed status
      const idMatch = processedStatus.match(/ID: ([^)]+)/);
      if (idMatch) {
        const airtableId = idMatch[1];
        candidates.push({
          sheetRow: sheetRow,
          companyName: companyName,
          airtableId: airtableId,
          processedStatus: processedStatus
        });
        console.log(`  → Airtable ID: ${airtableId}`);
      } else {
        console.log(`  ⚠️ Could not extract Airtable ID from: "${processedStatus}"`);
      }
    }
  }
  
  console.log(`\n=== FOUND ${candidates.length} CANDIDATES ===`);
  
  if (candidates.length === 0) {
    console.log('✅ No bad records found!');
    return;
  }
  
  console.log('\n=== VERIFYING AIRTABLE RECORDS ===');
  console.log('Checking each record for Activities...');
  
  const toDelete = [];
  const hasActivities = [];
  const notFound = [];
  
  for (const candidate of candidates) {
    console.log(`\nChecking: "${candidate.companyName}" (ID: ${candidate.airtableId})`);
    
    try {
      // Get the record from Airtable
      const response = callAirtableApi('GET', null, candidate.airtableId);
      
      if (!response) {
        console.log(`  ❌ API ERROR: Could not fetch record`);
        notFound.push(candidate);
        continue;
      }
      
      if (!response.fields) {
        console.log(`  ❌ NOT FOUND: Record does not exist`);
        notFound.push(candidate);
        continue;
      }
      
      // Check for Activities
      const activities = response.fields['Activities'] || [];
      const notes = response.fields['Notes'] || '';
      const stage = response.fields['Stage'] || '';
      
      console.log(`  → Activities: ${activities.length}`);
      console.log(`  → Notes: "${notes}"`);
      console.log(`  → Stage: "${stage}"`);
      
      // Check if there's any activity
      const hasActivity = activities.length > 0 || 
                         (notes && notes.trim().length > 0) || 
                         (stage && stage !== 'Qualified'); // Assuming 'Qualified' is default
      
      if (hasActivity) {
        console.log(`  ⚠️ HAS ACTIVITY: Cannot delete - agent has used this lead`);
        hasActivities.push(candidate);
      } else {
        console.log(`  ✅ NO ACTIVITY: Safe to delete`);
        toDelete.push(candidate);
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      notFound.push(candidate);
    }
  }
  
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total candidates: ${candidates.length}`);
  console.log(`Safe to delete: ${toDelete.length}`);
  console.log(`Has activities (cannot delete): ${hasActivities.length}`);
  console.log(`Not found/errors: ${notFound.length}`);
  
  if (toDelete.length > 0) {
    console.log('\n=== RECORDS TO DELETE ===');
    toDelete.forEach((record, index) => {
      console.log(`${index + 1}. Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    });
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Review the list above carefully');
    console.log('2. Run deleteBadRecords() to proceed with deletion');
    console.log('3. Each record will be deleted individually with verification');
  }
  
  if (hasActivities.length > 0) {
    console.log('\n=== RECORDS WITH ACTIVITIES (WILL NOT DELETE) ===');
    hasActivities.forEach((record, index) => {
      console.log(`${index + 1}. Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    });
  }
  
  // Store results for the deletion function
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_TO_DELETE', JSON.stringify(toDelete));
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_HAS_ACTIVITIES', JSON.stringify(hasActivities));
  PropertiesService.getScriptProperties().setProperty('BAD_RECORDS_NOT_FOUND', JSON.stringify(notFound));
} 