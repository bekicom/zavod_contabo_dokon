const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI .env da topilmadi");
    }

    await mongoose.connect(MONGO_URI);

    console.log("✅ Global MongoDB muvaffaqiyatli ulandi");
  } catch (error) {
    console.error("❌ MongoDB ulanish xatosi:", error.message);
    process.exit(1); // serverni to‘xtatamiz
  }
};
