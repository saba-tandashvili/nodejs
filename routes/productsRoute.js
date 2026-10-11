import express from "express";
import { getProducts, postProducts, putProducts, deleteProducts } from "../controllers/productController.js";

const productsRouter = express.Router();
productsRouter.route("/").get(getProducts).post(postProducts);
productsRouter.route("/:id").put(putProducts).delete(deleteProducts);

export default productsRouter;