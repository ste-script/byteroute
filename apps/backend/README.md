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
- `DOMAIN_DSL_PATH` (optional; explicit path to a YAML domain DSL file — see [Domain DSL (YAML)](#domain-dsl-yaml) for the full resolution order)

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
Client tokens also include a primary `tenantId` claim alongside `tenantIds` so the Go client can send `X-Tenant-Id` automatically during ingestion.
`POST /auth/client-token` accepts an optional JSON body like `{ "tenantId": "my-tenant" }` and will scope the primary `tenantId` claim to that tenant if the authenticated user has access to it.

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
- `pnpm -F @byteroute/backend seed` (wipe DB and create baseline users)

## Domain DSL (YAML)

The backend compiles a domain DSL at startup and applies it during request processing:

- `ingestion.connection` rules are applied before enrichment/storage
- `analytics.queries` rules shape sorting/limiting of statistics groups

Default file: `apps/backend/config/domain.dsl.yaml` (bundled in the Docker image).

### Passing a custom DSL to the container

The container resolves the DSL file using the following priority order:

1. `DOMAIN_DSL_PATH` env var — explicit path inside the container
2. `/etc/byteroute/domain.dsl.yaml` — well-known volume mount point
3. `config/domain.dsl.yaml` — relative to the working directory
4. `apps/backend/config/domain.dsl.yaml` — fallback for the bundled default

**Recommended: volume mount to the well-known path**

```bash
docker run \
  -v /path/to/your/domain.dsl.yaml:/etc/byteroute/domain.dsl.yaml:ro \
  -e MAXMIND_USER_ID=... -e MAXMIND_API_KEY=... -e JWT_SECRET=... \
  ghcr.io/ste-script/byteroute-backend:latest
```

**Or use `DOMAIN_DSL_PATH` to point to any path you mounted**

```bash
docker run \
  -v /path/to/your/domain.dsl.yaml:/config/my-domain.dsl.yaml:ro \
  -e DOMAIN_DSL_PATH=/config/my-domain.dsl.yaml \
  -e MAXMIND_USER_ID=... -e MAXMIND_API_KEY=... -e JWT_SECRET=... \
  ghcr.io/ste-script/byteroute-backend:latest
```

In `docker-compose.yml` uncomment the `volumes` entry under the `backend` service:

```yaml
volumes:
  - ./domain.dsl.yaml:/etc/byteroute/domain.dsl.yaml:ro
```

The entrypoint will log which DSL file is being loaded (or warn if `DOMAIN_DSL_PATH` points to a missing file). If no custom file is found the bundled defaults are used without error.

