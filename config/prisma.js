import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import configureDatabaseUrl from "./databaseUrl.js";

dotenv.config();
configureDatabaseUrl();

const prisma = new PrismaClient();

export default prisma;
