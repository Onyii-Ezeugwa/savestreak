/**
 * Build a logo image URL for a company domain.
 * Prefers Logo.dev when NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY is set.
 * Falls back to DuckDuckGo's icon service (no key required).
 */
export function buildBankLogoUrl(domain: string, size = 128) {
  const clean = domain.replace(/^www\./i, "").toLowerCase().trim();
  if (!clean) {
    return "";
  }

  const publishable = process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY?.trim();
  if (publishable) {
    const url = new URL(`https://img.logo.dev/${clean}`);
    url.searchParams.set("token", publishable);
    url.searchParams.set("format", "png");
    url.searchParams.set("size", String(size));
    url.searchParams.set("retina", "true");
    return url.toString();
  }

  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(clean)}.ico`;
}

export function resolveBankLogo(input: {
  id?: string | null;
  name?: string | null;
  domain?: string | null;
}) {
  if (input.domain) {
    return buildBankLogoUrl(input.domain);
  }

  const byId: Record<string, string> = {
    ins_chase: "chase.com",
    ins_3: "chase.com",
    ins_boa: "bankofamerica.com",
    ins_1: "bankofamerica.com",
    ins_wells: "wellsfargo.com",
    ins_4: "wellsfargo.com",
    ins_citi: "citi.com",
    ins_5: "citi.com",
    ins_amex: "americanexpress.com",
    ins_10: "americanexpress.com",
    ins_capitalone: "capitalone.com",
    ins_11: "capitalone.com",
    ins_pnc: "pnc.com",
    ins_13: "pnc.com",
    ins_usbank: "usbank.com",
    ins_14: "usbank.com",
  };

  if (input.id && byId[input.id]) {
    return buildBankLogoUrl(byId[input.id]);
  }

  const name = input.name ?? "";
  const byName: Array<{ match: RegExp; domain: string }> = [
    { match: /\bchase\b/i, domain: "chase.com" },
    { match: /bank of america|bofa/i, domain: "bankofamerica.com" },
    { match: /wells\s*fargo/i, domain: "wellsfargo.com" },
    { match: /\bciti(bank)?\b/i, domain: "citi.com" },
    { match: /american\s*express|\bamex\b/i, domain: "americanexpress.com" },
    { match: /capital\s*one/i, domain: "capitalone.com" },
    { match: /\bpnc\b/i, domain: "pnc.com" },
    { match: /u\.?s\.?\s*bank|usbank/i, domain: "usbank.com" },
  ];

  for (const entry of byName) {
    if (entry.match.test(name)) {
      return buildBankLogoUrl(entry.domain);
    }
  }

  return "";
}
