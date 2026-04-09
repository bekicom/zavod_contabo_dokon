const GlobalBranchStock = require("../models/GlobalBranchStock");
const FactoryCategory = require("../models/FactoryCategory");
const FactoryCatalogProduct = require("../models/FactoryCatalogProduct");

const ALLOWED_UNITS = new Set(["kg", "dona", "pachka", "blok"]);

const normalizeText = (value) => String(value || "").trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();

const toCategoryResponse = (row) => ({
  category: row.category,
  subcategories: row.subcategories || [],
});

/* ===================================================
   🏭 Zavod kategoriyasi yaratish
   POST /api/global/factory/categories
=================================================== */
exports.createFactoryCategory = async (req, res) => {
  try {
    const category = normalizeText(req.body?.category);
    const categoryKey = normalizeKey(category);
    const subcategories = Array.isArray(req.body?.subcategories)
      ? req.body.subcategories.map(normalizeText).filter(Boolean)
      : [];

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "category majburiy",
      });
    }

    const doc = await FactoryCategory.findOneAndUpdate(
      { category_key: categoryKey },
      {
        $setOnInsert: {
          category,
          category_key: categoryKey,
        },
        ...(subcategories.length > 0
          ? { $addToSet: { subcategories: { $each: subcategories } } }
          : {}),
      },
      { upsert: true, new: true },
    );

    return res.json({
      success: true,
      message: "Zavod kategoriyasi saqlandi ✅",
      data: toCategoryResponse(doc),
    });
  } catch (err) {
    console.error("createFactoryCategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   ✏️ Zavod kategoriyasini tahrirlash
   PUT /api/global/factory/categories/:category
=================================================== */
exports.updateFactoryCategory = async (req, res) => {
  try {
    const oldCategory = normalizeText(req.params?.category);
    const nextCategory = normalizeText(req.body?.category);
    const nextSubcategories = Array.isArray(req.body?.subcategories)
      ? [...new Set(req.body.subcategories.map(normalizeText).filter(Boolean))]
      : null;

    if (!oldCategory) {
      return res.status(400).json({
        success: false,
        message: "category param majburiy",
      });
    }

    const current = await FactoryCategory.findOne({
      category_key: normalizeKey(oldCategory),
    });

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Kategoriya topilmadi",
      });
    }

    let targetCategoryName = current.category;
    let targetCategoryKey = current.category_key;

    if (nextCategory && normalizeKey(nextCategory) !== current.category_key) {
      const exists = await FactoryCategory.findOne({
        category_key: normalizeKey(nextCategory),
      }).lean();
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Bunday nomdagi kategoriya allaqachon mavjud",
        });
      }

      targetCategoryName = nextCategory;
      targetCategoryKey = normalizeKey(nextCategory);
    }

    current.category = targetCategoryName;
    current.category_key = targetCategoryKey;
    if (nextSubcategories !== null) {
      current.subcategories = nextSubcategories;
    }
    await current.save();

    await FactoryCatalogProduct.updateMany(
      { category_key: normalizeKey(oldCategory) },
      {
        $set: {
          category: targetCategoryName,
          category_key: targetCategoryKey,
        },
      },
    );

    await GlobalBranchStock.updateMany(
      { category: oldCategory },
      {
        $set: {
          category: targetCategoryName,
        },
      },
    );

    return res.json({
      success: true,
      message: "Kategoriya yangilandi ✅",
      data: toCategoryResponse(current),
    });
  } catch (err) {
    console.error("updateFactoryCategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🗑️ Zavod kategoriyasini o‘chirish (cascade)
   DELETE /api/global/factory/categories/:category
=================================================== */
exports.deleteFactoryCategory = async (req, res) => {
  try {
    const category = normalizeText(req.params?.category);

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "category param majburiy",
      });
    }

    const categoryDoc = await FactoryCategory.findOneAndDelete({
      category_key: normalizeKey(category),
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Kategoriya topilmadi",
      });
    }

    const removedCatalog = await FactoryCatalogProduct.deleteMany({
      category_key: categoryDoc.category_key,
    });

    const removedBranchStock = await GlobalBranchStock.deleteMany({
      category: categoryDoc.category,
    });

    return res.json({
      success: true,
      message: "Kategoriya o‘chirildi ✅",
      data: {
        deleted_category: categoryDoc.category,
        deleted_catalog_products: removedCatalog.deletedCount || 0,
        deleted_branch_products: removedBranchStock.deletedCount || 0,
      },
    });
  } catch (err) {
    console.error("deleteFactoryCategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🧩 Zavod kategoriyasiga subkategoriya qo‘shish
   POST /api/global/factory/categories/subcategory
=================================================== */
exports.addFactorySubcategory = async (req, res) => {
  try {
    const category = normalizeText(req.body?.category);
    const subcategory = normalizeText(req.body?.subcategory);

    if (!category || !subcategory) {
      return res.status(400).json({
        success: false,
        message: "category va subcategory majburiy",
      });
    }

    const updated = await FactoryCategory.findOneAndUpdate(
      { category_key: normalizeKey(category) },
      { $addToSet: { subcategories: subcategory } },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Kategoriya topilmadi",
      });
    }

    return res.json({
      success: true,
      message: "Subkategoriya qo‘shildi ✅",
      data: toCategoryResponse(updated),
    });
  } catch (err) {
    console.error("addFactorySubcategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   ✏️ Zavod subkategoriyasini tahrirlash
   PUT /api/global/factory/categories/:category/subcategories/:subcategory
=================================================== */
exports.updateFactorySubcategory = async (req, res) => {
  try {
    const category = normalizeText(req.params?.category);
    const oldSubcategory = normalizeText(req.params?.subcategory);
    const nextSubcategory = normalizeText(req.body?.subcategory);

    if (!category || !oldSubcategory || !nextSubcategory) {
      return res.status(400).json({
        success: false,
        message: "category, subcategory param va body.subcategory majburiy",
      });
    }

    const categoryDoc = await FactoryCategory.findOne({
      category_key: normalizeKey(category),
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Kategoriya topilmadi",
      });
    }

    const idx = (categoryDoc.subcategories || []).findIndex(
      (s) => normalizeKey(s) === normalizeKey(oldSubcategory),
    );
    if (idx < 0) {
      return res.status(404).json({
        success: false,
        message: "Subkategoriya topilmadi",
      });
    }

    const duplicate = (categoryDoc.subcategories || []).some(
      (s, i) => i !== idx && normalizeKey(s) === normalizeKey(nextSubcategory),
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Bunday nomdagi subkategoriya allaqachon mavjud",
      });
    }

    const previousSub = categoryDoc.subcategories[idx];
    categoryDoc.subcategories[idx] = nextSubcategory;
    await categoryDoc.save();

    await FactoryCatalogProduct.updateMany(
      {
        category_key: categoryDoc.category_key,
        subcategory_key: normalizeKey(previousSub),
      },
      {
        $set: {
          subcategory: nextSubcategory,
          subcategory_key: normalizeKey(nextSubcategory),
        },
      },
    );

    await GlobalBranchStock.updateMany(
      { category: categoryDoc.category, subcategory: previousSub },
      {
        $set: {
          subcategory: nextSubcategory,
        },
      },
    );

    return res.json({
      success: true,
      message: "Subkategoriya yangilandi ✅",
      data: toCategoryResponse(categoryDoc),
    });
  } catch (err) {
    console.error("updateFactorySubcategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🗑️ Zavod subkategoriyasini o‘chirish (cascade)
   DELETE /api/global/factory/categories/:category/subcategories/:subcategory
=================================================== */
exports.deleteFactorySubcategory = async (req, res) => {
  try {
    const category = normalizeText(req.params?.category);
    const subcategory = normalizeText(req.params?.subcategory);

    if (!category || !subcategory) {
      return res.status(400).json({
        success: false,
        message: "category va subcategory param majburiy",
      });
    }

    const categoryDoc = await FactoryCategory.findOne({
      category_key: normalizeKey(category),
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Kategoriya topilmadi",
      });
    }

    const nextSubs = (categoryDoc.subcategories || []).filter(
      (s) => normalizeKey(s) !== normalizeKey(subcategory),
    );

    if (nextSubs.length === (categoryDoc.subcategories || []).length) {
      return res.status(404).json({
        success: false,
        message: "Subkategoriya topilmadi",
      });
    }

    categoryDoc.subcategories = nextSubs;
    await categoryDoc.save();

    const removedCatalog = await FactoryCatalogProduct.deleteMany({
      category_key: categoryDoc.category_key,
      subcategory_key: normalizeKey(subcategory),
    });

    const removedBranchStock = await GlobalBranchStock.deleteMany({
      category: categoryDoc.category,
      subcategory,
    });

    return res.json({
      success: true,
      message: "Subkategoriya o‘chirildi ✅",
      data: {
        category: categoryDoc.category,
        deleted_subcategory: subcategory,
        deleted_catalog_products: removedCatalog.deletedCount || 0,
        deleted_branch_products: removedBranchStock.deletedCount || 0,
      },
    });
  } catch (err) {
    console.error("deleteFactorySubcategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   📚 Zavod kategoriyalari
   GET /api/global/factory/categories
=================================================== */
exports.getFactoryCategories = async (req, res) => {
  try {
    const list = await FactoryCategory.find({}).sort({ category: 1 }).lean();

    return res.json({
      success: true,
      count: list.length,
      data: list.map(toCategoryResponse),
    });
  } catch (err) {
    console.error("getFactoryCategories error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   📦 Zavod katalogiga mahsulot biriktirish
   POST /api/global/factory/products
=================================================== */
exports.createFactoryProduct = async (req, res) => {
  try {
    if (Array.isArray(req.body?.items)) {
      return exports.createFactoryProductsBulk(req, res);
    }

    const productName = normalizeText(req.body?.mahsulot ?? req.body?.name);
    const category = normalizeText(req.body?.category);
    const subcategory = normalizeText(req.body?.subcategory);
    const birlik = normalizeText(req.body?.birlik || "dona");
    const price = Number(req.body?.price ?? 0);

    if (!productName || !category || !subcategory) {
      return res.status(400).json({
        success: false,
        message: "mahsulot(name), category va subcategory majburiy",
      });
    }

    if (!ALLOWED_UNITS.has(birlik)) {
      return res.status(400).json({
        success: false,
        message: "birlik noto‘g‘ri qiymat",
      });
    }

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "price 0 yoki undan katta son bo‘lishi kerak",
      });
    }

    const categoryDoc = await FactoryCategory.findOne({
      category_key: normalizeKey(category),
    }).lean();

    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: `"${category}" kategoriyasi topilmadi`,
      });
    }

    const subcategoryValue =
      (categoryDoc.subcategories || []).find(
        (s) => normalizeKey(s) === normalizeKey(subcategory),
      ) || null;

    if (!subcategoryValue) {
      return res.status(400).json({
        success: false,
        message: `"${subcategory}" subkategoriya "${categoryDoc.category}" ichida topilmadi`,
      });
    }

    const productKey = normalizeKey(productName);
    const doc = await FactoryCatalogProduct.findOneAndUpdate(
      { product_key: productKey },
      {
        $setOnInsert: {
          mahsulot: productName,
          product_key: productKey,
        },
        $set: {
          category: categoryDoc.category,
          category_key: normalizeKey(categoryDoc.category),
          subcategory: subcategoryValue,
          subcategory_key: normalizeKey(subcategoryValue),
          birlik,
          price,
        },
      },
      { upsert: true, new: true },
    );

    return res.json({
      success: true,
      message: "Mahsulot zavod katalogiga saqlandi ✅",
      data: doc,
    });
  } catch (err) {
    console.error("createFactoryProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   📦 Zavod katalogiga mahsulotlarni bulk biriktirish
   POST /api/global/factory/products/bulk
=================================================== */
exports.createFactoryProductsBulk = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items ro'yxati majburiy",
      });
    }

    const normalizedRows = items.map((raw, index) => ({
      index,
      mahsulot: normalizeText(raw?.mahsulot ?? raw?.name),
      category: normalizeText(raw?.category),
      subcategory: normalizeText(raw?.subcategory),
      birlik: normalizeText(raw?.birlik || "dona"),
      price: Number(raw?.price ?? 0),
    }));

    const categoryKeySet = new Set(
      normalizedRows.map((r) => normalizeKey(r.category)).filter(Boolean),
    );
    const categoryDocs = await FactoryCategory.find({
      category_key: { $in: [...categoryKeySet] },
    }).lean();
    const categoryMap = new Map(categoryDocs.map((c) => [c.category_key, c]));

    const results = [];
    const errors = [];

    for (const row of normalizedRows) {
      const errPrefix = `items[${row.index}]`;
      if (!row.mahsulot || !row.category || !row.subcategory) {
        errors.push({
          index: row.index,
          message: `${errPrefix}: mahsulot(name), category va subcategory majburiy`,
        });
        continue;
      }

      if (!ALLOWED_UNITS.has(row.birlik)) {
        errors.push({
          index: row.index,
          message: `${errPrefix}: birlik noto‘g‘ri qiymat`,
        });
        continue;
      }

      if (!Number.isFinite(row.price) || row.price < 0) {
        errors.push({
          index: row.index,
          message: `${errPrefix}: price 0 yoki undan katta son bo‘lishi kerak`,
        });
        continue;
      }

      const categoryDoc = categoryMap.get(normalizeKey(row.category));
      if (!categoryDoc) {
        errors.push({
          index: row.index,
          message: `${errPrefix}: "${row.category}" kategoriyasi topilmadi`,
        });
        continue;
      }

      const subcategoryValue =
        (categoryDoc.subcategories || []).find(
          (s) => normalizeKey(s) === normalizeKey(row.subcategory),
        ) || null;

      if (!subcategoryValue) {
        errors.push({
          index: row.index,
          message: `${errPrefix}: "${row.subcategory}" subkategoriya "${categoryDoc.category}" ichida topilmadi`,
        });
        continue;
      }

      const productKey = normalizeKey(row.mahsulot);
      const doc = await FactoryCatalogProduct.findOneAndUpdate(
        { product_key: productKey },
        {
          $setOnInsert: {
            mahsulot: row.mahsulot,
            product_key: productKey,
          },
          $set: {
            category: categoryDoc.category,
            category_key: normalizeKey(categoryDoc.category),
            subcategory: subcategoryValue,
            subcategory_key: normalizeKey(subcategoryValue),
            birlik: row.birlik,
            price: row.price,
          },
        },
        { upsert: true, new: true },
      );

      results.push(doc);
    }

    return res.json({
      success: true,
      message:
        errors.length > 0
          ? "Bulk saqlash yakunlandi (ba'zi itemlar xato bilan o'tkazib yuborildi)"
          : "Bulk saqlash muvaffaqiyatli yakunlandi ✅",
      total: items.length,
      saved_count: results.length,
      error_count: errors.length,
      data: results,
      errors,
    });
  } catch (err) {
    console.error("createFactoryProductsBulk error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🗂️ Zavod katalogi (grouped)
   GET /api/global/factory/catalog
=================================================== */
exports.getFactoryCatalog = async (req, res) => {
  try {
    const list = await FactoryCatalogProduct.find({})
      .sort({ category: 1, subcategory: 1, mahsulot: 1 })
      .lean();

    const grouped = {};
    for (const item of list) {
      if (!grouped[item.category]) grouped[item.category] = {};
      if (!grouped[item.category][item.subcategory]) {
        grouped[item.category][item.subcategory] = [];
      }
      grouped[item.category][item.subcategory].push({
        _id: item._id,
        mahsulot: item.mahsulot,
        birlik: item.birlik,
        price: Number(item.price || 0),
      });
    }

    return res.json({
      success: true,
      count: list.length,
      data: list,
      grouped,
    });
  } catch (err) {
    console.error("getFactoryCatalog error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🔎 Kategoriya/Subkategoriya bo‘yicha zavod katalogi
   GET /api/global/factory/catalog/category/:category/subcategory/:subcategory
=================================================== */
exports.getFactoryCatalogBySubcategory = async (req, res) => {
  try {
    const category = normalizeText(req.params?.category);
    const subcategory = normalizeText(req.params?.subcategory);

    if (!category || !subcategory) {
      return res.status(400).json({
        success: false,
        message: "category va subcategory majburiy",
      });
    }

    const list = await FactoryCatalogProduct.find({
      category_key: normalizeKey(category),
      subcategory_key: normalizeKey(subcategory),
    })
      .sort({ mahsulot: 1 })
      .lean();

    return res.json({
      success: true,
      category,
      subcategory,
      count: list.length,
      data: list.map((item) => ({
        _id: item._id,
        mahsulot: item.mahsulot,
        birlik: item.birlik,
        price: Number(item.price || 0),
        category: item.category,
        subcategory: item.subcategory,
      })),
    });
  } catch (err) {
    console.error("getFactoryCatalogBySubcategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🌱 Zavod katalogidan filialga mahsulot yuborish
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

    const cleanBranchCode = normalizeKey(branch_code);
    const productKeys = [
      ...new Set(
        items
          .map((raw) => normalizeKey(raw?.mahsulot ?? raw?.name))
          .filter(Boolean),
      ),
    ];

    const catalogRows = await FactoryCatalogProduct.find({
      product_key: { $in: productKeys },
    }).lean();
    const catalogMap = new Map(catalogRows.map((row) => [row.product_key, row]));

    const missingProduct = productKeys.find((key) => !catalogMap.has(key));
    if (missingProduct) {
      return res.status(400).json({
        success: false,
        message: `"${missingProduct}" zavod katalogida topilmadi. Avval katalogga biriktiring`,
      });
    }

    const results = [];

    for (const raw of items) {
      const mahsulotRaw = normalizeText(raw?.mahsulot ?? raw?.name);
      if (!mahsulotRaw) continue;

      const catalogProduct = catalogMap.get(normalizeKey(mahsulotRaw));
      if (!catalogProduct) continue;

      const birlik = normalizeText(raw?.birlik) || catalogProduct.birlik || "dona";
      const parsedPrice = Number(raw?.price ?? catalogProduct.price ?? 0);

      if (!ALLOWED_UNITS.has(birlik)) {
        return res.status(400).json({
          success: false,
          message: `${mahsulotRaw} uchun birlik noto‘g‘ri`,
        });
      }

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `${mahsulotRaw} uchun price noto‘g‘ri`,
        });
      }

      const doc = await GlobalBranchStock.findOneAndUpdate(
        { branch_code: cleanBranchCode, mahsulot: catalogProduct.mahsulot },
        {
          $setOnInsert: {
            branch_code: cleanBranchCode,
            mahsulot: catalogProduct.mahsulot,
            source: "factory",
            miqdor: 0,
          },
          $set: {
            birlik,
            price: parsedPrice,
            category: catalogProduct.category,
            subcategory: catalogProduct.subcategory,
          },
          $push: {
            tarix: {
              miqdor: 0,
              price: parsedPrice,
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
      message: "✅ Mahsulotlar filialga muvaffaqiyatli yuborildi/yangilandi",
      count: results.length,
      data: results.map((i) => ({
        _id: i._id,
        branch_code: i.branch_code,
        mahsulot: i.mahsulot,
        category: i.category || "",
        subcategory: i.subcategory || "",
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

    const cleanBranchCode = normalizeKey(branch_code);
    const list = await GlobalBranchStock.find({ branch_code: cleanBranchCode })
      .sort({ category: 1, subcategory: 1, mahsulot: 1 })
      .lean();

    const grouped = {};
    for (const item of list) {
      const category = item.category || "Boshqa";
      const subcategory = item.subcategory || "Boshqa";
      if (!grouped[category]) grouped[category] = {};
      if (!grouped[category][subcategory]) grouped[category][subcategory] = [];
      grouped[category][subcategory].push({
        _id: item._id,
        mahsulot: item.mahsulot,
        birlik: item.birlik,
        miqdor: item.miqdor,
        price: item.price || 0,
        source: item.source || "factory",
        updatedAt: item.updatedAt,
      });
    }

    return res.json({
      success: true,
      branch_code: cleanBranchCode,
      count: list.length,
      data: list.map((item) => ({
        _id: item._id,
        mahsulot: item.mahsulot,
        category: item.category || "",
        subcategory: item.subcategory || "",
        birlik: item.birlik,
        miqdor: item.miqdor,
        price: item.price || 0,
        source: item.source || "factory",
        updatedAt: item.updatedAt,
      })),
      grouped,
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

/* ===================================================
   🗑️ Filial omboridan mahsulotni o‘chirish
=================================================== */
exports.deleteBranchStockProduct = async (req, res) => {
  try {
    const branchCode = normalizeKey(req.params?.branch_code);
    const productId = normalizeText(req.params?.product_id);

    if (!branchCode || !productId) {
      return res.status(400).json({
        success: false,
        message: "branch_code va product_id majburiy",
      });
    }

    const deleted = await GlobalBranchStock.findOneAndDelete({
      _id: productId,
      branch_code: branchCode,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "O‘chirish uchun mahsulot topilmadi",
      });
    }

    return res.json({
      success: true,
      message: "Mahsulot filial omboridan o‘chirildi ✅",
      data: {
        _id: deleted._id,
        branch_code: deleted.branch_code,
        mahsulot: deleted.mahsulot,
        category: deleted.category || "",
        subcategory: deleted.subcategory || "",
      },
    });
  } catch (err) {
    console.error("deleteBranchStockProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};

/* ===================================================
   🔄 Zavod queue sync (price/birlik update)
=================================================== */
exports.syncGlobalProduct = async (req, res) => {
  try {
    const rawName = req.body?.name ?? req.body?.mahsulot;
    const name = normalizeText(rawName);
    const rawPrice = req.body?.price;
    const birlik = normalizeText(req.body?.birlik);
    const rawBranchCode = normalizeKey(req.body?.branch_code);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name (yoki mahsulot) majburiy",
      });
    }

    if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
      return res.status(400).json({
        success: false,
        message: "price majburiy",
      });
    }

    const parsedPrice = Number(rawPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "price 0 yoki undan katta son bo‘lishi kerak",
      });
    }

    if (birlik && !ALLOWED_UNITS.has(birlik)) {
      return res.status(400).json({
        success: false,
        message: "birlik noto‘g‘ri qiymat",
      });
    }

    const now = new Date();
    const update = {
      $set: {
        price: parsedPrice,
        ...(birlik ? { birlik } : {}),
      },
      $push: {
        tarix: {
          miqdor: 0,
          price: parsedPrice,
          amal: "seed",
          izoh: "factory-sync",
          sana: now,
        },
      },
    };

    const productKey = normalizeKey(name);
    await FactoryCatalogProduct.updateMany(
      { product_key: productKey },
      {
        $set: {
          price: parsedPrice,
          ...(birlik ? { birlik } : {}),
        },
      },
    );

    if (rawBranchCode) {
      const updated = await GlobalBranchStock.findOneAndUpdate(
        { branch_code: rawBranchCode, mahsulot: name },
        update,
        { new: true },
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Berilgan branch_code uchun mahsulot topilmadi",
        });
      }

      return res.json({
        success: true,
        message: "Mahsulot narxi filial bo‘yicha yangilandi",
        data: {
          branch_code: updated.branch_code,
          mahsulot: updated.mahsulot,
          birlik: updated.birlik,
          price: Number(updated.price || 0),
          updatedAt: updated.updatedAt,
        },
      });
    }

    const updateResult = await GlobalBranchStock.updateMany({ mahsulot: name }, update);

    if (!updateResult.modifiedCount) {
      return res.status(404).json({
        success: false,
        message: "Yangilash uchun mahsulot topilmadi",
      });
    }

    return res.json({
      success: true,
      message: "Mahsulot narxi barcha filiallarda yangilandi",
      data: {
        mahsulot: name,
        updated_count: updateResult.modifiedCount,
        matched_count: updateResult.matchedCount,
        price: parsedPrice,
        birlik: birlik || null,
      },
    });
  } catch (err) {
    console.error("syncGlobalProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: err.message,
    });
  }
};
