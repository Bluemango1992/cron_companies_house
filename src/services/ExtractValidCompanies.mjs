import { readFile, writeFile } from 'fs/promises'; // Import readFile and writeFile from fs/promises
import { join } from 'path';
import processCompanies from './processCompanies.mjs';
import appendLatLongToCompanies from './appendLatLongToCompanies.mjs';
import appendToDbJson from './appendToDbJson.mjs';

const companyCacheFilePath = join('./companyCache.json');

// Function to load JSON from the company cache file
const loadJSON = async (filePath) => {
  try {
    const data = await readFile(filePath, 'utf-8');
    if (!data) {
      return {}; // If file is empty, return an empty object
    }
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return an empty object
      console.error(`File ${filePath} not found.`);
      return {};
    }
    console.error(`Error reading or parsing ${filePath}:`, error);
    return null;
  }
};

// Function to remove invalid companies from the list
const removeInvalidCompanies = (companies) => {
  const validCompanies = {};
  for (const companyNumber in companies) {
    if (companies[companyNumber].status === 'valid') {
      validCompanies[companyNumber] = companies[companyNumber]; // Keep only valid companies
    }
  }
  return validCompanies;
};

// Function to save the cleaned-up company cache
const saveCleanedCompanyCache = async (cleanedCompanies) => {
  try {
    await writeFile(companyCacheFilePath, JSON.stringify(cleanedCompanies, null, 2), 'utf-8');
    console.log('Updated companyCache.json with only valid companies.');
  } catch (error) {
    console.error('Error writing to companyCache.json:', error);
  }
};

// A helper function to add delays between operations
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const companies = await loadJSON(companyCacheFilePath); // Load from company cache

  if (companies) {
    const validCompanies = removeInvalidCompanies(companies); // Filter out invalid companies

    // Save the cleaned-up company cache
    await saveCleanedCompanyCache(validCompanies);

    const validCompanyNumbers = Object.keys(validCompanies);
    console.log('Valid company numbers:', validCompanyNumbers);

    let processedCompanies = [];
    for (const companyNumber of validCompanyNumbers) {
      try {
        const company = await processCompanies([companyNumber]);
        processedCompanies.push(...company);
        await delay(1000); // Wait 1 second between requests
      } catch (error) {
        console.error(`Error processing company ${companyNumber}:`, error);
      }
    }

    // Add lat/long data to companies
    const LatLongProcessedCompanies = await appendLatLongToCompanies(processedCompanies);

    console.log('Companies with lat/long:', LatLongProcessedCompanies);

    // Send companies with lat/long to MongoDB instead of saving them to db.json
    await appendToDbJson(LatLongProcessedCompanies);

    LatLongProcessedCompanies.forEach((company) => {
      if (!company.address || !company.address.line_1) {
        console.log(`Company ${company.company_number} is missing address information`);
      }
    });
  } else {
    console.log('No valid companies to process.');
  }
})();
