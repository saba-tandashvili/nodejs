import express from "express";
import {getProducts, createProducts, editProduct, deleteProduct, buyProduct} from "../controllers/productController.js";
const productsRouter = express.Router();




productsRouter.route("/").get(getProducts).post(createProducts);
productsRouter.route("/:id").put(editProduct).delete(deleteProduct);
productsRouter.route("/buy/:id").post(buyProduct);

export default productsRouter;