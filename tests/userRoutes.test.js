import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import express from "express";
import prisma from "../config/prisma.js";
import { signToken } from "../middleware/auth.js";
import userRoutes from "../routes/userRoutes.js";

process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
const user = {
  id: 1n,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "scrypt$not-returned",
  role: "admin",
};
const adminToken = signToken({ id: user.id, role: user.role });
const customerToken = signToken({ id: user.id, role: "customer" });
const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

let server;
let origin;
let lastOperation;
let uploadedProfilePicture;
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
  if (uploadedProfilePicture) {
    await unlink(path.resolve("uploads", uploadedProfilePicture.slice("/uploads/".length)));
  }
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
  const listResponse = await apiFetch("/api/users");
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), [
    { id: "1", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", role: "admin" },
  ]);

  const createResponse = await apiFetch("/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: " Ada ",
      lastName: " Lovelace ",
      email: " ada@example.com ",
      password: "a-secure-password",
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal(lastOperation[0], "create");
  assert.deepEqual(
    Object.fromEntries(Object.entries(lastOperation[1]).filter(([key]) => key !== "password")),
    { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
  );
  assert.match(lastOperation[1].password, /^scrypt\$/);

  const updateResponse = await apiFetch("/api/users/1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Augusta" }),
  });
  assert.equal(updateResponse.status, 200);

  const deleteResponse = await apiFetch("/api/users/1", { method: "DELETE" });
  assert.equal(deleteResponse.status, 204);
});

test("validates user input and IDs", async () => {
  const invalidUser = await apiFetch("/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", email: "invalid" }),
  });
  assert.equal(invalidUser.status, 400);

  const invalidId = await apiFetch("/api/users/nope");
  assert.equal(invalidId.status, 400);

  const missingUser = await apiFetch("/api/users/2");
  assert.equal(missingUser.status, 404);
});

test("protects the profile endpoint and never returns the password", async () => {
  const unauthenticated = await fetch(`${origin}/api/users/profile`);
  assert.equal(unauthenticated.status, 401);

  const response = await apiFetch("/api/users/profile");
  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile.id, "1");
  assert.equal(profile.role, "admin");
  assert.equal("password" in profile, false);
});

test("uploads the authenticated user's profile picture", async () => {
  const unauthenticated = await fetch(`${origin}/api/users/upload-picture`, { method: "POST" });
  assert.equal(unauthenticated.status, 401);

  const invalidForm = new FormData();
  invalidForm.append("picture", new Blob(["not an image"], { type: "image/jpeg" }), "bad.jpg");
  const invalidImage = await apiFetch("/api/users/upload-picture", {
    method: "POST",
    body: invalidForm,
  });
  assert.equal(invalidImage.status, 400);

  const form = new FormData();
  form.append(
    "picture",
    new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }),
    "profile.jpg",
  );
  const response = await apiFetch(
    "/api/users/upload-picture",
    { method: "POST", body: form },
    customerToken,
  );

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile.id, "1");
  assert.match(profile.profilePicture, /^\/uploads\/profile-pictures\/[\w-]+\.jpg$/);
  assert.equal(lastOperation[0], "update");
  assert.equal(lastOperation[1].id, user.id);
  assert.equal(lastOperation[2].profilePicture, profile.profilePicture);
  uploadedProfilePicture = profile.profilePicture;
});

test("restricts user administration to admins", async () => {
  const managerToken = signToken({ id: user.id, role: "manager" });
  const response = await apiFetch("/api/users", {}, managerToken);
  assert.equal(response.status, 403);
});
