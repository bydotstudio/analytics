import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

const createSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(100),
  steps: z.array(
    z.object({
      pathname: z.string().min(1).max(500),
      label: z.string().max(100).optional(),
    })
  ).min(2).max(10),
});

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

  const { rows: funnels } = await pool.query<{ id: string; name: string; created_at: string }>(
    "SELECT id, name, created_at FROM funnels WHERE site_id = $1 ORDER BY created_at DESC",
    [siteId]
  );

  const { rows: steps } = await pool.query<{
    funnel_id: string;
    id: string;
    step_order: number;
    pathname: string;
    label: string | null;
  }>(
    `SELECT fs.funnel_id, fs.id, fs.step_order, fs.pathname, fs.label
     FROM funnel_steps fs
     JOIN funnels f ON f.id = fs.funnel_id
     WHERE f.site_id = $1
     ORDER BY fs.funnel_id, fs.step_order`,
    [siteId]
  );

  const stepsByFunnel = steps.reduce<Record<string, typeof steps>>((acc, s) => {
    (acc[s.funnel_id] ??= []).push(s);
    return acc;
  }, {});

  return NextResponse.json(
    funnels.map((f) => ({
      id: f.id,
      name: f.name,
      created_at: f.created_at,
      steps: (stepsByFunnel[f.id] ?? []).map((s) => ({
        id: s.id,
        step_order: s.step_order,
        pathname: s.pathname,
        label: s.label,
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { siteId, name, steps } = parsed.data;

  const { rows: sites } = await pool.query(
    "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!sites[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: funnelRows } = await client.query<{ id: string }>(
      "INSERT INTO funnels (site_id, name) VALUES ($1, $2) RETURNING id",
      [siteId, name]
    );
    const funnelId = funnelRows[0].id;

    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      await client.query(
        "INSERT INTO funnel_steps (funnel_id, step_order, pathname, label) VALUES ($1, $2, $3, $4)",
        [funnelId, idx + 1, step.pathname, step.label ?? null]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        id: funnelId,
        name,
        site_id: siteId,
        steps: steps.map((s, idx) => ({
          step_order: idx + 1,
          pathname: s.pathname,
          label: s.label ?? null,
        })),
      },
      { status: 201 }
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
