import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function POST() {
  try {
    const user = await requireUserRecord();
    const { banks } = await getServices();
    return jsonOk(await banks.createLinkToken(user));
  } catch (error) {
    return jsonError(error);
  }
}
