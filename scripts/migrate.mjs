import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getMigrations } from "../node_modules/better-auth/dist/db/get-migration.mjs";

const connectionString = process.env.DATABASE_URL;
console.log("Connecting to:", connectionString?.replace(/:([^:@]+)@/, ":***@"));

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: pool,
  emailAndPassword: { enabled: true },
});

const { runMigrations } = await getMigrations(auth.options);
console.log("Running migrations...");
await runMigrations();
console.log("Done!");
await pool.end();
