import type { Connection, TrafficFlow } from "@byteroute/shared";
import { getBandwidthColor } from "../../utils/bandwidth.js";

let flowIdCounter = 0;

/**
 * Derives traffic flows from real connection data.
 * Only connections that have been geo-enriched (both source and destination)
 * produce flows with real coordinates. Connections missing dest geo data are skipped.
 */
export function deriveTrafficFlows(connections: Connection[]): TrafficFlow[] {
  return connections
    .filter(
      (c): c is Connection & {
        latitude: number;
        longitude: number;
        destLatitude: number;
        destLongitude: number;
      } =>
        c.status === "active" &&
        c.latitude != null &&
        c.longitude != null &&
        c.destLatitude != null &&
        c.destLongitude != null
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
