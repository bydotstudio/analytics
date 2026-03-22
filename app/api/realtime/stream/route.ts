import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getRecentEvents } from "@/lib/ch-queries";

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
      // Cursor: last event timestamp we've seen (millisecond precision)
      let lastChecked = new Date().toISOString().replace("T", " ").replace("Z", "");
      let heartbeatCount = 0;

      const interval = setInterval(async () => {
        if (req.signal.aborted) {
          clearInterval(interval);
          controller.close();
          return;
        }

        try {
          const rows = await getRecentEvents(siteId, lastChecked);

          // Advance cursor to the latest event we just read
          if (rows.length > 0) {
            lastChecked = rows[rows.length - 1].timestamp;
          } else {
            // No new events — advance cursor to now so we don't re-scan
            lastChecked = new Date().toISOString().replace("T", " ").replace("Z", "");
          }

          for (const row of rows) {
            controller.enqueue(
              encoder.encode(`event: pageview\ndata: ${JSON.stringify(row)}\n\n`)
            );
          }

          heartbeatCount++;
          if (heartbeatCount % 8 === 0) {
            controller.enqueue(encoder.encode(`event: heartbeat\ndata: {}\n\n`));
          }
        } catch {
          // Ignore transient errors — keep the stream alive
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
