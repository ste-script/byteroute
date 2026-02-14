import type { Request, Response } from "express";
import { getKnownTenantIds } from "../services/connections.js";
import { DEFAULT_TENANT_ID } from "../utils/tenant.js";

export function getTenants(_req: Request, res: Response): void {
  const tenants = Array.from(new Set([DEFAULT_TENANT_ID, ...getKnownTenantIds()])).sort();
  res.json({ tenants });
}
