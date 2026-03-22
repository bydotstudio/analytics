import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ funnelId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { funnelId } = await ctx.params;

  // Verify ownership via JOIN
  const { rows } = await pool.query(
    `SELECT f.id FROM funnels f
     JOIN sites s ON s.id = f.site_id
     WHERE f.id = $1 AND s.user_id = $2`,
    [funnelId, session.user.id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await pool.query("DELETE FROM funnels WHERE id = $1", [funnelId]);

  return new Response(null, { status: 204 });
}
