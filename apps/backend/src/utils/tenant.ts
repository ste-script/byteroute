import { ensureTenantId, getTenantRoom } from "@byteroute/shared/common";

export * from "@byteroute/shared/common";

export const TENANT_FEATURE_ROOMS = ["connections", "statistics", "flows"] as const;
export type TenantFeatureRoom = (typeof TENANT_FEATURE_ROOMS)[number];

export function isTenantFeatureRoom(value: unknown): value is TenantFeatureRoom {
	return typeof value === "string" && (TENANT_FEATURE_ROOMS as readonly string[]).includes(value);
}

export function getTenantScopedRoom(tenantId: string, room: TenantFeatureRoom): string {
	const resolvedTenantId = ensureTenantId(tenantId);
	return `${getTenantRoom(resolvedTenantId)}:${room}`;
}
