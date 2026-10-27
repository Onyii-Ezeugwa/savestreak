import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { listTransactions } from "@/lib/backend/transaction-service";

export async function GET(request: Request) {
  try {
    const user = await requireUserRecord();
    const { store } = await getServices();
    const url = new URL(request.url);
    return jsonOk(
      await listTransactions(store, user, {
        category: url.searchParams.get("category") ?? undefined,
        source: url.searchParams.get("source") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        period: url.searchParams.get("period") ?? undefined,
        today: url.searchParams.get("today") ?? undefined,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
