import type { ITenantRepository } from "../domain/identity/tenant-repository.interface.js";

export class TenantService {
  constructor(private readonly tenantRepository: ITenantRepository) {}

  async list(ownerId: string): Promise<string[]> {
    const docs = await this.tenantRepository.findByOwner(ownerId);
    return docs.map((doc) => doc.tenantId).sort();
  }

  async create(ownerId: string, name: string, tenantId?: string): Promise<{
    ok: boolean;
    status: 201 | 400 | 409;
    error?: string;
    tenant?: { tenantId: string; name?: string };
  }> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { ok: false, status: 400, error: "Invalid request: name is required" };
    }

    const rawTenantId =
      typeof tenantId === "string" && tenantId.trim().length > 0
        ? tenantId.trim()
        : trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (!/^[a-z0-9][a-z0-9_-]*$/.test(rawTenantId)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid tenantId: use lowercase letters, numbers, hyphens and underscores",
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

  async remove(ownerId: string, tenantId: string): Promise<boolean> {
    return this.tenantRepository.deleteByTenantId(tenantId, ownerId);
  }
}
