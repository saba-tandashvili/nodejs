import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import prisma from "../config/prisma.js";
import mailer from "../config/mailer.js";
import authRoutes from "../routes/authRoutes.js";
import { verifyPassword } from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";

process.env.JWT_SECRET = "91f7b7b62c1ad05b25f77665b254282aea39d24d2d27a4e9d2a42221032eb315";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

let server;
let origin;
let registeredUser;
let sentOtp;
const originalMethods = {
  create: prisma.users.create,
  findUnique: prisma.users.findUnique,
  update: prisma.users.update,
  updateMany: prisma.users.updateMany,
};
const originalSendPasswordResetOtp = mailer.sendPasswordResetOtp;

before(async () => {
  prisma.users.create = async ({ data }) => {
    registeredUser = {
      id: 1n,
      role: "customer",
      passwordResetOtpHash: null,
      passwordResetOtpSalt: null,
      passwordResetOtpExpiresAt: null,
      passwordResetOtpAttempts: 0,
      ...data,
    };
    return registeredUser;
  };
  prisma.users.findUnique = async ({ where }) =>
    registeredUser?.email === where.email ? registeredUser : null;
  prisma.users.update = async ({ where, data }) => {
    assert.equal(where.id, registeredUser.id);
    Object.assign(registeredUser, data);
    return registeredUser;
  };
  prisma.users.updateMany = async ({ where, data }) => {
    const matches = Object.entries(where).every(([key, expected]) => {
      const actual = registeredUser?.[key];
      if (expected instanceof Date) {
        return actual?.getTime() === expected.getTime();
      }
      if (expected && typeof expected === "object") {
        if (expected.gt) return actual > expected.gt;
        if (expected.lt) return actual < expected.lt;
      }
      return actual === expected;
    });
    if (!matches) return { count: 0 };

    for (const [key, value] of Object.entries(data)) {
      registeredUser[key] =
        value && typeof value === "object" && "increment" in value
          ? registeredUser[key] + value.increment
          : value;
    }
    return { count: 1 };
  };
  mailer.sendPasswordResetOtp = async (email, otp) => {
    assert.equal(email, "ada@example.com");
    sentOtp = otp;
  };

  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.users.create = originalMethods.create;
  prisma.users.findUnique = originalMethods.findUnique;
  prisma.users.update = originalMethods.update;
  prisma.users.updateMany = originalMethods.updateMany;
  mailer.sendPasswordResetOtp = originalSendPasswordResetOtp;
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

test("sends a reset code, invalidates it after five failures, and accepts a fresh code once", async () => {
  const requestCode = async (email = "ada@example.com") =>
    fetch(`${origin}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
  const submitReset = async (otp, newPassword = "another-secure-password") =>
    fetch(`${origin}/api/auth/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", otp, newPassword }),
    });

  const unknownAccount = await requestCode("missing@example.com");
  assert.equal(unknownAccount.status, 202);
  assert.equal(sentOtp, undefined);

  const firstRequest = await requestCode("ADA@example.com");
  assert.equal(firstRequest.status, 202);
  assert.match(sentOtp, /^\d{6}$/);
  assert.notEqual(registeredUser.passwordResetOtpHash, sentOtp);
  assert.ok(registeredUser.passwordResetOtpExpiresAt > new Date());
  assert.equal(registeredUser.passwordResetOtpAttempts, 0);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const invalidReset = await submitReset("000000");
    assert.equal(invalidReset.status, 400);
  }
  assert.equal(registeredUser.passwordResetOtpHash, null);
  assert.equal(registeredUser.passwordResetOtpAttempts, 5);
  assert.equal((await submitReset(sentOtp)).status, 400);

  const secondRequest = await requestCode();
  assert.equal(secondRequest.status, 202);
  const validOtp = sentOtp;
  const reset = await submitReset(validOtp);
  assert.equal(reset.status, 200);
  assert.equal(await verifyPassword("another-secure-password", registeredUser.password), true);
  assert.equal(registeredUser.passwordResetOtpHash, null);
  assert.equal((await submitReset(validOtp)).status, 400);
});
