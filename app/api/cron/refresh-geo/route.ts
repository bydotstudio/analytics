import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { createWriteStream, renameSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { extract } from "tar";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.MAXMIND_LICENSE_KEY;
  if (!key) {
    return NextResponse.json({ error: "MAXMIND_LICENSE_KEY not configured" }, { status: 500 });
  }

  const dbPath = process.env.MAXMIND_DB_PATH ?? "./GeoLite2-Country.mmdb";
  const tmpTar = join(tmpdir(), `geolite2-${Date.now()}.tar.gz`);
  const tmpDir = mkdtempSync(join(tmpdir(), "geolite2-"));

  try {
    // Download tar.gz from MaxMind
    const url = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${key}&suffix=tar.gz`;
    await new Promise<void>((resolve, reject) => {
      const file = createWriteStream(tmpTar);
      https
        .get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`MaxMind download failed: HTTP ${res.statusCode}`));
            return;
          }
          pipeline(res, file).then(resolve).catch(reject);
        })
        .on("error", reject);
    });

    // Extract only the .mmdb file; strip the date-prefixed directory
    await extract({
      file: tmpTar,
      cwd: tmpDir,
      strip: 1,
      filter: (path: string) => path.endsWith(".mmdb"),
    });

    // Atomically replace the live mmdb (mtime change triggers geo.ts hot-reload)
    renameSync(join(tmpDir, "GeoLite2-Country.mmdb"), dbPath);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[refresh-geo] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
