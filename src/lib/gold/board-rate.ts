/**
 * Reads the Kerala (AKGSMA) board rate from a published "last 10 days" table,
 * whose rows read like "Oct 10, 2026 | ₹15,142 (+71) | ₹13,880 (+65)" (date, 24K, 22K).
 *
 * The source is a news page, not an API, so the parser works on the page's
 * text rather than its markup, and every row is sanity-checked. Anything that
 * doesn't look like a Kerala rate is dropped, and the caller falls back to the
 * spot-price estimate.
 */

export interface BoardRate {
  /** YYYY-MM-DD */
  date: string;
  /** AKGSMA 22K rate, INR per gram. */
  rate22k: number;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&#8377;": "₹",
  "&#x20b9;": "₹",
  "&#x20B9;": "₹",
  "&rupee;": "₹",
};

/** Collapses an HTML page into plain text so table cells sit side by side. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#\w]+;/g, (entity) => ENTITIES[entity] ?? " ")
    .replace(/\s+/g, " ");
}

const AMOUNT = String.raw`(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s*(?:\(\s*[-+]?\s*[\d,.]*\s*\))?`;
const ROW = new RegExp(
  String.raw`\b([A-Z][a-z]{2})[a-z]*\.? (\d{1,2}),? (\d{4})\s*\|?\s*` + AMOUNT + String.raw`\s*\|?\s*` + AMOUNT,
  "g",
);

function toNumber(text: string): number {
  return Number(text.replace(/,/g, ""));
}

/** Every rate row on the page, in page order. A date can appear in more than one table. */
export function parseBoardRates(html: string): BoardRate[] {
  const text = htmlToText(html);
  const rows: BoardRate[] = [];
  for (const match of text.matchAll(ROW)) {
    const [, mon, day, year, rate24k, rate22k] = match;
    const month = MONTHS[mon.toLowerCase()];
    if (!month) continue;
    const r24 = toNumber(rate24k);
    const r22 = toNumber(rate22k);
    // A real row has 22K at 22/24 of 24K; anything else is some other table on the page.
    if (!(r22 > 0) || Math.abs(r22 / r24 - 22 / 24) > 0.01) continue;
    rows.push({ date: `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`, rate22k: r22 });
  }
  return rows;
}

/**
 * One board rate per date, oldest first, keeping only rows within `tolerance`
 * of the expected 22K price for that date. That drops misread tables (another
 * city, per-10 g prices, a stale cache) before they can reach the app.
 */
export function pickBoardRates(
  rows: BoardRate[],
  expected22k: (date: string) => number | undefined,
  tolerance = 0.1,
): BoardRate[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (byDate.has(row.date)) continue;
    const expected = expected22k(row.date);
    if (expected === undefined || Math.abs(row.rate22k / expected - 1) > tolerance) continue;
    byDate.set(row.date, row.rate22k);
  }
  return [...byDate]
    .map(([date, rate22k]) => ({ date, rate22k }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
