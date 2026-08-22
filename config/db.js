const mongoose = require("mongoose");

let isConnected = false;

async function removeLegacyShopOrderTtlIndex() {
  const collection = mongoose.connection.collection("shoporders");
  let indexes;

  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error?.codeName === "NamespaceNotFound" || error?.code === 26) {
      return;
    }
    throw error;
  }

  const legacyTtlIndexes = indexes.filter(
    (index) =>
      index?.key?.createdAt !== undefined &&
      index?.expireAfterSeconds !== undefined,
  );

  for (const index of legacyTtlIndexes) {
    try {
      await collection.dropIndex(index.name);
      console.log(`✅ Eski ShopOrder TTL indeksi olib tashlandi: ${index.name}`);
    } catch (error) {
      if (error?.codeName !== "IndexNotFound" && error?.code !== 27) {
        throw error;
      }
    }
  }
}

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

    await removeLegacyShopOrderTtlIndex();

    isConnected = true;
    console.log("✅ Global MongoDB ulandi");
  } catch (error) {
    console.error("❌ MongoDB ulanish xatosi:", error.message);
    // ❌ process.exit() yo‘q
    throw error; // faqat throw qilamiz
  }
};
