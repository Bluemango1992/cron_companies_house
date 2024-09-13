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
    const url = `https://en.m.wikipedia.org/wiki/Template:Attached_KML/${postcodeArea}_postcode_area?action=raw`;
    const content = await fetchContent(url);
    const postcodes = extractData(content, postcodeArea);
  
    if (postcodes.length === 0) {
      console.warn(`No postcodes found for postcode area: ${postcodeArea}`);
      // Optionally, throw an error here if you want to halt processing on empty postcodes
      // throw new Error(`Empty postcodes array for postcode area: ${postcodeArea}`);
    }
  
    return { area: postcodeArea, postcodes };
  }
  
  async function postcodeExtraction() {

    const postcodeAreas = ['SN'];

    // const postcodeAreas = [
    //   "AB", "AL", "B", "BA", "BB", "BD", "BH", "BL", "BN", "BR", "BS", "BT", 
    //   "CA", "CB", "CF", "CH", "CM", "CO", "CR", "CT", "CV", "CW", "DA", "DD", 
    //   "DE", "DG", "DH", "DL", "DN", "DT", "DY", "E", "EC", "EH", "EN", "EX", 
    //   "FK", "FY", "G", "GL", "GU", "HA", "HD", "HG", "HP", "HR", "HS", "HU", 
    //   "HX", "IG", "IP", "IV", "KA", "KT", "KW", "KY", "L", "LA", "LD", "LE", 
    //   "LL", "LN", "LS", "LU", "M", "ME", "MK", "ML", "N", "NE", "NG", "NN", 
    //   "NP", "NR", "NW", "OL", "OX", "PA", "PE", "PH", "PL", "PO", "PR", "RG", 
    //   "RH", "RM", "S", "SA", "SE", "SG", "SK", "SL", "SM", "SN", "SO", "SP", 
    //   "SR", "SS", "ST", "SW", "SY", "TA", "TD", "TF", "TN", "TQ", "TR", "TS", 
    //   "TW", "UB", "W", "WA", "WC", "WD", "WF", "WN", "WR", "WS", "WV", "YO", 
    //   "ZE"
    // ];
  
    try {
      const results = await Promise.all(postcodeAreas.map(processPostcodeArea));
      return results;
    } catch (error) {
      console.error('An error occurred during postcode extraction:', error);
      throw error;
    }
  }

 export default postcodeExtraction;
  