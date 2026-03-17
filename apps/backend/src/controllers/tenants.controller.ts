/**
 * @module backend/controllers/tenants.controller
 */

import type { Request, Response } from "express";
import * as shared from "@byteroute/shared";
import { z } from "zod";
import type { AppContext } from "../config/composition-root.js";
import { TenantModel as InfraTenantModel } from "../infrastructure/persistence/models/tenant.model.js";
import { getPrincipal } from "../auth/principal.js";
import { TenantService } from "../services/tenant.service.js";

const principalIdSchema = z.object({ id: z.string().min(1) });
const tenantCreateRequestSchema = z.object({
  name: z.string(),
  tenantId: z.string().optional(),
});
const tenantCreateLegacyRequestSchema = z.object({
  name: z.string().trim().min(1),
  tenantId: z.string().optional(),
});
const tenantParamsSchema = z.object({ tenantId: z.string().min(1) });

const TenantModel =
  (shared as { TenantModel?: typeof InfraTenantModel }).TenantModel ??
  InfraTenantModel;

/**
 * Creates tenants controller.
 * @param ctx - The ctx input.
 */

export function createTenantsController(ctx: AppContext) {
  const tenantService = new TenantService(ctx.tenantRepository);

  return {
    list: async (req: Request, res: Response): Promise<void> => {
      const principal = principalIdSchema.safeParse(req.user);
      if (!principal.success) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const tenants = await tenantService.list(principal.data.id);
      res.json({ tenants });
    },

    create: async (req: Request, res: Response): Promise<void> => {
      const principal = principalIdSchema.safeParse(req.user);
      if (!principal.success) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const body = tenantCreateRequestSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Invalid request: name is required" });
        return;
      }

      const result = await tenantService.create(
        principal.data.id,
        body.data.name,
        body.data.tenantId,
      );

      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.status(201).json({ tenant: result.tenant });
    },

    remove: async (req: Request, res: Response): Promise<void> => {
      const principal = principalIdSchema.safeParse(req.user);
      if (!principal.success) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const params = tenantParamsSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: "tenantId is required" });
        return;
      }

      const deleted = await tenantService.remove(
        principal.data.id,
        params.data.tenantId,
      );
      if (!deleted) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      res.status(204).send();
    },
  };
}

/**
 * Gets tenants.
 * @param req - The req input.
 * @param res - The res input.
 */

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

/**
 * Creates tenant.
 * @param req - The req input.
 * @param res - The res input.
 */

export async function createTenant(req: Request, res: Response): Promise<void> {
  const principal = getPrincipal(req);
  if (!principal?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = tenantCreateLegacyRequestSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request: name is required" });
    return;
  }

  const name = body.data.name;
  const rawTenantId =
    typeof body.data.tenantId === "string" && body.data.tenantId.trim().length > 0
      ? body.data.tenantId.trim()
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(rawTenantId)) {
    res.status(400).json({
      error:
        "Invalid tenantId: use lowercase letters, numbers, hyphens and underscores",
    });
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

  res
    .status(201)
    .json({ tenant: { tenantId: created.tenantId, name: created.name } });
}

/**
 * Deletes tenant.
 * @param req - The req input.
 * @param res - The res input.
 */

export async function deleteTenant(req: Request, res: Response): Promise<void> {
  const principal = getPrincipal(req);
  if (!principal?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = tenantParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "tenantId is required" });
    return;
  }

  const result = await TenantModel.deleteOne({
    tenantId: params.data.tenantId,
    ownerId: principal.id,
  });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  res.status(204).send();
}
