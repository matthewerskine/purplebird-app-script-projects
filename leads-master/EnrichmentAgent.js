// -------- API KEYS (from Script Properties) --------
const OPENROUTER_API_KEY =
  PropertiesService.getScriptProperties().getProperty("OPENROUTER_API_KEY");
const COMPANIES_HOUSE_API_KEY =
  PropertiesService.getScriptProperties().getProperty(
    "COMPANIES_HOUSE_API_KEY"
  );
const SLACK_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL");

// -------- CONFIGURATION --------
const OPENROUTER_MODEL_RESEARCH_ONLINE =
  "mistralai/mistral-7b-instruct:free:online";
const OPENROUTER_MODEL_ANALYSIS = "mistralai/mistral-7b-instruct:free";
const OPENROUTER_MAX_CALLS_PER_WINDOW = 5;
const OPENROUTER_WINDOW_SECONDS = 60;
const OPENROUTER_REFERER = "https://script.google.com";
const OPENROUTER_PROJECT_TITLE = "AppsScript Enrichment Agent";
const WEBSITE_CONTENT_MAX_CHARS = 20000;
const OUTDATED_THRESHOLD_YEAR = new Date().getFullYear() - 4;

/**
 * Sends a notification message to a pre-configured Slack channel.
 */
function sendSlackNotification(message) {
  if (!SLACK_WEBHOOK_URL) {
    Logger.log('Slack Webhook URL not configured. Skipping notification.');
    return;
  }
  const payload = { 'text': `[Enrichment Agent] ${message}` };
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) };
  try { 
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options); 
  } catch (e) { 
    Logger.log(`Could not send Slack notification. Error: ${e.message}`); 
  }
}

// --- Field & Column Mappings ---
const FIELD_KEYS_COMPANY_STATUS = {
  title: "name",
  address: "address",
  postalCode: "postalCode",
  city: "city",
  website: "websiteUrl",
};
const OUTPUT_COLUMN_NAMES_COMPANY_STATUS = {
  company_number: "verifyCompanyStatus.companyNumber",
  trading_status: "verifyCompanyStatus.tradingStatus",
  confidence: "verifyCompanyStatus.confidence",
};

const FIELD_KEYS_ATTRIBUTION = { website: "websiteUrl" };
const OUTPUT_COLUMN_NAMES_ATTRIBUTION = {
  lastUpdatedDate: "attribution.lastUpdatedDate",
  agencyName: "attribution.agencyName",
  attributionYear: "attribution.attributionYear",
  isOutdated: "attribution.isOutdated",
  confidence: "attribution.confidence",
};

const FIELD_KEYS_EMAIL = { website: "websiteUrl" };
const OUTPUT_COLUMN_NAMES_EMAIL = { email: "extractEmail.email" };

const FIELD_KEYS_ADS = { website: "websiteUrl" };
const OUTPUT_COLUMN_NAMES_ADS = {
  isRunningAds: "extractAds.isRunningAds",
  google: "extractAds.google",
  facebook: "extractAds.facebook",
  linkedin: "extractAds.linkedin",
  tiktok: "extractAds.tiktok",
  twitter: "extractAds.twitter",
  googleAdsLink: "extractAds.googleAdsLink",
};

// --- CONFIGURATION ---
const MAX_ROWS_PER_RUN = 8;
const ENRICHMENT_STATUS_COLUMN = "enrichmentMeta.status"; // *** CORRECTED TYPO HERE ***
const ENRICHMENT_NOTES_COLUMN = "enrichmentMeta.notes";
const STATUS_PENDING = "Pending";
const STATUS_IN_PROGRESS = "In Progress";
const STATUS_COMPLETE = "Complete";
const STATUS_ERROR = "Error";

