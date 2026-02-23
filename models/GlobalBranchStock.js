const mongoose = require("mongoose");

const GlobalBranchStockSchema = new mongoose.Schema(
  {
    branch_code: {
      type: String,
      required: true,
      index: true, // navoiy, dostlik, ...
    },

    mahsulot: {
      type: String,
      required: true,
      trim: true,
    },

    birlik: {
      type: String,
      enum: ["kg", "dona", "pachka", "blok"],
    },

    miqdor: {
      type: Number,
      default: 0,
    },

    // ✅ YANGI: mahsulotning amaldagi narxi
    narx: {
      type: Number,
      default: 0,
      min: 0,
    },

    // qayerdan keldi (zavod)
    source: {
      type: String,
      default: "factory",
    },

    // tarix
    tarix: [
      {
        miqdor: Number,

        // ✅ YANGI: shu amal vaqtida narx qancha bo‘lgan
        narx: {
          type: Number,
          default: 0,
          min: 0,
        },

        amal: {
          type: String,
          enum: ["seed", "plus", "minus"],
          default: "seed",
        },
        izoh: String,
        sana: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

// 🔒 Bitta filial + bitta mahsulot = bitta hujjat
GlobalBranchStockSchema.index(
  { branch_code: 1, mahsulot: 1 },
  { unique: true },
);

module.exports = mongoose.model("GlobalBranchStock", GlobalBranchStockSchema);
