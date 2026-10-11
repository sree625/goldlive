# Goldlive

Live Kerala gold rates (22K, 18K, 14K) in INR, per gram and per pavan, as an installable Progressive Web App.

Built with Next.js 16 (App Router, Cache Components), TanStack Query, Tailwind CSS v4 and Recharts.

## Features

- **Live price**: polls every 30 seconds while the app is on screen, and refreshes on focus and reconnect.
- **Kerala rate**: tracks the AKGSMA board rate from the live international spot price (see below).
- **Per 1 g, 8 g (pavan) or 10 g**, with change vs yesterday for each karat.
- **Chart** for 7D / 30D / 90D / 1Y with high, low, average and change.
- **Price history table** for the last 7, 14 or 30 days.
- **Installable PWA**: manifest, icons, and a service worker that keeps the last prices available offline.

## Data sources (free, no API key)

| What | Source | Refresh |
| --- | --- | --- |
| Real-time spot (USD/oz) | [gold-api.com](https://gold-api.com) | live |
| USD → INR | [open.er-api.com](https://www.exchangerate-api.com/docs/free) | daily |
| Daily XAU → INR history, and fallback | [fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) | daily |

The browser only talks to this app's own `/api/gold/*` routes. The server calls the upstreams and caches
results with `"use cache"` (live quote 15 s, history 1 h, past days forever), so many users share one
upstream request.

### How the Kerala rate is worked out

Kerala's official rate is the board rate the All Kerala Gold and Silver Merchants Association (AKGSMA) sets
each morning. AKGSMA publishes no API, so the app estimates it from the live spot price:

```
fine ₹/g  = spot USD/oz × USDINR ÷ 31.1035 × (1 + KERALA_PREMIUM_PCT / 100)
22K ₹/g   = fine × 22/24, rounded to ₹5 (the board's step)
18K, 14K, 24K = 22K × 18/22, 14/22, 24/22
```

The premium (15.9% by default) covers import duty, bank charges and the local market premium. It was
calibrated on 10 Oct 2026, when the AKGSMA 22K rate was ₹13,880/g. Because the estimate follows the live
spot price it moves during the day, while the board usually changes once or twice a day, so expect it to
sit within about 1% of the board rate. If it drifts, set `KERALA_PREMIUM_PCT` to
`(board 22K ÷ (spot ₹/g × 22/24) − 1) × 100`. Rates exclude 3% GST, making charges and HUID.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional environment variables (see `.env.example`):

- `KERALA_PREMIUM_PCT` – how far the Kerala board rate sits above spot, in percent. Default `15.9`.

## Scripts

```bash
npm run build      # production build
npm start          # serve the build (service worker registers in production only)
npm run lint
npm run typecheck
npm test           # unit tests (Vitest)
```

## Installing on a phone

Deploy (for example to Vercel) so it is served over HTTPS, then open the site on your phone:

- **Android (Chrome)**: tap **Install app** in the header, or menu → *Install app*.
- **iPhone (Safari)**: tap **Install app** for instructions, or Share → *Add to Home Screen*.

## Project structure

```
src/
  app/
    api/gold/latest/route.ts    live quote endpoint
    api/gold/history/route.ts   ?range=7d|30d|90d|1y
    manifest.ts                 PWA manifest
    providers.tsx               TanStack Query client
  components/dashboard/         cards, chart, history table
  components/pwa/               service worker registration, install button
  hooks/                        query options and hooks
  lib/gold/                     constants, pure calculations, upstream sources, cached service
public/sw.js                    service worker
```
