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
      min: 0,
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

    category_name: {
      type: String,
      trim: true,
      default: "",
    },

    subcategory: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const ShipmentRoundItemSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    soni: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: "dona",
      trim: true,
    },
    category_name: {
      type: String,
      trim: true,
      default: "",
    },
    subcategory: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const ShipmentRoundSchema = new mongoose.Schema(
  {
    round_no: {
      type: Number,
      required: true,
      min: 1,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    received_at: {
      type: Date,
      default: null,
    },
    status_after: {
      type: String,
      enum: ["PENDING", "PARTIAL", "APPROVED", "REJECTED", "RECEIVED"],
      default: "PARTIAL",
    },
    total_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    items: {
      type: [ShipmentRoundItemSchema],
      default: [],
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

    report_only: {
      type: Boolean,
      default: false,
      index: true,
    },

    approved_at: Date,
    received_at: Date,
    shipment_rounds: {
      type: [ShipmentRoundSchema],
      default: [],
    },
  },
  { timestamps: true },
);

ShopOrderSchema.index({ shop_name: 1, status: 1, createdAt: -1 });
ShopOrderSchema.index({ status: 1, createdAt: -1 });
ShopOrderSchema.index({ report_only: 1, createdAt: -1 });
ShopOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ShopOrder", ShopOrderSchema);
