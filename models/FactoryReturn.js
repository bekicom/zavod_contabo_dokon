const mongoose = require("mongoose");

const ReturnItemSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    soni: {
      type: Number,
      required: true,
      // Kasr miqdorlar ruxsat (0.5 kg, 0.25 litr, 2.42...): faqat 0 dan katta
      validate: {
        validator: (v) => Number.isFinite(v) && v > 0,
        message: "soni 0 dan katta son bo'lishi kerak",
      },
    },
    // Birlik enum bilan cheklanmaydi: kg, dona, litr, metr, pachka...
    unit: {
      type: String,
      trim: true,
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

const FactoryReturnSchema = new mongoose.Schema(
  {
    branch_code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    items: {
      type: [ReturnItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "items majburiy",
      },
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    created_by: {
      type: String,
      trim: true,
      default: "",
    },
    approved_by: {
      type: String,
      trim: true,
      default: "",
    },
    rejected_by: {
      type: String,
      trim: true,
      default: "",
    },
    approved_at: Date,
    rejected_at: Date,
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

FactoryReturnSchema.index({ branch_code: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("FactoryReturn", FactoryReturnSchema);
