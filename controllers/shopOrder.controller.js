const ShopOrder = require("../models/ShopOrder");

/* =========================
   CREATE ORDER
========================= */
exports.createOrder = async (req, res) => {
  try {
    const { shop_name, items } = req.body;

    if (!shop_name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shop yoki items noto‘g‘ri",
      });
    }

    const order = await ShopOrder.create({
      shop_name,
      items,
    });

    res.status(201).json({
      success: true,
      message: "Zakaz qabul qilindi",
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
   GET ALL ORDERS
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
   GET ORDER BY ID  🔥 (DOKONGA KERAK)
========================= */
exports.getOrderById = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order topilmadi",
      });
    }

    res.json({
      success: true,
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
   APPROVE ORDER
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

/* =========================
   RECEIVE ORDER
========================= */
exports.receiveOrder = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order topilmadi",
      });
    }

    if (order.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Faqat APPROVED order qabul qilinadi",
      });
    }

    order.status = "RECEIVED";
    order.received_at = new Date();
    await order.save();

    res.json({
      success: true,
      message: "Order qabul qilindi",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
