const mongoose = require("mongoose");
const FactoryReturn = require("../models/FactoryReturn");
const GlobalBranchStock = require("../models/GlobalBranchStock");

const normalizeText = (value) => String(value || "").trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();

const parseQuantityInput = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(String(value).trim().replaceAll(",", "."));
};

const normalizeReturnItems = (payload) => {
  const rawItems = Array.isArray(payload?.items)
    ? payload.items
    : payload?.mahsulot || payload?.name
      ? [payload]
      : [];

  return rawItems
    .map((raw) => {
      const product_name = normalizeText(raw?.mahsulot ?? raw?.name);
      const soni = parseQuantityInput(raw?.soni ?? raw?.qty ?? raw?.count);
      const unit = normalizeText((raw?.birlik ?? raw?.unit) || "dona");
      const category_name = normalizeText(
        (raw?.category_name ?? raw?.category_title ?? raw?.category) || "",
      );
      const subcategory = normalizeText(raw?.subcategory || "");
      const category = normalizeText(raw?.category || "");

      if (!product_name) {
        return null;
      }

      if (!Number.isFinite(soni) || soni < 1) {
        throw new Error(`Mahsulot soni noto‘g‘ri: ${product_name}`);
      }

      if (unit.toLowerCase() !== "kg" && !Number.isInteger(soni)) {
        throw new Error(`${product_name} uchun miqdor butun son bo‘lishi kerak`);
      }

      return {
        product_name,
        soni,
        unit,
        category_name,
        subcategory,
        category,
      };
    })
    .filter(Boolean);
};

exports.createFactoryReturn = async (req, res) => {
  try {
    const branch_code = normalizeKey(req.body?.branch_code);
    const created_by = normalizeText(req.body?.created_by);
    const note = normalizeText(req.body?.note);
    const items = normalizeReturnItems(req.body);

    if (!branch_code || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "branch_code va items majburiy",
      });
    }

    const doc = await FactoryReturn.create({
      branch_code,
      items,
      status: "PENDING",
      created_by,
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Vazvrat yaratildi ✅",
      data: doc,
    });
  } catch (err) {
    console.error("createFactoryReturn error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

exports.getFactoryReturns = async (req, res) => {
  try {
    const filter = {};
    if (req.query?.status) {
      filter.status = String(req.query.status).trim().toUpperCase();
    }
    if (req.query?.branch_code) {
      filter.branch_code = normalizeKey(req.query.branch_code);
    }

    const list = await FactoryReturn.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error("getFactoryReturns error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

exports.getFactoryReturnsByBranch = async (req, res) => {
  try {
    const branch_code = normalizeKey(req.params?.branch_code);
    if (!branch_code) {
      return res.status(400).json({
        success: false,
        message: "branch_code majburiy",
      });
    }

    const list = await FactoryReturn.find({ branch_code }).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      branch_code,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error("getFactoryReturnsByBranch error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

exports.rejectFactoryReturn = async (req, res) => {
  try {
    const returnId = normalizeText(req.params?.id);
    const rejected_by = normalizeText(req.body?.rejected_by);

    if (!mongoose.Types.ObjectId.isValid(returnId)) {
      return res.status(400).json({
        success: false,
        message: "id noto‘g‘ri formatda",
      });
    }

    const doc = await FactoryReturn.findById(returnId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Vazvrat topilmadi",
      });
    }

    if (doc.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Faqat PENDING vazvrat rad etiladi",
      });
    }

    doc.status = "REJECTED";
    doc.rejected_at = new Date();
    doc.rejected_by = rejected_by;
    await doc.save();

    return res.json({
      success: true,
      message: "Vazvrat rad etildi",
      data: doc,
    });
  } catch (err) {
    console.error("rejectFactoryReturn error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

exports.approveFactoryReturn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const returnId = normalizeText(req.params?.id);
    const approved_by = normalizeText(req.body?.approved_by);

    if (!mongoose.Types.ObjectId.isValid(returnId)) {
      return res.status(400).json({
        success: false,
        message: "id noto‘g‘ri formatda",
      });
    }

    session.startTransaction();

    const doc = await FactoryReturn.findById(returnId).session(session);
    if (!doc) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Vazvrat topilmadi",
      });
    }

    if (doc.status !== "PENDING") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Faqat PENDING vazvrat tasdiqlanadi",
      });
    }

    const productNames = [...new Set((doc.items || []).map((item) => item.product_name))];
    const stocks = await GlobalBranchStock.find({
      branch_code: doc.branch_code,
      mahsulot: { $in: productNames },
    }).session(session);

    const stockMap = new Map(stocks.map((stock) => [normalizeKey(stock.mahsulot), stock]));

    const now = new Date();
    for (const item of doc.items || []) {
      const qty = parseQuantityInput(item.soni || 0);
      const stock = stockMap.get(normalizeKey(item.product_name));
      const historyPrice = Number(stock?.price || 0);

      await GlobalBranchStock.findOneAndUpdate(
        { branch_code: doc.branch_code, mahsulot: item.product_name },
        {
          $setOnInsert: {
            category: item.category || item.category_name || "",
            subcategory: item.subcategory || "",
            birlik: item.unit || "dona",
            source: "factory",
            price: historyPrice,
          },
          $inc: { miqdor: -qty },
          $push: {
            tarix: {
              miqdor: -qty,
              price: historyPrice,
              amal: "minus",
              izoh: `return:${doc._id}`,
              sana: now,
            },
          },
        },
        {
          session,
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    doc.status = "APPROVED";
    doc.approved_at = now;
    doc.approved_by = approved_by;
    await doc.save({ session });

    await session.commitTransaction();

    return res.json({
      success: true,
      message: "Vazvrat tasdiqlandi, dokon ombori kamaytirildi ✅",
      data: doc,
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    console.error("approveFactoryReturn error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  } finally {
    session.endSession();
  }
};
