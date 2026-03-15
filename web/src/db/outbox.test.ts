import { describe, expect, it } from "vitest";

import { buildLocalPlace, buildLocalVote, makeOutboxRecord } from "@/db/outbox";
import { AccessType, SyncStatus, VenueType, VoteType } from "@/lib/types";

describe("outbox helpers", () => {
  it("builds pending local place", () => {
    const place = buildLocalPlace("user-1", {
      venue_type: VenueType.Cafe,
      place_name: "Blue Cup",
      wifi_name: "BLUE",
      access_type: AccessType.Free,
      lat: 55.7,
      lng: 37.6,
    });

    expect(place.user_id).toBe("user-1");
    expect(place.sync_status).toBe(SyncStatus.Pending);
    expect(place.local_id).toBeTruthy();
  });

  it("builds vote and outbox payload", () => {
    const vote = buildLocalVote("user-1", "place-1", VoteType.Works);
    const record = makeOutboxRecord("place_vote", vote.local_id, "vote_upsert", { vote: vote.vote }, vote.place_id);

    expect(vote.place_id).toBe("place-1");
    expect(record.operation_type).toBe("vote_upsert");
    expect(record.status).toBe("pending");
  });
});
