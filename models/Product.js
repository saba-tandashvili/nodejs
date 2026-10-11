import mongoose from "mongoose";

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
    description: {
      type: String,
      required: [true, "A product must have a description"],
      trim: true,
    },
  },
  { versionKey: false },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
