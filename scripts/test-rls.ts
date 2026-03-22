// Usage: PGURL=postgresql://analytics:password@localhost:5432/analytics npx tsx scripts/test-rls.ts
// Verifies RLS policy filters sites by app.current_user_id context variable.
import { Pool } from "pg";

const connectionString = process.env.PGURL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ Set PGURL or DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const client = await pool.connect();

try {
  // With a nonexistent user set, RLS should return 0 rows
  await client.query("BEGIN");
  await client.query("SELECT set_config('app.current_user_id', 'nonexistent-user-id', true)");
  const { rows } = await client.query("SELECT id FROM sites");
  await client.query("COMMIT");

  if (rows.length !== 0) {
    console.error(`✗ RLS should return 0 rows for unknown user, got ${rows.length}`);
    process.exit(1);
  }
  console.log("✓ RLS policy active — 0 rows returned for nonexistent user");

  // Without context set, RLS should be transparent (user_id = user_id)
  await client.query("BEGIN");
  await client.query("SELECT set_config('app.current_user_id', '', true)");
  const { rows: allRows } = await client.query("SELECT id FROM sites");
  await client.query("COMMIT");

  console.log(`✓ RLS transparent when no user context — ${allRows.length} sites visible`);
} finally {
  client.release();
  await pool.end();
}
