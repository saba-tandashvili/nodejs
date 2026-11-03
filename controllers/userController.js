import prisma from "../config/prisma.js";

const userFields = ["firstName", "lastName", "email"];
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
    return "Only firstName, lastName, and email are allowed";
  }
  if (keys.length === 0 || (!partial && userFields.some((field) => !keys.includes(field)))) {
    return partial
      ? "At least one user field is required"
      : "First name, last name, and email are required";
  }
  for (const field of userFields) {
    if (field in body && (typeof body[field] !== "string" || !body[field].trim())) {
      return `${field} must be a non-empty string`;
    }
  }
  if ("email" in body && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return "Email must be valid";
  }
  return null;
}

function normalizeUser(body) {
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, value.trim()]),
  );
}

function serializeUser(user) {
  return { ...user, id: user.id.toString() };
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
    const user = await prisma.users.create({ data: normalizeUser(req.body) });
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
      data: normalizeUser(req.body),
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

export { getUsers, getOneUser, createUser, updateUser, deleteUser };
