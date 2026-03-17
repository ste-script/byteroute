/**
 * @module backend/infrastructure/persistence/connection.repository
 */

import type { Connection } from "@byteroute/shared";
import type {
  ConnectionHistoryFilters,
  ConnectionHistoryResult,
  IConnectionRepository,
} from "../../domain/connection/connection-repository.interface.js";
import { ConnectionModel } from "./models/connection.model.js";

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Coerces date.
 * @param value - The value input.
 * @param fallback - The fallback input.
 * @returns The date result.
 */

function coerceDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
}

/**
 * Represents a mongo connection repository.
 */

export class MongoConnectionRepository implements IConnectionRepository {
  /**
   * Bulks upsert.
   * @param tenantId - The tenant ID input.
   * @param connections - The connections input.
   */

  async bulkUpsert(tenantId: string, connections: Connection[]): Promise<void> {
    if (connections.length === 0) {
      return;
    }

    const now = new Date();
    const ops = connections.map((connection) => {
      const startTime = coerceDate(connection.startTime, now);
      const lastActivity = coerceDate(connection.lastActivity, now);

      return {
        updateOne: {
          filter: { tenantId, id: connection.id },
          update: {
            $set: {
              ...connection,
              tenantId,
              startTime,
              lastActivity,
            },
          },
          upsert: true,
        },
      };
    });

    await ConnectionModel.bulkWrite(ops, { ordered: false });
  }

  /**
   * Loads by tenant.
   * @param tenantId - The tenant ID input.
   * @returns The by tenant result.
   */

  async loadByTenant(tenantId: string): Promise<Connection[]> {
    const docs = await ConnectionModel.find({ tenantId }, { _id: 0 })
      .sort({ lastActivity: -1 })
      .lean();
    return docs as Connection[];
  }

  /**
   * Loads all grouped by tenant.
   * @returns The all grouped by tenant result.
   */

  async loadAllGroupedByTenant(): Promise<Map<string, Connection[]>> {
    const docs = await ConnectionModel.find({}, { _id: 0 })
      .sort({ lastActivity: -1 })
      .lean();
    const grouped = new Map<string, Connection[]>();

    for (const doc of docs as Connection[]) {
      const tenantId = doc.tenantId ?? "default";
      const existing = grouped.get(tenantId) ?? [];
      existing.push(doc);
      grouped.set(tenantId, existing);
    }

    return grouped;
  }

  async loadHistory(
    tenantId: string,
    filters: ConnectionHistoryFilters,
  ): Promise<ConnectionHistoryResult> {
    const query: Record<string, unknown> = { tenantId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.protocol) {
      query.protocol = filters.protocol;
    }

    if (filters.from || filters.to) {
      query.lastActivity = {};
      if (filters.from) {
        (query.lastActivity as Record<string, unknown>).$gte = filters.from;
      }
      if (filters.to) {
        (query.lastActivity as Record<string, unknown>).$lte = filters.to;
      }
    }

    if (filters.q) {
      const regex = new RegExp(escapeRegexLiteral(filters.q), "i");
      query.$or = [
        { sourceIp: regex },
        { destIp: regex },
        { country: regex },
        { city: regex },
        { asOrganization: regex },
      ];
    }

    const [items, total] = await Promise.all([
      ConnectionModel.find(query, { _id: 0 })
        .sort({ lastActivity: -1 })
        .skip(filters.offset)
        .limit(filters.limit)
        .lean(),
      ConnectionModel.countDocuments(query),
    ]);

    return {
      items: items as Connection[],
      total,
    };
  }
}
