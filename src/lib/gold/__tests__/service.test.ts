import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const BOARD_PAGE = `<table>
<tr><td>Oct 11, 2026</td><td>&#8377;15,142 (0)</td><td>&#8377;13,880 (0)</td></tr>
<tr><td>Oct 10, 2026</td><td>&#8377;15,142 (+71)</td><td>&#8377;13,880 (+65)</td></tr>
<tr><td>Oct 09, 2026</td><td>&#8377;15,071 (+114)</td><td>&#8377;13,815 (+105)</td></tr>
</table>`;

// Spot that the default premium turns into a 22K estimate of about ₹13,880.
const SPOT = { price: 4195.6, updatedAt: "2026-10-11T11:50:07Z" };
const FX = { result: "success", rates: { INR: 96.867192 } };

function mockFetch(routes: { board?: string | null; spot?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const ok = (body: unknown, text = false) =>
        new Response(text ? (body as string) : JSON.stringify(body), { status: 200 });
      if (url.includes("goodreturns")) {
        return routes.board == null ? new Response("blocked", { status: 403 }) : ok(routes.board, true);
      }
      if (url.includes("gold-api.com")) {
        return routes.spot === false ? new Response("down", { status: 503 }) : ok(SPOT);
      }
      if (url.includes("er-api.com")) return ok(FX);
      const date = url.match(/currency-api@([\d-]+|latest)|\/\/([\d-]+|latest)\.currency-api/)!;
      return ok({ date: date[1] ?? date[2], xau: { inr: 4195.6 * 96.867192 } });
    }),
  );
}

async function loadService() {
  vi.resetModules();
  return import("../service");
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("getLiveQuote", () => {
  it("uses today's AKGSMA board rate when the page has one", async () => {
    mockFetch({ board: BOARD_PAGE });
    const { getLiveQuote } = await loadService();
    const quote = await getLiveQuote("2026-10-11");
    expect(quote.basis).toBe("board");
    expect(quote.boardDate).toBe("2026-10-11");
    expect(quote.rates["22K"]).toBe(13_880);
    expect(quote.rates["18K"]).toBe(11_356);
  });

  it("falls back to the spot estimate when the page is blocked", async () => {
    mockFetch({ board: null });
    const { getLiveQuote } = await loadService();
    const quote = await getLiveQuote("2026-10-11");
    expect(quote.basis).toBe("estimate");
    expect(quote.rates["22K"]).toBe(13_880);
  });

  it("ignores a board rate older than three days", async () => {
    mockFetch({ board: BOARD_PAGE });
    const { getLiveQuote } = await loadService();
    expect((await getLiveQuote("2026-10-20")).basis).toBe("estimate");
  });

  it("still shows the board rate when the spot feeds are down", async () => {
    mockFetch({ board: BOARD_PAGE, spot: false });
    const { getLiveQuote } = await loadService();
    const quote = await getLiveQuote("2026-10-11");
    expect(quote.basis).toBe("board");
    expect(quote.rates["22K"]).toBe(13_880);
  });
});

describe("getHistory", () => {
  it("uses board rates for the days the page covers and estimates before that", async () => {
    mockFetch({ board: BOARD_PAGE });
    const { getHistory } = await loadService();
    const history = await getHistory("7d", "2026-10-11");
    expect(history.points.map((p) => p.date)).toEqual([
      "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10",
    ]);
    const byDate = Object.fromEntries(history.points.map((p) => [p.date, p]));
    expect(byDate["2026-10-09"]).toMatchObject({ basis: "board", rates: { "22K": 13_815 } });
    expect(byDate["2026-10-08"].basis).toBe("estimate");
  });
});
