import type { Connection, TrafficFlow } from "@byteroute/shared";
import { DEFAULT_TENANT_ID } from "../utils/tenant.js";
import { getBandwidthColor } from "../utils/bandwidth.js";

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
const statuses: Connection["status"][] = ["active", "inactive"];

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
    tenantId: DEFAULT_TENANT_ID,
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
    color: getBandwidthColor(connection?.bandwidth ?? randomInt(100, 50000)),
    animated: connection ? connection.status === "active" : Math.random() > 0.3,
  };
}

export function generateTrafficFlows(connections: Connection[]): TrafficFlow[] {
  return connections
    .filter(c => c.status === "active")
    .slice(0, 20) // Limit flows for performance
    .map(c => generateTrafficFlow(c));
}
