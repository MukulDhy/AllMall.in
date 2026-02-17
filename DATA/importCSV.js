// backend/importCSV.js
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const Product = require("./models/Product");

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://poojabansal1307:IjUOKDOkAWwvUPdL@cluster0.kjcdkvk.mongodb.net/",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("MongoDB connected");
    importCSV();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Function to import CSV data into MongoDB
const importCSV = () => {
  const extractCategories = (categoryArray) => {
    return categoryArray.map((category) =>
      category.replace(/[\[\]"]+/g, "").split("', '")
    );
  };

  // Function to extract the first image from the image array
  const extractFirstImage = (imageArray) => {
    return imageArray[0].replace(/[\[\]"]+/g, "");
  };

  // Function to truncate description to a certain length
  const truncateDescription = (description, maxLength) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + "...";
    }
    return description;
  };

  const results = [];
  const csvFilePath = path.join(__dirname, "data/products.csv");

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        for (let i = 0; i < results.length; i++) {
          const categoryString = results[i].category;
          const categories = categoryString.split(" >> ");
          results[i].category = categories;

          // Truncate description to a certain length (e.g., 100 characters)
          const maxDescriptionLength = 100;
          results[i].description = truncateDescription(
            results[i].description,
            maxDescriptionLength
          );
        }

        const processedItems = results.map((item) => ({
          name: item.name,
          category: extractCategories(item.category)[0][0].split(","),
          price: parseInt(item.price),
          image: extractFirstImage(item.image.split(", ")),
          description: item.description,
          brand: item.brand,
        }));

        // Insert processed data into MongoDB
        for (let i = 0; i < processedItems.length; i++) {
          await Product.create(processedItems[i]);
        }
        // console.log(processedItems);
        console.log("CSV data successfully imported into MongoDB");
        mongoose.connection.close();
      } catch (error) {
        console.error("Error inserting data into MongoDB:", error);
      }
    });
};
