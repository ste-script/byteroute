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
 * @module backend/auth/principal
 */

import type { Request } from "express";
import * as shared from "@byteroute/shared";
import { UserModel as InfraUserModel } from "../infrastructure/persistence/models/user.model.js";
import { TenantModel as InfraTenantModel } from "../infrastructure/persistence/models/tenant.model.js";
import { normalizeTenantIds } from "../utils/tenant.js";

let sharedUserModel: typeof InfraUserModel | undefined;
let sharedTenantModel: typeof InfraTenantModel | undefined;

try {
  sharedUserModel = (shared as { UserModel?: typeof InfraUserModel }).UserModel;
} catch {
  sharedUserModel = undefined;
}

try {
  sharedTenantModel = (shared as { TenantModel?: typeof InfraTenantModel })
    .TenantModel;
} catch {
  sharedTenantModel = undefined;
}

const UserModel = sharedUserModel ?? InfraUserModel;
const TenantModel = sharedTenantModel ?? InfraTenantModel;

type PrincipalLike = {
  id?: unknown;
  email?: unknown;
  name?: unknown;
  scopes?: unknown;
};

export type HydratedPrincipal = {
  id: string;
  email: string;
  name?: string;
  tenantIds: string[];
  scopes: string[];
};

/**
 * Normalizes scopes.
 * @param value - The value input.
 * @returns The scopes result.
 */

function normalizeScopes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ["api"];
  }

  const scopes = value.filter(
    (scope): scope is string => typeof scope === "string",
  );
  return scopes.length > 0 ? scopes : ["api"];
}

/**
 * Hydrates principal from database.
 * @param principalLike - The principal like input.
 * @returns The principal from database result.
 */

export async function hydratePrincipalFromDatabase(
  principalLike: unknown,
): Promise<HydratedPrincipal | undefined> {
  const principal = principalLike as PrincipalLike | undefined;
  if (!principal || typeof principal.id !== "string") {
    return undefined;
  }

  const user = await UserModel.findById(principal.id)
    .select("email name")
    .lean();

  if (!user || typeof user.email !== "string") {
    return undefined;
  }

  // Derive tenant IDs from the Tenant collection (authoritative source)
  const tenantDocs = await TenantModel.find({ ownerId: principal.id })
    .select("tenantId")
    .lean<{ tenantId: string }[]>();
  const tenantIds = normalizeTenantIds(tenantDocs.map((doc) => doc.tenantId));

  return {
    id: String(user._id),
    email: user.email,
    name: typeof user.name === "string" ? user.name : undefined,
    tenantIds,
    scopes: normalizeScopes(principal.scopes),
  };
}

/**
 * Gets principal.
 * @param req - The req input.
 * @returns The principal.
 */

export function getPrincipal(req: Request): HydratedPrincipal | undefined {
  return req.user as HydratedPrincipal | undefined;
}
