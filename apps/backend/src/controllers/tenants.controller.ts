import type { Request, Response } from "express";
import { normalizeTenantIds } from "../utils/tenant.js";

export function getTenants(req: Request, res: Response): void {
  const principal = req.user as { tenantIds?: unknown } | undefined;
  const ownedTenantIds = normalizeTenantIds(principal?.tenantIds);
  const tenants = Array.from(new Set(ownedTenantIds)).sort();
  res.json({ tenants });
}
