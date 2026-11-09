import express from "express";
import {
  createProduct,
  buyProduct,
  deleteProduct,
  getOneProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getProducts);
router.get("/:id", getOneProduct);
router.post("/", authorizeRoles("admin", "manager"), createProduct);
router.post("/buyProduct/:id", authorizeRoles("admin", "manager", "customer"), buyProduct);
router.put("/:id", authorizeRoles("admin", "manager"), updateProduct);
router.patch("/:id", authorizeRoles("admin", "manager"), updateProduct);
router.delete("/:id", authorizeRoles("admin", "manager"), deleteProduct);

export default router;
