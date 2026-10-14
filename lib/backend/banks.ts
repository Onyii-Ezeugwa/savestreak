import { resolveBankLogo } from "@/lib/bank-logos";
import type { BankDirectoryOption } from "./bank-types";

const FDIC_URL = "https://banks.data.fdic.gov/api/institutions";

export async function searchUsBanks(query: string): Promise<BankDirectoryOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const safe = trimmed.replace(/[^a-zA-Z0-9 &\-'.]/g, "").slice(0, 60);
  if (!safe) {
    return [];
  }

  const url = new URL(FDIC_URL);
  url.searchParams.set("filters", "ACTIVE:1");
  url.searchParams.set("search", `NAME:${safe}`);
  url.searchParams.set("fields", "NAME,CERT,CITY,STALP");
  url.searchParams.set("limit", "12");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Could not load the US bank directory.");
  }

  const payload = (await response.json()) as {
    data?: Array<{
      data?: {
        CERT?: number | string;
        NAME?: string;
        CITY?: string;
        STALP?: string;
      };
    }>;
  };

  return (payload.data ?? [])
    .map((row) => {
      const item = row.data;
      if (!item?.CERT || !item.NAME) {
        return null;
      }
      const id = String(item.CERT);
      const name = String(item.NAME);
      return {
        id,
        name,
        city: String(item.CITY ?? ""),
        state: String(item.STALP ?? ""),
        logoUrl: resolveBankLogo({ id, name }),
      } satisfies BankDirectoryOption;
    })
    .filter((item): item is BankDirectoryOption => Boolean(item));
}
