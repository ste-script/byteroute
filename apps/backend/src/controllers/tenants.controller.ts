import type { Request, Response } from "express";
import { TenantModel } from "@byteroute/shared";
import { getPrincipal } from "../auth/principal.js";

export async function getTenants(req: Request, res: Response): Promise<void> {
  const principal = getPrincipal(req);
  if (!principal?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const docs = await TenantModel.find({ ownerId: principal.id })
    .select("tenantId name")
    .lean<{ tenantId: string; name?: string }[]>();

  const tenants = docs.map((doc) => doc.tenantId).sort();
  res.json({ tenants });
}

export async function createTenant(req: Request, res: Response): Promise<void> {
  const principal = getPrincipal(req);
  if (!principal?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as { name?: unknown; tenantId?: unknown };

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    res.status(400).json({ error: "Invalid request: name is required" });
    return;
  }

  const name = body.name.trim();

  // Accept explicit tenantId or derive from name
  const rawTenantId =
    typeof body.tenantId === "string" && body.tenantId.trim().length > 0
      ? body.tenantId.trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(rawTenantId)) {
    res.status(400).json({ error: "Invalid tenantId: use lowercase letters, numbers, hyphens and underscores" });
    return;
  }

  const existing = await TenantModel.findOne({ tenantId: rawTenantId }).lean();
  if (existing) {
    res.status(409).json({ error: "Tenant ID already exists" });
    return;
  }

  const created = await TenantModel.create({
    tenantId: rawTenantId,
    ownerId: principal.id,
    name,
  });

  res.status(201).json({ tenant: { tenantId: created.tenantId, name: created.name } });
}

export async function deleteTenant(req: Request, res: Response): Promise<void> {
  const principal = getPrincipal(req);
  if (!principal?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { tenantId } = req.params;

  if (!tenantId) {
    res.status(400).json({ error: "tenantId is required" });
    return;
  }

  const result = await TenantModel.deleteOne({ tenantId, ownerId: principal.id });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  res.status(204).send();
}
