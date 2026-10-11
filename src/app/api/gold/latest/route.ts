import { connection } from "next/server";
import { getLiveQuote } from "@/lib/gold/service";

export async function GET() {
  // Always answer at request time; the quote itself is cached briefly in getLiveQuote.
  await connection();
  try {
    const quote = await getLiveQuote();
    return Response.json(quote, {
      headers: { "cache-control": "public, max-age=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Failed to load live gold quote", error);
    return Response.json({ error: "Gold price feed is unavailable" }, { status: 502 });
  }
}
