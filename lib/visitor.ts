import { createHash } from "crypto";

/**
 * Compute a daily-rotating visitor hash from IP + User-Agent + date + salt.
 * The hash is non-reversible and rotates every day, making cross-day
 * tracking impossible — no cookies or persistent storage required.
 */
export function computeVisitorHash(ip: string, ua: string, salt: string): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash("sha256")
    .update(`${ip}|${ua}|${day}|${salt}`)
    .digest("hex")
    .slice(0, 16); // 16 hex chars is ample for dedup, reduces storage
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}
