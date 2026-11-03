import prisma from "../config/prisma.js";

const productFields = ["name", "price", "description", "stock", "slug", "categoryId"];
const maxBigint = 9223372036854775807n;
const maxPrice = 9999999999.99;

function isValidId(id) {
  if (
    typeof id !== "string" &&
    !(typeof id === "number" && Number.isSafeInteger(id))
  ) {
    return false;
  }
  return /^\d+$/.test(String(id)) && BigInt(id) > 0n && BigInt(id) <= maxBigint;
}

function validateProduct(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object";
  }

  const keys = Object.keys(body);
  if (keys.some((key) => !productFields.includes(key))) {
    return "Only name, price, description, stock, slug, and categoryId are allowed";
  }
  if (
    keys.length === 0 ||
    (!partial && ["name", "price", "description"].some((field) => !keys.includes(field)))
  ) {
    return partial
      ? "At least one product field is required"
      : "Name, price, and description are required";
  }
  if ("name" in body && (typeof body.name !== "string" || !body.name.trim())) {
    return "Name must be a non-empty string";
  }
  if ("description" in body && (typeof body.description !== "string" || !body.description.trim())) {
    return "Description must be a non-empty string";
  }
  if (
    "price" in body &&
    (typeof body.price !== "number" ||
      !Number.isFinite(body.price) ||
      body.price < 0 ||
      body.price > maxPrice)
  ) {
    return `Price must be a number between 0 and ${maxPrice}`;
  }
  if ("stock" in body && (!Number.isInteger(body.stock) || body.stock < 0)) {
    return "Stock must be a non-negative integer";
  }
  if (
    "slug" in body &&
    body.slug !== null &&
    (typeof body.slug !== "string" || !body.slug.trim())
  ) {
    return "Slug must be a non-empty string or null";
  }
  if (
    "categoryId" in body &&
    body.categoryId !== null &&
    !isValidId(body.categoryId)
  ) {
    return "Category id must be a positive integer or null";
  }
  return null;
}

function normalizeProduct(body) {
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => {
      if (typeof value === "string" && key !== "categoryId") {
        return [key, value.trim()];
      }
      if (key === "categoryId" && value !== null) {
        return [key, BigInt(value)];
      }
      return [key, value];
    }),
  );
}

function serializeProduct(product) {
  return {
    ...product,
    id: product.id.toString(),
    price: Number(product.price),
    categoryId: product.categoryId?.toString() ?? null,
  };
}

function respondWithDatabaseError(res, error) {
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Product not found" });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ error: "A product with this slug already exists" });
  }
  if (error.code === "P2003") {
    return res.status(400).json({ error: "The referenced category does not exist" });
  }
  console.error("Product database operation failed:", error);
  return res.status(500).json({ error: "Internal server error" });
}

async function getProducts(req, res) {
  try {
    const products = await prisma.products.findMany({ orderBy: { id: "asc" } });
    return res.json(products.map(serializeProduct));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function getOneProduct(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  try {
    const product = await prisma.products.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(serializeProduct(product));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function createProduct(req, res) {
  const validationError = validateProduct(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const product = await prisma.products.create({ data: normalizeProduct(req.body) });
    return res.status(201).json(serializeProduct(product));
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
  try {
    const product = await prisma.products.update({
      where: { id: BigInt(req.params.id) },
      data: normalizeProduct(req.body),
    });
    return res.json(serializeProduct(product));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function deleteProduct(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  try {
    await prisma.products.delete({ where: { id: BigInt(req.params.id) } });
    return res.status(204).send();
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function buyProduct(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Request body must be an object" });
  }
  if (Object.keys(req.body).length !== 1 || !("userId" in req.body)) {
    return res.status(400).json({ error: "Only userId is allowed" });
  }
  if (!isValidId(req.body.userId)) {
    return res.status(400).json({ error: "User id must be a positive integer" });
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const product = await transaction.products.findUnique({
        where: { id: BigInt(req.params.id) },
        select: { id: true },
      });
      if (!product) {
        return { missing: "Product" };
      }
      const user = await transaction.users.findUnique({
        where: { id: BigInt(req.body.userId) },
        select: { id: true },
      });
      if (!user) {
        return { missing: "User" };
      }
      const purchase = await transaction.usersProducts.create({
        data: { productId: product.id, userId: user.id },
      });
      return { purchase };
    });

    if (result.missing) {
      return res.status(404).json({ error: `${result.missing} not found` });
    }
    return res.status(201).json({
      id: result.purchase.id.toString(),
      userId: result.purchase.userId.toString(),
      productId: result.purchase.productId.toString(),
    });
  } catch (error) {
    console.error("Product purchase failed:", error);
    return res.status(500).json({ error: "Internal server error" });
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
  buyProduct,
};
