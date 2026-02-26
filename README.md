# ByteRoute

[![Release](https://github.com/ste-script/byteroute/actions/workflows/release.yml/badge.svg)](https://github.com/ste-script/byteroute/actions/workflows/release.yml)
![Codecov](https://img.shields.io/codecov/c/github/ste-script/byteroute)
[![Version](https://img.shields.io/github/v/release/ste-script/byteroute)](https://github.com/ste-script/byteroute/releases)

**University Project for SPE (Software Performance Engineering) and ASW (Architetture Software per il Web)**

## Project Overview

The proposal focuses on the development of a network traffic monitoring platform called ByteRoute, which aims to provide users with real-time visibility into their internet traffic destinations, allowing them to identify which servers and services their computer connects to.

## Project Description

The project consists of a system composed of:

- **A lightweight Linux client** written in Go that captures network packets, extracts destination IPs, deduplicates them, and sends batches of connections to the backend
- **A Node.js/Express backend** that receives connections, performs enrichment (GeoIP lookup), stores data in MongoDB, and broadcasts updates in real-time via Socket.IO
- **A Vue.js dashboard** that displays a world map with traffic flows, live connection list, statistics by ASN/country, and time-based charts

## Technology Stack

- **Traffic Interceptor**: Go + libpcap
- **Backend**: Node.js + Express.js + Socket.IO
- **Database**: MongoDB
- **Frontend**: Vue.js 3 + Vite
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Releases

This repo uses `semantic-release` to generate GitHub Releases and (via `@semantic-release/git`) commit release artifacts (changelog + workspace version bumps).

## Coverage

CI generates backend and Go client coverage and publishes a Markdown summary using the GitHub Marketplace action [`irongut/CodeCoverageSummary`](https://github.com/marketplace/actions/code-coverage-summary).

- Workflow: [Build & Test CI](https://github.com/ste-script/byteroute/actions/workflows/build-and-test.yml)
- Summary location: GitHub Actions job summary (`Code Coverage Summary` step output)
- Artifact: `coverage-reports` (includes HTML report + `code-coverage-results.md`) and `coverage-go` (includes `coverage.out` + Cobertura XML)

## Quickstart (Docker Compose)

This starts a production-like stack using prebuilt images (backend + dashboard) behind Traefik.

### Prerequisites

- Docker + Docker Compose
- A MaxMind account (required: the backend container downloads GeoLite2 databases on startup)

### Run

1) Create a `.env` file in the repo root (see [.env.example](.env.example)) and set:

- `MAXMIND_USER_ID`
- `MAXMIND_API_KEY`
- `JWT_SECRET`

2) Start the stack:

```bash
docker compose up -d
```

3) Open the dashboard:

- UI: `http://localhost:8080` (or `http://localhost:${TRAEFIK_PORT}`)
- Backend health: `http://localhost:8080/health`

### Authenticate and create a tenant

The backend uses bearer auth for `/api/*`, and ingested connections/metrics are stored per-tenant.

Option A (UI): open the dashboard, register/login, create a tenant, then copy a client token from the header.

Option B (API):

1) Sign up (or sign in) and save the returned `token` as `AUTH_TOKEN`:

```bash
curl -sS -X POST http://localhost:8080/auth/signup \
	-H 'content-type: application/json' \
	-d '{"name":"Demo","email":"demo@byteroute.dev","password":"change-me-please"}'
```

2) Create a tenant:

```bash
curl -sS -X POST http://localhost:8080/api/tenants \
	-H 'content-type: application/json' \
	-H "authorization: Bearer $AUTH_TOKEN" \
	-d '{"name":"My Laptop"}'
```

3) Create a client token for the Go client:

```bash
curl -sS -X POST http://localhost:8080/auth/client-token \
	-H "authorization: Bearer $AUTH_TOKEN"
```

### Send data (Linux client)

Build and run the Go client (from source):

```bash
cd apps/client-go
go build -o byteroute-client ./cmd/byteroute-client
sudo ./byteroute-client --iface eth0 --backend http://localhost:8080 --flush 5s
```

Note: in a default setup the backend requires authentication for ingestion endpoints.
Pass the client token obtained from `/auth/client-token`:

```bash
sudo ./byteroute-client --iface eth0 --backend http://localhost:8080 --auth-token "$BYTEROUTE_AUTH_TOKEN" --flush 5s
```

Or pull and run the latest Docker image (Linux only; uses host networking + packet-capture capabilities):

```bash
docker pull ghcr.io/ste-script/byteroute-client:latest
docker run --rm --net=host \
	--cap-add=NET_ADMIN --cap-add=NET_RAW \
	ghcr.io/ste-script/byteroute-client:latest \
	--iface eth0 --backend http://localhost:8080 --flush 5s
```

If your backend requires auth (default), pass the client token as well:

```bash
docker run --rm --net=host \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  ghcr.io/ste-script/byteroute-client:latest \
  --iface eth0 --backend http://localhost:8080 --auth-token "$BYTEROUTE_AUTH_TOKEN" --flush 5s
```

Troubleshooting: if the client logs `x509: certificate signed by unknown authority`, you’re likely running an older image that didn’t include system CA certificates. Workaround:

```bash
docker run --rm --net=host \
	--cap-add=NET_ADMIN --cap-add=NET_RAW \
	-v /etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro \
	ghcr.io/ste-script/byteroute-client:latest \
	--iface eth0 --backend https://your-host --flush 5s
```

If you’re running this from a fork, replace `ste-script` with your GitHub org/user.

See [apps/client-go/README.md](apps/client-go/README.md) for flags and capabilities.

## Development (from source)

### Prerequisites

- Node.js (see `engines.node` in [package.json](package.json))
- `pnpm` (the repo is pinned via `packageManager`)
- MongoDB (in the Dev Container it is provided automatically)

### Run

```bash
pnpm install
pnpm dev
```

Defaults:

- Dashboard dev server: `http://localhost:3000`
- Backend: `http://localhost:4000` (dashboard proxies `/api` and `/socket.io` to it)

### Environment variables

- Backend:
	- `MONGODB_URI` (default: `mongodb://mongodb:27017/byteroute`)
	- `PORT` (default: `4000`)
	- `CONNECTIONS_BOOTSTRAP_LIMIT` (default: `500`)
	- `STATS_EMIT_INTERVAL` (default: `30000` ms)
	- MaxMind credentials are only required for downloading/updating GeoLite2 databases:
		- `MAXMIND_USER_ID`
		- `MAXMIND_API_KEY`

- Dashboard:
	- `VITE_SOCKET_URL` (optional; default connects to same origin)
