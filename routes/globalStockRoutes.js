const express = require("express");
const router = express.Router();

const globalStockCtrl = require("../controllers/globalStockController");
const {
  createOrder,
  getAllOrders,
  approveOrder,
  rejectOrder,
} = require("../controllers/shopOrder.controller");

// 🌱 Zavod → Global (filial omborini seed qilish)
router.post("/stock/seed", globalStockCtrl.seedBranchStock);
// 📦 Filial → Global (o‘z omborini ko‘rish)
router.get("/stock/:branch_code", globalStockCtrl.getBranchStock);

router.post("/shop-orders", createOrder);
router.get("/shop-orders", getAllOrders);
router.patch("/shop-orders/:id/approve", approveOrder);
router.patch("/shop-orders/:id/reject", rejectOrder);


module.exports = router;
