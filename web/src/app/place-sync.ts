import { SOCHI_CENTER, type LocationState } from "@/lib/geolocation";
import type { LocalPlace, LocalVote, Place, PlaceVote } from "@/lib/types";
import { SyncStatus as SyncStatusEnum, VoteType as VoteTypeEnum } from "@/lib/types";

export function toLocalPlace(place: Place): LocalPlace {
  return {
    local_id: place.place_id,
    place_id: place.place_id,
    user_id: place.user_id,
    place_name: place.place_name,
    wifi_name: place.wifi_name,
    venue_type: place.venue_type,
    description: place.description ?? null,
    promo_text: place.promo_text ?? null,
    access_type: place.access_type,
    lat: place.lat,
    lng: place.lng,
    version: place.version,
    sync_status: SyncStatusEnum.Synced,
    sync_error: null,
    is_deleted: false,
    updated_at_client: place.updated_at,
    last_synced_at: new Date().toISOString(),
  };
}

export function toLocalVoteEntry(vote: PlaceVote): LocalVote {
  return {
    local_id: vote.place_vote_id,
    place_vote_id: vote.place_vote_id,
    place_id: vote.place_id,
    user_id: vote.user_id,
    vote: vote.vote,
    server_vote: vote.vote,
    version: vote.version,
    sync_status: SyncStatusEnum.Synced,
    sync_error: null,
    is_deleted: false,
    deleted_at_client: null,
    updated_at_client: vote.updated_at,
    last_synced_at: new Date().toISOString(),
  };
}

export function mergePlaces(current: LocalPlace[], incoming: LocalPlace[]) {
  const map = new Map<string, LocalPlace>();
  for (const item of current) {
    map.set(placeMergeKey(item), item);
  }
  for (const item of incoming) {
    const key = placeMergeKey(item);
    const existing = map.get(key);
    if (existing && existing.sync_status !== SyncStatusEnum.Synced) {
      continue;
    }
    map.set(key, item);
  }
  return Array.from(map.values()).sort((a, b) => b.updated_at_client.localeCompare(a.updated_at_client));
}

export function mergeVotes(current: LocalVote[], incoming: LocalVote[]) {
  const map = new Map<string, LocalVote>();
  for (const item of current) {
    map.set(item.place_id, item);
  }
  for (const item of incoming) {
    const existing = map.get(item.place_id);
    if (existing && existing.sync_status !== SyncStatusEnum.Synced) {
      continue;
    }
    map.set(item.place_id, item);
  }
  return Array.from(map.values()).sort((a, b) => b.updated_at_client.localeCompare(a.updated_at_client));
}

export function locationToCenter(state: LocationState) {
  if ("lat" in state && "lng" in state) {
    return { lat: state.lat, lng: state.lng };
  }
  return SOCHI_CENTER;
}

export function applyLocalVoteOverlay(place: Place, localVote?: LocalVote | null): Place {
  if (!localVote) {
    return place;
  }

  const baselineVote = localVote.server_vote ?? null;
  const activeVote = localVote.is_deleted ? null : localVote.vote;

  const worksCount = clampCount(
    place.works_count + voteDelta(baselineVote, activeVote, VoteTypeEnum.Works),
  );
  const notWorksCount = clampCount(
    place.not_works_count + voteDelta(baselineVote, activeVote, VoteTypeEnum.NotWorks),
  );

  return {
    ...place,
    works_count: worksCount,
    not_works_count: notWorksCount,
  };
}

function voteDelta(baselineVote: LocalVote["server_vote"], activeVote: LocalVote["server_vote"], targetVote: VoteTypeEnum) {
  return Number(activeVote === targetVote) - Number(baselineVote === targetVote);
}

function clampCount(value: number) {
  return Math.max(0, value);
}

function placeMergeKey(place: LocalPlace) {
  return place.place_id ? `place:${place.place_id}` : `local:${place.local_id}`;
}
