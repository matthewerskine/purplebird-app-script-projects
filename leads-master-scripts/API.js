// --- CONFIGURATION ---
// IMPORTANT: Change these values to match your sheet's setup.
const SHEET_NAME = "API"; // The name of the sheet with your leads
const HEADER_ROW_COUNT = 1;     // Usually 1 for the header row

// Define the column numbers (A=1, B=2, etc.) for clarity and easy maintenance
const COLUMN_MAP = {
  REGION: 1,        // A
  CATEGORY: 2,      // B
  PAGE_OFFSET: 3,   // C
  SEARCH_QUERY: 4,  // D
  TARGET_SHEET: 5,  // E
  PROCESSED: 6,     // F
  LAST_PROCESSED: 7,// G
  NOTES: 8,         // H
  VERTICALS: 11,    // K
  CATEGORIES: 12    // L
};
// --- END CONFIGURATION ---


/**
 * Helper function to create the search query string.
 * This makes it easy to customize the format in one place.
 * @param {string} region The region or vertical.
 * @param {string} category The category.
 * @return {string} The formatted search query.
 */
function generateSearchQuery(region, category) {
  // --- CUSTOMIZE YOUR SEARCH QUERY FORMAT HERE ---
  // Example: "plumbers in new york"
  return `${category} in ${region}`;
}


/**
 * Main function to intelligently regenerate the lead list.
 * It finds the highest existing page number and ensures all combinations (new and old)
 * are provisioned up to that page, while preserving the 'processed' status of existing jobs.
 */
