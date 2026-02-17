const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const Product = require("../backend/models/productModel.js"); // Assuming your Product model is in models/Product.js
const User = require("../backend/models/userModel.js"); // You'll need a User model for the user field
const { exit } = require("process");

// Define your tech categories
const tech_categories = [
  "Accessories & Parts",
  "Adapters & Multi-Outlets",
  "Batteries",
  "Battery Chargers",
  "Battery Packs",
  "Battery Packs & Chargers",
  "Cables",
  "Cables & Accessories",
  "Cables & Interconnects",
  "Car & Vehicle Electronics",
  "Car Electronics",
  "Cell Phones",
  "Cell Phones & Accessories",
  "Chargers & Power Adapters",
  "Charging Stations",
  "Computer Accessories & Peripherals",
  "Computer Components",
  "Computer Gaming Chairs",
  "Computers & Accessories",
  "Controllers",
  "Cooling Fans",
  "Cords, Adapters & Multi-Outlets",
  "Data Storage",
  "Desktop Computers",
  "Electronics",
  "Electronics & Gadgets",
  "Earbud Headphones",
  "Earpads",
  "Ethernet Cables",
  "External Hard Drives",
  "External Solid State Drives",
  "Gaming Chairs",
  "Gaming Keyboards",
  "Gaming Mice",
  "Game Accessories",
  "Games",
  "Games & Accessories",
  "Graphics Cards",
  "Hard Drive Accessories",
  "HDMI Cables",
  "Headphones & Earbuds",
  "Headphones, Earbuds & Accessories",
  "Ink Tank Printers",
  "Inkjet Ink Cartridges",
  "Inkjet Printers",
  "Internal Components",
  "Internal Power Supplies",
  "Keyboards",
  "Keyboards, Mice & Accessories",
  "KVM Switches",
  "Laptop Accessories",
  "Lightning Cables",
  "Monitor Accessories",
  "Monitor Stands",
  "Monitor, Speaker & Subwoofer Parts",
  "Monitors",
  "Monitors, Speakers & Subwoofers",
  "Mouse Pads",
  "Mouse Pads & Wrist Rests",
  "Network Adapters",
  "Networking Products",
  "Office Electronics",
  "Office Electronics Accessories",
  "PC",
  "Portable Audio & Video",
  "Portable Bluetooth Speakers",
  "Portable Speakers & Docks",
  "Power Converters",
  "Power Strips & Surge Protectors",
  "Printer Ink & Toner",
  "Printer Parts & Accessories",
  "Printers",
  "Printers & Accessories",
  "Routers",
  "Screen Protectors",
  "Shredders",
  "Smartwatch Accessories",
  "Smartwatch Bands",
  "Smartwatch Screen Protectors",
  "Smartwatches",
  "Speakers",
  "Storage & Organization",
  "Studio Recording Equipment",
  "Surge Protectors",
  "Tablet Accessories",
  "Television & Video",
  "Toner Cartridges",
  "TV Mounts, Stands & Turntables",
  "USB Cables",
  "USB Network Adapters",
  "Video Converters",
  "Video Games",
  "Video Monitors",
  "Wearable Technology",
  "Webcams",
  "Wireless Accessories",
  "eBook Readers",
  "eBook Readers & Accessories",
];

// Function to check if product belongs to tech categories
function isTechCategory(categoriesString) {
  try {
    if (!categoriesString || categoriesString === "null") return false;

    // Parse the categories array from string
    const categories = JSON.parse(categoriesString.replace(/""/g, '"'));

    // Check if any category matches tech categories
    return categories.some((category) =>
      tech_categories.includes(category.trim())
    );
  } catch (error) {
    console.error("Error parsing categories:", error.message);
    return false;
  }
}

