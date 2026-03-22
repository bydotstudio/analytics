import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const schema = z.object({
  siteId: z.string().uuid(),
  sessionId: z.string().max(100),
  externalUserId: z.string().min(1).max(255),
  traits: z.record(z.string(), z.unknown()).optional(),
});

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: CORS_HEADERS });
  }

  const { siteId, sessionId, externalUserId, traits } = parsed.data;

  // Verify site exists
  const { rows } = await pool.query("SELECT id FROM sites WHERE id = $1", [siteId]);
  if (!rows[0]) return new Response(null, { status: 204, headers: CORS_HEADERS });

  await pool.query(
    `INSERT INTO identified_sessions (site_id, session_id, external_user_id, traits)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (site_id, session_id)
     DO UPDATE SET external_user_id = $3, traits = $4, identified_at = now()`,
    [siteId, sessionId, externalUserId, traits ? JSON.stringify(traits) : null]
  );

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
