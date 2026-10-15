import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { versionKey: false, timestamps: true },
);

const StockHistory = mongoose.model("StockHistory", stockHistorySchema);

export default StockHistory;
