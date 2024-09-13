export class RateLimiter {
    constructor(limit, interval) {
      this.limit = limit;  // Maximum number of requests
      this.interval = interval;  // Time window in ms
      this.requests = [];
    }
  
    async throttle() {
      const now = Date.now();
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
  