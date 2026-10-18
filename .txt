import mongoose from "mongoose";
import Product from "../models/Product.js";

const getProducts = async (req, res) => {
  const products = await Product.find({ archived: { $ne: true } });
  res.json(products);
};

const getProductPriceRanges = async (req, res) => {
  const priceRanges = await Product.aggregate([
    { $match: { archived: { $ne: true } } },
    {
      $bucket: {
        groupBy: "$price",
        boundaries: [0, 100, 500, 1000],
        default: "1000+",
        output: {
          averagePrice: { $avg: "$price" },
          minimumPrice: { $min: "$price" },
          maximumPrice: { $max: "$price" },
          productCount: { $sum: 1 },
        },
      },
    },
    {
      $project: {
        _id: 0,
        priceRange: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", 0] }, then: "0-99.99" },
              { case: { $eq: ["$_id", 100] }, then: "100-499.99" },
              { case: { $eq: ["$_id", 500] }, then: "500-999.99" },
            ],
            default: "$_id",
          },
        },
        averagePrice: 1,
        minimumPrice: 1,
        maximumPrice: 1,
        productCount: 1,
      },
    },
  ]);

  res.json(priceRanges);
};

const postProducts = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

const putProducts = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.set(req.body);
  const updatedProduct = await product.save();

  res.json(updatedProduct);
};

const deleteProducts = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.archived = true;
  await product.save();

  res.status(204).send();
};

export {
  getProducts,
  getProductPriceRanges,
  postProducts,
  putProducts,
  deleteProducts,
};
