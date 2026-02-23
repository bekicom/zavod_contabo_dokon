const GlobalBranchStock = require("../models/GlobalBranchStock");

/* ===================================================
   🌱 Zavoddan filialga mahsulotni RO‘YXATGA QO‘SHISH
   POST /api/global/stock/seed
   body:
   {
     "branch_code": "navoiy",
     "sent_by": "factory-admin",
     "items": [
       { "mahsulot": "Goshtli somsa", "birlik": "dona", "price": 12000 },
       { "mahsulot": "Shakar", "birlik": "kg", "price": 15000 }
     ]
   }
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

    const cleanBranchCode = String(branch_code).trim().toLowerCase();
    const results = [];

    for (const raw of items) {
      const mahsulot = raw?.mahsulot ? String(raw.mahsulot).trim() : "";
      if (!mahsulot) continue;

      const birlik = raw?.birlik ? String(raw.birlik).trim() : "dona";
      const parsedprice = Number(raw?.price ?? 0);

      if (Number.isNaN(parsedprice) || parsedprice < 0) {
        return res.status(400).json({
          success: false,
          message: `${mahsulot} uchun price noto‘g‘ri`,
        });
      }

      // MUHIM: konflikt bo‘lmasligi uchun birlik faqat $set ichida
      const doc = await GlobalBranchStock.findOneAndUpdate(
        { branch_code: cleanBranchCode, mahsulot },
        {
          $setOnInsert: {
            branch_code: cleanBranchCode,
            mahsulot,
            source: "factory",
            miqdor: 0,
          },
          $set: {
            birlik,
            price: parsedprice,
          },
          $push: {
            tarix: {
              miqdor: 0,
              price: parsedprice,
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

    return res.json({
      success: true,
      message: "✅ Mahsulotlar filialga muvaffaqiyatli qo‘shildi/yangilandi",
      count: results.length,
      data: results.map((i) => ({
        branch_code: i.branch_code,
        mahsulot: i.mahsulot,
        birlik: i.birlik,
        miqdor: i.miqdor,
        price: i.price || 0,
      })),
    });
  } catch (err) {
    console.error("seedBranchStock error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   📦 Filialga ruxsat etilgan mahsulotlar ro‘yxati
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

    const cleanBranchCode = String(branch_code).trim().toLowerCase();

    const list = await GlobalBranchStock.find({ branch_code: cleanBranchCode })
      .sort({ mahsulot: 1 })
      .lean();

    return res.json({
      success: true,
      branch_code: cleanBranchCode,
      count: list.length,
      data: list.map((item) => ({
        mahsulot: item.mahsulot,
        birlik: item.birlik,
        miqdor: item.miqdor,
        price: item.price || 0,
        source: item.source || "factory",
        updatedAt: item.updatedAt,
      })),
    });
  } catch (err) {
    console.error("getBranchStock error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};
