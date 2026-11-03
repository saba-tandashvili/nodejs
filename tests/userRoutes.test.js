import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import prisma from "../config/prisma.js";
import userRoutes from "../routes/userRoutes.js";

const user = {
  id: 1n,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
};
const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

let server;
let origin;
let lastOperation;
const originalMethods = {
  findMany: prisma.users.findMany,
  findUnique: prisma.users.findUnique,
  create: prisma.users.create,
  update: prisma.users.update,
  delete: prisma.users.delete,
};

before(async () => {
  prisma.users.findMany = async () => [user];
  prisma.users.findUnique = async ({ where }) => (where.id === user.id ? user : null);
  prisma.users.create = async ({ data }) => {
    lastOperation = ["create", data];
    return { ...user, ...data };
  };
  prisma.users.update = async ({ where, data }) => {
    lastOperation = ["update", where, data];
    return { ...user, ...data };
  };
  prisma.users.delete = async ({ where }) => {
    lastOperation = ["delete", where];
    return user;
  };

  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.users.findMany = originalMethods.findMany;
  prisma.users.findUnique = originalMethods.findUnique;
  prisma.users.create = originalMethods.create;
  prisma.users.update = originalMethods.update;
  prisma.users.delete = originalMethods.delete;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("supports user CRUD operations", async () => {
  const listResponse = await fetch(`${origin}/api/users`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), [{ ...user, id: "1" }]);

  const createResponse = await fetch(`${origin}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: " Ada ",
      lastName: " Lovelace ",
      email: " ada@example.com ",
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.deepEqual(lastOperation, [
    "create",
    { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
  ]);

  const updateResponse = await fetch(`${origin}/api/users/1`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Augusta" }),
  });
  assert.equal(updateResponse.status, 200);

  const deleteResponse = await fetch(`${origin}/api/users/1`, { method: "DELETE" });
  assert.equal(deleteResponse.status, 204);
});

test("validates user input and IDs", async () => {
  const invalidUser = await fetch(`${origin}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", email: "invalid" }),
  });
  assert.equal(invalidUser.status, 400);

  const invalidId = await fetch(`${origin}/api/users/nope`);
  assert.equal(invalidId.status, 400);

  const missingUser = await fetch(`${origin}/api/users/2`);
  assert.equal(missingUser.status, 404);
});
