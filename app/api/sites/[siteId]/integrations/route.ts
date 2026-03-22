import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

const schema = z.object({
  ls_webhook_secret: z.string().max(200).optional(),
  stripe_webhook_secret: z.string().max(200).optional(),
  polar_webhook_secret: z.string().max(200).optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await ctx.params;

  const { rows: sites } = await pool.query(
    "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!sites[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ls_webhook_secret, stripe_webhook_secret, polar_webhook_secret } = parsed.data;

  await pool.query(
    `UPDATE sites SET
       ls_webhook_secret     = COALESCE($2, ls_webhook_secret),
       stripe_webhook_secret = COALESCE($3, stripe_webhook_secret),
       polar_webhook_secret  = COALESCE($4, polar_webhook_secret)
     WHERE id = $1`,
    [siteId, ls_webhook_secret ?? null, stripe_webhook_secret ?? null, polar_webhook_secret ?? null]
  );

  return new Response(null, { status: 204 });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await ctx.params;

  const { rows } = await pool.query<{
    ls_webhook_secret: string | null;
    stripe_webhook_secret: string | null;
    polar_webhook_secret: string | null;
  }>(
    "SELECT ls_webhook_secret, stripe_webhook_secret, polar_webhook_secret FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mask secrets — only show if set (never return the actual value)
  return NextResponse.json({
    ls_configured: !!rows[0].ls_webhook_secret,
    stripe_configured: !!rows[0].stripe_webhook_secret,
    polar_configured: !!rows[0].polar_webhook_secret,
  });
}
