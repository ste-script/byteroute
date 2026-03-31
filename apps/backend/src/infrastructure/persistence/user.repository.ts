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
 * @module backend/infrastructure/persistence/user.repository
 */

import { normalizeTenantIds } from "../../utils/tenant.js";
import type { IUserRepository } from "../../domain/identity/user-repository.interface.js";
import type { User } from "../../domain/identity/types.js";
import { UserModel } from "./models/user.model.js";

/**
 * Toes user.
 * @param doc - The doc input.
 * @returns The user result.
 */

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

/**
 * Represents a mongo user repository.
 */

export class MongoUserRepository implements IUserRepository {
  /**
   * Finds by email.
   * @param email - The email input.
   * @returns The by email result.
   */

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email })
      .select("+passwordHash")
      .lean();
    if (!doc) {
      return null;
    }
    return toUser(doc);
  }

  /**
   * Finds by ID.
   * @param id - The ID input.
   * @returns The by ID result.
   */

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).select("+passwordHash").lean();
    if (!doc) {
      return null;
    }
    return toUser(doc);
  }

  /**
   * Creates the requested result.
   * @param data - The data input.
   * @returns The operation result.
   */

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
