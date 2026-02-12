require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const globalStockRoutes = require("./routes/globalStockRoutes");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* =========================
   DB CONNECT (SAFE FOR VERCEL)
========================= */
let isConnected = false;

async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
    console.log("✅ Global MongoDB ulandi");
  }
}

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error("❌ Mongo connect error:", err.message);
    res.status(500).json({
      success: false,
      message: "MongoDB ulanishda xatolik",
    });
  }
});

/* =========================
   ROUTES
========================= */
app.use("/api/global", globalStockRoutes);

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🌍 SORA GLOBAL API (Vercel)",
    time: new Date().toISOString(),
  });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route topilmadi",
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("❌ Global server error:", err);
  res.status(500).json({
    success: false,
    message: "Server ichki xatosi",
  });
});

/* =========================
   EXPORT FOR VERCEL
========================= */

// server run boldi listen

module.exports = app;
