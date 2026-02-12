const mongoose = require("mongoose");

let isConnected = false;

module.exports = async function connectDB() {
  if (isConnected) return;

  try {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      throw new Error("MONGO_URI topilmadi");
    }

    await mongoose.connect(MONGO_URI, {
      bufferCommands: false,
    });

    isConnected = true;
    console.log("✅ Global MongoDB ulandi");
  } catch (error) {
    console.error("❌ MongoDB ulanish xatosi:", error.message);
    // ❌ process.exit() yo‘q
    throw error; // faqat throw qilamiz
  }
};
