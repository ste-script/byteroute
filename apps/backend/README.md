# @byteroute/backend

Node.js (Express) backend for ByteRoute.

- Receives connections and metrics from producers (Go client)
- Enriches destinations with GeoIP (MaxMind GeoLite2)
- Stores data in MongoDB
- Broadcasts live updates via Socket.IO

## Requirements

- Node.js (see root `package.json` for the supported version)
- MongoDB

## Environment variables

Required:

- `MONGODB_URI` (default: `mongodb://mongodb:27017/byteroute`)
- `JWT_SECRET` (required for bearer auth)

Optional:

- `PORT` (default: `4000` in dev; Docker images often use `3000`)
- `MAXMIND_USER_ID`, `MAXMIND_API_KEY` (required only to download/update GeoLite2 DBs)
- `CONNECTIONS_BOOTSTRAP_LIMIT` (default: `500`)
- `STATS_EMIT_INTERVAL` (default: `30000` ms)
- `AUTH_TOKEN_TTL` (default: `1d`)
- `AUTH_CLIENT_TOKEN_TTL` (default: `12h`)

See [apps/backend/.env.example](apps/backend/.env.example) for a starter file.

## Run (development)

From repo root:

```bash
pnpm install
pnpm -F @byteroute/backend dev
```

- API base: `http://localhost:4000`
- Health: `GET /health`

## Authentication

The backend uses bearer authentication for all `/api/*` endpoints.

- `POST /auth/signup` → `{ token, user }`
- `POST /auth/signin` → `{ token, user }`
- `GET /auth/me` (auth) → current user
- `POST /auth/client-token` (auth) → token for the Go client

Pass the token in `Authorization: Bearer <token>`.

## Tenants

Connections and metrics are stored per-tenant.

- `GET /api/tenants` (auth) → `{ tenants: string[] }`
- `POST /api/tenants` (auth) → creates a tenant owned by the current user

Tenant resolution:

- Header: `X-Tenant-Id: <tenantId>`
- Or query: `?tenantId=<tenantId>`
- Otherwise: falls back to your first owned tenant (and ultimately `default`)

## Ingestion endpoints

- `POST /api/connections` (auth) → accepts `{ connections: [...] }`, responds `202`
- `POST /api/metrics` (auth) → accepts `{ snapshots: [...] }`, responds `202`

## Scripts

- `pnpm -F @byteroute/backend test` (unit + e2e)
- `pnpm -F @byteroute/backend update:maxmind` (download GeoLite2 DBs)
- `pnpm -F @byteroute/backend migrate:indexes` (ensure DB indexes)
