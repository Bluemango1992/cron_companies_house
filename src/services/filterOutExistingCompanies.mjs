import got from 'got';

/**
 * Function to filter out companies that already exist in MongoDB via GET request to the API
 * @param {Array} companyNumbers - Array of company numbers to check
 * @returns {Array} - Filtered array of company numbers that don't exist in MongoDB
 */
export default async function filterOutExistingCompanies(companyNumbers) {
  const newCompanyNumbers = [];

  for (const companyNumber of companyNumbers) {
    try {
      // Make a GET request to your API to check if the company exists
      const url = `http://localhost:3000/companies/${companyNumber}`;
      const response = await got(url, { responseType: 'json' });
      
      if (response.body && response.body.company_number) {
        console.log(`Company ${companyNumber} already exists in the database.`);
      }
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        // If the company is not found (404), it's a new company
        newCompanyNumbers.push(companyNumber);
        console.log(`Company ${companyNumber} does not exist in the database, adding to the new list.`);
      } else {
        console.error(`Error fetching company ${companyNumber}:`, error.message);
      }
    }
  }

  return newCompanyNumbers; // Return only the new company numbers
}
