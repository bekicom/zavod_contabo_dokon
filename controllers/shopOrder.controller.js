const ShopOrder = require("../models/ShopOrder");

/* =========================
   CREATE ORDER (Dokondan keladi)
========================= */
exports.createOrder = async (req, res) => {
  try {
    const { shop_name, product_name, qty, unit } = req.body;

    if (!shop_name || !product_name || !qty || !unit) {
      return res.status(400).json({
        success: false,
        message: "Ma'lumot yetarli emas",
      });
    }

    const order = await ShopOrder.create({
      shop_name,
      product_name,
      qty,
      unit,
    });

    res.status(201).json({
      success: true,
      message: "Zakaz qabul qilindi",
      data: order,
    });
  } catch (error) {
    console.error("❌ createOrder:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET ALL ORDERS (Zavod ko‘radi)
========================= */
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   APPROVE ORDER (Zavod tasdiqlaydi)
========================= */
exports.approveOrder = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order topilmadi",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Bu order allaqachon ko‘rilgan",
      });
    }

    order.status = "APPROVED";
    order.approved_at = new Date();
    await order.save();

    res.json({
      success: true,
      message: "Order tasdiqlandi",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   REJECT ORDER
========================= */
exports.rejectOrder = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order topilmadi",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Bu order allaqachon ko‘rilgan",
      });
    }

    order.status = "REJECTED";
    await order.save();

    res.json({
      success: true,
      message: "Order rad etildi",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
