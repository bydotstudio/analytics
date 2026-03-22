import { createClient } from "@clickhouse/client";

declare global {
  // eslint-disable-next-line no-var
  var _chClient: ReturnType<typeof createClient> | undefined;
}

function createChClient() {
  return createClient({
    url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    database: process.env.CLICKHOUSE_DB ?? "analytics",
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
    },
  });
}

export const ch = globalThis._chClient ?? createChClient();
if (process.env.NODE_ENV !== "production") globalThis._chClient = ch;
