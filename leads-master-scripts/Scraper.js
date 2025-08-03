/**
 * @OnlyCurrentDoc
 */

// Retrieve script properties once
const _scriptProperties = PropertiesService.getScriptProperties();
const rapidApiKey = _scriptProperties.getProperty('RAPIDAPI_KEY');
const slackWebhookUrl = _scriptProperties.getProperty('SLACK_WEBHOOK_URL');

// --- SCRAPER CONFIGURATION ---
const scraperConfig = {
  API_SHEET_NAME: 'API',
  RAW_SHEET_NAME: 'GM - RAW',
  
  // Columns in API Sheet (Input) - These are now case-insensitive
  // because the script will convert everything to lowercase.
  API_COL_CATEGORY: 'category',
  API_COL_REGION: 'region',
  API_COL_PROCESSED: 'processed',
  // --- CORRECTED to match your sheet's camelCase header ---
  API_COL_PAGE_OFFSET: 'pageOffset', 

  // Columns in GM - RAW Sheet (Output)
  RAW_COL_REGION: 'region',
  RAW_COL_CATEGORY: 'category',
  RAW_COL_NAME: 'name',
  RAW_COL_PLACE_ID: 'googlePlaceId',
  RAW_COL_GOOGLE_ID: 'googleId',
  RAW_COL_POSITION: 'position',
  RAW_COL_ADDRESS: 'address',
  RAW_COL_PHONE: 'phone',
  RAW_COL_RATING: 'rating',
  RAW_COL_REVIEWS: 'reviewsCount',
  RAW_COL_WEBSITE: 'websiteUrl',
  RAW_COL_OWNER_URL: 'ownerProfileUrl',
  RAW_COL_MAIN_CATEGORY: 'mainCategory',
  RAW_COL_DATE_SCRAPED: 'dateScraped',
  
  // API Status Values
  STATUS_PENDING: 'No',
  STATUS_SUCCESS: 'Yes',
  STATUS_FAILED: 'Failed',
  
  // API Host
  RAPIDAPI_HOST: 'google-maps-extractor2.p.rapidapi.com'
};

/**
 * The main function to be triggered automatically.
 */
