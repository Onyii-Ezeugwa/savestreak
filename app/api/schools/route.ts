import { jsonError, jsonOk } from "@/lib/backend/http";
import { searchUsSchools } from "@/lib/backend/schools";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const schools = await searchUsSchools(query);
    return jsonOk({ schools });
  } catch (error) {
    return jsonError(error);
  }
}
