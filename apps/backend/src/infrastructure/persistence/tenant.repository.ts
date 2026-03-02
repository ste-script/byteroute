import type { ITenantRepository } from "../../domain/identity/tenant-repository.interface.js";
import type { Tenant } from "../../domain/identity/types.js";
import { TenantModel } from "./models/tenant.model.js";

function toTenant(doc: { tenantId: string; ownerId: unknown; name?: string }): Tenant {
  return {
    tenantId: doc.tenantId,
    ownerId: String(doc.ownerId),
    name: doc.name,
  };
}

export class MongoTenantRepository implements ITenantRepository {
  async findByOwner(ownerId: string): Promise<Tenant[]> {
    const docs = await TenantModel.find({ ownerId }).select("tenantId ownerId name").lean();
    return docs.map((doc) => toTenant(doc));
  }

  async findByTenantId(tenantId: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ tenantId }).select("tenantId ownerId name").lean();
    return doc ? toTenant(doc) : null;
  }

  async create(data: { tenantId: string; ownerId: string; name?: string }): Promise<Tenant> {
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

  async deleteByTenantId(tenantId: string, ownerId: string): Promise<boolean> {
    const result = await TenantModel.deleteOne({ tenantId, ownerId });
    return result.deletedCount > 0;
  }

  async findOwnedTenantIds(ownerId: string): Promise<string[]> {
    const docs = await TenantModel.find({ ownerId }).select("tenantId").lean<{ tenantId: string }[]>();
    return docs.map((doc) => doc.tenantId);
  }
}