function processApiQueue() {
  if (!rapidApiKey) {
    const errorMessage = 'FATAL ERROR: RAPIDAPI_KEY is not set in Script Properties.';
    Logger.log(errorMessage);
    sendSlackNotification(errorMessage);
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const apiSheet = ss.getSheetByName(scraperConfig.API_SHEET_NAME);
  const rawSheet = ss.getSheetByName(scraperConfig.RAW_SHEET_NAME);

  if (!apiSheet || !rawSheet) {
    const errorMessage = `Error: Missing required sheet. Ensure both "${scraperConfig.API_SHEET_NAME}" and "${scraperConfig.RAW_SHEET_NAME}" exist.`;
    Logger.log(errorMessage);
    sendSlackNotification(errorMessage);
    return;
  }

  const nextJob = findNextRowToProcess(apiSheet);
  
  if (!nextJob) {
    Logger.log('No new queries to process. Exiting.');
    return;
  }
  
  const { category, region, rowNum, processedColIdx, pageOffset } = nextJob;
  const searchQuery = `${category} ${region}, uk`;
  Logger.log(`Processing query: "${searchQuery}" from row ${rowNum} with Page Offset: ${pageOffset}`);
  
  try {
    const apiResponse = callRapidApi(searchQuery, pageOffset);

    if (!apiResponse || !apiResponse.data || apiResponse.data.length === 0) {
      const message = `No results found for search term: "${searchQuery}" (Page ${pageOffset})`;
      Logger.log(message);
      apiSheet.getRange(rowNum, processedColIdx + 1).setValue(scraperConfig.STATUS_FAILED);
      apiSheet.getRange(rowNum, processedColIdx + 2).setValue(new Date()); 
    } else {
      const leadsAdded = appendDataToRawSheet(rawSheet, apiResponse.data, region, category);
      const message = `Successfully scraped ${leadsAdded} leads for search term: "${searchQuery}" (Page ${pageOffset})`;
      Logger.log(message);
      sendSlackNotification(message);
      apiSheet.getRange(rowNum, processedColIdx + 1).setValue(scraperConfig.STATUS_SUCCESS);
      apiSheet.getRange(rowNum, processedColIdx + 2).setValue(new Date()); 
    }
  } catch (e) {
    const errorMessage = `An error occurred while processing "${searchQuery}": ${e.message}\n${e.stack}`;
    Logger.log(errorMessage);
    sendSlackNotification(errorMessage);
    apiSheet.getRange(rowNum, processedColIdx + 1).setValue(scraperConfig.STATUS_FAILED);
    apiSheet.getRange(rowNum, processedColIdx + 2).setValue(new Date()); 
  }
}

/**
 * Finds the first pending row using a more robust data reading method.
 */
function findNextRowToProcess(sheet) {
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const dataRows = allData.slice(1);

  // --- THIS IS THE KEY FIX ---
  // We get the header map, which is now case-insensitive.
  const headerMap = getHeaderMap(headers);
  
  // Now we look for the column index using the case-insensitive keys from the config.
  const processedColIdx = headerMap[scraperConfig.API_COL_PROCESSED.toLowerCase()];
  const categoryColIdx = headerMap[scraperConfig.API_COL_CATEGORY.toLowerCase()];
  const regionColIdx = headerMap[scraperConfig.API_COL_REGION.toLowerCase()];
  const pageOffsetColIdx = headerMap[scraperConfig.API_COL_PAGE_OFFSET.toLowerCase()];

  if (processedColIdx === undefined || categoryColIdx === undefined || regionColIdx === undefined || pageOffsetColIdx === undefined) {
    const errorMsg = `ERROR: Could not find required columns ('${scraperConfig.API_COL_PROCESSED}', '${scraperConfig.API_COL_CATEGORY}', '${scraperConfig.API_COL_REGION}', '${scraperConfig.API_COL_PAGE_OFFSET}') in the API sheet. Check your column headers.`;
    Logger.log(errorMsg);
    // Log the headers the script actually found for debugging
    Logger.log('Headers found by script (lowercase): ' + Object.keys(headerMap).join(', '));
    sendSlackNotification(errorMsg);
    return null;
  }

  if (dataRows.length === 0) return null;

  for (let i = 0; i < dataRows.length; i++) {
    const currentRow = dataRows[i];
    const processedValue = String(currentRow[processedColIdx]).trim().toLowerCase();
    
    if (processedValue === scraperConfig.STATUS_PENDING.toLowerCase()) {
      const category = currentRow[categoryColIdx];
      const region = currentRow[regionColIdx];
      const pageOffset = currentRow[pageOffsetColIdx];
      
      if (category && region) {
        return {
          category: category,
          region: region,
          pageOffset: pageOffset || 1,
          rowNum: i + 2,
          processedColIdx: processedColIdx
        };
      }
    }
  }
  return null;
}


/**
 * Calls the Google Maps Extractor RapidAPI, now with pagination support.
 */
function callRapidApi(query, pageNumber) {
  const page = parseInt(pageNumber) || 1;
  const limit = 50;
  const apiOffset = (page - 1) * limit;

  const endpoint = '/locate_and_search';
  const queryParams = `?query=${encodeURIComponent(query)}&offset=${apiOffset}&limit=${limit}&country=uk&language=en`;
  const url = `https://${scraperConfig.RAPIDAPI_HOST}${endpoint}${queryParams}`;
  
  Logger.log(`Calling RapidAPI URL: ${url}`);

  const options = {
    method: 'get',
    headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': scraperConfig.RAPIDAPI_HOST },
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode >= 300) {
    throw new Error(`RapidAPI failed with status ${responseCode}. Response: ${responseBody}`);
  }
  return JSON.parse(responseBody);
}

/**
 * Appends the scraped lead data to the 'GM - RAW' sheet.
 */
function appendDataToRawSheet(sheet, leadDataArray, region, category) {
  const rawSheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = getHeaderMap(rawSheetHeaders);
  const rowsToAdd = [];
  const todayISO = new Date().toISOString().slice(0, 10);

  if (!leadDataArray || leadDataArray.length === 0) return 0;

  for (const lead of leadDataArray) {
    const newRow = new Array(rawSheetHeaders.length).fill('');
    const rawHeaderMap = getHeaderMap(rawSheetHeaders);

    const fieldsToMap = {
      [scraperConfig.RAW_COL_REGION]: region,
      [scraperConfig.RAW_COL_CATEGORY]: category,
      [scraperConfig.RAW_COL_DATE_SCRAPED]: todayISO,
      [scraperConfig.RAW_COL_PLACE_ID]: lead.place_id,
      [scraperConfig.RAW_COL_GOOGLE_ID]: lead.google_id,
      [scraperConfig.RAW_COL_POSITION]: lead.position,
      [scraperConfig.RAW_COL_NAME]: lead.name,
      [scraperConfig.RAW_COL_REVIEWS]: lead.reviews_count,
      [scraperConfig.RAW_COL_WEBSITE]: lead.website_url,
      [scraperConfig.RAW_COL_MAIN_CATEGORY]: lead.main_category,
      [scraperConfig.RAW_COL_ADDRESS]: lead.address,
      [scraperConfig.RAW_COL_PHONE]: lead.phone,
      [scraperConfig.RAW_COL_RATING]: lead.rating,
      [scraperConfig.RAW_COL_OWNER_URL]: lead.owner_profile_url
    };

    for (const [configKey, value] of Object.entries(fieldsToMap)) {
      const columnIndex = rawHeaderMap[configKey.toLowerCase()];
      if (columnIndex !== undefined) {
        newRow[columnIndex] = value !== undefined ? value : '';
      }
    }
    rowsToAdd.push(newRow);
  }

  if (rowsToAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
  }
  return rowsToAdd.length;
}


/**
 * Sends a notification message to a pre-configured Slack channel.
 */
function sendSlackNotification(message) {
  if (!slackWebhookUrl) {
    Logger.log('Slack Webhook URL not configured. Skipping notification.');
    return;
  }
  const payload = { 'text': `[Leads Scraper] ${message}` };
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) };
  try { UrlFetchApp.fetch(slackWebhookUrl, options); } 
  catch (e) { Logger.log(`Could not send Slack notification. Error: ${e.message}`); }
}

