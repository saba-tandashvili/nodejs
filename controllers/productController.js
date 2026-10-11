import mongoose from "mongoose";
import Product from "../models/Product.js";

const getProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

const postProducts = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

const putProducts = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
};

const deleteProducts = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.status(204).send();
};

export { getProducts, postProducts, putProducts, deleteProducts };
