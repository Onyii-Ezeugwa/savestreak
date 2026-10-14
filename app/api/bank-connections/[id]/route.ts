import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserRecord();
    const { id } = await context.params;
    const { banks } = await getServices();
    await banks.disconnect(user, id);
    return jsonOk({ disconnected: true });
  } catch (error) {
    return jsonError(error);
  }
}
