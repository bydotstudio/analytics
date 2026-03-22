import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { pool } from "@/lib/db";

// LemonSqueezy events we care about
const HANDLED_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_payment_success",
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await ctx.params;

  // Look up site + webhook secret
  const { rows } = await pool.query<{ ls_webhook_secret: string | null }>(
    "SELECT ls_webhook_secret FROM sites WHERE id = $1",
    [siteId]
  );
  const site = rows[0];
  if (!site || !site.ls_webhook_secret) {
    return new Response("Not configured", { status: 404 });
  }

  // Verify signature
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  const hmac = createHmac("sha256", site.ls_webhook_secret);
  hmac.update(rawBody);
  const expected = hmac.digest("hex");

  try {
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
      return new Response("Invalid signature", { status: 401 });
    }
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventName = payload.meta
    ? (payload.meta as Record<string, unknown>).event_name as string
    : null;

  if (!eventName || !HANDLED_EVENTS.has(eventName)) {
    return new Response("Ignored", { status: 200 });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;

  // Extract amount — LS stores totals in cents
  let revenue: number | null = null;
  let currency: string | null = null;
  let customEventName = "purchase";

  if (eventName === "order_created") {
    const total = attributes?.total as number | undefined;
    currency = (attributes?.currency as string | undefined)?.toUpperCase() ?? "USD";
    revenue = total != null ? total / 100 : null;
    customEventName = "purchase";
  } else if (eventName === "subscription_created" || eventName === "subscription_payment_success") {
    const total = attributes?.total as number | undefined;
    currency = (attributes?.currency as string | undefined)?.toUpperCase() ?? "USD";
    revenue = total != null ? total / 100 : null;
    customEventName = eventName === "subscription_created" ? "subscription_started" : "subscription_renewed";
  }

  const sessionId = `ls_${data?.id ?? "unknown"}`;
  const email = (attributes?.user_email ?? attributes?.customer_email) as string | undefined;

  await pool.query(
    `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, properties, pathname)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      siteId,
      sessionId,
      customEventName,
      revenue,
      currency,
      JSON.stringify({ provider: "lemonsqueezy", event: eventName, email: email ?? null }),
      "/",
    ]
  );

  return new Response("OK", { status: 200 });
}
