import express from "express";
import {
  createUser,
  deleteUser,
  getProfile,
  getOneUser,
  getUsers,
  updateUser,
} from "../controllers/userController.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);
router.get("/profile", getProfile);
router.get("/", authorizeRoles("admin"), getUsers);
router.get("/:id", authorizeRoles("admin"), getOneUser);
router.post("/", authorizeRoles("admin"), createUser);
router.put("/:id", authorizeRoles("admin"), updateUser);
router.patch("/:id", authorizeRoles("admin"), updateUser);
router.delete("/:id", authorizeRoles("admin"), deleteUser);

export default router;
