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
 * @module backend/utils/statistics
 */

import type { Connection, Statistics } from "@byteroute/shared";
import { metricsStore } from "../services/metrics.js";
import type { IMetricsStore } from "../domain/metrics/metrics-store.interface.js";
import {
  getCompiledDomainDsl,
  type AggregationQuerySpec,
} from "../infrastructure/dsl/domain-dsl.js";

/**
 * Applies aggregation query.
 * @param entries - The entries input.
 * @param query - The query input.
 * @returns The aggregation query result.
 */

function applyAggregationQuery<
  T extends { connections: number; bandwidth?: number },
>(entries: T[], query: AggregationQuerySpec): T[] {
  const sorted = [...entries].sort((left, right) => {
    const leftValue =
      query.sortBy === "bandwidth" ? (left.bandwidth ?? 0) : left.connections;
    const rightValue =
      query.sortBy === "bandwidth" ? (right.bandwidth ?? 0) : right.connections;

    if (query.order === "asc") {
      return leftValue - rightValue;
    }

    return rightValue - leftValue;
  });

  if (typeof query.limit === "number") {
    return sorted.slice(0, query.limit);
  }

  return sorted;
}

/**
 * Generates statistics.
 * @param connections - The connections input.
 * @param tenantId - The tenant ID input.
 * @param store - The store input.
 * @returns The statistics result.
 */

export function generateStatistics(
  connections: Connection[],
  tenantId: string,
  store: IMetricsStore = metricsStore,
): Statistics {
  const queryDsl = getCompiledDomainDsl().analytics.queries;
  const activeConnections = connections.filter(
    (c) => c.status === "active",
  ).length;
  const totalBandwidth = connections.reduce(
    (sum, c) => sum + (c.bandwidth ?? 0),
    0,
  );
  const bandwidthIn = connections.reduce((sum, c) => sum + (c.bytesIn ?? 0), 0);
  const bandwidthOut = connections.reduce(
    (sum, c) => sum + (c.bytesOut ?? 0),
    0,
  );

  // Group by country
  const countryMap = new Map<
    string,
    { connections: number; bandwidth: number; countryCode: string }
  >();
  for (const conn of connections) {
    if (conn.country && conn.countryCode) {
      const existing = countryMap.get(conn.country) ?? {
        connections: 0,
        bandwidth: 0,
        countryCode: conn.countryCode,
      };
      existing.connections++;
      existing.bandwidth += conn.bandwidth ?? 0;
      countryMap.set(conn.country, existing);
    }
  }

  const byCountryRaw = Array.from(countryMap.entries()).map(
    ([country, data]) => ({
      country,
      countryCode: data.countryCode,
      connections: data.connections,
      bandwidth: data.bandwidth,
      percentage:
        connections.length > 0
          ? (data.connections / connections.length) * 100
          : 0,
    }),
  );
  const byCountry = applyAggregationQuery(byCountryRaw, queryDsl.byCountry);

  // Group by ASN
  const asnMap = new Map<
    number,
    { connections: number; bandwidth: number; asOrganization?: string }
  >();
  for (const conn of connections) {
    if (typeof conn.asn !== "number" || !Number.isFinite(conn.asn)) {
      continue;
    }

    const existing = asnMap.get(conn.asn) ?? { connections: 0, bandwidth: 0 };
    existing.connections++;
    existing.bandwidth += conn.bandwidth ?? 0;
    if (
      !existing.asOrganization &&
      typeof conn.asOrganization === "string" &&
      conn.asOrganization.trim().length > 0
    ) {
      existing.asOrganization = conn.asOrganization;
    }
    asnMap.set(conn.asn, existing);
  }

  const byAsnRaw = Array.from(asnMap.entries()).map(([asn, data]) => ({
    asn,
    asOrganization: data.asOrganization,
    connections: data.connections,
    bandwidth: data.bandwidth,
    percentage:
      connections.length > 0
        ? (data.connections / connections.length) * 100
        : 0,
  }));
  const byAsn = applyAggregationQuery(byAsnRaw, queryDsl.byAsn);

  // Group by protocol
  const protocolMap = new Map<string, number>();
  for (const conn of connections) {
    protocolMap.set(conn.protocol, (protocolMap.get(conn.protocol) ?? 0) + 1);
  }

  const byProtocolRaw = Array.from(protocolMap.entries()).map(
    ([protocol, count]) => ({
      protocol,
      connections: count,
      percentage:
        connections.length > 0 ? (count / connections.length) * 100 : 0,
    }),
  );
  const byProtocol = applyAggregationQuery(byProtocolRaw, queryDsl.byProtocol);

  const timeSeries = store.getTimeSeries(tenantId, 24);

  return {
    totalConnections: connections.length,
    activeConnections,
    totalBandwidth,
    bandwidthIn,
    bandwidthOut,
    byCountry,
    byAsn,
    byProtocol,
    timeSeries,
  };
}
