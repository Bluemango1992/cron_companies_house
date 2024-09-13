import fs from 'fs/promises';

// Function to scan for companies with incomplete schema entries and return their company numbers
async function findIncompleteCompanyNumbers() {
    const filePath = './companyNumbers.json'; // Path to the JSON file
    try {
        const fileData = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileData);

        // Filter companies where certain fields are incomplete
        const incompleteCompanies = data.companies.filter(company => {
            return (
                !company.name ||                            // Name is empty
                company.sic_codes.length === 0 ||           // SIC codes are empty
                !company.address.line_1 ||                  // Address line_1 is empty
                !company.address.locality ||                // Locality is empty
                !company.address.postal_code ||             // Postal code is empty
                company.lat === null ||                     // Latitude is not set
                company.lng === null                        // Longitude is not set
            );
        });

        // Return an array of just the company numbers for the incomplete companies
        const incompleteCompanyNumbers = incompleteCompanies.map(company => company.company_number);

        return incompleteCompanyNumbers;
    } catch (error) {
        console.error('Error reading the company numbers file:', error);
        return []; // Return an empty array on error
    }
}

// Example of how to use the function
async function processIncompleteCompanyNumbers() {
    const incompleteCompanyNumbers = await findIncompleteCompanyNumbers();

    if (incompleteCompanyNumbers.length === 0) {
        console.log('No incomplete companies found.');
    } else {
        // Store the processed company numbers in an array
        const processedCompanyNumbers = [];

        // Process each incomplete company number here
        for (const companyNumber of incompleteCompanyNumbers) {
            console.log(`Processing company ${companyNumber}...`);
            processedCompanyNumbers.push(companyNumber);
            // Add your processing logic here (e.g., fetching missing data)
        }

        // Once all companies are processed, print the full array of company numbers
        console.log('Processed company numbers:', processedCompanyNumbers);
    }
}

// Call the function to find and process incomplete companies by their numbers
processIncompleteCompanyNumbers();
