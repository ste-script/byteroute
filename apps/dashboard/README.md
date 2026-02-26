# @byteroute/dashboard

Vue 3 dashboard for ByteRoute.

- Live world map of traffic flows
- Live connections list
- Statistics panels and charts
- Multi-tenant selection

## Requirements

- Node.js (see root `package.json`)
- A running backend (default: `http://localhost:4000`)

## Run (development)

From repo root:

```bash
pnpm install
pnpm -F @byteroute/dashboard dev
```

Defaults:

- Dashboard: `http://localhost:3000`
- The dev server proxies `/api`, `/auth`, and `/socket.io` to `http://localhost:4000` (see `vite.config.ts`).

## Environment variables

- `VITE_SOCKET_URL` (optional)
  - If unset, the app connects to the same origin (works with the dev proxy and with Docker Compose behind Traefik).
  - If set, it should point to the backend origin (e.g. `http://localhost:4000`).

See [apps/dashboard/.env.example](apps/dashboard/.env.example).

## Build

```bash
pnpm -F @byteroute/dashboard build
```
