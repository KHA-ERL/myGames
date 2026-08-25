const mongoose = require("mongoose");

async function connectToMongoDb(mongo_url) {
  if (!mongo_url) return false;
  if (mongoose.connection.readyState === 1) return true;

  mongoose.connection.on("connected", () => {
    console.log("Connected to MongoDB successfully");
  });

  mongoose.connection.on("error", (err) => {
    console.error("Error connecting to MongoDB", err);
  });

  await mongoose.connect(mongo_url);
  return true;
}

module.exports = { connectToMongoDb };
