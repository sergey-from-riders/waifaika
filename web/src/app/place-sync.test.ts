import { describe, expect, it } from "vitest";

import { applyLocalVoteOverlay } from "@/app/place-sync";
import { AccessType, PlaceStatus, SyncStatus, VenueType, VoteType } from "@/lib/types";

const basePlace = {
  place_id: "place-1",
  user_id: "user-1",
  venue_type: VenueType.Cafe,
  place_name: "Surf Coffee",
  wifi_name: "guest_wifi",
  description: null,
  promo_text: null,
  access_type: AccessType.Free,
  status: PlaceStatus.Active,
  lat: 43.5855,
  lng: 39.7231,
  works_count: 8,
  not_works_count: 2,
  version: 3,
  created_at: "2026-03-15T00:00:00Z",
  updated_at: "2026-03-15T00:00:00Z",
};

describe("applyLocalVoteOverlay", () => {
  it("adds a new works vote optimistically", () => {
    const next = applyLocalVoteOverlay(basePlace, {
      local_id: "vote-1",
      place_id: basePlace.place_id,
      user_id: "user-1",
      vote: VoteType.Works,
      server_vote: null,
      version: 1,
      sync_status: SyncStatus.Pending,
      sync_error: null,
      is_deleted: false,
      deleted_at_client: null,
      updated_at_client: "2026-03-15T01:00:00Z",
      last_synced_at: null,
    });

    expect(next.works_count).toBe(9);
    expect(next.not_works_count).toBe(2);
  });

  it("switches counts when the user flips not_works to works", () => {
    const next = applyLocalVoteOverlay(basePlace, {
      local_id: "vote-1",
      place_id: basePlace.place_id,
      user_id: "user-1",
      vote: VoteType.Works,
      server_vote: VoteType.NotWorks,
      version: 2,
      sync_status: SyncStatus.Pending,
      sync_error: null,
      is_deleted: false,
      deleted_at_client: null,
      updated_at_client: "2026-03-15T01:00:00Z",
      last_synced_at: null,
    });

    expect(next.works_count).toBe(9);
    expect(next.not_works_count).toBe(1);
  });

  it("removes the local vote from counters when it becomes a tombstone", () => {
    const next = applyLocalVoteOverlay(basePlace, {
      local_id: "vote-1",
      place_id: basePlace.place_id,
      user_id: "user-1",
      vote: VoteType.Works,
      server_vote: VoteType.Works,
      version: 3,
      sync_status: SyncStatus.Pending,
      sync_error: null,
      is_deleted: true,
      deleted_at_client: "2026-03-15T01:00:00Z",
      updated_at_client: "2026-03-15T01:00:00Z",
      last_synced_at: null,
    });

    expect(next.works_count).toBe(7);
    expect(next.not_works_count).toBe(2);
  });
});
