const GlobalBranchStock = require("../models/GlobalBranchStock");

/* ===================================================
   🌱 Zavoddan filialga mahsulotni RO‘YXATGA QO‘SHISH
   POST /api/global/stock/seed
=================================================== */
exports.seedBranchStock = async (req, res) => {
  try {
    const { branch_code, items, sent_by } = req.body;

    if (!branch_code || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "branch_code va items majburiy",
      });
    }

    const results = [];

    for (const item of items) {
      const { mahsulot, birlik } = item;
      if (!mahsulot) continue;

      const doc = await GlobalBranchStock.findOneAndUpdate(
        { branch_code, mahsulot },
        {
          $setOnInsert: {
            branch_code,
            mahsulot,
            birlik: birlik || "dona",
            source: "factory",
            miqdor: 0,
          },
          $push: {
            tarix: {
              miqdor: 0,
              amal: "seed",
              izoh: sent_by || "factory-admin",
              sana: new Date(),
            },
          },
        },
        { upsert: true, new: true },
      );

      results.push(doc);
    }

    res.json({
      success: true,
      message: "✅ Mahsulotlar filialga ruxsat sifatida qo‘shildi",
      count: results.length,
      data: results.map((i) => i.mahsulot),
    });
  } catch (err) {
    console.error("seedBranchStock error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};


/* ===================================================
   📦 Filialga RUXSAT ETILGAN mahsulotlar
   GET /api/global/stock/:branch_code
=================================================== */
exports.getBranchStock = async (req, res) => {
  try {
    const { branch_code } = req.params;

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        message: "branch_code majburiy",
      });
    }

    const list = await GlobalBranchStock.find({ branch_code })
      .sort({ mahsulot: 1 })
      .lean();

    res.json({
      success: true,
      branch_code,
      count: list.length,
      data: list.map((item) => ({
        mahsulot: item.mahsulot,
        birlik: item.birlik,
      })),
    });
  } catch (err) {
    console.error("getBranchStock error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

