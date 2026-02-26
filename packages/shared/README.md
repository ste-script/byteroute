# @byteroute/shared

Shared code (types, utilities, and database models) for ByteRoute.

Currently includes Mongoose schemas/models intended to be reused by apps like `@byteroute/backend` and `@byteroute/seed`.

## Exports

- `@byteroute/shared`
	- Mongo helpers: `connectMongo`, `disconnectMongo`, `mongoose`
	- Models: `UserModel`, `TenantModel`, `ConnectionModel`
	- Shared types used across apps

- `@byteroute/shared/common`
	- Tenant helpers (e.g. `resolveTenantIdFromRequest`, `userHasTenantAccess`)
