import fetch from 'node-fetch';

// OpenCage Geocoding API key
const API_KEY = 'cd7e05ccf51b4c9b9d1b176bc944497e'; // Replace with your actual API key

// Implement retry logic with exponential backoff
async function getLatLongWithRetry(address, retries = 3, backoff = 1000) {
    try {
      return await getLatLong(address);
    } catch (error) {
      if (retries > 0) {
        await delay(backoff);
        return getLatLongWithRetry(address, retries - 1, backoff * 2);
      } else {
        throw error;
      }
    }
  }

// Function to geocode an address and return latitude and longitude
async function getLatLong(address) {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry;
            return { lat, lng };
        } else {
            return { lat: null, lng: null };
        }
    } catch (error) {
        console.error("Error fetching geolocation data:", error);
        return { lat: null, lng: null };
    }
}

// Delay function to wait for a given amount of time (in milliseconds)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to rate-limit API calls with a minimum of 1 request per second
async function rateLimitedApiCall(apiCall, limitPerDay = 2500) {
    // Ensure requestsPerSecond is at least 1
    const requestsPerSecond = Math.max(Math.floor(limitPerDay / (24 * 60 * 60)), 1); 
    const waitTime = Math.ceil(1000 / requestsPerSecond); // Wait time between requests in milliseconds

    console.log(`Rate limiting set to ${requestsPerSecond} requests/second (wait time: ${waitTime}ms per request)`);

    // Execute the API call, respecting the rate limit
    await delay(waitTime);
    return apiCall();
}

// Function to append latitude and longitude to each company data
async function appendLatLongToCompanies(companies, limitPerDay = 2500) {
    const companiesWithLatLong = [];
    
    // Process each company sequentially to respect rate limiting
    for (const company of companies) {
        const fullAddress = `${company.address.line_1}, ${company.address.locality}, ${company.address.postal_code}`;
        
        // Use rateLimitedApiCall to limit the number of API requests
        const { lat, lng } = await rateLimitedApiCall(() => getLatLong(fullAddress), limitPerDay);

        companiesWithLatLong.push({
            ...company,
            lat,
            lng
        });
    }

    console.log(JSON.stringify(companiesWithLatLong, null, 2));
    return companiesWithLatLong;
}


export default appendLatLongToCompanies;
