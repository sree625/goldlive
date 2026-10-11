import { connection } from "next/server";
import { todayInIndia } from "@/lib/format";
import { getLiveQuote } from "@/lib/gold/service";

export async function GET() {
  // Always answer at request time; upstream prices are cached briefly in the service.
  await connection();
  try {
    const quote = await getLiveQuote(todayInIndia());
    return Response.json(quote, {
      headers: { "cache-control": "public, max-age=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Failed to load live gold quote", error);
    return Response.json({ error: "Gold price feed is unavailable" }, { status: 502 });
  }
}
