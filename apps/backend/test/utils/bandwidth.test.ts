import { describe, it, expect } from "vitest";
import { getBandwidthColor } from "../../src/utils/bandwidth.js";

describe("getBandwidthColor", () => {
  // ── Edge / clamping ──────────────────────────────────────────────────────

  it("returns pure green [0,255,0,200] at bandwidth 0 (min)", () => {
    expect(getBandwidthColor(0)).toEqual([0, 255, 0, 200]);
  });

  it("returns pure red [255,0,0,200] at bandwidth 100000 (max)", () => {
    expect(getBandwidthColor(100000)).toEqual([255, 0, 0, 200]);
  });

  it("clamps below-minimum bandwidth to green", () => {
    expect(getBandwidthColor(-5000)).toEqual([0, 255, 0, 200]);
  });

  it("clamps above-maximum bandwidth to red", () => {
    expect(getBandwidthColor(999999)).toEqual([255, 0, 0, 200]);
  });

  // ── Segment 0: Green → Yellow (normalized 0.0–0.25) ────────────────────

  it("returns mid-green-to-yellow at bandwidth 12500 (normalized 0.125)", () => {
    // t = 0.125/0.25 = 0.5, r = round(0.5*255) = 128
    expect(getBandwidthColor(12500)).toEqual([128, 255, 0, 200]);
  });

  // ── Segment 1: Yellow → Orange (normalized 0.25–0.5) ───────────────────

  it("returns yellow [255,255,0,200] at the 0.25 boundary", () => {
    // normalized = 0.25 → falls into < 0.5 branch, t = 0, g = 255–0*90 = 255
    expect(getBandwidthColor(25000)).toEqual([255, 255, 0, 200]);
  });

  it("returns mid-yellow-to-orange at bandwidth 37500 (normalized 0.375)", () => {
    // t = (0.375–0.25)/0.25 = 0.5, g = round(255 – 0.5*90) = 210
    expect(getBandwidthColor(37500)).toEqual([255, 210, 0, 200]);
  });

  // ── Segment 2: Orange → Red-Orange (normalized 0.5–0.75) ───────────────

  it("returns orange [255,165,0,200] at the 0.5 boundary", () => {
    // normalized = 0.5 → falls into < 0.75 branch, t = 0, g = 165–0*100 = 165
    expect(getBandwidthColor(50000)).toEqual([255, 165, 0, 200]);
  });

  it("returns mid-orange-to-red-orange at bandwidth 62500 (normalized 0.625)", () => {
    // t = (0.625–0.5)/0.25 = 0.5, g = round(165 – 0.5*100) = 115
    expect(getBandwidthColor(62500)).toEqual([255, 115, 0, 200]);
  });

  // ── Segment 3: Red-Orange → Red (normalized 0.75–1.0) ──────────────────

  it("returns red-orange [255,65,0,200] at the 0.75 boundary", () => {
    // normalized = 0.75 → >= 0.75 branch, t = 0, g = 65–0*65 = 65
    expect(getBandwidthColor(75000)).toEqual([255, 65, 0, 200]);
  });

  it("returns mid-red-orange at bandwidth 87500 (normalized 0.875)", () => {
    // t = (0.875–0.75)/0.25 = 0.5, g = round(65 – 0.5*65) = round(32.5) = 33
    expect(getBandwidthColor(87500)).toEqual([255, 33, 0, 200]);
  });

  // ── Alpha is always 200 ─────────────────────────────────────────────────

  it("always returns alpha = 200", () => {
    for (const bw of [0, 25000, 50000, 75000, 100000]) {
      expect(getBandwidthColor(bw)[3]).toBe(200);
    }
  });

  // ── Custom min/max ──────────────────────────────────────────────────────

  it("respects custom minBandwidth and maxBandwidth", () => {
    // normalized = (5–0)/(10–0) = 0.5 → < 0.75 branch, t=0, g=165
    expect(getBandwidthColor(5, 0, 10)).toEqual([255, 165, 0, 200]);
  });

  it("clamps when bandwidth equals custom max", () => {
    expect(getBandwidthColor(10, 0, 10)).toEqual([255, 0, 0, 200]);
  });
});
