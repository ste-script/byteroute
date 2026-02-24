import type { Connection, Statistics } from "@byteroute/shared";
import { metricsStore } from "../services/metrics.js";

const categoryColors: Record<string, string> = {
  web: "#3b82f6",
  streaming: "#8b5cf6",
  gaming: "#ec4899",
  email: "#f59e0b",
  "file-transfer": "#10b981",
  voip: "#06b6d4",
  vpn: "#6366f1",
  social: "#f97316",
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateStatistics(connections: Connection[], tenantId: string): Statistics {
  const activeConnections = connections.filter(c => c.status === "active").length;
  const totalBandwidth = connections.reduce((sum, c) => sum + (c.bandwidth ?? 0), 0);
  const bandwidthIn = connections.reduce((sum, c) => sum + (c.bytesIn ?? 0), 0);
  const bandwidthOut = connections.reduce((sum, c) => sum + (c.bytesOut ?? 0), 0);

  // Group by country
  const countryMap = new Map<string, { connections: number; bandwidth: number; countryCode: string }>();
  for (const conn of connections) {
    if (conn.country && conn.countryCode) {
      const existing = countryMap.get(conn.country) ?? { connections: 0, bandwidth: 0, countryCode: conn.countryCode };
      existing.connections++;
      existing.bandwidth += conn.bandwidth ?? 0;
      countryMap.set(conn.country, existing);
    }
  }

  const byCountry = Array.from(countryMap.entries()).map(([country, data]) => ({
    country,
    countryCode: data.countryCode,
    connections: data.connections,
    bandwidth: data.bandwidth,
    percentage: connections.length > 0 ? (data.connections / connections.length) * 100 : 0,
  }));

  // Group by category
  const categoryMap = new Map<string, { connections: number; bandwidth: number }>();
  for (const conn of connections) {
    if (conn.category) {
      const existing = categoryMap.get(conn.category) ?? { connections: 0, bandwidth: 0 };
      existing.connections++;
      existing.bandwidth += conn.bandwidth ?? 0;
      categoryMap.set(conn.category, existing);
    }
  }

  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    connections: data.connections,
    bandwidth: data.bandwidth,
    percentage: connections.length > 0 ? (data.connections / connections.length) * 100 : 0,
    color: categoryColors[category],
  }));

  // Group by protocol
  const protocolMap = new Map<string, number>();
  for (const conn of connections) {
    protocolMap.set(conn.protocol, (protocolMap.get(conn.protocol) ?? 0) + 1);
  }

  const byProtocol = Array.from(protocolMap.entries()).map(([protocol, count]) => ({
    protocol,
    connections: count,
    percentage: connections.length > 0 ? (count / connections.length) * 100 : 0,
  }));

  // Get real time series data from metrics store, fallback to mock if empty
  let timeSeries = metricsStore.getTimeSeries(tenantId, 24);

  // If no real metrics yet, generate mock data
  if (timeSeries.length === 0) {
    const now = Date.now();
    timeSeries = Array.from({ length: 24 }, (_, i) => {
      const timestamp = new Date(now - (23 - i) * 3600000);
      return {
        timestamp: timestamp.toISOString(),
        connections: randomInt(50, 200),
        bandwidthIn: randomInt(10000, 100000),
        bandwidthOut: randomInt(10000, 100000),
      };
    });
  }

  return {
    totalConnections: connections.length,
    activeConnections,
    totalBandwidth,
    bandwidthIn,
    bandwidthOut,
    byCountry,
    byCategory,
    byProtocol,
    timeSeries,
  };
}
