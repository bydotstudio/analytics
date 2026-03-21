import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ siteId: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await ctx.params;

  const { rowCount } = await pool.query(
    "DELETE FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );

  if (!rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
