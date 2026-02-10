const express = require("express");
const router = express.Router();

const globalStockCtrl = require("../controllers/globalStockController");

// 🌱 Zavod → Global (filial omborini seed qilish)
router.post("/stock/seed", globalStockCtrl.seedBranchStock);
// 📦 Filial → Global (o‘z omborini ko‘rish)
router.get("/stock/:branch_code", globalStockCtrl.getBranchStock);

module.exports = router;
