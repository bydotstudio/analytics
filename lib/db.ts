import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool = globalThis._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis._pgPool = pool;

/**
 * Verify that a site belongs to the given user, with the RLS user context set
 * so the Postgres policy enforces ownership at the DB level as a backstop.
 * Returns true if the site exists and belongs to the user, false otherwise.
 */
export async function verifySiteOwnership(
  siteId: string,
  userId: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    // set_config with is_local=true scopes the setting to the current transaction.
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_user_id', $1, true)",
      [userId]
    );
    const { rows } = await client.query<{ id: string }>(
      "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
      [siteId, userId]
    );
    await client.query("COMMIT");
    return rows.length > 0;
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return false;
  } finally {
    client.release();
  }
}