function processPendingRowsBatch() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log(
      "Another enrichment process is already running. Skipping this run."
    );
    return;
  }

  try {
    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GM - Qualify");
    if (!sheet) {
      Logger.log('Could not find "GM - Qualify" sheet.');
      return;
    }

    const allSheetData = sheet.getDataRange().getValues();
    const setup = setupSheetProcessing(
      sheet,
      allSheetData,
      {},
      { status: ENRICHMENT_STATUS_COLUMN, notes: ENRICHMENT_NOTES_COLUMN }
    );
    if (!setup) {
      Logger.log("Sheet setup failed, likely an empty sheet. Exiting.");
      return;
    }
    const statusColIdx = setup.outputIndices.status;
    const notesColIdx = setup.outputIndices.notes;

    if (statusColIdx === undefined) {
      Logger.log(
        "❌ enrichmentMeta.status column not found. Enrichment cannot proceed."
      );
      return;
    }

    const rowsToProcess = [];
    const statusData = sheet
      .getRange(2, statusColIdx + 1, sheet.getLastRow() - 1, 1)
      .getValues();

    for (let i = 0; i < statusData.length; i++) {
      const status = String(statusData[i][0]).trim();
      if (
        status.toLowerCase() === "" ||
        status.toLowerCase() === STATUS_PENDING.toLowerCase()
      ) {
        rowsToProcess.push(i + 2);
        if (rowsToProcess.length >= MAX_ROWS_PER_RUN) {
          break;
        }
      }
    }

    if (rowsToProcess.length === 0) {
      Logger.log("No pending rows to process.");
      return;
    }

    Logger.log(
      `Starting batch processing for ${
        rowsToProcess.length
      } rows: [${rowsToProcess.join(", ")}]`
    );
    
    // Send Slack notification for batch start
    sendSlackNotification(`🔄 Starting enrichment batch: ${rowsToProcess.length} rows`);
    for (const rowNum of rowsToProcess) {
      sheet.getRange(rowNum, statusColIdx + 1).setValue(STATUS_IN_PROGRESS);
    }
    SpreadsheetApp.flush();

    for (const rowNum of rowsToProcess) {
      const statusCell = sheet.getRange(rowNum, statusColIdx + 1);
      const notesCell =
        notesColIdx !== undefined
          ? sheet.getRange(rowNum, notesColIdx + 1)
          : null;

      try {
        Logger.log(`Processing row ${rowNum}...`);
        const singleRowRange = sheet.getRange(
          rowNum,
          1,
          1,
          sheet.getLastColumn()
        );

        verifyCompanyStatusFree_bg(sheet, singleRowRange);
        extractEmail_bg(sheet, singleRowRange);
        extractAdPresence_bg(sheet, singleRowRange);
        verifyAttribution_bg(sheet, singleRowRange);

        statusCell.setValue(STATUS_COMPLETE);
        if (notesCell) {
          notesCell.setNote(
            `Successfully enriched on ${new Date().toLocaleString()}`
          );
        }
        Logger.log(`Successfully processed row ${rowNum}.`);
      } catch (e) {
        const errorMessage = `Error processing row ${rowNum}: ${e.message} (Stack: ${e.stack})`;
        Logger.log(errorMessage);
        statusCell.setValue(STATUS_ERROR);
        if (notesCell) {
          notesCell.setNote(errorMessage);
        }
      }
    }
    Logger.log("Batch processing complete.");
    sendSlackNotification(`✅ Enrichment batch completed successfully`);
  } finally {
    lock.releaseLock();
    Logger.log("Lock released, batch processing finished.");
  }
}

/**
 * Allows operatives to manually reset the status of selected rows to 'Pending'.
 */
function resetEnrichmentStatus() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();

  if (sheet.getName() !== "GM - Qualify") {
    ui.alert('This function can only be run on the "GM - Qualify" sheet.');
    return;
  }

  const selection = sheet.getActiveRange();
  if (!selection || selection.isBlank()) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Please select rows to reset.",
      "No Selection",
      5
    );
    return;
  }

  const headerMap = getHeaderMap(
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  );
  const statusColIdx = headerMap[ENRICHMENT_STATUS_COLUMN];
  const notesColIdx = headerMap[ENRICHMENT_NOTES_COLUMN];

  if (statusColIdx === undefined) {
    ui.alert(
      `Status column "${ENRICHMENT_STATUS_COLUMN}" not found. Cannot reset status.`
    );
    return;
  }

  const statusColumn = sheet.getRange(
    selection.getRow(),
    statusColIdx + 1,
    selection.getNumRows(),
    1
  );
  statusColumn.setValue(STATUS_PENDING);

  if (notesColIdx !== undefined) {
    const notesColumn = sheet.getRange(
      selection.getRow(),
      notesColIdx + 1,
      selection.getNumRows(),
      1
    );
    notesColumn.clearNote();
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    `${selection.getNumRows()} row(s) have been re-queued for enrichment.`
  );
}

// ===================================================================================
//  BACKGROUND-SAFE ENRICHMENT FUNCTIONS
//  These functions are called by the AsyncProcessor and do not show UI alerts.
// ===================================================================================

