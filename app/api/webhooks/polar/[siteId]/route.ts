import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { pool } from "@/lib/db";

// Polar follows Standard Webhooks spec:
// signed content = "{webhook-id}.{webhook-timestamp}.{body}"
// signature header = "v1,<base64-encoded-hmac-sha256>"
function verifyPolarSignature(
  body: string,
  msgId: string,
  msgTimestamp: string,
  sigHeader: string,
  secret: string
): boolean {
  try {
    // Reject if timestamp is more than 5 minutes old
    if (Math.abs(Date.now() / 1000 - Number(msgTimestamp)) > 300) return false;

    const signed = `${msgId}.${msgTimestamp}.${body}`;
    const hmac = createHmac("sha256", secret);
    hmac.update(signed);
    const expected = hmac.digest("base64");

    // sigHeader can be "v1,<sig1> v1,<sig2>" — check all
    const signatures = sigHeader.split(" ").map((s) => s.replace(/^v1,/, ""));
    return signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(expected, "base64"));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

const HANDLED_EVENTS = new Set([
  "order.created",
  "subscription.created",
  "subscription.active",
  "subscription.updated",
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await ctx.params;

  const { rows } = await pool.query<{ polar_webhook_secret: string | null }>(
    "SELECT polar_webhook_secret FROM sites WHERE id = $1",
    [siteId]
  );
  const site = rows[0];
  if (!site || !site.polar_webhook_secret) {
    return new Response("Not configured", { status: 404 });
  }

  const rawBody = await req.text();
  const msgId        = req.headers.get("webhook-id") ?? "";
  const msgTimestamp = req.headers.get("webhook-timestamp") ?? "";
  const sigHeader    = req.headers.get("webhook-signature") ?? "";

  if (!verifyPolarSignature(rawBody, msgId, msgTimestamp, sigHeader, site.polar_webhook_secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = payload.type as string;
  if (!HANDLED_EVENTS.has(eventType)) {
    return new Response("Ignored", { status: 200 });
  }

  const data = payload.data as Record<string, unknown> | undefined;

  let revenue: number | null = null;
  let currency: string | null = null;
  let customEventName = "purchase";
  let email: string | null = null;

  if (eventType === "order.created") {
    // Polar amounts are in cents
    const amount = data?.amount as number | undefined;
    currency = (data?.currency as string | undefined)?.toUpperCase() ?? "USD";
    revenue = amount != null ? amount / 100 : null;
    email = (data?.customer as Record<string, unknown> | undefined)?.email as string ?? null;
    customEventName = "purchase";
  } else if (eventType === "subscription.created" || eventType === "subscription.active") {
    const amount = data?.amount as number | undefined;
    currency = (data?.currency as string | undefined)?.toUpperCase() ?? "USD";
    revenue = amount != null ? amount / 100 : null;
    email = (data?.customer as Record<string, unknown> | undefined)?.email as string ?? null;
    customEventName = "subscription_started";
  } else if (eventType === "subscription.updated") {
    // Only track if it's a renewal (current_period_start changed)
    const amount = data?.amount as number | undefined;
    currency = (data?.currency as string | undefined)?.toUpperCase() ?? "USD";
    revenue = amount != null ? amount / 100 : null;
    customEventName = "subscription_renewed";
  }

  await pool.query(
    `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, properties, pathname)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      siteId,
      `polar_${data?.id ?? msgId}`,
      customEventName,
      revenue,
      currency,
      JSON.stringify({ provider: "polar", event: eventType, email }),
      "/",
    ]
  );

  return new Response("OK", { status: 200 });
}
