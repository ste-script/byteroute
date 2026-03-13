/**
 * @module backend/services/connections/trafficFlows
 */

import type { Connection, TrafficFlow } from "@byteroute/shared";
import { getBandwidthColor } from "../../utils/bandwidth.js";

let flowIdCounter = 0;

/**
 * Derives traffic flows.
 * @param connections - The connections input.
 * @returns The traffic flows result.
 */

export function deriveTrafficFlows(connections: Connection[]): TrafficFlow[] {
  return connections
    .filter(
      (
        c,
      ): c is Connection & {
        latitude: number;
        longitude: number;
        destLatitude: number;
        destLongitude: number;
      } =>
        c.status === "active" &&
        c.latitude != null &&
        c.longitude != null &&
        c.destLatitude != null &&
        c.destLongitude != null,
    )
    .slice(0, 20)
    .map((c) => ({
      id: `flow-${++flowIdCounter}-${Date.now()}`,
      source: {
        lat: c.latitude,
        lng: c.longitude,
        country: c.country,
        city: c.city,
      },
      target: {
        lat: c.destLatitude,
        lng: c.destLongitude,
        country: c.destCountry,
        city: c.destCity,
      },
      value: c.bandwidth ?? 0,
      color: getBandwidthColor(c.bandwidth ?? 0),
      animated: true,
    }));
}
