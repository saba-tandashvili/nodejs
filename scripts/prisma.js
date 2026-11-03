import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import configureDatabaseUrl from "../config/databaseUrl.js";

dotenv.config();
configureDatabaseUrl();

const prismaCli = resolve(dirname(fileURLToPath(import.meta.url)), "../node_modules/prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
