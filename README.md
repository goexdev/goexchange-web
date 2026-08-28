# goexchange-web

Trading platform front-end for [goexchange](https://github.com/goexdev/goexchange).

This repository holds the standalone React + Vite front-end. The API
and matching engine live in separate repositories:

- **API** (Go): https://github.com/goexdev/goexchange
- **Matching engine** (private): not visible to the public

The web app talks to the API at `/api` (HTTP) and `/ws` (WebSocket).
In local development `vite.config.ts` proxies both to
`http://localhost:8099`.

## Quick start (local dev)

```bash
cp .env.example .env          # configure VITE_DOMAIN, API origins
npm install
npm run dev                   # http://localhost:3000
```

## Build for production

```bash
npm run build                 # writes dist/
npm run preview               # serves dist/ for smoke-testing
```

## Tests

```bash
npm run lint                  # eslint
npm run test                  # vitest unit tests
npm run test:e2e              # playwright end-to-end (requires API + matching up)
```

## Layout

```
src/
  components/     shared widgets (Header, DepthChart, OrderPanel, ...)
  pages/          one file per route
  lib/            api client, auth, i18n, hooks
  test/           vitest mocks / setup
e2e/             playwright suites + screenshots
public/          static assets (favicon, robots.txt, sitemap)
```

## Configuration

All env vars are baked at build time by Vite (must start with `VITE_`).
See `.env.example` for the full list. Never commit a real `.env`.

## Related repositories

- `github.com/goexdev/goexchange` — the public API + scheduler
- `github.com/goexdev/goexchange-core` — the matching engine (private)

This repository's `git`/` hooks` mirror the privacy policy used by
`goexdev/goexchange`: see `.githooks/banned-strings.conf` for the list
of tokens that must never appear in tracked files.