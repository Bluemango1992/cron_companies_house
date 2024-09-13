import { URL } from 'url';

// Function to create the search URL
function createSearchUrl(postcode, page) {
    const base_search_url = "https://find-and-update.company-information.service.gov.uk/advanced-search/get-results";
    const params = {
        companyNameIncludes: "",
        companyNameExcludes: "",
        registeredOfficeAddress: postcode,
        incorporationFromDay: "",
        incorporationFromMonth: "",
        incorporationFromYear: "",
        incorporationToDay: "01",
        incorporationToMonth: "01",
        incorporationToYear: "2019",
        status: "active",
        sicCodes: "",
        type: "ltd",
        dissolvedFromDay: "",
        dissolvedFromMonth: "",
        dissolvedFromYear: "",
        dissolvedToDay: "",
        dissolvedToMonth: "",
        dissolvedToYear: "",
        page: page,
    };

    const url = new URL(base_search_url);
    Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
    });

    return url.toString();
}

export default createSearchUrl;