import prisma from "../config/prisma.js";
import { hashPassword } from "./authController.js";

const userFields = ["firstName", "lastName", "email", "password", "role"];
const userRoles = ["admin", "manager", "customer"];
const maxBigint = 9223372036854775807n;

function isValidId(id) {
  return /^\d+$/.test(id) && BigInt(id) > 0n && BigInt(id) <= maxBigint;
}

function validateUser(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object";
  }
  const keys = Object.keys(body);
  if (keys.some((key) => !userFields.includes(key))) {
    return "Only firstName, lastName, email, password, and role are allowed";
  }
  const requiredFields = partial
    ? ["firstName", "lastName", "email"]
    : ["firstName", "lastName", "email", "password"];
  if (keys.length === 0 || (!partial && requiredFields.some((field) => !keys.includes(field)))) {
    return partial
      ? "At least one user field is required"
      : "First name, last name, email, and password are required";
  }
  for (const field of ["firstName", "lastName", "email"]) {
    if (field in body && (typeof body[field] !== "string" || !body[field].trim())) {
      return `${field} must be a non-empty string`;
    }
  }
  if (
    "password" in body &&
    (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128)
  ) {
    return "Password must be between 8 and 128 characters";
  }
  if ("role" in body && !userRoles.includes(body.role)) {
    return "Role must be admin, manager, or customer";
  }
  if ("email" in body && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return "Email must be valid";
  }
  return null;
}

function serializeUser(user) {
  const { password, ...publicUser } = user;
  return { ...publicUser, id: user.id.toString() };
}

async function normalizeUser(body) {
  const normalized = Object.fromEntries(
    Object.entries(body)
      .filter(([key]) => key !== "password")
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
  );
  if (body.password) {
    normalized.password = await hashPassword(body.password);
  }
  return normalized;
}

function respondWithDatabaseError(res, error) {
  if (error.code === "P2025") {
    return res.status(404).json({ error: "User not found" });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ error: "A user with this email already exists" });
  }
  console.error("User database operation failed:", error);
  return res.status(500).json({ error: "Internal server error" });
}

async function getUsers(req, res) {
  try {
    const users = await prisma.users.findMany({ orderBy: { id: "asc" } });
    return res.json(users.map(serializeUser));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function getOneUser(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  try {
    const user = await prisma.users.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(serializeUser(user));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function createUser(req, res) {
  const validationError = validateUser(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const user = await prisma.users.create({ data: await normalizeUser(req.body) });
    return res.status(201).json(serializeUser(user));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function updateUser(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const validationError = validateUser(req.body, { partial: true });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const user = await prisma.users.update({
      where: { id: BigInt(req.params.id) },
      data: await normalizeUser(req.body),
    });
    return res.json(serializeUser(user));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function deleteUser(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  try {
    await prisma.users.delete({ where: { id: BigInt(req.params.id) } });
    return res.status(204).send();
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

async function getProfile(req, res) {
  try {
    const user = await prisma.users.findUnique({ where: { id: BigInt(req.user.id) } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(serializeUser(user));
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
}

export { getUsers, getOneUser, createUser, updateUser, deleteUser, getProfile };
