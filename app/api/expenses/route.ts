import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { ApiError } from "@/lib/backend/types";

export async function GET() {
  try {
    const user = await requireUserRecord();
    const { expenses } = await getServices();
    return jsonOk({ expenses: await expenses.list(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const form = await request.formData();
    const file = form.get("receipt");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose a receipt photo to upload.");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const ocrRaw = form.get("ocrText");
    const uploadedOn = form.get("uploadedOn");
    const { expenses } = await getServices();
    const result = await expenses.captureFromReceipt(user, {
      bytes,
      mimeType: file.type || "image/jpeg",
      fileName: file.name,
      ocrText: typeof ocrRaw === "string" ? ocrRaw : undefined,
      uploadedOn: typeof uploadedOn === "string" ? uploadedOn : undefined,
    });
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
