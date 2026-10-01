import express from "express";
import {
  getUsers,
  createUser,
  editUser,
  deleteUser,
} from "../controllers/userController.js";

const usersRouter = express.Router();

usersRouter.route("/").get(getUsers).post(createUser);
usersRouter.route("/:id").put(editUser).delete(deleteUser);

export default usersRouter;
