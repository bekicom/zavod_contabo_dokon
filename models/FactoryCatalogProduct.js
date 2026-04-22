const mongoose = require("mongoose");

const FactoryCatalogProductSchema = new mongoose.Schema(
  {
    mahsulot: {
      type: String,
      required: true,
      trim: true,
    },
    product_key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    category_key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory_key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    birlik: {
      type: String,
      enum: ["kg", "dona", "pachka", "blok"],
      default: "dona",
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

FactoryCatalogProductSchema.index({ category_key: 1, subcategory_key: 1 });

module.exports = mongoose.model("FactoryCatalogProduct", FactoryCatalogProductSchema);