function regenerateLeadList() {
  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.alert(
    'Confirm Smart Regeneration',
    'This will rebuild the lead list from Verticals/Categories. It will find the highest page number and ensure ALL combinations are created up to that page. Existing "processed" data will be preserved. Are you sure?',
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    ui.alert('Operation cancelled.');
    return;
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found.`);
    }

    // --- STEP 1: Find the max page number AND preserve the state of every existing job ---
    const lastRow = sheet.getLastRow();
    const processedDataMap = new Map();
    let maxExistingPage = 1; // Default to 1 if the sheet is empty

    if (lastRow > HEADER_ROW_COUNT) {
      const dataRange = sheet.getRange(HEADER_ROW_COUNT + 1, 1, lastRow - HEADER_ROW_COUNT, COLUMN_MAP.NOTES);
      const existingDataValues = dataRange.getValues();
      
      for (const row of existingDataValues) {
        const region = row[COLUMN_MAP.REGION - 1];
        const category = row[COLUMN_MAP.CATEGORY - 1];
        const pageOffset = parseInt(row[COLUMN_MAP.PAGE_OFFSET - 1]) || 1;

        if (region && category) {
          // Find the highest page number across the entire sheet
          if (pageOffset > maxExistingPage) {
            maxExistingPage = pageOffset;
          }

          // Create a unique key that includes the page number
          const key = `${region}|-|${category}|-|${pageOffset}`; 
          
          // Store the state of this specific job (e.g., 'Yes', 'No', 'Failed')
          processedDataMap.set(key, {
            processed: row[COLUMN_MAP.PROCESSED - 1],
            lastProcessed: row[COLUMN_MAP.LAST_PROCESSED - 1],
            notes: row[COLUMN_MAP.NOTES - 1],
            targetSheet: row[COLUMN_MAP.TARGET_SHEET - 1]
          });
        }
      }
    }
    Logger.log(`Scan complete. The highest page found is ${maxExistingPage}.`);


    // --- STEP 2: Read the master source lists ---
    const verticals = sheet.getRange(2, COLUMN_MAP.VERTICALS, sheet.getMaxRows()).getValues().flat().filter(String);
    const categories = sheet.getRange(2, COLUMN_MAP.CATEGORIES, sheet.getMaxRows()).getValues().flat().filter(String);
    
    if (verticals.length === 0 || categories.length === 0) {
      throw new Error('Source "Verticals" (Column K) or "Categories" (Column L) is empty.');
    }

    // --- STEP 3: Generate the new, complete, and fully paginated list ---
    const newDataArray = [];
    for (const vertical of verticals) {
      for (const category of categories) {
        // Create a row for every page from 1 up to the max page we found
        for (let page = 1; page <= maxExistingPage; page++) {
          const newRow = Array(COLUMN_MAP.NOTES).fill('');
          const key = `${vertical}|-|${category}|-|${page}`;

          // Populate the basic info
          newRow[COLUMN_MAP.REGION - 1] = vertical;
          newRow[COLUMN_MAP.CATEGORY - 1] = category;
          newRow[COLUMN_MAP.PAGE_OFFSET - 1] = page;
          newRow[COLUMN_MAP.SEARCH_QUERY - 1] = generateSearchQuery(vertical, category);
          
          // --- STEP 4: Restore old data if it exists, otherwise set as a new job ---
          if (processedDataMap.has(key)) {
            // This job existed before. Restore its status.
            const oldData = processedDataMap.get(key);
            newRow[COLUMN_MAP.PROCESSED - 1] = oldData.processed;
            newRow[COLUMN_MAP.LAST_PROCESSED - 1] = oldData.lastProcessed;
            newRow[COLUMN_MAP.NOTES - 1] = oldData.notes;
            newRow[COLUMN_MAP.TARGET_SHEET - 1] = oldData.targetSheet;
          } else {
            // This is a brand new job (e.g., a new category, or an existing category on a newly created page).
            newRow[COLUMN_MAP.PROCESSED - 1] = "No"; 
          }
          newDataArray.push(newRow);
        }
      }
    }
    
    // --- STEP 5: Clear old data and write the new, complete list back ---
    if (lastRow > HEADER_ROW_COUNT) {
      sheet.getRange(HEADER_ROW_COUNT + 1, 1, lastRow - HEADER_ROW_COUNT, COLUMN_MAP.NOTES).clearContent();
    }
    
    if (newDataArray.length > 0) {
      sheet.getRange(HEADER_ROW_COUNT + 1, 1, newDataArray.length, newDataArray[0].length).setValues(newDataArray);
    }
    
    ui.alert('Success!', `List regenerated up to Page ${maxExistingPage}. ${newDataArray.length} total jobs are now in the queue.`, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('An Error Occurred', e.message, ui.ButtonSet.OK);
    Logger.log(e);
  }
}
/**
 * NEW FUNCTION: Generates the next page for all existing combinations.
 * Finds the max page for each Region/Category and adds a new row for the next page.
 */
function addNextPage() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found. Please check the CONFIGURATION section in the script.`);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= HEADER_ROW_COUNT) {
      ui.alert('No data to process. Please run "Regenerate List" first.');
      return;
    }

    // 1. Read all data and find the max page for each region/category combo.
    const dataRange = sheet.getRange(HEADER_ROW_COUNT + 1, 1, lastRow - HEADER_ROW_COUNT, COLUMN_MAP.NOTES);
    const allData = dataRange.getValues();

    const pageTracker = new Map();
    for (const row of allData) {
      const region = row[COLUMN_MAP.REGION - 1];
      const category = row[COLUMN_MAP.CATEGORY - 1];
      const pageOffset = parseInt(row[COLUMN_MAP.PAGE_OFFSET - 1]) || 0;

      if (region && category) {
        const key = `${region}|-|${category}`;
        const currentMax = pageTracker.has(key) ? pageTracker.get(key).maxPage : -1;
        
        if (pageOffset > currentMax) {
          pageTracker.set(key, { maxPage: pageOffset, templateRow: row });
        } else if (!pageTracker.has(key)) {
          pageTracker.set(key, { maxPage: pageOffset, templateRow: row });
        }
      }
    }

    if (pageTracker.size === 0) {
      ui.alert('No valid Region/Category combinations found to process.');
      return;
    }

    // 2. Generate new rows for the next page
    const rowsToAdd = [];
    for (const [key, data] of pageTracker.entries()) {
      const { maxPage, templateRow } = data;
      const newPage = maxPage + 1;
      
      const newRow = [...templateRow];

      // 3. Update the values for the new page row
      newRow[COLUMN_MAP.PAGE_OFFSET - 1] = newPage;
      newRow[COLUMN_MAP.PROCESSED - 1] = 'No';
      newRow[COLUMN_MAP.LAST_PROCESSED - 1] = '';
      newRow[COLUMN_MAP.NOTES - 1] = '';

      rowsToAdd.push(newRow);
    }

    // 4. Append the new rows to the sheet
    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
      ui.alert('Success!', `${rowsToAdd.length} rows for the next page have been added and are ready for processing.`, ui.ButtonSet.OK);
    } else {
      ui.alert('No new pages were added.');
    }

  } catch (e) {
    ui.alert('An Error Occurred', e.message, ui.ButtonSet.OK);
    Logger.log(e);
  }
}