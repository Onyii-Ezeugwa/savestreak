import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { importStatement } from "@/lib/backend/transaction-service";
import { ApiError } from "@/lib/backend/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const form = await request.formData();
    const file = form.get("statement");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose a PDF or CSV bank statement to upload.");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const { store } = await getServices();
    return jsonOk(
      await importStatement(store, user, {
        name: file.name,
        type: file.type,
        bytes,
      }),
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
