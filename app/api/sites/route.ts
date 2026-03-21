import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    "SELECT * FROM sites WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );
  return NextResponse.json(rows);
}

const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(255),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { rows: countRows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM sites WHERE user_id = $1",
    [session.user.id]
  );
  if (parseInt(countRows[0].count) >= 5) {
    return NextResponse.json({ error: "Site limit reached (5 sites max)" }, { status: 403 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO sites (user_id, name, domain) VALUES ($1, $2, $3) RETURNING *`,
      [session.user.id, parsed.data.name, parsed.data.domain]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      return NextResponse.json({ error: "That domain is already registered." }, { status: 409 });
    }
    throw err;
  }
}
