const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },

    soni: {
      // 🔥 qty o‘rniga soni
      type: Number,
      required: true,
      min: 1,
    },

    unit: {
      type: String,
      enum: ["kg", "dona", "pachka", "blok"],
      default: "dona",
    },
  },
  { _id: false },
);

const ShopOrderSchema = new mongoose.Schema(
  {
    shop_name: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [OrderItemSchema],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "RECEIVED"],
      default: "PENDING",
    },

    approved_at: Date,
    received_at: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("ShopOrder", ShopOrderSchema);
