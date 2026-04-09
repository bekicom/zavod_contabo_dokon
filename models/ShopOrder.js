const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },

    soni: {
      // so‘ralgan jami son
      type: Number,
      required: true,
      min: 1,
    },

    approved_soni: {
      // zavod tomonidan jami tasdiqlab yuborilgan son
      type: Number,
      default: 0,
      min: 0,
    },

    pending_soni: {
      // hali yuborilmagan (backorder) son
      type: Number,
      default: 0,
      min: 0,
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
      enum: ["PENDING", "PARTIAL", "APPROVED", "REJECTED", "RECEIVED"],
      default: "PENDING",
    },

    approved_at: Date,
    received_at: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("ShopOrder", ShopOrderSchema);
