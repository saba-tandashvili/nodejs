import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import productsRouter from "./routes/productsRoute.js";

const app = express();
console.log(process.env.NODE_ENV);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use((req, res, next) => {
  console.log("hello from middleware!");
  next();
});
app.use(express.json());

const getUsers = (req, res) => {
  res.send("get users");
};
const createUser = (req, res) => {
  res.send("create users");
};
const editUser = (req, res) => {
  res.send("edit users");
};
const deleteUser = (req, res) => {
  res.send("delete users");
};

const usersRouter = express.Router();
app.use("/products", productsRouter);

app.use("/users", usersRouter);
usersRouter.route("/").get(getUsers).post(createUser);
usersRouter.route("/:id").put(editUser).delete(deleteUser);

app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: err.message });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: "Invalid request value" });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
