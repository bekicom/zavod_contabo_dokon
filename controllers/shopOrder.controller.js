const ShopOrder = require("../models/ShopOrder");
const GlobalBranchStock = require("../models/GlobalBranchStock");

const normalizeName = (value) => String(value || "").trim().toLowerCase();

const buildInitialOrderItems = (items) => {
  return (items || []).map((rawItem) => {
    const product_name = String(rawItem?.product_name || "").trim();
    const soni = Number(rawItem?.soni);

    if (!product_name) {
      throw new Error("Mahsulot nomi bo'sh bo'lishi mumkin emas");
    }

    if (!Number.isFinite(soni) || soni < 1) {
      throw new Error(`Mahsulot soni noto'g'ri: ${product_name}`);
    }

    return {
      product_name,
      soni,
      approved_soni: 0,
      pending_soni: soni,
      unit: rawItem?.unit || "dona",
    };
  });
};

const normalizeApprovedItems = (incomingItems, existingItems) => {
  const incomingMap = new Map(
    (Array.isArray(incomingItems) ? incomingItems : []).map((item) => [
      normalizeName(item?.product_name),
      item,
    ]),
  );

  const unknownItems = [...incomingMap.keys()].filter(
    (name) =>
      !existingItems.some((item) => normalizeName(item?.product_name) === name),
  );
  if (unknownItems.length > 0) {
    throw new Error(`Mahsulot topilmadi: ${unknownItems[0]}`);
  }

  let approvedInThisRound = 0;

  const normalizedItems = (existingItems || []).map((existingItem) => {
    const key = normalizeName(existingItem.product_name);
    const incoming = incomingMap.get(key);
    const requestedQty = Number(existingItem.soni || 0);
    const alreadyApproved = Number(existingItem.approved_soni || 0);
    const pendingBefore = Math.max(requestedQty - alreadyApproved, 0);

    let dispatchQty = pendingBefore;
    if (Array.isArray(incomingItems)) {
      dispatchQty = incoming ? Number(incoming.soni) : 0;
    }

    if (!Number.isFinite(dispatchQty) || dispatchQty < 0) {
      throw new Error(`Mahsulot soni noto'g'ri: ${existingItem.product_name}`);
    }

    if (dispatchQty > pendingBefore) {
      throw new Error(
        `${existingItem.product_name} soni qolgan miqdordan ko'p bo'lishi mumkin emas (${pendingBefore})`,
      );
    }

    const nextApproved = alreadyApproved + dispatchQty;
    const nextPending = Math.max(requestedQty - nextApproved, 0);
    approvedInThisRound += dispatchQty;

    return {
      product_name: existingItem.product_name,
      soni: requestedQty,
      approved_soni: nextApproved,
      pending_soni: nextPending,
      unit: incoming?.unit || existingItem.unit || "dona",
    };
  });

  return {
    items: normalizedItems,
    approvedInThisRound,
  };
};

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

    const preparedItems = buildInitialOrderItems(items);

    const order = await ShopOrder.create({
      shop_name: normalizedShopName,
      items: preparedItems,
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

    if (["REJECTED", "RECEIVED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Bu orderni qayta tasdiqlab bo'lmaydi",
      });
    }

    const hasPending = (order.items || []).some(
      (item) => Number(item.pending_soni ?? item.soni ?? 0) > 0,
    );

    if (!hasPending) {
      return res.status(400).json({
        success: false,
        message: "Bu order bo'yicha yuborilmagan mahsulot qolmagan",
      });
    }

    const { items: nextItems, approvedInThisRound } = normalizeApprovedItems(
      req.body?.items,
      order.items,
    );

    if (approvedInThisRound <= 0) {
      return res.status(400).json({
        success: false,
        message: "Tasdiqlash uchun kamida bitta mahsulot soni 0 dan katta bo'lishi kerak",
      });
    }

    order.items = nextItems;
    const stillPending = nextItems.some((item) => Number(item.pending_soni || 0) > 0);
    order.status = stillPending ? "PARTIAL" : "APPROVED";
    order.approved_at = new Date();
    await order.save();

    res.json({
      success: true,
      message: stillPending
        ? "Order qisman tasdiqlandi, qolgan mahsulotlar kutilyapti"
        : "Order to'liq tasdiqlandi",
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
