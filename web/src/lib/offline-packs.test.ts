import { describe, expect, it } from "vitest";

import { boundsContainLocation, pickRegionForCenter } from "@/lib/offline-packs";
import type { RegionRecord } from "@/lib/types";

const baseRegion = {
  region_name: "test",
  url: "/offline-packs/test.pmtiles",
  size_bytes: 10,
  version_hash: "hash",
  updated_at: "2026-03-15T00:00:00Z",
} satisfies Omit<RegionRecord, "pack_id" | "cache_status">;

describe("boundsContainLocation", () => {
  it("returns true when center is inside pack bounds", () => {
    expect(
      boundsContainLocation(
        {
          min_lat: 43.5,
          min_lng: 39.6,
          max_lat: 43.7,
          max_lng: 39.8,
        },
        { lat: 43.58, lng: 39.72 },
      ),
    ).toBe(true);
  });
});

describe("pickRegionForCenter", () => {
  it("prefers cached region covering the current center", () => {
    const regions: RegionRecord[] = [
      {
        ...baseRegion,
        pack_id: "pending-pack",
        cache_status: "pending",
        bounds: { min_lat: 43.5, min_lng: 39.6, max_lat: 43.7, max_lng: 39.8 },
      },
      {
        ...baseRegion,
        pack_id: "cached-pack",
        cache_status: "cached",
        bounds: { min_lat: 43.5, min_lng: 39.6, max_lat: 43.7, max_lng: 39.8 },
      },
    ];

    expect(pickRegionForCenter(regions, { lat: 43.58, lng: 39.72 })?.pack_id).toBe("cached-pack");
  });

  it("falls back to preferred pack id when bounds are not known yet", () => {
    const regions: RegionRecord[] = [
      { ...baseRegion, pack_id: "alpha", cache_status: "pending", bounds: null },
      { ...baseRegion, pack_id: "beta", cache_status: "pending", bounds: null },
    ];

    expect(pickRegionForCenter(regions, { lat: 43.58, lng: 39.72 }, "beta")?.pack_id).toBe("beta");
  });
});
