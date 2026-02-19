import type { Request, Response } from "express";
import { TenantModel } from "@byteroute/shared";

export async function getTenants(req: Request, res: Response): Promise<void> {
  const principal = req.user as { id?: string } | undefined;
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