// Function to clean and validate price
function parsePrice(priceString) {
  if (!priceString || priceString === "null" || priceString === '""')
    return null;

  try {
    // Remove quotes and parse
    let cleanPrice = priceString.replace(/"/g, "").replace(/[^\d.-]/g, "");
    const price = parseFloat(cleanPrice);

    if (isNaN(price) || price <= 0) {
      return null;
    }

    // Ensure price doesn't exceed 8 characters
    if (price.toString().length > 8) {
      console.warn(`Price too long: ${price}, truncating to 8 characters`);
      return parseFloat(price.toString().substring(0, 8));
    }

    return price;
  } catch (error) {
    console.error("Error parsing price:", priceString, error.message);
    return null;
  }
}

// Function to clean and parse categories
function parseCategories(categoriesString) {
  if (!categoriesString || categoriesString === "null") return null;

  try {
    const categories = JSON.parse(categoriesString.replace(/""/g, '"'));
    // Get the most specific category (last one)
    return categories[categories.length - 1] || null;
  } catch (error) {
    console.error("Error parsing categories:", error.message);
    return null;
  }
}

// Function to extract rating
function parseRating(ratingString) {
  if (!ratingString || ratingString === "null") return 0;

  try {
    const rating = parseFloat(ratingString);
    return isNaN(rating) ? 0 : rating;
  } catch (error) {
    return 0;
  }
}

// Function to parse stock/availability
function parseStock(availability, reviewsCount) {
  if (availability && availability.includes("In Stock")) {
    // Use reviews count as a proxy for stock if available
    if (reviewsCount && !isNaN(reviewsCount)) {
      return Math.min(parseInt(reviewsCount), 9999); // Max 4 digits
    }
    return 100; // Default stock for in-stock items
  }
  return 0; // Out of stock
}

// Function to create image object
function createImageObject(imageUrl, asin) {
  if (!imageUrl || imageUrl === "null") {
    return [
      {
        public_id: `default_${Date.now()}`,
        url: "https://res.cloudinary.com/demo/image/upload/v1234567890/default-product.jpg",
      },
    ];
  }

  return [
    {
      public_id: `product_${asin}_${Date.now()}`,
      url: imageUrl,
    },
  ];
}

// Function to get default user ID (you'll need to adjust this)
async function getDefaultUserId() {
  try {
    // Get the first admin user or create a default user
    const user = await User.findOne({ role: "admin" });
    // print(user);
    console.log(user);
    if (user) return user._id;

    console.log(
      "No admin user found. Please create an admin user before importing products."
    );
    exit(1);
    // Or create a default system user
    // const defaultUser = new User({
    //     name: 'System Import',
    //     email: 'system@import.com',
    //     password: 'systemimport123',
    //     role: 'admin'
    // });
    // await defaultUser.save();
    // return defaultUser._id;
    return;
  } catch (error) {
    console.error("Error getting default user:", error);
    throw new Error("No user available for product creation");
  }
}

// Main import function
async function importCSV(filePath = "./amazon-products.csv") {
  const products = [];
  let processed = 0;
  let inserted = 0;
  let skipped = 0;

  try {
    // Get default user ID for all imported products
    const defaultUserId = await getDefaultUserId();

    console.log("Starting CSV import...");

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", async (row) => {
          try {
            processed++;

            // Check if product belongs to tech categories
            if (!isTechCategory(row.categories)) {
              skipped++;
              return;
            }

            // Parse and validate required fields
            const name = row.title?.substring(0, 200) || "Untitled Product";
            const description = row.description || "No description available";
            const price =
              parsePrice(row.final_price) || parsePrice(row.initial_price);

            if (!price) {
              console.warn(`Skipping product ${row.asin} - Invalid price`);
              skipped++;
              return;
            }

            // Parse category
            const category = parseCategories(row.categories);
            if (!category) {
              console.warn(`Skipping product ${row.asin} - No valid category`);
              skipped++;
              return;
            }

            // Calculate stock
            const stock = parseStock(row.availability, row.reviews_count);

            // Create product object
            const productData = {
              name: name,
              description: description.substring(0, 2000), // Limit description length
              price: price,
              ratings: parseRating(row.rating),
              images: createImageObject(row.image_url, row.asin),
              category: category,
              Stock: stock,
              product_dimensions: row.product_dimensions || null,
              manufacturer: row.manufacturer || null,
              video_url: row.video || null,
              product_details: row.product_details || null,
              numOfReviews: parseInt(row.reviews_count) || 0,
              reviews: [], // No reviews initially
              user: defaultUserId,
              createdAt: new Date(row.timestamp || Date.now()),
            };

            products.push(productData);

            // Insert in batches of 100
            if (products.length >= 100) {
              const batch = [...products];
              products.length = 0; // Clear array

              try {
                const result = await Product.insertMany(batch, {
                  ordered: false,
                });
                inserted += result.length;
                console.log(
                  `Batch inserted: ${result.length} products. Total: ${inserted}`
                );
              } catch (batchError) {
                console.error("Batch insert error:", batchError.message);
                // Continue with remaining products
              }
            }
          } catch (rowError) {
            console.error(
              `Error processing row ${processed}:`,
              rowError.message
            );
            skipped++;
          }
        })
        .on("end", async () => {
          try {
            // Insert remaining products
            if (products.length > 0) {
              const result = await Product.insertMany(products, {
                ordered: false,
              });
              inserted += result.length;
              console.log(`Final batch inserted: ${result.length} products`);
            }

            console.log("\n=== Import Summary ===");
            console.log(`Total processed: ${processed}`);
            console.log(`Successfully inserted: ${inserted}`);
            console.log(`Skipped: ${skipped}`);
            console.log("Import completed!");

            resolve({ processed, inserted, skipped });
          } catch (finalError) {
            console.error("Error inserting final batch:", finalError.message);
            reject(finalError);
          }
        })
        .on("error", (error) => {
          console.error("CSV stream error:", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("Import error:", error);
    throw error;
  }
}

// Updated MongoDB connection with your URI
mongoose
  .connect(
    "mongodb+srv://mukulpersonal2003_db_user:nGMwqxWzBZQ3r3mh@cluster0.l0hcqke.mongodb.net/ALLMALL",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(async () => {
    console.log("MongoDB connected successfully");

    try {
      await importCSV(); // Update this with your actual CSV file path
      console.log("CSV import process completed");
      process.exit(0);
    } catch (error) {
      console.error("Import process failed:", error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nGracefully shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});
