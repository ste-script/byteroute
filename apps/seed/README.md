# @byteroute/seed

Database seeding utility for ByteRoute.

## Warning

This script drops the entire database configured by `MONGODB_URI`.

## Requirements

- MongoDB
- `MONGODB_URI` set (or reachable default from `@byteroute/shared`)

## Run

From repo root:

```bash
pnpm install
pnpm seed
```

This runs `tsx src/index.ts` and seeds a minimal dataset.