/**
 * BG-safe: Verifies company status using a two-step "Fast Lane" and "Detective" fallback process.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The active sheet object.
 * @param {GoogleAppsScript.Spreadsheet.Range} selection The range of rows to process.
 * @returns {object} A summary object { processed: number, errors: number }.
 */
function verifyCompanyStatusFree_bg(sheet, selection) {
  if (!COMPANIES_HOUSE_API_KEY || !OPENROUTER_API_KEY) {
    const errorMsg = "Missing API keys for company verification. COMPANIES_HOUSE_API_KEY or OPENROUTER_API_KEY not configured.";
    Logger.log(errorMsg);
    sendSlackNotification(`🚨 ${errorMsg}`);
    return { processed: 0, errors: selection.getNumRows() };
  }

  const allSheetData = sheet.getDataRange().getValues();
  const setup = setupSheetProcessing(
    sheet,
    allSheetData,
    FIELD_KEYS_COMPANY_STATUS,
    OUTPUT_COLUMN_NAMES_COMPANY_STATUS
  );
  if (!setup) return { processed: 0, errors: selection.getNumRows() };

  const { fieldIndices, outputIndices } = setup;
  let processedCount = 0,
    errorCount = 0;

  for (let r = 0; r < selection.getNumRows(); r++) {
    const rowNumForLogging = selection.getRow() + r;
    if (rowNumForLogging === 1) continue;

    const rowData = allSheetData[rowNumForLogging - 1];
    const inputFields = {};
    for (const key of Object.keys(FIELD_KEYS_COMPANY_STATUS)) {
      inputFields[key] =
        fieldIndices[key] !== null
          ? String(rowData[fieldIndices[key]] || "").trim()
          : "";
    }

    try {
      const chResult = searchCompaniesHouseAPI(
        inputFields.title,
        inputFields.postalCode,
        inputFields.city
      );
      if (chResult && chResult.companyData) {
        // High-confidence success
        Logger.log(
          `BG-Success (Row ${rowNumForLogging}): High-confidence CH match via ${chResult.matchMethod}.`
        );
        const formatPrompt = `You are an AI assistant. Extract details from this JSON: ${JSON.stringify(
          chResult.companyData
        )}. Instructions: Extract 'company_number', 'company_name', and 'company_status'. Set 'confidence' to "High". For 'reasoning', state the match was via "${
          chResult.matchMethod
        }". For 'trading_status', use 'company_status'. IMPORTANT: Only extract the actual company_number from the JSON data. If no company_number is present in the data, return null or empty string. DO NOT generate fake or placeholder numbers like 12345678. Return strictly valid JSON: { "company_number": "string_or_null", "trading_status": "string", "confidence": "High", "reasoning": "string" }`;
        const resultString = callOpenRouter(
          formatPrompt,
          OPENROUTER_MODEL_ANALYSIS
        );
        const parsed = JSON.parse(resultString);
        
        // Validate company number for suspicious values
        if (parsed.company_number && /^12345678$|^00000000$|^99999999$/.test(parsed.company_number)) {
          const warningMsg = `Suspicious company number detected: ${parsed.company_number} for company "${inputFields.title}" (Row ${rowNumForLogging}). Setting to null.`;
          Logger.log(`BG-Warn (Row ${rowNumForLogging}): ${warningMsg}`);
          sendSlackNotification(`⚠️ ${warningMsg}`);
          parsed.company_number = null;
        }
        
        for (const [key, colIdx] of Object.entries(outputIndices)) {
          sheet
            .getRange(rowNumForLogging, colIdx + 1)
            .setValue(parsed[key] || "");
        }
        if (outputIndices["confidence"] !== undefined && parsed["reasoning"]) {
          sheet
            .getRange(rowNumForLogging, outputIndices["confidence"] + 1)
            .setNote(String(parsed["reasoning"]));
        }
      } else {
        // Fallback "Detective" mode
        Logger.log(
          `BG-Info (Row ${rowNumForLogging}): Advanced CH Search failed. Initiating fallback.`
        );
        if (!inputFields.website) {
          Logger.log(
            `BG-Warn (Row ${rowNumForLogging}): Fallback failed. No website URL.`
          );
          sheet
            .getRange(rowNumForLogging, outputIndices.trading_status + 1)
            .setValue("Not Found (No Website)");
          sheet
            .getRange(rowNumForLogging, outputIndices.confidence + 1)
            .setValue("Low")
            .setNote("Advanced search failed and no website was available.");
          continue;
        }
        let siteContent = "",
          chCandidates = null;
        try {
          const response = UrlFetchApp.fetch(inputFields.website, {
            muteHttpExceptions: true,
            validateHttpsCertificates: false,
            followRedirects: true,
          });
          if (response.getResponseCode() === 200) {
            siteContent = response
              .getContentText()
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (siteContent.length > 15000)
              siteContent =
                siteContent.substring(0, 7500) +
                " ...TRUNCATED... " +
                siteContent.substring(siteContent.length - 7500);
          }
        } catch (e) {
          Logger.log(
            `BG-Warn (Row ${rowNumForLogging}): Could not fetch website. ${e.message}`
          );
        }
        try {
          const basicSearchUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(
            inputFields.title
          )}&items_per_page=5`;
          const chResponse = UrlFetchApp.fetch(basicSearchUrl, {
            headers: {
              Authorization:
                "Basic " +
                Utilities.base64Encode(COMPANIES_HOUSE_API_KEY + ":"),
            },
            muteHttpExceptions: true,
          });
          if (chResponse.getResponseCode() === 200)
            chCandidates = JSON.parse(chResponse.getContentText()).items;
        } catch (e) {
          Logger.log(
            `BG-Warn (Row ${rowNumForLogging}): Could not fetch CH candidates. ${e.message}`
          );
        }

        const detectivePrompt = `You are an expert business analyst. Find the correct UK legal entity. Evidence: 1. Lead Data: Name: "${
          inputFields.title
        }", Address: "${inputFields.address}", Website: "${
          inputFields.website
        }". 2. Website Text: ${
          siteContent || "Could not fetch."
        }. 3. Potential CH Candidates: ${
          chCandidates
            ? JSON.stringify(chCandidates, null, 2)
            : "Could not fetch."
        }. Mission: Analyze website text for the true registered name. Compare with candidates. Decide the single best match. Output: If a strong match is found, extract its 'company_number' and 'company_status' (use for 'trading_status'). Your 'confidence' must be High (explicit match), Medium (inferred), or Low (no link). Provide brief 'reasoning'. IMPORTANT: Only extract actual company numbers from the provided data. If no company number is found in the candidates or website text, return null or empty string for company_number. DO NOT generate fake or placeholder numbers like 12345678. Return strictly valid JSON: { "company_number": "string_or_null", "trading_status": "string", "confidence": "High|Medium|Low", "reasoning": "string" }`;
        const resultString = callOpenRouter(
          detectivePrompt,
          OPENROUTER_MODEL_ANALYSIS
        );
        const parsed = JSON.parse(resultString);
        
        // Validate company number for suspicious values
        if (parsed.company_number && /^12345678$|^00000000$|^99999999$/.test(parsed.company_number)) {
          const warningMsg = `Suspicious company number detected: ${parsed.company_number} for company "${inputFields.title}" (Row ${rowNumForLogging}). Setting to null.`;
          Logger.log(`BG-Warn (Row ${rowNumForLogging}): ${warningMsg}`);
          sendSlackNotification(`⚠️ ${warningMsg}`);
          parsed.company_number = null;
        }
        
        for (const [key, colIdx] of Object.entries(outputIndices)) {
          sheet
            .getRange(rowNumForLogging, colIdx + 1)
            .setValue(parsed[key] || "");
        }
        if (outputIndices["confidence"] !== undefined && parsed["reasoning"]) {
          sheet
            .getRange(rowNumForLogging, outputIndices["confidence"] + 1)
            .setNote(String(parsed["reasoning"]));
        }
      }
      processedCount++;
    } catch (err) {
      errorCount++;
      const errorMessage = `BG-Error (Row ${rowNumForLogging}): ${err.message}`;
      Logger.log(errorMessage + (err.stack ? `\nStack: ${err.stack}` : ""));
      
      // Send critical errors to Slack
      if (err.message.includes('API') || err.message.includes('rate limit') || err.message.includes('quota')) {
        sendSlackNotification(`🚨 Critical Error (Row ${rowNumForLogging}): ${err.message}`);
      }
      
      const firstColIdx = outputIndices[Object.keys(outputIndices)[0]];
      if (firstColIdx !== undefined)
        sheet
          .getRange(rowNumForLogging, firstColIdx + 1)
          .setValue("")
          .setNote(err.message);
    }
  }
  return { processed: processedCount, errors: errorCount };
}

/**
 * BG-safe: Scans websites for attribution details.
 */
function verifyAttribution_bg(sheet, selection) {
  if (!OPENROUTER_API_KEY) {
    const errorMsg = "Missing OPENROUTER_API_KEY for attribution verification.";
    Logger.log(errorMsg);
    sendSlackNotification(`🚨 ${errorMsg}`);
    return { processed: 0, errors: selection.getNumRows() };
  }
  const allSheetData = sheet.getDataRange().getValues();
  const setup = setupSheetProcessing(
    sheet,
    allSheetData,
    FIELD_KEYS_ATTRIBUTION,
    OUTPUT_COLUMN_NAMES_ATTRIBUTION
  );
  if (!setup) return { processed: 0, errors: selection.getNumRows() };

  const { fieldIndices, outputIndices } = setup;
  let processedCount = 0,
    errorCount = 0;

  for (let r = 0; r < selection.getNumRows(); r++) {
    const rowNumForLogging = selection.getRow() + r;
    if (rowNumForLogging === 1) continue;

    const rowData = allSheetData[rowNumForLogging - 1];
    const websiteUrl =
      fieldIndices.website !== null
        ? String(rowData[fieldIndices.website] || "").trim()
        : "";

    if (
      !websiteUrl ||
      !(websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://"))
    ) {
      errorCount++;
      if (Object.keys(outputIndices).length > 0)
        sheet
          .getRange(
            rowNumForLogging,
            outputIndices[Object.keys(outputIndices)[0]] + 1
          )
          .setValue("Invalid URL");
      continue;
    }

    let siteContent = "";
    try {
      const response = UrlFetchApp.fetch(websiteUrl, {
        muteHttpExceptions: true,
        validateHttpsCertificates: false,
        followRedirects: true,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (response.getResponseCode() === 200) {
        siteContent = response
          .getContentText()
          .replace(
            /<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>|<[^>]+>/g,
            " "
          )
          .replace(/\s+/g, " ")
          .trim();
        if (siteContent.length > WEBSITE_CONTENT_MAX_CHARS)
          siteContent = siteContent.substring(0, WEBSITE_CONTENT_MAX_CHARS);
      } else {
        throw new Error(`HTTP ${response.getResponseCode()}`);
      }
    } catch (e) {
      errorCount++;
      Logger.log(
        `BG-Error (Row ${rowNumForLogging}): Fetch error for ${websiteUrl}: ${e.message}`
      );
      if (Object.keys(outputIndices).length > 0)
        sheet
          .getRange(
            rowNumForLogging,
            outputIndices[Object.keys(outputIndices)[0]] + 1
          )
          .setValue(`Fetch Error`);
      continue;
    }

    const prompt = `Analyze this website text for attribution. Focus on footers/copyrights. Instructions: 1. Find 'lastUpdatedDate' (e.g., "Copyright © 2024") and 'attributionYear' (e.g., 2024). Use latest year in a range. 2. Find 'agencyName'. Look for "Website by...", etc. CRITICAL: Do NOT list CMS (WordPress, Wix, Squarespace) or plugins as the agency. If only a CMS is mentioned, use "In-house" or "Not found". 3. 'isOutdated': "Yes" if year < ${OUTDATED_THRESHOLD_YEAR}, else "No". 4. 'confidence': High (explicit), Medium (inferred), Low (none). 5. 'reasoning': Brief explanation. Return strictly valid JSON: { "lastUpdatedDate": "string_or_null", "agencyName": "string", "attributionYear": integer_or_null, "isOutdated": "Yes|No|Unknown", "confidence": "High|Medium|Low", "reasoning": "string" } --- TEXT: ${siteContent}`;
    try {
      const resultString = callOpenRouter(prompt, OPENROUTER_MODEL_ANALYSIS);
      let parsed = JSON.parse(resultString);
      if (parsed.attributionYear)
        parsed.isOutdated =
          parseInt(parsed.attributionYear) < OUTDATED_THRESHOLD_YEAR
            ? "Yes"
            : "No";
      else parsed.isOutdated = "Unknown";
      for (const [key, colIdx] of Object.entries(outputIndices)) {
        sheet
          .getRange(rowNumForLogging, colIdx + 1)
          .setValue(parsed[key] !== null ? parsed[key] : "");
      }
      if (outputIndices["confidence"] !== undefined && parsed["reasoning"]) {
        sheet
          .getRange(rowNumForLogging, outputIndices["confidence"] + 1)
          .setNote(String(parsed["reasoning"]));
      }
      processedCount++;
    } catch (e) {
      errorCount++;
      Logger.log(
        `BG-Error (Row ${rowNumForLogging}): LLM/Parse error: ${e.message}`
      );
      if (Object.keys(outputIndices).length > 0)
        sheet
          .getRange(
            rowNumForLogging,
            outputIndices[Object.keys(outputIndices)[0]] + 1
          )
          .setValue("LLM Error");
    }
  }
  return { processed: processedCount, errors: errorCount };
}

/**
 * BG-safe: Scans website pages for the first valid contact email.
 */
function extractEmail_bg(sheet, selection) {
  const allSheetData = sheet.getDataRange().getValues();
  const setup = setupSheetProcessing(
    sheet,
    allSheetData,
    FIELD_KEYS_EMAIL,
    OUTPUT_COLUMN_NAMES_EMAIL
  );
  if (!setup) return { processed: 0, errors: selection.getNumRows() };

  const { fieldIndices, outputIndices } = setup;
  let processedCount = 0,
    errorCount = 0;

  for (let r = 0; r < selection.getNumRows(); r++) {
    const rowNumForLogging = selection.getRow() + r;
    if (rowNumForLogging === 1) continue;

    const rowData = allSheetData[rowNumForLogging - 1];
    const websiteUrl =
      fieldIndices.website !== null
        ? String(rowData[fieldIndices.website] || "").trim()
        : "";

    if (
      !websiteUrl ||
      !(websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://"))
    ) {
      errorCount++;
      sheet
        .getRange(rowNumForLogging, outputIndices.email + 1)
        .setValue("")
        .setNote("Invalid URL");
      continue;
    }

    try {
      const baseUrlMatch = websiteUrl.match(/^(https?:\/\/[^\/]+)/);
      const baseUrl = baseUrlMatch ? baseUrlMatch[0] : websiteUrl;
      const uniqueUrlsToTry = [
        ...new Set([websiteUrl, baseUrl + "/contact", baseUrl + "/contact-us"]),
      ];
      let finalEmail = null;

      for (const url of uniqueUrlsToTry) {
        let htmlContent;
        try {
          const response = UrlFetchApp.fetch(url, {
            muteHttpExceptions: true,
            validateHttpsCertificates: false,
            followRedirects: true,
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (response.getResponseCode() === 200)
            htmlContent = response.getContentText();
          else continue;
        } catch (e) {
          continue;
        }
        const potentialMatches = htmlContent.match(
          /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi
        );
        if (potentialMatches) {
          for (const email of potentialMatches) {
            if (_isValidContactEmail(email)) {
              finalEmail = email.toLowerCase();
              break;
            }
          }
        }
        if (finalEmail) break;
      }
      sheet
        .getRange(rowNumForLogging, outputIndices.email + 1)
        .setValue(finalEmail)
        .setNote(finalEmail ? `Found via scan.` : "No valid email found.");
      processedCount++;
    } catch (err) {
      errorCount++;
      Logger.log(
        `BG-Error (Row ${rowNumForLogging}): Script error during email scan: ${err.message}`
      );
      sheet
        .getRange(rowNumForLogging, outputIndices.email + 1)
        .setValue("")
        .setNote(err.message);
    }
  }
  return { processed: processedCount, errors: errorCount };
}

/**
 * BG-safe: Scans websites for ad platform pixels.
 */
function extractAdPresence_bg(sheet, selection) {
  const allSheetData = sheet.getDataRange().getValues();
  const setup = setupSheetProcessing(
    sheet,
    allSheetData,
    FIELD_KEYS_ADS,
    OUTPUT_COLUMN_NAMES_ADS
  );
  if (!setup) return { processed: 0, errors: selection.getNumRows() };

  const { fieldIndices, outputIndices } = setup;
  let processedCount = 0,
    errorCount = 0;

  for (let r = 0; r < selection.getNumRows(); r++) {
    const rowNumForLogging = selection.getRow() + r;
    if (rowNumForLogging === 1) continue;

    const rowData = allSheetData[rowNumForLogging - 1];
    const websiteUrl =
      fieldIndices.website !== null
        ? String(rowData[fieldIndices.website] || "").trim()
        : "";

    if (
      !websiteUrl ||
      !(websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://"))
    ) {
      errorCount++;
      sheet
        .getRange(rowNumForLogging, outputIndices.isRunningAds + 1)
        .setValue("Invalid URL");
      continue;
    }

    try {
      const scanResult = _scanForAdPixels(websiteUrl);
      if (scanResult.error) {
        sheet
          .getRange(rowNumForLogging, outputIndices.isRunningAds + 1)
          .setValue("Error")
          .setNote(scanResult.error);
        errorCount++;
        continue;
      }
      let isRunningAnyAds = false,
        foundPlatforms = [];
      for (const platform in scanResult) {
        if (platform === "error") continue;
        const isPresent = scanResult[platform];
        if (isPresent) {
          isRunningAnyAds = true;
          foundPlatforms.push(capitalize(platform));
        }
        if (outputIndices[platform] !== undefined)
          sheet
            .getRange(rowNumForLogging, outputIndices[platform] + 1)
            .setValue(isPresent ? "Yes" : "No");
      }
      sheet
        .getRange(rowNumForLogging, outputIndices.isRunningAds + 1)
        .setValue(isRunningAnyAds ? "Yes" : "No")
        .setNote(
          isRunningAnyAds
            ? `Found: ${foundPlatforms.join(", ")}`
            : "No tags found."
        );
      if (scanResult.google) {
        const cleanDomain = websiteUrl
          .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
          .split("/")[0];
        const transparencyLink = `https://adstransparency.google.com/?region=GB&domain=${encodeURIComponent(
          cleanDomain
        )}`;
        sheet
          .getRange(rowNumForLogging, outputIndices.googleAdsLink + 1)
          .setValue(transparencyLink);
      } else {
        sheet
          .getRange(rowNumForLogging, outputIndices.googleAdsLink + 1)
          .setValue("");
      }
      processedCount++;
    } catch (err) {
      errorCount++;
      Logger.log(
        `BG-Error (Row ${rowNumForLogging}): Script error during ad scan: ${err.message}`
      );
      
      // Send critical errors to Slack
      if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('timeout')) {
        sendSlackNotification(`🚨 Ad Scan Error (Row ${rowNumForLogging}): ${err.message}`);
      }
      
      sheet
        .getRange(rowNumForLogging, outputIndices.isRunningAds + 1)
        .setValue("")
        .setNote(err.message);
    }
  }
  return { processed: processedCount, errors: errorCount };
}

// ===================================================================================
//  HELPER FUNCTIONS (UNCHANGED)
// ===================================================================================

function callOpenRouter(
  prompt,
  model,
  systemContent = "You are an AI assistant that returns strictly valid JSON. No markdown, no explanations outside the JSON, just the JSON object."
) {
  if (!OPENROUTER_API_KEY)
    throw new Error("OPENROUTER_API_KEY is not set in Script Properties.");
  if (!model || typeof model !== "string" || model.trim() === "")
    throw new Error("INVALID_MODEL_PROVIDED_TO_CALLOPENROUTER");

  const cache = CacheService.getUserCache(),
    cacheKey = "OPENROUTER_API_TIMESTAMPS_V2";
  let requestTimestamps = [];
  const rawCachedTimestamps = cache.get(cacheKey);
  if (rawCachedTimestamps) {
    try {
      requestTimestamps = JSON.parse(rawCachedTimestamps);
      if (!Array.isArray(requestTimestamps)) requestTimestamps = [];
    } catch (e) {
      requestTimestamps = [];
    }
  }
  let now = new Date().getTime(),
    windowStartTime = now - OPENROUTER_WINDOW_SECONDS * 1000;
  requestTimestamps = requestTimestamps.filter(
    (timestamp) => timestamp > windowStartTime
  );
  if (requestTimestamps.length >= OPENROUTER_MAX_CALLS_PER_WINDOW) {
    requestTimestamps.sort((a, b) => a - b);
    let timeToWait =
      requestTimestamps[0] + OPENROUTER_WINDOW_SECONDS * 1000 - now;
    if (timeToWait > 0) {
      Logger.log(
        `OpenRouter rate limit hit. Waiting ${Math.ceil(timeToWait / 1000)}s.`
      );
      Utilities.sleep(timeToWait);
    }
  }
  requestTimestamps.push(new Date().getTime());
  cache.put(
    cacheKey,
    JSON.stringify(requestTimestamps),
    OPENROUTER_WINDOW_SECONDS
  );

  const url = "https://openrouter.ai/api/v1/chat/completions";
  const payload = {
    model: model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_PROJECT_TITLE,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  if (responseCode !== 200)
    throw new Error(
      `OpenRouter API error (model: ${model}): ${responseCode} - ${responseText}`
    );
  try {
    const jsonResponse = JSON.parse(responseText);
    const messageContent = jsonResponse.choices[0].message.content;
    try {
      JSON.parse(messageContent);
      return messageContent;
    } catch (e) {
      const jsonMatch = messageContent.match(/\{[\s\S]*?\}/);
      if (jsonMatch) return jsonMatch[0];
      throw new Error(
        `Model ${model} returned non-JSON: ${messageContent.substring(0, 100)}`
      );
    }
  } catch (e) {
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) return jsonMatch[0];
    throw new Error(`Failed to parse JSON from ${model}: ${e.message}`);
  }
}

function setupSheetProcessing(sheet, data, fieldKeys, outputColumnNames) {
  if (!data || data.length === 0) return null;

  // Use standard getHeaderMap function for consistency
  const initialHeaders = data[0].map((h) => String(h).trim());
  const initialHeaderMap = getHeaderMap(initialHeaders);

  const fieldIndices = {};
  for (const [key, headerName] of Object.entries(fieldKeys)) {
    const index = initialHeaderMap[headerName];
    fieldIndices[key] = index === undefined ? null : index;
  }

  // Get current sheet headers using standard function
  const currentSheetHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn() > 0 ? sheet.getLastColumn() : 1)
    .getValues()[0];
  const currentSheetHeaderMap = getHeaderMap(currentSheetHeaders);

  // CRITICAL FIX: Don't add columns, just find existing ones
  const outputIndices = {};
  for (const [key, label] of Object.entries(outputColumnNames)) {
    const index = currentSheetHeaderMap[label];
    if (index === undefined) {
      Logger.log(
        `Warning: Column "${label}" not found in sheet. Enrichment may not work properly.`
      );
    }
    outputIndices[key] = index;
  }

  return { fieldIndices, outputIndices };
}

function searchCompaniesHouseAPI(companyName, postalCode, city) {
  if (!COMPANIES_HOUSE_API_KEY || !companyName) return null;
  const chApiOptions = {
    method: "get",
    headers: {
      Authorization:
        "Basic " + Utilities.base64Encode(COMPANIES_HOUSE_API_KEY + ":"),
    },
    contentType: "application/json",
    muteHttpExceptions: true,
  };
  const baseUrl =
    "https://api.company-information.service.gov.uk/advanced-search/companies";
  function _execute(params) {
    const queryParams = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const response = UrlFetchApp.fetch(
      `${baseUrl}?${queryParams}`,
      chApiOptions
    );
    if (response.getResponseCode() !== 200) return null;
    const results = JSON.parse(response.getContentText());
    return results && results.items && results.items.length > 0
      ? results.items
      : null;
  }
  let results;
  if (postalCode) {
    results = _execute({
      company_name_includes: companyName,
      location: postalCode,
    });
    if (results) return { companyData: results[0], matchMethod: "Postal Code" };
  }
  if (city) {
    results = _execute({ company_name_includes: companyName, location: city });
    if (results) return { companyData: results[0], matchMethod: "City" };
  }
  return null;
}

function _isValidContactEmail(email) {
  if (!email || typeof email !== "string") return false;
  const lowerEmail = email.toLowerCase();
  const blacklistedDomains = ["example.com", "domain.com", "wixpress.com"];
  const blacklistedPrefixes = [
    "user@",
    "test@",
    "wordpress@",
    "email@",
    "[email protected]",
  ];
  const blacklistedEmails = ["get in touch"];
  if (
    blacklistedDomains.some((d) => lowerEmail.endsWith(d)) ||
    blacklistedPrefixes.some((p) => lowerEmail.startsWith(p)) ||
    blacklistedEmails.includes(lowerEmail) ||
    /^[a-f0-9]{20,}@/.test(lowerEmail) ||
    /\s/.test(lowerEmail)
  ) {
    return false;
  }
  return true;
}

function _scanForAdPixels(url) {
  const adPlatformFingerprints = {
    google: /gtag\('config', 'AW-|google_ad_/i,
    facebook: /fbq\('init'/i,
    linkedin: /linkedin_partner_id|ads\.linkedin\.com/i,
    tiktok: /analytics\.tiktok\.com/i,
    twitter: /twq\('init'/i,
  };
  const results = {
    google: false,
    facebook: false,
    linkedin: false,
    tiktok: false,
    twitter: false,
    error: null,
  };
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      validateHttpsCertificates: false,
      followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (response.getResponseCode() >= 300)
      throw new Error(`HTTP ${response.getResponseCode()}`);
    const htmlContent = response.getContentText();
    for (const platform in adPlatformFingerprints) {
      if (adPlatformFingerprints[platform].test(htmlContent))
        results[platform] = true;
    }
  } catch (e) {
    results.error = `Fetch/scan failed: ${e.message}`;
  }
  return results;
}

function capitalize(str) {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
