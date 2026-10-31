import express from "express"
const router = express.Router();
import {
  createProduct,
  deleteProduct,
  getOneProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";

router.get("/", getProducts);
router.get("/:id", getOneProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
