---
description: "Use when editing the ByteRoute Go client, including packet capture, flow aggregation, backend posting, CLI/config parsing, metrics, or Docker build behavior. Covers Linux-specific constraints, libpcap, and native versus Docker build parity."
name: "ByteRoute Go Client"
applyTo: "apps/client-go/**/*.go, apps/client-go/Dockerfile.static"
---

# Go Client Guidelines

- Treat the Go client as Linux-only packet-capture software. Changes that affect capture startup, interfaces, or runtime assumptions should preserve the current dependency on libpcap and the documented Linux execution model.
- Keep the current package boundaries intact: CLI orchestration in `cmd/byteroute-client`, backend transport in `internal/backend`, capture primitives in `internal/capture`, config parsing in `internal/config`, flow aggregation in `internal/flow`, and time-series tracking in `internal/metrics`.
- Preserve parity between the native Go build and the static Docker build in `Dockerfile.static`. If a change adds a runtime dependency, build flag, CA requirement, or CGO/libpcap constraint, verify both paths still work.
- Maintain compatibility with the backend ingestion contract. Changes to posted connections, metrics snapshots, auth token handling, or payload sizing should be checked against the backend API expectations.
- Prefer extending the existing flush, retry, and backoff flow in `cmd/byteroute-client/main.go` rather than introducing a separate execution path for exports or metrics.

## Validation

- Prefer targeted commands such as `pnpm -F @byteroute/client-go build`, `pnpm -F @byteroute/client-go test`, and `pnpm -F @byteroute/client-go coverage`.
- Remember that native builds and tests require Go 1.26.x and `libpcap-dev` in the environment.
- When changing packaging or CGO behavior, also verify the Docker build path with `pnpm -F @byteroute/client-go build:docker` or the equivalent `docker build -f Dockerfile.static ...` flow used by CI.
- Keep tests focused on package behavior and CLI/config outcomes. Prefer small package tests over end-to-end shell orchestration unless the task specifically requires integration coverage.

## Working Notes

- Packet capture commonly requires root or `cap_net_raw` and `cap_net_admin`. Avoid changes that silently assume unprivileged capture will work.
- `--flush` is the preferred interval flag; `--flow` is a legacy alias and should not become the primary interface again.
- The runtime image is `scratch` and relies on copied CA certificates. Be careful when changing HTTP, TLS, or certificate behavior so HTTPS posting still works in containers.
- Keep payload-size, dedupe, and batching behavior consistent with the client’s role as a bounded exporter to the backend rather than an unbounded in-memory queue.