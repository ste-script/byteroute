import { UserModel, TenantModel } from "@byteroute/shared";
import { normalizeTenantIds } from "../utils/tenant.js";

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

function normalizeScopes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ["api"];
  }

  const scopes = value.filter((scope): scope is string => typeof scope === "string");
  return scopes.length > 0 ? scopes : ["api"];
}

export async function hydratePrincipalFromDatabase(
  principalLike: unknown
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