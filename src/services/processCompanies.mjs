import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' })

const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
if (!apiKey) {
    throw new Error('COMPANIES_HOUSE_API_KEY is not set in the environment variables');
}

async function getFilings(companyNumber) {
    const baseUrl = "https://api.company-information.service.gov.uk/company";
    const url = `${baseUrl}/${companyNumber}`;
    const headers = { "Authorization": `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        return {
            name: data.company_name,
            company_number: data.company_number,
            sic_codes: data.sic_codes,
            address: {
                line_1: data.registered_office_address?.address_line_1,
                line_2: data.registered_office_address?.address_line_2,
                locality: data.registered_office_address?.locality,
                postal_code: data.registered_office_address?.postal_code,
                region: data.registered_office_address?.region
            }
        };
    } catch (error) {
        console.error(`Error fetching filings for company ${companyNumber}:`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

async function processCompanies(companyNumbers) {
    try {
        const companyDataArray = await Promise.all(companyNumbers.map(getFilings));
        console.log("Companies:", JSON.stringify(companyDataArray, null, 2));
        return companyDataArray;
    } catch (error) {
        console.error("Error processing companies:", error);
        return [];
    }
}

export default processCompanies;