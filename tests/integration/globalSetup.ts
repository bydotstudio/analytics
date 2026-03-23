import { GenericContainer, Wait } from "testcontainers";
import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";

let pgContainer: Awaited<ReturnType<GenericContainer["start"]>> | undefined;
let chContainer: Awaited<ReturnType<GenericContainer["start"]>> | undefined;
let devServer: ChildProcess | undefined;

type Provide = <K extends string>(key: K, value: string) => void;

export async function setup({ provide }: { provide: Provide }) {
  const root = resolve(new URL(import.meta.url).pathname, "../../..");

  // ── Postgres ───────────────────────────────────────────────────────────────
  pgContainer = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_DB: "analytics_test",
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage("database system is ready to accept connections")
    )
    .start();

  const pgPort = pgContainer.getMappedPort(5432);
  const pgUrl = `postgresql://test:test@127.0.0.1:${pgPort}/analytics_test`;

  // Apply schema (retry in case Postgres isn't fully accepting connections yet)
  const schemaSql = readFileSync(resolve(root, "schema.sql"), "utf8");
  await retryConnect(pgUrl, schemaSql);

  // ── ClickHouse ─────────────────────────────────────────────────────────────
  // Use "analytics" DB so all hardcoded `analytics.events` queries work as-is
  chContainer = await new GenericContainer("clickhouse/clickhouse-server:24.8")
    .withEnvironment({
      CLICKHOUSE_DB: "analytics",
      CLICKHOUSE_USER: "default",
      CLICKHOUSE_PASSWORD: "",
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1",
    })
    .withExposedPorts(8123)
    .withWaitStrategy(Wait.forHttp("/ping", 8123).forStatusCode(200))
    .withUlimits({ nofile: { soft: 262144, hard: 262144 } })
    .start();

  const chPort = chContainer.getMappedPort(8123);
  const chUrl = `http://127.0.0.1:${chPort}`;

  // Apply ClickHouse schema
  const chSchema = readFileSync(
    resolve(root, "scripts/clickhouse-schema.sql"),
    "utf8"
  );
  for (const stmt of chSchema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await fetch(chUrl + "/", { method: "POST", body: stmt });
  }

  // ── Dev server ─────────────────────────────────────────────────────────────
  // Use a dedicated distDir so the test server doesn't conflict with an
  // existing `next dev` process that holds the `.next/dev/lock` file.
  const stderrChunks: Buffer[] = [];
  devServer = spawn("bun", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: "3999",
      DATABASE_URL: pgUrl,
      CLICKHOUSE_URL: chUrl,
      CLICKHOUSE_DB: "analytics",
      VISITOR_HASH_SALT: "test-salt-for-vitest",
      BETTER_AUTH_SECRET: "test-secret-exactly-32-chars-abc!",
      NEXT_PUBLIC_APP_URL: "http://localhost:3999",
      RESEND_API_KEY: "",
      POLAR_ACCESS_TOKEN: "",
      NEXT_DIST_DIR: ".next-test",
    },
    cwd: root,
    stdio: "pipe",
  });

  // Buffer stderr so we can include it in the timeout error message.
  devServer.stderr?.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk);
    if (stderrChunks.length > 50) stderrChunks.shift(); // keep last ~50 chunks
  });

  await waitForServer("http://localhost:3999", 90_000, () =>
    stderrChunks.map((b) => b.toString()).join("")
  );

  provide("PG_URL", pgUrl);
  provide("CH_URL", chUrl);
  provide("APP_URL", "http://localhost:3999");

  console.log(
    `[test] Containers ready — pg:${pgPort} ch:${chPort} app:3999`
  );
}

export async function teardown() {
  devServer?.kill("SIGTERM");
  await Promise.all([pgContainer?.stop(), chContainer?.stop()]);
}

async function retryConnect(pgUrl: string, sql: string, retries = 8, delayMs = 1000) {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    const pool = new Pool({ connectionString: pgUrl, max: 1 });
    try {
      await pool.query(sql);
      await pool.end();
      return;
    } catch (e) {
      lastErr = e;
      await pool.end().catch(() => {});
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function waitForServer(
  url: string,
  timeoutMs: number,
  getStderr?: () => string
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  const tail = getStderr?.().slice(-2000);
  throw new Error(
    `Dev server at ${url} did not start within ${timeoutMs}ms` +
      (tail ? `\n\nStderr tail:\n${tail}` : "")
  );
}
