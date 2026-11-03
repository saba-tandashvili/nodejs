import express from "express";
import {
  createProduct,
  buyProduct,
  deleteProduct,
  getOneProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getOneProduct);
router.post("/", createProduct);
router.post("/buyProduct/:id", buyProduct);
router.put("/:id", updateProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
