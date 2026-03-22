import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const { rows: sites } = await pool.query(
    "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!sites[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastChecked = new Date();
      let heartbeatCount = 0;

      const interval = setInterval(async () => {
        if (req.signal.aborted) {
          clearInterval(interval);
          controller.close();
          return;
        }

        try {
          const { rows } = await pool.query<{
            pathname: string;
            country: string | null;
            timestamp: string;
          }>(
            `SELECT pathname, country, timestamp
             FROM page_views
             WHERE site_id = $1 AND timestamp > $2
             ORDER BY timestamp ASC
             LIMIT 20`,
            [siteId, lastChecked]
          );

          lastChecked = new Date();

          for (const row of rows) {
            controller.enqueue(
              encoder.encode(`event: pageview\ndata: ${JSON.stringify(row)}\n\n`)
            );
          }

          // Heartbeat every ~15s (every 7-8 polls at 2s interval)
          heartbeatCount++;
          if (heartbeatCount % 8 === 0) {
            controller.enqueue(encoder.encode(`event: heartbeat\ndata: {}\n\n`));
          }
        } catch {
          // Ignore transient DB errors — keep the stream alive
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
