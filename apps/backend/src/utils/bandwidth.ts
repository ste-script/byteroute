/**
 * Maps bandwidth value to a color gradient from green (low) to red (high)
 * @param bandwidth - The bandwidth value in bytes/second
 * @param minBandwidth - Minimum bandwidth for scaling (default: 0)
 * @param maxBandwidth - Maximum bandwidth for scaling (default: 100000)
 * @returns RGBA color tuple [R, G, B, A]
 */
export function getBandwidthColor(
  bandwidth: number,
  minBandwidth = 0,
  maxBandwidth = 100000
): [number, number, number, number] {
  // Normalize bandwidth to 0-1 range
  const normalized = Math.max(0, Math.min(1, (bandwidth - minBandwidth) / (maxBandwidth - minBandwidth)));

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
