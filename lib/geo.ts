import maxmind, { CountryResponse, Reader } from "maxmind";
import { statSync } from "fs";

interface GeoCache {
  reader: Reader<CountryResponse> | null;
  mtime: number;
}

let _cache: GeoCache | undefined;

async function getReader(): Promise<Reader<CountryResponse> | null> {
  const dbPath = process.env.MAXMIND_DB_PATH ?? "./GeoLite2-Country.mmdb";

  let mtime = 0;
  try {
    mtime = statSync(dbPath).mtimeMs;
  } catch {
    // File absent
  }

  if (_cache !== undefined && _cache.mtime === mtime) return _cache.reader;

  if (mtime === 0) {
    _cache = { reader: null, mtime: 0 };
    return null;
  }

  try {
    const reader = await maxmind.open<CountryResponse>(dbPath);
    _cache = { reader, mtime };
    return reader;
  } catch {
    _cache = { reader: null, mtime };
    return null;
  }
}

/**
 * Resolve a 2-letter ISO country code from an IP address using GeoLite2.
 * Returns '' if the MMDB file is not available or the IP is unresolvable.
 * Transparently reloads the DB when the file is replaced (mtime-based).
 */
export async function getCountry(ip: string): Promise<string> {
  const reader = await getReader();
  if (!reader) return "";
  try {
    return reader.get(ip)?.country?.iso_code ?? "";
  } catch {
    return "";
  }
}
