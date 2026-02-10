const GlobalBranchStock = require("../models/GlobalBranchStock");

/* ===================================================
   🌱 Zavoddan filial omboriga boshlang‘ich seed
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
      const { mahsulot, miqdor, birlik } = item;

      if (!mahsulot || !miqdor || miqdor <= 0) continue;

      const filter = {
        branch_code,
        mahsulot,
      };

      const update = {
        $inc: { miqdor: Number(miqdor) },
        $setOnInsert: {
          branch_code,
          mahsulot,
          birlik: birlik || "dona",
          source: "factory",
        },
        $push: {
          tarix: {
            miqdor: Number(miqdor),
            amal: "seed",
            izoh: sent_by || "factory-admin",
            sana: new Date(),
          },
        },
      };

      const doc = await GlobalBranchStock.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });

      results.push(doc);
    }

    res.json({
      success: true,
      message: "✅ Filial ombori muvaffaqiyatli to‘ldirildi",
      count: results.length,
      data: results,
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
   📦 Filial omborini olish
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

    const list = await GlobalBranchStock.find({
      branch_code,
    })
      .sort({ mahsulot: 1 })
      .lean();

    res.json({
      success: true,
      branch_code,
      count: list.length,
      data: list.map((item) => ({
        mahsulot: item.mahsulot,
        birlik: item.birlik,
        miqdor: item.miqdor,
        source: item.source,
        updatedAt: item.updatedAt,
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
