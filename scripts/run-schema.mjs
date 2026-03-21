import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(resolve("supabase/schema.sql"), "utf8");

// Split on statement boundaries and run each
const client = await pool.connect();
try {
  await client.query(sql);
  console.log("Schema applied successfully!");
} catch (err) {
  console.error("Error:", err.message);
} finally {
  client.release();
  await pool.end();
}
