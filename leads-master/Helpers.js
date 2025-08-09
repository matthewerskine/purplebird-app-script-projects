/**
 * REVERTED to original, stable version.
 * Helper function to create a simple map of header names to column indices.
 * @param {string[]} sheetHeaders An array of header values from a sheet row.
 * @returns {object} A simple map, e.g., {name: 0, phone: 1}.
 */
function getHeaderMap(sheetHeaders) {
  const map = {};
  sheetHeaders.forEach((headerValue, index) => {
    const headerKey = String(headerValue || "").trim();
    if (headerKey) {
      map[headerKey] = index;
    }
  });
  return map;
}

/**
 * Gets all company names from the 'Archived Leads' sheet for de-duplication.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} archivedSheet The sheet object for 'Archived Leads'.
 * @returns {Set<string>} A Set containing all normalized company names from the archive.
 */
function getArchivedCompanyNamesSet(archivedSheet) {
  const nameSet = new Set();
  if (!archivedSheet || archivedSheet.getLastRow() < 2) {
    return nameSet; // Return empty set if sheet is missing or has no data
  }

  // The Archiver script writes the header 'Company Name' from Airtable.
  const headerMap = getHeaderMap(
    archivedSheet
      .getRange(1, 1, 1, archivedSheet.getLastColumn())
      .getValues()[0]
  );
  const nameColIdx = headerMap["Company Name"];

  if (nameColIdx === undefined) {
    Logger.log(
      "Warning: 'Company Name' column not found in Archived Leads sheet."
    );
    return nameSet;
  }

  const names = archivedSheet
    .getRange(2, nameColIdx + 1, archivedSheet.getLastRow() - 1, 1)
    .getValues();
  for (let i = 0; i < names.length; i++) {
    if (names[i][0]) {
      nameSet.add(String(names[i][0]).trim().toLowerCase());
    }
  }
  Logger.log(`Loaded ${nameSet.size} unique names from the archive.`);
  return nameSet;
}

/**
 * Helper function to get all existing company names from a sheet.
 * Corrected to work with the simple getHeaderMap function.
 */
function getExistingCompanyNames(sheet, headerMap) {
  const nameSet = new Set();
  const nameColIdx = headerMap["name"]; // Use string directly

  if (nameColIdx === undefined || sheet.getLastRow() < 2) {
    return nameSet;
  }

  const names = sheet
    .getRange(2, nameColIdx + 1, sheet.getLastRow() - 1, 1)
    .getValues();
  for (let i = 0; i < names.length; i++) {
    if (names[i][0]) {
      nameSet.add(String(names[i][0]).trim().toLowerCase());
    }
  }
  return nameSet;
}

/**
 * Helper function to get company names from RAW sheet before a given row.
 * Corrected to work with the simple getHeaderMap function.
 */
function getPreviousRawNamesSet(sourceSheet, headerMap, startRow) {
  const nameSet = new Set();
  const nameColIdx = headerMap["name"]; // Use string directly

  if (nameColIdx === undefined || startRow <= 2) {
    return nameSet;
  }

  const numRowsToCheck = startRow - 2;
  if (numRowsToCheck <= 0) return nameSet;

  const names = sourceSheet
    .getRange(2, nameColIdx + 1, numRowsToCheck, 1)
    .getValues();

  for (let i = 0; i < names.length; i++) {
    if (names[i][0]) {
      nameSet.add(String(names[i][0]).trim().toLowerCase());
    }
  }
  return nameSet;
}

function createNormalizedSearchFormula(companyName) {
  const normalizedSheetName = companyName
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ");
  const formulaReadySheetName = normalizedSheetName.replace(/"/g, '\\"');
  const formula = `TRIM(LOWER(SUBSTITUTE({${AIRTABLE_FIELD_COMPANY_NAME}},"&","and"))) = "${formulaReadySheetName}"`;
  return `filterByFormula=${encodeURIComponent(formula.trim())}`;
}

function callAirtableApi(
  method,
  payload = null,
  recordId = "",
  queryParams = ""
) {
  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    "Leads"
  )}`;
  if (recordId) url += `/${recordId}`;
  if (queryParams) url += `?${queryParams}`;
  const options = {
    method: method.toLowerCase(),
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
  };
  if (payload) options.payload = JSON.stringify(payload);
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(response.getContentText());
    }
    Logger.log(
      `Airtable API Error: ${response.getResponseCode()} - ${response.getContentText()}`
    );
    return null;
  } catch (e) {
    Logger.log(`Exception during Airtable API call: ${e.toString()}`);
    return null;
  }
}

function getHeightCompanyNamesSet(heightSheet) {
  const nameSet = new Set();
  if (!heightSheet || heightSheet.getLastRow() < 2) {
    return nameSet;
  }

  // Assumes the header for the company name column in your 'Height' sheet is 'name'.
  const headerMap = getHeaderMap(
    heightSheet.getRange(1, 1, 1, heightSheet.getLastColumn()).getValues()[0]
  );
  const nameColIdx = headerMap["name"];

  if (nameColIdx === undefined) {
    Logger.log(
      "Warning: 'name' column not found in the 'Height' sheet. De-duplication against Height data will be skipped."
    );
    return nameSet;
  }

  const names = heightSheet
    .getRange(2, nameColIdx + 1, heightSheet.getLastRow() - 1, 1)
    .getValues();

  for (let i = 0; i < names.length; i++) {
    if (names[i][0]) {
      nameSet.add(String(names[i][0]).trim().toLowerCase());
    }
  }

  Logger.log(
    `Loaded ${nameSet.size} unique names from the Height import for de-duplication.`
  );
  return nameSet;
}

/**
 * Gets all company names from the 'GM - RAW' sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} rawSheet The sheet object for 'GM - RAW'.
 * @returns {Set<string>} A Set of all normalized company names.
 */
function getRawCompanyNamesSet(rawSheet) {
  const nameSet = new Set();
  if (!rawSheet || rawSheet.getLastRow() < 2) return nameSet;
  const headerMap = getHeaderMap(
    rawSheet.getRange(1, 1, 1, rawSheet.getLastColumn()).getValues()[0]
  );
  const nameColIdx = headerMap["name"];
  if (nameColIdx === undefined) return nameSet;
  const names = rawSheet
    .getRange(2, nameColIdx + 1, rawSheet.getLastRow() - 1, 1)
    .getValues();
  for (let i = 0; i < names.length; i++) {
    if (names[i][0]) nameSet.add(String(names[i][0]).trim().toLowerCase());
  }
  return nameSet;
}

/**
 * Gets ALL company names directly from Airtable for de-duplication.
 * Handles pagination to ensure all records are fetched.
 * @returns {Set<string>} A Set of all normalized company names from Airtable.
 */
function getAirtableCompanyNamesSet() {
  const nameSet = new Set();
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    Logger.log("Cannot get Airtable names: API Key or Base ID is missing.");
    return nameSet;
  }

  let offset = null;
  do {
    let queryParams = "fields%5B%5D=Company%20Name"; // Only fetch the 'Company Name' field
    if (offset) {
      queryParams += `&offset=${offset}`;
    }
    const response = callAirtableApi("GET", null, "", queryParams);

    if (response && response.records) {
      response.records.forEach((record) => {
        const companyName = record.fields["Company Name"];
        if (companyName) {
          nameSet.add(String(companyName).trim().toLowerCase());
        }
      });
      offset = response.offset;
    } else {
      offset = null; // Stop if there's an error or no more records
    }
  } while (offset);

  Logger.log(`Loaded ${nameSet.size} unique names from Airtable for auditing.`);
  return nameSet;
}
