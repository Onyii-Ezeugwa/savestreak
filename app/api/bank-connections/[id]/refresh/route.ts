import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserRecord();
    const { id } = await context.params;
    const { banks } = await getServices();
    const result = await banks.refresh(user, id === "all" ? undefined : id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
