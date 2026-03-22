import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { pool } from "@/lib/db";

// Stripe signature verification (no SDK needed)
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => p.split("=") as [string, string])
    );
    const timestamp = parts["t"];
    const signatures = header
      .split(",")
      .filter((p) => p.startsWith("v1="))
      .map((p) => p.slice(3));

    if (!timestamp || !signatures.length) return false;

    // Reject if timestamp is more than 5 minutes old
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

    const signed = `${timestamp}.${payload}`;
    const hmac = createHmac("sha256", secret);
    hmac.update(signed);
    const expected = hmac.digest("hex");

    return signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded",
  "invoice.paid",
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await ctx.params;

  const { rows } = await pool.query<{ stripe_webhook_secret: string | null }>(
    "SELECT stripe_webhook_secret FROM sites WHERE id = $1",
    [siteId]
  );
  const site = rows[0];
  if (!site || !site.stripe_webhook_secret) {
    return new Response("Not configured", { status: 404 });
  }

  const rawBody = await req.text();
  const stripeSignature = req.headers.get("stripe-signature") ?? "";

  if (!verifyStripeSignature(rawBody, stripeSignature, site.stripe_webhook_secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = event.type as string;
  if (!HANDLED_EVENTS.has(eventType)) {
    return new Response("Ignored", { status: 200 });
  }

  const data = (event.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

  let revenue: number | null = null;
  let currency: string | null = null;
  let customEventName = "purchase";
  let email: string | null = null;

  if (eventType === "checkout.session.completed") {
    const amountTotal = data?.amount_total as number | undefined;
    currency = (data?.currency as string | undefined)?.toUpperCase() ?? null;
    revenue = amountTotal != null ? amountTotal / 100 : null;
    email = (data?.customer_details as Record<string, unknown> | undefined)?.email as string ?? null;
    customEventName = data?.mode === "subscription" ? "subscription_started" : "purchase";
  } else if (eventType === "payment_intent.succeeded") {
    const amount = data?.amount as number | undefined;
    currency = (data?.currency as string | undefined)?.toUpperCase() ?? null;
    revenue = amount != null ? amount / 100 : null;
    customEventName = "purchase";
  } else if (eventType === "invoice.paid") {
    const amountPaid = data?.amount_paid as number | undefined;
    currency = (data?.currency as string | undefined)?.toUpperCase() ?? null;
    revenue = amountPaid != null ? amountPaid / 100 : null;
    email = data?.customer_email as string ?? null;
    customEventName = data?.billing_reason === "subscription_create"
      ? "subscription_started"
      : "subscription_renewed";
  }

  const sessionId = `stripe_${data?.id ?? "unknown"}`;

  await pool.query(
    `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, properties, pathname)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      siteId,
      sessionId,
      customEventName,
      revenue,
      currency,
      JSON.stringify({ provider: "stripe", event: eventType, email }),
      "/",
    ]
  );

  return new Response("OK", { status: 200 });
}
