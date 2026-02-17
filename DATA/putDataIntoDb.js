// backend/importCSV.js
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const Product = require("../models/productModel");

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://mukulpersonal2003:NTtv8gfqHJsC90fH@cluster0.mkzoudt.mongodb.net/EcommerceWeb",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("MongoDB connected successfully");
    importCSV();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Function to clear existing products and import CSV data into MongoDB
const importCSV = async () => {
  try {
    // Step 1: Clear existing products
    console.log("Clearing existing products...");
    const deleteResult = await Product.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing products`);

    // Step 2: Read and process CSV file
    console.log("Reading CSV file...");
    const results = [];
    const csvFilePath = path.join(__dirname, "amazon-products.csv");

    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found at path: ${csvFilePath}`);
    }

    // Read CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`Found ${results.length} records in CSV file`);

    if (results.length === 0) {
      console.log("No data found in CSV file");
      return;
    }

    // Step 3: Process and validate data
    console.log("Processing CSV data...");
    const processedItems = results
      .map((item, index) => {
        try {
          const processedItem = {
            name: item.title?.toString().trim() || "",
            description: item.description?.toString().trim() || "",
            price:
              parseFloat(item.final_price?.toString().replace(/[",]/g, "")) ||
              0,
            category: extractMainCategory(item.categories) || "",
            image: extractFirstImage(item.image_url) || "",
            brand: item.brand?.toString().trim() || "",
            tags: extractTags(item), // Extract meaningful tags
          };

          // Validate required fields
          if (!processedItem.name) {
            console.warn(
              `Warning: Row ${index + 1} has no name/title, skipping...`
            );
            return null;
          }

          return processedItem;
        } catch (error) {
          console.error(`Error processing row ${index + 1}:`, error.message);
          return null;
        }
      })
      .filter((item) => item !== null); // Remove null items

    console.log(
      `Successfully processed ${processedItems.length} valid records`
    );

    if (processedItems.length === 0) {
      console.log("No valid records to import");
      return;
    }

    // Step 4: Batch insert into MongoDB
    console.log("Inserting data into MongoDB...");
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < processedItems.length; i += batchSize) {
      const batch = processedItems.slice(i, i + batchSize);
      try {
        await Product.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
        console.log(
          `Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertedCount}/${
            processedItems.length
          } records`
        );
      } catch (error) {
        console.error(
          `Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
          error.message
        );
        // Continue with next batch even if current batch fails
      }
    }

    console.log(`✅ CSV import completed successfully!`);
    console.log(`📊 Total records processed: ${processedItems.length}`);
    console.log(`💾 Total records inserted: ${insertedCount}`);
  } catch (error) {
    console.error("❌ Error during CSV import:", error.message);
  } finally {
    // Close MongoDB connection
    console.log("Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("Process completed");
    process.exit(0);
  }
};

// Helper function to extract the main category from categories array string
function extractMainCategory(categoriesString) {
  if (!categoriesString) return "";

  try {
    const categoryStr = categoriesString.toString().trim();
    if (!categoryStr) return "";

    // Handle different formats: "[category1, category2]" or "category1, category2"
    const cleanStr = categoryStr.replace(/[\[\]"']+/g, "");
    const categories = cleanStr
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat.length > 0);

    return categories.length > 0 ? categories[0] : "";
  } catch (error) {
    console.error("Error parsing categories:", error.message);
    return "";
  }
}

// Helper function to extract meaningful tags from various fields
function extractTags(item) {
  const tags = new Set(); // Use Set to avoid duplicates

  try {
    // Extract from categories
    if (item.categories) {
      const categories = extractCategoriesArray(item.categories);
      categories.forEach((cat) => {
        if (cat && cat.length > 2) {
          // Only meaningful categories
          tags.add(cat.toLowerCase().trim());
        }
      });
    }

    // Add brand as tag
    if (item.brand && item.brand.toString().trim()) {
      tags.add(item.brand.toString().trim().toLowerCase());
    }

    // Extract from department
    if (item.department && item.department.toString().trim()) {
      tags.add(item.department.toString().trim().toLowerCase());
    }

    // Extract from features (if available)
    if (item.features) {
      const features = extractFeaturesArray(item.features);
      features.forEach((feature) => {
        // Extract key words from features
        const words = feature.toLowerCase().match(/\b\w{4,}\b/g); // Words with 4+ chars
        if (words) {
          words.slice(0, 3).forEach((word) => tags.add(word)); // Limit to 3 words per feature
        }
      });
    }

    // Extract key terms from description
    if (item.description) {
      const desc = item.description.toString();
      const keyTerms = extractKeyTermsFromDescription(desc);
      keyTerms.forEach((term) => tags.add(term));
    }

    // Add availability status
    if (
      item.availability &&
      item.availability.toString().toLowerCase().includes("stock")
    ) {
      tags.add("in-stock");
    }

    // Add discount tag if there's a discount
    if (item.discount && item.discount.toString().includes("%")) {
      tags.add("on-sale");
    }

    // Convert Set to Array and limit to reasonable number
    return Array.from(tags).slice(0, 10); // Limit to 10 tags max
  } catch (error) {
    console.error("Error extracting tags:", error.message);
    return [];
  }
}

// Helper function to extract categories as array
function extractCategoriesArray(categoriesString) {
  if (!categoriesString) return [];

  try {
    const categoryStr = categoriesString.toString().trim();
    if (!categoryStr) return [];

    const cleanStr = categoryStr.replace(/[\[\]"']+/g, "");
    return cleanStr
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat.length > 0);
  } catch (error) {
    return [];
  }
}

// Helper function to extract features as array
function extractFeaturesArray(featuresString) {
  if (!featuresString) return [];

  try {
    const featStr = featuresString.toString().trim();
    if (!featStr) return [];

    // Handle JSON array format or simple comma-separated
    if (featStr.startsWith("[") && featStr.endsWith("]")) {
      const parsed = JSON.parse(featStr);
      return Array.isArray(parsed) ? parsed : [];
    } else {
      return featStr
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    }
  } catch (error) {
    return [];
  }
}

// Helper function to extract key terms from description
function extractKeyTermsFromDescription(description) {
  if (!description) return [];

  try {
    const desc = description.toString().toLowerCase();
    const terms = new Set();

    // Common product-related keywords to look for
    const keywords = [
      "waterproof",
      "lightweight",
      "durable",
      "comfortable",
      "breathable",
      "wireless",
      "rechargeable",
      "portable",
      "adjustable",
      "premium",
      "professional",
      "outdoor",
      "indoor",
      "solar",
      "battery",
      "led",
      "safety",
      "security",
      "reflective",
      "running",
      "athletic",
      "sport",
      "fitness",
      "exercise",
      "mesh",
      "cushion",
      "support",
      "flexible",
      "resistant",
      "weatherproof",
      "energy",
      "efficient",
      "automatic",
      "manual",
      "digital",
      "analog",
      "smart",
      "eco-friendly",
    ];

    keywords.forEach((keyword) => {
      if (desc.includes(keyword)) {
        terms.add(keyword);
      }
    });

    return Array.from(terms).slice(0, 5); // Limit to 5 description tags
  } catch (error) {
    return [];
  }
}

// Helper function to extract the first image URL from image array string
function extractFirstImage(imageString) {
  if (!imageString) return "";

  try {
    const imageStr = imageString.toString().trim();
    if (!imageStr) return "";

    // Handle different formats: "[url1, url2]" or "url1, url2"
    const cleanStr = imageStr.replace(/[\[\]"']+/g, "");
    const images = cleanStr
      .split(",")
      .map((img) => img.trim())
      .filter(
        (img) =>
          img.length > 0 && (img.startsWith("http") || img.startsWith("/"))
      );

    return images.length > 0 ? images[0] : "";
  } catch (error) {
    console.error("Error parsing images:", error.message);
    return "";
  }
}

// Handle process termination gracefully
process.on("SIGINT", async () => {
  console.log("\n🛑 Process interrupted by user");
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
