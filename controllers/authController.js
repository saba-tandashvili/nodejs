import { promisify } from "node:util";
import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import prisma from "../config/prisma.js";
import mailer from "../config/mailer.js";
import { assertJwtSecret, signToken } from "../middleware/auth.js";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const resetOtpLifetimeMs = 10 * 60 * 1000;

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

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isRequestBody(body, allowedKeys) {
  return (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.keys(body).every((key) => allowedKeys.includes(key))
  );
}

async function requestPasswordReset(req, res) {
  if (!isRequestBody(req.body, ["email"]) || !isValidEmail(req.body.email)) {
    return res.status(400).json({ error: "Email must be valid" });
  }

  try {
    const email = req.body.email.trim().toLowerCase();
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(202).json({ message: "If the account exists, a reset code has been sent" });
    }

    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpSalt = randomBytes(16).toString("hex");
    const otpHash = (await scrypt(otp, otpSalt, keyLength)).toString("hex");
    const otpExpiresAt = new Date(Date.now() + resetOtpLifetimeMs);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        passwordResetOtpHash: otpHash,
        passwordResetOtpSalt: otpSalt,
        passwordResetOtpExpiresAt: otpExpiresAt,
        passwordResetOtpAttempts: 0,
      },
    });

    try {
      await mailer.sendPasswordResetOtp(email, otp);
    } catch (error) {
      await prisma.users.updateMany({
        where: { id: user.id, passwordResetOtpHash: otpHash },
        data: {
          passwordResetOtpHash: null,
          passwordResetOtpSalt: null,
          passwordResetOtpExpiresAt: null,
          passwordResetOtpAttempts: 0,
        },
      });
      throw error;
    }

    return res.status(202).json({ message: "If the account exists, a reset code has been sent" });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return res.status(500).json({ error: "Unable to send password reset code" });
  }
}

async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body || {};
  if (
    !isRequestBody(req.body, ["email", "otp", "newPassword"]) ||
    !isValidEmail(email) ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp) ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return res.status(400).json({ error: "Valid email, six-digit code, and password are required" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const now = new Date();
    if (
      !user ||
      typeof user.passwordResetOtpHash !== "string" ||
      typeof user.passwordResetOtpSalt !== "string" ||
      !(user.passwordResetOtpExpiresAt instanceof Date) ||
      user.passwordResetOtpAttempts >= 5 ||
      user.passwordResetOtpExpiresAt <= now
    ) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    const expectedOtp = Buffer.from(user.passwordResetOtpHash, "hex");
    const actualOtp = await scrypt(otp, user.passwordResetOtpSalt, keyLength);
    if (
      expectedOtp.length !== actualOtp.length ||
      !timingSafeEqual(actualOtp, expectedOtp)
    ) {
      const attempts = user.passwordResetOtpAttempts;
      await prisma.users.updateMany({
        where: {
          id: user.id,
          passwordResetOtpHash: user.passwordResetOtpHash,
          passwordResetOtpSalt: user.passwordResetOtpSalt,
          passwordResetOtpExpiresAt: { gt: now },
          passwordResetOtpAttempts: attempts,
        },
        data:
          attempts === 4
            ? {
                passwordResetOtpHash: null,
                passwordResetOtpSalt: null,
                passwordResetOtpExpiresAt: null,
                passwordResetOtpAttempts: 5,
              }
            : { passwordResetOtpAttempts: { increment: 1 } },
      });
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    const result = await prisma.users.updateMany({
      where: {
        id: user.id,
        passwordResetOtpHash: user.passwordResetOtpHash,
        passwordResetOtpSalt: user.passwordResetOtpSalt,
        passwordResetOtpExpiresAt: { gt: now },
        passwordResetOtpAttempts: { lt: 5 },
      },
      data: {
        password: await hashPassword(newPassword),
        passwordResetOtpHash: null,
        passwordResetOtpSalt: null,
        passwordResetOtpExpiresAt: null,
        passwordResetOtpAttempts: 0,
      },
    });
    if (result.count !== 1) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    return res.json({ message: "Password has been reset" });
  } catch (error) {
    console.error("Password reset failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export {
  hashPassword,
  login,
  register,
  requestPasswordReset,
  resetPassword,
  serializeUser,
  verifyPassword,
};
