import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import prisma from "../config/prisma.js";
import { assertJwtSecret, signToken } from "../middleware/auth.js";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, keyLength);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }
  const [algorithm, salt, hash] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(salt || "") ||
    !/^[a-f0-9]{128}$/.test(hash || "")
  ) {
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, keyLength);
  return timingSafeEqual(actual, expected);
}

function serializeUser(user) {
  return {
    id: user.id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

function validateCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object";
  }
  if (
    typeof body.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return "Email must be valid";
  }
  if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
    return "Password must be between 8 and 128 characters";
  }
  return null;
}

async function register(req, res) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Request body must be an object" });
  }
  const { firstName, lastName, email, password } = req.body;
  const validationError = validateCredentials({ email, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    Object.keys(req.body).some((key) => !["firstName", "lastName", "email", "password"].includes(key))
  ) {
    return res.status(400).json({
      error: "First name, last name, email, and password are required; role cannot be set here",
    });
  }

  try {
    assertJwtSecret();
    const user = await prisma.users.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: await hashPassword(password),
      },
    });
    return res.status(201).json({
      user: serializeUser(user),
      token: signToken({ id: user.id, role: user.role }),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "A user with this email already exists" });
    }
    console.error("User registration failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function login(req, res) {
  const validationError = validateCredentials(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    assertJwtSecret();
    const user = await prisma.users.findUnique({
      where: { email: req.body.email.trim().toLowerCase() },
    });
    if (!user || !(await verifyPassword(req.body.password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json({
      user: serializeUser(user),
      token: signToken({ id: user.id, role: user.role }),
    });
  } catch (error) {
    console.error("User login failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export { hashPassword, login, register, serializeUser, verifyPassword };
