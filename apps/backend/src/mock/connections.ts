import type { Connection, TrafficFlow, Statistics } from "@byteroute/shared";

// Sample data for generating realistic mock connections
const countries = [
  { country: "United States", countryCode: "US", lat: 37.0902, lng: -95.7129 },
  { country: "Germany", countryCode: "DE", lat: 51.1657, lng: 10.4515 },
  { country: "Japan", countryCode: "JP", lat: 36.2048, lng: 138.2529 },
  { country: "Brazil", countryCode: "BR", lat: -14.235, lng: -51.9253 },
  { country: "United Kingdom", countryCode: "GB", lat: 55.3781, lng: -3.436 },
  { country: "Australia", countryCode: "AU", lat: -25.2744, lng: 133.7751 },
  { country: "France", countryCode: "FR", lat: 46.2276, lng: 2.2137 },
  { country: "Canada", countryCode: "CA", lat: 56.1304, lng: -106.3468 },
  { country: "India", countryCode: "IN", lat: 20.5937, lng: 78.9629 },
  { country: "Singapore", countryCode: "SG", lat: 1.3521, lng: 103.8198 },
];

const cities: Record<string, string[]> = {
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
  DE: ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"],
  JP: ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza"],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  IN: ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata"],
  SG: ["Singapore"],
};

const protocols: Connection["protocol"][] = ["TCP", "UDP", "ICMP", "OTHER"];
const statuses: Connection["status"][] = ["active", "inactive", "blocked"];
const categories = ["web", "streaming", "gaming", "email", "file-transfer", "voip", "vpn", "social"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error("Cannot choose from empty array");
  }
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateIp(): string {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function generatePort(): number {
  return randomInt(1024, 65535);
}

let connectionIdCounter = 0;

export function generateConnection(overrides?: Partial<Connection>): Connection {
  const countryData = randomChoice(countries);
  const city = randomChoice(cities[countryData.countryCode] ?? ["Unknown"]);
  const status = randomChoice(statuses);
  const now = new Date();
  const startTime = new Date(now.getTime() - randomInt(0, 3600000)); // Up to 1 hour ago

  connectionIdCounter++;

  return {
    id: `conn-${connectionIdCounter}-${Date.now()}`,
    sourceIp: generateIp(),
    destIp: generateIp(),
    sourcePort: generatePort(),
    destPort: randomChoice([80, 443, 8080, 3000, 5432, 27017, generatePort()]),
    protocol: randomChoice(protocols),
    status,
    country: countryData.country,
    countryCode: countryData.countryCode,
    city,
    latitude: countryData.lat + (Math.random() - 0.5) * 10,
    longitude: countryData.lng + (Math.random() - 0.5) * 10,
    category: randomChoice(categories),
    bandwidth: randomInt(100, 100000),
    bytesIn: randomInt(1000, 10000000),
    bytesOut: randomInt(1000, 10000000),
    packetsIn: randomInt(10, 100000),
    packetsOut: randomInt(10, 100000),
    startTime: startTime.toISOString(),
    lastActivity: now.toISOString(),
    duration: now.getTime() - startTime.getTime(),
    ...overrides,
  };
}

export function generateConnections(count: number): Connection[] {
  return Array.from({ length: count }, () => generateConnection());
}

let flowIdCounter = 0;

export function generateTrafficFlow(connection?: Connection): TrafficFlow {
  const sourceCountry = randomChoice(countries);
  const targetCountry = randomChoice(countries);

  flowIdCounter++;

  // Color based on connection status or random
  const colors: [number, number, number, number][] = [
    [0, 255, 0, 200],   // green - active
    [255, 165, 0, 200], // orange - inactive
    [255, 0, 0, 200],   // red - blocked
    [0, 191, 255, 200], // blue - default
  ];

  return {
    id: `flow-${flowIdCounter}-${Date.now()}`,
    source: {
      lat: connection?.latitude ?? sourceCountry.lat + (Math.random() - 0.5) * 5,
      lng: connection?.longitude ?? sourceCountry.lng + (Math.random() - 0.5) * 5,
      country: connection?.country ?? sourceCountry.country,
      city: connection?.city,
    },
    target: {
      lat: targetCountry.lat + (Math.random() - 0.5) * 5,
      lng: targetCountry.lng + (Math.random() - 0.5) * 5,
      country: targetCountry.country,
      city: randomChoice(cities[targetCountry.countryCode] ?? ["Unknown"]),
    },
    value: connection?.bandwidth ?? randomInt(100, 50000),
    color: connection?.status === "active" ? colors[0] :
           connection?.status === "inactive" ? colors[1] :
           connection?.status === "blocked" ? colors[2] : randomChoice(colors),
    animated: connection ? connection.status === "active" : Math.random() > 0.3,
  };
}

export function generateTrafficFlows(connections: Connection[]): TrafficFlow[] {
  return connections
    .filter(c => c.status === "active")
    .slice(0, 20) // Limit flows for performance
    .map(c => generateTrafficFlow(c));
}

export function generateStatistics(connections: Connection[]): Statistics {
  const activeConnections = connections.filter(c => c.status === "active").length;
  const blockedConnections = connections.filter(c => c.status === "blocked").length;
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

  // Generate time series (last 24 data points)
  const now = Date.now();
  const timeSeries = Array.from({ length: 24 }, (_, i) => {
    const timestamp = new Date(now - (23 - i) * 3600000);
    return {
      timestamp: timestamp.toISOString(),
      connections: randomInt(50, 200),
      bandwidthIn: randomInt(10000, 100000),
      bandwidthOut: randomInt(10000, 100000),
      blocked: randomInt(0, 20),
    };
  });

  return {
    totalConnections: connections.length,
    activeConnections,
    blockedConnections,
    totalBandwidth,
    bandwidthIn,
    bandwidthOut,
    byCountry,
    byCategory,
    byProtocol,
    timeSeries,
  };
}
