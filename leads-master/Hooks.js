/**
 * Adds a custom menu to the spreadsheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Leads')
    .addItem('Send Selected to Qualify', 'sendToQualifySheet')
    .addItem('Cleanup', 'openCleanerSidebar')
    .addItem('Run De-dupe Report on Selected', 'runDedupeReport')
    .addToUi()

  SpreadsheetApp.getUi()
    .createMenu('Airtable')
    .addItem('Send Selected Leads to Airtable', 'sendSelectedLeadsToAirtable')
    .addItem('Debug Selected Leads (No Send)', 'debugSelectedLeadsToAirtable')
    .addItem('Verify Leads in Airtable', 'verifyLeadsInAirtable')
    .addSeparator()
    .addItem('Archive Leads & Activities (DRY RUN)', 'runDryRun')
    .addItem('Archive Leads & Activities (Deletes Data From Airtable!)', 'runLiveArchive')
    .addToUi();

  SpreadsheetApp.getUi()
    .createMenu('Enrichment Agent')
    .addItem('Retry Enrichments for Selected Rows', 'resetEnrichmentStatus')
    // .addItem('Verify Company Status (CH API - Free)', 'verifyCompanyStatusFree')
    // .addItem('Verify Website Attribution for Selected Rows', 'verifyAttribution')
    // .addItem('Extract Email (Website Scan)', 'extractEmail')
    // .addItem('Detect Ad Platforms', 'extractAdPresence')
    // .addSeparator()
    // .addItem('Run All Enrichments', 'addEnrichmentJobToQueue')
    .addToUi();

  SpreadsheetApp.getUi()
    .createMenu('Leads API')
    .addItem('Regenerate Lead List', 'regenerateLeadList')
    .addItem('Add Next Page', 'addNextPage')
    .addToUi();
}
