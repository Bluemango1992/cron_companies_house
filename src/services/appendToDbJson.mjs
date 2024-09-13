import mongoose from 'mongoose';

// Define a Company schema
const companySchema = new mongoose.Schema({
  name: String,
  company_number: String,
  sic_codes: [String],
  address: {
    line_1: String,
    line_2: String,
    locality: String,
    postal_code: String,
    region: String
  },
  lat: Number,
  lng: Number
});

// Create a Company model
const Company = mongoose.model('Company', companySchema);

// Function to check if a company already exists in the database by `company_number`
async function isCompanyInDatabase(companyNumber) {
  try {
    const existingCompany = await Company.findOne({ company_number: companyNumber });
    return existingCompany !== null; // Returns true if the company exists
  } catch (err) {
    console.error('Error checking company existence:', err);
    throw err;
  }
}

// Main function to append new companies to MongoDB if they don't already exist
async function appendToDbJson(newCompanies) {
  try {
    // Connect to MongoDB (Replace with your actual MongoDB URI)
    await mongoose.connect('mongodb://localhost:27017/bluechipuk', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Filter out companies that are already in the database
    const companiesToAdd = [];
    for (const company of newCompanies) {
      const exists = await isCompanyInDatabase(company.company_number);
      if (!exists) {
        companiesToAdd.push(company);
      }
    }

    if (companiesToAdd.length > 0) {
      // Insert the unique companies into MongoDB
      await Company.insertMany(companiesToAdd);
      console.log(`Successfully added ${companiesToAdd.length} new companies to MongoDB.`);
    } else {
      console.log('No new companies to add.');
    }

    // Close the MongoDB connection
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error adding companies to MongoDB:', err);
  }
}

export default appendToDbJson;