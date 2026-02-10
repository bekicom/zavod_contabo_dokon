require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// ROUTES
const globalStockRoutes = require("./routes/globalStockRoutes");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
    message: "🌍 SORA GLOBAL SERVER ishlayapti",
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
   START SERVER
========================= */
const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Global server ${PORT}-portda ishga tushdi`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});
