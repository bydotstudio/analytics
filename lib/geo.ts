import maxmind, { CountryResponse, Reader } from "maxmind";
import { existsSync } from "fs";

declare global {
  // eslint-disable-next-line no-var
  var _geoReader: Reader<CountryResponse> | null | undefined;
}

async function getReader(): Promise<Reader<CountryResponse> | null> {
  if (globalThis._geoReader !== undefined) return globalThis._geoReader;

  const dbPath = process.env.MAXMIND_DB_PATH ?? "./GeoLite2-Country.mmdb";
  if (!existsSync(dbPath)) {
    // No MMDB file present — country detection disabled
    globalThis._geoReader = null;
    return null;
  }

  try {
    const reader = await maxmind.open<CountryResponse>(dbPath);
    globalThis._geoReader = reader;
    return reader;
  } catch {
    globalThis._geoReader = null;
    return null;
  }
}

/**
 * Resolve a 2-letter ISO country code from an IP address using GeoLite2.
 * Returns '' if the MMDB file is not available or the IP is unresolvable.
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
