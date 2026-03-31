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
 * @module backend/services/connections/trafficFlows
 */

import type { Connection, TrafficFlow } from "@byteroute/shared";
import { getBandwidthColor } from "../../utils/bandwidth.js";

let flowIdCounter = 0;

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function isValidLatLng(latitude: number, longitude: number): boolean {
  return (
    isFiniteNumber(latitude) &&
    isFiniteNumber(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

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
        c.destLongitude != null &&
        isValidLatLng(c.latitude, c.longitude) &&
        isValidLatLng(c.destLatitude, c.destLongitude),
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
