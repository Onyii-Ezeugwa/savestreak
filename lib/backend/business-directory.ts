import { collectMerchantQueries } from "@/lib/receipt-text-parse";

const CLEARBIT_URL = "https://autocomplete.clearbit.com/v1/companies/suggest";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface BusinessMatch {
  name: string;
  domain: string;
}

interface CacheEntry {
  expiresAt: number;
  matches: BusinessMatch[];
}

const cacheStore = globalThis as typeof globalThis & {
  __savestreakBusinessCache?: Map<string, CacheEntry>;
};

function cache() {
  if (!cacheStore.__savestreakBusinessCache) {
    cacheStore.__savestreakBusinessCache = new Map();
  }
  return cacheStore.__savestreakBusinessCache;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isConfident(query: string, business: BusinessMatch) {
  const normalizedQuery = normalize(query);
  const label = normalize(business.domain.split(".")[0] ?? "");
  if (normalizedQuery.length < 3 || label.length < 3) {
    return false;
  }
  // The website label has to be the name we found on the receipt.
  // That drops lookalikes such as "She Wears Many Hats" for "SHEW".
  return label === normalizedQuery;
}

async function searchBusinesses(query: string): Promise<BusinessMatch[]> {
  const key = query.trim().toLowerCase();
  const hit = cache().get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.matches;
  }

  const url = new URL(CLEARBIT_URL);
  url.searchParams.set("query", query.trim());

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return [];
    }

    const rows = (await response.json()) as Array<{
      name?: string;
      domain?: string;
    }>;
    const matches = rows
      .filter((row) => row.name && row.domain)
      .slice(0, 8)
      .map((row) => ({
        name: String(row.name),
        domain: String(row.domain).replace(/^www\./i, "").toLowerCase(),
      }));

    cache().set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      matches,
    });
    return matches;
  } catch {
    return [];
  }
}

/** Replace an OCR merchant with the directory name when the website label matches. */
export async function resolveMerchantName(
  text: string,
  fallback: string,
): Promise<string> {
  const queries = collectMerchantQueries(text, fallback);
  const found: Array<{ name: string; index: number }> = [];

  await Promise.all(
    queries.map(async (query) => {
      const matches = await searchBusinesses(query);
      const best = matches.find((match) => isConfident(query, match));
      if (!best) {
        return;
      }
      const index = text.toLowerCase().indexOf(query.toLowerCase());
      found.push({
        name: best.name,
        index: index === -1 ? 10_000 : index,
      });
    }),
  );

  found.sort((a, b) => a.index - b.index);
  return found[0]?.name ?? fallback;
}
