import type { BankDirectoryOption } from "../bank-types";
import { searchUsBanks } from "../banks";
import { buildBankLogoUrl } from "@/lib/bank-logos";

export interface InstitutionRecord extends BankDirectoryOption {
  domain: string;
}

/** Popular US banks with official domains for Link. */
const FEATURED: Array<{
  id: string;
  name: string;
  domain: string;
  city: string;
  state: string;
}> = [
  {
    id: "ins_chase",
    name: "Chase",
    domain: "chase.com",
    city: "New York",
    state: "NY",
  },
  {
    id: "ins_boa",
    name: "Bank of America",
    domain: "bankofamerica.com",
    city: "Charlotte",
    state: "NC",
  },
  {
    id: "ins_wells",
    name: "Wells Fargo",
    domain: "wellsfargo.com",
    city: "San Francisco",
    state: "CA",
  },
  {
    id: "ins_citi",
    name: "Citibank",
    domain: "citi.com",
    city: "New York",
    state: "NY",
  },
  {
    id: "ins_amex",
    name: "American Express",
    domain: "americanexpress.com",
    city: "New York",
    state: "NY",
  },
  {
    id: "ins_capitalone",
    name: "Capital One",
    domain: "capitalone.com",
    city: "McLean",
    state: "VA",
  },
  {
    id: "ins_pnc",
    name: "PNC",
    domain: "pnc.com",
    city: "Pittsburgh",
    state: "PA",
  },
  {
    id: "ins_usbank",
    name: "U.S. Bank",
    domain: "usbank.com",
    city: "Minneapolis",
    state: "MN",
  },
];

interface ClearbitSuggestion {
  name?: string;
  domain?: string;
  logo?: string | null;
}

function toInstitution(input: {
  id: string;
  name: string;
  domain: string;
  city?: string;
  state?: string;
}): InstitutionRecord {
  const domain = input.domain.replace(/^www\./i, "").toLowerCase();
  return {
    id: input.id,
    name: input.name,
    domain,
    city: input.city ?? "",
    state: input.state ?? "",
    logoUrl: buildBankLogoUrl(domain),
  };
}

export function getFeaturedInstitutions(): InstitutionRecord[] {
  return FEATURED.map((item) => toInstitution(item));
}

export function getInstitutionById(id: string) {
  return getFeaturedInstitutions().find((item) => item.id === id) ?? null;
}

async function searchClearbit(query: string): Promise<InstitutionRecord[]> {
  const url = new URL("https://autocomplete.clearbit.com/v1/companies/suggest");
  url.searchParams.set("query", query);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const rows = (await response.json()) as ClearbitSuggestion[];
  return rows
    .filter((row) => row.name && row.domain)
    .map((row) =>
      toInstitution({
        id: `domain_${String(row.domain).replace(/\W+/g, "_")}`,
        name: String(row.name),
        domain: String(row.domain),
      }),
    );
}

async function resolveDomainForName(name: string): Promise<string | null> {
  const matches = await searchClearbit(name);
  if (matches.length === 0) {
    return null;
  }

  const normalized = name.trim().toLowerCase();
  const exact = matches.find(
    (item) => item.name.toLowerCase() === normalized,
  );
  if (exact) {
    return exact.domain;
  }

  const contains = matches.find((item) =>
    item.name.toLowerCase().includes(normalized.split(/\s+/)[0] ?? normalized),
  );
  return contains?.domain ?? matches[0]?.domain ?? null;
}

function rankInstitutions(query: string, items: InstitutionRecord[]) {
  const q = query.trim().toLowerCase();
  return [...items].sort((a, b) => {
    const aExact = a.name.toLowerCase() === q ? 0 : 1;
    const bExact = b.name.toLowerCase() === q ? 0 : 1;
    if (aExact !== bExact) {
      return aExact - bExact;
    }
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) {
      return aStarts - bStarts;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function searchInstitutions(
  query: string,
): Promise<InstitutionRecord[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return getFeaturedInstitutions();
  }

  const featured = getFeaturedInstitutions().filter(
    (item) =>
      item.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      item.domain.includes(trimmed.toLowerCase()),
  );

  const [clearbit, fdic] = await Promise.all([
    searchClearbit(trimmed).catch(() => [] as InstitutionRecord[]),
    searchUsBanks(trimmed).catch(() => [] as BankDirectoryOption[]),
  ]);

  const seen = new Set(featured.map((item) => item.domain));
  const merged = [...featured];

  for (const item of clearbit) {
    if (seen.has(item.domain)) {
      continue;
    }
    seen.add(item.domain);
    merged.push(item);
    if (merged.length >= 16) {
      break;
    }
  }

  if (merged.length < 16) {
    const fdicResolved = await Promise.all(
      fdic.slice(0, 12).map(async (bank) => {
        const domain = await resolveDomainForName(bank.name);
        if (!domain) {
          return null;
        }
        return toInstitution({
          id: bank.id,
          name: bank.name,
          domain,
          city: bank.city,
          state: bank.state,
        });
      }),
    );

    for (const item of fdicResolved) {
      if (!item || seen.has(item.domain) || merged.length >= 16) {
        continue;
      }
      seen.add(item.domain);
      merged.push(item);
    }
  }

  return rankInstitutions(trimmed, merged).slice(0, 16);
}
