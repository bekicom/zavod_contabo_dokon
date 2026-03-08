const ShopOrder = require("../models/ShopOrder");
const GlobalBranchStock = require("../models/GlobalBranchStock");

/* =========================
   CREATE ORDER
========================= */
exports.createOrder = async (req, res) => {
  try {
    const { shop_name, items } = req.body;
    const normalizedShopName =
      typeof shop_name === "string" ? shop_name.trim().toLowerCase() : "";

    if (!normalizedShopName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shop yoki items noto‘g‘ri",
      });
    }

    const order = await ShopOrder.create({
      shop_name: normalizedShopName,
      items,
      status: "PENDING",
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
   GET ALL ORDERS (RECEIVED ko‘rsatmaymiz)
========================= */
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};

    if (status) {
      filter.status = status;
    } else {
      // default holda RECEIVED ko‘rsatmaymiz
      filter.status = { $ne: "RECEIVED" };
    }

    const orders = await ShopOrder.find(filter).sort({ createdAt: -1 }).lean();

    const branchCodes = [...new Set(orders.map((order) => order.shop_name).filter(Boolean))];
    const productNames = [
      ...new Set(
        orders.flatMap((order) =>
          (order.items || []).map((item) => item.product_name).filter(Boolean),
        ),
      ),
    ];

    let priceMap = new Map();

    if (branchCodes.length > 0 && productNames.length > 0) {
      const stockItems = await GlobalBranchStock.find({
        branch_code: { $in: branchCodes },
        mahsulot: { $in: productNames },
      })
        .select("branch_code mahsulot price")
        .lean();

      priceMap = new Map(
        stockItems.map((stock) => [
          `${stock.branch_code}::${stock.mahsulot}`,
          Number(stock.price || 0),
        ]),
      );
    }

    const enrichedOrders = orders.map((order) => ({
      ...order,
      items: (order.items || []).map((item) => ({
        ...item,
        price:
          priceMap.get(`${order.shop_name}::${item.product_name}`) ?? 0,
      })),
    }));

    res.json({
      success: true,
      count: enrichedOrders.length,
      data: enrichedOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET ORDER BY ID
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
