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
      enum: [
        "dona",
        "kg",
        "litr",
        "metr",
        "gramm",
        "sm",
        "quti",
        "ta",
        "kg",
        "g",
        "l",
        "ml",
        "m",
        "sm",
        "m2",
        "m3",
        "qop",
      ],
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
      lowercase: true,
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
