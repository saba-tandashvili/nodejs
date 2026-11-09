import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import prisma from "../config/prisma.js";
import { signToken } from "../middleware/auth.js";
import productRoutes from "../routes/productRoutes.js";

process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
const product = {
  id: 1n,
  name: "Laptop",
  price: 999.99,
  stock: 5,
  description: "A high-performance laptop.",
  slug: null,
  categoryId: null,
};
const user = { id: 1n };
const adminToken = signToken({ id: user.id, role: "admin" });
const customerToken = signToken({ id: user.id, role: "customer" });
const app = express();
app.use(express.json());
app.use("/api/products", productRoutes);

let server;
let origin;
let lastOperation;
let purchaseCount = 0;
function apiFetch(path, options = {}, token = adminToken) {
  return fetch(`${origin}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      authorization: `Bearer ${token}`,
    },
  });
}
const originalMethods = {
  findMany: prisma.products.findMany,
  findUnique: prisma.products.findUnique,
  create: prisma.products.create,
  update: prisma.products.update,
  delete: prisma.products.delete,
  transaction: prisma.$transaction,
};

before(async () => {
  prisma.products.findMany = async () => [product];
  prisma.products.findUnique = async ({ where }) => (where.id === product.id ? product : null);
  prisma.products.create = async ({ data }) => {
    lastOperation = ["create", data];
    return { ...product, ...data };
  };
  prisma.products.update = async ({ where, data }) => {
    lastOperation = ["update", where, data];
    if (where.id !== product.id) {
      const error = new Error("Record not found");
      error.code = "P2025";
      throw error;
    }
    return { ...product, ...data };
  };
  prisma.products.delete = async ({ where }) => {
    if (where.id !== product.id) {
      const error = new Error("Record not found");
      error.code = "P2025";
      throw error;
    }
    return product;
  };
  prisma.$transaction = async (operation) =>
    operation({
      products: {
        findUnique: async ({ where }) => (where.id === product.id ? { id: product.id } : null),
      },
      users: {
        findUnique: async ({ where }) => (where.id === user.id ? user : null),
      },
      usersProducts: {
        create: async ({ data }) => ({
          id: BigInt(++purchaseCount),
          ...data,
        }),
      },
    });

  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.products.findMany = originalMethods.findMany;
  prisma.products.findUnique = originalMethods.findUnique;
  prisma.products.create = originalMethods.create;
  prisma.products.update = originalMethods.update;
  prisma.products.delete = originalMethods.delete;
  prisma.$transaction = originalMethods.transaction;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("lists products", async () => {
  const response = await apiFetch("/api/products");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    { ...product, id: "1", categoryId: null },
  ]);
});

test("creates a product with normalized fields", async () => {
  const response = await apiFetch("/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: " Laptop ", price: 12, description: " Useful " }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(lastOperation, [
    "create",
    { name: "Laptop", price: 12, description: "Useful" },
  ]);
});

test("rejects invalid product input", async () => {
  const response = await apiFetch("/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "", price: -1, description: "Laptop" }),
  });

  assert.equal(response.status, 400);
});

test("rejects invalid IDs and returns not found for missing products", async () => {
  const invalidResponse = await apiFetch("/api/products/not-an-id");
  assert.equal(invalidResponse.status, 400);

  const missingResponse = await apiFetch("/api/products/2");
  assert.equal(missingResponse.status, 404);
});

test("supports updates and deletes", async () => {
  const updateResponse = await apiFetch("/api/products/1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Updated laptop" }),
  });
  assert.equal(updateResponse.status, 200);

  const deleteResponse = await apiFetch("/api/products/1", { method: "DELETE" });
  assert.equal(deleteResponse.status, 204);
});

test("records each valid purchase and validates the buyer", async () => {
  const purchaseRequest = () =>
    apiFetch("/api/products/buyProduct/1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }, customerToken);
  const firstPurchase = await purchaseRequest();
  const secondPurchase = await purchaseRequest();

  assert.equal(firstPurchase.status, 201);
  assert.equal(secondPurchase.status, 201);
  assert.notEqual((await firstPurchase.json()).id, (await secondPurchase.json()).id);

  const invalidBuyer = await apiFetch("/api/products/buyProduct/1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "invalid" }),
  }, customerToken);
  assert.equal(invalidBuyer.status, 400);
});

test("limits customers to viewing and buying products", async () => {
  const listResponse = await apiFetch("/api/products", {}, customerToken);
  assert.equal(listResponse.status, 200);

  const createResponse = await apiFetch(
    "/api/products",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Phone", price: 10, description: "A phone" }),
    },
    customerToken,
  );
  assert.equal(createResponse.status, 403);

  const unauthenticated = await fetch(`${origin}/api/products`);
  assert.equal(unauthenticated.status, 401);
});

test("allows managers to manage products but not users", async () => {
  const managerToken = signToken({ id: user.id, role: "manager" });
  const response = await apiFetch(
    "/api/products",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Phone", price: 10, description: "A phone" }),
    },
    managerToken,
  );
  assert.equal(response.status, 201);
});
