import Dexie, { type Table } from "dexie";

import type { LocalPlace, LocalVote, RegionPlaceRecord, RegionRecord } from "@/lib/types";

export type OutboxRecord = {
  client_operation_id: string;
  entity_type: string;
  entity_local_id: string;
  entity_id?: string;
  operation_type: string;
  payload: unknown;
  created_at: string;
  retry_count: number;
  last_error?: string | null;
  status: "pending" | "failed" | "conflict" | "applied";
};

export type AppStateRecord = {
  key: string;
  value: unknown;
};

export class WifiykaDB extends Dexie {
  my_places!: Table<LocalPlace, string>;
  my_votes!: Table<LocalVote, string>;
  outbox!: Table<OutboxRecord, string>;
  regions!: Table<RegionRecord, string>;
  region_places!: Table<RegionPlaceRecord, string>;
  app_state!: Table<AppStateRecord, string>;

  constructor() {
    super("wifiyka");
    this.version(1).stores({
      my_places: "local_id, place_id, user_id, sync_status, updated_at_client",
      my_votes: "local_id, place_vote_id, place_id, user_id, sync_status, updated_at_client",
      outbox: "client_operation_id, status, created_at",
      regions: "pack_id, cache_status, updated_at",
      region_places: "compound_id, pack_id, place_id",
      app_state: "key",
    });
  }
}

export const db = new WifiykaDB();
