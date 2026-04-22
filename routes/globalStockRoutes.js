const express = require("express");
const router = express.Router();

const globalStockCtrl = require("../controllers/globalStockController");

const {
  createOrder,
  getAllOrders,
  approveOrder,
  rejectOrder,
  receiveOrder, // 👈 MUHIM: qo‘shildi
  getOrderById,
} = require("../controllers/shopOrder.controller");

// 🏭 Factory catalog management (global)
router.get("/", globalStockCtrl.getAllBranchStocks);
router.post("/factory/categories", globalStockCtrl.createFactoryCategory);
router.put("/factory/categories/:category", globalStockCtrl.updateFactoryCategory);
router.delete(
  "/factory/categories/:category",
  globalStockCtrl.deleteFactoryCategory,
);
router.post(
  "/factory/categories/subcategory",
  globalStockCtrl.addFactorySubcategory,
);
router.put(
  "/factory/categories/:category/subcategories/:subcategory",
  globalStockCtrl.updateFactorySubcategory,
);
router.delete(
  "/factory/categories/:category/subcategories/:subcategory",
  globalStockCtrl.deleteFactorySubcategory,
);
router.get("/factory/categories", globalStockCtrl.getFactoryCategories);
router.post("/factory/products", globalStockCtrl.createFactoryProduct);
router.post("/factory/products/bulk", globalStockCtrl.createFactoryProductsBulk);
router.delete("/factory/products/:product", globalStockCtrl.deleteFactoryProduct);
router.get("/factory/catalog", globalStockCtrl.getFactoryCatalog);
router.get(
  "/factory/catalog/category/:category/subcategory/:subcategory",
  globalStockCtrl.getFactoryCatalogBySubcategory,
);

// 🌱 Zavod → Global (filial omborini seed qilish)
router.post("/stock/seed", globalStockCtrl.seedBranchStock);

// 📦 Filial → Global (o‘z omborini ko‘rish)
router.get("/stocks", globalStockCtrl.getAllBranchStocks);
router.get("/stock/:branch_code", globalStockCtrl.getBranchStock);
router.delete(
  "/stock/:branch_code/products/by-name",
  globalStockCtrl.deleteBranchStockProductByName,
);
router.put(
  "/stock/:branch_code/products/:product_id",
  globalStockCtrl.updateBranchStockProduct,
);
router.delete(
  "/stock/:branch_code/products/:product_id",
  globalStockCtrl.deleteBranchStockProduct,
);

// 🧾 Shop Orders
router.post("/shop-orders", createOrder);
router.get("/shop-orders", getAllOrders);
router.patch("/shop-orders/:id/approve", approveOrder);
router.patch("/shop-orders/:id/reject", rejectOrder);
router.patch("/shop-orders/:id/receive", receiveOrder);
router.get("/shop-orders/:id", getOrderById);

// 🔄 Zavod queue sync endpoint (legacy compatibility)
router.post("/sync", globalStockCtrl.syncGlobalProduct);
module.exports = router;
