// Usage: npx tsx scripts/test-geo.ts [ip]
// Verifies GeoLite2 lookup returns a valid ISO country code.
// Requires MAXMIND_DB_PATH or GeoLite2-Country.mmdb in the project root.
import { getCountry } from "../lib/geo";

const ip = process.argv[2] ?? "8.8.8.8";
const result = await getCountry(ip);

if (result === "") {
  console.warn(`⚠ No country resolved for ${ip} — GeoLite2 DB may not be present`);
  console.warn("  Run: MAXMIND_LICENSE_KEY=your_key bash scripts/download-geolite2.sh");
  process.exit(0);
}

console.assert(result.length === 2, `Expected 2-char ISO code, got: "${result}"`);
console.log(`✓ ${ip} → ${result}`);
