/**
 * @module backend/infrastructure/dsl/domain-dsl
 */

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { Connection } from "@byteroute/shared";

type Protocol = Connection["protocol"];
type Status = Connection["status"];

export type AggregationSortBy = "connections" | "bandwidth";
export type AggregationSortOrder = "asc" | "desc";

export type AggregationQuerySpec = {
  sortBy: AggregationSortBy;
  order: AggregationSortOrder;
  limit?: number;
};

export type CompiledDomainDsl = {
  sourcePath?: string;
  ingestion: {
    connection: {
      allowedProtocols: Set<Protocol>;
      defaultProtocol: Protocol;
      defaultStatus: Status;
      denySourceIps: Set<string>;
    };
  };
  analytics: {
    queries: {
      byCountry: AggregationQuerySpec;
      byAsn: AggregationQuerySpec;
      byProtocol: AggregationQuerySpec;
    };
  };
};

const protocolSchema = z.enum(["TCP", "UDP", "ICMP", "OTHER"]);
const statusSchema = z.enum(["active", "inactive"]);
const sortBySchema = z.enum(["connections", "bandwidth"]);
const sortOrderSchema = z.enum(["asc", "desc"]);

const rawDslSchema = z
  .object({
    ingestion: z
      .object({
        connection: z
          .object({
            allowedProtocols: z.array(protocolSchema).optional(),
            defaultProtocol: protocolSchema.optional(),
            defaultStatus: statusSchema.optional(),
            denySourceIps: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
    analytics: z
      .object({
        queries: z
          .object({
            byCountry: z
              .object({
                sortBy: sortBySchema.optional(),
                order: sortOrderSchema.optional(),
                limit: z.number().int().positive().optional(),
              })
              .optional(),
            byAsn: z
              .object({
                sortBy: sortBySchema.optional(),
                order: sortOrderSchema.optional(),
                limit: z.number().int().positive().optional(),
              })
              .optional(),
            byProtocol: z
              .object({
                sortBy: sortBySchema.optional(),
                order: sortOrderSchema.optional(),
                limit: z.number().int().positive().optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional();

const DEFAULT_DSL: CompiledDomainDsl = {
  ingestion: {
    connection: {
      allowedProtocols: new Set<Protocol>(["TCP", "UDP", "ICMP", "OTHER"]),
      defaultProtocol: "OTHER",
      defaultStatus: "active",
      denySourceIps: new Set<string>(),
    },
  },
  analytics: {
    queries: {
      byCountry: {
        sortBy: "connections",
        order: "desc",
      },
      byAsn: {
        sortBy: "connections",
        order: "desc",
      },
      byProtocol: {
        sortBy: "connections",
        order: "desc",
      },
    },
  },
};

let compiledDomainDsl: CompiledDomainDsl = DEFAULT_DSL;

/**
 * Normalizes unique strings.
 * @param values - The values input.
 * @returns The unique strings result.
 */

function normalizeUniqueStrings(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(normalized));
}

/**
 * Resolves aggregation query.
 * @param override - The override input.
 * @param fallback - The fallback input.
 * @returns The aggregation query result.
 */

function resolveAggregationQuery(
  override:
    | {
        sortBy?: AggregationSortBy;
        order?: AggregationSortOrder;
        limit?: number;
      }
    | undefined,
  fallback: AggregationQuerySpec,
): AggregationQuerySpec {
  return {
    sortBy: override?.sortBy ?? fallback.sortBy,
    order: override?.order ?? fallback.order,
    limit: override?.limit,
  };
}

/**
 * Resolves compiled DSL.
 * @param raw - The raw input.
 * @param sourcePath - The source path input.
 * @returns The compiled DSL result.
 */

function resolveCompiledDsl(
  raw: z.infer<typeof rawDslSchema> | undefined,
  sourcePath?: string,
): CompiledDomainDsl {
  const allowedProtocols = raw?.ingestion?.connection?.allowedProtocols;
  const denySourceIps = normalizeUniqueStrings(
    raw?.ingestion?.connection?.denySourceIps,
  );

  return {
    sourcePath,
    ingestion: {
      connection: {
        allowedProtocols:
          allowedProtocols && allowedProtocols.length > 0
            ? new Set<Protocol>(allowedProtocols)
            : new Set(DEFAULT_DSL.ingestion.connection.allowedProtocols),
        defaultProtocol:
          raw?.ingestion?.connection?.defaultProtocol ??
          DEFAULT_DSL.ingestion.connection.defaultProtocol,
        defaultStatus:
          raw?.ingestion?.connection?.defaultStatus ??
          DEFAULT_DSL.ingestion.connection.defaultStatus,
        denySourceIps: new Set(denySourceIps),
      },
    },
    analytics: {
      queries: {
        byCountry: resolveAggregationQuery(
          raw?.analytics?.queries?.byCountry,
          DEFAULT_DSL.analytics.queries.byCountry,
        ),
        byAsn: resolveAggregationQuery(
          raw?.analytics?.queries?.byAsn,
          DEFAULT_DSL.analytics.queries.byAsn,
        ),
        byProtocol: resolveAggregationQuery(
          raw?.analytics?.queries?.byProtocol,
          DEFAULT_DSL.analytics.queries.byProtocol,
        ),
      },
    },
  };
}

/**
 * Finds DSL path.
 * @returns The DSL path result.
 */

async function findDslPath(): Promise<string | undefined> {
  const explicit = process.env.DOMAIN_DSL_PATH;
  const candidates = [
    explicit,
    "/etc/byteroute/domain.dsl.yaml",
    resolve(process.cwd(), "config/domain.dsl.yaml"),
    resolve(process.cwd(), "apps/backend/config/domain.dsl.yaml"),
  ].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // keep checking
    }
  }

  return undefined;
}

/**
 * Compiles domain DSL at startup.
 * @returns The domain DSL at startup result.
 */

export async function compileDomainDslAtStartup(): Promise<CompiledDomainDsl> {
  const dslPath = await findDslPath();

  if (!dslPath) {
    compiledDomainDsl = DEFAULT_DSL;
    return compiledDomainDsl;
  }

  try {
    const content = await readFile(dslPath, "utf8");
    const parsed = rawDslSchema.parse(parseYaml(content));
    compiledDomainDsl = resolveCompiledDsl(parsed, dslPath);
    return compiledDomainDsl;
  } catch (error) {
    console.error(
      "[DSL] Failed to compile domain DSL. Falling back to defaults.",
      error,
    );
    compiledDomainDsl = DEFAULT_DSL;
    return compiledDomainDsl;
  }
}

/**
 * Gets compiled domain DSL.
 * @returns The compiled domain DSL.
 */

export function getCompiledDomainDsl(): CompiledDomainDsl {
  return compiledDomainDsl;
}
