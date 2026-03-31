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
 * @module backend/services/tenant.service
 */

import type { ITenantRepository } from "../domain/identity/tenant-repository.interface.js";

/**
 * Represents a tenant service.
 */

export class TenantService {
  /**
   * Creates a tenant service.
   * @param tenantRepository - The tenant repository input.
   */

  constructor(private readonly tenantRepository: ITenantRepository) {}

  /**
   * Lists the requested result.
   * @param ownerId - The owner ID input.
   * @returns The operation result.
   */

  async list(ownerId: string): Promise<string[]> {
    const docs = await this.tenantRepository.findByOwner(ownerId);
    return docs.map((doc) => doc.tenantId).sort();
  }

  /**
   * Creates the requested result.
   * @param ownerId - The owner ID input.
   * @param name - The name input.
   * @param tenantId - The tenant ID input.
   * @returns The operation result.
   */

  async create(
    ownerId: string,
    name: string,
    tenantId?: string,
  ): Promise<{
    ok: boolean;
    status: 201 | 400 | 409;
    error?: string;
    tenant?: { tenantId: string; name?: string };
  }> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return {
        ok: false,
        status: 400,
        error: "Invalid request: name is required",
      };
    }

    const rawTenantId =
      typeof tenantId === "string" && tenantId.trim().length > 0
        ? tenantId.trim()
        : trimmedName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

    if (!/^[a-z0-9][a-z0-9_-]*$/.test(rawTenantId)) {
      return {
        ok: false,
        status: 400,
        error:
          "Invalid tenantId: use lowercase letters, numbers, hyphens and underscores",
      };
    }

    const existing = await this.tenantRepository.findByTenantId(rawTenantId);
    if (existing) {
      return { ok: false, status: 409, error: "Tenant ID already exists" };
    }

    const created = await this.tenantRepository.create({
      tenantId: rawTenantId,
      ownerId,
      name: trimmedName,
    });

    return {
      ok: true,
      status: 201,
      tenant: {
        tenantId: created.tenantId,
        name: created.name,
      },
    };
  }

  /**
   * Removes the requested result.
   * @param ownerId - The owner ID input.
   * @param tenantId - The tenant ID input.
   * @returns The operation result.
   */

  async remove(ownerId: string, tenantId: string): Promise<boolean> {
    return this.tenantRepository.deleteByTenantId(tenantId, ownerId);
  }
}
