/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module backend/utils/tenant
 */

import { ensureTenantId, getTenantRoom } from "@byteroute/shared/common";

export * from "@byteroute/shared/common";

export const TENANT_FEATURE_ROOMS = [
  "connections",
  "statistics",
  "flows",
] as const;
export type TenantFeatureRoom = (typeof TENANT_FEATURE_ROOMS)[number];

/**
 * Checks whether tenant feature room is satisfied.
 * @param value - The value input.
 * @returns True when tenant feature room is satisfied.
 */

export function isTenantFeatureRoom(
  value: unknown,
): value is TenantFeatureRoom {
  return (
    typeof value === "string" &&
    (TENANT_FEATURE_ROOMS as readonly string[]).includes(value)
  );
}

/**
 * Gets tenant scoped room.
 * @param tenantId - The tenant ID input.
 * @param room - The room input.
 * @returns The tenant scoped room.
 */

export function getTenantScopedRoom(
  tenantId: string,
  room: TenantFeatureRoom,
): string {
  const resolvedTenantId = ensureTenantId(tenantId);
  return `${getTenantRoom(resolvedTenantId)}:${room}`;
}
