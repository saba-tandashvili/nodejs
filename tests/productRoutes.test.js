import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import pool from "../config/db.config.js";
import productRoutes from "../routes/productRoutes.js";

const product = {
  id: "1",
  name: "Laptop",
  price: 999.99,
  description: "A high-performance laptop.",
};
const app = express();
app.use(express.json());
app.use("/api/products", productRoutes);

let server;
let origin;
let lastQuery;
const originalQuery = pool.query;

before(async () => {
  pool.query = async (query, values = []) => {
    lastQuery = [query, values];

    if (query.startsWith("SELECT") && query.includes("ORDER BY id")) {
      return { rows: [product] };
    }
    if (query.startsWith("SELECT")) {
      return { rows: values[0] === product.id ? [product] : [] };
    }
    if (query.startsWith("INSERT")) {
      return { rows: [{ ...product, name: values[0], price: values[1], description: values[2] }] };
    }
    if (query.startsWith("UPDATE")) {
      return { rows: values.at(-1) === product.id ? [product] : [] };
    }
    if (query.startsWith("DELETE")) {
      return { rows: values[0] === product.id ? [{ id: product.id }] : [] };
    }
    throw new Error(`Unexpected SQL query: ${query}`);
  };

  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  pool.query = originalQuery;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("lists products", async () => {
  const response = await fetch(`${origin}/api/products`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [product]);
});

test("creates a product with normalized fields", async () => {
  const response = await fetch(`${origin}/api/products`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: " Laptop ", price: 12, description: " Useful " }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(lastQuery[1], ["Laptop", 12, "Useful"]);
});

test("rejects invalid product input", async () => {
  const response = await fetch(`${origin}/api/products`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "", price: -1, description: "Laptop" }),
  });

  assert.equal(response.status, 400);
});

test("rejects invalid IDs and returns not found for missing products", async () => {
  const invalidResponse = await fetch(`${origin}/api/products/not-an-id`);
  assert.equal(invalidResponse.status, 400);

  const missingResponse = await fetch(`${origin}/api/products/2`);
  assert.equal(missingResponse.status, 404);
});

test("supports updates and deletes", async () => {
  const updateResponse = await fetch(`${origin}/api/products/1`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Updated laptop" }),
  });
  assert.equal(updateResponse.status, 200);

  const deleteResponse = await fetch(`${origin}/api/products/1`, { method: "DELETE" });
  assert.equal(deleteResponse.status, 204);
});
