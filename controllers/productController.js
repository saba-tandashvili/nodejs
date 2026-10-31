import pool from "../config/db.config.js";

const productFields = ["name", "price", "description"];
const maxBigint = 9223372036854775807n;
const maxPrice = 9999999999.99;

function isValidId(id) {
  return /^\d+$/.test(id) && BigInt(id) > 0n && BigInt(id) <= maxBigint;
}

function validateProduct(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object";
  }

  const keys = Object.keys(body);
  if (keys.some((key) => !productFields.includes(key))) {
    return "Only name, price, and description are allowed";
  }
  if (keys.length === 0 || (!partial && productFields.some((field) => !keys.includes(field)))) {
    return partial ? "At least one product field is required" : "Name, price, and description are required";
  }
  if ("name" in body && (typeof body.name !== "string" || !body.name.trim())) {
    return "Name must be a non-empty string";
  }
  if ("description" in body && (typeof body.description !== "string" || !body.description.trim())) {
    return "Description must be a non-empty string";
  }
  if ("price" in body && (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0 ||
    body.price > maxPrice
  )) {
    return `Price must be a number between 0 and ${maxPrice}`;
  }
  return null;
}

function normalizeProduct(body) {
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
  );
}

function respondWithDatabaseError(res, error) {
  console.error("Product database operation failed:", error);
  return res.status(500).json({ error: "Internal server error" });
}

async function getProducts(req, res) {
  try {
    const result = await pool.query(
      "SELECT id::text AS id, name, price::float8 AS price, description FROM products ORDER BY id",
    );
    return res.json(result.rows);
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function getOneProduct(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  try {
    const result = await pool.query(
      "SELECT id::text AS id, name, price::float8 AS price, description FROM products WHERE id = $1",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function createProduct(req, res) {
  const validationError = validateProduct(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const { name, price, description } = normalizeProduct(req.body);
  try {
    const result = await pool.query(
      `INSERT INTO products (name, price, description)
       VALUES ($1, $2, $3)
       RETURNING id::text AS id, name, price::float8 AS price, description`,
      [name, price, description],
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function updateProduct(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  const validationError = validateProduct(req.body, { partial: true });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const product = normalizeProduct(req.body);
  const values = Object.values(product);
  const assignments = Object.keys(product).map((field, index) => `${field} = $${index + 1}`);
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE products SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING id::text AS id, name, price::float8 AS price, description`,
      values,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function deleteProduct(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

export {
  getProducts,
  getOneProduct,
  createProduct,
  createProduct as postProducts,
  updateProduct,
  updateProduct as putProducts,
  deleteProduct,
  deleteProduct as deleteProducts,
};
