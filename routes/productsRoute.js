import express from "express";
import {
  getProducts,
  getProductPriceRanges,
  postProducts,
  putProducts,
  deleteProducts,
} from "../controllers/productController.js";

const productsRouter = express.Router();
productsRouter.route("/").get(getProducts).post(postProducts);
productsRouter.get("/price-ranges", getProductPriceRanges);
productsRouter.route("/:id").put(putProducts).delete(deleteProducts);

export default productsRouter;