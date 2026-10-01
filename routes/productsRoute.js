import express from "express";
import {
  getProducts,
  postProducts,
  putProducts,
  deleteProducts,
} from "../controllers/productController.js";
import { generateSlug } from "../middlewares/slugifyMiddleware.js";

const productsRouter = express.Router();

productsRouter.route("/").get(getProducts).post(generateSlug, postProducts);
productsRouter.route("/:id").put(putProducts).delete(deleteProducts);

export default productsRouter;