const mongoose = require("mongoose");

const shopOrderSchema = new mongoose.Schema(
  {
    shop_name: {
      type: String,
      required: true,
      trim: true,
    },

    product_name: {
      type: String,
      required: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unit: {
      type: String,
      required: true,
      enum: ["dona", "kg"],
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    approved_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ShopOrder", shopOrderSchema);
