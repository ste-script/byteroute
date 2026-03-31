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
 * Gets bandwidth color.
 * @param bandwidth - The bandwidth input.
 * @param minBandwidth - The min bandwidth input.
 * @param maxBandwidth - The max bandwidth input.
 * @returns The bandwidth color.
 */

export function getBandwidthColor(
  bandwidth: number,
  minBandwidth = 0,
  maxBandwidth = 100000,
): [number, number, number, number] {
  // Normalize bandwidth to 0-1 range
  const normalized = Math.max(
    0,
    Math.min(1, (bandwidth - minBandwidth) / (maxBandwidth - minBandwidth)),
  );

  // Color gradient thresholds:
  // 0.0 - 0.25: Green to Yellow (low traffic)
  // 0.25 - 0.5: Yellow to Orange (moderate traffic)
  // 0.5 - 0.75: Orange to Red-Orange (high traffic)
  // 0.75 - 1.0: Red-Orange to Red (very high traffic)

  let r: number, g: number, b: number;

  if (normalized < 0.25) {
    // Green to Yellow
    const t = normalized / 0.25;
    r = Math.round(t * 255);
    g = 255;
    b = 0;
  } else if (normalized < 0.5) {
    // Yellow to Orange
    const t = (normalized - 0.25) / 0.25;
    r = 255;
    g = Math.round(255 - t * 90); // 255 -> 165
    b = 0;
  } else if (normalized < 0.75) {
    // Orange to Red-Orange
    const t = (normalized - 0.5) / 0.25;
    r = 255;
    g = Math.round(165 - t * 100); // 165 -> 65
    b = 0;
  } else {
    // Red-Orange to Red
    const t = (normalized - 0.75) / 0.25;
    r = 255;
    g = Math.round(65 - t * 65); // 65 -> 0
    b = 0;
  }

  return [r, g, b, 200];
}
