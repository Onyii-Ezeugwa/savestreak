import { jsonError, jsonOk } from "@/lib/backend/http";
import { ApiError } from "@/lib/backend/types";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function GET(request: Request) {
  try {
    const user = await requireUserRecord();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const { banks } = await getServices();
    const institutions = await banks.searchInstitutions(user, query);
    return jsonOk({ institutions });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return jsonError(new ApiError(502, error.message));
    }
    return jsonError(error);
  }
}
