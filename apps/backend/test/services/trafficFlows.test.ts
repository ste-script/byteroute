import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Connection } from "@byteroute/shared";

const { getBandwidthColor } = vi.hoisted(() => ({
  getBandwidthColor: vi.fn().mockReturnValue([0, 255, 0, 200]),
}));

vi.mock("../../src/utils/bandwidth.js", () => ({
  getBandwidthColor,
}));

import { deriveTrafficFlows } from "../../src/services/connections/trafficFlows.js";

function baseConnection(overrides?: Partial<Connection>): Connection {
  const now = new Date().toISOString();
  return {
    id: "conn-1",
    tenantId: "default",
    sourceIp: "8.8.8.8",
    destIp: "1.1.1.1",
    sourcePort: 12345,
    destPort: 443,
    protocol: "TCP",
    status: "active",
    startTime: now,
    lastActivity: now,
    latitude: 37.386,
    longitude: -122.0838,
    country: "United States",
    city: "Mountain View",
    destLatitude: -33.8688,
    destLongitude: 151.2093,
    destCountry: "Australia",
    destCity: "Sydney",
    bandwidth: 5000,
    ...overrides,
  };
}

describe("deriveTrafficFlows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array for no connections", () => {
    expect(deriveTrafficFlows([])).toEqual([]);
  });

  it("skips inactive connections", () => {
    const flows = deriveTrafficFlows([baseConnection({ status: "inactive" })]);
    expect(flows).toHaveLength(0);
  });

  it("skips connections missing source geo data", () => {
    const flows = deriveTrafficFlows([
      baseConnection({ latitude: undefined, longitude: undefined }),
    ]);
    expect(flows).toHaveLength(0);
  });

  it("skips connections missing dest geo data", () => {
    const flows = deriveTrafficFlows([
      baseConnection({ destLatitude: undefined, destLongitude: undefined }),
    ]);
    expect(flows).toHaveLength(0);
  });

  it("produces a flow with real source and target coordinates", () => {
    const conn = baseConnection();
    const flows = deriveTrafficFlows([conn]);

    expect(flows).toHaveLength(1);
    const flow = flows[0]!;

    expect(flow.source.lat).toBe(37.386);
    expect(flow.source.lng).toBe(-122.0838);
    expect(flow.source.country).toBe("United States");
    expect(flow.source.city).toBe("Mountain View");

    expect(flow.target.lat).toBe(-33.8688);
    expect(flow.target.lng).toBe(151.2093);
    expect(flow.target.country).toBe("Australia");
    expect(flow.target.city).toBe("Sydney");

    expect(flow.value).toBe(5000);
    expect(flow.animated).toBe(true);
  });

  it("limits output to 20 flows", () => {
    const connections = Array.from({ length: 30 }, (_, i) =>
      baseConnection({ id: `conn-${i}` })
    );
    const flows = deriveTrafficFlows(connections);
    expect(flows).toHaveLength(20);
  });

  it("uses bandwidth 0 when undefined", () => {
    const flows = deriveTrafficFlows([baseConnection({ bandwidth: undefined })]);
    expect(flows[0]?.value).toBe(0);
    expect(getBandwidthColor).toHaveBeenCalledWith(0);
  });
});
