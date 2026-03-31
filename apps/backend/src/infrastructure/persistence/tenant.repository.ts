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
 * @module backend/infrastructure/persistence/tenant.repository
 */

import type { ITenantRepository } from "../../domain/identity/tenant-repository.interface.js";
import type { Tenant } from "../../domain/identity/types.js";
import { TenantModel } from "./models/tenant.model.js";

/**
 * Toes tenant.
 * @param doc - The doc input.
 * @returns The tenant result.
 */

function toTenant(doc: {
  tenantId: string;
  ownerId: unknown;
  name?: string;
}): Tenant {
  return {
    tenantId: doc.tenantId,
    ownerId: String(doc.ownerId),
    name: doc.name,
  };
}

/**
 * Represents a mongo tenant repository.
 */

export class MongoTenantRepository implements ITenantRepository {
  /**
   * Finds by owner.
   * @param ownerId - The owner ID input.
   * @returns The by owner result.
   */

  async findByOwner(ownerId: string): Promise<Tenant[]> {
    const docs = await TenantModel.find({ ownerId })
      .select("tenantId ownerId name")
      .lean();
    return docs.map((doc) => toTenant(doc));
  }

  /**
   * Finds by tenant ID.
   * @param tenantId - The tenant ID input.
   * @returns The by tenant ID result.
   */

  async findByTenantId(tenantId: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ tenantId })
      .select("tenantId ownerId name")
      .lean();
    return doc ? toTenant(doc) : null;
  }

  /**
   * Creates the requested result.
   * @param data - The data input.
   * @returns The operation result.
   */

  async create(data: {
    tenantId: string;
    ownerId: string;
    name?: string;
  }): Promise<Tenant> {
    const created = await TenantModel.create({
      tenantId: data.tenantId,
      ownerId: data.ownerId,
      name: data.name,
    });

    return {
      tenantId: created.tenantId,
      ownerId: String(created.ownerId),
      name: created.name,
    };
  }

  /**
   * Deletes by tenant ID.
   * @param tenantId - The tenant ID input.
   * @param ownerId - The owner ID input.
   * @returns The by tenant ID result.
   */

  async deleteByTenantId(tenantId: string, ownerId: string): Promise<boolean> {
    const result = await TenantModel.deleteOne({ tenantId, ownerId });
    return result.deletedCount > 0;
  }

  /**
   * Finds owned tenant ids.
   * @param ownerId - The owner ID input.
   * @returns The owned tenant ids result.
   */

  async findOwnedTenantIds(ownerId: string): Promise<string[]> {
    const docs = await TenantModel.find({ ownerId })
      .select("tenantId")
      .lean<{ tenantId: string }[]>();
    return docs.map((doc) => doc.tenantId);
  }
}
