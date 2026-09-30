import type { SchoolKind, SchoolOption } from "@/lib/school-option";

export type { SchoolKind, SchoolOption };

function sanitizeTerm(value: string) {
  return value.replace(/[%'\\]/g, " ").replace(/\s+/g, " ").trim();
}

async function searchK12(term: string): Promise<SchoolOption[]> {
  const like = `%${sanitizeTerm(term).toUpperCase()}%`;
  const url = new URL(
    "https://services6.arcgis.com/mmnl2mUzb7ocuCd5/arcgis/rest/services/US_Public_Schools_2024/FeatureServer/0/query",
  );
  url.searchParams.set("where", `UPPER(NAME) LIKE '${like}'`);
  url.searchParams.set("outFields", "NCESID,NAME,CITY,STATE");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("orderByFields", "NAME");
  url.searchParams.set("resultRecordCount", "8");
  url.searchParams.set("f", "json");

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error("Could not search K-12 schools.");
  }
  const payload = (await response.json()) as {
    features?: { attributes?: Record<string, string | number | null> }[];
  };
  return (payload.features ?? [])
    .map((feature) => feature.attributes ?? {})
    .filter((row) => row.NCESID && row.NAME)
    .map((row) => ({
      id: `k12:${String(row.NCESID)}`,
      name: String(row.NAME),
      city: String(row.CITY ?? ""),
      state: String(row.STATE ?? ""),
      kind: "k12" as const,
    }));
}

async function searchColleges(term: string): Promise<SchoolOption[]> {
  const url = new URL("https://api.data.gov/ed/collegescorecard/v1/schools.json");
  url.searchParams.set(
    "api_key",
    process.env.DATA_GOV_API_KEY || "DEMO_KEY",
  );
  url.searchParams.set("school.name", sanitizeTerm(term));
  url.searchParams.set("fields", "id,school.name,school.city,school.state");
  url.searchParams.set("per_page", "8");

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error("Could not search colleges.");
  }
  const payload = (await response.json()) as {
    results?: {
      id?: number;
      "school.name"?: string;
      "school.city"?: string;
      "school.state"?: string;
    }[];
  };
  return (payload.results ?? [])
    .filter((row) => row.id && row["school.name"])
    .map((row) => ({
      id: `college:${row.id}`,
      name: String(row["school.name"]),
      city: String(row["school.city"] ?? ""),
      state: String(row["school.state"] ?? ""),
      kind: "college" as const,
    }));
}

export async function searchUsSchools(query: string): Promise<SchoolOption[]> {
  const term = sanitizeTerm(query);
  if (term.length < 3) {
    return [];
  }

  const [k12, colleges] = await Promise.allSettled([
    searchK12(term),
    searchColleges(term),
  ]);

  const schools = [
    ...(k12.status === "fulfilled" ? k12.value : []),
    ...(colleges.status === "fulfilled" ? colleges.value : []),
  ];

  const seen = new Set<string>();
  return schools.filter((school) => {
    if (seen.has(school.id)) {
      return false;
    }
    seen.add(school.id);
    return true;
  }).slice(0, 12);
}
