import postcodeExtraction from './postcodeExtraction.mjs';
import scrapeCompanies from './scrapeCompanyNumbers.mjs';
import filterCompanies from './processCompanyOfficers.mjs';
import processCompanies from './processCompanies.mjs';
import appendLatLongToCompanies from './appendLatLongToCompanies.mjs';
import appendToDbJson from './appendToDbJson.mjs';
import createSearchUrl from './createSearchUrl.mjs';
import filterOutExistingCompanies from './filterOutExistingCompanies.mjs'; // Import the new filtering function

// Function to extract company numbers for a specific postcode
async function extractCompanynumbers(postcode) {
  const companyNumbers = [];
  let page = 1;

  while (true) {
    const url = createSearchUrl(postcode, page); // Generate URL with page number
    try {
      console.log(`Scraping page ${page} for postcode ${postcode}`);
      const numbers = await scrapeCompanies(url); // Scrape company numbers from this page

      if (numbers.length === 0) {
        console.log(`No more results found on page ${page} for postcode ${postcode}`);
        break; // Stop the loop when no more results are found
      }

      companyNumbers.push(...numbers); // Accumulate all company numbers
      page++; // Move to the next page
    } catch (error) {
      console.error(`Error scraping page ${page} for postcode ${postcode}:`, error);
      break; // Stop loop on error
    }
  }

  return companyNumbers; // Return all accumulated company numbers for this postcode
}

// Function to process all postcodes in an area
async function processPostcodeArea(area, postcodes) {
  if (postcodes.length > 0) {
    console.log(`Processing postcodes for area ${area}`);
    const allCompanyNumbers = [];

    for (const postcode of postcodes) {
      const numbers = await extractCompanynumbers("Cirencester"); // Get company numbers for each postcode
      allCompanyNumbers.push(...numbers); // Accumulate all company numbers
    }

    return allCompanyNumbers; // Return all company numbers collected for the area
  } else {
    console.log(`No postcodes found for area ${area}`);
    return [];
  }
}

async function main() {
  try {
    const companyNumbers = []; // Array to store all company numbers
    const postcodeAreas = await postcodeExtraction(); // Extract postcode areas

    console.log('Postcode areas:', postcodeAreas);

    if (!Array.isArray(postcodeAreas)) {
      throw new TypeError('Expected postcodeAreas to be an array');
    }

    // Loop through each postcode area and process the postcodes
    for (const { area, postcodes } of postcodeAreas) {
      if (Array.isArray(postcodes)) {
        const areaCompanyNumbers = await processPostcodeArea(area, postcodes); // Process the postcodes in the area
        companyNumbers.push(...areaCompanyNumbers); // Collect company numbers for this area
      } else {
        console.error(`Postcodes for area ${area} is not an array`);
      }
    }

    // Proceed only if there are company numbers to process
    if (companyNumbers.length > 0) {
      console.log('Filtering out existing companies from MongoDB');

      // Filter out companies that are already in MongoDB
      const newCompanyNumbers = await filterOutExistingCompanies(companyNumbers);

      if (newCompanyNumbers.length === 0) {
        console.log('All companies already exist in MongoDB. Skipping further processing.');
        return;
      }

      console.log('Calling filterCompanies with new company numbers:', newCompanyNumbers);

      // Filter the companies using your filter function
      const Companies = await filterCompanies(newCompanyNumbers);

      console.log('Filtered companies result:', Companies);

      if (!Array.isArray(Companies) || Companies.length === 0) {
        console.log('No companies returned from filterCompanies. Skipping processing.');
        return;
      }

      // Process the valid companies
      const validCompanies = await processCompanies(Companies);
      console.log('Valid companies after processing:', validCompanies);

      // Verify address information for each company
      validCompanies.forEach(company => {
        if (!company.address || !company.address.line_1) {
          console.log(`Company ${company.company_number} is missing address information`);
        }
      });

      // Append latitude and longitude data to companies
      const companiesWithLatLong = await appendLatLongToCompanies(validCompanies);
      console.log('Companies with lat/long:', companiesWithLatLong);

      // Save the results to MongoDB
      await appendToDbJson(companiesWithLatLong);

      // Log the final list of companies with lat/long data
      console.log(JSON.stringify(companiesWithLatLong, null, 2));
    } else {
      console.log('No company numbers were collected, skipping filtering and processing.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Execute the main function
main().catch(error => console.error('An error occurred:', error));