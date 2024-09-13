import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit;  // Maximum number of requests
        this.interval = interval;  // Time window in ms
        this.requests = [];
    }

    async throttle() {
        const now = Date.now();
        // Clean up old requests that are outside the current time window
        this.requests = this.requests.filter(time => now - time < this.interval);

        if (this.requests.length >= this.limit) {
            const oldestRequest = this.requests[0];
            const timeToWait = this.interval - (now - oldestRequest);
            console.log(`Rate limit hit. Waiting ${timeToWait} ms.`);
            await new Promise(resolve => setTimeout(resolve, timeToWait));
            return this.throttle(); // Recur until we can make a request
        }

        this.requests.push(now);
    }
}

const rateLimiter = new RateLimiter(600, 5 * 60 * 1000); // 600 requests per 5 minutes

async function fetchCompanyOfficers(companyNumber, retryCount = 0, backoff = 1000) {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY || 'd45efe41-e43d-47ee-a4d0-97c0239857a2';

    if (!apiKey) {
        console.error('API key is not defined. Please check your .env file.');
        return null;
    }

    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}/officers`;

    try {
        await rateLimiter.throttle(); // Ensure request is within rate limit

        const response = await axios.get(url, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'),
                'Content-Type': 'application/json'
            }
        });

        return response.data.active_count;  // Assuming the data structure returns this field

    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.log(`Rate limit reached for company ${companyNumber}. Retrying in ${backoff} ms.`);
            await new Promise(resolve => setTimeout(resolve, backoff));  // Wait before retry
            return fetchCompanyOfficers(companyNumber, retryCount + 1, backoff * 2);  // Exponential backoff
        }

        console.error(`Error fetching officers for company ${companyNumber}:`, error);
        return null;
    }
}

async function filterCompanyNumbers(companyNumbers) {
    const validCompanyNumbers = [];

    for (const companyNumber of companyNumbers) {
        const activeCount = await fetchCompanyOfficers(companyNumber);

        if (activeCount !== null && activeCount >= 2) {
            validCompanyNumbers.push(companyNumber);
        } else {
            console.log(`Company ${companyNumber} ignored due to having fewer than 2 active officers.`);
        }
    }

    return validCompanyNumbers;
}


export default filterCompanyNumbers;
