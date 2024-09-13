import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises'; // Import fs module for file writing
import createSearchUrl from './createSearchUrl.mjs';
import got from 'got'; // Import got for API requests

const cache = {}; // Cache object to store processed postcode areas

// Function to check if a company number already exists in MongoDB
async function checkIfCompanyExists(companyNumber) {
  try {
    const url = `http://localhost:3000/companies/${companyNumber}`;
    const response = await got(url, { responseType: 'json' });
    
    // If the response contains the company_number, it exists in the database
    if (response.body && response.body.company_number) {
      return true;
    }
  } catch (error) {
    if (error.response && error.response.statusCode === 404) {
      // Company not found, so it's new
      return false;
    }
    console.error(`Error checking company ${companyNumber}:`, error.message);
  }
  return false;
}

// Function to write company numbers to a JSON file
async function saveCompanyNumbersToFile(companyNumbers) {
  const filePath = './companyNumbers.json'; // File path in the same directory
  try {
    // Read the existing file if it exists, else start with an empty array
    let existingData = [];
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      existingData = JSON.parse(fileData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error; // Only ignore if file does not exist
      }
    }

    // Merge new company numbers with existing ones
    const updatedData = [...existingData, ...companyNumbers];

    // Write updated data back to the file
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
    console.log('Company numbers successfully written to file.');
  } catch (error) {
    console.error('Error writing company numbers to file:', error);
  }
}

async function fetchContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`An error occurred while fetching ${url}: ${error}`);
    return '';
  }
}

function extractData(content, postcodeArea) {
  const dataPattern = new RegExp(`${postcodeArea}\\d+`, 'g');
  const matches = content.match(dataPattern) || [];
  return [...new Set(matches)];
}

async function processPostcodeArea(postcodeArea) {
  if (cache[postcodeArea]) {
    console.log(`Returning cached data for area: ${postcodeArea}`);
    return cache[postcodeArea]; // Return cached data if available
  }

  const url = `https://en.m.wikipedia.org/wiki/Template:Attached_KML/${postcodeArea}_postcode_area?action=raw`;
  const content = await fetchContent(url);
  const postcodes = extractData(content, postcodeArea);

  const result = { area: postcodeArea, postcodes };
  cache[postcodeArea] = result; // Store result in cache
  return result;
}

async function postcodeExtraction(postcodeAreas, currentIndex = 0) {
  if (currentIndex >= postcodeAreas.length) {
    console.log('All areas processed.');
    return; // End recursion when all areas are processed
  }

  const postcodeArea = postcodeAreas[currentIndex];
  try {
    const result = await processPostcodeArea(postcodeArea);
    console.log(`Processed result for area ${postcodeArea}:`, result);

    // Process each postcode in the area
    for (const postcode of result.postcodes) {
      let page = 1;
      let continueScraping = true;

      // Paginate through each page until no more companies are found or next page does not exist
      while (continueScraping) {
        const searchUrl = createSearchUrl(postcode, page);
        console.log(`Scraping URL for ${postcode}, page ${page}: ${searchUrl}`);

        // Scrape company numbers from the generated URL
        const companyNumbers = await scrapeCompanies(searchUrl);
        let ignoredCompaniesCount = 0; // Counter for ignored companies

        if (companyNumbers.length > 0) {
          console.log(`Found company numbers: ${companyNumbers}`);

          // Filter out company numbers that already exist in MongoDB
          const newCompanyNumbers = [];
          for (const companyNumber of companyNumbers) {
            const exists = await checkIfCompanyExists(companyNumber);
            if (!exists) {
              newCompanyNumbers.push(companyNumber);
            } else {
              ignoredCompaniesCount++;
              console.log(`Company ${companyNumber} already exists in MongoDB and was ignored.`);
            }
          }

          if (newCompanyNumbers.length > 0) {
            // Save the new company numbers to a JSON file
            await saveCompanyNumbersToFile(newCompanyNumbers);
            console.log(`Saved ${newCompanyNumbers.length} new company numbers to file.`);
          } else {
            console.log(`All ${companyNumbers.length} company numbers for this page already exist in MongoDB.`);
            continueScraping = false; // Stop scraping if all companies exist
          }

          // Log the number of companies ignored because they already exist in the database
          console.log(`Ignored ${ignoredCompaniesCount} company numbers that already exist in the database.`);
        } else {
          console.log(`No more company numbers found for ${postcode} on page ${page}.`);
          continueScraping = false; // Stop pagination if no companies are found
        }

        page++; // Move to the next page
      }
    }

    // Call the function again for the next area
    await postcodeExtraction(postcodeAreas, currentIndex + 1);
  } catch (error) {
    console.error(`An error occurred while processing ${postcodeArea}:`, error);
    throw error;
  }
}

// Scraping function to extract company numbers from the page
async function scrapeCompanies(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const companyNumbers = [];

    // Extract the company numbers from <li> elements
    $('li').each((index, element) => {
      const text = $(element).text();
      if (text.includes('Incorporated on')) {
        const match = text.match(/\d+/);
        if (match) {
          companyNumbers.push(match[0].toString());
        }
      }
    });

    // If no company numbers were found, return an empty array
    if (companyNumbers.length === 0) {
      console.log('No company numbers found on this page');
    }

    return companyNumbers;

  } catch (error) {
    console.error('Error fetching data:', error);
    return []; // Return an empty array on error
  }
}

export default scrapeCompanies;