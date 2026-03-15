import { describe, expect, it } from "vitest";

import { mergeRegionRecords, restorePlacesFromRegionRecords, toRegionPlaceRecords } from "@/lib/offline";
import { AccessType, PlaceStatus, VenueType, type OfflinePack, type Place, type RegionRecord } from "@/lib/types";

const pack: OfflinePack = {
  pack_id: "sochi",
  region_name: "sochi",
  url: "/offline-packs/sochi.pmtiles",
  size_bytes: 100,
  version_hash: "hash-v1",
  updated_at: "2026-03-15T00:00:00.000Z",
};

const place: Place = {
  place_id: "place-1",
  user_id: "user-1",
  venue_type: VenueType.Cafe,
  place_name: "Surf Coffee",
  wifi_name: "Surf",
  description: null,
  promo_text: null,
  access_type: AccessType.Free,
  status: PlaceStatus.Active,
  lat: 43.58,
  lng: 39.72,
  works_count: 1,
  not_works_count: 0,
  last_verified_at: null,
  version: 1,
  created_at: "2026-03-15T00:00:00.000Z",
  updated_at: "2026-03-15T00:00:00.000Z",
};

describe("offline helpers", () => {
  it("keeps cached region status while version hash is unchanged", () => {
    const current: RegionRecord[] = [
      {
        pack_id: "sochi",
        region_name: "sochi",
        url: "/offline-packs/sochi.pmtiles",
        size_bytes: 90,
        version_hash: "hash-v1",
        updated_at: "2026-03-14T00:00:00.000Z",
        downloaded_at: "2026-03-14T01:00:00.000Z",
        cache_status: "cached",
      },
    ];

    expect(mergeRegionRecords(current, [pack])).toEqual([
      {
        pack_id: "sochi",
        region_name: "sochi",
        url: "/offline-packs/sochi.pmtiles",
        size_bytes: 100,
        version_hash: "hash-v1",
        updated_at: "2026-03-15T00:00:00.000Z",
        downloaded_at: "2026-03-14T01:00:00.000Z",
        cache_status: "cached",
        bounds: null,
      },
    ]);
  });

  it("restores unique places from region snapshots", () => {
    const records = toRegionPlaceRecords([pack], [place, { ...place, place_name: "Surf Coffee 2" }]);

    expect(records).toHaveLength(2);
    expect(restorePlacesFromRegionRecords(records)).toEqual([{ ...place, place_name: "Surf Coffee 2" }]);
  });
});
