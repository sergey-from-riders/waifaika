import { describe, expect, it } from "vitest";

import { viewportRadiusKm, viewportRequestKey, type MapViewport } from "@/features/map/viewport";

const baseViewport: MapViewport = {
  center: { lat: 43.5855, lng: 39.7231 },
  zoom: 13,
  bounds: {
    north: 43.5955,
    south: 43.5755,
    east: 39.7331,
    west: 39.7131,
  },
};

describe("viewportRadiusKm", () => {
  it("keeps a sane minimum radius for close zooms", () => {
    expect(viewportRadiusKm(baseViewport)).toBe(3);
  });

  it("grows with a larger visible area", () => {
    expect(
      viewportRadiusKm({
        ...baseViewport,
        zoom: 10,
        bounds: {
          north: 43.82,
          south: 43.35,
          east: 40.08,
          west: 39.35,
        },
      }),
    ).toBeGreaterThan(20);
  });
});

describe("viewportRequestKey", () => {
  it("changes when camera coverage changes", () => {
    const baseline = viewportRequestKey(baseViewport);
    const shifted = viewportRequestKey({
      ...baseViewport,
      center: { lat: 43.61, lng: 39.74 },
    });

    expect(shifted).not.toBe(baseline);
  });
});
