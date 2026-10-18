import mongoose from "mongoose"

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  stock: { type: Number, required: true },
  slug: { type: String },
  createdAt: { type: Date, default: Date.now },
})



const Product = mongoose.model("Product", productSchema)

export default Product