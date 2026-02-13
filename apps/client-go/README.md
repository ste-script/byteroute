# @byteroute/client-go

A lightweight Linux client (Go + libpcap) that captures network packets, aggregates them into connection-like records, deduplicates them, and posts batches to the backend for GeoLite2 enrichment.

## Requirements

- Linux
- Go (>= 1.26)
- libpcap headers (for gopacket/pcap): `libpcap-dev`

## Build

From repo root:

```bash
cd apps/client-go
go mod tidy
go build -o byteroute-client ./cmd/byteroute-client
```

## Permissions

Packet capture typically requires elevated privileges.

- Run as root: `sudo ./byteroute-client ...`
- Or grant capabilities:

```bash
sudo setcap cap_net_raw,cap_net_admin=eip ./byteroute-client
```

## Run

```bash
./byteroute-client \
	--iface eth0 \
	--backend http://localhost:4000 \
	--flush 5s
```

Note: `--flow` is a legacy alias for `--flush`. It accepts either a duration (`5s`) or integer seconds (`5`). Prefer `--flush`.

List interfaces:

```bash
./byteroute-client --list-ifaces
```

### Useful flags

- `--iface` (required): capture interface
- `--direction`: `out` (default), `in`, or `both` (affects the generated default BPF)
- `--bpf`: BPF filter; if omitted, a default is generated based on `--direction` and local IPv4s
- `--reporter-ip`: optional public/WAN IP for this sensor; lets backend geo-locate private source networks
- `--dedupe`: `flow` (5-tuple) or `ip` (dedupe by src/dst IP)
- `--max-batch-conns`: max records per request
- `--max-batch-bytes`: max JSON payload bytes per request (backend uses 2mb limit)
- `--idle-ttl`: drop flows that have been idle
- `--flush`: how often to post updates
- `--flow`: legacy alias for `--flush`

### Env vars

- `BYTEROUTE_BACKEND_URL`
- `BYTEROUTE_IFACE`
- `BYTEROUTE_BPF`
- `BYTEROUTE_REPORTER_IP`
- `BYTEROUTE_HOST_ID`

## Payload

The client posts to `POST /api/connections` with JSON:

```json
{ "reporterIp": "203.0.113.10", "connections": [ { "id": "...", "sourceIp": "...", "destIp": "..." } ] }
```

The backend enriches using GeoLite2 and upserts connections.
