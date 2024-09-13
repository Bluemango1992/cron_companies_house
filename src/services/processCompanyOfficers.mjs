import filterCompanyNumbers from "./fetchCompanyOfficers.mjs";
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: '../../.env' })

const cacheFilePath = './companyCache.json';

// Load the cached data from the file
async function loadCache() {
    try {
        const data = await fs.readFile(cacheFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or cannot be read, return an empty object
        return {};
    }
}

// Save the cache to the file
async function saveCache(cache) {
    await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
}

async function getFilings(companyNumber) {
    const baseUrl = "https://api.company-information.service.gov.uk/company";
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    
    const url = `${baseUrl}/${companyNumber}/filing-history`;
    const headers = { "Authorization": `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error(`Error fetching filings for company ${companyNumber}:`, error);
        return [];
    }
}

function shouldIgnoreCompany(filings) {
    const ignoreCriteria = [
        "accounts-with-accounts-type-dormant",
        "accounts-with-accounts-type-unaudited-abridged",
        "accounts-with-accounts-type-total-exemption-full",
        "accounts-with-accounts-type-micro-entity",
        "first gazette"
    ];

    return filings.some(filing => 
        ignoreCriteria.some(criteria => 
            filing.description.toLowerCase().includes(criteria)
        )
    );
}

async function filterCompanies(companyNumbers) {
    let cache = await loadCache();
    const validCompanies = [];

    for (const companyNumber of companyNumbers) {
        // Check if the company has already been processed
        if (cache[companyNumber]) {
            console.log(`Company ${companyNumber} found in cache with status: ${cache[companyNumber].status}`);
            if (cache[companyNumber].status === 'valid') {
                validCompanies.push(companyNumber);
            }
            continue; // Skip further processing if cached
        }

        // If not in cache, proceed to check officers and filings
        const officers = await filterCompanyNumbers([companyNumber]);

        if (officers.length > 0) {
            const filings = await getFilings(companyNumber);
            if (!shouldIgnoreCompany(filings)) {
                validCompanies.push(companyNumber);
                cache[companyNumber] = { status: 'valid' }; // Cache as valid
                await saveCache(cache); // Save cache immediately after valid company
            } else {
                console.log(`Company ${companyNumber} ignored due to filing criteria after officer check.`);
                // Do not cache ignored companies
            }
        } else {
            console.log(`Company ${companyNumber} ignored due to fewer than 2 active officers.`);
            // Do not cache ignored companies
        }
    }

    return validCompanies;
}

export default filterCompanies;