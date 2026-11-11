import express from "express";
import {
  createProduct,
  buyProduct,
  deleteProduct,
  getOneProduct,
  getProducts,
  updateProduct,
  uploadProductsExcel as uploadProductsExcelController,
} from "../controllers/productController.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.js";
import { uploadProductsExcel } from "../middleware/uploads.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getProducts);
router.get("/:id", getOneProduct);
router.post(
  "/upload-excel",
  authorizeRoles("admin", "manager"),
  uploadProductsExcel,
  uploadProductsExcelController,
);
router.post("/", authorizeRoles("admin", "manager"), createProduct);
router.post("/buyProduct/:id", authorizeRoles("admin", "manager", "customer"), buyProduct);
router.put("/:id", authorizeRoles("admin", "manager"), updateProduct);
router.patch("/:id", authorizeRoles("admin", "manager"), updateProduct);
router.delete("/:id", authorizeRoles("admin", "manager"), deleteProduct);

export default router;
