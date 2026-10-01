import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import productsRouter from "./routes/productsRoute.js";
import usersRouter from "./routes/usersRoute.js";

dotenv.config({ path: "./config.env" });

const app = express();

app.use(express.json());

// 6. Maintenance Middleware
app.use((req, res, next) => {
  if (process.env.IS_MAINTENANCE === "true") {
    return res.status(530).json({ message: "Site is under maintenance" });
  }
  next();
});

// 7. Rate Limiter Middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: "Too many requests, please try again later." },
});
app.use(limiter);

// 3. Request Logger Middleware
app.use((req, res, next) => {
  const time = new Date().toISOString();
  console.log(`[${time}] ${req.method} ${req.originalUrl}`);
  next();
});

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/products", productsRouter);
app.use("/users", usersRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});