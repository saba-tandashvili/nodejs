import dotenv from "dotenv";
dotenv.config();
import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./docs/openapi.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Express PostgreSQL API" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/products", productRoutes);

app.use((err, req, res, next) => {
  if (err.status === 400) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
