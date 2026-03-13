/**
 * @module backend/domain/identity/tenant-repository.interface
 */

import type { Tenant } from "./types.js";

export interface ITenantRepository {
  findByOwner(ownerId: string): Promise<Tenant[]>;
  findByTenantId(tenantId: string): Promise<Tenant | null>;
  create(data: {
    tenantId: string;
    ownerId: string;
    name?: string;
  }): Promise<Tenant>;
  deleteByTenantId(tenantId: string, ownerId: string): Promise<boolean>;
  findOwnedTenantIds(ownerId: string): Promise<string[]>;
}