/**
 * Creates a map of header names (converted to lowercase) to their zero-based column index.
 * This function is now case-insensitive.
 * @param {Array<string>} headers An array of header strings from the sheet.
 */
function getHeaderMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    if (header) { 
      map[String(header).trim().toLowerCase()] = index; 
    }
  });
  return map;
}

// --- DEBUGGING FUNCTIONS ---
// (No changes made to the debugging functions)

function debugFindNextRow() {
  Logger.log('--- STARTING DEBUG RUN (using robust getDataRange() method) ---');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(scraperConfig.API_SHEET_NAME);

  if (!sheet) {
    Logger.log(`FATAL ERROR: Could not find the sheet named "${scraperConfig.API_SHEET_NAME}".`);
    return;
  }
  
  const nextJob = findNextRowToProcess(sheet);

  if(nextJob){
    Logger.log(`✅ SUCCESS: Found a job to process: ${JSON.stringify(nextJob)}`);
  } else {
    Logger.log(`❌ FAILED: No processable job was found.`);
  }
  Logger.log('--- DEBUG COMPLETE ---');
}

function ultimateDebug_ReportSheetContents() {
  Logger.log('--- STARTING ULTIMATE DEBUG REPORT ---');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`Operating on spreadsheet: "${ss.getName()}" (ID: ${ss.getId()})`);

    const sheetName = 'API';
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log(`\nFATAL ERROR\nCould not find a sheet named EXACTLY "${sheetName}".`);
      return;
    }
    Logger.log(`Successfully found sheet: "${sheet.getName()}"`);

    const allData = sheet.getDataRange().getValues();
    if (allData.length === 0) {
        Logger.log('FATAL ERROR: The sheet appears to be completely empty.');
        return;
    }

    Logger.log(`Sheet dimensions found: ${allData.length} rows x ${allData[0].length} columns.`);
    Logger.log('-------------------------------------------');
    
    Logger.log('HEADERS (ROW 1) - EXACT VALUES:');
    allData[0].forEach((header, index) => {
      Logger.log(`Column ${index + 1}: "${header}"`);
    });
    Logger.log('-------------------------------------------');
    
    Logger.log('FIRST 5 DATA ROWS (RAW VALUES):');
    const numRowsToLog = Math.min(5, allData.length - 1);

    if (numRowsToLog < 1) {
      Logger.log('No data rows found below the header row.');
    } else {
      for (let i = 1; i <= numRowsToLog; i++) {
        Logger.log(`Row ${i + 1} Data: ${JSON.stringify(allData[i])}`);
      }
    }
    Logger.log('\n--- END OF REPORT ---');
    
  } catch (e) {
    Logger.log(`An unexpected error occurred during the debug function: ${e.toString()} \n${e.stack}`);
  }
}