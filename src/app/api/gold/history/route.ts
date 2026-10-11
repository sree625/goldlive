import type { NextRequest } from "next/server";
import { todayInIndia } from "@/lib/format";
import { isHistoryRange } from "@/lib/gold/constants";
import { getHistory } from "@/lib/gold/service";

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range");
  if (!isHistoryRange(range)) {
    return Response.json({ error: "range must be one of 7d, 30d, 90d, 1y" }, { status: 400 });
  }
  try {
    const today = todayInIndia();
    const history = await getHistory(range, today);
    return Response.json(history, {
      headers: { "cache-control": "public, max-age=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error(`Failed to load ${range} gold history`, error);
    return Response.json({ error: "Gold price history is unavailable" }, { status: 502 });
  }
}
