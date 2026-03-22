import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSummaryStats, getTopPages, getCountryBreakdown, getRevenueStats } from "@/lib/ch-queries";
import { sendWeeklyDigest, DigestSite } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Auth: only the cron runner may call this endpoint
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all verified users
  const { rows: users } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM "user" WHERE "emailVerified" = true`
  );

  let sent = 0;

  for (const user of users) {
    const { rows: sites } = await pool.query<{ id: string; name: string; domain: string }>(
      `SELECT id, name, domain FROM sites WHERE user_id = $1`,
      [user.id]
    );
    if (sites.length === 0) continue;

    const digestSites: DigestSite[] = [];

    for (const site of sites) {
      const [summary, pages, countries, revenue] = await Promise.all([
        getSummaryStats(site.id),
        getTopPages(site.id),
        getCountryBreakdown(site.id),
        getRevenueStats(site.id),
      ]);

      digestSites.push({
        name: site.name,
        domain: site.domain,
        visitors_7d: summary.last_7d,
        top_pages: pages.slice(0, 5).map((p) => ({ label: p.label, visitors: p.visitors })),
        top_countries: countries.slice(0, 5).map((c) => ({ label: c.label, visitors: c.visitors })),
        total_revenue: revenue.total_revenue ?? 0,
      });
    }

    await sendWeeklyDigest(user.email, digestSites);
    sent++;
  }

  return NextResponse.json({ sent });
}
