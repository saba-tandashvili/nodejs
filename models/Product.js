import mongoose from "mongoose";
import StockHistory from "./StockHistory.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A product must have a name"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "A product must have a price"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    archived: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: [true, "A product must have a description"],
      trim: true,
    },
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

productSchema.virtual("priceWithTax").get(function () {
  return this.price * 1.2;
});

productSchema.virtual("capacity").get(function () {
  return this.price * this.quantity;
});

productSchema.pre("save", async function () {
  if (this.isModified("quantity")) {
    await StockHistory.create({
      productId: this._id,
      quantity: this.quantity,
    });
  }
});

const Product = mongoose.model("Product", productSchema);

export default Product;
