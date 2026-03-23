import { inject } from "vitest";
import { Pool } from "pg";
import { createClient } from "@clickhouse/client";
import { randomUUID } from "crypto";

// vitest inject — typed via tests/integration/vitest.d.ts augmentation
const get = (key: string): string => (inject as unknown as (k: string) => string)(key);

export function getPool(): Pool {
  return new Pool({ connectionString: get("PG_URL") });
}

export function getCh() {
  return createClient({
    url: get("CH_URL"),
    database: "analytics",
    username: "default",
    password: "",
  });
}

export function appUrl(): string {
  return get("APP_URL");
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export async function createTestUser(
  pool: Pool,
  plan: "free" | "pro" = "free"
): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO "user" (id, name, email, plan, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, 'Test User', $2, $3, true, NOW(), NOW())`,
    [id, `test+${id}@example.com`, plan]
  );
  return id;
}

export async function createTestSite(
  pool: Pool,
  userId: string,
  domain?: string
): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO sites (id, user_id, name, domain, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [id, userId, "Test Site", domain ?? `${id}.example.com`]
  );
  return id;
}

/**
 * Insert a Better Auth session row directly.
 * Returns the token to use as: Cookie: better-auth.session_token=<token>
 */
export async function createTestSession(
  pool: Pool,
  userId: string
): Promise<string> {
  const token = randomUUID();
  await pool.query(
    `INSERT INTO session (id, "userId", token, "expiresAt", "createdAt", "updatedAt", "ipAddress", "userAgent")
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW(), '127.0.0.1', 'vitest')`,
    [randomUUID(), userId, token]
  );
  return token;
}

export function authHeader(token: string): HeadersInit {
  return { Cookie: `better-auth.session_token=${token}` };
}

// ── Polling ───────────────────────────────────────────────────────────────────

/**
 * Poll until predicate returns true or timeout is reached.
 * Used to wait for ClickHouse async inserts to become visible.
 */
export async function pollUntil(
  fn: () => Promise<boolean>,
  timeoutMs = 8_000,
  intervalMs = 250
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`pollUntil timed out after ${timeoutMs}ms`);
}
