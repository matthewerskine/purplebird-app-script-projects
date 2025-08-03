function deleteBadRecords() {
  console.log('=== SAFE DELETION OF BAD RECORDS ===');
  console.log('This function will delete records one at a time with full verification.');
  console.log('');
  
  // Get the list of records to delete from properties
  const toDeleteJson = PropertiesService.getScriptProperties().getProperty('BAD_RECORDS_TO_DELETE');
  if (!toDeleteJson) {
    console.log('❌ ERROR: No records to delete found. Run identifyBadRecords() first.');
    return;
  }
  
  const toDelete = JSON.parse(toDeleteJson);
  if (toDelete.length === 0) {
    console.log('✅ No records to delete.');
    return;
  }
  
  console.log(`Found ${toDelete.length} records to delete.`);
  console.log('');
  
  // Show the list one more time
  console.log('=== RECORDS TO DELETE ===');
  toDelete.forEach((record, index) => {
    console.log(`${index + 1}. Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
  });
  
  console.log('');
  console.log('⚠️ WARNING: This will permanently delete these records from Airtable.');
  console.log('Each deletion will be logged and verified.');
  console.log('');
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Confirm Deletion',
    `Are you sure you want to delete ${toDelete.length} records from Airtable?\n\nThis action cannot be undone.`,
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    console.log('❌ Deletion cancelled by user.');
    return;
  }
  
  console.log('✅ User confirmed deletion. Proceeding...');
  console.log('');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GM - Qualify');
  const headerMap = getHeaderMap(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const processedColIndex = headerMap['processed'];
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each record individually
  for (let i = 0; i < toDelete.length; i++) {
    const record = toDelete[i];
    
    console.log(`\n--- PROCESSING RECORD ${i + 1}/${toDelete.length} ---`);
    console.log(`Row ${record.sheetRow}: "${record.companyName}" (ID: ${record.airtableId})`);
    
    try {
      // Step 1: Verify record still exists in Airtable
      console.log('Step 1: Verifying record exists...');
      const verifyResponse = callAirtableApi('GET', null, record.airtableId);
      
      if (!verifyResponse || !verifyResponse.fields) {
        console.log(`  ❌ Record no longer exists in Airtable`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ Record verified in Airtable`);
      
      // Step 2: Double-check no activities
      const activities = verifyResponse.fields['Activities'] || [];
      const notes = verifyResponse.fields['Notes'] || '';
      const stage = verifyResponse.fields['Stage'] || '';
      
      const hasActivity = activities.length > 0 || 
                         (notes && notes.trim().length > 0) || 
                         (stage && stage !== 'Qualified');
      
      if (hasActivity) {
        console.log(`  ⚠️ Record now has activity - skipping deletion`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ No activities found - safe to delete`);
      
      // Step 3: Delete from Airtable
      console.log('Step 2: Deleting from Airtable...');
      const deleteResponse = callAirtableApi('DELETE', null, record.airtableId);
      
      if (!deleteResponse) {
        console.log(`  ❌ Failed to delete from Airtable`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ Successfully deleted from Airtable`);
      
      // Step 4: Update sheet
      console.log('Step 3: Updating sheet...');
      const newStatus = `Deleted from Airtable on ${new Date().toISOString().slice(0, 10)} (was: ${record.processedStatus})`;
      sheet.getRange(record.sheetRow, processedColIndex + 1).setValue(newStatus);
      
      console.log(`  ✅ Updated sheet row ${record.sheetRow}`);
      
      successCount++;
      console.log(`✅ RECORD ${i + 1} COMPLETED SUCCESSFULLY`);
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      failCount++;
    }
    
    // Small delay between operations
    Utilities.sleep(1000);
  }
  
  console.log('\n=== DELETION COMPLETE ===');
  console.log(`Total records: ${toDelete.length}`);
  console.log(`Successfully deleted: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (successCount > 0) {
    console.log('\n✅ Cleanup completed successfully!');
  } else {
    console.log('\n❌ No records were deleted. Check the logs above for issues.');
  }
  
  // Clear the stored data
  PropertiesService.getScriptProperties().deleteProperty('BAD_RECORDS_TO_DELETE');
  PropertiesService.getScriptProperties().deleteProperty('BAD_RECORDS_HAS_ACTIVITIES');
  PropertiesService.getScriptProperties().deleteProperty('BAD_RECORDS_NOT_FOUND');
} 