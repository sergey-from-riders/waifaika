import {
  SyncStatus as SyncStatusEnum,
  type LocalPlace,
  type LocalVote,
  type Place,
  type PlaceInput,
  type PlaceVote,
  type RegionRecord,
  type SyncStatus,
  type VoteType,
} from "@/lib/types";

import type { OutboxRecord } from "@/db/app-db";

export function buildLocalPlace(userId: string, input: PlaceInput, status: SyncStatus = SyncStatusEnum.Pending, placeId?: string): LocalPlace {
  const timestamp = new Date().toISOString();
  return {
    local_id: crypto.randomUUID(),
    place_id: placeId,
    user_id: userId,
    place_name: input.place_name,
    wifi_name: input.wifi_name,
    venue_type: input.venue_type,
    description: input.description ?? null,
    promo_text: input.promo_text ?? null,
    access_type: input.access_type,
    lat: input.lat,
    lng: input.lng,
    version: 1,
    sync_status: status,
    sync_error: null,
    is_deleted: false,
    updated_at_client: timestamp,
    last_synced_at: null,
  };
}

export function buildLocalVote(userId: string, placeId: string, vote: VoteType, status: SyncStatus = SyncStatusEnum.Pending): LocalVote {
  const timestamp = new Date().toISOString();
  return {
    local_id: crypto.randomUUID(),
    place_id: placeId,
    user_id: userId,
    vote,
    server_vote: null,
    version: 1,
    sync_status: status,
    sync_error: null,
    is_deleted: false,
    deleted_at_client: null,
    updated_at_client: timestamp,
    last_synced_at: null,
  };
}

export function makeOutboxRecord(entityType: string, entityLocalId: string, operationType: string, payload: unknown, entityId?: string): OutboxRecord {
  return {
    client_operation_id: crypto.randomUUID(),
    entity_type: entityType,
    entity_local_id: entityLocalId,
    entity_id: entityId,
    operation_type: operationType,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
    status: "pending",
  };
}

export function mergeServerPlace(local: LocalPlace, place: Place): LocalPlace {
  return {
    ...local,
    place_id: place.place_id,
    version: place.version,
    sync_status: SyncStatusEnum.Synced,
    sync_error: null,
    last_synced_at: new Date().toISOString(),
  };
}

export function mergeServerVote(local: LocalVote, vote: PlaceVote): LocalVote {
  return {
    ...local,
    place_vote_id: vote.place_vote_id,
    version: vote.version,
    sync_status: SyncStatusEnum.Synced,
    sync_error: null,
    last_synced_at: new Date().toISOString(),
  };
}

export function packToRegion(pack: RegionRecord): RegionRecord {
  return pack;
}
