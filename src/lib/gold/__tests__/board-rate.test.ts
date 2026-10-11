import { describe, expect, it } from "vitest";
import { htmlToText, parseBoardRates, pickBoardRates } from "../board-rate";

const pick = (html: string, near: number) => pickBoardRates(parseBoardRates(html), () => near);

// Shaped like the Goodreturns Kerala page: a per-gram table, a per-10 g table and the 10-day table.
const PAGE = `
<html><head><script>var x = "Oct 01, 2026 ₹1 ₹1";</script></head><body>
<h2>Today 22 Carat Gold Rate Per Gram in Kerala (INR)</h2>
<table><tr><td>1</td><td>&#x20b9;13,880</td></tr><tr><td>10</td><td>&#x20b9;1,38,800</td></tr></table>
<h2>Gold Rate in Kerala for Last 10 Days (10 gram)</h2>
<table>
  <tr><th>Date</th><th>24K</th><th>22K</th></tr>
  <tr><td>Oct 11, 2026</td><td>&#8377;1,51,420 <span>(0)</span></td><td>&#8377;1,38,800 <span>(0)</span></td></tr>
</table>
<h2>Gold Rate in Kerala for Last 10 Days (1 gram)</h2>
<table>
  <tr><th>Date</th><th>24K</th><th>22K</th></tr>
  <tr><td>Oct 11, 2026</td><td>&#8377;15,142 <span class="green">(0)</span></td><td>&#8377;13,880 <span>(0)</span></td></tr>
  <tr><td>Oct 10, 2026</td><td>&#8377;15,142 <span>(+71)</span></td><td>&#8377;13,880 <span>(+65)</span></td></tr>
  <tr><td>Oct 09, 2026</td><td>&#8377;15,071 <span>(+114)</span></td><td>&#8377;13,815 <span>(+105)</span></td></tr>
  <tr><td>Oct 08, 2026</td><td>&#8377;14,957 <span>(-0)</span></td><td>&#8377;13,710 <span>(0)</span></td></tr>
</table>
<p>Silver: Oct 11, 2026 ₹190 (0) ₹1,900 (0)</p>
</body></html>`;

describe("htmlToText", () => {
  it("drops tags and scripts and decodes the rupee sign", () => {
    expect(htmlToText("<script>x</script><td>&#8377;13,880</td>")).toBe(" ₹13,880 ");
  });
});

describe("parseBoardRates", () => {
  it("reads the 22K board rate per date, oldest first", () => {
    expect(pick(PAGE, 13_800)).toEqual([
      { date: "2026-10-08", rate22k: 13_710 },
      { date: "2026-10-09", rate22k: 13_815 },
      { date: "2026-10-10", rate22k: 13_880 },
      { date: "2026-10-11", rate22k: 13_880 },
    ]);
  });

  it("skips per-10 g rows that don't match the expected per-gram price", () => {
    const rates = pick(PAGE, 13_800);
    expect(rates.find((r) => r.date === "2026-10-11")?.rate22k).toBe(13_880);
  });

  it("reads the markdown-style text form of the table too", () => {
    const text = "| Oct 10, 2026 | ₹15,142    (+71)  | ₹13,880    (+65)  |";
    expect(parseBoardRates(text)).toEqual([{ date: "2026-10-10", rate22k: 13_880 }]);
  });

  it("lists every row in page order, including other tables", () => {
    expect(parseBoardRates(PAGE)[0]).toEqual({ date: "2026-10-11", rate22k: 138_800 });
  });

  it("returns nothing for a page without the table", () => {
    expect(parseBoardRates("<html><body>Access denied</body></html>")).toEqual([]);
  });

  it("drops everything when the page disagrees wildly with the market", () => {
    expect(pick(PAGE, 9_000)).toEqual([]);
  });
});
