import { normalizeTenantIds } from "../../utils/tenant.js";
import type { IUserRepository } from "../../domain/identity/user-repository.interface.js";
import type { User } from "../../domain/identity/types.js";
import { UserModel } from "./models/user.model.js";

function toUser(doc: {
  _id: unknown;
  email: string;
  name: string;
  passwordHash?: string;
  tenantIds?: string[];
}): User {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    passwordHash: doc.passwordHash,
    tenantIds: normalizeTenantIds(doc.tenantIds),
  };
}

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email }).select("+passwordHash").lean();
    if (!doc) {
      return null;
    }
    return toUser(doc);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).select("+passwordHash").lean();
    if (!doc) {
      return null;
    }
    return toUser(doc);
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash?: string;
    tenantIds?: string[];
  }): Promise<User> {
    const created = await UserModel.create({
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      tenantIds: normalizeTenantIds(data.tenantIds),
    });

    return {
      id: String(created._id),
      email: created.email,
      name: created.name,
      tenantIds: normalizeTenantIds(created.tenantIds),
    };
  }
}
