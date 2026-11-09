import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import prisma from "../config/prisma.js";
import authRoutes from "../routes/authRoutes.js";
import { verifyToken } from "../middleware/auth.js";

process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

let server;
let origin;
let registeredUser;
const originalMethods = {
  create: prisma.users.create,
  findUnique: prisma.users.findUnique,
};

before(async () => {
  prisma.users.create = async ({ data }) => {
    registeredUser = { id: 1n, role: "customer", ...data };
    return registeredUser;
  };
  prisma.users.findUnique = async ({ where }) =>
    registeredUser?.email === where.email ? registeredUser : null;

  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.users.create = originalMethods.create;
  prisma.users.findUnique = originalMethods.findUnique;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("registers customers with a hashed password and issues a JWT", async () => {
  const response = await fetch(`${origin}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ADA@example.com",
      password: "a-secure-password",
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.user.email, "ada@example.com");
  assert.equal(body.user.role, "customer");
  assert.equal("password" in body.user, false);
  assert.match(registeredUser.password, /^scrypt\$/);
  assert.deepEqual(verifyToken(body.token), { id: "1", role: "customer" });
});

test("logs in with valid credentials and rejects invalid credentials", async () => {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ada@example.com", password: "a-secure-password" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, "customer");

  const invalidResponse = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ada@example.com", password: "wrong-password" }),
  });
  assert.equal(invalidResponse.status, 401);
});

test("does not allow public registration to assign privileged roles", async () => {
  const response = await fetch(`${origin}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      password: "a-secure-password",
      role: "admin",
    }),
  });
  assert.equal(response.status, 400);
});
