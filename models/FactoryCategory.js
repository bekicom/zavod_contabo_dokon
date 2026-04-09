const mongoose = require("mongoose");

const FactoryCategorySchema = new mongoose.Schema(
  {
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
      unique: true,
    },
    subcategories: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FactoryCategory", FactoryCategorySchema);
