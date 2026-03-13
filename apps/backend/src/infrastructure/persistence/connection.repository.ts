/**
 * @module backend/infrastructure/persistence/connection.repository
 */

import type { Connection } from "@byteroute/shared";
import type { IConnectionRepository } from "../../domain/connection/connection-repository.interface.js";
import { ConnectionModel } from "./models/connection.model.js";

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

export class MongoConnectionRepository implements IConnectionRepository {
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

  async loadByTenant(tenantId: string): Promise<Connection[]> {
    const docs = await ConnectionModel.find({ tenantId }, { _id: 0 }).sort({ lastActivity: -1 }).lean();
    return docs as Connection[];
  }

  async loadAllGroupedByTenant(): Promise<Map<string, Connection[]>> {
    const docs = await ConnectionModel.find({}, { _id: 0 }).sort({ lastActivity: -1 }).lean();
    const grouped = new Map<string, Connection[]>();

    for (const doc of docs as Connection[]) {
      const tenantId = doc.tenantId ?? "default";
      const existing = grouped.get(tenantId) ?? [];
      existing.push(doc);
      grouped.set(tenantId, existing);
    }

    return grouped;
  }
}
